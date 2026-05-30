import { createServer } from 'node:http';
import { randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { mockUsers } from '../src/data/mockData.js';
import { addCartItem, clearCart, getCart, removeCartItem, updateCartItem } from './cartStore.js';
import { cancelAdminOrder, createOrderFromCart, getOrder, listAllOrders, listOrders, markPaymentFailed, markPaymentPaid, refundPayment, updateAdminOrder, updateOrderStatus } from './orderStore.js';
import { backupDatabase, getDatabaseHealth, readDatabase, withDatabase } from './database.js';
import { findProductBySlug, listProducts } from './productRepository.js';
import { adjustAdminStock, archiveAdminProduct, createAdminProduct, listAdminProducts, updateAdminProduct } from './adminProductRepository.js';
import { apiError, auditLog, isStrongEnoughDevPassword, mutationMethods, newCsrfToken, parseNonNegativeInteger, parsePositiveInteger } from './security.js';
import { logError, logInfo, logWarn } from './logger.js';
import { validateRuntimeConfig } from './runtimeConfig.js';

const { config, warnings: runtimeWarnings } = validateRuntimeConfig('catbook-api');
const PORT = config.apiPort;
const DEV_PASSWORD = config.devPassword;
const SESSION_COOKIE = 'catbook_sid';
const sessions = new Map();
const csrfTokens = new Map();

runtimeWarnings.forEach(warning => logWarn('runtime.config_warning', { service: config.serviceName, warning }));

const hashPassword = (password, salt = 'catbook-dev-salt') =>
  scryptSync(password, salt, 32);

const devPasswordHash = hashPassword(DEV_PASSWORD);

// Seed authUsers from mockData, then overlay DB roles so changes survive restart
const dbData = await readDatabase();
let authUsers = mockUsers.map(user => {
  const dbUser = dbData.users.find(u => u.id === user.id);
  return {
    ...user,
    role: dbUser?.role || user.role || 'USER',
    isAdmin: (dbUser?.role || user.role) === 'ADMIN',
    passwordHash: devPasswordHash,
  };
});

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
  if (!mutationMethods.has(request.method) || url.pathname === '/api/v1/auth/login') return true;
  const sessionId = getCookie(request, SESSION_COOKIE);
  const expected = sessionId ? csrfTokens.get(sessionId) : null;
  const actual = request.headers['x-csrf-token'];
  if (expected && actual === expected) return true;
  sendError(response, 403, 'Invalid CSRF token', 'INVALID_CSRF');
  return false;
};

const isPasswordMatch = (password, passwordHash) => {
  const candidate = hashPassword(password);
  return candidate.length === passwordHash.length && timingSafeEqual(candidate, passwordHash);
};

const setSessionCookie = (sessionId) =>
  `${SESSION_COOKIE}=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`;

const clearSessionCookie = () =>
  `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;

const requestOrigin = (request) =>
  `${request.headers['x-forwarded-proto'] || 'http'}://${request.headers['x-forwarded-host'] || request.headers.host}`;

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  try {
    if (!assertCsrf(request, response, url)) return;

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
      const user = requireSessionUser(request, response);
      if (!user) return;
      const sessionId = getCookie(request, SESSION_COOKIE);
      if (sessionId && !csrfTokens.has(sessionId)) csrfTokens.set(sessionId, newCsrfToken());
      sendJson(response, 200, { user, csrfToken: csrfTokens.get(sessionId) });
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

      if (!isStrongEnoughDevPassword(password) || !user || !isPasswordMatch(String(password || ''), user.passwordHash)) {
        await auditLog({ action: 'auth.login_failed', entityType: 'user', entityId: normalizedEmail, metadata: { email: normalizedEmail } });
        sendError(response, 401, 'Invalid email or password', 'INVALID_CREDENTIALS');
        return;
      }

      const sessionId = randomUUID();
      const csrfToken = newCsrfToken();
      sessions.set(sessionId, user.id);
      csrfTokens.set(sessionId, csrfToken);
      await auditLog({ actorUserId: user.id, action: 'auth.login', entityType: 'user', entityId: user.id });
      sendJson(response, 200, { user: sanitizeUser(user), csrfToken }, {
        'Set-Cookie': setSessionCookie(sessionId),
      });
      return;
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
      // Update DB
      await withDatabase(db => {
        const target = db.users.find(u => u.id === targetId);
        if (!target) return;
        target.role = role;
        target.isAdmin = role === 'ADMIN';
        target.updatedAt = new Date().toISOString();
      });
      // Update in-memory authUsers so the change takes effect immediately
      const idx = authUsers.findIndex(u => u.id === targetId);
      if (idx >= 0) {
        authUsers[idx] = { ...authUsers[idx], role, isAdmin: role === 'ADMIN' };
      }
      await auditLog({
        actorUserId: actor.id,
        action: 'admin.user_role_updated',
        entityType: 'user',
        entityId: targetId,
        metadata: { newRole: role },
      });
      sendJson(response, 200, { ok: true, userId: targetId, role });
      return;
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

server.listen(PORT, '127.0.0.1', () => {
  logInfo('server.started', { service: config.serviceName, url: `http://127.0.0.1:${PORT}` });
});
