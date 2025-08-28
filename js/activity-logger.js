// Activity Logger Module for Ava Solutions PWA
// Tracks all additions and deletions throughout the system

class ActivityLogger {
    constructor() {
        this.activities = [];
        this.maxActivities = 500; // Keep last 500 activities
        this.db = null;
        this.initialized = false;
        this.subscribers = new Set();
        
        // Activity types we track
        this.activityTypes = {
            ADD: 'add',
            DELETE: 'delete',
            UPDATE: 'update',
            LOGIN: 'login',
            LOGOUT: 'logout',
            SYNC: 'sync',
            BACKUP: 'backup',
            RESTORE: 'restore',
            CLEAR: 'clear',
            ERROR: 'error'
        };
        
        // Entity types we track
        this.entityTypes = {
            PRODUCT: 'product',
            INVENTORY: 'inventory',
            EMPLOYEE: 'employee',
            CUSTOMER: 'customer',
            TRANSACTION: 'transaction',
            GIFT_CERTIFICATE: 'gift_certificate',
            EXPENSE: 'expense',
            SUPPLIER: 'supplier',
            CATEGORY: 'category',
            CART_ITEM: 'cart_item',
            SETTINGS: 'settings',
            USER: 'user',
            BUSINESS: 'business',
            BACKUP: 'backup',
            SYSTEM: 'system'
        };
    }
    
    async init() {
        try {
            // Wait for database
            await this.waitForDatabase();
            
            // Load existing activities from database
            await this.loadActivities();
            
            // Setup state manager integration
            this.setupStateManagerIntegration();
            
            // Setup API request interception
            this.setupApiInterception();
            
            this.initialized = true;
            
            // Log initialization
            this.logActivity(
                this.activityTypes.SYSTEM,
                this.entityTypes.SYSTEM,
                null,
                'Activity Logger initialized',
                null
            );
            
        } catch (error) {
            console.error('Failed to initialize ActivityLogger:', error);
        }
    }
    
    async waitForDatabase() {
        const maxAttempts = 30;
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            if (window.db && window.db.isOpen) {
                this.db = window.db;
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        console.warn('ActivityLogger: Database not ready, using localStorage fallback');
    }
    
    async loadActivities() {
        try {
            if (this.db && this.db.isOpen) {
                // Try loading from IndexedDB
                const stored = await this.db.get('activityLogs', 'current');
                if (stored && stored.activities) {
                    this.activities = stored.activities;
                }
            } else {
                // Fallback to localStorage
                const stored = localStorage.getItem('ava_activity_logs');
                if (stored) {
                    this.activities = JSON.parse(stored);
                }
            }
        } catch (error) {
            console.error('Failed to load activities:', error);
            this.activities = [];
        }
    }
    
    async saveActivities() {
        try {
            const data = {
                key: 'current',
                activities: this.activities,
                timestamp: Date.now()
            };
            
            if (this.db && this.db.isOpen) {
                // Save to IndexedDB
                await this.db.update('activityLogs', data);
            }
            
            // Always backup to localStorage
            localStorage.setItem('ava_activity_logs', JSON.stringify(this.activities));
            
        } catch (error) {
            console.error('Failed to save activities:', error);
        }
    }
    
    setupStateManagerIntegration() {
        if (!window.StateManager) return;
        
        // Subscribe to all state changes
        window.StateManager.subscribe('*', (updates, state) => {
            if (!updates || !updates.path) return;
            
            // Parse the update to determine what changed
            if (typeof updates === 'object' && updates.updates) {
                updates.updates.forEach(update => {
                    this.processStateChange(update);
                });
            }
        });
    }
    
    processStateChange(update) {
        const path = update.path;
        const oldValue = update.oldValue;
        const newValue = update.value;
        
        // Determine the entity type from the path
        let entityType = this.entityTypes.SYSTEM;
        let activityType = this.activityTypes.UPDATE;
        let entityId = null;
        let description = '';
        
        // Parse different state paths
        if (path.includes('data.products')) {
            entityType = this.entityTypes.PRODUCT;
            if (Array.isArray(oldValue) && Array.isArray(newValue)) {
                // Check for additions or deletions
                if (newValue.length > oldValue.length) {
                    activityType = this.activityTypes.ADD;
                    const added = newValue.find(item => !oldValue.find(old => old.id === item.id));
                    if (added) {
                        entityId = added.id;
                        description = `Added product: ${added.name || 'Unknown'}`;
                    }
                } else if (newValue.length < oldValue.length) {
                    activityType = this.activityTypes.DELETE;
                    const deleted = oldValue.find(item => !newValue.find(newItem => newItem.id === item.id));
                    if (deleted) {
                        entityId = deleted.id;
                        description = `Deleted product: ${deleted.name || 'Unknown'}`;
                    }
                }
            }
        } else if (path.includes('data.inventory')) {
            entityType = this.entityTypes.INVENTORY;
            if (Array.isArray(oldValue) && Array.isArray(newValue)) {
                if (newValue.length > oldValue.length) {
                    activityType = this.activityTypes.ADD;
                    description = 'Added inventory item';
                } else if (newValue.length < oldValue.length) {
                    activityType = this.activityTypes.DELETE;
                    description = 'Deleted inventory item';
                }
            }
        } else if (path.includes('data.employees')) {
            entityType = this.entityTypes.EMPLOYEE;
            if (Array.isArray(oldValue) && Array.isArray(newValue)) {
                if (newValue.length > oldValue.length) {
                    activityType = this.activityTypes.ADD;
                    const added = newValue.find(item => !oldValue.find(old => old.id === item.id));
                    if (added) {
                        entityId = added.id;
                        description = `Added employee: ${added.name || 'Unknown'}`;
                    }
                } else if (newValue.length < oldValue.length) {
                    activityType = this.activityTypes.DELETE;
                    const deleted = oldValue.find(item => !newValue.find(newItem => newItem.id === item.id));
                    if (deleted) {
                        entityId = deleted.id;
                        description = `Deleted employee: ${deleted.name || 'Unknown'}`;
                    }
                }
            }
        } else if (path.includes('pos.cart')) {
            entityType = this.entityTypes.CART_ITEM;
            if (Array.isArray(oldValue) && Array.isArray(newValue)) {
                if (newValue.length > oldValue.length) {
                    activityType = this.activityTypes.ADD;
                    description = 'Added item to cart';
                } else if (newValue.length < oldValue.length) {
                    activityType = this.activityTypes.DELETE;
                    description = 'Removed item from cart';
                } else if (newValue.length === 0 && oldValue.length > 0) {
                    activityType = this.activityTypes.CLEAR;
                    description = 'Cleared cart';
                }
            }
        } else if (path.includes('auth.currentUser')) {
            entityType = this.entityTypes.USER;
            if (newValue && !oldValue) {
                activityType = this.activityTypes.LOGIN;
                description = `User logged in: ${newValue.email || newValue.username || 'Unknown'}`;
            } else if (!newValue && oldValue) {
                activityType = this.activityTypes.LOGOUT;
                description = `User logged out: ${oldValue.email || oldValue.username || 'Unknown'}`;
            }
        } else if (path.includes('business')) {
            entityType = this.entityTypes.BUSINESS;
            description = `Updated business settings`;
        }
        
        // Log the activity if we have a meaningful change
        if (description) {
            this.logActivity(activityType, entityType, entityId, description, {
                oldValue: this.sanitizeValue(oldValue),
                newValue: this.sanitizeValue(newValue),
                path
            });
        }
    }
    
    setupApiInterception() {
        // Intercept API calls to track external changes
        if (window.api) {
            const originalPost = window.api.post;
            const originalDelete = window.api.delete;
            
            // Override POST method
            window.api.post = async (endpoint, data, options) => {
                const result = await originalPost.call(window.api, endpoint, data, options);
                
                // Track based on endpoint
                if (endpoint.includes('/products')) {
                    this.logActivity(
                        this.activityTypes.ADD,
                        this.entityTypes.PRODUCT,
                        result?.id,
                        'Created product via API',
                        { endpoint, data }
                    );
                } else if (endpoint.includes('/employees')) {
                    this.logActivity(
                        this.activityTypes.ADD,
                        this.entityTypes.EMPLOYEE,
                        result?.id,
                        'Created employee via API',
                        { endpoint, data }
                    );
                } else if (endpoint.includes('/transactions')) {
                    this.logActivity(
                        this.activityTypes.ADD,
                        this.entityTypes.TRANSACTION,
                        result?.id,
                        'Created transaction',
                        { endpoint, data }
                    );
                }
                
                return result;
            };
            
            // Override DELETE method
            window.api.delete = async (endpoint, options) => {
                const result = await originalDelete.call(window.api, endpoint, options);
                
                // Track based on endpoint
                const entityId = endpoint.split('/').pop();
                if (endpoint.includes('/products')) {
                    this.logActivity(
                        this.activityTypes.DELETE,
                        this.entityTypes.PRODUCT,
                        entityId,
                        'Deleted product via API',
                        { endpoint }
                    );
                } else if (endpoint.includes('/employees')) {
                    this.logActivity(
                        this.activityTypes.DELETE,
                        this.entityTypes.EMPLOYEE,
                        entityId,
                        'Deleted employee via API',
                        { endpoint }
                    );
                }
                
                return result;
            };
        }
    }
    
    logActivity(type, entityType, entityId, description, metadata = null) {
        const activity = {
            id: this.generateId(),
            type,
            entityType,
            entityId,
            description,
            metadata: this.sanitizeMetadata(metadata),
            timestamp: Date.now(),
            user: window.StateManager?.state?.auth?.currentUser?.username || 'system',
            businessName: window.StateManager?.state?.business?.name || 'Unknown'
        };
        
        // Add to activities array
        this.activities.unshift(activity);
        
        // Trim if exceeds max
        if (this.activities.length > this.maxActivities) {
            this.activities = this.activities.slice(0, this.maxActivities);
        }
        
        // Save to storage
        this.saveActivities();
        
        // Notify subscribers
        this.notifySubscribers(activity);
        
        return activity;
    }
    
    sanitizeValue(value) {
        if (!value) return null;
        
        // Don't log sensitive data
        if (typeof value === 'object') {
            const sanitized = { ...value };
            if (sanitized.password) sanitized.password = '[REDACTED]';
            if (sanitized.token) sanitized.token = '[REDACTED]';
            if (sanitized.creditCard) sanitized.creditCard = '[REDACTED]';
            if (sanitized.apiKey) sanitized.apiKey = '[REDACTED]';
            
            // Limit array sizes
            if (Array.isArray(sanitized)) {
                return `Array[${sanitized.length}]`;
            }
            
            return sanitized;
        }
        
        return value;
    }
    
    sanitizeMetadata(metadata) {
        if (!metadata) return null;
        return this.sanitizeValue(metadata);
    }
    
    generateId() {
        return `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Get activities with filters
    getActivities(filters = {}) {
        let filtered = [...this.activities];
        
        if (filters.type) {
            filtered = filtered.filter(a => a.type === filters.type);
        }
        
        if (filters.entityType) {
            filtered = filtered.filter(a => a.entityType === filters.entityType);
        }
        
        if (filters.startDate) {
            filtered = filtered.filter(a => a.timestamp >= filters.startDate);
        }
        
        if (filters.endDate) {
            filtered = filtered.filter(a => a.timestamp <= filters.endDate);
        }
        
        if (filters.user) {
            filtered = filtered.filter(a => a.user === filters.user);
        }
        
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(a => 
                a.description.toLowerCase().includes(searchLower) ||
                a.entityType.toLowerCase().includes(searchLower)
            );
        }
        
        if (filters.limit) {
            filtered = filtered.slice(0, filters.limit);
        }
        
        return filtered;
    }
    
    // Clear activities
    async clearActivities() {
        this.activities = [];
        await this.saveActivities();
        this.notifySubscribers({ type: 'clear' });
    }
    
    // Subscribe to activity updates
    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }
    
    notifySubscribers(activity) {
        this.subscribers.forEach(callback => {
            try {
                callback(activity, this.activities);
            } catch (error) {
                console.error('Activity subscriber error:', error);
            }
        });
    }
    
    // Export activities
    exportActivities() {
        return {
            version: '1.0.0',
            exportDate: new Date().toISOString(),
            activities: this.activities,
            totalCount: this.activities.length,
            businessName: window.StateManager?.state?.business?.name || 'Unknown'
        };
    }
    
    // Import activities
    async importActivities(data) {
        if (!data || !data.activities) {
            throw new Error('Invalid import data');
        }
        
        this.activities = data.activities;
        await this.saveActivities();
        this.notifySubscribers({ type: 'import' });
        
        return true;
    }
    
    // Get statistics
    getStatistics() {
        const now = Date.now();
        const dayAgo = now - (24 * 60 * 60 * 1000);
        const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
        
        return {
            total: this.activities.length,
            today: this.activities.filter(a => a.timestamp >= dayAgo).length,
            thisWeek: this.activities.filter(a => a.timestamp >= weekAgo).length,
            byType: this.activities.reduce((acc, a) => {
                acc[a.type] = (acc[a.type] || 0) + 1;
                return acc;
            }, {}),
            byEntity: this.activities.reduce((acc, a) => {
                acc[a.entityType] = (acc[a.entityType] || 0) + 1;
                return acc;
            }, {})
        };
    }
}

// Create and initialize singleton instance
window.activityLogger = new ActivityLogger();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.activityLogger.init();
    });
} else {
    window.activityLogger.init();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ActivityLogger;
}