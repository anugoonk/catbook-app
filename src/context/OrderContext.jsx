import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useUser } from './UserContext';
import { subscribeUserOrders, updateOrder, cancelOrder as cancelOrderFirebase } from '../services/orderStore';

const OrderContext = createContext(null);

export const OrderProvider = ({ children }) => {
  const { currentUser } = useUser();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentUser?.uid) { setOrders([]); return; }
    setIsLoading(true);
    const unsub = subscribeUserOrders(currentUser.uid, (data) => {
      setOrders(data);
      setIsLoading(false);
    });
    return unsub;
  }, [currentUser?.uid]);

  const refreshOrders = useCallback(() => {}, []);
  const addOrder = useCallback(() => {}, []);

  const updateOrderStatus = async (id, status) => {
    try {
      await updateOrder(id, { status });
      setError('');
    } catch { setError('อัปเดตสถานะคำสั่งซื้อไม่สำเร็จ'); }
  };

  const updateOrderFn = async (id, payload) => {
    try {
      await updateOrder(id, payload);
      setError('');
    } catch { setError('อัปเดตคำสั่งซื้อไม่สำเร็จ'); }
  };

  const cancelOrderFn = async (id, reason) => {
    try {
      await cancelOrderFirebase(id, reason);
      setError('');
    } catch { setError('ยกเลิกคำสั่งซื้อไม่สำเร็จ'); }
  };

  const markPaymentPaid = (id) => updateOrderFn(id, { paymentStatus: 'paid' });
  const markPaymentFailed = (id) => updateOrderFn(id, { paymentStatus: 'failed' });
  const refundPayment = (id) => updateOrderFn(id, { paymentStatus: 'refunded' });

  return (
    <OrderContext.Provider value={{
      orders, addOrder, updateOrderStatus,
      updateOrder: updateOrderFn, cancelOrder: cancelOrderFn,
      markPaymentPaid, markPaymentFailed, refundPayment,
      refreshOrders, isLoading, error,
    }}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = () => useContext(OrderContext);
