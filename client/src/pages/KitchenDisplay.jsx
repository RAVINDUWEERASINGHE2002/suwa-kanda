import React, { useState, useEffect } from 'react';
import { 
  ChefHat, 
  Clock, 
  CheckCircle2, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  RefreshCw, 
  Soup, 
  Flame,
  Utensils,
  Package,
  Sprout,
  Wheat,
  HeartPulse,
  LayoutGrid,
  Bell
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { soundManager } from '../utils/sound';

export default function KitchenDisplay() {
  const { socket, connected } = useSocket();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stationFilter, setStationFilter] = useState('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [now, setNow] = useState(Date.now());

  // Periodically refresh now to update elapsed minutes
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  // Fetch open orders (pending and ready)
  const fetchOpenOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/orders/open');
      const data = await res.json();
      if (data.success) {
        setOrders(data.data);
      }
    } catch (err) {
      console.error('KDS fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpenOrders();
  }, []);

  // Realtime Socket.io Event Handling
  useEffect(() => {
    if (!socket) return;

    const handleOrderCreated = (newOrder) => {
      console.log('🍳 KDS received order:created:', newOrder.token_code);
      if (soundEnabled) {
        soundManager.playKitchenChime();
      }
      setOrders(prev => {
        // Only add if not already in list
        if (prev.some(o => o.id === newOrder.id)) return prev;
        return [newOrder, ...prev];
      });
    };

    const handleOrderReady = (readyOrder) => {
      setOrders(prev => prev.map(o => o.id === readyOrder.id ? readyOrder : o));
    };

    const handleOrderVerified = (verifiedOrder) => {
      // Verified orders are handed over to customer -> remove from kitchen screen
      setOrders(prev => prev.filter(o => o.id !== verifiedOrder.id));
    };

    const handleOrderUpdated = (updatedOrder) => {
      if (['verified', 'cancelled'].includes(updatedOrder.status)) {
        setOrders(prev => prev.filter(o => o.id !== updatedOrder.id));
      } else {
        setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
      }
    };

    socket.on('order:created', handleOrderCreated);
    socket.on('order:ready', handleOrderReady);
    socket.on('order:verified', handleOrderVerified);
    socket.on('order:updated', handleOrderUpdated);

    return () => {
      socket.off('order:created', handleOrderCreated);
      socket.off('order:ready', handleOrderReady);
      socket.off('order:verified', handleOrderVerified);
      socket.off('order:updated', handleOrderUpdated);
    };
  }, [socket, soundEnabled]);

  // Update order status (preparing | ready)
  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setOrders(prev => prev.map(o => o.id === orderId ? data.data : o));
      } else {
        alert(data.error || 'Failed to update order');
      }
    } catch (err) {
      console.error('KDS update error:', err);
    }
  };

  const handleTestSound = () => {
    soundManager.playKitchenChime();
  };

  const toggleSound = () => {
    const isMuted = soundManager.toggleMute();
    setSoundEnabled(!isMuted);
  };

  // Helper to compute elapsed minutes
  const getElapsedMinutes = (createdAtStr) => {
    if (!createdAtStr) return 0;
    const orderTime = new Date(createdAtStr.replace(' ', 'T')).getTime();
    if (isNaN(orderTime)) return 0;
    return Math.max(0, Math.floor((now - orderTime) / 60000));
  };

  // Station filtering: check if order contains items belonging to selected station
  const filteredOrders = stationFilter === 'all'
    ? orders
    : orders.filter(o => o.items?.some(it => it.station_id === stationFilter));

  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const readyCount = orders.filter(o => o.status === 'ready').length;

  return (
    <div className="flex-1 flex flex-col gap-6 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
      
      {/* KDS Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <ChefHat className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              Kitchen Display System (KDS)
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                Live Feed
              </span>
            </h2>
            <p className="text-xs text-slate-400">Thanamalwila Herbal Congee Prep Line</p>
          </div>
        </div>

        {/* Action Controls & Sound Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Quick Metrics */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-xs">
            <span className="font-semibold text-slate-300">Pending:</span>
            <span className="font-mono font-bold text-amber-400 text-sm">{pendingCount}</span>
            <span className="text-slate-600">|</span>
            <span className="font-semibold text-slate-300">Ready:</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">{readyCount}</span>
          </div>

          {/* Sound enable / test toggle */}
          <button
            onClick={toggleSound}
            className={`px-3 py-2 rounded-2xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              soundEnabled 
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50 hover:bg-emerald-900/40' 
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Toggle Kitchen Order Chime"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
            <span>{soundEnabled ? 'Chime Active' : 'Muted'}</span>
          </button>

          <button
            onClick={handleTestSound}
            className="p-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
            title="Test Chime Sound"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
          </button>

          <button
            onClick={fetchOpenOrders}
            className="p-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all active:scale-95"
            title="Refresh Tickets"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Station Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'All Stations (සියලු අංශ)', count: orders.length },
          { id: 'kola', label: '🌿 Kola Station (කොළ කැඳ)', count: orders.filter(o => o.items?.some(i => i.station_id === 'kola')).length },
          { id: 'grain', label: '🌾 Grain Station (ධාන්‍ය කැඳ)', count: orders.filter(o => o.items?.some(i => i.station_id === 'grain')).length },
          { id: 'herbal', label: '🍵 Herbal Station (ඖෂධීය කැඳ)', count: orders.filter(o => o.items?.some(i => i.station_id === 'herbal')).length },
        ].map(station => (
          <button
            key={station.id}
            onClick={() => setStationFilter(station.id)}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              stationFilter === station.id
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-950 font-black'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <span>{station.label}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
              stationFilter === station.id ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
            }`}>
              {station.count}
            </span>
          </button>
        ))}
      </div>

      {/* Open Orders Ticket Wall */}
      {filteredOrders.length === 0 ? (
        <div className="py-20 rounded-3xl bg-slate-900/40 border border-slate-800 flex flex-col items-center justify-center gap-3 text-slate-400 text-center">
          <Soup className="w-12 h-12 text-slate-400 stroke-1" />
          <h3 className="text-lg font-bold text-slate-200">No Open Kitchen Tickets</h3>
          <p className="text-xs text-slate-400 max-w-sm">
            All congees are prepared and served! New orders placed at the Cashier POS will appear and chime automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredOrders.map(order => {
            const isReady = order.status === 'ready';
            const elapsed = getElapsedMinutes(order.created_at);
            const isUrgent = elapsed >= 8 && !isReady;

            return (
              <div
                key={order.id}
                className={`
                  p-5 rounded-3xl border-2 transition-all flex flex-col justify-between select-none shadow-xl
                  ${isReady 
                    ? 'bg-slate-900/80 border-emerald-500/50 shadow-emerald-950/20 opacity-90' 
                    : isUrgent
                    ? 'bg-slate-900/95 border-rose-500/80 shadow-rose-950/40 ring-1 ring-rose-500/30'
                    : 'bg-slate-900/95 border-amber-500/50 shadow-amber-950/30'
                  }
                `}
              >
                <div>
                  {/* Big Ticket Header */}
                  <div className="flex items-start justify-between pb-3 border-b border-slate-800">
                    <div>
                      {/* Giant Token Display for staff viewing */}
                      <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white block">
                        {order.token_code || order.token_display || `#${order.token_number}`}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg flex items-center gap-1 ${
                          order.order_type === 'dine_in' 
                            ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60' 
                            : 'bg-teal-950/60 text-teal-300 border border-teal-800/60'
                        }`}>
                          {order.order_type === 'dine_in' ? <Utensils className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                          {order.order_type === 'dine_in' ? 'Dine-In' : 'Takeaway'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      {/* Status indicator */}
                      <span className={`text-xs px-3 py-1 rounded-full font-black uppercase tracking-wider ${
                        isReady 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                      }`}>
                        {isReady ? 'READY' : 'PREPARING'}
                      </span>

                      {/* Elapsed Time Badge */}
                      <span className={`text-xs font-mono font-bold flex items-center gap-1 ${
                        isUrgent ? 'text-rose-400 animate-pulse' : 'text-slate-400'
                      }`}>
                        {isUrgent ? <Flame className="w-3.5 h-3.5 text-rose-400 animate-bounce" /> : <Clock className="w-3.5 h-3.5" />}
                        {elapsed} min ago
                      </span>
                    </div>
                  </div>

                  {/* High-Contrast Large Congee Line Items */}
                  <div className="py-4 flex flex-col gap-3">
                    {order.items?.map((item, idx) => {
                      const itemIcon = {
                        kola: Sprout,
                        grain: Wheat,
                        herbal: HeartPulse,
                      }[item.station_id] || Soup;
                      const ItemIconComp = itemIcon;

                      return (
                        <div 
                          key={idx}
                          className="p-3.5 rounded-2xl bg-slate-850/90 border border-slate-800/80 flex items-center justify-between gap-3 shadow-sm"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-emerald-400 flex-shrink-0">
                              <ItemIconComp className="w-5 h-5 stroke-[2.2]" />
                            </div>

                            <div className="flex-1 min-w-0">
                              {/* Large Sinhala Label */}
                              <div className="text-lg font-black font-sinhala text-emerald-300 leading-tight truncate">
                                {item.sinhala_name}
                              </div>
                              {/* English Label */}
                              <div className="text-xs font-semibold text-slate-300 mt-0.5 truncate">
                                {item.name}
                              </div>
                              {/* Station Tag */}
                              <div className="mt-1">
                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                                  {item.station_id}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* High-Contrast Quantity Callout */}
                          <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center border-2 border-emerald-500/40 text-emerald-300 font-mono font-black text-xl flex-shrink-0 shadow-inner">
                            x{item.quantity}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Kitchen Action Buttons */}
                <div className="pt-3 border-t border-slate-800">
                  {order.status === 'pending' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'preparing')}
                        className="py-3 px-2 rounded-2xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg active:scale-95 cursor-pointer"
                        title="Accept order and start brewing"
                      >
                        <Flame className="w-4 h-4" />
                        Accept (පිළියෙල)
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'ready')}
                        className="py-3 px-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg active:scale-95 cursor-pointer"
                        title="Mark congee as ready"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Ready (සූදානම්)
                      </button>
                    </div>
                  ) : order.status === 'preparing' ? (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'ready')}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/80 active:scale-95 cursor-pointer ring-2 ring-emerald-400/40"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      Mark Ready (සූදානම් - Cashier ට භාරදෙන්න)
                    </button>
                  ) : (
                    <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Marked Ready • Awaiting Cashier Handover
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
