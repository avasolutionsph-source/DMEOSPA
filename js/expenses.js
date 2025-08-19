// Daily Sales & Expenses Management
class ExpensesManager {
    constructor() {
        this.expenses = [];
        this.currentDate = new Date().toISOString().split('T')[0];
    }

    async init() {
        await this.loadExpenses();
        this.setupEventListeners();
        this.loadDailySummary();
    }

    setupEventListeners() {
        if (this._listenersAttached) return;
        this._listenersAttached = true;
        
        const addBtn = document.getElementById('addExpenseBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showExpenseModal());
        }

        const dateInput = document.getElementById('expensesDateFilter');
        if (dateInput) {
            dateInput.value = this.currentDate;
            dateInput.addEventListener('change', (e) => {
                this.currentDate = e.target.value;
                this.loadDailySummary();
                this.renderExpensesList();
            });
        }
    }

    async loadExpenses() {
        try {
            this.expenses = await db.getAll('expenses');
            this.renderExpensesList();
        } catch (error) {
            console.error('Failed to load expenses:', error);
        }
    }

    async loadDailySummary() {
        try {
            const todayExpenses = this.expenses.filter(e => 
                e.date && e.date.startsWith(this.currentDate)
            );
            const todayTransactions = await db.getByIndex('transactions', 'date', this.currentDate);
            
            const totalExpenses = todayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
            const totalSales = todayTransactions.reduce((sum, t) => sum + (t.total || 0), 0);
            const netProfit = totalSales - totalExpenses;

            // Update UI
            document.getElementById('dailySalesTotal').textContent = app.formatCurrency(totalSales);
            document.getElementById('dailyExpensesTotal').textContent = app.formatCurrency(totalExpenses);
            document.getElementById('dailyNetProfit').textContent = app.formatCurrency(netProfit);
            document.getElementById('dailyExpensesCount').textContent = todayExpenses.length;
        } catch (error) {
            console.error('Failed to load daily summary:', error);
        }
    }

    renderExpensesList() {
        const tbody = document.getElementById('expensesTableBody');
        if (!tbody) return;

        const filtered = this.expenses.filter(e => 
            e.date && e.date.startsWith(this.currentDate)
        ).sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1rem;">No expenses for this date</td></tr>';
            return;
        }

        tbody.innerHTML = filtered.map(expense => `
            <tr>
                <td>${new Date(expense.date).toLocaleTimeString()}</td>
                <td>${this.getCategoryName(expense.category)}</td>
                <td>${app.formatCurrency(expense.amount)}</td>
                <td>${expense.description || '-'}</td>
                <td>
                    ${expense.receiptPath ? 
                        `<button class="btn-icon" onclick="expensesManager.viewReceipt('${expense.id}')" title="View Receipt">
                            <i class="fas fa-receipt"></i>
                        </button>` : 
                        '<span style="color:var(--gray);">No receipt</span>'
                    }
                </td>
                <td>
                    <button class="btn-icon" onclick="expensesManager.editExpense(${expense.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" onclick="expensesManager.deleteExpense(${expense.id})" title="Delete">
                        <i class="fas fa-trash" style="color:var(--danger-color);"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    getCategoryName(category) {
        const categories = {
            'maintenance': 'Maintenance',
            'supplies': 'Supplies',
            'gas': 'Gas/Fuel',
            'utilities': 'Utilities',
            'marketing': 'Marketing',
            'food': 'Food/Meals',
            'transport': 'Transport',
            'office': 'Office Supplies',
            'other': 'Other'
        };
        return categories[category] || category;
    }

    showExpenseModal(expense = null) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${expense ? 'Edit' : 'Add'} Expense</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Category</label>
                            <select id="expenseCategory" class="form-input" required>
                                <option value="maintenance">Maintenance</option>
                                <option value="supplies">Supplies</option>
                                <option value="gas">Gas/Fuel</option>
                                <option value="utilities">Utilities</option>
                                <option value="marketing">Marketing</option>
                                <option value="food">Food/Meals</option>
                                <option value="transport">Transport</option>
                                <option value="office">Office Supplies</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Amount</label>
                            <input type="number" id="expenseAmount" class="form-input" min="0" step="0.01" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Description/Notes</label>
                        <input type="text" id="expenseDescription" class="form-input" placeholder="Brief description">
                    </div>
                    <div class="form-group">
                        <label>Receipt</label>
                        <div style="display:flex;gap:.5rem;align-items:center;">
                            <input type="file" id="expenseReceipt" class="form-input" accept="image/*" capture="environment">
                            <button type="button" class="btn btn-secondary" id="cameraBtn">
                                <i class="fas fa-camera"></i> Camera
                            </button>
                        </div>
                        <canvas id="receiptCanvas" style="display:none;max-width:300px;margin-top:.5rem;"></canvas>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button class="btn btn-primary" id="saveExpenseBtn">${expense ? 'Update' : 'Save'} Expense</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Pre-fill if editing
        if (expense) {
            modal.querySelector('#expenseCategory').value = expense.category || 'other';
            modal.querySelector('#expenseAmount').value = expense.amount || '';
            modal.querySelector('#expenseDescription').value = expense.description || '';
        }

        // Camera capture
        modal.querySelector('#cameraBtn').onclick = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                const video = document.createElement('video');
                video.srcObject = stream;
                video.play();
                
                const captureModal = document.createElement('div');
                captureModal.className = 'modal active';
                captureModal.innerHTML = `
                    <div class="modal-content" style="max-width:90vw;">
                        <div class="modal-header">
                            <h2>Capture Receipt</h2>
                            <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                        </div>
                        <div class="modal-body" style="text-align:center;">
                            <div id="videoContainer"></div>
                            <div style="margin-top:1rem;">
                                <button class="btn btn-primary" id="captureBtn">Capture</button>
                                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                            </div>
                        </div>
                    </div>
                `;
                document.body.appendChild(captureModal);
                captureModal.querySelector('#videoContainer').appendChild(video);
                
                captureModal.querySelector('#captureBtn').onclick = () => {
                    const canvas = modal.querySelector('#receiptCanvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    ctx.drawImage(video, 0, 0);
                    canvas.style.display = 'block';
                    
                    stream.getTracks().forEach(track => track.stop());
                    captureModal.remove();
                };
                
                captureModal.querySelector('.modal-close').onclick = () => {
                    stream.getTracks().forEach(track => track.stop());
                    captureModal.remove();
                };
            } catch (e) {
                alert('Camera access failed: ' + e.message);
            }
        };

        // Save handler
        modal.querySelector('#saveExpenseBtn').onclick = async () => {
            try {
                const category = modal.querySelector('#expenseCategory').value;
                const amount = parseFloat(modal.querySelector('#expenseAmount').value || '0');
                const description = modal.querySelector('#expenseDescription').value.trim();
                
                if (!category || amount <= 0) {
                    showNotification('Category and valid amount required', 'warning');
                    return;
                }

                let receiptPath = null;
                const fileInput = modal.querySelector('#expenseReceipt');
                const canvas = modal.querySelector('#receiptCanvas');
                
                if (fileInput.files.length > 0) {
                    // Store file as base64
                    const file = fileInput.files[0];
                    const reader = new FileReader();
                    receiptPath = await new Promise(resolve => {
                        reader.onload = () => resolve(reader.result);
                        reader.readAsDataURL(file);
                    });
                } else if (canvas.style.display !== 'none') {
                    receiptPath = canvas.toDataURL('image/jpeg', 0.8);
                }

                const expenseData = {
                    date: new Date().toISOString(),
                    category,
                    amount,
                    description,
                    receiptPath,
                    employeeId: window.roleManager?.activeEmployee?.id || null,
                    employeeName: window.roleManager?.activeEmployee?.name || null,
                    syncStatus: 'pending'
                };

                if (expense) {
                    expenseData.id = expense.id;
                    await db.update('expenses', expenseData);
                    showNotification('Expense updated', 'success');
                } else {
                    await db.add('expenses', expenseData);
                    showNotification('Expense recorded', 'success');
                }

                modal.remove();
                await this.loadExpenses();
                this.loadDailySummary();
            } catch (e) {
                console.error('Save expense error:', e);
                showNotification('Failed to save expense', 'error');
            }
        };
    }

    async editExpense(id) {
        const expense = await db.get('expenses', id);
        if (expense) this.showExpenseModal(expense);
    }

    async deleteExpense(id) {
        if (!confirm('Delete this expense?')) return;
        try {
            await db.delete('expenses', id);
            showNotification('Expense deleted', 'success');
            await this.loadExpenses();
            this.loadDailySummary();
        } catch (e) {
            showNotification('Failed to delete expense', 'error');
        }
    }

    async viewReceipt(id) {
        const expense = await db.get('expenses', id);
        if (!expense || !expense.receiptPath) {
            showNotification('No receipt available', 'info');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:80vw;">
                <div class="modal-header">
                    <h2>Receipt - ${this.getCategoryName(expense.category)}</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body" style="text-align:center;">
                    <img src="${expense.receiptPath}" style="max-width:100%;height:auto;border:1px solid #ddd;">
                    <div style="margin-top:1rem;">
                        <strong>Amount:</strong> ${app.formatCurrency(expense.amount)}<br>
                        <strong>Date:</strong> ${new Date(expense.date).toLocaleString()}<br>
                        ${expense.description ? `<strong>Description:</strong> ${expense.description}` : ''}
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
}

const expensesManager = new ExpensesManager();
window.loadExpenses = async function() { await expensesManager.init(); };
