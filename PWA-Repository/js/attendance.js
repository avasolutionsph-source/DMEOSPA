// Simple Attendance System - Uses exact same method as Employee Management

class AttendanceManager {
    constructor() {
        // Load attendance records from localStorage if available
        this.attendanceRecords = this.loadFromLocalStorage('attendanceRecords') || [];
        this.allAttendanceRecords = this.loadFromLocalStorage('allAttendanceRecords') || [];
        
        console.log('🚀 [CONSTRUCTOR] Loaded from localStorage:');
        console.log('  - attendanceRecords:', this.attendanceRecords.length, 'records');
        console.log('  - allAttendanceRecords:', this.allAttendanceRecords.length, 'records');
        this.employees = [];
        this.stream = null;
        this.isRecognitionEnabled = false;
        this.lastCapturedImage = null;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecordingVideo = false;
        this.recordedVideoBlob = null;
    }
    
    // LocalStorage helper methods
    saveToLocalStorage(key, data) {
        try {
            localStorage.setItem(`attendance_${key}`, JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
        }
    }
    
    loadFromLocalStorage(key) {
        try {
            const data = localStorage.getItem(`attendance_${key}`);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Failed to load from localStorage:', error);
            return null;
        }
    }
    
    // Get authentication token
    getAuthToken() {
        // FIXED: Auth system uses 'authToken' not 'token'
        // Check localStorage for authToken (matches auth.js line 652)
        const authToken = localStorage.getItem('authToken');
        if (authToken) return authToken;

        // Check sessionStorage for authToken (matches auth.js line 658)
        const sessionAuthToken = sessionStorage.getItem('authToken');
        if (sessionAuthToken) return sessionAuthToken;

        // Fallback: Check old 'token' key for backward compatibility
        const token = localStorage.getItem('token');
        if (token) return token;

        const sessionToken = sessionStorage.getItem('token');
        if (sessionToken) return sessionToken;

        // Check if user object has token
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                if (user.token) return user.token;
            } catch (e) {
                console.error('Failed to parse user object:', e);
            }
        }

        return null;
    }
    
    // Token refresh method - called when login state changes
    refreshTokens() {
        console.log('🔄 [ATTENDANCE] Refreshing employee data after token change...');
        // Reload employees with new token
        this.loadEmployeesSimple();
    }

    async init() {
        console.log('🚀 [ATTENDANCE] Initializing attendance system...');
        try {
            // Check user role and setup appropriate UI
            this.setupRoleBasedUI();
            
            // Get current user from auth system
            const user = window.authSystem?.currentUser;
            const isSelfAttendanceUser = user?.type === 'employee' && 
                ['senior_therapist', 'junior_therapist', 'new_therapist', 'other_staff'].includes(user?.role);
            
            // Only load all employees if user manages others' attendance
            if (!isSelfAttendanceUser) {
                // Load employees for managers/receptionists/owners
                await this.loadEmployeesSimple();
                
                // Show notification about employees loaded only for managers
                if (window.showNotification && this.employees.length === 0) {
                    window.showNotification('No employees found. Add employees in Employee Management first.', 'info');
                }
            } else {
                // For self-attendance users, just set empty array to avoid errors
                this.employees = [];
                console.log('👤 Self-attendance user detected, skipping employee loading');
            }
            
            // Load attendance records and setup UI
            await this.loadAttendanceRecords();
            this.setupEventListeners();
            this.renderAttendanceRecords();
            this.renderAttendanceHistoryTable();
            this.updateAttendanceStats();
            
            // Setup online sync listener
            window.addEventListener('online', async () => {
                console.log('🌐 Network connection restored, syncing attendance data...');
                await this.syncLocalStorageToBackend();
            });
            
            // Sync on initialization if online
            if (navigator.onLine) {
                setTimeout(() => this.syncLocalStorageToBackend(), 2000);
            }
            
            // Mark as initialized
            window.attendanceManager.initialized = true;
            console.log('✅ [ATTENDANCE] Initialization complete');
        } catch (error) {
            console.error('❌ [ATTENDANCE] Initialization failed:', error);
            if (window.showNotification) {
                window.showNotification('Failed to initialize attendance system', 'error');
            }
            // Still mark as initialized to prevent re-initialization loops
            window.attendanceManager.initialized = true;
        }
    }
    
    // Setup UI based on user role
    setupRoleBasedUI() {
        // Get current user from auth system
        const user = window.authSystem?.currentUser;

        console.log('🔐 [UI-SETUP] authSystem status:', {
            hasAuthSystem: !!window.authSystem,
            hasCurrentUser: !!window.authSystem?.currentUser,
            currentUser: window.authSystem?.currentUser
        });

        if (!user) {
            console.warn('⚠️ [UI-SETUP] No user found! Showing default UI. Auth might not be ready yet.');
            // Don't show anything until auth is ready
            const selfAttendanceSection = document.getElementById('selfAttendanceSection');
            const managerAttendanceSection = document.getElementById('managerAttendanceSection');
            if (selfAttendanceSection) selfAttendanceSection.style.display = 'none';
            if (managerAttendanceSection) managerAttendanceSection.style.display = 'none';
            return;
        }

        console.log('🔐 [UI-SETUP] Setting up attendance UI for:', {
            email: user.email,
            type: user.type,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            id: user.id
        });
        
        const selfAttendanceSection = document.getElementById('selfAttendanceSection');
        const managerAttendanceSection = document.getElementById('managerAttendanceSection');
        const employeeNameDisplay = document.getElementById('employeeNameDisplay');
        
        if (!selfAttendanceSection || !managerAttendanceSection) return;
        
        // Check if user is an employee who should only check themselves in/out
        if (user.type === 'employee') {
            const role = user.role;
            
            // Therapists and staff only see self check-in
            if (['senior_therapist', 'junior_therapist', 'new_therapist', 'other_staff'].includes(role)) {
                // Show self attendance UI
                selfAttendanceSection.style.display = 'block';
                managerAttendanceSection.style.display = 'none';
                
                // Store current employee info for check-in/out
                this.currentEmployeeId = user.id;
                this.currentEmployeeName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
                
                // Display employee name
                if (employeeNameDisplay) {
                    employeeNameDisplay.innerHTML = `
                        <i class="fas fa-user"></i> ${this.currentEmployeeName}
                        <div style="font-size: 0.9rem; color: #9ca3af; margin-top: 0.5rem;">
                            ${user.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                    `;
                }
                
                // Check if already checked in today
                this.updateSelfAttendanceStatus();
                
            } 
            // Receptionists and managers see dropdown (they manage others)
            else if (['receptionist', 'manager'].includes(role)) {
                selfAttendanceSection.style.display = 'none';
                managerAttendanceSection.style.display = 'block';
            }
        } else {
            // Owners see dropdown (manage all employees)
            selfAttendanceSection.style.display = 'none';
            managerAttendanceSection.style.display = 'block';
        }
    }
    
    // Update self attendance status (check if already checked in)
    async updateSelfAttendanceStatus() {
        if (!this.currentEmployeeId) return;

        // Use Philippines timezone (UTC+8)
        const now = new Date();
        const phTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
        const today = phTime.toISOString().split('T')[0];

        const todayRecord = this.attendanceRecords.find(record =>
            record.employeeId === this.currentEmployeeId &&
            record.date === today
        );
        
        const selfCheckinBtn = document.getElementById('selfCheckinBtn');
        const selfCheckoutBtn = document.getElementById('selfCheckoutBtn');
        const lastCheckInTime = document.getElementById('lastCheckInTime');
        
        if (todayRecord) {
            // Already checked in today
            if (selfCheckinBtn) selfCheckinBtn.disabled = true;
            if (selfCheckoutBtn) selfCheckoutBtn.disabled = !todayRecord.checkInTime || todayRecord.checkOutTime;
            
            if (lastCheckInTime && todayRecord.checkInTime) {
                const checkInTime = new Date(`${todayRecord.date} ${todayRecord.checkInTime}`);
                lastCheckInTime.innerHTML = `
                    <i class="fas fa-clock"></i> 
                    Checked in at ${todayRecord.checkInTime}
                    ${todayRecord.checkOutTime ? `<br>Checked out at ${todayRecord.checkOutTime}` : ''}
                `;
            }
        } else {
            // Not checked in yet
            if (selfCheckinBtn) selfCheckinBtn.disabled = false;
            if (selfCheckoutBtn) selfCheckoutBtn.disabled = true;
            if (lastCheckInTime) lastCheckInTime.innerHTML = '<i class="fas fa-info-circle"></i> Not checked in today';
        }
    }
    
    // Self check-in for employees
    async selfCheckin() {
        console.log('✅ [CHECK-IN] Starting check-in process...');

        if (!this.currentEmployeeId || !this.currentEmployeeName) {
            console.error('❌ [CHECK-IN] Missing employee info:', {
                currentEmployeeId: this.currentEmployeeId,
                currentEmployeeName: this.currentEmployeeName
            });
            if (window.showNotification) {
                window.showNotification('User information not found', 'error');
            }
            return;
        }

        console.log('👤 [CHECK-IN] Employee info:', {
            id: this.currentEmployeeId,
            name: this.currentEmployeeName
        });

        // Find employee data
        const employee = this.employees.find(emp => 
            (emp.id || emp._id) === this.currentEmployeeId
        ) || {
            id: this.currentEmployeeId,
            name: this.currentEmployeeName,
            position: window.authSystem?.currentUser?.role || 'Employee'
        };
        
        // Use Philippines timezone (UTC+8)
        const now = new Date();
        const phTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
        const date = phTime.toISOString().split('T')[0];
        const time = phTime.toTimeString().split(' ')[0].substring(0, 5);
        
        // Check for late check-in (after 9:00 AM)
        const [hours, minutes] = time.split(':').map(Number);
        const isLate = hours > 9 || (hours === 9 && minutes > 0);
        const status = isLate ? 'Late' : 'Present';
        
        // Create attendance record
        const record = {
            id: Date.now(),
            employeeId: employee.id,
            employeeName: employee.name,
            employeePosition: employee.position || window.authSystem?.currentUser?.role || 'Employee',
            date: date,
            checkInTime: time,
            checkOutTime: null,
            hours: 0,
            status: status,
            capturedImage: this.lastCapturedImage || null,
            recordedVideo: this.recordedVideoData || null
        };

        // Sync with backend using hybrid storage (which handles saving to arrays and localStorage)
        await this.saveAttendanceHybrid(record);

        // Show notification
        const message = isLate ?
            `⚠️ ${employee.name} checked in late at ${time}` :
            `✅ ${employee.name} checked in successfully at ${time}`;
        
        if (window.showNotification) {
            window.showNotification(message, isLate ? 'warning' : 'success');
        }

        // Update UI - reload records first, then update status
        await this.loadAttendanceRecords();
        this.renderAttendanceRecords();
        this.renderAttendanceHistoryTable();
        this.updateAttendanceStats();
        this.updateSelfAttendanceStatus();
    }
    
    // Self check-out for employees
    async selfCheckout() {
        if (!this.currentEmployeeId) {
            if (window.showNotification) {
                window.showNotification('User information not found', 'error');
            }
            return;
        }
        
        // Use Philippines timezone (UTC+8)
        const now = new Date();
        const phTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
        const today = phTime.toISOString().split('T')[0];

        const record = this.attendanceRecords.find(r =>
            r.employeeId === this.currentEmployeeId &&
            r.date === today &&
            r.checkInTime &&
            !r.checkOutTime
        );

        if (!record) {
            if (window.showNotification) {
                window.showNotification('No active check-in found for today', 'warning');
            }
            return;
        }

        const checkOutTime = phTime.toTimeString().split(' ')[0].substring(0, 5);
        
        // Calculate hours worked
        const checkInDate = new Date(`${record.date} ${record.checkInTime}`);
        const checkOutDate = new Date(`${record.date} ${checkOutTime}`);
        const hoursWorked = ((checkOutDate - checkInDate) / (1000 * 60 * 60)).toFixed(2);
        
        // Update record
        record.checkOutTime = checkOutTime;
        record.hours = parseFloat(hoursWorked);

        // Check for early departure (before 5:00 PM)
        const [hours] = checkOutTime.split(':').map(Number);
        const isEarlyDeparture = hours < 17;

        // Sync with backend using hybrid storage (which handles saving to arrays and localStorage)
        await this.updateAttendanceHybrid(record, record.id);

        // Show notification
        const message = isEarlyDeparture ?
            `⚠️ ${record.employeeName} checked out early at ${checkOutTime} (${hoursWorked} hours worked)` :
            `✅ ${record.employeeName} checked out at ${checkOutTime} (${hoursWorked} hours worked)`;
        
        if (window.showNotification) {
            window.showNotification(message, isEarlyDeparture ? 'warning' : 'success');
        }

        // Update UI - reload records first, then update status
        await this.loadAttendanceRecords();
        this.renderAttendanceRecords();
        this.renderAttendanceHistoryTable();
        this.updateAttendanceStats();
        this.updateSelfAttendanceStatus();
    }
    
    // Load employees using HybridAPIClient (consistent with Employee Management)
    async loadEmployeesSimple() {
        try {
            console.log('👥 [ATTENDANCE] Loading employees using HybridAPIClient...');
            
            // Use HybridAPIClient for consistent token management
            if (!window.HybridAPIClient) {
                console.error('❌ [ATTENDANCE] HybridAPIClient not available');
                this.employees = [];
                this.updateEmployeeSelect();
                return;
            }
            
            // Use same method as Employee Management for consistency
            const result = await window.HybridAPIClient.getEmployees();
            
            if (result.success) {
                const employees = result.data || [];
                console.log(`✅ [ATTENDANCE] Loaded ${employees.length} employees from ${result.source || 'API'}`);
                
                // Convert firstName/lastName back to name for PWA compatibility
                const processedEmployees = employees.map(emp => ({
                    ...emp,
                    id: emp._id || emp.id, // Map MongoDB _id to frontend id field
                    name: emp.firstName ? `${emp.firstName} ${emp.lastName}`.trim() : emp.name
                }));
                
                this.employees = processedEmployees;
            } else {
                console.error('❌ [ATTENDANCE] Failed to load employees:', result.error || 'Unknown error');
                this.employees = [];
            }
        } catch (error) {
            console.error('❌ [ATTENDANCE] Failed to load employees:', error);
            this.employees = [];
        }
        
        // Update the dropdown
        this.updateEmployeeSelect();
    }
    
    // Update employee select dropdown
    updateEmployeeSelect() {
        const select = document.getElementById('attendanceEmployeeSelect');
        if (select) {
            select.innerHTML = '<option value="">Select Employee</option>';
            this.employees.forEach(emp => {
                const option = document.createElement('option');
                option.value = emp.id || emp._id;
                option.textContent = `${emp.name} - ${emp.position}`;
                select.appendChild(option);
            });
        }
        console.log('✅ Updated employee dropdown with', this.employees.length, 'employees');
    }
    
    async loadEmployeesDirectly() {
        // EXACT COPY OF POS METHOD THAT WORKS
        try {
            // Ensure database is initialized first
            if (!window.db || !window.db.db) {
                console.warn('⚠️ Database not ready, waiting...');
                if (typeof window.ensureDBInit === 'function') {
                    await window.ensureDBInit();
                }
            }
            
            // Load employees exactly like POS does
            const rawEmployees = await window.db.getAll('employees');
            console.log('✅ Loaded', rawEmployees.length, 'employees from database');
            
            // DEDUPLICATION FIX: Remove duplicate employees by name
            const uniqueEmployees = new Map();
            rawEmployees.forEach(emp => {
                const key = emp.name || 'Unknown';
                const existing = uniqueEmployees.get(key);
                // Keep the first occurrence (or the one with valid ID)
                if (!existing || (emp.id && !existing.id)) {
                    uniqueEmployees.set(key, emp);
                }
            });
            this.employees = Array.from(uniqueEmployees.values());
            console.log(`✅ Deduplicated ${rawEmployees.length} to ${this.employees.length} unique employees`);
            
            // Populate the dropdown exactly like POS
            const select = document.getElementById('attendanceEmployeeSelect');
            if (select) {
                select.innerHTML = '<option value="">Select Employee</option>';
                this.employees.forEach(emp => {
                    const option = document.createElement('option');
                    option.value = emp.id;
                    option.textContent = `${emp.name} - ${emp.position}`;
                    select.appendChild(option);
                });
                console.log('✅ Dropdown populated with', this.employees.length, 'employees');
            } else {
                console.error('❌ attendanceEmployeeSelect element not found!');
            }
        } catch (error) {
            console.error('❌ Failed to load employees:', error);
            this.employees = [];
        }
    }
    
    populateDropdownNow() {
        const select = document.getElementById('attendanceEmployeeSelect');
        if (!select) {
            console.error('❌ Dropdown not found!');
            return;
        }
        
        // Clear and add default option
        select.innerHTML = '<option value="">Select Employee</option>';
        
        // Check if we have employees
        if (!this.employees || this.employees.length === 0) {
            console.warn('⚠️ No employees to populate');
            const noEmployeesOption = document.createElement('option');
            noEmployeesOption.value = '';
            noEmployeesOption.textContent = 'No employees found - Add employees in Employee Management';
            noEmployeesOption.disabled = true;
            select.appendChild(noEmployeesOption);
            return;
        }
        
        // Add each employee
        this.employees.forEach(emp => {
            if (emp && emp.name) {
                const option = document.createElement('option');
                option.value = emp.id || emp._id || '';
                // Display name and position if available
                const displayText = emp.position ? `${emp.name} - ${emp.position}` : emp.name;
                option.textContent = displayText;
                select.appendChild(option);
                console.log(`✅ Added employee: ${displayText} (ID: ${option.value})`);
            } else {
                console.warn('⚠️ Skipping employee with missing name:', emp);
            }
        });
        
        console.log(`✅ Dropdown populated with ${select.options.length - 1} employees`);
    }
    
    async populateDropdownDirectly() {
        const select = document.getElementById('attendanceEmployeeSelect');
        if (!select) {
            console.error('❌ [ATTENDANCE] Employee select element not found');
            return;
        }
        
        console.log('📊 [ATTENDANCE] Populating dropdown with', this.employees.length, 'employees');
        console.log('📊 [ATTENDANCE] Full employee data:', JSON.stringify(this.employees, null, 2));
        
        // Clear and reset dropdown
        select.innerHTML = '';
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Choose an employee...';
        select.appendChild(defaultOption);
        
        if (this.employees.length === 0) {
            console.warn('⚠️ [ATTENDANCE] No employees to add to dropdown');
            const noEmployeesOption = document.createElement('option');
            noEmployeesOption.value = '';
            noEmployeesOption.textContent = 'No employees found - Add employees in Employee Management';
            noEmployeesOption.disabled = true;
            select.appendChild(noEmployeesOption);
            return;
        }
        
        // Add each employee - with detailed debugging
        this.employees.forEach((emp, index) => {
            console.log(`🔍 [POPULATE] Checking employee ${index}:`, emp);
            console.log(`🔍 [POPULATE] Employee properties:`, Object.keys(emp));
            console.log(`🔍 [POPULATE] Employee.name:`, emp.name);
            
            // Check all possible name fields
            const employeeName = emp.name || emp.Name || emp.employeeName || emp.fullName || 'Unknown Employee';
            
            if (emp) {
                const option = document.createElement('option');
                // Use the auto-generated ID from IndexedDB
                option.value = emp.id || emp._id || index.toString();
                option.textContent = employeeName;
                select.appendChild(option);
                console.log(`✅ [POPULATE] Added "${employeeName}" with ID: ${option.value}`);
            } else {
                console.warn(`⚠️ [POPULATE] Employee ${index} is null or undefined`);
            }
        });
        
        console.log('✅ [ATTENDANCE] Dropdown populated. Total options:', select.options.length);
        console.log('📊 [ATTENDANCE] Final dropdown HTML:', select.innerHTML);
    }

    async loadEmployees() {
        try {
            console.log('📊 [ATTENDANCE] Loading employees using EXACT same method as Employee Management...');
            
            // EXACT SAME METHOD AS EMPLOYEE MANAGEMENT
            if (window.db) {
                const rawEmployees = await window.db.getAll('employees');
                console.log('✅ [ATTENDANCE] Loaded employees:', rawEmployees.length);
                
                // DEDUPLICATION FIX: Apply same deduplication as above
                const uniqueEmployees = new Map();
                rawEmployees.forEach(emp => {
                    const key = emp.name || 'Unknown';
                    const existing = uniqueEmployees.get(key);
                    if (!existing || (emp.id && !existing.id)) {
                        uniqueEmployees.set(key, emp);
                    }
                });
                this.employees = Array.from(uniqueEmployees.values());
                console.log(`✅ [ATTENDANCE] Deduplicated ${rawEmployees.length} to ${this.employees.length} unique employees`);
                console.log('📊 [ATTENDANCE] Full employee data:', JSON.stringify(this.employees, null, 2));
                
                if (this.employees.length > 0) {
                    this.employees.forEach((emp, index) => {
                        console.log(`👤 Employee ${index + 1}:`, {
                            name: emp.name,
                            id: emp.id,
                            _id: emp._id,
                            position: emp.position,
                            fullObject: emp
                        });
                    });
                }
            } else {
                console.warn('⚠️ [ATTENDANCE] Database not ready');
                this.employees = [];
            }
        } catch (error) {
            console.error('❌ [ATTENDANCE] Failed to load employees:', error);
            this.employees = [];
        }
    }

    populateEmployeeDropdown() {
        const select = document.getElementById('attendanceEmployeeSelect');
        if (!select) {
            console.error('❌ [ATTENDANCE] Employee select element not found');
            return;
        }
        
        console.log('📊 [ATTENDANCE] Starting dropdown population...');
        console.log('📊 [ATTENDANCE] Current employees array:', this.employees);
        console.log('📊 [ATTENDANCE] Number of employees:', this.employees.length);
        
        // Clear and reset dropdown
        select.innerHTML = '<option value="">Choose an employee...</option>';
        
        if (!this.employees || this.employees.length === 0) {
            console.warn('⚠️ [ATTENDANCE] No employees to add to dropdown');
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No employees found - Click Sync Employees';
            option.disabled = true;
            select.appendChild(option);
            return;
        }
        
        // Add each employee - SIMPLE AND CLEAN
        console.log('📊 [ATTENDANCE] Adding employees to dropdown...');
        this.employees.forEach((employee, index) => {
            console.log(`📊 [ATTENDANCE] Processing employee ${index + 1}:`, employee);
            
            if (!employee.name) {
                console.warn(`⚠️ [ATTENDANCE] Employee ${index + 1} has no name, skipping`);
                return;
            }
            
            const option = document.createElement('option');
            option.value = employee.id || employee._id || index.toString();
            option.textContent = employee.name;
            select.appendChild(option);
            console.log(`✅ Added to dropdown: "${employee.name}" with value: ${option.value}`);
        });
        
        console.log('✅ [ATTENDANCE] Dropdown populated with', select.options.length - 1, 'employees');
    }

    setupEventListeners() {
        if (this._listenersAttached) return;
        
        const attendancePage = document.getElementById('attendance');
        if (!attendancePage) return;
        
        this._listenersAttached = true;
        
        // Self check-in button (for employees)
        const selfCheckinBtn = document.getElementById('selfCheckinBtn');
        if (selfCheckinBtn) {
            selfCheckinBtn.addEventListener('click', () => this.selfCheckin());
        }
        
        // Self check-out button (for employees)
        const selfCheckoutBtn = document.getElementById('selfCheckoutBtn');
        if (selfCheckoutBtn) {
            selfCheckoutBtn.addEventListener('click', () => this.selfCheckout());
        }
        
        // Employee dropdown
        const employeeSelect = document.getElementById('attendanceEmployeeSelect');
        if (employeeSelect) {
            employeeSelect.addEventListener('change', (e) => {
                const checkinBtn = document.getElementById('manualCheckinBtn');
                const checkoutBtn = document.getElementById('manualCheckoutBtn');
                if (checkinBtn) {
                    checkinBtn.disabled = !e.target.value;
                }
                if (checkoutBtn) {
                    checkoutBtn.disabled = !e.target.value;
                }
            });
        }
        
        // Check-in button
        const manualCheckinBtn = document.getElementById('manualCheckinBtn');
        if (manualCheckinBtn) {
            manualCheckinBtn.addEventListener('click', () => this.manualCheckin());
        }
        
        // Check-out button
        const manualCheckoutBtn = document.getElementById('manualCheckoutBtn');
        if (manualCheckoutBtn) {
            manualCheckoutBtn.addEventListener('click', () => this.manualCheckout());
        }
        
        // Camera buttons
        const startCameraBtn = document.getElementById('startCameraBtn');
        if (startCameraBtn) {
            startCameraBtn.addEventListener('click', () => this.startCamera());
        }
        
        const stopCameraBtn = document.getElementById('stopCameraBtn');
        if (stopCameraBtn) {
            stopCameraBtn.addEventListener('click', () => this.stopCamera());
        }
        
        // Video recording button is the main capture method now
        const recordVideoBtn = document.getElementById('recordVideoBtn');
        if (recordVideoBtn) {
            recordVideoBtn.addEventListener('click', () => {
                if (this.isRecordingVideo) {
                    this.stopVideoRecording();
                } else {
                    this.startVideoRecording();
                }
            });
        }
    }

    async manualCheckin() {
        const select = document.getElementById('attendanceEmployeeSelect');
        const employeeId = select.value;
        
        if (!employeeId) {
            if (window.showNotification) {
                window.showNotification('Please select an employee', 'error');
            }
            return;
        }
        
        // Find employee by comparing as string (IndexedDB IDs are numbers)
        const employee = this.employees.find(emp => {
            const empId = emp.id ? emp.id.toString() : '';
            return empId === employeeId;
        });
        
        if (!employee) {
            console.error('Employee not found for ID:', employeeId);
            console.log('Available employees:', this.employees.map(e => ({id: e.id, name: e.name})));
            return;
        }
        
        await this.recordAttendance(employee, 'manual');
    }

    async recordAttendance(employee, method = 'manual') {
        try {
            const now = new Date();
            
            // Calculate if late (assuming 8:00 AM start with 5 min grace)
            const businessOpen = new Date();
            businessOpen.setHours(8, 0, 0, 0);
            const graceTime = new Date(businessOpen.getTime() + 5 * 60000); // 5 minutes grace
            const isLate = now > graceTime;
            const lateMinutes = isLate ? Math.floor((now - graceTime) / 60000) : 0;
            
            const attendanceRecord = {
                employeeId: employee.id || employee._id,
                employeeName: employee.name,
                employeePosition: employee.position || 'Employee',
                date: now.toISOString().split('T')[0],
                checkInTime: now.toISOString(),
                checkOutTime: null,
                method: method,
                capturedImage: this.lastCapturedImage || null,
                capturedVideo: this.recordedVideoData || null,
                isLate: isLate,
                lateMinutes: lateMinutes,
                createdAt: now.toISOString()
            };
            
            // Save using hybrid storage (localStorage is primary)
            await this.saveAttendanceHybrid(attendanceRecord);
            console.log('✅ Attendance recorded successfully');
            
            if (window.showNotification) {
                window.showNotification(`✅ ${employee.name} checked in successfully`, 'success');
            }
            
            // Reset form and clear captured data
            document.getElementById('attendanceEmployeeSelect').value = '';
            document.getElementById('manualCheckinBtn').disabled = true;
            this.lastCapturedImage = null;
            this.recordedVideoData = null;
            
            // Hide video preview
            const videoPreview = document.getElementById('capturedVideoPreview');
            if (videoPreview) {
                videoPreview.style.display = 'none';
                videoPreview.src = '';
            }
            
            // Reload attendance records
            await this.loadAttendanceRecords();
            this.renderAttendanceRecords();
            this.renderAttendanceHistoryTable();
            this.updateAttendanceStats();
            
        } catch (error) {
            console.error('Failed to record attendance:', error);
            if (window.showNotification) {
                window.showNotification('Failed to record attendance', 'error');
            }
        }
    }

    async manualCheckout() {
        const select = document.getElementById('attendanceEmployeeSelect');
        const employeeId = select.value;
        
        if (!employeeId) {
            if (window.showNotification) {
                window.showNotification('Please select an employee first', 'warning');
            }
            return;
        }

        try {
            const today = new Date().toISOString().split('T')[0];
            
            // Find today's check-in record for this employee (check both id formats)
            const todayRecords = this.attendanceRecords.filter(record => 
                (record.employeeId === employeeId || record.employeeId === employeeId) && 
                record.date === today && 
                !record.checkOutTime
            );
            
            if (todayRecords.length === 0) {
                if (window.showNotification) {
                    window.showNotification('No check-in record found for today. Employee must check in first.', 'warning');
                }
                return;
            }
            
            // Use the first (most recent) check-in record
            const checkInRecord = todayRecords[0];
            const employee = this.employees.find(e => 
                e.id === employeeId || e._id === employeeId || 
                e.id === checkInRecord.employeeId || e._id === checkInRecord.employeeId
            );
            const now = new Date();
            
            // Get business settings for grace period
            const businessSettings = await this.getBusinessSettings();
            const checkOutGracePeriodMinutes = businessSettings.checkOutGracePeriodMinutes || 15;
            const businessCloseTime = businessSettings.businessCloseTime || '18:00';
            const hourlyRate = employee.hourlyRate || 0;
            
            // Calculate early departure deduction
            const { deductionHours, isEarlyDeparture } = this.calculateEarlyDepartureDeduction(
                now, businessCloseTime, checkOutGracePeriodMinutes
            );
            
            // Update the existing record with check-out info
            const updatedRecord = {
                ...checkInRecord,
                checkOutTime: now.toISOString(),
                checkOutDeduction: isEarlyDeparture ? deductionHours : 0,
                earlyDepartureMinutes: isEarlyDeparture ? this.calculateEarlyMinutes(now, businessCloseTime, checkOutGracePeriodMinutes) : 0,
                hoursWorked: this.calculateHoursWorked(checkInRecord.checkInTime, now.toISOString()),
                payDeduction: deductionHours * hourlyRate
            };
            
            // Update via hybrid storage (localStorage is primary)
            await this.updateAttendanceHybrid(updatedRecord, checkInRecord.id);
            console.log('✅ Check-out recorded successfully');
            
            // Log activity
            if (window.activityLogger) {
                const logData = {
                    employeeName: employee.name,
                    checkOutTime: now.toLocaleTimeString(),
                    hoursWorked: updatedRecord.hoursWorked.toFixed(1),
                    deduction: deductionHours > 0 ? `${deductionHours}h deduction` : 'No deduction'
                };
                window.activityLogger.logEmployeeActivity('UPDATE', logData, employeeId);
            }
            
            // Show success message with deduction info
            let message = `✅ ${employee.name} checked out successfully`;
            if (isEarlyDeparture) {
                message += `\n⚠️ Early departure: ${deductionHours}h deduction (₱${(deductionHours * hourlyRate).toFixed(2)})`;
            }
            
            if (window.showNotification) {
                window.showNotification(message, isEarlyDeparture ? 'warning' : 'success');
            }
            
            // Reset form
            document.getElementById('attendanceEmployeeSelect').value = '';
            document.getElementById('manualCheckinBtn').disabled = true;
            document.getElementById('manualCheckoutBtn').disabled = true;
            
            // Reload attendance records
            await this.loadAttendanceRecords();
            this.renderAttendanceRecords();
            this.renderAttendanceHistoryTable();
            this.updateAttendanceStats();
            
        } catch (error) {
            console.error('Failed to record check-out:', error);
            if (window.showNotification) {
                window.showNotification('Failed to record check-out', 'error');
            }
        }
    }

    calculateEarlyDepartureDeduction(checkOutTime, businessCloseTime, gracePeriodMinutes) {
        const closeTime = new Date();
        const [closeHour, closeMinute] = businessCloseTime.split(':').map(Number);
        closeTime.setHours(closeHour, closeMinute, 0, 0);
        
        const actualCheckOut = new Date(checkOutTime);
        const gracePeriodMs = gracePeriodMinutes * 60 * 1000;
        const allowedCheckOutTime = new Date(closeTime.getTime() - gracePeriodMs);
        
        if (actualCheckOut >= allowedCheckOutTime) {
            return { deductionHours: 0, isEarlyDeparture: false };
        }
        
        // Calculate how early they left (beyond grace period)
        const earlyMs = allowedCheckOutTime.getTime() - actualCheckOut.getTime();
        const earlyMinutes = Math.ceil(earlyMs / (60 * 1000));
        
        // Deduction logic: round up to next hour
        // 16 minutes early = 1 hour deduction
        // 1 hour 1 minute early = 2 hour deduction
        const deductionHours = Math.ceil(earlyMinutes / 60);
        
        return { deductionHours, isEarlyDeparture: true };
    }
    
    calculateEarlyMinutes(checkOutTime, businessCloseTime, gracePeriodMinutes) {
        const closeTime = new Date();
        const [closeHour, closeMinute] = businessCloseTime.split(':').map(Number);
        closeTime.setHours(closeHour, closeMinute, 0, 0);
        
        const actualCheckOut = new Date(checkOutTime);
        const gracePeriodMs = gracePeriodMinutes * 60 * 1000;
        const allowedCheckOutTime = new Date(closeTime.getTime() - gracePeriodMs);
        
        const earlyMs = allowedCheckOutTime.getTime() - actualCheckOut.getTime();
        return Math.ceil(earlyMs / (60 * 1000));
    }
    
    calculateHoursWorked(checkInTime, checkOutTime) {
        const checkIn = new Date(checkInTime);
        const checkOut = new Date(checkOutTime);
        const hoursWorked = (checkOut - checkIn) / (1000 * 60 * 60);
        return Math.max(0, hoursWorked);
    }
    
    async syncLocalStorageToBackend() {
        console.log('🔄 Syncing localStorage attendance data to backend...');
        
        const token = this.getAuthToken();
        if (!token) {
            console.warn('No authentication token, skipping sync');
            return;
        }
        
        try {
            const localRecords = this.loadFromLocalStorage('allAttendanceRecords') || [];
            const unsyncedRecords = localRecords.filter(record =>
                record.id && typeof record.id === 'string' && record.id.startsWith('local_')
            );
            
            if (unsyncedRecords.length === 0) {
                console.log('✅ No unsynced records to upload');
                return;
            }
            
            console.log(`📤 Syncing ${unsyncedRecords.length} local records to backend...`);
            
            for (const record of unsyncedRecords) {
                try {
                    // Remove the local_ prefix for server submission
                    const serverRecord = { ...record };
                    delete serverRecord.id;
                    
                    const response = await fetch(`${window.API_CONFIG?.BASE_URL || 'https://daetspa-backend.onrender.com'}/api/attendance`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(serverRecord)
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        const serverId = result.data?.id || result.data?._id;
                        
                        // Update the local record with server ID
                        const index = this.allAttendanceRecords.findIndex(r => r.id === record.id);
                        if (index !== -1) {
                            this.allAttendanceRecords[index].id = serverId;
                        }
                        
                        console.log(`✅ Synced record ${record.id} → ${serverId}`);
                    } else {
                        console.error(`❌ Failed to sync record ${record.id}:`, response.status);
                    }
                } catch (error) {
                    console.error(`❌ Error syncing record ${record.id}:`, error);
                }
            }
            
            // Save updated records back to localStorage
            this.saveToLocalStorage('allAttendanceRecords', this.allAttendanceRecords);
            this.saveToLocalStorage('attendanceRecords', this.attendanceRecords);
            
            console.log('✅ Sync completed');
            
            if (window.showNotification) {
                window.showNotification(`Synced ${unsyncedRecords.length} attendance records`, 'success');
            }
        } catch (error) {
            console.error('❌ Sync failed:', error);
        }
    }
    
    async getBusinessSettings() {
        try {
            if (window.db) {
                // Try to load from attendanceRules (payroll system) first
                const attendanceRules = await window.db.getAll('attendanceRules');
                if (attendanceRules && attendanceRules.length > 0) {
                    const rules = attendanceRules[0];
                    return {
                        checkOutGracePeriodMinutes: rules.checkOutGracePeriodMinutes || 15,
                        businessCloseTime: rules.businessCloseTime || '18:00',
                        earlyDepartureDeductionType: rules.earlyDepartureDeductionType || 'progressive',
                        maxDailyEarlyDepartureDeduction: rules.maxDailyEarlyDepartureDeduction || 4,
                        ...rules
                    };
                }
                
                // Fallback to legacy businessSettings
                const settings = await window.db.get('settings', 'businessSettings') || {};
                return {
                    checkOutGracePeriodMinutes: settings.checkOutGracePeriodMinutes || 15,
                    businessCloseTime: settings.businessCloseTime || '18:00',
                    earlyDepartureDeductionType: settings.earlyDepartureDeductionType || 'progressive',
                    maxDailyEarlyDepartureDeduction: settings.maxDailyEarlyDepartureDeduction || 4,
                    ...settings
                };
            }
        } catch (error) {
            console.warn('Failed to load business settings:', error);
        }
        
        // Default settings
        return {
            checkOutGracePeriodMinutes: 15,
            businessCloseTime: '18:00',
            earlyDepartureDeductionType: 'progressive',
            maxDailyEarlyDepartureDeduction: 4
        };
    }

    async loadAttendanceRecords() {
        try {
            // Use Philippines timezone for today's date
            const now = new Date();
            const phTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
            const today = phTime.toISOString().split('T')[0];

            // ALWAYS load from localStorage FIRST (instant, non-blocking)
            let allRecords = this.loadFromLocalStorage('allAttendanceRecords') || [];
            console.log(`📦 Loaded ${allRecords.length} records from localStorage (instant)`);

            // Sort by date, newest first
            allRecords.sort((a, b) => {
                const dateA = new Date(a.date || a.createdAt);
                const dateB = new Date(b.date || b.createdAt);
                return dateB - dateA;
            });

            // Update UI immediately with localStorage data
            this.attendanceRecords = allRecords.filter(record => record.date === today);
            this.allAttendanceRecords = allRecords;

            console.log(`✅ Loaded ${this.attendanceRecords.length} attendance records for today (from localStorage)`);
            console.log(`✅ Total attendance records: ${this.allAttendanceRecords.length}`);

            // Then sync with backend in BACKGROUND (non-blocking)
            this.syncBackendInBackground();
        } catch (error) {
            console.error('❌ Failed to load attendance records:', error);
            // Try direct localStorage as last resort
            this.attendanceRecords = this.loadFromLocalStorage('attendanceRecords') || [];
            this.allAttendanceRecords = this.loadFromLocalStorage('allAttendanceRecords') || [];
            console.log('📦 Last resort: loaded from localStorage directly');
        }
    }

    // Background sync method - non-blocking backend sync
    async syncBackendInBackground() {
        console.log('🔄 [BACKGROUND] Starting backend sync (non-blocking)...');

        const token = this.getAuthToken();
        if (!token) {
            console.log('⏭️ [BACKGROUND] No auth token, skipping backend sync');
            return;
        }

        try {
            const response = await fetch(`${window.API_CONFIG?.BASE_URL || 'https://daetspa-backend.onrender.com'}/api/attendance`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                const mongoRecords = result.data || [];
                console.log(`✅ [BACKGROUND] Loaded ${mongoRecords.length} records from backend`);

                // Merge with localStorage records
                const localRecords = this.loadFromLocalStorage('allAttendanceRecords') || [];
                const recordMap = new Map();

                // Add localStorage records first
                localRecords.forEach(record => {
                    const key = `${record.employeeId}_${record.date}_${record.checkInTime}`;
                    recordMap.set(key, record);
                });

                // Add/update with MongoDB records
                mongoRecords.forEach(record => {
                    const key = `${record.employeeId}_${record.date}_${record.checkInTime || record.checkIn}`;
                    recordMap.set(key, record);
                });

                const mergedRecords = Array.from(recordMap.values());
                console.log(`✅ [BACKGROUND] Merged to ${mergedRecords.length} total records`);

                // Update in-memory arrays
                this.allAttendanceRecords = mergedRecords;
                const now = new Date();
                const phTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
                const today = phTime.toISOString().split('T')[0];
                this.attendanceRecords = mergedRecords.filter(record => record.date === today);

                // Save merged data to localStorage
                this.saveToLocalStorage('allAttendanceRecords', this.allAttendanceRecords);
                this.saveToLocalStorage('attendanceRecords', this.attendanceRecords);

                // Refresh UI with merged data
                this.renderAttendanceRecords();
                this.renderAttendanceHistoryTable();
                this.updateAttendanceStats();
                this.updateSelfAttendanceStatus();

                console.log('✅ [BACKGROUND] Sync complete, UI updated');
            } else {
                console.warn(`⚠️ [BACKGROUND] Backend returned ${response.status}, using localStorage only`);
            }
        } catch (error) {
            console.warn('⚠️ [BACKGROUND] Backend sync failed (using localStorage only):', error.message);
        }
    }

    // ============================================================================
    // HYBRID STORAGE METHODS: Essential data → MongoDB, Media → IndexedDB
    // ============================================================================
    
    async saveAttendanceHybrid(attendanceRecord) {
        console.log('💾 [HYBRID] Saving attendance with hybrid storage...');
        
        // Generate ID if not present
        if (!attendanceRecord.id) {
            attendanceRecord.id = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        
        // Mark for sync
        attendanceRecord.syncStatus = 'pending';
        
        // Save to IndexedDB for sync manager
        try {
            if (window.db) {
                await window.db.add('attendance', {
                    ...attendanceRecord,
                    syncStatus: 'pending'
                });
                console.log('✅ Saved to IndexedDB for cross-device sync');
                
                // Trigger sync to other devices
                if (window.syncManager && window.syncManager.triggerSync) {
                    window.syncManager.triggerSync();
                    console.log('🔄 Triggered sync to other devices');
                }
            }
        } catch (error) {
            console.warn('⚠️ Could not save to IndexedDB:', error);
        }
        
        // ALWAYS save to localStorage first (primary storage)
        // Check if it already exists (in case of duplicate calls)
        const existingIndex = this.attendanceRecords.findIndex(r => 
            r.employeeId === attendanceRecord.employeeId && 
            r.date === attendanceRecord.date && 
            r.checkInTime === attendanceRecord.checkInTime
        );
        
        if (existingIndex === -1) {
            this.attendanceRecords.push(attendanceRecord);
            this.allAttendanceRecords.push(attendanceRecord);
        } else {
            console.log('⚠️ Record already exists, updating instead');
            this.attendanceRecords[existingIndex] = attendanceRecord;
            const allIndex = this.allAttendanceRecords.findIndex(r => 
                r.employeeId === attendanceRecord.employeeId && 
                r.date === attendanceRecord.date && 
                r.checkInTime === attendanceRecord.checkInTime
            );
            if (allIndex !== -1) {
                this.allAttendanceRecords[allIndex] = attendanceRecord;
            }
        }
        
        this.saveToLocalStorage('attendanceRecords', this.attendanceRecords);
        this.saveToLocalStorage('allAttendanceRecords', this.allAttendanceRecords);
        console.log('✅ Saved to localStorage (primary storage)');
        
        // Try to save to backend if we have a token
        const token = this.getAuthToken();
        if (!token) {
            console.log('⚠️ No authentication token - saved to localStorage only');
            return;
        }
        
        try {
            // 1. ESSENTIAL DATA → MongoDB (cross-device access)
            const essentialData = {
                employeeId: attendanceRecord.employeeId,
                employeeName: attendanceRecord.employeeName,
                employeePosition: attendanceRecord.employeePosition,
                date: attendanceRecord.date,
                checkInTime: attendanceRecord.checkInTime,
                checkOutTime: attendanceRecord.checkOutTime,
                method: attendanceRecord.method,
                isLate: attendanceRecord.isLate,
                lateMinutes: attendanceRecord.lateMinutes,
                hoursWorked: attendanceRecord.hoursWorked,
                payDeduction: attendanceRecord.payDeduction,
                createdAt: attendanceRecord.createdAt
                // NOTE: NO capturedImage or capturedVideo here
            };
            
            console.log('📤 Saving essential attendance data to MongoDB...');
            const mongoResponse = await fetch(`${window.API_CONFIG?.BASE_URL || 'https://daetspa-backend.onrender.com'}/api/attendance`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(essentialData)
            });
            
            if (!mongoResponse.ok) {
                console.error('❌ Failed to save to MongoDB:', mongoResponse.status);
                // Fallback to IndexedDB only
                await window.db.add('attendance', attendanceRecord);
                return;
            }
            
            const mongoResult = await mongoResponse.json();
            const mongoId = mongoResult.data?.id || mongoResult.data?._id;
            console.log('✅ Essential data saved to MongoDB with ID:', mongoId);
            
            // Update the record ID with server ID
            const recordIndex = this.attendanceRecords.findIndex(r => r.id === attendanceRecord.id);
            if (recordIndex !== -1) {
                this.attendanceRecords[recordIndex].id = mongoId;
            }
            const allIndex = this.allAttendanceRecords.findIndex(r => r.id === attendanceRecord.id);
            if (allIndex !== -1) {
                this.allAttendanceRecords[allIndex].id = mongoId;
            }
            
            // Save updated records back to localStorage
            this.saveToLocalStorage('attendanceRecords', this.attendanceRecords);
            this.saveToLocalStorage('allAttendanceRecords', this.allAttendanceRecords);
            console.log('✅ Updated record with server ID in localStorage');
            
            // 2. Try to save media to IndexedDB if database is available
            if (window.db && window.db.db && (attendanceRecord.capturedImage || attendanceRecord.capturedVideo)) {
                try {
                    const mediaData = {
                        id: mongoId,
                        capturedImage: attendanceRecord.capturedImage,
                        capturedVideo: attendanceRecord.capturedVideo,
                        employeeId: attendanceRecord.employeeId,
                        date: attendanceRecord.date,
                        checkInTime: attendanceRecord.checkInTime
                    };
                    
                    console.log('📷 Trying to save media data to IndexedDB...');
                    await window.db.add('attendance_media', mediaData);
                    console.log('✅ Media data saved to IndexedDB');
                } catch (dbError) {
                    console.warn('⚠️ Could not save media to IndexedDB:', dbError.message);
                    // This is okay - localStorage is our primary storage
                }
            }
            
        } catch (error) {
            console.error('⚠️ Could not save to backend:', error.message);
            // Record is already in localStorage with local_ prefix ID
            // It will be synced later when connection is restored
        }
    }
    
    async updateAttendanceHybrid(updatedRecord, recordId) {
        console.log('🔄 [HYBRID] Updating attendance with hybrid storage...');
        
        // Mark for sync
        updatedRecord.syncStatus = 'pending';
        
        // Update in IndexedDB for sync manager
        try {
            if (window.db) {
                const records = await window.db.getAll('attendance');
                const existingRecord = records.find(r => 
                    r.employeeId === updatedRecord.employeeId && 
                    r.date === updatedRecord.date
                );
                
                if (existingRecord) {
                    await window.db.update('attendance', {
                        ...existingRecord,
                        ...updatedRecord,
                        syncStatus: 'pending'
                    });
                    console.log('✅ Updated in IndexedDB for cross-device sync');
                    
                    // Trigger sync to other devices
                    if (window.syncManager && window.syncManager.triggerSync) {
                        window.syncManager.triggerSync();
                        console.log('🔄 Triggered sync to other devices');
                    }
                }
            }
        } catch (error) {
            console.warn('⚠️ Could not update IndexedDB:', error);
        }
        
        // ALWAYS update localStorage first (primary storage)
        const index = this.attendanceRecords.findIndex(r => r.id === recordId);
        if (index !== -1) {
            this.attendanceRecords[index] = updatedRecord;
        }
        
        const allIndex = this.allAttendanceRecords.findIndex(r => r.id === recordId);
        if (allIndex !== -1) {
            this.allAttendanceRecords[allIndex] = updatedRecord;
        }
        
        // Save to localStorage immediately
        this.saveToLocalStorage('attendanceRecords', this.attendanceRecords);
        this.saveToLocalStorage('allAttendanceRecords', this.allAttendanceRecords);
        console.log('✅ Updated in localStorage (primary storage)');
        
        // Try to update backend if we have token
        const token = this.getAuthToken();
        if (!token) {
            console.log('⚠️ No authentication token - updated localStorage only');
            return;
        }
        
        try {
            // Try to update MongoDB
            const essentialData = {
                employeeId: updatedRecord.employeeId,
                employeeName: updatedRecord.employeeName,
                employeePosition: updatedRecord.employeePosition,
                date: updatedRecord.date,
                checkInTime: updatedRecord.checkInTime,
                checkOutTime: updatedRecord.checkOutTime,
                method: updatedRecord.method,
                isLate: updatedRecord.isLate,
                lateMinutes: updatedRecord.lateMinutes,
                hoursWorked: updatedRecord.hoursWorked,
                payDeduction: updatedRecord.payDeduction,
                checkOutDeduction: updatedRecord.checkOutDeduction,
                earlyDepartureMinutes: updatedRecord.earlyDepartureMinutes,
                createdAt: updatedRecord.createdAt,
                modifiedAt: new Date().toISOString()
            };
            
            // Only try to update MongoDB if it's not a local record
            if (recordId && !recordId.startsWith('local_')) {
                console.log('📤 Trying to update MongoDB...');
                const mongoResponse = await fetch(`${window.API_CONFIG?.BASE_URL || 'https://daetspa-backend.onrender.com'}/api/attendance/${recordId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(essentialData)
                });
                
                if (mongoResponse.ok) {
                    console.log('✅ Updated in MongoDB');
                } else {
                    console.warn('⚠️ Could not update MongoDB:', mongoResponse.status);
                }
            } else {
                console.log('⚠️ Local record - will sync to backend later');
            }
        } catch (error) {
            console.warn('⚠️ Could not update backend:', error.message);
            // Record is already updated in localStorage
        }
    }
    
    async loadAttendanceHybrid() {
        console.log('📥 [HYBRID] Loading attendance from hybrid storage...');
        
        // First, load from localStorage (our primary storage)
        const localStorageRecords = this.loadFromLocalStorage('allAttendanceRecords') || [];
        console.log(`📦 Loaded ${localStorageRecords.length} records from localStorage (primary)`);
        
        // If no token, just return localStorage data
        const token = this.getAuthToken();
        if (!token) {
            console.log('⚠️ No token, using localStorage data only');
            return localStorageRecords;
        }
        
        // Try to load from MongoDB to get any server-side updates
        let mongoRecords = [];
        try {
            console.log('📤 Checking MongoDB for updates...');
            const response = await fetch(`${window.API_CONFIG?.BASE_URL || 'https://daetspa-backend.onrender.com'}/api/attendance`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                mongoRecords = result.data || [];
                console.log(`✅ Loaded ${mongoRecords.length} records from MongoDB`);
            } else {
                console.warn('⚠️ Could not load from MongoDB:', response.status);
            }
        } catch (error) {
            console.warn('⚠️ Could not connect to MongoDB:', error.message);
        }
        
        // Merge: combine localStorage (has local records) with MongoDB (has synced records)
        const recordMap = new Map();
        
        // Add localStorage records first
        localStorageRecords.forEach(record => {
            const key = `${record.employeeId}_${record.date}_${record.checkInTime}`;
            recordMap.set(key, record);
        });
        
        // Add/update with MongoDB records
        mongoRecords.forEach(record => {
            const key = `${record.employeeId}_${record.date}_${record.checkInTime || record.checkIn}`;
            recordMap.set(key, record);
        });
        
        const mergedRecords = Array.from(recordMap.values());
        console.log(`✅ Merged to ${mergedRecords.length} total records`);
        
        return mergedRecords;
    }

    updateAttendanceStats() {
        // Update attendance statistics in the UI
        try {
            const todayRecords = this.attendanceRecords || [];
            const totalPresent = todayRecords.length;
            const lateCount = todayRecords.filter(r => r.isLate).length;
            const checkedOut = todayRecords.filter(r => r.checkOutTime).length;
            
            // Update stats elements if they exist
            const presentElement = document.getElementById('attendancePresentCount');
            if (presentElement) {
                presentElement.textContent = totalPresent;
            }
            
            const lateElement = document.getElementById('attendanceLateCount');
            if (lateElement) {
                lateElement.textContent = lateCount;
            }
            
            const checkedOutElement = document.getElementById('attendanceCheckedOutCount');
            if (checkedOutElement) {
                checkedOutElement.textContent = checkedOut;
            }
            
            const pendingElement = document.getElementById('attendancePendingCount');
            if (pendingElement) {
                pendingElement.textContent = totalPresent - checkedOut;
            }
            
            console.log(`📊 Stats updated: Present=${totalPresent}, Late=${lateCount}, CheckedOut=${checkedOut}`);
        } catch (error) {
            console.error('Failed to update attendance stats:', error);
        }
    }
    
    renderAttendanceHistoryTable() {
        // Find the table body in the attendance history section
        const tableContainer = document.querySelector('.attendance-history-table tbody');
        if (!tableContainer) {
            console.warn('Attendance history table not found');
            return;
        }
        
        // Use all attendance records (not just today's)
        const records = this.allAttendanceRecords || [];
        
        if (records.length === 0) {
            tableContainer.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 2rem; color: #888;">
                        No attendance records found. Attendance data will appear here once employees check in.
                    </td>
                </tr>
            `;
            return;
        }
        
        // Sort records by date and time (newest first)
        const sortedRecords = [...records].sort((a, b) => {
            const dateA = new Date(a.checkInTime || a.createdAt);
            const dateB = new Date(b.checkInTime || b.createdAt);
            return dateB - dateA;
        });
        
        // Generate table rows
        tableContainer.innerHTML = sortedRecords.map((record, index) => {
            const checkInTime = record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString() : '-';
            const checkOutTime = record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString() : '-';
            const hoursWorked = record.hoursWorked ? record.hoursWorked.toFixed(1) : '-';
            const status = record.checkOutTime ? 'Complete' : 'In Progress';
            
            return `
                <tr>
                    <td>${record.employeeName || 'Unknown'}</td>
                    <td>${record.date || new Date(record.checkInTime).toLocaleDateString()}</td>
                    <td>${checkInTime}</td>
                    <td>${checkOutTime}</td>
                    <td>${hoursWorked}</td>
                    <td><span class="badge ${status === 'Complete' ? 'badge-success' : 'badge-warning'}">${status}</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="window.attendanceManager.viewAttendanceRecord(${index})">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    renderAttendanceRecords() {
        const container = document.getElementById('attendanceRecords');
        if (!container) return;
        
        if (this.attendanceRecords.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #666;">
                    <i class="fas fa-clipboard-list" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <p>No attendance records for today</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="attendance-list">
                ${this.attendanceRecords.map((record, index) => `
                    <div class="attendance-record" style="display: flex; align-items: center; gap: 1rem; padding: 1rem; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 1rem;">
                        ${record.capturedImage ? `
                            <div class="attendance-photo" style="flex-shrink: 0;">
                                <img src="${record.capturedImage}" alt="${record.employeeName}" 
                                     style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 2px solid #ddd;">
                            </div>
                        ` : `
                            <div class="attendance-photo" style="flex-shrink: 0;">
                                <div style="width: 60px; height: 60px; border-radius: 50%; background: #f0f0f0; display: flex; align-items: center; justify-content: center;">
                                    <i class="fas fa-user" style="color: #999;"></i>
                                </div>
                            </div>
                        `}
                        <div class="attendance-record-info" style="flex: 1;">
                            <h4 style="margin: 0;">${record.employeeName}</h4>
                            <p style="margin: 0.25rem 0; color: #666;">${record.employeePosition || 'Employee'}</p>
                            <p class="attendance-time" style="margin: 0.25rem 0; font-size: 0.9em;">
                                Check-in: ${this.formatTimeDisplay(record.checkInTime)}
                                ${record.isLate ? `<span style="color: #dc3545; font-weight: bold;"> (Late by ${record.lateMinutes} mins)</span>` : ''}
                            </p>
                            ${record.checkOutTime ? `
                                <p class="attendance-time" style="margin: 0.25rem 0; font-size: 0.9em;">
                                    Check-out: ${this.formatTimeDisplay(record.checkOutTime)}
                                </p>
                            ` : ''}
                        </div>
                        <div class="attendance-record-actions" style="display: flex; gap: 0.5rem; align-items: center;">
                            <button class="btn btn-primary btn-sm" onclick="window.attendanceManager.viewAttendanceDetails(${index})" style="padding: 0.5rem 1rem;">
                                <i class="fas fa-eye"></i> View
                            </button>
                            <span class="badge ${record.capturedVideo ? 'badge-success' : 'badge-secondary'}" style="padding: 0.5rem;">
                                ${record.capturedVideo ? '<i class="fas fa-video"></i>' : '<i class="fas fa-image"></i>'}
                            </span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // View attendance details in modal
    viewAttendanceDetails(index) {
        const record = this.attendanceRecords[index];
        if (!record) return;
        
        const modal = document.getElementById('attendanceDetailsModal');
        const content = document.getElementById('attendanceDetailsContent');
        
        if (!modal || !content) return;
        
        content.innerHTML = `
            <div style="padding: 1rem;">
                <div style="display: flex; gap: 2rem; margin-bottom: 1.5rem;">
                    <div style="flex: 1;">
                        <h3 style="margin-top: 0;">${record.employeeName}</h3>
                        <p style="color: #666;">${record.employeePosition}</p>
                        <div style="margin-top: 1rem;">
                            <p><strong>Date:</strong> ${new Date(record.date).toLocaleDateString()}</p>
                            <p><strong>Check-in Time:</strong> ${new Date(record.checkInTime).toLocaleTimeString()}</p>
                            ${record.checkOutTime ? `<p><strong>Check-out Time:</strong> ${new Date(record.checkOutTime).toLocaleTimeString()}</p>` : ''}
                            <p><strong>Method:</strong> ${record.method === 'facial' ? 'Facial Recognition' : 'Manual Check-in'}</p>
                        </div>
                    </div>
                    ${record.capturedImage ? `
                        <div style="text-align: center;">
                            <img src="${record.capturedImage}" alt="${record.employeeName}" 
                                 style="width: 150px; height: 150px; border-radius: 8px; object-fit: cover; border: 2px solid #ddd;">
                            <p style="margin-top: 0.5rem; color: #666; font-size: 0.9em;">Photo Capture</p>
                        </div>
                    ` : ''}
                </div>
                
                ${record.capturedVideo ? `
                    <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #ddd;">
                        <h4>Captured Video</h4>
                        <video controls style="width: 100%; max-width: 400px; border-radius: 8px; margin-top: 1rem;">
                            <source src="${record.capturedVideo}" type="video/webm">
                            Your browser does not support video playback.
                        </video>
                    </div>
                ` : ''}
                
                <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #ddd; text-align: right;">
                    <button class="btn btn-secondary" onclick="document.getElementById('attendanceDetailsModal').style.display='none'">
                        Close
                    </button>
                </div>
            </div>
        `;
        
        modal.style.display = 'block';
    }

    async startCamera() {
        try {
            const video = document.getElementById('faceVideo');
            if (!video) {
                console.error('Video element not found');
                return;
            }
            
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'user' } 
            });
            
            video.srcObject = this.stream;
            
            document.getElementById('startCameraBtn').disabled = true;
            document.getElementById('stopCameraBtn').disabled = false;
            
            // Enable record button
            const recordBtn = document.getElementById('recordVideoBtn');
            if (recordBtn) {
                recordBtn.disabled = false;
            }
            
            if (window.showNotification) {
                window.showNotification('Camera started', 'success');
            }
        } catch (error) {
            console.error('Failed to start camera:', error);
            if (window.showNotification) {
                window.showNotification('Failed to start camera', 'error');
            }
        }
    }

    // Helper method to format time display
    formatTimeDisplay(timeValue) {
        if (!timeValue) return '--';

        // If it's already in HH:MM format, return as-is
        if (typeof timeValue === 'string' && /^\d{2}:\d{2}$/.test(timeValue)) {
            return timeValue;
        }

        // If it's an ISO string, parse and format
        try {
            const date = new Date(timeValue);
            if (!isNaN(date.getTime())) {
                return date.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                    timeZone: 'Asia/Manila'
                });
            }
        } catch (e) {
            // Fallback
        }

        return String(timeValue);
    }

    viewAttendanceRecord(index) {
        const records = this.allAttendanceRecords || [];
        const record = records[index];
        if (!record) return;
        
        // Create and show modal with attendance details
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            border-radius: 8px;
            padding: 2rem;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        `;
        
        const hoursWorked = record.hoursWorked ? record.hoursWorked.toFixed(1) + ' hours' : 'Not checked out';
        const status = record.isLate ? 'Late Arrival' : 'On Time';
        const statusColor = record.isLate ? '#600015' : '#800020';
        
        content.innerHTML = `
            <div style="border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem; margin-bottom: 1rem;">
                <h2 style="margin: 0 0 0.5rem 0; color: #1f2937;">Attendance Details</h2>
                <button onclick="this.closest('div[style*=\\'position: fixed\\']').remove()" style="position: absolute; top: 1rem; right: 1rem; background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280;">&times;</button>
            </div>
            
            <div style="display: grid; gap: 1rem;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div>
                        <label style="display: block; color: #6b7280; font-size: 0.875rem; margin-bottom: 0.25rem;">Employee</label>
                        <p style="margin: 0; font-weight: 500; color: #1f2937;">${record.employeeName || 'Unknown'}</p>
                    </div>
                    <div>
                        <label style="display: block; color: #6b7280; font-size: 0.875rem; margin-bottom: 0.25rem;">Date</label>
                        <p style="margin: 0; font-weight: 500; color: #1f2937;">${record.date || 'N/A'}</p>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div>
                        <label style="display: block; color: #6b7280; font-size: 0.875rem; margin-bottom: 0.25rem;">Check In Time</label>
                        <p style="margin: 0; font-weight: 500; color: #1f2937;">${this.formatTimeDisplay(record.checkInTime)}</p>
                    </div>
                    <div>
                        <label style="display: block; color: #6b7280; font-size: 0.875rem; margin-bottom: 0.25rem;">Check Out Time</label>
                        <p style="margin: 0; font-weight: 500; color: #1f2937;">${this.formatTimeDisplay(record.checkOutTime)}</p>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div>
                        <label style="display: block; color: #6b7280; font-size: 0.875rem; margin-bottom: 0.25rem;">Hours Worked</label>
                        <p style="margin: 0; font-weight: 500; color: #1f2937;">${hoursWorked}</p>
                    </div>
                    <div>
                        <label style="display: block; color: #6b7280; font-size: 0.875rem; margin-bottom: 0.25rem;">Status</label>
                        <span style="display: inline-block; background: ${statusColor}; color: white; padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.875rem; font-weight: 500;">
                            ${status}
                        </span>
                    </div>
                </div>
                
                ${record.notes ? `
                <div>
                    <label style="display: block; color: #6b7280; font-size: 0.875rem; margin-bottom: 0.25rem;">Notes</label>
                    <p style="margin: 0; color: #1f2937;">${record.notes}</p>
                </div>
                ` : ''}
            </div>
            
            <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; text-align: right;">
                <button onclick="this.closest('div[style*=\\'position: fixed\\']').remove()" style="background: #6b7280; color: white; border: none; padding: 0.5rem 1.5rem; border-radius: 6px; cursor: pointer; font-size: 0.875rem;">
                    Close
                </button>
            </div>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
            
            const video = document.getElementById('faceVideo');
            if (video) {
                video.srcObject = null;
            }
            
            document.getElementById('startCameraBtn').disabled = false;
            document.getElementById('stopCameraBtn').disabled = true;
            
            // Disable record button
            const recordBtn = document.getElementById('recordVideoBtn');
            if (recordBtn) {
                recordBtn.disabled = true;
            }
            
            if (window.showNotification) {
                window.showNotification('Camera stopped', 'info');
            }
        }
    }

    async captureAndRecognize() {
        const video = document.getElementById('faceVideo');
        const canvas = document.getElementById('faceCanvas');
        
        if (!video || !canvas) return;
        
        // Capture high-quality image
        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        // Save as high quality JPEG
        this.lastCapturedImage = canvas.toDataURL('image/jpeg', 0.9);
        
        // Show the captured image in a preview area if exists
        const preview = document.getElementById('capturedImagePreview');
        if (preview) {
            preview.src = this.lastCapturedImage;
            preview.style.display = 'block';
        }
        
        if (window.showNotification) {
            window.showNotification('Photo captured! Please select your name from the dropdown.', 'info');
        }
        
        // Focus on dropdown
        document.getElementById('attendanceEmployeeSelect').focus();
    }
    
    // Start video recording with countdown
    async startVideoRecording() {
        if (!this.stream) {
            if (window.showNotification) {
                window.showNotification('Please start camera first', 'error');
            }
            return;
        }
        
        try {
            const options = {
                mimeType: 'video/webm;codecs=vp8',
                videoBitsPerSecond: 2500000
            };
            
            this.recordedChunks = [];
            this.mediaRecorder = new MediaRecorder(this.stream, options);
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                this.recordedVideoBlob = new Blob(this.recordedChunks, {
                    type: 'video/webm'
                });
                
                // Convert to base64 for storage
                const reader = new FileReader();
                reader.onloadend = () => {
                    this.recordedVideoData = reader.result;
                    console.log('Video recorded and converted to base64');
                    
                    // Show preview
                    const preview = document.getElementById('capturedVideoPreview');
                    if (preview) {
                        preview.src = this.recordedVideoData;
                        preview.style.display = 'block';
                    }
                    
                    // Also capture a thumbnail frame
                    this.captureVideoThumbnail();
                };
                reader.readAsDataURL(this.recordedVideoBlob);
            };
            
            this.mediaRecorder.start();
            this.isRecordingVideo = true;
            
            // Show recording status
            const recordingStatus = document.getElementById('recordingStatus');
            if (recordingStatus) {
                recordingStatus.style.display = 'block';
            }
            
            // Update UI
            const recordBtn = document.getElementById('recordVideoBtn');
            if (recordBtn) {
                recordBtn.disabled = true;
            }
            
            // Countdown timer
            let timeLeft = 5;
            const timerElement = document.getElementById('recordingTimer');
            const countdownInterval = setInterval(() => {
                timeLeft--;
                if (timerElement) {
                    timerElement.textContent = timeLeft;
                }
                if (timeLeft <= 0) {
                    clearInterval(countdownInterval);
                }
            }, 1000);
            
            if (window.showNotification) {
                window.showNotification('Recording started - keep your face in view', 'info');
            }
            
            // Auto-stop after 5 seconds
            setTimeout(() => {
                if (this.isRecordingVideo) {
                    this.stopVideoRecording();
                }
            }, 5000);
            
        } catch (error) {
            console.error('Failed to start recording:', error);
            if (window.showNotification) {
                window.showNotification('Failed to start recording', 'error');
            }
        }
    }
    
    // Stop video recording
    stopVideoRecording() {
        if (this.mediaRecorder && this.isRecordingVideo) {
            this.mediaRecorder.stop();
            this.isRecordingVideo = false;
            
            // Hide recording status
            const recordingStatus = document.getElementById('recordingStatus');
            if (recordingStatus) {
                recordingStatus.style.display = 'none';
            }
            
            // Update UI
            const recordBtn = document.getElementById('recordVideoBtn');
            if (recordBtn) {
                recordBtn.innerHTML = '<i class="fas fa-video"></i> Record Video (5 sec)';
                recordBtn.disabled = false;
            }
            
            if (window.showNotification) {
                window.showNotification('Video captured! Select your name and check in.', 'success');
            }
            
            // Focus on dropdown
            document.getElementById('attendanceEmployeeSelect').focus();
        }
    }
    
    // Capture video thumbnail for display
    captureVideoThumbnail() {
        const video = document.getElementById('faceVideo');
        const canvas = document.getElementById('faceCanvas');
        
        if (video && canvas) {
            const context = canvas.getContext('2d');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0);
            this.lastCapturedImage = canvas.toDataURL('image/jpeg', 0.9);
        }
    }

    async refreshAttendance() {
        // Use simple load method like POS
        await this.loadEmployeesSimple();
        
        await this.loadAttendanceRecords();
        this.renderAttendanceRecords();
        
        if (window.showNotification) {
            window.showNotification('Attendance data refreshed', 'success');
        }
    }
}

// Create and initialize
const attendanceManager = new AttendanceManager();
window.attendanceManager = attendanceManager;
console.log('✅ AttendanceManager created and ready');

// Auto-init when page becomes visible
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📊 [ATTENDANCE] DOM loaded, NOT auto-initializing (will be done by app.js)');
    // DO NOT auto-init here - app.js will call init() when showing the page
});

// Mark initialization status
window.attendanceManager.initialized = false;

// Simple direct employee load function for debugging
window.loadEmployeesDirectly = async function() {
    console.log('🔧 Direct employee load attempt...');
    try {
        // Wait for database
        if (!window.db || !window.db.db) {
            console.log('⏳ Waiting for database...');
            if (typeof window.ensureDBInit === 'function') {
                await window.ensureDBInit();
            } else {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        // Load employees
        const employees = await window.db.getAll('employees');
        console.log('📊 Found employees:', employees);
        
        // Update attendance manager
        if (window.attendanceManager) {
            window.attendanceManager.employees = employees;
            window.attendanceManager.populateDropdownNow();
        }
        
        return employees;
    } catch (error) {
        console.error('❌ Direct load failed:', error);
        return [];
    }
};

// Manual populate function
window.populateAttendanceDropdown = async function() {
    console.log('🔧 Manually populating attendance dropdown...');
    
    try {
        // Ensure database is ready
        if (typeof window.ensureDBInit === 'function') {
            await window.ensureDBInit();
        }
        
        // Load employees and populate
        if (window.attendanceManager) {
            window.attendanceManager.employees = await window.db.getAll('employees');
            await window.attendanceManager.populateDropdownDirectly();
            console.log('✅ Dropdown populated with', window.attendanceManager.employees.length, 'employees');
            return true;
        } else {
            console.error('❌ AttendanceManager not found');
            return false;
        }
    } catch (error) {
        console.error('❌ Failed to populate dropdown:', error);
        return false;
    }
};

// EMERGENCY DIAGNOSTIC FUNCTION - Call from console to debug attendance issues
window.attendanceDiagnostics = function() {
    console.log('='.repeat(80));
    console.log('🔍 ATTENDANCE SYSTEM DIAGNOSTICS');
    console.log('='.repeat(80));

    // 1. Check if attendanceManager exists
    console.log('\n1️⃣ ATTENDANCE MANAGER:');
    console.log('   - Exists:', !!window.attendanceManager);
    console.log('   - Initialized:', window.attendanceManager?.initialized);
    console.log('   - Has currentEmployeeId:', !!window.attendanceManager?.currentEmployeeId);
    console.log('   - currentEmployeeId value:', window.attendanceManager?.currentEmployeeId);
    console.log('   - currentEmployeeName:', window.attendanceManager?.currentEmployeeName);

    // 2. Check auth system
    console.log('\n2️⃣ AUTH SYSTEM:');
    console.log('   - window.authSystem exists:', !!window.authSystem);
    console.log('   - currentUser exists:', !!window.authSystem?.currentUser);
    if (window.authSystem?.currentUser) {
        console.log('   - User email:', window.authSystem.currentUser.email);
        console.log('   - User type:', window.authSystem.currentUser.type);
        console.log('   - User role:', window.authSystem.currentUser.role);
        console.log('   - User id:', window.authSystem.currentUser.id);
        console.log('   - Full user object:', window.authSystem.currentUser);
    }

    // 3. Check tokens
    console.log('\n3️⃣ AUTHENTICATION TOKENS:');
    const token = localStorage.getItem('token');
    const sessionToken = sessionStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    console.log('   - localStorage token:', token ? `${token.substring(0, 30)}...` : 'NOT FOUND');
    console.log('   - sessionStorage token:', sessionToken ? `${sessionToken.substring(0, 30)}...` : 'NOT FOUND');
    console.log('   - localStorage user:', userStr ? 'EXISTS' : 'NOT FOUND');
    if (window.attendanceManager) {
        const foundToken = window.attendanceManager.getAuthToken();
        console.log('   - getAuthToken() returns:', foundToken ? `${foundToken.substring(0, 30)}...` : 'NULL');
    }

    // 4. Check UI elements
    console.log('\n4️⃣ UI ELEMENTS:');
    const selfAttendanceSection = document.getElementById('selfAttendanceSection');
    const managerAttendanceSection = document.getElementById('managerAttendanceSection');
    const selfCheckinBtn = document.getElementById('selfCheckinBtn');
    const selfCheckoutBtn = document.getElementById('selfCheckoutBtn');
    console.log('   - selfAttendanceSection exists:', !!selfAttendanceSection);
    console.log('   - selfAttendanceSection displayed:', selfAttendanceSection?.style.display);
    console.log('   - managerAttendanceSection exists:', !!managerAttendanceSection);
    console.log('   - managerAttendanceSection displayed:', managerAttendanceSection?.style.display);
    console.log('   - selfCheckinBtn exists:', !!selfCheckinBtn);
    console.log('   - selfCheckinBtn disabled:', selfCheckinBtn?.disabled);
    console.log('   - selfCheckoutBtn exists:', !!selfCheckoutBtn);
    console.log('   - selfCheckoutBtn disabled:', selfCheckoutBtn?.disabled);

    // 5. Check event listeners
    console.log('\n5️⃣ EVENT LISTENERS:');
    console.log('   - _listenersAttached flag:', window.attendanceManager?._listenersAttached);

    // 6. Check attendance records
    console.log('\n6️⃣ ATTENDANCE RECORDS:');
    console.log('   - Today\'s records:', window.attendanceManager?.attendanceRecords?.length || 0);
    console.log('   - All records:', window.attendanceManager?.allAttendanceRecords?.length || 0);
    console.log('   - localStorage records:', localStorage.getItem('attendance_allAttendanceRecords') ? 'EXISTS' : 'NOT FOUND');

    // 7. Test button click handlers
    console.log('\n7️⃣ BUTTON CLICK HANDLERS:');
    if (selfCheckinBtn) {
        console.log('   - Testing selfCheckin click...');
        try {
            selfCheckinBtn.click();
            console.log('   - Click executed (check above for logs)');
        } catch (e) {
            console.error('   - Click FAILED:', e.message);
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log('Run window.attendanceManager.init() to manually initialize if needed');
    console.log('='.repeat(80));
};

// Debug function to check localStorage attendance data
window.checkAttendanceLocalStorage = function() {
    console.log('🔍 Checking attendance data in localStorage...');

    const keys = ['attendance_attendanceRecords', 'attendance_allAttendanceRecords'];

    keys.forEach(key => {
        const data = localStorage.getItem(key);
        if (data) {
            try {
                const parsed = JSON.parse(data);
                console.log(`✅ ${key}:`, parsed.length, 'records');
                console.log(`   Raw data:`, parsed);
            } catch (e) {
                console.error(`❌ Failed to parse ${key}:`, e);
                console.log(`   Raw value:`, data);
            }
        } else {
            console.log(`⚠️ ${key}: Not found in localStorage`);
        }
    });

    // Check all localStorage keys
    console.log('\n📦 All localStorage keys:');
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.includes('attendance')) {
            console.log(`  - ${key}: ${localStorage.getItem(key).substring(0, 100)}...`);
        }
    }
    
    // Check if attendanceManager has data in memory
    if (window.attendanceManager) {
        console.log('\n💾 AttendanceManager in-memory data:');
        console.log('  - attendanceRecords:', window.attendanceManager.attendanceRecords?.length || 0, 'records');
        console.log('  - allAttendanceRecords:', window.attendanceManager.allAttendanceRecords?.length || 0, 'records');
    }
};

// Debug function to manually save test data
window.testAttendanceSave = function() {
    console.log('🧪 Testing attendance save to localStorage...');
    
    const testRecord = {
        id: `test_${Date.now()}`,
        employeeId: 'test123',
        employeeName: 'Test Employee',
        employeePosition: 'Tester',
        date: new Date().toISOString().split('T')[0],
        checkInTime: new Date().toISOString(),
        checkOutTime: null,
        method: 'manual',
        isLate: false,
        lateMinutes: 0,
        createdAt: new Date().toISOString()
    };
    
    // Get existing records
    let existing = [];
    try {
        const stored = localStorage.getItem('attendance_allAttendanceRecords');
        if (stored) {
            existing = JSON.parse(stored);
        }
    } catch (e) {
        console.error('Failed to parse existing records:', e);
    }
    
    // Add test record
    existing.push(testRecord);
    
    // Save back
    try {
        localStorage.setItem('attendance_allAttendanceRecords', JSON.stringify(existing));
        console.log('✅ Test record saved to localStorage');
        console.log('   Total records now:', existing.length);
        
        // Verify save
        const verify = localStorage.getItem('attendance_allAttendanceRecords');
        const parsed = JSON.parse(verify);
        console.log('✅ Verification: Found', parsed.length, 'records in localStorage');
    } catch (e) {
        console.error('❌ Failed to save test record:', e);
    }
};

// Debug function to check database directly
window.checkEmployeesInDB = async function() {
    console.log('🔍 Checking employees in database...');
    
    // Try the actual database name: AvaSolutionsDB
    const dbRequest = indexedDB.open('AvaSolutionsDB');
    
    dbRequest.onsuccess = () => {
        const db = dbRequest.result;
        const transaction = db.transaction(['employees'], 'readonly');
        const store = transaction.objectStore('employees');
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => {
            const employees = getAllRequest.result;
            console.log('📊 Employees found in AvaSolutionsDB:', employees.length);
            console.log('📊 Raw employee data from IndexedDB:', employees);
            
            // Inspect each employee's structure
            employees.forEach((emp, i) => {
                console.log(`Employee ${i}:`, emp);
                console.log(`Employee ${i} keys:`, Object.keys(emp));
                console.log(`Employee ${i} has 'name' property:`, emp.hasOwnProperty('name'));
                console.log(`Employee ${i} name value:`, emp.name);
            });
            
            // Try to populate dropdown directly with all possible name fields
            const select = document.getElementById('attendanceEmployeeSelect');
            if (select && employees.length > 0) {
                select.innerHTML = '<option value="">Choose an employee...</option>';
                employees.forEach((emp, i) => {
                    if (emp) {
                        const possibleNames = [
                            emp.name,
                            emp.Name, 
                            emp.employeeName,
                            emp.fullName,
                            emp.firstName,
                            emp.displayName
                        ];
                        
                        const employeeName = possibleNames.find(n => n && n.trim()) || `Employee ${i + 1}`;
                        
                        const option = document.createElement('option');
                        option.value = emp.id || emp._id || i.toString();
                        option.textContent = employeeName;
                        select.appendChild(option);
                        console.log(`✅ Added to dropdown: "${employeeName}" (tried fields: ${possibleNames.map((n,idx) => n ? `[${idx}]="${n}"` : `[${idx}]=null`).join(', ')})`);
                    }
                });
                console.log('✅ Dropdown populated with', select.options.length - 1, 'employees');
            }
        };
    };
    
    dbRequest.onerror = (e) => {
        console.error('❌ Failed to open AvaSolutionsDB:', e);
    };
};

// Additional debug function to manually fix the dropdown
window.fixAttendanceDropdown = async function() {
    console.log('🔧 Attempting emergency fix for attendance dropdown...');
    
    // Direct IndexedDB access
    return new Promise((resolve) => {
        const dbRequest = indexedDB.open('AvaSolutionsDB');
        
        dbRequest.onsuccess = () => {
            const db = dbRequest.result;
            const transaction = db.transaction(['employees'], 'readonly');
            const store = transaction.objectStore('employees');
            const getAllRequest = store.getAll();
            
            getAllRequest.onsuccess = () => {
                const employees = getAllRequest.result || [];
                console.log('📊 Direct IndexedDB query found:', employees.length, 'employees');
                console.log('📊 Raw data:', employees);
                
                const select = document.getElementById('attendanceEmployeeSelect');
                if (!select) {
                    console.error('❌ Dropdown element not found!');
                    resolve(false);
                    return;
                }
                
                // Clear all options
                while (select.firstChild) {
                    select.removeChild(select.firstChild);
                }
                
                // Add default option
                const defaultOpt = document.createElement('option');
                defaultOpt.value = '';
                defaultOpt.textContent = 'Choose an employee...';
                select.appendChild(defaultOpt);
                
                if (employees.length === 0) {
                    console.warn('⚠️ No employees in database');
                    const noEmp = document.createElement('option');
                    noEmp.value = '';
                    noEmp.textContent = 'No employees - Add in Employee Management';
                    noEmp.disabled = true;
                    select.appendChild(noEmp);
                } else {
                    // Add each employee
                    employees.forEach((emp, i) => {
                        if (emp) {
                            const option = document.createElement('option');
                            // Check ALL possible name fields
                            const possibleNames = [
                                emp.name, emp.Name, emp.employeeName, emp.fullName,
                                emp.firstName, emp.lastName, emp.displayName,
                                emp.first_name, emp.last_name, emp.full_name,
                                emp.employee_name, emp.userName, emp.username
                            ];
                            
                            let employeeName = possibleNames.find(n => n && String(n).trim());
                            
                            // If still no name, construct from parts or use fallback
                            if (!employeeName) {
                                if (emp.firstName && emp.lastName) {
                                    employeeName = `${emp.firstName} ${emp.lastName}`;
                                } else if (emp.first_name && emp.last_name) {
                                    employeeName = `${emp.first_name} ${emp.last_name}`;
                                } else {
                                    employeeName = `Employee ${i + 1}`;
                                }
                            }
                            
                            option.value = emp.id || emp._id || String(i);
                            option.textContent = employeeName;
                            select.appendChild(option);
                            console.log(`✅ Added: "${employeeName}" (ID: ${option.value})`);
                            console.log('   Employee data:', emp);
                        }
                    });
                }
                
                console.log('✅ Emergency fix complete. Dropdown has', select.options.length - 1, 'employees');
                
                // Also update attendance manager
                if (window.attendanceManager) {
                    window.attendanceManager.employees = employees;
                    console.log('✅ Updated attendanceManager.employees');
                }
                
                resolve(true);
            };
            
            getAllRequest.onerror = () => {
                console.error('❌ Failed to get employees from IndexedDB');
                resolve(false);
            };
        };
        
        dbRequest.onerror = () => {
            console.error('❌ Failed to open database');
            resolve(false);
        };
    });
};