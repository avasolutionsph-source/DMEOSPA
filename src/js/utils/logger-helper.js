/**
 * Logger Helper - Simplified API for common logging patterns
 * This file helps migrate from the old duplicate logger patterns
 */

import { safeLog } from './unified-logger.js';

/**
 * Safe logging function that replaces the common pattern:
 * if (window.logger) { window.logger.error(...) } else { console.error(...) }
 */
export function logError(message, data = {}) {
    return safeLog('ERROR', message, data);
}

export function logWarn(message, data = {}) {
    return safeLog('WARN', message, data);
}

export function logInfo(message, data = {}) {
    return safeLog('INFO', message, data);
}

export function logDebug(message, data = {}) {
    return safeLog('DEBUG', message, data);
}

/**
 * Common error logging patterns
 */
export function logApiError(operation, error, additionalData = {}) {
    return logError(`API ${operation} failed`, {
        category: 'API',
        operation: operation,
        error: error,
        data: additionalData
    });
}

export function logDatabaseError(operation, error, additionalData = {}) {
    return logError(`Database ${operation} failed`, {
        category: 'DATABASE',
        operation: operation,
        error: error,
        data: additionalData
    });
}

export function logAuthError(operation, error, additionalData = {}) {
    return logError(`Auth ${operation} failed`, {
        category: 'AUTH',
        operation: operation,
        error: error,
        data: additionalData
    });
}

export function logSyncError(operation, error, additionalData = {}) {
    return logError(`Sync ${operation} failed`, {
        category: 'SYNC',
        operation: operation,
        error: error,
        data: additionalData
    });
}

/**
 * Operation success logging
 */
export function logSuccess(operation, category = 'GENERAL', data = {}) {
    return logInfo(`${operation} completed successfully`, {
        category: category,
        operation: operation,
        data: data
    });
}

/**
 * Performance timing helper
 */
export function logPerformance(operation, startTime, category = 'PERFORMANCE') {
    const duration = Date.now() - startTime;
    return logInfo(`${operation} completed`, {
        category: category,
        operation: 'timing',
        data: { operation, duration: `${duration}ms` }
    });
}

/**
 * Wrapper for try/catch blocks to reduce duplication
 */
export async function safeAsyncOperation(operation, asyncFn, category = 'GENERAL') {
    try {
        logDebug(`Starting ${operation}`, { category, operation: 'start' });
        const result = await asyncFn();
        logSuccess(operation, category);
        return result;
    } catch (error) {
        logError(`${operation} failed`, { category, operation, error });
        throw error;
    }
}

export function safeSyncOperation(operation, syncFn, category = 'GENERAL') {
    try {
        logDebug(`Starting ${operation}`, { category, operation: 'start' });
        const result = syncFn();
        logSuccess(operation, category);
        return result;
    } catch (error) {
        logError(`${operation} failed`, { category, operation, error });
        throw error;
    }
}

// Export default as commonly used functions
export default {
    logError,
    logWarn,
    logInfo,
    logDebug,
    logApiError,
    logDatabaseError,
    logAuthError,
    logSyncError,
    logSuccess,
    logPerformance,
    safeAsyncOperation,
    safeSyncOperation
};