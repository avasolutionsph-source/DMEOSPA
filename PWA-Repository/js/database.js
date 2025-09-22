// IndexedDB Database Management
class Database {
    constructor() {
        this.dbName = 'AvaSolutionsDB';
        this.version = 14; // Incremented to add payrollRequests store
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
                console.log(`🔄 Database upgrade needed: ${existingDb.version} -> ${this.version}`);
                
                // For version 6 specifically, we need expenses store
                if (existingDb.version < 6) {
                    console.log('Forcing database upgrade for expenses store');
                }
                
                // For version 10 specifically, we need customers store
                if (existingDb.version < 10) {
                    console.log('🔄 Forcing database upgrade for customer management features');
                    console.log('This will create the customers table and indexes');
                }
            }
            
            // Additional check: if database exists but doesn't have customers store, force upgrade
            if (existingDb && existingDb.version >= 9 && existingDb.version < 10) {
                console.log('🔄 Detected version 9 database - upgrading to add customers table');
                // The version increment will trigger onupgradeneeded which will create customers store
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
                console.log(`🔄 Database upgrade in progress: ${e.oldVersion} -> ${e.newVersion}`);
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

                // Customers store
                if (!this.db.objectStoreNames.contains('customers')) {
                    console.log('✨ Creating customers object store with indexes');
                    const customersStore = this.db.createObjectStore('customers', { keyPath: 'id', autoIncrement: true });
                    customersStore.createIndex('phone', 'phone', { unique: false });
                    customersStore.createIndex('email', 'email', { unique: false });
                    customersStore.createIndex('lastName', 'lastName', { unique: false });
                    customersStore.createIndex('syncStatus', 'syncStatus', { unique: false });
                    console.log('✅ Customers store created successfully');
                } else {
                    console.log('✅ Customers store already exists');
                }

                // Transactions store
                if (!this.db.objectStoreNames.contains('transactions')) {
                    const transactionsStore = this.db.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true });
                    transactionsStore.createIndex('date', 'date', { unique: false });
                    transactionsStore.createIndex('employeeId', 'employeeId', { unique: false });
                    transactionsStore.createIndex('syncStatus', 'syncStatus', { unique: false });
                }

                // Appointments store
                if (!this.db.objectStoreNames.contains('appointments')) {
                    const appointmentsStore = this.db.createObjectStore('appointments', { keyPath: 'id', autoIncrement: true });
                    appointmentsStore.createIndex('date', 'date', { unique: false });
                    appointmentsStore.createIndex('customerId', 'customerId', { unique: false });
                    appointmentsStore.createIndex('employeeId', 'employeeId', { unique: false });
                    appointmentsStore.createIndex('status', 'status', { unique: false });
                    appointmentsStore.createIndex('syncStatus', 'syncStatus', { unique: false });
                }

                // Operations store (for business operations data)
                if (!this.db.objectStoreNames.contains('operations')) {
                    const operationsStore = this.db.createObjectStore('operations', { keyPath: 'id', autoIncrement: true });
                    operationsStore.createIndex('type', 'type', { unique: false });
                    operationsStore.createIndex('date', 'date', { unique: false });
                    operationsStore.createIndex('status', 'status', { unique: false });
                    operationsStore.createIndex('syncStatus', 'syncStatus', { unique: false });
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

                // Attendance store (essential data, synced with MongoDB)
                if (!this.db.objectStoreNames.contains('attendance')) {
                    const attendanceStore = this.db.createObjectStore('attendance', { keyPath: 'id', autoIncrement: true });
                    attendanceStore.createIndex('employeeId', 'employeeId', { unique: false });
                    attendanceStore.createIndex('date', 'date', { unique: false });
                    attendanceStore.createIndex('timestamp', 'timestamp', { unique: false });
                    attendanceStore.createIndex('method', 'method', { unique: false });
                    attendanceStore.createIndex('syncStatus', 'syncStatus', { unique: false });
                }
                
                // Attendance media store (photos/videos, local only)
                if (!this.db.objectStoreNames.contains('attendance_media')) {
                    const mediaStore = this.db.createObjectStore('attendance_media', { keyPath: 'id' });
                    mediaStore.createIndex('employeeId', 'employeeId', { unique: false });
                    mediaStore.createIndex('date', 'date', { unique: false });
                    mediaStore.createIndex('checkInTime', 'checkInTime', { unique: false });
                }
                
                // Activities store for activity logger
                if (!this.db.objectStoreNames.contains('activities')) {
                    const activitiesStore = this.db.createObjectStore('activities', { keyPath: 'id', autoIncrement: true });
                    activitiesStore.createIndex('timestamp', 'timestamp', { unique: false });
                    activitiesStore.createIndex('type', 'type', { unique: false });
                    activitiesStore.createIndex('category', 'category', { unique: false });
                    activitiesStore.createIndex('userId', 'userId', { unique: false });
                }

                // Settings store
                if (!this.db.objectStoreNames.contains('settings')) {
                    const settingsStore = this.db.createObjectStore('settings', { keyPath: 'key' });
                    // Add default settings
                    settingsStore.add({ key: 'businessName', value: 'Business' });
                    settingsStore.add({ key: 'apiUrl', value: 'https://daetspa-backend.onrender.com' }); // Unified Backend URL
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
                
                // Payroll store
                if (!this.db.objectStoreNames.contains('payroll')) {
                    const payrollStore = this.db.createObjectStore('payroll', { keyPath: 'id', autoIncrement: true });
                    payrollStore.createIndex('employeeId', 'employeeId', { unique: false });
                    payrollStore.createIndex('periodStart', 'periodStart', { unique: false });
                    payrollStore.createIndex('periodEnd', 'periodEnd', { unique: false });
                    payrollStore.createIndex('status', 'status', { unique: false });
                    payrollStore.createIndex('createdAt', 'createdAt', { unique: false });
                }
                
                // Employee Requests store (OT, Leave)
                if (!this.db.objectStoreNames.contains('employeeRequests')) {
                    const requestsStore = this.db.createObjectStore('employeeRequests', { keyPath: 'id', autoIncrement: true });
                    requestsStore.createIndex('employeeId', 'employeeId', { unique: false });
                    requestsStore.createIndex('requestType', 'requestType', { unique: false });
                    requestsStore.createIndex('status', 'status', { unique: false });
                    requestsStore.createIndex('requestDate', 'requestDate', { unique: false });
                    requestsStore.createIndex('approvedBy', 'approvedBy', { unique: false });
                }

                // Payroll requests store (for employee portal)
                if (!this.db.objectStoreNames.contains('payrollRequests')) {
                    const payrollRequestsStore = this.db.createObjectStore('payrollRequests', { keyPath: 'id' });
                    payrollRequestsStore.createIndex('employeeId', 'employeeId', { unique: false });
                    payrollRequestsStore.createIndex('type', 'type', { unique: false });
                    payrollRequestsStore.createIndex('status', 'status', { unique: false });
                    payrollRequestsStore.createIndex('createdAt', 'createdAt', { unique: false });
                }
                
                // Audit Log store
                if (!this.db.objectStoreNames.contains('auditLog')) {
                    const auditStore = this.db.createObjectStore('auditLog', { keyPath: 'id', autoIncrement: true });
                    auditStore.createIndex('timestamp', 'timestamp', { unique: false });
                    auditStore.createIndex('userId', 'userId', { unique: false });
                    auditStore.createIndex('action', 'action', { unique: false });
                    auditStore.createIndex('entityType', 'entityType', { unique: false });
                    auditStore.createIndex('entityId', 'entityId', { unique: false });
                }
                
                // Attendance Rules Configuration
                if (!this.db.objectStoreNames.contains('attendanceRules')) {
                    const rulesStore = this.db.createObjectStore('attendanceRules', { keyPath: 'id', autoIncrement: true });
                    // Will store single configuration object
                }
                
                // Attendance records store
                if (!this.db.objectStoreNames.contains('attendance')) {
                    const attendanceStore = this.db.createObjectStore('attendance', { keyPath: 'id', autoIncrement: true });
                    attendanceStore.createIndex('employeeId', 'employeeId', { unique: false });
                    attendanceStore.createIndex('date', 'date', { unique: false });
                    attendanceStore.createIndex('syncStatus', 'syncStatus', { unique: false });
                }
                
                // Attendance media store (for photos/videos)
                if (!this.db.objectStoreNames.contains('attendance_media')) {
                    const mediaStore = this.db.createObjectStore('attendance_media', { keyPath: 'id', autoIncrement: true });
                    mediaStore.createIndex('employeeId', 'employeeId', { unique: false });
                    mediaStore.createIndex('date', 'date', { unique: false });
                }
                
                // Holiday Calendar
                if (!this.db.objectStoreNames.contains('holidays')) {
                    const holidayStore = this.db.createObjectStore('holidays', { keyPath: 'id', autoIncrement: true });
                    holidayStore.createIndex('date', 'date', { unique: false });
                    holidayStore.createIndex('type', 'type', { unique: false });
                    holidayStore.createIndex('year', 'year', { unique: false });
                }

                // HybridAPIClient cache store
                if (!this.db.objectStoreNames.contains('cache')) {
                    const cacheStore = this.db.createObjectStore('cache', { keyPath: 'id' });
                    cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
                    cacheStore.createIndex('ttl', 'ttl', { unique: false });
                }

                // HybridAPIClient request queue store
                if (!this.db.objectStoreNames.contains('requestQueue')) {
                    const queueStore = this.db.createObjectStore('requestQueue', { keyPath: 'id' });
                    queueStore.createIndex('timestamp', 'timestamp', { unique: false });
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
        
        // CRITICAL: Check if db actually exists after init
        if (!this.db) {
            console.error(`[DATABASE] getAll failed: Database not initialized for store '${storeName}'`);
            console.error('[DATABASE] Current state:', {
                dbExists: !!this.db,
                dbName: this.dbName,
                isOpen: this.isOpen,
                windowDb: !!window.db
            });
            throw new Error(`Database not initialized when trying to access store '${storeName}'`);
        }
        
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.getAll();

                request.onsuccess = () => {
                    resolve(request.result);
                };

                request.onerror = () => {
                    console.error(`[DATABASE] getAll error for store '${storeName}':`, request.error);
                    reject(`Error getting all data from ${storeName}: ${request.error?.message || 'Unknown error'}`);
                };
            } catch (error) {
                console.error(`[DATABASE] getAll exception for store '${storeName}':`, error);
                reject(`Failed to access store '${storeName}': ${error.message}`);
            }
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

    // Alias for update to maintain compatibility
    async put(storeName, data, id) {
        if (id !== undefined) {
            data.id = id;
        }
        return this.update(storeName, data);
    }

    // Alias for clearStore to maintain compatibility
    async clear(storeName) {
        return this.clearStore(storeName);
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
        // Ensure DB is ready
        await ensureDBInit();
        
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
        return transactions.filter(t => {
            // Check both 'date' and 'createdAt' fields for compatibility
            const transactionDate = t.date || t.createdAt;
            if (!transactionDate) return false;
            return new Date(transactionDate).toDateString() === today;
        });
    }

    async getMonthlyRevenue() {
        const transactions = await this.getAll('transactions');
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const monthlyTransactions = transactions.filter(t => {
            // Check both 'date' and 'createdAt' fields for compatibility
            const transactionDate = t.date || t.createdAt;
            if (!transactionDate) return false;
            const date = new Date(transactionDate);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        });

        return monthlyTransactions.reduce((sum, t) => sum + (t.total || 0), 0);
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

    // Get all store names from the database
    async getAllStoreNames() {
        await ensureDBInit();
        if (!this.db) {
            console.warn('Database not initialized, returning empty array');
            return [];
        }
        
        const storeNames = [];
        for (let i = 0; i < this.db.objectStoreNames.length; i++) {
            storeNames.push(this.db.objectStoreNames[i]);
        }
        return storeNames;
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

    // Force database recreation - useful for testing and ensuring all users get new schema
    async forceRecreateDatabase() {
        console.log('🔄 Forcing database recreation...');
        
        try {
            // Close current connection
            if (this.db) {
                this.db.close();
                this.db = null;
            }
            
            // Delete the database
            await new Promise((resolve, reject) => {
                const deleteReq = indexedDB.deleteDatabase(this.dbName);
                deleteReq.onsuccess = () => {
                    console.log('✅ Database deleted successfully');
                    resolve();
                };
                deleteReq.onerror = () => {
                    console.error('❌ Failed to delete database');
                    reject();
                };
                deleteReq.onblocked = () => {
                    console.warn('⚠️ Database deletion blocked - close all tabs using this app');
                    // Try to resolve anyway as it might work
                    setTimeout(resolve, 1000);
                };
            });
            
            // Wait a moment
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Reinitialize with fresh schema
            this.initAttempts = 0;
            await this.init();
            
            console.log('✅ Database recreated successfully with all tables including customers');
            return true;
            
        } catch (error) {
            console.error('❌ Failed to recreate database:', error);
            return false;
        }
    }

    // Check if customers table exists and create if missing
    async ensureCustomersTable() {
        try {
            if (!this.db) {
                await this.init();
            }
            
            // Check if customers store exists
            if (!this.db.objectStoreNames.contains('customers')) {
                console.log('🔄 Customers table missing - forcing database recreation...');
                return await this.forceRecreateDatabase();
            } else {
                console.log('✅ Customers table exists');
                return true;
            }
        } catch (error) {
            console.error('Error checking customers table:', error);
            console.log('🔄 Attempting database recreation due to error...');
            return await this.forceRecreateDatabase();
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

// Developer console utilities - available in browser console
window.dbUtils = {
    // Force database recreation (useful for testing)
    async forceRecreate() {
        console.log('🔄 Force recreating database...');
        return await window.db.forceRecreateDatabase();
    },
    
    // Check and ensure customers table
    async ensureCustomers() {
        console.log('🔍 Ensuring customers table...');
        return await window.db.ensureCustomersTable();
    },
    
    // Get database info
    async info() {
        if (!window.db.db) {
            await window.db.init();
        }
        
        const info = {
            name: window.db.dbName,
            version: window.db.version,
            stores: Array.from(window.db.db.objectStoreNames),
            hasCustomers: window.db.db.objectStoreNames.contains('customers')
        };
        
        console.table(info);
        return info;
    }
};

// Safe Database Helper Functions - Non-Breaking Additions
window.waitForDatabase = async function(timeout = 5000) {
    const start = Date.now();
    while (!window.db?.db) {
        if (Date.now() - start > timeout) {
            throw new Error('Database initialization timeout after ' + timeout + 'ms');
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    return window.db;
};

// Check if database is ready without waiting
window.isDatabaseReady = function() {
    return !!(window.db?.db && window.db.isOpen);
};

// Safe database operation wrapper with context
window.safeDbOperation = async function(operation, context = 'unknown') {
    try {
        // Wait for database if not ready
        if (!window.isDatabaseReady()) {
            console.log(`⏳ Waiting for database in ${context}...`);
            await window.waitForDatabase();
        }
        
        // Execute the operation
        return await operation();
    } catch (error) {
        console.error(`Database error in ${context}:`, error);
        
        // Log to error recovery system if available
        if (window.errorRecovery?.logError) {
            window.errorRecovery.logError('DATABASE_ERROR', error, { context });
        }
        
        // Re-throw to maintain existing error handling
        throw error;
    }
};

// Initialize state tracking
if (!window.initState) {
    window.initState = {
        database: 'pending',
        auth: 'pending', 
        stateManager: 'pending',
        sync: 'pending',
        startTime: Date.now()
    };
}

// Update database init state when ready
const originalInit = db.init.bind(db);
db.init = async function() {
    window.initState.database = 'initializing';
    try {
        const result = await originalInit();
        window.initState.database = 'ready';
        window.initState.databaseInitTime = Date.now() - window.initState.startTime;
        console.log(`✅ Database initialized in ${window.initState.databaseInitTime}ms`);
        return result;
    } catch (error) {
        window.initState.database = 'failed';
        throw error;
    }
};

console.log('🛠️ Database utilities available at window.dbUtils');
console.log('Use dbUtils.forceRecreate() to force database recreation');
console.log('Use dbUtils.ensureCustomers() to ensure customers table exists');
console.log('Use dbUtils.info() to get database information');
console.log('✨ New: waitForDatabase(), isDatabaseReady(), safeDbOperation() helpers available');
