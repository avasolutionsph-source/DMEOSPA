import express from 'express';
import Transaction from '../../models/Transaction.js';
import Employee from '../../models/Employee.js';
import BaseRouteHandler from '../../utils/base-route-handler.js';
import { withErrorHandling } from '../../middleware/errorHandler.js';
import logger from '../../utils/logger.js';
import employeeStatsManager from '../../utils/employeeStatsManager.js';
import { processNewTransaction, preventDuplicateProcessing } from '../../middleware/transactionProcessor.js';

const router = express.Router();

// Middleware to update employee performance stats when transactions are created
const updateEmployeeStats = async (transactionData, userId) => {
    try {
        // Use centralized employee stats manager
        const result = await employeeStatsManager.updateEmployeeStats(
            transactionData, 
            userId, 
            { preventDuplicates: true, batchUpdate: false }
        );

        if (result) {
            console.log('✅ [EMPLOYEE-STATS] Employee stats updated via centralized manager:', {
                employeeId: result.employee._id,
                name: `${result.employee.firstName} ${result.employee.lastName}`,
                addedSales: result.statsUpdate.totalSales,
                addedCommission: result.statsUpdate.totalCommission,
                addedTransactions: result.statsUpdate.totalTransactions
            });
            return result.result;
        } else {
            console.log('ℹ️ [EMPLOYEE-STATS] No employee stats update needed or employee not found');
            return null;
        }
    } catch (error) {
        console.error('❌ [EMPLOYEE-STATS] Failed to update employee stats:', error);
        throw error;
    }
};

// Create base route handler for transactions
const transactionHandler = new BaseRouteHandler(Transaction, {
    populate: [], 
    searchFields: ['transactionId', 'paymentMethod'],
    sortField: 'createdAt',
    sortOrder: -1, // Most recent first
    requiredFields: ['items', 'total', 'paymentMethod'],
    ownerField: 'userId'
});

// Add transaction processing middleware to all routes
router.use(preventDuplicateProcessing);
router.use(processNewTransaction);

// Standard CRUD routes using base handler
transactionHandler.createRoutes(router);

// POST route to update employee stats after transaction
router.post('/update-employee-stats', withErrorHandling(async (req, res) => {
    const { transactionData } = req.body;
    
    if (!transactionData) {
        return res.status(400).json({
            success: false,
            error: { message: 'Transaction data is required' }
        });
    }

    const updatedEmployee = await updateEmployeeStats(transactionData, req.user._id);
    
    res.json({
        success: true,
        data: updatedEmployee,
        message: 'Employee stats updated successfully'
    });
}));

// Additional transaction-specific routes can be added here

// Additional transaction-specific routes
router.post('/:id/void', withErrorHandling(async (req, res) => {
    const { id } = req.params;
    const { reason = 'Void transaction' } = req.body;
    
    const transaction = await Transaction.findOneAndUpdate(
        { _id: id, userId: req.user._id },
        { 
            status: 'cancelled',
            'auditLog.modifications': {
                $push: {
                    date: new Date(),
                    by: req.user._id,
                    action: 'void',
                    details: reason
                }
            },
            syncStatus: 'pending'
        },
        { new: true }
    );
    
    if (!transaction) {
        return res.status(404).json({
            success: false,
            error: { message: 'Transaction not found' }
        });
    }
    
    logger.info(`Transaction voided: ${id}`, {
        category: 'DATABASE',
        operation: 'void_transaction',
        data: { id, reason }
    });
    
    res.json({
        success: true,
        data: transaction,
        message: 'Transaction voided successfully'
    });
}));

router.post('/:id/refund', withErrorHandling(async (req, res) => {
    const { id } = req.params;
    const { amount, reason = 'Refund transaction' } = req.body;
    
    const transaction = await Transaction.findOneAndUpdate(
        { _id: id, userId: req.user._id },
        { 
            status: 'refunded',
            'auditLog.modifications': {
                $push: {
                    date: new Date(),
                    by: req.user._id,
                    action: 'refund',
                    details: `${reason} - Amount: ₱${amount || 'Full'}`
                }
            },
            syncStatus: 'pending'
        },
        { new: true }
    );
    
    if (!transaction) {
        return res.status(404).json({
            success: false,
            error: { message: 'Transaction not found' }
        });
    }
    
    logger.info(`Transaction refunded: ${id}`, {
        category: 'DATABASE',
        operation: 'refund_transaction', 
        data: { id, amount, reason }
    });
    
    res.json({
        success: true,
        data: transaction,
        message: 'Transaction refunded successfully'
    });
}));

export default router;