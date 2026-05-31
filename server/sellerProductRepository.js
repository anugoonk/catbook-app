import { readDatabase, withDatabase } from './database.js';

const PRODUCT_STATUSES = new Set(['active', 'draft', 'archived']);
const STOCK_TYPES = new Set(['in', 'reserve', 'release', 'sale', 'adjustment', 'return']);

const nextId = (prefix) => {
  const stamp = Date.now().toString(36).toUpperCase().slice(-6);
  const rand = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `${prefix}-${stamp}${rand}`;
};

const slugify = (value) =>
  String(value || '').trim().toLowerCase()
    .replace(/[^a-z0-9ก-๙]+/gi, '-').replace(/^-+|-+$/g, '')
  || `product-${Date.now().toString(36)}`;

const addStockMovement = (database, actor, productId, type, quantity, note = '') => {
  database.stockMovements.push({
    id: nextId('STM'), productId, type, quantity,
    refType: 'seller', refId: actor?.id || '',
    note, createdAt: new Date().toISOString(),
  });
};

const addAuditLog = (database, actor, action, entityType, entityId, metadata = {}) => {
  database.auditLogs.push({
    id: nextId('AUD'), actorUserId: actor?.id || '',
    action, entityType, entityId, metadata,
    createdAt: new Date().toISOString(),
  });
};

const validateFields = (fields) => {
  const { sku, title, category, price, stock, status } = fields;
  if (!sku) return 'SKU is required';
  if (!title) return 'Product title is required';
  if (!category) return 'Category is required';
  if (!Number.isFinite(price) || price <= 0) return 'Price must be greater than 0';
  if (!Number.isInteger(stock) || stock < 0) return 'Stock must be a non-negative integer';
  if (!PRODUCT_STATUSES.has(status)) return 'Unsupported product status';
  return '';
};

export const listSellerProducts = async (actor) => {
  const database = await readDatabase();
  const products = database.products.filter(p => p.sellerId === actor.id);
  return {
    products,
    total: products.length,
    lowStock: products.filter(p => (p.stock || 0) <= 5 && (p.status || 'active') !== 'archived').length,
  };
};

export const createSellerProduct = (payload, actor) =>
  withDatabase((database) => {
    const sku = String(payload.sku ?? '').trim();
    const title = String(payload.title ?? '').trim();
    const slug = String(payload.slug ?? slugify(title)).trim() || slugify(title);
    const price = Number(payload.price ?? 0);
    const stock = Number(payload.stock ?? 0);
    const status = String(payload.status ?? 'active').trim();
    const category = String(payload.category ?? '').trim();

    const validError = validateFields({ sku, title, category, price, stock, status });
    if (validError) return { error: { status: 400, message: validError } };
    if (database.products.find(p => p.sku === sku)) return { error: { status: 400, message: 'SKU already exists' } };
    if (database.products.find(p => p.slug === slug)) return { error: { status: 400, message: 'Slug already exists' } };

    const now = new Date().toISOString();
    const product = {
      id: nextId('PRD'), sku, slug, title,
      desc: String(payload.desc ?? payload.description ?? '').trim(),
      category,
      brand: String(payload.brand ?? '').trim(),
      species: String(payload.species ?? 'cat').trim(),
      lifeStage: String(payload.lifeStage ?? 'all').trim(),
      location: String(payload.location ?? '').trim(),
      price, stock, status,
      img: String(payload.img ?? payload.imageUrl ?? '').trim(),
      seller: actor.activeCat ?? null,
      sellerId: actor.id,
      createdAt: now, updatedAt: now,
    };

    database.products.push(product);
    if (stock > 0) addStockMovement(database, actor, product.id, 'in', stock, 'Initial stock');
    addAuditLog(database, actor, 'seller.product_create', 'product', product.id, { sku });
    return { product };
  });

export const updateSellerProduct = (productId, payload, actor) =>
  withDatabase((database) => {
    const index = database.products.findIndex(p => p.id === productId);
    if (index < 0) return { error: { status: 404, message: 'Product not found' } };
    if (database.products[index].sellerId !== actor.id) return { error: { status: 403, message: 'Access denied' } };

    const existing = database.products[index];
    const sku = String(payload.sku ?? existing.sku ?? '').trim();
    const title = String(payload.title ?? existing.title ?? '').trim();
    const slug = String(payload.slug ?? existing.slug ?? slugify(title)).trim() || slugify(title);
    const price = Number(payload.price ?? existing.price ?? 0);
    const stock = Number(payload.stock ?? existing.stock ?? 0);
    const status = String(payload.status ?? existing.status ?? 'active').trim();
    const category = String(payload.category ?? existing.category ?? '').trim();

    const validError = validateFields({ sku, title, category, price, stock, status });
    if (validError) return { error: { status: 400, message: validError } };
    if (database.products.find(p => p.sku === sku && p.id !== productId)) return { error: { status: 400, message: 'SKU already exists' } };
    if (database.products.find(p => p.slug === slug && p.id !== productId)) return { error: { status: 400, message: 'Slug already exists' } };

    const next = {
      ...existing, sku, slug, title,
      desc: String(payload.desc ?? payload.description ?? existing.desc ?? '').trim(),
      category,
      brand: String(payload.brand ?? existing.brand ?? '').trim(),
      species: String(payload.species ?? existing.species ?? 'cat').trim(),
      lifeStage: String(payload.lifeStage ?? existing.lifeStage ?? 'all').trim(),
      location: String(payload.location ?? existing.location ?? '').trim(),
      price, stock, status,
      img: String(payload.img ?? payload.imageUrl ?? existing.img ?? '').trim(),
      updatedAt: new Date().toISOString(),
    };

    const stockDelta = next.stock - Number(existing.stock || 0);
    database.products[index] = next;
    if (stockDelta !== 0) addStockMovement(database, actor, productId, 'adjustment', stockDelta, 'Product stock field updated');
    addAuditLog(database, actor, 'seller.product_update', 'product', productId, { sku: next.sku });
    return { product: next };
  });

export const archiveSellerProduct = (productId, actor) =>
  withDatabase((database) => {
    const product = database.products.find(p => p.id === productId);
    if (!product) return { error: { status: 404, message: 'Product not found' } };
    if (product.sellerId !== actor.id) return { error: { status: 403, message: 'Access denied' } };

    product.status = 'archived';
    product.updatedAt = new Date().toISOString();
    addAuditLog(database, actor, 'seller.product_archive', 'product', productId, { sku: product.sku });
    return { product };
  });

export const adjustSellerStock = (productId, payload, actor) =>
  withDatabase((database) => {
    const product = database.products.find(p => p.id === productId);
    if (!product) return { error: { status: 404, message: 'Product not found' } };
    if (product.sellerId !== actor.id) return { error: { status: 403, message: 'Access denied' } };

    const type = String(payload.type || 'adjustment').trim();
    const quantity = Number(payload.quantity);
    const mode = String(payload.mode || 'delta').trim();
    if (!STOCK_TYPES.has(type)) return { error: { status: 400, message: 'Unsupported stock movement type' } };
    if (!Number.isInteger(quantity)) return { error: { status: 400, message: 'Quantity must be an integer' } };

    const currentStock = Number(product.stock || 0);
    const nextStock = mode === 'set' ? quantity : currentStock + quantity;
    if (nextStock < 0) return { error: { status: 400, message: 'Stock cannot be negative' } };

    product.stock = nextStock;
    product.updatedAt = new Date().toISOString();
    addStockMovement(database, actor, productId, type, nextStock - currentStock, String(payload.note || '').trim());
    addAuditLog(database, actor, 'seller.stock_adjust', 'product', productId, { from: currentStock, to: nextStock, type });
    return { product };
  });
