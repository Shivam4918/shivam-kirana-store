import { BrowserRouter as Router, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import CartDrawer from './components/CartDrawer';

import React, { Suspense } from 'react';

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
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#111827]">
      <Navbar />
      <div className="flex-1 flex flex-col md:flex-row">
        <Sidebar />
        <main className="flex-1 flex flex-col bg-slate-50/50">
          <Outlet />
        </main>
      </div>
      <CartDrawer />
    </div>
  );
};

import { CartProvider } from './context/CartContext';

function App() {
  return (
    <Router>
      <AuthProvider>
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
      </AuthProvider>
    </Router>
  );
}

export default App;
