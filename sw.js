var CACHE_NAME = 'tumanina-v22';
var APP_SHELL = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './data/azkar.js',
    './fonts/UthmanicHafs1Ver18.woff2',
    './fonts/thmanyah/thmanyahsans-Regular.woff2',
    './fonts/thmanyah/thmanyahsans-Medium.woff2',
    './fonts/thmanyah/thmanyahsans-Bold.woff2',
    './fonts/thmanyah/thmanyahseriftext-Regular.woff2',
    './fonts/thmanyah/thmanyahseriftext-Medium.woff2',
    './fonts/thmanyah/thmanyahseriftext-Bold.woff2',
    './manifest.json',
    './icons/icon.svg',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/apple-touch-icon.png'
];

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(APP_SHELL);
        }).then(function() {
            return self.skipWaiting();
        })
    );
});

// network-first فقط لـ index.html و data/azkar.js (والتنقّل)، وبقية الملفات cache-first
function isNetworkFirst(request) {
    if (request.mode === 'navigate') return true;
    var path = new URL(request.url).pathname;
    return path.endsWith('/index.html') || path.endsWith('/data/azkar.js');
}

self.addEventListener('fetch', function(event) {
    if (event.request.method !== 'GET') return;

    if (isNetworkFirst(event.request)) {
        event.respondWith(
            fetch(event.request).then(function(networkResponse) {
                if (networkResponse && networkResponse.ok) {
                    var copy = networkResponse.clone();
                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(event.request, copy);
                    });
                }
                return networkResponse;
            }).catch(function() {
                return caches.match(event.request).then(function(cachedResponse) {
                    if (cachedResponse) return cachedResponse;
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }
                });
            })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then(function(cachedResponse) {
            if (cachedResponse) return cachedResponse;

            return fetch(event.request).catch(function() {
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});

self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(cacheNames.map(function(cacheName) {
                if (cacheName !== CACHE_NAME) {
                    return caches.delete(cacheName);
                }
            }));
        }).then(function() {
            return self.clients.claim();
        })
    );
});
