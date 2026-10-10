import express from 'express';
import db from '../db/db.js';

const router = express.Router();

// 1. POST /api/auth/login - Fast PIN-based / Credentials POS Login
router.post('/login', async (req, res) => {
    try {
        const { pin, username } = req.body;

        if (!pin) {
            return res.status(400).json({ success: false, error: 'PIN අංකය ඇතුළත් කරන්න (PIN is required)' });
        }

        let user = null;
        if (username) {
            user = await db.get('SELECT id, username, role, name, pin FROM users WHERE username = ? AND pin = ?', [username, pin.toString()]);
        } else {
            // Check if PIN matches any user
            user = await db.get('SELECT id, username, role, name, pin FROM users WHERE pin = ?', [pin.toString()]);
        }

        if (!user) {
            return res.status(401).json({ 
                success: false, 
                error: 'වලංගු නොවන PIN අංකයකි! (Invalid PIN code. Default Cashier PIN is 1234)' 
            });
        }

        // Return user info (excluding PIN)
        const safeUser = {
            id: user.id,
            username: user.username,
            role: user.role,
            name: user.name,
            authenticated_at: new Date().toISOString()
        };

        return res.json({
            success: true,
            user: safeUser,
            token: `pos_auth_${user.id}_${Date.now()}`
        });
    } catch (err) {
        console.error('[Auth API] Login error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// 2. GET /api/auth/profiles - List active login profiles (Cashier, Owner/Admin)
router.get('/profiles', async (req, res) => {
    try {
        const users = await db.all('SELECT id, username, role, name FROM users ORDER BY id ASC');
        return res.json({ success: true, data: users });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// 3. POST /api/auth/change-pin - Update PIN
router.post('/change-pin', async (req, res) => {
    try {
        const { username, old_pin, new_pin } = req.body;

        if (!username || !old_pin || !new_pin) {
            return res.status(400).json({ success: false, error: 'All fields are required' });
        }

        if (new_pin.toString().length < 4) {
            return res.status(400).json({ success: false, error: 'PIN must be at least 4 digits' });
        }

        const user = await db.get('SELECT * FROM users WHERE username = ? AND pin = ?', [username, old_pin.toString()]);
        if (!user) {
            return res.status(401).json({ success: false, error: 'පැරණි PIN අංකය වැරදියි! (Current PIN is incorrect)' });
        }

        await db.run('UPDATE users SET pin = ? WHERE id = ?', [new_pin.toString(), user.id]);

        return res.json({ success: true, message: 'PIN අංකය සාර්ථකව වෙනස් කරන ලදී! (PIN updated successfully)' });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
