// src/tests/notifications.test.js — Tests for cacheRemindersForSW and registerPeriodicSync

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  cacheRemindersForSW,
  registerPeriodicSync,
  isNotificationSupported,
  requestNotificationPermission,
  getNotificationPermission,
  registerServiceWorker,
  showNotification,
  checkReminders,
  isServiceWorkerActive,
} from '../notifications';

// ==============================================================================
// Mock dependencies
// ==============================================================================

vi.mock('../lib/analytics', () => ({
  trackError: vi.fn(),
}));

// We do NOT mock ../i18n or ../notifications — we want the real implementations
// Global APIs (caches, navigator.serviceWorker, Notification) are stubbed in beforeEach.

// ==============================================================================
// Helpers
// ==============================================================================

function stubNavigatorServiceWorker(mockImplementation) {
  // jsdom's navigator may be read-only in some configurations, so use defineProperty
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      ...globalThis.navigator,
      serviceWorker: mockImplementation,
    },
    writable: true,
    configurable: true,
  });
}

// ==============================================================================
// cacheRemindersForSW
// ==============================================================================

describe('cacheRemindersForSW', () => {
  let mockCacheStore;

  beforeEach(() => {
    // In-memory map to verify stored data
    mockCacheStore = new Map();

    const mockCache = {
      put: vi.fn(async (url, response) => {
        mockCacheStore.set(url, response);
      }),
    };

    vi.stubGlobal('Notification', { permission: 'granted', requestPermission: vi.fn() });

    vi.stubGlobal('caches', {
      open: vi.fn(async () => mockCache),
    });

    stubNavigatorServiceWorker({
      getRegistrations: vi.fn().mockResolvedValue([]),
      register: vi.fn().mockResolvedValue({}),
      ready: Promise.resolve({ active: null }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens the correct cache name', async () => {
    await cacheRemindersForSW([], 'en');
    expect(caches.open).toHaveBeenCalledWith('pocket-khata-reminder-data');
  });

  it('stores reminders and lang at the correct URL', async () => {
    const reminders = [
      { id: 'rem_1', name: 'Electric Bill', amount: 1500, dueDate: '2026-06-15', status: 'unpaid' },
      { id: 'rem_2', name: 'Rent', amount: 12000, dueDate: '2026-07-01', status: 'unpaid' },
    ];

    await cacheRemindersForSW(reminders, 'en');

    const [url, response] = [...mockCacheStore.entries()][0];
    expect(url).toBe('/__pk_reminder_data__');

    const body = await response.json();
    expect(body.reminders).toEqual(reminders);
    expect(body.lang).toBe('en');
  });

  it('includes a syncedAt timestamp in the payload', async () => {
    const before = Date.now();

    await cacheRemindersForSW([], 'en');

    const response = mockCacheStore.get('/__pk_reminder_data__');
    const body = await response.json();
    const syncedAt = new Date(body.syncedAt).getTime();

    expect(syncedAt).toBeGreaterThanOrEqual(before - 1000);
    expect(syncedAt).toBeLessThanOrEqual(Date.now() + 1000);
  });

  it('wraps null reminders in an empty array', async () => {
    await cacheRemindersForSW(null, 'en');
    const response = mockCacheStore.get('/__pk_reminder_data__');
    const body = await response.json();
    expect(body.reminders).toEqual([]);
  });

  it('wraps undefined reminders in an empty array', async () => {
    await cacheRemindersForSW(undefined, 'en');
    const response = mockCacheStore.get('/__pk_reminder_data__');
    const body = await response.json();
    expect(body.reminders).toEqual([]);
  });

  it('stores the lang as bn when passed', async () => {
    await cacheRemindersForSW([], 'bn');
    const response = mockCacheStore.get('/__pk_reminder_data__');
    const body = await response.json();
    expect(body.lang).toBe('bn');
  });

  it('defaults lang to en when not provided', async () => {
    await cacheRemindersForSW([]);
    const response = mockCacheStore.get('/__pk_reminder_data__');
    const body = await response.json();
    expect(body.lang).toBe('en');
  });

  it('does not throw when caches.open fails', async () => {
    vi.stubGlobal('caches', {
      open: vi.fn().mockRejectedValue(new Error('Cache error')),
    });
    await expect(cacheRemindersForSW([], 'en')).resolves.toBeUndefined();
  });

  it('does not throw when cache.put fails', async () => {
    const badCache = { put: vi.fn().mockRejectedValue(new Error('Put error')) };
    vi.stubGlobal('caches', { open: vi.fn().mockResolvedValue(badCache) });
    await expect(cacheRemindersForSW([], 'en')).resolves.toBeUndefined();
  });

  it('returns undefined (void function)', async () => {
    const result = await cacheRemindersForSW([], 'en');
    expect(result).toBeUndefined();
  });

  it('returns undefined when isNotificationSupported returns false', async () => {
    delete window.Notification;
    const result = await cacheRemindersForSW([], 'en');
    expect(result).toBeUndefined();
    vi.stubGlobal('Notification', { permission: 'granted', requestPermission: vi.fn() });
  });

  it('does not call caches.open when not supported', async () => {
    const openSpy = vi.fn();
    vi.stubGlobal('caches', { open: openSpy });
    delete window.Notification;
    await cacheRemindersForSW([], 'en');
    expect(openSpy).not.toHaveBeenCalled();
    vi.stubGlobal('Notification', { permission: 'granted', requestPermission: vi.fn() });
  });
});

// ==============================================================================
// registerPeriodicSync
// ==============================================================================

describe('registerPeriodicSync', () => {
  let mockPeriodicSyncInstance;

  beforeEach(() => {
    mockPeriodicSyncInstance = {
      register: vi.fn().mockResolvedValue(undefined),
    };

    vi.stubGlobal('Notification', { permission: 'granted', requestPermission: vi.fn() });

    stubNavigatorServiceWorker({
      getRegistrations: vi.fn().mockResolvedValue([]),
      register: vi.fn().mockResolvedValue({}),
      ready: Promise.resolve({ active: null }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('gets service worker registrations', async () => {
    await registerPeriodicSync();
    expect(navigator.serviceWorker.getRegistrations).toHaveBeenCalledTimes(1);
  });

  it('registers periodic sync with the correct tag name', async () => {
    const registration = { periodicSync: mockPeriodicSyncInstance };
    navigator.serviceWorker.getRegistrations.mockResolvedValue([registration]);

    await registerPeriodicSync();

    expect(mockPeriodicSyncInstance.register).toHaveBeenCalledWith(
      'pocket-khata-reminder-check',
      expect.any(Object),
    );
  });

  it('uses a 12-hour minimum interval', async () => {
    const registration = { periodicSync: mockPeriodicSyncInstance };
    navigator.serviceWorker.getRegistrations.mockResolvedValue([registration]);

    await registerPeriodicSync();

    expect(mockPeriodicSyncInstance.register).toHaveBeenCalledWith(
      expect.any(String),
      { minInterval: 12 * 60 * 60 * 1000 },
    );
  });

  it('registers periodic sync on each registration that supports it', async () => {
    const reg1 = { periodicSync: { register: vi.fn().mockResolvedValue(undefined) } };
    const reg2 = { periodicSync: { register: vi.fn().mockResolvedValue(undefined) } };
    navigator.serviceWorker.getRegistrations.mockResolvedValue([reg1, reg2]);

    await registerPeriodicSync();

    expect(reg1.periodicSync.register).toHaveBeenCalledTimes(1);
    expect(reg2.periodicSync.register).toHaveBeenCalledTimes(1);
  });

  it('skips registrations that do not support periodicSync', async () => {
    const withSync = { periodicSync: mockPeriodicSyncInstance };
    const withoutSync = {}; // No periodicSync property
    navigator.serviceWorker.getRegistrations.mockResolvedValue([withSync, withoutSync]);

    await registerPeriodicSync();

    expect(mockPeriodicSyncInstance.register).toHaveBeenCalledTimes(1);
  });

  it('handles empty registrations array gracefully', async () => {
    navigator.serviceWorker.getRegistrations.mockResolvedValue([]);
    await expect(registerPeriodicSync()).resolves.toBeUndefined();
  });

  it('does not throw when getRegistrations fails', async () => {
    navigator.serviceWorker.getRegistrations.mockRejectedValue(new Error('SW error'));
    await expect(registerPeriodicSync()).resolves.toBeUndefined();
  });

  it('does not throw when periodicSync.register fails', async () => {
    const registration = {
      periodicSync: { register: vi.fn().mockRejectedValue(new Error('Register error')) },
    };
    navigator.serviceWorker.getRegistrations.mockResolvedValue([registration]);
    await expect(registerPeriodicSync()).resolves.toBeUndefined();
  });



  it('returns undefined (void function)', async () => {
    const result = await registerPeriodicSync();
    expect(result).toBeUndefined();
  });

  it('returns undefined when isNotificationSupported returns false', async () => {
    delete window.Notification;
    const result = await registerPeriodicSync();
    expect(result).toBeUndefined();
    vi.stubGlobal('Notification', {});
  });

  it('does not call getRegistrations when not supported', async () => {
    const getRegSpy = vi.fn();
    vi.stubGlobal('navigator', { serviceWorker: { getRegistrations: getRegSpy } });
    delete window.Notification;
    await registerPeriodicSync();
    expect(getRegSpy).not.toHaveBeenCalled();
    vi.stubGlobal('Notification', {});
  });
});

// ==============================================================================
// isNotificationSupported
// ==============================================================================

describe('isNotificationSupported', () => {
  beforeEach(() => {
    vi.stubGlobal('Notification', {});
    vi.stubGlobal('navigator', { serviceWorker: {} });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns true when Notification and serviceWorker are available', () => {
    expect(isNotificationSupported()).toBe(true);
  });

  it('returns false when Notification is missing', () => {
    // Delete the property entirely so 'Notification' in window returns false
    delete window.Notification;
    expect(isNotificationSupported()).toBe(false);
    // Restore for other tests
    vi.stubGlobal('Notification', {});
  });

  it('returns false when serviceWorker is missing', () => {
    // Delete serviceWorker from navigator so 'serviceWorker' in navigator returns false
    delete globalThis.navigator.serviceWorker;
    expect(isNotificationSupported()).toBe(false);
    // Restore for other tests
    globalThis.navigator.serviceWorker = {};
  });
});

// ==============================================================================
// requestNotificationPermission
// ==============================================================================

describe('requestNotificationPermission', () => {
  beforeEach(() => {
    vi.stubGlobal('Notification', { requestPermission: vi.fn() });
    vi.stubGlobal('navigator', { serviceWorker: {} });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the permission result when user grants', async () => {
    Notification.requestPermission.mockResolvedValue('granted');
    const result = await requestNotificationPermission();
    expect(result).toBe('granted');
  });

  it('returns denied when user denies', async () => {
    Notification.requestPermission.mockResolvedValue('denied');
    const result = await requestNotificationPermission();
    expect(result).toBe('denied');
  });

  it('returns default when user dismisses', async () => {
    Notification.requestPermission.mockResolvedValue('default');
    const result = await requestNotificationPermission();
    expect(result).toBe('default');
  });

  it('returns denied when not supported', async () => {
    delete window.Notification;
    const result = await requestNotificationPermission();
    expect(result).toBe('denied');
    vi.stubGlobal('Notification', { requestPermission: vi.fn() });
  });

  it('returns denied when requestPermission throws', async () => {
    Notification.requestPermission.mockRejectedValue(new Error('Permission error'));
    const result = await requestNotificationPermission();
    expect(result).toBe('denied');
  });
});

// ==============================================================================
// getNotificationPermission
// ==============================================================================

describe('getNotificationPermission', () => {
  beforeEach(() => {
    vi.stubGlobal('Notification', { permission: 'granted' });
    vi.stubGlobal('navigator', { serviceWorker: {} });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns granted when permission is granted', () => {
    expect(getNotificationPermission()).toBe('granted');
  });

  it('returns denied when permission is denied', () => {
    vi.stubGlobal('Notification', { permission: 'denied' });
    expect(getNotificationPermission()).toBe('denied');
  });

  it('returns default when permission is default', () => {
    vi.stubGlobal('Notification', { permission: 'default' });
    expect(getNotificationPermission()).toBe('default');
  });

  it('returns unsupported when Notification is unavailable', () => {
    delete window.Notification;
    expect(getNotificationPermission()).toBe('unsupported');
    vi.stubGlobal('Notification', { permission: 'granted' });
  });
});

// ==============================================================================
// registerServiceWorker
// ==============================================================================

describe('registerServiceWorker', () => {
  let mockRegister;

  beforeEach(() => {
    mockRegister = vi.fn().mockResolvedValue({ scope: '/' });
    vi.stubGlobal('Notification', {});
    vi.stubGlobal('navigator', { serviceWorker: { register: mockRegister } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('registers /sw.js with root scope', async () => {
    await registerServiceWorker();
    expect(mockRegister).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  });

  it('returns the registration on success', async () => {
    const result = await registerServiceWorker();
    expect(result).toEqual({ scope: '/' });
  });

  it('returns null when not supported', async () => {
    vi.stubGlobal('navigator', {});
    const result = await registerServiceWorker();
    expect(result).toBeNull();
  });

  it('returns null when registration fails', async () => {
    mockRegister.mockRejectedValue(new Error('Registration failed'));
    const result = await registerServiceWorker();
    expect(result).toBeNull();
  });
});

// ==============================================================================
// showNotification
// ==============================================================================

describe('showNotification', () => {
  let mockPostMessage;

  beforeEach(() => {
    mockPostMessage = vi.fn();
    vi.stubGlobal('Notification', { permission: 'granted' });
    vi.stubGlobal('navigator', {
      serviceWorker: {
        ready: Promise.resolve({ active: { postMessage: mockPostMessage } }),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does nothing when not supported', async () => {
    vi.stubGlobal('navigator', {});
    await showNotification('Title', 'Body', 'tag');
    expect(mockPostMessage).not.toHaveBeenCalled();
  });

  it('does nothing when permission is not granted', async () => {
    vi.stubGlobal('Notification', { permission: 'denied' });
    await showNotification('Title', 'Body', 'tag');
    expect(mockPostMessage).not.toHaveBeenCalled();
  });

  it('sends a SHOW_NOTIFICATION message to the active service worker', async () => {
    await showNotification('Test Bill', 'Due today!', 'tag-123', { reminderId: 'rem_1' });
    expect(mockPostMessage).toHaveBeenCalledWith({
      type: 'SHOW_NOTIFICATION',
      payload: { title: 'Test Bill', body: 'Due today!', tag: 'tag-123', data: { reminderId: 'rem_1' } },
    });
  });

  it('works without a tag', async () => {
    await showNotification('Title', 'Body');
    expect(mockPostMessage).toHaveBeenCalledWith({
      type: 'SHOW_NOTIFICATION',
      payload: { title: 'Title', body: 'Body', tag: undefined, data: {} },
    });
  });

  it('does not throw when postMessage fails', async () => {
    mockPostMessage.mockImplementation(() => { throw new Error('postMessage error'); });
    await expect(showNotification('Title', 'Body', 'tag')).resolves.toBeUndefined();
  });

  it('does not throw when navigator.serviceWorker.ready rejects', async () => {
    vi.stubGlobal('navigator', {
      serviceWorker: { ready: Promise.reject(new Error('Ready error')) },
    });
    await expect(showNotification('Title', 'Body', 'tag')).resolves.toBeUndefined();
  });
});

// ==============================================================================
// checkReminders
// ==============================================================================

describe('checkReminders', () => {
  let mockPostMessage;

  beforeEach(() => {
    mockPostMessage = vi.fn();

    vi.stubGlobal('Notification', { permission: 'granted' });
    vi.stubGlobal('navigator', {
      serviceWorker: {
        ready: Promise.resolve({ active: { postMessage: mockPostMessage } }),
      },
    });

    // Pin today to 2026-06-15 so tests are deterministic
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('returns zero count when reminders is not an array', () => {
    const result = checkReminders(null, new Set(), 'en');
    expect(result.notifiedCount).toBe(0);
  });

  it('returns zero count when permission is not granted', () => {
    vi.stubGlobal('Notification', { permission: 'denied' });
    const result = checkReminders([{ id: 'rem_1', name: 'Bill', dueDate: '2026-06-15', amount: 100, status: 'unpaid' }], new Set(), 'en');
    expect(result.notifiedCount).toBe(0);
  });

  it('notifies for reminders due today', async () => {
    const reminders = [
      { id: 'rem_1', name: 'Electric Bill', dueDate: '2026-06-15', amount: 1500, status: 'unpaid' },
    ];
    const result = checkReminders(reminders, new Set(), 'en');
    // Flush microtasks so the async showNotification promise resolves
    await Promise.resolve();

    expect(result.notifiedCount).toBe(1);
    expect(mockPostMessage).toHaveBeenCalled();
    const msg = mockPostMessage.mock.calls[0][0];
    expect(msg.type).toBe('SHOW_NOTIFICATION');
    expect(msg.payload.title).toContain('📋');
    expect(msg.payload.body).toContain('Electric Bill');
    expect(msg.payload.body).toContain('due today');
    expect(msg.payload.tag).toContain('reminder-due-rem_1-2026-06-15');
    expect(msg.payload.data).toEqual({ reminderId: 'rem_1' });
  });

  it('notifies for reminders due tomorrow', async () => {
    const reminders = [
      { id: 'rem_2', name: 'Rent', dueDate: '2026-06-16', amount: 12000, status: 'unpaid' },
    ];
    const result = checkReminders(reminders, new Set(), 'en');
    await Promise.resolve();

    expect(result.notifiedCount).toBe(1);
    const msg = mockPostMessage.mock.calls[0][0];
    expect(msg.payload.body).toContain('due tomorrow');
    expect(msg.payload.tag).toContain('reminder-due-tomorrow-rem_2-2026-06-16');
  });

  it('notifies for overdue reminders (5 days)', async () => {
    const reminders = [
      { id: 'rem_3', name: 'Water Bill', dueDate: '2026-06-10', amount: 800, status: 'unpaid' },
    ];
    const result = checkReminders(reminders, new Set(), 'en');
    await Promise.resolve();

    expect(result.notifiedCount).toBe(1);
    const msg = mockPostMessage.mock.calls[0][0];
    expect(msg.payload.body).toContain('overdue by 5 days');
    expect(msg.payload.body).toContain('Water Bill');
    expect(msg.payload.tag).toContain('reminder-overdue-rem_3-2026-06-15');
  });

  it('notifies for overdue by exactly 1 day (singular)', async () => {
    const reminders = [
      { id: 'rem_sing', name: 'Gas Bill', dueDate: '2026-06-14', amount: 600, status: 'unpaid' },
    ];
    const result = checkReminders(reminders, new Set(), 'en');
    await Promise.resolve();

    expect(result.notifiedCount).toBe(1);
    const msg = mockPostMessage.mock.calls[0][0];
    expect(msg.payload.body).toContain('overdue by 1 day');
    expect(msg.payload.body).not.toContain('1 days');
    expect(msg.payload.tag).toContain('reminder-overdue-rem_sing-2026-06-15');
  });

  it('skips paid reminders', () => {
    const reminders = [
      { id: 'rem_4', name: 'Paid Bill', dueDate: '2026-06-15', amount: 500, status: 'paid' },
    ];
    const result = checkReminders(reminders, new Set(), 'en');
    expect(result.notifiedCount).toBe(0);
    expect(mockPostMessage).not.toHaveBeenCalled();
  });

  it('does not duplicate notifications for already-shown tags', () => {
    const reminders = [
      { id: 'rem_5', name: 'Duplicate', dueDate: '2026-06-15', amount: 100, status: 'unpaid' },
    ];
    const shownTags = new Set(['reminder-due-rem_5-2026-06-15']);
    const result = checkReminders(reminders, shownTags, 'en');
    expect(result.notifiedCount).toBe(0);
    expect(mockPostMessage).not.toHaveBeenCalled();
  });

  it('returns updatedShownTags with the new tag added', () => {
    const reminders = [
      { id: 'rem_6', name: 'New Tag', dueDate: '2026-06-15', amount: 100, status: 'unpaid' },
    ];
    const result = checkReminders(reminders, new Set(), 'en');
    expect(result.updatedShownTags.has('reminder-due-rem_6-2026-06-15')).toBe(true);
  });

  it('trims shownTags set to 200 entries maximum', () => {
    const largeShown = new Set(
      Array.from({ length: 250 }, (_, i) => `old-tag-${i}`),
    );
    const reminders = [
      { id: 'rem_7', name: 'Trim', dueDate: '2026-06-15', amount: 100, status: 'unpaid' },
    ];
    const result = checkReminders(reminders, largeShown, 'en');
    expect(result.updatedShownTags.size).toBeLessThanOrEqual(200);
  });

  it('handles multiple due reminders in the same check', async () => {
    const reminders = [
      { id: 'rem_8', name: 'Bill A', dueDate: '2026-06-15', amount: 100, status: 'unpaid' },
      { id: 'rem_9', name: 'Bill B', dueDate: '2026-06-16', amount: 200, status: 'unpaid' },
      { id: 'rem_10', name: 'Bill C', dueDate: '2026-06-10', amount: 300, status: 'unpaid' },
    ];
    const result = checkReminders(reminders, new Set(), 'en');
    await Promise.resolve();
    expect(result.notifiedCount).toBe(3);
    expect(mockPostMessage).toHaveBeenCalledTimes(3);
  });

  it('formats due-today body in Bengali locale', async () => {
    const reminders = [
      { id: 'rem_11', name: 'বিদ্যুৎ বিল', dueDate: '2026-06-15', amount: 1500, status: 'unpaid' },
    ];
    const result = checkReminders(reminders, new Set(), 'bn');
    await Promise.resolve();
    expect(result.notifiedCount).toBe(1);
    const msg = mockPostMessage.mock.calls[0][0];
    expect(msg.payload.body).toContain('বিদ্যুৎ বিল');
    expect(msg.payload.body).toContain('আজকে পরিশোধ');
    // Bengali digits: ১,৫০০
    expect(msg.payload.body).toMatch(/[০-৯]+/);
  });

  it('formats overdue body in Bengali locale', async () => {
    const reminders = [
      { id: 'rem_bn_over', name: 'ভাড়া', dueDate: '2026-06-10', amount: 12000, status: 'unpaid' },
    ];
    const result = checkReminders(reminders, new Set(), 'bn');
    await Promise.resolve();
    expect(result.notifiedCount).toBe(1);
    const msg = mockPostMessage.mock.calls[0][0];
    expect(msg.payload.body).toContain('ভাড়া');
    // {days} uses String() — Western digits for the day count
    expect(msg.payload.body).toContain('5 দিন মেয়াদোত্তীর্ণ');
    // {amount} uses toLocaleString('bn-BD') — should have Bengali digits
    expect(msg.payload.body).toMatch(/[০-৯]+/);
    expect(msg.payload.tag).toContain('reminder-overdue-rem_bn_over-2026-06-15');
  });

  it('uses correct {s} handling: Bengali overdue has no plural suffix', async () => {
    // For Bengali, the {s} replacement should be empty string
    // The Bengali template 'notif.overdueDays' does NOT contain {s},
    // so the replace('{s}', '') is effectively a no-op
    const reminders = [
      { id: 'rem_bn_1d', name: 'বই', dueDate: '2026-06-14', amount: 500, status: 'unpaid' },
    ];
    const result = checkReminders(reminders, new Set(), 'bn');
    await Promise.resolve();
    expect(result.notifiedCount).toBe(1);
    const msg = mockPostMessage.mock.calls[0][0];
    expect(msg.payload.body).toContain('বই');
    // {days} uses String() — Western digit for the day count
    expect(msg.payload.body).toContain('1 দিন মেয়াদোত্তীর্ণ');
  });

  it('uses default empty Set when shownTags is not provided', () => {
    const reminders = [
      { id: 'rem_12', name: 'Default', dueDate: '2026-06-15', amount: 100, status: 'unpaid' },
    ];
    const result = checkReminders(reminders, undefined, 'en');
    expect(result.notifiedCount).toBe(1);
    expect(result.updatedShownTags.has('reminder-due-rem_12-2026-06-15')).toBe(true);
  });

  it('handles empty reminders array', () => {
    const result = checkReminders([], new Set(), 'en');
    expect(result.notifiedCount).toBe(0);
    expect(result.updatedShownTags.size).toBe(0);
  });
});

// ==============================================================================
// isServiceWorkerActive
// ==============================================================================

describe('isServiceWorkerActive', () => {
  let mockGetRegistrations;

  beforeEach(() => {
    mockGetRegistrations = vi.fn();
    vi.stubGlobal('Notification', {});
    vi.stubGlobal('navigator', {
      serviceWorker: { getRegistrations: mockGetRegistrations },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns true when service worker registrations exist', async () => {
    mockGetRegistrations.mockResolvedValue([{ scope: '/' }]);
    const result = await isServiceWorkerActive();
    expect(result).toBe(true);
  });

  it('returns false when no registrations exist', async () => {
    mockGetRegistrations.mockResolvedValue([]);
    const result = await isServiceWorkerActive();
    expect(result).toBe(false);
  });

  it('returns false when not supported', async () => {
    vi.stubGlobal('navigator', {});
    const result = await isServiceWorkerActive();
    expect(result).toBe(false);
  });

  it('returns false when getRegistrations fails', async () => {
    mockGetRegistrations.mockRejectedValue(new Error('SW error'));
    const result = await isServiceWorkerActive();
    expect(result).toBe(false);
  });
});
