import { copyFile, mkdir, readdir, stat, unlink } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import Database from 'better-sqlite3';
import { mockUsers } from '../src/data/mockData.js';
import { buildProductCatalog } from './productCatalog.js';

const DB_FILE = join(process.cwd(), 'server', 'data', 'catbook-db.sqlite');
const MIGRATION_FILE = join(process.cwd(), 'migrations', '001_ecommerce_core.sql');
const MIGRATION_002_FILE = join(process.cwd(), 'migrations', '002_role_system.sql');
const MIGRATION_003_FILE = join(process.cwd(), 'migrations', '003_social.sql');
const MIGRATION_004_FILE = join(process.cwd(), 'migrations', '004_auth_hardening.sql');
const MIGRATION_005_FILE = join(process.cwd(), 'migrations', '005_moderation.sql');
const SCHEMA_VERSION = 5;

// Initialize Database connection
await mkdir(dirname(DB_FILE), { recursive: true });
const db = new Database(DB_FILE);

// Run Migrations on startup if table 'users' does not exist
const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
if (!tableExists) {
  const schema = readFileSync(MIGRATION_FILE, 'utf8');
  db.exec(schema);
  
  // Extend schema for payments with missing fields used in frontend/backend state
  try {
    db.exec(`
      ALTER TABLE payments ADD COLUMN instruction_json TEXT;
      ALTER TABLE payments ADD COLUMN failed_at TIMESTAMP;
      ALTER TABLE payments ADD COLUMN refunded_at TIMESTAMP;
      ALTER TABLE payments ADD COLUMN updated_at TIMESTAMP;
    `);
  } catch {
    // Ignore if column already exists
  }

  // Extend schema for orders with cancel_reason if missing
  try {
    db.exec(`
      ALTER TABLE orders ADD COLUMN cancel_reason TEXT;
    `);
  } catch {
    // Ignore if column already exists
  }
}

// Migration 002: add role column to users
const roleColExists = db.prepare("SELECT name FROM pragma_table_info('users') WHERE name='role'").get();
if (!roleColExists) {
  const migration002 = readFileSync(MIGRATION_002_FILE, 'utf8');
  db.exec(migration002);
}

// Migration 003: social tables (posts, reactions, comments, follows)
const postsTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='posts'").get();
if (!postsTableExists) {
  const migration003 = readFileSync(MIGRATION_003_FILE, 'utf8');
  db.exec(migration003);
}

// Migration 004: per-user password hash + persistent sessions
const pwHashColExists = db.prepare("SELECT name FROM pragma_table_info('users') WHERE name='password_hash'").get();
if (!pwHashColExists) {
  const migration004 = readFileSync(MIGRATION_004_FILE, 'utf8');
  db.exec(migration004);
}

// Migration 005: moderation (user status, post hidden)
const userStatusColExists = db.prepare("SELECT name FROM pragma_table_info('users') WHERE name='status'").get();
if (!userStatusColExists) {
  const migration005 = readFileSync(MIGRATION_005_FILE, 'utf8');
  db.exec(migration005);
}

// Initialize db_meta table for tracking database metadata
db.exec(`
  CREATE TABLE IF NOT EXISTS db_meta (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Set default created_at in db_meta if not exists
const hasCreated = db.prepare("SELECT value FROM db_meta WHERE key = 'created_at'").get();
if (!hasCreated) {
  db.prepare("INSERT INTO db_meta (key, value) VALUES ('created_at', ?)").run(new Date().toISOString());
  db.prepare("INSERT INTO db_meta (key, value) VALUES ('updated_at', ?)").run(new Date().toISOString());
}

const safeBackupReason = (reason) =>
  String(reason || 'manual').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'manual';

const sanitizeUser = (user) => {
  const clone = { ...user };
  delete clone.password;
  delete clone.passwordHash;
  return clone;
};

const seedDatabase = () => ({
  schemaVersion: SCHEMA_VERSION,
  users: mockUsers.map(sanitizeUser),
  products: buildProductCatalog(),
  carts: {},
  orders: {},
  payments: [],
  shipments: [],
  stockMovements: [],
  auditLogs: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

let cachedDatabase = null;

export const readDatabase = async (bypassCache = false) => {
  if (cachedDatabase && !bypassCache) return cachedDatabase;

  const userCount = db.prepare("SELECT count(*) as count FROM users").get().count;
  if (userCount === 0) {
    cachedDatabase = seedDatabase();
    await writeDatabase(cachedDatabase);
  } else {
    // Read all tables from SQLite
    const users = db.prepare("SELECT * FROM users").all().map(row => ({
      id: row.id,
      email: row.email,
      ownerName: row.owner_name,
      role: row.role || 'USER',
      isAdmin: row.role === 'ADMIN' || Boolean(row.is_admin),
      status: row.status || 'active',
      activeCat: JSON.parse(row.active_cat_json),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    const products = db.prepare("SELECT * FROM products").all().map(row => ({
      id: row.id,
      sku: row.sku,
      slug: row.slug,
      title: row.title,
      desc: row.description,
      category: row.category,
      brand: row.brand,
      species: row.species,
      lifeStage: row.life_stage,
      price: Number(row.price),
      stock: Number(row.stock),
      img: row.image_url,
      seller: JSON.parse(row.seller_json),
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    const cartRows = db.prepare("SELECT * FROM carts WHERE status = 'active'").all();
    const carts = {};
    for (const row of cartRows) {
      const items = db.prepare("SELECT * FROM cart_items WHERE cart_id = ?").all(row.id);
      carts[row.user_id] = items.map(item => ({
        productId: item.product_id,
        qty: item.quantity
      }));
    }

    const orderRows = db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
    const orders = {};
    for (const row of orderRows) {
      const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(row.id);
      
      const userRow = db.prepare("SELECT * FROM users WHERE id = ?").get(row.user_id);
      const customer = userRow ? {
        id: userRow.id,
        email: userRow.email,
        name: userRow.owner_name
      } : { id: row.user_id, email: '', name: '' };

      const paymentRow = db.prepare("SELECT * FROM payments WHERE order_id = ?").get(row.id);
      const shipmentRow = db.prepare("SELECT * FROM shipments WHERE order_id = ?").get(row.id);

      const mappedItems = items.map(item => {
        const prodRow = db.prepare("SELECT * FROM products WHERE id = ?").get(item.product_id);
        const product = prodRow ? {
          id: prodRow.id,
          sku: prodRow.sku,
          slug: prodRow.slug,
          title: prodRow.title,
          desc: prodRow.description,
          category: prodRow.category,
          brand: prodRow.brand,
          species: prodRow.species,
          lifeStage: prodRow.life_stage,
          price: Number(prodRow.price),
          stock: Number(prodRow.stock),
          img: prodRow.image_url,
          seller: JSON.parse(prodRow.seller_json),
          status: prodRow.status,
          createdAt: prodRow.created_at,
          updatedAt: prodRow.updated_at
        } : { id: item.product_id, sku: item.sku, title: item.title, price: Number(item.unit_price) };

        return {
          product,
          qty: item.quantity,
          unitPrice: Number(item.unit_price),
          lineTotal: Number(item.line_total)
        };
      });

      const paymentInstruction = (paymentRow && paymentRow.instruction_json) ? JSON.parse(paymentRow.instruction_json) : null;

      const order = {
        id: row.id,
        userId: row.user_id,
        customer,
        items: mappedItems,
        count: mappedItems.reduce((sum, item) => sum + item.qty, 0),
        subtotal: Number(row.subtotal),
        shippingFee: Number(row.shipping_fee),
        discount: Number(row.discount),
        total: Number(row.total),
        address: JSON.parse(row.shipping_address_json),
        payment: paymentRow ? paymentRow.method : '',
        paymentStatus: row.payment_status,
        paymentInstruction,
        shippingStatus: shipmentRow ? shipmentRow.status : 'pending',
        trackingNo: shipmentRow ? (shipmentRow.tracking_no || '') : '',
        cancelReason: row.cancel_reason || '',
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };

      if (!orders[row.user_id]) orders[row.user_id] = [];
      orders[row.user_id].push(order);
    }

    const payments = db.prepare("SELECT * FROM payments").all().map(row => ({
      id: row.id,
      orderId: row.order_id,
      method: row.method,
      status: row.status,
      amount: Number(row.amount),
      gatewayRef: row.gateway_ref || '',
      instruction: row.instruction_json ? JSON.parse(row.instruction_json) : null,
      paidAt: row.paid_at || '',
      failedAt: row.failed_at || '',
      refundedAt: row.refunded_at || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at || row.created_at
    }));

    const shipments = db.prepare("SELECT * FROM shipments").all().map(row => ({
      id: row.id,
      orderId: row.order_id,
      carrier: row.carrier || '',
      trackingNo: row.tracking_no || '',
      status: row.status,
      shippedAt: row.shipped_at || '',
      deliveredAt: row.delivered_at || '',
      createdAt: row.created_at
    }));

    const stockMovements = db.prepare("SELECT * FROM stock_movements").all().map(row => ({
      id: row.id,
      productId: row.product_id,
      type: row.type,
      quantity: Number(row.quantity),
      refType: row.ref_type || '',
      refId: row.ref_id || '',
      note: row.note || '',
      createdAt: row.created_at
    }));

    const auditLogs = db.prepare("SELECT * FROM audit_logs").all().map(row => ({
      id: row.id,
      actorUserId: row.actor_user_id || '',
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      metadata: row.metadata_json ? JSON.parse(row.metadata_json) : {},
      createdAt: row.created_at
    }));

    const metaCreated = db.prepare("SELECT value FROM db_meta WHERE key = 'created_at'").get();
    const metaUpdated = db.prepare("SELECT value FROM db_meta WHERE key = 'updated_at'").get();

    cachedDatabase = {
      schemaVersion: SCHEMA_VERSION,
      users,
      products,
      carts,
      orders,
      payments,
      shipments,
      stockMovements,
      auditLogs,
      createdAt: metaCreated ? metaCreated.value : new Date().toISOString(),
      updatedAt: metaUpdated ? metaUpdated.value : new Date().toISOString(),
    };
  }

  return cachedDatabase;
};

export const writeDatabase = async (database) => {
  const transaction = db.transaction(() => {
    // 1. Sync users — use upsert (not REPLACE) to preserve password_hash/salt and avoid FK violations
    for (const u of database.users) {
      const role = u.role || (u.isAdmin ? 'ADMIN' : 'USER');
      db.prepare(`
        INSERT INTO users (id, email, owner_name, is_admin, role, status, active_cat_json, updated_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          email           = excluded.email,
          owner_name      = excluded.owner_name,
          is_admin        = excluded.is_admin,
          role            = excluded.role,
          status          = excluded.status,
          active_cat_json = excluded.active_cat_json,
          updated_at      = excluded.updated_at
      `).run(
        u.id,
        u.email,
        u.ownerName,
        role === 'ADMIN' ? 1 : 0,
        role,
        u.status || 'active',
        JSON.stringify(u.activeCat),
        u.updatedAt || new Date().toISOString(),
        u.createdAt || new Date().toISOString()
      );
    }

    // 2. Sync products — upsert to avoid FK violations from order_items/stock_movements
    for (const p of database.products) {
      db.prepare(`
        INSERT INTO products (id, sku, slug, title, description, category, brand, species, life_stage, price, stock, image_url, seller_json, status, updated_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          sku         = excluded.sku,
          slug        = excluded.slug,
          title       = excluded.title,
          description = excluded.description,
          category    = excluded.category,
          brand       = excluded.brand,
          species     = excluded.species,
          life_stage  = excluded.life_stage,
          price       = excluded.price,
          stock       = excluded.stock,
          image_url   = excluded.image_url,
          seller_json = excluded.seller_json,
          status      = excluded.status,
          updated_at  = excluded.updated_at
      `).run(
        p.id,
        p.sku,
        p.slug,
        p.title,
        p.desc || p.description || '',
        p.category,
        p.brand || '',
        p.species || 'cat',
        p.lifeStage || 'all',
        p.price,
        p.stock,
        p.img || p.imageUrl || '',
        JSON.stringify(p.seller),
        p.status || 'active',
        p.updatedAt || new Date().toISOString(),
        p.createdAt || new Date().toISOString()
      );
    }

    // 3–8. Delete in FK-safe order (leaf → parent)
    db.prepare("DELETE FROM audit_logs").run();
    db.prepare("DELETE FROM stock_movements").run();
    db.prepare("DELETE FROM cart_items").run();
    db.prepare("DELETE FROM carts").run();
    db.prepare("DELETE FROM order_items").run();
    db.prepare("DELETE FROM payments").run();
    db.prepare("DELETE FROM shipments").run();
    db.prepare("DELETE FROM orders").run();

    // 3. Sync carts and cart_items

    for (const [userId, items] of Object.entries(database.carts)) {
      if (!items || items.length === 0) continue;
      const cartId = `CRT-${userId}`;
      db.prepare("INSERT INTO carts (id, user_id, status) VALUES (?, ?, 'active')").run(cartId, userId);
      for (const item of items) {
        const prod = database.products.find(p => p.id === item.productId);
        const price = prod ? prod.price : 0;
        db.prepare(`
          INSERT INTO cart_items (id, cart_id, product_id, quantity, unit_price)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          `CI-${cartId}-${item.productId}`,
          cartId,
          item.productId,
          item.qty,
          price
        );
      }
    }

    // 4. Sync orders and order_items

    for (const userOrders of Object.values(database.orders)) {
      for (const o of userOrders) {
        db.prepare(`
          INSERT INTO orders (id, user_id, order_no, status, payment_status, subtotal, shipping_fee, discount, total, shipping_address_json, cancel_reason, updated_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          o.id,
          o.userId,
          o.id,
          o.status || 'pending',
          o.paymentStatus || 'pending',
          o.subtotal,
          o.shippingFee,
          o.discount,
          o.total,
          JSON.stringify(o.address),
          o.cancelReason || '',
          o.updatedAt || new Date().toISOString(),
          o.createdAt || new Date().toISOString()
        );

        for (const item of o.items) {
          const prodId = item.product?.id || item.productId;
          db.prepare(`
            INSERT INTO order_items (id, order_id, product_id, sku, title, quantity, unit_price, line_total)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            `OI-${o.id}-${prodId}`,
            o.id,
            prodId,
            item.product?.sku || item.sku || '',
            item.product?.title || item.title || '',
            item.qty,
            item.unitPrice,
            item.lineTotal
          );
        }
      }
    }

    // 5. Sync payments
    for (const p of database.payments) {
      db.prepare(`
        INSERT INTO payments (id, order_id, method, status, amount, gateway_ref, paid_at, instruction_json, failed_at, refunded_at, updated_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        p.id,
        p.orderId,
        p.method,
        p.status,
        p.amount,
        p.gatewayRef || '',
        p.paidAt || '',
        p.instruction ? JSON.stringify(p.instruction) : null,
        p.failedAt || '',
        p.refundedAt || '',
        p.updatedAt || new Date().toISOString(),
        p.createdAt || new Date().toISOString()
      );
    }

    // 6. Sync shipments
    for (const s of database.shipments) {
      db.prepare(`
        INSERT INTO shipments (id, order_id, carrier, tracking_no, status, shipped_at, delivered_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        s.id,
        s.orderId,
        s.carrier || '',
        s.trackingNo || '',
        s.status || 'pending',
        s.shippedAt || '',
        s.deliveredAt || '',
        s.createdAt || new Date().toISOString()
      );
    }

    // 7. Sync stockMovements
    for (const m of database.stockMovements) {
      db.prepare(`
        INSERT INTO stock_movements (id, product_id, type, quantity, ref_type, ref_id, note, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        m.id,
        m.productId,
        m.type,
        m.quantity,
        m.refType || '',
        m.refId || '',
        m.note || '',
        m.createdAt || new Date().toISOString()
      );
    }

    // 8. Sync auditLogs
    for (const a of database.auditLogs) {
      db.prepare(`
        INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, metadata_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        a.id,
        a.actorUserId || null,
        a.action,
        a.entityType,
        a.entityId,
        a.metadata ? JSON.stringify(a.metadata) : null,
        a.createdAt || new Date().toISOString()
      );
    }

    // 9. Update db_meta
    db.prepare("INSERT OR REPLACE INTO db_meta (key, value) VALUES ('updated_at', ?)").run(new Date().toISOString());
  });

  transaction();
  cachedDatabase = {
    ...database,
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
  };
  return cachedDatabase;
};

export const withDatabase = async (mutator) => {
  const database = await readDatabase(true);
  const result = await mutator(database);
  await writeDatabase(database);
  return result;
};

export const getDatabaseHealth = async () => {
  const database = await readDatabase();
  const fileStat = await stat(DB_FILE);

  return {
    ok: true,
    file: DB_FILE,
    schemaVersion: database.schemaVersion,
    expectedSchemaVersion: SCHEMA_VERSION,
    sizeBytes: fileStat.size,
    modifiedAt: fileStat.mtime.toISOString(),
    createdAt: database.createdAt,
    updatedAt: database.updatedAt,
    counts: {
      users: database.users.length,
      products: database.products.length,
      carts: Object.keys(database.carts).length,
      orders: Object.keys(database.orders).length,
      payments: database.payments.length,
      shipments: database.shipments.length,
      stockMovements: database.stockMovements.length,
      auditLogs: database.auditLogs.length,
    },
  };
};

export const backupDatabase = async ({ reason = 'manual', backupDir = join(process.cwd(), 'server', 'backups'), retention = 10 } = {}) => {
  await readDatabase();
  await mkdir(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const backupFile = join(backupDir, `catbook-db-${timestamp}-${safeBackupReason(reason)}.sqlite`);
  await copyFile(DB_FILE, backupFile);

  const files = (await readdir(backupDir))
    .filter(file => file.startsWith('catbook-db-') && file.endsWith('.sqlite'))
    .sort()
    .reverse();

  await Promise.all(files.slice(retention).map(file => unlink(join(backupDir, file))));

  const backupStat = await stat(backupFile);
  return {
    ok: true,
    file: backupFile,
    sizeBytes: backupStat.size,
    createdAt: backupStat.mtime.toISOString(),
    retention,
  };
};

export const databaseMeta = {
  file: DB_FILE,
  schemaVersion: SCHEMA_VERSION,
};

// ── User creation (registration) ─────────────────────────────────────────────

export const setUserStatus = (userId, status) => {
  db.prepare('UPDATE users SET status = ?, updated_at = ? WHERE id = ?')
    .run(status, new Date().toISOString(), userId);
};

export const removeUser = (userId) => {
  setUserStatus(userId, 'deleted');
};

export const updateUserActiveCat = (userId, activeCat) => {
  db.prepare('UPDATE users SET active_cat_json = ?, updated_at = ? WHERE id = ?')
    .run(JSON.stringify(activeCat), new Date().toISOString(), userId);
};

export const createUser = ({ id, email, ownerName, role = 'USER', activeCat, passwordHash, passwordSalt }) => {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO users (id, email, owner_name, is_admin, role, active_cat_json, password_hash, password_salt, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, email, ownerName,
    role === 'ADMIN' ? 1 : 0, role,
    JSON.stringify(activeCat),
    passwordHash, passwordSalt,
    now, now
  );
  return { id, email, ownerName, role, isAdmin: role === 'ADMIN', activeCat, createdAt: now };
};

// ── Session store (SQLite-backed) ─────────────────────────────────────────────

const SESSION_MAX_AGE_SECONDS = 86400; // 24 h

export const createSession = (userId, csrfToken, maxAge = SESSION_MAX_AGE_SECONDS) => {
  const id = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + maxAge * 1000).toISOString();
  db.prepare(`
    INSERT INTO sessions (id, user_id, csrf_token, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, userId, csrfToken, now.toISOString(), expiresAt);
  return id;
};

export const getSession = (sessionId) => {
  const row = db.prepare(`
    SELECT id, user_id, csrf_token
    FROM sessions
    WHERE id = ? AND expires_at > ?
  `).get(sessionId, new Date().toISOString());
  if (!row) return null;
  return { sessionId: row.id, userId: row.user_id, csrfToken: row.csrf_token };
};

export const deleteSession = (sessionId) => {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
};

export const cleanExpiredSessions = () =>
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(new Date().toISOString()).changes;

export { db };
