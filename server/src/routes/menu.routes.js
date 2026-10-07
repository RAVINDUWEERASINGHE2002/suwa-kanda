import express from 'express';
import db from '../db/db.js';

const router = express.Router();

// GET all menu items (defaults to active items unless includeInactive=true)
router.get('/', async (req, res) => {
    try {
        const { includeInactive } = req.query;
        let query = 'SELECT * FROM menu_items';
        if (includeInactive !== 'true') {
            query += ' WHERE is_active = 1';
        }
        query += ' ORDER BY station_id ASC, id ASC';
        
        const items = await db.all(query);
        res.json({ success: true, count: items.length, data: items });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET menu item by id
router.get('/:id', async (req, res) => {
    try {
        const item = await db.get('SELECT * FROM menu_items WHERE id = ?', [req.params.id]);
        if (!item) {
            return res.status(404).json({ success: false, error: 'Menu item not found' });
        }
        res.json({ success: true, data: item });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/menu - Add a new congee menu item
router.post('/', async (req, res) => {
    try {
        const { name, sinhala_name, price, station_id = 'kola' } = req.body;
        
        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({ success: false, error: 'English name is required (e.g. Gotukola Kanda)' });
        }
        if (!sinhala_name || typeof sinhala_name !== 'string' || !sinhala_name.trim()) {
            return res.status(400).json({ success: false, error: 'Sinhala name is required (e.g. ගොටුකොළ කැඳ)' });
        }

        const priceNum = parseFloat(price);
        if (isNaN(priceNum) || priceNum <= 0) {
            return res.status(400).json({ success: false, error: 'Price must be a valid positive number' });
        }

        const validStations = ['kola', 'grain', 'herbal'];
        const station = validStations.includes(station_id) ? station_id : 'kola';

        const result = await db.run(
            'INSERT INTO menu_items (name, sinhala_name, price, station_id, is_active) VALUES (?, ?, ?, ?, 1)',
            [name.trim(), sinhala_name.trim(), priceNum, station]
        );
        const created = await db.get('SELECT * FROM menu_items WHERE id = ?', [result.lastInsertRowid]);

        res.status(201).json({ success: true, data: created });
    } catch (err) {
        console.error('[Menu API] Create error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// PATCH /api/menu/:id - Update menu item price and/or is_active status
router.patch('/:id', async (req, res) => {
    try {
        const { price, is_active } = req.body;
        const item = await db.get('SELECT * FROM menu_items WHERE id = ?', [req.params.id]);
        if (!item) {
            return res.status(404).json({ success: false, error: 'Menu item not found' });
        }

        const newPrice = price !== undefined ? parseFloat(price) : item.price;
        const newActive = is_active !== undefined ? (is_active ? 1 : 0) : item.is_active;

        if (isNaN(newPrice) || newPrice < 0) {
            return res.status(400).json({ success: false, error: 'Price must be a valid non-negative number' });
        }

        await db.run(
            'UPDATE menu_items SET price = ?, is_active = ? WHERE id = ?',
            [newPrice, newActive, req.params.id]
        );

        const updated = await db.get('SELECT * FROM menu_items WHERE id = ?', [req.params.id]);
        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE /api/menu/:id - Delete or deactivate menu item
router.delete('/:id', async (req, res) => {
    try {
        const item = await db.get('SELECT * FROM menu_items WHERE id = ?', [req.params.id]);
        if (!item) {
            return res.status(404).json({ success: false, error: 'Menu item not found' });
        }

        // Check if item has order history
        const orderUsage = await db.get('SELECT COUNT(*) as count FROM order_items WHERE menu_item_id = ?', [req.params.id]);
        if (orderUsage && orderUsage.count > 0) {
            // Deactivate to protect order history integrity
            await db.run('UPDATE menu_items SET is_active = 0 WHERE id = ?', [req.params.id]);
            return res.json({ 
                success: true, 
                message: 'Item has existing sales history; deactivated from active menu instead of deleting',
                deactivated: true 
            });
        }

        await db.run('DELETE FROM menu_items WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Menu item deleted successfully', deleted: item });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
