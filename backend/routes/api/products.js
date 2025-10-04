import express from 'express';
import mongoose from 'mongoose';
import Product from '../../models/Product.js';
import BaseRouteHandler from '../../utils/base-route-handler.js';
import { withErrorHandling } from '../../middleware/errorHandler.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// Create base route handler for products
const productHandler = new BaseRouteHandler(Product, {
    populate: [], // Add population fields if needed
    select: '', // Add field selection if needed
    searchFields: ['name', 'description', 'sku'],
    sortField: 'sortOrder',
    sortOrder: 1,
    requiredFields: ['name', 'category', 'price'],
    uniqueFields: [], // SKU uniqueness handled at schema level with sparse index
    ownerField: 'userId'
});

// Standard CRUD routes using base handler
productHandler.createRoutes(router);

// Additional product-specific routes

// Bulk reorder products
router.put('/reorder', withErrorHandling(async (req, res) => {
    const { products } = req.body;
    
    logger.info('Reorder request received', {
        category: 'DATABASE',
        operation: 'reorder_products_start',
        data: { 
            productsCount: products?.length || 0,
            userId: req.userId || req.user?._id,
            productsData: products,
            fullRequestBody: req.body
        }
    });
    
    // Enhanced request validation with detailed error codes
    if (!req.body || Object.keys(req.body).length === 0) {
        logger.error('Reorder validation failed - Empty request body', {
            category: 'DATABASE',
            operation: 'reorder_products_validation',
            data: { requestBody: req.body, hasBody: !!req.body }
        });
        return res.status(400).json({
            success: false,
            error: { 
                message: 'Request body is required for reorder operation',
                code: 'EMPTY_REQUEST_BODY',
                details: 'The request must include a body with products array'
            }
        });
    }
    
    if (!products) {
        logger.error('Reorder validation failed - Missing products array', {
            category: 'DATABASE',
            operation: 'reorder_products_validation',
            data: { requestBody: req.body, bodyKeys: Object.keys(req.body) }
        });
        return res.status(400).json({
            success: false,
            error: { 
                message: 'Products array is missing from request body',
                code: 'MISSING_PRODUCTS_ARRAY',
                details: `Request body contains: ${Object.keys(req.body).join(', ')}`
            }
        });
    }
    
    if (!Array.isArray(products)) {
        logger.error('Reorder validation failed - Products not an array', {
            category: 'DATABASE',
            operation: 'reorder_products_validation',
            data: { products, productsType: typeof products }
        });
        return res.status(400).json({
            success: false,
            error: { 
                message: 'Products must be an array',
                code: 'INVALID_PRODUCTS_TYPE',
                details: `Received ${typeof products}, expected array`
            }
        });
    }
    
    if (products.length === 0) {
        logger.error('Reorder validation failed - Empty products array', {
            category: 'DATABASE',
            operation: 'reorder_products_validation',
            data: { productsLength: products.length }
        });
        return res.status(400).json({
            success: false,
            error: { 
                message: 'Products array cannot be empty',
                code: 'EMPTY_PRODUCTS_ARRAY',
                details: 'At least one product must be provided for reordering'
            }
        });
    }
    
    const userId = req.userId || req.user._id;
    const updateOperations = [];
    const validationErrors = [];
    
    // Validate and prepare bulk operations with comprehensive error handling
    for (let i = 0; i < products.length; i++) {
        const product = products[i];
        
        // Check if product is an object
        if (!product || typeof product !== 'object') {
            validationErrors.push(`Product at index ${i}: Invalid product format - must be an object`);
            continue;
        }
        
        const { id, sortOrder } = product;
        
        // Enhanced ID validation with detailed error reporting
        if (!id) {
            validationErrors.push(`Product at index ${i}: Missing required field 'id' (MISSING_ID)`);
            continue;
        }
        
        if (typeof id !== 'string') {
            validationErrors.push(`Product at index ${i}: Field 'id' must be a string, received ${typeof id} (INVALID_ID_TYPE)`);
            continue;
        }
        
        if (id.trim().length === 0) {
            validationErrors.push(`Product at index ${i}: Field 'id' cannot be empty (EMPTY_ID)`);
            continue;
        }
        
        // Enhanced sortOrder validation
        if (sortOrder === undefined || sortOrder === null) {
            validationErrors.push(`Product at index ${i}: Missing required field 'sortOrder'`);
            continue;
        }
        
        if (typeof sortOrder !== 'number') {
            validationErrors.push(`Product at index ${i}: Field 'sortOrder' must be a number, received ${typeof sortOrder}`);
            continue;
        }
        
        if (sortOrder < 0 || !Number.isInteger(sortOrder)) {
            validationErrors.push(`Product at index ${i}: Field 'sortOrder' must be a non-negative integer, received ${sortOrder}`);
            continue;
        }
        
        // Validate MongoDB ObjectID format with comprehensive error reporting
        const trimmedId = id.trim();
        if (!mongoose.Types.ObjectId.isValid(trimmedId)) {
            validationErrors.push(`Product at index ${i}: Field 'id' is not a valid MongoDB ObjectID format (INVALID_OBJECTID) - received: "${id}" (length: ${id.length}, trimmed: "${trimmedId}", trimmed length: ${trimmedId.length})`);
            continue;
        }
        
        // Additional validation: check for duplicate IDs in the request
        const duplicateIndex = updateOperations.findIndex(op => 
            op.updateOne.filter._id.toString() === new mongoose.Types.ObjectId(id.trim()).toString()
        );
        
        if (duplicateIndex !== -1) {
            validationErrors.push(`Product at index ${i}: Duplicate ID found - same ID used at index ${duplicateIndex}`);
            continue;
        }
        
        try {
            updateOperations.push({
                updateOne: {
                    filter: { _id: new mongoose.Types.ObjectId(id.trim()), userId },
                    update: { sortOrder, syncStatus: 'pending' }
                }
            });
        } catch (objectIdError) {
            validationErrors.push(`Product at index ${i}: Failed to create ObjectID from '${id}' - ${objectIdError.message}`);
            continue;
        }
    }
    
    // Return validation errors if any
    if (validationErrors.length > 0) {
        logger.error('Reorder validation failed - Individual product validation errors', {
            category: 'DATABASE',
            operation: 'reorder_products_validation',
            data: { 
                errorCount: validationErrors.length,
                errors: validationErrors, 
                productsCount: products.length,
                products: products.map(p => ({ id: p.id, sortOrder: p.sortOrder, type: typeof p.id }))
            }
        });
        
        return res.status(400).json({
            success: false,
            error: { 
                message: `Validation failed for product reorder - ${validationErrors.length} error(s) found`,
                code: 'VALIDATION_FAILED',
                details: validationErrors,
                productsCount: products.length,
                errorCount: validationErrors.length
            }
        });
    }
    
    try {
        const result = await Product.bulkWrite(updateOperations);
        
        logger.info(`Products reordered successfully`, {
            category: 'DATABASE',
            operation: 'reorder_products_success',
            data: { 
                requested: products.length, 
                modified: result.modifiedCount,
                matchedCount: result.matchedCount,
                upsertedCount: result.upsertedCount
            }
        });
        
        res.json({
            success: true,
            data: { 
                modified: result.modifiedCount,
                matched: result.matchedCount,
                requested: products.length
            },
            message: 'Products reordered successfully'
        });
    } catch (error) {
        logger.error('Failed to reorder products', {
            category: 'DATABASE',
            operation: 'reorder_products_error',
            data: {
                error: error.message,
                stack: error.stack,
                products: products
            }
        });
        
        res.status(500).json({
            success: false,
            error: { 
                message: 'Database error while reordering products',
                details: error.message
            }
        });
    }
}));
router.get('/category/:category', withErrorHandling(async (req, res) => {
    const { category } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const query = {
        userId: req.userId || req.user._id,
        category,
        isActive: true
    };
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [products, total] = await Promise.all([
        Product.find(query)
            .sort({ sortOrder: 1, name: 1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        Product.countDocuments(query)
    ]);
    
    logger.info(`Retrieved products by category: ${category}`, {
        category: 'DATABASE',
        operation: 'get_products_by_category',
        data: { category, count: products.length }
    });
    
    res.json({
        success: true,
        data: products,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
}));

router.get('/search/:query', withErrorHandling(async (req, res) => {
    const { query } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const searchQuery = {
        userId: req.userId || req.user._id,
        isActive: true,
        $or: [
            { name: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } },
            { sku: { $regex: query, $options: 'i' } }
        ]
    };
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [products, total] = await Promise.all([
        Product.find(searchQuery)
            .sort({ sortOrder: 1, name: 1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        Product.countDocuments(searchQuery)
    ]);
    
    logger.info(`Search products: ${query}`, {
        category: 'DATABASE',
        operation: 'search_products',
        data: { query, count: products.length }
    });
    
    res.json({
        success: true,
        data: products,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
}));

router.patch('/:id/status', withErrorHandling(async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    
    const product = await Product.findOneAndUpdate(
        { _id: id, userId: req.user._id },
        { isActive, syncStatus: 'pending' },
        { new: true }
    );
    
    if (!product) {
        return res.status(404).json({
            success: false,
            error: { message: 'Product not found' }
        });
    }
    
    logger.info(`Updated product status: ${id}`, {
        category: 'DATABASE',
        operation: 'update_product_status',
        data: { id, isActive }
    });
    
    res.json({
        success: true,
        data: product,
        message: 'Product status updated successfully'
    });
}));

router.get('/popular', withErrorHandling(async (req, res) => {
    const { limit = 10 } = req.query;
    
    // This would typically involve transaction data, but for now return active products
    const products = await Product.find({
        userId: req.userId || req.user._id,
        isActive: true
    })
        .sort({ sortOrder: 1, name: 1 }) // In real implementation, sort by usage/sales
        .limit(parseInt(limit))
        .lean();
    
    res.json({
        success: true,
        data: products,
        message: 'Popular products retrieved successfully'
    });
}));

export default router;