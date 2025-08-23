// Employee Management
import { logError, logInfo } from './utils/logger-helper.js';
import { showSuccess, showError } from './utils/notification-manager.js';

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
    }

    async loadEmployees() {
        try {
            this.employees = await db.getAll('employees');
            await this.displayEmployees();
        } catch (error) {
            if (window.logger) {
                window.logger.error('Failed to load employees', {
                    category: 'EMPLOYEES',
                    operation: 'load_employees',
                    error: error
                });
            } else {
                console.error('Failed to load employees:', error);
            }
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
                </div>
            `;
            return;
        }

        // Calculate commissions for each employee
        const employeesWithStats = await Promise.all(this.employees.map(async (emp) => {
            const transactions = await db.getByIndex('transactions', 'employeeId', emp.id.toString());
            const totalSales = transactions.reduce((sum, t) => sum + t.total, 0);
            const totalCommission = totalSales * (emp.commissionRate / 100);
            const transactionCount = transactions.length;
            
            return { ...emp, totalSales, totalCommission, transactionCount };
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
                </div>
                <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                    <button class="btn btn-secondary" onclick="employeeManager.editEmployee(${emp.id})" style="flex: 1;">
                        <i class="fas fa-edit"></i> Edit
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
            if (window.logger) {
                window.logger.error('Failed to edit employee', {
                    category: 'EMPLOYEES',
                    operation: 'edit_employee',
                    error: error
                });
            } else {
                console.error('Failed to edit employee:', error);
            }
        }
    }

    async deleteEmployee(id) {
        if (!confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
            return;
        }

        try {
            await db.delete('employees', id);
            showSuccess('Employee deleted successfully', 'success');
            await this.loadEmployees();
        } catch (error) {
            if (window.logger) {
                window.logger.error('Failed to delete employee', {
                    category: 'EMPLOYEES',
                    operation: 'delete_employee',
                    error: error
                });
            } else {
                console.error('Failed to delete employee:', error);
            }
            showSuccess('Failed to delete employee', 'error');
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
                showSuccess('Employee updated successfully', 'success');
            } else {
                // Add new employee
                employeeData.createdAt = new Date().toISOString();
                await db.add('employees', employeeData);
                
                hideLoading();
                saveBtn.classList.remove('loading');
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
                
                closeModal('employeeModal');
                showSuccess('Employee added successfully', 'success');
            }

            await this.loadEmployees();

            // Reload POS if it's the current page to update employee dropdown
            if (window.app.currentPage === 'pos') {
                window.loadPOS && window.loadPOS();
            }
        } catch (error) {
            if (window.logger) {
                window.logger.error('Failed to save employee', {
                    category: 'EMPLOYEES',
                    operation: 'save_employee',
                    error: error
                });
            } else {
                console.error('Failed to save employee:', error);
            }
            hideLoading();
            saveBtn.classList.remove('loading');
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
            showSuccess('Failed to save employee', 'error');
        } finally {
            // Always reset the saving flag
            this.isSaving = false;
        }
    }

    // Generate commission report
    async generateCommissionReport() {
        const startDate = prompt('Enter start date (YYYY-MM-DD):');
        const endDate = prompt('Enter end date (YYYY-MM-DD):');
        
        if (!startDate || !endDate) return;

        const report = [];
        
        for (const emp of this.employees) {
            const transactions = await db.getByIndex('transactions', 'employeeId', emp.id.toString());
            const filteredTransactions = transactions.filter(t => {
                const date = new Date(t.date);
                return date >= new Date(startDate) && date <= new Date(endDate);
            });
            
            const totalSales = filteredTransactions.reduce((sum, t) => sum + t.total, 0);
            const commission = totalSales * (emp.commissionRate / 100);
            
            report.push({
                employee: emp.name,
                position: emp.position,
                totalSales,
                commissionRate: emp.commissionRate,
                commission,
                transactionCount: filteredTransactions.length
            });
        }

        // Create CSV
        const headers = ['Employee', 'Position', 'Total Sales', 'Commission Rate', 'Commission', 'Transactions'];
        const rows = report.map(r => [
            r.employee,
            r.position,
            r.totalSales.toFixed(2),
            r.commissionRate + '%',
            r.commission.toFixed(2),
            r.transactionCount
        ]);

        let csv = headers.join(',') + '\n';
        rows.forEach(row => {
            csv += row.map(field => `"${field}"`).join(',') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `commission_report_${startDate}_to_${endDate}.csv`;
        a.click();
    }
}

// Initialize employee manager
const employeeManager = new EmployeeManager();

// Load employees when page is shown
window.loadEmployees = async function() {
    await employeeManager.init();
};
