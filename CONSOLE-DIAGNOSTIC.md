# Console Diagnostic Script

**Copy and paste this into your browser console (F12) to diagnose the issue:**

```javascript
// ============================================
// CUSTOMER SYNC DIAGNOSTIC SCRIPT
// ============================================

console.log('🔍 Starting Customer Sync Diagnostic...\n');

// Test 1: Check HybridAPIClient
console.log('✅ Test 1: HybridAPIClient');
console.log('  Available:', !!window.HybridAPIClient);
console.log('  Online Status:', window.HybridAPIClient?.isOnline);
console.log('');

// Test 2: Check Auth
console.log('✅ Test 2: Authentication');
const token = localStorage.getItem('authToken');
console.log('  Token Present:', !!token);
if (token) {
    console.log('  Token Length:', token.length);
    console.log('  Token Preview:', token.substring(0, 30) + '...');
}
console.log('');

// Test 3: Check Backend URL
console.log('✅ Test 3: Backend Configuration');
const backendURL = window.API_CONFIG?.BASE_URL || 'https://daetspa-backend.onrender.com';
console.log('  Backend URL:', backendURL);
console.log('');

// Test 4: Test Backend Connection
console.log('✅ Test 4: Backend Connection Test');
fetch(backendURL + '/health')
    .then(r => r.json())
    .then(data => {
        console.log('  Backend Status:', data.status);
        console.log('  Environment:', data.environment);
        console.log('  Uptime:', Math.floor(data.uptime), 'seconds');
        console.log('');

        // Test 5: Check IndexedDB Customers
        console.log('✅ Test 5: IndexedDB Customers');
        return window.db.getAll('customers');
    })
    .then(customers => {
        console.log('  IndexedDB Count:', customers.length);
        customers.forEach((c, i) => {
            console.log(`  Customer ${i+1}:`, c.firstName, c.lastName, '- Sync:', c.syncStatus);
        });
        console.log('');

        // Test 6: Check MongoDB Customers via API
        console.log('✅ Test 6: MongoDB Customers (via API)');
        return window.HybridAPIClient.get('/api/customers');
    })
    .then(result => {
        console.log('  API Success:', result.success);
        console.log('  Source:', result.source);
        console.log('  MongoDB Count:', result.data?.length || 0);

        if (result.data && result.data.length > 0) {
            result.data.forEach((c, i) => {
                console.log(`  Customer ${i+1}:`, c.firstName, c.lastName, '- ID:', c._id);
            });
        } else {
            console.log('  ⚠️ NO CUSTOMERS IN MONGODB!');
        }
        console.log('');

        // Test 7: Try to save a test customer
        console.log('✅ Test 7: Test Customer Save');
        const testCustomer = {
            firstName: 'DiagnosticTest',
            lastName: 'Customer',
            phone: '09888888888',
            email: 'diagnostic@test.com'
        };

        console.log('  Attempting to save:', testCustomer);
        return window.HybridAPIClient.post('/api/customers', testCustomer);
    })
    .then(result => {
        console.log('\n📊 SAVE TEST RESULT:');
        console.log('  Success:', result.success);
        console.log('  Source:', result.source);
        console.log('  Error:', result.error);

        if (result.success) {
            console.log('  ✅ CUSTOMER SAVED TO MONGODB!');
            console.log('  Customer ID:', result.data._id || result.data.id);
        } else {
            console.log('  ❌ SAVE FAILED!');
            console.log('  Error:', result.error);
            console.log('  Queued:', result.queued);
        }
        console.log('');

        // Final diagnosis
        console.log('🎯 DIAGNOSIS:');
        if (result.success && result.source === 'mongodb') {
            console.log('  ✅ Backend is working correctly');
            console.log('  ✅ Customers should sync cross-device');
            console.log('  ⚠️ If customers still disappear on refresh:');
            console.log('     - Check if loadCustomers() is being called');
            console.log('     - Check if HybridAPIClient.get() is working');
        } else if (result.error?.includes('Missing required fields: name')) {
            console.log('  ❌ BACKEND NOT RESTARTED!');
            console.log('  ❌ Backend still expects "name" field');
            console.log('  🔧 FIX: Restart backend server with new code');
        } else if (result.queued) {
            console.log('  ⚠️ Request was queued (offline or backend unreachable)');
            console.log('  🔧 FIX: Check backend URL and connection');
        } else {
            console.log('  ❌ Unknown error occurred');
            console.log('  🔧 FIX: Check console for errors');
        }
    })
    .catch(error => {
        console.error('❌ Diagnostic Error:', error.message);
        console.error('Stack:', error.stack);
    });
```

---

## How to Use:

1. **Open your PWA** (the customer page where you're logged in)
2. **Press F12** to open Developer Tools
3. **Click "Console" tab**
4. **Copy the entire script above**
5. **Paste into console and press Enter**
6. **Wait 5 seconds for all tests to complete**
7. **Copy ALL the output and send it to me**

---

## What This Will Tell Us:

1. ✅ If HybridAPIClient is loaded
2. ✅ If authentication is working
3. ✅ If backend is reachable
4. ✅ How many customers are in IndexedDB (local)
5. ✅ How many customers are in MongoDB (server)
6. ✅ If a test save succeeds
7. ✅ Exact error message if save fails

---

## Expected Results:

### If Backend is Restarted (GOOD):
```
Test 7: Test Customer Save
  Attempting to save: {firstName: 'DiagnosticTest', ...}

SAVE TEST RESULT:
  Success: true
  Source: mongodb
  ✅ CUSTOMER SAVED TO MONGODB!
  Customer ID: 67316c9a...
```

### If Backend NOT Restarted (BAD):
```
Test 7: Test Customer Save
  Attempting to save: {firstName: 'DiagnosticTest', ...}

SAVE TEST RESULT:
  Success: false
  Error: Missing required fields: name
  ❌ SAVE FAILED!

DIAGNOSIS:
  ❌ BACKEND NOT RESTARTED!
  ❌ Backend still expects "name" field
  🔧 FIX: Restart backend server with new code
```

---

**Please run this script and send me the full console output!**
