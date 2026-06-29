import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import {
  FiAlertTriangle, FiClock, FiCheckCircle, FiPackage, FiPlus,
  FiTrash2, FiEdit2, FiX, FiRefreshCw, FiAlertCircle, FiZap, FiCalendar
} from 'react-icons/fi';

// ─── Helpers ───────────────────────────────────────────────────────────────
const getExpiryStatus = (expiryDateStr) => {
  if (!expiryDateStr) return { label: 'NO DATE', color: 'slate', days: null };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDateStr);
  const days = Math.round((exp - today) / 86400000);
  if (days < 0) return { label: 'EXPIRED', color: 'rose', days };
  if (days <= 7) return { label: `Expires in ${days}d`, color: 'amber', days };
  if (days <= 30) return { label: `Expires in ${days}d`, color: 'orange', days };
  return { label: `OK (${days}d)`, color: 'emerald', days };
};

const StatusBadge = ({ status }) => {
  const colorMap = {
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    slate: 'bg-slate-50 text-slate-500 border-slate-200',
  };
  const dotMap = {
    rose: 'bg-rose-500', amber: 'bg-amber-500', orange: 'bg-orange-400',
    emerald: 'bg-emerald-500', slate: 'bg-slate-400',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-bold border px-2 py-0.5 rounded-full ${colorMap[status.color]}`}>
      <span className={`w-1 h-1 rounded-full ${dotMap[status.color]}`}></span>
      {status.label}
    </span>
  );
};

// ─── Summary Card ───────────────────────────────────────────────────────────
const SummaryCard = ({ icon: Icon, label, value, sub, color, onClick, active }) => {
  const palette = {
    rose: { bg: 'bg-white border-slate-200/60', text: 'text-rose-600', val: 'text-rose-700', iconBg: 'bg-rose-50/50' },
    amber: { bg: 'bg-white border-slate-200/60', text: 'text-amber-600', val: 'text-amber-700', iconBg: 'bg-amber-50/50' },
    emerald: { bg: 'bg-white border-slate-200/60', text: 'text-emerald-600', val: 'text-emerald-700', iconBg: 'bg-emerald-50/50' },
    slate: { bg: 'bg-white border-slate-200/60', text: 'text-slate-500', val: 'text-slate-700', iconBg: 'bg-slate-50' },
  };
  const p = palette[color] || palette.slate;
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-lg border p-5 transition-all cursor-pointer hover:border-slate-350 ${p.bg} ${active ? 'ring-2 ring-offset-1 ring-amber-400 shadow-sm' : 'shadow-sm'}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${p.iconBg}`}>
          <Icon className={`w-4 h-4 ${p.text}`} />
        </div>
        <span className={`text-2xl font-semibold font-mono ${p.val}`}>{value}</span>
      </div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      {sub && <p className="text-[10px] text-slate-405 font-medium mt-0.5">{sub}</p>}
    </button>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────
const ExpiryManager = () => {
  const [dashboard, setDashboard] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL');  // ALL | EXPIRED | EXPIRING_SOON | OK
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Batch modal
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchMode, setBatchMode] = useState('add'); // 'add' | 'edit'
  const [editingBatch, setEditingBatch] = useState(null);
  const [batchProductId, setBatchProductId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [batchMfgDate, setBatchMfgDate] = useState('');
  const [batchExpiryDate, setBatchExpiryDate] = useState('');
  const [batchQuantity, setBatchQuantity] = useState('');
  const [batchNotes, setBatchNotes] = useState('');
  const [batchSaving, setBatchSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, prodRes] = await Promise.all([
        api.get('/admin/expiry-dashboard/'),
        api.get('/products/'),
      ]);
      setDashboard(dashRes.data);
      setProducts(prodRes.data);
    } catch (err) {
      console.error('Expiry fetch error:', err);
      setErrorMsg('Failed to load expiry data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleTriggerScan = async () => {
    setScanning(true);
    setScanResult(null);
    setErrorMsg('');
    try {
      const res = await api.post('/admin/expiry-scan/');
      setScanResult(res.data);
      setSuccessMsg('Expiry scan completed! Notifications sent to admin bell.');
      fetchData();
    } catch (err) {
      setErrorMsg('Expiry scan failed. ' + (err.response?.data?.detail || ''));
    } finally {
      setScanning(false);
    }
  };

  const handleDeleteBatch = async (batchId) => {
    if (!window.confirm('Delete this expiry batch record?')) return;
    try {
      await api.delete(`/admin/expiry-batches/${batchId}/`);
      setSuccessMsg('Batch deleted.');
      fetchData();
    } catch {
      setErrorMsg('Failed to delete batch.');
    }
  };

  const openAddBatch = (productId = '') => {
    setBatchMode('add');
    setEditingBatch(null);
    setBatchProductId(productId ? String(productId) : '');
    setBatchNumber('');
    setBatchMfgDate('');
    setBatchExpiryDate('');
    setBatchQuantity('');
    setBatchNotes('');
    setShowBatchModal(true);
  };

  const openEditBatch = (batch) => {
    setBatchMode('edit');
    setEditingBatch(batch);
    setBatchProductId(String(batch.product));
    setBatchNumber(batch.batch_number || '');
    setBatchMfgDate(batch.manufacture_date || '');
    setBatchExpiryDate(batch.expiry_date || '');
    setBatchQuantity(String(batch.quantity));
    setBatchNotes(batch.notes || '');
    setShowBatchModal(true);
  };

  const handleSaveBatch = async (e) => {
    e.preventDefault();
    if (!batchProductId || !batchExpiryDate) {
      setErrorMsg('Product and expiry date are required.');
      return;
    }
    setBatchSaving(true);
    setErrorMsg('');
    const payload = {
      product: parseInt(batchProductId),
      batch_number: batchNumber || null,
      manufacture_date: batchMfgDate || null,
      expiry_date: batchExpiryDate,
      quantity: parseInt(batchQuantity) || 0,
      notes: batchNotes || null,
    };
    try {
      if (batchMode === 'add') {
        await api.post('/admin/expiry-batches/', payload);
        setSuccessMsg('Batch added successfully!');
      } else {
        await api.put(`/admin/expiry-batches/${editingBatch.id}/`, payload);
        setSuccessMsg('Batch updated successfully!');
      }
      setShowBatchModal(false);
      fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to save batch.');
    } finally {
      setBatchSaving(false);
    }
  };

  const allBatches = dashboard?.all_batches || [];
  const filteredBatches = allBatches.filter(b => {
    if (activeTab === 'ALL') return true;
    return b.expiry_status === activeTab;
  });

  const tabs = [
    { id: 'ALL', label: 'All Batches', count: allBatches.length },
    { id: 'EXPIRED', label: 'Expired', count: allBatches.filter(b => b.expiry_status === 'EXPIRED').length },
    { id: 'EXPIRING_SOON', label: 'Expiring Soon (≤7d)', count: allBatches.filter(b => b.expiry_status === 'EXPIRING_SOON').length },
    { id: 'EXPIRING_MONTH', label: 'Within 30 Days', count: allBatches.filter(b => b.expiry_status === 'EXPIRING_MONTH').length },
    { id: 'OK', label: 'OK', count: allBatches.filter(b => b.expiry_status === 'OK').length },
  ];

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto bg-[#F8FAFC] text-[#111827] flex flex-col text-left">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 leading-none flex items-center gap-2">
            <FiClock className="w-5 h-5 text-amber-500" />
            Expiry Manager
          </h2>
          <p className="text-slate-550 text-xs sm:text-sm mt-1.5 font-medium">Track product shelf life, manage lot batches, and run automated expiry alerts.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-semibold px-3 py-2 rounded-lg shadow-sm transition-all cursor-pointer text-xs active:scale-95"
          >
            <FiRefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => openAddBatch()}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold px-3 py-2 rounded-lg shadow-sm transition-all cursor-pointer text-xs active:scale-95"
          >
            <FiPlus className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Add Batch</span>
          </button>
          <button
            onClick={handleTriggerScan}
            disabled={scanning}
            className="flex items-center gap-1.5 bg-[#10B981] hover:bg-[#059669] text-white font-semibold px-3 py-2 rounded-lg shadow-sm transition-all cursor-pointer text-xs active:scale-95 disabled:opacity-50"
          >
            <FiZap className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
            <span>{scanning ? 'Scanning...' : 'Run Scan'}</span>
          </button>
        </div>
      </div>

      {/* ── Alerts ── */}
      {successMsg && (
        <div className="bg-emerald-50/50 border border-emerald-105 text-emerald-700 p-3.5 rounded-lg text-xs flex items-center gap-2 font-medium">
          <FiCheckCircle className="w-4 h-4 shrink-0 text-[#10B981]" />
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="ml-auto cursor-pointer"><FiX className="w-4 h-4" /></button>
        </div>
      )}
      {errorMsg && (
        <div className="bg-rose-50/50 border border-rose-100 text-rose-700 p-3.5 rounded-lg text-xs flex items-center gap-2 font-medium">
          <FiAlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="ml-auto cursor-pointer"><FiX className="w-4 h-4" /></button>
        </div>
      )}

      {/* ── Scan Result ── */}
      {scanResult && (
        <div className="bg-slate-900 border border-slate-800 text-slate-100 p-4 rounded-lg text-xs font-mono">
          <p className="text-[#10B981] font-bold mb-2">✓ Expiry Scan Summary</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><span className="text-slate-400">Expired Products</span><br /><span className="text-rose-400 font-bold text-lg">{scanResult.summary?.expired_products ?? scanResult.expired_products ?? '—'}</span></div>
            <div><span className="text-slate-400">Expiring Soon</span><br /><span className="text-amber-400 font-bold text-lg">{scanResult.summary?.expiring_soon_products ?? scanResult.expiring_soon_products ?? '—'}</span></div>
            <div><span className="text-slate-400">Expired Batches</span><br /><span className="text-rose-400 font-bold text-lg">{scanResult.summary?.expired_batches ?? scanResult.expired_batches ?? '—'}</span></div>
            <div><span className="text-slate-400">Notifications Sent</span><br /><span className="text-emerald-400 font-bold text-lg">{scanResult.summary?.notifications_created ?? scanResult.notifications_created ?? '—'}</span></div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-white border border-slate-200/60 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* ── Summary Cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <SummaryCard
              icon={FiAlertTriangle}
              label="Expired Products"
              value={dashboard?.summary?.products?.expired ?? 0}
              sub="Remove from shelves"
              color="rose"
              onClick={() => setActiveTab('EXPIRED')}
              active={activeTab === 'EXPIRED'}
            />
            <SummaryCard
              icon={FiClock}
              label="Expiring ≤7 Days"
              value={(dashboard?.summary?.products?.expiring_soon ?? 0) + (dashboard?.summary?.batches?.expiring_soon ?? 0)}
              sub="Action required soon"
              color="amber"
              onClick={() => setActiveTab('EXPIRING_SOON')}
              active={activeTab === 'EXPIRING_SOON'}
            />
            <SummaryCard
              icon={FiPackage}
              label="Total Batches"
              value={allBatches.length}
              sub="All lot records"
              color="slate"
              onClick={() => setActiveTab('ALL')}
              active={activeTab === 'ALL'}
            />
            <SummaryCard
              icon={FiCheckCircle}
              label="OK Products"
              value={dashboard?.summary?.products?.ok ?? 0}
              sub="More than 30 days left"
              color="emerald"
              onClick={() => setActiveTab('OK')}
              active={activeTab === 'OK'}
            />
          </div>

          {/* ── Product-Level Expiry Alerts ── */}
          {((dashboard?.expired_products?.length ?? 0) + (dashboard?.expiring_soon_products?.length ?? 0)) > 0 && (
            <div className="bg-white border border-slate-200/60 rounded-lg overflow-hidden shadow-sm animate-in fade-in duration-200">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                  <FiAlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>Product-Level Expiry Alerts</span>
                </h3>
                <span className="text-[10px] text-slate-400">Items needing immediate attention</span>
              </div>
              <div className="divide-y divide-slate-100">
                {[...(dashboard?.expired_products || []), ...(dashboard?.expiring_soon_products || [])].map(p => {
                  const status = getExpiryStatus(p.expiry_date);
                  return (
                    <div key={`prod-${p.id}`} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/50 flex items-center justify-center">
                          <FiPackage className="w-4 h-4 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-xs sm:text-sm text-slate-900">{p.name}</p>
                          <p className="text-[10px] text-slate-400">{p.category || 'General'} · {p.stock_quantity} units in stock</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-550 font-mono">{p.expiry_date}</span>
                        <StatusBadge status={status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Batch Records Table ── */}
          <div className="bg-white border border-slate-200/60 rounded-lg overflow-hidden shadow-sm">
            {/* Tab bar */}
            <div className="flex items-center gap-1 px-6 pt-4 border-b border-slate-100 overflow-x-auto pb-0">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-[10px] font-semibold whitespace-nowrap cursor-pointer transition-all border-b-2 ${
                    activeTab === tab.id
                      ? 'border-amber-500 text-amber-600 bg-amber-50/30'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                    activeTab === tab.id ? 'bg-amber-100 text-amber-700 font-mono' : 'bg-slate-100 text-slate-500 font-mono'
                  }`}>{tab.count}</span>
                </button>
              ))}
              <button
                onClick={() => openAddBatch()}
                className="ml-auto flex items-center gap-1 bg-[#10B981] hover:bg-[#059669] text-white px-3 py-1.5 rounded-lg text-[10px] font-semibold cursor-pointer transition-all active:scale-95 mb-1"
              >
                <FiPlus className="w-3.5 h-3.5" />
                <span>New Batch</span>
              </button>
            </div>

            {filteredBatches.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-2.5 text-center">
                <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center">
                  <FiClock className="w-5 h-5 text-slate-350" />
                </div>
                <p className="text-slate-500 text-xs sm:text-sm font-medium">No batch records for this filter.</p>
                <button onClick={() => openAddBatch()} className="text-amber-600 text-xs font-semibold hover:underline cursor-pointer">+ Add first batch</button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-50/50 border-b border-slate-200/60">
                      <th className="py-3 px-5">Product</th>
                      <th className="py-3 px-5">Batch #</th>
                      <th className="py-3 px-5">Mfg Date</th>
                      <th className="py-3 px-5">Expiry Date</th>
                      <th className="py-3 px-5">Status</th>
                      <th className="py-3 px-5 text-right">Qty</th>
                      <th className="py-3 px-5">Notes</th>
                      <th className="py-3 px-5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBatches.map(batch => {
                      const status = getExpiryStatus(batch.expiry_date);
                      return (
                        <tr
                          key={batch.id}
                          className={`border-b border-slate-100 hover:bg-slate-50/50 transition-colors text-xs ${
                            status.color === 'rose' ? 'bg-rose-50/10' :
                            status.color === 'amber' ? 'bg-amber-50/10' : ''
                          }`}
                        >
                          <td className="py-3.5 px-5">
                            <div>
                              <p className="font-semibold text-slate-905 text-xs sm:text-sm capitalize">{batch.product_name}</p>
                              <p className="text-[9.5px] text-slate-400">{batch.product_category || 'General'}</p>
                            </div>
                          </td>
                          <td className="py-3.5 px-5">
                            {batch.batch_number ? (
                              <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                                {batch.batch_number}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[10px]">Unassigned</span>
                            )}
                          </td>
                          <td className="py-3.5 px-5 text-slate-500 font-mono">{batch.manufacture_date || '—'}</td>
                          <td className="py-3.5 px-5 font-bold font-mono text-slate-800">{batch.expiry_date}</td>
                          <td className="py-3.5 px-5"><StatusBadge status={status} /></td>
                          <td className="py-3.5 px-5 text-right font-semibold font-mono text-slate-700">{batch.quantity}</td>
                          <td className="py-3.5 px-5 max-w-xs">
                            <span className="text-[10px] text-slate-405 font-medium line-clamp-1">{batch.notes || '—'}</span>
                          </td>
                          <td className="py-3.5 px-5">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => openEditBatch(batch)}
                                className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-700 border border-slate-200 transition-all cursor-pointer shadow-sm"
                                title="Edit batch"
                              >
                                <FiEdit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteBatch(batch.id)}
                                className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 transition-all cursor-pointer shadow-sm"
                                title="Delete batch"
                              >
                                <FiTrash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Add/Edit Batch Modal ── */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-lg relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowBatchModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
            >
              <FiX className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-amber-50 rounded-lg border border-amber-100">
                <FiCalendar className="w-4.5 h-4.5 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-950 tracking-tight">
                {batchMode === 'add' ? 'Add Expiry Batch' : 'Edit Batch Record'}
              </h3>
            </div>

            <form onSubmit={handleSaveBatch} className="space-y-4 text-left font-medium">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Product *</label>
                <select
                  value={batchProductId}
                  onChange={(e) => setBatchProductId(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-amber-400 rounded-lg py-2.5 px-2.5 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-amber-500/10 outline-none transition-all cursor-pointer font-medium"
                  required
                >
                  <option value="">Select a product...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Batch / Lot Number</label>
                <input
                  type="text"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-amber-400 rounded-lg py-2.5 px-3 text-xs sm:text-sm font-mono text-slate-900 focus:ring-2 focus:ring-amber-500/10 outline-none transition-all"
                  placeholder="e.g. LOT-2024-001"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Manufacture Date</label>
                  <input
                    type="date"
                    value={batchMfgDate}
                    onChange={(e) => setBatchMfgDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-amber-400 rounded-lg py-2.5 px-3 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-amber-500/10 outline-none transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Expiry Date *</label>
                  <input
                    type="date"
                    value={batchExpiryDate}
                    onChange={(e) => setBatchExpiryDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-amber-400 rounded-lg py-2.5 px-3 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-amber-500/10 outline-none transition-all font-mono"
                    required
                  />
                  {batchExpiryDate && (() => {
                    const s = getExpiryStatus(batchExpiryDate);
                    const cls = s.color === 'rose' ? 'text-rose-500' : s.color === 'amber' ? 'text-amber-500' : 'text-emerald-500';
                    return <p className={`mt-1 text-[10px] font-semibold ${cls}`}>{s.label}</p>;
                  })()}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Quantity in this Batch</label>
                <input
                  type="number"
                  min="0"
                  value={batchQuantity}
                  onChange={(e) => setBatchQuantity(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-amber-400 rounded-lg py-2.5 px-3 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-amber-500/10 outline-none transition-all font-mono"
                  placeholder="e.g. 24"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Notes</label>
                <textarea
                  value={batchNotes}
                  onChange={(e) => setBatchNotes(e.target.value)}
                  rows="2"
                  className="w-full bg-white border border-slate-200 focus:border-amber-400 rounded-lg py-2.5 px-3 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-amber-500/10 outline-none transition-all resize-none"
                  placeholder="Optional notes about this batch..."
                />
              </div>

              {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-600 p-3 rounded-lg text-xs flex items-center gap-2">
                  <FiAlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="w-1/2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-505 font-semibold py-2.5 px-4 rounded-lg transition-colors cursor-pointer text-xs sm:text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={batchSaving}
                  className="w-1/2 bg-amber-550 hover:bg-amber-600 text-white font-semibold py-2.5 px-4 rounded-lg shadow-sm active:scale-[0.98] transition-colors cursor-pointer text-xs sm:text-sm disabled:opacity-60"
                >
                  {batchSaving ? 'Saving...' : batchMode === 'add' ? 'Add Batch' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpiryManager;
