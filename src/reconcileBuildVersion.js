// ==============================================================================
// Build Version Reconciliation
// ==============================================================================
// When a new APK is installed over an existing one, the Android WebView cache
// can serve stale index.html + old JS/CSS assets (cached from the previous
// build). This makes the app appear unchanged despite the upgrade.
//
// To break this cycle, we detect version changes on boot:
// 1. Compare the stored build version with the current BUILD_VERSION
//    (auto-generated from git hash + date, unique per build)
// 2. If different, clear all Cache API caches + unregister stale SWs
// 3. Reload with a cache-busting query param that bypasses the old index.html
//
// This runs BEFORE React renders, ensuring zero flash of stale content.
// Even if index.html is cached, the old JS it references includes this check,
// so a future upgrade will always self-heal.

const STORAGE_KEY = 'pocket_khata_build_version';

/**
 * Compare the stored build version with the current version and act if they differ.
 *
 * @param {string} buildVersion - The current build version (e.g. "build-2026-06-01-a1b2c3d")
 * @returns {'first_boot'|'no_change'|'reload'|'error'} Result of the reconciliation.
 */
export function reconcileBuildVersion(buildVersion) {
  try {
    const storedVersion = localStorage.getItem(STORAGE_KEY);

    if (storedVersion && storedVersion !== buildVersion) {
      // ── Upgrade detected: clear ALL cached assets ──

      // 1. Clear Cache API (service worker caches, if any)
      if (typeof caches !== 'undefined') {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        }).catch(() => {});
      }

      // 2. Unregister any stale service workers
      if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(reg => reg.unregister());
        }).catch(() => {});
      }

      // 3. Persist the new version BEFORE the reload to prevent infinite loops
      localStorage.setItem(STORAGE_KEY, buildVersion);

      // 4. Reload with cache-busting param — this creates a NEW URL so the
      //    WebView cannot serve a cached index.html for it.
      if (typeof window !== 'undefined' && window.location) {
        window.location.href = window.location.pathname + '?v=' + buildVersion;
      }
      return 'reload';
    }

    if (!storedVersion) {
      // First-ever boot — store version for future upgrade detection
      localStorage.setItem(STORAGE_KEY, buildVersion);
      return 'first_boot';
    }

    return 'no_change';
  } catch (e) {
    // Fail silently — version check is non-critical for normal operation
    console.warn('[PK] Build version reconciliation skipped:', e);
    return 'error';
  }
}
