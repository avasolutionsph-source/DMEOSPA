// COMPLETE REMOVAL OF INDEXEDDB AND OFFLINE FUNCTIONALITY
// This script converts everything to online-only MongoDB storage
(function() {
    'use strict';
    
    console.log('🗑️ REMOVING ALL OFFLINE FUNCTIONALITY...');
    
    // Step 1: Delete all IndexedDB databases
    async function deleteAllIndexedDB() {
        console.log('🗑️ Deleting all IndexedDB databases...');
        
        // List of known database names
        const dbNames = [
            'AvaBusinessDB',
            'AvaSolutionsDB', 
            'BusinessDB',
            'EmployeesDB',
            'ProductsDB',
            'InventoryDB',
            'BookingsDB',
            'ExpensesDB',
            'RoomsDB',
            'SettingsDB',
            'SyncDB',
            'CacheDB'
        ];
        
        // Delete each database
        for (const dbName of dbNames) {
            try {
                await indexedDB.deleteDatabase(dbName);
                console.log(`✅ Deleted ${dbName}`);
            } catch (e) {
                console.log(`⚠️ Could not delete ${dbName}:`, e);
            }
        }
        
        // Also try to get all databases if supported
        if (indexedDB.databases) {
            try {
                const databases = await indexedDB.databases();
                for (const db of databases) {
                    await indexedDB.deleteDatabase(db.name);
                    console.log(`✅ Deleted ${db.name}`);
                }
            } catch (e) {
                console.log('⚠️ Could not enumerate databases:', e);
            }
        }
        
        console.log('✅ All IndexedDB databases deleted');
    }
    
    // Step 2: Unregister all service workers
    async function removeServiceWorkers() {
        console.log('🗑️ Removing all service workers...');
        
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                await registration.unregister();
                console.log('✅ Unregistered service worker:', registration.scope);
            }
        }
        
        // Clear all caches
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            for (const cacheName of cacheNames) {
                await caches.delete(cacheName);
                console.log('✅ Deleted cache:', cacheName);
            }
        }
        
        console.log('✅ All service workers removed');
    }
    
    // Step 3: Override database.js to use MongoDB only
    function overrideDatabase() {
        console.log('🔄 Overriding database to use MongoDB only...');
        
        // Create MongoDB-only database interface
        window.db = {
            // Business operations
            business: {
                get: async () => {
                    const response = await fetch('https://ava-pwa-backend.onrender.com/api/business', {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
                    });
                    return response.json();
                },
                update: async (data) => {
                    const response = await fetch('https://ava-pwa-backend.onrender.com/api/business', {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                        },
                        body: JSON.stringify(data)
                    });
                    return response.json();
                }
            },
            
            // Employees
            employees: {
                getAll: async () => {
                    const response = await fetch('https://ava-pwa-backend.onrender.com/api/employees', {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
                    });
                    return response.json();
                },
                add: async (employee) => {
                    const response = await fetch('https://ava-pwa-backend.onrender.com/api/employees', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                        },
                        body: JSON.stringify(employee)
                    });
                    return response.json();
                },
                update: async (id, data) => {
                    const response = await fetch(`https://ava-pwa-backend.onrender.com/api/employees/${id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                        },
                        body: JSON.stringify(data)
                    });
                    return response.json();
                },
                delete: async (id) => {
                    const response = await fetch(`https://ava-pwa-backend.onrender.com/api/employees/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
                    });
                    return response.json();
                }
            },
            
            // Products/Services
            products: {
                getAll: async () => {
                    const response = await fetch('https://ava-pwa-backend.onrender.com/api/products', {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
                    });
                    return response.json();
                },
                add: async (product) => {
                    const response = await fetch('https://ava-pwa-backend.onrender.com/api/products', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                        },
                        body: JSON.stringify(product)
                    });
                    return response.json();
                },
                update: async (id, data) => {
                    const response = await fetch(`https://ava-pwa-backend.onrender.com/api/products/${id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                        },
                        body: JSON.stringify(data)
                    });
                    return response.json();
                },
                delete: async (id) => {
                    const response = await fetch(`https://ava-pwa-backend.onrender.com/api/products/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
                    });
                    return response.json();
                }
            },
            
            // Inventory
            inventory: {
                getAll: async () => {
                    const response = await fetch('https://ava-pwa-backend.onrender.com/api/inventory', {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
                    });
                    return response.json();
                },
                add: async (item) => {
                    const response = await fetch('https://ava-pwa-backend.onrender.com/api/inventory', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                        },
                        body: JSON.stringify(item)
                    });
                    return response.json();
                },
                update: async (id, data) => {
                    const response = await fetch(`https://ava-pwa-backend.onrender.com/api/inventory/${id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                        },
                        body: JSON.stringify(data)
                    });
                    return response.json();
                },
                delete: async (id) => {
                    const response = await fetch(`https://ava-pwa-backend.onrender.com/api/inventory/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
                    });
                    return response.json();
                }
            },
            
            // Bookings
            bookings: {
                getAll: async () => {
                    const response = await fetch('https://ava-pwa-backend.onrender.com/api/bookings', {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
                    });
                    return response.json();
                },
                add: async (booking) => {
                    const response = await fetch('https://ava-pwa-backend.onrender.com/api/bookings', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                        },
                        body: JSON.stringify(booking)
                    });
                    return response.json();
                },
                update: async (id, data) => {
                    const response = await fetch(`https://ava-pwa-backend.onrender.com/api/bookings/${id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                        },
                        body: JSON.stringify(data)
                    });
                    return response.json();
                },
                delete: async (id) => {
                    const response = await fetch(`https://ava-pwa-backend.onrender.com/api/bookings/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
                    });
                    return response.json();
                }
            },
            
            // Expenses
            expenses: {
                getAll: async () => {
                    const response = await fetch('https://ava-pwa-backend.onrender.com/api/expenses', {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
                    });
                    return response.json();
                },
                add: async (expense) => {
                    const response = await fetch('https://ava-pwa-backend.onrender.com/api/expenses', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                        },
                        body: JSON.stringify(expense)
                    });
                    return response.json();
                },
                delete: async (id) => {
                    const response = await fetch(`https://ava-pwa-backend.onrender.com/api/expenses/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
                    });
                    return response.json();
                }
            },
            
            // Rooms
            rooms: {
                getAll: async () => {
                    const response = await fetch('https://ava-pwa-backend.onrender.com/api/rooms', {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
                    });
                    return response.json();
                },
                add: async (room) => {
                    const response = await fetch('https://ava-pwa-backend.onrender.com/api/rooms', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                        },
                        body: JSON.stringify(room)
                    });
                    return response.json();
                },
                update: async (id, data) => {
                    const response = await fetch(`https://ava-pwa-backend.onrender.com/api/rooms/${id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                        },
                        body: JSON.stringify(data)
                    });
                    return response.json();
                },
                delete: async (id) => {
                    const response = await fetch(`https://ava-pwa-backend.onrender.com/api/rooms/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
                    });
                    return response.json();
                }
            },
            
            // Settings
            settings: {
                get: async () => {
                    const response = await fetch('https://ava-pwa-backend.onrender.com/api/settings', {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
                    });
                    return response.json();
                },
                update: async (settings) => {
                    const response = await fetch('https://ava-pwa-backend.onrender.com/api/settings', {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                        },
                        body: JSON.stringify(settings)
                    });
                    return response.json();
                }
            }
        };
        
        console.log('✅ Database overridden to use MongoDB only');
    }
    
    // Step 4: Remove offline UI elements
    function removeOfflineUI() {
        console.log('🗑️ Removing offline UI elements...');
        
        // Remove connection status indicator
        const connectionStatus = document.getElementById('connectionStatus');
        if (connectionStatus) {
            connectionStatus.style.display = 'none';
        }
        
        // Remove sync indicator
        const syncIndicator = document.getElementById('syncIndicator');
        if (syncIndicator) {
            syncIndicator.style.display = 'none';
        }
        
        // Remove any offline badges
        document.querySelectorAll('.offline-badge, .sync-badge, .connection-indicator').forEach(el => {
            el.style.display = 'none';
        });
        
        // Update connection status to always show online
        const statusElements = document.querySelectorAll('.connection-status');
        statusElements.forEach(el => {
            el.className = 'connection-status online';
            el.innerHTML = '<i class="fas fa-globe"></i><span>Online</span>';
        });
        
        console.log('✅ Offline UI elements removed');
    }
    
    // Step 5: Override sync functions to do nothing
    function disableSync() {
        console.log('🔄 Disabling sync functions...');
        
        // Override global sync functions
        window.syncData = async function() {
            console.log('Sync disabled - using online MongoDB directly');
            return true;
        };
        
        window.syncManager = {
            sync: async () => true,
            syncAll: async () => true,
            syncEmployees: async () => true,
            syncProducts: async () => true,
            syncInventory: async () => true,
            syncBookings: async () => true,
            isOnline: () => true,
            checkConnection: () => true
        };
        
        // Override any cloud sync
        if (window.cloudSync) {
            window.cloudSync = {
                sync: async () => true,
                syncAll: async () => true,
                isEnabled: () => false
            };
        }
        
        console.log('✅ Sync functions disabled');
    }
    
    // Main execution
    async function removeAllOffline() {
        console.log('🚀 Starting complete offline removal...');
        
        // Delete all IndexedDB databases
        await deleteAllIndexedDB();
        
        // Remove service workers
        await removeServiceWorkers();
        
        // Override database to use MongoDB
        overrideDatabase();
        
        // Remove offline UI
        removeOfflineUI();
        
        // Disable sync
        disableSync();
        
        console.log('✅ ALL OFFLINE FUNCTIONALITY REMOVED!');
        console.log('📡 Now using MongoDB exclusively for all data storage');
        
        // Clear any cached data in localStorage related to offline
        const keysToRemove = [
            'lastSync',
            'syncStatus',
            'offlineMode',
            'cachedData',
            'pendingSync',
            'syncQueue'
        ];
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });
        
        // Set flag to indicate online-only mode
        localStorage.setItem('onlineOnlyMode', 'true');
        localStorage.setItem('useIndexedDB', 'false');
        
        console.log('🎉 System is now online-only with MongoDB!');
    }
    
    // Execute immediately
    removeAllOffline();
    
    // Make functions globally available
    window.removeOffline = {
        deleteDB: deleteAllIndexedDB,
        removeSW: removeServiceWorkers,
        overrideDB: overrideDatabase,
        removeUI: removeOfflineUI,
        disableSync: disableSync,
        removeAll: removeAllOffline
    };
    
})();