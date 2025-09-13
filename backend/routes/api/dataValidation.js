import express from 'express';
import { authenticateJWT } from '../../middleware/auth.js';
import Employee from '../../models/Employee.js';
import Transaction from '../../models/Transaction.js';
import User from '../../models/User.js';
import employeeStatsManager from '../../utils/employeeStatsManager.js';
import duplicateEmployeeCleanup from '../../utils/duplicateEmployeeCleanup.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// Apply authentication to all data validation routes
router.use(authenticateJWT);

// GET /api/data-validation/employee-stats - Validate and fix employee data
router.get('/employee-stats', async (req, res) => {
    try {
        const userId = req.userId || req.user?.userId || req.user?.id;
        
        console.log(`🔍 [DATA-VALIDATION] Starting employee data validation for user ${userId}...`);
        
        // Get all employees for this user
        const employees = await Employee.find({ userId: userId.toString() });
        console.log(`📋 [DATA-VALIDATION] Found ${employees.length} employees`);
        
        // Get all transactions for this user
        const transactions = await Transaction.find({ userId: userId.toString() });
        console.log(`📋 [DATA-VALIDATION] Found ${transactions.length} transactions`);
        
        // Check for orphaned transactions
        const validationResults = {
            userId,
            totalEmployees: employees.length,
            totalTransactions: transactions.length,
            orphanedTransactions: [],
            employeeStats: [],
            recommendations: []
        };
        
        for (const transaction of transactions) {
            const employeeId = employeeStatsManager.extractEmployeeId(transaction);
            
            if (employeeId) {
                const employee = await employeeStatsManager.findEmployee(employeeId, userId.toString());
                
                if (!employee) {
                    validationResults.orphanedTransactions.push({
                        transactionId: transaction.id,
                        employeeId,
                        amount: transaction.total,
                        date: transaction.date || transaction.createdAt,
                        employeeName: transaction.employee?.name || 'Unknown'
                    });
                    
                    console.log(`❌ [DATA-VALIDATION] ORPHANED: Transaction ${transaction.id} references non-existent employee ${employeeId}`);
                }
            }
        }
        
        // Calculate stats for each employee
        for (const employee of employees) {
            const employeeTransactions = transactions.filter(t => {
                const transactionEmployeeId = employeeStatsManager.extractEmployeeId(t);
                return transactionEmployeeId === employee.localId || 
                       transactionEmployeeId === employee._id.toString();
            });
            
            const calculatedSales = employeeTransactions.reduce((sum, t) => sum + (t.total || 0), 0);
            const calculatedCommission = calculatedSales * ((employee.commissionRate || 0) / 100);
            const calculatedTransactions = employeeTransactions.length;
            
            const salesMismatch = Math.abs((employee.totalSales || 0) - calculatedSales) > 0.01;
            const transactionMismatch = (employee.totalTransactions || 0) !== calculatedTransactions;
            
            validationResults.employeeStats.push({
                employeeId: employee._id,
                name: `${employee.firstName} ${employee.lastName}`,
                stored: {
                    sales: employee.totalSales || 0,
                    commission: employee.totalCommission || 0,
                    transactions: employee.totalTransactions || 0
                },
                calculated: {
                    sales: calculatedSales,
                    commission: calculatedCommission,
                    transactions: calculatedTransactions
                },
                mismatches: {
                    sales: salesMismatch,
                    transactions: transactionMismatch
                }
            });
            
            if (salesMismatch || transactionMismatch) {
                console.log(`❌ [DATA-VALIDATION] MISMATCH: ${employee.firstName} ${employee.lastName} has data inconsistencies`);
            }
        }
        
        // Generate recommendations
        if (validationResults.orphanedTransactions.length > 0) {
            validationResults.recommendations.push({
                type: 'orphaned_transactions',
                message: `Found ${validationResults.orphanedTransactions.length} orphaned transactions that need employee ID mapping`,
                action: 'Run employee ID repair utility'
            });
        }
        
        const employeesWithMismatches = validationResults.employeeStats.filter(emp => 
            emp.mismatches.sales || emp.mismatches.transactions
        );
        
        if (employeesWithMismatches.length > 0) {
            validationResults.recommendations.push({
                type: 'stat_mismatches',
                message: `Found ${employeesWithMismatches.length} employees with incorrect statistics`,
                action: 'Run employee stats recalculation'
            });
        }
        
        console.log(`✅ [DATA-VALIDATION] Validation completed for user ${userId}`);
        console.log(`   Orphaned Transactions: ${validationResults.orphanedTransactions.length}`);
        console.log(`   Employees with Mismatches: ${employeesWithMismatches.length}`);
        
        res.json({
            success: true,
            data: validationResults
        });
        
    } catch (error) {
        logger.error('Data validation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to validate employee data'
        });
    }
});

// POST /api/data-validation/repair-employee-stats - Repair employee statistics
router.post('/repair-employee-stats', async (req, res) => {
    try {
        const userId = req.userId || req.user?.userId || req.user?.id;
        const { employeeId } = req.body; // Optional: repair specific employee
        
        console.log(`🔧 [DATA-REPAIR] Starting employee stats repair for user ${userId}...`);
        
        const repairedCount = await employeeStatsManager.recalculateEmployeeStats(
            userId.toString(), 
            employeeId || null
        );
        
        console.log(`✅ [DATA-REPAIR] Repaired stats for ${repairedCount} employees`);
        
        res.json({
            success: true,
            message: `Successfully repaired statistics for ${repairedCount} employees`,
            data: { repairedEmployees: repairedCount }
        });
        
    } catch (error) {
        logger.error('Employee stats repair error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to repair employee statistics'
        });
    }
});

// GET /api/data-validation/duplicate-employees - Find employee duplicates
router.get('/duplicate-employees', async (req, res) => {
    try {
        const userId = req.userId || req.user?.userId || req.user?.id;
        
        console.log(`🔍 [DATA-VALIDATION] Finding duplicate employees for user ${userId}...`);
        
        const duplicateAnalysis = await duplicateEmployeeCleanup.findDuplicateEmployees(userId);
        
        console.log(`✅ [DATA-VALIDATION] Duplicate analysis completed for user ${userId}`);
        console.log(`   Total Employees: ${duplicateAnalysis.totalEmployees}`);
        console.log(`   Duplicate Groups: ${duplicateAnalysis.duplicateGroups.length}`);
        console.log(`   Total Duplicates: ${duplicateAnalysis.totalDuplicates}`);
        
        res.json({
            success: true,
            data: duplicateAnalysis
        });
        
    } catch (error) {
        logger.error('Duplicate employee detection error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to detect duplicate employees'
        });
    }
});

// POST /api/data-validation/cleanup-duplicates - Clean up employee duplicates
router.post('/cleanup-duplicates', async (req, res) => {
    try {
        const userId = req.userId || req.user?.userId || req.user?.id;
        
        console.log(`🔧 [DATA-CLEANUP] Starting complete duplicate cleanup for user ${userId}...`);
        
        const cleanupResults = await duplicateEmployeeCleanup.performCompleteCleanup(userId);
        
        console.log(`✅ [DATA-CLEANUP] Cleanup completed for user ${userId}`);
        console.log(`   Duplicates Found: ${cleanupResults.initialDuplicates}`);
        console.log(`   Duplicates Merged: ${cleanupResults.duplicatesMerged}`);
        console.log(`   Transactions Updated: ${cleanupResults.transactionsUpdated}`);
        console.log(`   Success: ${cleanupResults.success}`);
        
        res.json({
            success: true,
            message: `Successfully cleaned up ${cleanupResults.duplicatesMerged} duplicate employees`,
            data: cleanupResults
        });
        
    } catch (error) {
        logger.error('Employee duplicate cleanup error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to cleanup duplicate employees'
        });
    }
});

export default router;