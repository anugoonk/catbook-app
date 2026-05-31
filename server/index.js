import { createServer } from 'node:http';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { mockUsers } from '../src/data/mockData.js';
import { addCartItem, clearCart, getCart, removeCartItem, updateCartItem } from './cartStore.js';
import { cancelAdminOrder, createOrderFromCart, getOrder, listAllOrders, listOrders, markPaymentFailed, markPaymentPaid, refundPayment, updateAdminOrder, updateOrderStatus } from './orderStore.js';
import { backupDatabase, cleanExpiredSessions, createSession, createUser, db, deleteSession, getDatabaseHealth, getSession, readDatabase, removeUser, setUserStatus, updateUserActiveCat, withDatabase } from './database.js';
import { parseUpload, serveUpload } from './uploadStore.js';
import { createComment, createPost, deletePost, deletePostAdmin, listAdminPosts, listComments, listPosts, removeReaction, seedMockPosts, setPostHidden, toggleFollow, updatePost, upsertReaction } from './socialStore.js';
import { createLostCat, deleteLostCat, listLostCats, seedLostCats, updateLostCatStatus } from './lostCatStore.js';
import { getConversation, sendMessage, getInboxPreviews } from './messageStore.js';
import { findProductBySlug, listProducts } from './productRepository.js';
import { adjustAdminStock, archiveAdminProduct, createAdminProduct, listAdminProducts, updateAdminProduct } from './adminProductRepository.js';
import { adjustSellerStock, archiveSellerProduct, createSellerProduct, listSellerProducts, updateSellerProduct } from './sellerProductRepository.js';
import { apiError, auditLog, isStrongEnoughDevPassword, mutationMethods, newCsrfToken, parseNonNegativeInteger, parsePositiveInteger } from './security.js';
import { logError, logInfo, logWarn } from './logger.js';
import { validateRuntimeConfig } from './runtimeConfig.js';

const { config, warnings: runtimeWarnings } = validateRuntimeConfig('catbook-api');
const PORT = config.apiPort;
const DEV_PASSWORD = config.devPassword;
const SESSION_COOKIE = 'catbook_sid';

runtimeWarnings.forEach(warning => logWarn('runtime.config_warning', { service: config.serviceName, warning }));

// Per-user password verification — reads salt+hash from DB
const verifyPassword = (password, userId) => {
  const row = db.prepare('SELECT password_hash, password_salt FROM users WHERE id = ?').get(userId);
  if (!row?.password_hash || !row?.password_salt) return false;
  const candidate = scryptSync(password, row.password_salt, 32);
  const stored = Buffer.from(row.password_hash, 'hex');
  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
};

// Login rate limiter: max 10 attempts / 15 min / IP
const loginAttempts = new Map();
const LOGIN_MAX = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

const checkLoginRateLimit = (ip) => {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record || now >= record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return true;
  }
  if (record.count >= LOGIN_MAX) return false;
  record.count += 1;
  return true;
};

const resetLoginRateLimit = (ip) => loginAttempts.delete(ip);

const getClientIp = (request) =>
  request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
  request.socket?.remoteAddress || 'unknown';

// Load ALL users from DB (includes mock users + registered users)
const dbData = await readDatabase();
seedMockPosts();
seedLostCats();
let authUsers = dbData.users.map(dbUser => ({
  id: dbUser.id,
  email: dbUser.email,
  ownerName: dbUser.ownerName,
  role: dbUser.role || 'USER',
  isAdmin: dbUser.role === 'ADMIN',
  status: dbUser.status || 'active',
  activeCat: dbUser.activeCat,
  createdAt: dbUser.createdAt,
}));

// Seed per-user password hash+salt for any user that doesn't have one yet
for (const user of authUsers) {
  const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(user.id);
  if (!row?.password_hash) {
    const salt = randomBytes(32).toString('hex');
    const hash = scryptSync(DEV_PASSWORD, salt, 32).toString('hex');
    db.prepare('UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?')
      .run(hash, salt, user.id);
    logInfo('auth.password_seeded', { userId: user.id });
  }
}

cleanExpiredSessions();

const sanitizeUser = (user) => {
  const clone = { ...user };
  delete clone.passwordHash;
  return clone;
};

const readBody = (request) => new Promise((resolve, reject) => {
  let body = '';
  request.on('data', chunk => { body += chunk; });
  request.on('end', () => {
    if (!body) {
      resolve({});
      return;
    }

    try {
      resolve(JSON.parse(body));
    } catch (error) {
      reject(error);
    }
  });
});

// Allowed origins: dev localhost + Cloudflare Pages domain (set via CATBOOK_ALLOWED_ORIGINS)
const ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...(process.env.CATBOOK_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean),
]);

const getCorsHeaders = (requestOrigin) => {
  const origin = ALLOWED_ORIGINS.has(requestOrigin) ? requestOrigin : null;
  if (!origin) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,x-csrf-token',
  };
};

const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none';",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  ...(config.nodeEnv === 'production' ? { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' } : {}),
};

const sendJson = (response, status, payload, headers = {}) => {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    ...SECURITY_HEADERS,
    ...headers,
  });
  response.end(JSON.stringify(payload));
};

const handlePreflight = (request, response) => {
  const origin = request.headers['origin'];
  const cors = getCorsHeaders(origin);
  if (!cors['Access-Control-Allow-Origin']) {
    response.writeHead(403); response.end(); return true;
  }
  response.writeHead(204, cors); response.end(); return true;
};

const sendError = (response, status, message, code = 'API_ERROR', details) => {
  sendJson(response, status, apiError(status, message, code, details));
};

const getCookie = (request, name) => {
  const cookie = request.headers.cookie || '';
  return cookie
    .split(';')
    .map(part => part.trim())
    .find(part => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
};

const getSessionUser = (request) => {
  const sessionId = getCookie(request, SESSION_COOKIE);
  if (!sessionId) return null;
  const session = getSession(sessionId);
  if (!session) return null;
  const user = authUsers.find(item => item.id === session.userId);
  return user ? sanitizeUser(user) : null;
};

const requireSessionUser = (request, response) => {
  const user = getSessionUser(request);
  if (!user) {
    sendError(response, 401, 'Not authenticated', 'NOT_AUTHENTICATED');
    return null;
  }
  return user;
};

const requireAdminUser = (request, response) => {
  const user = requireSessionUser(request, response);
  if (!user) return null;
  if (user.role !== 'ADMIN') {
    sendError(response, 403, 'Admin access required', 'ADMIN_REQUIRED');
    return null;
  }
  return user;
};

const requireSellerUser = (request, response) => {
  const user = requireSessionUser(request, response);
  if (!user) return null;
  if (user.role !== 'SELLER' && user.role !== 'ADMIN') {
    sendError(response, 403, 'Seller access required', 'SELLER_REQUIRED');
    return null;
  }
  return user;
};

const assertCsrf = (request, response, url) => {
  const publicMutations = ['/api/v1/auth/login', '/api/v1/auth/register'];
  if (!mutationMethods.has(request.method) || publicMutations.includes(url.pathname)) return true;
  const sessionId = getCookie(request, SESSION_COOKIE);
  if (!sessionId) {
    sendError(response, 403, 'Invalid CSRF token', 'INVALID_CSRF');
    return false;
  }
  const session = getSession(sessionId);
  const actual = request.headers['x-csrf-token'];
  if (session && actual === session.csrfToken) return true;
  sendError(response, 403, 'Invalid CSRF token', 'INVALID_CSRF');
  return false;
};

// SameSite=None;Secure required for cross-origin cookies (Cloudflare Pages → Render)
const cookieFlags = config.nodeEnv === 'production'
  ? '; Secure; SameSite=None'
  : '; SameSite=Lax';

const setSessionCookie = (sessionId) =>
  `${SESSION_COOKIE}=${sessionId}; HttpOnly; Path=/; Max-Age=86400${cookieFlags}`;

const clearSessionCookie = () =>
  `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0${cookieFlags}`;

const requestOrigin = (request) =>
  `${request.headers['x-forwarded-proto'] || 'http'}://${request.headers['x-forwarded-host'] || request.headers.host}`;

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  // Inject CORS headers into every response automatically
  const corsHeaders = getCorsHeaders(request.headers['origin']);
  const _origWriteHead = response.writeHead.bind(response);
  response.writeHead = (status, headers) => _origWriteHead(status, { ...corsHeaders, ...(headers || {}) });

  // Preflight
  if (request.method === 'OPTIONS') { handlePreflight(request, response); return; }

  try {
    if (!assertCsrf(request, response, url)) return;

    // Static: serve uploaded images (no auth required)
    if (request.method === 'GET' && url.pathname.startsWith('/uploads/')) {
      const filename = url.pathname.slice('/uploads/'.length);
      await serveUpload(filename, response);
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/v1/health') {
      const database = await getDatabaseHealth();
      sendJson(response, 200, {
        ok: true,
        service: config.serviceName,
        environment: config.nodeEnv,
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.round(process.uptime()),
        warnings: runtimeWarnings,
        database,
      });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/v1/products') {
      const products = await listProducts(url.searchParams, { origin: requestOrigin(request) });
      sendJson(response, 200, {
        products,
        total: products.length,
      });
      return;
    }

    if (request.method === 'GET' && url.pathname.startsWith('/api/v1/products/')) {
      const slug = decodeURIComponent(url.pathname.replace('/api/v1/products/', ''));
      const product = await findProductBySlug(slug, { origin: requestOrigin(request) });
      if (!product) {
        sendError(response, 404, 'Product not found', 'PRODUCT_NOT_FOUND');
        return;
      }
      sendJson(response, 200, { product });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/v1/auth/me') {
      const sessionId = getCookie(request, SESSION_COOKIE);
      if (!sessionId) { sendError(response, 401, 'Not authenticated', 'NOT_AUTHENTICATED'); return; }
      const session = getSession(sessionId);
      if (!session) { sendError(response, 401, 'Not authenticated', 'NOT_AUTHENTICATED'); return; }
      const user = authUsers.find(u => u.id === session.userId);
      if (!user) { sendError(response, 401, 'Not authenticated', 'NOT_AUTHENTICATED'); return; }
      sendJson(response, 200, { user: sanitizeUser(user), csrfToken: session.csrfToken });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/v1/cart') {
      const user = requireSessionUser(request, response);
      if (!user) return;
      sendJson(response, 200, await getCart(user.id));
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/v1/cart/items') {
      const user = requireSessionUser(request, response);
      if (!user) return;
      const { productId, quantity } = await readBody(request);
      const qty = parsePositiveInteger(quantity, 1);
      if (!qty) {
        sendError(response, 400, 'Quantity must be a positive integer', 'VALIDATION_ERROR');
        return;
      }
      const cart = await addCartItem(user.id, productId, qty);
      if (!cart) {
        sendJson(response, 404, { message: 'Product not found' });
        return;
      }
      sendJson(response, 200, cart);
      return;
    }

    if (request.method === 'PATCH' && url.pathname.startsWith('/api/v1/cart/items/')) {
      const user = requireSessionUser(request, response);
      if (!user) return;
      const productId = decodeURIComponent(url.pathname.replace('/api/v1/cart/items/', ''));
      const { quantity } = await readBody(request);
      const qty = parseNonNegativeInteger(quantity, 0);
      if (qty === null) {
        sendError(response, 400, 'Quantity must be a non-negative integer', 'VALIDATION_ERROR');
        return;
      }
      const cart = await updateCartItem(user.id, productId, qty);
      if (!cart) {
        sendJson(response, 404, { message: 'Product not found' });
        return;
      }
      sendJson(response, 200, cart);
      return;
    }

    if (request.method === 'DELETE' && url.pathname.startsWith('/api/v1/cart/items/')) {
      const user = requireSessionUser(request, response);
      if (!user) return;
      const productId = decodeURIComponent(url.pathname.replace('/api/v1/cart/items/', ''));
      sendJson(response, 200, await removeCartItem(user.id, productId));
      return;
    }

    if (request.method === 'DELETE' && url.pathname === '/api/v1/cart') {
      const user = requireSessionUser(request, response);
      if (!user) return;
      sendJson(response, 200, await clearCart(user.id));
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/v1/checkout/place-order') {
      const user = requireSessionUser(request, response);
      if (!user) return;
      const result = await createOrderFromCart(user, await readBody(request));
      if (result.error) {
        sendJson(response, result.error.status, result.error);
        return;
      }
      sendJson(response, 201, result);
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/v1/orders') {
      const user = requireSessionUser(request, response);
      if (!user) return;
      sendJson(response, 200, { orders: await listOrders(user.id) });
      return;
    }

    if (request.method === 'GET' && url.pathname.startsWith('/api/v1/orders/')) {
      const user = requireSessionUser(request, response);
      if (!user) return;
      const orderId = decodeURIComponent(url.pathname.replace('/api/v1/orders/', ''));
      const order = await getOrder(user.id, orderId);
      if (!order) {
        sendJson(response, 404, { message: 'Order not found' });
        return;
      }
      sendJson(response, 200, { order });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/v1/admin/orders') {
      const user = requireAdminUser(request, response);
      if (!user) return;
      sendJson(response, 200, { orders: await listAllOrders() });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/v1/admin/products') {
      const user = requireAdminUser(request, response);
      if (!user) return;
      sendJson(response, 200, await listAdminProducts(url.searchParams));
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/v1/admin/system/backup') {
      const user = requireAdminUser(request, response);
      if (!user) return;
      const backup = await backupDatabase({
        reason: 'admin-manual',
        backupDir: config.backupDir,
        retention: config.backupRetention,
      });
      await auditLog({
        actorUserId: user.id,
        action: 'admin.system_backup',
        entityType: 'system',
        entityId: 'database',
        metadata: { file: backup.file, sizeBytes: backup.sizeBytes },
      });
      sendJson(response, 201, { backup });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/v1/admin/products') {
      const user = requireAdminUser(request, response);
      if (!user) return;
      const result = await createAdminProduct(await readBody(request), user);
      if (result.error) {
        sendJson(response, result.error.status, result.error);
        return;
      }
      sendJson(response, 201, result);
      return;
    }

    if (request.method === 'PATCH' && url.pathname.startsWith('/api/v1/admin/products/') && url.pathname.endsWith('/stock')) {
      const user = requireAdminUser(request, response);
      if (!user) return;
      const productId = decodeURIComponent(url.pathname.replace('/api/v1/admin/products/', '').replace('/stock', ''));
      const result = await adjustAdminStock(productId, await readBody(request), user);
      if (result.error) {
        sendJson(response, result.error.status, result.error);
        return;
      }
      sendJson(response, 200, result);
      return;
    }

    if (request.method === 'PATCH' && url.pathname.startsWith('/api/v1/admin/products/')) {
      const user = requireAdminUser(request, response);
      if (!user) return;
      const productId = decodeURIComponent(url.pathname.replace('/api/v1/admin/products/', ''));
      const result = await updateAdminProduct(productId, await readBody(request), user);
      if (result.error) {
        sendJson(response, result.error.status, result.error);
        return;
      }
      sendJson(response, 200, result);
      return;
    }

    if (request.method === 'DELETE' && url.pathname.startsWith('/api/v1/admin/products/')) {
      const user = requireAdminUser(request, response);
      if (!user) return;
      const productId = decodeURIComponent(url.pathname.replace('/api/v1/admin/products/', ''));
      const result = await archiveAdminProduct(productId, user);
      if (result.error) {
        sendJson(response, result.error.status, result.error);
        return;
      }
      sendJson(response, 200, result);
      return;
    }

    if (request.method === 'PATCH' && url.pathname.startsWith('/api/v1/admin/orders/') && url.pathname.endsWith('/status')) {
      const user = requireAdminUser(request, response);
      if (!user) return;
      const orderId = decodeURIComponent(url.pathname.replace('/api/v1/admin/orders/', '').replace('/status', ''));
      const { status } = await readBody(request);
      const result = await updateOrderStatus(orderId, status);
      if (result.error) {
        sendJson(response, result.error.status, result.error);
        return;
      }
      sendJson(response, 200, result);
      return;
    }

    if (request.method === 'PATCH' && url.pathname.startsWith('/api/v1/admin/orders/')) {
      const user = requireAdminUser(request, response);
      if (!user) return;
      const orderId = decodeURIComponent(url.pathname.replace('/api/v1/admin/orders/', ''));
      const result = await updateAdminOrder(orderId, { ...(await readBody(request)), actorUserId: user.id });
      if (result.error) {
        sendJson(response, result.error.status, result.error);
        return;
      }
      sendJson(response, 200, result);
      return;
    }

    if (request.method === 'POST' && url.pathname.startsWith('/api/v1/admin/orders/') && url.pathname.endsWith('/cancel')) {
      const user = requireAdminUser(request, response);
      if (!user) return;
      const orderId = decodeURIComponent(url.pathname.replace('/api/v1/admin/orders/', '').replace('/cancel', ''));
      const { reason } = await readBody(request);
      const result = await cancelAdminOrder(orderId, reason, user);
      if (result.error) {
        sendJson(response, result.error.status, result.error);
        return;
      }
      sendJson(response, 200, result);
      return;
    }

    if (request.method === 'POST' && url.pathname.startsWith('/api/v1/admin/orders/') && url.pathname.endsWith('/payments/mark-paid')) {
      const user = requireAdminUser(request, response);
      if (!user) return;
      const orderId = decodeURIComponent(url.pathname.replace('/api/v1/admin/orders/', '').replace('/payments/mark-paid', ''));
      const result = await markPaymentPaid(orderId, await readBody(request), user);
      if (result.error) {
        sendJson(response, result.error.status, result.error);
        return;
      }
      sendJson(response, 200, result);
      return;
    }

    if (request.method === 'POST' && url.pathname.startsWith('/api/v1/admin/orders/') && url.pathname.endsWith('/payments/mark-failed')) {
      const user = requireAdminUser(request, response);
      if (!user) return;
      const orderId = decodeURIComponent(url.pathname.replace('/api/v1/admin/orders/', '').replace('/payments/mark-failed', ''));
      const result = await markPaymentFailed(orderId, await readBody(request), user);
      if (result.error) {
        sendJson(response, result.error.status, result.error);
        return;
      }
      sendJson(response, 200, result);
      return;
    }

    if (request.method === 'POST' && url.pathname.startsWith('/api/v1/admin/orders/') && url.pathname.endsWith('/payments/refund')) {
      const user = requireAdminUser(request, response);
      if (!user) return;
      const orderId = decodeURIComponent(url.pathname.replace('/api/v1/admin/orders/', '').replace('/payments/refund', ''));
      const result = await refundPayment(orderId, await readBody(request), user);
      if (result.error) {
        sendJson(response, result.error.status, result.error);
        return;
      }
      sendJson(response, 200, result);
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/v1/auth/login') {
      const ip = getClientIp(request);
      if (!checkLoginRateLimit(ip)) {
        sendError(response, 429, 'Too many login attempts. Please try again in 15 minutes.', 'RATE_LIMITED');
        return;
      }

      let credentials;
      try {
        credentials = await readBody(request);
      } catch {
        sendError(response, 400, 'Invalid JSON body', 'INVALID_JSON');
        return;
      }

      const { email, password } = credentials;
      const normalizedEmail = String(email || '').trim().toLowerCase();
      const user = authUsers.find(item => item.email === normalizedEmail);

      if (!isStrongEnoughDevPassword(password) || !user || !verifyPassword(String(password || ''), user.id)) {
        await auditLog({ action: 'auth.login_failed', entityType: 'user', entityId: normalizedEmail, metadata: { ip } });
        sendError(response, 401, 'Invalid email or password', 'INVALID_CREDENTIALS');
        return;
      }

      if (user.status === 'banned') {
        sendError(response, 403, 'This account has been suspended', 'ACCOUNT_BANNED');
        return;
      }
      if (user.status === 'deleted') {
        sendError(response, 401, 'Invalid email or password', 'INVALID_CREDENTIALS');
        return;
      }

      resetLoginRateLimit(ip);
      const csrfToken = newCsrfToken();
      const sessionId = createSession(user.id, csrfToken);
      await auditLog({ actorUserId: user.id, action: 'auth.login', entityType: 'user', entityId: user.id });
      sendJson(response, 200, { user: sanitizeUser(user), csrfToken }, {
        'Set-Cookie': setSessionCookie(sessionId),
      });
      return;
    }

    if (request.method === 'DELETE' && url.pathname === '/api/v1/auth/account') {
      const user = requireSessionUser(request, response);
      if (!user) return;
      // Delete all user-generated social content
      db.prepare('DELETE FROM post_reactions WHERE user_id = ?').run(user.id);
      db.prepare('DELETE FROM post_comments WHERE user_id = ?').run(user.id);
      db.prepare('DELETE FROM follows WHERE follower_id = ? OR followee_id = ?').run(user.id, user.id);
      db.prepare('DELETE FROM posts WHERE user_id = ?').run(user.id);
      // Soft delete user account
      removeUser(user.id);
      const idx = authUsers.findIndex(u => u.id === user.id);
      if (idx >= 0) authUsers[idx] = { ...authUsers[idx], status: 'deleted' };
      // Invalidate session
      const sessionId = getCookie(request, SESSION_COOKIE);
      if (sessionId) deleteSession(sessionId);
      await auditLog({ actorUserId: user.id, action: 'auth.account_deleted', entityType: 'user', entityId: user.id });
      sendJson(response, 200, { ok: true }, { 'Set-Cookie': clearSessionCookie() });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/v1/auth/register') {
      let body;
      try { body = await readBody(request); }
      catch { sendError(response, 400, 'Invalid JSON body', 'INVALID_JSON'); return; }

      const normalizedEmail = String(body.email || '').trim().toLowerCase();
      const cleanPassword   = String(body.password || '');
      const cleanOwnerName  = String(body.ownerName || '').trim();
      const cleanCatName    = String(body.catName || '').trim();

      if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        sendError(response, 400, 'Valid email is required', 'VALIDATION_ERROR'); return;
      }
      if (cleanPassword.length < 8) {
        sendError(response, 400, 'Password must be at least 8 characters', 'VALIDATION_ERROR'); return;
      }
      if (!cleanOwnerName) {
        sendError(response, 400, 'Owner name is required', 'VALIDATION_ERROR'); return;
      }
      if (!cleanCatName) {
        sendError(response, 400, 'Cat name is required', 'VALIDATION_ERROR'); return;
      }
      if (authUsers.find(u => u.email === normalizedEmail)) {
        sendError(response, 409, 'Email already registered', 'EMAIL_EXISTS'); return;
      }

      const DEFAULT_AVATARS = [
        'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&q=80',
        'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=200&q=80',
        'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=200&q=80',
        'https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=200&q=80',
        'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=200&q=80',
        'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=200&q=80',
      ];
      const avatar = DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];
      const userId = `usr-${randomUUID()}`;
      const catId  = `cat-${randomUUID()}`;
      const salt   = randomBytes(32).toString('hex');
      const hash   = scryptSync(cleanPassword, salt, 32).toString('hex');

      const activeCat = {
        id: catId,
        name: cleanCatName,
        avatar,
        cover: avatar,
        breed: String(body.catBreed || '').trim() || 'ไม่ระบุ',
        bio:   String(body.catBio || '').trim(),
        status: 'ออนไลน์',
      };

      const newUser = createUser({ id: userId, email: normalizedEmail, ownerName: cleanOwnerName, role: 'USER', activeCat, passwordHash: hash, passwordSalt: salt });
      authUsers.push(newUser);

      await auditLog({ actorUserId: userId, action: 'auth.register', entityType: 'user', entityId: userId });

      const csrfToken = newCsrfToken();
      const sessionId = createSession(userId, csrfToken);
      sendJson(response, 201, { user: sanitizeUser(newUser), csrfToken }, {
        'Set-Cookie': setSessionCookie(sessionId),
      });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/v1/uploads') {
      const user = requireSessionUser(request, response);
      if (!user) return;
      try {
        const { filename } = await parseUpload(request);
        await auditLog({ actorUserId: user.id, action: 'upload.image', entityType: 'file', entityId: filename });
        sendJson(response, 201, { url: `/uploads/${filename}`, filename });
      } catch (err) {
        sendError(response, err.status || 400, err.message || 'Upload failed', 'UPLOAD_ERROR');
      }
      return;
    }

    if (request.method === 'PATCH' && url.pathname === '/api/v1/auth/profile') {
      const user = requireSessionUser(request, response);
      if (!user) return;
      const body = await readBody(request);
      const cleanName = String(body.name || '').trim();
      if (!cleanName) { sendError(response, 400, 'Cat name is required', 'VALIDATION_ERROR'); return; }

      const authEntry = authUsers.find(u => u.id === user.id);
      const updatedCat = {
        ...(authEntry?.activeCat || {}),
        name:   cleanName,
        breed:  String(body.breed  ?? authEntry?.activeCat?.breed ?? '').trim(),
        bio:    String(body.bio    ?? authEntry?.activeCat?.bio   ?? '').trim(),
        avatar: String(body.avatar || authEntry?.activeCat?.avatar || '').trim(),
        cover:  String(body.cover  || authEntry?.activeCat?.cover  || '').trim(),
      };
      updateUserActiveCat(user.id, updatedCat);
      const idx = authUsers.findIndex(u => u.id === user.id);
      if (idx >= 0) authUsers[idx] = { ...authUsers[idx], activeCat: updatedCat };
      sendJson(response, 200, { activeCat: updatedCat });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/v1/auth/logout') {
      const sessionId = getCookie(request, SESSION_COOKIE);
      if (sessionId) {
        const session = getSession(sessionId);
        if (session) await auditLog({ actorUserId: session.userId, action: 'auth.logout', entityType: 'user', entityId: session.userId });
        deleteSession(sessionId);
      }
      sendJson(response, 200, { ok: true }, {
        'Set-Cookie': clearSessionCookie(),
      });
      return;
    }

    // ── Social: Posts ──────────────────────────────────────────────
    if (request.method === 'GET' && url.pathname === '/api/v1/posts') {
      // Public endpoint — guests see posts without myReaction
      const sessionId = getCookie(request, SESSION_COOKIE);
      const session = sessionId ? getSession(sessionId) : null;
      const userId = session?.userId || '';
      sendJson(response, 200, { posts: listPosts(userId) });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/v1/posts') {
      const user = requireSessionUser(request, response);
      if (!user) return;
      const { content, feeling, location, imageUrl } = await readBody(request);
      if (!content?.trim() && !imageUrl) {
        sendError(response, 400, 'content or imageUrl required', 'VALIDATION_ERROR');
        return;
      }
      const post = createPost(user.id, { content: content?.trim(), feeling: feeling || null, location: location || null, imageUrl: imageUrl || null });
      await auditLog({ actorUserId: user.id, action: 'social.post_created', entityType: 'post', entityId: post.id });
      sendJson(response, 201, { post });
      return;
    }

    if (request.method === 'PATCH' && url.pathname.startsWith('/api/v1/posts/') && !url.pathname.includes('/reactions') && !url.pathname.includes('/comments') && !url.pathname.includes('/visibility')) {
      const user = requireSessionUser(request, response);
      if (!user) return;
      const postId = decodeURIComponent(url.pathname.replace('/api/v1/posts/', ''));
      const { content } = await readBody(request);
      if (!content?.trim()) { sendError(response, 400, 'Content required', 'BAD_REQUEST'); return; }
      const result = updatePost(postId, user.id, content.trim());
      if (result.error) { sendError(response, result.error.status, result.error.message); return; }
      sendJson(response, 200, result);
      return;
    }

    if (request.method === 'DELETE' && url.pathname.startsWith('/api/v1/posts/') && !url.pathname.includes('/reactions') && !url.pathname.includes('/comments')) {
      const user = requireSessionUser(request, response);
      if (!user) return;
      const postId = decodeURIComponent(url.pathname.replace('/api/v1/posts/', ''));
      // Admin สามารถลบโพสต์ใดก็ได้
      const result = user.role === 'ADMIN'
        ? deletePostAdmin(postId)
        : deletePost(postId, user.id);
      if (result.error) { sendError(response, result.error.status, result.error.message); return; }
      await auditLog({ actorUserId: user.id, action: 'social.post_deleted', entityType: 'post', entityId: postId });
      sendJson(response, 200, result);
      return;
    }

    // ── Social: Reactions ──────────────────────────────────────────
    if (request.method === 'POST' && url.pathname.endsWith('/reactions') && url.pathname.startsWith('/api/v1/posts/')) {
      const user = requireSessionUser(request, response);
      if (!user) return;
      const postId = decodeURIComponent(url.pathname.replace('/api/v1/posts/', '').replace('/reactions', ''));
      const { type } = await readBody(request);
      const VALID_REACTIONS = ['paw', 'love', 'heart', 'haha', 'sad'];
      if (!VALID_REACTIONS.includes(type)) {
        sendError(response, 400, `type must be one of: ${VALID_REACTIONS.join(', ')}`, 'VALIDATION_ERROR');
        return;
      }
      const result = upsertReaction(postId, user.id, type);
      if (result.error) { sendError(response, result.error.status, result.error.message); return; }
      sendJson(response, 200, result);
      return;
    }

    if (request.method === 'DELETE' && url.pathname.endsWith('/reactions') && url.pathname.startsWith('/api/v1/posts/')) {
      const user = requireSessionUser(request, response);
      if (!user) return;
      const postId = decodeURIComponent(url.pathname.replace('/api/v1/posts/', '').replace('/reactions', ''));
      sendJson(response, 200, removeReaction(postId, user.id));
      return;
    }

    // ── Social: Comments ───────────────────────────────────────────
    if (request.method === 'GET' && url.pathname.endsWith('/comments') && url.pathname.startsWith('/api/v1/posts/')) {
      const user = requireSessionUser(request, response);
      if (!user) return;
      const postId = decodeURIComponent(url.pathname.replace('/api/v1/posts/', '').replace('/comments', ''));
      sendJson(response, 200, { comments: listComments(postId, user.id) });
      return;
    }

    if (request.method === 'POST' && url.pathname.endsWith('/comments') && url.pathname.startsWith('/api/v1/posts/')) {
      const user = requireSessionUser(request, response);
      if (!user) return;
      const postId = decodeURIComponent(url.pathname.replace('/api/v1/posts/', '').replace('/comments', ''));
      const { text, meow } = await readBody(request);
      if (!text?.trim()) { sendError(response, 400, 'text required', 'VALIDATION_ERROR'); return; }
      const result = createComment(postId, user.id, { text: text.trim(), meow: Boolean(meow) });
      if (result.error) { sendError(response, result.error.status, result.error.message); return; }
      sendJson(response, 201, { comment: result });
      return;
    }

    // ── Social: Follow ─────────────────────────────────────────────
    if (request.method === 'POST' && url.pathname.endsWith('/follow') && url.pathname.startsWith('/api/v1/users/')) {
      const user = requireSessionUser(request, response);
      if (!user) return;
      const targetId = decodeURIComponent(url.pathname.replace('/api/v1/users/', '').replace('/follow', ''));
      const result = toggleFollow(user.id, targetId);
      if (result.error) { sendError(response, result.error.status, result.error.message); return; }
      sendJson(response, 200, result);
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/v1/admin/users') {
      const user = requireAdminUser(request, response);
      if (!user) return;
      const database = await readDatabase();
      const users = database.users.map(u => ({
        id: u.id,
        email: u.email,
        ownerName: u.ownerName,
        role: u.role || 'USER',
        isAdmin: u.role === 'ADMIN',
        activeCat: u.activeCat,
        createdAt: u.createdAt,
      }));
      sendJson(response, 200, { users });
      return;
    }

    if (request.method === 'PATCH' && url.pathname.startsWith('/api/v1/admin/users/') && url.pathname.endsWith('/status')) {
      const actor = requireAdminUser(request, response);
      if (!actor) return;
      const targetId = decodeURIComponent(url.pathname.replace('/api/v1/admin/users/', '').replace('/status', ''));
      if (targetId === actor.id) { sendError(response, 400, 'Cannot change your own status', 'SELF_STATUS_CHANGE'); return; }
      const { status } = await readBody(request);
      const VALID_STATUSES = ['active', 'banned'];
      if (!VALID_STATUSES.includes(status)) {
        sendError(response, 400, `status must be one of: ${VALID_STATUSES.join(', ')}`, 'VALIDATION_ERROR'); return;
      }
      setUserStatus(targetId, status);
      const idx = authUsers.findIndex(u => u.id === targetId);
      if (idx >= 0) authUsers[idx] = { ...authUsers[idx], status };
      await auditLog({ actorUserId: actor.id, action: `admin.user_${status}`, entityType: 'user', entityId: targetId });
      sendJson(response, 200, { ok: true, userId: targetId, status });
      return;
    }

    if (request.method === 'DELETE' && url.pathname.startsWith('/api/v1/admin/users/')) {
      const actor = requireAdminUser(request, response);
      if (!actor) return;
      const targetId = decodeURIComponent(url.pathname.replace('/api/v1/admin/users/', ''));
      if (targetId === actor.id) { sendError(response, 400, 'Cannot delete yourself', 'SELF_DELETE'); return; }
      removeUser(targetId);
      const idx = authUsers.findIndex(u => u.id === targetId);
      if (idx >= 0) authUsers[idx] = { ...authUsers[idx], status: 'deleted' };
      await auditLog({ actorUserId: actor.id, action: 'admin.user_deleted', entityType: 'user', entityId: targetId });
      sendJson(response, 200, { ok: true, userId: targetId });
      return;
    }

    if (request.method === 'PATCH' && url.pathname.startsWith('/api/v1/admin/users/')) {
      const actor = requireAdminUser(request, response);
      if (!actor) return;
      const targetId = decodeURIComponent(url.pathname.replace('/api/v1/admin/users/', ''));
      if (targetId === actor.id) {
        sendError(response, 400, 'Cannot change your own role', 'SELF_ROLE_CHANGE');
        return;
      }
      const { role } = await readBody(request);
      const VALID_ROLES = ['USER', 'SELLER', 'ADMIN'];
      if (!VALID_ROLES.includes(role)) {
        sendError(response, 400, `role must be one of: ${VALID_ROLES.join(', ')}`, 'VALIDATION_ERROR');
        return;
      }
      await withDatabase(db => {
        const target = db.users.find(u => u.id === targetId);
        if (!target) return;
        target.role = role;
        target.isAdmin = role === 'ADMIN';
        target.updatedAt = new Date().toISOString();
      });
      const idx = authUsers.findIndex(u => u.id === targetId);
      if (idx >= 0) authUsers[idx] = { ...authUsers[idx], role, isAdmin: role === 'ADMIN' };
      await auditLog({ actorUserId: actor.id, action: 'admin.user_role_updated', entityType: 'user', entityId: targetId, metadata: { newRole: role } });
      sendJson(response, 200, { ok: true, userId: targetId, role });
      return;
    }

    // ── Seller: Products ──────────────────────────────────────────
    if (request.method === 'GET' && url.pathname === '/api/v1/seller/products') {
      const user = requireSellerUser(request, response);
      if (!user) return;
      sendJson(response, 200, await listSellerProducts(user));
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/v1/seller/products') {
      const user = requireSellerUser(request, response);
      if (!user) return;
      const result = await createSellerProduct(await readBody(request), user);
      if (result.error) { sendJson(response, result.error.status, result.error); return; }
      await auditLog({ actorUserId: user.id, action: 'seller.product_create', entityType: 'product', entityId: result.product.id });
      sendJson(response, 201, result);
      return;
    }

    if (request.method === 'PATCH' && url.pathname.startsWith('/api/v1/seller/products/') && url.pathname.endsWith('/stock')) {
      const user = requireSellerUser(request, response);
      if (!user) return;
      const productId = decodeURIComponent(url.pathname.replace('/api/v1/seller/products/', '').replace('/stock', ''));
      const result = await adjustSellerStock(productId, await readBody(request), user);
      if (result.error) { sendJson(response, result.error.status, result.error); return; }
      sendJson(response, 200, result);
      return;
    }

    if (request.method === 'PATCH' && url.pathname.startsWith('/api/v1/seller/products/')) {
      const user = requireSellerUser(request, response);
      if (!user) return;
      const productId = decodeURIComponent(url.pathname.replace('/api/v1/seller/products/', ''));
      const result = await updateSellerProduct(productId, await readBody(request), user);
      if (result.error) { sendJson(response, result.error.status, result.error); return; }
      sendJson(response, 200, result);
      return;
    }

    if (request.method === 'DELETE' && url.pathname.startsWith('/api/v1/seller/products/')) {
      const user = requireSellerUser(request, response);
      if (!user) return;
      const productId = decodeURIComponent(url.pathname.replace('/api/v1/seller/products/', ''));
      const result = await archiveSellerProduct(productId, user);
      if (result.error) { sendJson(response, result.error.status, result.error); return; }
      sendJson(response, 200, result);
      return;
    }

    // ── Lost Cats (public + admin) ────────────────────────────────
    if (request.method === 'GET' && url.pathname === '/api/v1/lostcats') {
      // Public endpoint — guests can view lost cat reports
      sendJson(response, 200, { lostCats: listLostCats('active') });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/v1/lostcats') {
      const user = requireSessionUser(request, response);
      if (!user) return;
      const result = createLostCat(user.id, await readBody(request));
      if (result.error) { sendJson(response, result.error.status, result.error); return; }
      await auditLog({ actorUserId: user.id, action: 'lostcat.create', entityType: 'lostcat', entityId: result.lostCat.id });
      sendJson(response, 201, result);
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/v1/admin/lostcats') {
      const user = requireAdminUser(request, response);
      if (!user) return;
      sendJson(response, 200, { lostCats: listLostCats('all') });
      return;
    }

    if (request.method === 'PATCH' && url.pathname.startsWith('/api/v1/admin/lostcats/')) {
      const user = requireAdminUser(request, response);
      if (!user) return;
      const id = decodeURIComponent(url.pathname.replace('/api/v1/admin/lostcats/', ''));
      const { status } = await readBody(request);
      const result = updateLostCatStatus(id, status);
      if (result.error) { sendJson(response, result.error.status, result.error); return; }
      sendJson(response, 200, result);
      return;
    }

    if (request.method === 'DELETE' && url.pathname.startsWith('/api/v1/admin/lostcats/')) {
      const user = requireAdminUser(request, response);
      if (!user) return;
      const id = decodeURIComponent(url.pathname.replace('/api/v1/admin/lostcats/', ''));
      const result = deleteLostCat(id);
      if (result.error) { sendJson(response, result.error.status, result.error); return; }
      await auditLog({ actorUserId: user.id, action: 'admin.lostcat_deleted', entityType: 'lostcat', entityId: id });
      sendJson(response, 200, result);
      return;
    }

    // ── Admin: Activity feed from audit_logs ──────────────────────
    if (request.method === 'GET' && url.pathname === '/api/v1/admin/activity') {
      const user = requireAdminUser(request, response);
      if (!user) return;
      const ACTION_MAP = {
        'auth.login':            { dot: 'bg-green-400',  label: 'เข้าสู่ระบบ' },
        'auth.register':         { dot: 'bg-blue-400',   label: 'ลงทะเบียนใหม่' },
        'social.post_created':   { dot: 'bg-orange-400', label: 'โพสต์ใหม่' },
        'seller.product_create': { dot: 'bg-purple-400', label: 'ลงสินค้าใหม่' },
        'product.create':        { dot: 'bg-purple-400', label: 'เพิ่มสินค้า' },
        'lostcat.create':        { dot: 'bg-red-400',    label: 'แจ้งแมวหาย' },
        'auth.account_deleted':  { dot: 'bg-gray-400',   label: 'ลบบัญชี' },
        'admin.user_role_updated': { dot: 'bg-indigo-400', label: 'เปลี่ยนสิทธิ์สมาชิก' },
      };
      const formatDiff = (iso) => {
        const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
        if (mins < 1) return 'เมื่อกี้';
        if (mins < 60) return `${mins} นาทีที่แล้ว`;
        const h = Math.floor(mins / 60);
        if (h < 24) return `${h} ชั่วโมงที่แล้ว`;
        return `${Math.floor(h / 24)} วันที่แล้ว`;
      };
      const rows = db.prepare(`
        SELECT a.id, a.action, a.created_at, u.active_cat_json
        FROM audit_logs a
        LEFT JOIN users u ON u.id = a.actor_user_id
        ORDER BY a.created_at DESC LIMIT 20
      `).all();
      const activities = rows
        .filter(r => ACTION_MAP[r.action])
        .map(r => {
          const meta = ACTION_MAP[r.action];
          const cat = r.active_cat_json ? JSON.parse(r.active_cat_json) : null;
          const actor = cat?.name || 'ผู้ใช้';
          return { dot: meta.dot, text: `${actor} ${meta.label}`, time: formatDiff(r.created_at) };
        });
      sendJson(response, 200, { activities });
      return;
    }

    // ── Admin: Posts ───────────────────────────────────────────────
    if (request.method === 'GET' && url.pathname === '/api/v1/admin/posts') {
      const user = requireAdminUser(request, response);
      if (!user) return;
      sendJson(response, 200, { posts: listAdminPosts() });
      return;
    }

    if (request.method === 'PATCH' && url.pathname.startsWith('/api/v1/admin/posts/') && url.pathname.endsWith('/visibility')) {
      const user = requireAdminUser(request, response);
      if (!user) return;
      const postId = decodeURIComponent(url.pathname.replace('/api/v1/admin/posts/', '').replace('/visibility', ''));
      const { hidden } = await readBody(request);
      const result = setPostHidden(postId, Boolean(hidden));
      if (result.error) { sendError(response, result.error.status, result.error.message); return; }
      await auditLog({ actorUserId: user.id, action: hidden ? 'admin.post_hidden' : 'admin.post_shown', entityType: 'post', entityId: postId });
      sendJson(response, 200, result);
      return;
    }

    if (request.method === 'DELETE' && url.pathname.startsWith('/api/v1/admin/posts/')) {
      const user = requireAdminUser(request, response);
      if (!user) return;
      const postId = decodeURIComponent(url.pathname.replace('/api/v1/admin/posts/', ''));
      const result = deletePostAdmin(postId);
      if (result.error) { sendError(response, result.error.status, result.error.message); return; }
      await auditLog({ actorUserId: user.id, action: 'admin.post_deleted', entityType: 'post', entityId: postId });
      sendJson(response, 200, result);
      return;
    }

    // ── Messages ───────────────────────────────────────────────────
    if (url.pathname === '/api/v1/messages/inbox') {
      const user = requireSessionUser(request, response);
      if (!user) return;
      sendJson(response, 200, { previews: getInboxPreviews(user.id) });
      return;
    }

    if (url.pathname.startsWith('/api/v1/messages/')) {
      const user = requireSessionUser(request, response);
      if (!user) return;
      const partnerId = decodeURIComponent(url.pathname.replace('/api/v1/messages/', ''));
      if (!partnerId) { sendError(response, 400, 'Missing partner id', 'BAD_REQUEST'); return; }

      if (request.method === 'GET') {
        const since = url.searchParams.get('since') || null;
        sendJson(response, 200, { messages: getConversation(user.id, partnerId, since) });
        return;
      }
      if (request.method === 'POST') {
        const body = await readBody(request);
        const text = String(body?.text || '').trim();
        if (!text) { sendError(response, 400, 'Message text required', 'BAD_REQUEST'); return; }
        if (text.length > 1000) { sendError(response, 400, 'Message too long', 'TOO_LONG'); return; }
        const msg = sendMessage(user.id, partnerId, text);
        sendJson(response, 201, { message: msg });
        return;
      }
    }

    sendError(response, 404, 'Route not found', 'ROUTE_NOT_FOUND');
  } catch (error) {
    logError('http.unhandled_error', error, {
      requestId: randomUUID(),
      method: request.method,
      path: url.pathname,
      service: config.serviceName,
    });
    sendError(response, 500, 'Internal server error', 'INTERNAL_ERROR');
  }
});

server.on('clientError', (error, socket) => {
  logWarn('http.client_error', { service: config.serviceName, error: { name: error.name, message: error.message } });
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

server.listen(PORT, '0.0.0.0', () => {
  logInfo('server.started', { service: config.serviceName, url: `http://0.0.0.0:${PORT}` });
});
