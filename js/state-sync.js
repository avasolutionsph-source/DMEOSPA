// State Synchronization Module
// Connects StateManager to unified backend via WebSocket for real-time multi-device sync

(function() {
    'use strict';
    
    class StateSync {
        constructor() {
            this.socket = null;
            this.syncEnabled = false;
            this.lastSyncTime = null;
            this.syncQueue = [];
            this.syncInProgress = false;
            this.deviceId = this.getDeviceId();
        }
        
        async init() {
            // Wait for dependencies
            await this.waitForDependencies();
            
            // Initialize WebSocket connection
            this.initializeSocket();
            
            // Subscribe to state changes
            this.subscribeToStateChanges();
            
            // Setup periodic sync
            this.setupPeriodicSync();
            
            if (window.logger) {
                window.logger.info('State synchronization initialized', {
                    category: 'STATE_SYNC',
                    deviceId: this.deviceId
                });
            }
        }
        
        async waitForDependencies() {
            return new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                    if (window.StateManager && 
                        window.StateManager.initialized && 
                        window.API_CONFIG) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
            });
        }
        
        initializeSocket() {
            if (!window.API_CONFIG || !window.API_CONFIG.ENABLE_WEBSOCKETS) {
                console.warn('WebSocket disabled in configuration');
                return;
            }
            
            // Initialize Socket.IO connection
            this.socket = window.API_CONFIG.initWebSocket();
            
            if (!this.socket) {
                console.error('Failed to initialize WebSocket');
                return;
            }
            
            // Setup socket event handlers
            this.setupSocketHandlers();
            
            this.syncEnabled = true;
        }
        
        setupSocketHandlers() {
            // Authenticated event
            this.socket.on('authenticated', (data) => {
                if (window.logger) {
                    window.logger.info('WebSocket authenticated', {
                        category: 'STATE_SYNC',
                        userId: data.userId
                    });
                }
                
                // Request full state sync after authentication
                this.requestFullSync();
            });
            
            // State update from another device
            this.socket.on('state:update', (data) => {
                this.handleRemoteStateUpdate(data);
            });
            
            // Business data update
            this.socket.on('business:changed', (data) => {
                this.handleBusinessUpdate(data);
            });
            
            // Inventory update
            this.socket.on('inventory:updated', (data) => {
                this.handleInventoryUpdate(data);
            });
            
            // Transaction update
            this.socket.on('transactions:new', (data) => {
                this.handleTransactionUpdate(data);
            });
            
            // Sync conflict
            this.socket.on('sync:conflict', (data) => {
                this.handleSyncConflict(data);
            });
            
            // Connection events
            this.socket.on('connect', () => {
                if (window.logger) {
                    window.logger.info('WebSocket connected', {
                        category: 'STATE_SYNC'
                    });
                }
                this.syncEnabled = true;
            });
            
            this.socket.on('disconnect', () => {
                if (window.logger) {
                    window.logger.warn('WebSocket disconnected', {
                        category: 'STATE_SYNC'
                    });
                }
                this.syncEnabled = false;
            });
        }
        
        subscribeToStateChanges() {
            // Subscribe to all state changes
            window.StateManager.subscribe('*', (changes) => {
                // Don't sync changes that came from remote
                if (changes.remote) return;
                
                // Queue changes for sync
                this.queueStateChange(changes);
            });
            
            // Subscribe to specific modules for immediate sync
            const criticalModules = ['auth', 'pos.cart', 'pos.currentTransaction'];
            criticalModules.forEach(module => {
                window.StateManager.subscribe(module, (changes) => {
                    if (!changes.remote) {
                        this.syncStateImmediately(module, changes);
                    }
                });
            });
        }
        
        queueStateChange(changes) {
            if (!this.syncEnabled) {
                // Store for later sync when online
                this.syncQueue.push({
                    changes,
                    timestamp: Date.now(),
                    deviceId: this.deviceId
                });
                return;
            }
            
            // Debounce non-critical changes
            if (this.syncTimeout) {
                clearTimeout(this.syncTimeout);
            }
            
            this.syncTimeout = setTimeout(() => {
                this.syncStateChanges();
            }, 1000); // 1 second debounce
        }
        
        async syncStateChanges() {
            if (!this.syncEnabled || this.syncInProgress) return;
            
            this.syncInProgress = true;
            
            try {
                // Get changes from queue
                const changes = [...this.syncQueue];
                this.syncQueue = [];
                
                if (changes.length === 0) {
                    this.syncInProgress = false;
                    return;
                }
                
                // Send changes to server
                this.socket.emit('state:sync', {
                    changes,
                    deviceId: this.deviceId,
                    timestamp: Date.now()
                });
                
                this.lastSyncTime = Date.now();
                
                if (window.logger) {
                    window.logger.debug('State changes synced', {
                        category: 'STATE_SYNC',
                        changeCount: changes.length
                    });
                }
            } catch (error) {
                if (window.logger) {
                    window.logger.error('State sync failed', {
                        category: 'STATE_SYNC',
                        error: error.message
                    });
                }
                
                // Re-queue changes for retry
                this.syncQueue.unshift(...changes);
            } finally {
                this.syncInProgress = false;
            }
        }
        
        syncStateImmediately(module, changes) {
            if (!this.syncEnabled || !this.socket || !this.socket.connected) return;
            
            // Send critical changes immediately
            this.socket.emit('state:sync', {
                module,
                changes,
                deviceId: this.deviceId,
                timestamp: Date.now(),
                priority: 'high'
            });
        }
        
        handleRemoteStateUpdate(data) {
            // Skip if update is from this device
            if (data.deviceId === this.deviceId) return;
            
            if (window.logger) {
                window.logger.info('Remote state update received', {
                    category: 'STATE_SYNC',
                    fromDevice: data.deviceId
                });
            }
            
            // Apply remote changes to local state
            if (data.changes) {
                // Mark as remote to prevent re-sync
                data.changes.remote = true;
                
                // Apply changes to StateManager
                if (data.module) {
                    window.StateManager.setState(data.module, data.changes.value);
                } else if (data.changes.updates) {
                    window.StateManager.batchUpdate(data.changes.updates);
                }
            }
        }
        
        handleBusinessUpdate(data) {
            if (window.logger) {
                window.logger.info('Business data updated remotely', {
                    category: 'STATE_SYNC'
                });
            }
            
            // Update business state
            if (data.business) {
                window.StateManager.setState('business', data.business);
            }
            
            // Trigger data reload if needed
            if (window.loadBusinessData) {
                window.loadBusinessData();
            }
        }
        
        handleInventoryUpdate(data) {
            if (window.logger) {
                window.logger.info('Inventory updated remotely', {
                    category: 'STATE_SYNC',
                    items: data.items
                });
            }
            
            // Trigger inventory reload
            if (window.loadInventory) {
                window.loadInventory();
            }
        }
        
        handleTransactionUpdate(data) {
            if (window.logger) {
                window.logger.info('New transaction from another device', {
                    category: 'STATE_SYNC',
                    count: data.count,
                    total: data.total
                });
            }
            
            // Update dashboard if visible
            if (window.StateManager.getState('ui.currentPage') === 'dashboard') {
                if (window.loadDashboard) {
                    window.loadDashboard();
                }
            }
            
            // Show notification
            if (window.showNotification) {
                window.showNotification(`New transaction: ${data.count} items - Total: ₱${data.total}`, 'info');
            }
        }
        
        handleSyncConflict(data) {
            if (window.logger) {
                window.logger.warn('Sync conflict detected', {
                    category: 'STATE_SYNC',
                    conflict: data
                });
            }
            
            // Simple conflict resolution: server wins
            // In production, you might want to show UI for user to resolve
            if (data.serverState) {
                window.StateManager.setState(data.path, data.serverState);
            }
        }
        
        async requestFullSync() {
            if (!this.syncEnabled || !this.socket || !this.socket.connected) return;
            
            try {
                // Request full state from server
                const response = await window.API_CONFIG.request(
                    window.API_CONFIG.ENDPOINTS.SYNC.FULL
                );
                
                if (response.success && response.data) {
                    // Update local state with server state
                    this.mergeServerState(response.data);
                }
            } catch (error) {
                if (window.logger) {
                    window.logger.error('Full sync request failed', {
                        category: 'STATE_SYNC',
                        error: error.message
                    });
                }
            }
        }
        
        mergeServerState(serverData) {
            // Merge server state with local state
            // Server state takes precedence for shared data
            // Local state preserved for device-specific settings
            
            const updates = {};
            
            // Update business data
            if (serverData.business) {
                updates['business'] = serverData.business;
            }
            
            // Update user data
            if (serverData.user) {
                updates['auth.currentUser'] = serverData.user;
            }
            
            // Update data collections
            if (serverData.products) {
                updates['data.products'] = serverData.products;
            }
            if (serverData.inventory) {
                updates['data.inventory'] = serverData.inventory;
            }
            if (serverData.employees) {
                updates['data.employees'] = serverData.employees;
            }
            
            // Apply updates
            window.StateManager.batchUpdate(updates);
            
            this.lastSyncTime = Date.now();
            
            if (window.logger) {
                window.logger.info('Server state merged', {
                    category: 'STATE_SYNC',
                    updates: Object.keys(updates)
                });
            }
        }
        
        setupPeriodicSync() {
            // Sync every 5 minutes if connected
            setInterval(() => {
                if (this.syncEnabled && this.socket && this.socket.connected) {
                    this.syncStateChanges();
                }
            }, 5 * 60 * 1000);
        }
        
        getDeviceId() {
            // Get or generate unique device ID
            let deviceId = localStorage.getItem('deviceId');
            if (!deviceId) {
                deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('deviceId', deviceId);
            }
            return deviceId;
        }
        
        // Public methods
        
        forceSync() {
            return this.syncStateChanges();
        }
        
        getSyncStatus() {
            return {
                enabled: this.syncEnabled,
                connected: this.socket && this.socket.connected,
                lastSync: this.lastSyncTime,
                queueSize: this.syncQueue.length,
                deviceId: this.deviceId
            };
        }
        
        clearSyncQueue() {
            this.syncQueue = [];
        }
    }
    
    // Initialize state sync
    window.StateSync = new StateSync();
    
    // Auto-initialize when ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.StateSync.init();
        });
    } else {
        window.StateSync.init();
    }
    
})();