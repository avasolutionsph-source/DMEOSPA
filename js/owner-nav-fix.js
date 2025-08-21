// Owner Navigation Fix - Ensures all features are visible for owner role
(function() {
    'use strict';
    
    console.log('🔧 Owner Navigation Fix loading...');
    
    // Define all features that should be available to owner
    const OWNER_FEATURES = [
        { id: 'dashboard', icon: 'fas fa-home', text: 'Dashboard', page: 'dashboard' },
        { id: 'pos', icon: 'fas fa-cash-register', text: 'POS System', page: 'pos' },
        { id: 'expenses', icon: 'fas fa-receipt', text: 'Sales & Expenses', page: 'expenses' },
        { id: 'bookings', icon: 'fas fa-calendar-check', text: 'Bookings', page: 'bookings' },
        { id: 'products', icon: 'fas fa-spa', text: 'Services', page: 'products' },
        { id: 'inventory', icon: 'fas fa-warehouse', text: 'Inventory', page: 'inventory' },
        { id: 'employees', icon: 'fas fa-users', text: 'Employees', page: 'employees' },
        { id: 'rooms', icon: 'fas fa-door-closed', text: 'Rooms', page: 'rooms' },
        { id: 'chatbot', icon: 'fas fa-robot', text: 'AI Assistant', page: 'chatbot' },
        { id: 'timer', icon: 'fas fa-stopwatch', text: 'Timer', page: 'timer' },
        { id: 'settings', icon: 'fas fa-cog', text: 'Settings', page: 'settings' }
    ];
    
    // Function to check if user is owner
    function isOwner() {
        const userData = localStorage.getItem('auth_user') || 
                        localStorage.getItem('userData') || 
                        localStorage.getItem('user');
        
        if (userData) {
            try {
                const user = JSON.parse(userData);
                return user.role === 'owner' || user.role === 'admin' || user.email === 'smnaga@gmail.com';
            } catch (e) {
                console.error('Error parsing user data:', e);
            }
        }
        return false;
    }
    
    // Function to restore owner navigation
    function restoreOwnerNavigation() {
        console.log('🔧 Restoring owner navigation...');
        
        const navMenu = document.querySelector('.nav-menu');
        if (!navMenu) {
            console.warn('Navigation menu not found');
            return;
        }
        
        // Clear existing nav items
        const existingItems = navMenu.querySelectorAll('.nav-item');
        
        // Check if we already have all features
        if (existingItems.length >= OWNER_FEATURES.length) {
            console.log('✅ All features already visible');
            return;
        }
        
        // Clear and rebuild navigation
        navMenu.innerHTML = '';
        
        // Add all owner features
        OWNER_FEATURES.forEach(feature => {
            const navItem = document.createElement('a');
            navItem.href = '#';
            navItem.className = 'nav-item';
            navItem.setAttribute('data-page', feature.page);
            
            // Set active class for dashboard by default
            if (feature.page === 'dashboard') {
                navItem.classList.add('active');
            }
            
            navItem.innerHTML = `
                <i class="${feature.icon}"></i>
                <span>${feature.text}</span>
            `;
            
            // Add click handler
            navItem.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Remove active from all
                document.querySelectorAll('.nav-item').forEach(item => {
                    item.classList.remove('active');
                });
                
                // Add active to clicked
                this.classList.add('active');
                
                // Navigate to page
                if (window.pageStateManager) {
                    window.pageStateManager.navigateTo(feature.page);
                } else if (window.app && window.app.navigateTo) {
                    window.app.navigateTo(feature.page);
                } else {
                    // Manual navigation
                    document.querySelectorAll('.page').forEach(p => {
                        p.style.display = 'none';
                        p.classList.remove('active');
                    });
                    
                    const targetPage = document.getElementById(feature.page);
                    if (targetPage) {
                        targetPage.style.display = 'block';
                        targetPage.classList.add('active');
                    }
                }
            });
            
            navMenu.appendChild(navItem);
        });
        
        console.log('✅ Owner navigation restored with all features');
    }
    
    // Function to prevent navigation from being hidden
    function protectNavigation() {
        // Override any functions that might hide navigation
        const originalQuerySelector = document.querySelector;
        document.querySelector = function(selector) {
            const element = originalQuerySelector.call(document, selector);
            
            // If someone is trying to hide nav items, prevent it
            if (element && selector.includes('nav-item')) {
                const originalStyle = element.style;
                Object.defineProperty(element, 'style', {
                    get() { return originalStyle; },
                    set(value) {
                        // Prevent hiding
                        if (value && value.display === 'none') {
                            console.warn('Prevented hiding of nav item');
                            return;
                        }
                        return originalStyle;
                    }
                });
            }
            
            return element;
        };
    }
    
    // Main initialization
    function init() {
        if (!isOwner()) {
            console.log('User is not owner, skipping navigation fix');
            return;
        }
        
        console.log('👤 Owner detected, applying navigation fixes');
        
        // Restore navigation immediately
        restoreOwnerNavigation();
        
        // Protect navigation from being hidden
        protectNavigation();
        
        // Also restore after DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', restoreOwnerNavigation);
        } else {
            setTimeout(restoreOwnerNavigation, 100);
        }
        
        // Restore again after a delay to override any late scripts
        setTimeout(restoreOwnerNavigation, 500);
        setTimeout(restoreOwnerNavigation, 1000);
        setTimeout(restoreOwnerNavigation, 2000);
        
        // Monitor for navigation changes
        const observer = new MutationObserver(function(mutations) {
            const navMenu = document.querySelector('.nav-menu');
            if (navMenu) {
                const navItems = navMenu.querySelectorAll('.nav-item');
                if (navItems.length < OWNER_FEATURES.length) {
                    console.log('Navigation was modified, restoring...');
                    restoreOwnerNavigation();
                }
            }
        });
        
        // Start observing
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    // Initialize
    init();
    
    // Also make restoration function available globally
    window.restoreOwnerNavigation = restoreOwnerNavigation;
    
    console.log('✅ Owner Navigation Fix ready');
})();