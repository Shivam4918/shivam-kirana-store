import { useContext, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  FiTrendingUp, FiDatabase, FiUsers, FiShoppingBag, FiBookOpen, 
  FiFileText, FiTruck, FiDollarSign, FiClock, FiChevronLeft, FiChevronRight,
  FiZap, FiChevronDown, FiRefreshCw, FiHeart, FiMaximize
} from 'react-icons/fi';

const Sidebar = () => {
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

  const triggerQuickAction = (action) => {
    const targetPath = (action === 'order-history') ? '/dashboard/khata' : '/dashboard';
    navigate(`${targetPath}?action=${action}`);
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
  ];

  const customerLinks = [
    { to: '/dashboard', end: true, label: 'Grocery Store', icon: <FiShoppingBag className="w-4.5 h-4.5" /> },
    { to: '/dashboard/khata', label: 'Digital Khata Book', icon: <FiBookOpen className="w-4.5 h-4.5" /> },
  ];

  const links = user.role === 'ADMIN' ? adminLinks : customerLinks;

  return (
    <aside 
      className={`relative bg-white border-r border-slate-200/60 p-4 flex flex-col justify-start text-left shrink-0 transition-all duration-300 md:min-h-[calc(100vh-60px)] ${
        isCollapsed ? 'w-20' : 'w-64'
      } hidden md:flex`}
    >
      {/* Header section with toggle button */}
      <div className="flex items-center justify-between px-2 mb-6">
        <span className={`text-[10px] font-bold uppercase tracking-wider text-slate-400 ${isCollapsed ? 'hidden' : 'block'}`}>
          Navigation
        </span>
        <button
          onClick={toggleCollapse}
          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer ml-auto"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <FiChevronRight className="w-3.5 h-3.5" /> : <FiChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Links container */}
      <div className="flex flex-col space-y-1.5">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3.5 py-2.5 rounded-lg font-semibold text-xs transition-all duration-200 border relative group ${
                isActive
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'text-slate-505 hover:bg-slate-50 hover:text-slate-900 border-transparent hover:border-slate-100'
              }`
            }
          >
            <div className="shrink-0">{link.icon}</div>
            
            <span className={`transition-opacity duration-300 truncate ${isCollapsed ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100'}`}>
              {link.label}
            </span>

            {/* Collapsed view tooltips */}
            {isCollapsed && (
              <div className="absolute left-full ml-4 px-2.5 py-1.5 bg-slate-900 text-white text-[10px] font-semibold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-md whitespace-nowrap z-50">
                {link.label}
              </div>
            )}
          </NavLink>
        ))}

        {user.role === 'CUSTOMER' && (
          <div className="pt-2 border-t border-slate-100 mt-2">
            {!isCollapsed ? (
              <div className="space-y-1">
                {/* Collapsible Trigger */}
                <button
                  onClick={() => setIsQuickActionsExpanded(prev => !prev)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg font-semibold text-xs transition-all duration-200 border border-transparent hover:bg-slate-50 text-slate-505 hover:text-slate-900 cursor-pointer`}
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
                    className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg font-semibold text-[11px] text-slate-505 hover:bg-slate-50 hover:text-[#10B981] transition-all duration-150 cursor-pointer text-left"
                  >
                    <FiRefreshCw className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Buy Again</span>
                  </button>
                  <button
                    onClick={() => triggerQuickAction('wishlist')}
                    className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg font-semibold text-[11px] text-slate-505 hover:bg-slate-50 hover:text-rose-500 transition-all duration-150 cursor-pointer text-left"
                  >
                    <FiHeart className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Wishlist</span>
                  </button>
                  <button
                    onClick={() => triggerQuickAction('scan-barcode')}
                    className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg font-semibold text-[11px] text-slate-505 hover:bg-slate-50 hover:text-blue-500 transition-all duration-150 cursor-pointer text-left"
                  >
                    <FiMaximize className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Scan Barcode</span>
                  </button>
                  <button
                    onClick={() => triggerQuickAction('order-history')}
                    className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg font-semibold text-[11px] text-slate-505 hover:bg-slate-50 hover:text-amber-500 transition-all duration-150 cursor-pointer text-left"
                  >
                    <FiClock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Order History</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setIsCollapsed(false);
                  setIsQuickActionsExpanded(true);
                }}
                className="w-full flex items-center justify-center p-2.5 rounded-lg border border-transparent hover:bg-slate-50 text-slate-505 hover:text-[#10B981] transition-all relative group cursor-pointer"
                title="Quick Actions"
              >
                <FiZap className="w-4.5 h-4.5" />
                <div className="absolute left-full ml-4 px-2.5 py-1.5 bg-slate-900 text-white text-[10px] font-semibold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-md whitespace-nowrap z-50">
                  Quick Actions
                </div>
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
