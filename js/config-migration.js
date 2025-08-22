// Configuration Migration and Validation System
// Handles migration from old storage systems to unified config service

class ConfigMigration {
    constructor() {
        this.migrationVersion = '1.0.0';
        this.migrations = {};
        this.validationRules = {};
        this.setupMigrations();
        this.setupValidation();
    }

    setupMigrations() {
        // Migration 1: Basic localStorage to config service
        this.migrations['localStorage-basic-v1'] = {
            description: 'Migrate basic localStorage settings to config service',
            version: '1.0.0',
            priority: 1,
            run: async () => {
                const migrations = [
                    { from: 'perfMode', to: 'performanceMode', transform: (val) => val || 'auto' },
                    { from: 'businessName', to: 'businessName', transform: (val) => val || 'Ava Solutions' },
                    { from: 'theme', to: 'theme', transform: (val) => val || 'auto' },
                    { from: 'ava_logging_enabled', to: 'loggingEnabled', transform: (val) => val === 'true' },
                    { from: 'debugMode', to: 'debugMode', transform: (val) => val === 'true' }
                ];

                let migrated = 0;
                for (const migration of migrations) {
                    try {
                        const oldValue = localStorage.getItem(migration.from);
                        if (oldValue !== null) {
                            const newValue = migration.transform(oldValue);
                            await window.config.set(migration.to, newValue, { skipBackwardCompatibility: true });
                            migrated++;
                            console.log(`✅ Migrated ${migration.from} -> ${migration.to}: ${JSON.stringify(newValue)}`);
                        }
                    } catch (error) {
                        console.error(`❌ Failed to migrate ${migration.from}:`, error);
                    }
                }

                return { migrated, total: migrations.length };
            }
        };

        // Migration 2: IndexedDB settings to config service
        this.migrations['indexeddb-settings-v1'] = {
            description: 'Migrate IndexedDB settings to config service',
            version: '1.0.0',
            priority: 2,
            run: async () => {
                if (!window.database) {
                    return { migrated: 0, total: 0, skipped: 'Database not available' };
                }

                const migrations = [
                    { key: 'businessName', configKey: 'businessName' },
                    { key: 'apiUrl', configKey: 'apiUrl' },
                    { key: 'lastSync', configKey: 'lastSync' },
                    { key: 'businessConfig', configKey: 'businessConfig' }
                ];

                let migrated = 0;
                for (const migration of migrations) {
                    try {
                        const record = await window.database.get('settings', migration.key);
                        if (record && record.value !== null && record.value !== undefined) {
                            await window.config.set(migration.configKey, record.value, { skipBackwardCompatibility: true });
                            migrated++;
                            console.log(`✅ Migrated DB ${migration.key} -> ${migration.configKey}`);
                        }
                    } catch (error) {
                        console.error(`❌ Failed to migrate DB ${migration.key}:`, error);
                    }
                }

                return { migrated, total: migrations.length };
            }
        };

        // Migration 3: Auth system to config service
        this.migrations['auth-system-v1'] = {
            description: 'Migrate auth system to config service',
            version: '1.0.0',
            priority: 3,
            run: async () => {
                const migrations = [
                    {
                        from: () => localStorage.getItem('userToken') || localStorage.getItem('authToken'),
                        to: 'userToken',
                        sensitive: true
                    },
                    {
                        from: () => {
                            const userStr = localStorage.getItem('userData') || localStorage.getItem('currentUser');
                            try {
                                return userStr ? JSON.parse(userStr) : null;
                            } catch {
                                return null;
                            }
                        },
                        to: 'currentUser',
                        sensitive: true
                    },
                    {
                        from: () => localStorage.getItem('isLoggedIn') === 'true',
                        to: 'isLoggedIn'
                    },
                    {
                        from: () => localStorage.getItem('subscriptionPlan') || 'unpaid',
                        to: 'subscriptionPlan'
                    }
                ];

                let migrated = 0;
                for (const migration of migrations) {
                    try {
                        const oldValue = typeof migration.from === 'function' ? migration.from() : migration.from;
                        if (oldValue !== null && oldValue !== undefined) {
                            await window.config.set(migration.to, oldValue, { skipBackwardCompatibility: true });
                            migrated++;
                            if (!migration.sensitive) {
                                console.log(`✅ Migrated auth ${migration.to}: ${JSON.stringify(oldValue)}`);
                            } else {
                                console.log(`✅ Migrated auth ${migration.to}: [REDACTED]`);
                            }
                        }
                    } catch (error) {
                        console.error(`❌ Failed to migrate auth ${migration.to}:`, error);
                    }
                }

                return { migrated, total: migrations.length };
            }
        };

        // Migration 4: Performance profile detection
        this.migrations['performance-profile-v1'] = {
            description: 'Set up performance profile based on system capabilities',
            version: '1.0.0',
            priority: 4,
            run: async () => {
                try {
                    const current = await window.config.get('performanceMode');
                    if (current && current !== 'auto') {
                        return { migrated: 0, total: 1, skipped: 'Performance mode already set' };
                    }

                    // Detect system capabilities
                    let recommendedMode = 'balanced';

                    if (window.navigator) {
                        const memory = navigator.deviceMemory || 4; // Default to 4GB if not available
                        const cores = navigator.hardwareConcurrency || 4;
                        const connection = navigator.connection;

                        if (memory <= 2 || cores <= 2) {
                            recommendedMode = 'low';
                        } else if (memory >= 8 && cores >= 8) {
                            recommendedMode = 'high';
                        }

                        if (connection && connection.saveData) {
                            recommendedMode = 'low';
                        }
                    }

                    await window.config.set('performanceMode', recommendedMode);
                    console.log(`✅ Set performance mode to: ${recommendedMode}`);

                    return { migrated: 1, total: 1, recommendedMode };

                } catch (error) {
                    console.error('❌ Failed to set performance profile:', error);
                    return { migrated: 0, total: 1, error: error.message };
                }
            }
        };

        // Migration 5: Theme detection from DOM
        this.migrations['theme-detection-v1'] = {
            description: 'Detect current theme from DOM and system preferences',
            version: '1.0.0',
            priority: 5,
            run: async () => {
                try {
                    const current = await window.config.get('theme');
                    if (current && current !== 'auto') {
                        return { migrated: 0, total: 1, skipped: 'Theme already set' };
                    }

                    // Detect theme from DOM
                    let detectedTheme = 'auto';

                    if (document.documentElement.classList.contains('dark-theme') || 
                        document.documentElement.classList.contains('dark')) {
                        detectedTheme = 'dark';
                    } else if (document.documentElement.classList.contains('light-theme') || 
                               document.documentElement.classList.contains('light')) {
                        detectedTheme = 'light';
                    } else {
                        // Check system preference
                        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                            detectedTheme = 'dark';
                        } else {
                            detectedTheme = 'light';
                        }
                    }

                    await window.config.set('theme', detectedTheme);
                    console.log(`✅ Set theme to: ${detectedTheme}`);

                    return { migrated: 1, total: 1, detectedTheme };

                } catch (error) {
                    console.error('❌ Failed to detect theme:', error);
                    return { migrated: 0, total: 1, error: error.message };
                }
            }
        };
    }

    setupValidation() {
        // Validation rules for different config types
        this.validationRules = {
            businessName: {
                type: 'string',
                required: true,
                minLength: 1,
                maxLength: 100,
                validate: (value) => {
                    if (typeof value !== 'string') return 'Must be a string';
                    if (value.length < 1) return 'Must not be empty';
                    if (value.length > 100) return 'Must be less than 100 characters';
                    return null;
                }
            },

            apiUrl: {
                type: 'string',
                required: true,
                validate: (value) => {
                    if (typeof value !== 'string') return 'Must be a string';
                    try {
                        new URL(value);
                        if (!value.startsWith('https://') && !value.startsWith('http://')) {
                            return 'Must be a valid HTTP(S) URL';
                        }
                        return null;
                    } catch {
                        return 'Must be a valid URL';
                    }
                }
            },

            theme: {
                type: 'string',
                required: true,
                enum: ['light', 'dark', 'auto'],
                validate: (value) => {
                    if (!['light', 'dark', 'auto'].includes(value)) {
                        return 'Must be one of: light, dark, auto';
                    }
                    return null;
                }
            },

            performanceMode: {
                type: 'string',
                required: true,
                enum: ['low', 'balanced', 'high', 'auto'],
                validate: (value) => {
                    if (!['low', 'balanced', 'high', 'auto'].includes(value)) {
                        return 'Must be one of: low, balanced, high, auto';
                    }
                    return null;
                }
            },

            userToken: {
                type: 'string',
                sensitive: true,
                validate: (value) => {
                    if (value !== null && typeof value !== 'string') {
                        return 'Must be a string or null';
                    }
                    if (value && value.length < 10) {
                        return 'Token too short';
                    }
                    return null;
                }
            },

            currentUser: {
                type: 'object',
                sensitive: true,
                validate: (value) => {
                    if (value !== null && typeof value !== 'object') {
                        return 'Must be an object or null';
                    }
                    if (value && (!value.email || !value.name)) {
                        return 'User object must have email and name';
                    }
                    return null;
                }
            },

            isLoggedIn: {
                type: 'boolean',
                required: true,
                validate: (value) => {
                    if (typeof value !== 'boolean') {
                        return 'Must be a boolean';
                    }
                    return null;
                }
            },

            subscriptionPlan: {
                type: 'string',
                required: true,
                enum: ['unpaid', 'pro'],
                validate: (value) => {
                    if (!['unpaid', 'pro'].includes(value)) {
                        return 'Must be one of: unpaid, pro';
                    }
                    return null;
                }
            },

            loggingEnabled: {
                type: 'boolean',
                required: true,
                validate: (value) => {
                    if (typeof value !== 'boolean') {
                        return 'Must be a boolean';
                    }
                    return null;
                }
            },

            debugMode: {
                type: 'boolean',
                required: true,
                validate: (value) => {
                    if (typeof value !== 'boolean') {
                        return 'Must be a boolean';
                    }
                    return null;
                }
            },

            businessConfig: {
                type: 'object',
                validate: (value) => {
                    if (value !== null && typeof value !== 'object') {
                        return 'Must be an object or null';
                    }
                    if (value && !value.businessType) {
                        return 'Business config must have businessType';
                    }
                    return null;
                }
            },

            lastSync: {
                type: 'number',
                validate: (value) => {
                    if (value !== null && typeof value !== 'number') {
                        return 'Must be a number or null';
                    }
                    if (value && value < 0) {
                        return 'Must be a positive number';
                    }
                    return null;
                }
            }
        };
    }

    // Main migration runner
    async runAllMigrations() {
        console.log('🚀 Starting configuration migration...');
        
        const results = {
            timestamp: Date.now(),
            version: this.migrationVersion,
            migrations: {},
            summary: {
                total: 0,
                successful: 0,
                failed: 0,
                skipped: 0
            }
        };

        // Sort migrations by priority
        const sortedMigrations = Object.entries(this.migrations)
            .sort(([,a], [,b]) => a.priority - b.priority);

        for (const [name, migration] of sortedMigrations) {
            console.log(`🔄 Running migration: ${name}`);
            results.summary.total++;

            try {
                const startTime = Date.now();
                const result = await migration.run();
                const duration = Date.now() - startTime;

                results.migrations[name] = {
                    description: migration.description,
                    success: true,
                    duration,
                    result
                };

                if (result.skipped) {
                    results.summary.skipped++;
                    console.log(`⏭️ Migration skipped: ${name} - ${result.skipped}`);
                } else {
                    results.summary.successful++;
                    console.log(`✅ Migration completed: ${name} - ${result.migrated}/${result.total} items`);
                }

            } catch (error) {
                results.migrations[name] = {
                    description: migration.description,
                    success: false,
                    error: error.message,
                    stack: error.stack
                };

                results.summary.failed++;
                console.error(`❌ Migration failed: ${name}`, error);
            }
        }

        console.log('📊 Migration Summary:', results.summary);
        
        // Save migration results
        try {
            await window.config.set('migrationResults', results, { skipBackwardCompatibility: true });
        } catch (error) {
            console.warn('Failed to save migration results:', error);
        }

        return results;
    }

    // Validation methods
    async validateConfiguration() {
        console.log('🔍 Starting configuration validation...');
        
        const results = {
            timestamp: Date.now(),
            valid: true,
            errors: {},
            warnings: {},
            summary: {
                total: 0,
                valid: 0,
                invalid: 0,
                warnings: 0
            }
        };

        // Get all configuration keys to validate
        const configKeys = Object.keys(this.validationRules);

        for (const key of configKeys) {
            results.summary.total++;
            const rule = this.validationRules[key];

            try {
                const value = await window.config.get(key);
                const error = this.validateValue(key, value, rule);

                if (error) {
                    results.errors[key] = error;
                    results.summary.invalid++;
                    results.valid = false;
                    
                    if (!rule.sensitive) {
                        console.error(`❌ Validation error for ${key}: ${error} (value: ${JSON.stringify(value)})`);
                    } else {
                        console.error(`❌ Validation error for ${key}: ${error} (value: [REDACTED])`);
                    }
                } else {
                    results.summary.valid++;
                    
                    if (!rule.sensitive) {
                        console.log(`✅ Validation passed for ${key}: ${JSON.stringify(value)}`);
                    } else {
                        console.log(`✅ Validation passed for ${key}: [REDACTED]`);
                    }
                }

                // Check for warnings
                const warning = this.checkWarnings(key, value, rule);
                if (warning) {
                    results.warnings[key] = warning;
                    results.summary.warnings++;
                    console.warn(`⚠️ Validation warning for ${key}: ${warning}`);
                }

            } catch (error) {
                results.errors[key] = `Failed to get value: ${error.message}`;
                results.summary.invalid++;
                results.valid = false;
                console.error(`❌ Failed to validate ${key}:`, error);
            }
        }

        console.log('📊 Validation Summary:', results.summary);
        return results;
    }

    validateValue(key, value, rule) {
        // Check if required
        if (rule.required && (value === null || value === undefined)) {
            return 'Required value is missing';
        }

        // Skip further validation for null/undefined optional values
        if (!rule.required && (value === null || value === undefined)) {
            return null;
        }

        // Use custom validator if provided
        if (rule.validate) {
            return rule.validate(value);
        }

        // Basic type checking
        if (rule.type && typeof value !== rule.type) {
            return `Expected ${rule.type}, got ${typeof value}`;
        }

        // Enum validation
        if (rule.enum && !rule.enum.includes(value)) {
            return `Must be one of: ${rule.enum.join(', ')}`;
        }

        // String length validation
        if (rule.type === 'string' && typeof value === 'string') {
            if (rule.minLength && value.length < rule.minLength) {
                return `Must be at least ${rule.minLength} characters`;
            }
            if (rule.maxLength && value.length > rule.maxLength) {
                return `Must be no more than ${rule.maxLength} characters`;
            }
        }

        return null;
    }

    checkWarnings(key, value, rule) {
        // Add warning checks here
        if (key === 'apiUrl' && typeof value === 'string') {
            if (value.includes('localhost') || value.includes('127.0.0.1')) {
                return 'Using localhost API URL - may not work in production';
            }
        }

        if (key === 'performanceMode' && value === 'high') {
            if (navigator.deviceMemory && navigator.deviceMemory < 4) {
                return 'High performance mode may not be suitable for low-memory devices';
            }
        }

        return null;
    }

    // Repair methods
    async repairConfiguration() {
        console.log('🔧 Starting configuration repair...');
        
        const results = {
            timestamp: Date.now(),
            repaired: {},
            failed: {},
            summary: {
                total: 0,
                repaired: 0,
                failed: 0
            }
        };

        // First validate to find issues
        const validation = await this.validateConfiguration();
        
        for (const [key, error] of Object.entries(validation.errors)) {
            results.summary.total++;
            const rule = this.validationRules[key];

            try {
                let repairedValue = null;

                // Try to repair the value
                if (rule.required) {
                    // Set to default value
                    repairedValue = this.getDefaultValue(key, rule);
                    
                    if (repairedValue !== null) {
                        await window.config.set(key, repairedValue);
                        results.repaired[key] = {
                            error,
                            repairedValue: rule.sensitive ? '[REDACTED]' : repairedValue
                        };
                        results.summary.repaired++;
                        
                        if (!rule.sensitive) {
                            console.log(`🔧 Repaired ${key}: ${JSON.stringify(repairedValue)}`);
                        } else {
                            console.log(`🔧 Repaired ${key}: [REDACTED]`);
                        }
                    } else {
                        throw new Error('No default value available');
                    }
                } else {
                    // Optional field - set to null
                    await window.config.set(key, null);
                    results.repaired[key] = {
                        error,
                        repairedValue: null
                    };
                    results.summary.repaired++;
                    console.log(`🔧 Repaired ${key}: set to null`);
                }

            } catch (repairError) {
                results.failed[key] = {
                    originalError: error,
                    repairError: repairError.message
                };
                results.summary.failed++;
                console.error(`❌ Failed to repair ${key}:`, repairError);
            }
        }

        console.log('📊 Repair Summary:', results.summary);
        return results;
    }

    getDefaultValue(key, rule) {
        const defaults = {
            businessName: 'Ava Solutions',
            apiUrl: 'https://ava-marketing-api.onrender.com',
            theme: 'auto',
            performanceMode: 'auto',
            isLoggedIn: false,
            subscriptionPlan: 'unpaid',
            loggingEnabled: true,
            debugMode: false,
            userToken: null,
            currentUser: null,
            businessConfig: null,
            lastSync: null
        };

        return defaults[key] || null;
    }

    // Testing methods
    async testMigration() {
        console.log('🧪 Testing migration system...');
        
        const testResults = {
            timestamp: Date.now(),
            tests: {},
            summary: {
                total: 0,
                passed: 0,
                failed: 0
            }
        };

        // Test 1: Validation system
        try {
            testResults.summary.total++;
            const validation = await this.validateConfiguration();
            testResults.tests.validation = {
                passed: true,
                result: validation.summary
            };
            testResults.summary.passed++;
            console.log('✅ Validation test passed');
        } catch (error) {
            testResults.tests.validation = {
                passed: false,
                error: error.message
            };
            testResults.summary.failed++;
            console.error('❌ Validation test failed:', error);
        }

        // Test 2: Individual migration
        try {
            testResults.summary.total++;
            const testMigration = this.migrations['localStorage-basic-v1'];
            const result = await testMigration.run();
            testResults.tests.individualMigration = {
                passed: true,
                result
            };
            testResults.summary.passed++;
            console.log('✅ Individual migration test passed');
        } catch (error) {
            testResults.tests.individualMigration = {
                passed: false,
                error: error.message
            };
            testResults.summary.failed++;
            console.error('❌ Individual migration test failed:', error);
        }

        // Test 3: Value validation
        try {
            testResults.summary.total++;
            const rule = this.validationRules.theme;
            const validValue = this.validateValue('theme', 'dark', rule);
            const invalidValue = this.validateValue('theme', 'invalid', rule);
            
            if (validValue === null && invalidValue !== null) {
                testResults.tests.valueValidation = { passed: true };
                testResults.summary.passed++;
                console.log('✅ Value validation test passed');
            } else {
                throw new Error('Validation logic incorrect');
            }
        } catch (error) {
            testResults.tests.valueValidation = {
                passed: false,
                error: error.message
            };
            testResults.summary.failed++;
            console.error('❌ Value validation test failed:', error);
        }

        console.log('📊 Migration Test Summary:', testResults.summary);
        return testResults;
    }

    // Export methods
    async exportMigrationStatus() {
        return {
            timestamp: Date.now(),
            date: new Date().toISOString(),
            migrationVersion: this.migrationVersion,
            availableMigrations: Object.keys(this.migrations),
            validationRules: Object.keys(this.validationRules),
            lastMigrationResults: await window.config.get('migrationResults'),
            configServiceStatus: window.config?.isInitialized || false
        };
    }
}

// Initialize migration system
const configMigration = new ConfigMigration();

// Expose to window for external access
window.configMigration = configMigration;

// Auto-run migration if config service is ready
if (window.config && window.config.isInitialized) {
    // Small delay to ensure everything is loaded
    setTimeout(() => {
        configMigration.runAllMigrations();
    }, 1000);
} else {
    // Wait for config service
    const checkConfig = () => {
        if (window.config && window.config.isInitialized) {
            setTimeout(() => {
                configMigration.runAllMigrations();
            }, 1000);
        } else {
            setTimeout(checkConfig, 100);
        }
    };
    checkConfig();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConfigMigration;
}