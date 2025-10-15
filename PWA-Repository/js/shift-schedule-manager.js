// Shift Schedule Manager for DAETSPA PWA
// Handles shift scheduling for managers and owners only

class ShiftScheduleManager {
    constructor() {
        this.schedules = [];
        this.employees = [];
        this.currentSchedule = null;
        this.shiftConfiguration = null; // Store shift time configuration
        this.initialized = false;
        this.buttonAttached = false;
        this.retryCount = 0;
        this.maxRetries = 10;
        
        console.log('🗓️ Shift Schedule Manager constructor called');
        
        // Initialize when DOM is ready with better timing control
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else if (document.readyState === 'interactive' || document.readyState === 'complete') {
            // DOM is already ready, but wait a bit for all scripts to load
            setTimeout(() => this.init(), 100);
        } else {
            this.init();
        }
    }
    
    async init() {
        console.log('🗓️ Initializing Shift Schedule Manager...');
        
        // Check if user has permission (manager or owner only)
        if (!this.hasPermission()) {
            console.warn('⚠️ User does not have permission to access shift schedules');
            return;
        }
        
        // Wait for utilities to be available
        await this.waitForUtilities();
        
        this.setupEventListeners();
        this.setupOtherEventListeners();
        this.initialized = true;
        
        console.log('✅ Shift Schedule Manager initialized');
    }
    
    async waitForUtilities(maxWait = 5000) {
        const startTime = Date.now();
        
        while (!window.openModal || !window.closeModal) {
            if (Date.now() - startTime > maxWait) {
                console.warn('⚠️ Modal utilities not available after timeout, will use fallback');
                break;
            }
            
            console.log('⏳ Waiting for modal utilities to load...');
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (window.openModal && window.closeModal) {
            console.log('✅ Modal utilities are available');
        }
    }
    
    hasPermission() {
        // Check user role from multiple sources
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const authSystemRole = window.authSystem?.currentUser?.role;
        const userDataRole = userData.role;
        
        // Try to get role from various sources
        const possibleRoles = [
            userDataRole,
            authSystemRole,
            userData.userRole,
            userData.type,
            window.authSystem?.currentUser?.type,
            localStorage.getItem('userRole'),
            sessionStorage.getItem('userRole')
        ].filter(Boolean); // Remove null/undefined values
        
        // Enhanced logging
        console.log('🔐 Enhanced Permission Check:', {
            userData,
            authSystemUser: window.authSystem?.currentUser,
            possibleRoles,
            localStorage_keys: Object.keys(localStorage),
            sessionStorage_keys: Object.keys(sessionStorage)
        });
        
        // Expanded list of allowed roles for shift schedule management
        const allowedRoles = [
            'owner',           // Business owner
            'manager',         // Store manager  
            'admin',           // Admin user
            'branch',          // Branch user
            'business_owner',  // Alternative owner format
            'store_manager',   // Alternative manager format
            'administrator'    // Alternative admin format
        ];
        
        // Check if any of the possible roles match allowed roles
        const hasPermission = possibleRoles.some(role => 
            allowedRoles.includes(role?.toLowerCase())
        );
        
        console.log('🔐 Permission Result:', {
            allowedRoles,
            foundRoles: possibleRoles,
            hasPermission,
            failureReason: hasPermission ? null : 'No matching role found in: ' + possibleRoles.join(', ')
        });
        
        return hasPermission;
    }
    
    // Debug method to help identify authentication issues
    debugAuthStatus() {
        console.log('🔍 Authentication Debug Status:');
        console.log('- API URL:', this.getApiUrl());
        console.log('- Auth Token:', this.getAuthToken() ? 'Present' : 'Missing');
        console.log('- Token preview:', this.getAuthToken()?.substring(0, 30) + '...');
        console.log('- User Data:', JSON.parse(localStorage.getItem('userData') || '{}'));
        console.log('- Auth System:', window.authSystem?.currentUser);
        console.log('- Has Permission:', this.hasPermission());
        console.log('- API_CONFIG:', window.API_CONFIG ? 'Available' : 'Missing');
        console.log('- Location:', window.location.hostname);
    }
    
    setupEventListeners() {
        console.log('🗓️ Setting up event listeners...');
        
        // Global event delegation for maximum reliability
        document.addEventListener('click', (e) => {
            if (e.target && (e.target.id === 'addShiftScheduleBtn' || e.target.closest('#addShiftScheduleBtn'))) {
                console.log('🗓️ Create Schedule button clicked via delegation');
                e.preventDefault();
                e.stopPropagation();
                this.showCreateScheduleModal();
                return false;
            }
        });
        
        // Try to attach directly to button with retry mechanism
        this.attachButtonListener();
        
        // Set up a periodic check to ensure button is attached
        this.buttonCheckInterval = setInterval(() => {
            if (!this.buttonAttached && this.retryCount < this.maxRetries) {
                this.attachButtonListener();
            } else if (this.retryCount >= this.maxRetries) {
                console.warn('⚠️ Max retries reached for button attachment');
                clearInterval(this.buttonCheckInterval);
            }
        }, 500);
    }
    
    attachButtonListener() {
        const addScheduleBtn = document.getElementById('addShiftScheduleBtn');
        if (addScheduleBtn && !this.buttonAttached) {
            console.log('✅ Found addShiftScheduleBtn, attaching direct event listener');
            
            // Remove any existing listeners to avoid duplicates
            addScheduleBtn.removeEventListener('click', this.boundClickHandler);
            
            // Create bound handler for removal later
            this.boundClickHandler = (e) => {
                console.log('🗓️ Create Schedule button clicked (direct)');
                e.preventDefault();
                e.stopPropagation();
                this.showCreateScheduleModal();
                return false;
            };
            
            addScheduleBtn.addEventListener('click', this.boundClickHandler);
            this.buttonAttached = true;
            clearInterval(this.buttonCheckInterval);
            console.log('✅ Button listener attached successfully');
        } else if (!addScheduleBtn) {
            this.retryCount++;
            console.warn(`⚠️ addShiftScheduleBtn not found (attempt ${this.retryCount}/${this.maxRetries})`);
        }
    }
    
    setupOtherEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('scheduleSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.filterSchedules(e.target.value));
        }

        // Clear search button
        const clearSearchBtn = document.getElementById('clearScheduleSearch');
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => this.clearSearch());
        }

        // Filter dropdown
        const shiftTypeFilter = document.getElementById('shiftTypeFilter');
        if (shiftTypeFilter) {
            shiftTypeFilter.addEventListener('change', (e) => this.filterByShiftType(e.target.value));
        }

        // Template buttons
        document.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const template = e.currentTarget.getAttribute('data-template');
                this.applyTemplate(template);
            });
        });

        // Schedule form submission
        const scheduleForm = document.getElementById('shiftScheduleForm');
        if (scheduleForm) {
            scheduleForm.addEventListener('submit', (e) => this.handleSaveSchedule(e));
        }

        // Quick template buttons in modal
        document.querySelectorAll('.quick-template-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const template = e.currentTarget.getAttribute('data-template');
                this.applyQuickTemplate(template);
            });
        });

        // Day shift change handlers
        document.querySelectorAll('.day-shift-select').forEach(select => {
            select.addEventListener('change', (e) => this.handleShiftTypeChange(e));
        });

        // Shift configuration save button
        const saveConfigBtn = document.getElementById('saveShiftConfigBtn');
        if (saveConfigBtn) {
            saveConfigBtn.addEventListener('click', () => this.saveShiftConfiguration());
        }
    }
    
    async loadSchedules() {
        try {
            console.log('📅 Loading shift schedules...');
            
            const token = this.getAuthToken();
            if (!token) {
                console.error('❌ No authentication token found');
                this.showError('Authentication required. Please log in again.');
                return;
            }
            
            const apiUrl = this.getApiUrl();
            const url = `${apiUrl}/api/shift-schedules`;
            
            console.log('🌐 Making API request to:', url);
            console.log('🔑 Using token:', token.substring(0, 20) + '...');
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('📡 Response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ API Error:', response.status, errorText);
                throw new Error(`Failed to load schedules: ${response.status} - ${errorText}`);
            }
            
            const result = await response.json();
            this.schedules = result.data || [];
            
            console.log(`✅ Loaded ${this.schedules.length} shift schedules`);
            
            this.updateAnalytics();
            this.renderScheduleGrid();
            
        } catch (error) {
            console.error('❌ Error loading shift schedules:', error);
            this.showError(`Failed to load shift schedules: ${error.message}`);
        }
    }
    
    async loadEmployees() {
        try {
            console.log('👥 Loading employees...');

            const token = this.getAuthToken();
            if (!token) {
                console.error('❌ No authentication token found for employees');
                this.showError('Authentication required. Please log in again.');
                return;
            }

            const apiUrl = this.getApiUrl();
            const url = `${apiUrl}/api/employees`;

            console.log('🌐 Making employees API request to:', url);
            console.log('🔑 Using token for employees:', token.substring(0, 20) + '...');

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('📡 Employees response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Employees API Error:', response.status, errorText);

                if (response.status === 401) {
                    this.showError('Authentication expired. Please log in again.');
                    return;
                } else if (response.status === 403) {
                    this.showError('Access denied. Manager or owner role required.');
                    return;
                }

                throw new Error(`Failed to load employees: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            this.employees = result.data || [];

            console.log(`✅ Loaded ${this.employees.length} employees`);

            this.populateEmployeeDropdown();

        } catch (error) {
            console.error('❌ Error loading employees:', error);
            this.showError(`Failed to load employees: ${error.message}`);
        }
    }

    async loadShiftConfiguration() {
        try {
            console.log('⚙️ Loading shift configuration...');

            const token = this.getAuthToken();
            if (!token) {
                console.error('❌ No authentication token found for shift configuration');
                // Use default configuration
                this.shiftConfiguration = {
                    dayShift: { startTime: '09:00', endTime: '17:00' },
                    nightShift: { startTime: '18:00', endTime: '02:00' }
                };
                return;
            }

            const apiUrl = this.getApiUrl();
            const url = `${apiUrl}/api/shift-configuration`;

            console.log('🌐 Making shift configuration API request to:', url);

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('📡 Shift configuration response status:', response.status);

            if (!response.ok) {
                console.warn('⚠️ Failed to load shift configuration, using defaults');
                // Use default configuration
                this.shiftConfiguration = {
                    dayShift: { startTime: '09:00', endTime: '17:00' },
                    nightShift: { startTime: '18:00', endTime: '02:00' }
                };
                return;
            }

            const result = await response.json();
            this.shiftConfiguration = result.data || {
                dayShift: { startTime: '09:00', endTime: '17:00' },
                nightShift: { startTime: '18:00', endTime: '02:00' }
            };

            console.log('✅ Loaded shift configuration:', this.shiftConfiguration);

            // Populate the configuration form fields
            this.populateShiftConfigurationForm();

        } catch (error) {
            console.error('❌ Error loading shift configuration:', error);
            // Use default configuration on error
            this.shiftConfiguration = {
                dayShift: { startTime: '09:00', endTime: '17:00' },
                nightShift: { startTime: '18:00', endTime: '02:00' }
            };
        }
    }

    populateShiftConfigurationForm() {
        if (!this.shiftConfiguration) return;

        // Populate day shift fields
        const dayShiftStartInput = document.getElementById('dayShiftStartTime');
        const dayShiftEndInput = document.getElementById('dayShiftEndTime');

        if (dayShiftStartInput && this.shiftConfiguration.dayShift) {
            dayShiftStartInput.value = this.shiftConfiguration.dayShift.startTime;
        }
        if (dayShiftEndInput && this.shiftConfiguration.dayShift) {
            dayShiftEndInput.value = this.shiftConfiguration.dayShift.endTime;
        }

        // Populate night shift fields
        const nightShiftStartInput = document.getElementById('nightShiftStartTime');
        const nightShiftEndInput = document.getElementById('nightShiftEndTime');

        if (nightShiftStartInput && this.shiftConfiguration.nightShift) {
            nightShiftStartInput.value = this.shiftConfiguration.nightShift.startTime;
        }
        if (nightShiftEndInput && this.shiftConfiguration.nightShift) {
            nightShiftEndInput.value = this.shiftConfiguration.nightShift.endTime;
        }

        console.log('✅ Populated shift configuration form fields');
    }

    async saveShiftConfiguration() {
        try {
            console.log('💾 Saving shift configuration...');

            // Get values from form
            const dayShiftStartTime = document.getElementById('dayShiftStartTime').value;
            const dayShiftEndTime = document.getElementById('dayShiftEndTime').value;
            const nightShiftStartTime = document.getElementById('nightShiftStartTime').value;
            const nightShiftEndTime = document.getElementById('nightShiftEndTime').value;

            // Validate inputs
            if (!dayShiftStartTime || !dayShiftEndTime || !nightShiftStartTime || !nightShiftEndTime) {
                this.showError('Please fill in all shift time fields');
                return;
            }

            const token = this.getAuthToken();
            if (!token) {
                this.showError('Authentication required. Please log in again.');
                return;
            }

            const apiUrl = this.getApiUrl();
            const url = `${apiUrl}/api/shift-configuration`;

            const configData = {
                dayShift: {
                    startTime: dayShiftStartTime,
                    endTime: dayShiftEndTime
                },
                nightShift: {
                    startTime: nightShiftStartTime,
                    endTime: nightShiftEndTime
                }
            };

            console.log('🌐 Saving configuration:', configData);

            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(configData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to save configuration: ${response.status}`);
            }

            const result = await response.json();
            this.shiftConfiguration = result.data;

            console.log('✅ Shift configuration saved successfully');
            this.showSuccess('Shift configuration saved! New times will be used for future schedules.');

        } catch (error) {
            console.error('❌ Error saving shift configuration:', error);
            this.showError(`Failed to save shift configuration: ${error.message}`);
        }
    }
    
    populateEmployeeDropdown() {
        const employeeSelect = document.getElementById('scheduleEmployeeId');
        if (!employeeSelect) return;
        
        // Clear existing options except the first one
        employeeSelect.innerHTML = '<option value="">Select Employee</option>';
        
        // Add employee options
        this.employees
            .filter(emp => emp.isActive !== false)
            .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`))
            .forEach(employee => {
                const option = document.createElement('option');
                option.value = employee._id || employee.id;
                option.textContent = `${employee.firstName} ${employee.lastName} - ${employee.position || employee.role}`;
                employeeSelect.appendChild(option);
            });
    }
    
    updateAnalytics() {
        // Calculate analytics from schedules
        const analytics = {
            totalScheduled: this.schedules.length,
            dayShifts: 0,
            nightShifts: 0,
            activeSchedules: this.schedules.filter(s => s.isActive !== false).length
        };
        
        // Count shift types across all days
        this.schedules.forEach(schedule => {
            if (schedule.isActive === false) return;
            
            const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            days.forEach(day => {
                const shift = schedule.weeklySchedule?.[day]?.shift;
                if (shift === 'day') analytics.dayShifts++;
                else if (shift === 'night') analytics.nightShifts++;
            });
        });
        
        // Update UI
        document.getElementById('totalScheduledEmployees').textContent = analytics.totalScheduled;
        document.getElementById('dayShiftCount').textContent = analytics.dayShifts;
        document.getElementById('nightShiftCount').textContent = analytics.nightShifts;
        document.getElementById('activeSchedulesCount').textContent = analytics.activeSchedules;
    }
    
    renderScheduleGrid() {
        const gridContainer = document.getElementById('scheduleGrid');
        if (!gridContainer) return;
        
        if (this.schedules.length === 0) {
            gridContainer.innerHTML = `
                <div class="schedule-empty-state" style="
                    text-align: center;
                    padding: 4rem 2rem;
                    background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
                    border-radius: 16px;
                    border: 2px dashed #e2e8f0;
                    margin: 2rem 0;
                ">
                    <div style="
                        width: 80px;
                        height: 80px;
                        margin: 0 auto 2rem auto;
                        background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
                    ">
                        <i class="fas fa-calendar-week" style="
                            font-size: 2rem;
                            color: #64748b;
                        "></i>
                    </div>
                    <h3 style="
                        font-size: 1.5rem;
                        font-weight: 700;
                        color: #1f2937;
                        margin: 0 0 1rem 0;
                    ">No Shift Schedules Yet</h3>
                    <p style="
                        color: #6b7280;
                        font-size: 1.1rem;
                        line-height: 1.6;
                        margin: 0 0 2rem 0;
                        max-width: 500px;
                        margin-left: auto;
                        margin-right: auto;
                    ">Create your first employee shift schedule to get started.<br>Assign day shifts, night shifts, and days off for each employee.</p>
                    <button 
                        onclick="window.shiftScheduleManager.showCreateScheduleModal()" 
                        style="
                            background: linear-gradient(135deg, #800020 0%, #600015 100%);
                            border: none;
                            padding: 1rem 2.5rem;
                            font-weight: 600;
                            font-size: 1.1rem;
                            color: white;
                            border-radius: 12px;
                            box-shadow: 0 10px 25px -5px rgba(128, 0, 32, 0.3), 0 10px 10px -5px rgba(128, 0, 32, 0.1);
                            cursor: pointer;
                            transition: all 0.3s ease;
                            display: inline-flex;
                            align-items: center;
                            gap: 0.75rem;
                        "
                        onmouseover="
                            this.style.transform='translateY(-2px)';
                            this.style.boxShadow='0 20px 25px -5px rgba(128, 0, 32, 0.4), 0 10px 10px -5px rgba(128, 0, 32, 0.2)';
                        "
                        onmouseout="
                            this.style.transform='translateY(0)';
                            this.style.boxShadow='0 10px 25px -5px rgba(128, 0, 32, 0.3), 0 10px 10px -5px rgba(128, 0, 32, 0.1)';
                        "
                    >
                        <i class="fas fa-plus"></i> Create First Schedule
                    </button>
                </div>
            `;
            return;
        }
        
        const table = document.createElement('table');
        table.className = 'schedule-grid';
        
        // Table header
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Employee</th>
                    <th>Mon</th>
                    <th>Tue</th>
                    <th>Wed</th>
                    <th>Thu</th>
                    <th>Fri</th>
                    <th>Sat</th>
                    <th>Sun</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${this.schedules.map(schedule => this.renderScheduleRow(schedule)).join('')}
            </tbody>
        `;
        
        gridContainer.innerHTML = '';
        gridContainer.appendChild(table);
    }
    
    renderScheduleRow(schedule) {
        const employee = schedule.employeeId || {};
        const employeeName = employee.firstName && employee.lastName 
            ? `${employee.firstName} ${employee.lastName}` 
            : 'Unknown Employee';
        const employeePosition = employee.position || employee.role || 'Staff';
        
        const initials = employeeName
            .split(' ')
            .map(n => n.charAt(0))
            .join('')
            .toUpperCase()
            .substring(0, 2);
        
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        
        return `
            <tr class="schedule-row">
                <td>
                    <div class="employee-info">
                        <div class="employee-avatar">${initials}</div>
                        <div class="employee-details">
                            <h4>${employeeName}</h4>
                            <p>${employeePosition}</p>
                        </div>
                    </div>
                </td>
                ${days.map(day => {
                    const daySchedule = schedule.weeklySchedule?.[day] || { shift: 'off' };
                    const shiftType = daySchedule.shift || 'off';
                    const timeText = shiftType === 'off' ? '' : ` (${daySchedule.startTime}-${daySchedule.endTime})`;
                    
                    return `
                        <td>
                            <span class="shift-badge ${shiftType}">
                                ${shiftType === 'off' ? 'Off' : (shiftType === 'day' ? 'Day' : 'Night')}${timeText}
                            </span>
                        </td>
                    `;
                }).join('')}
                <td>
                    <div class="schedule-actions">
                        <button class="btn-schedule-edit" onclick="window.shiftScheduleManager.editSchedule('${schedule._id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn-schedule-delete" onclick="window.shiftScheduleManager.deleteSchedule('${schedule._id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
    
    showCreateScheduleModal() {
        console.log('🗓️ Opening Create Shift Schedule Modal...');
        
        try {
            // Ensure modal elements exist
            const form = document.getElementById('shiftScheduleForm');
            const modal = document.getElementById('shiftScheduleModal');
            
            if (!form) {
                console.error('❌ Shift schedule form not found');
                alert('Error: Schedule form not found. Please refresh the page.');
                return;
            }
            
            if (!modal) {
                console.error('❌ Shift schedule modal not found');
                alert('Error: Schedule modal not found. Please refresh the page.');
                return;
            }
            
            console.log('✅ Modal and form elements found');
            
            // Reset form
            form.reset();
            const scheduleIdInput = document.getElementById('scheduleId');
            const modalTitle = document.getElementById('shiftScheduleModalTitle');
            
            if (scheduleIdInput) scheduleIdInput.value = '';
            if (modalTitle) modalTitle.textContent = 'Create Shift Schedule';
            
            // Set default effective date to today
            const today = new Date().toISOString().split('T')[0];
            const effectiveDateInput = document.getElementById('scheduleEffectiveDate');
            if (effectiveDateInput) {
                effectiveDateInput.value = today;
                console.log('✅ Set effective date to:', today);
            }
            
            // Reset all shift selects to 'off'
            const shiftSelects = document.querySelectorAll('.day-shift-select');
            console.log(`🔄 Resetting ${shiftSelects.length} shift selects`);
            shiftSelects.forEach(select => {
                select.value = 'off';
            });
            
            // Disable time inputs initially
            this.updateTimeInputStates();
            
            // Load employees if not already loaded
            if (this.employees.length === 0) {
                console.log('📥 Loading employees for dropdown...');
                this.loadEmployees();
            } else {
                console.log(`✅ ${this.employees.length} employees already loaded`);
            }
            
            // Show modal with multiple fallback methods
            this.openModalWithFallback(modal);
            
        } catch (error) {
            console.error('❌ Error in showCreateScheduleModal:', error);
            alert('Error opening schedule modal. Please try again or refresh the page.');
        }
    }
    
    openModalWithFallback(modal) {
        console.log('🚀 Attempting to open modal...');
        
        let modalOpened = false;
        
        // Method 1: Use global openModal function
        if (typeof window.openModal === 'function') {
            console.log('✅ Using global openModal function');
            try {
                window.openModal('shiftScheduleModal');
                modalOpened = true;
                console.log('✅ Modal opened successfully with openModal');
            } catch (error) {
                console.warn('⚠️ openModal failed:', error);
            }
        }
        
        // Method 2: Direct DOM manipulation if openModal failed
        if (!modalOpened) {
            console.log('🔄 Fallback: Using direct DOM manipulation');
            try {
                // Remove any conflicting styles
                modal.style.removeProperty('display');
                modal.style.removeProperty('position');
                modal.style.removeProperty('align-items');
                modal.style.removeProperty('justify-content');
                
                // Apply modal styles
                modal.style.display = 'flex';
                modal.style.position = 'fixed';
                modal.style.top = '0';
                modal.style.left = '0';
                modal.style.width = '100%';
                modal.style.height = '100%';
                modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                modal.style.alignItems = 'center';
                modal.style.justifyContent = 'center';
                modal.style.zIndex = '1000';
                
                modal.classList.add('active');
                modalOpened = true;
                console.log('✅ Modal opened successfully with fallback');
            } catch (error) {
                console.error('❌ Fallback modal opening failed:', error);
            }
        }
        
        // Method 3: Last resort - force show
        if (!modalOpened) {
            console.log('🆘 Last resort: Force showing modal');
            modal.style.display = 'block !important';
            modal.style.visibility = 'visible';
            modal.style.opacity = '1';
            console.log('⚠️ Modal forced to show - may not be perfectly styled');
        }
        
        // Add escape key listener
        this.addEscapeListener();
    }
    
    addEscapeListener() {
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                console.log('🔑 Escape key pressed, closing modal');
                this.closeModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }
    
    closeModal() {
        const modal = document.getElementById('shiftScheduleModal');
        if (modal) {
            if (typeof window.closeModal === 'function') {
                window.closeModal('shiftScheduleModal');
            } else {
                modal.style.display = 'none';
                modal.classList.remove('active');
            }
        }
    }
    
    async editSchedule(scheduleId) {
        try {
            const schedule = this.schedules.find(s => s._id === scheduleId);
            if (!schedule) {
                throw new Error('Schedule not found');
            }
            
            // Populate form
            document.getElementById('scheduleId').value = scheduleId;
            document.getElementById('scheduleEmployeeId').value = schedule.employeeId._id || schedule.employeeId;
            document.getElementById('scheduleEffectiveDate').value = schedule.effectiveDate ? schedule.effectiveDate.split('T')[0] : '';
            document.getElementById('scheduleNotes').value = schedule.notes || '';
            document.getElementById('shiftScheduleModalTitle').textContent = 'Edit Shift Schedule';
            
            // Populate weekly schedule
            const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            days.forEach(day => {
                const daySchedule = schedule.weeklySchedule?.[day] || { shift: 'off', startTime: '09:00', endTime: '17:00' };
                
                const shiftSelect = document.querySelector(`.day-shift-select[data-day="${day}"]`);
                const startTimeInput = document.querySelector(`.day-start-time[data-day="${day}"]`);
                const endTimeInput = document.querySelector(`.day-end-time[data-day="${day}"]`);
                
                if (shiftSelect) shiftSelect.value = daySchedule.shift || 'off';
                if (startTimeInput) startTimeInput.value = daySchedule.startTime || '09:00';
                if (endTimeInput) endTimeInput.value = daySchedule.endTime || '17:00';
            });
            
            this.updateTimeInputStates();
            
            // Show modal
            if (typeof openModal === 'function') {
                openModal('shiftScheduleModal');
            }
            
        } catch (error) {
            console.error('❌ Error editing schedule:', error);
            this.showError('Failed to load schedule for editing');
        }
    }
    
    async deleteSchedule(scheduleId) {
        if (!confirm('Are you sure you want to delete this shift schedule?')) {
            return;
        }
        
        try {
            const token = this.getAuthToken();
            if (!token) {
                this.showError('Authentication required. Please log in again.');
                return;
            }
            
            const apiUrl = this.getApiUrl();
            const response = await fetch(`${apiUrl}/api/shift-schedules/${scheduleId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to delete schedule: ${response.status}`);
            }
            
            // Remove from local array
            this.schedules = this.schedules.filter(s => s._id !== scheduleId);
            
            this.updateAnalytics();
            this.renderScheduleGrid();
            this.showSuccess('Shift schedule deleted successfully');
            
        } catch (error) {
            console.error('❌ Error deleting schedule:', error);
            this.showError('Failed to delete shift schedule');
        }
    }
    
    async handleSaveSchedule(event) {
        event.preventDefault();
        
        try {
            const formData = this.collectFormData();
            const scheduleId = document.getElementById('scheduleId').value;
            
            const token = this.getAuthToken();
            if (!token) {
                this.showError('Authentication required. Please log in again.');
                return;
            }
            
            const apiUrl = this.getApiUrl();
            const url = scheduleId 
                ? `${apiUrl}/api/shift-schedules/${scheduleId}`
                : `${apiUrl}/api/shift-schedules`;
            
            const method = scheduleId ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to save schedule: ${response.status}`);
            }
            
            const result = await response.json();
            
            // Update local data
            if (scheduleId) {
                const index = this.schedules.findIndex(s => s._id === scheduleId);
                if (index >= 0) {
                    this.schedules[index] = result.data;
                }
            } else {
                this.schedules.push(result.data);
            }
            
            this.updateAnalytics();
            this.renderScheduleGrid();
            this.showSuccess(scheduleId ? 'Schedule updated successfully' : 'Schedule created successfully');
            
            // Close modal
            if (typeof closeModal === 'function') {
                closeModal('shiftScheduleModal');
            }
            
        } catch (error) {
            console.error('❌ Error saving schedule:', error);
            this.showError(error.message || 'Failed to save shift schedule');
        }
    }
    
    collectFormData() {
        const employeeId = document.getElementById('scheduleEmployeeId').value;
        const effectiveDate = document.getElementById('scheduleEffectiveDate').value;
        const notes = document.getElementById('scheduleNotes').value;
        
        if (!employeeId) {
            throw new Error('Please select an employee');
        }
        
        const weeklySchedule = {};
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        
        days.forEach(day => {
            const shiftSelect = document.querySelector(`.day-shift-select[data-day="${day}"]`);
            const startTimeInput = document.querySelector(`.day-start-time[data-day="${day}"]`);
            const endTimeInput = document.querySelector(`.day-end-time[data-day="${day}"]`);
            
            weeklySchedule[day] = {
                shift: shiftSelect ? shiftSelect.value : 'off',
                startTime: startTimeInput ? startTimeInput.value : '09:00',
                endTime: endTimeInput ? endTimeInput.value : '17:00'
            };
        });
        
        return {
            employeeId,
            weeklySchedule,
            effectiveDate: effectiveDate || new Date().toISOString().split('T')[0],
            notes: notes || ''
        };
    }
    
    applyQuickTemplate(template) {
        // Use configured shift times or defaults
        const dayStart = this.shiftConfiguration?.dayShift?.startTime || '09:00';
        const dayEnd = this.shiftConfiguration?.dayShift?.endTime || '17:00';
        const nightStart = this.shiftConfiguration?.nightShift?.startTime || '18:00';
        const nightEnd = this.shiftConfiguration?.nightShift?.endTime || '02:00';

        const templates = {
            'weekday-day': {
                monday: { shift: 'day', startTime: dayStart, endTime: dayEnd },
                tuesday: { shift: 'day', startTime: dayStart, endTime: dayEnd },
                wednesday: { shift: 'day', startTime: dayStart, endTime: dayEnd },
                thursday: { shift: 'day', startTime: dayStart, endTime: dayEnd },
                friday: { shift: 'day', startTime: dayStart, endTime: dayEnd },
                saturday: { shift: 'off', startTime: dayStart, endTime: dayEnd },
                sunday: { shift: 'off', startTime: dayStart, endTime: dayEnd }
            },
            'weekday-night': {
                monday: { shift: 'night', startTime: nightStart, endTime: nightEnd },
                tuesday: { shift: 'night', startTime: nightStart, endTime: nightEnd },
                wednesday: { shift: 'night', startTime: nightStart, endTime: nightEnd },
                thursday: { shift: 'night', startTime: nightStart, endTime: nightEnd },
                friday: { shift: 'night', startTime: nightStart, endTime: nightEnd },
                saturday: { shift: 'off', startTime: dayStart, endTime: dayEnd },
                sunday: { shift: 'off', startTime: dayStart, endTime: dayEnd }
            },
            'weekend': {
                monday: { shift: 'off', startTime: dayStart, endTime: dayEnd },
                tuesday: { shift: 'off', startTime: dayStart, endTime: dayEnd },
                wednesday: { shift: 'off', startTime: dayStart, endTime: dayEnd },
                thursday: { shift: 'off', startTime: dayStart, endTime: dayEnd },
                friday: { shift: 'off', startTime: dayStart, endTime: dayEnd },
                saturday: { shift: 'day', startTime: dayStart, endTime: dayEnd },
                sunday: { shift: 'day', startTime: dayStart, endTime: dayEnd }
            },
            'clear': {
                monday: { shift: 'off', startTime: dayStart, endTime: dayEnd },
                tuesday: { shift: 'off', startTime: dayStart, endTime: dayEnd },
                wednesday: { shift: 'off', startTime: dayStart, endTime: dayEnd },
                thursday: { shift: 'off', startTime: dayStart, endTime: dayEnd },
                friday: { shift: 'off', startTime: dayStart, endTime: dayEnd },
                saturday: { shift: 'off', startTime: dayStart, endTime: dayEnd },
                sunday: { shift: 'off', startTime: dayStart, endTime: dayEnd }
            }
        };
        
        const templateData = templates[template];
        if (!templateData) return;
        
        Object.keys(templateData).forEach(day => {
            const dayData = templateData[day];
            
            const shiftSelect = document.querySelector(`.day-shift-select[data-day="${day}"]`);
            const startTimeInput = document.querySelector(`.day-start-time[data-day="${day}"]`);
            const endTimeInput = document.querySelector(`.day-end-time[data-day="${day}"]`);
            
            if (shiftSelect) shiftSelect.value = dayData.shift;
            if (startTimeInput) startTimeInput.value = dayData.startTime;
            if (endTimeInput) endTimeInput.value = dayData.endTime;
        });
        
        this.updateTimeInputStates();
    }
    
    handleShiftTypeChange(event) {
        const select = event.target;
        const day = select.getAttribute('data-day');
        const shiftType = select.value;

        // Get the time inputs for this day
        const startTimeInput = document.querySelector(`.day-start-time[data-day="${day}"]`);
        const endTimeInput = document.querySelector(`.day-end-time[data-day="${day}"]`);

        if (!startTimeInput || !endTimeInput) {
            this.updateTimeInputStates();
            return;
        }

        // Auto-populate times based on shift type and configuration
        if (shiftType === 'day' && this.shiftConfiguration) {
            startTimeInput.value = this.shiftConfiguration.dayShift.startTime;
            endTimeInput.value = this.shiftConfiguration.dayShift.endTime;
            console.log(`✅ Auto-populated ${day} day shift: ${startTimeInput.value} - ${endTimeInput.value}`);
        } else if (shiftType === 'night' && this.shiftConfiguration) {
            startTimeInput.value = this.shiftConfiguration.nightShift.startTime;
            endTimeInput.value = this.shiftConfiguration.nightShift.endTime;
            console.log(`✅ Auto-populated ${day} night shift: ${startTimeInput.value} - ${endTimeInput.value}`);
        }

        this.updateTimeInputStates();
    }
    
    updateTimeInputStates() {
        document.querySelectorAll('.day-shift-select').forEach(select => {
            const day = select.getAttribute('data-day');
            const startTimeInput = document.querySelector(`.day-start-time[data-day="${day}"]`);
            const endTimeInput = document.querySelector(`.day-end-time[data-day="${day}"]`);
            
            if (select.value === 'off') {
                if (startTimeInput) {
                    startTimeInput.disabled = true;
                    startTimeInput.style.opacity = '0.5';
                }
                if (endTimeInput) {
                    endTimeInput.disabled = true;
                    endTimeInput.style.opacity = '0.5';
                }
            } else {
                if (startTimeInput) {
                    startTimeInput.disabled = false;
                    startTimeInput.style.opacity = '1';
                }
                if (endTimeInput) {
                    endTimeInput.disabled = false;
                    endTimeInput.style.opacity = '1';
                }
            }
        });
    }
    
    filterSchedules(searchTerm) {
        // Implementation would filter the displayed schedules
        // For now, just show/hide the clear button
        const clearBtn = document.getElementById('clearScheduleSearch');
        if (clearBtn) {
            clearBtn.style.display = searchTerm ? 'block' : 'none';
        }
    }
    
    clearSearch() {
        const searchInput = document.getElementById('scheduleSearchInput');
        if (searchInput) {
            searchInput.value = '';
            this.filterSchedules('');
        }
    }
    
    filterByShiftType(shiftType) {
        // Implementation would filter schedules by shift type
        console.log('Filtering by shift type:', shiftType);
    }
    
    applyTemplate(template) {
        // Template application for bulk operations
        console.log('Applying template:', template);
    }
    
    getApiUrl() {
        // Use API_CONFIG if available for consistent URL handling
        if (window.API_CONFIG && window.API_CONFIG.BASE_URL) {
            console.log('🌐 Using API_CONFIG BASE_URL:', window.API_CONFIG.BASE_URL);
            return window.API_CONFIG.BASE_URL;
        }
        
        // Fallback to environment detection
        const isLocalhost = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1';
        
        const apiUrl = isLocalhost ? 'http://localhost:4001' : 'https://daetspa-backend.onrender.com';
        console.log('🌐 Using fallback API URL:', apiUrl, '(localhost:', isLocalhost, ')');
        
        return apiUrl;
    }
    
    getAuthToken() {
        // Try multiple sources for auth token
        let token = null;
        
        // 1. Try API_CONFIG method
        if (window.API_CONFIG && typeof window.API_CONFIG.getToken === 'function') {
            token = window.API_CONFIG.getToken();
            if (token) {
                console.log('🔑 Got token from API_CONFIG');
                return token;
            }
        }
        
        // 2. Try localStorage
        token = localStorage.getItem('authToken');
        if (token) {
            console.log('🔑 Got token from localStorage');
            return token;
        }
        
        // 3. Try authSystem
        if (window.authSystem && window.authSystem.authToken) {
            token = window.authSystem.authToken;
            console.log('🔑 Got token from authSystem');
            return token;
        }
        
        // 4. Try alternative localStorage keys
        token = localStorage.getItem('userToken') || sessionStorage.getItem('authToken');
        if (token) {
            console.log('🔑 Got token from alternative storage');
            return token;
        }
        
        console.warn('⚠️ No authentication token found in any location');
        return null;
    }
    
    showSuccess(message) {
        if (window.StateHelpers && window.StateHelpers.showNotification) {
            window.StateHelpers.showNotification(message, 'success');
        } else {
            alert(message);
        }
    }
    
    showError(message) {
        if (window.StateHelpers && window.StateHelpers.showNotification) {
            window.StateHelpers.showNotification(message, 'error');
        } else {
            alert(message);
        }
    }
    
    // Load data when shift schedule page is shown
    async onPageShow() {
        console.log('🗓️ Shift Schedule page shown, initializing...');
        
        // Debug authentication status
        this.debugAuthStatus();
        
        if (!this.hasPermission()) {
            console.warn('⚠️ User does not have permission to access shift schedules');
            
            // Get current user info for better error message
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            const currentRole = userData.role || window.authSystem?.currentUser?.role || 'unknown';
            
            const errorMessage = `Access denied. Shift schedules require manager/owner/admin role.\n\nCurrent role: ${currentRole}\n\nAllowed roles: owner, manager, admin, branch`;
            
            this.showError(errorMessage);
            console.error('🚫 Permission denied details:', {
                currentRole,
                requiredRoles: ['owner', 'manager', 'admin', 'branch'],
                userData,
                authSystem: window.authSystem?.currentUser
            });
            return;
        }
        
        // Re-setup event listeners to ensure they work
        this.ensureEventListeners();
        
        try {
            await Promise.all([
                this.loadSchedules(),
                this.loadEmployees(),
                this.loadShiftConfiguration()
            ]);
        } catch (error) {
            console.error('❌ Error during page initialization:', error);
            this.showError('Failed to initialize shift schedule page. Please refresh and try again.');
        }
    }
    
    // Ensure event listeners are attached
    ensureEventListeners() {
        console.log('🔧 Ensuring event listeners are attached...');
        
        // Reset button state and try to attach again
        this.buttonAttached = false;
        this.retryCount = 0;
        
        // Clear any existing interval
        if (this.buttonCheckInterval) {
            clearInterval(this.buttonCheckInterval);
        }
        
        // Try to attach the button listener
        this.attachButtonListener();
        
        // Set up the retry mechanism again if needed
        if (!this.buttonAttached) {
            this.buttonCheckInterval = setInterval(() => {
                if (!this.buttonAttached && this.retryCount < this.maxRetries) {
                    this.attachButtonListener();
                } else {
                    clearInterval(this.buttonCheckInterval);
                }
            }, 500);
        }
    }
}

// Initialize the shift schedule manager
window.shiftScheduleManager = new ShiftScheduleManager();

// Add global debug functions for testing
window.debugShiftSchedule = function() {
    if (window.shiftScheduleManager) {
        window.shiftScheduleManager.debugAuthStatus();
    } else {
        console.error('❌ Shift Schedule Manager not initialized');
    }
};

// Check current user role and permission status
window.checkUserRole = function() {
    console.log('👤 Current User Role Check:');
    
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const authUser = window.authSystem?.currentUser;
    
    console.log('📋 User Data Sources:', {
        localStorage_userData: userData,
        authSystem_currentUser: authUser,
        localStorage_userRole: localStorage.getItem('userRole'),
        sessionStorage_userRole: sessionStorage.getItem('userRole')
    });
    
    if (window.shiftScheduleManager) {
        const hasPermission = window.shiftScheduleManager.hasPermission();
        console.log('✅ Permission Status:', hasPermission ? 'ALLOWED' : 'DENIED');
        return hasPermission;
    } else {
        console.error('❌ Shift Schedule Manager not available');
        return false;
    }
};

// Temporary permission bypass for testing (REMOVE IN PRODUCTION)
window.bypassPermissionCheck = function() {
    console.warn('⚠️ BYPASSING PERMISSION CHECK FOR TESTING');
    
    if (window.shiftScheduleManager) {
        // Temporarily override the hasPermission method
        window.shiftScheduleManager.originalHasPermission = window.shiftScheduleManager.hasPermission;
        window.shiftScheduleManager.hasPermission = function() {
            console.log('🔓 Permission check bypassed - returning true');
            return true;
        };
        
        console.log('✅ Permission bypass activated. Try accessing shift schedules now.');
        return true;
    } else {
        console.error('❌ Shift Schedule Manager not available');
        return false;
    }
};

// Restore original permission checking
window.restorePermissionCheck = function() {
    if (window.shiftScheduleManager && window.shiftScheduleManager.originalHasPermission) {
        window.shiftScheduleManager.hasPermission = window.shiftScheduleManager.originalHasPermission;
        delete window.shiftScheduleManager.originalHasPermission;
        console.log('🔒 Original permission checking restored');
        return true;
    } else {
        console.warn('⚠️ No bypass to restore or manager not available');
        return false;
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ShiftScheduleManager;
}