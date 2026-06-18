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
    <div className="min-h-screen bg-[#F8FAFC] text-secondary flex flex-col items-center justify-center p-4 relative overflow-y-auto text-left">
      {/* Background blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-orange-500/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-white border border-slate-200/60 rounded-3xl p-8 shadow-xl relative z-10 text-center">
        {/* Brand header */}
        <div className="mb-6">
          <div className="bg-emerald-500 p-3 rounded-2xl text-white shadow-md shadow-emerald-500/20 inline-block mb-3">
            <FiShoppingBag className="w-6 h-6" />
          </div>
          <h2 className="font-bold text-2xl text-slate-800">Shivam Kirana Store</h2>
          <p className="text-slate-400 text-xs mt-1">Smart Groceries &amp; Ledger Khata Management</p>
        </div>

        {/* ── SUCCESS STATE ── */}
        {status === 'success' && (
          <div className="py-6 flex flex-col items-center">
            <div className="bg-emerald-50 text-emerald-500 p-4 rounded-full mb-4 animate-bounce">
              <FiCheckCircle className="w-12 h-12" />
            </div>
            <h3 className="font-bold text-xl text-slate-800 mb-2">Verification Successful!</h3>
            <p className="text-slate-500 text-sm px-4 mb-4">{message}</p>
            <p className="text-slate-400 text-xs mb-5">Redirecting to sign in automatically...</p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <span>Sign In Now</span>
              <FiArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── NO IDENTIFIER (direct URL access without registration) ── */}
        {status === 'no_identifier' && (
          <div className="py-6 flex flex-col items-center">
            <div className="bg-rose-50 text-rose-500 p-4 rounded-full mb-4">
              <FiXCircle className="w-12 h-12" />
            </div>
            <h3 className="font-bold text-xl text-slate-800 mb-2">Invalid Access</h3>
            <p className="text-slate-500 text-sm px-4 mb-6">
              Please register first to receive a verification code.
            </p>
            <div className="w-full flex flex-col gap-2">
              <button
                onClick={() => navigate('/register')}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-4 rounded-xl transition-all cursor-pointer"
              >
                Go to Register
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl transition-all cursor-pointer text-sm"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        )}

        {/* ── OTP ENTRY STATE ── */}
        {(status === 'pending' || status === 'error') && emailOrUsername && (
          <div className="py-2">
            <div className="flex flex-col items-center mb-6">
              <div className="bg-emerald-50 text-emerald-500 p-4 rounded-full mb-4">
                <FiMail className="w-10 h-10" />
              </div>
              <h3 className="font-bold text-xl text-slate-800 mb-1">Check Your Email</h3>
              <p className="text-slate-500 text-sm">
                We sent a 6-digit code to{' '}
                <span className="font-semibold text-slate-700">{emailOrUsername}</span>.
              </p>
              <p className="text-slate-400 text-xs mt-1">
                Enter the code below to verify your account.
              </p>
            </div>

            {/* Error */}
            {status === 'error' && message && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm text-left">
                {message}
              </div>
            )}

            {/* Resend success/info */}
            {resendMessage && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm text-left">
                {resendMessage}
              </div>
            )}

            {/* OTP Form */}
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 text-left">
                  6-Digit Verification Code
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
                  className="w-full text-center text-3xl font-bold tracking-[0.5em] border-2 border-slate-200 focus:border-emerald-500 rounded-xl py-4 px-4 outline-none transition-colors bg-slate-50"
                  autoFocus
                  autoComplete="one-time-code"
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || otpValue.length !== 6}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <FiCheckCircle className="w-5 h-5" />
                    <span>Verify Email</span>
                  </>
                )}
              </button>
            </form>

            {/* Resend section */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <p className="text-slate-500 text-sm mb-2">Didn&apos;t receive the email?</p>
              {cooldown > 0 ? (
                <p className="text-slate-400 text-sm font-medium">
                  Resend available in{' '}
                  <span className="text-emerald-600 font-bold">{cooldown}s</span>
                </p>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="flex items-center justify-center gap-1 text-emerald-600 hover:text-emerald-700 font-bold text-sm mx-auto transition-colors cursor-pointer disabled:opacity-50"
                >
                  <FiRefreshCw className={`w-4 h-4 ${resendLoading ? 'animate-spin' : ''}`} />
                  <span>{resendLoading ? 'Sending...' : 'Resend Code'}</span>
                </button>
              )}
            </div>

            <div className="mt-4">
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
