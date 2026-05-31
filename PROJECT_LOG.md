# Project Log

## Rules
- Add every change made to the project here
- Do not delete old entries

## Format
- Date:
- Change:
- Reason:
- Impact:

---

## v2.4.0 — Capacitor Android & Feature Polish

### Date: 2026-05-31

### Change: Capacitor Android native support
- Added Android app scaffolding (build.gradle, proguard, manifest, icons, splash)
- Added native back button handling via OnBackPressedDispatcher
- Added Capacitor Filesystem plugin for file export
- Added keystore and signing config for release builds
- Updated app version to 2.4.0

### Reason: Enable native Android releases via Capacitor

### Impact: APK builds working; Android back button now navigates app history instead of exiting

---

### Date: 2026-05-31

### Change: Remove ConsentPopup, stub Supabase
- Deleted ConsentPopup.jsx (removed from App.jsx imports and state)
- Stubbed supabase.js with `isSupabaseConfigured: false`
- Removed Supabase analytics sync code from analytics.js
- Removed analytics consent state and delayed-popup logic
- Updated Settings.jsx to remove analytics consent UI

### Reason: Simplify the codebase — analytics consent flow added complexity without active Supabase backend

### Impact: ~200 lines removed; app no longer requests analytics consent; Settings UI cleaned up

---

### Date: 2026-05-31

### Change: Fix export toasts & ReminderManager blank screen
- Added 3 missing i18n keys: `reports.exportedPDF`, `settings.exportedJSON`, `settings.exportFailed`
- Added `stopPropagation` on ReminderManager Pay and Delete buttons to prevent card edit activation
- Centralized PDF save logic into renderer.js

### Reason: User saw blank screen when clicking Pay/Delete inside reminder cards; export toasts showed placeholder text

### Impact: ReminderManager interaction fixed; export toasts display proper localized messages

---

### Date: 2026-05-31

### Change: Add ReminderManager unit tests (70 tests)
- Created comprehensive test file with 70 tests across 17 describe blocks
- Covers: rendering, filter tabs, empty state, overdue display, add/edit/pay/delete, form validation (7 cases), event propagation, notification banners/toggles, navigation, Bangla mode, edge cases

### Reason: ReminderManager had no unit tests despite being one of the more complex components

### Impact: 799 total tests; all ReminderManager features now tested

---

### Date: 2026-05-31

### Change: Add component tests for remaining 5 untested components (134 tests)
- TransactionItem.test.jsx: 42 tests (variants, icons, selectable mode, transfers, Bangla, edge cases)
- PieChart.test.jsx: 35 tests (segments, gradients, animation, labels, clicks, donut hole, edge cases)
- ErrorBoundary.test.jsx: 25 tests (error catching, retry, error tracking, edge cases)
- SplashOverlay.test.jsx: 23 tests (phase transitions, timing, visual elements, accessibility)
- AccountList.test.jsx: 11 tests (empty state, rendering, edge cases, data flow)
- Renamed src/components/AccountList.js → AccountList.jsx (fixes Vite esbuild import analysis)

### Reason: These 5 components had no unit tests; all 16 components now covered

### Impact: 933 total tests across 24 test files; all components have test coverage