// Complete Owner Page Fix - Ensures all features are visible with logout
(function() {
    'use strict';
    
    console.log('🔧 Owner Complete Fix loading...');
    
    // Define complete navigation structure for owner (without logout - it's at the bottom)
    const OWNER_NAV_ITEMS = [
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
    
    // Function to rebuild navigation menu
    function rebuildOwnerNavigation() {
        console.log('🔨 Rebuilding owner navigation...');
        
        const navMenu = document.querySelector('.nav-menu');
        if (!navMenu) {
            console.warn('Navigation menu not found');
            return;
        }
        
        // Clear existing items
        navMenu.innerHTML = '';
        
        // Build all navigation items
        OWNER_NAV_ITEMS.forEach(item => {
            const navLink = document.createElement('a');
            navLink.href = '#';
            navLink.className = 'nav-item';
            
            navLink.setAttribute('data-page', item.page);
            navLink.innerHTML = `
                <i class="${item.icon}"></i>
                <span>${item.text}</span>
            `;
            
            // Set dashboard as active by default
            if (item.page === 'dashboard') {
                navLink.classList.add('active');
            }
            
            // Add navigation click handler
            navLink.addEventListener('click', function(e) {
                e.preventDefault();
                navigateToPage(item.page);
            });
            
            navMenu.appendChild(navLink);
        });
        
        console.log('✅ Owner navigation rebuilt with all features');
    }
    
    // Function to handle logout
    function handleLogout() {
        console.log('🚪 Logging out...');
        
        // Show confirmation
        if (confirm('Are you sure you want to logout?')) {
            // Clear all auth data
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            localStorage.removeItem('userData');
            localStorage.removeItem('userToken');
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            localStorage.removeItem('currentRole');
            
            // Clear session storage
            sessionStorage.clear();
            
            // Redirect to login
            window.location.href = '/login.html';
        }
    }
    
    // Function to navigate to page
    function navigateToPage(pageName) {
        console.log('📍 Navigating to:', pageName);
        
        // Remove active from all nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active to clicked item
        const clickedItem = document.querySelector(`[data-page="${pageName}"]`);
        if (clickedItem) {
            clickedItem.classList.add('active');
        }
        
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.style.display = 'none';
            page.classList.remove('active');
        });
        
        // Show selected page
        const targetPage = document.getElementById(pageName);
        if (targetPage) {
            targetPage.style.display = 'block';
            targetPage.classList.add('active');
            
            // Save current page
            localStorage.setItem('lastActivePage', pageName);
            
            // Trigger page-specific initialization
            if (window[pageName + 'Init']) {
                window[pageName + 'Init']();
            }
        }
    }
    
    // Function to ensure logout button in sidebar
    function ensureLogoutButton() {
        const authIndicator = document.getElementById('authIndicator');
        const logoutBtn = document.getElementById('logoutBtn');
        
        if (logoutBtn) {
            // Make sure logout button is visible and functional
            logoutBtn.style.display = 'inline-block';
            logoutBtn.onclick = handleLogout;
            
            // Also update user info
            const userData = localStorage.getItem('userData') || localStorage.getItem('auth_user');
            if (userData) {
                try {
                    const user = JSON.parse(userData);
                    const userName = document.getElementById('userName');
                    if (userName) {
                        userName.textContent = user.firstName || user.email || 'Owner';
                    }
                } catch (e) {
                    console.error('Error parsing user data:', e);
                }
            }
        }
        
        // Also ensure sidebar bottom is visible
        const sidebarBottom = document.querySelector('.sidebar-bottom');
        if (sidebarBottom) {
            sidebarBottom.style.display = 'block';
        }
    }
    
    // Function to fix all navigation issues
    function fixAllNavigation() {
        console.log('🔧 Fixing all navigation issues...');
        
        // Rebuild navigation
        rebuildOwnerNavigation();
        
        // Ensure logout button
        ensureLogoutButton();
        
        // Restore last active page
        const lastPage = localStorage.getItem('lastActivePage');
        if (lastPage && lastPage !== 'dashboard') {
            setTimeout(() => navigateToPage(lastPage), 100);
        }
    }
    
    // Initialize on DOM ready
    function initialize() {
        console.log('🚀 Initializing Owner Complete Fix');
        
        // Fix navigation immediately
        fixAllNavigation();
        
        // Fix again after a short delay to override other scripts
        setTimeout(fixAllNavigation, 500);
        setTimeout(fixAllNavigation, 1000);
        setTimeout(fixAllNavigation, 2000);
        
        // Monitor for changes
        const observer = new MutationObserver(function(mutations) {
            const navMenu = document.querySelector('.nav-menu');
            if (navMenu) {
                const navItems = navMenu.querySelectorAll('.nav-item');
                
                // If nav items are incomplete, rebuild
                if (navItems.length < OWNER_NAV_ITEMS.length) {
                    console.log('Navigation incomplete, rebuilding...');
                    fixAllNavigation();
                }
            }
        });
        
        // Start observing
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    // Start initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
    // Make functions globally available
    window.ownerCompleteFix = {
        rebuild: rebuildOwnerNavigation,
        fixAll: fixAllNavigation,
        logout: handleLogout
    };
    
    console.log('✅ Owner Complete Fix ready');
})();