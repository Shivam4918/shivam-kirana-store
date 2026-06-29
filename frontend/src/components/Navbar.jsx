import { useContext, useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { CartContext } from '../context/CartContext';
import { 
  FiLogOut, FiUser, FiShoppingBag, FiBell, FiCheck, 
  FiAlertTriangle, FiInfo, FiShoppingCart, FiSearch, FiMapPin, FiChevronDown, FiClock, FiX 
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

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const { cartCount, cartTotal, setIsCartOpen } = useContext(CartContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Notification States
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notiDropdownOpen, setNotiDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Search & Suggestions States
  const [searchVal, setSearchVal] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [products, setProducts] = useState([]);
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

  // Sync searchVal with URL query param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchVal(params.get('search') || '');
  }, [location.search]);

  // Fetch product catalog for suggestions
  const fetchProducts = async () => {
    if (!user || user.role !== 'CUSTOMER') return;
    try {
      const res = await api.get('/products/');
      setProducts(res.data);
    } catch (err) {
      console.error('Error loading products for suggestions:', err);
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await api.get('/notifications/');
      setNotifications(res.data.slice(0, 8));
      const countRes = await api.get('/notifications/unread-count/');
      setUnreadCount(countRes.data.unread_count);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchProducts();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, [user]);

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
      console.error('Error marking all as read:', err);
    }
  };

  const handleMarkRead = async (id, e) => {
    e.stopPropagation();
    try {
      await api.post(`/notifications/${id}/mark-read/`);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const handleSearchChange = (val) => {
    setSearchVal(val);
    const params = new URLSearchParams(location.search);
    if (val) {
      params.set('search', val);
    } else {
      params.delete('search');
    }
    
    // If not on grocery storefront, redirect there
    if (location.pathname !== '/dashboard') {
      navigate(`/dashboard?${params.toString()}`);
    } else {
      navigate(`/dashboard?${params.toString()}`, { replace: true });
    }
  };

  const selectSuggestion = (query) => {
    handleSearchChange(query);
    setShowSuggestions(false);
    setRecentSearches(prev => {
      const next = [query, ...prev.filter(s => s !== query)].slice(0, 5);
      localStorage.setItem('recentSearches', JSON.stringify(next));
      return next;
    });
  };

  const clearHistory = (e) => {
    e.stopPropagation();
    localStorage.removeItem('recentSearches');
    setRecentSearches([]);
  };

  if (!user) return null;

  const filteredSuggestions = products.filter(p => {
    const q = searchVal.toLowerCase();
    return q && (
      p.name.toLowerCase().includes(q) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  }).slice(0, 5);

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-4 sm:px-6 py-3 flex items-center justify-between shadow-sm">
      
      {/* Brand logo & location details */}
      <div className="flex items-center space-x-3 sm:space-x-5 shrink-0">
        <Link to="/" className="flex items-center space-x-2.5">
          <div className="bg-[#10B981] p-2 rounded-lg text-white shadow-sm flex items-center justify-center">
            <FiShoppingBag className="w-5 h-5" />
          </div>
          <div className="hidden xs:block text-left">
            <h1 className="font-semibold text-sm sm:text-base tracking-tight text-slate-900 leading-none">
              Shivam <span className="text-[#10B981] font-bold">Kirana</span>
            </h1>
            <p className="text-[9px] text-slate-400 mt-0.5 font-medium tracking-wide">Smart Retail ERP</p>
          </div>
        </Link>

        {user.role === 'CUSTOMER' && (
          <div className="hidden md:flex flex-col text-left border-l border-slate-200 pl-4">
            <span className="text-[9px] font-bold text-[#10B981] tracking-wider uppercase leading-none">Delivery in 12 Mins</span>
            <div className="flex items-center text-slate-800 text-xs font-semibold mt-1 cursor-pointer group">
              <FiMapPin className="mr-1 text-slate-400 group-hover:text-[#10B981] transition-colors" />
              <span>HSR Layout, Sector 6, Bangalore</span>
              <FiChevronDown className="ml-1 text-slate-400 group-hover:text-slate-700" />
            </div>
          </div>
        )}
      </div>

      {/* Central search bar with dynamic autocomplete suggestions */}
      {user.role === 'CUSTOMER' && (
        <div ref={searchContainerRef} className="flex-1 max-w-lg mx-4 sm:mx-8 relative hidden sm:block">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <FiSearch className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchVal}
              onFocus={() => setShowSuggestions(true)}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search bread, milk, fresh oil, wheat atta..."
              className="w-full bg-slate-50 border border-slate-200 focus:border-[#10B981] focus:bg-white rounded-lg py-2 pl-9 pr-8 text-xs sm:text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:ring-2 focus:ring-emerald-500/10"
            />
            {searchVal && (
              <button 
                onClick={() => handleSearchChange('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <FiX className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Autocomplete dropdown overlay */}
          {showSuggestions && (
            <div className="absolute left-0 mt-1.5 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-50 p-2 text-left text-xs">
              {!searchVal ? (
                <>
                  {recentSearches.length > 0 && (
                    <div className="mb-2">
                      <div className="flex justify-between items-center px-2 py-1 text-[9px] text-slate-400 uppercase font-bold tracking-wider">
                        <span>Recent Searches</span>
                        <button onClick={clearHistory} className="text-rose-500 hover:underline cursor-pointer lowercase">clear</button>
                      </div>
                      {recentSearches.map((s, idx) => (
                        <button
                          key={idx}
                          onClick={() => selectSuggestion(s)}
                          className="w-full flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 rounded text-slate-700 font-medium cursor-pointer"
                        >
                          <FiClock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{s}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div>
                    <div className="px-2 py-1 text-[9px] text-slate-400 uppercase font-bold tracking-wider">Popular Searches</div>
                    <div className="flex flex-wrap gap-1.5 p-1.5">
                      {['Milk', 'Eggs', 'Wheat Atta', 'Cooking Oil', 'Bread', 'Butter'].map((tag, idx) => (
                        <button
                          key={idx}
                          onClick={() => selectSuggestion(tag)}
                          className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-[10px] font-semibold text-slate-700 cursor-pointer"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <div className="px-2 py-1 text-[9px] text-slate-400 uppercase font-bold tracking-wider border-b border-slate-100 pb-1.5 mb-1.5">
                    Matching Items
                  </div>
                  {filteredSuggestions.length > 0 ? (
                    filteredSuggestions.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => selectSuggestion(p.name)}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-slate-50 rounded cursor-pointer transition-colors"
                      >
                        <span className="font-semibold text-slate-800">{p.name}</span>
                        <span className="font-bold text-slate-400 font-mono">₹{p.price}</span>
                      </div>
                    ))
                  ) : (
                    <div className="py-3 text-center text-slate-400 italic">No products matched query.</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Right icons, cart, notifications, and profile details */}
      <div className="flex items-center space-x-3.5 ml-auto">
        
        {/* Date / Greeting */}
        <div className="hidden lg:flex flex-col text-right pr-2">
          <span className="text-[10px] text-slate-400 font-bold uppercase leading-none">{formattedDate}</span>
          <span className="text-xs font-semibold text-slate-700 mt-1 capitalize leading-none">Hi, {user.username}!</span>
        </div>

        {/* Shopping Cart Button */}
        {user.role === 'CUSTOMER' && (
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white transition-all shadow-sm cursor-pointer active:scale-95 shrink-0"
            title="Shopping Cart"
          >
            <div className="relative">
              <FiShoppingCart className="w-4 h-4 text-white" />
              {cartCount > 0 && (
                <span className="absolute -top-2.5 -right-2.5 bg-rose-500 text-white rounded-full text-[8px] font-bold w-4 h-4 flex items-center justify-center font-mono border border-white">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="text-xs font-semibold hidden md:inline-block">
              {cartCount > 0 ? `₹${cartTotal.toFixed(2)}` : 'Cart'}
            </span>
          </button>
        )}

        {/* Notification Bell Panel */}
        <div ref={notiRef} className="relative">
          <button
            onClick={() => setNotiDropdownOpen(!notiDropdownOpen)}
            className="relative p-2 rounded-lg bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 border border-slate-200 transition-colors cursor-pointer"
            title="Notifications"
          >
            <FiBell className="w-4.5 h-4.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full text-[8.5px] font-bold w-4 h-4 flex items-center justify-center font-mono">
                {unreadCount}
              </span>
            )}
          </button>

          {notiDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-lg z-50 p-2 text-left">
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
                          className="text-slate-300 hover:text-[#10B981] p-0.5"
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
            className="flex items-center space-x-1.5 p-1 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 border border-slate-200">
              <FiUser className="w-3.5 h-3.5 text-slate-655" />
            </div>
            <FiChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 text-left font-medium">
              <div className="px-3.5 py-2 border-b border-slate-100 text-xs">
                <p className="font-bold text-slate-900 capitalize">{user.username}</p>
                <span className="text-[9px] font-bold text-slate-400 block uppercase mt-0.5">{user.role}</span>
              </div>
              <button
                onClick={logout}
                className="w-full text-left px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center space-x-2 cursor-pointer font-semibold transition-colors"
              >
                <FiLogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>

      </div>

    </nav>
  );
};

export default Navbar;
