import { BrowserRouter as Router, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import ProductManagement from './pages/ProductManagement';
import CustomerManagement from './pages/CustomerManagement';
import CustomerDashboard from './pages/CustomerDashboard';
import ExpenseManagement from './pages/ExpenseManagement';
import SupplierManagement from './pages/SupplierManagement';
import FinancialReports from './pages/FinancialReports';
import AdvancedReports from './pages/AdvancedReports';
import ExpiryManager from './pages/ExpiryManager';

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
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage defaultTab="login" />} />
          <Route path="/register" element={<LoginPage defaultTab="register" />} />

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
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
