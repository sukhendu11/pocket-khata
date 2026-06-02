// Pocket Khata — Service Worker
// Basic asset caching + offline support

const CACHE_NAME = 'pocket-khata-cache-v1';

// ─── Determine base path dynamically (works for both root & subfolder deployments) ─
const BASE_URL = self.registration ? self.registration.scope : '/';

// ─── Skip caching in development (localhost) to avoid stale caches ──────────────
const IS_LOCALHOST = self.location && (
  self.location.hostname === 'localhost' ||
  self.location.hostname === '127.0.0.1' ||
  self.location.hostname.includes('192.168.') ||
  self.location.hostname.includes('10.0.')
);

// ─── Install: Pre-cache core assets (production only) ─────────────────────────
self.addEventListener('install', (event) => {
  if (!IS_LOCALHOST) {
    const ASSETS_TO_CACHE = [
      BASE_URL,
      BASE_URL + 'index.html',
      BASE_URL + 'manifest.json',
      BASE_URL + 'vite.svg',
      BASE_URL + 'pwa-icon-192.svg',
      BASE_URL + 'pwa-icon-512.svg',
    ];
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE);
      }).catch((err) => {
        console.error('[SW] Cache install failed (non-critical):', err);
      })
    );
  }
  // Activate immediately — don't wait for page refresh
  self.skipWaiting();
});

// ─── Activate: Clean up old caches ────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// ─── Fetch: Network-first in dev, cache-first in production ──────────────────
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // ── Bypass SW cache for version-busted URLs ────────────────────────
  // When reconcileBuildVersion detects an APK upgrade, it reloads the
  // page with ?v=BUILD_VERSION appended. This creates a unique URL that
  // cannot be matched by the old SW cache entries. However, the SW's
  // cache-first strategy would still try to match it — and since there's
  // no cached entry for the new ?v= URL, it would fall through to network.
  // That's correct behavior, but we can skip the cache lookup entirely
  // for these URLs, saving an unnecessary cache read on every versioned load.
  // More importantly, on the FIRST load after an upgrade (before the SW
  // has been updated), the old SW might still intercept requests. Bypassing
  // here guarantees fresh assets regardless of what the old SW has cached.
  if (event.request.url.includes('?v=')) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (IS_LOCALHOST) {
    // Dev mode: always fetch from network (no cache)
    event.respondWith(fetch(event.request).catch(() => {
      return caches.match(event.request);
    }));
  } else {
    // Production: cache-first, fallback to network
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return cachedResponse || fetch(event.request);
      })
    );
  }
});
