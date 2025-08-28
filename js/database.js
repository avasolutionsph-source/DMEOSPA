// IndexedDB Database Management
class Database {
    constructor() {
        this.dbName = 'AvaSolutionsDB';
        this.version = 7; // Incremented for attendance store
        this.db = null;
        this.userId = null;
        this.isInitializing = false;
        this.initAttempts = 0;
        this.maxRetries = 3;
    }

    async checkForceUpgrade() {
        try {
            // Check if database exists and what version it is
            const databases = await indexedDB.databases();
            const existingDb = databases.find(db => db.name === this.dbName);
            
            if (existingDb && existingDb.version < this.version) {
                console.log(`Database upgrade needed: ${existingDb.version} -> ${this.version}`);
                
                // For version 6 specifically, we need expenses store
                if (existingDb.version < 6) {
                    console.log('Forcing database upgrade for expenses store');
                    // The version increment will trigger onupgradeneeded
                }
            }
        } catch (error) {
            console.log('Could not check database version, proceeding with normal init');
        }
    }

    async init() {
        if (this.isInitializing) {
            console.log('💡 Database initialization already in progress, waiting...');
            // Wait for current initialization to complete
            while (this.isInitializing) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            if (this.db) {
                return this.db;
            }
        }

        if (this.db && this.db.objectStoreNames.length > 0) {
            console.log('✅ Database already initialized and ready');
            return this.db;
        }

        this.isInitializing = true;
        this.initAttempts++;

        console.log(`🔄 Initializing database (attempt ${this.initAttempts}/${this.maxRetries})`);

        try {
            // Check if we need to force upgrade for existing installations
            await this.checkForceUpgrade();
            
            return await this.attemptDatabaseConnection();
        } catch (error) {
            console.error(`❌ Database init attempt ${this.initAttempts} failed:`, error);
            
            if (this.initAttempts < this.maxRetries) {
                console.log(`🔄 Retrying database initialization in 1 second...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                this.isInitializing = false;
                return this.init(); // Recursive retry
            } else {
                console.error('💀 All database initialization attempts failed, trying recovery...');
                return await this.attemptDatabaseRecovery();
            }
        } finally {
            this.isInitializing = false;
        }
    }

    async attemptDatabaseConnection() {
        return new Promise((resolve, reject) => {
            // Add timeout to prevent hanging - increased for large databases
            const timeout = setTimeout(() => {
                console.error('⏰ Database connection timeout after 30 seconds');
                reject(new Error('Database connection timeout'));
            }, 30000); // 30 second timeout for large databases

            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = (event) => {
                clearTimeout(timeout);
                const error = event.target?.error || new Error('Unknown database error');
                console.error('❌ Database failed to open:', error);
                
                if (window.logger && window.logger.error) {
                    window.logger.error('Database failed to open', { 
                        category: 'DATABASE', 
                        context: { 
                            dbName: this.dbName, 
                            version: this.version,
                            error: error.message,
                            attempt: this.initAttempts
                        } 
                    });
                }
                reject(error);
            };

            request.onsuccess = (event) => {
                clearTimeout(timeout);
                this.db = event.target.result;
                
                // Verify database integrity
                if (!this.db || this.db.objectStoreNames.length === 0) {
                    console.error('❌ Database opened but has no stores');
                    reject(new Error('Database integrity check failed'));
                    return;
                }
                
                console.log(`✅ Database opened successfully (stores: ${this.db.objectStoreNames.length})`);
                
                if (window.logger && window.logger.info) {
                    window.logger.info('Database opened successfully', { 
                        category: 'DATABASE', 
                        context: { 
                            dbName: this.dbName, 
                            version: this.version,
                            storeCount: this.db.objectStoreNames.length,
                            attempt: this.initAttempts
                        } 
                    });
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

                // State store for StateManager persistence
                if (!this.db.objectStoreNames.contains('state')) {
                    this.db.createObjectStore('state', { keyPath: 'key' });
                }

                // Configuration store for config-service
                if (!this.db.objectStoreNames.contains('config')) {
                    const configStore = this.db.createObjectStore('config', { keyPath: 'key' });
                    configStore.createIndex('category', 'category', { unique: false });
                    configStore.createIndex('source', 'source', { unique: false });
                    configStore.createIndex('lastModified', 'lastModified', { unique: false });
                }

                // Migration history store for config-service
                if (!this.db.objectStoreNames.contains('migrations')) {
                    const migrationStore = this.db.createObjectStore('migrations', { keyPath: 'id', autoIncrement: true });
                    migrationStore.createIndex('timestamp', 'timestamp', { unique: false });
                    migrationStore.createIndex('version', 'version', { unique: false });
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
                
                // Service History store (for completed services)
                if (!this.db.objectStoreNames.contains('serviceHistory')) {
                    const serviceHistoryStore = this.db.createObjectStore('serviceHistory', { keyPath: 'id', autoIncrement: true });
                    serviceHistoryStore.createIndex('roomId', 'roomId', { unique: false });
                    serviceHistoryStore.createIndex('date', 'endTime', { unique: false });
                    serviceHistoryStore.createIndex('employeeId', 'employeeId', { unique: false });
                    serviceHistoryStore.createIndex('serviceName', 'serviceName', { unique: false });
                }

                // Expenses store
                if (!this.db.objectStoreNames.contains('expenses')) {
                    const expensesStore = this.db.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true });
                    expensesStore.createIndex('category', 'category', { unique: false });
                    expensesStore.createIndex('date', 'date', { unique: false });
                    expensesStore.createIndex('purchaser', 'purchaser', { unique: false });
                    expensesStore.createIndex('syncStatus', 'syncStatus', { unique: false });
                }

                // Attendance store
                if (!this.db.objectStoreNames.contains('attendance')) {
                    const attendanceStore = this.db.createObjectStore('attendance', { keyPath: 'id', autoIncrement: true });
                    attendanceStore.createIndex('employeeId', 'employeeId', { unique: false });
                    attendanceStore.createIndex('date', 'date', { unique: false });
                    attendanceStore.createIndex('timestamp', 'timestamp', { unique: false });
                    attendanceStore.createIndex('method', 'method', { unique: false });
                    attendanceStore.createIndex('syncStatus', 'syncStatus', { unique: false });
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

    async attemptDatabaseRecovery() {
        console.log('🚑 Attempting database recovery...');
        
        try {
            // Strategy 1: Try to delete and recreate the database
            console.log('🗑️ Trying database deletion and recreation...');
            
            // Close any existing connection
            if (this.db) {
                this.db.close();
                this.db = null;
            }
            
            // Delete the database
            await new Promise((resolve, reject) => {
                const deleteRequest = indexedDB.deleteDatabase(this.dbName);
                deleteRequest.onsuccess = () => {
                    console.log('🗑️ Database deleted successfully');
                    resolve();
                };
                deleteRequest.onerror = (event) => {
                    console.error('❌ Failed to delete database:', event);
                    reject(new Error('Database deletion failed'));
                };
                deleteRequest.onblocked = () => {
                    console.warn('⚠️ Database deletion blocked - other connections may be open');
                    // Continue anyway
                    setTimeout(() => resolve(), 2000);
                };
            });
            
            // Wait a bit for cleanup
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Reset attempt counter for fresh start
            this.initAttempts = 0;
            
            // Try to create fresh database
            console.log('🆕 Creating fresh database...');
            return await this.attemptDatabaseConnection();
            
        } catch (error) {
            console.error('💀 Database recovery failed:', error);
            
            // Strategy 2: Use fallback mode
            console.log('🚨 Using fallback mode - creating minimal database...');
            return await this.createFallbackDatabase();
        }
    }

    async createFallbackDatabase() {
        try {
            // Create a minimal database with just essential stores
            const fallbackName = `${this.dbName}_fallback_${Date.now()}`;
            console.log(`🆘 Creating fallback database: ${fallbackName}`);
            
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(fallbackName, 1);
                
                request.onerror = () => {
                    console.error('💀 Even fallback database failed');
                    reject(new Error('Complete database failure'));
                };
                
                request.onsuccess = (event) => {
                    this.db = event.target.result;
                    this.dbName = fallbackName; // Update to fallback name
                    console.log('✅ Fallback database created successfully');
                    
                    // Store fallback info for user awareness
                    localStorage.setItem('ava_database_fallback', 'true');
                    localStorage.setItem('ava_database_fallback_name', fallbackName);
                    
                    resolve(this.db);
                };
                
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    console.log('🔧 Setting up fallback database stores...');
                    
                    // Create only essential stores
                    if (!db.objectStoreNames.contains('rooms')) {
                        const roomsStore = db.createObjectStore('rooms', { keyPath: 'id', autoIncrement: true });
                        roomsStore.createIndex('status', 'status', { unique: false });
                    }
                    
                    if (!db.objectStoreNames.contains('activeServices')) {
                        const activeServicesStore = db.createObjectStore('activeServices', { keyPath: 'id', autoIncrement: true });
                        activeServicesStore.createIndex('roomId', 'roomId', { unique: false });
                    }
                    
                    if (!db.objectStoreNames.contains('settings')) {
                        const settingsStore = db.createObjectStore('settings', { keyPath: 'key' });
                    }
                    
                    if (!db.objectStoreNames.contains('state')) {
                        db.createObjectStore('state', { keyPath: 'key' });
                    }
                };
            });
            
        } catch (error) {
            console.error('💀 Complete database system failure:', error);
            throw new Error('All database recovery strategies failed');
        }
    }

    // Add isOpen getter for StateManager compatibility
    get isOpen() {
        return !!(this.db && !this.db.closed);
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
let initializationStarted = false;

// Ensure single initialization with robust error handling
function ensureDBInit() {
    if (dbInitPromise) {
        return dbInitPromise;
    }
    
    if (initializationStarted) {
        // Already starting, wait for it
        return new Promise((resolve) => {
            const checkInit = () => {
                if (dbInitPromise) {
                    resolve(dbInitPromise);
                } else if (!initializationStarted) {
                    // Restart if needed
                    resolve(ensureDBInit());
                } else {
                    setTimeout(checkInit, 100);
                }
            };
            checkInit();
        });
    }
    
    initializationStarted = true;
    
    dbInitPromise = db.init().then((database) => {
        console.log('✅ Database system fully initialized');
        
        if (window.logger && window.logger.info) {
            window.logger.info('Database system fully initialized', { 
                category: 'DATABASE', 
                context: { 
                    dbName: db.dbName, 
                    version: db.version,
                    storeCount: database.objectStoreNames.length,
                    isFallback: localStorage.getItem('ava_database_fallback') === 'true'
                } 
            });
        }
        
        return database;
    }).catch((error) => {
        console.error('💀 Database system failed completely:', error);
        
        if (window.logger && window.logger.error) {
            window.logger.error('Database system failed completely', { 
                category: 'DATABASE', 
                error: error.message, 
                context: { 
                    dbName: db.dbName, 
                    version: db.version,
                    attempts: db.initAttempts 
                } 
            });
        }
        
        // Reset for potential retry
        dbInitPromise = null;
        initializationStarted = false;
        throw error;
    });
    
    return dbInitPromise;
}

// Make ensureDBInit globally available for other modules
window.ensureDBInit = ensureDBInit;

// Database diagnostic and repair function
window.diagnoseDatabase = async function() {
    console.log('🔍 Running database diagnostics...');
    
    try {
        const databases = await indexedDB.databases();
        const avaDatabases = databases.filter(db => db.name.includes('AvaSolutions'));
        
        console.log('📊 Found databases:', avaDatabases);
        
        if (avaDatabases.length > 1) {
            console.warn('⚠️ Multiple Ava databases detected - this may cause conflicts');
            for (const dbInfo of avaDatabases) {
                console.log(`- ${dbInfo.name} (v${dbInfo.version})`);
            }
        }
        
        // Check if we're in fallback mode
        const isFallback = localStorage.getItem('ava_database_fallback') === 'true';
        if (isFallback) {
            const fallbackName = localStorage.getItem('ava_database_fallback_name');
            console.log(`🆘 Currently using fallback database: ${fallbackName}`);
        }
        
        return {
            databases: avaDatabases,
            currentName: db.dbName,
            currentVersion: db.version,
            isFallback,
            isConnected: !!db.db
        };
        
    } catch (error) {
        console.error('❌ Database diagnostics failed:', error);
        return { error: error.message };
    }
};

// Database repair function
window.repairDatabase = async function() {
    console.log('🔧 Starting database repair...');
    
    try {
        // Prevent multiple repairs
        if (localStorage.getItem('database_repair_in_progress') === 'true') {
            console.log('🚫 Database repair already in progress, skipping...');
            return { success: false, message: 'Repair already in progress' };
        }
        
        // Clear any fallback flags
        localStorage.removeItem('ava_database_fallback');
        localStorage.removeItem('ava_database_fallback_name');
        
        // Close current connection
        if (db.db) {
            db.db.close();
            db.db = null;
        }
        
        // Reset init state
        dbInitPromise = null;
        initializationStarted = false;
        db.initAttempts = 0;
        
        // Force database recreation
        await db.attemptDatabaseRecovery();
        
        // After recovery, properly initialize the new database connection
        await ensureDBInit();
        
        // Verify the database is working
        if (!db.db) {
            throw new Error('Database connection failed after recovery');
        }
        
        console.log('✅ Database repair completed and connection verified');
        return { success: true, dbName: db.dbName, connection: !!db.db };
        
    } catch (error) {
        console.error('💀 Database repair failed:', error);
        return { success: false, error: error.message };
    }
};

// Make ensureDBInit available globally
window.ensureDBInit = ensureDBInit;

// Delayed initialization to prevent race conditions on page load
setTimeout(() => {
    if (!window.document.hidden) { // Only init if page is visible
        ensureDBInit().then(() => {
            console.log('✅ Database pre-initialized successfully');
            // Set flag to indicate database is ready
            localStorage.setItem('database_initialized', Date.now().toString());
        }).catch(() => {
            console.warn('⚠️ Initial database initialization failed, will retry on demand');
        });
    }
}, 500); // Increased delay to let all scripts load properly

// Also try to initialize when page is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (!db.db) {
                ensureDBInit().catch(() => {
                    console.warn('⚠️ DOMContentLoaded database initialization failed, will retry on demand');
                });
            }
        }, 1000);
    });
} else {
    // Document already loaded, initialize immediately
    setTimeout(() => {
        if (!db.db) {
            ensureDBInit().catch(() => {
                console.warn('⚠️ Late database initialization failed, will retry on demand');
            });
        }
    }, 1000);
}
