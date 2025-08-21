// Rooms Feature Updater Script
// Run this to ensure all room features are properly installed

console.log('🚀 Starting Rooms Feature Update...');

// Force database upgrade
async function upgradeDatabase() {
    console.log('📦 Upgrading database...');
    
    // Close existing database connection
    if (window.db && window.db.db) {
        window.db.db.close();
    }
    
    // Delete old database to force recreation
    const deleteReq = indexedDB.deleteDatabase('AvaSolutionsDB');
    
    deleteReq.onsuccess = async () => {
        console.log('✅ Old database removed');
        
        // Reinitialize with new version
        window.db = new Database();
        window.db.version = 2; // Force version 2
        await window.db.init();
        console.log('✅ Database upgraded to version 2');
        
        // Create default rooms
        await createDefaultRooms();
    };
    
    deleteReq.onerror = () => {
        console.error('❌ Failed to delete old database');
    };
}

// Create default rooms
async function createDefaultRooms() {
    console.log('🏠 Creating default rooms...');
    
    const defaultRooms = [
        { name: 'Room 1', type: 'massage', capacity: 1, status: 'available' },
        { name: 'Room 2', type: 'massage', capacity: 1, status: 'available' },
        { name: 'Room 3', type: 'facial', capacity: 1, status: 'available' },
        { name: 'Room 4', type: 'couple', capacity: 2, status: 'available' },
        { name: 'VIP Suite', type: 'vip', capacity: 4, status: 'available' }
    ];
    
    try {
        for (const room of defaultRooms) {
            await window.db.add('rooms', room);
        }
        console.log('✅ Default rooms created');
    } catch (error) {
        console.log('⚠️ Rooms might already exist:', error);
    }
    
    // Create sample gift certificates
    await createSampleGiftCertificates();
}

// Create sample gift certificates
async function createSampleGiftCertificates() {
    console.log('🎁 Creating sample gift certificates...');
    
    const sampleGCs = [
        {
            controlNumber: 'GC-20240101-TEST1',
            amount: 500,
            recipient: 'Sample Customer',
            status: 'active',
            createdAt: new Date().toISOString(),
            createdBy: 'system',
            auditLog: [{
                action: 'created',
                date: new Date().toISOString(),
                by: 'system',
                details: 'Sample GC for testing'
            }]
        },
        {
            controlNumber: 'GC-20240101-TEST2',
            amount: 1000,
            status: 'active',
            createdAt: new Date().toISOString(),
            createdBy: 'system',
            auditLog: [{
                action: 'created',
                date: new Date().toISOString(),
                by: 'system',
                details: 'Sample GC for testing'
            }]
        }
    ];
    
    try {
        for (const gc of sampleGCs) {
            await window.db.add('giftCertificates', gc);
        }
        console.log('✅ Sample gift certificates created');
    } catch (error) {
        console.log('⚠️ Gift certificates might already exist:', error);
    }
    
    // Update navigation
    updateNavigation();
}

// Update navigation to show Rooms
function updateNavigation() {
    console.log('🔄 Updating navigation...');
    
    // Check if Rooms menu already exists
    const existingRoomsMenu = document.querySelector('[data-page="rooms"]');
    if (existingRoomsMenu) {
        console.log('✅ Rooms menu already exists');
        completeUpdate();
        return;
    }
    
    // Find the employees menu item
    const employeesMenu = document.querySelector('[data-page="employees"]');
    if (employeesMenu && employeesMenu.parentElement) {
        // Create rooms menu item
        const roomsMenuItem = document.createElement('a');
        roomsMenuItem.href = '#';
        roomsMenuItem.className = 'nav-item';
        roomsMenuItem.setAttribute('data-page', 'rooms');
        roomsMenuItem.innerHTML = `
            <i class="fas fa-door-open"></i>
            <span>Rooms</span>
        `;
        
        // Insert after employees
        employeesMenu.parentElement.insertBefore(roomsMenuItem, employeesMenu.nextSibling);
        
        // Add click handler
        roomsMenuItem.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.app) {
                window.app.navigateTo('rooms');
            }
        });
        
        console.log('✅ Rooms menu added to navigation');
    } else {
        console.error('❌ Could not find employees menu item');
    }
    
    // Create rooms page if it doesn't exist
    createRoomsPage();
}

// Create rooms page
function createRoomsPage() {
    console.log('📄 Creating rooms page...');
    
    // Check if page already exists
    if (document.getElementById('rooms')) {
        console.log('✅ Rooms page already exists');
        completeUpdate();
        return;
    }
    
    // Find main content area
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) {
        console.error('❌ Could not find main content area');
        return;
    }
    
    // Create rooms page div
    const roomsPage = document.createElement('div');
    roomsPage.id = 'rooms';
    roomsPage.className = 'page';
    roomsPage.style.display = 'none';
    roomsPage.innerHTML = `
        <div class="page-header">
            <h1>Room Management</h1>
            <div class="header-actions">
                <button class="btn btn-primary" id="addRoomBtn">
                    <i class="fas fa-plus-circle"></i> Add Room
                </button>
            </div>
        </div>
        <div class="rooms-grid" id="roomsGrid"></div>
    `;
    
    // Add to main content
    mainContent.appendChild(roomsPage);
    console.log('✅ Rooms page created');
    
    // Create room modal
    createRoomModal();
}

// Create room modal
function createRoomModal() {
    console.log('🔧 Creating room modal...');
    
    // Check if modal already exists
    if (document.getElementById('roomModal')) {
        console.log('✅ Room modal already exists');
        completeUpdate();
        return;
    }
    
    // Create modal HTML
    const modalHTML = `
    <div id="roomModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 id="roomModalTitle">Add Room</h2>
                <button class="modal-close" onclick="closeModal('roomModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="roomForm">
                    <input type="hidden" id="roomId">
                    <div class="form-group">
                        <label>Room Name</label>
                        <input type="text" id="roomName" class="form-input" required placeholder="e.g., Room 1, VIP Suite">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Room Type</label>
                            <select id="roomType" class="form-input" required>
                                <option value="general">General Purpose</option>
                                <option value="massage">Massage Room</option>
                                <option value="facial">Facial Room</option>
                                <option value="couple">Couple's Room</option>
                                <option value="vip">VIP Suite</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Capacity</label>
                            <input type="number" id="roomCapacity" class="form-input" min="1" max="10" value="1" required>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeModal('roomModal')">Cancel</button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> Save Room
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    `;
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    console.log('✅ Room modal created');
    
    completeUpdate();
}

// Complete the update
function completeUpdate() {
    console.log('🎉 Rooms feature update complete!');
    
    // Initialize room manager if it exists
    if (window.roomManager) {
        window.roomManager.init();
        console.log('✅ Room manager initialized');
    }
    
    // Show success message
    if (window.showNotification) {
        window.showNotification('Rooms feature has been successfully installed! Please navigate to Rooms in the menu.', 'success');
    } else {
        alert('✅ Rooms feature has been successfully installed!\n\nPlease navigate to Rooms in the menu.');
    }
    
    // Navigate to rooms page
    setTimeout(() => {
        if (window.app && window.app.navigateTo) {
            window.app.navigateTo('rooms');
        }
    }, 2000);
}

// Run the updater
(async function() {
    try {
        // Wait for page to be ready
        if (document.readyState !== 'complete') {
            window.addEventListener('load', () => {
                upgradeDatabase();
            });
        } else {
            await upgradeDatabase();
        }
    } catch (error) {
        console.error('❌ Update failed:', error);
        alert('Update failed! Please refresh the page and try again.');
    }
})();

console.log('📝 Updater script loaded. Database upgrade in progress...');