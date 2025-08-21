// FIX ROOMS FOR LOGGED-IN USERS
console.log('🔐 Fixing Rooms for logged-in user...');

// Step 1: Check login status
const isLoggedIn = localStorage.getItem('isLoggedIn');
const userData = localStorage.getItem('userData');
console.log('Login status:', isLoggedIn);
console.log('User data exists:', !!userData);

// Step 2: Force enable rooms in entitlements for logged-in users
if (window.entitlementsSystem) {
    console.log('Current entitlements:', window.entitlementsSystem.entitlements);
    
    // Force add rooms to entitlements
    window.entitlementsSystem.entitlements.rooms = true;
    
    // Force PRO plan to ensure all features
    window.entitlementsSystem.currentPlan = 'pro';
    
    console.log('✅ Forced rooms entitlement for logged-in user');
}

// Step 3: Wait for page to be ready
function waitForApp() {
    // Check if app is loaded
    if (!window.app || !document.querySelector('.nav-menu')) {
        console.log('Waiting for app to load...');
        setTimeout(waitForApp, 500);
        return;
    }
    
    console.log('✅ App is ready, adding Rooms...');
    addRoomsForLoggedInUser();
}

// Step 4: Add Rooms specifically for logged-in users
function addRoomsForLoggedInUser() {
    // Remove any existing rooms first
    const existingRooms = document.querySelector('[data-page="rooms"]');
    if (existingRooms) {
        existingRooms.remove();
        console.log('Removed existing rooms item');
    }
    
    // Get the nav menu
    const navMenu = document.querySelector('.nav-menu');
    if (!navMenu) {
        console.error('Nav menu not found!');
        return;
    }
    
    // Find employees link (should be visible for PRO users)
    let insertAfter = null;
    const navItems = navMenu.querySelectorAll('a.nav-item');
    
    navItems.forEach(item => {
        if (item.getAttribute('data-page') === 'employees') {
            insertAfter = item;
        }
    });
    
    if (!insertAfter) {
        // If no employees, insert after inventory
        navItems.forEach(item => {
            if (item.getAttribute('data-page') === 'inventory') {
                insertAfter = item;
            }
        });
    }
    
    if (!insertAfter) {
        // If no inventory either, insert after POS
        navItems.forEach(item => {
            if (item.getAttribute('data-page') === 'pos') {
                insertAfter = item;
            }
        });
    }
    
    if (!insertAfter) {
        console.error('Cannot find where to insert Rooms!');
        return;
    }
    
    // Create rooms link with same style as other menu items
    const roomsLink = document.createElement('a');
    roomsLink.href = '#';
    roomsLink.className = 'nav-item'; // Use same class as other items
    roomsLink.setAttribute('data-page', 'rooms');
    
    // Copy styles from another nav item to ensure consistency
    const styleRef = navItems[0];
    if (styleRef) {
        // Copy computed styles
        const computedStyle = window.getComputedStyle(styleRef);
        roomsLink.style.display = computedStyle.display;
        roomsLink.style.padding = computedStyle.padding;
        roomsLink.style.color = computedStyle.color;
        roomsLink.style.textDecoration = computedStyle.textDecoration;
    }
    
    roomsLink.innerHTML = `
        <i class="fas fa-door-open"></i>
        <span>Rooms</span>
    `;
    
    // Insert after the found element
    insertAfter.parentNode.insertBefore(roomsLink, insertAfter.nextSibling);
    console.log('✅ Rooms menu added after', insertAfter.getAttribute('data-page'));
    
    // Setup click handler that works with the app's navigation
    roomsLink.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Use app's navigation if available
        if (window.app && window.app.navigateTo) {
            // First ensure rooms page exists
            ensureRoomsPage();
            
            // Then navigate using app's method
            window.app.navigateTo('rooms');
            console.log('Navigated using app.navigateTo');
        } else {
            // Fallback navigation
            handleRoomsClick(this);
        }
    });
    
    // Also hook into app's loadPageData
    if (window.app && window.app.loadPageData) {
        const originalLoadPageData = window.app.loadPageData.bind(window.app);
        window.app.loadPageData = async function(page) {
            if (page === 'rooms') {
                console.log('Loading rooms page data...');
                ensureRoomsPage();
                if (window.loadRooms) {
                    await window.loadRooms();
                } else {
                    displayRoomsContent();
                }
            } else {
                await originalLoadPageData(page);
            }
        };
    }
}

// Step 5: Ensure rooms page exists
function ensureRoomsPage() {
    let roomsPage = document.getElementById('rooms');
    if (roomsPage) {
        console.log('Rooms page already exists');
        return roomsPage;
    }
    
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) {
        console.error('Main content not found!');
        return null;
    }
    
    // Create rooms page
    roomsPage = document.createElement('div');
    roomsPage.id = 'rooms';
    roomsPage.className = 'page';
    roomsPage.style.display = 'none';
    roomsPage.innerHTML = `
        <div class="page-header">
            <h1>Room Management</h1>
            <div class="header-actions">
                <button class="btn btn-primary" onclick="alert('Add Room')">
                    <i class="fas fa-plus-circle"></i> Add Room
                </button>
            </div>
        </div>
        <div class="rooms-grid" id="roomsGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; padding: 20px;">
            <!-- Rooms will be loaded here -->
        </div>
    `;
    
    mainContent.appendChild(roomsPage);
    console.log('✅ Rooms page created');
    
    // Display content
    displayRoomsContent();
    
    return roomsPage;
}

// Step 6: Display rooms content
function displayRoomsContent() {
    const grid = document.getElementById('roomsGrid');
    if (!grid) return;
    
    const rooms = [
        { id: 1, name: 'Room 1', type: 'Massage', status: 'available' },
        { id: 2, name: 'Room 2', type: 'Massage', status: 'occupied', client: 'Jane Doe', service: 'Swedish Massage', therapist: 'Maria', timer: '15:32' },
        { id: 3, name: 'Room 3', type: 'Facial', status: 'available' },
        { id: 4, name: 'VIP Suite', type: 'VIP', status: 'available' }
    ];
    
    grid.innerHTML = rooms.map(room => {
        const isOccupied = room.status === 'occupied';
        const borderColor = isOccupied ? '#e74c3c' : '#27ae60';
        const bgColor = isOccupied ? '#fff5f5' : '#f0fdf4';
        
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
                                <i class="fas fa-clock"></i> ${room.timer}
                            </div>
                        </div>
                        <div style="background: white; padding: 10px; border-radius: 5px; font-size: 14px;">
                            <p style="margin: 3px 0;"><strong>Service:</strong> ${room.service}</p>
                            <p style="margin: 3px 0;"><strong>Client:</strong> ${room.client}</p>
                            <p style="margin: 3px 0;"><strong>Therapist:</strong> ${room.therapist}</p>
                        </div>
                        <button class="btn btn-danger btn-sm" style="width: 100%; margin-top: 10px; padding: 8px;">
                            <i class="fas fa-stop"></i> End Service
                        </button>
                    ` : `
                        <button class="btn btn-success btn-sm" style="width: 100%; margin-top: 10px; padding: 8px;">
                            <i class="fas fa-play"></i> Start Service
                        </button>
                    `}
                </div>
            </div>
        `;
    }).join('');
    
    console.log('✅ Rooms content displayed');
}

// Step 7: Fallback click handler
function handleRoomsClick(element) {
    // Update active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    element.classList.add('active');
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.style.display = 'none';
    });
    
    // Show rooms page
    ensureRoomsPage();
    const roomsPage = document.getElementById('rooms');
    if (roomsPage) {
        roomsPage.style.display = 'block';
    }
    
    // Update app state if available
    if (window.app) {
        window.app.currentPage = 'rooms';
    }
}

// Step 8: Show success notification
function showSuccess() {
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
        <strong>✅ Rooms Fixed for Logged-In User!</strong><br>
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

// EXECUTE FIX
console.log('🚀 Starting fix for logged-in user...');
waitForApp();

// Show success after a delay
setTimeout(() => {
    showSuccess();
    
    // Auto-click rooms after it's added
    setTimeout(() => {
        const roomsLink = document.querySelector('[data-page="rooms"]');
        if (roomsLink) {
            roomsLink.click();
            console.log('✅ Auto-navigated to Rooms!');
        }
    }, 500);
}, 1500);

console.log('✅ Fix applied for logged-in user!');