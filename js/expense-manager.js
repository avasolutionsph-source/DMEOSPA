// expense-manager.js - Expense tracking and management system

class ExpenseManager {
    constructor() {
        this.expenses = [];
        this.currentFilter = 'all';
        this.currentExpense = null;
        this.receiptImageData = null;
        
        // Initialize the manager
        this.init();
    }

    async init() {
        try {
            await this.loadExpenses();
            this.setupEventListeners();
            this.updateDashboard();
            this.renderExpensesList();
            
            // Set default date to today
            const today = new Date().toISOString().split('T')[0];
            const dateInput = document.getElementById('expenseDate');
            if (dateInput) {
                dateInput.value = today;
            }
            
            console.log('✅ Expense Manager initialized');
        } catch (error) {
            console.error('❌ Error initializing Expense Manager:', error);
        }
    }

    setupEventListeners() {
        // Add expense button
        const addBtn = document.getElementById('add-expense-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showExpenseModal());
        }

        // Expense form submission
        const expenseForm = document.getElementById('expenseForm');
        if (expenseForm) {
            expenseForm.addEventListener('submit', (e) => this.handleExpenseSubmit(e));
        }

        // Filter buttons
        document.querySelectorAll('.expense-filters .filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleFilterClick(e));
        });

        // Global functions for modal and image handling
        window.showExpenseModal = () => this.showExpenseModal();
        window.handleImageUpload = (input) => this.handleImageUpload(input);
        window.capturePhoto = () => this.capturePhoto();
        window.openCameraCapture = () => this.openCameraCapture();
        window.editExpense = (id) => this.editExpense(id);
        window.deleteExpense = (id) => this.deleteExpense(id);
        window.viewReceipt = (id) => this.viewReceipt(id);
    }

    async loadExpenses() {
        try {
            if (!window.db) {
                console.warn('Database not available, using local storage fallback');
                const stored = localStorage.getItem('expenses');
                this.expenses = stored ? JSON.parse(stored) : [];
                return;
            }

            // Load expenses from database
            const allRecords = await window.db.getAll('expenses');
            this.expenses = allRecords || [];
            console.log(`📊 Loaded ${this.expenses.length} expenses`);
        } catch (error) {
            console.error('Error loading expenses:', error);
            this.expenses = [];
        }
    }

    async saveExpense(expenseData) {
        try {
            const expense = {
                id: Date.now(),
                ...expenseData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            if (window.db) {
                await window.db.add('expenses', expense);
            } else {
                // Fallback to localStorage
                this.expenses.push(expense);
                localStorage.setItem('expenses', JSON.stringify(this.expenses));
            }

            this.expenses.push(expense);
            
            // Update UI
            this.updateDashboard();
            this.renderExpensesList();
            
            console.log('✅ Expense saved successfully');
            return expense;
        } catch (error) {
            console.error('Error saving expense:', error);
            throw error;
        }
    }

    showExpenseModal(expenseId = null) {
        this.currentExpense = expenseId;
        this.receiptImageData = null;
        
        const modal = document.getElementById('expenseModal');
        const title = document.getElementById('expenseModalTitle');
        const form = document.getElementById('expenseForm');
        
        if (expenseId) {
            title.textContent = 'Edit Expense';
            // Load expense data for editing
            const expense = this.expenses.find(e => e.id == expenseId);
            if (expense) {
                this.populateForm(expense);
            }
        } else {
            title.textContent = 'Add New Expense';
            form.reset();
            
            // Set default date to today
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('expenseDate').value = today;
            
            // Reset image preview
            this.resetImagePreview();
        }
        
        modal.style.display = 'block';
    }

    populateForm(expense) {
        document.getElementById('expenseCategory').value = expense.category || '';
        document.getElementById('expenseAmount').value = expense.amount || '';
        document.getElementById('expenseDate').value = expense.date || '';
        document.getElementById('purchasedBy').value = expense.purchasedBy || '';
        document.getElementById('itemCount').value = expense.itemCount || 1;
        document.getElementById('vendor').value = expense.vendor || '';
        document.getElementById('expenseDescription').value = expense.description || '';
        document.getElementById('expenseNotes').value = expense.notes || '';
        
        // Load receipt image if available
        if (expense.receiptImage) {
            this.showImagePreview(expense.receiptImage);
        }
    }

    async handleExpenseSubmit(e) {
        e.preventDefault();
        
        try {
            const formData = new FormData(e.target);
            const expenseData = {
                category: document.getElementById('expenseCategory').value,
                amount: parseFloat(document.getElementById('expenseAmount').value),
                date: document.getElementById('expenseDate').value,
                purchasedBy: document.getElementById('purchasedBy').value,
                itemCount: parseInt(document.getElementById('itemCount').value) || 1,
                vendor: document.getElementById('vendor').value,
                description: document.getElementById('expenseDescription').value,
                notes: document.getElementById('expenseNotes').value,
                receiptImage: this.receiptImageData
            };

            if (this.currentExpense) {
                await this.updateExpense(this.currentExpense, expenseData);
            } else {
                await this.saveExpense(expenseData);
            }

            // Close modal and reset form
            closeModal('expenseModal');
            
            // Show success message
            if (window.showSuccess) {
                window.showSuccess('Expense saved successfully!');
            }
            
        } catch (error) {
            console.error('Error saving expense:', error);
            if (window.showError) {
                window.showError('Failed to save expense. Please try again.');
            }
        }
    }

    async updateExpense(id, expenseData) {
        try {
            const index = this.expenses.findIndex(e => e.id == id);
            if (index !== -1) {
                this.expenses[index] = {
                    ...this.expenses[index],
                    ...expenseData,
                    updatedAt: new Date().toISOString()
                };

                if (window.db) {
                    await window.db.update('expenses', this.expenses[index]);
                } else {
                    localStorage.setItem('expenses', JSON.stringify(this.expenses));
                }

                this.updateDashboard();
                this.renderExpensesList();
            }
        } catch (error) {
            console.error('Error updating expense:', error);
            throw error;
        }
    }

    async deleteExpense(id) {
        if (!confirm('Are you sure you want to delete this expense?')) {
            return;
        }

        try {
            if (window.db) {
                await window.db.delete('expenses', id);
            }
            
            this.expenses = this.expenses.filter(e => e.id != id);
            
            if (!window.db) {
                localStorage.setItem('expenses', JSON.stringify(this.expenses));
            }

            this.updateDashboard();
            this.renderExpensesList();
            
            if (window.showSuccess) {
                window.showSuccess('Expense deleted successfully!');
            }
        } catch (error) {
            console.error('Error deleting expense:', error);
            if (window.showError) {
                window.showError('Failed to delete expense. Please try again.');
            }
        }
    }

    editExpense(id) {
        this.showExpenseModal(id);
    }

    viewReceipt(id) {
        const expense = this.expenses.find(e => e.id == id);
        if (expense && expense.receiptImage) {
            // Create a modal to view the receipt image
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'block';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 90vw; max-height: 90vh;">
                    <div class="modal-header">
                        <h2>Receipt - ${expense.description || 'Expense'}</h2>
                        <button class="modal-close" onclick="this.closest('.modal').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body" style="text-align: center;">
                        <img src="${expense.receiptImage}" style="max-width: 100%; max-height: 70vh; border-radius: 8px;" />
                        <p style="margin-top: 1rem; color: #64748b;">
                            Amount: ₱${expense.amount.toFixed(2)} | Date: ${new Date(expense.date).toLocaleDateString()}
                        </p>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        } else {
            if (window.showWarning) {
                window.showWarning('No receipt image available for this expense.');
            }
        }
    }

    handleImageUpload(input) {
        if (input.files && input.files[0]) {
            const file = input.files[0];
            const reader = new FileReader();
            
            reader.onload = (e) => {
                this.receiptImageData = e.target.result;
                this.showImagePreview(this.receiptImageData);
            };
            
            reader.readAsDataURL(file);
        }
    }

    showImagePreview(imageData) {
        const preview = document.getElementById('imagePreview');
        const placeholder = document.getElementById('uploadPlaceholder');
        const previewImg = document.getElementById('previewImg');
        
        if (preview && placeholder && previewImg) {
            previewImg.src = imageData;
            preview.style.display = 'block';
            placeholder.style.display = 'none';
        }
    }

    resetImagePreview() {
        const preview = document.getElementById('imagePreview');
        const placeholder = document.getElementById('uploadPlaceholder');
        
        if (preview && placeholder) {
            preview.style.display = 'none';
            placeholder.style.display = 'block';
        }
    }

    async capturePhoto() {
        try {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                // For modern browsers with camera access
                const input = document.getElementById('receiptImage');
                input.setAttribute('capture', 'environment');
                input.click();
            } else {
                // Fallback to file input
                document.getElementById('receiptImage').click();
            }
        } catch (error) {
            console.error('Error accessing camera:', error);
            document.getElementById('receiptImage').click();
        }
    }

    async openCameraCapture() {
        console.log('📸 Opening camera directly...');
        
        // Create a hidden file input with camera capture
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'camera'; // This forces camera on mobile devices
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    this.receiptImageData = event.target.result;
                    this.displayImagePreview(this.receiptImageData);
                    console.log('✅ Photo captured successfully');
                };
                reader.readAsDataURL(file);
            }
        };
        
        // Trigger the camera
        input.click();
    }

    showCameraPermissionRequest() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 450px;">
                <div class="modal-header">
                    <h2><i class="fas fa-camera"></i> Camera Permission Required</h2>
                </div>
                <div class="modal-body" style="padding: 2rem; text-align: center;">
                    <div style="margin-bottom: 2rem;">
                        <div style="
                            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                            border-radius: 50%;
                            width: 100px;
                            height: 100px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin: 0 auto 1.5rem;
                            box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
                        ">
                            <i class="fas fa-camera" style="font-size: 3rem; color: white;"></i>
                        </div>
                        <h3 style="margin: 0 0 1rem 0; color: #1f2937;">Enable Camera for Receipt Photos</h3>
                        <p style="margin: 0; color: #6b7280; font-size: 1rem; line-height: 1.5;">
                            To capture receipt photos directly, this app needs access to your device camera. 
                            Your privacy is protected - camera access is only used for this expense feature.
                        </p>
                    </div>
                    
                    <div style="
                        background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
                        border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem;
                        border: 1px solid #0ea5e9;
                    ">
                        <div style="display: flex; align-items: center; margin-bottom: 1rem;">
                            <i class="fas fa-shield-alt" style="color: #0284c7; font-size: 1.5rem; margin-right: 0.75rem;"></i>
                            <strong style="color: #0c4a6e;">What happens next:</strong>
                        </div>
                        <ol style="margin: 0; padding-left: 1.5rem; color: #0c4a6e; text-align: left;">
                            <li style="margin-bottom: 0.5rem;">Click "Request Camera Access"</li>
                            <li style="margin-bottom: 0.5rem;">Your browser will show a permission dialog</li>
                            <li style="margin-bottom: 0.5rem;">Click "Allow" to enable camera access</li>
                            <li>Camera will open for taking receipt photos</li>
                        </ol>
                    </div>
                    
                    <div style="display: flex; gap: 1rem; justify-content: center;">
                        <button onclick="requestCameraAccess()" style="
                            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                            color: white; border: none; border-radius: 12px; padding: 1rem 2rem;
                            font-size: 1.1rem; font-weight: 600; cursor: pointer; 
                            display: flex; align-items: center; gap: 0.75rem;
                            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
                            transition: all 0.2s ease;
                        " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(16, 185, 129, 0.4)'" 
                           onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(16, 185, 129, 0.3)'">
                            <i class="fas fa-video"></i> Request Camera Access
                        </button>
                    </div>
                    
                    <p style="margin-top: 1.5rem; font-size: 0.9rem; color: #9ca3af; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                        <i class="fas fa-lock"></i>
                        <span>Secure • Private • Used only for receipt photos</span>
                    </p>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const self = this;
        
        // Request camera access function
        window.requestCameraAccess = async () => {
            const button = modal.querySelector('button');
            
            try {
                // Update button to loading state
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Requesting Permission...';
                button.disabled = true;
                button.style.background = 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
                
                console.log('🎥 Requesting camera permission...');
                
                // Request camera access - this WILL trigger browser permission dialog
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        facingMode: { ideal: 'environment' },
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    } 
                });
                
                // Success! Permission granted
                button.innerHTML = '<i class="fas fa-check"></i> Permission Granted!';
                button.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                
                setTimeout(() => {
                    modal.remove();
                    self.showCameraModal(stream);
                    
                    if (window.showSuccess) {
                        window.showSuccess('Camera access granted! Take a photo of your receipt.');
                    }
                }, 1000);
                
            } catch (error) {
                console.log('Camera permission denied:', error.message);
                
                // Permission denied
                button.innerHTML = '<i class="fas fa-times"></i> Permission Denied';
                button.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
                
                setTimeout(() => {
                    modal.remove();
                    
                    // Show explanation for denied permission
                    self.showPermissionDeniedHelp();
                }, 2000);
            }
        };
        
        // Auto-close after 60 seconds
        setTimeout(() => {
            if (document.body.contains(modal)) {
                modal.remove();
            }
        }, 60000);
    }

    showPermissionDeniedHelp() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2><i class="fas fa-info-circle"></i> Camera Permission Help</h2>
                </div>
                <div class="modal-body" style="padding: 2rem;">
                    <div style="text-align: center; margin-bottom: 2rem;">
                        <div style="
                            background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
                            border-radius: 50%;
                            width: 80px;
                            height: 80px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin: 0 auto 1rem;
                        ">
                            <i class="fas fa-camera-slash" style="font-size: 2rem; color: white;"></i>
                        </div>
                        <h3 style="color: #1f2937;">Camera Permission Was Denied</h3>
                    </div>
                    
                    <div style="background: #f8fafc; border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem;">
                        <p style="margin: 0 0 1rem 0; color: #374151;"><strong>To enable camera access:</strong></p>
                        <ol style="margin: 0; padding-left: 1.5rem; color: #4b5563;">
                            <li style="margin-bottom: 0.5rem;">Look for the <strong>🔒 lock icon</strong> in your browser's address bar</li>
                            <li style="margin-bottom: 0.5rem;">Click on it to open site permissions</li>
                            <li style="margin-bottom: 0.5rem;">Find "Camera" and change it to <strong>"Allow"</strong></li>
                            <li>Refresh this page and try again</li>
                        </ol>
                    </div>
                    
                    <div style="display: flex; gap: 1rem; justify-content: center;">
                        <button onclick="this.closest('.modal').remove(); window.location.reload();" style="
                            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                            color: white; border: none; border-radius: 8px; padding: 0.75rem 1.5rem;
                            font-size: 1rem; font-weight: 600; cursor: pointer;
                        ">
                            <i class="fas fa-refresh"></i> Refresh & Try Again
                        </button>
                        <button onclick="this.closest('.modal').remove()" style="
                            background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
                            color: white; border: none; border-radius: 8px; padding: 0.75rem 1.5rem;
                            font-size: 1rem; font-weight: 600; cursor: pointer;
                        ">
                            <i class="fas fa-times"></i> Close
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    async requestCameraPermission() {
        return new Promise((resolve) => {
            // Create permission request modal with better guidance
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'block';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 450px;">
                    <div class="modal-header">
                        <h2><i class="fas fa-camera"></i> Take Receipt Photo</h2>
                    </div>
                    <div class="modal-body" style="padding: 1.5rem;">
                        <div style="text-align: center; margin-bottom: 1.5rem;">
                            <div style="
                                background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
                                border-radius: 12px;
                                padding: 1rem;
                                margin-bottom: 1rem;
                            ">
                                <i class="fas fa-receipt" style="font-size: 3rem; color: #6b7280; margin-bottom: 0.5rem;"></i>
                                <p style="color: #4b5563; font-weight: 600;">Capture your receipt instantly</p>
                            </div>
                        </div>
                        
                        <p style="margin-bottom: 1rem; color: #374151; text-align: center;">
                            Choose how you'd like to add your receipt photo:
                        </p>
                        
                        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                            <button onclick="allowCamera()" style="
                                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                                color: white; border: none; border-radius: 12px; padding: 1rem 1.5rem;
                                font-size: 1rem; font-weight: 600; cursor: pointer; 
                                display: flex; align-items: center; justify-content: center; gap: 0.75rem;
                                transition: all 0.2s ease; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                            " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(16, 185, 129, 0.4)'" 
                               onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(16, 185, 129, 0.3)'">
                                <i class="fas fa-camera" style="font-size: 1.25rem;"></i> 
                                <div style="text-align: left;">
                                    <div>Use Camera</div>
                                    <div style="font-size: 0.8rem; opacity: 0.9;">Take photo instantly</div>
                                </div>
                            </button>
                            
                            <button onclick="denyCamera()" style="
                                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                                color: white; border: none; border-radius: 12px; padding: 1rem 1.5rem;
                                font-size: 1rem; font-weight: 600; cursor: pointer; 
                                display: flex; align-items: center; justify-content: center; gap: 0.75rem;
                                transition: all 0.2s ease; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
                            " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(59, 130, 246, 0.4)'" 
                               onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(59, 130, 246, 0.3)'">
                                <i class="fas fa-upload" style="font-size: 1.25rem;"></i>
                                <div style="text-align: left;">
                                    <div>Choose from Device</div>
                                    <div style="font-size: 0.8rem; opacity: 0.9;">Browse your photos</div>
                                </div>
                            </button>
                        </div>
                        
                        <div style="
                            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                            border-radius: 8px; padding: 1rem; margin-top: 1.5rem;
                            border: 1px solid #f59e0b20;
                        ">
                            <p style="margin: 0; font-size: 0.875rem; color: #92400e; display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fas fa-lightbulb"></i>
                                <span><strong>Tip:</strong> On mobile, both options can open your camera!</span>
                            </p>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Global functions for handling the response
            window.allowCamera = () => {
                modal.remove();
                resolve(true);
            };
            
            window.denyCamera = () => {
                modal.remove();
                resolve(false);
            };
            
            // Auto-deny after 60 seconds (increased time for better UX)
            setTimeout(() => {
                if (document.body.contains(modal)) {
                    modal.remove();
                    resolve(false);
                }
            }, 60000);
        });
    }

    showAutoRetryDialog() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 450px;">
                <div class="modal-header">
                    <h2><i class="fas fa-camera-retro"></i> Enable Camera Access</h2>
                </div>
                <div class="modal-body" style="padding: 1.5rem; text-align: center;">
                    <div style="margin-bottom: 1.5rem;">
                        <div style="
                            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                            border-radius: 50%;
                            width: 80px;
                            height: 80px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin: 0 auto 1rem;
                            border: 3px solid #f59e0b;
                        ">
                            <i class="fas fa-camera" style="font-size: 2rem; color: #92400e;"></i>
                        </div>
                        <h3 style="margin: 0 0 0.5rem 0; color: #374151;">Camera Permission Required</h3>
                        <p style="margin: 0; color: #6b7280; font-size: 0.95rem;">
                            Your browser needs permission to access the camera for taking receipt photos.
                        </p>
                    </div>
                    
                    <div style="
                        background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
                        border-radius: 12px; padding: 1rem; margin-bottom: 1.5rem;
                        border: 1px solid #3b82f6;
                    ">
                        <p style="margin: 0; color: #1e40af; font-size: 0.9rem; font-weight: 500;">
                            <i class="fas fa-info-circle"></i> 
                            <strong>Next Steps:</strong><br>
                            1. Click "Request Camera Access" below<br>
                            2. When browser asks, click "Allow"<br>
                            3. Camera will open automatically
                        </p>
                    </div>
                    
                    <div style="display: flex; gap: 0.75rem; justify-content: center;">
                        <button onclick="forceRequestCamera()" style="
                            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                            color: white; border: none; border-radius: 12px; padding: 1rem 1.5rem;
                            font-size: 1rem; font-weight: 600; cursor: pointer; 
                            display: flex; align-items: center; gap: 0.5rem;
                            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                        ">
                            <i class="fas fa-video"></i> Request Camera Access
                        </button>
                        
                        <button onclick="useFileInstead()" style="
                            background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
                            color: white; border: none; border-radius: 12px; padding: 1rem 1.5rem;
                            font-size: 1rem; font-weight: 600; cursor: pointer; 
                            display: flex; align-items: center; gap: 0.5rem;
                            box-shadow: 0 4px 12px rgba(107, 114, 128, 0.3);
                        ">
                            <i class="fas fa-upload"></i> Use Files Instead
                        </button>
                    </div>
                    
                    <p style="margin-top: 1rem; font-size: 0.85rem; color: #9ca3af;">
                        🔒 Your privacy is protected - camera access is only used for this feature
                    </p>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const self = this;
        
        // Force camera request function - this will trigger the browser permission dialog
        window.forceRequestCamera = async () => {
            // Find the correct button
            const button = modal.querySelector('button[onclick="forceRequestCamera()"]');
            
            try {
                if (button) {
                    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Requesting Access...';
                    button.disabled = true;
                }
                
                // Check if camera is available
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    throw new Error('Camera not supported on this device');
                }
                
                // Try to get camera access
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        facingMode: { ideal: 'environment' },
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    } 
                });
                
                // Success! Close modal and show camera
                modal.remove();
                self.showCameraModal(stream);
                
                if (window.showSuccess) {
                    window.showSuccess('Camera access granted! Take a photo of your receipt.');
                }
                
            } catch (error) {
                console.log('Camera access failed:', error.message);
                
                // Handle permissions policy violation specifically
                if (error.message.includes('not allowed') || error.message.includes('policy')) {
                    if (button) {
                        button.innerHTML = '<i class="fas fa-ban"></i> Camera Blocked';
                        button.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
                    }
                    
                    setTimeout(() => {
                        modal.remove();
                        if (window.showWarning) {
                            window.showWarning('Camera is blocked by security policy. Using file upload instead.');
                        }
                        self.fallbackToFileInput();
                    }, 2000);
                    
                } else {
                    // Other camera errors
                    if (button) {
                        button.innerHTML = '<i class="fas fa-times"></i> Access Denied';
                        button.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
                    }
                    
                    setTimeout(() => {
                        modal.remove();
                        if (window.showInfo) {
                            window.showInfo('Camera access not available. Using file upload instead.');
                        }
                        self.fallbackToFileInput();
                    }, 2000);
                }
            }
        };
        
        // File upload fallback
        window.useFileInstead = () => {
            modal.remove();
            self.fallbackToFileInput();
        };
        
        // Auto-fallback after 45 seconds if no action
        setTimeout(() => {
            if (document.body.contains(modal)) {
                modal.remove();
                self.fallbackToFileInput();
            }
        }, 45000);
    }

    showChromePermissionGuide(reason) {
        let title, instructions, buttonText;
        
        switch (reason) {
            case 'secure':
                title = '🔒 Secure Connection Required';
                instructions = `
                    <p>Camera access requires a secure connection (HTTPS). Since you're on localhost, this should work.</p>
                    <p><strong>Try refreshing the page</strong> and clicking "Allow" when Chrome asks for camera permission.</p>
                `;
                buttonText = 'Refresh Page';
                break;
                
            case 'denied':
                title = '🚫 Camera Permission Denied';
                instructions = `
                    <div style="text-align: left; margin-bottom: 1rem;">
                        <p><strong>To enable camera access in Chrome:</strong></p>
                        <ol style="margin: 0.5rem 0; padding-left: 1.5rem;">
                            <li>Click the <strong>🔒 lock icon</strong> in the address bar</li>
                            <li>Find <strong>"Camera"</strong> and change it to <strong>"Allow"</strong></li>
                            <li>Refresh this page and try again</li>
                        </ol>
                    </div>
                    <div style="background: #fef3c7; border-radius: 8px; padding: 1rem; border: 1px solid #f59e0b;">
                        <p style="margin: 0; color: #92400e; font-size: 0.9rem;">
                            <i class="fas fa-info-circle"></i> 
                            <strong>Alternative:</strong> You can still upload photos from your device using the file option below.
                        </p>
                    </div>
                `;
                buttonText = 'Try Again';
                break;
                
            case 'blocked':
                title = '📷 Camera Permission Needed';
                instructions = `
                    <div style="text-align: left; margin-bottom: 1rem;">
                        <p><strong>Chrome is asking for camera permission:</strong></p>
                        <ol style="margin: 0.5rem 0; padding-left: 1.5rem;">
                            <li>Look for a popup at the top of your browser</li>
                            <li>Click <strong>"Allow"</strong> to enable camera access</li>
                            <li>If you don't see it, check the address bar for a camera icon</li>
                        </ol>
                    </div>
                    <div style="background: #dbeafe; border-radius: 8px; padding: 1rem; border: 1px solid #3b82f6;">
                        <p style="margin: 0; color: #1e40af; font-size: 0.9rem;">
                            <i class="fas fa-lightbulb"></i> 
                            <strong>Tip:</strong> If blocked permanently, click the lock icon in address bar to reset permissions.
                        </p>
                    </div>
                `;
                buttonText = 'I Allowed Camera';
                break;
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2>${title}</h2>
                </div>
                <div class="modal-body" style="padding: 1.5rem;">
                    ${instructions}
                    
                    <div style="display: flex; gap: 0.75rem; justify-content: center; margin-top: 1.5rem;">
                        <button onclick="retryCamera()" style="
                            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                            color: white; border: none; border-radius: 8px; padding: 0.75rem 1.5rem;
                            font-size: 1rem; font-weight: 600; cursor: pointer; 
                            display: flex; align-items: center; gap: 0.5rem;
                        ">
                            <i class="fas fa-redo"></i> ${buttonText}
                        </button>
                        
                        <button onclick="useFileUpload()" style="
                            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                            color: white; border: none; border-radius: 8px; padding: 0.75rem 1.5rem;
                            font-size: 1rem; font-weight: 600; cursor: pointer; 
                            display: flex; align-items: center; gap: 0.5rem;
                        ">
                            <i class="fas fa-upload"></i> Use File Upload
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const self = this;
        
        window.retryCamera = () => {
            modal.remove();
            if (reason === 'secure') {
                window.location.reload();
            } else {
                self.openCameraCapture();
            }
        };
        
        window.useFileUpload = () => {
            modal.remove();
            self.fallbackToFileInput();
        };
        
        // Auto-close after 2 minutes
        setTimeout(() => {
            if (document.body.contains(modal)) {
                modal.remove();
                self.fallbackToFileInput();
            }
        }, 120000);
    }

    async openCameraInPopup() {
        return new Promise((resolve, reject) => {
            // Create popup window with camera access
            const popupHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Camera Capture</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body { 
                            margin: 0; 
                            padding: 20px; 
                            font-family: Arial, sans-serif; 
                            background: #000;
                            color: white;
                            text-align: center;
                        }
                        video { 
                            width: 100%; 
                            max-width: 400px; 
                            height: auto; 
                            border-radius: 8px; 
                            margin-bottom: 20px;
                        }
                        button { 
                            padding: 12px 24px; 
                            margin: 8px; 
                            border: none; 
                            border-radius: 6px; 
                            background: #10b981; 
                            color: white; 
                            font-size: 16px; 
                            cursor: pointer;
                        }
                        button:hover { background: #059669; }
                        .cancel { background: #ef4444; }
                        .cancel:hover { background: #dc2626; }
                        canvas { display: none; }
                        #message { margin: 20px 0; }
                    </style>
                </head>
                <body>
                    <h2>📸 Capture Receipt Photo</h2>
                    <div id="message">Click "Start Camera" to begin</div>
                    <video id="video" autoplay playsinline></video>
                    <canvas id="canvas"></canvas>
                    <div>
                        <button id="startBtn" onclick="startCamera()">Start Camera</button>
                        <button id="captureBtn" onclick="capturePhoto()" style="display: none;">Capture Photo</button>
                        <button id="cancelBtn" class="cancel" onclick="window.close()">Cancel</button>
                    </div>
                    
                    <script>
                        let stream = null;
                        
                        async function startCamera() {
                            try {
                                document.getElementById('message').textContent = 'Starting camera...';
                                
                                stream = await navigator.mediaDevices.getUserMedia({ 
                                    video: { 
                                        facingMode: { ideal: 'environment' },
                                        width: { ideal: 1280 },
                                        height: { ideal: 720 }
                                    } 
                                });
                                
                                const video = document.getElementById('video');
                                video.srcObject = stream;
                                
                                document.getElementById('startBtn').style.display = 'none';
                                document.getElementById('captureBtn').style.display = 'inline-block';
                                document.getElementById('message').textContent = 'Position your receipt in the frame and click Capture';
                                
                            } catch (error) {
                                document.getElementById('message').textContent = 'Camera access failed: ' + error.message;
                            }
                        }
                        
                        function capturePhoto() {
                            const video = document.getElementById('video');
                            const canvas = document.getElementById('canvas');
                            const ctx = canvas.getContext('2d');
                            
                            canvas.width = video.videoWidth;
                            canvas.height = video.videoHeight;
                            ctx.drawImage(video, 0, 0);
                            
                            const imageData = canvas.toDataURL('image/jpeg', 0.8);
                            
                            // Send image data back to parent window
                            if (window.opener) {
                                window.opener.postMessage({
                                    type: 'CAMERA_CAPTURE',
                                    imageData: imageData
                                }, '*');
                            }
                            
                            // Stop camera
                            if (stream) {
                                stream.getTracks().forEach(track => track.stop());
                            }
                            
                            window.close();
                        }
                        
                        // Auto-start camera
                        window.addEventListener('load', () => {
                            setTimeout(startCamera, 500);
                        });
                    </script>
                </body>
                </html>
            `;
            
            // Create blob URL for the popup
            const blob = new Blob([popupHtml], { type: 'text/html' });
            const popupUrl = URL.createObjectURL(blob);
            
            // Open popup window
            const popup = window.open(
                popupUrl, 
                'cameraCapture',
                'width=500,height=600,scrollbars=no,resizable=yes'
            );
            
            if (!popup) {
                reject(new Error('Popup blocked'));
                return;
            }
            
            // Listen for messages from popup
            const messageHandler = (event) => {
                if (event.data.type === 'CAMERA_CAPTURE') {
                    // Set the captured image
                    this.receiptImageData = event.data.imageData;
                    this.showImagePreview(event.data.imageData);
                    
                    if (window.showSuccess) {
                        window.showSuccess('Photo captured successfully!');
                    }
                    
                    window.removeEventListener('message', messageHandler);
                    URL.revokeObjectURL(popupUrl);
                    resolve();
                }
            };
            
            window.addEventListener('message', messageHandler);
            
            // Handle popup close without capture
            const checkClosed = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkClosed);
                    window.removeEventListener('message', messageHandler);
                    URL.revokeObjectURL(popupUrl);
                    reject(new Error('Popup closed without capture'));
                }
            }, 1000);
        });
    }

    useEnhancedFileInput() {
        // Enhanced file input that strongly encourages camera use
        const input = document.getElementById('receiptImage');
        if (input) {
            // Set all possible attributes to encourage camera
            input.setAttribute('capture', 'environment');
            input.setAttribute('accept', 'image/*');
            input.setAttribute('multiple', 'false');
            
            // On mobile, this should open camera directly
            input.click();
            
            if (window.showInfo) {
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                if (isMobile) {
                    window.showInfo('📱 Camera should open automatically on mobile devices');
                } else {
                    window.showInfo('💻 Choose "Camera" option in the file picker to take a photo');
                }
            }
        } else {
            console.error('File input element not found');
        }
    }

    fallbackToFileInput() {
        // Use file input as fallback - works on all devices
        const input = document.getElementById('receiptImage');
        if (input) {
            // Ensure capture attribute is set for mobile camera access
            input.setAttribute('capture', 'environment');
            input.setAttribute('accept', 'image/*');
            
            // On mobile devices, this will open the camera directly
            // On desktop, it will show file picker with camera option
            input.click();
            
            // Show helpful message
            if (window.showInfo) {
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                if (isMobile) {
                    window.showInfo('Camera will open automatically. Take a photo of your receipt.');
                } else {
                    window.showInfo('Please select or take a photo of your receipt.');
                }
            }
        } else {
            console.error('File input element not found');
            if (window.showError) {
                window.showError('Unable to access camera or file system.');
            }
        }
    }

    showCameraModal(stream) {
        // Create camera capture modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 90vw; max-height: 90vh;">
                <div class="modal-header">
                    <h2>Capture Receipt Photo</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body" style="text-align: center; padding: 1rem;">
                    <video id="cameraVideo" autoplay playsinline style="
                        width: 100%; 
                        max-width: 400px; 
                        height: auto; 
                        border-radius: 8px;
                        background: #000;
                        margin-bottom: 1rem;
                    "></video>
                    <canvas id="cameraCanvas" style="display: none;"></canvas>
                    <div style="display: flex; gap: 1rem; justify-content: center;">
                        <button onclick="captureFromCamera()" style="
                            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                            color: white; border: none; border-radius: 8px; padding: 0.75rem 1.5rem;
                            font-size: 1rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;
                        ">
                            <i class="fas fa-camera"></i> Capture Photo
                        </button>
                        <button onclick="this.closest('.modal').remove()" style="
                            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                            color: white; border: none; border-radius: 8px; padding: 0.75rem 1.5rem;
                            font-size: 1rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;
                        ">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const video = modal.querySelector('#cameraVideo');
        video.srcObject = stream;
        
        // Global function for capturing from camera - bind to current context
        const self = this;
        window.captureFromCamera = function() {
            const canvas = modal.querySelector('#cameraCanvas');
            const ctx = canvas.getContext('2d');
            
            // Set canvas dimensions to match video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            // Draw the video frame to canvas
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Convert to data URL
            const imageData = canvas.toDataURL('image/jpeg', 0.8);
            
            // Set the captured image
            self.receiptImageData = imageData;
            self.showImagePreview(imageData);
            
            // Stop the camera stream
            stream.getTracks().forEach(track => track.stop());
            
            // Close the modal
            modal.remove();
            
            if (window.showSuccess) {
                window.showSuccess('Photo captured successfully!');
            }
        };
        
        // Cleanup when modal is closed
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                stream.getTracks().forEach(track => track.stop());
                modal.remove();
            }
        });
    }

    handleFilterClick(e) {
        const filterBtn = e.target.closest('.filter-btn');
        if (!filterBtn) return;

        // Update active filter button
        document.querySelectorAll('.expense-filters .filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        filterBtn.classList.add('active');

        // Update current filter
        this.currentFilter = filterBtn.dataset.filter;
        
        // Re-render the expenses list
        this.renderExpensesList();
    }

    getFilteredExpenses() {
        if (this.currentFilter === 'all') {
            return this.expenses;
        }
        return this.expenses.filter(expense => expense.category === this.currentFilter);
    }

    updateDashboard() {
        const totalExpenses = this.expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const thisMonth = new Date();
        const firstDayOfMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
        
        const thisMonthExpenses = this.expenses
            .filter(expense => new Date(expense.date) >= firstDayOfMonth)
            .reduce((sum, expense) => sum + expense.amount, 0);

        // Update dashboard values
        const totalEl = document.getElementById('total-expenses');
        const monthEl = document.getElementById('this-month-expenses');
        const countEl = document.getElementById('total-expense-count');

        if (totalEl) totalEl.textContent = `₱${totalExpenses.toFixed(2)}`;
        if (monthEl) monthEl.textContent = `₱${thisMonthExpenses.toFixed(2)}`;
        if (countEl) countEl.textContent = this.expenses.length.toString();
    }

    renderExpensesList() {
        const container = document.getElementById('expenses-list');
        if (!container) return;

        const filteredExpenses = this.getFilteredExpenses();

        if (filteredExpenses.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 3rem; color: #64748b;">
                    <i class="fas fa-receipt" style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <h3>No Expenses Found</h3>
                    <p>${this.currentFilter === 'all' ? 'Start tracking your business expenses by adding your first expense record' : `No expenses found in the ${this.currentFilter} category`}</p>
                </div>
            `;
            return;
        }

        // Sort expenses by date (newest first)
        const sortedExpenses = filteredExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));

        const expensesHTML = sortedExpenses.map(expense => this.renderExpenseCard(expense)).join('');
        
        container.innerHTML = `
            <div class="expenses-grid" style="display: grid; gap: 1rem;">
                ${expensesHTML}
            </div>
        `;
    }

    renderExpenseCard(expense) {
        const categoryIcons = {
            supplies: 'fas fa-boxes',
            equipment: 'fas fa-tools',
            utilities: 'fas fa-bolt',
            marketing: 'fas fa-bullhorn',
            rent: 'fas fa-home',
            maintenance: 'fas fa-wrench',
            professional: 'fas fa-user-tie',
            travel: 'fas fa-car',
            office: 'fas fa-paperclip',
            insurance: 'fas fa-shield-alt',
            other: 'fas fa-ellipsis-h'
        };

        const categoryColors = {
            supplies: '#10b981',
            equipment: '#f59e0b',
            utilities: '#8b5cf6',
            marketing: '#ef4444',
            rent: '#3b82f6',
            maintenance: '#f97316',
            professional: '#6366f1',
            travel: '#06b6d4',
            office: '#84cc16',
            insurance: '#ec4899',
            other: '#64748b'
        };

        const icon = categoryIcons[expense.category] || categoryIcons.other;
        const color = categoryColors[expense.category] || categoryColors.other;
        const hasReceipt = expense.receiptImage ? 'block' : 'none';

        return `
            <div class="expense-card" style="
                background: white;
                border-radius: 12px;
                padding: 1.5rem;
                box-shadow: 0 4px 16px rgba(0,0,0,0.1);
                border: 1px solid rgba(0,0,0,0.05);
                transition: all 0.2s ease;
            " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 24px rgba(0,0,0,0.15)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 16px rgba(0,0,0,0.1)'">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div style="
                            background: ${color};
                            color: white;
                            width: 40px;
                            height: 40px;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        ">
                            <i class="${icon}"></i>
                        </div>
                        <div>
                            <h4 style="margin: 0; color: #1e293b; font-size: 1.1rem;">${expense.description || 'Expense'}</h4>
                            <p style="margin: 0; color: #64748b; font-size: 0.9rem; text-transform: capitalize;">${expense.category.replace(/([A-Z])/g, ' $1')}</p>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 1.25rem; font-weight: 700; color: ${color};">₱${expense.amount.toFixed(2)}</div>
                        <div style="font-size: 0.8rem; color: #64748b;">${new Date(expense.date).toLocaleDateString()}</div>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem; font-size: 0.85rem;">
                    <div>
                        <span style="color: #64748b;">Purchased by:</span>
                        <div style="font-weight: 600; color: #1e293b;">${expense.purchasedBy}</div>
                    </div>
                    <div>
                        <span style="color: #64748b;">Items:</span>
                        <div style="font-weight: 600; color: #1e293b;">${expense.itemCount || 1}</div>
                    </div>
                    ${expense.vendor ? `
                    <div style="grid-column: 1 / -1;">
                        <span style="color: #64748b;">Vendor:</span>
                        <div style="font-weight: 600; color: #1e293b;">${expense.vendor}</div>
                    </div>
                    ` : ''}
                </div>

                ${expense.notes ? `
                <div style="background: #f8fafc; padding: 0.75rem; border-radius: 6px; margin-bottom: 1rem;">
                    <div style="font-size: 0.85rem; color: #475569;">${expense.notes}</div>
                </div>
                ` : ''}

                <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                    <button onclick="viewReceipt(${expense.id})" style="
                        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                        color: white; border: none; border-radius: 6px; padding: 0.4rem 0.8rem;
                        font-size: 0.8rem; cursor: pointer; display: ${hasReceipt};
                    ">
                        <i class="fas fa-image"></i> Receipt
                    </button>
                    <button onclick="editExpense(${expense.id})" style="
                        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                        color: white; border: none; border-radius: 6px; padding: 0.4rem 0.8rem;
                        font-size: 0.8rem; cursor: pointer;
                    ">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button onclick="deleteExpense(${expense.id})" style="
                        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                        color: white; border: none; border-radius: 6px; padding: 0.4rem 0.8rem;
                        font-size: 0.8rem; cursor: pointer;
                    ">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    }
}

// Initialize expense manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('expenses')) {
        window.expenseManager = new ExpenseManager();
    }
});

// Export for use in other modules
window.ExpenseManager = ExpenseManager;