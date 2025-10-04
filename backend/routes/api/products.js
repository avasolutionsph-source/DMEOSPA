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

// Additional product-specific routes (BEFORE base handler to avoid conflicts)

// Bulk reorder products
router.put('/reorder', withErrorHandling(async (req, res) => {
    console.log('🔥 REORDER ENDPOINT HIT - RAW REQUEST DATA:');
    console.log('🔥 req.body:', JSON.stringify(req.body, null, 2));
    console.log('🔥 req.headers:', JSON.stringify(req.headers, null, 2));
    console.log('🔥 req.userId:', req.userId);
    console.log('🔥 req.user:', req.user);
    
    const { products } = req.body;
    
    console.log('🔥 EXTRACTED PRODUCTS:', JSON.stringify(products, null, 2));
    console.log('🔥 PRODUCTS TYPE:', typeof products);
    console.log('🔥 PRODUCTS IS_ARRAY:', Array.isArray(products));
    console.log('🔥 PRODUCTS LENGTH:', products?.length);
    
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
    
    // TEMPORARY: Simplified validation for debugging
    console.log('🔥 VALIDATION CHECK 1: req.body exists?', !!req.body);
    console.log('🔥 VALIDATION CHECK 2: req.body keys:', req.body ? Object.keys(req.body) : 'NO BODY');
    console.log('🔥 VALIDATION CHECK 3: products exists?', !!products);
    console.log('🔥 VALIDATION CHECK 4: products is array?', Array.isArray(products));
    console.log('🔥 VALIDATION CHECK 5: products length:', products ? products.length : 'NO PRODUCTS');
    
    // Basic validation only for now
    if (!products || !Array.isArray(products) || products.length === 0) {
        console.log('🔥 BASIC VALIDATION FAILED - returning 400');
        return res.status(400).json({
            success: false,
            error: { 
                message: 'SIMPLIFIED: Products array is required',
                code: 'SIMPLE_VALIDATION_FAILED',
                debug: {
                    hasProducts: !!products,
                    isArray: Array.isArray(products),
                    length: products ? products.length : 0,
                    bodyKeys: req.body ? Object.keys(req.body) : []
                }
            }
        });
    }
    
    console.log('🔥 BASIC VALIDATION PASSED - proceeding with simplified logic');
    
    const userId = req.userId || req.user._id;
    const updateOperations = [];
    const validationErrors = [];
    
    // TEMPORARY: Simplified product validation for debugging
    console.log('🔥 STARTING PRODUCT LOOP - products.length:', products.length);
    
    for (let i = 0; i < products.length; i++) {
        const product = products[i];
        console.log(`🔥 PRODUCT ${i}:`, JSON.stringify(product, null, 2));
        
        const { id, sortOrder } = product;
        console.log(`🔥 PRODUCT ${i} - id:`, id, 'sortOrder:', sortOrder);
        
        // Very basic validation
        if (!id || typeof sortOrder !== 'number') {
            console.log(`🔥 PRODUCT ${i} - BASIC VALIDATION FAILED`);
            validationErrors.push(`Product ${i}: Basic validation failed - id: ${!!id}, sortOrder: ${typeof sortOrder}`);
            continue;
        }
        
        // Skip ObjectId validation temporarily - just use the ID as-is
        try {
            console.log(`🔥 PRODUCT ${i} - Creating update operation`);
            updateOperations.push({
                updateOne: {
                    filter: { _id: new mongoose.Types.ObjectId(id.toString().trim()), userId },
                    update: { sortOrder, syncStatus: 'pending' }
                }
            });
            console.log(`🔥 PRODUCT ${i} - Update operation created successfully`);
        } catch (objectIdError) {
            console.log(`🔥 PRODUCT ${i} - ObjectId creation failed:`, objectIdError.message);
            validationErrors.push(`Product ${i}: ObjectId error - ${objectIdError.message}`);
            continue;
        }
    }
    
    console.log('🔥 PRODUCT LOOP COMPLETE - updateOperations.length:', updateOperations.length);
    console.log('🔥 PRODUCT LOOP COMPLETE - validationErrors.length:', validationErrors.length);
    
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

// Standard CRUD routes using base handler (AFTER custom routes)
productHandler.createRoutes(router);

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