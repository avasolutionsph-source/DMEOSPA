// Enhanced API Management with Unified Configuration Service
// Provides centralized API URL management with backward compatibility

class APIManager {
    constructor() {
        this.apiUrls = {};
        this.configReady = false;
        this.fallbackMode = false;
        this.defaultUrls = {
            marketing: 'https://ava-marketing-api.onrender.com',
            pwa: 'https://ava-pwa-backend.onrender.com', 
            auth: 'https://ava-marketing-api.onrender.com', // Same as marketing for now
            sync: 'https://ava-marketing-api.onrender.com'  // Same as marketing for now
        };
    }

    async init() {
        // Wait for config service to be ready
        await this.waitForConfigService();
        
        // Load API URLs from configuration
        await this.loadAPIUrls();
        
        console.log('🌐 Enhanced API Manager initialized');
        console.log('📍 API URLs loaded:', this.apiUrls);
    }

    async waitForConfigService() {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds timeout
        
        while (attempts < maxAttempts) {
            if (window.config && window.config.isInitialized) {
                this.configReady = true;
                console.log('✅ API Manager: Config service ready');
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        console.warn('⚠️ API Manager: Config service timeout, using fallback mode');
        this.fallbackMode = true;
    }

    // Enhanced configuration methods with fallbacks
    async getAPIConfig(key, defaultValue = null) {
        if (this.configReady && !this.fallbackMode) {
            try {
                return await window.config.get(key, defaultValue);
            } catch (error) {
                console.warn(`API config error for ${key}, falling back:`, error);
                this.fallbackMode = true;
            }
        }
        
        // Fallback to old methods
        return this.getAPIConfigFallback(key, defaultValue);
    }

    async setAPIConfig(key, value) {
        if (this.configReady && !this.fallbackMode) {
            try {
                const success = await window.config.set(key, value);
                if (success) {
                    // Update local cache
                    if (key === 'apiUrl') {
                        this.apiUrls.marketing = value;
                        this.apiUrls.auth = value;
                        this.apiUrls.sync = value;
                    }
                    return true;
                }
                console.warn(`API config failed for ${key}, falling back`);
                this.fallbackMode = true;
            } catch (error) {
                console.warn(`API config error for ${key}, falling back:`, error);
                this.fallbackMode = true;
            }
        }
        
        // Fallback to old methods
        return this.setAPIConfigFallback(key, value);
    }

    getAPIConfigFallback(key, defaultValue) {
        // Map API config keys to old storage locations
        if (key === 'apiUrl') {
            // Check IndexedDB first if available
            if (window.database) {
                return window.database.get('settings', 'apiUrl')
                    .then(result => result?.value || this.defaultUrls.marketing)
                    .catch(() => this.defaultUrls.marketing);
            }
            return Promise.resolve(this.defaultUrls.marketing);
        }
        
        return Promise.resolve(defaultValue);
    }

    async setAPIConfigFallback(key, value) {
        try {
            if (key === 'apiUrl') {
                // Save to IndexedDB if available
                if (window.database) {
                    await window.database.update('settings', {
                        key: 'apiUrl',
                        value: value
                    });
                }
                
                // Update local cache
                this.apiUrls.marketing = value;
                this.apiUrls.auth = value;
                this.apiUrls.sync = value;
                
                return true;
            }
            return false;
        } catch (error) {
            console.error(`API fallback setter failed for ${key}:`, error);
            return false;
        }
    }

    async loadAPIUrls() {
        try {
            // Load primary API URL (marketing API)
            const primaryUrl = await this.getAPIConfig('apiUrl', this.defaultUrls.marketing);
            
            // Set all URLs (for now they're all the same endpoint)
            this.apiUrls = {
                marketing: primaryUrl,
                auth: primaryUrl,
                sync: primaryUrl,
                pwa: this.defaultUrls.pwa // Keep PWA separate for future use
            };

            console.log('📂 API URLs loaded:', this.apiUrls);

        } catch (error) {
            console.error('Failed to load API URLs, using defaults:', error);
            this.apiUrls = { ...this.defaultUrls };
        }
    }

    // Public API URL getters
    getMarketingAPIUrl() {
        return this.apiUrls.marketing || this.defaultUrls.marketing;
    }

    getAuthAPIUrl() {
        return this.apiUrls.auth || this.defaultUrls.auth;
    }

    getSyncAPIUrl() {
        return this.apiUrls.sync || this.defaultUrls.sync;
    }

    getPWAAPIUrl() {
        return this.apiUrls.pwa || this.defaultUrls.pwa;
    }

    // Generic API URL getter
    getAPIUrl(service = 'marketing') {
        const serviceUrls = {
            marketing: this.getMarketingAPIUrl(),
            auth: this.getAuthAPIUrl(),
            sync: this.getSyncAPIUrl(),
            pwa: this.getPWAAPIUrl()
        };

        return serviceUrls[service] || this.getMarketingAPIUrl();
    }

    // API URL setters with validation
    async setAPIUrl(url, service = 'marketing') {
        try {
            // Validate URL format
            new URL(url); // Throws if invalid
            
            if (service === 'marketing' || service === 'primary') {
                // Setting primary marketing API also updates auth and sync
                await this.setAPIConfig('apiUrl', url);
                this.apiUrls.marketing = url;
                this.apiUrls.auth = url;
                this.apiUrls.sync = url;
                
                console.log(`✅ Primary API URL updated to: ${url}`);
                
                // Notify other systems of the change
                window.dispatchEvent(new CustomEvent('apiUrlChanged', { 
                    detail: { url, service: 'primary' } 
                }));
                
                return true;
            } else {
                // Setting specific service URL
                this.apiUrls[service] = url;
                console.log(`✅ ${service} API URL updated to: ${url}`);
                
                window.dispatchEvent(new CustomEvent('apiUrlChanged', { 
                    detail: { url, service } 
                }));
                
                return true;
            }

        } catch (error) {
            console.error(`Invalid API URL: ${url}`, error);
            return false;
        }
    }

    // Enhanced HTTP methods with automatic URL resolution
    async get(endpoint, options = {}) {
        const service = options.service || 'marketing';
        const baseUrl = this.getAPIUrl(service);
        const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
        
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...this.getAuthHeaders(),
                ...(options.headers || {})
            }
        };

        return this.makeRequest(url, { ...defaultOptions, ...options });
    }

    async post(endpoint, data = null, options = {}) {
        const service = options.service || 'marketing';
        const baseUrl = this.getAPIUrl(service);
        const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
        
        const defaultOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...this.getAuthHeaders(),
                ...(options.headers || {})
            },
            body: data ? JSON.stringify(data) : undefined
        };

        return this.makeRequest(url, { ...defaultOptions, ...options });
    }

    async put(endpoint, data = null, options = {}) {
        const service = options.service || 'marketing';
        const baseUrl = this.getAPIUrl(service);
        const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
        
        const defaultOptions = {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...this.getAuthHeaders(),
                ...(options.headers || {})
            },
            body: data ? JSON.stringify(data) : undefined
        };

        return this.makeRequest(url, { ...defaultOptions, ...options });
    }

    async delete(endpoint, options = {}) {
        const service = options.service || 'marketing';
        const baseUrl = this.getAPIUrl(service);
        const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
        
        const defaultOptions = {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                ...this.getAuthHeaders(),
                ...(options.headers || {})
            }
        };

        return this.makeRequest(url, { ...defaultOptions, ...options });
    }

    // Enhanced request method with retry logic and better error handling
    async makeRequest(url, options = {}) {
        const maxRetries = options.retries || 3;
        const retryDelay = options.retryDelay || 1000;
        let lastError = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🌐 API Request (attempt ${attempt}/${maxRetries}): ${options.method || 'GET'} ${url}`);
                
                const response = await fetch(url, {
                    ...options,
                    timeout: options.timeout || 30000
                });

                // Log response details
                console.log(`📡 API Response: ${response.status} ${response.statusText}`);

                if (response.ok) {
                    const contentType = response.headers.get('content-type');
                    let responseData;

                    if (contentType && contentType.includes('application/json')) {
                        responseData = await response.json();
                    } else {
                        responseData = await response.text();
                    }

                    // Log successful API calls
                    if (window.logger) {
                        window.logger.log({
                            type: 'API',
                            category: 'SUCCESS',
                            level: 'INFO',
                            message: `API call successful: ${options.method || 'GET'} ${url}`,
                            data: {
                                status: response.status,
                                endpoint: url,
                                hasData: !!responseData
                            }
                        });
                    }

                    return {
                        success: true,
                        data: responseData,
                        status: response.status,
                        headers: response.headers
                    };
                } else {
                    // Handle HTTP errors
                    let errorData;
                    try {
                        errorData = await response.json();
                    } catch {
                        errorData = { message: response.statusText };
                    }

                    const error = new Error(`API Error ${response.status}: ${errorData.message || response.statusText}`);
                    error.status = response.status;
                    error.data = errorData;
                    
                    lastError = error;

                    // Don't retry on 4xx errors (client errors)
                    if (response.status >= 400 && response.status < 500) {
                        break;
                    }
                }

            } catch (error) {
                console.error(`API request failed (attempt ${attempt}):`, error);
                lastError = error;

                // Wait before retrying (except on last attempt)
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
                }
            }
        }

        // Log failed API calls
        if (window.logger) {
            window.logger.log({
                type: 'API',
                category: 'ERROR',
                level: 'ERROR',
                message: `API call failed after ${maxRetries} attempts: ${options.method || 'GET'} ${url}`,
                data: {
                    error: lastError.message,
                    endpoint: url,
                    attempts: maxRetries
                }
            });
        }

        return {
            success: false,
            error: lastError.message || 'Network error',
            status: lastError.status || 0,
            data: lastError.data || null
        };
    }

    // Get authentication headers from auth system
    getAuthHeaders() {
        const headers = {};
        
        // Try to get token from enhanced auth system first
        if (window.authSystem && window.authSystem.authToken) {
            headers['Authorization'] = `Bearer ${window.authSystem.authToken}`;
        } else {
            // Fallback to old storage methods
            const token = localStorage.getItem('userToken') || 
                         localStorage.getItem('authToken') || 
                         sessionStorage.getItem('authToken');
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        return headers;
    }

    // Health check methods
    async checkAPIHealth(service = 'marketing') {
        try {
            const baseUrl = this.getAPIUrl(service);
            const response = await this.makeRequest(`${baseUrl}/api/health`, {
                method: 'HEAD',
                timeout: 5000,
                retries: 1
            });

            return {
                service,
                url: baseUrl,
                healthy: response.success,
                status: response.status,
                error: response.error
            };

        } catch (error) {
            return {
                service,
                url: this.getAPIUrl(service),
                healthy: false,
                status: 0,
                error: error.message
            };
        }
    }

    async checkAllAPIsHealth() {
        const services = ['marketing', 'auth', 'sync', 'pwa'];
        const healthChecks = await Promise.all(
            services.map(service => this.checkAPIHealth(service))
        );

        const results = {};
        healthChecks.forEach(check => {
            results[check.service] = {
                healthy: check.healthy,
                url: check.url,
                status: check.status,
                error: check.error
            };
        });

        return results;
    }

    // Migration and testing methods
    async testMigration() {
        console.log('🧪 Testing API manager migration...');
        
        const testResults = {
            configService: this.configReady && !this.fallbackMode,
            urlLoading: false,
            urlSetting: false,
            healthChecks: false
        };

        try {
            // Test 1: URL loading
            const originalUrl = this.getMarketingAPIUrl();
            testResults.urlLoading = !!originalUrl;

            // Test 2: URL setting
            const testUrl = 'https://test-api.example.com';
            const setSuccess = await this.setAPIUrl(testUrl);
            const loadedUrl = this.getMarketingAPIUrl();
            testResults.urlSetting = setSuccess && loadedUrl === testUrl;

            // Restore original URL
            if (originalUrl) {
                await this.setAPIUrl(originalUrl);
            }

            // Test 3: Health checks
            const healthResults = await this.checkAllAPIsHealth();
            testResults.healthChecks = Object.keys(healthResults).length > 0;

            console.log('🧪 API migration test results:', testResults);
            return testResults;

        } catch (error) {
            console.error('API migration test failed:', error);
            return { ...testResults, error: error.message };
        }
    }

    // Utility methods
    validateAPIUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    getConfigSummary() {
        return {
            configMode: this.fallbackMode ? 'fallback' : 'unified',
            configReady: this.configReady,
            apiUrls: { ...this.apiUrls },
            defaultUrls: { ...this.defaultUrls }
        };
    }

    // Backward compatibility methods
    async sendUsageMetrics(metrics) {
        // Enhanced version of the existing sendUsageMetrics method
        try {
            // Check rate limiting
            const lastSent = localStorage.getItem('lastUsageMetricsSent');
            const now = Date.now();
            
            if (lastSent && (now - parseInt(lastSent)) < 24 * 60 * 60 * 1000) {
                console.log('⏭️ Usage metrics already sent today, skipping');
                return { success: true, skipped: true };
            }

            // Send metrics to marketing API
            const response = await this.post('/api/usage/metrics', metrics, {
                service: 'marketing',
                timeout: 10000
            });

            if (response.success) {
                localStorage.setItem('lastUsageMetricsSent', now.toString());
                console.log('📊 Usage metrics sent successfully');
                
                return { success: true, data: response.data };
            } else {
                console.error('📊 Failed to send usage metrics:', response.error);
                return { success: false, error: response.error };
            }

        } catch (error) {
            console.error('📊 Usage metrics error:', error);
            return { success: false, error: error.message };
        }
    }

    // Export API configuration
    async exportAPIConfig() {
        return {
            timestamp: Date.now(),
            date: new Date().toISOString(),
            configMode: this.fallbackMode ? 'fallback' : 'unified',
            apiUrls: { ...this.apiUrls },
            defaultUrls: { ...this.defaultUrls },
            primaryUrl: await this.getAPIConfig('apiUrl')
        };
    }
}

// Initialize enhanced API manager
const apiManager = new APIManager();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        apiManager.init();
    });
} else {
    apiManager.init();
}

// Expose to window for external access
window.apiManager = apiManager;

// For backward compatibility, expose the individual methods
window.sendUsageMetrics = (metrics) => apiManager.sendUsageMetrics(metrics);

// Create a backward-compatible API object
window.api = {
    get: (endpoint, options) => apiManager.get(endpoint, options),
    post: (endpoint, data, options) => apiManager.post(endpoint, data, options),
    put: (endpoint, data, options) => apiManager.put(endpoint, data, options),
    delete: (endpoint, options) => apiManager.delete(endpoint, options),
    getUrl: (service) => apiManager.getAPIUrl(service),
    setUrl: (url, service) => apiManager.setAPIUrl(url, service),
    checkHealth: (service) => apiManager.checkAPIHealth(service)
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIManager;
}