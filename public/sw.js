// Import storage utility
importScripts('/sw-storage.js');

// Service Worker for AI Joke Notifications - Enhanced with Persistence
const CACHE_VERSION = '1.3.0';
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

// Persistent state management
let storage = null;
let notificationState = {
  enabled: false,
  frequency: null,
  nextNotificationTime: null,
  jokeIndex: 0
};

let checkInterval = null;
let keepAliveInterval = null;

// Initialize storage and restore state
async function initializeServiceWorker() {
  try {
    storage = new SWStorage();
    await storage.init();
    await restoreNotificationState();
    startPeriodicCheck();
    console.log(`Service Worker v${CACHE_VERSION} initialized with persistent state`);
  } catch (error) {
    console.error('Failed to initialize service worker storage:', error);
  }
}

// Restore notification state from persistent storage
async function restoreNotificationState() {
  try {
    const savedState = await storage.get('notificationState');
    if (savedState) {
      notificationState = { ...notificationState, ...savedState };
      console.log('Restored notification state:', notificationState);
      
      // If notifications were enabled, resume checking
      if (notificationState.enabled && notificationState.frequency) {
        console.log('Resuming notification schedule after service worker restart');
        scheduleNextNotification();
      }
    }
  } catch (error) {
    console.error('Failed to restore notification state:', error);
  }
}

// Save notification state to persistent storage
async function saveNotificationState() {
  try {
    await storage.set('notificationState', notificationState);
  } catch (error) {
    console.error('Failed to save notification state:', error);
  }
}

// Calculate next notification time based on frequency
function calculateNextNotificationTime(frequency) {
  const now = Date.now();
  const { type, value, days } = frequency;
  
  let intervalMs;
  
  switch (type) {
    case 'minutes':
      intervalMs = value * 60 * 1000;
      break;
    case 'hours':
      intervalMs = value * 60 * 60 * 1000;
      break;
    case 'days':
      intervalMs = value * 24 * 60 * 60 * 1000;
      break;
    case 'weeks':
      intervalMs = value * 7 * 24 * 60 * 60 * 1000;
      break;
    case 'months':
      intervalMs = value * 30 * 24 * 60 * 60 * 1000;
      break;
    case 'years':
      intervalMs = value * 365 * 24 * 60 * 60 * 1000;
      break;
    case 'specific_days':
      // For specific days, find the next occurrence
      return calculateNextSpecificDayTime(days);
    default:
      intervalMs = 5 * 60 * 1000; // Default 5 minutes
  }
  
  return now + intervalMs;
}

// Calculate next notification time for specific days
function calculateNextSpecificDayTime(selectedDays) {
  const now = new Date();
  const currentDay = now.getDay();
  const currentHour = now.getHours();
  
  // Find next selected day
  let daysUntilNext = null;
  
  for (let i = 0; i < 7; i++) {
    const checkDay = (currentDay + i) % 7;
    if (selectedDays.includes(checkDay)) {
      if (i === 0 && currentHour < 9) {
        // Today at 9 AM if it's before 9 AM
        daysUntilNext = 0;
        break;
      } else if (i > 0) {
        // Next selected day at 9 AM
        daysUntilNext = i;
        break;
      }
    }
  }
  
  if (daysUntilNext === null) {
    daysUntilNext = 7; // Default to next week
  }
  
  const nextTime = new Date();
  nextTime.setDate(nextTime.getDate() + daysUntilNext);
  nextTime.setHours(9, 0, 0, 0); // 9 AM
  
  return nextTime.getTime();
}

// Schedule next notification
async function scheduleNextNotification() {
  if (!notificationState.enabled || !notificationState.frequency) {
    return;
  }
  
  notificationState.nextNotificationTime = calculateNextNotificationTime(notificationState.frequency);
  await saveNotificationState();
  
  console.log('Next notification scheduled for:', new Date(notificationState.nextNotificationTime).toISOString());
}

// Start periodic check for notifications (every 30 seconds)
function startPeriodicCheck() {
  if (checkInterval) clearInterval(checkInterval);
  
  checkInterval = setInterval(async () => {
    try {
      await checkForPendingNotifications();
      
      // Keep alive heartbeat
      console.log('SW heartbeat:', new Date().toISOString());
    } catch (error) {
      console.error('Error in periodic check:', error);
    }
  }, 30000);
  
  // Start keep-alive mechanism
  startKeepAlive();
}

// Check for pending notifications
async function checkForPendingNotifications() {
  if (!notificationState.enabled || !notificationState.nextNotificationTime) {
    return;
  }
  
  const now = Date.now();
  
  if (now >= notificationState.nextNotificationTime) {
    console.log('Time to send notification!');
    await sendJokeNotification();
    await scheduleNextNotification();
  }
}

// Send joke notification
async function sendJokeNotification() {
  const joke = AI_JOKES[notificationState.jokeIndex];
  notificationState.jokeIndex = (notificationState.jokeIndex + 1) % AI_JOKES.length;
  
  const notificationOptions = {
    body: joke,
    icon: '/lovable-uploads/18d38cb4-658a-43aa-8b10-fa6dbd50eae7.png',
    badge: '/lovable-uploads/18d38cb4-658a-43aa-8b10-fa6dbd50eae7.png',
    tag: 'ai-joke',
    requireInteraction: false,
    silent: false,
    renotify: true,
    data: {
      timestamp: Date.now(),
      joke: joke
    }
  };
  
  try {
    await self.registration.showNotification('🤖 AI Joke Time!', notificationOptions);
    console.log('Sent joke notification:', joke);
    
    // Save updated state
    await saveNotificationState();
    
    // Trigger background sync
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      await self.registration.sync.register('ai-joke-sync').catch(console.error);
    }
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}

// Keep alive mechanism
function startKeepAlive() {
  if (keepAliveInterval) clearInterval(keepAliveInterval);
  
  // More frequent keep-alive for better reliability
  keepAliveInterval = setInterval(() => {
    // Perform minimal operations to keep SW active
    console.log('Keep-alive tick');
  }, 25000);
}

// Install event
self.addEventListener('install', (event) => {
  console.log(`Service Worker v${CACHE_VERSION} installing...`);
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.json',
        '/lovable-uploads/18d38cb4-658a-43aa-8b10-fa6dbd50eae7.png'
      ]);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log(`Service Worker v${CACHE_VERSION} activated`);
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.startsWith('rooted-ai-v') && 
                cacheName !== CACHE_NAME && 
                cacheName !== STATIC_CACHE && 
                cacheName !== API_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of clients
      self.clients.claim(),
      // Initialize persistent storage and state
      initializeServiceWorker()
    ]).then(() => {
      // Notify clients about update
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SW_UPDATED',
            version: CACHE_VERSION
          });
        });
      });
    }).then(() => {
      // Register background sync
      try {
        return self.registration.sync.register('ai-joke-sync');
      } catch (error) {
        console.log('Background sync not available:', error);
      }
    }).then(() => {
      // Register periodic background sync
      try {
        if ('periodicSync' in self.registration) {
          return self.registration.periodicSync.register('ai-joke-periodic', {
            minInterval: 60 * 60 * 1000 // 1 hour
          });
        }
      } catch (error) {
        console.log('Periodic background sync not available:', error);
      }
    })
  );
});

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'ai-joke-sync') {
    event.waitUntil(checkForPendingNotifications());
  }
});

// Periodic background sync
self.addEventListener('periodicsync', (event) => {
  console.log('Periodic sync triggered:', event.tag);
  
  if (event.tag === 'ai-joke-periodic') {
    event.waitUntil(checkForPendingNotifications());
  }
});

// Message handling from main thread
self.addEventListener('message', async (event) => {
  const { type, enabled, frequency } = event.data;
  
  try {
    switch (type) {
      case 'AI_JOKE_TOGGLE':
        notificationState.enabled = enabled;
        if (enabled && frequency) {
          notificationState.frequency = frequency;
          await scheduleNextNotification();
          console.log('AI jokes enabled with frequency:', frequency);
        } else {
          notificationState.nextNotificationTime = null;
          console.log('AI jokes disabled');
        }
        await saveNotificationState();
        break;
        
      case 'SEND_JOKE_NOW':
        await sendJokeNotification();
        break;
        
      case 'UPDATE_FREQUENCY':
        if (frequency) {
          notificationState.frequency = frequency;
          if (notificationState.enabled) {
            await scheduleNextNotification();
          }
          await saveNotificationState();
          console.log('Frequency updated:', frequency);
        }
        break;
        
      case 'CHECK_FOR_UPDATES':
        event.ports[0].postMessage({
          type: 'VERSION_INFO',
          version: CACHE_VERSION
        });
        break;
        
      case 'GET_NOTIFICATION_STATUS':
        event.ports[0].postMessage({
          type: 'NOTIFICATION_STATUS',
          state: notificationState
        });
        break;
    }
  } catch (error) {
    console.error('Error handling message:', error);
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          return client.focus();
        }
      }
      return self.clients.openWindow('/');
    })
  );
});

// Fetch event for caching
self.addEventListener('fetch', (event) => {
  // Basic caching strategy for static assets
  if (event.request.destination === 'image' || 
      event.request.url.includes('/lovable-uploads/')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((fetchResponse) => {
          const responseClone = fetchResponse.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return fetchResponse;
        });
      })
    );
  }
});
