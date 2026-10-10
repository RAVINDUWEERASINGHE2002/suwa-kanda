import React, { useState, useEffect } from 'react';
import { 
  ChefHat, 
  Clock, 
  CheckCircle2, 
  Check,
  Volume2, 
  VolumeX, 
  Sparkles, 
  RefreshCw, 
  Soup, 
  Flame,
  Utensils,
  Package,
  Bell,
  X,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { soundManager } from '../utils/sound';

export default function KitchenDisplay() {
  const { socket, connected } = useSocket();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'completed'
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [newOrderAlert, setNewOrderAlert] = useState(null);
  const [justCompletedId, setJustCompletedId] = useState(null);
  const [now, setNow] = useState(Date.now());

  // Periodically update clock for elapsed minutes
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  // Fetch orders from backend
  const fetchOrders = async () => {
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
    fetchOrders();
  }, []);

  // Real-time WebSocket Listeners
  useEffect(() => {
    if (!socket) return;

    // 1. When cashier creates / bills a new order: INSTANT ALERT & CHIME
    const handleOrderCreated = (newOrder) => {
      console.log('🔔 Kitchen received NEW order:', newOrder.token_code || newOrder.token_number);
      
      if (soundEnabled) {
        soundManager.playKitchenChime();
      }

      // Display prominent top notification alert
      setNewOrderAlert(newOrder);

      // Add to ticket list
      setOrders(prev => {
        if (prev.some(o => o.id === newOrder.id)) return prev;
        return [newOrder, ...prev];
      });

      // Automatically switch to active tab so cook sees it immediately
      setActiveTab('active');

      // Auto-dismiss banner after 12 seconds
      setTimeout(() => {
        setNewOrderAlert(curr => curr?.id === newOrder.id ? null : curr);
      }, 12000);
    };

    // 2. When order status updates
    const handleOrderUpdated = (updatedOrder) => {
      setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    };

    socket.on('order:created', handleOrderCreated);
    socket.on('order:preparing', handleOrderUpdated);
    socket.on('order:ready', handleOrderUpdated);
    socket.on('order:updated', handleOrderUpdated);

    return () => {
      socket.off('order:created', handleOrderCreated);
      socket.off('order:preparing', handleOrderUpdated);
      socket.off('order:ready', handleOrderUpdated);
      socket.off('order:updated', handleOrderUpdated);
    };
  }, [socket, soundEnabled]);

  // Status updates
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
        return data.data;
      } else {
        alert(data.error || 'Failed to update order');
      }
    } catch (err) {
      console.error('KDS update error:', err);
    }
    return null;
  };

  // Kitchen Action 1: Accept Order (භාරගන්න)
  const handleAcceptOrder = async (orderId) => {
    soundManager.playAccept();
    if (newOrderAlert?.id === orderId) {
      setNewOrderAlert(null);
    }
    await handleUpdateStatus(orderId, 'preparing');
  };

  // Kitchen Action 2: Tick Complete (✔ හදලා ඉවරයි / සූදානම්)
  const handleCompleteOrder = async (orderId) => {
    soundManager.playTickComplete();
    setJustCompletedId(orderId);
    
    await handleUpdateStatus(orderId, 'ready');

    // Keep celebration visible briefly, then reset
    setTimeout(() => {
      setJustCompletedId(curr => curr === orderId ? null : curr);
    }, 1800);
  };

  // Kitchen Action 3: Undo Complete (නැවත පිළියෙල කරන්න)
  const handleUndoOrder = async (orderId) => {
    await handleUpdateStatus(orderId, 'preparing');
    setActiveTab('active');
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

  // Separate orders into Active (Pending + Preparing) and Completed Today (Ready + Verified)
  const activeOrders = orders.filter(o => ['pending', 'preparing'].includes(o.status));
  const completedOrders = orders.filter(o => ['ready', 'verified'].includes(o.status));

  const totalBowlsCompleted = completedOrders.reduce((sum, order) => {
    return sum + (order.items?.reduce((s, i) => s + (Number(i.quantity) || 0), 0) || 0);
  }, 0);

  const displayOrders = activeTab === 'active' ? activeOrders : completedOrders;

  return (
    <div className="flex-1 flex flex-col gap-5 max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-5 pb-24 md:pb-8">
      
      {/* 1. INSTANT NEW ORDER NOTIFICATION BANNER (When Cashier Bills) */}
      {newOrderAlert && (
        <div className="sticky top-20 z-50 p-4 sm:p-5 rounded-3xl bg-amber-500 text-slate-950 shadow-2xl shadow-amber-500/40 ring-4 ring-amber-300 animate-in bounce-in duration-300">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center flex-shrink-0 animate-bounce">
                <Bell className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-black px-2 py-0.5 rounded-md bg-slate-950 text-amber-400">
                    🔔 අලුත් ඇණවුමක්! (New Order)
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    {newOrderAlert.order_type === 'dine_in' ? '🍽️ Dine-In' : '🥡 Takeaway'}
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono tracking-tight mt-0.5 flex items-center gap-2 text-slate-950">
                  Token {newOrderAlert.token_code || `#${newOrderAlert.token_number}`}
                  <span className="text-sm font-sans font-extrabold text-slate-900">
                    ({newOrderAlert.items?.reduce((s, i) => s + i.quantity, 0)} Bowls)
                  </span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-md mt-0.5">
                  {newOrderAlert.items?.map(i => `${i.sinhala_name || i.name} x${i.quantity}`).join(' • ')}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => handleAcceptOrder(newOrderAlert.id)}
                className="px-5 py-3 rounded-2xl bg-slate-950 hover:bg-slate-900 text-amber-400 font-black text-sm flex items-center gap-2 shadow-xl shadow-slate-950/50 active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <ChefHat className="w-4 h-4 text-amber-400" />
                👉 භාරගන්න (Accept Order)
              </button>
              <button
                onClick={() => setNewOrderAlert(null)}
                className="p-3 rounded-2xl bg-amber-600/30 hover:bg-amber-600/50 text-slate-950 transition-colors cursor-pointer"
                title="Dismiss Banner"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Top Focused Kitchen Header */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/95 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Title & Live Status */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-950/40 flex-shrink-0">
            <ChefHat className="w-7 h-7 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Kitchen Display (සුව කැඳ කුස්සිය)
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30 animate-pulse">
                {connected ? '● LIVE SYNC' : 'CONNECTING'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              තණමල්විල ඖෂධීය කැඳ පිළියෙල කිරීමේ අංශය
            </p>
          </div>
        </div>

        {/* Sound & Refresh Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
              soundEnabled 
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900/50' 
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Toggle Order Chime Sound"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
            <span>{soundEnabled ? 'නාදය සක්‍රියයි' : 'Muted'}</span>
          </button>

          {/* Test Sound */}
          <button
            onClick={handleTestSound}
            className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-750 text-amber-400 border border-slate-700/80 transition-all active:scale-95 cursor-pointer"
            title="Test Chime Sound & Vibration"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          {/* Refresh Orders */}
          <button
            onClick={fetchOrders}
            className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700/80 transition-all active:scale-95 cursor-pointer"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>

      </div>

      {/* 3. Essential Two Primary Tabs: Active vs Completed Today */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900/90 rounded-2xl border border-slate-800 w-full sm:w-auto">
          {/* Tab 1: Active Cooking Orders */}
          <button
            onClick={() => setActiveTab('active')}
            className={`px-5 py-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'active'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>පිළියෙල කරන ඇණවුම් (Active)</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
              activeTab === 'active' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-amber-400'
            }`}>
              {activeOrders.length}
            </span>
          </button>

          {/* Tab 2: Completed Orders Today */}
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-5 py-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'completed'
                ? 'bg-emerald-600 text-white shadow-md font-black'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>අද සූදානම් කළ ඇණවුම් (Done)</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
              activeTab === 'completed' ? 'bg-white/20 text-white' : 'bg-slate-800 text-emerald-400'
            }`}>
              {completedOrders.length}
            </span>
          </button>
        </div>

        {/* Quick Summary Pill for Completed Tab */}
        {activeTab === 'completed' && (
          <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
            <span>අද නිමකළ ඇණවුම්: <strong className="font-mono text-white text-sm">{completedOrders.length}</strong></span>
            <span className="text-emerald-700">|</span>
            <span>මුළු කෝප්ප: <strong className="font-mono text-white text-sm">{totalBowlsCompleted}</strong></span>
          </div>
        )}

      </div>

      {/* 4. Orders Grid (Active or Completed) */}
      {displayOrders.length === 0 ? (
        <div className="py-20 rounded-3xl bg-slate-900/40 border border-slate-800/80 flex flex-col items-center justify-center gap-3 text-slate-400 text-center px-4">
          <div className="w-16 h-16 rounded-3xl bg-slate-800/60 flex items-center justify-center text-slate-500">
            <Soup className="w-8 h-8 stroke-1" />
          </div>
          <h3 className="text-lg font-bold text-slate-200">
            {activeTab === 'active' 
              ? 'පිළියෙල කිරීමට නව ඇණවුම් නොමැත (No Active Orders)' 
              : 'අද සූදානම් කළ ඇණවුම් නොමැත (No Completed Orders Yet)'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm">
            {activeTab === 'active' 
              ? 'කැෂියර් බිල්පත් කළ පසු නව ඇණවුම් මෙහි ස්වයංක්‍රීයව ශබ්දය සමඟ දිස්වේ.' 
              : 'ඔබ ටික් (✔) කර සම්පූර්ණ කරන ඇණවුම් සියල්ල මෙහි සටහන් වේ.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-stretch">
          {displayOrders.map(order => {
            const isPending = order.status === 'pending';
            const isPreparing = order.status === 'preparing';
            const isReady = ['ready', 'verified'].includes(order.status);
            const isCelebrating = justCompletedId === order.id;
            const elapsed = getElapsedMinutes(order.created_at);
            const isUrgent = elapsed >= 8 && !isReady;
            const totalBowlsInOrder = order.items?.reduce((s, i) => s + (Number(i.quantity) || 0), 0) || 0;

            return (
              <div
                key={order.id}
                className={`
                  p-5 rounded-3xl border-2 transition-all flex flex-col justify-between select-none shadow-xl relative overflow-hidden
                  ${isCelebrating
                    ? 'bg-emerald-950/80 border-emerald-400 ring-4 ring-emerald-400/50 scale-[1.02]'
                    : isPending
                    ? 'bg-slate-900/95 border-amber-400 ring-2 ring-amber-400/30 shadow-amber-950/40'
                    : isPreparing
                    ? isUrgent
                      ? 'bg-slate-900/95 border-rose-500 ring-2 ring-rose-500/40 shadow-rose-950/50'
                      : 'bg-slate-900/95 border-teal-500/60 ring-1 ring-teal-500/30 shadow-teal-950/30'
                    : 'bg-slate-900/80 border-slate-800 opacity-90'
                  }
                `}
              >
                {/* Celebration Overlay on Tick Complete */}
                {isCelebrating && (
                  <div className="absolute inset-0 bg-emerald-600/95 z-20 flex flex-col items-center justify-center gap-2 text-white animate-in zoom-in-95 duration-200">
                    <div className="w-16 h-16 rounded-full bg-white text-emerald-600 flex items-center justify-center shadow-2xl">
                      <Check className="w-10 h-10 stroke-[3]" />
                    </div>
                    <span className="text-2xl font-black font-mono">
                      Token {order.token_code || `#${order.token_number}`}
                    </span>
                    <span className="text-base font-black font-sinhala">
                      ✔ සූදානම් කර නිමයි!
                    </span>
                  </div>
                )}

                <div>
                  {/* Card Header: Giant Token + Order Mode + Elapsed */}
                  <div className="flex items-start justify-between pb-3.5 border-b border-slate-800">
                    <div>
                      {/* Giant Monospace Token */}
                      <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white block">
                        {order.token_code || order.token_display || `#${order.token_number}`}
                      </span>

                      {/* Order Type Badge */}
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg flex items-center gap-1 ${
                          order.order_type === 'dine_in' 
                            ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/60' 
                            : 'bg-teal-950/70 text-teal-300 border border-teal-800/60'
                        }`}>
                          {order.order_type === 'dine_in' ? <Utensils className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                          {order.order_type === 'dine_in' ? 'Dine-In (ශාලාවේදී)' : 'Takeaway (රැගෙන යාමට)'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      {/* Status Stage Badge */}
                      {isPending && (
                        <span className="text-[11px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse flex items-center gap-1">
                          <Bell className="w-3 h-3 text-amber-400" />
                          අලුත් ඇණවුම
                        </span>
                      )}
                      {isPreparing && (
                        <span className="text-[11px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/40 flex items-center gap-1">
                          <Flame className="w-3 h-3 text-sky-400 animate-bounce" />
                          පිළියෙල කරමින්
                        </span>
                      )}
                      {isReady && (
                        <span className="text-[11px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-400" />
                          සූදානම්
                        </span>
                      )}

                      {/* Elapsed Time / Order Time */}
                      {!isReady ? (
                        <span className={`text-xs font-mono font-bold flex items-center gap-1 ${
                          isUrgent ? 'text-rose-400 font-black animate-pulse' : 'text-slate-400'
                        }`}>
                          {isUrgent ? <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> : <Clock className="w-3.5 h-3.5" />}
                          {elapsed} min
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-400">
                          {order.created_at ? order.created_at.slice(11, 16) : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Congee Line Items: Big Sinhala Names & Giant Quantities */}
                  <div className="py-3.5 flex flex-col gap-2.5">
                    {order.items?.map((item, idx) => (
                      <div 
                        key={idx}
                        className="p-3 rounded-2xl bg-slate-850/90 border border-slate-800 flex items-center justify-between gap-3 shadow-sm"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-emerald-400 flex-shrink-0">
                            <Soup className="w-4 h-4 stroke-[2.2]" />
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Large Sinhala Label */}
                            <div className="text-base sm:text-lg font-black font-sinhala text-emerald-300 leading-tight truncate">
                              {item.sinhala_name || item.name}
                            </div>
                            {/* English Sub-Label */}
                            <div className="text-[11px] font-semibold text-slate-400 truncate">
                              {item.name}
                            </div>
                          </div>
                        </div>

                        {/* Giant High-Contrast Quantity Badge */}
                        <div className="w-12 h-11 rounded-2xl bg-slate-900 border-2 border-emerald-500/50 text-emerald-300 font-mono font-black text-xl flex items-center justify-center flex-shrink-0 shadow-inner">
                          x{item.quantity}
                        </div>
                      </div>
                    ))}

                    {/* Total Bowls Subtext */}
                    <div className="text-right text-[11px] font-bold text-slate-400 pt-0.5">
                      මුළු කෝප්ප: <span className="text-emerald-300 font-mono text-xs">{totalBowlsInOrder}</span>
                    </div>
                  </div>
                </div>

                {/* 5. Clear Workflow Action Buttons (Accept -> Tick Complete -> Undo) */}
                <div className="pt-3 border-t border-slate-800">
                  {/* Action 1: Pending Order -> ACCEPT */}
                  {isPending && (
                    <button
                      onClick={() => handleAcceptOrder(order.id)}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl shadow-amber-950/50 active:scale-95 cursor-pointer ring-2 ring-amber-300/40"
                    >
                      <ChefHat className="w-5 h-5 text-slate-950" />
                      <span>👉 භාරගන්න (Accept Order)</span>
                    </button>
                  )}

                  {/* Action 2: Preparing Order -> TICK COMPLETE */}
                  {isPreparing && (
                    <button
                      onClick={() => handleCompleteOrder(order.id)}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/80 active:scale-95 cursor-pointer ring-2 ring-emerald-400/50"
                    >
                      <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                      <span>✔ හදලා ඉවරයි (Mark Complete)</span>
                    </button>
                  )}

                  {/* Action 3: Already Ready / Completed -> Done + Undo Button */}
                  {isReady && (
                    <div className="flex items-center justify-between gap-2">
                      <div className="px-3.5 py-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 flex-1">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>සූදානම් කර නිමයි (Completed)</span>
                      </div>
                      <button
                        onClick={() => handleUndoOrder(order.id)}
                        className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Move back to Preparing"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>ආපසු</span>
                      </button>
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
