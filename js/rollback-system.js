// Emergency Rollback System for Ava Solutions PWA
// Provides safe rollback capabilities for critical situations

class RollbackSystem {
    constructor() {
        this.dbName = 'AvaRollbackDB';
        this.version = 1;
        this.db = null;
        this.isEnabled = true;
        
        // Rollback strategies
        this.strategies = {
            'data-corruption': this.rollbackDataCorruption.bind(this),
            'feature-failure': this.rollbackFeatureFailure.bind(this),
            'performance-issue': this.rollbackPerformanceIssue.bind(this),
            'security-breach': this.rollbackSecurityBreach.bind(this),
            'sync-failure': this.rollbackSyncFailure.bind(this),
            'complete-restore': this.rollbackCompleteRestore.bind(this)
        };
        
        // Emergency contacts and procedures
        this.emergencyConfig = {
            adminEmail: 'avasolutionsph@gmail.com',
            backupRetentionDays: 30,
            criticalDataStores: ['transactions', 'employees', 'products', 'inventory'],
            nonCriticalStores: ['logs', 'cache', 'temporary']
        };
        
        this.init();
    }

    async init() {
        try {
            await this.initDB();
            await this.createInitialSnapshot();
            this.setupEmergencyHandlers();
            console.log('🔄 Rollback system initialized');
            
            if (window.logger) {
                window.logger.log({
                    type: 'ROLLBACK',
                    category: 'INIT',
                    level: 'INFO',
                    message: 'Rollback system initialized',
                    data: {
                        strategies: Object.keys(this.strategies),
                        enabled: this.isEnabled
                    }
                });
            }
        } catch (error) {
            console.error('Failed to initialize rollback system:', error);
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

                // Snapshots store
                if (!db.objectStoreNames.contains('snapshots')) {
                    const snapshotStore = db.createObjectStore('snapshots', { keyPath: 'id', autoIncrement: true });
                    snapshotStore.createIndex('timestamp', 'timestamp', { unique: false });
                    snapshotStore.createIndex('type', 'type', { unique: false });
                    snapshotStore.createIndex('critical', 'critical', { unique: false });
                }

                // Rollback history store
                if (!db.objectStoreNames.contains('rollback_history')) {
                    const historyStore = db.createObjectStore('rollback_history', { keyPath: 'id', autoIncrement: true });
                    historyStore.createIndex('timestamp', 'timestamp', { unique: false });
                    historyStore.createIndex('strategy', 'strategy', { unique: false });
                    historyStore.createIndex('success', 'success', { unique: false });
                }

                // Emergency procedures store
                if (!db.objectStoreNames.contains('procedures')) {
                    const procedureStore = db.createObjectStore('procedures', { keyPath: 'name' });
                }
            };
        });
    }

    async createInitialSnapshot() {
        try {
            const existingSnapshots = await this.getSnapshots();
            
            // Only create initial snapshot if none exist
            if (existingSnapshots.length === 0) {
                await this.createSnapshot('initial', 'Initial system snapshot', true);
                console.log('📸 Initial system snapshot created');
            }
        } catch (error) {
            console.error('Failed to create initial snapshot:', error);
        }
    }

    async createSnapshot(type = 'manual', description = 'Manual snapshot', critical = false) {
        const startTime = performance.now();
        console.log(`📸 Creating ${type} snapshot...`);

        try {
            // Collect current system state
            const systemState = await this.collectSystemState();
            
            const snapshot = {
                timestamp: Date.now(),
                date: new Date().toISOString(),
                type: type,
                description: description,
                critical: critical,
                version: this.getAppVersion(),
                systemState: systemState,
                metadata: {
                    userAgent: navigator.userAgent,
                    url: window.location.href,
                    userId: this.getCurrentUserId(),
                    performanceProfile: window.performanceProfile || 'unknown',
                    featureFlags: this.getActiveFeatureFlags()
                }
            };

            // Store snapshot
            const snapshotId = await this.storeSnapshot(snapshot);
            
            // Cleanup old non-critical snapshots
            await this.cleanupOldSnapshots();

            const duration = performance.now() - startTime;
            console.log(`✅ Snapshot created in ${duration.toFixed(0)}ms (ID: ${snapshotId})`);

            if (window.logger) {
                window.logger.log({
                    type: 'ROLLBACK',
                    category: 'SNAPSHOT',
                    level: 'INFO',
                    message: `System snapshot created: ${type}`,
                    data: {
                        snapshotId,
                        type,
                        critical,
                        duration,
                        dataSize: JSON.stringify(systemState).length
                    }
                });
            }

            return snapshotId;
        } catch (error) {
            console.error('❌ Snapshot creation failed:', error);
            throw error;
        }
    }

    async collectSystemState() {
        const state = {
            database: {},
            localStorage: {},
            settings: {},
            userPreferences: {},
            businessConfig: {}
        };

        try {
            // Collect database state
            if (window.database && window.database.db) {
                const db = window.database.db;
                const storeNames = Array.from(db.objectStoreNames);

                for (const storeName of storeNames) {
                    try {
                        const data = await window.database.getAll(storeName);
                        state.database[storeName] = data || [];
                    } catch (error) {
                        console.warn(`Failed to backup store ${storeName}:`, error);
                        state.database[storeName] = null;
                    }
                }
            }

            // Collect localStorage state
            state.localStorage = this.exportLocalStorage();

            // Collect app settings
            if (window.database) {
                try {
                    state.settings = await window.database.get('settings', 'appSettings') || {};
                    state.userPreferences = await window.database.get('settings', 'userPreferences') || {};
                    state.businessConfig = await window.database.get('settings', 'businessConfig') || {};
                } catch (error) {
                    console.warn('Failed to collect settings:', error);
                }
            }

            // Collect feature flag state
            if (window.featureFlags) {
                state.featureFlags = window.featureFlags.getAllFlags();
            }

            // Collect performance metrics
            if (performance.memory) {
                state.performance = {
                    memory: {
                        used: performance.memory.usedJSHeapSize,
                        total: performance.memory.totalJSHeapSize,
                        limit: performance.memory.jsHeapSizeLimit
                    },
                    timing: performance.timing
                };
            }

        } catch (error) {
            console.error('Error collecting system state:', error);
        }

        return state;
    }

    exportLocalStorage() {
        const data = {};
        const criticalKeys = [
            'userToken', 'currentUser', 'businessName', 'businessConfig',
            'lastSync', 'perfMode', 'ava_logging_enabled', 'ava_backup_enabled'
        ];

        for (const key of criticalKeys) {
            const value = localStorage.getItem(key);
            if (value !== null) {
                data[key] = value;
            }
        }

        return data;
    }

    async storeSnapshot(snapshot) {
        if (!this.db) throw new Error('Rollback database not available');

        const transaction = this.db.transaction(['snapshots'], 'readwrite');
        const store = transaction.objectStore('snapshots');
        
        return new Promise((resolve, reject) => {
            const request = store.add(snapshot);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getSnapshots() {
        if (!this.db) return [];

        const transaction = this.db.transaction(['snapshots'], 'readonly');
        const store = transaction.objectStore('snapshots');
        const index = store.index('timestamp');
        
        return new Promise((resolve, reject) => {
            const snapshots = [];
            const request = index.openCursor(null, 'prev'); // Newest first
            
            request.onsuccess = () => {
                const cursor = request.result;
                if (cursor) {
                    snapshots.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(snapshots);
                }
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    async cleanupOldSnapshots() {
        try {
            const snapshots = await this.getSnapshots();
            const cutoffDate = Date.now() - (this.emergencyConfig.backupRetentionDays * 24 * 60 * 60 * 1000);
            
            const oldSnapshots = snapshots.filter(snapshot => 
                !snapshot.critical && snapshot.timestamp < cutoffDate
            );

            for (const snapshot of oldSnapshots) {
                await this.deleteSnapshot(snapshot.id);
            }

            if (oldSnapshots.length > 0) {
                console.log(`🧹 Cleaned up ${oldSnapshots.length} old snapshots`);
            }
        } catch (error) {
            console.error('Snapshot cleanup failed:', error);
        }
    }

    async deleteSnapshot(snapshotId) {
        if (!this.db) return;

        const transaction = this.db.transaction(['snapshots'], 'readwrite');
        const store = transaction.objectStore('snapshots');
        
        return new Promise((resolve, reject) => {
            const request = store.delete(snapshotId);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Emergency rollback strategies

    async rollbackDataCorruption(options = {}) {
        console.warn('🚨 EMERGENCY: Rolling back data corruption...');
        
        try {
            // Find the latest stable snapshot
            const snapshots = await this.getSnapshots();
            const stableSnapshot = snapshots.find(s => 
                s.critical || s.type === 'stable' || s.type === 'initial'
            );

            if (!stableSnapshot) {
                throw new Error('No stable snapshot found for rollback');
            }

            // Create emergency snapshot before rollback
            await this.createSnapshot('pre_rollback', 'Emergency snapshot before data corruption rollback', true);

            // Disable all feature flags as safety measure
            if (window.featureFlags) {
                await window.featureFlags.emergencyDisableAll();
            }

            // Restore critical data stores only
            await this.restoreFromSnapshot(stableSnapshot.id, {
                storesOnly: this.emergencyConfig.criticalDataStores,
                clearExisting: true,
                skipValidation: false
            });

            // Clear cache and temporary data
            await this.clearNonCriticalData();

            await this.logRollback('data-corruption', stableSnapshot.id, true);
            
            console.log('✅ Data corruption rollback completed');
            return { success: true, snapshotId: stableSnapshot.id };

        } catch (error) {
            console.error('❌ Data corruption rollback failed:', error);
            await this.logRollback('data-corruption', null, false, error.message);
            throw error;
        }
    }

    async rollbackFeatureFailure(featureName, options = {}) {
        console.warn(`🚨 EMERGENCY: Rolling back feature failure for ${featureName}...`);
        
        try {
            // Disable the problematic feature
            if (window.featureFlags) {
                await window.featureFlags.disableFlag(featureName);
                console.log(`🚩 Disabled feature flag: ${featureName}`);
            }

            // Find snapshot from before feature was enabled
            const snapshots = await this.getSnapshots();
            const preFeatureSnapshot = snapshots.find(s => {
                const flags = s.metadata?.featureFlags || {};
                return !flags[featureName] || !flags[featureName].enabled;
            });

            if (preFeatureSnapshot) {
                // Restore specific components affected by the feature
                await this.restoreFromSnapshot(preFeatureSnapshot.id, {
                    selectiveRestore: true,
                    excludeUserData: true
                });
            }

            // Clear service worker cache
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration) {
                    await registration.unregister();
                    console.log('🔄 Service worker unregistered');
                }
            }

            await this.logRollback('feature-failure', preFeatureSnapshot?.id, true, `Feature: ${featureName}`);
            
            console.log(`✅ Feature failure rollback completed for ${featureName}`);
            return { success: true, feature: featureName };

        } catch (error) {
            console.error(`❌ Feature failure rollback failed for ${featureName}:`, error);
            await this.logRollback('feature-failure', null, false, error.message);
            throw error;
        }
    }

    async rollbackPerformanceIssue(options = {}) {
        console.warn('🚨 EMERGENCY: Rolling back performance issue...');
        
        try {
            // Switch to low performance mode
            localStorage.setItem('perfMode', 'low');
            if (window.app && typeof window.app.applyPerformanceTuning === 'function') {
                window.app.applyPerformanceTuning();
            }

            // Disable non-essential features
            if (window.featureFlags) {
                const nonEssentialFeatures = [
                    'advanced-analytics', 'ai-recommendations', 
                    'real-time-collaboration', 'voice-commands'
                ];
                
                for (const feature of nonEssentialFeatures) {
                    await window.featureFlags.disableFlag(feature);
                }
            }

            // Clear caches
            await this.clearCaches();

            // Reduce logging verbosity
            if (window.logger) {
                window.logger.setEnabled(false);
            }

            await this.logRollback('performance-issue', null, true);
            
            console.log('✅ Performance issue rollback completed');
            return { success: true };

        } catch (error) {
            console.error('❌ Performance issue rollback failed:', error);
            await this.logRollback('performance-issue', null, false, error.message);
            throw error;
        }
    }

    async rollbackSecurityBreach(options = {}) {
        console.warn('🚨 EMERGENCY: Rolling back due to security breach...');
        
        try {
            // Immediately clear all auth tokens
            localStorage.removeItem('userToken');
            localStorage.removeItem('currentUser');
            sessionStorage.clear();

            // Activate all kill switches
            if (window.featureFlags) {
                await window.featureFlags.activateKillSwitch('external-apis');
                await window.featureFlags.activateKillSwitch('cloud-sync');
                await window.featureFlags.activateKillSwitch('auto-updates');
            }

            // Disable all network requests
            this.disableNetworkRequests();

            // Create emergency audit log
            await this.createEmergencyAuditLog('security-breach', options);

            // Find the most recent secure snapshot
            const snapshots = await this.getSnapshots();
            const secureSnapshot = snapshots.find(s => s.critical && s.type !== 'emergency');

            if (secureSnapshot) {
                await this.restoreFromSnapshot(secureSnapshot.id, {
                    clearExisting: true,
                    authRequired: false
                });
            }

            await this.logRollback('security-breach', secureSnapshot?.id, true);
            
            console.log('✅ Security breach rollback completed');
            alert('SECURITY ALERT: System has been secured. Please contact administrator.');
            
            return { success: true, requiresReauth: true };

        } catch (error) {
            console.error('❌ Security breach rollback failed:', error);
            await this.logRollback('security-breach', null, false, error.message);
            throw error;
        }
    }

    async rollbackSyncFailure(options = {}) {
        console.warn('🚨 EMERGENCY: Rolling back sync failure...');
        
        try {
            // Disable cloud sync
            if (window.featureFlags) {
                await window.featureFlags.activateKillSwitch('cloud-sync');
            }

            // Switch to offline-only mode
            localStorage.setItem('forceOfflineMode', 'true');

            // Find snapshot before sync issues started
            const snapshots = await this.getSnapshots();
            const preSyncSnapshot = snapshots.find(s => 
                s.type === 'pre_sync' || s.type === 'stable'
            );

            if (preSyncSnapshot) {
                // Restore to local-only state
                await this.restoreFromSnapshot(preSyncSnapshot.id, {
                    localOnly: true,
                    preserveOfflineChanges: true
                });
            }

            // Clear sync metadata
            if (window.database) {
                try {
                    await window.database.delete('settings', 'lastSync');
                    await window.database.delete('settings', 'syncMetadata');
                } catch (error) {
                    console.warn('Failed to clear sync metadata:', error);
                }
            }

            await this.logRollback('sync-failure', preSyncSnapshot?.id, true);
            
            console.log('✅ Sync failure rollback completed - system now offline-only');
            return { success: true, offlineOnly: true };

        } catch (error) {
            console.error('❌ Sync failure rollback failed:', error);
            await this.logRollback('sync-failure', null, false, error.message);
            throw error;
        }
    }

    async rollbackCompleteRestore(snapshotId, options = {}) {
        console.warn('🚨 EMERGENCY: Performing complete system restore...');
        
        try {
            if (!snapshotId) {
                // Find the most recent critical snapshot
                const snapshots = await this.getSnapshots();
                const criticalSnapshot = snapshots.find(s => s.critical);
                
                if (!criticalSnapshot) {
                    throw new Error('No critical snapshot available for complete restore');
                }
                
                snapshotId = criticalSnapshot.id;
            }

            // Create emergency backup of current state
            await this.createSnapshot('emergency_backup', 'Emergency backup before complete restore', true);

            // Disable all systems
            if (window.featureFlags) {
                await window.featureFlags.emergencyDisableAll();
            }

            // Restore everything
            await this.restoreFromSnapshot(snapshotId, {
                completeRestore: true,
                clearExisting: true,
                restoreFeatureFlags: true,
                restoreSettings: true
            });

            await this.logRollback('complete-restore', snapshotId, true);
            
            console.log('✅ Complete system restore completed');
            alert('System has been completely restored. Page will reload.');
            
            // Force page reload after restore
            setTimeout(() => window.location.reload(), 2000);
            
            return { success: true, snapshotId, requiresReload: true };

        } catch (error) {
            console.error('❌ Complete restore failed:', error);
            await this.logRollback('complete-restore', snapshotId, false, error.message);
            throw error;
        }
    }

    async restoreFromSnapshot(snapshotId, options = {}) {
        console.log(`🔄 Restoring from snapshot ${snapshotId}...`);
        
        try {
            const snapshot = await this.getSnapshot(snapshotId);
            if (!snapshot) {
                throw new Error('Snapshot not found');
            }

            const systemState = snapshot.systemState;

            // Restore database
            if (systemState.database && !options.skipDatabase) {
                await this.restoreDatabase(systemState.database, options);
            }

            // Restore localStorage
            if (systemState.localStorage && options.restoreSettings) {
                this.restoreLocalStorage(systemState.localStorage);
            }

            // Restore feature flags
            if (systemState.featureFlags && options.restoreFeatureFlags && window.featureFlags) {
                await this.restoreFeatureFlags(systemState.featureFlags);
            }

            console.log(`✅ Restore from snapshot ${snapshotId} completed`);
            
        } catch (error) {
            console.error(`❌ Restore from snapshot ${snapshotId} failed:`, error);
            throw error;
        }
    }

    async getSnapshot(snapshotId) {
        if (!this.db) return null;

        const transaction = this.db.transaction(['snapshots'], 'readonly');
        const store = transaction.objectStore('snapshots');
        
        return new Promise((resolve, reject) => {
            const request = store.get(snapshotId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async restoreDatabase(databaseState, options = {}) {
        if (!window.database || !window.database.db) return;

        const storesToRestore = options.storesOnly || Object.keys(databaseState);
        
        for (const storeName of storesToRestore) {
            try {
                if (!databaseState[storeName]) continue;

                console.log(`🔄 Restoring ${storeName}...`);
                
                // Clear existing data if requested
                if (options.clearExisting) {
                    await this.clearStore(storeName);
                }

                // Restore data
                const records = databaseState[storeName];
                if (Array.isArray(records)) {
                    for (const record of records) {
                        try {
                            await window.database.add(storeName, record);
                        } catch (error) {
                            // Handle duplicates or validation errors
                            if (!error.message.includes('already exists')) {
                                console.warn(`Failed to restore record in ${storeName}:`, error);
                            }
                        }
                    }
                }

                console.log(`✅ Restored ${records.length} records to ${storeName}`);

            } catch (error) {
                console.error(`Failed to restore ${storeName}:`, error);
                if (options.stopOnError) {
                    throw error;
                }
            }
        }
    }

    async clearStore(storeName) {
        if (!window.database || !window.database.db) return;

        try {
            const transaction = window.database.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            await new Promise((resolve, reject) => {
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.warn(`Failed to clear store ${storeName}:`, error);
        }
    }

    restoreLocalStorage(localStorageState) {
        for (const [key, value] of Object.entries(localStorageState)) {
            try {
                localStorage.setItem(key, value);
            } catch (error) {
                console.warn(`Failed to restore localStorage key ${key}:`, error);
            }
        }
    }

    async restoreFeatureFlags(featureFlagsState) {
        if (!window.featureFlags) return;

        for (const [flagName, config] of Object.entries(featureFlagsState)) {
            try {
                await window.featureFlags.saveFlag(flagName, {
                    enabled: config.enabled,
                    rollout: config.rollout,
                    description: config.description
                });
            } catch (error) {
                console.warn(`Failed to restore feature flag ${flagName}:`, error);
            }
        }
    }

    // Emergency utilities

    async clearNonCriticalData() {
        try {
            for (const storeName of this.emergencyConfig.nonCriticalStores) {
                await this.clearStore(storeName);
            }
            console.log('🧹 Non-critical data cleared');
        } catch (error) {
            console.warn('Failed to clear non-critical data:', error);
        }
    }

    async clearCaches() {
        try {
            // Clear browser caches
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
                console.log('🧹 Browser caches cleared');
            }

            // Clear IndexedDB caches
            if (window.database) {
                await this.clearStore('cache');
                await this.clearStore('temporary');
            }
        } catch (error) {
            console.warn('Failed to clear caches:', error);
        }
    }

    disableNetworkRequests() {
        // Override fetch to prevent network requests
        const originalFetch = window.fetch;
        window.fetch = () => Promise.reject(new Error('Network requests disabled for security'));
        
        // Store original for potential restoration
        window._originalFetch = originalFetch;
        
        console.log('🔒 Network requests disabled');
    }

    async createEmergencyAuditLog(event, details = {}) {
        const auditEntry = {
            timestamp: Date.now(),
            date: new Date().toISOString(),
            event: event,
            details: details,
            userAgent: navigator.userAgent,
            url: window.location.href,
            userId: this.getCurrentUserId(),
            severity: 'CRITICAL'
        };

        // Store in multiple places for redundancy
        try {
            localStorage.setItem('emergency_audit_log', JSON.stringify(auditEntry));
            
            if (window.logger) {
                await window.logger.log({
                    type: 'SECURITY',
                    category: 'EMERGENCY',
                    level: 'CRITICAL',
                    message: `Emergency audit log: ${event}`,
                    data: auditEntry
                });
            }
        } catch (error) {
            console.error('Failed to create emergency audit log:', error);
        }
    }

    async logRollback(strategy, snapshotId, success, error = null) {
        if (!this.db) return;

        try {
            const logEntry = {
                timestamp: Date.now(),
                date: new Date().toISOString(),
                strategy: strategy,
                snapshotId: snapshotId,
                success: success,
                error: error,
                userId: this.getCurrentUserId(),
                userAgent: navigator.userAgent
            };

            const transaction = this.db.transaction(['rollback_history'], 'readwrite');
            const store = transaction.objectStore('rollback_history');
            
            await new Promise((resolve, reject) => {
                const request = store.add(logEntry);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });

            if (window.logger) {
                await window.logger.log({
                    type: 'ROLLBACK',
                    category: 'EXECUTION',
                    level: success ? 'WARN' : 'ERROR',
                    message: `Rollback ${strategy}: ${success ? 'SUCCESS' : 'FAILED'}`,
                    data: logEntry
                });
            }
        } catch (logError) {
            console.error('Failed to log rollback:', logError);
        }
    }

    // Setup emergency event handlers
    setupEmergencyHandlers() {
        // Global error handler
        window.addEventListener('error', (event) => {
            this.handleCriticalError(event.error);
        });

        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleCriticalError(new Error(event.reason));
        });

        // Page visibility change (potential security concern)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.createSnapshot('visibility_change', 'Snapshot before page hidden', false);
            }
        });

        // Browser back/forward (potential data loss)
        window.addEventListener('beforeunload', () => {
            this.createSnapshot('before_unload', 'Emergency snapshot before page unload', true);
        });
    }

    async handleCriticalError(error) {
        // Check if this is a critical error that requires rollback
        const criticalErrors = [
            'SecurityError', 'QuotaExceededError', 'DataError',
            'ConstraintError', 'TransactionInactiveError'
        ];

        const isCritical = criticalErrors.some(errorType => 
            error.name === errorType || error.message.includes(errorType)
        );

        if (isCritical) {
            console.error('🚨 Critical error detected:', error);
            
            try {
                if (error.name === 'QuotaExceededError') {
                    await this.rollbackPerformanceIssue();
                } else if (error.name === 'DataError' || error.name === 'ConstraintError') {
                    await this.rollbackDataCorruption();
                } else if (error.name === 'SecurityError') {
                    await this.rollbackSecurityBreach();
                }
            } catch (rollbackError) {
                console.error('❌ Emergency rollback failed:', rollbackError);
            }
        }
    }

    // Utility methods
    getCurrentUserId() {
        try {
            const userStr = localStorage.getItem('currentUser');
            if (userStr) {
                const user = JSON.parse(userStr);
                return user.id || user.email || 'unknown';
            }
            return 'anonymous';
        } catch (error) {
            return 'unknown';
        }
    }

    getAppVersion() {
        return '1.0.0'; // Could be dynamic
    }

    getActiveFeatureFlags() {
        try {
            return window.featureFlags ? window.featureFlags.getEnabledFlags() : [];
        } catch (error) {
            return [];
        }
    }

    // Public API methods
    async executeEmergencyRollback(strategy, options = {}) {
        if (!this.strategies[strategy]) {
            throw new Error(`Unknown rollback strategy: ${strategy}`);
        }

        console.warn(`🚨 Executing emergency rollback: ${strategy}`);
        
        try {
            const result = await this.strategies[strategy](options);
            console.log(`✅ Emergency rollback ${strategy} completed successfully`);
            return result;
        } catch (error) {
            console.error(`❌ Emergency rollback ${strategy} failed:`, error);
            throw error;
        }
    }

    async getAvailableStrategies() {
        return Object.keys(this.strategies).map(strategy => ({
            name: strategy,
            description: this.getStrategyDescription(strategy)
        }));
    }

    getStrategyDescription(strategy) {
        const descriptions = {
            'data-corruption': 'Restore from latest stable snapshot, clear corrupted data',
            'feature-failure': 'Disable problematic feature, restore previous state',
            'performance-issue': 'Switch to low performance mode, disable non-essential features',
            'security-breach': 'Clear auth tokens, activate kill switches, secure system',
            'sync-failure': 'Switch to offline-only mode, restore local state',
            'complete-restore': 'Full system restore from critical snapshot'
        };
        
        return descriptions[strategy] || 'No description available';
    }

    async getRollbackHistory() {
        if (!this.db) return [];

        try {
            const transaction = this.db.transaction(['rollback_history'], 'readonly');
            const store = transaction.objectStore('rollback_history');
            const index = store.index('timestamp');
            
            return new Promise((resolve, reject) => {
                const history = [];
                const request = index.openCursor(null, 'prev');
                
                request.onsuccess = () => {
                    const cursor = request.result;
                    if (cursor) {
                        history.push(cursor.value);
                        cursor.continue();
                    } else {
                        resolve(history);
                    }
                };
                
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Failed to get rollback history:', error);
            return [];
        }
    }
}

// Emergency functions for global access
window.emergencyRollback = async function(strategy, options = {}) {
    if (window.rollbackSystem) {
        return await window.rollbackSystem.executeEmergencyRollback(strategy, options);
    } else {
        throw new Error('Rollback system not available');
    }
};

window.createEmergencySnapshot = async function(description = 'Manual emergency snapshot') {
    if (window.rollbackSystem) {
        return await window.rollbackSystem.createSnapshot('emergency', description, true);
    } else {
        throw new Error('Rollback system not available');
    }
};

// Initialize rollback system
window.rollbackSystem = new RollbackSystem();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RollbackSystem;
}