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
      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto bg-slate-50/50 text-[#111827] flex flex-col justify-start relative text-left">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-pulse">
          <div className="space-y-2">
            <div className="h-7 w-48 bg-slate-200 rounded-lg"></div>
            <div className="h-4 w-80 bg-slate-100 rounded-md"></div>
          </div>
          <div className="h-9 w-28 bg-slate-200 rounded-lg"></div>
        </div>

        {/* Metrics Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-slate-200/50 rounded-xl p-6 h-28 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="space-y-2 w-2/3">
                  <div className="h-3 w-16 bg-slate-100 rounded"></div>
                  <div className="h-7 w-24 bg-slate-200 rounded-md"></div>
                </div>
                <div className="h-10 w-10 bg-slate-100 rounded-lg"></div>
              </div>
              <div className="h-3 w-32 bg-slate-100 rounded"></div>
            </div>
          ))}
        </div>

        {/* Charts Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
          {/* Weekly Trend Skeleton */}
          <div className="lg:col-span-2 bg-white border border-slate-200/50 rounded-xl p-6 h-80 shadow-sm flex flex-col justify-between">
            <div className="space-y-2">
              <div className="h-4 w-40 bg-slate-200 rounded"></div>
              <div className="h-3 w-72 bg-slate-100 rounded"></div>
            </div>
            <div className="h-44 flex items-end justify-between px-2 gap-4 mt-6">
              {[...Array(7)].map((_, idx) => (
                <div key={idx} className="flex-1 flex items-end justify-center gap-1.5 h-full">
                  <div className="w-3 bg-slate-100 rounded-t-sm h-2/3"></div>
                  <div className="w-3 bg-slate-200 rounded-t-sm h-1/2"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Debt Distribution Skeleton */}
          <div className="bg-white border border-slate-200/50 rounded-xl p-6 h-80 shadow-sm flex flex-col justify-between">
            <div className="space-y-2">
              <div className="h-4 w-36 bg-slate-200 rounded"></div>
              <div className="h-3 w-56 bg-slate-100 rounded"></div>
            </div>
            <div className="space-y-4 mt-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between">
                    <div className="h-3.5 w-16 bg-slate-100 rounded"></div>
                    <div className="h-3.5 w-10 bg-slate-200 rounded"></div>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="bg-white border border-slate-200/50 rounded-xl overflow-hidden shadow-sm animate-pulse">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div className="h-5 w-32 bg-slate-200 rounded"></div>
            <div className="h-5 w-24 bg-slate-100 rounded"></div>
          </div>
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                <div className="space-y-2">
                  <div className="h-4 w-28 bg-slate-200 rounded"></div>
                  <div className="h-3 w-16 bg-slate-100 rounded"></div>
                </div>
                <div className="h-4 w-20 bg-slate-100 rounded"></div>
                <div className="h-4 w-16 bg-slate-100 rounded"></div>
                <div className="h-4 w-24 bg-slate-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
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
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto bg-[#F8FAFC] text-[#111827] flex flex-col justify-start relative text-left">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/50 pb-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Analytics Dashboard</h2>
          <p className="text-slate-500 text-sm">Store overview, weekly credit patterns, and ledger account audits.</p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="inline-flex items-center justify-center space-x-1.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 transition-all duration-200 cursor-pointer shadow-sm active:scale-95 self-start sm:self-auto"
        >
          <FiRefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Stats</span>
        </button>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Earnings Card */}
        <div className="bg-white border border-slate-200/50 rounded-xl p-6 flex flex-col justify-between relative overflow-hidden shadow-sm hover:border-slate-350 hover:shadow-md hover:-translate-y-0.5 transition-all duration-250 group">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Today's Earnings</span>
              <p className="text-3xl font-semibold font-mono tracking-tight text-slate-900">
                ₹{metrics.today_earnings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-emerald-50/50 text-[#10B981] p-2.5 rounded-lg border border-emerald-100/50 shadow-sm transition-colors group-hover:bg-emerald-50">
              <FiDollarSign className="w-4.5 h-4.5" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-4 font-normal">Cash & UPI collections logged today</p>
        </div>

        {/* Credit Outstanding Card */}
        <div className="bg-white border border-slate-200/50 rounded-xl p-6 flex flex-col justify-between relative overflow-hidden shadow-sm hover:border-slate-350 hover:shadow-md hover:-translate-y-0.5 transition-all duration-250 group">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Outstanding Credit</span>
              <p className="text-3xl font-semibold font-mono tracking-tight text-rose-600">
                ₹{metrics.total_outstanding_credit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-rose-50/50 text-rose-600 p-2.5 rounded-lg border border-rose-100/50 shadow-sm transition-colors group-hover:bg-rose-50">
              <FiTrendingUp className="w-4.5 h-4.5" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-4 font-normal">Sum of active customer ledger debt</p>
        </div>

        {/* Customers count Card */}
        <div className="bg-white border border-slate-200/50 rounded-xl p-6 flex flex-col justify-between relative overflow-hidden shadow-sm hover:border-slate-350 hover:shadow-md hover:-translate-y-0.5 transition-all duration-250 group">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Customers</span>
              <p className="text-3xl font-semibold font-mono tracking-tight text-slate-900">
                {metrics.total_customers.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="bg-blue-50/50 text-blue-600 p-2.5 rounded-lg border border-blue-100/50 shadow-sm transition-colors group-hover:bg-blue-50">
              <FiUsers className="w-4.5 h-4.5" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-4 font-normal">Registered buyer profiles in Khata</p>
        </div>

        {/* Products count Card */}
        <div className="bg-white border border-slate-200/50 rounded-xl p-6 flex flex-col justify-between relative overflow-hidden shadow-sm hover:border-slate-350 hover:shadow-md hover:-translate-y-0.5 transition-all duration-250 group">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Inventory</span>
              <p className="text-3xl font-semibold font-mono tracking-tight text-slate-900">
                {metrics.total_products.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="bg-amber-50/50 text-amber-600 p-2.5 rounded-lg border border-amber-100/50 shadow-sm transition-colors group-hover:bg-amber-50">
              <FiBox className="w-4.5 h-4.5" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-4 font-normal">Active items listed in catalog</p>
        </div>

      </div>

      {/* Expiry Alert Banner */}
      {expiryData && ((expiryData.summary?.products?.expired ?? 0) + (expiryData.summary?.products?.expiring_soon ?? 0) + (expiryData.summary?.batches?.expired ?? 0) + (expiryData.summary?.batches?.expiring_soon ?? 0)) > 0 && (
        <button
          onClick={() => navigate('/admin/expiry')}
          className="w-full bg-amber-50/30 border border-amber-200/60 rounded-xl p-4 flex items-center justify-between hover:bg-amber-50/50 transition-all duration-200 cursor-pointer text-left group shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100/80 rounded-lg text-amber-700">
              <FiAlertTriangle className="w-4.5 h-4.5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-amber-900 text-xs sm:text-sm">Product Expiry Warning</p>
              <p className="text-amber-700 text-xs mt-0.5">
                {expiryData.summary?.products?.expired > 0 && (
                  <span className="font-semibold text-rose-600">{expiryData.summary.products.expired} expired product(s)</span>
                )}
                {expiryData.summary?.products?.expired > 0 && expiryData.summary?.products?.expiring_soon > 0 && ' · '}
                {expiryData.summary?.products?.expiring_soon > 0 && (
                  <span className="font-semibold text-amber-700">{expiryData.summary.products.expiring_soon} expiring soon</span>
                )}
                {(expiryData.summary?.batches?.expired ?? 0) + (expiryData.summary?.batches?.expiring_soon ?? 0) > 0 && (
                  <span className="text-amber-600"> · {(expiryData.summary.batches.expired ?? 0) + (expiryData.summary.batches.expiring_soon ?? 0)} batch issue(s)</span>
                )}
              </p>
            </div>
          </div>
          <span className="text-amber-700 text-xs font-semibold group-hover:underline flex items-center gap-1">
            <FiClock className="w-3.5 h-3.5" />
            View Expiry Manager →
          </span>
        </button>
      )}

      {/* Graphical Dashboard Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Weekly Cash vs Credit trend bars */}
        <div className="lg:col-span-2 bg-white border border-slate-200/50 rounded-xl p-6 flex flex-col justify-between shadow-sm hover:border-slate-300 transition-all duration-300">
          <div>
            <h3 className="font-semibold text-slate-900 text-base">Weekly Cash Payments vs Credits Issued</h3>
            <p className="text-slate-500 text-xs mt-0.5">Repayments (green) compared against credits generated by checkout (orange) past 7 days.</p>
          </div>
          
          <div className="h-56 mt-6 relative flex items-end justify-between px-2 gap-4">
            {/* Horizontal Gridlines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8">
              <div className="w-full border-b border-slate-100/80 border-dashed"></div>
              <div className="w-full border-b border-slate-100/80 border-dashed"></div>
              <div className="w-full border-b border-slate-100/80 border-dashed"></div>
              <div className="w-full border-b border-slate-100/80 border-dashed"></div>
            </div>

            {/* Columns */}
            {charts.revenue_trends.map((rev, idx) => {
              const cred = charts.credit_trends[idx] || { amount: 0 };
              const revPercent = Math.max((rev.amount / maxRevenue) * 100, 3);
              const credPercent = Math.max((cred.amount / maxCredit) * 100, 3);
              
              return (
                <div key={rev.day} className="flex-1 flex flex-col items-center group h-full justify-end z-10">
                  <div className="flex items-end space-x-1.5 w-full justify-center h-[80%] relative">
                    {/* Revenue Bar */}
                    <div 
                      style={{ height: `${revPercent}%` }} 
                      className="w-2.5 sm:w-3.5 bg-[#10B981] hover:bg-[#059669] rounded-t-md transition-all duration-200 relative cursor-pointer group/bar shadow-sm"
                    >
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1.5 bg-slate-900 text-white text-[9.5px] px-2 py-1 rounded-md opacity-0 group-hover/bar:opacity-100 transition-opacity font-medium font-mono whitespace-nowrap z-30 shadow-lg pointer-events-none">
                        Repaid: ₹{rev.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    {/* Credit Bar */}
                    <div 
                      style={{ height: `${credPercent}%` }} 
                      className="w-2.5 sm:w-3.5 bg-[#F97316] hover:bg-[#EA580C] rounded-t-md transition-all duration-200 relative cursor-pointer group/bar shadow-sm"
                    >
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1.5 bg-slate-900 text-white text-[9.5px] px-2 py-1 rounded-md opacity-0 group-hover/bar:opacity-100 transition-opacity font-medium font-mono whitespace-nowrap z-30 shadow-lg pointer-events-none">
                        Credit: ₹{cred.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-3">{rev.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Debt Range Overview Chart */}
        <div className="bg-white border border-slate-200/50 rounded-xl p-6 flex flex-col justify-between shadow-sm hover:border-slate-300 transition-all duration-300">
          <div>
            <h3 className="font-semibold text-slate-900 text-base">Outstanding Debt distribution</h3>
            <p className="text-slate-500 text-xs mt-0.5">Analyzing customer volume grouped by current ledger debt balances.</p>
          </div>

          <div className="space-y-4 mt-6">
            {charts.balance_overview.map((range) => {
              const widthPercent = (range.count / maxBalanceCount) * 100;
              return (
                <div key={range.range} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">{range.range}</span>
                    <span className="text-slate-900 font-semibold font-mono">{range.count} {range.count === 1 ? 'client' : 'clients'}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      style={{ width: `${widthPercent || 0}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${
                        range.range === 'No Debt' 
                          ? 'bg-[#10B981]' 
                          : range.range === '1 - 1K' 
                          ? 'bg-amber-400' 
                          : range.range === '1K - 5K' 
                          ? 'bg-[#F97316]' 
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
      <div className="bg-white border border-slate-200/50 rounded-xl overflow-hidden shadow-sm hover:border-slate-300 transition-all duration-300">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 text-base">Recent Ledger Audits</h3>
          <div className="inline-flex items-center space-x-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200/60 px-3 py-1 rounded-lg font-medium">
            <FiClock className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Store Ledger Logs</span>
          </div>
        </div>

        {recent_transactions && recent_transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-150 text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-50/50">
                  <th className="py-3.5 px-6">Customer Profile</th>
                  <th className="py-3.5 px-6">Date</th>
                  <th className="py-3.5 px-6">Transaction Detail</th>
                  <th className="py-3.5 px-6">Type</th>
                  <th className="py-3.5 px-6 text-right">Amount</th>
                  <th className="py-3.5 px-6 text-right">Updated Balance liability</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAudits.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors text-sm">
                    <td className="py-3.5 px-6">
                      <div>
                        <p className="font-semibold text-slate-900 capitalize">{tx.customer_name}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{tx.customer_phone || 'No phone verified'}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 text-slate-500 font-mono text-xs">
                      <span className="flex items-center space-x-1.5">
                        <FiCalendar className="text-slate-400 w-3.5 h-3.5" />
                        <span>{new Date(tx.created_at).toLocaleDateString()}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-slate-700 font-medium text-xs">{tx.description || 'N/A'}</td>
                    <td className="py-3.5 px-6">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-semibold border ${
                        tx.transaction_type === 'CREDIT' 
                          ? 'bg-rose-50/40 text-rose-600 border-rose-100/50' 
                          : 'bg-emerald-50/40 text-[#10B981] border-emerald-100/50'
                      }`}>
                        {tx.transaction_type}
                      </span>
                    </td>
                    <td className={`py-3.5 px-6 font-semibold font-mono text-right text-xs ${
                      tx.transaction_type === 'CREDIT' ? 'text-rose-600' : 'text-[#10B981]'
                    }`}>
                      {tx.transaction_type === 'CREDIT' ? '+' : '-'}₹{tx.amount.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-6 font-semibold font-mono text-slate-900 text-right text-xs">
                      ₹{tx.remaining_balance_at_snapshot.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalAuditPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/20">
                <button
                  onClick={() => setAuditCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={auditCurrentPage === 1}
                  className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:hover:bg-white disabled:hover:border-slate-200 rounded-lg cursor-pointer transition-all duration-150 shadow-sm"
                >
                  <span>&larr; Previous</span>
                </button>
                <span className="text-xs text-slate-500 font-medium">
                  Page <span className="font-semibold text-slate-900">{auditCurrentPage}</span> of <span className="font-semibold text-slate-900">{totalAuditPages}</span>
                </span>
                <button
                  onClick={() => setAuditCurrentPage(prev => Math.min(prev + 1, totalAuditPages))}
                  disabled={auditCurrentPage === totalAuditPages}
                  className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:hover:bg-white disabled:hover:border-slate-200 rounded-lg cursor-pointer transition-all duration-150 shadow-sm"
                >
                  <span>Next &rarr;</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="py-16 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-slate-400">
              <FiClock className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h4 className="text-sm font-semibold text-slate-800">No recent ledger logs</h4>
              <p className="text-xs text-slate-500">There are no customer debit or credit transactions recorded in the store ledger book yet.</p>
            </div>
            <button 
              onClick={() => navigate('/admin/customers')}
              className="inline-flex items-center space-x-1 text-xs font-semibold text-[#10B981] hover:underline cursor-pointer"
            >
              <span>Go to Customer Ledger</span>
              <span>&rarr;</span>
            </button>
          </div>
        )}
      </div>

    </div>
  );
};

export default AdminDashboard;
