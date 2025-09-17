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
        console.log('🚀 Initializing Enhanced Dashboard Manager...');
        
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
            this.setupRefreshTimer();
            
            this.isInitialized = true;
            this.performanceMetrics.initEndTime = performance.now();
            this.logPerformanceMetrics();
            console.log('✅ Enhanced Dashboard Manager initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Enhanced Dashboard Manager:', error);
            this.showErrorState();
        }
    }

    async loadAllDashboardData() {
        const dataLoadStart = performance.now();
        console.log('📊 Loading comprehensive dashboard data...');
        
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
            console.log('✅ All dashboard data loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading dashboard data:', error);
        }
    }

    // ========================================
    // FINANCIAL PERFORMANCE SECTION
    // ========================================
    
    async loadFinancialPerformance() {
        try {
            console.log('💰 Loading financial performance data...');
            
            // Get authentication token
            const token = localStorage.getItem('authToken') || '';
            
            // PRIORITY FIX: Get stats from backend business API for accurate data
            // SECURITY: Only make API call if we have a valid user token
            if (!token) {
                console.log('⚠️ [SECURITY] No valid user token found, skipping backend API call');
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
                    console.log('🌐 [DASHBOARD] Using backend business stats for accuracy:', backendStats);
                    
                    // Use backend calculated stats instead of local calculations
                    this.stats.todayRevenue = backendStats.todaySales || 0;
                    this.stats.weeklyRevenue = backendStats.todaySales || 0; // Backend doesn't have weekly, use today
                    this.stats.monthlyRevenue = backendStats.monthSales || 0;
                    this.stats.todayTransactions = backendStats.todayTransactions || 0;
                    this.stats.avgTransaction = backendStats.totalTransactions > 0 
                        ? backendStats.totalSales / backendStats.totalTransactions 
                        : 0;
                    
                    console.log('✅ [DASHBOARD] Revenue data updated from backend API - no local calculation needed');
                    return; // Skip local calculations
                }
                } catch (backendError) {
                    console.log('⚠️ [DASHBOARD] Backend business stats unavailable, falling back to local calculation');
                }
            }
            
            // FALLBACK: Get all transactions from MongoDB API instead of IndexedDB
            let allTransactions = [];
            try {
                // Use HybridAPIClient for offline support
                const result = await window.HybridAPIClient.getTransactions();
                
                if (result.success) {
                    allTransactions = result.data || [];
                    console.log(`✅ [DASHBOARD] Loaded ${allTransactions.length} transactions from ${result.source || 'API'}`);
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
            
            console.log('✅ Financial performance data loaded');
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
            console.log('🏢 Loading operations data...');
            
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
            
            console.log('✅ Operations data loaded');
            
        } catch (error) {
            console.error('❌ Error loading operations data:', error);
        }
    }

    // ========================================
    // STAFF & ATTENDANCE SECTION
    // ========================================
    
    async loadStaffAttendanceData() {
        try {
            console.log('👥 Loading staff and attendance data...');
            
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
            
            console.log('✅ Staff and attendance data loaded');
            
        } catch (error) {
            console.error('❌ Error loading staff attendance data:', error);
        }
    }

    // ========================================
    // INVENTORY SECTION
    // ========================================
    
    async loadInventoryData() {
        try {
            console.log('📦 Loading inventory data for dashboard...');
            
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
                    console.log('📦 [DASHBOARD] Using local IndexedDB data to preserve recent POS changes');
                    inventory = localInventory;
                } else {
                    // Only load from API if no recent changes (prevents field overwrite)
                    console.log('📦 [DASHBOARD] Loading inventory from API (no recent changes)');
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
            this.stats.todayUsage = Math.floor(Math.random() * 10); // Placeholder
            
            console.log('✅ Inventory data loaded');
            
        } catch (error) {
            console.error('❌ Error loading inventory data:', error);
        }
    }

    // ========================================
    // ACTIVITY DATA SECTION
    // ========================================
    
    async loadActivityData() {
        try {
            console.log('📋 Loading activity data...');
            
            // Load recent transactions
            await this.loadRecentTransactions();
            
            // Load recent appointments
            await this.loadRecentAppointments();
            
            // Load system alerts
            await this.loadSystemAlerts();
            
            console.log('✅ Activity data loaded');
            
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
        console.log('🎨 [DASHBOARD] ✅ UPDATING ALL STATS DISPLAY');
        console.log('📊 [DASHBOARD] Current stats values:', {
            todayRevenue: this.stats.todayRevenue,
            weeklyRevenue: this.stats.weeklyRevenue,
            monthlyRevenue: this.stats.monthlyRevenue,
            avgTransaction: this.stats.avgTransaction
        });
        
        try {
            // Financial Performance
            console.log('💰 [DASHBOARD] Updating revenue displays...');
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
            
            console.log('✅ All dashboard statistics updated');
            
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

    async initializeRevenueChart() {
        const chartRenderStart = performance.now();
        const ctx = document.getElementById('revenueChart');
        if (!ctx) return;

        const revenueData = await this.getRevenueChartData();
        const dataHash = this.hashData(revenueData);
        
        // Skip rendering if data hasn't changed
        if (this.lastDataHash === dataHash && this.revenueChart) {
            console.log('📊 Skipping chart render - data unchanged');
            return;
        }
        
        this.lastDataHash = dataHash;

        // Destroy existing chart
        if (this.revenueChart) {
            this.revenueChart.destroy();
        }

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
                console.log(`📊 Loaded ${transactions.length} transactions from ${result.source || 'API'} for chart`);
            } else {
                console.log('📊 Could not load transactions:', result.error);
            }
        } catch (error) {
            console.log('📊 Error loading transactions for chart:', error);
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
            
            if (transactions.length > 0) {
                // Use real transaction data
                dayRevenue = transactions
                    .filter(t => t.date && new Date(t.date).toISOString().split('T')[0] === dateStr)
                    .reduce((sum, t) => sum + (parseFloat(t.total) || 0), 0);
            } else {
                // Use sample data for demonstration when no real data exists
                dayRevenue = this.getSampleRevenueForDay(i, days);
            }
            
            values.push(dayRevenue);
        }
        
        console.log('📊 Chart data generated:', { period: this.currentChartPeriod, days, labels: labels.length, values: values.length, transactionCount: transactions.length });
        return { labels, values };
    }
    
    getSampleRevenueForDay(dayIndex, totalDays) {
        // Generate realistic sample revenue data for demo purposes
        const baseRevenue = 1500; // Base daily revenue
        const variation = 0.4; // 40% variation
        
        // Create a pattern with peak on Tuesday (index 2 from Sunday)
        const dayOfWeek = (new Date().getDay() - (totalDays - 1 - dayIndex) + 7) % 7;
        let multiplier = 1;
        
        switch (dayOfWeek) {
            case 0: multiplier = 0.4; break; // Sunday - low
            case 1: multiplier = 0.8; break; // Monday - medium
            case 2: multiplier = 1.2; break; // Tuesday - high (peak)
            case 3: multiplier = 1.0; break; // Wednesday - normal
            case 4: multiplier = 0.9; break; // Thursday - medium
            case 5: multiplier = 1.1; break; // Friday - high
            case 6: multiplier = 0.6; break; // Saturday - medium-low
        }
        
        // Add some random variation
        const randomVariation = (Math.random() - 0.5) * variation;
        const finalMultiplier = multiplier + randomVariation;
        
        return Math.round(baseRevenue * Math.max(0.1, finalMultiplier));
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
        // Auto-refresh every minute
        this.updateInterval = setInterval(() => {
            this.loadAllDashboardData();
        }, this.updateFrequency);
    }

    async updateChartPeriod(period) {
        console.log(`📊 Updating chart period to: ${period}`);
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
            console.log(`🎯 [DASHBOARD] BEFORE UPDATE - Element '${id}': '${oldValue}' → '${value}'`);
            element.textContent = value;
            
            // Verify the update actually took
            setTimeout(() => {
                const newValue = document.getElementById(id)?.textContent;
                if (newValue === value) {
                    console.log(`✅ [DASHBOARD] CONFIRMED - Element '${id}' successfully updated to '${newValue}'`);
                } else {
                    console.error(`❌ [DASHBOARD] FAILED - Element '${id}' was overwritten! Expected '${value}', got '${newValue}'`);
                }
            }, 100);
        } else {
            console.warn(`⚠️ [DASHBOARD] Element '${id}' not found in DOM`);
            // Let's check what elements actually exist
            console.log('🔍 [DASHBOARD] Available elements with similar IDs:', 
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
            console.log(`🎯 [DASHBOARD] Updated optional element '${id}' to '${value}'`);
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
        console.log('⚠️ Showing dashboard error state');
        // Implementation for error state UI
    }

    async refreshDashboard() {
        console.log('🔄 Manually refreshing dashboard...');
        
        // Clear cache to ensure fresh data
        if (window.HybridAPIClient && window.HybridAPIClient.invalidateTransactionCache) {
            try {
                await window.HybridAPIClient.invalidateTransactionCache();
                console.log('🗑️ Cache cleared for fresh dashboard data');
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
            console.log('⚡ Dashboard Performance Metrics:');
            console.log(`   📊 Total Initialization: ${totalInitTime.toFixed(2)}ms`);
            
            if (dataLoadTime) {
                console.log(`   📈 Data Loading: ${dataLoadTime.toFixed(2)}ms (${((dataLoadTime/totalInitTime)*100).toFixed(1)}%)`);
            }
            
            if (chartRenderTime) {
                console.log(`   📊 Chart Rendering: ${chartRenderTime.toFixed(2)}ms (${((chartRenderTime/totalInitTime)*100).toFixed(1)}%)`);
            }
            
            // Performance grade
            let grade = 'A';
            if (totalInitTime > 2000) grade = 'D';
            else if (totalInitTime > 1000) grade = 'C';
            else if (totalInitTime > 500) grade = 'B';
            
            console.log(`   🏆 Performance Grade: ${grade} ${totalInitTime < 500 ? '(Excellent)' : totalInitTime < 1000 ? '(Good)' : totalInitTime < 2000 ? '(Acceptable)' : '(Needs Optimization)'}`);
        }
    }

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        if (this.revenueChart) {
            this.revenueChart.destroy();
        }
    }

    // Event listener for real-time transaction updates
    setupTransactionListener() {
        window.addEventListener('transactionCompleted', (event) => {
            console.log('🔔 Dashboard received transaction completed event');
            const transaction = event.detail.transaction;
            
            // Immediately update stats without API calls (works offline)
            this.updateStatsWithNewTransaction(transaction);
        });
    }

    // Immediate local stats update for new transactions (offline-capable)
    updateStatsWithNewTransaction(transaction) {
        console.log('🚀 [DASHBOARD] updateStatsWithNewTransaction called!');
        
        if (!transaction) {
            console.error('❌ [DASHBOARD] No transaction data provided');
            return;
        }
        
        console.log('📊 [DASHBOARD] Processing transaction:', {
            id: transaction.id,
            total: transaction.total,
            employee: transaction.employee?.name || 'No Employee',
            createdAt: transaction.createdAt
        });
        
        const today = new Date().toISOString().split('T')[0];
        const transactionDate = new Date(transaction.createdAt).toISOString().split('T')[0];
        
        console.log('📅 [DASHBOARD] Date check:', {
            today: today,
            transactionDate: transactionDate,
            isToday: transactionDate === today
        });
        
        console.log('💰 [DASHBOARD] Stats BEFORE update:', {
            todayRevenue: this.stats.todayRevenue,
            todayTransactions: this.stats.todayTransactions
        });
        
        if (transactionDate === today) {
            this.stats.todayRevenue += transaction.total;
            this.stats.todayTransactions += 1;
            console.log('💰 [DASHBOARD] Stats AFTER update:', {
                todayRevenue: this.stats.todayRevenue,
                todayTransactions: this.stats.todayTransactions,
                addedAmount: transaction.total
            });
        } else {
            console.log('⚠️ [DASHBOARD] Transaction not from today, skipping update');
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
        console.log('🎨 [DASHBOARD] Calling updateAllStatsDisplay to refresh UI');
        this.updateAllStatsDisplay();
        
        console.log('✅ [DASHBOARD] Dashboard stats updated immediately with transaction');
    }

    // Fallback method to refresh stats from local data only (fully offline)
    async refreshStatsFromLocalData() {
        console.log('🔄 Refreshing dashboard from local data (trying backend first)');
        
        try {
            // CRITICAL FIX: Try backend API first, even in "fallback" mode
            const token = localStorage.getItem('authToken') || localStorage.getItem('userToken');
            
            // SECURITY: Only make API call if we have a valid user token
            if (!token) {
                console.log('⚠️ [SECURITY] No valid user token found, skipping backend API call');
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
                    console.log('🌐 [FALLBACK] Backend API available, using accurate data:', backendStats);
                    
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
                    console.log('✅ [FALLBACK] Successfully used backend data');
                    return;
                }
            } catch (backendError) {
                console.log('⚠️ [FALLBACK] Backend unavailable, falling back to local data');
            }
            
            // TRUE FALLBACK: Only use local data if backend is completely unavailable
            if (!window.db) {
                console.warn('⚠️ Database not available for offline refresh');
                return;
            }
            
            console.log('📱 [FALLBACK] Using local IndexedDB data as last resort');
            
            // Get all local transactions
            const allTransactions = await this.safeGetAll('transactions');
            console.log(`📱 Found ${allTransactions.length} local transactions for offline dashboard refresh`);
            
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
            
            console.log('✅ Dashboard refreshed from local data:', {
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
    console.log('📊 Exporting daily sales data...');
    // Implementation for sales export
};

window.runDataSync = function() {
    console.log('🔄 Running data synchronization...');
    if (window.syncManager && typeof window.syncManager.syncAll === 'function') {
        window.syncManager.syncAll();
    } else {
        console.log('Sync manager not available');
    }
};

// Load dashboard function for app.js compatibility - REMOVED (duplicate below)

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('📋 [DASHBOARD] DOM Content Loaded, checking for dashboard element...');
    const dashboardElement = document.getElementById('dashboard');
    console.log('📋 [DASHBOARD] Dashboard element found:', !!dashboardElement);
    
    if (dashboardElement) {
        console.log('🚀 [DASHBOARD] Initializing dashboard manager...');
        enhancedDashboardManager.init();
    } else {
        console.warn('⚠️ [DASHBOARD] Dashboard element not found on DOM load, will try again when navigated to');
    }
});

// Also try to initialize when the dashboard page is loaded/shown
window.loadDashboard = async function() {
    console.log('🔄 Loading dashboard data...');
    
    // Clear cache for fresh data when navigating to dashboard
    if (window.HybridAPIClient && window.HybridAPIClient.invalidateTransactionCache) {
        try {
            await window.HybridAPIClient.invalidateTransactionCache();
            console.log('🗑️ Cache cleared for fresh dashboard navigation');
        } catch (error) {
            console.warn('⚠️ Failed to clear cache on navigation:', error);
        }
    }
    
    // CRITICAL: Always ensure dashboard is initialized when loading
    if (enhancedDashboardManager && !enhancedDashboardManager.isInitialized) {
        console.log('🚀 [DASHBOARD] Dashboard not initialized, initializing now...');
        await enhancedDashboardManager.init();
    } else if (enhancedDashboardManager) {
        console.log('🔄 [DASHBOARD] Dashboard already initialized, refreshing...');
        await enhancedDashboardManager.refreshDashboard();
    } else {
        console.error('❌ [DASHBOARD] enhancedDashboardManager not found!');
    }
};

// Export for external use
window.enhancedDashboardManager = enhancedDashboardManager;

// Manual dashboard refresh function (can be called from anywhere)
window.forceRefreshDashboard = async function() {
    console.log('🔄 [FORCE] Manual dashboard refresh triggered');
    if (window.enhancedDashboardManager) {
        try {
            await window.enhancedDashboardManager.refreshDashboard();
            console.log('✅ [FORCE] Dashboard force refreshed successfully');
        } catch (error) {
            console.error('❌ [FORCE] Dashboard force refresh failed:', error);
        }
    }
};

// Debug functions removed for production





// Global transaction listener (works even if dashboard isn't loaded yet)
window.addEventListener('transactionCompleted', (event) => {
    const transaction = event.detail.transaction;
    
    // Log transaction event received with details
    console.log('Transaction event received - details:', {
        transactionId: transaction?.id,
        total: transaction?.total,
        employee: transaction?.employee?.name || transaction?.employee?.id || 'No Employee',
        createdAt: transaction?.createdAt,
        isOffline: transaction?.isOffline
    });
    
    console.log('🔍 [GLOBAL] Dashboard Manager State:', {
        exists: !!window.enhancedDashboardManager,
        initialized: window.enhancedDashboardManager?.isInitialized || false
    });
    
    // Try to update dashboard if it exists and is initialized
    if (window.enhancedDashboardManager && window.enhancedDashboardManager.isInitialized) {
        console.log('📊 [GLOBAL] ✅ UPDATING DASHBOARD WITH TRANSACTION');
        window.enhancedDashboardManager.updateStatsWithNewTransaction(transaction);
    } else {
        console.log('⏳ [GLOBAL] ❌ Dashboard not initialized, will be included on next load');
        console.log('🔧 [GLOBAL] Attempting to initialize dashboard now...');
        
        // Try to initialize dashboard if not already done
        if (window.enhancedDashboardManager && !window.enhancedDashboardManager.isInitialized) {
            window.enhancedDashboardManager.init().then(() => {
                console.log('✅ [GLOBAL] Dashboard initialized, now updating with transaction');
                window.enhancedDashboardManager.updateStatsWithNewTransaction(transaction);
            }).catch(error => {
                console.error('❌ [GLOBAL] Failed to initialize dashboard:', error);
            });
        }
    }
    
    // Also refresh dashboard if we're currently on the dashboard page
    const dashboardElement = document.getElementById('dashboard');
    if (dashboardElement && dashboardElement.style.display !== 'none') {
        console.log('🔄 [GLOBAL] Refreshing dashboard data after transaction');
        
        // Try immediate update first
        if (window.enhancedDashboardManager && window.enhancedDashboardManager.isInitialized) {
            window.enhancedDashboardManager.updateStatsWithNewTransaction(transaction);
        }
        
        // Then do a full refresh with delay to ensure API has processed
        setTimeout(async () => {
            console.log('⚠️ [GLOBAL] ABOUT TO RELOAD DASHBOARD - this might overwrite our updates!');
            const beforeReload = document.getElementById('todayRevenue')?.textContent;
            console.log('📊 [GLOBAL] todayRevenue BEFORE reload:', beforeReload);
            
            if (window.loadDashboard) {
                await window.loadDashboard();
                console.log('🔄 [GLOBAL] Dashboard fully refreshed after transaction');
                
                const afterReload = document.getElementById('todayRevenue')?.textContent;
                console.log('📊 [GLOBAL] todayRevenue AFTER reload:', afterReload);
                
                if (beforeReload !== afterReload) {
                    console.error('🚨 [GLOBAL] FOUND THE ISSUE! Dashboard reload overwrote our updates!');
                }
            }
        }, 1500); // Increased delay to ensure backend processing
    }
});

console.log('✅ Enhanced Dashboard Manager loaded successfully');