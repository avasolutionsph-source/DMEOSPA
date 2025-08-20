// Simplified Service Worker - Basic caching only
const CACHE_NAME = 'ava-solutions-simple-v1.0.0';

// Install event - minimal caching
self.addEventListener('install', (event) => {
    console.log('Service worker installing...');
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service worker activating...');
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

// Fetch event - simple network-first strategy
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;
    
    // Skip non-http(s) requests
    if (!event.request.url.startsWith('http')) return;
    
    // For API requests, always go to network
    if (event.request.url.includes('/api/')) {
        event.respondWith(fetch(event.request));
        return;
    }
    
    // For other requests, try network first, then cache
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});

console.log('✅ Simplified service worker loaded');
