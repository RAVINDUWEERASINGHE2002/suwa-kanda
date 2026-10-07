import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from './db/db.js';
import menuRouter from './routes/menu.routes.js';
import partnerRouter from './routes/partner.routes.js';
import createOrderRouter from './routes/order.routes.js';
import expenseRouter from './routes/expense.routes.js';
import reportRouter from './routes/report.routes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Setup Socket.io binding with permissive CORS for LAN / POS / KDS screens
const io = new SocketIOServer(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
    }
});

// Middlewares
app.use(cors());
app.use(express.json());

// Socket.io connection logging & room support
io.on('connection', (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);
    
    socket.on('disconnect', () => {
        console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
});

// System Health & Diagnostics endpoint
app.get('/api/health', async (req, res) => {
    try {
        const counts = {
            menu_items: (await db.get('SELECT COUNT(*) as count FROM menu_items'))?.count || 0,
            orders: (await db.get('SELECT COUNT(*) as count FROM orders'))?.count || 0,
            order_items: (await db.get('SELECT COUNT(*) as count FROM order_items'))?.count || 0,
            expenses: (await db.get('SELECT COUNT(*) as count FROM expenses'))?.count || 0,
            partners: (await db.get('SELECT COUNT(*) as count FROM partners'))?.count || 0,
        };

        res.json({
            status: 'online',
            project: 'Suwa Kanda (සුව කැඳ)',
            location: 'Thanamalwila',
            timestamp: new Date().toISOString(),
            database: {
                connected: true,
                type: db.isTurso ? 'Turso Edge Cloud' : 'Local LibSQL/SQLite',
                table_counts: counts
            }
        });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// Register API Routes
app.use('/api/menu', menuRouter);
app.use('/api/orders', createOrderRouter(io));
app.use('/api/expenses', expenseRouter);
app.use('/api/reports', reportRouter);
app.use('/api/partners', partnerRouter);

// Serve Frontend Bundle in Production (when client/dist exists)
const clientDistCandidates = [
    path.resolve(__dirname, '../../client/dist'),
    path.resolve(__dirname, '../public'),
    path.resolve(process.cwd(), 'client/dist'),
    path.resolve(process.cwd(), '../client/dist'),
    path.resolve(process.cwd(), 'dist')
];

const clientDistPath = clientDistCandidates.find(p => fs.existsSync(p));
if (clientDistPath) {
    app.use(express.static(clientDistPath));
    // Fallback for client-side SPA routing in Express 5
    app.use((req, res, next) => {
        if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
            return res.sendFile(path.resolve(clientDistPath, 'index.html'));
        }
        next();
    });
    console.log(`📦 Serving production client bundle from: ${clientDistPath}`);
}

const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
    console.log(`🌿 Suwa Kanda backend running on http://${HOST}:${PORT}`);
    console.log(`📡 Socket.IO server active on port ${PORT} bound to ${HOST}`);
});

export { app, server, io };
