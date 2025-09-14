import express from 'express';
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
    sortField: 'name',
    sortOrder: 1,
    requiredFields: ['name', 'category', 'price'],
    uniqueFields: [], // SKU uniqueness handled at schema level with sparse index
    ownerField: 'userId'
});

// Standard CRUD routes using base handler
productHandler.createRoutes(router);

// Additional product-specific routes
router.get('/category/:category', withErrorHandling(async (req, res) => {
    const { category } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const query = {
        userId: req.user._id,
        category,
        isActive: true
    };
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [products, total] = await Promise.all([
        Product.find(query)
            .sort({ name: 1 })
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
        userId: req.user._id,
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
            .sort({ name: 1 })
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
        userId: req.user._id,
        isActive: true
    })
        .sort({ name: 1 }) // In real implementation, sort by usage/sales
        .limit(parseInt(limit))
        .lean();
    
    res.json({
        success: true,
        data: products,
        message: 'Popular products retrieved successfully'
    });
}));

export default router;