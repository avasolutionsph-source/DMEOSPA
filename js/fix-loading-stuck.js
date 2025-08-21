// FIX: Remove stuck loading overlay and enable all features
console.log('🔧 Fixing stuck loading issue...');

(function() {
    // Step 1: Remove any loading overlays immediately
    function removeLoadingOverlays() {
        // Remove by ID
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.remove();
            console.log('✅ Removed loading overlay by ID');
        }
        
        // Remove by class
        const overlays = document.querySelectorAll('.loading-overlay, .loading, .loader, [class*="loading"]');
        overlays.forEach(overlay => {
            // Only remove if it's actually a loading element
            if (overlay.style.position === 'fixed' || 
                overlay.style.position === 'absolute' ||
                overlay.textContent.includes('Loading') ||
                overlay.textContent.includes('Processing')) {
                overlay.remove();
                console.log('✅ Removed loading element:', overlay.className);
            }
        });
        
        // Remove any element blocking the screen
        const fixedElements = document.querySelectorAll('[style*="position: fixed"]');
        fixedElements.forEach(elem => {
            if (elem.style.zIndex > 1000 && 
                (elem.style.background || elem.style.backgroundColor)) {
                elem.remove();
                console.log('✅ Removed blocking element');
            }
        });
    }
    
    // Step 2: Call hideLoading if it exists
    function callHideLoading() {
        if (typeof hideLoading === 'function') {
            try {
                hideLoading();
                console.log('✅ Called hideLoading()');
            } catch (e) {
                console.log('Could not call hideLoading:', e);
            }
        }
        
        // Also try window.hideLoading
        if (typeof window.hideLoading === 'function') {
            try {
                window.hideLoading();
                console.log('✅ Called window.hideLoading()');
            } catch (e) {
                console.log('Could not call window.hideLoading:', e);
            }
        }
    }
    
    // Step 3: Make app visible
    function makeAppVisible() {
        // Remove any hidden states
        document.body.style.overflow = 'auto';
        document.body.style.pointerEvents = 'auto';
        
        // Make main content visible
        const mainContent = document.querySelector('.main-content, #app, #root, main');
        if (mainContent) {
            mainContent.style.display = 'block';
            mainContent.style.visibility = 'visible';
            mainContent.style.opacity = '1';
            console.log('✅ Made main content visible');
        }
        
        // Make sidebar visible
        const sidebar = document.querySelector('.sidebar, aside, nav');
        if (sidebar) {
            sidebar.style.display = 'block';
            sidebar.style.visibility = 'visible';
            sidebar.style.opacity = '1';
            console.log('✅ Made sidebar visible');
        }
    }
    
    // Step 4: Enable all features and add Rooms
    function enableAllFeatures() {
        // Force PRO entitlements
        if (window.entitlementsSystem) {
            window.entitlementsSystem.currentPlan = 'pro';
            window.entitlementsSystem.entitlements = {
                pos: true,
                inventory: true,
                employees: true,
                rooms: true,
                dashboard: 'full',
                chatbot: true,
                cloudBackup: true,
                analytics: true,
                multiUser: true,
                support: 'priority'
            };
            window.entitlementsSystem.can = () => true;
            window.entitlementsSystem.requiresUpgrade = () => false;
            window.entitlementsSystem.showUpgradePrompt = () => {};
        }
        
        // Add Rooms to sidebar if not present
        addRoomsToSidebar();
        
        // Enable navigation
        const navItems = document.querySelectorAll('.nav-item, [data-page]');
        navItems.forEach(item => {
            item.classList.remove('disabled', 'locked', 'premium-locked');
            item.style.opacity = '1';
            item.style.pointerEvents = 'auto';
            item.style.cursor = 'pointer';
        });
        
        console.log('✅ Enabled all features');
    }
    
    // Add Rooms feature to sidebar
    function addRoomsToSidebar() {
        // Check if Rooms already exists
        if (document.querySelector('[data-page="rooms"]')) {
            return;
        }
        
        const navMenu = document.querySelector('.nav-menu');
        if (!navMenu) return;
        
        // Find employees item to insert after
        const employeesItem = document.querySelector('[data-page="employees"]');
        if (!employeesItem) return;
        
        // Create Rooms link
        const roomsLink = document.createElement('a');
        roomsLink.href = '#';
        roomsLink.className = 'nav-item';
        roomsLink.setAttribute('data-page', 'rooms');
        roomsLink.innerHTML = `
            <i class="fas fa-door-open"></i>
            <span>Rooms</span>
        `;
        
        // Copy styles from employees item
        const computedStyle = window.getComputedStyle(employeesItem);
        roomsLink.style.display = computedStyle.display;
        roomsLink.style.padding = computedStyle.padding;
        roomsLink.style.color = computedStyle.color;
        roomsLink.style.textDecoration = computedStyle.textDecoration;
        
        // Insert after employees
        employeesItem.parentNode.insertBefore(roomsLink, employeesItem.nextSibling);
        
        // Add click handler
        roomsLink.addEventListener('click', function(e) {
            e.preventDefault();
            if (window.app && window.app.navigateTo) {
                window.app.navigateTo('rooms');
            }
        });
        
        console.log('✅ Added Rooms to sidebar');
    }
    
    // Step 5: Fix app initialization if needed
    function fixAppInit() {
        // If app exists but didn't initialize properly
        if (window.app && typeof window.app.init === 'function') {
            try {
                // Check if app is already initialized
                if (!window.app.initialized) {
                    console.log('Attempting to initialize app...');
                    window.app.init();
                }
            } catch (e) {
                console.log('Could not initialize app:', e);
            }
        }
        
        // Navigate to dashboard if no page is active
        setTimeout(() => {
            const activePage = document.querySelector('.page[style*="block"]');
            if (!activePage) {
                const dashboard = document.getElementById('dashboard');
                if (dashboard) {
                    dashboard.style.display = 'block';
                    console.log('✅ Showed dashboard');
                }
            }
        }, 500);
    }
    
    // Execute fixes immediately
    removeLoadingOverlays();
    callHideLoading();
    makeAppVisible();
    enableAllFeatures();
    
    // Execute again after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            removeLoadingOverlays();
            callHideLoading();
            makeAppVisible();
            enableAllFeatures();
            fixAppInit();
        });
    } else {
        // DOM already loaded
        setTimeout(() => {
            removeLoadingOverlays();
            callHideLoading();
            makeAppVisible();
            enableAllFeatures();
            fixAppInit();
        }, 100);
    }
    
    // Continue monitoring for loading overlays
    setInterval(() => {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.remove();
            console.log('Removed recurring loading overlay');
        }
    }, 1000);
})();

console.log('✅ Loading fix applied');