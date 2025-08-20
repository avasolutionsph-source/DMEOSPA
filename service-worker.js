// Service Worker for Offline Functionality - Updated with Enhanced Chatbot
const CACHE_NAME = 'ava-solutions-v1.7.2';
const urlsToCache = [
    './',
    './index.html',
    './styles.css',
    './js/app.js',
    './js/database.js',
    './js/pos.js',
    './js/products.js',
    './js/inventory.js',
    './js/employees.js',
    './js/bookings.js',
    './js/rooms.js',
    './js/payroll.js',
    './js/giftcerts.js',
    './js/chatbot.js',
    './js/dashboard.js',
    './js/settings.js',
    './js/sync.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(async (cache) => {
                console.log('Opened cache');
                // Add assets defensively to avoid install failure on one bad URL
                for (const url of urlsToCache) {
                    try { await cache.add(url); } catch (_) {}
                }
            })
            .catch((error) => {
                console.error('Failed to cache:', error);
            })
    );
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
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

    // Handle API requests differently: do not cache authenticated API responses
    if (event.request.url.includes('/api/')) {
        event.respondWith(
            fetch(event.request).catch(() => {
                return new Response(JSON.stringify({ error: 'Offline', message: 'API not available while offline' }), {
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
                console.log('Cache match failed:', error);
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

// Helper function to open IndexedDB (ensure version aligns with schema)
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('AvaSolutionsDB', 4);
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
