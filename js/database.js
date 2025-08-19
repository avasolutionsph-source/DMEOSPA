// IndexedDB Database Management
class Database {
    constructor() {
        this.dbName = 'AvaSolutionsDB';
        this.version = 5; // Bump when schema changes
        this.db = null;
        this.userId = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('Database failed to open');
                reject('Database failed to open');
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('Database opened successfully');
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

                // Settings store
                if (!this.db.objectStoreNames.contains('settings')) {
                    const settingsStore = this.db.createObjectStore('settings', { keyPath: 'key' });
                    // Add default settings
                    settingsStore.add({ key: 'businessName', value: 'Business' });
                    settingsStore.add({ key: 'apiUrl', value: 'https://ava-marketing-api.onrender.com' }); // Marketing Website URL
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
                                bookings: true,
                                rooms: true,
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
                    // Payroll settings defaults
                    settingsStore.add({
                        key: 'payrollSettings',
                        value: {
                            otRatePercent: 25, // additional percent
                            nightDiffPercent: 10,
                            tipDistribution: 'toTherapist', // or 'pool'
                            holidayRates: {
                                regular_not_worked: 100,
                                regular_worked: 200,
                                special_not_worked: 0,
                                special_worked: 130,
                                special_working_day: 100,
                                double_not_worked: 200,
                                double_worked: 300
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

                // New stores - v2
                // Customers store (for retention analytics and bookings)
                if (!this.db.objectStoreNames.contains('customers')) {
                    const customers = this.db.createObjectStore('customers', { keyPath: 'id', autoIncrement: true });
                    customers.createIndex('name', 'name', { unique: false });
                    customers.createIndex('phone', 'phone', { unique: false });
                    customers.createIndex('email', 'email', { unique: false });
                    customers.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // Bookings store
                if (!this.db.objectStoreNames.contains('bookings')) {
                    const bookings = this.db.createObjectStore('bookings', { keyPath: 'id', autoIncrement: true });
                    bookings.createIndex('date', 'date', { unique: false }); // start date/time ISO
                    bookings.createIndex('status', 'status', { unique: false });
                    bookings.createIndex('employeeId', 'employeeId', { unique: false });
                    bookings.createIndex('roomId', 'roomId', { unique: false });
                    bookings.createIndex('customerId', 'customerId', { unique: false });
                }

                // Rooms store
                if (!this.db.objectStoreNames.contains('rooms')) {
                    const rooms = this.db.createObjectStore('rooms', { keyPath: 'id', autoIncrement: true });
                    rooms.createIndex('number', 'number', { unique: true });
                    rooms.createIndex('status', 'status', { unique: false }); // available, occupied, maintenance
                    rooms.createIndex('group', 'group', { unique: false }); // adjacency group
                }

                // Sessions (active treatments with timers)
                if (!this.db.objectStoreNames.contains('sessions')) {
                    const sessions = this.db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
                    sessions.createIndex('roomId', 'roomId', { unique: false });
                    sessions.createIndex('employeeId', 'employeeId', { unique: false });
                    sessions.createIndex('status', 'status', { unique: false }); // active, completed, cancelled
                    sessions.createIndex('startTime', 'startTime', { unique: false });
                }

                // Gift Certificates
                if (!this.db.objectStoreNames.contains('giftCertificates')) {
                    const gcs = this.db.createObjectStore('giftCertificates', { keyPath: 'id', autoIncrement: true });
                    gcs.createIndex('code', 'code', { unique: true });
                    gcs.createIndex('status', 'status', { unique: false }); // issued, redeemed, expired
                    gcs.createIndex('expiryDate', 'expiryDate', { unique: false });
                }

                // Suppliers
                if (!this.db.objectStoreNames.contains('suppliers')) {
                    const suppliers = this.db.createObjectStore('suppliers', { keyPath: 'id', autoIncrement: true });
                    suppliers.createIndex('name', 'name', { unique: false });
                }

                // Attendance and Time Tracking
                if (!this.db.objectStoreNames.contains('attendance')) {
                    const attendance = this.db.createObjectStore('attendance', { keyPath: 'id', autoIncrement: true });
                    attendance.createIndex('employeeId', 'employeeId', { unique: false });
                    attendance.createIndex('date', 'date', { unique: false });
                }

                // Shift Schedules
                if (!this.db.objectStoreNames.contains('schedules')) {
                    const schedules = this.db.createObjectStore('schedules', { keyPath: 'id', autoIncrement: true });
                    schedules.createIndex('employeeId', 'employeeId', { unique: false });
                    schedules.createIndex('date', 'date', { unique: false });
                }

                // Leave Requests
                if (!this.db.objectStoreNames.contains('leaveRequests')) {
                    const leave = this.db.createObjectStore('leaveRequests', { keyPath: 'id', autoIncrement: true });
                    leave.createIndex('employeeId', 'employeeId', { unique: false });
                    leave.createIndex('status', 'status', { unique: false });
                }

                // Payroll Runs
                if (!this.db.objectStoreNames.contains('payrollRuns')) {
                    const payroll = this.db.createObjectStore('payrollRuns', { keyPath: 'id', autoIncrement: true });
                    payroll.createIndex('periodStart', 'periodStart', { unique: false });
                    payroll.createIndex('periodEnd', 'periodEnd', { unique: false });
                }

                // Tips
                if (!this.db.objectStoreNames.contains('tips')) {
                    const tips = this.db.createObjectStore('tips', { keyPath: 'id', autoIncrement: true });
                    tips.createIndex('employeeId', 'employeeId', { unique: false });
                    tips.createIndex('date', 'date', { unique: false });
                }

                // Consent Logs (for DPA compliance)
                if (!this.db.objectStoreNames.contains('consentLogs')) {
                    const consents = this.db.createObjectStore('consentLogs', { keyPath: 'id', autoIncrement: true });
                    consents.createIndex('timestamp', 'timestamp', { unique: false });
                    consents.createIndex('action', 'action', { unique: false });
                }

                // Rotation Assignments - to keep audit of which therapist was assigned when
                if (!this.db.objectStoreNames.contains('rotationAssignments')) {
                    const rot = this.db.createObjectStore('rotationAssignments', { keyPath: 'id', autoIncrement: true });
                    rot.createIndex('date', 'date', { unique: false });
                    rot.createIndex('employeeId', 'employeeId', { unique: false });
                    rot.createIndex('bookingId', 'bookingId', { unique: false });
                }

                // Expenses store (for Daily Sales & Expenses)
                if (!this.db.objectStoreNames.contains('expenses')) {
                    const expenses = this.db.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true });
                    expenses.createIndex('date', 'date', { unique: false });
                    expenses.createIndex('category', 'category', { unique: false });
                    expenses.createIndex('employeeId', 'employeeId', { unique: false });
                }

                // Payroll Requests store
                if (!this.db.objectStoreNames.contains('payrollRequests')) {
                    const requests = this.db.createObjectStore('payrollRequests', { keyPath: 'id', autoIncrement: true });
                    requests.createIndex('employeeId', 'employeeId', { unique: false });
                    requests.createIndex('type', 'type', { unique: false }); // cash_advance, leave, other
                    requests.createIndex('status', 'status', { unique: false }); // submitted, approved, denied
                    requests.createIndex('date', 'date', { unique: false });
                }

                console.log('Database setup complete');
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
        console.warn(alertMessage);
        
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
            console.error('Import failed:', error);
            return false;
        }
    }
}

// Create global database instance
const db = new Database();

// Initialize database immediately when script loads
let dbInitPromise = null;

// Ensure single initialization
function ensureDBInit() {
    if (!dbInitPromise) {
        dbInitPromise = db.init().then(() => {
            console.log('Database initialized for better performance');
        }).catch((error) => {
            console.error('Database initialization failed:', error);
            dbInitPromise = null; // Reset on failure so it can retry
            throw error;
        });
    }
    return dbInitPromise;
}

// Pre-initialize when script loads
ensureDBInit();
