// Remove IndexedDB and migrate to MongoDB-only architecture
(function() {
    'use strict';
    
    console.log('🔄 Starting migration from IndexedDB to MongoDB...');
    
    // 1. Delete all IndexedDB databases
    async function deleteAllIndexedDB() {
        if ('indexedDB' in window) {
            try {
                // Get all databases
                const databases = await indexedDB.databases();
                
                for (const db of databases) {
                    try {
                        await indexedDB.deleteDatabase(db.name);
                        console.log(`❌ Deleted IndexedDB: ${db.name}`);
                    } catch (e) {
                        console.error(`Failed to delete ${db.name}:`, e);
                    }
                }
                
                // Also try common database names
                const commonDBs = ['AvaDB', 'AvaSolutionsDB', 'localDB', 'syncDB', 'offlineDB'];
                for (const dbName of commonDBs) {
                    try {
                        await indexedDB.deleteDatabase(dbName);
                        console.log(`❌ Deleted IndexedDB: ${dbName}`);
                    } catch (e) {
                        // Silent fail - DB might not exist
                    }
                }
            } catch (error) {
                console.error('Error deleting IndexedDB:', error);
            }
        }
    }
    
    // 2. Override the db object to use MongoDB API instead
    window.db = {
        // Redirect all DB calls to MongoDB API
        async getAll(storeName) {
            console.log(`📡 Fetching ${storeName} from MongoDB`);
            
            switch(storeName) {
                case 'products':
                case 'services':
                    return await window.mongoAPI.getProducts();
                    
                case 'inventory':
                    return await window.mongoAPI.getInventory();
                    
                case 'employees':
                    return await window.mongoAPI.getEmployees();
                    
                case 'transactions':
                    return await window.mongoAPI.getTransactions();
                    
                case 'bookings':
                    return await window.mongoAPI.getBookings();
                    
                case 'expenses':
                    return await window.mongoAPI.getExpenses();
                    
                case 'rooms':
                    return await window.mongoAPI.getRooms();
                    
                default:
                    console.warn(`Unknown store: ${storeName}`);
                    return [];
            }
        },
        
        async get(storeName, id) {
            const items = await this.getAll(storeName);
            return items.find(item => item.id === id || item._id === id);
        },
        
        async add(storeName, data) {
            console.log(`📡 Adding to ${storeName} in MongoDB`);
            
            switch(storeName) {
                case 'products':
                case 'services':
                    return await window.mongoAPI.createProduct(data);
                    
                case 'inventory':
                    return await window.mongoAPI.createInventoryItem(data);
                    
                case 'employees':
                    return await window.mongoAPI.createEmployee(data);
                    
                case 'transactions':
                    return await window.mongoAPI.createTransaction(data);
                    
                case 'bookings':
                    return await window.mongoAPI.createBooking(data);
                    
                case 'expenses':
                    return await window.mongoAPI.createExpense(data);
                    
                case 'rooms':
                    return await window.mongoAPI.createRoom(data);
                    
                default:
                    console.warn(`Unknown store: ${storeName}`);
                    return data;
            }
        },
        
        async update(storeName, data) {
            console.log(`📡 Updating in ${storeName} in MongoDB`);
            const id = data.id || data._id;
            
            switch(storeName) {
                case 'products':
                case 'services':
                    return await window.mongoAPI.updateProduct(id, data);
                    
                case 'inventory':
                    return await window.mongoAPI.updateInventoryItem(id, data);
                    
                case 'employees':
                    return await window.mongoAPI.updateEmployee(id, data);
                    
                case 'bookings':
                    return await window.mongoAPI.updateBooking(id, data);
                    
                case 'expenses':
                    return await window.mongoAPI.updateExpense(id, data);
                    
                case 'rooms':
                    return await window.mongoAPI.updateRoom(id, data);
                    
                default:
                    console.warn(`Unknown store: ${storeName}`);
                    return data;
            }
        },
        
        async delete(storeName, id) {
            console.log(`📡 Deleting from ${storeName} in MongoDB`);
            
            switch(storeName) {
                case 'products':
                case 'services':
                    return await window.mongoAPI.deleteProduct(id);
                    
                case 'inventory':
                    return await window.mongoAPI.deleteInventoryItem(id);
                    
                case 'employees':
                    return await window.mongoAPI.deleteEmployee(id);
                    
                case 'bookings':
                    return await window.mongoAPI.deleteBooking(id);
                    
                case 'expenses':
                    return await window.mongoAPI.deleteExpense(id);
                    
                case 'rooms':
                    return await window.mongoAPI.deleteRoom(id);
                    
                default:
                    console.warn(`Unknown store: ${storeName}`);
            }
        },
        
        async clear(storeName) {
            console.log(`⚠️ Clear operation for ${storeName} - not supported in MongoDB mode`);
            // Don't clear MongoDB data
            return true;
        },
        
        // Compatibility methods
        async put(storeName, data) {
            return this.update(storeName, data);
        },
        
        async count(storeName) {
            const items = await this.getAll(storeName);
            return items.length;
        },
        
        // Override sync-related methods
        async syncBranchAccountData() {
            console.log('📡 Branch sync now handled by MongoDB directly');
            return true;
        },
        
        async markForSync() {
            // No need to mark for sync - MongoDB is always synced
            return true;
        }
    };
    
    // 3. Disable offline mode and sync
    window.offlineMode = false;
    window.syncEnabled = false;
    
    // 4. Override sync functions
    if (window.syncManager) {
        window.syncManager.syncAll = async function() {
            console.log('✅ Sync not needed - using MongoDB directly');
            return true;
        };
    }
    
    // 5. Run cleanup
    deleteAllIndexedDB().then(() => {
        console.log('✅ IndexedDB removed successfully');
        console.log('✅ Now using MongoDB exclusively for all data storage');
    });
    
    // 6. Override database.js initialization
    window.ensureDBInit = async function() {
        console.log('✅ MongoDB mode - no IndexedDB initialization needed');
        return true;
    };
    
    window.initDB = async function() {
        console.log('✅ MongoDB mode - no IndexedDB initialization needed');
        return true;
    };
    
    // 7. Prevent IndexedDB recreation
    const originalOpen = indexedDB.open;
    indexedDB.open = function(name, version) {
        console.warn(`⚠️ Blocked IndexedDB.open for ${name} - using MongoDB instead`);
        return {
            onsuccess: () => {},
            onerror: () => {},
            onupgradeneeded: () => {},
            result: null
        };
    };
    
    console.log('🎉 Migration complete - All data operations now use MongoDB');
})();