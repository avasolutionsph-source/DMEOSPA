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
        console.log('🚀 [ATTENDANCE] Initializing attendance system...');
        try {
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
            console.log('📷 [ATTENDANCE] Setting up Start Camera button event listener');
            startCameraBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('📷 [ATTENDANCE] Start Camera button clicked');
                this.startCamera();
            });
        } else {
            console.error('❌ [ATTENDANCE] Start Camera button not found');
        }
        
        if (stopCameraBtn) {
            console.log('📷 [ATTENDANCE] Setting up Stop Camera button event listener');
            stopCameraBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('📷 [ATTENDANCE] Stop Camera button clicked');
                this.stopCamera();
            });
        } else {
            console.error('❌ [ATTENDANCE] Stop Camera button not found');
        }
        
        if (captureBtn) {
            console.log('📷 [ATTENDANCE] Setting up Capture button event listener');
            captureBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('📷 [ATTENDANCE] Capture button clicked');
                this.captureAndRecognize();
            });
        } else {
            console.error('❌ [ATTENDANCE] Capture button not found');
        }
        
        // Manual selection
        const employeeSelect = document.getElementById('employeeSelect');
        const manualCheckinBtn = document.getElementById('manualCheckinBtn');
        
        if (employeeSelect) {
            employeeSelect.addEventListener('change', async (e) => {
                const selectedValue = e.target.value;
                
                // Handle retry option
                if (selectedValue === 'retry') {
                    console.log('🔄 [ATTENDANCE] User selected retry option');
                    if (window.showNotification) {
                        window.showNotification('Reloading employees...', 'info');
                    }
                    
                    // Reset dropdown to loading state
                    e.target.innerHTML = '<option value="">Loading employees...</option>';
                    
                    // Reload employees
                    await this.loadEmployees();
                    this.populateEmployeeDropdown();
                    
                    if (window.showNotification) {
                        window.showNotification('Employee list refreshed', 'success');
                    }
                    return;
                }
                
                const checkinBtn = document.getElementById('manualCheckinBtn');
                if (checkinBtn) {
                    checkinBtn.disabled = !selectedValue || selectedValue === 'retry';
                }
                
                // Also enable/disable facial recognition based on selection
                const captureBtn = document.getElementById('captureBtn');
                if (captureBtn && this.stream) {
                    // Keep capture button enabled when camera is running, regardless of dropdown
                    captureBtn.disabled = false;
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
            console.log('📊 [ATTENDANCE] Loading employees...');
            console.log('📊 [ATTENDANCE] Current database status:', !!window.db);
            
            // Wait for database to be ready with multiple attempts
            let dbInitAttempts = 0;
            const maxAttempts = 3;
            
            while (!window.db && dbInitAttempts < maxAttempts) {
                console.log(`📊 [ATTENDANCE] Database not ready, attempt ${dbInitAttempts + 1}/${maxAttempts}`);
                dbInitAttempts++;
                
                // Try different database initialization methods
                if (typeof ensureDBInit === 'function') {
                    console.log('📊 [ATTENDANCE] Using ensureDBInit function');
                    await ensureDBInit();
                } else if (typeof window.ensureDBInit === 'function') {
                    console.log('📊 [ATTENDANCE] Using window.ensureDBInit function');
                    await window.ensureDBInit();
                } else if (window.DatabaseManager && typeof window.DatabaseManager.init === 'function') {
                    console.log('📊 [ATTENDANCE] Using DatabaseManager.init');
                    await window.DatabaseManager.init();
                } else {
                    console.log('📊 [ATTENDANCE] Waiting 1 second for database to initialize...');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
            if (!window.db) {
                console.error('❌ [ATTENDANCE] Database still not available after all attempts');
                console.log('💡 [ATTENDANCE] Available global objects:', Object.keys(window).filter(key => key.includes('db') || key.includes('DB')));
                throw new Error('Database not available after initialization attempts');
            }
            
            console.log('✅ [ATTENDANCE] Database is ready');
            console.log('📊 [ATTENDANCE] Database object stores:', Array.from(window.db.objectStoreNames));
            
            // Check if employees store exists
            if (!window.db.objectStoreNames.contains('employees')) {
                console.warn('⚠️ [ATTENDANCE] Employees store not found in database');
                console.log('📊 [ATTENDANCE] Available stores:', Array.from(window.db.objectStoreNames));
                this.employees = [];
                return;
            }
            
            console.log('📊 [ATTENDANCE] Employees store found, creating transaction...');
            const transaction = window.db.transaction(['employees'], 'readonly');
            const store = transaction.objectStore('employees');
            const request = store.getAll();
            
            console.log('📊 [ATTENDANCE] Requesting all employees...');
            const employees = await new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    console.log('📊 [ATTENDANCE] Employee request successful');
                    resolve(request.result);
                };
                request.onerror = () => {
                    console.error('❌ [ATTENDANCE] Employee request failed:', request.error);
                    reject(request.error);
                };
                transaction.onerror = () => {
                    console.error('❌ [ATTENDANCE] Transaction failed:', transaction.error);
                    reject(transaction.error);
                };
            });
            
            this.employees = employees || [];
            console.log('📊 [ATTENDANCE] Successfully loaded employees:', this.employees.length);
            console.log('📊 [ATTENDANCE] Raw employee data:', this.employees);
            
            // Log employee names for debugging
            if (this.employees.length > 0) {
                this.employees.forEach((emp, index) => {
                    console.log(`👤 [ATTENDANCE] Employee ${index + 1}: ${emp.name} (ID: ${emp.id}, Position: ${emp.position})`);
                });
            } else {
                console.warn('⚠️ [ATTENDANCE] No employees found in database');
                console.log('💡 [ATTENDANCE] Try adding employees in the Employee Management section first');
            }
            
        } catch (error) {
            console.error('❌ [ATTENDANCE] Failed to load employees:', error);
            console.error('❌ [ATTENDANCE] Error stack:', error.stack);
            this.employees = [];
            
            // Try to provide more helpful error message
            if (error.message?.includes('not found')) {
                console.log('💡 [ATTENDANCE] Tip: Add employees first using the Employees page');
            }
            
            // Show user-friendly error
            if (window.showNotification) {
                window.showNotification('Failed to load employees. Please refresh the page or add employees first.', 'error');
            }
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
        if (!select) {
            console.error('❌ [ATTENDANCE] Employee select element not found');
            return;
        }
        
        console.log('📊 [ATTENDANCE] Populating dropdown with employees:', this.employees.length);
        console.log('📊 [ATTENDANCE] Employee data for dropdown:', this.employees);
        
        // Clear existing options except the first one
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }
        
        if (this.employees.length === 0) {
            console.warn('⚠️ [ATTENDANCE] No employees to populate in dropdown');
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No employees found - Click Refresh or add employees first';
            option.disabled = true;
            option.style.color = '#ff6b6b';
            select.appendChild(option);
            
            // Also add a retry option
            const retryOption = document.createElement('option');
            retryOption.value = 'retry';
            retryOption.textContent = '🔄 Click here to retry loading employees';
            retryOption.style.color = '#4dabf7';
            select.appendChild(retryOption);
            return;
        }
        
        console.log('📊 [ATTENDANCE] Adding employees to dropdown...');
        
        // Add employee options
        this.employees.forEach((employee, index) => {
            console.log(`👤 [ATTENDANCE] Processing employee ${index + 1}:`, employee);
            const option = document.createElement('option');
            option.value = employee.id || employee._id || index.toString();
            option.textContent = `${employee.name} - ${employee.position || 'Employee'}`;
            select.appendChild(option);
            console.log(`✅ [ATTENDANCE] Added employee to dropdown: ${employee.name}`);
        });
        
        console.log('✅ [ATTENDANCE] Dropdown population completed');
    }

    async startCamera() {
        try {
            console.log('📷 [ATTENDANCE] Starting camera function called...');
            
            // Check if browser supports camera
            console.log('📷 [ATTENDANCE] Checking camera API support...');
            if (!navigator.mediaDevices) {
                console.error('❌ [ATTENDANCE] navigator.mediaDevices not available');
                throw new Error('Camera API not available - try using HTTPS or a modern browser');
            }
            
            if (!navigator.mediaDevices.getUserMedia) {
                console.error('❌ [ATTENDANCE] getUserMedia not available');
                throw new Error('Camera API not supported in this browser');
            }
            
            console.log('📷 [ATTENDANCE] Camera API supported, requesting access...');
            
            // Request camera access
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'user',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                } 
            });
            
            console.log('📷 [ATTENDANCE] Camera access granted, setting up video element...');
            
            const video = document.getElementById('faceVideo');
            if (!video) {
                console.error('❌ [ATTENDANCE] Video element #faceVideo not found');
                throw new Error('Video element not found');
            }
            
            console.log('📷 [ATTENDANCE] Video element found, connecting stream...');
            
            // Set up video element
            video.srcObject = this.stream;
            
            console.log('📷 [ATTENDANCE] Waiting for video to load...');
            
            // Wait for video to load
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Video loading timeout'));
                }, 10000); // 10 second timeout
                
                video.onloadedmetadata = () => {
                    console.log('📷 [ATTENDANCE] Video metadata loaded, starting playback...');
                    clearTimeout(timeout);
                    video.play()
                        .then(() => {
                            console.log('📷 [ATTENDANCE] Video playback started successfully');
                            resolve();
                        })
                        .catch((playError) => {
                            console.error('❌ [ATTENDANCE] Video play failed:', playError);
                            reject(playError);
                        });
                };
                video.onerror = (videoError) => {
                    console.error('❌ [ATTENDANCE] Video error:', videoError);
                    clearTimeout(timeout);
                    reject(videoError);
                };
            });
            
            console.log('📷 [ATTENDANCE] Updating button states...');
            
            // Update button states
            const startBtn = document.getElementById('startCameraBtn');
            const stopBtn = document.getElementById('stopCameraBtn');
            const captureBtn = document.getElementById('captureBtn');
            
            if (startBtn) {
                startBtn.disabled = true;
                console.log('📷 [ATTENDANCE] Start button disabled');
            }
            if (stopBtn) {
                stopBtn.disabled = false;
                console.log('📷 [ATTENDANCE] Stop button enabled');
            }
            if (captureBtn) {
                captureBtn.disabled = false;
                console.log('📷 [ATTENDANCE] Capture button enabled');
            }
            
            console.log('✅ [ATTENDANCE] Camera started successfully!');
            
            // Show notification
            if (window.showNotification) {
                window.showNotification('Camera started successfully', 'success');
            }
            
        } catch (error) {
            console.error('❌ [ATTENDANCE] Failed to start camera:', error);
            console.error('❌ [ATTENDANCE] Error stack:', error.stack);
            
            let errorMessage = 'Failed to start camera. ';
            if (error.name === 'NotAllowedError') {
                errorMessage += 'Camera permission denied. Please allow camera access and try again.';
                console.log('💡 [ATTENDANCE] User needs to grant camera permission');
            } else if (error.name === 'NotFoundError') {
                errorMessage += 'No camera found on this device.';
                console.log('💡 [ATTENDANCE] No camera device available');
            } else if (error.name === 'NotSupportedError') {
                errorMessage += 'Camera not supported in this browser.';
                console.log('💡 [ATTENDANCE] Browser does not support camera');
            } else {
                errorMessage += error.message || 'Unknown error occurred.';
                console.log('💡 [ATTENDANCE] Unexpected error:', error.message);
            }
            
            if (window.showNotification) {
                window.showNotification(errorMessage, 'error');
            }
            
            // Reset button states on error
            const startBtn = document.getElementById('startCameraBtn');
            const stopBtn = document.getElementById('stopCameraBtn');
            const captureBtn = document.getElementById('captureBtn');
            
            if (startBtn) startBtn.disabled = false;
            if (stopBtn) stopBtn.disabled = true;
            if (captureBtn) captureBtn.disabled = true;
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
        const employeeSelect = document.getElementById('employeeSelect');
        
        if (!video || !canvas) {
            console.error('❌ [ATTENDANCE] Video or canvas element not found');
            if (window.showNotification) {
                window.showNotification('Camera elements not found', 'error');
            }
            return;
        }
        
        // Check if an employee is selected
        const selectedEmployeeId = employeeSelect?.value;
        if (!selectedEmployeeId) {
            if (window.showNotification) {
                window.showNotification('Please select an employee first from the dropdown', 'warning');
            }
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
        
        // Find the selected employee
        const employee = this.employees.find(emp => emp.id === selectedEmployeeId);
        if (!employee) {
            if (window.showNotification) {
                window.showNotification('Selected employee not found', 'error');
            }
            return;
        }
        
        // Show confirmation modal with the selected employee
        this.showFacialRecognitionModal(imageData, employee);
    }

    showFacialRecognitionModal(imageData, employee) {
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
                        <div style="text-align: center; margin-bottom: 1rem;">
                            <h3 style="color: var(--primary-color); margin-bottom: 0.5rem;">${employee.name}</h3>
                            <p style="color: var(--text-muted); margin: 0;">${employee.position || 'Employee'}</p>
                        </div>
                        <p style="text-align: center;">Confirm facial recognition check-in for this employee?</p>
                        <div class="modal-actions">
                            <button class="btn btn-success" onclick="attendanceManager.confirmFacialRecognition('${employee.id}')">
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

    async confirmFacialRecognition(employeeId) {
        if (!employeeId) {
            if (window.showNotification) {
                window.showNotification('Employee ID not provided', 'error');
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
        
        // Reset the dropdown after successful check-in
        const employeeSelect = document.getElementById('employeeSelect');
        if (employeeSelect) {
            employeeSelect.value = '';
            const checkinBtn = document.getElementById('manualCheckinBtn');
            if (checkinBtn) {
                checkinBtn.disabled = true;
            }
        }
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
            console.log('🔄 [ATTENDANCE] Refreshing attendance data...');
            if (window.showNotification) {
                window.showNotification('Refreshing attendance data...', 'info');
            }
            
            // Force reload employees with fresh database connection
            console.log('📊 [ATTENDANCE] Force reloading employees...');
            await this.loadEmployees();
            
            console.log('📊 [ATTENDANCE] Loading attendance records...');
            await this.loadAttendanceRecords();
            
            console.log('📊 [ATTENDANCE] Updating UI...');
            this.populateEmployeeDropdown();
            this.renderAttendanceRecords();
            
            console.log('✅ [ATTENDANCE] Refresh completed successfully');
            if (window.showNotification) {
                window.showNotification(`Attendance data refreshed - Found ${this.employees.length} employees`, 'success');
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

// Make it globally accessible
if (typeof window !== 'undefined') {
    window.attendanceManager = attendanceManager;
    console.log('✅ [ATTENDANCE] AttendanceManager created and made globally accessible');
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AttendanceManager;
}