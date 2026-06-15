import { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  FiTrendingUp, FiDollarSign, FiBookOpen, FiActivity, FiRefreshCw, FiCheckCircle, FiLock, FiAlertTriangle 
} from 'react-icons/fi';

const FinancialReports = () => {
  const [activeTab, setActiveTab] = useState('pl'); // 'pl', 'balance', 'cashflow'
  
  // States
  const [plData, setPlData] = useState(null);
  const [bsData, setBsData] = useState(null);
  const [cfData, setCfData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [plPeriod, setPlPeriod] = useState('monthly'); // 'daily', 'weekly', 'monthly'

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'pl') {
        const res = await api.get(`/admin/analytics/pl/?period=${plPeriod}`);
        setPlData(res.data);
      } else if (activeTab === 'balance') {
        const res = await api.get('/admin/analytics/balance-sheet/');
        setBsData(res.data);
      } else if (activeTab === 'cashflow') {
        const res = await api.get('/admin/analytics/cash-flow/');
        setCfData(res.data);
      }
    } catch (err) {
      console.error('Error fetching financial reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, plPeriod]);

  if (loading) {
    return (
      <div className="flex-1 p-6 space-y-6 overflow-y-auto animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/4"></div>
        <div className="flex space-x-2 border-b border-slate-200 pb-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 bg-slate-200 rounded w-28"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-slate-100 rounded-3xl p-6 h-28 shadow-sm"></div>
          ))}
        </div>
        <div className="bg-white border border-slate-100 rounded-3xl h-96 shadow-sm"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto bg-slate-50/50 text-[#111827] flex flex-col justify-start relative text-left">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-poppins font-extrabold text-secondary">P&L & Financial Statements</h2>
          <p className="text-[#6B7280] text-xs sm:text-sm">Audit profit margins, evaluate company asset values, and map cash inflows/outflows.</p>
        </div>
        
        <button
          onClick={fetchData}
          className="bg-white hover:bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold text-secondary transition-all cursor-pointer flex items-center space-x-1.5 shadow-sm active:scale-95"
        >
          <FiRefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Tabs Switcher */}
      <div className="flex bg-white border border-slate-200/60 p-1.5 rounded-2xl w-max shadow-sm">
        <button
          onClick={() => setActiveTab('pl')}
          className={`px-5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            activeTab === 'pl'
              ? 'bg-primary text-white shadow-sm shadow-emerald-500/10'
              : 'text-[#6B7280] hover:text-secondary'
          }`}
        >
          Profit & Loss Book
        </button>
        <button
          onClick={() => setActiveTab('balance')}
          className={`px-5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            activeTab === 'balance'
              ? 'bg-primary text-white shadow-sm shadow-emerald-500/10'
              : 'text-[#6B7280] hover:text-secondary'
          }`}
        >
          Balance Sheet
        </button>
        <button
          onClick={() => setActiveTab('cashflow')}
          className={`px-5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            activeTab === 'cashflow'
              ? 'bg-primary text-white shadow-sm shadow-emerald-500/10'
              : 'text-[#6B7280] hover:text-secondary'
          }`}
        >
          Cash Flow Dashboard
        </button>
      </div>

      {/* RENDER ACTIVE TAB */}

      {/* TAB 1: PROFIT & LOSS */}
      {activeTab === 'pl' && plData && (
        <div className="space-y-6">
          {/* PL Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-6">
            
            {/* Sales Revenue */}
            <div className="bg-white border border-slate-200/60 rounded-3xl p-5 relative overflow-hidden shadow-sm hover:shadow-premium transition-shadow">
              <span className="text-[9.5px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1">Sales Revenue (A)</span>
              <p className="text-2xl font-poppins font-extrabold text-secondary">₹{plData.metrics.total_sales.toFixed(2)}</p>
              <p className="text-[10px] text-text-secondary mt-1">Store credit sales volume</p>
            </div>

            {/* Cost of Goods Sold (COGS) */}
            <div className="bg-white border border-slate-200/60 rounded-3xl p-5 relative overflow-hidden shadow-sm hover:shadow-premium transition-shadow">
              <span className="text-[9.5px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1">Cost of Goods (B)</span>
              <p className="text-2xl font-poppins font-extrabold text-secondary">₹{plData.metrics.cogs.toFixed(2)}</p>
              <p className="text-[10px] text-text-secondary mt-1">Wholesale cost of goods sold</p>
            </div>

            {/* Gross Profit */}
            <div className="bg-white border border-slate-200/60 rounded-3xl p-5 relative overflow-hidden shadow-sm hover:shadow-premium transition-shadow">
              <span className="text-[9.5px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1">Gross Profit (A-B)</span>
              <p className="text-2xl font-poppins font-extrabold text-primary">₹{plData.metrics.gross_profit.toFixed(2)}</p>
              <p className="text-[10px] text-text-secondary mt-1">Retail margin gains</p>
            </div>

            {/* Expenses */}
            <div className="bg-white border border-slate-200/60 rounded-3xl p-5 relative overflow-hidden shadow-sm hover:shadow-premium transition-shadow">
              <span className="text-[9.5px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1">Expenses (C)</span>
              <p className="text-2xl font-poppins font-extrabold text-rose-600">₹{plData.metrics.total_expenses.toFixed(2)}</p>
              <p className="text-[10px] text-text-secondary mt-1">Utilities, rent, staff overheads</p>
            </div>

            {/* Net Profit */}
            <div className={`border rounded-3xl p-5 relative overflow-hidden shadow-sm ${
              plData.metrics.net_profit >= 0 
                ? 'bg-emerald-50/10 border-emerald-250 hover:shadow-premium' 
                : 'bg-rose-50/10 border-rose-250 hover:shadow-premium'
            }`}>
              <span className="text-[9.5px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1">Net Profit</span>
              <p className={`text-2xl font-poppins font-extrabold ${plData.metrics.net_profit >= 0 ? 'text-primary' : 'text-rose-600'}`}>
                ₹{plData.metrics.net_profit.toFixed(2)}
              </p>
              <p className="text-[10px] text-text-secondary mt-1">Final take home earnings</p>
            </div>

          </div>

          {/* PL Trends Charts */}
          <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-bold text-secondary text-sm sm:text-base">Revenue & Net Profit Trends</h3>
                <p className="text-text-secondary text-xs mt-1">Bar chart comparing Sales volume (green), Expenses (rose), and final Net Profit (teal line/bars).</p>
              </div>

              {/* Period filters */}
              <div className="flex bg-slate-100 p-1 rounded-xl w-max">
                <button
                  onClick={() => setPlPeriod('daily')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                    plPeriod === 'daily' ? 'bg-white text-secondary shadow-sm' : 'text-[#6B7280] hover:text-secondary'
                  }`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setPlPeriod('weekly')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                    plPeriod === 'weekly' ? 'bg-white text-secondary shadow-sm' : 'text-[#6B7280] hover:text-secondary'
                  }`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setPlPeriod('monthly')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                    plPeriod === 'monthly' ? 'bg-white text-secondary shadow-sm' : 'text-[#6B7280] hover:text-secondary'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>

            {/* Custom Bar Graphs */}
            <div className="h-64 mt-6 flex items-end justify-between px-2 gap-4">
              {plData.trends.map((t) => {
                const maxVal = Math.max(...plData.trends.map(x => Math.max(x.sales, x.expenses, Math.abs(x.profit))), 1);
                const salesPercent = Math.max((t.sales / maxVal) * 100, 3);
                const expensePercent = Math.max((t.expenses / maxVal) * 100, 3);
                const profitPercent = Math.max((Math.abs(t.profit) / maxVal) * 100, 3);
                const isProfitNegative = t.profit < 0;

                return (
                  <div key={t.label} className="flex-1 flex flex-col items-center group h-full justify-end">
                    <div className="flex items-end space-x-1.5 w-full justify-center h-4/5">
                      {/* Sales Bar */}
                      <div 
                        style={{ height: `${salesPercent}%` }} 
                        className="w-2.5 sm:w-3 bg-primary hover:bg-primary-hover rounded-t-full transition-all relative cursor-pointer"
                        title={`Sales: ₹${t.sales}`}
                      >
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 bg-secondary text-white text-[9.5px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity font-bold whitespace-nowrap z-25 shadow">
                          Sales: ₹{t.sales.toFixed(1)}
                        </div>
                      </div>
                      {/* Expense Bar */}
                      <div 
                        style={{ height: `${expensePercent}%` }} 
                        className="w-2.5 sm:w-3 bg-rose-500 hover:bg-rose-600 rounded-t-full transition-all relative cursor-pointer"
                        title={`Expenses: ₹${t.expenses}`}
                      >
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 bg-secondary text-white text-[9.5px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity font-bold whitespace-nowrap z-25 shadow">
                          Expenses: ₹{t.expenses.toFixed(1)}
                        </div>
                      </div>
                      {/* Profit Bar */}
                      <div 
                        style={{ height: `${profitPercent}%` }} 
                        className={`w-2.5 sm:w-3 rounded-t-full transition-all relative cursor-pointer ${
                          isProfitNegative ? 'bg-amber-500 hover:bg-amber-600' : 'bg-teal-500 hover:bg-teal-600'
                        }`}
                        title={`Net Profit: ₹${t.profit}`}
                      >
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 bg-secondary text-white text-[9.5px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity font-bold whitespace-nowrap z-25 shadow">
                          Net: ₹{t.profit.toFixed(1)}
                        </div>
                      </div>
                    </div>
                    <span className="text-[9.5px] text-[#6B7280] font-bold tracking-wider uppercase mt-3 text-center truncate w-full">{t.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BALANCE SHEET */}
      {activeTab === 'balance' && bsData && (
        <div className="space-y-6">
          
          {/* Balance sheet balanced alert */}
          {bsData.check.balanced ? (
            <div className="bg-emerald-55 border border-emerald-250 text-primary p-4 rounded-3xl text-xs flex items-center justify-between font-bold">
              <div className="flex items-center space-x-2">
                <FiCheckCircle className="w-4.5 h-4.5 shrink-0 text-primary" />
                <span>Accounting Check: Assets = Liabilities + Equity. Ledger is balanced!</span>
              </div>
              <span className="bg-emerald-100 text-primary font-extrabold px-2.5 py-0.5 rounded-full text-[9px]">BALANCED</span>
            </div>
          ) : (
            <div className="bg-rose-50 border border-rose-250 text-rose-600 p-4 rounded-3xl text-xs flex items-center justify-between font-bold">
              <div className="flex items-center space-x-2">
                <FiAlertTriangle className="w-4.5 h-4.5 shrink-0 text-rose-500" />
                <span>Accounting Check: Assets != Liabilities + Equity. Difference: ₹{bsData.check.difference.toFixed(2)}</span>
              </div>
              <span className="bg-rose-100 text-rose-600 font-extrabold px-2.5 py-0.5 rounded-full text-[9px]">UNBALANCED</span>
            </div>
          )}

          {/* Double Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* LEFT COLUMN: ASSETS */}
            <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="font-extrabold text-secondary text-sm sm:text-base border-b border-slate-100 pb-2 uppercase tracking-wide">Assets</h3>
              
              <div className="space-y-3.5 text-xs sm:text-sm">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="text-text-secondary font-medium">Cash in Hand (Collections)</span>
                  <span className="font-extrabold text-secondary">₹{bsData.assets.cash_in_hand.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="text-text-secondary font-medium">Bank Balance</span>
                  <span className="font-extrabold text-secondary">₹{bsData.assets.bank_balance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="text-text-secondary font-medium">Inventory Stock Valuation (Warehouse)</span>
                  <span className="font-extrabold text-secondary">₹{bsData.assets.inventory_value.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="text-text-secondary font-medium">Customer Ledger Receivables (Outstanding)</span>
                  <span className="font-extrabold text-secondary">₹{bsData.assets.customer_receivables.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-4 text-secondary font-extrabold text-sm sm:text-base">
                  <span>TOTAL ASSETS</span>
                  <span className="text-primary font-black">₹{bsData.assets.total_assets.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: LIABILITIES & EQUITY */}
            <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm space-y-6">
              
              {/* Liabilities */}
              <div className="space-y-4">
                <h3 className="font-extrabold text-secondary text-sm sm:text-base border-b border-slate-100 pb-2 uppercase tracking-wide">Liabilities</h3>
                
                <div className="space-y-3.5 text-xs sm:text-sm">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-text-secondary font-medium">Supplier ledger Outstanding payables</span>
                    <span className="font-extrabold text-secondary">₹{bsData.liabilities.supplier_due.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-text-secondary font-medium">Business Capital Loans</span>
                    <span className="font-extrabold text-secondary">₹{bsData.liabilities.business_loans.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-text-secondary font-medium">Unpaid Expenses (Accrued wages/bills)</span>
                    <span className="font-extrabold text-secondary">₹{bsData.liabilities.unpaid_expenses.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 text-secondary font-bold text-xs sm:text-sm">
                    <span>Total Liabilities</span>
                    <span>₹{bsData.liabilities.total_liabilities.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Equity */}
              <div className="space-y-4">
                <h3 className="font-extrabold text-secondary text-sm sm:text-base border-b border-slate-100 pb-2 uppercase tracking-wide">Equity</h3>
                
                <div className="space-y-3.5 text-xs sm:text-sm">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-text-secondary font-medium">Owner Capital Input</span>
                    <span className="font-extrabold text-secondary">₹{bsData.equity.owner_capital.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-text-secondary font-medium">Retained Business Earnings</span>
                    <span className="font-extrabold text-secondary">₹{bsData.equity.retained_earnings.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 text-secondary font-bold text-xs sm:text-sm">
                    <span>Total Equity</span>
                    <span>₹{bsData.equity.total_equity.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Sum Row */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-100 text-secondary font-extrabold text-sm sm:text-base">
                <span>TOTAL LIABILITIES & EQUITY</span>
                <span className="text-primary font-black">₹{(bsData.liabilities.total_liabilities + bsData.equity.total_equity).toFixed(2)}</span>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* TAB 3: CASH FLOW */}
      {activeTab === 'cashflow' && cfData && (
        <div className="space-y-6">
          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-6">
            
            {/* Opening Cash */}
            <div className="bg-white border border-slate-200/60 rounded-3xl p-5 relative overflow-hidden shadow-sm hover:shadow-premium transition-shadow">
              <span className="text-[9.5px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1">Opening Cash</span>
              <p className="text-2xl font-poppins font-extrabold text-secondary">₹{cfData.opening_cash.toFixed(2)}</p>
              <p className="text-[10px] text-text-secondary mt-1">Cash in hand start of period</p>
            </div>

            {/* Money In */}
            <div className="bg-white border border-slate-200/60 rounded-3xl p-5 relative overflow-hidden shadow-sm hover:shadow-premium transition-shadow">
              <span className="text-[9.5px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1">Money In (A)</span>
              <p className="text-2xl font-poppins font-extrabold text-primary">₹{cfData.cash_in.toFixed(2)}</p>
              <p className="text-[10px] text-text-secondary mt-1">Customer cash collections</p>
            </div>

            {/* Money Out */}
            <div className="bg-white border border-slate-200/60 rounded-3xl p-5 relative overflow-hidden shadow-sm hover:shadow-premium transition-shadow">
              <span className="text-[9.5px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1">Money Out (B)</span>
              <p className="text-2xl font-poppins font-extrabold text-rose-600">₹{cfData.cash_out.toFixed(2)}</p>
              <p className="text-[10px] text-text-secondary mt-1">Expenses + supplier payments</p>
            </div>

            {/* Net Cash Flow */}
            <div className="bg-white border border-slate-200/60 rounded-3xl p-5 relative overflow-hidden shadow-sm hover:shadow-premium transition-shadow">
              <span className="text-[9.5px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1">Net Cash Flow (A-B)</span>
              <p className={`text-2xl font-poppins font-extrabold ${cfData.net_cash_flow >= 0 ? 'text-primary' : 'text-rose-600'}`}>
                ₹{cfData.net_cash_flow.toFixed(2)}
              </p>
              <p className="text-[10px] text-text-secondary mt-1">Net change in physical cash</p>
            </div>

            {/* Closing Cash */}
            <div className="bg-white border border-slate-200/60 rounded-3xl p-5 relative overflow-hidden shadow-sm hover:shadow-premium transition-shadow border-primary/20 bg-emerald-50/5">
              <span className="text-[9.5px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1">Closing Cash</span>
              <p className="text-2xl font-poppins font-extrabold text-primary">₹{cfData.closing_cash.toFixed(2)}</p>
              <p className="text-[10px] text-text-secondary mt-1">Cash in hand end of period</p>
            </div>

          </div>

          {/* Cash Flow Trends */}
          <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm">
            <div>
              <h3 className="font-bold text-secondary text-sm sm:text-base">Cash Flow In vs Out trends</h3>
              <p className="text-text-secondary text-xs mt-1">Bar chart comparing daily collections (green) and cash payments (orange) past 6 days.</p>
            </div>

            <div className="h-56 mt-6 flex items-end justify-between px-2 gap-4">
              {cfData.trends.map((t) => {
                const maxVal = Math.max(...cfData.trends.map(x => Math.max(x.cash_in, x.cash_out)), 1);
                const inPercent = Math.max((t.cash_in / maxVal) * 100, 3);
                const outPercent = Math.max((t.cash_out / maxVal) * 100, 3);

                return (
                  <div key={t.day} className="flex-1 flex flex-col items-center group h-full justify-end">
                    <div className="flex items-end space-x-1.5 w-full justify-center h-4/5">
                      {/* Cash In */}
                      <div 
                        style={{ height: `${inPercent}%` }} 
                        className="w-3 sm:w-4 bg-primary hover:bg-primary-hover rounded-t-full transition-all relative cursor-pointer"
                        title={`Inflow: ₹${t.cash_in}`}
                      >
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 bg-secondary text-white text-[9.5px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity font-bold whitespace-nowrap z-25 shadow">
                          In: ₹{t.cash_in.toFixed(1)}
                        </div>
                      </div>
                      {/* Cash Out */}
                      <div 
                        style={{ height: `${outPercent}%` }} 
                        className="w-3 sm:w-4 bg-accent hover:bg-orange-600 rounded-t-full transition-all relative cursor-pointer"
                        title={`Outflow: ₹${t.cash_out}`}
                      >
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 bg-secondary text-white text-[9.5px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity font-bold whitespace-nowrap z-25 shadow">
                          Out: ₹{t.cash_out.toFixed(1)}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-[#6B7280] font-bold tracking-wider uppercase mt-3">{t.day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default FinancialReports;
