import express from 'express';
import Customer from '../../models/Customer.js';
import BaseRouteHandler from '../../utils/base-route-handler.js';
import { withErrorHandling } from '../../middleware/errorHandler.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// Create base route handler for customers
const customerHandler = new BaseRouteHandler(Customer, {
    populate: [], // Add population fields if needed
    searchFields: ['firstName', 'lastName', 'email', 'phone'],
    sortField: 'firstName',
    sortOrder: 1,
    requiredFields: ['firstName', 'lastName'],
    uniqueFields: ['email'], // Email should be unique per user
    ownerField: 'userId'
});

// Standard CRUD routes using base handler
customerHandler.createRoutes(router);

// Additional customer-specific routes
router.get('/search/:query', withErrorHandling(async (req, res) => {
    const { query } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const searchQuery = {
        userId: req.user._id,
        $or: [
            { firstName: new RegExp(query, 'i') },
            { lastName: new RegExp(query, 'i') },
            { email: new RegExp(query, 'i') },
            { phone: new RegExp(query, 'i') }
        ]
    };

    const customers = await Customer.find(searchQuery)
        .sort({ firstName: 1, lastName: 1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .exec();
    
    const total = await Customer.countDocuments(searchQuery);
    
    res.json({
        success: true,
        data: customers,
        pagination: {
            current: page,
            pages: Math.ceil(total / limit),
            total
        }
    });
}));

export default router;