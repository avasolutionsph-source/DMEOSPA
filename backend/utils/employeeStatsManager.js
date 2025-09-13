import Employee from '../models/Employee.js';
import logger from './logger.js';

/**
 * Centralized Employee Statistics Management
 * Prevents duplicate updates and ensures data consistency
 */
class EmployeeStatsManager {
    constructor() {
        this.processedTransactions = new Set(); // Prevent duplicate processing
        this.batchUpdates = new Map(); // Batch multiple updates for performance
        this.flushInterval = null;
    }

    /**
     * Find employee by multiple identification strategies
     * @param {string} employeeId - Employee ID (localId or _id)
     * @param {string} userId - User ID for scoping
     * @returns {Object|null} Employee document
     */
    async findEmployee(employeeId, userId) {
        if (!employeeId || !userId) {
            return null;
        }

        try {
            // Try multiple matching strategies for backward compatibility
            const employee = await Employee.findOne({
                $and: [
                    { userId: userId.toString() },
                    {
                        $or: [
                            { localId: employeeId.toString() },
                            { _id: employeeId.toString() },
                            { _id: employeeId } // Handle ObjectId type
                        ]
                    }
                ]
            });

            return employee;
        } catch (error) {
            logger.error('Error finding employee:', {
                employeeId,
                userId,
                error: error.message
            });
            return null;
        }
    }

    /**
     * Update employee statistics from transaction data
     * @param {Object} transactionData - Transaction data
     * @param {string} userId - User ID
     * @param {Object} options - Update options
     */
    async updateEmployeeStats(transactionData, userId, options = {}) {
        const { preventDuplicates = true, batchUpdate = false } = options;

        try {
            // Prevent duplicate processing of same transaction
            const transactionKey = `${userId}-${transactionData.id || transactionData.localId}`;
            if (preventDuplicates && this.processedTransactions.has(transactionKey)) {
                logger.info('Transaction already processed for employee stats', { transactionKey });
                return null;
            }

            // Extract employee ID from various possible fields
            const employeeId = this.extractEmployeeId(transactionData);
            if (!employeeId) {
                logger.warn('No employee ID found in transaction', { 
                    transactionId: transactionData.id,
                    employeeData: transactionData.employee 
                });
                return null;
            }

            // Find the employee
            const employee = await this.findEmployee(employeeId, userId);
            if (!employee) {
                logger.warn('Employee not found for stats update', { 
                    employeeId, 
                    userId,
                    transactionId: transactionData.id 
                });
                return null;
            }

            // Calculate stats
            const transactionTotal = parseFloat(transactionData.total) || 0;
            const commissionAmount = transactionTotal * ((employee.commissionRate || 0) / 100);

            const statsUpdate = {
                totalSales: transactionTotal,
                totalCommission: commissionAmount,
                totalTransactions: 1
            };

            if (batchUpdate) {
                // Add to batch for later processing
                this.addToBatch(employee._id, statsUpdate);
                this.processedTransactions.add(transactionKey);
                return { employee, statsUpdate, batched: true };
            } else {
                // Process immediately
                const result = await this.applyStatsUpdate(employee._id, statsUpdate);
                this.processedTransactions.add(transactionKey);
                
                logger.info('Employee stats updated', {
                    employeeId: employee._id,
                    employeeName: `${employee.firstName} ${employee.lastName}`,
                    addedSales: statsUpdate.totalSales,
                    addedCommission: statsUpdate.totalCommission,
                    addedTransactions: statsUpdate.totalTransactions
                });

                return { employee, statsUpdate, result };
            }

        } catch (error) {
            logger.error('Failed to update employee stats:', {
                error: error.message,
                transactionId: transactionData.id,
                userId
            });
            throw error;
        }
    }

    /**
     * Extract employee ID from transaction data using multiple strategies
     * @param {Object} transactionData - Transaction data
     * @returns {string|null} Employee ID
     */
    extractEmployeeId(transactionData) {
        return transactionData.employee?.id || 
               transactionData.employeeId || 
               transactionData.employee?.employeeId ||
               null;
    }

    /**
     * Apply stats update to employee document
     * @param {string} employeeId - Employee document ID
     * @param {Object} statsUpdate - Stats to increment
     */
    async applyStatsUpdate(employeeId, statsUpdate) {
        return await Employee.findByIdAndUpdate(
            employeeId,
            {
                $inc: {
                    totalSales: statsUpdate.totalSales,
                    totalCommission: statsUpdate.totalCommission,
                    totalTransactions: statsUpdate.totalTransactions
                },
                syncStatus: 'synced',
                lastSyncDate: new Date()
            },
            { new: true }
        );
    }

    /**
     * Add stats update to batch processing queue
     * @param {string} employeeId - Employee document ID
     * @param {Object} statsUpdate - Stats to add to batch
     */
    addToBatch(employeeId, statsUpdate) {
        const existingBatch = this.batchUpdates.get(employeeId.toString());
        
        if (existingBatch) {
            // Combine with existing batch
            existingBatch.totalSales += statsUpdate.totalSales;
            existingBatch.totalCommission += statsUpdate.totalCommission;
            existingBatch.totalTransactions += statsUpdate.totalTransactions;
        } else {
            // Create new batch entry
            this.batchUpdates.set(employeeId.toString(), { ...statsUpdate });
        }

        // Auto-flush batch after delay
        this.scheduleFlush();
    }

    /**
     * Schedule batch flush
     */
    scheduleFlush() {
        if (this.flushInterval) {
            clearTimeout(this.flushInterval);
        }

        this.flushInterval = setTimeout(() => {
            this.flushBatch();
        }, 5000); // Flush after 5 seconds of inactivity
    }

    /**
     * Flush all batched updates
     */
    async flushBatch() {
        if (this.batchUpdates.size === 0) {
            return;
        }

        logger.info(`Flushing batch employee stats updates for ${this.batchUpdates.size} employees`);

        const promises = [];
        for (const [employeeId, statsUpdate] of this.batchUpdates) {
            promises.push(this.applyStatsUpdate(employeeId, statsUpdate));
        }

        try {
            const results = await Promise.all(promises);
            logger.info('Batch employee stats update completed', {
                updatedEmployees: results.length,
                totalBatchSize: this.batchUpdates.size
            });
            
            // Clear batch
            this.batchUpdates.clear();
        } catch (error) {
            logger.error('Batch employee stats update failed:', error);
        }
    }

    /**
     * Clear processed transaction cache
     * @param {number} olderThanHours - Clear transactions older than X hours
     */
    clearProcessedCache(olderThanHours = 24) {
        // For now, just clear all since we don't track timestamps
        // In production, you might want to implement timestamp-based cleanup
        this.processedTransactions.clear();
        logger.info('Cleared processed transactions cache');
    }

    /**
     * Recalculate employee stats from scratch (data repair utility)
     * @param {string} userId - User ID
     * @param {string} employeeId - Optional specific employee ID
     */
    async recalculateEmployeeStats(userId, employeeId = null) {
        const Transaction = (await import('../models/Transaction.js')).default;
        
        try {
            // Find employees to recalculate
            const query = { userId: userId.toString() };
            if (employeeId) {
                query.$or = [
                    { localId: employeeId },
                    { _id: employeeId }
                ];
            }

            const employees = await Employee.find(query);
            logger.info(`Recalculating stats for ${employees.length} employees`);

            for (const employee of employees) {
                // Get all transactions for this employee
                const transactions = await Transaction.find({
                    userId: userId.toString(),
                    $or: [
                        { 'employee.id': employee.localId },
                        { 'employee.id': employee._id },
                        { employeeId: employee.localId },
                        { employeeId: employee._id }
                    ]
                });

                // Calculate totals
                const totalSales = transactions.reduce((sum, t) => sum + (t.total || 0), 0);
                const totalTransactions = transactions.length;
                const totalCommission = totalSales * ((employee.commissionRate || 0) / 100);

                // Update employee with correct totals
                await Employee.findByIdAndUpdate(employee._id, {
                    totalSales,
                    totalCommission,
                    totalTransactions,
                    syncStatus: 'synced',
                    lastSyncDate: new Date()
                });

                logger.info(`Recalculated stats for employee ${employee.firstName} ${employee.lastName}:`, {
                    totalSales,
                    totalCommission,
                    totalTransactions
                });
            }

            return employees.length;
        } catch (error) {
            logger.error('Error recalculating employee stats:', error);
            throw error;
        }
    }
}

// Export singleton instance
export default new EmployeeStatsManager();