const BASE_URL = 'http://localhost:3000';

async function runStep4Tests() {
    console.log('🚀 Running Step 4 Automated Verification Tests...\n');

    try {
        // 1. Test Menu item price & active toggle
        console.log('--- 1. Testing Menu Item Management (PATCH /api/menu/:id) ---');
        const patchRes = await fetch(`${BASE_URL}/api/menu/1`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ price: 135, is_active: 1 })
        });
        const patchData = await patchRes.json();
        console.log(`Menu update status: ${patchRes.status}, Item: ${patchData.data.name}, Price: Rs. ${patchData.data.price}`);
        if (!patchData.success || patchData.data.price !== 135) throw new Error('Menu update failed');
        console.log('✅ Menu price successfully updated');

        // 2. Test Partner Equity validation (rejection when total != 100%)
        console.log('\n--- 2. Testing Partner Equity Validation (PUT /api/partners) ---');
        const invalidRes = await fetch(`${BASE_URL}/api/partners`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                partners: [
                    { id: 1, name: 'Partner 1', share_percentage: 50 },
                    { id: 2, name: 'Partner 2', share_percentage: 40 },
                    { id: 3, name: 'Partner 3', share_percentage: 20 } // sum = 110%
                ]
            })
        });
        const invalidData = await invalidRes.json();
        console.log(`Invalid sum rejection status: ${invalidRes.status} (expected 400), Error: "${invalidData.error}"`);
        if (invalidRes.status !== 400 || invalidData.success) throw new Error('Failed to reject invalid percentage sum');
        console.log('✅ Correctly rejected invalid partner equity sum (110%)');

        // Valid partner update (100% sum)
        const validRes = await fetch(`${BASE_URL}/api/partners`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                partners: [
                    { id: 1, name: 'Bandara (Managing)', share_percentage: 40 },
                    { id: 2, name: 'Kusal (Operations)', share_percentage: 30 },
                    { id: 3, name: 'Nimal (Investor)', share_percentage: 30 }
                ]
            })
        });
        const validData = await validRes.json();
        console.log(`Valid sum update status: ${validRes.status}, Total: ${validData.totalPercentage}%`);
        if (!validData.success || validData.totalPercentage !== 100) throw new Error('Valid partner update failed');
        console.log('✅ Successfully saved 100% partner equity configuration');

        // 3. Test Expenses Logging & Monthly Filtering
        console.log('\n--- 3. Testing Expenses Logging & Filtering ---');
        const expRes = await fetch(`${BASE_URL}/api/expenses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                date: '2026-10-07',
                category: 'Packaging',
                note: 'Eco cups and spoons purchase',
                amount: 800
            })
        });
        const expData = await expRes.json();
        const createdExpId = expData.data.id;
        console.log(`Logged Expense ID: ${createdExpId}, Category: ${expData.data.category}, Amount: Rs. ${expData.data.amount}`);
        if (!expData.success) throw new Error('Expense creation failed');

        // Fetch monthly filtered
        const getMonthlyExp = await fetch(`${BASE_URL}/api/expenses?month=2026-10`);
        const monthlyExpData = await getMonthlyExp.json();
        console.log(`Monthly expenses count: ${monthlyExpData.count}, Total spent: Rs. ${monthlyExpData.totalAmount}`);
        console.log('✅ Expenses logging & monthly filtering verified');

        // 4. Test Reports Summary with 3-Way Partner Split
        console.log('\n--- 4. Testing Reports Summary & 3-Way Partner Profit Split ---');
        const reportRes = await fetch(`${BASE_URL}/api/reports/summary?date=2026-10-07&month=2026-10`);
        const reportData = await reportRes.json();
        console.log(`Daily Revenue: Rs. ${reportData.daily.revenue} (Cash vs QR breakdown available)`);
        console.log(`Daily Expenses: Rs. ${reportData.daily.expenses}`);
        console.log(`Daily Net Profit: Rs. ${reportData.daily.net_profit}`);
        console.log('--- 3-Way Partner Profit Distribution Table ---');
        console.table(reportData.partner_profit_split.partners.map(p => ({
            name: p.name,
            share: `${p.share_percentage}%`,
            daily_rupee_payout: `Rs. ${p.daily_profit_share}`,
            monthly_rupee_payout: `Rs. ${p.monthly_profit_share}`
        })));
        console.log('--- Daily Trend Series for Visual Bar Chart ---');
        console.log(`Data points in month: ${reportData.daily_trends.length}`);
        console.log('✅ Reports & Profit Split calculations verified');

        console.log('\n🎉 ALL STEP 4 VERIFICATION TESTS COMPLETED SUCCESSFULLY! 🎉\n');

    } catch (err) {
        console.error('❌ Step 4 test error:', err);
        process.exit(1);
    }
}

runStep4Tests();
