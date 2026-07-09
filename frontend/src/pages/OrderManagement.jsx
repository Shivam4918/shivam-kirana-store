import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { useRealTime } from '../context/RealTimeContext';
import { 
  FiSearch, FiCheck, FiX, FiDollarSign, FiCreditCard, 
  FiBook, FiRefreshCw, FiClipboard, FiTruck, FiAlertCircle 
} from 'react-icons/fi';
import { motion } from 'framer-motion';

const ORDER_STATUS_DETAILS = {
  ORDER_RECEIVED: { label: 'New Orders', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  PREPARING: { label: 'Preparing', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  READY_FOR_PICKUP: { label: 'Ready for Pickup', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  PAYMENT_PENDING: { label: 'Awaiting Payment', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  PAYMENT_COMPLETED: { label: 'Paid Orders', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ADDED_TO_KHATA: { label: 'Added to Khata', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  COLLECTED: { label: 'Collected Orders', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  COMPLETED: { label: 'Completed Orders', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CANCELLED: { label: 'Cancelled Orders', color: 'bg-rose-50 text-rose-700 border-rose-200' }
};

export default function OrderManagement() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [counters, setCounters] = useState({});

  // Action states
  const [verifyingOrder, setVerifyingOrder] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [payingOrder, setPayingOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [transactionId, setTransactionId] = useState('');
  const [onlinePaymentMethod, setOnlinePaymentMethod] = useState('UPI');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { subscribe } = useRealTime();

  useEffect(() => {
    fetchOrdersAndStats(false);

    // Poll for new orders and status updates every 5 seconds
    const interval = setInterval(() => {
      fetchOrdersAndStats(true);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Add real-time synchronization for order updates
    const unsubscribeCreated = subscribe('ORDER_CREATED', (newOrder) => {
      setOrders(prev => {
        if (prev.some(o => o.id === newOrder.id)) return prev;
        return [newOrder, ...prev];
      });
      // Sync stats counts instantly
      api.get('/admin/analytics/').then(res => {
        setCounters(res.data.order_stats || {});
      }).catch(err => console.error(err));
    });

    const unsubscribeUpdated = subscribe('ORDER_UPDATED', (updatedOrder) => {
      setOrders(prev =>
        prev.map(o => (o.id === updatedOrder.id ? updatedOrder : o))
      );
      // Sync stats counts instantly
      api.get('/admin/analytics/').then(res => {
        setCounters(res.data.order_stats || {});
      }).catch(err => console.error(err));
    });

    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
    };
  }, [subscribe]);

  const fetchOrdersAndStats = async (isPoll = false) => {
    try {
      if (!isPoll) setLoading(true);
      const [ordersRes, statsRes] = await Promise.all([
        api.get('/orders/'),
        api.get('/admin/analytics/')
      ]);
      setOrders(ordersRes.data);
      setCounters(statsRes.data.order_stats || {});
    } catch (err) {
      console.error('Error loading order management details:', err);
    } finally {
      if (!isPoll) setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await api.post(`/orders/${orderId}/update-status/`, { status: newStatus });
      setSuccessMessage(`Order updated to status: ${newStatus}`);
      fetchOrdersAndStats();
    } catch (err) {
      setErrorMessage(err.response?.data?.detail || 'Failed to update order status.');
    }
  };

  const handleVerifyPickup = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await api.post(`/orders/${verifyingOrder.id}/verify-pickup/`, {
        pickup_code: verificationCode
      });
      setSuccessMessage('Pickup verification successful! Ready to record payment.');
      setVerifyingOrder(null);
      setVerificationCode('');
      fetchOrdersAndStats();
    } catch (err) {
      setErrorMessage(err.response?.data?.detail || 'Verification code mismatch.');
    }
  };

  const handleRecordPayment = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const payload = { payment_method: paymentMethod };
      if (paymentMethod === 'ONLINE') {
        payload.transaction_id = transactionId;
        payload.online_payment_method = onlinePaymentMethod;
      }

      await api.post(`/orders/${payingOrder.id}/record-payment/`, payload);
      setSuccessMessage('Payment successfully settled!');
      setPayingOrder(null);
      setTransactionId('');
      fetchOrdersAndStats();
    } catch (err) {
      setErrorMessage(err.response?.data?.detail || 'Failed to settle payment.');
    }
  };

  const filteredOrders = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return orders.filter(order => {
      const matchesSearch = order.order_number.toLowerCase().includes(query) ||
        (order.pickup_code && order.pickup_code.includes(query)) ||
        order.customer_username.toLowerCase().includes(query);
      
      if (selectedStatus === 'ALL') return matchesSearch;
      return order.status === selectedStatus && matchesSearch;
    });
  }, [orders, searchQuery, selectedStatus]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Order Fulfilment Center</h1>
          <p className="text-xs text-slate-500 mt-1">Manage status workflow steps, verify pick-up QR/Code codes, and log retail payments.</p>
        </div>
        <button 
          onClick={fetchOrdersAndStats}
          className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition cursor-pointer"
        >
          <FiRefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Counters Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-9 gap-3">
        {Object.entries(ORDER_STATUS_DETAILS).map(([key, item]) => (
          <div 
            key={key} 
            onClick={() => setSelectedStatus(key)}
            className={`border rounded-xl p-3 text-center cursor-pointer transition-all ${
              selectedStatus === key ? 'border-slate-800 bg-slate-900 text-white shadow-sm' : 'border-slate-200/60 bg-white text-slate-700 hover:bg-slate-50/50'
            }`}
          >
            <p className="text-[10px] uppercase font-bold tracking-wider opacity-80">{item.label}</p>
            <p className="text-xl font-black mt-1 font-mono">{counters[key] || 0}</p>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white border border-slate-200/60 p-4 rounded-2xl shadow-sm">
        <div className="relative w-full md:w-80">
          <FiSearch className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search Order Number, Code, or Username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-slate-900 focus:border-slate-900"
          />
        </div>
        <div className="flex space-x-2 w-full md:w-auto overflow-x-auto">
          <button 
            onClick={() => setSelectedStatus('ALL')}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold shrink-0 cursor-pointer ${
              selectedStatus === 'ALL' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Show All
          </button>
          {Object.entries(ORDER_STATUS_DETAILS).map(([key, item]) => (
            <button 
              key={key}
              onClick={() => setSelectedStatus(key)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold shrink-0 cursor-pointer ${
                selectedStatus === key ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Message Notifications */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl flex items-start space-x-2.5">
          <FiAlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded-xl flex items-start space-x-2.5 animate-pulse">
          <FiCheck className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="py-20 text-center space-y-4">
          <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-450 font-bold uppercase">Loading order records...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="py-24 text-center border border-dashed border-slate-200 rounded-2xl bg-white max-w-md mx-auto space-y-4">
          <FiClipboard className="w-10 h-10 text-slate-400 mx-auto" />
          <div>
            <h3 className="font-bold text-slate-800 text-sm">No orders matching query</h3>
            <p className="text-xs text-slate-455 mt-1">Try selecting a different filter tab or checking spelling.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div 
              key={order.id} 
              className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
            >
              {/* Order Identity & Customer */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-slate-900 text-sm font-mono">{order.order_number}</span>
                  <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                    ORDER_STATUS_DETAILS[order.status]?.color || 'bg-slate-50 text-slate-600'
                  }`}>
                    {order.status}
                  </span>
                </div>
                <div className="text-xs text-slate-600 space-y-1 font-medium">
                  <p>Customer: <strong>@{order.customer_username}</strong></p>
                  <p>Phone: <span className="font-mono">{order.customer_phone}</span></p>
                  <p className="text-[10px] text-slate-400 font-mono">Date: {new Date(order.created_at).toLocaleString()}</p>
                </div>
              </div>

              {/* Items details */}
              <div className="max-w-xs space-y-1">
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Basket</p>
                <div className="text-xs text-slate-700 max-h-20 overflow-y-auto space-y-1 pr-2">
                  {order.items.map((item, idx) => (
                    <p key={idx} className="truncate">
                      • {item.product_name} <span className="text-slate-450 font-bold font-mono">x{item.quantity}</span>
                    </p>
                  ))}
                </div>
              </div>

              {/* Accounting details */}
              <div className="space-y-1 text-left lg:text-right">
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Total Due</p>
                <p className="text-base font-black text-slate-950 font-mono">₹{parseFloat(order.grand_total).toFixed(2)}</p>
                <p className="text-[10px] text-slate-400 font-bold">
                  Payment Status: <span className="text-slate-700">{order.payment_status}</span>
                </p>
              </div>

              {/* Administrative Actions */}
              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100/50 pt-4 lg:border-t-0 lg:pt-0">
                {order.status === 'ORDER_RECEIVED' && (
                  <button 
                    onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                    className="bg-orange-50 hover:bg-orange-100 text-orange-700 px-3 py-2 rounded-xl text-xs font-bold border border-orange-200 transition cursor-pointer"
                  >
                    Start Preparing
                  </button>
                )}

                {order.status === 'PREPARING' && (
                  <button 
                    onClick={() => handleUpdateStatus(order.id, 'READY_FOR_PICKUP')}
                    className="bg-purple-50 hover:bg-purple-100 text-purple-700 px-3 py-2 rounded-xl text-xs font-bold border border-purple-200 transition cursor-pointer"
                  >
                    Mark Ready for Pickup
                  </button>
                )}

                {order.status === 'READY_FOR_PICKUP' && (
                  <button 
                    onClick={() => {
                      setVerifyingOrder(order);
                      setErrorMessage('');
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-sm transition active:scale-[0.98] cursor-pointer"
                  >
                    Verify Pickup Pass
                  </button>
                )}

                {order.status === 'PAYMENT_PENDING' && (
                  <button 
                    onClick={() => {
                      setPayingOrder(order);
                      setErrorMessage('');
                    }}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-sm transition active:scale-[0.98] cursor-pointer"
                  >
                    Record Retail Payment
                  </button>
                )}

                {(order.status === 'PAYMENT_COMPLETED' || order.status === 'ADDED_TO_KHATA') && (
                  <button 
                    onClick={() => handleUpdateStatus(order.id, 'COLLECTED')}
                    className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Mark Collected
                  </button>
                )}

                {order.status === 'COLLECTED' && (
                  <button 
                    onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Mark Order Completed
                  </button>
                )}

                {['ORDER_RECEIVED', 'PREPARING', 'READY_FOR_PICKUP'].includes(order.status) && (
                  <button 
                    onClick={() => handleUpdateStatus(order.id, 'CANCELLED')}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-2.5 py-2 rounded-xl text-xs font-bold border border-rose-200 transition cursor-pointer"
                  >
                    Cancel Order
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pickup Verification Dialog Modal */}
      {verifyingOrder && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Pickup Pass Verification</h3>
              <button 
                onClick={() => setVerifyingOrder(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Verify customer identity by typing the 6-digit code shown on the customer's dashboard for order <strong>{verifyingOrder.order_number}</strong>.
            </p>
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 uppercase font-black tracking-wider">6-Digit Code</label>
              <input
                type="text"
                placeholder="e.g. 123456"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="w-full text-center tracking-widest text-lg font-black font-mono border border-slate-200 py-2.5 rounded-xl focus:ring-slate-900 focus:border-slate-900"
              />
            </div>
            <button
              onClick={handleVerifyPickup}
              disabled={verificationCode.length !== 6}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl text-xs cursor-pointer transition active:scale-[0.98]"
            >
              Verify Code
            </button>
          </div>
        </div>
      )}

      {/* Settle Payment Modal */}
      {payingOrder && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-xl">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Record Retail Payment</h3>
              <button 
                onClick={() => setPayingOrder(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Payment Method Selector */}
              <div className="grid grid-cols-3 gap-3">
                <div 
                  onClick={() => setPaymentMethod('CASH')}
                  className={`border rounded-xl p-3 text-center cursor-pointer flex flex-col items-center justify-center space-y-1 transition ${
                    paymentMethod === 'CASH' ? 'border-[#10B981] bg-emerald-50/40 text-emerald-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <FiDollarSign className="w-4 h-4" />
                  <span className="text-[10px] font-bold">Cash</span>
                </div>
                <div 
                  onClick={() => setPaymentMethod('ONLINE')}
                  className={`border rounded-xl p-3 text-center cursor-pointer flex flex-col items-center justify-center space-y-1 transition ${
                    paymentMethod === 'ONLINE' ? 'border-[#10B981] bg-emerald-50/40 text-emerald-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <FiCreditCard className="w-4 h-4" />
                  <span className="text-[10px] font-bold">Online</span>
                </div>
                <div 
                  onClick={() => setPaymentMethod('KHATA')}
                  className={`border rounded-xl p-3 text-center cursor-pointer flex flex-col items-center justify-center space-y-1 transition ${
                    paymentMethod === 'KHATA' ? 'border-[#10B981] bg-emerald-50/40 text-emerald-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <FiBook className="w-4 h-4" />
                  <span className="text-[10px] font-bold">Digital Khata</span>
                </div>
              </div>

              {/* Detail fields based on payment method */}
              {paymentMethod === 'ONLINE' && (
                <div className="space-y-3.5 border-t border-slate-100 pt-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-black">Online Payment Type</label>
                    <select
                      value={onlinePaymentMethod}
                      onChange={(e) => setOnlinePaymentMethod(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-slate-900 focus:border-slate-900"
                    >
                      <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                      <option value="CARD">Debit / Credit Card</option>
                      <option value="NETBANKING">Net Banking</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-black">Transaction / Ref ID</label>
                    <input
                      type="text"
                      placeholder="e.g. TXN9876543210"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-slate-900 focus:border-slate-900"
                    />
                  </div>
                </div>
              )}

              {paymentMethod === 'KHATA' && (
                <div className="bg-indigo-50/30 border border-dashed border-indigo-200/50 p-4 rounded-2xl space-y-1.5 text-xs text-indigo-950">
                  <p className="font-bold flex items-center space-x-1">
                    <span>Digital Khata Credit Settlement</span>
                  </p>
                  <p className="text-[11px] text-indigo-800 leading-relaxed">
                    This will immediately verify the customer's active status and credit limit availability. If approved, it will update their ledger statement with a CREDIT transaction.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2.5 border-t border-slate-100">
              <div className="text-slate-650">
                <span className="text-[10px] text-slate-400 font-bold uppercase block leading-none">Order Bill</span>
                <span className="text-base font-black text-slate-900 font-mono">₹{parseFloat(payingOrder.grand_total).toFixed(2)}</span>
              </div>
              <button
                onClick={handleRecordPayment}
                disabled={paymentMethod === 'ONLINE' && !transactionId}
                className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition cursor-pointer"
              >
                Record Settlement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
