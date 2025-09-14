import Employee from './models/Employee.js';
import Transaction from './models/Transaction.js';
import employeeStatsManager from './utils/employeeStatsManager.js';

/**
 * Repair data for specific user identified from logs
 */
async function repairUserData() {
    try {
        // User identified from logs: pak@gmail.com
        const userId = '68c36e5acb1b1c0fdc0563dd';
        const orphanedEmployeeId = '68c4d92134bf500345a7d9a6'; // SDASDA N/A
        
        console.log('🔧 Starting data repair for user:', userId);
        console.log('🔧 Orphaned employee ID:', orphanedEmployeeId);
        
        // Step 1: Check current state
        console.log('\n📊 CURRENT STATE:');
        
        const employees = await Employee.find({ userId });
        console.log(`   Employees in database: ${employees.length}`);
        employees.forEach(emp => {
            console.log(`   - ${emp.firstName} ${emp.lastName} (${emp._id}) - Sales: ₱${emp.totalSales || 0}, Transactions: ${emp.totalTransactions || 0}`);
        });
        
        const transactions = await Transaction.find({ userId });
        console.log(`   Transactions in database: ${transactions.length}`);
        
        // Check for the specific orphaned transaction
        const orphanedTransactions = transactions.filter(t => {
            const empId = employeeStatsManager.extractEmployeeId(t);
            return empId === orphanedEmployeeId;
        });
        
        console.log(`   Orphaned transactions (referencing ${orphanedEmployeeId}): ${orphanedTransactions.length}`);
        orphanedTransactions.forEach(t => {
            console.log(`   - Transaction ${t.id || t._id}: ₱${t.total} on ${t.date || t.createdAt}`);
        });
        
        // Step 2: Try to find matching employees by name
        console.log('\n🔍 FINDING MATCHING EMPLOYEES:');
        
        if (orphanedTransactions.length > 0) {
            const orphanedTransaction = orphanedTransactions[0];
            const employeeName = orphanedTransaction.employee?.name || 'Unknown';
            console.log(`   Looking for employee matching name: "${employeeName}"`);
            
            // Split name and try to match
            const nameParts = employeeName.split(' ').filter(part => part !== 'N/A' && part.trim());
            console.log(`   Name parts: ${JSON.stringify(nameParts)}`);
            
            let matchingEmployee = null;
            
            if (nameParts.length > 0) {
                // Try to find employee by name parts
                for (const employee of employees) {
                    const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.toLowerCase();
                    const hasMatch = nameParts.some(part => 
                        fullName.includes(part.toLowerCase()) && part.length > 1
                    );
                    
                    if (hasMatch) {
                        matchingEmployee = employee;
                        console.log(`   ✅ FOUND MATCH: ${employee.firstName} ${employee.lastName} (${employee._id})`);
                        break;
                    }
                }
            }
            
            if (matchingEmployee) {
                // Step 3: Update orphaned transactions to point to correct employee
                console.log('\n🔧 UPDATING ORPHANED TRANSACTIONS:');
                
                for (const transaction of orphanedTransactions) {
                    console.log(`   Updating transaction ${transaction.id || transaction._id}...`);
                    
                    // Update the transaction to reference the correct employee
                    await Transaction.findByIdAndUpdate(transaction._id, {
                        'employee.id': matchingEmployee._id.toString(),
                        'employee.name': `${matchingEmployee.firstName} ${matchingEmployee.lastName}`,
                        employeeId: matchingEmployee._id.toString(),
                        syncStatus: 'pending' // Mark for re-sync
                    });
                    
                    console.log(`   ✅ Updated transaction to reference ${matchingEmployee.firstName} ${matchingEmployee.lastName}`);
                }
                
                console.log(`✅ Updated ${orphanedTransactions.length} orphaned transactions`);
            } else {
                console.log('   ❌ No matching employee found');
                
                // If no match found, we might need to create a placeholder employee or handle differently
                console.log('\n🔧 CREATING PLACEHOLDER EMPLOYEE:');
                
                const placeholderEmployee = new Employee({
                    userId,
                    firstName: nameParts[0] || 'Unknown',
                    lastName: nameParts.slice(1).join(' ') || 'Employee',
                    email: '',
                    phone: '',
                    position: 'Staff',
                    hireDate: new Date(),
                    commissionRate: 0,
                    isActive: true,
                    syncStatus: 'pending',
                    localId: orphanedEmployeeId, // Use the orphaned ID as localId for reference
                    totalSales: 0,
                    totalCommission: 0,
                    totalTransactions: 0
                });
                
                await placeholderEmployee.save();
                console.log(`✅ Created placeholder employee: ${placeholderEmployee.firstName} ${placeholderEmployee.lastName} (${placeholderEmployee._id})`);
                
                // Update transactions to reference the placeholder
                for (const transaction of orphanedTransactions) {
                    await Transaction.findByIdAndUpdate(transaction._id, {
                        'employee.id': placeholderEmployee._id.toString(),
                        'employee.name': `${placeholderEmployee.firstName} ${placeholderEmployee.lastName}`,
                        employeeId: placeholderEmployee._id.toString(),
                        syncStatus: 'pending'
                    });
                }
                
                matchingEmployee = placeholderEmployee;
            }
        }
        
        // Step 4: Recalculate employee stats
        console.log('\n🔧 RECALCULATING EMPLOYEE STATS:');
        
        const repairedCount = await employeeStatsManager.recalculateEmployeeStats(userId);
        console.log(`✅ Recalculated stats for ${repairedCount} employees`);
        
        // Step 5: Verify repair
        console.log('\n📊 VERIFICATION:');
        
        const updatedEmployees = await Employee.find({ userId });
        console.log(`   Updated employees: ${updatedEmployees.length}`);
        
        updatedEmployees.forEach(emp => {
            console.log(`   - ${emp.firstName} ${emp.lastName} (${emp._id})`);
            console.log(`     Sales: ₱${emp.totalSales || 0}, Transactions: ${emp.totalTransactions || 0}`);
        });
        
        const remainingOrphanedTransactions = await Transaction.find({
            userId,
            $or: [
                { 'employee.id': orphanedEmployeeId },
                { employeeId: orphanedEmployeeId }
            ]
        });
        
        console.log(`   Remaining orphaned transactions: ${remainingOrphanedTransactions.length}`);
        
        if (remainingOrphanedTransactions.length === 0) {
            console.log('✅ SUCCESS: All orphaned transactions have been resolved!');
        } else {
            console.log('⚠️ WARNING: Some orphaned transactions remain');
        }
        
        console.log('\n🎉 Data repair completed!');
        
    } catch (error) {
        console.error('❌ Error during data repair:', error);
    }
}

// Run repair if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    repairUserData()
        .then(() => {
            console.log('✅ Repair process completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Repair process failed:', error);
            process.exit(1);
        });
}

export default repairUserData;