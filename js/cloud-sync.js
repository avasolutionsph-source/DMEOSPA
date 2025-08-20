// Minimal Cloud Sync for Entitlements and Authentication
class CloudSyncManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.syncQueue = [];
        this.lastSync = null;
        this.syncInterval = null;
        this.isLoggingIn = false;
        this.enabled = true; // Can be disabled for unpaid users
    }

    async init() {
        // Don't initialize sync for unpaid users
        if (window.entitlementsSystem?.currentPlan === 'unpaid') {
            console.log('Cloud sync disabled for unpaid users');
            this.enabled = false;
            return;
        }

        // Setup network monitoring
        this.setupNetworkMonitoring();
        
        // Start periodic sync if user is authenticated
        if (window.authSystem?.isLoggedIn) {
            this.startPeriodicSync();
        }
        
        // Listen for auth changes
        this.setupAuthListeners();
    }

    setupNetworkMonitoring() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('Network online - starting sync');
            this.performSync();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('Network offline - sync paused');
        });
    }

    setupAuthListeners() {
        // Listen for login/logout events
        document.addEventListener('authStateChanged', (e) => {
            if (e.detail.isLoggedIn) {
                this.startPeriodicSync();
            } else {
                this.stopPeriodicSync();
            }
        });
    }

    startPeriodicSync() {
        // Sync every 10 minutes if authenticated
        if (this.syncInterval) return;
        
        this.syncInterval = setInterval(() => {
            if (this.isOnline && window.authSystem?.isLoggedIn) {
                this.performSync();
            }
        }, 10 * 60 * 1000); // 10 minutes

        // Perform initial sync
        if (this.isOnline) {
            this.performSync();
        }
    }

    stopPeriodicSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    async performSync() {
        if (!this.enabled) {
            console.log('Sync disabled for unpaid users');
            return;
        }
        
        if (!this.isOnline || !window.authSystem?.isLoggedIn || this.isLoggingIn) {
            return;
        }

        try {
            console.log('Starting cloud sync...');
            
            // Sync entitlements
            await this.syncEntitlements();
            
            // Sync user profile
            await this.syncUserProfile();
            
            // Process any queued operations
            await this.processQueuedOperations();
            
            this.lastSync = new Date().toISOString();
            localStorage.setItem('lastCloudSync', this.lastSync);
            
            console.log('Cloud sync completed successfully');
            
        } catch (error) {
            console.error('Cloud sync failed:', error);
            
            // If authentication error, try to refresh token
            if (error.message?.includes('401') || error.message?.includes('authentication')) {
                await this.handleAuthError();
            }
        }
    }

    async syncEntitlements() {
        try {
            if (!window.apiClient || !window.entitlementsSystem) return;

            const response = await window.apiClient.getEntitlements();
            
            if (response.ok) {
                const data = await response.json();
                
                // Update entitlements if they've changed
                const currentPlan = window.entitlementsSystem.currentPlan;
                if (data.plan !== currentPlan) {
                    console.log(`Plan changed from ${currentPlan} to ${data.plan}`);
                    window.entitlementsSystem.handleSubscriptionUpdate(data.plan, data.entitlements);
                }
            }
            
        } catch (error) {
            console.error('Failed to sync entitlements:', error);
        }
    }

    async syncUserProfile() {
        try {
            if (!window.apiClient || !window.authSystem) return;

            const response = await window.apiClient.getCurrentUser();
            
            if (response.ok) {
                const userData = await response.json();
                
                // Update local user data if it's changed
                const currentUser = window.authSystem.currentUser;
                if (currentUser && userData.businessName !== currentUser.businessName) {
                    console.log('User profile updated');
                    currentUser.businessName = userData.businessName;
                    
                    // Update stored user data
                    const storage = localStorage.getItem('authToken') ? localStorage : sessionStorage;
                    storage.setItem('currentUser', JSON.stringify(currentUser));
                    
                    // Update UI
                    if (window.app) {
                        window.app.loadBusinessName();
                    }
                }
            }
            
        } catch (error) {
            console.error('Failed to sync user profile:', error);
        }
    }

    async processQueuedOperations() {
        // Process any operations that were queued while offline
        const queuedOps = this.getQueuedOperations();
        
        for (const operation of queuedOps) {
            try {
                await this.processOperation(operation);
                this.removeFromQueue(operation.id);
            } catch (error) {
                console.error('Failed to process queued operation:', error);
                
                // If it's been too many attempts, remove it
                if (operation.attempts >= 3) {
                    this.removeFromQueue(operation.id);
                }
            }
        }
    }

    getQueuedOperations() {
        try {
            const queued = localStorage.getItem('cloudSyncQueue');
            return queued ? JSON.parse(queued) : [];
        } catch (error) {
            console.error('Failed to get queued operations:', error);
            return [];
        }
    }

    addToQueue(operation) {
        const queue = this.getQueuedOperations();
        queue.push({
            id: Date.now().toString(),
            ...operation,
            timestamp: new Date().toISOString(),
            attempts: 0
        });
        
        localStorage.setItem('cloudSyncQueue', JSON.stringify(queue));
    }

    removeFromQueue(operationId) {
        const queue = this.getQueuedOperations();
        const filtered = queue.filter(op => op.id !== operationId);
        localStorage.setItem('cloudSyncQueue', JSON.stringify(filtered));
    }

    async processOperation(operation) {
        switch (operation.type) {
            case 'usage_tracking':
                await window.apiClient.trackUsage(operation.data.type, operation.data.action, operation.data.details);
                break;
            case 'settings_sync':
                await window.apiClient.syncSettings(operation.data);
                break;
            default:
                console.warn('Unknown operation type:', operation.type);
        }
        
        operation.attempts++;
    }

    async handleAuthError() {
        try {
            this.isLoggingIn = true;
            
            // Try to refresh the token
            if (window.apiClient) {
                const response = await window.apiClient.refreshToken();
                
                if (response.ok) {
                    const data = await response.json();
                    
                    // Update auth system with new token
                    if (window.authSystem) {
                        window.authSystem.authToken = data.token;
                        window.apiClient.setToken(data.token);
                        
                        // Update stored token
                        const storage = localStorage.getItem('authToken') ? localStorage : sessionStorage;
                        storage.setItem('authToken', data.token);
                        
                        console.log('Token refreshed successfully');
                    }
                } else {
                    // Refresh failed, need to re-login
                    console.log('Token refresh failed, requiring re-login');
                    window.authSystem.clearAuthState();
                    window.authSystem.showLoginModal();
                }
            }
            
        } catch (error) {
            console.error('Failed to handle auth error:', error);
            // Clear auth state and show login
            window.authSystem.clearAuthState();
            window.authSystem.showLoginModal();
        } finally {
            this.isLoggingIn = false;
        }
    }

    // Public methods for other modules to use

    // Track usage for analytics (queued if offline)
    trackUsage(type, action, details = {}) {
        const operation = {
            type: 'usage_tracking',
            data: { type, action, details }
        };

        if (this.isOnline && window.authSystem?.isLoggedIn) {
            // Send immediately if online
            window.apiClient.trackUsage(type, action, details).catch(error => {
                console.error('Failed to track usage, queueing:', error);
                this.addToQueue(operation);
            });
        } else {
            // Queue for later if offline
            this.addToQueue(operation);
        }
    }

    // Sync settings to cloud (queued if offline)
    syncSettings(settings) {
        const operation = {
            type: 'settings_sync',
            data: settings
        };

        if (this.isOnline && window.authSystem?.isLoggedIn) {
            // Send immediately if online
            window.apiClient.syncSettings(settings).catch(error => {
                console.error('Failed to sync settings, queueing:', error);
                this.addToQueue(operation);
            });
        } else {
            // Queue for later if offline
            this.addToQueue(operation);
        }
    }

    // Force sync (useful for testing or user-initiated sync)
    async forceSync() {
        if (!this.isOnline) {
            showNotification('Cannot sync while offline', 'warning');
            return false;
        }

        if (!window.authSystem?.isLoggedIn) {
            showNotification('Please login to sync', 'warning');
            return false;
        }

        try {
            showNotification('Syncing with cloud...', 'info');
            await this.performSync();
            showNotification('Sync completed successfully!', 'success');
            return true;
        } catch (error) {
            console.error('Force sync failed:', error);
            showNotification('Sync failed. Please try again.', 'error');
            return false;
        }
    }

    // Get sync status
    getSyncStatus() {
        return {
            isOnline: this.isOnline,
            isAuthenticated: window.authSystem?.isLoggedIn || false,
            lastSync: this.lastSync,
            queuedOperations: this.getQueuedOperations().length,
            isActive: !!this.syncInterval
        };
    }

    // Manual backup (if user has cloud backup feature)
    async createBackup() {
        if (!window.can || !window.can('cloudBackup')) {
            window.showFeatureLockedMessage('cloudBackup', 'create cloud backups');
            return false;
        }

        if (!this.isOnline) {
            showNotification('Cannot create backup while offline', 'warning');
            return false;
        }

        try {
            showLoading('Creating backup...', 'Uploading your data to the cloud');
            
            // Export all data
            const backupData = await db.exportData();
            
            // Upload to cloud
            const response = await window.apiClient.uploadBackup(backupData);
            
            if (response.ok) {
                hideLoading();
                showNotification('Backup created successfully!', 'success');
                return true;
            } else {
                throw new Error('Backup upload failed');
            }
            
        } catch (error) {
            console.error('Backup creation failed:', error);
            hideLoading();
            showNotification('Backup failed. Please try again.', 'error');
            return false;
        }
    }

    // Restore from backup
    async restoreFromBackup() {
        if (!window.can || !window.can('cloudBackup')) {
            window.showFeatureLockedMessage('cloudBackup', 'restore from cloud backups');
            return false;
        }

        if (!this.isOnline) {
            showNotification('Cannot restore backup while offline', 'warning');
            return false;
        }

        if (!confirm('This will replace all your current data with the backup. Are you sure?')) {
            return false;
        }

        try {
            showLoading('Restoring backup...', 'Downloading and restoring your data');
            
            // Download backup
            const response = await window.apiClient.downloadBackup();
            
            if (response.ok) {
                const backupData = await response.text();
                
                // Import data
                const success = await db.importData(backupData);
                
                if (success) {
                    hideLoading();
                    showNotification('Backup restored successfully! Refreshing app...', 'success');
                    
                    // Refresh the app to load restored data
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                    
                    return true;
                } else {
                    throw new Error('Data import failed');
                }
            } else {
                throw new Error('Backup download failed');
            }
            
        } catch (error) {
            console.error('Backup restore failed:', error);
            hideLoading();
            showNotification('Restore failed. Please try again.', 'error');
            return false;
        }
    }
}

// Create global instance
const cloudSyncManager = new CloudSyncManager();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    await cloudSyncManager.init();
});

// Export for use in other modules
window.cloudSyncManager = cloudSyncManager;

