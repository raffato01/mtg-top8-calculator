/**
 * Service Worker for MTG Top 8 Calculator
 * Handles caching and offline functionality for PWA
 */

const CACHE_NAME = 'mtg-calculator-v2';
const APP_SHELL_URLS = [
  './',
  './index.html',
  './day2.html',
  './script.js',
  './day2.js',
  './style.css',
  './manifest.json'
];

const OFFLINE_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Offline - MTG Top 8 Calculator</title>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a12; color: #e8e6f0; }
    main { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
    section { max-width: 520px; background: rgba(20,20,40,.75); border: 1px solid rgba(120,90,220,.25); border-radius: 16px; padding: 20px; }
    h1 { margin: 0 0 8px; font-size: 1.2rem; }
    p { margin: 0 0 8px; color: #c4c0d6; line-height: 1.45; }
    a { color: #a78bfa; text-decoration: none; }
  </style>
</head>
<body>
  <main>
    <section>
      <h1>You are offline</h1>
      <p>The app shell is still available. Return online to refresh remote resources.</p>
      <p><a href="./index.html">Open Home</a></p>
    </section>
  </main>
</body>
</html>`;

// Install event: cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(APP_SHELL_URLS)
          .catch(err => console.log('Cache addAll error:', err));
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event: serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          var responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
          return networkResponse;
        })
        .catch(() => {
          return caches.match('./index.html').then(cachedPage => {
            if (cachedPage) return cachedPage;
            return new Response(OFFLINE_HTML, {
              status: 200,
              headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
          });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version if available
        if (response) {
          return response;
        }

        return fetch(event.request)
          .then(response => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Offline fallback
            return new Response('Offline - reconnect to update this resource.', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Background sync placeholder (for future enhancements)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-calculations') {
    event.waitUntil(
      // Implement sync logic here if needed
      Promise.resolve()
    );
  }
});
