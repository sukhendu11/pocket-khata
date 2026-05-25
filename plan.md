# App Lock (PIN/Biometric) Implementation Plan

## Overview
Implementing Feature 1: App Lock for Pocket Khata. Users will set a PIN, lock the app on startup, and unlock via PIN or biometric (WebAuthn if available).

## Approach

### 1. Dependencies
- Add `crypto-js` for PIN hashing (browser-friendly, no build complexity)
- Use WebAuthn API if available for biometric support
- Fallback to PIN-only if WebAuthn unavailable

### 2. Storage Structure (localStorage)
- Key: `appLock` (JSON object)
- Structure:
  ```json
  {
    "isEnabled": boolean,
    "pinHash": "string (hashed with crypto-js)",
    "lockTimeout": number (0=immediate, 5/15/30 min),
    "deviceBypass": boolean (remember device 30 days),
    "biometricEnabled": boolean
  }
  ```

### 3. Files to Create/Modify

#### Create: `src/utils/lockManager.js`
- PIN hashing/verification using crypto-js
- Storage helpers (getAppLock, setAppLock, etc.)
- Lock state management utilities
- Device bypass logic (30-day token in localStorage)

#### Enhance: `src/components/LockScreen.jsx`
- Already has UI structure; enhance with:
  - Real PIN verification with hashed comparison
  - WebAuthn API integration (if available)
  - Device bypass checkbox
  - Error handling for invalid PIN
  - Success state transitions

#### Enhance: `src/components/Settings.jsx`
- Add "Security" section with:
  - PIN setup/change option (shows PIN entry UI in modal)
  - PIN disable option
  - Biometric toggle (enable/disable)
  - Lock timeout selector
  - Device bypass toggle
  - View/modify settings UI

#### Modify: `src/App.jsx`
- Add lock screen state management
- Check lock status on app start
- Handle unlock and re-lock on visibility change
- Integrate lock screen overlay (similar to TransactionForm)
- Tab visibility listener for re-lock on blur

#### Enhance: `src/db.js`
- Keep existing PIN storage key (already defined as 'pocket_khata_security')
- Add helper functions for app lock settings

### 4. Implementation Steps

1. **Install crypto-js**
   - Add to package.json

2. **Create lockManager.js**
   - PIN hashing utilities (SHA256)
   - Storage getter/setters
   - Device bypass token generation

3. **Enhance LockScreen.jsx**
   - Implement real PIN verification
   - Add device bypass checkbox
   - WebAuthn detection and fallback

4. **Enhance Settings.jsx**
   - Add security section
   - PIN setup/change modal
   - Biometric and timeout toggles

5. **Modify App.jsx**
   - Add lock state
   - Integrate LockScreen as overlay
   - Add visibility change listener

6. **Create Tests**
   - LockScreen.test.jsx
   - lockManager.test.js (if time permits)

### 5. Key Behaviors

- **First Load**: If PIN is set, show LockScreen before any app content
- **Unlock**: Display main app
- **Tab Blur**: Re-lock after configurable timeout
- **Device Bypass**: Optional "remember for 30 days" - stores encrypted token
- **Security**: No PIN stored in plain text; use SHA256 hash

### 6. Success Criteria
- PIN entry UI works smoothly with numeric keypad
- PIN validation works (hashed comparison)
- Lock/unlock flow functions correctly
- Settings page allows PIN setup/change/disable
- Biometric option visible (with fallback)
- Zero ESLint warnings
- All tests passing
