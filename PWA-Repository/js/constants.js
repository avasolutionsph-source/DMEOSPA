/**
 * Constants for PWA Application
 * Centralized configuration to eliminate magic numbers and improve maintainability
 */

// API Configuration
export const API_CONSTANTS = {
    // Default URLs
    DEFAULT_BACKEND_URL: 'https://daetspa-backend.onrender.com',
    DEFAULT_LOCAL_URL: 'http://localhost:4001',
    
    // Timeout Values (in milliseconds)
    REQUEST_TIMEOUT: 30000,          // 30 seconds
    SYNC_TIMEOUT: 60000,             // 60 seconds for sync operations
    HEALTH_CHECK_TIMEOUT: 5000,      // 5 seconds for health checks
    
    // Retry Configuration
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,               // Start with 1 second, exponential backoff
    
    // Cache Settings
    CACHE_DURATION: 5 * 60 * 1000,   // 5 minutes default cache
};

// Database Configuration
export const DB_CONSTANTS = {
    DB_NAME: 'AvaSolutionsDB',
    DB_VERSION: 15,
    MAX_INIT_RETRIES: 3,
    INIT_RETRY_DELAY: 100,           // 100ms between initialization attempts
    
    // Cache TTL Values (in milliseconds)
    CACHE_TTL: {
        EMPLOYEES: 5 * 60 * 1000,    // 5 minutes
        PRODUCTS: 10 * 60 * 1000,    // 10 minutes
        INVENTORY: 2 * 60 * 1000,    // 2 minutes
        TRANSACTIONS: 30 * 1000,     // 30 seconds
        CUSTOMERS: 15 * 60 * 1000,   // 15 minutes
        SETTINGS: 60 * 60 * 1000     // 1 hour
    }
};

// UI/UX Constants
export const UI_CONSTANTS = {
    // Loading States
    BUTTON_LOADING_DELAY: 100,       // Delay before showing loading state
    
    // Pagination
    DEFAULT_PAGE_SIZE: 50,
    MAX_PAGE_SIZE: 100,
    
    // Animations
    FADE_DURATION: 300,              // CSS transition duration
    DEBOUNCE_DELAY: 300,             // Input debounce delay
    
    // Memory Management
    CLEANUP_INTERVAL: 4 * 60 * 60 * 1000,  // 4 hours
    LOW_MEMORY_THRESHOLD: 50 * 1024 * 1024, // 50MB
};

// Performance Constants
export const PERFORMANCE_CONSTANTS = {
    // Batch Processing
    BATCH_SIZE: 10,                  // Number of requests to process in parallel
    QUEUE_PROCESSING_INTERVAL: 1000, // Check queue every second
    
    // Memory Management
    MAX_CACHE_SIZE: 100,             // Maximum cached items per store
    MEMORY_CHECK_INTERVAL: 30000,    // Check memory every 30 seconds
    
    // Sync Configuration
    SYNC_BATCH_SIZE: 25,             // Items per sync batch
    MAX_SYNC_RETRIES: 5,
};

// Authentication Constants
export const AUTH_CONSTANTS = {
    TOKEN_STORAGE_KEY: 'authToken',
    REFRESH_TOKEN_KEY: 'refreshToken',
    SESSION_TIMEOUT: 7 * 24 * 60 * 60 * 1000, // 7 days
    
    // Token Validation
    TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000,    // Refresh if expires in 5 minutes
    MAX_LOGIN_ATTEMPTS: 5,
    LOGIN_LOCKOUT_DURATION: 15 * 60 * 1000,    // 15 minutes
};

// Error Handling Constants
export const ERROR_CONSTANTS = {
    // HTTP Status Codes
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    RATE_LIMITED: 429,
    SERVER_ERROR: 500,
    
    // Error Types
    NETWORK_ERROR: 'NETWORK_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTH_ERROR: 'AUTH_ERROR',
    SYNC_ERROR: 'SYNC_ERROR',
    
    // Retry Policies
    RETRYABLE_ERRORS: [408, 429, 500, 502, 503, 504],
    NON_RETRYABLE_ERRORS: [400, 401, 403, 404, 409, 422],
};

// Logging Constants
export const LOG_CONSTANTS = {
    LEVELS: {
        ERROR: 'error',
        WARN: 'warn',
        INFO: 'info',
        DEBUG: 'debug'
    },
    
    // Categories
    CATEGORIES: {
        API: 'API',
        AUTH: 'AUTH',
        DATABASE: 'DATABASE',
        SYNC: 'SYNC',
        UI: 'UI',
        PERFORMANCE: 'PERFORMANCE'
    },
    
    // Console output control
    ENABLE_CONSOLE_IN_PRODUCTION: false,
    MAX_LOG_ENTRIES: 1000,
};

// Validation Constants
export const VALIDATION_CONSTANTS = {
    // Input Limits
    MAX_STRING_LENGTH: 255,
    MAX_TEXT_LENGTH: 1000,
    MAX_EMAIL_LENGTH: 100,
    MAX_PHONE_LENGTH: 20,
    
    // Numeric Limits
    MAX_PRICE: 999999.99,
    MIN_PRICE: 0.01,
    MAX_QUANTITY: 9999,
    MIN_QUANTITY: 0,
    
    // Patterns
    EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE_PATTERN: /^[\+]?[1-9][\d]{0,15}$/,
    PASSWORD_MIN_LENGTH: 8,
};

// Default export for convenience
export default {
    API_CONSTANTS,
    DB_CONSTANTS,
    UI_CONSTANTS,
    PERFORMANCE_CONSTANTS,
    AUTH_CONSTANTS,
    ERROR_CONSTANTS,
    LOG_CONSTANTS,
    VALIDATION_CONSTANTS
};