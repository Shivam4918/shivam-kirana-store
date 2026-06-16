import { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { FiTrendingUp, FiDatabase, FiUsers, FiShoppingBag, FiBookOpen, FiFileText, FiTruck, FiDollarSign, FiClock } from 'react-icons/fi';

const Sidebar = () => {
  const { user } = useContext(AuthContext);

  if (!user) return null;

  const adminLinks = [
    { to: '/admin', end: true, label: 'Analytics Dashboard', icon: <FiTrendingUp className="w-5 h-5" /> },
    { to: '/admin/inventory', label: 'Inventory Catalog', icon: <FiDatabase className="w-5 h-5" /> },
    { to: '/admin/customers', label: 'Customer Ledger Book', icon: <FiUsers className="w-5 h-5" /> },
    { to: '/admin/expenses', label: 'Expense Management', icon: <FiDollarSign className="w-5 h-5" /> },
    { to: '/admin/suppliers', label: 'Supplier & Purchase', icon: <FiTruck className="w-5 h-5" /> },
    { to: '/admin/finance', label: 'P&L & Cash Flow', icon: <FiTrendingUp className="w-5 h-5" /> },
    { to: '/admin/reports', label: 'Financial Reports', icon: <FiFileText className="w-5 h-5" /> },
    { to: '/admin/expiry', label: 'Expiry Manager', icon: <FiClock className="w-5 h-5" /> },
  ];


  const customerLinks = [
    { to: '/dashboard', end: true, label: 'Grocery Store', icon: <FiShoppingBag className="w-5 h-5" /> },
    { to: '/dashboard/khata', label: 'Digital Khata Book', icon: <FiBookOpen className="w-5 h-5" /> },
  ];

  const links = user.role === 'ADMIN' ? adminLinks : customerLinks;

  return (
    <aside className="w-full md:w-64 glass-panel md:min-h-[calc(100vh-80px)] p-4 flex flex-col space-y-2 border-r border-slate-200/60 bg-white/70">
      <div className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-[#6B7280]">
        Menu Navigation
      </div>
      <div className="flex md:flex-col space-x-2 md:space-x-0 md:space-y-1.5 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 scrollbar-none">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 whitespace-nowrap md:whitespace-normal border ${
                isActive
                  ? 'bg-primary text-white border-primary shadow-lg shadow-emerald-500/15 font-semibold'
                  : 'text-[#6B7280] hover:bg-[#F8FAFC] hover:text-[#111827] border-transparent hover:border-slate-100'
              }`
            }
          >
            {link.icon}
            <span>{link.label}</span>
          </NavLink>
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;
