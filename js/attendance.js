// Simple Attendance System - Uses exact same method as Employee Management

class AttendanceManager {
    constructor() {
        this.attendanceRecords = [];
        this.employees = [];
        this.stream = null;
        this.isRecognitionEnabled = false;
        this.lastCapturedImage = null;
    }

    async init() {
        console.log('🚀 [ATTENDANCE] Initializing attendance system...');
        try {
            // PROPERLY wait for database initialization
            console.log('⏳ [ATTENDANCE] Ensuring database is ready...');
            
            // Always ensure database is initialized
            if (typeof window.ensureDBInit === 'function') {
                await window.ensureDBInit();
                console.log('✅ [ATTENDANCE] Database initialized via ensureDBInit');
            } else {
                console.warn('⚠️ [ATTENDANCE] ensureDBInit not found, waiting for database...');
                // Wait for database to be available
                let attempts = 0;
                while ((!window.db || !window.db.db) && attempts < 20) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    attempts++;
                }
                if (!window.db || !window.db.db) {
                    throw new Error('Database not available after waiting');
                }
            }
            
            // Load employees directly from database
            console.log('📊 [ATTENDANCE] Loading employees from database...');
            await this.loadEmployeesDirectly();
            
            // Load attendance records and setup UI
            await this.loadAttendanceRecords();
            this.setupEventListeners();
            this.renderAttendanceRecords();
            
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
    
    async loadEmployeesDirectly() {
        // COPY EXACT POS METHOD - IT WORKS!
        try {
            // Ensure database is initialized first
            if (!window.db || !window.db.db) {
                console.warn('⚠️ Database not ready, waiting...');
                await window.ensureDBInit();
            }
            
            this.employees = await window.db.getAll('employees');
            console.log('✅ Loaded', this.employees.length, 'employees');
            
            // Debug log to check employee structure
            if (this.employees.length > 0) {
                console.log('📊 First employee structure:', this.employees[0]);
                console.log('📊 All employee names:', this.employees.map(e => e.name));
            }
            
            this.populateDropdownNow();
        } catch (error) {
            console.error('❌ Failed to load employees:', error);
            this.employees = [];
            // Still try to populate dropdown with empty message
            this.populateDropdownNow();
        }
    }
    
    populateDropdownNow() {
        const select = document.getElementById('employeeSelect');
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
        const select = document.getElementById('employeeSelect');
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
        const select = document.getElementById('employeeSelect');
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
        
        // Sync button
        const syncBtn = document.getElementById('syncEmployeesBtn');
        if (syncBtn) {
            syncBtn.addEventListener('click', async () => {
                console.log('🔄 Syncing employees...');
                
                // Show loading state
                syncBtn.disabled = true;
                const originalText = syncBtn.innerHTML;
                syncBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';
                
                try {
                    // Ensure database is ready
                    if (typeof window.ensureDBInit === 'function') {
                        await window.ensureDBInit();
                    }
                    
                    // Load directly from IndexedDB
                    await this.loadEmployeesDirectly();
                    
                    if (window.showNotification) {
                        if (this.employees.length > 0) {
                            window.showNotification(`Found ${this.employees.length} employees`, 'success');
                        } else {
                            window.showNotification('No employees found. Add employees in Employee Management first.', 'info');
                        }
                    }
                } catch (error) {
                    console.error('❌ Failed to sync employees:', error);
                    if (window.showNotification) {
                        window.showNotification('Failed to sync employees', 'error');
                    }
                } finally {
                    // Restore button state
                    syncBtn.disabled = false;
                    syncBtn.innerHTML = originalText;
                }
            });
        }
        
        // Employee dropdown
        const employeeSelect = document.getElementById('employeeSelect');
        if (employeeSelect) {
            employeeSelect.addEventListener('change', (e) => {
                const checkinBtn = document.getElementById('manualCheckinBtn');
                if (checkinBtn) {
                    checkinBtn.disabled = !e.target.value;
                }
            });
        }
        
        // Check-in button
        const manualCheckinBtn = document.getElementById('manualCheckinBtn');
        if (manualCheckinBtn) {
            manualCheckinBtn.addEventListener('click', () => this.manualCheckin());
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
        
        const captureBtn = document.getElementById('captureBtn');
        if (captureBtn) {
            captureBtn.addEventListener('click', () => this.captureAndRecognize());
        }
        
        // Refresh button
        const refreshBtn = document.getElementById('refreshAttendanceBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshAttendance());
        }
    }

    async manualCheckin() {
        const select = document.getElementById('employeeSelect');
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
            const attendanceRecord = {
                employeeId: employee.id || employee._id,
                employeeName: employee.name,
                employeePosition: employee.position || 'Employee',
                date: now.toISOString().split('T')[0],
                checkInTime: now.toISOString(),
                checkOutTime: null,
                method: method,
                capturedImage: this.lastCapturedImage || null,
                createdAt: now.toISOString()
            };
            
            await window.db.add('attendance', attendanceRecord);
            
            if (window.showNotification) {
                window.showNotification(`✅ ${employee.name} checked in successfully`, 'success');
            }
            
            // Reset form
            document.getElementById('employeeSelect').value = '';
            document.getElementById('manualCheckinBtn').disabled = true;
            
            // Reload attendance records
            await this.loadAttendanceRecords();
            this.renderAttendanceRecords();
            
        } catch (error) {
            console.error('Failed to record attendance:', error);
            if (window.showNotification) {
                window.showNotification('Failed to record attendance', 'error');
            }
        }
    }

    async loadAttendanceRecords() {
        try {
            const today = new Date().toISOString().split('T')[0];
            
            if (!window.db) {
                console.warn('Database not ready');
                this.attendanceRecords = [];
                return;
            }
            
            const allRecords = await window.db.getAll('attendance');
            this.attendanceRecords = allRecords.filter(record => record.date === today);
            
            console.log(`Loaded ${this.attendanceRecords.length} attendance records for today`);
        } catch (error) {
            console.error('Failed to load attendance records:', error);
            this.attendanceRecords = [];
        }
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
                ${this.attendanceRecords.map(record => `
                    <div class="attendance-record">
                        <div class="attendance-record-info">
                            <h4>${record.employeeName}</h4>
                            <p>${record.employeePosition}</p>
                            <p class="attendance-time">
                                Check-in: ${new Date(record.checkInTime).toLocaleTimeString()}
                            </p>
                            ${record.checkOutTime ? `
                                <p class="attendance-time">
                                    Check-out: ${new Date(record.checkOutTime).toLocaleTimeString()}
                                </p>
                            ` : ''}
                        </div>
                        <div class="attendance-record-method">
                            <span class="badge ${record.method === 'facial' ? 'badge-success' : 'badge-info'}">
                                ${record.method === 'facial' ? 'Facial Recognition' : 'Manual Check-in'}
                            </span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
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
            document.getElementById('captureBtn').disabled = false;
            
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
            document.getElementById('captureBtn').disabled = true;
            
            if (window.showNotification) {
                window.showNotification('Camera stopped', 'info');
            }
        }
    }

    async captureAndRecognize() {
        const video = document.getElementById('faceVideo');
        const canvas = document.getElementById('faceCanvas');
        
        if (!video || !canvas) return;
        
        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        this.lastCapturedImage = canvas.toDataURL('image/jpeg');
        
        // For now, just show employee selection
        if (window.showNotification) {
            window.showNotification('Photo captured! Please select your name from the dropdown.', 'info');
        }
        
        // Focus on dropdown
        document.getElementById('employeeSelect').focus();
    }

    async refreshAttendance() {
        // Load directly from IndexedDB
        await this.loadEmployeesDirectly();
        
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
            const select = document.getElementById('employeeSelect');
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
                
                const select = document.getElementById('employeeSelect');
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