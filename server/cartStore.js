import { readDatabase, withDatabase } from './database.js';

const findProduct = (database, productId) =>
  database.products.find(product => product.id === productId) || null;

const ensureRawCart = (database, userId) => {
  if (!database.carts[userId]) database.carts[userId] = [];
  return database.carts[userId];
};

const toCartResponse = (database, items) => {
  const hydratedItems = items
    .map(({ productId, qty }) => {
      const product = findProduct(database, productId);
      return product ? { product: { ...product }, qty } : null;
    })
    .filter(Boolean);

  return {
    items: hydratedItems,
    count: hydratedItems.reduce((sum, item) => sum + item.qty, 0),
    total: hydratedItems.reduce((sum, item) => sum + item.product.price * item.qty, 0),
  };
};

export const getCart = async (userId) => {
  const database = await readDatabase();
  return toCartResponse(database, ensureRawCart(database, userId));
};

export const addCartItem = async (userId, productId, quantity = 1) =>
  withDatabase((database) => {
    const product = findProduct(database, productId);
    if (!product) return null;

    const cart = ensureRawCart(database, userId);
    const qty = Math.max(1, Number(quantity) || 1);
    const existing = cart.find(item => item.productId === productId);

    if (existing) existing.qty += qty;
    else cart.push({ productId, qty });

    return toCartResponse(database, cart);
  });

export const updateCartItem = async (userId, productId, quantity) =>
  withDatabase((database) => {
    const cart = ensureRawCart(database, userId);
    const qty = Math.max(0, Number(quantity) || 0);
    const existing = cart.find(item => item.productId === productId);

    if (!existing && qty > 0) {
      const product = findProduct(database, productId);
      if (!product) return null;
      cart.push({ productId, qty });
      return toCartResponse(database, cart);
    }

    if (existing && qty <= 0) {
      database.carts[userId] = cart.filter(item => item.productId !== productId);
      return toCartResponse(database, database.carts[userId]);
    }

    if (existing) existing.qty = qty;
    return toCartResponse(database, cart);
  });

export const removeCartItem = async (userId, productId) =>
  withDatabase((database) => {
    const cart = ensureRawCart(database, userId);
    database.carts[userId] = cart.filter(item => item.productId !== productId);
    return toCartResponse(database, database.carts[userId]);
  });

export const clearCart = async (userId) =>
  withDatabase((database) => {
    database.carts[userId] = [];
    return toCartResponse(database, database.carts[userId]);
  });
