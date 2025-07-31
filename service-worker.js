// Define the cache names (version bumped to v3)
const CORE_CACHE_NAME = 'workout-tracker-core-v3';
const DYNAMIC_CACHE_NAME = 'workout-tracker-dynamic-v3';

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
            // Delete all old caches (v1, v2, etc.)
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Handle fetch events with a better strategy
self.addEventListener('fetch', event => {
  const { request } = event;

  // IMPORTANT: Only handle http and https requests.
  // This prevents errors from browser extensions like 'chrome-extension://'
  if (!request.url.startsWith('http')) {
    return;
  }

  // For third-party assets, use a stale-while-revalidate strategy
  if (request.url.includes('tailwindcss.com') || request.url.includes('fonts.googleapis.com') || request.url.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.open(DYNAMIC_CACHE_NAME).then(cache => {
        return cache.match(request).then(response => {
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

  // For all other requests (your app shell and data), use a network-first strategy.
  event.respondWith(
    // 1. Try to fetch from the network first.
    fetch(request)
      .then(networkResponse => {
        // If successful, cache the new response and return it.
        return caches.open(DYNAMIC_CACHE_NAME).then(cache => {
          // Only cache successful GET requests.
          if (request.method === 'GET' && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        });
      })
      .catch(() => {
        // 2. If the network fails, try to get the response from the cache.
        return caches.match(request);
      })
  );
});
