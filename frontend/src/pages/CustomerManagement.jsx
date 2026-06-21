import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { 
  FiSearch, FiUser, FiPhone, FiMail, FiLock, FiUnlock, 
  FiPlus, FiCalendar, FiX, FiArrowUpRight, FiArrowDownLeft, FiBookOpen, FiAlertCircle, FiCheckCircle,
  FiEdit2, FiSliders, FiSave, FiSend
} from 'react-icons/fi';

const CustomerManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected customer profile detail
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Modals
  const [showTxModal, setShowTxModal] = useState(false);
  
  // New transaction form states
  const [txType, setTxType] = useState('CREDIT'); // CREDIT or DEBIT
  const [txAmount, setTxAmount] = useState('');
  const [txDescription, setTxDescription] = useState('');
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const productDropdownRef = useRef(null);

  // Alerts
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Credit limit editing
  const [showLimitEditor, setShowLimitEditor] = useState(false);
  const [limitInput, setLimitInput] = useState('');
  const [limitLoading, setLimitLoading] = useState(false);
  const [whatsappLoading, setWhatsappLoading] = useState(false);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products/');
      setProducts(res.data);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const fetchCustomers = async (query = '') => {
    setLoading(true);
    try {
      const url = query ? `/admin/customers/?search=${query}` : '/admin/customers/';
      const res = await api.get(url);
      setCustomers(res.data);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateTxDetails = (productId, qty, type) => {
    if (productId) {
      const product = products.find(p => p.id === parseInt(productId));
      if (product) {
        const amount = (parseFloat(product.price) * qty).toFixed(2);
        setTxAmount(amount);
        if (type === 'CREDIT') {
          setTxDescription(`Bought ${qty}x ${product.name} @ ₹${parseFloat(product.price).toFixed(2)}/unit`);
        } else {
          setTxDescription(`Returned ${qty}x ${product.name} @ ₹${parseFloat(product.price).toFixed(2)}/unit`);
        }
      }
    }
  };

  const handleProductChange = (productId) => {
    setSelectedProductId(productId);
    updateTxDetails(productId, quantity, txType);
  };

  const handleQuantityChange = (qtyVal) => {
    setQuantity(qtyVal);
    const qty = Math.max(1, parseInt(qtyVal) || 1);
    updateTxDetails(selectedProductId, qty, txType);
  };

  const handleTypeChange = (type) => {
    setTxType(type);
    updateTxDetails(selectedProductId, Math.max(1, parseInt(quantity) || 1), type);
  };

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const openTxModal = () => {
    setSelectedProductId('');
    setQuantity(1);
    setTxAmount('');
    setTxDescription('');
    setTxType('CREDIT');
    setErrorMsg('');
    setProductSearchQuery('');
    setIsDropdownOpen(false);
    setShowTxModal(true);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCustomers(searchQuery);
  };

  const fetchCustomerDetail = async (id) => {
    setDetailLoading(true);
    setErrorMsg('');
    try {
      const res = await api.get(`/admin/customers/${id}/`);
      setSelectedProfile(res.data);
    } catch (err) {
      console.error('Error fetching customer profile:', err);
      setErrorMsg('Failed to load profile details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleToggleAccess = async (profileId, currentStatus) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await api.post(`/admin/customers/${profileId}/toggle-access/`, {
        is_accessible: !currentStatus
      });
      setSuccessMsg(`Visibility access for ${res.data.name} updated successfully.`);
      
      // Update local states
      setCustomers(prev => prev.map(c => c.id === profileId ? { ...c, is_accessible: !currentStatus } : c));
      if (selectedProfile && selectedProfile.id === profileId) {
        setSelectedProfile(prev => ({ ...prev, is_accessible: !currentStatus }));
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Access toggling failed.');
    }
  };

  const handleAddTransactionSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!txAmount || parseFloat(txAmount) <= 0) {
      setErrorMsg('Transaction amount must be a positive number.');
      return;
    }

    if (selectedProductId) {
      const product = products.find(p => p.id === parseInt(selectedProductId));
      if (!product) {
        setErrorMsg('Selected product does not exist.');
        return;
      }
      if (!quantity || parseInt(quantity) <= 0) {
        setErrorMsg('Quantity must be a positive integer.');
        return;
      }
      if (txType === 'CREDIT' && parseInt(quantity) > product.stock_quantity) {
        setErrorMsg(`Quantity (${quantity}) exceeds available stock (${product.stock_quantity}) for ${product.name}.`);
        return;
      }
    }

    try {
      const res = await api.post(`/admin/customers/${selectedProfile.id}/add-transaction/`, {
        transaction_type: txType,
        amount: parseFloat(txAmount),
        description: txDescription,
        product: selectedProductId ? parseInt(selectedProductId) : null,
        quantity: selectedProductId ? parseInt(quantity) : null
      });

      setSuccessMsg(res.data.detail);
      setShowTxModal(false);
      
      // Clear forms
      setTxAmount('');
      setTxDescription('');
      setTxType('CREDIT');
      setSelectedProductId('');
      setQuantity(1);
      setProductSearchQuery('');
      setIsDropdownOpen(false);

      // Refresh data
      fetchCustomers(searchQuery);
      fetchCustomerDetail(selectedProfile.id);
      fetchProducts();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || 'Transaction failed. Check inputs.');
    }
  };

  const handleUpdateCreditLimit = async () => {
    if (!selectedProfile) return;
    const newLimit = parseFloat(limitInput);
    if (isNaN(newLimit) || newLimit < 0) {
      setErrorMsg('Credit limit must be a valid non-negative number.');
      return;
    }
    setLimitLoading(true);
    setErrorMsg('');
    try {
      const res = await api.patch(`/admin/customers/${selectedProfile.id}/update-limit/`, {
        credit_limit: newLimit
      });
      const updated = res.data;
      setSelectedProfile(prev => ({
        ...prev,
        credit_limit: updated.credit_limit,
        available_credit: updated.available_credit,
        utilization_pct: updated.utilization_pct,
      }));
      setCustomers(prev => prev.map(c =>
        c.id === selectedProfile.id
          ? { ...c, credit_limit: updated.credit_limit, available_credit: updated.available_credit, utilization_pct: updated.utilization_pct }
          : c
      ));
      setSuccessMsg(`Credit limit for ${updated.name} updated to ₹${updated.credit_limit.toFixed(2)}.`);
      setShowLimitEditor(false);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to update credit limit.');
    } finally {
      setLimitLoading(false);
    }
  };

  const handleSendWhatsApp = async (type) => {
    if (!selectedProfile) return;
    setWhatsappLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await api.post(`/admin/customers/${selectedProfile.id}/send-whatsapp-reminder/`, {
        message_type: type
      });
      setSuccessMsg(res.data.detail);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || 'Failed to dispatch WhatsApp alert.');
    } finally {
      setWhatsappLoading(false);
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto bg-slate-50/50 text-[#111827] flex flex-col justify-start relative text-left">
      
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-poppins font-extrabold text-secondary">Customer Ledgers (Khata Book)</h2>
        <p className="text-[#6B7280] text-xs sm:text-sm">Audit client outstanding credit limits, clear payments, record orders, and lock/unlock digital access.</p>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="bg-emerald-55 border border-emerald-200 text-emerald-600 p-3.5 rounded-2xl text-xs flex items-center space-x-2 font-medium">
          <FiCheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-250 text-rose-600 p-3.5 rounded-2xl text-xs flex items-center space-x-2 font-medium">
          <FiAlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Customer directory list */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <FiSearch className="w-4.5 h-4.5" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by customer name, email, or phone..."
                className="w-full bg-white border border-slate-200 focus:border-primary rounded-xl py-2 pl-9 pr-4 text-xs sm:text-sm text-text-primary placeholder-slate-400 outline-none transition-all focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <button
              type="submit"
              className="bg-white hover:bg-slate-50 text-secondary border border-slate-200 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer active:scale-95"
            >
              Search
            </button>
          </form>

          {/* Directory table card */}
          {loading ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 h-60 animate-pulse shadow-sm"></div>
          ) : customers.length > 0 ? (
            <div className="bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-150 text-[10px] uppercase font-bold tracking-wider text-[#6B7280] bg-slate-50/70">
                      <th className="py-4 px-6">Customer</th>
                      <th className="py-4 px-6 text-right">Balance Due</th>
                      <th className="py-4 px-6 text-center">Khata access</th>
                      <th className="py-4 px-6 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c) => (
                      <tr 
                        key={c.id} 
                        className={`border-b border-slate-100 hover:bg-slate-50/50 cursor-pointer transition-colors text-xs sm:text-sm ${
                          selectedProfile?.id === c.id ? 'bg-emerald-50/40 border-l-4 border-l-primary font-medium' : ''
                        }`}
                        onClick={() => fetchCustomerDetail(c.id)}
                      >
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-bold text-secondary capitalize leading-snug">{c.name}</p>
                            <p className="text-[10px] text-text-secondary mt-0.5">{c.phone || 'No phone verified'}</p>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right font-extrabold text-sm">
                          <span className={c.balance > 0 ? 'text-rose-600' : 'text-slate-500'}>
                            ₹{c.balance.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleToggleAccess(c.id, c.is_accessible)}
                            className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[9px] font-extrabold border uppercase tracking-wider transition-all cursor-pointer ${
                              c.is_accessible 
                                ? 'bg-emerald-55 text-primary border-emerald-100 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100' 
                                : 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-emerald-55 hover:text-primary hover:border-emerald-100'
                            }`}
                            title={c.is_accessible ? "Click to Lock ledger access" : "Click to Unlock ledger access"}
                          >
                            {c.is_accessible ? (
                              <>
                                <FiUnlock className="w-3 h-3" />
                                <span>Unlocked</span>
                              </>
                            ) : (
                              <>
                                <FiLock className="w-3 h-3" />
                                <span>Locked</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <button
                            className="text-primary hover:text-primary-hover text-xs font-bold underline cursor-pointer"
                            onClick={() => fetchCustomerDetail(c.id)}
                          >
                            View details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl py-12 px-4 flex flex-col items-center justify-center space-y-3.5 text-center shadow-sm">
              <div className="bg-slate-50 p-4 rounded-full text-slate-350">
                <FiUser className="w-8 h-8" />
              </div>
              <p className="text-xs sm:text-sm text-text-secondary">No customer records matching the active search.</p>
            </div>
          )}
        </div>

        {/* Right detailed customer view */}
        <div className="lg:col-span-5">
          {detailLoading ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 h-80 animate-pulse shadow-sm animate-pulse"></div>
          ) : selectedProfile ? (
            <div className="bg-white border border-slate-200/60 rounded-3xl p-6 space-y-6 shadow-sm relative animate-in fade-in slide-in-from-right-4 duration-250">
              
              {/* Profile details */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base sm:text-lg font-poppins font-extrabold text-secondary capitalize leading-none">{selectedProfile.name}</h3>
                  <span className="text-[10px] text-text-secondary font-medium tracking-wide mt-1 block">Khata Ledger Account Audit</span>
                </div>
                
                <button
                  onClick={() => handleToggleAccess(selectedProfile.id, selectedProfile.is_accessible)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-[10.5px] font-extrabold tracking-wider uppercase transition-all cursor-pointer ${
                    selectedProfile.is_accessible
                      ? 'bg-emerald-55 text-primary border-emerald-100'
                      : 'bg-rose-50 text-rose-600 border-rose-100'
                  }`}
                >
                  {selectedProfile.is_accessible ? (
                    <>
                      <FiUnlock className="w-3.5 h-3.5" />
                      <span>Unlocked</span>
                    </>
                  ) : (
                    <>
                      <FiLock className="w-3.5 h-3.5" />
                      <span>Locked</span>
                    </>
                  )}
                </button>
              </div>

              {/* Contacts */}
              <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-100 text-xs text-text-secondary">
                <div className="flex items-center space-x-2">
                  <FiPhone className="text-slate-400 w-4 h-4 shrink-0" />
                  <span className="truncate font-semibold">{selectedProfile.phone || 'No phone verified'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FiMail className="text-slate-400 w-4 h-4 shrink-0" />
                  <span className="truncate font-semibold">{selectedProfile.email}</span>
                </div>
              </div>

              {/* WhatsApp Alerts */}
              {selectedProfile.phone && (
                <div className="flex items-center justify-between py-2.5 px-3 bg-slate-50 border border-slate-200/50 rounded-2xl">
                  <div className="flex items-center space-x-2">
                    <FiSend className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">WhatsApp Alerts</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleSendWhatsApp('PAYMENT_REMINDER')}
                      disabled={whatsappLoading}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 text-[10px] font-extrabold px-3 py-1.5 rounded-xl tracking-wider transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                    >
                      {whatsappLoading ? 'Sending…' : 'Send Reminder'}
                    </button>
                    <button
                      onClick={() => handleSendWhatsApp('STATEMENT')}
                      disabled={whatsappLoading}
                      className="bg-slate-100 hover:bg-slate-200 text-secondary border border-slate-200 text-[10px] font-extrabold px-3 py-1.5 rounded-xl tracking-wider transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                    >
                      {whatsappLoading ? 'Sending…' : 'Send Statement'}
                    </button>
                  </div>
                </div>
              )}

              {/* Balance metric tags */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3">
                  <span className="text-[9.5px] font-bold text-text-secondary uppercase tracking-wider block mb-1">Debt Due</span>
                  <span className={`text-sm font-extrabold leading-none block ${selectedProfile.balance > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                    ₹{selectedProfile.balance.toFixed(2)}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3">
                  <span className="text-[9.5px] font-bold text-text-secondary uppercase tracking-wider block mb-1">Total credit</span>
                  <span className="text-sm font-extrabold text-secondary leading-none block">
                    ₹{selectedProfile.total_credit.toFixed(2)}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3">
                  <span className="text-[9.5px] font-bold text-text-secondary uppercase tracking-wider block mb-1">Total Settled</span>
                  <span className="text-sm font-extrabold text-primary leading-none block">
                    ₹{selectedProfile.total_paid.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Credit Limit Utilization */}
              {selectedProfile.credit_limit !== undefined && (
                <div className="bg-gradient-to-br from-slate-50 to-emerald-50/30 border border-slate-200/70 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FiSliders className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[10.5px] font-extrabold text-secondary uppercase tracking-wider">Credit Limit</span>
                    </div>
                    <button
                      onClick={() => {
                        setLimitInput(selectedProfile.credit_limit?.toFixed(2) || '10000.00');
                        setShowLimitEditor(v => !v);
                      }}
                      className="flex items-center space-x-1 text-[10px] font-bold text-primary hover:text-primary-hover transition-colors cursor-pointer"
                    >
                      <FiEdit2 className="w-3 h-3" />
                      <span>Edit Limit</span>
                    </button>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-[10px] font-semibold text-text-secondary mb-1.5">
                      <span>Used: ₹{(selectedProfile.balance || 0).toFixed(2)}</span>
                      <span>Limit: ₹{(selectedProfile.credit_limit || 0).toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          (selectedProfile.utilization_pct || 0) >= 100
                            ? 'bg-red-500'
                            : (selectedProfile.utilization_pct || 0) >= 80
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, selectedProfile.utilization_pct || 0)}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center mt-1.5">
                      <span className={`text-[10px] font-bold ${
                        (selectedProfile.utilization_pct || 0) >= 80 ? 'text-amber-600' : 'text-emerald-600'
                      }`}>
                        {(selectedProfile.utilization_pct || 0).toFixed(1)}% used
                      </span>
                      <span className="text-[10px] font-semibold text-text-secondary">
                        ₹{(selectedProfile.available_credit || 0).toFixed(2)} available
                      </span>
                    </div>
                  </div>

                  {/* Inline limit editor */}
                  {showLimitEditor && (
                    <div className="border-t border-slate-200 pt-3 flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={limitInput}
                        onChange={e => setLimitInput(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 focus:border-primary rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
                        placeholder="New credit limit (₹)"
                      />
                      <button
                        onClick={handleUpdateCreditLimit}
                        disabled={limitLoading}
                        className="flex items-center space-x-1.5 bg-primary hover:bg-primary-hover text-white px-3 py-2 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-60 transition-all active:scale-95"
                      >
                        <FiSave className="w-3.5 h-3.5" />
                        <span>{limitLoading ? 'Saving…' : 'Save'}</span>
                      </button>
                      <button
                        onClick={() => setShowLimitEditor(false)}
                        className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-500 cursor-pointer transition-all"
                      >
                        <FiX className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Ledger Action Trigger */}
              <button
                onClick={openTxModal}
                className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-sm hover:shadow-md cursor-pointer text-xs sm:text-sm transition-all active:scale-98"
              >
                <FiPlus className="w-4.5 h-4.5" />
                <span>Add Ledger Entry</span>
              </button>

              {/* Individual past transactions table */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-secondary text-xs uppercase tracking-wider">Ledger Statement Book</h4>
                
                {selectedProfile.transactions && selectedProfile.transactions.length > 0 ? (
                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    {[...selectedProfile.transactions]
                      .sort((a, b) => {
                        const dateDiff = new Date(b.created_at) - new Date(a.created_at);
                        if (dateDiff !== 0) return dateDiff;
                        return b.id - a.id;
                      })
                      .map((tx) => (
                      <div key={tx.id} className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-3.5 flex items-center justify-between text-xs transition-colors hover:border-slate-300">
                        <div className="space-y-1">
                          <p className="font-bold text-secondary leading-tight">{tx.description || 'N/A'}</p>
                          <div className="flex items-center space-x-2 text-[10px] text-text-secondary">
                            <span className="flex items-center space-x-1 font-medium">
                              <FiCalendar className="w-3 h-3 text-slate-400" />
                              <span>{new Date(tx.created_at).toLocaleDateString()}</span>
                            </span>
                            <span>•</span>
                            <span className={`uppercase font-bold ${tx.transaction_type === 'CREDIT' ? 'text-rose-600' : 'text-primary'}`}>
                              {tx.transaction_type}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className={`font-extrabold text-sm leading-none ${tx.transaction_type === 'CREDIT' ? 'text-rose-600' : 'text-primary'}`}>
                            {tx.transaction_type === 'CREDIT' ? '+' : '-'}₹{tx.amount}
                          </p>
                          <span className="text-[10px] text-text-secondary font-semibold block mt-1">Bal: ₹{tx.remaining_balance_at_snapshot}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center space-y-2 text-center">
                    <FiBookOpen className="text-slate-400 w-5 h-5" />
                    <p className="text-xs text-text-secondary">No transaction logs recorded in this ledger.</p>
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl py-24 px-4 flex flex-col items-center justify-center space-y-3.5 text-center shadow-sm">
              <div className="bg-slate-50 p-4 rounded-full text-slate-350">
                <FiBookOpen className="w-8 h-8" />
              </div>
              <h3 className="text-secondary font-bold text-sm">Select customer profile</h3>
              <p className="text-text-secondary text-xs max-w-xs text-center">Click a buyer row from the directory to review their detailed accounts and transactions.</p>
            </div>
          )}
        </div>

      </div>

      {/* Add Transaction Entry Modal */}
      {showTxModal && selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-premium-lg relative animate-in fade-in zoom-in-95 duration-200">
            
            <button
              onClick={() => setShowTxModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-secondary p-1.5 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-full transition-all cursor-pointer"
            >
              <FiX className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-poppins font-extrabold text-secondary mb-6 text-left">
              New Ledger Entry: <span className="text-primary capitalize">{selectedProfile.name}</span>
            </h3>

            <form onSubmit={handleAddTransactionSubmit} className="space-y-4 text-left">
              
              {/* Type Switcher */}
              <div>
                <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Entry Type</label>
                <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/40">
                  <button
                    type="button"
                    onClick={() => handleTypeChange('CREDIT')}
                    className={`w-1/2 py-2 rounded-xl font-bold text-xs transition-all duration-200 flex items-center justify-center space-x-1.5 cursor-pointer ${
                      txType === 'CREDIT'
                        ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/10'
                        : 'text-text-secondary hover:text-secondary'
                    }`}
                  >
                    <FiArrowUpRight className="w-3.5 h-3.5" />
                    <span>CREDIT (Issue Debt)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange('DEBIT')}
                    className={`w-1/2 py-2 rounded-xl font-bold text-xs transition-all duration-200 flex items-center justify-center space-x-1.5 cursor-pointer ${
                      txType === 'DEBIT'
                        ? 'bg-primary text-white shadow-sm shadow-emerald-500/10'
                        : 'text-text-secondary hover:text-secondary'
                    }`}
                  >
                    <FiArrowDownLeft className="w-3.5 h-3.5" />
                    <span>DEBIT (Record Cash)</span>
                  </button>
                </div>
              </div>

              {/* Product Selection (Optional) */}
              <div className="relative" ref={productDropdownRef}>
                <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Select Product (Optional)</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="-- No Product (General Entry) --"
                    value={
                      isDropdownOpen
                        ? productSearchQuery
                        : selectedProductId && products.find(p => p.id === parseInt(selectedProductId))
                          ? `${products.find(p => p.id === parseInt(selectedProductId)).name} (Price: ₹${parseFloat(products.find(p => p.id === parseInt(selectedProductId)).price).toFixed(2)}, Stock: ${products.find(p => p.id === parseInt(selectedProductId)).stock_quantity})`
                          : ''
                    }
                    onChange={(e) => {
                      setProductSearchQuery(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => {
                      setIsDropdownOpen(true);
                      setProductSearchQuery('');
                    }}
                    className="w-full bg-white border border-slate-200 focus:border-primary rounded-xl py-2.5 px-4 pr-10 text-sm text-[#111827] focus:ring-2 focus:ring-emerald-100 outline-none transition-all cursor-pointer"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {isDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-premium-lg max-h-60 overflow-y-auto p-1.5 animate-in fade-in zoom-in-95 duration-100">
                    <div className="space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          handleProductChange('');
                          setProductSearchQuery('');
                          setIsDropdownOpen(false);
                        }}
                        className="w-full text-left py-2 px-3.5 text-xs sm:text-sm rounded-lg hover:bg-slate-50 cursor-pointer text-[#111827] transition-colors"
                      >
                        -- No Product (General Entry) --
                      </button>
                      {products
                        .filter(p => {
                          const query = productSearchQuery.toLowerCase();
                          return (
                            p.name.toLowerCase().includes(query) ||
                            p.id.toString().includes(query) ||
                            (p.category && p.category.toLowerCase().includes(query)) ||
                            (p.description && p.description.toLowerCase().includes(query))
                          );
                        })
                        .map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              handleProductChange(p.id.toString());
                              setProductSearchQuery('');
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full text-left py-2 px-3.5 text-xs sm:text-sm rounded-lg cursor-pointer flex justify-between items-center transition-colors ${
                              selectedProductId === p.id.toString()
                                ? 'bg-emerald-50 text-primary font-bold'
                                : 'hover:bg-slate-50 text-[#111827]'
                            }`}
                          >
                            <span>{p.name} (Price: ₹{parseFloat(p.price).toFixed(2)}, Stock: {p.stock_quantity})</span>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {p.id}</span>
                          </button>
                        ))}
                      {products.filter(p => {
                        const query = productSearchQuery.toLowerCase();
                        return (
                          p.name.toLowerCase().includes(query) ||
                          p.id.toString().includes(query) ||
                          (p.category && p.category.toLowerCase().includes(query)) ||
                          (p.description && p.description.toLowerCase().includes(query))
                        );
                      }).length === 0 && (
                        <p className="text-center text-xs text-text-secondary py-3">No matching products</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Quantity Field (only if product selected) */}
              {selectedProductId && (
                <div>
                  <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-primary rounded-xl py-2.5 px-4 text-sm text-[#111827] focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Amount (₹) *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <span className="font-extrabold text-sm">₹</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-primary rounded-xl py-2.5 pl-8 pr-4 text-sm text-[#111827] focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                    placeholder="250.00"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Description / Notes</label>
                <textarea
                  value={txDescription}
                  onChange={(e) => setTxDescription(e.target.value)}
                  rows="3"
                  className="w-full bg-white border border-slate-200 focus:border-primary rounded-xl py-2.5 px-4 text-sm text-[#111827] focus:ring-2 focus:ring-emerald-100 outline-none transition-all resize-none"
                  placeholder="e.g. Bought grains & spices, or cash repayment logged"
                ></textarea>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTxModal(false)}
                  className="w-1/2 bg-white border border-slate-200 hover:bg-slate-50 text-text-secondary font-semibold py-3 px-4 rounded-xl transition-all cursor-pointer text-center text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`w-1/2 font-bold py-3 px-4 rounded-xl shadow-md active:scale-[0.98] transition-all cursor-pointer text-center text-sm text-white ${
                    txType === 'CREDIT' 
                      ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/10' 
                      : 'bg-primary hover:bg-primary-hover shadow-emerald-500/10'
                  }`}
                >
                  Confirm Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default CustomerManagement;
