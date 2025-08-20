// Event Handler Fix
// Ensures all buttons work without requiring hard refresh

(function() {
    console.log('🔧 Initializing event handler fix...');
    
    // Function to initialize all event handlers
    function initializeAllHandlers() {
        console.log('🔄 Reinitializing all event handlers...');
        
        // 1. Fix Logout Button
        setupLogoutButton();
        
        // 2. Fix Refresh App & Clear Cache Button
        setupRefreshButton();
        
        // 3. Re-initialize settings if needed
        reinitializeSettings();
    }
    
    function setupLogoutButton() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (!logoutBtn) {
            console.log('⚠️ Logout button not found');
            return;
        }
        
        // Don't replace if logout manager already initialized it
        if (logoutBtn.hasAttribute('data-enhanced-logout')) {
            console.log('✅ Logout button already has enhanced handler');
            return;
        }
        
        // Remove all existing event listeners by cloning
        const newLogoutBtn = logoutBtn.cloneNode(true);
        logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
        
        // Add click handler
        newLogoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('🚪 Logout clicked - checking for logout manager...');
            
            // Try to initialize logout manager if not available
            if (!window.logoutManager && window.LogoutManager) {
                console.log('Initializing LogoutManager...');
                window.logoutManager = new LogoutManager();
            }
            
            // Use enhanced logout if available
            if (window.logoutManager && window.logoutManager.showConfirmModal) {
                console.log('Using enhanced logout with confirmation');
                window.logoutManager.showConfirmModal();
            } else {
                console.log('LogoutManager not available, showing basic confirmation');
                if (confirm('Are you sure you want to log out?')) {
                    performDirectLogout();
                }
            }
        });
        
        newLogoutBtn.setAttribute('data-enhanced-logout', 'true');
        console.log('✅ Logout button handler attached');
    }
    
    function setupRefreshButton() {
        const refreshBtn = document.getElementById('forceRefreshBtn');
        if (!refreshBtn) {
            console.log('⚠️ Refresh button not found');
            return;
        }
        
        // Remove all existing event listeners by cloning
        const newRefreshBtn = refreshBtn.cloneNode(true);
        refreshBtn.parentNode.replaceChild(newRefreshBtn, refreshBtn);
        
        // Add click handler
        newRefreshBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('🔄 Refresh & Clear Cache clicked');
            
            if (confirm('This will refresh the app and clear all cached files to load the latest updates. Continue?')) {
                try {
                    // Show loading state
                    this.disabled = true;
                    this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
                    
                    // Clear all caches
                    if ('caches' in window) {
                        const cacheNames = await caches.keys();
                        await Promise.all(
                            cacheNames.map(cacheName => {
                                console.log('Deleting cache:', cacheName);
                                return caches.delete(cacheName);
                            })
                        );
                    }
                    
                    // Clear localStorage except auth
                    const authToken = localStorage.getItem('auth_token');
                    const authUser = localStorage.getItem('auth_user');
                    
                    // Clear service worker registrations
                    if ('serviceWorker' in navigator) {
                        const registrations = await navigator.serviceWorker.getRegistrations();
                        for (let registration of registrations) {
                            await registration.unregister();
                        }
                    }
                    
                    // Show success message
                    if (window.showNotification) {
                        window.showNotification('Cache cleared! Reloading app...', 'success');
                    }
                    
                    // Wait a moment then reload
                    setTimeout(() => {
                        // Force reload with cache bypass
                        window.location.reload(true);
                    }, 1000);
                    
                } catch (error) {
                    console.error('Error clearing cache:', error);
                    this.disabled = false;
                    this.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh App & Clear Cache';
                    
                    if (window.showNotification) {
                        window.showNotification('Error clearing cache. Try Ctrl+Shift+R for hard refresh.', 'error');
                    }
                }
            }
        });
        
        console.log('✅ Refresh button handler attached');
    }
    
    function reinitializeSettings() {
        // Re-initialize settings manager if it exists
        if (window.settingsManager && window.settingsManager.init) {
            console.log('📋 Reinitializing settings manager...');
            window.settingsManager.init();
        }
        
        // Also try to load settings
        if (window.loadSettings) {
            window.loadSettings();
        }
    }
    
    async function performDirectLogout() {
        console.log('🚪 Performing direct logout...');
        
        try {
            // Try unified auth first
            if (window.unifiedAuth && typeof window.unifiedAuth.logout === 'function') {
                await window.unifiedAuth.logout();
                return;
            }
            
            // Try authSystem
            if (window.authSystem && typeof window.authSystem.logout === 'function') {
                await window.authSystem.logout();
                return;
            }
            
            // Manual logout
            const authKeys = [
                'auth_token', 'auth_user',
                'userToken', 'userData', 'isLoggedIn',
                'authToken', 'currentUser'
            ];
            
            authKeys.forEach(key => {
                localStorage.removeItem(key);
                sessionStorage.removeItem(key);
            });
            
            // Show notification
            if (window.showNotification) {
                window.showNotification('Logged out successfully', 'success');
            }
            
            // Reload page
            setTimeout(() => {
                window.location.reload();
            }, 1000);
            
        } catch (error) {
            console.error('Logout error:', error);
            alert('Error during logout. Please refresh the page.');
        }
    }
    
    // Initialize on DOM ready
    function init() {
        // Wait a bit for LogoutManager to load
        setTimeout(() => {
            // Ensure LogoutManager is initialized first
            if (!window.logoutManager && window.LogoutManager) {
                console.log('🔄 Creating LogoutManager instance...');
                window.logoutManager = new LogoutManager();
            }
            
            initializeAllHandlers();
        }, 100);
    }
    
    // Multiple initialization strategies to ensure it works
    
    // 1. Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // 2. Re-initialize when page becomes visible (for PWA/SPA)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            setTimeout(initializeAllHandlers, 100);
        }
    });
    
    // 3. Re-initialize when auth state changes
    if (window.eventBus) {
        window.eventBus.on('auth:login', () => {
            console.log('🔄 Auth login detected, reinitializing handlers...');
            setTimeout(initializeAllHandlers, 500);
        });
    }
    
    // 4. Listen for custom events that might indicate UI updates
    window.addEventListener('auth:ready', initializeAllHandlers);
    window.addEventListener('app:ready', initializeAllHandlers);
    window.addEventListener('settings:loaded', initializeAllHandlers);
    
    // 5. Fallback: Re-initialize periodically for first 10 seconds
    let retryCount = 0;
    const retryInterval = setInterval(() => {
        retryCount++;
        
        // Check if buttons exist and have handlers
        const logoutBtn = document.getElementById('logoutBtn');
        const refreshBtn = document.getElementById('forceRefreshBtn');
        
        if (logoutBtn || refreshBtn) {
            console.log(`🔄 Retry ${retryCount}: Ensuring handlers are attached`);
            initializeAllHandlers();
        }
        
        // Stop after 10 attempts (10 seconds)
        if (retryCount >= 10) {
            clearInterval(retryInterval);
            console.log('✅ Event handler fix monitoring complete');
        }
    }, 1000);
    
    // Export for debugging
    window.eventHandlerFix = {
        reinitialize: initializeAllHandlers,
        testLogout: () => {
            const btn = document.getElementById('logoutBtn');
            if (btn) btn.click();
        },
        testRefresh: () => {
            const btn = document.getElementById('forceRefreshBtn');
            if (btn) btn.click();
        }
    };
    
    console.log('✅ Event handler fix initialized');
})();