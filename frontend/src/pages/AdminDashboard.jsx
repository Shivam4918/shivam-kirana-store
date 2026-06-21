import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  FiTrendingUp, FiDollarSign, FiUsers, FiBox, 
  FiCalendar, FiClock, FiRefreshCw, FiAlertTriangle
} from 'react-icons/fi';

const AdminDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expiryData, setExpiryData] = useState(null);
  const [auditCurrentPage, setAuditCurrentPage] = useState(1);
  const auditPageSize = 5;
  const navigate = useNavigate();

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/analytics/');
      setAnalytics(res.data);
      setAuditCurrentPage(1);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchExpiryData = async () => {
    try {
      const res = await api.get('/admin/expiry-dashboard/');
      setExpiryData(res.data);
    } catch (err) {
      console.error('Error fetching expiry data:', err);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    fetchExpiryData();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 p-6 space-y-6 overflow-y-auto animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-slate-100 rounded-3xl p-6 h-28 shadow-sm"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl h-80 shadow-sm"></div>
          <div className="bg-white border border-slate-100 rounded-3xl h-80 shadow-sm"></div>
        </div>
        <div className="bg-white border border-slate-100 rounded-3xl h-60 shadow-sm"></div>
      </div>
    );
  }

  const { metrics, recent_transactions, charts } = analytics || {
    metrics: { today_earnings: 0, total_outstanding_credit: 0, total_customers: 0, total_products: 0 },
    recent_transactions: [],
    charts: { revenue_trends: [], credit_trends: [], balance_overview: [] }
  };

  const totalAuditPages = Math.ceil((recent_transactions?.length || 0) / auditPageSize) || 1;
  const paginatedAudits = (recent_transactions || []).slice(
    (auditCurrentPage - 1) * auditPageSize,
    auditCurrentPage * auditPageSize
  );

  // Find max values for chart scaling
  const maxRevenue = Math.max(...charts.revenue_trends.map(t => t.amount), 1);
  const maxCredit = Math.max(...charts.credit_trends.map(t => t.amount), 1);
  const maxBalanceCount = Math.max(...charts.balance_overview.map(t => t.count), 1);

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto bg-slate-50/50 text-[#111827] flex flex-col justify-start relative text-left">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-poppins font-extrabold text-secondary">Analytics Dashboard</h2>
          <p className="text-[#6B7280] text-xs sm:text-sm">Store overview, weekly credit patterns, and ledger account audits.</p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="bg-white hover:bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold text-secondary transition-all cursor-pointer flex items-center space-x-1.5 shadow-sm active:scale-95"
        >
          <FiRefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Stats</span>
        </button>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Earnings Card */}
        <div className="bg-white border border-slate-200/60 rounded-3xl p-6 flex items-center justify-between relative overflow-hidden shadow-sm hover:shadow-premium transition-shadow">
          <div className="absolute top-[-20%] right-[-10%] w-20 h-20 rounded-full bg-emerald-500/5 blur-lg"></div>
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Today's Earnings</span>
            <p className="text-3xl font-poppins font-extrabold text-primary">₹{metrics.today_earnings.toFixed(2)}</p>
            <p className="text-[10px] text-text-secondary">Cash collections logged today</p>
          </div>
          <div className="bg-emerald-50 text-primary p-3.5 rounded-2xl border border-emerald-100 shadow-sm">
            <FiDollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Credit Outstanding Card */}
        <div className="bg-white border border-slate-200/60 rounded-3xl p-6 flex items-center justify-between relative overflow-hidden shadow-sm hover:shadow-premium transition-shadow">
          <div className="absolute top-[-20%] right-[-10%] w-20 h-20 rounded-full bg-rose-500/5 blur-lg"></div>
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Outstanding Credit</span>
            <p className="text-3xl font-poppins font-extrabold text-rose-600">₹{metrics.total_outstanding_credit.toFixed(2)}</p>
            <p className="text-[10px] text-text-secondary">Sum of customer ledger debt</p>
          </div>
          <div className="bg-rose-50 text-rose-500 p-3.5 rounded-2xl border border-rose-100 shadow-sm">
            <FiTrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Customers count Card */}
        <div className="bg-white border border-slate-200/60 rounded-3xl p-6 flex items-center justify-between relative overflow-hidden shadow-sm hover:shadow-premium transition-shadow">
          <div className="absolute top-[-20%] right-[-10%] w-20 h-20 rounded-full bg-blue-500/5 blur-lg"></div>
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Total Customers</span>
            <p className="text-3xl font-poppins font-extrabold text-[#0F172A]">{metrics.total_customers}</p>
            <p className="text-[10px] text-text-secondary">Registered buyer profiles</p>
          </div>
          <div className="bg-blue-50 text-blue-500 p-3.5 rounded-2xl border border-blue-100 shadow-sm">
            <FiUsers className="w-5 h-5" />
          </div>
        </div>

        {/* Products count Card */}
        <div className="bg-white border border-slate-200/60 rounded-3xl p-6 flex items-center justify-between relative overflow-hidden shadow-sm hover:shadow-premium transition-shadow">
          <div className="absolute top-[-20%] right-[-10%] w-20 h-20 rounded-full bg-amber-500/5 blur-lg"></div>
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Active Inventory</span>
            <p className="text-3xl font-poppins font-extrabold text-[#0F172A]">{metrics.total_products}</p>
            <p className="text-[10px] text-text-secondary">Items listed in active catalog</p>
          </div>
          <div className="bg-amber-55 text-amber-600 p-3.5 rounded-2xl border border-amber-250 shadow-sm">
            <FiBox className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Expiry Alert Banner */}
      {expiryData && ((expiryData.summary?.products?.expired ?? 0) + (expiryData.summary?.products?.expiring_soon ?? 0) + (expiryData.summary?.batches?.expired ?? 0) + (expiryData.summary?.batches?.expiring_soon ?? 0)) > 0 && (
        <button
          onClick={() => navigate('/admin/expiry')}
          className="w-full bg-gradient-to-r from-amber-50 to-rose-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between hover:shadow-md transition-all cursor-pointer text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-xl">
              <FiAlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-bold text-amber-800 text-sm">Product Expiry Alert</p>
              <p className="text-amber-600 text-xs mt-0.5">
                {expiryData.summary?.products?.expired > 0 && (
                  <span className="font-bold text-rose-600">{expiryData.summary.products.expired} expired product(s)</span>
                )}
                {expiryData.summary?.products?.expired > 0 && expiryData.summary?.products?.expiring_soon > 0 && ' · '}
                {expiryData.summary?.products?.expiring_soon > 0 && (
                  <span className="font-bold text-amber-700">{expiryData.summary.products.expiring_soon} expiring soon</span>
                )}
                {(expiryData.summary?.batches?.expired ?? 0) + (expiryData.summary?.batches?.expiring_soon ?? 0) > 0 && (
                  <span className="text-amber-600"> · {(expiryData.summary.batches.expired ?? 0) + (expiryData.summary.batches.expiring_soon ?? 0)} batch issue(s)</span>
                )}
              </p>
            </div>
          </div>
          <span className="text-amber-600 text-xs font-bold group-hover:underline flex items-center gap-1">
            <FiClock className="w-3.5 h-3.5" />
            View Expiry Manager →
          </span>
        </button>
      )}

      {/* Graphical Dashboard Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Weekly Cash vs Credit trend bars */}
        <div className="lg:col-span-2 bg-white border border-slate-200/60 rounded-3xl p-6 flex flex-col justify-between shadow-sm">
          <div>
            <h3 className="font-bold text-secondary text-sm sm:text-base">Weekly Cash Payments vs Credits Issued</h3>
            <p className="text-text-secondary text-xs mt-1">Repayments (green) compared against credits generated by checkout (orange) past 7 days.</p>
          </div>
          
          <div className="h-52 mt-6 flex items-end justify-between px-2 gap-4">
            {charts.revenue_trends.map((rev, idx) => {
              const cred = charts.credit_trends[idx] || { amount: 0 };
              const revPercent = Math.max((rev.amount / maxRevenue) * 100, 3);
              const credPercent = Math.max((cred.amount / maxCredit) * 100, 3);
              
              return (
                <div key={rev.day} className="flex-1 flex flex-col items-center group h-full justify-end">
                  <div className="flex items-end space-x-1.5 w-full justify-center h-4/5">
                    {/* Revenue Bar */}
                    <div 
                      style={{ height: `${revPercent}%` }} 
                      className="w-3 sm:w-4 bg-primary hover:bg-primary-hover rounded-t-full transition-all relative cursor-pointer"
                      title={`Repaid: ₹${rev.amount}`}
                    >
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 bg-secondary text-white text-[9.5px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity font-bold whitespace-nowrap z-25 shadow border border-slate-700/10">
                        Repaid: ₹{rev.amount}
                      </div>
                    </div>
                    {/* Credit Bar */}
                    <div 
                      style={{ height: `${credPercent}%` }} 
                      className="w-3 sm:w-4 bg-accent hover:bg-orange-600 rounded-t-full transition-all relative cursor-pointer"
                      title={`Credit: ₹${cred.amount}`}
                    >
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 bg-secondary text-white text-[9.5px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity font-bold whitespace-nowrap z-25 shadow border border-slate-700/10">
                        Credit: ₹{cred.amount}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#6B7280] font-bold tracking-wider uppercase mt-3">{rev.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Debt Range Overview Chart */}
        <div className="bg-white border border-slate-200/60 rounded-3xl p-6 flex flex-col justify-between shadow-sm">
          <div>
            <h3 className="font-bold text-secondary text-sm sm:text-base">Outstanding Debt distribution</h3>
            <p className="text-text-secondary text-xs mt-1">Analyzing customer volume grouped by current ledger debt balances.</p>
          </div>

          <div className="space-y-4 mt-6">
            {charts.balance_overview.map((range) => {
              const widthPercent = (range.count / maxBalanceCount) * 100;
              return (
                <div key={range.range} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary font-medium">{range.range}</span>
                    <span className="text-secondary font-bold">{range.count} {range.count === 1 ? 'client' : 'clients'}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/30">
                    <div 
                      style={{ width: `${widthPercent || 0}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${
                        range.range === 'No Debt' 
                          ? 'bg-primary' 
                          : range.range === '1 - 1K' 
                          ? 'bg-amber-400' 
                          : range.range === '1K - 5K' 
                          ? 'bg-accent' 
                          : 'bg-rose-500'
                      }`}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Recent Activity Audits */}
      <div className="bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-bold text-secondary text-sm sm:text-base">Recent Ledger Audits</h3>
          <div className="inline-flex items-center space-x-1.5 text-xs text-text-secondary bg-slate-100 px-3 py-1 rounded-xl border border-slate-200/50 font-bold">
            <FiClock className="w-3.5 h-3.5 text-primary" />
            <span>Store Ledger Logs</span>
          </div>
        </div>

        {recent_transactions && recent_transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-150 text-[10px] uppercase font-bold tracking-wider text-[#6B7280] bg-slate-50/70">
                  <th className="py-4 px-6">Customer Profile</th>
                  <th className="py-4 px-6">Date</th>
                  <th className="py-4 px-6">Transaction Detail</th>
                  <th className="py-4 px-6">Type</th>
                  <th className="py-4 px-6 text-right">Amount</th>
                  <th className="py-4 px-6 text-right">Updated Balance liability</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAudits.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors text-xs sm:text-sm">
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-bold text-secondary capitalize">{tx.customer_name}</p>
                        <p className="text-[10px] text-text-secondary mt-0.5">{tx.customer_phone || 'No phone verified'}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-medium text-text-secondary">
                      <span className="flex items-center space-x-2">
                        <FiCalendar className="text-slate-400 w-4 h-4" />
                        <span>{new Date(tx.created_at).toLocaleDateString()}</span>
                      </span>
                    </td>
                    <td className="py-4 px-6 text-secondary font-semibold">{tx.description || 'N/A'}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[9.5px] font-extrabold uppercase tracking-wider ${
                        tx.transaction_type === 'CREDIT' 
                          ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                          : 'bg-emerald-50 text-primary border border-emerald-100'
                      }`}>
                        {tx.transaction_type}
                      </span>
                    </td>
                    <td className={`py-4 px-6 font-extrabold text-right text-sm ${
                      tx.transaction_type === 'CREDIT' ? 'text-rose-600' : 'text-primary'
                    }`}>
                      {tx.transaction_type === 'CREDIT' ? '+' : '-'}₹{tx.amount.toFixed(2)}
                    </td>
                    <td className="py-4 px-6 font-extrabold text-secondary text-right text-sm">
                      ₹{tx.remaining_balance_at_snapshot.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalAuditPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/30">
                <button
                  onClick={() => setAuditCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={auditCurrentPage === 1}
                  className="px-3.5 py-2 text-xs font-bold text-secondary border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent rounded-xl cursor-pointer transition-all flex items-center space-x-1"
                >
                  <span>&larr; Previous</span>
                </button>
                <span className="text-xs font-medium text-text-secondary">
                  Page <span className="font-bold text-secondary">{auditCurrentPage}</span> of <span className="font-bold text-secondary">{totalAuditPages}</span>
                </span>
                <button
                  onClick={() => setAuditCurrentPage(prev => Math.min(prev + 1, totalAuditPages))}
                  disabled={auditCurrentPage === totalAuditPages}
                  className="px-3.5 py-2 text-xs font-bold text-secondary border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent rounded-xl cursor-pointer transition-all flex items-center space-x-1"
                >
                  <span>Next &rarr;</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="py-16 flex flex-col items-center justify-center space-y-3.5 text-center">
            <div className="bg-slate-50 p-4 rounded-full text-slate-350">
              <FiClock className="w-7 h-7" />
            </div>
            <p className="text-xs sm:text-sm text-text-secondary">No transactions recorded across the store yet.</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default AdminDashboard;
