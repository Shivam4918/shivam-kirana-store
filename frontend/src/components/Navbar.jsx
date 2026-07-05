import { useContext, useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { CartContext } from '../context/CartContext';
import { useRealTime } from '../context/RealTimeContext';
import { 
  FiLogOut, FiUser, FiShoppingBag, FiBell, FiCheck, 
  FiAlertTriangle, FiInfo, FiShoppingCart, FiSearch, FiChevronDown, FiClock, FiX, FiMenu, FiLayers
} from 'react-icons/fi';
import api from '../services/api';

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
  const { cartCount, cartTotal, setIsCartOpen } = useContext(CartContext);
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

  const searchContainerRef = useRef(null);
  const notiRef = useRef(null);
  const profileRef = useRef(null);

  const showToast = (message) => {
    setToast({ message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await api.get('/notifications/');
      setNotifications(res.data);
      const unread = res.data.filter(n => !n.is_read).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  // Real-Time Notification updates
  const { subscribe } = useRealTime();
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribe('NOTIFICATION_RECEIVED', (data) => {
      if (data && data.id) {
        setNotifications(prev => [data, ...prev]);
        setUnreadCount(prev => prev + 1);
        showToast(data.message);
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

  // Search logic
  useEffect(() => {
    const fetchSearchProducts = async () => {
      try {
        const res = await api.get('/products/');
        setProducts(res.data);
      } catch (err) {
        console.error('Search products fetch error:', err);
      }
    };
    if (user && user.role === 'CUSTOMER') {
      fetchSearchProducts();
    }
  }, [user]);

  const handleSearchChange = (val) => {
    setSearchVal(val);
    setShowSuggestions(true);
    setActiveSuggestionIndex(-1);
  };

  const filteredCategories = searchVal
    ? Array.from(new Set(products.map(p => p.category).filter(Boolean))).filter(c =>
        c.toLowerCase().includes(searchVal.toLowerCase())
      ).slice(0, 3)
    : [];

  const filteredSuggestions = searchVal
    ? products.filter(p =>
        p.name.toLowerCase().includes(searchVal.toLowerCase())
      ).slice(0, 5)
    : [];

  const handleKeyDown = (e) => {
    const totalCount = filteredCategories.length + filteredSuggestions.length;
    if (totalCount === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev + 1) % totalCount);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev - 1 + totalCount) % totalCount);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeSuggestionIndex >= 0 && activeSuggestionIndex < totalCount) {
        if (activeSuggestionIndex < filteredCategories.length) {
          selectSuggestion(filteredCategories[activeSuggestionIndex]);
        } else {
          const prodIdx = activeSuggestionIndex - filteredCategories.length;
          selectSuggestion(filteredSuggestions[prodIdx].name);
        }
      } else if (searchVal.trim()) {
        selectSuggestion(searchVal.trim());
      }
    }
  };

  const selectSuggestion = (query) => {
    setSearchVal(query);
    setShowSuggestions(false);
    
    const searches = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(searches);
    localStorage.setItem('recentSearches', JSON.stringify(searches));

    navigate(`/dashboard?search=${encodeURIComponent(query)}`);
  };

  const clearHistory = (e) => {
    if (e) e.stopPropagation();
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
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
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#10B981]">
              {searchLoading ? (
                <svg className="animate-spin h-4 w-4 text-[#10B981]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <FiSearch className="w-4 h-4 text-slate-405" />
              )}
            </span>
            <input
              type="text"
              value={searchVal}
              onFocus={() => setShowSuggestions(true)}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search bread, milk, fresh oil, wheat atta..."
              className="w-full bg-slate-50/65 border border-slate-200 focus:border-[#10B981] focus:bg-white rounded-lg py-2.5 pl-9 pr-8 text-xs sm:text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:ring-2 focus:ring-emerald-500/10 min-h-[44px]"
              aria-label="Search products"
            />
            {searchVal && (
              <button 
                onClick={() => handleSearchChange('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-405 hover:text-slate-700 cursor-pointer min-h-[44px]"
                aria-label="Clear search"
              >
                <FiX className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Autocomplete dropdown overlay */}
          {showSuggestions && (
            <div className="absolute left-0 mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2.5 text-left text-xs animate-in fade-in slide-in-from-top-1 duration-200">
              {!searchVal ? (
                <div className="space-y-4 p-1">
                  {recentSearches.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center px-1 text-[9px] text-slate-400 uppercase font-extrabold tracking-wider">
                        <span>Recent Searches</span>
                        <button onClick={clearHistory} className="text-rose-500 hover:text-rose-600 hover:underline cursor-pointer lowercase font-bold">clear all</button>
                      </div>
                      <div className="space-y-0.5">
                        {recentSearches.map((s, idx) => (
                          <button
                            key={idx}
                            onClick={() => selectSuggestion(s)}
                            className="w-full flex items-center space-x-2 px-2.5 py-2 hover:bg-slate-55 rounded-xl text-slate-705 font-bold transition-all duration-150 cursor-pointer text-left min-h-[40px]"
                          >
                            <FiClock className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate">{s}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="px-1 text-[9px] text-slate-400 uppercase font-extrabold tracking-wider mb-2">Popular Searches</div>
                    <div className="flex flex-wrap gap-2 px-1">
                      {['Milk', 'Eggs', 'Wheat Atta', 'Cooking Oil', 'Bread', 'Butter'].map((tag, idx) => (
                        <button
                          key={idx}
                          onClick={() => selectSuggestion(tag)}
                          className="px-3 py-1.5 bg-slate-50 hover:bg-slate-105 hover:text-[#10B981] hover:border-slate-300 border border-slate-200 rounded-full text-[10px] font-bold text-slate-707 transition-all duration-200 cursor-pointer active:scale-95 min-h-[36px]"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5 p-1">
                  
                  {/* Category Suggestions */}
                  {filteredCategories.length > 0 && (
                    <div className="space-y-1">
                      <div className="px-1 text-[9px] text-slate-400 uppercase font-extrabold tracking-wider">Category Suggestions</div>
                      <div className="space-y-0.5">
                        {filteredCategories.map((cat, idx) => {
                          const isHighlighted = activeSuggestionIndex === idx;
                          return (
                            <button
                              key={cat}
                              onClick={() => selectSuggestion(cat)}
                              className={`w-full flex items-center justify-between px-2.5 py-2.5 rounded-xl transition-all duration-150 text-left font-bold cursor-pointer min-h-[40px] ${
                                isHighlighted ? 'bg-slate-100 text-[#10B981]' : 'hover:bg-slate-50 text-slate-707'
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                <FiLayers className="w-3.5 h-3.5 text-slate-400" />
                                <span>{cat}</span>
                              </div>
                              <span className="text-[9px] text-slate-400 font-semibold font-mono">category</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Product Suggestions */}
                  <div className="space-y-1">
                    <div className="px-1 text-[9px] text-slate-400 uppercase font-extrabold tracking-wider">Product Suggestions</div>
                    {filteredSuggestions.length > 0 ? (
                      <div className="space-y-0.5">
                        {filteredSuggestions.map((p, idx) => {
                          const flatIdx = filteredCategories.length + idx;
                          const isHighlighted = activeSuggestionIndex === flatIdx;
                          return (
                            <div
                              key={p.id}
                              onClick={() => selectSuggestion(p.name)}
                              className={`w-full flex items-center justify-between px-2.5 py-2.5 rounded-xl transition-all duration-150 cursor-pointer min-h-[44px] ${
                                isHighlighted ? 'bg-slate-105 text-[#10B981]' : 'hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center space-x-3 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-slate-55 border border-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                                  {p.image ? (
                                    <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <FiShoppingBag className="w-3.5 h-3.5 text-slate-350" />
                                  )}
                                </div>
                                <div className="min-w-0 text-left">
                                  <p className={`font-bold truncate ${isHighlighted ? 'text-[#10B981]' : 'text-slate-800'}`}>{p.name}</p>
                                  {p.category && (
                                    <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wide">{p.category}</span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-extrabold text-slate-900 font-mono">₹{p.price}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-3 text-center text-slate-400 italic">No products matched query.</div>
                    )}
                  </div>

                </div>
              )}
            </div>
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
