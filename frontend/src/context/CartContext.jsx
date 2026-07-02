import { createContext, useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { AuthContext } from './AuthContext';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [cart, setCart] = useState([]);
  const [redeemPoints, setRedeemPoints] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Load cart from localStorage when user changes
  useEffect(() => {
    if (user) {
      const savedCart = localStorage.getItem(`cart_${user.id}`);
      if (savedCart) {
        try {
          setCart(JSON.parse(savedCart));
        } catch (e) {
          console.error('Error parsing cart from localStorage', e);
          setCart([]);
        }
      } else {
        setCart([]);
      }
    } else {
      setCart([]);
    }
    setRedeemPoints(false);
    setIsCartOpen(false);
  }, [user]);

  // Save cart to localStorage when cart updates
  useEffect(() => {
    if (user) {
      localStorage.setItem(`cart_${user.id}`, JSON.stringify(cart));
    }
  }, [cart, user]);

  const addToCart = (product) => {
    if (product.stock_quantity <= 0) {
      return { success: false, message: 'Product is currently out of stock.' };
    }

    let message = '';
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) {
          message = `Cannot add more. Only ${product.stock_quantity} units available.`;
          return prevCart;
        }
        message = `Increased quantity of ${product.name}.`;
        return prevCart.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      message = `${product.name} added to cart.`;
      return [...prevCart, { product, quantity: 1 }];
    });

    return { success: !message.includes('Cannot'), message };
  };

  const updateQuantity = (productId, amount) => {
    let success = true;
    let message = '';

    setCart((prevCart) => {
      const item = prevCart.find((i) => i.product.id === productId);
      if (!item) return prevCart;

      const newQty = item.quantity + amount;
      if (newQty <= 0) {
        message = 'Item removed from cart.';
        return prevCart.filter((i) => i.product.id !== productId);
      }

      if (newQty > item.product.stock_quantity) {
        success = false;
        message = `Only ${item.product.stock_quantity} units available in stock.`;
        return prevCart;
      }

      return prevCart.map((i) =>
        i.product.id === productId ? { ...i, quantity: newQty } : i
      );
    });

    return { success, message };
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setRedeemPoints(false);
  };

  // Derived states / calculations
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartSubtotal = cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
  const cartSavings = cartSubtotal * 0.05; // 5% promotional discount

  const cartTotal = cartSubtotal - cartSavings;

  const value = useMemo(() => ({
    cart,
    setCart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    cartCount,
    cartSubtotal,
    cartSavings,
    cartTotal,
    redeemPoints,
    setRedeemPoints,
    isCartOpen,
    setIsCartOpen,
  }), [
    cart,
    cartCount,
    cartSubtotal,
    cartSavings,
    cartTotal,
    redeemPoints,
    isCartOpen
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
