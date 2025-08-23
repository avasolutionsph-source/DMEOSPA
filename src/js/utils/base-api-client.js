/**
 * Base API Client - Unified API patterns for consistent communication
 * Eliminates duplicate API request/response handling across the application
 */

import { withErrorHandling, ErrorTypes } from './error-handler.js';
import { logDebug, logInfo, logError, logApiError } from './logger-helper.js';

export class BaseAPIClient {
    constructor(config = {}) {
        this.baseUrl = config.baseUrl || this.getDefaultBaseUrl();
        this.timeout = config.timeout || 30000; // 30 seconds
        this.token = config.token || null;
        this.retries = config.retries || 3;
        this.retryDelay = config.retryDelay || 1000;
        
        // Request interceptors
        this.requestInterceptors = [];
        this.responseInterceptors = [];
        
        // Initialize default interceptors
        this.setupDefaultInterceptors();
    }
    
    getDefaultBaseUrl() {
        // Check for unified backend URL from API_CONFIG
        if (typeof window !== 'undefined') {
            if (window.API_CONFIG && window.API_CONFIG.BASE_URL) {
                return window.API_CONFIG.BASE_URL;
            }
        }
        return 'https://ava-pwa-backend.onrender.com';
    }
    
    setupDefaultInterceptors() {
        // Default request interceptor - adds auth token
        this.addRequestInterceptor((config) => {
            if (this.token) {
                config.headers = config.headers || {};
                config.headers['Authorization'] = `Bearer ${this.token}`;
            }
            return config;
        });
        
        // Default response interceptor - handles common error cases
        this.addResponseInterceptor(
            (response) => response, // Success handler
            (error) => { // Error handler
                if (error.response?.status === 401) {
                    this.handleUnauthorized();
                }
                return Promise.reject(error);
            }
        );
    }
    
    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor);
    }
    
    addResponseInterceptor(successInterceptor, errorInterceptor) {
        this.responseInterceptors.push({ success: successInterceptor, error: errorInterceptor });
    }
    
    setToken(token) {
        this.token = token;
        logDebug('API token updated', { category: 'API', operation: 'set_token' });
    }
    
    clearToken() {
        this.token = null;
        logDebug('API token cleared', { category: 'API', operation: 'clear_token' });
    }
    
    handleUnauthorized() {
        logError('Unauthorized request detected', {
            category: 'API',
            operation: 'unauthorized_request',
            data: { action: 'clearing_token' }
        });
        
        this.clearToken();
        
        // Try to show login modal if available
        if (typeof window !== 'undefined') {
            if (window.authSystem && window.authSystem.showLoginModal) {
                window.authSystem.showLoginModal();
            } else if (window.showLoginModal) {
                window.showLoginModal();
            }
        }
    }
    
    async makeRequest(config) {
        const operation = `${config.method?.toUpperCase() || 'GET'} ${config.url}`;
        
        return await withErrorHandling(
            async () => {
                // Apply request interceptors
                for (const interceptor of this.requestInterceptors) {
                    config = interceptor(config) || config;
                }
                
                logDebug(`Making API request: ${operation}`, {
                    category: 'API',
                    operation: 'request_start',
                    data: { url: config.url, method: config.method }
                });
                
                const startTime = Date.now();
                let response;
                let lastError;
                
                // Retry logic
                for (let attempt = 1; attempt <= this.retries; attempt++) {
                    try {
                        response = await this.executeRequest(config);
                        
                        // Apply response interceptors
                        for (const interceptor of this.responseInterceptors) {
                            if (interceptor.success) {
                                response = interceptor.success(response) || response;
                            }
                        }
                        
                        const duration = Date.now() - startTime;
                        logInfo(`API request successful: ${operation}`, {
                            category: 'API',
                            operation: 'request_success',
                            data: { 
                                url: config.url, 
                                method: config.method,
                                duration: `${duration}ms`,
                                attempt
                            }
                        });
                        
                        return response;
                        
                    } catch (error) {
                        lastError = error;
                        
                        // Apply error interceptors
                        for (const interceptor of this.responseInterceptors) {
                            if (interceptor.error) {
                                try {
                                    await interceptor.error(error);
                                } catch (interceptorError) {
                                    logError('Response interceptor error', {
                                        category: 'API',
                                        operation: 'interceptor_error',
                                        error: interceptorError
                                    });
                                }
                            }
                        }
                        
                        // Don't retry on certain errors
                        if (this.shouldNotRetry(error) || attempt === this.retries) {
                            break;
                        }
                        
                        // Wait before retry
                        await this.delay(this.retryDelay * attempt);
                        
                        logDebug(`Retrying API request (${attempt}/${this.retries}): ${operation}`, {
                            category: 'API',
                            operation: 'request_retry',
                            data: { attempt, error: error.message }
                        });
                    }
                }
                
                // Log final error
                logApiError(operation, lastError, {
                    url: config.url,
                    method: config.method,
                    attempts: this.retries
                });
                
                throw lastError;
            },
            {
                category: 'API',
                operation: 'api_request',
                type: ErrorTypes.NETWORK,
                userMessage: 'Network request failed. Please check your connection and try again.'
            }
        );
    }
    
    async executeRequest(config) {
        const url = config.url.startsWith('http') ? config.url : `${this.baseUrl}${config.url}`;
        
        const fetchConfig = {
            method: config.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...config.headers
            },
            signal: AbortSignal.timeout(this.timeout),
            ...config.options
        };
        
        if (config.data && fetchConfig.method !== 'GET') {
            fetchConfig.body = JSON.stringify(config.data);
        }
        
        const response = await fetch(url, fetchConfig);
        
        if (!response.ok) {
            const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
            error.status = response.status;
            error.statusCode = response.status;
            error.response = response;
            
            // Try to get error details from response body
            try {
                const errorData = await response.json();
                error.data = errorData;
                if (errorData.error && errorData.error.message) {
                    error.message = errorData.error.message;
                }
            } catch (parseError) {
                // Response body is not JSON, keep original error
            }
            
            throw error;
        }
        
        // Parse response
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        } else {
            return await response.text();
        }
    }
    
    shouldNotRetry(error) {
        const status = error.status || error.statusCode;
        
        // Don't retry on client errors (4xx) except for specific cases
        if (status >= 400 && status < 500) {
            // Retry on 408 (timeout), 429 (too many requests)
            return status !== 408 && status !== 429;
        }
        
        // Don't retry on network errors that indicate permanent failure
        if (error.name === 'AbortError' || error.name === 'TypeError') {
            return true;
        }
        
        return false;
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Common HTTP methods
    async get(url, config = {}) {
        return this.makeRequest({
            method: 'GET',
            url,
            ...config
        });
    }
    
    async post(url, data = null, config = {}) {
        return this.makeRequest({
            method: 'POST',
            url,
            data,
            ...config
        });
    }
    
    async put(url, data = null, config = {}) {
        return this.makeRequest({
            method: 'PUT',
            url,
            data,
            ...config
        });
    }
    
    async patch(url, data = null, config = {}) {
        return this.makeRequest({
            method: 'PATCH',
            url,
            data,
            ...config
        });
    }
    
    async delete(url, config = {}) {
        return this.makeRequest({
            method: 'DELETE',
            url,
            ...config
        });
    }
    
    // Utility methods
    buildQueryString(params) {
        if (!params || Object.keys(params).length === 0) return '';
        
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                searchParams.append(key, value.toString());
            }
        });
        
        return searchParams.toString();
    }
    
    buildUrlWithParams(url, params) {
        const queryString = this.buildQueryString(params);
        return queryString ? `${url}?${queryString}` : url;
    }
}

// Create default instance
export const apiClient = new BaseAPIClient();

// Resource-specific API classes
export class CRUDAPIClient extends BaseAPIClient {
    constructor(config = {}) {
        super(config);
        this.resourcePath = config.resourcePath;
        
        if (!this.resourcePath) {
            throw new Error('resourcePath is required for CRUDAPIClient');
        }
    }
    
    // Standard CRUD operations
    async list(params = {}) {
        const url = this.buildUrlWithParams(this.resourcePath, params);
        return this.get(url);
    }
    
    async getById(id) {
        return this.get(`${this.resourcePath}/${id}`);
    }
    
    async create(data) {
        return this.post(this.resourcePath, data);
    }
    
    async update(id, data) {
        return this.put(`${this.resourcePath}/${id}`, data);
    }
    
    async partialUpdate(id, data) {
        return this.patch(`${this.resourcePath}/${id}`, data);
    }
    
    async deleteById(id) {
        return this.delete(`${this.resourcePath}/${id}`);
    }
    
    async bulkCreate(items) {
        return this.post(`${this.resourcePath}/bulk`, { items });
    }
    
    async bulkUpdate(updates) {
        return this.put(`${this.resourcePath}/bulk`, { updates });
    }
    
    async bulkDelete(ids) {
        return this.delete(`${this.resourcePath}/bulk`, { 
            data: { ids },
            options: { method: 'DELETE' }
        });
    }
}

export default apiClient;