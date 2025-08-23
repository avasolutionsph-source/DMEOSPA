// Unified State Management System for Ava Solutions PWA
// Centralizes all application state with observable pattern and backward compatibility

class StateManager {
    constructor() {
        this.state = {};
        this.subscribers = new Map();
        this.history = [];
        this.maxHistorySize = 100;
        this.batchTimeout = null;
        this.pendingUpdates = [];
        this.initialized = false;
        this.persistenceEnabled = true;
        this.db = null;
        
        // State modules structure
        this.modules = {
            auth: {
                currentUser: null,
                authToken: null,
                isLoggedIn: false,
                subscriptionPlan: null,
                lastLogin: null,
                permissions: []
            },
            pos: {
                cart: [],
                selectedEmployee: null,
                currentTransaction: null,
                discounts: [],
                paymentMethod: null,
                currentCategory: 'all',
                taxRate: 0
            },
            business: {
                name: null,
                type: null,
                config: {},
                settings: {},
                features: [],
                license: null,
                branches: []
            },
            data: {
                products: [],
                inventory: [],
                employees: [],
                giftCertificates: [],
                customers: [],
                suppliers: [],
                categories: []
            },
            ui: {
                currentPage: 'dashboard',
                modals: {},
                notifications: [],
                loading: {},
                sidebar: { collapsed: false },
                theme: 'light',
                language: 'en'
            },
            sync: {
                lastSync: null,
                isSyncing: false,
                pendingChanges: 0,
                syncStatus: 'idle',
                conflicts: []
            },
            performance: {
                mode: 'balanced',
                metrics: {},
                cache: {},
                lastOptimization: null
            }
        };
        
        // Component to module mapping for backward compatibility
        this.legacyMappings = {
            'window.currentUser': 'auth.currentUser',
            'window.app.cart': 'pos.cart',
            'window.posSystem.selectedEmployee': 'pos.selectedEmployee',
            'window.posSystem.cart': 'pos.cart',
            'window.businessName': 'business.name',
            'window.businessType': 'business.type',
            'window.app.currentPage': 'ui.currentPage'
        };
    }
    
    async init() {
        try {
            // Initialize state structure
            this.initializeState();
            
            // Wait for dependencies
            await this.waitForDependencies();
            
            // Load persisted state
            await this.loadPersistedState();
            
            // Setup backward compatibility
            this.setupBackwardCompatibility();
            
            // Setup auto-save
            this.setupAutoSave();
            
            // Mark as initialized
            this.initialized = true;
            
            // Log initialization
            if (window.logger) {
                window.logger.info('State Manager initialized', {
                    category: 'STATE',
                    operation: 'init',
                    modules: Object.keys(this.modules)
                });
            } else {
                console.log('State Manager initialized');
            }
            
            // Notify subscribers
            this.notifyGlobalChange('system', 'initialized');
            
        } catch (error) {
            this.handleError('Initialization failed', error);
        }
    }
    
    initializeState() {
        // Deep clone modules to state
        this.state = JSON.parse(JSON.stringify(this.modules));
        
        // Create observable proxies for each module
        Object.keys(this.state).forEach(module => {
            this.state[module] = this.createObservableProxy(this.state[module], module);
        });
    }
    
    createObservableProxy(obj, path) {
        const self = this;
        
        return new Proxy(obj, {
            get(target, property) {
                if (typeof target[property] === 'object' && target[property] !== null) {
                    return self.createObservableProxy(target[property], `${path}.${property}`);
                }
                return target[property];
            },
            
            set(target, property, value) {
                const oldValue = target[property];
                
                // Skip if value hasn't changed
                if (oldValue === value) return true;
                
                // Validate state change
                if (!self.validateStateChange(path, property, value, oldValue)) {
                    return false;
                }
                
                // Apply the change
                target[property] = value;
                
                // Log state change
                self.logStateChange(path, property, value, oldValue);
                
                // Add to history
                self.addToHistory(path, property, value, oldValue);
                
                // Schedule batch update
                self.scheduleUpdate(path, property, value, oldValue);
                
                return true;
            },
            
            deleteProperty(target, property) {
                const oldValue = target[property];
                delete target[property];
                
                self.logStateChange(path, property, undefined, oldValue);
                self.scheduleUpdate(path, property, undefined, oldValue);
                
                return true;
            }
        });
    }
    
    validateStateChange(path, property, value, oldValue) {
        // Add validation rules here
        const validators = {
            'auth.currentUser': (val) => val === null || typeof val === 'object',
            'pos.cart': (val) => Array.isArray(val),
            'pos.selectedEmployee': (val) => val === null || typeof val === 'string',
            'business.name': (val) => val === null || typeof val === 'string',
            'ui.currentPage': (val) => typeof val === 'string',
            'pos.taxRate': (val) => typeof val === 'number' && val >= 0 && val <= 1
        };
        
        const fullPath = `${path}.${property}`;
        if (validators[fullPath]) {
            const isValid = validators[fullPath](value);
            if (!isValid) {
                if (window.logger) {
                    window.logger.error('Invalid state change', {
                        category: 'STATE',
                        path: fullPath,
                        value,
                        oldValue
                    });
                }
                return false;
            }
        }
        
        return true;
    }
    
    logStateChange(path, property, value, oldValue) {
        if (!window.logger) return;
        
        const changeData = {
            category: 'STATE',
            operation: 'change',
            path: `${path}.${property}`,
            oldValue: this.sanitizeLogValue(oldValue),
            newValue: this.sanitizeLogValue(value),
            timestamp: Date.now()
        };
        
        // Use appropriate log level based on the change
        if (path.includes('auth') || path.includes('business')) {
            window.logger.info('State changed', changeData);
        } else {
            window.logger.debug('State changed', changeData);
        }
    }
    
    sanitizeLogValue(value) {
        // Don't log sensitive data
        if (value && typeof value === 'object') {
            const sanitized = { ...value };
            if (sanitized.password) sanitized.password = '[REDACTED]';
            if (sanitized.token) sanitized.token = '[REDACTED]';
            if (sanitized.creditCard) sanitized.creditCard = '[REDACTED]';
            return sanitized;
        }
        return value;
    }
    
    addToHistory(path, property, value, oldValue) {
        const historyEntry = {
            timestamp: Date.now(),
            path: `${path}.${property}`,
            oldValue: JSON.parse(JSON.stringify(oldValue)),
            newValue: JSON.parse(JSON.stringify(value)),
            user: this.state.auth.currentUser?.username || 'system'
        };
        
        this.history.push(historyEntry);
        
        // Trim history if it exceeds max size
        if (this.history.length > this.maxHistorySize) {
            this.history = this.history.slice(-this.maxHistorySize);
        }
    }
    
    scheduleUpdate(path, property, value, oldValue) {
        // Add to pending updates
        this.pendingUpdates.push({
            path: `${path}.${property}`,
            value,
            oldValue,
            timestamp: Date.now()
        });
        
        // Clear existing timeout
        if (this.batchTimeout) {
            clearTimeout(this.batchTimeout);
        }
        
        // Schedule batch update
        this.batchTimeout = setTimeout(() => {
            this.processBatchUpdates();
        }, 10); // 10ms debounce
    }
    
    processBatchUpdates() {
        if (this.pendingUpdates.length === 0) return;
        
        const updates = [...this.pendingUpdates];
        this.pendingUpdates = [];
        
        // Group updates by module
        const moduleUpdates = {};
        updates.forEach(update => {
            const module = update.path.split('.')[0];
            if (!moduleUpdates[module]) {
                moduleUpdates[module] = [];
            }
            moduleUpdates[module].push(update);
        });
        
        // Notify subscribers
        Object.keys(moduleUpdates).forEach(module => {
            this.notifySubscribers(module, moduleUpdates[module]);
        });
        
        // Persist state if enabled
        if (this.persistenceEnabled) {
            this.persistState();
        }
    }
    
    // Subscribe to state changes
    subscribe(path, callback, componentId = null) {
        if (!this.subscribers.has(path)) {
            this.subscribers.set(path, new Set());
        }
        
        const subscription = {
            callback,
            componentId,
            id: Math.random().toString(36).substr(2, 9)
        };
        
        this.subscribers.get(path).add(subscription);
        
        // Return unsubscribe function
        return () => {
            const subs = this.subscribers.get(path);
            if (subs) {
                subs.delete(subscription);
            }
        };
    }
    
    notifySubscribers(path, updates) {
        // Notify exact path subscribers
        if (this.subscribers.has(path)) {
            this.subscribers.get(path).forEach(sub => {
                try {
                    sub.callback(updates, this.getState(path));
                } catch (error) {
                    this.handleError(`Subscriber error for ${path}`, error);
                }
            });
        }
        
        // Notify wildcard subscribers
        this.subscribers.forEach((subs, subscriberPath) => {
            if (subscriberPath.includes('*')) {
                const pattern = subscriberPath.replace('*', '.*');
                const regex = new RegExp(`^${pattern}$`);
                if (regex.test(path)) {
                    subs.forEach(sub => {
                        try {
                            sub.callback(updates, this.getState(path));
                        } catch (error) {
                            this.handleError(`Wildcard subscriber error for ${subscriberPath}`, error);
                        }
                    });
                }
            }
        });
        
        // Notify global subscribers
        this.notifyGlobalChange(path, updates);
    }
    
    notifyGlobalChange(path, updates) {
        if (this.subscribers.has('*')) {
            this.subscribers.get('*').forEach(sub => {
                try {
                    sub.callback({ path, updates }, this.state);
                } catch (error) {
                    this.handleError('Global subscriber error', error);
                }
            });
        }
    }
    
    // Get state value
    getState(path) {
        if (!path) return this.state;
        
        const parts = path.split('.');
        let current = this.state;
        
        for (const part of parts) {
            if (current[part] === undefined) {
                return undefined;
            }
            current = current[part];
        }
        
        return current;
    }
    
    // Set state value
    setState(path, value) {
        const parts = path.split('.');
        const property = parts.pop();
        const parentPath = parts.join('.');
        
        const parent = this.getState(parentPath);
        if (parent && typeof parent === 'object') {
            parent[property] = value;
            return true;
        }
        
        return false;
    }
    
    // Batch state updates
    batchUpdate(updates) {
        const results = [];
        
        Object.keys(updates).forEach(path => {
            const result = this.setState(path, updates[path]);
            results.push({ path, success: result });
        });
        
        return results;
    }
    
    // Get state history
    getHistory(filter = {}) {
        let filtered = [...this.history];
        
        if (filter.path) {
            filtered = filtered.filter(h => h.path.includes(filter.path));
        }
        
        if (filter.startTime) {
            filtered = filtered.filter(h => h.timestamp >= filter.startTime);
        }
        
        if (filter.endTime) {
            filtered = filtered.filter(h => h.timestamp <= filter.endTime);
        }
        
        if (filter.user) {
            filtered = filtered.filter(h => h.user === filter.user);
        }
        
        return filtered;
    }
    
    // Rollback state to specific point
    async rollback(historyId) {
        const entry = this.history.find(h => h.timestamp === historyId);
        if (!entry) {
            throw new Error('History entry not found');
        }
        
        // Apply rollback
        const success = this.setState(entry.path, entry.oldValue);
        
        if (success) {
            if (window.logger) {
                window.logger.info('State rolled back', {
                    category: 'STATE',
                    operation: 'rollback',
                    path: entry.path,
                    toValue: entry.oldValue
                });
            }
            
            return true;
        }
        
        return false;
    }
    
    // Wait for dependencies
    async waitForDependencies() {
        const maxAttempts = 50; // Increased back to 50 (5 seconds)
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            const dbReady = window.db && window.db.isOpen;
            const configReady = window.config && window.config.isInitialized;
            const loggerReady = window.logger && window.logger.isEnabled !== undefined;
            
            // At minimum, we need the database to be ready
            if (dbReady || attempts > 30) { // Allow fallback after 3 seconds
                this.db = window.db;
                if (window.logger) {
                    window.logger.debug('StateManager: Dependencies ready', {
                        category: 'STATE',
                        dbReady,
                        configReady,
                        loggerReady
                    });
                } else {
                    console.log('StateManager: Dependencies ready', {dbReady, configReady, loggerReady});
                }
                return;
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        console.warn('StateManager: Some dependencies not ready, continuing with limited functionality');
    }
    
    // Persist state to database
    async persistState() {
        if (!this.db || !this.persistenceEnabled) return;
        
        try {
            const stateSnapshot = {
                timestamp: Date.now(),
                state: JSON.parse(JSON.stringify(this.state)),
                version: '1.0.0'
            };
            
            // Store in IndexedDB using Database class method
            const stateData = {
                key: 'current',
                ...stateSnapshot
            };
            await this.db.put('state', stateData);
            
            // Also backup to localStorage for redundancy
            try {
                localStorage.setItem('ava_state_backup', JSON.stringify(stateSnapshot));
            } catch (e) {
                // Ignore localStorage errors
            }
            
        } catch (error) {
            this.handleError('Failed to persist state', error);
        }
    }
    
    // Load persisted state
    async loadPersistedState() {
        if (!this.db) return;
        
        try {
            // Try to load from IndexedDB first
            const savedState = await this.db.get('state', 'current');
            
            if (savedState && savedState.state) {
                this.mergePersistedState(savedState.state);
                
                if (window.logger) {
                    window.logger.info('State loaded from database', {
                        category: 'STATE',
                        timestamp: savedState.timestamp
                    });
                }
                return;
            }
            
            // Fallback to localStorage
            const backupState = localStorage.getItem('ava_state_backup');
            if (backupState) {
                const parsed = JSON.parse(backupState);
                this.mergePersistedState(parsed.state);
                
                if (window.logger) {
                    window.logger.info('State loaded from backup', {
                        category: 'STATE'
                    });
                }
            }
            
        } catch (error) {
            this.handleError('Failed to load persisted state', error);
        }
        
        // Load legacy data if no persisted state found
        await this.loadLegacyData();
    }
    
    mergePersistedState(savedState) {
        // Merge saved state with defaults, preserving structure
        Object.keys(this.modules).forEach(module => {
            if (savedState[module]) {
                Object.keys(savedState[module]).forEach(key => {
                    if (savedState[module][key] !== undefined) {
                        this.state[module][key] = savedState[module][key];
                    }
                });
            }
        });
    }
    
    // Load legacy data from localStorage and window objects
    async loadLegacyData() {
        // Load auth data
        const userToken = localStorage.getItem('userToken') || localStorage.getItem('authToken');
        if (userToken) {
            this.state.auth.authToken = userToken;
            this.state.auth.isLoggedIn = true;
        }
        
        const userData = localStorage.getItem('userData') || localStorage.getItem('currentUser');
        if (userData) {
            try {
                this.state.auth.currentUser = JSON.parse(userData);
            } catch (e) {
                // Ignore parse errors
            }
        }
        
        // Load business data
        const businessName = localStorage.getItem('businessName');
        if (businessName) {
            this.state.business.name = businessName;
        }
        
        const businessType = localStorage.getItem('businessType');
        if (businessType) {
            this.state.business.type = businessType;
        }
        
        // Load UI preferences
        const currentPage = sessionStorage.getItem('currentPage');
        if (currentPage) {
            this.state.ui.currentPage = currentPage;
        }
        
        // Load from window objects if they exist
        if (window.app) {
            if (window.app.cart) this.state.pos.cart = window.app.cart;
            if (window.app.currentPage) this.state.ui.currentPage = window.app.currentPage;
        }
        
        if (window.posSystem) {
            if (window.posSystem.cart) this.state.pos.cart = window.posSystem.cart;
            if (window.posSystem.selectedEmployee) {
                this.state.pos.selectedEmployee = window.posSystem.selectedEmployee;
            }
        }
        
        if (window.logger) {
            window.logger.info('Legacy data loaded', {
                category: 'STATE',
                hasAuth: !!this.state.auth.currentUser,
                hasBusiness: !!this.state.business.name
            });
        }
    }
    
    // Setup backward compatibility
    setupBackwardCompatibility() {
        // Create proxies for legacy window properties
        
        // window.currentUser
        Object.defineProperty(window, 'currentUser', {
            get: () => this.state.auth.currentUser,
            set: (value) => {
                this.state.auth.currentUser = value;
                return true;
            },
            configurable: true
        });
        
        // Ensure window.app exists
        if (!window.app) {
            window.app = {};
        }
        
        // window.app.cart
        Object.defineProperty(window.app, 'cart', {
            get: () => this.state.pos.cart,
            set: (value) => {
                this.state.pos.cart = value;
                return true;
            },
            configurable: true
        });
        
        // window.app.currentPage
        Object.defineProperty(window.app, 'currentPage', {
            get: () => this.state.ui.currentPage,
            set: (value) => {
                this.state.ui.currentPage = value;
                return true;
            },
            configurable: true
        });
        
        // Ensure window.posSystem exists
        if (!window.posSystem) {
            window.posSystem = {};
        }
        
        // window.posSystem.selectedEmployee
        Object.defineProperty(window.posSystem, 'selectedEmployee', {
            get: () => this.state.pos.selectedEmployee,
            set: (value) => {
                this.state.pos.selectedEmployee = value;
                return true;
            },
            configurable: true
        });
        
        // window.posSystem.cart
        Object.defineProperty(window.posSystem, 'cart', {
            get: () => this.state.pos.cart,
            set: (value) => {
                this.state.pos.cart = value;
                return true;
            },
            configurable: true
        });
        
        // window.businessName
        Object.defineProperty(window, 'businessName', {
            get: () => this.state.business.name,
            set: (value) => {
                this.state.business.name = value;
                return true;
            },
            configurable: true
        });
        
        // window.businessType
        Object.defineProperty(window, 'businessType', {
            get: () => this.state.business.type,
            set: (value) => {
                this.state.business.type = value;
                return true;
            },
            configurable: true
        });
        
        if (window.logger) {
            window.logger.debug('Backward compatibility layer established', {
                category: 'STATE',
                mappings: Object.keys(this.legacyMappings)
            });
        }
    }
    
    // Setup auto-save
    setupAutoSave() {
        // Save state every 30 seconds if there were changes
        setInterval(() => {
            if (this.pendingUpdates.length > 0 || this.history.length > 0) {
                this.persistState();
            }
        }, 30000);
        
        // Save on page unload
        window.addEventListener('beforeunload', () => {
            this.persistState();
        });
    }
    
    // Error handling
    handleError(message, error) {
        if (window.logger && window.logger.error) {
            window.logger.error(message, {
                category: 'STATE',
                error: error.message,
                stack: error.stack
            });
        } else {
            console.error(`StateManager: ${message}`, error);
        }
        
        // Attempt recovery
        if (window.errorRecovery && window.errorRecovery.handleError) {
            window.errorRecovery.handleError(error, 'StateManager');
        }
    }
    
    // Get state snapshot for debugging
    getSnapshot() {
        return {
            state: JSON.parse(JSON.stringify(this.state)),
            subscribers: Array.from(this.subscribers.keys()),
            historySize: this.history.length,
            pendingUpdates: this.pendingUpdates.length,
            initialized: this.initialized
        };
    }
    
    // Clear all state (use with caution)
    async clearState() {
        if (!confirm('This will clear all application state. Are you sure?')) {
            return false;
        }
        
        // Reset to defaults
        this.state = JSON.parse(JSON.stringify(this.modules));
        this.history = [];
        this.pendingUpdates = [];
        
        // Clear persistence
        if (this.db) {
            await this.db.delete('state', 'current');
        }
        localStorage.removeItem('ava_state_backup');
        
        // Notify all subscribers
        this.notifyGlobalChange('system', 'reset');
        
        if (window.logger) {
            window.logger.warn('State cleared', {
                category: 'STATE',
                operation: 'clear'
            });
        }
        
        return true;
    }
    
    // Export state for debugging
    exportState() {
        const exportData = {
            timestamp: Date.now(),
            version: '1.0.0',
            state: this.getSnapshot(),
            history: this.history.slice(-50), // Last 50 history entries
            metadata: {
                user: this.state.auth.currentUser?.username || 'unknown',
                businessName: this.state.business.name,
                environment: window.location.hostname
            }
        };
        
        return exportData;
    }
    
    // Import state (for testing/migration)
    async importState(exportData) {
        if (!exportData || !exportData.state) {
            throw new Error('Invalid import data');
        }
        
        // Validate version compatibility
        if (exportData.version !== '1.0.0') {
            throw new Error('Incompatible state version');
        }
        
        // Apply imported state
        this.mergePersistedState(exportData.state.state);
        
        // Restore history if available
        if (exportData.history) {
            this.history = exportData.history;
        }
        
        // Persist
        await this.persistState();
        
        // Notify subscribers
        this.notifyGlobalChange('system', 'imported');
        
        if (window.logger) {
            window.logger.info('State imported', {
                category: 'STATE',
                timestamp: exportData.timestamp
            });
        }
        
        return true;
    }
}

// Create and export singleton instance
window.StateManager = new StateManager();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.StateManager.init();
    });
} else {
    // DOM already loaded
    window.StateManager.init();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StateManager;
}