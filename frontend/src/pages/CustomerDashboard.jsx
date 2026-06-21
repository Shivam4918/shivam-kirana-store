import { useState, useEffect, useContext, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import { CartContext } from '../context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import BarcodeScanner from '../components/BarcodeScanner';
import { 
  FiSearch, FiLock, FiUnlock, FiCalendar, FiBookOpen, 
  FiArrowUpRight, FiArrowDownLeft, FiShoppingBag, FiInbox,
  FiShoppingCart, FiX, FiPlus, FiMinus, FiTrash2, FiAlertCircle, FiCheck, FiFilter, 
  FiStar, FiZap, FiRefreshCw, FiSend, FiHeart, FiGift, FiClock, FiHome, FiUser, 
  FiHelpCircle, FiLayers, FiAlertTriangle, FiInfo
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';

const cleanPhoneForWhatsApp = (phone) => {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }
  return cleaned;
};

const CustomerDashboard = () => {
  const location = useLocation();
  const isKhataView = location.pathname.includes('/khata');

  // Consume Global Cart
  const { 
    cart, 
    addToCart, 
    updateQuantity, 
    removeFromCart, 
    clearCart, 
    cartCount, 
    cartSubtotal, 
    cartSavings, 
    deliveryFee, 
    cartTotal, 
    redeemPoints, 
    setRedeemPoints, 
    isCartOpen, 
    setIsCartOpen 
  } = useContext(CartContext);

  // Storefront catalog states
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState(['All']);
  const [productsLoading, setProductsLoading] = useState(true);
  const [sortBy, setSortBy] = useState('name');

  // Khata ledger states
  const [khataProfile, setKhataProfile] = useState(null);
  const [khataLoading, setKhataLoading] = useState(true);
  const [khataLocked, setKhataLocked] = useState(false);
  const [lockedBalance, setLockedBalance] = useState(0.00);
  const [ledgerCurrentPage, setLedgerCurrentPage] = useState(1);
  const ledgerPageSize = 5;

  // Upgraded Feature States
  const [banners, setBanners] = useState([]);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [configs, setConfigs] = useState({});
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  
  // Search History & Dropdown States
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('recentSearches') || '[]');
    } catch {
      return [];
    }
  });

  // Sliders data
  const [buyAgainProducts, setBuyAgainProducts] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  // Wishlist States
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const [showWishlistOnly, setShowWishlistOnly] = useState(false);

  // Product Quick View States
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newReviewText, setNewReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Mobile Bottom Navigation States
  const [mobileTab, setMobileTab] = useState(isKhataView ? 'khata' : 'home');

  // General UI states
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  // Payment states
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [settleAmount, setSettleAmount] = useState('');
  const [settling, setSettling] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [requestingStatement, setRequestingStatement] = useState(false);

  const searchInputRef = useRef(null);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Toast notifier helper
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  // 1. Fetch catalog products
  const fetchProducts = async () => {
    setProductsLoading(true);
    try {
      const res = await api.get('/products/');
      setProducts(res.data);
      const cats = ['All', ...new Set(res.data.map(p => p.category).filter(Boolean))];
      setCategories(cats);
    } catch (err) {
      console.error('Error fetching products:', err);
      showToast('Failed to fetch catalog products.', 'error');
    } finally {
      setProductsLoading(false);
    }
  };

  // 2. Fetch Khata status
  const fetchKhataLedger = async () => {
    setKhataLoading(true);
    setKhataLocked(false);
    try {
      const res = await api.get('/khata/my-ledger/');
      setKhataProfile(res.data);
      setLedgerCurrentPage(1);
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

  // 3. Fetch Promotional Banners
  const fetchBanners = async () => {
    try {
      const res = await api.get('/banners/');
      setBanners(res.data);
    } catch (err) {
      console.error('Error fetching banners:', err);
    } finally {
      setBannersLoading(false);
    }
  };

  // 4. Fetch Global Store Configurations
  const fetchConfigs = async () => {
    try {
      const res = await api.get('/configs/');
      const cmap = {};
      res.data.forEach(c => {
        cmap[c.key] = c.value;
      });
      setConfigs(cmap);
    } catch (err) {
      console.error('Error fetching configs:', err);
    }
  };

  // 5. Fetch Customer dashboard stats summary
  const fetchSummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await api.get('/customer/summary/');
      setSummary(res.data);
    } catch (err) {
      console.error('Error fetching summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  // 6. Fetch user's wishlist IDs
  const fetchWishlist = async () => {
    try {
      const res = await api.get('/wishlist/');
      const ids = new Set(res.data.map(item => item.product.id));
      setWishlistIds(ids);
    } catch (err) {
      console.error('Error fetching wishlist:', err);
    }
  };

  // 7. Fetch row subsections
  const fetchStorefrontRows = async () => {
    try {
      const [baRes, bsRes, trRes, recRes] = await Promise.all([
        api.get('/products/buy-again/'),
        api.get('/products/best-sellers/'),
        api.get('/products/trending/'),
        api.get('/products/recommendations/')
      ]);
      setBuyAgainProducts(baRes.data);
      setBestSellers(bsRes.data);
      setTrendingProducts(trRes.data);
      setRecommendations(recRes.data);
    } catch (err) {
      console.error('Error fetching storefront rows:', err);
    }
  };

  // Sync profile details if changing tabs
  useEffect(() => {
    fetchProducts();
    fetchKhataLedger();
    fetchBanners();
    fetchConfigs();
    fetchSummary();
    fetchWishlist();
    fetchStorefrontRows();
  }, []);

  // Sync mobile tabs with isKhataView
  useEffect(() => {
    setMobileTab(isKhataView ? 'khata' : 'home');
  }, [isKhataView]);

  // Rotator for banners
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setActiveBannerIndex(prev => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners]);

  // Load reviews on quickViewProduct load
  const fetchReviews = async (productId) => {
    setReviewsLoading(true);
    try {
      const res = await api.get(`/products/${productId}/reviews/`);
      setReviews(res.data);
    } catch (err) {
      console.error('Error loading reviews:', err);
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    if (quickViewProduct) {
      fetchReviews(quickViewProduct.id);
      setNewRating(5);
      setNewReviewText('');
    }
  }, [quickViewProduct]);

  // Toggle wishlist remotely & locally
  const handleToggleWishlist = async (e, productId) => {
    e.stopPropagation();
    try {
      const res = await api.post('/wishlist/toggle/', { product_id: productId });
      setWishlistIds(prev => {
        const next = new Set(prev);
        if (res.data.status === 'added') {
          next.add(productId);
          showToast(`Added to wishlist! ❤️`, 'success');
        } else {
          next.delete(productId);
          showToast(`Removed from wishlist.`, 'success');
        }
        return next;
      });
      fetchWishlist();
    } catch (err) {
      console.error('Error toggling wishlist:', err);
      showToast('Failed to toggle wishlist item.', 'error');
    }
  };

  // Submit Product Review
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!quickViewProduct) return;
    setSubmittingReview(true);
    try {
      await api.post(`/products/${quickViewProduct.id}/reviews/`, {
        rating: newRating,
        review_text: newReviewText
      });
      showToast('Review submitted successfully!', 'success');
      fetchReviews(quickViewProduct.id);
      fetchProducts();
      fetchStorefrontRows();
      setNewReviewText('');
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.detail || 'Failed to submit review.', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  // 1-click buy now
  const handleBuyNow = (product) => {
    const res = addToCart(product);
    if (res.success !== false) {
      setIsCartOpen(true);
      setQuickViewProduct(null);
    } else {
      showToast(res.message, 'error');
    }
  };

  // Handle WhatsApp statement request
  const handleRequestWhatsAppStatement = async () => {
    setRequestingStatement(true);
    try {
      const res = await api.post('/khata/my-ledger/request-whatsapp-statement/');
      showToast(res.data.detail, 'success');
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.detail || 'Failed to request statement on WhatsApp.', 'error');
    } finally {
      setRequestingStatement(false);
    }
  };

  // Handle barcode scanning to cart
  const handleBarcodeScanToCart = async (code) => {
    setShowBarcodeScanner(false);
    try {
      const res = await api.get(`/products/by-barcode/?barcode=${encodeURIComponent(code)}`);
      const product = res.data;
      const addRes = addToCart(product);
      if (addRes.success !== false) {
        showToast(`"${product.name}" added to cart via barcode scan! 🎯`, 'success');
      } else {
        showToast(addRes.message, 'error');
      }
    } catch (err) {
      if (err.response?.status === 404) {
        showToast(`No product found for barcode "${code}"`, 'error');
      } else {
        showToast('Barcode lookup failed. Please try again.', 'error');
      }
    }
  };

  // Payment Link & Webhooks
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const mockLinkId = searchParams.get('mock_payment_link_id');
    const amount = searchParams.get('amount');
    
    if (mockLinkId && amount) {
      const triggerMockPayment = async () => {
        try {
          await api.post('/payments/webhook/', {
            event: 'payment_link.paid',
            payload: {
              payment_link: {
                entity: {
                  id: mockLinkId,
                  payments: [{ payment_id: 'pay_mock_' + Math.floor(Math.random() * 1000000) }]
                }
              }
            }
          }, {
            headers: {
              'X-Razorpay-Signature': 'test_bypass_sig'
            }
          });
          
          showToast(`Mock payment of ₹${amount} succeeded! 🎯`, 'success');
          window.history.replaceState({}, document.title, window.location.pathname);
          fetchKhataLedger();
          fetchSummary();
        } catch (err) {
          console.error('Mock payment webhook execution failed:', err);
          showToast('Failed to complete mock payment.', 'error');
        }
      };
      
      triggerMockPayment();
    }
  }, [location.search]);

  const handleCreatePaymentLink = async (e) => {
    e.preventDefault();
    if (!settleAmount || parseFloat(settleAmount) <= 0) {
      showToast('Please enter a valid positive amount.', 'error');
      return;
    }
    if (parseFloat(settleAmount) > khataProfile.current_balance) {
      showToast('Amount cannot exceed your total debt liability.', 'error');
      return;
    }
    setSettling(true);
    try {
      const res = await api.post('/payments/create-link/', { amount: parseFloat(settleAmount) });
      setPaymentRequest(res.data);
      showToast('Payment link generated! ⚡', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.detail || 'Failed to create payment link.', 'error');
    } finally {
      setSettling(false);
    }
  };

  const handleCheckPaymentStatus = async () => {
    if (!paymentRequest) return;
    setCheckingStatus(true);
    try {
      const res = await api.get(`/payments/${paymentRequest.id}/status/`);
      setPaymentRequest(res.data);
      if (res.data.status === 'PAID') {
        showToast('Payment confirmed! Ledger updated. 🎯', 'success');
        setTimeout(() => {
          setShowSettlementModal(false);
          setPaymentRequest(null);
          setSettleAmount('');
          fetchKhataLedger();
          fetchSummary();
        }, 1500);
      } else {
        showToast('Payment status is still pending.', 'info');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to check status.', 'error');
    } finally {
      setCheckingStatus(false);
    }
  };

  // Perform checkout on credit ledger
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

      await api.post('/checkout/', { 
        items: checkoutItems,
        redeem_points: redeemPoints 
      });
      
      showToast(`Success! Charged ₹${cartTotal.toFixed(2)} to your Khata ledger.`, 'success');
      clearCart();
      setIsCartOpen(false);
      
      fetchProducts();
      fetchKhataLedger();
      fetchSummary();
      fetchStorefrontRows();
    } catch (err) {
      console.error('Checkout error:', err);
      const errMsg = err.response?.data?.detail || 'An error occurred during checkout.';
      showToast(errMsg, 'error');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleDownloadInvoice = async (invoiceId, invoiceNumber) => {
    try {
      const res = await api.get(`/invoices/${invoiceId}/pdf/`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('Invoice downloaded successfully!');
    } catch (err) {
      console.error(err);
      showToast('Failed to download invoice PDF.', 'error');
    }
  };

  // Advanced Search filtering and highlight
  const getFuzzyMatches = (items) => {
    if (!debouncedQuery) return items;
    const query = debouncedQuery.toLowerCase();
    return items.filter(item => {
      const nameMatch = item.name.toLowerCase().includes(query);
      const categoryMatch = item.category && item.category.toLowerCase().includes(query);
      const hsnMatch = item.hsn_code && item.hsn_code.toLowerCase().includes(query);
      const barcodeMatch = item.barcode && item.barcode.toLowerCase().includes(query);
      return nameMatch || categoryMatch || hsnMatch || barcodeMatch;
    });
  };

  const highlightText = (text, search) => {
    if (!text) return '';
    if (!search) return text;
    const parts = text.split(new RegExp(`(${search})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === search.toLowerCase() 
            ? <span key={i} className="bg-amber-100 text-amber-950 font-bold px-0.5 rounded">{part}</span>
            : part
        )}
      </span>
    );
  };

  const handleSearchSelect = (query) => {
    setSearchQuery(query);
    setShowSuggestions(false);
    // Add to recent searches
    setRecentSearches(prev => {
      const filtered = prev.filter(q => q.toLowerCase() !== query.toLowerCase());
      const updated = [query, ...filtered].slice(0, 5);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
      return updated;
    });
  };

  const clearSearchHistory = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  // Stock status calculations
  const getStockStatus = (qty) => {
    if (qty > 10) return { text: 'In Stock', color: 'text-emerald-600 bg-emerald-50 border-emerald-100', dot: 'bg-emerald-500' };
    if (qty > 0) return { text: 'Low Stock', color: 'text-amber-600 bg-amber-50 border-amber-200/50', dot: 'bg-amber-500' };
    return { text: 'Out of Stock', color: 'text-rose-600 bg-rose-50 border-rose-150', dot: 'bg-rose-500' };
  };

  // Sorted and filtered list
  const sortedProducts = [...products].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'price-low') return parseFloat(a.price) - parseFloat(b.price);
    if (sortBy === 'price-high') return parseFloat(b.price) - parseFloat(a.price);
    return 0;
  });

  const searchedProducts = getFuzzyMatches(sortedProducts);
  const filteredProducts = searchedProducts.filter(p => {
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesWishlist = !showWishlistOnly || wishlistIds.has(p.id);
    return matchesCategory && matchesWishlist;
  });

  // Ledger Statement Book pagination calculations
  const sortedTransactions = [...(khataProfile?.transactions || [])].sort((a, b) => {
    const dateDiff = new Date(b.created_at) - new Date(a.created_at);
    if (dateDiff !== 0) return dateDiff;
    return b.id - a.id;
  });
  const totalLedgerPages = Math.ceil(sortedTransactions.length / ledgerPageSize) || 1;
  const paginatedTransactions = sortedTransactions.slice(
    (ledgerCurrentPage - 1) * ledgerPageSize,
    ledgerCurrentPage * ledgerPageSize
  );

  // Delivery details helper
  const getDeliveryEstimate = () => {
    return configs.DELIVERY_ESTIMATE || '10-15 Minutes';
  };

  // Cart calculations for Drawer
  const getCartTaxDetails = () => {
    let subtotal = 0;
    let cgst = 0;
    let sgst = 0;
    cart.forEach(item => {
      const qty = item.quantity;
      const rate = parseFloat(item.product.gst_rate || 0.00);
      const totalInclusive = item.product.price * qty;
      const base = totalInclusive / (1 + rate / 100);
      const tax = totalInclusive - base;
      subtotal += base;
      cgst += tax / 2;
      sgst += tax / 2;
    });
    return { subtotal, cgst, sgst };
  };

  // Default banners list if empty
  const defaultBanners = [
    {
      id: 'd1',
      title: 'Superfast Delivery on Shop Credit',
      description: 'Zero immediate payments required. Purchase and pay monthly through UPI or Cash.',
      bgGradient: 'from-emerald-500 to-teal-500',
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
      tag: 'Khata Exclusive'
    },
    {
      id: 'd2',
      title: 'Shivam Loyalty Rewards Program',
      description: `Earn reward points on every transaction! Convert points directly to credit discount.`,
      bgGradient: 'from-amber-500 to-orange-500',
      image: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?auto=format&fit=crop&w=600&q=80',
      tag: 'Earn points'
    },
    {
      id: 'd3',
      title: 'UPI & Card Settle Available',
      description: 'Generate Razorpay payment QR codes to clear outstanding balances instantly.',
      bgGradient: 'from-blue-500 to-indigo-500',
      image: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&q=80',
      tag: '100% Secured'
    }
  ];

  const activeBanners = banners.length > 0 ? banners : defaultBanners;

  const renderCartButton = (p) => {
    const cartItem = cart.find(item => item.product.id === p.id);
    if (p.stock_quantity <= 0) {
      return (
        <span className="inline-block bg-rose-50 text-rose-500 border border-rose-100 text-[9px] font-extrabold px-3 py-1.5 rounded-xl uppercase tracking-wider">
          Sold Out
        </span>
      );
    }
    if (cartItem) {
      return (
        <div className="flex items-center space-x-1.5 bg-primary text-white rounded-xl px-1.5 py-1">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              const updateRes = updateQuantity(p.id, -1);
              showToast(updateRes.message, updateRes.success ? 'success' : 'error');
            }}
            className="p-1 hover:bg-primary-hover rounded text-white cursor-pointer transition-colors"
          >
            <FiMinus className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-bold w-4 text-center">{cartItem.quantity}</span>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              const updateRes = updateQuantity(p.id, 1);
              showToast(updateRes.message, updateRes.success ? 'success' : 'error');
            }}
            className="p-1 hover:bg-primary-hover rounded text-white cursor-pointer transition-colors"
          >
            <FiPlus className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          const addRes = addToCart(p);
          showToast(addRes.message, addRes.success ? 'success' : 'error');
        }}
        className="border border-primary text-primary hover:bg-emerald-50 px-4 py-1.5 rounded-xl text-xs font-extrabold shadow-sm cursor-pointer transition-all flex items-center space-x-1"
      >
        <FiPlus className="w-3 h-3" />
        <span>ADD</span>
      </button>
    );
  };

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

      {/* Floating Sticky Cart Indicator */}
      {cartCount > 0 && !isCartOpen && (
        <motion.button
          layoutId="cart-floating"
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-primary hover:bg-primary-hover text-white px-5 py-3 rounded-2xl flex items-center space-x-3 shadow-lg shadow-emerald-500/20 cursor-pointer font-bold text-sm tracking-wide"
        >
          <div className="relative">
            <FiShoppingCart className="w-5 h-5" />
            <span className="absolute -top-2.5 -right-2.5 bg-accent text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] border border-white font-extrabold animate-bounce">
              {cartCount}
            </span>
          </div>
          <span>View Cart • ₹{cartTotal.toFixed(2)}</span>
        </motion.button>
      )}

      {/* Cart Drawer Slider */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-slate-900 z-50"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white shadow-premium-lg z-50 flex flex-col"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FiShoppingCart className="w-5 h-5 text-primary" />
                  <h3 className="font-poppins font-extrabold text-base text-secondary">My Shopping Cart</h3>
                  <span className="bg-emerald-50 text-primary px-2 py-0.5 rounded-md text-[10px] font-bold">
                    {cartCount} Items
                  </span>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 hover:bg-slate-50 text-slate-400 hover:text-secondary rounded-full transition-colors cursor-pointer border border-transparent hover:border-slate-100"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

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
                      <div className="flex-1 min-w-0 text-left">
                        <h4 className="font-bold text-xs sm:text-sm text-secondary truncate">{item.product.name}</h4>
                        <p className="text-[10px] text-text-secondary mt-0.5">{item.product.category || 'General'}</p>
                        <p className="font-extrabold text-xs text-secondary mt-1.5">₹{item.product.price} <span className="font-normal text-[10px] text-[#6B7280]">/ unit</span></p>
                      </div>
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

              {/* Cart Footer Summaries with Loyalty redemption option */}
              {cart.length > 0 && (
                <div className="p-5 border-t border-slate-100 bg-[#F8FAFC]/50 space-y-4">
                  
                  {/* Loyalty Point Redemption Option */}
                  {summary && summary.loyalty_points > 0 && (
                    <div className="bg-emerald-50/50 border border-emerald-100/80 p-3.5 rounded-2xl flex items-center justify-between text-left">
                      <div className="flex items-center space-x-2.5">
                        <FiGift className="text-emerald-600 w-5 h-5" />
                        <div>
                          <span className="text-xs font-bold text-secondary block">Redeem Loyalty Points</span>
                          <span className="text-[10px] text-text-secondary">You have {summary.loyalty_points} points (Value: ₹{summary.loyalty_points})</span>
                        </div>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={redeemPoints}
                        onChange={(e) => setRedeemPoints(e.target.checked)}
                        className="w-4 h-4 text-primary focus:ring-primary border-slate-300 rounded cursor-pointer"
                      />
                    </div>
                  )}

                  <div className="space-y-2.5 text-xs text-text-secondary text-left">
                    <div className="flex justify-between">
                      <span>Subtotal (Incl. GST)</span>
                      <span className="text-secondary font-semibold">₹{cartSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 pl-2">
                      <span>Taxable Value</span>
                      <span>₹{getCartTaxDetails().subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 pl-2">
                      <span>CGST (Central Tax)</span>
                      <span>₹{getCartTaxDetails().cgst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 pl-2">
                      <span>SGST (State Tax)</span>
                      <span>₹{getCartTaxDetails().sgst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-accent font-medium">
                      <span>Promo Savings (5% OFF)</span>
                      <span>-₹{cartSavings.toFixed(2)}</span>
                    </div>
                    {redeemPoints && summary && summary.loyalty_points > 0 && (
                      <div className="flex justify-between text-emerald-600 font-bold">
                        <span>Loyalty Discount</span>
                        <span>-₹{Math.min(summary.loyalty_points, cartSubtotal).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Delivery Fees</span>
                      <span className="text-secondary font-semibold">
                        {deliveryFee === 0 ? <span className="text-primary font-bold">FREE</span> : `₹${deliveryFee}`}
                      </span>
                    </div>
                    {deliveryFee > 0 && (
                      <p className="text-[10px] text-accent text-right">Add ₹{(200 - cartSubtotal).toFixed(2)} more for FREE delivery!</p>
                    )}
                    <div className="border-t border-slate-150/60 pt-2.5 flex justify-between text-sm text-secondary font-extrabold">
                      <span>Outstanding Balance Total</span>
                      <span className="text-lg text-primary">₹{cartTotal.toFixed(2)}</span>
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
          
          {/* Stats Deck Banner Summary (Total orders, loyalty reward points, totals) */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200/60 p-4.5 rounded-2xl shadow-sm text-left relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-bold text-[#6B7280] uppercase tracking-wider">Total Orders</span>
                  <span className="bg-blue-50 text-blue-500 p-1.5 rounded-lg"><FiShoppingBag className="w-4 h-4" /></span>
                </div>
                <h4 className="text-xl font-extrabold text-secondary mt-3">{summary.total_orders}</h4>
              </div>
              <div className="bg-white border border-slate-200/60 p-4.5 rounded-2xl shadow-sm text-left relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-bold text-[#6B7280] uppercase tracking-wider">Total Savings</span>
                  <span className="bg-emerald-50 text-emerald-500 p-1.5 rounded-lg"><FiZap className="w-4 h-4" /></span>
                </div>
                <h4 className="text-xl font-extrabold text-primary mt-3">₹{summary.total_savings}</h4>
              </div>
              <div className="bg-white border border-slate-200/60 p-4.5 rounded-2xl shadow-sm text-left relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-bold text-[#6B7280] uppercase tracking-wider">Reward Points</span>
                  <span className="bg-amber-50 text-amber-600 p-1.5 rounded-lg"><FiGift className="w-4 h-4" /></span>
                </div>
                <div>
                  <h4 className="text-xl font-extrabold text-secondary mt-3">{summary.loyalty_points}</h4>
                  <span className="text-[9px] text-text-secondary mt-0.5 block">Points Earned: {summary.points_earned}</span>
                </div>
              </div>
              {khataProfile && (
                <div className="bg-white border border-slate-200/60 p-4.5 rounded-2xl shadow-sm text-left relative overflow-hidden flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[9.5px] font-bold text-[#6B7280] uppercase tracking-wider">Khata Limit</span>
                    <span className="bg-orange-50 text-accent p-1.5 rounded-lg"><FiLock className="w-4 h-4" /></span>
                  </div>
                  <div>
                    <h4 className="text-xl font-extrabold text-secondary mt-3">₹{khataProfile.credit_limit}</h4>
                    <span className="text-[9px] text-rose-500 mt-0.5 block">Used: ₹{khataProfile.current_balance}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Premium Khata Card above products */}
          {khataProfile && (
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 border border-slate-850 rounded-3xl p-6 text-white relative overflow-hidden shadow-premium-lg text-left">
              <div className="absolute right-[-30px] bottom-[-30px] w-48 h-48 rounded-full bg-emerald-500/10 blur-2xl"></div>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <FiBookOpen className="text-primary w-5 h-5" />
                    <span className="text-xs uppercase font-extrabold tracking-widest text-slate-300">My Premium Digital Khata Account</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wide block">Outstanding Balance</span>
                      <span className="text-2xl font-poppins font-extrabold text-rose-500">₹{parseFloat(khataProfile.current_balance).toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wide block">Available Credit</span>
                      <span className="text-2xl font-poppins font-extrabold text-emerald-400">
                        ₹{Math.max(0, parseFloat(khataProfile.credit_limit) - parseFloat(khataProfile.current_balance)).toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wide block">Last Payment</span>
                      <span className="text-sm font-semibold block mt-1 text-slate-200">
                        {khataProfile.last_payment_amount > 0 ? `₹${khataProfile.last_payment_amount}` : 'No Payment'}
                      </span>
                      {khataProfile.last_payment_date && (
                        <span className="text-[8.5px] text-slate-400">{new Date(khataProfile.last_payment_date).toLocaleDateString()}</span>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wide block">Next Due Date</span>
                      <span className="text-sm font-semibold block mt-1 text-slate-200">
                        {khataProfile.next_due_date ? new Date(khataProfile.next_due_date).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {parseFloat(khataProfile.current_balance) > 0 && (
                  <button
                    onClick={() => {
                      setSettleAmount(parseFloat(khataProfile.current_balance).toFixed(2));
                      setShowSettlementModal(true);
                      setPaymentRequest(null);
                    }}
                    className="bg-primary hover:bg-primary-hover text-white px-5 py-3 rounded-2xl font-bold text-xs tracking-wider uppercase transition-all shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer self-start md:self-center"
                  >
                    Clear Outstanding Bill
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Dynamic Promotional Banners Carousel / Auto-slider */}
          <div className="relative rounded-3xl overflow-hidden shadow-premium group h-44 sm:h-52 bg-slate-100 flex items-stretch">
            {bannersLoading ? (
              <div className="w-full h-full animate-pulse bg-slate-200"></div>
            ) : (
              <div className="w-full h-full relative flex items-stretch overflow-hidden">
                {activeBanners.map((banner, index) => (
                  <div
                    key={banner.id || index}
                    className={`absolute inset-0 transition-opacity duration-700 flex items-stretch ${
                      index === activeBannerIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                    }`}
                  >
                    {/* Visual Card Row */}
                    <div className={`w-full flex flex-col md:flex-row items-stretch justify-between p-6 sm:p-8 text-white bg-gradient-to-r ${
                      banner.bgGradient || 'from-emerald-600 to-emerald-900'
                    } relative overflow-hidden flex-1`}>
                      <div className="absolute inset-0 bg-black/10"></div>
                      <div className="flex flex-col justify-between relative z-10 max-w-lg text-left">
                        <div className="space-y-2">
                          <span className="bg-white/20 px-3 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest inline-block">
                            {banner.tag || banner.banner_type || 'OFFER'}
                          </span>
                          <h3 className="text-xl sm:text-3xl font-poppins font-extrabold leading-tight tracking-tight">
                            {banner.title}
                          </h3>
                          <p className="text-xs text-white/90 font-medium">
                            {banner.description}
                          </p>
                        </div>
                        {banner.link_to_category && (
                          <button
                            onClick={() => setSelectedCategory(banner.link_to_category)}
                            className="bg-white text-emerald-600 hover:bg-slate-50 font-bold text-xs px-4 py-2 rounded-xl w-max mt-4 shadow cursor-pointer transition-transform duration-200 active:scale-95"
                          >
                            Explore {banner.link_to_category}
                          </button>
                        )}
                      </div>
                      
                      {/* Image panel */}
                      <div className="hidden md:flex w-1/3 items-center justify-center relative overflow-hidden rounded-2xl border border-white/10 shadow-lg">
                        <img 
                          src={banner.image || banner.image_url} 
                          alt={banner.title} 
                          className="w-full h-full object-cover transform scale-100 hover:scale-105 transition-transform duration-500" 
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80';
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Carousel Controls */}
                {activeBanners.length > 1 && (
                  <div className="absolute bottom-4 left-6 z-20 flex space-x-1.5">
                    {activeBanners.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveBannerIndex(idx)}
                        className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                          idx === activeBannerIndex ? 'bg-white w-6' : 'bg-white/40 hover:bg-white/60'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Search, Sort and Layout filters */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-poppins font-extrabold text-secondary">Browse Grocery Items</h2>
              <p className="text-[#6B7280] text-xs sm:text-sm">Instant Blinkit-style delivery. Zero immediate payment, checkout on Digital Khata ledger.</p>
            </div>
            
            {/* Advanced search, barcode and sort controls */}
            <div className="flex flex-col sm:flex-row items-stretch gap-3">
              {/* Upgraded Advanced search panel with Dropdown */}
              <div className="relative flex-1 sm:w-72">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <FiSearch className="w-4.5 h-4.5" />
                </span>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onFocus={() => setShowSuggestions(true)}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, category, SKU, barcode..."
                  className="w-full bg-white border border-slate-200 focus:border-primary rounded-xl py-2 pl-9 pr-8 text-xs sm:text-sm text-text-primary placeholder-slate-400 outline-none transition-all focus:ring-2 focus:ring-emerald-100"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-secondary cursor-pointer"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                )}

                {/* Suggestions Overlay Dropdown */}
                {showSuggestions && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowSuggestions(false)} />
                    <div className="absolute left-0 mt-2 w-full bg-white border border-slate-250/60 rounded-2xl shadow-premium-lg z-50 p-2 text-left text-xs animate-in fade-in duration-200">
                      
                      {/* Search History */}
                      {recentSearches.length > 0 && !searchQuery && (
                        <div className="mb-2">
                          <div className="flex justify-between items-center px-2.5 py-1.5 text-[10px] text-text-secondary uppercase font-bold tracking-wider">
                            <span>Recent Searches</span>
                            <button onClick={clearSearchHistory} className="text-rose-500 hover:underline cursor-pointer lowercase">clear</button>
                          </div>
                          {recentSearches.map((s, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSearchSelect(s)}
                              className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-slate-50 rounded-xl text-secondary font-medium cursor-pointer transition-colors"
                            >
                              <FiClock className="w-3.5 h-3.5 text-slate-400" />
                              <span>{s}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Popular Searches */}
                      {!searchQuery && (
                        <div className="mb-1">
                          <div className="px-2.5 py-1.5 text-[10px] text-text-secondary uppercase font-bold tracking-wider">
                            Popular Searches
                          </div>
                          <div className="flex flex-wrap gap-1.5 p-2">
                            {['Milk', 'Bread', 'Butter', 'Wheat Atta', 'Cooking Oil', 'Eggs', 'Rice', 'Sugar'].map((tag, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleSearchSelect(tag)}
                                className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-lg text-[10.5px] font-semibold text-secondary cursor-pointer"
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Suggestions list when typing */}
                      {searchQuery && (
                        <div>
                          <div className="px-2.5 py-1 text-[10px] text-text-secondary uppercase font-bold tracking-wider border-b border-slate-100 pb-1.5 mb-1.5">
                            Matching Catalog Items
                          </div>
                          {searchedProducts.slice(0, 5).length > 0 ? (
                            searchedProducts.slice(0, 5).map((p) => (
                              <div
                                key={p.id}
                                onClick={() => {
                                  handleSearchSelect(p.name);
                                  setQuickViewProduct(p);
                                }}
                                className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors"
                              >
                                <div className="flex items-center space-x-2.5 min-w-0">
                                  <div className="w-7 h-7 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                                    {p.image ? (
                                      <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <FiShoppingBag className="w-4 h-4 text-slate-400" />
                                    )}
                                  </div>
                                  <div className="truncate">
                                    <p className="font-bold text-secondary text-xs">{highlightText(p.name, searchQuery)}</p>
                                    <span className="text-[9.5px] text-text-secondary">{p.category || 'General'}</span>
                                  </div>
                                </div>
                                <span className="font-extrabold text-xs text-primary">₹{p.price}</span>
                              </div>
                            ))
                          ) : (
                            <div className="py-4 text-center text-slate-400 italic">No products matched query.</div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Scan to Add button */}
              <button
                onClick={() => setShowBarcodeScanner(true)}
                className="flex items-center justify-center space-x-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold px-4 py-2 rounded-xl shadow-sm shadow-emerald-500/20 transition-all cursor-pointer text-xs active:scale-95"
                title="Scan grocery barcode"
              >
                <FiZap className="w-4 h-4" />
                <span>Scan to Add</span>
              </button>

              {/* Sort filter */}
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

              {/* Wishlist toggle view */}
              <button
                onClick={() => setShowWishlistOnly(!showWishlistOnly)}
                className={`p-2.5 rounded-xl border transition-all duration-200 shadow-sm cursor-pointer flex items-center justify-center ${
                  showWishlistOnly 
                    ? 'bg-rose-50 border-rose-200 text-rose-600' 
                    : 'bg-white border-slate-200 text-text-secondary hover:text-rose-500'
                }`}
                title="View wishlisted items only"
              >
                <FiHeart className={`w-4.5 h-4.5 ${showWishlistOnly ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>

          {/* Catalog Row Subsections (Buy Again, Best Sellers, Trending, Recommended) */}
          {!showWishlistOnly && !searchQuery && (
            <div className="space-y-6">
              
              {/* Buy Again section */}
              {buyAgainProducts.length > 0 && (
                <div className="space-y-3 text-left">
                  <div className="flex items-center space-x-2">
                    <FiRefreshCw className="text-emerald-500 w-5 h-5 animate-spin-slow" />
                    <h3 className="font-poppins font-extrabold text-base text-secondary">Buy Again</h3>
                  </div>
                  <div className="flex items-stretch space-x-4 overflow-x-auto pb-3 scrollbar-none">
                    {buyAgainProducts.map(p => (
                      <div key={p.id} className="w-48 bg-white border border-slate-200/50 rounded-2xl p-3 shadow-sm flex flex-col justify-between flex-shrink-0 hover:shadow-premium transition-shadow cursor-pointer relative" onClick={() => setQuickViewProduct(p)}>
                        <button 
                          onClick={(e) => handleToggleWishlist(e, p.id)}
                          className="absolute top-2.5 right-2.5 z-10 p-1.5 bg-white/80 hover:bg-white rounded-full text-slate-400 hover:text-rose-500 border border-slate-100 shadow-sm cursor-pointer"
                        >
                          <FiHeart className={`w-3.5 h-3.5 ${wishlistIds.has(p.id) ? 'fill-current text-rose-500' : ''}`} />
                        </button>
                        <div className="h-28 flex items-center justify-center overflow-hidden rounded-xl bg-slate-50 border-b border-slate-100/50">
                          {p.image ? (
                            <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <FiShoppingBag className="w-8 h-8 text-slate-300" />
                          )}
                        </div>
                        <div className="mt-2.5 space-y-1">
                          <h4 className="font-bold text-xs text-secondary truncate">{p.name}</h4>
                          <div className="flex justify-between items-center mt-2.5">
                            <span className="font-extrabold text-sm text-secondary">₹{p.price}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const res = addToCart(p);
                                if (res.success === false) {
                                  showToast(res.message, 'error');
                                } else {
                                  showToast(res.message, 'success');
                                }
                              }}
                              className="bg-primary hover:bg-primary-hover text-white text-[10px] font-extrabold px-3 py-1.5 rounded-xl shadow-sm"
                            >
                              Reorder
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Best Sellers Section */}
              {bestSellers.length > 0 && (
                <div className="space-y-3 text-left">
                  <div className="flex items-center space-x-2">
                    <FiZap className="text-amber-500 w-5 h-5 animate-pulse" />
                    <h3 className="font-poppins font-extrabold text-base text-secondary">🔥 Best Sellers</h3>
                  </div>
                  <div className="flex items-stretch space-x-4 overflow-x-auto pb-3 scrollbar-none">
                    {bestSellers.map(p => (
                      <div key={p.id} className="w-44 bg-white border border-slate-200/50 rounded-2xl p-3 shadow-sm flex flex-col justify-between flex-shrink-0 hover:shadow-premium transition-shadow cursor-pointer relative" onClick={() => setQuickViewProduct(p)}>
                        <button 
                          onClick={(e) => handleToggleWishlist(e, p.id)}
                          className="absolute top-2.5 right-2.5 z-10 p-1.5 bg-white/80 hover:bg-white rounded-full text-slate-400 hover:text-rose-500 border border-slate-100 shadow-sm cursor-pointer"
                        >
                          <FiHeart className={`w-3.5 h-3.5 ${wishlistIds.has(p.id) ? 'fill-current text-rose-500' : ''}`} />
                        </button>
                        <div className="h-24 flex items-center justify-center overflow-hidden rounded-xl bg-slate-50">
                          {p.image ? (
                            <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <FiShoppingBag className="w-6 h-6 text-slate-300" />
                          )}
                        </div>
                        <div className="mt-2.5 space-y-1">
                          <h4 className="font-bold text-xs text-secondary truncate">{p.name}</h4>
                          <span className="text-[9.5px] font-semibold text-text-secondary block mt-0.5">{getStockStatus(p.stock_quantity).text}</span>
                          <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100/60">
                            <span className="font-extrabold text-xs text-secondary">₹{p.price}</span>
                            {renderCartButton(p)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending Section */}
              {trendingProducts.length > 0 && (
                <div className="space-y-3 text-left">
                  <div className="flex items-center space-x-2">
                    <FiLayers className="text-orange-500 w-5 h-5" />
                    <h3 className="font-poppins font-extrabold text-base text-secondary">📈 Trending Products</h3>
                  </div>
                  <div className="flex items-stretch space-x-4 overflow-x-auto pb-3 scrollbar-none">
                    {trendingProducts.map(p => (
                      <div key={p.id} className="w-44 bg-white border border-slate-200/50 rounded-2xl p-3 shadow-sm flex flex-col justify-between flex-shrink-0 hover:shadow-premium transition-shadow cursor-pointer relative" onClick={() => setQuickViewProduct(p)}>
                        <button 
                          onClick={(e) => handleToggleWishlist(e, p.id)}
                          className="absolute top-2.5 right-2.5 z-10 p-1.5 bg-white/80 hover:bg-white rounded-full text-slate-400 hover:text-rose-500 border border-slate-100 shadow-sm cursor-pointer"
                        >
                          <FiHeart className={`w-3.5 h-3.5 ${wishlistIds.has(p.id) ? 'fill-current text-rose-500' : ''}`} />
                        </button>
                        <div className="h-24 flex items-center justify-center overflow-hidden rounded-xl bg-slate-50">
                          {p.image ? (
                            <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <FiShoppingBag className="w-6 h-6 text-slate-300" />
                          )}
                        </div>
                        <div className="mt-2.5 space-y-1">
                          <h4 className="font-bold text-xs text-secondary truncate">{p.name}</h4>
                          <span className="text-[9.5px] font-semibold text-text-secondary block mt-0.5">{getStockStatus(p.stock_quantity).text}</span>
                          <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100/60">
                            <span className="font-extrabold text-xs text-secondary">₹{p.price}</span>
                            {renderCartButton(p)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Personalized Recommendations Section */}
              {recommendations.length > 0 && (
                <div className="space-y-3 text-left">
                  <div className="flex items-center space-x-2">
                    <FiGift className="text-teal-500 w-5 h-5" />
                    <h3 className="font-poppins font-extrabold text-base text-secondary">Recommended For You</h3>
                  </div>
                  <div className="flex items-stretch space-x-4 overflow-x-auto pb-3 scrollbar-none">
                    {recommendations.map(p => (
                      <div key={p.id} className="w-44 bg-white border border-slate-200/50 rounded-2xl p-3 shadow-sm flex flex-col justify-between flex-shrink-0 hover:shadow-premium transition-shadow cursor-pointer relative" onClick={() => setQuickViewProduct(p)}>
                        <button 
                          onClick={(e) => handleToggleWishlist(e, p.id)}
                          className="absolute top-2.5 right-2.5 z-10 p-1.5 bg-white/80 hover:bg-white rounded-full text-slate-400 hover:text-rose-500 border border-slate-100 shadow-sm cursor-pointer"
                        >
                          <FiHeart className={`w-3.5 h-3.5 ${wishlistIds.has(p.id) ? 'fill-current text-rose-500' : ''}`} />
                        </button>
                        <div className="h-24 flex items-center justify-center overflow-hidden rounded-xl bg-slate-50">
                          {p.image ? (
                            <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <FiShoppingBag className="w-6 h-6 text-slate-300" />
                          )}
                        </div>
                        <div className="mt-2.5 space-y-1">
                          <h4 className="font-bold text-xs text-secondary truncate">{p.name}</h4>
                          <span className="text-[9.5px] font-semibold text-text-secondary block mt-0.5">{getStockStatus(p.stock_quantity).text}</span>
                          <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100/60">
                            <span className="font-extrabold text-xs text-secondary">₹{p.price}</span>
                            {renderCartButton(p)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
            </div>
          )}

          {/* Main Catalog categories tab filter */}
          <div className="border-t border-slate-200/60 pt-6 space-y-4">
            <h3 className="font-poppins font-extrabold text-base text-secondary text-left">
              {showWishlistOnly ? 'My Wishlisted Products' : 'Explore Full Catalog'}
            </h3>
            
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
          </div>

          {/* Product Cards Catalog Grid */}
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
                const stockInfo = getStockStatus(p.stock_quantity);

                return (
                  <div key={p.id} className="bg-white border border-slate-200/50 hover:border-slate-300 rounded-3xl overflow-hidden transition-all duration-200 group flex flex-col h-full shadow-sm hover:shadow-premium relative cursor-pointer" onClick={() => setQuickViewProduct(p)}>
                    
                    {/* Wishlist Heart Icon */}
                    <button 
                      onClick={(e) => handleToggleWishlist(e, p.id)}
                      className="absolute top-3 right-3 z-10 p-2 bg-white/85 hover:bg-white rounded-full text-slate-400 hover:text-rose-500 border border-slate-100 shadow-sm cursor-pointer transition-colors"
                      title="Add to wishlist"
                    >
                      <FiHeart className={`w-4 h-4 ${wishlistIds.has(p.id) ? 'fill-current text-rose-500' : ''}`} />
                    </button>

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
                      <span className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm text-[#0F172A] border border-slate-200/60 text-[9px] font-extrabold tracking-wider px-2 py-0.5 rounded-md uppercase shadow-sm">
                        {p.category || 'General'}
                      </span>

                      {/* Estimated Delivery indicator */}
                      <span className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-sm text-white text-[9.5px] font-semibold px-2 py-0.5 rounded-lg flex items-center space-x-1 shadow-sm">
                        <FiClock className="w-3 h-3 text-emerald-400" />
                        <span>{getDeliveryEstimate()}</span>
                      </span>
                    </div>

                    {/* Content Details */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div className="text-left">
                        {/* Rating block & Badges */}
                        <div className="flex flex-wrap gap-1.5 items-center mb-2">
                          <span className="bg-amber-50 text-amber-600 text-[9.5px] font-bold px-1.5 py-0.5 rounded-md flex items-center space-x-0.5 border border-amber-200/40">
                            <FiStar className="w-3 h-3 fill-current text-amber-500" />
                            <span>{p.average_rating || '5.0'}</span>
                          </span>
                          {p.badges && p.badges.map((b, idx) => (
                            <span key={idx} className="bg-emerald-50 text-primary border border-emerald-100 text-[8.5px] font-bold px-1.5 py-0.5 rounded-md uppercase">
                              {b.replace(/[^\w\s]/g, '')}
                            </span>
                          ))}
                        </div>

                        <h3 className="font-bold text-secondary text-sm sm:text-base tracking-tight leading-tight group-hover:text-primary transition-colors truncate">
                          {p.name}
                        </h3>
                        <p className="text-[10.5px] text-text-secondary mt-1 font-light leading-relaxed line-clamp-2">
                          {p.description || 'Fresh selected local grocery items.'}
                        </p>
                      </div>

                      {/* Bottom actions & Smart quantity selector */}
                      <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between mt-auto">
                        <div className="text-left">
                          <span className={`inline-block px-1.5 py-0.5 rounded-md text-[8.5px] font-bold border ${stockInfo.color} mb-1`}>
                            {stockInfo.text}
                          </span>
                          <p className="font-extrabold text-base text-secondary leading-none">₹{p.price}</p>
                        </div>

                        <div className="text-right">
                          {renderCartButton(p)}
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
              <p className="text-text-secondary text-sm max-w-sm">We couldn't find any products matching your active filters or wishlist selection.</p>
            </div>
          )}

          {/* Upgraded Trust Badges Section */}
          <div className="border-t border-slate-200/60 pt-10 pb-8 mt-10">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center text-xs text-text-secondary">
              <div className="flex flex-col items-center space-y-2 p-3 bg-white border border-slate-150 rounded-2xl shadow-sm">
                <FiCheck className="text-emerald-500 w-5 h-5" />
                <span className="font-bold text-secondary">✓ Secure Payments</span>
              </div>
              <div className="flex flex-col items-center space-y-2 p-3 bg-white border border-slate-150 rounded-2xl shadow-sm">
                <FiCheck className="text-emerald-500 w-5 h-5" />
                <span className="font-bold text-secondary">✓ Trusted Local Store</span>
              </div>
              <div className="flex flex-col items-center space-y-2 p-3 bg-white border border-slate-150 rounded-2xl shadow-sm">
                <FiCheck className="text-emerald-500 w-5 h-5" />
                <span className="font-bold text-secondary">✓ Digital Khata</span>
              </div>
              <div className="flex flex-col items-center space-y-2 p-3 bg-white border border-slate-150 rounded-2xl shadow-sm">
                <FiCheck className="text-emerald-500 w-5 h-5" />
                <span className="font-bold text-secondary">✓ Same Day Delivery</span>
              </div>
              <div className="flex flex-col items-center space-y-2 p-3 bg-white border border-slate-150 rounded-2xl shadow-sm col-span-2 md:col-span-1">
                <FiCheck className="text-emerald-500 w-5 h-5" />
                <span className="font-bold text-secondary">✓ Customer Support</span>
              </div>
            </div>
          </div>

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

              <div className="space-y-2 text-center">
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
                
                {/* Balance liability Card */}
                <div className="bg-white border border-slate-200/60 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-premium transition-shadow">
                  <div className="absolute top-[-20%] right-[-10%] w-24 h-24 rounded-full bg-rose-500/5 blur-xl"></div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Remaining Debt Liability</span>
                    <span className="bg-rose-50 text-rose-500 p-2 rounded-xl border border-rose-100">
                      <FiLock className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="mt-4 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-3xl font-poppins font-extrabold text-rose-600">₹{parseFloat(khataProfile.current_balance).toFixed(2)}</span>
                      <p className="text-[10px] text-text-secondary mt-1 font-light leading-none">Unpaid outstanding store credit balance</p>
                    </div>
                    <div className="flex flex-col space-y-2 mt-3.5">
                      {parseFloat(khataProfile.current_balance) > 0 && (
                        <button
                          onClick={() => {
                            setSettleAmount(parseFloat(khataProfile.current_balance).toFixed(2));
                            setShowSettlementModal(true);
                            setPaymentRequest(null);
                          }}
                          className="w-full bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-bold py-2.5 px-3 rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center space-x-1"
                        >
                          <FiZap className="w-3.5 h-3.5 animate-pulse" />
                          <span>Settle Balance Online</span>
                        </button>
                      )}
                      
                      <button
                        onClick={handleRequestWhatsAppStatement}
                        disabled={requestingStatement}
                        className="w-full bg-slate-100/80 hover:bg-slate-200/80 text-secondary border border-slate-200/60 text-[10px] font-extrabold py-2 px-3 rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center space-x-1 disabled:opacity-50"
                      >
                        <FiSend className="w-3 h-3 text-emerald-500" />
                        <span>{requestingStatement ? 'Sending ledger statement…' : 'Send Ledger to WhatsApp'}</span>
                      </button>
                    </div>
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

              {/* Credit Limit Utilization Card */}
              {khataProfile.credit_limit !== undefined && (
                <div className="bg-white border border-slate-200/60 rounded-3xl p-5 shadow-sm text-left">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Credit Limit Utilization</span>
                      <span className="text-xs text-text-secondary mt-0.5 block">Your store credit allowance</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-extrabold ${
                        (khataProfile.credit_limit - khataProfile.current_balance) <= 0 ? 'text-red-600' : 'text-emerald-600'
                      }`}>
                        ₹{Math.max(0, parseFloat(khataProfile.credit_limit) - parseFloat(khataProfile.current_balance)).toFixed(2)} left
                      </span>
                      <span className="text-[10px] text-text-secondary block mt-0.5">of ₹{parseFloat(khataProfile.credit_limit).toFixed(2)} limit</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-700 ${
                        (parseFloat(khataProfile.current_balance) / parseFloat(khataProfile.credit_limit)) * 100 >= 100
                          ? 'bg-red-500'
                          : (parseFloat(khataProfile.current_balance) / parseFloat(khataProfile.credit_limit)) * 105 >= 80
                          ? 'bg-amber-500'
                          : 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                      }`}
                      style={{
                        width: `${Math.min(100, (parseFloat(khataProfile.current_balance) / parseFloat(khataProfile.credit_limit)) * 100)}%`
                      }}
                    />
                  </div>
                  <div className="flex justify-between items-center mt-1.5 text-xs">
                    <span className={`text-[10px] font-bold ${
                      (parseFloat(khataProfile.current_balance) / parseFloat(khataProfile.credit_limit)) * 100 >= 80 ? 'text-amber-600' : 'text-emerald-600'
                    }`}>
                      {Math.min(100, ((parseFloat(khataProfile.current_balance) / parseFloat(khataProfile.credit_limit)) * 100)).toFixed(1)}% used
                    </span>
                    <span className="text-[10px] text-text-secondary font-medium">
                      ₹{parseFloat(khataProfile.current_balance).toFixed(2)} outstanding
                    </span>
                  </div>
                </div>
              )}

              {/* Transactions Ledger Table */}
              <div className="bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 text-left">
                  <h3 className="font-bold text-secondary text-sm sm:text-base">Ledger Statement Book</h3>
                  <div className="inline-flex items-center space-x-1.5 text-xs text-primary bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 font-bold">
                    <FiUnlock className="w-3.5 h-3.5" />
                    <span>Unlocked Ledger Access</span>
                  </div>
                </div>

                {khataProfile.transactions && khataProfile.transactions.length > 0 ? (
                  <div className="overflow-x-auto text-left">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-150 text-[10px] uppercase font-bold tracking-wider text-[#6B7280] bg-slate-50/70">
                          <th className="py-4 px-6">Date</th>
                          <th className="py-4 px-6">Description</th>
                          <th className="py-4 px-6">Product Details</th>
                          <th className="py-4 px-6">Type</th>
                          <th className="py-4 px-6 text-right">Amount</th>
                          <th className="py-4 px-6 text-right">Remaining Balance liability</th>
                          <th className="py-4 px-6 text-center">Invoice</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedTransactions.map((tx) => (
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
                            <td className="py-4 px-6 text-center">
                              {tx.invoice ? (
                                <button
                                  onClick={() => handleDownloadInvoice(tx.invoice, tx.id)}
                                  className="text-primary hover:text-primary-hover font-bold text-xs bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 px-3 py-1.5 rounded-xl cursor-pointer shadow-sm transition-all active:scale-95"
                                >
                                  Download PDF
                                </button>
                              ) : (
                                <span className="text-slate-400 font-light">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Pagination Controls */}
                    {totalLedgerPages > 1 && (
                      <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/30">
                        <button
                          onClick={() => setLedgerCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={ledgerCurrentPage === 1}
                          className="px-3.5 py-2 text-xs font-bold text-secondary border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent rounded-xl cursor-pointer transition-all flex items-center space-x-1"
                        >
                          <span>&larr; Previous</span>
                        </button>
                        <span className="text-xs font-medium text-text-secondary">
                          Page <span className="font-bold text-secondary">{ledgerCurrentPage}</span> of <span className="font-bold text-secondary">{totalLedgerPages}</span>
                        </span>
                        <button
                          onClick={() => setLedgerCurrentPage(prev => Math.min(prev + 1, totalLedgerPages))}
                          disabled={ledgerCurrentPage === totalLedgerPages}
                          className="px-3.5 py-2 text-xs font-bold text-secondary border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent rounded-xl cursor-pointer transition-all flex items-center space-x-1"
                        >
                          <span>Next &rarr;</span>
                        </button>
                      </div>
                    )}
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

      {/* Barcode scanner view */}
      {showBarcodeScanner && (
        <BarcodeScanner
          title="Scan to Add to Cart"
          onScan={handleBarcodeScanToCart}
          onClose={() => setShowBarcodeScanner(false)}
        />
      )}

      {/* Floating help WhatsApp Button (Configurable support number) */}
      <a
        href={`https://wa.me/${cleanPhoneForWhatsApp(configs.SUPPORT_PHONE) || '919876543210'}?text=Hello%20Shivam%20Kirana%20Store,%20I%20need%20help%20with%20my%20credit%20ledger.`}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-6 left-6 z-40 bg-emerald-500 hover:bg-emerald-600 text-white p-3 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105"
        title="WhatsApp Support Contact"
      >
        <FaWhatsapp className="w-6 h-6" />
      </a>

      {/* Mobile Sticky Bottom Navigation Menu (Home, Cart, Khata, Orders, Profile) */}
      <div className="block md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200/80 z-40 py-2.5 px-4 flex justify-between shadow-premium-lg">
        <button
          onClick={() => {
            setMobileTab('home');
            window.history.pushState({}, '', '/dashboard');
            // force location refresh locally
            const event = new PopStateEvent('popstate');
            window.dispatchEvent(event);
          }}
          className={`flex flex-col items-center justify-center flex-1 cursor-pointer transition-colors ${
            mobileTab === 'home' && !isKhataView ? 'text-primary font-bold' : 'text-text-secondary'
          }`}
        >
          <FiHome className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-medium">Home</span>
        </button>

        <button
          onClick={() => setIsCartOpen(true)}
          className={`flex flex-col items-center justify-center flex-1 cursor-pointer transition-colors relative text-text-secondary`}
        >
          <FiShoppingCart className="w-5 h-5" />
          {cartCount > 0 && (
            <span className="absolute top-0 right-5 bg-rose-500 text-white rounded-full text-[8.5px] font-extrabold w-4 h-4 flex items-center justify-center">
              {cartCount}
            </span>
          )}
          <span className="text-[10px] mt-1 font-medium">Cart</span>
        </button>

        <button
          onClick={() => {
            setMobileTab('khata');
            window.history.pushState({}, '', '/dashboard/khata');
            const event = new PopStateEvent('popstate');
            window.dispatchEvent(event);
          }}
          className={`flex flex-col items-center justify-center flex-1 cursor-pointer transition-colors ${
            isKhataView ? 'text-primary font-bold' : 'text-text-secondary'
          }`}
        >
          <FiBookOpen className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-medium">Khata</span>
        </button>
      </div>

      {/* 1. Product Quick View Modal */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-premium-lg relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col text-left">
            <button
              onClick={() => setQuickViewProduct(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-secondary p-1.5 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-full transition-all cursor-pointer z-20"
            >
              <FiX className="w-5 h-5" />
            </button>

            <div className="overflow-y-auto flex-1 p-6 sm:p-8 space-y-6">
              
              {/* Product Info section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                
                {/* Large image area */}
                <div className="w-full h-64 md:h-72 bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 flex items-center justify-center">
                  {quickViewProduct.image ? (
                    <img 
                      src={quickViewProduct.image} 
                      alt={quickViewProduct.name} 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80';
                      }}
                    />
                  ) : (
                    <FiShoppingBag className="w-16 h-16 text-slate-300" />
                  )}
                </div>

                {/* Details layout */}
                <div className="space-y-4 text-left">
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="bg-emerald-50 text-primary border border-emerald-100 text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase">
                      {quickViewProduct.category || 'General'}
                    </span>
                    {quickViewProduct.badges && quickViewProduct.badges.map((b, i) => (
                      <span key={i} className="bg-amber-50 text-amber-600 border border-amber-200/40 text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase">
                        {b}
                      </span>
                    ))}
                  </div>

                  <h3 className="text-xl sm:text-2xl font-poppins font-extrabold text-secondary leading-tight">
                    {quickViewProduct.name}
                  </h3>

                  <div className="flex items-center space-x-4 text-xs font-semibold">
                    <span className={`px-2 py-0.5 rounded-lg border ${getStockStatus(quickViewProduct.stock_quantity).color}`}>
                      {getStockStatus(quickViewProduct.stock_quantity).text} (Stock: {quickViewProduct.stock_quantity})
                    </span>
                    <span className="text-[#6B7280] flex items-center space-x-1">
                      <FiClock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{getDeliveryEstimate()}</span>
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                    {quickViewProduct.description || 'No descriptive specifications provided. Standard certified local packaging.'}
                  </p>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-text-secondary uppercase tracking-wider">Retail Price</p>
                      <span className="text-2xl font-poppins font-extrabold text-secondary">₹{quickViewProduct.price}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleBuyNow(quickViewProduct)}
                        className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow cursor-pointer transition-all"
                      >
                        Buy Now
                      </button>
                      <button
                        onClick={() => {
                          const res = addToCart(quickViewProduct);
                          showToast(res.message, res.success ? 'success' : 'error');
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-secondary border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all flex items-center space-x-1"
                      >
                        <FiShoppingCart className="w-4.5 h-4.5" />
                        <span>Add To Cart</span>
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              {/* Verified Product Reviews section */}
              <div className="pt-6 border-t border-slate-100 space-y-4">
                <h4 className="font-poppins font-extrabold text-sm sm:text-base text-secondary flex items-center space-x-1.5">
                  <span>Customer Ratings & Reviews</span>
                  <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-md border border-amber-200/40 font-bold">
                    ★ {quickViewProduct.average_rating || '5.0'} ({quickViewProduct.total_reviews || 0} reviews)
                  </span>
                </h4>

                {/* Review submission Form */}
                <form onSubmit={handleSubmitReview} className="bg-slate-50 border border-slate-150 p-4.5 rounded-2xl space-y-3">
                  <span className="text-xs font-bold text-secondary block">Write a Review (Verified Purchases)</span>
                  <div className="flex items-center space-x-3">
                    <label className="text-xs font-semibold text-text-secondary">Rating Stars:</label>
                    <div className="flex space-x-1 text-amber-500">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewRating(star)}
                          className="hover:scale-110 transition-transform cursor-pointer"
                        >
                          <FiStar className={`w-5 h-5 ${star <= newRating ? 'fill-current' : ''}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 items-stretch">
                    <textarea
                      value={newReviewText}
                      onChange={(e) => setNewReviewText(e.target.value)}
                      placeholder="Share details of your purchase experience with other shoppers..."
                      rows="2"
                      required
                      className="flex-1 bg-white border border-slate-250 focus:border-primary rounded-xl py-2 px-3 text-xs outline-none focus:ring-2 focus:ring-emerald-100"
                    />
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-bold text-xs px-4 rounded-xl shadow cursor-pointer transition-all"
                    >
                      {submittingReview ? 'Submitting…' : 'Post'}
                    </button>
                  </div>
                </form>

                {/* Reviews List */}
                <div className="space-y-3">
                  {reviewsLoading ? (
                    <div className="py-8 text-center text-xs text-slate-400">Loading reviews…</div>
                  ) : reviews.length > 0 ? (
                    reviews.map((r) => (
                      <div key={r.id} className="border border-slate-100 p-3.5 rounded-2xl space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-secondary">{r.user_username || 'Customer'}</span>
                            {r.is_verified_purchase && (
                              <span className="bg-emerald-50 text-primary border border-emerald-100 text-[8.5px] font-extrabold px-1.5 py-0.5 rounded-md uppercase">
                                Verified Purchase
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">{new Date(r.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex space-x-0.5 text-amber-500">
                          {[...Array(5)].map((_, i) => (
                            <FiStar key={i} className={`w-3.5 h-3.5 ${i < r.rating ? 'fill-current' : ''}`} />
                          ))}
                        </div>
                        <p className="text-xs text-text-secondary leading-normal">{r.review_text || 'Excellent product.'}</p>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400 italic">No approved reviews yet. Be the first to write a review!</div>
                  )}
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

      {/* Online Payments settlement UPI QR Modal */}
      {showSettlementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-premium-lg relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowSettlementModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-secondary p-1.5 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-full transition-all cursor-pointer"
            >
              <FiX className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2.5 mb-5 text-left">
              <div className="bg-rose-50 text-rose-500 p-2.5 rounded-xl border border-rose-100">
                <FiZap className="w-5 h-5" />
              </div>
              <h3 className="text-base sm:text-lg font-poppins font-extrabold text-secondary leading-none">
                Settle Balance Online
              </h3>
            </div>

            {!paymentRequest ? (
              <form onSubmit={handleCreatePaymentLink} className="space-y-5 text-left">
                <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-text-secondary block">
                    Outstanding Debt Liability
                  </span>
                  <span className="text-2xl font-poppins font-extrabold text-rose-600 block mt-1">
                    ₹{parseFloat(khataProfile.current_balance).toFixed(2)}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2 text-left">
                    Settlement Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={parseFloat(khataProfile.current_balance)}
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    className="w-full bg-white border border-slate-250 focus:border-primary rounded-xl py-3 px-4 text-sm font-semibold text-[#111827] focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                    placeholder="Enter amount to pay"
                    required
                  />
                  <span className="text-[10px] text-text-secondary mt-1 block">
                    Must be greater than ₹0 and not exceed your total debt.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={settling}
                  className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center space-x-2 shadow-md shadow-emerald-500/10 active:scale-[0.98] transition-all cursor-pointer text-sm"
                >
                  {settling ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <FiZap className="w-4 h-4" />
                      <span>Generate Payment Link</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="space-y-6 text-center">
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl text-left">
                  <div className="flex justify-between items-center text-xs font-medium text-text-secondary">
                    <span>Payment ID</span>
                    <span className="font-mono text-secondary font-semibold">{paymentRequest.razorpay_payment_link_id}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-medium text-text-secondary mt-2">
                    <span>Amount</span>
                    <span className="text-secondary font-bold">₹{parseFloat(paymentRequest.amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-medium text-text-secondary mt-2">
                    <span>Status</span>
                    <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase">
                      {paymentRequest.status}
                    </span>
                  </div>
                </div>

                <div className="py-2 flex flex-col items-center justify-center space-y-3">
                  <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-4 rounded-2xl flex items-center justify-center w-40 h-40 relative">
                    <div className="text-center text-[#6B7280]">
                      <FiZap className="w-10 h-10 mx-auto text-emerald-500 animate-bounce mb-2" />
                      <span className="text-[10px] font-bold uppercase tracking-wider block">Scan to Pay</span>
                      <span className="text-[8px] mt-1 block">UPI QR Generated</span>
                    </div>
                  </div>
                  <p className="text-xs text-text-secondary max-w-xs leading-normal">
                    Redirect to Razorpay hosted checkout to pay securely via PhonePe, GPay, Paytm, or UPI.
                  </p>
                </div>

                <div className="flex flex-col space-y-2.5">
                  <a
                    href={paymentRequest.razorpay_payment_link_url}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center space-x-2 shadow-sm transition-all active:scale-[0.98] cursor-pointer text-sm"
                  >
                    <span>Proceed to Pay (UPI/Web)</span>
                  </a>

                  <button
                    onClick={handleCheckPaymentStatus}
                    disabled={checkingStatus}
                    className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-secondary font-bold py-3 px-4 rounded-2xl flex items-center justify-center space-x-2 transition-all active:scale-[0.98] cursor-pointer text-xs"
                  >
                    {checkingStatus ? (
                      <div className="w-4 h-4 border-2 border-secondary border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <FiRefreshCw className="w-3.5 h-3.5" />
                        <span>Check Payment Confirmation</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
