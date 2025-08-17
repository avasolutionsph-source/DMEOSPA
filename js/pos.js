// POS System Management
class POSSystem {
    constructor() {
        this.cart = [];
        this.selectedEmployee = null;
        this.currentCategory = 'all';
        this.products = [];
        this.inventory = [];
    }

    async init() {
        // Ensure Rooms module is initialized so assignRoomFromPOS is available
        if (window.loadRooms && !window.roomsInitialized) {
            try { await window.loadRooms(); window.roomsInitialized = true; } catch(_) {}
        }
        await this.loadEmployees();
        await this.loadProducts();
        this.setupEventListeners();
        this.updateCartDisplay();
    }

    setupEventListeners() {
        if (this._listenersAttached) return;
        this._listenersAttached = true;
        // Employee selection
        const employeeSelect = document.getElementById('employeeSelect');
        if (employeeSelect) {
            employeeSelect.addEventListener('change', (e) => {
                this.selectedEmployee = e.target.value;
                
                // Update checkout button appearance based on employee selection
                const checkoutBtn = document.getElementById('checkoutBtn');
                if (checkoutBtn) {
                    if (this.selectedEmployee) {
                        checkoutBtn.style.opacity = '1';
                        checkoutBtn.title = 'Process checkout';
                    } else {
                        checkoutBtn.style.opacity = '0.7';
                        checkoutBtn.title = '⚠️ Please select an employee first';
                    }
                }
                
                // Update employee selection box appearance
                const employeeSelection = document.querySelector('.employee-selection');
                if (employeeSelection) {
                    if (this.selectedEmployee) {
                        employeeSelection.style.background = '#d4edda';
                        employeeSelection.style.borderLeft = '4px solid #28a745';
                    } else {
                        employeeSelection.style.background = '#fff3cd';
                        employeeSelection.style.borderLeft = '4px solid #ffc107';
                    }
                }
            });
            
            // Set initial state
            employeeSelect.dispatchEvent(new Event('change'));
        }

        // Assign room from POS
        const assignRoomBtn = document.getElementById('assignRoomBtn');
        if (assignRoomBtn) {
            assignRoomBtn.addEventListener('click', async () => {
                const roomInput = document.getElementById('roomAssignNumber');
                const roomNumber = roomInput?.value?.trim();
                if (!this.selectedEmployee) { showNotification('Select an employee first', 'warning'); return; }
                if (!roomNumber) { showNotification('Enter a room number to assign', 'warning'); return; }
                if (typeof window.roomsManager?.assignRoomFromPOS !== 'function') { showNotification('Rooms module not ready', 'error'); return; }
                // Determine first service in cart
                const firstService = (this.cart || []).find(i => i.type === 'service');
                const serviceName = firstService ? firstService.name : '';
                const serviceDuration = firstService ? (firstService.duration || 0) : 0;
                const serviceId = firstService ? firstService.id : null;
                await window.roomsManager.assignRoomFromPOS(roomNumber, this.selectedEmployee, serviceName, serviceDuration, serviceId);
            });
        }

        // Product search
        const searchInput = document.getElementById('productSearch');
        if (searchInput) {
            searchInput.addEventListener('input', app.debounce((e) => {
                this.filterProducts(e.target.value);
            }, 300));
        }

        // Category filters
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentCategory = btn.dataset.category;
                this.filterProducts();
            });
        });

        // Clear cart button
        document.getElementById('clearCart').addEventListener('click', () => {
            if (this.cart.length > 0) {
                const itemCount = this.cart.length;
                const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
                if (confirm(`Clear cart?\n\nThis will remove ${itemCount} product(s) (${totalItems} total items) from your cart.\n\nAre you sure?`)) {
                    this.clearCart();
                }
            } else {
                showNotification('Cart is already empty', 'info');
            }
        });

        // Checkout button
        document.getElementById('checkoutBtn').addEventListener('click', () => {
            if (this.cart.length > 0) {
                this.showCheckout();
            } else {
                showNotification('Cart is empty', 'warning');
            }
        });

        // Confirm checkout button
        document.getElementById('confirmCheckoutBtn').addEventListener('click', () => {
            this.processCheckout();
        });
    }

    async loadEmployees() {
        try {
            const employees = await db.getAll('employees');
            const select = document.getElementById('employeeSelect');
            if (select) {
                select.innerHTML = '<option value="">Select Employee</option>';
                employees.forEach(emp => {
                    const option = document.createElement('option');
                    option.value = emp.id;
                    option.textContent = `${emp.name} - ${emp.position}`;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Failed to load employees:', error);
        }
    }

    async loadProducts() {
        try {
            // Load products and services
            const products = await db.getAll('products');
            const inventory = await db.getAll('inventory');
            
            // Filter based on business configuration
            const showAllServices = window.app?.businessConfig?.businessType === 'spa';
            
            if (showAllServices) {
                // For spa business, show all services in POS
                this.products = products;
            } else {
                // For other businesses, filter by showInPOS setting
                this.products = products.filter(p => p.showInPOS);
            }
            
            this.inventory = inventory.filter(i => i.showInPOS);
            
            // Combine and display
            this.displayProducts();
        } catch (error) {
            console.error('Failed to load products:', error);
        }
    }

    displayProducts(searchTerm = '') {
        const grid = document.getElementById('posProductsGrid');
        if (!grid) return;

        let items = [...this.products, ...this.inventory];

        // Filter by category
        if (this.currentCategory !== 'all') {
            if (this.currentCategory === 'products') {
                items = items.filter(item => item.type === 'product' || item.sku);
            } else if (this.currentCategory === 'services') {
                items = items.filter(item => item.type === 'service');
            }
        }

        // Filter by search term
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            items = items.filter(item => 
                item.name.toLowerCase().includes(term) ||
                (item.description && item.description.toLowerCase().includes(term)) ||
                (item.category && item.category.toLowerCase().includes(term))
            );
        }

        // Generate HTML
        grid.innerHTML = items.map(item => `
            <div class="product-card" onclick="posSystem.addToCart(${item.id}, '${item.type || 'inventory'}')">
                <i class="fas fa-${item.type === 'service' ? 'concierge-bell' : item.sku ? 'box' : 'shopping-bag'}"></i>
                <h4>${item.name}</h4>
                <p class="price">${app.formatCurrency(item.price || item.unitPrice || 0)}</p>
                ${item.currentStock !== undefined ? `<small>Stock: ${item.currentStock}</small>` : ''}
                ${item.type === 'service' ? '<small style="color: #6366f1;"><i class="fas fa-user-check"></i> Requires Employee</small>' : ''}
            </div>
        `).join('');

        if (items.length === 0) {
            grid.innerHTML = '<div class="no-products">No products found</div>';
        }
    }

    filterProducts(searchTerm = '') {
        this.displayProducts(searchTerm);
    }

    async addToCart(itemId, itemType) {
        try {
            let item;
            if (itemType === 'inventory') {
                item = await db.get('inventory', itemId);
                // Check stock
                if (item.currentStock <= 0) {
                    showNotification('Item out of stock', 'error');
                    return;
                }
            } else {
                item = await db.get('products', itemId);
            }

            if (!item) return;

            // Check if item already in cart
            const existingItem = this.cart.find(cartItem => 
                cartItem.id === itemId && cartItem.type === itemType
            );

            if (existingItem) {
                // Check stock before incrementing
                if (itemType === 'inventory' && existingItem.quantity >= item.currentStock) {
                    showNotification('Not enough stock available', 'warning');
                    return;
                }
                existingItem.quantity++;
            } else {
                this.cart.push({
                    id: itemId,
                    type: itemType,
                    name: item.name,
                    price: item.price || item.unitPrice || 0,
                    quantity: 1,
                    maxStock: item.currentStock,
                    duration: itemType !== 'inventory' ? (item.duration || 0) : undefined
                });
            }

            this.updateCartDisplay();
            showNotification(`${item.name} added to cart`, 'success');
        } catch (error) {
            console.error('Failed to add item to cart:', error);
        }
    }

    removeFromCart(index) {
        const item = this.cart[index];
        if (confirm(`Remove ${item.name} from cart?`)) {
            this.cart.splice(index, 1);
            this.updateCartDisplay();
            showNotification(`${item.name} removed from cart`, 'info');
        }
    }

    updateQuantity(index, change) {
        const item = this.cart[index];
        const newQuantity = item.quantity + change;

        if (newQuantity <= 0) {
            this.removeFromCart(index);
        } else if (item.maxStock && newQuantity > item.maxStock) {
            showNotification('Not enough stock available', 'warning');
        } else {
            item.quantity = newQuantity;
            this.updateCartDisplay();
        }
    }

    clearCart() {
        this.cart = [];
        this.updateCartDisplay();
        showNotification('Cart cleared', 'info');
    }

    updateCartDisplay() {
        const cartItemsDiv = document.getElementById('cartItems');
        const totalSpan = document.getElementById('cartTotal');

        if (!cartItemsDiv) return;

        // Always show employee selection; emphasize when needed
        const employeeSelection = document.querySelector('.employee-selection');
        if (employeeSelection) {
            employeeSelection.style.display = 'block';
            if (this.cart.length > 0) {
                if (!this.selectedEmployee) {
                    // Add visual emphasis when cart has items but no employee selected
                    employeeSelection.style.boxShadow = '0 0 10px rgba(255, 193, 7, 0.5)';
                } else {
                    employeeSelection.style.boxShadow = 'none';
                }
            } else {
                employeeSelection.style.boxShadow = 'none';
            }
        }

        if (this.cart.length === 0) {
            cartItemsDiv.innerHTML = '<div class="empty-cart">Cart is empty</div>';
            totalSpan.textContent = '₱0.00';
            return;
        }

        // Check if there are services in cart
        const hasServices = this.cart.some(item => item.type === 'service');
        
        // Display notice if services in cart but no employee selected
        let serviceNotice = '';
        if (hasServices && !this.selectedEmployee) {
            serviceNotice = `
                <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 0.75rem; border-radius: 6px; margin-bottom: 0.75rem; font-size: 0.875rem; color: #92400e;">
                    <i class="fas fa-info-circle"></i> Service items in cart - Please select an employee for commission tracking
                </div>
            `;
        }

        // Display cart items
        cartItemsDiv.innerHTML = serviceNotice + this.cart.map((item, index) => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name} ${item.type === 'service' ? '<span style="color: #6366f1; font-size: 0.75rem;">(Service)</span>' : ''}</div>
                    <div class="cart-item-price">${app.formatCurrency(item.price)} each</div>
                </div>
                <div class="cart-item-actions">
                    <div class="quantity-control">
                        <button class="quantity-btn" onclick="posSystem.updateQuantity(${index}, -1)">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="quantity-display">${item.quantity}</span>
                        <button class="quantity-btn" onclick="posSystem.updateQuantity(${index}, 1)">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    <span class="delete-item" onclick="posSystem.removeFromCart(${index})">
                        <i class="fas fa-trash"></i>
                    </span>
                </div>
            </div>
        `).join('');

        // Calculate totals
        const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        totalSpan.textContent = app.formatCurrency(total);
    }

    showCheckout() {
        // Check if employee requirement is enabled and there are services in cart
        const requireEmployee = window.app?.isFeatureEnabled('requireEmployeeForServices');
        const hasServices = this.cart.some(item => item.type === 'service');
        
        if (requireEmployee && hasServices && !this.selectedEmployee) {
            if (!confirm('You have services in your cart but no employee selected. Services require employee assignment for commission tracking. Continue anyway?')) {
                showNotification('Please select an employee for service items', 'warning');
                return;
            }
        }

        // Update checkout modal
        const checkoutItems = document.getElementById('checkoutItems');
        const checkoutTotal = document.getElementById('checkoutTotal');

        // Display items
        checkoutItems.innerHTML = this.cart.map(item => `
            <div class="checkout-item">
                <span>${item.name} x ${item.quantity}</span>
                <span>${app.formatCurrency(item.price * item.quantity)}</span>
            </div>
        `).join('');

        // Calculate totals
        const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        checkoutTotal.textContent = app.formatCurrency(total);

        openModal('checkoutModal');
    }

    async processCheckout() {
        // Prevent duplicate checkouts
        if (this.isProcessingCheckout) {
            return;
        }

        // Check if employee is selected
        if (!this.selectedEmployee) {
            // Highlight the employee selection area
            const employeeSelection = document.querySelector('.employee-selection');
            if (employeeSelection) {
                employeeSelection.style.background = '#ffebee';
                employeeSelection.style.borderLeft = '4px solid #dc3545';
                employeeSelection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Flash animation
                employeeSelection.animate([
                    { transform: 'scale(1)' },
                    { transform: 'scale(1.05)' },
                    { transform: 'scale(1)' }
                ], {
                    duration: 300,
                    iterations: 2
                });
                
                // Reset color after 3 seconds
                setTimeout(() => {
                    employeeSelection.style.background = '#fff3cd';
                    employeeSelection.style.borderLeft = '4px solid #ffc107';
                }, 3000);
            }
            
            showNotification('Please select an employee before checkout', 'error');
            return;
        }

        // Check transaction limits for current plan
        if (window.checkPlanLimits) {
            const limitReached = await window.checkPlanLimits('transactions');
            if (limitReached) {
                window.showLimitReachedMessage('transactions');
                return;
            }
        }

        // Final confirmation before processing
        if (!confirm('Confirm checkout and complete this sale?')) {
            return;
        }

        this.isProcessingCheckout = true;

        // Show loading immediately
        setButtonLoading('confirmCheckoutBtn', true);
        showLoading('Processing Sale...', 'Please wait while we complete your transaction');
        
        try {
            const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
            // Capture context for auto room start BEFORE clearing the cart
            const preRoomInput = document.getElementById('roomAssignNumber');
            const desiredRoomAtCheckout = preRoomInput?.value?.trim();
            const firstServiceInCart = (this.cart || []).find(i => i.type === 'service');
            const serviceNameAtCheckout = firstServiceInCart ? firstServiceInCart.name : '';
            const serviceDurationAtCheckout = firstServiceInCart ? (firstServiceInCart.duration || 0) : 0;
            const serviceIdAtCheckout = firstServiceInCart ? firstServiceInCart.id : null;
            
            // Calculate totals
            const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            // Create transaction
            const transaction = {
                date: new Date().toISOString(),
                items: [...this.cart],
                subtotal: total,
                tax: 0,
                total: total,
                paymentMethod: paymentMethod,
                employeeId: this.selectedEmployee || null,
                syncStatus: 'pending'
            };

            // Debug: Log transaction data being saved
            console.log('POS: Saving transaction:', {
                total: transaction.total,
                employeeId: transaction.employeeId,
                employeeIdType: typeof transaction.employeeId,
                selectedEmployee: this.selectedEmployee,
                items: transaction.items.length
            });

            // Save transaction
            const transactionId = await db.add('transactions', transaction);

            // Update inventory stock and track service usage
            for (const item of this.cart) {
                if (item.type === 'inventory') {
                    await db.updateInventoryStock(item.id, item.quantity, 'subtract');
                } else if (item.type === 'service') {
                    // Track automatic supply usage for services
                    await this.processServiceSupplyUsage(item, transactionId);
                }
            }

            // Calculate commission if employee selected
            if (this.selectedEmployee) {
                const employee = await db.get('employees', parseInt(this.selectedEmployee));
                if (employee && employee.commissionRate) {
                    const commission = total * (employee.commissionRate / 100);
                    // You might want to track commissions separately
                    console.log(`Commission for ${employee.name}: ${app.formatCurrency(commission)}`);
                }
            }

            // Clear cart
            this.cart = [];
            this.updateCartDisplay();

            // Hide loading and close modal
            hideLoading();
            setButtonLoading('confirmCheckoutBtn', false);
            closeModal('checkoutModal');

            // Auto-start room timer after successful checkout
            try {
                // Prefer the entered room number; otherwise choose the first available room
                let roomNumberToUse = desiredRoomAtCheckout || '';
                if (!roomNumberToUse) {
                    const rooms = await db.getAll('rooms');
                    const available = rooms.find(r => r.status === 'available');
                    if (available) roomNumberToUse = available.number;
                }
                if (roomNumberToUse && serviceNameAtCheckout && this.selectedEmployee && typeof window.roomsManager?.assignRoomFromPOS === 'function') {
                    await window.roomsManager.assignRoomFromPOS(roomNumberToUse, this.selectedEmployee, serviceNameAtCheckout, serviceDurationAtCheckout, serviceIdAtCheckout);
                }
            } catch (e) {
                console.warn('Auto room start after checkout failed:', e);
            }

            // Small delay to ensure modal closes, then show success
            setTimeout(() => {
                showNotification('Sale completed successfully!', 'success');
            }, 100);

            // Refresh dashboard if it's the current page
            if (window.app.currentPage === 'dashboard') {
                window.loadDashboard && window.loadDashboard();
            }

        } catch (error) {
            console.error('Checkout failed:', error);
            hideLoading();
            setButtonLoading('confirmCheckoutBtn', false);
            showNotification('Checkout failed. Please try again.', 'error');
        } finally {
            // Always reset the processing flag
            this.isProcessingCheckout = false;
        }
    }

    // Process automatic supply usage for services
    async processServiceSupplyUsage(serviceItem, transactionId) {
        try {
            const service = await db.get('products', serviceItem.id);
            if (!service || !service.supplyMappings) return;

            // Get inventory items
            const inventory = await db.getAll('inventory');
            
            for (const mapping of service.supplyMappings) {
                const inventoryItem = inventory.find(item => item.id === mapping.inventoryId);
                if (!inventoryItem) continue;

                const usageAmount = mapping.usagePerService * serviceItem.quantity;
                
                // Update inventory stock
                await this.updateInventoryWithUsageTracking(
                    inventoryItem, 
                    usageAmount, 
                    transactionId, 
                    service.name
                );
            }
        } catch (error) {
            console.error('Failed to process service supply usage:', error);
        }
    }

    // Update inventory with automatic usage tracking
    async updateInventoryWithUsageTracking(inventoryItem, usageAmount, transactionId, serviceName) {
        try {
            // Update stock
            inventoryItem.currentStock = Math.max(0, inventoryItem.currentStock - usageAmount);
            inventoryItem.modifiedAt = new Date().toISOString();
            inventoryItem.syncStatus = 'pending';

            // Track usage in adjustment history
            if (!inventoryItem.adjustmentHistory) {
                inventoryItem.adjustmentHistory = [];
            }

            inventoryItem.adjustmentHistory.push({
                date: new Date().toISOString(),
                adjustment: -usageAmount,
                reason: `Auto-used in service: ${serviceName}`,
                newStock: inventoryItem.currentStock,
                transactionId: transactionId,
                type: 'service_usage'
            });

            // Update usage tracking for automatic calculation
            if (!inventoryItem.usageTracking) {
                inventoryItem.usageTracking = {
                    totalUsed: 0,
                    serviceCount: 0,
                    lastCalculated: new Date().toISOString()
                };
            }

            inventoryItem.usageTracking.totalUsed += usageAmount;
            inventoryItem.usageTracking.serviceCount += 1;
            
            // Calculate average usage per service
            const averageUsage = inventoryItem.usageTracking.totalUsed / inventoryItem.usageTracking.serviceCount;
            inventoryItem.usagePerService = Math.round(averageUsage * 100) / 100; // Round to 2 decimals

            // Save updated inventory item
            await db.update('inventory', inventoryItem);

            console.log(`Auto-tracked: ${usageAmount} ${inventoryItem.unit || 'units'} of ${inventoryItem.name} used in ${serviceName}`);
            
        } catch (error) {
            console.error('Failed to update inventory with usage tracking:', error);
        }
    }

    // Show supply usage modal for manual entry (fallback)
    async showSupplyUsageModal(serviceItem, transactionId) {
        const inventory = await db.getAll('inventory');
        const availableSupplies = inventory.filter(item => item.currentStock > 0);

        if (availableSupplies.length === 0) {
            return; // No supplies to track
        }

        // Create modal content
        let modalContent = `
            <div class="supply-usage-modal">
                <h3>Record Supply Usage for ${serviceItem.name}</h3>
                <p class="text-muted">Track which supplies were used for this service to improve predictions:</p>
                
                <form id="supplyUsageForm">
        `;

        availableSupplies.forEach(supply => {
            modalContent += `
                <div class="supply-item">
                    <label>
                        <span class="supply-name">${supply.name}</span>
                        <span class="supply-stock">(${supply.currentStock} ${supply.unit || 'units'} available)</span>
                    </label>
                    <div class="usage-input">
                        <input type="number" 
                               step="0.1" 
                               min="0" 
                               max="${supply.currentStock}"
                               name="usage_${supply.id}"
                               placeholder="Amount used">
                        <span class="unit">${supply.unit || 'units'}</span>
                    </div>
                </div>
            `;
        });

        modalContent += `
                    <div class="modal-buttons">
                        <button type="button" class="btn btn-secondary" onclick="closeModal('supplyUsageModal')">Skip</button>
                        <button type="submit" class="btn btn-primary">Record Usage</button>
                    </div>
                </form>
            </div>
        `;

        // Show modal (you'd need to implement this modal in your HTML)
        // For now, just log the usage
        console.log('Supply usage tracking available for:', serviceItem.name);
    }
}

// Initialize POS system
const posSystem = new POSSystem();

// Load POS when page is shown
window.loadPOS = async function() {
    await posSystem.init();
};
