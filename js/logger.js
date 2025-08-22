// Comprehensive Logging System for Ava Solutions PWA
class Logger {
    constructor() {
        this.dbName = 'AvaLogsDB';
        this.version = 1;
        this.db = null;
        this.isEnabled = this.getFeatureFlag();
        this.mode = this.getMode();
        this.maxLogs = this.mode === 'production' ? 10000 : 50000;
        this.logBuffer = [];
        this.bufferSize = 100;
        this.flushInterval = 5000; // 5 seconds
        
        // Counters for analytics
        this.errorCounts = new Map();
        this.componentUsage = new Map();
        this.globalVarAccess = new Map();
        this.apiCallCounts = new Map();
        
        // Performance tracking
        this.performanceMetrics = {
            dbOperations: [],
            apiCalls: [],
            stateChanges: []
        };
        
        this.init();
    }

    // Initialize logger
    async init() {
        if (!this.isEnabled) {
            console.log('🔇 Logger is disabled via feature flag');
            return;
        }

        try {
            await this.initDB();
            this.setupInterceptors();
            this.startBufferFlush();
            console.log(`📝 Logger initialized in ${this.mode} mode`);
            
            // Log initialization
            await this.log({
                type: 'SYSTEM',
                category: 'INIT',
                message: 'Logger system initialized',
                data: {
                    mode: this.mode,
                    maxLogs: this.maxLogs,
                    userAgent: navigator.userAgent,
                    timestamp: Date.now()
                }
            });
        } catch (error) {
            console.error('Failed to initialize logger:', error);
        }
    }

    // Initialize IndexedDB for logs
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (e) => {
                const db = e.target.result;

                // Logs store
                if (!db.objectStoreNames.contains('logs')) {
                    const logsStore = db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
                    logsStore.createIndex('timestamp', 'timestamp', { unique: false });
                    logsStore.createIndex('type', 'type', { unique: false });
                    logsStore.createIndex('category', 'category', { unique: false });
                    logsStore.createIndex('level', 'level', { unique: false });
                }

                // Analytics store
                if (!db.objectStoreNames.contains('analytics')) {
                    const analyticsStore = db.createObjectStore('analytics', { keyPath: 'id', autoIncrement: true });
                    analyticsStore.createIndex('type', 'type', { unique: false });
                    analyticsStore.createIndex('date', 'date', { unique: false });
                }

                // Performance store
                if (!db.objectStoreNames.contains('performance')) {
                    const perfStore = db.createObjectStore('performance', { keyPath: 'id', autoIncrement: true });
                    perfStore.createIndex('operation', 'operation', { unique: false });
                    perfStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    // Get feature flag from localStorage or URL params
    getFeatureFlag() {
        // Check URL parameter first
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('debug-logs')) {
            return urlParams.get('debug-logs') === 'true';
        }
        
        // Check localStorage
        const stored = localStorage.getItem('ava_logging_enabled');
        if (stored !== null) {
            return stored === 'true';
        }
        
        // Default based on environment
        return this.getMode() === 'development';
    }

    // Determine if we're in production or development
    getMode() {
        // Check if we're on localhost or a dev domain
        const isDev = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname.includes('dev') ||
                     window.location.protocol === 'file:';
        
        return isDev ? 'development' : 'production';
    }

    // Enable/disable logging
    setEnabled(enabled) {
        this.isEnabled = enabled;
        localStorage.setItem('ava_logging_enabled', enabled.toString());
        
        if (enabled && !this.db) {
            this.init();
        }
        
        console.log(`📝 Logging ${enabled ? 'enabled' : 'disabled'}`);
    }

    // Main logging method
    async log(entry) {
        if (!this.isEnabled || !this.db) return;

        const logEntry = {
            ...entry,
            timestamp: Date.now(),
            date: new Date().toISOString(),
            level: entry.level || 'INFO',
            sessionId: this.getSessionId(),
            userId: this.getUserId(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };

        // Add stack trace for errors
        if (entry.level === 'ERROR') {
            logEntry.stackTrace = new Error().stack;
        }

        // Buffer the log entry
        this.logBuffer.push(logEntry);

        // Update counters
        this.updateCounters(logEntry);

        // Immediate flush for critical logs
        if (entry.level === 'ERROR' || entry.level === 'CRITICAL') {
            await this.flush();
        }

        // Console output in development
        if (this.mode === 'development') {
            this.consoleLog(logEntry);
        }
    }

    // Specialized logging methods
    async logDBOperation(operation, table, data, duration, success = true) {
        await this.log({
            type: 'DATABASE',
            category: 'OPERATION',
            level: success ? 'INFO' : 'ERROR',
            message: `${operation} on ${table}`,
            data: {
                operation,
                table,
                recordCount: Array.isArray(data) ? data.length : 1,
                duration,
                success,
                dataSize: JSON.stringify(data).length
            }
        });

        // Track performance
        this.performanceMetrics.dbOperations.push({
            operation,
            table,
            duration,
            timestamp: Date.now()
        });
    }

    async logAPICall(method, url, status, duration, requestData, responseData) {
        const success = status >= 200 && status < 400;
        
        await this.log({
            type: 'API',
            category: 'REQUEST',
            level: success ? 'INFO' : 'WARN',
            message: `${method} ${url} - ${status}`,
            data: {
                method,
                url,
                status,
                duration,
                requestSize: requestData ? JSON.stringify(requestData).length : 0,
                responseSize: responseData ? JSON.stringify(responseData).length : 0,
                success
            }
        });

        // Update API call counter
        const endpoint = new URL(url).pathname;
        const key = `${method} ${endpoint}`;
        this.apiCallCounts.set(key, (this.apiCallCounts.get(key) || 0) + 1);

        // Track performance
        this.performanceMetrics.apiCalls.push({
            method,
            url,
            duration,
            status,
            timestamp: Date.now()
        });
    }

    async logStateChange(component, property, oldValue, newValue, source) {
        await this.log({
            type: 'STATE',
            category: 'CHANGE',
            level: 'DEBUG',
            message: `${component}.${property} changed`,
            data: {
                component,
                property,
                oldValue: this.sanitizeValue(oldValue),
                newValue: this.sanitizeValue(newValue),
                source,
                valueType: typeof newValue
            }
        });

        // Track component usage
        this.componentUsage.set(component, (this.componentUsage.get(component) || 0) + 1);

        // Track performance
        this.performanceMetrics.stateChanges.push({
            component,
            property,
            timestamp: Date.now()
        });
    }

    async logGlobalVarAccess(varName, operation, value, component, stackTrace) {
        await this.log({
            type: 'GLOBAL_VAR',
            category: 'ACCESS',
            level: 'DEBUG',
            message: `Global variable ${varName} ${operation}`,
            data: {
                varName,
                operation, // 'read', 'write', 'delete'
                value: this.sanitizeValue(value),
                component,
                stackTrace: stackTrace || new Error().stack
            }
        });

        // Track global variable usage
        const key = `${varName}.${operation}`;
        this.globalVarAccess.set(key, (this.globalVarAccess.get(key) || 0) + 1);
    }

    async logDataFlow(fromComponent, toComponent, data, method) {
        await this.log({
            type: 'DATA_FLOW',
            category: 'TRANSFER',
            level: 'DEBUG',
            message: `Data flow: ${fromComponent} → ${toComponent}`,
            data: {
                fromComponent,
                toComponent,
                method, // 'event', 'method_call', 'property', 'global_var'
                dataType: typeof data,
                dataSize: JSON.stringify(data).length,
                keys: typeof data === 'object' ? Object.keys(data) : null
            }
        });
    }

    async logError(error, context, component) {
        const errorKey = `${error.name}: ${error.message}`;
        this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);

        await this.log({
            type: 'ERROR',
            category: 'EXCEPTION',
            level: 'ERROR',
            message: error.message,
            data: {
                name: error.name,
                message: error.message,
                stack: error.stack,
                context,
                component,
                frequency: this.errorCounts.get(errorKey)
            }
        });
    }

    async logPerformance(operation, duration, details) {
        await this.log({
            type: 'PERFORMANCE',
            category: 'METRIC',
            level: duration > 1000 ? 'WARN' : 'INFO',
            message: `${operation} took ${duration}ms`,
            data: {
                operation,
                duration,
                ...details
            }
        });
    }

    // Setup interceptors for automatic logging
    setupInterceptors() {
        this.interceptDatabase();
        this.interceptAPI();
        this.interceptGlobalVars();
        this.interceptErrors();
    }

    // Intercept database operations
    interceptDatabase() {
        if (!window.database) return;

        const originalMethods = ['add', 'get', 'getAll', 'update', 'delete'];
        
        originalMethods.forEach(method => {
            if (typeof window.database[method] === 'function') {
                const original = window.database[method].bind(window.database);
                window.database[method] = async (...args) => {
                    const startTime = performance.now();
                    
                    try {
                        const result = await original(...args);
                        const duration = performance.now() - startTime;
                        
                        await this.logDBOperation(
                            method,
                            args[0] || 'unknown',
                            args[1] || result,
                            duration,
                            true
                        );
                        
                        return result;
                    } catch (error) {
                        const duration = performance.now() - startTime;
                        
                        await this.logDBOperation(
                            method,
                            args[0] || 'unknown',
                            args[1],
                            duration,
                            false
                        );
                        
                        throw error;
                    }
                };
            }
        });
    }

    // Intercept API calls
    interceptAPI() {
        // Intercept fetch
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const startTime = performance.now();
            const url = args[0];
            const options = args[1] || {};
            const method = options.method || 'GET';
            
            try {
                const response = await originalFetch(...args);
                const duration = performance.now() - startTime;
                
                // Clone response to read body without consuming it
                const clonedResponse = response.clone();
                let responseData = null;
                
                try {
                    responseData = await clonedResponse.json();
                } catch (e) {
                    // Response is not JSON
                }
                
                await this.logAPICall(
                    method,
                    url,
                    response.status,
                    duration,
                    options.body,
                    responseData
                );
                
                return response;
            } catch (error) {
                const duration = performance.now() - startTime;
                
                await this.logAPICall(
                    method,
                    url,
                    0,
                    duration,
                    options.body,
                    null
                );
                
                throw error;
            }
        };

        // Intercept XMLHttpRequest
        const originalXHR = window.XMLHttpRequest;
        window.XMLHttpRequest = function() {
            const xhr = new originalXHR();
            const logger = window.logger;
            
            if (logger) {
                let startTime;
                let method, url;
                
                const originalOpen = xhr.open;
                xhr.open = function(m, u, ...args) {
                    method = m;
                    url = u;
                    return originalOpen.call(this, m, u, ...args);
                };
                
                const originalSend = xhr.send;
                xhr.send = function(data) {
                    startTime = performance.now();
                    return originalSend.call(this, data);
                };
                
                xhr.addEventListener('loadend', async () => {
                    if (startTime && method && url) {
                        const duration = performance.now() - startTime;
                        await logger.logAPICall(
                            method,
                            url,
                            xhr.status,
                            duration,
                            null,
                            xhr.responseText
                        );
                    }
                });
            }
            
            return xhr;
        };
    }

    // Intercept global variable access
    interceptGlobalVars() {
        const globalVars = ['app', 'database', 'apiClient', 'authSystem', 'syncManager'];
        
        globalVars.forEach(varName => {
            if (window[varName]) {
                this.wrapObjectWithLogging(window[varName], varName, 'window');
            }
        });

        // Monitor localStorage
        const originalSetItem = localStorage.setItem;
        localStorage.setItem = (key, value) => {
            this.logGlobalVarAccess(`localStorage.${key}`, 'write', value, 'localStorage');
            return originalSetItem.call(localStorage, key, value);
        };

        const originalGetItem = localStorage.getItem;
        localStorage.getItem = (key) => {
            const value = originalGetItem.call(localStorage, key);
            this.logGlobalVarAccess(`localStorage.${key}`, 'read', value, 'localStorage');
            return value;
        };
    }

    // Wrap object methods with logging
    wrapObjectWithLogging(obj, objName, component) {
        if (!obj || typeof obj !== 'object') return;

        Object.getOwnPropertyNames(obj).forEach(prop => {
            if (typeof obj[prop] === 'function') {
                const original = obj[prop].bind(obj);
                obj[prop] = (...args) => {
                    this.logGlobalVarAccess(`${objName}.${prop}`, 'call', args, component);
                    return original(...args);
                };
            }
        });
    }

    // Intercept errors
    interceptErrors() {
        // Global error handler
        window.addEventListener('error', async (event) => {
            await this.logError(event.error, {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            }, 'global');
        });

        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', async (event) => {
            await this.logError(new Error(event.reason), {
                type: 'unhandled_promise_rejection'
            }, 'global');
        });

        // Console error override
        const originalConsoleError = console.error;
        console.error = (...args) => {
            this.logError(new Error(args.join(' ')), {
                type: 'console_error',
                args
            }, 'console');
            return originalConsoleError(...args);
        };
    }

    // Utility methods
    sanitizeValue(value) {
        if (value === null || value === undefined) return value;
        
        // Remove sensitive data
        if (typeof value === 'string') {
            // Don't log passwords, tokens, etc.
            if (value.length > 100 || /password|token|secret|key/i.test(value)) {
                return '[REDACTED]';
            }
        }
        
        if (typeof value === 'object') {
            const sanitized = {};
            for (const [key, val] of Object.entries(value)) {
                if (/password|token|secret|key/i.test(key)) {
                    sanitized[key] = '[REDACTED]';
                } else {
                    sanitized[key] = val;
                }
            }
            return sanitized;
        }
        
        return value;
    }

    getSessionId() {
        if (!this.sessionId) {
            this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        return this.sessionId;
    }

    getUserId() {
        // Try to get user ID from auth system
        if (window.authSystem && window.authSystem.currentUser) {
            return window.authSystem.currentUser.id || window.authSystem.currentUser.email;
        }
        return localStorage.getItem('currentUser') || 'anonymous';
    }

    updateCounters(logEntry) {
        // Update error frequency
        if (logEntry.level === 'ERROR') {
            const errorKey = logEntry.message;
            this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);
        }
    }

    consoleLog(entry) {
        const style = this.getConsoleStyle(entry.level);
        const timestamp = new Date(entry.timestamp).toISOString();
        
        console.groupCollapsed(
            `%c[${entry.level}] ${entry.type}/${entry.category} - ${entry.message}`,
            style
        );
        console.log('📅 Time:', timestamp);
        console.log('🔧 Data:', entry.data);
        console.log('🌐 URL:', entry.url);
        if (entry.stackTrace) {
            console.log('📚 Stack:', entry.stackTrace);
        }
        console.groupEnd();
    }

    getConsoleStyle(level) {
        const styles = {
            DEBUG: 'color: #6B7280; font-weight: normal;',
            INFO: 'color: #3B82F6; font-weight: normal;',
            WARN: 'color: #F59E0B; font-weight: bold;',
            ERROR: 'color: #EF4444; font-weight: bold;',
            CRITICAL: 'color: #DC2626; font-weight: bold; background: #FEE2E2;'
        };
        return styles[level] || styles.INFO;
    }

    // Buffer management
    startBufferFlush() {
        setInterval(() => {
            if (this.logBuffer.length > 0) {
                this.flush();
            }
        }, this.flushInterval);

        // Flush on page unload
        window.addEventListener('beforeunload', () => {
            this.flush();
        });
    }

    async flush() {
        if (!this.db || this.logBuffer.length === 0) return;

        const logsToFlush = [...this.logBuffer];
        this.logBuffer = [];

        try {
            const transaction = this.db.transaction(['logs'], 'readwrite');
            const store = transaction.objectStore('logs');

            for (const log of logsToFlush) {
                await new Promise((resolve, reject) => {
                    const request = store.add(log);
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            }

            // Clean up old logs if we exceed max
            await this.cleanup();
        } catch (error) {
            console.error('Failed to flush logs:', error);
            // Put logs back in buffer
            this.logBuffer.unshift(...logsToFlush);
        }
    }

    async cleanup() {
        if (!this.db) return;

        try {
            const transaction = this.db.transaction(['logs'], 'readwrite');
            const store = transaction.objectStore('logs');
            const index = store.index('timestamp');

            // Count total logs
            const countRequest = store.count();
            const count = await new Promise((resolve, reject) => {
                countRequest.onsuccess = () => resolve(countRequest.result);
                countRequest.onerror = () => reject(countRequest.error);
            });

            if (count > this.maxLogs) {
                // Delete oldest logs
                const deleteCount = count - this.maxLogs;
                const cursor = await new Promise((resolve, reject) => {
                    const request = index.openCursor();
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });

                let deleted = 0;
                while (cursor && deleted < deleteCount) {
                    await new Promise((resolve, reject) => {
                        const deleteRequest = cursor.delete();
                        deleteRequest.onsuccess = () => resolve();
                        deleteRequest.onerror = () => reject(deleteRequest.error);
                    });
                    deleted++;
                    cursor.continue();
                }
            }
        } catch (error) {
            console.error('Failed to cleanup logs:', error);
        }
    }

    // Analytics and reporting methods
    async getErrorReport() {
        const errors = Array.from(this.errorCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20);

        return {
            totalErrors: Array.from(this.errorCounts.values()).reduce((a, b) => a + b, 0),
            uniqueErrors: this.errorCounts.size,
            topErrors: errors,
            timeRange: '24h' // Could be made configurable
        };
    }

    async getComponentReport() {
        const usage = Array.from(this.componentUsage.entries())
            .sort((a, b) => b[1] - a[1]);

        return {
            components: usage,
            totalOperations: Array.from(this.componentUsage.values()).reduce((a, b) => a + b, 0)
        };
    }

    async getGlobalVarReport() {
        const access = Array.from(this.globalVarAccess.entries())
            .sort((a, b) => b[1] - a[1]);

        return {
            globalVarAccess: access,
            totalAccess: Array.from(this.globalVarAccess.values()).reduce((a, b) => a + b, 0)
        };
    }

    async getPerformanceReport() {
        const dbAvg = this.calculateAverage(this.performanceMetrics.dbOperations.map(op => op.duration));
        const apiAvg = this.calculateAverage(this.performanceMetrics.apiCalls.map(call => call.duration));

        return {
            database: {
                averageOperationTime: dbAvg,
                operations: this.performanceMetrics.dbOperations.length
            },
            api: {
                averageCallTime: apiAvg,
                calls: this.performanceMetrics.apiCalls.length
            },
            stateChanges: this.performanceMetrics.stateChanges.length
        };
    }

    calculateAverage(numbers) {
        if (numbers.length === 0) return 0;
        return numbers.reduce((a, b) => a + b, 0) / numbers.length;
    }

    // Export logs for analysis
    async exportLogs(startDate, endDate) {
        if (!this.db) return [];

        const transaction = this.db.transaction(['logs'], 'readonly');
        const store = transaction.objectStore('logs');
        const index = store.index('timestamp');

        const range = IDBKeyRange.bound(
            startDate ? new Date(startDate).getTime() : 0,
            endDate ? new Date(endDate).getTime() : Date.now()
        );

        return new Promise((resolve, reject) => {
            const logs = [];
            const request = index.openCursor(range);
            
            request.onsuccess = () => {
                const cursor = request.result;
                if (cursor) {
                    logs.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(logs);
                }
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    // Clear all logs
    async clearLogs() {
        if (!this.db) return;

        const transaction = this.db.transaction(['logs', 'analytics', 'performance'], 'readwrite');
        await Promise.all([
            new Promise((resolve, reject) => {
                const request = transaction.objectStore('logs').clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            }),
            new Promise((resolve, reject) => {
                const request = transaction.objectStore('analytics').clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            }),
            new Promise((resolve, reject) => {
                const request = transaction.objectStore('performance').clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            })
        ]);

        console.log('📝 All logs cleared');
    }
}

// Initialize logger as singleton
window.logger = new Logger();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Logger;
}