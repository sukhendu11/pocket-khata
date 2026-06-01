import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { reconcileBuildVersion } from '../reconcileBuildVersion.js';

const STORAGE_KEY = 'pocket_khata_build_version';

describe('reconcileBuildVersion', () => {
  let originalLocation;
  let originalCaches;
  let originalServiceWorker;
  let consoleWarnSpy;

  beforeEach(() => {
    // Store originals
    originalLocation = window.location;
    originalCaches = window.caches;
    originalServiceWorker = navigator.serviceWorker;

    // Always start with clean localStorage
    localStorage.clear();

    // Mock window.location with a writable href
    delete window.location;
    window.location = {
      href: 'http://localhost/index.html',
      pathname: '/index.html',
      origin: 'http://localhost',
    };

    // Spy on console.warn
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore originals
    window.location = originalLocation;
    window.caches = originalCaches;
    Object.defineProperty(navigator, 'serviceWorker', {
      value: originalServiceWorker,
      configurable: true,
      writable: true,
    });
    consoleWarnSpy.mockRestore();
  });

  // ==================== FIRST BOOT ====================

  it('stores BUILD_VERSION on first boot and returns "first_boot"', () => {
    const result = reconcileBuildVersion('build-2026-06-01-abc123');

    expect(result).toBe('first_boot');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('build-2026-06-01-abc123');
    // Should NOT navigate
    expect(window.location.href).toBe('http://localhost/index.html');
  });

  it('does not navigate or clear caches on first boot', () => {
    window.caches = { keys: vi.fn(), delete: vi.fn() };
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { getRegistrations: vi.fn() },
      configurable: true,
      writable: true,
    });

    reconcileBuildVersion('build-2026-06-01-def456');

    // No cache/ SW operations on first boot
    expect(window.location.href).toBe('http://localhost/index.html');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('build-2026-06-01-def456');
  });

  // ==================== SAME VERSION (NO CHANGE) ====================

  it('does nothing when stored version matches BUILD_VERSION and returns "no_change"', () => {
    localStorage.setItem(STORAGE_KEY, 'build-2026-06-01-abc123');

    const result = reconcileBuildVersion('build-2026-06-01-abc123');

    expect(result).toBe('no_change');
    // Still stored and unchanged
    expect(localStorage.getItem(STORAGE_KEY)).toBe('build-2026-06-01-abc123');
    // No navigation
    expect(window.location.href).toBe('http://localhost/index.html');
  });

  it('does not clear caches or unregister SW when version matches', () => {
    localStorage.setItem(STORAGE_KEY, 'build-2026-06-01-abc123');
    window.caches = { keys: vi.fn(), delete: vi.fn() };
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { getRegistrations: vi.fn() },
      configurable: true,
      writable: true,
    });

    reconcileBuildVersion('build-2026-06-01-abc123');

    // Cache API should NOT be called
    expect(window.caches.keys).not.toHaveBeenCalled();
    expect(navigator.serviceWorker.getRegistrations).not.toHaveBeenCalled();
  });

  // ==================== UPGRADE DETECTED ====================

  it('navigates to cache-busting URL when version differs and returns "reload"', () => {
    localStorage.setItem(STORAGE_KEY, 'build-2026-05-01-oldhash');

    const result = reconcileBuildVersion('build-2026-06-01-newhash');

    expect(result).toBe('reload');
    // New version should be stored BEFORE reload
    expect(localStorage.getItem(STORAGE_KEY)).toBe('build-2026-06-01-newhash');
    // Should navigate to cache-busting URL
    expect(window.location.href).toBe('/index.html?v=build-2026-06-01-newhash');
  });

  it('constructs the reload URL as pathname + ?v= + buildVersion (not full href with origin)', () => {
    // Use a subdirectory path to prove pathname is used, not full href
    delete window.location;
    window.location = {
      href: 'https://example.com/app/index.html',
      pathname: '/app/index.html',
      origin: 'https://example.com',
    };

    localStorage.setItem(STORAGE_KEY, 'build-2026-05-01-oldhash');

    reconcileBuildVersion('build-2026-06-01-newhash');

    // The URL must be pathname + '?v=' + buildVersion
    // It must NOT include origin or any other query params
    expect(window.location.href).toBe('/app/index.html?v=build-2026-06-01-newhash');
  });

  it('uses exactly ?v= as the query param prefix (not ?version=, not &v=)', () => {
    localStorage.setItem(STORAGE_KEY, 'build-2026-05-01-oldhash');

    reconcileBuildVersion('build-2026-06-01-newhash');

    // Verify the exact prefix: ?v= (not ?version= or &v=)
    expect(window.location.href).toBe('/index.html?v=build-2026-06-01-newhash');
    // Double-check via regex that only one '?v=' appears and it's the query
    expect(window.location.href).toMatch(/\/index\.html\?v=build-/);
    // Ensure there's no additional query params appended incorrectly
    expect(window.location.href.split('?').length).toBe(2);
  });

  it('clears all Cache API caches on upgrade', async () => {
    localStorage.setItem(STORAGE_KEY, 'build-2026-05-01-oldhash');
    const cacheDelete = vi.fn().mockResolvedValue(true);
    window.caches = {
      keys: vi.fn().mockResolvedValue(['v1-cache', 'v2-cache', 'sw-cache']),
      delete: cacheDelete,
    };

    reconcileBuildVersion('build-2026-06-01-newhash');

    // Flush microtask queue so .then() callbacks execute
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(window.caches.keys).toHaveBeenCalledOnce();
    expect(cacheDelete).toHaveBeenCalledTimes(3);
    expect(cacheDelete).toHaveBeenCalledWith('v1-cache');
    expect(cacheDelete).toHaveBeenCalledWith('v2-cache');
    expect(cacheDelete).toHaveBeenCalledWith('sw-cache');
  });

  it('unregisters all stale service workers on upgrade', async () => {
    localStorage.setItem(STORAGE_KEY, 'build-2026-05-01-oldhash');
    const unregister1 = vi.fn().mockResolvedValue(true);
    const unregister2 = vi.fn().mockResolvedValue(true);
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        getRegistrations: vi.fn().mockResolvedValue([
          { unregister: unregister1 },
          { unregister: unregister2 },
        ]),
      },
      configurable: true,
      writable: true,
    });

    reconcileBuildVersion('build-2026-06-01-newhash');

    // Flush microtask queue so .then() callbacks execute
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(navigator.serviceWorker.getRegistrations).toHaveBeenCalledOnce();
    expect(unregister1).toHaveBeenCalledOnce();
    expect(unregister2).toHaveBeenCalledOnce();
  });

  it('stores new version before reloading to prevent infinite loop', () => {
    localStorage.setItem(STORAGE_KEY, 'build-2026-05-01-oldhash');

    reconcileBuildVersion('build-2026-06-01-newhash');

    // The version must be stored BEFORE href is changed
    expect(localStorage.getItem(STORAGE_KEY)).toBe('build-2026-06-01-newhash');
  });

  // ==================== CACHE/SW UNAVAILABLE ====================

  it('navigates even when Cache API is unavailable', () => {
    localStorage.setItem(STORAGE_KEY, 'build-2026-05-01-oldhash');
    delete window.caches;

    const result = reconcileBuildVersion('build-2026-06-01-newhash');

    expect(result).toBe('reload');
    expect(window.location.href).toBe('/index.html?v=build-2026-06-01-newhash');
  });

  it('navigates even when serviceWorker is unavailable', () => {
    localStorage.setItem(STORAGE_KEY, 'build-2026-05-01-oldhash');
    Object.defineProperty(navigator, 'serviceWorker', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const result = reconcileBuildVersion('build-2026-06-01-newhash');

    expect(result).toBe('reload');
    expect(window.location.href).toBe('/index.html?v=build-2026-06-01-newhash');
  });

  it('does not crash when caches.keys() rejects', async () => {
    localStorage.setItem(STORAGE_KEY, 'build-2026-05-01-oldhash');
    window.caches = {
      keys: vi.fn().mockRejectedValue(new Error('Cache error')),
      delete: vi.fn(),
    };

    // Should not throw — catch block handles it silently
    const result = reconcileBuildVersion('build-2026-06-01-newhash');
    expect(result).toBe('reload');

    // Flush microtask queue for the rejected promise .catch()
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(window.caches.keys).toHaveBeenCalledOnce();
    // Navigation still happens
    expect(window.location.href).toBe('/index.html?v=build-2026-06-01-newhash');
  });

  it('does not crash when serviceWorker.getRegistrations() rejects', async () => {
    localStorage.setItem(STORAGE_KEY, 'build-2026-05-01-oldhash');
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        getRegistrations: vi.fn().mockRejectedValue(new Error('SW error')),
      },
      configurable: true,
      writable: true,
    });

    const result = reconcileBuildVersion('build-2026-06-01-newhash');
    expect(result).toBe('reload');

    // Flush microtask queue for the rejected promise .catch()
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(navigator.serviceWorker.getRegistrations).toHaveBeenCalledOnce();
    expect(window.location.href).toBe('/index.html?v=build-2026-06-01-newhash');
  });

  // ==================== ERROR HANDLING ====================

  it('returns "error" and logs a warning when localStorage throws', () => {
    // Break localStorage by making it throw on getItem
    const originalGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = vi.fn(() => {
      throw new Error('localStorage not available');
    });

    const result = reconcileBuildVersion('build-2026-06-01-abc123');

    expect(result).toBe('error');
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[PK] Build version reconciliation skipped:',
      expect.any(Error),
    );

    // Restore
    Storage.prototype.getItem = originalGetItem;
  });

  it('returns "error" and logs a warning when localStorage.setItem throws on first boot', () => {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = vi.fn(() => {
      throw new Error('Storage full');
    });

    const result = reconcileBuildVersion('build-2026-06-01-abc123');

    expect(result).toBe('error');
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[PK] Build version reconciliation skipped:',
      expect.any(Error),
    );

    Storage.prototype.setItem = originalSetItem;
  });

  // ==================== EDGE: NULL / EMPTY / FALSY ====================

  it('treats empty stored version as first boot', () => {
    localStorage.setItem(STORAGE_KEY, '');

    const result = reconcileBuildVersion('build-2026-06-01-abc123');

    // Empty string is falsy, so treated as first boot
    expect(result).toBe('first_boot');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('build-2026-06-01-abc123');
  });

  it('treats literal "null" stored value as a real version (not first boot)', () => {
    localStorage.setItem(STORAGE_KEY, 'null');

    const result = reconcileBuildVersion('build-2026-06-01-abc123');

    // 'null' string is truthy, so it's not first boot.
    // 'null' !== BUILD_VERSION → upgrade detected → reload
    expect(result).toBe('reload');
    expect(window.location.href).toContain('?v=build-2026-06-01-abc123');
  });

  // ==================== EDGE: VERY LONG VERSION STRINGS ====================

  it('handles long build version strings correctly', () => {
    const longVersion = 'build-2026-06-01-' + 'a'.repeat(100);
    localStorage.setItem(STORAGE_KEY, longVersion);

    // Same version → no change
    expect(reconcileBuildVersion(longVersion)).toBe('no_change');

    // Different version → reload
    const diffVersion = 'build-2026-06-01-' + 'b'.repeat(100);
    expect(reconcileBuildVersion(diffVersion)).toBe('reload');
    expect(window.location.href).toContain('?v=' + diffVersion);
  });
});
