import { useContext, useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  FiTrendingUp, FiDatabase, FiUsers, FiShoppingBag, FiBookOpen, 
  FiFileText, FiTruck, FiDollarSign, FiClock, FiChevronLeft, FiChevronRight,
  FiZap, FiChevronDown, FiRefreshCw, FiHeart, FiMaximize, FiPieChart,
  FiClipboard, FiX, FiSettings, FiLogOut
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

const Sidebar = ({ isOpenOnMobile, onCloseMobile }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar-collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [isQuickActionsExpanded, setIsQuickActionsExpanded] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [monthlyBudget, setMonthlyBudget] = useState(10000);

  useEffect(() => {
    if (user && user.role === 'CUSTOMER') {
      api.get('/invoices/')
        .then(res => {
          setInvoices(res.data);
          setInvoicesLoading(false);
        })
        .catch(err => {
          console.error('Sidebar error fetching invoices:', err);
          setInvoicesLoading(false);
        });
      
      try {
        const stored = localStorage.getItem('monthly-budget-limit');
        if (stored) setMonthlyBudget(parseFloat(stored));
      } catch {}
    }
  }, [user]);

  const getMonthlyStats = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyInvoices = invoices.filter(inv => {
      const date = new Date(inv.created_at);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const totalOrders = monthlyInvoices.length;
    const monthlySpending = monthlyInvoices.reduce((sum, inv) => sum + parseFloat(inv.grand_total || 0), 0);
    const totalSavings = monthlySpending * 0.05;
    const rewardPointsEarned = Math.floor(monthlySpending / 10);
    const budgetProgress = monthlyBudget > 0 ? Math.min(100, (monthlySpending / monthlyBudget) * 100) : 0;

    return {
      totalOrders,
      monthlySpending: Math.round(monthlySpending * 100) / 100,
      totalSavings: Math.round(totalSavings * 100) / 100,
      rewardPointsEarned,
      budgetProgress: Math.round(budgetProgress)
    };
  };

  const triggerQuickAction = (action) => {
    const targetPath = (action === 'order-history') ? '/dashboard/khata' : '/dashboard';
    navigate(`${targetPath}?action=${action}`);
    if (onCloseMobile) onCloseMobile();
  };

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar-collapsed', String(next));
      } catch (err) {
        console.error(err);
      }
      return next;
    });
  };

  if (!user) return null;

  // Desktop Links
  const adminLinks = [
    { to: '/admin', end: true, label: 'Analytics', icon: <FiTrendingUp className="w-4.5 h-4.5" /> },
    { to: '/admin/inventory', label: 'Inventory', icon: <FiDatabase className="w-4.5 h-4.5" /> },
    { to: '/admin/customers', label: 'Customers', icon: <FiUsers className="w-4.5 h-4.5" /> },
    { to: '/admin/expenses', label: 'Expenses', icon: <FiDollarSign className="w-4.5 h-4.5" /> },
    { to: '/admin/suppliers', label: 'Suppliers', icon: <FiTruck className="w-4.5 h-4.5" /> },
    { to: '/admin/finance', label: 'P&L / Cash Flow', icon: <FiTrendingUp className="w-4.5 h-4.5" /> },
    { to: '/admin/reports', label: 'Reports', icon: <FiFileText className="w-4.5 h-4.5" /> },
    { to: '/admin/expiry', label: 'Expiry Manager', icon: <FiClock className="w-4.5 h-4.5" /> },
    { to: '/admin/orders', label: 'Order Fulfilment', icon: <FiClipboard className="w-4.5 h-4.5" /> },
  ];

  // Mobile-specific Admin Links (As per User request: Dashboard, Orders, Products, Customers, Inventory, Digital Khata, Reports, Settings, Logout)
  const adminMobileLinks = [
    { to: '/admin', end: true, label: 'Dashboard', icon: <FiTrendingUp className="w-4.5 h-4.5" /> },
    { to: '/admin/orders', label: 'Orders', icon: <FiClipboard className="w-4.5 h-4.5" /> },
    { to: '/admin/inventory', label: 'Products', icon: <FiDatabase className="w-4.5 h-4.5" /> },
    { to: '/admin/customers', label: 'Customers', icon: <FiUsers className="w-4.5 h-4.5" /> },
    { to: '/admin/inventory', label: 'Inventory', icon: <FiDatabase className="w-4.5 h-4.5" /> },
    { to: '/admin/customers', label: 'Digital Khata', icon: <FiBookOpen className="w-4.5 h-4.5" /> },
    { to: '/admin/reports', label: 'Reports', icon: <FiFileText className="w-4.5 h-4.5" /> },
  ];

  const customerLinks = [
    { to: '/dashboard', end: true, label: 'Grocery Store', icon: <FiShoppingBag className="w-4.5 h-4.5" /> },
    { to: '/dashboard/khata', label: 'Digital Khata Book', icon: <FiBookOpen className="w-4.5 h-4.5" /> },
    { to: '/dashboard/orders', label: 'My Pickup Orders', icon: <FiClock className="w-4.5 h-4.5" /> },
  ];

  const renderSidebarContent = (isMobile = false) => {
    const displayCollapsed = !isMobile && isCollapsed;
    const links = isMobile 
      ? (user.role === 'ADMIN' ? adminMobileLinks : customerLinks)
      : (user.role === 'ADMIN' ? adminLinks : customerLinks);

    const handleLinkClick = () => {
      if (isMobile && onCloseMobile) onCloseMobile();
    };

    return (
      <div className="flex flex-col h-full overflow-y-auto no-scrollbar">
        {/* Header section with profile name for mobile */}
        {isMobile && (
          <div className="px-2 py-4 border-b border-slate-100 mb-4 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2">
              <div className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center font-bold">
                {user.username.substring(0, 1).toUpperCase()}
              </div>
              <div className="text-left">
                <h4 className="font-bold text-slate-900 text-xs capitalize">{user.username}</h4>
                <p className="text-[9px] text-slate-400 font-medium">Smart Retail Profile</p>
              </div>
            </div>
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Regular Header for Desktop */}
        {!isMobile && (
          <div className="flex items-center justify-between px-2 mb-6 shrink-0">
            <span className={`text-[10px] font-bold uppercase tracking-wider text-slate-400 ${displayCollapsed ? 'hidden' : 'block'}`}>
              Navigation
            </span>
            <button
              onClick={toggleCollapse}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer ml-auto"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? <FiChevronRight className="w-3.5 h-3.5" /> : <FiChevronLeft className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        {/* Links container */}
        <div className="flex flex-col space-y-1.5 flex-1">
          {links.map((link) => (
            <NavLink
              key={link.to + '-' + link.label}
              to={link.to}
              end={link.end}
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3.5 py-3 rounded-xl font-bold text-xs transition-all duration-200 border relative group min-h-[44px] cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'text-slate-505 hover:bg-slate-55 hover:text-slate-900 border-transparent hover:border-slate-100'
                }`
              }
            >
              <div className="shrink-0">{link.icon}</div>
              <span className={`transition-opacity duration-300 truncate ${displayCollapsed ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100'}`}>
                {link.label}
              </span>
            </NavLink>
          ))}

          {/* Additional mobile-specific items inside customer drawer */}
          {isMobile && user.role === 'CUSTOMER' && (
            <>
              {/* Wishlist */}
              <button
                onClick={() => {
                  triggerQuickAction('wishlist');
                }}
                className="w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl font-bold text-xs text-slate-505 hover:bg-slate-55 hover:text-rose-500 border border-transparent transition-all min-h-[44px] cursor-pointer text-left"
              >
                <FiHeart className="w-4.5 h-4.5 text-slate-450 shrink-0" />
                <span>Wishlist</span>
              </button>

              {/* Collapsible Quick Actions */}
              <div className="border-t border-slate-100 pt-2 mt-2">
                <button
                  onClick={() => setIsQuickActionsExpanded(prev => !prev)}
                  className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-bold text-xs text-slate-505 hover:bg-slate-55 hover:text-slate-900 cursor-pointer min-h-[44px]"
                >
                  <div className="flex items-center space-x-3">
                    <FiZap className="w-4.5 h-4.5 text-slate-400" />
                    <span>Quick Actions</span>
                  </div>
                  <FiChevronDown className={`transition-transform duration-200 text-slate-400 ${isQuickActionsExpanded ? 'rotate-180' : ''}`} />
                </button>

                {isQuickActionsExpanded && (
                  <div className="pl-3.5 space-y-1 mt-1">
                    <button
                      onClick={() => triggerQuickAction('buy-again')}
                      className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg font-semibold text-[11px] text-slate-505 hover:bg-slate-55 hover:text-[#10B981] transition-all min-h-[40px] cursor-pointer text-left"
                    >
                      <FiRefreshCw className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Buy Again</span>
                    </button>
                    <button
                      onClick={() => triggerQuickAction('scan-barcode')}
                      className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg font-semibold text-[11px] text-slate-505 hover:bg-slate-55 hover:text-blue-500 transition-all min-h-[40px] cursor-pointer text-left"
                    >
                      <FiMaximize className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Scan Barcode</span>
                    </button>
                    <button
                      onClick={() => triggerQuickAction('order-history')}
                      className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg font-semibold text-[11px] text-slate-505 hover:bg-slate-55 hover:text-amber-500 transition-all min-h-[40px] cursor-pointer text-left"
                    >
                      <FiClock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Order History</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Collapsible Shopping Summary */}
              <div className="border-t border-slate-100 pt-2 mt-2">
                <button
                  onClick={() => setIsSummaryExpanded(prev => !prev)}
                  className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-bold text-xs text-slate-505 hover:bg-slate-55 hover:text-slate-900 cursor-pointer min-h-[44px]"
                >
                  <div className="flex items-center space-x-3">
                    <FiPieChart className="w-4.5 h-4.5 text-slate-400" />
                    <span>Shopping Summary</span>
                  </div>
                  <FiChevronDown className={`transition-transform duration-200 text-slate-400 ${isSummaryExpanded ? 'rotate-180' : ''}`} />
                </button>

                {isSummaryExpanded && (
                  <div className="pl-3.5 space-y-2.5 py-2">
                    {invoicesLoading ? (
                      <span className="text-[10px] text-slate-400 italic">Loading stats...</span>
                    ) : (
                      (() => {
                        const stats = getMonthlyStats();
                        return (
                          <div className="space-y-3 py-1 pr-2 text-left">
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] font-bold text-slate-400">
                                <span>Monthly Budget Limit</span>
                                <span className="text-slate-600">₹{monthlyBudget}</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    stats.budgetProgress > 85 ? 'bg-rose-500' : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${stats.budgetProgress}%` }}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500">
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <span className="block text-slate-400 text-[8px] uppercase">Spending</span>
                                <span className="text-slate-800 text-xs mt-0.5 block">₹{stats.monthlySpending}</span>
                              </div>
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <span className="block text-slate-400 text-[8px] uppercase">Savings</span>
                                <span className="text-emerald-600 text-xs mt-0.5 block">₹{stats.totalSavings}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Settings & Logout inside the drawer */}
          {isMobile && (
            <div className="pt-2 border-t border-slate-100 mt-auto space-y-1.5 shrink-0">
              <button
                onClick={() => {
                  handleLinkClick();
                  alert(`Settings: Managed securely via your Smart Retail profile metadata.`);
                }}
                className="w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl font-bold text-xs text-slate-505 hover:bg-slate-55 transition-all min-h-[44px] cursor-pointer text-left"
              >
                <FiSettings className="w-4.5 h-4.5 text-slate-450" />
                <span>Settings</span>
              </button>

              <button
                onClick={() => {
                  handleLinkClick();
                  logout();
                }}
                className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold py-3 px-4 rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer text-xs min-h-[44px] flex items-center justify-center space-x-2"
              >
                <FiLogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}

          {/* Desktop-only Quick Actions & Summary */}
          {!isMobile && user.role === 'CUSTOMER' && (
            <div className="pt-2 border-t border-slate-100 mt-2">
              <div className="space-y-1">
                {/* Collapsible Trigger */}
                <button
                  onClick={() => setIsQuickActionsExpanded(prev => !prev)}
                  className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-bold text-xs transition-all duration-200 border border-transparent hover:bg-slate-55 text-slate-505 hover:text-slate-900 cursor-pointer min-h-[44px]"
                  aria-expanded={isQuickActionsExpanded}
                  aria-label="Toggle Quick Actions"
                >
                  <div className="flex items-center space-x-3">
                    <div className="shrink-0 text-slate-400">
                      <FiZap className="w-4.5 h-4.5" />
                    </div>
                    <span>Quick Actions</span>
                  </div>
                  <div className={`transition-transform duration-200 text-slate-400 ${isQuickActionsExpanded ? 'rotate-180' : ''}`}>
                    <FiChevronDown className="w-3.5 h-3.5" />
                  </div>
                </button>

                {/* Submenu links with height transition */}
                <div 
                  className={`overflow-hidden transition-all duration-300 ease-in-out pl-3.5 space-y-1 ${
                    isQuickActionsExpanded ? 'max-h-52 opacity-100 mt-1.5' : 'max-h-0 opacity-0 pointer-events-none'
                  }`}
                >
                  <button
                    onClick={() => triggerQuickAction('buy-again')}
                    className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg font-semibold text-[11px] text-slate-505 hover:bg-slate-55 hover:text-[#10B981] transition-all duration-150 cursor-pointer text-left min-h-[40px]"
                  >
                    <FiRefreshCw className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Buy Again</span>
                  </button>
                  <button
                    onClick={() => triggerQuickAction('wishlist')}
                    className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg font-semibold text-[11px] text-slate-505 hover:bg-slate-55 hover:text-rose-500 transition-all duration-150 cursor-pointer text-left min-h-[40px]"
                  >
                    <FiHeart className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Wishlist</span>
                  </button>
                  <button
                    onClick={() => triggerQuickAction('scan-barcode')}
                    className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg font-semibold text-[11px] text-slate-505 hover:bg-slate-55 hover:text-blue-500 transition-all duration-150 cursor-pointer text-left min-h-[40px]"
                  >
                    <FiMaximize className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Scan Barcode</span>
                  </button>
                  <button
                    onClick={() => triggerQuickAction('order-history')}
                    className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg font-semibold text-[11px] text-slate-505 hover:bg-slate-55 hover:text-amber-500 transition-all duration-150 cursor-pointer text-left min-h-[40px]"
                  >
                    <FiClock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Order History</span>
                  </button>
                </div>

                {/* Shopping Summary collapsible block */}
                <div className="pt-2 border-t border-slate-100 mt-2">
                  <button
                    onClick={() => {
                      setIsSummaryExpanded(prev => !prev);
                      triggerQuickAction('summary');
                    }}
                    className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-bold text-xs transition-all duration-200 border border-transparent hover:bg-slate-55 text-slate-550 hover:text-slate-900 cursor-pointer min-h-[44px]"
                    aria-expanded={isSummaryExpanded}
                    aria-label="Toggle Shopping Summary"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="shrink-0 text-slate-400">
                        <FiPieChart className="w-4.5 h-4.5" />
                      </div>
                      <span>Shopping Summary</span>
                    </div>
                    <div className={`transition-transform duration-200 text-slate-455 ${isSummaryExpanded ? 'rotate-180' : ''}`}>
                      <FiChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </button>

                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out pl-3.5 space-y-2.5 ${
                      isSummaryExpanded ? 'max-h-[300px] opacity-100 mt-2' : 'max-h-0 opacity-0 pointer-events-none'
                    }`}
                  >
                    {invoicesLoading ? (
                      <span className="text-[10px] text-slate-400 italic">Loading stats...</span>
                    ) : (
                      (() => {
                        const stats = getMonthlyStats();
                        return (
                          <div className="space-y-3.5 py-2 pr-2 text-left">
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] font-bold text-slate-400">
                                <span>Monthly Budget Limit</span>
                                <span className="text-slate-600">₹{monthlyBudget}</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    stats.budgetProgress > 85 ? 'bg-rose-500' : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${stats.budgetProgress}%` }}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500">
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <span className="block text-slate-400 text-[8px] uppercase">Spending</span>
                                <span className="text-slate-800 text-xs mt-0.5 block">₹{stats.monthlySpending}</span>
                              </div>
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <span className="block text-slate-400 text-[8px] uppercase">5% Savings</span>
                                <span className="text-emerald-600 text-xs mt-0.5 block">₹{stats.totalSavings}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => triggerQuickAction('summary')}
                              className="w-full py-2 bg-slate-50 hover:bg-slate-105 text-slate-700 font-bold text-[9px] uppercase tracking-wider rounded-lg border border-slate-200 transition-colors cursor-pointer text-center min-h-[36px]"
                            >
                              Open Insights
                            </button>
                          </div>
                        );
                      })()
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sidebar aside */}
      <aside 
        className={`relative bg-white border-r border-slate-200/60 p-4 flex flex-col justify-start text-left shrink-0 transition-all duration-300 md:min-h-[calc(100vh-60px)] ${
          isCollapsed ? 'w-20' : 'w-64'
        } hidden md:flex`}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Sidebar Slide-out Drawer */}
      <AnimatePresence>
        {isOpenOnMobile && (
          <>
            {/* Backdrop blur overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] md:hidden"
            />
            {/* Drawer sheet panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 h-full w-64 bg-white shadow-2xl z-[101] flex flex-col p-4 text-left border-r border-slate-100 md:hidden"
            >
              {renderSidebarContent(true)}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
