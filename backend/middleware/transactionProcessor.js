import employeeStatsManager from '../utils/employeeStatsManager.js';
import logger from '../utils/logger.js';

/**
 * Middleware to process transactions and update employee stats
 * Prevents duplicate processing and ensures data consistency
 */

/**
 * Transaction creation middleware
 * Automatically updates employee stats when new transactions are created
 */
export const processNewTransaction = async (req, res, next) => {
    // Store original json method to intercept successful responses
    const originalJson = res.json;
    
    res.json = function(data) {
        // Only process on successful transaction creation
        if (data && data.success !== false && req.method === 'POST' && req.route?.path === '/') {
            // Process employee stats update asynchronously to not block response
            setImmediate(async () => {
                try {
                    if (data.data || req.body) {
                        const transactionData = data.data || req.body;
                        await employeeStatsManager.updateEmployeeStats(
                            transactionData,
                            req.user._id,
                            { preventDuplicates: true, batchUpdate: false }
                        );
                    }
                } catch (error) {
                    logger.error('Error processing transaction for employee stats:', error);
                }
            });
        }
        
        // Call original json method
        return originalJson.call(this, data);
    };
    
    next();
};

/**
 * Bulk transaction processing middleware
 * Used for sync operations where multiple transactions are processed
 */
export const processBulkTransactions = async (req, res, next) => {
    // Store original json method
    const originalJson = res.json;
    
    res.json = function(data) {
        // Process bulk transactions asynchronously
        if (data && data.success !== false && req.body.transactions && Array.isArray(req.body.transactions)) {
            setImmediate(async () => {
                try {
                    const transactions = req.body.transactions;
                    logger.info(`Processing bulk employee stats updates for ${transactions.length} transactions`);
                    
                    // Process in batches for better performance
                    const batchSize = 10;
                    for (let i = 0; i < transactions.length; i += batchSize) {
                        const batch = transactions.slice(i, i + batchSize);
                        
                        const promises = batch.map(transaction => 
                            employeeStatsManager.updateEmployeeStats(
                                transaction,
                                req.user?.id || req.user?._id,
                                { preventDuplicates: true, batchUpdate: true }
                            ).catch(error => {
                                logger.error(`Error processing transaction ${transaction.id}:`, error);
                                return null; // Continue processing other transactions
                            })
                        );
                        
                        await Promise.all(promises);
                        
                        // Small delay between batches to prevent overwhelming the database
                        if (i + batchSize < transactions.length) {
                            await new Promise(resolve => setTimeout(resolve, 100));
                        }
                    }
                    
                    // Flush any remaining batched updates
                    await employeeStatsManager.flushBatch();
                    
                    logger.info('Bulk employee stats update completed');
                } catch (error) {
                    logger.error('Error processing bulk transactions for employee stats:', error);
                }
            });
        }
        
        return originalJson.call(this, data);
    };
    
    next();
};

/**
 * Transaction deduplication middleware
 * Prevents processing the same transaction multiple times
 */
export const preventDuplicateProcessing = (req, res, next) => {
    // Add unique request identifier for tracking
    req.requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Add transaction ID tracking for sync operations
    if (req.body && (req.body.transactions || req.body.id || req.body.localId)) {
        const transactionIds = [];
        
        if (req.body.transactions && Array.isArray(req.body.transactions)) {
            // Bulk sync operation
            transactionIds.push(...req.body.transactions.map(t => t.id || t.localId).filter(Boolean));
        } else if (req.body.id || req.body.localId) {
            // Single transaction
            transactionIds.push(req.body.id || req.body.localId);
        }
        
        req.transactionIds = transactionIds;
        logger.info('Transaction processing request', {
            requestId: req.requestId,
            transactionIds,
            method: req.method,
            path: req.path
        });
    }
    
    next();
};

/**
 * Employee stats validation middleware
 * Validates employee data before processing transactions
 */
export const validateEmployeeData = async (req, res, next) => {
    try {
        if (req.body && req.body.transactions && Array.isArray(req.body.transactions)) {
            // Validate bulk transactions
            const invalidTransactions = [];
            
            for (const transaction of req.body.transactions) {
                if (transaction.employee && transaction.employee.id) {
                    const employee = await employeeStatsManager.findEmployee(
                        transaction.employee.id,
                        req.user?.id || req.user?._id
                    );
                    
                    if (!employee) {
                        invalidTransactions.push({
                            transactionId: transaction.id || transaction.localId,
                            employeeId: transaction.employee.id,
                            error: 'Employee not found'
                        });
                    }
                }
            }
            
            if (invalidTransactions.length > 0) {
                logger.warn('Some transactions have invalid employee references:', {
                    invalidTransactions,
                    totalTransactions: req.body.transactions.length
                });
                
                // Continue processing but log warnings
                req.invalidEmployeeTransactions = invalidTransactions;
            }
        }
        
        next();
    } catch (error) {
        logger.error('Error validating employee data:', error);
        // Don't block the request, just log the error
        next();
    }
};

export default {
    processNewTransaction,
    processBulkTransactions,
    preventDuplicateProcessing,
    validateEmployeeData
};