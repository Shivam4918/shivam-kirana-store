import { useState, useEffect, useContext, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import { CartContext } from '../context/CartContext';
import BarcodeScanner from '../components/BarcodeScanner';
import { 
  FiSearch, FiLock, FiUnlock, FiCalendar, FiBookOpen, 
  FiArrowUpRight, FiArrowDownLeft, FiShoppingBag, FiInbox,
  FiShoppingCart, FiX, FiPlus, FiMinus, FiTrash2, FiAlertCircle, FiCheck, FiFilter, 
  FiStar, FiZap, FiRefreshCw, FiSend, FiHeart, FiGift, FiClock, FiHome, 
  FiLayers, FiInfo, FiChevronLeft, FiChevronRight, FiCheckCircle
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';

const cleanPhoneForWhatsApp = (phone) => {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('00')) cleaned = cleaned.substring(2);
  else if (cleaned.startsWith('0') && cleaned.length === 11) cleaned = cleaned.substring(1);
  if (cleaned.length === 10) return `91${cleaned}`;
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
    cartCount, 
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

  // Banners & Summary states
  const [banners, setBanners] = useState([]);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [configs, setConfigs] = useState({});
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  
  // Autocomplete search states
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('recentSearches') || '[]');
    } catch {
      return [];
    }
  });

  // Section sliders data
  const [buyAgainProducts, setBuyAgainProducts] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  // Wishlist states
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const [showWishlistOnly, setShowWishlistOnly] = useState(false);

  // Product quick-view overlay states
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newReviewText, setNewReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Mobile bottom tab nav
  const [mobileTab, setMobileTab] = useState(isKhataView ? 'khata' : 'home');

  // General notifier state
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

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Sync searchQuery with URL query parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchQuery(params.get('search') || '');
  }, [location.search]);

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
          showToast('Product added to wishlist.');
        } else {
          next.delete(productId);
          showToast('Product removed from wishlist.');
        }
        return next;
      });
    } catch (err) {
      console.error('Wishlist error:', err);
      showToast('Error toggling wishlist.', 'error');
    }
  };

  // Review submission
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!newReviewText) return;
    setSubmittingReview(true);
    try {
      await api.post(`/products/${quickViewProduct.id}/reviews/`, {
        rating: newRating,
        review_text: newReviewText
      });
      showToast('Review submitted successfully! Undergoing validation check.');
      setNewReviewText('');
      setNewRating(5);
      fetchReviews(quickViewProduct.id);
    } catch (err) {
      console.error('Review submit error:', err);
      showToast('Error submitting review. Purchase validation might be missing.', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Autocomplete Suggestions helper actions
  const handleSearchSelect = (query) => {
    setSearchQuery(query);
    setShowSuggestions(false);
    // Add to history
    setRecentSearches(prev => {
      const next = [query, ...prev.filter(s => s !== query)].slice(0, 5);
      localStorage.setItem('recentSearches', JSON.stringify(next));
      return next;
    });
  };

  const clearSearchHistory = (e) => {
    e.stopPropagation();
    localStorage.removeItem('recentSearches');
    setRecentSearches([]);
  };

  const highlightText = (text, highlight) => {
    if (!highlight.trim()) return text;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === highlight.toLowerCase() 
            ? <mark key={i} className="bg-emerald-100 text-[#10B981] font-bold p-0">{part}</mark> 
            : part
        )}
      </span>
    );
  };

  const handleBarcodeScanToCart = async (barcode) => {
    setShowBarcodeScanner(false);
    showToast(`Scanning barcode: ${barcode}...`);
    try {
      const res = await api.get(`/products/by-barcode/?barcode=${barcode}`);
      if (res.data) {
        const item = res.data;
        const cres = addToCart(item);
        showToast(cres.message, cres.success ? 'success' : 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Product not found in store catalog.', 'error');
    }
  };

  const handleBuyNow = (p) => {
    const res = addToCart(p);
    setQuickViewProduct(null);
    if (res.success === false) {
      showToast(res.message, 'error');
    } else {
      showToast(res.message, 'success');
      setIsCartOpen(true);
    }
  };

  // WhatsApp statements download request
  const handleRequestWhatsAppStatement = async () => {
    setRequestingStatement(true);
    try {
      await api.post('/khata/request-statement/');
      showToast('Khata digital statement dispatched to your WhatsApp number!');
    } catch (err) {
      console.error(err);
      showToast('Failed to dispatch digital statement.', 'error');
    } finally {
      setRequestingStatement(false);
    }
  };

  // Generate Online Settlement QR/Payment links
  const handleCreatePaymentLink = async (e) => {
    e.preventDefault();
    if (!settleAmount || parseFloat(settleAmount) <= 0) {
      showToast('Enter a valid settlement amount.', 'error');
      return;
    }
    setSettling(true);
    setPaymentRequest(null);
    try {
      const res = await api.post('/khata/settle-online/', { amount: parseFloat(settleAmount) });
      setPaymentRequest(res.data);
      showToast('Secured Razorpay checkout request generated!');
    } catch (err) {
      console.error(err);
      showToast('Online checkout creation failed.', 'error');
    } finally {
      setSettling(false);
    }
  };

  const handleCheckPaymentStatus = async () => {
    if (!paymentRequest) return;
    setCheckingStatus(true);
    try {
      const res = await api.get(`/khata/payment-status/${paymentRequest.razorpay_payment_link_id}/`);
      if (res.data.status === 'paid') {
        showToast('Payment verified successfully! Balance settled.');
        setShowSettlementModal(false);
        setPaymentRequest(null);
        fetchKhataLedger();
      } else {
        showToast(`Payment status is still: ${res.data.status?.toUpperCase() || 'pending'}`, 'info');
      }
    } catch (err) {
      console.error(err);
      showToast('Checking payment status failed.', 'error');
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleDownloadInvoice = async (invoiceId, txId) => {
    try {
      const res = await api.get(`/invoices/${invoiceId}/pdf/`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_tx_${txId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      showToast('Invoice download failed.', 'error');
    }
  };

  // Filter & Search & Sort logic
  const searchedProducts = products.filter(p => {
    const q = debouncedQuery.toLowerCase();
    const matchesQuery = 
      p.name.toLowerCase().includes(q) || 
      p.id.toString().includes(q) || 
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.barcode && p.barcode.toLowerCase().includes(q));
    
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesWishlist = !showWishlistOnly || wishlistIds.has(p.id);

    return matchesQuery && matchesCategory && matchesWishlist;
  });

  const sortedProducts = [...searchedProducts].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'price-low') return parseFloat(a.price) - parseFloat(b.price);
    if (sortBy === 'price-high') return parseFloat(b.price) - parseFloat(a.price);
    return 0;
  });

  const filteredProducts = sortedProducts;

  // Pagination for Khata transactions
  const txList = khataProfile?.transactions || [];
  const totalLedgerPages = Math.ceil(txList.length / ledgerPageSize);
  const paginatedTransactions = txList.slice(
    (ledgerCurrentPage - 1) * ledgerPageSize,
    ledgerCurrentPage * ledgerPageSize
  );

  // Curated premium local banners matching production retail applications
  const premiumLocalBanners = [
    {
      id: 'local-banner-1',
      title: 'Monsoon Grocery Carnival',
      description: 'Get Flat 10% discount on wholesale grain flour packs and cooking oils.',
      banner_type: 'OFFER',
      link_to_category: 'Staples'
    },
    {
      id: 'local-banner-2',
      title: 'Midnight Munchies & Snacks',
      description: 'Craving cookies, chocolates or cold drinks? Delivered to your doorstep in 12 mins!',
      banner_type: 'DISCOUNT',
      link_to_category: 'Snacks'
    },
    {
      id: 'local-banner-3',
      title: 'Zero Interest Khata Ledger',
      description: 'Buy groceries on credit. Clear balance via secure Razorpay UPI payments anytime.',
      banner_type: 'KHATA',
      link_to_category: 'Khata Book'
    },
    {
      id: 'local-banner-4',
      title: 'Fresh Organic Farm Produce',
      description: 'Directly sourced premium vegetables, fruits and dairy essentials. 100% natural.',
      banner_type: 'OFFER',
      link_to_category: 'Dairy & Produce'
    },
    {
      id: 'local-banner-5',
      title: 'Household Savings Bonanza',
      description: 'Flat 15% off on detergent packs, dishwashers, and weekly hygiene essentials.',
      banner_type: 'ANNOUNCEMENT',
      link_to_category: 'Household'
    }
  ];

  // Merge the database banners with local ones, filtering out local duplicates if title matches, to make exactly 5 items
  const uniqueBanners = [...banners];
  premiumLocalBanners.forEach(lb => {
    if (uniqueBanners.length < 5 && !uniqueBanners.some(b => b.title.toLowerCase().includes(lb.title.toLowerCase().substring(0, 8)))) {
      uniqueBanners.push(lb);
    }
  });
  while (uniqueBanners.length < 5) {
    uniqueBanners.push(premiumLocalBanners[uniqueBanners.length % premiumLocalBanners.length]);
  }
  const activeBanners = uniqueBanners.slice(0, 5);

  const getStockStatus = (qty) => {
    if (qty <= 0) return { text: 'OUT OF STOCK', color: 'bg-rose-50 text-rose-600 border-rose-100' };
    if (qty <= 5) return { text: 'LOW STOCK', color: 'bg-amber-50 text-amber-600 border-amber-100' };
    return { text: 'IN STOCK', color: 'bg-emerald-50 text-[#10B981] border-emerald-100' };
  };

  const getDeliveryEstimate = () => {
    return configs.DELIVERY_TIME || 'Deliver in 12 mins';
  };

  const renderCartButton = (product) => {
    const cartItem = cart.find(item => item.product.id === product.id);
    const isOutOfStock = product.stock_quantity <= 0;

    if (isOutOfStock) {
      return (
        <button
          disabled
          className="bg-slate-100 text-slate-400 font-semibold px-3 py-1.5 rounded-lg text-xs cursor-not-allowed border border-slate-200"
        >
          Sold Out
        </button>
      );
    }

    if (!cartItem) {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            const res = addToCart(product);
            showToast(res.message, res.success ? 'success' : 'error');
          }}
          className="bg-[#10B981] hover:bg-[#059669] text-white font-semibold px-3 py-1.5 rounded-lg text-xs shadow-sm active:scale-95 transition-all cursor-pointer"
        >
          Add +
        </button>
      );
    }

    return (
      <div 
        className="flex items-center space-x-1 border border-slate-200 bg-white rounded-lg p-0.5"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => {
            if (cartItem.quantity === 1) {
              removeFromCart(product.id);
              showToast('Product removed from cart.');
            } else {
              updateQuantity(product.id, cartItem.quantity - 1);
            }
          }}
          className="p-1 hover:bg-slate-50 text-slate-500 rounded cursor-pointer"
        >
          <FiMinus className="w-3 h-3" />
        </button>
        <span className="text-xs font-mono font-bold text-slate-800 px-1.5 min-w-[16px] text-center">
          {cartItem.quantity}
        </span>
        <button
          onClick={() => {
            const res = updateQuantity(product.id, cartItem.quantity + 1);
            if (res.success === false) {
              showToast(res.message, 'error');
            }
          }}
          className="p-1 hover:bg-slate-50 text-slate-550 rounded cursor-pointer"
        >
          <FiPlus className="w-3 h-3" />
        </button>
      </div>
    );
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto bg-[#F8FAFC] text-[#111827] flex flex-col justify-start relative text-left pb-20 md:pb-8">
      
      {/* Toast Alert */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 p-3.5 rounded-lg shadow-md border text-xs flex items-center space-x-2 font-medium animate-in fade-in slide-in-from-top-4 duration-300 ${
          toast.type === 'success' 
            ? 'bg-emerald-50/95 border-emerald-100 text-[#10B981]' 
            : toast.type === 'info'
            ? 'bg-blue-50/95 border-blue-100 text-blue-600'
            : 'bg-rose-50/95 border-rose-100 text-rose-600'
        }`}>
          {toast.type === 'success' ? <FiCheck className="w-4 h-4" /> : <FiAlertCircle className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── STATS / OVERVIEW BAR ── */}
      {!summaryLoading && summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-left font-medium">
          
          <div className="bg-white border-l-4 border-l-blue-500 border-slate-200/60 rounded-lg p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Total Orders</span>
              <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600">
                <FiShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <span className="text-xl font-bold font-mono text-slate-900 block">{summary.total_orders || 0}</span>
            <p className="text-[10px] text-slate-400 mt-1">Completed store checkouts</p>
          </div>

          <div className="bg-white border-l-4 border-l-[#10B981] border-slate-200/60 rounded-lg p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Loyalty Points</span>
              <div className="p-1.5 bg-emerald-50 rounded-lg text-[#10B981]">
                <FiGift className="w-4 h-4" />
              </div>
            </div>
            <span className="text-xl font-bold font-mono text-[#10B981] block">{summary.loyalty_points || 0}</span>
            <p className="text-[10px] text-slate-400 mt-1">Redeemable on checkout</p>
          </div>

          <div className="bg-white border-l-4 border-l-rose-500 border-slate-200/60 rounded-lg p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Khata Outstanding</span>
              <div className="p-1.5 bg-rose-50 rounded-lg text-rose-500">
                <FiLock className="w-4 h-4" />
              </div>
            </div>
            <span className="text-xl font-bold font-mono text-rose-600 block">₹{parseFloat(summary.current_balance !== undefined ? summary.current_balance : summary.khata_balance || 0).toFixed(2)}</span>
            <p className="text-[10px] text-slate-400 mt-1">Unpaid store balance due</p>
          </div>

          <div className="bg-white border-l-4 border-l-slate-800 border-slate-200/60 rounded-lg p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Credit Limit</span>
              <div className="p-1.5 bg-slate-100 rounded-lg text-slate-700">
                <FiUnlock className="w-4 h-4" />
              </div>
            </div>
            <span className="text-xl font-bold font-mono text-slate-800 block">₹{parseFloat(summary.credit_limit || 0).toFixed(2)}</span>
            <p className="text-[10px] text-slate-400 mt-1">Assigned digital credit limit</p>
          </div>

        </div>
      )}

      {/* STOREFRONT GROCERY CATALOG VIEW */}
      {!isKhataView && (
        <div className="space-y-6">
          
          {/* Quick outstanding alert strip */}
          {!khataLoading && khataProfile && parseFloat(khataProfile.current_balance) > 0 && (
            <div className="bg-rose-50/50 border border-rose-100 rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-left">
              <div className="flex items-start space-x-3">
                <div className="bg-rose-50 text-rose-600 p-2 rounded-lg border border-rose-100 shrink-0">
                  <FiLock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-slate-900 leading-tight">Pending credit balance statement</h4>
                  <p className="text-[11px] text-slate-500 mt-1">Outstanding total: <span className="font-bold text-rose-600 font-mono">₹{parseFloat(khataProfile.current_balance).toFixed(2)}</span>. Please clear payables online via UPI checkout.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSettleAmount(parseFloat(khataProfile.current_balance).toFixed(2));
                  setShowSettlementModal(true);
                  setPaymentRequest(null);
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-4 py-1.5 rounded-lg text-xs cursor-pointer transition-colors active:scale-95 shrink-0"
              >
                Clear Balance
              </button>
            </div>
          )}

          {/* Premium auto-sliding banner carousel */}
          <div className="relative rounded-xl overflow-hidden shadow-md group h-44 sm:h-52 bg-slate-100 flex items-stretch">
            {bannersLoading ? (
              <div className="w-full h-full animate-pulse bg-slate-200"></div>
            ) : (
              <div className="w-full h-full relative flex items-stretch overflow-hidden">
                {activeBanners.map((banner, index) => {
                  const type = banner.banner_type || banner.tag || 'OFFER';
                  
                  // Production level color gradients and accents matching Blinkit
                  const styles = {
                    OFFER: {
                      gradient: 'from-[#FF5E62] to-[#FF9966]',
                      icon: '🏷️',
                      badge: 'bg-white/20 text-white'
                    },
                    DISCOUNT: {
                      gradient: 'from-[#11998E] to-[#38EF7D]',
                      icon: '⚡',
                      badge: 'bg-white/20 text-white'
                    },
                    ANNOUNCEMENT: {
                      gradient: 'from-[#00c6ff] to-[#0072ff]',
                      icon: '📢',
                      badge: 'bg-white/20 text-white'
                    },
                    KHATA: {
                      gradient: 'from-[#8A2387] via-[#E94057] to-[#F27121]',
                      icon: '💳',
                      badge: 'bg-white/20 text-white'
                    }
                  };
                  const style = styles[type] || styles.OFFER;

                  const hasValidImage = banner.image_url && (banner.image_url.startsWith('http') || banner.image_url.startsWith('/'));

                  return (
                    <div
                      key={banner.id || index}
                      className={`absolute inset-0 transition-opacity duration-700 flex items-stretch ${
                        index === activeBannerIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                      }`}
                    >
                      <div className={`w-full flex flex-col md:flex-row items-stretch justify-between p-6 sm:p-8 text-white bg-gradient-to-r ${style.gradient} relative overflow-hidden flex-1`}>
                        {/* Decorative circles */}
                        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-xl pointer-events-none" />
                        <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-white/5 blur-lg pointer-events-none" />
                        
                        <div className="flex flex-col justify-between relative z-10 max-w-lg text-left">
                          <div className="space-y-1.5">
                            <span className={`${style.badge} px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider inline-block`}>
                              {type}
                            </span>
                            <h3 className="text-xl sm:text-2xl font-bold leading-tight tracking-tight drop-shadow-xs">
                              {banner.title}
                            </h3>
                            <p className="text-xs text-white/95 font-medium leading-relaxed drop-shadow-xs">
                              {banner.description}
                            </p>
                          </div>
                          {banner.link_to_category && (
                            <button
                              onClick={() => setSelectedCategory(banner.link_to_category)}
                              className="bg-white text-slate-900 hover:bg-slate-50 font-bold text-xs px-4 py-2 rounded-lg w-max mt-4 shadow-md cursor-pointer transition-transform duration-200 active:scale-95"
                            >
                              Explore {banner.link_to_category} &rarr;
                            </button>
                          )}
                        </div>
                        
                        {/* Right side graphic or image with robust broken-image recovery */}
                        <div className="hidden md:flex w-1/3 items-center justify-center relative overflow-hidden rounded-xl border border-white/20 bg-white/10 backdrop-blur-xs shadow-inner">
                          {hasValidImage ? (
                            <img 
                              src={banner.image_url} 
                              alt={banner.title} 
                              className="w-full h-full object-cover" 
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}

                          <div 
                            className="absolute inset-0 flex flex-col items-center justify-center text-center p-4"
                            style={{ 
                              display: !hasValidImage ? 'flex' : 'none' 
                            }}
                          >
                            <span className="text-5xl mb-2 animate-bounce">{style.icon}</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                              {type}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {activeBanners.length > 1 && (
                  <>
                    {/* Navigation Dots */}
                    <div className="absolute bottom-4 left-6 z-20 flex space-x-1.5">
                      {activeBanners.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveBannerIndex(idx)}
                          className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                            idx === activeBannerIndex ? 'bg-white w-4' : 'bg-white/40 hover:bg-white/60'
                          }`}
                        />
                      ))}
                    </div>

                    {/* Navigation Chevrons */}
                    <button
                      onClick={() => setActiveBannerIndex(prev => (prev - 1 + activeBanners.length) % activeBanners.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border border-white/10 transition-all opacity-0 group-hover:opacity-100 cursor-pointer active:scale-90 backdrop-blur-xs"
                      title="Previous Offer"
                    >
                      <FiChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setActiveBannerIndex(prev => (prev + 1) % activeBanners.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border border-white/10 transition-all opacity-0 group-hover:opacity-100 cursor-pointer active:scale-90 backdrop-blur-xs"
                      title="Next Offer"
                    >
                      <FiChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Search, Sort and Layout filters (mobile fallback search) */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 leading-none">Browse Catalog</h2>
              <p className="text-slate-505 text-xs sm:text-sm mt-1.5 font-medium">Blinkit-style delivery. Zero immediate payment, checkout on Digital Khata ledger.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Mobile-only visible search input */}
              <div className="relative flex-1 sm:hidden">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <FiSearch className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full bg-white border border-slate-200 focus:border-[#10B981] rounded-lg py-2 pl-9 pr-4 text-xs text-slate-900 outline-none"
                />
              </div>

              <button
                onClick={() => setShowBarcodeScanner(true)}
                className="flex items-center justify-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-4 py-2 rounded-lg shadow-sm transition-all cursor-pointer text-xs active:scale-95"
                title="Scan grocery barcode"
              >
                <FiZap className="w-3.5 h-3.5 text-[#10B981]" />
                <span>Scan Barcode</span>
              </button>

              <div className="relative flex items-center bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-sm">
                <FiFilter className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent text-xs text-slate-700 font-semibold outline-none cursor-pointer"
                >
                  <option value="name">Sort: Name (A-Z)</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>

              <button
                onClick={() => setShowWishlistOnly(!showWishlistOnly)}
                className={`p-2 rounded-lg border transition-all duration-200 shadow-sm cursor-pointer flex items-center justify-center ${
                  showWishlistOnly 
                    ? 'bg-rose-50 border-rose-100 text-rose-600' 
                    : 'bg-white border-slate-200 text-slate-400 hover:text-rose-500'
                }`}
                title="View wishlisted items only"
              >
                <FiHeart className={`w-4 h-4 ${showWishlistOnly ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>

          {/* Catalog Row Subsections (Buy Again, Best Sellers, Trending, Recommended) */}
          {!showWishlistOnly && !searchQuery && (
            <div className="space-y-6">
              
              {/* Buy Again section */}
              {buyAgainProducts.length > 0 && (
                <div className="space-y-3 text-left">
                  <div className="flex items-center space-x-1.5">
                    <FiRefreshCw className="text-[#10B981] w-4 h-4 shrink-0" />
                    <h3 className="font-semibold text-slate-800 text-sm sm:text-base uppercase tracking-wider text-[10px]">Buy Again</h3>
                  </div>
                  <div className="flex items-stretch space-x-4 overflow-x-auto pb-3 scrollbar-none">
                    {buyAgainProducts.map(p => (
                      <div key={p.id} className="w-44 bg-white border border-slate-200/60 rounded-lg p-3.5 shadow-sm flex flex-col justify-between shrink-0 hover:border-slate-350 hover:shadow-md transition-all duration-250 cursor-pointer relative" onClick={() => setQuickViewProduct(p)}>
                        <button 
                          onClick={(e) => handleToggleWishlist(e, p.id)}
                          className="absolute top-2.5 right-2.5 z-10 p-1.5 bg-white/90 hover:bg-white rounded-full text-slate-400 hover:text-rose-500 border border-slate-150 shadow-sm cursor-pointer"
                        >
                          <FiHeart className={`w-3.5 h-3.5 ${wishlistIds.has(p.id) ? 'fill-current text-rose-500' : ''}`} />
                        </button>
                        <div className="h-28 flex items-center justify-center overflow-hidden rounded-lg bg-slate-50 border-b border-slate-100">
                          {p.image ? (
                            <img src={p.image} alt={p.name} className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-350" />
                          ) : (
                            <FiShoppingBag className="w-7 h-7 text-slate-300" />
                          )}
                        </div>
                        <div className="mt-2.5 space-y-1">
                          <h4 className="font-bold text-xs text-slate-900 truncate">{p.name}</h4>
                          <div className="flex justify-between items-center mt-2.5">
                            <span className="font-bold text-xs text-slate-805 font-mono">₹{p.price}</span>
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
                              className="bg-[#10B981] hover:bg-[#059669] text-white text-[10px] font-semibold px-2.5 py-1 rounded shadow-sm transition-colors"
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
                  <div className="flex items-center space-x-1.5">
                    <FiZap className="text-amber-500 w-4 h-4 shrink-0 animate-pulse" />
                    <h3 className="font-semibold text-slate-800 text-sm sm:text-base uppercase tracking-wider text-[10px]">🔥 Best Sellers</h3>
                  </div>
                  <div className="flex items-stretch space-x-4 overflow-x-auto pb-3 scrollbar-none">
                    {bestSellers.map(p => (
                      <div key={p.id} className="w-40 bg-white border border-slate-200/60 rounded-lg p-3 shadow-sm flex flex-col justify-between shrink-0 hover:border-slate-355 hover:shadow-md transition-all duration-250 cursor-pointer relative" onClick={() => setQuickViewProduct(p)}>
                        <button 
                          onClick={(e) => handleToggleWishlist(e, p.id)}
                          className="absolute top-2.5 right-2.5 z-10 p-1.5 bg-white/90 hover:bg-white rounded-full text-slate-400 hover:text-rose-500 border border-slate-150 shadow-sm cursor-pointer"
                        >
                          <FiHeart className={`w-3.5 h-3.5 ${wishlistIds.has(p.id) ? 'fill-current text-rose-500' : ''}`} />
                        </button>
                        <div className="h-24 flex items-center justify-center overflow-hidden rounded-lg bg-slate-50 border-b border-slate-100">
                          {p.image ? (
                            <img src={p.image} alt={p.name} className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-350" />
                          ) : (
                            <FiShoppingBag className="w-5 h-5 text-slate-300" />
                          )}
                        </div>
                        <div className="mt-2.5 space-y-1">
                          <h4 className="font-bold text-xs text-slate-900 truncate">{p.name}</h4>
                          <span className="text-[9px] font-bold text-slate-400 block mt-0.5">{getStockStatus(p.stock_quantity).text}</span>
                          <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
                            <span className="font-bold text-xs text-slate-805 font-mono">₹{p.price}</span>
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
                  <div className="flex items-center space-x-1.5">
                    <FiLayers className="text-orange-500 w-4 h-4 shrink-0" />
                    <h3 className="font-semibold text-slate-800 text-sm sm:text-base uppercase tracking-wider text-[10px]">📈 Trending Products</h3>
                  </div>
                  <div className="flex items-stretch space-x-4 overflow-x-auto pb-3 scrollbar-none">
                    {trendingProducts.map(p => (
                      <div key={p.id} className="w-40 bg-white border border-slate-200/60 rounded-lg p-3 shadow-sm flex flex-col justify-between shrink-0 hover:border-slate-355 hover:shadow-md transition-all duration-250 cursor-pointer relative" onClick={() => setQuickViewProduct(p)}>
                        <button 
                          onClick={(e) => handleToggleWishlist(e, p.id)}
                          className="absolute top-2.5 right-2.5 z-10 p-1.5 bg-white/90 hover:bg-white rounded-full text-slate-400 hover:text-rose-500 border border-slate-150 shadow-sm cursor-pointer"
                        >
                          <FiHeart className={`w-3.5 h-3.5 ${wishlistIds.has(p.id) ? 'fill-current text-rose-500' : ''}`} />
                        </button>
                        <div className="h-24 flex items-center justify-center overflow-hidden rounded-lg bg-slate-50 border-b border-slate-100">
                          {p.image ? (
                            <img src={p.image} alt={p.name} className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-350" />
                          ) : (
                            <FiShoppingBag className="w-5 h-5 text-slate-300" />
                          )}
                        </div>
                        <div className="mt-2.5 space-y-1">
                          <h4 className="font-bold text-xs text-slate-905 truncate">{p.name}</h4>
                          <span className="text-[9px] font-bold text-slate-400 block mt-0.5">{getStockStatus(p.stock_quantity).text}</span>
                          <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
                            <span className="font-bold text-xs text-slate-805 font-mono">₹{p.price}</span>
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
                  <div className="flex items-center space-x-1.5">
                    <FiGift className="text-teal-500 w-4 h-4 shrink-0" />
                    <h3 className="font-semibold text-slate-800 text-sm sm:text-base uppercase tracking-wider text-[10px]">Recommended For You</h3>
                  </div>
                  <div className="flex items-stretch space-x-4 overflow-x-auto pb-3 scrollbar-none">
                    {recommendations.map(p => (
                      <div key={p.id} className="w-40 bg-white border border-slate-200/60 rounded-lg p-3 shadow-sm flex flex-col justify-between shrink-0 hover:border-slate-355 hover:shadow-md transition-all duration-250 cursor-pointer relative" onClick={() => setQuickViewProduct(p)}>
                        <button 
                          onClick={(e) => handleToggleWishlist(e, p.id)}
                          className="absolute top-2.5 right-2.5 z-10 p-1.5 bg-white/95 hover:bg-white rounded-full text-slate-400 hover:text-rose-500 border border-slate-150 shadow-sm cursor-pointer"
                        >
                          <FiHeart className={`w-3.5 h-3.5 ${wishlistIds.has(p.id) ? 'fill-current text-rose-500' : ''}`} />
                        </button>
                        <div className="h-24 flex items-center justify-center overflow-hidden rounded-lg bg-slate-50 border-b border-slate-100">
                          {p.image ? (
                            <img src={p.image} alt={p.name} className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-350" />
                          ) : (
                            <FiShoppingBag className="w-5 h-5 text-slate-300" />
                          )}
                        </div>
                        <div className="mt-2.5 space-y-1">
                          <h4 className="font-bold text-xs text-slate-905 truncate">{p.name}</h4>
                          <span className="text-[9px] font-bold text-slate-400 block mt-0.5">{getStockStatus(p.stock_quantity).text}</span>
                          <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
                            <span className="font-bold text-xs text-slate-805 font-mono">₹{p.price}</span>
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

          {/* Sticky horizontal premium category filter chips */}
          <div className="sticky top-[58px] z-30 bg-[#F8FAFC]/95 backdrop-blur-sm border-t border-b border-slate-200/50 py-3.5 space-y-3.5">
            <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none pr-4">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4.5 py-2.5 rounded-lg text-xs font-bold whitespace-nowrap border cursor-pointer transition-all hover:-translate-y-0.5 ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-white text-slate-500 hover:text-slate-900 border-slate-205/60 hover:border-slate-350'
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
                <div key={i} className="bg-white border border-slate-200/60 rounded-lg p-5 h-[320px] shadow-sm animate-pulse space-y-4">
                  <div className="w-full h-40 bg-slate-100 rounded-lg"></div>
                  <div className="h-4 bg-slate-100 rounded w-2/3"></div>
                  <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((p) => {
                const stockInfo = getStockStatus(p.stock_quantity);

                return (
                  <div 
                    key={p.id} 
                    className="bg-white border border-slate-200/60 hover:border-slate-300 rounded-lg overflow-hidden transition-all duration-250 group flex flex-col h-full shadow-sm hover:shadow-md hover:-translate-y-0.5 relative cursor-pointer" 
                    onClick={() => setQuickViewProduct(p)}
                  >
                    {/* Wishlist item toggle overlay */}
                    <button 
                      onClick={(e) => handleToggleWishlist(e, p.id)}
                      className="absolute top-3 right-3 z-10 p-1.5 bg-white/95 hover:bg-white rounded-full text-slate-400 hover:text-rose-500 border border-slate-150 shadow-sm cursor-pointer transition-colors"
                      title="Add to wishlist"
                    >
                      <FiHeart className={`w-3.5 h-3.5 ${wishlistIds.has(p.id) ? 'fill-current text-rose-500' : ''}`} />
                    </button>

                    {/* Image Area */}
                    <div className="h-44 overflow-hidden relative bg-slate-50 flex items-center justify-center border-b border-slate-100">
                      {p.image ? (
                        <img 
                          src={p.image} 
                          alt={p.name}
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-350"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80';
                          }}
                        />
                      ) : (
                        <FiShoppingBag className="w-8 h-8 text-slate-300" />
                      )}
                      
                      <span className="absolute top-3 left-3 bg-white/95 text-slate-800 border border-slate-200 text-[9px] font-bold tracking-wider px-2 py-0.5 rounded shadow-sm uppercase font-mono">
                        {p.category || 'General'}
                      </span>

                      <span className="absolute bottom-3 left-3 bg-slate-900/80 text-white text-[9px] font-semibold px-2 py-0.5 rounded flex items-center space-x-1 shadow-sm font-mono">
                        <FiClock className="w-3 h-3 text-[#10B981]" />
                        <span>{getDeliveryEstimate()}</span>
                      </span>
                    </div>

                    {/* Details content */}
                    <div className="p-4.5 flex-1 flex flex-col justify-between space-y-3.5 text-left">
                      <div>
                        {/* Ratings & Tags */}
                        <div className="flex flex-wrap gap-1.5 items-center mb-2.5">
                          <span className="bg-amber-50 text-amber-600 text-[9.5px] font-bold px-1.5 py-0.5 rounded flex items-center space-x-0.5 border border-amber-100">
                            <FiStar className="w-3 h-3 fill-current text-amber-500" />
                            <span>{p.average_rating || '5.0'}</span>
                          </span>
                          {p.badges && p.badges.map((b, idx) => (
                            <span key={idx} className="bg-slate-50 text-slate-500 border border-slate-200 text-[8.5px] font-bold px-1.5 py-0.5 rounded uppercase">
                              {b.replace(/[^\w\s]/g, '')}
                            </span>
                          ))}
                        </div>

                        <h3 className="font-bold text-slate-900 text-xs sm:text-sm tracking-tight leading-tight group-hover:text-[#10B981] transition-colors truncate">
                          {p.name}
                        </h3>
                        <p className="text-[10.5px] text-slate-400 mt-1 font-medium leading-normal line-clamp-2">
                          {p.description || 'Fresh selected local grocery items.'}
                        </p>
                      </div>

                      {/* Pricing margins & actions */}
                      <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between mt-auto">
                        <div className="text-left font-mono">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[8.5px] font-bold border font-sans mb-1.5 ${stockInfo.color}`}>
                            {stockInfo.text}
                          </span>
                          <p className="font-bold text-sm sm:text-base text-slate-900 leading-none">₹{p.price}</p>
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
            <div className="bg-white border border-slate-200/60 rounded-lg py-20 px-4 flex flex-col items-center justify-center space-y-3.5 text-center shadow-sm">
              <div className="bg-slate-50 p-3.5 rounded-lg text-slate-400">
                <FiInbox className="w-7 h-7" />
              </div>
              <h3 className="text-slate-800 font-semibold text-sm">No grocery products found</h3>
              <p className="text-slate-400 text-xs max-w-sm">We couldn't find any products matching your active filters or wishlist selection.</p>
            </div>
          )}

          {/* Brand trust badges */}
          <div className="border-t border-slate-200/60 pt-10 pb-8 mt-10">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center text-xs text-slate-400">
              <div className="flex flex-col items-center space-y-1.5 p-3.5 bg-white border border-slate-200/60 rounded-lg shadow-sm font-semibold">
                <FiCheck className="text-[#10B981] w-4.5 h-4.5" />
                <span className="text-slate-700">Secure Payments</span>
              </div>
              <div className="flex flex-col items-center space-y-1.5 p-3.5 bg-white border border-slate-200/60 rounded-lg shadow-sm font-semibold">
                <FiCheck className="text-[#10B981] w-4.5 h-4.5" />
                <span className="text-slate-700">Trusted Local Store</span>
              </div>
              <div className="flex flex-col items-center space-y-1.5 p-3.5 bg-white border border-slate-200/60 rounded-lg shadow-sm font-semibold">
                <FiCheck className="text-[#10B981] w-4.5 h-4.5" />
                <span className="text-slate-700">Digital Khata Ledger</span>
              </div>
              <div className="flex flex-col items-center space-y-1.5 p-3.5 bg-white border border-slate-200/60 rounded-lg shadow-sm font-semibold">
                <FiCheck className="text-[#10B981] w-4.5 h-4.5" />
                <span className="text-slate-700">Same Day Delivery</span>
              </div>
              <div className="flex flex-col items-center space-y-1.5 p-3.5 bg-white border border-slate-200/60 rounded-lg shadow-sm font-semibold col-span-2 md:col-span-1">
                <FiCheck className="text-[#10B981] w-4.5 h-4.5" />
                <span className="text-slate-700">Customer Support</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Digital Khata Ledger View */}
      {isKhataView && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 leading-none">Digital Khata Ledger Book</h2>
            <p className="text-slate-505 text-xs sm:text-sm mt-1.5 font-medium font-medium">Track your balance liabilities, outstanding credit orders, and official payment logs.</p>
          </div>

          {khataLoading ? (
            <div className="space-y-6 animate-pulse">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white border border-slate-200/60 rounded-lg p-6 h-28 shadow-sm"></div>
                ))}
              </div>
              <div className="bg-white border border-slate-200/60 rounded-lg p-6 h-60 shadow-sm"></div>
            </div>
          ) : khataLocked ? (
            <div className="max-w-md mx-auto bg-white border border-rose-100 rounded-lg p-8 sm:p-10 text-center space-y-6 shadow-sm mt-6">
              <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center border border-rose-100">
                <FiLock className="w-5 h-5" />
              </div>

              <div className="space-y-2 text-center">
                <h3 className="text-lg font-semibold text-slate-950 tracking-tight">Personal Khata Locked</h3>
                <p className="text-slate-400 text-xs leading-relaxed max-w-sm mx-auto font-medium">
                  Your shop credit access has been temporarily suspended by Shivam. Please contact the store management to settle unpaid debts and unlock your account.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200/60 rounded-lg p-5 max-w-xs mx-auto font-mono">
                <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mb-1 font-sans">Ledger Balance Liability</p>
                <p className="text-2xl font-semibold text-rose-600">₹{parseFloat(lockedBalance).toFixed(2)}</p>
                <p className="text-[9px] text-slate-400 mt-2 font-sans">Payments must be cleared directly at the checkout counter.</p>
              </div>

              <button
                onClick={fetchKhataLedger}
                className="bg-white hover:bg-slate-50 text-slate-707 border border-slate-200 px-4.5 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer active:scale-95"
              >
                Refresh Account Status
              </button>
            </div>
          ) : !khataProfile ? (
            <div className="bg-white border border-slate-200 rounded-lg py-16 px-4 flex flex-col items-center justify-center space-y-4 text-center shadow-sm">
              <div className="bg-slate-50 p-3.5 rounded-lg text-slate-400">
                <FiBookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-slate-805 font-semibold text-sm">Unable to load ledger</h3>
              <p className="text-slate-400 text-xs max-w-xs leading-normal">We couldn't retrieve your Khata ledger profile at this time. Please check your connection and retry.</p>
              <button 
                onClick={fetchKhataLedger}
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm cursor-pointer transition-all"
              >
                Retry Loading
              </button>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
                
                {/* Balance liability Card */}
                <div className="bg-white border border-slate-200/60 rounded-lg p-6 relative overflow-hidden flex flex-col justify-between shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Remaining Debt</span>
                    <span className="bg-rose-50 text-rose-500 p-1.5 rounded-lg border border-rose-100">
                      <FiLock className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div className="mt-4 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-2xl sm:text-3xl font-semibold text-rose-600 font-mono">₹{parseFloat(khataProfile.current_balance).toFixed(2)}</span>
                      <p className="text-[9.5px] text-slate-400 mt-1 font-light leading-none">Unpaid outstanding store credit balance</p>
                    </div>
                    <div className="flex flex-col space-y-2 mt-4 font-semibold">
                      {parseFloat(khataProfile.current_balance) > 0 && (
                        <button
                          onClick={() => {
                            setSettleAmount(parseFloat(khataProfile.current_balance).toFixed(2));
                            setShowSettlementModal(true);
                            setPaymentRequest(null);
                          }}
                          className="w-full bg-[#10B981] hover:bg-[#059669] text-white text-[11px] py-2 rounded-lg shadow-sm transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center space-x-1"
                        >
                          <FiZap className="w-3.5 h-3.5 shrink-0" />
                          <span>Settle Balance Online</span>
                        </button>
                      )}
                      
                      <button
                        onClick={handleRequestWhatsAppStatement}
                        disabled={requestingStatement}
                        className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[10px] py-1.5 rounded-lg shadow-sm transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center space-x-1 disabled:opacity-50"
                      >
                        <FiSend className="w-3 h-3 text-[#10B981]" />
                        <span>{requestingStatement ? 'Sending statement…' : 'Send to WhatsApp'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Total Credit Card */}
                <div className="bg-white border border-slate-200/60 rounded-lg p-6 relative overflow-hidden flex flex-col justify-between shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Credit purchases</span>
                    <span className="bg-slate-50 text-slate-500 p-1.5 rounded-lg border border-slate-200/50">
                      <FiArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div className="mt-4">
                    <span className="text-2xl sm:text-3xl font-semibold text-slate-900 font-mono">₹{parseFloat(khataProfile.total_credit).toFixed(2)}</span>
                    <p className="text-[9.5px] text-slate-400 mt-1 font-light leading-none">Sum of all grocery credits issued</p>
                  </div>
                </div>

                {/* Total Paid Card */}
                <div className="bg-white border border-slate-200/60 rounded-lg p-6 relative overflow-hidden flex flex-col justify-between shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total settled</span>
                    <span className="bg-emerald-50 text-[#10B981] p-1.5 rounded-lg border border-emerald-100">
                      <FiArrowDownLeft className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div className="mt-4">
                    <span className="text-2xl sm:text-3xl font-semibold text-[#10B981] font-mono">₹{parseFloat(khataProfile.total_paid).toFixed(2)}</span>
                    <p className="text-[9.5px] text-slate-405 mt-1 font-light leading-none">Total payments settled by cash or UPI</p>
                  </div>
                </div>

              </div>

              {/* Credit Limit Utilization Card */}
              {khataProfile.credit_limit !== undefined && (
                <div className="bg-white border border-slate-200/60 rounded-lg p-5 shadow-sm text-left">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Credit Limit Utilization</span>
                      <span className="text-xs text-slate-400 mt-0.5 block font-medium">Your store credit allowance</span>
                    </div>
                    <div className="text-right font-mono">
                      <span className={`text-sm font-semibold ${
                        (khataProfile.credit_limit - khataProfile.current_balance) <= 0 ? 'text-rose-600' : 'text-[#10B981]'
                      }`}>
                        ₹{Math.max(0, parseFloat(khataProfile.credit_limit) - parseFloat(khataProfile.current_balance)).toFixed(2)} left
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5 font-sans">of ₹{parseFloat(khataProfile.credit_limit).toFixed(2)} limit</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-700 ${
                        (parseFloat(khataProfile.current_balance) / parseFloat(khataProfile.credit_limit)) * 100 >= 100
                          ? 'bg-rose-500'
                          : (parseFloat(khataProfile.current_balance) / parseFloat(khataProfile.credit_limit)) * 100 >= 80
                          ? 'bg-amber-500'
                          : 'bg-[#10B981]'
                      }`}
                      style={{
                        width: `${Math.min(100, (parseFloat(khataProfile.current_balance) / parseFloat(khataProfile.credit_limit)) * 100)}%`
                      }}
                    />
                  </div>
                  <div className="flex justify-between items-center mt-2 text-xs font-mono text-slate-400">
                    <span className={`text-[9.5px] font-bold ${
                      (parseFloat(khataProfile.current_balance) / parseFloat(khataProfile.credit_limit)) * 100 >= 80 ? 'text-amber-600' : 'text-[#10B981]'
                    }`}>
                      {Math.min(100, ((parseFloat(khataProfile.current_balance) / parseFloat(khataProfile.credit_limit)) * 105)).toFixed(1)}% used
                    </span>
                    <span className="text-[9.5px] font-medium">
                      ₹{parseFloat(khataProfile.current_balance).toFixed(2)} outstanding
                    </span>
                  </div>
                </div>
              )}

              {/* Transactions Ledger Table */}
              <div className="bg-white border border-slate-200/60 rounded-lg overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 text-left">
                  <h3 className="font-semibold text-slate-905 text-sm uppercase tracking-wider text-[10px]">Ledger Statement Book</h3>
                  <div className="inline-flex items-center space-x-1.5 text-xs text-[#10B981] bg-emerald-50/50 px-2.5 py-0.5 rounded-full border border-emerald-100 font-bold">
                    <FiUnlock className="w-3.5 h-3.5" />
                    <span>Unlocked Ledger Access</span>
                  </div>
                </div>

                {khataProfile.transactions && khataProfile.transactions.length > 0 ? (
                  <div className="overflow-x-auto text-left">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200/60 text-[9.5px] uppercase font-bold tracking-wider text-slate-400 bg-slate-50/50">
                          <th className="py-3 px-5">Date</th>
                          <th className="py-3 px-5">Description</th>
                          <th className="py-3 px-5">Product Details</th>
                          <th className="py-3 px-5">Type</th>
                          <th className="py-3 px-5 text-right">Amount</th>
                          <th className="py-3 px-5 text-right">Remaining Balance</th>
                          <th className="py-3 px-5 text-center">Invoice</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedTransactions.map((tx) => (
                          <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors text-xs">
                            <td className="py-3.5 px-5 font-mono text-slate-400">
                              <span className="flex items-center space-x-1.5">
                                <FiCalendar className="text-slate-350 w-3.5 h-3.5" />
                                <span>{new Date(tx.created_at).toLocaleDateString()}</span>
                              </span>
                            </td>
                            <td className="py-3.5 px-5 text-slate-900 font-semibold">{tx.description || 'N/A'}</td>
                            <td className="py-3.5 px-5">
                              {tx.product_name ? (
                                <span className="bg-slate-50 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200/60 font-mono">
                                  {tx.product_name} x {tx.quantity || 1}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic text-[10px]">N/A</span>
                              )}
                            </td>
                            <td className="py-3.5 px-5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${
                                tx.transaction_type === 'CREDIT' 
                                  ? 'bg-rose-50 text-rose-600 border-rose-100' 
                                  : 'bg-emerald-50 text-[#10B981] border-emerald-100'
                              }`}>
                                {tx.transaction_type}
                              </span>
                            </td>
                            <td className={`py-3.5 px-5 font-bold font-mono text-right text-xs sm:text-sm ${
                                tx.transaction_type === 'CREDIT' ? 'text-rose-600' : 'text-emerald-600'
                            }`}>
                              {tx.transaction_type === 'CREDIT' ? '+' : '-'}₹{parseFloat(tx.amount).toFixed(2)}
                            </td>
                            <td className="py-3.5 px-5 font-bold font-mono text-slate-900 text-right text-xs sm:text-sm">
                              ₹{parseFloat(tx.remaining_balance_at_snapshot).toFixed(2)}
                            </td>
                            <td className="py-3.5 px-5 text-center">
                              {tx.invoice ? (
                                <button
                                  onClick={() => handleDownloadInvoice(tx.invoice, tx.id)}
                                  className="text-[#10B981] hover:text-[#059669] font-semibold text-[10px] bg-slate-50 border border-slate-200 hover:bg-slate-100 px-2.5 py-1 rounded transition-colors cursor-pointer"
                                >
                                  Download PDF
                                </button>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {totalLedgerPages > 1 && (
                      <div className="flex items-center justify-between px-5 py-3 border-t border-slate-150 bg-slate-50/50">
                        <button
                          onClick={() => setLedgerCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={ledgerCurrentPage === 1}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-655 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent rounded-lg cursor-pointer transition-all"
                        >
                          &larr; Previous
                        </button>
                        <span className="text-xs font-semibold text-slate-400 font-mono">
                          Page {ledgerCurrentPage} of {totalLedgerPages}
                        </span>
                        <button
                          onClick={() => setLedgerCurrentPage(prev => Math.min(prev + 1, totalLedgerPages))}
                          disabled={ledgerCurrentPage === totalLedgerPages}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-655 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent rounded-lg cursor-pointer transition-all"
                        >
                          Next &rarr;
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-16 flex flex-col items-center justify-center space-y-2 text-center text-xs text-slate-400">
                    <FiBookOpen className="w-6 h-6 text-slate-350" />
                    <p>No transactions recorded yet in your profile.</p>
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

      {/* Floating help WhatsApp Button */}
      <a
        href={`https://wa.me/${cleanPhoneForWhatsApp(configs.SUPPORT_PHONE) || '919876543210'}?text=Hello%20Shivam%20Kirana%20Store,%20I%20need%20help%20with%20my%20credit%20ledger.`}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-6 left-6 z-40 bg-[#10B981] hover:bg-[#059669] text-white p-3 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
        title="WhatsApp Support Contact"
      >
        <FaWhatsapp className="w-5 h-5" />
      </a>

      {/* Mobile Sticky Bottom Navigation Menu */}
      <div className="block md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200/80 z-40 py-2.5 px-4 flex justify-between shadow-md">
        <button
          onClick={() => {
            setMobileTab('home');
            window.history.pushState({}, '', '/dashboard');
            const event = new PopStateEvent('popstate');
            window.dispatchEvent(event);
          }}
          className={`flex flex-col items-center justify-center flex-1 cursor-pointer transition-colors ${
            mobileTab === 'home' && !isKhataView ? 'text-[#10B981] font-bold' : 'text-slate-400'
          }`}
        >
          <FiHome className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-medium">Home</span>
        </button>

        <button
          onClick={() => setIsCartOpen(true)}
          className="flex flex-col items-center justify-center flex-1 cursor-pointer transition-colors relative text-slate-400"
        >
          <FiShoppingCart className="w-5 h-5" />
          {cartCount > 0 && (
            <span className="absolute top-0 right-5 bg-rose-500 text-white rounded-full text-[8.5px] font-extrabold w-4 h-4 flex items-center justify-center font-mono">
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
            isKhataView ? 'text-[#10B981] font-bold' : 'text-slate-400'
          }`}
        >
          <FiBookOpen className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-medium">Khata</span>
        </button>
      </div>

      {/* 1. Product Quick View Modal */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col text-left">
            <button
              onClick={() => setQuickViewProduct(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all cursor-pointer z-20"
            >
              <FiX className="w-4 h-4" />
            </button>

            <div className="overflow-y-auto flex-1 p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start font-medium">
                
                <div className="w-full h-56 md:h-64 bg-slate-50 border border-slate-200 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
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
                    <FiShoppingBag className="w-12 h-12 text-slate-350" />
                  )}
                </div>

                <div className="space-y-3.5 text-left">
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="bg-slate-50 text-slate-800 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono">
                      {quickViewProduct.category || 'General'}
                    </span>
                    {quickViewProduct.badges && quickViewProduct.badges.map((b, i) => (
                      <span key={i} className="bg-amber-50 text-amber-605 border border-amber-200/40 text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase">
                        {b}
                      </span>
                    ))}
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                    {quickViewProduct.name}
                  </h3>

                  <div className="flex items-center space-x-3 text-xs">
                    <span className={`px-2 py-0.5 rounded border ${getStockStatus(quickViewProduct.stock_quantity).color}`}>
                      {getStockStatus(quickViewProduct.stock_quantity).text} (Stock: {quickViewProduct.stock_quantity})
                    </span>
                    <span className="text-slate-400 flex items-center space-x-1">
                      <FiClock className="w-3.5 h-3.5 text-slate-350" />
                      <span>{getDeliveryEstimate()}</span>
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed font-normal">
                    {quickViewProduct.description || 'No descriptive specifications provided. Standard certified local packaging.'}
                  </p>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold mb-1">Retail Price</p>
                      <span className="text-xl sm:text-2xl font-bold text-slate-900 font-mono">₹{quickViewProduct.price}</span>
                    </div>

                    <div className="flex items-center space-x-2 font-semibold">
                      <button
                        onClick={() => handleBuyNow(quickViewProduct)}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs shadow-sm cursor-pointer transition-colors active:scale-95"
                      >
                        Buy Now
                      </button>
                      <button
                        onClick={() => {
                          const res = addToCart(quickViewProduct);
                          showToast(res.message, res.success ? 'success' : 'error');
                        }}
                        className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors flex items-center space-x-1 shadow-sm active:scale-95"
                      >
                        <FiShoppingCart className="w-3.5 h-3.5 text-[#10B981]" />
                        <span>Add To Cart</span>
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              {/* Verified Product Reviews section */}
              <div className="pt-6 border-t border-slate-100 space-y-4">
                <h4 className="font-semibold text-slate-900 text-xs sm:text-sm uppercase tracking-wider text-[10px] flex items-center space-x-1.5">
                  <span>Customer Ratings &amp; Reviews</span>
                  <span className="text-xs bg-amber-50 text-amber-605 px-2 py-0.5 rounded border border-amber-250 font-mono">
                    ★ {quickViewProduct.average_rating || '5.0'} ({quickViewProduct.total_reviews || 0} reviews)
                  </span>
                </h4>

                <form onSubmit={handleSubmitReview} className="bg-slate-50 border border-slate-200/60 p-4 rounded-lg space-y-3 font-medium">
                  <span className="text-xs font-bold text-slate-800 block">Write a Review</span>
                  <div className="flex items-center space-x-2">
                    <label className="text-xs text-slate-400 font-semibold">Rating:</label>
                    <div className="flex space-x-1 text-amber-400">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewRating(star)}
                          className="hover:scale-110 transition-transform cursor-pointer"
                        >
                          <FiStar className={`w-4 h-4 ${star <= newRating ? 'fill-current text-amber-500' : ''}`} />
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
                      className="flex-1 bg-white border border-slate-200 focus:border-[#10B981] rounded-lg py-2 px-3 text-xs outline-none focus:ring-2 focus:ring-emerald-500/10"
                    />
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="bg-slate-900 hover:bg-slate-805 disabled:opacity-50 text-white font-bold text-xs px-4 rounded-lg shadow-sm cursor-pointer transition-colors active:scale-95 shrink-0"
                    >
                      {submittingReview ? 'Submitting…' : 'Post'}
                    </button>
                  </div>
                </form>

                <div className="space-y-3">
                  {reviewsLoading ? (
                    <div className="py-8 text-center text-xs text-slate-400">Loading reviews…</div>
                  ) : reviews.length > 0 ? (
                    reviews.map((r) => (
                      <div key={r.id} className="border border-slate-205 p-3.5 rounded-lg space-y-1.5 text-xs text-slate-500">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-800 capitalize">{r.user_username || 'Customer'}</span>
                            {r.is_verified_purchase && (
                              <span className="bg-emerald-50 text-primary border border-emerald-100 text-[8.5px] font-bold px-1.5 py-0.5 rounded uppercase font-mono">
                                Verified Purchase
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-405 font-mono">{new Date(r.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex space-x-0.5 text-amber-400">
                          {[...Array(5)].map((_, i) => (
                            <FiStar key={i} className={`w-3 h-3 ${i < r.rating ? 'fill-current text-amber-500' : ''}`} />
                          ))}
                        </div>
                        <p className="leading-normal font-normal text-slate-600">{r.review_text || 'Excellent product.'}</p>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-405 italic font-medium">No approved reviews yet. Be the first to write a review!</div>
                  )}
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

      {/* Online Payments settlement UPI QR Modal */}
      {showSettlementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-lg relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowSettlementModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all cursor-pointer"
            >
              <FiX className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-2.5 mb-5 text-left font-medium">
              <div className="bg-rose-50 text-rose-505 p-2 rounded-lg border border-rose-100">
                <FiZap className="w-4.5 h-4.5" />
              </div>
              <h3 className="text-lg font-semibold text-slate-950 tracking-tight leading-none">
                Settle Balance Online
              </h3>
            </div>

            {!paymentRequest ? (
              <form onSubmit={handleCreatePaymentLink} className="space-y-4 text-left font-medium">
                <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-lg font-mono">
                  <span className="text-[9.5px] uppercase font-bold tracking-wider text-slate-400 block font-sans">
                    Outstanding Debt Liability
                  </span>
                  <span className="text-2xl font-bold text-rose-605 block mt-1">
                    ₹{parseFloat(khataProfile.current_balance).toFixed(2)}
                  </span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-left">
                    Settlement Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={parseFloat(khataProfile.current_balance)}
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-[#10B981] rounded-lg py-2.5 px-3 text-xs sm:text-sm font-mono text-slate-905 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all"
                    placeholder="Enter amount to pay"
                    required
                  />
                  <span className="text-[9.5px] text-slate-400 mt-1 block leading-normal font-sans">
                    Must be greater than ₹0 and not exceed your total debt.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={settling}
                  className="w-full bg-slate-900 hover:bg-slate-805 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center space-x-1.5 shadow-sm active:scale-[0.98] transition-colors cursor-pointer text-xs sm:text-sm"
                >
                  {settling ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <FiZap className="w-3.5 h-3.5 text-[#10B981]" />
                      <span>Generate Payment Link</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="space-y-5 text-center font-medium">
                <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-lg text-left text-xs font-mono">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="font-sans">Payment ID</span>
                    <span className="text-slate-800 font-semibold">{paymentRequest.razorpay_payment_link_id}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400 mt-2">
                    <span className="font-sans">Amount</span>
                    <span className="text-slate-900 font-bold">₹{parseFloat(paymentRequest.amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400 mt-2">
                    <span className="font-sans">Status</span>
                    <span className="bg-amber-50 text-amber-705 px-2 py-0.5 rounded border border-amber-100 text-[9.5px] font-bold uppercase font-sans">
                      {paymentRequest.status}
                    </span>
                  </div>
                </div>

                <div className="py-1 flex flex-col items-center justify-center space-y-2">
                  <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-4 rounded-lg flex items-center justify-center w-36 h-36 relative">
                    <div className="text-center text-slate-400">
                      <FiZap className="w-8 h-8 mx-auto text-[#10B981] animate-bounce mb-1.5" />
                      <span className="text-[9.5px] font-bold uppercase tracking-wider block font-sans">Scan to Pay</span>
                      <span className="text-[8px] mt-0.5 block font-sans">UPI QR Generated</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-405 max-w-xs leading-normal font-normal">
                    Redirect to Razorpay hosted checkout to pay securely via PhonePe, GPay, Paytm, or UPI.
                  </p>
                </div>

                <div className="flex flex-col space-y-2 font-semibold">
                  <a
                    href={paymentRequest.razorpay_payment_link_url}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full bg-[#10B981] hover:bg-[#059669] text-white py-2.5 px-4 rounded-lg flex items-center justify-center space-x-1 shadow-sm transition-all active:scale-[0.98] cursor-pointer text-xs"
                  >
                    <span>Proceed to Pay (UPI/Web)</span>
                  </a>

                  <button
                    onClick={handleCheckPaymentStatus}
                    disabled={checkingStatus}
                    className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 py-2 px-4 rounded-lg flex items-center justify-center space-x-1.5 transition-all active:scale-[0.98] cursor-pointer text-xs"
                  >
                    {checkingStatus ? (
                      <div className="w-3.5 h-3.5 border-2 border-slate-700 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <FiRefreshCw className="w-3.5 h-3.5" />
                        <span>Check Confirmation</span>
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
