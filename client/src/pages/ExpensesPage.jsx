import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  PlusCircle, 
  RefreshCw, 
  Calendar, 
  Trash2, 
  Filter,
  DollarSign,
  TrendingDown,
  Tag,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import { exportExpensesToExcel } from '../utils/exportExcel';

const EXPENSE_CATEGORIES = [
  { id: 'Ingredients', label: 'Ingredients (අමුද්‍රව්‍ය / කොළ / පොල්)', icon: '🌿' },
  { id: 'Rent', label: 'Rent (කඩ කාමර කුලිය)', icon: '🏢' },
  { id: 'Helper wages', label: 'Helper wages (සහායක වැටුප්)', icon: '👥' },
  { id: 'Utilities', label: 'Utilities (විදුලිය / ජලය)', icon: '💡' },
  { id: 'Gas/Firewood', label: 'Gas/Firewood (ගෑස් / දර)', icon: '🔥' },
  { id: 'Packaging', label: 'Packaging (කෝප්ප / බෑග් / හැඳි)', icon: '📦' },
  { id: 'Other', label: 'Other (වෙනත් වියදම්)', icon: '📝' },
];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form fields
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState('Ingredients');
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState('');
  const [successNotice, setSuccessNotice] = useState(false);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [categoryFilter, setCategoryFilter] = useState('all');

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      let url = `/api/expenses?month=${selectedMonth}`;
      if (categoryFilter !== 'all') {
        url += `&category=${encodeURIComponent(categoryFilter)}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setExpenses(data.data);
      }
    } catch (err) {
      console.error('Fetch expenses error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [selectedMonth, categoryFilter]);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          category,
          note,
          amount: numAmount
        })
      });

      const data = await res.json();
      if (data.success) {
        setAmount('');
        setNote('');
        setSuccessNotice(true);
        setTimeout(() => setSuccessNotice(false), 3000);
        // If logged date is in current selected month, reload
        if (date.startsWith(selectedMonth)) {
          fetchExpenses();
        } else {
          // Switch month to the logged date's month
          setSelectedMonth(date.slice(0, 7));
        }
      } else {
        alert(data.error || 'Failed to record expense');
      }
    } catch (err) {
      console.error('Add expense error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!confirm('Are you sure you want to delete this expense record?')) return;
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setExpenses(prev => prev.filter(e => e.id !== id));
      } else {
        alert(data.error || 'Failed to delete expense');
      }
    } catch (err) {
      console.error('Delete expense error:', err);
    }
  };

  const totalSpent = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  return (
    <div className="flex-1 flex flex-col gap-6 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            Store Expenses Ledger
          </h2>
          <p className="text-xs text-slate-400">
            Log shop overheads, ingredients, wages, utilities, and firewood for accurate net profit tracking
          </p>
        </div>

        {/* Month Selector Filter */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-slate-400">Month:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-white focus:outline-none font-mono font-bold cursor-pointer"
            />
          </div>

          <button
            onClick={() => exportExpensesToExcel(expenses, selectedMonth)}
            disabled={expenses.length === 0}
            className="px-3.5 py-2 rounded-2xl bg-slate-800 hover:bg-emerald-600 hover:text-white text-emerald-400 border border-slate-700/80 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Download Excel / CSV sheet of expenses"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>

          <button
            onClick={fetchExpenses}
            className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all active:scale-95"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Grid: Form Left, List Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Fast Log Form */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-emerald-400" />
              Log Shop Expense
            </h3>
            {successNotice && (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" /> Saved!
              </span>
            )}
          </div>

          <form onSubmit={handleAddExpense} className="flex flex-col gap-4">
            
            {/* Date Field */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Date (දිනය)</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            {/* Category Field with Visual Touch Buttons */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Category (වියදම් වර්ගය)</label>
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {EXPENSE_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`p-2 rounded-xl text-xs font-bold text-left flex items-center gap-1.5 transition-all border ${
                      category === cat.id
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md ring-1 ring-emerald-400/40'
                        : 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 border-slate-700/60'
                    }`}
                  >
                    <span className="text-sm">{cat.icon}</span>
                    <span className="truncate">{cat.id}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount Field with Quick Presets (Fitts's Law) */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Amount (මුදල - LKR)</label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 1500.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-emerald-500 font-mono text-lg font-black"
              />
              {/* Quick Rupees Presets */}
              <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
                {[100, 500, 1000, 2000, 5000].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      const cur = parseFloat(amount) || 0;
                      setAmount((cur + val).toString());
                    }}
                    className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-mono font-bold text-emerald-400 border border-slate-750 transition-all active:scale-95 whitespace-nowrap"
                  >
                    +{val}
                  </button>
                ))}
                {amount && (
                  <button
                    type="button"
                    onClick={() => setAmount('')}
                    className="px-2 py-1 rounded-xl bg-slate-800 hover:bg-rose-950 text-[11px] font-bold text-rose-400 border border-slate-750 transition-all"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Note Field */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Note (විස්තරය / විස්තර සටහන)</label>
              <input
                type="text"
                placeholder="e.g. 15 bundles of Hathawariya and Gotukola"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !amount}
              className="mt-2 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-950/60 active:scale-98 disabled:opacity-40"
            >
              {submitting ? 'Recording...' : 'Record Expense into SQLite'}
            </button>
          </form>
        </div>

        {/* Expenses Filtered List */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            {/* Monthly Summary Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
              <div>
                <h3 className="font-bold text-base text-white">
                  Monthly Expenses ({selectedMonth})
                </h3>
                <p className="text-xs text-slate-400">{expenses.length} records found</p>
              </div>

              {/* Total Spent Card */}
              <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-800/50 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Total Spent
                  </span>
                  <span className="text-xl font-black text-rose-300 font-mono">
                    Rs. {totalSpent.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-3">
              <span className="text-xs text-slate-400 font-semibold mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Filter:
              </span>
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  categoryFilter === 'all'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                All Categories
              </button>
              {EXPENSE_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    categoryFilter === cat.id
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {cat.id}
                </button>
              ))}
            </div>

            {/* Expenses Table */}
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Note</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400 text-xs">
                        No expenses logged for {selectedMonth}.
                      </td>
                    </tr>
                  ) : (
                    expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-400">{exp.date}</td>
                        <td className="py-2.5 px-3 text-slate-300">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-200 font-medium">
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 max-w-[200px] truncate">
                          {exp.note || '-'}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-rose-400 text-right">
                          Rs. {Number(exp.amount).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 transition-colors"
                            title="Delete record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
