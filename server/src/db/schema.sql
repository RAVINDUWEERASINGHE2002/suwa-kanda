-- Suwa Kanda (සුව කැඳ) - SQLite Database Schema
-- Thanamalwila Branch / Operation

PRAGMA foreign_keys = ON;

-- 1. Menu Items Table
CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sinhala_name TEXT NOT NULL,
    price REAL NOT NULL,
    station_id TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_number INTEGER NOT NULL,
    token_code TEXT,                               -- Formatted daily token e.g. '#001', '#002'
    order_type TEXT NOT NULL DEFAULT 'dine_in',     -- 'dine_in', 'takeaway'
    payment_method TEXT NOT NULL DEFAULT 'cash',   -- 'cash', 'qr', 'card'
    total_amount REAL NOT NULL DEFAULT 0.0,
    status TEXT NOT NULL DEFAULT 'pending',        -- 'pending', 'ready', 'verified', 'cancelled'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    menu_item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price_each REAL NOT NULL,
    item_status TEXT NOT NULL DEFAULT 'queued',    -- 'queued', 'preparing', 'ready', 'served'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items (id)
);

-- 4. Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,                            -- Format: 'YYYY-MM-DD'
    category TEXT NOT NULL,                        -- e.g. 'raw_materials', 'utilities', 'salaries', 'other'
    note TEXT,
    amount REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Partners Table
CREATE TABLE IF NOT EXISTS partners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    share_percentage REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_station ON menu_items(station_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
