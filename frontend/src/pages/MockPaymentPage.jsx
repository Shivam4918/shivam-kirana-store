import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { FiCheckCircle, FiXCircle, FiCreditCard, FiArrowLeft, FiLoader } from 'react-icons/fi';

const MockPaymentPage = () => {
  const [searchParams] = useSearchParams();
  const linkId = searchParams.get('link_id');
  const amount = searchParams.get('amount') || '0.00';

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('PENDING'); // PENDING, PAID, FAILED
  const [error, setError] = useState(null);

  const handleSettle = async (simulatePaid = true) => {
    if (!linkId) return;
    setLoading(true);
    setError(null);
    try {
      if (simulatePaid) {
        await api.post(`/payments/mock-settle/${linkId}/`);
        setStatus('PAID');
      } else {
        setStatus('FAILED');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to simulate payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center items-center p-4 antialiased">
      <div className="w-full max-w-md bg-slate-800 border border-slate-700/60 rounded-2xl p-6 shadow-2xl space-y-6 text-center">
        
        {/* Header */}
        <div className="space-y-1">
          <div className="mx-auto w-10 h-10 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 mb-3">
            <FiCreditCard className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold tracking-tight">Razorpay Secure Sandbox</h2>
          <p className="text-xs text-slate-400">Simulating payment settlement link for Shivam Kirana Store</p>
        </div>

        {/* Details Card */}
        <div className="bg-slate-900/60 border border-slate-700/30 rounded-xl p-4 space-y-3 font-mono text-xs text-left">
          <div className="flex justify-between items-center text-slate-400">
            <span>Payment Link ID</span>
            <span className="text-white font-bold select-all">{linkId || 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400 border-t border-slate-800 pt-3">
            <span>Payee</span>
            <span className="text-white font-bold">Shivam Kirana Store</span>
          </div>
          <div className="flex justify-between items-center text-slate-400 border-t border-slate-800 pt-3">
            <span>Total Payable</span>
            <span className="text-2xl font-black text-emerald-400 font-sans font-medium">₹{parseFloat(amount).toFixed(2)}</span>
          </div>
        </div>

        {status === 'PENDING' && (
          <div className="space-y-3">
            {error && (
              <div className="bg-rose-500/10 text-rose-400 text-xs py-2 px-3 rounded-lg border border-rose-500/20 text-left font-medium">
                {error}
              </div>
            )}
            
            <button
              onClick={() => handleSettle(true)}
              disabled={loading || !linkId}
              className="w-full bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-lg active:scale-[0.98] transition-all cursor-pointer text-sm"
            >
              {loading ? (
                <FiLoader className="w-4 h-4 animate-spin" />
              ) : (
                <span>Simulate Successful Payment</span>
              )}
            </button>

            <button
              onClick={() => handleSettle(false)}
              disabled={loading || !linkId}
              className="w-full bg-slate-705 hover:bg-slate-600 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center shadow-sm active:scale-[0.98] transition-all cursor-pointer text-xs"
            >
              Simulate Failed/Declined Payment
            </button>
          </div>
        )}

        {status === 'PAID' && (
          <div className="space-y-4 animate-fade-in">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <FiCheckCircle className="w-8 h-8 animate-bounce" />
            </div>
            <div className="space-y-1">
              <h3 className="text-md font-bold text-white">Payment Completed Successfully</h3>
              <p className="text-xs text-slate-400 font-medium">The customer dashboard balance will refresh immediately.</p>
            </div>
            <p className="text-[10px] text-slate-500 pt-2 border-t border-slate-800">
              You can now safely close this browser window or return to the store app.
            </p>
          </div>
        )}

        {status === 'FAILED' && (
          <div className="space-y-4 animate-fade-in">
            <div className="mx-auto w-14 h-14 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
              <FiXCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-md font-bold text-white">Payment Declined</h3>
              <p className="text-xs text-slate-400 font-medium font-normal">The simulated transaction has been rejected or aborted.</p>
            </div>
            <button
              onClick={() => setStatus('PENDING')}
              className="mt-4 text-xs text-blue-400 hover:text-blue-300 font-bold underline cursor-pointer"
            >
              Try Simulation Again
            </button>
          </div>
        )}

      </div>

      <a
        href="/"
        className="mt-6 flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-400 font-bold transition-colors"
      >
        <FiArrowLeft className="w-3.5 h-3.5" />
        <span>Return to Main Website</span>
      </a>
    </div>
  );
};

export default MockPaymentPage;
