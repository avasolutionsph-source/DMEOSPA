// Cache Buster - Forces fresh configuration loading
// This script ensures that configuration changes take effect immediately

(function() {
    'use strict';
    
    // Force reload configuration on app start
    function forceClearCache() {
        console.log('🧹 Cache Buster: Clearing all cached configurations...');
        
        // Clear localStorage items that might cache old URLs
        const cacheKeys = [
            'config_overrides',
            'auth_token_cache', 
            'api_cache',
            'unified_auth_cache',
            'business_cache',
            'employee_cache',
            'service_cache'
        ];
        
        cacheKeys.forEach(key => {
            try {
                localStorage.removeItem(key);
                sessionStorage.removeItem(key);
            } catch (e) {
                console.warn('Failed to clear cache key:', key, e);
            }
        });
        
        // Clear any window-level caches if they exist
        if (window.dataService && typeof window.dataService.clearCache === 'function') {
            window.dataService.clearCache();
        }
        
        // Force reload app configuration if available
        if (window.appConfig && typeof window.appConfig.forceReload === 'function') {
            window.appConfig.forceReload();
        }
        
        console.log('✅ Cache Buster: All caches cleared, fresh configuration loaded');
    }
    
    // Add cache-busting to fetch requests
    const originalFetch = window.fetch;
    window.fetch = function(url, options = {}) {
        // Add cache-busting parameter to auth-related requests
        if (typeof url === 'string' && url.includes('/auth/')) {
            const separator = url.includes('?') ? '&' : '?';
            url = `${url}${separator}_cb=${Date.now()}`;
        }
        
        // Ensure no cache headers for auth requests
        if (typeof url === 'string' && url.includes('/auth/')) {
            options.headers = {
                ...options.headers,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            };
        }
        
        return originalFetch.call(this, url, options);
    };
    
    // Run cache clearing immediately
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', forceClearCache);
    } else {
        forceClearCache();
    }
    
    // Also clear cache when the page becomes visible (user switches back to tab)
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            console.log('👁️ Page visible again, clearing cache...');
            forceClearCache();
        }
    });
    
    // Clear cache on focus (when user clicks back into the window)
    window.addEventListener('focus', function() {
        console.log('🎯 Window focused, clearing cache...');
        forceClearCache();
    });
    
    // Export function for manual use
    window.forceClearCache = forceClearCache;
    
    console.log('🛠️ Cache Buster initialized - old configurations will be cleared automatically');
})();