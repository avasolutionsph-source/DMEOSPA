import mongoose from 'mongoose';
import './config/database.js';
import Employee from './models/Employee.js';
import Transaction from './models/Transaction.js';
import User from './models/User.js';
import employeeStatsManager from './utils/employeeStatsManager.js';

/**
 * Data validation script to identify orphaned transactions and employee sync issues
 */
async function validateEmployeeData() {
    try {
        console.log('🔍 Starting employee data validation...');
        
        // Get all users to validate
        const users = await User.find({});
        console.log(`📊 Found ${users.length} users to validate`);
        
        for (const user of users) {
            console.log(`\n👤 Validating user: ${user.email} (${user._id})`);
            
            // Get all employees for this user
            const employees = await Employee.find({ userId: user._id.toString() });
            console.log(`   📋 Found ${employees.length} employees`);
            
            // Get all transactions for this user
            const transactions = await Transaction.find({ userId: user._id.toString() });
            console.log(`   📋 Found ${transactions.length} transactions`);
            
            // Check for orphaned transactions (transactions with employee references that don't exist)
            let orphanedTransactions = 0;
            let fixableTransactions = 0;
            
            for (const transaction of transactions) {
                const employeeId = employeeStatsManager.extractEmployeeId(transaction);
                
                if (employeeId) {
                    // Try to find the employee using the stats manager's logic
                    const employee = await employeeStatsManager.findEmployee(employeeId, user._id.toString());
                    
                    if (!employee) {
                        orphanedTransactions++;
                        console.log(`   ❌ ORPHANED: Transaction ${transaction.id} references non-existent employee ${employeeId}`);
                        
                        // Check if we can find the employee by name or other attributes
                        const employeeName = transaction.employee?.name || transaction.employee?.firstName;
                        if (employeeName) {
                            const possibleMatches = employees.filter(emp => 
                                (emp.firstName && emp.firstName.toLowerCase().includes(employeeName.toLowerCase())) ||
                                (emp.lastName && emp.lastName.toLowerCase().includes(employeeName.toLowerCase())) ||
                                (emp.fullName && emp.fullName.toLowerCase().includes(employeeName.toLowerCase()))
                            );
                            
                            if (possibleMatches.length === 1) {
                                console.log(`   🔧 FIXABLE: Could match to employee ${possibleMatches[0].firstName} ${possibleMatches[0].lastName} (${possibleMatches[0]._id})`);
                                fixableTransactions++;
                            } else if (possibleMatches.length > 1) {
                                console.log(`   ⚠️ AMBIGUOUS: Multiple possible matches for "${employeeName}":`, possibleMatches.map(e => `${e.firstName} ${e.lastName}`));
                            }
                        }
                    }
                }
            }
            
            // Calculate current stats
            let totalCalculatedSales = 0;
            let totalCalculatedCommission = 0;
            let totalCalculatedTransactions = 0;
            
            for (const employee of employees) {
                // Get transactions that should belong to this employee
                const employeeTransactions = transactions.filter(t => {
                    const transactionEmployeeId = employeeStatsManager.extractEmployeeId(t);
                    return transactionEmployeeId === employee.localId || 
                           transactionEmployeeId === employee._id.toString();
                });
                
                const calculatedSales = employeeTransactions.reduce((sum, t) => sum + (t.total || 0), 0);
                const calculatedCommission = calculatedSales * ((employee.commissionRate || 0) / 100);
                const calculatedTransactions = employeeTransactions.length;
                
                totalCalculatedSales += calculatedSales;
                totalCalculatedCommission += calculatedCommission;
                totalCalculatedTransactions += calculatedTransactions;
                
                console.log(`   👨‍💼 ${employee.firstName} ${employee.lastName}:`);
                console.log(`      Stored: ₱${employee.totalSales || 0} sales, ${employee.totalTransactions || 0} transactions`);
                console.log(`      Calculated: ₱${calculatedSales} sales, ${calculatedTransactions} transactions`);
                
                if (Math.abs((employee.totalSales || 0) - calculatedSales) > 0.01) {
                    console.log(`      ❌ MISMATCH: Sales difference of ₱${Math.abs((employee.totalSales || 0) - calculatedSales)}`);
                }
                
                if ((employee.totalTransactions || 0) !== calculatedTransactions) {
                    console.log(`      ❌ MISMATCH: Transaction count difference of ${Math.abs((employee.totalTransactions || 0) - calculatedTransactions)}`);
                }
            }
            
            // Summary for this user
            console.log(`\n📊 Summary for ${user.email}:`);
            console.log(`   Total Employees: ${employees.length}`);
            console.log(`   Total Transactions: ${transactions.length}`);
            console.log(`   Orphaned Transactions: ${orphanedTransactions}`);
            console.log(`   Fixable Transactions: ${fixableTransactions}`);
            console.log(`   Total Calculated Sales: ₱${totalCalculatedSales}`);
            console.log(`   Total Calculated Transactions: ${totalCalculatedTransactions}`);
            
            if (orphanedTransactions > 0) {
                console.log(`   🔧 RECOMMENDATION: Run data repair utilities for user ${user._id}`);
            }
        }
        
        console.log('\n✅ Employee data validation completed');
        
    } catch (error) {
        console.error('❌ Error during validation:', error);
    } finally {
        mongoose.connection.close();
    }
}

// Run validation
validateEmployeeData();