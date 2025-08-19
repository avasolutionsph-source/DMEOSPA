// Therapist Payroll Breakdown View
class TherapistPayrollManager {
    constructor() {
        this.transactions = [];
        this.tips = [];
    }

    async init() {
        if (window.roleManager?.activeEmployee?.role !== 'therapist') return;
        await this.loadTherapistData();
        this.setupEventListeners();
        this.renderPayrollBreakdown();
    }

    setupEventListeners() {
        if (this._listenersAttached) return;
        this._listenersAttached = true;
        
        // Add tip buttons to transactions
        document.addEventListener('click', (e) => {
            if (e.target.closest('.add-tip-btn')) {
                const transactionId = e.target.closest('.add-tip-btn').dataset.transactionId;
                this.showTipModal(parseInt(transactionId));
            }
        });
    }

    async loadTherapistData() {
        if (!window.roleManager?.activeEmployee) return;
        
        const therapistId = window.roleManager.activeEmployee.id;
        try {
            // Load transactions for this therapist
            this.transactions = await db.getByIndex('transactions', 'employeeId', String(therapistId));
            
            // Load tips for this therapist
            this.tips = await db.getByIndex('tips', 'employeeId', String(therapistId));
        } catch (error) {
            console.error('Failed to load therapist data:', error);
        }
    }

    async renderPayrollBreakdown() {
        const container = document.getElementById('therapistPayrollContainer');
        if (!container) return;

        if (!window.roleManager?.activeEmployee || window.roleManager.activeEmployee.role !== 'therapist') {
            container.innerHTML = '<div class="subtle">Payroll breakdown only available for therapists</div>';
            return;
        }

        const therapistId = window.roleManager.activeEmployee.id;
        const employee = await db.get('employees', parseInt(therapistId));
        if (!employee) {
            container.innerHTML = '<div class="subtle">Employee record not found</div>';
            return;
        }

        // Calculate totals
        const totalSales = this.transactions.reduce((sum, t) => sum + (t.total || 0), 0);
        const commissionRate = employee.commissionRate || 0;
        const totalCommission = totalSales * (commissionRate / 100);
        const totalTips = this.tips.reduce((sum, t) => sum + (t.amount || 0), 0);
        const totalEarnings = totalCommission + totalTips;

        // Group transactions by date
        const transactionsByDate = this.transactions.reduce((groups, t) => {
            const date = new Date(t.date).toDateString();
            if (!groups[date]) groups[date] = [];
            groups[date].push(t);
            return groups;
        }, {});

        container.innerHTML = `
            <div class="payroll-summary">
                <h3>Payroll Summary - ${employee.name}</h3>
                <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);gap:1rem;margin:1rem 0;">
                    <div class="stat-card">
                        <div class="stat-value">${app.formatCurrency(totalSales)}</div>
                        <div class="stat-label">Total Sales</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${commissionRate}%</div>
                        <div class="stat-label">Commission Rate</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${app.formatCurrency(totalCommission)}</div>
                        <div class="stat-label">Commission Earned</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${app.formatCurrency(totalTips)}</div>
                        <div class="stat-label">Tips Received</div>
                    </div>
                </div>
                <div class="total-earnings">
                    <strong>Total Earnings: ${app.formatCurrency(totalEarnings)}</strong>
                </div>
            </div>
            
            <div class="transaction-breakdown">
                <h4>Transaction Breakdown</h4>
                ${Object.keys(transactionsByDate).sort((a, b) => new Date(b) - new Date(a)).map(date => `
                    <div class="date-group">
                        <h5>${new Date(date).toLocaleDateString()}</h5>
                        <div class="transactions-list">
                            ${transactionsByDate[date].map(t => {
                                const transactionTips = this.tips.filter(tip => tip.transactionId === t.id);
                                const tipTotal = transactionTips.reduce((sum, tip) => sum + (tip.amount || 0), 0);
                                const commission = (t.total || 0) * (commissionRate / 100);
                                
                                return `
                                    <div class="transaction-item">
                                        <div class="transaction-header">
                                            <span class="transaction-time">${new Date(t.date).toLocaleTimeString()}</span>
                                            <span class="transaction-total">${app.formatCurrency(t.total || 0)}</span>
                                        </div>
                                        <div class="transaction-details">
                                            <div class="items-list">
                                                ${(t.items || []).map(item => `${item.name} x${item.quantity}`).join(', ')}
                                            </div>
                                            <div class="earnings-breakdown">
                                                <small>Commission: ${app.formatCurrency(commission)} | Tips: ${app.formatCurrency(tipTotal)}</small>
                                                <button class="btn btn-sm add-tip-btn" data-transaction-id="${t.id}">
                                                    <i class="fas fa-plus"></i> Add Tip
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    async showTipModal(transactionId) {
        const transaction = this.transactions.find(t => t.id === transactionId);
        if (!transaction) return;

        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Add Tip</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Transaction</label>
                        <div class="form-display">${app.formatCurrency(transaction.total)} - ${new Date(transaction.date).toLocaleString()}</div>
                    </div>
                    <div class="form-group">
                        <label>Tip Amount</label>
                        <input type="number" id="tipAmount" class="form-input" min="0" step="0.01" required>
                    </div>
                    <div class="form-group">
                        <label>Notes</label>
                        <input type="text" id="tipNotes" class="form-input" placeholder="Optional notes">
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button class="btn btn-primary" id="saveTipBtn">Save Tip</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('#saveTipBtn').onclick = async () => {
            try {
                const amount = parseFloat(modal.querySelector('#tipAmount').value || '0');
                const notes = modal.querySelector('#tipNotes').value.trim();

                if (amount <= 0) {
                    showNotification('Valid tip amount required', 'warning');
                    return;
                }

                const tipData = {
                    transactionId,
                    employeeId: window.roleManager.activeEmployee.id,
                    employeeName: window.roleManager.activeEmployee.name,
                    amount,
                    notes,
                    date: new Date().toISOString(),
                    syncStatus: 'pending'
                };

                await db.add('tips', tipData);
                showNotification('Tip recorded', 'success');
                modal.remove();
                
                // Refresh data and view
                await this.loadTherapistData();
                this.renderPayrollBreakdown();
            } catch (e) {
                console.error('Save tip error:', e);
                showNotification('Failed to save tip', 'error');
            }
        };
    }
}

const therapistPayrollManager = new TherapistPayrollManager();
window.loadTherapistPayroll = async function() { await therapistPayrollManager.init(); };
