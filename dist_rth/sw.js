/**
 * Service Worker for PWA Support
 * Caches static assets for offline access
 * 
 * IMPORTANT: Increment CACHE_VERSION when deploying new versions
 * to ensure users get fresh resources.
 */

const CACHE_VERSION = 'v9';
const CACHE_NAME = `shadowsky-blog-${CACHE_VERSION}`;
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/blog.html',
    '/about.html',
    '/css/style.css',
    '/js/main.js',
    '/js/api.js',
    '/js/cache.js',
    '/js/blog.js',
    '/public/img/favicon256.png',
    '/public/img/avatar.jpg'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
            .catch((err) => {
                console.error('[SW] Cache failed:', err);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

/**
 * Check if request is for an HTML page
 * @param {Request} request - The fetch request
 * @returns {boolean} - True if request is for HTML
 */
function isHtmlRequest(request) {
    // Navigation requests are always for HTML
    if (request.mode === 'navigate') return true;
    
    // Check accept header for text/html
    const acceptHeader = request.headers.get('accept');
    if (acceptHeader && acceptHeader.includes('text/html')) return true;
    
    // Check URL for .html extension
    if (request.url.endsWith('.html')) return true;
    
    return false;
}

// Fetch event - network-first for HTML, cache-first for other resources
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;
    
    // Skip non-http(s) requests (chrome-extension, etc.)
    if (!event.request.url.startsWith('http')) return;
    
    // Skip API requests (always fetch from network)
    if (event.request.url.includes('/api/')) return;
    
    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin)) return;
    
    // Network-first strategy for HTML pages
    if (isHtmlRequest(event.request)) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Cache the fresh response
                    if (response.ok) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseClone).catch(() => {});
                            });
                    }
                    return response;
                })
                .catch(() => {
                    // Network failed, try cache
                    return caches.match(event.request)
                        .then((cachedResponse) => {
                            if (cachedResponse) {
                                return cachedResponse;
                            }
                            // Fallback to index.html for navigation
                            return caches.match('/index.html');
                        });
                })
        );
        return;
    }
    
    // Cache-first strategy for other resources (CSS, JS, images)
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                // Not in cache, fetch from network
                return fetch(event.request)
                    .then((response) => {
                        // Only cache successful same-origin http(s) responses
                        if (response.ok && 
                            shouldCache(event.request.url) && 
                            event.request.url.startsWith('http')) {
                            const responseClone = response.clone();
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(event.request, responseClone).catch(() => {});
                                });
                        }
                        return response;
                    })
                    .catch(() => {
                        return new Response('Offline', { status: 503 });
                    });
            })
    );
});

/**
 * Check if URL should be cached
 */
function shouldCache(url) {
    const cacheableExtensions = ['.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2'];
    return cacheableExtensions.some(ext => url.endsWith(ext));
}

// Handle messages from main thread
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
});
