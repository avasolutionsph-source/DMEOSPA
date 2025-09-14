/**
 * Unified Error Handler Middleware
 * Consolidates all error handling patterns into a single, comprehensive middleware
 */

import logger from '../utils/logger.js';

// Error types for consistent categorization
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

/**
 * Custom API Error class for standardized error responses
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
 * Async handler wrapper to catch errors in async routes
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Alias for asyncHandler for backward compatibility
 */
export const withErrorHandling = asyncHandler;

/**
 * Determine error type from error object and request context
 */
function determineErrorType(error, req) {
  const message = (error?.message || '').toLowerCase();
  const path = req?.path || '';
  
  if (error instanceof ApiError) {
    // Map ApiError codes to error types
    switch (error.code) {
      case 'UNAUTHORIZED':
        return ErrorTypes.AUTHENTICATION;
      case 'FORBIDDEN':
        return ErrorTypes.PERMISSION;
      case 'VALIDATION_ERROR':
      case 'BAD_REQUEST':
        return ErrorTypes.VALIDATION;
      case 'DATABASE_ERROR':
        return ErrorTypes.DATABASE;
      case 'SYNC_ERROR':
        return ErrorTypes.BUSINESS_LOGIC;
      default:
        return ErrorTypes.SYSTEM;
    }
  }
  
  if (message.includes('auth') || message.includes('token') || path.includes('/auth')) {
    return ErrorTypes.AUTHENTICATION;
  }
  if (message.includes('validation') || message.includes('invalid') || error.name === 'ValidationError') {
    return ErrorTypes.VALIDATION;
  }
  if (message.includes('permission') || message.includes('forbidden') || error.statusCode === 403) {
    return ErrorTypes.PERMISSION;
  }
  if (message.includes('database') || message.includes('db') || error.name === 'MongoError' || error.name === 'MongoServerError') {
    return ErrorTypes.DATABASE;
  }
  if (message.includes('cast') || message.includes('objectid') || error.name === 'CastError') {
    return ErrorTypes.USER_INPUT;
  }
  
  return ErrorTypes.SYSTEM;
}

/**
 * Determine error severity based on status code and type
 */
function determineSeverity(error) {
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

/**
 * Main error handler middleware
 */
export const errorHandler = (err, req, res, next) => {
  let apiError;

  // Convert various error types to ApiError
  if (err instanceof ApiError) {
    apiError = err;
  } else if (err.name === 'ValidationError') {
    // Mongoose validation error
    const details = Object.values(err.errors || {}).map(e => ({
      field: e.path,
      message: e.message,
      value: e.value
    }));
    apiError = ApiError.validationError('Validation failed', details);
  } else if (err.name === 'CastError') {
    // Mongoose cast error (invalid ObjectId, etc.)
    apiError = ApiError.badRequest(`Invalid ${err.path}: ${err.value}`);
  } else if (err.code === 11000) {
    // MongoDB duplicate key error
    const field = Object.keys(err.keyValue || {})[0];
    const value = err.keyValue?.[field];
    apiError = ApiError.conflict(`Duplicate value for ${field}: ${value}`, {
      field,
      value,
      type: 'duplicate_key'
    });
  } else if (err.name === 'JsonWebTokenError') {
    apiError = ApiError.unauthorized('Invalid authentication token');
  } else if (err.name === 'TokenExpiredError') {
    apiError = ApiError.unauthorized('Authentication token has expired');
  } else if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    apiError = ApiError.databaseError('Database operation failed', {
      mongoError: err.message,
      code: err.code
    });
  } else if (err.name === 'UnauthorizedError') {
    apiError = ApiError.unauthorized(err.message);
  } else {
    // Generic error
    apiError = ApiError.internalError(
      process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      process.env.NODE_ENV === 'development' ? { stack: err.stack } : null
    );
  }

  // Determine error type and severity for logging
  const errorType = determineErrorType(apiError, req);
  const severity = determineSeverity(apiError);
  
  // Log error details
  const logData = {
    url: req.originalUrl,
    method: req.method,
    statusCode: apiError.statusCode,
    code: apiError.code,
    type: errorType,
    severity: severity,
    message: apiError.message,
    details: apiError.details,
    userId: req.user?.id || req.userId || 'anonymous',
    userAgent: req.get('User-Agent'),
    ip: req.ip
  };

  // Log based on severity
  switch (severity) {
    case ErrorSeverity.CRITICAL:
    case ErrorSeverity.HIGH:
      logger.error(`${errorType} Error:`, logData);
      if (err.stack && process.env.NODE_ENV !== 'production') {
        logger.error('Stack trace:', { stack: err.stack });
      }
      break;
    case ErrorSeverity.MEDIUM:
      logger.warn(`${errorType} Warning:`, logData);
      break;
    default:
      logger.info(`${errorType} Info:`, logData);
  }

  // Send standardized error response
  res.status(apiError.statusCode).json(apiError.toJSON());
};

/**
 * Not found handler middleware
 */
export const notFound = (req, res, next) => {
  const error = ApiError.notFound(`Not found - ${req.originalUrl}`);
  next(error);
};

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

// Export default error handler
export default errorHandler;