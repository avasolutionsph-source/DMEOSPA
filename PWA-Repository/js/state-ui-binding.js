// State-UI Binding System for SPA PWA
// Automatically updates UI elements when state changes

class StateUIBinding {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.bindings = new Map();
        this.updateQueue = [];
        this.isProcessing = false;
        this.initialized = false;
    }
    
    init() {
        if (this.initialized) return;
        
        // Setup default bindings
        this.setupDefaultBindings();
        
        // Subscribe to all state changes
        this.stateManager.subscribe('*', (changes) => {
            this.handleStateChanges(changes);
        });
        
        // Initial UI update
        this.updateAllBindings();
        
        this.initialized = true;
        
        if (window.logger) {
            window.logger.info('State-UI Binding initialized', {
                category: 'UI_BINDING',
                bindingsCount: this.bindings.size
            });
        }
    }
    
    setupDefaultBindings() {
        // Auth UI bindings
        this.bind('auth.currentUser', {
            selectors: ['.username-display', '#currentUserName', '.user-info'],
            property: 'textContent',
            transform: (user) => user ? user.username || user.email : 'Guest'
        });
        
        this.bind('auth.isLoggedIn', {
            selectors: ['.auth-required'],
            property: 'style.display',
            transform: (isLoggedIn) => isLoggedIn ? 'block' : 'none'
        });
        
        this.bind('auth.isLoggedIn', {
            selectors: ['.guest-only'],
            property: 'style.display',
            transform: (isLoggedIn) => isLoggedIn ? 'none' : 'block'
        });
        
        // Business bindings
        this.bind('business.name', {
            selectors: ['.business-name', '#businessName', 'h1.business-title'],
            property: 'textContent',
            transform: (name) => name || 'SPA'
        });
        
        this.bind('business.type', {
            selectors: ['.business-type', '#businessType'],
            property: 'textContent',
            transform: (type) => type || 'Not Set'
        });
        
        // POS bindings
        this.bind('pos.cart', {
            selectors: ['#cartCount', '.cart-count'],
            property: 'textContent',
            transform: (cart) => cart ? cart.length.toString() : '0'
        });
        
        this.bind('pos.cart', {
            selectors: ['#cartTotal', '.cart-total'],
            property: 'textContent',
            transform: (cart) => {
                if (!cart || cart.length === 0) return '₱0.00';
                const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                return `₱${total.toFixed(2)}`;
            }
        });
        
        this.bind('pos.selectedEmployee', {
            selectors: ['#selectedEmployeeName', '.employee-display'],
            property: 'textContent',
            transform: (employeeId) => {
                if (!employeeId) return 'No employee selected';
                // Get employee name from data
                const employees = this.stateManager.getState('data.employees');
                const employee = employees?.find(e => e.id === employeeId);
                return employee ? employee.name : employeeId;
            }
        });
        
        // UI state bindings
        this.bind('ui.currentPage', {
            selectors: ['body'],
            property: 'dataset.page',
            transform: (page) => page
        });
        
        this.bind('ui.currentPage', {
            selectors: ['.page-content'],
            property: 'className',
            transform: (page) => `page-content ${page}-page`
        });
        
        this.bind('ui.loading', {
            selectors: ['.loading-overlay'],
            property: 'style.display',
            transform: (loading) => {
                // Check if any loading state is true
                const isLoading = Object.values(loading || {}).some(v => v === true);
                return isLoading ? 'flex' : 'none';
            }
        });
        
        this.bind('ui.notifications', {
            selectors: ['#notificationCount', '.notification-badge'],
            property: 'textContent',
            transform: (notifications) => {
                const unread = notifications?.filter(n => !n.read).length || 0;
                return unread > 0 ? unread.toString() : '';
            }
        });
        
        this.bind('ui.notifications', {
            selectors: ['.notification-badge'],
            property: 'style.display',
            transform: (notifications) => {
                const unread = notifications?.filter(n => !n.read).length || 0;
                return unread > 0 ? 'block' : 'none';
            }
        });
        
        // Sync status bindings
        this.bind('sync.isSyncing', {
            selectors: ['.sync-indicator'],
            property: 'className',
            transform: (isSyncing) => isSyncing ? 'sync-indicator syncing' : 'sync-indicator'
        });
        
        this.bind('sync.lastSync', {
            selectors: ['.last-sync-time'],
            property: 'textContent',
            transform: (timestamp) => {
                if (!timestamp) return 'Never synced';
                const date = new Date(timestamp);
                const now = new Date();
                const diff = now - date;
                
                if (diff < 60000) return 'Just now';
                if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
                if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
                return date.toLocaleDateString();
            }
        });
        
        // Performance mode bindings
        this.bind('performance.mode', {
            selectors: ['body'],
            property: 'dataset.performanceMode',
            transform: (mode) => mode || 'balanced'
        });
    }
    
    // Bind state path to UI elements
    bind(statePath, config) {
        if (!this.bindings.has(statePath)) {
            this.bindings.set(statePath, []);
        }
        
        this.bindings.get(statePath).push({
            ...config,
            id: Math.random().toString(36).substr(2, 9)
        });
        
        // Immediately update this binding
        this.updateBinding(statePath);
        
        return config.id;
    }
    
    // Remove a binding
    unbind(bindingId) {
        for (const [path, bindings] of this.bindings) {
            const index = bindings.findIndex(b => b.id === bindingId);
            if (index !== -1) {
                bindings.splice(index, 1);
                if (bindings.length === 0) {
                    this.bindings.delete(path);
                }
                return true;
            }
        }
        return false;
    }
    
    // Handle state changes
    handleStateChanges(changes) {
        if (!changes.path) return;
        
        // Extract module and property from path
        const pathParts = changes.path.split('.');
        const fullPath = pathParts.join('.');
        
        // Check for exact binding
        if (this.bindings.has(fullPath)) {
            this.queueUpdate(fullPath);
        }
        
        // Check for parent path bindings
        for (let i = pathParts.length - 1; i > 0; i--) {
            const parentPath = pathParts.slice(0, i).join('.');
            if (this.bindings.has(parentPath)) {
                this.queueUpdate(parentPath);
            }
        }
        
        // Process update queue
        this.processUpdateQueue();
    }
    
    // Queue an update
    queueUpdate(statePath) {
        if (!this.updateQueue.includes(statePath)) {
            this.updateQueue.push(statePath);
        }
    }
    
    // Process update queue with batching
    processUpdateQueue() {
        if (this.isProcessing || this.updateQueue.length === 0) return;
        
        this.isProcessing = true;
        
        // Use requestAnimationFrame for smooth updates
        requestAnimationFrame(() => {
            const updates = [...this.updateQueue];
            this.updateQueue = [];
            
            updates.forEach(path => {
                this.updateBinding(path);
            });
            
            this.isProcessing = false;
            
            // Check if more updates came in
            if (this.updateQueue.length > 0) {
                this.processUpdateQueue();
            }
        });
    }
    
    // Update specific binding
    updateBinding(statePath) {
        const bindings = this.bindings.get(statePath);
        if (!bindings) return;
        
        const stateValue = this.stateManager.getState(statePath);
        
        bindings.forEach(binding => {
            this.applyBinding(binding, stateValue);
        });
    }
    
    // Apply binding to DOM elements
    applyBinding(binding, value) {
        const { selectors, property, transform, callback } = binding;
        
        // Get transformed value
        const transformedValue = transform ? transform(value) : value;
        
        // Update each matching element
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            
            elements.forEach(element => {
                try {
                    if (callback) {
                        // Custom callback
                        callback(element, transformedValue, value);
                    } else if (property) {
                        // Property update
                        this.setElementProperty(element, property, transformedValue);
                    }
                } catch (error) {
                    if (window.logger) {
                        window.logger.error('Binding update failed', {
                            category: 'UI_BINDING',
                            selector,
                            property,
                            error: error.message
                        });
                    }
                }
            });
        });
    }
    
    // Set element property (handles nested properties)
    setElementProperty(element, property, value) {
        const parts = property.split('.');
        let target = element;
        
        for (let i = 0; i < parts.length - 1; i++) {
            target = target[parts[i]];
            if (!target) return;
        }
        
        const finalProperty = parts[parts.length - 1];
        target[finalProperty] = value;
    }
    
    // Update all bindings
    updateAllBindings() {
        this.bindings.forEach((_, path) => {
            this.updateBinding(path);
        });
    }
    
    // Create reactive element
    createReactiveElement(tagName, statePath, config = {}) {
        const element = document.createElement(tagName);
        
        // Set initial properties
        if (config.className) element.className = config.className;
        if (config.id) element.id = config.id;
        if (config.attributes) {
            Object.keys(config.attributes).forEach(attr => {
                element.setAttribute(attr, config.attributes[attr]);
            });
        }
        
        // Create binding
        const bindingId = this.bind(statePath, {
            selectors: [element],
            property: config.property || 'textContent',
            transform: config.transform,
            callback: config.callback
        });
        
        // Store binding ID for cleanup
        element.dataset.bindingId = bindingId;
        
        // Add cleanup on element removal
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.removedNodes.forEach(node => {
                    if (node === element) {
                        this.unbind(bindingId);
                        observer.disconnect();
                    }
                });
            });
        });
        
        // Observe parent for element removal
        if (element.parentNode) {
            observer.observe(element.parentNode, { childList: true });
        }
        
        return element;
    }
    
    // Create reactive list
    createReactiveList(container, statePath, itemRenderer) {
        const updateList = () => {
            const items = this.stateManager.getState(statePath) || [];
            
            // Clear container
            container.innerHTML = '';
            
            // Render items
            items.forEach((item, index) => {
                const element = itemRenderer(item, index);
                container.appendChild(element);
            });
        };
        
        // Initial render
        updateList();
        
        // Subscribe to changes
        const unsubscribe = this.stateManager.subscribe(statePath, updateList);
        
        // Return cleanup function
        return unsubscribe;
    }
    
    // Create two-way binding for input elements
    createTwoWayBinding(inputElement, statePath) {
        // State to input
        this.bind(statePath, {
            selectors: [inputElement],
            property: 'value',
            transform: (value) => value || ''
        });
        
        // Input to state
        const updateState = (event) => {
            const value = inputElement.type === 'checkbox' 
                ? inputElement.checked 
                : inputElement.value;
            
            this.stateManager.setState(statePath, value);
        };
        
        inputElement.addEventListener('input', updateState);
        inputElement.addEventListener('change', updateState);
        
        // Return cleanup function
        return () => {
            inputElement.removeEventListener('input', updateState);
            inputElement.removeEventListener('change', updateState);
        };
    }
    
    // Batch DOM updates
    batchDOMUpdates(updates) {
        // Disable updates temporarily
        this.isProcessing = true;
        
        // Apply all updates
        updates();
        
        // Re-enable and process queue
        this.isProcessing = false;
        this.processUpdateQueue();
    }
    
    // Debug helper
    getBindingInfo() {
        const info = {};
        this.bindings.forEach((bindings, path) => {
            info[path] = bindings.map(b => ({
                selectors: b.selectors,
                property: b.property,
                hasTransform: !!b.transform,
                hasCallback: !!b.callback
            }));
        });
        return info;
    }
}

// Initialize UI binding when state manager is ready
if (window.StateManager) {
    window.StateUIBinding = new StateUIBinding(window.StateManager);
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.StateUIBinding.init();
        });
    } else {
        window.StateUIBinding.init();
    }
} else {
    // Wait for StateManager
    const checkInterval = setInterval(() => {
        if (window.StateManager && window.StateManager.initialized) {
            window.StateUIBinding = new StateUIBinding(window.StateManager);
            window.StateUIBinding.init();
            clearInterval(checkInterval);
        }
    }, 100);
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StateUIBinding;
}