import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Soup, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingBag, 
  CheckCheck, 
  Sparkles, 
  CreditCard, 
  QrCode, 
  Banknote,
  Utensils, 
  Package,
  BellRing,
  Clock,
  Printer,
  History,
  FileSpreadsheet,
  X,
  Search,
  Sprout,
  Wheat,
  HeartPulse,
  LayoutGrid,
  Coins,
  Check
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { soundManager } from '../utils/sound';
import { exportOrdersToExcel } from '../utils/exportExcel';
import ReceiptModal from '../components/ReceiptModal';
import AddMenuItemModal from '../components/AddMenuItemModal';

export default function CashierPOS() {
  const { socket } = useSocket();
  const [menuItems, setMenuItems] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const [selectedStation, setSelectedStation] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState({});
  const [orderType, setOrderType] = useState('dine_in'); // 'dine_in' | 'takeaway'
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'qr' | 'card'
  const [placingOrder, setPlacingOrder] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [readyOrders, setReadyOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial active menu items, currently ready orders, and today's completed orders
  const fetchData = async () => {
    try {
      setLoading(true);
      const menuRes = await fetch('/api/menu');
      const menuData = await menuRes.json();
      if (menuData.success) setMenuItems(menuData.data);

      const openRes = await fetch('/api/orders/open');
      const openData = await openRes.json();
      if (openData.success) {
        // Filter those already marked 'ready' for the shelf
        setReadyOrders(openData.data.filter(o => o.status === 'ready'));
      }

      // Fetch completed (verified) orders
      const completedRes = await fetch('/api/orders?status=verified&limit=100');
      const completedData = await completedRes.json();
      if (completedData.success) {
        setCompletedOrders(completedData.data);
      }
    } catch (err) {
      console.error('POS fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Real-time WebSocket Listeners
  useEffect(() => {
    if (!socket) return;

    // Listen for orders marked 'ready' by kitchen
    const handleOrderReady = (order) => {
      console.log('⚡ Cashier received order:ready:', order.token_code);
      soundManager.playKitchenChime();
      setReadyOrders(prev => [order, ...prev.filter(o => o.id !== order.id)]);
    };

    // Listen for orders verified (remove from shelf and add to completed log)
    const handleOrderVerified = (order) => {
      setReadyOrders(prev => prev.filter(o => o.id !== order.id));
      setCompletedOrders(prev => [order, ...prev.filter(o => o.id !== order.id)]);
    };

    // Generic updates
    const handleOrderUpdated = (order) => {
      if (order.status === 'ready') {
        setReadyOrders(prev => [order, ...prev.filter(o => o.id !== order.id)]);
      } else if (order.status === 'verified') {
        setReadyOrders(prev => prev.filter(o => o.id !== order.id));
        setCompletedOrders(prev => [order, ...prev.filter(o => o.id !== order.id)]);
      } else {
        setReadyOrders(prev => prev.filter(o => o.id !== order.id));
      }
    };

    socket.on('order:ready', handleOrderReady);
    socket.on('order:verified', handleOrderVerified);
    socket.on('order:updated', handleOrderUpdated);

    return () => {
      socket.off('order:ready', handleOrderReady);
      socket.off('order:verified', handleOrderVerified);
      socket.off('order:updated', handleOrderUpdated);
    };
  }, [socket]);

  // Cart operations
  const handleAddToCart = (item) => {
    setCart(prev => ({
      ...prev,
      [item.id]: (prev[item.id] || 0) + 1
    }));
  };

  const handleUpdateQty = (itemId, delta) => {
    setCart(prev => {
      const current = prev[itemId] || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: next };
    });
  };

  const handleRemoveFromCart = (itemId) => {
    setCart(prev => {
      const copy = { ...prev };
      delete copy[itemId];
      return copy;
    });
  };

  const handleClearCart = () => {
    setCart({});
  };

  // Submit Order
  const handlePlaceOrder = async () => {
    const items = Object.entries(cart)
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => ({
        menu_item_id: parseInt(id, 10),
        quantity: qty
      }));

    if (items.length === 0) return;

    try {
      setPlacingOrder(true);
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_type: orderType,
          payment_method: paymentMethod,
          items
        })
      });

      const data = await res.json();
      if (data.success) {
        soundManager.playOrderPlaced();
        setReceiptOrder(data.data);
        setCart({});
      } else {
        alert(data.error || 'Failed to place order');
      }
    } catch (err) {
      console.error('Order error:', err);
      alert('Error connecting to backend API');
    } finally {
      setPlacingOrder(false);
    }
  };

  // Cashier Verify & Hand Over
  const handleVerifyOrder = async (orderId) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'verified' })
      });
      const data = await res.json();
      if (data.success) {
        setReadyOrders(prev => prev.filter(o => o.id !== orderId));
        setCompletedOrders(prev => [data.data, ...prev.filter(o => o.id !== orderId)]);
      } else {
        alert(data.error || 'Could not verify order');
      }
    } catch (err) {
      console.error('Verify error:', err);
    }
  };

  // Calculations
  const cartEntries = Object.entries(cart).filter(([_, qty]) => qty > 0);
  const cartTotal = cartEntries.reduce((sum, [id, qty]) => {
    const item = menuItems.find(m => m.id === parseInt(id, 10));
    return sum + (item ? item.price * qty : 0);
  }, 0);
  const cartItemCount = cartEntries.reduce((sum, [_, qty]) => sum + qty, 0);

  const completedRevenueToday = completedOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

  const filteredItems = menuItems.filter(item => {
    const matchStation = selectedStation === 'all' || item.station_id === selectedStation;
    const matchSearch = !searchQuery || 
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.sinhala_name?.includes(searchQuery);
    return matchStation && matchSearch;
  });

  const STATIONS = [
    { id: 'all', label: 'All Congees', sinhala: 'සියල්ල', icon: LayoutGrid, count: menuItems.length },
    { id: 'kola', label: 'Kola', sinhala: 'කොළ කැඳ', icon: Sprout, count: menuItems.filter(m => m.station_id === 'kola').length },
    { id: 'grain', label: 'Grain', sinhala: 'ධාන්‍ය කැඳ', icon: Wheat, count: menuItems.filter(m => m.station_id === 'grain').length },
    { id: 'herbal', label: 'Herbal', sinhala: 'ඖෂධීය', icon: HeartPulse, count: menuItems.filter(m => m.station_id === 'herbal').length },
  ];

  return (
    <div className="flex-1 flex flex-col gap-6 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
      
      {/* Quick KPI Stat Banner for Cashier */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3 shadow-sm">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Coins className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Today's Sales</span>
            <span className="text-base font-black text-white font-mono">Rs. {completedRevenueToday.toFixed(2)}</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3 shadow-sm">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <BellRing className={`w-5 h-5 stroke-[2.2] ${readyOrders.length > 0 ? 'animate-bounce' : ''}`} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Ready to Hand Over</span>
            <span className="text-base font-black text-amber-300 font-mono">{readyOrders.length} Ready</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3 shadow-sm">
          <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <CheckCheck className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Completed Orders</span>
            <span className="text-base font-black text-teal-300 font-mono">{completedOrders.length} Done</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3 shadow-sm">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <ShoppingBag className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Current Cart</span>
            <span className="text-base font-black text-indigo-300 font-mono">{cartItemCount} Bowls</span>
          </div>
        </div>
      </div>

      {/* 1. "Ready to Verify & Hand Over" Shelf */}
      {readyOrders.length > 0 && (
        <section className="p-4 sm:p-5 rounded-3xl bg-amber-950/40 border border-amber-500/40 shadow-xl shadow-amber-950/20 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <BellRing className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  Ready to Verify & Hand Over (භාරදීමට සූදානම්)
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold">
                    {readyOrders.length} Ready
                  </span>
                </h2>
                <p className="text-xs text-amber-200/80">Congee prepared by kitchen staff. Collect payment & hand over to customer.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {readyOrders.map((ord) => (
              <div 
                key={ord.id}
                className="p-3.5 rounded-2xl bg-slate-900/90 border border-amber-500/30 flex items-center justify-between gap-3 shadow-md"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black font-mono px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {ord.token_code || ord.token_display || `#${ord.token_number}`}
                    </span>
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-300">
                      {ord.order_type === 'dine_in' ? 'Dine-In' : 'Takeaway'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 mt-1.5">
                    {ord.items?.map((it, idx) => (
                      <span key={idx} className="mr-1.5 font-medium">
                        {it.name} <span className="text-amber-400 font-bold">({it.quantity}x)</span>
                      </span>
                    ))}
                  </div>
                  <div className="text-xs font-bold text-white mt-1">
                    Total: Rs. {Number(ord.total_amount).toFixed(2)} ({ord.payment_method?.toUpperCase()})
                  </div>
                </div>

                <button
                  onClick={() => handleVerifyOrder(ord.id)}
                  className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-950/60 transition-all active:scale-95 flex-shrink-0"
                >
                  <CheckCheck className="w-4 h-4" />
                  Hand Over to Customer (භාර දුන්නා)
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 2. Main POS Split View: Left Menu Grid, Right Cart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
        
        {/* LEFT COLUMN: Touch Menu Grid & Filters */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
          
          {/* Search Bar & Actions Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            
            {/* Quick Congee Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search congee (e.g. Gotukola / ගොටුකොළ)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCompletedModal(true)}
                className="px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 transition-all flex items-center gap-1.5 whitespace-nowrap active:scale-95 shadow-sm cursor-pointer"
                title="View completed orders history & reprint receipts"
              >
                <History className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Completed</span>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[11px] font-bold">
                  {completedOrders.length}
                </span>
              </button>

              <button
                onClick={() => setShowAddModal(true)}
                className="px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/60 transition-all flex items-center gap-1.5 whitespace-nowrap active:scale-95 cursor-pointer"
                title="Add a new congee variety to menu"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Item (නව කැඳ)</span>
              </button>
            </div>
          </div>

          {/* Station Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {STATIONS.map(station => {
              const Icon = station.icon;
              const isSelected = selectedStation === station.id;
              return (
                <button
                  key={station.id}
                  onClick={() => setSelectedStation(station.id)}
                  className={`px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap active:scale-95 ${
                    isSelected
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-950/80 ring-2 ring-emerald-400/40'
                      : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4 stroke-[2.2]" />
                  <span>{station.label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {station.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* High-Contrast Touch Menu Cards with Botanical Icons */}
          {filteredItems.length === 0 ? (
            <div className="py-16 rounded-3xl bg-slate-900/40 border border-slate-800 flex flex-col items-center justify-center gap-2 text-slate-400 text-center">
              <Soup className="w-10 h-10 text-slate-600" />
              <p className="text-sm font-semibold">No congee varieties match your filter.</p>
              <button 
                onClick={() => { setSelectedStation('all'); setSearchQuery(''); }}
                className="mt-2 text-xs text-emerald-400 hover:underline font-bold"
              >
                Reset filters (සියල්ල පෙන්වන්න)
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              {filteredItems.map(item => {
                const inCartQty = cart[item.id] || 0;
                
                // Station badge styling & icons
                const stationConfig = {
                  kola: { icon: Sprout, bg: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60', iconBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
                  grain: { icon: Wheat, bg: 'bg-amber-950/60 text-amber-300 border-amber-800/60', iconBg: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
                  herbal: { icon: HeartPulse, bg: 'bg-teal-950/60 text-teal-300 border-teal-800/60', iconBg: 'bg-teal-500/20 text-teal-400 border-teal-500/30' },
                }[item.station_id] || { icon: Soup, bg: 'bg-slate-800 text-slate-300 border-slate-700', iconBg: 'bg-slate-800 text-slate-400 border-slate-700' };

                const StationIcon = stationConfig.icon;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleAddToCart(item)}
                    className={`
                      p-4 rounded-3xl border-2 transition-all cursor-pointer relative flex flex-col justify-between select-none
                      active:scale-98 group shadow-md
                      ${inCartQty > 0 
                        ? 'bg-emerald-950/30 border-emerald-500/70 shadow-emerald-950/50 ring-2 ring-emerald-500/30' 
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                      }
                    `}
                  >
                    {/* Top Row: Station Icon + Station Tag */}
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${stationConfig.iconBg}`}>
                          <StationIcon className="w-4 h-4 stroke-[2.2]" />
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border uppercase tracking-wider ${stationConfig.bg}`}>
                          {item.station_id}
                        </span>
                      </div>

                      {/* Sinhala Primary Label (Large & Prominent) */}
                      <h3 className="font-sinhala font-black text-lg text-emerald-300 leading-snug">
                        {item.sinhala_name}
                      </h3>

                      {/* English Subtitle */}
                      <p className="font-semibold text-xs text-slate-300 mt-0.5 leading-tight group-hover:text-white transition-colors">
                        {item.name}
                      </p>
                    </div>

                    {/* Bottom Row: Price + Micro-stepper or Add button */}
                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <span className="text-base font-black text-white font-mono">
                        Rs. {Number(item.price).toFixed(2)}
                      </span>

                      {/* Fast In-Card Stepper (HCI Fitts's Law) */}
                      {inCartQty > 0 ? (
                        <div 
                          className="flex items-center bg-slate-950/90 rounded-xl p-1 border border-emerald-500/40"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleUpdateQty(item.id, -1)}
                            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-rose-900/50 hover:text-rose-300 text-slate-200 flex items-center justify-center transition-all active:scale-90"
                            title="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-7 text-center font-mono font-black text-xs text-emerald-300">
                            {inCartQty}
                          </span>
                          <button
                            onClick={() => handleUpdateQty(item.id, 1)}
                            className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition-all active:scale-90"
                            title="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-800 group-hover:bg-emerald-600 group-hover:text-white text-slate-300 transition-all flex items-center gap-1 active:scale-90"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Fast Touch Cart & Order Panel */}
        <div className="lg:col-span-5 xl:col-span-4 bg-slate-900/95 border border-slate-800/90 rounded-3xl p-5 shadow-2xl flex flex-col justify-between sticky top-24">
          
          <div>
            {/* Cart Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base text-white">Current Order</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {cartItemCount} bowls
                </span>
                {cartEntries.length > 0 && (
                  <button
                    onClick={handleClearCart}
                    className="text-xs text-rose-400 hover:text-rose-300 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Cart Line Items Scroll Area */}
            <div className="mt-4 flex flex-col gap-2.5 max-h-[320px] overflow-y-auto pr-1">
              {cartEntries.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                  <Soup className="w-8 h-8 text-slate-400 stroke-1" />
                  <p>Cart is empty.<br/>Tap congees on the left to add items.</p>
                </div>
              ) : (
                cartEntries.map(([id, qty]) => {
                  const item = menuItems.find(m => m.id === parseInt(id, 10));
                  if (!item) return null;
                  const itemTotal = item.price * qty;

                  return (
                    <div 
                      key={id}
                      className="p-3 rounded-2xl bg-slate-850/80 border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-xs text-white truncate">
                          {item.name}
                        </div>
                        <div className="text-[11px] font-sinhala text-emerald-300">
                          {item.sinhala_name}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          Rs. {Number(item.price).toFixed(2)} each
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700/60">
                          <button
                            onClick={() => handleUpdateQty(item.id, -1)}
                            className="w-7 h-7 rounded-lg hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-all active:scale-90"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center font-mono font-bold text-xs text-white">
                            {qty}
                          </span>
                          <button
                            onClick={() => handleUpdateQty(item.id, 1)}
                            className="w-7 h-7 rounded-lg hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-all active:scale-90"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          onClick={() => handleRemoveFromCart(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Order Toggles: Dine-in / Takeaway & Payment Method */}
            <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col gap-3">
              
              {/* Dine-in vs Takeaway Toggle */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Order Mode (ඇණවුම් වර්ගය)
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800/80 rounded-2xl border border-slate-700/60">
                  <button
                    onClick={() => setOrderType('dine_in')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      orderType === 'dine_in'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Utensils className="w-3.5 h-3.5" />
                    Dine-in (ශාලාවේදී)
                  </button>
                  <button
                    onClick={() => setOrderType('takeaway')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      orderType === 'takeaway'
                        ? 'bg-teal-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5" />
                    Takeaway (රැගෙන යාම)
                  </button>
                </div>
              </div>

              {/* Cash vs QR vs Card Toggle */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Payment Method (ගෙවීම් ක්‍රමය)
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-800/80 rounded-2xl border border-slate-700/60">
                  {[
                    { id: 'cash', label: 'Cash (මුදල්)', icon: Banknote },
                    { id: 'qr', label: 'LankaQR', icon: QrCode },
                    { id: 'card', label: 'Card', icon: CreditCard },
                  ].map(pay => {
                    const Icon = pay.icon;
                    return (
                      <button
                        key={pay.id}
                        onClick={() => setPaymentMethod(pay.id)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                          paymentMethod === pay.id
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        {pay.label}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

          {/* Checkout Section with Total & Place Order Button */}
          <div className="mt-5 pt-4 border-t border-slate-800 flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Total Due:</span>
              <span className="text-2xl font-black text-white font-mono">
                Rs. {cartTotal.toFixed(2)}
              </span>
            </div>

            <button
              disabled={cartEntries.length === 0 || placingOrder}
              onClick={handlePlaceOrder}
              className={`
                w-full py-4 rounded-2xl font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2
                shadow-xl active:scale-98
                ${cartEntries.length > 0 && !placingOrder
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-950/80 cursor-pointer'
                  : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                }
              `}
            >
              <Sparkles className="w-5 h-5" />
              {placingOrder ? 'Processing...' : `Place Order (Rs. ${cartTotal.toFixed(2)})`}
            </button>
            <p className="text-[11px] text-slate-400 text-center">
              Auto-generates sequential daily token & prints receipt
            </p>
          </div>

        </div>

      </div>

      {/* 3. Printable Customer Receipt Modal */}
      {receiptOrder && (
        <ReceiptModal
          order={receiptOrder}
          onClose={() => setReceiptOrder(null)}
        />
      )}

      {/* 4. Add Menu Item Modal */}
      {showAddModal && (
        <AddMenuItemModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onItemAdded={(newItem) => {
            setMenuItems(prev => [...prev, newItem]);
          }}
        />
      )}

      {/* 5. Completed Orders History Modal */}
      {showCompletedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    Completed Orders (අවසන් වූ ඇණවුම්)
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                      {completedOrders.length}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Handed over orders today. You can reprint customer receipts or export as Excel.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportOrdersToExcel(completedOrders, 'Suwa_Kanda_Completed_Orders')}
                  disabled={completedOrders.length === 0}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-emerald-600 hover:text-white text-emerald-400 border border-slate-700/80 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Download Excel / CSV sheet"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span className="hidden sm:inline">Export Excel</span>
                </button>

                <button
                  onClick={() => setShowCompletedModal(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content - Table or List */}
            <div className="flex-1 overflow-y-auto p-5">
              {completedOrders.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-3">
                  <History className="w-10 h-10 text-slate-600" />
                  <p>No completed orders yet today.<br />Orders will appear here once you click &quot;Hand Over to Customer&quot;.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                        <th className="py-3 px-3">Token</th>
                        <th className="py-3 px-3">Type</th>
                        <th className="py-3 px-3">Items (කැඳ වර්ග)</th>
                        <th className="py-3 px-3">Payment</th>
                        <th className="py-3 px-3 text-right">Total</th>
                        <th className="py-3 px-3 text-right">Time</th>
                        <th className="py-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {completedOrders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-300 font-mono font-bold border border-emerald-500/20 text-xs">
                              {ord.token_code || ord.token_display || `#${ord.token_number}`}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="text-[11px] font-semibold text-slate-300 uppercase">
                              {ord.order_type === 'dine_in' ? 'Dine-In' : 'Takeaway'}
                            </span>
                          </td>
                          <td className="py-3 px-3 max-w-[260px]">
                            <div className="flex flex-wrap gap-1">
                              {ord.items?.map((it, idx) => (
                                <span key={idx} className="text-slate-200">
                                  {it.name} <span className="text-emerald-400 font-bold">x{it.quantity}</span>
                                  {idx < ord.items.length - 1 ? ',' : ''}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium uppercase text-[10px]">
                              {ord.payment_method}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono font-black text-emerald-400 text-right">
                            Rs. {Number(ord.total_amount).toFixed(2)}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-400 text-right">
                            {ord.created_at ? new Date(ord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => {
                                setReceiptOrder(ord);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 text-[11px] font-semibold transition-all inline-flex items-center gap-1 active:scale-95"
                              title="Reprint receipt"
                            >
                              <Printer className="w-3 h-3" />
                              Reprint Bill
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
              <span>Total Completed Revenue Today:</span>
              <span className="font-mono font-bold text-white text-base">
                Rs. {completedOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0).toFixed(2)}
              </span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
