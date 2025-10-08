/**
 * Appointments Management System
 * Displays and manages appointments/bookings for the spa business
 */

class AppointmentsManager {
    constructor() {
        this.appointments = [];
        this.advanceBookings = [];
        this.currentFilter = 'all';
        this.currentDate = ''; // Start with empty date to show all appointments
        this.refreshInterval = null;
        this.authCheckInterval = null;

        // Track login state for automatic refresh
        const userData = localStorage.getItem('currentUser');
        const userToken = localStorage.getItem('authToken');
        this.wasLoggedIn = !!(userData && userToken);

        console.log('🗓️ Appointments Manager initialized');
    }

    async init() {
        this.bindEvents();
        this.setupAuthListener();
        await this.loadAppointments();
        await this.loadAdvanceBookings();
        this.startAutoRefresh();
    }

    bindEvents() {
        // Filter buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('.appointment-filter-btn')) {
                this.handleFilterClick(e.target);
            }

            if (e.target.matches('.confirm-appointment-btn')) {
                this.confirmAppointment(e.target.dataset.id);
            }

            if (e.target.matches('.cancel-appointment-btn')) {
                this.cancelAppointment(e.target.dataset.id);
            }

            if (e.target.matches('.complete-appointment-btn')) {
                this.completeAppointment(e.target.dataset.id);
            }

            // Advance Booking Actions
            if (e.target.matches('.start-advance-booking-btn')) {
                this.startAdvanceBooking(e.target.dataset.id);
            }

            if (e.target.matches('.cancel-advance-booking-btn')) {
                this.cancelAdvanceBooking(e.target.dataset.id);
            }

            if (e.target.matches('.edit-advance-booking-btn')) {
                this.editAdvanceBooking(e.target.dataset.id);
            }
        });

        // Date filter
        const dateFilter = document.getElementById('appointmentDateFilter');
        if (dateFilter) {
            dateFilter.addEventListener('change', (e) => {
                this.currentDate = e.target.value;
                this.filterAndDisplayAppointments();
                this.displayAdvanceBookings();
            });
        }

        // Refresh button
        const refreshBtn = document.getElementById('refreshAppointmentsBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadAppointments();
                this.loadAdvanceBookings();
            });
        }
    }

    setupAuthListener() {
        // Listen for localStorage changes (login/logout events)
        window.addEventListener('storage', (e) => {
            if (e.key === 'authToken' || e.key === 'currentUser') {
                console.log('🔄 Auth state changed, reloading appointments...');
                this.loadAppointments();
            }
        });

        // Also check periodically for auth state changes in same window
        // (storage event doesn't fire for same window changes)
        this.authCheckInterval = setInterval(() => {
            const userData = localStorage.getItem('currentUser');
            const userToken = localStorage.getItem('authToken');
            const isCurrentlyLoggedIn = !!(userData && userToken);
            
            if (isCurrentlyLoggedIn !== this.wasLoggedIn) {
                console.log('🔄 Auth state changed in same window, reloading appointments...');
                this.wasLoggedIn = isCurrentlyLoggedIn;
                this.loadAppointments();
            }
        }, 2000); // Check every 2 seconds
    }

    async loadAppointments() {
        try {
            console.log('📥 Loading appointments from server...');

            // Get current user info for branch ID (using PWA auth system keys)
            const userData = localStorage.getItem('currentUser');
            const userToken = localStorage.getItem('authToken');

            console.log('🔍 [APPOINTMENTS] Auth check:', {
                hasUserData: !!userData,
                hasToken: !!userToken,
                userDataLength: userData?.length,
                tokenLength: userToken?.length
            });

            if (!userData || !userToken) {
                console.warn('No user data available, showing placeholder');
                this.showLoginRequired();
                return;
            }

            const user = JSON.parse(userData);
            console.log('👤 [APPOINTMENTS] Parsed user:', {
                userId: user.userId,
                id: user.id,
                role: user.role,
                type: user.type,
                email: user.email
            });

            const branchId = user.userId || user.id;
            
            // Fetch appointments from the unified backend API
            const response = await fetch(`${window.API_CONFIG?.BASE_URL || 'https://daetspa-backend.onrender.com'}/api/bookings/${branchId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.appointments = data.data || data.bookings || [];
                console.log(`✅ Loaded ${this.appointments.length} appointments`);
                
                // Log appointment to activity system
                if (window.activityLogger) {
                    window.activityLogger.logActivity(
                        'sync',
                        'appointment',
                        null,
                        `Loaded ${this.appointments.length} appointments from server`,
                        { count: this.appointments.length }
                    );
                }
            } else {
                console.error('Failed to load appointments:', response.statusText);
                this.appointments = [];
            }
        } catch (error) {
            console.error('Error loading appointments:', error);
            this.appointments = [];
        }

        this.updateStats();
        this.filterAndDisplayAppointments();
    }

    updateStats() {
        const today = new Date().toISOString().split('T')[0];
        const todayAppointments = this.appointments.filter(apt => 
            apt.appointmentDate.startsWith(today)
        );

        // Update stat cards
        this.updateStatCard('totalAppointments', this.appointments.length);
        this.updateStatCard('todayAppointments', todayAppointments.length);
        this.updateStatCard('pendingAppointments', 
            this.appointments.filter(apt => apt.status === 'pending').length);
        this.updateStatCard('confirmedAppointments', 
            this.appointments.filter(apt => apt.status === 'confirmed').length);
    }

    updateStatCard(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    handleFilterClick(button) {
        // Remove active class from all filter buttons
        document.querySelectorAll('.appointment-filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class to clicked button
        button.classList.add('active');
        
        // Update current filter
        this.currentFilter = button.dataset.filter;
        
        // Apply filter
        this.filterAndDisplayAppointments();
    }

    filterAndDisplayAppointments() {
        let filteredAppointments = [...this.appointments];

        // Filter by date (only if a date is selected)
        if (this.currentDate && this.currentDate.trim() !== '') {
            filteredAppointments = filteredAppointments.filter(apt => 
                apt.appointmentDate.startsWith(this.currentDate)
            );
        }

        // Filter by status
        if (this.currentFilter && this.currentFilter !== 'all') {
            filteredAppointments = filteredAppointments.filter(apt => 
                apt.status === this.currentFilter
            );
        }

        // Sort by appointment date and time
        filteredAppointments.sort((a, b) => {
            const dateA = new Date(`${a.appointmentDate} ${a.startTime}`);
            const dateB = new Date(`${b.appointmentDate} ${b.startTime}`);
            return dateA - dateB;
        });

        this.displayAppointments(filteredAppointments);
    }

    displayAppointments(appointments) {
        const container = document.getElementById('appointmentsList');
        if (!container) return;

        if (appointments.length === 0) {
            container.innerHTML = this.getEmptyState();
            return;
        }

        const html = appointments.map(appointment => this.generateAppointmentCard(appointment)).join('');
        container.innerHTML = html;
    }

    generateAppointmentCard(appointment) {
        const date = new Date(appointment.appointmentDate);
        const formattedDate = date.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        const statusClass = this.getStatusClass(appointment.status);
        const statusIcon = this.getStatusIcon(appointment.status);
        
        // Format service location
        const locationText = appointment.serviceLocation === 'home-service' ? 
            'Home Service' : 'In-Spa';
        const locationIcon = appointment.serviceLocation === 'home-service' ? 
            'fas fa-home' : 'fas fa-store';

        return `
            <div class="appointment-card" data-id="${appointment._id}">
                <div class="appointment-header">
                    <div class="appointment-time">
                        <i class="fas fa-clock"></i>
                        <span class="time">${appointment.startTime} - ${appointment.endTime}</span>
                        <span class="date">${formattedDate}</span>
                    </div>
                    <div class="appointment-status">
                        <span class="status-badge ${statusClass}">
                            <i class="${statusIcon}"></i>
                            ${appointment.status.toUpperCase()}
                        </span>
                    </div>
                </div>
                
                <div class="appointment-details">
                    <div class="client-info">
                        <h3 class="client-name">
                            <i class="fas fa-user"></i>
                            ${appointment.clientName}
                        </h3>
                        <div class="contact-info">
                            <span class="phone">
                                <i class="fas fa-phone"></i>
                                ${appointment.clientPhone}
                            </span>
                            <span class="email">
                                <i class="fas fa-envelope"></i>
                                ${appointment.clientEmail}
                            </span>
                        </div>
                    </div>
                    
                    <div class="service-info">
                        <div class="service-name">
                            <i class="fas fa-spa"></i>
                            <strong>${appointment.serviceName}</strong>
                            <span class="duration">(${appointment.serviceDuration} min)</span>
                        </div>
                        <div class="service-details">
                            <span class="category">
                                <i class="fas fa-tags"></i>
                                ${appointment.serviceCategory}
                            </span>
                            <span class="price">
                                <i class="fas fa-peso-sign"></i>
                                ₱${appointment.servicePrice.toFixed(2)}
                            </span>
                            <span class="location">
                                <i class="${locationIcon}"></i>
                                ${locationText}
                            </span>
                        </div>
                    </div>
                    
                    <div class="therapist-info">
                        <i class="fas fa-user-md"></i>
                        <span>Therapist: <strong>${appointment.therapistName}</strong></span>
                    </div>
                    
                    ${appointment.specialRequests ? `
                        <div class="special-requests">
                            <i class="fas fa-sticky-note"></i>
                            <span><strong>Special Requests:</strong> ${appointment.specialRequests}</span>
                        </div>
                    ` : ''}
                    
                    ${appointment.serviceLocation === 'home-service' && appointment.homeAddress ? `
                        <div class="home-address">
                            <i class="fas fa-map-marker-alt"></i>
                            <span><strong>Address:</strong> ${this.formatHomeAddress(appointment.homeAddress)}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="appointment-actions">
                    ${this.generateActionButtons(appointment)}
                </div>
            </div>
        `;
    }

    formatHomeAddress(homeAddress) {
        if (typeof homeAddress === 'string') return homeAddress;
        
        const parts = [];
        if (homeAddress.street) parts.push(homeAddress.street);
        if (homeAddress.city) parts.push(homeAddress.city);
        if (homeAddress.province) parts.push(homeAddress.province);
        if (homeAddress.zipCode) parts.push(homeAddress.zipCode);
        
        return parts.join(', ') || 'Address not provided';
    }

    generateActionButtons(appointment) {
        const buttons = [];
        
        if (appointment.status === 'pending') {
            buttons.push(`
                <button class="btn btn-sm btn-success confirm-appointment-btn" data-id="${appointment._id}">
                    <i class="fas fa-check"></i> Confirm
                </button>
                <button class="btn btn-sm btn-danger cancel-appointment-btn" data-id="${appointment._id}">
                    <i class="fas fa-times"></i> Cancel
                </button>
            `);
        } else if (appointment.status === 'confirmed') {
            buttons.push(`
                <button class="btn btn-sm btn-primary complete-appointment-btn" data-id="${appointment._id}">
                    <i class="fas fa-check-circle"></i> Mark Complete
                </button>
                <button class="btn btn-sm btn-warning cancel-appointment-btn" data-id="${appointment._id}">
                    <i class="fas fa-ban"></i> Cancel
                </button>
            `);
        }
        
        return buttons.join('');
    }

    getStatusClass(status) {
        switch (status) {
            case 'pending': return 'status-pending';
            case 'confirmed': return 'status-confirmed';
            case 'completed': return 'status-completed';
            case 'cancelled': return 'status-cancelled';
            case 'in-progress': return 'status-in-progress';
            default: return 'status-default';
        }
    }

    getStatusIcon(status) {
        switch (status) {
            case 'pending': return 'fas fa-clock';
            case 'confirmed': return 'fas fa-check-circle';
            case 'completed': return 'fas fa-check-double';
            case 'cancelled': return 'fas fa-ban';
            case 'in-progress': return 'fas fa-play-circle';
            default: return 'fas fa-circle';
        }
    }

    getEmptyState() {
        const filterText = this.currentFilter === 'all' ? 'appointments' : `${this.currentFilter} appointments`;
        const dateText = this.currentDate && this.currentDate.trim() !== '' ? ` for ${new Date(this.currentDate).toLocaleDateString()}` : '';
        
        return `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-calendar-alt"></i>
                </div>
                <h3>No ${filterText} found</h3>
                <p>There are no ${filterText}${dateText} at the moment.</p>
                <p style="color: #6b7280; font-size: 0.875rem; margin-top: 0.5rem;">
                    ${dateText ? 'Try selecting a different date or remove the date filter to see all appointments.' : 'Appointments from the marketing website will appear here when customers book services.'}
                </p>
                <button class="btn btn-primary" onclick="window.appointmentsManager.loadAppointments()">
                    <i class="fas fa-refresh"></i> Refresh
                </button>
            </div>
        `;
    }

    async confirmAppointment(appointmentId) {
        try {
            console.log('✅ Confirming appointment:', appointmentId);
            
            const userToken = localStorage.getItem('authToken');
            const response = await fetch(`${window.API_CONFIG?.MARKETING_URL || 'http://localhost:3003'}/api/booking/${appointmentId}/confirm`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                console.log('✅ Appointment confirmed successfully');
                this.showNotification('Appointment confirmed successfully', 'success');
                await this.loadAppointments();
                
                // Log to activity system
                if (window.activityLogger) {
                    window.activityLogger.logActivity(
                        'update',
                        'appointment',
                        appointmentId,
                        'Appointment confirmed'
                    );
                }
            } else {
                console.error('Failed to confirm appointment');
                this.showNotification('Failed to confirm appointment', 'error');
            }
        } catch (error) {
            console.error('Error confirming appointment:', error);
            this.showNotification('Error confirming appointment', 'error');
        }
    }

    async cancelAppointment(appointmentId) {
        const reason = prompt('Please enter cancellation reason (optional):');
        
        try {
            console.log('❌ Cancelling appointment:', appointmentId);
            
            const userToken = localStorage.getItem('authToken');
            const response = await fetch(`${window.API_CONFIG?.MARKETING_URL || 'http://localhost:3003'}/api/booking/${appointmentId}/cancel`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    cancellationReason: reason || 'Cancelled by branch',
                    cancelledBy: 'branch'
                })
            });

            if (response.ok) {
                console.log('✅ Appointment cancelled successfully');
                this.showNotification('Appointment cancelled successfully', 'success');
                await this.loadAppointments();
                
                // Log to activity system
                if (window.activityLogger) {
                    window.activityLogger.logActivity(
                        'update',
                        'appointment',
                        appointmentId,
                        `Appointment cancelled: ${reason || 'No reason provided'}`
                    );
                }
            } else {
                console.error('Failed to cancel appointment');
                this.showNotification('Failed to cancel appointment', 'error');
            }
        } catch (error) {
            console.error('Error cancelling appointment:', error);
            this.showNotification('Error cancelling appointment', 'error');
        }
    }

    async completeAppointment(appointmentId) {
        // For now, we'll just mark it as completed
        // In the future, this could integrate with the POS system to create a transaction
        
        try {
            console.log('✅ Completing appointment:', appointmentId);
            
            const userToken = localStorage.getItem('authToken');
            // Note: We might need to create a complete endpoint, for now using the confirm endpoint
            const response = await fetch(`${window.API_CONFIG?.MARKETING_URL || 'http://localhost:3003'}/api/booking/${appointmentId}/confirm`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                // Update local status to completed
                const appointment = this.appointments.find(apt => apt._id === appointmentId);
                if (appointment) {
                    appointment.status = 'completed';
                }
                
                console.log('✅ Appointment marked as completed');
                this.showNotification('Appointment completed successfully', 'success');
                this.filterAndDisplayAppointments();
                
                // Log to activity system
                if (window.activityLogger) {
                    window.activityLogger.logActivity(
                        'update',
                        'appointment',
                        appointmentId,
                        'Appointment marked as completed'
                    );
                }
            } else {
                console.error('Failed to complete appointment');
                this.showNotification('Failed to complete appointment', 'error');
            }
        } catch (error) {
            console.error('Error completing appointment:', error);
            this.showNotification('Error completing appointment', 'error');
        }
    }

    showLoginRequired() {
        const container = document.getElementById('appointmentsList');
        if (container) {
            container.innerHTML = `
                <div class="login-required">
                    <div class="login-icon">
                        <i class="fas fa-sign-in-alt"></i>
                    </div>
                    <h3>Login Required</h3>
                    <p>Please log in to view your appointments and bookings.</p>
                    <button class="btn btn-primary" onclick="window.showLoginModal && window.showLoginModal()">
                        <i class="fas fa-sign-in-alt"></i> Login
                    </button>
                </div>
            `;
        }
    }

    showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            // Fallback
            alert(message);
        }
    }

    startAutoRefresh() {
        // Refresh every 5 minutes
        this.refreshInterval = setInterval(() => {
            this.loadAppointments();
        }, 5 * 60 * 1000);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    destroy() {
        this.stopAutoRefresh();

        // Clear auth check interval
        if (this.authCheckInterval) {
            clearInterval(this.authCheckInterval);
            this.authCheckInterval = null;
        }
    }

    // ===== ADVANCE BOOKINGS METHODS =====

    async loadAdvanceBookings() {
        try {
            console.log('📥 Loading advance bookings from server...');

            // Get current user info
            const userData = localStorage.getItem('currentUser');
            const userToken = localStorage.getItem('authToken');

            console.log('🔍 [ADVANCE-BOOKINGS] Auth check:', {
                hasUserData: !!userData,
                hasToken: !!userToken
            });

            if (!userData || !userToken) {
                console.warn('No user data available for advance bookings');
                this.showAdvanceBookingsPlaceholder();
                return;
            }

            const user = JSON.parse(userData);
            console.log('👤 [ADVANCE-BOOKINGS] User data:', {
                role: user.role,
                type: user.type,
                userId: user.userId,
                id: user.id
            });

            // Fetch advance bookings from the unified backend API
            const response = await fetch(`${window.API_CONFIG?.BASE_URL || 'https://daetspa-backend.onrender.com'}/api/advance-bookings`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.advanceBookings = data.data || [];
                console.log(`✅ Loaded ${this.advanceBookings.length} advance bookings`);

                // Log to activity system
                if (window.activityLogger) {
                    window.activityLogger.logActivity(
                        'sync',
                        'advance-booking',
                        null,
                        `Loaded ${this.advanceBookings.length} advance bookings from server`,
                        { count: this.advanceBookings.length }
                    );
                }
            } else {
                console.error('Failed to load advance bookings:', response.statusText);
                this.advanceBookings = [];
            }
        } catch (error) {
            console.error('Error loading advance bookings:', error);
            this.advanceBookings = [];
        }

        this.displayAdvanceBookings();
    }

    displayAdvanceBookings() {
        const container = document.getElementById('advanceBookingsList');
        if (!container) return;

        // Filter by date if set
        let filteredBookings = this.advanceBookings;
        if (this.currentDate) {
            filteredBookings = this.advanceBookings.filter(booking => {
                const bookingDate = new Date(booking.bookingDateTime).toISOString().split('T')[0];
                return bookingDate === this.currentDate;
            });
        }

        if (filteredBookings.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <h3>No Advance Bookings</h3>
                    <p>There are no advance bookings scheduled at this time.</p>
                </div>
            `;
            return;
        }

        const html = filteredBookings.map(booking => this.generateAdvanceBookingCard(booking)).join('');
        container.innerHTML = html;
    }

    generateAdvanceBookingCard(booking) {
        const bookingDate = new Date(booking.bookingDateTime);
        const formattedDate = bookingDate.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        const formattedTime = bookingDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const statusClass = this.getAdvanceBookingStatusClass(booking.status);
        const statusIcon = this.getAdvanceBookingStatusIcon(booking.status);

        // Format service location
        const locationText = booking.isHomeService ?
            'Home Service' : (booking.roomName || 'In-Spa');
        const locationIcon = booking.isHomeService ?
            'fas fa-home' : 'fas fa-store';

        // Check if booking time is near (within 30 minutes)
        const isNear = (bookingDate - new Date()) <= 30 * 60 * 1000 && bookingDate > new Date();
        const isPast = bookingDate < new Date();

        return `
            <div class="appointment-card ${statusClass}" data-id="${booking._id}" ${isNear ? 'style="border-left: 4px solid #f39c12;"' : ''}>
                <div class="appointment-header">
                    <div class="appointment-time">
                        <i class="fas fa-calendar-alt"></i>
                        <span class="date">${formattedDate}</span>
                        <span class="time">${formattedTime}</span>
                        ${isNear && booking.status === 'scheduled' ? '<span class="badge badge-warning" style="margin-left: 0.5rem;">Starting Soon</span>' : ''}
                        ${isPast && booking.status === 'scheduled' ? '<span class="badge badge-danger" style="margin-left: 0.5rem;">Overdue</span>' : ''}
                    </div>
                    <div class="appointment-status">
                        <span class="status-badge ${statusClass}">
                            <i class="${statusIcon}"></i>
                            ${booking.status.toUpperCase()}
                        </span>
                    </div>
                </div>

                <div class="appointment-details">
                    <div class="client-info">
                        <h3 class="client-name">
                            <i class="fas fa-user"></i>
                            ${booking.clientName}
                        </h3>
                        ${booking.clientPhone || booking.clientEmail ? `
                            <div class="contact-info">
                                ${booking.clientPhone ? `
                                    <span class="phone">
                                        <i class="fas fa-phone"></i>
                                        ${booking.clientPhone}
                                    </span>
                                ` : ''}
                                ${booking.clientEmail ? `
                                    <span class="email">
                                        <i class="fas fa-envelope"></i>
                                        ${booking.clientEmail}
                                    </span>
                                ` : ''}
                            </div>
                        ` : ''}
                    </div>

                    <div class="service-info">
                        <div class="service-name">
                            <i class="fas fa-spa"></i>
                            <strong>${booking.serviceName}</strong>
                            <span class="duration">(${booking.estimatedDuration} min)</span>
                        </div>
                        <div class="service-details">
                            <span class="price">
                                <i class="fas fa-peso-sign"></i>
                                ₱${booking.servicePrice ? booking.servicePrice.toFixed(2) : '0.00'}
                            </span>
                            <span class="location">
                                <i class="${locationIcon}"></i>
                                ${locationText}
                            </span>
                        </div>
                    </div>

                    <div class="therapist-info">
                        <i class="fas fa-user-md"></i>
                        <span>Employee: <strong>${booking.employeeName}</strong></span>
                    </div>

                    ${booking.isHomeService && booking.clientAddress ? `
                        <div class="home-address">
                            <i class="fas fa-map-marker-alt"></i>
                            <span><strong>Service Address:</strong> ${booking.clientAddress}</span>
                        </div>
                    ` : ''}

                    ${booking.specialRequests ? `
                        <div class="special-requests">
                            <i class="fas fa-sticky-note"></i>
                            <span><strong>Special Requests:</strong> ${booking.specialRequests}</span>
                        </div>
                    ` : ''}
                </div>

                <div class="appointment-actions">
                    ${booking.status === 'scheduled' || booking.status === 'confirmed' ? `
                        <button class="btn btn-success btn-sm start-advance-booking-btn" data-id="${booking._id}">
                            <i class="fas fa-play"></i> Start Service
                        </button>
                    ` : ''}
                    ${booking.status === 'scheduled' ? `
                        <button class="btn btn-secondary btn-sm edit-advance-booking-btn" data-id="${booking._id}">
                            <i class="fas fa-edit"></i> Reschedule
                        </button>
                    ` : ''}
                    ${booking.status !== 'cancelled' && booking.status !== 'completed' ? `
                        <button class="btn btn-danger btn-sm cancel-advance-booking-btn" data-id="${booking._id}">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    getAdvanceBookingStatusClass(status) {
        const statusMap = {
            'scheduled': 'status-pending',
            'confirmed': 'status-confirmed',
            'in-progress': 'status-active',
            'completed': 'status-completed',
            'cancelled': 'status-cancelled'
        };
        return statusMap[status] || 'status-pending';
    }

    getAdvanceBookingStatusIcon(status) {
        const iconMap = {
            'scheduled': 'fas fa-clock',
            'confirmed': 'fas fa-check-circle',
            'in-progress': 'fas fa-spinner fa-spin',
            'completed': 'fas fa-check-double',
            'cancelled': 'fas fa-times-circle'
        };
        return iconMap[status] || 'fas fa-question-circle';
    }

    showAdvanceBookingsPlaceholder() {
        const container = document.getElementById('advanceBookingsList');
        if (!container) return;

        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-sign-in-alt"></i>
                <h3>Login Required</h3>
                <p>Please log in to view advance bookings.</p>
            </div>
        `;
    }

    async startAdvanceBooking(bookingId) {
        if (!confirm('Start this advance booking now? This will create an active service.')) {
            return;
        }

        try {
            const booking = this.advanceBookings.find(b => b._id === bookingId || b.id === bookingId);
            if (!booking) {
                showError('Booking not found');
                return;
            }

            // Create active service from booking
            if (window.roomManager) {
                const serviceData = {
                    serviceName: booking.serviceName,
                    clientName: booking.clientName,
                    clientAddress: booking.clientAddress,
                    clientPhone: booking.clientPhone,
                    clientEmail: booking.clientEmail,
                    employeeId: booking.employeeId,
                    employeeName: booking.employeeName,
                    estimatedDuration: booking.estimatedDuration,
                    isHomeService: booking.isHomeService,
                    roomId: booking.roomId,
                    roomName: booking.roomName,
                    status: 'active',
                    startTime: new Date().toISOString()
                };

                // Save active service
                const serviceId = await window.db.add('activeServices', serviceData);
                serviceData.id = serviceId;

                // Update booking status to in-progress
                const userToken = localStorage.getItem('authToken');
                await fetch(`${window.API_CONFIG?.BASE_URL || 'https://daetspa-backend.onrender.com'}/api/advance-bookings/${bookingId}/convert`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${userToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ activeServiceId: serviceId })
                });

                showSuccess('Advance booking started successfully!');
                await this.loadAdvanceBookings();

                // Navigate to rooms page if available
                if (window.app && window.app.showPage) {
                    window.app.showPage('rooms');
                }
            }
        } catch (error) {
            console.error('Error starting advance booking:', error);
            showError('Failed to start booking: ' + error.message);
        }
    }

    async cancelAdvanceBooking(bookingId) {
        const reason = prompt('Please enter cancellation reason:');
        if (!reason) return;

        try {
            const userToken = localStorage.getItem('authToken');
            const response = await fetch(`${window.API_CONFIG?.BASE_URL || 'https://daetspa-backend.onrender.com'}/api/advance-bookings/${bookingId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason })
            });

            if (response.ok) {
                showSuccess('Advance booking cancelled successfully');
                await this.loadAdvanceBookings();
            } else {
                showError('Failed to cancel booking');
            }
        } catch (error) {
            console.error('Error cancelling advance booking:', error);
            showError('Failed to cancel booking: ' + error.message);
        }
    }

    async editAdvanceBooking(bookingId) {
        // Simple reschedule - prompt for new date/time
        const booking = this.advanceBookings.find(b => b._id === bookingId || b.id === bookingId);
        if (!booking) return;

        const currentDateTime = new Date(booking.bookingDateTime);
        const newDateTimeStr = prompt('Enter new date and time (YYYY-MM-DD HH:MM):',
            currentDateTime.toISOString().slice(0, 16).replace('T', ' '));

        if (!newDateTimeStr) return;

        try {
            const newDateTime = new Date(newDateTimeStr.replace(' ', 'T'));
            if (newDateTime <= new Date()) {
                showError('New date must be in the future');
                return;
            }

            const userToken = localStorage.getItem('authToken');
            const response = await fetch(`${window.API_CONFIG?.BASE_URL || 'https://daetspa-backend.onrender.com'}/api/advance-bookings/${bookingId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ bookingDateTime: newDateTime.toISOString() })
            });

            if (response.ok) {
                showSuccess('Booking rescheduled successfully');
                await this.loadAdvanceBookings();
            } else {
                showError('Failed to reschedule booking');
            }
        } catch (error) {
            console.error('Error rescheduling booking:', error);
            showError('Failed to reschedule booking: ' + error.message);
        }
    }
}

// Initialize appointments manager when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if on appointments page
    if (document.getElementById('appointmentsList')) {
        window.appointmentsManager = new AppointmentsManager();
        window.appointmentsManager.init();
        
        console.log('🗓️ Appointments system ready');
    }
});

// Make manager globally available
window.AppointmentsManager = AppointmentsManager;