// POS System Management
class POSSystem {
    constructor() {
        // Initialize with StateManager if available, fallback to local properties
        if (window.StateManager && window.StateManager.initialized) {
            // Properties will proxy to state
            this.cart = window.StateManager.getState('pos.cart') || [];
            this.selectedEmployee = window.StateManager.getState('pos.selectedEmployee');
        } else {
            // Fallback to local properties (will proxy to state when StateManager loads)
            this.cart = [];
            this.selectedEmployee = null;
        }
        this.currentCategory = 'all';
        this.products = [];
        this.inventory = [];
        
        // Discount and GC tracking
        this.appliedGiftCertificate = null;
        this.appliedSeniorPWDDiscount = null;
        this.appliedPromoDiscount = null;
        this.discountAmount = 0;
        this.gcAmount = 0;
    }

    async init() {
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
                // Use StateHelpers if available
                if (window.StateHelpers) {
                    window.StateHelpers.selectEmployee(e.target.value);
                } else if (window.StateManager && window.StateManager.initialized) {
                    window.StateManager.setState('pos.selectedEmployee', e.target.value);
                } else {
                    this.selectedEmployee = e.target.value;
                }
                
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
            if (window.logger) {
                window.logger.error('Failed to load employees', {
                    category: 'POS',
                    operation: 'load_employees',
                    error: error
                });
            }
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
            if (window.logger) {
                window.logger.error('Failed to load products', {
                    category: 'POS',
                    operation: 'load_products',
                    error: error
                });
            }
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
            if (window.logger) {
                window.logger.debug('Adding item to cart', {
                    category: 'POS',
                    operation: 'add_to_cart',
                    data: { itemId: itemId, itemType: itemType }
                });
            }
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
                const newItem = {
                    id: itemId,
                    type: itemType,
                    name: item.name,
                    price: item.price || item.unitPrice || 0,
                    quantity: 1,
                    maxStock: item.currentStock
                };
                
                // Use StateHelpers if available for better state management
                if (window.StateHelpers) {
                    window.StateHelpers.addToCart(newItem, 1);
                } else {
                    this.cart.push(newItem);
                    // Update state if StateManager available
                    if (window.StateManager && window.StateManager.initialized) {
                        window.StateManager.setState('pos.cart', [...this.cart]);
                    }
                }
            }

            this.updateCartDisplay();
            showNotification(`${item.name} added to cart`, 'success');
            
            if (window.logger) {
                window.logger.info('Item added to cart successfully', {
                    category: 'POS',
                    operation: 'add_to_cart_success',
                    data: { 
                        itemName: item.name, 
                        itemId: itemId, 
                        price: item.price || item.unitPrice || 0,
                        cartSize: this.cart.length 
                    }
                });
            }
        } catch (error) {
            if (window.logger) {
                window.logger.error('Failed to add item to cart', {
                    category: 'POS',
                    operation: 'add_to_cart_error',
                    error: error
                });
            } else {
                if (window.logger) {
                    window.logger.error('Failed to add item to cart', {
                        category: 'POS',
                        operation: 'add_to_cart',
                        error: error
                    });
                }
            }
        }
    }

    removeFromCart(index) {
        const item = this.cart[index];
        if (confirm(`Remove ${item.name} from cart?`)) {
            // Use StateHelpers if available
            if (window.StateHelpers && item.id) {
                window.StateHelpers.removeFromCart(item.id);
            } else {
                this.cart.splice(index, 1);
                // Update state if StateManager available
                if (window.StateManager && window.StateManager.initialized) {
                    window.StateManager.setState('pos.cart', [...this.cart]);
                }
            }
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
        // Use StateHelpers if available
        if (window.StateHelpers) {
            window.StateHelpers.clearCart();
        } else if (window.StateManager && window.StateManager.initialized) {
            window.StateManager.setState('pos.cart', []);
            window.StateManager.setState('pos.discounts', []);
            window.StateManager.setState('pos.currentTransaction', null);
        } else {
            this.cart = [];
        }
        
        // Reset discount tracking
        this.appliedGiftCertificate = null;
        this.appliedSeniorPWDDiscount = null;
        this.appliedPromoDiscount = null;
        this.discountAmount = 0;
        this.gcAmount = 0;
        
        this.updateCartDisplay();
        showNotification('Cart cleared', 'info');
    }

    updateCartDisplay() {
        const cartItemsDiv = document.getElementById('cartItems');
        const totalSpan = document.getElementById('cartTotal');

        if (!cartItemsDiv) return;

        // Update employee selection visibility based on cart content
        const employeeSelection = document.querySelector('.employee-selection');
        if (employeeSelection) {
            if (this.cart.length > 0) {
                employeeSelection.style.display = 'block';
                if (!this.selectedEmployee) {
                    // Add visual emphasis when cart has items but no employee selected
                    employeeSelection.style.boxShadow = '0 0 10px rgba(255, 193, 7, 0.5)';
                } else {
                    employeeSelection.style.boxShadow = 'none';
                }
            } else {
                employeeSelection.style.display = 'none';
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

    async showCheckout() {
        // Check if employee requirement is enabled and there are services in cart
        const requireEmployee = window.app?.isFeatureEnabled('requireEmployeeForServices');
        const hasServices = this.cart.some(item => item.type === 'service');
        
        if (requireEmployee && hasServices && !this.selectedEmployee) {
            if (!confirm('You have services in your cart but no employee selected. Services require employee assignment for commission tracking. Continue anyway?')) {
                showNotification('Please select an employee for service items', 'warning');
                return;
            }
        }

        // Reset discounts for new checkout
        this.resetDiscounts();
        
        // Load employees for checkout dropdown
        await this.loadEmployeesForCheckout();
        
        // Check if there are services in cart to show room assignment (reuse hasServices variable)
        const roomSection = document.getElementById('roomAssignmentSection');
        if (roomSection) {
            if (hasServices) {
                roomSection.style.display = 'block';
                await this.loadAvailableRooms();
            } else {
                roomSection.style.display = 'none';
            }
        }

        // Update checkout modal
        const checkoutItems = document.getElementById('checkoutItems');
        const checkoutSubtotal = document.getElementById('checkoutSubtotal');
        const checkoutTotal = document.getElementById('checkoutTotal');

        // Display items
        checkoutItems.innerHTML = this.cart.map(item => `
            <div class="checkout-item">
                <span>${item.name} x ${item.quantity}</span>
                <span>${app.formatCurrency(item.price * item.quantity)}</span>
            </div>
        `).join('');

        // Calculate subtotal
        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        checkoutSubtotal.textContent = app.formatCurrency(subtotal);
        checkoutTotal.textContent = app.formatCurrency(subtotal);

        openModal('checkoutModal');
    }

    // Reset all discounts
    resetDiscounts() {
        this.appliedGiftCertificate = null;
        this.appliedSeniorPWDDiscount = null;
        this.appliedPromoDiscount = null;
        this.discountAmount = 0;
        this.gcAmount = 0;
        
        // Reset UI
        document.getElementById('gcControlNumber').value = '';
        document.getElementById('gcStatus').innerHTML = '';
        document.getElementById('applySeniorPWD').checked = false;
        document.getElementById('seniorPWDFields').style.display = 'none';
        document.getElementById('discountCardholderName').value = '';
        document.getElementById('discountIDNumber').value = '';
        document.getElementById('discountCardType').value = '';
        document.getElementById('promoDiscount').value = '';
        document.getElementById('customDiscountField').style.display = 'none';
        document.getElementById('discountRow').style.display = 'none';
        document.getElementById('gcRow').style.display = 'none';
    }

    // Validate Gift Certificate
    async validateGiftCertificate() {
        const controlNumber = document.getElementById('gcControlNumber').value.trim();
        const statusDiv = document.getElementById('gcStatus');
        
        if (!controlNumber) {
            statusDiv.innerHTML = '<span style="color: red;">Please enter a control number</span>';
            return;
        }

        try {
            // Check if GC exists and is valid
            const gcs = await db.getByIndex('giftCertificates', 'controlNumber', controlNumber);
            const gc = gcs && gcs[0];
            
            if (!gc) {
                statusDiv.innerHTML = '<span style="color: red;"><i class="fas fa-times-circle"></i> Invalid control number</span>';
                this.appliedGiftCertificate = null;
                this.updateCheckoutTotals();
                return;
            }

            if (gc.status === 'used') {
                statusDiv.innerHTML = `<span style="color: red;"><i class="fas fa-times-circle"></i> Gift certificate already used on ${new Date(gc.usedDate).toLocaleDateString()}</span>`;
                this.appliedGiftCertificate = null;
                this.updateCheckoutTotals();
                return;
            }

            if (gc.status === 'expired') {
                statusDiv.innerHTML = '<span style="color: red;"><i class="fas fa-times-circle"></i> Gift certificate has expired</span>';
                this.appliedGiftCertificate = null;
                this.updateCheckoutTotals();
                return;
            }

            // Valid GC found
            this.appliedGiftCertificate = gc;
            this.gcAmount = gc.amount || 0;
            statusDiv.innerHTML = `<span style="color: green;"><i class="fas fa-check-circle"></i> Valid! Amount: ${app.formatCurrency(gc.amount)}</span>`;
            this.updateCheckoutTotals();
            
        } catch (error) {
            if (window.logger) {
                window.logger.error('Gift certificate validation error', {
                    category: 'POS',
                    operation: 'validate_gift_certificate',
                    error: error
                });
            }
            statusDiv.innerHTML = '<span style="color: red;">Error validating gift certificate</span>';
        }
    }

    // Toggle Senior/PWD fields
    toggleSeniorPWDFields() {
        const checkbox = document.getElementById('applySeniorPWD');
        const fieldsDiv = document.getElementById('seniorPWDFields');
        
        if (checkbox.checked) {
            fieldsDiv.style.display = 'block';
            this.appliedSeniorPWDDiscount = { percentage: 20 };
        } else {
            fieldsDiv.style.display = 'none';
            this.appliedSeniorPWDDiscount = null;
        }
        
        this.updateCheckoutTotals();
    }

    // Apply promo discount
    applyPromoDiscount() {
        const promoSelect = document.getElementById('promoDiscount');
        const customField = document.getElementById('customDiscountField');
        
        if (promoSelect.value === 'custom') {
            customField.style.display = 'block';
            
            // Add listener for custom discount
            const customPercent = document.getElementById('customDiscountPercent');
            customPercent.onchange = () => {
                const percent = parseFloat(customPercent.value) || 0;
                this.appliedPromoDiscount = {
                    type: 'custom',
                    percentage: percent,
                    reason: document.getElementById('customDiscountReason').value
                };
                this.updateCheckoutTotals();
            };
        } else {
            customField.style.display = 'none';
            
            if (promoSelect.value) {
                const [, percent] = promoSelect.value.match(/-(\d+)$/) || [, 0];
                this.appliedPromoDiscount = {
                    type: promoSelect.value,
                    percentage: parseInt(percent)
                };
            } else {
                this.appliedPromoDiscount = null;
            }
        }
        
        this.updateCheckoutTotals();
    }

    // Update checkout totals with discounts
    updateCheckoutTotals() {
        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        let total = subtotal;
        
        // Reset discount amount
        this.discountAmount = 0;
        
        // Apply Senior/PWD discount (20%)
        if (this.appliedSeniorPWDDiscount) {
            const seniorDiscount = subtotal * 0.20;
            this.discountAmount += seniorDiscount;
        }
        
        // Apply promo discount
        if (this.appliedPromoDiscount) {
            const promoDiscount = subtotal * (this.appliedPromoDiscount.percentage / 100);
            this.discountAmount += promoDiscount;
        }
        
        // Apply discounts
        total -= this.discountAmount;
        
        // Apply gift certificate
        if (this.appliedGiftCertificate) {
            const gcDeduction = Math.min(this.gcAmount, total);
            total -= gcDeduction;
            document.getElementById('gcRow').style.display = 'flex';
            document.getElementById('checkoutGC').textContent = `-${app.formatCurrency(gcDeduction)}`;
        } else {
            document.getElementById('gcRow').style.display = 'none';
        }
        
        // Update UI
        document.getElementById('checkoutSubtotal').textContent = app.formatCurrency(subtotal);
        
        if (this.discountAmount > 0) {
            document.getElementById('discountRow').style.display = 'flex';
            document.getElementById('checkoutDiscount').textContent = `-${app.formatCurrency(this.discountAmount)}`;
        } else {
            document.getElementById('discountRow').style.display = 'none';
        }
        
        document.getElementById('checkoutTotal').textContent = app.formatCurrency(Math.max(0, total));
    }

    // Load employees for checkout dropdown
    async loadEmployeesForCheckout() {
        try {
            const employees = await db.getAll('employees');
            const select = document.getElementById('checkoutEmployeeSelect');
            if (select) {
                select.innerHTML = '<option value="">Select Employee</option>';
                employees.forEach(emp => {
                    const option = document.createElement('option');
                    option.value = emp.id;
                    option.textContent = `${emp.name} - ${emp.position}`;
                    select.appendChild(option);
                });
                
                // Set previously selected employee if any
                if (this.selectedEmployee) {
                    select.value = this.selectedEmployee;
                }
            }
        } catch (error) {
            if (window.logger) {
                window.logger.error('Failed to load employees for checkout', {
                    category: 'POS',
                    operation: 'load_checkout_employees',
                    error: error
                });
            }
        }
    }
    
    // Load available rooms for checkout
    async loadAvailableRooms() {
        try {
            const rooms = await db.getAll('rooms');
            const availableRooms = rooms.filter(r => r.status === 'available');
            const select = document.getElementById('checkoutRoomSelect');
            
            if (select) {
                select.innerHTML = '<option value="">No Room Assignment</option>';
                availableRooms.forEach(room => {
                    const option = document.createElement('option');
                    option.value = room.id;
                    option.textContent = `${room.name} - ${this.getRoomTypeLabel(room.type)} (Capacity: ${room.capacity})`;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            if (window.logger) {
                window.logger.error('Failed to load rooms for checkout', {
                    category: 'POS',
                    operation: 'load_checkout_rooms',
                    error: error
                });
            }
        }
    }
    
    getRoomTypeLabel(type) {
        const types = {
            'massage': 'Massage Room',
            'facial': 'Facial Room',
            'couple': 'Couple\'s Room',
            'vip': 'VIP Suite',
            'general': 'General Purpose'
        };
        return types[type] || type;
    }

    async processCheckout() {
        // Prevent duplicate checkouts
        if (this.isProcessingCheckout) {
            return;
        }
        
        if (window.logger) {
            window.logger.info('Starting checkout process', {
                category: 'POS',
                operation: 'checkout_start',
                data: { 
                    cartItems: this.cart.length,
                    cartTotal: this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
                }
            });
        }
        
        // Get employee from checkout modal
        const checkoutEmployee = document.getElementById('checkoutEmployeeSelect')?.value;
        this.selectedEmployee = checkoutEmployee;

        // Check if employee is selected
        if (!this.selectedEmployee) {
            // Focus on the employee dropdown in checkout modal
            const employeeSelect = document.getElementById('checkoutEmployeeSelect');
            if (employeeSelect) {
                employeeSelect.style.borderColor = '#dc3545';
                employeeSelect.focus();
                
                // Flash animation
                employeeSelect.animate([
                    { transform: 'scale(1)' },
                    { transform: 'scale(1.02)' },
                    { transform: 'scale(1)' }
                ], {
                    duration: 300,
                    iterations: 2
                });
            }
            
            showNotification('Please select an employee before checkout', 'error');
            setButtonLoading('confirmCheckoutBtn', false);
            hideLoading();
            this.isProcessingCheckout = false;
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
            
            // Validate Senior/PWD discount fields if applied
            if (this.appliedSeniorPWDDiscount) {
                const cardholderName = document.getElementById('discountCardholderName').value.trim();
                const idNumber = document.getElementById('discountIDNumber').value.trim();
                const cardType = document.getElementById('discountCardType').value;
                
                if (!cardholderName || !idNumber || !cardType) {
                    showNotification('Please fill in all Senior/PWD discount fields', 'error');
                    setButtonLoading('confirmCheckoutBtn', false);
                    hideLoading();
                    this.isProcessingCheckout = false;
                    return;
                }
                
                this.appliedSeniorPWDDiscount.cardholderName = cardholderName;
                this.appliedSeniorPWDDiscount.idNumber = idNumber;
                this.appliedSeniorPWDDiscount.cardType = cardType;
            }
            
            // Calculate totals
            const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            let total = subtotal - this.discountAmount;
            
            // Apply GC amount
            if (this.appliedGiftCertificate) {
                const gcDeduction = Math.min(this.gcAmount, total);
                total -= gcDeduction;
                
                // Mark GC as used
                this.appliedGiftCertificate.status = 'used';
                this.appliedGiftCertificate.usedDate = new Date().toISOString();
                this.appliedGiftCertificate.usedInTransaction = null; // Will be updated after transaction is saved
                await db.update('giftCertificates', this.appliedGiftCertificate);
            }

            // Create comprehensive transaction with audit trail
            const transaction = {
                date: new Date().toISOString(),
                items: [...this.cart],
                subtotal: subtotal,
                discountAmount: this.discountAmount,
                gcAmount: this.appliedGiftCertificate ? Math.min(this.gcAmount, subtotal - this.discountAmount) : 0,
                tax: 0,
                total: Math.max(0, total),
                paymentMethod: paymentMethod,
                employeeId: this.selectedEmployee || null,
                
                // Discount details for audit
                discounts: {
                    seniorPWD: this.appliedSeniorPWDDiscount ? {
                        applied: true,
                        percentage: this.appliedSeniorPWDDiscount.percentage,
                        amount: subtotal * 0.20,
                        cardholderName: this.appliedSeniorPWDDiscount.cardholderName,
                        idNumber: this.appliedSeniorPWDDiscount.idNumber,
                        cardType: this.appliedSeniorPWDDiscount.cardType
                    } : null,
                    promo: this.appliedPromoDiscount ? {
                        applied: true,
                        type: this.appliedPromoDiscount.type,
                        percentage: this.appliedPromoDiscount.percentage,
                        amount: subtotal * (this.appliedPromoDiscount.percentage / 100),
                        reason: this.appliedPromoDiscount.reason
                    } : null,
                    giftCertificate: this.appliedGiftCertificate ? {
                        applied: true,
                        controlNumber: this.appliedGiftCertificate.controlNumber,
                        amount: Math.min(this.gcAmount, subtotal - this.discountAmount),
                        gcId: this.appliedGiftCertificate.id
                    } : null
                },
                
                // Audit metadata
                auditLog: {
                    createdBy: this.selectedEmployee || 'system',
                    createdAt: new Date().toISOString(),
                    terminal: 'POS-1',
                    ipAddress: 'local',
                    userAgent: navigator.userAgent
                },
                
                syncStatus: 'pending'
            };

            // Debug: Log transaction data being saved
            if (window.logger && window.logger.info) {
                window.logger.info('POS transaction being saved', { 
                    category: 'POS', 
                    context: {
                        total: transaction.total,
                        employeeId: transaction.employeeId,
                        employeeIdType: typeof transaction.employeeId,
                        selectedEmployee: this.selectedEmployee,
                        items: transaction.items.length
                    }
                });
            }

            // Save transaction
            const transactionId = await db.add('transactions', transaction);
            
            // Update GC with transaction reference if used
            if (this.appliedGiftCertificate) {
                this.appliedGiftCertificate.usedInTransaction = transactionId;
                await db.update('giftCertificates', this.appliedGiftCertificate);
            }
            
            // Handle room assignment for services
            const selectedRoomId = document.getElementById('checkoutRoomSelect')?.value;
            const hasServices = this.cart.some(item => item.type === 'service');
            
            if (hasServices && selectedRoomId) {
                // Get employee details
                const employee = await db.get('employees', parseInt(this.selectedEmployee));
                
                // Get service names
                const serviceNames = this.cart
                    .filter(item => item.type === 'service')
                    .map(item => item.name)
                    .join(', ');
                
                // Assign room to service
                if (window.roomManager) {
                    await window.roomManager.assignRoomToService(parseInt(selectedRoomId), {
                        serviceName: serviceNames,
                        clientName: transaction.customerName || 'Walk-in',
                        employeeId: this.selectedEmployee,
                        employeeName: employee?.name || 'Unknown',
                        transactionId: transactionId,
                        estimatedDuration: 60 // Default 60 minutes
                    });
                }
            }

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
                    if (window.logger) {
                        window.logger.debug('Commission calculated', {
                            category: 'POS',
                            operation: 'calculate_commission',
                            data: {
                                employeeName: employee.name,
                                commission: commission
                            }
                        });
                    }
                }
            }

            // Log successful transaction
            if (window.logger) {
                window.logger.info('Transaction completed successfully', {
                    category: 'POS',
                    operation: 'checkout_success',
                    data: {
                        transactionId: transactionId,
                        total: transaction.total,
                        paymentMethod: paymentMethod,
                        employeeId: transaction.employeeId,
                        itemCount: transaction.items.length
                    }
                });
            }

            // Clear cart
            this.cart = [];
            this.updateCartDisplay();

            // Hide loading and close modal
            hideLoading();
            setButtonLoading('confirmCheckoutBtn', false);
            closeModal('checkoutModal');

            // Small delay to ensure modal closes, then show success
            setTimeout(() => {
                showNotification('Sale completed successfully!', 'success');
            }, 100);

            // Refresh dashboard if it's the current page
            if (window.app.currentPage === 'dashboard') {
                window.loadDashboard && window.loadDashboard();
            }

        } catch (error) {
            if (window.logger && window.logger.error) {
                window.logger.error('Checkout failed', { category: 'POS', error, context: { operation: 'checkout' } });
            } else {
                if (window.logger) {
                    window.logger.error('Checkout failed', {
                        category: 'POS',
                        operation: 'checkout',
                        error: error
                    });
                }
            }
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
            if (window.logger) {
                window.logger.error('Failed to process service supply usage', {
                    category: 'POS',
                    operation: 'process_supply_usage',
                    error: error
                });
            }
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

            if (window.logger) {
                window.logger.info('Auto-tracked supply usage', {
                    category: 'POS',
                    operation: 'auto_track_supply',
                    data: {
                        amount: usageAmount,
                        unit: inventoryItem.unit || 'units',
                        itemName: inventoryItem.name,
                        serviceName: serviceName
                    }
                });
            }
            
        } catch (error) {
            if (window.logger) {
                window.logger.error('Failed to update inventory with usage tracking', {
                    category: 'POS',
                    operation: 'update_inventory_usage',
                    error: error
                });
            }
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
        if (window.logger) {
            window.logger.debug('Supply usage tracking available', {
                category: 'POS',
                operation: 'check_supply_tracking',
                data: { serviceName: serviceItem.name }
            });
        }
    }
}

// Initialize POS system
const posSystem = new POSSystem();

// Load POS when page is shown
window.loadPOS = async function() {
    await posSystem.init();
};
