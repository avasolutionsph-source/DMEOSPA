// Owner Refresh Fix - Maintains correct navigation state after page refresh
(function() {
    'use strict';
    
    console.log('🔄 Owner Refresh Fix loading...');
    
    // Correct navigation structure WITHOUT logout (it's already at the bottom)
    const CORRECT_NAV = [
        { icon: 'fas fa-home', text: 'Dashboard', page: 'dashboard' },
        { icon: 'fas fa-cash-register', text: 'POS System', page: 'pos' },
        { icon: 'fas fa-receipt', text: 'Sales & Expenses', page: 'expenses' },
        { icon: 'fas fa-calendar-check', text: 'Bookings', page: 'bookings' },
        { icon: 'fas fa-spa', text: 'Services', page: 'products' },
        { icon: 'fas fa-warehouse', text: 'Inventory', page: 'inventory' },
        { icon: 'fas fa-users', text: 'Employees', page: 'employees' },
        { icon: 'fas fa-door-closed', text: 'Rooms', page: 'rooms' },
        { icon: 'fas fa-robot', text: 'AI Assistant', page: 'chatbot' },
        { icon: 'fas fa-stopwatch', text: 'Timer', page: 'timer' },
        { icon: 'fas fa-cog', text: 'Settings', page: 'settings' }
    ];
    
    // Fix business name display
    function fixBusinessName() {
        const businessNameEl = document.getElementById('businessName');
        if (businessNameEl && (businessNameEl.textContent === 'Loading...' || businessNameEl.textContent === 'Business')) {
            const userData = localStorage.getItem('userData') || localStorage.getItem('auth_user');
            if (userData) {
                try {
                    const user = JSON.parse(userData);
                    businessNameEl.textContent = user.businessName || 'Ava Solutions';
                } catch (e) {
                    businessNameEl.textContent = 'Ava Solutions';
                }
            } else {
                businessNameEl.textContent = 'Ava Solutions';
            }
        }
    }
    
    // Force correct navigation structure
    function forceCorrectNavigation() {
        console.log('🔨 Forcing correct navigation structure...');
        
        // Fix business name first
        fixBusinessName();
        
        const navMenu = document.querySelector('.nav-menu');
        if (!navMenu) {
            console.warn('Nav menu not found, retrying...');
            setTimeout(forceCorrectNavigation, 100);
            return;
        }
        
        // Check if navigation is already correct
        const currentItems = navMenu.querySelectorAll('.nav-item');
        
        // If navigation is wrong, rebuild it
        if (currentItems.length !== CORRECT_NAV.length) {
            console.log('📋 Rebuilding navigation...');
            
            // Clear and rebuild
            navMenu.innerHTML = '';
            
            CORRECT_NAV.forEach(item => {
                const navLink = document.createElement('a');
                navLink.href = '#';
                navLink.className = 'nav-item';
                navLink.setAttribute('data-page', item.page);
                navLink.innerHTML = `<i class="${item.icon}"></i><span>${item.text}</span>`;
                
                // Set active state
                const currentPage = localStorage.getItem('lastActivePage') || 'dashboard';
                if (item.page === currentPage) {
                    navLink.classList.add('active');
                }
                
                // Add click handler
                navLink.onclick = function(e) {
                    e.preventDefault();
                    navigateToPage(item.page);
                };
                
                navMenu.appendChild(navLink);
            });
            
            console.log('✅ Navigation rebuilt correctly');
        }
    }
    
    // Navigation function
    function navigateToPage(pageName) {
        // Update active states
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const targetNav = document.querySelector(`[data-page="${pageName}"]`);
        if (targetNav) {
            targetNav.classList.add('active');
        }
        
        // Show/hide pages
        document.querySelectorAll('.page').forEach(page => {
            page.style.display = 'none';
            page.classList.remove('active');
        });
        
        const targetPage = document.getElementById(pageName);
        if (targetPage) {
            targetPage.style.display = 'block';
            targetPage.classList.add('active');
        }
        
        // Save state
        localStorage.setItem('lastActivePage', pageName);
    }
    
    // Restore page state after refresh
    function restorePageState() {
        const lastPage = localStorage.getItem('lastActivePage');
        if (lastPage && lastPage !== 'dashboard') {
            console.log('📍 Restoring page:', lastPage);
            setTimeout(() => navigateToPage(lastPage), 200);
        }
    }
    
    // Prevent other scripts from changing navigation
    function protectNavigation() {
        // Override querySelector to protect nav menu
        const originalQS = document.querySelector.bind(document);
        document.querySelector = function(selector) {
            const element = originalQS(selector);
            
            if (selector === '.nav-menu' && element) {
                // Protect the nav menu from modifications
                const originalInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
                Object.defineProperty(element, 'innerHTML', {
                    set: function(value) {
                        // Only allow our changes
                        if (!value.includes('Logout')) {
                            console.warn('Blocked navigation change without logout');
                            forceCorrectNavigation();
                            return;
                        }
                        originalInnerHTML.set.call(this, value);
                    },
                    get: function() {
                        return originalInnerHTML.get.call(this);
                    }
                });
            }
            
            return element;
        };
    }
    
    // Main initialization
    function initialize() {
        console.log('🚀 Initializing refresh fix...');
        
        // Force correct navigation immediately
        forceCorrectNavigation();
        
        // Restore page state
        restorePageState();
        
        // Protect navigation
        protectNavigation();
        
        // Recheck periodically to ensure navigation stays correct
        setInterval(function() {
            const navMenu = document.querySelector('.nav-menu');
            if (navMenu) {
                const navItems = navMenu.querySelectorAll('.nav-item');
                if (navItems.length !== CORRECT_NAV.length) {
                    console.log('🔄 Navigation corrupted, fixing...');
                    forceCorrectNavigation();
                }
            }
        }, 1000);
    }
    
    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        // Run immediately and after a delay
        initialize();
        setTimeout(initialize, 100);
        setTimeout(initialize, 500);
    }
    
    // Make functions globally available
    window.ownerRefreshFix = {
        force: forceCorrectNavigation,
        restore: restorePageState,
        navigate: navigateToPage
    };
    
    console.log('✅ Owner Refresh Fix ready');
})();