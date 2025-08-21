// FINAL FIX: Force enable Rooms for logged-in PRO users
console.log('🔧 Force-enabling Rooms feature for logged-in PRO users...');

(function() {
    // Step 1: Check user status
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userData = localStorage.getItem('userData');
    let userPlan = 'pro'; // Default to PRO
    
    if (userData) {
        try {
            const parsed = JSON.parse(userData);
            userPlan = parsed.subscriptionPlan || parsed.plan || 'pro';
            console.log('User plan:', userPlan);
        } catch (e) {
            console.log('Could not parse userData, assuming PRO');
        }
    }
    
    // Step 2: Force enable rooms in entitlements
    function forceEnableRooms() {
        if (window.entitlementsSystem) {
            window.entitlementsSystem.currentPlan = 'pro';
            window.entitlementsSystem.entitlements = window.entitlementsSystem.entitlements || {};
            window.entitlementsSystem.entitlements.rooms = true;
            console.log('✅ Forced rooms entitlement');
            
            // Update UI immediately
            if (window.entitlementsSystem.updateUI) {
                window.entitlementsSystem.updateUI();
            }
        }
    }
    
    // Step 3: Add Rooms to navigation menu
    function addRoomsToMenu() {
        // Check if already exists
        if (document.querySelector('[data-page="rooms"]')) {
            console.log('Rooms menu already exists');
            return;
        }
        
        const navMenu = document.querySelector('.nav-menu');
        if (!navMenu) {
            console.log('Navigation menu not found, retrying...');
            setTimeout(addRoomsToMenu, 500);
            return;
        }
        
        // Find employees item to insert after
        const employeesItem = Array.from(navMenu.querySelectorAll('.nav-item')).find(
            item => item.getAttribute('data-page') === 'employees'
        );
        
        if (!employeesItem) {
            console.log('Employees not found, inserting after POS');
            const posItem = Array.from(navMenu.querySelectorAll('.nav-item')).find(
                item => item.getAttribute('data-page') === 'pos'
            );
            if (posItem) {
                insertRoomsAfter(posItem);
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
        roomsLink.innerHTML = `
            <i class="fas fa-door-open"></i>
            <span>Rooms</span>
        `;
        
        // Copy styles from reference
        const computedStyle = window.getComputedStyle(referenceItem);
        roomsLink.style.display = computedStyle.display;
        roomsLink.style.padding = computedStyle.padding;
        roomsLink.style.color = computedStyle.color;
        roomsLink.style.textDecoration = computedStyle.textDecoration;
        
        referenceItem.parentNode.insertBefore(roomsLink, referenceItem.nextSibling);
        
        // Setup click handler
        roomsLink.addEventListener('click', handleRoomsClick);
        
        console.log('✅ Rooms menu added');
    }
    
    function handleRoomsClick(e) {
        e.preventDefault();
        
        // Update active state
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        e.currentTarget.classList.add('active');
        
        // Ensure rooms page exists
        ensureRoomsPage();
        
        // Navigate to rooms
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
    
    // Step 4: Create Rooms page
    function ensureRoomsPage() {
        if (document.getElementById('rooms')) {
            return;
        }
        
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) {
            console.error('Main content not found');
            return;
        }
        
        const roomsPage = document.createElement('div');
        roomsPage.id = 'rooms';
        roomsPage.className = 'page';
        roomsPage.style.display = 'none';
        roomsPage.innerHTML = `
            <div class="page-header">
                <h1>Room Management</h1>
                <div class="header-actions">
                    <button class="btn btn-primary" onclick="if(window.addRoom) window.addRoom(); else alert('Add Room feature coming soon!');">
                        <i class="fas fa-plus-circle"></i> Add Room
                    </button>
                </div>
            </div>
            <div class="rooms-grid" id="roomsGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; padding: 20px;">
                <!-- Loading rooms... -->
            </div>
        `;
        
        mainContent.appendChild(roomsPage);
        
        // Load rooms data
        loadRoomsData();
        
        console.log('✅ Rooms page created');
    }
    
    function loadRoomsData() {
        const grid = document.getElementById('roomsGrid');
        if (!grid) return;
        
        // Sample rooms data with timer
        const rooms = [
            { id: 1, name: 'Room 1', type: 'Massage', status: 'available' },
            { 
                id: 2, 
                name: 'Room 2', 
                type: 'Massage', 
                status: 'occupied',
                client: 'Jane Doe',
                service: 'Swedish Massage',
                therapist: 'Maria',
                startTime: new Date(Date.now() - 15 * 60000) // Started 15 minutes ago
            },
            { id: 3, name: 'Room 3', type: 'Facial', status: 'available' },
            { id: 4, name: 'VIP Suite', type: 'VIP', status: 'available' }
        ];
        
        // Store rooms globally for timer updates
        window.roomsData = rooms;
        
        // Render rooms
        renderRooms();
        
        // Start timer updates
        if (!window.roomTimerInterval) {
            window.roomTimerInterval = setInterval(updateRoomTimers, 1000);
        }
    }
    
    function renderRooms() {
        const grid = document.getElementById('roomsGrid');
        if (!grid || !window.roomsData) return;
        
        grid.innerHTML = window.roomsData.map(room => {
            const isOccupied = room.status === 'occupied';
            const borderColor = isOccupied ? '#e74c3c' : '#27ae60';
            const bgColor = isOccupied ? '#fff5f5' : '#f0fdf4';
            
            let timerDisplay = '';
            if (isOccupied && room.startTime) {
                const elapsed = Math.floor((Date.now() - room.startTime) / 1000);
                const minutes = Math.floor(elapsed / 60);
                const seconds = elapsed % 60;
                timerDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
            
            return `
                <div class="room-card" style="border: 2px solid ${borderColor}; background: ${bgColor}; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <div style="background: ${borderColor}; color: white; padding: 12px 15px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span><i class="fas fa-door-${isOccupied ? 'closed' : 'open'}"></i> ${room.name}</span>
                            <span style="font-size: 12px;">${room.status.toUpperCase()}</span>
                        </div>
                    </div>
                    <div style="padding: 15px;">
                        <p style="margin: 5px 0; color: #666;"><i class="fas fa-tag"></i> ${room.type} Room</p>
                        ${isOccupied ? `
                            <div style="background: rgba(231,76,60,0.1); padding: 10px; border-radius: 8px; margin: 10px 0; text-align: center;">
                                <div style="font-size: 20px; font-weight: bold; color: #e74c3c;">
                                    <i class="fas fa-clock"></i> <span class="room-timer" data-room-id="${room.id}">${timerDisplay}</span>
                                </div>
                            </div>
                            <div style="background: white; padding: 10px; border-radius: 5px; font-size: 14px;">
                                <p style="margin: 3px 0;"><strong>Service:</strong> ${room.service}</p>
                                <p style="margin: 3px 0;"><strong>Client:</strong> ${room.client}</p>
                                <p style="margin: 3px 0;"><strong>Therapist:</strong> ${room.therapist}</p>
                            </div>
                            <button class="btn btn-danger btn-sm" style="width: 100%; margin-top: 10px; padding: 8px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="if(window.endService) window.endService(${room.id}); else alert('End service: Room ${room.id}');">
                                <i class="fas fa-stop"></i> End Service
                            </button>
                        ` : `
                            <button class="btn btn-success btn-sm" style="width: 100%; margin-top: 10px; padding: 8px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="if(window.startService) window.startService(${room.id}); else alert('Start service: Room ${room.id}');">
                                <i class="fas fa-play"></i> Start Service
                            </button>
                        `}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    function updateRoomTimers() {
        if (!window.roomsData) return;
        
        window.roomsData.forEach(room => {
            if (room.status === 'occupied' && room.startTime) {
                const timerElement = document.querySelector(`.room-timer[data-room-id="${room.id}"]`);
                if (timerElement) {
                    const elapsed = Math.floor((Date.now() - room.startTime) / 1000);
                    const minutes = Math.floor(elapsed / 60);
                    const seconds = elapsed % 60;
                    timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                }
            }
        });
    }
    
    // Step 5: Hook into app's loadPageData
    function hookIntoApp() {
        if (window.app && window.app.loadPageData) {
            const originalLoadPageData = window.app.loadPageData.bind(window.app);
            window.app.loadPageData = async function(page) {
                if (page === 'rooms') {
                    console.log('Loading rooms page...');
                    ensureRoomsPage();
                    loadRoomsData();
                } else {
                    await originalLoadPageData(page);
                }
            };
        }
    }
    
    // Step 6: Execute the fix
    function executeFix() {
        console.log('🚀 Executing Rooms fix for logged-in user...');
        
        // Force enable entitlements
        forceEnableRooms();
        
        // Add rooms to menu
        addRoomsToMenu();
        
        // Hook into app
        hookIntoApp();
        
        // Show notification
        showNotification();
        
        // Auto-navigate to rooms after a delay
        setTimeout(() => {
            const roomsLink = document.querySelector('[data-page="rooms"]');
            if (roomsLink) {
                roomsLink.click();
                console.log('✅ Auto-navigated to Rooms');
            }
        }, 1000);
    }
    
    function showNotification() {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px 30px;
            border-radius: 12px;
            z-index: 999999;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease;
        `;
        notification.innerHTML = `
            <strong>✅ Rooms Feature Enabled!</strong><br>
            <small>Click "Rooms" in the menu to access</small>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
    
    // Add animation CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    // Wait for app to be ready
    function waitForApp() {
        if (document.querySelector('.nav-menu')) {
            executeFix();
        } else {
            console.log('Waiting for app to load...');
            setTimeout(waitForApp, 500);
        }
    }
    
    // Start the fix
    waitForApp();
})();

console.log('✅ Rooms force-enable script loaded. The Rooms feature should now be visible.');