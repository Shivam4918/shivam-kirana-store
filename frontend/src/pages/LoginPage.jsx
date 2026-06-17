import { useState, useContext, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  FiMail, FiLock, FiUser, FiPhone, FiArrowRight, 
  FiShoppingBag, FiHome, FiCheckCircle 
} from 'react-icons/fi';

const LoginPage = ({ defaultTab = 'login' }) => {
  const { login, register, isAuthenticated, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState(defaultTab);

  // Sync tab state when routes switch
  useEffect(() => {
    setActiveTab(defaultTab);
    setErrorMsg('');
    setSuccessMsg('');
  }, [defaultTab]);

  // Registration states
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // Login states
  const [loginEmailOrUsername, setLoginEmailOrUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // UI state
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!loginEmailOrUsername || !loginPassword) {
      setErrorMsg('Please enter all credentials.');
      return;
    }

    setIsLoading(true);
    const result = await login(loginEmailOrUsername, loginPassword);
    setIsLoading(false);

    if (result.success) {
      setSuccessMsg('Successfully signed in!');
    } else {
      setErrorMsg(result.error);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!regUsername || !regEmail || !regPassword || !regConfirmPassword) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    const result = await register(regUsername, regEmail, regPhone, regPassword, regConfirmPassword);
    setIsLoading(false);

    if (result.success) {
      setSuccessMsg('Registration successful! A verification link has been sent to your email. Please check your inbox (and spam folder) and verify your email before logging in.');
      setRegUsername('');
      setRegEmail('');
      setRegPhone('');
      setRegPassword('');
      setRegConfirmPassword('');
      
      // Auto-toggle to login tab after 4 seconds to allow reading
      setTimeout(() => {
        setActiveTab('login');
      }, 4000);
    } else {
      let errorText = 'Registration failed.';
      if (typeof result.error === 'object') {
        errorText = Object.entries(result.error)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(' ') : val}`)
          .join('\n');
      } else if (result.error?.detail) {
        errorText = result.error.detail;
      }
      setErrorMsg(errorText);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-secondary flex flex-col items-center justify-center p-4 relative overflow-y-auto text-left">
      
      {/* Background patterns */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-orange-500/5 blur-[120px] pointer-events-none"></div>

      {/* Floating Home Link */}
      <Link 
        to="/" 
        className="absolute top-6 left-6 flex items-center space-x-2 text-text-secondary hover:text-secondary font-bold text-sm bg-white border border-slate-200/60 px-4 py-2 rounded-xl shadow-sm transition-all"
      >
        <FiHome className="w-4 h-4" />
        <span>Back to Home</span>
      </Link>

      <div className="w-full max-w-md bg-white border border-slate-200/60 rounded-3xl p-6 sm:p-8 shadow-premium-lg relative z-10 my-12">
        
        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="bg-primary p-3 rounded-2xl text-white shadow-md shadow-emerald-500/20 inline-block mb-3">
            <FiShoppingBag className="w-6 h-6" />
          </div>
          <h2 className="font-poppins font-extrabold text-2xl text-secondary">Shivam Kirana Store</h2>
          <p className="text-text-secondary text-xs mt-1">Smart Groceries & Ledger Khata Management</p>
        </div>

        {/* Tab Toggles */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6 border border-slate-200/45">
          <button
            onClick={() => { setActiveTab('login'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`w-1/2 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer ${
              activeTab === 'login'
                ? 'bg-primary text-white shadow-sm shadow-emerald-500/10'
                : 'text-text-secondary hover:text-secondary'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setActiveTab('register'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`w-1/2 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer ${
              activeTab === 'register'
                ? 'bg-primary text-white shadow-sm shadow-emerald-500/10'
                : 'text-text-secondary hover:text-secondary'
            }`}
          >
            Register
          </button>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="mb-4 bg-rose-50 border border-rose-250 text-rose-600 p-3.5 rounded-2xl text-xs font-medium">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 bg-emerald-55 border border-emerald-200 text-emerald-600 p-3.5 rounded-2xl text-xs font-medium">
            {successMsg}
          </div>
        )}

        {/* Login Form */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <FiMail className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={loginEmailOrUsername}
                  onChange={(e) => setLoginEmailOrUsername(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-2 focus:ring-emerald-100 rounded-xl py-3 pl-11 pr-4 text-sm text-text-primary placeholder-slate-400 transition-all outline-none"
                  placeholder="e.g. shyam"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <FiLock className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-2 focus:ring-emerald-100 rounded-xl py-3 pl-11 pr-4 text-sm text-text-primary placeholder-slate-400 transition-all outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 bg-primary hover:bg-primary-hover text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-md shadow-emerald-500/10 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Sign In</span>
                  <FiArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Register Form */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">
                Choose Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <FiUser className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-2 focus:ring-emerald-100 rounded-xl py-3 pl-11 pr-4 text-sm text-text-primary placeholder-slate-400 transition-all outline-none"
                  placeholder="e.g. shyam"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <FiMail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-2 focus:ring-emerald-100 rounded-xl py-3 pl-11 pr-4 text-sm text-text-primary placeholder-slate-400 transition-all outline-none"
                  placeholder="e.g. shyam@gmail.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">
                Phone Number (Optional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <FiPhone className="w-5 h-5" />
                </div>
                <input
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-2 focus:ring-emerald-100 rounded-xl py-3 pl-11 pr-4 text-sm text-text-primary placeholder-slate-400 transition-all outline-none"
                  placeholder="e.g. 9988776655"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <FiLock className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-2 focus:ring-emerald-100 rounded-xl py-3 pl-11 pr-4 text-sm text-text-primary placeholder-slate-400 transition-all outline-none"
                  placeholder="Min. 8 characters"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <FiLock className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-2 focus:ring-emerald-100 rounded-xl py-3 pl-11 pr-4 text-sm text-text-primary placeholder-slate-400 transition-all outline-none"
                  placeholder="Retype password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 bg-primary hover:bg-primary-hover text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-md shadow-emerald-500/10 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Register Account</span>
                  <FiArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

export default LoginPage;
