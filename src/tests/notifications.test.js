import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  scheduleReminderNotification,
  cancelReminderNotification,
  cancelAllNotifications,
  scheduleAllReminders,
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
const mockSchedule = vi.fn();
const mockCancel = vi.fn();
const mockGetPending = vi.fn().mockResolvedValue({ notifications: [] });

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    checkPermissions: (...args) => mockCheckPermissions(...args),
    requestPermissions: (...args) => mockRequestPermissions(...args),
    schedule: (...args) => mockSchedule(...args),
    cancel: (...args) => mockCancel(...args),
    getPending: (...args) => mockGetPending(...args),
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
// scheduleReminderNotification
// ==============================================================================

describe('scheduleReminderNotification', () => {
  beforeEach(() => {
    setIsNative(true);
    mockSchedule.mockResolvedValue({});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('schedules a notification for a future reminder', async () => {
    const reminder = {
      id: 'rem_12345',
      name: 'Electric Bill',
      amount: 1500,
      dueDate: '2099-06-15',
    };
    const result = await scheduleReminderNotification(reminder);
    expect(result).toBe(true);
    expect(mockSchedule).toHaveBeenCalledOnce();
    const callArg = mockSchedule.mock.calls[0][0];
    expect(callArg.notifications[0].title).toBe('Bill Reminder');
    expect(callArg.notifications[0].body).toContain('Electric Bill');
    expect(callArg.notifications[0].body).toContain('Electric Bill');
    expect(callArg.notifications[0].body).toContain('৳');
  });

  it('returns false on non-native platforms', async () => {
    setIsNative(false);
    const result = await scheduleReminderNotification({ id: 'rem_1' });
    expect(result).toBe(false);
  });

  it('returns false for past-due reminders', async () => {
    const reminder = {
      id: 'rem_1',
      name: 'Old Bill',
      amount: 100,
      dueDate: '2020-01-01',
    };
    const result = await scheduleReminderNotification(reminder);
    expect(result).toBe(false);
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('returns false on schedule failure', async () => {
    mockSchedule.mockRejectedValue(new Error('schedule failed'));
    const reminder = {
      id: 'rem_1',
      name: 'Test',
      amount: 100,
      dueDate: '2099-12-31',
    };
    const result = await scheduleReminderNotification(reminder);
    expect(result).toBe(false);
  });
});

// ==============================================================================
// cancelReminderNotification
// ==============================================================================

describe('cancelReminderNotification', () => {
  beforeEach(() => {
    setIsNative(true);
    mockCancel.mockResolvedValue({});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('cancels a notification by reminder ID', async () => {
    const result = await cancelReminderNotification('rem_12345');
    expect(result).toBe(true);
    expect(mockCancel).toHaveBeenCalledOnce();
  });

  it('returns false on non-native platforms', async () => {
    setIsNative(false);
    const result = await cancelReminderNotification('rem_1');
    expect(result).toBe(false);
  });

  it('returns false on cancel failure', async () => {
    mockCancel.mockRejectedValue(new Error('cancel failed'));
    const result = await cancelReminderNotification('rem_1');
    expect(result).toBe(false);
  });
});

// ==============================================================================
// cancelAllNotifications
// ==============================================================================

describe('cancelAllNotifications', () => {
  beforeEach(() => {
    setIsNative(true);
    mockCancel.mockResolvedValue({});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('cancels all scheduled notifications', async () => {
    mockGetPending.mockResolvedValue({
      notifications: [{ id: 1 }, { id: 2 }],
    });
    const result = await cancelAllNotifications();
    expect(result).toBe(true);
    expect(mockGetPending).toHaveBeenCalledOnce();
    expect(mockCancel).toHaveBeenCalledOnce();
    expect(mockCancel).toHaveBeenCalledWith({
      notifications: [{ id: 1 }, { id: 2 }],
    });
  });

  it('skips cancel when no pending notifications', async () => {
    mockGetPending.mockResolvedValue({ notifications: [] });
    const result = await cancelAllNotifications();
    expect(result).toBe(true);
    expect(mockGetPending).toHaveBeenCalledOnce();
    expect(mockCancel).not.toHaveBeenCalled();
  });

  it('returns false on non-native platforms', async () => {
    setIsNative(false);
    const result = await cancelAllNotifications();
    expect(result).toBe(false);
  });
});

// ==============================================================================
// scheduleAllReminders
// ==============================================================================

describe('scheduleAllReminders', () => {
  beforeEach(() => {
    setIsNative(true);
    mockCancel.mockResolvedValue({});
    mockSchedule.mockResolvedValue({});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('schedules all unpaid reminders', async () => {
    const reminders = [
      { id: 'rem_1', name: 'A', amount: 100, dueDate: '2099-06-15', status: 'unpaid' },
      { id: 'rem_2', name: 'B', amount: 200, dueDate: '2099-07-01', status: 'unpaid' },
    ];
    const result = await scheduleAllReminders(reminders);
    expect(result.scheduled).toBe(2);
    expect(result.failed).toBe(0);
  });

  it('skips paid reminders', async () => {
    const reminders = [
      { id: 'rem_1', name: 'A', amount: 100, dueDate: '2099-06-15', status: 'paid' },
    ];
    const result = await scheduleAllReminders(reminders);
    expect(result.scheduled).toBe(0);
    expect(result.failed).toBe(0);
  });

  it('handles partial failures', async () => {
    mockSchedule
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('fail'));
    const reminders = [
      { id: 'rem_1', name: 'A', amount: 100, dueDate: '2099-06-15', status: 'unpaid' },
      { id: 'rem_2', name: 'B', amount: 200, dueDate: '2099-07-01', status: 'unpaid' },
    ];
    const result = await scheduleAllReminders(reminders);
    expect(result.scheduled).toBe(1);
    expect(result.failed).toBe(1);
  });
});
