/**
 * HybridAPIClient - Unified API Layer with Offline Support
 * Handles online/offline detection, caching, and request queuing
 */

class HybridAPIClient {
    constructor() {
        this.baseURL = window.API_CONFIG?.BASE_URL || 'https://daetspa-backend.onrender.com';
        this.localBaseURL = 'https://daetspa-backend.onrender.com';
        this.isOnline = navigator.onLine;
        this.requestQueue = [];
        this.cache = new Map(); // In-memory cache for quick access
        this.cacheTTL = {
            employees: 5 * 60 * 1000,    // 5 minutes
            products: 10 * 60 * 1000,    // 10 minutes
            inventory: 2 * 60 * 1000,    // 2 minutes
            transactions: 30 * 1000,     // 30 seconds
            customers: 15 * 60 * 1000,   // 15 minutes
            settings: 60 * 60 * 1000     // 1 hour
        };
        
        // Store bound event handlers for cleanup
        this.eventHandlers = {
            online: null,
            offline: null,
            beforeunload: null,
            visibilitychange: null
        };
        
        this.isDestroyed = false;
        this.init();
    }

    init() {
        // Store bound event handlers for proper cleanup
        this.eventHandlers.online = () => {
            if (this.isDestroyed) return;
            this.isOnline = true;
            console.log('🌐 Connection restored - processing queued requests');
            this.updateOfflineIndicator();
            this.processRequestQueue();
        };

        this.eventHandlers.offline = () => {
            if (this.isDestroyed) return;
            this.isOnline = false;
            console.log('📱 Offline mode activated');
            this.updateOfflineIndicator();
        };

        this.eventHandlers.beforeunload = () => {
            this.cleanup();
        };

        this.eventHandlers.visibilitychange = () => {
            if (this.isDestroyed) return;
            if (document.visibilityState === 'hidden') {
                this.persistRequestQueue();
            }
        };

        // Add event listeners
        window.addEventListener('online', this.eventHandlers.online);
        window.addEventListener('offline', this.eventHandlers.offline);
        window.addEventListener('beforeunload', this.eventHandlers.beforeunload);
        document.addEventListener('visibilitychange', this.eventHandlers.visibilitychange);

        // Initialize with current online status
        this.isOnline = navigator.onLine;
        this.updateOfflineIndicator();
        
        // Listen for token changes (login/logout events)
        this.setupTokenChangeListener();
    }

    /**
     * Cleanup method to remove event listeners and prevent memory leaks
     */
    cleanup() {
        if (this.isDestroyed) return;
        
        this.isDestroyed = true;
        
        // Remove all event listeners
        if (this.eventHandlers.online) {
            window.removeEventListener('online', this.eventHandlers.online);
        }
        if (this.eventHandlers.offline) {
            window.removeEventListener('offline', this.eventHandlers.offline);
        }
        if (this.eventHandlers.beforeunload) {
            window.removeEventListener('beforeunload', this.eventHandlers.beforeunload);
        }
        if (this.eventHandlers.visibilitychange) {
            document.removeEventListener('visibilitychange', this.eventHandlers.visibilitychange);
        }
        
        // Clear caches and queues
        this.cache.clear();
        this.requestQueue = [];
        
        // Clear any pending timeouts
        if (this.queueProcessingTimer) {
            clearTimeout(this.queueProcessingTimer);
        }
        if (this.cacheCleanupTimer) {
            clearTimeout(this.cacheCleanupTimer);
        }
        
        console.log('🧹 HybridAPIClient cleanup completed');
    }

    /**
     * Destructor method for manual cleanup
     */
    destroy() {
        this.cleanup();
    }

    /**
     * Main request method - handles online/offline logic
     */
    async request(endpoint, options = {}) {
        const {
            method = 'GET',
            data = null,
            headers = {},
            cacheKey = null,
            cacheTTL = null,
            offlineFirst = false,
            critical = false
        } = options;

        const url = this.getFullURL(endpoint);
        const requestId = this.generateRequestId(endpoint, method, data);

        try {
            // For critical operations, try online first even in offline-first mode
            // Double-check navigator.onLine status for accuracy
            const actuallyOnline = this.isOnline && navigator.onLine;
            
            if (actuallyOnline && (!offlineFirst || critical)) {
                console.log(`🌐 [HybridAPIClient] Attempting online request to ${endpoint}`);
                return await this.makeOnlineRequest(url, {
                    method,
                    data,
                    headers,
                    cacheKey,
                    cacheTTL,
                    requestId
                });
            } else {
                console.log(`📴 [HybridAPIClient] Device offline (isOnline: ${this.isOnline}, navigator.onLine: ${navigator.onLine}) for ${endpoint}`);
            }

            // Try offline fallback
            if (method === 'GET' && cacheKey) {
                const cachedData = await this.getCachedData(cacheKey);
                if (cachedData) {
                    console.log(`📱 Offline: Using cached data for ${cacheKey}`);
                    return { success: true, data: cachedData, source: 'cache' };
                }
            }

            // If no cache and online, try online request
            if (this.isOnline && navigator.onLine) {
                return await this.makeOnlineRequest(url, {
                    method,
                    data,
                    headers,
                    cacheKey,
                    cacheTTL,
                    requestId
                });
            }

            // Completely offline - queue request if it's a mutation
            if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
                console.log(`📱 Offline: Queuing ${method} request to ${endpoint}`);
                this.queueRequest(endpoint, { method, data, headers, cacheKey, requestId });
                return { success: true, queued: true, requestId };
            }

            // No cache available and offline
            throw new Error(`No cached data available for ${endpoint} while offline`);

        } catch (error) {
            console.error(`❌ Request failed for ${endpoint}:`, error);
            
            // Try cache as last resort for GET requests
            if (method === 'GET' && cacheKey) {
                const cachedData = await this.getCachedData(cacheKey, true); // Force get old cache
                if (cachedData) {
                    console.log(`📱 Error fallback: Using stale cache for ${cacheKey}`);
                    return { success: true, data: cachedData, source: 'stale_cache' };
                }
            }

            // If network failed and we have a mutation request, queue it for offline sync
            if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
                console.log(`📱 Network error - queuing ${method} request to ${endpoint} for offline sync`);
                this.queueRequest(endpoint, { method, data, headers, cacheKey, requestId });
                return { success: false, queued: true, requestId, error: 'Queued for sync when online' };
            }

            return { success: false, error: error.message };
        }
    }

    /**
     * Make actual online request
     */
    async makeOnlineRequest(url, options) {
        const { method, data, headers, cacheKey, cacheTTL, requestId } = options;

        let authToken = this.getAuthToken();
        
        // If no token found, wait up to 5 seconds for it to appear (fixes race condition after login)
        if (!authToken) {
            console.log('⏳ [REQUEST] No auth token yet, waiting for authentication to complete...');
            let attempts = 0;
            const maxAttempts = 10; // 10 attempts * 500ms = 5 seconds max wait
            
            while (!authToken && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 500));
                authToken = this.getAuthToken();
                attempts++;
                
                if (authToken) {
                    console.log('✅ [REQUEST] Auth token found after waiting', (attempts * 500) + 'ms');
                }
            }
            
            if (!authToken) {
                // Only log this error once per session to avoid spam
                if (!this._authErrorLogged) {
                    console.error('❌ [REQUEST] Cannot make request - no auth token available after 5 second wait');
                    this._authErrorLogged = true;
                    
                    // Reset the flag after 30 seconds to allow re-logging if issue persists
                    setTimeout(() => { this._authErrorLogged = false; }, 30000);
                }
                throw new Error('Authentication token required for API requests');
            }
        }

        console.log('🌐 [REQUEST] Making online request:', {
            url,
            method,
            authToken: authToken ? authToken.substring(0, 20) + '...' : 'NONE',
            cacheKey,
            requestId,
            actuallyOnline: this.isOnline && navigator.onLine
        });

        const requestOptions = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
                ...headers
            }
        };

        if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
            requestOptions.body = JSON.stringify(data);
        }

        // Add timeout to prevent hanging when offline
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        requestOptions.signal = controller.signal;

        try {
            console.log('🔄 [REQUEST] About to make fetch request to:', url);
            console.log('🔄 [REQUEST] Request options:', {
                method: requestOptions.method,
                headers: {
                    ...requestOptions.headers,
                    'Authorization': requestOptions.headers.Authorization ? 'Bearer [TOKEN]' : 'NONE'
                },
                hasBody: !!requestOptions.body
            });
            
            const response = await fetch(url, requestOptions);
            clearTimeout(timeoutId);
            
            console.log('📡 [RESPONSE] Received response:', {
                url,
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                headers: Object.fromEntries(response.headers.entries())
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ [RESPONSE] Error response body:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }

            const result = await response.json();
            
            console.log('📊 [RESPONSE] Parsed result:', {
                success: result.success,
                dataType: Array.isArray(result.data) ? `array[${result.data.length}]` : typeof result.data,
                error: result.error,
                message: result.message,
                actualData: result.data ? (Array.isArray(result.data) ? result.data.slice(0, 2) : result.data) : null  // Show first 2 items for debugging
            });
            
            // SPECIAL DEBUG: Log business/employees responses in detail
            if (url.includes('/business/employees')) {
                console.log('👥 [BUSINESS-EMPLOYEES] Raw backend response:', result);
                console.log('👥 [BUSINESS-EMPLOYEES] Response structure:', {
                    hasEmployees: !!result.employees,
                    employeesCount: result.employees?.length || 0,
                    hasTotalEmployees: !!result.totalEmployees,
                    responseKeys: Object.keys(result),
                    firstEmployee: result.employees?.[0]
                });
                
                // CRITICAL FIX: business/employees doesn't return standard {success, data} format
                // Convert to standard format here
                if (result.employees && !result.success) {
                    console.log('🔧 [BUSINESS-EMPLOYEES] Converting to standard response format');
                    const standardResponse = {
                        success: true,
                        data: result.employees,  // Extract the employees array directly as data
                        source: 'api'
                    };
                    console.log('✅ [BUSINESS-EMPLOYEES] Converted response:', standardResponse);
                    console.log('✅ [BUSINESS-EMPLOYEES] Extracted employees count:', result.employees?.length);
                    
                    // Cache the employees array directly
                    if (method === 'GET' && cacheKey) {
                        await this.setCachedData(cacheKey, result.employees, cacheTTL);
                        console.log('💾 [CACHE] Cached employees array for:', cacheKey);
                    }
                    
                    return standardResponse;  // Return immediately to avoid double processing
                }
            }
            
            // Cache successful GET responses (skip if already cached above)
            if (method === 'GET' && result.success && cacheKey && !url.includes('/business/employees')) {
                await this.setCachedData(cacheKey, result.data, cacheTTL);
                console.log('💾 [CACHE] Cached result for:', cacheKey);
            }

            return result;
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                console.warn(`⏰ Request timeout after 10s for ${url}`);
                throw new Error('Request timeout - possibly offline');
            }
            throw error;
        }
    }

    /**
     * Cache management methods
     */
    async getCachedData(cacheKey, forceOld = false) {
        if (!window.db) {
            console.warn('⚠️ Database not available for caching');
            return null;
        }

        try {
            // Check in-memory cache first
            const memoryCache = this.cache.get(cacheKey);
            if (memoryCache && !forceOld) {
                const age = Date.now() - memoryCache.timestamp;
                const ttl = this.cacheTTL[cacheKey] || 5 * 60 * 1000; // Default 5 min
                
                if (age < ttl) {
                    return memoryCache.data;
                }
            }

            // Check IndexedDB cache
            const cacheEntry = await window.db.get('cache', cacheKey);
            if (cacheEntry) {
                const age = Date.now() - cacheEntry.timestamp;
                const ttl = this.cacheTTL[cacheKey] || 5 * 60 * 1000;
                
                if (age < ttl || forceOld) {
                    // Update in-memory cache
                    this.cache.set(cacheKey, {
                        data: cacheEntry.data,
                        timestamp: cacheEntry.timestamp
                    });
                    return cacheEntry.data;
                }
            }

            return null;
        } catch (error) {
            console.error('❌ Cache read error:', error);
            return null;
        }
    }

    async setCachedData(cacheKey, data, customTTL = null) {
        const timestamp = Date.now();
        
        try {
            // Set in-memory cache
            this.cache.set(cacheKey, { data, timestamp });

            // Set IndexedDB cache
            if (window.db) {
                await window.db.update('cache', {
                    id: cacheKey,
                    data,
                    timestamp,
                    ttl: customTTL || this.cacheTTL[cacheKey] || 5 * 60 * 1000
                });
            }
        } catch (error) {
            console.error('❌ Cache write error:', error);
        }
    }
    
    /**
     * Cache invalidation methods
     */
    async clearCache(cacheKey) {
        try {
            // Remove from in-memory cache
            this.cache.delete(cacheKey);
            
            // Remove from IndexedDB cache
            if (window.db) {
                await window.db.delete('cache', cacheKey);
            }
            
            console.log(`🗑️ [CACHE] Cleared cache for: ${cacheKey}`);
        } catch (error) {
            console.error('❌ Cache clear error:', error);
        }
    }
    
    async invalidateTransactionCache() {
        console.log('🔄 [CACHE] Invalidating transaction-related caches');
        await this.clearCache('transactions');
        await this.clearCache('dashboard_stats');
        await this.clearCache('employee_stats');
    }

    /**
     * Request queue management for offline operations
     */
    queueRequest(endpoint, options) {
        const queueEntry = {
            id: this.generateRequestId(endpoint, options.method, options.data),
            endpoint,
            options,
            timestamp: Date.now(),
            retries: 0
        };

        this.requestQueue.push(queueEntry);
        console.log(`📥 [HybridAPIClient] Queued request: ${queueEntry.id} for ${options.method} ${endpoint}`);
        
        // Persist queue to IndexedDB
        this.persistRequestQueue();
        
        return queueEntry.id; // Return the ID for debugging
    }

    async processRequestQueue() {
        if (!this.isOnline || this.requestQueue.length === 0) {
            return;
        }

        console.log(`🔄 Processing ${this.requestQueue.length} queued requests in parallel batches`);
        
        // Process requests in parallel batches for better performance
        const BATCH_SIZE = 5; // Process 5 requests simultaneously
        const processedRequests = [];
        
        // Group requests into batches
        for (let i = 0; i < this.requestQueue.length; i += BATCH_SIZE) {
            const batch = this.requestQueue.slice(i, i + BATCH_SIZE);
            console.log(`📦 Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(this.requestQueue.length/BATCH_SIZE)} (${batch.length} requests)`);
            
            // Process all requests in current batch simultaneously
            const batchResults = await Promise.allSettled(
                batch.map(async (queueEntry) => {
                    try {
                        const result = await this.request(queueEntry.endpoint, {
                            ...queueEntry.options,
                            critical: true // Force online for queued requests
                        });

                        if (result.success) {
                            console.log(`✅ Processed queued request: ${queueEntry.endpoint}`);
                            return { success: true, queueEntry };
                        } else {
                            queueEntry.retries++;
                            if (queueEntry.retries >= 3) {
                                console.error(`❌ Failed to process queued request after 3 retries: ${queueEntry.endpoint}`);
                                return { success: false, queueEntry, remove: true };
                            }
                            return { success: false, queueEntry, remove: false };
                        }
                    } catch (error) {
                        queueEntry.retries++;
                        console.error(`❌ Error processing queued request: ${queueEntry.endpoint}`, error);
                        
                        if (queueEntry.retries >= 3) {
                            return { success: false, queueEntry, remove: true, error };
                        }
                        return { success: false, queueEntry, remove: false, error };
                    }
                })
            );

            // Process batch results
            batchResults.forEach((result) => {
                if (result.status === 'fulfilled') {
                    const { success, queueEntry, remove } = result.value;
                    if (success || remove) {
                        processedRequests.push(queueEntry);
                    }
                } else {
                    console.error('Unexpected error in batch processing:', result.reason);
                }
            });

            // Add small delay between batches to prevent overwhelming the server
            if (i + BATCH_SIZE < this.requestQueue.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        // Remove processed requests from queue
        this.requestQueue = this.requestQueue.filter(
            req => !processedRequests.find(processed => processed.id === req.id)
        );

        await this.persistRequestQueue();
        
        console.log(`✅ Batch processing complete. ${processedRequests.length} requests processed, ${this.requestQueue.length} remaining`);
        
        // If we processed any transaction requests, refresh UI data
        const processedTransactions = processedRequests.filter(req => 
            req.endpoint.includes('/transactions')
        );
        
        if (processedTransactions.length > 0) {
            console.log(`🔄 Processed ${processedTransactions.length} offline transactions, refreshing UI`);
            
            // Clean up local offline transactions that were successfully synced
            for (const txnRequest of processedTransactions) {
                try {
                    if (window.db && txnRequest.id) {
                        // Try to find and mark the local transaction as synced instead of deleting
                        const localTransaction = await window.db.get('transactions', txnRequest.id);
                        if (localTransaction && (localTransaction.isOffline || localTransaction.syncStatus === 'pending')) {
                            // Mark as synced
                            localTransaction.syncStatus = 'synced';
                            localTransaction.isOffline = false;
                            await window.db.update('transactions', localTransaction);
                            console.log(`✅ Marked local transaction as synced: ${txnRequest.id}`);
                        }
                    }
                } catch (error) {
                    console.warn('⚠️ Failed to update local transaction sync status:', error);
                }
            }
            
            // Refresh dashboard and employee data
            setTimeout(async () => {
                // Refresh dashboard if loaded
                if (window.loadDashboard) {
                    try {
                        await window.loadDashboard();
                        console.log('✅ Dashboard refreshed after sync');
                    } catch (error) {
                        console.warn('⚠️ Failed to refresh dashboard after sync:', error);
                    }
                }
                
                // Refresh employee statistics if loaded  
                if (window.employeeManager) {
                    try {
                        await window.employeeManager.displayEmployees();
                        console.log('✅ Employee statistics refreshed after sync');
                    } catch (error) {
                        console.warn('⚠️ Failed to refresh employee statistics after sync:', error);
                    }
                }
            }, 1000); // Small delay to ensure API data is fresh
        }
    }

    async persistRequestQueue() {
        try {
            if (window.db) {
                await window.db.update('requestQueue', {
                    id: 'main',
                    queue: this.requestQueue,
                    timestamp: Date.now()
                });
            }
        } catch (error) {
            console.error('❌ Failed to persist request queue:', error);
        }
    }

    async loadRequestQueue() {
        try {
            if (window.db) {
                const queueData = await window.db.get('requestQueue', 'main');
                if (queueData && queueData.queue) {
                    this.requestQueue = queueData.queue;
                    console.log(`📥 Loaded ${this.requestQueue.length} queued requests`);
                }
            }
        } catch (error) {
            console.error('❌ Failed to load request queue:', error);
        }
    }

    /**
     * Utility methods
     */
    getFullURL(endpoint) {
        // Prefer localhost in development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return `${this.localBaseURL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
        }
        return `${this.baseURL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    }

    getAuthToken() {
        // ENHANCED: PRIORITY ORDER: JWT tokens from login → cached auth tokens → TokenManager fallback → development tokens
        
        // 1. Check for JWT tokens from login (highest priority)
        const jwtToken = localStorage.getItem('jwtToken') || 
                        sessionStorage.getItem('jwtToken') ||
                        localStorage.getItem('jwt_token') ||
                        sessionStorage.getItem('jwt_token');
        
        // 2. Check for regular auth tokens 
        const authToken = localStorage.getItem('authToken') || 
                         sessionStorage.getItem('authToken') ||
                         localStorage.getItem('userToken') ||
                         sessionStorage.getItem('userToken');
        
        // 3. Select the best token (JWT has priority)
        let token = jwtToken || authToken;
        
        // ENHANCED: 4. Fallback to TokenManager (NEW - safe fallback)
        if (!token && window.tokenManager) {
            token = window.tokenManager.getAuthToken();
            if (token) {
                console.log('🔄 [HYBRID-AUTH] Using token from TokenManager fallback');
            }
        }
        
        console.log('🔐 [HYBRID-AUTH] Token priority check:', {
            jwtToken: !!jwtToken,
            authToken: !!authToken,
            tokenManagerFallback: !!(window.tokenManager && !jwtToken && !authToken && token),
            selectedToken: token ? token.substring(0, 30) + '...' : 'NONE',
            tokenType: jwtToken ? 'JWT' : authToken ? 'AUTH' : token ? 'TOKENMANAGER' : 'NONE',
            isDevelopment: token && token.startsWith('dev-token-')
        });
        
        // ENHANCED: Better error messaging and guidance
        if (!token) {
            const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            
            if (isDevelopment) {
                console.log('🚨 [HYBRID-AUTH] No authentication token available in development');
                console.log('💡 [HYBRID-AUTH] Options to fix this:');
                console.log('   1. Login through marketing site: http://localhost:3003/login');
                console.log('   2. Set development token: setDevelopmentToken("your-user-id")');
                console.log('   3. Debug tokens: debugTokens()');
            } else {
                console.log('🚨 [HYBRID-AUTH] No authentication token available');
                console.log('💡 [HYBRID-AUTH] Please login through the marketing website first');
            }
            
            // Show user-friendly error if possible
            this.showAuthError();
        }
        
        // 5. Log final token selection
        console.log('✅ [HYBRID-AUTH] Final token selected:', {
            hasToken: !!token,
            tokenType: token ? (token.startsWith('dev-token-') ? 'DEVELOPMENT' : 'PRODUCTION') : 'NONE',
            tokenLength: token ? token.length : 0,
            tokenPreview: token ? token.substring(0, 50) + '...' : 'NONE'
        });
        
        return token || '';
    }
    
    /**
     * Debug method to show all available tokens
     */
    debugAllTokens() {
        console.log('🔍 [TOKEN-DEBUG] All available tokens:', {
            'localStorage.jwtToken': localStorage.getItem('jwtToken'),
            'sessionStorage.jwtToken': sessionStorage.getItem('jwtToken'),
            'localStorage.jwt_token': localStorage.getItem('jwt_token'),
            'sessionStorage.jwt_token': sessionStorage.getItem('jwt_token'),
            'localStorage.authToken': localStorage.getItem('authToken'),
            'sessionStorage.authToken': sessionStorage.getItem('authToken'),
            'localStorage.userToken': localStorage.getItem('userToken'),
            'sessionStorage.userToken': sessionStorage.getItem('userToken'),
        });
        
        const finalToken = this.getAuthToken();
        console.log('🎯 [TOKEN-DEBUG] Final selected token:', {
            token: finalToken ? finalToken.substring(0, 50) + '...' : 'NONE',
            fullLength: finalToken ? finalToken.length : 0,
            isDevelopmentToken: finalToken ? finalToken.startsWith('dev-token-') : false
        });
        
        return finalToken;
    }
    
    /**
     * Diagnostic method to test employee API directly
     */
    async testEmployeesAPI() {
        console.log('🧪 [DIAGNOSTIC] Testing employees API directly...');
        
        const token = this.getAuthToken();
        console.log('🔐 [DIAGNOSTIC] Using token:', token ? token.substring(0, 30) + '...' : 'NONE');
        
        if (!token) {
            console.error('❌ [DIAGNOSTIC] No token available for test');
            return { success: false, error: 'No authentication token' };
        }
        
        const url = this.getFullURL('/api/employees');
        console.log('🌐 [DIAGNOSTIC] Testing URL:', url);
        
        try {
            // Test with a simple fetch call
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-cache'
                }
            });
            
            console.log('📡 [DIAGNOSTIC] Response received:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                headers: Object.fromEntries(response.headers.entries())
            });
            
            const result = await response.json();
            console.log('📊 [DIAGNOSTIC] Response data:', {
                success: result.success,
                dataCount: result.data?.length || 0,
                error: result.error,
                sampleData: result.data?.slice(0, 2)
            });
            
            return result;
        } catch (error) {
            console.error('❌ [DIAGNOSTIC] Test failed:', error);
            return { success: false, error: error.message };
        }
    }

    generateRequestId(endpoint, method, data) {
        // Create a more unique ID for offline operations
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const content = `${method}-${endpoint}-${timestamp}`;
        
        // For transactions, use a more descriptive prefix
        if (endpoint.includes('/transactions')) {
            return `offline-txn-${timestamp}-${random}`;
        }
        
        // For other requests, use the hash approach but with better uniqueness
        const hash = btoa(content).replace(/[+/=]/g, '').substring(0, 12);
        return `offline-${hash}-${random}`;
    }

    /**
     * Convenience methods for common operations
     */
    async get(endpoint, cacheKey = null, options = {}) {
        return this.request(endpoint, {
            method: 'GET',
            cacheKey,
            ...options
        });
    }

    async post(endpoint, data, options = {}) {
        return this.request(endpoint, {
            method: 'POST',
            data,
            ...options
        });
    }

    async put(endpoint, data, options = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            data,
            ...options
        });
    }

    async delete(endpoint, options = {}) {
        return this.request(endpoint, {
            method: 'DELETE',
            ...options
        });
    }

    /**
     * Data-specific convenience methods
     */
    async getEmployees(options = {}) {
        console.log('👥 [HYBRID-API] getEmployees() called with options:', options);
        const authToken = this.getAuthToken();
        console.log('🔐 [HYBRID-API] Current token for employees request:', authToken ? authToken.substring(0, 30) + '...' : 'NONE');
        console.log('🌐 [HYBRID-API] Online status:', { isOnline: this.isOnline, navigatorOnLine: navigator.onLine });
        
        if (!authToken) {
            console.error('❌ [HYBRID-API] No authentication token available for employees request!');
            return { success: false, error: 'No authentication token available' };
        }
        
        // CRITICAL FIX: Use the correct employee endpoint that actually works
        console.log('🔧 [HYBRID-API] Using correct employee endpoint: /api/business/employees');
        const result = await this.get('/api/business/employees', 'employees', {
            offlineFirst: false,
            critical: true, // Force online request
            ...options
        });
        
        console.log('👥 [HYBRID-API] getEmployees() raw result:', result);
        console.log('👥 [HYBRID-API] Raw result.data structure:', result.data);
        
        // The response format should now be standardized by the HybridAPIClient
        // Expected format: { success: true, data: [...employees array...] }
        let employees = [];
        if (result.success && result.data) {
            if (Array.isArray(result.data)) {
                console.log('✅ [HYBRID-API] Employee data in correct array format');
                console.log('👥 [HYBRID-API] Employee count from API:', result.data.length);
                console.log('👥 [HYBRID-API] Sample employee:', result.data[0]);
                employees = result.data;
            } else {
                console.log('❓ [HYBRID-API] Unexpected data format - expected array but got:', typeof result.data);
                console.log('❓ [HYBRID-API] Data content:', result.data);
            }
        }
        
        // IMPORTANT: Also load any local-only employees from IndexedDB
        if (window.db && window.db.db) {
            try {
                console.log('💾 [HYBRID-API] Checking for local-only employees in IndexedDB...');
                const allLocalEmployees = await window.db.getAll('employees');
                const localOnlyEmployees = allLocalEmployees.filter(emp => emp.localOnly === true);
                
                if (localOnlyEmployees.length > 0) {
                    console.log(`📦 [HYBRID-API] Found ${localOnlyEmployees.length} local-only employees`);
                    
                    // Merge local employees with API employees
                    // Avoid duplicates by checking IDs
                    const apiEmployeeIds = new Set(employees.map(e => e.id || e._id));
                    const uniqueLocalEmployees = localOnlyEmployees.filter(emp => 
                        !apiEmployeeIds.has(emp.id) && !apiEmployeeIds.has(emp._id)
                    );
                    
                    employees = [...employees, ...uniqueLocalEmployees];
                    console.log(`✅ [HYBRID-API] Total employees after merging: ${employees.length}`);
                }
            } catch (error) {
                console.error('❌ [HYBRID-API] Error loading local employees:', error);
            }
        }
        
        console.log('👥 [HYBRID-API] getEmployees() final result:', {
            success: result.success || employees.length > 0,
            dataCount: employees.length,
            source: employees.length > 0 ? 'merged' : result.source,
            error: result.error,
            queued: result.queued
        });
        
        return {
            ...result,
            success: result.success || employees.length > 0,
            data: employees,
            source: employees.length > 0 ? 'merged' : result.source
        };
    }
    
    // Quick test function - run window.HybridAPIClient.quickTestEmployees() in console
    async quickTestEmployees() {
        console.log('🧪 [QUICK-TEST] Testing employees endpoint...');
        try {
            const result = await this.getEmployees();
            console.log('🧪 [QUICK-TEST] Employee test result:', result);
            if (result.success && result.data && result.data.length > 0) {
                console.log('✅ [QUICK-TEST] EMPLOYEES FIXED! Found', result.data.length, 'employees');
                console.log('👥 [QUICK-TEST] Employee names:', result.data.map(e => e.name || e.firstName + ' ' + e.lastName));
                return { success: true, count: result.data.length, employees: result.data };
            } else {
                console.log('❌ [QUICK-TEST] Still failing - no data:', {
                    success: result.success,
                    hasData: !!result.data,
                    dataType: typeof result.data,
                    dataLength: result.data?.length,
                    error: result.error
                });
                return result;
            }
        } catch (error) {
            console.log('❌ [QUICK-TEST] Test error:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Test the raw business/employees endpoint
    async testRawBusinessEmployees() {
        console.log('🧪 [RAW-TEST] Testing /api/business/employees directly...');
        try {
            const url = this.getFullURL('/api/business/employees');
            const token = this.getAuthToken();
            
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await response.json();
            console.log('🧪 [RAW-TEST] Raw response:', data);
            
            if (data.employees) {
                console.log('✅ [RAW-TEST] Found employees in response:', data.employees.length);
                console.log('👥 [RAW-TEST] Sample employee:', data.employees[0]);
            }
            
            return data;
        } catch (error) {
            console.log('❌ [RAW-TEST] Error:', error);
            return { error: error.message };
        }
    }

    async getProducts(options = {}) {
        console.log('🛒 [API] Loading products from backend...');
        const result = await this.get('/api/products', 'products', {
            offlineFirst: false,
            ...options
        });
        
        console.log('🛒 [API] Products result:', {
            success: result.success,
            dataCount: result.data?.length || 0,
            source: result.source,
            error: result.error
        });
        
        return result;
    }

    async reorderProducts(productsOrder) {
        console.log('🔄 [API] Reordering products...');
        
        if (!this.isOnline) {
            // Queue the reorder operation for when online
            const queuedRequest = {
                type: 'reorder_products',
                endpoint: '/api/products/reorder',
                method: 'PUT',
                data: { products: productsOrder },
                timestamp: Date.now(),
                retries: 0
            };
            
            this.requestQueue.push(queuedRequest);
            await this.saveRequestQueue();
            
            console.log('📱 [API] Reorder queued for when online');
            return {
                success: true,
                source: 'offline_queue',
                message: 'Reorder queued for when online'
            };
        }

        try {
            const token = localStorage.getItem('authToken');
            const requestUrl = `${this.baseURL}/api/products/reorder`;
            const requestBody = { products: productsOrder };
            
            console.log('🔥 [HYBRID-API] ===== DETAILED REQUEST DEBUGGING =====');
            console.log('🔥 [HYBRID-API] Input productsOrder:', JSON.stringify(productsOrder, null, 2));
            console.log('🔥 [HYBRID-API] Wrapped requestBody:', JSON.stringify(requestBody, null, 2));
            console.log('🔥 [HYBRID-API] Request URL:', requestUrl);
            console.log('🔥 [HYBRID-API] Token exists:', !!token);
            console.log('🔥 [HYBRID-API] Token length:', token ? token.length : 0);
            console.log('🔥 [HYBRID-API] baseURL:', this.baseURL);
            console.log('🔥 [HYBRID-API] isOnline:', this.isOnline);
            
            console.log('🔍 [API] ===== REORDER API REQUEST START =====');
            console.log('🔍 [API] Request URL:', requestUrl);
            console.log('🔍 [API] Base URL:', this.baseURL);
            console.log('🔍 [API] Auth token present:', !!token);
            console.log('🔍 [API] Request body:', JSON.stringify(requestBody, null, 2));
            console.log('🔍 [API] Products count:', productsOrder.length);
            
            const response = await fetch(requestUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            console.log('🔍 [API] Response status:', response.status);
            console.log('🔍 [API] Response statusText:', response.statusText);
            console.log('🔍 [API] Response headers:', Object.fromEntries(response.headers.entries()));

            if (response.ok) {
                const result = await response.json();
                console.log('✅ [API] Products reordered successfully');
                console.log('🔍 [API] Success response:', JSON.stringify(result, null, 2));
                
                // Clear products cache to force refresh
                this.cache.delete('products');
                if (window.db) {
                    await window.db.delete('cache', 'products');
                }
                
                return {
                    success: true,
                    data: result.data,
                    source: 'api',
                    message: result.message
                };
            } else {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (parseError) {
                    console.error('❌ [API] Failed to parse error response as JSON:', parseError);
                    const textResponse = await response.text();
                    console.error('❌ [API] Raw error response text:', textResponse);
                    errorData = { error: { message: `HTTP ${response.status}: ${textResponse}` } };
                }
                
                console.error('❌ [API] Failed to reorder products:', errorData);
                console.log('🔍 [API] ===== REORDER API REQUEST END (ERROR) =====');
                
                return {
                    success: false,
                    error: errorData.error || { message: 'Failed to reorder products' },
                    source: 'api'
                };
            }
        } catch (error) {
            console.error('❌ [API] Network/fetch error during reorder:', error);
            console.log('🔍 [API] Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack,
                cause: error.cause
            });
            console.log('🔍 [API] ===== REORDER API REQUEST END (EXCEPTION) =====');
            
            return {
                success: false,
                error: { message: error.message },
                source: 'api'
            };
        }
    }

    async getTransactions(options = {}) {
        try {
            // Get transactions from API/cache
            const apiResult = await this.get('/api/transactions', 'transactions', {
                offlineFirst: false,
                ...options
            });
            
            // Also get locally stored offline transactions
            let localTransactions = [];
            if (window.db) {
                try {
                    // Ensure database is initialized before accessing
                    if (!window.db.db) {
                        await window.ensureDBInit();
                    }
                    const allLocalTransactions = await window.db.getAll('transactions');
                    // Filter for offline transactions that haven't synced yet
                    localTransactions = allLocalTransactions.filter(t => 
                        (t.isOffline === true || t.syncStatus === 'pending') && t.syncStatus !== 'synced'
                    );
                    console.log(`📱 Found ${localTransactions.length} offline transactions in local storage`);
                } catch (localError) {
                    console.warn('⚠️ Failed to load local transactions:', localError);
                }
            }
            
            if (apiResult.success) {
                // Merge API transactions with local offline transactions
                const apiTransactions = apiResult.data || [];
                const mergedTransactions = [...apiTransactions, ...localTransactions];
                
                // Remove duplicates (in case an offline transaction was already synced)
                const uniqueTransactions = mergedTransactions.filter((transaction, index, arr) => {
                    return arr.findIndex(t => t.id === transaction.id || t._id === transaction._id) === index;
                });
                
                console.log(`💾 Merged ${apiTransactions.length} API + ${localTransactions.length} local = ${uniqueTransactions.length} total transactions`);
                
                return {
                    success: true,
                    data: uniqueTransactions,
                    source: localTransactions.length > 0 ? 'api+local' : apiResult.source
                };
            } else {
                // API failed, return just local transactions if any
                if (localTransactions.length > 0) {
                    console.log(`📱 API failed, returning ${localTransactions.length} local transactions only`);
                    return {
                        success: true,
                        data: localTransactions,
                        source: 'local_only'
                    };
                }
                
                return apiResult;
            }
            
        } catch (error) {
            console.error('❌ Error in getTransactions:', error);
            // Fallback to just local transactions
            if (window.db) {
                try {
                    const allLocalTransactions = await window.db.getAll('transactions');
                    console.log(`🔄 Fallback: returning ${allLocalTransactions.length} local transactions`);
                    return {
                        success: true,
                        data: allLocalTransactions,
                        source: 'local_fallback'
                    };
                } catch (localError) {
                    console.error('❌ Even local fallback failed:', localError);
                }
            }
            
            return { success: false, error: error.message };
        }
    }

    async getInventory(options = {}) {
        return this.get('/api/inventory', 'inventory', {
            offlineFirst: false,
            ...options
        });
    }

    async getCustomers(options = {}) {
        return this.get('/api/customers', 'customers', {
            offlineFirst: false,
            ...options
        });
    }

    /**
     * Update offline indicator in UI
     */
    updateOfflineIndicator() {
        const syncIndicator = document.getElementById('sync-indicator');
        const syncStatus = document.getElementById('sync-status');
        
        if (syncIndicator && syncStatus) {
            if (this.isOnline) {
                syncIndicator.className = 'sync-indicator online';
                syncStatus.textContent = 'Online';
            } else {
                syncIndicator.className = 'sync-indicator offline';
                syncStatus.textContent = 'Offline Mode';
            }
        }
    }

    /**
     * Setup token change listener for login/logout events
     */
    setupTokenChangeListener() {
        // Listen for login events
        window.addEventListener('userLogin', (event) => {
            console.log('🔄 [HYBRID-AUTH] User login detected, refreshing data...');
            this.notifyTokenChange('login', event.detail);
        });
        
        // Listen for logout events  
        window.addEventListener('userLogout', () => {
            console.log('🔄 [HYBRID-AUTH] User logout detected, clearing cache...');
            this.notifyTokenChange('logout');
        });
        
        // Listen for storage changes (token updates)
        window.addEventListener('storage', (event) => {
            if (event.key && (event.key.includes('Token') || event.key.includes('jwt'))) {
                console.log('🔄 [HYBRID-AUTH] Token storage change detected:', event.key);
                this.notifyTokenChange('token_update');
            }
        });
    }
    
    /**
     * Notify other modules about token changes
     */
    notifyTokenChange(eventType, userData = null) {
        console.log('📢 [HYBRID-AUTH] Notifying modules of token change:', eventType);
        
        // Clear in-memory cache on token change
        this.cache.clear();
        
        // Notify attendance system
        if (window.attendanceManager && window.attendanceManager.refreshTokens) {
            window.attendanceManager.refreshTokens();
        }
        
        // Notify employee manager
        if (window.employeeManager && window.employeeManager.loadEmployees) {
            setTimeout(() => window.employeeManager.loadEmployees(), 100);
        }
        
        // Notify dashboard
        if (window.loadDashboard) {
            setTimeout(() => window.loadDashboard(), 200);
        }
        
        // Dispatch custom event for other modules
        window.dispatchEvent(new CustomEvent('tokenChanged', {
            detail: { eventType, userData }
        }));
    }

    /**
     * ENHANCED: Show user-friendly authentication error (NEW METHOD)
     */
    showAuthError() {
        // Only show error once per session to avoid spam
        if (this.authErrorShown) return;
        this.authErrorShown = true;
        
        try {
            // Try to find an appropriate place to show the error
            const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            
            // Check if we have a notification system available
            if (window.showNotification) {
                const message = isDevelopment 
                    ? 'No authentication token found. Please login or use setDevelopmentToken().'
                    : 'Please login through the marketing website to access this feature.';
                window.showNotification(message, 'warning');
                return;
            }
            
            // Fallback: Try to show in a banner or header area
            const possibleContainers = [
                document.getElementById('main-header'),
                document.getElementById('header'),
                document.querySelector('.header'),
                document.querySelector('.container'),
                document.body
            ];
            
            for (const container of possibleContainers) {
                if (container) {
                    const authBanner = this.createAuthBanner(isDevelopment);
                    container.insertBefore(authBanner, container.firstChild);
                    break;
                }
            }
        } catch (error) {
            console.warn('⚠️ [HYBRID-AUTH] Could not show user-friendly auth error:', error);
        }
    }
    
    /**
     * ENHANCED: Create authentication error banner (NEW METHOD)
     */
    createAuthBanner(isDevelopment) {
        const banner = document.createElement('div');
        banner.id = 'auth-error-banner';
        banner.style.cssText = `
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 12px;
            margin: 10px;
            border-radius: 4px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            z-index: 1000;
            position: relative;
        `;
        
        const content = document.createElement('div');
        if (isDevelopment) {
            content.innerHTML = `
                <strong>⚠️ Authentication Required</strong><br>
                No authentication token found. Please:
                <ul style="margin: 5px 0 0 20px; padding: 0;">
                    <li>Login at <a href="http://localhost:3003/login" target="_blank">Marketing Site</a></li>
                    <li>Or use <code>setDevelopmentToken("user-id")</code> in console</li>
                </ul>
            `;
        } else {
            content.innerHTML = `
                <strong>⚠️ Authentication Required</strong><br>
                Please login through the marketing website to access PWA features.
            `;
        }
        
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            font-size: 18px;
            color: #856404;
            cursor: pointer;
            padding: 0;
            margin-left: 10px;
        `;
        closeBtn.onclick = () => banner.remove();
        
        banner.appendChild(content);
        banner.appendChild(closeBtn);
        
        // Auto-remove after 30 seconds
        setTimeout(() => {
            if (banner.parentNode) {
                banner.remove();
            }
        }, 30000);
        
        return banner;
    }

    /**
     * Initialize database schema for caching
     */
    async initializeCacheSchema() {
        if (!window.db) {
            console.warn('⚠️ Database not available for cache initialization');
            return;
        }

        try {
            // Ensure cache object store exists
            const stores = await window.db.getAllStoreNames();
            if (!stores.includes('cache')) {
                console.log('🔧 Creating cache object store');
                // This will be handled by database.js upgrade
            }
            
            if (!stores.includes('requestQueue')) {
                console.log('🔧 Creating requestQueue object store');
                // This will be handled by database.js upgrade
            }

            // Load existing request queue
            await this.loadRequestQueue();
            
            console.log('✅ HybridAPIClient cache initialized');
        } catch (error) {
            console.error('❌ Failed to initialize cache schema:', error);
        }
    }
}

// Create singleton instance
window.HybridAPIClient = new HybridAPIClient();

// Initialize when database is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for database to be ready
    let retries = 0;
    while (!window.db && retries < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
    }
    
    if (window.db) {
        await window.HybridAPIClient.initializeCacheSchema();
    } else {
        console.warn('⚠️ Database not available after 5 seconds - HybridAPIClient running without caching');
    }
});

console.log('🔄 HybridAPIClient loaded');