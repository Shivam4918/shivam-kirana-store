import { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  FiRefreshCw, FiCheckCircle, FiAlertTriangle,
  FiFileText, FiDownload, FiCalendar, FiPercent
} from 'react-icons/fi';

const FinancialReports = () => {
  const [activeTab, setActiveTab] = useState('pl'); // 'pl', 'balance', 'cashflow', 'gst'
  
  // States
  const [plData, setPlData] = useState(null);
  const [bsData, setBsData] = useState(null);
  const [cfData, setCfData] = useState(null);
  const [gstSummary, setGstSummary] = useState(null);
  const [gstSlabs, setGstSlabs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exportDownloading, setExportDownloading] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
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
      } else if (activeTab === 'gst') {
        const [gstRes, invoicesRes] = await Promise.all([
          api.get(`/admin/analytics/gst/?start_date=${startDate}&end_date=${endDate}`),
          api.get('/invoices/')
        ]);
        setGstSummary(gstRes.data.summary);
        setGstSlabs(gstRes.data.slabs_breakdown);
        setInvoices(invoicesRes.data);
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

  const handleGstExcelDownload = async () => {
    setExportDownloading(true);
    try {
      let url = '/exports/excel/?type=gst';
      let monthStr = '';
      let yearStr = '';
      
      if (startDate) {
        const d = new Date(startDate);
        monthStr = `&month=${d.getMonth() + 1}`;
        yearStr = `&year=${d.getFullYear()}`;
      } else {
        const d = new Date();
        monthStr = `&month=${d.getMonth() + 1}`;
        yearStr = `&year=${d.getFullYear()}`;
      }
      
      url += `${monthStr}${yearStr}`;
      
      const response = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `gst_summary_${startDate ? startDate.substring(0, 7) : new Date().toISOString().substring(0, 7)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to generate Excel report.');
    } finally {
      setExportDownloading(false);
    }
  };

  const downloadSingleInvoicePDF = async (invoiceId, invoiceNumber) => {
    setPdfDownloading(prev => ({ ...prev, [invoiceId]: true }));
    try {
      const res = await api.get(`/invoices/${invoiceId}/pdf/`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      alert('Failed to download invoice PDF.');
    } finally {
      setPdfDownloading(prev => ({ ...prev, [invoiceId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto bg-[#F8FAFC] text-[#111827] flex flex-col justify-start relative text-left animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/4"></div>
        <div className="flex space-x-2 border-b border-slate-200 pb-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-8 bg-slate-200 rounded w-28"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white border border-slate-200/60 rounded-lg p-6 h-28 shadow-sm"></div>
          ))}
        </div>
        <div className="bg-white border border-slate-200/60 rounded-lg h-96 shadow-sm"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto bg-[#F8FAFC] text-[#111827] flex flex-col justify-start relative text-left">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 leading-none">Financial Statements</h2>
          <p className="text-slate-505 text-xs sm:text-sm mt-1.5 font-medium">Audit profit margins, evaluate company asset values, and map cash inflows/outflows.</p>
        </div>
        
        <button
          onClick={fetchData}
          className="bg-white hover:bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 transition-all cursor-pointer flex items-center space-x-1.5 shadow-sm active:scale-95 w-fit"
        >
          <FiRefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Tabs Switcher */}
      <div className="flex flex-wrap bg-slate-50 border border-slate-200/60 p-1 rounded-lg w-max shadow-sm gap-1">
        <button
          onClick={() => setActiveTab('pl')}
          className={`px-4 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'pl'
              ? 'bg-white text-slate-900 border border-slate-200/50 shadow-sm'
              : 'text-slate-400 hover:text-slate-900'
          }`}
        >
          Profit &amp; Loss
        </button>
        <button
          onClick={() => setActiveTab('balance')}
          className={`px-4 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'balance'
              ? 'bg-white text-slate-900 border border-slate-200/50 shadow-sm'
              : 'text-slate-400 hover:text-slate-900'
          }`}
        >
          Balance Sheet
        </button>
        <button
          onClick={() => setActiveTab('cashflow')}
          className={`px-4 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'cashflow'
              ? 'bg-white text-slate-900 border border-slate-200/50 shadow-sm'
              : 'text-slate-400 hover:text-slate-900'
          }`}
        >
          Cash Flow
        </button>
        <button
          onClick={() => setActiveTab('gst')}
          className={`px-4 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'gst'
              ? 'bg-white text-slate-900 border border-slate-200/50 shadow-sm'
              : 'text-slate-400 hover:text-slate-900'
          }`}
        >
          GST Ledgers
        </button>
      </div>

      {/* RENDER ACTIVE TAB */}

      {/* TAB 1: PROFIT & LOSS */}
      {activeTab === 'pl' && plData && (
        <div className="space-y-6">
          {/* PL Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-6">
            
            <div className="bg-white border border-slate-200/60 rounded-lg p-5 relative overflow-hidden shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Sales Revenue (A)</span>
              <p className="text-2xl font-semibold text-slate-900 font-mono">₹{plData.metrics.total_sales.toFixed(2)}</p>
              <p className="text-[10px] text-slate-405 font-medium mt-1">Store credit sales volume</p>
            </div>

            <div className="bg-white border border-slate-200/60 rounded-lg p-5 relative overflow-hidden shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Cost of Goods (B)</span>
              <p className="text-2xl font-semibold text-slate-900 font-mono">₹{plData.metrics.cogs.toFixed(2)}</p>
              <p className="text-[10px] text-slate-405 font-medium mt-1">Wholesale cost of goods sold</p>
            </div>

            <div className="bg-white border border-slate-200/60 rounded-lg p-5 relative overflow-hidden shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Gross Profit (A-B)</span>
              <p className="text-2xl font-semibold text-[#10B981] font-mono">₹{plData.metrics.gross_profit.toFixed(2)}</p>
              <p className="text-[10px] text-slate-405 font-medium mt-1">Retail margin gains</p>
            </div>

            <div className="bg-white border border-slate-200/60 rounded-lg p-5 relative overflow-hidden shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Expenses (C)</span>
              <p className="text-2xl font-semibold text-rose-600 font-mono">₹{plData.metrics.total_expenses.toFixed(2)}</p>
              <p className="text-[10px] text-slate-405 font-medium mt-1">Utilities, rent, staff overheads</p>
            </div>

            <div className={`border rounded-lg p-5 relative overflow-hidden shadow-sm ${
              plData.metrics.net_profit >= 0 
                ? 'bg-white border-emerald-200' 
                : 'bg-white border-rose-200'
            }`}>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Net Profit</span>
              <p className={`text-2xl font-semibold font-mono ${plData.metrics.net_profit >= 0 ? 'text-[#10B981]' : 'text-rose-600'}`}>
                ₹{plData.metrics.net_profit.toFixed(2)}
              </p>
              <p className="text-[10px] text-slate-405 font-medium mt-1">Final take home earnings</p>
            </div>

          </div>

          {/* PL Trends Charts */}
          <div className="bg-white border border-slate-200/60 rounded-lg p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm sm:text-base">Revenue &amp; Net Profit Trends</h3>
                <p className="text-slate-400 text-xs mt-1.5 font-medium">Bar chart comparing Sales volume (green), Expenses (rose), and final Net Profit (teal bars).</p>
              </div>

              {/* Period filters */}
              <div className="flex bg-slate-50 border border-slate-200 p-0.5 rounded-lg w-max">
                <button
                  onClick={() => setPlPeriod('daily')}
                  className={`px-3 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                    plPeriod === 'daily' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/55' : 'text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setPlPeriod('weekly')}
                  className={`px-3 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                    plPeriod === 'weekly' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/55' : 'text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setPlPeriod('monthly')}
                  className={`px-3 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                    plPeriod === 'monthly' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/55' : 'text-slate-400 hover:text-slate-900'
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
                    <div className="flex items-end space-x-1 sm:space-x-1.5 w-full justify-center h-4/5">
                      {/* Sales Bar */}
                      <div 
                        style={{ height: `${salesPercent}%` }} 
                        className="w-2 sm:w-3 bg-[#10B981]/80 hover:bg-[#10B981] rounded-t transition-all relative cursor-pointer"
                        title={`Sales: ₹${t.sales}`}
                      >
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity font-bold font-mono whitespace-nowrap z-25 shadow">
                          Sales: ₹{t.sales.toFixed(1)}
                        </div>
                      </div>
                      {/* Expense Bar */}
                      <div 
                        style={{ height: `${expensePercent}%` }} 
                        className="w-2 sm:w-3 bg-rose-400 hover:bg-rose-500 rounded-t transition-all relative cursor-pointer"
                        title={`Expenses: ₹${t.expenses}`}
                      >
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity font-bold font-mono whitespace-nowrap z-25 shadow">
                          Exp: ₹{t.expenses.toFixed(1)}
                        </div>
                      </div>
                      {/* Profit Bar */}
                      <div 
                        style={{ height: `${profitPercent}%` }} 
                        className={`w-2 sm:w-3 rounded-t transition-all relative cursor-pointer ${
                          isProfitNegative ? 'bg-amber-400 hover:bg-amber-500' : 'bg-teal-400 hover:bg-teal-500'
                        }`}
                        title={`Net Profit: ₹${t.profit}`}
                      >
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity font-bold font-mono whitespace-nowrap z-25 shadow">
                          Net: ₹{t.profit.toFixed(1)}
                        </div>
                      </div>
                    </div>
                    <span className="text-[9px] text-slate-400 font-semibold tracking-wider mt-3 text-center truncate w-full uppercase font-mono">{t.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BALANCE SHEET */}
      {activeTab === 'balance' && bsData && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Balance sheet balanced alert */}
          {bsData.check.balanced ? (
            <div className="bg-emerald-50/50 border border-emerald-100 text-[#10B981] p-3.5 rounded-lg text-xs flex items-center justify-between font-medium">
              <div className="flex items-center space-x-2">
                <FiCheckCircle className="w-4.5 h-4.5 shrink-0 text-[#10B981]" />
                <span>Accounting Check: Assets = Liabilities + Equity. Ledger is balanced!</span>
              </div>
              <span className="bg-emerald-50 text-[#10B981] border border-emerald-100 font-bold px-2 py-0.5 rounded-full text-[9px]">BALANCED</span>
            </div>
          ) : (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 p-3.5 rounded-lg text-xs flex items-center justify-between font-medium">
              <div className="flex items-center space-x-2">
                <FiAlertTriangle className="w-4.5 h-4.5 shrink-0 text-rose-500" />
                <span>Accounting Check: Assets != Liabilities + Equity. Difference: ₹{bsData.check.difference.toFixed(2)}</span>
              </div>
              <span className="bg-rose-50 text-rose-600 border border-rose-100 font-bold px-2 py-0.5 rounded-full text-[9px]">UNBALANCED</span>
            </div>
          )}

          {/* Double Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* LEFT COLUMN: ASSETS */}
            <div className="bg-white border border-slate-200/60 rounded-lg p-6 shadow-sm space-y-4">
              <h3 className="font-semibold text-slate-900 text-sm border-b border-slate-100 pb-2 uppercase tracking-wider text-[10px]">Assets</h3>
              
              <div className="space-y-3.5 text-xs sm:text-sm font-mono">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-sans">Cash in Hand (Collections)</span>
                  <span className="font-semibold text-slate-800">₹{bsData.assets.cash_in_hand.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-sans">Bank Balance</span>
                  <span className="font-semibold text-slate-800">₹{bsData.assets.bank_balance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-sans">Inventory Stock Valuation (Warehouse)</span>
                  <span className="font-semibold text-slate-800">₹{bsData.assets.inventory_value.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-sans">Customer Ledger Receivables (Outstanding)</span>
                  <span className="font-semibold text-slate-800">₹{bsData.assets.customer_receivables.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-4 text-slate-900 font-bold text-sm sm:text-base border-t border-slate-200">
                  <span className="font-sans text-xs">TOTAL ASSETS</span>
                  <span className="text-[#10B981] font-bold">₹{bsData.assets.total_assets.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: LIABILITIES & EQUITY */}
            <div className="bg-white border border-slate-200/60 rounded-lg p-6 shadow-sm space-y-6">
              
              {/* Liabilities */}
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900 text-sm border-b border-slate-100 pb-2 uppercase tracking-wider text-[10px]">Liabilities</h3>
                
                <div className="space-y-3.5 text-xs sm:text-sm font-mono">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-sans">Supplier Ledger Outstanding payables</span>
                    <span className="font-semibold text-slate-800">₹{bsData.liabilities.supplier_due.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-sans">Business Capital Loans</span>
                    <span className="font-semibold text-slate-800">₹{bsData.liabilities.business_loans.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-sans">Unpaid Expenses (Accrued wages/bills)</span>
                    <span className="font-semibold text-slate-800">₹{bsData.liabilities.unpaid_expenses.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 text-slate-800 font-semibold text-xs sm:text-sm">
                    <span className="font-sans text-[11px]">Total Liabilities</span>
                    <span>₹{bsData.liabilities.total_liabilities.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Equity */}
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900 text-sm border-b border-slate-100 pb-2 uppercase tracking-wider text-[10px]">Equity</h3>
                
                <div className="space-y-3.5 text-xs sm:text-sm font-mono">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-sans">Owner Capital Input</span>
                    <span className="font-semibold text-slate-800">₹{bsData.equity.owner_capital.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-sans">Retained Business Earnings</span>
                    <span className="font-semibold text-slate-800">₹{bsData.equity.retained_earnings.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 text-slate-800 font-semibold text-xs sm:text-sm">
                    <span className="font-sans text-[11px]">Total Equity</span>
                    <span>₹{bsData.equity.total_equity.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Sum Row */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-200 text-slate-900 font-bold text-sm sm:text-base font-mono">
                <span className="font-sans text-xs">TOTAL LIABILITIES &amp; EQUITY</span>
                <span className="text-[#10B981] font-bold">₹{(bsData.liabilities.total_liabilities + bsData.equity.total_equity).toFixed(2)}</span>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* TAB 3: CASH FLOW */}
      {activeTab === 'cashflow' && cfData && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-6">
            
            <div className="bg-white border border-slate-200/60 rounded-lg p-5 relative overflow-hidden shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Opening Cash</span>
              <p className="text-2xl font-semibold text-slate-900 font-mono">₹{cfData.opening_cash.toFixed(2)}</p>
              <p className="text-[10px] text-slate-405 font-medium mt-1">Cash in hand start of period</p>
            </div>

            <div className="bg-white border border-slate-200/60 rounded-lg p-5 relative overflow-hidden shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Money In (A)</span>
              <p className="text-2xl font-semibold text-[#10B981] font-mono">₹{cfData.cash_in.toFixed(2)}</p>
              <p className="text-[10px] text-slate-405 font-medium mt-1">Customer cash collections</p>
            </div>

            <div className="bg-white border border-slate-200/60 rounded-lg p-5 relative overflow-hidden shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Money Out (B)</span>
              <p className="text-2xl font-semibold text-rose-600 font-mono">₹{cfData.cash_out.toFixed(2)}</p>
              <p className="text-[10px] text-slate-405 font-medium mt-1">Expenses + supplier payments</p>
            </div>

            <div className="bg-white border border-slate-200/60 rounded-lg p-5 relative overflow-hidden shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Net Cash Flow (A-B)</span>
              <p className={`text-2xl font-semibold font-mono ${cfData.net_cash_flow >= 0 ? 'text-[#10B981]' : 'text-rose-600'}`}>
                ₹{cfData.net_cash_flow.toFixed(2)}
              </p>
              <p className="text-[10px] text-slate-405 font-medium mt-1">Net change in physical cash</p>
            </div>

            <div className="bg-white border border-emerald-250 rounded-lg p-5 relative overflow-hidden shadow-sm bg-emerald-50/10">
              <span className="text-[10px] font-bold text-[#10B981] uppercase tracking-wider block mb-1">Closing Cash</span>
              <p className="text-2xl font-semibold text-[#10B981] font-mono">₹{cfData.closing_cash.toFixed(2)}</p>
              <p className="text-[10px] text-[#10B981]/80 font-medium mt-1">Cash in hand end of period</p>
            </div>

          </div>

          {/* Cash Flow Trends */}
          <div className="bg-white border border-slate-200/60 rounded-lg p-6 shadow-sm">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm sm:text-base">Cash Flow In vs Out trends</h3>
              <p className="text-slate-400 text-xs mt-1.5 font-medium">Bar chart comparing daily collections (green) and cash payments (orange) past 6 days.</p>
            </div>

            <div className="h-56 mt-6 flex items-end justify-between px-2 gap-4">
              {cfData.trends.map((t) => {
                const maxVal = Math.max(...cfData.trends.map(x => Math.max(x.cash_in, x.cash_out)), 1);
                const inPercent = Math.max((t.cash_in / maxVal) * 100, 3);
                const outPercent = Math.max((t.cash_out / maxVal) * 100, 3);

                return (
                  <div key={t.day} className="flex-1 flex flex-col items-center group h-full justify-end">
                    <div className="flex items-end space-x-1 sm:space-x-1.5 w-full justify-center h-4/5">
                      {/* Cash In */}
                      <div 
                        style={{ height: `${inPercent}%` }} 
                        className="w-2.5 sm:w-4 bg-[#10B981]/80 hover:bg-[#10B981] rounded-t transition-all relative cursor-pointer"
                        title={`Inflow: ₹${t.cash_in}`}
                      >
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity font-bold font-mono whitespace-nowrap z-25 shadow">
                          In: ₹{t.cash_in.toFixed(1)}
                        </div>
                      </div>
                      {/* Cash Out */}
                      <div 
                        style={{ height: `${outPercent}%` }} 
                        className="w-2.5 sm:w-4 bg-[#F97316]/80 hover:bg-[#F97316] rounded-t transition-all relative cursor-pointer"
                        title={`Outflow: ₹${t.cash_out}`}
                      >
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity font-bold font-mono whitespace-nowrap z-25 shadow">
                          Out: ₹{t.cash_out.toFixed(1)}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold tracking-wider mt-3 uppercase font-mono">{t.day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: GST LEDGER & REPORTS */}
      {activeTab === 'gst' && gstSummary && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Filters & Actions */}
          <div className="bg-white border border-slate-200/60 rounded-lg p-6 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm sm:text-base flex items-center space-x-1.5">
                  <FiCalendar className="text-slate-400 w-4 h-4" />
                  <span>GST Calculation Period</span>
                </h3>
                <p className="text-slate-400 text-xs mt-1.5 font-medium leading-normal">
                  Select a date range to recalculate GST liabilities and filter the tax invoices ledger.
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400 font-semibold uppercase">From</span>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-slate-50 border border-slate-200 focus:border-[#10B981] focus:bg-white rounded-lg py-1.5 px-3 text-xs font-semibold text-slate-700 outline-none transition-all cursor-pointer font-mono"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400 font-semibold uppercase">To</span>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-slate-50 border border-slate-200 focus:border-[#10B981] focus:bg-white rounded-lg py-1.5 px-3 text-xs font-semibold text-slate-700 outline-none transition-all cursor-pointer font-mono"
                  />
                </div>
                <button
                  onClick={fetchData}
                  className="bg-[#10B981] hover:bg-[#059669] text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer shadow-sm active:scale-95"
                >
                  Apply Filter
                </button>
                <button
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer active:scale-95"
                >
                  Clear
                </button>
                <button
                  onClick={handleGstExcelDownload}
                  disabled={exportDownloading}
                  className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer flex items-center space-x-1.5 shadow-sm active:scale-95"
                >
                  {exportDownloading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <FiDownload className="w-3.5 h-3.5" />
                  )}
                  <span>Export Excel</span>
                </button>
              </div>
            </div>
          </div>

          {/* GST Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-6">
            
            <div className="bg-white border border-slate-200/60 rounded-lg p-5 relative overflow-hidden shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Sales (Inclusive)</span>
              <p className="text-2xl font-semibold text-slate-900 font-mono">₹{gstSummary.total_sales.toFixed(2)}</p>
              <p className="text-[10px] text-slate-405 font-medium mt-1">Total billing inclusive of tax</p>
            </div>

            <div className="bg-white border border-slate-200/60 rounded-lg p-5 relative overflow-hidden shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Taxable Subtotal</span>
              <p className="text-2xl font-semibold text-slate-900 font-mono">₹{gstSummary.taxable_amount.toFixed(2)}</p>
              <p className="text-[10px] text-slate-405 font-medium mt-1">Value of goods sold excluding GST</p>
            </div>

            <div className="bg-white border border-slate-200/60 rounded-lg p-5 relative overflow-hidden shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">CGST Collected</span>
              <p className="text-2xl font-semibold text-slate-800 font-mono">₹{gstSummary.total_cgst.toFixed(2)}</p>
              <p className="text-[10px] text-slate-405 font-medium mt-1">Central Goods &amp; Services Tax</p>
            </div>

            <div className="bg-white border border-slate-200/60 rounded-lg p-5 relative overflow-hidden shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">SGST Collected</span>
              <p className="text-2xl font-semibold text-slate-800 font-mono">₹{gstSummary.total_sgst.toFixed(2)}</p>
              <p className="text-[10px] text-slate-405 font-medium mt-1">State Goods &amp; Services Tax</p>
            </div>

            <div className="bg-white border-emerald-250 rounded-lg p-5 relative overflow-hidden shadow-sm bg-emerald-50/10">
              <span className="text-[10px] font-bold text-[#10B981] uppercase tracking-wider block mb-1">Total Tax Collected</span>
              <p className="text-2xl font-semibold text-[#10B981] font-mono">₹{gstSummary.total_tax.toFixed(2)}</p>
              <p className="text-[10px] text-[#10B981]/80 font-medium mt-1">Total GST collected (CGST + SGST)</p>
            </div>

          </div>

          {/* Slabs & Invoice List Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* GST SLABS BREAKDOWN */}
            <div className="lg:col-span-1 bg-white border border-slate-200/60 rounded-lg p-6 shadow-sm space-y-4 h-max">
              <h3 className="font-semibold text-slate-900 text-sm border-b border-slate-100 pb-2 uppercase tracking-wider text-[10px] flex items-center space-x-1.5">
                <FiPercent className="text-slate-400" />
                <span>GST Tax Slab Audits</span>
              </h3>
              
              <div className="space-y-3.5">
                {gstSlabs.map((slab) => {
                  const getSlabStyles = (rate) => {
                    if (rate === 0) return 'bg-slate-50 text-slate-600 border-slate-200';
                    if (rate === 5) return 'bg-blue-50/50 text-blue-600 border-blue-100';
                    if (rate === 12) return 'bg-purple-50/50 text-purple-600 border-purple-100';
                    if (rate === 18) return 'bg-amber-50/50 text-amber-600 border-amber-100';
                    return 'bg-rose-50/50 text-rose-600 border-rose-100';
                  };
                  
                  return (
                    <div key={slab.gst_rate} className="border border-slate-200/60 rounded-lg p-4 space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${getSlabStyles(slab.gst_rate)}`}>
                          GST {slab.gst_rate}% Slab
                        </span>
                        <span className="text-xs font-semibold text-slate-800 font-mono">
                          ₹{slab.total_sales.toFixed(2)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-2 border-t border-slate-100 font-mono">
                        <div>
                          <p className="font-sans text-[9px] uppercase tracking-wider text-slate-400">Taxable Base</p>
                          <p className="font-semibold text-slate-700">₹{slab.taxable_amount.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="font-sans text-[9px] uppercase tracking-wider text-slate-400">Total Tax</p>
                          <p className="font-semibold text-emerald-600">₹{slab.total_collected.toFixed(2)}</p>
                        </div>
                      </div>
                      
                      <div className="flex justify-between text-[9px] text-slate-400 pt-1 font-mono">
                        <span>CGST: ₹{slab.cgst_collected.toFixed(2)}</span>
                        <span>SGST: ₹{slab.sgst_collected.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* INVOICES LIST */}
            <div className="lg:col-span-2 bg-white border border-slate-200/60 rounded-lg p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm uppercase tracking-wider text-[10px] flex items-center space-x-1.5">
                    <FiFileText className="text-slate-405" />
                    <span>Store Tax Invoices</span>
                  </h3>
                  <p className="text-slate-400 text-xs mt-1.5 font-medium leading-normal">
                    Viewing generated billing statements and corresponding tax receipts.
                  </p>
                </div>
                
                {/* Search Invoice */}
                <input 
                  type="text"
                  placeholder="Search Invoice No / Customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-50 border border-slate-200 focus:border-[#10B981] focus:bg-white rounded-lg py-1.5 px-3 text-xs font-semibold text-slate-900 outline-none transition-all w-full sm:w-56"
                />
              </div>

              {/* Invoices Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-800">
                  <thead>
                    <tr className="border-b border-slate-200/60 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                      <th className="py-2.5 px-2">Invoice No</th>
                      <th className="py-2.5 px-2">Date</th>
                      <th className="py-2.5 px-2">Customer</th>
                      <th className="py-2.5 px-2 text-right">Taxable</th>
                      <th className="py-2.5 px-2 text-right">CGST</th>
                      <th className="py-2.5 px-2 text-right">SGST</th>
                      <th className="py-2.5 px-2 text-right">Total</th>
                      <th className="py-2.5 px-2 text-center">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {invoices
                      .filter(inv => 
                        inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        inv.customer_username.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-2 font-bold text-slate-905 font-mono">{inv.invoice_number}</td>
                          <td className="py-3 px-2 text-slate-400 font-mono">
                            {new Date(inv.created_at).toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </td>
                          <td className="py-3 px-2 text-slate-800 font-semibold capitalize">{inv.customer_username}</td>
                          <td className="py-3 px-2 text-right text-slate-500 font-mono">₹{inv.subtotal.toFixed(2)}</td>
                          <td className="py-3 px-2 text-right text-slate-600 font-mono">₹{inv.cgst_total.toFixed(2)}</td>
                          <td className="py-3 px-2 text-right text-slate-600 font-mono">₹{inv.sgst_total.toFixed(2)}</td>
                          <td className="py-3 px-2 text-right font-bold text-slate-800 font-mono">₹{inv.grand_total.toFixed(2)}</td>
                          <td className="py-3 px-2 text-center">
                            <button
                              onClick={() => downloadSingleInvoicePDF(inv.id, inv.invoice_number)}
                              disabled={!!pdfDownloading[inv.id]}
                              className="text-[#10B981] hover:text-[#059669] p-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center justify-center active:scale-90"
                              title="Download Invoice PDF"
                            >
                              {pdfDownloading[inv.id] ? (
                                <div className="w-3.5 h-3.5 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <FiDownload className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    {invoices.length === 0 && (
                      <tr>
                        <td colSpan="8" className="py-8 text-center text-slate-400 font-light">
                          No invoices found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default FinancialReports;
