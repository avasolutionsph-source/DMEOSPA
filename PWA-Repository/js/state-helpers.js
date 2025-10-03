// State Management Helper Functions for Ava Solutions PWA
// Provides convenient methods for common state operations

class StateHelpers {
    constructor(stateManager) {
        this.state = stateManager;
    }
    
    // Auth Helpers
    async login(username, password) {
        try {
            // Use API_CONFIG if available, otherwise fallback to direct fetch
            let data;
            if (window.API_CONFIG) {
                data = await window.API_CONFIG.request(
                    window.API_CONFIG.ENDPOINTS.AUTH.LOGIN,
                    {
                        method: 'POST',
                        body: { username, password }
                    }
                );
            } else {
                // Fallback to direct fetch
                const serverUrl = window.API_CONFIG?.BASE_URL || 'https://daetspa-backend.onrender.com';
                const response = await fetch(`${serverUrl}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                
                if (!response.ok) {
                    throw new Error('Login failed');
                }
                data = await response.json();
            }
            
            if (data && data.token) {
                
                // Update state
                this.state.batchUpdate({
                    'auth.currentUser': data.user,
                    'auth.authToken': data.token,
                    'auth.isLoggedIn': true,
                    'auth.lastLogin': Date.now()
                });
                
                // Store token
                localStorage.setItem('authToken', data.token);
                
                return { success: true, user: data.user };
            }
            
            return { success: false, error: 'Invalid credentials' };
            
        } catch (error) {
            if (window.logger) {
                window.logger.error('Login failed', {
                    category: 'AUTH',
                    error: error.message
                });
            }
            return { success: false, error: error.message };
        }
    }
    
    logout() {
        // Clear auth state
        this.state.batchUpdate({
            'auth.currentUser': null,
            'auth.authToken': null,
            'auth.isLoggedIn': false
        });
        
        // Clear stored tokens
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        sessionStorage.clear();
        
        // Navigate to login
        this.state.setState('ui.currentPage', 'login');
    }
    
    isAuthenticated() {
        return this.state.getState('auth.isLoggedIn') === true;
    }
    
    getCurrentUser() {
        return this.state.getState('auth.currentUser');
    }
    
    hasPermission(permission) {
        const permissions = this.state.getState('auth.permissions') || [];
        return permissions.includes(permission);
    }
    
    // POS Helpers
    addToCart(product, quantity = 1) {
        const cart = this.state.getState('pos.cart') || [];
        
        // Check if item already in cart
        const existingIndex = cart.findIndex(item => item.id === product.id);
        
        if (existingIndex >= 0) {
            // Update quantity
            cart[existingIndex].quantity += quantity;
        } else {
            // Add new item
            cart.push({
                ...product,
                quantity,
                addedAt: Date.now()
            });
        }
        
        this.state.setState('pos.cart', [...cart]);
        
        if (window.logger) {
            window.logger.info('Item added to cart', {
                category: 'POS',
                product: product.name,
                quantity
            });
        }
    }
    
    removeFromCart(productId) {
        const cart = this.state.getState('pos.cart') || [];
        const updatedCart = cart.filter(item => item.id !== productId);
        this.state.setState('pos.cart', updatedCart);
    }
    
    updateCartQuantity(productId, quantity) {
        const cart = this.state.getState('pos.cart') || [];
        const item = cart.find(item => item.id === productId);
        
        if (item) {
            if (quantity <= 0) {
                this.removeFromCart(productId);
            } else {
                item.quantity = quantity;
                this.state.setState('pos.cart', [...cart]);
            }
        }
    }
    
    clearCart() {
        this.state.setState('pos.cart', []);
        this.state.setState('pos.discounts', []);
        this.state.setState('pos.currentTransaction', null);
    }
    
    getCartTotal() {
        const cart = this.state.getState('pos.cart') || [];
        const discounts = this.state.getState('pos.discounts') || [];
        const taxRate = this.state.getState('pos.taxRate') || 0;
        
        // Calculate subtotal
        let subtotal = cart.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
        }, 0);
        
        // Apply discounts
        let discount = 0;
        discounts.forEach(d => {
            if (d.type === 'percentage') {
                discount += subtotal * (d.value / 100);
            } else {
                discount += d.value;
            }
        });
        
        // Calculate tax
        const taxableAmount = subtotal - discount;
        const tax = taxableAmount * taxRate;
        
        return {
            subtotal,
            discount,
            tax,
            total: taxableAmount + tax
        };
    }
    
    selectEmployee(employeeId) {
        this.state.setState('pos.selectedEmployee', employeeId);
    }
    
    // Business Helpers
    updateBusinessInfo(info) {
        this.state.batchUpdate({
            'business.name': info.name,
            'business.type': info.type,
            'business.config': info.config || {}
        });
        
        // Also update localStorage for persistence
        if (info.name) localStorage.setItem('businessName', info.name);
        if (info.type) localStorage.setItem('businessType', info.type);
    }
    
    getBusinessName() {
        return this.state.getState('business.name') || 'Ava Solutions';
    }
    
    getBusinessType() {
        return this.state.getState('business.type');
    }
    
    // UI Helpers
    navigate(page) {
        this.state.setState('ui.currentPage', page);
        
        // Update URL without reload
        if (window.history && window.history.pushState) {
            window.history.pushState({ page }, page, `#${page}`);
        }
        
        // Trigger page load if needed
        if (window.app && window.app.loadPage) {
            window.app.loadPage(page);
        }
    }
    
    showModal(modalId, data = {}) {
        const modals = this.state.getState('ui.modals') || {};
        modals[modalId] = {
            open: true,
            data,
            openedAt: Date.now()
        };
        this.state.setState('ui.modals', modals);
    }
    
    hideModal(modalId) {
        const modals = this.state.getState('ui.modals') || {};
        if (modals[modalId]) {
            modals[modalId].open = false;
        }
        this.state.setState('ui.modals', modals);
    }
    
    showNotification(message, type = 'info', duration = 5000) {
        const notifications = this.state.getState('ui.notifications') || [];
        const notification = {
            id: Date.now(),
            message,
            type,
            read: false,
            timestamp: Date.now(),
            duration
        };
        
        this.state.setState('ui.notifications', [...notifications, notification]);
        
        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.removeNotification(notification.id);
            }, duration);
        }
        
        return notification.id;
    }
    
    removeNotification(notificationId) {
        const notifications = this.state.getState('ui.notifications') || [];
        const updated = notifications.filter(n => n.id !== notificationId);
        this.state.setState('ui.notifications', updated);
    }
    
    markNotificationRead(notificationId) {
        const notifications = this.state.getState('ui.notifications') || [];
        const notification = notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
            this.state.setState('ui.notifications', [...notifications]);
        }
    }
    
    setLoading(key, isLoading) {
        const loading = this.state.getState('ui.loading') || {};
        loading[key] = isLoading;
        this.state.setState('ui.loading', loading);
    }
    
    isLoading(key = null) {
        const loading = this.state.getState('ui.loading') || {};
        if (key) {
            return loading[key] === true;
        }
        return Object.values(loading).some(v => v === true);
    }
    
    // Data Helpers
    async loadProducts() {
        this.setLoading('products', true);
        
        try {
            // Load from database
            if (window.db) {
                const products = await window.db.getAll('products');
                this.state.setState('data.products', products);
            }
        } catch (error) {
            if (window.logger) {
                window.logger.error('Failed to load products', {
                    category: 'DATA',
                    error: error.message
                });
            }
        } finally {
            this.setLoading('products', false);
        }
    }
    
    async loadInventory() {
        this.setLoading('inventory', true);
        
        try {
            if (window.db) {
                const inventory = await window.db.getAll('inventory');
                this.state.setState('data.inventory', inventory);
            }
        } catch (error) {
            if (window.logger) {
                window.logger.error('Failed to load inventory', {
                    category: 'DATA',
                    error: error.message
                });
            }
        } finally {
            this.setLoading('inventory', false);
        }
    }
    
    async loadEmployees() {
        this.setLoading('employees', true);
        
        try {
            if (window.db) {
                const employees = await window.db.getAll('employees');
                this.state.setState('data.employees', employees);
            }
        } catch (error) {
            if (window.logger) {
                window.logger.error('Failed to load employees', {
                    category: 'DATA',
                    error: error.message
                });
            }
        } finally {
            this.setLoading('employees', false);
        }
    }
    
    getProductById(productId) {
        const products = this.state.getState('data.products') || [];
        return products.find(p => p.id === productId);
    }
    
    getEmployeeById(employeeId) {
        const employees = this.state.getState('data.employees') || [];
        return employees.find(e => e.id === employeeId);
    }
    
    // Sync Helpers
    setSyncStatus(status) {
        this.state.setState('sync.syncStatus', status);
        this.state.setState('sync.lastSync', Date.now());
    }
    
    incrementPendingChanges() {
        const pending = this.state.getState('sync.pendingChanges') || 0;
        this.state.setState('sync.pendingChanges', pending + 1);
    }
    
    resetPendingChanges() {
        this.state.setState('sync.pendingChanges', 0);
    }
    
    // Performance Helpers
    setPerformanceMode(mode) {
        if (!['low', 'balanced', 'high'].includes(mode)) {
            mode = 'balanced';
        }
        
        this.state.setState('performance.mode', mode);
        
        // Apply performance optimizations
        if (mode === 'low') {
            // Disable animations, reduce update frequency
            document.body.classList.add('low-performance-mode');
        } else {
            document.body.classList.remove('low-performance-mode');
        }
        
        if (window.logger) {
            window.logger.info('Performance mode changed', {
                category: 'PERFORMANCE',
                mode
            });
        }
    }
    
    // Utility Methods
    async saveState() {
        return await this.state.persistState();
    }
    
    async clearAllData() {
        if (!confirm('This will clear all application data. Are you sure?')) {
            return false;
        }
        
        await this.state.clearState();
        this.logout();
        
        // Clear database
        if (window.db) {
            const stores = ['products', 'inventory', 'employees', 'transactions'];
            for (const store of stores) {
                await window.db.clear(store);
            }
        }
        
        return true;
    }
    
    // Debug Helpers
    debugState(module = null) {
        if (module) {
            console.log(`State [${module}]:`, this.state.getState(module));
        } else {
            console.log('Full State:', this.state.getSnapshot());
        }
    }
    
    debugHistory(filter = {}) {
        const history = this.state.getHistory(filter);
        console.table(history.slice(-10));
    }
    
    debugSubscribers() {
        const snapshot = this.state.getSnapshot();
        console.log('Active Subscribers:', snapshot.subscribers);
    }
}

// Create and attach to window when StateManager is ready
if (window.StateManager) {
    window.StateHelpers = new StateHelpers(window.StateManager);
} else {
    // Wait for StateManager
    const checkInterval = setInterval(() => {
        if (window.StateManager && window.StateManager.initialized) {
            window.StateHelpers = new StateHelpers(window.StateManager);
            clearInterval(checkInterval);
            
            if (window.logger) {
                window.logger.info('State Helpers initialized', {
                    category: 'STATE'
                });
            }
        }
    }, 100);
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StateHelpers;
}