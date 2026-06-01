import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useUser } from './UserContext';
import { getCart, saveCart, clearCart as clearFirebaseCart } from '../services/cartStore';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { currentUser } = useUser();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [pendingProductIds, setPendingProductIds] = useState([]);

  const refreshCart = useCallback(async () => {
    if (!currentUser?.uid) { setItems([]); return; }
    setIsLoading(true);
    try {
      const cart = await getCart(currentUser.uid);
      setItems(cart.items || []);
    } catch {
      setError('ไม่สามารถโหลดตะกร้าได้');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.uid]);

  useEffect(() => { refreshCart(); }, [refreshCart]);

  const persist = async (newItems) => {
    if (currentUser?.uid) await saveCart(currentUser.uid, newItems);
  };

  const setProductPending = (productId, pending) => {
    setPendingProductIds(prev =>
      pending ? (prev.includes(productId) ? prev : [...prev, productId]) : prev.filter(id => id !== productId)
    );
  };

  const addItem = async (product, quantity = 1) => {
    if (!product?.id || pendingProductIds.includes(product.id))
      return { ok: false, error: 'สินค้ากำลังอัปเดต' };
    setProductPending(product.id, true);
    try {
      const existing = items.find(i => i.product.id === product.id);
      const newItems = existing
        ? items.map(i => i.product.id === product.id ? { ...i, qty: i.qty + quantity } : i)
        : [...items, { product, qty: quantity }];
      setItems(newItems);
      setIsOpen(true);
      await persist(newItems);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message || 'ไม่สามารถเพิ่มสินค้าได้' };
    } finally {
      setProductPending(product.id, false);
    }
  };

  const removeItem = async (id) => {
    const newItems = items.filter(i => i.product.id !== id);
    setItems(newItems);
    await persist(newItems);
    return { ok: true };
  };

  const updateQty = async (id, delta) => {
    if (pendingProductIds.includes(id)) return { ok: false, error: 'สินค้ากำลังอัปเดต' };
    const current = items.find(i => i.product.id === id);
    if (!current) return { ok: false, error: 'ไม่พบสินค้าในตะกร้า' };
    const newQty = current.qty + delta;
    const newItems = newQty <= 0
      ? items.filter(i => i.product.id !== id)
      : items.map(i => i.product.id === id ? { ...i, qty: newQty } : i);
    setItems(newItems);
    await persist(newItems);
    return { ok: true };
  };

  const clear = async () => {
    setItems([]);
    if (currentUser?.uid) await clearFirebaseCart(currentUser.uid);
    return { ok: true };
  };

  const total = items.reduce((s, i) => s + i.product.price * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);
  const isProductPending = (id) => pendingProductIds.includes(id);

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, updateQty, clear, refreshCart,
      total, count, isLoading, error,
      isOpen, setIsOpen, isCheckoutOpen, setIsCheckoutOpen,
      pendingProductIds, isProductPending,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
