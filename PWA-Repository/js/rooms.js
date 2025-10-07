// Room Management System
class RoomManager {
    constructor() {
        this.rooms = [];
        this.activeServices = [];
        this.timers = {};
        this.showHiddenRooms = false;
        this.listenersSetup = false; // Track if event listeners are already setup
        this.timerInterval = null; // Track timer interval to prevent duplicates
        this.isTherapistView = false; // Flag to prevent manager view from showing for therapists
    }

    async init() {
        // Get user data from window.app or localStorage
        let userData = window.app?.userData;

        if (!userData) {
            // Try to get from localStorage
            const currentUserStr = localStorage.getItem('currentUser');
            if (currentUserStr) {
                try {
                    userData = JSON.parse(currentUserStr);
                } catch (error) {
                    console.error('Failed to parse currentUser from localStorage:', error);
                }
            }
        }

        // Also check authSystem as fallback
        if (!userData && window.authSystem) {
            userData = window.authSystem.getCurrentUser();
        }

        const userRole = userData?.role;
        const userType = userData?.type;

        console.log('🏠 [ROOMS] Role detection:', {
            userRole,
            userType,
            userData,
            hasAppUserData: !!window.app?.userData,
            hasLocalStorage: !!localStorage.getItem('currentUser'),
            hasAuthSystem: !!window.authSystem?.getCurrentUser()
        });

        const isTherapist = userRole && (
            userRole === 'senior_therapist' ||
            userRole === 'junior_therapist' ||
            userRole === 'new_therapist' ||
            userRole === 'therapist'
        );

        console.log('🏠 [ROOMS] Is therapist?', isTherapist);

        if (isTherapist) {
            console.log('🏠 [ROOMS] Showing therapist view');
            this.isTherapistView = true; // Set flag to block manager view

            // Show therapist view - don't call manager view at all
            try {
                await this.showTherapistView();
            } catch (error) {
                console.error('❌ [ROOMS] Therapist view failed:', error);
                // Show error but don't fall back to manager view
                const container = document.getElementById('roomsGrid');
                if (container) {
                    container.innerHTML = `
                        <div class="empty-state" style="text-align: center; padding: 60px 20px;">
                            <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: #f44336; margin-bottom: 20px;"></i>
                            <h2 style="color: #666; margin-bottom: 10px;">Error Loading Rooms</h2>
                            <p style="color: #999; font-size: 1.1rem;">
                                Unable to load your assigned rooms.<br>
                                Error: ${error.message}<br>
                                Please refresh the page or contact your manager.
                            </p>
                        </div>
                    `;
                }
            }
            return; // IMPORTANT: Exit early, don't continue to manager view
        } else {
            console.log('🏠 [ROOMS] Showing manager/owner view');
            this.isTherapistView = false;

            // Show manager/owner view
            await this.loadRooms();
            await this.loadActiveServices();
            // Only setup event listeners once
            if (!this.listenersSetup) {
                this.setupEventListeners();
                this.startTimerUpdates();
                this.listenersSetup = true;
            }
        }
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
            let rooms = await window.db.getAll('rooms');
            
            // If no rooms exist, create default rooms
            if (!rooms || rooms.length === 0) {
                const defaultRooms = [
                    { name: 'Room 1', type: 'massage', capacity: 1, status: 'available', hidden: false },
                    { name: 'Room 2', type: 'massage', capacity: 1, status: 'available', hidden: false },
                    { name: 'Room 3', type: 'facial', capacity: 1, status: 'available', hidden: false },
                    { name: 'Room 4', type: 'couple', capacity: 2, status: 'available', hidden: false },
                    { name: 'VIP Suite', type: 'vip', capacity: 4, status: 'available', hidden: false }
                ];
                
                for (const room of defaultRooms) {
                    await window.db.add('rooms', room);
                }
                
                rooms = await window.db.getAll('rooms');
            }
            
            this.rooms = rooms.map(room => ({
                ...room,
                hidden: room.hidden || false
            }));
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
            // Load only active services (not completed ones)
            const allServices = await window.db.getAll('activeServices');
            this.activeServices = (allServices || []).filter(service => service.status === 'active');
            
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

    // Method to get active services for POS employee status checking
    getActiveServices() {
        return this.activeServices || [];
    }

    async displayRooms(forceRefresh = false) {
        // CRITICAL: Do not run displayRooms for therapists
        if (this.isTherapistView) {
            console.log('🚫 [ROOMS] displayRooms blocked - therapist view is active');
            return;
        }

        const container = document.getElementById('roomsGrid');
        if (!container) return;

        const visibleRooms = this.showHiddenRooms ?
            this.rooms :
            this.rooms.filter(room => !room.hidden);

        if (visibleRooms.length === 0 && this.rooms.length === 0) {
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

        if (visibleRooms.length === 0 && this.rooms.length > 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-eye-slash" style="font-size: 3rem; color: #ddd;"></i>
                    <h3>All Rooms Are Hidden</h3>
                    <p>Toggle "Show Hidden Rooms" to see them</p>
                </div>
            `;
            return;
        }

        // Get all room assignments from MongoDB
        console.log('🔄 [ROOMS] Fetching room assignments, forceRefresh:', forceRefresh);
        const assignmentsResult = await window.HybridAPIClient.get('/api/room-assignments', 'roomAssignments', {
            offlineFirst: !forceRefresh,
            critical: true
        });

        const allAssignments = assignmentsResult.success ? (assignmentsResult.data || []) : [];
        console.log('👥 [ROOMS] Room assignments loaded:', {
            totalAssignments: allAssignments.length,
            roomsWithAssignments: new Set(allAssignments.map(a => a.roomName)).size
        });

        container.innerHTML = visibleRooms.map(room => {
            const isOccupied = room.status === 'occupied';
            const statusColor = isOccupied ? '#800020' : '#27ae60';
            const statusIcon = isOccupied ? 'clock' : 'lock-open';
            const statusText = isOccupied ? 'IN SERVICE' : 'AVAILABLE';

            // Get therapists assigned to this room from MongoDB assignments
            const roomAssignments = allAssignments.filter(a => a.roomName === room.name);
            const assignedTherapists = roomAssignments.map(a => ({
                id: a.employeeId,
                name: a.employeeName,
                position: a.employeePosition,
                firstName: a.employeeName.split(' ')[0],
                lastName: a.employeeName.split(' ').slice(1).join(' ')
            }));

            console.log(`🏨 [ROOMS] Room "${room.name}" assigned therapists:`, {
                roomName: room.name,
                assignedCount: assignedTherapists.length,
                therapists: assignedTherapists.map(t => ({
                    name: t.firstName ? `${t.firstName} ${t.lastName}` : t.name,
                    assignedRooms: t.assignedRooms
                }))
            });

            let assignedTherapistsDisplay = '';
            if (assignedTherapists.length > 0) {
                assignedTherapistsDisplay = `
                    <div class="assigned-therapists" style="background: #f0f8ff; padding: 8px; border-radius: 5px; margin-bottom: 10px; border-left: 3px solid #2196F3;">
                        <div style="font-weight: 600; color: #1976D2; margin-bottom: 5px;">
                            <i class="fas fa-user-check"></i> Assigned Therapists:
                        </div>
                        ${assignedTherapists.map(t => {
                            const name = t.firstName ? `${t.firstName} ${t.lastName}`.trim() : t.name;
                            return `<div style="font-size: 0.9rem; color: #555; padding: 2px 0;">
                                <i class="fas fa-circle" style="font-size: 0.5rem; color: #4CAF50;"></i> ${name}
                            </div>`;
                        }).join('')}
                    </div>
                `;
            }

            let timerDisplay = '';
            let serviceInfo = '';

            if (isOccupied && room.currentService) {
                const elapsed = this.calculateElapsedTime(room.currentService.startTime);
                timerDisplay = `
                    <div class="room-timer" style="font-size: 1.5rem; font-weight: bold; color: #800020; margin: 10px 0;">
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

            // Build therapist names for header
            let therapistNamesHeader = '';
            if (assignedTherapists.length > 0) {
                const names = assignedTherapists.map(t => {
                    const name = t.firstName ? `${t.firstName} ${t.lastName}`.trim() : t.name;
                    return name;
                }).join(', ');
                therapistNamesHeader = ` <span style="color: #2196F3; font-size: 0.75rem;">(${names})</span>`;
            }

            return `
                <div class="room-card ${isOccupied ? 'occupied' : 'available'} ${room.hidden ? 'hidden-room' : ''}" style="${room.hidden ? 'opacity: 0.6; border-style: dashed;' : ''}">
                    <div class="room-header ${isOccupied ? 'occupied' : 'available'}" style="padding: 10px; margin: -1px -1px 0 -1px;">
                        <h3 style="margin: 0; display: flex; justify-content: space-between; align-items: center;">
                            <span>
                                <i class="fas fa-door-${isOccupied ? 'closed' : 'open'}"></i> ${room.name}${therapistNamesHeader}
                                ${room.hidden ? '<span style="color: #ff9800; font-size: 0.7rem; margin-left: 5px;">(Hidden)</span>' : ''}
                            </span>
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

                        ${assignedTherapistsDisplay}
                        ${timerDisplay}
                        ${serviceInfo}

                        <div class="room-actions" style="margin-top: 15px;">
                            ${isOccupied ? `
                                <button class="btn btn-danger btn-sm" onclick="roomManager.endService(${room.id})">
                                    <i class="fas fa-stop"></i> End
                                </button>
                                <button class="btn btn-warning btn-sm" onclick="roomManager.extendService(${room.id})">
                                    <i class="fas fa-plus-circle"></i> Extend
                                </button>
                            ` : `
                                <button class="btn btn-success btn-sm" onclick="roomManager.startService(${room.id})">
                                    <i class="fas fa-play"></i> Start
                                </button>
                                <button class="btn btn-secondary btn-sm" onclick="roomManager.editRoom(${room.id})">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                                <button class="btn btn-warning btn-sm" onclick="roomManager.toggleRoomVisibility(${room.id})" title="${room.hidden ? 'Show Room' : 'Hide Room'}">
                                    <i class="fas fa-eye${room.hidden ? '' : '-slash'}"></i> ${room.hidden ? 'Show' : 'Hide'}
                                </button>
                                <button class="btn btn-danger btn-sm" onclick="roomManager.confirmDeleteRoom(${room.id})" title="Delete Room">
                                    <i class="fas fa-trash"></i> Delete
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
        // Prevent duplicate timers
        if (this.timerInterval) {
            return;
        }

        // Update timers every second
        this.timerInterval = setInterval(() => {
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
        const employees = await window.db.getAll('employees');
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
        const serviceId = await window.db.add('activeServices', activeService);
        activeService.id = serviceId;

        // Update room status
        room.status = 'occupied';
        room.currentService = activeService;
        await window.db.update('rooms', room);

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
        
        // Save to history/database
        await window.db.update('activeServices', room.currentService);
        
        // Remove from active services array
        this.activeServices = this.activeServices.filter(service => service.id !== room.currentService.id);

        // Clear room
        room.status = 'available';
        room.currentService = null;
        await window.db.update('rooms', room);

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
        
        await window.db.update('activeServices', room.currentService);
        
        this.displayRooms();
        showNotification(`Service extended by ${minutes} minutes`, 'success');
    }

    showAddRoomModal() {
        document.getElementById('roomModalTitle').textContent = 'Add New Room';
        document.getElementById('roomId').value = '';
        document.getElementById('roomName').value = '';
        document.getElementById('roomType').value = 'general';
        document.getElementById('roomCapacity').value = '1';
        document.getElementById('roomHidden').checked = false;
        
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
        document.getElementById('roomHidden').checked = room.hidden || false;
        
        openModal('roomModal');
    }

    async saveRoom() {
        const roomId = document.getElementById('roomId').value;
        const roomData = {
            name: document.getElementById('roomName').value.trim(),
            type: document.getElementById('roomType').value,
            capacity: parseInt(document.getElementById('roomCapacity').value),
            status: 'available',
            hidden: document.getElementById('roomHidden').checked
        };

        if (!roomData.name) {
            showNotification('Please enter a room name', 'error');
            return;
        }

        try {
            if (roomId) {
                // Update existing room (preserve current status)
                const existingRoom = this.rooms.find(r => r.id === parseInt(roomId));
                roomData.id = parseInt(roomId);
                roomData.status = existingRoom ? existingRoom.status : 'available';
                await window.db.update('rooms', roomData);
                showNotification('Room updated successfully', 'success');

                // Reset form to prevent confusion if modal reopens
                document.getElementById('roomForm').reset();
                document.getElementById('roomName').value = '';
                document.getElementById('roomId').value = '';
            } else {
                // Check for duplicate room name before adding
                const existingRoomWithName = this.rooms.find(r => r.name === roomData.name);
                if (existingRoomWithName) {
                    showNotification(`A room with the name "${roomData.name}" already exists. Please use a different name.`, 'error');
                    return;
                }

                // Add new room
                await window.db.add('rooms', roomData);
                showNotification('Room added successfully', 'success');
            }

            // Reset form to prevent confusion if modal reopens
            document.getElementById('roomForm').reset();
            document.getElementById('roomName').value = '';
            document.getElementById('roomId').value = '';

            closeModal('roomModal');
            await this.loadRooms();
        } catch (error) {
            // Log full error details for debugging
            console.error('Failed to save room - Full error:', error);
            console.error('Error name:', error?.name);
            console.error('Error message:', error?.message || error);

            if (window.logger) {
                window.logger.error('Failed to save room', {
                    category: 'ROOMS',
                    operation: 'save_room',
                    error: error,
                    errorName: error?.name,
                    errorMessage: error?.message || error
                });
            }

            // Check if it's a constraint error (duplicate name)
            const errorString = (error?.message || error?.toString() || error || '').toLowerCase();
            if (errorString.includes('constraint') || errorString.includes('unique') || error?.name === 'ConstraintError') {
                showNotification(`A room with the name "${roomData.name}" already exists. Please use a different name.`, 'error');
            } else {
                showNotification('Failed to save room: ' + (error?.message || error), 'error');
            }
        }
    }

    async toggleRoomVisibility(roomId) {
        const room = this.rooms.find(r => r.id === roomId);
        if (!room) return;

        const action = room.hidden ? 'show' : 'hide';
        if (!confirm(`Are you sure you want to ${action} "${room.name}"?`)) return;

        try {
            room.hidden = !room.hidden;
            await window.db.update('rooms', room);
            
            showNotification(`Room "${room.name}" ${room.hidden ? 'hidden' : 'shown'} successfully`, 'success');
            this.displayRooms();
        } catch (error) {
            if (window.logger) {
                window.logger.error('Failed to toggle room visibility', {
                    category: 'ROOMS',
                    operation: 'toggle_visibility',
                    error: error
                });
            } else {
                console.error('Failed to toggle room visibility:', error);
            }
            showNotification('Failed to update room visibility', 'error');
        }
    }

    async confirmDeleteRoom(roomId) {
        const room = this.rooms.find(r => r.id === roomId);
        if (!room) return;

        if (room.status === 'occupied') {
            showNotification('Cannot delete an occupied room. Please end the service first.', 'error');
            return;
        }

        if (!confirm(`Are you sure you want to PERMANENTLY delete "${room.name}"? This action cannot be undone.`)) return;

        await this.deleteRoom(roomId);
    }

    async deleteRoom(roomId) {
        try {
            await window.db.delete('rooms', roomId);
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

    toggleShowHidden() {
        this.showHiddenRooms = !this.showHiddenRooms;
        this.displayRooms();

        const toggleBtn = document.getElementById('toggleHiddenRoomsBtn');
        if (toggleBtn) {
            toggleBtn.innerHTML = `
                <i class="fas fa-eye${this.showHiddenRooms ? '' : '-slash'}"></i>
                ${this.showHiddenRooms ? 'Hide' : 'Show'} Hidden Rooms
            `;
        }
    }

    // Force refresh display with fresh data
    async forceRefreshDisplay() {
        console.log('🔄 [ROOMS] Manual refresh triggered');
        showNotification('Refreshing room data...', 'info');
        await this.displayRooms(true);
        showNotification('Room data refreshed!', 'success');
    }

    // Get available rooms for checkout
    getAvailableRooms() {
        return this.rooms.filter(r => r.status === 'available' && !r.hidden);
    }

    // Assign room to service (called from POS)
    async assignRoomToService(roomId, serviceDetails) {
        console.log('🏨 [ROOM] assignRoomToService called with:', {
            roomId: roomId,
            serviceDetails: serviceDetails,
            employeeId: serviceDetails.employeeId,
            employeeName: serviceDetails.employeeName
        });
        
        const room = this.rooms.find(r => r.id === roomId);
        if (!room || room.status === 'occupied') {
            console.log('🏨 [ROOM] Room not available:', {
                roomFound: !!room,
                roomStatus: room?.status
            });
            return false;
        }

        const activeService = {
            roomId: roomId,
            roomName: room.name,
            ...serviceDetails,
            startTime: new Date().toISOString(),
            status: 'active'
        };
        
        console.log('🏨 [ROOM] Creating active service:', {
            activeService: activeService,
            employeeId: activeService.employeeId,
            employeeName: activeService.employeeName
        });

        const serviceId = await window.db.add('activeServices', activeService);
        activeService.id = serviceId;
        
        // Add to active services array
        this.activeServices.push(activeService);

        // Update room status to occupied and set current service
        room.status = 'occupied';
        room.currentService = activeService;
        await window.db.update('rooms', room);
        
        // Refresh the room display to show the service has started
        if (window.app?.currentPage === 'rooms') {
            this.displayRooms();
        }

        return true;
    }

    // Show assign room modal (new workflow)
    async showAssignRoomModal() {
        // Load available rooms (not hidden)
        const availableRooms = this.rooms.filter(r => !r.hidden);

        // Populate room dropdown
        const roomSelect = document.getElementById('assignRoomSelect');
        roomSelect.innerHTML = '<option value="">-- Select Room --</option>' +
            availableRooms.map(room =>
                `<option value="${room.id}">${room.name} - ${this.getRoomTypeLabel(room.type)}</option>`
            ).join('');

        // Hide therapist selection initially
        document.getElementById('therapistSelectionSection').style.display = 'none';
        document.getElementById('therapistCheckboxList').innerHTML = '';

        openModal('assignTherapistModal');
    }

    // When room is selected from dropdown
    async onRoomSelected() {
        const roomSelect = document.getElementById('assignRoomSelect');
        const selectedRoomId = parseInt(roomSelect.value);

        if (!selectedRoomId) {
            document.getElementById('therapistSelectionSection').style.display = 'none';
            return;
        }

        const room = this.rooms.find(r => r.id === selectedRoomId);
        if (!room) return;

        // Show therapist selection section
        document.getElementById('therapistSelectionSection').style.display = 'block';

        // Load therapists and current assignments from MongoDB
        const [employeesResult, assignmentsResult] = await Promise.all([
            window.HybridAPIClient.getEmployees(),
            window.HybridAPIClient.get(`/api/room-assignments/room/${encodeURIComponent(room.name)}`, 'roomAssignments')
        ]);

        let therapists = [];
        const currentAssignments = assignmentsResult.success ? (assignmentsResult.data || []) : [];
        const assignedEmployeeIds = new Set(currentAssignments.map(a => String(a.employeeId)));

        if (employeesResult.success) {
            const allEmployees = employeesResult.data || [];
            // Filter to only therapists
            const therapistPositions = [
                'Senior Therapist', 'Junior Therapist', 'Therapist',
                'Massage Therapist', 'New Therapist',
                'senior_therapist', 'junior_therapist', 'new_therapist'
            ];
            therapists = allEmployees.filter(emp =>
                therapistPositions.includes(emp.position)
            );
        }

        // Display therapist checkboxes
        const container = document.getElementById('therapistCheckboxList');
        if (therapists.length === 0) {
            container.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">No therapists found</p>';
        } else {
            container.innerHTML = therapists.map(therapist => {
                const empId = String(therapist.id || therapist._id);
                const empName = therapist.firstName ?
                    `${therapist.firstName} ${therapist.lastName}`.trim() :
                    therapist.name;

                // Check if this therapist is already assigned to this room (from MongoDB)
                const isAssigned = assignedEmployeeIds.has(empId);

                return `
                    <div style="padding: 10px; border-bottom: 1px solid #f0f0f0;">
                        <label style="display: flex; align-items: center; cursor: pointer;">
                            <input type="checkbox"
                                   class="therapist-checkbox"
                                   data-employee-id="${empId}"
                                   data-employee-name="${empName}"
                                   data-position="${therapist.position}"
                                   ${isAssigned ? 'checked' : ''}
                                   style="margin-right: 10px; width: 18px; height: 18px;">
                            <div>
                                <div style="font-weight: 500;">${empName}</div>
                                <div style="font-size: 0.85rem; color: #666;">${therapist.position}</div>
                            </div>
                        </label>
                    </div>
                `;
            }).join('');
        }
    }

    // Save therapist assignments to MongoDB
    async saveTherapistAssignments() {
        const roomSelect = document.getElementById('assignRoomSelect');
        const selectedRoomId = parseInt(roomSelect.value);

        if (!selectedRoomId) {
            showNotification('Please select a room first', 'error');
            return;
        }

        const room = this.rooms.find(r => r.id === selectedRoomId);
        if (!room) return;

        // Get all checked therapists
        const checkboxes = document.querySelectorAll('.therapist-checkbox');
        const selectedTherapists = Array.from(checkboxes)
            .filter(cb => cb.checked)
            .map(cb => ({
                id: cb.dataset.employeeId,
                name: cb.dataset.employeeName,
                position: cb.getAttribute('data-position') || 'Therapist'
            }));

        try {
            console.log(`💾 [ROOMS] Saving assignments to MongoDB for ${room.name}...`);

            // Save to MongoDB via new API
            const result = await window.HybridAPIClient.put(
                `/api/room-assignments/room/${encodeURIComponent(room.name)}`,
                {
                    roomId: room.id,
                    employees: selectedTherapists
                }
            );

            if (result.success) {
                console.log('✅ [ROOMS] Assignments saved to MongoDB successfully');
                showNotification(`Therapist assignments updated for ${room.name}`, 'success');
                closeModal('assignTherapistModal');

                // Force refresh room display with fresh data from MongoDB
                console.log('🔄 [ROOMS] Refreshing display from MongoDB...');
                await this.displayRooms(true);
            } else {
                throw new Error(result.error || 'Failed to save assignments');
            }
        } catch (error) {
            console.error('Failed to save therapist assignments:', error);
            showNotification('Failed to save assignments', 'error');
        }
    }

    // Therapist view - shows only their assigned rooms
    async showTherapistView() {
        const container = document.getElementById('roomsGrid');
        if (!container) return;

        // Hide management buttons for therapists
        const headerActions = document.querySelector('#rooms .header-actions');
        if (headerActions) {
            headerActions.style.display = 'none';
        }

        // Update page title
        const pageHeader = document.querySelector('#rooms .page-header h1');
        if (pageHeader) {
            pageHeader.textContent = 'My Assigned Rooms';
        }

        console.log('🔒 [ROOMS] Hiding management buttons for therapist view', {
            headerActionsFound: !!headerActions,
            headerActionsDisplay: headerActions?.style?.display
        });

        try {
            // Get current user data
            let userData = window.app?.userData;
            if (!userData) {
                const currentUserStr = localStorage.getItem('currentUser');
                if (currentUserStr) {
                    try {
                        userData = JSON.parse(currentUserStr);
                    } catch (error) {
                        console.error('Failed to parse currentUser:', error);
                    }
                }
            }

            // Get employee ID - extract string from various possible formats
            let employeeId = userData?._id || userData?.userId || userData?.id;

            // If it's an object (like MongoDB ObjectId), try to get the string value
            if (employeeId && typeof employeeId === 'object') {
                employeeId = employeeId.$oid || employeeId.toString();
            }

            console.log('👤 [ROOMS] Loading therapist view for employee:', {
                employeeId,
                employeeIdType: typeof employeeId,
                userData,
                userType: userData?.type,
                userRole: userData?.role
            });

            // Validate we have an employee ID
            if (!employeeId) {
                throw new Error('No employee ID found for therapist');
            }

            // Get all room assignments
            console.log('🔍 [ROOMS] Fetching room assignments from API...');
            const assignmentsResult = await window.HybridAPIClient.get('/api/room-assignments', 'roomAssignments', {
                critical: true
            });

            console.log('📦 [ROOMS] API Response:', {
                success: assignmentsResult.success,
                dataLength: assignmentsResult.data?.length,
                data: assignmentsResult.data
            });

            if (!assignmentsResult.success) {
                throw new Error('Failed to load room assignments');
            }

            const allAssignments = assignmentsResult.data || [];

            // Filter to only this therapist's assignments
            const myAssignments = allAssignments.filter(a => {
                const match = String(a.employeeId) === String(employeeId);
                console.log('🔍 [ROOMS] Comparing:', {
                    assignmentEmployeeId: a.employeeId,
                    currentEmployeeId: employeeId,
                    match
                });
                return match;
            });

            console.log('🏨 [ROOMS] Therapist assignments found:', {
                total: allAssignments.length,
                filtered: myAssignments.length,
                myAssignments
            });

            if (myAssignments.length === 0) {
                // No rooms assigned
                container.innerHTML = `
                    <div class="empty-state" style="text-align: center; padding: 60px 20px;">
                        <i class="fas fa-door-closed" style="font-size: 4rem; color: #ddd; margin-bottom: 20px;"></i>
                        <h2 style="color: #666; margin-bottom: 10px;">No Rooms Assigned</h2>
                        <p style="color: #999; font-size: 1.1rem;">
                            You don't have any rooms assigned yet.<br>
                            Please contact your manager for room assignments.
                        </p>
                    </div>
                `;
                return;
            }

            // Group assignments by room
            const roomGroups = {};
            myAssignments.forEach(assignment => {
                if (!roomGroups[assignment.roomName]) {
                    roomGroups[assignment.roomName] = {
                        roomName: assignment.roomName,
                        roomId: assignment.roomId,
                        assignments: []
                    };
                }
                roomGroups[assignment.roomName].assignments.push(assignment);
            });

            // Display assigned rooms
            container.innerHTML = `
                <div style="max-width: 1200px; margin: 0 auto;">
                    <div class="info-banner" style="background: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; margin-bottom: 30px; border-radius: 5px;">
                        <i class="fas fa-info-circle" style="color: #2196F3; margin-right: 10px;"></i>
                        <strong>Your Assigned Rooms:</strong> You are assigned to ${Object.keys(roomGroups).length} room(s)
                    </div>

                    <div class="rooms-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                        ${Object.values(roomGroups).map(group => `
                            <div class="room-card available" style="border: 2px solid #2196F3; background: white; border-radius: 10px; padding: 0; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                                <div class="room-header" style="background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); color: white; padding: 20px;">
                                    <h3 style="margin: 0; font-size: 1.5rem;">
                                        <i class="fas fa-door-open"></i> ${group.roomName}
                                    </h3>
                                </div>
                                <div class="room-body" style="padding: 20px;">
                                    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
                                        <div style="font-weight: 600; color: #666; margin-bottom: 10px;">
                                            <i class="fas fa-info-circle"></i> Room Details
                                        </div>
                                        <div style="color: #555;">
                                            <div style="margin: 5px 0;">
                                                <i class="fas fa-hashtag" style="width: 20px; color: #2196F3;"></i>
                                                Room ID: <strong>#${group.roomId}</strong>
                                            </div>
                                            <div style="margin: 5px 0;">
                                                <i class="fas fa-calendar-alt" style="width: 20px; color: #2196F3;"></i>
                                                Assigned: <strong>${new Date(group.assignments[0].assignedAt).toLocaleDateString()}</strong>
                                            </div>
                                        </div>
                                    </div>

                                    <div style="background: #e8f5e9; padding: 15px; border-radius: 5px; border-left: 3px solid #4CAF50;">
                                        <div style="font-weight: 600; color: #2e7d32; margin-bottom: 10px;">
                                            <i class="fas fa-check-circle"></i> Assignment Status
                                        </div>
                                        <div style="color: #555;">
                                            You are authorized to use this room for client services
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

        } catch (error) {
            console.error('Failed to load therapist room view:', error);
            container.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 60px 20px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: #f44336; margin-bottom: 20px;"></i>
                    <h2 style="color: #666; margin-bottom: 10px;">Error Loading Rooms</h2>
                    <p style="color: #999; font-size: 1.1rem;">
                        Unable to load your assigned rooms.<br>
                        Please try refreshing the page.
                    </p>
                </div>
            `;
        }
    }
}

// Initialize Room Manager
const roomManager = new RoomManager();

// Make roomManager globally available for POS system
window.roomManager = roomManager;

// Load rooms when page is shown - force refresh to get latest data
window.loadRooms = async function() {
    await roomManager.init();
    // Force refresh display to show latest employee assignments
    await roomManager.displayRooms(true);
};

// Initialize room manager on app start
document.addEventListener('DOMContentLoaded', async () => {
    if (window.roomManager && !window.roomManager.initialized) {
        await window.roomManager.init();
        window.roomManager.initialized = true;
    }
});