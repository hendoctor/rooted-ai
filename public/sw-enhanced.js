// Enhanced Service Worker for B2B Application
// Implements advanced caching strategies for optimal performance

const CACHE_NAME = 'b2b-app-v1.0.0';
const STATIC_CACHE = 'static-v1.0.0';
const DYNAMIC_CACHE = 'dynamic-v1.0.0';
const API_CACHE = 'api-v1.0.0';

// Cache strategies by resource type
const CACHE_STRATEGIES = {
  // Immutable assets - cache forever
  static: {
    pattern: /\.(js|css|woff2?|png|jpg|jpeg|svg|ico|webp|avif)$/,
    strategy: 'cache-first',
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    cacheName: STATIC_CACHE
  },
  
  // HTML pages - network first with fallback
  pages: {
    pattern: /\/$/,
    strategy: 'network-first', 
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    cacheName: DYNAMIC_CACHE
  },
  
  // API calls - stale while revalidate
  api: {
    pattern: /\/rest\/v1\//,
    strategy: 'stale-while-revalidate',
    maxAge: 5 * 60 * 1000, // 5 minutes
    cacheName: API_CACHE
  }
};

// Install event - cache critical resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.json',
        // Critical CSS and JS will be added by build process
      ]);
    })
  );
  
  self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== STATIC_CACHE && 
              cacheName !== DYNAMIC_CACHE && 
              cacheName !== API_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  self.clients.claim();
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip cross-origin requests (except API)
  if (url.origin !== self.location.origin && !url.href.includes('supabase.co')) {
    return;
  }
  
  // Determine cache strategy
  let strategy = null;
  for (const [key, config] of Object.entries(CACHE_STRATEGIES)) {
    if (config.pattern.test(url.pathname) || config.pattern.test(url.href)) {
      strategy = config;
      break;
    }
  }
  
  if (!strategy) {
    // Default to network-first for unknown resources
    strategy = CACHE_STRATEGIES.pages;
  }
  
  event.respondWith(handleRequest(request, strategy));
});

// Main request handler
async function handleRequest(request, strategy) {
  const cache = await caches.open(strategy.cacheName);
  const cached = await cache.match(request);
  
  switch (strategy.strategy) {
    case 'cache-first':
      return cached || fetchAndCache(request, cache, strategy);
      
    case 'network-first':
      try {
        const response = await fetchAndCache(request, cache, strategy);
        return response;
      } catch (error) {
        if (cached) {
          console.log('[SW] Network failed, serving from cache:', request.url);
          return cached;
        }
        throw error;
      }
      
    case 'stale-while-revalidate':
      if (cached) {
        // Serve from cache immediately
        const shouldRevalidate = isCacheStale(cached, strategy.maxAge);
        if (shouldRevalidate) {
          // Revalidate in background
          fetchAndCache(request, cache, strategy).catch(console.error);
        }
        return cached;
      }
      return fetchAndCache(request, cache, strategy);
      
    default:
      return fetch(request);
  }
}

// Fetch and cache helper
async function fetchAndCache(request, cache, strategy) {
  const response = await fetch(request);
  
  if (response.ok) {
    // Add timestamp for cache validation
    const responseWithTimestamp = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...response.headers,
        'sw-cached-at': Date.now().toString()
      }
    });
    
    cache.put(request, responseWithTimestamp.clone());
    return responseWithTimestamp;
  }
  
  return response;
}

// Check if cache entry is stale
function isCacheStale(response, maxAge) {
  const cachedAt = response.headers.get('sw-cached-at');
  if (!cachedAt) return true;
  
  const age = Date.now() - parseInt(cachedAt);
  return age > maxAge;
}

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'api-retry') {
    event.waitUntil(retryFailedApiCalls());
  }
});

// Retry failed API calls when back online
async function retryFailedApiCalls() {
  // Implementation would retrieve failed requests from IndexedDB
  // and retry them when connectivity is restored
  console.log('[SW] Retrying failed API calls...');
}

// Handle push notifications (for future enhancement)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: data.tag || 'default',
      requireInteraction: data.requireInteraction || false,
      actions: data.actions || []
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action) {
    // Handle action button clicks
    handleNotificationAction(event.action, event.notification.data);
  } else {
    // Handle main notification click
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/')
    );
  }
});

function handleNotificationAction(action, data) {
  // Implementation for handling notification actions
  console.log('[SW] Notification action:', action, data);
}