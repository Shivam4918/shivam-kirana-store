import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { FiCheckCircle, FiXCircle, FiCreditCard, FiArrowLeft, FiLoader, FiShield, FiLock, FiAlertCircle } from 'react-icons/fi';

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
    <div className="min-h-screen bg-gradient-to-b from-[#0F172A] to-[#1E293B] text-white flex flex-col justify-center items-center p-4 antialiased relative overflow-hidden">
      {/* Decorative ambient glowing dots */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-blue-500/10 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-emerald-500/5 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.4)] backdrop-blur-md relative z-10 space-y-6 text-center">
        
        {/* Header */}
        <div className="space-y-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 mb-3 shadow-inner">
            <FiCreditCard className="w-6 h-6" />
          </div>
          <div className="flex items-center justify-center space-x-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20 flex items-center gap-1 shadow-xs">
              <FiShield className="w-3 h-3 text-blue-400" />
              <span>Razorpay Sandbox</span>
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight mt-2 text-slate-100">Simulate Payment Link</h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">Verify payment flows securely without live credit card or netbanking transactions.</p>
        </div>

        {/* Invoice Summary Card */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-3.5 font-mono text-xs text-left shadow-inner">
          <div className="flex justify-between items-center text-slate-450">
            <span className="font-sans font-medium text-slate-400">Payee Merchant</span>
            <span className="text-white font-bold font-sans">Shivam Kirana Store</span>
          </div>
          <div className="flex justify-between items-center text-slate-455 border-t border-slate-900 pt-3">
            <span className="font-sans font-medium text-slate-400">Settlement Ref</span>
            <span className="text-white font-bold select-all bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800/40 text-[10px]">{linkId || 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center text-slate-455 border-t border-slate-900 pt-3">
            <span className="font-sans font-medium text-slate-400">Convenience Charges</span>
            <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded text-[10px] border border-emerald-500/20 font-sans tracking-wide">FREE</span>
          </div>
          <div className="flex justify-between items-center text-slate-455 border-t border-slate-900 pt-3.5">
            <span className="font-sans font-semibold text-slate-300">Amount to Settle</span>
            <span className="text-2xl font-black text-emerald-400 font-sans tracking-tight">₹{parseFloat(amount).toFixed(2)}</span>
          </div>
        </div>

        {status === 'PENDING' && (
          <div className="space-y-4 pt-2">
            {error && (
              <div className="bg-rose-500/10 text-rose-455 text-xs py-2.5 px-3.5 rounded-xl border border-rose-500/20 text-left font-medium flex items-start gap-2">
                <FiAlertCircle className="w-4 h-4 text-rose-455 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            
            <button
              onClick={() => handleSettle(true)}
              disabled={loading || !linkId}
              className="w-full bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 text-white font-bold py-3.5 px-5 rounded-2xl flex items-center justify-center space-x-2 shadow-lg hover:shadow-emerald-500/10 transition-all duration-200 active:scale-[0.98] cursor-pointer text-sm"
            >
              {loading ? (
                <FiLoader className="w-4 h-4 animate-spin text-white" />
              ) : (
                <>
                  <FiCheckCircle className="w-4 h-4 text-white" />
                  <span>Simulate Payment Success</span>
                </>
              )}
            </button>

            <button
              onClick={() => handleSettle(false)}
              disabled={loading || !linkId}
              className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-bold py-3 px-5 rounded-2xl flex items-center justify-center space-x-2 shadow-xs transition-all duration-200 active:scale-[0.98] cursor-pointer text-xs"
            >
              <FiXCircle className="w-4 h-4 text-slate-400" />
              <span>Simulate Payment Declined</span>
            </button>
          </div>
        )}

        {status === 'PAID' && (
          <div className="space-y-4 py-4 animate-fade-in">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-xs">
              <FiCheckCircle className="w-9 h-9 animate-bounce" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Settlement Successful</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">The simulated transaction has completed. The active desktop dashboard will update instantly.</p>
            </div>
            <div className="pt-4 border-t border-slate-800/80">
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider block">Sandbox Mode Notice</span>
              <p className="text-[9.5px] text-slate-550 mt-1">You may now safely close this browser window or return to the shop dashboard.</p>
            </div>
          </div>
        )}

        {status === 'FAILED' && (
          <div className="space-y-4 py-4 animate-fade-in">
            <div className="mx-auto w-16 h-16 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20 shadow-xs">
              <FiXCircle className="w-9 h-9" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Payment Failed</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">The simulated transaction has been rejected or cancelled by the user.</p>
            </div>
            <button
              onClick={() => setStatus('PENDING')}
              className="bg-slate-800 hover:bg-slate-700 text-xs text-blue-400 hover:text-blue-300 font-bold px-4 py-2 rounded-xl transition-all border border-slate-700/40 cursor-pointer shadow-xs active:scale-95"
            >
              Try Simulation Again
            </button>
          </div>
        )}

        {/* Security & Certifications Badges */}
        <div className="border-t border-slate-800/80 pt-5 flex items-center justify-center gap-4 text-[9.5px] text-slate-505 font-medium select-none">
          <span className="flex items-center gap-1.5">
            <FiShield className="w-3.5 h-3.5 text-emerald-500/80" />
            <span>PCI-DSS Certified</span>
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
          <span className="flex items-center gap-1.5">
            <FiLock className="w-3.5 h-3.5 text-blue-500/80" />
            <span>256-Bit SSL Secure</span>
          </span>
        </div>

      </div>

      <a
        href="/"
        className="mt-8 flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-400 font-bold transition-colors relative z-10"
      >
        <FiArrowLeft className="w-3.5 h-3.5" />
        <span>Return to Main Website</span>
      </a>
    </div>
  );
};

export default MockPaymentPage;
