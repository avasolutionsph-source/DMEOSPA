// Nuclear Service Worker Killer
// This service worker does nothing and will replace the problematic one

console.log('🔥 Nuclear Service Worker Killer Active');

// Immediately unregister itself
self.addEventListener('install', (event) => {
    console.log('🔥 Killer SW installing - will self-destruct');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('🔥 Killer SW activated - clearing everything');
    
    event.waitUntil(
        Promise.all([
            // Clear all caches
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        console.log('🔥 Deleting cache:', cacheName);
                        return caches.delete(cacheName);
                    })
                );
            }),
            // Take control immediately
            self.clients.claim()
        ]).then(() => {
            console.log('🔥 Killer SW completed - will now unregister');
            // Unregister this service worker
            self.registration.unregister();
        })
    );
});

// Don't handle any fetch events - let them pass through
self.addEventListener('fetch', (event) => {
    // Do nothing - let the browser handle requests normally
    return;
});
