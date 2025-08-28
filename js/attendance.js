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
            // Simple wait for database
            if (!window.db) {
                console.log('⏳ [ATTENDANCE] Waiting for database...');
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            await this.loadEmployees();
            await this.loadAttendanceRecords();
            this.setupEventListeners();
            this.populateEmployeeDropdown();
            this.renderAttendanceRecords();
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
                
                if (this.employees.length > 0) {
                    this.employees.forEach((emp, index) => {
                        console.log(`👤 Employee ${index + 1}: ${emp.name} (ID: ${emp.id})`);
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
        
        console.log('📊 [ATTENDANCE] Populating dropdown with employees:', this.employees.length);
        
        // Clear and reset dropdown
        select.innerHTML = '<option value="">Choose an employee...</option>';
        
        if (this.employees.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No employees found - Add employees first';
            option.disabled = true;
            select.appendChild(option);
            return;
        }
        
        // Add each employee - SIMPLE AND CLEAN
        this.employees.forEach(employee => {
            const option = document.createElement('option');
            option.value = employee.id || employee._id;
            option.textContent = employee.name;
            select.appendChild(option);
            console.log(`✅ Added to dropdown: ${employee.name}`);
        });
        
        console.log('✅ [ATTENDANCE] Dropdown populated');
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
                await this.loadEmployees();
                this.populateEmployeeDropdown();
                if (window.showNotification) {
                    window.showNotification(`Found ${this.employees.length} employees`, 'info');
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
        await this.loadEmployees();
        await this.loadAttendanceRecords();
        this.populateEmployeeDropdown();
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