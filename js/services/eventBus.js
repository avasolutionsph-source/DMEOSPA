// Event Bus System
// Provides real-time communication between components
// Can be extended to use WebSockets for server-side events

class EventBus {
    constructor() {
        this.events = new Map();
        this.history = [];
        this.maxHistorySize = 100;
        this.debug = false;
    }

    // Subscribe to an event
    on(event, callback, options = {}) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }

        const listener = {
            callback,
            once: options.once || false,
            id: options.id || this.generateId()
        };

        this.events.get(event).push(listener);

        if (this.debug) {
            console.log(`📡 Subscribed to ${event}:`, listener.id);
        }

        // Return unsubscribe function
        return () => this.off(event, listener.id);
    }

    // Subscribe to an event once
    once(event, callback) {
        return this.on(event, callback, { once: true });
    }

    // Unsubscribe from an event
    off(event, listenerId) {
        if (!this.events.has(event)) return;

        const listeners = this.events.get(event);
        const index = listeners.findIndex(l => l.id === listenerId);
        
        if (index !== -1) {
            listeners.splice(index, 1);
            if (this.debug) {
                console.log(`📡 Unsubscribed from ${event}:`, listenerId);
            }
        }

        // Clean up empty event arrays
        if (listeners.length === 0) {
            this.events.delete(event);
        }
    }

    // Emit an event
    emit(event, data = {}) {
        // Add to history
        this.addToHistory(event, data);

        if (this.debug) {
            console.log(`📡 Emitting ${event}:`, data);
        }

        // Get listeners for this event
        const listeners = this.events.get(event) || [];
        const wildcardListeners = this.events.get('*') || [];
        
        // Execute specific listeners
        const listenersToRemove = [];
        
        listeners.forEach(listener => {
            try {
                listener.callback(data, event);
                if (listener.once) {
                    listenersToRemove.push(listener.id);
                }
            } catch (error) {
                console.error(`Error in event listener for ${event}:`, error);
            }
        });

        // Execute wildcard listeners
        wildcardListeners.forEach(listener => {
            try {
                listener.callback(data, event);
            } catch (error) {
                console.error(`Error in wildcard listener for ${event}:`, error);
            }
        });

        // Remove once listeners
        listenersToRemove.forEach(id => this.off(event, id));

        return this;
    }

    // Emit an event asynchronously
    async emitAsync(event, data = {}) {
        return new Promise((resolve) => {
            setTimeout(() => {
                this.emit(event, data);
                resolve();
            }, 0);
        });
    }

    // Wait for an event
    waitFor(event, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.off(event, listenerId);
                reject(new Error(`Timeout waiting for event: ${event}`));
            }, timeout);

            const listenerId = this.on(event, (data) => {
                clearTimeout(timer);
                resolve(data);
            }, { once: true }).id;
        });
    }

    // Clear all listeners for an event
    clear(event) {
        if (event) {
            this.events.delete(event);
        } else {
            this.events.clear();
        }
    }

    // Get listener count
    listenerCount(event) {
        if (event) {
            return (this.events.get(event) || []).length;
        }
        
        let total = 0;
        this.events.forEach(listeners => {
            total += listeners.length;
        });
        return total;
    }

    // Get all events
    getEvents() {
        return Array.from(this.events.keys());
    }

    // History management
    addToHistory(event, data) {
        this.history.push({
            event,
            data,
            timestamp: Date.now()
        });

        // Trim history if needed
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }

    getHistory(event) {
        if (event) {
            return this.history.filter(h => h.event === event);
        }
        return [...this.history];
    }

    clearHistory() {
        this.history = [];
    }

    // Utility methods
    generateId() {
        return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    enableDebug() {
        this.debug = true;
    }

    disableDebug() {
        this.debug = false;
    }
}

// Create global event bus
const eventBus = new EventBus();

// Common events that components can use
const Events = {
    // Authentication
    AUTH_LOGIN: 'auth:login',
    AUTH_LOGOUT: 'auth:logout',
    AUTH_TOKEN_EXPIRED: 'auth:token_expired',
    
    // Data synchronization
    SYNC_START: 'sync:start',
    SYNC_COMPLETE: 'sync:complete',
    SYNC_ERROR: 'sync:error',
    
    // Catalog management
    CATALOG_PUBLISHED: 'catalog:published',
    CATALOG_UPDATED: 'catalog:updated',
    CATALOG_DELETED: 'catalog:deleted',
    
    // Bookings
    BOOKING_CREATED: 'booking:created',
    BOOKING_UPDATED: 'booking:updated',
    BOOKING_CANCELLED: 'booking:cancelled',
    
    // POS
    TRANSACTION_COMPLETE: 'transaction:complete',
    CART_UPDATED: 'cart:updated',
    
    // Network
    ONLINE: 'network:online',
    OFFLINE: 'network:offline',
    
    // UI
    MODAL_OPEN: 'ui:modal_open',
    MODAL_CLOSE: 'ui:modal_close',
    NOTIFICATION_SHOW: 'ui:notification_show',
    
    // Business
    BUSINESS_UPDATED: 'business:updated',
    BUSINESS_SETTINGS_CHANGED: 'business:settings_changed'
};

// Export for use
window.eventBus = eventBus;
window.Events = Events;

// Set up network event listeners
window.addEventListener('online', () => {
    eventBus.emit(Events.ONLINE);
});

window.addEventListener('offline', () => {
    eventBus.emit(Events.OFFLINE);
});

// Example usage in your existing code:
// eventBus.on(Events.CATALOG_PUBLISHED, (data) => {
//     console.log('Catalog published:', data);
//     // Update UI or trigger sync
// });

// eventBus.emit(Events.CATALOG_PUBLISHED, { services: 10, employees: 5 });

export { eventBus, Events };