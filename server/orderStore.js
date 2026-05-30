import { getCart } from './cartStore.js';
import { readDatabase, withDatabase } from './database.js';

const SHIPPING_FEE = 0;
const ALLOWED_PAYMENTS = new Set(['promptpay', 'card', 'bank_transfer', 'cod']);
const ALLOWED_STATUSES = new Set(['pending', 'paid', 'packed', 'shipped', 'delivered', 'cancelled']);
const ALLOWED_PAYMENT_STATUSES = new Set(['pending', 'paid', 'failed', 'refunded', 'pending_cod']);
const ALLOWED_SHIPPING_STATUSES = new Set(['pending', 'packed', 'shipped', 'delivered', 'cancelled']);

const toPublicOrder = (order) => ({
  ...order,
  items: order.items.map(item => ({ ...item, product: { ...item.product } })),
  address: { ...order.address },
});

const getUserOrders = (database, userId) => database.orders[userId] || [];

const findOrderRecord = (database, orderId) => {
  for (const userOrders of Object.values(database.orders)) {
    const order = userOrders.find(item => item.id === orderId);
    if (order) return order;
  }
  return null;
};

const normalizeAddress = (shippingAddress = {}) => ({
  name: String(shippingAddress.name || '').trim(),
  phone: String(shippingAddress.phone || '').trim(),
  address: String(shippingAddress.address || '').trim(),
  note: String(shippingAddress.note || '').trim(),
});

const validateAddress = (address) => {
  if (!address.name) return 'Customer name is required';
  if (!address.phone) return 'Phone number is required';
  if (!address.address) return 'Shipping address is required';
  return '';
};

const nextId = (prefix) => {
  const stamp = Date.now().toString(36).toUpperCase().slice(-6);
  const rand = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `${prefix}-${stamp}${rand}`;
};

const buildPaymentInstruction = (method, orderId, amount, now) => {
  if (method === 'promptpay') {
    return {
      type: 'promptpay_mock',
      referenceNo: `PP-${orderId}`,
      qrPayload: `PROMPTPAY|CATBOOK|${orderId}|${amount}`,
      qrLabel: `Mock PromptPay QR for ${amount} THB`,
      expiresAt: new Date(new Date(now).getTime() + 15 * 60 * 1000).toISOString(),
    };
  }

  if (method === 'bank_transfer') {
    return {
      type: 'bank_transfer_mock',
      referenceNo: `BT-${orderId}`,
      bankName: 'CatBook Demo Bank',
      accountNo: '000-0-00000-0',
      expiresAt: new Date(new Date(now).getTime() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  return null;
};

const findPaymentRecord = (database, orderId) =>
  database.payments.find(item => item.orderId === orderId) || null;

export const listOrders = async (userId) => {
  const database = await readDatabase();
  return getUserOrders(database, userId).map(toPublicOrder);
};

export const listAllOrders = async () => {
  const database = await readDatabase();
  return [...Object.values(database.orders)]
    .flat()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(toPublicOrder);
};

export const getOrder = async (userId, orderId, { includeAll = false } = {}) => {
  const source = includeAll ? await listAllOrders() : await listOrders(userId);
  return source.find(order => order.id === orderId) || null;
};

export const createOrderFromCart = async (user, payload = {}) => {
  const cart = await getCart(user.id);
  if (!cart.items.length) {
    return { error: { status: 400, message: 'Cart is empty' } };
  }

  const address = normalizeAddress(payload.shippingAddress || payload.address);
  const addressError = validateAddress(address);
  if (addressError) {
    return { error: { status: 400, message: addressError } };
  }

  const payment = String(payload.payment || payload.paymentMethod || '').trim();
  if (!ALLOWED_PAYMENTS.has(payment)) {
    return { error: { status: 400, message: 'Unsupported payment method' } };
  }

  return withDatabase((database) => {
    const cartItems = database.carts[user.id] || [];
    const hydratedItems = cartItems
      .map(({ productId, qty }) => {
        const product = database.products.find(item => item.id === productId);
        return product ? { product, qty } : null;
      })
      .filter(Boolean);

    if (!hydratedItems.length) {
      return { error: { status: 400, message: 'Cart is empty' } };
    }

    const insufficient = hydratedItems.find(({ product, qty }) => qty > Number(product.stock || 0));
    if (insufficient) {
      return {
        error: {
          status: 409,
          message: 'Insufficient stock',
          productId: insufficient.product.id,
          available: Number(insufficient.product.stock || 0),
        },
      };
    }

    const now = new Date().toISOString();
    const subtotal = hydratedItems.reduce((sum, item) => sum + item.product.price * item.qty, 0);
    const order = {
      id: nextId('CAT'),
      userId: user.id,
      customer: {
        id: user.id,
        email: user.email,
        name: user.ownerName || user.activeCat?.name || '',
      },
      items: hydratedItems.map(({ product, qty }) => {
        product.stock = Number(product.stock || 0) - qty;
        database.stockMovements.push({
          id: nextId('STM'),
          productId: product.id,
          type: 'sale',
          quantity: -qty,
          refType: 'order',
          refId: '',
          note: 'Checkout stock deduction',
          createdAt: now,
        });

        return {
          product: { ...product },
          qty,
          unitPrice: product.price,
          lineTotal: product.price * qty,
        };
      }),
      count: hydratedItems.reduce((sum, item) => sum + item.qty, 0),
      subtotal,
      shippingFee: SHIPPING_FEE,
      discount: 0,
      total: subtotal + SHIPPING_FEE,
      address,
      payment,
      paymentStatus: payment === 'cod' ? 'pending_cod' : 'pending',
      paymentInstruction: null,
      shippingStatus: 'pending',
      status: 'pending',
      trackingNo: '',
      cancelReason: '',
      createdAt: now,
      updatedAt: now,
    };

    order.items.forEach(({ product }) => {
      const movement = database.stockMovements.find(item => item.refType === 'order' && item.refId === '' && item.productId === product.id);
      if (movement) movement.refId = order.id;
    });

    database.orders[user.id] = [order, ...getUserOrders(database, user.id)];
    database.carts[user.id] = [];
    order.paymentInstruction = buildPaymentInstruction(payment, order.id, order.total, now);

    database.payments.push({
      id: nextId('PAY'),
      orderId: order.id,
      method: payment,
      status: order.paymentStatus,
      amount: order.total,
      gatewayRef: '',
      instruction: order.paymentInstruction,
      paidAt: '',
      failedAt: '',
      refundedAt: '',
      createdAt: now,
      updatedAt: now,
    });
    database.shipments.push({
      id: nextId('SHP'),
      orderId: order.id,
      carrier: '',
      trackingNo: '',
      status: 'pending',
      shippedAt: '',
      deliveredAt: '',
      createdAt: now,
    });

    return {
      order: toPublicOrder(order),
      cart: { items: [], count: 0, total: 0 },
    };
  });
};

export const updateOrderStatus = async (orderId, status) => {
  const result = await updateAdminOrder(orderId, { status });
  return result;
};

export const updateAdminOrder = async (orderId, payload = {}) => {
  const nextStatus = payload.status;
  const nextPaymentStatus = payload.paymentStatus;
  const nextShippingStatus = payload.shippingStatus;

  if (nextStatus && !ALLOWED_STATUSES.has(nextStatus)) return { error: { status: 400, message: 'Unsupported order status' } };
  if (nextPaymentStatus && !ALLOWED_PAYMENT_STATUSES.has(nextPaymentStatus)) return { error: { status: 400, message: 'Unsupported payment status' } };
  if (nextShippingStatus && !ALLOWED_SHIPPING_STATUSES.has(nextShippingStatus)) return { error: { status: 400, message: 'Unsupported shipping status' } };

  return withDatabase((database) => {
    const order = findOrderRecord(database, orderId);
    if (!order) return { error: { status: 404, message: 'Order not found' } };
    const currentPaymentStatus = nextPaymentStatus || order.paymentStatus || 'pending';
    const isMovingToShipping = ['packed', 'shipped', 'delivered'].includes(nextStatus) || ['packed', 'shipped', 'delivered'].includes(nextShippingStatus);
    if (currentPaymentStatus === 'failed' && isMovingToShipping) {
      return { error: { status: 409, message: 'Cannot ship an order with failed payment' } };
    }

    const now = new Date().toISOString();
    if (nextStatus) order.status = nextStatus;
    if (nextPaymentStatus) order.paymentStatus = nextPaymentStatus;
    if (nextShippingStatus) order.shippingStatus = nextShippingStatus;
    if (nextPaymentStatus === 'failed') {
      if (['packed', 'shipped', 'delivered'].includes(order.status)) order.status = 'pending';
      order.shippingStatus = 'pending';
    }
    if (payload.trackingNo !== undefined) order.trackingNo = String(payload.trackingNo || '').trim();
    if (payload.cancelReason !== undefined) order.cancelReason = String(payload.cancelReason || '').trim();
    order.updatedAt = now;

    const payment = findPaymentRecord(database, order.id);
    if (payment && nextPaymentStatus) {
      payment.status = nextPaymentStatus;
      payment.updatedAt = now;
      if (nextPaymentStatus === 'paid') payment.paidAt = now;
      if (nextPaymentStatus === 'failed') payment.failedAt = now;
      if (nextPaymentStatus === 'refunded') payment.refundedAt = now;
    }

    const shipment = database.shipments.find(item => item.orderId === order.id);
    if (shipment) {
      if (nextShippingStatus) shipment.status = nextShippingStatus;
      if (payload.trackingNo !== undefined) shipment.trackingNo = order.trackingNo;
      if (nextShippingStatus === 'shipped' && !shipment.shippedAt) shipment.shippedAt = now;
      if (nextShippingStatus === 'delivered' && !shipment.deliveredAt) shipment.deliveredAt = now;
    }

    database.auditLogs.push({
      id: nextId('AUD'),
      actorUserId: payload.actorUserId || '',
      action: 'order.update',
      entityType: 'order',
      entityId: order.id,
      metadata: {
        status: order.status,
        paymentStatus: order.paymentStatus,
        shippingStatus: order.shippingStatus,
        trackingNo: order.trackingNo,
      },
      createdAt: now,
    });

    return { order: toPublicOrder(order) };
  });
};

export const markPaymentPaid = async (orderId, payload = {}, actor = null) =>
  updatePaymentState(orderId, 'paid', payload, actor);

export const markPaymentFailed = async (orderId, payload = {}, actor = null) =>
  updatePaymentState(orderId, 'failed', payload, actor);

export const refundPayment = async (orderId, payload = {}, actor = null) =>
  updatePaymentState(orderId, 'refunded', payload, actor);

const updatePaymentState = async (orderId, status, payload = {}, actor = null) => {
  if (!ALLOWED_PAYMENT_STATUSES.has(status)) return { error: { status: 400, message: 'Unsupported payment status' } };

  return withDatabase((database) => {
    const order = findOrderRecord(database, orderId);
    if (!order) return { error: { status: 404, message: 'Order not found' } };

    const now = new Date().toISOString();
    let payment = findPaymentRecord(database, order.id);
    if (!payment) {
      payment = {
        id: nextId('PAY'),
        orderId: order.id,
        method: order.payment,
        amount: order.total,
        gatewayRef: '',
        instruction: buildPaymentInstruction(order.payment, order.id, order.total, now),
        createdAt: now,
      };
      database.payments.push(payment);
    }

    payment.status = status;
    payment.gatewayRef = String(payload.gatewayRef || payment.gatewayRef || '').trim();
    payment.updatedAt = now;
    if (status === 'paid') {
      payment.paidAt = now;
      order.status = order.status === 'pending' ? 'paid' : order.status;
    }
    if (status === 'failed') {
      payment.failedAt = now;
      if (['packed', 'shipped', 'delivered'].includes(order.status)) order.status = 'pending';
      order.shippingStatus = 'pending';
    }
    if (status === 'refunded') payment.refundedAt = now;

    order.paymentStatus = status;
    order.paymentInstruction = payment.instruction || null;
    order.updatedAt = now;

    const shipment = database.shipments.find(item => item.orderId === order.id);
    if (shipment && status === 'failed') shipment.status = 'pending';

    database.auditLogs.push({
      id: nextId('AUD'),
      actorUserId: actor?.id || '',
      action: `payment.${status}`,
      entityType: 'order',
      entityId: order.id,
      metadata: {
        paymentStatus: status,
        gatewayRef: payment.gatewayRef,
        note: payload.note || '',
      },
      createdAt: now,
    });

    return { order: toPublicOrder(order), payment: { ...payment } };
  });
};

export const cancelAdminOrder = async (orderId, reason = '', actor = null) => {
  const cancelReason = String(reason || '').trim();
  if (!cancelReason) return { error: { status: 400, message: 'Cancel reason is required' } };

  return withDatabase((database) => {
    const order = findOrderRecord(database, orderId);
    if (!order) return { error: { status: 404, message: 'Order not found' } };

    const now = new Date().toISOString();
    order.status = 'cancelled';
    order.shippingStatus = 'cancelled';
    order.cancelReason = cancelReason;
    order.updatedAt = now;

    const shipment = database.shipments.find(item => item.orderId === order.id);
    if (shipment) shipment.status = 'cancelled';

    if (order.paymentStatus === 'paid') {
      order.paymentStatus = 'refunded';
      const payment = database.payments.find(item => item.orderId === order.id);
      if (payment) payment.status = 'refunded';
    }

    order.items.forEach(({ product, qty }) => {
      const storedProduct = database.products.find(item => item.id === product.id);
      if (storedProduct) {
        storedProduct.stock = Number(storedProduct.stock || 0) + qty;
        database.stockMovements.push({
          id: nextId('STM'),
          productId: storedProduct.id,
          type: 'release',
          quantity: qty,
          refType: 'order',
          refId: order.id,
          note: `Order cancelled: ${cancelReason}`,
          createdAt: now,
        });
      }
    });

    database.auditLogs.push({
      id: nextId('AUD'),
      actorUserId: actor?.id || '',
      action: 'order.cancel',
      entityType: 'order',
      entityId: order.id,
      metadata: { reason: cancelReason },
      createdAt: now,
    });

    return { order: toPublicOrder(order) };
  });
};
