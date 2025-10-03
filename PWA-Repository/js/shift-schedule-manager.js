// Shift Schedule Manager for DAETSPA PWA
// Handles shift scheduling for managers and owners only

class ShiftScheduleManager {
    constructor() {
        this.schedules = [];
        this.employees = [];
        this.currentSchedule = null;
        this.initialized = false;
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
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
        
        this.setupEventListeners();
        this.initialized = true;
        
        console.log('✅ Shift Schedule Manager initialized');
    }
    
    hasPermission() {
        // Check user role from localStorage or authSystem
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const userRole = userData.role || (window.authSystem?.currentUser?.role);
        
        return ['owner', 'manager'].includes(userRole);
    }
    
    setupEventListeners() {
        // Add Schedule button
        const addScheduleBtn = document.getElementById('addShiftScheduleBtn');
        if (addScheduleBtn) {
            addScheduleBtn.addEventListener('click', () => this.showCreateScheduleModal());
        }
        
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
    }
    
    async loadSchedules() {
        try {
            const token = this.getAuthToken();
            if (!token) {
                throw new Error('No authentication token found');
            }
            
            const response = await fetch(`${window.API_CONFIG?.BASE_URL || 'https://daetspa-backend.onrender.com'}/api/shift-schedules`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to load schedules: ${response.status}`);
            }
            
            const result = await response.json();
            this.schedules = result.data || [];
            
            console.log(`📅 Loaded ${this.schedules.length} shift schedules`);
            
            this.updateAnalytics();
            this.renderScheduleGrid();
            
        } catch (error) {
            console.error('❌ Error loading shift schedules:', error);
            this.showError('Failed to load shift schedules');
        }
    }
    
    async loadEmployees() {
        try {
            const token = this.getAuthToken();
            if (!token) {
                throw new Error('No authentication token found');
            }
            
            const response = await fetch(`${window.API_CONFIG?.BASE_URL || 'https://daetspa-backend.onrender.com'}/api/employees`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to load employees: ${response.status}`);
            }
            
            const result = await response.json();
            this.employees = result.data || [];
            
            console.log(`👥 Loaded ${this.employees.length} employees`);
            
            this.populateEmployeeDropdown();
            
        } catch (error) {
            console.error('❌ Error loading employees:', error);
            this.showError('Failed to load employees');
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
                <div style="text-align: center; padding: 3rem; color: #6B7280;">
                    <i class="fas fa-calendar-week" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <h3>No Shift Schedules Yet</h3>
                    <p>Create your first employee shift schedule to get started.</p>
                    <button class="btn btn-primary" onclick="window.shiftScheduleManager.showCreateScheduleModal()">
                        <i class="fas fa-plus"></i> Create Schedule
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
        // Reset form
        document.getElementById('shiftScheduleForm').reset();
        document.getElementById('scheduleId').value = '';
        document.getElementById('shiftScheduleModalTitle').textContent = 'Create Shift Schedule';
        
        // Set default effective date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('scheduleEffectiveDate').value = today;
        
        // Reset all shift selects to 'off'
        document.querySelectorAll('.day-shift-select').forEach(select => {
            select.value = 'off';
        });
        
        // Disable time inputs initially
        this.updateTimeInputStates();
        
        // Load employees if not already loaded
        if (this.employees.length === 0) {
            this.loadEmployees();
        }
        
        // Show modal
        if (typeof openModal === 'function') {
            openModal('shiftScheduleModal');
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
            const response = await fetch(`${window.API_CONFIG?.BASE_URL || 'https://daetspa-backend.onrender.com'}/api/shift-schedules/${scheduleId}`, {
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
            const url = scheduleId 
                ? `${window.API_CONFIG?.BASE_URL || 'https://daetspa-backend.onrender.com'}/api/shift-schedules/${scheduleId}`
                : `${window.API_CONFIG?.BASE_URL || 'https://daetspa-backend.onrender.com'}/api/shift-schedules`;
            
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
        const templates = {
            'weekday-day': {
                monday: { shift: 'day', startTime: '09:00', endTime: '17:00' },
                tuesday: { shift: 'day', startTime: '09:00', endTime: '17:00' },
                wednesday: { shift: 'day', startTime: '09:00', endTime: '17:00' },
                thursday: { shift: 'day', startTime: '09:00', endTime: '17:00' },
                friday: { shift: 'day', startTime: '09:00', endTime: '17:00' },
                saturday: { shift: 'off', startTime: '09:00', endTime: '17:00' },
                sunday: { shift: 'off', startTime: '09:00', endTime: '17:00' }
            },
            'weekday-night': {
                monday: { shift: 'night', startTime: '18:00', endTime: '02:00' },
                tuesday: { shift: 'night', startTime: '18:00', endTime: '02:00' },
                wednesday: { shift: 'night', startTime: '18:00', endTime: '02:00' },
                thursday: { shift: 'night', startTime: '18:00', endTime: '02:00' },
                friday: { shift: 'night', startTime: '18:00', endTime: '02:00' },
                saturday: { shift: 'off', startTime: '09:00', endTime: '17:00' },
                sunday: { shift: 'off', startTime: '09:00', endTime: '17:00' }
            },
            'weekend': {
                monday: { shift: 'off', startTime: '09:00', endTime: '17:00' },
                tuesday: { shift: 'off', startTime: '09:00', endTime: '17:00' },
                wednesday: { shift: 'off', startTime: '09:00', endTime: '17:00' },
                thursday: { shift: 'off', startTime: '09:00', endTime: '17:00' },
                friday: { shift: 'off', startTime: '09:00', endTime: '17:00' },
                saturday: { shift: 'day', startTime: '09:00', endTime: '17:00' },
                sunday: { shift: 'day', startTime: '09:00', endTime: '17:00' }
            },
            'clear': {
                monday: { shift: 'off', startTime: '09:00', endTime: '17:00' },
                tuesday: { shift: 'off', startTime: '09:00', endTime: '17:00' },
                wednesday: { shift: 'off', startTime: '09:00', endTime: '17:00' },
                thursday: { shift: 'off', startTime: '09:00', endTime: '17:00' },
                friday: { shift: 'off', startTime: '09:00', endTime: '17:00' },
                saturday: { shift: 'off', startTime: '09:00', endTime: '17:00' },
                sunday: { shift: 'off', startTime: '09:00', endTime: '17:00' }
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
    
    getAuthToken() {
        return localStorage.getItem('authToken') || window.authSystem?.authToken;
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
        if (!this.hasPermission()) {
            return;
        }
        
        await Promise.all([
            this.loadSchedules(),
            this.loadEmployees()
        ]);
    }
}

// Initialize the shift schedule manager
window.shiftScheduleManager = new ShiftScheduleManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ShiftScheduleManager;
}