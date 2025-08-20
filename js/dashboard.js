// Dashboard Management
class DashboardManager {
    constructor() {
        this.salesChart = null;
        this.stats = {
            todaySales: 0,
            todayTransactions: 0,
            lowStockCount: 0,
            monthlyRevenue: 0
        };
    }

    async init() {
        // Check if this is a therapist account and show therapist dashboard
        if (this.isTherapistAccount()) {
            this.showTherapistDashboard();
            return;
        }
        
        // Check if user is on unpaid plan and show registration prompt
        if (window.entitlementsSystem?.currentPlan === 'unpaid') {
            this.showUnpaidDashboard();
            return;
        }

        await this.loadDashboardData();

        const perf = window.performanceProfile || 'balanced';
        if (perf === 'low') {
            // Skip chart rendering in low-performance mode
            const chartContainer = document.querySelector('.chart-container');
            if (chartContainer) {
                chartContainer.innerHTML = `
                    <div style="display:flex;align-items:center;justify-content:center;height:220px;color:var(--gray);font-size:0.95rem;background:var(--light);border-radius:12px;">
                        Sales chart disabled for performance
                    </div>
                `;
            }
        } else {
            // Defer chart initialization to idle time
            const defer = window.requestIdleCallback || ((cb) => setTimeout(cb, 0));
            defer(() => this.initializeChart());
        }
        await this.loadRecentTransactions();
        await this.loadLowStockAlerts();
    }

    isTherapistAccount() {
        try {
            // Check if logged in as employee with therapist role
            const currentUser = window.authSystem?.currentUser;
            const isEmployeeAccount = currentUser?.role && currentUser?.role !== 'owner' && currentUser?.ownerId;
            const isTherapistRole = (currentUser?.role || '').toLowerCase() === 'therapist';
            
            // Also check role manager for role switching
            const activeRole = (window.roleManager?.activeEmployee?.role || '').toLowerCase();
            
            return (isEmployeeAccount && isTherapistRole) || activeRole === 'therapist';
        } catch(_) {
            return false;
        }
    }

    showTherapistDashboard() {
        console.log('👨‍⚕️ Showing therapist dashboard');
        const dashboardElement = document.getElementById('dashboard');
        if (!dashboardElement) return;
        
        // Get therapist info
        const currentUser = window.authSystem?.currentUser;
        const activeEmployee = window.roleManager?.activeEmployee;
        
        const therapistName = activeEmployee?.name || currentUser?.employeeName || currentUser?.name || 'Therapist';
        const workplaceName = currentUser?.businessName || 'Spa';
        
        dashboardElement.innerHTML = `
            <div class="therapist-dashboard">
                <div class="therapist-header">
                    <div class="therapist-welcome">
                        <h1>Welcome, ${therapistName}!</h1>
                        <p>Working at ${workplaceName}</p>
                    </div>
                    <div class="current-time" id="currentTime"></div>
                </div>
                
                <div class="therapist-stats">
                    <div class="stat-card">
                        <div class="stat-icon" style="background: var(--primary-color);">
                            <i class="fas fa-calendar-check"></i>
                        </div>
                        <div class="stat-value" id="todayBookings">0</div>
                        <div class="stat-label">Today's Bookings</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon" style="background: var(--success-color);">
                            <i class="fas fa-clock"></i>
                        </div>
                        <div class="stat-value" id="totalHours">0h</div>
                        <div class="stat-label">Hours Today</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon" style="background: var(--warning-color);">
                            <i class="fas fa-hourglass-half"></i>
                        </div>
                        <div class="stat-value" id="nextBooking">--</div>
                        <div class="stat-label">Next Booking</div>
                    </div>
                </div>
                
                <div class="service-timer-section">
                    <h3>Service Timer</h3>
                    <div class="timer-card">
                        <div class="timer-display" id="timerDisplay">00:00:00</div>
                        <div class="timer-service" id="timerService">No active service</div>
                        <div class="timer-controls">
                            <button class="btn btn-success" id="startTimerBtn" onclick="therapistTimer.start()">
                                <i class="fas fa-play"></i> Start Service
                            </button>
                            <button class="btn btn-danger" id="stopTimerBtn" onclick="therapistTimer.stop()" style="display: none;">
                                <i class="fas fa-stop"></i> Finish Service
                            </button>
                            <button class="btn btn-secondary" id="pauseTimerBtn" onclick="therapistTimer.pause()" style="display: none;">
                                <i class="fas fa-pause"></i> Pause
                            </button>
                        </div>
                        <div class="timer-alerts" id="timerAlerts"></div>
                    </div>
                </div>
                
                <div class="upcoming-bookings">
                    <h3>Today's Schedule</h3>
                    <div class="bookings-preview" id="therapistBookingsPreview">
                        Loading schedule...
                    </div>
                </div>
            </div>
        `;
        
        // Initialize therapist-specific features
        this.updateTherapistTime();
        this.loadTherapistStats();
        this.loadTherapistSchedule();
        
        // Update time every minute
        setInterval(() => this.updateTherapistTime(), 60000);
        
        // Initialize the service timer
        if (!window.therapistTimer) {
            window.therapistTimer = new TherapistTimer();
        }
    }

    updateTherapistTime() {
        const timeElement = document.getElementById('currentTime');
        if (timeElement) {
            const now = new Date();
            timeElement.textContent = now.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }
    }

    async loadTherapistStats() {
        try {
            // Get today's bookings for this therapist
            const bookings = await db.getAll('bookings');
            const today = new Date().toDateString();
            
            // Get therapist identifiers
            const identifiers = await this.getTherapistIdentifiers();
            
            const todayBookings = bookings.filter(b => {
                const bookingDate = new Date(b.date || b.startTime).toDateString();
                const isToday = bookingDate === today;
                const isForThisTherapist = this.isBookingForTherapist(b, identifiers);
                return isToday && isForThisTherapist;
            });
            
            // Calculate stats
            const totalBookings = todayBookings.length;
            const totalMinutes = todayBookings.reduce((sum, b) => sum + (b.duration || 60), 0);
            const totalHours = Math.floor(totalMinutes / 60);
            const remainingMinutes = totalMinutes % 60;
            
            // Find next booking
            const upcoming = bookings
                .filter(b => {
                    const bookingTime = new Date(b.date || b.startTime);
                    return bookingTime > new Date() && this.isBookingForTherapist(b, identifiers);
                })
                .sort((a, b) => new Date(a.date || a.startTime) - new Date(b.date || b.startTime));
            
            // Update UI
            const todayBookingsEl = document.getElementById('todayBookings');
            const totalHoursEl = document.getElementById('totalHours');
            const nextBookingEl = document.getElementById('nextBooking');
            
            if (todayBookingsEl) todayBookingsEl.textContent = totalBookings;
            if (totalHoursEl) totalHoursEl.textContent = `${totalHours}h${remainingMinutes > 0 ? ` ${remainingMinutes}m` : ''}`;
            if (nextBookingEl) {
                if (upcoming.length > 0) {
                    const nextTime = new Date(upcoming[0].date || upcoming[0].startTime);
                    nextBookingEl.textContent = nextTime.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
                } else {
                    nextBookingEl.textContent = 'None';
                }
            }
            
        } catch (error) {
            console.error('Failed to load therapist stats:', error);
        }
    }

    async getTherapistIdentifiers() {
        const identifiers = { ids: [], name: '', email: '' };
        
        // Get from current user (employee account)
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
        } catch(_) {}
        
        // Get from role manager
        try {
            if (window.roleManager?.activeEmployee) {
                const emp = window.roleManager.activeEmployee;
                if (emp.name && !identifiers.name) identifiers.name = emp.name;
                if (emp.id) identifiers.ids.push(String(emp.id));
            }
        } catch(_) {}
        
        return identifiers;
    }

    isBookingForTherapist(booking, identifiers) {
        const bid = String(booking.employeeId || '');
        const bname = (booking.employeeName || '').toLowerCase();
        const bemail = (booking.employeeEmail || '').toLowerCase();
        
        const matchById = identifiers.ids.includes(bid);
        const matchByName = identifiers.name && bname === identifiers.name.toLowerCase();
        const matchByEmail = identifiers.email && bemail === identifiers.email;
        
        return matchById || matchByName || matchByEmail;
    }

    async loadTherapistSchedule() {
        try {
            const bookings = await db.getAll('bookings');
            const today = new Date().toDateString();
            
            const identifiers = await this.getTherapistIdentifiers();
            
            const todaySchedule = bookings
                .filter(b => {
                    const bookingDate = new Date(b.date || b.startTime).toDateString();
                    return bookingDate === today && this.isBookingForTherapist(b, identifiers);
                })
                .sort((a, b) => new Date(a.date || a.startTime) - new Date(b.date || b.startTime));
            
            const previewEl = document.getElementById('therapistBookingsPreview');
            if (previewEl) {
                if (todaySchedule.length === 0) {
                    previewEl.innerHTML = '<p style="color: var(--gray); text-align: center; padding: 1rem;">No bookings scheduled for today</p>';
                } else {
                    previewEl.innerHTML = todaySchedule.map(b => `
                        <div class="booking-preview-item">
                            <div class="booking-time">${new Date(b.date || b.startTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</div>
                            <div class="booking-details">
                                <div class="booking-service">${b.serviceName}</div>
                                <div class="booking-customer">${b.customerName}</div>
                            </div>
                            <div class="booking-duration">${b.duration || 60}min</div>
                        </div>
                    `).join('');
                }
            }
            
        } catch (error) {
            console.error('Failed to load therapist schedule:', error);
        }
    }

    showUnpaidDashboard() {
        const dashboardElement = document.getElementById('dashboard');
        if (dashboardElement) {
            dashboardElement.innerHTML = `
                <div style="padding: 2rem; text-align: center; max-width: 800px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 3rem 2rem; border-radius: 16px; margin-bottom: 2rem;">
                        <i class="fas fa-chart-line" style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.9;"></i>
                        <h1 style="margin-bottom: 1rem; font-size: 2.5rem;">Welcome to Ava Solutions</h1>
                        <p style="font-size: 1.2rem; opacity: 0.9; margin-bottom: 2rem;">
                            Your complete business management solution for spas, salons, and service businesses
                        </p>
                        <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                            <a href="https://ava-solutions-marketing.netlify.app/register" target="_blank" 
                               class="btn btn-light btn-lg" style="text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem;">
                                <i class="fas fa-user-plus"></i> Register Your Business
                            </a>
                            <button onclick="showLoginModalDirect()" class="btn btn-outline-light btn-lg">
                                <i class="fas fa-sign-in-alt"></i> Login
                            </button>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 2rem; margin-bottom: 3rem;">
                        <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-left: 4px solid #10b981;">
                            <i class="fas fa-cash-register" style="font-size: 2.5rem; color: #10b981; margin-bottom: 1rem;"></i>
                            <h3 style="margin-bottom: 0.5rem;">Point of Sale</h3>
                            <p style="color: #6b7280; margin-bottom: 1rem;">Process transactions, manage cart, track sales with employee assignment and commission tracking.</p>
                            <span style="background: #dcfce7; color: #166534; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.875rem;">
                                <i class="fas fa-lock"></i> Registration Required
                            </span>
                        </div>
                        
                        <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-left: 4px solid #f59e0b;">
                            <i class="fas fa-boxes" style="font-size: 2.5rem; color: #f59e0b; margin-bottom: 1rem;"></i>
                            <h3 style="margin-bottom: 0.5rem;">Inventory Management</h3>
                            <p style="color: #6b7280; margin-bottom: 1rem;">Track stock levels, manage suppliers, monitor expiry dates, and automate reorder alerts.</p>
                            <span style="background: #fef3c7; color: #92400e; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.875rem;">
                                <i class="fas fa-lock"></i> Registration Required
                            </span>
                        </div>
                        
                        <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-left: 4px solid #8b5cf6;">
                            <i class="fas fa-users" style="font-size: 2.5rem; color: #8b5cf6; margin-bottom: 1rem;"></i>
                            <h3 style="margin-bottom: 0.5rem;">Employee & Payroll</h3>
                            <p style="color: #6b7280; margin-bottom: 1rem;">Manage staff, track attendance, process payroll with deductions, and monitor performance.</p>
                            <span style="background: #ede9fe; color: #6b21a8; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.875rem;">
                                <i class="fas fa-lock"></i> Registration Required
                            </span>
                        </div>
                        
                        <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-left: 4px solid #ef4444;">
                            <i class="fas fa-door-open" style="font-size: 2.5rem; color: #ef4444; margin-bottom: 1rem;"></i>
                            <h3 style="margin-bottom: 0.5rem;">Room Management</h3>
                            <p style="color: #6b7280; margin-bottom: 1rem;">Track massage rooms, session timers, and automatically assign rooms to services.</p>
                            <span style="background: #fee2e2; color: #991b1b; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.875rem;">
                                <i class="fas fa-lock"></i> Registration Required
                            </span>
                        </div>
                        
                        <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-left: 4px solid #06b6d4;">
                            <i class="fas fa-calendar-alt" style="font-size: 2.5rem; color: #06b6d4; margin-bottom: 1rem;"></i>
                            <h3 style="margin-bottom: 0.5rem;">Booking System</h3>
                            <p style="color: #6b7280; margin-bottom: 1rem;">Manage appointments, track cancellations, and analyze booking patterns.</p>
                            <span style="background: #cffafe; color: #155e75; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.875rem;">
                                <i class="fas fa-lock"></i> Registration Required
                            </span>
                        </div>
                        
                        <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-left: 4px solid #84cc16;">
                            <i class="fas fa-robot" style="font-size: 2.5rem; color: #84cc16; margin-bottom: 1rem;"></i>
                            <h3 style="margin-bottom: 0.5rem;">AI Assistant</h3>
                            <p style="color: #6b7280; margin-bottom: 1rem;">Get instant help, business insights, and automated support with our AI chatbot.</p>
                            <span style="background: #ecfccb; color: #365314; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.875rem;">
                                <i class="fas fa-lock"></i> Registration Required
                            </span>
                        </div>
                    </div>
                    
                    <div style="background: #f9fafb; padding: 2rem; border-radius: 12px; border: 2px dashed #d1d5db;">
                        <h3 style="color: #374151; margin-bottom: 1rem;">
                            <i class="fas fa-info-circle" style="color: #6366f1;"></i>
                            Why Choose Ava Solutions?
                        </h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; text-align: left;">
                            <div>
                                <i class="fas fa-shield-alt" style="color: #10b981; margin-right: 0.5rem;"></i>
                                <strong>Secure & Reliable</strong>
                                <p style="font-size: 0.9rem; color: #6b7280; margin: 0;">Your data is encrypted and backed up</p>
                            </div>
                            <div>
                                <i class="fas fa-mobile-alt" style="color: #f59e0b; margin-right: 0.5rem;"></i>
                                <strong>Mobile Optimized</strong>
                                <p style="font-size: 0.9rem; color: #6b7280; margin: 0;">Works on any device, anywhere</p>
                            </div>
                            <div>
                                <i class="fas fa-wifi" style="color: #8b5cf6; margin-right: 0.5rem;"></i>
                                <strong>Offline Capable</strong>
                                <p style="font-size: 0.9rem; color: #6b7280; margin: 0;">Continue working without internet</p>
                            </div>
                            <div>
                                <i class="fas fa-headset" style="color: #ef4444; margin-right: 0.5rem;"></i>
                                <strong>24/7 Support</strong>
                                <p style="font-size: 0.9rem; color: #6b7280; margin: 0;">Get help when you need it</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    async loadDashboardData() {
        try {
            // Get local data first (for offline capability)
            const todayTransactions = await db.getTodayTransactions();
            this.stats.todayTransactions = todayTransactions.length;
            this.stats.todaySales = todayTransactions.reduce((sum, t) => sum + t.total, 0);

            // Get monthly revenue
            this.stats.monthlyRevenue = await db.getMonthlyRevenue();

            // Get low stock count
            const lowStockItems = await db.getLowStockItems();
            this.stats.lowStockCount = lowStockItems.length;

            // Try to get synced data from Marketing Website (if online and logged in)
            await this.loadSyncedData();

            // Update UI
            this.updateStatsDisplay();
            
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    }

    async loadSyncedData() {
        try {
            const token = localStorage.getItem('userToken');
            if (!token) {
                console.log('📊 No token available, using local data only');
                return;
            }

            // Hardcoded API URL for production deployment
            const apiUrl = 'https://ava-marketing-api.onrender.com';

            console.log('📊 Fetching synced business stats from:', `${apiUrl}/api/business/stats`);

            const response = await fetch(`${apiUrl}/api/business/stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const syncedStats = await response.json();
                console.log('📊 Synced stats received:', syncedStats);

                // Use synced data if available (overrides local data)
                if (syncedStats.totalSales > 0) {
                    this.stats.todaySales = syncedStats.totalSales;
                    console.log('💰 Using synced sales total:', syncedStats.totalSales);
                }
                if (syncedStats.totalTransactions > 0) {
                    this.stats.todayTransactions = syncedStats.totalTransactions;
                    console.log('📋 Using synced transaction count:', syncedStats.totalTransactions);
                }
                if (syncedStats.totalSales > 0) {
                    this.stats.monthlyRevenue = syncedStats.totalSales; // Use total sales as monthly revenue
                    console.log('📈 Using synced monthly revenue:', syncedStats.totalSales);
                }
            } else {
                console.log('📊 Could not fetch synced stats, using local data');
            }
        } catch (error) {
            console.log('📊 Error fetching synced data, using local data:', error.message);
        }
    }

    updateStatsDisplay() {
        // Update stat cards
        document.getElementById('todaySales').textContent = app.formatCurrency(this.stats.todaySales);
        document.getElementById('todayTransactions').textContent = this.stats.todayTransactions;
        document.getElementById('lowStockCount').textContent = this.stats.lowStockCount;
        document.getElementById('monthlyRevenue').textContent = app.formatCurrency(this.stats.monthlyRevenue);

        // Calculate and display percentage changes
        this.calculateGrowth();
    }

    async calculateGrowth() {
        try {
            // Get yesterday's data for comparison
            const allTransactions = await db.getAll('transactions');
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toDateString();
            
            const yesterdayTransactions = allTransactions.filter(t => 
                new Date(t.date).toDateString() === yesterdayStr
            );
            
            const yesterdaySales = yesterdayTransactions.reduce((sum, t) => sum + t.total, 0);
            
            if (yesterdaySales > 0) {
                const growth = ((this.stats.todaySales - yesterdaySales) / yesterdaySales) * 100;
                const growthElement = document.querySelector('#todaySales').nextElementSibling;
                if (growthElement) {
                    growthElement.textContent = `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%`;
                    growthElement.className = `stat-change ${growth >= 0 ? 'positive' : 'negative'}`;
                }
            }

            // Calculate monthly growth
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            const lastMonthTransactions = allTransactions.filter(t => {
                const date = new Date(t.date);
                return date.getMonth() === lastMonth.getMonth() && 
                       date.getFullYear() === lastMonth.getFullYear();
            });
            
            const lastMonthRevenue = lastMonthTransactions.reduce((sum, t) => sum + t.total, 0);
            
            if (lastMonthRevenue > 0) {
                const monthlyGrowth = ((this.stats.monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
                const monthlyGrowthElement = document.querySelector('#monthlyRevenue').nextElementSibling;
                if (monthlyGrowthElement) {
                    monthlyGrowthElement.textContent = `${monthlyGrowth > 0 ? '+' : ''}${monthlyGrowth.toFixed(1)}%`;
                    monthlyGrowthElement.className = `stat-change ${monthlyGrowth >= 0 ? 'positive' : 'negative'}`;
                }
            }
        } catch (error) {
            console.error('Failed to calculate growth:', error);
        }
    }

    async initializeChart() {
        const ctx = document.getElementById('salesChart');
        if (!ctx) return;

        // If Chart.js hasn't been loaded yet (low perf), load it on demand now
        if (typeof Chart === 'undefined' && typeof window.deferChartLoad === 'function') {
            await new Promise((resolve) => { window.deferChartLoad(); setTimeout(resolve, 300); });
        }

        // Prepare data for last 7 days
        const salesData = await this.getSalesDataForChart();

        // Destroy existing chart if it exists
        if (this.salesChart) {
            this.salesChart.destroy();
        }

        const perf = window.performanceProfile || 'balanced';
        const tension = perf === 'low' ? 0.1 : 0.3;
        const animation = perf === 'low' ? false : { duration: perf === 'balanced' ? 300 : 600 };

        this.salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: salesData.labels,
                datasets: [{
                    label: 'Daily Sales',
                    data: salesData.values,
                    borderColor: 'rgb(99, 102, 241)',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    tension: tension,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                aspectRatio: 2, // Make chart wider than tall
                animation: animation,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'Sales: ' + app.formatCurrency(context.parsed.y);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₱' + value;
                            }
                        }
                    }
                }
            }
        });
    }

    async getSalesDataForChart() {
        const transactions = await db.getAll('transactions');
        const last7Days = [];
        const salesByDay = {};

        // Initialize last 7 days
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            last7Days.push(dateStr);
            salesByDay[dateStr] = 0;
        }

        // Aggregate sales by day
        transactions.forEach(t => {
            const dateStr = new Date(t.date).toISOString().split('T')[0];
            if (salesByDay.hasOwnProperty(dateStr)) {
                salesByDay[dateStr] += t.total;
            }
        });

        return {
            labels: last7Days.map(date => {
                const d = new Date(date);
                return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            }),
            values: last7Days.map(date => salesByDay[date])
        };
    }

    async loadRecentTransactions() {
        try {
            const transactions = await db.getAll('transactions');
            const recentTransactions = transactions
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 5);

            const container = document.getElementById('recentTransactionsList');
            if (!container) return;

            if (recentTransactions.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: var(--gray);">No transactions yet</p>';
                return;
            }

            container.innerHTML = recentTransactions.map(t => `
                <div style="padding: 0.75rem; border-bottom: 1px solid var(--light);">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                        <strong>Transaction #${t.id}</strong>
                        <strong>${app.formatCurrency(t.total)}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.875rem; color: var(--gray);">
                        <span>${app.formatDateTime(t.date)}</span>
                        <span>${t.items ? t.items.length : 0} items</span>
                    </div>
                    ${t.employeeId ? `<div style="font-size: 0.75rem; color: var(--gray); margin-top: 0.25rem;">Employee #${t.employeeId}</div>` : ''}
                </div>
            `).join('');
        } catch (error) {
            console.error('Failed to load recent transactions:', error);
        }
    }

    async loadLowStockAlerts() {
        try {
            const lowStockItems = await db.getLowStockItems();
            const container = document.getElementById('lowStockList');
            if (!container) return;

            if (lowStockItems.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: var(--gray);">All items are well stocked!</p>';
                return;
            }

            container.innerHTML = lowStockItems.map(item => {
                const stockPercentage = (item.currentStock / item.minStock) * 100;
                const isOutOfStock = item.currentStock === 0;
                
                return `
                    <div style="padding: 0.75rem; background: ${isOutOfStock ? 'rgba(239, 68, 68, 0.05)' : 'rgba(245, 158, 11, 0.05)'}; border-radius: 8px; margin-bottom: 0.75rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong>${item.name}</strong>
                                <div style="font-size: 0.875rem; color: var(--gray); margin-top: 0.25rem;">
                                    SKU: ${item.sku}
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 1.25rem; font-weight: 700; color: ${isOutOfStock ? 'var(--danger-color)' : 'var(--warning-color)'};">
                                    ${item.currentStock}
                                </div>
                                <div style="font-size: 0.75rem; color: var(--gray);">
                                    Min: ${item.minStock}
                                </div>
                            </div>
                        </div>
                        ${isOutOfStock ? 
                            '<div style="margin-top: 0.5rem; padding: 0.25rem 0.5rem; background: var(--danger-color); color: white; border-radius: 4px; font-size: 0.75rem; text-align: center;">OUT OF STOCK</div>' :
                            `<div style="margin-top: 0.5rem; height: 4px; background: var(--light); border-radius: 2px;">
                                <div style="height: 100%; width: ${Math.min(stockPercentage, 100)}%; background: var(--warning-color); border-radius: 2px;"></div>
                            </div>`
                        }
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('Failed to load low stock alerts:', error);
        }
    }

    // Analytics methods
    async getBestSellingProducts() {
        const transactions = await db.getAll('transactions');
        const productSales = {};

        transactions.forEach(t => {
            if (t.items) {
                t.items.forEach(item => {
                    if (!productSales[item.name]) {
                        productSales[item.name] = {
                            quantity: 0,
                            revenue: 0
                        };
                    }
                    productSales[item.name].quantity += item.quantity;
                    productSales[item.name].revenue += item.price * item.quantity;
                });
            }
        });

        return Object.entries(productSales)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
    }

    async getRevenueByCategory() {
        const transactions = await db.getAll('transactions');
        const products = await db.getAll('products');
        const inventory = await db.getAll('inventory');
        
        const categoryRevenue = {};

        transactions.forEach(t => {
            if (t.items) {
                t.items.forEach(item => {
                    // Find the category for this item
                    let category = 'Uncategorized';
                    const product = products.find(p => p.id === item.id);
                    const inventoryItem = inventory.find(i => i.id === item.id);
                    
                    if (product && product.category) {
                        category = product.category;
                    } else if (inventoryItem && inventoryItem.category) {
                        category = inventoryItem.category;
                    }

                    if (!categoryRevenue[category]) {
                        categoryRevenue[category] = 0;
                    }
                    categoryRevenue[category] += item.price * item.quantity;
                });
            }
        });

        return categoryRevenue;
    }

    async getPeakHours() {
        const transactions = await db.getAll('transactions');
        const hourlyData = {};

        transactions.forEach(t => {
            const hour = new Date(t.date).getHours();
            if (!hourlyData[hour]) {
                hourlyData[hour] = {
                    transactions: 0,
                    revenue: 0
                };
            }
            hourlyData[hour].transactions++;
            hourlyData[hour].revenue += t.total;
        });

        return hourlyData;
    }

    refresh() {
        this.init();
    }
}

// Initialize dashboard manager
const dashboardManager = new DashboardManager();

// Load dashboard when page is shown
// Therapist Service Timer Class
class TherapistTimer {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.startTime = null;
        this.pausedTime = 0;
        this.serviceDuration = 60; // Default 60 minutes
        this.interval = null;
        this.warningAlerted = false;
        this.completionAlerted = false;
    }

    start() {
        // Show modal to select service and duration
        this.showServiceSelectionModal();
    }

    showServiceSelectionModal() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-play-circle"></i> Start Service Timer</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Service</label>
                        <select id="timerServiceSelect" class="form-input">
                            <option value="">Select service...</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Duration (minutes)</label>
                        <input type="number" id="timerDurationInput" class="form-input" value="60" min="1" max="300">
                    </div>
                    <div class="form-group">
                        <label>Customer (optional)</label>
                        <input type="text" id="timerCustomerInput" class="form-input" placeholder="Customer name">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button class="btn btn-success" id="confirmStartTimer">Start Timer</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Load services
        this.loadServicesForTimer(modal);
        
        // Handle start
        modal.querySelector('#confirmStartTimer').onclick = () => {
            const serviceSelect = modal.querySelector('#timerServiceSelect');
            const durationInput = modal.querySelector('#timerDurationInput');
            const customerInput = modal.querySelector('#timerCustomerInput');
            
            const serviceName = serviceSelect.options[serviceSelect.selectedIndex]?.text || 'Service';
            const duration = parseInt(durationInput.value) || 60;
            const customer = customerInput.value || '';
            
            this.startTimer(serviceName, duration, customer);
            modal.remove();
        };
    }

    async loadServicesForTimer(modal) {
        try {
            const products = await db.getAll('products');
            const services = products.filter(p => p.category === 'service' || p.category === 'massage');
            
            const select = modal.querySelector('#timerServiceSelect');
            select.innerHTML = '<option value="">Select service...</option>' + 
                services.map(s => `<option value="${s.id}" data-duration="${s.duration || 60}">${s.name}</option>`).join('');
            
            // Auto-fill duration when service is selected
            select.addEventListener('change', () => {
                const selectedOption = select.options[select.selectedIndex];
                if (selectedOption && selectedOption.dataset.duration) {
                    modal.querySelector('#timerDurationInput').value = selectedOption.dataset.duration;
                }
            });
            
        } catch (error) {
            console.error('Failed to load services for timer:', error);
        }
    }

    startTimer(serviceName, duration, customer = '') {
        this.serviceDuration = duration;
        this.startTime = new Date();
        this.pausedTime = 0;
        this.isRunning = true;
        this.isPaused = false;
        this.warningAlerted = false;
        this.completionAlerted = false;
        
        // Update UI
        const serviceEl = document.getElementById('timerService');
        const startBtn = document.getElementById('startTimerBtn');
        const stopBtn = document.getElementById('stopTimerBtn');
        const pauseBtn = document.getElementById('pauseTimerBtn');
        
        if (serviceEl) serviceEl.textContent = `${serviceName}${customer ? ` - ${customer}` : ''} (${duration} min)`;
        if (startBtn) startBtn.style.display = 'none';
        if (stopBtn) stopBtn.style.display = 'inline-block';
        if (pauseBtn) pauseBtn.style.display = 'inline-block';
        
        // Start the timer interval
        this.interval = setInterval(() => this.updateTimer(), 1000);
        
        console.log(`⏰ Timer started: ${serviceName} for ${duration} minutes`);
    }

    updateTimer() {
        if (!this.isRunning || this.isPaused) return;
        
        const now = new Date();
        const elapsed = Math.floor((now - this.startTime - this.pausedTime) / 1000);
        const totalSeconds = this.serviceDuration * 60;
        const remaining = Math.max(0, totalSeconds - elapsed);
        
        // Update display
        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60);
        const seconds = elapsed % 60;
        
        const display = document.getElementById('timerDisplay');
        if (display) {
            display.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            // Change color based on time remaining
            if (remaining <= 300 && !this.warningAlerted) {
                // 5 minutes warning
                display.style.color = 'var(--warning-color)';
                this.showAlert('⚠️ 5 minutes remaining!', 'warning');
                this.warningAlerted = true;
            }
            
            if (remaining <= 0 && !this.completionAlerted) {
                // Time's up
                display.style.color = 'var(--danger-color)';
                this.showAlert('🔔 Service time completed!', 'danger');
                this.completionAlerted = true;
            }
        }
    }

    showAlert(message, type) {
        // Visual alert
        const alertsEl = document.getElementById('timerAlerts');
        if (alertsEl) {
            const alert = document.createElement('div');
            alert.className = `alert alert-${type}`;
            alert.style.cssText = 'margin: 0.5rem 0; padding: 0.75rem; border-radius: 8px; font-weight: 500;';
            alert.innerHTML = `<i class="fas fa-bell"></i> ${message}`;
            alertsEl.appendChild(alert);
            
            // Remove alert after 5 seconds
            setTimeout(() => alert.remove(), 5000);
        }
        
        // Audio alert (simple beep)
        try {
            // Create a simple beep sound
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800; // 800 Hz tone
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch(_) {
            // Fallback: try to play a simple audio file or use system beep
            console.log('🔔 BEEP:', message);
        }
        
        // Show notification
        if (window.showNotification) {
            window.showNotification(message, type);
        }
    }

    pause() {
        if (!this.isRunning) return;
        
        this.isPaused = !this.isPaused;
        const pauseBtn = document.getElementById('pauseTimerBtn');
        
        if (this.isPaused) {
            this.pauseStartTime = new Date();
            if (pauseBtn) {
                pauseBtn.innerHTML = '<i class="fas fa-play"></i> Resume';
            }
            console.log('⏸️ Timer paused');
        } else {
            this.pausedTime += new Date() - this.pauseStartTime;
            if (pauseBtn) {
                pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
            }
            console.log('▶️ Timer resumed');
        }
    }

    stop() {
        this.isRunning = false;
        this.isPaused = false;
        
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        
        // Reset UI
        const display = document.getElementById('timerDisplay');
        const serviceEl = document.getElementById('timerService');
        const startBtn = document.getElementById('startTimerBtn');
        const stopBtn = document.getElementById('stopTimerBtn');
        const pauseBtn = document.getElementById('pauseTimerBtn');
        const alertsEl = document.getElementById('timerAlerts');
        
        if (display) {
            display.textContent = '00:00:00';
            display.style.color = '';
        }
        if (serviceEl) serviceEl.textContent = 'No active service';
        if (startBtn) startBtn.style.display = 'inline-block';
        if (stopBtn) stopBtn.style.display = 'none';
        if (pauseBtn) pauseBtn.style.display = 'none';
        if (alertsEl) alertsEl.innerHTML = '';
        
        console.log('⏹️ Timer stopped');
        
        if (window.showNotification) {
            window.showNotification('Service completed!', 'success');
        }
    }
}

window.loadDashboard = async function() {
    await dashboardManager.init();
};

// Update low stock alerts function for other modules
window.updateLowStockAlerts = async function() {
    await dashboardManager.loadLowStockAlerts();
    const lowStockItems = await db.getLowStockItems();
    document.getElementById('lowStockCount').textContent = lowStockItems.length;
};
