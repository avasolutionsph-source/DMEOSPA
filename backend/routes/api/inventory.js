import express from 'express';
import InventoryItem from '../../models/InventoryItem.js';
import BaseRouteHandler from '../../utils/base-route-handler.js';
import { withErrorHandling } from '../../middleware/unifiedErrorHandler.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// Create base route handler for inventory
const inventoryHandler = new BaseRouteHandler(InventoryItem, {
    populate: [], // Add population fields if needed
    searchFields: ['name', 'description', 'sku'],
    sortField: 'name',
    sortOrder: 1,
    requiredFields: ['name', 'currentStock'],
    uniqueFields: ['sku'], // SKU should be unique per user
    ownerField: 'userId'
});

// Standard CRUD routes using base handler
inventoryHandler.createRoutes(router);

// Additional inventory-specific routes
router.get('/low-stock', withErrorHandling(async (req, res) => {
    const { threshold = 10 } = req.query;
    
    const lowStockItems = await InventoryItem.find({
        userId: req.user._id,
        currentStock: { $lte: parseInt(threshold) },
        isActive: true
    })
        .sort({ currentStock: 1 }) // Most urgent first
        .lean();
    
    logger.info(`Retrieved low stock items (threshold: ${threshold})`, {
        category: 'DATABASE',
        operation: 'get_low_stock',
        data: { threshold, count: lowStockItems.length }
    });
    
    res.json({
        success: true,
        data: lowStockItems,
        meta: {
            threshold: parseInt(threshold),
            count: lowStockItems.length
        }
    });
}));

router.patch('/:id/stock', withErrorHandling(async (req, res) => {
    const { id } = req.params;
    const { quantity, operation = 'set' } = req.body; // 'set', 'add', 'subtract'
    
    const item = await InventoryItem.findOne({
        _id: id,
        userId: req.user._id
    });
    
    if (!item) {
        return res.status(404).json({
            success: false,
            error: { message: 'Inventory item not found' }
        });
    }
    
    let newStock;
    switch (operation) {
        case 'add':
            newStock = item.currentStock + parseInt(quantity);
            break;
        case 'subtract':
            newStock = Math.max(0, item.currentStock - parseInt(quantity));
            break;
        case 'set':
        default:
            newStock = parseInt(quantity);
            break;
    }
    
    item.currentStock = newStock;
    item.syncStatus = 'pending';
    await item.save();
    
    logger.info(`Updated inventory stock: ${id}`, {
        category: 'DATABASE',
        operation: 'update_stock',
        data: { 
            id, 
            operation, 
            quantity, 
            oldStock: item.currentStock,
            newStock 
        }
    });
    
    res.json({
        success: true,
        data: item,
        message: 'Inventory stock updated successfully'
    });
}));

router.post('/restock', withErrorHandling(async (req, res) => {
    const { updates } = req.body;
    
    if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({
            success: false,
            error: { message: 'Updates array is required and must not be empty' }
        });
    }
    
    const operations = updates.map(update => ({
        updateOne: {
            filter: { 
                _id: update.id, 
                userId: req.user._id 
            },
            update: { 
                $inc: { currentStock: update.quantity }, // Add to existing stock
                $set: { syncStatus: 'pending' }
            }
        }
    }));
    
    const result = await InventoryItem.bulkWrite(operations);
    
    logger.info(`Bulk restocked inventory`, {
        category: 'DATABASE',
        operation: 'bulk_restock',
        data: { 
            updateCount: updates.length,
            matched: result.matchedCount,
            modified: result.modifiedCount
        }
    });
    
    res.json({
        success: true,
        data: {
            matched: result.matchedCount,
            modified: result.modifiedCount
        },
        message: `${result.modifiedCount} inventory items restocked successfully`
    });
}));

export default router;