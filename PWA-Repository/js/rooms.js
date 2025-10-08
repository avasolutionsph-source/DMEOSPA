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
                await this.showTherapistView(userData); // Pass userData to avoid re-fetching
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
                this.startManagerAutoRefresh(); // Add auto-refresh for manager view
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

    // Helper to update room statuses based on loaded services
    updateRoomStatusesFromServices() {
        // Update room statuses based on active and pending services
        for (const service of this.activeServices) {
            const room = this.rooms.find(r => r.id === service.roomId);
            console.log('🔗 [ROOMS] Linking service to room:', {
                serviceId: service.id || service._id,
                serviceStatus: service.status,
                serviceName: service.serviceName,
                roomId: service.roomId,
                foundRoom: !!room,
                roomName: room?.name
            });

            if (room) {
                if (service.status === 'pending') {
                    room.status = 'pending';
                } else {
                    room.status = 'occupied';
                }
                room.currentService = service;
            }
        }
    }

    async loadActiveServices() {
        try {
            // For manager view, load from MongoDB for cross-device sync
            if (!this.isTherapistView) {
                try {
                    const authToken = localStorage.getItem('authToken') || localStorage.getItem('jwtToken');
                    if (authToken) {
                        const response = await fetch('https://daetspa-backend.onrender.com/api/room-services', {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${authToken}`
                            }
                        });

                        if (response.ok) {
                            const result = await response.json();
                            if (result.success && result.data) {
                                this.activeServices = result.data;
                                console.log('✅ [ROOMS] Loaded active/pending services from MongoDB:', this.activeServices);

                                // Sync to IndexedDB for offline access
                                for (const service of this.activeServices) {
                                    await window.db.update('activeServices', service);
                                }

                                // Update room statuses and return early
                                this.updateRoomStatusesFromServices();
                                return;
                            }
                        }
                    }
                } catch (error) {
                    console.log('⚠️ [ROOMS] Failed to load from MongoDB, falling back to IndexedDB:', error);
                }
            }

            // Fallback to IndexedDB (for offline or if MongoDB fails)
            const allServices = await window.db.getAll('activeServices');

            console.log('📋 [ROOMS] All services from IndexedDB:', allServices);

            this.activeServices = (allServices || []).filter(service =>
                service.status === 'active' || service.status === 'pending'
            );

            console.log('✅ [ROOMS] Filtered active/pending services:', this.activeServices);

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

    async loadAdvanceBookings(caller = 'unknown') {
        try {
            console.log(`🔄 [ROOMS] Loading advance bookings... (called by: ${caller})`);
            const authToken = localStorage.getItem('authToken') || localStorage.getItem('jwtToken');
            if (!authToken) {
                console.warn('⚠️ [ROOMS] No auth token found for advance bookings');
                this.advanceBookings = [];
                return;
            }

            console.log('🌐 [ROOMS] Fetching advance bookings from API...');

            // Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                console.warn('⚠️ [ROOMS] Advance bookings fetch timeout after 10 seconds');
                controller.abort();
            }, 10000);

            const response = await fetch('https://daetspa-backend.onrender.com/api/advance-bookings', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                signal: controller.signal
            }).finally(() => clearTimeout(timeoutId));

            console.log('📡 [ROOMS] Advance bookings API response:', {
                status: response.status,
                ok: response.ok,
                statusText: response.statusText
            });

            if (response.ok) {
                const result = await response.json();
                console.log('📦 [ROOMS] Advance bookings API result:', result);

                if (result.success && result.data) {
                    // Filter for today and future bookings only
                    const now = new Date();
                    this.advanceBookings = result.data.filter(booking => {
                        const bookingDate = new Date(booking.bookingDateTime);
                        return bookingDate >= now || booking.status === 'in-progress';
                    });
                    console.log('✅ [ROOMS] Loaded advance bookings:', {
                        totalFromAPI: result.data.length,
                        afterFiltering: this.advanceBookings.length,
                        bookings: this.advanceBookings
                    });
                } else {
                    console.warn('⚠️ [ROOMS] No advance bookings data in response');
                    this.advanceBookings = [];
                }
            } else {
                console.error('❌ [ROOMS] Failed to fetch advance bookings:', response.status);
                this.advanceBookings = [];
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('❌ [ROOMS] Advance bookings fetch aborted due to timeout');
            } else {
                console.error('❌ [ROOMS] Failed to load advance bookings:', error);
            }
            this.advanceBookings = [];
        }
    }

    async displayRooms(forceRefresh = false) {
        // CRITICAL: Do not run displayRooms for therapists
        if (this.isTherapistView) {
            console.log('🚫 [ROOMS] displayRooms blocked - therapist view is active');
            return;
        }

        const container = document.getElementById('roomsGrid');
        if (!container) return;

        // 🔧 FIX: Reload active services and advance bookings to get latest data from database
        await this.loadActiveServices();
        await this.loadAdvanceBookings('displayRooms');

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

        // Get all therapists (employees with therapist roles)
        const employeesResult = await window.HybridAPIClient.getEmployees();
        const allEmployees = employeesResult.success ? (employeesResult.data || []) : [];

        const therapistPositions = [
            'Senior Therapist', 'Junior Therapist', 'Therapist',
            'Massage Therapist', 'New Therapist',
            'senior_therapist', 'junior_therapist', 'new_therapist'
        ];

        const therapists = allEmployees.filter(emp =>
            therapistPositions.includes(emp.position)
        );

        console.log('👥 [ROOMS] Therapists found:', therapists.length);

        // Get home services (services without roomId)
        const homeServices = this.activeServices.filter(service =>
            service.isHomeService === true || (service.roomName && service.roomName.includes('Home Service'))
        );
        console.log('🏠 [ROOMS] Active home services found:', homeServices.length);

        // Build room cards HTML
        let roomCardsHTML = visibleRooms.map(room => {
            const isOccupied = room.status === 'occupied';
            const isPending = room.status === 'pending';
            const statusColor = isOccupied ? '#800020' : isPending ? '#f39c12' : '#27ae60'; // Red, Yellow, Green
            const statusIcon = isOccupied ? 'clock' : isPending ? 'hourglass-half' : 'lock-open';
            const statusText = isOccupied ? 'IN SERVICE' : isPending ? 'PENDING' : 'AVAILABLE';

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
                // Get assignment IDs from allAssignments for unassign functionality
                const assignmentsWithIds = assignedTherapists.map(t => {
                    const assignment = roomAssignments.find(a =>
                        a.employeeId === t.id || String(a.employeeId) === String(t.id)
                    );
                    return {
                        ...t,
                        assignmentId: assignment?._id
                    };
                });

                assignedTherapistsDisplay = `
                    <div class="assigned-therapists" style="background: #f0f8ff; padding: 8px; border-radius: 5px; margin-bottom: 10px; border-left: 3px solid #2196F3;">
                        <div style="font-weight: 600; color: #1976D2; margin-bottom: 5px;">
                            <i class="fas fa-user-check"></i> Assigned Therapists:
                        </div>
                        ${assignmentsWithIds.map(t => {
                            const name = t.firstName ? `${t.firstName} ${t.lastName}`.trim() : t.name;
                            return `<div style="font-size: 0.9rem; color: #555; padding: 2px 0; display: flex; justify-content: space-between; align-items: center;">
                                <span>
                                    <i class="fas fa-circle" style="font-size: 0.5rem; color: #4CAF50;"></i> ${name}
                                </span>
                                <button class="btn btn-danger btn-sm"
                                        onclick="roomManager.unassignTherapist('${t.assignmentId}', '${room.name}', '${name.replace(/'/g, "\\'")}')"
                                        style="padding: 2px 8px; font-size: 0.75rem; margin-left: 10px;"
                                        title="Unassign ${name}">
                                    <i class="fas fa-user-times"></i> Unassign
                                </button>
                            </div>`;
                        }).join('')}
                    </div>
                `;
            }

            let timerDisplay = '';
            let serviceInfo = '';

            if (isPending && room.currentService) {
                // Pending service - show service info but no timer
                serviceInfo = `
                    <div class="service-info" style="background: #fff3cd; padding: 10px; border-radius: 5px; margin-top: 10px; border-left: 4px solid #f39c12;">
                        <div style="color: #f39c12; font-weight: bold; margin-bottom: 8px;">
                            <i class="fas fa-hourglass-half"></i> PENDING - Click "Start" to begin
                        </div>
                        <div><strong>Service:</strong> ${room.currentService.serviceName}</div>
                        <div><strong>Client:</strong> ${room.currentService.clientName || 'Walk-in'}</div>
                        <div><strong>Therapist:</strong> ${room.currentService.employeeName}</div>
                        ${room.currentService.estimatedDuration ?
                            `<div><strong>Duration:</strong> ${room.currentService.estimatedDuration} mins</div>` : ''}
                    </div>
                `;
            } else if (isOccupied && room.currentService) {
                // Active service - show timer
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
                <div class="room-card ${isOccupied ? 'occupied' : isPending ? 'pending' : 'available'} ${room.hidden ? 'hidden-room' : ''}" style="${room.hidden ? 'opacity: 0.6; border-style: dashed;' : ''}">
                    <div class="room-header ${isOccupied ? 'occupied' : isPending ? 'pending' : 'available'}" style="padding: 10px; margin: -1px -1px 0 -1px;">
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
                            ` : isPending ? `
                                <button class="btn btn-success btn-sm" onclick="roomManager.startPendingService(${room.id})">
                                    <i class="fas fa-play"></i> Start
                                </button>
                                <button class="btn btn-danger btn-sm" onclick="roomManager.cancelPendingService(${room.id})">
                                    <i class="fas fa-times"></i> Cancel
                                </button>
                            ` : `
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

        // Create permanent home service cards for each therapist
        const homeServiceCardsHTML = therapists.map(therapist => {
            // Get therapist ID
            const therapistId = therapist._id || therapist.id;
            const therapistName = therapist.firstName ?
                `${therapist.firstName} ${therapist.lastName}`.trim() :
                therapist.name;

            // Find active/pending home service for this therapist
            const activeService = homeServices.find(service =>
                String(service.employeeId) === String(therapistId) ||
                String(service.therapistId) === String(therapistId)
            );

            console.log(`🔍 [ROOMS] Looking for home service for therapist "${therapistName}" (ID: ${therapistId}):`, {
                therapistId: therapistId,
                homeServicesCount: homeServices.length,
                homeServices: homeServices.map(s => ({
                    employeeId: s.employeeId,
                    therapistId: s.therapistId,
                    employeeName: s.employeeName,
                    status: s.status,
                    match: String(s.employeeId) === String(therapistId) || String(s.therapistId) === String(therapistId)
                })),
                foundService: !!activeService,
                serviceDetails: activeService
            });

            const isPending = activeService?.status === 'pending';
            const isActive = activeService?.status === 'active';
            const isAvailable = !isPending && !isActive;

            let timerDisplay = '';
            let serviceInfo = '';
            let actionButtons = '';

            if (isPending && activeService) {
                serviceInfo = `
                    <div class="service-info" style="background: #fff3cd; padding: 10px; border-radius: 5px; margin-top: 10px; border-left: 4px solid #f39c12;">
                        <div style="color: #f39c12; font-weight: bold; margin-bottom: 8px;">
                            <i class="fas fa-hourglass-half"></i> PENDING - Service not started
                        </div>
                        <div><strong>Service:</strong> ${activeService.serviceName}</div>
                        <div><strong>Client:</strong> ${activeService.clientName || 'Did not select customer'}</div>
                        ${activeService.clientAddress ? `<div><strong>Location:</strong> ${activeService.clientAddress}</div>` : ''}
                        ${activeService.estimatedDuration ?
                            `<div><strong>Duration:</strong> ${activeService.estimatedDuration} mins</div>` : ''}
                    </div>
                `;
                actionButtons = `
                    <button class="btn btn-success btn-sm" onclick="roomManager.startHomeService('${activeService._id || activeService.id}')">
                        <i class="fas fa-play"></i> Start
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="roomManager.cancelHomeService('${activeService._id || activeService.id}')">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                `;
            }

            // Declare isNearEnd before the else if block so it's accessible later
            let isNearEnd = false;

            if (isActive && activeService) {
                const elapsed = this.calculateElapsedTime(activeService.startTime);

                // Calculate remaining time to determine card color
                const startTime = new Date(activeService.startTime);
                const elapsedMinutes = Math.floor((Date.now() - startTime.getTime()) / 1000 / 60);
                const estimatedDuration = activeService.estimatedDuration || 60;
                const remainingMinutes = estimatedDuration - elapsedMinutes;

                // Blue when more than 10 mins remaining, Red when 10 mins or less
                isNearEnd = remainingMinutes <= 10;
                const cardColor = isNearEnd ? '#800020' : '#2196F3'; // Maroon or Blue
                const bgColor = isNearEnd ? '#ffebee' : '#e3f2fd'; // Light red or light blue

                timerDisplay = `
                    <div class="room-timer" style="font-size: 1.5rem; font-weight: bold; color: ${cardColor}; margin: 10px 0;">
                        <i class="fas fa-clock"></i> ${elapsed}
                    </div>
                `;
                serviceInfo = `
                    <div class="service-info" style="background: #fff; padding: 10px; border-radius: 5px; margin-top: 10px;">
                        <div><strong>Service:</strong> ${activeService.serviceName}</div>
                        <div><strong>Client:</strong> ${activeService.clientName || 'Did not select customer'}</div>
                        ${activeService.clientAddress ? `<div><strong>Location:</strong> ${activeService.clientAddress}</div>` : ''}
                        <div><strong>Started:</strong> ${new Date(activeService.startTime).toLocaleTimeString()}</div>
                        ${activeService.estimatedDuration ?
                            `<div><strong>Duration:</strong> ${activeService.estimatedDuration} mins</div>` : ''}
                        ${isNearEnd ? `<div style="color: ${cardColor}; font-weight: bold; margin-top: 5px;"><i class="fas fa-exclamation-triangle"></i> ${remainingMinutes} mins remaining</div>` : ''}
                    </div>
                `;
                actionButtons = `
                    <button class="btn btn-danger btn-sm" onclick="roomManager.endHomeService('${activeService._id || activeService.id}')">
                        <i class="fas fa-stop"></i> End
                    </button>
                `;
            } else if (!isPending) {
                // Available - no active service
                serviceInfo = `
                    <div style="background: #e8f5e9; padding: 15px; border-radius: 5px; margin-top: 10px; border-left: 3px solid #4CAF50;">
                        <div style="font-weight: 600; color: #2e7d32; margin-bottom: 10px;">
                            <i class="fas fa-check-circle"></i> Available for Home Service
                        </div>
                        <div style="color: #555;">
                            No active home service
                        </div>
                    </div>
                `;
                actionButtons = '';
            }

            // Determine card state class
            const cardStateClass = isPending ? 'pending' : isActive ? (isNearEnd ? 'occupied' : 'active-service') : 'available';
            const headerStyle = isActive && !isNearEnd ? 'background: #2196F3; color: white;' : '';

            return `
                <div class="room-card ${cardStateClass}" ${isActive && !isNearEnd ? 'style="border-color: #2196F3;"' : ''}>
                    <div class="room-header ${cardStateClass}" style="padding: 10px; margin: -1px -1px 0 -1px; ${headerStyle}">
                        <h3 style="margin: 0; display: flex; justify-content: space-between; align-items: center;">
                            <span>
                                <i class="fas fa-home"></i> ${therapistName}
                            </span>
                            <span style="font-size: 0.8rem;">
                                <i class="fas fa-${isPending ? 'hourglass-half' : isActive ? 'clock' : 'check'}"></i> ${isPending ? 'PENDING' : isActive ? 'IN SERVICE' : 'AVAILABLE'}
                            </span>
                        </h3>
                    </div>
                    <div class="room-body" style="padding: 15px;">
                        <div class="room-type" style="color: #666; margin-bottom: 10px;">
                            <i class="fas fa-map-marker-alt"></i> Home Service
                            <span style="float: right;">
                                <i class="fas fa-user"></i> ${therapist.position}
                            </span>
                        </div>

                        ${timerDisplay}
                        ${serviceInfo}

                        ${actionButtons ? `<div class="room-actions" style="margin-top: 15px;">
                            ${actionButtons}
                        </div>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        // Generate advance booking cards for therapists
        const advanceBookingCardsHTML = therapists.map(therapist => {
            // Get therapist ID
            const therapistId = therapist._id || therapist.id;
            const therapistName = therapist.firstName ?
                `${therapist.firstName} ${therapist.lastName}`.trim() :
                therapist.name;

            // Find ALL advance bookings for this therapist
            const now = new Date();

            const therapistBookings = (this.advanceBookings || []).filter(booking => {
                const bookingDate = new Date(booking.bookingDateTime);
                return (String(booking.employeeId) === String(therapistId)) &&
                       bookingDate >= now &&
                       booking.status === 'scheduled';
            });

            if (therapistBookings.length === 0) return '';

            return therapistBookings.map(booking => {
                const bookingDate = new Date(booking.bookingDateTime);
                const timeUntil = Math.floor((bookingDate - now) / (60 * 1000)); // minutes
                const isImminent = timeUntil <= 30; // Within 30 minutes

                return `
                    <div class="room-card pending" ${isImminent ? 'style="border-color: #f39c12; border-width: 3px;"' : ''}>
                        <div class="room-header pending" style="padding: 10px; margin: -1px -1px 0 -1px;">
                            <h3 style="margin: 0; display: flex; justify-content: space-between; align-items: center;">
                                <span>
                                    <i class="fas fa-calendar-plus"></i> ${therapistName}
                                </span>
                                <span style="font-size: 0.8rem;">
                                    <i class="fas fa-clock"></i> ADVANCE BOOKING
                                </span>
                            </h3>
                        </div>
                        <div class="room-body" style="padding: 15px;">
                            <div class="room-type" style="color: #666; margin-bottom: 10px;">
                                <i class="fas fa-${booking.isHomeService ? 'home' : 'store'}"></i> ${booking.isHomeService ? 'Home Service' : booking.roomName}
                                ${isImminent ? '<span class="badge badge-warning" style="float: right; font-size: 0.7rem;">IMMINENT</span>' : ''}
                            </div>

                            <div class="service-info" style="background: #fff3cd; padding: 10px; border-radius: 5px; margin-top: 10px; border-left: 4px solid #f39c12;">
                                <div style="color: #856404; font-weight: bold; margin-bottom: 8px;">
                                    <i class="fas fa-hourglass-half"></i> Scheduled: ${bookingDate.toLocaleString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>
                                <div><strong>Service:</strong> ${booking.serviceName}</div>
                                <div><strong>Client:</strong> ${booking.clientName}</div>
                                ${booking.clientAddress ? `<div><strong>Location:</strong> ${booking.clientAddress}</div>` : ''}
                                ${booking.estimatedDuration ? `<div><strong>Duration:</strong> ${booking.estimatedDuration} mins</div>` : ''}
                                <div style="margin-top: 8px; color: ${isImminent ? '#d32f2f' : '#856404'}; font-weight: bold;">
                                    <i class="fas fa-stopwatch"></i> ${timeUntil > 60 ? `In ${Math.floor(timeUntil / 60)}h ${timeUntil % 60}m` : `In ${timeUntil} minutes`}
                                </div>
                            </div>

                            <div class="room-actions" style="margin-top: 15px;">
                                <button class="btn btn-success btn-sm" onclick="roomManager.startAdvanceBooking('${booking._id || booking.id}')">
                                    <i class="fas fa-play"></i> Start Now
                                </button>
                                <button class="btn btn-secondary btn-sm" onclick="window.app.showPage('appointments')">
                                    <i class="fas fa-info-circle"></i> View Details
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }).join('');

        // Combine room cards, home service cards, and advance booking cards
        container.innerHTML = roomCardsHTML + homeServiceCardsHTML + advanceBookingCardsHTML;
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

    async startPendingService(roomId) {
        const room = this.rooms.find(r => r.id === roomId);
        if (!room || !room.currentService || room.status !== 'pending') {
            showNotification('No pending service found', 'error');
            return;
        }

        // Update the existing pending service with start time
        room.currentService.startTime = new Date().toISOString();
        room.currentService.status = 'active';

        // Update in IndexedDB
        if (room.currentService.id) {
            await window.db.update('activeServices', room.currentService);
        } else {
            // If no ID, add it (shouldn't happen but safety check)
            const serviceId = await window.db.add('activeServices', room.currentService);
            room.currentService.id = serviceId;
        }

        // ALSO update in MongoDB (so other devices see the change)
        if (room.currentService._id) {
            try {
                await window.HybridAPIClient.put(`/api/room-services/${room.currentService._id}`, {
                    startTime: room.currentService.startTime,
                    status: 'active'
                }, {
                    critical: true
                });
                console.log('✅ [ROOM] Service status updated in MongoDB');
            } catch (error) {
                console.error('⚠️ [ROOM] Failed to update service in MongoDB:', error);
            }
        }

        // Update room status to occupied
        room.status = 'occupied';
        await window.db.update('rooms', room);

        // Refresh room list (for therapist or manager view)
        if (this.isTherapistView) {
            await this.showTherapistView();
        } else {
            this.displayRooms();
        }
        showNotification(`Service started in ${room.name}`, 'success');
    }

    async cancelPendingService(roomId) {
        const room = this.rooms.find(r => r.id === roomId);
        if (!room || !room.currentService || room.status !== 'pending') {
            showNotification('No pending service found', 'error');
            return;
        }

        if (!confirm(`Cancel pending service in ${room.name}?`)) return;

        const serviceMongoId = room.currentService._id;
        const serviceLocalId = room.currentService.id;

        // Delete from IndexedDB
        if (serviceLocalId) {
            await window.db.delete('activeServices', serviceLocalId);
        }

        // ALSO delete from MongoDB (so other devices see the cancellation)
        if (serviceMongoId) {
            try {
                await window.HybridAPIClient.delete(`/api/room-services/${serviceMongoId}`, {
                    critical: true
                });
                console.log('✅ [ROOM] Pending service deleted from MongoDB');
            } catch (error) {
                console.error('⚠️ [ROOM] Failed to delete service from MongoDB:', error);
            }
        }

        // Remove from active services array
        this.activeServices = this.activeServices.filter(service =>
            service.id !== serviceLocalId && service._id !== serviceMongoId
        );

        console.log('🧹 [ROOM] Cancelled pending service:', {
            roomId: room.id,
            roomName: room.name,
            serviceLocalId: serviceLocalId,
            serviceMongoId: serviceMongoId
        });

        // Clear room
        room.status = 'available';
        room.currentService = null;
        await window.db.update('rooms', room);

        // Give MongoDB a moment to process the deletion
        await new Promise(resolve => setTimeout(resolve, 500));

        // Refresh room list
        if (this.isTherapistView) {
            await this.showTherapistView();
        } else {
            this.displayRooms();
        }

        showNotification(`Pending service cancelled in ${room.name}`, 'info');
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
        const serviceId = room.currentService.id;
        const serviceMongoId = room.currentService._id;

        room.currentService.endTime = endTime.toISOString();
        room.currentService.actualDuration = durationMinutes;
        room.currentService.status = 'completed';

        // Update in IndexedDB to completed status
        await window.db.update('activeServices', room.currentService);

        // ALSO update in MongoDB (so other devices see the change)
        if (serviceMongoId) {
            try {
                await window.HybridAPIClient.put(`/api/room-services/${serviceMongoId}`, {
                    endTime: room.currentService.endTime,
                    actualDuration: room.currentService.actualDuration,
                    status: 'completed'
                }, {
                    critical: true
                });
                console.log('✅ [ROOM] Service marked as completed in MongoDB');
            } catch (error) {
                console.error('⚠️ [ROOM] Failed to update service in MongoDB:', error);
            }
        }

        // Remove from active services array
        this.activeServices = this.activeServices.filter(service =>
            service.id !== serviceId && service._id !== serviceMongoId
        );

        console.log('🧹 [ROOM] Clearing room status:', {
            roomId: room.id,
            roomName: room.name,
            previousStatus: room.status,
            serviceId: serviceId,
            serviceMongoId: serviceMongoId
        });

        // Clear room - set to available
        room.status = 'available';
        room.currentService = null;
        await window.db.update('rooms', room);

        // Give MongoDB a moment to process the update before refreshing
        await new Promise(resolve => setTimeout(resolve, 500));

        // Refresh view (therapist or manager)
        if (this.isTherapistView) {
            await this.showTherapistView();
        } else {
            this.displayRooms();
        }

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
            startTime: null, // Don't start timer yet - will be set when user clicks "Start"
            status: 'pending' // Set to pending instead of active
        };

        console.log('🏨 [ROOM] Creating pending service (not started yet):', {
            activeService: activeService,
            employeeId: activeService.employeeId,
            employeeName: activeService.employeeName
        });

        // Save to IndexedDB first (for offline support)
        const localServiceId = await window.db.add('activeServices', activeService);
        activeService.id = localServiceId;

        // ALSO save to MongoDB via API (so other devices can see it)
        console.log('🔄 [ROOM] Attempting to save service to MongoDB...', {
            hasHybridAPIClient: !!window.HybridAPIClient,
            activeService: activeService
        });

        try {
            const apiResult = await window.HybridAPIClient.post('/api/room-services', activeService, {
                critical: true
            });

            console.log('📡 [ROOM] MongoDB API response:', {
                success: apiResult.success,
                hasData: !!apiResult.data,
                dataId: apiResult.data?._id
            });

            if (apiResult.success && apiResult.data?._id) {
                // Update with MongoDB ID
                activeService._id = apiResult.data._id;
                await window.db.update('activeServices', { ...activeService, _id: apiResult.data._id });
                console.log('✅ [ROOM] Service saved to MongoDB:', apiResult.data._id);
            } else {
                console.warn('⚠️ [ROOM] MongoDB save returned but no _id:', apiResult);
            }
        } catch (error) {
            console.error('❌ [ROOM] Failed to save service to MongoDB:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                apiClientStatus: window.HybridAPIClient?.isOnline
            });
            // Continue anyway - service is saved locally
        }

        // Add to active services array
        this.activeServices.push(activeService);

        // Update room status to pending (yellow) instead of occupied (red)
        room.status = 'pending';
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

    // Unassign a therapist from a room (manager view)
    async unassignTherapist(assignmentId, roomName, therapistName) {
        if (!confirm(`Unassign ${therapistName} from ${roomName}?`)) {
            return;
        }

        try {
            console.log(`🗑️ [ROOMS] Unassigning therapist from room...`, {
                assignmentId,
                roomName,
                therapistName
            });

            // Delete assignment via API
            const result = await window.HybridAPIClient.delete(
                `/api/room-assignments/${assignmentId}`,
                {
                    critical: true
                }
            );

            if (result.success) {
                console.log('✅ [ROOMS] Therapist unassigned successfully');
                showNotification(`${therapistName} unassigned from ${roomName}`, 'success');

                // Force refresh room display with fresh data from MongoDB
                await this.displayRooms(true);
            } else {
                throw new Error(result.error || 'Failed to unassign therapist');
            }
        } catch (error) {
            console.error('Failed to unassign therapist:', error);
            showNotification('Failed to unassign therapist', 'error');
        }
    }

    // Leave room (therapist view)
    async leaveRoom(assignmentId, roomName) {
        if (!confirm(`Are you sure you want to leave ${roomName}?`)) {
            return;
        }

        try {
            console.log(`🚪 [ROOMS] Therapist leaving room...`, {
                assignmentId,
                roomName
            });

            // Delete assignment via API (same endpoint as unassign)
            const result = await window.HybridAPIClient.delete(
                `/api/room-assignments/${assignmentId}`,
                {
                    critical: true
                }
            );

            if (result.success) {
                console.log('✅ [ROOMS] Left room successfully');
                showNotification(`You have left ${roomName}`, 'success');

                // Refresh therapist view
                await this.showTherapistView();
            } else {
                throw new Error(result.error || 'Failed to leave room');
            }
        } catch (error) {
            console.error('Failed to leave room:', error);
            showNotification('Failed to leave room', 'error');
        }
    }

    // Start home service
    async startHomeService(serviceId) {
        try {
            const service = this.activeServices.find(s =>
                s.id === serviceId || s._id === serviceId || String(s._id) === String(serviceId)
            );

            if (!service || service.status !== 'pending') {
                showNotification('Home service not found or already started', 'error');
                return;
            }

            // Update service with start time
            service.startTime = new Date().toISOString();
            service.status = 'active';

            // Update in IndexedDB
            await window.db.update('activeServices', service);

            // Update in MongoDB
            if (service._id) {
                try {
                    await window.HybridAPIClient.put(`/api/room-services/${service._id}`, {
                        startTime: service.startTime,
                        status: 'active'
                    }, {
                        critical: true
                    });
                    console.log('✅ [HOME SERVICE] Service started in MongoDB');
                } catch (error) {
                    console.error('⚠️ [HOME SERVICE] Failed to update in MongoDB:', error);
                }
            }

            // Refresh display
            await this.loadActiveServices();
            this.displayRooms();
            showNotification('Home service started', 'success');
        } catch (error) {
            console.error('Failed to start home service:', error);
            showNotification('Failed to start home service', 'error');
        }
    }

    // Cancel home service
    async cancelHomeService(serviceId) {
        if (!confirm('Cancel this home service?')) return;

        try {
            const service = this.activeServices.find(s =>
                s.id === serviceId || s._id === serviceId || String(s._id) === String(serviceId)
            );

            if (!service) {
                showNotification('Home service not found', 'error');
                return;
            }

            // Delete from IndexedDB
            if (service.id) {
                await window.db.delete('activeServices', service.id);
            }

            // Delete from MongoDB
            if (service._id) {
                try {
                    await window.HybridAPIClient.delete(`/api/room-services/${service._id}`, {
                        critical: true
                    });
                    console.log('✅ [HOME SERVICE] Service deleted from MongoDB');
                } catch (error) {
                    console.error('⚠️ [HOME SERVICE] Failed to delete from MongoDB:', error);
                }
            }

            // Remove from active services array
            this.activeServices = this.activeServices.filter(s =>
                s.id !== service.id && s._id !== service._id
            );

            // Refresh display
            await this.loadActiveServices();
            this.displayRooms();
            showNotification('Home service cancelled', 'info');
        } catch (error) {
            console.error('Failed to cancel home service:', error);
            showNotification('Failed to cancel home service', 'error');
        }
    }

    // End home service
    async endHomeService(serviceId) {
        if (!confirm('End this home service?')) return;

        try {
            const service = this.activeServices.find(s =>
                s.id === serviceId || s._id === serviceId || String(s._id) === String(serviceId)
            );

            if (!service) {
                showNotification('Home service not found', 'error');
                return;
            }

            // Calculate duration
            const startTime = new Date(service.startTime);
            const endTime = new Date();
            const durationMinutes = Math.floor((endTime - startTime) / 60000);

            // Update service record
            service.endTime = endTime.toISOString();
            service.actualDuration = durationMinutes;
            service.status = 'completed';

            // Update in IndexedDB
            await window.db.update('activeServices', service);

            // Update in MongoDB
            if (service._id) {
                try {
                    await window.HybridAPIClient.put(`/api/room-services/${service._id}`, {
                        endTime: service.endTime,
                        actualDuration: service.actualDuration,
                        status: 'completed'
                    }, {
                        critical: true
                    });
                    console.log('✅ [HOME SERVICE] Service completed in MongoDB');
                } catch (error) {
                    console.error('⚠️ [HOME SERVICE] Failed to update in MongoDB:', error);
                }
            }

            // Remove from active services array
            this.activeServices = this.activeServices.filter(s =>
                s.id !== service.id && s._id !== service._id
            );

            // Refresh display
            await this.loadActiveServices();
            this.displayRooms();
            showNotification(`Home service ended. Duration: ${durationMinutes} minutes`, 'info');
        } catch (error) {
            console.error('Failed to end home service:', error);
            showNotification('Failed to end home service', 'error');
        }
    }

    async startAdvanceBooking(bookingId) {
        if (!confirm('Start this advance booking now? This will create an active service.')) {
            return;
        }

        try {
            const booking = (this.advanceBookings || []).find(b => b._id === bookingId || b.id === bookingId);
            if (!booking) {
                showError('Booking not found');
                return;
            }

            // Create active service from booking
            const serviceData = {
                serviceName: booking.serviceName,
                clientName: booking.clientName,
                clientAddress: booking.clientAddress,
                clientPhone: booking.clientPhone,
                clientEmail: booking.clientEmail,
                employeeId: booking.employeeId,
                employeeName: booking.employeeName,
                therapistId: booking.employeeId,
                therapistName: booking.employeeName,
                estimatedDuration: booking.estimatedDuration,
                isHomeService: booking.isHomeService,
                roomId: booking.roomId,
                roomName: booking.roomName,
                status: 'active',
                startTime: new Date().toISOString()
            };

            // Save active service to IndexedDB
            const serviceId = await window.db.add('activeServices', serviceData);
            serviceData.id = serviceId;

            // Save to MongoDB
            try {
                const authToken = localStorage.getItem('authToken') || localStorage.getItem('jwtToken');
                const apiResult = await fetch('https://daetspa-backend.onrender.com/api/room-services', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify(serviceData)
                });

                if (apiResult.ok) {
                    const result = await apiResult.json();
                    if (result.data && result.data._id) {
                        serviceData._id = result.data._id;
                        await window.db.update('activeServices', { ...serviceData, _id: result.data._id });
                    }
                }
            } catch (error) {
                console.error('Failed to save to MongoDB:', error);
            }

            // Update booking status to in-progress
            try {
                const authToken = localStorage.getItem('authToken') || localStorage.getItem('jwtToken');
                await fetch(`https://daetspa-backend.onrender.com/api/advance-bookings/${bookingId}/convert`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ activeServiceId: serviceId })
                });
            } catch (error) {
                console.error('Failed to update booking status:', error);
            }

            showSuccess('Advance booking started successfully!');

            // Refresh display
            await this.loadActiveServices();
            await this.loadAdvanceBookings();
            this.displayRooms();
        } catch (error) {
            console.error('Error starting advance booking:', error);
            showError('Failed to start booking: ' + error.message);
        }
    }

    // Start auto-refresh for manager view
    startManagerAutoRefresh() {
        // Check for service status changes from MongoDB every 5 seconds
        if (this.managerRefreshInterval) {
            clearInterval(this.managerRefreshInterval);
        }
        this.managerRefreshInterval = setInterval(async () => {
            console.log('🔄 [MANAGER] Auto-checking for service updates...');
            await this.checkForServiceUpdates();
        }, 5000);
    }

    // Check for service status updates from MongoDB (for manager view)
    async checkForServiceUpdates() {
        try {
            // Get auth token
            const authToken = localStorage.getItem('authToken') || localStorage.getItem('jwtToken');
            if (!authToken) return;

            // Fetch from MongoDB
            const response = await fetch('https://daetspa-backend.onrender.com/api/room-services', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (!response.ok) return;

            const result = await response.json();
            if (result.success && result.data) {
                // Check if any service status changed
                const currentServices = this.activeServices.map(s => ({
                    id: s._id,
                    status: s.status,
                    startTime: s.startTime
                }));

                const hasChanges = result.data.some(apiService => {
                    const current = currentServices.find(s => s.id === apiService._id);
                    return !current ||
                           current.status !== apiService.status ||
                           current.startTime !== apiService.startTime;
                });

                // Also check if services were added or removed
                const countChanged = result.data.length !== this.activeServices.length;

                if (hasChanges || countChanged) {
                    console.log('✨ [MANAGER] Service status changed! Refreshing view...');
                    await this.loadRooms();
                    await this.loadActiveServices();
                    this.displayRooms();
                }
            }
        } catch (error) {
            // Silent fail - don't spam console on network errors
        }
    }

    // Helper method to update timer displays without full refresh
    updateTimerDisplays() {
        this.rooms.forEach(room => {
            if (room.status === 'occupied' && room.currentService?.startTime) {
                const timerElement = document.querySelector(`[data-room-id="${room.id}"] .service-timer`);
                if (timerElement) {
                    const duration = Math.floor((Date.now() - new Date(room.currentService.startTime)) / 1000);
                    const hours = Math.floor(duration / 3600);
                    const minutes = Math.floor((duration % 3600) / 60);
                    const seconds = duration % 60;
                    timerElement.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                }
            }
        });
    }

    // Check for new pending services from MongoDB
    async checkForNewPendingServices(userData) {
        try {
            // Get auth token
            const authToken = localStorage.getItem('authToken') || localStorage.getItem('jwtToken');
            if (!authToken) return;

            // Fetch from MongoDB
            const response = await fetch('https://daetspa-backend.onrender.com/api/room-services', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (!response.ok) return;

            const result = await response.json();
            if (result.success && result.data && result.data.length > 0) {
                // Check if we have new services we didn't have before
                const currentServiceIds = this.rooms
                    .filter(r => r.currentService)
                    .map(r => r.currentService._id)
                    .filter(id => id);

                const hasNewServices = result.data.some(service =>
                    !currentServiceIds.includes(service._id)
                );

                if (hasNewServices) {
                    console.log('✨ [THERAPIST] New pending service detected! Refreshing view...');
                    await this.showTherapistView(userData);
                }
            }
        } catch (error) {
            // Silent fail - don't spam console on network errors
        }
    }

    // Therapist view - shows only their assigned rooms
    async showTherapistView(userData = null) {
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
            // Use passed userData or fetch it
            if (!userData) {
                userData = window.app?.userData;
            }
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
            if (!userData && window.authSystem) {
                userData = window.authSystem.getCurrentUser();
            }

            // Get employee ID - try all possible field names
            let employeeId = userData?._id ||
                           userData?.userId ||
                           userData?.id ||
                           userData?.employeeId ||
                           userData?.email; // Fallback to email as unique identifier

            // If it's an object (like MongoDB ObjectId), try to get the string value
            if (employeeId && typeof employeeId === 'object') {
                employeeId = employeeId.$oid || employeeId.toString();
            }

            console.log('👤 [ROOMS] Loading therapist view for employee:', {
                employeeId,
                employeeIdType: typeof employeeId,
                userData,
                userDataKeys: userData ? Object.keys(userData) : [],
                userType: userData?.type,
                userRole: userData?.role,
                userEmail: userData?.email
            });

            // Validate we have an employee ID
            if (!employeeId) {
                console.error('❌ [ROOMS] No employee ID found. userData:', userData);
                throw new Error(`No employee ID found for therapist. Available fields: ${userData ? Object.keys(userData).join(', ') : 'none'}`);
            }

            // FIRST: Load room data, services, and advance bookings from MongoDB (not IndexedDB)
            console.log('📦 [THERAPIST] Loading rooms, services, and advance bookings from MongoDB...');
            await this.loadRooms();
            console.log('⏳ [THERAPIST] About to load advance bookings...');
            await this.loadAdvanceBookings('showTherapistView');
            console.log('✅ [THERAPIST] Advance bookings loaded, count:', this.advanceBookings?.length);

            // Declare servicesResult outside try block so it's accessible later
            let servicesResult = { success: false, data: [] };

            // Load services from MongoDB API using direct fetch (bypass HybridAPIClient)
            try {
                console.log('🔄 [THERAPIST] Starting MongoDB API call...');
                console.log('🔍 [THERAPIST] Checking auth token...');

                // Get auth token
                const authToken = localStorage.getItem('authToken') || localStorage.getItem('jwtToken');
                console.log('🔑 [THERAPIST] Auth token exists:', !!authToken, 'Length:', authToken?.length);

                if (!authToken) {
                    throw new Error('No auth token found');
                }

                console.log('🌐 [THERAPIST] Creating fetch request...');
                const apiUrl = 'https://daetspa-backend.onrender.com/api/room-services';
                console.log('🎯 [THERAPIST] Target URL:', apiUrl);

                // Make direct fetch with timeout using Promise.race
                const controller = new AbortController();

                const fetchPromise = fetch(apiUrl, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    signal: controller.signal
                }).then(response => {
                    console.log('📡 [THERAPIST] Fetch completed, got response object');
                    return response;
                }).catch(err => {
                    console.error('❌ [THERAPIST] Fetch threw error:', err.message);
                    throw err;
                });

                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => {
                        controller.abort();
                        reject(new Error('Request timeout after 8 seconds'));
                    }, 8000);
                });

                console.log('⏳ [THERAPIST] Waiting for fetch response (8 second timeout)...');
                const response = await Promise.race([fetchPromise, timeoutPromise]);
                console.log('✅ [THERAPIST] Got response! Status:', response.status, 'OK:', response.ok);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('❌ [THERAPIST] API error response:', errorText);
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                // Get response text first for debugging
                const responseText = await response.text();
                console.log('📄 [THERAPIST] Raw API response:', responseText);

                try {
                    servicesResult = JSON.parse(responseText);
                    console.log('📋 [THERAPIST] Parsed API response:', servicesResult);
                } catch (parseError) {
                    console.error('❌ [THERAPIST] Failed to parse JSON:', parseError);
                    throw new Error('Invalid JSON response from API');
                }

                if (servicesResult.success && servicesResult.data && servicesResult.data.length > 0) {
                    console.log(`✅ [THERAPIST] Found ${servicesResult.data.length} active/pending services`);

                    // Populate this.activeServices for use by action functions
                    this.activeServices = servicesResult.data;

                    // Update room statuses based on MongoDB services
                    for (const service of servicesResult.data) {
                        const room = this.rooms.find(r => r.id === service.roomId);
                        if (room) {
                            // Only update room status if service is actually active or pending
                            if (service.status === 'pending') {
                                room.status = 'pending';
                                room.currentService = service;
                            } else if (service.status === 'active') {
                                room.status = 'occupied';
                                room.currentService = service;
                            }
                            // Ignore completed services - they shouldn't be returned by API anyway
                            console.log('🔗 [THERAPIST] Linked service to room:', {
                                roomName: room.name,
                                status: room.status,
                                serviceName: service.serviceName
                            });
                        }
                    }
                } else {
                    console.log('ℹ️ [THERAPIST] No active services found in MongoDB', {
                        success: servicesResult?.success,
                        dataExists: !!servicesResult?.data,
                        dataLength: servicesResult?.data?.length
                    });
                }
            } catch (error) {
                if (error.name === 'AbortError') {
                    console.error('⚠️ [THERAPIST] API request timed out after 8 seconds');
                } else {
                    console.error('⚠️ [THERAPIST] Failed to load services from MongoDB:', error);
                    console.error('Error details:', {
                        message: error.message,
                        stack: error.stack
                    });
                }
                // Fallback to local IndexedDB
                console.log('📦 [THERAPIST] Falling back to IndexedDB...');
                await this.loadActiveServices();
            }

            console.log('🔍 [THERAPIST] Final room statuses:', this.rooms.map(r => ({
                id: r.id,
                name: r.name,
                status: r.status,
                hasService: !!r.currentService,
                serviceStatus: r.currentService?.status
            })));

            // THEN: Get room assignments
            console.log('🔍 [ROOMS] Fetching room assignments from API...');
            const assignmentsResult = await window.HybridAPIClient.get('/api/room-assignments', 'roomAssignments', {
                critical: false,
                timeout: 5000
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
            // Try multiple ID formats for matching (MongoDB stores IDs in different formats)
            const myAssignments = allAssignments.filter(a => {
                // Convert both IDs to strings for comparison
                const assignmentId = String(a.employeeId || '');
                const currentId = String(employeeId || '');

                // Also try matching with the employee's _id if it exists in assignment
                const assignmentIdAlt = String(a.employeeId?._id || a.employeeId?.id || '');

                // Try to extract ObjectId string if it's an object
                let assignmentIdStr = assignmentId;
                if (a.employeeId && typeof a.employeeId === 'object') {
                    assignmentIdStr = a.employeeId.$oid || a.employeeId.toString() || assignmentId;
                }

                const match = assignmentIdStr === currentId ||
                             assignmentId === currentId ||
                             assignmentIdAlt === currentId;

                console.log('🔍 [ROOMS] Comparing:', {
                    assignmentEmployeeId: a.employeeId,
                    assignmentIdStr,
                    assignmentIdAlt,
                    currentEmployeeId: employeeId,
                    employeeName: a.employeeName,
                    roomName: a.roomName,
                    match
                });
                return match;
            });

            console.log('🏨 [ROOMS] Therapist assignments found:', {
                total: allAssignments.length,
                filtered: myAssignments.length,
                myAssignments
            });

            // Also check for home services assigned to this therapist
            const myHomeServices = servicesResult.data?.filter(service => {
                if (!service.isHomeService) return false;

                const serviceEmployeeId = String(service.employeeId || service.therapistId || '');
                const currentId = String(employeeId || '');

                const match = serviceEmployeeId === currentId;

                console.log('🏠 [THERAPIST] Checking home service:', {
                    serviceEmployeeId,
                    serviceTherapistId: service.therapistId,
                    currentEmployeeId: employeeId,
                    serviceName: service.serviceName,
                    status: service.status,
                    match
                });

                return match;
            }) || [];

            console.log('🏠 [THERAPIST] Home services found:', {
                total: servicesResult.data?.length || 0,
                homeServices: myHomeServices.length,
                services: myHomeServices
            });

            if (myAssignments.length === 0 && myHomeServices.length === 0) {
                // No rooms or home services assigned
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

            // Display assigned rooms and home services with current status
            const totalAssignments = Object.keys(roomGroups).length + myHomeServices.length;

            console.log('🎨 [THERAPIST] About to render view with:', {
                rooms: Object.keys(roomGroups).length,
                homeServices: myHomeServices.length,
                advanceBookings: this.advanceBookings?.length || 0,
                advanceBookingsData: this.advanceBookings
            });

            container.innerHTML = `
                <div style="max-width: 1200px; margin: 0 auto;">
                    <div class="info-banner" style="background: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; margin-bottom: 30px; border-radius: 5px;">
                        <i class="fas fa-info-circle" style="color: #2196F3; margin-right: 10px;"></i>
                        <strong>Your Assignments:</strong> ${Object.keys(roomGroups).length} room(s)${myHomeServices.length > 0 ? ` + ${myHomeServices.length} home service(s)` : ''}
                    </div>

                    <div class="rooms-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                        ${Object.values(roomGroups).map(group => {
                            // Find the actual room data to get current status
                            const room = this.rooms.find(r => r.id === group.roomId);

                            console.log('🏨 [THERAPIST] Checking room:', {
                                groupRoomId: group.roomId,
                                groupRoomName: group.roomName,
                                foundRoom: !!room,
                                roomStatus: room?.status,
                                roomCurrentService: room?.currentService,
                                allRoomIds: this.rooms.map(r => r.id)
                            });

                            const isPending = room?.status === 'pending';
                            const isOccupied = room?.status === 'occupied';
                            const isAvailable = !isPending && !isOccupied;

                            let statusBadge = '';
                            let statusInfo = '';
                            let actionButtons = '';

                            if (isPending && room.currentService) {
                                statusBadge = `<span style="background: #f39c12; color: white; padding: 5px 15px; border-radius: 20px; font-size: 0.9rem; font-weight: bold;">
                                    <i class="fas fa-hourglass-half"></i> PENDING
                                </span>`;
                                statusInfo = `
                                    <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin-bottom: 15px; border-left: 4px solid #f39c12;">
                                        <div style="color: #f39c12; font-weight: bold; margin-bottom: 10px;">
                                            <i class="fas fa-hourglass-half"></i> Pending Service
                                        </div>
                                        <div style="color: #555; font-size: 0.9rem;">
                                            <div style="margin: 5px 0;"><strong>Service:</strong> ${room.currentService.serviceName}</div>
                                            <div style="margin: 5px 0;"><strong>Client:</strong> ${room.currentService.clientName || 'Walk-in'}</div>
                                            ${room.currentService.estimatedDuration ?
                                                `<div style="margin: 5px 0;"><strong>Duration:</strong> ${room.currentService.estimatedDuration} mins</div>` : ''}
                                        </div>
                                    </div>
                                `;
                                actionButtons = `
                                    <button class="btn btn-success" onclick="roomManager.startPendingService(${room.id})" style="width: 100%; margin-bottom: 10px;">
                                        <i class="fas fa-play"></i> Start Service
                                    </button>
                                `;
                            } else if (isOccupied && room.currentService) {
                                const elapsed = this.calculateElapsedTime(room.currentService.startTime);
                                statusBadge = `<span style="background: #800020; color: white; padding: 5px 15px; border-radius: 20px; font-size: 0.9rem; font-weight: bold;">
                                    <i class="fas fa-clock"></i> IN SERVICE
                                </span>`;
                                statusInfo = `
                                    <div style="background: #ffebee; padding: 15px; border-radius: 5px; margin-bottom: 15px; border-left: 4px solid #800020;">
                                        <div style="color: #800020; font-weight: bold; margin-bottom: 10px;">
                                            <i class="fas fa-clock"></i> Active Service
                                        </div>
                                        <div style="font-size: 1.5rem; font-weight: bold; color: #800020; margin: 10px 0;" class="service-timer" data-room-id="${room.id}">
                                            ${elapsed}
                                        </div>
                                        <div style="color: #555; font-size: 0.9rem;">
                                            <div style="margin: 5px 0;"><strong>Service:</strong> ${room.currentService.serviceName}</div>
                                            <div style="margin: 5px 0;"><strong>Client:</strong> ${room.currentService.clientName || 'Walk-in'}</div>
                                            <div style="margin: 5px 0;"><strong>Therapist:</strong> ${room.currentService.employeeName}</div>
                                            <div style="margin: 5px 0;"><strong>Started:</strong> ${new Date(room.currentService.startTime).toLocaleTimeString()}</div>
                                            ${room.currentService.estimatedDuration ?
                                                `<div style="margin: 5px 0;"><strong>Duration:</strong> ${room.currentService.estimatedDuration} mins</div>` : ''}
                                        </div>
                                    </div>
                                `;
                                actionButtons = `
                                    <button class="btn btn-danger" onclick="roomManager.endService(${room.id})" style="width: 100%;">
                                        <i class="fas fa-stop"></i> End Service
                                    </button>
                                `;
                            } else {
                                statusBadge = `<span style="background: #27ae60; color: white; padding: 5px 15px; border-radius: 20px; font-size: 0.9rem; font-weight: bold;">
                                    <i class="fas fa-check"></i> AVAILABLE
                                </span>`;
                                statusInfo = `
                                    <div style="background: #e8f5e9; padding: 15px; border-radius: 5px; margin-bottom: 15px; border-left: 3px solid #4CAF50;">
                                        <div style="font-weight: 600; color: #2e7d32; margin-bottom: 10px;">
                                            <i class="fas fa-check-circle"></i> Ready for Service
                                        </div>
                                        <div style="color: #555;">
                                            This room is available and ready for clients
                                        </div>
                                    </div>
                                `;
                            }

                            return `
                            <div class="room-card ${isPending ? 'pending' : isOccupied ? 'occupied' : 'available'}" style="border-radius: 10px; padding: 0; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                                <div class="room-header ${isPending ? 'pending' : isOccupied ? 'occupied' : 'available'}" style="padding: 20px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                        <h3 style="margin: 0; font-size: 1.5rem;">
                                            <i class="fas fa-door-${isOccupied ? 'closed' : 'open'}"></i> ${group.roomName}
                                        </h3>
                                        ${statusBadge}
                                    </div>
                                </div>
                                <div class="room-body" style="padding: 20px;">
                                    ${statusInfo}

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

                                    ${actionButtons}

                                    <button class="btn btn-warning"
                                            onclick="roomManager.leaveRoom('${group.assignments[0]._id}', '${group.roomName}')"
                                            style="width: 100%; margin-top: 10px;">
                                        <i class="fas fa-sign-out-alt"></i> Leave Room
                                    </button>
                                </div>
                            </div>
                        `;
                        }).join('')}

                        ${myHomeServices.map(homeService => {
                            const isPending = homeService.status === 'pending';
                            const isActive = homeService.status === 'active';
                            const isAvailable = !isPending && !isActive;

                            let statusBadge = '';
                            let statusInfo = '';
                            let actionButtons = '';
                            let isNearEnd = false; // Declare outside blocks

                            if (isPending) {
                                statusBadge = `<span style="background: #f39c12; color: white; padding: 5px 15px; border-radius: 20px; font-size: 0.9rem; font-weight: bold;">
                                    <i class="fas fa-hourglass-half"></i> PENDING
                                </span>`;
                                statusInfo = `
                                    <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin-bottom: 15px; border-left: 4px solid #f39c12;">
                                        <div style="color: #f39c12; font-weight: bold; margin-bottom: 10px;">
                                            <i class="fas fa-hourglass-half"></i> Pending Home Service
                                        </div>
                                        <div style="color: #555; font-size: 0.9rem;">
                                            <div style="margin: 5px 0;"><strong>Service:</strong> ${homeService.serviceName}</div>
                                            <div style="margin: 5px 0;"><strong>Client:</strong> ${homeService.clientName || 'Did not select customer'}</div>
                                            ${homeService.clientAddress ? `<div style="margin: 5px 0;"><strong>Location:</strong> ${homeService.clientAddress}</div>` : ''}
                                            ${homeService.estimatedDuration ?
                                                `<div style="margin: 5px 0;"><strong>Duration:</strong> ${homeService.estimatedDuration} mins</div>` : ''}
                                        </div>
                                    </div>
                                `;
                                actionButtons = `
                                    <button class="btn btn-success" onclick="roomManager.startHomeService('${homeService._id || homeService.id}')" style="width: 100%; margin-bottom: 10px;">
                                        <i class="fas fa-play"></i> Start Service
                                    </button>
                                `;
                            } else if (isActive) {
                                const elapsed = this.calculateElapsedTime(homeService.startTime);

                                // Calculate remaining time to determine card color
                                const startTime = new Date(homeService.startTime);
                                const elapsedMinutes = Math.floor((Date.now() - startTime.getTime()) / 1000 / 60);
                                const estimatedDuration = homeService.estimatedDuration || 60;
                                const remainingMinutes = estimatedDuration - elapsedMinutes;

                                // Blue when more than 10 mins remaining, Red when 10 mins or less
                                const isNearEnd = remainingMinutes <= 10;
                                const cardColor = isNearEnd ? '#800020' : '#2196F3'; // Maroon or Blue
                                const bgColor = isNearEnd ? '#ffebee' : '#e3f2fd'; // Light red or light blue

                                statusBadge = `<span style="background: ${cardColor}; color: white; padding: 5px 15px; border-radius: 20px; font-size: 0.9rem; font-weight: bold;">
                                    <i class="fas fa-clock"></i> IN SERVICE
                                </span>`;
                                statusInfo = `
                                    <div style="background: ${bgColor}; padding: 15px; border-radius: 5px; margin-bottom: 15px; border-left: 4px solid ${cardColor};">
                                        <div style="color: ${cardColor}; font-weight: bold; margin-bottom: 10px;">
                                            <i class="fas fa-clock"></i> Active Home Service
                                        </div>
                                        <div style="font-size: 1.5rem; font-weight: bold; color: ${cardColor}; margin: 10px 0;" class="service-timer" data-home-service-id="${homeService._id || homeService.id}">
                                            <i class="fas fa-clock"></i> ${elapsed}
                                        </div>
                                        <div style="color: #555; font-size: 0.9rem;">
                                            <div style="margin: 5px 0;"><strong>Service:</strong> ${homeService.serviceName}</div>
                                            <div style="margin: 5px 0;"><strong>Client:</strong> ${homeService.clientName || 'Did not select customer'}</div>
                                            ${homeService.clientAddress ? `<div style="margin: 5px 0;"><strong>Location:</strong> ${homeService.clientAddress}</div>` : ''}
                                            <div style="margin: 5px 0;"><strong>Started:</strong> ${new Date(homeService.startTime).toLocaleTimeString()}</div>
                                            ${homeService.estimatedDuration ?
                                                `<div style="margin: 5px 0;"><strong>Duration:</strong> ${homeService.estimatedDuration} mins</div>` : ''}
                                            ${isNearEnd ? `<div style="color: ${cardColor}; font-weight: bold; margin-top: 5px;"><i class="fas fa-exclamation-triangle"></i> ${remainingMinutes} mins remaining</div>` : ''}
                                        </div>
                                    </div>
                                `;
                                actionButtons = `
                                    <button class="btn btn-danger" onclick="roomManager.endHomeService('${homeService._id || homeService.id}')" style="width: 100%; margin-bottom: 10px;">
                                        <i class="fas fa-stop"></i> End Service
                                    </button>
                                `;
                            }

                            // Determine card styling based on time remaining
                            const cardClass = isPending ? 'pending' : (isActive && isNearEnd) ? 'occupied' : isActive ? 'active-service' : 'available';
                            const headerBgColor = isPending ? '' : (isActive && !isNearEnd) ? 'background: #2196F3; color: white;' : '';
                            const borderColor = (isActive && !isNearEnd) ? 'border-color: #2196F3;' : '';

                            return `
                            <div class="room-card ${cardClass}" style="border-radius: 10px; padding: 0; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); ${borderColor}">
                                <div class="room-header ${cardClass}" style="padding: 20px; ${headerBgColor}">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                        <h3 style="margin: 0; font-size: 1.5rem;">
                                            <i class="fas fa-home"></i> Home Service
                                        </h3>
                                        ${statusBadge}
                                    </div>
                                </div>
                                <div class="room-body" style="padding: 20px;">
                                    ${statusInfo}

                                    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
                                        <div style="font-weight: 600; color: #666; margin-bottom: 10px;">
                                            <i class="fas fa-info-circle"></i> Service Details
                                        </div>
                                        <div style="color: #555;">
                                            <div style="margin: 5px 0;">
                                                <i class="fas fa-map-marker-alt" style="width: 20px; color: #2196F3;"></i>
                                                Location: <strong>${homeService.clientAddress || 'Home Service'}</strong>
                                            </div>
                                        </div>
                                    </div>

                                    ${actionButtons}
                                </div>
                            </div>
                        `;
                        }).join('')}

                        ${(() => {
                            // Advance Bookings - renders ALL upcoming bookings for this therapist
                            const now = new Date();

                            console.log('🔍 [THERAPIST] Checking advance bookings:', {
                                totalBookings: this.advanceBookings?.length || 0,
                                allBookings: this.advanceBookings,
                                currentEmployeeId: employeeId,
                                currentEmployeeIdType: typeof employeeId
                            });

                            const myAdvanceBookings = (this.advanceBookings || []).filter(booking => {
                                const bookingDate = new Date(booking.bookingDateTime);
                                const bookingEmployeeId = String(booking.employeeId);
                                const currentId = String(employeeId);

                                const matchesEmployee = bookingEmployeeId === currentId;
                                const isScheduled = booking.status === 'scheduled';

                                console.log('📋 [THERAPIST] Checking booking:', {
                                    bookingId: booking._id || booking.id,
                                    bookingEmployeeId,
                                    currentEmployeeId: currentId,
                                    matchesEmployee,
                                    bookingDateTime: booking.bookingDateTime,
                                    bookingDate,
                                    now,
                                    status: booking.status,
                                    isScheduled,
                                    willInclude: matchesEmployee && isScheduled
                                });

                                return matchesEmployee && isScheduled;
                            });

                            console.log('📅 [THERAPIST] Advance bookings found:', {
                                total: this.advanceBookings?.length || 0,
                                filtered: myAdvanceBookings.length,
                                employeeId: employeeId,
                                bookings: myAdvanceBookings
                            });

                            return myAdvanceBookings.map(booking => {
                                const bookingDate = new Date(booking.bookingDateTime);
                                const timeUntil = Math.floor((bookingDate - now) / (60 * 1000)); // minutes
                                const isImminent = timeUntil <= 30; // Within 30 minutes

                                const statusBadge = `<span style="background: #f39c12; color: white; padding: 5px 15px; border-radius: 20px; font-size: 0.9rem; font-weight: bold;">
                                    <i class="fas fa-calendar-plus"></i> ADVANCE BOOKING
                                </span>`;

                                const statusInfo = `
                                    <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin-bottom: 15px; border-left: 4px solid #f39c12;">
                                        <div style="color: #856404; font-weight: bold; margin-bottom: 10px;">
                                            <i class="fas fa-hourglass-half"></i> Scheduled: ${bookingDate.toLocaleString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </div>
                                        <div style="color: #555; font-size: 0.9rem;">
                                            <div style="margin: 5px 0;"><strong>Service:</strong> ${booking.serviceName}</div>
                                            <div style="margin: 5px 0;"><strong>Client:</strong> ${booking.clientName}</div>
                                            ${booking.clientAddress ? `<div style="margin: 5px 0;"><strong>Location:</strong> ${booking.clientAddress}</div>` : ''}
                                            ${booking.estimatedDuration ? `<div style="margin: 5px 0;"><strong>Duration:</strong> ${booking.estimatedDuration} mins</div>` : ''}
                                            <div style="margin-top: 10px; color: ${isImminent ? '#d32f2f' : '#856404'}; font-weight: bold;">
                                                <i class="fas fa-stopwatch"></i> ${timeUntil > 60 ? `In ${Math.floor(timeUntil / 60)}h ${timeUntil % 60}m` : `In ${timeUntil} minutes`}
                                            </div>
                                        </div>
                                    </div>
                                `;

                                const actionButtons = `
                                    <button class="btn btn-success" onclick="roomManager.startAdvanceBooking('${booking._id || booking.id}')" style="width: 100%; margin-bottom: 10px;">
                                        <i class="fas fa-play"></i> Start Now
                                    </button>
                                    <button class="btn btn-secondary" onclick="window.app.showPage('appointments')" style="width: 100%;">
                                        <i class="fas fa-info-circle"></i> View Details
                                    </button>
                                `;

                                return `
                                    <div class="room-card pending" style="border-radius: 10px; padding: 0; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); ${isImminent ? 'border-color: #f39c12; border-width: 3px;' : ''}">
                                        <div class="room-header pending" style="padding: 20px;">
                                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                                <h3 style="margin: 0; font-size: 1.5rem;">
                                                    <i class="fas fa-${booking.isHomeService ? 'home' : 'store'}"></i> ${booking.isHomeService ? 'Home Service' : booking.roomName}
                                                </h3>
                                                ${statusBadge}
                                            </div>
                                            ${isImminent ? '<div style="background: #f39c12; color: white; padding: 8px; border-radius: 5px; font-weight: bold; text-align: center; margin-top: 10px;"><i class="fas fa-exclamation-triangle"></i> STARTING SOON</div>' : ''}
                                        </div>
                                        <div class="room-body" style="padding: 20px;">
                                            ${statusInfo}

                                            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
                                                <div style="font-weight: 600; color: #666; margin-bottom: 10px;">
                                                    <i class="fas fa-info-circle"></i> Booking Details
                                                </div>
                                            </div>

                                            <div class="room-actions">
                                                ${actionButtons}
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('');
                        })()}
                    </div>
                </div>
            `;

            // Auto-refresh timer for active services AND check for new pending services
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
            }

            // Update timers every second for active services
            this.timerInterval = setInterval(() => {
                const hasActiveServices = Object.values(roomGroups).some(group => {
                    const room = this.rooms.find(r => r.id === group.roomId);
                    return room?.status === 'occupied';
                });
                if (hasActiveServices) {
                    // Just update the timer display, don't refresh everything
                    this.updateTimerDisplays();
                }
            }, 1000);

            // Check for new pending services from MongoDB every 5 seconds
            if (this.pendingCheckInterval) {
                clearInterval(this.pendingCheckInterval);
            }
            this.pendingCheckInterval = setInterval(async () => {
                console.log('🔄 [THERAPIST] Auto-checking for new pending services...');
                await this.checkForNewPendingServices(userData);
            }, 5000); // Check every 5 seconds

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