import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const NOTIF_CHANNEL_ID = 'pocket_khata_general';
const NOTIF_CHANNEL_NAME = 'Pocket Khata';
const NOTIF_CHANNEL_DESC = 'Transaction alerts and bill reminders';

// ---- Helpers ----

/**
 * Convert a string ID (e.g. 'rem_12345') to a numeric ID
 * suitable for LocalNotifications (which requires numbers).
 * Uses a simple hash so the same string always maps to the same number.
 */
function stringToNumericId(str) {
  let hash = 0;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || 1;
}

// ---- Platform detection ----

export function isNotificationSupported() {
  try {
    return Capacitor.isNativePlatform() && !!LocalNotifications;
  } catch {
    return false;
  }
}

// ---- Permission management ----

export async function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const perm = await LocalNotifications.checkPermissions();
    return perm.display || 'default';
  } catch {
    return 'default';
  }
}

export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const perm = await LocalNotifications.requestPermissions();
    return perm.display || 'denied';
  } catch {
    return 'denied';
  }
}

// ---- Channel management ----

/**
 * Create the Android notification channel.
 * Required for Android 8+ (API 26+). Must be called before
 * any notifications can be delivered.
 * Safe to call multiple times — Android ignores duplicate creates.
 */
export async function createNotificationChannel() {
  if (!isNotificationSupported()) return;
  try {
    await LocalNotifications.createChannel({
      id: NOTIF_CHANNEL_ID,
      name: NOTIF_CHANNEL_NAME,
      description: NOTIF_CHANNEL_DESC,
      importance: 5, // HIGH — shows on lock screen, heads-up
      visibility: 1,  // PUBLIC — content visible on lock screen
      sound: null,    // Use default system sound
    });
  } catch (e) {
    console.error('[PocketKhata] createNotificationChannel failed:', e);
  }
}

/**
 * Delete the notification channel.
 * Called when the user toggles notifications OFF to revoke at system level.
 */
export async function deleteNotificationChannel() {
  if (!isNotificationSupported()) return;
  try {
    await LocalNotifications.deleteChannel({ id: NOTIF_CHANNEL_ID });
  } catch (e) {
    console.error('[PocketKhata] deleteNotificationChannel failed:', e);
  }
}

// ---- Notification delivery ----

/**
 * Send or schedule a local notification.
 * @param {Object} options
 * @param {string|number} options.id       — unique identifier (string or numeric)
 * @param {string}        options.title    — notification title
 * @param {string}        options.body     — notification body text
 * @param {Date}          [options.at]     — exact delivery time (omit for immediate)
 */
export async function sendNotification({ id, title, body, at }) {
  if (!isNotificationSupported()) return false;
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') return false;

    // Ensure the notification channel exists before scheduling.
    // Required on Android 8+ (API 26+). Safe to call multiple times —
    // Android ignores duplicate channel creation.
    await createNotificationChannel();

    const numericId = typeof id === 'number' ? id : stringToNumericId(id);
    const schedule = at ? { at } : undefined;

    await LocalNotifications.schedule({
      notifications: [{
        id: numericId,
        title,
        body,
        channelId: NOTIF_CHANNEL_ID,
        schedule,
      }],
    });
    return true;
  } catch (e) {
    console.error('[PocketKhata] sendNotification failed:', e);
    return false;
  }
}

/**
 * Schedule a bill-reminder notification on the due date at 09:00.
 * If the due date is today or in the past, sends immediately.
 * @param {Object} reminder — { id, name, amount, dueDate (YYYY-MM-DD) }
 */
export async function scheduleReminderNotification(reminder) {
  if (!reminder || !reminder.id || !reminder.dueDate) return;

  const now = new Date();
  const dueDate = new Date(reminder.dueDate + 'T09:00:00');

  // If due date is today or already past, send immediately
  if (dueDate <= now) {
    dueDate.setTime(now.getTime() + 2000); // 2 seconds from now
  }

  return sendNotification({
    id: reminder.id,
    title: 'Bill Reminder',
    body: `${reminder.name} \u2014 \u09f3${Number(reminder.amount).toLocaleString()} due today`,
    at: dueDate,
  });
}

/**
 * Cancel a specific notification by its ID.
 * @param {string|number} id — the reminder/notification ID
 */
export async function cancelReminderNotification(id) {
  if (!isNotificationSupported() || !id) return;
  try {
    const numericId = typeof id === 'number' ? id : stringToNumericId(id);
    await LocalNotifications.cancel({ notifications: [{ id: numericId }] });
  } catch (e) {
    console.error('[PocketKhata] cancelReminderNotification failed:', e);
  }
}

/**
 * Send an immediate test notification to confirm delivery on a real device.
 * Called when the user toggles notifications ON to verify the system works.
 */
export async function sendTestNotification() {
  if (!isNotificationSupported()) return false;
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') return false;

    // Ensure channel exists (safe to call multiple times)
    await createNotificationChannel();

    // Schedule immediately (no `at` means fire right away)
    await LocalNotifications.schedule({
      notifications: [{
        id: 9999,
        title: 'Pocket Khata',
        body: 'Notifications are working! \u2705',
        channelId: NOTIF_CHANNEL_ID,
        schedule: { at: new Date(Date.now() + 500) }, // 500ms delay
      }],
    });
    return true;
  } catch (e) {
    console.error('[PocketKhata] sendTestNotification failed:', e);
    return false;
  }
}

/**
 * Cancel all scheduled and delivered notifications.
 * Called when the user toggles notifications OFF.
 */
export async function cancelAllNotifications() {
  if (!isNotificationSupported()) return;
  try {
    await LocalNotifications.cancelAll();
  } catch (e) {
    console.error('[PocketKhata] cancelAllNotifications failed:', e);
  }
}

/**
 * Re-schedule all unpaid reminders on app startup.
 *
 * Capacitor LocalNotifications persists scheduled alarms across app restarts
 * and reboots via Android AlarmManager. However, when the APK is rebuilt and
 * reinstalled (common during development), ALL pending alarms are cleared by
 * the OS. This function re-registers notifications for all unpaid reminders so
 * they fire reliably even after an app update or reinstall.
 *
 * @param {Array} reminders - Full array of reminder objects from the DB
 */
export async function rescheduleAllReminders(reminders) {
  if (!isNotificationSupported() || !Array.isArray(reminders) || reminders.length === 0) return;
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') return;

    // Ensure the notification channel exists before scheduling
    await createNotificationChannel();

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const unpaid = reminders.filter(r => r.status === 'unpaid' && r.id && r.dueDate);
    const overdue = unpaid.filter(r => r.dueDate < todayStr);
    const future = unpaid.filter(r => r.dueDate >= todayStr);

    // Schedule future reminders at 09:00 on their due date
    if (future.length > 0) {
      await Promise.all(future.map(reminder => scheduleReminderNotification(reminder)));
    }

    // For overdue reminders, send ONE summary notification (avoid flooding)
    if (overdue.length > 0) {
      await LocalNotifications.schedule({
        notifications: [{
          id: 8888,
          title: 'Overdue Bills',
          body: `You have ${overdue.length} overdue bill${overdue.length > 1 ? 's' : ''}. Tap to view.`,
          channelId: NOTIF_CHANNEL_ID,
          schedule: { at: new Date(Date.now() + 3000) },
        }],
      });
    }
  } catch (e) {
    console.error('[PocketKhata] rescheduleAllReminders failed:', e);
  }
}
