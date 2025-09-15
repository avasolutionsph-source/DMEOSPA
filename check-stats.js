const fetch = require('node-fetch');

async function checkStats() {
    // Login
    const loginRes = await fetch('http://localhost:4001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'pak@gmail.com',
            password: '123123'
        })
    });
    
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('Logged in, token:', token.substring(0, 20) + '...');
    
    // Get employees
    const empRes = await fetch('http://localhost:4001/api/employees', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const empData = await empRes.json();
    console.log('\nEmployees:');
    empData.data.forEach(emp => {
        console.log(`- ${emp.firstName} ${emp.lastName}`);
        console.log(`  ID: ${emp._id}`);
        console.log(`  localId: ${emp.localId}`);
        console.log(`  Total Sales: ₱${emp.totalSales || 0}`);
        console.log(`  Total Commission: ₱${emp.totalCommission || 0}`);
        console.log(`  Total Transactions: ${emp.totalTransactions || 0}`);
        console.log('');
    });
    
    // Create a test transaction
    const transactionData = {
        items: [{
            productId: 'test-service-003',
            name: 'Test Service 3',
            category: 'Service',
            price: 750,
            quantity: 1,
            subtotal: 750
        }],
        subtotal: 750,
        total: 750,
        paymentMethod: 'cash',
        paymentStatus: 'completed',
        employeeId: empData.data[0]._id,
        employeeName: `${empData.data[0].firstName} ${empData.data[0].lastName}`,
        employee: {
            id: empData.data[0]._id,
            name: `${empData.data[0].firstName} ${empData.data[0].lastName}`,
            position: empData.data[0].position
        },
        status: 'completed',
        localId: Date.now().toString()
    };
    
    console.log('\nCreating transaction with employee:', transactionData.employee);
    
    const transRes = await fetch('http://localhost:4001/api/transactions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(transactionData)
    });
    
    const transResult = await transRes.json();
    console.log('\nTransaction result:', transResult.success ? 'SUCCESS' : 'FAILED');
    if (!transResult.success) {
        console.log('Error:', transResult.error);
    }
    
    // Wait a bit for async processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check employee stats again
    const empRes2 = await fetch(`http://localhost:4001/api/employees/${empData.data[0]._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const empData2 = await empRes2.json();
    const emp = empData2.data;
    console.log('\nUpdated Employee Stats:');
    console.log(`- ${emp.firstName} ${emp.lastName}`);
    console.log(`  Total Sales: ₱${emp.totalSales || 0}`);
    console.log(`  Total Commission: ₱${emp.totalCommission || 0}`);
    console.log(`  Total Transactions: ${emp.totalTransactions || 0}`);
    
    if ((emp.totalTransactions || 0) > (empData.data[0].totalTransactions || 0)) {
        console.log('\n✅ STATS UPDATED SUCCESSFULLY!');
    } else {
        console.log('\n❌ STATS DID NOT UPDATE');
    }
}

checkStats().catch(console.error);