// Payroll Requests Management
class PayrollRequestsManager {
    constructor() {
        this.requests = [];
    }

    async init() {
        await this.loadRequests();
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (this._listenersAttached) return;
        this._listenersAttached = true;
        
        const addBtn = document.getElementById('addPayrollRequestBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showRequestModal());
        }
    }

    async loadRequests() {
        try {
            this.requests = await db.getAll('payrollRequests');
            this.renderRequestsTable();
        } catch (error) {
            console.error('Failed to load payroll requests:', error);
        }
    }

    renderRequestsTable() {
        const tbody = document.getElementById('payrollRequestsTableBody');
        if (!tbody) return;

        if (this.requests.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1rem;">No requests yet</td></tr>';
            return;
        }

        tbody.innerHTML = this.requests
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map(req => `
                <tr>
                    <td>${app.formatDate(req.date)}</td>
                    <td>${req.employeeName || 'Unknown'}</td>
                    <td>${this.getTypeName(req.type)}</td>
                    <td>
                        ${req.type === 'cash_advance' ? app.formatCurrency(req.amount) : req.details || '-'}
                    </td>
                    <td>
                        <span class="badge badge-${req.status === 'approved' ? 'success' : req.status === 'denied' ? 'danger' : 'warning'}">
                            ${req.status}
                        </span>
                    </td>
                    <td>
                        ${req.status === 'submitted' ? `
                            <button class="btn-icon" onclick="payrollRequestsManager.approveRequest(${req.id})" title="Approve">
                                <i class="fas fa-check" style="color:var(--success-color);"></i>
                            </button>
                            <button class="btn-icon" onclick="payrollRequestsManager.denyRequest(${req.id})" title="Deny">
                                <i class="fas fa-times" style="color:var(--danger-color);"></i>
                            </button>
                        ` : ''}
                        <button class="btn-icon" onclick="payrollRequestsManager.viewRequest(${req.id})" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
    }

    getTypeName(type) {
        const types = {
            'cash_advance': 'Cash Advance',
            'leave': 'Leave Request',
            'other': 'Other'
        };
        return types[type] || type;
    }

    showRequestModal() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>New Payroll Request</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Request Type</label>
                        <select id="requestType" class="form-input" required>
                            <option value="cash_advance">Cash Advance</option>
                            <option value="leave">Leave Request</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div class="form-group" id="amountGroup">
                        <label>Amount</label>
                        <input type="number" id="requestAmount" class="form-input" min="0" step="0.01">
                    </div>
                    <div class="form-group" id="detailsGroup">
                        <label>Details/Reason</label>
                        <textarea id="requestDetails" class="form-input" rows="3" placeholder="Provide details about your request"></textarea>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button class="btn btn-primary" id="submitRequestBtn">Submit Request</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Dynamic fields based on type
        const typeSelect = modal.querySelector('#requestType');
        const amountGroup = modal.querySelector('#amountGroup');
        const detailsGroup = modal.querySelector('#detailsGroup');
        
        const updateFields = () => {
            const type = typeSelect.value;
            amountGroup.style.display = type === 'cash_advance' ? 'block' : 'none';
            detailsGroup.style.display = type === 'leave' || type === 'other' ? 'block' : 'none';
        };
        
        typeSelect.addEventListener('change', updateFields);
        updateFields();

        // Submit handler
        modal.querySelector('#submitRequestBtn').onclick = async () => {
            try {
                const type = typeSelect.value;
                const amount = parseFloat(modal.querySelector('#requestAmount').value || '0');
                const details = modal.querySelector('#requestDetails').value.trim();

                if (type === 'cash_advance' && amount <= 0) {
                    showNotification('Valid amount required for cash advance', 'warning');
                    return;
                }

                if ((type === 'leave' || type === 'other') && !details) {
                    showNotification('Details required for this request type', 'warning');
                    return;
                }

                const requestData = {
                    type,
                    amount: type === 'cash_advance' ? amount : null,
                    details: details || null,
                    date: new Date().toISOString(),
                    employeeId: window.roleManager?.activeEmployee?.id || null,
                    employeeName: window.roleManager?.activeEmployee?.name || 'Unknown',
                    status: 'submitted',
                    syncStatus: 'pending'
                };

                await db.add('payrollRequests', requestData);
                showNotification('Request submitted for approval', 'success');
                modal.remove();
                await this.loadRequests();
            } catch (e) {
                console.error('Submit request error:', e);
                showNotification('Failed to submit request', 'error');
            }
        };
    }

    async approveRequest(id) {
        const req = await db.get('payrollRequests', id);
        if (!req) return;
        
        req.status = 'approved';
        req.approvedAt = new Date().toISOString();
        req.approvedBy = window.roleManager?.activeEmployee?.name || 'Manager';
        await db.update('payrollRequests', req);
        
        showNotification('Request approved', 'success');
        await this.loadRequests();
    }

    async denyRequest(id) {
        const req = await db.get('payrollRequests', id);
        if (!req) return;
        
        const reason = prompt('Reason for denial (optional):');
        req.status = 'denied';
        req.deniedAt = new Date().toISOString();
        req.deniedBy = window.roleManager?.activeEmployee?.name || 'Manager';
        req.denialReason = reason || null;
        await db.update('payrollRequests', req);
        
        showNotification('Request denied', 'info');
        await this.loadRequests();
    }

    async viewRequest(id) {
        const req = await db.get('payrollRequests', id);
        if (!req) return;

        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Request Details</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Employee</label>
                        <div class="form-display">${req.employeeName}</div>
                    </div>
                    <div class="form-group">
                        <label>Type</label>
                        <div class="form-display">${this.getTypeName(req.type)}</div>
                    </div>
                    ${req.amount ? `
                        <div class="form-group">
                            <label>Amount</label>
                            <div class="form-display">${app.formatCurrency(req.amount)}</div>
                        </div>
                    ` : ''}
                    ${req.details ? `
                        <div class="form-group">
                            <label>Details</label>
                            <div class="form-display">${req.details}</div>
                        </div>
                    ` : ''}
                    <div class="form-group">
                        <label>Status</label>
                        <div class="form-display">
                            <span class="badge badge-${req.status === 'approved' ? 'success' : req.status === 'denied' ? 'danger' : 'warning'}">
                                ${req.status}
                            </span>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Submitted</label>
                        <div class="form-display">${new Date(req.date).toLocaleString()}</div>
                    </div>
                    ${req.approvedAt ? `
                        <div class="form-group">
                            <label>Approved</label>
                            <div class="form-display">${new Date(req.approvedAt).toLocaleString()} by ${req.approvedBy}</div>
                        </div>
                    ` : ''}
                    ${req.deniedAt ? `
                        <div class="form-group">
                            <label>Denied</label>
                            <div class="form-display">${new Date(req.deniedAt).toLocaleString()} by ${req.deniedBy}</div>
                        </div>
                    ` : ''}
                    ${req.denialReason ? `
                        <div class="form-group">
                            <label>Denial Reason</label>
                            <div class="form-display">${req.denialReason}</div>
                        </div>
                    ` : ''}
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
}

const payrollRequestsManager = new PayrollRequestsManager();
window.loadPayrollRequests = async function() { await payrollRequestsManager.init(); };
