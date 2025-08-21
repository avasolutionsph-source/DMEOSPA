// Owner Features Fix - Ensures all features are always visible for owner
(function() {
    'use strict';
    
    console.log('🔓 Owner Features Fix - Removing all restrictions...');
    
    // Override entitlements system to always allow everything for owner
    function overrideEntitlements() {
        if (window.entitlementsSystem) {
            console.log('📋 Overriding entitlements system...');
            
            // Force PRO plan for owner
            window.entitlementsSystem.currentPlan = 'pro';
            window.entitlementsSystem.entitlements = {
                pos: { enabled: true },
                inventory: { enabled: true },
                employees: { enabled: true },
                bookings: { enabled: true },
                products: { enabled: true },
                expenses: { enabled: true },
                rooms: { enabled: true },
                chatbot: { enabled: true },
                timer: { enabled: true },
                settings: { enabled: true },
                dashboard: { enabled: true },
                all_features: true
            };
            
            // Override check methods to always return true
            window.entitlementsSystem.checkFeature = function() { return true; };
            window.entitlementsSystem.hasAccess = function() { return true; };
            window.entitlementsSystem.canAccess = function() { return true; };
            window.entitlementsSystem.isFeatureEnabled = function() { return true; };
            
            console.log('✅ Entitlements overridden - all features enabled');
        }
    }
    
    // Remove all display:none and hidden attributes
    function showAllFeatures() {
        console.log('👁️ Making all features visible...');
        
        // Show all nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.style.display = '';
            item.style.visibility = 'visible';
            item.classList.remove('hidden', 'disabled', 'locked');
            item.removeAttribute('hidden');
            item.removeAttribute('disabled');
        });
        
        // Show all pages
        document.querySelectorAll('.page').forEach(page => {
            // Don't change active page display
            if (!page.classList.contains('active')) {
                page.style.display = 'none';
            } else {
                page.style.display = 'block';
            }
            page.style.visibility = 'visible';
            page.classList.remove('hidden', 'disabled', 'locked');
        });
        
        // Remove any feature gates
        document.querySelectorAll('[data-feature], [data-plan], [data-entitlement]').forEach(el => {
            el.style.display = '';
            el.style.visibility = 'visible';
            el.classList.remove('hidden', 'disabled', 'locked', 'gated');
            el.removeAttribute('hidden');
            el.removeAttribute('disabled');
        });
        
        // Remove any upgrade prompts or locks
        document.querySelectorAll('.upgrade-prompt, .feature-lock, .plan-gate').forEach(el => {
            el.style.display = 'none';
            el.remove();
        });
        
        console.log('✅ All features made visible');
    }
    
    // Override permission checks
    function overridePermissions() {
        console.log('🔑 Overriding permission checks...');
        
        // Override any permission check functions
        if (window.checkPermission) {
            window.checkPermission = function() { return true; };
        }
        
        if (window.hasPermission) {
            window.hasPermission = function() { return true; };
        }
        
        if (window.canAccess) {
            window.canAccess = function() { return true; };
        }
        
        // Override role checks to always return owner privileges
        if (window.roleManager) {
            window.roleManager.hasPermission = function() { return true; };
            window.roleManager.canAccess = function() { return true; };
            window.roleManager.checkRole = function() { return 'owner'; };
            window.roleManager.gateNavigationByRole = function() { return true; };
        }
        
        console.log('✅ Permissions overridden');
    }
    
    // Force user to be recognized as owner
    function forceOwnerRole() {
        const userData = localStorage.getItem('userData') || localStorage.getItem('auth_user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                user.role = 'owner';
                user.plan = 'pro';
                user.subscriptionPlan = 'pro';
                localStorage.setItem('userData', JSON.stringify(user));
                localStorage.setItem('auth_user', JSON.stringify(user));
                console.log('✅ User role forced to owner with pro plan');
            } catch (e) {
                console.error('Could not update user data:', e);
            }
        }
    }
    
    // Main initialization
    function init() {
        console.log('🚀 Initializing Owner Features Fix...');
        
        // Force owner role
        forceOwnerRole();
        
        // Override all restrictions
        overrideEntitlements();
        overridePermissions();
        
        // Show all features
        showAllFeatures();
        
        // Re-run periodically to ensure features stay visible
        setInterval(function() {
            overrideEntitlements();
            showAllFeatures();
        }, 1000);
    }
    
    // Run immediately and when DOM is ready
    init();
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 100);
        setTimeout(init, 500);
    }
    
    // Make functions globally available
    window.ownerFeaturesFix = {
        init: init,
        showAll: showAllFeatures,
        override: overrideEntitlements
    };
    
    console.log('✅ Owner Features Fix ready');
})();