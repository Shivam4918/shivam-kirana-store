import { BrowserRouter as Router, Routes, Route, Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { RealTimeProvider } from './context/RealTimeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import CartDrawer from './components/CartDrawer';
import { CartProvider, CartContext } from './context/CartContext';
import { FiShoppingBag, FiBookOpen, FiClock, FiShoppingCart } from 'react-icons/fi';

import React, { Suspense, useState, useContext } from 'react';

// Lazy load Pages for bundle chunk splitting
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const VerifyEmail = React.lazy(() => import('./pages/VerifyEmail'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const ProductManagement = React.lazy(() => import('./pages/ProductManagement'));
const CustomerManagement = React.lazy(() => import('./pages/CustomerManagement'));
const CustomerDashboard = React.lazy(() => import('./pages/CustomerDashboard'));
const ExpenseManagement = React.lazy(() => import('./pages/ExpenseManagement'));
const SupplierManagement = React.lazy(() => import('./pages/SupplierManagement'));
const FinancialReports = React.lazy(() => import('./pages/FinancialReports'));
const AdvancedReports = React.lazy(() => import('./pages/AdvancedReports'));
const ExpiryManager = React.lazy(() => import('./pages/ExpiryManager'));
const MockPaymentPage = React.lazy(() => import('./pages/MockPaymentPage'));
const MyOrders = React.lazy(() => import('./pages/MyOrders'));
const OrderManagement = React.lazy(() => import('./pages/OrderManagement'));


const AppLayout = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { user } = useContext(AuthContext);
  const { cartCount, setIsCartOpen } = useContext(CartContext);
  const location = useLocation();
  const navigate = useNavigate();

  const isCustomer = user && user.role === 'CUSTOMER';
  const currentPath = location.pathname;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#111827] pb-16 md:pb-0">
      <Navbar onToggleSidebar={() => setMobileSidebarOpen(prev => !prev)} />
      <div className="flex-1 flex flex-col md:flex-row">
        <Sidebar isOpenOnMobile={mobileSidebarOpen} onCloseMobile={() => setMobileSidebarOpen(false)} />
        <main className="flex-1 flex flex-col bg-slate-50/50">
          <Outlet />
        </main>
      </div>
      <CartDrawer />

      {/* Mobile Sticky Bottom Navigation Menu for Customer */}
      {isCustomer && (
        <div className="block md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200/80 z-40 py-2.5 px-4 flex justify-between shadow-md">
          <button
            onClick={() => navigate('/dashboard')}
            className={`flex flex-col items-center justify-center flex-1 cursor-pointer transition-colors ${
              currentPath === '/dashboard' ? 'text-[#10B981] font-bold' : 'text-slate-450'
            }`}
          >
            <FiShoppingBag className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-semibold">Store</span>
          </button>

          <button
            onClick={() => navigate('/dashboard/khata')}
            className={`flex flex-col items-center justify-center flex-1 cursor-pointer transition-colors ${
              currentPath === '/dashboard/khata' ? 'text-[#10B981] font-bold' : 'text-slate-455'
            }`}
          >
            <FiBookOpen className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-semibold">Khata</span>
          </button>

          <button
            onClick={() => navigate('/dashboard/orders')}
            className={`flex flex-col items-center justify-center flex-1 cursor-pointer transition-colors ${
              currentPath === '/dashboard/orders' ? 'text-[#10B981] font-bold' : 'text-slate-455'
            }`}
          >
            <FiClock className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-semibold">Orders</span>
          </button>

          <button
            onClick={() => setIsCartOpen(true)}
            className="flex flex-col items-center justify-center flex-1 cursor-pointer transition-colors relative text-slate-455"
          >
            <FiShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute top-0 right-5 bg-rose-500 text-white rounded-full text-[8.5px] font-extrabold w-4 h-4 flex items-center justify-center font-mono">
                {cartCount}
              </span>
            )}
            <span className="text-[10px] mt-1 font-semibold">Cart</span>
          </button>
        </div>
      )}
    </div>
  );
};



function App() {
  return (
    <Router>
      <AuthProvider>
        <RealTimeProvider>
          <CartProvider>
          <Suspense fallback={
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50/50">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20"></div>
                <div className="absolute inset-0 rounded-full border-4 border-t-emerald-600 animate-spin"></div>
              </div>
              <p className="mt-4 text-xs font-bold text-slate-500 tracking-wider uppercase animate-pulse">Loading Shivam Store...</p>
            </div>
          }>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage defaultTab="login" />} />
              <Route path="/register" element={<LoginPage defaultTab="register" />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/mock-payment" element={<MockPaymentPage />} />

              {/* Admin Protected Routes */}
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="inventory" element={<ProductManagement />} />
                <Route path="customers" element={<CustomerManagement />} />
                <Route path="expenses" element={<ExpenseManagement />} />
                <Route path="suppliers" element={<SupplierManagement />} />
                <Route path="finance" element={<FinancialReports />} />
                <Route path="reports" element={<AdvancedReports />} />
                <Route path="expiry" element={<ExpiryManager />} />
                <Route path="orders" element={<OrderManagement />} />
              </Route>


              {/* Customer Protected Routes */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute requiredRole="CUSTOMER">
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<CustomerDashboard />} />
                <Route path="khata" element={<CustomerDashboard />} />
                <Route path="orders" element={<MyOrders />} />
              </Route>

              {/* Catch-all fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </CartProvider>
      </RealTimeProvider>
    </AuthProvider>
    </Router>
  );
}

export default App;
