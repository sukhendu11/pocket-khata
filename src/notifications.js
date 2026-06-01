// ==============================================================================
// Notification utility for Pocket Khata bill reminders
// ==============================================================================
// All errors are handled silently — no warnings, no console noise for users.
// The UI layer reads simple boolean/string states from these functions only.

import { t } from './i18n';

/**
 * Check if the browser supports the Notification API.
 * @returns {boolean}
 */
export function isNotificationSupported() {
  return typeof Notification !== 'undefined' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}

/**
 * Get the current notification permission state.
 * @returns {'granted'|'denied'|'default'|'unsupported'}
 */
export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Request notification permission from the user.
 * @returns {Promise<'granted'|'denied'|'default'|'unsupported'>}
 */
export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return 'denied';
  }
}

/**
 * Register the service worker for notification delivery.
 * @returns {Promise<ServiceWorkerRegistration|null>}
 */
export async function registerServiceWorker() {
  if (!isNotificationSupported()) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch {
    return null;
  }
}

/**
 * Send a notification via the service worker.
 * @param {string} title
 * @param {string} body
 * @param {string} [tag]
 * @param {object} [data]
 */
export async function showNotification(title, body, tag, data = {}) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return;
  try {
    const registration = await navigator.serviceWorker.ready;
    if (registration.active) {
      registration.active.postMessage({
        type: 'SHOW_NOTIFICATION',
        payload: { title, body, tag, data },
      });
    }
  } catch {
    // Silently fail
  }
}

/**
 * Check all reminders and fire notifications for due/overdue items.
 * Tracks already-shown notifications via tags to avoid duplicates.
 *
 * @param {Array} reminders
 * @param {Set} [shownTags]
 * @param {string} [lang]
 * @returns {{ notifiedCount: number, updatedShownTags: Set }}
 */
export function checkReminders(reminders, shownTags = new Set(), lang = 'en') {
  if (!Array.isArray(reminders) || Notification.permission !== 'granted') {
    return { notifiedCount: 0, updatedShownTags: shownTags };
  }

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  let notifiedCount = 0;
  const newShown = new Set(shownTags);

  // Locale-aware amount formatting
  const formatAmount = (amount) => {
    if (lang === 'bn') return amount.toLocaleString('bn-BD');
    return amount.toLocaleString();
  };

  reminders.forEach((rem) => {
    if (rem.status !== 'unpaid') return;

    let body = '';
    let tag = '';

    if (rem.dueDate === todayStr) {
      body = t('notif.dueToday', lang).replace('{name}', rem.name).replace('{amount}', formatAmount(rem.amount));
      tag = `reminder-due-${rem.id}-${todayStr}`;
    } else if (rem.dueDate === tomorrowStr) {
      body = t('notif.dueTomorrow', lang).replace('{name}', rem.name).replace('{amount}', formatAmount(rem.amount));
      tag = `reminder-due-tomorrow-${rem.id}-${tomorrowStr}`;
    } else if (rem.dueDate < todayStr) {
      const daysOverdue = Math.floor((today.getTime() - new Date(rem.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      const pluralS = daysOverdue > 1 ? 's' : '';
      body = t('notif.overdueDays', lang)
        .replace('{name}', rem.name)
        .replace('{days}', String(daysOverdue))
        .replace('{s}', lang === 'bn' ? '' : pluralS)
        .replace('{amount}', formatAmount(rem.amount));
      tag = `reminder-overdue-${rem.id}-${todayStr}`;
    }

    if (body && tag && !newShown.has(tag)) {
      showNotification(t('notif.reminderTitle', lang), body, tag, { reminderId: rem.id });
      newShown.add(tag);
      notifiedCount++;
    }
  });

  // Cap at 200 entries to prevent unbounded growth
  const trimmed = new Set([...newShown].slice(-200));
  return { notifiedCount, updatedShownTags: trimmed };
}

/**
 * Cache reminder data in the Cache API for service worker access.
 * @param {Array} reminders
 * @param {string} [lang]
 */
export async function cacheRemindersForSW(reminders, lang = 'en') {
  if (!isNotificationSupported()) return;
  try {
    const cache = await caches.open('pocket-khata-reminder-data');
    const payload = {
      reminders: Array.isArray(reminders) ? reminders : [],
      lang,
      syncedAt: new Date().toISOString(),
    };
    await cache.put('/__pk_reminder_data__', new Response(JSON.stringify(payload)));
  } catch {
    // Progressive enhancement — fail silently
  }
}

/**
 * Register periodic background sync for reminder checks.
 */
export async function registerPeriodicSync() {
  if (!isNotificationSupported()) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      if ('periodicSync' in registration) {
        await registration.periodicSync.register('pocket-khata-reminder-check', {
          minInterval: 12 * 60 * 60 * 1000,
        });
      }
    }
  } catch {
    // Progressive enhancement — fail silently
  }
}

/**
 * Check if a service worker is registered and active.
 * @returns {Promise<boolean>}
 */
export async function isServiceWorkerActive() {
  if (!isNotificationSupported()) return false;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    return registrations.length > 0;
  } catch {
    return false;
  }
}
