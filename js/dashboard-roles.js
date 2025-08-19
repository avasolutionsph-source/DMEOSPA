// Role-specific dashboard extensions
class RoleDashboardManager {
    async loadTherapistDashboard() {
        const dashboardElement = document.getElementById('dashboard');
        if (!dashboardElement) return;
        
        dashboardElement.innerHTML = `
            <div class="dashboard-header">
                <h1>Therapist Dashboard</h1>
                <p>Welcome, ${window.roleManager?.activeEmployee?.name || 'Therapist'}</p>
            </div>
            <div class="therapist-quick-actions">
                <div class="stats-grid">
                    <div class="stat-card" onclick="window.app.showPage('bookings')">
                        <div class="stat-icon"><i class="fas fa-calendar-check"></i></div>
                        <div class="stat-value" id="therapistBookingsCount">0</div>
                        <div class="stat-label">My Bookings Today</div>
                    </div>
                    <div class="stat-card" onclick="window.app.showPage('rooms')">
                        <div class="stat-icon"><i class="fas fa-door-open"></i></div>
                        <div class="stat-value" id="therapistRoomsCount">0</div>
                        <div class="stat-label">My Rooms</div>
                    </div>
                    <div class="stat-card" onclick="window.app.showPage('employees'); setTimeout(() => document.querySelector('[data-tab=payrollTab]').click(), 100)">
                        <div class="stat-icon"><i class="fas fa-money-bill"></i></div>
                        <div class="stat-value" id="therapistEarnings">₱0</div>
                        <div class="stat-label">Total Earnings</div>
                    </div>
                    <div class="stat-card" onclick="window.app.showPage('employees'); setTimeout(() => document.querySelector('[data-tab=attendanceTab]').click(), 100)">
                        <div class="stat-icon"><i class="fas fa-clock"></i></div>
                        <div class="stat-value" id="therapistHours">0h</div>
                        <div class="stat-label">Hours This Week</div>
                    </div>
                </div>
            </div>
        `;
        
        await this.loadTherapistStats();
    }

    async loadRiderDashboard() {
        const dashboardElement = document.getElementById('dashboard');
        if (!dashboardElement) return;
        
        dashboardElement.innerHTML = `
            <div class="dashboard-header">
                <h1>Rider Dashboard</h1>
                <p>Welcome, ${window.roleManager?.activeEmployee?.name || 'Rider'}</p>
            </div>
            <div class="rider-schedule">
                <h3>Today's Home Service Schedule</h3>
                <div id="riderBookingsList" class="rider-bookings-list">
                    Loading schedule...
                </div>
            </div>
        `;
        
        await this.loadRiderSchedule();
    }

    async loadTherapistStats() {
        if (!window.roleManager?.activeEmployee) return;
        
        const therapistId = window.roleManager.activeEmployee.id;
        try {
            const bookings = await db.getAll('bookings');
            const today = new Date().toDateString();
            const myBookingsToday = bookings.filter(b => 
                String(b.employeeId) === String(therapistId) && 
                new Date(b.date).toDateString() === today
            );
            
            const rooms = await db.getAll('rooms');
            const myRooms = rooms.filter(r => 
                !r.currentEmployeeId || String(r.currentEmployeeId) === String(therapistId)
            );
            
            const transactions = await db.getByIndex('transactions', 'employeeId', String(therapistId));
            const tips = await db.getByIndex('tips', 'employeeId', String(therapistId));
            const totalEarnings = transactions.reduce((sum, t) => sum + (t.total || 0), 0) * 0.15 + 
                                tips.reduce((sum, t) => sum + (t.amount || 0), 0);
            
            document.getElementById('therapistBookingsCount').textContent = myBookingsToday.length;
            document.getElementById('therapistRoomsCount').textContent = myRooms.length;
            document.getElementById('therapistEarnings').textContent = app.formatCurrency(totalEarnings);
            document.getElementById('therapistHours').textContent = '0h';
        } catch (error) {
            console.error('Failed to load therapist stats:', error);
        }
    }

    async loadRiderSchedule() {
        if (!window.roleManager?.activeEmployee) return;
        
        const riderId = window.roleManager.activeEmployee.id;
        const container = document.getElementById('riderBookingsList');
        if (!container) return;
        
        try {
            const bookings = await db.getAll('bookings');
            const today = new Date().toDateString();
            const homeServiceBookings = bookings.filter(b => 
                b.serviceType === 'home_service' && 
                String(b.employeeId) === String(riderId) &&
                new Date(b.date).toDateString() === today
            ).sort((a, b) => new Date(a.date) - new Date(b.date));
            
            if (homeServiceBookings.length === 0) {
                container.innerHTML = '<div class="no-bookings">No home service bookings today</div>';
                return;
            }
            
            container.innerHTML = homeServiceBookings.map((booking, index) => `
                <div class="rider-booking-card">
                    <div class="booking-sequence">#${index + 1}</div>
                    <div class="booking-details">
                        <div class="booking-time">${new Date(booking.date).toLocaleTimeString()}</div>
                        <div class="booking-customer">${booking.customerName}</div>
                        <div class="booking-service">${booking.serviceName}</div>
                        <div class="booking-address">${booking.address || 'Address not provided'}</div>
                    </div>
                    <div class="booking-status">
                        <span class="badge badge-${booking.status === 'confirmed' ? 'success' : 'warning'}">${booking.status}</span>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Failed to load rider schedule:', error);
            container.innerHTML = '<div class="error">Failed to load schedule</div>';
        }
    }
}

const roleDashboardManager = new RoleDashboardManager();
window.loadTherapistDashboard = async function() { await roleDashboardManager.loadTherapistDashboard(); };
window.loadRiderDashboard = async function() { await roleDashboardManager.loadRiderDashboard(); };
