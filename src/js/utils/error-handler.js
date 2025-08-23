/**
 * Unified Error Handling System for Ava Solutions PWA
 * Standardizes error handling patterns across the application
 */

import { logError, logWarn, logDebug } from './logger-helper.js';

// Error types for categorization
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

class UnifiedErrorHandler {
    constructor() {
        this.errorCounts = new Map();
        this.errorCallbacks = new Map();
        this.isNotificationSystemAvailable = false;
        
        // Check if notification system is available
        this.initNotificationSystem();
        
        // Set up global error handlers
        this.setupGlobalHandlers();
    }
    
    initNotificationSystem() {
        // Check if showNotification function exists
        if (typeof showNotification === 'function' || window.showNotification) {
            this.isNotificationSystemAvailable = true;
        } else {
            // Try to find notification system in common locations
            const checkNotificationSystem = () => {
                if (typeof showNotification === 'function' || window.showNotification) {
                    this.isNotificationSystemAvailable = true;
                    return true;
                }
                return false;
            };
            
            // Check periodically until notification system is available
            const interval = setInterval(() => {
                if (checkNotificationSystem()) {
                    clearInterval(interval);
                }
            }, 100);
            
            // Stop checking after 5 seconds
            setTimeout(() => clearInterval(interval), 5000);
        }
    }
    
    setupGlobalHandlers() {
        // Global error handler for unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason, {
                category: 'SYSTEM',
                operation: 'unhandled_promise_rejection',
                context: 'global'
            });
        });
        
        // Global error handler for runtime errors
        window.addEventListener('error', (event) => {
            this.handleError(new Error(event.message), {
                category: 'SYSTEM',
                operation: 'runtime_error',
                context: 'global',
                data: {
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno
                }
            });
        });
    }
    
    /**
     * Main error handling method
     */
    handleError(error, context = {}) {
        const errorInfo = this.analyzeError(error, context);
        
        // Log the error
        this.logError(errorInfo);
        
        // Track error frequency
        this.trackError(errorInfo);
        
        // Show user notification if appropriate
        this.showUserNotification(errorInfo);
        
        // Execute custom callbacks
        this.executeCallbacks(errorInfo);
        
        return errorInfo;
    }
    
    analyzeError(error, context) {
        const errorInfo = {
            timestamp: new Date().toISOString(),
            message: this.extractErrorMessage(error),
            type: context.type || this.determineErrorType(error, context),
            severity: context.severity || this.determineSeverity(error, context),
            category: context.category || 'SYSTEM',
            operation: context.operation || 'unknown',
            context: context.context || 'application',
            stack: error?.stack,
            code: error?.code,
            statusCode: error?.status || error?.statusCode,
            data: context.data || {},
            userMessage: context.userMessage || this.generateUserMessage(error, context)
        };
        
        // Add additional context
        if (typeof window !== 'undefined') {
            errorInfo.url = window.location.href;
            errorInfo.userAgent = navigator.userAgent;
        }
        
        return errorInfo;
    }
    
    extractErrorMessage(error) {
        if (typeof error === 'string') return error;
        if (error?.message) return error.message;
        if (error?.error?.message) return error.error.message;
        return 'Unknown error occurred';
    }
    
    determineErrorType(error, context) {
        const message = this.extractErrorMessage(error).toLowerCase();
        
        if (context.category === 'API' || message.includes('fetch') || message.includes('network')) {
            return ErrorTypes.NETWORK;
        }
        if (message.includes('auth') || message.includes('login') || message.includes('token')) {
            return ErrorTypes.AUTHENTICATION;
        }
        if (message.includes('validation') || message.includes('invalid')) {
            return ErrorTypes.VALIDATION;
        }
        if (message.includes('database') || message.includes('db')) {
            return ErrorTypes.DATABASE;
        }
        if (message.includes('permission') || message.includes('unauthorized')) {
            return ErrorTypes.PERMISSION;
        }
        
        return ErrorTypes.SYSTEM;
    }
    
    determineSeverity(error, context) {
        if (context.severity) return context.severity;
        
        const type = this.determineErrorType(error, context);
        const statusCode = error?.status || error?.statusCode;
        
        // Critical errors
        if (type === ErrorTypes.AUTHENTICATION && statusCode === 401) {
            return ErrorSeverity.CRITICAL;
        }
        if (type === ErrorTypes.DATABASE) {
            return ErrorSeverity.HIGH;
        }
        if (statusCode >= 500) {
            return ErrorSeverity.HIGH;
        }
        
        // Medium errors
        if (type === ErrorTypes.NETWORK) {
            return ErrorSeverity.MEDIUM;
        }
        if (statusCode >= 400) {
            return ErrorSeverity.MEDIUM;
        }
        
        // Low errors
        if (type === ErrorTypes.VALIDATION || type === ErrorTypes.USER_INPUT) {
            return ErrorSeverity.LOW;
        }
        
        return ErrorSeverity.MEDIUM;
    }
    
    generateUserMessage(error, context) {
        if (context.userMessage) return context.userMessage;
        
        const type = this.determineErrorType(error, context);
        const severity = this.determineSeverity(error, context);
        
        switch (type) {
            case ErrorTypes.NETWORK:
                return 'Network connection issue. Please check your internet connection and try again.';
            case ErrorTypes.AUTHENTICATION:
                return 'Authentication required. Please log in to continue.';
            case ErrorTypes.VALIDATION:
                return 'Please check your input and try again.';
            case ErrorTypes.PERMISSION:
                return 'You don\'t have permission to perform this action.';
            case ErrorTypes.DATABASE:
                return severity === ErrorSeverity.CRITICAL 
                    ? 'A system error occurred. Please contact support.'
                    : 'Unable to save data. Please try again.';
            default:
                return 'An unexpected error occurred. Please try again.';
        }
    }
    
    logError(errorInfo) {
        const logData = {
            category: errorInfo.category,
            operation: errorInfo.operation,
            error: {
                type: errorInfo.type,
                severity: errorInfo.severity,
                message: errorInfo.message,
                code: errorInfo.code,
                statusCode: errorInfo.statusCode,
                stack: errorInfo.stack
            },
            data: errorInfo.data
        };
        
        switch (errorInfo.severity) {
            case ErrorSeverity.CRITICAL:
            case ErrorSeverity.HIGH:
                logError(`${errorInfo.type} Error: ${errorInfo.message}`, logData);
                break;
            case ErrorSeverity.MEDIUM:
                logWarn(`${errorInfo.type} Warning: ${errorInfo.message}`, logData);
                break;
            default:
                logDebug(`${errorInfo.type} Info: ${errorInfo.message}`, logData);
        }
    }
    
    trackError(errorInfo) {
        const key = `${errorInfo.type}:${errorInfo.operation}`;
        const count = this.errorCounts.get(key) || 0;
        this.errorCounts.set(key, count + 1);
        
        // Alert if error frequency is high
        if (count > 5) {
            logWarn(`High frequency error detected: ${key}`, {
                category: 'ERROR_TRACKING',
                operation: 'frequency_alert',
                data: { count: count + 1, errorType: errorInfo.type }
            });
        }
    }
    
    showUserNotification(errorInfo) {
        // Only show notifications for medium+ severity errors
        if (errorInfo.severity === ErrorSeverity.LOW) return;
        
        // Don't show notifications for system errors in production
        if (errorInfo.type === ErrorTypes.SYSTEM && 
            (window.location.hostname !== 'localhost' && !window.location.hostname.includes('netlify'))) {
            return;
        }
        
        if (this.isNotificationSystemAvailable) {
            const notificationType = this.getNotificationType(errorInfo.severity);
            const showNotificationFn = window.showNotification || showNotification;
            
            if (typeof showNotificationFn === 'function') {
                showNotificationFn(errorInfo.userMessage, notificationType);
            }
        }
    }
    
    getNotificationType(severity) {
        switch (severity) {
            case ErrorSeverity.CRITICAL:
            case ErrorSeverity.HIGH:
                return 'error';
            case ErrorSeverity.MEDIUM:
                return 'warning';
            default:
                return 'info';
        }
    }
    
    executeCallbacks(errorInfo) {
        const callbacks = this.errorCallbacks.get(errorInfo.type) || [];
        callbacks.forEach(callback => {
            try {
                callback(errorInfo);
            } catch (callbackError) {
                logError('Error in error callback', {
                    category: 'ERROR_HANDLER',
                    operation: 'callback_execution',
                    error: callbackError
                });
            }
        });
    }
    
    /**
     * Register callback for specific error type
     */
    onError(errorType, callback) {
        if (!this.errorCallbacks.has(errorType)) {
            this.errorCallbacks.set(errorType, []);
        }
        this.errorCallbacks.get(errorType).push(callback);
    }
    
    /**
     * Get error statistics
     */
    getErrorStats() {
        return Object.fromEntries(this.errorCounts);
    }
    
    /**
     * Clear error statistics
     */
    clearErrorStats() {
        this.errorCounts.clear();
    }
}

// Create global instance
const errorHandler = new UnifiedErrorHandler();

/**
 * Wrapper for async operations with standardized error handling
 */
export async function withErrorHandling(operation, context = {}) {
    try {
        return await operation();
    } catch (error) {
        errorHandler.handleError(error, context);
        throw error; // Re-throw to maintain original behavior
    }
}

/**
 * Wrapper for sync operations with standardized error handling
 */
export function withSyncErrorHandling(operation, context = {}) {
    try {
        return operation();
    } catch (error) {
        errorHandler.handleError(error, context);
        throw error; // Re-throw to maintain original behavior
    }
}

/**
 * Simple error handler for common patterns
 */
export function handleError(error, context = {}) {
    return errorHandler.handleError(error, context);
}

/**
 * Register error callback
 */
export function onError(errorType, callback) {
    return errorHandler.onError(errorType, callback);
}

// Export error handler instance and types
export { errorHandler as ErrorHandler };
export default errorHandler;