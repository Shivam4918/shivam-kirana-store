import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiSearch, FiLock, FiUnlock, FiCalendar, FiBookOpen, 
  FiArrowUpRight, FiArrowDownLeft, FiShoppingBag, FiInbox,
  FiShoppingCart, FiX, FiPlus, FiMinus, FiTrash2, FiAlertCircle, FiCheck, FiFilter, FiStar
} from 'react-icons/fi';

const CustomerDashboard = () => {
  const location = useLocation();
  const isKhataView = location.pathname.includes('/khata');

  // Storefront states
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState(['All']);
  const [productsLoading, setProductsLoading] = useState(true);
  const [sortBy, setSortBy] = useState('name'); // 'name', 'price-low', 'price-high'

  // Cart states
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Khata ledger states
  const [khataProfile, setKhataProfile] = useState(null);
  const [khataLoading, setKhataLoading] = useState(true);
  const [khataLocked, setKhataLocked] = useState(false);
  const [lockedBalance, setLockedBalance] = useState(0.00);

  // General UI state
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const fetchProducts = async () => {
    setProductsLoading(true);
    try {
      const res = await api.get('/products/');
      setProducts(res.data);
      
      // Extract unique categories
      const cats = ['All', ...new Set(res.data.map(p => p.category).filter(Boolean))];
      setCategories(cats);
    } catch (err) {
      console.error('Error fetching products:', err);
      showToast('Failed to fetch catalog products.', 'error');
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchKhataLedger = async () => {
    setKhataLoading(true);
    setKhataLocked(false);
    try {
      const res = await api.get('/khata/my-ledger/');
      setKhataProfile(res.data);
      if (res.data) {
        setKhataLocked(!res.data.is_accessible_by_customer);
        setLockedBalance(res.data.current_balance);
      }
    } catch (err) {
      console.error('Error fetching khata:', err);
      if (err.response && err.response.status === 403) {
        setKhataLocked(true);
        if (err.response.data && err.response.data.current_balance !== undefined) {
          setLockedBalance(err.response.data.current_balance);
        }
      }
    } finally {
      setKhataLoading(false);
    }
  };

  // Load Storefront Products & Khata status on mount
  useEffect(() => {
    fetchProducts();
    fetchKhataLedger();
  }, []);

  // Sync profile details if changing tabs
  useEffect(() => {
    fetchKhataLedger();
    if (!isKhataView) {
      fetchProducts();
    }
  }, [isKhataView]);

  // Handle Cart Operations
  const addToCart = (product) => {
    if (product.stock_quantity <= 0) {
      showToast('Product is currently out of stock.', 'error');
      return;
    }
    
    setCart((prevCart) => {
      const existing = prevCart.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) {
          showToast(`Cannot add more. Only ${product.stock_quantity} units available.`, 'error');
          return prevCart;
        }
        return prevCart.map(item => 
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      showToast(`${product.name} added to cart.`);
      return [...prevCart, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId, amount) => {
    setCart((prevCart) => {
      const item = prevCart.find(i => i.product.id === productId);
      if (!item) return prevCart;

      const newQty = item.quantity + amount;
      if (newQty <= 0) {
        return prevCart.filter(i => i.product.id !== productId);
      }

      if (newQty > item.product.stock_quantity) {
        showToast(`Only ${item.product.stock_quantity} units available in stock.`, 'error');
        return prevCart;
      }

      return prevCart.map(i => 
        i.product.id === productId ? { ...i, quantity: newQty } : i
      );
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(i => i.product.id !== productId));
    showToast('Item removed from cart.');
  };

  // Perform checkout on shop credit ledger
  const handleCheckout = async () => {
    if (khataLocked) {
      showToast('Checkout disabled. Your Khata ledger is locked by the admin.', 'error');
      return;
    }

    if (cart.length === 0) {
      showToast('Your shopping cart is empty.', 'error');
      return;
    }

    setCheckoutLoading(true);
    try {
      const checkoutItems = cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity
      }));

      const res = await api.post('/checkout/', { items: checkoutItems });
      
      // Update Khata status
      showToast(`Success! Charged ₹${getCartTotal().toFixed(2)} to your Khata ledger.`, 'success');
      setCart([]);
      setIsCartOpen(false);
      
      // Refresh data
      fetchProducts();
      fetchKhataLedger();
    } catch (err) {
      console.error('Checkout error:', err);
      const errMsg = err.response?.data?.detail || 'An error occurred during checkout.';
      showToast(errMsg, 'error');
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Calculations
  const getCartCount = () => cart.reduce((total, item) => total + item.quantity, 0);
  const getCartSubtotal = () => cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  
  // Blinkit/Zepto-style discounts (e.g. 5% off items as mock savings, or actual computed savings)
  const getCartSavings = () => {
    const subtotal = getCartSubtotal();
    return subtotal * 0.05; // 5% discount
  };

  const getDeliveryFee = () => {
    const subtotal = getCartSubtotal();
    if (subtotal === 0 || subtotal >= 200) return 0;
    return 15; // 15 Rupees delivery fee for small orders
  };

  const getCartTotal = () => {
    return getCartSubtotal() - getCartSavings() + getDeliveryFee();
  };

  // Sort and Filter Products
  const sortedProducts = [...products].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'price-low') return parseFloat(a.price) - parseFloat(b.price);
    if (sortBy === 'price-high') return parseFloat(b.price) - parseFloat(a.price);
    return 0;
  });

  const filteredProducts = sortedProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto bg-slate-50/50 text-[#111827] flex flex-col justify-start relative text-left">
      
      {/* Toast Alert Box */}
      <AnimatePresence>
        {toast.show && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-55 flex items-center space-x-2 px-5 py-3 rounded-2xl shadow-premium-lg border font-medium text-xs sm:text-sm ${
              toast.type === 'error' 
                ? 'bg-rose-50 border-rose-200 text-rose-600' 
                : 'bg-emerald-50 border-emerald-250 text-emerald-600'
            }`}
          >
            {toast.type === 'error' ? <FiAlertCircle className="w-5 h-5" /> : <FiCheck className="w-5 h-5" />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Sticky Cart Indicator (Visible when items in cart) */}
      {getCartCount() > 0 && !isCartOpen && (
        <motion.button
          layoutId="cart-floating"
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-primary hover:bg-primary-hover text-white px-5 py-3 rounded-2xl flex items-center space-x-3 shadow-lg shadow-emerald-500/20 cursor-pointer font-bold text-sm tracking-wide"
        >
          <div className="relative">
            <FiShoppingCart className="w-5 h-5" />
            <span className="absolute -top-2.5 -right-2.5 bg-accent text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] border border-white font-extrabold animate-bounce">
              {getCartCount()}
            </span>
          </div>
          <span>View Cart • ₹{getCartTotal().toFixed(2)}</span>
        </motion.button>
      )}

      {/* Cart Slider Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-slate-900 z-50"
            />
            {/* Drawer */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white shadow-premium-lg z-50 flex flex-col"
            >
              {/* Cart Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FiShoppingCart className="w-5 h-5 text-primary" />
                  <h3 className="font-poppins font-extrabold text-base text-secondary">My Shopping Cart</h3>
                  <span className="bg-emerald-50 text-primary px-2 py-0.5 rounded-md text-[10px] font-bold">
                    {getCartCount()} Items
                  </span>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 hover:bg-slate-50 text-slate-400 hover:text-secondary rounded-full transition-colors cursor-pointer border border-transparent hover:border-slate-100"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              {/* Cart Items List */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {cart.length > 0 ? (
                  cart.map((item) => (
                    <div key={item.product.id} className="flex items-center space-x-3.5 bg-slate-50/50 border border-slate-100 p-3 rounded-2xl relative hover:border-slate-200/50 transition-colors">
                      <div className="w-14 h-14 bg-white border border-slate-100 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {item.product.image ? (
                          <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                        ) : (
                          <FiShoppingBag className="w-6 h-6 text-slate-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs sm:text-sm text-secondary truncate">{item.product.name}</h4>
                        <p className="text-[10px] text-text-secondary mt-0.5">{item.product.category || 'General'}</p>
                        <p className="font-extrabold text-xs text-secondary mt-1.5">₹{item.product.price} <span className="font-normal text-[10px] text-[#6B7280]">/ unit</span></p>
                      </div>
                      {/* Controls */}
                      <div className="flex flex-col items-center justify-between h-full space-y-2">
                        <button 
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-slate-400 hover:text-rose-500 p-1 rounded-md transition-colors"
                          title="Remove item"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                        <div className="flex items-center space-x-1 bg-white border border-slate-200/80 rounded-xl px-1 py-0.5">
                          <button 
                            onClick={() => updateQuantity(item.product.id, -1)}
                            className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer"
                          >
                            <FiMinus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-bold w-4 text-center text-secondary">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.product.id, 1)}
                            className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer"
                          >
                            <FiPlus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center space-y-3.5 text-center py-20">
                    <div className="bg-slate-50 p-4 rounded-full text-slate-300">
                      <FiShoppingBag className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-secondary">Your cart is empty</h4>
                      <p className="text-xs text-text-secondary mt-1 max-w-[220px]">Add fresh groceries from catalog to checkout on credit.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Cart Footer Summaries */}
              {cart.length > 0 && (
                <div className="p-5 border-t border-slate-100 bg-[#F8FAFC]/50 space-y-4">
                  <div className="space-y-2.5 text-xs text-text-secondary">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="text-secondary font-semibold">₹{getCartSubtotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-accent font-medium">
                      <span>Promo Savings (5% OFF)</span>
                      <span>-₹{getCartSavings().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery Fees</span>
                      <span className="text-secondary font-semibold">
                        {getDeliveryFee() === 0 ? <span className="text-primary font-bold">FREE</span> : `₹${getDeliveryFee()}`}
                      </span>
                    </div>
                    {getDeliveryFee() > 0 && (
                      <p className="text-[10px] text-accent text-right">Add ₹{(200 - getCartSubtotal()).toFixed(2)} more for FREE delivery!</p>
                    )}
                    <div className="border-t border-slate-150/60 pt-2.5 flex justify-between text-sm text-secondary font-extrabold">
                      <span>Outstanding Balance Total</span>
                      <span className="text-lg text-primary">₹{getCartTotal().toFixed(2)}</span>
                    </div>
                  </div>

                  {khataLocked ? (
                    <div className="bg-rose-50 border border-rose-150 p-3 rounded-2xl flex items-start space-x-2 text-rose-700 text-xs">
                      <FiLock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Checkout Disabled</span>
                        <p className="mt-0.5 text-rose-600/90">Your credit account ledger is locked by Shivam. Please settle outstanding balances to resume.</p>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleCheckout}
                      disabled={checkoutLoading || khataLocked}
                      className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center space-x-2 shadow-md shadow-emerald-500/15 cursor-pointer transition-all active:scale-[0.99]"
                    >
                      {checkoutLoading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <FiLock className="w-4 h-4" />
                          <span>Place Credit Checkout Order</span>
                        </>
                      )}
                    </button>
                  )}
                  <p className="text-[9.5px] text-[#6B7280] text-center leading-normal">Checked out orders will instantly reduce stock levels and log as CREDIT in your personal shop ledger.</p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Layout */}

      {/* Store Front View */}
      {!isKhataView && (
        <div className="space-y-6">
          
          {/* Top Banner / Promotions Slider (Instamart/Blinkit feel) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl p-6 text-white relative overflow-hidden shadow-premium flex flex-col justify-between min-h-[160px] group">
              <div className="absolute right-[-20px] bottom-[-20px] w-36 h-36 rounded-full bg-white/10 blur-xl group-hover:scale-110 transition-transform"></div>
              <div className="space-y-1 z-10 max-w-sm">
                <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">Flash Deal</span>
                <h3 className="text-xl sm:text-2xl font-poppins font-extrabold leading-tight">Instant Groceries on Shop Credit</h3>
                <p className="text-xs text-white/90">Zero immediate payments. Settle outstanding accounts monthly.</p>
              </div>
              <div className="mt-4 z-10">
                <span className="bg-white text-emerald-600 px-4 py-2 rounded-xl text-xs font-bold shadow-md cursor-pointer block w-max">Browse Catalog</span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-400 to-amber-500 rounded-3xl p-6 text-white relative overflow-hidden shadow-premium flex flex-col justify-between min-h-[160px] group">
              <div className="absolute right-[-20px] bottom-[-20px] w-36 h-36 rounded-full bg-white/10 blur-xl group-hover:scale-110 transition-transform"></div>
              <div className="space-y-1 z-10 max-w-sm">
                <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">Free Delivery</span>
                <h3 className="text-xl sm:text-2xl font-poppins font-extrabold leading-tight">Superfast Home Delivery</h3>
                <p className="text-xs text-white/90">Free home drop-off for orders above ₹200. Delivered within 10-15 mins.</p>
              </div>
              <div className="mt-4 z-10">
                <span className="bg-white text-orange-600 px-4 py-2 rounded-xl text-xs font-bold shadow-md block w-max">Free above ₹200</span>
              </div>
            </div>
          </div>

          {/* Header Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-poppins font-extrabold text-secondary">Browse Grocery Items</h2>
              <p className="text-[#6B7280] text-xs sm:text-sm">Select items, modify quantities, and pay seamlessly using your digital ledger.</p>
            </div>
            
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row items-stretch gap-3">
              {/* Search */}
              <div className="relative flex-1 sm:w-64">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <FiSearch className="w-4.5 h-4.5" />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full bg-white border border-slate-200 focus:border-primary rounded-xl py-2 pl-9 pr-4 text-xs sm:text-sm text-text-primary placeholder-slate-400 outline-none transition-all focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              {/* Sort By Price / Name */}
              <div className="relative flex items-center bg-white border border-slate-200 rounded-xl px-2.5 py-2">
                <FiFilter className="w-4 h-4 text-slate-400 mr-1.5" />
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent text-xs text-secondary font-semibold outline-none cursor-pointer"
                >
                  <option value="name">Sort: Name (A-Z)</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border cursor-pointer transition-all ${
                  selectedCategory === cat
                    ? 'bg-primary text-white border-primary shadow-sm shadow-emerald-500/10'
                    : 'bg-white text-text-secondary hover:text-secondary border-slate-200/60 hover:border-slate-350'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product Cards Grid */}
          {productsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white border border-slate-100 rounded-3xl p-4 h-[340px] animate-pulse space-y-4 shadow-sm">
                  <div className="w-full h-40 bg-slate-100 rounded-2xl"></div>
                  <div className="h-4 bg-slate-100 rounded w-2/3"></div>
                  <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                  <div className="h-8 bg-slate-100 rounded w-1/3 mt-6"></div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((p) => {
                const cartItem = cart.find(item => item.product.id === p.id);
                // Compute mockup discount details
                const hasDiscount = p.id % 3 === 0;
                const discountText = p.id % 6 === 0 ? "15% OFF" : "10% OFF";
                const rating = (4.0 + (p.id % 9) * 0.1).toFixed(1);
                const reviewCount = (p.id * 19) % 80 + 12;

                return (
                  <div key={p.id} className="bg-white border border-slate-200/50 hover:border-slate-300 rounded-3xl overflow-hidden transition-all duration-200 group flex flex-col h-full shadow-sm hover:shadow-premium">
                    
                    {/* Image Area */}
                    <div className="h-44 overflow-hidden relative bg-slate-50 flex items-center justify-center border-b border-slate-100">
                      {p.image ? (
                        <img 
                          src={p.image} 
                          alt={p.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80';
                          }}
                        />
                      ) : (
                        <FiShoppingBag className="w-10 h-10 text-slate-300" />
                      )}
                      
                      {/* Category Badge */}
                      <span className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm text-[#0F172A] border border-slate-200 text-[9px] font-extrabold tracking-wider px-2 py-0.5 rounded-md uppercase shadow-sm">
                        {p.category || 'General'}
                      </span>

                      {/* Mockup Discount Accent Badge */}
                      {hasDiscount && (
                        <span className="absolute bottom-3 left-3 bg-accent text-white text-[9px] font-extrabold tracking-wider px-2 py-0.5 rounded-md uppercase shadow-sm">
                          {discountText}
                        </span>
                      )}
                    </div>

                    {/* Content Details */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        {/* Rating block */}
                        <div className="flex items-center space-x-1 mb-1.5">
                          <span className="bg-amber-50 text-amber-600 text-[9.5px] font-bold px-1.5 py-0.5 rounded-md flex items-center space-x-0.5 border border-amber-200/40">
                            <FiStar className="w-3 h-3 fill-current text-amber-500" />
                            <span>{rating}</span>
                          </span>
                          <span className="text-[10px] text-text-secondary font-medium">({reviewCount} reviews)</span>
                        </div>

                        <h3 className="font-bold text-secondary text-sm sm:text-base tracking-tight leading-tight group-hover:text-primary transition-colors truncate">
                          {p.name}
                        </h3>
                        <p className="text-[10.5px] text-text-secondary mt-1 font-light leading-relaxed line-clamp-2">
                          {p.description || 'No description provided.'}
                        </p>
                      </div>

                      {/* Bottom row actions */}
                      <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between mt-auto">
                        <div>
                          <p className="text-[9.5px] text-[#6B7280]">Price unit</p>
                          <span className="text-base font-extrabold text-secondary">₹{p.price}</span>
                        </div>

                        <div className="text-right">
                          {p.stock_quantity <= 0 ? (
                            <span className="inline-block bg-rose-50 text-rose-500 border border-rose-100 text-[9px] font-extrabold px-3 py-1.5 rounded-xl uppercase tracking-wider">
                              Sold Out
                            </span>
                          ) : cartItem ? (
                            <div className="flex items-center space-x-1.5 bg-emerald-50 text-primary border border-primary/20 rounded-xl px-1.5 py-1">
                              <button 
                                onClick={() => updateQuantity(p.id, -1)}
                                className="p-1 hover:bg-white rounded text-primary cursor-pointer transition-colors"
                              >
                                <FiMinus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-bold w-4 text-center">{cartItem.quantity}</span>
                              <button 
                                onClick={() => updateQuantity(p.id, 1)}
                                className="p-1 hover:bg-white rounded text-primary cursor-pointer transition-colors"
                              >
                                <FiPlus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(p)}
                              className="bg-primary hover:bg-primary-hover text-white px-4 py-1.5 rounded-xl text-xs font-extrabold shadow-sm hover:shadow-md cursor-pointer transition-all flex items-center space-x-1"
                            >
                              <FiPlus className="w-3 h-3" />
                              <span>ADD</span>
                            </button>
                          )}
                          <p className="text-[9px] text-[#6B7280] mt-1 text-right font-medium">Stock: {p.stock_quantity}</p>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl py-16 px-4 flex flex-col items-center justify-center space-y-4 text-center shadow-sm">
              <div className="bg-slate-100 p-4 rounded-full text-slate-400">
                <FiInbox className="w-8 h-8" />
              </div>
              <h3 className="text-secondary font-bold text-lg">No products found</h3>
              <p className="text-text-secondary text-sm max-w-sm">We couldn't find any products matching your active search or filters.</p>
            </div>
          )}
        </div>
      )}

      {/* Digital Khata Ledger View */}
      {isKhataView && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-poppins font-extrabold text-secondary">Digital Khata Ledger Book</h2>
            <p className="text-[#6B7280] text-xs sm:text-sm">Track your balance liabilities, outstanding credit orders, and official payment logs.</p>
          </div>

          {khataLoading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white border border-slate-100 rounded-3xl p-6 h-28 animate-pulse shadow-sm"></div>
                ))}
              </div>
              <div className="bg-white border border-slate-100 rounded-3xl p-6 h-60 animate-pulse shadow-sm"></div>
            </div>
          ) : khataLocked ? (
            /* Locked State Warning Block */
            <div className="max-w-xl mx-auto bg-white border border-rose-200 rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-premium-lg mt-6">
              <div className="mx-auto w-14 h-14 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center border border-rose-100 shadow-sm">
                <FiLock className="w-6 h-6" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-poppins font-extrabold text-secondary tracking-tight">Personal Khata Locked</h3>
                <p className="text-text-secondary text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
                  Your shop credit access has been temporarily suspended by Shivam. Please contact the administrator to settle unpaid debts and unlock your account.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 max-w-sm mx-auto">
                <p className="text-[10px] text-text-secondary uppercase tracking-widest font-bold mb-1">Your Ledger Balance Liability</p>
                <p className="text-3xl font-poppins font-extrabold text-rose-600">₹{parseFloat(lockedBalance).toFixed(2)}</p>
                <p className="text-[9.5px] text-[#6B7280] mt-2">Payments must be cleared directly at the checkout counter.</p>
              </div>

              <button
                onClick={fetchKhataLedger}
                className="bg-[#F8FAFC] hover:bg-[#F1F5F9] text-secondary border border-slate-200 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Refresh Account Status
              </button>
            </div>
          ) : !khataProfile ? (
            <div className="bg-white border border-slate-200 rounded-3xl py-16 px-4 flex flex-col items-center justify-center space-y-4 text-center shadow-sm">
              <div className="bg-slate-100 p-4 rounded-full text-slate-400">
                <FiBookOpen className="w-8 h-8" />
              </div>
              <h3 className="text-secondary font-bold text-lg">Unable to load ledger</h3>
              <p className="text-text-secondary text-sm max-w-sm">We couldn't retrieve your Khata ledger profile at this time. Please check your connection and retry.</p>
              <button 
                onClick={fetchKhataLedger}
                className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Retry Loading
              </button>
            </div>
          ) : (
            /* Unlocked State Ledger Book */
            <div className="space-y-6">
              
              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                
                {/* Balance liability Card */}
                <div className="bg-white border border-slate-200/60 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-premium transition-shadow">
                  <div className="absolute top-[-20%] right-[-10%] w-24 h-24 rounded-full bg-rose-500/5 blur-xl"></div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Remaining Debt Liability</span>
                    <span className="bg-rose-50 text-rose-500 p-2 rounded-xl border border-rose-100">
                      <FiLock className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="mt-4">
                    <span className="text-3xl font-poppins font-extrabold text-rose-600">₹{parseFloat(khataProfile.current_balance).toFixed(2)}</span>
                    <p className="text-[10px] text-text-secondary mt-1 font-light leading-none">Unpaid outstanding store credit balance</p>
                  </div>
                </div>

                {/* Total Credit Card */}
                <div className="bg-white border border-slate-200/60 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-premium transition-shadow">
                  <div className="absolute top-[-20%] right-[-10%] w-24 h-24 rounded-full bg-accent/5 blur-xl"></div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Total Credit Purchases</span>
                    <span className="bg-orange-50 text-accent p-2 rounded-xl border border-orange-100">
                      <FiArrowUpRight className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="mt-4">
                    <span className="text-3xl font-poppins font-extrabold text-secondary">₹{parseFloat(khataProfile.total_credit).toFixed(2)}</span>
                    <p className="text-[10px] text-text-secondary mt-1 font-light leading-none">Sum of all grocery credits issued</p>
                  </div>
                </div>

                {/* Total Paid Card */}
                <div className="bg-white border border-slate-200/60 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-premium transition-shadow">
                  <div className="absolute top-[-20%] right-[-10%] w-24 h-24 rounded-full bg-emerald-500/5 blur-xl"></div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Total Ledger Cleared</span>
                    <span className="bg-emerald-50 text-primary p-2 rounded-xl border border-emerald-100">
                      <FiArrowDownLeft className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="mt-4">
                    <span className="text-3xl font-poppins font-extrabold text-primary">₹{parseFloat(khataProfile.total_paid).toFixed(2)}</span>
                    <p className="text-[10px] text-text-secondary mt-1 font-light leading-none">Total payments settled by cash or UPI</p>
                  </div>
                </div>

              </div>

              {/* Transactions Ledger Table */}
              <div className="bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h3 className="font-bold text-secondary text-sm sm:text-base">Ledger Statement Book</h3>
                  <div className="inline-flex items-center space-x-1.5 text-xs text-primary bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 font-bold">
                    <FiUnlock className="w-3.5 h-3.5" />
                    <span>Unlocked Ledger Access</span>
                  </div>
                </div>

                {khataProfile.transactions && khataProfile.transactions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-150 text-[10px] uppercase font-bold tracking-wider text-[#6B7280] bg-slate-50/70">
                          <th className="py-4 px-6">Date</th>
                          <th className="py-4 px-6">Description</th>
                          <th className="py-4 px-6">Product Details</th>
                          <th className="py-4 px-6">Type</th>
                          <th className="py-4 px-6 text-right">Amount</th>
                          <th className="py-4 px-6 text-right">Remaining Balance liability</th>
                        </tr>
                      </thead>
                      <tbody>
                        {khataProfile.transactions.map((tx) => (
                          <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors text-xs sm:text-sm">
                            <td className="py-4 px-6 font-medium text-text-secondary">
                              <span className="flex items-center space-x-2">
                                <FiCalendar className="text-slate-400 w-4 h-4" />
                                <span>{new Date(tx.created_at).toLocaleDateString()}</span>
                              </span>
                            </td>
                            <td className="py-4 px-6 text-secondary font-semibold">{tx.description || 'N/A'}</td>
                            <td className="py-4 px-6">
                              {tx.product_name ? (
                                <span className="bg-slate-100 text-secondary px-2.5 py-1 rounded-md text-[10px] font-bold border border-slate-200">
                                  {tx.product_name} x {tx.quantity || 1}
                                </span>
                              ) : (
                                <span className="text-[#6B7280] italic text-xs">N/A</span>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9.5px] font-extrabold uppercase tracking-wider ${
                                tx.transaction_type === 'CREDIT' 
                                  ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                                  : 'bg-emerald-50 text-primary border border-emerald-100'
                              }`}>
                                {tx.transaction_type}
                              </span>
                            </td>
                            <td className={`py-4 px-6 font-extrabold text-right text-sm ${
                              tx.transaction_type === 'CREDIT' ? 'text-rose-600' : 'text-primary'
                            }`}>
                              {tx.transaction_type === 'CREDIT' ? '+' : '-'}₹{parseFloat(tx.amount).toFixed(2)}
                            </td>
                            <td className="py-4 px-6 font-extrabold text-secondary text-right text-sm">
                              ₹{parseFloat(tx.remaining_balance_at_snapshot).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-16 flex flex-col items-center justify-center space-y-3.5 text-center">
                    <div className="bg-slate-50 p-4 rounded-full text-slate-400">
                      <FiBookOpen className="w-7 h-7" />
                    </div>
                    <p className="text-xs sm:text-sm text-text-secondary">No transactions recorded yet in your profile.</p>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default CustomerDashboard;
