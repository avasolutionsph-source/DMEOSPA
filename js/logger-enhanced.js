// Enhanced Logger System for Ava Solutions PWA
// Integrates perfectly with config service and provides comprehensive logging

class EnhancedLogger {
    constructor() {
        this.dbName = 'AvaLoggingDB';
        this.version = 2;
        this.db = null;
        this.isEnabled = true;
        this.bufferSize = 100;
        this.logBuffer = [];
        this.flushTimer = null;
        this.maxLogAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        this.maxLogCount = 10000; // Maximum number of logs to keep
        this.rotationCheckInterval = 60 * 60 * 1000; // 1 hour
        this.configReady = false;
        this.debugMode = false;
        
        // Log levels with priorities
        this.levels = {
            DEBUG: { priority: 0, color: '#64748b', icon: '🔍' },
            INFO: { priority: 1, color: '#3b82f6', icon: 'ℹ️' },
            WARN: { priority: 2, color: '#f59e0b', icon: '⚠️' },
            ERROR: { priority: 3, color: '#ef4444', icon: '❌' },
            CRITICAL: { priority: 4, color: '#dc2626', icon: '🚨' }
        };

        // Categories for better organization
        this.categories = {
            CONFIG: 'Configuration',
            AUTH: 'Authentication', 
            API: 'API Calls',
            DATABASE: 'Database',
            SYNC: 'Synchronization',
            UI: 'User Interface',
            MIGRATION: 'Migration',
            VALIDATION: 'Validation',
            PERFORMANCE: 'Performance',
            ERROR: 'Error Handling',
            SECURITY: 'Security',
            FEATURE: 'Feature Flags',
            HEALTH: 'Health Monitoring',
            RECOVERY: 'Error Recovery'
        };

        // Performance monitoring
        this.performanceMetrics = {
            startTimes: new Map(),
            measurements: []
        };

        // Error tracking
        this.errorCounts = new Map();
        this.errorPatterns = new Map();

        this.init();
    }

    async init() {
        try {
            await this.initDB();
            await this.waitForConfig();
            await this.loadSettings();
            this.setupErrorHandling();
            this.startPeriodicTasks();
            
            // Initial log
            this.log({
                type: 'SYSTEM',
                category: 'CONFIG',
                level: 'INFO',
                message: 'Enhanced Logger initialized',
                data: {
                    version: this.version,
                    dbName: this.dbName,
                    configReady: this.configReady,
                    isEnabled: this.isEnabled
                }
            });

        } catch (error) {
            console.error('Logger initialization failed:', error);
            this.fallbackToConsole('ERROR', 'Logger initialization failed', error);
        }
    }

    async waitForConfig() {
        let attempts = 0;
        const maxAttempts = 50;
        
        while (attempts < maxAttempts) {
            if (window.config && window.config.isInitialized) {
                this.configReady = true;
                // Listen for config changes
                this.setupConfigListeners();
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!this.configReady) {
            console.warn('Logger: Config service timeout, using fallback settings');
        }
    }

    setupConfigListeners() {
        if (!window.config) return;

        // Listen for logging settings changes
        window.config.listen('loggingEnabled', (enabled) => {
            this.setEnabled(enabled);
        });

        window.config.listen('debugMode', (enabled) => {
            this.debugMode = enabled;
            this.log({
                type: 'CONFIG',
                category: 'CONFIG',
                level: 'INFO',
                message: `Debug mode ${enabled ? 'enabled' : 'disabled'}`,
                data: { debugMode: enabled }
            });
        });
    }

    async loadSettings() {
        try {
            if (this.configReady) {
                this.isEnabled = await window.config.get('loggingEnabled', true);
                this.debugMode = await window.config.get('debugMode', false);
            } else {
                // Fallback to localStorage
                this.isEnabled = localStorage.getItem('ava_logging_enabled') !== 'false';
                this.debugMode = localStorage.getItem('debugMode') === 'true';
            }
        } catch (error) {
            console.warn('Failed to load logger settings:', error);
        }
    }

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
                    logsStore.createIndex('level', 'level', { unique: false });
                    logsStore.createIndex('category', 'category', { unique: false });
                    logsStore.createIndex('type', 'type', { unique: false });
                    logsStore.createIndex('session', 'sessionId', { unique: false });
                }

                // Performance metrics store
                if (!db.objectStoreNames.contains('performance')) {
                    const perfStore = db.createObjectStore('performance', { keyPath: 'id', autoIncrement: true });
                    perfStore.createIndex('timestamp', 'timestamp', { unique: false });
                    perfStore.createIndex('operation', 'operation', { unique: false });
                    perfStore.createIndex('duration', 'duration', { unique: false });
                }

                // Error patterns store
                if (!db.objectStoreNames.contains('errorPatterns')) {
                    const errorStore = db.createObjectStore('errorPatterns', { keyPath: 'pattern' });
                    errorStore.createIndex('count', 'count', { unique: false });
                    errorStore.createIndex('lastOccurrence', 'lastOccurrence', { unique: false });
                }

                // Health monitoring store
                if (!db.objectStoreNames.contains('health')) {
                    const healthStore = db.createObjectStore('health', { keyPath: 'id', autoIncrement: true });
                    healthStore.createIndex('timestamp', 'timestamp', { unique: false });
                    healthStore.createIndex('component', 'component', { unique: false });
                    healthStore.createIndex('status', 'status', { unique: false });
                }
            };
        });
    }

    // Main logging method - this is what config service expects
    log(entry) {
        if (!this.isEnabled) return;

        try {
            // Normalize the entry
            const normalizedEntry = this.normalizeLogEntry(entry);
            
            // Add to buffer
            this.logBuffer.push(normalizedEntry);
            
            // Console output based on debug mode and level
            this.outputToConsole(normalizedEntry);
            
            // Track errors for pattern analysis
            if (normalizedEntry.level === 'ERROR' || normalizedEntry.level === 'CRITICAL') {
                this.trackError(normalizedEntry);
            }
            
            // Track performance if relevant
            if (normalizedEntry.data && normalizedEntry.data.duration) {
                this.trackPerformance(normalizedEntry);
            }
            
            // Flush buffer if needed
            if (this.logBuffer.length >= this.bufferSize) {
                this.flushLogs();
            } else {
                this.scheduleFlush();
            }

        } catch (error) {
            this.fallbackToConsole('ERROR', 'Logging failed', error);
        }
    }

    normalizeLogEntry(entry) {
        const now = Date.now();
        const sessionId = this.getSessionId();

        if (typeof entry === 'string') {
            return {
                id: null,
                timestamp: now,
                sessionId,
                level: 'INFO',
                type: 'GENERAL',
                category: 'GENERAL',
                message: entry,
                data: null,
                stack: null,
                userAgent: navigator.userAgent,
                url: window.location.href
            };
        }

        return {
            id: null,
            timestamp: now,
            sessionId,
            level: entry.level || 'INFO',
            type: entry.type || 'GENERAL',
            category: entry.category || 'GENERAL',
            message: entry.message || 'No message',
            data: entry.data || null,
            stack: entry.stack || (entry.error ? entry.error.stack : null),
            userAgent: navigator.userAgent,
            url: window.location.href
        };
    }

    outputToConsole(entry) {
        // Skip debug logs unless debug mode is enabled
        if (entry.level === 'DEBUG' && !this.debugMode) return;

        const levelInfo = this.levels[entry.level] || this.levels.INFO;
        const prefix = `${levelInfo.icon} [${entry.level}] ${entry.type}/${entry.category}:`;
        
        const style = `color: ${levelInfo.color}; font-weight: bold;`;
        
        switch (entry.level) {
            case 'ERROR':
            case 'CRITICAL':
                console.error(`%c${prefix}`, style, entry.message, entry.data || '');
                if (entry.stack) console.error(entry.stack);
                break;
            case 'WARN':
                console.warn(`%c${prefix}`, style, entry.message, entry.data || '');
                break;
            case 'DEBUG':
                console.debug(`%c${prefix}`, style, entry.message, entry.data || '');
                break;
            default:
                console.log(`%c${prefix}`, style, entry.message, entry.data || '');
        }
    }

    fallbackToConsole(level, message, data) {
        const prefix = `[LOGGER ${level}]`;
        switch (level) {
            case 'ERROR':
                console.error(prefix, message, data);
                break;
            case 'WARN':
                console.warn(prefix, message, data);
                break;
            default:
                console.log(prefix, message, data);
        }
    }

    scheduleFlush() {
        if (this.flushTimer) return;
        
        this.flushTimer = setTimeout(() => {
            this.flushLogs();
        }, 5000); // Flush every 5 seconds
    }

    async flushLogs() {
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
            this.flushTimer = null;
        }

        if (this.logBuffer.length === 0 || !this.db) return;

        try {
            const transaction = this.db.transaction(['logs'], 'readwrite');
            const store = transaction.objectStore('logs');
            
            const logsToFlush = [...this.logBuffer];
            this.logBuffer = [];

            for (const log of logsToFlush) {
                store.add(log);
            }

            await new Promise((resolve, reject) => {
                transaction.oncomplete = resolve;
                transaction.onerror = () => reject(transaction.error);
            });

        } catch (error) {
            // Put logs back in buffer if flush failed
            this.logBuffer.unshift(...this.logBuffer);
            this.fallbackToConsole('ERROR', 'Failed to flush logs to database', error);
        }
    }

    // Performance monitoring methods
    startPerformanceTimer(operation) {
        const id = `${operation}_${Date.now()}`;
        this.performanceMetrics.startTimes.set(id, {
            operation,
            startTime: performance.now(),
            timestamp: Date.now()
        });
        return id;
    }

    endPerformanceTimer(id, additionalData = {}) {
        const startInfo = this.performanceMetrics.startTimes.get(id);
        if (!startInfo) return null;

        const duration = performance.now() - startInfo.startTime;
        this.performanceMetrics.startTimes.delete(id);

        const measurement = {
            operation: startInfo.operation,
            duration,
            timestamp: startInfo.timestamp,
            ...additionalData
        };

        this.performanceMetrics.measurements.push(measurement);
        
        // Keep only recent measurements in memory
        if (this.performanceMetrics.measurements.length > 100) {
            this.performanceMetrics.measurements = this.performanceMetrics.measurements.slice(-50);
        }

        // Log performance if it's slow
        if (duration > 1000) { // > 1 second
            this.log({
                type: 'PERFORMANCE',
                category: 'PERFORMANCE',
                level: 'WARN',
                message: `Slow operation detected: ${startInfo.operation}`,
                data: { duration, operation: startInfo.operation, ...additionalData }
            });
        }

        // Store in database
        this.storePerformanceMetric(measurement);

        return measurement;
    }

    async storePerformanceMetric(measurement) {
        if (!this.db) return;

        try {
            const transaction = this.db.transaction(['performance'], 'readwrite');
            const store = transaction.objectStore('performance');
            await store.add(measurement);
        } catch (error) {
            this.fallbackToConsole('ERROR', 'Failed to store performance metric', error);
        }
    }

    // Error tracking and pattern analysis
    trackError(entry) {
        const pattern = this.extractErrorPattern(entry);
        
        // Update error count
        const currentCount = this.errorCounts.get(pattern) || 0;
        this.errorCounts.set(pattern, currentCount + 1);

        // Store pattern in database
        this.updateErrorPattern(pattern, entry);

        // Check for error storms (too many similar errors)
        if (currentCount > 10) {
            this.log({
                type: 'SYSTEM',
                category: 'ERROR',
                level: 'CRITICAL',
                message: 'Error storm detected',
                data: { 
                    pattern, 
                    count: currentCount + 1,
                    recentError: entry.message 
                }
            });
        }
    }

    extractErrorPattern(entry) {
        // Create a pattern from the error for grouping similar errors
        let pattern = entry.message;
        
        // Remove dynamic parts (numbers, timestamps, IDs)
        pattern = pattern.replace(/\d+/g, 'N');
        pattern = pattern.replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, 'UUID');
        pattern = pattern.replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\b/g, 'TIMESTAMP');
        
        return pattern.substring(0, 100); // Limit pattern length
    }

    async updateErrorPattern(pattern, entry) {
        if (!this.db) return;

        try {
            const transaction = this.db.transaction(['errorPatterns'], 'readwrite');
            const store = transaction.objectStore('errorPatterns');
            
            const existing = await store.get(pattern);
            const count = existing ? existing.count + 1 : 1;
            
            await store.put({
                pattern,
                count,
                lastOccurrence: Date.now(),
                lastMessage: entry.message,
                category: entry.category,
                type: entry.type
            });

        } catch (error) {
            this.fallbackToConsole('ERROR', 'Failed to update error pattern', error);
        }
    }

    // Health monitoring integration
    async recordHealthCheck(component, status, details = {}) {
        const healthRecord = {
            timestamp: Date.now(),
            component,
            status, // 'healthy', 'warning', 'error'
            details,
            sessionId: this.getSessionId()
        };

        // Log health status
        const level = status === 'healthy' ? 'INFO' : 
                     status === 'warning' ? 'WARN' : 'ERROR';
        
        this.log({
            type: 'HEALTH',
            category: 'HEALTH',
            level,
            message: `Health check: ${component} is ${status}`,
            data: healthRecord
        });

        // Store in health database
        if (this.db) {
            try {
                const transaction = this.db.transaction(['health'], 'readwrite');
                const store = transaction.objectStore('health');
                await store.add(healthRecord);
            } catch (error) {
                this.fallbackToConsole('ERROR', 'Failed to store health record', error);
            }
        }

        return healthRecord;
    }

    // Configuration integration methods
    logConfigOperation(operation, key, value, success = true, error = null) {
        this.log({
            type: 'CONFIG',
            category: 'CONFIG',
            level: success ? 'INFO' : 'ERROR',
            message: `Config ${operation}: ${key}`,
            data: {
                operation,
                key,
                value: this.sanitizeValue(key, value),
                success,
                error: error ? error.message : null
            }
        });
    }

    logMigration(migrationName, status, details = {}) {
        this.log({
            type: 'MIGRATION',
            category: 'MIGRATION', 
            level: status === 'success' ? 'INFO' : 
                   status === 'warning' ? 'WARN' : 'ERROR',
            message: `Migration ${migrationName}: ${status}`,
            data: { migrationName, status, ...details }
        });
    }

    logValidation(component, valid, errors = [], warnings = []) {
        this.log({
            type: 'VALIDATION',
            category: 'VALIDATION',
            level: valid ? 'INFO' : 'ERROR',
            message: `Validation ${component}: ${valid ? 'passed' : 'failed'}`,
            data: {
                component,
                valid,
                errorCount: errors.length,
                warningCount: warnings.length,
                errors: errors.slice(0, 5), // Limit to first 5 errors
                warnings: warnings.slice(0, 5)
            }
        });
    }

    // Feature flag integration
    logFeatureFlag(flagName, enabled, context = {}) {
        this.log({
            type: 'FEATURE',
            category: 'FEATURE',
            level: 'INFO',
            message: `Feature flag ${flagName}: ${enabled ? 'enabled' : 'disabled'}`,
            data: { flagName, enabled, context }
        });
    }

    // Utility methods
    sanitizeValue(key, value) {
        // Don't log sensitive values
        const sensitiveKeys = ['userToken', 'password', 'authToken', 'currentUser'];
        if (sensitiveKeys.some(k => key.toLowerCase().includes(k.toLowerCase()))) {
            return '[REDACTED]';
        }
        
        if (typeof value === 'object' && value !== null) {
            try {
                return JSON.stringify(value).substring(0, 200) + '...';
            } catch {
                return '[Object]';
            }
        }
        
        return String(value).substring(0, 200);
    }

    getSessionId() {
        if (!this.sessionId) {
            this.sessionId = Date.now() + '_' + Math.random().toString(36).substring(2);
        }
        return this.sessionId;
    }

    // Public API methods that config service expects
    setEnabled(enabled) {
        this.isEnabled = enabled;
        
        // Save to config service if available
        if (this.configReady && window.config) {
            window.config.set('loggingEnabled', enabled);
        } else {
            localStorage.setItem('ava_logging_enabled', enabled.toString());
        }

        this.log({
            type: 'CONFIG',
            category: 'CONFIG',
            level: 'INFO',
            message: `Logging ${enabled ? 'enabled' : 'disabled'}`,
            data: { enabled }
        });
    }

    async exportLogs(filters = {}) {
        if (!this.db) {
            return this.logBuffer;
        }

        try {
            // First flush any pending logs
            await this.flushLogs();

            const transaction = this.db.transaction(['logs'], 'readonly');
            const store = transaction.objectStore('logs');
            
            let logs = [];
            
            if (filters.level) {
                const index = store.index('level');
                const range = IDBKeyRange.only(filters.level);
                const request = index.getAll(range);
                logs = await new Promise((resolve, reject) => {
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
            } else {
                const request = store.getAll();
                logs = await new Promise((resolve, reject) => {
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
            }

            // Apply additional filters
            if (filters.startTime) {
                logs = logs.filter(log => log.timestamp >= filters.startTime);
            }
            if (filters.endTime) {
                logs = logs.filter(log => log.timestamp <= filters.endTime);
            }
            if (filters.category) {
                logs = logs.filter(log => log.category === filters.category);
            }

            return logs.sort((a, b) => a.timestamp - b.timestamp);

        } catch (error) {
            this.fallbackToConsole('ERROR', 'Failed to export logs', error);
            return this.logBuffer;
        }
    }

    async getErrorReport() {
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        const logs = await this.exportLogs({ startTime: oneDayAgo });
        
        const errors = logs.filter(log => log.level === 'ERROR' || log.level === 'CRITICAL');
        const warnings = logs.filter(log => log.level === 'WARN');
        
        const errorsByCategory = {};
        errors.forEach(error => {
            if (!errorsByCategory[error.category]) {
                errorsByCategory[error.category] = 0;
            }
            errorsByCategory[error.category]++;
        });

        return {
            totalErrors: errors.length,
            totalWarnings: warnings.length,
            errorsByCategory,
            recentErrors: errors.slice(-10),
            timeRange: { start: oneDayAgo, end: Date.now() }
        };
    }

    async clearLogs() {
        try {
            // Clear buffer
            this.logBuffer = [];
            
            if (this.db) {
                const transaction = this.db.transaction(['logs', 'performance', 'errorPatterns', 'health'], 'readwrite');
                
                await Promise.all([
                    transaction.objectStore('logs').clear(),
                    transaction.objectStore('performance').clear(),
                    transaction.objectStore('errorPatterns').clear(),
                    transaction.objectStore('health').clear()
                ]);
            }

            // Clear in-memory tracking
            this.errorCounts.clear();
            this.performanceMetrics.measurements = [];

            this.log({
                type: 'SYSTEM',
                category: 'CONFIG',
                level: 'INFO',
                message: 'All logs cleared',
                data: { clearedAt: Date.now() }
            });

        } catch (error) {
            this.fallbackToConsole('ERROR', 'Failed to clear logs', error);
        }
    }

    // Automated maintenance
    startPeriodicTasks() {
        // Rotate logs periodically
        setInterval(() => {
            this.rotateLogs();
        }, this.rotationCheckInterval);

        // Flush logs periodically
        setInterval(() => {
            if (this.logBuffer.length > 0) {
                this.flushLogs();
            }
        }, 30000); // Every 30 seconds
    }

    async rotateLogs() {
        if (!this.db) return;

        try {
            const cutoffTime = Date.now() - this.maxLogAge;
            
            const transaction = this.db.transaction(['logs'], 'readwrite');
            const store = transaction.objectStore('logs');
            const index = store.index('timestamp');
            
            // Delete old logs
            const range = IDBKeyRange.upperBound(cutoffTime);
            const request = index.openCursor(range);
            
            let deletedCount = 0;
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    deletedCount++;
                    cursor.continue();
                }
            };

            await new Promise((resolve, reject) => {
                transaction.oncomplete = () => {
                    if (deletedCount > 0) {
                        this.log({
                            type: 'SYSTEM',
                            category: 'CONFIG',
                            level: 'INFO',
                            message: `Log rotation completed: ${deletedCount} old logs deleted`,
                            data: { deletedCount, cutoffTime }
                        });
                    }
                    resolve();
                };
                transaction.onerror = () => reject(transaction.error);
            });

        } catch (error) {
            this.fallbackToConsole('ERROR', 'Log rotation failed', error);
        }
    }

    // Error handling setup
    setupErrorHandling() {
        // Global error handler
        window.addEventListener('error', (event) => {
            this.log({
                type: 'ERROR',
                category: 'ERROR',
                level: 'ERROR',
                message: `Unhandled error: ${event.message}`,
                data: {
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    stack: event.error ? event.error.stack : null
                }
            });
        });

        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.log({
                type: 'ERROR',
                category: 'ERROR',
                level: 'ERROR',
                message: `Unhandled promise rejection: ${event.reason}`,
                data: {
                    reason: event.reason,
                    stack: event.reason && event.reason.stack ? event.reason.stack : null
                }
            });
        });
    }

    // Debug and development methods
    getDebugInfo() {
        return {
            isEnabled: this.isEnabled,
            debugMode: this.debugMode,
            configReady: this.configReady,
            bufferSize: this.logBuffer.length,
            sessionId: this.getSessionId(),
            errorCounts: Object.fromEntries(this.errorCounts),
            recentPerformance: this.performanceMetrics.measurements.slice(-5),
            dbReady: !!this.db
        };
    }

    // Method for replacing console.log calls
    static replaceConsole() {
        if (window.logger) {
            const originalConsole = { ...console };
            
            console.log = (...args) => {
                window.logger.log({
                    type: 'CONSOLE',
                    category: 'GENERAL',
                    level: 'INFO',
                    message: args.join(' ')
                });
                originalConsole.log(...args);
            };

            console.warn = (...args) => {
                window.logger.log({
                    type: 'CONSOLE',
                    category: 'GENERAL',
                    level: 'WARN',
                    message: args.join(' ')
                });
                originalConsole.warn(...args);
            };

            console.error = (...args) => {
                window.logger.log({
                    type: 'CONSOLE',
                    category: 'ERROR',
                    level: 'ERROR',
                    message: args.join(' ')
                });
                originalConsole.error(...args);
            };

            // Store original console for restoration
            window.logger._originalConsole = originalConsole;
        }
    }

    static restoreConsole() {
        if (window.logger && window.logger._originalConsole) {
            Object.assign(console, window.logger._originalConsole);
            delete window.logger._originalConsole;
        }
    }
}

// Initialize enhanced logger
const enhancedLogger = new EnhancedLogger();

// Expose to window for config service integration
window.logger = enhancedLogger;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedLogger;
}