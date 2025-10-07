// Service Worker for Offline Functionality - Enhanced Auto-Update System
const VERSION = '2.8.1'; // ROOM SERVICES - Cross-device MongoDB sync for pending services
const CACHE_NAME = `ava-solutions-v${VERSION}-${Date.now()}`; // Time-based cache busting
const urlsToCache = [
    // Core app files
    './',
    './index.html',
    './login.html',
    './register.html',
    './manifest.json',
    
    // CSS files
    './styles.css',
    
    // JavaScript files
    './js/app.js',
    './js/database.js',
    './js/utilities.js',
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
    './js/expense-manager.js',
    
    // External resources
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(async (cache) => {
                // Cache items individually with error handling
                const cachePromises = urlsToCache.map(async (url) => {
                    try {
                        await cache.add(url);
                        return { url, success: true };
                    } catch (error) {
                        console.warn('⚠️ Failed to cache:', url, error.message);
                        return { url, success: false, error: error.message };
                    }
                });
                
                const results = await Promise.all(cachePromises);
                const successful = results.filter(r => r.success).length;
                const failed = results.filter(r => !r.success);
                
                console.log(`✅ Successfully cached ${successful}/${urlsToCache.length} resources`);
                
                if (failed.length > 0) {
                    console.warn('❌ Failed to cache:', failed);
                } else {
                    console.log('🎉 All resources cached successfully for offline use');
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
    const isPWAPort = requestUrl.port === '8080' || requestUrl.port === '8082' || requestUrl.port === '5500' || requestUrl.protocol === 'file:';
    const isSameOriginDifferentPort = requestUrl.hostname === 'localhost' && !['8080', '8082', '5500'].includes(requestUrl.port);
    const isNetlify = /netlify\.app$/.test(requestUrl.hostname);
    const isCustomDomain = requestUrl.hostname === 'app.daetmassage.com' || requestUrl.hostname === 'www.daetmassage.com' || requestUrl.hostname === 'daetmassage.com';
    
    if (isSameOriginDifferentPort) {
        return; // Don't handle requests for other localhost ports
    }
    
    if (requestUrl.origin !== currentOrigin && !isPWAPort && !isNetlify && !isCustomDomain) {
        return; // Don't handle requests for other origins/ports
    }

    // Handle API requests with intelligent caching for unified backend
    if (event.request.url.includes('/api/')) {
        // Log room-services requests for debugging
        if (event.request.url.includes('/room-services')) {
            console.log('🔧 [SW] Intercepted room-services request:', event.request.url, event.request.method);
        }

        // Check if it's a unified backend URL
        const isUnifiedBackend = event.request.url.includes('daetspa-backend.onrender.com') ||
                                event.request.url.includes('localhost:4001');

        event.respondWith(
            fetch(event.request)
                .then(response => {
                    if (event.request.url.includes('/room-services')) {
                        console.log('✅ [SW] room-services fetch completed, status:', response.status);
                    }

                    // Cache successful GET requests for offline use
                    if (event.request.method === 'GET' && response.ok && isUnifiedBackend) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            // Only cache non-sensitive and non-dynamic endpoints
                            if (!event.request.url.includes('/auth/') &&
                                !event.request.url.includes('/user/') &&
                                !event.request.url.includes('/transactions') &&
                                !event.request.url.includes('/inventory') &&
                                !event.request.url.includes('/employees') &&
                                !event.request.url.includes('/room-services') &&
                                !event.request.url.includes('/room-assignments')) {
                                cache.put(event.request, responseToCache);
                            }
                        });
                    }
                    return response;
                })
                .catch((err) => {
                    if (event.request.url.includes('/room-services')) {
                        console.error('❌ [SW] room-services fetch failed:', err.message);
                    }

                    // Try to return cached response for GET requests (but not for dynamic data)
                    if (event.request.method === 'GET') {
                        // Don't serve cached versions of dynamic data endpoints
                        const isDynamicEndpoint = event.request.url.includes('/transactions') ||
                                                 event.request.url.includes('/inventory') ||
                                                 event.request.url.includes('/employees') ||
                                                 event.request.url.includes('/room-services') ||
                                                 event.request.url.includes('/room-assignments');
                        
                        if (!isDynamicEndpoint) {
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
                        
                        // For dynamic endpoints, always return offline error
                        return new Response(JSON.stringify({ 
                            error: 'Offline', 
                            message: 'Dynamic data not available while offline' 
                        }), {
                            status: 503,
                            headers: { 'Content-Type': 'application/json' }
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
                if (response) {
                    console.log('✅ Serving from cache:', event.request.url);
                    return response;
                }
                
                console.log('⚡ Cache miss, fetching from network:', event.request.url);
                // Return cached version or fetch from network
                return fetch(event.request).then((fetchResponse) => {
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
                    console.log('Fetch failed for:', event.request.url, error);
                    // Enhanced offline fallback
                    if (event.request.mode === 'navigate') {
                        console.log('Navigation request failed, serving cached index.html');
                        return caches.match('./index.html').then(cachedResponse => {
                            if (cachedResponse) {
                                console.log('✅ Serving cached index.html');
                                return cachedResponse;
                            } else {
                                console.error('❌ No cached index.html found');
                                return new Response('App not available offline - please reload when online', { 
                                    status: 503,
                                    statusText: 'Service Unavailable'
                                });
                            }
                        });
                    }
                    throw error;
                });
            })
            .catch((error) => {
                console.error('Cache match failed for:', event.request.url, error);
                // Final fallback for navigation requests
                if (event.request.mode === 'navigate') {
                    console.log('Final fallback: attempting to serve index.html');
                    return caches.match('./index.html').then(cachedResponse => {
                        if (cachedResponse) {
                            console.log('✅ Final fallback: served cached index.html');
                            return cachedResponse;
                        } else {
                            console.error('❌ Final fallback: no index.html in cache');
                            return new Response('App not cached - please reload when online', { 
                                status: 503,
                                statusText: 'Service Unavailable'
                            });
                        }
                    });
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
    if (event.data.type === 'GET_VERSION') {
        // Send current service worker version to client
        event.ports[0].postMessage({
            type: 'VERSION_RESPONSE',
            version: VERSION,
            cacheName: CACHE_NAME
        });
    }
});

// Broadcast version updates to all clients
function broadcastVersionUpdate() {
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({
                type: 'VERSION_UPDATE',
                version: VERSION,
                cacheName: CACHE_NAME,
                timestamp: new Date().toISOString()
            });
        });
    });
}

// Broadcast on activate
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(async (cacheNames) => {
            console.log(`🔄 Service Worker v${VERSION} activating - clearing old caches`);
            
            // Delete ALL old caches aggressively
            const deletePromises = cacheNames.map(async (cacheName) => {
                if (cacheName !== CACHE_NAME) {
                    console.log(`🗑️ Deleting old cache: ${cacheName}`);
                    return caches.delete(cacheName);
                }
            });
            
            await Promise.all(deletePromises);
            
            // Force immediate control of all clients
            await self.clients.claim();
            
            // Broadcast version update after activation
            broadcastVersionUpdate();
            
            // Clear any additional cached JavaScript files that might have the old error
            try {
                const currentCache = await caches.open(CACHE_NAME);
                
                // Remove any cached versions of products.js specifically
                const productsJsRequests = [
                    './js/products.js',
                    '/js/products.js',
                    `${self.location.origin}/js/products.js`
                ];
                
                for (const url of productsJsRequests) {
                    try {
                        await currentCache.delete(url);
                        console.log(`🔄 Cleared cached products.js: ${url}`);
                    } catch (e) {
                        // Ignore deletion errors
                    }
                }
                
                const cachedRequests = await currentCache.keys();
                console.log(`✅ Cache refreshed - ${cachedRequests.length} items cached`);
            } catch (error) {
                console.warn('⚠️ Could not verify cache contents:', error);
            }
        })
    );
    
    // Take control of all clients
    self.clients.claim();
});
