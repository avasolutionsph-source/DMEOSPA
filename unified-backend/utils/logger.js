// Unified Logger for Backend
// Consolidates logging from all three backends with enhanced features

import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'cyan',
  debug: 'blue',
  silly: 'gray'
};

winston.addColors(colors);

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    // Add metadata if present
    if (Object.keys(metadata).length > 0) {
      // Filter sensitive data
      const filtered = filterSensitiveData(metadata);
      if (Object.keys(filtered).length > 0) {
        msg += ` ${JSON.stringify(filtered)}`;
      }
    }
    
    return msg;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    const log = {
      timestamp,
      level,
      message
    };
    
    // Add metadata if present
    if (Object.keys(metadata).length > 0) {
      log.metadata = filterSensitiveData(metadata);
    }
    
    return JSON.stringify(log);
  })
);

// Filter sensitive data from logs
function filterSensitiveData(data) {
  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'authorization',
    'cookie',
    'creditCard',
    'credit_card',
    'ssn',
    'pin'
  ];
  
  const filtered = { ...data };
  
  for (const key in filtered) {
    // Check if key contains sensitive word
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      filtered[key] = '[REDACTED]';
    }
    // Recursively filter nested objects
    else if (filtered[key] && typeof filtered[key] === 'object') {
      filtered[key] = filterSensitiveData(filtered[key]);
    }
  }
  
  return filtered;
}

// Create transports
const transports = [];

// Console transport (always enabled in development)
if (process.env.NODE_ENV !== 'production' || process.env.LOG_TO_CONSOLE === 'true') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env.LOG_LEVEL || 'debug'
    })
  );
}

// File transports with rotation
if (process.env.LOG_TO_FILE !== 'false') {
  const logDir = process.env.LOG_DIR || path.join(__dirname, '../../logs');
  
  // Combined log file
  transports.push(
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: fileFormat,
      level: process.env.LOG_LEVEL || 'info'
    })
  );
  
  // Error log file
  transports.push(
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      format: fileFormat,
      level: 'error'
    })
  );
  
  // HTTP request log file
  transports.push(
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, 'http-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '50m',
      maxFiles: '7d',
      format: fileFormat,
      level: 'http',
      filter: (log) => log.level === 'http'
    })
  );
}

// Create the logger instance
const logger = winston.createLogger({
  levels,
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  transports,
  exitOnError: false
});

// Stream for Morgan HTTP logging
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

// Add context to logger
class ContextLogger {
  constructor(context = {}) {
    this.context = context;
  }
  
  setContext(context) {
    this.context = { ...this.context, ...context };
  }
  
  clearContext() {
    this.context = {};
  }
  
  log(level, message, metadata = {}) {
    logger.log(level, message, { ...this.context, ...metadata });
  }
  
  error(message, metadata = {}) {
    this.log('error', message, metadata);
  }
  
  warn(message, metadata = {}) {
    this.log('warn', message, metadata);
  }
  
  info(message, metadata = {}) {
    this.log('info', message, metadata);
  }
  
  http(message, metadata = {}) {
    this.log('http', message, metadata);
  }
  
  verbose(message, metadata = {}) {
    this.log('verbose', message, metadata);
  }
  
  debug(message, metadata = {}) {
    this.log('debug', message, metadata);
  }
  
  silly(message, metadata = {}) {
    this.log('silly', message, metadata);
  }
}

// Create child logger for specific modules
logger.child = (context) => {
  return new ContextLogger(context);
};

// Performance logging
logger.startTimer = () => {
  const start = Date.now();
  return {
    done: (message, metadata = {}) => {
      const duration = Date.now() - start;
      logger.info(message, { ...metadata, duration: `${duration}ms` });
      return duration;
    }
  };
};

// Audit logging for important operations
logger.audit = (action, userId, details = {}) => {
  logger.info(`AUDIT: ${action}`, {
    audit: true,
    action,
    userId,
    timestamp: new Date().toISOString(),
    ...details
  });
};

// Security logging
logger.security = (event, details = {}) => {
  logger.warn(`SECURITY: ${event}`, {
    security: true,
    event,
    timestamp: new Date().toISOString(),
    ...details
  });
};

// Database query logging
logger.query = (query, duration, metadata = {}) => {
  if (process.env.LOG_QUERIES === 'true') {
    logger.debug('Database Query', {
      query: query.substring(0, 500), // Truncate long queries
      duration: `${duration}ms`,
      ...metadata
    });
  }
};

// API call logging
logger.api = (method, url, status, duration, metadata = {}) => {
  const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
  logger.log(level, `API ${method} ${url}`, {
    method,
    url,
    status,
    duration: `${duration}ms`,
    ...metadata
  });
};

// Error logging with stack trace
logger.errorWithStack = (message, error, metadata = {}) => {
  logger.error(message, {
    ...metadata,
    error: {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name
    }
  });
};

// Shutdown logging
logger.shutdown = async () => {
  return new Promise((resolve) => {
    logger.info('Logger shutting down...');
    logger.end(() => {
      resolve();
    });
  });
};

// Export enhanced logger
export default logger;

// Also export the ContextLogger class
export { ContextLogger };