// Sync Manager for offline/online synchronization with unified backend


class SyncManager {
    constructor() {
        this.apiUrl = ''; // Will be set from API_CONFIG
        this.isOnline = navigator.onLine;
        this.syncInProgress = false;
        this.syncInterval = null;
        this.pendingSync = [];
        this.socket = null; // WebSocket connection
        this.hasPendingChanges = false; // Track if there are changes to sync
        this.lastSyncTime = 0; // Prevent excessive syncing
        
        this.init();
    }

    // Helper method to fetch with timeout to prevent freezing
    async fetchWithTimeout(url, options = {}, timeout = 8000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timeout - possibly offline');
            }
            throw error;
        }
    }

    async init() {
        // Delayed initialization to prevent blocking
        setTimeout(async () => {
            try {
                // Use unified backend API configuration
                if (window.API_CONFIG) {
                    this.apiUrl = window.API_CONFIG.BASE_URL;
                    // Initialize WebSocket for real-time sync
                    this.initializeWebSocket();
                } else {
                    // Fallback to direct URL if API_CONFIG not loaded
                    this.apiUrl = 'https://daetspa-backend.onrender.com';
                }
                
                logInfo('Using unified backend API', { 
                    category: 'SYNC', 
                    operation: 'init',
                    data: { apiUrl: this.apiUrl }
                });

                // Set up online/offline listeners
                window.addEventListener('online', () => this.handleOnline());
                window.addEventListener('offline', () => this.handleOffline());

                // Update UI status
                this.updateConnectionStatus();

                // Initial sync only, then switch to event-driven
                if (this.isOnline && this.apiUrl) {
                    setTimeout(() => this.performInitialSync(), 5000);
                }

                // Listen for service worker messages
                if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.addEventListener('message', (event) => {
                        if (event.data.type === 'SYNC_COMPLETE') {
                            this.onSyncComplete(event.data);
                        }
                    });
                }
            } catch (error) {
                logWarn('Sync manager initialization deferred', { 
                    category: 'SYNC', 
                    operation: 'init',
                    error: error
                });
            }
        }, 1000);
    }

    initializeWebSocket() {
        if (!window.API_CONFIG || !window.API_CONFIG.ENABLE_WEBSOCKETS) return;
        
        try {
            // Initialize WebSocket connection
            this.socket = window.API_CONFIG.initWebSocket();
            
            if (this.socket) {
                // Listen for real-time state updates
                this.socket.on('state:update', (data) => {
                    this.handleRealtimeStateUpdate(data);
                });
                
                // Listen for data changes from other devices
                this.socket.on('data:updated', (data) => {
                    this.handleRealtimeDataUpdate(data);
                });
                
                // Listen for sync requests from server
                this.socket.on('sync:request', () => {
                    this.syncAll();
                });
                
                logInfo('WebSocket initialized for real-time sync', {
                    category: 'SYNC',
                    operation: 'websocket_init'
                });
            }
        } catch (error) {
            logError('Failed to initialize WebSocket', {
                category: 'SYNC',
                operation: 'websocket_init',
                error: error
            });
        }
    }
    
    // Get authentication token for API requests
    getAuthToken() {
        // Use global token manager if available
        if (window.getAuthToken) {
            return window.getAuthToken();
        }
        
        // Check auth system if available
        if (window.authSystem && window.authSystem.authToken) {
            return window.authSystem.authToken;
        }
        
        // Check multiple possible token locations
        const possibleKeys = ['authToken', 'userToken', 'jwt_token', 'token'];
        
        for (const key of possibleKeys) {
            // Check localStorage first
            let token = localStorage.getItem(key);
            if (token && token !== 'null' && token !== 'undefined') {
                return token;
            }
            
            // Then check sessionStorage
            token = sessionStorage.getItem(key);
            if (token && token !== 'null' && token !== 'undefined') {
                return token;
            }
        }
        
        return null;
    }
    
    handleRealtimeStateUpdate(data) {
        // Update StateManager with real-time changes
        if (window.StateManager && window.StateManager.initialized) {
            Object.keys(data).forEach(path => {
                window.StateManager.setState(path, data[path]);
            });
        }
    }
    
    handleRealtimeDataUpdate(data) {
        // Handle real-time data updates from other devices
        if (window.logger) {
            window.logger.info('Real-time data update received', {
                category: 'SYNC',
                types: data.types,
                timestamp: data.timestamp
            });
        }
        
        // Trigger UI refresh if needed
        if (data.types.includes('inventory')) {
            window.loadInventory && window.loadInventory();
        }
        if (data.types.includes('products')) {
            window.loadProducts && window.loadProducts();
        }
        if (data.types.includes('transactions')) {
            window.loadDashboard && window.loadDashboard();
        }
    }
    
    handleOnline() {
        if (window.logger) {
            window.logger.info('Connection restored', { 
                category: 'SYNC', 
                operation: 'connection_status',
                data: { status: 'online' }
            });
        }
        this.isOnline = true;
        this.updateConnectionStatus();
        this.showNotification('Back online! Syncing data...', 'success');
        
        // Reconnect WebSocket if needed
        if (this.socket && !this.socket.connected) {
            this.socket.connect();
        }
        
        // Sync only if there are pending changes
        if (this.hasPendingChanges) {
            this.triggerSync();
        }
    }

    handleOffline() {
        if (window.logger) {
            window.logger.warn('Connection lost', { 
                category: 'SYNC', 
                operation: 'connection_status',
                data: { status: 'offline' }
            });
        }
        this.isOnline = false;
        this.updateConnectionStatus();
        this.showNotification('Working offline. Changes will sync when connection is restored.', 'warning');
        
        // Stop auto sync
        this.stopAutoSync();
    }

    updateConnectionStatus() {
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            const icon = statusElement.querySelector('i');
            const text = statusElement.querySelector('span');
            
            if (this.isOnline) {
                icon.className = 'fas fa-wifi';
                text.textContent = 'Online';
                statusElement.classList.remove('offline');
                statusElement.classList.add('online');
            } else {
                icon.className = 'fas fa-wifi-slash';
                text.textContent = 'Offline';
                statusElement.classList.remove('online');
                statusElement.classList.add('offline');
            }
        }
    }

    performInitialSync() {
        // Only do initial sync once, then rely on event-driven sync
        // Double-check online status to prevent freezing
        if (this.isOnline && navigator.onLine && !this.syncInProgress) {
            console.log('🔄 Starting initial sync - device is online');
            // CRITICAL: Only download data from MongoDB to populate new device
            // DO NOT do upload sync after download - this prevents data loss
            this.downloadAllDataFromServer();
        } else {
            console.log('📴 Skipping initial sync - device is offline');
        }
    }

    // ============================================================================
    // DOWNLOAD SYNC: Get data from MongoDB to populate IndexedDB on new devices
    // ============================================================================
    
    async downloadAllDataFromServer() {
        console.log('📥 Starting complete data download from MongoDB for new device...');
        
        // Final online check to prevent freeze
        if (!navigator.onLine || !this.isOnline) {
            console.log('📴 Device went offline - aborting data download to prevent freeze');
            return;
        }
        
        // Debug: Check authentication
        const token = this.getAuthToken();
        console.log('🔑 Auth token available:', !!token);
        console.log('🔗 API URL:', this.apiUrl);
        
        if (!token) {
            console.error('❌ No authentication token found - cannot download data');
            return;
        }
        
        try {
            // Download all data types in parallel for fastest sync
            // NOTE: Employees and Attendance are stored directly in MongoDB (no sync)
            await Promise.all([
                this.downloadProductsFromServer(), 
                this.downloadInventoryFromServer(),
                this.downloadTransactionsFromServer(),
                this.downloadCustomersFromServer(),
                this.downloadConfigurationsFromServer(), // New: settings/config sync
                this.downloadPayrollUpdates() // This function already exists
            ]);
            
            console.log('✅ Complete data download finished - device is now synchronized');
            
            // Trigger UI refresh after data download
            if (window.location.pathname.includes('employees')) {
                window.location.reload();
            }
            
        } catch (error) {
            console.error('❌ Failed to download data from server:', error);
        }
    }



    async downloadCustomersFromServer() {
        try {
            console.log('👤 Downloading customers from MongoDB...');
            
            const response = await this.fetchWithTimeout(`${this.apiUrl}/api/customers`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                const customers = result.data || [];
                
                console.log(`📥 Downloaded ${customers.length} customers from MongoDB`);
                
                // Clear and repopulate
                const existingCustomers = await window.db.getAll('customers');  
                for (const existing of existingCustomers) {
                    await window.db.delete('customers', existing.id);
                }
                
                for (const customer of customers) {
                    customer.syncStatus = 'synced';
                    await window.db.add('customers', customer);
                }
                
                console.log(`✅ ${customers.length} customers saved to IndexedDB`);
            }
        } catch (error) {
            console.error('❌ Download customers error:', error);
        }
    }


    async downloadConfigurationsFromServer() {
        try {
            console.log('⚙️ Downloading configurations/settings from MongoDB...');
            
            const response = await this.fetchWithTimeout(`${this.apiUrl}/api/settings`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                const configurations = result.data || [];
                
                console.log(`📥 Downloaded ${configurations.length} configuration settings from MongoDB`);
                
                // Clear and repopulate settings
                const existingSettings = await window.db.getAll('settings');
                for (const existing of existingSettings) {
                    // Don't delete local-only settings like sync timestamps
                    if (!existing.id?.includes('Sync') && !existing.id?.includes('timestamp')) {
                        await window.db.delete('settings', existing.id);
                    }
                }
                
                for (const config of configurations) {
                    config.syncStatus = 'synced';
                    await window.db.add('settings', config);
                }
                
                console.log(`✅ ${configurations.length} configurations saved to IndexedDB`);
            } else {
                console.error('❌ Failed to download configurations:', response.status);
            }
        } catch (error) {
            console.error('❌ Download configurations error:', error);
        }
    }
    
    // Event-driven sync - call this when data changes
    triggerSync() {
        const now = Date.now();
        
        // Prevent excessive syncing (max once every 5 seconds)
        if (now - this.lastSyncTime < 5000) {
            this.hasPendingChanges = true;
            return;
        }
        
        if (this.isOnline && !this.syncInProgress) {
            this.lastSyncTime = now;
            this.hasPendingChanges = false;
            this.syncAll();
        } else {
            this.hasPendingChanges = true;
        }
    }

    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    async syncAll() {
        if (!this.isOnline || !this.apiUrl || this.syncInProgress) {
            return;
        }

        this.syncInProgress = true;
        this.showSyncIndicator(true);

        try {
            // Sync each data type with yielding to prevent UI blocking
            await this.syncProducts();
            await this.yieldControl();
            
            await this.syncInventory();
            await this.yieldControl();
            
            // Sync employee performance data to backend
            await this.syncEmployees();
            await this.yieldControl();
            
            await this.syncTransactions();
            await this.yieldControl();
            
            await this.syncCustomers();
            await this.yieldControl();
            
            await this.syncPayroll();
            await this.yieldControl();
            
            // Sync attendance data
            await this.syncAttendance();
            await this.yieldControl();
            
            // Removed chatbot sync - AI assistant is local to PWA only
            await this.yieldControl();
            
            // Process sync queue
            await this.processSyncQueue();
            
            // Update last sync time
            await window.db.update('settings', {
                key: 'lastSync',
                value: new Date().toISOString()
            });

            this.showNotification('Data synced successfully', 'success');
        } catch (error) {
            if (window.logger) {
                window.logger.error('Sync failed', { 
                    category: 'SYNC', 
                    operation: 'sync_all',
                    error: error
                });
            } else {
                console.error('Sync failed:', error);
            }
            this.showNotification('Sync failed. Will retry later.', 'error');
        } finally {
            this.syncInProgress = false;
            this.showSyncIndicator(false);
        }
    }

    // Yield control to prevent UI blocking during heavy sync operations
    async yieldControl() {
        return new Promise(resolve => setTimeout(resolve, 0));
    }

    async syncProducts() {
        try {
            // Get ALL products to ensure complete sync
            const allProducts = await window.db.getAll('products');
            
            if (window.logger) {
                window.logger.info('Products ready for sync', { 
                    category: 'SYNC', 
                    operation: 'sync_products',
                    data: { count: allProducts.length }
                });
            }
            
            // Always send sync request with all products
            const response = await this.sendToServer(window.API_CONFIG ? window.API_CONFIG.ENDPOINTS.SYNC.PRODUCTS : '/api/sync/products', {
                products: allProducts || [],
                productsSummary: {
                    totalProducts: allProducts.length,
                    lastUpdated: new Date().toISOString()
                }
            });

            if (response.ok) {
                if (window.logger) {
                    window.logger.info('Products sync successful', { 
                        category: 'SYNC', 
                        operation: 'sync_products',
                        data: { status: 'success' }
                    });
                }
                // Mark all products as synced
                for (const product of allProducts) {
                    if (product.syncStatus !== 'synced') {
                        product.syncStatus = 'synced';
                        await window.db.update('products', product);
                    }
                }
            } else {
                if (window.logger) {
                    window.logger.error('Products sync failed', { 
                        category: 'SYNC', 
                        operation: 'sync_products',
                        error: { status: response.status }
                    });
                } else {
                    console.error('❌ Products sync failed:', response.status);
                }
            }
        } catch (error) {
            if (window.logger) {
                window.logger.error('Product sync failed', { 
                    category: 'SYNC', 
                    operation: 'sync_products',
                    error: error
                });
            } else {
                console.error('❌ Product sync failed:', error);
            }
        }
    }

    async syncInventory() {
        try {
            // Get ALL inventory items to provide complete data to Business Dashboard
            const allInventory = await window.db.getAll('inventory');
            
            if (window.logger) {
                window.logger.info('Found inventory items for sync', {
                    category: 'SYNC',
                    operation: 'inventory_sync_count',
                    data: { count: allInventory.length }
                });
            } else {
                console.log(`📦 Found ${allInventory.length} total inventory items for sync`);
            }
            console.log('📦 Inventory details:', allInventory.map(item => ({ 
                name: item.name, 
                sku: item.sku,
                quantity: item.quantity,
                category: item.category 
            })));

            if (allInventory.length === 0) {
                // This is normal when inventory is empty, just return silently
                // No need to log this as it's not an error or warning
                return;
            }

            // Calculate inventory summary
            const lowStockItems = allInventory.filter(item => {
                const stock = item.quantity || item.currentStock || 0;
                return stock <= (item.minStock || 5) && stock > 0;
            }).length;
            const outOfStockItems = allInventory.filter(item => {
                const stock = item.quantity || item.currentStock || 0;
                return stock === 0;
            }).length;

            // Ensure all inventory items have proper data structure INCLUDING ALL FIELDS
            const processedInventory = allInventory.map(item => ({
                id: item.id || item._id,  // Don't generate fake IDs - let backend handle by name matching
                name: item.name || 'Unknown Item',
                sku: item.sku || '',
                category: item.category || 'Uncategorized',
                quantity: item.quantity || item.currentStock || 0,  // Handle legacy currentStock field
                currentStock: item.currentStock || item.quantity || 0,
                unit: item.unit || 'units',
                minStock: item.minStock || 5,
                price: item.price || item.unitPrice || 0,
                cost: item.cost || 0,
                costPrice: item.costPrice || item.cost || 0,  // CRITICAL: Include unit cost
                sellingPrice: item.sellingPrice || item.price || item.unitPrice || 0,  // CRITICAL: Include selling price
                supplier: item.supplier || '',
                description: item.description || item.notes || '',
                notes: item.notes || item.description || '',
                lastRestocked: item.lastRestocked || null,
                // CRITICAL: Include checkbox fields
                availableInPOS: item.availableInPOS || false,  // CRITICAL: Include POS availability
                lowStockAlert: item.lowStockAlert || false,   // CRITICAL: Include low stock alert
                // Include other important fields
                isActive: item.isActive !== false,
                syncStatus: item.syncStatus || 'pending',
                modifiedAt: item.modifiedAt || new Date().toISOString(),
                createdAt: item.createdAt || new Date().toISOString()
            }));

            if (window.logger) {
                window.logger.debug('Sending processed inventory', {
                    category: 'SYNC',
                    operation: 'inventory_sync_send',
                    data: { items: processedInventory }
                });
            } else {
                console.log('📤 Sending processed inventory:', processedInventory);
            }

            // Send all inventory with summary data
            const response = await this.sendToServer(window.API_CONFIG ? window.API_CONFIG.ENDPOINTS.SYNC.INVENTORY : '/api/sync/inventory', {
                inventory: processedInventory,
                inventorySummary: {
                    totalItems: allInventory.length,
                    lowStockItems: lowStockItems,
                    outOfStockItems: outOfStockItems
                }
            });

            if (response.ok) {
                if (window.logger) {
                    window.logger.info('Inventory sync successful', {
                        category: 'SYNC',
                        operation: 'inventory_sync_success'
                    });
                } else {
                    console.log('✅ Inventory sync successful');
                }
                // Mark all inventory as synced
                for (const item of allInventory) {
                    if (item.syncStatus !== 'synced') {
                        item.syncStatus = 'synced';
                        await window.db.update('inventory', item);
                    }
                }
                if (window.logger) {
                    window.logger.info('All inventory items marked as synced', {
                        category: 'SYNC',
                        operation: 'inventory_mark_synced'
                    });
                } else {
                    console.log('✅ All inventory items marked as synced');
                }
            } else {
                const errorText = await response.text();
                if (window.logger) {
                    window.logger.error('Inventory sync failed', {
                        category: 'SYNC',
                        operation: 'inventory_sync_error',
                        error: { status: response.status, message: errorText }
                    });
                } else {
                    console.error('❌ Inventory sync failed:', response.status, errorText);
                }
            }
        } catch (error) {
            console.error('❌ Inventory sync failed:', error);
        }
    }

    // Employee sync function - uploads performance data from IndexedDB to backend
    async syncEmployees() {
        try {
            // Get employees with performance data from IndexedDB
            const employees = await window.db.getAll('employees');
            
            if (!employees || employees.length === 0) {
                console.log('📋 [EMPLOYEE-SYNC] No employees to sync');
                return;
            }

            console.log(`📋 [EMPLOYEE-SYNC] Starting sync for ${employees.length} employees...`);
            
            // Filter employees that have performance data to sync
            const employeesToSync = employees.filter(employee => {
                return employee.totalSales || employee.totalCommission || employee.totalTransactions || employee.transactionCount;
            });

            if (employeesToSync.length === 0) {
                console.log('📋 [EMPLOYEE-SYNC] No employees with performance data to sync');
                return;
            }

            console.log(`📊 [EMPLOYEE-SYNC] Found ${employeesToSync.length} employees with performance data`);

            // Prepare all employee data for batch sync
            const employeesData = employeesToSync.map(employee => {
                console.log(`📊 [EMPLOYEE-SYNC] Preparing ${employee.name}:`, {
                    totalSales: employee.totalSales || 0,
                    totalCommission: employee.totalCommission || 0,
                    totalTransactions: employee.totalTransactions || employee.transactionCount || 0
                });

                return {
                    id: employee.id || employee.localId, // Use id field expected by sync endpoint
                    name: employee.name || `${employee.firstName || 'Unknown'} ${employee.lastName || 'Employee'}`.trim(),
                    firstName: employee.firstName || employee.name?.split(' ')[0] || 'Unknown',
                    lastName: employee.lastName || employee.name?.split(' ').slice(1).join(' ') || 'Employee',
                    email: employee.email || '',
                    phone: employee.phone || '',
                    position: employee.position || 'No Position',
                    hireDate: employee.hireDate || employee.hiredDate || new Date(),
                    commissionRate: employee.commissionRate || employee.commission || 0,
                    // Performance data - this is what we really want to sync
                    totalSales: parseFloat(employee.totalSales) || 0,
                    totalCommission: parseFloat(employee.totalCommission) || 0,
                    totalTransactions: parseInt(employee.totalTransactions) || parseInt(employee.transactionCount) || 0,
                    isActive: employee.isActive !== false
                };
            });

            // Send all employees as batch to sync endpoint
            const authToken = this.getAuthToken();
            if (!authToken) {
                console.error('❌ [EMPLOYEE-SYNC] No valid auth token found');
                return;
            }

            const response = await fetch(window.API_CONFIG.buildUrl('/api/sync/employees'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    employees: employeesData,
                    lastSync: new Date().toISOString()
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log(`✅ [EMPLOYEE-SYNC] Batch sync successful:`, result);
                
                // CRITICAL: Update local employee records with backend IDs
                if (result.employeeIdMapping && result.employeeIdMapping.length > 0) {
                    console.log(`🔄 [EMPLOYEE-ID-MAPPING] Updating ${result.employeeIdMapping.length} employee ID mappings...`);
                    await this.updateLocalEmployeeIds(result.employeeIdMapping);
                    console.log(`✅ [EMPLOYEE-ID-MAPPING] Employee IDs updated in PWA`);
                }
                
                // Update all synced employees' status in IndexedDB
                for (const employee of employeesToSync) {
                    try {
                        employee.syncStatus = 'synced';
                        employee.lastSyncDate = new Date().toISOString();
                        await window.db.update('employees', employee.id, employee);
                    } catch (updateError) {
                        console.error(`❌ [EMPLOYEE-SYNC] Failed to update sync status for ${employee.name}:`, updateError);
                    }
                }

                console.log(`✅ [EMPLOYEE-SYNC] Completed: ${employeesToSync.length} employees synced successfully`);
            } else {
                const error = await response.text();
                console.error('❌ [EMPLOYEE-SYNC] Batch sync failed:', error);
                
                // Mark all employees as sync error
                for (const employee of employeesToSync) {
                    try {
                        employee.syncStatus = 'error';
                        await window.db.update('employees', employee.id, employee);
                    } catch (updateError) {
                        console.error(`❌ [EMPLOYEE-SYNC] Failed to update error status for ${employee.name}:`, updateError);
                    }
                }
            }

            
        } catch (error) {
            console.error('❌ [EMPLOYEE-SYNC] Employee sync failed:', error);
        }
    }

    // NOTE: syncTransactions() function content was orphaned here and has been removed

    async syncTransactions() {
        try {
            // Get ALL transactions to sync to backend
            const allTransactions = await window.db.getAll('transactions');
            
            console.log(`📋 Found ${allTransactions.length} total transactions for sync`);
            
            if (window.logger) {
                window.logger.info('Transactions ready for sync', { 
                    category: 'SYNC', 
                    operation: 'sync_transactions',
                    data: { count: allTransactions.length }
                });
            }

            if (allTransactions.length === 0) {
                console.log('⚠️ No transactions to sync');
                return;
            }

            // Filter out transactions that are already synced
            const pendingTransactions = allTransactions.filter(t => 
                !t.syncStatus || t.syncStatus === 'pending' || t.syncStatus === 'failed'
            );

            console.log(`📤 Syncing ${pendingTransactions.length} pending transactions`);

            if (pendingTransactions.length === 0) {
                console.log('✅ All transactions already synced');
                return;
            }

            // Prepare transactions for backend with corrected employee IDs
            const processedTransactions = pendingTransactions.map(transaction => {
                // Fix employee ID references before syncing
                const correctedTransaction = this.ensureCorrectEmployeeId(transaction);
                
                return {
                    id: correctedTransaction.id,
                    localId: correctedTransaction.id,
                    total: correctedTransaction.total,
                    subtotal: correctedTransaction.subtotal,
                    tax: correctedTransaction.tax,
                    discount: correctedTransaction.discount,
                    paymentMethod: correctedTransaction.paymentMethod,
                    items: correctedTransaction.items || [],
                    employee: correctedTransaction.employee,
                    employeeId: correctedTransaction.employeeId, // Include both formats
                    customer: correctedTransaction.customer,
                    date: correctedTransaction.date || correctedTransaction.createdAt,
                    createdAt: correctedTransaction.createdAt,
                    modifiedAt: correctedTransaction.modifiedAt || correctedTransaction.createdAt,
                    notes: correctedTransaction.notes,
                    status: correctedTransaction.status || 'completed',
                    source: 'PWA'
            }));

            const response = await this.sendToServer(
                window.API_CONFIG ? window.API_CONFIG.ENDPOINTS.SYNC.TRANSACTIONS : '/api/sync/transactions', 
                {
                    transactions: processedTransactions,
                    transactionsSummary: {
                        totalTransactions: processedTransactions.length,
                        totalAmount: processedTransactions.reduce((sum, t) => sum + (t.total || 0), 0),
                        lastUpdated: new Date().toISOString()
                    }
                }
            );

            if (response && response.success) {
                console.log('✅ Transactions sync successful');
                
                // Mark transactions as synced in IndexedDB
                for (const transaction of pendingTransactions) {
                    await window.db.update('transactions', {
                        ...transaction,
                        syncStatus: 'synced',
                        lastSyncDate: new Date().toISOString()
                    });
                }

                if (window.logger) {
                    window.logger.info('Transaction sync completed', { 
                        category: 'SYNC', 
                        operation: 'sync_transactions_complete',
                        data: { syncedCount: pendingTransactions.length }
                    });
                }
            } else {
                console.error('❌ Transactions sync failed:', response);
                
                // Mark failed transactions
                for (const transaction of pendingTransactions) {
                    await window.db.update('transactions', {
                        ...transaction,
                        syncStatus: 'failed',
                        lastSyncError: response?.error || 'Unknown sync error'
                    });
                }
            }

        } catch (error) {
            console.error('💀 Transaction sync error:', error);
            
            if (window.logger) {
                window.logger.error('Transaction sync failed', { 
                    category: 'SYNC', 
                    operation: 'sync_transactions_error',
                    data: { error: error.message }
                });
            }
        }
    }

    async syncCustomers() {
        try {
            // Get ALL customers to provide complete data to Business Dashboard
            const allCustomers = await window.db.getAll('customers');
            
            if (window.logger) {
                window.logger.info('Customers ready for sync', { 
                    category: 'SYNC', 
                    operation: 'sync_customers',
                    data: { count: allCustomers.length }
                });
            } else {
                console.log(`👥 Found ${allCustomers.length} total customers for sync`);
            }

            if (allCustomers.length === 0) {
                console.log('⚠️ No customers to sync');
                return;
            }

            const response = await this.sendToServer(
                window.API_CONFIG ? window.API_CONFIG.ENDPOINTS.SYNC.CUSTOMERS : '/api/sync/customers', 
                {
                    customers: allCustomers || [],
                    customersSummary: {
                        totalCustomers: allCustomers.length,
                        lastUpdated: new Date().toISOString()
                    }
                }
            );

            if (response.ok) {
                if (window.logger) {
                    window.logger.info('Customers sync successful', { 
                        category: 'SYNC', 
                        operation: 'sync_customers'
                    });
                } else {
                    console.log('✅ All customers synced to server successfully');
                }

                // Mark all customers as synced
                for (const customer of allCustomers) {
                    if (customer.syncStatus !== 'synced') {
                        customer.syncStatus = 'synced';
                        await window.db.update('customers', customer);
                    }
                }
                console.log('✅ All customers marked as synced');
            } else {
                const errorText = await response.text();
                if (window.logger) {
                    window.logger.error('Customer sync failed', {
                        category: 'SYNC',
                        operation: 'customer_sync_error',
                        error: { status: response.status, message: errorText }
                    });
                } else {
                    console.error('❌ Customer sync failed:', response.status, errorText);
                }
            }
        } catch (error) {
            if (window.logger) {
                window.logger.error('Customer sync failed', { 
                    category: 'SYNC', 
                    operation: 'sync_customers',
                    error: error
                });
            } else {
                console.error('❌ Customer sync failed:', error);
            }
        }
    }

    // ============================================================================
    // PAYROLL SYNC - Only Essential Data (no videos/photos/GPS)
    // ============================================================================
    
    async syncPayroll() {
        try {
            console.log('🧮 Syncing payroll records...');
            
            // Get all payroll records from IndexedDB
            const allPayroll = await window.db.getAll('payroll');
            
            if (!allPayroll || allPayroll.length === 0) {
                console.log('📋 No payroll records to sync');
                return;
            }
            
            // Filter and optimize payroll data - ONLY essential fields
            const optimizedPayroll = allPayroll.map(record => {
                // Extract only attendance calculation data, no videos/photos/GPS
                const attendanceData = {
                    totalDaysWorked: record.attendanceData?.totalDaysWorked || 0,
                    totalRegularHours: record.attendanceData?.totalHours || 0,
                    overtimeHours: record.attendanceData?.overtimeHours || 0,
                    nightDifferentialHours: record.attendanceData?.nightDifferentialHours || 0,
                    holidayHours: record.attendanceData?.holidaysWorked || 0,
                    lateMinutes: record.attendanceData?.lateHours ? record.attendanceData.lateHours * 60 : 0,
                    earlyDepartureMinutes: record.attendanceData?.earlyDepartureDeductions ? record.attendanceData.earlyDepartureDeductions * 60 : 0,
                    deductedHours: record.attendanceData?.earlyDepartureDeductions || 0,
                    // Only include date summaries, no raw attendance with media
                    attendanceDays: record.attendanceDetails ? record.attendanceDetails.map(day => ({
                        date: day.date,
                        hoursWorked: day.hoursWorked || 0,
                        isHoliday: day.isHoliday || false,
                        isOvertime: day.overtime || false,
                        lateMinutes: day.lateMinutes || 0,
                        earlyDepartureMinutes: day.earlyDepartureMinutes || 0
                        // NO video, photo, GPS, device info, or binary data
                    })) : []
                };
                
                return {
                    employeeId: record.employeeId,
                    periodStart: record.periodStart,
                    periodEnd: record.periodEnd,
                    payrollType: record.payrollType || 'monthly',
                    
                    // Earnings
                    basePay: record.basePay || 0,
                    overtimePay: record.overtimePay || 0,
                    holidayPay: record.holidayPay || 0,
                    nightDifferential: record.nightDifferential || 0,
                    totalAllowances: record.totalAllowances || 0,
                    commission: record.commission || 0,
                    tips: record.tips || 0,
                    grossPay: record.grossPay || 0,
                    
                    // Deductions (Philippine compliance)
                    deductions: {
                        sss: record.deductions?.sss || 0,
                        philHealth: record.deductions?.philHealth || 0,
                        pagIbig: record.deductions?.pagIbig || 0,
                        withholdingTax: record.deductions?.withholdingTax || 0,
                        loanDeductions: record.deductions?.loanDeductions || 0,
                        otherDeductions: record.deductions?.otherDeductions || 0
                    },
                    
                    totalDeductions: record.totalDeductions || 0,
                    netPay: record.netPay || 0,
                    
                    // Optimized attendance data (no media)
                    attendanceData,
                    
                    // Status
                    status: record.status || 'processed',
                    processedBy: record.processedBy || 'system',
                    processedAt: record.processedAt || new Date().toISOString(),
                    paymentMethod: record.paymentMethod || 'cash',
                    notes: record.notes || ''
                };
            });

            console.log(`💼 Uploading ${optimizedPayroll.length} optimized payroll records (no media data)...`);
            
            // Upload to backend
            const response = await this.sendToServer(`${this.apiUrl}/api/payroll/sync`, {
                payrollRecords: optimizedPayroll
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Payroll records uploaded successfully:', result);
                
                if (result.results) {
                    console.log(`📊 Created: ${result.results.created.length}, Updated: ${result.results.updated.length}, Errors: ${result.results.errors.length}`);
                }
                
                // Mark all payroll as synced
                for (const record of allPayroll) {
                    if (record.syncStatus !== 'synced') {
                        record.syncStatus = 'synced';
                        await window.db.update('payroll', record);
                    }
                }
                console.log('✅ All payroll marked as synced');
                
                // Now download any server-side payroll updates for cross-device access
                await this.downloadPayrollUpdates();
                
            } else {
                const errorText = await response.text();
                console.error('❌ Payroll sync failed:', response.status, errorText);
            }
            
        } catch (error) {
            console.error('❌ Payroll sync failed:', error);
            if (window.logger) {
                window.logger.error('Payroll sync failed', { 
                    category: 'SYNC', 
                    operation: 'sync_payroll',
                    error: error
                });
            }
        }
    }
    
    async downloadPayrollUpdates() {
        try {
            // Get last sync time for incremental updates
            const lastSync = await window.db.get('settings', 'lastPayrollSync');
            const lastSyncDate = lastSync?.value;
            
            let url = `${this.apiUrl}/api/payroll/sync`;
            if (lastSyncDate) {
                url += `?lastSync=${encodeURIComponent(lastSyncDate)}`;
            }
            
            const response = await this.fetchWithTimeout(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                const serverPayroll = result.data || [];
                
                if (serverPayroll.length > 0) {
                    console.log(`📥 Downloaded ${serverPayroll.length} payroll updates from server`);
                    
                    // Update local IndexedDB with server data
                    for (const record of serverPayroll) {
                        try {
                            // Check if record already exists locally
                            const existingRecords = await window.db.getAll('payroll');
                            const existing = existingRecords.find(local => 
                                local.employeeId === record.employeeId &&
                                local.periodStart === record.periodStart &&
                                local.periodEnd === record.periodEnd
                            );
                            
                            if (existing) {
                                // Update existing with server data
                                Object.assign(existing, record);
                                existing.syncStatus = 'synced';
                                await window.db.update('payroll', existing);
                            } else {
                                // Add new record from server
                                record.syncStatus = 'synced';
                                await window.db.add('payroll', record);
                            }
                        } catch (recordError) {
                            console.error('Error updating payroll record:', recordError);
                        }
                    }
                    
                    // Update last sync time
                    await window.db.update('settings', {
                        key: 'lastPayrollSync',
                        value: new Date().toISOString()
                    });
                    
                    console.log('✅ Payroll updates downloaded and merged successfully');
                }
                
            } else {
                console.error('❌ Failed to download payroll updates:', response.status);
            }
            
        } catch (error) {
            console.error('❌ Download payroll updates failed:', error);
        }
    }

    // Removed syncChatbotHistory() - AI assistant remains local to PWA only
    // Chatbot conversations are private and don't need backend sync

    // ============================================================================
    // ATTENDANCE SYNC - Sync attendance records across devices
    // ============================================================================
    
    async syncAttendance() {
        try {
            console.log('📊 Syncing attendance records...');
            
            // Get attendance records from IndexedDB
            const localAttendance = await window.db.getAll('attendance');
            
            if (!localAttendance || localAttendance.length === 0) {
                console.log('📋 No attendance records in IndexedDB to sync');
                
                // Try to download from server
                await this.downloadAttendanceFromServer();
                return;
            }
            
            // Filter unsynced records
            const unsyncedRecords = localAttendance.filter(record => 
                record.syncStatus === 'pending' || !record.syncStatus
            );
            
            if (unsyncedRecords.length > 0) {
                console.log(`📤 Uploading ${unsyncedRecords.length} unsynced attendance records...`);
                
                for (const record of unsyncedRecords) {
                    try {
                        // Prepare record for server (remove local-only fields)
                        const serverRecord = {
                            employeeId: record.employeeId,
                            employeeName: record.employeeName,
                            date: record.date,
                            checkInTime: record.checkInTime,
                            checkOutTime: record.checkOutTime,
                            checkInMethod: record.checkInMethod || 'manual',
                            checkOutMethod: record.checkOutMethod || 'manual',
                            hoursWorked: record.hoursWorked,
                            lateHours: record.lateHours,
                            earlyDepartureDeductions: record.earlyDepartureDeductions,
                            status: record.status || 'present'
                        };
                        
                        const response = await fetch(`${this.apiUrl}/api/attendance`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${this.authToken}`
                            },
                            body: JSON.stringify(serverRecord)
                        });
                        
                        if (response.ok) {
                            const result = await response.json();
                            
                            // Update local record with server ID and mark as synced
                            record.serverId = result.data.id || result.data._id;
                            record.syncStatus = 'synced';
                            await window.db.update('attendance', record);
                            
                            console.log(`✅ Synced attendance for ${record.employeeName} on ${record.date}`);
                        } else {
                            console.error(`❌ Failed to sync attendance record:`, response.status);
                        }
                    } catch (error) {
                        console.error(`❌ Error syncing attendance record:`, error);
                    }
                }
            }
            
            // Download any new records from server
            await this.downloadAttendanceFromServer();
            
        } catch (error) {
            console.error('❌ Attendance sync failed:', error);
            if (window.logger) {
                window.logger.error('Attendance sync failed', { 
                    category: 'SYNC', 
                    operation: 'sync_attendance',
                    error: error
                });
            }
        }
    }
    
    async downloadAttendanceFromServer() {
        try {
            console.log('📥 Downloading attendance records from server...');
            
            const response = await fetch(`${this.apiUrl}/api/attendance?limit=500`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                const serverRecords = result.data || [];
                
                if (serverRecords.length > 0) {
                    console.log(`📥 Downloaded ${serverRecords.length} attendance records from server`);
                    
                    // Get local records to check for duplicates
                    const localRecords = await window.db.getAll('attendance');
                    const localRecordMap = new Map();
                    
                    // Create map of local records by employee+date
                    localRecords.forEach(record => {
                        const key = `${record.employeeId}_${record.date}`;
                        localRecordMap.set(key, record);
                    });
                    
                    // Process server records
                    for (const serverRecord of serverRecords) {
                        const key = `${serverRecord.employeeId}_${serverRecord.date}`;
                        const existingLocal = localRecordMap.get(key);
                        
                        if (existingLocal) {
                            // Update existing record with server data
                            Object.assign(existingLocal, {
                                checkInTime: serverRecord.checkInTime || serverRecord.checkIn,
                                checkOutTime: serverRecord.checkOutTime || serverRecord.checkOut,
                                hoursWorked: serverRecord.hoursWorked,
                                lateHours: serverRecord.lateHours,
                                earlyDepartureDeductions: serverRecord.earlyDepartureDeductions,
                                status: serverRecord.status,
                                serverId: serverRecord._id || serverRecord.id,
                                syncStatus: 'synced'
                            });
                            await window.db.update('attendance', existingLocal);
                        } else {
                            // Add new record from server
                            const newRecord = {
                                ...serverRecord,
                                checkInTime: serverRecord.checkInTime || serverRecord.checkIn,
                                checkOutTime: serverRecord.checkOutTime || serverRecord.checkOut,
                                serverId: serverRecord._id || serverRecord.id,
                                syncStatus: 'synced'
                            };
                            await window.db.add('attendance', newRecord);
                        }
                    }
                    
                    console.log('✅ Attendance records synchronized with server');
                }
            } else {
                console.error('❌ Failed to download attendance from server:', response.status);
            }
        } catch (error) {
            console.error('❌ Error downloading attendance from server:', error);
        }
    }

    async processSyncQueue() {
        try {
            const queue = await window.db.getAll('syncQueue');
            
            for (const item of queue) {
                if (item.status === 'pending') {
                    try {
                        const response = await this.sendToServer(item.url, item.data);
                        
                        if (response.ok) {
                            await window.db.delete('syncQueue', item.id);
                        } else {
                            item.retryCount = (item.retryCount || 0) + 1;
                            item.lastError = response.statusText;
                            await window.db.update('syncQueue', item);
                        }
                    } catch (error) {
                        item.retryCount = (item.retryCount || 0) + 1;
                        item.lastError = error.message;
                        await window.db.update('syncQueue', item);
                    }
                }
            }
        } catch (error) {
            console.error('Sync queue processing failed:', error);
        }
    }

    async addToQueue(action, entity, data, localId) {
        const queueItem = {
            timestamp: new Date().toISOString(),
            type: `${entity}_${action}`,
            action: action,
            entity: entity,
            data: data,
            localId: localId,
            status: 'pending',
            retryCount: 0,
            url: `${this.apiUrl}/api/${entity}/${action}`
        };

        await window.db.add('syncQueue', queueItem);
        
        // Try to sync immediately if online
        if (this.isOnline) {
            this.syncAll();
        }
    }

    async sendToServer(endpoint, data) {
        if (!this.apiUrl) {
            // Simulate successful response when no API URL is set
            return { ok: true };
        }

        try {
            // Use API_CONFIG for authentication if available
            let headers = {
                'Content-Type': 'application/json',
            };
            
            if (window.API_CONFIG) {
                // Get auth headers from API_CONFIG
                headers = {
                    ...headers,
                    ...window.API_CONFIG.getAuthHeader()
                };
                
                const token = window.API_CONFIG.getToken();
                if (!token) {
                    console.warn('⚠️ No authentication token found! Please login first.');
                    // Try to get user to login
                    if (window.authSystem && !window.authSystem.isLoggedIn) {
                        window.authSystem.showLoginModal();
                        return { ok: false, error: 'Authentication required' };
                    }
                }
            } else {
                // Fallback to manual token retrieval
                const token = localStorage.getItem('authToken') || 
                           localStorage.getItem('userToken') || 
                           sessionStorage.getItem('authToken');
                
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                } else {
                    console.warn('⚠️ No authentication token found!');
                    return { ok: false, error: 'Authentication required' };
                }
            }
            
            // Use API_CONFIG if available for better error handling and retries
            if (window.API_CONFIG) {
                try {
                    const result = await window.API_CONFIG.request(endpoint, {
                        method: 'POST',
                        body: data
                    });
                    
                    console.log(`📡 Sync successful`);
                    return { ok: true, data: result };
                } catch (error) {
                    console.error('❌ Sync failed:', error.message);
                    return { ok: false, error: error.message };
                }
            } else {
                // Fallback to direct fetch
                const url = endpoint.startsWith('http') 
                    ? endpoint 
                    : `${this.apiUrl}${endpoint}`;
                
                if (window.logger) {
                    window.logger.debug('Syncing data to backend', {
                        category: 'SYNC',
                        url,
                        dataSize: JSON.stringify(data).length
                    });
                }

                const response = await this.fetchWithTimeout(url, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(data)
                });
                
                console.log(`📡 Sync response: ${response.status} ${response.statusText}`);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('❌ Sync failed:', response.status, errorText);
                }

                return response;
            }
        } catch (error) {
            console.error('❌ Server request failed:', error);
            throw error;
        }
    }

    // Optional: expose a method name expected by other modules
    async syncPendingChanges() {
        return this.syncAll();
    }

    // DISABLED: Employee data now managed via MongoDB API directly
    async fixEmployeeData() {
        console.log('🚫 [SYNC] Employee data fix disabled - using direct MongoDB API');
        console.log('ℹ️  Employees are managed via employees.js → MongoDB API');
        return 0;
        
        // Legacy IndexedDB employee fix code disabled (remove after testing)
        /*
        try {
            console.log('🔧 Checking and fixing employee data...');
            
            const employees = await window.db.getAll('employees');
            let fixed = 0;
            
            for (const employee of employees) {
                let needsUpdate = false;
                
                // Ensure required fields exist
                if (!employee.id && !employee._id) {
                    employee.id = `emp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    needsUpdate = true;
                }
                
                if (!employee.syncStatus) {
                    employee.syncStatus = 'pending';
                    needsUpdate = true;
                }
                
                if (!employee.name) {
                    employee.name = 'Employee';
                    needsUpdate = true;
                }
                
                if (!employee.position) {
                    employee.position = 'Staff';
                    needsUpdate = true;
                }
                
                // Ensure numeric fields are numbers
                if (typeof employee.totalSales !== 'number') {
                    employee.totalSales = parseFloat(employee.totalSales) || 0;
                    needsUpdate = true;
                }
                
                if (typeof employee.commission !== 'number') {
                    employee.commission = parseFloat(employee.commission) || 0;
                    needsUpdate = true;
                }
                
                if (needsUpdate) {
                    await window.db.update('employees', employee);
                    fixed++;
                    console.log(`🔧 Fixed employee data for: ${employee.name}`);
                }
            }
            
            console.log(`🔧 Fixed ${fixed} employee records`);
            return fixed;
            
        } catch (error) {
            console.error('❌ Failed to fix employee data:', error);
            return 0;
        }
        */
    }

    showSyncIndicator(show) {
        const indicator = document.querySelector('#syncIndicator i');
        if (indicator) {
            indicator.style.display = show ? 'inline-block' : 'none';
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    onSyncComplete(data) {
        console.log('Sync completed:', data);
        // Refresh current page data if needed
        if (window.refreshCurrentPage) {
            window.refreshCurrentPage();
        }
    }

    // Method to manually trigger sync
    async manualSync() {
        if (this.syncInProgress) {
            this.showNotification('Sync already in progress', 'info');
            return;
        }

        this.showNotification('Starting manual sync...', 'info');
        
        // Fix employee data before syncing
        const fixed = await this.fixEmployeeData();
        if (fixed > 0) {
            this.showNotification(`Fixed ${fixed} employee records`, 'success');
        }
        
        await this.syncAll();
    }

    // API URL is now hardcoded for production deployment

    /**
     * Update local employee records and transactions with backend employee IDs
     * This fixes the critical issue where PWA transactions reference old employee IDs
     * @param {Array} employeeIdMapping - Array of ID mappings from backend
     */
    async updateLocalEmployeeIds(employeeIdMapping) {
        if (!employeeIdMapping || employeeIdMapping.length === 0) {
            console.log('🔄 [EMPLOYEE-ID-MAPPING] No ID mappings to process');
            return;
        }

        try {
            console.log(`🔄 [EMPLOYEE-ID-MAPPING] Processing ${employeeIdMapping.length} employee ID mappings...`);
            
            // Step 1: Update employee records with backend IDs
            for (const mapping of employeeIdMapping) {
                const { oldId, newId, localId, name, backendEmployeeId } = mapping;
                
                console.log(`🔄 [EMPLOYEE-ID-MAPPING] Updating employee: ${name}`);
                console.log(`   Old ID: ${oldId} -> Backend ID: ${newId}`);
                
                // Find employee by old ID (this could be localId or current id)
                let employee = null;
                try {
                    // Try to find by current id first
                    employee = await window.db.get('employees', oldId);
                    
                    // If not found, try to find by localId
                    if (!employee && localId) {
                        const employees = await window.db.getAll('employees');
                        employee = employees.find(emp => emp.localId === localId || emp.id === oldId);
                    }
                } catch (error) {
                    console.warn(`⚠️ [EMPLOYEE-ID-MAPPING] Could not find employee with ID ${oldId}:`, error);
                    continue;
                }
                
                if (employee) {
                    // Update employee with backend ID information
                    employee.backendEmployeeId = backendEmployeeId || newId;
                    employee.backendId = newId;
                    employee.syncStatus = 'synced';
                    employee.lastSyncDate = new Date().toISOString();
                    
                    // Preserve localId if it exists
                    if (!employee.localId && localId) {
                        employee.localId = localId;
                    }
                    
                    await window.db.update('employees', employee.id, employee);
                    console.log(`✅ [EMPLOYEE-ID-MAPPING] Updated employee ${name} with backend ID: ${newId}`);
                } else {
                    console.warn(`⚠️ [EMPLOYEE-ID-MAPPING] Could not find employee to update: ${name} (${oldId})`);
                }
            }
            
            // Step 2: Update transaction references to use backend employee IDs
            console.log('🔄 [EMPLOYEE-ID-MAPPING] Updating transaction employee references...');
            const transactions = await window.db.getAll('transactions');
            let updatedTransactions = 0;
            
            for (const transaction of transactions) {
                let needsUpdate = false;
                
                // Check if transaction has employee reference that needs updating
                if (transaction.employee && transaction.employee.id) {
                    const mapping = employeeIdMapping.find(m => 
                        m.oldId === transaction.employee.id || 
                        m.localId === transaction.employee.id
                    );
                    
                    if (mapping) {
                        console.log(`🔄 [EMPLOYEE-ID-MAPPING] Updating transaction ${transaction.id} employee reference`);
                        console.log(`   Employee ID: ${transaction.employee.id} -> ${mapping.newId}`);
                        
                        transaction.employee.id = mapping.newId;
                        transaction.employee.backendId = mapping.newId;
                        transaction.syncStatus = 'pending'; // Mark for re-sync with correct employee ID
                        needsUpdate = true;
                    }
                }
                
                // Also check employeeId field (alternative structure)
                if (transaction.employeeId) {
                    const mapping = employeeIdMapping.find(m => 
                        m.oldId === transaction.employeeId || 
                        m.localId === transaction.employeeId
                    );
                    
                    if (mapping) {
                        console.log(`🔄 [EMPLOYEE-ID-MAPPING] Updating transaction ${transaction.id} employeeId field`);
                        console.log(`   Employee ID: ${transaction.employeeId} -> ${mapping.newId}`);
                        
                        transaction.employeeId = mapping.newId;
                        transaction.syncStatus = 'pending'; // Mark for re-sync
                        needsUpdate = true;
                    }
                }
                
                if (needsUpdate) {
                    await window.db.update('transactions', transaction.id, transaction);
                    updatedTransactions++;
                }
            }
            
            console.log(`✅ [EMPLOYEE-ID-MAPPING] Updated ${updatedTransactions} transaction employee references`);
            
            // Step 3: Create a mapping cache for future use
            const idMappingCache = {};
            for (const mapping of employeeIdMapping) {
                idMappingCache[mapping.oldId] = mapping.newId;
                if (mapping.localId && mapping.localId !== mapping.oldId) {
                    idMappingCache[mapping.localId] = mapping.newId;
                }
            }
            
            // Store mapping cache in localStorage for future reference
            localStorage.setItem('employeeIdMapping', JSON.stringify(idMappingCache));
            console.log('💾 [EMPLOYEE-ID-MAPPING] Cached employee ID mappings for future use');
            
            console.log(`✅ [EMPLOYEE-ID-MAPPING] Successfully completed employee ID mapping update`);
            console.log(`   - Updated ${employeeIdMapping.length} employee records`);
            console.log(`   - Updated ${updatedTransactions} transaction references`);
            
        } catch (error) {
            console.error('❌ [EMPLOYEE-ID-MAPPING] Failed to update employee IDs:', error);
            throw error;
        }
    }

    /**
     * Get the correct backend employee ID for a given employee
     * Uses cached mappings to prevent future ID mismatch issues
     * @param {string} employeeId - Local employee ID
     * @returns {string} Backend employee ID or original ID if no mapping found
     */
    getBackendEmployeeId(employeeId) {
        if (!employeeId) return null;

        try {
            // Check cached mapping first
            const cachedMappings = localStorage.getItem('employeeIdMapping');
            if (cachedMappings) {
                const mappings = JSON.parse(cachedMappings);
                if (mappings[employeeId]) {
                    console.log(`🔄 [EMPLOYEE-ID-MAPPING] Using cached mapping: ${employeeId} -> ${mappings[employeeId]}`);
                    return mappings[employeeId];
                }
            }

            // Return original ID if no mapping found
            return employeeId;
        } catch (error) {
            console.warn('⚠️ [EMPLOYEE-ID-MAPPING] Error checking cached employee ID mappings:', error);
            return employeeId;
        }
    }

    /**
     * Ensure transaction has correct employee ID before saving/syncing
     * Call this before saving any transaction with employee data
     * @param {Object} transaction - Transaction object to validate
     * @returns {Object} Transaction with corrected employee IDs
     */
    ensureCorrectEmployeeId(transaction) {
        if (!transaction) return transaction;

        let modified = false;

        // Fix employee.id reference
        if (transaction.employee && transaction.employee.id) {
            const correctId = this.getBackendEmployeeId(transaction.employee.id);
            if (correctId !== transaction.employee.id) {
                console.log(`🔄 [EMPLOYEE-ID-MAPPING] Correcting transaction employee ID: ${transaction.employee.id} -> ${correctId}`);
                transaction.employee.id = correctId;
                transaction.employee.backendId = correctId;
                modified = true;
            }
        }

        // Fix employeeId field
        if (transaction.employeeId) {
            const correctId = this.getBackendEmployeeId(transaction.employeeId);
            if (correctId !== transaction.employeeId) {
                console.log(`🔄 [EMPLOYEE-ID-MAPPING] Correcting transaction employeeId: ${transaction.employeeId} -> ${correctId}`);
                transaction.employeeId = correctId;
                modified = true;
            }
        }

        if (modified) {
            console.log(`✅ [EMPLOYEE-ID-MAPPING] Transaction ${transaction.id} employee references corrected`);
        }

        return transaction;
    }

    // Get sync statistics
    async getSyncStats() {
        const stats = {
            products: {
                pending: (await window.db.getByIndex('products', 'syncStatus', 'pending')).length,
                synced: (await window.db.getByIndex('products', 'syncStatus', 'synced')).length
            },
            inventory: {
                pending: (await window.db.getByIndex('inventory', 'syncStatus', 'pending')).length,
                synced: (await window.db.getByIndex('inventory', 'syncStatus', 'synced')).length
            },
            employees: {
                pending: (await window.db.getByIndex('employees', 'syncStatus', 'pending')).length,
                synced: (await window.db.getByIndex('employees', 'syncStatus', 'synced')).length
            },
            transactions: {
                pending: (await window.db.getByIndex('transactions', 'syncStatus', 'pending')).length,
                synced: (await window.db.getByIndex('transactions', 'syncStatus', 'synced')).length
            },
            queueSize: (await window.db.getAll('syncQueue')).length
        };

        return stats;
    }
}

// Create global sync manager instance with delayed initialization
function initializeSyncManager() {
    if (!window.syncManager) {
        console.log('🔧 [SYNC] Initializing SyncManager...');
        window.syncManager = new SyncManager();
        console.log('✅ [SYNC] SyncManager initialized');
    }
}

// Make initialization function globally accessible
window.initializeSyncManager = initializeSyncManager;

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initializeSyncManager, 2000); // Delay sync manager initialization
});

// Fallback initialization if DOM is already loaded
if (document.readyState === 'loading') {
    // DOM is still loading, event will fire
} else {
    // DOM already loaded, initialize immediately
    setTimeout(initializeSyncManager, 1000);
}
