import Employee from './models/Employee.js';
import Transaction from './models/Transaction.js';
import User from './models/User.js';
import employeeStatsManager from './utils/employeeStatsManager.js';

/**
 * Test script to validate employee data directly
 */
async function testDataValidation() {
    try {
        console.log('🔍 Testing employee data validation...');
        
        // Get the first user to test with
        const user = await User.findOne({});
        if (!user) {
            console.log('❌ No users found in database');
            return;
        }
        
        const userId = user._id.toString();
        console.log(`👤 Testing with user: ${user.email} (${userId})`);
        
        // Get all employees for this user
        const employees = await Employee.find({ userId });
        console.log(`📋 Found ${employees.length} employees`);
        
        // Get all transactions for this user
        const transactions = await Transaction.find({ userId });
        console.log(`📋 Found ${transactions.length} transactions`);
        
        // Check for orphaned transactions
        let orphanedCount = 0;
        let totalIssues = 0;
        
        console.log('\n🔍 Checking for orphaned transactions...');
        for (const transaction of transactions) {
            const employeeId = employeeStatsManager.extractEmployeeId(transaction);
            
            if (employeeId) {
                const employee = await employeeStatsManager.findEmployee(employeeId, userId);
                
                if (!employee) {
                    orphanedCount++;
                    console.log(`❌ ORPHANED: Transaction ${transaction.id || transaction._id} (₱${transaction.total}) references missing employee ${employeeId}`);
                    console.log(`   Employee Name: ${transaction.employee?.name || 'Unknown'}`);
                    console.log(`   Date: ${transaction.date || transaction.createdAt}`);
                }
            }
        }
        
        console.log('\n📊 Checking employee statistics...');
        for (const employee of employees) {
            // Find transactions for this employee
            const employeeTransactions = transactions.filter(t => {
                const transactionEmployeeId = employeeStatsManager.extractEmployeeId(t);
                return transactionEmployeeId === employee.localId || 
                       transactionEmployeeId === employee._id.toString();
            });
            
            const calculatedSales = employeeTransactions.reduce((sum, t) => sum + (t.total || 0), 0);
            const calculatedTransactions = employeeTransactions.length;
            
            const storedSales = employee.totalSales || 0;
            const storedTransactions = employee.totalTransactions || 0;
            
            const salesMismatch = Math.abs(storedSales - calculatedSales) > 0.01;
            const transactionMismatch = storedTransactions !== calculatedTransactions;
            
            if (salesMismatch || transactionMismatch) {
                totalIssues++;
                console.log(`❌ MISMATCH: ${employee.firstName} ${employee.lastName}`);
                console.log(`   Stored: ₱${storedSales} sales, ${storedTransactions} transactions`);
                console.log(`   Calculated: ₱${calculatedSales} sales, ${calculatedTransactions} transactions`);
                
                if (salesMismatch) {
                    console.log(`   ❌ Sales difference: ₱${Math.abs(storedSales - calculatedSales)}`);
                }
                if (transactionMismatch) {
                    console.log(`   ❌ Transaction count difference: ${Math.abs(storedTransactions - calculatedTransactions)}`);
                }
            } else {
                console.log(`✅ OK: ${employee.firstName} ${employee.lastName} - ₱${storedSales}, ${storedTransactions} transactions`);
            }
        }
        
        console.log('\n📊 SUMMARY:');
        console.log(`   Users: 1`);
        console.log(`   Employees: ${employees.length}`);
        console.log(`   Transactions: ${transactions.length}`);
        console.log(`   Orphaned Transactions: ${orphanedCount}`);
        console.log(`   Employees with Stat Issues: ${totalIssues}`);
        
        if (orphanedCount > 0 || totalIssues > 0) {
            console.log('\n🔧 RECOMMENDATIONS:');
            if (orphanedCount > 0) {
                console.log(`   - Run employee ID mapping repair for ${orphanedCount} orphaned transactions`);
            }
            if (totalIssues > 0) {
                console.log(`   - Run employee stats recalculation for ${totalIssues} employees`);
            }
            
            console.log('\n🔧 RUNNING AUTOMATIC REPAIR...');
            
            // Run automatic repair
            const repairedCount = await employeeStatsManager.recalculateEmployeeStats(userId);
            console.log(`✅ Repaired statistics for ${repairedCount} employees`);
            
            console.log('\n🔍 RE-CHECKING AFTER REPAIR...');
            let remainingIssues = 0;
            
            // Re-check employees after repair
            const updatedEmployees = await Employee.find({ userId });
            for (const employee of updatedEmployees) {
                const employeeTransactions = transactions.filter(t => {
                    const transactionEmployeeId = employeeStatsManager.extractEmployeeId(t);
                    return transactionEmployeeId === employee.localId || 
                           transactionEmployeeId === employee._id.toString();
                });
                
                const calculatedSales = employeeTransactions.reduce((sum, t) => sum + (t.total || 0), 0);
                const calculatedTransactions = employeeTransactions.length;
                
                const storedSales = employee.totalSales || 0;
                const storedTransactions = employee.totalTransactions || 0;
                
                const salesMismatch = Math.abs(storedSales - calculatedSales) > 0.01;
                const transactionMismatch = storedTransactions !== calculatedTransactions;
                
                if (salesMismatch || transactionMismatch) {
                    remainingIssues++;
                    console.log(`❌ STILL BROKEN: ${employee.firstName} ${employee.lastName}`);
                } else {
                    console.log(`✅ FIXED: ${employee.firstName} ${employee.lastName} - ₱${storedSales}, ${storedTransactions} transactions`);
                }
            }
            
            console.log(`\n📊 REPAIR RESULTS: ${totalIssues - remainingIssues}/${totalIssues} issues fixed`);
            
            if (remainingIssues > 0) {
                console.log(`⚠️ ${remainingIssues} issues remain - these may be orphaned transactions that need ID mapping`);
            }
        } else {
            console.log('\n✅ All employee data is consistent!');
        }
        
    } catch (error) {
        console.error('❌ Error during validation:', error);
    }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testDataValidation()
        .then(() => {
            console.log('\n✅ Test completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Test failed:', error);
            process.exit(1);
        });
}

export default testDataValidation;