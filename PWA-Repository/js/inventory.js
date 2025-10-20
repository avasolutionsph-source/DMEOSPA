// Inventory Management


class InventoryManager {
    constructor() {
        this.inventory = [];
        this.editingItem = null;
        this.currentFilter = 'all';
    }

    async init() {
        await this.loadInventory();
        this.setupEventListeners();
        this.checkLowStock();
    }

    setupEventListeners() {
        if (this._listenersAttached) return;
        
        // Check if we're actually on the inventory page before setting up listeners
        const inventoryPage = document.getElementById('inventory');
        if (!inventoryPage) {
            console.log('🔍 [INVENTORY] Not on inventory page, skipping event listener setup');
            return;
        }
        
        this._listenersAttached = true;
        // Add inventory button
        const addBtn = document.getElementById('addInventoryBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                // Check if user can access inventory feature
                if (window.requiresUpgrade && window.requiresUpgrade('inventory')) {
                    window.showFeatureLockedMessage('inventory', 'manage inventory');
                    return;
                }
                
                // Check plan limits
                if (window.checkPlanLimits) {
                    window.checkPlanLimits('inventory').then(limitReached => {
                        if (limitReached) {
                            window.showLimitReachedMessage('inventory');
                            return;
                        }
                        this.editingItem = null;
                        document.getElementById('inventoryModalTitle').textContent = 'Add Inventory Item';
                        document.getElementById('inventoryForm').reset();
                        openModal('inventoryModal');
                    });
                } else {
                    this.editingItem = null;
                    document.getElementById('inventoryModalTitle').textContent = 'Add Inventory Item';
                    document.getElementById('inventoryForm').reset();
                    openModal('inventoryModal');
                }
            });
        }

        // Inventory form submission with double-click protection
        const form = document.getElementById('inventoryForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitBtn = e.target.querySelector('button[type="submit"]');
                if (submitBtn && submitBtn.disabled) return; // Already processing
                await this.saveInventoryItem();
            });
        }

        // Stock adjustment form submission
        const stockForm = document.getElementById('stockAdjustmentForm');
        if (stockForm) {
            stockForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleStockAdjustment();
            });
        }

        // Stock filter
        const filter = document.getElementById('stockFilter');
        if (filter) {
            filter.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.displayInventory();
            });
        }
    }

    async loadInventory() {
        try {
            console.log('📦 [INVENTORY] Loading inventory...');
            
            // Check if we have recent local data (within 30 seconds) - use local first to preserve POS changes
            let useLocalData = false;
            if (window.db) {
                const localInventory = await window.db.getAll('inventory') || [];
                const recentItems = localInventory.filter(item => {
                    const modifiedAt = new Date(item.modifiedAt || 0);
                    const now = new Date();
                    return (now - modifiedAt) < 30000; // 30 seconds
                });
                
                if (recentItems.length > 0) {
                    console.log('📦 [INVENTORY] Using local IndexedDB data to preserve recent POS changes');
                    this.inventory = localInventory;
                    this.displayInventory();
                    return;
                }
            }
            
            // Get authentication token for API fallback
            const token = this.getAuthToken();
            if (!token) {
                console.error('❌ [INVENTORY] No authentication token found');
                // Try to use local data as fallback
                if (window.db) {
                    this.inventory = await window.db.getAll('inventory') || [];
                    console.log('📦 [INVENTORY] Using local IndexedDB as fallback');
                } else {
                    this.inventory = [];
                }
                this.displayInventory();
                return;
            }
            
            // Use HybridAPIClient for offline support (when no recent local changes)
            console.log('📦 [INVENTORY] Fetching from API (no recent local changes)');
            const result = await window.HybridAPIClient.getInventory();
            
            if (result.success) {
                this.inventory = result.data || [];
                console.log(`✅ [INVENTORY] Loaded ${this.inventory.length} inventory items from ${result.source || 'API'}`);
            } else {
                console.error('❌ [INVENTORY] Failed to load inventory:', result.error);
                // Try to use local data as fallback
                if (window.db) {
                    this.inventory = await window.db.getAll('inventory') || [];
                    console.log('📦 [INVENTORY] Using local IndexedDB as fallback after API failure');
                } else {
                    this.inventory = [];
                }
            }
            
            this.displayInventory();
        } catch (error) {
            if (window.logger) {
                window.logger.error('Failed to load inventory', {
                    category: 'INVENTORY',
                    operation: 'load_inventory',
                    error: error
                });
            } else {
                console.error('Failed to load inventory:', error);
            }
        }
    }

    displayInventory() {
        const tbody = document.getElementById('inventoryTableBody');
        if (!tbody) return;

        console.log('📦 [INVENTORY] Raw inventory data for display:', this.inventory);
        let items = [...this.inventory];

        // Apply filter
        if (this.currentFilter !== 'all') {
            items = items.filter(item => {
                const status = this.getStockStatus(item);
                return this.currentFilter === status;
            });
        }

        if (items.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 2rem;">
                        ${this.currentFilter === 'all' ? 
                            'No inventory items found. Click "Add Supply" to create one.' :
                            `No items with ${this.currentFilter} stock status.`
                        }
                    </td>
                </tr>
            `;
            return;
        }

                    tbody.innerHTML = items.map(item => {
                const status = this.getStockStatus(item);
                const statusBadge = this.getStatusBadge(status);
                
                return `
                    <tr>
                        <td>
                            <strong>${item.name}</strong>
                            ${item.notes ? `<br><small style="color: var(--gray);">${item.notes}</small>` : ''}
                        </td>
                        <td>
                            <span class="badge badge-${this.getCategoryColor(item.category)}">
                                ${this.getCategoryName(item.category)}
                            </span>
                        </td>
                        <td>
                            <strong>${item.currentStock || item.quantity || 0}</strong>
                            ${(item.currentStock || item.quantity || 0) <= item.minStock ? 
                                ' <i class="fas fa-exclamation-triangle" style="color: var(--warning-color);"></i>' : ''
                            }
                        </td>
                        <td>${item.unit || 'pcs'}</td>
                        <td>${app.formatCurrency(item.sellingPrice || item.costPrice || item.price || item.unitPrice || 0)}</td>
                        <td>${item.minStock}</td>
                        <td>${statusBadge}</td>
                        <td>
                            ${item.availableInPOS ? 
                                '<span class="badge badge-success"><i class="fas fa-check"></i> POS</span>' : 
                                '<span class="badge badge-secondary"><i class="fas fa-times"></i> No POS</span>'
                            }
                        </td>
                        <td>
                            <div class="stock-actions">
                                <button class="stock-btn minus" onclick="inventoryManager.adjustStock('${item._id || item.id}', -1)" title="Remove 1">
                                    <i class="fas fa-minus"></i>
                                </button>
                                <button class="stock-btn plus" onclick="inventoryManager.adjustStock('${item._id || item.id}', 1)" title="Add 1">
                                    <i class="fas fa-plus"></i>
                                </button>
                                <button class="btn-icon" onclick="inventoryManager.adjustStock('${item._id || item.id}')" title="Adjust Stock">
                                    <i class="fas fa-boxes"></i>
                                </button>
                                <button class="btn-icon" onclick="inventoryManager.editItem('${item._id || item.id}')" title="Edit">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn-icon" onclick="inventoryManager.deleteItem('${item._id || item.id}')" title="Delete">
                                    <i class="fas fa-trash" style="color: var(--danger-color);"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
    }

    getStockStatus(item) {
        const stock = item.currentStock || item.quantity || 0;
        if (stock === 0) return 'out';
        if (stock <= item.minStock) return 'low';
        return 'ok';
    }

    getStatusBadge(status) {
        switch(status) {
            case 'out':
                return '<span class="badge badge-danger">Out of Stock</span>';
            case 'low':
                return '<span class="badge badge-warning">Low Stock</span>';
            case 'ok':
                return '<span class="badge badge-success">In Stock</span>';
            default:
                return '';
        }
    }

    getCategoryColor(category) {
        const colors = {
            'oils': 'success',
            'lotions': 'info',
            'towels': 'warning',
            'candles': 'purple',
            'tools': 'secondary',
            'skincare': 'info',
            'cleaning': 'danger',
            'disposables': 'warning'
        };
        return colors[category] || 'secondary';
    }

    getCategoryName(category) {
        // Handle null, undefined, empty string cases
        if (!category || category === 'undefined' || category === 'null' || category === '') {
            return 'Uncategorized';
        }
        
        // Convert to string and trim whitespace, then lowercase for matching
        const cleanCategory = String(category).trim().toLowerCase();
        
        const names = {
            'oils': 'Essential Oils',
            'lotions': 'Lotions & Creams', 
            'towels': 'Towels & Linens',
            'candles': 'Candles & Aromatics',
            'tools': 'Tools & Equipment',
            'skincare': 'Skincare Products',
            'cleaning': 'Cleaning Supplies',
            'disposables': 'Disposable Items',
            'misc': 'Miscellaneous'
        };
        
        // Return mapped name or capitalize the original if not found
        return names[cleanCategory] || this.capitalizeFirst(category);
    }

    capitalizeFirst(str) {
        if (!str) return '';
        return String(str).charAt(0).toUpperCase() + String(str).slice(1);
    }

    // Get the dropdown value (key) from category name or key
    getCategoryKey(category) {
        if (!category) return 'oils'; // default
        
        const cleanCategory = String(category).trim().toLowerCase();
        
        // Direct key mapping
        const keys = {
            'oils': 'oils',
            'essential oils': 'oils',
            'lotions': 'lotions', 
            'lotions & creams': 'lotions',
            'towels': 'towels',
            'towels & linens': 'towels',
            'candles': 'candles',
            'candles & aromatics': 'candles',
            'tools': 'tools',
            'tools & equipment': 'tools',
            'skincare': 'skincare',
            'skincare products': 'skincare',
            'cleaning': 'cleaning',
            'cleaning supplies': 'cleaning',
            'disposables': 'disposables',
            'disposable items': 'disposables',
            'misc': 'misc',
            'miscellaneous': 'misc'
        };
        
        return keys[cleanCategory] || 'oils';
    }

    async editItem(id) {
        try {
            console.log('✏️ [INVENTORY] Loading item for edit:', id);
            
            // Get authentication token
            const token = this.getAuthToken();
            if (!token) {
                console.error('❌ [INVENTORY] No authentication token found');
                return;
            }
            
            // Get item from MongoDB API
            const response = await fetch(`${window.API_CONFIG?.BASE_URL || 'http://localhost:4001'}/api/inventory/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                console.error('❌ [INVENTORY] Failed to load item for edit:', response.statusText);
                return;
            }
            
            const result = await response.json();
            const item = result.data;
            if (!item) return;

            this.editingItem = item;
            document.getElementById('inventoryModalTitle').textContent = 'Edit Inventory Item';
            
            // Fill form
            document.getElementById('inventoryName').value = item.name;
            // REMOVED: SKU field population - not needed
            document.getElementById('inventoryCategory').value = this.getCategoryKey(item.category);
            document.getElementById('inventoryStock').value = item.currentStock || item.quantity || 0;
            document.getElementById('inventoryUnit').value = item.unit || 'pieces';
            document.getElementById('inventoryMinStock').value = item.minStock;
            document.getElementById('inventoryPrice').value = item.costPrice || item.unitPrice || 0;
            document.getElementById('inventorySellingPrice').value = item.sellingPrice || item.costPrice || item.unitPrice || 0;
            document.getElementById('inventoryNotes').value = item.notes || '';
            document.getElementById('inventoryLowStockAlert').checked = item.lowStockAlert;
            document.getElementById('inventoryAvailableInPOS').checked = item.availableInPOS || false;

            openModal('inventoryModal');
        } catch (error) {
            if (window.logger) {
                window.logger.error('Failed to edit item', {
                    category: 'INVENTORY',
                    operation: 'edit_item',
                    error: error
                });
            } else {
                console.error('Failed to edit item:', error);
            }
        }
    }

    async deleteItem(id) {
        if (!confirm('Are you sure you want to delete this inventory item?')) {
            return;
        }

        try {
            console.log('🗑️ [INVENTORY] Deleting item:', id);
            
            // Get authentication token
            const token = this.getAuthToken();
            if (!token) {
                console.error('❌ [INVENTORY] No authentication token found');
                return;
            }
            
            // Delete item via MongoDB API
            const response = await fetch(`${window.API_CONFIG?.BASE_URL || 'http://localhost:4001'}/api/inventory/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                console.log('✅ [INVENTORY] Item deleted successfully');
                showNotification('Item deleted successfully', 'success');
                await this.loadInventory();
            } else {
                console.error('❌ [INVENTORY] Failed to delete item:', response.statusText);
                showNotification('Failed to delete item', 'error');
            }
        } catch (error) {
            if (window.logger) {
                window.logger.error('Failed to delete item', {
                    category: 'INVENTORY',
                    operation: 'delete_item',
                    error: error
                });
            } else {
                console.error('Failed to delete item:', error);
            }
            showNotification('Failed to delete item', 'error');
        }
    }

    async saveInventoryItem() {
        // Prevent duplicate submissions
        if (this.isSaving) {
            console.warn('🚫 [INVENTORY] Save already in progress, skipping duplicate submission');
            return;
        }
        this.isSaving = true;

        console.log('💾 [INVENTORY] Starting save process...');

        // Show loading
        const saveBtn = document.querySelector('#inventoryForm button[type="submit"]');
        if (!saveBtn) {
            console.error('❌ [INVENTORY] Save button not found');
            this.isSaving = false;
            return;
        }
        
        const originalText = saveBtn.innerHTML;
        saveBtn.classList.add('loading');
        saveBtn.disabled = true;
        
        showLoading('Saving Supply...');
        
        try {
            // Debug: Check if getDropdownValue function exists
            if (typeof getDropdownValue !== 'function') {
                console.error('❌ [INVENTORY] getDropdownValue function not found');
                throw new Error('getDropdownValue function not available');
            }

            // Get values including custom options with error handling
            console.log('🔍 [INVENTORY] Collecting form values...');
            
            let category, unit, usedIn;
            try {
                category = getDropdownValue('inventoryCategory', 'inventoryCategoryCustom');
                console.log('📊 [INVENTORY] Category collected:', category);
            } catch (error) {
                console.error('❌ [INVENTORY] Failed to get category:', error);
                category = document.getElementById('inventoryCategory')?.value || 'oils';
            }

            try {
                unit = getDropdownValue('inventoryUnit', 'inventoryUnitCustom');
                console.log('📊 [INVENTORY] Unit collected:', unit);
            } catch (error) {
                console.error('❌ [INVENTORY] Failed to get unit:', error);
                unit = document.getElementById('inventoryUnit')?.value || 'pieces';
            }

            try {
                usedIn = getDropdownValue('inventoryUsedIn', 'inventoryUsedInCustom');
                console.log('📊 [INVENTORY] UsedIn collected:', usedIn);
            } catch (error) {
                console.error('❌ [INVENTORY] Failed to get usedIn:', error);
                usedIn = document.getElementById('inventoryUsedIn')?.value || '';
            }
            
            // Get other form values with validation
            const nameEl = document.getElementById('inventoryName');
            const stockEl = document.getElementById('inventoryStock');
            const priceEl = document.getElementById('inventoryPrice');
            const sellingPriceEl = document.getElementById('inventorySellingPrice');
            const minStockEl = document.getElementById('inventoryMinStock');
            
            if (!nameEl || !stockEl || !priceEl || !sellingPriceEl || !minStockEl) {
                throw new Error('Required form elements not found');
            }

            const stockValue = parseInt(stockEl.value || '0');
            const priceValue = parseFloat(priceEl.value || '0');
            const sellingPriceValue = parseFloat(sellingPriceEl.value || '0');
            
            console.log('📊 [INVENTORY] Form values collected:', {
                name: nameEl.value,
                category: category,
                unit: unit,
                stock: stockValue,
                costPrice: priceValue,
                sellingPrice: sellingPriceValue
            });
            
            const itemData = {
                name: nameEl.value,
                // REMOVED: sku field - not needed and causes uniqueness conflicts
                category: category,
                quantity: stockValue, // Keep for compatibility
                currentStock: stockValue, // Required by backend API
                unit: unit,
                minStock: parseInt(minStockEl.value || '0'),
                costPrice: priceValue, // Backend expects costPrice
                sellingPrice: sellingPriceValue, // Backend expects sellingPrice for POS
                price: priceValue, // Keep for compatibility
                unitPrice: priceValue, // Keep for compatibility
                usagePerService: parseFloat(document.getElementById('inventoryUsagePerService')?.value || '0'),
                usedIn: usedIn,
                notes: document.getElementById('inventoryNotes')?.value || '',
                description: document.getElementById('inventoryNotes')?.value || '',
                lowStockAlert: document.getElementById('inventoryLowStockAlert')?.checked || false,
                availableInPOS: document.getElementById('inventoryAvailableInPOS')?.checked || false,
                syncStatus: 'pending',
                modifiedAt: new Date().toISOString()
            };

            // Comprehensive validation
            console.log('🔍 [INVENTORY] Validating form data...');
            
            const validationErrors = [];
            
            if (!itemData.name || itemData.name.trim().length === 0) {
                validationErrors.push('Supply name is required');
            }
            
            if (!itemData.category || itemData.category === '') {
                validationErrors.push('Category is required');
            }
            
            if (!itemData.unit || itemData.unit === '') {
                validationErrors.push('Unit of measurement is required');
            }
            
            if (isNaN(itemData.currentStock) || itemData.currentStock < 0) {
                validationErrors.push('Current stock must be a valid number (0 or greater)');
            }
            
            if (isNaN(itemData.costPrice) || itemData.costPrice < 0) {
                validationErrors.push('Unit cost must be a valid number (0 or greater)');
            }
            
            if (isNaN(itemData.minStock) || itemData.minStock < 0) {
                validationErrors.push('Minimum stock must be a valid number (0 or greater)');
            }
            
            if (validationErrors.length > 0) {
                console.error('❌ [INVENTORY] Validation failed:', validationErrors);
                hideLoading();
                saveBtn.classList.remove('loading');
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
                showNotification('Please fix the following errors:\n• ' + validationErrors.join('\n• '), 'error');
                this.isSaving = false;
                return;
            }
            
            console.log('✅ [INVENTORY] Validation passed');
            console.log('📦 [INVENTORY] Final item data:', itemData);

            // API Call - Use HybridAPIClient for both create and update
            let result;
            
            if (this.editingItem) {
                // Update existing item via HybridAPIClient
                console.log('📝 [INVENTORY] Updating item:', this.editingItem._id || this.editingItem.id);
                
                result = await window.HybridAPIClient.put(`/api/inventory/${this.editingItem._id || this.editingItem.id}`, itemData);
                
            } else {
                // Add new item via HybridAPIClient
                console.log('➕ [INVENTORY] Adding new item');
                itemData.createdAt = new Date().toISOString();
                
                result = await window.HybridAPIClient.post('/api/inventory', itemData);
            }

            // Handle response
            hideLoading();
            saveBtn.classList.remove('loading');
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
            
            console.log('🔄 [INVENTORY] API Response:', result);
            
            if (result.success || result.queued) {
                const action = this.editingItem ? 'updated' : 'added';
                const message = result.queued ? ' (will sync when online)' : '';
                
                console.log(`✅ [INVENTORY] Item ${action} successfully${message}`);
                closeModal('inventoryModal');
                showNotification(`Supply ${action} successfully${message}`, 'success');
                
                // Clear editing state
                this.editingItem = null;
                
            } else {
                console.error('❌ [INVENTORY] Failed to save item:', result.error);
                showNotification('Failed to save item', 'error');
                return;
            }

            await this.loadInventory();
            this.checkLowStock();

            // Reload POS if it's the current page
            if (window.app.currentPage === 'pos') {
                window.loadPOS && window.loadPOS();
            }
        } catch (error) {
            if (window.logger) {
                window.logger.error('Failed to save inventory item', {
                    category: 'INVENTORY',
                    operation: 'save_item',
                    error: error
                });
            } else {
                console.error('Failed to save inventory item:', error);
            }
            hideLoading();
            saveBtn.classList.remove('loading');
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
            
            // Show specific error message if available
            let errorMessage = 'Failed to save supply';
            if (error.message) {
                if (error.message.includes('sku must be unique')) {
                    errorMessage = 'SKU already exists. Please use a different SKU.';
                } else if (error.message.includes('required')) {
                    errorMessage = 'Please fill in all required fields.';
                } else {
                    errorMessage = error.message;
                }
            }
            
            showNotification(errorMessage, 'error');
            
            // Do NOT reset the form or close the modal - keep user's changes
            console.log('🔄 [INVENTORY] Form remains open with user changes preserved');
        } finally {
            // Always reset the saving flag
            this.isSaving = false;
        }
    }

    async adjustStock(id, quickAdjustment = null) {
        console.log('📊 [INVENTORY] Adjusting stock for item:', id);
        
        // Get authentication token
        const token = this.getAuthToken();
        if (!token) {
            console.error('❌ [INVENTORY] No authentication token found');
            return;
        }
        
        // Get item from MongoDB API
        const response = await fetch(`${window.API_CONFIG?.BASE_URL || 'http://localhost:4001'}/api/inventory/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.error('❌ [INVENTORY] Failed to load item for stock adjustment:', response.statusText);
            return;
        }
        
        const result = await response.json();
        const item = result.data;
        if (!item) return;

        const currentStock = item.currentStock || item.quantity || 0;

        if (quickAdjustment !== null) {
            // Quick adjustment (+1 or -1) - direct execution
            const adjustmentValue = quickAdjustment;
            const newStock = currentStock + adjustmentValue;
            
            if (newStock < 0) {
                showNotification('Stock cannot be negative', 'error');
                return;
            }

            // Quick confirm for single unit adjustments
            if (!confirm(`${adjustmentValue > 0 ? 'Add' : 'Remove'} 1 ${item.unit || 'unit'} ${adjustmentValue > 0 ? 'to' : 'from'} ${item.name}?\n\nCurrent: ${currentStock} → New: ${newStock}`)) {
                return;
            }

            // Apply the adjustment directly
            await this.executeStockAdjustment(item, adjustmentValue, currentStock);
        } else {
            // Manual adjustment - show modal
            this.currentAdjustmentItem = item;
            this.currentAdjustmentMode = 'add'; // Default to add mode
            
            // Fill modal with item data
            document.getElementById('stockItemName').textContent = item.name;
            document.getElementById('stockCurrentStock').textContent = currentStock;
            document.getElementById('stockUnit').textContent = ` ${item.unit || 'pcs'}`;
            document.getElementById('stockUnitDisplay').textContent = item.unit || 'pcs';
            document.getElementById('stockAdjustmentValue').value = '';
            
            // Reset to add mode
            this.switchAdjustmentMode('add');
            
            // Show modal
            openModal('stockAdjustmentModal');
        }
    }

    async executeStockAdjustment(item, adjustmentValue, currentStock) {
        const token = this.getAuthToken();
        
        // Apply the adjustment
        item.currentStock = currentStock + adjustmentValue;
        item.quantity = currentStock + adjustmentValue; // Keep for compatibility
        item.modifiedAt = new Date().toISOString();
        item.syncStatus = 'pending';

        // Log the adjustment for analytics
        if (item.adjustmentHistory) {
            item.adjustmentHistory.push({
                date: new Date().toISOString(),
                adjustment: adjustmentValue,
                reason: 'Stock adjustment',
                newStock: currentStock + adjustmentValue
            });
        } else {
            item.adjustmentHistory = [{
                date: new Date().toISOString(),
                adjustment: adjustmentValue,
                reason: 'Stock adjustment',
                newStock: currentStock + adjustmentValue
            }];
        }

        // Update item via MongoDB API
        const updateResponse = await fetch(`${window.API_CONFIG?.BASE_URL || 'http://localhost:4001'}/api/inventory/${item._id || item.id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(item)
        });
        
        if (updateResponse.ok) {
            console.log('✅ [INVENTORY] Stock adjustment successful');
            showNotification(`Stock ${adjustmentValue > 0 ? 'increased' : 'decreased'} successfully`, 'success');
            await this.loadInventory();
            this.checkLowStock();
        } else {
            console.error('❌ [INVENTORY] Failed to update stock:', updateResponse.statusText);
            showNotification('Failed to update stock', 'error');
        }
    }

    switchAdjustmentMode(mode) {
        this.currentAdjustmentMode = mode;
        
        const addTab = document.getElementById('addStockTab');
        const removeTab = document.getElementById('removeStockTab');
        const adjustmentLabel = document.getElementById('adjustmentLabel');
        const adjustmentSign = document.getElementById('adjustmentSign');
        const adjustStockBtn = document.getElementById('adjustStockBtn');
        const quickBtns = document.querySelectorAll('.quick-btn');
        
        if (mode === 'add') {
            // Style add tab as active
            addTab.style.background = 'var(--success-color)';
            addTab.style.color = 'white';
            removeTab.style.background = 'var(--light-gray)';
            removeTab.style.color = 'var(--text-color)';
            
            // Update UI elements
            adjustmentLabel.textContent = 'Amount to Add:';
            adjustmentSign.textContent = '+';
            adjustmentSign.style.color = 'var(--success-color)';
            adjustStockBtn.textContent = 'Add Stock';
            adjustStockBtn.className = 'btn btn-success';
            
            // Update quick buttons
            quickBtns.forEach((btn, index) => {
                const values = [1, 5, 10, 25, 50];
                btn.textContent = `+${values[index]}`;
                btn.style.color = 'var(--success-color)';
                btn.style.borderColor = 'var(--success-color)';
            });
            
        } else {
            // Style remove tab as active
            removeTab.style.background = 'var(--danger-color)';
            removeTab.style.color = 'white';
            addTab.style.background = 'var(--light-gray)';
            addTab.style.color = 'var(--text-color)';
            
            // Update UI elements
            adjustmentLabel.textContent = 'Amount to Remove:';
            adjustmentSign.textContent = '-';
            adjustmentSign.style.color = 'var(--danger-color)';
            adjustStockBtn.textContent = 'Remove Stock';
            adjustStockBtn.className = 'btn btn-danger';
            
            // Update quick buttons
            quickBtns.forEach((btn, index) => {
                const values = [1, 5, 10, 25, 50];
                btn.textContent = `-${values[index]}`;
                btn.style.color = 'var(--danger-color)';
                btn.style.borderColor = 'var(--danger-color)';
            });
        }
        
        // Clear input
        document.getElementById('stockAdjustmentValue').value = '';
    }

    setQuickAdjustment(amount) {
        const input = document.getElementById('stockAdjustmentValue');
        input.value = amount;
        input.focus();
    }

    async handleStockAdjustment() {
        let adjustmentValue = parseInt(document.getElementById('stockAdjustmentValue').value);
        
        if (isNaN(adjustmentValue) || adjustmentValue <= 0) {
            showNotification('Please enter a valid positive amount', 'error');
            return;
        }

        // Apply negative sign for remove mode
        if (this.currentAdjustmentMode === 'remove') {
            adjustmentValue = -adjustmentValue;
        }

        const item = this.currentAdjustmentItem;
        const currentStock = item.currentStock || item.quantity || 0;
        const newStock = currentStock + adjustmentValue;

        if (newStock < 0) {
            showNotification('Insufficient stock to remove this amount', 'error');
            return;
        }

        // Confirm the adjustment
        const action = this.currentAdjustmentMode === 'add' ? 'Add' : 'Remove';
        const absValue = Math.abs(adjustmentValue);
        const confirmMessage = `${action} ${absValue} ${item.unit || 'pcs'} ${this.currentAdjustmentMode === 'add' ? 'to' : 'from'} "${item.name}"?\n\nCurrent Stock: ${currentStock}\nNew Stock: ${newStock}`;
        
        if (!confirm(confirmMessage)) {
            return;
        }

        // Close modal and execute adjustment
        closeModal('stockAdjustmentModal');
        await this.executeStockAdjustment(item, adjustmentValue, currentStock);
    }

    async checkLowStock() {
        console.log('🔍 [INVENTORY] Checking for low stock items...');
        
        // Get authentication token
        const token = this.getAuthToken();
        if (!token) {
            console.error('❌ [INVENTORY] No authentication token found');
            return;
        }
        
        // Get low stock items from MongoDB API
        const response = await fetch(`${window.API_CONFIG?.BASE_URL || 'http://localhost:4001'}/api/inventory/low-stock`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        let lowStockItems = [];
        if (response.ok) {
            const result = await response.json();
            lowStockItems = result.data || [];
        } else {
            console.error('❌ [INVENTORY] Failed to check low stock:', response.statusText);
            return;
        }
        
        if (lowStockItems.length > 0) {
            // Update dashboard if it's active
            if (window.app && window.app.currentPage === 'dashboard') {
                window.updateLowStockAlerts && window.updateLowStockAlerts();
            }
            
            // Show notification for critical items
            const criticalItems = lowStockItems.filter(item => (item.quantity || 0) === 0);
            if (criticalItems.length > 0) {
                showNotification(
                    `${criticalItems.length} item(s) out of stock!`, 
                    'warning'
                );
            }
        }
    }

    // Export inventory to CSV
    exportToCSV() {
        const headers = ['Name', 'Current Stock', 'Min Stock', 'Unit Price', 'Category', 'Status', 'Available in POS'];
        const rows = this.inventory.map(item => [
            item.name,
            item.quantity || 0,
            item.minStock,
            item.costPrice || item.price || item.unitPrice || 0,
            item.category || '',
            this.getStockStatus(item),
            item.availableInPOS ? 'Yes' : 'No'
        ]);

        let csv = headers.join(',') + '\n';
        rows.forEach(row => {
            csv += row.map(field => `"${field}"`).join(',') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventory_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    }

    // Get authentication token from localStorage
    getAuthToken() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.warn('⚠️ [INVENTORY] No auth token found in localStorage');
            return null;
        }
        return token;
    }
}

// Initialize inventory manager
const inventoryManager = new InventoryManager();

// Load inventory when page is shown
window.loadInventory = async function() {
    await inventoryManager.init();
};
