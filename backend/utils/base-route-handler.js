/**
 * Base Route Handler - Eliminates duplicate CRUD patterns in backend routes
 * Provides standardized patterns for common database operations
 */

import { withErrorHandling, createError, validationError } from '../middleware/unifiedErrorHandler.js';
import logger from './logger.js';

export class BaseRouteHandler {
    constructor(model, options = {}) {
        this.model = model;
        this.modelName = model.modelName || 'Resource';
        this.populateFields = options.populate || [];
        this.selectFields = options.select || '';
        this.searchFields = options.searchFields || ['name'];
        this.sortField = options.sortField || 'createdAt';
        this.sortOrder = options.sortOrder || -1;
        
        // Validation options
        this.requiredFields = options.requiredFields || [];
        this.uniqueFields = options.uniqueFields || [];
        
        // Permission options
        this.requireAuth = options.requireAuth !== false; // Default true
        this.ownerField = options.ownerField || 'userId';
    }
    
    /**
     * Get all resources with pagination, search, and filtering
     */
    getAll() {
        return withErrorHandling(async (req, res) => {
            const {
                page = 1,
                limit = 50,
                search = '',
                sortBy = this.sortField,
                sortOrder = this.sortOrder,
                ...filters
            } = req.query;
            
            // Build query
            let query = {};
            
            // Add user-specific filtering if owner field exists
            if (this.requireAuth && this.ownerField && req.user) {
                query[this.ownerField] = req.user.id || req.user._id;
            }
            
            // Add search functionality
            if (search) {
                const searchQuery = {
                    $or: this.searchFields.map(field => ({
                        [field]: { $regex: search, $options: 'i' }
                    }))
                };
                query = { ...query, ...searchQuery };
            }
            
            // Add filters
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== '') {
                    query[key] = value;
                }
            });
            
            // Execute query with pagination
            const skip = (parseInt(page) - 1) * parseInt(limit);
            const [items, total] = await Promise.all([
                this.model
                    .find(query)
                    .populate(this.populateFields)
                    .select(this.selectFields)
                    .sort({ [sortBy]: parseInt(sortOrder) })
                    .skip(skip)
                    .limit(parseInt(limit))
                    .lean(),
                this.model.countDocuments(query)
            ]);
            
            logger.info(`Retrieved ${items.length} ${this.modelName.toLowerCase()} items`, {
                category: 'DATABASE',
                operation: 'get_all',
                data: { count: items.length, total, page, limit }
            });
            
            res.json({
                success: true,
                data: items,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                }
            });
        });
    }
    
    /**
     * Get single resource by ID
     */
    getById() {
        return withErrorHandling(async (req, res) => {
            const { id } = req.params;
            
            let query = { _id: id };
            
            // Add user-specific filtering if owner field exists
            if (this.requireAuth && this.ownerField && req.user) {
                query[this.ownerField] = req.user.id || req.user._id;
            }
            
            const item = await this.model
                .findOne(query)
                .populate(this.populateFields)
                .select(this.selectFields)
                .lean();
            
            if (!item) {
                throw createError(`${this.modelName} not found`, 'VALIDATION', 404);
            }
            
            logger.debug(`Retrieved ${this.modelName.toLowerCase()} by ID`, {
                category: 'DATABASE',
                operation: 'get_by_id',
                data: { id }
            });
            
            res.json({
                success: true,
                data: item
            });
        });
    }
    
    /**
     * Create new resource
     */
    create() {
        return withErrorHandling(async (req, res) => {
            const data = req.body;
            
            // Add user ID if owner field exists
            if (this.requireAuth && this.ownerField && req.user) {
                data[this.ownerField] = req.user.id || req.user._id;
            }
            
            // Generate unique localId for models with compound unique index if not provided
            if ((this.modelName === 'Employee' || this.modelName === 'Product') && !data.localId) {
                // Generate a unique localId using timestamp and random string
                data.localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }
            
            // Validate required fields
            this.validateRequiredFields(data);
            
            // Check unique fields
            await this.validateUniqueFields(data);
            
            const item = new this.model(data);
            await item.save();
            
            // Populate the created item before returning
            await item.populate(this.populateFields);
            
            logger.info(`Created new ${this.modelName.toLowerCase()}`, {
                category: 'DATABASE',
                operation: 'create',
                data: { id: item._id }
            });
            
            res.status(201).json({
                success: true,
                data: item,
                message: `${this.modelName} created successfully`
            });
        });
    }
    
    /**
     * Update existing resource
     */
    update() {
        return withErrorHandling(async (req, res) => {
            const { id } = req.params;
            const data = req.body;
            
            let query = { _id: id };
            
            // Add user-specific filtering if owner field exists
            if (this.requireAuth && this.ownerField && req.user) {
                query[this.ownerField] = req.user.id || req.user._id;
            }
            
            // Check unique fields (excluding current record)
            await this.validateUniqueFields(data, id);
            
            const item = await this.model
                .findOneAndUpdate(query, data, { 
                    new: true, 
                    runValidators: true 
                })
                .populate(this.populateFields);
            
            if (!item) {
                throw createError(`${this.modelName} not found`, 'VALIDATION', 404);
            }
            
            logger.info(`Updated ${this.modelName.toLowerCase()}`, {
                category: 'DATABASE',
                operation: 'update',
                data: { id }
            });
            
            res.json({
                success: true,
                data: item,
                message: `${this.modelName} updated successfully`
            });
        });
    }
    
    /**
     * Partially update existing resource
     */
    partialUpdate() {
        return withErrorHandling(async (req, res) => {
            const { id } = req.params;
            const updates = req.body;
            
            let query = { _id: id };
            
            // Add user-specific filtering if owner field exists
            if (this.requireAuth && this.ownerField && req.user) {
                query[this.ownerField] = req.user.id || req.user._id;
            }
            
            // Only validate unique fields that are being updated
            const uniqueFieldsToCheck = {};
            this.uniqueFields.forEach(field => {
                if (updates.hasOwnProperty(field)) {
                    uniqueFieldsToCheck[field] = updates[field];
                }
            });
            
            if (Object.keys(uniqueFieldsToCheck).length > 0) {
                await this.validateUniqueFields(uniqueFieldsToCheck, id);
            }
            
            const item = await this.model
                .findOneAndUpdate(query, { $set: updates }, { 
                    new: true, 
                    runValidators: true 
                })
                .populate(this.populateFields);
            
            if (!item) {
                throw createError(`${this.modelName} not found`, 'VALIDATION', 404);
            }
            
            logger.info(`Partially updated ${this.modelName.toLowerCase()}`, {
                category: 'DATABASE',
                operation: 'partial_update',
                data: { id, fields: Object.keys(updates) }
            });
            
            res.json({
                success: true,
                data: item,
                message: `${this.modelName} updated successfully`
            });
        });
    }
    
    /**
     * Delete resource
     */
    delete() {
        return withErrorHandling(async (req, res) => {
            const { id } = req.params;
            
            let query = { _id: id };
            
            // Add user-specific filtering if owner field exists
            if (this.requireAuth && this.ownerField && req.user) {
                query[this.ownerField] = req.user.id || req.user._id;
            }
            
            const item = await this.model.findOneAndDelete(query);
            
            if (!item) {
                throw createError(`${this.modelName} not found`, 'VALIDATION', 404);
            }
            
            logger.info(`Deleted ${this.modelName.toLowerCase()}`, {
                category: 'DATABASE',
                operation: 'delete',
                data: { id }
            });
            
            res.json({
                success: true,
                message: `${this.modelName} deleted successfully`
            });
        });
    }
    
    /**
     * Bulk operations
     */
    bulkCreate() {
        return withErrorHandling(async (req, res) => {
            const { items } = req.body;
            
            if (!Array.isArray(items) || items.length === 0) {
                throw validationError('Items array is required and must not be empty');
            }
            
            // Add user ID to all items if owner field exists
            if (this.requireAuth && this.ownerField && req.user) {
                items.forEach(item => {
                    item[this.ownerField] = req.user.id || req.user._id;
                });
            }
            
            const createdItems = await this.model.insertMany(items, { 
                ordered: false, 
                lean: true 
            });
            
            logger.info(`Bulk created ${createdItems.length} ${this.modelName.toLowerCase()} items`, {
                category: 'DATABASE',
                operation: 'bulk_create',
                data: { count: createdItems.length }
            });
            
            res.status(201).json({
                success: true,
                data: createdItems,
                message: `${createdItems.length} ${this.modelName.toLowerCase()} items created successfully`
            });
        });
    }
    
    bulkUpdate() {
        return withErrorHandling(async (req, res) => {
            const { updates } = req.body;
            
            if (!Array.isArray(updates) || updates.length === 0) {
                throw validationError('Updates array is required and must not be empty');
            }
            
            const operations = updates.map(update => {
                let filter = { _id: update.id };
                
                // Add user-specific filtering if owner field exists
                if (this.requireAuth && this.ownerField && req.user) {
                    filter[this.ownerField] = req.user.id || req.user._id;
                }
                
                return {
                    updateOne: {
                        filter,
                        update: { $set: update.data },
                        upsert: false
                    }
                };
            });
            
            const result = await this.model.bulkWrite(operations);
            
            logger.info(`Bulk updated ${result.modifiedCount} ${this.modelName.toLowerCase()} items`, {
                category: 'DATABASE',
                operation: 'bulk_update',
                data: { 
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
                message: `${result.modifiedCount} ${this.modelName.toLowerCase()} items updated successfully`
            });
        });
    }
    
    bulkDelete() {
        return withErrorHandling(async (req, res) => {
            const { ids } = req.body;
            
            if (!Array.isArray(ids) || ids.length === 0) {
                throw validationError('IDs array is required and must not be empty');
            }
            
            let query = { _id: { $in: ids } };
            
            // Add user-specific filtering if owner field exists
            if (this.requireAuth && this.ownerField && req.user) {
                query[this.ownerField] = req.user.id || req.user._id;
            }
            
            const result = await this.model.deleteMany(query);
            
            logger.info(`Bulk deleted ${result.deletedCount} ${this.modelName.toLowerCase()} items`, {
                category: 'DATABASE',
                operation: 'bulk_delete',
                data: { count: result.deletedCount }
            });
            
            res.json({
                success: true,
                data: {
                    deletedCount: result.deletedCount
                },
                message: `${result.deletedCount} ${this.modelName.toLowerCase()} items deleted successfully`
            });
        });
    }
    
    // Validation helpers
    validateRequiredFields(data) {
        const missing = this.requiredFields.filter(field => !data[field]);
        if (missing.length > 0) {
            throw validationError(`Missing required fields: ${missing.join(', ')}`);
        }
    }
    
    async validateUniqueFields(data, excludeId = null) {
        for (const field of this.uniqueFields) {
            if (data[field]) {
                let query = { [field]: data[field] };
                
                // Exclude current record from uniqueness check
                if (excludeId) {
                    query._id = { $ne: excludeId };
                }
                
                // Add user-specific scope if owner field exists
                if (this.requireAuth && this.ownerField) {
                    // Note: We can't check req.user here, so this should be handled
                    // by the calling method or we need to pass user context
                }
                
                const existing = await this.model.findOne(query);
                if (existing) {
                    throw validationError(`${field} must be unique. Value '${data[field]}' already exists.`);
                }
            }
        }
    }
    
    // Helper to create all standard routes
    createRoutes(router) {
        router.get('/', this.getAll());
        router.get('/:id', this.getById());
        router.post('/', this.create());
        router.put('/:id', this.update());
        router.patch('/:id', this.partialUpdate());
        router.delete('/:id', this.delete());
        router.post('/bulk', this.bulkCreate());
        router.put('/bulk', this.bulkUpdate());
        router.delete('/bulk', this.bulkDelete());
        
        return router;
    }
}

export default BaseRouteHandler;