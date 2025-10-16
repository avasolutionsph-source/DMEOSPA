/**
 * AuthManager - Centralized Authentication Token Management
 *
 * Purpose: Single source of truth for authentication tokens across the entire application.
 * Eliminates duplicate getAuthToken() implementations in 10+ feature files.
 *
 * Features:
 * - Unified token lookup logic (TokenManager → authSystem → localStorage → sessionStorage)
 * - Token validation (checks for null/undefined/empty strings)
 * - Token refresh support (placeholder for future JWT refresh)
 * - Authentication state checking
 * - User information retrieval
 *
 * Usage:
 * ```javascript
 * // Get token
 * const token = window.authManager.getAuthToken();
 * if (!token) {
 *     console.log('User not authenticated');
 *     return;
 * }
 *
 * // Check authentication status
 * if (window.authManager.isAuthenticated()) {
 *     // User is logged in
 * }
 *
 * // Get current user
 * const user = window.authManager.getCurrentUser();
 * ```
 */

class AuthManager {
    static instance = null;

    constructor() {
        if (AuthManager.instance) {
            return AuthManager.instance;
        }

        this.tokenCache = null;
        this.tokenCacheTimestamp = null;
        this.tokenCacheTTL = 5000; // Cache token for 5 seconds to reduce lookups

        AuthManager.instance = this;
        console.log('✅ [AUTH-MANAGER] Initialized');
    }

    /**
     * Singleton pattern - ensures only one instance exists
     * @returns {AuthManager}
     */
    static getInstance() {
        if (!AuthManager.instance) {
            AuthManager.instance = new AuthManager();
        }
        return AuthManager.instance;
    }

    /**
     * Get authentication token from various possible sources
     * Priority: TokenManager → authSystem → localStorage → sessionStorage
     * @returns {string|null} Authentication token or null if not found
     */
    getAuthToken() {
        // Check cache first (reduces redundant lookups)
        if (this.tokenCache && this.tokenCacheTimestamp) {
            const cacheAge = Date.now() - this.tokenCacheTimestamp;
            if (cacheAge < this.tokenCacheTTL) {
                return this.tokenCache;
            }
        }

        let token = null;

        // Priority 1: TokenManager (if available)
        if (window.tokenManager && typeof window.tokenManager.getAuthToken === 'function') {
            token = window.tokenManager.getAuthToken();
            if (this.isValidToken(token)) {
                this.cacheToken(token);
                return token;
            }
        }

        // Priority 2: Global getAuthToken function
        if (window.getAuthToken && typeof window.getAuthToken === 'function') {
            token = window.getAuthToken();
            if (this.isValidToken(token)) {
                this.cacheToken(token);
                return token;
            }
        }

        // Priority 3: Auth system
        if (window.authSystem && window.authSystem.authToken) {
            token = window.authSystem.authToken;
            if (this.isValidToken(token)) {
                this.cacheToken(token);
                return token;
            }
        }

        // Priority 4: Check multiple possible token storage keys
        const possibleKeys = ['authToken', 'userToken', 'jwt_token', 'jwtToken', 'token'];

        for (const key of possibleKeys) {
            // Check localStorage first
            token = localStorage.getItem(key);
            if (this.isValidToken(token)) {
                this.cacheToken(token);
                return token;
            }

            // Then check sessionStorage
            token = sessionStorage.getItem(key);
            if (this.isValidToken(token)) {
                this.cacheToken(token);
                return token;
            }
        }

        console.warn('⚠️ [AUTH-MANAGER] No valid authentication token found');
        return null;
    }

    /**
     * Validate if token is valid (not null, undefined, or empty string)
     * @param {*} token - Token to validate
     * @returns {boolean}
     */
    isValidToken(token) {
        return token &&
               token !== 'null' &&
               token !== 'undefined' &&
               token !== '' &&
               typeof token === 'string';
    }

    /**
     * Cache token temporarily to reduce lookups
     * @param {string} token
     */
    cacheToken(token) {
        this.tokenCache = token;
        this.tokenCacheTimestamp = Date.now();
    }

    /**
     * Clear token cache (useful after logout)
     */
    clearTokenCache() {
        this.tokenCache = null;
        this.tokenCacheTimestamp = null;
    }

    /**
     * Check if user is currently authenticated
     * @returns {boolean}
     */
    isAuthenticated() {
        return !!this.getAuthToken();
    }

    /**
     * Get current user information
     * @returns {object|null} User object or null
     */
    getCurrentUser() {
        // Try authSystem first
        if (window.authSystem && window.authSystem.currentUser) {
            return window.authSystem.currentUser;
        }

        // Try localStorage
        const userDataStr = localStorage.getItem('currentUser');
        if (userDataStr && userDataStr !== 'null' && userDataStr !== 'undefined') {
            try {
                return JSON.parse(userDataStr);
            } catch (error) {
                console.warn('⚠️ [AUTH-MANAGER] Failed to parse user data:', error);
            }
        }

        // Try sessionStorage
        const sessionUserStr = sessionStorage.getItem('currentUser');
        if (sessionUserStr && sessionUserStr !== 'null' && sessionUserStr !== 'undefined') {
            try {
                return JSON.parse(sessionUserStr);
            } catch (error) {
                console.warn('⚠️ [AUTH-MANAGER] Failed to parse session user data:', error);
            }
        }

        return null;
    }

    /**
     * Get user's business/branch ID
     * @returns {string|null}
     */
    getBusinessId() {
        const user = this.getCurrentUser();
        return user?.businessId || user?.branchId || null;
    }

    /**
     * Get user's role
     * @returns {string|null}
     */
    getUserRole() {
        const user = this.getCurrentUser();
        return user?.role || user?.type || null;
    }

    /**
     * Refresh token (placeholder for JWT refresh logic)
     * @returns {Promise<string|null>}
     */
    async refreshToken() {
        // TODO: Implement token refresh logic when backend supports it
        console.log('🔄 [AUTH-MANAGER] Token refresh not yet implemented');
        return this.getAuthToken();
    }

    /**
     * Set authentication token manually (for testing or special cases)
     * @param {string} token
     */
    setAuthToken(token) {
        if (!this.isValidToken(token)) {
            console.warn('⚠️ [AUTH-MANAGER] Attempted to set invalid token');
            return;
        }

        localStorage.setItem('authToken', token);
        this.cacheToken(token);
        console.log('✅ [AUTH-MANAGER] Token set successfully');
    }

    /**
     * Clear authentication (logout)
     */
    clearAuth() {
        // Clear from all possible locations
        const possibleKeys = ['authToken', 'userToken', 'jwt_token', 'jwtToken', 'token', 'currentUser'];

        possibleKeys.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });

        this.clearTokenCache();

        // Clear authSystem if available
        if (window.authSystem) {
            window.authSystem.authToken = null;
            window.authSystem.currentUser = null;
        }

        console.log('✅ [AUTH-MANAGER] Authentication cleared');
    }
}

// Create singleton instance and expose globally
window.authManager = AuthManager.getInstance();

// Export for module usage (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}
