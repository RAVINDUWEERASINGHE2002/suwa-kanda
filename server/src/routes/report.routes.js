import express from 'express';
import db from '../db/db.js';
import { getColomboDateStr } from '../utils/date.js';

const router = express.Router();

// GET /api/reports/summary?date=YYYY-MM-DD
// Computes daily and monthly revenue (Cash vs QR), expenses, net profit, trend series, and 3-way partner splits
router.get('/summary', async (req, res) => {
    try {
        const targetDate = req.query.date || getColomboDateStr();
        const targetMonth = req.query.month || targetDate.slice(0, 7); // 'YYYY-MM'

        // 1. Daily Revenue (non-cancelled orders)
        const dailyRevenueRow = await db.get(`
            SELECT 
                COALESCE(SUM(total_amount), 0) AS total_revenue,
                COUNT(*) AS total_orders
            FROM orders
            WHERE DATE(created_at) = ? AND status != 'cancelled'
        `, [targetDate]);

        const dailyRevenue = Number(dailyRevenueRow?.total_revenue) || 0;
        const dailyOrdersCount = Number(dailyRevenueRow?.total_orders) || 0;

        // Daily payment breakdown (Cash vs QR vs Card)
        const dailyPaymentBreakdown = await db.all(`
            SELECT 
                payment_method,
                COALESCE(SUM(total_amount), 0) AS total,
                COUNT(*) AS count
            FROM orders
            WHERE DATE(created_at) = ? AND status != 'cancelled'
            GROUP BY payment_method
        `, [targetDate]);

        // 2. Daily Expenses
        const dailyExpenseRow = await db.get(`
            SELECT 
                COALESCE(SUM(amount), 0) AS total_expenses,
                COUNT(*) AS total_expenses_count
            FROM expenses
            WHERE date = ?
        `, [targetDate]);

        const dailyExpenses = Number(dailyExpenseRow?.total_expenses) || 0;
        const dailyExpensesCount = Number(dailyExpenseRow?.total_expenses_count) || 0;

        // Daily expenses category breakdown
        const dailyCategoryBreakdown = await db.all(`
            SELECT 
                category,
                COALESCE(SUM(amount), 0) AS total,
                COUNT(*) AS count
            FROM expenses
            WHERE date = ?
            GROUP BY category
        `, [targetDate]);

        // Daily Net Profit
        const dailyNetProfit = Math.round((dailyRevenue - dailyExpenses) * 100) / 100;

        // 3. Monthly Revenue
        const monthlyRevenueRow = await db.get(`
            SELECT 
                COALESCE(SUM(total_amount), 0) AS total_revenue,
                COUNT(*) AS total_orders
            FROM orders
            WHERE strftime('%Y-%m', created_at) = ? AND status != 'cancelled'
        `, [targetMonth]);

        const monthlyRevenue = Number(monthlyRevenueRow?.total_revenue) || 0;
        const monthlyOrdersCount = Number(monthlyRevenueRow?.total_orders) || 0;

        // Monthly payment breakdown (Cash vs QR vs Card)
        const monthlyPaymentBreakdown = await db.all(`
            SELECT 
                payment_method,
                COALESCE(SUM(total_amount), 0) AS total,
                COUNT(*) AS count
            FROM orders
            WHERE strftime('%Y-%m', created_at) = ? AND status != 'cancelled'
            GROUP BY payment_method
        `, [targetMonth]);

        // 4. Monthly Expenses
        const monthlyExpenseRow = await db.get(`
            SELECT 
                COALESCE(SUM(amount), 0) AS total_expenses,
                COUNT(*) AS total_expenses_count
            FROM expenses
            WHERE strftime('%Y-%m', date) = ?
        `, [targetMonth]);

        const monthlyExpenses = Number(monthlyExpenseRow?.total_expenses) || 0;
        const monthlyExpensesCount = Number(monthlyExpenseRow?.total_expenses_count) || 0;

        // Monthly category breakdown
        const monthlyCategoryBreakdown = await db.all(`
            SELECT 
                category,
                COALESCE(SUM(amount), 0) AS total,
                COUNT(*) AS count
            FROM expenses
            WHERE strftime('%Y-%m', date) = ?
            GROUP BY category
        `, [targetMonth]);

        // Monthly Net Profit
        const monthlyNetProfit = Math.round((monthlyRevenue - monthlyExpenses) * 100) / 100;

        // 5. Daily Trend for the Month (Daily Sales vs Daily Expenses for Visual Bar Chart)
        const dailyTrends = await db.all(`
            SELECT 
                d.date,
                COALESCE(sales.revenue, 0) AS revenue,
                COALESCE(sales.orders_count, 0) AS orders_count,
                COALESCE(exp.expenses, 0) AS expenses,
                COALESCE(exp.expenses_count, 0) AS expenses_count,
                (COALESCE(sales.revenue, 0) - COALESCE(exp.expenses, 0)) AS net_profit
            FROM (
                SELECT DISTINCT DATE(created_at) AS date FROM orders WHERE strftime('%Y-%m', created_at) = ? AND status != 'cancelled'
                UNION
                SELECT DISTINCT date FROM expenses WHERE strftime('%Y-%m', date) = ?
            ) d
            LEFT JOIN (
                SELECT DATE(created_at) AS date, SUM(total_amount) AS revenue, COUNT(*) as orders_count
                FROM orders 
                WHERE strftime('%Y-%m', created_at) = ? AND status != 'cancelled'
                GROUP BY DATE(created_at)
            ) sales ON d.date = sales.date
            LEFT JOIN (
                SELECT date, SUM(amount) AS expenses, COUNT(*) as expenses_count
                FROM expenses 
                WHERE strftime('%Y-%m', date) = ?
                GROUP BY date
            ) exp ON d.date = exp.date
            ORDER BY d.date ASC
        `, [targetMonth, targetMonth, targetMonth, targetMonth]);

        // 6. Partners & Auto-calculated 3-Way Profit Split
        const partners = await db.all('SELECT id, name, share_percentage FROM partners ORDER BY id ASC');

        const partnerSplits = partners.map(partner => {
            const shareRatio = partner.share_percentage / 100;
            const dailyShare = dailyNetProfit > 0 
                ? Math.round(dailyNetProfit * shareRatio * 100) / 100 
                : 0;
            const monthlyShare = monthlyNetProfit > 0 
                ? Math.round(monthlyNetProfit * shareRatio * 100) / 100 
                : 0;

            return {
                id: partner.id,
                name: partner.name,
                share_percentage: partner.share_percentage,
                daily_profit_share: dailyShare,
                monthly_profit_share: monthlyShare
            };
        });

        // 7. Congee Sales Volume Breakdown
        const itemSales = await db.all(`
            SELECT 
                mi.id,
                mi.name,
                mi.sinhala_name,
                mi.station_id,
                COALESCE(SUM(oi.quantity), 0) AS bowls_sold,
                COALESCE(SUM(oi.quantity * oi.price_each), 0) AS total_sales
            FROM menu_items mi
            LEFT JOIN order_items oi ON mi.id = oi.menu_item_id
            LEFT JOIN orders o ON oi.order_id = o.id AND DATE(o.created_at) = ? AND o.status != 'cancelled'
            GROUP BY mi.id
            ORDER BY bowls_sold DESC, mi.id ASC
        `, [targetDate]);

        res.json({
            success: true,
            filter: {
                date: targetDate,
                month: targetMonth,
                timezone: 'Asia/Colombo'
            },
            daily: {
                revenue: dailyRevenue,
                orders_count: dailyOrdersCount,
                expenses: dailyExpenses,
                expenses_count: dailyExpensesCount,
                net_profit: dailyNetProfit,
                payment_breakdown: dailyPaymentBreakdown,
                expense_categories: dailyCategoryBreakdown
            },
            monthly: {
                revenue: monthlyRevenue,
                orders_count: monthlyOrdersCount,
                expenses: monthlyExpenses,
                expenses_count: monthlyExpensesCount,
                net_profit: monthlyNetProfit,
                payment_breakdown: monthlyPaymentBreakdown,
                expense_categories: monthlyCategoryBreakdown
            },
            daily_trends: dailyTrends,
            partner_profit_split: {
                basis: 'net_profit',
                total_percentage: partners.reduce((s, p) => s + p.share_percentage, 0),
                partners: partnerSplits
            },
            item_sales: itemSales
        });
    } catch (err) {
        console.error('[Reports API] Summary calculation error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
