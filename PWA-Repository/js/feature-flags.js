// Enhanced Feature Flag System for SPA PWA
// Integrates with config service and enhanced logger for comprehensive feature management

class FeatureFlagSystem {
    constructor() {
        this.dbName = 'AvaFeatureFlagsDB';
        this.version = 2;
        this.db = null;
        this.flags = new Map();
        this.callbacks = new Map();
        this.remoteConfigUrl = null; // Can be set for remote flag management
        this.refreshInterval = 5 * 60 * 1000; // 5 minutes
        this.configReady = false;
        this.isInitialized = false;
        this.flagHistory = new Map();
        this.evaluationCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        
        // System context for flag evaluation
        this.context = {
            user: {},
            session: {},
            device: {},
            environment: {}
        };
        
        // Enhanced system feature flags integrated with config service
        this.systemFlags = {
            // Logging and debugging flags
            debugMode: { enabled: false, rollout: 0, description: 'Enable debug mode with enhanced logging and debugging tools', category: 'debug', configKey: 'debugMode' },
            loggingEnabled: { enabled: true, rollout: 100, description: 'Enable comprehensive application logging', category: 'logging', configKey: 'loggingEnabled' },
            errorRecoveryEnabled: { enabled: true, rollout: 100, description: 'Enable automated error detection and recovery', category: 'stability', configKey: 'errorRecoveryEnabled' },
            performanceMonitoring: { enabled: true, rollout: 100, description: 'Enable performance monitoring and metrics collection', category: 'performance', configKey: 'performanceMonitoring' },
            
            // UI and UX features
            darkTheme: { enabled: false, rollout: 25, description: 'Enable dark theme interface', category: 'ui', configKey: 'theme' },
            compactView: { enabled: false, rollout: 30, description: 'Enable compact view for data tables and lists', category: 'ui' },
            advancedSearch: { enabled: true, rollout: 100, description: 'Enable advanced search features with filters and sorting', category: 'features' },
            bulkOperations: { enabled: true, rollout: 100, description: 'Enable bulk operations for data management', category: 'features' },
            
            // New features
            'new-dashboard-layout': { enabled: false, rollout: 0, description: 'New dashboard layout design', category: 'features' },
            'advanced-analytics': { enabled: false, rollout: 0, description: 'Advanced analytics and reporting', category: 'business' },
            'ai-recommendations': { enabled: false, rollout: 0, description: 'AI-powered recommendations', category: 'experimental' },
            'enhanced-pos': { enabled: false, rollout: 10, description: 'Enhanced POS system with new features', category: 'features' },
            'mobile-app-integration': { enabled: false, rollout: 0, description: 'Mobile app integration features', category: 'features' },
            
            // Safety and stability features
            'data-validation': { enabled: true, rollout: 100, description: 'Enhanced data validation', category: 'security' },
            'backup-notifications': { enabled: true, rollout: 100, description: 'Backup system notifications', category: 'safety' },
            'error-reporting': { enabled: true, rollout: 100, description: 'Enhanced error reporting', category: 'stability' },
            'health-monitoring': { enabled: true, rollout: 100, description: 'System health monitoring', category: 'stability' },
            
            // Performance optimization
            performanceMode: { enabled: true, rollout: 100, description: 'Performance optimization mode', category: 'performance', configKey: 'performanceMode' },
            lazyLoading: { enabled: true, rollout: 80, description: 'Enable lazy loading for images and components', category: 'performance' },
            cacheStrategy: { enabled: true, rollout: 100, description: 'Intelligent caching strategy', category: 'performance' },
            
            // Experimental features
            'offline-sync-v2': { enabled: false, rollout: 5, description: 'New offline sync algorithm', category: 'experimental' },
            'real-time-collaboration': { enabled: false, rollout: 0, description: 'Real-time collaboration features', category: 'experimental' },
            'voice-commands': { enabled: false, rollout: 0, description: 'Voice command interface', category: 'experimental' },
            experimentalFeatures: { enabled: false, rollout: 0, description: 'Enable experimental features', category: 'experimental' },
            betaFeatures: { enabled: false, rollout: 0, description: 'Enable beta features for testing', category: 'experimental' },
            
            // Security features
            enhancedSecurity: { enabled: true, rollout: 100, description: 'Enable enhanced security features and validations', category: 'security' },
            auditLogging: { enabled: true, rollout: 100, description: 'Enable detailed audit logging for sensitive operations', category: 'security' },
            
            // Business logic features
            advancedReporting: { enabled: true, rollout: 100, description: 'Enable advanced reporting and analytics features', category: 'business' },
            realTimeSync: { enabled: true, rollout: 90, description: 'Enable real-time synchronization with server', category: 'sync' },
            offlineMode: { enabled: true, rollout: 100, description: 'Enable enhanced offline functionality', category: 'offline' },
            
            // Kill switches (for emergency disabling)
            'kill-cloud-sync': { enabled: false, rollout: 0, description: 'Emergency: Disable cloud sync', category: 'killswitch' },
            'kill-auto-updates': { enabled: false, rollout: 0, description: 'Emergency: Disable auto updates', category: 'killswitch' },
            'kill-external-apis': { enabled: false, rollout: 0, description: 'Emergency: Disable external API calls', category: 'killswitch' },
            'kill-logging': { enabled: false, rollout: 0, description: 'Emergency: Disable logging system', category: 'killswitch' },
            
            // A/B testing
            'checkout-flow-a': { enabled: false, rollout: 50, description: 'Checkout flow variant A', category: 'ab-test' },
            'checkout-flow-b': { enabled: false, rollout: 50, description: 'Checkout flow variant B', category: 'ab-test' },
            'pricing-display-new': { enabled: false, rollout: 30, description: 'New pricing display format', category: 'ab-test' }
        };
        
        this.init();
    }

    async init() {
        try {
            await this.waitForDependencies();
            await this.loadSystemContext();
            await this.initDB();
            await this.loadFlags();
            await this.syncWithConfigService();
            this.setupConfigListeners();
            this.startRefreshInterval();
            
            this.isInitialized = true;
            
            this.log('INFO', 'Enhanced Feature Flag System initialized', {
                flagCount: this.flags.size,
                enabledFlags: this.getEnabledFlags().length,
                configReady: this.configReady,
                systemFlagCount: Object.keys(this.systemFlags).length
            });
            
            console.log('🚩 Enhanced Feature flag system initialized');
        } catch (error) {
            console.error('Failed to initialize feature flag system:', error);
            this.fallbackLogging('ERROR', 'Feature flags init failed', error);
            // Use default flags as fallback
            this.loadDefaultFlags();
        }
    }

    async waitForDependencies() {
        let attempts = 0;
        const maxAttempts = 20; // Reduced from 50 to 20 (2 seconds instead of 5)
        
        while (attempts < maxAttempts) {
            if (window.config?.isInitialized && window.logger) {
                this.configReady = true;
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!this.configReady) {
            console.warn('Feature Flags: Dependencies timeout, using fallback mode');
        }
    }

    async loadSystemContext() {
        try {
            // User context
            if (window.authSystem && typeof window.authSystem.getCurrentUser === 'function') {
                const user = await window.authSystem.getCurrentUser();
                this.context.user = {
                    id: user?.id || 'anonymous',
                    role: user?.role || 'user',
                    permissions: user?.permissions || [],
                    isLoggedIn: !!user
                };
            }

            // Session context
            this.context.session = {
                id: this.getSessionId(),
                startTime: Date.now(),
                userAgent: navigator.userAgent,
                language: navigator.language
            };

            // Device context
            this.context.device = {
                isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
                isTablet: /iPad|Android.*tablet/i.test(navigator.userAgent),
                hasTouch: 'ontouchstart' in window,
                screen: {
                    width: screen.width,
                    height: screen.height
                }
            };

            // Environment context
            this.context.environment = {
                platform: navigator.platform,
                online: navigator.onLine,
                cookieEnabled: navigator.cookieEnabled
            };

        } catch (error) {
            this.log('WARN', 'Failed to load complete system context', { error: error.message });
        }
    }

    async syncWithConfigService() {
        if (!this.configReady) return;

        try {
            // Sync system flags with config service
            for (const [flagName, flagConfig] of Object.entries(this.systemFlags)) {
                if (flagConfig.configKey) {
                    // Get value from config service
                    const configValue = await window.config.get(flagConfig.configKey, flagConfig.enabled);
                    
                    // Update flag based on config value
                    const flag = this.flags.get(flagName);
                    if (flag) {
                        flag.enabled = Boolean(configValue);
                        flag.source = 'config';
                        flag.lastUpdated = Date.now();
                    }
                }
            }

            this.log('DEBUG', 'Synced flags with config service', { syncedFlags: Object.keys(this.systemFlags).filter(name => this.systemFlags[name].configKey).length });

        } catch (error) {
            this.log('WARN', 'Failed to sync with config service', { error: error.message });
        }
    }

    setupConfigListeners() {
        if (!this.configReady) return;

        // Listen for config changes
        for (const [flagName, flagConfig] of Object.entries(this.systemFlags)) {
            if (flagConfig.configKey && window.config && typeof window.config.listen === 'function') {
                window.config.listen(flagConfig.configKey, (newValue) => {
                    this.updateFlagFromConfig(flagName, newValue);
                });
            }
        }
    }

    updateFlagFromConfig(flagName, configValue) {
        const flag = this.flags.get(flagName);
        if (flag) {
            const oldValue = flag.enabled;
            flag.enabled = Boolean(configValue);
            flag.source = 'config';
            flag.lastUpdated = Date.now();
            
            this.clearFlagCache(flagName);
            this.recordFlagChange(flagName, flag.enabled, oldValue);
            this.triggerCallbacks(flagName, flag.enabled);
            
            this.log('DEBUG', `Flag updated from config: ${flagName}`, { 
                oldValue, 
                newValue: flag.enabled,
                configKey: this.systemFlags[flagName]?.configKey 
            });
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

                // Feature flags store
                if (!db.objectStoreNames.contains('flags')) {
                    const flagStore = db.createObjectStore('flags', { keyPath: 'name' });
                    flagStore.createIndex('enabled', 'enabled', { unique: false });
                    flagStore.createIndex('rollout', 'rollout', { unique: false });
                    flagStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
                }

                // Flag history store
                if (!db.objectStoreNames.contains('history')) {
                    const historyStore = db.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
                    historyStore.createIndex('flagName', 'flagName', { unique: false });
                    historyStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // User assignments store (for A/B testing)
                if (!db.objectStoreNames.contains('assignments')) {
                    const assignmentStore = db.createObjectStore('assignments', { keyPath: 'flagName' });
                    assignmentStore.createIndex('userId', 'userId', { unique: false });
                }
            };
        });
    }

    loadDefaultFlags() {
        for (const [name, config] of Object.entries(this.systemFlags)) {
            this.flags.set(name, {
                name,
                enabled: config.enabled,
                rollout: config.rollout,
                description: config.description,
                category: config.category || 'general',
                configKey: config.configKey,
                source: 'default',
                lastUpdated: Date.now()
            });
        }
    }

    async loadFlags() {
        // Load system flags first
        this.loadDefaultFlags();

        if (!this.db) return;

        try {
            const transaction = this.db.transaction(['flags'], 'readonly');
            const store = transaction.objectStore('flags');
            
            const request = store.getAll();
            const storedFlags = await new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

            // Merge stored flags with defaults
            for (const flag of storedFlags) {
                this.flags.set(flag.name, {
                    ...flag,
                    source: 'stored'
                });
            }

            console.log(`🚩 Loaded ${this.flags.size} feature flags`);
        } catch (error) {
            console.error('Failed to load feature flags:', error);
        }
    }

    async saveFlag(flagName, config) {
        if (!this.db) return;

        try {
            const flag = {
                name: flagName,
                enabled: config.enabled,
                rollout: config.rollout,
                description: config.description,
                lastUpdated: Date.now(),
                updatedBy: this.getCurrentUserId()
            };

            const transaction = this.db.transaction(['flags'], 'readwrite');
            const store = transaction.objectStore('flags');
            
            await new Promise((resolve, reject) => {
                const request = store.put(flag);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });

            // Update in-memory cache
            this.flags.set(flagName, flag);

            // Log flag change
            await this.logFlagChange(flagName, config);

            // Trigger callbacks
            this.triggerCallbacks(flagName, config.enabled);

            console.log(`🚩 Flag ${flagName} updated: ${config.enabled ? 'enabled' : 'disabled'}`);
        } catch (error) {
            console.error(`Failed to save flag ${flagName}:`, error);
        }
    }

    async logFlagChange(flagName, config) {
        if (!this.db) return;

        try {
            const logEntry = {
                flagName,
                enabled: config.enabled,
                rollout: config.rollout,
                timestamp: Date.now(),
                userId: this.getCurrentUserId(),
                userAgent: navigator.userAgent,
                source: 'manual'
            };

            const transaction = this.db.transaction(['history'], 'readwrite');
            const store = transaction.objectStore('history');
            
            await new Promise((resolve, reject) => {
                const request = store.add(logEntry);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });

            // Log to enhanced logger if available
            this.log('INFO', `Feature flag ${flagName} ${config.enabled ? 'enabled' : 'disabled'}`, {
                flagName,
                enabled: config.enabled,
                rollout: config.rollout,
                description: config.description,
                category: config.category || 'general'
            });
        } catch (error) {
            console.error('Failed to log flag change:', error);
        }
    }

    // Enhanced feature flag evaluation with context and caching
    isEnabled(flagName, context = {}) {
        try {
            const cacheKey = `${flagName}_${JSON.stringify(context)}`;
            
            // Check cache first
            const cached = this.evaluationCache.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
                return cached.result;
            }

            const flag = this.flags.get(flagName);
            
            if (!flag) {
                this.log('WARN', `Feature flag '${flagName}' not found`);
                return false;
            }

            // If flag is disabled, return false
            if (!flag.enabled) {
                this.logFlagEvaluation(flagName, false, { reason: 'disabled' });
                return false;
            }

            // If rollout is 100%, return true
            if (flag.rollout >= 100) {
                const result = true;
                this.cacheResult(cacheKey, result);
                this.logFlagEvaluation(flagName, result, { reason: 'full_rollout' });
                return result;
            }

            // If rollout is 0%, return false
            if (flag.rollout <= 0) {
                const result = false;
                this.cacheResult(cacheKey, result);
                this.logFlagEvaluation(flagName, result, { reason: 'zero_rollout' });
                return result;
            }

            // For gradual rollout, use consistent user-based assignment
            const evalContext = { ...this.context, ...context };
            const userId = context.userId || evalContext.user?.id || this.getCurrentUserId();
            const assignment = this.getUserAssignment(flagName, userId, evalContext);
            
            this.cacheResult(cacheKey, assignment);
            this.logFlagEvaluation(flagName, assignment, { 
                reason: 'rollout_evaluation',
                rollout: flag.rollout,
                userId: userId,
                context: evalContext
            });
            
            return assignment;

        } catch (error) {
            this.log('ERROR', `Flag evaluation failed: ${flagName}`, { error: error.message });
            return false;
        }
    }

    cacheResult(cacheKey, result) {
        this.evaluationCache.set(cacheKey, {
            result,
            timestamp: Date.now()
        });
        
        // Clean old cache entries
        if (this.evaluationCache.size > 1000) {
            const cutoff = Date.now() - this.cacheTimeout;
            for (const [key, value] of this.evaluationCache.entries()) {
                if (value.timestamp < cutoff) {
                    this.evaluationCache.delete(key);
                }
            }
        }
    }

    clearFlagCache(flagName = null) {
        if (flagName) {
            // Clear cache entries for specific flag
            for (const key of this.evaluationCache.keys()) {
                if (key.startsWith(`${flagName}_`)) {
                    this.evaluationCache.delete(key);
                }
            }
        } else {
            // Clear all cache
            this.evaluationCache.clear();
        }
    }

    recordFlagChange(flagName, newValue, oldValue) {
        if (!this.flagHistory.has(flagName)) {
            this.flagHistory.set(flagName, []);
        }
        
        const history = this.flagHistory.get(flagName);
        history.push({
            timestamp: Date.now(),
            oldValue,
            newValue,
            context: { ...this.context }
        });
        
        // Keep only last 50 changes per flag
        if (history.length > 50) {
            history.splice(0, history.length - 50);
        }
    }

    logFlagEvaluation(flagName, result, evaluationContext) {
        if (window.logger && typeof window.logger.logFeatureFlag === 'function') {
            window.logger.logFeatureFlag(flagName, result, evaluationContext);
        }
    }

    getUserAssignment(flagName, userId) {
        // Create a consistent hash for this user and flag combination
        const input = `${flagName}:${userId}`;
        const hash = this.simpleHash(input);
        const percentage = (hash % 100) + 1; // 1-100
        
        const flag = this.flags.get(flagName);
        return percentage <= flag.rollout;
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    // Convenient methods for common checks
    isFeatureEnabled(featureName) {
        return this.isEnabled(featureName);
    }

    isKillSwitchActive(switchName) {
        return this.isEnabled(`kill-${switchName}`);
    }

    getVariant(experimentName, variants = ['A', 'B']) {
        const userId = this.getCurrentUserId();
        const hash = this.simpleHash(`${experimentName}:${userId}`);
        const variantIndex = hash % variants.length;
        return variants[variantIndex];
    }

    // Flag management methods
    async enableFlag(flagName, rollout = 100) {
        const flag = this.flags.get(flagName);
        if (!flag) {
            console.error(`Flag ${flagName} not found`);
            return false;
        }

        await this.saveFlag(flagName, {
            ...flag,
            enabled: true,
            rollout: rollout
        });

        return true;
    }

    async disableFlag(flagName) {
        const flag = this.flags.get(flagName);
        if (!flag) {
            console.error(`Flag ${flagName} not found`);
            return false;
        }

        await this.saveFlag(flagName, {
            ...flag,
            enabled: false,
            rollout: 0
        });

        return true;
    }

    async setRollout(flagName, percentage) {
        const flag = this.flags.get(flagName);
        if (!flag) {
            console.error(`Flag ${flagName} not found`);
            return false;
        }

        await this.saveFlag(flagName, {
            ...flag,
            rollout: Math.max(0, Math.min(100, percentage))
        });

        return true;
    }

    async createFlag(flagName, config) {
        const flagConfig = {
            enabled: config.enabled || false,
            rollout: config.rollout || 0,
            description: config.description || 'Custom feature flag'
        };

        await this.saveFlag(flagName, flagConfig);
        return true;
    }

    async removeFlag(flagName) {
        if (!this.db) return false;

        try {
            const transaction = this.db.transaction(['flags'], 'readwrite');
            const store = transaction.objectStore('flags');
            
            await new Promise((resolve, reject) => {
                const request = store.delete(flagName);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });

            this.flags.delete(flagName);
            console.log(`🚩 Flag ${flagName} removed`);
            return true;
        } catch (error) {
            console.error(`Failed to remove flag ${flagName}:`, error);
            return false;
        }
    }

    // Callback system for real-time updates
    onFlagChange(flagName, callback) {
        if (!this.callbacks.has(flagName)) {
            this.callbacks.set(flagName, []);
        }
        this.callbacks.get(flagName).push(callback);
    }

    offFlagChange(flagName, callback) {
        const callbacks = this.callbacks.get(flagName);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    triggerCallbacks(flagName, enabled) {
        const callbacks = this.callbacks.get(flagName);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(enabled, flagName);
                } catch (error) {
                    console.error('Feature flag callback error:', error);
                }
            });
        }
    }

    // Remote configuration
    setRemoteConfigUrl(url) {
        this.remoteConfigUrl = url;
    }

    async refreshFromRemote() {
        if (!this.remoteConfigUrl) return;

        try {
            const response = await fetch(this.remoteConfigUrl);
            if (!response.ok) return;

            const remoteFlags = await response.json();
            
            for (const [flagName, config] of Object.entries(remoteFlags)) {
                const existingFlag = this.flags.get(flagName);
                
                // Only update if remote version is newer
                if (!existingFlag || config.lastUpdated > existingFlag.lastUpdated) {
                    await this.saveFlag(flagName, {
                        ...config,
                        source: 'remote'
                    });
                }
            }

            console.log('🚩 Flags refreshed from remote configuration');
        } catch (error) {
            console.error('Failed to refresh flags from remote:', error);
        }
    }

    startRefreshInterval() {
        if (this.remoteConfigUrl && this.refreshInterval > 0) {
            setInterval(() => {
                this.refreshFromRemote();
            }, this.refreshInterval);
        }
    }

    // Utility methods
    getCurrentUserId() {
        try {
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

    getAllFlags() {
        const flags = {};
        for (const [name, config] of this.flags.entries()) {
            flags[name] = {
                name: config.name,
                enabled: config.enabled,
                rollout: config.rollout,
                description: config.description,
                lastUpdated: config.lastUpdated,
                isEnabledForUser: this.isEnabled(name)
            };
        }
        return flags;
    }

    getEnabledFlags() {
        const enabled = [];
        for (const [name, config] of this.flags.entries()) {
            if (this.isEnabled(name)) {
                enabled.push(name);
            }
        }
        return enabled;
    }

    getFlagsByCategory() {
        const categories = {
            new: [],
            experimental: [],
            safety: [],
            killSwitches: [],
            abTests: []
        };

        for (const [name, config] of this.flags.entries()) {
            if (name.startsWith('kill-')) {
                categories.killSwitches.push({ name, ...config });
            } else if (name.includes('-a') || name.includes('-b')) {
                categories.abTests.push({ name, ...config });
            } else if (config.description.toLowerCase().includes('experimental')) {
                categories.experimental.push({ name, ...config });
            } else if (config.description.toLowerCase().includes('safety') || 
                      config.description.toLowerCase().includes('monitoring') ||
                      config.description.toLowerCase().includes('backup')) {
                categories.safety.push({ name, ...config });
            } else {
                categories.new.push({ name, ...config });
            }
        }

        return categories;
    }

    async getFlagHistory(flagName) {
        if (!this.db) return [];

        try {
            const transaction = this.db.transaction(['history'], 'readonly');
            const store = transaction.objectStore('history');
            const index = store.index('flagName');
            
            const request = index.getAll(flagName);
            const history = await new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

            return history.sort((a, b) => b.timestamp - a.timestamp);
        } catch (error) {
            console.error('Failed to get flag history:', error);
            return [];
        }
    }

    async exportFlags() {
        const flags = this.getAllFlags();
        const exportData = {
            timestamp: Date.now(),
            date: new Date().toISOString(),
            flags: flags,
            metadata: {
                userAgent: navigator.userAgent,
                userId: this.getCurrentUserId(),
                totalFlags: Object.keys(flags).length,
                enabledFlags: this.getEnabledFlags().length
            }
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ava-feature-flags-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        return true;
    }

    async importFlags(file) {
        try {
            const text = await file.text();
            const importData = JSON.parse(text);
            
            if (!importData.flags) {
                throw new Error('Invalid feature flags file format');
            }

            let imported = 0;
            for (const [flagName, config] of Object.entries(importData.flags)) {
                await this.saveFlag(flagName, {
                    enabled: config.enabled,
                    rollout: config.rollout,
                    description: config.description
                });
                imported++;
            }

            console.log(`🚩 Imported ${imported} feature flags`);
            return imported;
        } catch (error) {
            console.error('Failed to import flags:', error);
            throw error;
        }
    }

    // Emergency methods
    async activateKillSwitch(switchName) {
        const killSwitchName = `kill-${switchName}`;
        await this.enableFlag(killSwitchName, 100);
        
        console.warn(`🚨 Kill switch activated: ${switchName}`);
        
        if (window.logger) {
            window.logger.log({
                type: 'FEATURE_FLAGS',
                category: 'KILL_SWITCH',
                level: 'WARN',
                message: `Kill switch activated: ${switchName}`,
                data: { switchName, timestamp: Date.now() }
            });
        }
    }

    async deactivateKillSwitch(switchName) {
        const killSwitchName = `kill-${switchName}`;
        await this.disableFlag(killSwitchName);
        
        console.log(`✅ Kill switch deactivated: ${switchName}`);
    }

    async emergencyDisableAll() {
        console.warn('🚨 EMERGENCY: Disabling all feature flags');
        
        for (const [flagName, config] of this.flags.entries()) {
            if (!flagName.startsWith('kill-') && config.enabled) {
                await this.disableFlag(flagName);
            }
        }

        this.log('CRITICAL', 'Emergency shutdown: All feature flags disabled', { 
            timestamp: Date.now(),
            disabledCount: Array.from(this.flags.values()).filter(f => !f.name.startsWith('kill-') && f.enabled).length
        });
    }

    // Enhanced utility methods
    getFlagsByCategory(category = null) {
        if (category) {
            const flags = {};
            for (const [name, flag] of this.flags) {
                if (flag.category === category) {
                    flags[name] = {
                        ...flag,
                        isEnabledForUser: this.isEnabled(name)
                    };
                }
            }
            return flags;
        }

        const categories = {
            debug: [],
            logging: [],
            stability: [],
            performance: [],
            ui: [],
            features: [],
            business: [],
            experimental: [],
            security: [],
            safety: [],
            sync: [],
            offline: [],
            killswitch: [],
            'ab-test': [],
            general: []
        };

        for (const [name, flag] of this.flags.entries()) {
            const category = flag.category || 'general';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push({ 
                name, 
                ...flag,
                isEnabledForUser: this.isEnabled(name)
            });
        }

        return categories;
    }

    getFlagHistory(flagName) {
        return this.flagHistory.get(flagName) || [];
    }

    getSystemInfo() {
        return {
            isInitialized: this.isInitialized,
            configReady: this.configReady,
            flagCount: this.flags.size,
            cacheSize: this.evaluationCache.size,
            callbackCount: Array.from(this.callbacks.values()).reduce((sum, arr) => sum + arr.length, 0),
            context: this.context,
            systemFlagCount: Object.keys(this.systemFlags).length
        };
    }

    getSessionId() {
        if (!this.sessionId) {
            this.sessionId = Date.now() + '_' + Math.random().toString(36).substring(2);
        }
        return this.sessionId;
    }

    // Enhanced logging methods
    log(level, message, data = null) {
        if (window.logger && typeof window.logger.log === 'function') {
            window.logger.log({
                type: 'FEATURE_FLAG',
                category: 'FEATURE',
                level: level,
                message: message,
                data: data
            });
        } else {
            this.fallbackLogging(level, message, data);
        }
    }

    fallbackLogging(level, message, data) {
        const prefix = `[FEATURE_FLAGS ${level}]`;
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

    // Public API convenience methods
    async enableFlag(flagName, rollout = 100) {
        const flag = this.flags.get(flagName);
        if (!flag) {
            this.log('ERROR', `Flag ${flagName} not found`);
            return false;
        }

        await this.saveFlag(flagName, {
            ...flag,
            enabled: true,
            rollout: rollout
        });

        // Update config service if this flag is linked
        if (flag.configKey && this.configReady) {
            await window.config.set(flag.configKey, true);
        }

        return true;
    }

    async disableFlag(flagName) {
        const flag = this.flags.get(flagName);
        if (!flag) {
            this.log('ERROR', `Flag ${flagName} not found`);
            return false;
        }

        await this.saveFlag(flagName, {
            ...flag,
            enabled: false,
            rollout: 0
        });

        // Update config service if this flag is linked
        if (flag.configKey && this.configReady) {
            await window.config.set(flag.configKey, false);
        }

        return true;
    }

    async toggleFlag(flagName) {
        const flag = this.flags.get(flagName);
        if (!flag) {
            this.log('ERROR', `Flag ${flagName} not found`);
            return false;
        }

        const newValue = !flag.enabled;
        await this.saveFlag(flagName, {
            ...flag,
            enabled: newValue,
            rollout: newValue ? 100 : 0
        });

        // Update config service if this flag is linked
        if (flag.configKey && this.configReady) {
            await window.config.set(flag.configKey, newValue);
        }

        return true;
    }

    // Batch operations
    async setMultipleFlags(flagUpdates) {
        const results = {};
        
        for (const [flagName, enabled] of Object.entries(flagUpdates)) {
            try {
                if (enabled) {
                    await this.enableFlag(flagName);
                } else {
                    await this.disableFlag(flagName);
                }
                results[flagName] = { success: true };
            } catch (error) {
                results[flagName] = { success: false, error: error.message };
            }
        }
        
        return results;
    }

    // Integration with config service
    async syncFlagToConfig(flagName, configKey) {
        const flag = this.flags.get(flagName);
        if (!flag || !this.configReady) return false;

        try {
            flag.configKey = configKey;
            await window.config.set(configKey, flag.enabled);
            this.log('INFO', `Flag ${flagName} synced to config key ${configKey}`);
            return true;
        } catch (error) {
            this.log('ERROR', `Failed to sync flag ${flagName} to config`, { error: error.message });
            return false;
        }
    }

    // Export/Import enhanced functionality
    exportFlags() {
        const exportData = {
            timestamp: Date.now(),
            flags: this.getAllFlags(),
            context: this.context,
            systemInfo: this.getSystemInfo(),
            history: Object.fromEntries(this.flagHistory)
        };
        
        return exportData;
    }

    async importFlags(importData, options = { overwrite: false }) {
        const results = { imported: 0, skipped: 0, errors: 0 };
        
        for (const [flagName, flagConfig] of Object.entries(importData.flags)) {
            try {
                const exists = this.flags.has(flagName);
                
                if (exists && !options.overwrite) {
                    results.skipped++;
                    continue;
                }
                
                await this.saveFlag(flagName, {
                    enabled: flagConfig.enabled,
                    rollout: flagConfig.rollout,
                    description: flagConfig.description,
                    category: flagConfig.category
                });
                
                results.imported++;
            } catch (error) {
                this.log('ERROR', `Failed to import flag ${flagName}`, { error: error.message });
                results.errors++;
            }
        }
        
        this.log('INFO', 'Flag import completed', results);
        return results;
    }
}

// Feature flag helper functions
function isFeatureEnabled(flagName) {
    return window.featureFlags ? window.featureFlags.isEnabled(flagName) : false;
}

function withFeatureFlag(flagName, enabledCallback, disabledCallback = null) {
    if (isFeatureEnabled(flagName)) {
        return enabledCallback();
    } else if (disabledCallback) {
        return disabledCallback();
    }
}

function featureGate(flagName) {
    return function(target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        
        descriptor.value = function(...args) {
            if (isFeatureEnabled(flagName)) {
                return originalMethod.apply(this, args);
            } else {
                console.log(`Feature ${flagName} is disabled, skipping ${propertyKey}`);
                return null;
            }
        };
        
        return descriptor;
    };
}

// Initialize feature flag system
window.featureFlags = new FeatureFlagSystem();

// Export global helper functions
window.isFeatureEnabled = isFeatureEnabled;
window.withFeatureFlag = withFeatureFlag;
window.featureGate = featureGate;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FeatureFlagSystem, isFeatureEnabled, withFeatureFlag, featureGate };
}