import logger from '../utils/logger.js';

/**
 * Standardized error handling middleware for consistent API responses
 */

/**
 * Standard API error response format
 */
export class ApiError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }

    static badRequest(message, details = null) {
        return new ApiError(message, 400, 'BAD_REQUEST', details);
    }

    static unauthorized(message = 'Unauthorized access') {
        return new ApiError(message, 401, 'UNAUTHORIZED');
    }

    static forbidden(message = 'Access forbidden') {
        return new ApiError(message, 403, 'FORBIDDEN');
    }

    static notFound(message = 'Resource not found') {
        return new ApiError(message, 404, 'NOT_FOUND');
    }

    static conflict(message, details = null) {
        return new ApiError(message, 409, 'CONFLICT', details);
    }

    static validationError(message, details = null) {
        return new ApiError(message, 422, 'VALIDATION_ERROR', details);
    }

    static internalError(message = 'Internal server error', details = null) {
        return new ApiError(message, 500, 'INTERNAL_ERROR', details);
    }

    static databaseError(message = 'Database operation failed', details = null) {
        return new ApiError(message, 500, 'DATABASE_ERROR', details);
    }

    static syncError(message = 'Data synchronization failed', details = null) {
        return new ApiError(message, 500, 'SYNC_ERROR', details);
    }

    toJSON() {
        return {
            success: false,
            error: {
                message: this.message,
                code: this.code,
                statusCode: this.statusCode,
                timestamp: this.timestamp,
                ...(this.details && { details: this.details })
            }
        };
    }
}

/**
 * Global error handler middleware
 */
export const globalErrorHandler = (error, req, res, next) => {
    let apiError;

    if (error instanceof ApiError) {
        apiError = error;
    } else if (error.name === 'ValidationError') {
        // Mongoose validation error
        const details = Object.values(error.errors).map(err => ({
            field: err.path,
            message: err.message,
            value: err.value
        }));
        apiError = ApiError.validationError('Validation failed', details);
    } else if (error.name === 'CastError') {
        // Mongoose cast error (invalid ObjectId, etc.)
        apiError = ApiError.badRequest(`Invalid ${error.path}: ${error.value}`);
    } else if (error.code === 11000) {
        // MongoDB duplicate key error
        const field = Object.keys(error.keyValue)[0];
        const value = error.keyValue[field];
        apiError = ApiError.conflict(`Duplicate value for ${field}: ${value}`, {
            field,
            value,
            type: 'duplicate_key'
        });
    } else if (error.name === 'JsonWebTokenError') {
        apiError = ApiError.unauthorized('Invalid authentication token');
    } else if (error.name === 'TokenExpiredError') {
        apiError = ApiError.unauthorized('Authentication token has expired');
    } else if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        apiError = ApiError.databaseError('Database operation failed', {
            mongoError: error.message,
            code: error.code
        });
    } else {
        // Generic error
        apiError = ApiError.internalError(
            process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
            process.env.NODE_ENV === 'development' ? { stack: error.stack } : null
        );
    }

    // Log error details
    logger.error('API Error:', {
        url: req.originalUrl,
        method: req.method,
        statusCode: apiError.statusCode,
        code: apiError.code,
        message: apiError.message,
        details: apiError.details,
        stack: error.stack,
        userId: req.user?.id || req.userId || 'anonymous',
        userAgent: req.get('User-Agent'),
        ip: req.ip
    });

    // Send standardized error response
    res.status(apiError.statusCode).json(apiError.toJSON());
};

/**
 * Async route wrapper to catch errors automatically
 */
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Validation error helper
 */
export const validateRequest = (validationSchema) => {
    return (req, res, next) => {
        try {
            const { error } = validationSchema.validate(req.body, { 
                abortEarly: false,
                stripUnknown: true 
            });
            
            if (error) {
                const details = error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message,
                    value: detail.context?.value
                }));
                
                throw ApiError.validationError('Request validation failed', details);
            }
            
            next();
        } catch (err) {
            next(err);
        }
    };
};

/**
 * Employee sync specific error handler
 */
export const handleSyncErrors = (operation) => {
    return asyncHandler(async (req, res, next) => {
        try {
            await operation(req, res, next);
        } catch (error) {
            if (error.message.includes('Employee not found')) {
                throw ApiError.badRequest('Invalid employee reference in sync data', {
                    type: 'employee_reference_error',
                    suggestion: 'Ensure employee exists before syncing transactions'
                });
            } else if (error.message.includes('duplicate')) {
                throw ApiError.conflict('Duplicate data detected', {
                    type: 'duplicate_data_error',
                    suggestion: 'Check for duplicate employee names or IDs'
                });
            } else if (error.message.includes('validation')) {
                throw ApiError.validationError('Data validation failed during sync', {
                    type: 'sync_validation_error',
                    originalError: error.message
                });
            } else {
                throw ApiError.syncError('Sync operation failed', {
                    type: 'general_sync_error',
                    originalError: error.message
                });
            }
        }
    });
};

/**
 * Success response helper
 */
export const sendSuccess = (res, data = null, message = 'Operation completed successfully', statusCode = 200) => {
    const response = {
        success: true,
        message,
        timestamp: new Date().toISOString(),
        ...(data && { data })
    };
    
    res.status(statusCode).json(response);
};

/**
 * Pagination helper for large datasets
 */
export const paginate = (query, page = 1, limit = 50, maxLimit = 100) => {
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(maxLimit, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;
    
    return {
        skip,
        limit: limitNum,
        page: pageNum,
        query: query.skip(skip).limit(limitNum)
    };
};