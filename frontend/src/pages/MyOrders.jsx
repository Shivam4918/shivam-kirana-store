import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useRealTime } from '../context/RealTimeContext';
import { 
  FiShoppingBag, FiClock, FiCheckCircle, FiInfo, 
  FiMapPin, FiPrinter, FiChevronRight, FiChevronDown, FiAlertCircle 
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_STEPS = [
  { key: 'ORDER_RECEIVED', label: 'Order Received', desc: 'We have received your order' },
  { key: 'PREPARING', label: 'Preparing Order', desc: 'We are packaging your items' },
  { key: 'READY_FOR_PICKUP', label: 'Ready for Pickup', desc: 'Visit store to collect items' },
  { key: 'PAYMENT_PENDING', label: 'Payment Pending', desc: 'Awaiting payment at store' },
  { key: 'PAYMENT_COMPLETED', label: 'Completed', desc: 'Order settled and picked up' }
];

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  const { subscribe } = useRealTime();

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    // Add real-time synchronization for order updates
    const unsubscribeCreated = subscribe('ORDER_CREATED', (newOrder) => {
      setOrders(prev => {
        if (prev.some(o => o.id === newOrder.id)) return prev;
        return [newOrder, ...prev];
      });
    });

    const unsubscribeUpdated = subscribe('ORDER_UPDATED', (updatedOrder) => {
      setOrders(prev =>
        prev.map(o => (o.id === updatedOrder.id ? updatedOrder : o))
      );
    });

    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
    };
  }, [subscribe]);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders/');
      setOrders(res.data);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStepIndex = (status) => {
    if (status === 'ORDER_RECEIVED') return 0;
    if (status === 'PREPARING') return 1;
    if (status === 'READY_FOR_PICKUP') return 2;
    if (status === 'PAYMENT_PENDING') return 3;
    if (['PAYMENT_COMPLETED', 'ADDED_TO_KHATA', 'COLLECTED', 'COMPLETED'].includes(status)) return 4;
    return -1;
  };

  const getStatusBadge = (status) => {
    const badges = {
      ORDER_RECEIVED: 'bg-blue-50 text-blue-600 border-blue-100',
      PREPARING: 'bg-orange-50 text-orange-600 border-orange-100',
      READY_FOR_PICKUP: 'bg-purple-50 text-purple-600 border-purple-100',
      PAYMENT_PENDING: 'bg-amber-50 text-amber-600 border-amber-100',
      PAYMENT_COMPLETED: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      ADDED_TO_KHATA: 'bg-indigo-50 text-indigo-600 border-indigo-100',
      COLLECTED: 'bg-slate-100 text-slate-700 border-slate-200',
      COMPLETED: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      CANCELLED: 'bg-rose-50 text-rose-600 border-rose-100'
    };
    const labels = {
      ORDER_RECEIVED: 'Order Received',
      PREPARING: 'Preparing Order',
      READY_FOR_PICKUP: 'Ready for Pickup',
      PAYMENT_PENDING: 'Payment Pending',
      PAYMENT_COMPLETED: 'Paid',
      ADDED_TO_KHATA: 'Added to Khata',
      COLLECTED: 'Collected',
      COMPLETED: 'Order Completed',
      CANCELLED: 'Cancelled'
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badges[status] || 'bg-slate-50 text-slate-600'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const handlePrintReceipt = (order) => {
    const printWindow = window.open('', '_blank');
    const itemsHtml = order.items.map(item => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 8px 0; font-size: 13px;">${item.product_name || 'Deleted Product'}</td>
        <td style="padding: 8px 0; text-align: center; font-size: 13px;">${item.quantity}</td>
        <td style="padding: 8px 0; text-align: right; font-size: 13px; font-family: monospace;">₹${parseFloat(item.unit_price).toFixed(2)}</td>
        <td style="padding: 8px 0; text-align: right; font-size: 13px; font-family: monospace;">₹${parseFloat(item.total_amount).toFixed(2)}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${order.order_number}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; padding: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .title { font-size: 22px; font-weight: bold; margin-bottom: 5px; }
            .subtitle { font-size: 14px; color: #64748b; }
            .divider { border-bottom: 2px dashed #e2e8f0; margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; }
            th { text-align: left; color: #64748b; font-size: 12px; text-transform: uppercase; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0; }
            .totals { margin-top: 20px; float: right; width: 300px; font-size: 14px; }
            .total-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .grand-total { font-weight: bold; font-size: 16px; border-top: 1px solid #e2e8f0; padding-top: 8px; }
            .footer { text-align: center; margin-top: 60px; font-size: 12px; color: #94a3b8; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <div class="title">SHIVAM KIRANA STORE</div>
            <div class="subtitle">HSR Layout, Sector 4, Bangalore</div>
            <div class="subtitle">Phone: +91 98765 43210</div>
          </div>
          <div>
            <strong>Order Number:</strong> ${order.order_number}<br>
            <strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}<br>
            <strong>Payment Method:</strong> ${order.payment_method || 'N/A'}<br>
            <strong>Status:</strong> ${order.payment_status}
          </div>
          <div class="divider"></div>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="totals">
            <div class="total-row">
              <span>Subtotal</span>
              <span style="font-family: monospace;">₹${parseFloat(order.subtotal).toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>CGST</span>
              <span style="font-family: monospace;">₹${parseFloat(order.cgst_total).toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>SGST</span>
              <span style="font-family: monospace;">₹${parseFloat(order.sgst_total).toFixed(2)}</span>
            </div>
            ${order.redeem_discount > 0 ? `
              <div class="total-row" style="color: #10b981;">
                <span>Points Redeemed (${order.redeemed_points})</span>
                <span style="font-family: monospace;">-₹${parseFloat(order.redeem_discount).toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="total-row grand-total">
              <span>Grand Total Paid</span>
              <span style="font-family: monospace;">₹${parseFloat(order.grand_total).toFixed(2)}</span>
            </div>
          </div>
          <div style="clear: both;"></div>
          <div class="divider"></div>
          <div class="footer">
            Thank you for shopping with us! Please visit again.
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Pickup Orders</h1>
          <p className="text-xs text-slate-500 mt-1">Track status, collect verification codes, and view receipts.</p>
        </div>
        <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-800 px-3.5 py-1.5 rounded-lg border border-emerald-100 text-xs font-semibold mt-3 md:mt-0">
          <FiMapPin className="w-3.5 h-3.5 shrink-0" />
          <span>Self-Pickup Store: HSR Layout, Sector 4, Bangalore</span>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center space-y-4">
          <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-450 font-bold uppercase tracking-wider">Loading orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="py-24 text-center border border-dashed border-slate-200 rounded-2xl bg-white max-w-md mx-auto space-y-4.5">
          <div className="w-14 h-14 bg-slate-50 border border-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <FiShoppingBag className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-bold text-slate-800 text-sm">No orders found</h3>
            <p className="text-xs text-slate-455 max-w-xs mx-auto leading-relaxed">
              You haven't placed any pickup orders yet. Explore our grocery listings and checkout!
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isExpanded = expandedOrderId === order.id;
            const currentStep = getStatusStepIndex(order.status);
            
            return (
              <div 
                key={order.id}
                className="bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md/5 transition-all overflow-hidden"
              >
                {/* Header Summary */}
                <div 
                  onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-slate-50 text-slate-600 rounded-xl border border-slate-100 flex items-center justify-center shrink-0">
                      <FiClock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-slate-900 text-xs sm:text-sm font-mono">{order.order_number}</span>
                        {getStatusBadge(order.status)}
                      </div>
                      <p className="text-[11px] text-slate-405 mt-1.5 font-bold">
                        Placed on {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-6">
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Bill</p>
                      <p className="text-sm sm:text-base font-black text-slate-955 font-mono">₹{parseFloat(order.grand_total).toFixed(2)}</p>
                    </div>
                    <div className="text-slate-400">
                      {isExpanded ? <FiChevronDown className="w-5 h-5" /> : <FiChevronRight className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden border-t border-slate-50 bg-slate-50/30"
                    >
                      <div className="p-4 sm:p-6 space-y-6">
                        {/* Timeline Status */}
                        {order.status !== 'CANCELLED' && (
                          <div className="bg-white border border-slate-200/50 rounded-2xl p-5 shadow-sm space-y-6">
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Order Progress</h4>
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
                              {STATUS_STEPS.map((step, idx) => {
                                const isDone = idx < currentStep;
                                const isCurrent = idx === currentStep;
                                return (
                                  <div key={step.key} className="flex md:flex-col items-center md:text-center space-x-3.5 md:space-x-0 md:space-y-2 relative">
                                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 z-10 ${
                                      isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 
                                      isCurrent ? 'bg-amber-500 border-amber-500 text-white' : 
                                      'bg-white border-slate-200 text-slate-400'
                                    }`}>
                                      {isDone ? <FiCheckCircle className="w-4 h-4" /> : <span className="text-[11px] font-bold">{idx + 1}</span>}
                                    </div>
                                    <div className="text-left md:text-center">
                                      <p className="text-[11px] font-extrabold text-slate-800 leading-tight">{step.label}</p>
                                      <p className="text-[9.5px] text-slate-400 mt-0.5 leading-snug">{step.desc}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Pickup Pass Card & Details */}
                        {order.status === 'READY_FOR_PICKUP' || order.status === 'PAYMENT_PENDING' ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Verification Code */}
                            <div className="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm space-y-4">
                              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Store Pickup Pass</h4>
                              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center space-y-2">
                                <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">6-Digit Pickup Code</span>
                                <div className="text-2xl font-black text-slate-900 tracking-widest font-mono">{order.pickup_code}</div>
                              </div>
                              <div className="flex items-start space-x-2 text-[11px] text-slate-500 leading-relaxed bg-amber-50/40 p-3 rounded-lg border border-amber-100/40">
                                <FiInfo className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <span>Present this code or show the QR code when you arrive at the store counter.</span>
                              </div>
                            </div>

                            {/* QR code */}
                            <div className="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm text-center flex flex-col items-center justify-center space-y-3">
                              <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Pickup QR Code</span>
                              <div className="p-2 border border-slate-200 rounded-xl bg-white">
                                <img 
                                  src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(order.pickup_qr_data)}`} 
                                  alt="Pickup QR Code" 
                                  className="w-[140px] h-[140px]"
                                />
                              </div>
                              <span className="text-[9.5px] text-slate-404">Scan at Counter to Verify</span>
                            </div>
                          </div>
                        ) : null}

                        {/* Order Items Table */}
                        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                          <div className="px-5 py-4 border-b border-slate-100">
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Items Summary</h4>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-slate-50 text-slate-450 text-[10px] uppercase font-bold text-left border-b border-slate-100">
                                  <th className="py-2.5 px-4.5">Product</th>
                                  <th className="py-2.5 px-4.5 text-center">Quantity</th>
                                  <th className="py-2.5 px-4.5 text-right">Price</th>
                                  <th className="py-2.5 px-4.5 text-right">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {order.items.map((item) => (
                                  <tr key={item.id} className="border-b border-slate-100 text-slate-700">
                                    <td className="py-3 px-4.5 font-bold text-slate-900">{item.product_name || 'Deleted Product'}</td>
                                    <td className="py-3 px-4.5 text-center font-semibold font-mono">{item.quantity}</td>
                                    <td className="py-3 px-4.5 text-right font-mono text-slate-450">₹{parseFloat(item.unit_price).toFixed(2)}</td>
                                    <td className="py-3 px-4.5 text-right font-bold font-mono text-slate-900">₹{parseFloat(item.total_amount).toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Calculations */}
                          <div className="p-5 bg-slate-50/50 flex flex-col items-end space-y-2">
                            <div className="w-full sm:w-64 space-y-1.5 text-[11px] font-medium text-slate-500">
                              <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span className="font-mono">₹{parseFloat(order.subtotal).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>CGST</span>
                                <span className="font-mono">₹{parseFloat(order.cgst_total).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>SGST</span>
                                <span className="font-mono">₹{parseFloat(order.sgst_total).toFixed(2)}</span>
                              </div>
                              {order.redeem_discount > 0 && (
                                <div className="flex justify-between text-emerald-600 font-bold">
                                  <span>Redeemed Points Discount</span>
                                  <span className="font-mono">-₹{parseFloat(order.redeem_discount).toFixed(2)}</span>
                                </div>
                              )}
                              <div className="flex justify-between text-xs font-black text-slate-900 border-t border-slate-200/60 pt-2">
                                <span>Grand Total</span>
                                <span className="font-mono text-sm">₹{parseFloat(order.grand_total).toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Audit Trail Logs */}
                        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3.5">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Order Timeline History</h4>
                          <div className="space-y-3">
                            {order.audit_logs && order.audit_logs.map((log) => (
                              <div key={log.id} className="flex items-start space-x-2.5 text-[10.5px]">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-450 mt-1.5 shrink-0" />
                                <div>
                                  <span className="text-slate-400 font-mono">
                                    {new Date(log.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}:
                                  </span>
                                  <span className="text-slate-800 ml-1.5 font-bold">
                                    {log.description}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Paid Receipt Option */}
                        {['PAYMENT_COMPLETED', 'ADDED_TO_KHATA', 'COLLECTED', 'COMPLETED'].includes(order.status) && (
                          <div className="flex justify-between items-center bg-emerald-50/30 border border-emerald-100 rounded-xl p-4">
                            <div className="flex items-start space-x-2.5 text-xs text-emerald-800 leading-snug">
                              <FiCheckCircle className="w-4.5 h-4.5 text-[#10B981] shrink-0 mt-0.5 animate-pulse" />
                              <div>
                                <p className="font-bold">Payment Settled Successfully</p>
                                <p className="text-[10px] text-emerald-600 mt-0.5 font-medium">
                                  Method: <strong>{order.payment_method}</strong> {order.online_transaction_id ? `(Txn: ${order.online_transaction_id})` : ''}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handlePrintReceipt(order)}
                              className="bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold flex items-center space-x-1.5 shadow-sm transition active:scale-[0.98] cursor-pointer"
                            >
                              <FiPrinter className="w-3.5 h-3.5" />
                              <span>Print Receipt</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
