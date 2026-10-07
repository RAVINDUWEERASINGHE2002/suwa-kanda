import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Database, 
  Users, 
  Soup, 
  RefreshCw, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Volume2, 
  Sparkles,
  PlusCircle,
  Trash2,
  Tag,
  Plus
} from 'lucide-react';
import { soundManager } from '../utils/sound';

const QUICK_SUGGESTIONS = [
  { name: 'Gotukola Kanda', sinhala_name: 'ගොටුකොළ කැඳ', price: 130, station_id: 'kola' },
  { name: 'Welpenela Kanda', sinhala_name: 'වැල්පෙනෙල කැඳ', price: 160, station_id: 'herbal' },
  { name: 'Iramusu Kanda', sinhala_name: 'ඉරමුසු කැඳ', price: 150, station_id: 'herbal' },
  { name: 'Elabatu Kanda', sinhala_name: 'එළබටු කැඳ', price: 150, station_id: 'herbal' },
  { name: 'Ulundu Kanda', sinhala_name: 'උළුඳු කැඳ', price: 140, station_id: 'grain' },
  { name: 'Monarakudumbiya Kanda', sinhala_name: 'මොනරකුඩුම්බිය කැඳ', price: 140, station_id: 'kola' },
];

export default function SetupPage() {
  const [health, setHealth] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);

  // Menu items edit state: { [id]: { price, is_active } }
  const [menuEdits, setMenuEdits] = useState({});
  const [savingMenuId, setSavingMenuId] = useState(null);
  const [menuSavedNotice, setMenuSavedNotice] = useState(null);

  // New Menu Item Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSinhalaName, setNewSinhalaName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newStation, setNewStation] = useState('kola');
  const [addingItem, setAddingItem] = useState(false);
  const [addNotice, setAddNotice] = useState(null);

  // Partners edit state
  const [partnerEdits, setPartnerEdits] = useState([]);
  const [savingPartners, setSavingPartners] = useState(false);
  const [partnerNotice, setPartnerNotice] = useState(null);

  const fetchSetupData = async () => {
    try {
      setLoading(true);
      const [hRes, mRes, pRes] = await Promise.all([
        fetch('/api/health'),
        fetch('/api/menu?includeInactive=true'),
        fetch('/api/partners')
      ]);

      if (hRes.ok) setHealth(await hRes.json());
      if (mRes.ok) {
        const d = await mRes.json();
        if (d.success) {
          setMenuItems(d.data);
          const edits = {};
          d.data.forEach(item => {
            edits[item.id] = { price: item.price, is_active: !!item.is_active };
          });
          setMenuEdits(edits);
        }
      }
      if (pRes.ok) {
        const d = await pRes.json();
        if (d.success) {
          setPartners(d.data);
          setPartnerEdits(d.data.map(p => ({ ...p })));
        }
      }
    } catch (err) {
      console.error('Setup fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSetupData();
  }, []);

  // Update existing menu item price
  const handleMenuPriceChange = (id, newP) => {
    setMenuEdits(prev => ({
      ...prev,
      [id]: { ...prev[id], price: newP }
    }));
  };

  const handleToggleActive = async (item) => {
    const currentActive = menuEdits[item.id]?.is_active ?? !!item.is_active;
    const nextActive = !currentActive;

    setMenuEdits(prev => ({
      ...prev,
      [item.id]: { ...prev[item.id], is_active: nextActive }
    }));

    try {
      setSavingMenuId(item.id);
      const res = await fetch(`/api/menu/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextActive ? 1 : 0 })
      });
      const data = await res.json();
      if (data.success) {
        setMenuItems(prev => prev.map(m => m.id === item.id ? data.data : m));
        setMenuSavedNotice(item.id);
        setTimeout(() => setMenuSavedNotice(null), 2000);
      }
    } catch (err) {
      console.error('Toggle error:', err);
    } finally {
      setSavingMenuId(null);
    }
  };

  const handleSaveMenuPrice = async (itemId) => {
    const edit = menuEdits[itemId];
    if (!edit) return;
    const priceNum = parseFloat(edit.price);
    if (isNaN(priceNum) || priceNum < 0) {
      alert('Please enter a valid price');
      return;
    }

    try {
      setSavingMenuId(itemId);
      const res = await fetch(`/api/menu/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: priceNum })
      });
      const data = await res.json();
      if (data.success) {
        setMenuItems(prev => prev.map(m => m.id === itemId ? data.data : m));
        setMenuSavedNotice(itemId);
        setTimeout(() => setMenuSavedNotice(null), 2500);
      } else {
        alert(data.error || 'Failed to update price');
      }
    } catch (err) {
      console.error('Price save error:', err);
    } finally {
      setSavingMenuId(null);
    }
  };

  const handleDeleteMenuItem = async (itemId) => {
    if (!confirm('Are you sure you want to remove this congee from the menu?')) return;
    try {
      const res = await fetch(`/api/menu/${itemId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        if (data.deactivated) {
          alert('Note: This item has past sales history, so it was deactivated instead of completely deleted to preserve reports.');
        }
        fetchSetupData();
      } else {
        alert(data.error || 'Failed to delete menu item');
      }
    } catch (err) {
      console.error('Delete menu item error:', err);
    }
  };

  // Add New Menu Item Submit
  const handleAddNewItem = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !newSinhalaName.trim() || !newPrice) return;
    const priceNum = parseFloat(newPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      alert('Please enter a valid positive price');
      return;
    }

    try {
      setAddingItem(true);
      setAddNotice(null);

      const res = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          sinhala_name: newSinhalaName.trim(),
          price: priceNum,
          station_id: newStation
        })
      });

      const data = await res.json();
      if (data.success) {
        soundManager.playOrderPlaced();
        setAddNotice({ type: 'success', message: `Added "${data.data.name} (${data.data.sinhala_name})" to menu!` });
        setNewName('');
        setNewSinhalaName('');
        setNewPrice('');
        fetchSetupData();
        setTimeout(() => setAddNotice(null), 4000);
      } else {
        setAddNotice({ type: 'error', message: data.error || 'Failed to add menu item' });
      }
    } catch (err) {
      console.error('Add menu item error:', err);
      setAddNotice({ type: 'error', message: 'Error communicating with backend' });
    } finally {
      setAddingItem(false);
    }
  };

  const handleApplySuggestion = (sug) => {
    setNewName(sug.name);
    setNewSinhalaName(sug.sinhala_name);
    setNewPrice(sug.price.toString());
    setNewStation(sug.station_id);
    setShowAddForm(true);
  };

  // Partners update logic
  const handlePartnerChange = (index, field, value) => {
    setPartnerEdits(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const partnersTotalPercentage = partnerEdits.reduce((sum, p) => sum + (parseFloat(p.share_percentage) || 0), 0);
  const roundedPartnerTotal = Math.round(partnersTotalPercentage * 100) / 100;
  const isPercentageValid = Math.abs(roundedPartnerTotal - 100) < 0.01;

  const handleSavePartners = async (e) => {
    e.preventDefault();
    if (!isPercentageValid) {
      alert(`Validation error: Total partner shares must equal exactly 100%. (Current total: ${roundedPartnerTotal}%)`);
      return;
    }

    try {
      setSavingPartners(true);
      setPartnerNotice(null);

      const payload = partnerEdits.map(p => ({
        id: p.id,
        name: p.name.trim(),
        share_percentage: parseFloat(p.share_percentage)
      }));

      const res = await fetch('/api/partners', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partners: payload })
      });

      const data = await res.json();
      if (data.success) {
        setPartners(data.data);
        setPartnerEdits(data.data.map(p => ({ ...p })));
        setPartnerNotice({ type: 'success', message: 'Partners & percentage shares saved successfully!' });
        setTimeout(() => setPartnerNotice(null), 4000);
      } else {
        setPartnerNotice({ type: 'error', message: data.error || 'Failed to update partners' });
      }
    } catch (err) {
      console.error('Partner save error:', err);
      setPartnerNotice({ type: 'error', message: 'Error connecting to backend API' });
    } finally {
      setSavingPartners(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            Store Setup & Menu Management
          </h2>
          <p className="text-xs text-slate-400">
            Add new congee varieties, adjust prices, toggle recipes active/disabled, and manage partner equity
          </p>
        </div>

        <button
          onClick={fetchSetupData}
          className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all active:scale-95"
          title="Refresh Configurations"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
        </button>
      </div>

      {/* 1. Prominent "Add New Congee Variety" Section */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/40 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-base sm:text-lg text-white flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-emerald-400" />
              Add New Congee Variety (නව කැඳ වර්ගයක් එක් කරන්න)
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Instantly registers into SQLite and becomes immediately available on Cashier POS and Kitchen KDS
            </p>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto shadow-md"
          >
            <Plus className="w-4 h-4" />
            {showAddForm ? 'Hide Form' : '+ Add New Item'}
          </button>
        </div>

        {addNotice && (
          <div className={`mt-4 p-3 rounded-2xl text-xs flex items-center gap-2 ${
            addNotice.type === 'success' 
              ? 'bg-emerald-950/80 border border-emerald-500 text-emerald-200' 
              : 'bg-rose-950/80 border border-rose-500 text-rose-200'
          }`}>
            {addNotice.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{addNotice.message}</span>
          </div>
        )}

        {/* Quick Suggestion Pills */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Quick Add Suggestions:
          </span>
          {QUICK_SUGGESTIONS.map((sug, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplySuggestion(sug)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 active:scale-95"
            >
              <span className="font-sinhala text-emerald-300 font-semibold">{sug.sinhala_name}</span>
              <span className="text-slate-400">({sug.name})</span>
              <span className="font-mono text-xs font-bold text-white">Rs. {sug.price}</span>
            </button>
          ))}
        </div>

        {/* Add Item Form */}
        {showAddForm && (
          <form onSubmit={handleAddNewItem} className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                English Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Gotukola Kanda"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Sinhala Name (සිංහල නම) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. ගොටුකොළ කැඳ"
                value={newSinhalaName}
                onChange={(e) => setNewSinhalaName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 font-sinhala font-semibold"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Selling Price (LKR) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                step="5"
                placeholder="e.g. 140"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Kitchen Prep Station
              </label>
              <select
                value={newStation}
                onChange={(e) => setNewStation(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
              >
                <option value="kola">🌿 Kola Station (කොළ කැඳ)</option>
                <option value="grain">🌾 Grain Station (ධාන්‍ය කැඳ)</option>
                <option value="herbal">🍵 Herbal Station (ඖෂධීය කැඳ)</option>
              </select>
            </div>

            <div>
              <button
                type="submit"
                disabled={addingItem || !newName || !newSinhalaName || !newPrice}
                className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-40 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/80 active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                {addingItem ? 'Saving...' : 'Add Congee to Menu'}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* 2. Menu Item Prices, Active Toggles & Delete (7 Columns) */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Soup className="w-5 h-5 text-emerald-400" />
                Active Recipes & Prices
              </h3>
              <p className="text-xs text-slate-400">Manage selling prices, activate/disable, or remove congee varieties</p>
            </div>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
              {menuItems.length} Recipes
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {menuItems.map(item => {
              const edit = menuEdits[item.id] || { price: item.price, is_active: !!item.is_active };
              const isSaved = menuSavedNotice === item.id;
              const isSaving = savingMenuId === item.id;
              const stationColors = {
                kola: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40',
                grain: 'text-amber-400 bg-amber-950/40 border-amber-800/40',
                herbal: 'text-teal-400 bg-teal-950/40 border-teal-800/40',
              }[item.station_id] || 'text-slate-400 bg-slate-800';

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    edit.is_active ? 'bg-slate-850 border-slate-800' : 'bg-slate-900/40 border-slate-800/50 opacity-60'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{item.name}</span>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${stationColors}`}>
                        {item.station_id}
                      </span>
                    </div>
                    <div className="text-base font-sinhala font-semibold text-emerald-300 mt-0.5">
                      {item.sinhala_name}
                    </div>
                  </div>

                  {/* Controls: Active toggle, Price Edit & Delete */}
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    
                    {/* Active Toggle Switch */}
                    <button
                      type="button"
                      onClick={() => handleToggleActive(item)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        edit.is_active 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30' 
                          : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
                      }`}
                      title={edit.is_active ? 'Click to deactivate' : 'Click to activate'}
                    >
                      <span className={`w-2 h-2 rounded-full ${edit.is_active ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                      {edit.is_active ? 'Active' : 'Disabled'}
                    </button>

                    {/* Price Input with Save */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400 font-mono">Rs.</span>
                      <input
                        type="number"
                        step="5"
                        value={edit.price}
                        onChange={(e) => handleMenuPriceChange(item.id, e.target.value)}
                        className="w-20 px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white font-mono font-bold focus:outline-none focus:border-emerald-500 text-right"
                      />
                      <button
                        onClick={() => handleSaveMenuPrice(item.id)}
                        disabled={isSaving}
                        className={`p-2 rounded-xl text-xs font-bold transition-all ${
                          isSaved 
                            ? 'bg-emerald-600 text-white' 
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                        }`}
                        title="Save price change"
                      >
                        {isSaved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Delete Item Button */}
                    <button
                      onClick={() => handleDeleteMenuItem(item.id)}
                      className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 border border-slate-700/60 transition-colors"
                      title="Delete recipe from menu"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Partner Names & Percentage Shares (5 Columns) */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  Partners & Equity Shares
                </h3>
                <p className="text-xs text-slate-400">Total percentages must equal exactly 100%</p>
              </div>

              {/* Total Percentage Indicator */}
              <div className={`px-3 py-1 rounded-xl text-xs font-mono font-bold border flex items-center gap-1.5 ${
                isPercentageValid 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
              }`}>
                <span>Total:</span>
                <span>{roundedPartnerTotal}%</span>
              </div>
            </div>

            {partnerNotice && (
              <div className={`p-3 rounded-2xl text-xs mb-4 flex items-center gap-2 ${
                partnerNotice.type === 'success' 
                  ? 'bg-emerald-950/60 border border-emerald-600/40 text-emerald-300' 
                  : 'bg-rose-950/60 border border-rose-600/40 text-rose-300'
              }`}>
                {partnerNotice.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                <span>{partnerNotice.message}</span>
              </div>
            )}

            <form onSubmit={handleSavePartners} className="flex flex-col gap-4">
              {partnerEdits.map((partner, idx) => (
                <div key={partner.id} className="p-4 rounded-2xl bg-slate-850 border border-slate-800 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Partner #{partner.id}
                    </span>
                    <span className="text-xs font-mono font-semibold text-emerald-400">
                      Share: {partner.share_percentage}%
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 items-center">
                    <div className="col-span-2">
                      <label className="text-[10px] text-slate-400 block mb-0.5">Partner Name</label>
                      <input
                        type="text"
                        value={partner.name}
                        onChange={(e) => handlePartnerChange(idx, 'name', e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Share %</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={partner.share_percentage}
                        onChange={(e) => handlePartnerChange(idx, 'share_percentage', e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono font-bold text-right"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {!isPercentageValid && (
                <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>
                    Validation Warning: Total equity is {roundedPartnerTotal}%. Please adjust shares to equal exactly 100%.
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={savingPartners || !isPercentageValid}
                className="py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-emerald-950/60 active:scale-98 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {savingPartners ? 'Saving...' : 'Save Partner Equity Configuration'}
              </button>
            </form>
          </div>

          {/* Sound & Hardware Test Tool */}
          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Audio Hardware Test</span>
            <button
              onClick={() => soundManager.playKitchenChime()}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Volume2 className="w-3.5 h-3.5" />
              Test Kitchen Chime
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
