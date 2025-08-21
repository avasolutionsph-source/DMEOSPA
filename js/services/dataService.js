// Data Service Layer
// Provides a unified interface for all data operations
// Handles online/offline, caching, and synchronization

class DataService {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.listeners = new Map();
    }

    // Event System for real-time updates
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    emit(event, data) {
        const callbacks = this.listeners.get(event) || [];
        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event listener for ${event}:`, error);
            }
        });
    }

    // Cache Management
    getCached(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    clearCache(pattern) {
        if (pattern) {
            for (const key of this.cache.keys()) {
                if (key.includes(pattern)) {
                    this.cache.delete(key);
                }
            }
        } else {
            this.cache.clear();
        }
    }

    // Business Data Operations
    async getBusinessInfo(businessId) {
        const cacheKey = `business:${businessId}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        try {
            // Try online first
            if (window.apiClient) {
                const response = await window.apiClient.get(`/api/businesses/${businessId}`);
                if (response.ok) {
                    const data = await response.json();
                    this.setCache(cacheKey, data);
                    return data;
                }
            }
        } catch (error) {
            console.warn('Failed to fetch business info online:', error);
        }

        // Fallback to IndexedDB
        if (window.db) {
            const localBusiness = await window.db.get('settings', 'businessInfo');
            if (localBusiness) {
                return localBusiness.value;
            }
        }

        return null;
    }

    async getServices(businessId) {
        const cacheKey = `services:${businessId}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        try {
            // Try online first
            if (window.apiClient) {
                const response = await window.apiClient.get(`/api/auth/public/business-catalog/${businessId}`);
                if (response.ok) {
                    const data = await response.json();
                    this.setCache(cacheKey, data.services || []);
                    return data.services || [];
                }
            }
        } catch (error) {
            console.warn('Failed to fetch services online:', error);
        }

        // Fallback to IndexedDB
        if (window.db) {
            const products = await window.db.getAll('products');
            const services = products.filter(p => p.category === 'service' || p.type === 'service');
            return services;
        }

        return [];
    }

    async getEmployees(businessId) {
        const cacheKey = `employees:${businessId}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        try {
            // Try online first
            if (window.apiClient) {
                const response = await window.apiClient.get(`/api/auth/public/business-catalog/${businessId}`);
                if (response.ok) {
                    const data = await response.json();
                    this.setCache(cacheKey, data.employees || []);
                    return data.employees || [];
                }
            }
        } catch (error) {
            console.warn('Failed to fetch employees online:', error);
        }

        // Fallback to IndexedDB
        if (window.db) {
            const employees = await window.db.getAll('employees');
            return employees;
        }

        return [];
    }

    async getBookings(filters = {}) {
        const cacheKey = `bookings:${JSON.stringify(filters)}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        try {
            // Try online first
            if (window.apiClient) {
                const queryParams = new URLSearchParams(filters).toString();
                const response = await window.apiClient.get(`/api/bookings${queryParams ? '?' + queryParams : ''}`);
                if (response.ok) {
                    const data = await response.json();
                    this.setCache(cacheKey, data.data || []);
                    return data.data || [];
                }
            }
        } catch (error) {
            console.warn('Failed to fetch bookings online:', error);
        }

        // Fallback to IndexedDB
        if (window.db) {
            const bookings = await window.db.getAll('bookings');
            // Apply filters locally
            return this.applyFilters(bookings, filters);
        }

        return [];
    }

    applyFilters(items, filters) {
        return items.filter(item => {
            for (const key in filters) {
                if (item[key] !== filters[key]) {
                    return false;
                }
            }
            return true;
        });
    }

    // Publish Operations
    async publishCatalog(services, employees) {
        try {
            // Clear related cache
            this.clearCache('services:');
            this.clearCache('employees:');

            // Get auth token
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            if (!token) {
                throw new Error('Authentication required');
            }

            // Use config for API URL
            const apiUrl = window.appConfig?.getApiUrl('pwa') || 'https://ava-pwa-backend.onrender.com/api';
            
            const response = await fetch(`${apiUrl}/auth/publish-catalog`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ products: services, employees })
            });

            const data = await response.json();
            
            if (response.ok && data.success) {
                // Emit event for real-time updates
                this.emit('catalog:published', { services, employees });
                
                // Update local storage
                if (window.db) {
                    // Update sync status
                    await window.db.put('settings', {
                        key: 'lastCatalogPublish',
                        value: new Date().toISOString()
                    });
                }
                
                return data;
            } else {
                throw new Error(data.error || 'Failed to publish catalog');
            }
        } catch (error) {
            console.error('Publish catalog error:', error);
            throw error;
        }
    }

    // Sync Operations
    async syncData(type = 'all') {
        const syncTasks = [];
        
        if (type === 'all' || type === 'products') {
            syncTasks.push(this.syncProducts());
        }
        
        if (type === 'all' || type === 'employees') {
            syncTasks.push(this.syncEmployees());
        }
        
        if (type === 'all' || type === 'bookings') {
            syncTasks.push(this.syncBookings());
        }
        
        const results = await Promise.allSettled(syncTasks);
        
        // Emit sync complete event
        this.emit('sync:complete', {
            type,
            results: results.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason })
        });
        
        return results;
    }

    async syncProducts() {
        // Implementation would sync with backend
        console.log('Syncing products...');
        // Use existing sync logic
        if (window.syncManager) {
            return await window.syncManager.syncProducts();
        }
    }

    async syncEmployees() {
        console.log('Syncing employees...');
        if (window.syncManager) {
            return await window.syncManager.syncEmployees();
        }
    }

    async syncBookings() {
        console.log('Syncing bookings...');
        if (window.bookingsManager) {
            return await window.bookingsManager.syncExternalBookings();
        }
    }

    // Utility Methods
    async checkOnlineStatus() {
        try {
            const apiUrl = window.appConfig?.getApiUrl('pwa') || 'https://ava-pwa-backend.onrender.com/api';
            const response = await fetch(`${apiUrl}/health`, { method: 'HEAD' });
            return response.ok;
        } catch {
            return false;
        }
    }

    async getStats() {
        const stats = {
            cacheSize: this.cache.size,
            isOnline: await this.checkOnlineStatus(),
            lastSync: null
        };

        if (window.db) {
            const lastSync = await window.db.get('settings', 'lastSync');
            stats.lastSync = lastSync?.value;
        }

        return stats;
    }
}

// Create singleton instance
const dataService = new DataService();

// Export for use
window.dataService = dataService;

// Auto-sync on online event
window.addEventListener('online', () => {
    console.log('📡 Back online, triggering sync...');
    dataService.syncData('all');
});

// Listen for visibility changes to refresh cache
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // Clear old cache when page becomes visible
        const cacheKeys = Array.from(dataService.cache.keys());
        const now = Date.now();
        cacheKeys.forEach(key => {
            const cached = dataService.cache.get(key);
            if (cached && now - cached.timestamp > dataService.cacheTimeout) {
                dataService.cache.delete(key);
            }
        });
    }
});

export default dataService;