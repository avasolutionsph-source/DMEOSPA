// Sync Manager for offline/online synchronization with unified backend
import { logDebug, logInfo, logError, logWarn, safeAsyncOperation } from './utils/logger-helper.js';

class SyncManager {
    constructor() {
        this.apiUrl = ''; // Will be set from API_CONFIG
        this.isOnline = navigator.onLine;
        this.syncInProgress = false;
        this.syncInterval = null;
        this.pendingSync = [];
        this.socket = null; // WebSocket connection
        
        this.init();
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
                    this.apiUrl = 'https://ava-pwa-backend.onrender.com';
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

                // Start sync interval if online (with delay)
                if (this.isOnline && this.apiUrl) {
                    setTimeout(() => this.startAutoSync(), 5000);
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
        
        // Start syncing immediately
        this.syncAll();
        this.startAutoSync();
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

    startAutoSync() {
        // Sync every 30 seconds when online
        this.syncInterval = setInterval(() => {
            if (this.isOnline && !this.syncInProgress) {
                this.syncAll();
            }
        }, 30000);
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
            // Sync each data type
            await this.syncProducts();
            await this.syncInventory();
            await this.syncEmployees();
            await this.syncTransactions();
            await this.syncChatbotHistory(); // Sync enhanced chatbot data
            
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
                if (window.logger) {
                    window.logger.warn('No inventory items to sync', {
                        category: 'SYNC',
                        operation: 'inventory_sync_empty'
                    });
                } else {
                    console.log('⚠️ No inventory items to sync');
                }
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

            // Ensure all inventory items have proper data structure
            const processedInventory = allInventory.map(item => ({
                id: item.id || item._id || `inv-${Date.now()}`,
                name: item.name || 'Unknown Item',
                sku: item.sku || '',
                category: item.category || 'Uncategorized',
                quantity: item.quantity || item.currentStock || 0,  // Handle legacy currentStock field
                unit: item.unit || 'units',
                minStock: item.minStock || 5,
                price: item.price || item.unitPrice || 0,
                cost: item.cost || 0,
                supplier: item.supplier || '',
                description: item.description || item.notes || '',
                lastRestocked: item.lastRestocked || null
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

    async syncEmployees() {
        try {
            // Get ALL employees to provide complete data to Business Dashboard
            const allEmployees = await window.db.getAll('employees');
            
            console.log(`👥 Found ${allEmployees.length} total employees for sync`);
            console.log('👥 Employee details:', allEmployees.map(emp => ({ 
                name: emp.name, 
                position: emp.position, 
                syncStatus: emp.syncStatus,
                totalSales: emp.totalSales 
            })));

            if (allEmployees.length === 0) {
                console.log('⚠️ No employees to sync - this might be why Business Dashboard shows no employees');
                return;
            }

            // Get all transactions to calculate employee sales metrics
            const allTransactions = await window.db.getAll('transactions');
            console.log(`💰 Found ${allTransactions.length} transactions for employee metrics calculation`);

            // Calculate sales metrics for each employee
            const employeeMetrics = {};
            for (const transaction of allTransactions) {
                if (transaction.employeeId) {
                    // Normalize employeeId to string for consistent lookup
                    const empId = String(transaction.employeeId);
                    if (!employeeMetrics[empId]) {
                        employeeMetrics[empId] = {
                            totalSales: 0,
                            transactions: 0,
                            totalCommission: 0
                        };
                    }
                    employeeMetrics[empId].totalSales += transaction.total || 0;
                    employeeMetrics[empId].transactions += 1;
                }
            }

            // Ensure all employees have proper data structure with calculated metrics
            const processedEmployees = allEmployees.map(emp => {
                // Normalize employee ID to string for consistent lookup
                const empIdStr = String(emp.id);
                const metrics = employeeMetrics[empIdStr] || {};
                const totalSales = metrics.totalSales || 0;
                const transactions = metrics.transactions || 0;
                const avgSale = transactions > 0 ? totalSales / transactions : 0;
                const commissionRate = emp.commissionRate || 0;
                const totalCommission = totalSales * (commissionRate / 100);

                return {
                    id: emp.id || emp._id || `emp-${Date.now()}`,
                    name: emp.name || 'Unknown Employee',
                    position: emp.position || 'No Position',
                    email: emp.email || '',
                    phone: emp.phone || '',
                    hiredDate: emp.hiredDate || new Date().toISOString(),
                    commission: commissionRate,
                    totalSales: totalSales,
                    totalCommission: totalCommission,
                    transactions: transactions,
                    avgSale: avgSale,
                    syncStatus: emp.syncStatus || 'pending'
                };
            });

            console.log('📤 Sending processed employees:', processedEmployees);

            // Send all employees with their performance data
            const response = await this.sendToServer(window.API_CONFIG ? window.API_CONFIG.ENDPOINTS.SYNC.EMPLOYEES : '/api/sync/employees', {
                employees: processedEmployees
            });

            if (response.ok) {
                console.log('✅ Employee sync successful');
                // Mark all employees as synced
                for (const employee of allEmployees) {
                    if (employee.syncStatus !== 'synced') {
                        employee.syncStatus = 'synced';
                        await window.db.update('employees', employee);
                    }
                }
                console.log('✅ All employees marked as synced');
            } else {
                const errorText = await response.text();
                console.error('❌ Employee sync failed:', response.status, errorText);
            }
        } catch (error) {
            console.error('❌ Employee sync failed:', error);
        }
    }

    async syncTransactions() {
        try {
            // Get ALL transactions to calculate complete business summary
            const allTransactions = await window.db.getAll('transactions');
            
            console.log(`💰 Found ${allTransactions.length} total transactions for sync`);

            // Calculate complete business summary with time breakdowns
            let totalSales = 0;
            let totalTransactions = allTransactions.length;
            
            // Time-based calculations
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const thisYear = new Date(now.getFullYear(), 0, 1);
            
            let todaySales = 0;
            let monthSales = 0;
            let yearSales = 0;
            let todayTransactions = 0;
            let monthTransactions = 0;
            let yearTransactions = 0;
            
            const summaries = allTransactions.map(t => {
                const transactionTotal = t.total || 0;
                totalSales += transactionTotal;
                
                // Parse transaction date
                const transactionDate = new Date(t.date);
                
                // Today's sales
                if (transactionDate >= today) {
                    todaySales += transactionTotal;
                    todayTransactions++;
                }
                
                // This month's sales
                if (transactionDate >= thisMonth) {
                    monthSales += transactionTotal;
                    monthTransactions++;
                }
                
                // This year's sales
                if (transactionDate >= thisYear) {
                    yearSales += transactionTotal;
                    yearTransactions++;
                }
                
                return {
                    id: t.id,
                    date: t.date,
                    total: t.total,
                    employeeId: t.employeeId,
                    paymentMethod: t.paymentMethod,
                    itemCount: t.items ? t.items.length : 0,
                    // Don't send full item details to save storage
                };
            });

            console.log(`📊 Syncing detailed business summary:`);
            console.log(`   💰 Total: ₱${totalSales} (${totalTransactions} transactions)`);
            console.log(`   📅 Today: ₱${todaySales} (${todayTransactions} transactions)`);
            console.log(`   📆 Month: ₱${monthSales} (${monthTransactions} transactions)`);
            console.log(`   🗓️ Year: ₱${yearSales} (${yearTransactions} transactions)`);

            const response = await this.sendToServer(window.API_CONFIG ? window.API_CONFIG.ENDPOINTS.SYNC.TRANSACTIONS : '/api/sync/transactions', {
                transactions: summaries,
                businessSummary: {
                    totalSales: totalSales,
                    totalTransactions: totalTransactions,
                    todaySales: todaySales,
                    todayTransactions: todayTransactions,
                    monthSales: monthSales,
                    monthTransactions: monthTransactions,
                    yearSales: yearSales,
                    yearTransactions: yearTransactions,
                    lastUpdated: new Date().toISOString()
                }
            });

            if (response.ok) {
                // Mark all transactions as synced
                for (const transaction of allTransactions) {
                    if (transaction.syncStatus !== 'synced') {
                        transaction.syncStatus = 'synced';
                        await window.db.update('transactions', transaction);
                    }
                }
                console.log('✅ All transactions marked as synced');
            }
        } catch (error) {
            if (window.logger) {
                window.logger.error('Transaction sync failed', { 
                    category: 'SYNC', 
                    operation: 'sync_transactions',
                    error: error
                });
            } else {
                console.error('Transaction sync failed:', error);
            }
        }
    }

    async syncChatbotHistory() {
        try {
            // Sync chatbot conversation context and metrics
            const chatHistory = localStorage.getItem('chatHistory');
            const chatContext = localStorage.getItem('chatContext');
            
            if (!chatHistory && !chatContext) return;

                            const chatData = {
                    history: chatHistory ? JSON.parse(chatHistory) : [],
                    context: chatContext ? JSON.parse(chatContext) : {},
                    timestamp: new Date().toISOString(),
                    version: 'v22-honest-features'
                };

            // Only sync if there's meaningful data
            if (chatData.history.length > 0) {
                const response = await this.sendToServer('/api/chatbot/sync', chatData);
                
                if (response.ok) {
                    console.log('Chatbot history synced successfully');
                }
            }
        } catch (error) {
            console.error('Chatbot sync failed:', error);
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

                const response = await fetch(url, {
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

    // Auto-fix employee data to ensure proper sync
    async fixEmployeeData() {
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
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.syncManager = new SyncManager();
    }, 2000); // Delay sync manager initialization
});
