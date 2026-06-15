import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { 
  FiSearch, FiUser, FiPhone, FiMail, FiMapPin, FiPercent, FiPlus, FiCalendar, FiX, 
  FiArrowUpRight, FiArrowDownLeft, FiBookOpen, FiAlertCircle, FiCheckCircle, FiEdit2, FiTrash2, FiBox 
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
        // Refresh detail profile
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
      
      // Refresh current supplier due details
      const freshRes = await api.get(`/suppliers/${selectedSupplier.id}/`);
      setSelectedSupplier(freshRes.data);
      fetchProducts(); // Refresh catalog stock display if needed
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
      
      // Refresh details
      const freshRes = await api.get(`/suppliers/${selectedSupplier.id}/`);
      setSelectedSupplier(freshRes.data);
    } catch (err) {
      console.error(err);
      setErrorMsg('Recording supplier payment failed.');
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto bg-slate-50/50 text-[#111827] flex flex-col justify-start relative text-left">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-poppins font-extrabold text-secondary">Suppliers & Purchase Ledger</h2>
          <p className="text-[#6B7280] text-xs sm:text-sm">Manage wholesale suppliers, purchase inventory shipments, and settle trade payables.</p>
        </div>

        <button
          onClick={openAddSupplierModal}
          className="bg-primary hover:bg-primary-hover text-white font-bold px-4.5 py-2.5 rounded-xl flex items-center justify-center space-x-2 shadow-sm hover:shadow-md transition-all cursor-pointer text-xs sm:text-sm active:scale-95"
        >
          <FiPlus className="w-4.5 h-4.5" />
          <span>Add Supplier</span>
        </button>
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

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Supplier directory list */}
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
                placeholder="Search suppliers by name, phone or GSTIN..."
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

          {/* Table list */}
          {loading ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 h-60 animate-pulse shadow-sm"></div>
          ) : suppliers.length > 0 ? (
            <div className="bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-150 text-[10px] uppercase font-bold tracking-wider text-[#6B7280] bg-slate-50/70">
                      <th className="py-4 px-6">Supplier Details</th>
                      <th className="py-4 px-6">GST Number</th>
                      <th className="py-4 px-6 text-right">Balance Due</th>
                      <th className="py-4 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map((s) => (
                      <tr 
                        key={s.id} 
                        className={`border-b border-slate-100 hover:bg-slate-50/50 cursor-pointer transition-colors text-xs sm:text-sm ${
                          selectedSupplier?.id === s.id ? 'bg-emerald-50/40 border-l-4 border-l-primary font-medium' : ''
                        }`}
                        onClick={() => handleSelectSupplier(s)}
                      >
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-bold text-secondary capitalize">{s.name}</p>
                            <p className="text-[10px] text-text-secondary mt-0.5">{s.contact_number || 'No phone'}</p>
                          </div>
                        </td>
                        <td className="py-4 px-6 font-semibold text-secondary">{s.gst_number || 'N/A'}</td>
                        <td className="py-4 px-6 text-right font-extrabold text-sm">
                          <span className={s.remaining_due > 0 ? 'text-rose-600' : 'text-slate-500'}>
                            ₹{parseFloat(s.remaining_due).toFixed(2)}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={(e) => openEditSupplierModal(s, e)}
                              className="p-2 rounded-xl bg-white hover:bg-emerald-50 text-text-secondary hover:text-primary border border-slate-200 hover:border-emerald-250 transition-all shadow-sm cursor-pointer"
                              title="Edit Supplier Profile"
                            >
                              <FiEdit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteSupplier(s.id, e)}
                              className="p-2 rounded-xl bg-white hover:bg-rose-50 text-text-secondary hover:text-rose-500 border border-slate-200 hover:border-rose-250 transition-all shadow-sm cursor-pointer"
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
            <div className="bg-white border border-slate-200 rounded-3xl py-16 px-4 flex flex-col items-center justify-center space-y-3.5 text-center shadow-sm">
              <div className="bg-slate-50 p-4 rounded-full text-slate-350">
                <FiUser className="w-8 h-8" />
              </div>
              <p className="text-xs sm:text-sm text-text-secondary">No suppliers matching active filters.</p>
            </div>
          )}
        </div>

        {/* Right: Detailed supplier ledger view */}
        <div className="lg:col-span-5">
          {txLoading ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 h-80 animate-pulse shadow-sm"></div>
          ) : selectedSupplier ? (
            <div className="bg-white border border-slate-200/60 rounded-3xl p-6 space-y-6 shadow-sm relative animate-in fade-in slide-in-from-right-4 duration-250">
              
              {/* Profile Details */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base sm:text-lg font-poppins font-extrabold text-secondary capitalize leading-none">{selectedSupplier.name}</h3>
                  <span className="text-[10px] text-text-secondary font-medium tracking-wide mt-1 block">Trade Payable Account Ledger</span>
                </div>
                
                <span className="bg-slate-100 text-secondary border border-slate-200 text-[9px] font-extrabold tracking-wider px-2.5 py-1 rounded-lg uppercase shadow-sm">
                  ID: {selectedSupplier.id}
                </span>
              </div>

              {/* Contacts */}
              <div className="space-y-2 py-3 border-y border-slate-100 text-xs text-text-secondary">
                <div className="flex items-center space-x-2">
                  <FiPhone className="text-slate-400 w-4 h-4 shrink-0" />
                  <span className="font-semibold text-secondary">{selectedSupplier.contact_number || 'No phone registered'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FiMail className="text-slate-400 w-4 h-4 shrink-0" />
                  <span className="font-semibold text-secondary">{selectedSupplier.email || 'No email registered'}</span>
                </div>
                <div className="flex items-start space-x-2">
                  <FiMapPin className="text-slate-400 w-4 h-4 shrink-0 mt-0.5" />
                  <span className="font-semibold text-secondary leading-snug">{selectedSupplier.address || 'No address registered'}</span>
                </div>
              </div>

              {/* Balance metric tags */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3">
                  <span className="text-[9px] font-bold text-text-secondary uppercase tracking-wider block mb-1">Total Bills</span>
                  <span className="text-xs font-extrabold text-secondary leading-none block">
                    ₹{parseFloat(selectedSupplier.amount_due).toFixed(2)}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3">
                  <span className="text-[9px] font-bold text-text-secondary uppercase tracking-wider block mb-1">Total Settled</span>
                  <span className="text-xs font-extrabold text-primary leading-none block">
                    ₹{parseFloat(selectedSupplier.amount_paid).toFixed(2)}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3">
                  <span className="text-[9px] font-bold text-text-secondary uppercase tracking-wider block mb-1">Outstanding</span>
                  <span className={`text-xs font-extrabold leading-none block ${selectedSupplier.remaining_due > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                    ₹{parseFloat(selectedSupplier.remaining_due).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Action Triggers */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={openPurchaseModal}
                  className="bg-primary hover:bg-primary-hover text-white font-bold py-2.5 px-3 rounded-xl flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer text-xs transition-all active:scale-98"
                >
                  <FiBox className="w-4 h-4" />
                  <span>Log Purchase Shipment</span>
                </button>
                <button
                  onClick={openPaymentModal}
                  className="bg-secondary hover:bg-slate-800 text-white font-bold py-2.5 px-3 rounded-xl flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer text-xs transition-all active:scale-98"
                >
                  <FiArrowDownLeft className="w-4 h-4" />
                  <span>Record Payment</span>
                </button>
              </div>

              {/* Trade transactions list */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-secondary text-xs uppercase tracking-wider">Purchase History & Ledger</h4>
                
                {supplierTransactions && supplierTransactions.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {supplierTransactions.map((tx) => (
                      <div key={tx.id} className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-3 flex items-center justify-between text-xs transition-colors hover:border-slate-300">
                        <div className="space-y-1">
                          <p className="font-bold text-secondary leading-tight">{tx.description || 'Trade Ledger Entry'}</p>
                          <div className="flex items-center space-x-2 text-[10px] text-text-secondary">
                            <span className="flex items-center space-x-1 font-medium">
                              <FiCalendar className="w-3 h-3 text-slate-400" />
                              <span>{new Date(tx.date).toLocaleDateString()}</span>
                            </span>
                            <span>•</span>
                            <span className={`uppercase font-bold ${tx.transaction_type === 'PURCHASE' ? 'text-rose-600' : 'text-primary'}`}>
                              {tx.transaction_type}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className={`font-extrabold text-sm leading-none ${tx.transaction_type === 'PURCHASE' ? 'text-rose-600' : 'text-primary'}`}>
                            {tx.transaction_type === 'PURCHASE' ? '+' : '-'}₹{parseFloat(tx.amount).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center space-y-2 text-center">
                    <FiBookOpen className="text-slate-400 w-5 h-5" />
                    <p className="text-xs text-text-secondary">No purchase or payment entries logged in this account.</p>
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl py-24 px-4 flex flex-col items-center justify-center space-y-3.5 text-center shadow-sm">
              <div className="bg-slate-50 p-4 rounded-full text-slate-350">
                <FiBookOpen className="w-8 h-8" />
              </div>
              <h3 className="text-secondary font-bold text-sm">Select wholesale supplier</h3>
              <p className="text-text-secondary text-xs max-w-xs text-center">Click a vendor row from the directory to review their purchase history and outstanding payable accounts.</p>
            </div>
          )}
        </div>

      </div>

      {/* Supplier Modal (Add/Edit) */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-premium-lg relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowSupplierModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-secondary p-1.5 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-full transition-all cursor-pointer"
            >
              <FiX className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-poppins font-extrabold text-secondary mb-6 text-left">
              {supplierModalType === 'add' ? 'Register Wholesale Supplier' : 'Modify Supplier Profile'}
            </h3>

            <form onSubmit={handleSupplierSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Supplier Name *</label>
                <input
                  type="text"
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-primary rounded-xl py-2.5 px-4 text-sm text-[#111827] focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                  placeholder="e.g. Laxmi Grain Wholesalers"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Contact Mobile</label>
                  <input
                    type="text"
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-primary rounded-xl py-2.5 px-4 text-sm text-[#111827] focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                    placeholder="e.g. +91 9876543210"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">GSTIN Number</label>
                  <input
                    type="text"
                    value={supGst}
                    onChange={(e) => setSupGst(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-primary rounded-xl py-2.5 px-4 text-sm text-[#111827] focus:ring-2 focus:ring-emerald-100 outline-none transition-all uppercase"
                    placeholder="22AAAAA0000A1Z5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Email Address</label>
                <input
                  type="email"
                  value={supEmail}
                  onChange={(e) => setSupEmail(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-primary rounded-xl py-2.5 px-4 text-sm text-[#111827] focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                  placeholder="laxmi@grains.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Business Address</label>
                <textarea
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  rows="2"
                  className="w-full bg-white border border-slate-200 focus:border-primary rounded-xl py-2.5 px-4 text-sm text-[#111827] focus:ring-2 focus:ring-emerald-100 outline-none transition-all resize-none"
                  placeholder="Warehouse details, street, city..."
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Internal Notes</label>
                <textarea
                  value={supNotes}
                  onChange={(e) => setSupNotes(e.target.value)}
                  rows="2"
                  className="w-full bg-white border border-slate-200 focus:border-primary rounded-xl py-2.5 px-4 text-sm text-[#111827] focus:ring-2 focus:ring-emerald-100 outline-none transition-all resize-none"
                  placeholder="Write terms, bank details, credit period..."
                ></textarea>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="w-1/2 bg-white border border-slate-200 hover:bg-slate-50 text-text-secondary font-semibold py-3 px-4 rounded-xl transition-all cursor-pointer text-center text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-primary hover:bg-primary-hover text-white font-bold py-3 px-4 rounded-xl shadow-md active:scale-[0.98] transition-all cursor-pointer text-center text-sm"
                >
                  {supplierModalType === 'add' ? 'Register' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Purchase Modal */}
      {showPurchaseModal && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-premium-lg relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowPurchaseModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-secondary p-1.5 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-full transition-all cursor-pointer"
            >
              <FiX className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-poppins font-extrabold text-secondary mb-6 text-left">
              Log Purchase: <span className="text-primary capitalize">{selectedSupplier.name}</span>
            </h3>

            <form onSubmit={handlePurchaseSubmit} className="space-y-4 text-left">
              
              {/* Product selector combo */}
              <div className="relative" ref={productDropdownRef}>
                <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Inventory Catalog Product *</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="-- Search & Select Product --"
                    value={
                      isDropdownOpen
                        ? productSearchQuery
                        : purProduct && products.find(p => p.id === parseInt(purProduct))
                          ? `${products.find(p => p.id === parseInt(purProduct)).name} (Stock: ${products.find(p => p.id === parseInt(purProduct)).stock_quantity})`
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
                    required
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {isDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-premium-lg max-h-52 overflow-y-auto p-1.5 animate-in fade-in zoom-in-95 duration-100">
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
                              setProductSearchQuery('');
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full text-left py-2 px-3.5 text-xs sm:text-sm rounded-lg cursor-pointer flex justify-between items-center transition-colors ${
                              purProduct === p.id.toString()
                                ? 'bg-emerald-50 text-primary font-bold'
                                : 'hover:bg-slate-50 text-[#111827]'
                            }`}
                          >
                            <span>{p.name} (Stock: {p.stock_quantity})</span>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {p.id}</span>
                          </button>
                        ))}
                      {products.filter(p => {
                        const query = productSearchQuery.toLowerCase();
                        return (
                          p.name.toLowerCase().includes(query) ||
                          p.id.toString().includes(query)
                        );
                      }).length === 0 && (
                        <p className="text-center text-xs text-text-secondary py-3">No matching products</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Quantity (units) *</label>
                  <input
                    type="number"
                    min="1"
                    value={purQuantity}
                    onChange={(e) => setPurQuantity(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-primary rounded-xl py-2.5 px-4 text-sm text-[#111827] focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                    placeholder="100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Cost Price / unit *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={purCostPrice}
                    onChange={(e) => setPurCostPrice(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-primary rounded-xl py-2.5 px-4 text-sm text-[#111827] focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                    placeholder="85.50"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">GST Rate (%)</label>
                  <select
                    value={purGst}
                    onChange={(e) => setPurGst(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-primary rounded-xl py-2.5 px-3 text-sm text-[#111827] focus:ring-2 focus:ring-emerald-100 outline-none transition-all cursor-pointer"
                  >
                    <option value="0.00">0% GST</option>
                    <option value="5.00">5% GST</option>
                    <option value="12.00">12% GST</option>
                    <option value="18.00">18% GST</option>
                    <option value="28.00">28% GST</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Purchase Date</label>
                  <input
                    type="date"
                    value={purDate}
                    onChange={(e) => setPurDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-primary rounded-xl py-2.5 px-4 text-sm text-[#111827] focus:ring-2 focus:ring-emerald-100 outline-none transition-all cursor-pointer"
                    required
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPurchaseModal(false)}
                  className="w-1/2 bg-white border border-slate-200 hover:bg-slate-50 text-text-secondary font-semibold py-3 px-4 rounded-xl transition-all cursor-pointer text-center text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-primary hover:bg-primary-hover text-white font-bold py-3 px-4 rounded-xl shadow-md active:scale-[0.98] transition-all cursor-pointer text-center text-sm"
                >
                  Log Shipment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-premium-lg relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowPaymentModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-secondary p-1.5 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-full transition-all cursor-pointer"
            >
              <FiX className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-poppins font-extrabold text-secondary mb-6 text-left">
              Record Trade Settlement: <span className="text-primary capitalize">{selectedSupplier.name}</span>
            </h3>

            <form onSubmit={handlePaymentSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Settlement Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-primary rounded-xl py-2.5 px-4 text-sm text-[#111827] focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                  placeholder="e.g. 5000.00"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Payment Date</label>
                <input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-primary rounded-xl py-2.5 px-4 text-sm text-[#111827] focus:ring-2 focus:ring-emerald-100 outline-none transition-all cursor-pointer"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Description / Notes</label>
                <input
                  type="text"
                  value={payDescription}
                  onChange={(e) => setPayDescription(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-primary rounded-xl py-2.5 px-4 text-sm text-[#111827] focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                  placeholder="UPI transaction ID, Cheque number, etc."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="w-1/2 bg-white border border-slate-200 hover:bg-slate-50 text-text-secondary font-semibold py-3 px-4 rounded-xl transition-all cursor-pointer text-center text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-primary hover:bg-primary-hover text-white font-bold py-3 px-4 rounded-xl shadow-md active:scale-[0.98] transition-all cursor-pointer text-center text-sm"
                >
                  Record Payment
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
