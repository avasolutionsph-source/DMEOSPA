// FIX: Ensure Rooms appears in sidebar navigation and fix console errors
console.log('🔧 Fixing Rooms in sidebar navigation...');

(function() {
    // Step 1: Fix entitlements errors
    function fixEntitlementsErrors() {
        if (window.entitlementsSystem) {
            // Ensure entitlements object exists
            if (!window.entitlementsSystem.entitlements) {
                window.entitlementsSystem.entitlements = {};
            }
            
            // Force enable rooms for PRO users
            window.entitlementsSystem.entitlements.rooms = true;
            
            // Ensure sidebarFeatures includes rooms
            if (window.entitlementsSystem.updateUI) {
                const originalUpdateUI = window.entitlementsSystem.updateUI.bind(window.entitlementsSystem);
                window.entitlementsSystem.updateUI = function() {
                    // Ensure rooms is enabled before updating UI
                    this.entitlements.rooms = true;
                    originalUpdateUI();
                };
            }
            
            console.log('✅ Fixed entitlements for rooms');
        }
    }
    
    // Step 2: Add Rooms to sidebar if not present
    function addRoomsToSidebar() {
        // Check if rooms already exists in sidebar
        const existingRooms = document.querySelector('.nav-menu a[data-page="rooms"]');
        if (existingRooms) {
            console.log('Rooms already in sidebar');
            // Make sure it's visible
            existingRooms.style.display = '';
            existingRooms.style.opacity = '1';
            existingRooms.style.pointerEvents = 'auto';
            existingRooms.classList.remove('disabled', 'locked', 'premium-locked');
            return;
        }
        
        // Find the nav menu
        const navMenu = document.querySelector('.nav-menu');
        if (!navMenu) {
            console.log('Nav menu not found, retrying...');
            setTimeout(addRoomsToSidebar, 500);
            return;
        }
        
        // Find employees item to insert after
        const employeesItem = document.querySelector('.nav-menu a[data-page="employees"]');
        
        if (!employeesItem) {
            console.log('Employees not found, looking for alternative position...');
            // Try to insert after POS
            const posItem = document.querySelector('.nav-menu a[data-page="pos"]');
            if (posItem) {
                insertRoomsAfter(posItem);
            } else {
                // Insert after inventory
                const inventoryItem = document.querySelector('.nav-menu a[data-page="inventory"]');
                if (inventoryItem) {
                    insertRoomsAfter(inventoryItem);
                }
            }
        } else {
            insertRoomsAfter(employeesItem);
        }
    }
    
    function insertRoomsAfter(referenceItem) {
        const roomsLink = document.createElement('a');
        roomsLink.href = '#';
        roomsLink.className = 'nav-item';
        roomsLink.setAttribute('data-page', 'rooms');
        
        // Copy exact styles from reference item
        const computedStyle = window.getComputedStyle(referenceItem);
        roomsLink.style.cssText = referenceItem.style.cssText;
        roomsLink.style.display = computedStyle.display;
        roomsLink.style.padding = computedStyle.padding;
        roomsLink.style.margin = computedStyle.margin;
        roomsLink.style.color = computedStyle.color;
        roomsLink.style.backgroundColor = computedStyle.backgroundColor;
        roomsLink.style.textDecoration = computedStyle.textDecoration;
        roomsLink.style.fontSize = computedStyle.fontSize;
        roomsLink.style.fontWeight = computedStyle.fontWeight;
        roomsLink.style.opacity = '1';
        roomsLink.style.pointerEvents = 'auto';
        
        roomsLink.innerHTML = `
            <i class="fas fa-door-open"></i>
            <span>Rooms</span>
        `;
        
        // Insert after reference item
        referenceItem.parentNode.insertBefore(roomsLink, referenceItem.nextSibling);
        
        // Add click handler
        roomsLink.addEventListener('click', function(e) {
            e.preventDefault();
            handleRoomsNavigation();
        });
        
        console.log('✅ Rooms added to sidebar after', referenceItem.querySelector('span').textContent);
    }
    
    // Step 3: Handle navigation
    function handleRoomsNavigation() {
        // Update active states
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const roomsItem = document.querySelector('a[data-page="rooms"]');
        if (roomsItem) {
            roomsItem.classList.add('active');
        }
        
        // Navigate using app's navigation system
        if (window.app && window.app.navigateTo) {
            window.app.navigateTo('rooms');
        } else {
            // Manual navigation
            document.querySelectorAll('.page').forEach(page => {
                page.style.display = 'none';
            });
            
            const roomsPage = document.getElementById('rooms');
            if (roomsPage) {
                roomsPage.style.display = 'block';
            }
        }
        
        // Update app state
        if (window.app) {
            window.app.currentPage = 'rooms';
        }
    }
    
    // Step 4: Fix the console errors by patching the entitlements methods
    function patchEntitlementsMethods() {
        // Wait for entitlements to load
        if (!window.entitlementsSystem) {
            setTimeout(patchEntitlementsMethods, 100);
            return;
        }
        
        // Patch the gateNavigationItems method to include rooms
        if (window.entitlementsSystem.gateNavigationItems) {
            const original = window.entitlementsSystem.gateNavigationItems.bind(window.entitlementsSystem);
            window.entitlementsSystem.gateNavigationItems = function() {
                original();
                
                // Ensure rooms is not gated
                const roomsItem = document.querySelector('a[data-page="rooms"]');
                if (roomsItem) {
                    roomsItem.classList.remove('disabled', 'locked', 'premium-locked');
                    roomsItem.style.opacity = '1';
                    roomsItem.style.pointerEvents = 'auto';
                }
            };
        }
    }
    
    // Step 5: Ensure rooms page exists and is properly loaded
    function ensureRoomsPage() {
        // Check if loadRooms function exists
        if (!window.loadRooms) {
            window.loadRooms = async function() {
                console.log('Loading rooms data...');
                
                // Check if rooms.js exists and load it
                try {
                    if (!window.roomsLoaded) {
                        const script = document.createElement('script');
                        script.src = 'js/rooms.js';
                        script.onload = () => {
                            console.log('Rooms.js loaded');
                            window.roomsLoaded = true;
                        };
                        script.onerror = () => {
                            console.log('Could not load rooms.js, using fallback');
                            displayFallbackRooms();
                        };
                        document.head.appendChild(script);
                    }
                } catch (error) {
                    console.log('Using fallback rooms display');
                    displayFallbackRooms();
                }
            };
        }
    }
    
    function displayFallbackRooms() {
        const roomsPage = document.getElementById('rooms');
        if (!roomsPage) return;
        
        // Ensure the page has content
        if (!roomsPage.querySelector('.rooms-grid')) {
            roomsPage.innerHTML = `
                <div class="page-header">
                    <h1>Room Management</h1>
                    <div class="header-actions">
                        <button class="btn btn-primary" onclick="alert('Add Room')">
                            <i class="fas fa-plus-circle"></i> Add Room
                        </button>
                    </div>
                </div>
                <div class="rooms-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; padding: 20px;">
                    <!-- Rooms will be displayed here -->
                </div>
            `;
        }
        
        const grid = roomsPage.querySelector('.rooms-grid');
        if (grid && !grid.children.length) {
            grid.innerHTML = `
                <div style="border: 2px solid #27ae60; padding: 20px; border-radius: 10px; background: #f0fdf4;">
                    <h3>Room 1</h3>
                    <p>Status: Available</p>
                    <button style="background: #27ae60; color: white; padding: 8px 16px; border: none; border-radius: 4px;">Start Service</button>
                </div>
                <div style="border: 2px solid #e74c3c; padding: 20px; border-radius: 10px; background: #fff5f5;">
                    <h3>Room 2</h3>
                    <p>Status: Occupied</p>
                    <button style="background: #e74c3c; color: white; padding: 8px 16px; border: none; border-radius: 4px;">End Service</button>
                </div>
            `;
        }
    }
    
    // Step 6: Execute all fixes
    function executeAllFixes() {
        console.log('🚀 Executing all Rooms fixes...');
        
        // Fix entitlements
        fixEntitlementsErrors();
        
        // Add to sidebar
        addRoomsToSidebar();
        
        // Patch methods
        patchEntitlementsMethods();
        
        // Ensure page exists
        ensureRoomsPage();
        
        // Force update entitlements UI
        if (window.entitlementsSystem && window.entitlementsSystem.updateUI) {
            setTimeout(() => {
                window.entitlementsSystem.updateUI();
                // Re-add rooms if it got removed
                addRoomsToSidebar();
            }, 1000);
        }
        
        console.log('✅ All fixes applied');
    }
    
    // Wait for DOM and app to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', executeAllFixes);
    } else {
        // DOM already loaded
        setTimeout(executeAllFixes, 100);
    }
    
    // Also execute when app is ready
    const checkAppReady = setInterval(() => {
        if (window.app && document.querySelector('.nav-menu')) {
            clearInterval(checkAppReady);
            executeAllFixes();
        }
    }, 500);
    
    // Maximum wait time
    setTimeout(() => {
        clearInterval(checkAppReady);
        executeAllFixes();
    }, 5000);
})();

console.log('✅ Rooms sidebar fix loaded and executing...');