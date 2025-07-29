// Define the cache names
const CORE_CACHE_NAME = 'workout-tracker-core-v1';
const DYNAMIC_CACHE_NAME = 'workout-tracker-dynamic-v1';

// List of essential files to pre-cache
const urlsToCache = [
  './',
  './index.html',
  './images/icons/icon-192x192.png',
  './images/icons/icon-512x512.png'
];

// Install the service worker and pre-cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CORE_CACHE_NAME)
      .then(cache => {
        console.log('Opened core cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate the service worker and remove old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CORE_CACHE_NAME, DYNAMIC_CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Handle fetch events
self.addEventListener('fetch', event => {
  const { request } = event;

  // For third-party assets (CSS, fonts), use a stale-while-revalidate strategy
  if (request.url.includes('tailwindcss.com') || request.url.includes('fonts.googleapis.com') || request.url.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.open(DYNAMIC_CACHE_NAME).then(cache => {
        return cache.match(request).then(response => {
          // Return from cache if available, while fetching a fresh version in the background
          const fetchPromise = fetch(request).then(networkResponse => {
            cache.put(request, networkResponse.clone());
            return networkResponse;
          });
          return response || fetchPromise;
        });
      })
    );
    return;
  }

  // For all other requests, use a cache-first strategy
  event.respondWith(
    caches.match(request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        // Not in cache - fetch from network
        return fetch(request);
      })
  );
});