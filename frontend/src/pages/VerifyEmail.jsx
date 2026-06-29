import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../services/api';
import {
  FiCheckCircle,
  FiXCircle,
  FiShoppingBag,
  FiArrowRight,
  FiRefreshCw,
  FiMail,
} from 'react-icons/fi';

const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // The email/username is passed via router state from the registration page
  const emailOrUsername = location.state?.emailOrUsername || '';

  const [otpValue, setOtpValue] = useState('');
  const [status, setStatus] = useState(emailOrUsername ? 'pending' : 'no_identifier');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setMessage('');
    setResendMessage('');

    if (!otpValue || otpValue.length !== 6 || !/^\d{6}$/.test(otpValue)) {
      setMessage('Please enter a valid 6-digit numeric code.');
      setStatus('error');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/auth/verify-otp/', {
        username: emailOrUsername,
        otp: otpValue,
      });
      setStatus('success');
      setMessage(res.data.detail || 'Email verified successfully! You can now log in.');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setStatus('error');
      setMessage(
        err.response?.data?.detail ||
          'Invalid or expired verification code. Please try again or request a new code.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resendLoading) return;
    setResendMessage('');
    setMessage('');
    setResendLoading(true);

    try {
      const res = await api.post('/auth/resend-otp/', { username: emailOrUsername });
      setResendMessage(res.data.detail || 'A new verification code has been sent to your email.');
      setCooldown(60);
      setStatus('pending');
    } catch (err) {
      setResendMessage(err.response?.data?.detail || 'Failed to resend code. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] flex flex-col items-center justify-center p-4 relative overflow-y-auto text-left">
      {/* Background blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#F97316]/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-white border border-slate-200/60 rounded-xl p-8 shadow-sm relative z-10 text-center">
        {/* Brand header */}
        <div className="mb-8">
          <div className="bg-[#10B981] p-3 rounded-lg text-white shadow-sm inline-block mb-3">
            <FiShoppingBag className="w-5 h-5" />
          </div>
          <h2 className="font-semibold text-xl text-slate-900 tracking-tight leading-none">Shivam Kirana Store</h2>
          <p className="text-slate-400 text-xs mt-1.5 font-medium">Smart Groceries &amp; Ledger Khata Management</p>
        </div>

        {/* ── SUCCESS STATE ── */}
        {status === 'success' && (
          <div className="py-4 flex flex-col items-center space-y-4">
            <div className="bg-emerald-50 text-[#10B981] p-3.5 rounded-full">
              <FiCheckCircle className="w-10 h-10 animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-semibold text-lg text-slate-900 tracking-tight">Verification Successful!</h3>
              <p className="text-slate-500 text-xs sm:text-sm px-4">{message}</p>
            </div>
            <p className="text-slate-400 text-[10px] font-medium pt-2">Redirecting to sign in automatically...</p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-[#10B981] hover:bg-[#059669] text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm text-sm"
            >
              <span>Sign In Now</span>
              <FiArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── NO IDENTIFIER ── */}
        {status === 'no_identifier' && (
          <div className="py-4 flex flex-col items-center space-y-4">
            <div className="bg-rose-50 text-rose-500 p-3.5 rounded-full">
              <FiXCircle className="w-10 h-10" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-semibold text-lg text-slate-900 tracking-tight">Invalid Access</h3>
              <p className="text-slate-500 text-xs sm:text-sm px-4">
                Please register first to receive a verification code.
              </p>
            </div>
            <div className="w-full flex flex-col gap-2 pt-2">
              <button
                onClick={() => navigate('/register')}
                className="w-full bg-[#10B981] hover:bg-[#059669] text-white font-semibold py-2.5 px-4 rounded-lg transition-colors cursor-pointer text-sm shadow-sm"
              >
                Go to Register
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 font-semibold py-2.5 px-4 rounded-lg transition-all cursor-pointer text-xs"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        )}

        {/* ── OTP ENTRY STATE ── */}
        {(status === 'pending' || status === 'error') && emailOrUsername && (
          <div className="py-1">
            <div className="flex flex-col items-center mb-6 space-y-3">
              <div className="bg-emerald-50 text-[#10B981] p-3 rounded-lg border border-emerald-100/50">
                <FiMail className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-lg text-slate-900 tracking-tight">Check Your Email</h3>
                <p className="text-slate-500 text-xs sm:text-sm">
                  We sent a verification code to{' '}
                  <span className="font-semibold text-slate-800">{emailOrUsername}</span>.
                </p>
              </div>
            </div>

            {/* Error Message */}
            {status === 'error' && message && (
              <div className="mb-5 p-3.5 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-xs text-left font-medium leading-relaxed">
                {message}
              </div>
            )}

            {/* Resend success/info */}
            {resendMessage && (
              <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700 text-xs text-left font-medium leading-relaxed">
                {resendMessage}
              </div>
            )}

            {/* OTP Form */}
            <form onSubmit={handleVerify} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left">
                  Verification Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={otpValue}
                  onChange={(e) =>
                    setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  placeholder="000000"
                  className="w-full text-center text-3xl font-semibold font-mono tracking-[0.4em] border border-slate-200 focus:border-[#10B981] focus:ring-2 focus:ring-emerald-500/20 rounded-lg py-3 px-4 outline-none transition-all bg-slate-50/50 focus:bg-white text-slate-900"
                  autoFocus
                  autoComplete="one-time-code"
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || otpValue.length !== 6}
                className="w-full bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer text-sm"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <FiCheckCircle className="w-4.5 h-4.5" />
                    <span>Verify Email</span>
                  </>
                )}
              </button>
            </form>

            {/* Resend section */}
            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
              <p className="text-slate-500 text-xs mb-3">Didn&apos;t receive the email?</p>
              {cooldown > 0 ? (
                <p className="text-slate-400 text-xs font-semibold">
                  Resend code available in{' '}
                  <span className="text-[#10B981] font-bold font-mono">{cooldown}s</span>
                </p>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="inline-flex items-center justify-center gap-1 text-[#10B981] hover:text-[#059669] font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <FiRefreshCw className={`w-3.5 h-3.5 ${resendLoading ? 'animate-spin' : ''}`} />
                  <span>{resendLoading ? 'Sending...' : 'Resend Code'}</span>
                </button>
              )}
            </div>

            <div className="mt-5 text-center">
              <Link
                to="/login"
                className="text-slate-400 hover:text-slate-600 text-xs font-medium transition-colors"
              >
                ← Back to Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
