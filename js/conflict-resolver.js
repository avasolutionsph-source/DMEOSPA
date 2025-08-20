// Conflict Resolver
// This file consolidates and removes duplicate functionality
// to prevent conflicts with the new architecture

(function() {
    console.log('🔧 Resolving function conflicts...');
    
    // Track which handlers have been registered to prevent duplicates
    const registeredHandlers = {
        online: [],
        offline: [],
        storage: []
    };
    
    // Override addEventListener to prevent duplicate handlers
    const originalAddEventListener = window.addEventListener;
    window.addEventListener = function(event, handler, options) {
        // Check for duplicate online/offline handlers
        if (event === 'online' || event === 'offline') {
            const handlerString = handler.toString();
            
            // Skip if this exact handler is already registered
            if (registeredHandlers[event].includes(handlerString)) {
                console.log(`⚠️ Skipped duplicate ${event} handler`);
                return;
            }
            
            registeredHandlers[event].push(handlerString);
        }
        
        // Call original addEventListener
        return originalAddEventListener.call(this, event, handler, options);
    };
    
    // Consolidate sync managers
    if (window.syncManager && window.CloudSyncManager) {
        console.log('🔄 Multiple sync managers detected, consolidating...');
        
        // Create unified sync interface
        const originalSyncManager = window.syncManager;
        const cloudSync = window.cloudSync;
        
        window.syncManager = {
            ...originalSyncManager,
            
            // Unified sync method
            async startSync() {
                console.log('🔄 Starting unified sync...');
                
                // Emit event using new event bus
                if (window.eventBus) {
                    window.eventBus.emit('sync:start');
                }
                
                try {
                    // Use original sync if available
                    if (originalSyncManager && originalSyncManager.syncAll) {
                        await originalSyncManager.syncAll();
                    }
                    
                    // Also trigger cloud sync if available
                    if (cloudSync && cloudSync.syncToCloud) {
                        await cloudSync.syncToCloud();
                    }
                    
                    if (window.eventBus) {
                        window.eventBus.emit('sync:complete');
                    }
                } catch (error) {
                    console.error('Sync error:', error);
                    if (window.eventBus) {
                        window.eventBus.emit('sync:error', error);
                    }
                }
            },
            
            // Keep other methods
            syncInProgress: false,
            showNotification: originalSyncManager.showNotification || window.showNotification
        };
    }
    
    // Consolidate API methods
    const apiMethods = [];
    
    // Check for duplicate API implementations
    ['apiClient', 'apiManager', 'api', 'APIClient'].forEach(name => {
        if (window[name]) {
            apiMethods.push(name);
        }
    });
    
    if (apiMethods.length > 1) {
        console.log('🌐 Multiple API clients detected:', apiMethods);
        
        // Use the first available as primary
        const primaryAPI = window[apiMethods[0]];
        
        // Create unified API interface
        window.apiClient = window.apiClient || {
            async get(url, options) {
                return primaryAPI.get ? 
                    await primaryAPI.get(url, options) : 
                    await fetch(url, { ...options, method: 'GET' });
            },
            
            async post(url, data, options) {
                return primaryAPI.post ? 
                    await primaryAPI.post(url, data, options) : 
                    await fetch(url, {
                        ...options,
                        method: 'POST',
                        body: JSON.stringify(data),
                        headers: {
                            'Content-Type': 'application/json',
                            ...options?.headers
                        }
                    });
            },
            
            async put(url, data, options) {
                return primaryAPI.put ? 
                    await primaryAPI.put(url, data, options) : 
                    await fetch(url, {
                        ...options,
                        method: 'PUT',
                        body: JSON.stringify(data),
                        headers: {
                            'Content-Type': 'application/json',
                            ...options?.headers
                        }
                    });
            },
            
            async delete(url, options) {
                return primaryAPI.delete ? 
                    await primaryAPI.delete(url, options) : 
                    await fetch(url, { ...options, method: 'DELETE' });
            }
        };
    }
    
    // Remove old auth system references
    const oldAuthSystems = [
        'permanentAuth',
        'universalLogin',
        'simpleAuth',
        'oldAuthSystem'
    ];
    
    oldAuthSystems.forEach(authName => {
        if (window[authName] && authName !== 'unifiedAuth') {
            console.log(`🚫 Disabling old auth system: ${authName}`);
            delete window[authName];
        }
    });
    
    // Consolidate notification systems
    if (!window.showNotification && window.app && window.app.showNotification) {
        window.showNotification = window.app.showNotification.bind(window.app);
    }
    
    // Prevent multiple database initializations
    let dbInitialized = false;
    const originalInitDB = window.initDB;
    
    if (originalInitDB) {
        window.initDB = async function() {
            if (dbInitialized) {
                console.log('⚠️ Database already initialized, skipping...');
                return window.db;
            }
            
            dbInitialized = true;
            return await originalInitDB.apply(this, arguments);
        };
    }
    
    // Clean up duplicate event emitters
    const eventEmitters = [];
    ['eventBus', 'eventEmitter', 'events', 'EventBus'].forEach(name => {
        if (window[name] && typeof window[name].emit === 'function') {
            eventEmitters.push(name);
        }
    });
    
    if (eventEmitters.length > 1) {
        console.log('📡 Multiple event emitters detected:', eventEmitters);
        
        // Use our new eventBus as primary
        const primaryEmitter = window.eventBus || window[eventEmitters[0]];
        
        // Redirect all others to primary
        eventEmitters.forEach(name => {
            if (name !== 'eventBus' && window[name]) {
                window[name] = primaryEmitter;
            }
        });
    }
    
    // Clean up localStorage conflicts
    const cleanupStorage = () => {
        const authKeys = [
            'userToken', 'userData', 'isLoggedIn',
            'authToken', 'currentUser',
            'universal_token', 'universal_user',
            'simple_token', 'simple_user'
        ];
        
        // Keep only unified auth keys
        const unifiedToken = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
        const unifiedUser = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
        
        if (unifiedToken && unifiedUser) {
            // Remove old auth keys
            authKeys.forEach(key => {
                localStorage.removeItem(key);
                sessionStorage.removeItem(key);
            });
            console.log('✅ Cleaned up old auth storage keys');
        }
    };
    
    // Run cleanup after a delay to ensure auth is loaded
    setTimeout(cleanupStorage, 2000);
    
    // Prevent duplicate service worker registrations
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
            if (registrations.length > 1) {
                console.log('⚠️ Multiple service workers detected, keeping only one...');
                
                // Keep the first one, unregister others
                for (let i = 1; i < registrations.length; i++) {
                    registrations[i].unregister();
                }
            }
        });
    }
    
    console.log('✅ Conflict resolution complete');
    
    // Report status
    setTimeout(() => {
        console.log('📊 System Status:', {
            auth: window.unifiedAuth ? 'unified' : 'missing',
            sync: window.syncManager ? 'consolidated' : 'missing',
            api: window.apiClient ? 'unified' : 'missing',
            events: window.eventBus ? 'centralized' : 'missing',
            config: window.appConfig ? 'managed' : 'missing'
        });
    }, 3000);
})();

// Export for debugging
window.conflictResolver = {
    checkDuplicates() {
        const report = {
            auth: [],
            sync: [],
            api: [],
            events: []
        };
        
        // Check auth systems
        ['authSystem', 'unifiedAuth', 'permanentAuth', 'universalLogin'].forEach(name => {
            if (window[name]) report.auth.push(name);
        });
        
        // Check sync systems
        ['syncManager', 'cloudSync', 'CloudSyncManager'].forEach(name => {
            if (window[name]) report.sync.push(name);
        });
        
        // Check API systems
        ['apiClient', 'apiManager', 'api', 'APIClient'].forEach(name => {
            if (window[name]) report.api.push(name);
        });
        
        // Check event systems
        ['eventBus', 'eventEmitter', 'events', 'EventBus'].forEach(name => {
            if (window[name]) report.events.push(name);
        });
        
        return report;
    },
    
    cleanup() {
        // Force cleanup of all duplicates
        this.checkDuplicates();
        console.log('🧹 Forcing cleanup of duplicate systems...');
    }
};