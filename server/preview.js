import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { mockUsers } from '../src/data/mockData.js';
import { createServer } from 'node:http';
import { addCartItem, clearCart, getCart, removeCartItem, updateCartItem } from './cartStore.js';
import { cancelAdminOrder, createOrderFromCart, getOrder, listAllOrders, listOrders, markPaymentFailed, markPaymentPaid, refundPayment, updateAdminOrder, updateOrderStatus } from './orderStore.js';
import { backupDatabase, getDatabaseHealth } from './database.js';
import { findProductBySlug, listProducts } from './productRepository.js';
import { adjustAdminStock, archiveAdminProduct, createAdminProduct, listAdminProducts, updateAdminProduct } from './adminProductRepository.js';
import { apiError, auditLog, isStrongEnoughDevPassword, mutationMethods, newCsrfToken, parseNonNegativeInteger, parsePositiveInteger } from './security.js';
import { logError, logInfo, logWarn } from './logger.js';
import { validateRuntimeConfig } from './runtimeConfig.js';

const { config, warnings: runtimeWarnings } = validateRuntimeConfig('catbook-preview');
const PORT = config.previewPort;
const DIST_DIR = join(process.cwd(), 'dist');
const SESSION_COOKIE = 'catbook_sid';
const DEV_PASSWORD = config.devPassword;
const sessions = new Map();
const csrfTokens = new Map();

runtimeWarnings.forEach(warning => logWarn('runtime.config_warning', { service: config.serviceName, warning }));

const hashPassword = (password, salt = 'catbook-dev-salt') => scryptSync(password, salt, 32);
const devPasswordHash = hashPassword(DEV_PASSWORD);
const authUsers = mockUsers.map(user => ({ ...user, passwordHash: devPasswordHash }));

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

const sanitizeUser = (user) => {
  const clone = { ...user };
  delete clone.passwordHash;
  return clone;
};

const sendJson = (response, status, payload, headers = {}) => {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    ...headers,
  });
  response.end(JSON.stringify(payload));
};

const sendError = (response, status, message, code = 'API_ERROR', details) => {
  sendJson(response, status, apiError(status, message, code, details));
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
  const userId = sessionId ? sessions.get(sessionId) : null;
  const user = userId ? authUsers.find(item => item.id === userId) : null;
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
  if (!user.isAdmin) {
    sendError(response, 403, 'Admin access required', 'ADMIN_REQUIRED');
    return null;
  }
  return user;
};

const setSessionCookie = (sessionId) =>
  `${SESSION_COOKIE}=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`;

const clearSessionCookie = () =>
  `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;

const isPasswordMatch = (password, passwordHash) => {
  const candidate = hashPassword(password);
  return candidate.length === passwordHash.length && timingSafeEqual(candidate, passwordHash);
};

const assertCsrf = (request, response, url) => {
  if (!mutationMethods.has(request.method) || url.pathname === '/api/v1/auth/login') return true;
  const sessionId = getCookie(request, SESSION_COOKIE);
  const expected = sessionId ? csrfTokens.get(sessionId) : null;
  const actual = request.headers['x-csrf-token'];
  if (expected && actual === expected) return true;
  sendError(response, 403, 'Invalid CSRF token', 'INVALID_CSRF');
  return false;
};

const requestOrigin = (request) =>
  `${request.headers['x-forwarded-proto'] || 'http'}://${request.headers['x-forwarded-host'] || request.headers.host}`;

const handleApi = async (request, response, url) => {
  if (!assertCsrf(request, response, url)) return true;

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
    return true;
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/products') {
    const products = await listProducts(url.searchParams, { origin: requestOrigin(request) });
    sendJson(response, 200, {
      products,
      total: products.length,
    });
    return true;
  }

  if (request.method === 'GET' && url.pathname.startsWith('/api/v1/products/')) {
    const slug = decodeURIComponent(url.pathname.replace('/api/v1/products/', ''));
    const product = await findProductBySlug(slug, { origin: requestOrigin(request) });
    if (!product) {
      sendError(response, 404, 'Product not found', 'PRODUCT_NOT_FOUND');
      return true;
    }
    sendJson(response, 200, { product });
    return true;
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/auth/me') {
    const user = requireSessionUser(request, response);
    if (user) {
      const sessionId = getCookie(request, SESSION_COOKIE);
      if (sessionId && !csrfTokens.has(sessionId)) csrfTokens.set(sessionId, newCsrfToken());
      sendJson(response, 200, { user, csrfToken: csrfTokens.get(sessionId) });
    }
    return true;
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/cart') {
    const user = requireSessionUser(request, response);
    if (user) sendJson(response, 200, await getCart(user.id));
    return true;
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/cart/items') {
    const user = requireSessionUser(request, response);
    if (!user) return true;
    const { productId, quantity } = await readBody(request);
    const qty = parsePositiveInteger(quantity, 1);
    if (!qty) {
      sendError(response, 400, 'Quantity must be a positive integer', 'VALIDATION_ERROR');
      return true;
    }
    const cart = await addCartItem(user.id, productId, qty);
    if (!cart) sendJson(response, 404, { message: 'Product not found' });
    else sendJson(response, 200, cart);
    return true;
  }

  if (request.method === 'PATCH' && url.pathname.startsWith('/api/v1/cart/items/')) {
    const user = requireSessionUser(request, response);
    if (!user) return true;
    const productId = decodeURIComponent(url.pathname.replace('/api/v1/cart/items/', ''));
    const { quantity } = await readBody(request);
    const qty = parseNonNegativeInteger(quantity, 0);
    if (qty === null) {
      sendError(response, 400, 'Quantity must be a non-negative integer', 'VALIDATION_ERROR');
      return true;
    }
    const cart = await updateCartItem(user.id, productId, qty);
    if (!cart) sendJson(response, 404, { message: 'Product not found' });
    else sendJson(response, 200, cart);
    return true;
  }

  if (request.method === 'DELETE' && url.pathname.startsWith('/api/v1/cart/items/')) {
    const user = requireSessionUser(request, response);
    if (user) {
      const productId = decodeURIComponent(url.pathname.replace('/api/v1/cart/items/', ''));
      sendJson(response, 200, await removeCartItem(user.id, productId));
    }
    return true;
  }

  if (request.method === 'DELETE' && url.pathname === '/api/v1/cart') {
    const user = requireSessionUser(request, response);
    if (user) sendJson(response, 200, await clearCart(user.id));
    return true;
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/checkout/place-order') {
    const user = requireSessionUser(request, response);
    if (!user) return true;
    const result = await createOrderFromCart(user, await readBody(request));
    if (result.error) sendJson(response, result.error.status, result.error);
    else sendJson(response, 201, result);
    return true;
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/orders') {
    const user = requireSessionUser(request, response);
    if (user) sendJson(response, 200, { orders: await listOrders(user.id) });
    return true;
  }

  if (request.method === 'GET' && url.pathname.startsWith('/api/v1/orders/')) {
    const user = requireSessionUser(request, response);
    if (!user) return true;
    const orderId = decodeURIComponent(url.pathname.replace('/api/v1/orders/', ''));
    const order = await getOrder(user.id, orderId);
    if (!order) sendJson(response, 404, { message: 'Order not found' });
    else sendJson(response, 200, { order });
    return true;
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/admin/orders') {
    const user = requireAdminUser(request, response);
    if (user) sendJson(response, 200, { orders: await listAllOrders() });
    return true;
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/admin/products') {
    const user = requireAdminUser(request, response);
    if (user) sendJson(response, 200, await listAdminProducts(url.searchParams));
    return true;
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/admin/system/backup') {
    const user = requireAdminUser(request, response);
    if (!user) return true;
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
    return true;
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/admin/products') {
    const user = requireAdminUser(request, response);
    if (!user) return true;
    const result = await createAdminProduct(await readBody(request), user);
    if (result.error) sendJson(response, result.error.status, result.error);
    else sendJson(response, 201, result);
    return true;
  }

  if (request.method === 'PATCH' && url.pathname.startsWith('/api/v1/admin/products/') && url.pathname.endsWith('/stock')) {
    const user = requireAdminUser(request, response);
    if (!user) return true;
    const productId = decodeURIComponent(url.pathname.replace('/api/v1/admin/products/', '').replace('/stock', ''));
    const result = await adjustAdminStock(productId, await readBody(request), user);
    if (result.error) sendJson(response, result.error.status, result.error);
    else sendJson(response, 200, result);
    return true;
  }

  if (request.method === 'PATCH' && url.pathname.startsWith('/api/v1/admin/products/')) {
    const user = requireAdminUser(request, response);
    if (!user) return true;
    const productId = decodeURIComponent(url.pathname.replace('/api/v1/admin/products/', ''));
    const result = await updateAdminProduct(productId, await readBody(request), user);
    if (result.error) sendJson(response, result.error.status, result.error);
    else sendJson(response, 200, result);
    return true;
  }

  if (request.method === 'DELETE' && url.pathname.startsWith('/api/v1/admin/products/')) {
    const user = requireAdminUser(request, response);
    if (!user) return true;
    const productId = decodeURIComponent(url.pathname.replace('/api/v1/admin/products/', ''));
    const result = await archiveAdminProduct(productId, user);
    if (result.error) sendJson(response, result.error.status, result.error);
    else sendJson(response, 200, result);
    return true;
  }

  if (request.method === 'PATCH' && url.pathname.startsWith('/api/v1/admin/orders/') && url.pathname.endsWith('/status')) {
    const user = requireAdminUser(request, response);
    if (!user) return true;
    const orderId = decodeURIComponent(url.pathname.replace('/api/v1/admin/orders/', '').replace('/status', ''));
    const { status } = await readBody(request);
    const result = await updateOrderStatus(orderId, status);
    if (result.error) sendJson(response, result.error.status, result.error);
    else sendJson(response, 200, result);
    return true;
  }

  if (request.method === 'PATCH' && url.pathname.startsWith('/api/v1/admin/orders/')) {
    const user = requireAdminUser(request, response);
    if (!user) return true;
    const orderId = decodeURIComponent(url.pathname.replace('/api/v1/admin/orders/', ''));
    const result = await updateAdminOrder(orderId, { ...(await readBody(request)), actorUserId: user.id });
    if (result.error) sendJson(response, result.error.status, result.error);
    else sendJson(response, 200, result);
    return true;
  }

  if (request.method === 'POST' && url.pathname.startsWith('/api/v1/admin/orders/') && url.pathname.endsWith('/cancel')) {
    const user = requireAdminUser(request, response);
    if (!user) return true;
    const orderId = decodeURIComponent(url.pathname.replace('/api/v1/admin/orders/', '').replace('/cancel', ''));
    const { reason } = await readBody(request);
    const result = await cancelAdminOrder(orderId, reason, user);
    if (result.error) sendJson(response, result.error.status, result.error);
    else sendJson(response, 200, result);
    return true;
  }

  if (request.method === 'POST' && url.pathname.startsWith('/api/v1/admin/orders/') && url.pathname.endsWith('/payments/mark-paid')) {
    const user = requireAdminUser(request, response);
    if (!user) return true;
    const orderId = decodeURIComponent(url.pathname.replace('/api/v1/admin/orders/', '').replace('/payments/mark-paid', ''));
    const result = await markPaymentPaid(orderId, await readBody(request), user);
    if (result.error) sendJson(response, result.error.status, result.error);
    else sendJson(response, 200, result);
    return true;
  }

  if (request.method === 'POST' && url.pathname.startsWith('/api/v1/admin/orders/') && url.pathname.endsWith('/payments/mark-failed')) {
    const user = requireAdminUser(request, response);
    if (!user) return true;
    const orderId = decodeURIComponent(url.pathname.replace('/api/v1/admin/orders/', '').replace('/payments/mark-failed', ''));
    const result = await markPaymentFailed(orderId, await readBody(request), user);
    if (result.error) sendJson(response, result.error.status, result.error);
    else sendJson(response, 200, result);
    return true;
  }

  if (request.method === 'POST' && url.pathname.startsWith('/api/v1/admin/orders/') && url.pathname.endsWith('/payments/refund')) {
    const user = requireAdminUser(request, response);
    if (!user) return true;
    const orderId = decodeURIComponent(url.pathname.replace('/api/v1/admin/orders/', '').replace('/payments/refund', ''));
    const result = await refundPayment(orderId, await readBody(request), user);
    if (result.error) sendJson(response, result.error.status, result.error);
    else sendJson(response, 200, result);
    return true;
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/auth/login') {
    let credentials;
    try {
      credentials = await readBody(request);
    } catch {
      sendError(response, 400, 'Invalid JSON body', 'INVALID_JSON');
      return true;
    }

    const normalizedEmail = String(credentials.email || '').trim().toLowerCase();
    const user = authUsers.find(item => item.email === normalizedEmail);
    if (!isStrongEnoughDevPassword(credentials.password) || !user || !isPasswordMatch(String(credentials.password || ''), user.passwordHash)) {
      await auditLog({ action: 'auth.login_failed', entityType: 'user', entityId: normalizedEmail, metadata: { email: normalizedEmail } });
      sendError(response, 401, 'Invalid email or password', 'INVALID_CREDENTIALS');
      return true;
    }

    const sessionId = randomUUID();
    const csrfToken = newCsrfToken();
    sessions.set(sessionId, user.id);
    csrfTokens.set(sessionId, csrfToken);
    await auditLog({ actorUserId: user.id, action: 'auth.login', entityType: 'user', entityId: user.id });
    sendJson(response, 200, { user: sanitizeUser(user), csrfToken }, {
      'Set-Cookie': setSessionCookie(sessionId),
    });
    return true;
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/auth/logout') {
    const sessionId = getCookie(request, SESSION_COOKIE);
    const userId = sessionId ? sessions.get(sessionId) : '';
    if (sessionId) {
      sessions.delete(sessionId);
      csrfTokens.delete(sessionId);
    }
    if (userId) await auditLog({ actorUserId: userId, action: 'auth.logout', entityType: 'user', entityId: userId });
    sendJson(response, 200, { ok: true }, {
      'Set-Cookie': clearSessionCookie(),
    });
    return true;
  }

  if (url.pathname.startsWith('/api/')) {
    sendError(response, 404, 'Route not found', 'ROUTE_NOT_FOUND');
    return true;
  }

  return false;
};

const serveStatic = async (request, response, url) => {
  const requestedPath = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const safePath = normalize(requestedPath).replace(/^(\.\.[/\\])+/, '');
  let filePath = join(DIST_DIR, safePath);

  try {
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) filePath = join(filePath, 'index.html');
  } catch {
    filePath = join(DIST_DIR, 'index.html');
  }

  try {
    await readFile(filePath);
    response.writeHead(200, {
      'Content-Type': mimeTypes[extname(filePath)] || 'application/octet-stream',
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  try {
    if (await handleApi(request, response, url)) return;
    await serveStatic(request, response, url);
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

server.listen(PORT, '127.0.0.1', () => {
  logInfo('server.started', { service: config.serviceName, url: `http://127.0.0.1:${PORT}` });
});
