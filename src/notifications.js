// Notification utility for Pocket Khata bill reminders
// Handles permission requests, service worker messaging, and periodic checking

import { trackError } from './lib/analytics';

/**
 * Check if the browser supports the Notification API and service workers.
 */
export function isNotificationSupported() {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Request notification permission from the user.
 * @returns {Promise<'granted'|'denied'|'default'>} The permission state.
 */
export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return 'denied';

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (e) {
    trackError(e, { handler: 'requestNotificationPermission' });
    console.error('Error requesting notification permission:', e);
    return 'denied';
  }
}

/**
 * Get the current notification permission state.
 * @returns {string} 'granted', 'denied', or 'default' (or 'unsupported').
 */
export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Register the service worker for notification handling.
 * @returns {Promise<ServiceWorkerRegistration|null>}
 */
export async function registerServiceWorker() {
  if (!isNotificationSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    return registration;
  } catch (e) {
    trackError(e, { handler: 'registerServiceWorker' });
    console.error('Service worker registration failed:', e);
    return null;
  }
}

/**
 * Send a message to the service worker to show a notification.
 * @param {string} title - Notification title
 * @param {string} body - Notification body text
 * @param {string} [tag] - Optional unique tag for grouping
 * @param {object} [data] - Optional data payload
 */
export async function showNotification(title, body, tag, data = {}) {
  if (!isNotificationSupported()) return;

  // If permission not granted, do nothing
  if (Notification.permission !== 'granted') return;

  try {
    const registration = await navigator.serviceWorker.ready;
    if (registration.active) {
      registration.active.postMessage({
        type: 'SHOW_NOTIFICATION',
        payload: { title, body, tag, data },
      });
    }
  } catch (e) {
    trackError(e, { handler: 'showNotification', tag });
    console.error('Failed to show notification:', e);
  }
}

/**
 * Check all reminders and show notifications for:
 * - Reminders due today
 * - Overdue reminders (only once, tracked via shownTags)
 * @param {Array} reminders - Array of reminder objects with {id, name, dueDate, status, amount}
 * @param {Set} shownTags - Set of notification tags already shown (to avoid repeats)
 * @returns {object} { notifiedCount: number, updatedShownTags: Set }
 */
export function checkReminders(reminders, shownTags = new Set()) {
  if (!Array.isArray(reminders) || Notification.permission !== 'granted') {
    return { notifiedCount: 0, updatedShownTags: shownTags };
  }

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  // Tomorrow's date for "due tomorrow" notifications
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  let notifiedCount = 0;
  const newShown = new Set(shownTags);

  reminders.forEach((rem) => {
    if (rem.status !== 'unpaid') return;

    let notificationBody = '';
    let tag = '';

    // Due today
    if (rem.dueDate === todayStr) {
      notificationBody = `"${rem.name}" is due today — ৳${rem.amount.toLocaleString()}`;
      tag = `reminder-due-${rem.id}-${todayStr}`;
    }
    // Due tomorrow
    else if (rem.dueDate === tomorrowStr) {
      notificationBody = `"${rem.name}" is due tomorrow — ৳${rem.amount.toLocaleString()}`;
      tag = `reminder-due-tomorrow-${rem.id}-${tomorrowStr}`;
    }
    // Overdue
    else if (rem.dueDate < todayStr) {
      const daysOverdue = Math.floor((today.getTime() - new Date(rem.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      notificationBody = `"${rem.name}" is overdue by ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} — ৳${rem.amount.toLocaleString()}`;
      tag = `reminder-overdue-${rem.id}-${todayStr}`;
    }

    if (notificationBody && tag) {
      // Only show if we haven't shown this exact notification before
      if (!newShown.has(tag)) {
        showNotification('📋 Bill Reminder', notificationBody, tag, { reminderId: rem.id });
        newShown.add(tag);
        notifiedCount++;
      }
    }
  });

  // Limit the shown tags set to the last 200 to avoid unbounded growth
  const trimmedSet = new Set([...newShown].slice(-200));

  return { notifiedCount, updatedShownTags: trimmedSet };
}

/**
 * Validate that the service worker is installed and active.
 * @returns {Promise<boolean>}
 */
export async function isServiceWorkerActive() {
  if (!isNotificationSupported()) return false;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    return registrations.length > 0;
  } catch (e) {
    trackError(e, { handler: 'isServiceWorkerActive' });
    return false;
  }
}
