import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { CartContext } from '../context/CartContext';
import { FiLogOut, FiUser, FiShoppingBag, FiBell, FiCheck, FiAlertTriangle, FiInfo, FiShoppingCart } from 'react-icons/fi';
import api from '../services/api';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const { cartCount, cartTotal, setIsCartOpen } = useContext(CartContext);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await api.get('/notifications/');
      setNotifications(res.data.slice(0, 8)); // top 8 notifications
      
      const countRes = await api.get('/notifications/unread-count/');
      setUnreadCount(countRes.data.unread_count);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000); // Poll every 20 seconds
    return () => clearInterval(interval);
  }, [user]);

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

  if (!user) return null;

  return (
    <nav className="glass-panel sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between shadow-premium bg-white/80 border-b border-slate-200/60">
      <div className="flex items-center space-x-3">
        <div className="bg-primary p-2.5 rounded-xl text-white shadow-md shadow-emerald-500/20 flex items-center justify-center">
          <FiShoppingBag className="w-5.5 h-5.5" />
        </div>
        <div>
          <h1 className="font-extrabold text-lg tracking-tight text-secondary leading-none">
            Shivam <span className="text-primary font-bold">Kirana Store</span>
          </h1>
          <p className="text-[10px] text-text-secondary mt-0.5 font-medium tracking-wide">Digital Grocery & Khata Manager</p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        
        {/* Shopping Cart Button */}
        {user?.role === 'CUSTOMER' && (
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-primary border border-emerald-100 transition-all duration-200 shadow-sm cursor-pointer"
            title="Shopping Cart"
          >
            <div className="relative">
              <FiShoppingCart className="w-5 h-5 text-primary" />
              {cartCount > 0 && (
                <span className="absolute -top-2.5 -right-2.5 bg-rose-500 text-white rounded-full text-[9px] font-extrabold w-4.5 h-4.5 flex items-center justify-center border border-white animate-pulse">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="text-xs font-bold hidden sm:inline-block">
              {cartCount > 0 ? `₹${cartTotal.toFixed(2)}` : 'Cart'}
            </span>
          </button>
        )}

        {/* Notification Bell Panel */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="relative p-2.5 rounded-xl bg-white hover:bg-slate-50 text-text-secondary hover:text-primary border border-slate-200 hover:border-slate-300 transition-all duration-200 shadow-sm cursor-pointer"
            title="Notifications"
          >
            <FiBell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full text-[9px] font-extrabold w-5 h-5 flex items-center justify-center border-2 border-white animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-200/80 rounded-2xl shadow-premium-lg z-50 p-1.5 animate-in fade-in slide-in-from-top-4 duration-200">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
                <span className="text-xs font-bold text-secondary">Notification Center</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[10.5px] font-extrabold text-primary hover:text-primary-hover hover:underline cursor-pointer"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto py-1 space-y-0.5">
                {notifications.length > 0 ? (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl transition-colors text-xs text-left relative ${
                        n.is_read ? 'hover:bg-slate-50 text-text-secondary' : 'bg-emerald-50/20 hover:bg-emerald-50/40 text-secondary font-medium'
                      }`}
                    >
                      <div className={`mt-0.5 p-1 rounded-lg shrink-0 ${
                        n.notification_type.includes('STOCK') ? 'bg-amber-50 text-amber-500' :
                        n.notification_type.includes('OUTSTANDING') || n.notification_type.includes('DUE') ? 'bg-rose-50 text-rose-500' :
                        'bg-blue-50 text-blue-500'
                      }`}>
                        {n.notification_type.includes('STOCK') ? <FiAlertTriangle className="w-3.5 h-3.5" /> : <FiInfo className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1">
                        <p className="leading-snug text-[11px]">{n.message}</p>
                        <span className="text-[9px] text-slate-400 block mt-1">
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(n.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {!n.is_read && (
                        <button
                          onClick={(e) => handleMarkRead(n.id, e)}
                          className="text-slate-350 hover:text-primary p-0.5 rounded transition-colors"
                          title="Mark read"
                        >
                          <FiCheck className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No notifications yet.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2.5 bg-[#F8FAFC] border border-slate-200/50 px-3.5 py-1.5 rounded-xl">
          <div className="w-7.5 h-7.5 rounded-full bg-emerald-50 flex items-center justify-center text-primary border border-emerald-100">
            <FiUser className="w-4 h-4" />
          </div>
          <div className="text-left hidden md:block">
            <p className="text-xs font-semibold text-text-primary capitalize leading-tight">{user.username}</p>
            <span className={`text-[8.5px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded leading-none inline-block mt-0.5 ${
              user.role === 'ADMIN' ? 'bg-amber-50 text-amber-600 border border-amber-200/50' : 'bg-emerald-50 text-primary border border-emerald-200/50'
            }`}>
              {user.role}
            </span>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex items-center justify-center p-2.5 rounded-xl bg-white hover:bg-rose-50 text-text-secondary hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-all duration-200 shadow-sm cursor-pointer"
          title="Sign Out"
        >
          <FiLogOut className="w-4.5 h-4.5" />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
