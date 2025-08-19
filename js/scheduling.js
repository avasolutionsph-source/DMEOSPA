// Weekly Scheduling Management
class SchedulingManager {
    constructor() {
        this.schedules = [];
        this.currentWeek = this.getWeekStart(new Date());
    }

    async init() {
        await this.loadSchedules();
        this.setupEventListeners();
        this.renderScheduleGrid();
    }

    setupEventListeners() {
        if (this._listenersAttached) return;
        this._listenersAttached = true;
        
        const addBtn = document.getElementById('addScheduleRequestBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showScheduleRequestModal());
        }
    }

    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
        return new Date(d.setDate(diff));
    }

    async loadSchedules() {
        try {
            this.schedules = await db.getAll('schedules');
            this.renderScheduleGrid();
        } catch (error) {
            console.error('Failed to load schedules:', error);
        }
    }

    async renderScheduleGrid() {
        const container = document.getElementById('scheduleRows');
        if (!container) return;

        const employees = await db.getAll('employees');
        if (employees.length === 0) {
            container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:1rem;">No employees found</div>';
            return;
        }

        const weekStart = this.currentWeek;
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        
        container.innerHTML = employees.map(emp => {
            const empSchedules = this.schedules.filter(s => s.employeeId === emp.id);
            
            return `
                <div class="schedule-row">
                    <div class="schedule-employee">${emp.name}</div>
                    ${days.map((day, idx) => {
                        const date = new Date(weekStart);
                        date.setDate(weekStart.getDate() + idx);
                        const dateStr = date.toISOString().split('T')[0];
                        
                        const daySchedule = empSchedules.find(s => s.date === dateStr);
                        const shift = daySchedule ? `${daySchedule.startTime}-${daySchedule.endTime}` : '-';
                        const status = daySchedule?.status || '';
                        const isRequest = status === 'requested';
                        
                        return `
                            <div class="schedule-cell ${isRequest ? 'schedule-request' : ''}" 
                                 onclick="schedulingManager.editShift('${emp.id}', '${dateStr}')">
                                <div class="shift-time">${shift}</div>
                                ${isRequest ? '<small style="color:#f59e0b;">Requested</small>' : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }).join('');
    }

    showScheduleRequestModal() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Schedule Request</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Employee</label>
                        <select id="scheduleEmployee" class="form-input" required></select>
                    </div>
                    <div class="form-group">
                        <label>Date</label>
                        <input type="date" id="scheduleDate" class="form-input" required>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Start Time</label>
                            <input type="time" id="scheduleStartTime" class="form-input" required>
                        </div>
                        <div class="form-group">
                            <label>End Time</label>
                            <input type="time" id="scheduleEndTime" class="form-input" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Notes</label>
                        <textarea id="scheduleNotes" class="form-input" rows="2" placeholder="Preferred shift, special requirements, etc."></textarea>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button class="btn btn-primary" id="submitScheduleRequestBtn">Submit Request</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Populate employees
        setTimeout(async () => {
            const employees = await db.getAll('employees');
            const select = modal.querySelector('#scheduleEmployee');
            select.innerHTML = employees.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
            
            // Default to current employee if in role mode
            if (window.roleManager?.activeEmployee) {
                select.value = window.roleManager.activeEmployee.id;
            }
        }, 50);

        // Submit handler
        modal.querySelector('#submitScheduleRequestBtn').onclick = async () => {
            try {
                const employeeId = parseInt(modal.querySelector('#scheduleEmployee').value);
                const date = modal.querySelector('#scheduleDate').value;
                const startTime = modal.querySelector('#scheduleStartTime').value;
                const endTime = modal.querySelector('#scheduleEndTime').value;
                const notes = modal.querySelector('#scheduleNotes').value.trim();

                if (!employeeId || !date || !startTime || !endTime) {
                    showNotification('All fields required', 'warning');
                    return;
                }

                const employee = await db.get('employees', employeeId);
                const scheduleData = {
                    employeeId,
                    employeeName: employee?.name || 'Unknown',
                    date,
                    startTime,
                    endTime,
                    notes,
                    status: 'requested',
                    requestedAt: new Date().toISOString(),
                    requestedBy: window.roleManager?.activeEmployee?.name || 'Self',
                    syncStatus: 'pending'
                };

                await db.add('schedules', scheduleData);
                showNotification('Schedule request submitted', 'success');
                modal.remove();
                await this.loadSchedules();
            } catch (e) {
                console.error('Submit schedule request error:', e);
                showNotification('Failed to submit request', 'error');
            }
        };
    }

    async editShift(employeeId, date) {
        // For managers/admins: approve/deny requests or set schedules
        // For employees: view only or submit requests
        const isManager = !window.roleManager?.activeEmployee || 
                         ['manager', 'admin'].includes(window.roleManager.activeEmployee.role);
        
        if (!isManager) {
            showNotification('Only managers can edit schedules directly', 'info');
            return;
        }

        const existing = this.schedules.find(s => s.employeeId === employeeId && s.date === date);
        const employee = await db.get('employees', parseInt(employeeId));
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Edit Schedule - ${employee?.name}</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Date</label>
                        <div class="form-display">${new Date(date).toLocaleDateString()}</div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Start Time</label>
                            <input type="time" id="editStartTime" class="form-input" value="${existing?.startTime || '09:00'}">
                        </div>
                        <div class="form-group">
                            <label>End Time</label>
                            <input type="time" id="editEndTime" class="form-input" value="${existing?.endTime || '17:00'}">
                        </div>
                    </div>
                    ${existing?.status === 'requested' ? `
                        <div class="form-group">
                            <label>Action</label>
                            <div style="display:flex;gap:.5rem;">
                                <button class="btn btn-success" id="approveScheduleBtn">Approve Request</button>
                                <button class="btn btn-danger" id="denyScheduleBtn">Deny Request</button>
                            </div>
                        </div>
                    ` : ''}
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button class="btn btn-primary" id="saveScheduleBtn">Save Schedule</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Handlers
        if (existing?.status === 'requested') {
            modal.querySelector('#approveScheduleBtn').onclick = async () => {
                existing.status = 'approved';
                existing.approvedAt = new Date().toISOString();
                await db.update('schedules', existing);
                showNotification('Schedule approved', 'success');
                modal.remove();
                await this.loadSchedules();
            };
            
            modal.querySelector('#denyScheduleBtn').onclick = async () => {
                existing.status = 'denied';
                existing.deniedAt = new Date().toISOString();
                await db.update('schedules', existing);
                showNotification('Schedule denied', 'info');
                modal.remove();
                await this.loadSchedules();
            };
        }

        modal.querySelector('#saveScheduleBtn').onclick = async () => {
            try {
                const startTime = modal.querySelector('#editStartTime').value;
                const endTime = modal.querySelector('#editEndTime').value;

                if (!startTime || !endTime) {
                    showNotification('Start and end times required', 'warning');
                    return;
                }

                const scheduleData = {
                    employeeId: parseInt(employeeId),
                    employeeName: employee?.name || 'Unknown',
                    date,
                    startTime,
                    endTime,
                    status: 'approved',
                    assignedAt: new Date().toISOString(),
                    assignedBy: window.roleManager?.activeEmployee?.name || 'Manager',
                    syncStatus: 'pending'
                };

                if (existing) {
                    scheduleData.id = existing.id;
                    await db.update('schedules', scheduleData);
                } else {
                    await db.add('schedules', scheduleData);
                }

                showNotification('Schedule saved', 'success');
                modal.remove();
                await this.loadSchedules();
            } catch (e) {
                console.error('Save schedule error:', e);
                showNotification('Failed to save schedule', 'error');
            }
        };
    }
}

const schedulingManager = new SchedulingManager();
window.loadScheduling = async function() { await schedulingManager.init(); };
