/**
 * Backend Constants
 * Centralized configuration for the backend server
 */

// Server Configuration
export const SERVER_CONSTANTS = {
    DEFAULT_PORT: 4001,
    DEFAULT_HOST: '0.0.0.0',
    SHUTDOWN_TIMEOUT: 10000,         // 10 seconds for graceful shutdown
    
    // Environment
    DEVELOPMENT: 'development',
    PRODUCTION: 'production',
    TEST: 'test',
};

// Database Configuration
export const DATABASE_CONSTANTS = {
    DEFAULT_CONNECTION: 'mongodb://localhost:27017/ava-marketing-website',
    CONNECTION_TIMEOUT: 30000,       // 30 seconds
    RECONNECT_INTERVAL: 5000,        // 5 seconds
    MAX_RECONNECT_ATTEMPTS: 5,
    
    // Query Performance
    DEFAULT_PAGE_SIZE: 50,
    MAX_PAGE_SIZE: 100,
    QUERY_TIMEOUT: 30000,            // 30 seconds for complex queries
};

// Authentication & Security
export const AUTH_CONSTANTS = {
    // JWT Configuration
    JWT_EXPIRES_IN: '7d',            // 7 days
    REFRESH_TOKEN_EXPIRES_IN: '30d', // 30 days
    
    // Session Configuration
    SESSION_MAX_AGE: 7 * 24 * 60 * 60 * 1000, // 7 days
    SESSION_TOUCH_AFTER: 24 * 3600,           // 24 hours lazy update
    
    // Password Requirements
    MIN_PASSWORD_LENGTH: 8,
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
};

// Rate Limiting
export const RATE_LIMIT_CONSTANTS = {
    // Time Windows (in milliseconds)
    STANDARD_WINDOW: 15 * 60 * 1000,  // 15 minutes
    AUTH_WINDOW: 15 * 60 * 1000,      // 15 minutes
    SYNC_WINDOW: 1 * 60 * 1000,       // 1 minute
    
    // Request Limits
    LIMITS: {
        AUTH_REQUESTS: 50,             // Authentication attempts
        SYNC_REQUESTS: 100,            // Sync operations
        API_REQUESTS: 500,             // General API requests
        ADMIN_REQUESTS: 100,           // Admin operations
    },
    
    // Error Messages
    MESSAGES: {
        TOO_MANY_AUTH: 'Too many authentication attempts',
        TOO_MANY_SYNC: 'Too many sync requests',
        TOO_MANY_API: 'Too many API requests',
        TOO_MANY_ADMIN: 'Too many admin requests',
    }
};

// CORS Configuration
export const CORS_CONSTANTS = {
    // Default allowed origins for development
    DEFAULT_ORIGINS: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3003',
        'http://localhost:8080',
        'http://localhost:8081',
        'http://localhost:8082',
        'http://localhost:8083',
        'http://127.0.0.1:5500',
        'http://localhost:4000',
    ],
    
    // Production patterns
    ALLOWED_PATTERNS: [
        /netlify\.app$/,
        /onrender\.com$/,
        /daetspa/,
        /daetmassage\.com$/,
        /localhost/
    ],
    
    // Headers
    ALLOWED_METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    ALLOWED_HEADERS: [
        'Content-Type',
        'Authorization',
        'x-user-id',
        'Accept',
        'Origin',
        'X-Requested-With'
    ],
    EXPOSED_HEADERS: ['Content-Length', 'X-Request-Id'],
    MAX_AGE: 86400, // 24 hours
};

// Logging Configuration
export const LOGGING_CONSTANTS = {
    LEVELS: {
        ERROR: 'error',
        WARN: 'warn',
        INFO: 'info',
        HTTP: 'http',
        VERBOSE: 'verbose',
        DEBUG: 'debug',
        SILLY: 'silly'
    },
    
    // File rotation
    MAX_FILE_SIZE: '20m',
    MAX_FILES: '14d',
    DATE_PATTERN: 'YYYY-MM-DD',
    
    // Log categories
    CATEGORIES: {
        AUTH: 'AUTH',
        API: 'API',
        DATABASE: 'DATABASE',
        SYNC: 'SYNC',
        ADMIN: 'ADMIN',
        CORS: 'CORS',
        SOCKET: 'SOCKET',
        PERFORMANCE: 'PERFORMANCE'
    }
};

// Body Parser Limits
export const PARSER_CONSTANTS = {
    JSON_LIMIT: '10mb',              // For sync operations
    URL_ENCODED_LIMIT: '10mb',
    FIELD_SIZE_LIMIT: 50 * 1024 * 1024, // 50MB for file uploads
};

// Socket.IO Configuration
export const SOCKET_CONSTANTS = {
    // Connection settings
    PING_TIMEOUT: 60000,             // 60 seconds
    PING_INTERVAL: 25000,            // 25 seconds
    
    // Reconnection
    RECONNECTION_DELAY: 1000,        // 1 second
    RECONNECTION_ATTEMPTS: 5,
    
    // Room naming patterns
    USER_ROOM_PREFIX: 'user:',
    BUSINESS_ROOM_PREFIX: 'business:',
    ADMIN_ROOM_PREFIX: 'admin:',
};

// Performance Monitoring
export const PERFORMANCE_CONSTANTS = {
    // Request timing thresholds (in milliseconds)
    SLOW_REQUEST_THRESHOLD: 2000,    // 2 seconds
    VERY_SLOW_REQUEST_THRESHOLD: 5000, // 5 seconds
    
    // Memory monitoring
    MEMORY_CHECK_INTERVAL: 60000,    // 1 minute
    HIGH_MEMORY_THRESHOLD: 0.8,      // 80% of available memory
    
    // Database performance
    SLOW_QUERY_THRESHOLD: 1000,      // 1 second
    CONNECTION_POOL_SIZE: 10,
};

// Error Handling
export const ERROR_CONSTANTS = {
    // Standard HTTP status codes
    STATUS_CODES: {
        OK: 200,
        CREATED: 201,
        NO_CONTENT: 204,
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        CONFLICT: 409,
        UNPROCESSABLE_ENTITY: 422,
        TOO_MANY_REQUESTS: 429,
        INTERNAL_SERVER_ERROR: 500,
        BAD_GATEWAY: 502,
        SERVICE_UNAVAILABLE: 503,
        GATEWAY_TIMEOUT: 504
    },
    
    // Error categories
    TYPES: {
        VALIDATION_ERROR: 'VALIDATION_ERROR',
        AUTH_ERROR: 'AUTH_ERROR',
        DATABASE_ERROR: 'DATABASE_ERROR',
        NETWORK_ERROR: 'NETWORK_ERROR',
        BUSINESS_LOGIC_ERROR: 'BUSINESS_LOGIC_ERROR'
    }
};

// API Versioning
export const API_CONSTANTS = {
    CURRENT_VERSION: 'v1',
    SUPPORTED_VERSIONS: ['v1'],
    VERSION_HEADER: 'API-Version',
    
    // Pagination defaults
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 50,
    MAX_LIMIT: 100,
};

// Health Check Configuration
export const HEALTH_CONSTANTS = {
    CHECK_INTERVAL: 30000,           // 30 seconds
    TIMEOUT: 5000,                   // 5 seconds per check
    
    // Thresholds
    CPU_THRESHOLD: 80,               // 80% CPU usage
    MEMORY_THRESHOLD: 80,            // 80% memory usage
    DISK_THRESHOLD: 90,              // 90% disk usage
    
    // Service dependencies
    REQUIRED_SERVICES: ['database', 'redis'],
    OPTIONAL_SERVICES: ['email', 'storage'],
};

// Default export
export default {
    SERVER_CONSTANTS,
    DATABASE_CONSTANTS,
    AUTH_CONSTANTS,
    RATE_LIMIT_CONSTANTS,
    CORS_CONSTANTS,
    LOGGING_CONSTANTS,
    PARSER_CONSTANTS,
    SOCKET_CONSTANTS,
    PERFORMANCE_CONSTANTS,
    ERROR_CONSTANTS,
    API_CONSTANTS,
    HEALTH_CONSTANTS
};