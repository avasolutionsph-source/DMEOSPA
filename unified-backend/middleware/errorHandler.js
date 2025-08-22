// Unified Error Handler Middleware
// Consolidates error handling from all three backends

import logger from '../utils/logger.js';

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Async error wrapper for route handlers
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * MongoDB/Mongoose error handler
 */
const handleDatabaseError = (error) => {
  if (error.name === 'CastError') {
    return new AppError('Invalid ID format', 400, 'INVALID_ID');
  }
  
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return new AppError(
      `Duplicate value for ${field}`,
      409,
      'DUPLICATE_ENTRY',
      { field, value: error.keyValue[field] }
    );
  }
  
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
    return new AppError('Validation failed', 400, 'VALIDATION_ERROR', { errors });
  }
  
  return null;
};

/**
 * JWT error handler
 */
const handleJWTError = (error) => {
  if (error.name === 'JsonWebTokenError') {
    return new AppError('Invalid token', 401, 'INVALID_TOKEN');
  }
  
  if (error.name === 'TokenExpiredError') {
    return new AppError('Token expired', 401, 'TOKEN_EXPIRED');
  }
  
  return null;
};

/**
 * Multer file upload error handler
 */
const handleMulterError = (error) => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return new AppError('File too large', 413, 'FILE_TOO_LARGE');
  }
  
  if (error.code === 'LIMIT_FILE_COUNT') {
    return new AppError('Too many files', 400, 'TOO_MANY_FILES');
  }
  
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return new AppError('Unexpected field', 400, 'UNEXPECTED_FIELD');
  }
  
  return null;
};

/**
 * Main error handler middleware
 */
export const errorHandler = (err, req, res, next) => {
  // Don't log in test environment unless specified
  if (process.env.NODE_ENV !== 'test' || process.env.LOG_ERRORS === 'true') {
    logger.error('Error caught by handler:', {
      error: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userId: req.user?.id,
      businessId: req.businessId
    });
  }
  
  // Handle specific error types
  let error = err;
  
  // Database errors
  const dbError = handleDatabaseError(err);
  if (dbError) error = dbError;
  
  // JWT errors
  const jwtError = handleJWTError(err);
  if (jwtError) error = jwtError;
  
  // Multer errors
  const multerError = handleMulterError(err);
  if (multerError) error = multerError;
  
  // Default to 500 if no status code
  const statusCode = error.statusCode || error.status || 500;
  const code = error.code || 'INTERNAL_ERROR';
  
  // Prepare error response
  const errorResponse = {
    success: false,
    error: {
      message: error.message || 'An error occurred',
      code: code
    }
  };
  
  // Add details in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.details = error.details;
    errorResponse.error.stack = error.stack;
  }
  
  // Add request ID if available
  if (req.id) {
    errorResponse.requestId = req.id;
  }
  
  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req, res) => {
  const error = new AppError(
    `Cannot ${req.method} ${req.originalUrl}`,
    404,
    'NOT_FOUND'
  );
  
  logger.warn('404 Not Found:', {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });
  
  res.status(404).json({
    success: false,
    error: {
      message: error.message,
      code: error.code
    }
  });
};

/**
 * Validation error formatter
 */
export const formatValidationErrors = (errors) => {
  return errors.map(error => ({
    field: error.param,
    message: error.msg,
    value: error.value
  }));
};

/**
 * Express validator error handler
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = formatValidationErrors(errors.array());
    
    logger.warn('Validation errors:', {
      url: req.originalUrl,
      errors: formattedErrors
    });
    
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: formattedErrors
      }
    });
  }
  
  next();
};

/**
 * Rate limit error handler
 */
export const rateLimitHandler = (req, res) => {
  logger.warn('Rate limit exceeded:', {
    ip: req.ip,
    url: req.originalUrl,
    userId: req.user?.id
  });
  
  res.status(429).json({
    success: false,
    error: {
      message: 'Too many requests',
      code: 'RATE_LIMITED',
      retryAfter: req.rateLimit?.resetTime
    }
  });
};

/**
 * CORS error handler
 */
export const corsErrorHandler = (err, req, res, next) => {
  if (err && err.message === 'Not allowed by CORS') {
    logger.warn('CORS violation:', {
      origin: req.headers.origin,
      url: req.originalUrl
    });
    
    return res.status(403).json({
      success: false,
      error: {
        message: 'CORS policy violation',
        code: 'CORS_ERROR'
      }
    });
  }
  
  next(err);
};

/**
 * Timeout handler
 */
export const timeoutHandler = (timeout = 30000) => {
  return (req, res, next) => {
    const timer = setTimeout(() => {
      logger.error('Request timeout:', {
        url: req.originalUrl,
        method: req.method,
        timeout
      });
      
      const error = new AppError(
        'Request timeout',
        408,
        'REQUEST_TIMEOUT'
      );
      
      next(error);
    }, timeout);
    
    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));
    
    next();
  };
};

/**
 * Graceful error response for production
 */
export const productionErrorResponse = (err, req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    // Don't leak error details in production
    const statusCode = err.statusCode || 500;
    const message = err.isOperational ? err.message : 'Something went wrong';
    
    res.status(statusCode).json({
      success: false,
      error: {
        message,
        code: err.code || 'ERROR'
      }
    });
  } else {
    next(err);
  }
};

export default {
  AppError,
  asyncHandler,
  errorHandler,
  notFoundHandler,
  handleValidationErrors,
  rateLimitHandler,
  corsErrorHandler,
  timeoutHandler,
  productionErrorResponse
};