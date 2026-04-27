// Service Worker for Kicker Stats Push Notifications
// This handles push notifications and background sync

const CACHE_NAME = 'kicker-stats-v1';
const urlsToCache = [
  '/kicker-stats.html',
  '/enough.min.css',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  let notificationData = {
    title: '💀 Wall of Shame Update!',
    body: 'Someone just got destroyed 0:10!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: 'wall-of-shame',
    requireInteraction: false,
    vibrate: [200, 100, 200]
  };

  // Parse the push data if available
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        tag: data.tag || notificationData.tag,
        data: data.url ? { url: data.url } : undefined,
        requireInteraction: false,
        vibrate: [200, 100, 200]
      };
    } catch (e) {
      console.error('Error parsing push data:', e);
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  // Open the app and navigate to statistics tab (where wall of shame is)
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if the app is already open
        for (const client of clientList) {
          if (client.url.includes('kicker-stats.html') && 'focus' in client) {
            return client.focus().then(() => {
              // Send message to open statistics tab
              client.postMessage({
                type: 'NAVIGATE_TO_STATS',
                section: 'wall-of-shame'
              });
            });
          }
        }
        // If not open, open a new window
        if (clients.openWindow) {
          return clients.openWindow('/kicker-stats.html?tab=statistics');
        }
      })
  );
});
