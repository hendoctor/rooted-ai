// Service Worker for AI Joke Notifications
const CACHE_NAME = 'rooted-ai-v1';
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

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(self.clients.claim());
});

// Listen for messages from main thread
self.addEventListener('message', (event) => {
  const { type, enabled } = event.data;
  
  if (type === 'AI_JOKE_TOGGLE') {
    if (enabled) {
      startJokeNotifications();
    } else {
      stopJokeNotifications();
    }
  } else if (type === 'SEND_JOKE_NOW') {
    sendJokeNotification();
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

function startJokeNotifications() {
  console.log('Starting AI joke notifications...');
  stopJokeNotifications(); // Clear any existing interval
  
  jokeInterval = setInterval(() => {
    sendJokeNotification();
  }, 5 * 60 * 1000); // 5 minutes
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
  
  const notificationOptions = {
    body: joke,
    icon: '/lovable-uploads/18d38cb4-658a-43aa-8b10-fa6dbd50eae7.png',
    badge: '/lovable-uploads/18d38cb4-658a-43aa-8b10-fa6dbd50eae7.png',
    tag: 'ai-joke',
    requireInteraction: false,
    silent: false,
    data: {
      timestamp: Date.now(),
      joke: joke
    }
  };
  
  self.registration.showNotification('🤖 AI Joke Time!', notificationOptions);
  console.log('Sent joke notification:', joke);
}
