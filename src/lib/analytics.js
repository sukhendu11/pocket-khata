/**
 * Analytics system for Pocket Khata.
 *
 * Privacy-first design:
 * - No tracking without explicit user consent (Allow/Decline popup)
 * - No personal or financial data is ever collected
 * - Events are queued locally and synced to Supabase when online
 * - If Supabase is unavailable, data stays in localStorage (never lost)
 *
 * Event types:
 *   screen_view  — Navigation between screens
 *   user_action  — User interactions (add/edit/delete transactions, etc.)
 *   error        — JavaScript errors caught by ErrorBoundary
 *   device_info  — Anonymous device/environment snapshot
 *
 * The `metadata` field is a flexible JSONB object designed to support
 * future analytics, debugging, and feature planning dashboards.
 */

import { isSupabaseConfigured, bulkInsertAnalyticsEvents } from './supabase';

// ========== CONSTANTS ==========

const CONSENT_KEY = 'pocket_khata_analytics_consent';
const EVENTS_QUEUE_KEY = 'pocket_khata_analytics_queue';
const LAST_SYNC_KEY = 'pocket_khata_analytics_last_sync';
const MAX_QUEUE_SIZE = 500;
const SYNC_INTERVAL_MS = 60000;

// ========== CONSENT MANAGEMENT ==========

/**
 * Get the current analytics consent status.
 * @returns {'granted' | 'denied' | null} null means first-time (no choice yet)
 */
export function getConsent() {
  const val = localStorage.getItem(CONSENT_KEY);
  if (val === 'granted') return 'granted';
  if (val === 'denied') return 'denied';
  return null;
}

/**
 * Set analytics consent.
 * @param {'granted' | 'denied'} status
 */
export function setConsent(statusVal) {
  if (statusVal !== 'granted' && statusVal !== 'denied') return;
  localStorage.setItem(CONSENT_KEY, statusVal);
  if (statusVal === 'granted') {
    flushEvents();
  }
}

/** Reset consent (allows the popup to show again) */
export function resetConsent() {
  localStorage.removeItem(CONSENT_KEY);
  localStorage.removeItem(EVENTS_QUEUE_KEY);
  localStorage.removeItem(LAST_SYNC_KEY);
}

/** Whether analytics tracking is currently active */
export function isTrackingAllowed() {
  return getConsent() === 'granted';
}

// ========== EVENT QUEUE ==========

function getQueue() {
  try {
    const raw = localStorage.getItem(EVENTS_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue) {
  if (queue.length > MAX_QUEUE_SIZE) {
    queue = queue.slice(queue.length - MAX_QUEUE_SIZE);
  }
  localStorage.setItem(EVENTS_QUEUE_KEY, JSON.stringify(queue));
}

function enqueueEvent(eventType, eventName, metadata = {}) {
  if (!isTrackingAllowed()) return;

  const evt = {
    event_type: eventType,
    event_name: eventName,
    timestamp: new Date().toISOString(),
    device_info: getDeviceInfo(),
    metadata,
  };

  const queue = getQueue();
  queue.push(evt);
  saveQueue(queue);

  const lastSync = getLastSyncTime();
  if (Date.now() - lastSync > SYNC_INTERVAL_MS) {
    setTimeout(() => flushEvents(), 0);
  }
}

// ========== DEVICE INFO ==========

export function getDeviceInfo() {
  if (typeof window === 'undefined') {
    return { environment: 'ssr' };
  }

  return {
    screenWidth: window.screen?.width || 0,
    screenHeight: window.screen?.height || 0,
    viewportWidth: window.innerWidth || 0,
    viewportHeight: window.innerHeight || 0,
    language: navigator.language || '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    userAgent: navigator.userAgent?.slice(0, 200) || '',
    platform: navigator.platform || '',
    isOnline: navigator.onLine,
    timestamp: new Date().toISOString(),
  };
}

// ========== SYNC ==========

function getLastSyncTime() {
  try {
    const raw = localStorage.getItem(LAST_SYNC_KEY);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

function setLastSyncTime() {
  localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
}

/**
 * Flush queued events to Supabase.
 */
export async function flushEvents() {
  const queue = getQueue();
  if (queue.length === 0) return 0;

  if (!isSupabaseConfigured) {
    return 0;
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 0;
  }

  const eventsToSync = [...queue];
  localStorage.removeItem(EVENTS_QUEUE_KEY);

  try {
    const syncedCount = await bulkInsertAnalyticsEvents(eventsToSync);

    if (syncedCount < eventsToSync.length) {
      const failedEvents = eventsToSync.slice(syncedCount);
      const remaining = getQueue();
      saveQueue([...remaining, ...failedEvents]);
    }

    if (syncedCount > 0) {
      setLastSyncTime();
    }

    return syncedCount;
  } catch {
    const remaining = getQueue();
    saveQueue([...remaining, ...eventsToSync]);
    return 0;
  }
}

// ========== PUBLIC TRACKING API ==========

export function trackScreenView(screenName, extraMetadata = {}) {
  if (!isTrackingAllowed()) return;
  enqueueEvent('screen_view', screenName, {
    screen: screenName,
    ...extraMetadata,
  });
}

export function trackAction(actionName, metadata = {}) {
  if (!isTrackingAllowed()) return;
  enqueueEvent('user_action', actionName, metadata);
}

export function trackError(error, context = {}) {
  if (!isTrackingAllowed()) return;
  enqueueEvent('error', 'app_error', {
    message: error?.message || String(error),
    stack: error?.stack?.slice(0, 500) || '',
    ...context,
  });
}

export function trackDeviceInfo() {
  if (!isTrackingAllowed()) return;
  enqueueEvent('device_info', 'app_start', getDeviceInfo());
}

// ========== UTILITIES ==========

export function getQueuedEventCount() {
  return getQueue().length;
}

export function getLastSyncDisplay() {
  const ts = getLastSyncTime();
  if (!ts) return null;
  return new Date(ts).toISOString();
}

/**
 * Set up automatic periodic syncing.
 */
export function startAutoSync(intervalMs = SYNC_INTERVAL_MS) {
  if (!isTrackingAllowed()) return () => {};

  const interval = setInterval(() => {
    if (isTrackingAllowed() && navigator.onLine) {
      flushEvents();
    }
  }, intervalMs);

  const handleOnline = () => {
    if (isTrackingAllowed()) {
      flushEvents();
    }
  };
  window.addEventListener('online', handleOnline);

  return () => {
    clearInterval(interval);
    window.removeEventListener('online', handleOnline);
  };
}
