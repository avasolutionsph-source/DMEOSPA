// Unified Configuration Service for Ava Solutions PWA
// Provides single API for all configuration management with backward compatibility

class ConfigurationService {
    constructor() {
        this.dbName = 'AvaConfigDB';
        this.version = 1;
        this.db = null;
        this.isInitialized = false;
        
        // Storage adapters for different sources
        this.adapters = {
            localStorage: new LocalStorageAdapter(),
            indexedDB: new IndexedDBAdapter(),
            sessionStorage: new SessionStorageAdapter(),
            hardcoded: new HardcodedAdapter(),
            memory: new MemoryAdapter()
        };
        
        // Configuration schema with defaults and migration paths
        this.schema = {
            // API Configuration
            apiUrl: {
                default: 'https://ava-pwa-backend.onrender.com',
                sources: ['indexedDB:settings:apiUrl:value', 'hardcoded', 'localStorage:API_URL'],
                type: 'string',
                category: 'api'
            },
            
            // Business Settings
            businessName: {
                default: 'Ava Solutions',
                sources: ['indexedDB:settings:businessName:value', 'localStorage:businessName', 'hardcoded'],
                type: 'string',
                category: 'business'
            },
            
            // Theme Configuration
            theme: {
                default: 'auto',
                sources: ['localStorage:theme', 'memory:theme', 'hardcoded'],
                type: 'string',
                enum: ['light', 'dark', 'auto'],
                category: 'ui'
            },
            
            // Performance Mode
            performanceMode: {
                default: 'auto',
                sources: ['localStorage:perfMode', 'memory:performanceMode', 'hardcoded'],
                type: 'string',
                enum: ['low', 'balanced', 'high', 'auto'],
                category: 'performance'
            },
            
            // User Authentication
            userToken: {
                default: null,
                sources: ['localStorage:userToken', 'localStorage:authToken', 'sessionStorage:userToken'],
                type: 'string',
                category: 'auth',
                sensitive: true
            },
            
            currentUser: {
                default: null,
                sources: ['localStorage:currentUser', 'localStorage:userData', 'sessionStorage:currentUser'],
                type: 'object',
                category: 'auth',
                sensitive: true
            },
            
            // App State
            isLoggedIn: {
                default: false,
                sources: ['localStorage:isLoggedIn', 'sessionStorage:isLoggedIn', 'computed'],
                type: 'boolean',
                category: 'auth'
            },
            
            subscriptionPlan: {
                default: 'unpaid',
                sources: ['localStorage:subscriptionPlan', 'currentUser:subscriptionPlan', 'hardcoded'],
                type: 'string',
                enum: ['unpaid', 'pro'],
                category: 'business'
            },
            
            // Sync Configuration
            lastSync: {
                default: null,
                sources: ['indexedDB:settings:lastSync:value', 'localStorage:lastSync'],
                type: 'number',
                category: 'sync'
            },
            
            // Feature Configuration
            businessConfig: {
                default: {
                    businessType: 'spa',
                    modules: {
                        dashboard: true,
                        pos: true,
                        services: true,
                        inventory: true,
                        employees: true,
                        chatbot: true,
                        settings: true
                    },
                    features: {
                        requireEmployeeForServices: true,
                        showInventoryInPOS: false,
                        enableCommissionTracking: true,
                        showServiceDuration: true
                    }
                },
                sources: ['indexedDB:settings:businessConfig:value', 'hardcoded'],
                type: 'object',
                category: 'business'
            },
            
            // Development & Debugging
            debugMode: {
                default: false,
                sources: ['localStorage:debugMode', 'sessionStorage:debugMode'],
                type: 'boolean',
                category: 'dev'
            },
            
            loggingEnabled: {
                default: true,
                sources: ['localStorage:ava_logging_enabled', 'hardcoded'],
                type: 'boolean',
                category: 'dev'
            },
            
            backupEnabled: {
                default: true,
                sources: ['localStorage:ava_backup_enabled', 'hardcoded'],
                type: 'boolean',
                category: 'backup'
            }
        };
        
        // Cache for computed values
        this.cache = new Map();
        this.listeners = new Map();
        
        this.init();
    }

    async init() {
        try {
            await this.initDB();
            await this.runMigrations();
            this.isInitialized = true;
            console.log('🔧 Configuration service initialized');
            
            // Log configuration service initialization
            if (window.logger) {
                window.logger.log({
                    type: 'CONFIG',
                    category: 'INIT',
                    level: 'INFO',
                    message: 'Configuration service initialized',
                    data: {
                        schemaKeys: Object.keys(this.schema),
                        adapters: Object.keys(this.adapters)
                    }
                });
            }
        } catch (error) {
            console.error('Failed to initialize configuration service:', error);
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

                // Unified config store
                if (!db.objectStoreNames.contains('config')) {
                    const configStore = db.createObjectStore('config', { keyPath: 'key' });
                    configStore.createIndex('category', 'category', { unique: false });
                    configStore.createIndex('source', 'source', { unique: false });
                    configStore.createIndex('lastModified', 'lastModified', { unique: false });
                }

                // Migration history store
                if (!db.objectStoreNames.contains('migrations')) {
                    const migrationStore = db.createObjectStore('migrations', { keyPath: 'id', autoIncrement: true });
                    migrationStore.createIndex('timestamp', 'timestamp', { unique: false });
                    migrationStore.createIndex('version', 'version', { unique: false });
                }
            };
        });
    }

    // Main API Methods

    /**
     * Get configuration value
     * @param {string} key - Configuration key
     * @param {any} defaultValue - Default value if not found
     * @returns {Promise<any>} Configuration value
     */
    async get(key, defaultValue = undefined) {
        if (!this.isInitialized) {
            await this.init();
        }

        const schema = this.schema[key];
        if (!schema) {
            console.warn(`Unknown config key: ${key}`);
            return defaultValue !== undefined ? defaultValue : null;
        }

        // Check cache first
        const cacheKey = `get:${key}`;
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < 30000) { // 30 second cache
                return cached.value;
            }
        }

        try {
            // Try each source in order
            for (const source of schema.sources) {
                const value = await this.getFromSource(source, key);
                if (value !== null && value !== undefined) {
                    // Validate value
                    const validatedValue = this.validateValue(key, value, schema);
                    if (validatedValue !== null) {
                        // Cache the result
                        this.cache.set(cacheKey, {
                            value: validatedValue,
                            timestamp: Date.now()
                        });
                        return validatedValue;
                    }
                }
            }

            // Fall back to default
            const defaultVal = defaultValue !== undefined ? defaultValue : schema.default;
            this.cache.set(cacheKey, {
                value: defaultVal,
                timestamp: Date.now()
            });
            return defaultVal;

        } catch (error) {
            console.error(`Failed to get config ${key}:`, error);
            return defaultValue !== undefined ? defaultValue : schema.default;
        }
    }

    /**
     * Set configuration value
     * @param {string} key - Configuration key
     * @param {any} value - Configuration value
     * @param {Object} options - Set options
     * @returns {Promise<boolean>} Success status
     */
    async set(key, value, options = {}) {
        if (!this.isInitialized) {
            await this.init();
        }

        const schema = this.schema[key];
        if (!schema) {
            console.warn(`Unknown config key: ${key}`);
            return false;
        }

        try {
            // Validate value
            const validatedValue = this.validateValue(key, value, schema);
            if (validatedValue === null) {
                console.error(`Invalid value for config ${key}:`, value);
                return false;
            }

            // Clear cache
            this.cache.delete(`get:${key}`);

            // Save to unified config store
            await this.saveToUnifiedStore(key, validatedValue, schema);

            // Save to original sources for backward compatibility
            if (!options.skipBackwardCompatibility) {
                await this.saveToBackwardCompatibleSources(key, validatedValue, schema);
            }

            // Notify listeners
            this.notifyListeners(key, validatedValue);

            // Log configuration change
            if (window.logger && !schema.sensitive) {
                window.logger.log({
                    type: 'CONFIG',
                    category: 'SET',
                    level: 'INFO',
                    message: `Configuration updated: ${key}`,
                    data: {
                        key,
                        category: schema.category,
                        valueType: typeof validatedValue
                    }
                });
            }

            return true;

        } catch (error) {
            console.error(`Failed to set config ${key}:`, error);
            return false;
        }
    }

    /**
     * Get multiple configuration values
     * @param {string[]} keys - Array of configuration keys
     * @returns {Promise<Object>} Object with key-value pairs
     */
    async getMultiple(keys) {
        const result = {};
        await Promise.all(keys.map(async (key) => {
            result[key] = await this.get(key);
        }));
        return result;
    }

    /**
     * Set multiple configuration values
     * @param {Object} configs - Object with key-value pairs
     * @param {Object} options - Set options
     * @returns {Promise<boolean>} Success status
     */
    async setMultiple(configs, options = {}) {
        const results = await Promise.all(
            Object.entries(configs).map(([key, value]) => this.set(key, value, options))
        );
        return results.every(result => result === true);
    }

    /**
     * Get all configurations by category
     * @param {string} category - Configuration category
     * @returns {Promise<Object>} Configurations in category
     */
    async getCategory(category) {
        const result = {};
        const categoryKeys = Object.keys(this.schema).filter(
            key => this.schema[key].category === category
        );

        for (const key of categoryKeys) {
            result[key] = await this.get(key);
        }

        return result;
    }

    /**
     * Listen for configuration changes
     * @param {string} key - Configuration key to listen for
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    listen(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        this.listeners.get(key).add(callback);

        // Return unsubscribe function
        return () => {
            const keyListeners = this.listeners.get(key);
            if (keyListeners) {
                keyListeners.delete(callback);
                if (keyListeners.size === 0) {
                    this.listeners.delete(key);
                }
            }
        };
    }

    /**
     * Clear configuration cache
     * @param {string} key - Specific key to clear, or null for all
     */
    clearCache(key = null) {
        if (key) {
            this.cache.delete(`get:${key}`);
        } else {
            this.cache.clear();
        }
    }

    /**
     * Export all configurations
     * @returns {Promise<Object>} All configurations
     */
    async exportConfig() {
        const result = {
            version: 1,
            timestamp: Date.now(),
            configurations: {}
        };

        for (const key of Object.keys(this.schema)) {
            if (!this.schema[key].sensitive) {
                result.configurations[key] = await this.get(key);
            }
        }

        return result;
    }

    /**
     * Import configurations
     * @param {Object} configData - Configuration data to import
     * @returns {Promise<boolean>} Success status
     */
    async importConfig(configData) {
        try {
            if (!configData.configurations) {
                throw new Error('Invalid configuration data format');
            }

            const results = [];
            for (const [key, value] of Object.entries(configData.configurations)) {
                if (this.schema[key] && !this.schema[key].sensitive) {
                    results.push(await this.set(key, value));
                }
            }

            return results.every(result => result === true);

        } catch (error) {
            console.error('Failed to import configuration:', error);
            return false;
        }
    }

    // Internal Helper Methods

    async getFromSource(source, key) {
        const [adapterName, ...path] = source.split(':');
        const adapter = this.adapters[adapterName];
        
        if (!adapter) {
            console.warn(`Unknown adapter: ${adapterName}`);
            return null;
        }

        return await adapter.get(path, key);
    }

    validateValue(key, value, schema) {
        if (value === null || value === undefined) {
            return value;
        }

        // Type validation
        if (schema.type === 'boolean') {
            if (typeof value === 'string') {
                return value === 'true';
            }
            return Boolean(value);
        }

        if (schema.type === 'number') {
            const num = Number(value);
            return isNaN(num) ? null : num;
        }

        if (schema.type === 'string') {
            const str = String(value);
            // Enum validation
            if (schema.enum && !schema.enum.includes(str)) {
                console.warn(`Invalid enum value for ${key}: ${str}`);
                return null;
            }
            return str;
        }

        if (schema.type === 'object') {
            if (typeof value === 'string') {
                try {
                    return JSON.parse(value);
                } catch (error) {
                    console.warn(`Invalid JSON for ${key}:`, value);
                    return null;
                }
            }
            return typeof value === 'object' ? value : null;
        }

        return value;
    }

    async saveToUnifiedStore(key, value, schema) {
        if (!this.db) return;

        const config = {
            key: key,
            value: value,
            category: schema.category,
            type: schema.type,
            source: 'unified',
            lastModified: Date.now(),
            version: 1
        };

        const transaction = this.db.transaction(['config'], 'readwrite');
        const store = transaction.objectStore('config');
        
        return new Promise((resolve, reject) => {
            const request = store.put(config);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async saveToBackwardCompatibleSources(key, value, schema) {
        // Save to original sources for backward compatibility
        for (const source of schema.sources) {
            if (source.includes('localStorage:') || source.includes('sessionStorage:')) {
                const [adapterName, storageKey] = source.split(':');
                const adapter = this.adapters[adapterName];
                if (adapter) {
                    await adapter.set([storageKey], value, key);
                }
            } else if (source.includes('indexedDB:')) {
                const [, storeName, recordKey, field] = source.split(':');
                if (storeName === 'settings' && window.database) {
                    try {
                        await window.database.update(storeName, {
                            key: recordKey,
                            value: value
                        });
                    } catch (error) {
                        console.warn(`Failed to save to IndexedDB ${storeName}:`, error);
                    }
                }
            }
        }
    }

    notifyListeners(key, value) {
        const keyListeners = this.listeners.get(key);
        if (keyListeners) {
            keyListeners.forEach(callback => {
                try {
                    callback(value, key);
                } catch (error) {
                    console.error('Config listener error:', error);
                }
            });
        }
    }

    async runMigrations() {
        try {
            // Migration 1: Move localStorage settings to unified store
            await this.migrateLocalStorageSettings();
            
            // Migration 2: Standardize theme values
            await this.migrateThemeSettings();
            
            // Migration 3: Migrate performance mode
            await this.migratePerformanceSettings();
            
        } catch (error) {
            console.error('Migration failed:', error);
        }
    }

    async migrateLocalStorageSettings() {
        const migrationId = 'localStorage_to_unified_v1';
        if (await this.isMigrationComplete(migrationId)) {
            return;
        }

        console.log('🔄 Migrating localStorage settings...');
        
        const migrations = [
            { from: 'perfMode', to: 'performanceMode' },
            { from: 'businessName', to: 'businessName' },
            { from: 'userToken', to: 'userToken' },
            { from: 'isLoggedIn', to: 'isLoggedIn' },
            { from: 'subscriptionPlan', to: 'subscriptionPlan' }
        ];

        for (const migration of migrations) {
            const value = localStorage.getItem(migration.from);
            if (value !== null) {
                await this.set(migration.to, value, { skipBackwardCompatibility: true });
            }
        }

        await this.markMigrationComplete(migrationId);
        console.log('✅ localStorage migration completed');
    }

    async migrateThemeSettings() {
        const migrationId = 'theme_settings_v1';
        if (await this.isMigrationComplete(migrationId)) {
            return;
        }

        // Detect theme from DOM classes or other indicators
        const theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        await this.set('theme', theme, { skipBackwardCompatibility: true });

        await this.markMigrationComplete(migrationId);
        console.log('✅ Theme migration completed');
    }

    async migratePerformanceSettings() {
        const migrationId = 'performance_settings_v1';
        if (await this.isMigrationComplete(migrationId)) {
            return;
        }

        const perfMode = localStorage.getItem('perfMode');
        if (perfMode) {
            await this.set('performanceMode', perfMode, { skipBackwardCompatibility: true });
        }

        await this.markMigrationComplete(migrationId);
        console.log('✅ Performance migration completed');
    }

    async isMigrationComplete(migrationId) {
        if (!this.db) return false;

        const transaction = this.db.transaction(['migrations'], 'readonly');
        const store = transaction.objectStore('migrations');
        
        return new Promise((resolve) => {
            const request = store.get(migrationId);
            request.onsuccess = () => resolve(!!request.result);
            request.onerror = () => resolve(false);
        });
    }

    async markMigrationComplete(migrationId) {
        if (!this.db) return;

        const migration = {
            id: migrationId,
            timestamp: Date.now(),
            version: 1
        };

        const transaction = this.db.transaction(['migrations'], 'readwrite');
        const store = transaction.objectStore('migrations');
        
        return new Promise((resolve, reject) => {
            const request = store.put(migration);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}

// Storage Adapters

class LocalStorageAdapter {
    async get(path, key) {
        try {
            const storageKey = path[0] || key;
            const value = localStorage.getItem(storageKey);
            
            if (value === null) return null;
            
            // Try to parse JSON
            try {
                return JSON.parse(value);
            } catch {
                return value;
            }
        } catch (error) {
            console.warn(`localStorage get error for ${key}:`, error);
            return null;
        }
    }

    async set(path, value, key) {
        try {
            const storageKey = path[0] || key;
            const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
            localStorage.setItem(storageKey, stringValue);
            return true;
        } catch (error) {
            console.warn(`localStorage set error for ${key}:`, error);
            return false;
        }
    }
}

class SessionStorageAdapter {
    async get(path, key) {
        try {
            const storageKey = path[0] || key;
            const value = sessionStorage.getItem(storageKey);
            
            if (value === null) return null;
            
            try {
                return JSON.parse(value);
            } catch {
                return value;
            }
        } catch (error) {
            console.warn(`sessionStorage get error for ${key}:`, error);
            return null;
        }
    }

    async set(path, value, key) {
        try {
            const storageKey = path[0] || key;
            const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
            sessionStorage.setItem(storageKey, stringValue);
            return true;
        } catch (error) {
            console.warn(`sessionStorage set error for ${key}:`, error);
            return false;
        }
    }
}

class IndexedDBAdapter {
    async get(path, key) {
        try {
            if (!window.database) return null;
            
            const [storeName, recordKey, field] = path;
            const record = await window.database.get(storeName, recordKey);
            
            if (!record) return null;
            
            return field ? record[field] : record;
        } catch (error) {
            console.warn(`IndexedDB get error for ${key}:`, error);
            return null;
        }
    }

    async set(path, value, key) {
        try {
            if (!window.database) return false;
            
            const [storeName, recordKey, field] = path;
            
            if (field) {
                await window.database.update(storeName, {
                    key: recordKey,
                    [field]: value
                });
            } else {
                await window.database.update(storeName, {
                    key: recordKey,
                    value: value
                });
            }
            
            return true;
        } catch (error) {
            console.warn(`IndexedDB set error for ${key}:`, error);
            return false;
        }
    }
}

class HardcodedAdapter {
    constructor() {
        this.hardcodedValues = {
            apiUrl: 'https://ava-pwa-backend.onrender.com',
            businessName: 'Ava Solutions',
            theme: 'auto',
            performanceMode: 'auto',
            subscriptionPlan: 'unpaid',
            loggingEnabled: true,
            backupEnabled: true,
            debugMode: false
        };
    }

    async get(path, key) {
        return this.hardcodedValues[key] || null;
    }

    async set(path, value, key) {
        // Hardcoded values are read-only
        return false;
    }
}

class MemoryAdapter {
    constructor() {
        this.memoryStore = new Map();
    }

    async get(path, key) {
        const memoryKey = path[0] || key;
        return this.memoryStore.get(memoryKey) || null;
    }

    async set(path, value, key) {
        const memoryKey = path[0] || key;
        this.memoryStore.set(memoryKey, value);
        return true;
    }
}

// Initialize and expose global config service
window.config = new ConfigurationService();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConfigurationService;
}