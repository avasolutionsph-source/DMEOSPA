import Employee from './models/Employee.js';
import Transaction from './models/Transaction.js';
import User from './models/User.js';
import employeeStatsManager from './utils/employeeStatsManager.js';
import duplicateEmployeeCleanup from './utils/duplicateEmployeeCleanup.js';

/**
 * Fix all transaction employee references across the system
 */
async function fixTransactionEmployeeReferences() {
    try {
        console.log('🔧 [TRANSACTION-FIX] Starting transaction employee reference repair...');
        
        // Get all users to process
        const users = await User.find({});
        console.log(`👤 [TRANSACTION-FIX] Processing ${users.length} users...`);
        
        let totalUsersProcessed = 0;
        let totalTransactionsFixed = 0;
        let totalDuplicatesCleaned = 0;
        
        for (const user of users) {
            const userId = user._id.toString();
            console.log(`\n🔄 [TRANSACTION-FIX] Processing user: ${user.email} (${userId})`);
            
            try {
                // Step 1: Clean up duplicate employees first
                console.log(`   🧹 Cleaning up duplicate employees...`);
                const cleanupResults = await duplicateEmployeeCleanup.performCompleteCleanup(userId);
                console.log(`   ✅ Cleaned ${cleanupResults.duplicatesMerged} duplicate employees`);
                totalDuplicatesCleaned += cleanupResults.duplicatesMerged || 0;
                
                // Step 2: Get all employees and transactions
                const employees = await Employee.find({ userId });
                const transactions = await Transaction.find({ userId });
                
                console.log(`   📊 Found ${employees.length} employees and ${transactions.length} transactions`);
                
                // Step 3: Fix transaction employee references
                let userTransactionsFixed = 0;
                const employeeMap = new Map();
                
                // Create employee lookup maps
                employees.forEach(emp => {
                    employeeMap.set(emp._id.toString(), emp);
                    if (emp.localId) {
                        employeeMap.set(emp.localId, emp);
                    }
                });
                
                for (const transaction of transactions) {
                    let needsUpdate = false;
                    const updates = {};
                    
                    // Extract current employee references
                    const currentEmployeeId = employeeStatsManager.extractEmployeeId(transaction);
                    
                    if (currentEmployeeId) {
                        // Try to find the actual employee
                        let correctEmployee = null;
                        
                        // First try exact matches
                        correctEmployee = employeeMap.get(currentEmployeeId);
                        
                        if (!correctEmployee) {
                            // Try to find by name if ID lookup fails
                            const transactionEmployeeName = transaction.employee?.name;
                            if (transactionEmployeeName) {
                                correctEmployee = employees.find(emp => {
                                    const empName = `${emp.firstName} ${emp.lastName}`;
                                    return empName.toLowerCase() === transactionEmployeeName.toLowerCase();
                                });
                            }
                        }
                        
                        if (correctEmployee) {
                            // Update transaction with correct employee reference
                            if (transaction.employee) {
                                if (transaction.employee.id !== correctEmployee._id.toString()) {
                                    updates['employee.id'] = correctEmployee._id.toString();
                                    updates['employee.backendId'] = correctEmployee._id.toString();
                                    needsUpdate = true;
                                }
                                
                                const correctName = `${correctEmployee.firstName} ${correctEmployee.lastName}`;
                                if (transaction.employee.name !== correctName) {
                                    updates['employee.name'] = correctName;
                                    needsUpdate = true;
                                }
                            }
                            
                            if (transaction.employeeId && transaction.employeeId !== correctEmployee._id.toString()) {
                                updates.employeeId = correctEmployee._id.toString();
                                needsUpdate = true;
                            }
                        } else {
                            // Employee not found - mark as orphaned
                            console.log(`   ⚠️ Orphaned transaction: ${transaction.id || transaction._id} references unknown employee ${currentEmployeeId}`);
                            updates.syncStatus = 'error';
                            updates.errorMessage = `Employee reference not found: ${currentEmployeeId}`;
                            needsUpdate = true;
                        }
                    }
                    
                    // Apply updates if needed
                    if (needsUpdate) {
                        updates.syncStatus = updates.syncStatus || 'pending';
                        updates.lastSyncDate = new Date();
                        
                        await Transaction.findByIdAndUpdate(transaction._id, updates);
                        userTransactionsFixed++;
                        
                        console.log(`   🔧 Fixed transaction ${transaction.id || transaction._id}: updated employee reference`);
                    }
                }
                
                // Step 4: Recalculate employee stats
                console.log(`   📊 Recalculating employee statistics...`);
                const repairedStatsCount = await employeeStatsManager.recalculateEmployeeStats(userId);
                
                console.log(`   ✅ User ${user.email} completed:`);
                console.log(`      - Fixed ${userTransactionsFixed} transaction references`);
                console.log(`      - Recalculated stats for ${repairedStatsCount} employees`);
                console.log(`      - Cleaned ${cleanupResults.duplicatesMerged || 0} duplicate employees`);
                
                totalTransactionsFixed += userTransactionsFixed;
                totalUsersProcessed++;
                
            } catch (userError) {
                console.error(`   ❌ Error processing user ${user.email}:`, userError);
            }
        }
        
        console.log('\n🎉 [TRANSACTION-FIX] Repair completed successfully!');
        console.log(`📊 Summary:`);
        console.log(`   Users Processed: ${totalUsersProcessed}/${users.length}`);
        console.log(`   Transactions Fixed: ${totalTransactionsFixed}`);
        console.log(`   Duplicate Employees Cleaned: ${totalDuplicatesCleaned}`);
        console.log(`   Completed: ${new Date()}`);
        
        return {
            usersProcessed: totalUsersProcessed,
            totalUsers: users.length,
            transactionsFixed: totalTransactionsFixed,
            duplicatesCleaned: totalDuplicatesCleaned,
            success: true,
            completedAt: new Date()
        };
        
    } catch (error) {
        console.error('❌ [TRANSACTION-FIX] Repair failed:', error);
        throw error;
    }
}

// Run repair if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    fixTransactionEmployeeReferences()
        .then((results) => {
            console.log('✅ Transaction employee reference repair completed:', results);
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Transaction employee reference repair failed:', error);
            process.exit(1);
        });
}

export default fixTransactionEmployeeReferences;