
FIX VALIDATION RULE (CRITICAL)

- No fix is considered complete unless BOTH conditions are met:
  1. Technical verification (code is updated and logic is applied correctly)
  2. User confirmation (user explicitly approves the fix)

- Agent MUST mark fixes as:
  - TECH_DONE → code fixed but NOT user confirmed
  - DONE → ONLY after user confirmation

- Agent must NEVER assume a fix is completed without:
  - verifying code change exists
  - checking expected behavior in context
  - awaiting user confirmation

- SESSION_STATE.md and FIX_LOG.md must always reflect this distinction

---

# 📋 FIX LOG ENTRIES

---

## FIX-001: Stale `?v=` URL Query Parameter Cleanup

| Field | Value |
|-------|-------|
| **Commit** | `2491a30` |
| **Status** | ✅ DONE |
| **Type** | Bug (URL hygiene) |
| **Module** | reconcileBuildVersion |

**Problem:** After version reconciliation confirmed a match, the stale `?v=` query parameter remained in the URL, causing an unclean app state after reload.

**Fix:** Added URL parameter cleanup logic in `src/reconcileBuildVersion.js` to remove the `?v=` param after successful version match confirmation.

**Files changed:** `src/reconcileBuildVersion.js`

---

## FIX-002: Splash Screen, Version Display, Calendar Reminder Integration

| Field | Value |
|-------|-------|
| **Commit** | `cd124ec` |
| **Status** | ✅ DONE |
| **Type** | Multiple fixes |
| **Module** | App, Calendar, Reminders, Build |

**Problems:**
1. Custom React splash screen caused flicker on load
2. Version display was inconsistent across Android and web builds
3. Calendar view didn't show reminders from the notification system

**Fixes:**
- Removed custom splash screen to eliminate flicker
- Unified versioning via `version.properties` across Android and web
- Integrated native notifications via `@capacitor/local-notifications` for reminders
- Added APK build pipeline in CI/CD workflow

**Files changed:** 18 files across Android config, build scripts, Calendar, ReminderManager, Settings, db.js, notifications.js, vite/vitest configs

---

## FIX-003: Transaction Sorting by `createdAt` Within Date Groups

| Field | Value |
|-------|-------|
| **Commit** | `ddc49f2` |
| **Status** | ✅ DONE |
| **Type** | Bug (incorrect ordering) |
| **Module** | TransactionHistory |

**Problem:** Transactions within the same date group were not consistently sorted by creation time (`createdAt`), leading to unpredictable ordering in the transaction history list.

**Fix:** Updated sorting logic in `src/App.jsx` and `src/components/TransactionHistory.jsx` to sort transactions by `createdAt` descending within each date group. Added tests.

**Files changed:** `src/App.jsx`, `src/components/TransactionHistory.jsx`, `src/tests/App.test.jsx`, `src/tests/TransactionHistory.test.jsx`, build scripts, rule files

---

## FIX-004: 6 Stability and UI Issues Across the App

| Field | Value |
|-------|-------|
| **Commit** | `a0976d3` |
| **Status** | ✅ DONE |
| **Type** | Multiple fixes (6 issues) |
| **Module** | Dashboard, Calendar, PieChart, TransactionForm, App |

**Problems & Fixes:**
1. **Dashboard transaction sorting** — Fixed order of recent transactions
2. **Calendar view layout** — Resolved rendering issues in monthly view
3. **PieChart rendering** — Fixed label overlap and animation glitches
4. **TransactionForm category modal** — Added quick-add category feature
5. **Settings UI** — Cleaned up layout and improved consistency
6. **Transaction n/a handling** — Fixed edge case with undefined transaction data

**Files changed:** `src/App.jsx`, `src/components/CalendarView.jsx`, `src/components/Dashboard.jsx`, `src/components/PieChart.jsx`, `src/components/TransactionForm.jsx`, `src/i18n.js`, `src/tests/PieChart.test.jsx`

---

## FIX-005: Settings Toast Positioning Alignment

| Field | Value |
|-------|-------|
| **Commit** | `61886f3` |
| **Status** | ✅ DONE |
| **Type** | UI alignment |
| **Module** | Settings |

**Problem:** Toast notifications in the Settings screen were positioned differently (offset) compared to toasts in the main app screens, causing visual inconsistency.

**Fix:** Unified toast positioning CSS in `src/components/Settings.jsx` to match the main app toast container styles.

**Files changed:** `src/components/Settings.jsx`

---

## FIX-006: PieChart Label Rendering (Z-Order & Sizing)

| Field | Value |
|-------|-------|
| **Commit** | `9bd2afd` |
| **Status** | ✅ DONE |
| **Type** | Bug (visual rendering) |
| **Module** | PieChart |

**Problem:** PieChart labels were hidden behind the center donut hole circle because SVG elements were rendered in incorrect z-order.

**Fix:** Restructured SVG render order so labels are drawn in a separate pass after the center circle, ensuring they're always visible on top.

**Also included in this commit:**
- Native notification rewrite via Capacitor plugin
- Accessibility (a11y) fixes in Settings
- `defaultProps` cleanup for future React compatibility

**Files changed:** `src/components/PieChart.jsx`, `src/components/Settings.jsx`, `src/App.jsx`, `src/components/ReminderManager.jsx`, `src/notifications.js`, `src/tests/notifications.test.jsx`

---

## FIX-007: PieChart Z-Order + AccountManager Stale State + Balance Adjustment

| Field | Value |
|-------|-------|
| **Commit** | `0ac3f59` |
| **Status** | ✅ DONE |
| **Type** | Bug + Feature |
| **Module** | PieChart, AccountManager, App |

**Problems & Fixes:**
1. **PieChart z-order regression** — Labels still hidden behind the center donut hole (follow-up to FIX-006). Final fix: segments rendered first, donut hole + center text second, labels rendered LAST in a separate SVG pass.
2. **AccountManager stale state** — Edit drawer showed old balance after save because `selectedAccount` wasn't synced with updated `accounts` prop. Fixed: added `useEffect` to sync after every update.
3. **Balance adjustment → transaction integration** — New feature: when balance is edited, the difference is automatically created as an income or expense transaction.

**Files changed:** `src/components/PieChart.jsx`, `src/components/AccountManager.jsx`, `src/App.jsx`, `src/i18n.js`, `src/tests/App.test.jsx`

---

# 📊 SUMMARY

| # | Fix | Files | Status |
|---|-----|-------|--------|
| FIX-001 | Stale `?v=` URL param cleanup | 1 | ✅ DONE |
| FIX-002 | Splash screen, version display, reminders | 18 | ✅ DONE |
| FIX-003 | Transaction sorting within date groups | 5+ | ✅ DONE |
| FIX-004 | 6 stability and UI issues | 7 | ✅ DONE |
| FIX-005 | Settings toast positioning alignment | 1 | ✅ DONE |
| FIX-006 | PieChart label z-order & sizing | 6 | ✅ DONE |
| FIX-007 | PieChart z-order (final), AccountManager state sync, balance adjustments | 5 | ✅ DONE |