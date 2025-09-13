import Employee from '../models/Employee.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import employeeStatsManager from './employeeStatsManager.js';
import logger from './logger.js';

/**
 * Data Repair Utilities
 * Fix inconsistent employee data and statistics
 */
class DataRepair {
    constructor() {
        this.repairLog = [];
    }

    /**
     * Comprehensive employee data repair
     * @param {string} userId - User ID to repair data for
     * @param {Object} options - Repair options
     */
    async repairEmployeeData(userId, options = {}) {
        const {
            fixDuplicateStats = true,
            recalculateStats = true,
            cleanupTransactions = true,
            dryRun = false
        } = options;

        logger.info(`Starting employee data repair for user: ${userId}`, {
            fixDuplicateStats,
            recalculateStats,
            cleanupTransactions,
            dryRun
        });

        const repairResults = {
            employeesProcessed: 0,
            transactionsProcessed: 0,
            duplicatesFound: 0,
            inconsistenciesFixed: 0,
            errors: []
        };

        try {
            // Step 1: Find and fix duplicate employees
            if (fixDuplicateStats) {
                const duplicates = await this.findDuplicateEmployees(userId);
                repairResults.duplicatesFound = duplicates.length;
                
                if (!dryRun && duplicates.length > 0) {
                    await this.mergeDuplicateEmployees(duplicates);
                }
            }

            // Step 2: Recalculate employee stats from transactions
            if (recalculateStats) {
                const employees = await Employee.find({ userId: userId.toString() });
                repairResults.employeesProcessed = employees.length;

                for (const employee of employees) {
                    try {
                        const stats = await this.calculateEmployeeStatsFromTransactions(employee, userId);
                        
                        if (!dryRun) {
                            await Employee.findByIdAndUpdate(employee._id, {
                                totalSales: stats.totalSales,
                                totalCommission: stats.totalCommission,
                                totalTransactions: stats.totalTransactions,
                                lastSyncDate: new Date()
                            });
                        }

                        logger.info(`Repaired stats for employee ${employee.firstName} ${employee.lastName}:`, stats);
                        repairResults.inconsistenciesFixed++;
                    } catch (empError) {
                        logger.error(`Error repairing employee ${employee._id}:`, empError);
                        repairResults.errors.push({
                            employeeId: employee._id,
                            error: empError.message
                        });
                    }
                }
            }

            // Step 3: Clean up transaction employee references
            if (cleanupTransactions) {
                const cleanupResult = await this.cleanupTransactionEmployeeRefs(userId, dryRun);
                repairResults.transactionsProcessed = cleanupResult.processed;
                repairResults.inconsistenciesFixed += cleanupResult.fixed;
            }

            logger.info('Employee data repair completed:', repairResults);
            return repairResults;

        } catch (error) {
            logger.error('Employee data repair failed:', error);
            repairResults.errors.push({ general: error.message });
            throw error;
        }
    }

    /**
     * Find duplicate employees (same name, same user)
     * @param {string} userId - User ID
     * @returns {Array} Array of duplicate groups
     */
    async findDuplicateEmployees(userId) {
        const duplicates = await Employee.aggregate([
            { $match: { userId: userId.toString() } },
            {
                $group: {
                    _id: {
                        firstName: '$firstName',
                        lastName: '$lastName',
                        userId: '$userId'
                    },
                    employees: { $push: '$$ROOT' },
                    count: { $sum: 1 }
                }
            },
            { $match: { count: { $gt: 1 } } }
        ]);

        return duplicates.map(group => group.employees);
    }

    /**
     * Merge duplicate employees by combining their stats
     * @param {Array} duplicateGroups - Groups of duplicate employees
     */
    async mergeDuplicateEmployees(duplicateGroups) {
        for (const group of duplicateGroups) {
            if (group.length < 2) continue;

            // Keep the first employee, merge others into it
            const [primaryEmployee, ...duplicates] = group.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

            // Calculate combined stats
            const combinedStats = group.reduce((totals, emp) => ({
                totalSales: totals.totalSales + (emp.totalSales || 0),
                totalCommission: totals.totalCommission + (emp.totalCommission || 0),
                totalTransactions: totals.totalTransactions + (emp.totalTransactions || 0)
            }), { totalSales: 0, totalCommission: 0, totalTransactions: 0 });

            // Update primary employee with combined stats
            await Employee.findByIdAndUpdate(primaryEmployee._id, combinedStats);

            // Update all transactions to reference primary employee
            for (const duplicate of duplicates) {
                await Transaction.updateMany(
                    {
                        userId: duplicate.userId,
                        $or: [
                            { 'employee.id': duplicate._id.toString() },
                            { 'employee.id': duplicate.localId },
                            { employeeId: duplicate._id.toString() },
                            { employeeId: duplicate.localId }
                        ]
                    },
                    {
                        $set: {
                            'employee.id': primaryEmployee.localId || primaryEmployee._id.toString(),
                            'employee.name': `${primaryEmployee.firstName} ${primaryEmployee.lastName}`
                        },
                        $unset: { employeeId: '', employeeName: '' }
                    }
                );

                // Remove duplicate employee
                await Employee.findByIdAndDelete(duplicate._id);
                logger.info(`Merged duplicate employee ${duplicate.firstName} ${duplicate.lastName} into ${primaryEmployee.firstName} ${primaryEmployee.lastName}`);
            }
        }
    }

    /**
     * Calculate employee stats from actual transaction data
     * @param {Object} employee - Employee document
     * @param {string} userId - User ID
     */
    async calculateEmployeeStatsFromTransactions(employee, userId) {
        const transactions = await Transaction.find({
            userId: userId.toString(),
            $or: [
                { 'employee.id': employee._id.toString() },
                { 'employee.id': employee.localId },
                // Legacy fields for backward compatibility
                { employeeId: employee._id.toString() },
                { employeeId: employee.localId }
            ]
        });

        const stats = {
            totalSales: 0,
            totalCommission: 0,
            totalTransactions: transactions.length
        };

        for (const transaction of transactions) {
            const total = parseFloat(transaction.total) || 0;
            stats.totalSales += total;
            stats.totalCommission += total * ((employee.commissionRate || 0) / 100);
        }

        return stats;
    }

    /**
     * Clean up inconsistent employee references in transactions
     * @param {string} userId - User ID
     * @param {boolean} dryRun - If true, don't make changes
     */
    async cleanupTransactionEmployeeRefs(userId, dryRun = false) {
        const results = { processed: 0, fixed: 0 };

        // Find transactions with legacy employee fields
        const transactionsWithLegacyRefs = await Transaction.find({
            userId: userId.toString(),
            $or: [
                { employeeId: { $exists: true } },
                { employeeName: { $exists: true } },
                { employeeCommission: { $exists: true } }
            ]
        });

        results.processed = transactionsWithLegacyRefs.length;

        if (!dryRun) {
            for (const transaction of transactionsWithLegacyRefs) {
                const updates = {};
                const unsets = {};

                // Migrate employeeId to employee.id
                if (transaction.employeeId && (!transaction.employee || !transaction.employee.id)) {
                    updates['employee.id'] = transaction.employeeId;
                    unsets.employeeId = '';
                }

                // Migrate employeeName to employee.name
                if (transaction.employeeName && (!transaction.employee || !transaction.employee.name)) {
                    updates['employee.name'] = transaction.employeeName;
                    unsets.employeeName = '';
                }

                // Migrate employeeCommission to employee.commission
                if (transaction.employeeCommission !== undefined && (!transaction.employee || transaction.employee.commission === undefined)) {
                    updates['employee.commission'] = transaction.employeeCommission;
                    unsets.employeeCommission = '';
                }

                if (Object.keys(updates).length > 0 || Object.keys(unsets).length > 0) {
                    const updateDoc = {};
                    if (Object.keys(updates).length > 0) updateDoc.$set = updates;
                    if (Object.keys(unsets).length > 0) updateDoc.$unset = unsets;

                    await Transaction.findByIdAndUpdate(transaction._id, updateDoc);
                    results.fixed++;
                }
            }
        }

        return results;
    }

    /**
     * Validate data consistency across the system
     * @param {string} userId - User ID
     */
    async validateDataConsistency(userId) {
        const validation = {
            employeeCount: 0,
            transactionCount: 0,
            orphanedTransactions: [],
            inconsistentStats: [],
            issues: []
        };

        try {
            // Count employees and transactions
            validation.employeeCount = await Employee.countDocuments({ userId: userId.toString() });
            validation.transactionCount = await Transaction.countDocuments({ userId: userId.toString() });

            // Find orphaned transactions (employee not found)
            const transactions = await Transaction.find({ 
                userId: userId.toString(),
                'employee.id': { $exists: true }
            });

            for (const transaction of transactions) {
                if (transaction.employee && transaction.employee.id) {
                    const employee = await employeeStatsManager.findEmployee(transaction.employee.id, userId);
                    if (!employee) {
                        validation.orphanedTransactions.push({
                            transactionId: transaction._id,
                            employeeId: transaction.employee.id,
                            employeeName: transaction.employee.name
                        });
                    }
                }
            }

            // Check for statistical inconsistencies
            const employees = await Employee.find({ userId: userId.toString() });
            for (const employee of employees) {
                const calculatedStats = await this.calculateEmployeeStatsFromTransactions(employee, userId);
                
                const tolerance = 0.01; // Allow small floating point differences
                if (Math.abs(employee.totalSales - calculatedStats.totalSales) > tolerance ||
                    Math.abs(employee.totalCommission - calculatedStats.totalCommission) > tolerance ||
                    employee.totalTransactions !== calculatedStats.totalTransactions) {
                    
                    validation.inconsistentStats.push({
                        employeeId: employee._id,
                        employeeName: `${employee.firstName} ${employee.lastName}`,
                        stored: {
                            totalSales: employee.totalSales,
                            totalCommission: employee.totalCommission,
                            totalTransactions: employee.totalTransactions
                        },
                        calculated: calculatedStats
                    });
                }
            }

            // Summarize issues
            if (validation.orphanedTransactions.length > 0) {
                validation.issues.push(`Found ${validation.orphanedTransactions.length} orphaned transactions`);
            }
            if (validation.inconsistentStats.length > 0) {
                validation.issues.push(`Found ${validation.inconsistentStats.length} employees with inconsistent stats`);
            }

            logger.info('Data consistency validation completed:', validation);
            return validation;

        } catch (error) {
            validation.issues.push(`Validation error: ${error.message}`);
            logger.error('Data consistency validation failed:', error);
            return validation;
        }
    }
}

export default new DataRepair();