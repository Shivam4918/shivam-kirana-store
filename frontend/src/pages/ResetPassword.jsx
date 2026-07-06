import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { FiLock, FiEye, FiEyeOff, FiCheck, FiX, FiShoppingBag, FiCheckCircle } from 'react-icons/fi';
import api from '../services/api';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Password criteria state
  const [criteria, setCriteria] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    specialChar: false,
  });

  // Calculate password strength and live criteria checklist
  useEffect(() => {
    setCriteria({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      specialChar: /[^a-zA-Z0-9]/.test(password),
    });
  }, [password]);

  const getStrengthScore = () => {
    let score = 0;
    if (criteria.length) score++;
    if (criteria.uppercase) score++;
    if (criteria.lowercase) score++;
    if (criteria.number) score++;
    if (criteria.specialChar) score++;
    return score;
  };

  const score = getStrengthScore();
  const strengthText = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'][score - 1] || 'None';
  const strengthColor = [
    'bg-rose-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-blue-500',
    'bg-emerald-500',
  ][score - 1] || 'bg-slate-200';

  const isFormValid =
    token &&
    criteria.length &&
    criteria.uppercase &&
    criteria.lowercase &&
    criteria.number &&
    criteria.specialChar &&
    password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!token) {
      setErrorMsg('Invalid password reset session. Please request a new link.');
      return;
    }

    if (!isFormValid) {
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.');
      } else {
        setErrorMsg('Please ensure all password security requirements are met.');
      }
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/auth/reset-password/', {
        token,
        password,
        confirm_password: confirmPassword,
      });
      setSuccessMsg(res.data.detail || 'Password reset successfully! Redirecting you to login...');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setErrorMsg(
        err.response?.data?.detail ||
          'Failed to reset password. The link might be expired or already used. Please request a new password reset.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] flex flex-col items-center justify-center p-4 relative overflow-y-auto text-left">
      {/* Background blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#F97316]/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-white border border-slate-200/60 rounded-xl p-8 shadow-sm relative z-10">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="bg-[#10B981] p-3 rounded-lg text-white shadow-sm inline-block mb-3">
            <FiShoppingBag className="w-5 h-5" />
          </div>
          <h2 className="font-semibold text-xl text-slate-900 tracking-tight leading-none">Shivam Kirana Store</h2>
          <p className="text-slate-405 text-xs mt-1.5 font-medium">Smart Groceries &amp; Ledger Khata Management</p>
        </div>

        <h3 className="text-base font-bold text-slate-800 mb-2 tracking-tight">Create New Password</h3>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          Please enter your new password below. Ensure it meets all strength requirements.
        </p>

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-5 p-4 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700 text-xs font-semibold leading-relaxed flex flex-col items-center text-center space-y-3">
            <div className="bg-emerald-100 p-2 rounded-full text-[#10B981]">
              <FiCheckCircle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <p className="font-bold text-sm">Success!</p>
              <p className="text-[11px] text-slate-500 mt-1">{successMsg}</p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-xs font-semibold leading-relaxed">
            {errorMsg}
          </div>
        )}

        {!token && (
          <div className="mb-5 p-3.5 bg-amber-50 border border-amber-100 rounded-lg text-amber-700 text-xs font-semibold leading-relaxed">
            Missing or invalid reset token. Please request a new reset link from the login page.
          </div>
        )}

        {!successMsg && token && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password input */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                New Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-405">
                  <FiLock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 focus:border-[#10B981] focus:ring-2 focus:ring-emerald-500/20 rounded-lg py-2.5 pl-9 pr-9 text-xs sm:text-sm text-slate-900 placeholder-slate-400 transition-all outline-none min-h-[44px]"
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-405 hover:text-slate-600 cursor-pointer min-h-[44px]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FiEye className="w-4 h-4" /> : <FiEyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password input */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Confirm Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-405">
                  <FiLock className="w-4 h-4" />
                </span>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 focus:border-[#10B981] focus:ring-2 focus:ring-emerald-500/20 rounded-lg py-2.5 pl-9 pr-9 text-xs sm:text-sm text-slate-900 placeholder-slate-400 transition-all outline-none min-h-[44px]"
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-450 hover:text-slate-600 cursor-pointer min-h-[44px]"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <FiEye className="w-4 h-4" /> : <FiEyeOff className="w-4 h-4" />}
                </button>
              </div>
              {password && confirmPassword && password !== confirmPassword && (
                <p className="text-[10px] text-rose-500 font-semibold">Passwords do not match.</p>
              )}
            </div>

            {/* Password Strength Meter */}
            {password && (
              <div className="space-y-2 py-2">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                  <span>Password Strength</span>
                  <span className={score >= 4 ? 'text-emerald-500' : score >= 2 ? 'text-orange-500' : 'text-rose-500'}>
                    {strengthText}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                  {[...Array(5)].map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-full flex-1 transition-colors duration-300 ${
                        idx < score ? strengthColor : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
                
                {/* Requirements checklist */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-2 text-[10px] text-slate-500">
                  <div className="flex items-center space-x-1.5">
                    {criteria.length ? (
                      <FiCheck className="text-emerald-500 w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <FiX className="text-slate-300 w-3.5 h-3.5 shrink-0" />
                    )}
                    <span className={criteria.length ? 'text-slate-700 font-semibold' : ''}>8+ characters</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {criteria.uppercase ? (
                      <FiCheck className="text-emerald-500 w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <FiX className="text-slate-300 w-3.5 h-3.5 shrink-0" />
                    )}
                    <span className={criteria.uppercase ? 'text-slate-700 font-semibold' : ''}>Uppercase letter</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {criteria.lowercase ? (
                      <FiCheck className="text-emerald-500 w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <FiX className="text-slate-300 w-3.5 h-3.5 shrink-0" />
                    )}
                    <span className={criteria.lowercase ? 'text-slate-700 font-semibold' : ''}>Lowercase letter</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {criteria.number ? (
                      <FiCheck className="text-emerald-500 w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <FiX className="text-slate-300 w-3.5 h-3.5 shrink-0" />
                    )}
                    <span className={criteria.number ? 'text-slate-700 font-semibold' : ''}>At least one number</span>
                  </div>
                  <div className="flex items-center space-x-1.5 col-span-2">
                    {criteria.specialChar ? (
                      <FiCheck className="text-emerald-500 w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <FiX className="text-slate-300 w-3.5 h-3.5 shrink-0" />
                    )}
                    <span className={criteria.specialChar ? 'text-slate-700 font-semibold' : ''}>
                      Special character (!@#$%^&*)
                    </span>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !isFormValid}
              className="w-full bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer text-sm min-h-[44px]"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>Reset Password</span>
              )}
            </button>
          </form>
        )}

        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <Link
            to="/login"
            className="text-slate-405 hover:text-slate-700 text-xs font-semibold transition-colors"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
