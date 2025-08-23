/**
 * Unified Error Handling Middleware for Backend
 * Standardizes error handling across all API routes
 */

import logger from '../utils/logger.js';

// Error types matching frontend
export const ErrorTypes = {
    NETWORK: 'NETWORK',
    AUTHENTICATION: 'AUTHENTICATION', 
    VALIDATION: 'VALIDATION',
    DATABASE: 'DATABASE',
    PERMISSION: 'PERMISSION',
    BUSINESS_LOGIC: 'BUSINESS_LOGIC',
    SYSTEM: 'SYSTEM',
    USER_INPUT: 'USER_INPUT'
};

// Error severity levels
export const ErrorSeverity = {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    CRITICAL: 'CRITICAL'
};

class UnifiedBackendErrorHandler {
    constructor() {
        this.errorCounts = new Map();
    }
    
    /**
     * Express error handling middleware
     */
    middleware() {
        return (err, req, res, next) => {
            const errorInfo = this.analyzeError(err, req);
            this.logError(errorInfo);
            this.trackError(errorInfo);
            this.sendErrorResponse(res, errorInfo);
        };
    }
    
    analyzeError(error, req) {
        const errorInfo = {
            timestamp: new Date().toISOString(),
            message: this.extractErrorMessage(error),
            type: this.determineErrorType(error, req),
            severity: this.determineSeverity(error),
            statusCode: this.determineStatusCode(error),
            path: req?.path,
            method: req?.method,
            userAgent: req?.get('User-Agent'),
            ip: req?.ip,
            stack: error?.stack,
            code: error?.code
        };
        
        return errorInfo;
    }
    
    extractErrorMessage(error) {
        if (typeof error === 'string') return error;
        if (error?.message) return error.message;
        return 'Internal server error';
    }
    
    determineErrorType(error, req) {
        const message = this.extractErrorMessage(error).toLowerCase();
        const path = req?.path || '';
        
        if (message.includes('auth') || message.includes('token') || path.includes('/auth')) {
            return ErrorTypes.AUTHENTICATION;
        }
        if (message.includes('validation') || message.includes('invalid') || error.name === 'ValidationError') {
            return ErrorTypes.VALIDATION;
        }
        if (message.includes('permission') || message.includes('forbidden') || error.statusCode === 403) {
            return ErrorTypes.PERMISSION;
        }
        if (message.includes('database') || message.includes('db') || error.name === 'MongoError') {
            return ErrorTypes.DATABASE;
        }
        if (message.includes('cast') || message.includes('objectid')) {
            return ErrorTypes.USER_INPUT;
        }
        
        return ErrorTypes.SYSTEM;
    }
    
    determineSeverity(error) {
        const statusCode = error.statusCode || error.status || 500;
        
        if (statusCode >= 500) {
            return ErrorSeverity.CRITICAL;
        }
        if (statusCode === 401 || statusCode === 403) {
            return ErrorSeverity.HIGH;
        }
        if (statusCode >= 400) {
            return ErrorSeverity.MEDIUM;
        }
        
        return ErrorSeverity.LOW;
    }
    
    determineStatusCode(error) {
        if (error.statusCode) return error.statusCode;
        if (error.status) return error.status;
        
        const type = this.determineErrorType(error);
        
        switch (type) {
            case ErrorTypes.AUTHENTICATION:
                return 401;
            case ErrorTypes.PERMISSION:
                return 403;
            case ErrorTypes.VALIDATION:
            case ErrorTypes.USER_INPUT:
                return 400;
            case ErrorTypes.DATABASE:
                return 500;
            default:
                return 500;
        }
    }
    
    logError(errorInfo) {
        const logData = {
            type: errorInfo.type,
            severity: errorInfo.severity,
            statusCode: errorInfo.statusCode,
            path: errorInfo.path,
            method: errorInfo.method,
            userAgent: errorInfo.userAgent,
            ip: errorInfo.ip
        };
        
        switch (errorInfo.severity) {
            case ErrorSeverity.CRITICAL:
            case ErrorSeverity.HIGH:
                logger.error(`${errorInfo.type} Error: ${errorInfo.message}`, logData);
                if (errorInfo.stack) {
                    logger.error('Stack trace:', { stack: errorInfo.stack });
                }
                break;
            case ErrorSeverity.MEDIUM:
                logger.warn(`${errorInfo.type} Warning: ${errorInfo.message}`, logData);
                break;
            default:
                logger.info(`${errorInfo.type} Info: ${errorInfo.message}`, logData);
        }
    }
    
    trackError(errorInfo) {
        const key = `${errorInfo.type}:${errorInfo.path}`;
        const count = this.errorCounts.get(key) || 0;
        this.errorCounts.set(key, count + 1);
        
        if (count > 10) {
            logger.warn(`High frequency error detected: ${key}`, {
                count: count + 1,
                errorType: errorInfo.type,
                path: errorInfo.path
            });
        }
    }
    
    sendErrorResponse(res, errorInfo) {
        const response = {
            success: false,
            error: {
                type: errorInfo.type,
                message: this.generateUserMessage(errorInfo),
                code: errorInfo.code
            },
            timestamp: errorInfo.timestamp
        };
        
        // Include additional debug info in development
        if (process.env.NODE_ENV !== 'production') {
            response.debug = {
                originalMessage: errorInfo.message,
                path: errorInfo.path,
                method: errorInfo.method
            };
        }
        
        res.status(errorInfo.statusCode).json(response);
    }
    
    generateUserMessage(errorInfo) {
        switch (errorInfo.type) {
            case ErrorTypes.AUTHENTICATION:
                return 'Authentication required. Please log in to continue.';
            case ErrorTypes.PERMISSION:
                return 'You do not have permission to perform this action.';
            case ErrorTypes.VALIDATION:
                return 'Invalid input data provided.';
            case ErrorTypes.USER_INPUT:
                return 'Invalid request format or parameters.';
            case ErrorTypes.DATABASE:
                return 'Unable to process request. Please try again later.';
            default:
                return 'An unexpected error occurred. Please try again.';
        }
    }
    
    getErrorStats() {
        return Object.fromEntries(this.errorCounts);
    }
    
    clearErrorStats() {
        this.errorCounts.clear();
    }
}

// Create global instance
const backendErrorHandler = new UnifiedBackendErrorHandler();

/**
 * Async wrapper for route handlers with error handling
 */
export function withErrorHandling(asyncFn) {
    return async (req, res, next) => {
        try {
            await asyncFn(req, res, next);
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Create custom error with type and status code
 */
export function createError(message, type = ErrorTypes.SYSTEM, statusCode = 500, code = null) {
    const error = new Error(message);
    error.type = type;
    error.statusCode = statusCode;
    error.code = code;
    return error;
}

/**
 * Validation error helper
 */
export function validationError(message, field = null) {
    const error = createError(message, ErrorTypes.VALIDATION, 400);
    if (field) error.field = field;
    return error;
}

/**
 * Authentication error helper
 */
export function authError(message = 'Authentication required') {
    return createError(message, ErrorTypes.AUTHENTICATION, 401);
}

/**
 * Permission error helper
 */
export function permissionError(message = 'Permission denied') {
    return createError(message, ErrorTypes.PERMISSION, 403);
}

/**
 * Database error helper
 */
export function databaseError(message = 'Database operation failed') {
    return createError(message, ErrorTypes.DATABASE, 500);
}

export { backendErrorHandler as ErrorHandler };
export default backendErrorHandler.middleware();