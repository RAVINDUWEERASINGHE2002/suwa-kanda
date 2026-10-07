import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import CashierPOS from './pages/CashierPOS';
import KitchenDisplay from './pages/KitchenDisplay';
import ExpensesPage from './pages/ExpensesPage';
import ReportsPage from './pages/ReportsPage';
import SetupPage from './pages/SetupPage';

export default function App() {
  return (
    <SocketProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
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

          <footer className="border-t border-slate-800/80 bg-slate-900/40 py-5 text-center text-xs text-slate-400">
            <p>Suwa Kanda (සුව කැඳ) • Thanamalwila Junction • Authentic Herbal Congee Operations</p>
            <p className="text-slate-400 mt-0.5">Express 5 • Socket.io 4 • SQLite (WAL Mode) • React 19 • Tailwind CSS</p>
          </footer>
        </div>
      </BrowserRouter>
    </SocketProvider>
  );
}
