import { createClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is loaded from server/.env or root/.env
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const isTurso = Boolean(process.env.TURSO_DATABASE_URL);
const defaultDbPath = path.resolve(__dirname, '../../../suwa_kanda.db');
const localDbPath = process.env.DB_PATH || defaultDbPath;

if (!isTurso) {
    const dbDir = path.dirname(localDbPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
}

const clientConfig = isTurso
    ? {
          url: process.env.TURSO_DATABASE_URL,
          authToken: process.env.TURSO_AUTH_TOKEN,
      }
    : {
          url: `file:${localDbPath.replace(/\\/g, '/')}`,
      };

export const client = createClient(clientConfig);

console.log(
    isTurso
        ? `☁️  [Database] Connected to TURSO Cloud Database: ${process.env.TURSO_DATABASE_URL}`
        : `📁 [Database] Connected to Local LibSQL/SQLite: ${clientConfig.url}`
);

// Normalize single row: convert bigint values to numbers
function normalizeRow(row) {
    if (!row) return null;
    const clean = {};
    for (const key of Object.keys(row)) {
        const val = row[key];
        clean[key] = typeof val === 'bigint' ? Number(val) : val;
    }
    return clean;
}

export const db = {
    isTurso,
    client,

    async all(sql, params = []) {
        const res = await client.execute({ sql, args: params });
        return res.rows.map(normalizeRow);
    },

    async get(sql, params = []) {
        const res = await client.execute({ sql, args: params });
        return res.rows.length > 0 ? normalizeRow(res.rows[0]) : null;
    },

    async run(sql, params = []) {
        const res = await client.execute({ sql, args: params });
        return {
            lastInsertRowid: res.lastInsertRowid != null ? Number(res.lastInsertRowid) : null,
            changes: res.rowsAffected || 0,
        };
    },

    async exec(sql) {
        return await client.executeMultiple(sql);
    },

    async transaction(callback) {
        return await client.transaction(async (tx) => {
            const txWrapper = {
                async all(sql, params = []) {
                    const res = await tx.execute({ sql, args: params });
                    return res.rows.map(normalizeRow);
                },
                async get(sql, params = []) {
                    const res = await tx.execute({ sql, args: params });
                    return res.rows.length > 0 ? normalizeRow(res.rows[0]) : null;
                },
                async run(sql, params = []) {
                    const res = await tx.execute({ sql, args: params });
                    return {
                        lastInsertRowid: res.lastInsertRowid != null ? Number(res.lastInsertRowid) : null,
                        changes: res.rowsAffected || 0,
                    };
                },
            };
            return await callback(txWrapper);
        });
    },
};

// Initial menu items seed
const defaultMenuItems = [
    { name: 'Kola Kanda', sinhala_name: 'කොළ කැඳ', price: 120, station_id: 'kola', is_active: 1 },
    { name: 'Saw Kanda', sinhala_name: 'සව් කැඳ', price: 130, station_id: 'grain', is_active: 1 },
    { name: 'Kurakkan Kanda', sinhala_name: 'කුරක්කන් කැඳ', price: 140, station_id: 'grain', is_active: 1 },
    { name: 'Hathawariya Kanda', sinhala_name: 'හතාවරිය කැඳ', price: 150, station_id: 'herbal', is_active: 1 },
    { name: 'Polpala Kanda', sinhala_name: 'පොල්පලා කැඳ', price: 130, station_id: 'herbal', is_active: 1 },
    { name: 'Mung Kanda', sinhala_name: 'මුං කැඳ', price: 120, station_id: 'kola', is_active: 1 },
];

const defaultPartners = [
    { name: 'Partner 1', share_percentage: 40.0 },
    { name: 'Partner 2', share_percentage: 30.0 },
    { name: 'Partner 3', share_percentage: 30.0 },
];

const defaultUsers = [
    { username: 'cashier', pin: '1234', role: 'cashier', name: 'Cashier (කැෂියර්)' },
    { username: 'admin', pin: '9999', role: 'admin', name: 'Owner / Manager (හිමිකරු)' },
];

// Initialize schema & seeds
export async function initDatabase() {
    try {
        const schemaPath = path.resolve(__dirname, 'schema.sql');
        if (fs.existsSync(schemaPath)) {
            const schema = fs.readFileSync(schemaPath, 'utf8');
            await client.executeMultiple(schema);
            console.log('[Database] Schema verified and loaded successfully.');
        }

        // Auto-seed menu_items if empty
        const menuCountRow = await db.get('SELECT COUNT(*) as count FROM menu_items');
        if (!menuCountRow || menuCountRow.count === 0) {
            console.log('[Database] Seeding initial menu items...');
            for (const item of defaultMenuItems) {
                await db.run(
                    'INSERT INTO menu_items (name, sinhala_name, price, station_id, is_active) VALUES (?, ?, ?, ?, ?)',
                    [item.name, item.sinhala_name, item.price, item.station_id, item.is_active]
                );
            }
            console.log(`[Database] Seeded ${defaultMenuItems.length} menu items.`);
        }

        // Auto-seed partners if empty
        const partnerCountRow = await db.get('SELECT COUNT(*) as count FROM partners');
        if (!partnerCountRow || partnerCountRow.count === 0) {
            console.log('[Database] Seeding initial partners...');
            for (const partner of defaultPartners) {
                await db.run(
                    'INSERT INTO partners (name, share_percentage) VALUES (?, ?)',
                    [partner.name, partner.share_percentage]
                );
            }
            console.log(`[Database] Seeded ${defaultPartners.length} partners.`);
        }

        // Auto-seed users if empty
        const userCountRow = await db.get('SELECT COUNT(*) as count FROM users');
        if (!userCountRow || userCountRow.count === 0) {
            console.log('[Database] Seeding initial users...');
            for (const u of defaultUsers) {
                await db.run(
                    'INSERT INTO users (username, pin, role, name) VALUES (?, ?, ?, ?)',
                    [u.username, u.pin, u.role, u.name]
                );
            }
            console.log(`[Database] Seeded ${defaultUsers.length} initial users.`);
        }
    } catch (err) {
        console.error('[Database] Initialization error:', err);
    }
}

// Auto-initialize
initDatabase();

export default db;
