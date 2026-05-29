// src/tests/notifications.test.js — Tests for cacheRemindersForSW and registerPeriodicSync

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cacheRemindersForSW, registerPeriodicSync } from '../notifications';

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
    vi.stubGlobal('PushManager', class MockPushManager {});

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
    vi.stubGlobal('PushManager', class MockPushManager {});

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
});
