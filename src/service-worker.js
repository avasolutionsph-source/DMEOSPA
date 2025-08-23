// Service Worker for Offline Functionality - Updated with State Management & Unified Backend
const CACHE_NAME = 'ava-solutions-v1.8.0';
const urlsToCache = [
    // Core app files
    '../',
    '../index.html',
    '../login.html',
    '../register.html',
    '../manifest.json',
    
    // CSS files
    './css/main.css',
    './css/variables.css',
    './css/base.css',
    './css/layout.css',
    './css/components.css',
    './css/dashboard.css',
    './css/forms.css',
    './css/buttons.css',
    './css/navigation.css',
    './css/utilities.css',
    './css/auth.css',
    
    // JavaScript files
    './js/app.js',
    './js/database.js',
    './js/component-loader.js',
    './js/pos.js',
    './js/products.js',
    './js/inventory.js',
    './js/employees.js',
    './js/chatbot.js',
    './js/dashboard.js',
    './js/settings.js',
    './js/sync.js',
    './js/auth.js',
    './js/api-config.js',
    './js/api.js',
    './js/state-manager.js',
    './js/state-ui-binding.js',
    './js/state-helpers.js',
    './js/config-service.js',
    './js/logger-complete.js',
    './js/token-manager.js',
    './js/rooms.js',
    './js/gift-certificates.js',
    './js/entitlements.js',
    './js/feature-flags.js',
    './js/auto-updater.js',
    './js/backup-system.js',
    './js/rollback-system.js',
    './js/error-recovery.js',
    
    // Component HTML files (with cache-busting)
    './components/sidebar.html',
    './components/main-content.html',
    './components/dashboard.html',
    './components/pos.html',
    './components/products.html',
    './components/inventory.html',
    './components/employees.html',
    './components/chatbot.html',
    './components/settings.html',
    './components/rooms.html',
    './components/gift-certificates.html',
    './components/modals.html',
    
    // External resources
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker installing, version:', CACHE_NAME);
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(async (cache) => {
                console.log('📦 Opened cache:', CACHE_NAME);
                console.log('📋 URLs to cache:', urlsToCache.length, 'items');
                
                // Cache items individually with error handling
                const cachePromises = urlsToCache.map(async (url) => {
                    try {
                        await cache.add(url);
                        console.log('✅ Cached:', url);
                        return { url, success: true };
                    } catch (error) {
                        console.warn('⚠️ Failed to cache:', url, error.message);
                        return { url, success: false, error: error.message };
                    }
                });
                
                const results = await Promise.all(cachePromises);
                const successful = results.filter(r => r.success).length;
                const failed = results.filter(r => !r.success);
                
                console.log(`📊 Cache results: ${successful}/${urlsToCache.length} successful`);
                if (failed.length > 0) {
                    console.warn('❌ Failed to cache:', failed);
                }
                
                return results;
            })
            .catch((error) => {
                console.error('❌ Failed to open cache:', error);
                throw error;
            })
    );
    
    // Force activate immediately
    self.skipWaiting();
    console.log('🚀 Service Worker installed, skipping wait');
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('🎯 Service Worker activating, version:', CACHE_NAME);
    
    event.waitUntil(
        caches.keys().then(async (cacheNames) => {
            console.log('📋 Found caches:', cacheNames);
            
            const deletePromises = cacheNames.map(async (cacheName) => {
                if (cacheName !== CACHE_NAME) {
                    console.log('🗑️ Deleting old cache:', cacheName);
                    return caches.delete(cacheName);
                } else {
                    console.log('📦 Keeping current cache:', cacheName);
                }
            });
            
            await Promise.all(deletePromises);
            console.log('🧹 Cache cleanup complete');
            
            // Verify current cache contents
            try {
                const currentCache = await caches.open(CACHE_NAME);
                const cachedRequests = await currentCache.keys();
                console.log(`📊 Current cache contains ${cachedRequests.length} items:`);
                cachedRequests.forEach(request => {
                    console.log(`  - ${request.url}`);
                });
            } catch (error) {
                console.warn('⚠️ Could not verify cache contents:', error);
            }
        })
    );
    
    // Take control of all clients
    self.clients.claim();
    console.log('✅ Service Worker activated and claimed all clients');
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Skip non-http(s) requests (chrome-extension, data:, etc.)
    if (!event.request.url.startsWith('http')) {
        return;
    }

    // Get the current origin and port (where the PWA is served from)
    const currentOrigin = self.location.origin;
    const requestUrl = new URL(event.request.url);
    
    // Handle Netlify/production origins and dev ports
    const isPWAPort = requestUrl.port === '8080' || requestUrl.port === '5500' || requestUrl.protocol === 'file:';
    const isSameOriginDifferentPort = requestUrl.hostname === 'localhost' && requestUrl.port !== '8080' && requestUrl.port !== '5500';
    const isNetlify = /netlify\.app$/.test(requestUrl.hostname);
    
    if (isSameOriginDifferentPort) {
        return; // Don't handle requests for other localhost ports
    }
    
    if (requestUrl.origin !== currentOrigin && !isPWAPort && !isNetlify) {
        return; // Don't handle requests for other origins/ports
    }

    // Handle API requests with intelligent caching for unified backend
    if (event.request.url.includes('/api/')) {
        // Check if it's a unified backend URL
        const isUnifiedBackend = event.request.url.includes('ava-pwa-backend.onrender.com') ||
                                event.request.url.includes('localhost:4000');
        
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Cache successful GET requests for offline use
                    if (event.request.method === 'GET' && response.ok && isUnifiedBackend) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            // Only cache non-sensitive endpoints
                            if (!event.request.url.includes('/auth/') && 
                                !event.request.url.includes('/user/')) {
                                cache.put(event.request, responseToCache);
                            }
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Try to return cached response for GET requests
                    if (event.request.method === 'GET') {
                        return caches.match(event.request).then(cachedResponse => {
                            if (cachedResponse) {
                                return cachedResponse;
                            }
                            return new Response(JSON.stringify({ 
                                error: 'Offline', 
                                message: 'API not available while offline' 
                            }), {
                                status: 503,
                                headers: { 'Content-Type': 'application/json' }
                            });
                        });
                    }
                    return new Response(JSON.stringify({ 
                        error: 'Offline', 
                        message: 'Request will be synced when online' 
                    }), {
                        status: 503,
                        headers: { 'Content-Type': 'application/json' }
                    });
                })
        );
        return;
    }

    // For other requests, try cache first
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version or fetch from network
                return response || fetch(event.request).then((fetchResponse) => {
                    // Don't cache non-successful responses
                    if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type === 'opaque') {
                        return fetchResponse;
                    }

                    // Clone the response before caching (only for successful responses)
                    if (fetchResponse.ok) {
                        const responseToCache = fetchResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        }).catch(err => {
                            console.log('Cache put failed:', err);
                        });
                    }

                    return fetchResponse;
                }).catch((error) => {
                    console.log('Fetch failed:', error);
                    // Offline fallback - only return cached index.html for navigation requests
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }
                    throw error;
                });
            })
            .catch((error) => {
                // Cache match failed - logging disabled in service worker context
                // Final fallback for navigation requests
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
                return new Response('Resource not available offline', { status: 503 });
            })
    );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-data') {
        event.waitUntil(syncDataWithServer());
    }
});

// Sync data with server
async function syncDataWithServer() {
    try {
        // Get all pending sync operations from IndexedDB
        const db = await openDB();
        const tx = db.transaction(['syncQueue'], 'readonly');
        const store = tx.objectStore('syncQueue');
        const pendingSync = await store.getAll();

        for (const item of pendingSync) {
            try {
                // Send to server (this will be implemented when MERN backend is ready)
                const response = await fetch(item.url, {
                    method: item.method,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(item.data)
                });

                if (response.ok) {
                    // Remove from sync queue if successful
                    const deleteTx = db.transaction(['syncQueue'], 'readwrite');
                    const deleteStore = deleteTx.objectStore('syncQueue');
                    await deleteStore.delete(item.id);
                }
            } catch (error) {
                console.error('Sync failed for item:', item, error);
            }
        }

        // Notify clients that sync is complete
        self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
                client.postMessage({
                    type: 'SYNC_COMPLETE',
                    timestamp: new Date().toISOString()
                });
            });
        });
    } catch (error) {
        console.error('Sync failed:', error);
    }
}

// Helper function to open IndexedDB
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('AvaSolutionsDB', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Listen for messages from the main app
self.addEventListener('message', (event) => {
    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (event.data.type === 'SYNC_NOW') {
        syncDataWithServer();
    }
});
