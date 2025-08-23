/**
 * Unified Logger System for Ava Solutions PWA
 * Works in both browser and Node.js environments
 * Replaces the duplicate frontend/backend logger systems
 */

// Environment detection
const isBrowser = typeof window !== 'undefined';
const isNode = typeof process !== 'undefined' && process.env;

class UnifiedLogger {
    constructor(name = 'APP') {
        this.name = name;
        this.isEnabled = true;
        this.sessionId = this.generateSessionId();
        
        // Log levels with priorities
        this.levels = {
            DEBUG: { priority: 0, color: '#64748b' },
            INFO: { priority: 1, color: '#3b82f6' },
            WARN: { priority: 2, color: '#f59e0b' },
            ERROR: { priority: 3, color: '#ef4444' }
        };
        
        // Browser-specific initialization
        if (isBrowser) {
            this.initBrowser();
        }
        
        // Node.js-specific initialization
        if (isNode) {
            this.initNode();
        }
    }
    
    generateSessionId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    initBrowser() {
        // Browser-specific setup
        this.mode = this.detectMode();
        this.minLogLevel = this.mode === 'production' ? 'INFO' : 'DEBUG';
        
        // Try to initialize IndexedDB for persistent logging (optional)
        this.initBrowserStorage().catch(err => {
            console.warn('[Logger] IndexedDB not available, using memory only:', err.message);
        });
    }
    
    initNode() {
        // Node.js-specific setup
        this.mode = process.env.NODE_ENV || 'development';
        this.minLogLevel = this.mode === 'production' ? 'INFO' : 'DEBUG';
    }
    
    detectMode() {
        if (isBrowser) {
            return window.location.hostname === 'localhost' || 
                   window.location.hostname.includes('netlify') ? 'development' : 'production';
        }
        return 'development';
    }
    
    async initBrowserStorage() {
        // Only try IndexedDB in browser and if available
        if (!isBrowser || !window.indexedDB) return;
        
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('AvaLogsDB', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('logs')) {
                    const store = db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('timestamp', 'timestamp');
                    store.createIndex('level', 'level');
                    store.createIndex('category', 'category');
                }
            };
        });
    }
    
    formatMessage(level, message, data = {}) {
        const timestamp = new Date().toISOString();
        const category = data.category || 'GENERAL';
        const operation = data.operation || '';
        const sessionInfo = `[${this.sessionId.slice(-6)}]`;
        
        // Base message format
        let formattedMessage = `[${timestamp}] [${level}] [${this.name}] ${sessionInfo}`;
        
        if (category) {
            formattedMessage += ` [${category}]`;
        }
        
        if (operation) {
            formattedMessage += ` [${operation}]`;
        }
        
        formattedMessage += ` ${message}`;
        
        return formattedMessage;
    }
    
    shouldLog(level) {
        const levelPriority = this.levels[level]?.priority ?? 1;
        const minPriority = this.levels[this.minLogLevel]?.priority ?? 1;
        return this.isEnabled && levelPriority >= minPriority;
    }
    
    async log(level, message, data = {}) {
        if (!this.shouldLog(level)) return;
        
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            category: data.category || 'GENERAL',
            operation: data.operation || '',
            sessionId: this.sessionId,
            name: this.name,
            data: data.data || null,
            error: data.error ? this.serializeError(data.error) : null
        };
        
        // Console output with proper styling
        this.outputToConsole(level, this.formatMessage(level, message, data), logEntry);
        
        // Store in browser if available
        if (isBrowser && this.db) {
            try {
                await this.storeLogEntry(logEntry);
            } catch (err) {
                // Fallback to console if storage fails
                console.warn('[Logger] Failed to store log entry:', err);
            }
        }
        
        return logEntry;
    }
    
    outputToConsole(level, formattedMessage, logEntry) {
        const levelConfig = this.levels[level];
        
        if (isBrowser) {
            // Browser console with colors
            const style = `color: ${levelConfig.color}; font-weight: bold`;
            switch (level) {
                case 'ERROR':
                    console.error(`%c${formattedMessage}`, style, logEntry.error || '');
                    break;
                case 'WARN':
                    console.warn(`%c${formattedMessage}`, style);
                    break;
                case 'DEBUG':
                    console.debug(`%c${formattedMessage}`, style);
                    break;
                default:
                    console.log(`%c${formattedMessage}`, style);
            }
        } else {
            // Node.js console
            switch (level) {
                case 'ERROR':
                    console.error(formattedMessage, logEntry.error || '');
                    break;
                case 'WARN':
                    console.warn(formattedMessage);
                    break;
                case 'DEBUG':
                    if (this.mode !== 'production') {
                        console.log(formattedMessage);
                    }
                    break;
                default:
                    console.log(formattedMessage);
            }
        }
    }
    
    async storeLogEntry(logEntry) {
        if (!this.db) return;
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['logs'], 'readwrite');
            const store = transaction.objectStore('logs');
            const request = store.add(logEntry);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    serializeError(error) {
        if (!error) return null;
        
        return {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: error.code,
            fileName: error.fileName,
            lineNumber: error.lineNumber
        };
    }
    
    // Public API methods
    debug(message, data = {}) {
        return this.log('DEBUG', message, data);
    }
    
    info(message, data = {}) {
        return this.log('INFO', message, data);
    }
    
    warn(message, data = {}) {
        return this.log('WARN', message, data);
    }
    
    error(message, data = {}) {
        return this.log('ERROR', message, data);
    }
    
    // Performance tracking
    startTimer(label) {
        this.performanceTimers = this.performanceTimers || new Map();
        this.performanceTimers.set(label, performance.now ? performance.now() : Date.now());
        return label;
    }
    
    endTimer(label, message = `Timer ${label} completed`) {
        this.performanceTimers = this.performanceTimers || new Map();
        const startTime = this.performanceTimers.get(label);
        if (!startTime) return;
        
        const duration = (performance.now ? performance.now() : Date.now()) - startTime;
        this.performanceTimers.delete(label);
        
        this.info(message, {
            category: 'PERFORMANCE',
            operation: 'timer',
            data: { label, duration: `${duration.toFixed(2)}ms` }
        });
        
        return duration;
    }
    
    // Utility methods
    setEnabled(enabled) {
        this.isEnabled = enabled;
    }
    
    setLogLevel(level) {
        if (this.levels[level]) {
            this.minLogLevel = level;
        }
    }
    
    createChild(childName) {
        return new UnifiedLogger(`${this.name}:${childName}`);
    }
}

// Create default logger instance
const defaultLogger = new UnifiedLogger();

// Helper function for easy migration from old logger patterns
function safeLog(level, message, data = {}) {
    if (typeof level === 'string' && defaultLogger[level.toLowerCase()]) {
        return defaultLogger[level.toLowerCase()](message, data);
    } else {
        return defaultLogger.info(message, data);
    }
}

// Export both class and default instance
export { UnifiedLogger, safeLog };
export default defaultLogger;

// Global assignment for backward compatibility
if (isBrowser) {
    window.unifiedLogger = defaultLogger;
    window.safeLog = safeLog;
}