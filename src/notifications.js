import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const NOTIF_CHANNEL_ID = 'pocket_khata_general';
const NOTIF_CHANNEL_NAME = 'Pocket Khata';
const NOTIF_CHANNEL_DESC = 'Transaction alerts and Pocket Khata notifications';

export function isNotificationSupported() {
  try {
    return Capacitor.isNativePlatform() && !!LocalNotifications;
  } catch {
    return false;
  }
}

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

/**
 * Schedule a test notification immediately.
 * Creates a high-importance channel with public lock screen visibility,
 * then fires a notification that should appear in the notification bar
 * and on the lock screen.
 *
 * @returns {boolean} Whether the notification was scheduled successfully.
 */
export async function sendTestNotification() {
  if (!isNotificationSupported()) return false;
  try {
    // Create (or update) a high-importance channel
    await LocalNotifications.createChannel({
      id: NOTIF_CHANNEL_ID,
      name: NOTIF_CHANNEL_NAME,
      description: NOTIF_CHANNEL_DESC,
      importance: 5,        // IMPORTANCE_MAX — heads-up, sound, vibration
      visibility: 1,        // VISIBILITY_PUBLIC — shows on lock screen
      sound: 'default',
      vibration: true,
      lights: true,
    });

    // Schedule the notification immediately
    await LocalNotifications.schedule({
      notifications: [
        {
          title: '🔔 Pocket Khata',
          body: 'Test notification — delivery confirmed!',
          id: Date.now(),                  // unique ID so it always fires
          channelId: NOTIF_CHANNEL_ID,
          sound: 'default',
          attachments: null,
          actionTypeId: '',
          extra: null,
          iconColor: '#3867d6',
        },
      ],
    });

    return true;
  } catch (e) {
    console.error('[PocketKhata] sendTestNotification failed:', e);
    return false;
  }
}
