// Employee Management
class EmployeeManager {
    constructor() {
        this.employees = [];
        this.editingEmployee = null;
    }

    async init() {
        await this.loadEmployees();
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (this._listenersAttached) return;
        this._listenersAttached = true;
        // Add employee button
        const addBtn = document.getElementById('addEmployeeBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                // Check if user can access employee feature
                if (window.requiresUpgrade && window.requiresUpgrade('employees')) {
                    window.showFeatureLockedMessage('employees', 'manage employees');
                    return;
                }
                
                // Check plan limits
                if (window.checkPlanLimits) {
                    window.checkPlanLimits('employees').then(limitReached => {
                        if (limitReached) {
                            window.showLimitReachedMessage('employees');
                            return;
                        }
                        this.editingEmployee = null;
                        document.getElementById('employeeModalTitle').textContent = 'Add Employee';
                        document.getElementById('employeeForm').reset();
                        openModal('employeeModal');
                    });
                } else {
                    this.editingEmployee = null;
                    document.getElementById('employeeModalTitle').textContent = 'Add Employee';
                    document.getElementById('employeeForm').reset();
                    openModal('employeeModal');
                }
            });
        }

        // Invite employee button (if present)
        const inviteBtn = document.getElementById('inviteEmployeeBtn');
        if (inviteBtn) {
            inviteBtn.addEventListener('click', () => this.showInviteModal());
        }
        const assignBtn = document.getElementById('assignRolesBtn');
        if (assignBtn) {
            assignBtn.addEventListener('click', () => this.showAssignRolesModal());
        }

        // Employee form submission with double-click protection
        const form = document.getElementById('employeeForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitBtn = e.target.querySelector('button[type="submit"]');
                if (submitBtn && submitBtn.disabled) return; // Already processing
                await this.saveEmployee();
            });
        }

        // Tabs (Roster / Attendance / Payroll)
        document.querySelectorAll('#employees .tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#employees .tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('#employees .tab-panel').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                const id = btn.getAttribute('data-tab');
                const panel = document.getElementById(id);
                if (panel) panel.classList.add('active');
                if (id === 'attendanceTab') this.loadAttendance();
            });
        });

        const savePayrollBtn = document.getElementById('savePayrollSettingsBtn');
        if (savePayrollBtn) savePayrollBtn.addEventListener('click', () => this.savePayrollSettings());
        const generatePayrollBtn = document.getElementById('generatePayrollBtn');
        if (generatePayrollBtn) generatePayrollBtn.addEventListener('click', () => this.generatePayroll());
    }

    async loadEmployees() {
        try {
            this.employees = await db.getAll('employees');
            await this.displayEmployees();
        } catch (error) {
            console.error('Failed to load employees:', error);
        }
    }

    async displayEmployees() {
        const grid = document.getElementById('employeesGrid');
        if (!grid) return;

        if (this.employees.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                    <i class="fas fa-users" style="font-size: 3rem; color: var(--gray-light); margin-bottom: 1rem;"></i>
                    <p>No employees found. Click "Add Employee" to create one.</p>
                    <button id="inviteEmployeeBtn" class="btn btn-primary" style="margin-top:1rem">Invite Employee</button>
                </div>
            `;
            // Attach invite handler if empty state
            const btn = document.getElementById('inviteEmployeeBtn');
            if (btn) btn.addEventListener('click', () => this.showInviteModal());
            return;
        }

        // Calculate commissions and hours for each employee
        const sessions = await db.getAll('sessions');
        const employeesWithStats = await Promise.all(this.employees.map(async (emp) => {
            const transactions = await db.getByIndex('transactions', 'employeeId', emp.id.toString());
            const totalSales = transactions.reduce((sum, t) => sum + t.total, 0);
            const totalCommission = totalSales * (emp.commissionRate / 100);
            const transactionCount = transactions.length;

            const mySessions = sessions.filter(s => s.employeeId === String(emp.id) && s.status === 'completed');
            const hours = mySessions.reduce((sum, s) => {
                if (!s.startTime || !s.endTime) return sum;
                return sum + (new Date(s.endTime) - new Date(s.startTime)) / 3600000;
            }, 0);

            return { ...emp, totalSales, totalCommission, transactionCount, hoursWorked: Math.round(hours * 100) / 100 };
        }));

        grid.innerHTML = employeesWithStats.map(emp => `
            <div class="employee-card">
                <div class="employee-header">
                    <div class="employee-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="employee-info">
                        <h3>${emp.name}</h3>
                        <p>${emp.position}</p>
                    </div>
                </div>
                <div class="employee-details" style="margin: 1rem 0;">
                    ${emp.email ? `<p><i class="fas fa-envelope"></i> ${emp.email}</p>` : ''}
                    ${emp.phone ? `<p><i class="fas fa-phone"></i> ${emp.phone}</p>` : ''}
                    ${emp.hireDate ? `<p><i class="fas fa-calendar"></i> Hired: ${app.formatDate(emp.hireDate)}</p>` : ''}
                    ${emp.commissionRate ? `<p><i class="fas fa-percentage"></i> Commission: ${emp.commissionRate}%</p>` : ''}
                </div>
                <div class="employee-stats">
                    <div class="employee-stat">
                        <div class="employee-stat-label">Total Sales</div>
                        <div class="employee-stat-value">${app.formatCurrency(emp.totalSales)}</div>
                    </div>
                    <div class="employee-stat">
                        <div class="employee-stat-label">Commission</div>
                        <div class="employee-stat-value">${app.formatCurrency(emp.totalCommission)}</div>
                    </div>
                    <div class="employee-stat">
                        <div class="employee-stat-label">Transactions</div>
                        <div class="employee-stat-value">${emp.transactionCount}</div>
                    </div>
                    <div class="employee-stat">
                        <div class="employee-stat-label">Avg Sale</div>
                        <div class="employee-stat-value">
                            ${emp.transactionCount > 0 ? 
                                app.formatCurrency(emp.totalSales / emp.transactionCount) : 
                                app.formatCurrency(0)
                            }
                        </div>
                    </div>
                    <div class="employee-stat">
                        <div class="employee-stat-label">Hours</div>
                        <div class="employee-stat-value">${emp.hoursWorked || 0}</div>
                    </div>
                </div>
                <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                    <button class="btn btn-secondary" onclick="employeeManager.editEmployee(${emp.id})" style="flex: 1;">
                        <i class="fas a-edit"></i> Edit
                    </button>
                    <button class="btn btn-danger" onclick="employeeManager.deleteEmployee(${emp.id})" style="flex: 1;">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    async editEmployee(id) {
        try {
            const employee = await db.get('employees', id);
            if (!employee) return;

            this.editingEmployee = employee;
            document.getElementById('employeeModalTitle').textContent = 'Edit Employee';
            
            // Fill form
            document.getElementById('employeeName').value = employee.name;
            document.getElementById('employeePosition').value = employee.position;
            document.getElementById('employeeEmail').value = employee.email || '';
            document.getElementById('employeePhone').value = employee.phone || '';
            document.getElementById('employeeCommission').value = employee.commissionRate || '';
            document.getElementById('employeeHireDate').value = employee.hireDate || '';

            openModal('employeeModal');
        } catch (error) {
            console.error('Failed to edit employee:', error);
        }
    }

    async deleteEmployee(id) {
        if (!confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
            return;
        }

        try {
            await db.delete('employees', id);
            showNotification('Employee deleted successfully', 'success');
            await this.loadEmployees();
        } catch (error) {
            console.error('Failed to delete employee:', error);
            showNotification('Failed to delete employee', 'error');
        }
    }

    async saveEmployee() {
        // Prevent duplicate submissions
        if (this.isSaving) {
            return;
        }
        this.isSaving = true;

        // Show loading
        const saveBtn = document.querySelector('#employeeForm button[type="submit"]');
        const originalText = saveBtn.innerHTML;
        saveBtn.classList.add('loading');
        saveBtn.disabled = true;
        
        showLoading('Saving Employee...');
        
        try {
            const employeeData = {
                name: document.getElementById('employeeName').value,
                position: document.getElementById('employeePosition').value,
                email: document.getElementById('employeeEmail').value,
                phone: document.getElementById('employeePhone').value,
                commissionRate: parseFloat(document.getElementById('employeeCommission').value || '0') || 0,
                hireDate: document.getElementById('employeeHireDate').value,
                syncStatus: 'pending',
                modifiedAt: new Date().toISOString()
            };

            if (this.editingEmployee) {
                // Update existing employee
                employeeData.id = this.editingEmployee.id;
                employeeData.createdAt = this.editingEmployee.createdAt;
                await db.update('employees', employeeData);
                
                hideLoading();
                saveBtn.classList.remove('loading');
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
                
                closeModal('employeeModal');
                showNotification('Employee updated successfully', 'success');
            } else {
                // Add new employee
                employeeData.createdAt = new Date().toISOString();
                await db.add('employees', employeeData);
                
                hideLoading();
                saveBtn.classList.remove('loading');
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
                
                closeModal('employeeModal');
                showNotification('Employee added successfully', 'success');
            }

            await this.loadEmployees();
        } catch (error) {
            console.error('Failed to save employee:', error);
            hideLoading();
            saveBtn.classList.remove('loading');
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
            showNotification('Failed to save employee', 'error');
        } finally {
            // Always reset the saving flag
            this.isSaving = false;
        }
    }

    // Attendance & Payroll helpers
    async loadAttendance() {
        const tbody = document.getElementById('attendanceTableBody');
        const dateLabel = document.getElementById('attendanceDate');
        if (dateLabel) dateLabel.textContent = new Date().toDateString();
        if (!tbody) return;
        const attendance = await db.getAll('attendance');
        const today = new Date().toDateString();
        const todayRows = attendance.filter(a => new Date(a.date).toDateString() === today);
        const byEmp = new Map();
        todayRows.forEach(a => { byEmp.set(a.employeeId, a); });
        const rows = await Promise.all(this.employees.map(async emp => {
            const rec = byEmp.get(emp.id) || {};
            const timeIn = rec.timeIn ? new Date(rec.timeIn).toLocaleTimeString() : '-';
            const timeOut = rec.timeOut ? new Date(rec.timeOut).toLocaleTimeString() : '-';
            let otLabel = '-';
            if (rec.otRequested && !rec.otApproved) otLabel = 'Pending';
            if (rec.otApproved) otLabel = `Approved${rec.otHours ? ' ' + rec.otHours + 'h' : ''}`;
            const actions = `
                <button class="btn btn-secondary" onclick="employeeManager.timeIn(${emp.id})">Time In</button>
                <button class="btn btn-secondary" onclick="employeeManager.timeOut(${emp.id})">Time Out</button>
                ${!rec.otRequested ? `<button class=\"btn btn-primary\" onclick=\"employeeManager.requestOT(${emp.id})\">Request OT</button>` : rec.otApproved ? '' : `<button class=\"btn btn-primary\" onclick=\"employeeManager.approveOT(${emp.id})\">Approve OT</button> <button class=\"btn btn-danger\" onclick=\"employeeManager.rejectOT(${emp.id})\">Reject</button>`}
            `;
            return `
                <tr>
                    <td>${emp.name}</td>
                    <td>${timeIn}</td>
                    <td>${timeOut}</td>
                    <td>${otLabel}</td>
                    <td>${actions}</td>
                </tr>`;
        }));
        tbody.innerHTML = rows.join('');
    }

    async timeIn(employeeId) {
        const today = new Date();
        const records = await db.getAll('attendance');
        const existing = records.find(r => r.employeeId === employeeId && new Date(r.date).toDateString() === today.toDateString());
        if (existing && existing.timeIn) { showNotification('Already timed in', 'warning'); return; }
        const record = existing || { employeeId, date: today.toISOString() };
        record.timeIn = today.toISOString();
        await db[existing ? 'update' : 'add']('attendance', record);
        showNotification('Time in recorded', 'success');
        await this.loadAttendance();
    }

    async timeOut(employeeId) {
        const now = new Date();
        const records = await db.getAll('attendance');
        const existing = records.find(r => r.employeeId === employeeId && new Date(r.date).toDateString() === now.toDateString());
        if (!existing || !existing.timeIn) { showNotification('No time-in record found', 'warning'); return; }
        existing.timeOut = now.toISOString();
        await db.update('attendance', existing);
        showNotification('Time out recorded', 'success');
        await this.loadAttendance();
    }

    async requestOT(employeeId) {
        const records = await db.getAll('attendance');
        const today = new Date();
        const existing = records.find(r => r.employeeId === employeeId && new Date(r.date).toDateString() === today.toDateString());
        if (!existing) { showNotification('No attendance record found', 'warning'); return; }
        existing.otRequested = true;
        existing.otApproved = false;
        await db.update('attendance', existing);
        showNotification('OT request submitted', 'info');
        await this.loadAttendance();
    }

    async approveOT(employeeId) {
        const records = await db.getAll('attendance');
        const today = new Date();
        const existing = records.find(r => r.employeeId === employeeId && new Date(r.date).toDateString() === today.toDateString());
        if (!existing) { showNotification('No attendance record found', 'warning'); return; }
        const hoursStr = await app.prompt({ title: 'Approve OT', label: 'Overtime hours', inputType: 'number', value: '1', hint: 'Enter decimal hours, e.g., 1.5' });
        if (hoursStr === null) return;
        const hours = parseFloat(hoursStr);
        if (isNaN(hours) || hours < 0) { showNotification('Invalid hours', 'error'); return; }
        existing.otRequested = true;
        existing.otApproved = true;
        existing.otHours = hours;
        existing.otApprovedAt = new Date().toISOString();
        await db.update('attendance', existing);
        showNotification('OT approved', 'success');
        await this.loadAttendance();
    }

    async rejectOT(employeeId) {
        const records = await db.getAll('attendance');
        const today = new Date();
        const existing = records.find(r => r.employeeId === employeeId && new Date(r.date).toDateString() === today.toDateString());
        if (!existing) { showNotification('No attendance record found', 'warning'); return; }
        const ok = await app.confirm('Reject OT', 'Reject this OT request?');
        if (!ok) return;
        existing.otRequested = false;
        existing.otApproved = false;
        existing.otHours = 0;
        await db.update('attendance', existing);
        showNotification('OT rejected', 'info');
        await this.loadAttendance();
    }

    async savePayrollSettings() {
        const settings = await db.get('settings', 'payrollSettings');
        const current = settings?.value || {};
        const updated = {
            ...current,
            otRatePercent: parseFloat(document.getElementById('otRatePercent')?.value || current.otRatePercent || 25),
            nightDiffPercent: parseFloat(document.getElementById('nightDiffPercent')?.value || current.nightDiffPercent || 10),
            thirteenthMonthPeriod: document.getElementById('thirteenthMonthPeriod')?.value || current.thirteenthMonthPeriod || ''
        };
        await db.update('settings', { key: 'payrollSettings', value: updated });
        showNotification('Payroll settings saved', 'success');
    }

    async generatePayroll() {
        const startInput = document.getElementById('payrollStart');
        const endInput = document.getElementById('payrollEnd');
        if (!startInput || !endInput) return;
        const start = new Date(startInput.value);
        const end = new Date(endInput.value);
        if (isNaN(start) || isNaN(end)) { showNotification('Select a valid period', 'warning'); return; }
        const tbody = document.getElementById('payrollTableBody');
        const settings = (await db.get('settings', 'payrollSettings'))?.value || { otRatePercent: 25, nightDiffPercent: 10 };
        const sessions = await db.getAll('sessions');
        const tips = await db.getAll('tips');
        const attendance = await db.getAll('attendance');
        const rows = await Promise.all(this.employees.map(async (emp) => {
            const empSessions = sessions.filter(s => s.employeeId === String(emp.id) && s.status === 'completed');
            const hours = empSessions.reduce((sum, s) => {
                const st = new Date(s.startTime); const et = new Date(s.endTime || s.startTime);
                if (st >= start && et <= end) return sum + (et - st) / 3600000; else return sum;
            }, 0);

            // Approved OT hours within period
            const empAttendance = attendance.filter(a => a.employeeId === emp.id && a.otApproved);
            const otHours = empAttendance.reduce((sum, a) => {
                const d = new Date(a.date);
                if (d >= start && d <= end) return sum + (parseFloat(a.otHours || 0)); else return sum;
            }, 0);

            // Base pay
            const type = emp.employmentType || 'daily';
            const dailyRate = parseFloat(emp.dailyRate || 0);
            const monthlySalary = parseFloat(emp.monthlySalary || 0);
            const base = type === 'salary' ? (monthlySalary / 2) : (dailyRate * Math.ceil(hours / 8));
            const hourlyRate = type === 'salary' ? (monthlySalary / (22 * 8)) : (dailyRate / 8);
            const otPay = otHours * hourlyRate * (settings.otRatePercent / 100);
            const nightPay = 0; const holidayPay = 0;
            const empTips = tips.filter(t => t.employeeId === String(emp.id) && new Date(t.date) >= start && new Date(t.date) <= end).reduce((s,t)=>s+(t.amount||0),0);
            const deductions = 0;
            const total = base + otPay + nightPay + holidayPay + empTips - deductions;
            return `
                <tr>
                    <td>${emp.name}</td>
                    <td>${type}</td>
                    <td>${hours.toFixed(2)}</td>
                    <td>${app.formatCurrency(base)}</td>
                    <td>${app.formatCurrency(otPay)} (${otHours.toFixed(2)}h)</td>
                    <td>${app.formatCurrency(nightPay)}</td>
                    <td>${app.formatCurrency(holidayPay)}</td>
                    <td>${app.formatCurrency(empTips)}</td>
                    <td>${app.formatCurrency(deductions)}</td>
                    <td>${app.formatCurrency(total)}</td>
                </tr>`;
        }));
        if (tbody) tbody.innerHTML = rows.join('');
        showNotification('Payroll generated (preview)', 'info');
    }

    // Invite employee via marketing API
    async inviteEmployee(email, name, role) {
        try {
            const token = localStorage.getItem('userToken') || localStorage.getItem('authToken');
            if (!token) { showNotification('Login first', 'warning'); return null; }
            const marketingApi = 'https://ava-marketing-api.onrender.com';
            const res = await fetch(`${marketingApi}/api/employees/invite`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, name, role })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Invite failed');
            showNotification(`Invited ${name || email}. Temp password: ${data.tempPassword}`, 'success');
            return data.tempPassword || null;
        } catch (e) {
            console.error('Invite employee error:', e);
            showNotification(e.message || 'Invite failed', 'error');
            return null;
        }
    }

    showInviteModal() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Invite Employee</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <label>Email<input id="inviteEmail" class="form-input" type="email" required></label>
                    <label>Name<input id="inviteName" class="form-input" type="text"></label>
                    <label>Role<select id="inviteRole" class="form-input">
                        <option value="employee">Employee</option>
                        <option value="receptionist">Receptionist</option>
                        <option value="therapist">Therapist</option>
                        <option value="manager">Manager</option>
                    </select></label>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button class="btn btn-primary" id="confirmInviteBtn">Invite</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        modal.querySelector('#confirmInviteBtn').onclick = async () => {
            const email = modal.querySelector('#inviteEmail').value.trim();
            const name = modal.querySelector('#inviteName').value.trim();
            const role = modal.querySelector('#inviteRole').value;
            if (!email) { showNotification('Email required', 'warning'); return; }
            await this.inviteEmployee(email, name, role);
            modal.remove();
            this.loadInvitedEmployees();
        };
    }

    async loadInvitedEmployees() {
        try {
            const token = localStorage.getItem('userToken') || localStorage.getItem('authToken');
            if (!token) return;
            const marketingApi = 'https://ava-marketing-api.onrender.com';
            const res = await fetch(`${marketingApi}/api/employees`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            const container = document.getElementById('invitedEmployeesContainer');
            if (!container) return;
            if (!res.ok) {
                container.innerHTML = '<div class="subtle">Failed to load invited employees</div>';
                return;
            }
            const rows = (data.data||[]).map(u => `
                <tr>
                    <td>${u.employeeName || ''}</td>
                    <td>${u.email || ''}</td>
                    <td>
                        <select class="form-input role-select" data-userid="${u.id}">
                            ${['employee','receptionist','therapist','manager'].map(r => `<option value="${r}" ${u.role===r?'selected':''}>${r}</option>`).join('')}
                        </select>
                    </td>
                    <td>
                        <button class="btn btn-secondary btn-sm show-pw" data-userid="${u.id}">Show PW</button>
                        <button class="btn btn-secondary btn-sm reset-pw" data-userid="${u.id}">Reset PW</button>
                        <div class="pw-reveal" id="pw_${u.id}" style="display:none; margin-top:6px;">
                            <input type="text" readonly class="form-input" style="max-width:220px;" value="">
                        </div>
                    </td>
                </tr>`).join('');
            container.innerHTML = `
                <div class="table-responsive">
                    <table class="data-table">
                        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
                        <tbody>${rows || '<tr><td colspan="4">No invited employees</td></tr>'}</tbody>
                    </table>
                </div>`;
            // Bind events
            container.querySelectorAll('.role-select').forEach(sel => {
                sel.addEventListener('change', async () => {
                    const userId = sel.getAttribute('data-userid');
                    const role = sel.value;
                    await this.updateEmployeeRole(userId, role);
                });
            });
            container.querySelectorAll('.reset-pw').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const userId = btn.getAttribute('data-userid');
                    const temp = await this.resetEmployeePassword(userId);
                    if (temp) {
                        const box = document.getElementById('pw_'+userId);
                        if (box) { box.style.display = 'block'; box.querySelector('input').value = temp; }
                    }
                });
            });
            container.querySelectorAll('.show-pw').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const userId = btn.getAttribute('data-userid');
                    // Confirm as this will generate a new temp password
                    const proceed = await window.app?.confirm('Generate Temporary Password','This will generate a new temporary password and invalidate previous ones. Continue?')
                        .catch(()=>false);
                    if (!proceed) return;
                    const temp = await this.resetEmployeePassword(userId);
                    if (temp) {
                        const box = document.getElementById('pw_'+userId);
                        if (box) { box.style.display = 'block'; box.querySelector('input').value = temp; }
                    }
                });
            });
        } catch (e) {
            console.warn('Invited employees load error:', e.message);
        }
    }

    async updateEmployeeRole(userId, role) {
        try {
            const token = localStorage.getItem('userToken') || localStorage.getItem('authToken');
            if (!token) { showNotification('Login first', 'warning'); return; }
            const marketingApi = 'https://ava-marketing-api.onrender.com';
            const res = await fetch(`${marketingApi}/api/employees/${userId}/role`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ role })
            });
            const data = await res.json().catch(()=>({}));
            if (!res.ok) throw new Error(data.error || 'Failed to update role');
            showNotification('Role updated', 'success');
        } catch (e) {
            showNotification(e.message || 'Failed to update role', 'error');
        }
    }

    async resetEmployeePassword(userId, email) {
        try {
            const token = localStorage.getItem('userToken') || localStorage.getItem('authToken');
            if (!token) { showNotification('Login first', 'warning'); return null; }
            const marketingApi = 'https://ava-marketing-api.onrender.com';
            const res = await fetch(`${marketingApi}/api/employees/reset-password`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, email })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to reset password');
            showNotification('Temporary password generated', 'success');
            return data.tempPassword;
        } catch (e) {
            showNotification(e.message || 'Failed to reset password', 'error');
            return null;
        }
    }

    async showAssignRolesModal() {
        try {
            // Build UI listing existing local employees to map roles
            const employees = await db.getAll('employees');
            const modal = document.createElement('div');
            modal.className = 'modal active';
            const rows = employees.map(emp => `
                <tr>
                    <td>${emp.name}</td>
                    <td>${emp.email || ''}</td>
                    <td>
                        <select class="form-input role-select-local" data-email="${emp.email || ''}" data-name="${emp.name}">
                            ${['employee','receptionist','therapist','manager'].map(r => `<option value="${r}">${r}</option>`).join('')}
                        </select>
                    </td>
                </tr>
            `).join('');
            modal.innerHTML = `
                <div class="modal-content" style="max-width:720px;">
                    <div class="modal-header">
                        <h2>Assign Employee Roles</h2>
                        <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="table-responsive">
                            <table class="data-table">
                                <thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead>
                                <tbody>${rows || '<tr><td colspan="3">No employees found. Add an employee first.</td></tr>'}</tbody>
                            </table>
                        </div>
                        <small class="subtle">Selecting a role will create/update the employee account and set their role.</small>
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Done</button>
                    </div>
                </div>`;
            document.body.appendChild(modal);

            // Hook change events
            modal.querySelectorAll('.role-select-local').forEach(sel => {
                sel.addEventListener('change', async () => {
                    const email = sel.getAttribute('data-email');
                    const name = sel.getAttribute('data-name');
                    const role = sel.value;
                    // If the marketing account doesn't exist, invite it; then update role
                    await this.inviteEmployee(email, name, role);
                    // load invites and try to find the user to set role
                    await this.loadInvitedEmployees();
                    showNotification(`Assigned ${role} to ${name}`, 'success');
                });
            });
        } catch (e) {
            console.error('Assign roles modal error:', e);
            showNotification('Failed to open Assign Roles', 'error');
        }
    }
}

// Initialize employee manager
const employeeManager = new EmployeeManager();

// Load employees when page is shown
window.loadEmployees = async function() {
    await employeeManager.init();
};

// Employee Rotation Manager - priority by time-in ranking
class EmployeeRotationManager {
	constructor() {
		this.queue = []; // [{employeeId, timeInISO}]
		this.lastBuiltAt = null;
	}

	async rebuildQueueForToday() {
		const today = new Date().toDateString();
		const attendance = await db.getAll('attendance');
		const todays = attendance
			.filter(a => new Date(a.date).toDateString() === today && a.timeIn && !a.timeOut)
			.map(a => ({ employeeId: a.employeeId, timeInISO: a.timeIn }));
		// sort by earliest time-in first
		todays.sort((a,b) => new Date(a.timeInISO) - new Date(b.timeInISO));
		this.queue = todays;
		this.lastBuiltAt = new Date().toISOString();
		console.log('Rotation queue rebuilt:', this.queue);
	}

	async onEmployeeTimeIn(employeeId) {
		// insert in queue at appropriate position
		const nowISO = new Date().toISOString();
		this.queue.push({ employeeId, timeInISO: nowISO });
		this.queue.sort((a,b) => new Date(a.timeInISO) - new Date(b.timeInISO));
	}

	async onEmployeeTimeOut(employeeId) {
		this.queue = this.queue.filter(e => e.employeeId !== employeeId);
	}

	getQueue() {
		return this.queue.slice();
	}

	// Assign next available therapist; optionally reserve for bookingId
	async assignNext({ bookingId = null } = {}) {
		if (this.queue.length === 0) return null;
		const next = this.queue.shift();
		// push to back of queue (round-robin)
		this.queue.push(next);
		// record assignment
		try {
			await db.add('rotationAssignments', {
				date: new Date().toISOString(),
				employeeId: next.employeeId,
				bookingId: bookingId || null
			});
		} catch (_) {}
		return next.employeeId;
	}
}

// create a global instance
window.rotationManager = new EmployeeRotationManager();

// Hook rotation with existing attendance flows if present
if (typeof window.addEventListener === 'function') {
	// Rebuild on load
	window.addEventListener('load', () => {
		setTimeout(() => {
			window.rotationManager.rebuildQueueForToday();
		}, 200);
	});
}

// Expose helper API for bookings/POS to use rotation
window.assignTherapistByRotation = async function(opts = {}) {
	if (!window.rotationManager) return null;
	return await window.rotationManager.assignNext(opts);
};
