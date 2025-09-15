// Unified Token Management System
// Standardizes authentication token storage and access across the PWA

class TokenManager {
    constructor() {
        // Standardize on 'authToken' as the primary key
        this.TOKEN_KEY = 'authToken';
        this.USER_DATA_KEY = 'userData';
        this.REFRESH_TOKEN_KEY = 'refreshToken';
        
        // Legacy keys that need to be migrated (ENHANCED: Added JWT variants)
        this.LEGACY_KEYS = ['userToken', 'currentUser'];
        this.JWT_TOKEN_KEYS = ['jwtToken', 'jwt_token'];
        this.ALL_TOKEN_KEYS = [this.TOKEN_KEY, ...this.LEGACY_KEYS, ...this.JWT_TOKEN_KEYS];
        
        // Debug mode (can be enabled for troubleshooting)
        this.debugMode = localStorage.getItem('tokenManagerDebug') === 'true';
        
        if (this.debugMode) {
            console.log('🔍 [TokenManager] Debug mode enabled');
        }
    }

    // Get the current authentication token (ENHANCED: Better discovery and debugging)
    getAuthToken() {
        if (this.debugMode) {
            console.log('🔍 [TokenManager] Searching for authentication token...');
        }

        // Primary location
        let token = localStorage.getItem(this.TOKEN_KEY);
        if (token) {
            if (this.debugMode) {
                console.log('✅ [TokenManager] Found token in primary location (authToken)');
            }
            return token;
        }

        // Check session storage
        token = sessionStorage.getItem(this.TOKEN_KEY);
        if (token) {
            if (this.debugMode) {
                console.log('✅ [TokenManager] Found token in session storage (authToken)');
            }
            return token;
        }

        // ENHANCED: Check JWT tokens first (priority for modern authentication)
        for (const jwtKey of this.JWT_TOKEN_KEYS) {
            token = localStorage.getItem(jwtKey) || sessionStorage.getItem(jwtKey);
            if (token) {
                if (this.debugMode) {
                    console.log(`✅ [TokenManager] Found JWT token (${jwtKey}), migrating to standard key`);
                }
                this.setAuthToken(token); // Migrate to standard key
                this.removeLegacyToken(jwtKey);
                return token;
            }
        }

        // Check legacy keys and migrate if found
        for (const legacyKey of this.LEGACY_KEYS) {
            if (legacyKey.includes('Token')) {
                token = localStorage.getItem(legacyKey) || sessionStorage.getItem(legacyKey);
                if (token) {
                    if (this.debugMode) {
                        console.log(`✅ [TokenManager] Found legacy token (${legacyKey}), migrating to standard key`);
                    }
                    this.setAuthToken(token); // Migrate to standard key
                    this.removeLegacyToken(legacyKey);
                    return token;
                }
            }
        }

        if (this.debugMode) {
            console.log('❌ [TokenManager] No authentication token found in any location');
            this.debugAllTokenLocations();
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

    // Clean up all legacy tokens (ENHANCED: Include JWT tokens)
    cleanupLegacyTokens() {
        for (const legacyKey of this.LEGACY_KEYS) {
            this.removeLegacyToken(legacyKey);
        }
        // Also clean up JWT tokens after migration
        for (const jwtKey of this.JWT_TOKEN_KEYS) {
            this.removeLegacyToken(jwtKey);
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

    // ENHANCED: Debug all token locations (NEW METHOD)
    debugAllTokenLocations() {
        console.log('🔍 [TokenManager] Token location debugging:');
        
        const locations = {
            localStorage: {},
            sessionStorage: {}
        };
        
        // Check all possible token keys
        for (const key of this.ALL_TOKEN_KEYS) {
            const localValue = localStorage.getItem(key);
            const sessionValue = sessionStorage.getItem(key);
            
            if (localValue) {
                locations.localStorage[key] = localValue.substring(0, 20) + '...';
            }
            if (sessionValue) {
                locations.sessionStorage[key] = sessionValue.substring(0, 20) + '...';
            }
        }
        
        console.log('📍 localStorage tokens:', locations.localStorage);
        console.log('📍 sessionStorage tokens:', locations.sessionStorage);
        
        // Check for any other auth-related keys
        const authKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.toLowerCase().includes('token') || key.toLowerCase().includes('auth') || key.toLowerCase().includes('jwt'))) {
                authKeys.push(key);
            }
        }
        
        if (authKeys.length > 0) {
            console.log('🔍 Other potential auth keys found:', authKeys);
        }
    }

    // ENHANCED: Token validation (NEW METHOD)
    validateToken(token) {
        if (!token || typeof token !== 'string') {
            return { valid: false, reason: 'Token is empty or not a string' };
        }
        
        if (token.length < 10) {
            return { valid: false, reason: 'Token is too short' };
        }
        
        // Basic JWT validation (if it looks like a JWT)
        if (token.includes('.')) {
            const parts = token.split('.');
            if (parts.length === 3) {
                try {
                    // Try to decode the header to see if it's a valid JWT structure
                    const header = JSON.parse(atob(parts[0]));
                    if (header.typ === 'JWT') {
                        return { valid: true, type: 'JWT', reason: 'Valid JWT format' };
                    }
                } catch (e) {
                    // Not a valid JWT, but might be a valid token
                }
            }
        }
        
        return { valid: true, type: 'Bearer', reason: 'Valid token format' };
    }

    // Export auth state for debugging (ENHANCED: More detailed info)
    getAuthState() {
        const token = this.getAuthToken();
        const userData = this.getUserData();
        const validation = token ? this.validateToken(token) : null;
        
        return {
            hasToken: !!token,
            hasUserData: !!userData,
            userData: userData,
            tokenLength: token?.length || 0,
            tokenValidation: validation,
            isAuthenticated: this.isAuthenticated(),
            debugMode: this.debugMode,
            availableTokens: this.getAllAvailableTokens()
        };
    }

    // ENHANCED: Get all available tokens for debugging (NEW METHOD)
    getAllAvailableTokens() {
        const tokens = {};
        
        for (const key of this.ALL_TOKEN_KEYS) {
            const localValue = localStorage.getItem(key);
            const sessionValue = sessionStorage.getItem(key);
            
            if (localValue || sessionValue) {
                tokens[key] = {
                    localStorage: !!localValue,
                    sessionStorage: !!sessionValue,
                    preview: (localValue || sessionValue)?.substring(0, 20) + '...'
                };
            }
        }
        
        return tokens;
    }
}

// Create global instance
window.tokenManager = new TokenManager();

// Provide backward compatibility functions
window.getAuthToken = () => window.tokenManager.getAuthToken();
window.setAuthToken = (token, persistent = true) => window.tokenManager.setAuthToken(token, persistent);
window.isAuthenticated = () => window.tokenManager.isAuthenticated();
window.clearAuthData = () => window.tokenManager.clearAuth();

// ENHANCED: Additional debugging and utility functions
window.debugTokens = () => {
    console.log('🔍 [TokenManager] Current auth state:', window.tokenManager.getAuthState());
    window.tokenManager.debugAllTokenLocations();
    return window.tokenManager.getAuthState();
};

window.enableTokenDebug = () => {
    localStorage.setItem('tokenManagerDebug', 'true');
    console.log('🔍 [TokenManager] Debug mode enabled - reload page to activate');
};

window.disableTokenDebug = () => {
    localStorage.removeItem('tokenManagerDebug');
    console.log('🔍 [TokenManager] Debug mode disabled - reload page to deactivate');
};

// ENHANCED: Development safety net (environment-gated)
window.setDevelopmentToken = (userId = null) => {
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.hostname.includes('localhost');
    
    if (!isDevelopment) {
        console.error('❌ [TokenManager] Development tokens only available in development environment');
        return false;
    }
    
    if (!userId) {
        console.log('🔧 [TokenManager] Usage: setDevelopmentToken("your-user-id")');
        console.log('🔧 [TokenManager] This creates a temporary development token for testing');
        return false;
    }
    
    const devToken = `dev-token-${userId}-${Date.now()}`;
    const devUser = {
        id: userId,
        email: `dev-${userId}@localhost.com`,
        name: `Development User ${userId}`,
        role: 'user'
    };
    
    window.tokenManager.setAuthToken(devToken);
    window.tokenManager.setUserData(devUser);
    
    console.log('🔧 [TokenManager] Development token created for testing');
    console.log('🔧 [TokenManager] User ID:', userId);
    console.log('🔧 [TokenManager] Token preview:', devToken.substring(0, 30) + '...');
    
    return true;
};

// Initialize with enhanced logging
console.log('🔐 Token Manager initialized - unified token management active');
console.log('🔧 [TokenManager] Debug functions available: debugTokens(), enableTokenDebug(), disableTokenDebug()');

// Check initial auth state
const initialAuth = window.tokenManager.getAuthState();
if (initialAuth.hasToken) {
    console.log('✅ [TokenManager] Authentication token found on startup');
} else {
    console.log('⚠️ [TokenManager] No authentication token found on startup');
    console.log('💡 [TokenManager] Use debugTokens() to see available tokens or login through the marketing site');
}