// API Client for MERN Backend Communication


class APIClient {
    constructor() {
        this.baseUrl = null;
        this.token = null;
        this.isOnline = navigator.onLine;
        this.pendingRequests = new Map();
        this.retryQueue = [];
    }

    async init() {
        // Load API URL from settings
        await this.loadSettings();
        
        // Set up network monitoring
        this.setupNetworkMonitoring();
        
        // Process any queued requests
        this.processRetryQueue();
        
        logInfo('API Client initialized', {
            category: 'API',
            operation: 'init',
            data: { baseUrl: this.baseUrl }
        });
    }

    // Load settings and configuration
    async loadSettings() {
        try {
            // Use unified backend URL from API_CONFIG if available
            if (window.API_CONFIG && window.API_CONFIG.BASE_URL) {
                this.baseUrl = window.API_CONFIG.BASE_URL;
            } else {
                // Fallback to unified backend URL
                this.baseUrl = 'https://daetspa-backend.onrender.com';
            }
            
            // Load token from auth system or API_CONFIG
            if (window.API_CONFIG && window.API_CONFIG.getToken) {
                this.token = window.API_CONFIG.getToken();
            } else if (window.authSystem) {
                this.token = window.authSystem.authToken;
            }
        } catch (error) {
            logError('Failed to load API settings', {
                category: 'API',
                operation: 'load_settings',
                error
            });
            this.baseUrl = 'https://daetspa-backend.onrender.com'; // Unified backend
        }
    }

    // Set authentication token
    setToken(token) {
        this.token = token;
    }
    
    // Clear authentication token
    clearToken() {
        this.token = null;
    }

    // Setup network monitoring
    setupNetworkMonitoring() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('Network online - processing queued requests');
            this.processRetryQueue();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('Network offline - queueing requests');
        });
    }

    // Make authenticated API request
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const requestId = `${options.method || 'GET'}_${endpoint}_${Date.now()}`;
        
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(this.token && { 'Authorization': `Bearer ${this.token}` })
            },
            ...options
        };

        // If offline and this is not a critical request, queue it
        if (!this.isOnline && !options.critical) {
            return this.queueRequest(endpoint, defaultOptions);
        }

        try {
            this.pendingRequests.set(requestId, { endpoint, options: defaultOptions });
            
            const response = await fetch(url, defaultOptions);
            
            this.pendingRequests.delete(requestId);
            
            // Handle token expiration
            if (response.status === 401) {
                await this.handleTokenExpiration();
                throw new Error('Authentication required');
            }

            // Handle rate limiting
            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After') || 60;
                console.warn(`Rate limited, retrying after ${retryAfter} seconds`);
                await this.delay(retryAfter * 1000);
                return this.request(endpoint, options);
            }

            return response;
        } catch (error) {
            this.pendingRequests.delete(requestId);
            
            // Queue non-critical requests for retry if network error
            if (!this.isOnline || error.name === 'NetworkError') {
                if (!options.critical) {
                    return this.queueRequest(endpoint, defaultOptions);
                }
            }
            
            throw error;
        }
    }

    // Queue request for later retry
    queueRequest(endpoint, options) {
        const queuedRequest = {
            endpoint,
            options,
            timestamp: Date.now(),
            retryCount: 0
        };
        
        this.retryQueue.push(queuedRequest);
        console.log(`Queued request: ${options.method} ${endpoint}`);
        
        // Return a promise that resolves when online
        return new Promise((resolve, reject) => {
            queuedRequest.resolve = resolve;
            queuedRequest.reject = reject;
        });
    }

    // Process queued requests when back online
    async processRetryQueue() {
        if (!this.isOnline || this.retryQueue.length === 0) return;

        console.log(`Processing ${this.retryQueue.length} queued requests`);
        
        const queue = [...this.retryQueue];
        this.retryQueue = [];

        for (const queuedRequest of queue) {
            try {
                const response = await this.request(queuedRequest.endpoint, {
                    ...queuedRequest.options,
                    critical: true // Mark as critical to avoid re-queueing
                });
                
                if (queuedRequest.resolve) {
                    queuedRequest.resolve(response);
                }
            } catch (error) {
                console.error('Failed to process queued request:', error);
                
                // Retry up to 3 times
                if (queuedRequest.retryCount < 3) {
                    queuedRequest.retryCount++;
                    this.retryQueue.push(queuedRequest);
                } else if (queuedRequest.reject) {
                    queuedRequest.reject(error);
                }
            }
        }
    }

    // Handle token expiration
    async handleTokenExpiration() {
        console.log('Token expired, clearing auth state');
        
        if (window.authSystem) {
            window.authSystem.clearAuthState();
        }
        
        this.token = null;
        
        // Show login modal
        showNotification('Your session has expired. Please login again.', 'warning');
        if (window.authSystem) {
            window.authSystem.showLoginModal();
        }
    }

    // Utility delay function
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Authentication endpoints
    async login(email, password) {
        return this.request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
            critical: true
        });
    }

    async register(userData) {
        return this.request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData),
            critical: true
        });
    }

    async refreshToken() {
        return this.request('/api/auth/refresh', {
            method: 'POST',
            critical: true
        });
    }

    async logout() {
        return this.request('/api/auth/logout', {
            method: 'POST',
            critical: true
        });
    }

    // Entitlements endpoints
    async getEntitlements() {
        return this.request('/api/entitlements');
    }

    async getCurrentUser() {
        return this.request('/api/user/profile');
    }

    // Subscription endpoints
    async getSubscriptionStatus() {
        return this.request('/api/subscription/status');
    }

    async createCheckoutSession(priceId) {
        return this.request('/api/subscription/checkout', {
            method: 'POST',
            body: JSON.stringify({ priceId }),
            critical: true
        });
    }

    async getCustomerPortalUrl() {
        return this.request('/api/subscription/portal');
    }

    // Analytics and usage endpoints (minimal data only)
    async sendUsageMetrics(metrics) {
        return this.request('/api/analytics/usage', {
            method: 'POST',
            body: JSON.stringify(metrics)
        });
    }

    async getUsageSummary() {
        return this.request('/api/analytics/summary');
    }

    // Backup endpoints (if user has cloud backup feature)
    async uploadBackup(backupData) {
        return this.request('/api/backup/upload', {
            method: 'POST',
            body: JSON.stringify({ data: backupData }),
            critical: true
        });
    }

    async downloadBackup() {
        return this.request('/api/backup/download');
    }

    async listBackups() {
        return this.request('/api/backup/list');
    }

    // Settings sync (minimal settings only)
    async syncSettings(settings) {
        return this.request('/api/settings/sync', {
            method: 'POST',
            body: JSON.stringify(settings)
        });
    }

    async getCloudSettings() {
        return this.request('/api/settings');
    }

    // Device management
    async registerDevice(deviceInfo) {
        return this.request('/api/devices/register', {
            method: 'POST',
            body: JSON.stringify(deviceInfo)
        });
    }

    async getDevices() {
        return this.request('/api/devices');
    }

    async revokeDevice(deviceId) {
        return this.request(`/api/devices/${deviceId}`, {
            method: 'DELETE'
        });
    }

    // Usage tracking for plan limits
    async trackUsage(type, action, data = {}) {
        return this.request('/api/usage/track', {
            method: 'POST',
            body: JSON.stringify({
                type,
                action,
                data,
                timestamp: new Date().toISOString()
            })
        });
    }

    // Get usage stats for current billing period
    async getUsageStats() {
        return this.request('/api/usage/stats');
    }

    // Webhook verification (for receiving subscription updates)
    async verifyWebhook(payload, signature) {
        return this.request('/api/webhooks/verify', {
            method: 'POST',
            body: JSON.stringify({ payload, signature }),
            critical: true
        });
    }

    // Generic methods for custom endpoints
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    // Upload file (for backup or document uploads)
    async uploadFile(endpoint, file, additionalData = {}) {
        const formData = new FormData();
        formData.append('file', file);
        
        // Add additional data
        Object.keys(additionalData).forEach(key => {
            formData.append(key, additionalData[key]);
        });

        return this.request(endpoint, {
            method: 'POST',
            headers: {
                ...(this.token && { 'Authorization': `Bearer ${this.token}` })
                // Don't set Content-Type for FormData
            },
            body: formData
        });
    }

    // Check if server is reachable
    async healthCheck() {
        try {
            const response = await this.request('/api/health', { critical: true });
            return response.ok;
        } catch (error) {
            console.error('Health check failed:', error);
            return false;
        }
    }

    // Get server configuration
    async getServerConfig() {
        return this.request('/api/config');
    }

    // Handle subscription webhooks from Stripe
    handleSubscriptionUpdate(eventData) {
        console.log('Received subscription update:', eventData);
        
        // Update entitlements system
        if (window.entitlementsSystem && eventData.plan && eventData.entitlements) {
            window.entitlementsSystem.handleSubscriptionUpdate(
                eventData.plan, 
                eventData.entitlements
            );
        }
        
        // Refresh user data
        if (window.authSystem) {
            window.authSystem.initializeUserSession();
        }
        
        // Update UI
        showNotification('Your subscription has been updated!', 'success');
    }

    // Send periodic usage stats (for analytics)
    async sendPeriodicUsage() {
        try {
            if (!window.can || !window.can('analytics')) return;

            const usage = await this.collectUsageMetrics();
            await this.sendUsageMetrics(usage);
            
            console.log('Usage metrics sent successfully');
        } catch (error) {
            console.error('Failed to send usage metrics:', error);
        }
    }

    // Collect usage metrics (aggregate data only)
    async collectUsageMetrics() {
        try {
            const metrics = {
                timestamp: new Date().toISOString(),
                period: 'daily',
                data: {
                    transactions_count: (await window.db.getAll('transactions')).length,
                    products_count: (await window.db.getAll('products')).length,
                    employees_count: (await window.db.getAll('employees')).length,
                    inventory_count: (await window.db.getAll('inventory')).length,
                    // Add daily active usage
                    daily_active: true,
                    plan: window.entitlementsSystem?.currentPlan || 'free'
                }
            };
            
            return metrics;
        } catch (error) {
            console.error('Failed to collect usage metrics:', error);
            return null;
        }
    }

    // Setup periodic tasks
    setupPeriodicTasks() {
        // Send usage stats daily
        const sendDaily = () => {
            this.sendPeriodicUsage();
        };
        
        // Send immediately if it's a new day
        const lastSent = localStorage.getItem('lastUsageMetricsSent');
        const today = new Date().toDateString();
        
        if (lastSent !== today) {
            sendDaily();
            localStorage.setItem('lastUsageMetricsSent', today);
        }
        
        // Disable frequent usage metrics for performance
        /* 
        setInterval(() => {
            const now = new Date().toDateString();
            if (localStorage.getItem('lastUsageMetricsSent') !== now) {
                sendDaily();
                localStorage.setItem('lastUsageMetricsSent', now);
            }
        }, 60 * 60 * 1000); // Check every hour
        */
    }
}

// Create global instance
const apiClient = new APIClient();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    await apiClient.init();
    apiClient.setupPeriodicTasks();
});

// Export for use in other modules
window.apiClient = apiClient;

