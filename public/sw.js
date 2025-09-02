const CACHE_VERSION = '1.3.0';
const CACHE_NAME = `rooted-ai-v${CACHE_VERSION}`;
const STATIC_CACHE = `${CACHE_NAME}-static`;
const API_CACHE = `${CACHE_NAME}-api`;
const OFFLINE_FALLBACK = '/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        cache.addAll([
          '/',
          '/index.html',
          '/manifest.json',
          '/Assets/18d38cb4-658a-43aa-8b10-fa6dbd50eae7.png',
        ])
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName.startsWith('rooted-ai-v') &&
              cacheName !== CACHE_NAME &&
              cacheName !== STATIC_CACHE &&
              cacheName !== API_CACHE
            ) {
              return caches.delete(cacheName);
            }
          })
        )
      ),
      self.clients.claim(),
    ]).then(() =>
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION });
        });
      })
    )
  );
});

self.addEventListener('message', (event) => {
  const { type } = event.data || {};
  if (type === 'CHECK_FOR_UPDATES') {
    event.ports[0].postMessage({ type: 'VERSION_INFO', version: CACHE_VERSION });
  } else if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/lovable-uploads/')) {
    const redirected = event.request.url.replace('/lovable-uploads/', '/Assets/');
    event.respondWith(fetch(redirected));
    return;
  }

  // Network-first strategy for navigation requests with offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_FALLBACK))
    );
    return;
  }

  if (event.request.destination === 'image' || event.request.url.includes('/Assets/')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return (
          response ||
          fetch(event.request).then((fetchResponse) => {
            const responseClone = fetchResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(event.request, responseClone);
            });
            return fetchResponse;
          })
        );
      })
    );
  }
});
