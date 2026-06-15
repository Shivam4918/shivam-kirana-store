import { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  FiFileText, FiDownload, FiUsers, FiBox, FiTrendingUp, FiCreditCard, FiDollarSign, FiCalendar 
} from 'react-icons/fi';

const AdvancedReports = () => {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);

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

  useEffect(() => {
    fetchCustomers();
  }, []);

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

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto bg-slate-50/50 text-[#111827] flex flex-col justify-start relative text-left">
      
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-poppins font-extrabold text-secondary">Export Center</h2>
        <p className="text-[#6B7280] text-xs sm:text-sm">Download official accounting statements, ledger bills, and inventory logs in PDF or Excel.</p>
      </div>

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
  );
};

export default AdvancedReports;
