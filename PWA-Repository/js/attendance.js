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
        // Check localStorage for token (consistent with other modules)
        const token = localStorage.getItem('token');
        if (token) return token;
        
        // Check sessionStorage as fallback
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
            // Simple initialization like POS
            // Load employees
            await this.loadEmployeesSimple();
            
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
            console.log('✅ [ATTENDANCE] Initialization complete with', this.employees.length, 'employees loaded');
            
            // Show notification about employees loaded
            if (window.showNotification && this.employees.length === 0) {
                window.showNotification('No employees found. Add employees in Employee Management first.', 'info');
            }
        } catch (error) {
            console.error('❌ [ATTENDANCE] Initialization failed:', error);
            if (window.showNotification) {
                window.showNotification('Failed to initialize attendance system', 'error');
            }
            // Still mark as initialized to prevent re-initialization loops
            window.attendanceManager.initialized = true;
        }
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
            this.employees = await window.db.getAll('employees');
            console.log('✅ Loaded', this.employees.length, 'employees from database');
            
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
                this.employees = await window.db.getAll('employees');
                console.log('✅ [ATTENDANCE] Loaded employees:', this.employees.length);
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
            
            // Try API first, fallback to local storage
            try {
                await this.saveAttendanceHybrid(attendanceRecord);
            } catch (hybridError) {
                console.error('Hybrid save failed, trying local only:', hybridError);
                // Simple fallback - just save locally without complex logic
                const simpleRecord = {
                    ...attendanceRecord,
                    id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                };
                
                // Store in memory and localStorage
                this.attendanceRecords.push(simpleRecord);
                this.allAttendanceRecords = this.allAttendanceRecords || [];
                this.allAttendanceRecords.push(simpleRecord);
                
                // Save to localStorage for persistence
                this.saveToLocalStorage('attendanceRecords', this.attendanceRecords);
                this.saveToLocalStorage('allAttendanceRecords', this.allAttendanceRecords);
                
                console.log('✅ Saved attendance in memory and localStorage as fallback');
                console.log('📦 Current attendanceRecords:', this.attendanceRecords);
                console.log('📦 Current allAttendanceRecords:', this.allAttendanceRecords);
                console.log('📦 Verifying localStorage save:', {
                    attendanceRecords: this.loadFromLocalStorage('attendanceRecords'),
                    allAttendanceRecords: this.loadFromLocalStorage('allAttendanceRecords')
                });
            }
            
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
            
            // Try to update via hybrid storage, fallback to memory
            try {
                await this.updateAttendanceHybrid(updatedRecord, checkInRecord.id);
            } catch (updateError) {
                console.error('Hybrid update failed, updating in memory:', updateError);
                // Update in memory arrays
                const index = this.attendanceRecords.findIndex(r => r.id === checkInRecord.id);
                if (index !== -1) {
                    this.attendanceRecords[index] = updatedRecord;
                }
                const allIndex = this.allAttendanceRecords.findIndex(r => r.id === checkInRecord.id);
                if (allIndex !== -1) {
                    this.allAttendanceRecords[allIndex] = updatedRecord;
                }
                
                // Save to localStorage for persistence
                this.saveToLocalStorage('attendanceRecords', this.attendanceRecords);
                this.saveToLocalStorage('allAttendanceRecords', this.allAttendanceRecords);
                
                console.log('✅ Updated check-out in memory and localStorage');
            }
            
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
                record.id && record.id.startsWith('local_')
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
            const today = new Date().toISOString().split('T')[0];
            
            // First, load from localStorage to preserve data across refreshes
            const localStorageRecords = this.loadFromLocalStorage('allAttendanceRecords') || [];
            const localStorageTodayRecords = this.loadFromLocalStorage('attendanceRecords') || [];
            
            console.log(`📦 Loaded ${localStorageRecords.length} records from localStorage`);
            console.log('📦 localStorage allAttendanceRecords:', localStorageRecords);
            console.log('📦 localStorage todayRecords:', localStorageTodayRecords);
            
            // Initialize arrays with localStorage data
            this.attendanceRecords = localStorageTodayRecords;
            this.allAttendanceRecords = localStorageRecords;
            
            // Skip database loading if not ready
            if (!window.db || !window.db.db) {
                console.warn('Database not ready, using localStorage data only');
                // Filter today's records from localStorage if needed
                this.attendanceRecords = localStorageRecords.filter(record => record.date === today);
                return;
            }
            
            // Try to load from hybrid storage and merge with localStorage
            let hybridRecords = [];
            try {
                hybridRecords = await this.loadAttendanceHybrid();
                console.log(`📥 Loaded ${hybridRecords.length} records from hybrid storage`);
            } catch (loadError) {
                console.error('Failed to load from hybrid storage:', loadError);
                // Keep using localStorage records
                hybridRecords = [];
            }
            
            // Merge records: localStorage + hybrid, removing duplicates
            const recordMap = new Map();
            
            // Add localStorage records first (preserved across refreshes)
            localStorageRecords.forEach(record => {
                const key = `${record.employeeId}_${record.date}_${record.checkInTime}`;
                recordMap.set(key, record);
            });
            
            // Add/update with hybrid records (may have server IDs)
            hybridRecords.forEach(record => {
                const key = `${record.employeeId}_${record.date}_${record.checkInTime}`;
                // If record exists in localStorage, merge with server data
                const existingRecord = recordMap.get(key);
                if (existingRecord) {
                    recordMap.set(key, { ...existingRecord, ...record });
                } else {
                    recordMap.set(key, record);
                }
            });
            
            // Convert map back to array
            const allRecords = Array.from(recordMap.values());
            
            // Sort by date, newest first
            allRecords.sort((a, b) => {
                const dateA = new Date(a.date || a.createdAt);
                const dateB = new Date(b.date || b.createdAt);
                return dateB - dateA;
            });
            
            // Store today's records separately
            this.attendanceRecords = allRecords.filter(record => record.date === today);
            
            // Store all records for display
            this.allAttendanceRecords = allRecords;
            
            // Save merged data back to localStorage for persistence
            this.saveToLocalStorage('attendanceRecords', this.attendanceRecords);
            this.saveToLocalStorage('allAttendanceRecords', this.allAttendanceRecords);
            
            console.log(`✅ Loaded ${this.attendanceRecords.length} attendance records for today`);
            console.log(`✅ Total attendance records: ${allRecords.length}`);
        } catch (error) {
            console.error('❌ Failed to load attendance records:', error);
            // Keep existing records from localStorage
            this.attendanceRecords = this.attendanceRecords || [];
            this.allAttendanceRecords = this.allAttendanceRecords || [];
        }
    }

    // ============================================================================
    // HYBRID STORAGE METHODS: Essential data → MongoDB, Media → IndexedDB
    // ============================================================================
    
    async saveAttendanceHybrid(attendanceRecord) {
        console.log('💾 [HYBRID] Saving attendance with hybrid storage...');
        
        // Ensure database is initialized
        if (!window.db || !window.db.db) {
            console.error('❌ Database not initialized, waiting...');
            if (typeof window.ensureDBInit === 'function') {
                await window.ensureDBInit();
            } else {
                console.error('❌ Cannot save attendance - database not ready');
                throw new Error('Database not initialized');
            }
        }
        
        const token = this.getAuthToken();
        if (!token) {
            console.error('❌ No authentication token - falling back to IndexedDB only');
            try {
                await window.db.add('attendance', attendanceRecord);
            } catch (error) {
                console.error('❌ Failed to save to IndexedDB:', error);
                throw error;
            }
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
            
            // 2. MEDIA DATA → IndexedDB (local verification only)
            const mediaData = {
                id: mongoId, // Use MongoDB ID as reference
                capturedImage: attendanceRecord.capturedImage,
                capturedVideo: attendanceRecord.capturedVideo,
                // Store minimal reference data for lookup
                employeeId: attendanceRecord.employeeId,
                date: attendanceRecord.date,
                checkInTime: attendanceRecord.checkInTime
            };
            
            if (mediaData.capturedImage || mediaData.capturedVideo) {
                console.log('📷 Saving media data to IndexedDB...');
                await window.db.add('attendance_media', mediaData);
                console.log('✅ Media data saved to IndexedDB');
            }
            
            // 3. Also save essential data to IndexedDB for offline access
            const offlineData = { ...essentialData, id: mongoId };
            await window.db.add('attendance', offlineData);
            console.log('✅ Essential data cached in IndexedDB for offline access');
            
            // 4. CRITICAL: Update in-memory arrays and save to localStorage
            const fullRecord = { ...offlineData, ...mediaData };
            this.attendanceRecords.push(fullRecord);
            this.allAttendanceRecords.push(fullRecord);
            
            // Save to localStorage immediately
            this.saveToLocalStorage('attendanceRecords', this.attendanceRecords);
            this.saveToLocalStorage('allAttendanceRecords', this.allAttendanceRecords);
            console.log('✅ Saved to localStorage for persistence across refreshes');
            
        } catch (error) {
            console.error('❌ Hybrid save failed, falling back to IndexedDB only:', error);
            await window.db.add('attendance', attendanceRecord);
            
            // Still update memory and localStorage
            this.attendanceRecords.push(attendanceRecord);
            this.allAttendanceRecords.push(attendanceRecord);
            this.saveToLocalStorage('attendanceRecords', this.attendanceRecords);
            this.saveToLocalStorage('allAttendanceRecords', this.allAttendanceRecords);
        }
    }
    
    async updateAttendanceHybrid(updatedRecord, recordId) {
        console.log('🔄 [HYBRID] Updating attendance with hybrid storage...');
        
        const token = this.getAuthToken();
        if (!token) {
            console.error('❌ No authentication token - falling back to IndexedDB only');
            await window.db.update('attendance', { ...updatedRecord, id: recordId });
            return;
        }
        
        try {
            // 1. ESSENTIAL DATA → MongoDB
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
                createdAt: updatedRecord.createdAt,
                modifiedAt: new Date().toISOString()
            };
            
            console.log('📤 Updating essential attendance data in MongoDB...');
            const mongoResponse = await fetch(`${window.API_CONFIG?.BASE_URL || 'https://daetspa-backend.onrender.com'}/api/attendance/${recordId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(essentialData)
            });
            
            if (!mongoResponse.ok) {
                console.error('❌ Failed to update MongoDB:', mongoResponse.status);
                await window.db.update('attendance', { ...updatedRecord, id: recordId });
                return;
            }
            
            console.log('✅ Essential data updated in MongoDB');
            
            // 2. Update IndexedDB offline cache
            await window.db.put('attendance', { ...essentialData, id: recordId }, recordId);
            console.log('✅ Essential data updated in IndexedDB cache');
            
            // 3. Media data stays in IndexedDB (no update needed unless media changed)
            
        } catch (error) {
            console.error('❌ Hybrid update failed, falling back to IndexedDB only:', error);
            await window.db.update('attendance', { ...updatedRecord, id: recordId });
        }
    }
    
    async loadAttendanceHybrid() {
        console.log('📥 [HYBRID] Loading attendance from hybrid storage...');
        
        // Ensure database is initialized
        if (!window.db || !window.db.db) {
            console.warn('⚠️ Database not initialized, waiting...');
            if (typeof window.ensureDBInit === 'function') {
                await window.ensureDBInit();
            }
        }
        
        const token = this.getAuthToken();
        let mongoRecords = [];
        
        // 1. Try to load essential data from MongoDB
        if (token) {
            try {
                console.log('📤 Loading essential data from MongoDB...');
                const response = await fetch(`${window.API_CONFIG?.BASE_URL || 'https://daetspa-backend.onrender.com'}/api/attendance`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    const result = await response.json();
                    mongoRecords = result.data || [];
                    console.log(`✅ Loaded ${mongoRecords.length} attendance records from MongoDB`);
                } else {
                    console.warn('⚠️ Failed to load from MongoDB, using IndexedDB cache');
                }
            } catch (error) {
                console.error('❌ Error loading from MongoDB:', error);
            }
        }
        
        // 2. Load from IndexedDB cache (fallback or for media)
        let indexedDBRecords = [];
        let mediaRecords = [];
        
        try {
            indexedDBRecords = await window.db.getAll('attendance') || [];
            console.log(`📦 Loaded ${indexedDBRecords.length} records from IndexedDB cache`);
        } catch (error) {
            console.error('❌ Failed to load attendance from IndexedDB:', error);
            indexedDBRecords = [];
        }
        
        try {
            mediaRecords = await window.db.getAll('attendance_media') || [];
            console.log(`🎬 Loaded ${mediaRecords.length} media records from IndexedDB`);
        } catch (error) {
            console.error('❌ Failed to load media from IndexedDB:', error);
            mediaRecords = [];
        }
        
        // 3. Merge data: Use MongoDB as primary source, enrich with media from IndexedDB
        let mergedRecords = [];
        
        if (mongoRecords.length > 0) {
            // Use MongoDB records as primary source
            mergedRecords = mongoRecords.map(mongoRecord => {
                // Find corresponding media record
                const mediaRecord = mediaRecords.find(media => 
                    media.id === mongoRecord.id || (
                        media.employeeId === mongoRecord.employeeId && 
                        media.date === mongoRecord.date &&
                        media.checkInTime === mongoRecord.checkInTime
                    )
                );
                
                return {
                    ...mongoRecord,
                    capturedImage: mediaRecord?.capturedImage || null,
                    capturedVideo: mediaRecord?.capturedVideo || null
                };
            });
            console.log('✅ Merged MongoDB data with IndexedDB media');
        } else {
            // Fallback to IndexedDB only
            mergedRecords = indexedDBRecords;
            console.log('⚠️ Using IndexedDB cache only (no MongoDB connection)');
        }
        
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
                            <p style="margin: 0.25rem 0; color: #666;">${record.employeePosition}</p>
                            <p class="attendance-time" style="margin: 0.25rem 0; font-size: 0.9em;">
                                Check-in: ${new Date(record.checkInTime).toLocaleTimeString()}
                                ${record.isLate ? `<span style="color: #dc3545; font-weight: bold;"> (Late by ${record.lateMinutes} mins)</span>` : ''}
                            </p>
                            ${record.checkOutTime ? `
                                <p class="attendance-time" style="margin: 0.25rem 0; font-size: 0.9em;">
                                    Check-out: ${new Date(record.checkOutTime).toLocaleTimeString()}
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
                        <p style="margin: 0; font-weight: 500; color: #1f2937;">${new Date(record.date).toLocaleDateString()}</p>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div>
                        <label style="display: block; color: #6b7280; font-size: 0.875rem; margin-bottom: 0.25rem;">Check In</label>
                        <p style="margin: 0; font-weight: 500; color: #1f2937;">${record.checkInTime || '--'}</p>
                    </div>
                    <div>
                        <label style="display: block; color: #6b7280; font-size: 0.875rem; margin-bottom: 0.25rem;">Check Out</label>
                        <p style="margin: 0; font-weight: 500; color: #1f2937;">${record.checkOutTime || '--'}</p>
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