import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { adminApi, orderApi } from '../services/commerceApi';
import { useUser } from './UserContext';

const OrderContext = createContext(null);

export const OrderProvider = ({ children }) => {
  const { currentUser } = useUser();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const refreshOrders = useCallback(async () => {
    if (!currentUser) {
      setOrders([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await orderApi.list();
      setOrders(response.orders || []);
      setError('');
    } catch {
      setError('โหลดคำสั่งซื้อไม่สำเร็จ');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    refreshOrders();
  }, [refreshOrders]);

  const addOrder = (order) => setOrders(prev => [order, ...prev]);
  const updateOrderStatus = async (id, status) => {
    try {
      const response = await adminApi.updateOrderStatus(id, status);
      setOrders(prev => prev.map(o => o.id === id ? response.order : o));
      setError('');
      return response.order;
    } catch {
      setError('อัปเดตสถานะคำสั่งซื้อไม่สำเร็จ');
      return null;
    }
  };

  const updateOrder = async (id, payload) => {
    try {
      const response = await adminApi.updateOrder(id, payload);
      setOrders(prev => prev.map(o => o.id === id ? response.order : o));
      setError('');
      return response.order;
    } catch {
      setError('อัปเดตคำสั่งซื้อไม่สำเร็จ');
      return null;
    }
  };

  const cancelOrder = async (id, reason) => {
    try {
      const response = await adminApi.cancelOrder(id, reason);
      setOrders(prev => prev.map(o => o.id === id ? response.order : o));
      setError('');
      return response.order;
    } catch {
      setError('ยกเลิกคำสั่งซื้อไม่สำเร็จ');
      return null;
    }
  };

  const applyPaymentAction = async (id, action, payload = {}) => {
    try {
      const response = await adminApi[action](id, payload);
      setOrders(prev => prev.map(o => o.id === id ? response.order : o));
      setError('');
      return response.order;
    } catch {
      setError('อัปเดตสถานะชำระเงินไม่สำเร็จ');
      return null;
    }
  };

  const markPaymentPaid = (id, payload = {}) => applyPaymentAction(id, 'markPaymentPaid', payload);
  const markPaymentFailed = (id, payload = {}) => applyPaymentAction(id, 'markPaymentFailed', payload);
  const refundPayment = (id, payload = {}) => applyPaymentAction(id, 'refundPayment', payload);

  return (
    <OrderContext.Provider value={{ orders, addOrder, updateOrderStatus, updateOrder, cancelOrder, markPaymentPaid, markPaymentFailed, refundPayment, refreshOrders, isLoading, error }}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = () => useContext(OrderContext);
