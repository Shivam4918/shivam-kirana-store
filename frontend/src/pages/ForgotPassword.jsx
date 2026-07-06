import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiMail, FiArrowRight, FiShoppingBag } from 'react-icons/fi';
import api from '../services/api';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailValError, setEmailValError] = useState('');

  const handleEmailChange = (val) => {
    setEmail(val);
    setEmailValError('');
    setErrorMsg('');
    setSuccessMsg('');
    
    if (val) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(val)) {
        setEmailValError('Please enter a valid email address.');
      } else if (val.includes('..')) {
        setEmailValError('Email address cannot contain consecutive dots.');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email) {
      setErrorMsg('Please enter your registered email address.');
      return;
    }

    if (emailValError) {
      setErrorMsg('Please correct the email format before submitting.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/auth/forgot-password/', { email });
      setSuccessMsg(res.data.detail || 'Password reset link has been sent to your email.');
    } catch (err) {
      setErrorMsg(
        err.response?.data?.detail || 
        'An error occurred while requesting password reset. Please verify your email and try again.'
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
          <p className="text-slate-400 text-xs mt-1.5 font-medium">Smart Groceries &amp; Ledger Khata Management</p>
        </div>

        <h3 className="text-base font-bold text-slate-800 mb-2 tracking-tight">Forgot Password</h3>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          Enter the registered email address associated with your account and we will send you a secure link to reset your password.
        </p>

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700 text-xs font-semibold leading-relaxed">
            {successMsg}
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-xs font-semibold leading-relaxed">
            {errorMsg}
          </div>
        )}

        {!successMsg && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-405">
                  <FiMail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  className={`w-full bg-slate-50/50 hover:bg-white focus:bg-white border focus:ring-2 focus:ring-emerald-500/20 rounded-lg py-2.5 pl-9 pr-4 text-xs sm:text-sm text-slate-900 placeholder-slate-400 transition-all outline-none min-h-[44px] ${
                    emailValError ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10' : 'border-slate-200 focus:border-[#10B981]'
                  }`}
                  placeholder="e.g. shivam@gmail.com"
                  required
                  disabled={isLoading}
                  aria-label="Email address"
                />
              </div>
              {emailValError && (
                <p className="text-[10px] text-rose-500 font-semibold">{emailValError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !email || !!emailValError}
              className="w-full bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer text-sm min-h-[44px]"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <FiArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <Link
            to="/login"
            className="text-slate-405 hover:text-slate-700 text-xs font-semibold transition-colors"
          >
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
