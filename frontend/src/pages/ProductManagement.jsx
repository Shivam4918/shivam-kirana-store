import { useState, useEffect } from 'react';
import api from '../services/api';
import { FiEdit2, FiTrash2, FiPlus, FiSearch, FiBox, FiX, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
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
      image: image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80'
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
      setErrorMsg(err.response?.data?.detail || 'Save action failed. Check values.');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product from the catalog?')) {
      return;
    }
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

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto bg-slate-50/50 text-[#111827] flex flex-col justify-start relative text-left">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-poppins font-extrabold text-secondary">Inventory Catalog</h2>
          <p className="text-[#6B7280] text-xs sm:text-sm">Manage products listed on the storefront, modify prices, and restock units.</p>
        </div>

        <button
          onClick={openAddModal}
          className="bg-primary hover:bg-primary-hover text-white font-bold px-4.5 py-2.5 rounded-xl flex items-center justify-center space-x-2 shadow-sm hover:shadow-md transition-all cursor-pointer text-xs sm:text-sm active:scale-95"
        >
          <FiPlus className="w-4.5 h-4.5" />
          <span>Add Catalog Item</span>
        </button>
      </div>

      {/* Utilities: Search bar */}
      <div className="flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <FiSearch className="w-4.5 h-4.5" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search catalog by name or category..."
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
                  <th className="py-4 px-6 text-right">Price per unit</th>
                  <th className="py-4 px-6 text-right">Stock Level</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => (
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
          <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-premium-lg relative animate-in fade-in zoom-in-95 duration-200">
            
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-secondary p-1.5 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-full transition-all cursor-pointer"
            >
              <FiX className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-poppins font-extrabold text-secondary mb-6 text-left">
              {modalType === 'add' ? 'Add Catalog Item' : 'Edit Product details'}
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
                <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Image URL</label>
                <input
                  type="url"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-primary rounded-xl py-2.5 px-4 text-sm text-[#111827] focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                  placeholder="https://images.unsplash.com/..."
                />
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

    </div>
  );
};

export default ProductManagement;
