// Products and Services Management


class ProductsManager {
    constructor() {
        this.products = [];
        this.editingProduct = null;
        
        // Pagination for performance on old devices
        this.pageSize = 20;
        this.currentPage = 1;
        this.totalPages = 1;
        this.isReorderMode = false;
        
        // Service inventory items
        this.serviceItems = [];
        this.availableInventory = [];
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
                        // Clear service items for new service
                        this.clearServiceItems();
                        // Type is always 'service' for spa, no need to set productType field
                        openModal('productModal');
                    });
                } else {
                    this.editingProduct = null;
                    document.getElementById('productModalTitle').textContent = 'Add Spa Service';
                    document.getElementById('productForm').reset();
                    // Set default category for new products
                    document.getElementById('productCategory').value = 'massage';
                    // Clear service items for new service
                    this.clearServiceItems();
                    // Type is always 'service' for spa, no need to set productType field
                    openModal('productModal');
                }
            });
        }

        // Reorder mode toggle button
        const reorderBtn = document.getElementById('reorderModeBtn');
        if (reorderBtn) {
            reorderBtn.addEventListener('click', () => {
                this.toggleReorderMode();
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

        // Add Item button for service inventory items
        const addItemBtn = document.getElementById('addItemUsedBtn');
        if (addItemBtn) {
            addItemBtn.addEventListener('click', () => {
                this.showItemSelectionModal();
            });
        }
    }

    toggleReorderMode() {
        this.isReorderMode = !this.isReorderMode;
        
        const reorderBtn = document.getElementById('reorderModeBtn');
        const dragHandleHeader = document.getElementById('dragHandleHeader');
        const tableContainer = document.querySelector('.products-table-container');
        
        if (this.isReorderMode) {
            // Enter reorder mode
            reorderBtn.innerHTML = '<i class="fas fa-check"></i> Done Reordering';
            reorderBtn.className = 'btn btn-success';
            dragHandleHeader.style.display = 'table-cell';
            
            // Add visual indicators
            if (tableContainer) {
                tableContainer.classList.add('reorder-mode-active');
            }
            
            // Add reorder mode banner
            this.showReorderBanner(true);
            
            console.log('🔄 [PRODUCTS] Reorder mode activated');
        } else {
            // Exit reorder mode
            reorderBtn.innerHTML = '<i class="fas fa-arrows-alt"></i> Reorder Services';
            reorderBtn.className = 'btn btn-secondary';
            dragHandleHeader.style.display = 'none';
            
            // Remove visual indicators
            if (tableContainer) {
                tableContainer.classList.remove('reorder-mode-active');
            }
            
            // Remove reorder mode banner
            this.showReorderBanner(false);
            
            console.log('🔄 [PRODUCTS] Reorder mode deactivated');
        }
        
        // Re-render the table to show/hide drag handles
        this.displayProducts();
    }

    showReorderBanner(show) {
        let banner = document.getElementById('reorderModeBanner');
        
        if (show) {
            if (!banner) {
                banner = document.createElement('div');
                banner.id = 'reorderModeBanner';
                banner.className = 'reorder-mode-banner';
                banner.innerHTML = '<i class="fas fa-arrows-alt"></i> Reorder Mode Active - Drag services to rearrange them';
                
                const tableContainer = document.querySelector('.products-table-container');
                if (tableContainer) {
                    tableContainer.parentNode.insertBefore(banner, tableContainer);
                }
            }
            banner.style.display = 'block';
        } else {
            if (banner) {
                banner.style.display = 'none';
            }
        }
    }

    initDragAndDrop() {
        const tbody = document.getElementById('productsTableBody');
        if (!tbody || !window.Sortable) {
            console.log('🔍 [PRODUCTS] Sortable.js not available or tbody not found');
            return;
        }

        // Destroy existing sortable instance if it exists
        if (this.sortable) {
            this.sortable.destroy();
            this.sortable = null;
        }

        // Only initialize sortable in reorder mode
        if (!this.isReorderMode) {
            return;
        }

        // Initialize sortable with drag handle and comprehensive error handling
        try {
            this.sortable = Sortable.create(tbody, {
                handle: '.drag-handle',
                animation: 150,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                onStart: (evt) => {
                    console.log('🔄 [PRODUCTS] Started dragging item:', evt.oldIndex);
                    console.log('🔍 [PRODUCTS] Drag start event details:', {
                        oldIndex: evt.oldIndex,
                        item: evt.item,
                        from: evt.from,
                        target: evt.target,
                        type: evt.type
                    });
                    document.body.classList.add('is-dragging');
                },
                onEnd: async (evt) => {
                    console.log('🔄 [PRODUCTS] Finished dragging item:', evt.oldIndex, '->', evt.newIndex);
                    console.log('🔍 [PRODUCTS] Drag end event details:', {
                        oldIndex: evt.oldIndex,
                        newIndex: evt.newIndex,
                        item: evt.item,
                        from: evt.from,
                        to: evt.to,
                        type: evt.type
                    });
                    document.body.classList.remove('is-dragging');
                    
                    if (evt.oldIndex !== evt.newIndex) {
                        try {
                            await this.handleReorder(evt.oldIndex, evt.newIndex);
                        } catch (error) {
                            console.error('❌ [PRODUCTS] Error in handleReorder:', error);
                            showError('Failed to reorder services: ' + error.message);
                        }
                    }
                },
                onError: (evt) => {
                    console.error('❌ [PRODUCTS] SortableJS error:', evt);
                    showError('Drag and drop error occurred');
                },
                onMove: (evt) => {
                    console.log('🔄 [PRODUCTS] Move event:', {
                        dragged: evt.dragged,
                        related: evt.related,
                        willInsertAfter: evt.willInsertAfter
                    });
                    return true; // Allow the move
                }
            });
            
            console.log('✅ [PRODUCTS] SortableJS initialized successfully');
        } catch (error) {
            console.error('❌ [PRODUCTS] Failed to initialize SortableJS:', error);
            showError('Failed to initialize drag-and-drop functionality');
        }
    }

    async handleReorder(oldIndex, newIndex) {
        try {
            console.log('🔄 [PRODUCTS] ===== REORDER OPERATION START =====');
            console.log('🔍 [PRODUCTS] Input parameters:', { oldIndex, newIndex });
            console.log('🔍 [PRODUCTS] Current products array length:', this.products.length);
            console.log('🔍 [PRODUCTS] API Config Base URL:', window.API_CONFIG?.BASE_URL);
            console.log('🔍 [PRODUCTS] Browser online status:', navigator.onLine);
            console.log('🔍 [PRODUCTS] Current hostname:', window.location.hostname);
            
            showLoading('Reordering services...');

            // Calculate new order values for all products
            const reorderedProducts = [...this.products];
            console.log('🔍 [PRODUCTS] Original products before reorder:', this.products.map(p => ({ name: p.name, id: p._id || p.id, sortOrder: p.sortOrder })));
            
            const [movedItem] = reorderedProducts.splice(oldIndex, 1);
            reorderedProducts.splice(newIndex, 0, movedItem);
            
            console.log('🔍 [PRODUCTS] Moved item details:', {
                name: movedItem.name,
                _id: movedItem._id,
                id: movedItem.id,
                originalSortOrder: movedItem.sortOrder
            });

            // Assign new sort orders with enhanced ID handling and validation
            const updateData = reorderedProducts.map((product, index) => {
                // Prioritize _id over id for MongoDB compatibility
                let productId = product._id || product.id;
                
                // Ensure ID is a string and trim whitespace
                if (productId && typeof productId === 'object' && productId.toString) {
                    productId = productId.toString();
                }
                if (typeof productId === 'string') {
                    productId = productId.trim();
                }
                
                // Enhanced logging for debugging
                console.log(`🔍 [PRODUCTS] Product ${index}:`, {
                    name: product.name,
                    originalId: product.id,
                    originalObjectId: product._id,
                    finalId: productId,
                    sortOrder: index,
                    idType: typeof productId,
                    idLength: productId?.length,
                    isValidString: typeof productId === 'string' && productId.length > 0
                });
                
                return {
                    id: productId,
                    sortOrder: index
                };
            });
            
            console.log('🔍 [PRODUCTS] Final update data to send:', updateData);

            // Enhanced ID validation before sending
            const invalidIds = updateData.filter(item => {
                const hasValidId = item.id && 
                                 typeof item.id === 'string' && 
                                 item.id.trim().length > 0 &&
                                 item.id.trim().length >= 12; // MongoDB ObjectId minimum length
                return !hasValidId;
            });
            
            if (invalidIds.length > 0) {
                hideLoading();
                console.error('❌ [PRODUCTS] Invalid product IDs found:', {
                    invalidItems: invalidIds,
                    totalItems: updateData.length,
                    invalidCount: invalidIds.length
                });
                console.error('❌ [PRODUCTS] Full updateData for debugging:', updateData);
                showError(`${invalidIds.length} product(s) have invalid IDs. Please refresh the page and try again.`);
                this.displayProducts(); // Revert display
                return;
            }
            
            console.log('✅ [PRODUCTS] All product IDs validated successfully');

            // Send reorder request via HybridAPIClient for offline support
            console.log('🚀 [PRODUCTS] Sending reorder request to API...');
            console.log('🔍 [PRODUCTS] Request payload:', JSON.stringify(updateData, null, 2));
            console.log('🔥 [FRONTEND] FINAL REQUEST DETAILS:');
            console.log('🔥 [FRONTEND] updateData:', updateData);
            console.log('🔥 [FRONTEND] updateData stringified:', JSON.stringify(updateData));
            console.log('🔥 [FRONTEND] updateData length:', updateData.length);
            console.log('🔥 [FRONTEND] First item structure:', updateData[0]);
            console.log('🔥 [FRONTEND] API Base URL:', window.API_CONFIG?.BASE_URL);
            console.log('🔥 [FRONTEND] Auth token exists:', !!localStorage.getItem('authToken'));
            
            const requestStartTime = Date.now();
            const result = await window.HybridAPIClient.reorderProducts(updateData);
            const requestEndTime = Date.now();
            
            console.log('🔍 [PRODUCTS] API request completed in:', (requestEndTime - requestStartTime), 'ms');
            console.log('🔍 [PRODUCTS] API response:', JSON.stringify(result, null, 2));
            console.log('🔄 [PRODUCTS] ===== REORDER OPERATION END =====');
            
            hideLoading();

            if (result.success) {
                // Update local products array with new order
                this.products = reorderedProducts.map((product, index) => ({
                    ...product,
                    sortOrder: index
                }));
                
                console.log('✅ [PRODUCTS] Services reordered successfully');
                
                if (result.source === 'offline_queue') {
                    showSuccess('Services reordered (will sync when online)');
                } else {
                    const modified = result.data?.modified || 0;
                    const requested = result.data?.requested || updateData.length;
                    showSuccess(`Services reordered successfully (${modified}/${requested} updated)`);
                }
                
                // Force refresh to ensure consistency
                setTimeout(() => this.loadProducts(), 500);
            } else {
                console.error('❌ [PRODUCTS] Failed to reorder services:', result.error);
                
                // Enhanced error handling with detailed diagnostics
                let errorMessage = 'Failed to reorder services';
                let shouldRetry = false;
                let errorCode = result.error?.code || 'UNKNOWN_ERROR';
                
                console.log('🔍 [PRODUCTS] Detailed error analysis:', {
                    fullError: result.error,
                    errorCode: errorCode,
                    hasDetails: !!result.error?.details,
                    detailsCount: result.error?.details?.length || 0,
                    errorMessage: result.error?.message
                });
                
                if (result.error?.details && Array.isArray(result.error.details)) {
                    // Show specific validation errors
                    errorMessage = `Reorder validation failed:\n${result.error.details.slice(0, 3).join('\n')}`;
                    if (result.error.details.length > 3) {
                        errorMessage += `\n... and ${result.error.details.length - 3} more error(s)`;
                    }
                } else if (result.error?.message) {
                    // Show general error message
                    errorMessage = result.error.message;
                    
                    // Check if this is a network or temporary error
                    if (result.error.message.includes('fetch') || 
                        result.error.message.includes('network') ||
                        result.error.message.includes('timeout') ||
                        result.error.message.includes('500') ||
                        result.error.message.includes('502') ||
                        result.error.message.includes('503')) {
                        shouldRetry = true;
                    }
                }
                
                // Special handling for mysterious "Invalid_id_reorder" error
                if (errorMessage.includes('Invalid_id_reorder') || errorMessage.includes('invalid_id')) {
                    console.warn('🔍 [PRODUCTS] Detected mysterious "Invalid_id_reorder" error - adding debugging info');
                    console.log('🔍 [PRODUCTS] Error source analysis:', {
                        fullError: result.error,
                        errorMessage: errorMessage,
                        updateData: updateData,
                        currentURL: window.location.href,
                        apiBaseURL: window.API_CONFIG?.BASE_URL
                    });
                    
                    errorMessage = 'Service reordering failed due to ID validation. Please refresh the page and try again.';
                    shouldRetry = false; // Don't auto-retry validation errors
                }
                
                if (shouldRetry) {
                    // Show error with retry option
                    if (confirm(`${errorMessage}\n\nWould you like to retry?`)) {
                        console.log('🔄 [PRODUCTS] User requested retry, attempting reorder again...');
                        await this.handleReorder(oldIndex, newIndex);
                        return;
                    }
                }
                
                showError(errorMessage);
                this.displayProducts(); // Revert display
            }
        } catch (error) {
            console.error('❌ [PRODUCTS] Unexpected error during reorder operation:', error);
            console.log('🔍 [PRODUCTS] Exception details:', {
                name: error.name,
                message: error.message,
                stack: error.stack,
                oldIndex: oldIndex,
                newIndex: newIndex,
                productsLength: this.products?.length
            });
            
            hideLoading();
            
            // Check if this is the mysterious error appearing as an exception
            if (error.message && (error.message.includes('Invalid_id_reorder') || error.message.includes('invalid_id'))) {
                console.warn('🔍 [PRODUCTS] The mysterious "Invalid_id_reorder" error appeared as an exception!');
                console.log('🔍 [PRODUCTS] This suggests the error is coming from outside our codebase');
                showError('Service reordering failed due to external validation. Please refresh the page and try again.');
            } else {
                showError('Unexpected error occurred while reordering services');
            }
            
            this.displayProducts(); // Revert display
            
            if (window.logger) {
                window.logger.error('Failed to reorder services', {
                    category: 'PRODUCTS',
                    operation: 'reorder_services',
                    error: error
                });
            }
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

        tbody.innerHTML = pageProducts.map(product => {
            // Ensure we use a consistent ID format
            const productId = product._id || product.id;
            return `
            <tr data-id="${productId}">
                ${this.isReorderMode ? `
                    <td style="text-align: center; cursor: grab;" class="drag-handle">
                        <i class="fas fa-grip-vertical" style="color: #ccc; font-size: 14px;"></i>
                    </td>
                ` : ''}
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
                    <button class="btn-icon" onclick="productsManager.editProduct('${productId}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" onclick="productsManager.deleteProduct('${productId}')" title="Delete">
                        <i class="fas fa-trash" style="color: var(--danger-color);"></i>
                    </button>
                </td>
            </tr>
            `;
        }).join('');
        
        // Update pagination controls
        this.updatePaginationControls();
        
        // Re-initialize drag and drop after content update (only in reorder mode)
        if (this.products.length > 0) {
            setTimeout(() => this.initDragAndDrop(), 100);
        }
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

            // Load existing service items
            this.serviceItems = product.itemsUsed ? [...product.itemsUsed] : [];
            this.displayServiceItems();

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
                itemsUsed: [...this.serviceItems], // Include items used in this service
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
                    this.clearServiceItems(); // Clear items after successful save
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
                    this.clearServiceItems(); // Clear items after successful save
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

    // Service Items Management Methods
    async showItemSelectionModal() {
        try {
            console.log('📦 [PRODUCTS] Loading inventory for item selection...');
            
            // Load available inventory items
            await this.loadAvailableInventory();
            
            if (this.availableInventory.length === 0) {
                showError('No inventory items found. Please add inventory items first.');
                return;
            }

            // Create and show item selection modal
            this.createItemSelectionModal();
        } catch (error) {
            console.error('❌ [PRODUCTS] Error showing item selection modal:', error);
            showError('Failed to load inventory items');
        }
    }

    async loadAvailableInventory() {
        try {
            // Use HybridAPIClient to get inventory (same as inventory.js)
            const result = await window.HybridAPIClient.getInventory();
            
            if (result.success) {
                this.availableInventory = result.data || [];
                console.log(`✅ [PRODUCTS] Loaded ${this.availableInventory.length} inventory items`);
            } else {
                console.error('❌ [PRODUCTS] Failed to load inventory:', result.error);
                this.availableInventory = [];
            }
        } catch (error) {
            console.error('❌ [PRODUCTS] Error loading inventory:', error);
            this.availableInventory = [];
        }
    }

    createItemSelectionModal() {
        // Remove existing modal if present
        const existingModal = document.getElementById('itemSelectionModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal HTML
        const modalHTML = `
            <div class="modal" id="itemSelectionModal">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h3>Select Inventory Items</h3>
                        <button type="button" class="modal-close" onclick="closeModal('itemSelectionModal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <input type="text" id="itemSearchInput" class="form-input" placeholder="Search items..." style="margin-bottom: 1rem;">
                        </div>
                        <div class="inventory-items-list" id="inventoryItemsList" style="max-height: 300px; overflow-y: auto;">
                            ${this.renderInventoryItems()}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeModal('itemSelectionModal')">Cancel</button>
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Setup search functionality
        const searchInput = document.getElementById('itemSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterInventoryItems(e.target.value);
            });
        }

        // Show modal
        openModal('itemSelectionModal');
    }

    renderInventoryItems() {
        if (this.availableInventory.length === 0) {
            return '<p style="text-align: center; color: #666; padding: 2rem;">No inventory items available</p>';
        }

        return this.availableInventory.map(item => {
            const itemId = item._id || item.id;
            const isAlreadyAdded = this.serviceItems.some(si => si.itemId === itemId);
            
            return `
                <div class="inventory-item-row" data-id="${itemId}" style="display: flex; align-items: center; padding: 0.75rem; border: 1px solid #ddd; margin-bottom: 0.5rem; border-radius: 4px; ${isAlreadyAdded ? 'opacity: 0.5;' : ''}">
                    <div style="flex: 1;">
                        <strong>${item.name}</strong>
                        <br>
                        <small>Stock: ${item.quantity || 0} ${item.unit || 'units'}</small>
                        ${item.category ? `<br><small>Category: ${item.category}</small>` : ''}
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <input type="number" class="form-input" placeholder="Qty" min="0.1" step="0.1" style="width: 80px;" id="qty_${itemId}" ${isAlreadyAdded ? 'disabled' : ''}>
                        <button class="btn btn-sm btn-primary" onclick="productsManager.addItemToService('${itemId}')" ${isAlreadyAdded ? 'disabled' : ''}>
                            ${isAlreadyAdded ? 'Added' : 'Add'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    filterInventoryItems(searchTerm) {
        const itemsList = document.getElementById('inventoryItemsList');
        if (!itemsList) return;

        const filteredItems = this.availableInventory.filter(item => 
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        // Temporarily store the filtered items for rendering
        const originalItems = this.availableInventory;
        this.availableInventory = filteredItems;
        itemsList.innerHTML = this.renderInventoryItems();
        this.availableInventory = originalItems;
    }

    addItemToService(itemId) {
        const qtyInput = document.getElementById(`qty_${itemId}`);
        const quantity = parseFloat(qtyInput?.value || 1);

        if (quantity <= 0) {
            showError('Please enter a valid quantity');
            return;
        }

        // Find the inventory item
        const inventoryItem = this.availableInventory.find(item => (item._id || item.id) === itemId);
        if (!inventoryItem) {
            showError('Inventory item not found');
            return;
        }

        // Check if item is already added
        if (this.serviceItems.some(si => si.itemId === itemId)) {
            showError('Item already added to this service');
            return;
        }

        // Add to service items
        const serviceItem = {
            itemId: itemId,
            name: inventoryItem.name,
            quantity: quantity,
            unit: inventoryItem.unit || 'units',
            category: inventoryItem.category
        };

        this.serviceItems.push(serviceItem);
        
        // Update displays
        this.displayServiceItems();
        this.refreshItemSelectionModal();
        
        console.log('✅ [PRODUCTS] Added item to service:', serviceItem);
    }

    removeItemFromService(itemId) {
        this.serviceItems = this.serviceItems.filter(item => item.itemId !== itemId);
        this.displayServiceItems();
        
        // Refresh selection modal if it's open
        const modal = document.getElementById('itemSelectionModal');
        if (modal && modal.style.display !== 'none') {
            this.refreshItemSelectionModal();
        }
        
        console.log('✅ [PRODUCTS] Removed item from service:', itemId);
    }

    refreshItemSelectionModal() {
        const itemsList = document.getElementById('inventoryItemsList');
        if (itemsList) {
            itemsList.innerHTML = this.renderInventoryItems();
        }
    }

    displayServiceItems() {
        const itemsList = document.getElementById('itemsUsedList');
        if (!itemsList) return;

        if (this.serviceItems.length === 0) {
            itemsList.innerHTML = '<p style="color: #666; font-style: italic;">No items selected</p>';
            return;
        }

        itemsList.innerHTML = this.serviceItems.map(item => `
            <div class="service-item" style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem; background: #f8f9fa; border-radius: 4px; margin-bottom: 0.5rem;">
                <div>
                    <strong>${item.name}</strong>
                    <span style="color: #666; margin-left: 0.5rem;">${item.quantity} ${item.unit}</span>
                </div>
                <button type="button" class="btn-icon" onclick="productsManager.removeItemFromService('${item.itemId}')" title="Remove item">
                    <i class="fas fa-times" style="color: var(--danger-color);"></i>
                </button>
            </div>
        `).join('');
    }

    clearServiceItems() {
        this.serviceItems = [];
        this.displayServiceItems();
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
