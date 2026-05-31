// Pocket Khata — Service Worker
// Basic asset caching + offline support

const CACHE_NAME = 'pocket-khata-cache-v1';

// ─── Determine base path dynamically (works for both root & subfolder deployments) ─
const BASE_URL = self.registration ? self.registration.scope : '/';

// ─── Skip caching in development (localhost) to avoid stale caches ──────────────
const IS_LOCALHOST = self.location && (
  self.location.hostname === 'localhost' ||
  self.location.hostname === '127.0.0.1' ||
  self.location.hostname.includes('192.168.') ||
  self.location.hostname.includes('10.0.')
);

// ─── Install: Pre-cache core assets (production only) ─────────────────────────
self.addEventListener('install', (event) => {
  if (!IS_LOCALHOST) {
    const ASSETS_TO_CACHE = [
      BASE_URL,
      BASE_URL + 'index.html',
      BASE_URL + 'manifest.json',
      BASE_URL + 'vite.svg',
      BASE_URL + 'pwa-icon-192.svg',
      BASE_URL + 'pwa-icon-512.svg',
    ];
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE);
      }).catch((err) => {
        console.error('[SW] Cache install failed (non-critical):', err);
      })
    );
  }
  // Activate immediately — don't wait for page refresh
  self.skipWaiting();
});

// ─── Activate: Clean up old caches ────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// [REMINDERS] Reminder notification cache name — kept for future implementation
// const REMINDER_CACHE = 'pocket-khata-reminders-v1';

// [REMINDERS] Check stored reminders and notify if any are overdue
// async function checkAndNotifyReminders() {
//   try {
//     const cache = await caches.open(REMINDER_CACHE);
//     const cachedRequests = await cache.keys();
//     for (const request of cachedRequests) {
//       const response = await cache.match(request);
//       if (response) {
//         const reminder = await response.json();
//         if (!reminder.paid) {
//           const dueDate = new Date(reminder.dueDate);
//           const today = new Date();
//           const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
//           if (daysOverdue > 0) {
//             self.registration.showNotification('Bill Reminder', {
//               body: `${reminder.title}: ৳${reminder.amount} overdue by ${daysOverdue} day(s)`,
//               icon: '/pwa-icon-192.png',
//               tag: `reminder-${reminder.id}`,
//               data: { reminderId: reminder.id, url: self.location.origin + '/' },
//             });
//           }
//         }
//       }
//     }
//   } catch (e) {
//     console.error('[SW] Reminder check failed:', e);
//   }
// }

// [REMINDERS] Periodic sync event for checking reminders (kept for future use)
// self.addEventListener('periodicsync', (event) => {
//   if (event.tag === 'check-reminders') {
//     event.waitUntil(checkAndNotifyReminders());
//   }
// });

// ─── Fetch: Network-first in dev, cache-first in production ──────────────────
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  if (IS_LOCALHOST) {
    // Dev mode: always fetch from network (no cache)
    event.respondWith(fetch(event.request).catch(() => {
      return caches.match(event.request);
    }));
  } else {
    // Production: cache-first, fallback to network
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return cachedResponse || fetch(event.request);
      })
    );
  }
});

// [REMINDERS] Notification click: Open the app on reminder notification — kept for future implementation
// self.addEventListener('notificationclick', (event) => {
//   event.notification.close();
//   const appUrl = BASE_URL;
//   event.waitUntil(
//     clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
//       for (const client of windowClients) {
//         if (client.url.startsWith(appUrl)) {
//           return client.focus();
//         }
//       }
//       return clients.openWindow(appUrl);
//     })
//   );
// });
