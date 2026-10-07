import * as XLSX from 'xlsx';

/**
 * Professional Microsoft Excel (.xlsx) Export Utility for Suwa Kanda.
 * Creates beautifully formatted multi-sheet workbooks with generous column widths,
 * native number formatting, and clear tables for prices, costs, and profit splits.
 */

// Helper to download a workbook as .xlsx
function saveWorkbook(wb, filename) {
  const safeName = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, safeName);
}

// 1. Comprehensive Financial Analytics, Congee Pricing, Expenses & Partner Payout Export
export function exportFinancialSummaryToExcel(reportData, viewMode, dateOrMonth) {
  if (!reportData) {
    alert('No report data available to export.');
    return;
  }

  const isDaily = viewMode === 'daily';
  const metrics = isDaily ? reportData.daily : reportData.monthly;
  const revenue = Number(metrics?.revenue || 0);
  const expenses = Number(metrics?.expenses || 0);
  const netProfit = Number(metrics?.net_profit || (revenue - expenses));
  const profitMargin = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) : '0.0';

  const paymentBreakdown = metrics?.payment_breakdown || [];
  const cashTotal = Number(paymentBreakdown.find(p => p.payment_method === 'cash')?.total || 0);
  const qrTotal = Number(paymentBreakdown.find(p => p.payment_method === 'qr')?.total || 0);
  const cardTotal = Number(paymentBreakdown.find(p => p.payment_method === 'card')?.total || 0);

  const partners = reportData.partner_profit_split?.partners || [];
  const itemSales = (isDaily ? reportData.item_sales : (reportData.monthly_item_sales || reportData.item_sales)) || [];
  const dailyTrends = reportData.daily_trends || [];
  const detailedExpenses = reportData.detailed_expenses || [];

  const wb = XLSX.utils.book_new();

  // -------------------------------------------------------------
  // SHEET 1: 📊 මූල්‍ය සාරාංශය (Executive Summary & Partner Split)
  // -------------------------------------------------------------
  const summaryRows = [
    ['SUWA KANDA (සුව කැඳ) - තණමල්විල සන්ධිය'],
    ['මූල්‍ය විශ්ලේෂණ හා ලාභ බෙදීමේ වාර්තාව (FINANCIAL PERFORMANCE & PROFIT SHARING)'],
    [`වාර්තා කාලසීමාව (Period): ${dateOrMonth} (${isDaily ? 'දෛනික වාර්තාව / Daily' : 'මාසික වාර්තාව / Monthly'})`],
    [`සැකසූ වේලාව (Generated): ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' })}`],
    [],
    ['=== 1. ප්‍රධාන මූල්‍ය දර්ශක (CORE FINANCIAL METRICS) ===', '', '', ''],
    ['මූල්‍ය විස්තරය (Metric)', 'වටිනාකම / LKR (Amount)', 'ප්‍රතිශතය / තත්ත්වය', 'විස්තරය (Description)'],
    ['මුළු කැඳ අලෙවි ආදායම (Gross Revenue)', revenue, '100.0%', 'කැෂියර් මඟින් නිකුත් කළ සියලුම බිල්පත් එකතුව'],
    ['මුළු මෙහෙයුම් වියදම (Total Expenses / Cost)', expenses, `${revenue > 0 ? ((expenses / revenue) * 100).toFixed(1) : 0}%`, 'අමුද්‍රව්‍ය, දර, කොළ වර්ග, වැටුප් ඇතුළු සියලු වියදම්'],
    ['ශුද්ධ ලාභය (NET PROFIT)', netProfit, `${profitMargin}% Margin`, netProfit >= 0 ? 'ශුද්ධ ලාභය (ලාභය 100% පාර්ශවකරුවන්ට)' : 'පාඩුව / Deficit'],
    ['මුදල් අයකිරීම් (Cash in Hand)', cashTotal, `${revenue > 0 ? ((cashTotal / revenue) * 100).toFixed(1) : 0}%`, 'කැෂියර් ලාච්චුවේ ඇති මුදල් එකතුව'],
    ['LankaQR ඩිජිටල් අයකිරීම් (QR Bank)', qrTotal, `${revenue > 0 ? ((qrTotal / revenue) * 100).toFixed(1) : 0}%`, 'බැංකු ගිණුමට බැර වූ QR ගෙවීම්'],
    ['කාඩ්පත් අයකිරීම් (Card Payments)', cardTotal, `${revenue > 0 ? ((cardTotal / revenue) * 100).toFixed(1) : 0}%`, 'POS Card ගෙවීම්'],
    ['මුළු නිකුත් කළ බිල්පත් ගණන (Total Bills)', metrics?.orders_count || 0, 'Bills Issued', 'දිනපතා ඇණවුම් සංඛ්‍යාව'],
    ['මුළු වියදම් සටහන් ගණන (Expense Entries)', metrics?.expenses_count || 0, 'Entries', 'ලියාපදිංචි වියදම් වවුචර්'],
    [],
    ['=== 2. පාර්ශවකරුවන් 3 දෙනාගේ ලාභ බෙදීම (3-WAY PARTNER PROFIT SHARE) ===', '', '', ''],
    ['පාර්ශවකරුගේ නම (Partner Name)', 'කොටස් අනුපාතය (Equity %)', 'ශුද්ධ ලාභ පදනම (Net Profit Basis)', 'ලැබිය යුතු ලාභ කොටස / Payout (LKR)'],
  ];

  partners.forEach(p => {
    const shareRatio = (p.share_percentage || 0) / 100;
    const payout = netProfit > 0 ? Math.round(netProfit * shareRatio * 100) / 100 : 0;
    summaryRows.push([
      p.name,
      `${p.share_percentage}%`,
      netProfit,
      payout
    ]);
  });

  const totalPartnerPayout = partners.reduce((sum, p) => {
    const shareRatio = (p.share_percentage || 0) / 100;
    return sum + (netProfit > 0 ? Math.round(netProfit * shareRatio * 100) / 100 : 0);
  }, 0);

  summaryRows.push([
    'මුළු බෙදාදුන් ලාභය (TOTAL DIVIDEND DISTRIBUTED)',
    '100.0%',
    netProfit,
    totalPartnerPayout
  ]);

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [
    { wch: 42 }, // Metric / Name
    { wch: 24 }, // Amount
    { wch: 22 }, // Ratio / Equity
    { wch: 48 }  // Description
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'මූල්‍ය සාරාංශය (Overview)');

  // -------------------------------------------------------------
  // SHEET 2: 🥣 කැඳ විකුණුම් හා මිල (Congee Pricing, Volumes & Revenue)
  // -------------------------------------------------------------
  const congeeRows = [
    ['SUWA KANDA (සුව කැඳ) - කැඳ වර්ග අලෙවිය හා මිල ගණන් විග්‍රහය'],
    [`කාලසීමාව: ${dateOrMonth}`],
    [],
    [
      'අංකය (No)',
      'කැඳ වර්ගය (Sinhala Name)',
      'Congee Variety (English)',
      'අංශය (Station)',
      'කෝප්පයක මිල / Unit Price (LKR)',
      'අලෙවි වූ ප්‍රමාණය (Cups Sold)',
      'මුළු ආදායම / Total Revenue (LKR)',
      'ආදායම් ප්‍රතිශතය (Sales Share %)'
    ]
  ];

  let totalCupsSold = 0;
  let totalCongeeSales = 0;

  itemSales.forEach((item, idx) => {
    const cups = Number(item.bowls_sold || 0);
    const itemRevenue = Number(item.total_sales || 0);
    const unitPrice = Number(item.price || (cups > 0 ? itemRevenue / cups : 0));
    const sharePct = revenue > 0 ? ((itemRevenue / revenue) * 100).toFixed(1) : '0.0';

    totalCupsSold += cups;
    totalCongeeSales += itemRevenue;

    congeeRows.push([
      idx + 1,
      item.sinhala_name || item.name,
      item.name,
      (item.station_id || 'kola').toUpperCase(),
      unitPrice,
      cups,
      itemRevenue,
      `${sharePct}%`
    ]);
  });

  congeeRows.push([]);
  congeeRows.push([
    '',
    'එකතුව (TOTAL)',
    'ALL VARIETIES',
    '',
    '',
    totalCupsSold,
    totalCongeeSales,
    '100.0%'
  ]);

  const wsCongee = XLSX.utils.aoa_to_sheet(congeeRows);
  wsCongee['!cols'] = [
    { wch: 10 }, // No
    { wch: 25 }, // Sinhala Name
    { wch: 24 }, // English Name
    { wch: 15 }, // Station
    { wch: 28 }, // Unit Price
    { wch: 24 }, // Cups Sold
    { wch: 28 }, // Total Revenue
    { wch: 22 }  // Share
  ];
  XLSX.utils.book_append_sheet(wb, wsCongee, 'කැඳ විකුණුම් හා මිල (Congee)');

  // -------------------------------------------------------------
  // SHEET 3: 💸 වියදම් විස්තරය (Detailed Expenses Breakdown)
  // -------------------------------------------------------------
  const expenseRows = [
    ['SUWA KANDA (සුව කැඳ) - කඩයේ වියදම් විස්තර ලේඛනය (SHOP EXPENSES LOG)'],
    [`කාලසීමාව: ${dateOrMonth}`],
    [],
    [
      'වියදම් අංකය (ID)',
      'දිනය (Date)',
      'වියදම් කාණ්ඩය (Category)',
      'විස්තරය / සැපයුම්කරු (Description / Note)',
      'වියදම / Cost Amount (LKR)'
    ]
  ];

  let totalExpensesLogged = 0;

  if (detailedExpenses.length > 0) {
    detailedExpenses.forEach(exp => {
      const amount = Number(exp.amount || 0);
      totalExpensesLogged += amount;
      expenseRows.push([
        `#${exp.id}`,
        exp.date,
        (exp.category || 'General').toUpperCase(),
        exp.note || '-',
        amount
      ]);
    });
  } else if (metrics?.expense_categories?.length > 0) {
    metrics.expense_categories.forEach((cat, idx) => {
      const amount = Number(cat.total || 0);
      totalExpensesLogged += amount;
      expenseRows.push([
        idx + 1,
        dateOrMonth,
        cat.category.toUpperCase(),
        `${cat.count} expenses logged`,
        amount
      ]);
    });
  }

  expenseRows.push([]);
  expenseRows.push([
    '',
    '',
    'මුළු වියදම (TOTAL EXPENSES)',
    '',
    totalExpensesLogged || expenses
  ]);

  const wsExpenses = XLSX.utils.aoa_to_sheet(expenseRows);
  wsExpenses['!cols'] = [
    { wch: 15 }, // ID
    { wch: 16 }, // Date
    { wch: 22 }, // Category
    { wch: 45 }, // Description
    { wch: 25 }  // Amount
  ];
  XLSX.utils.book_append_sheet(wb, wsExpenses, 'වියදම් විස්තර (Expenses)');

  // -------------------------------------------------------------
  // SHEET 4: 📅 දෛනික ලාභ අලාභ (Daily Sales vs Expenses Trend)
  // -------------------------------------------------------------
  if (dailyTrends.length > 0) {
    const trendRows = [
      ['SUWA KANDA (සුව කැඳ) - දිනපතා ලාභ අලාභ ප්‍රවණතාව (DAILY PROFIT & LOSS TREND)'],
      [`මාසය: ${dateOrMonth}`],
      [],
      [
        'දිනය (Date)',
        'ඇණවුම් ගණන (Orders)',
        'දෛනික ආදායම / Sales (LKR)',
        'දෛනික වියදම / Cost (LKR)',
        'ශුද්ධ ලාභය / Net Profit (LKR)',
        'ප්‍රතිඵලය (Result)'
      ]
    ];

    let sumTrendSales = 0;
    let sumTrendExp = 0;
    let sumTrendProfit = 0;

    dailyTrends.forEach(d => {
      const dRev = Number(d.revenue || 0);
      const dExp = Number(d.expenses || 0);
      const dNet = dRev - dExp;

      sumTrendSales += dRev;
      sumTrendExp += dExp;
      sumTrendProfit += dNet;

      trendRows.push([
        d.date,
        Number(d.orders_count || 0),
        dRev,
        dExp,
        dNet,
        dNet >= 0 ? 'ලාභයි (Surplus)' : 'අලාභයි (Deficit)'
      ]);
    });

    trendRows.push([]);
    trendRows.push([
      'එකතුව (TOTAL)',
      dailyTrends.reduce((s, d) => s + Number(d.orders_count || 0), 0),
      sumTrendSales,
      sumTrendExp,
      sumTrendProfit,
      sumTrendProfit >= 0 ? 'ශුද්ධ ලාභය (Net Surplus)' : 'ශුද්ධ අලාභය (Net Deficit)'
    ]);

    const wsTrends = XLSX.utils.aoa_to_sheet(trendRows);
    wsTrends['!cols'] = [
      { wch: 16 }, // Date (Spacious so NO ######)
      { wch: 20 }, // Orders
      { wch: 25 }, // Sales
      { wch: 25 }, // Cost
      { wch: 25 }, // Net Profit
      { wch: 22 }  // Result
    ];
    XLSX.utils.book_append_sheet(wb, wsTrends, 'දෛනික ලාභ අලාභ (Daily P&L)');
  }

  // Save the full multi-tab Microsoft Excel Workbook
  saveWorkbook(wb, `Suwa_Kanda_Financial_Analytics_${dateOrMonth}.xlsx`);
}

// 2. Export Orders / Transaction History to Excel
export function exportOrdersToExcel(orders, title = 'Suwa_Kanda_Bills') {
  if (!orders || orders.length === 0) {
    alert('No bills available to export.');
    return;
  }

  const wb = XLSX.utils.book_new();

  const rows = [
    ['SUWA KANDA (සුව කැඳ - තණමල්විල) - බිල්පත් සහ ගනුදෙනු ලේඛනය'],
    [`වාර්තාව සැකසූ දිනය: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' })}`],
    [],
    [
      'බිල්පත් අංකය (Bill ID)',
      'ටෝකන් අංකය (Token Code)',
      'ඇණවුම් වර්ගය (Order Type)',
      'ගෙවීම් ක්‍රමය (Payment Method)',
      'තත්ත්වය (Status)',
      'දිනය සහ වේලාව (Date & Time)',
      'ඇණවුම් කළ කැඳ වර්ග (Congee Items Ordered)',
      'මුළු මුදල / Amount (LKR)'
    ]
  ];

  let totalRevenue = 0;

  orders.forEach(o => {
    const itemsSummary = (o.items || [])
      .map(i => `${i.sinhala_name || i.name} (${i.quantity}x)`)
      .join(', ');

    const amount = Number(o.total_amount || 0);
    totalRevenue += amount;

    rows.push([
      `#${o.id}`,
      o.token_code || o.token_display || `#${o.token_number}`,
      o.order_type === 'dine_in' ? 'ශාලාවේදී (Dine-In)' : 'රැගෙන යාම (Takeaway)',
      (o.payment_method || 'cash').toUpperCase(),
      (o.status || 'verified').toUpperCase(),
      o.created_at || '-',
      itemsSummary,
      amount
    ]);
  });

  rows.push([]);
  rows.push([
    '',
    '',
    '',
    '',
    '',
    '',
    'මුළු ආදායම (TOTAL REVENUE):',
    totalRevenue
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 15 }, // Bill ID
    { wch: 18 }, // Token Code
    { wch: 22 }, // Order Type
    { wch: 20 }, // Payment Method
    { wch: 16 }, // Status
    { wch: 24 }, // Date Time
    { wch: 45 }, // Items Ordered
    { wch: 25 }  // Total Amount
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'බිල්පත් ලේඛනය (Bills)');
  saveWorkbook(wb, `${title}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// 3. Export Expenses Log to Excel
export function exportExpensesToExcel(expenses, monthStr) {
  if (!expenses || expenses.length === 0) {
    alert('No expenses logged to export.');
    return;
  }

  const wb = XLSX.utils.book_new();

  const rows = [
    ['SUWA KANDA (සුව කැඳ - තණමල්විල) - වියදම් වාර්තාව (EXPENSES REPORT)'],
    [`කාලසීමාව: ${monthStr || 'සියල්ල'} | සැකසූ වේලාව: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' })}`],
    [],
    [
      'වියදම් අංකය (Expense ID)',
      'දිනය (Date)',
      'වියදම් කාණ්ඩය (Category)',
      'විස්තරය / සැපයුම්කරු (Description / Note)',
      'වියදම / Cost Amount (LKR)'
    ]
  ];

  let totalExpenses = 0;

  expenses.forEach(e => {
    const amount = Number(e.amount || 0);
    totalExpenses += amount;

    rows.push([
      `#${e.id}`,
      e.date,
      (e.category || 'General').toUpperCase(),
      e.note || '-',
      amount
    ]);
  });

  rows.push([]);
  rows.push([
    '',
    '',
    '',
    'මුළු වියදම (TOTAL EXPENSES):',
    totalExpenses
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 16 }, // ID
    { wch: 16 }, // Date
    { wch: 22 }, // Category
    { wch: 45 }, // Description
    { wch: 25 }  // Amount
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'වියදම් ලේඛනය (Expenses)');
  saveWorkbook(wb, `Suwa_Kanda_Expenses_${monthStr || 'all'}.xlsx`);
}
