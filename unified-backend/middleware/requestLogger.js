// Request Logger Middleware
// Logs all incoming requests with detailed information

import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

/**
 * Generate request ID
 */
const generateRequestId = () => {
  return uuidv4();
};

/**
 * Get client IP address
 */
const getClientIp = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress || 
         req.ip;
};

/**
 * Sanitize headers for logging
 */
const sanitizeHeaders = (headers) => {
  const sanitized = { ...headers };
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
  
  sensitiveHeaders.forEach(header => {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  });
  
  return sanitized;
};

/**
 * Main request logger middleware
 */
export const requestLogger = (req, res, next) => {
  // Generate unique request ID
  req.id = req.headers['x-request-id'] || generateRequestId();
  res.setHeader('X-Request-Id', req.id);
  
  // Capture start time
  req.startTime = Date.now();
  
  // Get client IP
  req.clientIp = getClientIp(req);
  
  // Log incoming request
  const requestLog = {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.clientIp,
    userAgent: req.headers['user-agent'],
    referer: req.headers['referer'],
    userId: req.user?.id,
    businessId: req.businessId
  };
  
  // Add body size if present
  if (req.headers['content-length']) {
    requestLog.bodySize = parseInt(req.headers['content-length']);
  }
  
  // Log at appropriate level
  if (req.path === '/health' || req.path === '/api/health') {
    logger.silly('Incoming request', requestLog);
  } else {
    logger.http('Incoming request', requestLog);
  }
  
  // Capture response details
  const originalSend = res.send;
  res.send = function(data) {
    res.responseBody = data;
    originalSend.call(this, data);
  };
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    
    const responseLog = {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.clientIp
    };
    
    // Add user context if available
    if (req.user) {
      responseLog.userId = req.user.id;
      responseLog.userRole = req.user.role;
    }
    
    // Add response size
    const contentLength = res.getHeader('content-length');
    if (contentLength) {
      responseLog.responseSize = parseInt(contentLength);
    }
    
    // Determine log level based on status code
    let logLevel = 'http';
    if (res.statusCode >= 500) {
      logLevel = 'error';
    } else if (res.statusCode >= 400) {
      logLevel = 'warn';
    } else if (req.path === '/health' || req.path === '/api/health') {
      logLevel = 'silly';
    }
    
    logger[logLevel]('Request completed', responseLog);
    
    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        ...responseLog,
        threshold: '1000ms'
      });
    }
  });
  
  // Log errors
  res.on('error', (error) => {
    logger.error('Response error', {
      requestId: req.id,
      error: error.message,
      stack: error.stack
    });
  });
  
  next();
};

/**
 * Detailed request logger for debugging
 */
export const detailedRequestLogger = (req, res, next) => {
  if (process.env.LOG_LEVEL === 'debug' || process.env.DETAILED_LOGGING === 'true') {
    logger.debug('Detailed request info', {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      headers: sanitizeHeaders(req.headers),
      query: req.query,
      params: req.params,
      body: req.body ? JSON.stringify(req.body).substring(0, 1000) : undefined
    });
  }
  next();
};

/**
 * API-specific request logger
 */
export const apiRequestLogger = (req, res, next) => {
  // Skip health checks
  if (req.path === '/health') {
    return next();
  }
  
  const timer = logger.startTimer();
  
  res.on('finish', () => {
    const duration = timer.done(`API Request: ${req.method} ${req.path}`, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      userId: req.user?.id,
      businessId: req.businessId
    });
    
    // Track API metrics
    if (global.metrics) {
      global.metrics.recordApiCall(req.method, req.path, res.statusCode, duration);
    }
  });
  
  next();
};

/**
 * Audit logger for sensitive operations
 */
export const auditLogger = (action) => {
  return (req, res, next) => {
    logger.audit(action, req.user?.id, {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      ip: req.clientIp,
      body: req.body,
      params: req.params,
      query: req.query
    });
    next();
  };
};

/**
 * Performance logger
 */
export const performanceLogger = (req, res, next) => {
  const segments = {};
  
  req.logPerformance = (segment) => {
    segments[segment] = Date.now();
  };
  
  res.on('finish', () => {
    if (Object.keys(segments).length > 0) {
      const timings = {};
      let lastTime = req.startTime;
      
      for (const [segment, time] of Object.entries(segments)) {
        timings[segment] = time - lastTime;
        lastTime = time;
      }
      
      timings.total = Date.now() - req.startTime;
      
      logger.debug('Performance metrics', {
        requestId: req.id,
        url: req.originalUrl,
        timings
      });
    }
  });
  
  next();
};

/**
 * Security event logger
 */
export const securityLogger = (eventType) => {
  return (req, res, next) => {
    logger.security(eventType, {
      requestId: req.id,
      ip: req.clientIp,
      userAgent: req.headers['user-agent'],
      url: req.originalUrl,
      userId: req.user?.id
    });
    next();
  };
};

export default requestLogger;