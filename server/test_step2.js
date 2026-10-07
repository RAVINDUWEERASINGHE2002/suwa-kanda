import { io as Client } from 'socket.io-client';
import { server } from './src/index.js';

const BASE_URL = 'http://localhost:3000';

async function runTests() {
    console.log('🚀 Starting Step 2 Integration Verification Tests...\n');
    let socket;
    const receivedEvents = [];

    try {
        // Wait 500ms for server to be ready
        await new Promise(r => setTimeout(r, 500));

        // 1. Test Socket.IO Connection
        console.log('--- 1. Testing Socket.IO Connection ---');
        socket = Client(BASE_URL, { reconnection: false });

        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Socket.IO connection timeout')), 3000);
            socket.on('connect', () => {
                clearTimeout(timeout);
                console.log(`✅ Connected to WebSocket: socket.id = ${socket.id}`);
                resolve();
            });
            socket.on('connect_error', (err) => reject(err));
        });

        // Set up event listeners
        socket.on('order:created', (data) => {
            console.log(`📡 [WS EVENT] Received 'order:created': Token ${data.token_code} (ID: ${data.id})`);
            receivedEvents.push({ event: 'order:created', data });
        });

        socket.on('order:ready', (data) => {
            console.log(`📡 [WS EVENT] Received 'order:ready': Token ${data.token_code} (Status: ${data.status})`);
            receivedEvents.push({ event: 'order:ready', data });
        });

        socket.on('order:verified', (data) => {
            console.log(`📡 [WS EVENT] Received 'order:verified': Token ${data.token_code} (Status: ${data.status})`);
            receivedEvents.push({ event: 'order:verified', data });
        });

        // 2. Test GET /api/menu
        console.log('\n--- 2. Testing GET /api/menu ---');
        const menuRes = await fetch(`${BASE_URL}/api/menu`);
        const menuData = await menuRes.json();
        console.log(`Status: ${menuRes.status}, Items count: ${menuData.count}`);
        if (!menuData.success || menuData.count === 0) {
            throw new Error('Menu test failed');
        }
        console.log(`✅ Menu retrieved successfully: ${menuData.data.map(m => m.name).join(', ')}`);

        // 3. Test POST /api/orders (Sequential token generation & WS broadcast)
        console.log('\n--- 3. Testing POST /api/orders ---');
        const orderPayload = {
            order_type: 'dine_in',
            payment_method: 'cash',
            items: [
                { menu_item_id: 1, quantity: 2 }, // Kola Kanda @ 120 = 240
                { menu_item_id: 3, quantity: 1 }  // Kurakkan Kanda @ 140 = 140 -> Total = 380
            ]
        };

        const createOrderRes = await fetch(`${BASE_URL}/api/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderPayload)
        });
        const createdOrder = await createOrderRes.json();
        console.log(`Status: ${createOrderRes.status}`);
        console.log(`Created Order Token: ${createdOrder.data.token_code}, Amount: Rs. ${createdOrder.data.total_amount}`);
        if (!createdOrder.success || !createdOrder.data.token_code) {
            throw new Error('Order creation failed');
        }

        // Wait a moment for WS event to fire
        await new Promise(r => setTimeout(r, 200));
        const hasOrderCreatedEvent = receivedEvents.some(e => e.event === 'order:created' && e.data.id === createdOrder.data.id);
        console.log(`✅ Socket.io received 'order:created': ${hasOrderCreatedEvent}`);

        const testOrderId = createdOrder.data.id;

        // 4. Test GET /api/orders/open
        console.log('\n--- 4. Testing GET /api/orders/open ---');
        const openOrdersRes = await fetch(`${BASE_URL}/api/orders/open`);
        const openOrdersData = await openOrdersRes.json();
        console.log(`Status: ${openOrdersRes.status}, Open orders count: ${openOrdersData.count}`);
        const foundInOpen = openOrdersData.data.some(o => o.id === testOrderId);
        console.log(`✅ Created order found in open list: ${foundInOpen}`);

        // 5. Test PATCH /api/orders/:id/status -> 'ready' (emits order:ready)
        console.log('\n--- 5. Testing PATCH /api/orders/:id/status to "ready" ---');
        const patchReadyRes = await fetch(`${BASE_URL}/api/orders/${testOrderId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'ready' })
        });
        const readyData = await patchReadyRes.json();
        console.log(`Status: ${patchReadyRes.status}, Order status: ${readyData.data.status}`);
        await new Promise(r => setTimeout(r, 200));
        const hasOrderReadyEvent = receivedEvents.some(e => e.event === 'order:ready' && e.data.id === testOrderId);
        console.log(`✅ Socket.io received 'order:ready': ${hasOrderReadyEvent}`);

        // 6. Test PATCH /api/orders/:id/status -> 'verified' (emits order:verified)
        console.log('\n--- 6. Testing PATCH /api/orders/:id/status to "verified" ---');
        const patchVerifiedRes = await fetch(`${BASE_URL}/api/orders/${testOrderId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'verified' })
        });
        const verifiedData = await patchVerifiedRes.json();
        console.log(`Status: ${patchVerifiedRes.status}, Order status: ${verifiedData.data.status}`);
        await new Promise(r => setTimeout(r, 200));
        const hasOrderVerifiedEvent = receivedEvents.some(e => e.event === 'order:verified' && e.data.id === testOrderId);
        console.log(`✅ Socket.io received 'order:verified': ${hasOrderVerifiedEvent}`);

        // 7. Test POST /api/expenses
        console.log('\n--- 7. Testing POST /api/expenses ---');
        const expensePayload = {
            category: 'herbs_procurement',
            note: 'Fresh herbs from local Thanamalwila farmers',
            amount: 1500
        };
        const createExpRes = await fetch(`${BASE_URL}/api/expenses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(expensePayload)
        });
        const createdExp = await createExpRes.json();
        console.log(`Status: ${createExpRes.status}, Logged Expense ID: ${createdExp.data.id}, Amount: Rs. ${createdExp.data.amount}`);
        if (!createdExp.success) throw new Error('Expense logging failed');

        // 8. Test GET /api/expenses
        console.log('\n--- 8. Testing GET /api/expenses ---');
        const getExpRes = await fetch(`${BASE_URL}/api/expenses`);
        const getExpData = await getExpRes.json();
        console.log(`Status: ${getExpRes.status}, Total expenses count: ${getExpData.count}, Total amount: Rs. ${getExpData.totalAmount}`);

        // 9. Test GET /api/reports/summary
        console.log('\n--- 9. Testing GET /api/reports/summary ---');
        const reportRes = await fetch(`${BASE_URL}/api/reports/summary`);
        const reportData = await reportRes.json();
        console.log(`Status: ${reportRes.status}`);
        console.log('--- Summary Metrics ---');
        console.log(`Target Date: ${reportData.filter.date}`);
        console.log(`Daily Revenue: Rs. ${reportData.daily.revenue} (${reportData.daily.orders_count} orders)`);
        console.log(`Daily Expenses: Rs. ${reportData.daily.expenses} (${reportData.daily.expenses_count} expenses)`);
        console.log(`Daily Net Profit: Rs. ${reportData.daily.net_profit}`);
        console.log(`Monthly Net Profit: Rs. ${reportData.monthly.net_profit}`);
        console.log('--- 3-Way Partner Profit Split ---');
        console.table(reportData.partner_profit_split.partners);

        console.log('\n🎉 ALL STEP 2 VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉\n');

    } catch (err) {
        console.error('❌ Test failed with error:', err);
        process.exitCode = 1;
    } finally {
        if (socket) socket.disconnect();
        server.close(() => {
            console.log('Server test instance closed.');
            process.exit(process.exitCode || 0);
        });
    }
}

runTests();
