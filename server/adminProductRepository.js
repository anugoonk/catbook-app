import { readDatabase, withDatabase } from './database.js';
import { filterProducts } from './productCatalog.js';

const PRODUCT_STATUSES = new Set(['active', 'draft', 'archived']);
const STOCK_TYPES = new Set(['in', 'reserve', 'release', 'sale', 'adjustment', 'return']);

const nextId = (prefix) => {
  const stamp = Date.now().toString(36).toUpperCase().slice(-6);
  const rand = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `${prefix}-${stamp}${rand}`;
};

const slugify = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    || `product-${Date.now().toString(36)}`;

const normalizeProductInput = (payload = {}, existing = {}) => ({
  sku: String(payload.sku ?? existing.sku ?? '').trim(),
  slug: String(payload.slug ?? existing.slug ?? slugify(payload.title ?? existing.title)).trim(),
  title: String(payload.title ?? existing.title ?? '').trim(),
  desc: String(payload.desc ?? payload.description ?? existing.desc ?? '').trim(),
  category: String(payload.category ?? existing.category ?? '').trim(),
  brand: String(payload.brand ?? existing.brand ?? '').trim(),
  species: String(payload.species ?? existing.species ?? 'cat').trim(),
  lifeStage: String(payload.lifeStage ?? existing.lifeStage ?? 'all').trim(),
  location: String(payload.location ?? existing.location ?? '').trim(),
  price: Number(payload.price ?? existing.price ?? 0),
  stock: Number(payload.stock ?? existing.stock ?? 0),
  status: String(payload.status ?? existing.status ?? 'active').trim(),
  img: String(payload.img ?? payload.imageUrl ?? existing.img ?? '').trim(),
  seller: payload.seller ?? existing.seller ?? null,
});

const validateProduct = (product, database, productId = '') => {
  if (!product.sku) return 'SKU is required';
  if (!product.title) return 'Product title is required';
  if (!product.category) return 'Category is required';
  if (!Number.isFinite(product.price) || product.price <= 0) return 'Price must be greater than 0';
  if (!Number.isInteger(product.stock) || product.stock < 0) return 'Stock must be a non-negative integer';
  if (!PRODUCT_STATUSES.has(product.status)) return 'Unsupported product status';

  const duplicateSku = database.products.find(item => item.sku === product.sku && item.id !== productId);
  if (duplicateSku) return 'SKU already exists';

  const duplicateSlug = database.products.find(item => item.slug === product.slug && item.id !== productId);
  if (duplicateSlug) return 'Slug already exists';

  return '';
};

const addAuditLog = (database, actor, action, entityType, entityId, metadata = {}) => {
  database.auditLogs.push({
    id: nextId('AUD'),
    actorUserId: actor?.id || '',
    action,
    entityType,
    entityId,
    metadata,
    createdAt: new Date().toISOString(),
  });
};

const addStockMovement = (database, actor, productId, type, quantity, note = '') => {
  const movement = {
    id: nextId('STM'),
    productId,
    type,
    quantity,
    refType: 'admin',
    refId: actor?.id || '',
    note,
    createdAt: new Date().toISOString(),
  };
  database.stockMovements.push(movement);
  return movement;
};

export const listAdminProducts = async (searchParams = new URLSearchParams()) => {
  const database = await readDatabase();
  const status = searchParams.get('status');
  const products = filterProducts(database.products, searchParams)
    .filter(product => !status || (product.status || 'active') === status);

  return {
    products,
    total: products.length,
    lowStock: products.filter(product => (product.stock || 0) <= 5 && (product.status || 'active') !== 'archived').length,
  };
};

export const createAdminProduct = async (payload, actor) =>
  withDatabase((database) => {
    const now = new Date().toISOString();
    const product = {
      id: nextId('PRD'),
      ...normalizeProductInput(payload),
      createdAt: now,
      updatedAt: now,
    };

    if (!product.slug) product.slug = slugify(product.title);
    const error = validateProduct(product, database);
    if (error) return { error: { status: 400, message: error } };

    database.products.push(product);
    if (product.stock > 0) addStockMovement(database, actor, product.id, 'in', product.stock, 'Initial stock');
    addAuditLog(database, actor, 'product.create', 'product', product.id, { sku: product.sku });

    return { product };
  });

export const updateAdminProduct = async (productId, payload, actor) =>
  withDatabase((database) => {
    const index = database.products.findIndex(product => product.id === productId);
    if (index < 0) return { error: { status: 404, message: 'Product not found' } };

    const existing = database.products[index];
    const next = {
      ...existing,
      ...normalizeProductInput(payload, existing),
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    const error = validateProduct(next, database, productId);
    if (error) return { error: { status: 400, message: error } };

    const stockDelta = next.stock - Number(existing.stock || 0);
    database.products[index] = next;
    if (stockDelta !== 0) addStockMovement(database, actor, productId, 'adjustment', stockDelta, 'Product stock field updated');
    addAuditLog(database, actor, 'product.update', 'product', productId, { sku: next.sku });

    return { product: next };
  });

export const archiveAdminProduct = async (productId, actor) =>
  withDatabase((database) => {
    const product = database.products.find(item => item.id === productId);
    if (!product) return { error: { status: 404, message: 'Product not found' } };

    product.status = 'archived';
    product.updatedAt = new Date().toISOString();
    addAuditLog(database, actor, 'product.archive', 'product', productId, { sku: product.sku });

    return { product };
  });

export const adjustAdminStock = async (productId, payload, actor) =>
  withDatabase((database) => {
    const product = database.products.find(item => item.id === productId);
    if (!product) return { error: { status: 404, message: 'Product not found' } };

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
    const movementQty = nextStock - currentStock;
    const movement = addStockMovement(database, actor, productId, type, movementQty, String(payload.note || '').trim());
    addAuditLog(database, actor, 'stock.adjust', 'product', productId, { from: currentStock, to: nextStock, type });

    return { product, movement };
  });
