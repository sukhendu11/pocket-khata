// ==============================================================================
// Notification utility for Pocket Khata bill reminders
// ==============================================================================
// Uses @capacitor/local-notifications for native Android notification system.
// Compatible with Android 12+:
//   - Android 13+ (API 33+): Triggers runtime POST_NOTIFICATIONS permission dialog
//   - Android 12 (API 31-32): Permission auto-granted, no runtime prompt
//   - Android 11 and below: Permission auto-granted
// ==============================================================================

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

/**
 * Check if the Capacitor LocalNotifications plugin is available.
 * Falls back on non-native platforms (browser) gracefully.
 * @returns {boolean}
 */
export function isNotificationSupported() {
  try {
    return Capacitor.isNativePlatform() && !!LocalNotifications;
  } catch {
    return false;
  }
}

/**
 * Get the current notification permission state.
 * @returns {Promise<'granted'|'denied'|'default'|'unsupported'>}
 */
export async function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const perm = await LocalNotifications.checkPermissions();
    return perm.display || 'default';
  } catch {
    return 'default';
  }
}

/**
 * Request notification permission from the user.
 * On Android 13+, triggers the system POST_NOTIFICATIONS dialog.
 * On Android 12 and below, permission is auto-granted.
 * @returns {Promise<'granted'|'denied'|'default'|'unsupported'>}
 */
export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const perm = await LocalNotifications.requestPermissions();
    return perm.display || 'denied';
  } catch {
    return 'denied';
  }
}

/**
 * Schedule a local notification for a bill reminder.
 * @param {object} reminder - { id, name, amount, dueDate }
 * @returns {Promise<boolean>} Whether the notification was scheduled
 */
export async function scheduleReminderNotification(reminder) {
  if (!isNotificationSupported()) return false;

  const dueDate = new Date(reminder.dueDate + 'T09:00:00');
  const now = new Date();

  // Skip reminders already past due
  if (dueDate <= now) return false;

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          title: 'Bill Reminder',
          body: `${reminder.name} — ৳${Number(reminder.amount).toLocaleString()}`,
          id: Number(reminder.id.replace(/\D/g, '').slice(0, 8)) || Date.now(),
          schedule: { at: dueDate },
          smallIcon: 'ic_stat_icon',
          sound: 'default',
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Cancel a scheduled notification for a reminder.
 * @param {string|number} reminderId - The reminder ID
 * @returns {Promise<boolean>}
 */
export async function cancelReminderNotification(reminderId) {
  if (!isNotificationSupported()) return false;
  const numericId = Number(String(reminderId).replace(/\D/g, '').slice(0, 8));
  if (!numericId) return false;

  try {
    await LocalNotifications.cancel({ notifications: [{ id: numericId }] });
    return true;
  } catch {
    return false;
  }
}

/**
 * Cancel all scheduled notifications.
 * Fetches pending notifications first, then cancels them by ID.
 * @returns {Promise<boolean>}
 */
/**
 * Send an immediate test notification to verify real device delivery.
 * Creates a dedicated high-importance channel for Android 8+ to ensure
 * the notification appears on lock screen and survives OEM battery
 * optimization (Sony, Xiaomi, Samsung, etc.).
 * @returns {Promise<boolean>} Whether the notification was sent
 */
export async function sendTestNotification() {
  if (!isNotificationSupported()) return false;
  try {
    // Create a high-importance channel (Android 8+).
    // Without this, OEM devices may silently suppress medium-importance
    // notifications, and the test would falsely pass at the permission level
    // while the user never actually sees a notification.
    try {
      await LocalNotifications.createChannel({
        id: 'pocket_khata_test',
        name: 'Test Notifications',
        description: 'Test notifications for delivery verification',
        importance: 5, // 5 = High (heads-up popup, lock screen)
        visibility: 1, // 1 = Public (show content on lock screen)
        vibration: true,
        sound: 'default',
      });
    } catch (_) {
      // Channel may already exist — continue
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          title: '🔔 Pocket Khata',
          body: 'Test notification — delivery confirmed!',
          id: 999999,
          schedule: { at: new Date() },
          channelId: 'pocket_khata_test',
          smallIcon: 'ic_stat_icon',
          sound: 'default',
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
}

export async function cancelAllNotifications() {
  if (!isNotificationSupported()) return false;
  try {
    // Try to cancel any existing pending notifications
    try {
      const pending = await LocalNotifications.getPending();
      const ids = pending.notifications.map(n => ({ id: n.id }));
      if (ids.length > 0) {
        await LocalNotifications.cancel({ notifications: ids });
      }
    } catch {
      // Continue even if cancel fails
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Schedule notifications for all unpaid reminders.
 * Cancels any existing notifications first, then re-schedules.
 * @param {Array} reminders - Array of reminder objects
 * @returns {Promise<{ scheduled: number, failed: number }>}
 */
export async function scheduleAllReminders(reminders) {
  if (!isNotificationSupported()) return { scheduled: 0, failed: 0 };

  try {
    await LocalNotifications.cancel({ notifications: [] });
  } catch {
    // Continue even if cancel fails
  }

  let scheduled = 0;
  let failed = 0;

  for (const reminder of reminders) {
    if (reminder.status !== 'unpaid') continue;
    const ok = await scheduleReminderNotification(reminder);
    if (ok) scheduled++;
    else failed++;
  }

  return { scheduled, failed };
}
