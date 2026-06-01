/**
 * Generate a unique build identifier for upgrade detection.
 * Combines the date with the short git commit hash.
 * Falls back to timestamp if git is unavailable.
 *
 * This is a CommonJS module so it can be used by both
 * vite.config.js and vitest.config.js (both ESM-compatible).
 *
 * @returns {string} e.g. "build-2026-06-01-a1b2c3d"
 */
function getBuildVersion() {
  try {
    const hash = require('child_process').execSync('git rev-parse --short HEAD', { timeout: 5000 }).toString().trim();
    const date = new Date().toISOString().split('T')[0];
    return `build-${date}-${hash}`;
  } catch {
    return `build-${Date.now()}`;
  }
}

module.exports = { getBuildVersion };
