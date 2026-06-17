import { useState, useContext, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  FiMail, FiLock, FiUser, FiPhone, FiArrowRight, 
  FiShoppingBag, FiHome, FiCheckCircle 
} from 'react-icons/fi';
import api from '../services/api';

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

  // OTP and Field Validation States
  const [valErrors, setValErrors] = useState({});
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [showVerifyPrompt, setShowVerifyPrompt] = useState(false);
  const [regUserEmailOrUsername, setRegUserEmailOrUsername] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSuccess, setOtpSuccess] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0);

  // Auto-redirect if authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, user, navigate]);

  // Real-time inline field validations
  useEffect(() => {
    if (activeTab !== 'register') return;

    const errors = {};
    
    // Username validation
    if (regUsername) {
      if (regUsername.length < 4 || regUsername.length > 20) {
        errors.username = 'Username must be between 4 and 20 characters.';
      } else if (!/^[a-zA-Z]/.test(regUsername)) {
        errors.username = 'Username must start with a letter.';
      } else if (!/^[a-zA-Z0-9_]+$/.test(regUsername)) {
        errors.username = 'Username can only contain letters, numbers, and underscores.';
      }
    }

    // Email validation
    if (regEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(regEmail)) {
        errors.email = 'Please enter a valid email address.';
      }
    }

    // Phone validation
    if (regPhone) {
      if (!/^[6-9]\d{9}$/.test(regPhone)) {
        errors.phone = 'Phone number must be a valid 10-digit Indian number (starts with 6-9).';
      }
    }

    // Password validation
    if (regPassword) {
      if (regPassword.length < 8) {
        errors.password = 'Password must be at least 8 characters long.';
      } else if (!/[A-Z]/.test(regPassword)) {
        errors.password = 'Password must contain at least one uppercase letter.';
      } else if (!/[a-z]/.test(regPassword)) {
        errors.password = 'Password must contain at least one lowercase letter.';
      } else if (!/[0-9]/.test(regPassword)) {
        errors.password = 'Password must contain at least one number.';
      } else if (!/[@$!%*?&#]/.test(regPassword)) {
        errors.password = 'Password must contain at least one special character.';
      }
    }

    // Confirm password validation
    if (regConfirmPassword && regPassword !== regConfirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setValErrors(errors);
  }, [regUsername, regEmail, regPhone, regPassword, regConfirmPassword, activeTab]);

  // OTP Cooldown timer
  useEffect(() => {
    if (otpCooldown > 0) {
      const timer = setTimeout(() => setOtpCooldown(otpCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCooldown]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setShowVerifyPrompt(false);
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
      // result.error is a string (from AuthContext login)
      const errStr = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
      setErrorMsg(errStr);
      if (errStr && (errStr.toLowerCase().includes('verify') || errStr.toLowerCase().includes('not active'))) {
        setShowVerifyPrompt(true);
      }
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
      setRegUserEmailOrUsername(regUsername);
      setSuccessMsg('Registration successful! Please enter the 6-digit OTP code sent to your email.');
      setRegUsername('');
      setRegEmail('');
      setRegPhone('');
      setRegPassword('');
      setRegConfirmPassword('');
      setShowOtpModal(true);
      setOtpCooldown(30);
    } else {
      // Build a clean list of error messages from backend response
      let errorLines = [];
      if (result.error && typeof result.error === 'object') {
        Object.entries(result.error).forEach(([key, val]) => {
          const msgs = Array.isArray(val) ? val : [val];
          msgs.forEach(msg => {
            // Skip the key prefix for 'detail' — just show the message
            if (key === 'detail') {
              errorLines.push(String(msg));
            } else {
              // Capitalize field name nicely
              const fieldLabel = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
              errorLines.push(`${fieldLabel}: ${msg}`);
            }
          });
        });
      } else if (typeof result.error === 'string') {
        errorLines.push(result.error);
      } else {
        errorLines.push('Registration failed. Please try again.');
      }
      setErrorMsg(errorLines.join('\n'));
    }
  };

  const handleVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    setOtpError('');
    setOtpSuccess('');

    if (!otpValue || otpValue.length !== 6) {
      setOtpError('Please enter a 6-digit OTP code.');
      return;
    }

    setOtpLoading(true);
    try {
      const res = await api.post('/auth/verify-otp/', {
        username: regUserEmailOrUsername,
        otp: otpValue
      });
      setOtpSuccess(res.data.detail || 'Email verified successfully! You can now log in.');
      setOtpValue('');
      
      // Auto-hide modal and transition to login after 3 seconds
      setTimeout(() => {
        setShowOtpModal(false);
        setActiveTab('login');
        setSuccessMsg('Email verified successfully! Please sign in.');
      }, 3000);
    } catch (err) {
      console.error(err);
      setOtpError(err.response?.data?.detail || 'Invalid verification code. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setOtpError('');
    setOtpSuccess('');
    setOtpLoading(true);

    try {
      const res = await api.post('/auth/resend-otp/', {
        username: regUserEmailOrUsername
      });
      setOtpSuccess(res.data.detail || 'A new verification code has been sent.');
      setOtpCooldown(30);
    } catch (err) {
      console.error(err);
      setOtpError(err.response?.data?.detail || 'Failed to resend code. Please try again.');
    } finally {
      setOtpLoading(false);
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
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-600 p-3.5 rounded-2xl text-xs font-medium flex flex-col space-y-1.5">
            {errorMsg.split('\n').map((line, i) => (
              <span key={i} className="flex items-start gap-1.5">
                {errorMsg.includes('\n') && <span className="mt-0.5 shrink-0">•</span>}
                <span>{line}</span>
              </span>
            ))}
            {showVerifyPrompt && (
              <button
                type="button"
                onClick={async () => {
                  setRegUserEmailOrUsername(loginEmailOrUsername);
                  setErrorMsg('');
                  setShowVerifyPrompt(false);
                  setShowOtpModal(true);
                  
                  // Trigger resend OTP automatically
                  setOtpLoading(true);
                  try {
                    await api.post('/auth/resend-otp/', {
                      username: loginEmailOrUsername
                    });
                    setOtpSuccess('Verification code sent to your email.');
                  } catch (err) {
                    setOtpError('Failed to send verification code. Please request a resend.');
                  } finally {
                    setOtpLoading(false);
                  }
                }}
                className="text-left text-rose-800 underline font-bold mt-1 hover:text-rose-950 cursor-pointer"
              >
                Click here to verify your email now
              </button>
            )}
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
                  className={`w-full bg-white border ${valErrors.username ? 'border-rose-350 focus:border-rose-450 focus:ring-rose-100' : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-emerald-100'} rounded-xl py-3 pl-11 pr-4 text-sm text-text-primary placeholder-slate-400 transition-all outline-none`}
                  placeholder="e.g. shyam"
                  required
                />
              </div>
              {valErrors.username && (
                <p className="mt-1.5 text-xs font-medium text-rose-500">{valErrors.username}</p>
              )}
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
                  className={`w-full bg-white border ${valErrors.email ? 'border-rose-305 focus:border-rose-450 focus:ring-rose-100' : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-emerald-100'} rounded-xl py-3 pl-11 pr-4 text-sm text-text-primary placeholder-slate-400 transition-all outline-none`}
                  placeholder="e.g. shyam@gmail.com"
                  required
                />
              </div>
              {valErrors.email && (
                <p className="mt-1.5 text-xs font-medium text-rose-500">{valErrors.email}</p>
              )}
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
                  className={`w-full bg-white border ${valErrors.phone ? 'border-rose-305 focus:border-rose-450 focus:ring-rose-100' : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-emerald-100'} rounded-xl py-3 pl-11 pr-4 text-sm text-text-primary placeholder-slate-400 transition-all outline-none`}
                  placeholder="e.g. 9988776655"
                />
              </div>
              {valErrors.phone && (
                <p className="mt-1.5 text-xs font-medium text-rose-500">{valErrors.phone}</p>
              )}
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
                  className={`w-full bg-white border ${valErrors.password ? 'border-rose-305 focus:border-rose-450 focus:ring-rose-100' : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-emerald-100'} rounded-xl py-3 pl-11 pr-4 text-sm text-text-primary placeholder-slate-400 transition-all outline-none`}
                  placeholder="Min. 8 characters"
                  required
                />
              </div>
              {valErrors.password && (
                <p className="mt-1.5 text-xs font-medium text-rose-500">{valErrors.password}</p>
              )}
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
                  className={`w-full bg-white border ${valErrors.confirmPassword ? 'border-rose-305 focus:border-rose-450 focus:ring-rose-100' : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-emerald-100'} rounded-xl py-3 pl-11 pr-4 text-sm text-text-primary placeholder-slate-400 transition-all outline-none`}
                  placeholder="Retype password"
                  required
                />
              </div>
              {valErrors.confirmPassword && (
                <p className="mt-1.5 text-xs font-medium text-rose-500">{valErrors.confirmPassword}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || Object.keys(valErrors).length > 0 || !regUsername || !regEmail || !regPassword || !regConfirmPassword}
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

      {/* OTP Verification Modal Overlay */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="w-full max-w-md bg-white border border-slate-200/60 rounded-3xl p-6 sm:p-8 shadow-premium-2xl text-center">
            <div className="bg-emerald-50 text-emerald-500 p-4 rounded-full inline-block mb-4">
              <FiCheckCircle className="w-12 h-12" />
            </div>
            <h3 className="font-poppins font-extrabold text-xl text-secondary mb-2">Verify your account</h3>
            <p className="text-text-secondary text-sm mb-6">
              Please enter the 6-digit verification code sent to <strong className="text-secondary">{regUserEmailOrUsername}</strong>.
            </p>

            {otpError && (
              <div className="mb-4 bg-rose-50 border border-rose-250 text-rose-600 p-3.5 rounded-2xl text-xs font-medium text-left">
                {otpError}
              </div>
            )}
            {otpSuccess && (
              <div className="mb-4 bg-emerald-55 border border-emerald-250 text-emerald-600 p-3.5 rounded-2xl text-xs font-medium text-left">
                {otpSuccess}
              </div>
            )}

            <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  maxLength={6}
                  value={otpValue}
                  onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                  className="w-full tracking-[10px] text-center font-mono font-extrabold text-2xl bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-emerald-100 rounded-2xl py-4 pr-1 text-text-primary placeholder-slate-300 transition-all outline-none"
                  placeholder="000000"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={otpLoading}
                className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-md shadow-emerald-500/10 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {otpLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span>Verify Code</span>
                )}
              </button>
            </form>

            <div className="mt-6 flex justify-between items-center text-sm">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={otpCooldown > 0 || otpLoading}
                className="text-primary hover:underline font-semibold disabled:text-slate-400 disabled:no-underline cursor-pointer"
              >
                {otpCooldown > 0 ? `Resend Code in ${otpCooldown}s` : 'Resend Code'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowOtpModal(false);
                  setSuccessMsg('Account is pending verification. Please verify before signing in.');
                }}
                className="text-text-secondary hover:text-secondary font-medium cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LoginPage;
