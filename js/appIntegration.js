// App Integration Layer
// Connects new architecture improvements with existing code
// Load this AFTER your existing scripts to enhance functionality

(function() {
    console.log('🚀 Initializing App Architecture Enhancements...');

    // Check if core systems are loaded
    const waitForCore = setInterval(() => {
        if (window.db && window.app) {
            clearInterval(waitForCore);
            initializeEnhancements();
        }
    }, 100);

    function initializeEnhancements() {
        // 1. Enhance Settings Manager with new config
        if (window.settingsManager && window.appConfig) {
            const originalPublishCatalog = window.settingsManager.publishCatalog;
            window.settingsManager.publishCatalog = async function() {
                // Use new config for API URL
                const apiUrl = window.appConfig.getApiUrl('pwa');
                console.log('📤 Using configured API:', apiUrl);
                
                // Call original method with enhanced error handling
                try {
                    const result = await originalPublishCatalog.call(this);
                    
                    // Emit event for real-time updates
                    if (window.eventBus) {
                        window.eventBus.emit(window.Events.CATALOG_PUBLISHED, result);
                    }
                    
                    return result;
                } catch (error) {
                    console.error('Publish failed:', error);
                    if (window.eventBus) {
                        window.eventBus.emit(window.Events.SYNC_ERROR, { type: 'catalog', error });
                    }
                    throw error;
                }
            };
        }

        // 2. Enhance Bookings Manager with repository pattern
        if (window.bookingsManager && window.businessRepository) {
            window.bookingsManager.loadBusinessCatalog = async function(businessId) {
                try {
                    const result = await window.businessRepository.getBusinessCatalog(businessId);
                    if (result.success) {
                        return result.data;
                    }
                    throw new Error(result.error);
                } catch (error) {
                    console.error('Failed to load catalog:', error);
                    // Fallback to original method if exists
                    return { services: [], employees: [] };
                }
            };
        }

        // 3. Enhance Sync Manager with event system
        if (window.syncManager && window.eventBus) {
            const originalSync = window.syncManager.startSync;
            window.syncManager.startSync = async function() {
                window.eventBus.emit(window.Events.SYNC_START);
                
                try {
                    const result = await originalSync.call(this);
                    window.eventBus.emit(window.Events.SYNC_COMPLETE, result);
                    return result;
                } catch (error) {
                    window.eventBus.emit(window.Events.SYNC_ERROR, error);
                    throw error;
                }
            };
        }

        // 4. Enhance Auth System with events
        if (window.authSystem && window.eventBus) {
            const originalLogin = window.authSystem.handleLogin;
            window.authSystem.handleLogin = async function() {
                const result = await originalLogin.call(this);
                if (result && this.isLoggedIn) {
                    window.eventBus.emit(window.Events.AUTH_LOGIN, this.currentUser);
                }
                return result;
            };

            const originalLogout = window.authSystem.logout;
            window.authSystem.logout = async function() {
                const result = await originalLogout.call(this);
                window.eventBus.emit(window.Events.AUTH_LOGOUT);
                return result;
            };
        }

        // 5. Add global error handler with event system
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            if (window.eventBus) {
                window.eventBus.emit('app:error', {
                    message: event.message,
                    source: event.filename,
                    line: event.lineno,
                    error: event.error
                });
            }
        });

        // 6. Add network status monitoring
        if (window.eventBus) {
            let isOnline = navigator.onLine;
            
            window.addEventListener('online', () => {
                if (!isOnline) {
                    isOnline = true;
                    console.log('📡 Back online');
                    window.eventBus.emit(window.Events.ONLINE);
                    
                    // Trigger sync
                    if (window.syncManager) {
                        window.syncManager.startSync();
                    }
                }
            });

            window.addEventListener('offline', () => {
                if (isOnline) {
                    isOnline = false;
                    console.log('📴 Gone offline');
                    window.eventBus.emit(window.Events.OFFLINE);
                    
                    // Show notification
                    if (window.showNotification) {
                        window.showNotification(window.Constants.ERROR_MESSAGES.OFFLINE, 'warning');
                    }
                }
            });
        }

        // 7. Add performance monitoring
        if (window.appConfig && window.appConfig.isDebug()) {
            // Log performance metrics
            window.addEventListener('load', () => {
                const perfData = performance.getEntriesByType('navigation')[0];
                console.log('⚡ Performance Metrics:', {
                    domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
                    loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
                    totalTime: perfData.loadEventEnd - perfData.fetchStart
                });
            });
        }

        // 8. Set up event listeners for UI updates
        if (window.eventBus) {
            // Update UI when catalog is published
            window.eventBus.on(window.Events.CATALOG_PUBLISHED, (data) => {
                if (window.showNotification) {
                    window.showNotification(
                        `✅ Published ${data.products || 0} services and ${data.employees || 0} employees!`,
                        'success'
                    );
                }
            });

            // Update UI when sync completes
            window.eventBus.on(window.Events.SYNC_COMPLETE, (data) => {
                console.log('✅ Sync complete:', data);
                // Refresh UI components if needed
                if (window.app && window.app.refreshData) {
                    window.app.refreshData();
                }
            });

            // Handle auth events
            window.eventBus.on(window.Events.AUTH_LOGIN, (user) => {
                console.log('👤 User logged in:', user.email);
                // Load user-specific data
                if (window.dataService) {
                    window.dataService.clearCache();
                }
            });

            window.eventBus.on(window.Events.AUTH_LOGOUT, () => {
                console.log('👋 User logged out');
                // Clear sensitive data
                if (window.dataService) {
                    window.dataService.clearCache();
                }
            });
        }

        // 9. Add helper functions to window for easy access
        window.appHelpers = {
            // Get business catalog using repository
            getBusinessCatalog: async (businessId) => {
                if (window.businessRepository) {
                    return await window.businessRepository.getBusinessCatalog(businessId);
                }
                return null;
            },

            // Publish catalog with enhanced features
            publishCatalog: async (services, employees) => {
                if (window.dataService) {
                    return await window.dataService.publishCatalog(services, employees);
                }
                return null;
            },

            // Get app configuration
            getConfig: (path) => {
                if (window.appConfig) {
                    return window.appConfig.get(path);
                }
                return null;
            },

            // Emit custom event
            emit: (event, data) => {
                if (window.eventBus) {
                    window.eventBus.emit(event, data);
                }
            },

            // Subscribe to event
            on: (event, callback) => {
                if (window.eventBus) {
                    return window.eventBus.on(event, callback);
                }
                return () => {};
            }
        };

        console.log('✅ App Architecture Enhancements Loaded Successfully!');
        console.log('📚 Available Systems:', {
            config: !!window.appConfig,
            dataService: !!window.dataService,
            businessRepository: !!window.businessRepository,
            eventBus: !!window.eventBus,
            constants: !!window.Constants
        });

        // Emit app ready event
        if (window.eventBus) {
            window.eventBus.emit('app:enhanced', {
                timestamp: Date.now(),
                systems: {
                    config: !!window.appConfig,
                    dataService: !!window.dataService,
                    businessRepository: !!window.businessRepository,
                    eventBus: !!window.eventBus,
                    constants: !!window.Constants
                }
            });
        }
    }
})();