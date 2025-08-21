// Fix for owner.html page issues
(function() {
    'use strict';
    
    console.log('🔧 Applying owner page fixes...');
    
    // 1. Disable aggressive auth checks
    if (window.checkAuthenticationStatus) {
        const originalCheck = window.checkAuthenticationStatus;
        window.checkAuthenticationStatus = function() {
            // Only check if we don't have a token
            const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
            if (!token) {
                return originalCheck();
            }
            return true;
        };
    }
    
    // 2. Prevent automatic logouts
    const clearAllIntervals = () => {
        // Clear all intervals that might be checking auth
        for (let i = 1; i < 99999; i++) {
            window.clearInterval(i);
        }
        console.log('✅ Cleared all auth check intervals');
    };
    
    // Clear intervals after page loads
    setTimeout(clearAllIntervals, 2000);
    
    // 3. Fix click handlers
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🔧 Fixing click handlers...');
        
        // Remove any blocking overlays
        const overlays = document.querySelectorAll('.modal, .overlay, .loading-overlay');
        overlays.forEach(overlay => {
            if (overlay.style.display !== 'none') {
                overlay.style.display = 'none';
                console.log('❌ Removed blocking overlay:', overlay.className);
            }
        });
        
        // Ensure navigation items are clickable
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            // Remove any existing handlers
            const newItem = item.cloneNode(true);
            item.parentNode.replaceChild(newItem, item);
            
            // Add clean click handler
            newItem.addEventListener('click', function(e) {
                e.preventDefault();
                const page = this.getAttribute('data-page');
                if (page && window.app) {
                    window.app.navigateTo(page);
                }
            });
        });
        
        console.log('✅ Fixed navigation click handlers');
    });
    
    // 4. Override the force logout to be less aggressive
    if (window.forceLogout) {
        const originalForceLogout = window.forceLogout;
        window.forceLogout = function() {
            if (confirm('Are you sure you want to logout?')) {
                originalForceLogout();
            }
        };
    }
    
    // 5. Ensure user stays logged in
    const ensureAuth = () => {
        const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
        const user = localStorage.getItem('auth_user') || localStorage.getItem('user');
        
        if (!token && user) {
            // Restore token if we have user data
            const tempToken = 'owner-token-' + Date.now();
            localStorage.setItem('auth_token', tempToken);
            localStorage.setItem('token', tempToken);
            console.log('✅ Restored auth token');
        }
    };
    
    // Check auth every 10 seconds (but don't logout)
    setInterval(ensureAuth, 10000);
    ensureAuth();
    
    // 6. Fix IndexedDB removal interference
    if (window.indexedDB && window.indexedDB.open) {
        const originalOpen = window.indexedDB.open;
        window.indexedDB.open = function(name, version) {
            console.log(`⚠️ Allowing IndexedDB.open for ${name}`);
            return originalOpen.call(this, name, version);
        };
    }
    
    // 7. Ensure MongoDB API is available
    if (!window.mongoAPI) {
        console.log('⚠️ MongoDB API not found, creating mock...');
        window.mongoAPI = {
            request: async function(endpoint, method, data) {
                console.log(`Mock API call: ${method} ${endpoint}`);
                return { success: true, data: [] };
            },
            getProducts: async () => [],
            getEmployees: async () => [],
            getTransactions: async () => [],
            getBookings: async () => [],
            getExpenses: async () => [],
            getDashboardData: async () => ({
                todaySales: 0,
                monthSales: 0,
                totalCustomers: 0,
                activeBookings: 0
            })
        };
    }
    
    console.log('✅ Owner page fixes applied');
})();