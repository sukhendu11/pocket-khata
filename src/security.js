/**
 * Security utilities for Pocket Khata
 * PIN hashing, encryption helpers, etc.
 */

/**
 * Simple hash function for PIN (not cryptographically secure, but sufficient for PIN)
 * For production, consider using crypto-js or a proper library
 * @param {string} pin - The PIN to hash
 * @returns {string} - Hashed PIN
 */
function hashPIN(pin) {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Verify PIN against stored hash
 * @param {string} inputPin - User entered PIN
 * @param {string} storedHash - Stored hash from localStorage
 * @returns {boolean} - Whether PIN matches
 */
function verifyPIN(inputPin, storedHash) {
  return hashPIN(inputPin) === storedHash;
}

/**
 * Generate a simple device fingerprint (not for security, just for tracking)
 * @returns {string} - Device fingerprint
 */
function getDeviceFingerprint() {
  const navigator_ = navigator;
  const screen_ = window.screen;
  return [
    navigator_.userAgent,
    navigator_.language,
    screen_.width + 'x' + screen_.height,
    new Date().getTimezoneOffset(),
  ].join('|');
}

export { hashPIN, verifyPIN, getDeviceFingerprint };
