// Utility for exporting data to Microsoft Excel compatible CSV files (with UTF-8 BOM)

export function downloadCSV(filename, csvContent) {
  // Prepend UTF-8 BOM (\uFEFF) so Excel opens UTF-8 Sinhala & symbols properly
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// 1. Export Transactions / Orders History
export function exportOrdersToExcel(orders, title = 'Suwa_Kanda_Orders') {
  if (!orders || orders.length === 0) {
    alert('No orders available to export.');
    return;
  }

  const rows = [
    ['SUWA KANDA (සුව කැඳ - තණමල්විල) - ORDER TRANSACTIONS REPORT'],
    [`Generated: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' })}`],
    [],
    ['Bill ID', 'Token Code', 'Type', 'Payment', 'Status', 'Date & Time', 'Items Ordered', 'Total Amount (Rs.)']
  ];

  orders.forEach(o => {
    const itemsSummary = (o.items || [])
      .map(i => `${i.name || ''} (${i.quantity}x)`)
      .join('; ');

    rows.push([
      `#${o.id}`,
      o.token_code || o.token_display || `#${o.token_number}`,
      o.order_type === 'dine_in' ? 'Dine-In' : 'Takeaway',
      (o.payment_method || 'cash').toUpperCase(),
      (o.status || 'verified').toUpperCase(),
      o.created_at,
      `"${itemsSummary.replace(/"/g, '""')}"`,
      Number(o.total_amount).toFixed(2)
    ]);
  });

  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  rows.push([]);
  rows.push(['', '', '', '', '', '', 'TOTAL REVENUE:', totalRevenue.toFixed(2)]);

  const csv = rows.map(r => r.join(',')).join('\r\n');
  downloadCSV(`${title}_${new Date().toISOString().slice(0, 10)}.csv`, csv);
}

// 2. Export Expenses Log
export function exportExpensesToExcel(expenses, monthStr) {
  if (!expenses || expenses.length === 0) {
    alert('No expenses logged for this period to export.');
    return;
  }

  const rows = [
    ['SUWA KANDA (සුව කැඳ - තණමල්විල) - SHOP EXPENSES REPORT'],
    [`Period: ${monthStr || 'All'}`],
    [`Generated: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' })}`],
    [],
    ['Expense ID', 'Date', 'Category', 'Description / Note', 'Amount (LKR)']
  ];

  expenses.forEach(e => {
    rows.push([
      `#${e.id}`,
      e.date,
      e.category,
      `"${(e.note || '').replace(/"/g, '""')}"`,
      Number(e.amount).toFixed(2)
    ]);
  });

  const totalSpent = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  rows.push([]);
  rows.push(['', '', '', 'TOTAL EXPENSES:', totalSpent.toFixed(2)]);

  const csv = rows.map(r => r.join(',')).join('\r\n');
  downloadCSV(`Suwa_Kanda_Expenses_${monthStr || 'all'}.csv`, csv);
}

// 3. Export Comprehensive Financial Summary (Revenue, Expenses, Partner Split)
export function exportFinancialSummaryToExcel(reportData, viewMode, dateOrMonth) {
  if (!reportData) return;

  const isDaily = viewMode === 'daily';
  const metrics = isDaily ? reportData.daily : reportData.monthly;
  const partners = reportData.partners || [];
  const topCongees = reportData.top_items || [];

  const rows = [
    ['SUWA KANDA (සුව කැඳ - තණමල්විල) - FINANCIAL ANALYTICS & PROFIT SHARE'],
    [`View: ${isDaily ? 'Daily Summary' : 'Monthly Summary'}`],
    [`Period: ${dateOrMonth}`],
    [`Generated: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' })}`],
    [],
    ['--- CORE FINANCIAL METRICS ---', 'AMOUNT (LKR)'],
    ['Total Congee Revenue', Number(metrics.revenue || 0).toFixed(2)],
    ['Total Shop Expenses', Number(metrics.expenses || 0).toFixed(2)],
    ['NET PROFIT', Number(metrics.net_profit || 0).toFixed(2)],
    ['Total Orders Billed', metrics.orders_count || 0],
    ['Total Expense Entries', metrics.expenses_count || 0],
    [],
    ['--- 3-WAY PARTNER PROFIT SPLIT ---', 'EQUITY %', 'PAYOUT (LKR)'],
  ];

  partners.forEach(p => {
    rows.push([
      p.name,
      `${p.share_percentage}%`,
      Number(p.payout || 0).toFixed(2)
    ]);
  });

  rows.push([]);
  rows.push(['--- TOP SELLING CONGEE VARIETIES ---', 'CUPS SOLD', 'REVENUE (LKR)']);
  topCongees.forEach(item => {
    rows.push([
      `"${item.name} (${item.sinhala_name || ''})"`,
      item.cups_sold || 0,
      Number(item.total_sales || 0).toFixed(2)
    ]);
  });

  if (reportData.daily_trends && reportData.daily_trends.length > 0) {
    rows.push([]);
    rows.push(['--- DAILY TREND BREAKDOWN ---', 'REVENUE (LKR)', 'EXPENSES (LKR)', 'NET PROFIT (LKR)']);
    reportData.daily_trends.forEach(d => {
      rows.push([
        d.date,
        Number(d.revenue || 0).toFixed(2),
        Number(d.expenses || 0).toFixed(2),
        (Number(d.revenue || 0) - Number(d.expenses || 0)).toFixed(2)
      ]);
    });
  }

  const csv = rows.map(r => r.join(',')).join('\r\n');
  downloadCSV(`Suwa_Kanda_Financial_Report_${dateOrMonth}.csv`, csv);
}
