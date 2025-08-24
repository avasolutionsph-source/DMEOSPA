// Products and Services Management
import { logError, logInfo, logDebug } from './utils/logger-helper.js';
import { showSuccess, showError, showInfo } from './utils/notification-manager.js';

class ProductsManager {
    constructor() {
        this.products = [];
        this.editingProduct = null;
    }

    async init() {
        await this.loadProducts();
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (this._listenersAttached) return;
        
        // Check if we're actually on the products page before setting up listeners
        const productsPage = document.getElementById('products');
        if (!productsPage) {
            console.log('🔍 [PRODUCTS] Not on products page, skipping event listener setup');
            return;
        }
        
        this._listenersAttached = true;
        // Add product button
        const addBtn = document.getElementById('addProductBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                // Check plan limits for products/services
                if (window.checkPlanLimits) {
                    window.checkPlanLimits('products').then(limitReached => {
                        if (limitReached) {
                            window.showLimitReachedMessage('products');
                            return;
                        }
                        this.editingProduct = null;
                        document.getElementById('productModalTitle').textContent = 'Add Spa Service';
                        document.getElementById('productForm').reset();
                        // Type is always 'service' for spa, no need to set productType field
                        openModal('productModal');
                    });
                } else {
                    this.editingProduct = null;
                    document.getElementById('productModalTitle').textContent = 'Add Spa Service';
                    document.getElementById('productForm').reset();
                    // Type is always 'service' for spa, no need to set productType field
                    openModal('productModal');
                }
            });
        }

        // Product form submission with double-click protection
        const form = document.getElementById('productForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitBtn = e.target.querySelector('button[type="submit"]');
                if (submitBtn && submitBtn.disabled) return; // Already processing
                await this.saveProduct();
            });
        }
    }

    async loadProducts() {
        try {
            this.products = await window.db.getAll('products');
            this.displayProducts();
        } catch (error) {
            if (window.logger) {
                logError('Failed to load products', {
                    category: 'PRODUCTS',
                    operation: 'load_products',
                    error: error
                });
            } else {
                console.error('Failed to load products:', error);
            }
        }
    }

    displayProducts() {
        const tbody = document.getElementById('productsTableBody');
        if (!tbody) return;

        if (this.products.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 2rem;">
                        No products or services found. Click "Add New" to create one.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.products.map(product => `
            <tr>
                <td>
                    <strong>${product.name}</strong>
                    ${product.description ? `<br><small>${product.description}</small>` : ''}
                </td>
                <td>
                    <span class="badge badge-info">
                        ${product.duration ? product.duration + ' min' : 'N/A'}
                    </span>
                </td>
                <td>${app.formatCurrency(product.price)}</td>
                <td>
                    <span class="badge badge-${product.category === 'massage' ? 'success' : product.category === 'facial' ? 'warning' : 'info'}">
                        ${product.category || 'General'}
                    </span>
                </td>
                <td>
                    <div style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">
                        ${product.description || '-'}
                    </div>
                </td>
                <td>
                    ${product.showInPOS ? 
                        '<i class="fas fa-check" style="color: var(--secondary-color);"></i>' : 
                        '<i class="fas fa-times" style="color: var(--gray-light);"></i>'
                    }
                </td>
                <td>
                    <button class="btn-icon" onclick="productsManager.editProduct(${product.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" onclick="productsManager.deleteProduct(${product.id})" title="Delete">
                        <i class="fas fa-trash" style="color: var(--danger-color);"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async editProduct(id) {
        try {
            const product = await window.db.get('products', id);
            if (!product) return;

            this.editingProduct = product;
            document.getElementById('productModalTitle').textContent = 'Edit Spa Service';
            
            // Fill form
            document.getElementById('productName').value = product.name;
            document.getElementById('productDuration').value = product.duration || '';
            document.getElementById('productPrice').value = product.price;
            document.getElementById('productCategory').value = product.category || 'massage';
            document.getElementById('productDescription').value = product.description || '';
            document.getElementById('productNotes').value = product.notes || '';
            document.getElementById('productShowInPOS').checked = product.showInPOS;

            openModal('productModal');
        } catch (error) {
            if (window.logger) {
                window.logger.error('Failed to edit product', {
                    category: 'PRODUCTS',
                    operation: 'edit_product',
                    error: error
                });
            } else {
                console.error('Failed to edit product:', error);
            }
        }
    }

    async deleteProduct(id) {
        if (!confirm('Are you sure you want to delete this spa service?')) {
            return;
        }

        try {
            await window.db.delete('products', id);
            showSuccess('Product deleted successfully');
            await this.loadProducts();
        } catch (error) {
            if (window.logger) {
                window.logger.error('Failed to delete product', {
                    category: 'PRODUCTS',
                    operation: 'delete_product',
                    error: error
                });
            } else {
                console.error('Failed to delete product:', error);
            }
            showError('Failed to delete product');
        }
    }

    async saveProduct() {
        // Prevent duplicate submissions
        if (this.isSaving) {
            return;
        }
        this.isSaving = true;

        // Show loading
        const saveBtn = document.querySelector('#productForm button[type="submit"]');
        if (!saveBtn) {
            console.error('Save button not found in productForm');
            this.isSaving = false;
            return;
        }
        const originalText = saveBtn.innerHTML;
        saveBtn.classList.add('loading');
        saveBtn.disabled = true;
        
        showLoading('Saving Service...');
        
        try {
            const productData = {
                type: 'service', // Always service for spa
                name: document.getElementById('productName').value,
                duration: parseInt(getDropdownValue('productDuration', 'productDurationCustom') || '0'),
                price: parseFloat(document.getElementById('productPrice').value || '0'),
                category: getDropdownValue('productCategory', 'productCategoryCustom'),
                description: document.getElementById('productDescription').value,
                notes: document.getElementById('productNotes').value,
                showInPOS: document.getElementById('productShowInPOS').checked,
                syncStatus: 'pending',
                modifiedAt: new Date().toISOString()
            };

            if (this.editingProduct) {
                // Update existing product
                productData.id = this.editingProduct.id;
                productData.createdAt = this.editingProduct.createdAt;
                await window.db.update('products', productData);
                
                hideLoading();
                saveBtn.classList.remove('loading');
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
                
                closeModal('productModal');
                showSuccess('Service updated successfully');
            } else {
                // Add new product
                productData.createdAt = new Date().toISOString();
                await window.db.add('products', productData);
                
                hideLoading();
                saveBtn.classList.remove('loading');
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
                
                closeModal('productModal');
                showSuccess('Service added successfully');
            }

            await this.loadProducts();

            // Reload POS if it's the current page
            if (window.app.currentPage === 'pos') {
                window.loadPOS && window.loadPOS();
            }
        } catch (error) {
            if (window.logger) {
                window.logger.error('Failed to save product', {
                    category: 'PRODUCTS',
                    operation: 'save_product',
                    error: error
                });
            } else {
                console.error('Failed to save product:', error);
            }
            hideLoading();
            saveBtn.classList.remove('loading');
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
            showError('Failed to save service');
        } finally {
            // Always reset the saving flag
            this.isSaving = false;
        }
    }

    // Export products to CSV
    exportToCSV() {
        const headers = ['Name', 'Type', 'Price', 'Category', 'Description', 'Show in POS'];
        const rows = this.products.map(p => [
            p.name,
            p.type,
            p.price,
            p.category || '',
            p.description || '',
            p.showInPOS ? 'Yes' : 'No'
        ]);

        let csv = headers.join(',') + '\n';
        rows.forEach(row => {
            csv += row.map(field => `"${field}"`).join(',') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `products_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    }
}

// Initialize products manager
const productsManager = new ProductsManager();

// Load products when page is shown
window.loadProducts = async function() {
    await productsManager.init();
};
