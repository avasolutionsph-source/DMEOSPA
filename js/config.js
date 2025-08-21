// Centralized Configuration Management
// This file manages all app configuration in one place
// Never hardcode URLs or settings elsewhere - use this instead

class ConfigManager {
    constructor() {
        this.environment = this.detectEnvironment();
        this.config = this.loadConfig();
        this.version = this.getConfigVersion();
        this.lastReload = Date.now();
    }

    detectEnvironment() {
        const hostname = window.location.hostname;
        
        if (['localhost', '127.0.0.1'].includes(hostname)) {
            return 'development';
        } else if (hostname.includes('staging') || hostname.includes('test')) {
            return 'staging';
        } else {
            return 'production';
        }
    }

    loadConfig() {
        const configs = {
            development: {
                name: 'Development',
                debug: true,
                api: {
                    pwa: 'http://localhost:4000/api',
                    marketing: 'http://localhost:3000',
                    booking: 'http://localhost:8080'
                },
                features: {
                    offlineMode: true,
                    syncInterval: 30000, // 30 seconds
                    debugPanel: true,
                    demoMode: true
                }
            },
            staging: {
                name: 'Staging',
                debug: true,
                api: {
                    pwa: 'https://ava-pwa-backend-staging.onrender.com/api',
                    marketing: 'https://marketing-staging.onrender.com',
                    booking: 'https://booking-staging.netlify.app'
                },
                features: {
                    offlineMode: true,
                    syncInterval: 60000, // 1 minute
                    debugPanel: true,
                    demoMode: false
                }
            },
            production: {
                name: 'Production',
                debug: false,
                api: {
                    pwa: 'https://ava-pwa-backend.onrender.com/api',
                    marketing: 'https://ava-marketing-api.onrender.com',
                    booking: 'https://avaphbooking.netlify.app'
                },
                features: {
                    offlineMode: true,
                    syncInterval: 300000, // 5 minutes
                    debugPanel: false,
                    demoMode: false
                }
            }
        };

        // Allow override from localStorage for testing
        const overrides = this.getLocalOverrides();
        const config = configs[this.environment];
        
        return this.mergeConfigs(config, overrides);
    }

    getLocalOverrides() {
        try {
            const overrides = localStorage.getItem('config_overrides');
            return overrides ? JSON.parse(overrides) : {};
        } catch (e) {
            return {};
        }
    }

    mergeConfigs(base, overrides) {
        const merged = { ...base };
        
        for (const key in overrides) {
            if (typeof overrides[key] === 'object' && !Array.isArray(overrides[key])) {
                merged[key] = { ...merged[key], ...overrides[key] };
            } else {
                merged[key] = overrides[key];
            }
        }
        
        return merged;
    }

    // Public API
    get(path) {
        const keys = path.split('.');
        let value = this.config;
        
        for (const key of keys) {
            value = value?.[key];
        }
        
        return value;
    }

    getApiUrl(service = 'pwa') {
        return this.config.api[service];
    }

    isDebug() {
        return this.config.debug;
    }

    isProduction() {
        return this.environment === 'production';
    }

    isDevelopment() {
        return this.environment === 'development';
    }

    getFeature(feature) {
        return this.config.features[feature];
    }

    // Allow runtime config updates (useful for testing)
    setOverride(path, value) {
        const overrides = this.getLocalOverrides();
        const keys = path.split('.');
        let current = overrides;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
        localStorage.setItem('config_overrides', JSON.stringify(overrides));
        
        // Reload config
        this.config = this.loadConfig();
    }

    clearOverrides() {
        localStorage.removeItem('config_overrides');
        this.config = this.loadConfig();
    }

    // Cache-busting and force reload methods
    getConfigVersion() {
        // Use a combination of timestamp and current config hash for versioning
        const configStr = JSON.stringify(this.config || {});
        const hash = this.simpleHash(configStr);
        return `${hash}-${Date.now()}`;
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    forceReload() {
        // Clear any cached configurations
        this.clearCache();
        
        // Reload configuration
        this.config = this.loadConfig();
        this.version = this.getConfigVersion();
        this.lastReload = Date.now();
        
        console.log('🔄 Configuration forcefully reloaded:', {
            environment: this.environment,
            version: this.version,
            timestamp: new Date(this.lastReload).toISOString()
        });
        
        // Emit event for other components to react
        window.dispatchEvent(new CustomEvent('config:reloaded', { 
            detail: { config: this.config, version: this.version } 
        }));
        
        return this.config;
    }

    clearCache() {
        // Clear localStorage cache items that might interfere
        const cacheKeys = [
            'config_overrides',
            'auth_token_cache',
            'api_cache',
            'unified_auth_cache'
        ];
        
        cacheKeys.forEach(key => {
            try {
                localStorage.removeItem(key);
                sessionStorage.removeItem(key);
            } catch (e) {
                // Ignore errors
            }
        });
        
        // Clear any window-level caches
        if (window.dataService && window.dataService.clearCache) {
            window.dataService.clearCache();
        }
    }

    // Get cache-busted API URL with version parameter
    getApiUrlWithCacheBuster(service = 'pwa') {
        const baseUrl = this.config.api[service];
        const separator = baseUrl.includes('?') ? '&' : '?';
        return `${baseUrl}${separator}v=${this.version}&_t=${Date.now()}`;
    }

    // Get all config for debugging
    getAll() {
        return {
            environment: this.environment,
            config: this.config,
            overrides: this.getLocalOverrides()
        };
    }
}

// Create singleton instance
const appConfig = new ConfigManager();

// Export for use in other modules
window.appConfig = appConfig;

// Log config in development
if (appConfig.isDebug()) {
    console.log('🔧 Configuration loaded:', appConfig.getAll());
}

export default appConfig;