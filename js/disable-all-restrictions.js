// DISABLE ALL RESTRICTIONS - Emergency fix for owner access
(function() {
    'use strict';
    
    console.log('🚨 DISABLING ALL RESTRICTIONS FOR OWNER...');
    
    // Override the entire app navigation system
    function overrideAppNavigation() {
        if (window.app) {
            console.log('🔓 Overriding app.canAccessPage...');
            window.app.canAccessPage = function() { 
                return true; 
            };
            
            // Override navigateTo to remove restrictions
            const originalNavigateTo = window.app.navigateTo;
            window.app.navigateTo = function(pageName) {
                console.log('🚀 Force navigating to:', pageName);
                
                // Hide all pages
                document.querySelectorAll('.page').forEach(page => {
                    page.classList.remove('active');
                    page.style.display = 'none';
                });
                
                // Show selected page
                const selectedPage = document.getElementById(pageName);
                if (selectedPage) {
                    selectedPage.classList.add('active');
                    selectedPage.style.display = 'block';
                    
                    // Update nav active state
                    document.querySelectorAll('.nav-item').forEach(item => {
                        item.classList.remove('active');
                    });
                    
                    const navItem = document.querySelector(`[data-page="${pageName}"]`);
                    if (navItem) {
                        navItem.classList.add('active');
                    }
                    
                    // Save state
                    localStorage.setItem('lastActivePage', pageName);
                    
                    // Call page init if exists
                    if (typeof window[pageName + 'Init'] === 'function') {
                        window[pageName + 'Init']();
                    }
                }
                
                return true;
            };
        }
    }
    
    // Completely disable role manager
    function disableRoleManager() {
        if (window.roleManager) {
            console.log('🔓 Disabling roleManager...');
            window.roleManager = {
                hasPermission: function() { return true; },
                canAccess: function() { return true; },
                checkRole: function() { return 'owner'; },
                gateNavigationByRole: function() { return true; },
                activeEmployee: { role: 'owner' },
                getCurrentRole: function() { return 'owner'; }
            };
        }
        
        // Create fake roleManager if it doesn't exist
        if (!window.roleManager) {
            window.roleManager = {
                hasPermission: function() { return true; },
                canAccess: function() { return true; },
                checkRole: function() { return 'owner'; },
                gateNavigationByRole: function() { return true; },
                activeEmployee: { role: 'owner' },
                getCurrentRole: function() { return 'owner'; }
            };
        }
    }
    
    // Override all permission checks globally
    function overrideAllPermissions() {
        console.log('🔓 Overriding all permission functions...');
        
        // List of functions to override
        const functionsToOverride = [
            'checkPermission',
            'hasPermission',
            'canAccess',
            'verifyRole',
            'checkRole',
            'isAuthorized',
            'hasAccess',
            'checkFeature',
            'isFeatureEnabled',
            'checkEntitlement'
        ];
        
        functionsToOverride.forEach(funcName => {
            window[funcName] = function() { return true; };
        });
    }
    
    // Force show all navigation items
    function showAllNavigation() {
        console.log('👁️ Showing all navigation items...');
        
        // Remove all hiding styles
        const styles = document.createElement('style');
        styles.innerHTML = `
            .nav-item { display: flex !important; visibility: visible !important; }
            .nav-item.hidden { display: flex !important; }
            .nav-item.disabled { opacity: 1 !important; pointer-events: auto !important; }
            .nav-item.locked { opacity: 1 !important; pointer-events: auto !important; }
            .page.hidden { /* Keep pages hidden unless active */ }
            .feature-lock { display: none !important; }
            .upgrade-prompt { display: none !important; }
            .plan-gate { display: none !important; }
            [data-feature] { display: initial !important; visibility: visible !important; }
            [data-plan] { display: initial !important; visibility: visible !important; }
            [data-entitlement] { display: initial !important; visibility: visible !important; }
        `;
        document.head.appendChild(styles);
        
        // Show all nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.style.display = '';
            item.style.visibility = 'visible';
            item.classList.remove('hidden', 'disabled', 'locked');
            item.removeAttribute('hidden');
            item.removeAttribute('disabled');
        });
    }
    
    // Force owner role in all storage
    function forceOwnerRole() {
        console.log('👤 Forcing owner role in storage...');
        
        // Update all possible storage locations
        const storageKeys = ['userData', 'auth_user', 'user', 'currentUser'];
        
        storageKeys.forEach(key => {
            const data = localStorage.getItem(key);
            if (data) {
                try {
                    const parsed = JSON.parse(data);
                    parsed.role = 'owner';
                    parsed.plan = 'pro';
                    parsed.subscriptionPlan = 'pro';
                    localStorage.setItem(key, JSON.stringify(parsed));
                } catch (e) {
                    // Ignore parse errors
                }
            }
        });
        
        // Also set a flag
        localStorage.setItem('forceOwnerRole', 'true');
        localStorage.setItem('currentRole', 'owner');
    }
    
    // Main initialization
    function init() {
        console.log('🚀 Starting complete restriction removal...');
        
        // Force owner role first
        forceOwnerRole();
        
        // Disable all restrictions
        disableRoleManager();
        overrideAllPermissions();
        overrideAppNavigation();
        
        // Show everything
        showAllNavigation();
        
        // Make dashboard visible if nothing else is
        const hasActivePage = document.querySelector('.page.active');
        if (!hasActivePage) {
            const dashboard = document.getElementById('dashboard');
            if (dashboard) {
                dashboard.style.display = 'block';
                dashboard.classList.add('active');
            }
        }
        
        console.log('✅ All restrictions removed!');
    }
    
    // Run immediately
    init();
    
    // Run again after DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    }
    
    // Keep running periodically to override any late-loading scripts
    setInterval(function() {
        disableRoleManager();
        overrideAllPermissions();
    }, 500);
    
    // Make functions globally available
    window.disableAllRestrictions = {
        init: init,
        override: overrideAllPermissions,
        showAll: showAllNavigation
    };
    
    console.log('✅ Restriction disabler ready');
})();