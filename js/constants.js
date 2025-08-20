// Shared Constants
// Central place for all app constants to avoid magic strings/numbers

const Constants = {
    // App Info
    APP_NAME: 'Ava Solutions',
    APP_VERSION: '2.0.0',
    APP_DESCRIPTION: 'Complete Business Management Solution for Spas & Wellness Centers',
    
    // Storage Keys
    STORAGE_KEYS: {
        AUTH_TOKEN: 'auth_token',
        AUTH_USER: 'auth_user',
        BUSINESS_INFO: 'businessInfo',
        LAST_SYNC: 'lastSync',
        OFFLINE_QUEUE: 'offlineQueue',
        CATALOG_CACHE: 'catalogCache',
        USER_PREFERENCES: 'userPreferences',
        SUBSCRIPTION_PLAN: 'subscriptionPlan',
        PWA_API_URL: 'pwaApiUrl',
        BOOKING_BUSINESS_ID: 'bookingBusinessId'
    },
    
    // API Endpoints
    API_ENDPOINTS: {
        // Auth
        LOGIN: '/api/auth/login',
        REGISTER: '/api/auth/register',
        LOGOUT: '/api/auth/logout',
        VERIFY: '/api/auth/verify',
        
        // Business
        BUSINESSES: '/api/businesses',
        PUBLISH_CATALOG: '/api/auth/publish-catalog',
        PUBLIC_BUSINESSES: '/api/auth/public/businesses',
        BUSINESS_CATALOG: '/api/auth/public/business-catalog',
        
        // Sync
        SYNC_PRODUCTS: '/api/products/sync',
        SYNC_EMPLOYEES: '/api/employees/sync',
        SYNC_BOOKINGS: '/api/bookings',
        
        // Health
        HEALTH_CHECK: '/api/health'
    },
    
    // User Roles
    USER_ROLES: {
        OWNER: 'owner',
        MANAGER: 'manager',
        THERAPIST: 'therapist',
        RECEPTIONIST: 'receptionist',
        CUSTOMER: 'customer'
    },
    
    // Business Types
    BUSINESS_TYPES: {
        SPA: 'spa',
        SALON: 'salon',
        WELLNESS: 'wellness',
        MASSAGE: 'massage',
        FITNESS: 'fitness',
        MEDICAL: 'medical'
    },
    
    // Transaction Status
    TRANSACTION_STATUS: {
        PENDING: 'pending',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled',
        REFUNDED: 'refunded'
    },
    
    // Booking Status
    BOOKING_STATUS: {
        PENDING: 'pending',
        CONFIRMED: 'confirmed',
        IN_PROGRESS: 'in_progress',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled',
        NO_SHOW: 'no_show'
    },
    
    // Payment Methods
    PAYMENT_METHODS: {
        CASH: 'cash',
        CARD: 'card',
        BANK_TRANSFER: 'bank_transfer',
        GCASH: 'gcash',
        PAYMAYA: 'paymaya',
        GRAB_PAY: 'grab_pay'
    },
    
    // Time Intervals (in milliseconds)
    TIME_INTERVALS: {
        SYNC_INTERVAL: 5 * 60 * 1000, // 5 minutes
        CACHE_TIMEOUT: 10 * 60 * 1000, // 10 minutes
        SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
        DEBOUNCE_DELAY: 300, // 300ms
        ANIMATION_DURATION: 300 // 300ms
    },
    
    // Limits
    LIMITS: {
        MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
        MAX_PRODUCTS: 1000,
        MAX_EMPLOYEES: 100,
        MAX_BOOKINGS_PER_DAY: 50,
        MAX_CART_ITEMS: 50,
        MIN_PASSWORD_LENGTH: 6,
        MAX_PASSWORD_LENGTH: 50
    },
    
    // Regular Expressions
    REGEX: {
        EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        PHONE: /^[\d\s\-\+\(\)]+$/,
        URL: /^https?:\/\/.+/,
        ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
        DECIMAL: /^\d+(\.\d{1,2})?$/
    },
    
    // Error Messages
    ERROR_MESSAGES: {
        NETWORK_ERROR: 'Network error. Please check your connection.',
        AUTH_REQUIRED: 'Authentication required. Please login.',
        INVALID_CREDENTIALS: 'Invalid email or password.',
        SESSION_EXPIRED: 'Your session has expired. Please login again.',
        PERMISSION_DENIED: 'You do not have permission to perform this action.',
        VALIDATION_ERROR: 'Please check your input and try again.',
        SERVER_ERROR: 'Server error. Please try again later.',
        NOT_FOUND: 'The requested resource was not found.',
        OFFLINE: 'You are currently offline. Changes will sync when online.'
    },
    
    // Success Messages
    SUCCESS_MESSAGES: {
        LOGIN_SUCCESS: 'Login successful!',
        LOGOUT_SUCCESS: 'Logged out successfully.',
        SAVE_SUCCESS: 'Changes saved successfully.',
        SYNC_SUCCESS: 'Data synchronized successfully.',
        PUBLISH_SUCCESS: 'Catalog published successfully.',
        BOOKING_SUCCESS: 'Booking confirmed successfully.',
        TRANSACTION_SUCCESS: 'Transaction completed successfully.'
    },
    
    // Colors (for consistent theming)
    COLORS: {
        PRIMARY: '#4a90e2',
        SECONDARY: '#7b68ee',
        SUCCESS: '#4caf50',
        WARNING: '#ff9800',
        ERROR: '#f44336',
        INFO: '#2196f3',
        LIGHT: '#f5f5f5',
        DARK: '#333333'
    },
    
    // Feature Flags
    FEATURES: {
        OFFLINE_MODE: true,
        REAL_TIME_SYNC: true,
        DEMO_MODE: false,
        DEBUG_MODE: false,
        ANALYTICS: true,
        NOTIFICATIONS: true,
        MULTI_BRANCH: true,
        AI_ASSISTANT: true
    },
    
    // IndexedDB Configuration
    INDEXED_DB: {
        NAME: 'AvaBusinessDB',
        VERSION: 1,
        STORES: [
            'products',
            'inventory',
            'employees',
            'transactions',
            'bookings',
            'rooms',
            'settings',
            'sync_status'
        ]
    },
    
    // Default Values
    DEFAULTS: {
        CURRENCY: 'PHP',
        LANGUAGE: 'en',
        TIMEZONE: 'Asia/Manila',
        DATE_FORMAT: 'MM/DD/YYYY',
        TIME_FORMAT: '12h',
        BUSINESS_HOURS: '09:00-18:00',
        BOOKING_DURATION: 60, // minutes
        TAX_RATE: 0.12 // 12%
    }
};

// Freeze to prevent modifications
Object.freeze(Constants);

// Export for use
window.Constants = Constants;

// Helper function to get nested values safely
window.getConstant = function(path) {
    const keys = path.split('.');
    let value = Constants;
    
    for (const key of keys) {
        value = value?.[key];
        if (value === undefined) {
            console.warn(`Constant not found: ${path}`);
            return null;
        }
    }
    
    return value;
};

export default Constants;