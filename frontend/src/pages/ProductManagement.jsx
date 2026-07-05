import { useState, useEffect } from 'react';
import api from '../services/api';
import BarcodeScanner from '../components/BarcodeScanner';
import { FiEdit2, FiTrash2, FiPlus, FiSearch, FiBox, FiX, FiCheckCircle, FiAlertCircle, FiZap, FiCamera, FiClock } from 'react-icons/fi';

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('add'); // 'add' or 'edit'
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [category, setCategory] = useState('');
  const [image, setImage] = useState('');
  const [gstRate, setGstRate] = useState('0.00');
  const [hsnCode, setHsnCode] = useState('');
  const [barcode, setBarcode] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  // Barcode scanner states
  const [showScanner, setShowScanner] = useState(false);
  const [scannerMode, setScannerMode] = useState('fill'); // 'fill' = fill form field, 'find' = find product

  // Alerts
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/products/');
      setProducts(res.data);
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openAddModal = () => {
    setModalType('add');
    setSelectedProduct(null);
    setName('');
    setDescription('');
    setPrice('');
    setStockQuantity('');
    setCategory('');
    setImage('');
    setGstRate('0.00');
    setHsnCode('');
    setBarcode('');
    setExpiryDate('');
    setErrorMsg('');
    setShowModal(true);
  };

  const openEditModal = (p) => {
    setModalType('edit');
    setSelectedProduct(p);
    setName(p.name);
    setDescription(p.description || '');
    setPrice(p.price);
    setStockQuantity(p.stock_quantity);
    setCategory(p.category || '');
    setImage(p.image || '');
    setGstRate(p.gst_rate !== undefined ? p.gst_rate.toString() : '0.00');
    setHsnCode(p.hsn_code || '');
    setBarcode(p.barcode || '');
    setExpiryDate(p.expiry_date || '');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name || !price || stockQuantity === '') {
      setErrorMsg('Product name, price, and stock quantity are required.');
      return;
    }
    if (parseFloat(price) <= 0) {
      setErrorMsg('Price must be greater than zero.');
      return;
    }
    if (parseInt(stockQuantity) < 0) {
      setErrorMsg('Stock quantity cannot be negative.');
      return;
    }

    const payload = {
      name,
      description,
      price: parseFloat(price),
      stock_quantity: parseInt(stockQuantity),
      category,
      gst_rate: parseFloat(gstRate),
      hsn_code: hsnCode,
      barcode: barcode.trim() || null,
      expiry_date: expiryDate || null,
      image: image || ''
    };

    try {
      if (modalType === 'add') {
        await api.post('/products/', payload);
        setSuccessMsg('Product added successfully!');
      } else {
        await api.put(`/products/${selectedProduct.id}/`, payload);
        setSuccessMsg('Product updated successfully!');
      }
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || err.response?.data?.barcode?.[0] || 'Save action failed. Check values.');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product from the catalog?')) return;
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await api.delete(`/products/${id}/`);
      setSuccessMsg('Product deleted successfully!');
      fetchProducts();
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to delete product.');
    }
  };

  /** Called when scanner decodes a barcode */
  const handleBarcodeScan = async (code) => {
    setShowScanner(false);

    if (scannerMode === 'fill') {
      setBarcode(code);
      setSuccessMsg(`Barcode captured: ${code}`);
    } else if (scannerMode === 'find') {
      setSuccessMsg('');
      setErrorMsg('');
      try {
        const res = await api.get(`/products/by-barcode/?barcode=${encodeURIComponent(code)}`);
        openEditModal(res.data);
        setSuccessMsg(`Found product: "${res.data.name}"`);
      } catch (err) {
        if (err.response?.status === 404) {
          setErrorMsg(`No product found for barcode "${code}". You can add it manually.`);
        } else {
          setErrorMsg('Barcode lookup failed. Try again.');
        }
      }
    }
  };

  const openScanToFill = () => {
    setScannerMode('fill');
    setShowScanner(true);
  };

  const openScanToFind = () => {
    setScannerMode('find');
    setShowScanner(true);
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.barcode && p.barcode.includes(searchQuery))
  );

  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    } else if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [filteredProducts.length, currentPage, totalPages]);

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto bg-[#F8FAFC] text-[#111827] flex flex-col justify-start relative text-left">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 leading-none">Inventory Catalog</h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1.5 font-medium">Manage products, modify prices, restock units, and scan barcodes.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={openScanToFind}
            className="flex items-center justify-center space-x-1.5 bg-white hover:bg-slate-50 border border-slate-205 text-slate-755 font-semibold px-3.5 py-2 rounded-lg shadow-sm transition-all cursor-pointer text-xs active:scale-95 min-h-[44px]"
            title="Scan a barcode to instantly find & edit a product"
          >
            <FiZap className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Scan to Find</span>
          </button>

          <button
            onClick={openAddModal}
            className="bg-[#10B981] hover:bg-[#059669] text-white font-semibold px-4 py-2 rounded-lg flex items-center justify-center space-x-1.5 shadow-sm transition-colors cursor-pointer text-xs sm:text-sm active:scale-95 min-h-[44px]"
          >
            <FiPlus className="w-4 h-4" />
            <span>Add Catalog Item</span>
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <FiSearch className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by name, category, or barcode..."
            className="w-full bg-white border border-slate-200 focus:border-[#10B981] focus:ring-2 focus:ring-emerald-500/20 rounded-lg py-2 pl-9 pr-4 text-xs sm:text-sm text-slate-900 placeholder-slate-400 outline-none transition-all"
          />
        </div>
      </div>

      {/* Action alerts */}
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

      {/* Catalog Table */}
      {loading ? (
        <div className="bg-white border border-slate-200/60 rounded-lg p-6 h-60 animate-pulse shadow-sm">
          <div className="space-y-4">
            <div className="h-6 bg-slate-100 rounded w-1/4"></div>
            <div className="h-10 bg-slate-100 rounded"></div>
            <div className="h-10 bg-slate-100 rounded"></div>
            <div className="h-10 bg-slate-100 rounded"></div>
          </div>
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="bg-white border border-slate-200/60 rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/60 text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-50/50">
                  <th className="py-3 px-5">Image</th>
                  <th className="py-3 px-5">Item Details</th>
                  <th className="py-3 px-5">Category</th>
                  <th className="py-3 px-5">Barcode</th>
                  <th className="py-3 px-5">Expiry</th>
                  <th className="py-3 px-5 text-right">Price</th>
                  <th className="py-3 px-5 text-right">Stock Level</th>
                  <th className="py-3 px-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors text-xs sm:text-sm">
                    <td className="py-3.5 px-5">
                      <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200/50 flex items-center justify-center overflow-hidden">
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=100&q=80';
                            }}
                          />
                        ) : (
                          <FiBox className="w-4.5 h-4.5 text-slate-300" />
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <div>
                        <p className="font-semibold text-slate-900 leading-snug">{p.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 max-w-xs font-normal">{p.description || 'No description provided.'}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wide">
                        {p.category || 'General'}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      {p.barcode ? (
                        <span className="font-mono text-[10px] font-medium text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded tracking-widest">
                          {p.barcode}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No barcode</span>
                      )}
                    </td>
                    <td className="py-3.5 px-5">
                      {(() => {
                        if (!p.expiry_date) return (
                          <span className="text-[10px] text-slate-400 italic flex items-center gap-1"><FiClock className="w-3 h-3" />No date</span>
                        );
                        const today = new Date(); today.setHours(0,0,0,0);
                        const exp = new Date(p.expiry_date);
                        const daysLeft = Math.round((exp - today) / 86400000);
                        if (daysLeft < 0) return (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">
                            <span className="w-1 h-1 rounded-full bg-rose-500 inline-block"></span>EXPIRED
                          </span>
                        );
                        if (daysLeft <= 7) return (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                              <span className="w-1 h-1 rounded-full bg-amber-500 inline-block"></span>Expires {daysLeft}d
                            </span>
                          </div>
                        );
                        return (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                            <span className="w-1 h-1 rounded-full bg-emerald-500 inline-block"></span>{p.expiry_date}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-3.5 px-5 font-mono font-semibold text-slate-800 text-right">₹{parseFloat(p.price).toFixed(2)}</td>
                    <td className="py-3.5 px-5 text-right font-mono">
                      <div>
                        <p className={`font-semibold text-xs sm:text-sm leading-none ${p.stock_quantity > 10 ? 'text-slate-800' : p.stock_quantity > 0 ? 'text-amber-500' : 'text-rose-500'}`}>
                          {p.stock_quantity} units
                        </p>
                        <span className={`text-[9px] uppercase font-bold tracking-wider mt-0.5 inline-block ${p.stock_quantity > 0 ? 'text-emerald-500' : 'text-rose-400'}`}>
                          {p.stock_quantity > 0 ? 'In Stock' : 'Out of Stock'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-700 border border-slate-200 transition-all shadow-sm cursor-pointer"
                          title="Edit Product"
                        >
                          <FiEdit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 transition-all shadow-sm cursor-pointer"
                          title="Delete Product"
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
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent rounded-lg cursor-pointer transition-all"
              >
                &larr; Previous
              </button>
              <span className="text-xs font-semibold text-slate-400 font-mono">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent rounded-lg cursor-pointer transition-all"
              >
                Next &rarr;
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200/60 rounded-lg py-16 px-4 flex flex-col items-center justify-center space-y-3.5 text-center shadow-sm">
          <div className="bg-slate-50 p-3 rounded-lg text-slate-405">
            <FiBox className="w-6 h-6" />
          </div>
          <h3 className="text-slate-800 font-semibold text-sm">No products catalogued</h3>
          <p className="text-slate-400 text-xs max-w-sm text-center leading-normal">Add fresh items using the "Add Catalog Item" button to build the retail store inventory catalog.</p>
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-slate-205 rounded-xl p-6 sm:p-8 shadow-lg relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">

            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 p-1 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all cursor-pointer"
            >
              <FiX className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-semibold text-slate-950 mb-6 text-left tracking-tight">
              {modalType === 'add' ? 'Add Catalog Item' : 'Edit Product Details'}
            </h3>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Product Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-[#10B981] rounded-lg py-2 px-3 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all font-medium"
                  placeholder="e.g. Premium Basmati Rice"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-[#10B981] rounded-lg py-2 px-3 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all font-medium"
                  placeholder="e.g. Dairy, Grains, Oils"
                />
              </div>

              {/* Barcode field with scan button */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Barcode <span className="normal-case font-normal text-slate-400 ml-1">(EAN-13, UPC-A, Code-128…)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 focus:border-[#10B981] rounded-lg py-2 px-3 text-xs sm:text-sm font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all"
                    placeholder="Scan or type barcode..."
                  />
                  <button
                    type="button"
                    onClick={openScanToFill}
                    className="flex items-center space-x-1 bg-emerald-50 hover:bg-emerald-100 text-[#10B981] border border-emerald-100 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all active:scale-95"
                    title="Open camera to scan barcode"
                  >
                    <FiCamera className="w-3.5 h-3.5" />
                    <span>Scan</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">GST Rate Slab *</label>
                  <select
                    value={gstRate}
                    onChange={(e) => setGstRate(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-[#10B981] rounded-lg py-2 px-2 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all cursor-pointer font-medium"
                    required
                  >
                    <option value="0.00">0% GST</option>
                    <option value="5.00">5% GST</option>
                    <option value="12.00">12% GST</option>
                    <option value="18.00">18% GST</option>
                    <option value="28.00">28% GST</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">HSN Code</label>
                  <input
                    type="text"
                    value={hsnCode}
                    onChange={(e) => setHsnCode(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-[#10B981] rounded-lg py-2 px-3 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all font-medium"
                    placeholder="e.g. 1006"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 font-mono">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-sans">Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-[#10B981] rounded-lg py-2 px-3 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all"
                    placeholder="120.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-sans">Stock Level *</label>
                  <input
                    type="number"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-[#10B981] rounded-lg py-2 px-3 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all"
                    placeholder="50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Product Image</label>
                {/* Image preview */}
                {image ? (
                  <div className="relative mb-2 group">
                    <div className="w-full h-36 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
                      <img
                        src={image}
                        alt="Product preview"
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '';
                          e.target.alt = 'Failed to load';
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setImage('')}
                      className="absolute top-2 right-2 bg-white/90 hover:bg-rose-50 text-slate-400 hover:text-rose-500 p-1 rounded-full border border-slate-200 shadow-sm transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                      title="Remove image"
                    >
                      <FiX className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : null}
                {/* Upload button */}
                <label
                  className="flex flex-col items-center justify-center gap-1.5 w-full py-4 px-3 rounded-lg border-2 border-dashed border-slate-200 hover:border-[#10B981] bg-white hover:bg-emerald-50/10 cursor-pointer transition-all group"
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 5 * 1024 * 1024) {
                        setErrorMsg('Image must be less than 5 MB.');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        setImage(ev.target.result);
                      };
                      reader.readAsDataURL(file);
                      e.target.value = '';
                    }}
                  />
                  <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-emerald-50 flex items-center justify-center transition-colors">
                    <FiCamera className="w-4 h-4 text-slate-400 group-hover:text-[#10B981]" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold text-slate-500 group-hover:text-[#10B981] transition-colors">
                      {image ? 'Change Image' : 'Add from Gallery'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, WebP — max 5 MB</p>
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows="3"
                  className="w-full bg-white border border-slate-200 focus:border-[#10B981] rounded-lg py-2 px-3 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all resize-none font-medium"
                  placeholder="Describe grocery unit, features, or weight details..."
                ></textarea>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  <span className="flex items-center gap-1.5"><FiClock className="w-3.5 h-3.5 text-slate-400" />Expiry Date <span className="normal-case font-normal text-slate-400 ml-1">(optional)</span></span>
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-[#10B981] rounded-lg py-2 px-3 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all font-mono"
                />
                {expiryDate && (() => {
                  const today = new Date(); today.setHours(0,0,0,0);
                  const exp = new Date(expiryDate);
                  const daysLeft = Math.round((exp - today) / 86400000);
                  if (daysLeft < 0) return <p className="mt-1 text-[11px] text-rose-500 font-semibold">⚠️ This date is already in the past (expired {Math.abs(daysLeft)} day(s) ago)</p>;
                  if (daysLeft <= 7) return <p className="mt-1 text-[11px] text-amber-500 font-semibold">⚠️ Expires in {daysLeft} day(s) — consider discounting</p>;
                  return <p className="mt-1 text-[11px] text-emerald-500 font-semibold">✓ Expires in {daysLeft} day(s)</p>;
                })()}
              </div>

              {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-600 p-3 rounded-lg text-xs flex items-center space-x-2">
                  <FiAlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 font-semibold py-2.5 px-4 rounded-lg transition-colors cursor-pointer text-center text-xs sm:text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-[#10B981] hover:bg-[#059669] text-white font-semibold py-2.5 px-4 rounded-lg shadow-sm active:scale-[0.98] transition-all cursor-pointer text-center text-xs sm:text-sm"
                >
                  {modalType === 'add' ? 'Create Item' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          title={scannerMode === 'fill' ? 'Scan Product Barcode' : 'Scan to Find Product'}
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}

    </div>
  );
};

export default ProductManagement;
