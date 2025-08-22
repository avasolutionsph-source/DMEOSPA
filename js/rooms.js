// Room Management System
class RoomManager {
    constructor() {
        this.rooms = [];
        this.activeServices = [];
        this.timers = {};
    }

    async init() {
        await this.loadRooms();
        await this.loadActiveServices();
        this.setupEventListeners();
        this.startTimerUpdates();
    }

    setupEventListeners() {
        // Add room button
        const addRoomBtn = document.getElementById('addRoomBtn');
        if (addRoomBtn) {
            addRoomBtn.addEventListener('click', () => this.showAddRoomModal());
        }

        // Room form
        const roomForm = document.getElementById('roomForm');
        if (roomForm) {
            roomForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveRoom();
            });
        }
    }

    async loadRooms() {
        try {
            // Load rooms from database
            let rooms = await db.getAll('rooms');
            
            // If no rooms exist, create default rooms
            if (!rooms || rooms.length === 0) {
                const defaultRooms = [
                    { name: 'Room 1', type: 'massage', capacity: 1, status: 'available' },
                    { name: 'Room 2', type: 'massage', capacity: 1, status: 'available' },
                    { name: 'Room 3', type: 'facial', capacity: 1, status: 'available' },
                    { name: 'Room 4', type: 'couple', capacity: 2, status: 'available' },
                    { name: 'VIP Suite', type: 'vip', capacity: 4, status: 'available' }
                ];
                
                for (const room of defaultRooms) {
                    await db.add('rooms', room);
                }
                
                rooms = await db.getAll('rooms');
            }
            
            this.rooms = rooms;
            this.displayRooms();
        } catch (error) {
            if (window.logger) {
                window.logger.error('Failed to load rooms', {
                    category: 'ROOMS',
                    operation: 'load_rooms',
                    error: error
                });
            } else {
                console.error('Failed to load rooms:', error);
            }
        }
    }

    async loadActiveServices() {
        try {
            // Load active services (those currently using rooms)
            const services = await db.getAll('activeServices');
            this.activeServices = services || [];
            
            // Update room statuses based on active services
            for (const service of this.activeServices) {
                const room = this.rooms.find(r => r.id === service.roomId);
                if (room) {
                    room.status = 'occupied';
                    room.currentService = service;
                }
            }
        } catch (error) {
            if (window.logger) {
                window.logger.error('Failed to load active services', {
                    category: 'ROOMS',
                    operation: 'load_active_services',
                    error: error
                });
            } else {
                console.error('Failed to load active services:', error);
            }
        }
    }

    displayRooms() {
        const container = document.getElementById('roomsGrid');
        if (!container) return;

        if (this.rooms.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-door-open" style="font-size: 3rem; color: #ddd;"></i>
                    <h3>No Rooms Configured</h3>
                    <p>Add your first room to get started</p>
                    <button class="btn btn-primary" onclick="roomManager.showAddRoomModal()">
                        <i class="fas fa-plus"></i> Add Room
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = this.rooms.map(room => {
            const isOccupied = room.status === 'occupied';
            const statusColor = isOccupied ? '#e74c3c' : '#27ae60';
            const statusIcon = isOccupied ? 'lock' : 'lock-open';
            const statusText = isOccupied ? 'OCCUPIED' : 'AVAILABLE';
            
            let timerDisplay = '';
            let serviceInfo = '';
            
            if (isOccupied && room.currentService) {
                const elapsed = this.calculateElapsedTime(room.currentService.startTime);
                timerDisplay = `
                    <div class="room-timer" style="font-size: 1.5rem; font-weight: bold; color: #e74c3c; margin: 10px 0;">
                        <i class="fas fa-clock"></i> ${elapsed}
                    </div>
                `;
                
                serviceInfo = `
                    <div class="service-info" style="background: #fff; padding: 10px; border-radius: 5px; margin-top: 10px;">
                        <div><strong>Service:</strong> ${room.currentService.serviceName}</div>
                        <div><strong>Client:</strong> ${room.currentService.clientName || 'Walk-in'}</div>
                        <div><strong>Therapist:</strong> ${room.currentService.employeeName}</div>
                        <div><strong>Started:</strong> ${new Date(room.currentService.startTime).toLocaleTimeString()}</div>
                        ${room.currentService.estimatedDuration ? 
                            `<div><strong>Duration:</strong> ${room.currentService.estimatedDuration} mins</div>` : ''}
                    </div>
                `;
            }

            return `
                <div class="room-card ${isOccupied ? 'occupied' : 'available'}" 
                     style="border: 2px solid ${statusColor}; background: ${isOccupied ? '#fff5f5' : '#f0fdf4'};">
                    <div class="room-header" style="background: ${statusColor}; color: white; padding: 10px; margin: -1px -1px 0 -1px;">
                        <h3 style="margin: 0; display: flex; justify-content: space-between; align-items: center;">
                            <span><i class="fas fa-door-${isOccupied ? 'closed' : 'open'}"></i> ${room.name}</span>
                            <span style="font-size: 0.8rem;">
                                <i class="fas fa-${statusIcon}"></i> ${statusText}
                            </span>
                        </h3>
                    </div>
                    <div class="room-body" style="padding: 15px;">
                        <div class="room-type" style="color: #666; margin-bottom: 10px;">
                            <i class="fas fa-tag"></i> ${this.getRoomTypeLabel(room.type)}
                            <span style="float: right;">
                                <i class="fas fa-users"></i> Capacity: ${room.capacity}
                            </span>
                        </div>
                        
                        ${timerDisplay}
                        ${serviceInfo}
                        
                        <div class="room-actions" style="margin-top: 15px;">
                            ${isOccupied ? `
                                <button class="btn btn-danger btn-sm" onclick="roomManager.endService(${room.id})">
                                    <i class="fas fa-stop"></i> End Service
                                </button>
                                <button class="btn btn-warning btn-sm" onclick="roomManager.extendService(${room.id})">
                                    <i class="fas fa-plus-circle"></i> Extend
                                </button>
                            ` : `
                                <button class="btn btn-success btn-sm" onclick="roomManager.startService(${room.id})">
                                    <i class="fas fa-play"></i> Start Service
                                </button>
                                <button class="btn btn-secondary btn-sm" onclick="roomManager.editRoom(${room.id})">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                            `}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    getRoomTypeLabel(type) {
        const types = {
            'massage': 'Massage Room',
            'facial': 'Facial Room',
            'couple': 'Couple\'s Room',
            'vip': 'VIP Suite',
            'general': 'General Purpose'
        };
        return types[type] || type;
    }

    calculateElapsedTime(startTime) {
        const start = new Date(startTime);
        const now = new Date();
        const diff = Math.floor((now - start) / 1000); // in seconds
        
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    startTimerUpdates() {
        // Update timers every second
        setInterval(() => {
            const occupiedRooms = this.rooms.filter(r => r.status === 'occupied');
            if (occupiedRooms.length > 0) {
                this.displayRooms(); // Refresh display to update timers
            }
        }, 1000);
    }

    async startService(roomId) {
        const room = this.rooms.find(r => r.id === roomId);
        if (!room) return;

        // Get service details via modal
        const serviceName = prompt('Enter service name:');
        if (!serviceName) return;

        const clientName = prompt('Enter client name (optional):');
        const duration = prompt('Estimated duration in minutes (optional):');

        // Get employee
        const employees = await db.getAll('employees');
        const employeeOptions = employees.map(e => `${e.id}: ${e.name}`).join('\n');
        const employeeId = prompt(`Select employee ID:\n${employeeOptions}`);
        const employee = employees.find(e => e.id === parseInt(employeeId));
        
        if (!employee) {
            showNotification('Please select a valid employee', 'error');
            return;
        }

        // Create active service record
        const activeService = {
            roomId: roomId,
            roomName: room.name,
            serviceName: serviceName,
            clientName: clientName || 'Walk-in',
            employeeId: employee.id,
            employeeName: employee.name,
            startTime: new Date().toISOString(),
            estimatedDuration: duration ? parseInt(duration) : null,
            status: 'active'
        };

        // Save to database
        const serviceId = await db.add('activeServices', activeService);
        activeService.id = serviceId;

        // Update room status
        room.status = 'occupied';
        room.currentService = activeService;
        await db.update('rooms', room);

        this.displayRooms();
        showNotification(`Service started in ${room.name}`, 'success');
    }

    async endService(roomId) {
        const room = this.rooms.find(r => r.id === roomId);
        if (!room || !room.currentService) return;

        if (!confirm('End this service session?')) return;

        // Calculate duration
        const startTime = new Date(room.currentService.startTime);
        const endTime = new Date();
        const durationMinutes = Math.floor((endTime - startTime) / 60000);

        // Update service record
        room.currentService.endTime = endTime.toISOString();
        room.currentService.actualDuration = durationMinutes;
        room.currentService.status = 'completed';
        
        // Save to history
        await db.update('activeServices', room.currentService);

        // Clear room
        room.status = 'available';
        room.currentService = null;
        await db.update('rooms', room);

        this.displayRooms();
        showNotification(`Service ended. Duration: ${durationMinutes} minutes`, 'info');
    }

    async extendService(roomId) {
        const room = this.rooms.find(r => r.id === roomId);
        if (!room || !room.currentService) return;

        const extraMinutes = prompt('Extend by how many minutes?');
        if (!extraMinutes) return;

        const minutes = parseInt(extraMinutes);
        if (isNaN(minutes) || minutes <= 0) {
            showNotification('Please enter a valid number of minutes', 'error');
            return;
        }

        // Update estimated duration
        room.currentService.estimatedDuration = (room.currentService.estimatedDuration || 60) + minutes;
        room.currentService.extensions = (room.currentService.extensions || 0) + 1;
        room.currentService.lastExtended = new Date().toISOString();
        
        await db.update('activeServices', room.currentService);
        
        this.displayRooms();
        showNotification(`Service extended by ${minutes} minutes`, 'success');
    }

    showAddRoomModal() {
        document.getElementById('roomModalTitle').textContent = 'Add New Room';
        document.getElementById('roomId').value = '';
        document.getElementById('roomName').value = '';
        document.getElementById('roomType').value = 'general';
        document.getElementById('roomCapacity').value = '1';
        
        openModal('roomModal');
    }

    async editRoom(roomId) {
        const room = this.rooms.find(r => r.id === roomId);
        if (!room) return;

        document.getElementById('roomModalTitle').textContent = 'Edit Room';
        document.getElementById('roomId').value = room.id;
        document.getElementById('roomName').value = room.name;
        document.getElementById('roomType').value = room.type;
        document.getElementById('roomCapacity').value = room.capacity;
        
        openModal('roomModal');
    }

    async saveRoom() {
        const roomId = document.getElementById('roomId').value;
        const roomData = {
            name: document.getElementById('roomName').value.trim(),
            type: document.getElementById('roomType').value,
            capacity: parseInt(document.getElementById('roomCapacity').value),
            status: 'available'
        };

        if (!roomData.name) {
            showNotification('Please enter a room name', 'error');
            return;
        }

        try {
            if (roomId) {
                // Update existing room
                roomData.id = parseInt(roomId);
                await db.update('rooms', roomData);
                showNotification('Room updated successfully', 'success');
            } else {
                // Add new room
                await db.add('rooms', roomData);
                showNotification('Room added successfully', 'success');
            }

            closeModal('roomModal');
            await this.loadRooms();
        } catch (error) {
            if (window.logger) {
                window.logger.error('Failed to save room', {
                    category: 'ROOMS',
                    operation: 'save_room',
                    error: error
                });
            } else {
                console.error('Failed to save room:', error);
            }
            showNotification('Failed to save room', 'error');
        }
    }

    async deleteRoom(roomId) {
        if (!confirm('Are you sure you want to delete this room?')) return;

        try {
            await db.delete('rooms', roomId);
            showNotification('Room deleted successfully', 'success');
            await this.loadRooms();
        } catch (error) {
            if (window.logger) {
                window.logger.error('Failed to delete room', {
                    category: 'ROOMS',
                    operation: 'delete_room',
                    error: error
                });
            } else {
                console.error('Failed to delete room:', error);
            }
            showNotification('Failed to delete room', 'error');
        }
    }

    // Get available rooms for checkout
    getAvailableRooms() {
        return this.rooms.filter(r => r.status === 'available');
    }

    // Assign room to service (called from POS)
    async assignRoomToService(roomId, serviceDetails) {
        const room = this.rooms.find(r => r.id === roomId);
        if (!room || room.status === 'occupied') {
            return false;
        }

        const activeService = {
            roomId: roomId,
            roomName: room.name,
            ...serviceDetails,
            startTime: new Date().toISOString(),
            status: 'active'
        };

        const serviceId = await db.add('activeServices', activeService);
        activeService.id = serviceId;

        room.status = 'occupied';
        room.currentService = activeService;
        await db.update('rooms', room);

        return true;
    }
}

// Initialize Room Manager
const roomManager = new RoomManager();

// Load rooms when page is shown
window.loadRooms = async function() {
    await roomManager.init();
};