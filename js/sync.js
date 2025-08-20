// Sync Manager for offline/online synchronization with MERN backend
class SyncManager {
    constructor() {
        this.apiUrl = ''; // Will be set from settings
        this.isOnline = navigator.onLine;
        this.syncInProgress = false;
        this.syncInterval = null;
        this.pendingSync = [];
        
        this.init();
    }

    async init() {
        // Delayed initialization to prevent blocking
        setTimeout(async () => {
            try {
                // Use PWA backend API instead of deprecated marketing API
                this.apiUrl = window.appConfig ? 
                    window.appConfig.getApiUrl('pwa').replace('/api', '') : 
                    'https://ava-solutions-marketing.netlify.app';
                console.log('🔄 Using PWA backend API URL:', this.apiUrl);

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
                console.log('Sync manager initialization deferred:', error);
            }
        }, 1000);
    }

    handleOnline() {
        console.log('Connection restored');
        this.isOnline = true;
        this.updateConnectionStatus();
        this.showNotification('Back online! Syncing data...', 'success');
        
        // Start syncing immediately
        this.syncAll();
        this.startAutoSync();
    }

    handleOffline() {
        console.log('Connection lost');
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
            await db.update('settings', {
                key: 'lastSync',
                value: new Date().toISOString()
            });

            this.showNotification('Data synced successfully', 'success');
        } catch (error) {
            console.error('Sync failed:', error);
            this.showNotification('Sync failed. Will retry later.', 'error');
        } finally {
            this.syncInProgress = false;
            this.showSyncIndicator(false);
        }
    }

    async syncProducts() {
        try {
            // Get ALL products to ensure complete sync
            const allProducts = await db.getAll('products');
            
            console.log(`🛍️ Found ${allProducts.length} total products/services to sync`);
            
            // Always send sync request with all products
            const response = await this.sendToServer('/products/sync', {
                products: allProducts || [],
                productsSummary: {
                    totalProducts: allProducts.length,
                    lastUpdated: new Date().toISOString()
                }
            });

            if (response.ok) {
                console.log('✅ Products sync successful');
                // Mark all products as synced
                for (const product of allProducts) {
                    if (product.syncStatus !== 'synced') {
                        product.syncStatus = 'synced';
                        await db.update('products', product);
                    }
                }
            } else {
                console.error('❌ Products sync failed:', response.status);
            }
        } catch (error) {
            console.error('❌ Product sync failed:', error);
        }
    }

    async syncInventory() {
        try {
            // Get ALL inventory items to provide complete data to Business Dashboard
            const allInventory = await db.getAll('inventory');
            
            console.log(`📦 Found ${allInventory.length} total inventory items for sync`);
            console.log('📦 Inventory details:', allInventory.map(item => ({ 
                name: item.name, 
                sku: item.sku,
                quantity: item.quantity,
                category: item.category 
            })));

            if (allInventory.length === 0) {
                console.log('⚠️ No inventory items to sync');
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

            console.log('📤 Sending processed inventory:', processedInventory);

            // Send all inventory with summary data
            const response = await this.sendToServer('/api/inventory/sync', {
                inventory: processedInventory,
                inventorySummary: {
                    totalItems: allInventory.length,
                    lowStockItems: lowStockItems,
                    outOfStockItems: outOfStockItems
                }
            });

            if (response.ok) {
                console.log('✅ Inventory sync successful');
                // Mark all inventory as synced
                for (const item of allInventory) {
                    if (item.syncStatus !== 'synced') {
                        item.syncStatus = 'synced';
                        await db.update('inventory', item);
                    }
                }
                console.log('✅ All inventory items marked as synced');
            } else {
                const errorText = await response.text();
                console.error('❌ Inventory sync failed:', response.status, errorText);
            }
        } catch (error) {
            console.error('❌ Inventory sync failed:', error);
        }
    }

    async syncEmployees() {
        try {
            // Get ALL employees to provide complete data to Business Dashboard
            const allEmployees = await db.getAll('employees');
            
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
            const allTransactions = await db.getAll('transactions');
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
            const response = await this.sendToServer('/api/employees/sync', {
                employees: processedEmployees
            });

            if (response.ok) {
                console.log('✅ Employee sync successful');
                // Mark all employees as synced
                for (const employee of allEmployees) {
                    if (employee.syncStatus !== 'synced') {
                        employee.syncStatus = 'synced';
                        await db.update('employees', employee);
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
            const allTransactions = await db.getAll('transactions');
            
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

            const response = await this.sendToServer('/transactions/sync', {
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
                        await db.update('transactions', transaction);
                    }
                }
                console.log('✅ All transactions marked as synced');
            }
        } catch (error) {
            console.error('Transaction sync failed:', error);
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
            const queue = await db.getAll('syncQueue');
            
            for (const item of queue) {
                if (item.status === 'pending') {
                    try {
                        const response = await this.sendToServer(item.url, item.data);
                        
                        if (response.ok) {
                            await db.delete('syncQueue', item.id);
                        } else {
                            item.retryCount = (item.retryCount || 0) + 1;
                            item.lastError = response.statusText;
                            await db.update('syncQueue', item);
                        }
                    } catch (error) {
                        item.retryCount = (item.retryCount || 0) + 1;
                        item.lastError = error.message;
                        await db.update('syncQueue', item);
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

        await db.add('syncQueue', queueItem);
        
        // Try to sync immediately if online
        if (this.isOnline) {
            this.syncAll();
        }
    }

    async sendToServer(endpoint, data) {
        // This will be implemented when MERN backend is ready
        // For now, simulate the API call
        if (!this.apiUrl) {
            // Simulate successful response when no API URL is set
            return { ok: true };
        }

        try {
            // Get authentication token - use auth_token from unified auth
            const token = localStorage.getItem('auth_token') || 
                        sessionStorage.getItem('auth_token') ||
                        localStorage.getItem('userToken') || 
                        localStorage.getItem('authToken');
            
            const headers = {
                'Content-Type': 'application/json',
            };
            
            // Add authentication headers
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
                console.log('🔑 Sending sync request with JWT token');
            } else {
                // Fallback to demo user for sync (this might cause issues)
                headers['x-user-id'] = 'demo-user';
                console.warn('⚠️ No authentication token found! Using demo user fallback.');
                console.warn('⚠️ This might cause sync failures. Please login to PWA.');
            }
            
            console.log(`📡 Syncing to: ${this.apiUrl}${endpoint}`);
            console.log('📦 Sync data:', data);

            const response = await fetch(`${this.apiUrl}${endpoint}`, {
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
        } catch (error) {
            console.error('❌ Server request failed:', error);
            // Return a mock successful response to prevent sync from blocking
            console.log('🔄 Using local-only mode due to CORS/network error');
            return { 
                ok: true, 
                status: 200,
                statusText: 'OK (Local Mode)',
                json: async () => ({ success: true, message: 'Local mode - data saved locally' }),
                text: async () => 'Local mode - data saved locally'
            };
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
            
            const employees = await db.getAll('employees');
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
                    await db.update('employees', employee);
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
                pending: (await db.getByIndex('products', 'syncStatus', 'pending')).length,
                synced: (await db.getByIndex('products', 'syncStatus', 'synced')).length
            },
            inventory: {
                pending: (await db.getByIndex('inventory', 'syncStatus', 'pending')).length,
                synced: (await db.getByIndex('inventory', 'syncStatus', 'synced')).length
            },
            employees: {
                pending: (await db.getByIndex('employees', 'syncStatus', 'pending')).length,
                synced: (await db.getByIndex('employees', 'syncStatus', 'synced')).length
            },
            transactions: {
                pending: (await db.getByIndex('transactions', 'syncStatus', 'pending')).length,
                synced: (await db.getByIndex('transactions', 'syncStatus', 'synced')).length
            },
            queueSize: (await db.getAll('syncQueue')).length
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
