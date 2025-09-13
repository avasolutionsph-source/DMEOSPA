// API Configuration for Ava Solutions PWA
// Centralized configuration for unified backend connection

(function() {
    'use strict';
    
    // Determine environment
    const isProduction = window.location.hostname !== 'localhost' && 
                        window.location.hostname !== '127.0.0.1';
    
    // API Configuration
    const API_CONFIG = {
        // Base URLs
        BASE_URL: isProduction 
            ? 'https://daetspa-backend.onrender.com'
            : 'http://localhost:4001',
        
        // WebSocket URL for real-time updates
        WS_URL: isProduction
            ? 'wss://daetspa-backend.onrender.com'
            : 'ws://localhost:4001',
        
        // API Version
        API_VERSION: 'v1',
        
        // Timeout settings
        TIMEOUT: 30000, // 30 seconds
        SYNC_TIMEOUT: 60000, // 60 seconds for sync operations
        
        // Retry configuration
        MAX_RETRIES: 3,
        RETRY_DELAY: 1000, // Start with 1 second, exponential backoff
        
        // Cache settings
        CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
        
        // Feature flags
        ENABLE_WEBSOCKETS: false, // Disabled until backend supports it
        ENABLE_OFFLINE_SYNC: true,
        ENABLE_STATE_PERSISTENCE: true,
        
        // Authentication
        AUTH_HEADER: 'Authorization',
        AUTH_PREFIX: 'Bearer',
        
        // API Endpoints
        ENDPOINTS: {
            // Authentication
            AUTH: {
                LOGIN: '/api/auth/login',
                REGISTER: '/api/auth/register',
                LOGOUT: '/api/auth/logout',
                REFRESH: '/api/auth/refresh',
                VERIFY: '/api/auth/verify',
                FORGOT_PASSWORD: '/api/auth/forgot-password',
                RESET_PASSWORD: '/api/auth/reset-password'
            },
            
            // User
            USER: {
                PROFILE: '/api/user/profile',
                UPDATE: '/api/user/update',
                SETTINGS: '/api/user/settings',
                BUSINESS_NAME: '/api/user/business-name'
            },
            
            // Business
            BUSINESS: {
                INFO: '/api/business',
                UPDATE: '/api/business/update',
                SETTINGS: '/api/business/settings',
                EMPLOYEES: '/api/business/employees',
                BRANCHES: '/api/business/branches'
            },
            
            // Sync endpoints
            SYNC: {
                STATUS: '/api/sync/status',
                FULL: '/api/sync/full',
                CHANGES: '/api/sync/changes',
                PUSH: '/api/sync/push',
                PRODUCTS: '/api/sync/products',
                INVENTORY: '/api/sync/inventory',
                EMPLOYEES: '/api/sync/employees',
                TRANSACTIONS: '/api/sync/transactions',
                RESOLVE: '/api/sync/resolve',
                HISTORY: '/api/sync/history'
            },
            
            // Data endpoints
            DATA: {
                PRODUCTS: '/api/products',
                INVENTORY: '/api/inventory',
                EMPLOYEES: '/api/employees',
                TRANSACTIONS: '/api/transactions',
                CUSTOMERS: '/api/customers',
                SUPPLIERS: '/api/suppliers',
                CATEGORIES: '/api/categories'
            },
            
            // Analytics
            ANALYTICS: {
                DASHBOARD: '/api/analytics/dashboard',
                SALES: '/api/analytics/sales',
                INVENTORY: '/api/analytics/inventory',
                PERFORMANCE: '/api/analytics/performance'
            },
            
            // Real-time
            REALTIME: {
                CONNECT: '/api/realtime/connect',
                SUBSCRIBE: '/api/realtime/subscribe',
                UNSUBSCRIBE: '/api/realtime/unsubscribe'
            },
            
            // Health
            HEALTH: '/health',
            VERSION: '/api/version'
        }
    };
    
    // Helper function to build full URL
    API_CONFIG.buildUrl = function(endpoint, params = {}) {
        let url = this.BASE_URL + endpoint;
        
        // Add query parameters if provided
        if (Object.keys(params).length > 0) {
            const queryString = new URLSearchParams(params).toString();
            url += '?' + queryString;
        }
        
        return url;
    };
    
    // Helper function to get auth header
    API_CONFIG.getAuthHeader = function() {
        const token = this.getToken();
        if (token) {
            return {
                [this.AUTH_HEADER]: `${this.AUTH_PREFIX} ${token}`
            };
        }
        return {};
    };
    
    // Get stored JWT token
    API_CONFIG.getToken = function() {
        // Try StateManager first
        if (window.StateManager && window.StateManager.initialized) {
            const token = window.StateManager.getState('auth.authToken');
            if (token) return token;
        }
        
        // Fallback to localStorage
        return localStorage.getItem('authToken') || 
               localStorage.getItem('userToken') ||
               sessionStorage.getItem('authToken');
    };
    
    // Store JWT token
    API_CONFIG.setToken = function(token) {
        // Update StateManager if available
        if (window.StateManager && window.StateManager.initialized) {
            window.StateManager.setState('auth.authToken', token);
        }
        
        // Also store in localStorage for persistence
        localStorage.setItem('authToken', token);
    };
    
    // Clear JWT token
    API_CONFIG.clearToken = function() {
        // Clear from StateManager
        if (window.StateManager && window.StateManager.initialized) {
            window.StateManager.setState('auth.authToken', null);
        }
        
        // Clear from storage
        localStorage.removeItem('authToken');
        localStorage.removeItem('userToken');
        sessionStorage.removeItem('authToken');
    };
    
    // Make API request with retry logic
    API_CONFIG.request = async function(endpoint, options = {}) {
        const url = this.buildUrl(endpoint, options.params);
        
        const config = {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...this.getAuthHeader(),
                ...options.headers
            },
            credentials: 'include' // Include cookies for session
        };
        
        if (options.body) {
            config.body = JSON.stringify(options.body);
        }
        
        // Add timeout
        const timeout = options.timeout || this.TIMEOUT;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        config.signal = controller.signal;
        
        let lastError;
        for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
            try {
                const response = await fetch(url, config);
                clearTimeout(timeoutId);
                
                // Handle 401 Unauthorized - token might be expired
                if (response.status === 401 && attempt === 0) {
                    // Try to refresh token
                    const refreshed = await this.refreshToken();
                    if (refreshed) {
                        // Retry with new token
                        config.headers = {
                            ...config.headers,
                            ...this.getAuthHeader()
                        };
                        continue;
                    }
                }
                
                if (!response.ok) {
                    const error = await response.json().catch(() => ({}));
                    throw new Error(error.message || `HTTP ${response.status}`);
                }
                
                return await response.json();
                
            } catch (error) {
                lastError = error;
                
                // Don't retry on client errors (4xx)
                if (error.message && error.message.includes('HTTP 4')) {
                    throw error;
                }
                
                // Exponential backoff for retries
                if (attempt < this.MAX_RETRIES - 1) {
                    await new Promise(resolve => 
                        setTimeout(resolve, this.RETRY_DELAY * Math.pow(2, attempt))
                    );
                    
                    if (window.logger) {
                        window.logger.warn(`API retry attempt ${attempt + 1}`, {
                            category: 'API',
                            endpoint,
                            error: error.message
                        });
                    }
                }
            }
        }
        
        throw lastError;
    };
    
    // Refresh authentication token
    API_CONFIG.refreshToken = async function() {
        try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) return false;
            
            const response = await fetch(this.buildUrl(this.ENDPOINTS.AUTH.REFRESH), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                this.setToken(data.token);
                return true;
            }
        } catch (error) {
            if (window.logger) {
                window.logger.error('Token refresh failed', {
                    category: 'AUTH',
                    error: error.message
                });
            }
        }
        
        return false;
    };
    
    // Check API health
    API_CONFIG.checkHealth = async function() {
        try {
            const response = await fetch(this.buildUrl(this.ENDPOINTS.HEALTH), {
                method: 'GET',
                timeout: 5000
            });
            
            if (response.ok) {
                const data = await response.json();
                return {
                    healthy: true,
                    ...data
                };
            }
        } catch (error) {
            if (window.logger) {
                window.logger.error('API health check failed', {
                    category: 'API',
                    error: error.message
                });
            }
        }
        
        return {
            healthy: false,
            error: 'API unreachable'
        };
    };
    
    // Initialize WebSocket connection
    API_CONFIG.initWebSocket = function() {
        if (!this.ENABLE_WEBSOCKETS) return null;
        
        try {
            const socket = io(this.WS_URL, {
                auth: {
                    token: this.getToken()
                },
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionAttempts: 5
            });
            
            socket.on('connect', () => {
                if (window.logger) {
                    window.logger.info('WebSocket connected', {
                        category: 'REALTIME',
                        socketId: socket.id
                    });
                }
                
                // Authenticate socket
                socket.emit('authenticate', this.getToken());
            });
            
            socket.on('disconnect', (reason) => {
                if (window.logger) {
                    window.logger.warn('WebSocket disconnected', {
                        category: 'REALTIME',
                        reason
                    });
                }
            });
            
            socket.on('error', (error) => {
                if (window.logger) {
                    window.logger.error('WebSocket error', {
                        category: 'REALTIME',
                        error: error.message
                    });
                }
            });
            
            return socket;
        } catch (error) {
            if (window.logger) {
                window.logger.error('WebSocket initialization failed', {
                    category: 'REALTIME',
                    error: error.message
                });
            }
            return null;
        }
    };
    
    // Export to window
    window.API_CONFIG = API_CONFIG;
    
    // Log initialization
    if (window.logger) {
        window.logger.info('API Configuration initialized', {
            category: 'API',
            baseUrl: API_CONFIG.BASE_URL,
            wsUrl: API_CONFIG.WS_URL,
            environment: isProduction ? 'production' : 'development'
        });
    } else {
        console.log('API Configuration initialized:', API_CONFIG.BASE_URL);
    }
})();