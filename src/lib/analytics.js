/**
 * Analytics system has been removed.
 * All exports are no-op stubs for backward compatibility.
 */

export function getConsent() { return null; }
export function setConsent() {}
export function resetConsent() {}
export function isTrackingAllowed() { return false; }
export function getDeviceInfo() { return {}; }
export function flushEvents() { return 0; }
export function trackScreenView() {}
export function trackAction() {}
export function trackError() {}
export function trackDeviceInfo() {}
export function getQueuedEventCount() { return 0; }
export function getLastSyncDisplay() { return null; }
export function startAutoSync() { return () => {}; }
