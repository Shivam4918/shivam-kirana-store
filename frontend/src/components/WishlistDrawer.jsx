import React, { useState, useContext, useMemo } from 'react';
import { CartContext } from '../context/CartContext';
import { FiX, FiHeart, FiTrash2, FiShoppingCart, FiSearch } from 'react-icons/fi';
import api from '../services/api';

const WishlistDrawer = ({ isOpen, onClose, wishlistItems, setWishlistItems, setWishlistIds, showToast }) => {
  const { addToCart } = useContext(CartContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // newest, name, price-low, price-high
  const [clearing, setClearing] = useState(false);

  if (!isOpen) return null;

  // Filter and sort items based on search query and sort option
  const sortedItems = useMemo(() => {
    const filtered = wishlistItems.filter((item) => {
      const name = item.product_details?.name || item.product_name || '';
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        const nameA = a.product_details?.name || a.product_name || '';
        const nameB = b.product_details?.name || b.product_name || '';
        return nameA.localeCompare(nameB);
      }
      if (sortBy === 'price-low') {
        const priceA = parseFloat(a.product_details?.price || a.product_price || 0);
        const priceB = parseFloat(b.product_details?.price || b.product_price || 0);
        return priceA - priceB;
      }
      if (sortBy === 'price-high') {
        const priceA = parseFloat(a.product_details?.price || a.product_price || 0);
        const priceB = parseFloat(b.product_details?.price || b.product_price || 0);
        return priceB - priceA;
      }
      // Default: newest first (higher ID or newer date)
      return b.id - a.id;
    });
  }, [wishlistItems, searchQuery, sortBy]);

  const handleRemove = async (productId) => {
    try {
      await api.post('/wishlist/toggle/', { product_id: productId });
      setWishlistItems((prev) => prev.filter((item) => item.product !== productId));
      setWishlistIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
      showToast('Product removed from wishlist.');
    } catch (err) {
      console.error(err);
      showToast('Failed to remove item.', 'error');
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to clear your entire wishlist?')) {
      setClearing(true);
      try {
        await api.post('/wishlist/clear/');
        setWishlistItems([]);
        setWishlistIds(new Set());
        showToast('Wishlist cleared.');
      } catch (err) {
        console.error(err);
        showToast('Failed to clear wishlist.', 'error');
      } finally {
        setClearing(false);
      }
    }
  };

  const handleMoveAllToCart = () => {
    let movedCount = 0;
    sortedItems.forEach((item) => {
      // Only move available products
      if (item.product_details && item.product_details.stock_quantity > 0) {
        addToCart(item.product_details);
        movedCount++;
      }
    });

    if (movedCount > 0) {
      showToast(`Moved ${movedCount} items to your cart.`);
      // Clear wishlist after moving
      api.post('/wishlist/clear/')
        .then(() => {
          setWishlistItems([]);
          setWishlistIds(new Set());
        })
        .catch((err) => console.error(err));
    } else {
      showToast('No active, in-stock products to move.', 'info');
    }
  };

  const handleAddSingleToCart = (product) => {
    const res = addToCart(product);
    if (res && res.success === false) {
      showToast(res.message, 'error');
    } else {
      showToast(`${product.name} added to cart!`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs font-sans">
      {/* Backdrop overlay */}
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

      {/* Slide drawer container */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between text-left z-10 animate-in slide-in-from-right duration-250">
        
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <FiHeart className="w-5 h-5 text-rose-500 fill-current" />
            <h2 className="text-base font-bold text-slate-800">My Wishlist</h2>
            <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full font-mono">
              {wishlistItems.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Filters and Actions Bar (if wishlist has items) */}
        {wishlistItems.length > 0 && (
          <div className="p-4 border-b border-slate-100 bg-white space-y-3">
            {/* Search and Sort */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <FiSearch className="w-3.5 h-3.5" />
                </span>
                <input
                  type="text"
                  placeholder="Search favorites..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#10B981] rounded-lg py-1.5 pl-8 pr-3 text-xs font-medium text-slate-805 outline-none transition-all"
                />
              </div>

              <div className="w-36 relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#10B981] rounded-lg py-1.5 px-2 text-xs font-semibold text-slate-700 outline-none transition-all cursor-pointer"
                >
                  <option value="newest">Newest First</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="price-low">Price: Low-High</option>
                  <option value="price-high">Price: High-Low</option>
                </select>
              </div>
            </div>

            {/* Bulk Actions */}
            <div className="flex items-center justify-between text-xs pt-1">
              <button
                onClick={handleMoveAllToCart}
                className="text-[#10B981] hover:text-[#059669] font-bold flex items-center space-x-1 transition-colors cursor-pointer"
              >
                <FiShoppingCart className="w-3.5 h-3.5" />
                <span>Move All to Cart</span>
              </button>

              <button
                onClick={handleClearAll}
                disabled={clearing}
                className="text-rose-500 hover:text-rose-600 font-bold flex items-center space-x-1 transition-colors cursor-pointer disabled:opacity-50"
              >
                <FiTrash2 className="w-3.5 h-3.5" />
                <span>Clear Wishlist</span>
              </button>
            </div>
          </div>
        )}

        {/* Wishlist Items List (Scrollable Area) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/30">
          {sortedItems.length > 0 ? (
            sortedItems.map((item) => {
              const product = item.product_details;
              const isUnavailable = !product;
              const name = product?.name || item.product_name || 'Deleted Product';
              const price = product?.price || item.product_price || '0.00';
              const image = product?.image || item.product_image;
              const isOutOfStock = product && product.stock_quantity <= 0;

              return (
                <div
                  key={item.id}
                  className="bg-white border border-slate-100 rounded-xl p-3 flex space-x-3.5 shadow-sm hover:shadow-md transition-all duration-200 animate-in fade-in-50"
                >
                  {/* Image */}
                  <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                    {image ? (
                      <img
                        src={image}
                        alt={name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80';
                        }}
                      />
                    ) : (
                      <FiHeart className="w-6 h-6 text-slate-300" />
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-bold text-slate-800 truncate" title={name}>
                          {name}
                        </h4>
                        <button
                          onClick={() => handleRemove(item.product)}
                          className="text-slate-450 hover:text-rose-500 p-0.5 rounded transition-colors cursor-pointer"
                          title="Remove from wishlist"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs font-bold text-slate-900 font-mono font-medium">₹{parseFloat(price).toFixed(2)}</span>
                        {isUnavailable ? (
                          <span className="bg-slate-100 text-slate-500 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border border-slate-200 font-sans">
                            Currently Unavailable
                          </span>
                        ) : isOutOfStock ? (
                          <span className="bg-rose-50 text-rose-600 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border border-rose-100 font-sans">
                            Sold Out
                          </span>
                        ) : (
                          <span className="bg-emerald-50 text-[#10B981] text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border border-emerald-100 font-sans">
                            In Stock
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action button */}
                    <div className="mt-2.5">
                      {isUnavailable ? (
                        <button
                          disabled
                          className="w-full bg-slate-100 text-slate-400 border border-slate-200 text-[10px] font-bold py-1.5 px-3 rounded-lg cursor-not-allowed text-center"
                        >
                          Unavailable
                        </button>
                      ) : isOutOfStock ? (
                        <button
                          disabled
                          className="w-full bg-slate-50 text-slate-400 border border-slate-200 text-[10px] font-bold py-1.5 px-3 rounded-lg cursor-not-allowed text-center"
                        >
                          Out of Stock
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAddSingleToCart(product)}
                          className="w-full bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg flex items-center justify-center space-x-1.5 transition-all duration-205 cursor-pointer active:scale-[0.98]"
                        >
                          <FiShoppingCart className="w-3 h-3" />
                          <span>Add to Cart</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            /* Empty State */
            <div className="h-full flex flex-col items-center justify-center text-center px-6 py-12 space-y-4">
              <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center shadow-xs">
                <FiHeart className="w-7 h-7" />
              </div>
              <div className="space-y-1 max-w-xs">
                <h3 className="text-sm font-bold text-slate-800">No favorite products yet</h3>
                <p className="text-xs text-slate-400 font-medium leading-relaxed font-normal">
                  {searchQuery ? "No matches found for your search query." : "Start adding products you love by clicking the heart button."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="w-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer shadow-xs active:scale-[0.98]"
          >
            Close Wishlist
          </button>
        </div>

      </div>
    </div>
  );
};

export default React.memo(WishlistDrawer);
