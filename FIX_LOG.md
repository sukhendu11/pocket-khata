
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

---

## FIX-008: PieChart Label Outside Donut + Connector Lines + Threshold Fix

| Field | Value |
|-------|-------|
| **Commit** | PENDING |
| **Status** | ⏳ TECH_DONE |
| **Type** | Bug (UI rendering + visibility) |
| **Module** | PieChart, AnalyticsView |

**Problems:**
1. **Labels inside donut** — Percentage labels rendered INSIDE the donut (at `(rad+innerRad)/2 * 0.55–0.78`), overlapping with slices and the center hole
2. **No connector lines** — No visual connection between slices and their labels
3. **Labels not showing in Income/Expense breakdowns** — `labelThreshold` of 12 hid all categories ≤12%, which meant most subcategories in breakdown charts had no labels
4. **Labels clipped at SVG edges** — Max label radius ratio of 1.35 × 65 = 87.75 exceeded the 170px SVG viewBox, causing edge-clamping

**Fixes:**
1. **Labels moved outside** — Changed `labelRadius` from `(rad+innerRad)/2 * ratio` to `rad * (1.02–1.25)`, positioning all labels outside the donut
2. **Connector lines** — Added dashed `<line>` elements from slice outer edge (`connX/connY`) to label position (`clampedX/clampedY`), styled with `var(--text-secondary)`
3. **Dynamic label distance** — Large slices (>25%): 1.02×, Medium (12-25%): 1.08×, Small (5-12%): 1.15×, Tiny (<5%): 1.25× — keeps labels closer to donut
4. **Lowered threshold** — Changed `labelThreshold` from 12 → 8 → 4 for both Income and Expense breakdown charts, so categories >4% show labels
5. **Reduced max radius** — Reduced from 1.35 to 1.25 (81.3px vs 65px outer radius) to keep labels cleanly inside the SVG viewBox
6. **CSS transitions** — Labels use `transform: translate()` on `<g>` wrapper with `transition: transform 0.3s` for smooth animation on interaction

**Files changed:** `src/components/PieChart.jsx`, `src/components/AnalyticsView.jsx`, `src/tests/PieChart.test.jsx`

---

## FIX-009: Notification Translation Keys Missing

| Field | Value |
|-------|-------|
| **Commit** | PENDING |
| **Status** | ⏳ TECH_DONE |
| **Type** | Bug (missing i18n keys) |
| **Module** | i18n |

**Problem:** Settings notification section showed raw keys like `"notif.title"` because 4 translation keys were missing from `src/i18n.js`.

**Fix:** Added 4 missing `notif.*` keys with English and Bangla translations:
- `notif.title`: 'Notifications' / 'নোটিফিকেশন'
- `notif.notificationDesc`: 'Enable notifications for bills and reminders' / 'বিল ও রিমাইন্ডারের জন্য নোটিফিকেশন চালু করুন'
- `notif.permission`: 'Notification Permission' / 'নোটিফিকেশন অনুমতি'
- `notif.permissionDeniedHint`: 'Open device settings to enable notifications' / 'চালু করতে ডিভাইস সেটিংস খুলুন'

**Files changed:** `src/i18n.js`

---

## FIX-010: PieChart Full Rewrite — Extreme Mode, Bounds Checking, Leader Lines, Responsive Sizing

| Field | Value |
|-------|-------|
| **Commit** | PENDING |
| **Status** | ⏳ TECH_DONE |
| **Type** | Bug (multiple issues) |
| **Module** | PieChart, AnalyticsView |

**Problems:**
1. **Labels clipping outside SVG** — Labels positioned at `rad + 6` with no bounds checking, causing overflow at SVG edges
2. **No extreme-ratio handling** — Single-category (100%) or near-single (95/5) charts rendered full external labels, causing visual clutter and clipping
3. **No leader lines** — No visual connection between slices and labels
4. **Fixed sizing** — SVG used fixed `width={170}` with no responsive scaling, causing layout issues on mobile
5. **Stray "%" text** — Broken label placement from connector line refactoring
6. **Index mismatch with filtered data** — When filtering 0% categories, gradient indices referenced wrong items

**Fixes:**
1. **Zero-value filtering** — `(data || []).forEach` with `(item.percentage || 0) > 0` guard, preserving original data indices via `originalIndices` array
2. **Extreme detection** — `activeItems.length <= 1 || activeItems.some(d => d.percentage >= 95)` disables external labels and shows dominant percentage + name in donut center
3. **Label bounds checking** — Clamp + shift check: if label's natural position differs from clamped position by > pill half-width (horizontal) or 10px (vertical), the label is hidden
4. **Responsive sizing** — SVG uses `width: 100%; maxWidth: size; height: auto; overflow: visible` for mobile-friendly scaling
5. **Short leader lines** — Dashed lines from slice outer edge (`connX/connY` at `rad + 1`) to label pill center, styled with `var(--text-secondary)`, only drawn for visible labels
6. **Gradient index fix** — `origIdx = originalIndices[idx]` ensures gradient lookup uses original data index, not filtered index
7. **TDZ fix** — `const origIdx` hoisted to correct block scope for 100% split rendering

**Files changed:** `src/components/PieChart.jsx`, `src/tests/AnalyticsView.test.jsx`

---

## FIX-011: Data Portability — Import Confirmation + Safety Backup

| Field | Value |
|-------|-------|
| **Commit** | PENDING |
| **Status** | ✅ DONE |
| **Type** | Enhancement (UI + safety) |
| **Module** | Settings, i18n |

**Problems:**
1. **No confirmation before import** — Selecting a JSON file immediately overwrote all data with no user confirmation
2. **No safety backup** — Importing a file could permanently overwrite data with no rollback option
3. **`alert()` dialogs** — Import results used browser `alert()` instead of the app's toast notification system

**Fixes:**
1. **Import confirmation dialog** — After selecting a JSON file, the content is validated and a confirmation dialog shows:
   - Warning message: "This will replace ALL current data..."
   - File preview: filename + item counts (accounts, categories, transactions, budgets, goals, reminders)
   - Cancel / Import & Replace buttons
2. **Safety backup** — Before importing, `saveString()` creates a `Pocket_Khata_PreImport_Backup_<date>.json` file with current data
3. **Toast notifications** — Success/error results use `setToast()` instead of `alert()`
4. **JSON validation** — File content is parsed with `JSON.parse()` and structure-checked before the confirmation dialog appears
5. **i18n keys** — Added 3 new translation keys (EN/BN): `importFailed`, `importConfirmTitle`, `importConfirmAction`
6. **Tests updated** — Import test now mocks `saveString` and steps through the new confirmation flow

**Also included in this session:**
- `alert()`→`setToast()` fix for Reset Data handler (consistency)
- `--border-color` CSS variable added to `index.css` (light: `rgba(0,0,0,0.08)`, dark: `rgba(255,255,255,0.1)`)

**Files changed:** `src/components/Settings.jsx`, `src/i18n.js`, `src/index.css`, `src/tests/Settings.test.jsx`

---

## FIX-012: Scroll-Triggered Entrance Animations

| Field | Value |
|-------|-------|
| **Commit** | PENDING |
| **Status** | ✅ DONE |
| **Type** | Enhancement (UX) |
| **Module** | useInView, AnalyticsView |

**Problem:** Entrance animations (arrow bounce, counter slide-up) played on mount for all sections, but AnalyticsView's Smart Insights card is below the fold — users who scrolled down missed the animation entirely.

**Fixes:**
1. **`useInView` hook** (`src/hooks/useInView.js`) — IntersectionObserver-based hook that fires once when an element first enters the viewport, then disconnects
2. **Conditional animation classes** — `arrow-entrance` and `counter-entrance` classes in AnalyticsView's Smart Insights section are now conditionally applied only when the card scrolls into view (threshold: 15%)
3. **Budget vs Actual card** also wrapped with `useInView` for scroll-triggered counters

**Also included in this session:**
- Dashboard number counter entrance animation (balance/income/expense, staggered 0.15s/0.25s/0.35s)
- AnalyticsView insight stat counter entrance animation (income/expense/savings rate, staggered 0.3s/0.4s/0.5s)
- AnalyticsView Budget vs Actual total counters with scroll-triggered entrance
- DollarSign icon removed from ReminderManager bill list (redundant with `৳`)

**Files changed:** `src/hooks/useInView.js` (new), `src/components/AnalyticsView.jsx`, `src/components/Dashboard.jsx`, `src/components/ReminderManager.jsx`, `src/components/TransactionItem.jsx`, `src/index.css`, `src/tests/setup.js`

---

## FIX-013: Notification Visibility — Android 12+ Confirmed

| Field | Value |
|-------|-------|
| **Commit** | PENDING |
| **Status** | ✅ DONE |
| **Type** | Verification |
| **Module** | notifications, AndroidManifest |

**Verification:** Full audit of notification visibility on Android 12+:
- `POST_NOTIFICATIONS` declared in `AndroidManifest.xml` ✅
- Android 13+ (API 33+): Runtime permission dialog via `LocalNotifications.requestPermissions()` ✅
- Android 12 (API 31-32): Permission auto-granted, manifest declaration sufficient ✅
- Android 11 and below: Permission auto-granted ✅
- High-importance notification channel (`importance: 5`) with public lock screen visibility (`visibility: 1`) in `sendTestNotification()` ✅
- Permission status displayed in Settings UI (granted/denied/prompt) ✅
- User-toggle with permission request flow in Settings ✅
- `sendTestNotification()` for real-device delivery verification ✅
- Graceful fallback on non-native platforms (`isNotificationSupported()`) ✅

**Outcome:** Notification system fully compatible with Android 12 through latest Android versions.

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
| FIX-008 | PieChart labels outside donut + connector lines + threshold fix | 3 | ⏳ TECH_DONE |
| FIX-009 | Notification translation keys missing | 1 | ⏳ TECH_DONE |
| FIX-010 | PieChart full rewrite — extreme mode, bounds, leader lines, responsive | 2 | ⏳ TECH_DONE |
| FIX-011 | Data Portability — import confirmation + safety backup + `--border-color` | 4 | ✅ DONE |
| FIX-012 | Scroll-triggered entrance animations + counters + DollarSign removal | 7 | ✅ DONE |
| FIX-013 | Notification visibility — Android 12+ verified | 2 | ✅ DONE |

---