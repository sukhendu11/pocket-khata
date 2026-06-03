import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  createNotificationChannel,
  sendNotification,
  scheduleReminderNotification,
  cancelReminderNotification,
  cancelAllNotifications,
  deleteNotificationChannel,
  rescheduleAllReminders,
} from '../notifications';

// Mock Capacitor
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
  },
}));

// Mock LocalNotifications
const mockCheckPermissions = vi.fn();
const mockRequestPermissions = vi.fn();
const mockCancelAll = vi.fn();
const mockDeleteChannel = vi.fn();
const mockCreateChannel = vi.fn();
const mockSchedule = vi.fn();
const mockCancel = vi.fn();

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    checkPermissions: (...args) => mockCheckPermissions(...args),
    requestPermissions: (...args) => mockRequestPermissions(...args),
    cancelAll: (...args) => mockCancelAll(...args),
    deleteChannel: (...args) => mockDeleteChannel(...args),
    createChannel: (...args) => mockCreateChannel(...args),
    schedule: (...args) => mockSchedule(...args),
    cancel: (...args) => mockCancel(...args),
  },
}));

import { Capacitor } from '@capacitor/core';

function setIsNative(val) {
  Capacitor.isNativePlatform.mockReturnValue(val);
}

// ==============================================================================
// isNotificationSupported
// ==============================================================================

describe('isNotificationSupported', () => {
  beforeEach(() => {
    setIsNative(true);
  });

  it('returns true on native platforms', () => {
    expect(isNotificationSupported()).toBe(true);
  });

  it('returns false on non-native platforms', () => {
    setIsNative(false);
    expect(isNotificationSupported()).toBe(false);
  });
});

// ==============================================================================
// getNotificationPermission
// ==============================================================================

describe('getNotificationPermission', () => {
  beforeEach(() => {
    setIsNative(true);
    mockCheckPermissions.mockResolvedValue({ display: 'granted' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns granted when permission is granted', async () => {
    const result = await getNotificationPermission();
    expect(result).toBe('granted');
  });

  it('returns denied when permission is denied', async () => {
    mockCheckPermissions.mockResolvedValue({ display: 'denied' });
    const result = await getNotificationPermission();
    expect(result).toBe('denied');
  });

  it('returns default when permission is prompt', async () => {
    mockCheckPermissions.mockResolvedValue({ display: 'prompt' });
    const result = await getNotificationPermission();
    expect(result).toBe('prompt');
  });

  it('returns unsupported on non-native platforms', async () => {
    setIsNative(false);
    const result = await getNotificationPermission();
    expect(result).toBe('unsupported');
  });

  it('returns default on error', async () => {
    mockCheckPermissions.mockRejectedValue(new Error('fail'));
    const result = await getNotificationPermission();
    expect(result).toBe('default');
  });
});

// ==============================================================================
// requestNotificationPermission
// ==============================================================================

describe('requestNotificationPermission', () => {
  beforeEach(() => {
    setIsNative(true);
    mockRequestPermissions.mockResolvedValue({ display: 'granted' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns granted when user grants', async () => {
    const result = await requestNotificationPermission();
    expect(result).toBe('granted');
  });

  it('returns denied when user denies', async () => {
    mockRequestPermissions.mockResolvedValue({ display: 'denied' });
    const result = await requestNotificationPermission();
    expect(result).toBe('denied');
  });

  it('returns unsupported on non-native platforms', async () => {
    setIsNative(false);
    const result = await requestNotificationPermission();
    expect(result).toBe('unsupported');
  });

  it('returns denied on error', async () => {
    mockRequestPermissions.mockRejectedValue(new Error('fail'));
    const result = await requestNotificationPermission();
    expect(result).toBe('denied');
  });
});

// ==============================================================================
// cancelAllNotifications
// ==============================================================================

describe('cancelAllNotifications', () => {
  beforeEach(() => {
    setIsNative(true);
    mockCancelAll.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls LocalNotifications.cancelAll on native', async () => {
    await cancelAllNotifications();
    expect(mockCancelAll).toHaveBeenCalled();
  });

  it('does nothing on non-native platforms', async () => {
    setIsNative(false);
    await cancelAllNotifications();
    expect(mockCancelAll).not.toHaveBeenCalled();
  });
});

// ==============================================================================
// deleteNotificationChannel
// ==============================================================================

describe('deleteNotificationChannel', () => {
  beforeEach(() => {
    setIsNative(true);
    mockDeleteChannel.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls LocalNotifications.deleteChannel with correct id', async () => {
    await deleteNotificationChannel();
    expect(mockDeleteChannel).toHaveBeenCalledWith({ id: 'pocket_khata_general' });
  });

  it('does nothing on non-native platforms', async () => {
    setIsNative(false);
    await deleteNotificationChannel();
    expect(mockDeleteChannel).not.toHaveBeenCalled();
  });
});

// ==============================================================================
// createNotificationChannel
// ==============================================================================

describe('createNotificationChannel', () => {
  beforeEach(() => {
    setIsNative(true);
    mockCreateChannel.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('creates channel with correct id and importance', async () => {
    await createNotificationChannel();
    expect(mockCreateChannel).toHaveBeenCalledWith({
      id: 'pocket_khata_general',
      name: 'Pocket Khata',
      description: 'Transaction alerts and bill reminders',
      importance: 5,
      visibility: 1,
      sound: null,
    });
  });

  it('does nothing on non-native platforms', async () => {
    setIsNative(false);
    await createNotificationChannel();
    expect(mockCreateChannel).not.toHaveBeenCalled();
  });
});

// ==============================================================================
// sendNotification
// ==============================================================================

describe('sendNotification', () => {
  beforeEach(() => {
    setIsNative(true);
    mockCheckPermissions.mockResolvedValue({ display: 'granted' });
    mockCreateChannel.mockResolvedValue(undefined);
    mockSchedule.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('schedules notification with numeric id and channel', async () => {
    const result = await sendNotification({ id: 'rem_123', title: 'Test', body: 'Hello' });
    expect(result).toBe(true);
    expect(mockCreateChannel).toHaveBeenCalled();
    expect(mockSchedule).toHaveBeenCalledWith({
      notifications: expect.arrayContaining([
        expect.objectContaining({
          title: 'Test',
          body: 'Hello',
          channelId: 'pocket_khata_general',
        }),
      ]),
    });
  });

  it('returns false when permission is not granted', async () => {
    mockCheckPermissions.mockResolvedValue({ display: 'denied' });
    const result = await sendNotification({ id: 'rem_1', title: 'T', body: 'B' });
    expect(result).toBe(false);
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('returns false on non-native platforms', async () => {
    setIsNative(false);
    const result = await sendNotification({ id: 'rem_1', title: 'T', body: 'B' });
    expect(result).toBe(false);
  });

  it('creates notification channel before scheduling', async () => {
    await sendNotification({ id: 'rem_test', title: 'T', body: 'B' });
    // Channel must be created BEFORE schedule is called
    expect(mockCreateChannel.mock.invocationCallOrder[0]).toBeLessThan(
      mockSchedule.mock.invocationCallOrder[0]
    );
  });
});

// ==============================================================================
// scheduleReminderNotification
// ==============================================================================

describe('scheduleReminderNotification', () => {
  beforeEach(() => {
    setIsNative(true);
    mockCheckPermissions.mockResolvedValue({ display: 'granted' });
    mockCreateChannel.mockResolvedValue(undefined);
    mockSchedule.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('schedules notification for future due date', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const dueDate = futureDate.toISOString().split('T')[0];

    await scheduleReminderNotification({ id: 'rem_1', name: 'Rent', amount: 15000, dueDate });
    expect(mockCreateChannel).toHaveBeenCalled();
    expect(mockSchedule).toHaveBeenCalled();
  });

  it('does nothing when reminder is missing required fields', async () => {
    await scheduleReminderNotification({});
    await scheduleReminderNotification(null);
    await scheduleReminderNotification({ id: 'rem_1' });
    expect(mockSchedule).not.toHaveBeenCalled();
  });
});

// ==============================================================================
// cancelReminderNotification
// ==============================================================================

describe('cancelReminderNotification', () => {
  beforeEach(() => {
    setIsNative(true);
    mockCancel.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('cancels notification with numeric id', async () => {
    await cancelReminderNotification('rem_123');
    expect(mockCancel).toHaveBeenCalledWith({
      notifications: expect.arrayContaining([expect.objectContaining({ id: expect.any(Number) })]),
    });
  });

  it('does nothing on non-native platforms', async () => {
    setIsNative(false);
    await cancelReminderNotification('rem_1');
    expect(mockCancel).not.toHaveBeenCalled();
  });

  it('does nothing with null/undefined id', async () => {
    await cancelReminderNotification(null);
    await cancelReminderNotification(undefined);
    expect(mockCancel).not.toHaveBeenCalled();
  });
});

// ==============================================================================
// rescheduleAllReminders
// ==============================================================================

describe('rescheduleAllReminders', () => {
  const futureDate = new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0];
  const pastDate = new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0];

  const mockReminders = [
    { id: 'rem_1', name: 'Rent', amount: 15000, dueDate: futureDate, status: 'unpaid' },
    { id: 'rem_2', name: 'Electricity', amount: 2500, dueDate: pastDate, status: 'unpaid' },
    { id: 'rem_3', name: 'Paid Bill', amount: 1000, dueDate: pastDate, status: 'paid' },
  ];

  beforeEach(() => {
    setIsNative(true);
    mockCheckPermissions.mockResolvedValue({ display: 'granted' });
    mockCreateChannel.mockResolvedValue(undefined);
    mockSchedule.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('schedules future reminder and summary for overdue', async () => {
    await rescheduleAllReminders(mockReminders);

    // Should schedule the future reminder
    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        notifications: expect.arrayContaining([
          expect.objectContaining({
            title: 'Bill Reminder',
            body: expect.stringContaining('Rent'),
          }),
        ]),
      })
    );

    // Should also schedule overdue summary (id: 8888)
    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        notifications: expect.arrayContaining([
          expect.objectContaining({
            id: 8888,
            title: 'Overdue Bills',
            body: expect.stringContaining('1 overdue bill'),
          }),
        ]),
      })
    );
  });

  it('does nothing when no reminders are provided', async () => {
    await rescheduleAllReminders([]);
    await rescheduleAllReminders(null);
    await rescheduleAllReminders(undefined);
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('does nothing on non-native platforms', async () => {
    setIsNative(false);
    await rescheduleAllReminders(mockReminders);
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('does nothing when permission is not granted', async () => {
    mockCheckPermissions.mockResolvedValue({ display: 'denied' });
    await rescheduleAllReminders(mockReminders);
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('does not schedule for paid reminders', async () => {
    const paidOnly = [
      { id: 'rem_paid', name: 'Paid Bill', amount: 500, dueDate: futureDate, status: 'paid' },
    ];
    await rescheduleAllReminders(paidOnly);
    // Only the overdue summary should fire (but there are no overdue either)
    // Actually with no unpaid reminders, neither branch fires
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('creates notification channel before scheduling', async () => {
    await rescheduleAllReminders(mockReminders);
    expect(mockCreateChannel).toHaveBeenCalled();
  });

  it('handles errors gracefully', async () => {
    mockCreateChannel.mockRejectedValue(new Error('Channel error'));
    // Should not throw
    await expect(rescheduleAllReminders(mockReminders)).resolves.not.toThrow();
  });
});

