import express from 'express';
import InventoryItem from '../../models/InventoryItem.js';
import BaseRouteHandler from '../../utils/base-route-handler.js';
import { withErrorHandling } from '../../middleware/errorHandler.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// Additional inventory-specific routes (MUST come before base routes)
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
    
    // Handle both MongoDB ObjectId and string IDs from frontend
    let item;
    try {
        // Try to find by MongoDB _id first
        if (id.match(/^[0-9a-fA-F]{24}$/)) {
            item = await InventoryItem.findOne({
                _id: id,
                userId: req.user._id
            });
        }
        
        // If not found by _id, try to find by name or other identifiers
        if (!item) {
            item = await InventoryItem.findOne({
                $or: [
                    { _id: id },
                    { name: { $regex: new RegExp(id, 'i') } } // Case insensitive name search
                ],
                userId: req.user._id
            });
        }
    } catch (error) {
        console.error('❌ [INVENTORY] Error finding item for stock update:', error);
        item = null;
    }
    
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

// Clean up duplicate inventory items
router.post('/cleanup-duplicates', withErrorHandling(async (req, res) => {
    console.log('🧹 [INVENTORY] Starting duplicate cleanup for user:', req.user._id);
    
    const pipeline = [
        { $match: { userId: req.user._id } },
        {
            $group: {
                _id: { 
                    name: "$name", 
                    category: "$category" 
                },
                items: { $push: "$$ROOT" },
                count: { $sum: 1 }
            }
        },
        { $match: { count: { $gt: 1 } } }
    ];
    
    const duplicateGroups = await InventoryItem.aggregate(pipeline);
    let deletedCount = 0;
    
    for (const group of duplicateGroups) {
        // Sort by createdAt and keep the oldest item, delete the rest
        const sortedItems = group.items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        const itemsToDelete = sortedItems.slice(1); // Keep first (oldest), delete rest
        
        for (const item of itemsToDelete) {
            await InventoryItem.findByIdAndDelete(item._id);
            deletedCount++;
            console.log('🗑️ [INVENTORY] Deleted duplicate:', item.name, 'ID:', item._id);
        }
    }
    
    logger.info('Inventory duplicate cleanup completed', {
        category: 'DATABASE',
        operation: 'cleanup_duplicates',
        data: { 
            userId: req.user._id,
            duplicateGroups: duplicateGroups.length,
            deletedCount 
        }
    });
    
    res.json({
        success: true,
        message: `Cleaned up ${deletedCount} duplicate inventory items`,
        duplicateGroups: duplicateGroups.length,
        deletedCount
    });
}));

// Create base route handler for inventory (MUST come after specific routes)
const inventoryHandler = new BaseRouteHandler(InventoryItem, {
    populate: [], // Add population fields if needed
    searchFields: ['name', 'description'],
    sortField: 'name',
    sortOrder: 1,
    requiredFields: ['name', 'currentStock'],
    uniqueFields: [], // REMOVED: SKU uniqueness constraint - not needed
    ownerField: 'userId'
});

// Standard CRUD routes using base handler
inventoryHandler.createRoutes(router);

export default router;