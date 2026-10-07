import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Soup, 
  Store, 
  ChefHat, 
  Receipt, 
  BarChart3, 
  Sliders, 
  Radio, 
  Database,
  Sparkles
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';

export default function Navbar() {
  const { connected } = useSocket();

  const navItems = [
    { to: '/cashier', label: 'Cashier POS', sinhala: 'කැෂියර්', icon: Store, accent: 'emerald' },
    { to: '/kitchen', label: 'Kitchen KDS', sinhala: 'කුස්සිය', icon: ChefHat, accent: 'amber' },
    { to: '/expenses', label: 'Expenses', sinhala: 'වියදම්', icon: Receipt, accent: 'rose' },
    { to: '/reports', label: 'Reports', sinhala: 'වාර්තා', icon: BarChart3, accent: 'teal' },
    { to: '/setup', label: 'Setup', sinhala: 'සැකසුම්', icon: Sliders, accent: 'slate' },
  ];

  return (
    <>
      {/* 1. Main Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-950/70 ring-2 ring-emerald-400/30 flex-shrink-0 animate-in fade-in">
              <Soup className="w-7 h-7 text-white stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-1.5 font-sans">
                  Suwa Kanda <span className="text-emerald-400 font-semibold font-sinhala text-lg sm:text-xl">(සුව කැඳ)</span>
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold uppercase tracking-wider hidden sm:inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  Thanamalwila
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Herbal Congee Operations & Realtime Kitchen Workflow
              </p>
            </div>
          </div>

          {/* Desktop & Tablet Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `
                    px-3.5 py-2 rounded-2xl transition-all flex items-center gap-2.5 whitespace-nowrap active:scale-95 group
                    ${isActive 
                      ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-950/70 ring-1 ring-emerald-400/40' 
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent hover:border-slate-700/60'
                    }
                  `}
                >
                  <div className={`p-1.5 rounded-xl transition-colors ${
                    item.accent === 'amber' ? 'group-hover:text-amber-400' : 'group-hover:text-emerald-400'
                  }`}>
                    <Icon className="w-4 h-4 flex-shrink-0 stroke-[2.2]" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold leading-tight">{item.label}</span>
                    <span className="text-[10px] font-sinhala text-emerald-200/80 leading-tight">{item.sinhala}</span>
                  </div>
                </NavLink>
              );
            })}
          </nav>

          {/* System Sync Badges */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border text-xs transition-all ${
              connected 
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' 
                : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
            }`}>
              <Radio className={`w-3.5 h-3.5 ${connected ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
              <span className="font-mono text-[11px] font-bold">
                {connected ? 'Live Sync' : 'Reconnecting...'}
              </span>
            </div>
          </div>

        </div>
      </header>

      {/* 2. Mobile Thumb-Friendly Bottom Navigation Bar (Fitts's Law HCI Standard) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/90 px-2 py-2 flex items-center justify-around shadow-2xl safe-area-pb">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `
                flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all active:scale-90 min-w-[60px]
                ${isActive 
                  ? 'bg-emerald-600/20 text-emerald-400 ring-1 ring-emerald-500/40 font-bold' 
                  : 'text-slate-400 hover:text-slate-200'
                }
              `}
            >
              <Icon className="w-5 h-5 mb-0.5 stroke-[2.2]" />
              <span className="text-[10px] font-bold leading-none">{item.sinhala}</span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}
