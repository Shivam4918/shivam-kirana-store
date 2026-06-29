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
      icon: <FiTrendingUp className="w-4 h-4 text-[#10B981]" />
    },
    {
      id: 'pdf-expenses',
      title: 'Operating Expenses Ledger',
      desc: 'Aggregate utility bills, wages, maintenance fees, and rents.',
      url: '/exports/pdf/?type=expenses',
      filename: 'expenses_report.pdf',
      icon: <FiDollarSign className="w-4 h-4 text-[#10B981]" />
    },
    {
      id: 'pdf-pl',
      title: 'Profit & Loss Statement',
      desc: 'Accrual margin audits displaying gross profit, COGS, and overheads.',
      url: '/exports/pdf/?type=pl',
      filename: 'profit_loss_statement.pdf',
      icon: <FiCalendar className="w-4 h-4 text-[#10B981]" />
    },
    {
      id: 'pdf-bs',
      title: 'Balance Sheet Statement',
      desc: 'Balance overview displaying assets, liabilities, and owner capital.',
      url: '/exports/pdf/?type=balance_sheet',
      filename: 'balance_sheet.pdf',
      icon: <FiCreditCard className="w-4 h-4 text-[#10B981]" />
    },
    {
      id: 'pdf-inventory',
      title: 'Inventory Stock Valuation',
      desc: 'Catalog stock items, unit costs, pricing margins, and total values.',
      url: '/exports/pdf/?type=inventory',
      filename: 'inventory_report.pdf',
      icon: <FiBox className="w-4 h-4 text-[#10B981]" />
    }
  ];

  const excelReports = [
    {
      id: 'xlsx-products',
      title: 'Inventory Asset Audit',
      desc: 'Excel worksheet displaying product stock levels, categories, and cost prices.',
      url: '/exports/excel/?type=products',
      filename: 'inventory_assets.xlsx',
      icon: <FiBox className="w-4 h-4 text-[#10B981]" />
    },
    {
      id: 'xlsx-expenses',
      title: 'Operating Expense logs',
      desc: 'Excel worksheet containing detailed utility billing and salary payouts.',
      url: '/exports/excel/?type=expenses',
      filename: 'operating_expenses.xlsx',
      icon: <FiDollarSign className="w-4 h-4 text-[#10B981]" />
    },
    {
      id: 'xlsx-suppliers',
      title: 'Supplier ledger accounts',
      desc: 'Excel worksheet containing trade payable details and outstanding due levels.',
      url: '/exports/excel/?type=suppliers',
      filename: 'suppliers_ledger.xlsx',
      icon: <FiUsers className="w-4 h-4 text-[#10B981]" />
    },
    {
      id: 'xlsx-pl',
      title: 'P&L Ledger Accounts',
      desc: 'Excel worksheet displaying business margins, gross profit, and cost of goods sold.',
      url: '/exports/excel/?type=pl',
      filename: 'profit_loss_sheet.xlsx',
      icon: <FiTrendingUp className="w-4 h-4 text-[#10B981]" />
    },
    {
      id: 'xlsx-bs',
      title: 'Balance Sheet Statement',
      desc: 'Excel worksheet displaying asset calculations, liabilities, and capital equity.',
      url: '/exports/excel/?type=balance_sheet',
      filename: 'balance_sheet.xlsx',
      icon: <FiCreditCard className="w-4 h-4 text-[#10B981]" />
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
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto bg-[#F8FAFC] text-[#111827] flex flex-col justify-start relative text-left">
      
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 leading-none">Report exports</h2>
        <p className="text-slate-505 text-xs sm:text-sm mt-1.5 font-medium font-medium">Download business accounting statements, ledger spreadsheets, and audit WhatsApp notification logs.</p>
      </div>

      {/* Tabs Switcher */}
      <div className="flex bg-slate-50 border border-slate-200 p-0.5 rounded-lg w-max flex gap-1 shadow-sm">
        <button
          onClick={() => setActiveTab('exports')}
          className={`px-4 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'exports'
              ? 'bg-white text-slate-900 border border-slate-200/50 shadow-sm'
              : 'text-slate-400 hover:text-slate-900'
          }`}
        >
          <FiFileText className="w-3.5 h-3.5" />
          <span>Exports Center</span>
        </button>
        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`px-4 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'whatsapp'
              ? 'bg-white text-slate-900 border border-slate-200/50 shadow-sm'
              : 'text-slate-400 hover:text-slate-900'
          }`}
        >
          <FiMessageSquare className="w-3.5 h-3.5" />
          <span>WhatsApp Logs</span>
        </button>
      </div>

      {activeTab === 'exports' ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Target Customer Ledger Selector Section */}
          <div className="bg-white border border-slate-200/60 rounded-lg p-6 shadow-sm space-y-4 max-w-2xl">
            <h3 className="font-semibold text-slate-900 text-sm flex items-center space-x-1.5">
              <FiUsers className="text-slate-400 w-4.5 h-4.5" />
              <span>Customer Ledger Statement Downloads</span>
            </h3>
            <p className="text-slate-400 text-xs font-medium">Select a customer profile to export their digital Khata transactions ledger logs.</p>

            {loading ? (
              <div className="h-10 bg-slate-100 rounded-lg animate-pulse"></div>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 focus:border-[#10B981] focus:bg-white rounded-lg py-2.5 px-3 text-xs sm:text-sm font-semibold text-slate-700 outline-none transition-all cursor-pointer flex-1"
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Outstanding: ₹{c.balance.toFixed(2)})
                    </option>
                  ))}
                </select>

                <div className="flex gap-2 font-semibold">
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
                    className="bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 text-white px-3.5 py-2.5 rounded-lg text-xs flex items-center space-x-1 shadow-sm active:scale-95 transition-all cursor-pointer"
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
                    className="bg-slate-900 hover:bg-slate-805 disabled:opacity-50 text-white px-3.5 py-2.5 rounded-lg text-xs flex items-center space-x-1 shadow-sm active:scale-95 transition-all cursor-pointer"
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
                <FiFileText className="w-4 h-4 text-slate-450" />
                <h3 className="font-semibold text-slate-900 text-sm uppercase tracking-wider text-[10px]">Official PDF Reports</h3>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {pdfReports.map((r) => (
                  <div 
                    key={r.id} 
                    className="bg-white border border-slate-200/60 rounded-lg p-5 flex items-center justify-between shadow-sm hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start space-x-3.5 text-left">
                      <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg shrink-0">
                        {r.icon}
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-semibold text-slate-900 text-xs sm:text-sm">{r.title}</h4>
                        <p className="text-slate-400 text-xs font-normal leading-relaxed max-w-xs">{r.desc}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownload(r.url, r.filename, r.id)}
                      disabled={downloading === r.id}
                      className="bg-white hover:bg-slate-50 text-slate-600 p-2 rounded-lg border border-slate-200 shadow-sm transition-all cursor-pointer active:scale-95 shrink-0"
                      title="Download PDF statement"
                    >
                      {downloading === r.id ? (
                        <div className="w-3.5 h-3.5 border-2 border-slate-650 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <FiDownload className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* EXCEL SECTION */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
                <FiFileText className="w-4 h-4 text-slate-450" />
                <h3 className="font-semibold text-slate-900 text-sm uppercase tracking-wider text-[10px]">Excel Spreadsheets</h3>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {excelReports.map((r) => (
                  <div 
                    key={r.id} 
                    className="bg-white border border-slate-200/60 rounded-lg p-5 flex items-center justify-between shadow-sm hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start space-x-3.5 text-left">
                      <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg shrink-0">
                        {r.icon}
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-semibold text-slate-900 text-xs sm:text-sm">{r.title}</h4>
                        <p className="text-slate-400 text-xs font-normal leading-relaxed max-w-xs">{r.desc}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownload(r.url, r.filename, r.id)}
                      disabled={downloading === r.id}
                      className="bg-white hover:bg-slate-50 text-slate-600 p-2 rounded-lg border border-slate-200 shadow-sm transition-all cursor-pointer active:scale-95 shrink-0"
                      title="Download Excel spreadsheet"
                    >
                      {downloading === r.id ? (
                        <div className="w-3.5 h-3.5 border-2 border-slate-650 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <FiDownload className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* Logs filtering */}
          <div className="bg-white border border-slate-200/60 rounded-lg p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            
            <div className="flex-1">
              <select
                value={logStatusFilter}
                onChange={(e) => setLogStatusFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#10B981] rounded-lg py-2 px-3 text-xs font-semibold text-slate-700 outline-none transition-all cursor-pointer"
              >
                <option value="">All Delivery Statuses</option>
                <option value="SUCCESS">Success</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>

            <div className="flex-1">
              <select
                value={logCustomerFilter}
                onChange={(e) => setLogCustomerFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#10B981] rounded-lg py-2 px-3 text-xs font-semibold text-slate-700 outline-none transition-all cursor-pointer"
              >
                <option value="">All Customers</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {(logStatusFilter || logCustomerFilter) && (
              <button
                onClick={() => { setLogStatusFilter(''); setLogCustomerFilter(''); }}
                className="text-rose-500 hover:text-rose-600 text-xs font-semibold cursor-pointer shrink-0"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Logs Directory */}
          {logsLoading ? (
            <div className="bg-white border border-slate-200/60 rounded-lg p-6 h-60 animate-pulse shadow-sm"></div>
          ) : whatsappLogs.length > 0 ? (
            <div className="bg-white border border-slate-200/60 rounded-lg overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/60 text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-50/50">
                      <th className="py-3 px-5">Recipient Customer</th>
                      <th className="py-3 px-5">Message Type</th>
                      <th className="py-3 px-5">Sent Date</th>
                      <th className="py-3 px-5">Status</th>
                      <th className="py-3 px-5">Error detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLogs.map((log) => (
                      <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors text-xs">
                        <td className="py-3.5 px-5 font-semibold text-slate-900 capitalize">
                          {log.customer_name || `Customer ID: ${log.customer}`}
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wide">
                            {log.message_type?.replace(/_/g, ' ') || 'Alert'}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-slate-400 font-mono">
                          {new Date(log.sent_at).toLocaleString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="py-3.5 px-5">
                          <span className={`inline-flex items-center gap-1 text-[9px] font-bold border px-2 py-0.5 rounded-full ${
                            log.status === 'SUCCESS' 
                              ? 'bg-emerald-50 text-[#10B981] border-emerald-100' 
                              : 'bg-rose-50 text-rose-600 border-rose-100'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-slate-400 font-normal truncate max-w-xs font-mono">
                          {log.error_message || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Logs pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
                  <button
                    type="button"
                    onClick={() => setLogCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={logCurrentPage === 1}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent rounded-lg cursor-pointer transition-all"
                  >
                    &larr; Previous
                  </button>
                  <span className="text-xs font-semibold text-slate-400 font-mono">
                    Page {logCurrentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setLogCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={logCurrentPage === totalPages}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent rounded-lg cursor-pointer transition-all"
                  >
                    Next &rarr;
                  </button>
                </div>
              )}

            </div>
          ) : (
            <div className="bg-white border border-slate-200/60 rounded-lg py-16 px-4 flex flex-col items-center justify-center space-y-3.5 text-center shadow-sm">
              <div className="bg-slate-50 p-3 rounded-lg text-slate-350">
                <FiMessageSquare className="w-6 h-6" />
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">No WhatsApp communication logs logged in the audit database.</p>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default AdvancedReports;
