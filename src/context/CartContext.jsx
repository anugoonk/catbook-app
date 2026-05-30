import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { cartApi } from '../services/commerceApi';
import { useUser } from './UserContext';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { currentUser } = useUser();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [pendingProductIds, setPendingProductIds] = useState([]);

  const applyCart = useCallback((cart) => {
    setItems(cart?.items || []);
    setError('');
  }, []);

  const refreshCart = useCallback(async () => {
    if (!currentUser) {
      setItems([]);
      return;
    }

    setIsLoading(true);
    try {
      applyCart(await cartApi.get());
    } catch (err) {
      setError(err?.message || 'Unable to load cart');
    } finally {
      setIsLoading(false);
    }
  }, [applyCart, currentUser]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const setProductPending = (productId, pending) => {
    setPendingProductIds(prev => {
      if (pending) return prev.includes(productId) ? prev : [...prev, productId];
      return prev.filter(id => id !== productId);
    });
  };

  const addItem = async (product, quantity = 1) => {
    if (!product?.id || pendingProductIds.includes(product.id)) {
      return { ok: false, error: 'Product is already updating' };
    }

    setProductPending(product.id, true);
    try {
      const cart = await cartApi.addItem(product.id, quantity);
      applyCart(cart);
      setIsOpen(true);
      return { ok: true, cart };
    } catch (err) {
      const message = err?.message || 'Unable to add product to cart';
      setError(message);
      return { ok: false, error: message };
    } finally {
      setProductPending(product.id, false);
    }
  };

  const removeItem = async (id) => {
    try {
      applyCart(await cartApi.removeItem(id));
      return { ok: true };
    } catch (err) {
      const message = err?.message || 'Unable to remove product from cart';
      setError(message);
      return { ok: false, error: message };
    }
  };

  const updateQty = async (id, delta) => {
    if (pendingProductIds.includes(id)) return { ok: false, error: 'Product is already updating' };

    const current = items.find(i => i.product.id === id);
    if (!current) return { ok: false, error: 'Product is not in cart' };

    setProductPending(id, true);
    try {
      const cart = await cartApi.updateItem(id, current.qty + delta);
      applyCart(cart);
      return { ok: true, cart };
    } catch (err) {
      const message = err?.message || 'Unable to update cart quantity';
      setError(message);
      return { ok: false, error: message };
    } finally {
      setProductPending(id, false);
    }
  };

  const clear = async () => {
    try {
      applyCart(await cartApi.clear());
      return { ok: true };
    } catch (err) {
      const message = err?.message || 'Unable to clear cart';
      setError(message);
      return { ok: false, error: message };
    }
  };

  const total = items.reduce((s, i) => s + i.product.price * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);
  const isProductPending = (id) => pendingProductIds.includes(id);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clear, refreshCart, total, count, isLoading, error, isOpen, setIsOpen, isCheckoutOpen, setIsCheckoutOpen, pendingProductIds, isProductPending }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
