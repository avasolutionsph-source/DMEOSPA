// Dashboard Diagnostic Tool
// Run this in the browser console to diagnose dashboard issues

async function diagnoseDashboard() {
    console.log('🔍 [DIAGNOSTIC] Starting dashboard diagnostic...\n');

    // 1. Check Authentication
    console.log('═══ 1. AUTHENTICATION CHECK ═══');
    const authToken = localStorage.getItem('authToken') || localStorage.getItem('userToken') || sessionStorage.getItem('authToken');
    console.log('Auth Token Available:', !!authToken);
    if (authToken) {
        console.log('Auth Token Preview:', authToken.substring(0, 30) + '...');
    } else {
        console.error('❌ NO AUTH TOKEN FOUND!');
        console.log('Please login first through the marketing website or use setDevelopmentToken()');
    }
    console.log('');

    // 2. Check API Configuration
    console.log('═══ 2. API CONFIGURATION ═══');
    console.log('API_CONFIG exists:', !!window.API_CONFIG);
    if (window.API_CONFIG) {
        console.log('Base URL:', window.API_CONFIG.BASE_URL);
        console.log('buildUrl function:', typeof window.API_CONFIG.buildUrl);
    }
    console.log('');

    // 3. Check Database
    console.log('═══ 3. DATABASE CHECK ═══');
    console.log('window.db exists:', !!window.db);
    if (window.db) {
        try {
            const transactions = await window.db.getAll('transactions');
            console.log('Transactions in IndexedDB:', transactions.length);
            if (transactions.length > 0) {
                console.log('Sample transaction:', transactions[0]);
                // Calculate today's transactions
                const today = new Date().toISOString().split('T')[0];
                const todayTxns = transactions.filter(t =>
                    new Date(t.createdAt || t.date).toISOString().split('T')[0] === today
                );
                console.log('Transactions TODAY:', todayTxns.length);
                const todayRevenue = todayTxns.reduce((sum, t) => sum + (t.total || 0), 0);
                console.log('Revenue TODAY:', `₱${todayRevenue.toFixed(2)}`);
            }
        } catch (error) {
            console.error('Error reading transactions:', error);
        }
    }
    console.log('');

    // 4. Check HybridAPIClient
    console.log('═══ 4. HYBRID API CLIENT ═══');
    console.log('HybridAPIClient exists:', !!window.HybridAPIClient);
    if (window.HybridAPIClient) {
        console.log('Is Online:', window.HybridAPIClient.isOnline);
        try {
            console.log('Testing getTransactions()...');
            const result = await window.HybridAPIClient.getTransactions();
            console.log('Result:', result);
            if (result.success) {
                console.log('✅ Transactions loaded:', result.data.length);
            } else {
                console.error('❌ Failed to load transactions:', result.error);
            }
        } catch (error) {
            console.error('Error calling getTransactions():', error);
        }
    }
    console.log('');

    // 5. Check Dashboard Manager
    console.log('═══ 5. DASHBOARD MANAGER ═══');
    console.log('enhancedDashboardManager exists:', !!window.enhancedDashboardManager);
    if (window.enhancedDashboardManager) {
        console.log('Is Initialized:', window.enhancedDashboardManager.isInitialized);
        console.log('Current Stats:', window.enhancedDashboardManager.stats);
    }
    console.log('');

    // 6. Test Backend API
    console.log('═══ 6. BACKEND API TEST ═══');
    if (authToken) {
        try {
            console.log('Testing /api/business/stats...');
            const response = await fetch(window.API_CONFIG.buildUrl('/api/business/stats'), {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log('Response Status:', response.status, response.statusText);
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Backend Stats:', data);
            } else {
                const errorText = await response.text();
                console.error('❌ Backend Error:', errorText);
            }
        } catch (error) {
            console.error('Error calling backend:', error);
        }
    }
    console.log('');

    // 7. DOM Element Check
    console.log('═══ 7. DOM ELEMENTS ═══');
    const elements = ['todayRevenue', 'weeklyRevenue', 'monthlyRevenue', 'avgTransaction'];
    elements.forEach(id => {
        const el = document.getElementById(id);
        console.log(`${id}:`, el ? `exists (value: "${el.textContent}")` : 'NOT FOUND');
    });
    console.log('');

    // 8. Recommendations
    console.log('═══ 8. RECOMMENDATIONS ═══');
    if (!authToken) {
        console.warn('⚠️ Missing authentication token - login required');
    }
    if (!window.db) {
        console.warn('⚠️ Database not initialized');
    }
    if (window.enhancedDashboardManager && !window.enhancedDashboardManager.isInitialized) {
        console.warn('⚠️ Dashboard not initialized - run: await window.enhancedDashboardManager.init()');
    }

    console.log('\n✅ Diagnostic complete!');
}

// Run the diagnostic
diagnoseDashboard();
