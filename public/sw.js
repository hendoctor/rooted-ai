const CACHE_VERSION = '1.7.0';
const CACHE_NAME = `rooted-ai-v${CACHE_VERSION}`;
const STATIC_CACHE = `${CACHE_NAME}-static`;
const API_CACHE = `${CACHE_NAME}-api`;
const OFFLINE_FALLBACK = '/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      const precacheAssets = new Set([
        '/',
        '/index.html',
        '/manifest.json',
      ]);

      try {
        const response = await fetch('/manifest.json', { cache: 'no-store' });
        if (response.ok) {
          const manifest = await response.clone().json();
          const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
          icons
            .map((icon) => icon?.src)
            .filter(Boolean)
            .forEach((src) => {
              const url = new URL(src, self.location.origin);
              precacheAssets.add(url.pathname + url.search);
            });
        }
      } catch (error) {
        console.warn('[sw] Unable to derive icons from manifest during install', error);
        precacheAssets.add('/Assets/18d38cb4-658a-43aa-8b10-fa6dbd50eae7.png');
      }

      await cache.addAll(Array.from(precacheAssets));
      await self.skipWaiting();
    })()
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
  // Skip service worker for all Supabase requests to prevent auth interference
  if (event.request.url.includes('supabase.co')) {
    return;
  }

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
