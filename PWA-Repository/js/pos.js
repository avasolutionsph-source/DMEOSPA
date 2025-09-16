// POS System Management

// IMMEDIATE DEBUG: Check if POS script is loading
console.log('🔥 POS.JS SCRIPT LOADED - This message confirms the script is executing!');
console.log('🔥 Current location:', window.location.href);
console.log('🔥 Current timestamp:', new Date().toISOString());

// Ensure utility functions are available
(function() {
    if (!window.showSuccess) {
        window.showSuccess = window.showNotification ? 
            (msg) => window.showNotification(msg, 'success') : 
            (msg) => alert('✅ ' + msg);
    }
    if (!window.showError) {
        window.showError = window.showNotification ? 
            (msg) => window.showNotification(msg, 'error') : 
            (msg) => alert('❌ ' + msg);
    }
    if (!window.showWarning) {
        window.showWarning = window.showNotification ? 
            (msg) => window.showNotification(msg, 'warning') : 
            (msg) => alert('⚠️ ' + msg);
    }
    if (!window.showInfo) {
        window.showInfo = window.showNotification ? 
            (msg) => window.showNotification(msg, 'info') : 
            (msg) => alert('ℹ️ ' + msg);
    }
    if (!window.showLoading) {
        window.showLoading = (title, msg) => console.log('Loading:', title, msg);
    }
    if (!window.hideLoading) {
        window.hideLoading = () => console.log('Loading complete');
    }
    if (!window.setButtonLoading) {
        window.setButtonLoading = (btnId, loading) => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.disabled = loading;
                if (loading) {
                    btn.dataset.originalText = btn.innerHTML;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
                } else if (btn.dataset.originalText) {
                    btn.innerHTML = btn.dataset.originalText;
                }
            }
        };
    }
})();

class POSSystem {
    constructor() {
        // Initialize all properties
        this.cart = [];
        this.currentCategory = 'all'; // Always start with 'all' to show everything
        this.products = [];
        this.inventory = [];
        this.employees = [];
        
        // Discount and GC tracking
        this.appliedGiftCertificate = null;
        this.appliedSeniorPWDDiscount = null;
        this.appliedPromoDiscount = null;
        this.discountAmount = 0;
        this.gcAmount = 0;
        
        // Room type labels
        this.roomTypes = {
            'massage': 'Massage Room',
            'facial': 'Facial Room',
            'couple': 'Couple\'s Room',
            'vip': 'VIP Suite',
            'general': 'General Purpose'
        };
    }

    async init() {
        await this.loadEmployees();
        await this.loadProducts();
        this.setupEventListeners();
        this.updateCartDisplay();
    }

    // Currency formatting helper
    formatCurrency(amount) {
        try {
            if (window.formatCurrency && typeof window.formatCurrency === 'function') {
                return window.formatCurrency(amount || 0);
            }
            // Fallback formatting
            return '₱' + (amount || 0).toLocaleString('en-PH', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        } catch (error) {
            console.warn('Currency formatting error:', error);
            return '₱' + (amount || 0).toFixed(2);
        }
    }

    // Unified logging methods to reduce duplicate code
    logError(message, operation, error) {
        if (window.logger) {
            window.logger.error(message, {
                category: 'POS',
                operation,
                error
            });
        } else {
            console.error(message, error);
        }
    }

    logInfo(message, operation, data) {
        if (window.logger) {
            window.logger.info(message, {
                category: 'POS',
                operation,
                data
            });
        }
    }

    logDebug(message, operation, data) {
        if (window.logger) {
            window.logger.debug(message, {
                category: 'POS',
                operation,
                data
            });
        }
    }

    // Fixed: Use dedicated stock adjustment endpoint to preserve all inventory fields
    async updateInventoryStock(itemId, quantityChange) {
        console.log('📦 [POS] Updating inventory stock:', itemId, 'change:', quantityChange);
        
        // Get authentication token
        const token = this.getAuthToken();
        if (!token) {
            console.error('❌ [POS] No authentication token found');
            return;
        }
        
        try {
            // FIXED: Use dedicated stock adjustment endpoint that preserves all fields
            const stockUpdateResponse = await fetch(`${window.API_CONFIG?.BASE_URL || 'https://daetspa-backend.onrender.com'}/api/inventory/${itemId}/stock`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    quantity: Math.abs(quantityChange),
                    operation: quantityChange >= 0 ? 'add' : 'subtract'
                })
            });
            
            if (stockUpdateResponse.ok) {
                const result = await stockUpdateResponse.json();
                console.log('✅ [POS] Stock updated successfully, preserving all inventory fields:', {
                    itemId,
                    quantityChange,
                    newStock: result.data?.currentStock
                });
            } else {
                const errorText = await stockUpdateResponse.text();
                console.error('❌ [POS] Failed to update inventory stock:', stockUpdateResponse.statusText, errorText);
            }
        } catch (error) {
            console.error('❌ [POS] Stock update error:', error);
        }
    }


    setupEventListeners() {
        if (this._listenersAttached) return;
        
        // Check if we're actually on the POS page before setting up listeners
        const posPage = document.getElementById('pos');
        if (!posPage) {
            console.log('🔍 [POS] Not on POS page, skipping event listener setup');
            return;
        }
        
        this._listenersAttached = true;
        // Employee selection removed from main POS interface
        // Employee selection now only handled in checkout modal

        // Product search
        const searchInput = document.getElementById('productSearch');
        if (searchInput) {
            // Use window.debounce if available, otherwise use a simple timeout
            const debounceFn = window.debounce || ((func, wait) => {
                let timeout;
                return function(...args) {
                    clearTimeout(timeout);
                    timeout = setTimeout(() => func.apply(this, args), wait);
                };
            });
            
            searchInput.addEventListener('input', debounceFn((e) => {
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
        const clearCartBtn = document.getElementById('clearCart');
        if (clearCartBtn) {
            clearCartBtn.addEventListener('click', () => {
            if (this.cart.length > 0) {
                const itemCount = this.cart.length;
                const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
                if (confirm(`Clear cart?\n\nThis will remove ${itemCount} product(s) (${totalItems} total items) from your cart.\n\nAre you sure?`)) {
                    this.clearCart();
                }
            } else {
                showInfo('Cart is already empty');
            }
            });
        }

        // Checkout button
        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => {
                if (this.cart.length > 0) {
                    this.showCheckout();
                } else {
                    showWarning('Cart is empty');
                }
            });
        }

        // Confirm checkout button
        const confirmCheckoutBtn = document.getElementById('confirmCheckoutBtn');
        if (confirmCheckoutBtn) {
            confirmCheckoutBtn.addEventListener('click', () => {
                this.processCheckout();
            });
        }

        // Event delegation for product cards (prevents duplicate listeners)
        const productGrid = document.getElementById('posProductsGrid');
        if (productGrid) {
            productGrid.addEventListener('click', (e) => {
                const productCard = e.target.closest('.product-card');
                if (productCard) {
                    e.preventDefault();
                    e.stopPropagation();
                    const itemId = productCard.getAttribute('data-item-id');
                    const itemType = productCard.getAttribute('data-item-type');
                    console.log('🖱️ Product card clicked via delegation:', { itemId, itemType });
                    if (itemId && itemType) {
                        this.addToCart(itemId, itemType);
                    } else {
                        console.error('❌ Missing item data on product card');
                    }
                }
            });
        }
    }

    async loadEmployees(selectId = 'employeeSelect', setSelected = false) {
        try {
            console.log('👥 [POS] Loading employees from MongoDB API...');
            
            // Get authentication token
            let token = this.getAuthToken();
            
            // SECURITY FIX: Removed development token generation to prevent cross-user data access
            if (!token && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
                console.warn('🚨 [POS] No auth token found for employee loading - user must login properly');
                console.log('🔐 [POS] Development tokens disabled to prevent data contamination');
            }
            
            if (!token) {
                console.error('❌ [POS] No authentication token found');
                return;
            }
            
            // Use HybridAPIClient for offline support
            const result = await window.HybridAPIClient.getEmployees();
            
            let employees = [];
            if (result.success) {
                const rawEmployees = result.data || [];
                console.log(`✅ [POS] Loaded ${rawEmployees.length} employees from ${result.source || 'API'}`);
                
                // Convert firstName/lastName back to name for PWA compatibility
                employees = rawEmployees.map(emp => ({
                    ...emp,
                    name: emp.firstName ? `${emp.firstName} ${emp.lastName}`.trim() : emp.name
                }));
            } else {
                console.error('❌ [POS] Failed to load employees:', result.error);
                employees = [];
            }
            
            // Store employees for later use in checkout
            this.employees = employees;
            const select = document.getElementById(selectId);
            console.log('🔧 LoadEmployees Debug:', {
                selectId: selectId,
                selectElement: select,
                selectExists: !!select,
                employeeCount: employees.length,
                employeeData: employees.map(emp => ({id: emp.id, name: emp.name}))
            });
            
            if (select) {
                select.innerHTML = '<option value="">Select Employee</option>';
                
                // Check which employees are currently assigned to active services
                // Ensure room manager is initialized before checking assignments
                let assignedEmployeeIds = [];
                
                console.log('🔧 [POS] Checking employee assignments:', {
                    roomManagerExists: !!window.roomManager,
                    getActiveServicesExists: !!(window.roomManager && window.roomManager.getActiveServices),
                    roomManagerInitialized: window.roomManager?.initialized
                });
                
                // Initialize room manager if not already done
                if (window.roomManager && !window.roomManager.initialized) {
                    console.log('🔄 [POS] Room manager not initialized, initializing now...');
                    try {
                        await window.roomManager.init();
                        window.roomManager.initialized = true;
                    } catch (error) {
                        console.error('❌ [POS] Failed to initialize room manager:', error);
                    }
                }
                
                // Now check for active services
                if (window.roomManager && window.roomManager.getActiveServices) {
                    const activeServices = window.roomManager.getActiveServices();
                    console.log('🔧 [POS] Active services found:', activeServices);
                    
                    assignedEmployeeIds = activeServices
                        .filter(service => service.status === 'active')
                        .map(service => {
                            // Handle both string and number employee IDs
                            const empId = service.employeeId;
                            return empId ? String(empId) : null;
                        })
                        .filter(id => id !== null);
                    
                    console.log('🔧 [POS] Assigned employee IDs:', assignedEmployeeIds);
                    console.log('🔧 [POS] Active services details:', activeServices.map(s => ({
                        employeeId: s.employeeId,
                        employeeName: s.employeeName,
                        roomName: s.roomName,
                        status: s.status
                    })));
                } else {
                    console.log('⚠️ [POS] Room manager or getActiveServices not available');
                }
                
                employees.forEach(emp => {
                    const option = document.createElement('option');
                    option.value = emp.id || emp._id;
                    
                    // Check if employee is assigned - match by name AND ID for reliability
                    const empIdStr = String(emp.id || emp._id);
                    const empName = emp.name;
                    
                    // Get active services to check by both ID and name
                    const activeServices = window.roomManager && window.roomManager.getActiveServices ? 
                        window.roomManager.getActiveServices() : [];
                    
                    // Debug active services for this iteration
                    console.log('🔍 [POS] Active services for matching:', activeServices.map(s => ({
                        serviceName: s.serviceName,
                        employeeName: s.employeeName,
                        employeeId: s.employeeId,
                        employeeIdType: typeof s.employeeId,
                        roomName: s.roomName,
                        status: s.status,
                        fullService: s // Show the complete service object
                    })));
                    
                    const isAssigned = activeServices.some(service => {
                        // Only proceed if this is an active service
                        if (service.status !== 'active') return false;
                        
                        // FIXED: Strict matching logic
                        // If service has valid employeeId, use ID matching only
                        if (service.employeeId && service.employeeId !== 'undefined' && service.employeeId !== null) {
                            const serviceEmpIdMatch = String(service.employeeId) === empIdStr || 
                                                    String(service.employeeId) === String(emp.id) ||
                                                    String(service.employeeId) === String(emp._id);
                            
                            console.log('🔍 [POS] ID-based matching:', {
                                employeeName: empName,
                                serviceEmployeeId: service.employeeId,
                                empIdStr: empIdStr,
                                match: serviceEmpIdMatch
                            });
                            
                            return serviceEmpIdMatch;
                        }
                        
                        // If no valid employeeId, use EXACT name matching only
                        if (service.employeeName) {
                            const serviceEmpNameMatch = service.employeeName === empName;
                            
                            console.log('🔍 [POS] Name-based matching:', {
                                employeeName: empName,
                                serviceEmployeeName: service.employeeName,
                                exactMatch: serviceEmpNameMatch
                            });
                            
                            if (serviceEmpNameMatch) {
                                console.log('🎯 [POS] Employee MATCHED by name:', {
                                    employeeName: empName,
                                    serviceName: service.serviceName,
                                    roomName: service.roomName
                                });
                            }
                            
                            return serviceEmpNameMatch;
                        }
                        
                        return false;
                    });
                    
                    console.log('🔧 [POS] Employee assignment check:', {
                        employeeName: empName,
                        employeeId: emp.id,
                        empIdStr: empIdStr,
                        assignedEmployeeIds: assignedEmployeeIds,
                        activeServices: activeServices.map(s => ({
                            employeeId: s.employeeId,
                            employeeName: s.employeeName,
                            status: s.status
                        })),
                        isAssigned: isAssigned
                    });
                    
                    const statusIcon = isAssigned ? '🔴' : '🟢';
                    const statusText = isAssigned ? 'ASSIGNED' : 'AVAILABLE';
                    
                    let employeeText = `${statusIcon} ${emp.name} - ${emp.position}`;
                    
                    if (isAssigned) {
                        // Find which service they're assigned to using same strict matching logic
                        const assignedService = activeServices.find(service => {
                            if (service.status !== 'active') return false;
                            
                            // Use same logic as assignment check
                            if (service.employeeId && service.employeeId !== 'undefined' && service.employeeId !== null) {
                                return String(service.employeeId) === empIdStr || 
                                       String(service.employeeId) === String(emp.id) ||
                                       String(service.employeeId) === String(emp._id);
                            }
                            
                            // If no valid employeeId, use exact name matching
                            return service.employeeName === empName;
                        });
                        
                        if (assignedService) {
                            employeeText += ` (${statusText} - ${assignedService.roomName})`;
                        } else {
                            employeeText += ` (${statusText})`;
                        }
                        // Don't disable assigned employees - they can handle multiple services
                        option.style.color = '#b8860b'; // Dark golden color for assigned but available
                    } else {
                        employeeText += ` (${statusText})`;
                    }
                    
                    option.textContent = employeeText;
                    select.appendChild(option);
                });
                
                // Note: Employee selection now handled only in checkout modal
            }
        } catch (error) {
            this.logError('Failed to load employees', 'load_employees', error);
        }
    }

    async loadProducts() {
        try {
            console.log('🛍️ [POS] Loading products and inventory from MongoDB API...');
            
            // Get authentication token
            const token = this.getAuthToken();
            console.log('🔍 [POS DEBUG] Authentication Check:', {
                hasToken: !!token,
                tokenLength: token ? token.length : 0,
                tokenPreview: token ? `${token.substring(0, 20)}...` : 'none',
                localStorageUser: localStorage.getItem('currentUser'),
                localStorageAuth: localStorage.getItem('authToken') ? 'exists' : 'missing'
            });
            
            if (!token) {
                console.error('❌ [POS] No authentication token found');
                console.error('❌ [POS DEBUG] Available localStorage keys:', Object.keys(localStorage));
                return;
            }
            
            // Load products from MongoDB API
            // Load products using HybridAPIClient
            const productsResult = await window.HybridAPIClient.getProducts();
            
            let products = [];
            if (productsResult.success) {
                console.log('🔍 [POS DEBUG] Raw API Response:', {
                    success: productsResult.success,
                    dataType: typeof productsResult.data,
                    dataArray: Array.isArray(productsResult.data),
                    dataLength: productsResult.data ? productsResult.data.length : 0,
                    source: productsResult.source,
                    fullResponse: productsResult
                });
                
                if (productsResult.data && productsResult.data.length > 0) {
                    console.log('🔍 [POS DEBUG] RAW API DATA - First Product Sample:', productsResult.data[0]);
                    console.log('🔍 [POS DEBUG] RAW API DATA - All Products Properties:', 
                        productsResult.data.map(p => ({
                            id: p.id || p._id,
                            name: p.name,
                            category: p.category,
                            price: p.price,
                            showInPOS: p.showInPOS,
                            showInPOSType: typeof p.showInPOS,
                            isActive: p.isActive,
                            isActiveType: typeof p.isActive,
                            userId: p.userId,
                            type: p.type,
                            duration: p.duration
                        }))
                    );
                }
                
                // Transform API data to match POS expectations
                products = (productsResult.data || []).map(p => ({
                    ...p,
                    // Set type based on category - services have categories like 'massage', 'facial', etc.
                    type: ['product'].includes(p.category) ? 'product' : 'service',
                    // FIXED: Keep original values as-is, don't force to true
                    // POS filtering will handle undefined/null properly now
                    showInPOS: p.showInPOS,
                    isActive: p.isActive,
                    // Ensure price is a number
                    price: parseFloat(p.price) || 0,
                    // Ensure category is set
                    category: p.category || 'service',
                    // Ensure name is set
                    name: p.name || 'Unnamed Service'
                }));
                console.log(`✅ [POS] Loaded ${products.length} products from ${productsResult.source || 'API'}`);
                console.log('🔍 [POS DEBUG] After Transformation:', 
                    products.map(p => ({
                        id: p.id || p._id,
                        name: p.name,
                        category: p.category,
                        type: p.type,
                        showInPOS: p.showInPOS,
                        price: p.price
                    }))
                );
            } else {
                console.error('❌ [POS] Failed to load products:', productsResult.error);
                console.error('❌ [POS DEBUG] Full Error Response:', productsResult);
                products = [];
            }
            
            // Load inventory - prioritize local data if recently modified (within 30 seconds) to preserve POS changes
            let inventory = [];
            let useLocalInventory = false;
            
            if (window.db) {
                const localInventory = await window.db.getAll('inventory') || [];
                const recentItems = localInventory.filter(item => {
                    const modifiedAt = new Date(item.modifiedAt || 0);
                    const now = new Date();
                    return (now - modifiedAt) < 30000; // 30 seconds
                });
                
                if (recentItems.length > 0) {
                    console.log('📦 [POS] Using local IndexedDB inventory to preserve recent changes');
                    inventory = localInventory;
                    useLocalInventory = true;
                }
            }
            
            // Fallback to API if no recent local changes
            if (!useLocalInventory) {
                console.log('📦 [POS] Loading inventory from API (no recent local changes)');
                const inventoryResult = await window.HybridAPIClient.getInventory();
                
                if (inventoryResult.success) {
                    inventory = inventoryResult.data || [];
                    console.log(`✅ [POS] Loaded ${inventory.length} inventory items from ${inventoryResult.source || 'API'}`);
                } else {
                    console.error('❌ [POS] Failed to load inventory:', inventoryResult.error);
                    // Try local as last resort
                    if (window.db) {
                        inventory = await window.db.getAll('inventory') || [];
                        console.log('📦 [POS] Using local IndexedDB as fallback after API failure');
                    } else {
                        inventory = [];
                    }
                }
            }
            
            // Initialize empty products array if none exist
            if (!products || products.length === 0) {
                products = [];
            }
            
            // Show only products/services with showInPOS enabled
            console.log('🔍 [POS DEBUG] Before Filtering - Products:', products.length);
            
            // TEMPORARY: Disable all filtering to test display
            this.products = products;
            console.log('🚨 [POS DEBUG] FILTERING DISABLED - All products should show:', this.products.length);
            
            console.log('🔍 [POS DEBUG] After Filtering - Products:', {
                originalCount: products.length,
                filteredCount: this.products.length,
                filteredOut: products.length - this.products.length,
                remainingProducts: this.products.map(p => ({
                    name: p.name,
                    category: p.category,
                    type: p.type,
                    showInPOS: p.showInPOS
                }))
            });
            
            // No hardcoded sample products - new accounts start with clean slate
            if (this.products.length === 0 && products.length === 0) {
                console.log('ℹ️ [POS] No services found - user needs to add services in the Services page');
                this.products = []; // Start with empty array for new accounts
            }
            
            // FIXED: Include inventory items that are active and either availableInPOS is true OR undefined/null (backward compatibility)
            this.inventory = inventory.filter(i => i.isActive !== false && (i.availableInPOS === true || i.availableInPOS == null));
            
            // Debug log to see what's loaded
            console.log('POS Products loaded:', {
                totalProducts: products.length,
                filteredProducts: this.products.length,
                totalInventory: inventory.length,
                filteredInventory: this.inventory.length,
                products: this.products.map(p => ({ name: p.name, showInPOS: p.showInPOS, type: p.type, price: p.price })),
                inventory: this.inventory.map(i => ({ name: i.name, availableInPOS: i.availableInPOS, isActive: i.isActive, currentStock: i.currentStock }))
            });
            
            // Combine and display
            this.displayProducts();
        } catch (error) {
            this.logError('Failed to load products', 'load_products', error);
        }
    }

    displayProducts(searchTerm = '') {
        console.log('🔍 [POS DEBUG] displayProducts called:', {
            searchTerm: searchTerm,
            productsCount: this.products?.length || 0,
            inventoryCount: this.inventory?.length || 0,
            currentCategory: this.currentCategory
        });
        
        const grid = document.getElementById('posProductsGrid');
        console.log('🔍 [POS DEBUG] Grid element:', {
            found: !!grid,
            id: grid?.id,
            className: grid?.className,
            innerHTML: grid?.innerHTML?.length || 0
        });
        
        if (!grid) {
            console.error('❌ POS products grid not found');
            console.error('❌ Available elements:', Array.from(document.querySelectorAll('[id*="pos"], [class*="pos"]')).map(el => ({id: el.id, class: el.className})));
            return;
        }

        let items = [...(this.products || []), ...(this.inventory || [])];
        console.log('🔍 [POS DEBUG] Combined items before filtering:', {
            totalItems: items.length,
            fromProducts: this.products?.length || 0,
            fromInventory: this.inventory?.length || 0,
            items: items.map(i => ({name: i.name, category: i.category, type: i.type}))
        });

        // Filter by category
        console.log('🔍 [POS DEBUG] Category filtering:', {
            currentCategory: this.currentCategory,
            willFilter: this.currentCategory !== 'all'
        });
        
        if (this.currentCategory !== 'all') {
            if (this.currentCategory === 'products') {
                // Products are items from inventory with physical stock
                const beforeCount = items.length;
                items = items.filter(item => item.currentStock !== undefined || item.quantity !== undefined);
                console.log('🔍 [POS DEBUG] Products filter:', {beforeCount, afterCount: items.length});
            } else if (this.currentCategory === 'services') {
                // Services are items from products API (spa services) - check for duration field
                const beforeCount = items.length;
                items = items.filter(item => item.duration !== undefined || item.type === 'service');
                console.log('🔍 [POS DEBUG] Services filter:', {beforeCount, afterCount: items.length});
            } else {
                // Filter by specific spa service category (massage, facial, etc.)
                const beforeCount = items.length;
                items = items.filter(item => {
                    const isService = item.duration !== undefined || item.type === 'service' || !item.currentStock;
                    const matchesCategory = item.category === this.currentCategory;
                    console.log('🔍 [POS DEBUG] Category match check:', {
                        itemName: item.name,
                        itemCategory: item.category,
                        targetCategory: this.currentCategory,
                        isService,
                        matchesCategory,
                        willShow: isService && matchesCategory
                    });
                    return isService && matchesCategory;
                });
                console.log('🔍 [POS DEBUG] Specific category filter:', {
                    category: this.currentCategory,
                    beforeCount,
                    afterCount: items.length
                });
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
        console.log('🔍 [POS DEBUG] Final items for display:', {
            finalItemsCount: items.length,
            finalItems: items.map(i => ({
                name: i.name,
                id: i.id || i._id,
                type: i.type,
                category: i.category,
                price: i.price
            }))
        });
        
        if (items.length > 0) {
            console.log('🔍 [POS DEBUG] Generating HTML for items...');
            const htmlContent = items.map((item, index) => {
                const itemId = item.id || item._id;
                if (!itemId) {
                    console.error('❌ Item missing ID:', item);
                    return ''; // Skip items without valid ID
                }
                
                // Determine item type - inventory items have currentStock/quantity, services have duration
                const itemType = (item.currentStock !== undefined || item.quantity !== undefined) ? 'inventory' : 'service';
                console.log('🔍 [POS DEBUG] Item type determination:', {
                    name: item.name,
                    hasCurrentStock: item.currentStock !== undefined,
                    hasQuantity: item.quantity !== undefined,
                    hasDuration: item.duration !== undefined,
                    originalType: item.type,
                    determinedType: itemType
                });
                
                const html = `
                <div class="product-card" 
                     data-item-id="${itemId}" 
                     data-item-type="${itemType}"
                     style="cursor: pointer; border: 2px solid #ddd; border-radius: 8px; padding: 1rem; margin: 0.5rem; transition: all 0.2s;"
                     onmouseover="this.style.borderColor='#800020'; this.style.transform='scale(1.02)'"
                     onmouseout="this.style.borderColor='#ddd'; this.style.transform='scale(1)'">
                    <i class="fas fa-${itemType === 'service' ? 'concierge-bell' : itemType === 'inventory' ? 'shopping-bag' : 'box'}"></i>
                    <h4>${item.name}</h4>
                    <p class="price">${this.formatCurrency(itemType === 'inventory' ? (item.sellingPrice || item.price || item.unitPrice || 0) : (item.price || 0))}</p>
                    ${item.currentStock !== undefined ? `<small>Stock: ${item.currentStock}</small>` : ''}
                    ${itemType === 'service' ? '<small style="color: #800020;"><i class="fas fa-user-check"></i> Requires Employee</small>' : ''}
                </div>
            `;
                console.log('🔍 [POS DEBUG] Generated HTML for:', item.name, html.length, 'chars');
                return html;
            }).filter(html => html !== '').join('');
            
            console.log('🔍 [POS DEBUG] Setting grid HTML:', {
                totalHTMLLength: htmlContent.length,
                gridExists: !!grid
            });
            
            grid.innerHTML = htmlContent;
            
            console.log('🔍 [POS DEBUG] HTML set complete:', {
                gridInnerHTML: grid.innerHTML.length,
                gridChildren: grid.children.length
            });
            
            // Event delegation handles product card clicks (see setupEventListeners)
        } else {
            console.log('🔍 [POS DEBUG] No items to display - showing empty message');
            // No products found - show helpful message
            grid.innerHTML = `
                <div class="no-products" style="text-align: center; padding: 2rem; color: #666;">
                    <i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <h3>No Services Available</h3>
                    <p>Add services in the Services page to start using the POS system.</p>
                    <div style="margin-top: 1rem; padding: 1rem; background: #f0f0f0; border-radius: 4px;">
                        <strong>Debug Info:</strong><br>
                        Products loaded: ${this.products?.length || 0}<br>
                        Inventory loaded: ${this.inventory?.length || 0}<br>
                        Current category: ${this.currentCategory}<br>
                        Search term: "${searchTerm}"
                    </div>
                </div>
            `;
        }
    }

    filterProducts(searchTerm = '') {
        this.displayProducts(searchTerm);
    }

    async addToCart(itemId, itemType) {
        console.log('🛒 addToCart called:', { itemId, itemType, cartLength: this.cart.length });
        
        try {
            // Validate inputs
            if (!itemId) {
                console.error('❌ No itemId provided');
                showError('Invalid item ID');
                return;
            }
            
            this.logDebug('Adding item to cart', 'add_to_cart', { itemId, itemType });
            let item;
            
            if (itemType === 'inventory') {
                console.log('🔍 Looking for inventory item with ID:', itemId, 'type:', typeof itemId);
                // Use cached inventory data from loadProducts()
                item = this.inventory.find(invItem => 
                    invItem._id === itemId || 
                    invItem.id === itemId || 
                    String(invItem._id) === String(itemId) || 
                    String(invItem.id) === String(itemId)
                );
                console.log('📦 Retrieved inventory item from cache:', item);
                console.log('📦 Stock field analysis:', {
                    currentStock: item?.currentStock,
                    quantity: item?.quantity,
                    hasCurrentStock: item?.currentStock !== undefined,
                    hasQuantity: item?.quantity !== undefined
                });
                if (item) {
                    // Check stock - use currentStock first, then quantity as fallback
                    const stockValue = item.currentStock !== undefined ? item.currentStock : (item.quantity || 0);
                    console.log('📦 Final stock value for validation:', stockValue);
                    if (stockValue <= 0) {
                        showError('Item out of stock');
                        return;
                    }
                    // Store the correct stock value for later use (don't modify original item)
                    item.availableStock = stockValue;
                }
            } else {
                console.log('🔍 Looking for product item with ID:', itemId, 'type:', typeof itemId);
                // Use cached products data from loadProducts()
                item = this.products.find(product => 
                    product._id === itemId || 
                    product.id === itemId || 
                    String(product._id) === String(itemId) || 
                    String(product.id) === String(itemId)
                );
                console.log('🏥 Retrieved product/service item from cache:', item);
            }

            if (!item) {
                console.error('❌ Item not found in cache:', { itemId, itemType });
                // Debug: Let's see what's actually in the cache
                if (itemType === 'inventory') {
                    console.log('📦 All cached inventory items:', this.inventory);
                    console.log('📦 Available inventory IDs:', this.inventory.map(i => ({ _id: i._id, id: i.id, name: i.name })));
                } else {
                    console.log('🏥 All cached products:', this.products);
                    console.log('🏥 Available product IDs:', this.products.map(p => ({ _id: p._id, id: p.id, name: p.name })));
                }
                showError('Item not found');
                return;
            }

            // Check if item already in cart
            const existingItem = this.cart.find(cartItem => 
                cartItem.id == itemId && cartItem.type === itemType
            );

            if (existingItem) {
                // Check stock before incrementing
                if (itemType === 'inventory' && existingItem.quantity >= item.availableStock) {
                    showWarning('Not enough stock available');
                    return;
                }
                existingItem.quantity++;
                console.log('📈 Updated existing cart item quantity:', existingItem.quantity);
            } else {
                const newItem = {
                    id: itemId,
                    type: itemType,
                    name: item.name || 'Unknown Item',
                    price: itemType === 'inventory' ? (item.sellingPrice || item.price || item.unitPrice || 0) : (item.price || 0),
                    quantity: 1,
                    maxStock: item.currentStock || null
                };
                
                this.cart.push(newItem);
            }

            this.updateCartDisplay();
            
            // Use window.showSuccess if available, otherwise fallback
            const showSuccessMsg = window.showSuccess || showSuccess || ((msg) => alert('✅ ' + msg));
            showSuccessMsg(`${item.name} added to cart`);
            
            this.logInfo('Item added to cart successfully', 'add_to_cart_success', { 
                itemName: item.name, 
                itemId, 
                price: itemType === 'inventory' ? (item.sellingPrice || item.price || item.unitPrice || 0) : (item.price || 0),
                cartSize: this.cart.length 
            });
        } catch (error) {
            console.error('❌ Error in addToCart:', error);
            this.logError('Failed to add item to cart', 'add_to_cart_error', error);
            const showErrorMsg = window.showError || showError || ((msg) => alert('❌ ' + msg));
            const errorMsg = error?.message || error?.toString() || 'Unknown error occurred';
            showErrorMsg('Failed to add item to cart: ' + errorMsg);
        }
    }

    removeFromCart(index) {
        const item = this.cart[index];
        if (confirm(`Remove ${item.name} from cart?`)) {
            this.cart.splice(index, 1);
            
            this.updateCartDisplay();
            showInfo(`${item.name} removed from cart`);
        }
    }

    updateQuantity(index, change) {
        const item = this.cart[index];
        const newQuantity = item.quantity + change;

        if (newQuantity <= 0) {
            this.removeFromCart(index);
        } else if (item.maxStock && newQuantity > item.maxStock) {
            showWarning('Not enough stock available');
        } else {
            item.quantity = newQuantity;
            this.updateCartDisplay();
        }
    }

    clearCart() {
        this.cart = [];
        
        // Reset discount tracking
        this.appliedGiftCertificate = null;
        this.appliedSeniorPWDDiscount = null;
        this.appliedPromoDiscount = null;
        this.discountAmount = 0;
        this.gcAmount = 0;
        
        this.updateCartDisplay();
        showInfo('Cart cleared');
    }

    updateCartDisplay() {
        console.log('🔄 Updating cart display, cart length:', this.cart.length);
        
        try {
            const cartItemsDiv = document.getElementById('cartItems');
            const totalSpan = document.getElementById('cartTotal');

            // Check if required DOM elements exist
            if (!cartItemsDiv) {
                console.warn('⚠️ cartItems element not found');
                return;
            }

            // Hide the main employee selection when cart has items - we'll use the one in checkout modal
            const employeeSelection = document.querySelector('.employee-selection');
            if (employeeSelection) {
                // Always hide the main employee selection since we use checkout modal
                employeeSelection.style.display = 'none';
            }

            if (this.cart.length === 0) {
                cartItemsDiv.innerHTML = '<div class="empty-cart">Cart is empty</div>';
                if (totalSpan) totalSpan.textContent = '₱0.00';
                return;
            }

            // Check if there are services in cart
            const hasServices = this.cart.some(item => item.type === 'service');
            
            // Display notice if services in cart - employee will be selected at checkout
            let serviceNotice = '';
            if (hasServices) {
                serviceNotice = `
                    <div style="background: #e8d5d5; border: 1px solid #800020; padding: 0.75rem; border-radius: 6px; margin-bottom: 0.75rem; font-size: 0.875rem; color: #800020;">
                        <i class="fas fa-info-circle"></i> Service items in cart - Employee will be assigned at checkout
                    </div>
                `;
            }

            // Helper function for currency formatting with enhanced error handling
            const formatCurrency = (amount) => {
                try {
                    if (window.app && typeof window.app.formatCurrency === 'function') {
                        return window.app.formatCurrency(amount || 0);
                    }
                    return '₱' + (amount || 0).toFixed(2);
                } catch (error) {
                    console.warn('Currency formatting error:', error);
                    return '₱' + (amount || 0).toFixed(2);
                }
            };

            // Display cart items
            cartItemsDiv.innerHTML = serviceNotice + this.cart.map((item, index) => `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <div class="cart-item-name">${item.name || 'Unknown Item'} ${item.type === 'service' ? '<span style="color: #800020; font-size: 0.75rem;">(Service)</span>' : ''}</div>
                        <div class="cart-item-price">${formatCurrency(item.price || 0)} each</div>
                    </div>
                    <div class="cart-item-actions">
                        <div class="quantity-control">
                            <button class="quantity-btn" onclick="window.posSystem.updateQuantity(${index}, -1)">
                                <i class="fas fa-minus"></i>
                            </button>
                            <span class="quantity-display">${item.quantity || 1}</span>
                            <button class="quantity-btn" onclick="window.posSystem.updateQuantity(${index}, 1)">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                        <span class="delete-item" onclick="window.posSystem.removeFromCart(${index})">
                            <i class="fas fa-trash"></i>
                        </span>
                    </div>
                </div>
            `).join('');

            // Calculate totals
            const total = this.cart.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
            
            if (totalSpan) {
                totalSpan.textContent = formatCurrency(total);
            }
            
        } catch (error) {
            console.error('❌ Error updating cart display:', error);
            // Don't throw the error, just log it
        }
    }

    updateEmployeeSelectionUI(hasServices) {
        const requiredIndicator = document.getElementById('employeeRequiredIndicator');
        const selectionHint = document.getElementById('employeeSelectionHint');
        const employeeSelect = document.getElementById('checkoutEmployeeSelect');
        
        if (hasServices) {
            // Services require employee selection
            if (requiredIndicator) requiredIndicator.style.display = 'inline';
            if (selectionHint) selectionHint.textContent = 'Employee selection is required for service items to track commissions';
            if (employeeSelect) employeeSelect.classList.add('required');
        } else {
            // Inventory only - employee optional
            if (requiredIndicator) requiredIndicator.style.display = 'none';
            if (selectionHint) selectionHint.textContent = 'Employee selection is optional for inventory-only purchases';
            if (employeeSelect) employeeSelect.classList.remove('required');
        }
        
        console.log('🎛️ Updated employee selection UI:', {
            hasServices,
            requiredIndicatorVisible: requiredIndicator ? requiredIndicator.style.display !== 'none' : false,
            hintText: selectionHint ? selectionHint.textContent : null
        });
    }

    async showCheckout() {
        console.log('🛒 showCheckout called with cart:', this.cart);
        
        if (!this.cart || this.cart.length === 0) {
            showWarning('Cart is empty');
            return;
        }
        
        const hasServices = this.cart.some(item => item.type === 'service');
        console.log('📋 Cart has services:', hasServices);

        // Reset discounts for new checkout
        try {
            this.resetDiscounts();
        } catch (error) {
            console.warn('Failed to reset discounts:', error);
        }
        
        // Load employees for checkout dropdown and wait for completion
        try {
            console.log('🔄 Starting to load employees for checkout dropdown...');
            await this.loadEmployees('checkoutEmployeeSelect', true);
            
            // Verify the dropdown was actually populated
            const checkoutEmployeeSelect = document.getElementById('checkoutEmployeeSelect');
            console.log('🔧 Post-Load Checkout Employee Select Verification:', {
                element: checkoutEmployeeSelect,
                exists: !!checkoutEmployeeSelect,
                optionCount: checkoutEmployeeSelect ? checkoutEmployeeSelect.options.length : 0,
                options: checkoutEmployeeSelect ? Array.from(checkoutEmployeeSelect.options).map(opt => ({text: opt.text, value: opt.value})) : null
            });
            
            // Note: Main employee select removed from POS interface - employee selection only in checkout modal
        } catch (error) {
            console.error('Failed to load employees for checkout:', error);
            showWarning('Could not load employee list. Please refresh and try again.');
        }
        
        // Update employee selection UI based on cart contents
        this.updateEmployeeSelectionUI(hasServices);
        
        // Ensure Service Assignment section is always visible
        const assignmentSection = document.querySelector('.assignment-section');
        if (assignmentSection) {
            assignmentSection.style.display = 'block';
            assignmentSection.style.visibility = 'visible';
            
            // Force visibility of all child elements
            const h3Element = assignmentSection.querySelector('h3');
            const employeeFormGroup = assignmentSection.querySelector('.form-group');
            
            if (h3Element) {
                h3Element.style.display = 'block';
                h3Element.style.visibility = 'visible';
            }
            
            if (employeeFormGroup) {
                employeeFormGroup.style.display = 'block';
                employeeFormGroup.style.visibility = 'visible';
            }
            
            // Force visibility of the select element specifically
            const checkoutSelect = assignmentSection.querySelector('#checkoutEmployeeSelect');
            if (checkoutSelect) {
                checkoutSelect.style.display = 'block';
                checkoutSelect.style.visibility = 'visible';
            }
            
            console.log('🔍 [POS DEBUG] Assignment section visibility check:', {
                display: assignmentSection.style.display,
                visibility: assignmentSection.style.visibility,
                computedDisplay: window.getComputedStyle(assignmentSection).display,
                computedVisibility: window.getComputedStyle(assignmentSection).visibility,
                offsetParent: assignmentSection.offsetParent,
                innerHTML: assignmentSection.innerHTML.length > 0 ? 'has content' : 'empty'
            });
            
            // Also ensure the select element exists and check all child elements (reuse checkoutSelect)
            const serviceAssignmentH3 = assignmentSection.querySelector('h3');
            
            console.log('🔧 Assignment Section Content Analysis:', {
                checkoutSelectFound: !!checkoutSelect,
                checkoutSelectElement: checkoutSelect,
                serviceAssignmentH3Found: !!serviceAssignmentH3,
                serviceAssignmentH3Text: serviceAssignmentH3 ? serviceAssignmentH3.textContent : 'n/a',
                serviceAssignmentH3Display: serviceAssignmentH3 ? window.getComputedStyle(serviceAssignmentH3).display : 'n/a',
                employeeFormGroupFound: !!employeeFormGroup,
                employeeFormGroupDisplay: employeeFormGroup ? window.getComputedStyle(employeeFormGroup).display : 'n/a',
                allFormGroups: Array.from(assignmentSection.querySelectorAll('.form-group')).map(fg => ({
                    innerHTML: fg.innerHTML.substring(0, 100) + '...',
                    display: window.getComputedStyle(fg).display
                }))
            });
        } else {
            console.warn('⚠️ Service Assignment section not found in checkout modal');
        }

        // Check if there are services in cart to show room assignment (reuse hasServices variable)
        const roomSection = document.getElementById('roomAssignmentSection');
        if (roomSection) {
            if (hasServices) {
                roomSection.style.display = 'block';
                try {
                    await this.loadAvailableRooms();
                } catch (error) {
                    console.warn('Failed to load rooms:', error);
                }
            } else {
                roomSection.style.display = 'none';
            }
        }

        // Update checkout modal with validation
        const checkoutItems = document.getElementById('checkoutItems');
        const checkoutSubtotal = document.getElementById('checkoutSubtotal');
        const checkoutTotal = document.getElementById('checkoutTotal');

        console.log('🔍 Checkout elements found:', {
            checkoutItems: !!checkoutItems,
            checkoutSubtotal: !!checkoutSubtotal,
            checkoutTotal: !!checkoutTotal
        });

        // Validate required checkout elements exist
        if (!checkoutItems || !checkoutSubtotal || !checkoutTotal) {
            console.error('❌ Missing checkout elements');
            showError('Checkout interface is not ready. Please refresh the page.');
            return;
        }

        // Display items
        checkoutItems.innerHTML = this.cart.map(item => `
            <div class="checkout-item">
                <span>${item.name} x ${item.quantity}</span>
                <span>${this.formatCurrency(item.price * item.quantity)}</span>
            </div>
        `).join('');

        // Calculate subtotal
        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        console.log('💰 Checkout subtotal:', subtotal);

        checkoutSubtotal.textContent = this.formatCurrency(subtotal);
        checkoutTotal.textContent = this.formatCurrency(subtotal);

        console.log('🚀 Opening checkout modal...');
        openModal('checkoutModal');
        
        // Initialize customer dropdown and re-load employees after modal opens
        setTimeout(async () => {
            const modal = document.getElementById('checkoutModal');
            if (modal && modal.classList.contains('active')) {
                
                // Re-check if checkoutEmployeeSelect exists after modal is fully opened
                const checkoutEmployeeSelectAfterModal = document.getElementById('checkoutEmployeeSelect');
                console.log('🔧 Checkout Employee Select After Modal Open:', {
                    exists: !!checkoutEmployeeSelectAfterModal,
                    element: checkoutEmployeeSelectAfterModal
                });
                
                // Re-load employees if the element exists now
                if (checkoutEmployeeSelectAfterModal) {
                    console.log('🔄 Re-loading employees for checkout dropdown after modal opened...');
                    try {
                        await this.loadEmployees('checkoutEmployeeSelect', true);
                        
                        // Employee selection only available in checkout modal now
                    } catch (error) {
                        console.error('Failed to re-load employees after modal open:', error);
                    }
                }
                
                // Initialize customer dropdown
                if (window.customerManager) {
                    await window.customerManager.initializeSearchableCustomerDropdown();
                }
            } else {
                console.error('❌ Checkout modal failed to open');
                showError('Failed to open checkout. Please try again.');
            }
        }, 100);
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
            const gcs = await window.db.getByIndex('giftCertificates', 'controlNumber', controlNumber);
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
            this.gcAmount = gc.remainingValue || gc.value || gc.amount || 0;
            statusDiv.innerHTML = `<span style="color: green;"><i class="fas fa-check-circle"></i> Valid! Amount: ${this.formatCurrency(this.gcAmount)}</span>`;
            this.updateCheckoutTotals();
            
        } catch (error) {
            this.logError('Gift certificate validation error', 'validate_gift_certificate', error);
            statusDiv.innerHTML = '<span style="color: red;">Error validating gift certificate</span>';
        }
    }

    // Clear gift certificate when hiding the section
    clearGiftCertificate() {
        this.appliedGiftCertificate = null;
        this.gcAmount = 0;
        this.updateCheckoutTotals();
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
            document.getElementById('checkoutGC').textContent = `-${this.formatCurrency(gcDeduction)}`;
        } else {
            document.getElementById('gcRow').style.display = 'none';
        }
        
        // Update UI
        document.getElementById('checkoutSubtotal').textContent = this.formatCurrency(subtotal);
        
        if (this.discountAmount > 0) {
            document.getElementById('discountRow').style.display = 'flex';
            document.getElementById('checkoutDiscount').textContent = `-${this.formatCurrency(this.discountAmount)}`;
        } else {
            document.getElementById('discountRow').style.display = 'none';
        }
        
        document.getElementById('checkoutTotal').textContent = this.formatCurrency(Math.max(0, total));
    }
    
    // Calculate total with all discounts and deductions applied
    calculateTotal() {
        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        let total = subtotal;
        
        // Reset discount amount
        let discountAmount = 0;
        
        // Apply Senior/PWD discount (20%)
        if (this.appliedSeniorPWDDiscount) {
            const seniorDiscount = subtotal * 0.20;
            discountAmount += seniorDiscount;
        }
        
        // Apply promo discount
        if (this.appliedPromoDiscount) {
            const promoDiscount = subtotal * (this.appliedPromoDiscount.percentage / 100);
            discountAmount += promoDiscount;
        }
        
        // Apply discounts
        total -= discountAmount;
        
        // Apply gift certificate
        if (this.appliedGiftCertificate) {
            const gcDeduction = Math.min(this.gcAmount, total);
            total -= gcDeduction;
        }
        
        return Math.max(0, total);
    }

    // Load available rooms for checkout with status indicators
    async loadAvailableRooms() {
        try {
            // Get rooms via API or fallback to cached data
            let rooms = [];
            if (window.roomManager && window.roomManager.rooms) {
                rooms = window.roomManager.rooms;
            } else {
                // Fallback: try to get rooms from a global rooms array if available
                rooms = window.rooms || [];
            }
            const select = document.getElementById('checkoutRoomSelect');
            
            if (select) {
                select.innerHTML = '<option value="">No Room Assignment</option>';
                
                // Show all rooms with status indicators
                rooms.forEach(room => {
                    const option = document.createElement('option');
                    option.value = room.status === 'available' ? room.id : '';
                    
                    const statusIcon = room.status === 'occupied' ? '🔴' : '🟢';
                    const statusText = room.status === 'occupied' ? 'IN SERVICE' : 'AVAILABLE';
                    
                    let roomText = `${statusIcon} ${room.name} - ${this.roomTypes[room.type] || room.type}`;
                    
                    if (room.status === 'occupied') {
                        // Disable occupied rooms and show service info
                        option.disabled = true;
                        option.style.color = '#999';
                        if (room.currentService) {
                            roomText += ` (${statusText} - ${room.currentService.employeeName})`;
                        } else {
                            roomText += ` (${statusText})`;
                        }
                    } else {
                        roomText += ` (${statusText} - Capacity: ${room.capacity})`;
                    }
                    
                    option.textContent = roomText;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            this.logError('Failed to load rooms for checkout', 'load_checkout_rooms', error);
        }
    }

    async validateInventoryStock() {
        console.log('🔍 Validating inventory stock levels before transaction completion');
        
        try {
            const inventoryItemsInCart = this.cart.filter(item => item.type === 'inventory');
            
            if (inventoryItemsInCart.length === 0) {
                console.log('🔍 No inventory items to validate');
                return;
            }
            
            const stockValidationErrors = [];
            
            for (const cartItem of inventoryItemsInCart) {
                // Find the current inventory item
                const inventoryItem = this.inventory.find(invItem => 
                    invItem._id === cartItem.id || 
                    invItem.id === cartItem.id || 
                    String(invItem._id) === String(cartItem.id) || 
                    String(invItem.id) === String(cartItem.id)
                );
                
                if (!inventoryItem) {
                    stockValidationErrors.push(`Item "${cartItem.name}" not found in inventory`);
                    continue;
                }
                
                const currentStock = inventoryItem.currentStock || 0;
                const requestedQuantity = cartItem.quantity || 1;
                
                if (currentStock < requestedQuantity) {
                    stockValidationErrors.push(
                        `Insufficient stock for "${cartItem.name}": ${currentStock} available, ${requestedQuantity} requested`
                    );
                }
                
                console.log('🔍 Stock validation for', cartItem.name, ':', {
                    currentStock,
                    requestedQuantity,
                    sufficient: currentStock >= requestedQuantity
                });
            }
            
            if (stockValidationErrors.length > 0) {
                const errorMessage = 'Cannot complete transaction due to insufficient stock:\n' + 
                    stockValidationErrors.join('\n');
                console.error('❌ Stock validation failed:', stockValidationErrors);
                throw new Error(errorMessage);
            }
            
            console.log('✅ All inventory stock levels validated successfully');
            
        } catch (error) {
            console.error('❌ Error during stock validation:', error);
            throw error; // Re-throw to prevent transaction completion
        }
    }

    async reduceInventoryStock() {
        console.log('📦 Starting inventory stock reduction for cart items');
        this.stockUpdatesFailed = false; // Reset flag for this transaction
        
        try {
            // Filter out only inventory items from the cart
            const inventoryItems = this.cart.filter(item => item.type === 'inventory');
            
            if (inventoryItems.length === 0) {
                console.log('📦 No inventory items in transaction, skipping stock reduction');
                return;
            }
            
            console.log('📦 Processing stock reduction for', inventoryItems.length, 'inventory items:', 
                inventoryItems.map(item => ({ name: item.name, quantity: item.quantity })));
            
            // Process each inventory item
            for (const item of inventoryItems) {
                try {
                    // Find the item in local inventory cache
                    const localInventoryItem = this.inventory.find(invItem => 
                        invItem._id === item.id || 
                        invItem.id === item.id || 
                        String(invItem._id) === String(item.id) || 
                        String(invItem.id) === String(item.id)
                    );
                    
                    if (!localInventoryItem) {
                        console.warn('⚠️ Inventory item not found in cache for stock reduction:', item.id, item.name);
                        continue;
                    }
                    
                    // Calculate new stock level
                    const currentStock = localInventoryItem.currentStock || 0;
                    const soldQuantity = item.quantity || 1;
                    const newStock = Math.max(0, currentStock - soldQuantity);
                    
                    console.log('📦 Updating stock for', localInventoryItem.name, ':', {
                        currentStock,
                        soldQuantity,
                        newStock
                    });
                    
                    // Update the item in both local cache and database
                    localInventoryItem.currentStock = newStock;
                    localInventoryItem.quantity = newStock; // Keep compatibility
                    
                    // Update in IndexedDB - ONLY update stock fields, preserve all other fields including availableInPOS
                    if (window.db) {
                        // Get current item from IndexedDB to preserve all fields
                        const existingItem = await window.db.get('inventory', localInventoryItem.id || localInventoryItem._id);
                        if (existingItem) {
                            // Only update stock-related fields, preserve everything else
                            const stockUpdateData = {
                                ...existingItem,
                                currentStock: newStock,
                                quantity: newStock,
                                modifiedAt: new Date().toISOString(),
                                syncStatus: 'pending'
                            };
                            await window.db.update('inventory', stockUpdateData);
                            console.log('✅ Updated local inventory stock (preserving all fields) for:', localInventoryItem.name);
                        } else {
                            // Fallback: create new record if not found
                            localInventoryItem.modifiedAt = new Date().toISOString();
                            localInventoryItem.syncStatus = 'pending';
                            await window.db.update('inventory', localInventoryItem);
                            console.log('✅ Created inventory record in IndexedDB for:', localInventoryItem.name);
                        }
                    }
                    
                    // Update via API for sync using the stock operation endpoint
                    // Use the actual MongoDB _id, not the frontend id that might be stale
                    const apiItemId = localInventoryItem._id || localInventoryItem.id || item.id;
                    console.log('📦 [POS] Using API ID for stock update:', apiItemId);
                    
                    const updateResult = await window.HybridAPIClient.request(`/api/inventory/${apiItemId}/stock`, {
                        method: 'PATCH',
                        data: {
                            quantity: soldQuantity,
                            operation: 'subtract'
                        }
                    });
                    
                    if (updateResult.success) {
                        console.log('✅ Successfully synced stock reduction to backend for:', localInventoryItem.name);
                    } else if (updateResult.queued) {
                        console.log('📱 Stock reduction queued for offline sync:', localInventoryItem.name);
                    } else {
                        console.warn('⚠️ Failed to sync stock reduction to backend:', updateResult.error);
                        this.stockUpdatesFailed = true; // Flag that stock updates failed
                        console.log('🚫 Marking stock updates as failed - will prevent sync trigger');
                    }
                    
                } catch (itemError) {
                    console.error('❌ Error reducing stock for item:', item.name, itemError);
                    // Continue processing other items even if one fails
                }
            }
            
            // Refresh the POS display to show updated stock levels
            this.displayProducts();
            
            console.log('✅ Completed inventory stock reduction');
            
        } catch (error) {
            console.error('❌ Error in inventory stock reduction:', error);
            // Don't throw the error to avoid breaking the checkout process
            // Stock reduction failure shouldn't prevent transaction completion
        }
    }

    async processCheckout() {
        // Prevent duplicate checkouts
        if (this.isProcessingCheckout) {
            return;
        }

        // Validate database is available
        if (!window.db) {
            showError('Database not available. Please refresh the page and try again.');
            return;
        }

        // Validate cart has items
        if (!this.cart || this.cart.length === 0) {
            showError('Cart is empty. Please add items before checkout.');
            return;
        }
        
        // Validate inventory stock levels before starting checkout process
        try {
            await this.validateInventoryStock();
        } catch (stockError) {
            showError(stockError.message);
            return;
        }
        
        this.logInfo('Starting checkout process', 'checkout_start', { 
            cartItems: this.cart.length,
            cartTotal: this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        });
        
        // Get employee from checkout modal only (main employee select removed)
        const checkoutEmployeeElement = document.getElementById('checkoutEmployeeSelect');
        const selectedEmployeeId = checkoutEmployeeElement?.value;
        
        console.log('🔧 Checkout Employee Selection Debug:', {
            checkoutEmployeeElement: checkoutEmployeeElement,
            selectedEmployeeId: selectedEmployeeId,
            selectedEmployeeIdType: typeof selectedEmployeeId,
            hasValue: !!selectedEmployeeId && selectedEmployeeId !== '',
            elementExists: !!checkoutEmployeeElement,
            selectedIndex: checkoutEmployeeElement ? checkoutEmployeeElement.selectedIndex : null,
            selectedOption: checkoutEmployeeElement ? checkoutEmployeeElement.options[checkoutEmployeeElement.selectedIndex] : null,
            dropdownOptions: checkoutEmployeeElement ? Array.from(checkoutEmployeeElement.options).map(opt => ({text: opt.text, value: opt.value})) : null,
            employeesLoaded: this.employees ? this.employees.length : 0,
            employeeIds: this.employees ? this.employees.map(emp => ({name: emp.name, id: emp.id, _id: emp._id})) : null
        });
        
        // ENHANCED VALIDATION: Check if employee is selected from checkout modal
        if (!checkoutEmployeeElement) {
            console.error('❌ CRITICAL: checkoutEmployeeSelect element not found!');
            showError('Employee selection not available. Please refresh the page and try again.');
            setButtonLoading('confirmCheckoutBtn', false);
            hideLoading();
            this.isProcessingCheckout = false;
            return;
        }
        
        // Check if cart contains any service items that require an employee
        const hasServiceItems = this.cart.some(item => item.type === 'service');
        console.log('🔍 Cart analysis:', {
            totalItems: this.cart.length,
            hasServiceItems: hasServiceItems,
            cartTypes: this.cart.map(item => ({ name: item.name, type: item.type }))
        });
        
        // ENHANCED VALIDATION: Only require employee if cart contains service items
        const isInvalidSelection = !selectedEmployeeId || 
                                  selectedEmployeeId === '' || 
                                  selectedEmployeeId === 'undefined' || 
                                  selectedEmployeeId === 'null' ||
                                  selectedEmployeeId === undefined ||
                                  selectedEmployeeId === null;
        
        if (hasServiceItems && isInvalidSelection) {
            console.error('❌ EMPLOYEE VALIDATION FAILED:', {
                selectedEmployeeId,
                type: typeof selectedEmployeeId,
                options: Array.from(checkoutEmployeeElement.options).map(opt => ({text: opt.text, value: opt.value})),
                selectedIndex: checkoutEmployeeElement.selectedIndex,
                selectedOption: checkoutEmployeeElement.options[checkoutEmployeeElement.selectedIndex]
            });
            
            // Focus on the employee dropdown in checkout modal only
            checkoutEmployeeElement.style.borderColor = '#800020';
            checkoutEmployeeElement.focus();
            
            // Flash animation
            checkoutEmployeeElement.animate([
                { transform: 'scale(1)' },
                { transform: 'scale(1.02)' },
                { transform: 'scale(1)' }
            ], {
                duration: 300,
                iterations: 2
            });
            
            showError('Please select an employee before checkout. Employee selection is required for service items to track commissions.');
            setButtonLoading('confirmCheckoutBtn', false);
            hideLoading();
            this.isProcessingCheckout = false;
            return;
        }
        
        // FLEXIBLE VALIDATION: Try to find employee in array, but don't fail if not found
        const selectedEmployee = (selectedEmployeeId && this.employees) ? this.employees.find(emp => 
            emp._id === selectedEmployeeId || 
            emp.id === selectedEmployeeId ||
            String(emp._id) === String(selectedEmployeeId) ||
            String(emp.id) === String(selectedEmployeeId)
        ) : null;
        
        // Get employee name from dropdown option if not found in array
        let employeeName = hasServiceItems ? 'Unknown' : null; // Only set 'Unknown' if services are present
        let employeePosition = hasServiceItems ? 'Unknown' : null;
        
        if (selectedEmployee) {
            employeeName = selectedEmployee.name;
            employeePosition = selectedEmployee.position;
            console.log('✅ Found selected employee:', {
                selectedEmployeeId,
                employeeName,
                employeePosition
            });
        } else if (hasServiceItems) {
            // Fallback: Get name from dropdown option text (only for service items)
            const selectedOption = checkoutEmployeeElement.options[checkoutEmployeeElement.selectedIndex];
            if (selectedOption && selectedOption.text) {
                employeeName = selectedOption.text.replace(' (AVAILABLE)', '').replace(' (ASSIGNED)', '').trim();
                console.log('⚠️ Employee not found in array, using dropdown text:', {
                    selectedEmployeeId,
                    employeeName,
                    dropdownText: selectedOption.text,
                    availableEmployees: this.employees ? this.employees.map(emp => ({id: emp._id || emp.id, name: emp.name})) : 'No employees loaded'
                });
            }
        }
        
        console.log('📋 Final employee assignment details:', {
            selectedEmployeeId,
            employeeName,
            employeePosition,
            foundInArray: !!selectedEmployee
        });

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
            // Validate payment method selection
            const paymentMethodElement = document.getElementById('paymentMethod');
            if (!paymentMethodElement || !paymentMethodElement.value) {
                showError('Please select a payment method');
                setButtonLoading('confirmCheckoutBtn', false);
                hideLoading();
                this.isProcessingCheckout = false;
                return;
            }
            const paymentMethod = paymentMethodElement.value;
            
            // Validate Senior/PWD discount fields if applied
            if (this.appliedSeniorPWDDiscount) {
                const cardholderName = document.getElementById('discountCardholderName').value.trim();
                const idNumber = document.getElementById('discountIDNumber').value.trim();
                const cardType = document.getElementById('discountCardType').value;
                
                if (!cardholderName || !idNumber || !cardType) {
                    showError('Please fill in all Senior/PWD discount fields');
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
            
            // Handle customer information
            let customerData = null;
            try {
                if (window.customerManager) {
                    customerData = await window.customerManager.getCustomerFromCheckout();
                    if (customerData) {
                        console.log('Customer selected for transaction:', customerData.firstName, customerData.lastName);
                    }
                }
            } catch (error) {
                console.error('Customer validation failed:', error);
                hideLoading();
                showError(error.message);
                return;
            }

            // Apply GC amount
            if (this.appliedGiftCertificate) {
                const gcDeduction = Math.min(this.gcAmount, total);
                total -= gcDeduction;
                
                // Mark GC as used
                this.appliedGiftCertificate.status = 'used';
                this.appliedGiftCertificate.usedDate = new Date().toISOString();
                this.appliedGiftCertificate.usedInTransaction = null; // Will be updated after transaction is saved
                await window.db.update('giftCertificates', this.appliedGiftCertificate);
            }

            // Create comprehensive transaction with audit trail
            const transaction = {
                date: new Date().toISOString(),
                items: this.cart.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    type: item.type,
                    category: item.category
                })),
                subtotal: subtotal,
                discountAmount: this.discountAmount,
                gcAmount: this.appliedGiftCertificate ? Math.min(this.gcAmount, subtotal - this.discountAmount) : 0,
                tax: 0,
                total: Math.max(0, total),
                paymentMethod: paymentMethod,
                employeeId: (selectedEmployeeId && selectedEmployeeId !== 'null' && selectedEmployeeId !== 'undefined') ? selectedEmployeeId : null,
                customerId: customerData ? customerData.id : null,
                customerInfo: customerData ? {
                    name: `${customerData.firstName} ${customerData.lastName}`,
                    phone: customerData.phone,
                    email: customerData.email
                } : null,
                
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
                    createdBy: (selectedEmployeeId && selectedEmployeeId !== 'null' && selectedEmployeeId !== 'undefined') ? selectedEmployeeId : 'system',
                    createdAt: new Date().toISOString(),
                    terminal: 'POS-1',
                    ipAddress: 'local',
                    userAgent: String(navigator.userAgent)
                },
                
                syncStatus: 'pending'
            };

            this.logInfo('POS transaction being saved', 'save_transaction', {
                total: transaction.total,
                employeeId: transaction.employeeId,
                items: transaction.items.length
            });

            // Save transaction with enhanced error handling using MongoDB API
            let transactionId;
            try {
                console.log('💾 [POS] Saving transaction to MongoDB API...');
                const token = this.getAuthToken();
                if (!token) {
                    throw new Error('No authentication token found');
                }
                
                // Map transaction data to backend Transaction model structure
                const transactionData = {
                    items: transaction.items.map(item => ({
                        productId: item.id,
                        name: item.name,
                        category: item.category,
                        price: item.price,
                        quantity: item.quantity,
                        subtotal: item.price * item.quantity
                    })),
                    subtotal: transaction.subtotal,
                    tax: transaction.tax || 0,
                    discount: transaction.discountAmount || 0,
                    discountDetails: {
                        seniorPWD: transaction.discounts?.seniorPWD || { applied: false },
                        promo: transaction.discounts?.promo || { applied: false },
                        giftCertificate: transaction.discounts?.giftCertificate || { applied: false }
                    },
                    gcAmount: transaction.gcAmount || 0,
                    total: transaction.total,
                    paymentMethod: transaction.paymentMethod,
                    paymentStatus: 'completed',
                    employeeId: (selectedEmployeeId && selectedEmployeeId !== 'null' && selectedEmployeeId !== 'undefined') ? selectedEmployeeId : null,
                    employeeName: (employeeName && employeeName !== 'Unknown') ? employeeName : null,
                    // Add employee object for proper employee stats tracking - use flexible employee data
                    employee: (selectedEmployeeId && selectedEmployeeId !== 'null' && selectedEmployeeId !== 'undefined') ? {
                        id: selectedEmployeeId,
                        name: employeeName,
                        position: employeePosition
                    } : null,
                    employeeCommission: 0, // Will be calculated by backend if needed
                    customerName: transaction.customerInfo?.name,
                    customerPhone: transaction.customerInfo?.phone,
                    customerEmail: transaction.customerInfo?.email,
                    status: 'completed',
                    auditLog: transaction.auditLog,
                    syncStatus: 'synced',
                    localId: Date.now().toString() // For sync tracking
                };
                
                // FINAL VALIDATION: Ensure basic employee data is set only if services are present
                if (hasServiceItems && (!transactionData.employeeId || !transactionData.employee || !transactionData.employeeName)) {
                    console.error('❌ CRITICAL: Employee data missing for service transaction:', {
                        employeeId: transactionData.employeeId,
                        employee: transactionData.employee,
                        employeeName: transactionData.employeeName,
                        selectedEmployeeId,
                        employeeName,
                        employeePosition,
                        hasServiceItems
                    });
                    throw new Error('Employee data validation failed - service transactions require employee selection');
                }
                
                console.log('💼 Final transaction data before save:', {
                    employeeId: transactionData.employeeId,
                    employeeName: transactionData.employeeName,
                    employee: transactionData.employee
                });
                
                // Use HybridAPIClient for transaction creation with offline support
                const result = await window.HybridAPIClient.post('/api/transactions', transactionData, {
                    critical: true // Ensure this gets synced when online
                });
                
                if (!result.success) {
                    if (result.queued) {
                        // Transaction was queued for offline sync - also save locally
                        console.log('📱 [POS] Transaction queued for offline sync:', result.requestId);
                        transactionId = result.requestId; // Use request ID as temporary transaction ID
                        
                        // Save transaction locally for offline access
                        const localTransaction = {
                            ...transactionData,
                            id: transactionId,
                            _id: transactionId,
                            localId: transactionId,
                            syncStatus: 'pending',
                            isOffline: true,
                            createdAt: transactionData.createdAt || new Date().toISOString()
                        };
                        
                        try {
                            await window.db.add('transactions', localTransaction);
                            console.log('💾 [POS] Transaction saved locally for offline access');
                        } catch (localSaveError) {
                            console.error('❌ [POS] Failed to save transaction locally:', localSaveError);
                        }
                        
                    } else {
                        throw new Error(result.error || 'Failed to save transaction');
                    }
                } else {
                    if (result.queued) {
                        // Special case: successful queue (success: true, queued: true for normal offline)
                        console.log('📱 [POS] Transaction queued for offline sync (normal):', result.requestId);
                        transactionId = result.requestId;
                        
                        // Save transaction locally for offline access
                        const localTransaction = {
                            ...transactionData,
                            id: transactionId,
                            _id: transactionId,
                            localId: transactionId,
                            syncStatus: 'pending',
                            isOffline: true,
                            createdAt: transactionData.createdAt || new Date().toISOString()
                        };
                        
                        try {
                            await window.db.add('transactions', localTransaction);
                            console.log('💾 [POS] Transaction saved locally for offline access');
                        } catch (localSaveError) {
                            console.error('❌ [POS] Failed to save transaction locally:', localSaveError);
                        }
                        
                    } else {
                        // Normal online save
                        transactionId = result.data?._id || result.data?.id;
                    }
                }
                
                if (!transactionId) {
                    throw new Error('Transaction could not be saved - no ID returned');
                }
                
            } catch (dbError) {
                console.error('❌ [POS] Database error during transaction save:', dbError);
                throw new Error('Failed to save transaction to database: ' + dbError.message);
            }
            
            // Reduce inventory stock for sold items
            await this.reduceInventoryStock();
            
            // Update GC with transaction reference if used
            if (this.appliedGiftCertificate) {
                this.appliedGiftCertificate.usedInTransaction = transactionId;
                await window.db.update('giftCertificates', this.appliedGiftCertificate);
            }
            
            // Handle room assignment for services
            const selectedRoomId = document.getElementById('checkoutRoomSelect')?.value;
            const hasServices = this.cart.some(item => item.type === 'service');
            
            if (hasServices && selectedRoomId) {
                // Get employee details from cached data or loadEmployees result
                const employee = this.employees ? 
                    this.employees.find(emp => 
                        emp._id === selectedEmployeeId || 
                        emp.id === selectedEmployeeId ||
                        String(emp._id) === String(selectedEmployeeId) ||
                        String(emp.id) === String(selectedEmployeeId)
                    ) : null;
                
                // Get service details with durations
                const serviceItems = this.cart.filter(item => item.type === 'service');
                const serviceNames = serviceItems.map(item => item.name).join(', ');
                
                // Calculate total estimated duration from all services
                let totalDuration = 0;
                for (const serviceItem of serviceItems) {
                    const service = this.products.find(p => 
                        p._id === serviceItem.id || p.id === serviceItem.id ||
                        String(p._id) === String(serviceItem.id) || String(p.id) === String(serviceItem.id)
                    );
                    if (service && service.duration) {
                        totalDuration += service.duration * serviceItem.quantity;
                    } else {
                        totalDuration += 60 * serviceItem.quantity; // Default 60 minutes per service
                    }
                }
                
                // Assign room to service
                if (window.roomManager && typeof window.roomManager.assignRoomToService === 'function') {
                    const serviceAssignmentData = {
                        serviceName: serviceNames,
                        clientName: transaction.customerName || 'Walk-in',
                        employeeId: selectedEmployeeId,
                        employeeName: employee?.name || 'Unknown',
                        transactionId: transactionId,
                        estimatedDuration: totalDuration || 60 // Use calculated duration or default 60 minutes
                    };
                    
                    console.log('🏨 [POS] Assigning room to service with data:', {
                        roomId: selectedRoomId,
                        serviceData: serviceAssignmentData,
                        selectedEmployeeId: selectedEmployeeId,
                        employeeObject: employee
                    });
                    
                    await window.roomManager.assignRoomToService(parseInt(selectedRoomId), serviceAssignmentData);
                }
            }

            // Track automatic supply usage for services (inventory already handled by reduceInventoryStock)
            for (const item of this.cart) {
                if (item.type === 'service') {
                    // Track automatic supply usage for services
                    await this.processServiceSupplyUsage(item, transactionId);
                }
            }

            // Update employee performance stats if employee selected
            if (selectedEmployeeId && selectedEmployeeId !== 'undefined') {
                // 🔧 CRITICAL FIX: Handle both string (MongoDB) and number IDs
                const employeeId = selectedEmployeeId;
                console.log('🔍 [POS] Looking for employee with ID:', employeeId, 'Type:', typeof employeeId);
                
                // Try to find employee by ID (support both string and number keys)
                let employee = await window.db.get('employees', employeeId);
                if (!employee && typeof employeeId === 'string' && !isNaN(parseInt(employeeId))) {
                    // Try numeric version if string ID failed
                    employee = await window.db.get('employees', parseInt(employeeId));
                }
                if (!employee && typeof employeeId === 'number') {
                    // Try string version if numeric ID failed  
                    employee = await window.db.get('employees', employeeId.toString());
                }
                
                if (employee) {
                        console.log('📊 [POS] Updating employee performance stats:', {
                            employeeName: employee.name,
                            transactionTotal: total,
                            commissionRate: employee.commissionRate || 0
                        });

                        // Calculate commission
                        const commission = total * ((employee.commissionRate || 0) / 100);
                        
                        // Update employee's performance stats
                        employee.totalSales = (employee.totalSales || 0) + total;
                        employee.totalCommission = (employee.totalCommission || 0) + commission;
                        employee.totalTransactions = (employee.totalTransactions || 0) + 1;
                        employee.transactionCount = employee.totalTransactions; // Keep both for compatibility
                        employee.syncStatus = 'pending'; // Mark for backend sync
                        employee.lastModified = new Date().toISOString();

                        console.log('📊 [POS] Updated employee stats:', {
                            totalSales: employee.totalSales,
                            totalCommission: employee.totalCommission,
                            totalTransactions: employee.totalTransactions,
                            addedAmount: total
                        });

                        // Update employee record in IndexedDB
                        try {
                            await window.db.update('employees', employeeId, employee);
                            console.log('✅ [POS] Employee stats saved to IndexedDB');
                        } catch (statsError) {
                            console.error('❌ [POS] Failed to update employee stats in IndexedDB:', statsError);
                        }

                        // Also try to update backend immediately if online
                        if (window.navigator.onLine && window.syncManager) {
                            try {
                                console.log('🌐 [POS] Attempting to sync employee stats to backend...');
                                await window.syncManager.syncEmployees();
                                console.log('✅ [POS] Employee stats synced to backend');
                            } catch (syncError) {
                                console.warn('⚠️ [POS] Failed to sync employee stats to backend (will retry later):', syncError);
                            }
                        }

                        // Update employee manager display if it exists
                        if (window.employeeManager && typeof window.employeeManager.updateEmployeeStats === 'function') {
                            try {
                                await window.employeeManager.updateEmployeeStats(employee, { 
                                    total: total,
                                    employee: employee
                                });
                                console.log('🎨 [POS] Employee manager display updated');
                            } catch (displayError) {
                                console.warn('⚠️ [POS] Failed to update employee manager display:', displayError);
                            }
                        }
                } else {
                    console.error('❌ [POS] Employee not found in IndexedDB with ID:', employeeId);
                    console.log('🔍 [POS] Available employees in IndexedDB:', 
                        await window.db.getAll('employees').then(emps => 
                            emps.map(e => ({ id: e.id, name: e.name, type: typeof e.id }))
                        )
                    );
                }
            }

            this.logInfo('Transaction completed successfully', 'checkout_success', {
                transactionId,
                total: transaction.total,
                paymentMethod,
                employeeId: transaction.employeeId,
                itemCount: transaction.items.length
            });

            // Clear cart
            this.cart = [];
            this.updateCartDisplay();

            // Hide loading and close modal
            hideLoading();
            setButtonLoading('confirmCheckoutBtn', false);
            closeModal('checkoutModal');

            // Small delay to ensure modal closes, then show success
            setTimeout(() => {
                showSuccess('Sale completed successfully!');
            }, 100);

            // Fire custom event for transaction completion (works offline)
            const transactionData = {
                id: transactionId,
                total: this.calculateTotal(),
                employee: this.selectedEmployee,
                items: [...this.cart],
                createdAt: new Date().toISOString(),
                isOffline: !navigator.onLine
            };
            
            console.log('🚀 [POS] FIRING TRANSACTION EVENT with data:', {
                id: transactionData.id,
                total: transactionData.total,
                employee: transactionData.employee?.name || transactionData.employee?.id || 'No Employee',
                itemCount: transactionData.items.length,
                isOffline: transactionData.isOffline
            });
            
            const transactionEvent = new CustomEvent('transactionCompleted', {
                detail: { transaction: transactionData }
            });
            window.dispatchEvent(transactionEvent);
            console.log('🔔 Transaction completed event FIRED - listening systems should respond now');
            
            // Invalidate transaction cache to ensure fresh data on next dashboard load
            if (window.HybridAPIClient && window.HybridAPIClient.invalidateTransactionCache) {
                try {
                    await window.HybridAPIClient.invalidateTransactionCache();
                    console.log('🔄 Transaction cache invalidated for fresh dashboard data');
                } catch (error) {
                    console.warn('⚠️ Failed to invalidate transaction cache:', error);
                }
            }
            
            // ONLY trigger sync if stock operations were successful
            if (!this.stockUpdatesFailed) {
                // Trigger sync to upload the new transaction to backend (ONLY after successful transaction)
                if (window.syncManager) {
                    console.log('💰 Triggering sync to upload new transaction (stock updates successful)');
                    window.syncManager.triggerSync();
                } else {
                    // Sync manager not ready yet, schedule sync for later (only if not already scheduled)
                    if (!window.pendingSyncTimeout) {
                        console.log('💰 Sync manager not ready, scheduling sync for later');
                        window.pendingSyncTimeout = setTimeout(() => {
                            if (window.syncManager) {
                                console.log('💰 Delayed sync trigger for new transaction');
                                window.syncManager.triggerSync();
                            }
                            window.pendingSyncTimeout = null;
                        }, 3000);
                    }
                }
            } else {
                console.log('🚫 Skipping sync trigger - stock updates failed, preventing inventory field reset');
                this.stockUpdatesFailed = false; // Reset for next transaction
            }

            // Immediate UI updates (works offline)
            setTimeout(async () => {
                console.log('🔄 [POS] Checking if dashboard needs refresh, current page:', window.app?.currentPage);
                
                // Check multiple ways if we're on dashboard
                const isDashboardPage = window.app?.currentPage === 'dashboard' || 
                                      document.getElementById('dashboard')?.style.display !== 'none' ||
                                      document.querySelector('.dashboard-container:not([style*="display: none"])') !== null;
                
                console.log('📊 [POS] Dashboard page detected:', isDashboardPage);
                
                // Refresh dashboard if it's the current page
                if (isDashboardPage) {
                    try {
                        console.log('🔄 [POS] Refreshing dashboard after transaction completion');
                        await window.loadDashboard();
                        console.log('✅ Dashboard refreshed immediately after transaction');
                    } catch (error) {
                        console.warn('⚠️ Dashboard refresh failed, trying fallback:', error);
                        // Fallback: trigger manual refresh of dashboard stats
                        if (window.enhancedDashboardManager) {
                            window.enhancedDashboardManager.refreshStatsFromLocalData();
                        }
                    }
                }
                
                // Refresh employee statistics if it's the current page
                if (window.app.currentPage === 'employees' && window.employeeManager) {
                    try {
                        await window.employeeManager.displayEmployees();
                        console.log('✅ Employee statistics refreshed immediately after offline transaction');
                    } catch (error) {
                        console.warn('⚠️ Failed to refresh employee statistics:', error);
                    }
                }
            }, 500); // Small delay to ensure local save is complete

        } catch (error) {
            console.error('❌ Detailed checkout error:', error);
            this.logError('Checkout failed', 'checkout', error);
            hideLoading();
            setButtonLoading('confirmCheckoutBtn', false);
            showError('Checkout failed: ' + (error.message || error));
        } finally {
            // Always reset the processing flag
            this.isProcessingCheckout = false;
        }
    }

    // Process automatic supply usage for services
    async processServiceSupplyUsage(serviceItem, transactionId) {
        try {
            const service = this.products.find(p => 
                p._id === serviceItem.id || p.id === serviceItem.id ||
                String(p._id) === String(serviceItem.id) || String(p.id) === String(serviceItem.id)
            );
            if (!service || !service.supplyMappings) return;

            // Use cached inventory items
            const inventory = this.inventory;
            
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
            this.logError('Failed to process service supply usage', 'process_supply_usage', error);
        }
    }

    // Update inventory with automatic usage tracking
    async updateInventoryWithUsageTracking(inventoryItem, usageAmount, transactionId, serviceName) {
        try {
            // Update stock - use quantity as primary field
            inventoryItem.quantity = Math.max(0, (inventoryItem.quantity || 0) - usageAmount);
            inventoryItem.currentStock = inventoryItem.quantity;
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
                newStock: inventoryItem.quantity,
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

            // Save updated inventory item - preserve all fields including availableInPOS
            const existingItem = await window.db.get('inventory', inventoryItem.id || inventoryItem._id);
            if (existingItem) {
                // Only update the fields we modified, preserve everything else
                const updatedItem = {
                    ...existingItem,
                    quantity: inventoryItem.quantity,
                    currentStock: inventoryItem.currentStock,
                    modifiedAt: inventoryItem.modifiedAt,
                    syncStatus: inventoryItem.syncStatus,
                    adjustmentHistory: inventoryItem.adjustmentHistory,
                    usageTracking: inventoryItem.usageTracking,
                    usagePerService: inventoryItem.usagePerService
                };
                await window.db.update('inventory', updatedItem);
            } else {
                await window.db.update('inventory', inventoryItem);
            }

            this.logInfo('Auto-tracked supply usage', 'auto_track_supply', {
                amount: usageAmount,
                unit: inventoryItem.unit || 'units',
                itemName: inventoryItem.name,
                serviceName
            });
            
        } catch (error) {
            this.logError('Failed to update inventory with usage tracking', 'update_inventory_usage', error);
        }
    }

    // Show supply usage modal for manual entry (fallback)
    async showSupplyUsageModal(serviceItem, transactionId) {
        // Use cached inventory items
        const inventory = this.inventory;
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

        this.logDebug('Supply usage tracking available', 'check_supply_tracking', { serviceName: serviceItem.name });
    }

    // Get authentication token from localStorage
    getAuthToken() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.warn('⚠️ [POS] No auth token found in localStorage');
            return null;
        }
        return token;
    }
}

// Initialize POS system
const posSystem = new POSSystem();

// Make POS system globally accessible for onclick handlers
window.posSystem = posSystem;

// Load POS when page is shown
window.loadPOS = async function() {
    console.log('🚀 Loading POS system...');
    console.log('🔍 POS DEBUG: posSystem exists?', !!posSystem);
    console.log('🔍 POS DEBUG: posSystem.init exists?', !!(posSystem && posSystem.init));
    await posSystem.init();
};

// FORCE LOAD POS FOR DEBUGGING - Remove after testing
console.log('🔧 DEBUG: Force loading POS system...');
setTimeout(() => {
    console.log('🔧 DEBUG: Calling loadPOS() directly...');
    if (window.loadPOS) {
        window.loadPOS().catch(e => {
            console.error('🔧 DEBUG: Direct POS load failed:', e);
        });
    }
}, 2000); // Wait 2 seconds then force load
