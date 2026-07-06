import { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  FiMail, FiLock, FiUser, FiPhone, FiArrowRight, 
  FiShoppingBag, FiHome, FiCheckCircle, FiEye, FiEyeOff 
} from 'react-icons/fi';
import api from '../services/api';

const LoginPage = ({ defaultTab = 'login' }) => {
  const { login, register, isAuthenticated, user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  // State hooks
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginEmailOrUsername, setLoginEmailOrUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [valErrors, setValErrors] = useState({});
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [showVerifyPrompt, setShowVerifyPrompt] = useState(false);
  const [regUserEmailOrUsername, setRegUserEmailOrUsername] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSuccess, setOtpSuccess] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0);

  // Upgrade Validation States
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [usernameBackendError, setUsernameBackendError] = useState('');

  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState(null);
  const [emailBackendError, setEmailBackendError] = useState('');

  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [phoneAvailable, setPhoneAvailable] = useState(null);
  const [phoneBackendError, setPhoneBackendError] = useState('');

  const [acceptTerms, setAcceptTerms] = useState(false);
  const [termsError, setTermsError] = useState('');

  // Sync tab state when routes switch
  useEffect(() => {
    setActiveTab(defaultTab);
    setErrorMsg('');
    setSuccessMsg('');
  }, [defaultTab]);

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
      if (regUsername.length < 3 || regUsername.length > 30) {
        errors.username = 'Username must be between 3 and 30 characters.';
      } else if (!/^[a-zA-Z]/.test(regUsername)) {
        errors.username = 'Username must start with a letter.';
      } else if (!/^[a-zA-Z0-9_]+$/.test(regUsername)) {
        errors.username = 'Username can only contain letters, numbers, and underscores.';
      } else if (regUsername.includes('__')) {
        errors.username = 'Username cannot contain consecutive underscores.';
      } else if (regUsername.endsWith('_')) {
        errors.username = 'Username cannot end with an underscore.';
      }
    }

    // Email validation
    if (regEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(regEmail)) {
        errors.email = 'Please enter a valid email address.';
      } else if (regEmail.includes('..')) {
        errors.email = 'Email address cannot contain consecutive dots.';
      }
    }

    // Phone validation
    if (regPhone) {
      if (!/^[6-9]\d{9}$/.test(regPhone)) {
        errors.phone = 'Phone number must start with 6-9 and contain exactly 10 digits.';
      }
    }

    // Password validation
    if (regPassword) {
      if (regPassword.length < 8 || regPassword.length > 128) {
        errors.password = 'Password must be between 8 and 128 characters.';
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

  // Debounced API Check for Username
  useEffect(() => {
    if (activeTab !== 'register' || !regUsername) {
      setIsCheckingUsername(false);
      setUsernameAvailable(null);
      setUsernameBackendError('');
      return;
    }

    if (regUsername.length < 3 || regUsername.length > 30 || 
        !/^[a-zA-Z]/.test(regUsername) || 
        !/^[a-zA-Z0-9_]+$/.test(regUsername) || 
        regUsername.includes('__') || 
        regUsername.endsWith('_')) {
      setUsernameAvailable(false);
      setUsernameBackendError('');
      return;
    }

    const reserved = ['admin', 'administrator', 'root', 'superadmin', 'support', 'help', 'owner', 'system', 'test', 'guest', 'api', 'staff', 'null', 'undefined'];
    if (reserved.includes(regUsername.toLowerCase())) {
      setUsernameAvailable(false);
      setUsernameBackendError('This username is reserved.');
      return;
    }

    setIsCheckingUsername(true);
    setUsernameAvailable(null);
    setUsernameBackendError('');

    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await api.post('/auth/check-username/', { username: regUsername });
        if (res.data.available) {
          setUsernameAvailable(true);
          setUsernameBackendError('');
        } else {
          setUsernameAvailable(false);
          setUsernameBackendError(res.data.detail || 'Username is already taken.');
        }
      } catch (err) {
        setUsernameAvailable(false);
        setUsernameBackendError('Error checking username.');
      } finally {
        setIsCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [regUsername, activeTab]);

  // Debounced API Check for Email
  useEffect(() => {
    if (activeTab !== 'register' || !regEmail) {
      setIsCheckingEmail(false);
      setEmailAvailable(null);
      setEmailBackendError('');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(regEmail) || regEmail.includes('..')) {
      setEmailAvailable(false);
      setEmailBackendError('');
      return;
    }

    setIsCheckingEmail(true);
    setEmailAvailable(null);
    setEmailBackendError('');

    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await api.post('/auth/check-email/', { email: regEmail });
        if (res.data.available) {
          setEmailAvailable(true);
          setEmailBackendError('');
        } else {
          setEmailAvailable(false);
          setEmailBackendError(res.data.detail || 'Email is already registered.');
        }
      } catch (err) {
        setEmailAvailable(false);
        setEmailBackendError(err.response?.data?.detail || 'Error checking email.');
      } finally {
        setIsCheckingEmail(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [regEmail, activeTab]);

  // Debounced API Check for Phone
  useEffect(() => {
    if (activeTab !== 'register' || !regPhone) {
      setIsCheckingPhone(false);
      setPhoneAvailable(null);
      setPhoneBackendError('');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(regPhone)) {
      setPhoneAvailable(false);
      setPhoneBackendError('');
      return;
    }

    setIsCheckingPhone(true);
    setPhoneAvailable(null);
    setPhoneBackendError('');

    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await api.post('/auth/check-phone/', { phone_number: regPhone });
        if (res.data.available) {
          setPhoneAvailable(true);
          setPhoneBackendError('');
        } else {
          setPhoneAvailable(false);
          setPhoneBackendError(res.data.detail || 'Phone number is already registered.');
        }
      } catch (err) {
        setPhoneAvailable(false);
        setPhoneBackendError('Error checking phone number.');
      } finally {
        setIsCheckingPhone(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [regPhone, activeTab]);

  // Password Strength and Checklist calculation
  const getPasswordStrength = () => {
    if (!regPassword) return { score: 0, text: '', color: 'bg-slate-200', barWidth: 'w-0' };
    
    let score = 0;
    if (regPassword.length >= 8) score++;
    if (/[A-Z]/.test(regPassword)) score++;
    if (/[a-z]/.test(regPassword)) score++;
    if (/[0-9]/.test(regPassword)) score++;
    if (/[@$!%*?&#]/.test(regPassword)) score++;

    const lowerPassword = regPassword.toLowerCase();
    const emailName = regEmail ? regEmail.split('@')[0].toLowerCase() : '';
    const lowerUsername = regUsername ? regUsername.toLowerCase() : '';
    const containsIdentity = 
      (lowerUsername && lowerUsername.length >= 3 && lowerPassword.includes(lowerUsername)) ||
      (emailName && emailName.length >= 3 && lowerPassword.includes(emailName)) ||
      (regPhone && regPhone.length >= 3 && lowerPassword.includes(regPhone));

    if (containsIdentity && score > 1) {
      score = Math.max(1, score - 2);
    }

    let text = '';
    let color = '';
    let barWidth = '';
    switch (score) {
      case 0:
      case 1:
        text = 'Very Weak';
        color = 'bg-rose-500';
        barWidth = 'w-1/5';
        break;
      case 2:
        text = 'Weak';
        color = 'bg-orange-500';
        barWidth = 'w-2/5';
        break;
      case 3:
        text = 'Medium';
        color = 'bg-yellow-500';
        barWidth = 'w-3/5';
        break;
      case 4:
        text = 'Strong';
        color = 'bg-emerald-400';
        barWidth = 'w-4/5';
        break;
      case 5:
        text = 'Very Strong';
        color = 'bg-[#10B981]';
        barWidth = 'w-full';
        break;
      default:
        text = '';
        color = 'bg-slate-200';
        barWidth = 'w-0';
    }

    return { score, text, color, barWidth, containsIdentity };
  };

  const strength = getPasswordStrength();

  const passwordCriteria = [
    { label: '8+ characters', met: regPassword.length >= 8 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(regPassword) },
    { label: 'Lowercase letter', met: /[a-z]/.test(regPassword) },
    { label: 'Number', met: /[0-9]/.test(regPassword) },
    { label: 'Special character', met: /[@$!%*?&#]/.test(regPassword) },
  ];

  // Derived check for button disabled state
  const isRegisterDisabled = 
    isLoading ||
    isCheckingUsername ||
    usernameAvailable !== true ||
    isCheckingEmail ||
    emailAvailable !== true ||
    isCheckingPhone ||
    phoneAvailable !== true ||
    strength.score < 5 ||
    strength.containsIdentity ||
    regConfirmPassword !== regPassword ||
    !acceptTerms;

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
    setTermsError('');

    if (!regUsername || !regEmail || !regPhone || !regPassword || !regConfirmPassword) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (!acceptTerms) {
      setTermsError('You must agree to the Terms & Conditions and Privacy Policy.');
      return;
    }

    if (isRegisterDisabled) {
      setErrorMsg('Please resolve all validation errors before registering.');
      return;
    }

    setIsLoading(true);
    const cleanedPhone = regPhone.trim().replace(/\s+/g, '');
    const cleanedUsername = regUsername.trim().replace(/\s+/g, '');
    const cleanedEmail = regEmail.trim().toLowerCase();

    const result = await register(cleanedUsername, cleanedEmail, cleanedPhone, regPassword, regConfirmPassword);
    setIsLoading(false);

    if (result.success) {
      setRegUserEmailOrUsername(cleanedEmail || cleanedUsername);
      setSuccessMsg('Registration successful! Please enter the 6-digit OTP code sent to your email.');
      setRegUsername('');
      setRegEmail('');
      setRegPhone('');
      setRegPassword('');
      setRegConfirmPassword('');
      setAcceptTerms(false);
      setTermsError('');
      setShowOtpModal(true);
      setOtpCooldown(30);
    } else {
      let errorLines = [];
      if (result.error && typeof result.error === 'object') {
        Object.entries(result.error).forEach(([key, val]) => {
          const msgs = Array.isArray(val) ? val : [val];
          msgs.forEach(msg => {
            if (key === 'detail') {
              errorLines.push(String(msg));
            } else {
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
      
      const { access, refresh, user: userData } = res.data;
      if (access && refresh && userData) {
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
      }

      setOtpSuccess(res.data.detail || 'Email verified successfully! Logging you in...');
      setOtpValue('');
      
      setTimeout(() => {
        setShowOtpModal(false);
        if (userData && userData.role === 'ADMIN') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }, 1500);
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

  const handleCancelOtp = async () => {
    setShowOtpModal(false);
    setSuccessMsg('Registration cancelled. You can register again at any time.');
    try {
      await api.post('/auth/cancel-registration/', {
        username: regUserEmailOrUsername
      });
    } catch (err) {
      console.error('Failed to cancel registration in backend:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] flex flex-col items-center justify-center p-4 relative overflow-y-auto text-left">
      
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[5%] left-[10%] w-[380px] h-[380px] rounded-full bg-emerald-500/5 blur-[100px]" />
        <div className="absolute bottom-[8%] right-[8%] w-[420px] h-[420px] rounded-full bg-[#F97316]/5 blur-[110px]" />
      </div>

      {/* Floating Home Link */}
      <Link 
        to="/" 
        className="absolute top-4 left-4 xs:top-6 xs:left-6 flex items-center space-x-1.5 text-slate-600 hover:text-slate-900 font-semibold text-xs bg-white border border-slate-250/50 hover:bg-slate-50 px-3.5 py-2.5 rounded-lg shadow-sm transition-all z-20 min-h-[44px]"
      >
        <FiHome className="w-3.5 h-3.5" />
        <span>Back to Home</span>
      </Link>

      <div className="w-full max-w-md bg-white border border-slate-200/60 rounded-xl p-6 sm:p-8 shadow-sm relative z-10 my-12 transition-all duration-300 hover:border-slate-350">
        
        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="bg-[#10B981] p-3 rounded-lg text-white shadow-sm inline-flex items-center justify-center mb-3">
            <FiShoppingBag className="w-5 h-5" />
          </div>
          <h2 className="font-poppins font-semibold text-xl text-slate-900 tracking-tight leading-none">Shivam Kirana Store</h2>
          <p className="text-slate-400 text-xs mt-1.5 font-medium">Smart Groceries & Ledger Khata Management</p>
        </div>

        {/* Tab Toggles */}
        <div className="flex bg-slate-50 border border-slate-200/60 p-1.5 rounded-xl mb-6">
          <button
            onClick={() => { setActiveTab('login'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`w-1/2 py-2.5 rounded-lg font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer min-h-[44px] flex items-center justify-center ${
              activeTab === 'login'
                ? 'bg-white text-slate-900 border border-slate-200/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-900'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setActiveTab('register'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`w-1/2 py-2.5 rounded-lg font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer min-h-[44px] flex items-center justify-center ${
              activeTab === 'register'
                ? 'bg-white text-slate-900 border border-slate-200/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-900'
            }`}
          >
            Register
          </button>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="mb-5 bg-rose-50/50 border border-rose-100 text-rose-600 p-3.5 rounded-lg text-xs font-medium leading-relaxed flex flex-col space-y-1.5">
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
                  
                  setOtpLoading(true);
                  try {
                    await api.post('/auth/resend-otp/', {
                      username: loginEmailOrUsername
                    });
                    setOtpSuccess('Verification code sent to your email.');
                  } catch {
                    setOtpError('Failed to send verification code. Please request a resend.');
                  } finally {
                    setOtpLoading(false);
                  }
                }}
                className="text-left text-rose-600 underline font-bold mt-1.5 hover:text-rose-700 cursor-pointer"
              >
                Click here to verify your email now
              </button>
            )}
          </div>
        )}
        {successMsg && (
          <div className="mb-5 bg-emerald-50/50 border border-emerald-100 text-[#10B981] p-3.5 rounded-lg text-xs font-medium leading-relaxed">
            {successMsg}
          </div>
        )}

        {/* Login Form */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left">
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <FiMail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={loginEmailOrUsername}
                  onChange={(e) => setLoginEmailOrUsername(e.target.value)}
                  className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200/80 focus:border-[#10B981] focus:ring-2 focus:ring-emerald-500/20 rounded-lg py-2.5 pl-9 pr-4 text-xs sm:text-sm text-slate-900 placeholder-slate-400 transition-all outline-none"
                  placeholder="e.g. shivam"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <FiLock className="w-4 h-4" />
                </div>
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200/80 focus:border-[#10B981] focus:ring-2 focus:ring-emerald-500/20 rounded-lg py-2.5 pl-9 pr-9 text-xs sm:text-sm text-slate-900 placeholder-slate-400 transition-all outline-none"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label={showLoginPassword ? "Hide password" : "Show password"}
                >
                  {showLoginPassword ? <FiEye className="w-4 h-4" /> : <FiEyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-0.5">
              <Link 
                to="/forgot-password" 
                className="text-xs font-semibold text-[#10B981] hover:text-[#059669] hover:underline transition-colors"
              >
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-[#10B981] hover:bg-[#059669] text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center space-x-1.5 shadow-sm active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer text-sm min-h-[44px]"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left">
                Username <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <FiUser className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  className={`w-full bg-slate-50/50 hover:bg-white focus:bg-white border ${
                    valErrors.username || usernameBackendError
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                      : usernameAvailable === true
                      ? 'border-emerald-300 focus:border-[#10B981] focus:ring-2 focus:ring-emerald-500/20'
                      : 'border-slate-200/80 focus:border-[#10B981] focus:ring-2 focus:ring-emerald-500/20'
                  } rounded-lg py-2.5 pl-9 pr-9 text-xs sm:text-sm text-slate-900 placeholder-slate-400 transition-all outline-none`}
                  placeholder="e.g. shivam"
                  required
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  {isCheckingUsername && (
                    <div className="w-3.5 h-3.5 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin"></div>
                  )}
                  {!isCheckingUsername && usernameAvailable === true && (
                    <span className="text-[#10B981] font-bold text-xs">✓</span>
                  )}
                  {!isCheckingUsername && usernameAvailable === false && (
                    <span className="text-rose-500 font-bold text-xs">✕</span>
                  )}
                </div>
              </div>
              {(valErrors.username || usernameBackendError) && (
                <p className="mt-1 text-[11px] font-medium text-rose-500">
                  {valErrors.username || usernameBackendError}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <FiMail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className={`w-full bg-slate-50/50 hover:bg-white focus:bg-white border ${
                    valErrors.email || emailBackendError
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                      : emailAvailable === true
                      ? 'border-emerald-300 focus:border-[#10B981] focus:ring-2 focus:ring-emerald-500/20'
                      : 'border-slate-200/80 focus:border-[#10B981] focus:ring-2 focus:ring-emerald-500/20'
                  } rounded-lg py-2.5 pl-9 pr-9 text-xs sm:text-sm text-slate-900 placeholder-slate-400 transition-all outline-none`}
                  placeholder="e.g. shivam@gmail.com"
                  required
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  {isCheckingEmail && (
                    <div className="w-3.5 h-3.5 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin"></div>
                  )}
                  {!isCheckingEmail && emailAvailable === true && (
                    <span className="text-[#10B981] font-bold text-xs">✓</span>
                  )}
                  {!isCheckingEmail && emailAvailable === false && (
                    <span className="text-rose-500 font-bold text-xs">✕</span>
                  )}
                </div>
              </div>
              {(valErrors.email || emailBackendError) && (
                <p className="mt-1 text-[11px] font-medium text-rose-500">
                  {valErrors.email || emailBackendError}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <FiPhone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className={`w-full bg-slate-50/50 hover:bg-white focus:bg-white border ${
                    valErrors.phone || phoneBackendError
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                      : phoneAvailable === true
                      ? 'border-emerald-300 focus:border-[#10B981] focus:ring-2 focus:ring-emerald-500/20'
                      : 'border-slate-200/80 focus:border-[#10B981] focus:ring-2 focus:ring-emerald-500/20'
                  } rounded-lg py-2.5 pl-9 pr-9 text-xs sm:text-sm text-slate-900 placeholder-slate-450 transition-all outline-none`}
                  placeholder="e.g. 9988776655"
                  required
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  {isCheckingPhone && (
                    <div className="w-3.5 h-3.5 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin"></div>
                  )}
                  {!isCheckingPhone && phoneAvailable === true && (
                    <span className="text-[#10B981] font-bold text-xs">✓</span>
                  )}
                  {!isCheckingPhone && phoneAvailable === false && (
                    <span className="text-rose-500 font-bold text-xs">✕</span>
                  )}
                </div>
              </div>
              {(valErrors.phone || phoneBackendError) && (
                <p className="mt-1 text-[11px] font-medium text-rose-500">
                  {valErrors.phone || phoneBackendError}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left">
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <FiLock className="w-4 h-4" />
                </div>
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className={`w-full bg-slate-50/50 hover:bg-white focus:bg-white border ${valErrors.password ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20' : 'border-slate-200/80 focus:border-[#10B981] focus:ring-2 focus:ring-emerald-500/20'} rounded-lg py-2.5 pl-9 pr-9 text-xs sm:text-sm text-slate-900 placeholder-slate-450 transition-all outline-none`}
                  placeholder="Min. 8 characters"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-650 cursor-pointer"
                  aria-label={showRegPassword ? "Hide password" : "Show password"}
                >
                  {showRegPassword ? <FiEye className="w-4 h-4" /> : <FiEyeOff className="w-4 h-4" />}
                </button>
              </div>
              {valErrors.password && (
                <p className="mt-1 text-[11px] font-medium text-rose-500">{valErrors.password}</p>
              )}

              {/* Password strength checklist and bar */}
              {regPassword && (
                <div className="mt-2.5 space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between text-[11px] font-semibold">
                    <span className="text-slate-500">Password Strength:</span>
                    <span className={`${strength.color.replace('bg-', 'text-')} font-bold`}>{strength.text}</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div className={`h-full ${strength.color} ${strength.barWidth} transition-all duration-350`}></div>
                  </div>
                  {strength.containsIdentity && (
                    <p className="text-[10px] text-rose-500 font-semibold leading-snug">
                      ✕ Password cannot contain your username, email name, or phone number.
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-slate-200">
                    {passwordCriteria.map((c, i) => (
                      <div key={i} className="flex items-center space-x-1 text-[10px]">
                        <span className={c.met ? "text-[#10B981] font-bold" : "text-slate-350"}>
                          {c.met ? '✓' : '•'}
                        </span>
                        <span className={c.met ? "text-slate-600 font-medium" : "text-slate-400"}>
                          {c.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left">
                Confirm Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <FiLock className="w-4 h-4" />
                </div>
                <input
                  type={showRegConfirmPassword ? 'text' : 'password'}
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  className={`w-full bg-slate-50/50 hover:bg-white focus:bg-white border ${valErrors.confirmPassword ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20' : regConfirmPassword && regConfirmPassword === regPassword ? 'border-emerald-300 focus:border-[#10B981] focus:ring-2 focus:ring-emerald-500/20' : 'border-slate-200/80 focus:border-[#10B981] focus:ring-2 focus:ring-emerald-500/20'} rounded-lg py-2.5 pl-9 pr-9 text-xs sm:text-sm text-slate-900 placeholder-slate-450 transition-all outline-none`}
                  placeholder="Retype password"
                  required
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center space-x-2">
                  {regConfirmPassword && regConfirmPassword === regPassword && (
                    <span className="text-[#10B981] font-bold text-xs">✓</span>
                  )}
                  {regConfirmPassword && regConfirmPassword !== regPassword && (
                    <span className="text-rose-500 font-bold text-xs">✕</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                    className="text-slate-400 hover:text-slate-650 cursor-pointer"
                    aria-label={showRegConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showRegConfirmPassword ? <FiEye className="w-4 h-4" /> : <FiEyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {valErrors.confirmPassword && (
                <p className="mt-1 text-[11px] font-medium text-rose-500">{valErrors.confirmPassword}</p>
              )}
            </div>

            {/* Terms & Conditions Checkbox */}
            <div className="flex flex-col space-y-1.5 pt-1.5">
              <div className="flex items-start space-x-2">
                <input
                  type="checkbox"
                  id="acceptTerms"
                  checked={acceptTerms}
                  onChange={(e) => {
                    setAcceptTerms(e.target.checked);
                    if (e.target.checked) setTermsError('');
                  }}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-[#10B981] focus:ring-[#10B981] cursor-pointer"
                />
                <label htmlFor="acceptTerms" className="text-xs text-slate-500 leading-tight cursor-pointer selection:bg-transparent pl-0.5">
                  I agree to the{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#10B981] hover:underline font-semibold">
                    Terms & Conditions
                  </a>{' '}
                  and{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#10B981] hover:underline font-semibold">
                    Privacy Policy
                  </a>{' '}
                  <span className="text-rose-500">*</span>
                </label>
              </div>
              {termsError && (
                <p className="text-[11px] font-medium text-rose-500">{termsError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isRegisterDisabled}
              className="w-full mt-2 bg-[#10B981] hover:bg-[#059669] text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center space-x-1.5 shadow-sm active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer text-sm min-h-[44px]"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-8 shadow-lg text-center space-y-4">
            <div className="bg-emerald-50 text-[#10B981] p-3 rounded-lg border border-emerald-100/50 inline-block">
              <FiCheckCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-semibold text-lg text-slate-900 tracking-tight">Verify your account</h3>
              <p className="text-slate-500 text-xs sm:text-sm">
                Please enter the 6-digit verification code sent to <strong className="text-slate-800 font-semibold">{regUserEmailOrUsername}</strong>.
              </p>
            </div>

            {otpError && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-xs text-left font-medium">
                {otpError}
              </div>
            )}
            {otpSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700 text-xs text-left font-medium">
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
                  className="w-full tracking-[0.4em] text-center font-mono font-semibold text-2xl bg-slate-50/50 focus:bg-white border border-slate-200 focus:border-[#10B981] focus:ring-2 focus:ring-emerald-500/20 rounded-lg py-3 px-4 outline-none transition-all text-slate-900"
                  placeholder="000000"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={otpLoading}
                className="w-full bg-[#10B981] hover:bg-[#059669] text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center space-x-1.5 shadow-sm active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer text-sm min-h-[44px]"
              >
                {otpLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span>Verify Code</span>
                )}
              </button>
            </form>

            <div className="flex justify-between items-center text-xs font-semibold pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={otpCooldown > 0 || otpLoading}
                className="text-[#10B981] hover:text-[#059669] disabled:text-slate-400 cursor-pointer"
              >
                {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : 'Resend Code'}
              </button>
              <button
                type="button"
                onClick={handleCancelOtp}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
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
