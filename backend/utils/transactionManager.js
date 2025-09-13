import mongoose from 'mongoose';
import logger from './logger.js';

/**
 * Transaction rollback management utility
 * Provides mechanisms to handle partial failures and rollback operations
 */
class TransactionManager {
    constructor() {
        this.activeTransactions = new Map(); // Track active transactions
    }

    /**
     * Execute database operations within a transaction with automatic rollback
     * @param {Function} operation - Async function containing database operations
     * @param {Object} options - Transaction options
     * @returns {Promise} Operation result or throws error
     */
    async executeWithTransaction(operation, options = {}) {
        const session = await mongoose.startSession();
        const transactionId = this.generateTransactionId();
        
        try {
            logger.info(`Starting database transaction: ${transactionId}`);
            this.activeTransactions.set(transactionId, {
                session,
                startTime: new Date(),
                operations: []
            });
            
            await session.startTransaction({
                readConcern: { level: 'snapshot' },
                writeConcern: { w: 'majority' },
                ...options
            });
            
            // Execute the operations within transaction context
            const result = await operation(session);
            
            // Commit the transaction
            await session.commitTransaction();
            logger.info(`Database transaction committed successfully: ${transactionId}`);
            
            this.activeTransactions.delete(transactionId);
            return result;
            
        } catch (error) {
            logger.error(`Database transaction failed, rolling back: ${transactionId}`, {
                error: error.message,
                stack: error.stack
            });
            
            try {
                await session.abortTransaction();
                logger.info(`Database transaction rolled back successfully: ${transactionId}`);
            } catch (rollbackError) {
                logger.error(`Failed to rollback transaction: ${transactionId}`, {
                    error: rollbackError.message
                });
            }
            
            this.activeTransactions.delete(transactionId);
            throw error;
            
        } finally {
            await session.endSession();
        }
    }

    /**
     * Execute bulk operations with rollback capability
     * @param {Array} operations - Array of operation functions
     * @param {Object} options - Execution options
     */
    async executeBulkOperations(operations, options = {}) {
        const { rollbackOnPartialFailure = true, continueOnError = false } = options;
        
        return await this.executeWithTransaction(async (session) => {
            const results = [];
            const errors = [];
            
            for (let i = 0; i < operations.length; i++) {
                const operation = operations[i];
                
                try {
                    const result = await operation(session);
                    results.push({
                        index: i,
                        success: true,
                        result
                    });
                    
                } catch (error) {
                    const errorInfo = {
                        index: i,
                        success: false,
                        error: error.message,
                        operation: operation.name || 'anonymous'
                    };
                    
                    errors.push(errorInfo);
                    results.push(errorInfo);
                    
                    logger.error(`Bulk operation ${i} failed:`, error);
                    
                    if (!continueOnError) {
                        throw new Error(`Bulk operation failed at index ${i}: ${error.message}`);
                    }
                }
            }
            
            if (errors.length > 0 && rollbackOnPartialFailure) {
                throw new Error(`Bulk operation partially failed: ${errors.length}/${operations.length} operations failed`);
            }
            
            return {
                totalOperations: operations.length,
                successCount: results.filter(r => r.success).length,
                errorCount: errors.length,
                results,
                errors
            };
        });
    }

    /**
     * Rollback compensation pattern for external API calls
     * @param {Array} compensationActions - Array of rollback functions
     */
    async executeCompensationPattern(compensationActions) {
        const completedActions = [];
        
        try {
            // Execute all actions
            for (const action of compensationActions) {
                const result = await action.execute();
                completedActions.push({
                    action,
                    result,
                    completed: true
                });
            }
            
            return {
                success: true,
                completedActions: completedActions.length
            };
            
        } catch (error) {
            logger.error('Compensation pattern failed, executing rollbacks:', error);
            
            // Execute rollback actions in reverse order
            const rollbackResults = [];
            for (let i = completedActions.length - 1; i >= 0; i--) {
                const { action } = completedActions[i];
                
                try {
                    if (action.rollback && typeof action.rollback === 'function') {
                        await action.rollback();
                        rollbackResults.push({
                            index: i,
                            success: true
                        });
                    }
                } catch (rollbackError) {
                    logger.error(`Rollback failed for action ${i}:`, rollbackError);
                    rollbackResults.push({
                        index: i,
                        success: false,
                        error: rollbackError.message
                    });
                }
            }
            
            throw new Error(`Compensation pattern failed: ${error.message}. Rollback results: ${JSON.stringify(rollbackResults)}`);
        }
    }

    /**
     * Safe employee and transaction sync with rollback
     * @param {Object} syncData - Data to sync
     * @param {string} userId - User ID
     */
    async syncEmployeeDataWithRollback(syncData, userId) {
        const { employees = [], transactions = [] } = syncData;
        
        return await this.executeWithTransaction(async (session) => {
            const Employee = mongoose.model('Employee');
            const Transaction = mongoose.model('Transaction');
            
            // Step 1: Sync employees
            const employeeResults = [];
            const employeeIdMapping = [];
            
            for (const employeeData of employees) {
                const result = await Employee.findOneAndUpdate(
                    { userId, localId: employeeData.id },
                    {
                        ...employeeData,
                        userId,
                        syncStatus: 'synced',
                        lastSyncDate: new Date()
                    },
                    { 
                        upsert: true, 
                        new: true, 
                        session,
                        runValidators: true
                    }
                );
                
                employeeResults.push(result);
                employeeIdMapping.push({
                    oldId: employeeData.id,
                    newId: result._id.toString(),
                    localId: result.localId
                });
            }
            
            // Step 2: Sync transactions with corrected employee IDs
            const transactionResults = [];
            
            for (const transactionData of transactions) {
                // Correct employee ID if needed
                const mapping = employeeIdMapping.find(m => 
                    m.oldId === transactionData.employee?.id || 
                    m.oldId === transactionData.employeeId
                );
                
                if (mapping) {
                    if (transactionData.employee) {
                        transactionData.employee.id = mapping.newId;
                    }
                    transactionData.employeeId = mapping.newId;
                }
                
                const result = await Transaction.findOneAndUpdate(
                    { userId, localId: transactionData.id },
                    {
                        ...transactionData,
                        userId,
                        syncStatus: 'synced',
                        lastSyncDate: new Date()
                    },
                    { 
                        upsert: true, 
                        new: true, 
                        session,
                        runValidators: true
                    }
                );
                
                transactionResults.push(result);
            }
            
            return {
                employees: employeeResults,
                transactions: transactionResults,
                employeeIdMapping
            };
        });
    }

    /**
     * Generate unique transaction ID
     */
    generateTransactionId() {
        return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get active transaction count
     */
    getActiveTransactionCount() {
        return this.activeTransactions.size;
    }

    /**
     * Force cleanup of stale transactions (emergency use)
     */
    async cleanupStaleTransactions() {
        const staleTimeout = 5 * 60 * 1000; // 5 minutes
        const now = new Date();
        
        for (const [transactionId, transactionInfo] of this.activeTransactions) {
            if (now - transactionInfo.startTime > staleTimeout) {
                logger.warn(`Cleaning up stale transaction: ${transactionId}`);
                
                try {
                    await transactionInfo.session.abortTransaction();
                    await transactionInfo.session.endSession();
                } catch (error) {
                    logger.error(`Error cleaning up stale transaction ${transactionId}:`, error);
                }
                
                this.activeTransactions.delete(transactionId);
            }
        }
    }
}

// Export singleton instance
export default new TransactionManager();