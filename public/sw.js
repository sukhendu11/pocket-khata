// Pocket Khata — Service Worker
// Handles notification display for bill reminders + basic asset caching

const CACHE_NAME = 'pocket-khata-cache-v1';
const REMINDER_CACHE_NAME = 'pocket-khata-reminder-data';

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
          .filter((name) => name !== CACHE_NAME && name !== REMINDER_CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Take control of all clients immediately
  self.clients.claim();
});

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

// ─── Message: Show notification from the app ─────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, data } = event.data.payload;

    self.registration.showNotification(title, {
      body,
      icon: BASE_URL + 'pwa-icon-192.svg',
      badge: BASE_URL + 'pwa-icon-192.svg',
      tag: tag || 'pocket-khata-reminder',
      data: data || {},
      vibrate: [200, 100, 200],
      requireInteraction: true,
      silent: false,
    });
  }
});

// ─── Periodic Background Sync: Check reminders when the app is closed ──────
// ─── Progressive enhancement — only supported in Chromium browsers ─────────

// Localized notification templates (same structure as src/i18n.js)
// Used by periodic sync since the i18n module isn't available in SW context
const NOTIF_STRINGS = {
  en: {
    dueToday: '\u0022{name}\u0022 is due today — \u09F3{amount}',
    dueTomorrow: '\u0022{name}\u0022 is due tomorrow — \u09F3{amount}',
    overdueDays: '\u0022{name}\u0022 is overdue by {days} day{s} — \u09F3{amount}',
  },
  bn: {
    dueToday: '\u0022{name}\u0022 \u0986\u099C\u0995\u09C7 \u09AA\u09B0\u09BF\u09B6\u09CB\u09A7 \u0995\u09B0\u09A4\u09C7 \u09B9\u09AC\u09C7 — \u09F3{amount}',
    dueTomorrow: '\u0022{name}\u0022 \u0986\u0997\u09BE\u09AE\u09C0\u0995\u09BE\u09B2 \u09AA\u09B0\u09BF\u09B6\u09CB\u09A7 \u0995\u09B0\u09A4\u09C7 \u09B9\u09AC\u09C7 — \u09F3{amount}',
    overdueDays: '\u0022{name}\u0022 {days} \u09A6\u09BF\u09A8 \u09AE\u09C7\u09AF\u09BC\u09BE\u09A6\u09CB\u09A4\u09CD\u09A4\u09C0\u09B0\u09CD\u09A3 — \u09F3{amount}',
  },
};

/**
 * Format amount with locale-aware digits.
 * Bangla locale uses Bengali digits (\u09E6-\u09EF) for 0-9.
 */
function formatAmount(amount, lang) {
  if (lang === 'bn') {
    return amount.toLocaleString('bn-BD');
  }
  return amount.toLocaleString();
}

/**
 * Read cached reminder data and show notifications for due/overdue reminders.
 * Data is cached by the app on every reminders/lang change.
 */
async function checkAndNotifyReminders() {
  try {
    const cache = await caches.open(REMINDER_CACHE_NAME);
    const response = await cache.match('/__pk_reminder_data__');
    if (!response) return;

    const data = await response.json();
    const { reminders, lang } = data;
    if (!Array.isArray(reminders) || reminders.length === 0) return;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const strings = NOTIF_STRINGS[lang] || NOTIF_STRINGS['en'];

    for (const rem of reminders) {
      if (rem.status !== 'unpaid') continue;

      let body = '';
      let tag = '';

      if (rem.dueDate === todayStr) {
        body = strings.dueToday
          .replace(/{name}/g, rem.name)
          .replace(/{amount}/g, formatAmount(rem.amount, lang));
        tag = `reminder-due-${rem.id}-${todayStr}`;
      } else if (rem.dueDate === tomorrowStr) {
        body = strings.dueTomorrow
          .replace(/{name}/g, rem.name)
          .replace(/{amount}/g, formatAmount(rem.amount, lang));
        tag = `reminder-due-tomorrow-${rem.id}-${tomorrowStr}`;
      } else if (rem.dueDate < todayStr) {
        const daysOverdue = Math.floor((today.getTime() - new Date(rem.dueDate).getTime()) / (1000 * 60 * 60 * 24));
        const pluralS = daysOverdue > 1 ? 's' : '';
        body = strings.overdueDays
          .replace(/{name}/g, rem.name)
          .replace(/{days}/g, String(daysOverdue))
          .replace(/{s}/g, lang === 'bn' ? '' : pluralS)
          .replace(/{amount}/g, formatAmount(rem.amount, lang));
        tag = `reminder-overdue-${rem.id}-${todayStr}`;
      }

      if (body && tag) {
        self.registration.showNotification('\uD83D\uDCCB Bill Reminder', {
          body,
          icon: BASE_URL + 'pwa-icon-192.svg',
          badge: BASE_URL + 'pwa-icon-192.svg',
          tag,
          vibrate: [200, 100, 200],
          requireInteraction: true,
          silent: false,
        });
      }
    }
  } catch (e) {
    // Periodic sync is a progressive enhancement — fail silently
  }
}

// ─── Periodic sync event ────────────────────────────────────────────────────
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'pocket-khata-reminder-check') {
    event.waitUntil(checkAndNotifyReminders());
  }
});

// ─── Notification click: Open the app and focus existing window ──────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Use the SW scope as the app's base URL (works for root + subfolder deployments)
  const appUrl = BASE_URL;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Try to find an existing client under our scope
      for (const client of windowClients) {
        if (client.url.startsWith(appUrl)) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      return clients.openWindow(appUrl);
    })
  );
});
