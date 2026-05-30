import { api } from './apiClient';

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

export const productApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/products${query ? `?${query}` : ''}`);
  },
  detail: (slug) => api.get(`/products/${encodeURIComponent(slug)}`),
};

export const cartApi = {
  get: () => api.get('/cart'),
  addItem: (productId, quantity = 1) => api.post('/cart/items', { productId, quantity }),
  updateItem: (productId, quantity) => api.patch(`/cart/items/${productId}`, { quantity }),
  removeItem: (productId) => api.delete(`/cart/items/${productId}`),
  clear: () => api.delete('/cart'),
};

export const checkoutApi = {
  placeOrder: (payload) => api.post('/checkout/place-order', payload),
};

export const orderApi = {
  list: () => api.get('/orders'),
  detail: (orderNo) => api.get(`/orders/${encodeURIComponent(orderNo)}`),
};

export const adminApi = {
  products: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/admin/products${query ? `?${query}` : ''}`);
  },
  createProduct: (payload) => api.post('/admin/products', payload),
  updateProduct: (productId, payload) => api.patch(`/admin/products/${productId}`, payload),
  archiveProduct: (productId) => api.delete(`/admin/products/${productId}`),
  adjustStock: (productId, payload) => api.patch(`/admin/products/${productId}/stock`, payload),
  orders: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/admin/orders${query ? `?${query}` : ''}`);
  },
  updateOrderStatus: (orderId, status) => api.patch(`/admin/orders/${orderId}/status`, { status }),
  updateOrder: (orderId, payload) => api.patch(`/admin/orders/${orderId}`, payload),
  cancelOrder: (orderId, reason) => api.post(`/admin/orders/${orderId}/cancel`, { reason }),
  markPaymentPaid: (orderId, payload = {}) => api.post(`/admin/orders/${orderId}/payments/mark-paid`, payload),
  markPaymentFailed: (orderId, payload = {}) => api.post(`/admin/orders/${orderId}/payments/mark-failed`, payload),
  refundPayment: (orderId, payload = {}) => api.post(`/admin/orders/${orderId}/payments/refund`, payload),
  users: () => api.get('/admin/users'),
  updateUserRole: (userId, role) => api.patch(`/admin/users/${userId}`, { role }),
};
