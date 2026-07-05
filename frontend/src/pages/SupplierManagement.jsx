import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { 
  FiSearch, FiUser, FiPhone, FiMail, FiMapPin, FiPlus, FiCalendar, FiX, 
  FiArrowDownLeft, FiBookOpen, FiAlertCircle, FiCheckCircle, FiEdit2, FiTrash2, FiBox 
} from 'react-icons/fi';

const SupplierManagement = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplierTransactions, setSupplierTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);

  // Modals
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supplierModalType, setSupplierModalType] = useState('add'); // 'add' or 'edit'
  
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Supplier Form Fields
  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supGst, setSupGst] = useState('');
  const [supNotes, setSupNotes] = useState('');

  // Purchase Form Fields
  const [purProduct, setPurProduct] = useState('');
  const [purQuantity, setPurQuantity] = useState('');
  const [purCostPrice, setPurCostPrice] = useState('');
  const [purGst, setPurGst] = useState('0.00');
  const [purDate, setPurDate] = useState(new Date().toISOString().split('T')[0]);

  // Payment Form Fields
  const [payAmount, setPayAmount] = useState('');
  const [payDescription, setPayDescription] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);

  // Alerts
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Product combo dropdown search
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const productDropdownRef = useRef(null);

  const fetchSuppliers = async (query = '') => {
    setLoading(true);
    try {
      const url = query ? `/suppliers/?search=${query}` : '/suppliers/';
      const res = await api.get(url);
      setSuppliers(res.data);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products/');
      setProducts(res.data);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const fetchSupplierTransactions = async (id) => {
    setTxLoading(true);
    try {
      const res = await api.get(`/suppliers/${id}/transactions/`);
      setSupplierTransactions(res.data);
    } catch (err) {
      console.error('Error fetching supplier transactions:', err);
    } finally {
      setTxLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSuppliers(searchQuery);
  };

  const handleSelectSupplier = (sup) => {
    setSelectedSupplier(sup);
    fetchSupplierTransactions(sup.id);
  };

  const openAddSupplierModal = () => {
    setSupplierModalType('add');
    setSupName('');
    setSupPhone('');
    setSupEmail('');
    setSupAddress('');
    setSupGst('');
    setSupNotes('');
    setErrorMsg('');
    setShowSupplierModal(true);
  };

  const openEditSupplierModal = (sup, e) => {
    e.stopPropagation();
    setSupplierModalType('edit');
    setSupName(sup.name);
    setSupPhone(sup.contact_number || '');
    setSupEmail(sup.email || '');
    setSupAddress(sup.address || '');
    setSupGst(sup.gst_number || '');
    setSupNotes(sup.notes || '');
    setErrorMsg('');
    setShowSupplierModal(true);
  };

  const handleSupplierSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!supName) {
      setErrorMsg('Supplier name is required.');
      return;
    }

    const payload = {
      name: supName,
      contact_number: supPhone,
      email: supEmail,
      address: supAddress,
      gst_number: supGst,
      notes: supNotes
    };

    try {
      if (supplierModalType === 'add') {
        await api.post('/suppliers/', payload);
        setSuccessMsg('Supplier registered successfully!');
      } else {
        await api.put(`/suppliers/${selectedSupplier.id}/`, payload);
        setSuccessMsg('Supplier profile updated successfully!');
      }
      setShowSupplierModal(false);
      fetchSuppliers(searchQuery);
      if (selectedSupplier) {
        const freshRes = await api.get(`/suppliers/${selectedSupplier.id}/`);
        setSelectedSupplier(freshRes.data);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Saving supplier profile failed. Check fields.');
    }
  };

  const handleDeleteSupplier = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Deleting this supplier will remove their profiles, outstanding records, and bills. Proceed?')) {
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await api.delete(`/suppliers/${id}/`);
      setSuccessMsg('Supplier profile deleted.');
      setSelectedSupplier(null);
      fetchSuppliers(searchQuery);
    } catch (err) {
      console.error(err);
      setErrorMsg('Deletion failed.');
    }
  };

  const openPurchaseModal = () => {
    setPurProduct('');
    setProductSearchQuery('');
    setPurQuantity('');
    setPurCostPrice('');
    setPurGst('0.00');
    setPurDate(new Date().toISOString().split('T')[0]);
    setErrorMsg('');
    setShowPurchaseModal(true);
  };

  const handlePurchaseSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!purProduct || !purQuantity || !purCostPrice) {
      setErrorMsg('Product, quantity, and cost price are required.');
      return;
    }

    if (parseInt(purQuantity) <= 0 || parseFloat(purCostPrice) <= 0) {
      setErrorMsg('Quantity and price must be greater than zero.');
      return;
    }

    const payload = {
      supplier: selectedSupplier.id,
      product: parseInt(purProduct),
      quantity: parseInt(purQuantity),
      cost_price: parseFloat(purCostPrice),
      gst: parseFloat(purGst),
      purchase_date: purDate
    };

    try {
      await api.post('/purchases/', payload);
      setSuccessMsg('Stock purchase recorded! Catalog inventory level updated.');
      setShowPurchaseModal(false);
      fetchSuppliers(searchQuery);
      fetchSupplierTransactions(selectedSupplier.id);
      
      const freshRes = await api.get(`/suppliers/${selectedSupplier.id}/`);
      setSelectedSupplier(freshRes.data);
      fetchProducts();
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to record purchase entry.');
    }
  };

  const openPaymentModal = () => {
    setPayAmount('');
    setPayDescription(`Cash payment to ${selectedSupplier.name}`);
    setPayDate(new Date().toISOString().split('T')[0]);
    setErrorMsg('');
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!payAmount || parseFloat(payAmount) <= 0) {
      setErrorMsg('Amount must be a positive number.');
      return;
    }

    try {
      await api.post(`/suppliers/${selectedSupplier.id}/pay/`, {
        amount: parseFloat(payAmount),
        description: payDescription,
        date: payDate
      });
      setSuccessMsg('Supplier payment logged successfully!');
      setShowPaymentModal(false);
      fetchSuppliers(searchQuery);
      fetchSupplierTransactions(selectedSupplier.id);
      
      const freshRes = await api.get(`/suppliers/${selectedSupplier.id}/`);
      setSelectedSupplier(freshRes.data);
    } catch (err) {
      console.error(err);
      setErrorMsg('Recording supplier payment failed.');
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto bg-[#F8FAFC] text-[#111827] flex flex-col justify-start relative text-left">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 leading-none">Suppliers &amp; Purchases</h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1.5 font-medium">Manage wholesale suppliers, purchase inventory shipments, and settle trade payables.</p>
        </div>

        <button
          onClick={openAddSupplierModal}
          className="bg-[#10B981] hover:bg-[#059669] text-white font-semibold px-4 py-2 rounded-lg flex items-center justify-center space-x-1.5 shadow-sm transition-colors cursor-pointer text-xs sm:text-sm active:scale-95 min-h-[44px]"
        >
          <FiPlus className="w-4 h-4" />
          <span>Add Supplier</span>
        </button>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="bg-emerald-50/50 border border-emerald-100 text-[#10B981] p-3.5 rounded-lg text-xs flex items-center space-x-2 font-medium">
          <FiCheckCircle className="w-4 h-4 shrink-0 text-[#10B981]" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-rose-50/50 border border-rose-100 text-rose-600 p-3.5 rounded-lg text-xs flex items-center space-x-2 font-medium">
          <FiAlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Supplier directory list */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <FiSearch className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search suppliers by name, phone or GSTIN..."
                className="w-full bg-white border border-slate-200 focus:border-[#10B981] focus:ring-2 focus:ring-emerald-500/20 rounded-lg py-2.5 pl-9 pr-4 text-xs sm:text-sm text-slate-900 placeholder-slate-400 outline-none transition-all"
              />
            </div>
            <button
              type="submit"
              className="bg-white hover:bg-slate-50 text-slate-705 border border-slate-200 px-4.5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold shadow-sm transition-all cursor-pointer active:scale-95 min-h-[44px] flex items-center justify-center"
            >
              Search
            </button>
          </form>

          {/* Table list */}
          {loading ? (
            <div className="bg-white border border-slate-200/60 rounded-lg p-6 h-60 animate-pulse shadow-sm">
              <div className="space-y-4">
                <div className="h-6 bg-slate-100 rounded w-1/4"></div>
                <div className="h-10 bg-slate-100 rounded"></div>
                <div className="h-10 bg-slate-100 rounded"></div>
              </div>
            </div>
          ) : suppliers.length > 0 ? (
            <div className="bg-white border border-slate-200/60 rounded-lg overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/60 text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-50/50">
                      <th className="py-3 px-5">Supplier Details</th>
                      <th className="py-3 px-5">GST Number</th>
                      <th className="py-3 px-5 text-right">Balance Due</th>
                      <th className="py-3 px-5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map((s) => (
                      <tr 
                        key={s.id} 
                        className={`border-b border-slate-100 hover:bg-slate-50/50 cursor-pointer transition-colors text-xs sm:text-sm ${
                          selectedSupplier?.id === s.id ? 'bg-emerald-50/25 border-l-2 border-l-[#10B981] font-semibold' : ''
                        }`}
                        onClick={() => handleSelectSupplier(s)}
                      >
                        <td className="py-3.5 px-5">
                          <div>
                            <p className="font-semibold text-slate-900 capitalize">{s.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{s.contact_number || 'No phone'}</p>
                          </div>
                        </td>
                        <td className="py-3.5 px-5 font-mono text-slate-600 font-medium">{s.gst_number || 'N/A'}</td>
                        <td className="py-3.5 px-5 text-right font-mono font-semibold text-sm">
                          <span className={s.remaining_due > 0 ? 'text-rose-600' : 'text-slate-500'}>
                            ₹{parseFloat(s.remaining_due).toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={(e) => openEditSupplierModal(s, e)}
                              className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-700 border border-slate-200 transition-all shadow-sm cursor-pointer"
                              title="Edit Supplier Profile"
                            >
                              <FiEdit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteSupplier(s.id, e)}
                              className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 transition-all shadow-sm cursor-pointer"
                              title="Delete Supplier Profile"
                            >
                              <FiTrash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/60 rounded-lg py-16 px-4 flex flex-col items-center justify-center space-y-3 text-center shadow-sm">
              <div className="bg-slate-50 p-3 rounded-lg text-slate-400">
                <FiUser className="w-6 h-6" />
              </div>
              <p className="text-xs sm:text-sm text-slate-505 font-medium">No suppliers matching active filters.</p>
            </div>
          )}
        </div>

        {/* Right: Detailed supplier ledger view */}
        <div className="lg:col-span-5">
          {txLoading ? (
            <div className="bg-white border border-slate-200/60 rounded-lg p-6 h-80 animate-pulse shadow-sm">
              <div className="space-y-4">
                <div className="h-6 bg-slate-100 rounded w-1/2"></div>
                <div className="h-10 bg-slate-100 rounded"></div>
                <div className="h-20 bg-slate-100 rounded"></div>
              </div>
            </div>
          ) : selectedSupplier ? (
            <div className="bg-white border border-slate-200/60 rounded-lg p-6 space-y-6 shadow-sm relative animate-in fade-in duration-200">
              
              {/* Profile Details */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900 capitalize leading-none">{selectedSupplier.name}</h3>
                  <span className="text-[10px] text-slate-400 font-medium tracking-wide mt-1.5 block">Trade Payable Account Ledger</span>
                </div>
                
                <span className="bg-slate-50 text-slate-600 border border-slate-200 text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase">
                  ID: {selectedSupplier.id}
                </span>
              </div>

              {/* Contacts */}
              <div className="space-y-2 py-3 border-y border-slate-100 text-xs text-slate-500 font-mono">
                <div className="flex items-center space-x-1.5">
                  <FiPhone className="text-slate-400 w-3.5 h-3.5 shrink-0" />
                  <span className="font-semibold text-slate-700">{selectedSupplier.contact_number || 'No phone registered'}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <FiMail className="text-slate-400 w-3.5 h-3.5 shrink-0" />
                  <span className="font-semibold text-slate-700">{selectedSupplier.email || 'No email registered'}</span>
                </div>
                <div className="flex items-start space-x-1.5">
                  <FiMapPin className="text-slate-400 w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span className="font-semibold text-slate-705 leading-snug font-sans">{selectedSupplier.address || 'No address registered'}</span>
                </div>
              </div>

              {/* Balance metric tags */}
              <div className="grid grid-cols-3 gap-3 font-mono">
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-sans">Total Bills</span>
                  <span className="text-xs font-semibold text-slate-800 leading-none block">
                    ₹{parseFloat(selectedSupplier.amount_due).toFixed(2)}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-sans">Settle paid</span>
                  <span className="text-xs font-semibold text-[#10B981] leading-none block">
                    ₹{parseFloat(selectedSupplier.amount_paid).toFixed(2)}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-sans">Payables</span>
                  <span className={`text-xs font-semibold leading-none block ${selectedSupplier.remaining_due > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                    ₹{parseFloat(selectedSupplier.remaining_due).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Action Triggers */}
              <div className="grid grid-cols-2 gap-3 text-center">
                <button
                  onClick={openPurchaseModal}
                  className="bg-[#10B981] hover:bg-[#059669] text-white font-semibold py-2.5 px-3 rounded-lg flex items-center justify-center space-x-1 shadow-sm cursor-pointer text-xs transition-all active:scale-98"
                >
                  <FiBox className="w-3.5 h-3.5" />
                  <span>Log Purchase</span>
                </button>
                <button
                  onClick={openPaymentModal}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 px-3 rounded-lg flex items-center justify-center space-x-1 shadow-sm cursor-pointer text-xs transition-all active:scale-98"
                >
                  <FiArrowDownLeft className="w-3.5 h-3.5" />
                  <span>Record Payment</span>
                </button>
              </div>

              {/* Trade transactions list */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">Purchase History &amp; Ledger</h4>
                
                {supplierTransactions && supplierTransactions.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {supplierTransactions.map((tx) => (
                      <div key={tx.id} className="bg-slate-50 border border-slate-100 rounded-lg p-3 flex items-center justify-between text-xs transition-colors hover:border-slate-200">
                        <div className="space-y-1">
                          <p className="font-medium text-slate-850 leading-tight">{tx.description || 'N/A'}</p>
                          <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono">
                            <span className="flex items-center space-x-1">
                              <FiCalendar className="w-3 h-3 text-slate-350" />
                              <span>{new Date(tx.date).toLocaleDateString()}</span>
                            </span>
                            <span>•</span>
                            <span className={`uppercase font-bold ${tx.type === 'BILL' ? 'text-rose-600' : 'text-[#10B981]'}`}>
                              {tx.type}
                            </span>
                          </div>
                        </div>

                        <div className="text-right font-mono">
                          <p className={`font-semibold text-xs sm:text-sm leading-none ${tx.type === 'BILL' ? 'text-rose-600' : 'text-[#10B981]'}`}>
                            {tx.type === 'BILL' ? '+' : '-'}₹{parseFloat(tx.amount).toFixed(2)}
                          </p>
                          <span className="text-[9.5px] text-slate-400 font-semibold block mt-1">Bal: ₹{parseFloat(tx.remaining_balance_snapshot).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 border border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center space-y-1.5 text-center text-xs text-slate-400">
                    <FiBookOpen className="w-5 h-5 text-slate-350" />
                    <span>No purchase logs recorded in this ledger.</span>
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="bg-white border border-slate-200/60 rounded-lg py-24 px-4 flex flex-col items-center justify-center space-y-3.5 text-center shadow-sm">
              <div className="bg-slate-50 p-3 rounded-lg text-slate-350">
                <FiBookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-slate-800 font-semibold text-sm">Select wholesale supplier</h3>
              <p className="text-slate-400 text-xs max-w-xs text-center leading-normal">Click a supplier row from the directory to review their detailed accounts and trade purchases.</p>
            </div>
          )}
        </div>

      </div>

      {/* Supplier Profile Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-lg relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            
            <button
              onClick={() => setShowSupplierModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-805 p-1 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all cursor-pointer"
            >
              <FiX className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-semibold text-slate-950 mb-6 text-left tracking-tight">
              {supplierModalType === 'add' ? 'Register New Supplier' : 'Edit Supplier Profile'}
            </h3>

            <form onSubmit={handleSupplierSubmit} className="space-y-4 text-left font-medium">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Supplier Name *</label>
                <input
                  type="text"
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-[#10B981] rounded-lg py-2 px-3 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all"
                  placeholder="e.g. Laxmi Wholesalers"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-[#10B981] rounded-lg py-2 px-3 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all font-mono"
                    placeholder="e.g. 9876543210"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">GSTIN / Tax ID</label>
                  <input
                    type="text"
                    value={supGst}
                    onChange={(e) => setSupGst(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-[#10B981] rounded-lg py-2 px-3 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all font-mono"
                    placeholder="e.g. 27AAAAA0000A1Z5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                <input
                  type="email"
                  value={supEmail}
                  onChange={(e) => setSupEmail(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-[#10B981] rounded-lg py-2 px-3 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all font-mono"
                  placeholder="e.g. laxmi@wholesale.com"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Office Address</label>
                <input
                  type="text"
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-[#10B981] rounded-lg py-2 px-3 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all"
                  placeholder="Street, City, State details..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Notes / Payment Terms</label>
                <textarea
                  value={supNotes}
                  onChange={(e) => setSupNotes(e.target.value)}
                  rows="3"
                  className="w-full bg-white border border-slate-200 focus:border-[#10B981] rounded-lg py-2 px-3 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all resize-none"
                  placeholder="e.g. Settle balance every fortnight, credit limit guidelines..."
                ></textarea>
              </div>

              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="w-1/2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-505 font-semibold py-2.5 px-4 rounded-lg transition-colors cursor-pointer text-center text-xs sm:text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-[#10B981] hover:bg-[#059669] text-white font-semibold py-2.5 px-4 rounded-lg shadow-sm active:scale-[0.98] transition-all cursor-pointer text-center text-xs sm:text-sm"
                >
                  {supplierModalType === 'add' ? 'Register' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Purchase Modal */}
      {showPurchaseModal && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-lg relative animate-in fade-in zoom-in-95 duration-200" ref={productDropdownRef}>
            
            <button
              onClick={() => setShowPurchaseModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-805 p-1 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all cursor-pointer"
            >
              <FiX className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-semibold text-slate-950 mb-6 text-left tracking-tight">
              Log Bulk Purchase: <span className="text-[#10B981] capitalize">{selectedSupplier.name}</span>
            </h3>

            <form onSubmit={handlePurchaseSubmit} className="space-y-4 text-left font-medium">
              
              {/* Product selector dropdown search */}
              <div className="relative">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Select Item *</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search catalog products..."
                    value={
                      isDropdownOpen
                        ? productSearchQuery
                        : purProduct && products.find(p => p.id === parseInt(purProduct))
                          ? `${products.find(p => p.id === parseInt(purProduct)).name} (Price: ₹${parseFloat(products.find(p => p.id === parseInt(purProduct)).price).toFixed(2)})`
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
                    className="w-full bg-white border border-slate-200 focus:border-[#10B981] rounded-lg py-2 px-3 pr-8 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all cursor-pointer font-medium"
                    required
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-405">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {isDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-md max-h-56 overflow-y-auto p-1">
                    <div className="space-y-0.5">
                      {products
                        .filter(p => {
                          const query = productSearchQuery.toLowerCase();
                          return (
                            p.name.toLowerCase().includes(query) ||
                            p.id.toString().includes(query) ||
                            (p.category && p.category.toLowerCase().includes(query))
                          );
                        })
                        .map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setPurProduct(p.id.toString());
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full text-left py-1.5 px-3 text-xs rounded cursor-pointer flex justify-between items-center transition-colors ${
                              purProduct === p.id.toString()
                                ? 'bg-emerald-50 text-[#10B981] font-bold'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <span>{p.name} (Stock: {p.stock_quantity})</span>
                            <span className="text-[9px] text-slate-400 font-mono">₹{parseFloat(p.price).toFixed(2)}</span>
                          </button>
                        ))}
                      {products.filter(p => {
                        const query = productSearchQuery.toLowerCase();
                        return (
                          p.name.toLowerCase().includes(query) ||
                          p.id.toString().includes(query)
                        );
                      }).length === 0 && (
                        <p className="text-center text-xs text-slate-400 py-3">No matching products</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Quantity (units) *</label>
                  <input
                    type="number"
                    min="1"
                    value={purQuantity}
                    onChange={(e) => setPurQuantity(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-[#10B981] rounded-lg py-2 px-3 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all font-mono"
                    placeholder="100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-sans">Cost Price (₹/unit) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={purCostPrice}
                    onChange={(e) => setPurCostPrice(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-[#10B981] rounded-lg py-2 px-3 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all font-mono"
                    placeholder="80.00"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">GST Paid Rate (%)</label>
                  <select
                    value={purGst}
                    onChange={(e) => setPurGst(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-[#10B981] rounded-lg py-2 px-2 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all cursor-pointer font-mono"
                  >
                    <option value="0.00">0% GST</option>
                    <option value="5.00">5% GST</option>
                    <option value="12.00">12% GST</option>
                    <option value="18.00">18% GST</option>
                    <option value="28.00">28% GST</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-sans">Purchase Date *</label>
                  <input
                    type="date"
                    value={purDate}
                    onChange={(e) => setPurDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-[#10B981] rounded-lg py-2 px-3 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all font-mono"
                    required
                  />
                </div>
              </div>

              {purQuantity && purCostPrice && (
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs space-y-1 text-slate-500 font-mono">
                  <div className="flex justify-between">
                    <span>Base Value:</span>
                    <span>₹{(parseInt(purQuantity) * parseFloat(purCostPrice)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST ({(parseFloat(purGst)).toFixed(0)}%):</span>
                    <span>₹{(parseInt(purQuantity) * parseFloat(purCostPrice) * (parseFloat(purGst) / 100)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-800 border-t border-slate-200 pt-1">
                    <span className="font-sans">Total Bill Due:</span>
                    <span>₹{(parseInt(purQuantity) * parseFloat(purCostPrice) * (1 + parseFloat(purGst) / 100)).toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPurchaseModal(false)}
                  className="w-1/2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-505 font-semibold py-2.5 px-4 rounded-lg transition-colors cursor-pointer text-center text-xs sm:text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-[#10B981] hover:bg-[#059669] text-white font-semibold py-2.5 px-4 rounded-lg shadow-sm active:scale-[0.98] transition-all cursor-pointer text-center text-xs sm:text-sm"
                >
                  Log Shipment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Settlement Modal */}
      {showPaymentModal && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-slate-205 rounded-xl p-6 sm:p-8 shadow-lg relative animate-in fade-in zoom-in-95 duration-200">
            
            <button
              onClick={() => setShowPaymentModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-805 p-1 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all cursor-pointer"
            >
              <FiX className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-semibold text-slate-950 mb-6 text-left tracking-tight">
              Record Supplier Payment: <span className="text-[#10B981] capitalize">{selectedSupplier.name}</span>
            </h3>

            <form onSubmit={handlePaymentSubmit} className="space-y-4 text-left font-medium">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Settlement Amount (₹) *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <span className="font-semibold text-xs">₹</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full bg-white border border-slate-205 focus:border-[#10B981] rounded-lg py-2 pl-7 pr-3 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all font-mono"
                    placeholder="e.g. 5000.00"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Payment Date *</label>
                <input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-[#10B981] rounded-lg py-2 px-3 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all font-mono cursor-pointer"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Description / Reference ID</label>
                <input
                  type="text"
                  value={payDescription}
                  onChange={(e) => setPayDescription(e.target.value)}
                  className="w-full bg-white border border-slate-202 focus:border-[#10B981] rounded-lg py-2 px-3 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all"
                  placeholder="e.g. Cash settlement, Bank Transfer Ref#..."
                />
              </div>

              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="w-1/2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-505 font-semibold py-2.5 px-4 rounded-lg transition-colors cursor-pointer text-center text-xs sm:text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-[#10B981] hover:bg-[#059669] text-white font-semibold py-2.5 px-4 rounded-lg shadow-sm active:scale-[0.98] transition-all cursor-pointer text-center text-xs sm:text-sm"
                >
                  Confirm Settle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default SupplierManagement;
