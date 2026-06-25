import { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  FiFileText, FiDownload, FiUsers, FiBox, FiTrendingUp, FiCreditCard, FiDollarSign, FiCalendar, FiMessageSquare
} from 'react-icons/fi';

const AdvancedReports = () => {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);

  // Tab management & WhatsApp log states
  const [activeTab, setActiveTab] = useState('exports'); // 'exports' or 'whatsapp'
  const [whatsappLogs, setWhatsappLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logStatusFilter, setLogStatusFilter] = useState('');
  const [logCustomerFilter, setLogCustomerFilter] = useState('');
  const [logCurrentPage, setLogCurrentPage] = useState(1);
  const logPageSize = 5;

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/admin/customers/');
      setCustomers(res.data);
      if (res.data.length > 0) {
        setSelectedCustomerId(res.data[0].id.toString());
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWhatsappLogs = async () => {
    setLogsLoading(true);
    try {
      let url = '/admin/whatsapp-logs/';
      const params = [];
      if (logStatusFilter) params.push(`status=${logStatusFilter}`);
      if (logCustomerFilter) params.push(`customer_id=${logCustomerFilter}`);
      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }
      const res = await api.get(url);
      setWhatsappLogs(res.data);
    } catch (err) {
      console.error('Error fetching WhatsApp logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (activeTab === 'whatsapp') {
      fetchWhatsappLogs();
    }
  }, [activeTab, logStatusFilter, logCustomerFilter]);

  useEffect(() => {
    setLogCurrentPage(1);
  }, [logStatusFilter, logCustomerFilter, activeTab]);

  const handleDownload = async (url, filename, exportId) => {
    setDownloading(exportId);
    try {
      const response = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to generate export file. Please check administrator credentials.');
    } finally {
      setDownloading(null);
    }
  };

  const pdfReports = [
    {
      id: 'pdf-sales',
      title: 'Daily Sales Statement',
      desc: 'All time retail storefront checkouts and ledger sales values.',
      url: '/exports/pdf/?type=sales',
      filename: 'sales_report.pdf',
      icon: <FiTrendingUp className="w-5 h-5 text-emerald-500" />
    },
    {
      id: 'pdf-expenses',
      title: 'Operating Expenses Ledger',
      desc: 'Aggregate utility bills, wages, maintenance fees, and rents.',
      url: '/exports/pdf/?type=expenses',
      filename: 'expenses_report.pdf',
      icon: <FiDollarSign className="w-5 h-5 text-emerald-500" />
    },
    {
      id: 'pdf-pl',
      title: 'Profit & Loss Statement',
      desc: 'Accrual margin audits displaying gross profit, COGS, and overheads.',
      url: '/exports/pdf/?type=pl',
      filename: 'profit_loss_statement.pdf',
      icon: <FiCalendar className="w-5 h-5 text-emerald-500" />
    },
    {
      id: 'pdf-bs',
      title: 'Balance Sheet Statement',
      desc: 'Balance overview displaying assets, liabilities, and owner capital.',
      url: '/exports/pdf/?type=balance_sheet',
      filename: 'balance_sheet.pdf',
      icon: <FiCreditCard className="w-5 h-5 text-emerald-500" />
    },
    {
      id: 'pdf-inventory',
      title: 'Inventory Stock Valuation',
      desc: 'Catalog stock items, unit costs, pricing margins, and total values.',
      url: '/exports/pdf/?type=inventory',
      filename: 'inventory_report.pdf',
      icon: <FiBox className="w-5 h-5 text-emerald-500" />
    }
  ];

  const excelReports = [
    {
      id: 'xlsx-products',
      title: 'Inventory Asset Audit',
      desc: 'Excel worksheet displaying product stock levels, categories, and cost prices.',
      url: '/exports/excel/?type=products',
      filename: 'inventory_assets.xlsx',
      icon: <FiBox className="w-5 h-5 text-teal-500" />
    },
    {
      id: 'xlsx-expenses',
      title: 'Operating Expense logs',
      desc: 'Excel worksheet containing detailed utility billing and salary payouts.',
      url: '/exports/excel/?type=expenses',
      filename: 'operating_expenses.xlsx',
      icon: <FiDollarSign className="w-5 h-5 text-teal-500" />
    },
    {
      id: 'xlsx-suppliers',
      title: 'Supplier ledger accounts',
      desc: 'Excel worksheet containing trade payable details and outstanding due levels.',
      url: '/exports/excel/?type=suppliers',
      filename: 'suppliers_ledger.xlsx',
      icon: <FiUsers className="w-5 h-5 text-teal-500" />
    },
    {
      id: 'xlsx-pl',
      title: 'P&L Ledger Accounts',
      desc: 'Excel worksheet displaying business margins, gross profit, and cost of goods sold.',
      url: '/exports/excel/?type=pl',
      filename: 'profit_loss_sheet.xlsx',
      icon: <FiTrendingUp className="w-5 h-5 text-teal-500" />
    },
    {
      id: 'xlsx-bs',
      title: 'Balance Sheet Statement',
      desc: 'Excel worksheet displaying asset calculations, liabilities, and capital equity.',
      url: '/exports/excel/?type=balance_sheet',
      filename: 'balance_sheet.xlsx',
      icon: <FiCreditCard className="w-5 h-5 text-teal-500" />
    }
  ];

  const totalPages = Math.ceil(whatsappLogs.length / logPageSize);
  const paginatedLogs = whatsappLogs.slice(
    (logCurrentPage - 1) * logPageSize,
    logCurrentPage * logPageSize
  );

  useEffect(() => {
    if (totalPages > 0 && logCurrentPage > totalPages) {
      setLogCurrentPage(totalPages);
    } else if (totalPages === 0 && logCurrentPage !== 1) {
      setLogCurrentPage(1);
    }
  }, [whatsappLogs.length, logCurrentPage, totalPages]);

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto bg-slate-50/50 text-[#111827] flex flex-col justify-start relative text-left">
      
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-poppins font-extrabold text-secondary">Export & Communication Center</h2>
        <p className="text-[#6B7280] text-xs sm:text-sm">Download business accounting statements, ledger spreadsheets, and audit WhatsApp notification logs.</p>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('exports')}
          className={`py-3.5 px-1 font-bold text-xs sm:text-sm border-b-2 transition-all cursor-pointer flex items-center space-x-2 ${
            activeTab === 'exports'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-secondary'
          }`}
        >
          <FiFileText className="w-4 h-4" />
          <span>Exports Center</span>
        </button>
        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`py-3.5 px-1 font-bold text-xs sm:text-sm border-b-2 transition-all cursor-pointer flex items-center space-x-2 ${
            activeTab === 'whatsapp'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-secondary'
          }`}
        >
          <FiMessageSquare className="w-4 h-4" />
          <span>WhatsApp Audit Logs</span>
        </button>
      </div>

      {activeTab === 'exports' ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Target Customer Ledger Selector Section */}
          <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm space-y-4 max-w-2xl">
            <h3 className="font-bold text-secondary text-sm sm:text-base flex items-center space-x-2">
              <FiUsers className="text-primary w-5 h-5" />
              <span>Customer Ledger Statement Downloads</span>
            </h3>
            <p className="text-text-secondary text-xs">Select a customer profile to export their digital Khata transactions ledger logs.</p>

            {loading ? (
              <div className="h-10 bg-slate-100 rounded-xl animate-pulse"></div>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 focus:border-primary focus:bg-white rounded-xl py-2.5 px-4 text-xs sm:text-sm font-semibold text-secondary outline-none transition-all cursor-pointer flex-1"
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Outstanding: ₹{c.balance.toFixed(2)})
                    </option>
                  ))}
                </select>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const target = customers.find(c => c.id.toString() === selectedCustomerId);
                      if (target) {
                        handleDownload(
                          `/exports/pdf/?type=khata&customer_id=${selectedCustomerId}`,
                          `khata_ledger_${target.name}.pdf`,
                          'khata-pdf'
                        );
                      }
                    }}
                    disabled={!selectedCustomerId || downloading === 'khata-pdf'}
                    className="bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                  >
                    {downloading === 'khata-pdf' ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <FiDownload className="w-3.5 h-3.5" />
                    )}
                    <span>PDF Ledger</span>
                  </button>

                  <button
                    onClick={() => {
                      const target = customers.find(c => c.id.toString() === selectedCustomerId);
                      if (target) {
                        handleDownload(
                          `/exports/excel/?type=customer&customer_id=${selectedCustomerId}`,
                          `ledger_${target.name}.xlsx`,
                          'khata-xlsx'
                        );
                      }
                    }}
                    disabled={!selectedCustomerId || downloading === 'khata-xlsx'}
                    className="bg-secondary hover:bg-slate-800 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                  >
                    {downloading === 'khata-xlsx' ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <FiDownload className="w-3.5 h-3.5" />
                    )}
                    <span>Excel Ledger</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* PDF & Excel Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* PDF SECTION */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
                <FiFileText className="w-5 h-5 text-primary" />
                <h3 className="font-extrabold text-secondary text-base uppercase tracking-wide">Official PDF Reports</h3>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {pdfReports.map((r) => (
                  <div 
                    key={r.id} 
                    className="bg-white border border-slate-200/60 rounded-3xl p-4.5 flex items-center justify-between shadow-sm hover:border-slate-350 transition-colors"
                  >
                    <div className="flex items-start space-x-3.5 text-left">
                      <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl shrink-0">
                        {r.icon}
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-secondary text-sm">{r.title}</h4>
                        <p className="text-text-secondary text-xs font-light leading-relaxed max-w-xs">{r.desc}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownload(r.url, r.filename, r.id)}
                      disabled={downloading === r.id}
                      className="bg-slate-100 hover:bg-emerald-50 text-secondary hover:text-primary p-3 rounded-2xl border border-slate-200/50 hover:border-emerald-200 shadow-sm transition-all cursor-pointer active:scale-95"
                      title="Download PDF statement"
                    >
                      {downloading === r.id ? (
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <FiDownload className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* EXCEL SECTION */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
                <FiFileText className="w-5 h-5 text-teal-500" />
                <h3 className="font-extrabold text-secondary text-base uppercase tracking-wide">Excel Spreadsheets</h3>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {excelReports.map((r) => (
                  <div 
                    key={r.id} 
                    className="bg-white border border-slate-200/60 rounded-3xl p-4.5 flex items-center justify-between shadow-sm hover:border-slate-350 transition-colors"
                  >
                    <div className="flex items-start space-x-3.5 text-left">
                      <div className="bg-teal-50 border border-teal-100 p-3 rounded-2xl shrink-0">
                        {r.icon}
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-secondary text-sm">{r.title}</h4>
                        <p className="text-text-secondary text-xs font-light leading-relaxed max-w-xs">{r.desc}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownload(r.url, r.filename, r.id)}
                      disabled={downloading === r.id}
                      className="bg-slate-100 hover:bg-teal-50 text-secondary hover:text-teal-600 p-3 rounded-2xl border border-slate-200/50 hover:border-teal-200 shadow-sm transition-all cursor-pointer active:scale-95"
                      title="Download Excel spreadsheet"
                    >
                      {downloading === r.id ? (
                        <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <FiDownload className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 bg-white border border-slate-200/60 rounded-3xl p-5 shadow-sm max-w-3xl">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2">Filter by Customer</label>
              <select
                value={logCustomerFilter}
                onChange={(e) => setLogCustomerFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:bg-white rounded-xl py-2 px-3 text-xs font-semibold text-secondary outline-none transition-all cursor-pointer"
              >
                <option value="">-- All Customers --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2">Filter by Status</label>
              <select
                value={logStatusFilter}
                onChange={(e) => setLogStatusFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:bg-white rounded-xl py-2 px-3 text-xs font-semibold text-secondary outline-none transition-all cursor-pointer"
              >
                <option value="">-- All Statuses --</option>
                <option value="SENT">Sent</option>
                <option value="FAILED">Failed</option>
                <option value="PENDING">Pending</option>
              </select>
            </div>
          </div>

          {/* Table Log */}
          {logsLoading ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 h-60 animate-pulse shadow-sm"></div>
          ) : whatsappLogs.length > 0 ? (
            <div className="bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-150 text-[10px] uppercase font-bold tracking-wider text-[#6B7280] bg-slate-50/70">
                      <th className="py-4 px-6">Sent Time</th>
                      <th className="py-4 px-6">Customer</th>
                      <th className="py-4 px-6">Type</th>
                      <th className="py-4 px-6">Phone Number</th>
                      <th className="py-4 px-6">Message Preview</th>
                      <th className="py-4 px-6 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLogs.map((log) => (
                      <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50/50 text-xs sm:text-sm">
                        <td className="py-4 px-6 text-text-secondary font-medium whitespace-nowrap">
                          {new Date(log.sent_at).toLocaleString()}
                        </td>
                        <td className="py-4 px-6 font-bold text-secondary capitalize">
                          {log.customer_username || 'N/A'}
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap">
                          <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border border-slate-200">
                            {log.message_type?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-mono text-secondary font-semibold">
                          {log.phone_number}
                        </td>
                        <td className="py-4 px-6 max-w-xs truncate text-text-secondary text-xs" title={log.message_body}>
                          {log.message_body}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide border ${
                            log.status === 'SENT'
                              ? 'bg-emerald-55 text-primary border-emerald-100'
                              : log.status === 'FAILED'
                              ? 'bg-rose-50 text-rose-600 border-rose-100'
                              : 'bg-amber-50 text-amber-600 border-amber-100'
                          }`}>
                            {log.status}
                          </span>
                          {log.status === 'FAILED' && log.error_message && (
                            <span className="block text-[8px] text-rose-500 mt-1 text-center font-semibold truncate max-w-[120px]" title={log.error_message}>
                              {log.error_message}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/30">
                  <button
                    type="button"
                    onClick={() => setLogCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={logCurrentPage === 1}
                    className="px-3.5 py-2 text-xs font-bold text-secondary border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent rounded-xl cursor-pointer transition-all flex items-center space-x-1"
                  >
                    <span>&larr; Previous</span>
                  </button>
                  <span className="text-xs font-medium text-text-secondary">
                    Page <span className="font-bold text-secondary">{logCurrentPage}</span> of <span className="font-bold text-secondary">{totalPages}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setLogCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={logCurrentPage === totalPages}
                    className="px-3.5 py-2 text-xs font-bold text-secondary border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent rounded-xl cursor-pointer transition-all flex items-center space-x-1"
                  >
                    <span>Next &rarr;</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl py-12 px-4 flex flex-col items-center justify-center space-y-3.5 text-center shadow-sm">
              <div className="bg-slate-50 p-4 rounded-full text-slate-350">
                <FiMessageSquare className="w-8 h-8" />
              </div>
              <p className="text-xs sm:text-sm text-text-secondary">No WhatsApp notifications logged matching the active filters.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdvancedReports;
