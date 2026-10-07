import express from 'express';
import db from '../db/db.js';

const router = express.Router();

// GET all partners & ownership breakdown
router.get('/', async (req, res) => {
    try {
        const partners = await db.all('SELECT * FROM partners ORDER BY id ASC');
        const totalPercentage = partners.reduce((sum, p) => sum + p.share_percentage, 0);
        res.json({ success: true, count: partners.length, totalPercentage, data: partners });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// PUT /api/partners - Bulk update partner names & percentages with 100% sum validation
router.put('/', async (req, res) => {
    try {
        const { partners } = req.body;
        if (!Array.isArray(partners) || partners.length === 0) {
            return res.status(400).json({ success: false, error: 'Partners array is required' });
        }

        // Validate each partner
        for (const p of partners) {
            if (!p.id || !p.name || typeof p.name !== 'string' || !p.name.trim()) {
                return res.status(400).json({ success: false, error: 'Each partner must have an id and valid name' });
            }
            const pct = parseFloat(p.share_percentage);
            if (isNaN(pct) || pct < 0 || pct > 100) {
                return res.status(400).json({ success: false, error: `Invalid percentage for partner ${p.name}` });
            }
        }

        // Validate total percentage sum equals exactly 100%
        const totalSum = partners.reduce((acc, p) => acc + parseFloat(p.share_percentage), 0);
        const roundedSum = Math.round(totalSum * 100) / 100;
        if (Math.abs(roundedSum - 100) > 0.01) {
            return res.status(400).json({ 
                success: false, 
                error: `Total partner shares must equal exactly 100%. Current sum: ${roundedSum}%` 
            });
        }

        for (const p of partners) {
            await db.run(
                'UPDATE partners SET name = ?, share_percentage = ? WHERE id = ?',
                [p.name.trim(), parseFloat(p.share_percentage), p.id]
            );
        }

        const updatedList = await db.all('SELECT * FROM partners ORDER BY id ASC');
        res.json({
            success: true,
            totalPercentage: 100,
            data: updatedList
        });
    } catch (err) {
        console.error('[Partners API] Update error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
