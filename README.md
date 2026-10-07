# Suwa Kanda (සුව කැඳ) - Thanamalwila

Authentic Herbal Congee POS, Kitchen Display System (KDS), and Store Management System located in Thanamalwila.

---

## 🏗️ Architecture Overview

```
E:\Suwa_Kanda\
├── client\                  # Frontend (Vite + React 19 + Tailwind CSS v3)
│   ├── src\
│   │   ├── components\
│   │   │   ├── Navbar.jsx          # Top tab navigation with live WebSocket & WAL indicators
│   │   │   └── ReceiptModal.jsx    # Thermal 80mm printable customer slip (window.print())
│   │   ├── context\
│   │   │   └── SocketContext.jsx   # Shared WebSocket state & event dispatching
│   │   ├── pages\
│   │   │   ├── CashierPOS.jsx      # Touch POS, fast cart, Dine-in/Takeaway, Ready shelf
│   │   │   ├── KitchenDisplay.jsx  # High-contrast KDS, Web Audio chime, single-tap Ready
│   │   │   ├── ExpensesPage.jsx    # Shop overheads & ingredient procurement ledger
│   │   │   ├── ReportsPage.jsx     # Daily/Monthly toggle, Cash vs QR, 3-way split, bar chart
│   │   │   └── SetupPage.jsx       # Menu price & active toggles, partner equity (100% sum)
│   │   ├── utils\
│   │   │   └── sound.js            # Web Audio API harmonic kitchen chime synthesizer
│   │   ├── App.jsx                 # Client router (/cashier, /kitchen, /expenses, /reports, /setup)
│   │   └── index.css               # Tailwind directives + thermal receipt print CSS
│   ├── tailwind.config.js
│   └── vite.config.js              # Proxy to Express on port 3000
├── server\                  # Backend (Node.js 22 + Express 5 + Socket.IO + better-sqlite3)
│   ├── src\
│   │   ├── db\
│   │   │   ├── db.js               # SQLite connection with WAL mode & foreign keys enabled
│   │   │   ├── schema.sql          # Relational SQL schema
│   │   │   └── seed.js             # Seeding script for menu items & partners
│   │   ├── routes\
│   │   │   ├── menu.routes.js      # GET /api/menu, PATCH /api/menu/:id (price & active)
│   │   │   ├── order.routes.js     # POST /api/orders, GET /api/orders/open, PATCH status
│   │   │   ├── expense.routes.js   # GET, POST, DELETE /api/expenses
│   │   │   ├── report.routes.js    # GET /api/reports/summary (Daily/Monthly + 3-Way Split)
│   │   │   └── partner.routes.js   # GET /api/partners, PUT /api/partners (100% validation)
│   │   ├── utils\
│   │   │   └── date.js             # Sri Lanka timezone (Asia/Colombo) & token formatting
│   │   └── index.js                # Express & Socket.IO server (0.0.0.0:3000)
│   ├── test_step2.js               # Automated integration tests for Step 2
│   ├── test_step4.js               # Automated integration tests for Step 4
│   ├── .env                        # PORT=3000, HOST=0.0.0.0
│   └── .env.example
├── suwa_kanda.db                   # Local SQLite database (WAL mode enabled)
├── package.json                    # Monorepo runner scripts
└── .gitignore
```

---

## 🔌 API Endpoints Summary

### Menu Management
- `GET /api/menu`: Fetch congee menu items (defaults to active items).
- `PATCH /api/menu/:id`: Update item selling price or toggle active/disabled state.

### Order Management & Real-time KDS
- `POST /api/orders`: Create order with daily sequential token `#001`, `#002`... (emits `order:created`).
- `GET /api/orders/open`: Fetch open tickets (`pending` and `ready`) for kitchen display.
- `PATCH /api/orders/:id/status`: Update status (`ready` emits `order:ready`, `verified` emits `order:verified`).

### Expenses Ledger
- `GET /api/expenses?month=YYYY-MM&category=...`: List monthly filtered expenses.
- `POST /api/expenses`: Record an operating expense (`date`, `category`, `note`, `amount`).
- `DELETE /api/expenses/:id`: Remove an expense record.

### Reports & Analytics
- `GET /api/reports/summary?date=YYYY-MM-DD&month=YYYY-MM`: Computes daily & monthly revenue (Cash vs QR), total expenses, net profit, day-by-day sales vs expenses trend for visual bar chart, and exact 3-way rupee partner profit distribution.

### Partners Equity
- `GET /api/partners`: Fetch partners and share percentages.
- `PUT /api/partners`: Update partner names and percentage shares with atomic validation ensuring $\sum \text{share\_percentage} = 100\%$.

---

## 🤝 3-Way Partner Profit Allocation

Net profit is calculated dynamically:
$$\text{Net Profit} = \text{Revenue} - \text{Expenses}$$

Whenever Net Profit $> 0$, it distributes:
- **Partner 1 (Bandara)**: $40\%$ of Net Profit
- **Partner 2 (Kusal)**: $30\%$ of Net Profit
- **Partner 3 (Nimal)**: $30\%$ of Net Profit

---

## 🚀 Running the System

```bash
# Start backend (0.0.0.0:3000) & Vite frontend (localhost:5173)
npm run dev

# Or start separately:
npm run dev:server
npm run dev:client

# Run Step 4 verification tests:
node server/test_step4.js
```
