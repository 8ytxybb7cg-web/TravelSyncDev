const CACHE_NAME = 'travel-sync-v14.02-sw-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './IMG_1641.jpeg',
  // External Libraries used in v14.02
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/vue@3/dist/vue.global.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://unpkg.com/@phosphor-icons/web',
  'https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js'
];

// Install: Cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use addAll with error handling for CDN reliability
      return Promise.all(
        ASSETS_TO_CACHE.map(url => {
          return cache.add(url).catch(err => console.warn('SW: Failed to cache ' + url, err));
        })
      );
    })
  );
  // Do not skipWaiting automatically in v14.02 as per strategy
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }));
    })
  );
});

// Fetch: Stale-While-Revalidate (GET only)
self.addEventListener('fetch', (event) => {
  // 1. Pass through non-GET requests (Supabase writes, etc.)
  if (event.request.method !== 'GET') {
    return;
  }

  // 2. Handle GET requests
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            // Only cache valid responses (basic check)
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => {
            // Network failed. If no cache, and it's a navigation, maybe return index.html?
            // For now, just return undefined (browser shows error) or the cached response if available.
          });

        // Return cached response immediately if available (Stale), otherwise wait for network
        return cachedResponse || fetchPromise;
      });
    })
  );
});
