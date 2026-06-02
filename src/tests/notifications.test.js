import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  registerServiceWorker,
} from '../notifications';

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

  it('returns true when Notification is available', () => {
    expect(isNotificationSupported()).toBe(true);
  });

  it('returns false when Notification is missing', () => {
    delete window.Notification;
    expect(isNotificationSupported()).toBe(false);
    vi.stubGlobal('Notification', {});
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

  it('returns granted when permission is granted', async () => {
    const result = await getNotificationPermission();
    expect(result).toBe('granted');
  });

  it('returns denied when permission is denied', async () => {
    vi.stubGlobal('Notification', { permission: 'denied' });
    const result = await getNotificationPermission();
    expect(result).toBe('denied');
  });

  it('returns default when permission is default', async () => {
    vi.stubGlobal('Notification', { permission: 'default' });
    const result = await getNotificationPermission();
    expect(result).toBe('default');
  });

  it('returns unsupported when Notification is unavailable', async () => {
    delete window.Notification;
    const result = await getNotificationPermission();
    expect(result).toBe('unsupported');
    vi.stubGlobal('Notification', { permission: 'granted' });
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

  it('returns unsupported when not supported', async () => {
    delete window.Notification;
    const result = await requestNotificationPermission();
    expect(result).toBe('unsupported');
    vi.stubGlobal('Notification', { requestPermission: vi.fn() });
  });

  it('returns denied when requestPermission throws', async () => {
    Notification.requestPermission.mockRejectedValue(new Error('Permission error'));
    const result = await requestNotificationPermission();
    expect(result).toBe('denied');
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
