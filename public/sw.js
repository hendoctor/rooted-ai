// Service Worker for AI Joke Notifications - Background Operation Enhanced
const CACHE_VERSION = '1.2.0';
const CACHE_NAME = `rooted-ai-v${CACHE_VERSION}`;
const STATIC_CACHE = `${CACHE_NAME}-static`;
const API_CACHE = `${CACHE_NAME}-api`;
const AI_JOKES = [
  "Why did the AI get fired? It thought outside the search parameters.",
  "My robot vacuum just got a philosophy degree. It's deep cleaning now.",
  "The AI tried to tell a joke… but it was trained on LinkedIn posts.",
  "I asked ChatGPT for a laugh. It replied: 'Ha. Ha. Ha.'",
  "404 Joke not found. Please reboot the humor module.",
  "Why don't AI models ever get tired? They run on infinite loops!",
  "The neural network went to therapy. It had too many layers of issues.",
  "I told my AI assistant a secret. Now it's in the training data.",
  "Why did the machine learning model break up? It found a better fit.",
  "The AI tried stand-up comedy but kept overfitting to the audience."
];

let jokeInterval = null;
let jokeIndex = 0;
let currentFrequency = null;
let keepAliveInterval = null;
let lastJokeTime = null;

// Install event
self.addEventListener('install', (event) => {
  console.log(`Service Worker v${CACHE_VERSION} installing...`);
  
  // Pre-cache essential assets
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.json',
        '/lovable-uploads/18d38cb4-658a-43aa-8b10-fa6dbd50eae7.png'
      ]);
    }).then(() => {
      // Force immediate activation for updates
      return self.skipWaiting();
    })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log(`Service Worker v${CACHE_VERSION} activated`);
  
  event.waitUntil(
    // Clean up old caches
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.startsWith('rooted-ai-v') && cacheName !== CACHE_NAME && 
              cacheName !== STATIC_CACHE && cacheName !== API_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    }).then(() => {
      // Start background persistence and restore previous state
      startBackgroundPersistence();
      restoreJokeState();
      
      // Notify all clients about the update
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SW_UPDATED',
            version: CACHE_VERSION
          });
        });
      });
    })
  );
});

// Background sync for reliable operation
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'ai-joke-sync') {
    event.waitUntil(
      checkAndSendScheduledJokes()
    );
  } else if (event.tag === 'app-refresh-sync') {
    event.waitUntil(
      performBackgroundAppRefresh()
    );
  }
});

// Periodic background sync (where supported)
self.addEventListener('periodicsync', (event) => {
  console.log('Periodic sync triggered:', event.tag);
  
  if (event.tag === 'ai-joke-periodic') {
    event.waitUntil(
      checkAndSendScheduledJokes()
    );
  } else if (event.tag === 'app-refresh-periodic') {
    event.waitUntil(
      performBackgroundAppRefresh()
    );
  }
});

// Keep service worker alive and handle background operations
function startBackgroundPersistence() {
  console.log('Starting background persistence and app refresh mechanisms');
  
  // Keep alive with periodic tasks
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }
  
  // Heartbeat every 30 seconds to keep SW active
  keepAliveInterval = setInterval(() => {
    console.log('SW heartbeat:', new Date().toISOString());
    
    // Check if we need to send any missed jokes
    if (currentFrequency && jokeInterval) {
      checkAndSendScheduledJokes();
    }
    
    // Background app refresh - check for updates
    checkForAppUpdates();
  }, 30000);
  
  // Register background sync if available (enabled by default)
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    self.registration.sync.register('ai-joke-sync').catch(err => {
      console.log('Background sync registration failed:', err);
    });
    
    // Register background app refresh sync
    self.registration.sync.register('app-refresh-sync').catch(err => {
      console.log('App refresh sync registration failed:', err);
    });
  }
  
  // Register periodic background sync if available (enabled by default where supported)
  if ('serviceWorker' in navigator && 'periodicSync' in window.ServiceWorkerRegistration.prototype) {
    // AI jokes periodic sync
    self.registration.periodicSync.register('ai-joke-periodic', {
      minInterval: 60 * 60 * 1000 // 1 hour
    }).catch(err => {
      console.log('Periodic background sync registration failed:', err);
    });
    
    // App refresh periodic sync - more frequent for better UX
    self.registration.periodicSync.register('app-refresh-periodic', {
      minInterval: 15 * 60 * 1000 // 15 minutes (minimum allowed by most browsers)
    }).catch(err => {
      console.log('App refresh periodic sync registration failed:', err);
    });
  }
}

// Restore joke state from previous session
async function restoreJokeState() {
  try {
    // Check if jokes were enabled in a previous session
    const clients = await self.clients.matchAll();
    if (clients.length === 0) {
      // No active clients, check if we should restore from stored state
      console.log('No active clients, service worker running in background');
    }
  } catch (error) {
    console.log('Error restoring joke state:', error);
  }
}

// Check for missed jokes and send if necessary
async function checkAndSendScheduledJokes() {
  if (!currentFrequency || !lastJokeTime) {
    return;
  }
  
  const now = Date.now();
  const intervalMs = calculateIntervalMs(currentFrequency);
  const timeSinceLastJoke = now - lastJokeTime;
  
  // If enough time has passed, send a joke
  if (timeSinceLastJoke >= intervalMs) {
    console.log('Sending scheduled joke from background sync');
    sendJokeNotification();
  }
}

// Listen for messages from main thread
self.addEventListener('message', (event) => {
  const { type, enabled, frequency } = event.data;
  
  if (type === 'AI_JOKE_TOGGLE') {
    if (enabled && frequency) {
      currentFrequency = frequency;
      startJokeNotifications(frequency);
    } else {
      stopJokeNotifications();
    }
  } else if (type === 'SEND_JOKE_NOW') {
    sendJokeNotification();
  } else if (type === 'CHECK_FOR_UPDATES') {
    // Force update check by sending version info back
    event.ports[0].postMessage({
      type: 'VERSION_INFO',
      version: CACHE_VERSION
    });
  } else if (type === 'UPDATE_FREQUENCY') {
    if (frequency) {
      currentFrequency = frequency;
      // Restart with new frequency if currently running
      if (jokeInterval) {
        stopJokeNotifications();
        startJokeNotifications(frequency);
      }
    }
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // Focus or open the app window
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // If a window is already open, focus it
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      return self.clients.openWindow('/');
    })
  );
});

function startJokeNotifications(frequency) {
  console.log('Starting AI joke notifications with frequency:', frequency);
  stopJokeNotifications(); // Clear any existing interval
  
  const intervalMs = calculateIntervalMs(frequency);
  
  if (frequency.type === 'specific_days') {
    // Use a shorter interval and check if today is a selected day
    jokeInterval = setInterval(() => {
      if (shouldSendJokeToday(frequency.days)) {
        sendJokeNotification();
      }
    }, intervalMs);
  } else {
    jokeInterval = setInterval(() => {
      sendJokeNotification();
    }, intervalMs);
  }
}

function calculateIntervalMs(frequency) {
  const { type, value, days } = frequency;
  
  switch (type) {
    case 'minutes':
      return value * 60 * 1000;
    case 'hours':
      return value * 60 * 60 * 1000;
    case 'days':
      return value * 24 * 60 * 60 * 1000;
    case 'weeks':
      return value * 7 * 24 * 60 * 60 * 1000;
    case 'months':
      return value * 30 * 24 * 60 * 60 * 1000; // Approximate
    case 'years':
      return value * 365 * 24 * 60 * 60 * 1000; // Approximate
    case 'specific_days':
      // Check every hour if it's time to send
      return 60 * 60 * 1000;
    default:
      return 5 * 60 * 1000; // Default 5 minutes
  }
}

function shouldSendJokeToday(selectedDays) {
  const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
  return selectedDays.includes(today);
}

function stopJokeNotifications() {
  if (jokeInterval) {
    clearInterval(jokeInterval);
    jokeInterval = null;
    console.log('Stopped AI joke notifications');
  }
}

function sendJokeNotification() {
  const joke = AI_JOKES[jokeIndex];
  jokeIndex = (jokeIndex + 1) % AI_JOKES.length;
  lastJokeTime = Date.now(); // Track when joke was sent
  
  const notificationOptions = {
    body: joke,
    icon: '/lovable-uploads/18d38cb4-658a-43aa-8b10-fa6dbd50eae7.png',
    badge: '/lovable-uploads/18d38cb4-658a-43aa-8b10-fa6dbd50eae7.png',
    tag: 'ai-joke',
    requireInteraction: false,
    silent: false,
    renotify: true, // Allow multiple notifications with same tag
    data: {
      timestamp: lastJokeTime,
      joke: joke
    }
  };
  
  self.registration.showNotification('🤖 AI Joke Time!', notificationOptions);
  console.log('Sent joke notification:', joke, 'at', new Date(lastJokeTime).toISOString());
  
  // Trigger background sync to ensure reliability
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    self.registration.sync.register('ai-joke-sync').catch(err => {
      console.log('Background sync registration failed after joke:', err);
    });
  }
}

// Background app refresh functionality
async function checkForAppUpdates() {
  try {
    // Check for new service worker version
    const registration = await self.registration.update();
    if (registration && registration.waiting) {
      console.log('New service worker version detected during background check');
      
      // Notify clients about available update
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'UPDATE_AVAILABLE',
          version: CACHE_VERSION
        });
      });
    }
  } catch (error) {
    console.log('Background app update check failed:', error);
  }
}

async function performBackgroundAppRefresh() {
  console.log('Performing background app refresh');
  
  try {
    // Check for updates
    await checkForAppUpdates();
    
    // Refresh critical cache entries
    const cache = await caches.open(STATIC_CACHE);
    const criticalResources = [
      '/',
      '/manifest.json'
    ];
    
    // Update cache for critical resources
    await Promise.all(
      criticalResources.map(async (resource) => {
        try {
          const response = await fetch(resource, { 
            cache: 'no-cache',
            headers: {
              'Cache-Control': 'no-cache'
            }
          });
          if (response.ok) {
            await cache.put(resource, response.clone());
            console.log('Background refresh updated:', resource);
          }
        } catch (err) {
          console.log('Failed to refresh resource in background:', resource, err);
        }
      })
    );
    
    // Notify clients about successful background refresh
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_REFRESH_COMPLETE',
        timestamp: Date.now()
      });
    });
    
  } catch (error) {
    console.log('Background app refresh failed:', error);
  }
}
