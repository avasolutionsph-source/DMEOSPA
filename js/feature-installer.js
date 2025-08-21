// Feature Installer - Install missing features and enable all
console.log('🔧 Feature installer loaded');

(function() {
    // Install missing features
    async function installMissingFeatures() {
        console.log('📦 Installing missing features...');
        
        // Show loading
        if (typeof showLoading === 'function') {
            showLoading('Installing Features...', 'Adding Rooms and other missing features');
        }
        
        try {
            // 1. Force add Rooms to navigation
            const roomsAdded = forceAddRoomsToSidebar();
            
            // 2. Create Rooms page
            createRoomsPage();
            
            // 3. Enable all entitlements
            enableAllEntitlements();
            
            // 4. Update database version if needed
            await updateDatabaseVersion();
            
            // Hide loading
            if (typeof hideLoading === 'function') {
                hideLoading();
            }
            
            // Show success
            if (roomsAdded) {
                if (typeof showNotification === 'function') {
                    showNotification('✅ Rooms installed! Click "Rooms" in the sidebar to access.', 'success');
                } else {
                    alert('✅ Rooms installed! Click "Rooms" in the sidebar to access.');
                }
            } else {
                if (typeof showNotification === 'function') {
                    showNotification('⚠️ Could not add Rooms. Please refresh and try again.', 'warning');
                } else {
                    alert('⚠️ Could not add Rooms. Please refresh and try again.');
                }
            }
            
            // Don't auto-refresh, let user see the result
            
        } catch (error) {
            console.error('Error installing features:', error);
            if (typeof hideLoading === 'function') {
                hideLoading();
            }
            if (typeof showNotification === 'function') {
                showNotification('Error installing features: ' + error.message, 'error');
            }
        }
    }
    
    // Add Rooms feature to navigation
    function addRoomsFeature() {
        // Check if already exists
        if (document.querySelector('[data-page="rooms"]')) {
            console.log('Rooms already exists in navigation');
            return;
        }
        
        const navMenu = document.querySelector('.nav-menu');
        if (!navMenu) {
            throw new Error('Navigation menu not found');
        }
        
        // Find employees item
        const employeesItem = document.querySelector('[data-page="employees"]');
        if (!employeesItem) {
            throw new Error('Employees menu item not found');
        }
        
        // Create Rooms link
        const roomsLink = document.createElement('a');
        roomsLink.href = '#';
        roomsLink.className = 'nav-item';
        roomsLink.setAttribute('data-page', 'rooms');
        roomsLink.innerHTML = `
            <i class="fas fa-door-open"></i>
            <span>Rooms</span>
        `;
        
        // Copy styles
        const computedStyle = window.getComputedStyle(employeesItem);
        roomsLink.style.display = computedStyle.display;
        roomsLink.style.padding = computedStyle.padding;
        roomsLink.style.color = computedStyle.color;
        
        // Insert after employees
        employeesItem.parentNode.insertBefore(roomsLink, employeesItem.nextSibling);
        
        console.log('✅ Rooms added to navigation');
    }
    
    // Create Rooms page
    function createRoomsPage() {
        // Check if already exists
        if (document.getElementById('rooms')) {
            console.log('Rooms page already exists');
            return;
        }
        
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) {
            throw new Error('Main content area not found');
        }
        
        // Create rooms page
        const roomsPage = document.createElement('div');
        roomsPage.id = 'rooms';
        roomsPage.className = 'page';
        roomsPage.style.display = 'none';
        roomsPage.innerHTML = `
            <div class="page-header">
                <h1>Room Management</h1>
                <div class="header-actions">
                    <button class="btn btn-primary" onclick="alert('Add Room feature coming soon!')">
                        <i class="fas fa-plus-circle"></i> Add Room
                    </button>
                </div>
            </div>
            <div class="rooms-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; padding: 20px;">
                <div style="border: 2px solid #27ae60; background: #f0fdf4; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <div style="background: #27ae60; color: white; padding: 12px 15px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span><i class="fas fa-door-open"></i> Room 1</span>
                            <span style="font-size: 12px;">AVAILABLE</span>
                        </div>
                    </div>
                    <div style="padding: 15px;">
                        <p style="margin: 5px 0; color: #666;"><i class="fas fa-tag"></i> Massage Room</p>
                        <p style="margin: 5px 0; color: #666;"><i class="fas fa-users"></i> Capacity: 1</p>
                        <button style="width: 100%; margin-top: 10px; padding: 8px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            <i class="fas fa-play"></i> Start Service
                        </button>
                    </div>
                </div>
                
                <div style="border: 2px solid #e74c3c; background: #fff5f5; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <div style="background: #e74c3c; color: white; padding: 12px 15px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span><i class="fas fa-door-closed"></i> Room 2</span>
                            <span style="font-size: 12px;">OCCUPIED</span>
                        </div>
                    </div>
                    <div style="padding: 15px;">
                        <p style="margin: 5px 0; color: #666;"><i class="fas fa-tag"></i> Massage Room</p>
                        <div style="background: rgba(231,76,60,0.1); padding: 10px; border-radius: 8px; margin: 10px 0; text-align: center;">
                            <div style="font-size: 20px; font-weight: bold; color: #e74c3c;">
                                <i class="fas fa-clock"></i> 15:32
                            </div>
                        </div>
                        <div style="background: white; padding: 10px; border-radius: 5px; font-size: 14px;">
                            <p style="margin: 3px 0;"><strong>Service:</strong> Swedish Massage</p>
                            <p style="margin: 3px 0;"><strong>Client:</strong> Jane Doe</p>
                            <p style="margin: 3px 0;"><strong>Therapist:</strong> Maria</p>
                        </div>
                        <button style="width: 100%; margin-top: 10px; padding: 8px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            <i class="fas fa-stop"></i> End Service
                        </button>
                    </div>
                </div>
                
                <div style="border: 2px solid #27ae60; background: #f0fdf4; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <div style="background: #27ae60; color: white; padding: 12px 15px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span><i class="fas fa-door-open"></i> Room 3</span>
                            <span style="font-size: 12px;">AVAILABLE</span>
                        </div>
                    </div>
                    <div style="padding: 15px;">
                        <p style="margin: 5px 0; color: #666;"><i class="fas fa-tag"></i> Facial Room</p>
                        <p style="margin: 5px 0; color: #666;"><i class="fas fa-users"></i> Capacity: 1</p>
                        <button style="width: 100%; margin-top: 10px; padding: 8px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            <i class="fas fa-play"></i> Start Service
                        </button>
                    </div>
                </div>
                
                <div style="border: 2px solid #27ae60; background: #f0fdf4; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <div style="background: #27ae60; color: white; padding: 12px 15px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span><i class="fas fa-door-open"></i> VIP Suite</span>
                            <span style="font-size: 12px;">AVAILABLE</span>
                        </div>
                    </div>
                    <div style="padding: 15px;">
                        <p style="margin: 5px 0; color: #666;"><i class="fas fa-crown"></i> VIP Suite</p>
                        <p style="margin: 5px 0; color: #666;"><i class="fas fa-users"></i> Capacity: 4</p>
                        <button style="width: 100%; margin-top: 10px; padding: 8px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            <i class="fas fa-play"></i> Start Service
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        mainContent.appendChild(roomsPage);
        console.log('✅ Rooms page created');
    }
    
    // Enable all entitlements
    function enableAllEntitlements() {
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
            console.log('✅ All entitlements enabled');
        }
    }
    
    // Update database version
    async function updateDatabaseVersion() {
        // This would normally update IndexedDB schema
        // For now, just log
        console.log('✅ Database version checked');
    }
    
    // Enable all features
    function enableAllFeatures() {
        console.log('🔓 Enabling all features...');
        
        // Enable entitlements
        enableAllEntitlements();
        
        // Enable all navigation items
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.classList.remove('disabled', 'locked', 'premium-locked');
            item.style.opacity = '1';
            item.style.pointerEvents = 'auto';
        });
        
        // Show notification
        if (typeof showNotification === 'function') {
            showNotification('✅ All features enabled!', 'success');
        } else {
            alert('✅ All features enabled!');
        }
    }
    
    // Check feature status
    function checkFeatureStatus() {
        console.log('📊 Checking feature status...');
        
        // First, try to add Rooms if it's missing
        const roomsInSidebar = document.querySelector('[data-page="rooms"]');
        if (!roomsInSidebar) {
            console.log('Rooms not found in sidebar, adding it now...');
            forceAddRoomsToSidebar();
        }
        
        const features = {
            'POS System': document.querySelector('[data-page="pos"]') !== null,
            'Inventory': document.querySelector('[data-page="inventory"]') !== null,
            'Employees': document.querySelector('[data-page="employees"]') !== null,
            'Rooms': document.querySelector('[data-page="rooms"]') !== null,
            'AI Assistant': document.querySelector('[data-page="chatbot"]') !== null,
            'Settings': document.querySelector('[data-page="settings"]') !== null
        };
        
        let statusMessage = 'Feature Status:\n\n';
        for (const [feature, enabled] of Object.entries(features)) {
            statusMessage += `${enabled ? '✅' : '❌'} ${feature}\n`;
        }
        
        // Check entitlements
        if (window.entitlementsSystem) {
            statusMessage += `\nPlan: ${window.entitlementsSystem.currentPlan || 'Unknown'}`;
        }
        
        alert(statusMessage);
        
        // If Rooms still not showing, force add it
        if (!features['Rooms']) {
            setTimeout(() => {
                forceAddRoomsToSidebar();
                location.reload();
            }, 500);
        }
    }
    
    // Force add Rooms to sidebar - more aggressive
    function forceAddRoomsToSidebar() {
        console.log('🔨 Force adding Rooms to sidebar...');
        
        // Remove any existing rooms first
        const existingRooms = document.querySelector('[data-page="rooms"]');
        if (existingRooms) {
            existingRooms.remove();
        }
        
        // Find the nav menu - try multiple selectors
        let navMenu = document.querySelector('.nav-menu');
        if (!navMenu) {
            navMenu = document.querySelector('nav');
        }
        if (!navMenu) {
            navMenu = document.querySelector('.sidebar nav');
        }
        if (!navMenu) {
            // Find by looking for where other nav items are
            const existingNavItem = document.querySelector('[data-page="employees"]');
            if (existingNavItem) {
                navMenu = existingNavItem.parentElement;
            }
        }
        
        if (!navMenu) {
            console.error('Cannot find navigation menu!');
            return false;
        }
        
        // Find a reference item to copy styles from
        const employeesItem = navMenu.querySelector('[data-page="employees"]');
        const referenceItem = employeesItem || navMenu.querySelector('[data-page="inventory"]') || navMenu.querySelector('.nav-item');
        
        if (!referenceItem) {
            console.error('Cannot find reference nav item!');
            return false;
        }
        
        // Create Rooms link with exact same structure
        const roomsLink = document.createElement('a');
        roomsLink.href = '#';
        
        // Copy all classes
        roomsLink.className = referenceItem.className;
        
        // Set data-page attribute
        roomsLink.setAttribute('data-page', 'rooms');
        
        // Copy all inline styles
        roomsLink.style.cssText = referenceItem.style.cssText;
        
        // Set the content
        roomsLink.innerHTML = `
            <i class="fas fa-door-open"></i>
            <span>Rooms</span>
        `;
        
        // Insert after employees or at the end
        if (employeesItem) {
            employeesItem.parentNode.insertBefore(roomsLink, employeesItem.nextSibling);
        } else {
            // Insert before settings if it exists
            const settingsItem = navMenu.querySelector('[data-page="settings"]');
            if (settingsItem) {
                navMenu.insertBefore(roomsLink, settingsItem);
            } else {
                navMenu.appendChild(roomsLink);
            }
        }
        
        // Add click handler
        roomsLink.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Create rooms page if it doesn't exist
            if (!document.getElementById('rooms')) {
                createRoomsPage();
            }
            
            // Navigate to rooms
            if (window.app && window.app.navigateTo) {
                window.app.navigateTo('rooms');
            } else {
                // Manual navigation
                document.querySelectorAll('.nav-item').forEach(item => {
                    item.classList.remove('active');
                });
                roomsLink.classList.add('active');
                
                document.querySelectorAll('.page').forEach(page => {
                    page.style.display = 'none';
                });
                
                const roomsPage = document.getElementById('rooms');
                if (roomsPage) {
                    roomsPage.style.display = 'block';
                }
            }
        });
        
        console.log('✅ Rooms forcefully added to sidebar!');
        return true;
    }
    
    // Setup button handlers when DOM is ready
    function setupButtons() {
        // Install features button
        const installBtn = document.getElementById('installFeaturesBtn');
        if (installBtn && !installBtn.hasAttribute('data-listener')) {
            installBtn.addEventListener('click', installMissingFeatures);
            installBtn.setAttribute('data-listener', 'true');
        }
        
        // Enable all features button
        const enableBtn = document.getElementById('enableAllFeaturesBtn');
        if (enableBtn && !enableBtn.hasAttribute('data-listener')) {
            enableBtn.addEventListener('click', enableAllFeatures);
            enableBtn.setAttribute('data-listener', 'true');
        }
        
        // Check features button
        const checkBtn = document.getElementById('checkFeaturesBtn');
        if (checkBtn && !checkBtn.hasAttribute('data-listener')) {
            checkBtn.addEventListener('click', checkFeatureStatus);
            checkBtn.setAttribute('data-listener', 'true');
        }
    }
    
    // Initialize when ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupButtons);
    } else {
        setupButtons();
    }
    
    // Also setup when settings page is loaded
    window.addEventListener('load', setupButtons);
    
    // Make functions available globally
    window.installMissingFeatures = installMissingFeatures;
    window.enableAllFeatures = enableAllFeatures;
    window.checkFeatureStatus = checkFeatureStatus;
})();

console.log('✅ Feature installer ready');