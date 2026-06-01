// ==============================================================================
// Notification utility for Pocket Khata bill reminders
// ==============================================================================
// Uses Capacitor's LocalNotifications plugin for native Android permission
// requests (POST_NOTIFICATIONS on Android 13+), with Web Notification API
// fallback for browser/PWA environments.
//
// The @capacitor/local-notifications import is lazy (dynamic import inside
// functions) so this module loads safely in any environment — browser dev,
// test runner, or Capacitor native. Native plugin functions are only invoked
// when Capacitor.isNativePlatform() is true.
// ==============================================================================
// All errors are handled silently — no warnings, no console noise for users.
// The UI layer reads simple boolean/string states from these functions only.

import { Capacitor } from '@capacitor/core';
import { t } from './i18n';

/**
 * Lazy-load the Capacitor LocalNotifications plugin.
 * Only called when the app is on a native platform.
 * Returns null if the plugin isn't available (import fails).
 */
async function getLocalNotifications() {
  try {
    const mod = await import('@capacitor/local-notifications');
    return mod.LocalNotifications;
  } catch {
    return null;
  }
}

/**
 * Check if notifications are available in the current environment.
 * Returns true if either the Web Notification API is available OR
 * the app is running on a Capacitor native platform.
 * @returns {boolean}
 */
export function isNotificationSupported() {
  const webSupported = typeof Notification !== 'undefined' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
  try {
    const nativeSupported = Capacitor.isNativePlatform();
    return webSupported || nativeSupported;
  } catch {
    return webSupported;
  }
}

/**
 * Get the current notification permission state.
 * Uses Capacitor's checkPermissions() on native, falls back to Web API.
 * @returns {Promise<'granted'|'denied'|'default'|'unsupported'>}
 */
export async function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';

  // Capacitor native path: use plugin's checkPermissions()
  if (Capacitor.isNativePlatform()) {
    const LocalNotifications = await getLocalNotifications();
    if (LocalNotifications) {
      try {
        const permResult = await LocalNotifications.checkPermissions();
        if (permResult.display === 'granted') return 'granted';
        if (permResult.display === 'denied') return 'denied';
        return 'default';
      } catch {
        return 'default';
      }
    }
    return 'default';
  }

  // Web API fallback
  return Notification.permission;
}

/**
 * Request notification permission from the user.
 * Uses Capacitor's requestPermissions() on native for reliable Android runtime
 * dialog (POST_NOTIFICATIONS on Android 13+), falls back to Web API in browser.
 * @returns {Promise<'granted'|'denied'|'default'|'unsupported'>}
 */
export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';

  // Capacitor native path: triggers the Android runtime permission dialog
  if (Capacitor.isNativePlatform()) {
    const LocalNotifications = await getLocalNotifications();
    if (LocalNotifications) {
      try {
        const permResult = await LocalNotifications.requestPermissions();
        if (permResult.display === 'granted') return 'granted';
        if (permResult.display === 'denied') return 'denied';
        return 'default';
      } catch {
        return 'denied';
      }
    }
    return 'denied';
  }

  // Web API fallback (browser/PWA)
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
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch {
    return null;
  }
}

/**
 * Send a notification via the service worker or Capacitor LocalNotifications.
 * Falls back to Capacitor LocalNotifications.schedule() on native platforms
 * where the Web Notification API may not be reliable.
 * @param {string} title
 * @param {string} body
 * @param {string} [tag]
 * @param {object} [data]
 */
export async function showNotification(title, body, tag, data = {}) {
  // Capacitor native path: use LocalNotifications plugin directly
  if (Capacitor.isNativePlatform()) {
    const LocalNotifications = await getLocalNotifications();
    if (LocalNotifications) {
      try {
        const perm = await getNotificationPermission();
        if (perm !== 'granted') return;
        await LocalNotifications.schedule({
          notifications: [{
            title,
            body,
            id: tag ? hashTag(tag) : Date.now(),
            smallIcon: 'ic_launcher_foreground',
            largeIcon: 'ic_launcher_foreground',
            actionTypeId: '',
            extra: data,
          }],
        });
      } catch {
        // Silently fail
      }
    }
    return;
  }

  // Web API fallback
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
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
 * Simple string hash for converting tag strings to numeric IDs for Capacitor.
 * @param {string} str
 * @returns {number}
 */
function hashTag(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Check all reminders and fire notifications for due/overdue items.
 * Tracks already-shown notifications via tags to avoid duplicates.
 *
 * @param {Array} reminders
 * @param {Set} [shownTags]
 * @param {string} [lang]
 * @returns {Promise<{ notifiedCount: number, updatedShownTags: Set }>}
 */
export async function checkReminders(reminders, shownTags = new Set(), lang = 'en') {
  if (!Array.isArray(reminders)) {
    return { notifiedCount: 0, updatedShownTags: shownTags };
  }

  // Check permission asynchronously
  const perm = await getNotificationPermission();
  if (perm !== 'granted') {
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
  if (!isNotificationSupported() || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
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
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    return registrations.length > 0;
  } catch {
    return false;
  }
}
