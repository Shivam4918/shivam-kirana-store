import { BrowserRouter as Router, Routes, Route, Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { RealTimeProvider } from './context/RealTimeContext';
import { CartContext } from './context/CartContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import CartDrawer from './components/CartDrawer';
import { FiHome, FiShoppingCart, FiPackage, FiBookOpen, FiUser, FiX, FiLogOut, FiPieChart, FiHeart } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

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
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'));
const MyOrders = React.lazy(() => import('./pages/MyOrders'));
const OrderManagement = React.lazy(() => import('./pages/OrderManagement'));



const AppLayout = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const { user, logout } = useContext(AuthContext);
  const { cartCount, setIsCartOpen } = useContext(CartContext);
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#111827]">
      <Navbar onToggleSidebar={() => setMobileSidebarOpen(prev => !prev)} />
      <div className="flex-1 flex flex-col md:flex-row pb-16 md:pb-0">
        <Sidebar isOpenOnMobile={mobileSidebarOpen} onCloseMobile={() => setMobileSidebarOpen(false)} />
        <main className="flex-1 flex flex-col bg-slate-50/50">
          <Outlet />
        </main>
      </div>
      <CartDrawer />

      {/* Mobile Sticky Bottom Navigation Menu (Customer only) */}
      {user && user.role === 'CUSTOMER' && (
        <div className="md:hidden fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-205/65 z-[49] py-2 px-4 flex justify-between items-center shadow-lg safe-bottom">
          <button
            onClick={() => navigate('/dashboard')}
            className={`flex flex-col items-center justify-center flex-1 cursor-pointer transition-colors min-h-[44px] ${
              location.pathname === '/dashboard' ? 'text-[#10B981] font-bold' : 'text-slate-405'
            }`}
          >
            <FiHome className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-semibold">Home</span>
          </button>

          <button
            onClick={() => setIsCartOpen(true)}
            className="flex flex-col items-center justify-center flex-1 cursor-pointer transition-colors relative min-h-[44px] text-slate-405"
          >
            <div className="relative">
              <FiShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-rose-500 text-white rounded-full text-[8.5px] font-extrabold w-4 h-4 flex items-center justify-center font-mono">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1 font-semibold">Cart</span>
          </button>

          <button
            onClick={() => navigate('/dashboard/orders')}
            className={`flex flex-col items-center justify-center flex-1 cursor-pointer transition-colors min-h-[44px] ${
              location.pathname === '/dashboard/orders' ? 'text-[#10B981] font-bold' : 'text-slate-405'
            }`}
          >
            <FiPackage className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-semibold">Orders</span>
          </button>

          <button
            onClick={() => navigate('/dashboard/khata')}
            className={`flex flex-col items-center justify-center flex-1 cursor-pointer transition-colors min-h-[44px] ${
              location.pathname === '/dashboard/khata' ? 'text-[#10B981] font-bold' : 'text-slate-405'
            }`}
          >
            <FiBookOpen className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-semibold">Khata</span>
          </button>

          <button
            onClick={() => setShowProfileModal(true)}
            className={`flex flex-col items-center justify-center flex-1 cursor-pointer transition-colors min-h-[44px] ${
              showProfileModal ? 'text-[#10B981] font-bold' : 'text-slate-405'
            }`}
          >
            <FiUser className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-semibold">Profile</span>
          </button>
        </div>
      )}

      {/* Profile Modal Overlay */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            {/* Backdrop click close */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProfileModal(false)}
              className="absolute inset-0"
            />
            {/* Modal Body */}
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-md bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-5 text-left z-10"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <div className="w-9 h-9 bg-emerald-50 text-[#10B981] rounded-xl flex items-center justify-center">
                    <FiUser className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Account Profile</h3>
                    <p className="text-[10px] text-slate-400 capitalize">{user?.role} Account</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-55 border border-transparent hover:border-slate-100 text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3.5 py-2">
                <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Username</span>
                    <span className="font-bold text-slate-800 capitalize">@{user?.username}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Email Address</span>
                    <span className="font-bold text-slate-800">{user?.email || 'Not verified'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Phone Number</span>
                    <span className="font-bold text-slate-800 font-mono">{user?.phone || 'Not linked'}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowProfileModal(false);
                  logout();
                }}
                className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/60 font-bold py-3 px-4 rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer text-xs min-h-[44px] flex items-center justify-center space-x-2"
              >
                <FiLogOut className="w-4 h-4" />
                <span>Sign Out Account</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

import { CartProvider } from './context/CartContext';

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
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

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
