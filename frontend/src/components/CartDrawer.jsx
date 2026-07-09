import { useContext, useState, useEffect } from 'react';
import { CartContext } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import { 
  FiX, FiMinus, FiPlus, FiTrash2, FiShoppingBag, FiInfo, 
  FiCheckCircle, FiLock, FiGift, FiTruck, FiAlertCircle 
} from 'react-icons/fi';
import api from '../services/api';
import OptimizedImage from './OptimizedImage';

const CartDrawer = () => {
  const { user } = useContext(AuthContext);
  const {
    cart,
    updateQuantity,
    removeFromCart,
    clearCart,
    cartSubtotal,
    cartSavings,
    cartTotal,
    redeemPoints,
    setRedeemPoints,
    isCartOpen,
    setIsCartOpen
  } = useContext(CartContext);

  const [checkingOut, setCheckingOut] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [summaryData, setSummaryData] = useState(null);
  const [placedOrder, setPlacedOrder] = useState(null);

  // Fetch latest loyalty points and credit balances when cart opens
  useEffect(() => {
    if (isCartOpen && user && user.role === 'CUSTOMER') {
      setSuccess(false);
      setErrorMsg('');
      api.get('/customer/summary/')
        .then(res => setSummaryData(res.data))
        .catch(err => console.error('Error fetching checkout summary info:', err));
    }
  }, [isCartOpen, user]);

  if (!isCartOpen || !user || user.role !== 'CUSTOMER') return null;

  const handleCheckout = async () => {
    setCheckingOut(true);
    setErrorMsg('');
    try {
      const itemsPayload = cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity
      }));

      const res = await api.post('/orders/', {
        items: itemsPayload,
        redeem_points: redeemPoints
      });

      setPlacedOrder(res.data);
      setSuccess(true);
      clearCart();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || 'Order placement failed. Please try again.');
    } finally {
      setCheckingOut(false);
    }
  };

  const handleDone = () => {
    setIsCartOpen(false);
    setSuccess(false);
    setPlacedOrder(null);
    window.location.reload();
  };

  const loyaltyPoints = summaryData?.loyalty_points || 0;
  const currentBalance = summaryData?.current_balance !== undefined ? summaryData.current_balance : (summaryData?.khata_balance || 0);
  const creditLimit = summaryData?.credit_limit || 0;
  const remainingCredit = Math.max(0, creditLimit - currentBalance);

  // Maximum redeemable discount is either the total points or the subtotal sum
  const pointsRedeemDiscount = redeemPoints ? Math.min(loyaltyPoints, Math.floor(cartSubtotal)) : 0;
  const finalBillAmount = Math.max(0, cartSubtotal - cartSavings - pointsRedeemDiscount);

  const isOverCreditLimit = (currentBalance + finalBillAmount) > creditLimit;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs font-sans">
      {/* Backdrop overlay */}
      <div 
        className="absolute inset-0 cursor-pointer"
        onClick={() => setIsCartOpen(false)}
      />

      {/* Slide drawer container */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between text-left z-10 animate-in slide-in-from-right duration-250">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FiShoppingBag className="w-5 h-5 text-[#10B981]" />
            <h3 className="font-semibold text-slate-950 text-sm sm:text-base tracking-tight">My Basket</h3>
            <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
              {cart.length} item{cart.length !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-1.5 rounded-lg border border-transparent hover:border-slate-100 hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {success ? (
            <div className="py-12 px-2 text-center space-y-6 animate-in fade-in duration-300">
              <div className="w-16 h-16 bg-emerald-50 text-[#10B981] rounded-full flex items-center justify-center border border-emerald-100 mx-auto animate-bounce">
                <FiCheckCircle className="w-8 h-8" />
              </div>
              
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-base">Order Placed Successfully!</h4>
                <p className="text-xs text-slate-550 max-w-xs mx-auto leading-relaxed">
                  Your order is registered and inventory is reserved. Our team is preparing your items for pickup.
                </p>
              </div>

              {placedOrder && (
                <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-4.5 text-xs text-left space-y-3 font-medium">
                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-200/50">
                    <span className="text-slate-400">Order Number</span>
                    <span className="font-extrabold text-slate-900 font-mono">{placedOrder.order_number}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-200/50">
                    <span className="text-slate-400">Status</span>
                    <span className="bg-amber-50 text-amber-600 border border-amber-100 font-extrabold px-2 py-0.5 rounded text-[10px] uppercase font-mono">
                      Order Received
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-200/50">
                    <span className="text-slate-400">Pickup Location</span>
                    <span className="text-slate-800 font-bold">HSR Layout, Bangalore</span>
                  </div>
                  <div className="flex justify-between items-center pt-0.5">
                    <span className="text-slate-450 font-bold">Total Due at Pickup</span>
                    <span className="text-sm font-extrabold text-slate-955 font-mono">₹{placedOrder.grand_total.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="bg-emerald-50/30 border border-dashed border-emerald-200/60 rounded-xl p-4 text-[11px] text-emerald-800 leading-relaxed text-left flex items-start space-x-2">
                <FiInfo className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                <span>
                  <strong>Pay at Pickup:</strong> Payment will be settled when you collect your order. You can pay via UPI QR, cash, or credit ledger at the store counter.
                </span>
              </div>

              <button
                onClick={handleDone}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer text-xs"
              >
                Continue Shopping
              </button>
            </div>
          ) : cart.length === 0 ? (
            <div className="py-20 text-center space-y-3.5">
              <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center border border-slate-200 mx-auto">
                <FiShoppingBag className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-slate-900 text-xs">Your basket is empty</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Browse catalog and add items to place a credit checkout.
              </p>
              <button
                onClick={() => setIsCartOpen(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            <>
              {/* Cart List */}
              <div className="space-y-3">
                {cart.map((item) => (
                  <div 
                    key={item.product.id}
                    className="flex items-start space-x-3.5 p-3.5 bg-slate-50/50 border border-slate-200/60 rounded-lg"
                  >
                    {/* Item Image */}
                    <div className="w-12 h-12 bg-white border border-slate-100 rounded-lg overflow-hidden shrink-0 flex items-center justify-center relative">
                      {item.product.image ? (
                        <OptimizedImage 
                          src={item.product.image} 
                          alt={item.product.name} 
                          className="w-full h-full object-cover"
                          width={120}
                        />
                      ) : (
                        <FiShoppingBag className="w-5 h-5 text-slate-300" />
                      )}
                    </div>

                    {/* Details & Controls */}
                    <div className="flex-1 flex flex-col justify-between text-left h-max">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[8.5px] uppercase font-bold tracking-widest text-[#10B981] font-mono">
                            {item.product.category || 'General'}
                          </span>
                          <h4 className="font-semibold text-xs text-slate-900 truncate max-w-[160px] leading-tight">
                            {item.product.name}
                          </h4>
                          <span className="text-[9.5px] text-slate-400 block mt-0.5">
                            {item.product.stock_quantity <= 5 ? `Only ${item.product.stock_quantity} left` : 'In Stock'}
                          </span>
                        </div>
                        <span className="font-semibold text-xs text-slate-900 font-mono">
                          ₹{(item.product.price * item.quantity).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        {/* Quantity Counter */}
                        <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-lg p-0.5">
                          <button
                            onClick={() => {
                              if (item.quantity === 1) {
                                removeFromCart(item.product.id);
                              } else {
                                updateQuantity(item.product.id, -1);
                              }
                            }}
                            className="p-1 hover:bg-slate-50 text-slate-500 rounded cursor-pointer"
                          >
                            <FiMinus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-mono font-bold text-slate-800 px-2 min-w-[14px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.product.id, 1)}
                            className="p-1 hover:bg-slate-50 text-slate-500 rounded cursor-pointer"
                          >
                            <FiPlus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Remove button */}
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-slate-400 hover:text-rose-500 p-1 transition-colors cursor-pointer"
                          title="Remove item"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Loyalty points toggle */}
              {loyaltyPoints > 0 && (
                <div className="bg-emerald-50/40 border border-emerald-100 rounded-lg p-4 flex items-center justify-between text-xs">
                  <div className="flex items-start space-x-2.5">
                    <FiGift className="text-[#10B981] w-4.5 h-4.5 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-slate-900 leading-tight">Redeem Loyalty Points</h4>
                      <p className="text-[10px] text-slate-450 mt-0.5">
                        Available balance: <span className="font-bold text-[#10B981]">{loyaltyPoints} points</span> (₹1 = 1 point)
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={redeemPoints}
                      onChange={(e) => setRedeemPoints(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#10B981]" />
                  </label>
                </div>
              )}

              {/* Credit Limit utilization check */}
              {summaryData && (
                <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-lg text-xs space-y-1.5 font-medium">
                  <div className="flex justify-between items-center text-slate-450">
                    <span>Credit Limit status</span>
                    <span className="text-slate-800 font-semibold font-mono">
                      ₹{currentBalance.toFixed(2)} / ₹{creditLimit.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-450">
                    <span>Available credit buffer</span>
                    <span className={`font-bold font-mono ${remainingCredit < finalBillAmount ? 'text-rose-600' : 'text-[#10B981]'}`}>
                      ₹{remainingCredit.toFixed(2)}
                    </span>
                  </div>
                  {isOverCreditLimit && (
                    <div className="flex items-start space-x-1.5 text-rose-600 bg-rose-50 border border-rose-100 p-2 rounded mt-2 text-[10.5px]">
                      <FiLock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>
                        Purchase total exceeds your remaining credit limit by ₹{(finalBillAmount - remainingCredit).toFixed(2)}. Please settle ledger statement balance.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Bill Details */}
              <div className="border-t border-slate-100 pt-4 space-y-2 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Bill details</span>
                
                <div className="flex justify-between items-center text-slate-500">
                  <span>Items subtotal</span>
                  <span className="font-semibold text-slate-800 font-mono">₹{cartSubtotal.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center text-slate-500">
                  <span>Promotional savings (5%)</span>
                  <span className="font-semibold text-[#10B981] font-mono">-₹{cartSavings.toFixed(2)}</span>
                </div>

                {redeemPoints && pointsRedeemDiscount > 0 && (
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Points discount</span>
                    <span className="font-semibold text-emerald-600 font-mono">-₹{pointsRedeemDiscount.toFixed(2)}</span>
                  </div>
                )}



                <div className="flex justify-between items-center text-sm font-bold text-slate-900 border-t border-slate-100 pt-2">
                  <span>Grand Total</span>
                  <span className="font-mono text-base">₹{finalBillAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Error Alert Box */}
              {errorMsg && (
                <div className="flex items-start space-x-2 p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-lg text-xs leading-normal">
                  <FiAlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer actions */}
        {cart.length > 0 && !success && (
          <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50">
            <button
              onClick={handleCheckout}
              disabled={checkingOut}
              className="w-full bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center space-x-1.5 shadow-sm active:scale-[0.98] transition-colors cursor-pointer text-xs sm:text-sm"
            >
              {checkingOut ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Place Pickup Order</span>
                  <span>&rarr;</span>
                </>
              )}
            </button>
            <p className="text-[9.5px] text-slate-400 text-center mt-2.5 leading-normal">
              No immediate payment required. Items will be reserved and prepared for pickup. Payment completed at store.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default CartDrawer;
