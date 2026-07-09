// Live deployment trigger: 2026-07-07
import { useContext, useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { CartContext } from '../context/CartContext';
import { useRealTime } from '../context/RealTimeContext';
import { 
  FiLogOut, FiUser, FiShoppingBag, FiBell, FiCheck, 
  FiAlertTriangle, FiInfo, FiShoppingCart, FiSearch, FiChevronDown, FiClock, FiX, FiMenu, FiLayers,
  FiMic, FiHeart, FiTag, FiClipboard, FiArrowLeft, FiMaximize
} from 'react-icons/fi';
import api from '../services/api';
import BarcodeScanner from './BarcodeScanner';
import { createPortal } from 'react-dom';
import OptimizedImage from './OptimizedImage';

const ALIAS_MAP = {
  'atta': ['flour', 'wheat'],
  'wheat': ['atta'],
  'namak': ['salt'],
  'salt': ['namak'],
  'oil': ['tel', 'mustard', 'refine'],
  'tel': ['oil'],
  'chawal': ['rice'],
  'rice': ['chawal'],
  'dal': ['pulse', 'lentil'],
  'dahi': ['curd', 'yogurt'],
  'curd': ['dahi'],
  'paneer': ['cheese'],
  'butter': ['makhan'],
  'milk': ['dudh', 'dairy']
};

const cleanPhoneForWhatsApp = (phone) => {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('00')) cleaned = cleaned.substring(2);
  else if (cleaned.startsWith('0') && cleaned.length === 11) cleaned = cleaned.substring(1);
  if (cleaned.length === 10) return `91${cleaned}`;
  return cleaned;
};

const Navbar = ({ onToggleSidebar }) => {
  const { user, logout } = useContext(AuthContext);
  const { cartCount, cartTotal, setIsCartOpen, addToCart } = useContext(CartContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Notification States
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notiDropdownOpen, setNotiDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [seenNotiIds, setSeenNotiIds] = useState(new Set());
  const [toast, setToast] = useState(null);

  // Search & Suggestions States
  const [searchVal, setSearchVal] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [products, setProducts] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('recentSearches') || '[]');
    } catch {
      return [];
    }
  });

  const [wishlistItems, setWishlistItems] = useState([]);
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const [recentOrders, setRecentOrders] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [debouncedSearchVal, setDebouncedSearchVal] = useState('');
  const [isListening, setIsListening] = useState(false);

  const searchContainerRef = useRef(null);
  const notiRef = useRef(null);
  const profileRef = useRef(null);
  const recognitionRef = useRef(null);

  const showToast = (message) => {
    setToast({ message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchNotifications = async (isFirstLoad = false) => {
    if (!user) return;
    try {
      const res = await api.get('/notifications/');
      const newNotifications = res.data;
      
      const unread = newNotifications.filter(n => !n.is_read).length;
      setUnreadCount(unread);

      if (!isFirstLoad) {
        newNotifications.forEach(n => {
          if (!n.is_read && !seenNotiIds.has(n.id)) {
            setSeenNotiIds(prev => {
              const next = new Set(prev);
              next.add(n.id);
              return next;
            });
          }
        });
      } else {
        const initialSeen = new Set(newNotifications.map(n => n.id));
        setSeenNotiIds(initialSeen);
      }

      setNotifications(newNotifications);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    if (!user) return;
    
    // First load to populate the seen set
    fetchNotifications(true);

    // Poll notifications every 6 seconds as a fallback
    const interval = setInterval(() => {
      fetchNotifications(false);
    }, 6000);

    return () => clearInterval(interval);
  }, [user]);

  // Real-Time Notification updates
  const { subscribe } = useRealTime();
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribe('NOTIFICATION_RECEIVED', (data) => {
      if (data && data.id) {
        setNotifications(prev => {
          if (prev.some(n => n.id === data.id)) return prev;
          return [data, ...prev];
        });
        setUnreadCount(prev => prev + 1);
        
        // Add to seen set so background poll knows it's already processed
        setSeenNotiIds(prev => {
          const next = new Set(prev);
          next.add(data.id);
          return next;
        });
      }
    });
    return () => {
      unsubscribe();
    };
  }, [user, subscribe]);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
      if (notiRef.current && !notiRef.current.contains(e.target)) {
        setNotiDropdownOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/mark-all-read/');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Error marking notifications as read:', err);
    }
  };

  const handleMarkRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.post(`/notifications/${id}/mark-read/`);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  // 300ms Search Debounce
  useEffect(() => {
    if (!searchVal.trim()) {
      setDebouncedSearchVal('');
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const timer = setTimeout(() => {
      setDebouncedSearchVal(searchVal);
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchVal]);

  // Integrated Search Data Fetching (Products, Wishlist, Orders)
  const fetchSearchData = async () => {
    if (!user || user.role !== 'CUSTOMER') return;
    try {
      const [productsRes, wishlistRes, ordersRes] = await Promise.allSettled([
        api.get('/products/'),
        api.get('/wishlist/'),
        api.get('/orders/')
      ]);

      if (productsRes.status === 'fulfilled') {
        setProducts(productsRes.value.data);
      }
      if (wishlistRes.status === 'fulfilled') {
        setWishlistItems(wishlistRes.value.data);
        setWishlistIds(new Set(wishlistRes.value.data.map(item => item.product.id)));
      }
      if (ordersRes.status === 'fulfilled') {
        setRecentOrders(ordersRes.value.data);
      }
    } catch (err) {
      console.error('Error fetching search data:', err);
    }
  };

  useEffect(() => {
    if (user && user.role === 'CUSTOMER') {
      fetchSearchData();
    }
  }, [user]);

  const handleSearchChange = (val) => {
    setSearchVal(val);
    setShowSuggestions(true);
    setActiveSuggestionIndex(-1);
  };

  // Typo tolerance sequential match and alias mappings
  const fuzzyMatch = (targetText, queryText) => {
    if (!targetText || !queryText) return false;
    const target = targetText.toLowerCase();
    const query = queryText.toLowerCase().trim();

    if (target.includes(query)) return true;

    // Alias checks
    const aliases = ALIAS_MAP[query] || [];
    for (const alias of aliases) {
      if (target.includes(alias)) return true;
    }

    // Sequential regex match
    const escaped = query.replace(/[^a-z0-9]/g, '');
    if (escaped.length > 2) {
      const pattern = escaped.split('').join('.*');
      try {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(target)) return true;
      } catch (e) {}
    }
    return false;
  };

  const filteredCategories = useMemo(() => {
    if (!debouncedSearchVal) return [];
    const allCats = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    return allCats.filter(c => fuzzyMatch(c, debouncedSearchVal)).slice(0, 3);
  }, [debouncedSearchVal, products]);

  const filteredBrands = useMemo(() => {
    if (!debouncedSearchVal) return [];
    const allBrands = Array.from(new Set(products.map(p => p.brand).filter(Boolean)));
    return allBrands.filter(b => fuzzyMatch(b, debouncedSearchVal)).slice(0, 3);
  }, [debouncedSearchVal, products]);

  const filteredSuggestions = useMemo(() => {
    if (!debouncedSearchVal) return [];
    const query = debouncedSearchVal.toLowerCase().trim();
    return products.filter(p => {
      const nameMatch = fuzzyMatch(p.name, query);
      const brandMatch = p.brand && fuzzyMatch(p.brand, query);
      const categoryMatch = p.category && fuzzyMatch(p.category, query);
      const skuMatch = p.sku && p.sku.toLowerCase().includes(query);
      const barcodeMatch = p.barcode && p.barcode.toLowerCase().includes(query);
      return nameMatch || brandMatch || categoryMatch || skuMatch || barcodeMatch;
    }).slice(0, 5);
  }, [debouncedSearchVal, products]);

  const filteredWishlist = useMemo(() => {
    if (!debouncedSearchVal) return [];
    return wishlistItems.filter(item => 
      fuzzyMatch(item.product.name, debouncedSearchVal)
    ).slice(0, 3);
  }, [debouncedSearchVal, wishlistItems]);

  const filteredOrders = useMemo(() => {
    if (!debouncedSearchVal) return [];
    const query = debouncedSearchVal.toLowerCase().trim();
    return recentOrders.filter(order => {
      const numMatch = order.order_number.toLowerCase().includes(query);
      const itemMatch = order.items.some(item => fuzzyMatch(item.product_name, query));
      return numMatch || itemMatch;
    }).slice(0, 2);
  }, [debouncedSearchVal, recentOrders]);

  const filteredSearches = useMemo(() => {
    if (!debouncedSearchVal) return [];
    return recentSearches.filter(s => fuzzyMatch(s, debouncedSearchVal)).slice(0, 3);
  }, [debouncedSearchVal, recentSearches]);

  const allSuggestions = useMemo(() => {
    const list = [];
    if (!debouncedSearchVal) return list;

    filteredCategories.forEach(cat => {
      list.push({ type: 'category', value: cat, label: cat, uniqueId: `category-${cat}` });
    });

    filteredBrands.forEach(brand => {
      list.push({ type: 'brand', value: brand, label: brand, uniqueId: `brand-${brand}` });
    });

    filteredSuggestions.forEach(p => {
      list.push({ type: 'product', value: p, label: p.name, uniqueId: `product-${p.id}` });
    });

    filteredWishlist.forEach(item => {
      list.push({ type: 'wishlist', value: item.product, label: item.product.name, uniqueId: `wishlist-${item.product.id}` });
    });

    filteredOrders.forEach(order => {
      list.push({ type: 'order', value: order, label: `Order #${order.order_number}`, uniqueId: `order-${order.id}` });
    });

    filteredSearches.forEach(term => {
      list.push({ type: 'recent_search', value: term, label: term, uniqueId: `recent-${term}` });
    });

    return list;
  }, [debouncedSearchVal, filteredCategories, filteredBrands, filteredSuggestions, filteredWishlist, filteredOrders, filteredSearches]);

  const handleKeyDown = (e) => {
    const totalCount = allSuggestions.length;
    if (totalCount === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev + 1) % totalCount);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev - 1 + totalCount) % totalCount);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowSuggestions(false);
      setIsMobileSearchOpen(false);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeSuggestionIndex >= 0 && activeSuggestionIndex < totalCount) {
        const selected = allSuggestions[activeSuggestionIndex];
        if (selected.type === 'category' || selected.type === 'brand' || selected.type === 'recent_search') {
          selectSuggestion(selected.value);
        } else if (selected.type === 'product' || selected.type === 'wishlist') {
          selectSuggestion(selected.label);
        } else if (selected.type === 'order') {
          setShowSuggestions(false);
          setIsMobileSearchOpen(false);
          navigate('/dashboard/orders');
        }
      } else if (searchVal.trim()) {
        selectSuggestion(searchVal.trim());
      }
    }
  };

  const selectSuggestion = (query) => {
    setSearchVal(query);
    setShowSuggestions(false);
    setIsMobileSearchOpen(false);
    
    const searches = [query, ...recentSearches.filter(s => s !== query)].slice(0, 10);
    setRecentSearches(searches);
    localStorage.setItem('recentSearches', JSON.stringify(searches));

    navigate(`/dashboard?search=${encodeURIComponent(query)}`);
  };

  const clearHistory = (e) => {
    if (e) e.stopPropagation();
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  const deleteRecentSearch = (term, e) => {
    if (e) e.stopPropagation();
    const updated = recentSearches.filter(s => s !== term);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const getStockStatus = (qty) => {
    if (qty <= 0) return { text: 'OUT OF STOCK', color: 'bg-rose-50 text-rose-600 border-rose-100' };
    if (qty <= 5) return { text: 'LOW STOCK', color: 'bg-amber-50 text-amber-600 border-amber-100' };
    return { text: 'IN STOCK', color: 'bg-emerald-50 text-[#10B981] border-emerald-100' };
  };

  const getProductDesignDetails = (product) => {
    const discountPercent = (product.id % 3 === 0) ? 10 : (product.id % 5 === 0) ? 15 : 0;
    const rating = product.average_rating || (4.5 + (product.id % 6) * 0.1).toFixed(1);
    const reviewCount = product.reviews_count || ((product.id * 11) % 43 + 6);
    const stockInfo = getStockStatus(product.stock_quantity);

    return {
      discountPercent,
      rating,
      reviewCount,
      stockInfo
    };
  };

  const handleQuickAdd = (product, e) => {
    if (e) e.stopPropagation();
    const result = addToCart(product);
    if (result && result.message) {
      showToast(result.message);
    }
  };

  const handleToggleWishlist = async (product, e) => {
    if (e) e.stopPropagation();
    const productId = product.id;
    const isAdding = !wishlistIds.has(productId);

    setWishlistIds(prev => {
      const next = new Set(prev);
      if (isAdding) next.add(productId);
      else next.delete(productId);
      return next;
    });

    try {
      await api.post('/wishlist/toggle/', { product_id: productId });
      showToast(isAdding ? `${product.name} added to wishlist.` : `${product.name} removed from wishlist.`);
      const res = await api.get('/wishlist/');
      setWishlistItems(res.data);
      setWishlistIds(new Set(res.data.map(item => item.product.id)));
    } catch (err) {
      console.error('Error toggling wishlist:', err);
      showToast('Error updating wishlist.');
      setWishlistIds(prev => {
        const next = new Set(prev);
        if (isAdding) next.delete(productId);
        else next.add(productId);
        return next;
      });
    }
  };

  const startSpeechRecognition = () => {
    // If already listening, stop it and return
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Voice Search is not supported in this browser.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    // Fallback to navigator language or 'en-US' for maximum device dictation package compatibility
    recognition.lang = navigator.language || 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      showToast('Listening... Speak grocery items now.');
      
      // Blur active element to hide keyboard on mobile and prevent keyboard/mic capture conflicts
      if (window.innerWidth < 768) {
        document.activeElement?.blur();
      }
    };

    recognition.onerror = (e) => {
      console.error('Speech error:', e.error);
      setIsListening(false);
      if (e.error === 'no-speech') {
        showToast('No speech detected. Please speak clearly.');
      } else if (e.error === 'not-allowed') {
        showToast('Microphone permission denied. Please allow mic access.');
      } else if (e.error === 'audio-capture') {
        showToast('No microphone found. Please connect one.');
      } else if (e.error === 'network') {
        showToast('Network connection error.');
      } else if (e.error !== 'aborted') {
        showToast('Could not recognize voice. Please try again.');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      const currentText = finalTranscript || interimTranscript;
      if (currentText) {
        handleSearchChange(currentText);
      }
    };

    try {
      recognition.start();
    } catch (err) {
      console.error('Recognition start failed:', err);
      setIsListening(false);
    }
  };

  const renderSuggestionsList = () => {
    if (searchLoading) {
      return (
        <div className="space-y-4 p-2">
          <div className="space-y-2">
            <div className="h-3.5 w-20 bg-slate-100 animate-pulse rounded"></div>
            <div className="h-9 w-full bg-slate-50/50 animate-pulse rounded-xl border border-slate-100/50"></div>
          </div>
          <div className="space-y-2">
            <div className="h-3.5 w-24 bg-slate-100 animate-pulse rounded"></div>
            <div className="space-y-2.5">
              <div className="flex space-x-3 items-center">
                <div className="w-10 h-10 bg-slate-100 animate-pulse rounded-xl"></div>
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-2/3 bg-slate-100 animate-pulse rounded"></div>
                  <div className="h-3 w-1/3 bg-slate-100 animate-pulse rounded"></div>
                </div>
              </div>
              <div className="flex space-x-3 items-center">
                <div className="w-10 h-10 bg-slate-100 animate-pulse rounded-xl"></div>
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-1/2 bg-slate-100 animate-pulse rounded"></div>
                  <div className="h-3 w-1/4 bg-slate-100 animate-pulse rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (!searchVal) {
      const popularCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean))).slice(0, 5);
      const trendingProducts = products.filter(p => p.id % 6 === 3).slice(0, 3);
      
      return (
        <div className="space-y-5 p-1">
          {recentSearches.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-1 text-[9px] text-slate-400 uppercase font-extrabold tracking-wider">
                <span>Recent Searches</span>
                <button 
                  onClick={clearHistory} 
                  className="text-rose-500 hover:text-rose-600 hover:underline cursor-pointer lowercase font-bold transition-all"
                >
                  clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recentSearches.map((s, idx) => (
                  <div 
                    key={idx}
                    onClick={() => selectSuggestion(s)}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-full text-xs font-bold transition-colors cursor-pointer border border-slate-150"
                  >
                    <FiClock className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate max-w-[120px]">{s}</span>
                    <button 
                      onClick={(e) => deleteRecentSearch(s, e)}
                      className="p-0.5 -mr-1 text-slate-400 hover:text-rose-500 cursor-pointer transition-colors"
                      title="Delete search history item"
                    >
                      <FiX className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="px-1 text-[9px] text-slate-400 uppercase font-extrabold tracking-wider mb-2">Trending Searches</div>
            <div className="flex flex-wrap gap-2 px-1">
              {['Milk', 'Eggs', 'Wheat Atta', 'Cooking Oil', 'Bread', 'Butter'].map((tag, idx) => (
                <button
                  key={idx}
                  onClick={() => selectSuggestion(tag)}
                  className="px-3.5 py-1.5 bg-emerald-50/50 hover:bg-emerald-55 hover:text-[#10B981] border border-emerald-100/50 rounded-full text-xs font-bold text-slate-700 transition-all duration-200 cursor-pointer active:scale-95 min-h-[36px]"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {popularCategories.length > 0 && (
            <div>
              <div className="px-1 text-[9px] text-slate-400 uppercase font-extrabold tracking-wider mb-2">Popular Categories</div>
              <div className="flex flex-wrap gap-2 px-1">
                {popularCategories.map((cat, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectSuggestion(cat)}
                    className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 hover:text-[#10B981] hover:border-slate-300 border border-slate-200 rounded-full text-xs font-bold text-slate-700 transition-all duration-200 cursor-pointer"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {trendingProducts.length > 0 && (
            <div className="space-y-2">
              <div className="px-1 text-[9px] text-slate-400 uppercase font-extrabold tracking-wider">Recommended Products</div>
              <div className="space-y-1.5">
                {trendingProducts.map((p) => {
                  const details = getProductDesignDetails(p);
                  return (
                    <div
                      key={p.id}
                      onClick={() => selectSuggestion(p.name)}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-50/40 hover:bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all cursor-pointer min-h-[64px]"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-white border border-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                          {p.image ? (
                            <OptimizedImage src={p.image} alt={p.name} className="w-full h-full object-cover" width={100} />
                          ) : (
                            <FiShoppingBag className="w-4 h-4 text-slate-350" />
                          )}
                        </div>
                        <div className="min-w-0 text-left">
                          <p className="font-bold text-xs text-slate-800 truncate">{p.name}</p>
                          <div className="flex items-center space-x-2 mt-0.5">
                            <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wide">{p.category}</span>
                            <span className="text-[8px] px-1 bg-amber-50 text-amber-600 border border-amber-100 rounded font-semibold">★ {details.rating}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 shrink-0">
                        <span className="font-extrabold text-slate-900 font-mono text-sm">₹{p.price}</span>
                        <button
                          onClick={(e) => handleQuickAdd(p, e)}
                          className="px-2.5 py-1.5 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg text-[10px] font-bold shadow-sm active:scale-95 transition-all cursor-pointer"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (allSuggestions.length === 0) {
      return (
        <div className="py-8 px-4 text-center space-y-3">
          <div className="text-slate-400 font-semibold text-xs">No products found for "{searchVal}"</div>
          <p className="text-slate-400 text-[10px] leading-relaxed">
            Try checking for spelling mistakes, or browse popular searches and categories below.
          </p>
          <div className="pt-2">
            <button 
              onClick={() => handleSearchChange('')}
              className="text-[#10B981] hover:text-[#059669] hover:underline text-[10px] font-bold cursor-pointer"
            >
              Reset Search & View Recommendations
            </button>
          </div>
        </div>
      );
    }

    const categoriesList = allSuggestions.filter(s => s.type === 'category');
    const brandsList = allSuggestions.filter(s => s.type === 'brand');
    const productsList = allSuggestions.filter(s => s.type === 'product');
    const wishlistList = allSuggestions.filter(s => s.type === 'wishlist');
    const ordersList = allSuggestions.filter(s => s.type === 'order');
    const searchesList = allSuggestions.filter(s => s.type === 'recent_search');

    let flatCounter = 0;

    return (
      <div className="space-y-4 p-1">
        {categoriesList.length > 0 && (
          <div className="space-y-1">
            <div className="px-1 text-[9px] text-slate-405 uppercase font-extrabold tracking-wider">Categories</div>
            <div className="space-y-0.5">
              {categoriesList.map(s => {
                const currentIdx = flatCounter++;
                const isSelected = activeSuggestionIndex === currentIdx;
                return (
                  <button
                    key={s.uniqueId}
                    onClick={() => selectSuggestion(s.value)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-all duration-150 text-left font-bold cursor-pointer min-h-[40px] ${
                      isSelected ? 'bg-emerald-50/50 text-[#10B981]' : 'hover:bg-slate-55 text-slate-750'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <FiLayers className="w-3.5 h-3.5 text-slate-400" />
                      <span>{s.label}</span>
                    </div>
                    <span className="text-[8px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-semibold uppercase tracking-wider">Category</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {brandsList.length > 0 && (
          <div className="space-y-1">
            <div className="px-1 text-[9px] text-slate-405 uppercase font-extrabold tracking-wider">Brands</div>
            <div className="space-y-0.5">
              {brandsList.map(s => {
                const currentIdx = flatCounter++;
                const isSelected = activeSuggestionIndex === currentIdx;
                return (
                  <button
                    key={s.uniqueId}
                    onClick={() => selectSuggestion(s.value)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-all duration-150 text-left font-bold cursor-pointer min-h-[40px] ${
                      isSelected ? 'bg-emerald-50/50 text-[#10B981]' : 'hover:bg-slate-55 text-slate-750'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <FiTag className="w-3.5 h-3.5 text-slate-400" />
                      <span>{s.label}</span>
                    </div>
                    <span className="text-[8px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-semibold uppercase tracking-wider">Brand</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {productsList.length > 0 && (
          <div className="space-y-1">
            <div className="px-1 text-[9px] text-slate-405 uppercase font-extrabold tracking-wider">Products</div>
            <div className="space-y-1">
              {productsList.map(s => {
                const p = s.value;
                const currentIdx = flatCounter++;
                const isSelected = activeSuggestionIndex === currentIdx;
                const details = getProductDesignDetails(p);
                const isWishlisted = wishlistIds.has(p.id);

                return (
                  <div
                    key={s.uniqueId}
                    onClick={() => selectSuggestion(p.name)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all duration-150 cursor-pointer border ${
                      isSelected ? 'bg-emerald-50/30 border-emerald-100 text-[#10B981]' : 'hover:bg-slate-50/70 border-slate-100/50'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-white border border-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                        {p.image ? (
                          <OptimizedImage src={p.image} alt={p.name} className="w-full h-full object-cover" width={100} />
                        ) : (
                          <FiShoppingBag className="w-4 h-4 text-slate-350" />
                        )}
                      </div>
                      <div className="min-w-0 text-left">
                        <p className={`font-bold text-xs truncate ${isSelected ? 'text-[#10B981]' : 'text-slate-800'}`}>{p.name}</p>
                        <div className="flex items-center space-x-2 mt-0.5 flex-wrap gap-y-1">
                          {p.brand && (
                            <span className="text-[8px] text-slate-405 font-extrabold uppercase tracking-wide">{p.brand}</span>
                          )}
                          <span className={`text-[8px] px-1 rounded-md border font-semibold ${details.stockInfo.color}`}>
                            {details.stockInfo.text}
                          </span>
                          {details.discountPercent > 0 && (
                            <span className="text-[8px] px-1 bg-rose-50 text-rose-600 border border-rose-100 rounded font-semibold">
                              {details.discountPercent}% OFF
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="font-extrabold text-slate-900 font-mono text-xs sm:text-sm">₹{p.price}</span>
                      
                      <button
                        onClick={(e) => handleToggleWishlist(p, e)}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                          isWishlisted 
                            ? 'bg-rose-50 text-rose-500 border-rose-100' 
                            : 'bg-white hover:bg-slate-50 text-slate-400 hover:text-rose-500 border-slate-200'
                        }`}
                        title={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
                      >
                        <FiHeart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-rose-500' : ''}`} />
                      </button>

                      <button
                        onClick={(e) => handleQuickAdd(p, e)}
                        disabled={p.stock_quantity <= 0}
                        className="px-2.5 py-1.5 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg text-[10px] font-bold shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none shrink-0"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {wishlistList.length > 0 && (
          <div className="space-y-1">
            <div className="px-1 text-[9px] text-slate-405 uppercase font-extrabold tracking-wider">Matching Wishlist</div>
            <div className="space-y-1">
              {wishlistList.map(s => {
                const p = s.value;
                const currentIdx = flatCounter++;
                const isSelected = activeSuggestionIndex === currentIdx;
                const details = getProductDesignDetails(p);

                return (
                  <div
                    key={s.uniqueId}
                    onClick={() => selectSuggestion(p.name)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all duration-150 cursor-pointer border ${
                      isSelected ? 'bg-emerald-50/30 border-emerald-100 text-[#10B981]' : 'hover:bg-slate-50/70 border-slate-100/50'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-rose-50/30 border border-rose-100/30 overflow-hidden flex items-center justify-center shrink-0">
                        {p.image ? (
                          <OptimizedImage src={p.image} alt={p.name} className="w-full h-full object-cover" width={100} />
                        ) : (
                          <FiShoppingBag className="w-4 h-4 text-rose-350" />
                        )}
                      </div>
                      <div className="min-w-0 text-left">
                        <p className={`font-bold text-xs truncate ${isSelected ? 'text-[#10B981]' : 'text-slate-800'}`}>{p.name}</p>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <span className="text-[8px] text-rose-500 font-extrabold uppercase tracking-wide flex items-center gap-0.5">
                            <FiHeart className="w-2 h-2 fill-rose-500" /> Wishlist
                          </span>
                          <span className={`text-[8px] px-1 rounded-md border font-semibold ${details.stockInfo.color}`}>
                            {details.stockInfo.text}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="font-extrabold text-slate-900 font-mono text-xs sm:text-sm">₹{p.price}</span>
                      
                      <button
                        onClick={(e) => handleToggleWishlist(p, e)}
                        className="p-1.5 bg-rose-50 text-rose-500 border border-rose-100 rounded-lg cursor-pointer"
                        title="Remove from Wishlist"
                      >
                        <FiHeart className="w-3.5 h-3.5 fill-rose-500" />
                      </button>

                      <button
                        onClick={(e) => handleQuickAdd(p, e)}
                        disabled={p.stock_quantity <= 0}
                        className="px-2.5 py-1.5 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg text-[10px] font-bold shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none shrink-0"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {ordersList.length > 0 && (
          <div className="space-y-1">
            <div className="px-1 text-[9px] text-slate-405 uppercase font-extrabold tracking-wider font-mono">Recent Orders</div>
            <div className="space-y-0.5">
              {ordersList.map(s => {
                const order = s.value;
                const currentIdx = flatCounter++;
                const isSelected = activeSuggestionIndex === currentIdx;

                return (
                  <button
                    key={s.uniqueId}
                    onClick={() => {
                      setShowSuggestions(false);
                      setIsMobileSearchOpen(false);
                      navigate('/dashboard/orders');
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2.5 rounded-xl transition-all duration-150 text-left font-bold cursor-pointer min-h-[44px] ${
                      isSelected ? 'bg-emerald-50/50 text-[#10B981]' : 'hover:bg-slate-55 text-slate-750'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <FiClipboard className="w-4 h-4 text-slate-400 shrink-0" />
                      <div className="min-w-0">
                        <span className="block font-mono text-slate-800 text-xs truncate">Order #{order.order_number}</span>
                        <span className="block text-[8px] text-slate-400 font-semibold truncate">
                          Contains: {order.items.map(item => item.product_name).join(', ')}
                        </span>
                      </div>
                    </div>
                    <span className="text-[8px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-semibold uppercase tracking-wider font-mono">Order</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {searchesList.length > 0 && (
          <div className="space-y-1">
            <div className="px-1 text-[9px] text-slate-405 uppercase font-extrabold tracking-wider">Search History</div>
            <div className="space-y-0.5">
              {searchesList.map(s => {
                const currentIdx = flatCounter++;
                const isSelected = activeSuggestionIndex === currentIdx;

                return (
                  <button
                    key={s.uniqueId}
                    onClick={() => selectSuggestion(s.value)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-all duration-150 text-left font-bold cursor-pointer min-h-[40px] ${
                      isSelected ? 'bg-emerald-50/50 text-[#10B981]' : 'hover:bg-slate-55 text-slate-750'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <FiClock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{s.label}</span>
                    </div>
                    <button 
                      onClick={(e) => deleteRecentSearch(s.value, e)}
                      className="p-1 hover:bg-slate-200 text-slate-400 hover:text-rose-500 rounded transition-colors"
                    >
                      <FiX className="w-3 h-3" />
                    </button>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!user) return null;

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  return (
    <nav className="sticky top-0 z-[40] w-full bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-4 sm:px-6 py-2.5 sm:py-3 flex flex-col md:flex-row md:items-center justify-between shadow-sm gap-2 shrink-0">
      
      {/* Top Row: Hamburger, Logo, and Right Icons (mobile) / Left section on Desktop */}
      <div className="flex items-center justify-between w-full md:w-auto shrink-0">
        <div className="flex items-center space-x-2 sm:space-x-4">
          {user && (
            <button
              onClick={onToggleSidebar}
              className="p-2 -ml-2 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors md:hidden cursor-pointer flex items-center justify-center shrink-0 min-w-[44px] min-h-[44px]"
              title="Toggle Menu"
              aria-label="Toggle Menu"
            >
              <FiMenu className="w-5 h-5" />
            </button>
          )}
          <Link to="/" className="flex items-center space-x-2">
            <div className="bg-[#10B981] p-1.5 rounded-lg text-white shadow-sm flex items-center justify-center">
              <FiShoppingBag className="w-4 h-4" />
            </div>
            <div className="flex flex-col text-left">
              <h1 className="font-extrabold text-xs sm:text-sm tracking-tight text-slate-900 leading-none">
                Shivam <span className="text-[#10B981]">Kirana</span>
              </h1>
              <p className="text-[8px] text-slate-400 mt-0.5 font-medium tracking-wide hidden xs:block">Smart Retail ERP</p>
            </div>
          </Link>
        </div>

        {/* Mobile-only right action icons (hidden on desktop) */}
        <div className="flex items-center space-x-2 md:hidden">
          
          {/* Shopping Cart Icon (Customer Only) */}
          {user.role === 'CUSTOMER' && (
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-slate-500 hover:text-[#10B981] rounded-lg hover:bg-slate-50 transition-all cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Shopping Cart"
              aria-label="Shopping Cart"
            >
              <div className="relative">
                <FiShoppingCart className="w-5 h-5 text-slate-655" />
                {cartCount > 0 && (
                  <span className="absolute -top-2.5 -right-2.5 bg-rose-500 text-white rounded-full text-[8.5px] font-bold w-4.5 h-4.5 flex items-center justify-center font-mono border border-white">
                    {cartCount}
                  </span>
                )}
              </div>
            </button>
          )}

          {/* Notification Bell Icon */}
          <div ref={notiRef} className="relative">
            <button
              onClick={() => setNotiDropdownOpen(!notiDropdownOpen)}
              className="relative p-2 rounded-lg text-slate-505 hover:text-slate-800 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Notifications"
              aria-label="Notifications"
              aria-expanded={notiDropdownOpen}
            >
              <FiBell className="w-5 h-5 text-slate-655" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
              )}
            </button>

            {notiDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-2 text-left">
                <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-800">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[10px] font-bold text-[#10B981] hover:underline cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-60 overflow-y-auto py-1">
                  {notifications.length > 0 ? (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        className={`flex items-start gap-2 p-2 rounded transition-colors text-xs relative ${
                          n.is_read ? 'hover:bg-slate-50 text-slate-400' : 'bg-emerald-50/10 hover:bg-emerald-50/20 text-slate-800 font-semibold'
                        }`}
                      >
                        <div className={`mt-0.5 p-0.5 rounded shrink-0 ${
                          n.notification_type.includes('STOCK') ? 'bg-amber-50 text-amber-505' :
                          n.notification_type.includes('OUTSTANDING') || n.notification_type.includes('DUE') ? 'bg-rose-50 text-rose-500' :
                          'bg-blue-50 text-blue-500'
                        }`}>
                          {n.notification_type.includes('STOCK') ? <FiAlertTriangle className="w-3 h-3" /> : <FiInfo className="w-3 h-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="leading-snug text-[10px] break-words">{n.message}</p>
                          <span className="text-[8.5px] text-slate-400 block mt-0.5">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-400 italic">No notifications yet.</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown Icon */}
          <div ref={profileRef} className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center justify-center p-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer min-w-[44px] min-h-[44px]"
              aria-label="User Profile"
              aria-expanded={profileDropdownOpen}
            >
              <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 border border-slate-200">
                <FiUser className="w-3.5 h-3.5 text-slate-655" />
              </div>
            </button>

            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 text-left font-medium">
                <div className="px-3.5 py-2 border-b border-slate-100 text-xs">
                  <p className="font-bold text-slate-900 capitalize">{user.username}</p>
                  <span className="text-[9px] font-bold text-slate-400 block uppercase mt-0.5">{user.role}</span>
                </div>
                <button
                  onClick={logout}
                  className="w-full text-left px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center space-x-2 cursor-pointer font-semibold transition-colors min-h-[40px]"
                >
                  <FiLogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Central search bar with dynamic autocomplete suggestions */}
      {user.role === 'CUSTOMER' && (
        <div ref={searchContainerRef} className="w-full md:flex-1 md:max-w-lg md:mx-8 relative">
          
          {/* Main search input for Desktop / trigger for Mobile */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#10B981]">
              <FiSearch className="w-4 h-4 text-slate-400" />
            </span>
            <input
              type="text"
              value={searchVal}
              onFocus={() => {
                setShowSuggestions(true);
                fetchSearchData();
                if (window.innerWidth < 768) {
                  setIsMobileSearchOpen(true);
                }
              }}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search bread, milk, fresh oil, wheat atta..."
              className="w-full bg-slate-50/65 border border-slate-200 focus:border-[#10B981] focus:bg-white rounded-lg py-2.5 pl-9 pr-20 text-xs sm:text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:ring-2 focus:ring-emerald-500/10 min-h-[44px]"
              aria-label="Search products, brands, categories"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center space-x-1.5 min-h-[44px]">
              <button
                type="button"
                onClick={startSpeechRecognition}
                className={`p-1 cursor-pointer transition-colors ${
                  isListening ? 'text-red-500 animate-pulse' : 'text-slate-405 hover:text-[#10B981]'
                }`}
                title="Voice Search"
                aria-label="Voice Search"
              >
                <FiMic className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="p-1 text-slate-405 hover:text-[#10B981] cursor-pointer transition-colors"
                title="Scan Barcode / SKU"
                aria-label="Scan Barcode / SKU"
              >
                <FiMaximize className="w-4 h-4" />
              </button>
              {searchVal && (
                <button 
                  onClick={() => handleSearchChange('')}
                  className="p-1 text-slate-405 hover:text-slate-700 cursor-pointer transition-colors"
                  aria-label="Clear search"
                >
                  <FiX className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Autocomplete dropdown overlay for Desktop */}
          {showSuggestions && (
            <div className="absolute left-0 mt-2 w-full max-h-[480px] overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-3 text-left text-xs animate-in fade-in slide-in-from-top-1 duration-200 hidden md:block">
              {renderSuggestionsList()}
            </div>
          )}

          {/* Mobile Full-Screen Overlay Search Modal */}
          {isMobileSearchOpen && createPortal(
            <div className="fixed inset-0 bg-white z-[9999] flex flex-col md:hidden animate-in fade-in duration-200">
              <div className="flex items-center space-x-3 p-4 border-b border-slate-100 shrink-0">
                <button 
                  onClick={() => setIsMobileSearchOpen(false)}
                  className="p-2 -ml-2 rounded-lg border border-slate-200 hover:bg-slate-55 text-slate-500 hover:text-slate-900 cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
                  aria-label="Back"
                >
                  <FiArrowLeft className="w-4.5 h-4.5" />
                </button>
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#10B981]">
                    <FiSearch className="w-4 h-4 text-slate-400" />
                  </span>
                  <input
                    type="text"
                    autoFocus
                    value={searchVal}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search grocery, khata, brands..."
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#10B981] focus:bg-white rounded-lg py-2.5 pl-9 pr-20 text-xs text-slate-900 placeholder-slate-400 outline-none transition-all focus:ring-2 focus:ring-emerald-500/10 min-h-[44px]"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center space-x-1.5 min-h-[44px]">
                    <button
                      type="button"
                      onClick={startSpeechRecognition}
                      className={`p-1 cursor-pointer transition-colors ${
                        isListening ? 'text-red-500 animate-pulse' : 'text-slate-400 hover:text-[#10B981]'
                      }`}
                      title="Voice Search"
                    >
                      <FiMic className="w-4.5 h-4.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileSearchOpen(false);
                        setShowScanner(true);
                      }}
                      className="p-1 text-[#10B981] hover:text-[#059669] cursor-pointer transition-colors"
                      title="Scan Barcode"
                    >
                      <FiMaximize className="w-4.5 h-4.5" />
                    </button>
                    {searchVal && (
                      <button 
                        onClick={() => handleSearchChange('')}
                        className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
                      >
                        <FiX className="w-4.5 h-4.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {renderSuggestionsList()}
              </div>
            </div>,
            document.body
          )}

          {/* Barcode Scanner Modal */}
          {showScanner && createPortal(
            <BarcodeScanner
              onScan={(code) => {
                setShowScanner(false);
                handleSearchChange(code);
                selectSuggestion(code);
              }}
              onClose={() => setShowScanner(false)}
              title="Scan Product Barcode"
            />,
            document.body
          )}

        </div>
      )}

      {/* Desktop-only right action icons, cart, notifications, and profile details */}
      <div className="hidden md:flex items-center space-x-3.5 ml-auto">
        
        {/* Date / Greeting */}
        <div className="hidden lg:flex flex-col text-right pr-2">
          <span className="text-[10px] text-slate-405 font-bold uppercase leading-none">{formattedDate}</span>
          <span className="text-xs font-semibold text-slate-700 mt-1 capitalize leading-none">Hi, {user.username}!</span>
        </div>

        {/* Shopping Cart Button */}
        {user.role === 'CUSTOMER' && (
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white transition-all shadow-sm cursor-pointer active:scale-95 shrink-0 min-h-[44px]"
            title="Shopping Cart"
            aria-label="Shopping Cart"
          >
            <div className="relative">
              <FiShoppingCart className="w-4 h-4 text-white" />
              {cartCount > 0 && (
                <span className="absolute -top-2.5 -right-2.5 bg-rose-500 text-white rounded-full text-[8px] font-bold w-4 h-4 flex items-center justify-center font-mono border border-white">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="text-xs font-semibold">
              {cartCount > 0 ? `₹${cartTotal.toFixed(2)}` : 'Cart'}
            </span>
          </button>
        )}

        {/* Notification Bell Panel */}
        <div ref={notiRef} className="relative">
          <button
            onClick={() => setNotiDropdownOpen(!notiDropdownOpen)}
            className="relative p-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-505 hover:text-slate-800 border border-slate-205 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Notifications"
            aria-label="Notifications"
            aria-expanded={notiDropdownOpen}
          >
            <FiBell className="w-4.5 h-4.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full text-[8.5px] font-bold w-4 h-4 flex items-center justify-center font-mono">
                {unreadCount}
              </span>
            )}
          </button>

          {notiDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-lg z-50 p-2 text-left animate-in fade-in duration-200">
              <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-800">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[10px] font-bold text-[#10B981] hover:underline cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-60 overflow-y-auto py-1">
                {notifications.length > 0 ? (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      className={`flex items-start gap-2 p-2 rounded transition-colors text-xs relative ${
                        n.is_read ? 'hover:bg-slate-50 text-slate-400' : 'bg-emerald-50/10 hover:bg-emerald-50/20 text-slate-800 font-semibold'
                      }`}
                    >
                      <div className={`mt-0.5 p-0.5 rounded shrink-0 ${
                        n.notification_type.includes('STOCK') ? 'bg-amber-50 text-amber-505' :
                        n.notification_type.includes('OUTSTANDING') || n.notification_type.includes('DUE') ? 'bg-rose-50 text-rose-500' :
                        'bg-blue-50 text-blue-500'
                      }`}>
                        {n.notification_type.includes('STOCK') ? <FiAlertTriangle className="w-3 h-3" /> : <FiInfo className="w-3 h-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="leading-snug text-[10px] break-words">{n.message}</p>
                        <span className="text-[8.5px] text-slate-400 block mt-0.5">
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {!n.is_read && (
                        <button
                          onClick={(e) => handleMarkRead(n.id, e)}
                          className="text-slate-350 hover:text-[#10B981] p-0.5"
                          aria-label="Mark notification as read"
                        >
                          <FiCheck className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-slate-400 italic">No notifications yet.</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center space-x-1.5 p-1 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer min-h-[44px]"
            aria-label="User Profile"
            aria-expanded={profileDropdownOpen}
          >
            <div className="w-7 h-7 rounded-full bg-slate-55 flex items-center justify-center text-slate-500 border border-slate-200">
              <FiUser className="w-3.5 h-3.5 text-slate-655" />
            </div>
            <FiChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-205 rounded-lg shadow-lg z-50 py-1 text-left font-medium">
              <div className="px-3.5 py-2 border-b border-slate-100 text-xs">
                <p className="font-bold text-slate-900 capitalize">{user.username}</p>
                <span className="text-[9px] font-bold text-slate-400 block uppercase mt-0.5">{user.role}</span>
              </div>
              <button
                onClick={logout}
                className="w-full text-left px-3.5 py-2.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center space-x-2 cursor-pointer font-semibold transition-colors min-h-[40px]"
              >
                <FiLogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-5 right-5 bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 shadow-xl z-[9999] flex items-center space-x-3 max-w-sm animate-in slide-in-from-bottom-5 duration-300">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 animate-ping" />
          <div className="text-xs font-semibold leading-relaxed pr-2">{toast.message}</div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white cursor-pointer text-xs font-black">✕</button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
