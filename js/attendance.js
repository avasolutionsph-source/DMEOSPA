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
            
            // Check if ensureDBInit function exists
            if (typeof window.ensureDBInit === 'function') {
                await window.ensureDBInit();
                console.log('✅ [ATTENDANCE] Database initialized via ensureDBInit');
            } else if (typeof ensureDBInit === 'function') {
                await ensureDBInit();
                console.log('✅ [ATTENDANCE] Database initialized via ensureDBInit (global)');
            } else {
                console.warn('⚠️ [ATTENDANCE] ensureDBInit not found, waiting 2 seconds...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            // Now load employees - database should be ready
            console.log('📊 [ATTENDANCE] Loading employees from database...');
            this.employees = await window.db.getAll('employees');
            console.log('✅ [INIT] Loaded', this.employees.length, 'employees from database');
            
            // Force populate dropdown immediately
            const select = document.getElementById('employeeSelect');
            if (select && this.employees.length > 0) {
                select.innerHTML = '<option value="">Choose an employee...</option>';
                this.employees.forEach(emp => {
                    if (emp && emp.name) {
                        const option = document.createElement('option');
                        option.value = emp.id || emp._id || emp.name;
                        option.textContent = emp.name;
                        select.appendChild(option);
                        console.log('✅ [INIT] Added to dropdown:', emp.name);
                    }
                });
            }
            
            await this.loadAttendanceRecords();
            this.setupEventListeners();
            this.renderAttendanceRecords();
            
            // Mark as initialized
            window.attendanceManager.initialized = true;
            console.log('✅ [ATTENDANCE] Initialization complete');
        } catch (error) {
            console.error('❌ [ATTENDANCE] Initialization failed:', error);
            if (window.showNotification) {
                window.showNotification('Failed to initialize attendance system', 'error');
            }
        }
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
                
                // Force fresh load from database
                if (window.db) {
                    const emps = await window.db.getAll('employees');
                    console.log('📊 [SYNC] Direct DB query found:', emps.length, 'employees');
                    console.log('📊 [SYNC] Employee data:', emps);
                    
                    // Set employees directly
                    this.employees = emps;
                    
                    // Force dropdown update
                    const select = document.getElementById('employeeSelect');
                    if (select) {
                        // Clear completely
                        select.innerHTML = '';
                        
                        // Add default option
                        const defaultOpt = document.createElement('option');
                        defaultOpt.value = '';
                        defaultOpt.textContent = 'Choose an employee...';
                        select.appendChild(defaultOpt);
                        
                        // Add each employee directly
                        emps.forEach(emp => {
                            if (emp && emp.name) {
                                const option = document.createElement('option');
                                option.value = emp.id || emp._id || emp.name;
                                option.textContent = emp.name;
                                select.appendChild(option);
                                console.log('✅ [SYNC] Added:', emp.name);
                            }
                        });
                        
                        console.log('📊 [SYNC] Dropdown now has', select.options.length - 1, 'employees');
                    }
                    
                    if (window.showNotification) {
                        window.showNotification(`Found ${emps.length} employees`, 'info');
                    }
                } else {
                    console.error('❌ [SYNC] Database not available');
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
        
        const employee = this.employees.find(emp => 
            (emp.id && emp.id.toString() === employeeId) || 
            (emp._id && emp._id.toString() === employeeId)
        );
        
        if (!employee) {
            console.error('Employee not found');
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
        // Force fresh load from database directly
        if (window.db) {
            const emps = await window.db.getAll('employees');
            console.log('📊 [REFRESH] Direct DB query found:', emps.length, 'employees');
            
            // Set employees directly
            this.employees = emps;
            
            // Force dropdown update inline
            const select = document.getElementById('employeeSelect');
            if (select) {
                // Clear completely
                select.innerHTML = '';
                
                // Add default option
                const defaultOpt = document.createElement('option');
                defaultOpt.value = '';
                defaultOpt.textContent = 'Choose an employee...';
                select.appendChild(defaultOpt);
                
                // Add each employee directly
                emps.forEach(emp => {
                    if (emp && emp.name) {
                        const option = document.createElement('option');
                        option.value = emp.id || emp._id || emp.name;
                        option.textContent = emp.name;
                        select.appendChild(option);
                        console.log('✅ [REFRESH] Added:', emp.name);
                    }
                });
                
                console.log('📊 [REFRESH] Dropdown now has', select.options.length - 1, 'employees');
            }
        }
        
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
    console.log('📊 [ATTENDANCE] DOM loaded, checking if on attendance page...');
    const attendancePage = document.getElementById('attendance');
    if (attendancePage && attendancePage.style.display !== 'none') {
        console.log('📊 [ATTENDANCE] On attendance page, auto-initializing...');
        setTimeout(async () => {
            if (window.attendanceManager && !window.attendanceManager.initialized) {
                await window.attendanceManager.init();
            }
        }, 1000);
    }
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
        
        // Load employees directly
        const employees = await window.db.getAll('employees');
        console.log('📊 Found employees:', employees);
        
        const select = document.getElementById('employeeSelect');
        if (select) {
            select.innerHTML = '<option value="">Choose an employee...</option>';
            
            employees.forEach(emp => {
                if (emp && emp.name) {
                    const option = document.createElement('option');
                    option.value = emp.id || emp._id || emp.name;
                    option.textContent = emp.name;
                    select.appendChild(option);
                    console.log('✅ Added:', emp.name);
                }
            });
            
            console.log('✅ Dropdown populated with', employees.length, 'employees');
            return true;
        }
        console.error('❌ Dropdown element not found');
        return false;
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
            console.log('📊 Employee data:', employees);
            
            // Try to populate dropdown directly
            const select = document.getElementById('employeeSelect');
            if (select && employees.length > 0) {
                select.innerHTML = '<option value="">Choose an employee...</option>';
                employees.forEach(emp => {
                    if (emp && emp.name) {
                        const option = document.createElement('option');
                        option.value = emp.id || emp._id || emp.name;
                        option.textContent = emp.name;
                        select.appendChild(option);
                        console.log('✅ Added to dropdown:', emp.name);
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