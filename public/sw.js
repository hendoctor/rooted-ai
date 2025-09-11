const CACHE_VERSION = '1.6.0';
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
  // Enhanced network handling for Supabase requests
  if (event.request.url.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clone the response for caching if successful
          if (response.ok && event.request.method === 'GET') {
            const responseClone = response.clone();
            caches.open(API_CACHE).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch((error) => {
          console.warn('Supabase request failed, checking cache:', error);
          
          // Try to serve from cache for GET requests
          if (event.request.method === 'GET') {
            return caches.match(event.request).then(cachedResponse => {
              if (cachedResponse) {
                console.log('Serving cached Supabase response');
                return cachedResponse;
              }
              
              // Return controlled error response
              return new Response(JSON.stringify({ 
                error: 'Network unavailable', 
                cached: false,
                retry: true 
              }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              });
            });
          }
          
          // For non-GET requests, return error
          return new Response(JSON.stringify({ 
            error: 'Service temporarily unavailable',
            method: event.request.method
          }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
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
