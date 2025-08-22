// Complete Logger System for Ava Solutions PWA
// Integrates existing functionality with config service, error recovery, and feature flags
// Supports all methods your existing code expects

class CompleteLogger {
    constructor() {
        this.dbName = 'AvaCompleteLogsDB';
        this.version = 3;
        this.db = null;
        this.isEnabled = true;
        this.configReady = false;
        this.mode = this.getMode();
        
        // Buffer management
        this.logBuffer = [];
        this.bufferSize = 100;
        this.flushInterval = 5000;
        this.flushTimer = null;
        
        // Size and rotation limits
        this.maxLogs = this.mode === 'production' ? 10000 : 50000;
        this.maxLogAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        this.rotationCheckInterval = 60 * 60 * 1000; // 1 hour
        
        // Session tracking
        this.sessionId = this.generateSessionId();
        
        // Performance tracking
        this.performanceTimers = new Map();
        this.performanceMetrics = {
            dbOperations: [],
            apiCalls: [],
            stateChanges: [],
            measurements: []
        };
        
        // Error tracking
        this.errorCounts = new Map();
        this.errorPatterns = new Map();
        this.componentUsage = new Map();
        this.globalVarAccess = new Map();
        this.apiCallCounts = new Map();
        
        // Log levels with priorities for filtering
        this.levels = {
            DEBUG: { priority: 0, color: '#64748b', console: 'debug' },
            INFO: { priority: 1, color: '#3b82f6', console: 'log' },
            WARN: { priority: 2, color: '#f59e0b', console: 'warn' },
            ERROR: { priority: 3, color: '#ef4444', console: 'error' },
            CRITICAL: { priority: 4, color: '#dc2626', console: 'error' }
        };
        
        // Categories for organization
        this.categories = {
            SYSTEM: 'System Operations',
            DATABASE: 'Database Operations',
            API: 'API Calls',
            AUTH: 'Authentication',
            CONFIG: 'Configuration',
            COMPONENT: 'Component Operations',
            NAVIGATION: 'Navigation',
            PERFORMANCE: 'Performance',
            ERROR: 'Error Handling',
            USER: 'User Interactions',
            STATE: 'State Changes',
            GLOBAL_VAR: 'Global Variables',
            DATA_FLOW: 'Data Flow',
            INIT: 'Initialization',
            MIGRATION: 'Migration',
            VALIDATION: 'Validation',
            FEATURE: 'Feature Flags',
            RECOVERY: 'Error Recovery',
            HEALTH: 'Health Monitoring',
            BACKUP: 'Backup Operations',
            SYNC: 'Synchronization'
        };
        
        this.init();
    }

    async init() {
        try {
            // Wait for dependencies
            await this.waitForDependencies();
            
            // Initialize database
            await this.initDB();
            
            // Load settings from config service
            await this.loadSettings();
            
            // Setup automatic systems
            this.setupInterceptors();
            this.startBufferFlush();
            this.startPeriodicTasks();
            
            // Initial log
            await this.log({
                type: 'SYSTEM',
                category: 'INIT',
                level: 'INFO',
                message: 'Complete Logger System initialized',
                data: {
                    mode: this.mode,
                    maxLogs: this.maxLogs,
                    configReady: this.configReady,
                    version: this.version,
                    sessionId: this.sessionId,
                    userAgent: navigator.userAgent,
                    timestamp: Date.now()
                }
            });
            
            console.log(`📝 Complete Logger initialized in ${this.mode} mode`);
            
        } catch (error) {
            console.error('Failed to initialize Complete Logger:', error);
            this.fallbackToConsole('ERROR', 'Logger initialization failed', error);
        }
    }

    async waitForDependencies() {
        let attempts = 0;
        const maxAttempts = 50;
        
        while (attempts < maxAttempts) {
            if (window.config?.isInitialized) {
                this.configReady = true;
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!this.configReady) {
            console.warn('Logger: Config service timeout, using fallback settings');
        }
    }

    async loadSettings() {
        try {
            if (this.configReady) {
                this.isEnabled = await window.config.get('loggingEnabled', true);
                const debugMode = await window.config.get('debugMode', false);
                const performanceMode = await window.config.get('performanceMode', 'auto');
                
                // Adjust log level based on config
                if (debugMode) {
                    this.minLevel = 'DEBUG';
                } else if (performanceMode === 'safe') {
                    this.minLevel = 'WARN';
                } else if (this.mode === 'production') {
                    this.minLevel = 'INFO';
                } else {
                    this.minLevel = 'DEBUG';
                }
                
                // Listen for config changes
                if (window.config && typeof window.config.listen === 'function') {
                    window.config.listen('loggingEnabled', (enabled) => {
                        this.setEnabled(enabled);
                    });
                    
                    window.config.listen('debugMode', (enabled) => {
                        this.minLevel = enabled ? 'DEBUG' : 'INFO';
                    });
                }
            } else {
                // Fallback to existing method
                this.isEnabled = this.getFeatureFlag();
                this.minLevel = this.mode === 'development' ? 'DEBUG' : 'INFO';
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

                // Logs store with comprehensive indexing
                if (!db.objectStoreNames.contains('logs')) {
                    const logsStore = db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
                    logsStore.createIndex('timestamp', 'timestamp', { unique: false });
                    logsStore.createIndex('level', 'level', { unique: false });
                    logsStore.createIndex('type', 'type', { unique: false });
                    logsStore.createIndex('category', 'category', { unique: false });
                    logsStore.createIndex('sessionId', 'sessionId', { unique: false });
                    logsStore.createIndex('component', 'component', { unique: false });
                    logsStore.createIndex('userId', 'userId', { unique: false });
                }

                // Performance metrics store
                if (!db.objectStoreNames.contains('performance')) {
                    const perfStore = db.createObjectStore('performance', { keyPath: 'id', autoIncrement: true });
                    perfStore.createIndex('operation', 'operation', { unique: false });
                    perfStore.createIndex('timestamp', 'timestamp', { unique: false });
                    perfStore.createIndex('duration', 'duration', { unique: false });
                    perfStore.createIndex('component', 'component', { unique: false });
                }

                // Error patterns store
                if (!db.objectStoreNames.contains('errorPatterns')) {
                    const errorStore = db.createObjectStore('errorPatterns', { keyPath: 'pattern' });
                    errorStore.createIndex('count', 'count', { unique: false });
                    errorStore.createIndex('lastOccurrence', 'lastOccurrence', { unique: false });
                    errorStore.createIndex('component', 'component', { unique: false });
                }

                // Analytics store for aggregated data
                if (!db.objectStoreNames.contains('analytics')) {
                    const analyticsStore = db.createObjectStore('analytics', { keyPath: 'id', autoIncrement: true });
                    analyticsStore.createIndex('type', 'type', { unique: false });
                    analyticsStore.createIndex('date', 'date', { unique: false });
                    analyticsStore.createIndex('component', 'component', { unique: false });
                }
            };
        });
    }

    // Main logging method - supports all existing API calls
    async log(entry) {
        if (!this.isEnabled) return;

        try {
            // Handle different input formats for backward compatibility
            let normalizedEntry;
            
            if (typeof entry === 'string') {
                normalizedEntry = {
                    type: 'GENERAL',
                    category: 'GENERAL',
                    level: 'INFO',
                    message: entry,
                    data: null
                };
            } else if (entry && typeof entry === 'object') {
                normalizedEntry = {
                    type: entry.type || 'GENERAL',
                    category: entry.category || 'GENERAL',
                    level: entry.level || 'INFO',
                    message: entry.message || 'No message',
                    data: entry.data || null,
                    component: entry.component || null,
                    context: entry.context || null
                };
            } else {
                normalizedEntry = {
                    type: 'GENERAL',
                    category: 'GENERAL',
                    level: 'INFO',
                    message: String(entry),
                    data: null
                };
            }

            // Check if log level meets minimum threshold
            if (!this.shouldLog(normalizedEntry.level)) {
                return;
            }

            // Enrich the log entry
            const enrichedEntry = {
                ...normalizedEntry,
                id: null, // Will be set by IndexedDB
                timestamp: Date.now(),
                date: new Date().toISOString(),
                sessionId: this.sessionId,
                userId: this.getUserId(),
                url: window.location.href,
                userAgent: navigator.userAgent,
                mode: this.mode
            };

            // Add stack trace for errors
            if (enrichedEntry.level === 'ERROR' || enrichedEntry.level === 'CRITICAL') {
                enrichedEntry.stackTrace = new Error().stack;
                this.trackError(enrichedEntry);
            }

            // Buffer the log entry
            this.logBuffer.push(enrichedEntry);
            
            // Update counters and tracking
            this.updateCounters(enrichedEntry);

            // Console output based on mode and level
            this.outputToConsole(enrichedEntry);

            // Immediate flush for critical logs
            if (enrichedEntry.level === 'ERROR' || enrichedEntry.level === 'CRITICAL') {
                await this.flush();
            } else if (this.logBuffer.length >= this.bufferSize) {
                await this.flush();
            }

        } catch (error) {
            this.fallbackToConsole('ERROR', 'Logging failed', error);
        }
    }

    // Specialized logging methods for backward compatibility
    async logError(error, context, component) {
        const errorKey = `${error.name}: ${error.message}`;
        this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);

        await this.log({
            type: 'ERROR',
            category: 'EXCEPTION',
            level: 'ERROR',
            message: error.message,
            component: component,
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

        // Store in performance metrics
        this.performanceMetrics.measurements.push({
            operation,
            duration,
            timestamp: Date.now(),
            details
        });
    }

    // Performance timer methods
    startPerformanceTimer(operation) {
        const id = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.performanceTimers.set(id, {
            operation,
            startTime: performance.now(),
            timestamp: Date.now()
        });
        return id;
    }

    endPerformanceTimer(id, additionalData = {}) {
        const timerData = this.performanceTimers.get(id);
        if (!timerData) {
            console.warn(`Performance timer ${id} not found`);
            return null;
        }

        const duration = performance.now() - timerData.startTime;
        this.performanceTimers.delete(id);

        const measurement = {
            operation: timerData.operation,
            duration,
            timestamp: timerData.timestamp,
            ...additionalData
        };

        // Log performance
        this.logPerformance(timerData.operation, duration, additionalData);

        // Store in performance store
        this.storePerformanceMetric(measurement);

        return measurement;
    }

    async storePerformanceMetric(measurement) {
        if (!this.db) return;

        try {
            const transaction = this.db.transaction(['performance'], 'readwrite');
            const store = transaction.objectStore('performance');
            await new Promise((resolve, reject) => {
                const request = store.add(measurement);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            this.fallbackToConsole('ERROR', 'Failed to store performance metric', error);
        }
    }

    // Specialized logging methods for existing API compatibility
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
                dataSize: data ? JSON.stringify(data).length : 0
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
        try {
            const endpoint = new URL(url).pathname;
            const key = `${method} ${endpoint}`;
            this.apiCallCounts.set(key, (this.apiCallCounts.get(key) || 0) + 1);
        } catch (e) {
            // Invalid URL, use as-is
            const key = `${method} ${url}`;
            this.apiCallCounts.set(key, (this.apiCallCounts.get(key) || 0) + 1);
        }

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
            component: component,
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
            component: component,
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
                dataSize: data ? JSON.stringify(data).length : 0,
                keys: typeof data === 'object' && data ? Object.keys(data) : null
            }
        });
    }

    // Error tracking and pattern analysis
    trackError(entry) {
        const pattern = this.extractErrorPattern(entry);
        
        // Update error count
        const currentCount = this.errorCounts.get(pattern) || 0;
        this.errorCounts.set(pattern, currentCount + 1);

        // Store pattern in database
        this.updateErrorPattern(pattern, entry);

        // Check for error storms
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
            
            const existing = await new Promise((resolve, reject) => {
                const request = store.get(pattern);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
            const count = existing ? existing.count + 1 : 1;
            
            await new Promise((resolve, reject) => {
                const request = store.put({
                    pattern,
                    count,
                    lastOccurrence: Date.now(),
                    lastMessage: entry.message,
                    category: entry.category,
                    type: entry.type,
                    component: entry.component
                });
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });

        } catch (error) {
            this.fallbackToConsole('ERROR', 'Failed to update error pattern', error);
        }
    }

    // Export methods for backward compatibility
    async exportLogs(startDate, endDate) {
        if (!this.db) {
            return this.logBuffer;
        }

        try {
            // First flush any pending logs
            await this.flush();

            const transaction = this.db.transaction(['logs'], 'readonly');
            const store = transaction.objectStore('logs');
            const index = store.index('timestamp');

            const startTime = startDate ? new Date(startDate).getTime() : 0;
            const endTime = endDate ? new Date(endDate).getTime() : Date.now();
            
            const range = IDBKeyRange.bound(startTime, endTime);

            return new Promise((resolve, reject) => {
                const logs = [];
                const request = index.openCursor(range);
                
                request.onsuccess = () => {
                    const cursor = request.result;
                    if (cursor) {
                        logs.push(cursor.value);
                        cursor.continue();
                    } else {
                        resolve(logs.sort((a, b) => a.timestamp - b.timestamp));
                    }
                };
                
                request.onerror = () => reject(request.error);
            });

        } catch (error) {
            this.fallbackToConsole('ERROR', 'Failed to export logs', error);
            return this.logBuffer;
        }
    }

    async clearLogs() {
        try {
            // Clear buffer
            this.logBuffer = [];
            
            if (this.db) {
                const transaction = this.db.transaction(['logs', 'performance', 'errorPatterns', 'analytics'], 'readwrite');
                
                await Promise.all([
                    new Promise((resolve, reject) => {
                        const request = transaction.objectStore('logs').clear();
                        request.onsuccess = () => resolve();
                        request.onerror = () => reject(request.error);
                    }),
                    new Promise((resolve, reject) => {
                        const request = transaction.objectStore('performance').clear();
                        request.onsuccess = () => resolve();
                        request.onerror = () => reject(request.error);
                    }),
                    new Promise((resolve, reject) => {
                        const request = transaction.objectStore('errorPatterns').clear();
                        request.onsuccess = () => resolve();
                        request.onerror = () => reject(request.error);
                    }),
                    new Promise((resolve, reject) => {
                        const request = transaction.objectStore('analytics').clear();
                        request.onsuccess = () => resolve();
                        request.onerror = () => reject(request.error);
                    })
                ]);
            }

            // Clear in-memory tracking
            this.errorCounts.clear();
            this.errorPatterns.clear();
            this.componentUsage.clear();
            this.globalVarAccess.clear();
            this.apiCallCounts.clear();
            this.performanceMetrics.measurements = [];
            this.performanceMetrics.dbOperations = [];
            this.performanceMetrics.apiCalls = [];
            this.performanceMetrics.stateChanges = [];

            await this.log({
                type: 'SYSTEM',
                category: 'CONFIG',
                level: 'INFO',
                message: 'All logs cleared',
                data: { clearedAt: Date.now() }
            });

            console.log('📝 All logs cleared');

        } catch (error) {
            this.fallbackToConsole('ERROR', 'Failed to clear logs', error);
        }
    }

    // Report generation methods
    async getErrorReport() {
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        const logs = await this.exportLogs(new Date(oneDayAgo), new Date());
        
        const errors = logs.filter(log => log.level === 'ERROR' || log.level === 'CRITICAL');
        const warnings = logs.filter(log => log.level === 'WARN');
        
        const errorsByCategory = {};
        errors.forEach(error => {
            if (!errorsByCategory[error.category]) {
                errorsByCategory[error.category] = 0;
            }
            errorsByCategory[error.category]++;
        });

        const topErrors = Array.from(this.errorCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20);

        return {
            totalErrors: errors.length,
            totalWarnings: warnings.length,
            uniqueErrors: this.errorCounts.size,
            errorsByCategory,
            topErrors,
            recentErrors: errors.slice(-10),
            timeRange: { start: oneDayAgo, end: Date.now() }
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
        const measurementAvg = this.calculateAverage(this.performanceMetrics.measurements.map(m => m.duration));

        return {
            database: {
                averageOperationTime: dbAvg,
                operations: this.performanceMetrics.dbOperations.length
            },
            api: {
                averageCallTime: apiAvg,
                calls: this.performanceMetrics.apiCalls.length
            },
            measurements: {
                averageTime: measurementAvg,
                count: this.performanceMetrics.measurements.length
            },
            stateChanges: this.performanceMetrics.stateChanges.length
        };
    }

    getDebugInfo() {
        return {
            isEnabled: this.isEnabled,
            mode: this.mode,
            configReady: this.configReady,
            bufferSize: this.logBuffer.length,
            sessionId: this.sessionId,
            userId: this.getUserId(),
            errorCounts: Object.fromEntries(this.errorCounts),
            componentUsage: Object.fromEntries(this.componentUsage),
            globalVarAccess: Object.fromEntries(this.globalVarAccess),
            apiCallCounts: Object.fromEntries(this.apiCallCounts),
            recentPerformance: this.performanceMetrics.measurements.slice(-5),
            dbReady: !!this.db,
            activeTimers: this.performanceTimers.size,
            minLevel: this.minLevel,
            version: this.version
        };
    }

    // Configuration and control methods
    setEnabled(enabled) {
        this.isEnabled = enabled;
        
        // Save to config service if available
        if (this.configReady && window.config) {
            window.config.set('loggingEnabled', enabled);
        } else {
            localStorage.setItem('ava_logging_enabled', enabled.toString());
        }

        if (enabled && !this.db) {
            this.init();
        }
        
        console.log(`📝 Logging ${enabled ? 'enabled' : 'disabled'}`);
        
        this.log({
            type: 'CONFIG',
            category: 'CONFIG',
            level: 'INFO',
            message: `Logging ${enabled ? 'enabled' : 'disabled'}`,
            data: { enabled }
        });
    }

    get isEnabled() {
        return this._isEnabled;
    }

    set isEnabled(value) {
        this._isEnabled = value;
    }

    // Utility methods
    shouldLog(level) {
        if (!this.isEnabled) return false;
        
        const levelPriority = this.levels[level]?.priority ?? 1;
        const minPriority = this.levels[this.minLevel]?.priority ?? 1;
        
        return levelPriority >= minPriority;
    }

    outputToConsole(entry) {
        if (this.mode === 'development' || entry.level === 'ERROR' || entry.level === 'CRITICAL') {
            const levelInfo = this.levels[entry.level] || this.levels.INFO;
            const style = `color: ${levelInfo.color}; font-weight: bold;`;
            const timestamp = new Date(entry.timestamp).toLocaleTimeString();
            
            const consoleMethod = levelInfo.console || 'log';
            
            if (this.mode === 'development') {
                console.groupCollapsed(
                    `%c[${entry.level}] ${entry.type}/${entry.category} - ${entry.message}`,
                    style
                );
                console.log('📅 Time:', timestamp);
                console.log('🔧 Data:', entry.data);
                console.log('🌐 URL:', entry.url);
                if (entry.component) console.log('🏗️ Component:', entry.component);
                if (entry.stackTrace) console.log('📚 Stack:', entry.stackTrace);
                console.groupEnd();
            } else {
                console[consoleMethod](`%c[${entry.level}] ${entry.message}`, style, entry.data || '');
            }
        }
    }

    fallbackToConsole(level, message, data) {
        const prefix = `[LOGGER ${level}]`;
        const logData = data ? (typeof data === 'object' ? JSON.stringify(data) : data) : '';
        
        switch (level) {
            case 'ERROR':
            case 'CRITICAL':
                console.error(prefix, message, logData);
                break;
            case 'WARN':
                console.warn(prefix, message, logData);
                break;
            default:
                console.log(prefix, message, logData);
        }
    }

    sanitizeValue(value) {
        if (value === null || value === undefined) return value;
        
        // Remove sensitive data
        if (typeof value === 'string') {
            // Don't log passwords, tokens, etc.
            if (value.length > 100 || /password|token|secret|key|auth/i.test(value)) {
                return '[REDACTED]';
            }
        }
        
        if (typeof value === 'object' && value !== null) {
            try {
                const sanitized = {};
                for (const [key, val] of Object.entries(value)) {
                    if (/password|token|secret|key|auth/i.test(key)) {
                        sanitized[key] = '[REDACTED]';
                    } else {
                        sanitized[key] = val;
                    }
                }
                return sanitized;
            } catch {
                return '[Object]';
            }
        }
        
        return value;
    }

    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getUserId() {
        try {
            // Try to get user ID from auth system
            if (window.authSystem && window.authSystem.currentUser) {
                return window.authSystem.currentUser.id || window.authSystem.currentUser.email;
            }
            
            // Try to get from localStorage
            const userStr = localStorage.getItem('currentUser');
            if (userStr) {
                const user = JSON.parse(userStr);
                return user.id || user.email || 'anonymous';
            }
            
            return 'anonymous';
        } catch (error) {
            return 'anonymous';
        }
    }

    updateCounters(logEntry) {
        // Update error frequency
        if (logEntry.level === 'ERROR' || logEntry.level === 'CRITICAL') {
            const errorKey = logEntry.message;
            this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);
        }

        // Update component usage
        if (logEntry.component) {
            this.componentUsage.set(logEntry.component, (this.componentUsage.get(logEntry.component) || 0) + 1);
        }
    }

    calculateAverage(numbers) {
        if (numbers.length === 0) return 0;
        return numbers.reduce((a, b) => a + b, 0) / numbers.length;
    }

    getMode() {
        // Check if we're in production or development
        const isDev = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname.includes('dev') ||
                     window.location.protocol === 'file:';
        
        return isDev ? 'development' : 'production';
    }

    getFeatureFlag() {
        // Fallback method for when config service isn't available
        
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

    // Buffer management and periodic tasks
    startBufferFlush() {
        // Flush buffer periodically
        const flushBufferPeriodically = () => {
            if (this.logBuffer.length > 0) {
                this.flush();
            }
            this.flushTimer = setTimeout(flushBufferPeriodically, this.flushInterval);
        };
        
        flushBufferPeriodically();

        // Flush on page unload
        window.addEventListener('beforeunload', () => {
            this.flush();
        });

        // Flush on visibility change (when page becomes hidden)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.logBuffer.length > 0) {
                this.flush();
            }
        });
    }

    startPeriodicTasks() {
        // Rotate logs periodically
        setInterval(() => {
            this.rotateLogs();
        }, this.rotationCheckInterval);
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
            this.fallbackToConsole('ERROR', 'Failed to flush logs', error);
            // Put logs back in buffer for retry
            this.logBuffer.unshift(...logsToFlush);
        }
    }

    async cleanup() {
        if (!this.db) return;

        try {
            const transaction = this.db.transaction(['logs'], 'readwrite');
            const store = transaction.objectStore('logs');

            // Count total logs
            const count = await new Promise((resolve, reject) => {
                const request = store.count();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

            if (count > this.maxLogs) {
                // Delete oldest logs
                const deleteCount = count - this.maxLogs;
                const index = store.index('timestamp');
                
                let deleted = 0;
                const cursorRequest = index.openCursor();
                
                await new Promise((resolve, reject) => {
                    cursorRequest.onsuccess = (event) => {
                        const cursor = event.target.result;
                        if (cursor && deleted < deleteCount) {
                            cursor.delete();
                            deleted++;
                            cursor.continue();
                        } else {
                            resolve();
                        }
                    };
                    cursorRequest.onerror = () => reject(cursorRequest.error);
                });
            }
        } catch (error) {
            this.fallbackToConsole('ERROR', 'Failed to cleanup logs', error);
        }
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
            
            let deletedCount = 0;
            const cursorRequest = index.openCursor(range);
            
            await new Promise((resolve, reject) => {
                cursorRequest.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        cursor.delete();
                        deletedCount++;
                        cursor.continue();
                    } else {
                        resolve();
                    }
                };
                cursorRequest.onerror = () => reject(cursorRequest.error);
            });

            if (deletedCount > 0) {
                this.log({
                    type: 'SYSTEM',
                    category: 'CONFIG',
                    level: 'INFO',
                    message: `Log rotation completed: ${deletedCount} old logs deleted`,
                    data: { deletedCount, cutoffTime }
                });
            }

        } catch (error) {
            this.fallbackToConsole('ERROR', 'Log rotation failed', error);
        }
    }

    // Setup automatic interceptors for existing API compatibility
    setupInterceptors() {
        this.interceptDatabase();
        this.interceptAPI();
        this.interceptErrors();
        this.interceptGlobalVars();
    }

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
                    const text = await clonedResponse.text();
                    responseData = text.length > 0 ? text : null;
                } catch (e) {
                    // Response reading failed
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
    }

    interceptErrors() {
        // Global error handler
        window.addEventListener('error', async (event) => {
            await this.logError(event.error || new Error(event.message), {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                type: 'global_error'
            }, 'global');
        });

        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', async (event) => {
            await this.logError(
                new Error(`Unhandled Promise Rejection: ${event.reason}`),
                {
                    reason: event.reason,
                    type: 'unhandled_promise_rejection'
                },
                'global'
            );
        });
    }

    interceptGlobalVars() {
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
}

// Replace existing logger with complete logger
window.logger = new CompleteLogger();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CompleteLogger;
}

// Legacy method support for existing codebase
window.logDatabaseOperation = (operation, table, data) => {
    const startTime = performance.now();
    return {
        start: () => {},
        success: (result) => {
            const duration = performance.now() - startTime;
            window.logger.logDBOperation(operation, table, data, duration, true);
        },
        error: (error) => {
            const duration = performance.now() - startTime;
            window.logger.logDBOperation(operation, table, data, duration, false);
            window.logger.logError(error, { operation, table }, 'database');
        }
    };
};

window.logAPICall = (method, url, options) => {
    const startTime = performance.now();
    return {
        start: () => {},
        success: (response, responseData) => {
            const duration = performance.now() - startTime;
            window.logger.logAPICall(method, url, response.status || 200, duration, options.body, responseData);
        },
        error: (error) => {
            const duration = performance.now() - startTime;
            window.logger.logAPICall(method, url, 0, duration, options.body, null);
            window.logger.logError(error, { method, url }, 'api');
        }
    };
};

window.logNavigation = (fromPage, toPage) => {
    window.logger.log({
        type: 'NAVIGATION',
        category: 'PAGE_CHANGE',
        level: 'INFO',
        message: `Navigation: ${fromPage} → ${toPage}`,
        data: { fromPage, toPage, timestamp: Date.now() }
    });
};

console.log('📝 Complete Logger System loaded and ready');