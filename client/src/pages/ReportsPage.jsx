import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Receipt, 
  Calendar, 
  RefreshCw, 
  QrCode, 
  Banknote, 
  CreditCard,
  Soup,
  TrendingDown,
  Sparkles,
  Award,
  FileSpreadsheet
} from 'lucide-react';
import { exportFinancialSummaryToExcel } from '../utils/exportExcel';

export default function ReportsPage() {
  const [viewMode, setViewMode] = useState('daily'); // 'daily' | 'monthly'
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const url = `/api/reports/summary?date=${selectedDate}&month=${selectedMonth}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setReport(data);
      }
    } catch (err) {
      console.error('Fetch report error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedDate, selectedMonth]);

  // Handle view toggle
  const isDaily = viewMode === 'daily';

  // Current view metrics
  const revenue = isDaily ? (report?.daily?.revenue || 0) : (report?.monthly?.revenue || 0);
  const ordersCount = isDaily ? (report?.daily?.orders_count || 0) : (report?.monthly?.orders_count || 0);
  const expenses = isDaily ? (report?.daily?.expenses || 0) : (report?.monthly?.expenses || 0);
  const expensesCount = isDaily ? (report?.daily?.expenses_count || 0) : (report?.monthly?.expenses_count || 0);
  const netProfit = isDaily ? (report?.daily?.net_profit || 0) : (report?.monthly?.net_profit || 0);
  
  const paymentBreakdown = isDaily 
    ? (report?.daily?.payment_breakdown || []) 
    : (report?.monthly?.payment_breakdown || []);

  const cashTotal = paymentBreakdown.find(p => p.payment_method === 'cash')?.total || 0;
  const qrTotal = paymentBreakdown.find(p => p.payment_method === 'qr')?.total || 0;
  const cardTotal = paymentBreakdown.find(p => p.payment_method === 'card')?.total || 0;

  // Max value for visual bar chart scaling
  const trends = report?.daily_trends || [];
  const maxTrendVal = Math.max(
    ...trends.map(t => Math.max(t.revenue || 0, t.expenses || 0)),
    1000
  );

  return (
    <div className="flex-1 flex flex-col gap-6 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Top Header & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            Reports & Partner Profit Sharing
          </h2>
          <p className="text-xs text-slate-400">
            Real-time financial analytics, Cash vs QR breakdowns, and automated 3-way partner dividend splits
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          
          {/* Daily vs Monthly Toggle */}
          <div className="p-1 bg-slate-900 border border-slate-800 rounded-2xl flex items-center">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                isDaily 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Daily View (දෛනික)
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                !isDaily 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly View (මාසික)
            </button>
          </div>

          {/* Date / Month Picker */}
          {isDaily ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedMonth(e.target.value.slice(0, 7));
                }}
                className="bg-transparent text-white focus:outline-none font-mono cursor-pointer font-bold"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-white focus:outline-none font-mono cursor-pointer font-bold"
              />
            </div>
          )}

          <button
            onClick={() => exportFinancialSummaryToExcel(report, viewMode, isDaily ? selectedDate : selectedMonth)}
            disabled={!report}
            className="px-3.5 py-2 rounded-2xl bg-emerald-700/80 hover:bg-emerald-600 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-md active:scale-95 disabled:opacity-40 cursor-pointer"
            title="Download report as Microsoft Excel sheet"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
            <span>Export Excel (බාගත කරන්න)</span>
          </button>

          <button
            onClick={fetchReport}
            className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all active:scale-95 cursor-pointer"
            title="Refresh Report"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {report && (
        <div className="flex flex-col gap-6">
          
          {/* 1. Metric Cards: Revenue (Cash vs QR), Expenses, Net Profit */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Revenue Card (with Cash vs QR breakdown) */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                    {isDaily ? `Daily Revenue (${selectedDate})` : `Monthly Revenue (${selectedMonth})`}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {ordersCount} orders
                  </span>
                </div>
                <div className="text-3xl font-black text-white font-mono mt-1">
                  Rs. {revenue.toFixed(2)}
                </div>
              </div>

              {/* Cash vs QR Breakdown Badges */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <Banknote className="w-4 h-4" />
                  <span>Cash: Rs. {cashTotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-teal-400">
                  <QrCode className="w-4 h-4" />
                  <span>QR: Rs. {qrTotal.toFixed(2)}</span>
                </div>
                {cardTotal > 0 && (
                  <div className="flex items-center gap-1.5 text-cyan-400">
                    <CreditCard className="w-4 h-4" />
                    <span>Card: Rs. {cardTotal.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Expenses Card */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                    {isDaily ? `Daily Expenses (${selectedDate})` : `Monthly Expenses (${selectedMonth})`}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {expensesCount} records
                  </span>
                </div>
                <div className="text-3xl font-black text-rose-400 font-mono mt-1">
                  Rs. {expenses.toFixed(2)}
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-4 pt-3 border-t border-slate-800/80">
                Ingredients, firewood, wages, and utilities
              </p>
            </div>

            {/* Net Profit Card */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                    Net Profit (Revenue - Expenses)
                  </span>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                    netProfit >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {netProfit >= 0 ? 'Surplus' : 'Deficit'}
                  </span>
                </div>
                <div className={`text-3xl font-black font-mono mt-1 ${
                  netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  Rs. {netProfit.toFixed(2)}
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-4 pt-3 border-t border-slate-800/80">
                {netProfit >= 0 
                  ? 'Profit distributed 100% to partners below' 
                  : 'Negative balance; operating costs exceed revenue'
                }
              </p>
            </div>

          </div>

          {/* 2. 3-Way Partner Profit Split Card */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  3-Way Partner Profit Split
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                    {isDaily ? 'Daily Payout' : 'Monthly Payout'}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Exact rupee payout calculated automatically from Net Profit (Rs. {netProfit.toFixed(2)}) based on partnership percentage shares
                </p>
              </div>

              <span className="text-xs font-mono font-bold text-slate-300 px-3 py-1 rounded-xl bg-slate-800">
                Basis: Net Profit (100% Allocated)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
              {report.partner_profit_split.partners.map((partner) => {
                // Compute exact rupee payout for selected view (Daily vs Monthly)
                const shareRatio = partner.share_percentage / 100;
                const rupeePayout = netProfit > 0 
                  ? Math.round(netProfit * shareRatio * 100) / 100 
                  : 0;

                return (
                  <div 
                    key={partner.id}
                    className="p-5 rounded-2xl bg-slate-850/90 border border-slate-800 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-base text-white block">{partner.name}</span>
                          <span className="text-[11px] text-slate-400">Stakeholder ID #{partner.id}</span>
                        </div>
                        <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {partner.share_percentage}%
                        </span>
                      </div>

                      {/* Prominent Exact Rupee Payout */}
                      <div className="mt-4 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                          {isDaily ? 'Daily Payout Share' : 'Monthly Payout Share'}
                        </span>
                        <div className="text-2xl font-black text-emerald-400 font-mono mt-0.5">
                          Rs. {rupeePayout.toFixed(2)}
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                        <span>Equation:</span>
                        <span className="font-mono">
                          {netProfit > 0 ? `Rs. ${netProfit.toFixed(2)} × ${partner.share_percentage}%` : 'No profit to split'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${partner.share_percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Bar Chart: Daily Sales vs Daily Expenses Visual Breakdown */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-teal-400" />
                  Daily Sales vs Daily Expenses Trend ({selectedMonth})
                </h3>
                <p className="text-xs text-slate-400">
                  Visual day-by-day comparison of gross congee sales against operational expenditures
                </p>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                  <span>Sales (Revenue)</span>
                </div>
                <div className="flex items-center gap-1.5 text-rose-400">
                  <div className="w-3 h-3 rounded-sm bg-rose-500" />
                  <span>Expenses</span>
                </div>
              </div>
            </div>

            {/* Visual Bar Chart */}
            {trends.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No transactions recorded for month {selectedMonth}.
              </div>
            ) : (
              <div className="mt-6 flex flex-col gap-4">
                <div className="overflow-x-auto pb-2">
                  <div className="min-w-[600px] flex items-end gap-3 h-52 pt-6 pb-2 border-b border-slate-800">
                    {trends.map((item, idx) => {
                      const salesHeight = Math.max(4, Math.round((item.revenue / maxTrendVal) * 160));
                      const expHeight = Math.max(4, Math.round((item.expenses / maxTrendVal) * 160));
                      const dayLabel = item.date.slice(8); // '07'

                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                          
                          {/* Tooltip on Hover */}
                          <div className="absolute -top-12 hidden group-hover:flex flex-col items-center bg-slate-800 border border-slate-700 text-[10px] text-white px-2 py-1 rounded shadow-xl whitespace-nowrap z-20 pointer-events-none">
                            <span className="font-bold">{item.date}</span>
                            <span className="text-emerald-400">Sales: Rs. {item.revenue.toFixed(2)}</span>
                            <span className="text-rose-400">Exp: Rs. {item.expenses.toFixed(2)}</span>
                          </div>

                          {/* Bars container */}
                          <div className="w-full flex items-end justify-center gap-1 h-44">
                            {/* Revenue Bar */}
                            <div 
                              className="w-3 sm:w-5 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t transition-all group-hover:brightness-110"
                              style={{ height: `${salesHeight}px` }}
                              title={`Sales: Rs. ${item.revenue}`}
                            />
                            {/* Expenses Bar */}
                            <div 
                              className="w-3 sm:w-5 bg-gradient-to-t from-rose-600 to-rose-400 rounded-t transition-all group-hover:brightness-110"
                              style={{ height: `${expHeight}px` }}
                              title={`Expenses: Rs. ${item.expenses}`}
                            />
                          </div>

                          {/* Day Label */}
                          <span className="text-[11px] font-mono text-slate-400 font-bold mt-1">
                            {dayLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Trend Summary Numbers Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Orders</th>
                        <th className="py-2 px-3">Daily Sales (LKR)</th>
                        <th className="py-2 px-3">Daily Expenses (LKR)</th>
                        <th className="py-2 px-3 text-right">Net Daily Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {trends.map((t, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/30">
                          <td className="py-2 px-3 font-mono font-bold text-slate-300">{t.date}</td>
                          <td className="py-2 px-3 font-mono text-slate-400">{t.orders_count}</td>
                          <td className="py-2 px-3 font-mono text-emerald-400 font-bold">
                            Rs. {t.revenue.toFixed(2)}
                          </td>
                          <td className="py-2 px-3 font-mono text-rose-400 font-bold">
                            Rs. {t.expenses.toFixed(2)}
                          </td>
                          <td className={`py-2 px-3 font-mono font-bold text-right ${
                            t.net_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            Rs. {t.net_profit.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* 4. Congee Varieties Volume Performance */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl">
            <h3 className="font-bold text-base text-white mb-1 flex items-center gap-2">
              <Soup className="w-5 h-5 text-emerald-400" />
              Congee Sales Volume ({selectedDate})
            </h3>
            <p className="text-xs text-slate-400 mb-4">Bowls served per variety for the chosen day</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {report.item_sales?.map((item) => (
                <div key={item.id} className="p-4 rounded-2xl bg-slate-850 border border-slate-800 text-center">
                  <span className="text-xs font-bold font-sinhala text-emerald-300 block">{item.sinhala_name}</span>
                  <span className="text-xs font-semibold text-white block mt-0.5">{item.name}</span>
                  <div className="text-xl font-black text-white mt-2 font-mono">
                    {item.bowls_sold} <span className="text-xs font-normal text-slate-400">bowls</span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 block mt-1">
                    Rs. {Number(item.total_sales).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
