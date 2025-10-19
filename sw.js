const CACHE_NAME = 'ruqyah-app-v2';

// Build absolute URLs for assets based on the SW location (GitHub Pages subpath safe)
const toAbs = (p) => new URL(p, self.location).toString();

const URLS_TO_CACHE = [
  toAbs('./'),
  toAbs('index.html'),
  toAbs('css/style.css'),
  toAbs('js/app.js'),
  toAbs('data/verses.json'),
  toAbs('manifest.json'),
  toAbs('sw.js'),
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(URLS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : Promise.resolve()))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return; // Only cache GET

  // Navigation requests: try network, fallback to cached shell (offline support)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Optionally cache updated shell
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(toAbs('index.html'), cloned));
          return response;
        })
        .catch(() => caches.match(toAbs('index.html')))
    );
    return;
  }

  // Static/runtime assets: cache-first, then network fallback.
  event.respondWith(
    caches.match(request)
      .then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          return response;
        });
      })
      .catch(() => {
        // As a last resort, return app shell if available
        return caches.match(toAbs('index.html'));
      })
  );
});