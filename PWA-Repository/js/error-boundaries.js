// Error Boundary System for Critical Functions
// Provides protection against uncaught errors that could crash the application

(function() {
    'use strict';
    
    // Store original functions for restoration if needed
    const originalFunctions = new Map();
    
    // Error recovery strategies
    const recoveryStrategies = {
        'database': async function(error) {
            console.error('Database error, attempting recovery:', error);
            try {
                // Try to reinitialize database
                if (window.db && typeof window.db.init === 'function') {
                    await window.db.init();
                    return true;
                }
            } catch (e) {
                console.error('Database recovery failed:', e);
            }
            return false;
        },
        'network': async function(error) {
            console.error('Network error:', error);
            // Could implement retry logic here
            return false;
        },
        'storage': function(error) {
            console.error('Storage error:', error);
            // Check if storage is full
            if (error.name === 'QuotaExceededError') {
                if (window.showWarning) {
                    window.showWarning('Storage is full. Please clear some data.');
                }
            }
            return false;
        }
    };
    
    // Wrap a function with error boundary
    function wrapWithErrorBoundary(fn, context, functionName) {
        return async function(...args) {
            try {
                const result = await fn.apply(context, args);
                return result;
            } catch (error) {
                console.error(`Error in ${functionName}:`, error);
                
                // Try to show user-friendly error
                if (window.showError) {
                    const userMessage = getUserFriendlyMessage(error);
                    window.showError(userMessage);
                }
                
                // Log error details for debugging
                logError(functionName, error, args);
                
                // Attempt recovery based on error type
                const recovered = await attemptRecovery(error);
                
                if (recovered) {
                    console.log(`Recovered from error in ${functionName}, retrying...`);
                    try {
                        // Retry once after recovery
                        return await fn.apply(context, args);
                    } catch (retryError) {
                        console.error(`Retry failed for ${functionName}:`, retryError);
                    }
                }
                
                // Return safe default value based on function expectations
                return getSafeDefaultValue(functionName);
            }
        };
    }
    
    // Get user-friendly error message
    function getUserFriendlyMessage(error) {
        if (error.message) {
            if (error.message.includes('network') || error.message.includes('fetch')) {
                return 'Network connection issue. Please check your internet connection.';
            }
            if (error.message.includes('database') || error.message.includes('IndexedDB')) {
                return 'Database error. Please refresh the page.';
            }
            if (error.message.includes('QuotaExceeded')) {
                return 'Storage is full. Please clear some data.';
            }
            if (error.message.includes('permission')) {
                return 'Permission denied. Please check your settings.';
            }
        }
        return 'An error occurred. Please try again.';
    }
    
    // Log error for debugging
    function logError(functionName, error, args) {
        const errorLog = {
            timestamp: new Date().toISOString(),
            function: functionName,
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name
            },
            args: args ? args.length : 0
        };
        
        // Store in localStorage for debugging (limit size)
        try {
            let errorHistory = JSON.parse(localStorage.getItem('errorHistory') || '[]');
            errorHistory.unshift(errorLog);
            // Keep only last 10 errors
            errorHistory = errorHistory.slice(0, 10);
            localStorage.setItem('errorHistory', JSON.stringify(errorHistory));
        } catch (e) {
            // Ignore storage errors
        }
    }
    
    // Attempt recovery based on error type
    async function attemptRecovery(error) {
        if (error.message) {
            for (const [type, strategy] of Object.entries(recoveryStrategies)) {
                if (error.message.toLowerCase().includes(type)) {
                    return await strategy(error);
                }
            }
        }
        return false;
    }
    
    // Get safe default value based on function name
    function getSafeDefaultValue(functionName) {
        // Return appropriate defaults based on function patterns
        if (functionName.includes('get') || functionName.includes('load') || functionName.includes('fetch')) {
            return []; // Return empty array for list functions
        }
        if (functionName.includes('save') || functionName.includes('update') || functionName.includes('delete')) {
            return false; // Return false for mutation operations
        }
        if (functionName.includes('calculate') || functionName.includes('total') || functionName.includes('sum')) {
            return 0; // Return 0 for calculation functions
        }
        return null; // Default fallback
    }
    
    // Protect critical global functions
    function protectCriticalFunctions() {
        // Protect database operations
        if (window.db) {
            ['add', 'update', 'delete', 'getAll', 'get'].forEach(method => {
                if (typeof window.db[method] === 'function') {
                    const original = window.db[method];
                    originalFunctions.set(`db.${method}`, original);
                    window.db[method] = wrapWithErrorBoundary(original, window.db, `db.${method}`);
                }
            });
        }
        
        // Protect sync operations
        if (window.syncManager) {
            ['syncAll', 'syncEmployees', 'syncTransactions'].forEach(method => {
                if (typeof window.syncManager[method] === 'function') {
                    const original = window.syncManager[method];
                    originalFunctions.set(`syncManager.${method}`, original);
                    window.syncManager[method] = wrapWithErrorBoundary(original, window.syncManager, `syncManager.${method}`);
                }
            });
        }
        
        // Protect API operations
        if (window.HybridAPIClient) {
            ['request', 'get', 'post', 'put', 'delete'].forEach(method => {
                if (typeof window.HybridAPIClient[method] === 'function') {
                    const original = window.HybridAPIClient[method];
                    originalFunctions.set(`HybridAPIClient.${method}`, original);
                    window.HybridAPIClient[method] = wrapWithErrorBoundary(original, window.HybridAPIClient, `HybridAPIClient.${method}`);
                }
            });
        }
    }
    
    // Global error handlers
    window.addEventListener('error', function(event) {
        console.error('Global error caught:', event.error);
        logError('global', event.error);
        
        // Prevent default error handling in production
        if (window.location.hostname !== 'localhost') {
            event.preventDefault();
        }
    });
    
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
        logError('promise', event.reason);
        
        // Prevent default error handling in production
        if (window.location.hostname !== 'localhost') {
            event.preventDefault();
        }
    });
    
    // Utility function to view error history
    window.viewErrorHistory = function() {
        try {
            const history = JSON.parse(localStorage.getItem('errorHistory') || '[]');
            console.table(history);
            return history;
        } catch (e) {
            console.error('Could not retrieve error history:', e);
            return [];
        }
    };
    
    // Clear error history
    window.clearErrorHistory = function() {
        localStorage.removeItem('errorHistory');
        console.log('Error history cleared');
    };
    
    // Initialize protection after critical systems are loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(protectCriticalFunctions, 1000);
        });
    } else {
        setTimeout(protectCriticalFunctions, 1000);
    }
    
    console.log('✅ Error boundary system initialized');
    
})();