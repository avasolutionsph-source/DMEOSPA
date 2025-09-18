// Products and Services Management


class ProductsManager {
    constructor() {
        this.products = [];
        this.editingProduct = null;
        
        // Pagination for performance on old devices
        this.pageSize = 20;
        this.currentPage = 1;
        this.totalPages = 1;
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
                        // Set default category for new products
                        document.getElementById('productCategory').value = 'massage';
                        // Type is always 'service' for spa, no need to set productType field
                        openModal('productModal');
                    });
                } else {
                    this.editingProduct = null;
                    document.getElementById('productModalTitle').textContent = 'Add Spa Service';
                    document.getElementById('productForm').reset();
                    // Set default category for new products
                    document.getElementById('productCategory').value = 'massage';
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
            console.log('🛍️ [PRODUCTS] Loading products from MongoDB API...');
            
            // Get authentication token
            const token = this.getAuthToken();
            if (!token) {
                console.error('❌ [PRODUCTS] No authentication token found');
                this.products = [];
                this.displayProducts();
                return;
            }
            
            // Use HybridAPIClient for offline support
            const result = await window.HybridAPIClient.getProducts();
            
            if (result.success) {
                this.products = result.data || [];
                console.log(`✅ [PRODUCTS] Loaded ${this.products.length} products from ${result.source || 'API'}`);
            } else {
                console.error('❌ [PRODUCTS] Failed to load products:', result.error);
                this.products = [];
            }
            
            this.displayProducts();
        } catch (error) {
            console.error('❌ [PRODUCTS] Error loading products:', error);
            this.products = [];
            this.displayProducts();
            
            if (window.logger) {
                logError('Failed to load products', {
                    category: 'PRODUCTS',
                    operation: 'load_products',
                    error: error
                });
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
            this.hidePaginationControls();
            return;
        }

        // Calculate pagination
        this.totalPages = Math.ceil(this.products.length / this.pageSize);
        this.currentPage = Math.min(this.currentPage, this.totalPages);
        
        // Get products for current page
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageProducts = this.products.slice(startIndex, endIndex);

        tbody.innerHTML = pageProducts.map(product => `
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
                    ${product.showInPOS !== false ? 
                        '<i class="fas fa-check" style="color: var(--secondary-color);"></i>' : 
                        '<i class="fas fa-times" style="color: var(--gray-light);"></i>'
                    }
                </td>
                <td>
                    <button class="btn-icon" onclick="productsManager.editProduct('${product._id || product.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" onclick="productsManager.deleteProduct('${product._id || product.id}')" title="Delete">
                        <i class="fas fa-trash" style="color: var(--danger-color);"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
        // Update pagination controls
        this.updatePaginationControls();
    }
    
    updatePaginationControls() {
        let paginationContainer = document.getElementById('productsPagination');
        
        // Create pagination container if it doesn't exist
        if (!paginationContainer) {
            const productsTable = document.getElementById('productsTableBody')?.closest('table');
            if (!productsTable) return;
            
            paginationContainer = document.createElement('div');
            paginationContainer.id = 'productsPagination';
            paginationContainer.className = 'pagination-controls';
            paginationContainer.style.cssText = `
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 10px;
                margin-top: 20px;
                padding: 10px;
            `;
            productsTable.parentElement.appendChild(paginationContainer);
        }
        
        // Show pagination only if more than one page
        if (this.totalPages <= 1) {
            paginationContainer.style.display = 'none';
            return;
        }
        
        paginationContainer.style.display = 'flex';
        paginationContainer.innerHTML = `
            <button class="btn btn-sm" onclick="productsManager.goToPage(1)" 
                    ${this.currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-angle-double-left"></i>
            </button>
            <button class="btn btn-sm" onclick="productsManager.previousPage()" 
                    ${this.currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-angle-left"></i>
            </button>
            <span style="margin: 0 10px;">
                Page ${this.currentPage} of ${this.totalPages} 
                (${this.products.length} items)
            </span>
            <button class="btn btn-sm" onclick="productsManager.nextPage()" 
                    ${this.currentPage === this.totalPages ? 'disabled' : ''}>
                <i class="fas fa-angle-right"></i>
            </button>
            <button class="btn btn-sm" onclick="productsManager.goToPage(${this.totalPages})" 
                    ${this.currentPage === this.totalPages ? 'disabled' : ''}>
                <i class="fas fa-angle-double-right"></i>
            </button>
        `;
    }
    
    hidePaginationControls() {
        const paginationContainer = document.getElementById('productsPagination');
        if (paginationContainer) {
            paginationContainer.style.display = 'none';
        }
    }
    
    // Pagination methods
    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.displayProducts();
        }
    }
    
    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.displayProducts();
        }
    }
    
    goToPage(page) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.displayProducts();
        }
    }

    async editProduct(id) {
        try {
            console.log('✏️ [PRODUCTS] Loading product for edit:', id);
            
            // Get authentication token
            const token = this.getAuthToken();
            if (!token) {
                console.error('❌ [PRODUCTS] No authentication token found');
                return;
            }
            
            // Get product from MongoDB API
            const response = await fetch(`${window.API_CONFIG?.BASE_URL || 'https://daetspa-backend.onrender.com'}/api/products/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                console.error('❌ [PRODUCTS] Failed to load product for edit:', response.statusText);
                return;
            }
            
            const result = await response.json();
            const product = result.data;
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
            console.log('🗑️ [PRODUCTS] Deleting product:', id);
            
            // Get authentication token
            const token = this.getAuthToken();
            if (!token) {
                console.error('❌ [PRODUCTS] No authentication token found');
                return;
            }
            
            // Delete product via MongoDB API
            const response = await fetch(`${window.API_CONFIG?.BASE_URL || 'https://daetspa-backend.onrender.com'}/api/products/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                console.log('✅ [PRODUCTS] Product deleted successfully');
                showSuccess('Product deleted successfully');
                await this.loadProducts();
            } else {
                console.error('❌ [PRODUCTS] Failed to delete product:', response.statusText);
                showError('Failed to delete product');
            }
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

        // Show loading - check multiple selectors for submit button
        let saveBtn = document.querySelector('#productForm button[type="submit"]');
        if (!saveBtn) {
            // Try alternative selector for button with form attribute
            saveBtn = document.querySelector('button[form="productForm"][type="submit"]');
        }
        if (!saveBtn) {
            // Try broader selector
            saveBtn = document.querySelector('button[type="submit"]');
            console.warn('Using fallback submit button selector');
        }
        if (!saveBtn) {
            console.error('Save button not found in productForm with any selector');
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
                category: getDropdownValue('productCategory', 'productCategoryCustom') || 'massage', // Default to massage if empty
                description: document.getElementById('productDescription').value,
                notes: document.getElementById('productNotes').value,
                showInPOS: document.getElementById('productShowInPOS') ? document.getElementById('productShowInPOS').checked : true,
                syncStatus: 'pending',
                modifiedAt: new Date().toISOString()
            };

            if (this.editingProduct) {
                // Update existing product via MongoDB API
                console.log('📝 [PRODUCTS] Updating product:', this.editingProduct._id || this.editingProduct.id);
                
                // Get authentication token
                const token = this.getAuthToken();
                if (!token) {
                    console.error('❌ [PRODUCTS] No authentication token found');
                    hideLoading();
                    saveBtn.classList.remove('loading');
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = originalText;
                    return;
                }
                
                const response = await fetch(`${window.API_CONFIG?.BASE_URL || 'https://daetspa-backend.onrender.com'}/api/products/${this.editingProduct._id || this.editingProduct.id}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(productData)
                });
                
                hideLoading();
                saveBtn.classList.remove('loading');
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
                
                if (response.ok) {
                    console.log('✅ [PRODUCTS] Product updated successfully');
                    closeModal('productModal');
                    showSuccess('Service updated successfully');
                } else {
                    // Get detailed error message for user
                    let errorDetails = '';
                    try {
                        const errorData = await response.json();
                        errorDetails = errorData.message || errorData.error || '';
                        console.error('❌ [PRODUCTS] Failed to update product:', {
                            status: response.status,
                            statusText: response.statusText,
                            error: errorData
                        });
                    } catch (e) {
                        // If can't parse JSON, use status text
                        errorDetails = response.statusText;
                        console.error('❌ [PRODUCTS] Failed to update product:', response.statusText);
                    }
                    
                    // Show specific user-friendly message based on status
                    if (response.status === 401) {
                        showError('Please login again to update services');
                    } else if (response.status === 400) {
                        showError(`Cannot update service: ${errorDetails}`);
                    } else if (response.status === 404) {
                        showError('Service not found. It may have been deleted.');
                    } else if (response.status === 500) {
                        showError('Server error. Please try again later.');
                    } else {
                        showError(`Failed to update service: ${errorDetails}`);
                    }
                    return;
                }
            } else {
                // Add new product via MongoDB API
                console.log('➕ [PRODUCTS] Adding new product');
                productData.createdAt = new Date().toISOString();
                
                // Get authentication token
                const token = this.getAuthToken();
                if (!token) {
                    console.error('❌ [PRODUCTS] No authentication token found');
                    hideLoading();
                    saveBtn.classList.remove('loading');
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = originalText;
                    return;
                }
                
                const response = await fetch(`${window.API_CONFIG?.BASE_URL || 'https://daetspa-backend.onrender.com'}/api/products`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(productData)
                });
                
                hideLoading();
                saveBtn.classList.remove('loading');
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
                
                if (response.ok) {
                    console.log('✅ [PRODUCTS] Product added successfully');
                    closeModal('productModal');
                    showSuccess('Service added successfully');
                } else {
                    // Get detailed error message for user
                    let errorDetails = '';
                    try {
                        const errorData = await response.json();
                        errorDetails = errorData.message || errorData.error || '';
                        console.error('❌ [PRODUCTS] Failed to add product:', {
                            status: response.status,
                            statusText: response.statusText,
                            error: errorData
                        });
                    } catch (e) {
                        // If can't parse JSON, use status text
                        errorDetails = response.statusText;
                        console.error('❌ [PRODUCTS] Failed to add product:', response.statusText);
                    }
                    
                    // Show specific user-friendly message based on status
                    if (response.status === 401) {
                        showError('Please login again to add services');
                    } else if (response.status === 400) {
                        showError(`Cannot add service: ${errorDetails}`);
                    } else if (response.status === 500) {
                        showError('Server error. Please try again later.');
                    } else {
                        showError(`Failed to add service: ${errorDetails}`);
                    }
                    return;
                }
            }

            // Force a complete refresh of products data
            await this.loadProducts();
            
            // Force immediate re-render to ensure UI updates
            setTimeout(() => {
                this.displayProducts();
            }, 100);

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

    // Get authentication token from localStorage
    getAuthToken() {
        let token = localStorage.getItem('authToken');
        
        // SECURITY FIX: Removed development token generation to prevent cross-user data access
        if (!token && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
            console.log('🚨 [PRODUCTS] No auth token found - user must login properly for security');
            console.log('🔐 [PRODUCTS] Development tokens disabled to prevent data contamination');
        }
        
        if (!token) {
            console.warn('⚠️ [PRODUCTS] No auth token found in localStorage');
            return null;
        }
        return token;
    }
}

// Initialize products manager
const productsManager = new ProductsManager();

// Load products when page is shown
window.loadProducts = async function() {
    await productsManager.init();
};
