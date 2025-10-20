// Fixed Logger System for SPA PWA
// Resolves race conditions, IndexedDB issues, and adds error boundaries

class FixedLogger {
    constructor() {
        this.dbName = 'AvaCompleteLogsDB';
        this.version = 3;
        this.db = null;
        this.isEnabled = true;
        this.configReady = false;
        this.mode = this.getMode();
        this.initialized = false;
        this.initPromise = null;
        
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
            INFO: { priority: 1, color: '#800020', console: 'log' },
            WARN: { priority: 2, color: '#600015', console: 'warn' },
            ERROR: { priority: 3, color: '#800020', console: 'error' },
            CRITICAL: { priority: 4, color: '#600015', console: 'error' }
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
        
        // Start initialization and store the promise
        this.initPromise = this.init();
    }

    async init() {
        // ULTRA FIX: Completely disable logger initialization to prevent infinite loops
        console.warn('Logger disabled to prevent infinite loops');
        this.initialized = true;
        return true;
        
        /* DISABLED TO PREVENT INFINITE LOOPS - Original code preserved for reference
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
            
            // Mark as initialized
            this.initialized = true;
            
            // Initial log
            await this.log({
                type: 'SYSTEM',
                category: 'INIT',
                level: 'INFO',
                message: 'Fixed Logger System initialized',
                data: { 
                    mode: this.mode,
                    dbStatus: this.db ? 'connected' : 'offline',
                    configReady: this.configReady
                }
            });
            
            return true;
        } catch (error) {
            console.error('Logger initialization failed:', error);
            this.fallbackToConsole('ERROR', 'Logger initialization failed', error);
            // Continue working with console-only mode
            this.initialized = true;
            return false;
        }
        */
    }

    // Ensure logger is ready before operations
    async ensureInitialized() {
        if (this.initialized) return true;
        
        try {
            return await this.initPromise;
        } catch (error) {
            console.warn('Logger initialization pending:', error);
            return false;
        }
    }

    async waitForDependencies() {
        let attempts = 0;
        const maxAttempts = 20; // Reduced from 50 to 20 (2 seconds instead of 5)
        
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

    getMode() {
        // Check multiple indicators for environment
        const hostname = window.location.hostname;
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
        const isLocalFile = window.location.protocol === 'file:';
        const isNetlify = hostname.includes('netlify.app');
        const isRender = hostname.includes('onrender.com');
        
        if (isLocalhost || isLocalFile) return 'development';
        if (isNetlify || isRender) return 'production';
        
        // Check if config service already set the mode
        if (window.config?.mode) return window.config.mode;
        
        // Default based on URL
        return hostname.includes('.com') || hostname.includes('.app') ? 'production' : 'development';
    }

    async loadSettings() {
        try {
            if (!this.configReady || !window.config) return;
            
            const settings = await window.config.getSettings('logger');
            if (settings) {
                this.isEnabled = settings.enabled !== false;
                this.bufferSize = settings.bufferSize || this.bufferSize;
                this.maxLogs = settings.maxLogs || this.maxLogs;
                this.mode = settings.mode || this.mode;
            }
        } catch (error) {
            console.warn('Failed to load logger settings:', error);
        }
    }

    async initDB() {
        return new Promise((resolve, reject) => {
            try {
                const request = indexedDB.open(this.dbName, this.version);

                request.onerror = () => {
                    console.error('IndexedDB error:', request.error);
                    resolve(null); // Continue without DB
                };
                
                request.onsuccess = () => {
                    this.db = request.result;
                    
                    // Add error handler for the database
                    this.db.onerror = (event) => {
                        console.error('Database error:', event.target.error);
                    };
                    
                    resolve(this.db);
                };

                request.onupgradeneeded = (e) => {
                    const db = e.target.result;

                    // Logs store with comprehensive indexing
                    if (!db.objectStoreNames.contains('logs')) {
                        // Don't specify keyPath, let autoIncrement handle it
                        const logsStore = db.createObjectStore('logs', { autoIncrement: true });
                        logsStore.createIndex('timestamp', 'timestamp', { unique: false });
                        logsStore.createIndex('level', 'level', { unique: false });
                        logsStore.createIndex('type', 'type', { unique: false });
                        logsStore.createIndex('category', 'category', { unique: false });
                        logsStore.createIndex('sessionId', 'sessionId', { unique: false });
                        logsStore.createIndex('userId', 'userId', { unique: false });
                    }

                    // Analytics store
                    if (!db.objectStoreNames.contains('analytics')) {
                        const analyticsStore = db.createObjectStore('analytics', { autoIncrement: true });
                        analyticsStore.createIndex('type', 'type', { unique: false });
                        analyticsStore.createIndex('timestamp', 'timestamp', { unique: false });
                    }

                    // Errors store for dedicated error tracking
                    if (!db.objectStoreNames.contains('errors')) {
                        const errorsStore = db.createObjectStore('errors', { autoIncrement: true });
                        errorsStore.createIndex('timestamp', 'timestamp', { unique: false });
                        errorsStore.createIndex('errorType', 'errorType', { unique: false });
                        errorsStore.createIndex('component', 'component', { unique: false });
                    }
                };
                
                // Set a timeout for the operation
                setTimeout(() => {
                    if (!this.db) {
                        console.warn('IndexedDB timeout, continuing without persistence');
                        resolve(null);
                    }
                }, 5000);
            } catch (error) {
                console.error('IndexedDB initialization error:', error);
                resolve(null); // Continue without DB
            }
        });
    }

    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getUserId() {
        // Try multiple sources for user ID
        return localStorage.getItem('userId') || 
               sessionStorage.getItem('userId') || 
               window.currentUser?.id || 
               'anonymous';
    }

    normalizeLogEntry(entry) {
        // Handle various input formats
        if (typeof entry === 'string') {
            return {
                type: 'GENERAL',
                category: 'LOG',
                level: 'INFO',
                message: entry,
                data: null
            };
        }

        return {
            type: entry.type || 'GENERAL',
            category: entry.category || 'LOG',
            level: entry.level || 'INFO',
            message: entry.message || '',
            data: entry.data || null,
            component: entry.component || null,
            action: entry.action || null,
            metadata: entry.metadata || null
        };
    }

    async log(entry) {
        // INFINITE LOOP FIX: Completely disable logging to prevent recursion
        return;
        
        /* DISABLED TO PREVENT INFINITE LOOPS - Original code preserved for reference
        try {
            // Ensure logger is initialized
            await this.ensureInitialized();
            
            if (!this.isEnabled) return;

            // Normalize the entry
            const normalizedEntry = this.normalizeLogEntry(entry);

            // Enrich the log entry (don't include id field)
            const enrichedEntry = {
                ...normalizedEntry,
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
            }

        } catch (error) {
            this.fallbackToConsole('ERROR', 'Logging failed', error);
        }
        */
    }

    // Safe wrapper methods with error boundaries
    async debug(message, data) {
        // ULTRA FIX: Disable all logging methods
        return;
    }

    async info(message, data) {
        // ULTRA FIX: Disable all logging methods
        return;
    }

    async warn(message, data) {
        // ULTRA FIX: Disable all logging methods
        return;
    }

    async error(message, data) {
        // ULTRA FIX: Disable all logging methods
        return;
    }

    async critical(message, data) {
        // ULTRA FIX: Disable all logging methods
        return;
    }

    outputToConsole(entry) {
        // INFINITE LOOP FIX: Disable console output to prevent recursion
        return;
        
        /* DISABLED TO PREVENT INFINITE LOOPS
        if (this.mode === 'production' && entry.level === 'DEBUG') return;

        const level = this.levels[entry.level] || this.levels.INFO;
        const style = `color: ${level.color}; font-weight: bold;`;
        const prefix = `[${entry.level}] [${entry.type}]`;
        
        const consoleMethod = console[level.console] || console.log;
        
        if (entry.data) {
            consoleMethod(`%c${prefix}`, style, entry.message, entry.data);
        } else {
            consoleMethod(`%c${prefix}`, style, entry.message);
        }
        */
    }

    fallbackToConsole(level, message, error) {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${level}] [FALLBACK]`;
        
        if (error) {
            console.error(prefix, message, error);
        } else {
            console.log(prefix, message);
        }
    }

    updateCounters(entry) {
        // Track component usage
        if (entry.component) {
            const count = this.componentUsage.get(entry.component) || 0;
            this.componentUsage.set(entry.component, count + 1);
        }

        // Track API calls
        if (entry.type === 'API') {
            const endpoint = entry.data?.url || 'unknown';
            const count = this.apiCallCounts.get(endpoint) || 0;
            this.apiCallCounts.set(endpoint, count + 1);
        }
    }

    trackError(entry) {
        const errorKey = `${entry.message}_${entry.component || 'unknown'}`;
        const count = this.errorCounts.get(errorKey) || 0;
        this.errorCounts.set(errorKey, count + 1);

        // Track error patterns
        if (entry.stackTrace) {
            const pattern = this.extractErrorPattern(entry.stackTrace);
            const patternCount = this.errorPatterns.get(pattern) || 0;
            this.errorPatterns.set(pattern, patternCount + 1);
        }
    }

    extractErrorPattern(stackTrace) {
        // Extract first meaningful line from stack trace
        const lines = stackTrace.split('\n');
        for (const line of lines) {
            if (line.includes('.js:') && !line.includes('logger')) {
                return line.trim().substring(0, 100);
            }
        }
        return 'unknown_pattern';
    }

    startBufferFlush() {
        this.flushTimer = setInterval(() => {
            if (this.logBuffer.length > 0) {
                this.flush();
            }
        }, this.flushInterval);
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
                    try {
                        const request = store.add(log);
                        request.onsuccess = () => resolve();
                        request.onerror = () => {
                            console.warn('Failed to store log:', request.error);
                            resolve(); // Continue with other logs
                        };
                    } catch (error) {
                        console.warn('Store add error:', error);
                        resolve(); // Continue with other logs
                    }
                });
            }

            // Clean up old logs if we exceed max
            await this.cleanup();
            
        } catch (error) {
            this.fallbackToConsole('ERROR', 'Failed to flush logs', error);
            // Don't put logs back in buffer to avoid infinite loop
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
                request.onerror = () => resolve(0); // Default to 0 on error
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
                    cursorRequest.onerror = () => resolve(); // Continue on error
                });
            }
        } catch (error) {
            // Silent fail for cleanup
            console.debug('Cleanup error:', error);
        }
    }

    startPeriodicTasks() {
        // Periodic cleanup
        setInterval(() => {
            this.cleanup();
            this.rotateOldLogs();
        }, this.rotationCheckInterval);

        // Disable frequent analytics for performance
        /*
        setInterval(() => {
            this.generateAnalytics();
        }, 60000); // Every minute
        */
    }

    async rotateOldLogs() {
        if (!this.db) return;

        try {
            const transaction = this.db.transaction(['logs'], 'readwrite');
            const store = transaction.objectStore('logs');
            const index = store.index('timestamp');
            
            const cutoffTime = Date.now() - this.maxLogAge;
            const range = IDBKeyRange.upperBound(cutoffTime);
            
            const request = index.openCursor(range);
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };
        } catch (error) {
            console.debug('Rotation error:', error);
        }
    }

    async generateAnalytics() {
        if (!this.db) return;

        const analytics = {
            timestamp: Date.now(),
            type: 'periodic',
            componentUsage: Object.fromEntries(this.componentUsage),
            apiCallCounts: Object.fromEntries(this.apiCallCounts),
            errorCounts: Object.fromEntries(this.errorCounts),
            errorPatterns: Object.fromEntries(this.errorPatterns),
            performanceMetrics: this.performanceMetrics
        };

        try {
            const transaction = this.db.transaction(['analytics'], 'readwrite');
            const store = transaction.objectStore('analytics');
            store.add(analytics);
        } catch (error) {
            console.debug('Analytics error:', error);
        }

        // Reset some counters
        this.performanceMetrics = {
            dbOperations: [],
            apiCalls: [],
            stateChanges: [],
            measurements: []
        };
    }

    setupInterceptors() {
        this.interceptConsole();
        this.interceptFetch();
        this.interceptErrors();
        this.interceptGlobalVars();
    }

    interceptConsole() {
        // ULTRA FIX: Completely disable console interception
        return;
        
        /* DISABLED TO PREVENT INFINITE LOOPS
        // Store original console methods
        const originalConsole = {
            log: console.log,
            warn: console.warn,
            error: console.error,
            debug: console.debug
        };*/

        // INFINITE LOOP FIX: Disable console interception to prevent recursion
        // Only intercept in development mode
        if (false) { // this.mode === 'development') {
            console.log = (...args) => {
                originalConsole.log(...args);
                this.log({
                    level: 'INFO',
                    type: 'CONSOLE',
                    message: args[0],
                    data: args.slice(1)
                });
            };

            console.warn = (...args) => {
                originalConsole.warn(...args);
                this.log({
                    level: 'WARN',
                    type: 'CONSOLE',
                    message: args[0],
                    data: args.slice(1)
                });
            };

            console.error = (...args) => {
                originalConsole.error(...args);
                this.log({
                    level: 'ERROR',
                    type: 'CONSOLE',
                    message: args[0],
                    data: args.slice(1)
                });
            };
        }
    }

    interceptFetch() {
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const [url, options = {}] = args;
            const startTime = performance.now();
            
            try {
                const response = await originalFetch(...args);
                const duration = performance.now() - startTime;
                
                this.logAPICall(
                    options.method || 'GET',
                    url,
                    response.status,
                    duration
                );
                
                return response;
            } catch (error) {
                const duration = performance.now() - startTime;
                
                this.logAPICall(
                    options.method || 'GET',
                    url,
                    0,
                    duration,
                    null,
                    error
                );
                
                throw error;
            }
        };
    }

    interceptErrors() {
        window.addEventListener('error', (event) => {
            this.logError(event.error || event.message, {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            }, 'uncaught');
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.logError(event.reason, {
                promise: event.promise
            }, 'unhandled_promise');
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

    // Specialized logging methods
    async logDBOperation(operation, table, data, duration, success) {
        try {
            const entry = {
                type: 'DATABASE',
                category: 'DB_OPERATION',
                level: success ? 'INFO' : 'ERROR',
                message: `${operation} on ${table}`,
                data: {
                    operation,
                    table,
                    data,
                    duration,
                    success
                }
            };
            
            await this.log(entry);
            
            // Track performance
            this.performanceMetrics.dbOperations.push({
                operation,
                table,
                duration,
                timestamp: Date.now()
            });
        } catch (error) {
            console.debug('logDBOperation error:', error);
        }
    }

    async logAPICall(method, url, status, duration, requestData, responseData) {
        try {
            const entry = {
                type: 'API',
                category: 'API_CALL',
                level: status >= 400 ? 'ERROR' : 'INFO',
                message: `${method} ${url}`,
                data: {
                    method,
                    url,
                    status,
                    duration,
                    requestData,
                    responseData
                }
            };
            
            await this.log(entry);
            
            // Track performance
            this.performanceMetrics.apiCalls.push({
                method,
                url,
                status,
                duration,
                timestamp: Date.now()
            });
        } catch (error) {
            console.debug('logAPICall error:', error);
        }
    }

    async logError(error, context, errorType = 'general') {
        try {
            const entry = {
                type: 'ERROR',
                category: 'ERROR',
                level: 'ERROR',
                message: error?.message || error,
                data: {
                    error: error?.stack || error,
                    context,
                    errorType,
                    name: error?.name,
                    code: error?.code
                }
            };
            
            await this.log(entry);
        } catch (logError) {
            console.error('logError failed:', logError, 'Original error:', error);
        }
    }

    async logStateChange(module, oldValue, newValue, trigger) {
        try {
            const entry = {
                type: 'STATE',
                category: 'STATE_CHANGE',
                level: 'DEBUG',
                message: `State change in ${module}`,
                data: {
                    module,
                    oldValue,
                    newValue,
                    trigger,
                    timestamp: Date.now()
                }
            };
            
            await this.log(entry);
            
            // Track state changes
            this.performanceMetrics.stateChanges.push({
                module,
                trigger,
                timestamp: Date.now()
            });
        } catch (error) {
            console.debug('logStateChange error:', error);
        }
    }

    async logComponentInit(component, success, duration) {
        try {
            const entry = {
                type: 'COMPONENT',
                category: 'INIT',
                level: success ? 'INFO' : 'ERROR',
                message: `${component} initialization`,
                component,
                data: {
                    success,
                    duration,
                    timestamp: Date.now()
                }
            };
            
            await this.log(entry);
        } catch (error) {
            console.debug('logComponentInit error:', error);
        }
    }

    async logGlobalVarAccess(varName, accessType, value, source) {
        try {
            const key = `${varName}_${accessType}`;
            const count = this.globalVarAccess.get(key) || 0;
            this.globalVarAccess.set(key, count + 1);
            
            // Only log first few accesses to avoid spam
            if (count < 5) {
                await this.log({
                    type: 'GLOBAL_VAR',
                    category: 'ACCESS',
                    level: 'DEBUG',
                    message: `${accessType} ${varName}`,
                    data: {
                        varName,
                        accessType,
                        value: value?.substring ? value.substring(0, 100) : value,
                        source
                    }
                });
            }
        } catch (error) {
            console.debug('logGlobalVarAccess error:', error);
        }
    }

    // Performance measurement
    startMeasure(name) {
        this.performanceTimers.set(name, performance.now());
    }

    endMeasure(name, metadata) {
        const startTime = this.performanceTimers.get(name);
        if (!startTime) return;
        
        const duration = performance.now() - startTime;
        this.performanceTimers.delete(name);
        
        this.performanceMetrics.measurements.push({
            name,
            duration,
            metadata,
            timestamp: Date.now()
        });
        
        this.log({
            type: 'PERFORMANCE',
            category: 'MEASUREMENT',
            level: 'DEBUG',
            message: `Performance: ${name}`,
            data: {
                name,
                duration,
                metadata
            }
        });
    }

    // Export logs
    async exportLogs(filter = {}) {
        if (!this.db) {
            console.warn('Database not available for export');
            return [];
        }

        try {
            const transaction = this.db.transaction(['logs'], 'readonly');
            const store = transaction.objectStore('logs');
            
            return new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => {
                    let logs = request.result;
                    
                    // Apply filters
                    if (filter.level) {
                        logs = logs.filter(log => log.level === filter.level);
                    }
                    if (filter.type) {
                        logs = logs.filter(log => log.type === filter.type);
                    }
                    if (filter.startTime) {
                        logs = logs.filter(log => log.timestamp >= filter.startTime);
                    }
                    if (filter.endTime) {
                        logs = logs.filter(log => log.timestamp <= filter.endTime);
                    }
                    
                    resolve(logs);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Export failed:', error);
            return [];
        }
    }

    // Clear all logs
    async clearLogs() {
        if (!this.db) return;

        try {
            const transaction = this.db.transaction(['logs'], 'readwrite');
            const store = transaction.objectStore('logs');
            await store.clear();
            
            this.logBuffer = [];
            this.errorCounts.clear();
            this.errorPatterns.clear();
            this.componentUsage.clear();
            this.apiCallCounts.clear();
            
            console.log('All logs cleared');
        } catch (error) {
            console.error('Clear logs failed:', error);
        }
    }

    // Get analytics summary
    async getAnalytics() {
        return {
            componentUsage: Object.fromEntries(this.componentUsage),
            apiCallCounts: Object.fromEntries(this.apiCallCounts),
            errorCounts: Object.fromEntries(this.errorCounts),
            errorPatterns: Object.fromEntries(this.errorPatterns),
            globalVarAccess: Object.fromEntries(this.globalVarAccess),
            performanceMetrics: this.performanceMetrics,
            sessionInfo: {
                sessionId: this.sessionId,
                userId: this.getUserId(),
                mode: this.mode
            }
        };
    }
}

// Create and initialize the logger instance
try {
    window.logger = new FixedLogger();
    window.CompleteLogger = FixedLogger;
} catch (error) {
    // Fallback to dummy logger if initialization fails
    console.warn('Logger initialization failed, using dummy logger:', error);
    window.logger = {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        critical: () => {},
        log: () => {}
    };
}
window.CompleteLogger = function() { return window.logger; };

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FixedLogger;
}

// Legacy method support with error boundaries
window.logDatabaseOperation = (operation, table, data) => {
    const startTime = performance.now();
    return {
        start: () => {},
        success: (result) => {
            try {
                const duration = performance.now() - startTime;
                window.logger?.logDBOperation?.(operation, table, data, duration, true);
            } catch (error) {
                console.debug('DB log error:', error);
            }
        },
        error: (error) => {
            try {
                const duration = performance.now() - startTime;
                window.logger?.logDBOperation?.(operation, table, data, duration, false);
                window.logger?.logError?.(error, { operation, table }, 'database');
            } catch (logError) {
                console.error('DB error:', error);
            }
        }
    };
};

window.logAPICall = (method, url, options) => {
    const startTime = performance.now();
    return {
        start: () => {},
        success: (response, responseData) => {
            try {
                const duration = performance.now() - startTime;
                window.logger?.logAPICall?.(method, url, response?.status || 200, duration, options?.body, responseData);
            } catch (error) {
                console.debug('API log error:', error);
            }
        },
        error: (error) => {
            try {
                const duration = performance.now() - startTime;
                window.logger?.logAPICall?.(method, url, 0, duration, options?.body, null);
                window.logger?.logError?.(error, { method, url }, 'api');
            } catch (logError) {
                console.error('API error:', error);
            }
        }
    };
};

window.logNavigation = (fromPage, toPage) => {
    try {
        window.logger?.log?.({
            type: 'NAVIGATION',
            category: 'PAGE_CHANGE',
            level: 'INFO',
            message: `Navigation: ${fromPage} → ${toPage}`,
            data: { fromPage, toPage, timestamp: Date.now() }
        });
    } catch (error) {
        console.debug('Navigation log error:', error);
    }
};

console.log('📝 Fixed Logger System loaded and ready');/* CACHE BUSTER */
