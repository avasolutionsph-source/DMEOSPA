// Unified Token Management System
// Standardizes authentication token storage and access across the PWA

class TokenManager {
    constructor() {
        // Standardize on 'authToken' as the primary key
        this.TOKEN_KEY = 'authToken';
        this.USER_DATA_KEY = 'userData';
        this.REFRESH_TOKEN_KEY = 'refreshToken';
        
        // Legacy keys that need to be migrated
        this.LEGACY_KEYS = ['userToken', 'currentUser'];
    }

    // Get the current authentication token
    getAuthToken() {
        // Primary location
        let token = localStorage.getItem(this.TOKEN_KEY);
        if (token) return token;

        // Check session storage
        token = sessionStorage.getItem(this.TOKEN_KEY);
        if (token) return token;

        // Check legacy keys and migrate if found
        for (const legacyKey of this.LEGACY_KEYS) {
            if (legacyKey.includes('Token')) {
                token = localStorage.getItem(legacyKey) || sessionStorage.getItem(legacyKey);
                if (token) {
                    this.setAuthToken(token); // Migrate to standard key
                    this.removeLegacyToken(legacyKey);
                    return token;
                }
            }
        }

        return null;
    }

    // Set the authentication token
    setAuthToken(token, persistent = true) {
        if (!token) return;

        if (persistent) {
            localStorage.setItem(this.TOKEN_KEY, token);
            // Remove from session storage to avoid conflicts
            sessionStorage.removeItem(this.TOKEN_KEY);
        } else {
            sessionStorage.setItem(this.TOKEN_KEY, token);
            // Remove from localStorage to avoid conflicts
            localStorage.removeItem(this.TOKEN_KEY);
        }

        // Clean up legacy tokens
        this.cleanupLegacyTokens();
    }

    // Get user data
    getUserData() {
        let userData = localStorage.getItem(this.USER_DATA_KEY);
        if (userData) return JSON.parse(userData);

        userData = sessionStorage.getItem(this.USER_DATA_KEY);
        if (userData) return JSON.parse(userData);

        // Check legacy keys
        for (const legacyKey of this.LEGACY_KEYS) {
            if (legacyKey.includes('User') || legacyKey.includes('user')) {
                userData = localStorage.getItem(legacyKey) || sessionStorage.getItem(legacyKey);
                if (userData) {
                    try {
                        const parsed = JSON.parse(userData);
                        this.setUserData(parsed); // Migrate to standard key
                        this.removeLegacyToken(legacyKey);
                        return parsed;
                    } catch (e) {
                        console.warn('Failed to parse legacy user data:', e);
                    }
                }
            }
        }

        return null;
    }

    // Set user data
    setUserData(userData, persistent = true) {
        if (!userData) return;

        const dataString = JSON.stringify(userData);
        
        if (persistent) {
            localStorage.setItem(this.USER_DATA_KEY, dataString);
            sessionStorage.removeItem(this.USER_DATA_KEY);
        } else {
            sessionStorage.setItem(this.USER_DATA_KEY, dataString);
            localStorage.removeItem(this.USER_DATA_KEY);
        }

        // Clean up legacy user data
        this.cleanupLegacyTokens();
    }

    // Check if user is authenticated
    isAuthenticated() {
        const token = this.getAuthToken();
        const userData = this.getUserData();
        
        if (!token || !userData) return false;

        // Validate user data structure
        try {
            if (!userData.email || !userData.id) return false;
            return true;
        } catch (e) {
            return false;
        }
    }

    // Clear all authentication data
    clearAuth() {
        // Clear standard keys
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_DATA_KEY);
        localStorage.removeItem(this.REFRESH_TOKEN_KEY);
        sessionStorage.removeItem(this.TOKEN_KEY);
        sessionStorage.removeItem(this.USER_DATA_KEY);

        // Clear legacy keys
        this.cleanupLegacyTokens();

        // Clear other auth-related keys
        localStorage.removeItem('isLoggedIn');
        sessionStorage.removeItem('isLoggedIn');
    }

    // Remove legacy token
    removeLegacyToken(key) {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    }

    // Clean up all legacy tokens
    cleanupLegacyTokens() {
        for (const legacyKey of this.LEGACY_KEYS) {
            this.removeLegacyToken(legacyKey);
        }
    }

    // Get refresh token
    getRefreshToken() {
        return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    }

    // Set refresh token
    setRefreshToken(token) {
        if (token) {
            localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
        } else {
            localStorage.removeItem(this.REFRESH_TOKEN_KEY);
        }
    }

    // Export auth state for debugging
    getAuthState() {
        return {
            hasToken: !!this.getAuthToken(),
            hasUserData: !!this.getUserData(),
            userData: this.getUserData(),
            tokenLength: this.getAuthToken()?.length || 0,
            isAuthenticated: this.isAuthenticated()
        };
    }
}

// Create global instance
window.tokenManager = new TokenManager();

// Provide backward compatibility functions
window.getAuthToken = () => window.tokenManager.getAuthToken();
window.setAuthToken = (token, persistent = true) => window.tokenManager.setAuthToken(token, persistent);
window.isAuthenticated = () => window.tokenManager.isAuthenticated();
window.clearAuthData = () => window.tokenManager.clearAuth();

console.log('🔐 Token Manager initialized - unified token management active');