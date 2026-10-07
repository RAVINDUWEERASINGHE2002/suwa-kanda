import React, { Component } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import CashierPOS from './pages/CashierPOS';
import KitchenDisplay from './pages/KitchenDisplay';
import ExpensesPage from './pages/ExpensesPage';
import ReportsPage from './pages/ReportsPage';
import SetupPage from './pages/SetupPage';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('App ErrorBoundary caught:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 max-w-md w-full shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center text-3xl mb-4">
              ⚠️
            </div>
            <h2 className="text-xl font-bold mb-2">පද්ධතියේ දෝෂයක් (System Notice)</h2>
            <p className="text-xs text-slate-400 mb-6 font-mono text-left bg-slate-950 p-3 rounded-xl border border-slate-800 overflow-auto max-h-32">
              {this.state.error?.message || 'Unexpected application error'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all"
            >
              නැවත පූරණය කරන්න (Reload App)
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <SocketProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white relative overflow-x-hidden">
          {/* Authentic Atmospheric Background Image for Suwa Kanda Herbal Congee */}
          <div 
            className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat opacity-[0.16] mix-blend-luminosity scale-105 transition-opacity"
            style={{ backgroundImage: `url('/images/suwa_kanda_bg.jpg')` }}
          />
          <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-slate-950/80 via-slate-950/90 to-slate-950/98 backdrop-blur-[0.5px]" />

          {/* Foreground App Content */}
          <div className="relative z-10 flex flex-col flex-1 min-h-screen">
            <Navbar />
            
            <main className="flex-1 flex flex-col">
              <Routes>
                <Route path="/" element={<Navigate to="/cashier" replace />} />
                <Route path="/cashier" element={<CashierPOS />} />
                <Route path="/kitchen" element={<KitchenDisplay />} />
                <Route path="/expenses" element={<ExpensesPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/setup" element={<SetupPage />} />
                <Route path="*" element={<Navigate to="/cashier" replace />} />
              </Routes>
            </main>

            <footer className="border-t border-slate-800/80 bg-slate-900/60 backdrop-blur-md py-5 text-center text-xs text-slate-400">
              <p>Suwa Kanda (සුව කැඳ) • Thanamalwila Junction • Authentic Herbal Congee Operations</p>
              <p className="text-slate-500 mt-0.5">Express 5 • Socket.io 4 • Turso Cloud Edge Database • React 19 • Tailwind CSS</p>
            </footer>
          </div>
        </div>
      </BrowserRouter>
    </SocketProvider>
    </ErrorBoundary>
  );
}
