// Inventory Management
import { logError, logInfo } from './utils/logger-helper.js';
import { showSuccess, showError } from './utils/notification-manager.js';

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
            this.inventory = await db.getAll('inventory');
            this.displayInventory();
        } catch (error) {
            if (// logger) {
                // logger.error('Failed to load inventory', {
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
                    <td colspan="7" style="text-align: center; padding: 2rem;">
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
                            ${item.sku ? `<br><small style="color: var(--gray);">SKU: ${item.sku}</small>` : ''}
                            ${item.notes ? `<br><small style="color: var(--gray);">${item.notes}</small>` : ''}
                        </td>
                        <td>
                            <span class="badge badge-${this.getCategoryColor(item.category)}">
                                ${this.getCategoryName(item.category)}
                            </span>
                        </td>
                        <td>
                            <strong>${item.quantity || 0}</strong>
                            ${(item.quantity || 0) <= item.minStock ? 
                                ' <i class="fas fa-exclamation-triangle" style="color: var(--warning-color);"></i>' : ''
                            }
                        </td>
                        <td>${item.unit || 'pcs'}</td>
                        <td>${item.minStock}</td>
                        <td>${statusBadge}</td>
                        <td>
                            <div class="stock-actions">
                                <button class="stock-btn minus" onclick="inventoryManager.adjustStock(${item.id}, -1)" title="Remove 1">
                                    <i class="fas fa-minus"></i>
                                </button>
                                <button class="stock-btn plus" onclick="inventoryManager.adjustStock(${item.id}, 1)" title="Add 1">
                                    <i class="fas fa-plus"></i>
                                </button>
                                <button class="btn-icon" onclick="inventoryManager.adjustStock(${item.id})" title="Adjust Stock">
                                    <i class="fas fa-boxes"></i>
                                </button>
                                <button class="btn-icon" onclick="inventoryManager.editItem(${item.id})" title="Edit">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn-icon" onclick="inventoryManager.deleteItem(${item.id})" title="Delete">
                                    <i class="fas fa-trash" style="color: var(--danger-color);"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
    }

    getStockStatus(item) {
        const stock = item.quantity || 0;
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
        const names = {
            'oils': 'Essential Oils',
            'lotions': 'Lotions & Creams',
            'towels': 'Towels & Linens',
            'candles': 'Candles',
            'tools': 'Tools',
            'skincare': 'Skincare',
            'cleaning': 'Cleaning',
            'disposables': 'Disposables',
            'misc': 'Miscellaneous'
        };
        return names[category] || category;
    }

    async editItem(id) {
        try {
            const item = await db.get('inventory', id);
            if (!item) return;

            this.editingItem = item;
            document.getElementById('inventoryModalTitle').textContent = 'Edit Inventory Item';
            
            // Fill form
            document.getElementById('inventoryName').value = item.name;
            document.getElementById('inventorySku').value = item.sku || '';
            document.getElementById('inventoryCategory').value = item.category || 'oils';
            document.getElementById('inventoryStock').value = item.quantity || 0;
            document.getElementById('inventoryUnit').value = item.unit || 'pieces';
            document.getElementById('inventoryMinStock').value = item.minStock;
            document.getElementById('inventoryPrice').value = item.unitPrice;
            document.getElementById('inventoryNotes').value = item.notes || '';
            document.getElementById('inventoryLowStockAlert').checked = item.lowStockAlert;

            openModal('inventoryModal');
        } catch (error) {
            if (// logger) {
                // logger.error('Failed to edit item', {
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
            await db.delete('inventory', id);
            showNotification('Item deleted successfully', 'success');
            await this.loadInventory();
        } catch (error) {
            if (// logger) {
                // logger.error('Failed to delete item', {
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
            return;
        }
        this.isSaving = true;

        // Show loading
        const saveBtn = document.querySelector('#inventoryForm button[type="submit"]');
        const originalText = saveBtn.innerHTML;
        saveBtn.classList.add('loading');
        saveBtn.disabled = true;
        
        showLoading('Saving Supply...');
        
        try {
            // Get values including custom options
            const category = getDropdownValue('inventoryCategory', 'inventoryCategoryCustom');
            const unit = getDropdownValue('inventoryUnit', 'inventoryUnitCustom');
            const usedIn = getDropdownValue('inventoryUsedIn', 'inventoryUsedInCustom');
            
            const rawSku = document.getElementById('inventorySku').value || '';
            const normalizedSku = rawSku.trim() === '' ? undefined : rawSku.trim();

            const itemData = {
                name: document.getElementById('inventoryName').value,
                sku: normalizedSku,
                category: category,
                quantity: parseInt(document.getElementById('inventoryStock').value || '0'), // Primary field
                unit: unit,
                minStock: parseInt(document.getElementById('inventoryMinStock').value || '0'),
                price: parseFloat(document.getElementById('inventoryPrice').value || '0'),
                unitPrice: parseFloat(document.getElementById('inventoryPrice').value || '0'), // Keep for compatibility
                usagePerService: parseFloat(document.getElementById('inventoryUsagePerService').value || '0'),
                usedIn: usedIn,
                notes: document.getElementById('inventoryNotes').value,
                description: document.getElementById('inventoryNotes').value,
                lowStockAlert: document.getElementById('inventoryLowStockAlert').checked,
                syncStatus: 'pending',
                modifiedAt: new Date().toISOString()
            };

            if (this.editingItem) {
                // Update existing item
                itemData.id = this.editingItem.id;
                itemData.createdAt = this.editingItem.createdAt;
                await db.update('inventory', itemData);
                
                hideLoading();
                saveBtn.classList.remove('loading');
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
                
                closeModal('inventoryModal');
                showNotification('Supply updated successfully', 'success');
            } else {
                // Add new item
                itemData.createdAt = new Date().toISOString();
                await db.add('inventory', itemData);
                
                hideLoading();
                saveBtn.classList.remove('loading');
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
                
                closeModal('inventoryModal');
                showNotification('Supply added successfully', 'success');
            }

            await this.loadInventory();
            this.checkLowStock();

            // Reload POS if it's the current page
            if (window.app.currentPage === 'pos') {
                window.loadPOS && window.loadPOS();
            }
        } catch (error) {
            if (// logger) {
                // logger.error('Failed to save inventory item', {
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
            showNotification('Failed to save supply', 'error');
        } finally {
            // Always reset the saving flag
            this.isSaving = false;
        }
    }

    async adjustStock(id, quickAdjustment = null) {
        const item = await db.get('inventory', id);
        if (!item) return;

        let adjustmentValue;
        const currentStock = item.quantity || 0;

        if (quickAdjustment !== null) {
            // Quick adjustment (+1 or -1)
            adjustmentValue = quickAdjustment;
            
            // Quick validation
            const newStock = currentStock + adjustmentValue;
            if (newStock < 0) {
                showNotification('Stock cannot be negative', 'error');
                return;
            }

            // Quick confirm for single unit adjustments
            if (!confirm(`${adjustmentValue > 0 ? 'Add' : 'Remove'} 1 ${item.unit || 'unit'} ${adjustmentValue > 0 ? 'to' : 'from'} ${item.name}?\n\nCurrent: ${currentStock} → New: ${newStock}`)) {
                return;
            }
        } else {
            // Manual adjustment input
            const adjustment = prompt(`Adjust stock for ${item.name}\nCurrent stock: ${currentStock}\nEnter adjustment (use - for decrease):`);
            
            if (adjustment === null || adjustment === '') return;

            adjustmentValue = parseInt(adjustment);
            if (isNaN(adjustmentValue)) {
                showNotification('Invalid adjustment value', 'error');
                return;
            }

            const newStock = currentStock + adjustmentValue;
            if (newStock < 0) {
                showNotification('Stock cannot be negative', 'error');
                return;
            }

            // Confirm the adjustment
            if (!confirm(`Confirm stock adjustment:\n\nItem: ${item.name}\nCurrent Stock: ${currentStock}\nAdjustment: ${adjustmentValue > 0 ? '+' : ''}${adjustmentValue}\nNew Stock: ${newStock}\n\nProceed with this adjustment?`)) {
                return;
            }
        }

        // Apply the adjustment
        item.quantity = currentStock + adjustmentValue;
        item.modifiedAt = new Date().toISOString();
        item.syncStatus = 'pending';

        // Log the adjustment for analytics
        if (item.adjustmentHistory) {
            item.adjustmentHistory.push({
                date: new Date().toISOString(),
                adjustment: adjustmentValue,
                reason: quickAdjustment !== null ? 'Quick adjustment' : 'Manual adjustment',
                newStock: currentStock + adjustmentValue
            });
        } else {
            item.adjustmentHistory = [{
                date: new Date().toISOString(),
                adjustment: adjustmentValue,
                reason: quickAdjustment !== null ? 'Quick adjustment' : 'Manual adjustment',
                newStock: currentStock + adjustmentValue
            }];
        }

        await db.update('inventory', item);
        showNotification(`Stock ${adjustmentValue > 0 ? 'increased' : 'decreased'} successfully`, 'success');
        await this.loadInventory();
        this.checkLowStock();
    }

    async checkLowStock() {
        const lowStockItems = await db.getLowStockItems();
        
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
        const headers = ['Name', 'SKU', 'Current Stock', 'Min Stock', 'Unit Price', 'Category', 'Status'];
        const rows = this.inventory.map(item => [
            item.name,
            item.sku,
            item.quantity || 0,
            item.minStock,
            item.price || item.unitPrice || 0,
            item.category || '',
            this.getStockStatus(item)
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
}

// Initialize inventory manager
const inventoryManager = new InventoryManager();

// Load inventory when page is shown
window.loadInventory = async function() {
    await inventoryManager.init();
};
