import React, { useState } from 'react';
import { X, PlusCircle, Sparkles, Soup, CheckCircle2, AlertCircle } from 'lucide-react';
import { soundManager } from '../utils/sound';

const QUICK_PRESETS = [
  { name: 'Gotukola Kanda', sinhala_name: 'ගොටුකොළ කැඳ', price: 140, station_id: 'kola' },
  { name: 'Karapincha Kanda', sinhala_name: 'කරපිංචා කැඳ', price: 135, station_id: 'kola' },
  { name: 'Rasakinda Kanda', sinhala_name: 'රසකිඳ කැඳ', price: 150, station_id: 'herbal' },
  { name: 'Welpenela Kanda', sinhala_name: 'වැල්පෙනෙල කැඳ', price: 160, station_id: 'herbal' },
  { name: 'Iramusu Kanda', sinhala_name: 'ඉරමුසු කැඳ', price: 150, station_id: 'herbal' },
  { name: 'Elabatu Kanda', sinhala_name: 'එළබටු කැඳ', price: 150, station_id: 'herbal' },
  { name: 'Ulundu Kanda', sinhala_name: 'උළුඳු කැඳ', price: 140, station_id: 'grain' },
  { name: 'Monarakudumbiya Kanda', sinhala_name: 'මොනරකුඩුම්බිය කැඳ', price: 140, station_id: 'kola' },
];

export default function AddMenuItemModal({ isOpen, onClose, onItemAdded }) {
  const [name, setName] = useState('');
  const [sinhalaName, setSinhalaName] = useState('');
  const [price, setPrice] = useState('');
  const [stationId, setStationId] = useState('kola');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  if (!isOpen) return null;

  const handleApplyPreset = (preset) => {
    setName(preset.name);
    setSinhalaName(preset.sinhala_name);
    setPrice(preset.price.toString());
    setStationId(preset.station_id);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !sinhalaName.trim() || !price) {
      setError('Please fill in all required fields');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Please enter a valid positive price');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          sinhala_name: sinhalaName.trim(),
          price: priceNum,
          station_id: stationId
        })
      });

      const data = await res.json();
      if (data.success) {
        soundManager.playOrderPlaced();
        setSuccess(`Successfully added "${data.data.name} (${data.data.sinhala_name})" to menu!`);
        if (onItemAdded) onItemAdded(data.data);
        
        // Reset inputs
        setName('');
        setSinhalaName('');
        setPrice('');
        
        setTimeout(() => {
          setSuccess(null);
          onClose();
        }, 1200);
      } else {
        setError(data.error || 'Failed to add menu item');
      }
    } catch (err) {
      console.error('Add menu item error:', err);
      setError('Failed to communicate with backend server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Soup className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Add New Congee Variety
              </h3>
              <p className="text-xs text-slate-300 font-sinhala font-medium">
                නව කැඳ වර්ගයක් මෙනුවට එක් කරන්න
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Quick Preset Pills */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Quick Suggestions (ක්ෂණික තේරීම්):</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-medium transition-all flex items-center gap-1.5 active:scale-95 hover:border-emerald-500/50"
                >
                  <span className="font-sinhala text-emerald-300 font-semibold">{p.sinhala_name}</span>
                  <span className="font-mono text-[11px] text-slate-400">Rs.{p.price}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="p-3 rounded-2xl bg-rose-950/70 border border-rose-600/50 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-2xl bg-emerald-950/70 border border-emerald-600/50 text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              <span>{success}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                English Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Gotukola Kanda"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-800/90 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Sinhala Name (සිංහල නම) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. ගොටුකොළ කැඳ"
                value={sinhalaName}
                onChange={(e) => setSinhalaName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-800/90 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500 font-sinhala font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Price (LKR) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">Rs.</span>
                  <input
                    type="number"
                    step="5"
                    placeholder="140"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-slate-800/90 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Kitchen Prep Station
                </label>
                <select
                  value={stationId}
                  onChange={(e) => setStationId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl bg-slate-800/90 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium h-[42px]"
                >
                  <option value="kola">🌿 Kola (කොළ)</option>
                  <option value="grain">🌾 Grain (ධාන්‍ය)</option>
                  <option value="herbal">🍵 Herbal (ඖෂධීය)</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              
              <button
                type="submit"
                disabled={loading || !name.trim() || !sinhalaName.trim() || !price}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-40 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-950/60 active:scale-95 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                {loading ? 'Adding...' : 'Add to Menu'}
              </button>
            </div>
          </form>

        </div>

      </div>
    </div>
  );
}
