import { useContext, useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  FiTrendingUp, FiDatabase, FiUsers, FiShoppingBag, FiBookOpen, 
  FiFileText, FiTruck, FiDollarSign, FiClock, FiChevronLeft, FiChevronRight,
  FiZap, FiChevronDown, FiRefreshCw, FiHeart, FiMaximize, FiPieChart,
  FiClipboard, FiX
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

const Sidebar = ({ isOpenOnMobile, onCloseMobile }) => {
  const { user } = useContext(AuthContext);
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

  const customerLinks = [
    { to: '/dashboard', end: true, label: 'Grocery Store', icon: <FiShoppingBag className="w-4.5 h-4.5" /> },
    { to: '/dashboard/khata', label: 'Digital Khata Book', icon: <FiBookOpen className="w-4.5 h-4.5" /> },
    { to: '/dashboard/orders', label: 'My Pickup Orders', icon: <FiClock className="w-4.5 h-4.5" /> },
  ];

  const links = user.role === 'ADMIN' ? adminLinks : customerLinks;

  const renderSidebarContent = (isMobile = false) => {
    const displayCollapsed = !isMobile && isCollapsed;
    return (
      <div className="flex flex-col h-full overflow-y-auto no-scrollbar">
        {/* Header section with toggle button */}
        <div className="flex items-center justify-between px-2 mb-6 shrink-0">
          <span className={`text-[10px] font-bold uppercase tracking-wider text-slate-400 ${displayCollapsed ? 'hidden' : 'block'}`}>
            {isMobile ? 'Menu' : 'Navigation'}
          </span>
          {isMobile ? (
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-450 hover:text-slate-700 transition-colors cursor-pointer ml-auto"
              title="Close Menu"
              aria-label="Close Menu"
            >
              <FiX className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={toggleCollapse}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer ml-auto"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? <FiChevronRight className="w-3.5 h-3.5" /> : <FiChevronLeft className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Links container */}
        <div className="flex flex-col space-y-1.5 flex-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => {
                if (isMobile && onCloseMobile) onCloseMobile();
              }}
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

              {/* Collapsed view tooltips */}
              {displayCollapsed && (
                <div className="absolute left-full ml-4 px-2.5 py-1.5 bg-slate-900 text-white text-[10px] font-semibold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-md whitespace-nowrap z-50">
                  {link.label}
                </div>
              )}
            </NavLink>
          ))}

          {user.role === 'CUSTOMER' && (
            <div className="pt-2 border-t border-slate-100 mt-2">
              {!displayCollapsed ? (
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
                      <div className={`transition-transform duration-200 text-slate-450 ${isSummaryExpanded ? 'rotate-180' : ''}`}>
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
                                className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-[9px] uppercase tracking-wider rounded-lg border border-slate-200 transition-colors cursor-pointer text-center min-h-[36px]"
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
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setIsCollapsed(false);
                      setIsQuickActionsExpanded(true);
                    }}
                    className="w-full flex items-center justify-center p-2.5 rounded-lg border border-transparent hover:bg-slate-55 text-slate-550 hover:text-[#10B981] transition-all relative group cursor-pointer"
                    title="Quick Actions"
                    aria-label="Quick Actions"
                  >
                    <FiZap className="w-4.5 h-4.5" />
                    <div className="absolute left-full ml-4 px-2.5 py-1.5 bg-slate-900 text-white text-[10px] font-semibold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-md whitespace-nowrap z-50">
                      Quick Actions
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setIsCollapsed(false);
                      setIsSummaryExpanded(true);
                      triggerQuickAction('summary');
                    }}
                    className="w-full flex items-center justify-center p-2.5 rounded-lg border border-transparent hover:bg-slate-55 text-slate-550 hover:text-[#10B981] transition-all relative group cursor-pointer"
                    title="Shopping Summary"
                    aria-label="Shopping Summary"
                  >
                    <FiPieChart className="w-4.5 h-4.5" />
                    <div className="absolute left-full ml-4 px-2.5 py-1.5 bg-slate-900 text-white text-[10px] font-semibold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-md whitespace-nowrap z-50">
                      Shopping Summary
                    </div>
                  </button>
                </div>
              )}
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
