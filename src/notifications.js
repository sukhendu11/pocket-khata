// ==============================================================================
// Notification utility for Pocket Khata bill reminders
// ==============================================================================
// Pure Web Notification API — no Capacitor dependencies, no dynamic imports.
// On Android (Capacitor WebView), the Web Notification API is bridged to the
// native POST_NOTIFICATIONS permission dialog by the Android system.
// ==============================================================================

/**
 * Check if notifications are supported in the current environment.
 * @returns {boolean}
 */
export function isNotificationSupported() {
  return typeof Notification !== 'undefined';
}

/**
 * Get the current notification permission state.
 * @returns {Promise<'granted'|'denied'|'default'|'unsupported'>}
 */
export async function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    return Notification.permission;
  } catch {
    return 'default';
  }
}

/**
 * Request notification permission from the user.
 * Triggers the Android runtime permission dialog (POST_NOTIFICATIONS on
 * Android 13+) via the WebView bridge.
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
 * Register the service worker for PWA support.
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
