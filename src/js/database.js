// IndexedDB Database Management
class Database {
    constructor() {
        this.dbName = 'AvaSolutionsDB';
        this.version = 2; // Incremented for rooms and gift certificates
        this.db = null;
        this.userId = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                if (window.logger && window.logger.error) {
                    window.logger.error('Database failed to open', { category: 'DATABASE', context: { dbName: this.dbName, version: this.version } });
                } else {
                    console.error('Database failed to open');
                }
                reject('Database failed to open');
            };

            request.onsuccess = () => {
                this.db = request.result;
                if (window.logger && window.logger.info) {
                    window.logger.info('Database opened successfully', { category: 'DATABASE', context: { dbName: this.dbName, version: this.version } });
                } else {
                    console.log('Database opened successfully');
                }
                resolve(this.db);
            };

            request.onupgradeneeded = (e) => {
                this.db = e.target.result;

                // Products/Services store
                if (!this.db.objectStoreNames.contains('products')) {
                    const productsStore = this.db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
                    productsStore.createIndex('type', 'type', { unique: false });
                    productsStore.createIndex('showInPOS', 'showInPOS', { unique: false });
                    productsStore.createIndex('syncStatus', 'syncStatus', { unique: false });
                }

                // Inventory store
                if (!this.db.objectStoreNames.contains('inventory')) {
                    const inventoryStore = this.db.createObjectStore('inventory', { keyPath: 'id', autoIncrement: true });
                    inventoryStore.createIndex('sku', 'sku', { unique: true });
                    inventoryStore.createIndex('showInPOS', 'showInPOS', { unique: false });
                    inventoryStore.createIndex('syncStatus', 'syncStatus', { unique: false });
                }

                // Employees store
                if (!this.db.objectStoreNames.contains('employees')) {
                    const employeesStore = this.db.createObjectStore('employees', { keyPath: 'id', autoIncrement: true });
                    employeesStore.createIndex('email', 'email', { unique: false });
                    employeesStore.createIndex('syncStatus', 'syncStatus', { unique: false });
                }

                // Transactions store
                if (!this.db.objectStoreNames.contains('transactions')) {
                    const transactionsStore = this.db.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true });
                    transactionsStore.createIndex('date', 'date', { unique: false });
                    transactionsStore.createIndex('employeeId', 'employeeId', { unique: false });
                    transactionsStore.createIndex('syncStatus', 'syncStatus', { unique: false });
                }

                // Gift Certificates store
                if (!this.db.objectStoreNames.contains('giftCertificates')) {
                    const gcStore = this.db.createObjectStore('giftCertificates', { keyPath: 'id', autoIncrement: true });
                    gcStore.createIndex('controlNumber', 'controlNumber', { unique: true });
                    gcStore.createIndex('status', 'status', { unique: false });
                    gcStore.createIndex('usedDate', 'usedDate', { unique: false });
                    gcStore.createIndex('syncStatus', 'syncStatus', { unique: false });
                }

                // Promo Discounts store
                if (!this.db.objectStoreNames.contains('promoDiscounts')) {
                    const promoStore = this.db.createObjectStore('promoDiscounts', { keyPath: 'id', autoIncrement: true });
                    promoStore.createIndex('code', 'code', { unique: true });
                    promoStore.createIndex('status', 'status', { unique: false });
                    promoStore.createIndex('type', 'type', { unique: false });
                    promoStore.createIndex('syncStatus', 'syncStatus', { unique: false });
                }

                // Rooms store
                if (!this.db.objectStoreNames.contains('rooms')) {
                    const roomsStore = this.db.createObjectStore('rooms', { keyPath: 'id', autoIncrement: true });
                    roomsStore.createIndex('status', 'status', { unique: false });
                    roomsStore.createIndex('type', 'type', { unique: false });
                    roomsStore.createIndex('name', 'name', { unique: true });
                }

                // Active Services store (for room tracking)
                if (!this.db.objectStoreNames.contains('activeServices')) {
                    const activeServicesStore = this.db.createObjectStore('activeServices', { keyPath: 'id', autoIncrement: true });
                    activeServicesStore.createIndex('roomId', 'roomId', { unique: false });
                    activeServicesStore.createIndex('status', 'status', { unique: false });
                    activeServicesStore.createIndex('employeeId', 'employeeId', { unique: false });
                }

                // Settings store
                if (!this.db.objectStoreNames.contains('settings')) {
                    const settingsStore = this.db.createObjectStore('settings', { keyPath: 'key' });
                    // Add default settings
                    settingsStore.add({ key: 'businessName', value: 'Business' });
                    settingsStore.add({ key: 'apiUrl', value: 'https://ava-pwa-backend.onrender.com' }); // Unified Backend URL
                    settingsStore.add({ key: 'lastSync', value: null });
                    settingsStore.add({ key: 'currency', value: 'PHP' });
                    settingsStore.add({ key: 'currencySymbol', value: '₱' });
                    // Business configuration for scaling
                    settingsStore.add({ 
                        key: 'businessConfig', 
                        value: {
                            businessType: 'spa',
                            modules: {
                                dashboard: true,
                                pos: true,
                                services: true,
                                inventory: true,
                                employees: true,
                                chatbot: true,
                                settings: true
                            },
                            features: {
                                requireEmployeeForServices: true,
                                showInventoryInPOS: false,
                                enableCommissionTracking: true,
                                showServiceDuration: true
                            }
                        }
                    });
                }

                // Sync Queue store for offline operations
                if (!this.db.objectStoreNames.contains('syncQueue')) {
                    const syncStore = this.db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
                    syncStore.createIndex('timestamp', 'timestamp', { unique: false });
                    syncStore.createIndex('type', 'type', { unique: false });
                    syncStore.createIndex('status', 'status', { unique: false });
                }

                if (window.logger && window.logger.info) {
                    window.logger.info('Database setup complete', { category: 'DATABASE', context: { dbName: this.dbName, version: this.version, stores: this.db.objectStoreNames.length } });
                } else {
                    console.log('Database setup complete');
                }
            };
        });
    }

    // Generic CRUD operations
    async add(storeName, data) {
        // Ensure DB is ready
        await ensureDBInit();
        
        return new Promise((resolve, reject) => {
            try {
                // Add sync status for new records
                data.syncStatus = 'pending';
                data.createdAt = new Date().toISOString();
                data.modifiedAt = new Date().toISOString();
                
                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.add(data);

                request.onsuccess = () => {
                    // Skip sync queue for faster performance - sync will handle it later
                    resolve(request.result);
                };

                request.onerror = () => {
                    reject('Error adding data: ' + request.error);
                };
            } catch (error) {
                reject('Error in add operation: ' + error.message);
            }
        });
    }

    async get(storeName, id) {
        // Ensure DB is ready
        await ensureDBInit();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject('Error getting data');
            };
        });
    }

    async getAll(storeName) {
        // Ensure DB is ready
        await ensureDBInit();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject('Error getting all data');
            };
        });
    }

    async getByIndex(storeName, indexName, value) {
        // Ensure DB is ready
        await ensureDBInit();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject('Error getting data by index');
            };
        });
    }

    async update(storeName, data) {
        // Ensure DB is ready
        await ensureDBInit();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject('Error updating data');
            };
        });
    }

    async delete(storeName, id) {
        // Ensure DB is ready
        await ensureDBInit();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = () => {
                reject('Error deleting data');
            };
        });
    }

    async clearStore(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = () => {
                reject('Error clearing store');
            };
        });
    }

    // Specific methods for business logic
    async getLowStockItems() {
        const inventory = await this.getAll('inventory');
        return inventory.filter(item => item.currentStock <= item.minStock && item.lowStockAlert);
    }

    async getTodayTransactions() {
        const transactions = await this.getAll('transactions');
        const today = new Date().toDateString();
        return transactions.filter(t => new Date(t.date).toDateString() === today);
    }

    async getMonthlyRevenue() {
        const transactions = await this.getAll('transactions');
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const monthlyTransactions = transactions.filter(t => {
            const date = new Date(t.date);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        });

        return monthlyTransactions.reduce((sum, t) => sum + t.total, 0);
    }

    async getEmployeeCommissions(employeeId) {
        const transactions = await this.getByIndex('transactions', 'employeeId', employeeId);
        const employee = await this.get('employees', employeeId);
        
        if (!employee || !employee.commissionRate) return 0;
        
        const totalSales = transactions.reduce((sum, t) => sum + t.total, 0);
        return totalSales * (employee.commissionRate / 100);
    }

    async updateInventoryStock(itemId, quantity, operation = 'subtract') {
        const item = await this.get('inventory', itemId);
        if (!item) return;

        if (operation === 'subtract') {
            item.currentStock -= quantity;
        } else {
            item.currentStock += quantity;
        }

        await this.update('inventory', item);
        
        // Check for low stock alert
        if (item.currentStock <= item.minStock && item.lowStockAlert) {
            this.triggerLowStockAlert(item);
        }
    }

    triggerLowStockAlert(item) {
        // Create notification or alert
        const alertMessage = `Low stock alert: ${item.name} (${item.currentStock} remaining)`;
        if (window.logger && window.logger.warn) {
            window.logger.warn(alertMessage, { category: 'DATABASE', context: { itemId: item.id, itemName: item.name, currentStock: item.currentStock, minStock: item.minStock } });
        } else {
            console.warn(alertMessage);
        }
        
        // Update dashboard if it's active
        if (document.querySelector('#dashboard.active')) {
            window.updateLowStockAlerts && window.updateLowStockAlerts();
        }
    }

    // Optional user context for future multi-tenant support
    setUserContext(userId) {
        this.userId = userId;
    }

    // Export data for backup
    async exportData() {
        const data = {
            products: await this.getAll('products'),
            inventory: await this.getAll('inventory'),
            employees: await this.getAll('employees'),
            transactions: await this.getAll('transactions'),
            settings: await this.getAll('settings'),
            exportDate: new Date().toISOString()
        };
        
        return JSON.stringify(data, null, 2);
    }

    // Import data from backup
    async importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            // Clear existing data
            await this.clearStore('products');
            await this.clearStore('inventory');
            await this.clearStore('employees');
            await this.clearStore('transactions');
            await this.clearStore('settings');
            
            // Import new data
            for (const product of data.products || []) {
                await this.add('products', product);
            }
            for (const item of data.inventory || []) {
                await this.add('inventory', item);
            }
            for (const employee of data.employees || []) {
                await this.add('employees', employee);
            }
            for (const transaction of data.transactions || []) {
                await this.add('transactions', transaction);
            }
            for (const setting of data.settings || []) {
                await this.add('settings', setting);
            }
            
            return true;
        } catch (error) {
            if (window.logger && window.logger.error) {
                window.logger.error('Import failed', { category: 'DATABASE', error, context: { operation: 'importData' } });
            } else {
                console.error('Import failed:', error);
            }
            return false;
        }
    }
}

// Create global database instance
const db = new Database();
// Make it available globally
window.db = db;

// Initialize database immediately when script loads
let dbInitPromise = null;

// Ensure single initialization
function ensureDBInit() {
    if (!dbInitPromise) {
        dbInitPromise = db.init().then(() => {
            if (window.logger && window.logger.info) {
                window.logger.info('Database initialized for better performance', { category: 'DATABASE', context: { dbName: db.dbName, version: db.version } });
            } else {
                console.log('Database initialized for better performance');
            }
        }).catch((error) => {
            if (window.logger && window.logger.error) {
                window.logger.error('Database initialization failed', { category: 'DATABASE', error, context: { dbName: db.dbName, version: db.version } });
            } else {
                console.error('Database initialization failed:', error);
            }
            dbInitPromise = null; // Reset on failure so it can retry
            throw error;
        });
    }
    return dbInitPromise;
}

// Pre-initialize when script loads
ensureDBInit();
