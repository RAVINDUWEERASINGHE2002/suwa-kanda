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

// 3. POST /api/auth/change-pin - Admin updates PIN for Cashier or Admin
router.post('/change-pin', async (req, res) => {
    try {
        const { target_role, admin_pin, new_pin } = req.body;

        if (!target_role || !admin_pin || !new_pin) {
            return res.status(400).json({ 
                success: false, 
                error: 'සියලු තොරතුරු ඇතුළත් කරන්න (Target role, Admin PIN and New PIN are required)' 
            });
        }

        if (new_pin.toString().trim().length < 4) {
            return res.status(400).json({ 
                success: false, 
                error: 'නව PIN අංකය අවම වශයෙන් ඉලක්කම් 4ක් විය යුතුය (New PIN must be at least 4 digits)' 
            });
        }

        // Verify Admin Authorization
        const adminUser = await db.get("SELECT * FROM users WHERE role = 'admin' AND pin = ?", [admin_pin.toString().trim()]);
        if (!adminUser) {
            return res.status(401).json({ 
                success: false, 
                error: 'පරිපාලක (Admin) PIN අංකය වැරදියි! (Current Admin PIN is incorrect)' 
            });
        }

        // Find target user to update
        const targetUser = await db.get('SELECT * FROM users WHERE role = ?', [target_role]);
        if (!targetUser) {
            return res.status(404).json({ success: false, error: 'පරිශීලකයා හමු නොවීය (User not found)' });
        }

        await db.run('UPDATE users SET pin = ? WHERE id = ?', [new_pin.toString().trim(), targetUser.id]);

        return res.json({ 
            success: true, 
            message: `${targetUser.name} සඳහා නව PIN අංකය සාර්ථකව යාවත්කාලීන කරන ලදී!` 
        });
    } catch (err) {
        console.error('[Auth API] Change PIN error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
