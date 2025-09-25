// Employee Management


class EmployeeManager {
    constructor() {
        this.employees = [];
        this.editingEmployee = null;
        this.filteredEmployees = [];
        this.searchTerm = '';
        
        // Listen for transaction completion events for real-time updates
        this.setupTransactionListener();
    }
    
    // Setup transaction listener for real-time employee stats updates
    setupTransactionListener() {
        window.addEventListener('transactionCompleted', (event) => {
            console.log('🔔 [EMPLOYEE-MANAGER] ✅ RECEIVED TRANSACTION EVENT!');
            const transaction = event.detail.transaction;
            
            console.log('📋 [EMPLOYEE-MANAGER] Transaction details:', {
                id: transaction?.id,
                total: transaction?.total,
                employee: transaction?.employee?.name || transaction?.employee?.id || 'No Employee',
                createdAt: transaction?.createdAt
            });
            
            // Only refresh if we're currently on the employees page
            const employeesPage = document.getElementById('employees');
            console.log('🔍 [EMPLOYEE-MANAGER] Page check:', {
                employeesPageExists: !!employeesPage,
                isVisible: employeesPage?.style.display !== 'none'
            });
            
            if (employeesPage && employeesPage.style.display !== 'none') {
                console.log('📊 [EMPLOYEE-MANAGER] ✅ UPDATING employee statistics with transaction');
                
                // Update employee statistics immediately without API call
                this.updateEmployeeStatsWithNewTransaction(transaction);
            } else {
                console.log('⏳ [EMPLOYEE-MANAGER] Not on employees page, skipping update');
            }
        });
    }
    
    // Refresh employee data after transaction (backend handles stats calculation)
    updateEmployeeStatsWithNewTransaction(transaction) {
        console.log('🔄 [EMPLOYEE-MANAGER] Transaction completed, refreshing employee data from backend');
        
        // Backend employeeStatsManager handles all calculations automatically
        // Just refresh the display to show updated backend data
        const employeesPage = document.getElementById('employees');
        if (employeesPage && employeesPage.style.display !== 'none') {
            console.log('📊 [EMPLOYEE-MANAGER] Reloading employee data from backend API...');
            this.loadEmployees().then(() => {
                console.log('✅ [EMPLOYEE-MANAGER] Employee data refreshed from backend');
            });
        }
    }
    
    // Get authentication token for API requests
    getAuthToken() {
        // Use global token manager if available
        if (window.getAuthToken) {
            return window.getAuthToken();
        }
        
        // Check auth system if available
        if (window.authSystem && window.authSystem.authToken) {
            return window.authSystem.authToken;
        }
        
        // Check multiple possible token locations
        const possibleKeys = ['authToken', 'userToken', 'jwt_token', 'token'];
        
        for (const key of possibleKeys) {
            // Check localStorage first
            let token = localStorage.getItem(key);
            if (token && token !== 'null' && token !== 'undefined') {
                return token;
            }
            
            // Then check sessionStorage
            token = sessionStorage.getItem(key);
            if (token && token !== 'null' && token !== 'undefined') {
                return token;
            }
        }
        
        // SECURITY FIX: Removed development token generation to prevent cross-user data access
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.warn('🚨 No auth token found - user must login properly for security');
            console.log('🔐 Development tokens disabled to prevent data contamination');
        }
        
        return null;
    }

    async init() {
        await this.loadEmployees();
        this.setupEventListeners();
        
        // Auto-sync local employees in background
        if (navigator.onLine) {
            setTimeout(() => {
                console.log('🔄 Auto-syncing local employees...');
                this.syncLocalEmployees().catch(console.error);
            }, 3000); // Wait 3 seconds after init
        }
    }

    setupEventListeners() {
        if (this._listenersAttached) return;
        
        // Check if we're actually on the employees page before setting up listeners
        const employeesPage = document.getElementById('employees');
        if (!employeesPage) {
            console.log('🔍 [EMPLOYEES] Not on employees page, skipping event listener setup');
            return;
        }
        
        this._listenersAttached = true;
        // Add employee button
        const addBtn = document.getElementById('addEmployeeBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                // Check if user can access employee feature
                if (window.requiresUpgrade && window.requiresUpgrade('employees')) {
                    window.showFeatureLockedMessage('employees', 'manage employees');
                    return;
                }
                
                // Check plan limits
                if (window.checkPlanLimits) {
                    window.checkPlanLimits('employees').then(limitReached => {
                        if (limitReached) {
                            window.showLimitReachedMessage('employees');
                            return;
                        }
                        this.editingEmployee = null;
                        document.getElementById('employeeModalTitle').textContent = 'Add Employee';
                        document.getElementById('employeeForm').reset();
                        // Set default values for new employee
                        document.getElementById('employeeWageType').value = 'daily';
                        document.getElementById('employeeOvertimeMultiplier').value = '1.25';
                        openModal('employeeModal');
                        
                        // Setup salary calculation listeners after modal opens
                        setTimeout(() => {
                            window.setupEmployeeSalaryListeners();
                        }, 100);
                    });
                } else {
                    this.editingEmployee = null;
                    document.getElementById('employeeModalTitle').textContent = 'Add Employee';
                    document.getElementById('employeeForm').reset();
                    // Set default values for new employee
                    document.getElementById('employeeWageType').value = 'daily';
                    document.getElementById('employeeOvertimeMultiplier').value = '1.25';
                    openModal('employeeModal');
                    
                    // Setup salary calculation listeners after modal opens
                    setTimeout(() => {
                        window.setupEmployeeSalaryListeners();
                    }, 100);
                }
            });
        }

        // Employee form submission with double-click protection
        const form = document.getElementById('employeeForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitBtn = e.target.querySelector('button[type="submit"]');
                if (submitBtn && submitBtn.disabled) return; // Already processing
                await this.saveEmployee();
            });
        }

        // Search functionality
        const searchInput = document.getElementById('employeeSearchInput');
        const clearSearchBtn = document.getElementById('clearEmployeeSearch');
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
            
            searchInput.addEventListener('keyup', (e) => {
                if (e.key === 'Escape') {
                    this.clearSearch();
                }
            });
        }
        
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                this.clearSearch();
            });
        }
    }

    async loadEmployees() {
        try {
            console.log('👥 [EMPLOYEE-MANAGER] loadEmployees() called - STARTING LOAD...');
            console.log('👥 [EMPLOYEE-MANAGER] HybridAPIClient available:', !!window.HybridAPIClient);
            console.log('👥 [EMPLOYEE-MANAGER] Database available:', !!window.db);
            console.log('👥 [EMPLOYEE-MANAGER] Online status:', { 
                isOnline: navigator.onLine, 
                hybridOnline: window.HybridAPIClient?.isOnline 
            });
            
            if (!window.HybridAPIClient) {
                console.error('❌ [EMPLOYEE-MANAGER] HybridAPIClient not available!');
                this.employees = [];
                this.filteredEmployees = [];
                await this.displayEmployees();
                return;
            }
            
            // Debug all available tokens
            if (window.HybridAPIClient.debugAllTokens) {
                console.log('🔍 [EMPLOYEE-MANAGER] Debugging tokens before employee request...');
                window.HybridAPIClient.debugAllTokens();
            }
            
            console.log('👥 [EMPLOYEE-MANAGER] Calling HybridAPIClient.getEmployees()...');
            
            // Use HybridAPIClient for online/offline support
            const result = await window.HybridAPIClient.getEmployees();
            
            console.log('👥 [EMPLOYEE-MANAGER] HybridAPIClient.getEmployees() completed:', {
                success: result.success,
                dataCount: result.data?.length || 0,
                error: result.error,
                queued: result.queued,
                source: result.source,
                fullResult: result
            });
            
            if (result.success) {
                let employees = result.data || [];
                console.log('🔍 [EMPLOYEE-MANAGER] DETAILED ANALYSIS:', {
                    resultSuccess: result.success,
                    hasData: !!result.data,
                    dataType: typeof result.data,
                    isArray: Array.isArray(result.data),
                    dataLength: result.data?.length,
                    dataKeys: result.data ? Object.keys(result.data) : 'NO DATA',
                    firstItem: result.data?.[0] || result.data?.employees?.[0] || 'NO FIRST ITEM'
                });
                
                console.log(`✅ [EMPLOYEE-MANAGER] Loaded ${employees.length} employees from ${result.source || 'API'}`);
                console.log('👥 [EMPLOYEE-MANAGER] Raw employee data sample:', employees.slice(0, 2));
                
                // Convert MongoDB data for PWA compatibility
                employees = employees.map(emp => ({
                    ...emp,
                    id: emp._id || emp.id, // Map MongoDB _id to frontend id field
                    name: emp.firstName ? `${emp.firstName} ${emp.lastName}`.trim() : emp.name
                }));
                
                console.log('👥 [EMPLOYEE-MANAGER] Processed employee data sample:', employees.slice(0, 2));
                
                this.employees = employees;
                this.filteredEmployees = employees; // Initialize filtered list
                console.log('👥 [EMPLOYEE-MANAGER] Employee arrays updated:', {
                    employeesCount: this.employees.length,
                    filteredCount: this.filteredEmployees.length
                });
                
                // 🔧 CRITICAL FIX: Store employees in IndexedDB for sync to work
                console.log('💾 [EMPLOYEE-MANAGER] IndexedDB storage check:', {
                    dbAvailable: !!window.db,
                    employeesLength: employees.length,
                    firstEmployee: employees[0]
                });
                
                if (window.db && employees.length > 0) {
                    console.log('💾 [EMPLOYEE-MANAGER] Storing employees in IndexedDB...');
                    try {
                        // Clear existing employees first
                        console.log('🗑️ [EMPLOYEE-MANAGER] Clearing existing employees...');
                        await window.db.clearStore('employees');
                        
                        // Add each employee to IndexedDB
                        console.log('📝 [EMPLOYEE-MANAGER] Adding employees to IndexedDB...');
                        for (const employee of employees) {
                            const employeeToStore = {
                                ...employee,
                                syncStatus: 'stored',
                                lastStoredDate: new Date().toISOString()
                            };
                            console.log('📝 [EMPLOYEE-MANAGER] Storing employee:', employeeToStore.name, 'ID:', employeeToStore.id);
                            await window.db.add('employees', employeeToStore);
                        }
                        
                        console.log(`✅ [EMPLOYEE-MANAGER] Stored ${employees.length} employees in IndexedDB`);
                        
                        // Verify storage
                        const storedEmployees = await window.db.getAll('employees');
                        console.log(`🔍 [EMPLOYEE-MANAGER] Verification: ${storedEmployees.length} employees now in IndexedDB`);
                        
                    } catch (dbError) {
                        console.error('❌ [EMPLOYEE-MANAGER] Failed to store employees in IndexedDB:', dbError);
                        console.error('❌ [EMPLOYEE-MANAGER] Full error details:', dbError.stack);
                    }
                } else {
                    console.warn('⚠️ [EMPLOYEE-MANAGER] IndexedDB not available or no employees to store:', {
                        dbAvailable: !!window.db,
                        employeesLength: employees.length
                    });
                }
                
                await this.displayEmployees();
                console.log('👥 [EMPLOYEE-MANAGER] displayEmployees() completed');
            } else {
                console.error('❌ [EMPLOYEE-MANAGER] Failed to load employees:', result.error || 'Unknown error');
                console.log('👥 [EMPLOYEE-MANAGER] Full error result:', result);
                
                if (window.logger) {
                    window.logger.error('Failed to load employees', {
                        category: 'EMPLOYEES',
                        operation: 'load_employees_hybrid',
                        error: result.error
                    });
                }
                this.employees = [];
                this.filteredEmployees = [];
                await this.displayEmployees();
            }
        } catch (error) {
            console.error('❌ Critical error loading employees:', error);
            if (window.logger) {
                window.logger.error('Critical error loading employees', {
                    category: 'EMPLOYEES',
                    operation: 'load_employees_critical',
                    error: error
                });
            }
            this.employees = [];
            this.filteredEmployees = [];
            await this.displayEmployees();
        }
    }

    async displayEmployees() {
        const grid = document.getElementById('employeesGrid');
        if (!grid) return;

        let employeesToShow = this.filteredEmployees || this.employees;

        // Deduplicate employees by name (keep the one with highest sales)
        const uniqueEmployees = new Map();
        employeesToShow.forEach(emp => {
            const key = emp.name || `${emp.firstName} ${emp.lastName}`.trim();
            const existing = uniqueEmployees.get(key);
            
            // Keep the employee with higher sales (or the first one if no sales)
            if (!existing || (emp.totalSales || 0) > (existing.totalSales || 0)) {
                uniqueEmployees.set(key, emp);
            }
        });
        employeesToShow = Array.from(uniqueEmployees.values());

        if (employeesToShow.length === 0) {
            const message = this.searchTerm 
                ? `No employees found matching "${this.searchTerm}". Try a different search term.`
                : 'No employees found. Click "Add Employee" to create one.';
            
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                    <i class="fas fa-${this.searchTerm ? 'search' : 'users'}" style="font-size: 3rem; color: var(--gray-light); margin-bottom: 1rem;"></i>
                    <p>${message}</p>
                    ${this.searchTerm ? '<button class="btn btn-secondary" onclick="employeeManager.clearSearch()">Clear Search</button>' : ''}
                </div>
            `;
            return;
        }

        // Use backend-calculated employee statistics (single source of truth)
        const employeesWithStats = employeesToShow.map(emp => {
            // Return employee data with backend-calculated stats
            return {
                ...emp,
                totalSales: emp.totalSales || 0,
                totalCommission: emp.totalCommission || 0,
                transactionCount: emp.totalTransactions || 0
            };
        });

        grid.innerHTML = employeesWithStats.map(emp => `
            <div class="employee-card">
                <div class="employee-header">
                    <div class="employee-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="employee-info">
                        <h3>${emp.name}</h3>
                        <p>${emp.position}</p>
                    </div>
                </div>
                <div class="employee-details" style="margin: 1rem 0;">
                    ${emp.email ? `<p><i class="fas fa-envelope"></i> ${emp.email}</p>` : ''}
                    ${emp.phone ? `<p><i class="fas fa-phone"></i> ${emp.phone}</p>` : ''}
                    ${emp.hireDate ? `<p><i class="fas fa-calendar"></i> Hired: ${app.formatDate(emp.hireDate)}</p>` : ''}
                    
                    <!-- Salary Information -->
                    <div style="border-top: 1px solid #e5e7eb; padding-top: 0.75rem; margin-top: 0.75rem;">
                        <p style="font-weight: 600; color: #374151; margin-bottom: 0.5rem;">₱ Salary Configuration</p>
                        <p style="margin-left: 1rem; font-size: 0.9rem;"><i class="fas fa-briefcase"></i> Type: ${emp.wageType === 'monthly' ? 'Monthly Salary' : 'Daily Wage'}</p>
                        ${emp.dailyRate && emp.dailyRate > 0 ? `<p style="margin-left: 1rem; font-size: 0.9rem;"><i class="fas fa-calendar-day"></i> Daily: ₱${emp.dailyRate.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>` : ''}
                        ${emp.monthlyRate && emp.monthlyRate > 0 ? `<p style="margin-left: 1rem; font-size: 0.9rem;"><i class="fas fa-calendar-alt"></i> Monthly: ₱${emp.monthlyRate.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>` : ''}
                        ${emp.hourlyRate && emp.hourlyRate > 0 ? `<p style="margin-left: 1rem; font-size: 0.9rem;"><i class="fas fa-clock"></i> Hourly: ₱${emp.hourlyRate.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>` : ''}
                        ${emp.overtimeMultiplier ? `<p style="margin-left: 1rem; font-size: 0.9rem;"><i class="fas fa-clock"></i> OT Rate: ${emp.overtimeMultiplier}x</p>` : ''}
                        ${(!emp.dailyRate || emp.dailyRate === 0) && (!emp.monthlyRate || emp.monthlyRate === 0) ? `<p style="margin-left: 1rem; font-size: 0.9rem; color: #dc2626;"><i class="fas fa-exclamation-triangle"></i> No salary configured</p>` : ''}
                    </div>
                    
                    ${emp.commissionRate ? `<p><i class="fas fa-percentage"></i> Commission: ${emp.commissionRate}%</p>` : ''}
                </div>
                <div class="employee-stats">
                    <div class="employee-stat">
                        <div class="employee-stat-label">Total Sales</div>
                        <div class="employee-stat-value">${app.formatCurrency(emp.totalSales)}</div>
                    </div>
                    <div class="employee-stat">
                        <div class="employee-stat-label">Commission</div>
                        <div class="employee-stat-value">${app.formatCurrency(emp.totalCommission)}</div>
                    </div>
                    <div class="employee-stat">
                        <div class="employee-stat-label">Transactions</div>
                        <div class="employee-stat-value">${emp.transactionCount}</div>
                    </div>
                    <div class="employee-stat">
                        <div class="employee-stat-label">Avg Sale</div>
                        <div class="employee-stat-value">
                            ${emp.transactionCount > 0 ? 
                                app.formatCurrency(emp.totalSales / emp.transactionCount) : 
                                app.formatCurrency(0)
                            }
                        </div>
                    </div>
                </div>
                <div style="margin-top: 1rem; display: flex; gap: 0.25rem; flex-wrap: wrap;">
                    <button class="btn btn-primary" onclick="employeeManager.viewEmployee('${emp.id}')" style="flex: 1; min-width: 80px; font-size: 0.85rem; padding: 0.4rem 0.5rem;">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn btn-secondary" onclick="employeeManager.editEmployee('${emp.id}')" style="flex: 1; min-width: 80px; font-size: 0.85rem; padding: 0.4rem 0.5rem;">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-danger" onclick="employeeManager.deleteEmployee('${emp.id}')" style="flex: 1; min-width: 80px; font-size: 0.85rem; padding: 0.4rem 0.5rem;">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    async viewEmployee(id) {
        try {
            let employee = null;
            
            // First check if it's a local employee
            const localEmployees = this.employees.filter(emp => (emp.id === id || emp._id === id));
            if (localEmployees.length > 0) {
                console.log('📦 Using local employee data for viewing');
                employee = localEmployees[0];
            } else {
                // Get employee from MongoDB API
                const token = this.getAuthToken();
                if (!token) {
                    console.error('❌ No authentication token for viewing employee');
                    showError('Authentication required - please log in');
                    return;
                }

                // Fetch employee using HybridAPIClient
                const empResult = await window.HybridAPIClient.get(`/api/employees/${id}`, `employee_${id}`);
                
                if (!empResult.success) {
                    // Try to get from IndexedDB as fallback
                    if (window.db && window.db.db) {
                        try {
                            employee = await window.db.get('employees', id);
                            if (!employee) {
                                // Try with _id field
                                const allEmployees = await window.db.getAll('employees');
                                employee = allEmployees.find(e => e._id === id || e.id === id);
                            }
                        } catch (dbError) {
                            console.error('❌ Failed to get employee from IndexedDB:', dbError);
                        }
                    }
                    
                    if (!employee) {
                        console.error('❌ Failed to fetch employee details:', empResult.error);
                        showError('Failed to load employee details');
                        return;
                    }
                } else {
                    employee = empResult.data;
                }
            }
            
            if (!employee) {
                console.error('❌ Employee not found');
                showError('Employee not found');
                return;
            }

            // Convert MongoDB data for frontend compatibility  
            employee.id = employee._id || employee.id; // Map MongoDB _id to frontend id field
            employee.name = employee.firstName ? `${employee.firstName} ${employee.lastName}`.trim() : employee.name;

            // Get employee statistics from MongoDB API
            let totalSales = 0;
            let totalCommission = 0;
            let transactionCount = 0;
            let avgSale = 0;

            try {
                const transResponse = await fetch(`${window.API_CONFIG?.BASE_URL || 'https://daetspa-backend.onrender.com'}/api/transactions`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (transResponse.ok) {
                    const transResult = await transResponse.json();
                    const allTransactions = transResult.data || [];
                    
                    // Filter transactions for this employee (same logic as displayEmployees)
                    const employeeTransactions = allTransactions.filter(t => {
                        if (!t.employee) return false;
                        
                        const empIdStr = String(employee.id);
                        const empName = employee.name;
                        
                        return (t.employee.id && (String(t.employee.id) === empIdStr || String(t.employee.id) === String(employee.id))) ||
                               (t.employee.name && t.employee.name === empName) ||
                               (t.employeeId && (String(t.employeeId) === empIdStr || String(t.employeeId) === String(employee.id)));
                    });

                    totalSales = employeeTransactions.reduce((sum, t) => sum + (t.total || 0), 0);
                    totalCommission = totalSales * ((employee.commissionRate || 0) / 100);
                    transactionCount = employeeTransactions.length;
                    avgSale = transactionCount > 0 ? totalSales / transactionCount : 0;
                    
                    console.log(`👁️ [VIEW-EMPLOYEE] ${employee.name}: ${transactionCount} transactions, ₱${totalSales} sales`);
                } else {
                    console.warn('❌ Failed to fetch transactions for employee view');
                }
            } catch (transError) {
                console.warn('Failed to load transaction data for view:', transError);
            }

            // Get attendance data from MongoDB API
            let totalDays = 0;
            try {
                const attResponse = await fetch(`${window.API_CONFIG?.BASE_URL || 'https://daetspa-backend.onrender.com'}/api/attendance?employeeId=${employee.id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (attResponse.ok) {
                    const attResult = await attResponse.json();
                    totalDays = (attResult.data || []).length;
                    console.log(`📅 [VIEW-EMPLOYEE] ${employee.name}: ${totalDays} attendance days`);
                } else {
                    console.warn('❌ Failed to fetch attendance data:', attResponse.status);
                }
            } catch (attError) {
                console.warn('Failed to load attendance data:', attError);
            }

            // Format hire date
            const hireDate = employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : 'Not specified';

            // Create view modal content
            const modalContent = `
                <div class="modal-header">
                    <h2><i class="fas fa-user"></i> ${employee.name} - Employee Details</h2>
                    <button type="button" class="close-btn" onclick="closeModal('employeeViewModal')">&times;</button>
                </div>
                <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
                        <!-- Personal Information -->
                        <div class="info-section">
                            <h3 style="color: var(--primary-color); margin-bottom: 1rem; border-bottom: 2px solid var(--primary-color); padding-bottom: 0.5rem;">
                                <i class="fas fa-id-card"></i> Personal Information
                            </h3>
                            <div class="info-item">
                                <strong>Full Name:</strong> ${employee.name}
                            </div>
                            <div class="info-item">
                                <strong>Position:</strong> ${employee.position}
                            </div>
                            <div class="info-item">
                                <strong>Email:</strong> ${employee.email || 'Not provided'}
                            </div>
                            <div class="info-item">
                                <strong>Phone:</strong> ${employee.phone || 'Not provided'}
                            </div>
                            <div class="info-item">
                                <strong>Hire Date:</strong> ${hireDate}
                            </div>
                        </div>

                        <!-- Salary Configuration -->
                        <div class="info-section">
                            <h3 style="color: var(--primary-color); margin-bottom: 1rem; border-bottom: 2px solid var(--primary-color); padding-bottom: 0.5rem;">
                                <i class="fas fa-money-bill-wave"></i> Salary Configuration
                            </h3>
                            <div class="info-item">
                                <strong>Wage Type:</strong> ${employee.wageType === 'monthly' ? 'Monthly Salary' : 'Daily Wage'}
                            </div>
                            ${employee.dailyRate && employee.dailyRate > 0 ? `<div class="info-item"><strong>Daily Rate:</strong> ₱${employee.dailyRate.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>` : ''}
                            ${employee.monthlyRate && employee.monthlyRate > 0 ? `<div class="info-item"><strong>Monthly Rate:</strong> ₱${employee.monthlyRate.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>` : ''}
                            ${employee.hourlyRate && employee.hourlyRate > 0 ? `<div class="info-item"><strong>Hourly Rate:</strong> ₱${employee.hourlyRate.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>` : ''}
                            <div class="info-item">
                                <strong>Overtime Multiplier:</strong> ${employee.overtimeMultiplier || '1.25'}x
                            </div>
                            <div class="info-item">
                                <strong>Commission Rate:</strong> ${employee.commissionRate || 0}%
                            </div>
                            ${(!employee.dailyRate || employee.dailyRate === 0) && (!employee.monthlyRate || employee.monthlyRate === 0) && (!employee.hourlyRate || employee.hourlyRate === 0) ? 
                                `<div class="info-item" style="color: #dc2626; background-color: #fef2f2; padding: 0.75rem; border-radius: 6px; border: 1px solid #fecaca;">
                                    <strong><i class="fas fa-exclamation-triangle"></i> No Salary Configured:</strong> This employee has no daily, monthly, or hourly rate set. Please edit the employee to configure their salary.
                                </div>` : 
                                `<div class="info-item" style="color: #059669; background-color: #ecfdf5; padding: 0.75rem; border-radius: 6px; border: 1px solid #a7f3d0;">
                                    <strong><i class="fas fa-check-circle"></i> Salary Configured:</strong> Employee has salary rates properly configured.
                                </div>`
                            }
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
                        <!-- Government Benefits -->
                        <div class="info-section">
                            <h3 style="color: var(--primary-color); margin-bottom: 1rem; border-bottom: 2px solid var(--primary-color); padding-bottom: 0.5rem;">
                                <i class="fas fa-shield-alt"></i> Government Benefits
                            </h3>
                            <div class="info-item">
                                <strong>SSS:</strong> <span style="color: ${employee.hasSSS ? 'green' : 'red'};">
                                    <i class="fas fa-${employee.hasSSS ? 'check-circle' : 'times-circle'}"></i> 
                                    ${employee.hasSSS ? 'Enrolled' : 'Not Enrolled'}
                                </span>
                            </div>
                            <div class="info-item">
                                <strong>PhilHealth:</strong> <span style="color: ${employee.hasPhilHealth ? 'green' : 'red'};">
                                    <i class="fas fa-${employee.hasPhilHealth ? 'check-circle' : 'times-circle'}"></i> 
                                    ${employee.hasPhilHealth ? 'Enrolled' : 'Not Enrolled'}
                                </span>
                            </div>
                            <div class="info-item">
                                <strong>Pag-IBIG:</strong> <span style="color: ${employee.hasPagibig ? 'green' : 'red'};">
                                    <i class="fas fa-${employee.hasPagibig ? 'check-circle' : 'times-circle'}"></i> 
                                    ${employee.hasPagibig ? 'Enrolled' : 'Not Enrolled'}
                                </span>
                            </div>
                        </div>

                        <!-- Performance Statistics -->
                        <div class="info-section">
                            <h3 style="color: var(--primary-color); margin-bottom: 1rem; border-bottom: 2px solid var(--primary-color); padding-bottom: 0.5rem;">
                                <i class="fas fa-chart-line"></i> Performance Statistics
                            </h3>
                            <div class="info-item">
                                <strong>Total Sales:</strong> ₱${totalSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </div>
                            <div class="info-item">
                                <strong>Total Commission:</strong> ₱${totalCommission.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </div>
                            <div class="info-item">
                                <strong>Transactions:</strong> ${transactionCount}
                            </div>
                            <div class="info-item">
                                <strong>Average Sale:</strong> ₱${avgSale.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </div>
                            <div class="info-item">
                                <strong>Attendance Days:</strong> ${totalDays}
                            </div>
                        </div>
                    </div>

                    <!-- System Information -->
                    <div class="info-section" style="grid-column: 1/-1;">
                        <h3 style="color: var(--primary-color); margin-bottom: 1rem; border-bottom: 2px solid var(--primary-color); padding-bottom: 0.5rem;">
                            <i class="fas fa-cogs"></i> System Information
                        </h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            <div class="info-item">
                                <strong>Employee ID:</strong> ${employee.id}
                            </div>
                            <div class="info-item">
                                <strong>Created:</strong> ${employee.createdAt ? new Date(employee.createdAt).toLocaleString() : 'Not available'}
                            </div>
                            <div class="info-item">
                                <strong>Last Modified:</strong> ${employee.modifiedAt ? new Date(employee.modifiedAt).toLocaleString() : 'Not available'}
                            </div>
                            <div class="info-item">
                                <strong>Sync Status:</strong> <span style="color: ${employee.syncStatus === 'synced' ? 'green' : 'orange'};">
                                    ${employee.syncStatus || 'pending'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer" style="justify-content: flex-end;">
                    <button type="button" class="btn btn-primary" onclick="closeModal('employeeViewModal')">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
            `;

            // Create or update the view modal
            let viewModal = document.getElementById('employeeViewModal');
            if (!viewModal) {
                viewModal = document.createElement('div');
                viewModal.id = 'employeeViewModal';
                viewModal.className = 'modal';
                viewModal.innerHTML = `<div class="modal-content" style="max-width: 900px;">${modalContent}</div>`;
                document.body.appendChild(viewModal);
            } else {
                viewModal.querySelector('.modal-content').innerHTML = modalContent;
            }

            // Add CSS styles for the view modal
            if (!document.getElementById('employeeViewStyles')) {
                const styles = document.createElement('style');
                styles.id = 'employeeViewStyles';
                styles.textContent = `
                    .info-section {
                        background: #f8f9fa;
                        padding: 1.5rem;
                        border-radius: 8px;
                        border: 1px solid #e9ecef;
                    }
                    .info-item {
                        margin-bottom: 0.75rem;
                        padding: 0.5rem 0;
                        border-bottom: 1px solid #e9ecef;
                    }
                    .info-item:last-child {
                        border-bottom: none;
                        margin-bottom: 0;
                    }
                    .info-item strong {
                        color: #495057;
                        display: inline-block;
                        min-width: 140px;
                    }
                `;
                document.head.appendChild(styles);
            }

            openModal('employeeViewModal');
        } catch (error) {
            if (window.logger) {
                window.logger.error('Failed to view employee', {
                    category: 'EMPLOYEES',
                    operation: 'view_employee',
                    error: error
                });
            } else {
                console.error('Failed to view employee:', error);
            }
            showError('Failed to load employee details');
        }
    }

    async editEmployee(id) {
        try {
            // Get employee from MongoDB API instead of IndexedDB
            const token = this.getAuthToken();
            if (!token) {
                console.error('❌ No authentication token for editing employee');
                showError('Authentication required - please log in');
                return;
            }

            // Fetch employee from MongoDB
            const response = await fetch(`${window.API_CONFIG?.BASE_URL || 'https://daetspa-backend.onrender.com'}/api/employees/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error('❌ Failed to fetch employee for editing:', response.status);
                showError('Failed to load employee for editing');
                return;
            }

            const result = await response.json();
            const employee = result.data;
            if (!employee) {
                console.error('❌ Employee not found for editing');
                showError('Employee not found');
                return;
            }

            // Convert MongoDB data for form compatibility
            employee.id = employee._id || employee.id; // Map MongoDB _id to frontend id field
            employee.name = employee.firstName ? `${employee.firstName} ${employee.lastName}`.trim() : employee.name;

            this.editingEmployee = employee;
            document.getElementById('employeeModalTitle').textContent = 'Edit Employee';
            
            // Fill basic form fields
            document.getElementById('employeeName').value = employee.name;
            document.getElementById('employeePosition').value = employee.position;
            document.getElementById('employeeEmail').value = employee.email || '';
            document.getElementById('employeePhone').value = employee.phone || '';
            document.getElementById('employeeCommission').value = employee.commissionRate || '';
            document.getElementById('employeeHireDate').value = employee.hireDate || '';
            
            // Fill salary fields with defaults for backward compatibility
            document.getElementById('employeeWageType').value = employee.wageType || 'daily';
            document.getElementById('employeeDailyRate').value = employee.dailyRate || '';
            document.getElementById('employeeMonthlyRate').value = employee.monthlyRate || '';
            document.getElementById('employeeHourlyRate').value = employee.hourlyRate || '';
            document.getElementById('employeeOvertimeMultiplier').value = employee.overtimeMultiplier || '1.25';
            
            // Fill government benefits checkboxes
            document.getElementById('employeeHasSSS').checked = employee.hasSSS || false;
            document.getElementById('employeeHasPhilHealth').checked = employee.hasPhilHealth || false;
            document.getElementById('employeeHasPagibig').checked = employee.hasPagibig || false;

            openModal('employeeModal');
            
            // Setup salary calculation listeners after modal opens
            setTimeout(() => {
                window.setupEmployeeSalaryListeners();
            }, 100);
        } catch (error) {
            if (window.logger) {
                window.logger.error('Failed to edit employee', {
                    category: 'EMPLOYEES',
                    operation: 'edit_employee',
                    error: error
                });
            } else {
                console.error('Failed to edit employee:', error);
            }
        }
    }

    async deleteEmployee(id) {
        if (!confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
            return;
        }

        console.log('🗑️ Deleting employee from MongoDB...');
        
        const token = this.getAuthToken();
        if (!token) {
            console.error('❌ No authentication token found for deleting employee');
            showError('Authentication required - please log in');
            return;
        }

        try {
            const response = await fetch(`${window.API_CONFIG?.BASE_URL || 'https://daetspa-backend.onrender.com'}/api/employees/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                console.log('✅ Employee deleted from MongoDB');
                showSuccess('Employee deleted successfully');
                await this.loadEmployees();
            } else {
                console.error('❌ Failed to delete employee:', response.status);
                showError('Failed to delete employee');
            }
        } catch (error) {
            console.error('❌ Failed to delete employee from MongoDB:', error);
            if (window.logger) {
                window.logger.error('Failed to delete employee from MongoDB', {
                    category: 'EMPLOYEES',
                    operation: 'delete_employee_mongodb',
                    error: error
                });
            }
            showError('Failed to delete employee');
        }
    }

    async saveEmployee() {
        // Prevent duplicate submissions
        if (this.isSaving) {
            return;
        }
        this.isSaving = true;

        // Show loading - check multiple selectors for submit button
        let saveBtn = document.querySelector('#employeeForm button[type="submit"]');
        if (!saveBtn) {
            // Try alternative selector for button with form attribute
            saveBtn = document.querySelector('button[form="employeeForm"][type="submit"]');
        }
        if (!saveBtn) {
            // Try broader selector
            saveBtn = document.querySelector('button[type="submit"]');
            console.warn('Using fallback submit button selector for employees');
        }
        if (!saveBtn) {
            console.error('Save button not found in employeeForm with any selector');
            this.isSaving = false;
            return;
        }
        const originalText = saveBtn.innerHTML;
        saveBtn.classList.add('loading');
        saveBtn.disabled = true;
        
        showLoading('Saving Employee...');
        
        try {
            // Split the name field into firstName and lastName for backend compatibility
            const fullName = document.getElementById('employeeName').value.trim();
            const nameParts = fullName.split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || 'N/A'; // Backend requires lastName
            
            const employeeData = {
                // Backend model fields (firstName/lastName)
                firstName: firstName,
                lastName: lastName,
                position: document.getElementById('employeePosition').value,
                email: document.getElementById('employeeEmail').value,
                phone: document.getElementById('employeePhone').value,
                commissionRate: parseFloat(document.getElementById('employeeCommission').value || '0') || 0,
                hireDate: document.getElementById('employeeHireDate').value,
                // Salary Configuration
                wageType: document.getElementById('employeeWageType')?.value || 'daily',
                dailyRate: parseFloat(document.getElementById('employeeDailyRate')?.value || '0') || 0,
                monthlyRate: parseFloat(document.getElementById('employeeMonthlyRate')?.value || '0') || 0,
                hourlyRate: parseFloat(document.getElementById('employeeHourlyRate')?.value || '0') || 0,
                overtimeMultiplier: parseFloat(document.getElementById('employeeOvertimeMultiplier')?.value || '1.25') || 1.25,
                // Government Benefits
                hasSSS: document.getElementById('employeeHasSSS')?.checked || false,
                hasPhilHealth: document.getElementById('employeeHasPhilHealth')?.checked || false,
                hasPagibig: document.getElementById('employeeHasPagibig')?.checked || false,
                // Backend compatibility
                isActive: true,
                syncStatus: 'synced', // Direct MongoDB save
                modifiedAt: new Date().toISOString()
            };

            let token = this.getAuthToken();
            
            // For development, check if user is properly authenticated
            if (!token) {
                // Check if we have a logged-in user
                if (window.authSystem && window.authSystem.isAuthenticated && window.authSystem.isAuthenticated()) {
                    // Try to get token from authSystem
                    token = window.authSystem.authToken;
                    console.log('🔑 Using token from authSystem for employee save');
                }
                
                // Also check TokenManager
                if (!token && window.tokenManager && window.tokenManager.getAuthToken) {
                    token = window.tokenManager.getAuthToken();
                    console.log('🔑 Using token from TokenManager for employee save');
                }
            }
            
            console.log('📝 Employee data to save:', employeeData);
            console.log('🔐 Auth token available:', !!token);
            
            if (!token) {
                console.error('❌ No authentication token found for saving employee');
                hideLoading();
                saveBtn.classList.remove('loading');
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
                showError('Authentication required - please log in');
                this.isSaving = false;
                return;
            }

            if (this.editingEmployee) {
                console.log('📝 Updating employee in MongoDB...');
                // Update existing employee via API
                employeeData.id = this.editingEmployee.id;
                employeeData.createdAt = this.editingEmployee.createdAt;
                
                const response = await fetch(`${window.API_CONFIG?.BASE_URL || 'https://daetspa-backend.onrender.com'}/api/employees/${this.editingEmployee.id}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(employeeData)
                });
                
                if (response.ok) {
                    console.log('✅ Employee updated in MongoDB');
                    hideLoading();
                    saveBtn.classList.remove('loading');
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = originalText;
                    closeModal('employeeModal');
                    showSuccess('Employee updated successfully');
                } else {
                    console.error('❌ Failed to update employee:', response.status);
                    hideLoading();
                    saveBtn.classList.remove('loading');
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = originalText;
                    showError('Failed to update employee');
                    return;
                }
            } else {
                console.log('➕ Adding new employee to MongoDB...');
                // Add new employee via API
                employeeData.createdAt = new Date().toISOString();
                
                // Try both endpoints - first the standard one, then business endpoint
                let response;
                let endpoint = '/api/employees';
                
                try {
                    response = await fetch(`${window.API_CONFIG?.BASE_URL || 'https://daetspa-backend.onrender.com'}${endpoint}`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(employeeData)
                    });
                    
                    // If first endpoint fails with 404, try business endpoint
                    if (response.status === 404) {
                        console.log('🔄 First endpoint returned 404, trying /api/business/employees...');
                        endpoint = '/api/business/employees';
                        response = await fetch(`${window.API_CONFIG?.BASE_URL || 'https://daetspa-backend.onrender.com'}${endpoint}`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(employeeData)
                        });
                    }
                } catch (error) {
                    console.error('Network error during employee save:', error);
                    response = { ok: false, status: 0 };
                }
                
                if (response.ok) {
                    console.log('✅ Employee added to MongoDB');
                    hideLoading();
                    saveBtn.classList.remove('loading');
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = originalText;
                    closeModal('employeeModal');
                    showSuccess('Employee added successfully');
                } else {
                    const errorText = await response.text();
                    let errorMessage = 'Failed to add employee';
                    try {
                        const errorJson = JSON.parse(errorText);
                        errorMessage = errorJson.error || errorJson.message || errorMessage;
                    } catch (e) {
                        // If not JSON, use the text directly
                        errorMessage = errorText || errorMessage;
                    }
                    console.error(`❌ Failed to add employee via API: ${response.status} - ${errorMessage}`);
                    console.error('Request data:', employeeData);
                    console.error('Response:', errorText);
                    
                    // Try to save locally to IndexedDB as fallback
                    console.log('💾 Attempting to save employee locally to IndexedDB...');
                    try {
                        // Generate a local ID
                        employeeData.id = `emp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                        employeeData._id = employeeData.id; // For compatibility
                        employeeData.syncStatus = 'pending'; // Mark for later sync
                        employeeData.localOnly = true; // Mark as local-only until synced
                        
                        // Map name fields for IndexedDB
                        employeeData.name = `${employeeData.firstName} ${employeeData.lastName}`.trim();
                        
                        await window.db.put('employees', employeeData);
                        console.log('✅ Employee saved locally to IndexedDB');
                        
                        // Try to sync immediately if possible
                        if (navigator.onLine) {
                            setTimeout(async () => {
                                console.log('🔄 Attempting immediate sync of local employee...');
                                try {
                                    const syncResponse = await fetch(`${window.API_CONFIG?.BASE_URL || 'https://daetspa-backend.onrender.com'}/api/employees`, {
                                        method: 'POST',
                                        headers: {
                                            'Authorization': `Bearer ${token}`,
                                            'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify({
                                            ...employeeData,
                                            localOnly: undefined, // Remove localOnly flag when syncing
                                            syncStatus: undefined
                                        })
                                    });
                                    
                                    if (syncResponse.ok) {
                                        console.log('✅ Employee synced to server successfully');
                                        // Update local record to remove localOnly flag
                                        employeeData.localOnly = false;
                                        employeeData.syncStatus = 'synced';
                                        await window.db.put('employees', employeeData);
                                    }
                                } catch (syncError) {
                                    console.log('⚠️ Background sync failed, will retry later:', syncError);
                                }
                            }, 2000); // Small delay to ensure UI updates first
                        }
                        
                        hideLoading();
                        saveBtn.classList.remove('loading');
                        saveBtn.disabled = false;
                        saveBtn.innerHTML = originalText;
                        closeModal('employeeModal');
                        showSuccess('Employee added locally (will sync when online)');
                        
                        // Reload employees to show the new one
                        await this.loadEmployees();
                        
                        // Try to sync in the background
                        if (window.HybridAPIClient) {
                            window.HybridAPIClient.queueRequest('POST', '/api/employees', employeeData);
                        }
                        
                        return; // Exit after local save
                    } catch (localError) {
                        console.error('❌ Failed to save locally:', localError);
                        hideLoading();
                        saveBtn.classList.remove('loading');
                        saveBtn.disabled = false;
                        saveBtn.innerHTML = originalText;
                        showError(`Failed to save employee: ${errorMessage}`);
                        return;
                    }
                }
            }

            await this.loadEmployees();

            // Reload POS if it's the current page to update employee dropdown
            if (window.app.currentPage === 'pos') {
                window.loadPOS && window.loadPOS();
            }
        } catch (error) {
            console.error('Failed to save employee:', error);
            
            // Try to save locally as last resort
            console.log('💾 Network error - attempting local save to IndexedDB...');
            try {
                // Generate a local ID if not editing
                if (!this.editingEmployee) {
                    employeeData.id = `emp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    employeeData._id = employeeData.id;
                    employeeData.syncStatus = 'pending';
                    employeeData.localOnly = true;
                    employeeData.name = `${employeeData.firstName} ${employeeData.lastName}`.trim();
                    employeeData.createdAt = new Date().toISOString();
                    
                    await window.db.put('employees', employeeData);
                    console.log('✅ Employee saved locally after network error');
                    
                    hideLoading();
                    saveBtn.classList.remove('loading');
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = originalText;
                    closeModal('employeeModal');
                    showSuccess('Employee saved locally (offline mode)');
                    
                    await this.loadEmployees();
                    
                    // Queue for sync
                    if (window.HybridAPIClient) {
                        window.HybridAPIClient.queueRequest('POST', '/api/employees', employeeData);
                    }
                } else {
                    // For editing, just show error
                    hideLoading();
                    saveBtn.classList.remove('loading');
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = originalText;
                    showError('Failed to update employee - please try again');
                }
            } catch (localError) {
                console.error('Failed to save locally:', localError);
                if (window.logger) {
                    window.logger.error('Failed to save employee', {
                        category: 'EMPLOYEES',
                        operation: 'save_employee',
                        error: error,
                        localError: localError
                    });
                }
                hideLoading();
                saveBtn.classList.remove('loading');
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
                showError('Failed to save employee - please check your connection');
            }
        } finally {
            // Always reset the saving flag
            this.isSaving = false;
        }
    }

    // Sync local employees to server
    async syncLocalEmployees() {
        console.log('🔄 Starting local employee sync...');
        
        if (!window.db || !window.db.db) {
            console.log('❌ Database not available for sync');
            return;
        }
        
        const token = this.getAuthToken();
        if (!token) {
            console.log('❌ No auth token for sync');
            return;
        }
        
        try {
            const allEmployees = await window.db.getAll('employees');
            const localEmployees = allEmployees.filter(emp => emp.localOnly === true || emp.syncStatus === 'pending');
            
            console.log(`📦 Found ${localEmployees.length} local employees to sync`);
            
            for (const employee of localEmployees) {
                try {
                    console.log(`🔄 Syncing employee: ${employee.name || employee.firstName}`);
                    
                    // Remove local-only flags before sending
                    const syncData = { ...employee };
                    delete syncData.localOnly;
                    delete syncData.syncStatus;
                    
                    const response = await fetch(`${window.API_CONFIG?.BASE_URL || 'https://daetspa-backend.onrender.com'}/api/employees`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(syncData)
                    });
                    
                    if (response.ok) {
                        console.log(`✅ Employee ${employee.name} synced successfully`);
                        // Update local record
                        employee.localOnly = false;
                        employee.syncStatus = 'synced';
                        await window.db.put('employees', employee);
                    } else {
                        console.log(`⚠️ Failed to sync ${employee.name}: ${response.status}`);
                    }
                } catch (error) {
                    console.error(`❌ Error syncing employee ${employee.name}:`, error);
                }
            }
            
            console.log('✅ Local employee sync complete');
            // Reload employees to show updated status
            await this.loadEmployees();
            
        } catch (error) {
            console.error('❌ Error during sync:', error);
        }
    }
    
    // Generate commission report
    async generateCommissionReport() {
        const startDate = prompt('Enter start date (YYYY-MM-DD):');
        const endDate = prompt('Enter end date (YYYY-MM-DD):');
        
        if (!startDate || !endDate) return;

        const token = this.getAuthToken();
        if (!token) {
            console.error('❌ No authentication token for commission report');
            showError('Authentication required - please log in');
            return;
        }

        const report = [];
        
        try {
            // Get all transactions from MongoDB API
            const response = await fetch(`${window.API_CONFIG?.BASE_URL || 'https://daetspa-backend.onrender.com'}/api/transactions`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error('❌ Failed to fetch transactions for report');
                showError('Failed to load transaction data for report');
                return;
            }

            const result = await response.json();
            const allTransactions = result.data || [];
            
            for (const emp of this.employees) {
                // Filter transactions for this employee and date range
                const employeeTransactions = allTransactions.filter(t => {
                    if (!t.employee) return false;
                    
                    const empIdStr = String(emp.id);
                    const empName = emp.name;
                    const transDate = new Date(t.createdAt || t.date);
                    
                    // Check employee match
                    const employeeMatch = (t.employee.id && (String(t.employee.id) === empIdStr || String(t.employee.id) === String(emp.id))) ||
                                         (t.employee.name && t.employee.name === empName) ||
                                         (t.employeeId && (String(t.employeeId) === empIdStr || String(t.employeeId) === String(emp.id)));
                    
                    // Check date range
                    const dateMatch = transDate >= new Date(startDate) && transDate <= new Date(endDate);
                    
                    return employeeMatch && dateMatch;
                });
                
                const totalSales = employeeTransactions.reduce((sum, t) => sum + (t.total || 0), 0);
                const commission = totalSales * ((emp.commissionRate || 0) / 100);
                
                report.push({
                    employee: emp.name,
                    position: emp.position,
                    totalSales,
                    commissionRate: emp.commissionRate || 0,
                    commission,
                    transactionCount: employeeTransactions.length
                });
            }
        } catch (error) {
            console.error('❌ Failed to generate commission report:', error);
            showError('Failed to generate commission report');
            return;
        }

        // Create CSV
        const headers = ['Employee', 'Position', 'Total Sales', 'Commission Rate', 'Commission', 'Transactions'];
        const rows = report.map(r => [
            r.employee,
            r.position,
            r.totalSales.toFixed(2),
            r.commissionRate + '%',
            r.commission.toFixed(2),
            r.transactionCount
        ]);

        let csv = headers.join(',') + '\n';
        rows.forEach(row => {
            csv += row.map(field => `"${field}"`).join(',') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `commission_report_${startDate}_to_${endDate}.csv`;
        a.click();
    }

    // Search functionality
    handleSearch(searchTerm) {
        this.searchTerm = searchTerm.trim().toLowerCase();
        
        const searchInput = document.getElementById('employeeSearchInput');
        const clearBtn = document.getElementById('clearEmployeeSearch');
        const countElement = document.getElementById('employeeSearchCount');
        
        // Show/hide clear button
        if (clearBtn) {
            clearBtn.style.display = this.searchTerm ? 'flex' : 'none';
        }
        
        if (!this.searchTerm) {
            // Show all employees when search is empty
            this.filteredEmployees = this.employees;
            if (countElement) {
                countElement.style.display = 'none';
            }
        } else {
            // Filter employees based on search term
            this.filteredEmployees = this.employees.filter(employee => {
                const searchableText = [
                    employee.name || '',
                    employee.position || '',
                    employee.email || '',
                    employee.phone || '',
                    employee.wageType || ''
                ].join(' ').toLowerCase();
                
                return searchableText.includes(this.searchTerm);
            });
            
            // Show search result count
            if (countElement) {
                const total = this.employees.length;
                const found = this.filteredEmployees.length;
                countElement.textContent = `${found} of ${total} employees found`;
                countElement.style.display = 'block';
                countElement.style.color = found === 0 ? '#dc2626' : '#059669';
            }
        }
        
        // Re-display employees with filtered results
        this.displayEmployees();
    }
    
    clearSearch() {
        const searchInput = document.getElementById('employeeSearchInput');
        const clearBtn = document.getElementById('clearEmployeeSearch');
        const countElement = document.getElementById('employeeSearchCount');
        
        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
        }
        
        if (clearBtn) {
            clearBtn.style.display = 'none';
        }
        
        if (countElement) {
            countElement.style.display = 'none';
        }
        
        this.searchTerm = '';
        this.filteredEmployees = this.employees;
        this.displayEmployees();
    }
}

// Initialize employee manager
const employeeManager = new EmployeeManager();

// CRITICAL: Make employeeManager globally accessible for attendance system
window.employeeManager = employeeManager;

// Debug functions removed for production
console.log('✅ [EMPLOYEES] EmployeeManager created and made globally accessible');

// Load employees when page is shown
window.loadEmployees = async function() {
    
    await employeeManager.init();
};

// Commission rate helper function
window.setCommissionZero = function() {
    const commissionField = document.getElementById('employeeCommission');
    if (commissionField) {
        commissionField.value = '0';
        commissionField.focus();
        console.log('✅ Commission rate set to 0%');
    }
};

// Salary helper functions
window.setDailyRateZero = function() {
    const dailyRateField = document.getElementById('employeeDailyRate');
    if (dailyRateField) {
        dailyRateField.value = '0';
        dailyRateField.focus();
        window.calculateEmployeeRatesFromDaily();
        console.log('✅ Daily rate set to ₱0');
    }
};

window.setMonthlyRateZero = function() {
    const monthlyRateField = document.getElementById('employeeMonthlyRate');
    if (monthlyRateField) {
        monthlyRateField.value = '0';
        monthlyRateField.focus();
        window.calculateEmployeeRatesFromMonthly();
        console.log('✅ Monthly rate set to ₱0');
    }
};

// Automatic rate calculations for employee form
window.calculateEmployeeRatesFromDaily = function() {
    const dailyRateInput = document.getElementById('employeeDailyRate');
    const monthlyRateInput = document.getElementById('employeeMonthlyRate');
    const hourlyRateInput = document.getElementById('employeeHourlyRate');
    
    if (!dailyRateInput || !monthlyRateInput || !hourlyRateInput) return;
    
    const dailyRate = parseFloat(dailyRateInput.value) || 0;
    
    if (dailyRate >= 0) {
        // Calculate monthly rate (22 working days per month)
        const monthlyRate = dailyRate * 22;
        monthlyRateInput.value = monthlyRate.toFixed(2);
        
        // Calculate hourly rate (8 hours per day)
        const hourlyRate = dailyRate / 8;
        hourlyRateInput.value = hourlyRate.toFixed(2);
        
        console.log(`💰 Employee rates calculated: Daily ₱${dailyRate} → Monthly ₱${monthlyRate.toFixed(2)} → Hourly ₱${hourlyRate.toFixed(2)}`);
    }
};

// Calculate daily and hourly rates from monthly salary
window.calculateEmployeeRatesFromMonthly = function() {
    const dailyRateInput = document.getElementById('employeeDailyRate');
    const monthlyRateInput = document.getElementById('employeeMonthlyRate');
    const hourlyRateInput = document.getElementById('employeeHourlyRate');
    
    if (!dailyRateInput || !monthlyRateInput || !hourlyRateInput) return;
    
    const monthlyRate = parseFloat(monthlyRateInput.value) || 0;
    
    if (monthlyRate >= 0) {
        // Calculate daily rate (22 working days per month)
        const dailyRate = monthlyRate / 22;
        dailyRateInput.value = dailyRate.toFixed(2);
        
        // Calculate hourly rate (8 hours per day)
        const hourlyRate = dailyRate / 8;
        hourlyRateInput.value = hourlyRate.toFixed(2);
        
        console.log(`💰 Employee rates calculated: Monthly ₱${monthlyRate} → Daily ₱${dailyRate.toFixed(2)} → Hourly ₱${hourlyRate.toFixed(2)}`);
    }
};

// Handle wage type changes and enable/disable appropriate fields
window.handleWageTypeChange = function() {
    const wageTypeSelect = document.getElementById('employeeWageType');
    const dailyRateInput = document.getElementById('employeeDailyRate');
    const monthlyRateInput = document.getElementById('employeeMonthlyRate');
    const hourlyRateInput = document.getElementById('employeeHourlyRate');
    
    if (!wageTypeSelect || !dailyRateInput || !monthlyRateInput || !hourlyRateInput) return;
    
    const selectedType = wageTypeSelect.value;
    
    if (selectedType === 'daily') {
        // Enable daily rate input, disable monthly rate input
        dailyRateInput.disabled = false;
        dailyRateInput.readOnly = false;
        dailyRateInput.style.backgroundColor = '';
        dailyRateInput.placeholder = 'e.g. 500.00';
        dailyRateInput.focus();
        
        monthlyRateInput.disabled = true;
        monthlyRateInput.readOnly = true;
        monthlyRateInput.style.backgroundColor = '#f3f4f6';
        monthlyRateInput.placeholder = 'Auto-calculated';
        
        // Hourly rate is always calculated (read-only)
        hourlyRateInput.disabled = true;
        hourlyRateInput.readOnly = true;
        hourlyRateInput.style.backgroundColor = '#f3f4f6';
        hourlyRateInput.placeholder = 'Auto-calculated';
        
        console.log('💼 Wage type changed to Daily - Daily rate input enabled');
        
        // Trigger calculation if daily rate has value
        if (dailyRateInput.value) {
            window.calculateEmployeeRatesFromDaily();
        }
        
    } else if (selectedType === 'monthly') {
        // Enable monthly rate input, disable daily rate input
        monthlyRateInput.disabled = false;
        monthlyRateInput.readOnly = false;
        monthlyRateInput.style.backgroundColor = '';
        monthlyRateInput.placeholder = 'e.g. 15000.00';
        monthlyRateInput.focus();
        
        dailyRateInput.disabled = true;
        dailyRateInput.readOnly = true;
        dailyRateInput.style.backgroundColor = '#f3f4f6';
        dailyRateInput.placeholder = 'Auto-calculated';
        
        // Hourly rate is always calculated (read-only)
        hourlyRateInput.disabled = true;
        hourlyRateInput.readOnly = true;
        hourlyRateInput.style.backgroundColor = '#f3f4f6';
        hourlyRateInput.placeholder = 'Auto-calculated';
        
        console.log('💼 Wage type changed to Monthly - Monthly rate input enabled');
        
        // Trigger calculation if monthly rate has value
        if (monthlyRateInput.value) {
            window.calculateEmployeeRatesFromMonthly();
        }
    }
};

// Setup event listeners for employee salary calculations
window.setupEmployeeSalaryListeners = function() {
    const wageTypeSelect = document.getElementById('employeeWageType');
    const dailyRateInput = document.getElementById('employeeDailyRate');
    const monthlyRateInput = document.getElementById('employeeMonthlyRate');
    
    // Wage type change listener
    if (wageTypeSelect) {
        wageTypeSelect.addEventListener('change', window.handleWageTypeChange);
    }
    
    // Daily rate input listener
    if (dailyRateInput) {
        dailyRateInput.addEventListener('input', window.calculateEmployeeRatesFromDaily);
    }
    
    // Monthly rate input listener
    if (monthlyRateInput) {
        monthlyRateInput.addEventListener('input', window.calculateEmployeeRatesFromMonthly);
    }
    
    // Set initial field states based on current wage type
    setTimeout(() => {
        window.handleWageTypeChange();
    }, 100);
};
