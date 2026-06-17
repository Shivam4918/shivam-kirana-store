import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { FiCheckCircle, FiXCircle, FiShoppingBag, FiArrowRight } from 'react-icons/fi';

const VerifyEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const uid = searchParams.get('uid');
    const token = searchParams.get('token');

    if (!uid || !token) {
      setStatus('error');
      setMessage('Invalid verification link. Missing verification token or user identifier.');
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await api.post('/auth/verify-email/', { uid, token });
        setStatus('success');
        setMessage(res.data.detail || 'Email verified successfully! You can now log in.');
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.detail || 'Verification link is invalid or has expired.');
      }
    };

    verifyToken();
  }, [location]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-secondary flex flex-col items-center justify-center p-4 relative overflow-y-auto text-left">
      {/* Background patterns */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-orange-500/5 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-white border border-slate-200/60 rounded-3xl p-8 shadow-premium-lg relative z-10 text-center">
        {/* Brand header */}
        <div className="mb-6">
          <div className="bg-primary p-3 rounded-2xl text-white shadow-md shadow-emerald-500/20 inline-block mb-3">
            <FiShoppingBag className="w-6 h-6" />
          </div>
          <h2 className="font-poppins font-extrabold text-2xl text-secondary">Shivam Kirana Store</h2>
          <p className="text-text-secondary text-xs mt-1">Smart Groceries & Ledger Khata Management</p>
        </div>

        <div className="py-6 flex flex-col items-center justify-center">
          {status === 'verifying' && (
            <>
              <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
              <h3 className="font-bold text-lg text-slate-700 mb-2">Verifying your email...</h3>
              <p className="text-slate-500 text-sm">Please hold on while we secure your account.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="bg-emerald-50 text-emerald-500 p-4 rounded-full mb-4 animate-bounce">
                <FiCheckCircle className="w-12 h-12" />
              </div>
              <h3 className="font-bold text-xl text-slate-800 mb-2">Verification Successful!</h3>
              <p className="text-slate-500 text-sm px-4 mb-6">{message}</p>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-md shadow-emerald-500/10 active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>Sign In</span>
                <FiArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="bg-rose-50 text-rose-500 p-4 rounded-full mb-4">
                <FiXCircle className="w-12 h-12" />
              </div>
              <h3 className="font-bold text-xl text-slate-800 mb-2">Verification Failed</h3>
              <p className="text-slate-500 text-sm px-4 mb-6">{message}</p>
              <div className="w-full flex flex-col space-y-2">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl transition-all cursor-pointer text-sm"
                >
                  Back to Sign In
                </button>
                <Link
                  to="/"
                  className="text-primary hover:underline font-semibold text-sm"
                >
                  Back to Home
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
