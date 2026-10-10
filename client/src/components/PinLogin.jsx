import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Unlock, 
  Delete, 
  ShieldCheck, 
  UserCheck, 
  KeyRound, 
  AlertCircle,
  Soup,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function PinLogin({ onSuccess, requiredRole = null }) {
  const { loginWithPin, loading } = useAuth();
  const [pin, setPin] = useState('');
  const [selectedRole, setSelectedRole] = useState(requiredRole === 'admin' ? 'admin' : 'cashier');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  // Keyboard support for PC / Laptop cashier
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin]);

  const handleDigit = (digit) => {
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError('');

      // Auto submit when 4 digits are entered
      if (nextPin.length === 4) {
        attemptLogin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const attemptLogin = async (pinToTry) => {
    const targetPin = pinToTry || pin;
    if (!targetPin) return;

    const result = await loginWithPin(targetPin, selectedRole);
    if (result.success) {
      if (requiredRole === 'admin' && result.user.role !== 'admin') {
        setError('මෙම අංශයට පිවිසීමට Admin / Owner PIN අංකය (9999) අවශ්‍ය වේ.');
        triggerShake();
        setPin('');
      } else {
        if (onSuccess) onSuccess(result.user);
      }
    } else {
      setError(result.error || 'වැරදි PIN අංකයකි');
      triggerShake();
      setPin('');
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div 
        className={`
          w-full max-w-sm p-6 sm:p-8 rounded-3xl bg-slate-900/95 border border-slate-800 shadow-2xl backdrop-blur-xl relative overflow-hidden transition-transform
          ${shake ? 'animate-bounce border-rose-500/80 ring-2 ring-rose-500/30' : ''}
        `}
      >
        {/* Glow ambient background */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Brand Icon & Heading */}
        <div className="text-center flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center shadow-xl shadow-emerald-950/80 mb-3 ring-2 ring-emerald-400/30">
            <Lock className="w-7 h-7 stroke-[2.2]" />
          </div>
          <h2 className="text-xl font-black text-white flex items-center gap-1.5 font-sans">
            සුව කැඳ <span className="text-emerald-400 font-sinhala font-bold">පිවිසුම</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            කැෂියර් හෝ පරිපාලන තොරතුරු බැලීමට PIN අංකය ඇතුළත් කරන්න
          </p>
        </div>

        {/* Profile Selector (Cashier vs Admin) */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/80 rounded-2xl border border-slate-800/80 mb-6">
          <button
            type="button"
            onClick={() => { setSelectedRole('cashier'); setError(''); setPin(''); }}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              selectedRole === 'cashier'
                ? 'bg-emerald-600 text-white shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>කැෂියර් (1234)</span>
          </button>

          <button
            type="button"
            onClick={() => { setSelectedRole('admin'); setError(''); setPin(''); }}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              selectedRole === 'admin'
                ? 'bg-teal-600 text-white shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>හිමිකරු (9999)</span>
          </button>
        </div>

        {/* PIN Indicators (4 Dots) */}
        <div className="flex items-center justify-center gap-4 mb-6">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = idx < pin.length;
            return (
              <div
                key={idx}
                className={`
                  w-4 h-4 rounded-full transition-all duration-200 border-2
                  ${isFilled 
                    ? 'bg-emerald-400 border-emerald-400 scale-125 shadow-lg shadow-emerald-400/50' 
                    : 'bg-slate-800 border-slate-700'
                  }
                `}
              />
            );
          })}
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center flex items-center justify-center gap-1.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Touchscreen-Friendly Number Pad (3x4 Grid) */}
        <div className="grid grid-cols-3 gap-2.5 mb-5 select-none">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(num.toString())}
              disabled={loading}
              className="h-14 rounded-2xl bg-slate-800/90 hover:bg-slate-750 active:bg-emerald-600 active:text-white text-white font-mono font-bold text-xl border border-slate-700/80 shadow-md transition-all active:scale-95 flex items-center justify-center cursor-pointer"
            >
              {num}
            </button>
          ))}

          {/* Clear Button */}
          <button
            type="button"
            onClick={handleClear}
            disabled={loading}
            className="h-14 rounded-2xl bg-slate-850 hover:bg-slate-800 active:bg-slate-700 text-slate-400 hover:text-white font-bold text-xs uppercase tracking-wider border border-slate-800 transition-all active:scale-95 flex items-center justify-center cursor-pointer"
          >
            Clear
          </button>

          {/* 0 Button */}
          <button
            type="button"
            onClick={() => handleDigit('0')}
            disabled={loading}
            className="h-14 rounded-2xl bg-slate-800/90 hover:bg-slate-750 active:bg-emerald-600 active:text-white text-white font-mono font-bold text-xl border border-slate-700/80 shadow-md transition-all active:scale-95 flex items-center justify-center cursor-pointer"
          >
            0
          </button>

          {/* Backspace Button */}
          <button
            type="button"
            onClick={handleBackspace}
            disabled={loading}
            className="h-14 rounded-2xl bg-slate-850 hover:bg-slate-800 active:bg-slate-700 text-slate-400 hover:text-rose-400 border border-slate-800 transition-all active:scale-95 flex items-center justify-center cursor-pointer"
            title="Backspace"
          >
            <Delete className="w-5 h-5 stroke-[2.2]" />
          </button>
        </div>

        {/* Quick Hint Footer */}
        <div className="pt-3 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-400 font-mono">
            Default Cashier PIN: <strong className="text-emerald-400">1234</strong> • Admin PIN: <strong className="text-teal-400">9999</strong>
          </p>
        </div>

      </div>
    </div>
  );
}
