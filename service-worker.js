// Bump CACHE_VERSION on every deploy. The activate handler deletes any
// cache whose name doesn't match, so older clients pull fresh assets.
const CACHE_VERSION = 'v2';
const CACHE_NAME = `schengen-calculator-${CACHE_VERSION}`;

const PRECACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/calendarUtils.js',
  '/db.js',
  '/dateStorage.js',
  '/rangeUtils.js',
  '/modal.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/privacy/',
  '/privacy/index.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  // For navigations (deep links, page reloads): try the network first,
  // fall back to the cached index.html so the SPA shell still loads
  // offline even at a URL we haven't precached.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then(hit => hit || caches.match('/index.html')))
    );
    return;
  }

  // For same-origin assets: stale-while-revalidate so users still pick
  // up updates even if the cache version constant wasn't bumped.
  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(cached => {
        const networkFetch = fetch(request)
          .then(response => {
            if (response && response.status === 200 && response.type === 'basic') {
              const copy = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached);
        return cached || networkFetch;
      })
    );
    return;
  }

  // Cross-origin (e.g. analytics): pass through.
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});
