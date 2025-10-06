// Enhanced Dashboard Management System
// Comprehensive Business Intelligence Dashboard for Spa Management

class EnhancedDashboardManager {
    constructor() {
        this.revenueChart = null;
        this.updateInterval = null;
        this.isInitialized = false;
        this.lastDataHash = null;
        this.currentChartPeriod = 'week'; // Default period
        
        // Enhanced statistics tracking
        this.stats = {
            // Financial Performance
            todayRevenue: 0,
            weeklyRevenue: 0,
            monthlyRevenue: 0,
            avgTransaction: 0,
            cardPayments: 0,
            cashPayments: 0,
            giftCertRevenue: 0,
            giftCertCount: 0,
            
            // Operations
            todayAppointments: 0,
            pendingAppointments: 0,
            confirmedAppointments: 0,
            completedAppointments: 0,
            roomUtilization: 0,
            totalRooms: 0,
            occupiedRooms: 0,
            topService: '-',
            topServiceCount: 0,
            newCustomers: 0,
            returningCustomers: 0,
            
            // Staff & Attendance
            totalStaff: 0,
            staffPresent: 0,
            attendanceRate: 0,
            overtimeHours: 0,
            attendanceIssues: 0,
            lateArrivals: 0,
            earlyDepartures: 0,
            
            // Inventory & Alerts
            criticalStock: 0,
            outOfStock: 0,
            totalInventory: 0,
            inventoryValue: 0,
            todayUsage: 0,
            
            // Transactions & Activity
            todayTransactions: 0,
            totalTransactions: 0
        };
        
        // Performance tracking
        this.lastUpdate = null;
        this.updateFrequency = 240000; // 4 minute updates (reduced frequency to preserve POS changes)
        this.performanceMetrics = {
            initStartTime: null,
            initEndTime: null,
            dataLoadTime: null,
            chartRenderTime: null
        };
        
        // Listen for transaction completion events
        this.setupTransactionListener();
    }

    // Helper function to safely get data from database stores
    async safeGetAll(storeName) {
        try {
            // Ensure database is initialized
            if (!window.db || !window.db.db) {
                await window.ensureDBInit();
            }
            return await window.db.getAll(storeName) || [];
        } catch (error) {
            console.warn(`⚠️ Store '${storeName}' not available yet:`, error.message);
            return [];
        }
    }

    async init() {
        this.performanceMetrics.initStartTime = performance.now();
        
        try {
            // Ensure database is ready
            if (!window.db) {
                await window.ensureDBInit();
            }
            
            // Initialize all dashboard sections
            await this.loadAllDashboardData();
            this.setupEventListeners();
            this.initializeCharts();
            this.setupActivityTabs();
            this.setupPageVisibilityHandler();
            this.setupRefreshTimer();
            
            this.isInitialized = true;
            this.performanceMetrics.initEndTime = performance.now();
            this.logPerformanceMetrics();
            
        } catch (error) {
            console.error('❌ Failed to initialize Enhanced Dashboard Manager:', error);
            this.showErrorState();
        }
    }

    async loadAllDashboardData() {
        const dataLoadStart = performance.now();
        
        try {
            // Load all data in parallel for better performance
            await Promise.all([
                this.loadFinancialPerformance(),
                this.loadOperationsData(),
                this.loadStaffAttendanceData(),
                this.loadInventoryData(),
                this.loadActivityData()
            ]);
            
            // Update all UI elements
            this.updateAllStatsDisplay();
            this.updateBusinessIntelligence();
            
            this.performanceMetrics.dataLoadTime = performance.now() - dataLoadStart;
            
        } catch (error) {
            console.error('❌ Error loading dashboard data:', error);
        }
    }

    // ========================================
    // FINANCIAL PERFORMANCE SECTION
    // ========================================
    
    async loadFinancialPerformance() {
        try {
            
            // Get authentication token
            const token = localStorage.getItem('authToken') || '';
            
            // PRIORITY FIX: Get stats from backend business API for accurate data
            // SECURITY: Only make API call if we have a valid user token
            if (!token) {
                // Continue to fallback code instead of throwing error
            } else {
                try {
                    const backendStatsResponse = await fetch(window.API_CONFIG.buildUrl('/api/business/stats'), {
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (backendStatsResponse.ok) {
                    const backendStats = await backendStatsResponse.json();
                    
                    // Use backend calculated stats instead of local calculations
                    this.stats.todayRevenue = backendStats.todaySales || 0;
                    this.stats.weeklyRevenue = backendStats.todaySales || 0; // Backend doesn't have weekly, use today
                    this.stats.monthlyRevenue = backendStats.monthSales || 0;
                    this.stats.todayTransactions = backendStats.todayTransactions || 0;
                    this.stats.avgTransaction = backendStats.totalTransactions > 0 
                        ? backendStats.totalSales / backendStats.totalTransactions 
                        : 0;
                    
                    // Update the display with backend data
                    this.updateAllStatsDisplay();
                    return; // Skip local calculations
                }
                } catch (backendError) {
                }
            }
            
            // FALLBACK: Get recent transactions from MongoDB API instead of IndexedDB
            let allTransactions = [];
            try {
                // Use HybridAPIClient for offline support
                const result = await window.HybridAPIClient.getTransactions();
                
                if (result.success) {
                    // MEMORY OPTIMIZATION: Only keep last 30 days of transactions
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    
                    allTransactions = (result.data || []).filter(t => {
                        const transactionDate = new Date(t.createdAt || t.date);
                        return transactionDate >= thirtyDaysAgo;
                    });
                    
                } else {
                    console.error('❌ [DASHBOARD] Failed to load transactions:', result.error);
                    allTransactions = [];
                }
            } catch (error) {
                console.error('❌ [DASHBOARD] Error fetching transactions:', error);
                allTransactions = [];
            }
            
            // Today's data
            const today = new Date().toISOString().split('T')[0];
            const todayTransactions = allTransactions.filter(t => 
                new Date(t.createdAt || t.date).toISOString().split('T')[0] === today
            );
            
            this.stats.todayRevenue = todayTransactions.reduce((sum, t) => sum + (t.total || 0), 0);
            this.stats.todayTransactions = todayTransactions.length;
            
            // Weekly data (last 7 days)
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const weeklyTransactions = allTransactions.filter(t => 
                new Date(t.createdAt || t.date) >= weekAgo
            );
            this.stats.weeklyRevenue = weeklyTransactions.reduce((sum, t) => sum + (t.total || 0), 0);
            
            // Monthly data (current month)
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            const monthlyTransactions = allTransactions.filter(t => {
                const tDate = new Date(t.createdAt || t.date);
                return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
            });
            this.stats.monthlyRevenue = monthlyTransactions.reduce((sum, t) => sum + (t.total || 0), 0);
            
            // Average transaction
            this.stats.avgTransaction = this.stats.todayTransactions > 0 
                ? this.stats.todayRevenue / this.stats.todayTransactions 
                : 0;
            
            // Payment method breakdown
            const cardPayments = todayTransactions.filter(t => t.paymentMethod === 'card');
            this.stats.cardPayments = cardPayments.reduce((sum, t) => sum + (t.total || 0), 0);
            this.stats.cashPayments = this.stats.todayRevenue - this.stats.cardPayments;
            
            // Gift certificates
            const giftCerts = await this.safeGetAll('giftCertificates');
            const activeGiftCerts = giftCerts.filter(gc => gc.status === 'active');
            this.stats.giftCertRevenue = activeGiftCerts.reduce((sum, gc) => sum + (gc.amount || 0), 0);
            this.stats.giftCertCount = activeGiftCerts.length;
            
            this.updateAllStatsDisplay(); // Update UI with calculated stats
            
        } catch (error) {
            console.error('❌ Error loading financial performance:', error);
        }
    }

    // ========================================
    // OPERATIONS SECTION
    // ========================================
    
    async loadOperationsData() {
        try {
            
            // Appointments data - with error handling for missing store
            const appointments = await this.safeGetAll('appointments');
            
            const today = new Date().toISOString().split('T')[0];
            const todayAppointments = appointments.filter(a => 
                new Date(a.date).toISOString().split('T')[0] === today
            );
            
            this.stats.todayAppointments = todayAppointments.length;
            this.stats.pendingAppointments = todayAppointments.filter(a => a.status === 'pending').length;
            this.stats.confirmedAppointments = todayAppointments.filter(a => a.status === 'confirmed').length;
            this.stats.completedAppointments = todayAppointments.filter(a => a.status === 'completed').length;
            
            // Room utilization
            const rooms = await this.safeGetAll('rooms');
            this.stats.totalRooms = rooms.length;
            this.stats.occupiedRooms = rooms.filter(r => r.status === 'occupied').length;
            this.stats.roomUtilization = this.stats.totalRooms > 0 
                ? Math.round((this.stats.occupiedRooms / this.stats.totalRooms) * 100) 
                : 0;
            
            // Top service analysis
            const services = await this.safeGetAll('products');
            const serviceBookings = {};
            
            todayAppointments.forEach(apt => {
                if (apt.serviceId) {
                    serviceBookings[apt.serviceId] = (serviceBookings[apt.serviceId] || 0) + 1;
                }
            });
            
            if (Object.keys(serviceBookings).length > 0) {
                const topServiceId = Object.keys(serviceBookings).reduce((a, b) => 
                    serviceBookings[a] > serviceBookings[b] ? a : b
                );
                const topServiceData = services.find(s => s.id === topServiceId);
                this.stats.topService = topServiceData ? topServiceData.name : 'Unknown';
                this.stats.topServiceCount = serviceBookings[topServiceId];
            }
            
            // Customer flow analysis
            const customers = await this.safeGetAll('customers');
            const todayCustomers = new Set();
            
            todayAppointments.forEach(apt => {
                if (apt.customerId) {
                    todayCustomers.add(apt.customerId);
                }
            });
            
            this.stats.newCustomers = 0;
            this.stats.returningCustomers = 0;
            
            for (const customerId of todayCustomers) {
                const customer = customers.find(c => c.id === customerId);
                if (customer) {
                    const customerAppointments = appointments.filter(a => a.customerId === customerId);
                    if (customerAppointments.length === 1) {
                        this.stats.newCustomers++;
                    } else {
                        this.stats.returningCustomers++;
                    }
                }
            }
            
            
        } catch (error) {
            console.error('❌ Error loading operations data:', error);
        }
    }

    // ========================================
    // STAFF & ATTENDANCE SECTION
    // ========================================
    
    async loadStaffAttendanceData() {
        try {
            
            // Get employees and attendance records
            const employees = await this.safeGetAll('employees');
            const attendanceRecords = await this.safeGetAll('attendance');
            
            this.stats.totalStaff = employees.length;
            
            // Today's attendance
            const today = new Date().toISOString().split('T')[0];
            const todayAttendance = attendanceRecords.filter(a => 
                new Date(a.date).toISOString().split('T')[0] === today
            );
            
            // Staff present (checked in but not checked out, or completed shifts)
            const presentStaff = new Set();
            todayAttendance.forEach(a => {
                if (a.checkInTime && (!a.checkOutTime || a.status === 'present')) {
                    presentStaff.add(a.employeeId);
                }
            });
            this.stats.staffPresent = presentStaff.size;
            
            // Weekly attendance rate
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const weeklyAttendance = attendanceRecords.filter(a => 
                new Date(a.date) >= weekAgo
            );
            
            const expectedAttendance = this.stats.totalStaff * 7; // 7 days
            const actualAttendance = weeklyAttendance.length;
            this.stats.attendanceRate = expectedAttendance > 0 
                ? Math.round((actualAttendance / expectedAttendance) * 100) 
                : 0;
            
            // Overtime calculation (current month)
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            const monthlyAttendance = attendanceRecords.filter(a => {
                const aDate = new Date(a.date);
                return aDate.getMonth() === currentMonth && aDate.getFullYear() === currentYear;
            });
            
            this.stats.overtimeHours = monthlyAttendance.reduce((sum, a) => {
                return sum + (a.overtimeHours || 0);
            }, 0);
            
            // Attendance issues
            this.stats.lateArrivals = todayAttendance.filter(a => a.isLate).length;
            this.stats.earlyDepartures = todayAttendance.filter(a => a.earlyDeparture).length;
            this.stats.attendanceIssues = this.stats.lateArrivals + this.stats.earlyDepartures;
            
            
        } catch (error) {
            console.error('❌ Error loading staff attendance data:', error);
        }
    }

    // ========================================
    // INVENTORY SECTION
    // ========================================
    
    async loadInventoryData() {
        try {
            
            // CRITICAL: Use same smart caching as POS to preserve field changes
            let inventory = [];
            
            // Check if we have recent local data (within 30 seconds) - preserve POS changes
            if (window.db) {
                const localInventory = await this.safeGetAll('inventory');
                const recentItems = localInventory.filter(item => {
                    const modifiedAt = new Date(item.modifiedAt || 0);
                    const now = new Date();
                    return (now - modifiedAt) < 30000; // 30 seconds
                });
                
                if (recentItems.length > 0) {
                    inventory = localInventory;
                } else {
                    // Only load from API if no recent changes (prevents field overwrite)
                    try {
                        const inventoryResult = await window.HybridAPIClient.getInventory();
                        if (inventoryResult.success) {
                            inventory = inventoryResult.data || [];
                        } else {
                            // Fallback to local data
                            inventory = localInventory;
                        }
                    } catch (error) {
                        console.warn('📦 [DASHBOARD] API failed, using local inventory:', error);
                        inventory = localInventory;
                    }
                }
            }
            
            // Critical stock (below minimum threshold)
            this.stats.criticalStock = inventory.filter(item => 
                item.currentStock <= (item.minStock || 0) && item.currentStock > 0
            ).length;
            
            // Out of stock
            this.stats.outOfStock = inventory.filter(item => 
                item.currentStock === 0
            ).length;
            
            // Total inventory count and value
            this.stats.totalInventory = inventory.length;
            this.stats.inventoryValue = inventory.reduce((sum, item) => 
                sum + ((item.currentStock || 0) * (item.unitCost || 0)), 0
            );
            
            // Today's usage (simplified - would need usage tracking)
            this.stats.todayUsage = 0; // Actual usage - no random data
            
            
        } catch (error) {
            console.error('❌ Error loading inventory data:', error);
        }
    }

    // ========================================
    // ACTIVITY DATA SECTION
    // ========================================
    
    async loadActivityData() {
        try {
            
            // Load recent transactions
            await this.loadRecentTransactions();
            
            // Load recent appointments
            await this.loadRecentAppointments();
            
            // Load system alerts
            await this.loadSystemAlerts();
            
            
        } catch (error) {
            console.error('❌ Error loading activity data:', error);
        }
    }

    async loadRecentTransactions() {
        try {
            // Get authentication token
            const token = localStorage.getItem('authToken') || '';
            
            // Get all transactions using HybridAPIClient
            let transactions = [];
            try {
                const result = await window.HybridAPIClient.getTransactions();
                
                if (result.success) {
                    transactions = result.data || [];
                } else {
                    console.error('❌ [DASHBOARD] Failed to load transactions for recent list:', result.error);
                    transactions = [];
                }
            } catch (error) {
                console.error('❌ [DASHBOARD] Error fetching transactions for recent list:', error);
                transactions = [];
            }
            
            const recentTransactions = transactions
                .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
                .slice(0, 10);
            
            const container = document.getElementById('recentTransactionsList');
            if (container) {
                if (recentTransactions.length === 0) {
                    container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;">No recent transactions</p>';
                } else {
                    container.innerHTML = recentTransactions.map(t => `
                        <div class="transaction-item" style="padding: 0.75rem; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-weight: 500; color: #374151;">${this.formatCurrency(t.total)}</div>
                                <div style="font-size: 0.875rem; color: #6b7280;">${this.formatDateTime(t.createdAt || t.date)}</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 0.875rem; color: #374151;">${t.items?.length || 0} items</div>
                                <div style="font-size: 0.75rem; color: #6b7280;">${t.paymentMethod || 'cash'}</div>
                            </div>
                        </div>
                    `).join('');
                }
            }
        } catch (error) {
            console.error('❌ Error loading recent transactions:', error);
        }
    }

    async loadRecentAppointments() {
        try {
            const appointments = await this.safeGetAll('appointments');
            const recentAppointments = appointments
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 10);
            
            const container = document.getElementById('recentAppointmentsList');
            if (container) {
                if (recentAppointments.length === 0) {
                    container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;">No recent appointments</p>';
                } else {
                    container.innerHTML = recentAppointments.map(a => `
                        <div class="appointment-item" style="padding: 0.75rem; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-weight: 500; color: #374151;">${a.customerName || 'Unknown Customer'}</div>
                                <div style="font-size: 0.875rem; color: #6b7280;">${a.serviceName || 'Service'}</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 0.875rem; color: #374151;">${this.formatTime(a.time)}</div>
                                <div class="status-badge ${a.status}" style="font-size: 0.75rem; padding: 0.25rem 0.5rem; border-radius: 4px; background: ${this.getStatusColor(a.status)};">${a.status}</div>
                            </div>
                        </div>
                    `).join('');
                }
            }
        } catch (error) {
            console.error('❌ Error loading recent appointments:', error);
        }
    }

    async loadSystemAlerts() {
        try {
            const alerts = [];
            
            // Add inventory alerts
            if (this.stats.criticalStock > 0) {
                alerts.push({
                    type: 'warning',
                    message: `${this.stats.criticalStock} items have critical stock levels`,
                    time: new Date()
                });
            }
            
            if (this.stats.outOfStock > 0) {
                alerts.push({
                    type: 'error',
                    message: `${this.stats.outOfStock} items are out of stock`,
                    time: new Date()
                });
            }
            
            // Add attendance alerts
            if (this.stats.attendanceIssues > 0) {
                alerts.push({
                    type: 'warning',
                    message: `${this.stats.attendanceIssues} attendance issues today`,
                    time: new Date()
                });
            }
            
            const container = document.getElementById('systemAlertsList');
            if (container) {
                if (alerts.length === 0) {
                    container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;">No system alerts</p>';
                } else {
                    container.innerHTML = alerts.map(alert => `
                        <div class="alert-item ${alert.type}" style="padding: 0.75rem; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; gap: 0.75rem;">
                            <div class="alert-icon" style="width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; color: white; background: ${alert.type === 'error' ? '#dc2626' : '#f59e0b'};">
                                <i class="fas fa-${alert.type === 'error' ? 'times' : 'exclamation'}"></i>
                            </div>
                            <div style="flex: 1;">
                                <div style="font-size: 0.875rem; color: #374151;">${alert.message}</div>
                                <div style="font-size: 0.75rem; color: #6b7280;">${this.formatDateTime(alert.time)}</div>
                            </div>
                        </div>
                    `).join('');
                }
            }
        } catch (error) {
            console.error('❌ Error loading system alerts:', error);
        }
    }

    // ========================================
    // UI UPDATE METHODS
    // ========================================
    
    updateAllStatsDisplay() {
        try {
            // Financial Performance
            this.updateElement('todayRevenue', this.formatCurrency(this.stats.todayRevenue));
            this.updateElement('weeklyRevenue', this.formatCurrency(this.stats.weeklyRevenue));
            this.updateElement('monthlyRevenue', this.formatCurrency(this.stats.monthlyRevenue));
            this.updateElement('avgTransaction', this.formatCurrency(this.stats.avgTransaction));
            
            // Optional elements that might not exist in all dashboard versions
            this.updateElementSafe('cardPayments', this.formatCurrency(this.stats.cardPayments));
            this.updateElementSafe('giftCertRevenue', this.formatCurrency(this.stats.giftCertRevenue));
            
            // Update percentages and additional info
            const cardPercentage = this.stats.todayRevenue > 0 
                ? Math.round((this.stats.cardPayments / this.stats.todayRevenue) * 100) 
                : 0;
            this.updateElementSafe('cardPaymentsPercent', `${cardPercentage}%`);
            this.updateElementSafe('giftCertCount', `${this.stats.giftCertCount} active`);
            
            // Operations (some elements might not exist in this dashboard version)
            this.updateElementSafe('todayAppointments', this.stats.todayAppointments);
            this.updateElementSafe('appointmentStatus', `${this.stats.pendingAppointments} pending`);
            this.updateElementSafe('roomUtilization', `${this.stats.roomUtilization}%`);
            this.updateElementSafe('roomsInUse', `${this.stats.occupiedRooms}/${this.stats.totalRooms} occupied`);
            this.updateElementSafe('topService', this.stats.topService);
            this.updateElementSafe('topServiceCount', `${this.stats.topServiceCount} bookings`);
            this.updateElementSafe('newCustomers', this.stats.newCustomers);
            this.updateElementSafe('returningCustomers', `${this.stats.returningCustomers} returning`);
            
            // Staff & Attendance (optional elements)
            this.updateElementSafe('staffPresent', this.stats.staffPresent);
            this.updateElementSafe('totalStaff', `of ${this.stats.totalStaff} total`);
            this.updateElementSafe('attendanceRate', `${this.stats.attendanceRate}%`);
            this.updateElementSafe('overtimeHours', `${this.stats.overtimeHours}h`);
            this.updateElementSafe('attendanceIssues', this.stats.attendanceIssues);
            this.updateElementSafe('issuesDetails', `${this.stats.lateArrivals} late, ${this.stats.earlyDepartures} early`);
            
            // Inventory (optional elements)
            this.updateElementSafe('criticalStock', this.stats.criticalStock);
            this.updateElementSafe('outOfStock', this.stats.outOfStock);
            this.updateElementSafe('totalInventory', this.stats.totalInventory);
            this.updateElementSafe('inventoryValue', this.formatCurrency(this.stats.inventoryValue));
            this.updateElementSafe('todayUsage', this.stats.todayUsage);
            
            
        } catch (error) {
            console.error('❌ Error updating stats display:', error);
        }
    }

    updateBusinessIntelligence() {
        try {
            // Service Performance
            const servicePerformance = document.getElementById('servicePerformance');
            if (servicePerformance) {
                const performanceText = this.stats.topService !== '-' 
                    ? `${this.stats.topService} is today's top service with ${this.stats.topServiceCount} bookings`
                    : 'No service bookings today';
                servicePerformance.textContent = performanceText;
            }
            
            // Peak Hours (simplified analysis)
            const peakHours = document.getElementById('peakHours');
            if (peakHours) {
                peakHours.textContent = 'Peak activity: 2PM - 4PM based on recent patterns';
            }
            
            // Customer Retention
            const customerRetention = document.getElementById('customerRetention');
            if (customerRetention) {
                const total = this.stats.newCustomers + this.stats.returningCustomers;
                const retentionRate = total > 0 
                    ? Math.round((this.stats.returningCustomers / total) * 100) 
                    : 0;
                customerRetention.textContent = `${retentionRate}% of today's customers are returning clients`;
            }
            
            // Growth Forecast
            const growthForecast = document.getElementById('growthForecast');
            if (growthForecast) {
                const weeklyTrend = this.stats.weeklyRevenue > 0 
                    ? 'Positive weekly revenue trend' 
                    : 'Focus needed on revenue generation';
                growthForecast.textContent = weeklyTrend;
            }
            
        } catch (error) {
            console.error('❌ Error updating business intelligence:', error);
        }
    }

    // ========================================
    // CHART INITIALIZATION
    // ========================================
    
    async initializeCharts() {
        try {
            await this.initializeRevenueChart();
        } catch (error) {
            console.error('❌ Error initializing charts:', error);
        }
    }

    async initializeRevenueChart(retryCount = 0) {
        const chartRenderStart = performance.now();
        const canvas = document.getElementById('revenueChart');
        const loadingIndicator = document.getElementById('chartLoadingIndicator');
        
        if (!canvas) {
            console.error('❌ Revenue chart canvas element not found');
            return;
        }
        
        // Get 2D context for Chart.js
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('❌ Could not get 2D context from canvas');
            return;
        }
        
        // Show loading indicator on first attempt
        if (retryCount === 0 && loadingIndicator) {
            loadingIndicator.style.display = 'block';
        }
        
        // Wait for Chart.js if not loaded yet (max 10 retries = 5 seconds)
        if (typeof Chart === 'undefined') {
            if (retryCount < 10) {
                console.warn(`⏳ Waiting for Chart.js to load... (attempt ${retryCount + 1}/10)`);
                setTimeout(() => this.initializeRevenueChart(retryCount + 1), 500);
            } else {
                console.error('❌ Chart.js failed to load after 5 seconds');
                if (loadingIndicator) {
                    loadingIndicator.innerHTML = '<p style="color: #d32f2f;">Failed to load chart library</p>';
                }
            }
            return;
        }

        const revenueData = await this.getRevenueChartData();
        const dataHash = this.hashData(revenueData);
        
        // Log chart data for debugging
        console.warn('📊 Chart data received:', {
            labels: revenueData.labels,
            values: revenueData.values,
            hasData: revenueData.values.some(v => v > 0)
        });
        
        // Skip rendering if data hasn't changed
        if (this.lastDataHash === dataHash && this.revenueChart) {
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
            return;
        }
        
        this.lastDataHash = dataHash;

        // Destroy existing chart
        if (this.revenueChart) {
            this.revenueChart.destroy();
        }

        try {
            this.revenueChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: revenueData.labels,
                datasets: [{
                    label: 'Revenue',
                    data: revenueData.values,
                    borderColor: '#800020',
                    backgroundColor: 'rgba(128, 0, 32, 0.08)',
                    borderWidth: 3,
                    pointBackgroundColor: '#800020',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointHoverBackgroundColor: '#600015',
                    pointHoverBorderColor: '#ffffff',
                    pointHoverBorderWidth: 2,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#800020',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            label: (context) => `Revenue: ${this.formatCurrency(context.parsed.y)}`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            borderColor: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            color: '#666',
                            font: {
                                size: 12,
                                weight: '500'
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            borderColor: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            color: '#666',
                            font: {
                                size: 12,
                                weight: '500'
                            },
                            callback: (value) => this.formatCurrency(value)
                        }
                    }
                },
                elements: {
                    point: {
                        hoverBorderWidth: 2
                    }
                }
            }
            });
            
            // Hide loading indicator after chart is created
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
            
            console.warn('✅ Chart created successfully');
            
        } catch (error) {
            console.error('❌ Failed to create chart:', error);
            if (loadingIndicator) {
                loadingIndicator.innerHTML = '<p style="color: #d32f2f;">Error creating chart</p>';
            }
        }
        
        this.performanceMetrics.chartRenderTime = performance.now() - chartRenderStart;
    }

    async getRevenueChartData() {
        // Determine days based on current period
        let days = 7; // Default
        switch (this.currentChartPeriod) {
            case 'week':
                days = 7;
                break;
            case 'month':
                days = 30;
                break;
            case 'quarter':
                days = 90;
                break;
            default:
                days = 7;
        }
        
        const labels = [];
        const values = [];
        let transactions = [];
        
        try {
            // Get transactions using HybridAPIClient
            const result = await window.HybridAPIClient.getTransactions();
            
            if (result.success) {
                transactions = result.data || [];
            } else {
                console.error('❌ Failed to get transactions for chart:', result.error);
            }
        } catch (error) {
            console.error('❌ Error fetching transactions for chart:', error);
        }
        
        // Generate labels for the specified period
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            let label;
            if (days <= 7) {
                // Show weekday names for week view
                label = date.toLocaleDateString('en', { weekday: 'short' });
            } else if (days <= 30) {
                // Show month/day for month view
                label = date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
            } else {
                // Show month/day for quarter view, but only every few days to avoid crowding
                if (i % Math.ceil(days / 10) === 0 || i === 0) {
                    label = date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
                } else {
                    label = '';
                }
            }
            
            labels.push(label);
            
            let dayRevenue = 0;
            
            // Use real transaction data with better date parsing
            dayRevenue = transactions
                .filter(t => {
                    if (!t.date) return false;
                    try {
                        const transactionDate = new Date(t.date);
                        // Check if date is valid
                        if (isNaN(transactionDate.getTime())) return false;
                        return transactionDate.toISOString().split('T')[0] === dateStr;
                    } catch (e) {
                        console.warn('Invalid date in transaction:', t.date);
                        return false;
                    }
                })
                .reduce((sum, t) => sum + (parseFloat(t.total) || 0), 0);
            
            values.push(dayRevenue);
        }
        
        return { labels, values };
    }
    

    // ========================================
    // EVENT LISTENERS & INTERACTIONS
    // ========================================
    
    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.querySelector('[onclick="window.refreshDashboard()"]');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshDashboard());
        }
        
        // Chart period controls
        const chartPeriods = document.querySelectorAll('.chart-period');
        chartPeriods.forEach(btn => {
            btn.addEventListener('click', (e) => {
                chartPeriods.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.updateChartPeriod(e.target.dataset.period);
            });
        });
    }

    setupActivityTabs() {
        // Professional activity tabs
        const tabsPro = document.querySelectorAll('.activity-tab-pro');
        const panelsPro = document.querySelectorAll('.activity-panel-pro');
        
        tabsPro.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all professional tabs and panels
                tabsPro.forEach(t => t.classList.remove('active'));
                panelsPro.forEach(p => p.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding panel
                tab.classList.add('active');
                const targetPanel = document.getElementById(tab.dataset.tab);
                if (targetPanel) {
                    targetPanel.classList.add('active');
                }
            });
        });

        // Legacy activity tabs (for backward compatibility)
        const tabs = document.querySelectorAll('.activity-tab');
        const panels = document.querySelectorAll('.activity-panel');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all tabs and panels
                tabs.forEach(t => t.classList.remove('active'));
                panels.forEach(p => p.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding panel
                tab.classList.add('active');
                const targetPanel = document.getElementById(tab.dataset.tab);
                if (targetPanel) {
                    targetPanel.classList.add('active');
                }
            });
        });
    }

    setupRefreshTimer() {
        // Clear any existing interval to prevent duplicates
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        // Auto-refresh every 4 minutes
        this.updateInterval = setInterval(() => {
            // Only refresh if dashboard is visible
            if (document.visibilityState === 'visible' && this.isPageActive()) {
                this.loadAllDashboardData();
            }
        }, this.updateFrequency);
    }
    
    isPageActive() {
        // Check if dashboard page is actually active
        const dashboardPage = document.getElementById('dashboard');
        return dashboardPage && dashboardPage.classList.contains('active');
    }

    async updateChartPeriod(period) {
        this.currentChartPeriod = period;
        
        // Force chart refresh by clearing the data hash
        this.lastDataHash = null;
        
        // Reinitialize chart with new period
        await this.initializeRevenueChart();
    }

    // ========================================
    // UTILITY METHODS
    // ========================================
    
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            const oldValue = element.textContent;
            element.textContent = value;
            
            // Verify the update actually took
            setTimeout(() => {
                const newValue = document.getElementById(id)?.textContent;
                if (newValue === value) {
                } else {
                    console.error(`❌ [DASHBOARD] FAILED - Element '${id}' was overwritten! Expected '${value}', got '${newValue}'`);
                }
            }, 100);
        } else {
            console.warn(`⚠️ [DASHBOARD] Element '${id}' not found in DOM`);
            // Let's check what elements actually exist
            console.log(
                Array.from(document.querySelectorAll('[id*="revenue"], [id*="Revenue"], [id*="today"], [id*="Today"]'))
                    .map(el => ({ id: el.id, text: el.textContent.substring(0, 20) }))
            );
        }
    }
    
    // Silent update for optional elements
    updateElementSafe(id, value) {
        // SPECIFIC FIX: Never touch the checkout employee select
        if (id === 'checkoutEmployeeSelect') {
            return;
        }
        
        const element = document.getElementById(id);
        if (element) {
            // CRITICAL FIX: Never update SELECT elements - they have options, not text content
            if (element.tagName === 'SELECT') {
                console.warn(`⚠️ [DASHBOARD] Skipping update of SELECT element '${id}' - SELECT elements should not have textContent set`);
                return;
            }
            // ADDITIONAL FIX: Skip elements that are being populated
            if (element.hasAttribute('data-populating')) {
                console.warn(`⚠️ [DASHBOARD] Skipping update of '${id}' - element is being populated`);
                return;
            }
            // SAFETY CHECK: Don't update elements in modals
            const inModal = element.closest('.modal');
            if (inModal) {
                console.warn(`⚠️ [DASHBOARD] Skipping update of '${id}' - element is in a modal`);
                return;
            }
            element.textContent = value;
        }
        // No warning for missing optional elements
    }

    formatCurrency(amount) {
        if (window.app && typeof window.app.formatCurrency === 'function') {
            return window.app.formatCurrency(amount);
        }
        return `₱${(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    // Simple hash function for data change detection
    hashData(data) {
        return btoa(JSON.stringify(data)).slice(0, 16);
    }

    formatDateTime(date) {
        return new Date(date).toLocaleString('en-PH', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatTime(time) {
        if (!time) return '-';
        return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-PH', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    getStatusColor(status) {
        const colors = {
            pending: '#fbbf24',
            confirmed: '#10b981',
            completed: '#6b7280',
            cancelled: '#ef4444'
        };
        return colors[status] || '#6b7280';
    }

    showErrorState() {
        // Implementation for error state UI
    }

    async refreshDashboard() {
        
        // Clear cache to ensure fresh data
        if (window.HybridAPIClient && window.HybridAPIClient.invalidateTransactionCache) {
            try {
                await window.HybridAPIClient.invalidateTransactionCache();
            } catch (error) {
                console.warn('⚠️ Failed to clear cache:', error);
            }
        }
        
        await this.loadAllDashboardData();
    }

    logPerformanceMetrics() {
        const { initStartTime, initEndTime, dataLoadTime, chartRenderTime } = this.performanceMetrics;
        
        if (initStartTime && initEndTime) {
            const totalInitTime = initEndTime - initStartTime;
            
            if (dataLoadTime) {
            }
            
            if (chartRenderTime) {
            }
            
            // Performance grade
            let grade = 'A';
            if (totalInitTime > 2000) grade = 'D';
            else if (totalInitTime > 1000) grade = 'C';
            else if (totalInitTime > 500) grade = 'B';
            
        }
    }

    destroy() {
        
        // Clear interval
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        // Destroy chart
        if (this.revenueChart) {
            this.revenueChart.destroy();
            this.revenueChart = null;
        }
        
        // Clear large data arrays to free memory
        this.stats = {
            todayRevenue: 0,
            weeklyRevenue: 0,
            monthlyRevenue: 0,
            todayTransactions: 0,
            avgTransaction: 0,
            totalProducts: 0,
            lowStock: 0,
            totalStaff: 0,
            onDuty: 0,
            totalInventory: 0,
            inventoryValue: 0,
            criticalStock: 0,
            outOfStock: 0,
            cardPayments: 0,
            cashPayments: 0,
            giftCertRevenue: 0,
            giftCertCount: 0,
            totalAppointments: 0,
            pendingAppointments: 0,
            confirmedAppointments: 0
        };
        
        // Remove event listeners
        this.removeEventListeners();
        
        // Clear references
        this.isInitialized = false;
        
        // Suggest garbage collection
        if (window.gc) {
            window.gc();
        }
        
    }
    
    removeEventListeners() {
        // Remove page visibility listener
        if (this.visibilityHandler) {
            document.removeEventListener('visibilitychange', this.visibilityHandler);
            this.visibilityHandler = null;
        }
        
        // Remove transaction listener
        if (this.transactionHandler) {
            window.removeEventListener('transactionCompleted', this.transactionHandler);
            this.transactionHandler = null;
        }
    }
    
    setupPageVisibilityHandler() {
        // Handle page visibility changes
        this.visibilityHandler = () => {
            if (document.visibilityState === 'hidden') {
                // Pause updates when page is hidden
                if (this.updateInterval) {
                    clearInterval(this.updateInterval);
                    this.updateInterval = null;
                }
            } else if (document.visibilityState === 'visible' && this.isPageActive()) {
                // Resume updates when page is visible
                if (!this.updateInterval && this.isInitialized) {
                    this.setupRefreshTimer();
                }
            }
        };
        
        document.addEventListener('visibilitychange', this.visibilityHandler);
    }

    // Event listener for real-time transaction updates
    setupTransactionListener() {
        // Remove any existing listener to prevent duplicates
        if (this.transactionHandler) {
            window.removeEventListener('transactionCompleted', this.transactionHandler);
        }
        
        // Create new handler
        this.transactionHandler = (event) => {
            const transaction = event.detail.transaction;
            
            // Immediately update stats without API calls (works offline)
            this.updateStatsWithNewTransaction(transaction);
        };
        
        window.addEventListener('transactionCompleted', this.transactionHandler);
    }

    // Immediate local stats update for new transactions (offline-capable)
    updateStatsWithNewTransaction(transaction) {
        
        if (!transaction) {
            console.error('❌ [DASHBOARD] No transaction data provided');
            return;
        }
        
            id: transaction.id,
            total: transaction.total,
            employee: transaction.employee?.name || 'No Employee',
            createdAt: transaction.createdAt
        });
        
        const today = new Date().toISOString().split('T')[0];
        const transactionDate = new Date(transaction.createdAt).toISOString().split('T')[0];
        
            today: today,
            transactionDate: transactionDate,
            isToday: transactionDate === today
        });
        
            todayRevenue: this.stats.todayRevenue,
            todayTransactions: this.stats.todayTransactions
        });
        
        if (transactionDate === today) {
            this.stats.todayRevenue += transaction.total;
            this.stats.todayTransactions += 1;
                todayRevenue: this.stats.todayRevenue,
                todayTransactions: this.stats.todayTransactions,
                addedAmount: transaction.total
            });
        } else {
        }
        
        // Update weekly/monthly stats
        const transactionTime = new Date(transaction.createdAt).getTime();
        const now = new Date().getTime();
        const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
        
        if (transactionTime >= weekAgo) {
            this.stats.weeklyRevenue += transaction.total;
        }
        
        if (transactionTime >= monthStart) {
            this.stats.monthlyRevenue += transaction.total;
        }
        
        // Recalculate average transaction
        if (this.stats.todayTransactions > 0) {
            this.stats.avgTransaction = this.stats.todayRevenue / this.stats.todayTransactions;
        }
        
        // Update UI immediately
        this.updateAllStatsDisplay();
        
    }

    // Fallback method to refresh stats from local data only (fully offline)
    async refreshStatsFromLocalData() {
        
        try {
            // CRITICAL FIX: Try backend API first, even in "fallback" mode
            const token = localStorage.getItem('authToken') || localStorage.getItem('userToken');
            
            // SECURITY: Only make API call if we have a valid user token
            if (!token) {
                throw new Error('No authentication token');
            }
            
            try {
                const backendStatsResponse = await fetch(window.API_CONFIG.buildUrl('/api/business/stats'), {
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (backendStatsResponse.ok) {
                    const backendStats = await backendStatsResponse.json();
                    
                    // Use backend calculated stats instead of local calculations
                    this.stats.todayRevenue = backendStats.todaySales || 0;
                    this.stats.weeklyRevenue = backendStats.todaySales || 0;
                    this.stats.monthlyRevenue = backendStats.monthSales || 0;
                    this.stats.todayTransactions = backendStats.todayTransactions || 0;
                    this.stats.avgTransaction = backendStats.totalTransactions > 0 
                        ? backendStats.totalSales / backendStats.totalTransactions 
                        : 0;
                    
                    // Update UI and return - no need for local calculations
                    this.updateAllStatsDisplay();
                    return;
                }
            } catch (backendError) {
            }
            
            // TRUE FALLBACK: Only use local data if backend is completely unavailable
            if (!window.db) {
                console.warn('⚠️ Database not available for offline refresh');
                return;
            }
            
            
            // Get recent local transactions (last 30 days only for memory efficiency)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const allLocalTransactions = await this.safeGetAll('transactions');
            const allTransactions = allLocalTransactions.filter(t => {
                const transactionDate = new Date(t.createdAt || t.date);
                return transactionDate >= thirtyDaysAgo;
            });
            
            
            // Reset stats
            this.stats.todayRevenue = 0;
            this.stats.weeklyRevenue = 0;
            this.stats.monthlyRevenue = 0;
            this.stats.todayTransactions = 0;
            this.stats.avgTransaction = 0;
            
            // Calculate stats from local data
            const today = new Date().toISOString().split('T')[0];
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            
            for (const transaction of allTransactions) {
                const transactionDate = new Date(transaction.createdAt || transaction.date);
                const transactionDateStr = transactionDate.toISOString().split('T')[0];
                const transactionTotal = transaction.total || 0;
                
                // Today's data
                if (transactionDateStr === today) {
                    this.stats.todayRevenue += transactionTotal;
                    this.stats.todayTransactions += 1;
                }
                
                // Weekly data
                if (transactionDate >= weekAgo) {
                    this.stats.weeklyRevenue += transactionTotal;
                }
                
                // Monthly data
                if (transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear) {
                    this.stats.monthlyRevenue += transactionTotal;
                }
            }
            
            // Calculate average
            if (this.stats.todayTransactions > 0) {
                this.stats.avgTransaction = this.stats.todayRevenue / this.stats.todayTransactions;
            }
            
            // Update UI
            this.updateAllStatsDisplay();
            
                today: this.stats.todayRevenue,
                weekly: this.stats.weeklyRevenue,
                monthly: this.stats.monthlyRevenue,
                transactions: this.stats.todayTransactions
            });
            
        } catch (error) {
            console.error('❌ Failed to refresh dashboard from local data:', error);
        }
    }
}

// ========================================
// GLOBAL FUNCTIONS & INITIALIZATION
// ========================================

// Create and export enhanced dashboard manager
const enhancedDashboardManager = new EnhancedDashboardManager();

// Global functions for backward compatibility and external access
window.refreshDashboard = async function() {
    await enhancedDashboardManager.refreshDashboard();
};

window.exportDailySales = function() {
    // Implementation for sales export
};

window.runDataSync = function() {
    if (window.syncManager && typeof window.syncManager.syncAll === 'function') {
        window.syncManager.syncAll();
    } else {
    }
};

// Load dashboard function for app.js compatibility - REMOVED (duplicate below)

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const dashboardElement = document.getElementById('dashboard');
    
    if (dashboardElement) {
        enhancedDashboardManager.init();
    } else {
        console.warn('⚠️ [DASHBOARD] Dashboard element not found on DOM load, will try again when navigated to');
    }
});

// Also try to initialize when the dashboard page is loaded/shown
window.loadDashboard = async function() {
    
    // Clear cache for fresh data when navigating to dashboard
    if (window.HybridAPIClient && window.HybridAPIClient.invalidateTransactionCache) {
        try {
            await window.HybridAPIClient.invalidateTransactionCache();
        } catch (error) {
            console.warn('⚠️ Failed to clear cache on navigation:', error);
        }
    }
    
    // CRITICAL: Always ensure dashboard is initialized when loading
    if (enhancedDashboardManager && !enhancedDashboardManager.isInitialized) {
        await enhancedDashboardManager.init();
    } else if (enhancedDashboardManager) {
        await enhancedDashboardManager.refreshDashboard();
    } else {
        console.error('❌ [DASHBOARD] enhancedDashboardManager not found!');
    }
};

// Clean up when navigating away from dashboard
window.unloadDashboard = function() {
    if (enhancedDashboardManager && enhancedDashboardManager.isInitialized) {
        enhancedDashboardManager.destroy();
    }
};

// Export for external use
window.enhancedDashboardManager = enhancedDashboardManager;

// Manual dashboard refresh function (can be called from anywhere)
window.forceRefreshDashboard = async function() {
    if (window.enhancedDashboardManager) {
        try {
            await window.enhancedDashboardManager.refreshDashboard();
        } catch (error) {
            console.error('❌ [FORCE] Dashboard force refresh failed:', error);
        }
    }
};

// Debug functions removed for production





// REMOVED: Duplicate global transaction listener that was causing data duplication
// The class already has a proper listener in setupTransactionListener() method

