self.addEventListener('install', (e) => {
    // Force this new SW to become the active one immediately
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    // Take control of all pages immediately
    e.waitUntil(
        Promise.all([
            self.clients.claim(),
            // Delete ALL caches
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        console.log('Deleting cache:', cacheName);
                        return caches.delete(cacheName);
                    })
                );
            })
        ]).then(() => {
            // Unregister self after cleanup
            self.registration.unregister().then(() => {
                console.log('Self-destruct complete. Service Worker unregistered.');
            });
        })
    );
});

// Pass through all fetches to the network (no caching)
self.addEventListener('fetch', (e) => {
    e.respondWith(fetch(e.request));
});
