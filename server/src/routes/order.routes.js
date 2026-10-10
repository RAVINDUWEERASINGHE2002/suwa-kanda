import express from 'express';
import db from '../db/db.js';
import { getColomboDateStr, getColomboTimestampStr, formatTokenCode } from '../utils/date.js';

export function createOrderRouter(io) {
    const router = express.Router();

    // Helper: fetch full order details including line items
    const getOrderWithItems = async (orderId) => {
        const order = await db.get('SELECT * FROM orders WHERE id = ?', [orderId]);
        if (!order) return null;

        const items = await db.all(`
            SELECT oi.*, mi.name, mi.sinhala_name, mi.station_id 
            FROM order_items oi
            JOIN menu_items mi ON oi.menu_item_id = mi.id
            WHERE oi.order_id = ?
        `, [orderId]);

        return {
            ...order,
            token_display: order.token_code || formatTokenCode(order.token_number),
            items
        };
    };

    // 1. GET /api/orders/open - Fetch pending, preparing and ready orders
    router.get('/open', async (req, res) => {
        try {
            const todayDateStr = getColomboDateStr();
            const orders = await db.all(`
                SELECT * FROM orders 
                WHERE (status IN ('pending', 'preparing', 'ready') OR (status = 'verified' AND DATE(created_at) = ?))
                ORDER BY created_at ASC, id ASC
            `, [todayDateStr]);

            const ordersWithItems = await Promise.all(orders.map(async (order) => {
                const items = await db.all(`
                    SELECT oi.*, mi.name, mi.sinhala_name, mi.station_id 
                    FROM order_items oi
                    JOIN menu_items mi ON oi.menu_item_id = mi.id
                    WHERE oi.order_id = ?
                `, [order.id]);

                return {
                    ...order,
                    token_display: order.token_code || formatTokenCode(order.token_number),
                    items
                };
            }));

            res.json({
                success: true,
                count: ordersWithItems.length,
                data: ordersWithItems
            });
        } catch (err) {
            console.error('[Orders API] Error fetching open orders:', err);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // 2. GET /api/orders - Fetch all orders (with optional status/date filter)
    router.get('/', async (req, res) => {
        try {
            const { status, date, limit = 50 } = req.query;
            let query = 'SELECT * FROM orders WHERE 1=1';
            const params = [];

            if (status) {
                query += ' AND status = ?';
                params.push(status);
            }
            if (date) {
                query += ' AND DATE(created_at) = ?';
                params.push(date);
            }
            query += ' ORDER BY created_at DESC LIMIT ?';
            params.push(parseInt(limit, 10));

            const orders = await db.all(query, params);
            const ordersWithItems = await Promise.all(orders.map(o => getOrderWithItems(o.id)));

            res.json({ success: true, count: ordersWithItems.length, data: ordersWithItems });
        } catch (err) {
            console.error('[Orders API] Error fetching orders:', err);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // 3. GET /api/orders/:id - Fetch single order
    router.get('/:id', async (req, res) => {
        try {
            const order = await getOrderWithItems(req.params.id);
            if (!order) {
                return res.status(404).json({ success: false, error: 'Order not found' });
            }
            res.json({ success: true, data: order });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // 4. POST /api/orders - Create new order with sequential daily token (#001, #002...)
    router.post('/', async (req, res) => {
        try {
            const { order_type = 'dine_in', payment_method = 'cash', items = [] } = req.body;

            if (!Array.isArray(items) || items.length === 0) {
                return res.status(400).json({ success: false, error: 'Order must contain an array of items' });
            }

            const todayDateStr = getColomboDateStr();
            const timestampStr = getColomboTimestampStr();

            // Validate and calculate totals
            let calculatedTotal = 0;
            const parsedItems = [];

            for (const item of items) {
                if (!item.menu_item_id || !item.quantity || item.quantity <= 0) {
                    return res.status(400).json({ success: false, error: 'Invalid menu_item_id or quantity' });
                }
                const menuItem = await db.get('SELECT id, name, sinhala_name, price, station_id FROM menu_items WHERE id = ?', [item.menu_item_id]);
                if (!menuItem) {
                    return res.status(404).json({ success: false, error: `Menu item with ID ${item.menu_item_id} not found` });
                }
                const itemTotal = menuItem.price * item.quantity;
                calculatedTotal += itemTotal;
                parsedItems.push({
                    menu_item_id: menuItem.id,
                    quantity: item.quantity,
                    price_each: menuItem.price,
                });
            }

            // Find highest token number for today's date
            const tokenQuery = await db.get(`
                SELECT COALESCE(MAX(token_number), 0) + 1 AS next_token
                FROM orders
                WHERE DATE(created_at) = ?
            `, [todayDateStr]);
            const nextTokenNumber = tokenQuery?.next_token || 1;
            const tokenCode = formatTokenCode(nextTokenNumber);

            // Insert into orders table
            const orderResult = await db.run(`
                INSERT INTO orders (token_number, token_code, order_type, payment_method, total_amount, status, created_at)
                VALUES (?, ?, ?, ?, ?, 'pending', ?)
            `, [
                nextTokenNumber,
                tokenCode,
                order_type,
                payment_method,
                calculatedTotal,
                timestampStr
            ]);
            const newOrderId = orderResult.lastInsertRowid;

            // Insert order items
            for (const item of parsedItems) {
                await db.run(`
                    INSERT INTO order_items (order_id, menu_item_id, quantity, price_each, item_status, created_at)
                    VALUES (?, ?, ?, ?, 'queued', ?)
                `, [newOrderId, item.menu_item_id, item.quantity, item.price_each, timestampStr]);
            }

            const fullOrder = await getOrderWithItems(newOrderId);

            // WebSocket event emission: order:created
            if (io) {
                io.emit('order:created', fullOrder);
                console.log(`[Socket.io] Emitted 'order:created' for Token ${fullOrder.token_code} (ID: ${fullOrder.id})`);
            }

            res.status(201).json({ success: true, data: fullOrder });
        } catch (err) {
            console.error('[Orders API] Order creation error:', err);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // 5. PATCH /api/orders/:id/status - Update order status ('ready', 'verified', 'cancelled')
    router.patch('/:id/status', async (req, res) => {
        try {
            const { status } = req.body;
            const validStatuses = ['pending', 'preparing', 'ready', 'verified', 'cancelled'];

            if (!status || !validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
                });
            }

            const existingOrder = await db.get('SELECT id, status FROM orders WHERE id = ?', [req.params.id]);
            if (!existingOrder) {
                return res.status(404).json({ success: false, error: 'Order not found' });
            }

            // Update status in database
            await db.run('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);

            const updatedOrder = await getOrderWithItems(req.params.id);

            // WebSocket event emissions based on status
            if (io) {
                if (status === 'preparing') {
                    io.emit('order:preparing', updatedOrder);
                    console.log(`[Socket.io] Emitted 'order:preparing' for Token ${updatedOrder.token_code} (ID: ${updatedOrder.id})`);
                } else if (status === 'ready') {
                    io.emit('order:ready', updatedOrder);
                    console.log(`[Socket.io] Emitted 'order:ready' for Token ${updatedOrder.token_code} (ID: ${updatedOrder.id})`);
                } else if (status === 'verified') {
                    io.emit('order:verified', updatedOrder);
                    console.log(`[Socket.io] Emitted 'order:verified' for Token ${updatedOrder.token_code} (ID: ${updatedOrder.id})`);
                }
                
                // Generic update event for all listeners
                io.emit('order:updated', updatedOrder);
            }

            res.json({ success: true, data: updatedOrder });
        } catch (err) {
            console.error('[Orders API] Status update error:', err);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    return router;
}

export default createOrderRouter;
