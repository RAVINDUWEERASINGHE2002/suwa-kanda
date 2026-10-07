import express from 'express';
import db from '../db/db.js';
import { getColomboDateStr, getColomboTimestampStr } from '../utils/date.js';

const router = express.Router();

// GET /api/expenses - List expenses with optional filters
router.get('/', async (req, res) => {
    try {
        const { date, month, category } = req.query;
        let query = 'SELECT * FROM expenses WHERE 1=1';
        const params = [];

        if (date) {
            query += ' AND date = ?';
            params.push(date);
        }
        if (month) {
            query += " AND strftime('%Y-%m', date) = ?";
            params.push(month);
        }
        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }
        query += ' ORDER BY date DESC, id DESC';

        const expenses = await db.all(query, params);
        const totalAmount = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

        res.json({
            success: true,
            count: expenses.length,
            totalAmount: Math.round(totalAmount * 100) / 100,
            data: expenses
        });
    } catch (err) {
        console.error('[Expense API] Fetch error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/expenses - Log an expense
router.post('/', async (req, res) => {
    try {
        let { date, category, note, amount } = req.body;

        if (!date) {
            date = getColomboDateStr();
        }

        if (!category || typeof category !== 'string' || !category.trim()) {
            return res.status(400).json({ success: false, error: 'Category is required' });
        }

        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({ success: false, error: 'Amount must be a positive number' });
        }

        const timestampStr = getColomboTimestampStr();

        const result = await db.run(
            'INSERT INTO expenses (date, category, note, amount, created_at) VALUES (?, ?, ?, ?, ?)',
            [date, category.trim(), note?.trim() || null, numericAmount, timestampStr]
        );
        const createdExpense = await db.get('SELECT * FROM expenses WHERE id = ?', [result.lastInsertRowid]);

        res.status(201).json({
            success: true,
            data: createdExpense
        });
    } catch (err) {
        console.error('[Expense API] Create error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE /api/expenses/:id - Delete an expense entry
router.delete('/:id', async (req, res) => {
    try {
        const item = await db.get('SELECT * FROM expenses WHERE id = ?', [req.params.id]);
        if (!item) {
            return res.status(404).json({ success: false, error: 'Expense record not found' });
        }

        await db.run('DELETE FROM expenses WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Expense deleted successfully', deleted: item });
    } catch (err) {
        console.error('[Expense API] Delete error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
