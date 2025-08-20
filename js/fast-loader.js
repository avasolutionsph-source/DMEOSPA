// Fast Loader for Therapist Portal and Bookings
class FastLoader {
    constructor() {
        this.loadedModules = new Set();
        this.modulePromises = new Map();
        this.criticalDataCache = new Map();
    }

    // Fast initialization for therapist portal
    async fastInitTherapistPortal() {
        const startTime = performance.now();
        
        try {
            // Show loading state immediately
            this.showTherapistLoading();
            
            // Load critical data in parallel
            const [identifiers, todayBookings] = await Promise.allSettled([
                this.getTherapistIdentifiersFast(),
                this.getTodayBookingsFast()
            ]);

            // Display data as soon as available
            if (identifiers.status === 'fulfilled') {
                this.displayTherapistInfo(identifiers.value);
            }
            
            if (todayBookings.status === 'fulfilled') {
                this.displayTodayBookings(todayBookings.value);
            }

            // Background load full portal
            this.loadFullTherapistPortal();
            
            const loadTime = performance.now() - startTime;
            console.log(`⚡ Fast therapist portal loaded in ${loadTime.toFixed(2)}ms`);
            
        } catch (error) {
            console.error('Fast therapist load failed:', error);
            this.fallbackTherapistLoad();
        }
    }

    async getTherapistIdentifiersFast() {
        // Check cache first
        if (this.criticalDataCache.has('therapistIdentifiers')) {
            return this.criticalDataCache.get('therapistIdentifiers');
        }

        // Quick extraction from current session
        const identifiers = { ids: [], name: '', email: '' };
        
        try {
            const currentUser = window.authSystem?.currentUser;
            if (currentUser) {
                if (currentUser.email) identifiers.email = currentUser.email.toLowerCase();
                if (currentUser.employeeName || currentUser.name) {
                    identifiers.name = currentUser.employeeName || currentUser.name;
                }
                if (currentUser.employeeId || currentUser.id) {
                    identifiers.ids.push(String(currentUser.employeeId || currentUser.id));
                }
            }

            const activeEmployee = window.roleManager?.activeEmployee;
            if (activeEmployee) {
                if (activeEmployee.name && !identifiers.name) identifiers.name = activeEmployee.name;
                if (activeEmployee.id) identifiers.ids.push(String(activeEmployee.id));
            }
        } catch (error) {
            console.warn('Error getting therapist identifiers:', error);
        }

        // Cache the result
        this.criticalDataCache.set('therapistIdentifiers', identifiers);
        return identifiers;
    }

    async getTodayBookingsFast() {
        try {
            // Check if bookings are already loaded
            if (window.bookingsManager?.therapistBookings?.length > 0) {
                return window.bookingsManager.therapistBookings;
            }

            // Quick database query for today's bookings
            const today = new Date().toDateString();
            const allBookings = await db.getAll('bookings');
            
            const todayBookings = allBookings.filter(booking => {
                try {
                    const bookingDate = new Date(booking.date || booking.startTime).toDateString();
                    return bookingDate === today;
                } catch {
                    return false;
                }
            });

            return todayBookings;
        } catch (error) {
            console.warn('Error getting today bookings:', error);
            return [];
        }
    }

    showTherapistLoading() {
        const portalPage = document.getElementById('therapist-portal');
        if (portalPage) {
            portalPage.innerHTML = `
                <div class="fast-loading" style="padding: 2rem; text-align: center;">
                    <div class="loading-spinner" style="
                        width: 40px; height: 40px; margin: 0 auto 1rem;
                        border: 3px solid #f3f3f3; border-top: 3px solid #667eea;
                        border-radius: 50%; animation: spin 1s linear infinite;
                    "></div>
                    <h3>Loading Therapist Portal...</h3>
                    <p style="color: #666;">Preparing your personalized dashboard</p>
                </div>
                <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                </style>
            `;
        }
    }

    displayTherapistInfo(identifiers) {
        // Quick display of therapist information
        const portalPage = document.getElementById('therapist-portal');
        if (portalPage) {
            const loadingDiv = portalPage.querySelector('.fast-loading');
            if (loadingDiv) {
                loadingDiv.innerHTML = `
                    <div class="quick-info" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; border-radius: 12px; margin-bottom: 2rem;">
                        <h2>Welcome, ${identifiers.name || 'Therapist'}!</h2>
                        <p>Loading your schedule...</p>
                        <button class="btn btn-light" onclick="openTherapistPortal()" style="margin-top: 1rem;">
                            <i class="fas fa-external-link-alt"></i> Open Full Portal
                        </button>
                    </div>
                `;
            }
        }
    }

    displayTodayBookings(bookings) {
        const portalPage = document.getElementById('therapist-portal');
        if (portalPage) {
            let bookingsHtml = '<div class="today-bookings" style="background: white; padding: 1.5rem; border-radius: 12px; margin-top: 1rem;">';
            bookingsHtml += '<h3><i class="fas fa-calendar-day"></i> Today\'s Schedule</h3>';
            
            if (bookings.length === 0) {
                bookingsHtml += '<p style="color: #666; text-align: center; padding: 1rem;">No appointments today</p>';
            } else {
                bookingsHtml += '<div class="bookings-list">';
                bookings.slice(0, 5).forEach(booking => {
                    const time = this.formatTimeQuick(booking.date || booking.startTime);
                    bookingsHtml += `
                        <div style="display: flex; justify-content: space-between; padding: 0.75rem; border-bottom: 1px solid #f0f0f0;">
                            <div>
                                <strong>${booking.serviceName || 'Service'}</strong>
                                <div style="color: #666; font-size: 0.9rem;">${booking.customerName || 'Customer'}</div>
                            </div>
                            <div style="text-align: right; color: #667eea; font-weight: bold;">
                                ${time}
                            </div>
                        </div>
                    `;
                });
                bookingsHtml += '</div>';
            }
            bookingsHtml += '</div>';
            
            const quickInfo = portalPage.querySelector('.quick-info');
            if (quickInfo) {
                quickInfo.insertAdjacentHTML('afterend', bookingsHtml);
            }
        }
    }

    formatTimeQuick(dateStr) {
        try {
            return new Date(dateStr).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
        } catch {
            return 'Time TBD';
        }
    }

    async loadFullTherapistPortal() {
        // Background load the full portal
        setTimeout(async () => {
            try {
                if (window.loadTherapistPortal) {
                    await window.loadTherapistPortal();
                }
            } catch (error) {
                console.warn('Full portal load failed:', error);
            }
        }, 100);
    }

    fallbackTherapistLoad() {
        // Fallback to original loading method
        if (window.loadTherapistPortal) {
            window.loadTherapistPortal();
        }
    }

    // Fast booking page initialization
    async fastInitBookings() {
        const startTime = performance.now();
        
        try {
            // Check if user is therapist for optimized view
            const isTherapist = this.isTherapistAccount();
            
            if (isTherapist) {
                await this.fastTherapistBookingsLoad();
            } else {
                await this.fastRegularBookingsLoad();
            }
            
            const loadTime = performance.now() - startTime;
            console.log(`⚡ Fast bookings loaded in ${loadTime.toFixed(2)}ms`);
            
        } catch (error) {
            console.error('Fast bookings load failed:', error);
            this.fallbackBookingsLoad();
        }
    }

    async fastTherapistBookingsLoad() {
        // Show therapist-specific booking view quickly
        const bookingsPage = document.getElementById('bookings');
        if (bookingsPage) {
            bookingsPage.innerHTML = `
                <div class="therapist-bookings-fast">
                    <div class="page-header">
                        <h1><i class="fas fa-calendar-check"></i> My Appointments</h1>
                        <p>Your personalized schedule and appointments</p>
                    </div>
                    <div class="loading-content">
                        <div class="quick-stats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin: 2rem 0;">
                            <div class="stat-card" style="background: white; padding: 1rem; border-radius: 8px; text-align: center;">
                                <div class="stat-value" id="fastTodayCount">-</div>
                                <div class="stat-label">Today</div>
                            </div>
                            <div class="stat-card" style="background: white; padding: 1rem; border-radius: 8px; text-align: center;">
                                <div class="stat-value" id="fastUpcomingCount">-</div>
                                <div class="stat-label">Upcoming</div>
                            </div>
                        </div>
                        <div class="bookings-container" id="fastBookingsContainer">
                            <p style="text-align: center; color: #666;">Loading your appointments...</p>
                        </div>
                    </div>
                </div>
            `;
        }

        // Load data quickly
        const [todayBookings, upcomingBookings] = await Promise.allSettled([
            this.getTodayBookingsFast(),
            this.getUpcomingBookingsFast()
        ]);

        // Update stats
        if (todayBookings.status === 'fulfilled') {
            const todayEl = document.getElementById('fastTodayCount');
            if (todayEl) todayEl.textContent = todayBookings.value.length;
        }

        if (upcomingBookings.status === 'fulfilled') {
            const upcomingEl = document.getElementById('fastUpcomingCount');
            if (upcomingEl) upcomingEl.textContent = upcomingBookings.value.length;
        }

        // Display bookings
        this.displayFastBookings([
            ...(todayBookings.value || []),
            ...(upcomingBookings.value || [])
        ]);
    }

    async getUpcomingBookingsFast() {
        try {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toDateString();
            
            const allBookings = await db.getAll('bookings');
            return allBookings.filter(booking => {
                try {
                    const bookingDate = new Date(booking.date || booking.startTime).toDateString();
                    return bookingDate >= tomorrowStr;
                } catch {
                    return false;
                }
            }).slice(0, 10); // Limit for performance
        } catch (error) {
            console.warn('Error getting upcoming bookings:', error);
            return [];
        }
    }

    displayFastBookings(bookings) {
        const container = document.getElementById('fastBookingsContainer');
        if (!container) return;

        if (bookings.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">No appointments found</p>';
            return;
        }

        const bookingsHtml = bookings.map(booking => `
            <div class="fast-booking-item" style="background: white; padding: 1rem; border-radius: 8px; margin: 0.5rem 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${booking.serviceName || 'Service'}</strong>
                        <div style="color: #666; font-size: 0.9rem;">${booking.customerName || 'Customer'}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="color: #667eea; font-weight: bold;">${this.formatTimeQuick(booking.date || booking.startTime)}</div>
                        <div style="font-size: 0.8rem; color: #666;">${this.formatDateQuick(booking.date || booking.startTime)}</div>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = bookingsHtml;
    }

    formatDateQuick(dateStr) {
        try {
            return new Date(dateStr).toLocaleDateString();
        } catch {
            return 'Date TBD';
        }
    }

    async fastRegularBookingsLoad() {
        // Fast load for regular booking management view
        const bookingsPage = document.getElementById('bookings');
        if (bookingsPage) {
            bookingsPage.innerHTML = `
                <div class="bookings-fast">
                    <div class="page-header">
                        <h1><i class="fas fa-calendar-alt"></i> Bookings Management</h1>
                        <button class="btn btn-primary" onclick="window.bookingsManager?.showAddBookingModal()">
                            <i class="fas fa-plus"></i> New Booking
                        </button>
                    </div>
                    <div class="quick-table" style="background: white; border-radius: 8px; overflow: hidden;">
                        <div class="table-header" style="background: #f8f9fa; padding: 1rem; border-bottom: 1px solid #dee2e6;">
                            <div style="display: grid; grid-template-columns: 2fr 2fr 1fr 1fr; gap: 1rem; font-weight: 600;">
                                <div>Customer</div>
                                <div>Service</div>
                                <div>Date</div>
                                <div>Status</div>
                            </div>
                        </div>
                        <div id="fastBookingsTable" style="max-height: 400px; overflow-y: auto;">
                            <div style="padding: 2rem; text-align: center; color: #666;">Loading bookings...</div>
                        </div>
                    </div>
                </div>
            `;
        }

        // Load recent bookings quickly
        const recentBookings = await this.getRecentBookingsFast();
        this.displayFastBookingsTable(recentBookings);
    }

    async getRecentBookingsFast() {
        try {
            const allBookings = await db.getAll('bookings');
            return allBookings
                .sort((a, b) => new Date(b.date || b.startTime) - new Date(a.date || a.startTime))
                .slice(0, 20); // Show first 20 for speed
        } catch (error) {
            console.warn('Error getting recent bookings:', error);
            return [];
        }
    }

    displayFastBookingsTable(bookings) {
        const tableBody = document.getElementById('fastBookingsTable');
        if (!tableBody) return;

        if (bookings.length === 0) {
            tableBody.innerHTML = '<div style="padding: 2rem; text-align: center; color: #666;">No bookings found</div>';
            return;
        }

        const rowsHtml = bookings.map(booking => `
            <div style="display: grid; grid-template-columns: 2fr 2fr 1fr 1fr; gap: 1rem; padding: 1rem; border-bottom: 1px solid #f0f0f0; align-items: center;">
                <div>${booking.customerName || 'N/A'}</div>
                <div>${booking.serviceName || 'N/A'}</div>
                <div>${this.formatDateQuick(booking.date || booking.startTime)}</div>
                <div><span class="status-badge status-${booking.status || 'pending'}">${booking.status || 'pending'}</span></div>
            </div>
        `).join('');

        tableBody.innerHTML = rowsHtml;
    }

    isTherapistAccount() {
        try {
            const currentUser = window.authSystem?.currentUser;
            const activeRole = window.roleManager?.activeEmployee?.role;
            const userRole = currentUser?.role;
            
            return (userRole && userRole.toLowerCase() === 'therapist') || 
                   (activeRole && activeRole.toLowerCase() === 'therapist');
        } catch {
            return false;
        }
    }

    fallbackBookingsLoad() {
        // Fallback to original method
        if (window.loadBookings) {
            window.loadBookings();
        }
    }

    clearCache() {
        this.criticalDataCache.clear();
        this.loadedModules.clear();
        this.modulePromises.clear();
        console.log('🧹 Fast loader cache cleared');
    }
}

// Global fast loader instance
window.fastLoader = new FastLoader();

// Override default loading methods for performance
window.addEventListener('DOMContentLoaded', () => {
    // Override therapist portal loading
    const originalLoadTherapistPortal = window.loadTherapistPortal;
    window.loadTherapistPortal = function() {
        return window.fastLoader.fastInitTherapistPortal();
    };

    // Override bookings loading
    const originalLoadBookings = window.loadBookings;
    window.loadBookings = function() {
        return window.fastLoader.fastInitBookings();
    };
});

// Add fast loader styles
const fastStyles = document.createElement('style');
fastStyles.textContent = `
.status-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
}
.status-confirmed { background: #d4edda; color: #155724; }
.status-pending { background: #fff3cd; color: #856404; }
.status-cancelled { background: #f8d7da; color: #721c24; }
.status-completed { background: #d1ecf1; color: #0c5460; }
`;
document.head.appendChild(fastStyles);
