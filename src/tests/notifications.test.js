import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
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

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    checkPermissions: (...args) => mockCheckPermissions(...args),
    requestPermissions: (...args) => mockRequestPermissions(...args),
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
