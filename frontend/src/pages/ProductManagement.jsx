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
      // Fill the barcode field in the form
      setBarcode(code);
      setSuccessMsg(`Barcode captured: ${code}`);
    } else if (scannerMode === 'find') {
      // Find a product by this barcode
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
    <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto bg-slate-50/50 text-[#111827] flex flex-col justify-start relative text-left">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-poppins font-extrabold text-secondary">Inventory Catalog</h2>
          <p className="text-[#6B7280] text-xs sm:text-sm">Manage products, modify prices, restock units, and scan barcodes.</p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Scan to Find button */}
          <button
            onClick={openScanToFind}
            className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-secondary font-bold px-3.5 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer text-xs active:scale-95"
            title="Scan a barcode to instantly find & edit a product"
          >
            <FiZap className="w-4 h-4 text-primary" />
            <span>Scan to Find</span>
          </button>

          <button
            onClick={openAddModal}
            className="bg-primary hover:bg-primary-hover text-white font-bold px-4.5 py-2.5 rounded-xl flex items-center justify-center space-x-2 shadow-sm hover:shadow-md transition-all cursor-pointer text-xs sm:text-sm active:scale-95"
          >
            <FiPlus className="w-4.5 h-4.5" />
            <span>Add Catalog Item</span>
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <FiSearch className="w-4.5 h-4.5" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by name, category, or barcode..."
            className="w-full bg-white border border-slate-200 focus:border-primary rounded-xl py-2 pl-9 pr-4 text-xs sm:text-sm text-text-primary placeholder-slate-400 outline-none transition-all focus:ring-2 focus:ring-emerald-100"
          />
        </div>
      </div>

      {/* Action alerts */}
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

      {/* Catalog Table */}
      {loading ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 h-60 animate-pulse shadow-sm"></div>
      ) : filteredProducts.length > 0 ? (
        <div className="bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-150 text-[10px] uppercase font-bold tracking-wider text-[#6B7280] bg-slate-50/70">
                  <th className="py-4 px-6">Image</th>
                  <th className="py-4 px-6">Item Details</th>
                  <th className="py-4 px-6">Category</th>
                  <th className="py-4 px-6">Barcode</th>
                  <th className="py-4 px-6">Expiry</th>
                  <th className="py-4 px-6 text-right">Price per unit</th>
                  <th className="py-4 px-6 text-right">Stock Level</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors text-xs sm:text-sm">
                    <td className="py-4 px-6">
                      <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center overflow-hidden">
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
                          <FiBox className="w-5 h-5 text-slate-350" />
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-bold text-secondary text-sm sm:text-base leading-snug">{p.name}</p>
                        <p className="text-xs text-text-secondary mt-1 font-light leading-normal line-clamp-1 max-w-xs">{p.description || 'No description provided.'}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-[10px] font-extrabold text-secondary bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md uppercase tracking-wide">
                        {p.category || 'General'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {p.barcode ? (
                        <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md tracking-widest">
                          {p.barcode}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No barcode</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {(() => {
                        if (!p.expiry_date) return (
                          <span className="text-[10px] text-slate-400 italic flex items-center gap-1"><FiClock className="w-3 h-3" />No date</span>
                        );
                        const today = new Date(); today.setHours(0,0,0,0);
                        const exp = new Date(p.expiry_date);
                        const daysLeft = Math.round((exp - today) / 86400000);
                        if (daysLeft < 0) return (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block"></span>EXPIRED
                          </span>
                        );
                        if (daysLeft <= 7) return (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>Expires in {daysLeft}d
                            </span>
                          </div>
                        );
                        return (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>{p.expiry_date}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-4 px-6 font-extrabold text-secondary text-right">₹{parseFloat(p.price).toFixed(2)}</td>
                    <td className="py-4 px-6 text-right">
                      <div>
                        <p className={`font-bold text-sm leading-none ${p.stock_quantity > 10 ? 'text-secondary' : p.stock_quantity > 0 ? 'text-amber-500' : 'text-rose-500'}`}>
                          {p.stock_quantity} units
                        </p>
                        <span className={`text-[9.5px] uppercase font-bold tracking-wider mt-1 inline-block ${p.stock_quantity > 0 ? 'text-primary' : 'text-rose-400'}`}>
                          {p.stock_quantity > 0 ? 'In Stock' : 'Out of Stock'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-2.5 rounded-xl bg-white hover:bg-emerald-50 text-text-secondary hover:text-primary border border-slate-200 hover:border-emerald-250 transition-all shadow-sm cursor-pointer"
                          title="Edit Product"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-2.5 rounded-xl bg-white hover:bg-rose-50 text-text-secondary hover:text-rose-500 border border-slate-200 hover:border-rose-250 transition-all shadow-sm cursor-pointer"
                          title="Delete Product"
                        >
                          <FiTrash2 className="w-4 h-4" />
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
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/30">
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3.5 py-2 text-xs font-bold text-secondary border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent rounded-xl cursor-pointer transition-all flex items-center space-x-1"
              >
                <span>&larr; Previous</span>
              </button>
              <span className="text-xs font-medium text-text-secondary">
                Page <span className="font-bold text-secondary">{currentPage}</span> of <span className="font-bold text-secondary">{totalPages}</span>
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3.5 py-2 text-xs font-bold text-secondary border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent rounded-xl cursor-pointer transition-all flex items-center space-x-1"
              >
                <span>Next &rarr;</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl py-16 px-4 flex flex-col items-center justify-center space-y-3.5 text-center shadow-sm">
          <div className="bg-slate-100 p-4 rounded-full text-slate-350">
            <FiBox className="w-8 h-8" />
          </div>
          <h3 className="text-secondary font-bold text-lg">No products catalogued</h3>
          <p className="text-text-secondary text-sm max-w-sm text-center">Add fresh items using the "Add Catalog Item" button to build the retail store inventory catalog.</p>
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-premium-lg relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">

            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-secondary p-1.5 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-full transition-all cursor-pointer"
            >
              <FiX className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-poppins font-extrabold text-secondary mb-6 text-left">
              {modalType === 'add' ? 'Add Catalog Item' : 'Edit Product Details'}
            </h3>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Product Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-primary rounded-xl py-2.5 px-4 text-sm text-[#111827] focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                  placeholder="e.g. Premium Basmati Rice"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-primary rounded-xl py-2.5 px-4 text-sm text-[#111827] focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                  placeholder="e.g. Dairy, Grains, Oils"
                />
              </div>

              {/* Barcode field with scan button */}
              <div>
                <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">
                  Barcode <span className="normal-case font-normal text-slate-400 ml-1">(EAN-13, UPC-A, Code-128…)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 focus:border-primary rounded-xl py-2.5 px-4 text-sm font-mono text-[#111827] focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                    placeholder="Scan or type barcode..."
                  />
                  <button
                    type="button"
                    onClick={openScanToFill}
                    className="flex items-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 text-primary border border-emerald-200 px-3 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95"
                    title="Open camera to scan barcode"
                  >
                    <FiCamera className="w-4 h-4" />
                    <span>Scan</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">GST Rate Slab *</label>
                  <select
                    value={gstRate}
                    onChange={(e) => setGstRate(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-primary rounded-xl py-2.5 px-3 text-sm text-[#111827] focus:ring-2 focus:ring-emerald-100 outline-none transition-all cursor-pointer"
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
                  <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">HSN Code</label>
                  <input
                    type="text"
                    value={hsnCode}
                    onChange={(e) => setHsnCode(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-primary rounded-xl py-2.5 px-4 text-sm text-[#111827] focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                    placeholder="e.g. 1006"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-primary rounded-xl py-2.5 px-4 text-sm text-[#111827] focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                    placeholder="120.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Stock Level *</label>
                  <input
                    type="number"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-primary rounded-xl py-2.5 px-4 text-sm text-[#111827] focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                    placeholder="50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Product Image</label>
                {/* Image preview */}
                {image ? (
                  <div className="relative mb-2 group">
                    <div className="w-full h-40 rounded-xl border-2 border-emerald-200 bg-emerald-50/30 overflow-hidden flex items-center justify-center">
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
                      className="absolute top-2 right-2 bg-white/90 hover:bg-rose-50 text-slate-400 hover:text-rose-500 p-1.5 rounded-full border border-slate-200 hover:border-rose-200 shadow-sm transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                      title="Remove image"
                    >
                      <FiX className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : null}
                {/* Upload button */}
                <label
                  className="flex flex-col items-center justify-center gap-2 w-full py-4 px-4 rounded-xl border-2 border-dashed border-slate-200 hover:border-primary bg-white hover:bg-emerald-50/30 cursor-pointer transition-all group"
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
                  <div className="w-10 h-10 rounded-full bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                    <FiCamera className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-secondary group-hover:text-primary transition-colors">
                      {image ? 'Change Image' : 'Add from Gallery'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, WebP — max 5 MB</p>
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows="3"
                  className="w-full bg-white border border-slate-200 focus:border-primary rounded-xl py-2.5 px-4 text-sm text-[#111827] focus:ring-2 focus:ring-emerald-100 outline-none transition-all resize-none"
                  placeholder="Describe grocery unit, features, or weight details..."
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">
                  <span className="flex items-center gap-1.5"><FiClock className="w-3.5 h-3.5" />Expiry Date <span className="normal-case font-normal text-slate-400 ml-1">(optional)</span></span>
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-primary rounded-xl py-2.5 px-4 text-sm text-[#111827] focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
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
                <div className="bg-rose-50 border border-rose-200 text-rose-600 p-3 rounded-xl text-xs flex items-center space-x-2">
                  <FiAlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/2 bg-white border border-slate-200 hover:bg-slate-50 text-text-secondary font-semibold py-3 px-4 rounded-xl transition-all cursor-pointer text-center text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-primary hover:bg-primary-hover text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-emerald-500/10 active:scale-[0.98] transition-all cursor-pointer text-center text-sm"
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
