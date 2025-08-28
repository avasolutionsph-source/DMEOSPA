// Attendance System with Facial Recognition

class AttendanceManager {
    constructor() {
        this.attendanceRecords = [];
        this.employees = [];
        this.stream = null;
        this.isRecognitionEnabled = false;
        this.lastCapturedImage = null;
    }

    async init() {
        await this.loadEmployees();
        await this.loadAttendanceRecords();
        this.setupEventListeners();
        this.populateEmployeeDropdown();
        this.renderAttendanceRecords();
    }

    setupEventListeners() {
        if (this._listenersAttached) return;
        
        // Check if we're on the attendance page
        const attendancePage = document.getElementById('attendance');
        if (!attendancePage) {
            console.log('🔍 [ATTENDANCE] Not on attendance page, skipping event listener setup');
            return;
        }
        
        this._listenersAttached = true;
        
        // Camera controls
        const startCameraBtn = document.getElementById('startCameraBtn');
        const stopCameraBtn = document.getElementById('stopCameraBtn');
        const captureBtn = document.getElementById('captureBtn');
        
        if (startCameraBtn) {
            startCameraBtn.addEventListener('click', () => this.startCamera());
        }
        
        if (stopCameraBtn) {
            stopCameraBtn.addEventListener('click', () => this.stopCamera());
        }
        
        if (captureBtn) {
            captureBtn.addEventListener('click', () => this.captureAndRecognize());
        }
        
        // Manual selection
        const employeeSelect = document.getElementById('employeeSelect');
        const manualCheckinBtn = document.getElementById('manualCheckinBtn');
        
        if (employeeSelect) {
            employeeSelect.addEventListener('change', (e) => {
                const checkinBtn = document.getElementById('manualCheckinBtn');
                if (checkinBtn) {
                    checkinBtn.disabled = !e.target.value;
                }
            });
        }
        
        if (manualCheckinBtn) {
            manualCheckinBtn.addEventListener('click', () => this.manualCheckin());
        }
        
        // Refresh button
        const refreshBtn = document.getElementById('refreshAttendanceBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshAttendance());
        }
    }

    async loadEmployees() {
        try {
            if (!window.db) {
                console.log('📊 [ATTENDANCE] Database not ready, waiting...');
                await ensureDBInit();
            }
            
            const transaction = window.db.transaction(['employees'], 'readonly');
            const store = transaction.objectStore('employees');
            const request = store.getAll();
            
            const employees = await new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
            this.employees = employees || [];
            console.log('📊 [ATTENDANCE] Loaded employees:', this.employees.length);
        } catch (error) {
            console.error('❌ [ATTENDANCE] Failed to load employees:', error);
            this.employees = [];
        }
    }

    async loadAttendanceRecords() {
        try {
            if (!window.db) {
                console.log('📊 [ATTENDANCE] Database not ready, waiting...');
                await ensureDBInit();
            }
            
            // Get today's date in YYYY-MM-DD format
            const today = new Date().toISOString().split('T')[0];
            
            const transaction = window.db.transaction(['attendance'], 'readonly');
            const store = transaction.objectStore('attendance');
            const index = store.index('date');
            const request = index.getAll(today);
            
            const todayRecords = await new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            });
                
            this.attendanceRecords = todayRecords;
            console.log('📊 [ATTENDANCE] Loaded attendance records:', todayRecords.length);
        } catch (error) {
            console.error('❌ [ATTENDANCE] Failed to load attendance records:', error);
            this.attendanceRecords = [];
        }
    }

    populateEmployeeDropdown() {
        const select = document.getElementById('employeeSelect');
        if (!select) return;
        
        // Clear existing options except the first one
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }
        
        // Add employee options
        this.employees.forEach(employee => {
            const option = document.createElement('option');
            option.value = employee.id;
            option.textContent = `${employee.name} - ${employee.position || 'Employee'}`;
            select.appendChild(option);
        });
    }

    async startCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'user',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                } 
            });
            
            const video = document.getElementById('faceVideo');
            if (video) {
                video.srcObject = this.stream;
                
                // Update button states
                document.getElementById('startCameraBtn').disabled = true;
                document.getElementById('stopCameraBtn').disabled = false;
                document.getElementById('captureBtn').disabled = false;
                
                console.log('📷 [ATTENDANCE] Camera started successfully');
                
                // Show notification
                if (window.showNotification) {
                    window.showNotification('Camera started successfully', 'success');
                }
            }
        } catch (error) {
            console.error('❌ [ATTENDANCE] Failed to start camera:', error);
            if (window.showNotification) {
                window.showNotification('Failed to start camera. Please check permissions.', 'error');
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
            
            // Update button states
            document.getElementById('startCameraBtn').disabled = false;
            document.getElementById('stopCameraBtn').disabled = true;
            document.getElementById('captureBtn').disabled = true;
            
            console.log('📷 [ATTENDANCE] Camera stopped');
            
            if (window.showNotification) {
                window.showNotification('Camera stopped', 'info');
            }
        }
    }

    async captureAndRecognize() {
        const video = document.getElementById('faceVideo');
        const canvas = document.getElementById('faceCanvas');
        
        if (!video || !canvas) {
            console.error('❌ [ATTENDANCE] Video or canvas element not found');
            return;
        }
        
        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Capture the current frame
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to base64 for storage
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        this.lastCapturedImage = imageData;
        
        // For now, show a modal to select employee (simplified facial recognition)
        this.showFacialRecognitionModal(imageData);
    }

    showFacialRecognitionModal(imageData) {
        // Create modal HTML
        const modalHTML = `
            <div class="modal-overlay" id="facialRecognitionModal">
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h2>Facial Recognition Check-in</h2>
                        <button class="modal-close" onclick="attendanceManager.closeFacialRecognitionModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div style="text-align: center; margin-bottom: 1rem;">
                            <img src="${imageData}" alt="Captured Image" style="max-width: 100%; border-radius: 8px; max-height: 200px;">
                        </div>
                        <p>Select the employee for this check-in:</p>
                        <select id="facialRecognitionEmployeeSelect" class="form-control" style="margin-bottom: 1rem;">
                            <option value="">Choose employee...</option>
                            ${this.employees.map(emp => `<option value="${emp.id}">${emp.name} - ${emp.position || 'Employee'}</option>`).join('')}
                        </select>
                        <div class="modal-actions">
                            <button class="btn btn-success" onclick="attendanceManager.confirmFacialRecognition()">
                                <i class="fas fa-check"></i> Confirm Check-in
                            </button>
                            <button class="btn btn-secondary" onclick="attendanceManager.closeFacialRecognitionModal()">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    closeFacialRecognitionModal() {
        const modal = document.getElementById('facialRecognitionModal');
        if (modal) {
            modal.remove();
        }
    }

    async confirmFacialRecognition() {
        const select = document.getElementById('facialRecognitionEmployeeSelect');
        const employeeId = select?.value;
        
        if (!employeeId) {
            if (window.showNotification) {
                window.showNotification('Please select an employee', 'error');
            }
            return;
        }
        
        const employee = this.employees.find(emp => emp.id === employeeId);
        if (!employee) {
            if (window.showNotification) {
                window.showNotification('Employee not found', 'error');
            }
            return;
        }
        
        await this.recordAttendance(employee, 'facial', this.lastCapturedImage);
        this.closeFacialRecognitionModal();
    }

    async manualCheckin() {
        const select = document.getElementById('employeeSelect');
        const employeeId = select?.value;
        
        if (!employeeId) {
            if (window.showNotification) {
                window.showNotification('Please select an employee', 'error');
            }
            return;
        }
        
        const employee = this.employees.find(emp => emp.id === employeeId);
        if (!employee) {
            if (window.showNotification) {
                window.showNotification('Employee not found', 'error');
            }
            return;
        }
        
        await this.recordAttendance(employee, 'manual');
        
        // Reset selection
        select.value = '';
        document.getElementById('manualCheckinBtn').disabled = true;
    }

    async recordAttendance(employee, method, imageData = null) {
        try {
            const now = new Date();
            const timestamp = now.toISOString();
            const date = now.toISOString().split('T')[0];
            const timeString = now.toLocaleTimeString();
            
            // Check if employee already checked in today
            const existingRecord = this.attendanceRecords.find(record => 
                record.employeeId === employee.id && record.date === date
            );
            
            if (existingRecord) {
                if (window.showNotification) {
                    window.showNotification(`${employee.name} has already checked in today at ${new Date(existingRecord.timestamp).toLocaleTimeString()}`, 'warning');
                }
                return;
            }
            
            const record = {
                employeeId: employee.id,
                employeeName: employee.name,
                employeePosition: employee.position || 'Employee',
                timestamp,
                date,
                method,
                imageData
            };
            
            // Save to database
            const transaction = window.db.transaction(['attendance'], 'readwrite');
            const store = transaction.objectStore('attendance');
            const request = store.add(record);
            
            await new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
            // Add to local array
            this.attendanceRecords.push(record);
            
            // Update UI
            this.renderAttendanceRecords();
            
            console.log('✅ [ATTENDANCE] Recorded attendance:', record);
            
            if (window.showNotification) {
                window.showNotification(
                    `✅ ${employee.name} checked in successfully at ${timeString}`, 
                    'success'
                );
            }
            
        } catch (error) {
            console.error('❌ [ATTENDANCE] Failed to record attendance:', error);
            if (window.showNotification) {
                window.showNotification('Failed to record attendance', 'error');
            }
        }
    }

    renderAttendanceRecords() {
        const container = document.getElementById('attendanceRecords');
        if (!container) return;
        
        if (this.attendanceRecords.length === 0) {
            container.innerHTML = '<div class="loading">No attendance records for today</div>';
            return;
        }
        
        // Sort by timestamp (newest first)
        const sortedRecords = [...this.attendanceRecords].sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );
        
        const html = sortedRecords.map(record => {
            const time = new Date(record.timestamp).toLocaleTimeString();
            const methodClass = record.method === 'facial' ? 'method-facial' : 'method-manual';
            const methodText = record.method === 'facial' ? 'Facial Recognition' : 'Manual Selection';
            
            return `
                <div class="attendance-record">
                    <div class="record-info">
                        <div class="record-name">${record.employeeName}</div>
                        <div class="record-time">${time} • ${record.employeePosition || 'Employee'}</div>
                    </div>
                    <div class="record-method ${methodClass}">${methodText}</div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = html;
    }

    async refreshAttendance() {
        try {
            await this.loadEmployees();
            await this.loadAttendanceRecords();
            this.populateEmployeeDropdown();
            this.renderAttendanceRecords();
            
            if (window.showNotification) {
                window.showNotification('Attendance data refreshed', 'success');
            }
        } catch (error) {
            console.error('❌ [ATTENDANCE] Failed to refresh:', error);
            if (window.showNotification) {
                window.showNotification('Failed to refresh attendance data', 'error');
            }
        }
    }

    // Cleanup method
    cleanup() {
        if (this.stream) {
            this.stopCamera();
        }
        this._listenersAttached = false;
    }
}

// Create global instance
const attendanceManager = new AttendanceManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AttendanceManager;
}