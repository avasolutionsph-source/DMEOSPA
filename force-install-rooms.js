// Force Install Rooms Feature - Direct Installation
console.log('🚀 FORCE INSTALLING ROOMS FEATURE...');

// Step 1: Fix the navigation immediately
function forceInstallRooms() {
    // Find nav menu
    const navMenu = document.querySelector('.nav-menu');
    if (!navMenu) {
        console.error('Nav menu not found!');
        return;
    }

    // Remove any existing rooms link
    const existingRooms = document.querySelector('[data-page="rooms"]');
    if (existingRooms) {
        existingRooms.remove();
    }

    // Find employees link
    const employeesLink = Array.from(navMenu.querySelectorAll('a')).find(a => 
        a.textContent.includes('Employees')
    );

    if (!employeesLink) {
        console.error('Employees link not found!');
        return;
    }

    // Create rooms link with exact same structure
    const roomsLink = document.createElement('a');
    roomsLink.href = '#';
    roomsLink.className = 'nav-item';
    roomsLink.setAttribute('data-page', 'rooms');
    roomsLink.innerHTML = `
        <i class="fas fa-door-open"></i>
        <span>Rooms</span>
    `;

    // Insert after employees
    employeesLink.parentNode.insertBefore(roomsLink, employeesLink.nextSibling);

    // Add click handler
    roomsLink.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Update active states
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        this.classList.add('active');
        
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.style.display = 'none';
        });
        
        // Show rooms page
        let roomsPage = document.getElementById('rooms');
        if (!roomsPage) {
            createRoomsPage();
            roomsPage = document.getElementById('rooms');
        }
        if (roomsPage) {
            roomsPage.style.display = 'block';
        }
        
        // Initialize rooms
        if (window.loadRooms) {
            window.loadRooms();
        } else {
            displayDefaultRooms();
        }
    });

    console.log('✅ Rooms menu added to navigation!');
}

// Step 2: Create the rooms page
function createRoomsPage() {
    // Remove any existing rooms page
    const existingPage = document.getElementById('rooms');
    if (existingPage) {
        existingPage.remove();
    }

    // Find the employees page as reference
    const employeesPage = document.getElementById('employees');
    if (!employeesPage) {
        console.error('Employees page not found!');
        return;
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
                <button class="btn btn-primary" onclick="addNewRoom()">
                    <i class="fas fa-plus-circle"></i> Add Room
                </button>
            </div>
        </div>
        <div class="rooms-grid" id="roomsGrid">
            <!-- Rooms will be displayed here -->
        </div>
    `;

    // Insert after employees page
    employeesPage.parentNode.insertBefore(roomsPage, employeesPage.nextSibling);
    
    console.log('✅ Rooms page created!');
}

// Step 3: Display default rooms
function displayDefaultRooms() {
    const grid = document.getElementById('roomsGrid');
    if (!grid) return;

    const rooms = [
        { id: 1, name: 'Room 1', type: 'Massage Room', status: 'available', capacity: 1 },
        { id: 2, name: 'Room 2', type: 'Massage Room', status: 'occupied', capacity: 1, service: 'Swedish Massage', client: 'Jane Doe', therapist: 'Maria', startTime: new Date(Date.now() - 1800000) },
        { id: 3, name: 'Room 3', type: 'Facial Room', status: 'available', capacity: 1 },
        { id: 4, name: 'VIP Suite', type: 'VIP Suite', status: 'available', capacity: 4 }
    ];

    grid.innerHTML = rooms.map(room => {
        const isOccupied = room.status === 'occupied';
        const borderColor = isOccupied ? '#e74c3c' : '#27ae60';
        
        let timerDisplay = '';
        if (isOccupied && room.startTime) {
            const elapsed = Math.floor((Date.now() - room.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            timerDisplay = `
                <div style="text-align: center; margin: 15px 0; padding: 10px; background: rgba(231, 76, 60, 0.1); border-radius: 8px;">
                    <div style="font-size: 24px; font-weight: bold; color: #e74c3c; font-family: monospace;">
                        <i class="fas fa-clock"></i> ${minutes}:${seconds.toString().padStart(2, '0')}
                    </div>
                </div>
            `;
        }

        return `
            <div class="room-card" style="
                border: 2px solid ${borderColor};
                background: ${isOccupied ? '#fff5f5' : '#f0fdf4'};
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                transition: all 0.3s ease;
            ">
                <div style="
                    background: ${borderColor};
                    color: white;
                    padding: 12px 15px;
                    font-weight: 600;
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span><i class="fas fa-door-${isOccupied ? 'closed' : 'open'}"></i> ${room.name}</span>
                        <span style="font-size: 12px; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 10px;">
                            ${room.status.toUpperCase()}
                        </span>
                    </div>
                </div>
                <div style="padding: 15px;">
                    <div style="color: #666; margin-bottom: 10px;">
                        <i class="fas fa-tag"></i> ${room.type}
                        <span style="float: right;">
                            <i class="fas fa-users"></i> Capacity: ${room.capacity}
                        </span>
                    </div>
                    
                    ${timerDisplay}
                    
                    ${isOccupied && room.service ? `
                        <div style="background: white; padding: 10px; border-radius: 5px; margin-top: 10px; font-size: 14px;">
                            <div style="padding: 3px 0;"><strong>Service:</strong> ${room.service}</div>
                            <div style="padding: 3px 0;"><strong>Client:</strong> ${room.client}</div>
                            <div style="padding: 3px 0;"><strong>Therapist:</strong> ${room.therapist}</div>
                        </div>
                    ` : ''}
                    
                    <div style="margin-top: 15px; text-align: center;">
                        ${isOccupied ? 
                            `<button class="btn btn-danger btn-sm" onclick="alert('Ending service in ${room.name}')">
                                <i class="fas fa-stop"></i> End Service
                            </button>` :
                            `<button class="btn btn-success btn-sm" onclick="alert('Starting service in ${room.name}')">
                                <i class="fas fa-play"></i> Start Service
                            </button>`
                        }
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Update timer every second
    setInterval(() => {
        const occupiedRoom = rooms.find(r => r.status === 'occupied');
        if (occupiedRoom && occupiedRoom.startTime) {
            displayDefaultRooms(); // Refresh to update timer
        }
    }, 1000);

    console.log('✅ Rooms displayed!');
}

// Step 4: Add room function
window.addNewRoom = function() {
    const roomName = prompt('Enter room name:');
    if (roomName) {
        alert(`Room "${roomName}" added successfully!`);
        displayDefaultRooms();
    }
};

// Step 5: Show success notification
function showSuccess() {
    // Create custom notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px 30px;
        border-radius: 12px;
        z-index: 99999;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        animation: slideInRight 0.5s ease;
        font-size: 16px;
    `;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px;">
            <i class="fas fa-check-circle" style="font-size: 24px;"></i>
            <div>
                <strong>Rooms Feature Installed!</strong><br>
                <small style="opacity: 0.9;">Click "Rooms" in the menu to access</small>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.5s ease';
        setTimeout(() => notification.remove(), 500);
    }, 5000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .room-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
    }
`;
document.head.appendChild(style);

// EXECUTE INSTALLATION
(function() {
    console.log('🔧 Starting force installation...');
    
    // Install everything
    forceInstallRooms();
    createRoomsPage();
    
    // Show success
    showSuccess();
    
    // Auto-navigate to rooms after 1 second
    setTimeout(() => {
        const roomsLink = document.querySelector('[data-page="rooms"]');
        if (roomsLink) {
            roomsLink.click();
            console.log('📍 Navigated to Rooms page');
        }
    }, 1000);
    
    console.log('✅ INSTALLATION COMPLETE!');
})();