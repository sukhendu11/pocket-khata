# Pocket Khata — AGENTS.md Memory Snapshot

## 1. Project Overview

**Pocket Khata** is a neo-morphic, offline-first personal finance manager built with React 18 and Vite 5. It enables users to track income, expenses, and transfers across multiple accounts, with full data storage on the device via browser `localStorage`. The app supports dual-language interfaces (English and Bangla) and includes budget planning, savings goals, bill reminders, analytics, and PDF/CSV reporting. It is packaged for Android via Capacitor and functions as a PWA in browsers.

---

## 2. Features (Implemented)

### Core Financial Tracking
- **Dashboard**: Net balance, monthly income/expense summary, account balances, recent transactions, spending trends with interactive graph nodes.
- **Transaction Management**: Add, edit, delete income, expense, and transfer entries; batch delete and batch categorize via select mode.
- **Account Management**: Manage Bank, Cash, bKash, Nagad, and custom accounts; real-time balance recalculation; four system accounts (Cash Ledger, Bank Account, bKash Wallet, Nagad Wallet) are always present and undeletable.
- **Category Manager**: 17 default categories with subcategories; create custom categories with icon and color picker.
- **Recurring Transactions**: Set transaction schedules (daily/weekly/monthly/yearly) with optional end date; auto-creates due transactions on load.
- **Transaction History**: Filterable and searchable list with type, account, category, and date range filters; virtualized rendering via `@tanstack/react-virtual`.

### Planning & Analytics
- **Budget Planner**: Monthly spending limits per category; visual progress bars; rollover support for unused budget.
- **Savings Goals**: Set targets, track progress, contribute from any account via transfer transaction.
- **Bill Reminders**: Create/edit/delete reminders; mark as paid with quick-pay that generates an expense transaction; due-date tracking.
- **Analytics View**: Period-based income/expense breakdowns (This Month, Last Month, 6 Months, All Time); interactive pie charts; budget vs. actual comparisons; smart insights (top category, biggest increase/decrease, savings rate, anomaly detection).
- **Calendar View**: Monthly calendar grid showing daily income/expense totals; tap days to view transactions.

### Data Portability & Backup
- **JSON Export/Import**: Full database export (accounts, categories, transactions, reminders, budgets, savings goals) with schema version metadata; import auto-runs migrations.
- **Auto-Backups**: Rolling buffer of up to 3 snapshots created before every write operation with a 3-second deduplication window.
- **CSV Export**: Export transactions to CSV for spreadsheet analysis.
- **PDF Reports**: Client-side PDF generation via html2canvas + jsPDF; configurable periods and selectable sections (summary, accounts, transactions, analytics); includes trend chart and category breakdown charts.

### User Experience
- **Dual Language**: Full English and Bangla (বাংলা) support with Bengali digit conversion for numbers.
- **Dark Mode**: Toggle between light and dark themes using CSS custom properties; persists in localStorage.
- **Neo-morphic UI**: Soft-shadow design with smooth animations and micro-interactions.
- **Responsive Shell**: Max-width 420px container simulating a smartphone; installable as PWA.
- **Code Splitting**: Lazy-loaded screens with eager preloading of TransactionHistory; Vite manual chunks (`vendor-react`, `vendor-icons`, `vendor-pdf`).
- **Error Boundary**: React ErrorBoundary wrapping app and transaction form screens with retry fallback.
- **Consent Popup**: Usage-delayed analytics consent dialog (first-time or after 3 days/30 minutes of active usage).
- **Splash Screen**: Animated splash overlay matching native Android windowBackground.

### Notifications
- **Bill Reminder Notifications**: Browser Notification API + Service Worker; checks due today, due tomorrow, and overdue reminders; periodic background sync support (Chromium only).
- **Notification Settings**: Enable/disable toggles; permission request flow.

---

## 3. Architecture

### Project Structure
```
src/
├── main.jsx                    # Entry point; registers service worker + periodic sync
├── App.jsx                     # Root component; centralized state & navigation orchestrator
├── db.js                       # localStorage persistence layer with schema migrations v7, auto-backups, recurring processing
├── i18n.js                     # Translation dictionaries (EN/BN), formatNumber/formatPercent helpers
├── utils.js                    # Bengali digit conversion, number formatting, percentage formatting
├── notifications.js            # Notification API wrapper, service worker registration, reminder checking, periodic sync
├── index.css                   # Global neo-morphic theme, CSS custom properties, animations
├── hooks/
│   └── useKeyboard.js          # Capacitor keyboard height detection for Android
├── lib/
│   ├── analytics.js            # Consent-gated analytics event queue with optional Supabase sync
│   ├── supabase.js             # Supabase client setup with graceful placeholder degradation
│   ├── download.js             # Cross-platform file download (Capacitor Filesystem, File System Access API, Native Share, Blob URL)
│   └── pdf/
│       ├── index.js            # Public facade for PDF report generation
│       ├── renderer.js         # html2canvas → jsPDF page slicing rendering pipeline
│       ├── reportData.js       # Data computation: period ranges, summaries, category breakdowns, trend, budget vs actual, insights, anomaly detection
│       ├── reportTemplates.js  # HTML template builder for PDF reports
│       └── chartEngine.js      # SVG trend bar chart and category donut chart generators
├── components/
│   ├── Dashboard.jsx            # Main dashboard overview
│   ├── TransactionForm.jsx      # Add/edit transaction modal with recurring schedule
│   ├── TransactionHistory.jsx   # Filterable, searchable, batch-operation transaction list
│   ├── TransactionItem.jsx      # Individual transaction row
│   ├── AnalyticsView.jsx        # Spending analytics, pie charts, insights, anomalies
│   ├── PieChart.jsx             # Reusable SVG pie chart component
│   ├── CalendarView.jsx         # Monthly financial calendar
│   ├── Settings.jsx             # Import/export, backups, PDF reports, reset
│   ├── AccountManager.jsx       # CRUD for financial accounts
│   ├── AccountList.js           # Simple account list (currently unused / orphaned)
│   ├── CategoryManager.jsx      # CRUD for categories with icon/color picker
│   ├── ReminderManager.jsx      # Bill reminders with pay integration
│   ├── BudgetManager.jsx        # Budget planning per category with rollover
│   ├── SavingsTracker.jsx       # Savings goals & contributions
│   ├── ErrorBoundary.jsx        # Class-based React error boundary
│   ├── ConsentPopup.jsx         # Analytics consent modal
│   └── SplashOverlay.jsx        # Splash screen overlay
├── tests/
│   ├── setup.js
│   ├── db.test.js
│   ├── utils.test.js
│   ├── download.test.js
│   ├── notifications.test.js
│   ├── reportTemplates.test.js
│   ├── reportData.test.js
│   ├── Dashboard.test.jsx
│   ├── TransactionForm.test.jsx
│   ├── TransactionHistory.test.jsx
│   ├── AnalyticsView.test.jsx
│   ├── CalendarView.test.jsx
│   ├── Settings.test.jsx
│   ├── AccountManager.test.jsx
│   ├── CategoryManager.test.jsx
│   ├── BudgetManager.test.jsx
│   ├── SavingsTracker.test.jsx
│   └── IntegrationFlow.test.jsx
android/
├── app/                          # Capacitor Android project
├── build.gradle, settings.gradle, etc.
public/
├── index.html                    # Shell with PWA meta tags, Google Fonts links
├── manifest.json                 # PWA manifest
├── sw.js                         # Service worker (caching, notifications, periodic sync)
├── pocket-khata-logo.png
├── pwa-icon-192.svg, pwa-icon-512.svg
supabase/
├── migrations/
│   └── 001_create_analytics_events.sql
```

### Design Patterns
- **Single-root state management**: All state lives in `App.jsx`; child components receive data and mutation callbacks via props.
- **LocalStorage wrapper**: `db.js` exports a singleton `db` object providing all CRUD operations, schema migrations, auto-backups, and import/export.
- **Lazy loading**: Non-dashboard screens loaded via `React.lazy()` + `Suspense`; `TransactionHistory` is eagerly preloaded after mount.
- **Consent-gated analytics**: Events are queued in localStorage and optionally synced to Supabase only after explicit user consent.
- **Progressive enhancement**: Service worker, periodic background sync, notifications, and File System Access API are all feature-detected and fail silently.

### Screen Flow & Navigation
- **Navigation state**: `currentScreen` string in `App.jsx`; screens rendered conditionally via `switch` in `renderScreen()`.
- **Bottom nav tabs**: Analytics, Income & Expense, Center FAB (add transaction), Categories, Calendar.
- **Header**: Menu button (opens Settings), language toggle (EN/বাংলা).
- **Browser history**: `window.history.pushState` on navigation; `popstate` listener for back button; native Android back handled via `window.__androidBackCallback`.
- **Available screens**: `dashboard`, `analytics`, `transactions`, `calendar`, `reminders`, `accounts`, `categories`, `budgets`, `savings`, `settings`.

---

## 4. Libraries & Dependencies

### Production Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `@capacitor/app` | ^8.1.0 | Native app lifecycle |
| `@capacitor/core` | ^8.3.4 | Native bridge (platform detection) |
| `@capacitor/filesystem` | ^8.1.2 | Native file read/write for Android exports |
| `@supabase/supabase-js` | ^2.106.2 | Optional analytics sync backend |
| `@tanstack/react-virtual` | ^3.11.3 | Virtual list rendering for TransactionHistory |
| `html2canvas` | ^1.4.1 | DOM → canvas capture for PDF generation |
| `jspdf` | ^4.2.1 | PDF document assembly |
| `lucide-react` | ^1.16.0 | Icon library (pure SVG, no network calls) |
| `react` | ^18.2.0 | UI framework |
| `react-dom` | ^18.2.0 | React DOM renderer |

### Dev Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `@capacitor/android` | ^8.3.4 | Android platform for Capacitor |
| `@capacitor/cli` | ^8.3.4 | Capacitor CLI |
| `@testing-library/jest-dom` | ^6.4.2 | Test matchers |
| `@testing-library/react` | ^14.2.1 | React component testing |
| `@types/react` | ^18.2.37 | TypeScript types (React) |
| `@types/react-dom` | ^18.2.15 | TypeScript types (React DOM) |
| `@vitejs/plugin-react` | ^4.2.0 | Vite React plugin |
| `@vitest/coverage-v8` | ^1.6.1 | Vitest coverage |
| `eslint` | ^8.53.0 | Linting |
| `eslint-plugin-react` | ^7.33.2 | React lint rules |
| `eslint-plugin-react-hooks` | ^4.6.0 | Hooks lint rules |
| `eslint-plugin-react-refresh` | ^0.4.4 | React Refresh lint rules |
| `jsdom` | ^24.0.0 | DOM environment for tests |
| `sharp` | ^0.34.5 | Image processing (used in icon generation scripts) |
| `vite` | ^5.0.0 | Build tool |
| `vitest` | ^1.6.0 | Test runner |

---

## 5. Data Flow

### State Architecture
All application state is held in `App.jsx` via `useState`:
- `accounts`, `categories`, `transactions`, `reminders`, `budgets`, `savingsGoals` — core data arrays
- `lang` — 'en' or 'bn'
- `theme` — 'light' or 'dark'
- `currentScreen` — active screen identifier
- `editingTransaction` — transaction being edited (or null)
- `showTransactionForm` — modal visibility
- `toast` — transient notification
- `analyticsConsent` — null (unanswered), 'granted', 'denied', or 'deferred'
- `notifiedTags` — Set preventing duplicate notification displays

### Persistence Flow
1. **On mount**: `App.jsx` calls `db.getXxx()` for each entity and hydrates state.
2. **User action**: Child components call parent-provided handler props.
3. **State update**: `App.jsx` updates state via `setState`, triggering re-renders.
4. **Persistence**: A `useEffect` watching all state arrays calls `db.saveXxx()` on change, which:
   - Creates an auto-backup snapshot (3-second dedup window, max 3 retained).
   - Writes JSON-serialized data to `localStorage`.
   - For transactions: updates account balances automatically.
5. **Recurring processing**: On mount, `db.processRecurringTransactions()` auto-creates due recurring transactions and updates balances; a toast confirms.

### Schema Migrations
- Current schema version: **7** (defined in `db.js`).
- Migration chain: v1→v2 (timestamps, archived, recurring), v2→v3 (demo flags), v3→v4 (subcategories, default categories), v5→v6 (remove demo data, recalculate balances), v6→v7 (recurring boolean → schedule object).
- Migrations run automatically on `db.js` module load and after imports/resets.

### Analytics Data Flow
- Event queue stored in `localStorage` key `pocket_khata_analytics_queue`.
- Events are enqueued only when consent is `'granted'`.
- `flushEvents()` attempts to bulk-insert to Supabase `analytics_events` table if configured and online; otherwise events remain queued locally.
- Max queue size: 500 events. Automatic sync every 60 seconds and on `online` events.

---

## 6. Business Logic Rules

### Accounts
- System accounts (`acc_system_cash`, `acc_system_bank`, `acc_system_bkash`, `acc_system_nagad`) are always present in the accounts list and **cannot be deleted**.
- Account balances are **derived** from transactions; they are not independently editable except via the "Edit Balance" UI for system accounts (which directly mutates `acc.balance` in `localStorage`).
- New user accounts get a unique ID `acc_${Date.now()}`.

### Transactions
- Types: `income`, `expense`, `transfer`.
- Transfers require `transferToId` (destination account) and **must use a different account** from `accountId`.
- Account balances are automatically recalculated on add/edit/delete of transactions.
- Editing a transaction: old balances are reverted, then new balances applied.
- Demo transactions are flagged `demo: true`; they are excluded from analytics and budget calculations.
- Recurring transactions use a schedule object: `{ frequency, interval, nextDate, endDate, occurrencesCreated }`. The created clone is **not** itself recurring.

### Categories
- 17 default categories (4 income, 13 expense) with `default: true` flag.
- Default categories have fixed IDs (`cat_*`) and come with subcategories.
- Custom categories get `cat_${Date.now()}` IDs.
- Deleting a category does **not** delete its transactions; they become uncategorized.
- Categories have `archived` flag (currently used in migrations but not actively toggled in UI).

### Reminders
- Statuses: `unpaid` or `paid`.
- Paying a reminder creates an expense transaction against the selected source account.
- Notification logic: due today, due tomorrow, overdue. Each notification is shown only once per day per reminder using stored tags.

### Budgets
- Monthly budget limits tied to a single category.
- Spending is calculated from **expense-only** transactions matching the category and current month/year.
- Money-saving/monthly rollover: if enabled, previous month's unspent amount carries over to current month's budget.

### Savings Goals
- Progress calculated from `currentAmount / targetAmount`.
- Contributing creates a **transfer** transaction from a source account to a virtual `goal_${goalId}` account, increasing the goal's `currentAmount`.

### Auto-Backups
- Snapshots are stored in `localStorage` key `pocket_khata_auto_backups`.
- Exactly 3 most recent snapshots are retained.
- 3-second deduplication window prevents multiple backups from a single user action chain.
- Restoring a backup **overwrites all current data** with the snapshot.

### Notifications
- Permission state persisted in `localStorage`.
- Notification checks run every 10 minutes and on app mount when reminders exist.
- Service worker caches reminder data via Cache API for periodic background sync.

### Theme & Language
- Theme stored in `localStorage` key `pocket_khata_theme`; default `'light'`.
- Language stored in `localStorage` key `pocket_khata_lang`; default `'en'`.
- Bangla mode converts all displayed digits to Bengali numerals via `toBengaliDigits()`.

---

## 7. UI / Navigation Flow

### Bottom Navigation Bar (5 items)
1. **Analytics** — screen `analytics`
2. **Income & Expense** — screen `transactions`
3. **+ (Center FAB)** — opens `TransactionForm` overlay
4. **Categories** — screen `categories`
5. **Calendar** — screen `calendar`

### Top Header
- **Left**: Hamburger menu → Settings
- **Right**: Language toggle (EN / বাংলা)

### Screens
| Screen | Key | Component | Description |
|--------|-----|-----------|-------------|
| Dashboard | `dashboard` | `Dashboard.jsx` | Default landing; net balance, monthly totals, account list, recent transactions, trend graph |
| Analytics | `analytics` | `AnalyticsView.jsx` | Period breakdown, pie charts, budget vs actual, insights, anomaly detection |
| Transactions | `transactions` | `TransactionHistory.jsx` | Full transaction list with filters, search, batch operations |
| Calendar | `calendar` | `CalendarView.jsx` | Monthly calendar with daily income/expense totals |
| Reminders | `reminders` | `ReminderManager.jsx` | Bill reminder list with add/edit/pay flows |
| Accounts | `accounts` | `AccountManager.jsx` | Wallet CRUD with icon and color selection |
| Categories | `categories` | `CategoryManager.jsx` | Category CRUD with icon picker and subcategory management |
| Budgets | `budgets` | `BudgetManager.jsx` | Budget limits with progress bars and rollover |
| Savings | `savings` | `SavingsTracker.jsx` | Goals with progress rings and contribution flow |
| Settings | `settings` | `Settings.jsx` | Language, theme, backups, data portability, PDF reports, app reset, notifications, analytics consent |

### Overlays / Modals
- **TransactionForm**: Opens via center FAB or editing a transaction; closes on save/cancel/delete.
- **ConsentPopup**: Shown on first open or after usage-delay thresholds (3 days or 30 minutes active usage).
- **SplashOverlay**: Fades out ~600ms after mount.

### Lazy Loading Strategy
- Eager: `Dashboard`, `ErrorBoundary`.
- Lazy (with `Suspense` fallback spinner): `TransactionForm`, `TransactionHistory`, `AnalyticsView`, `CalendarView`, `ReminderManager`, `Settings`, `AccountManager`, `CategoryManager`, `BudgetManager`, `SavingsTracker`.
- `TransactionHistory` chunk is preloaded immediately after mount to eliminate spinner on first navigation.

---

## 8. Libraries & Dependencies (Summary)

| Concern | Technology |
|---------|-----------|
| UI Framework | React 18 |
| Build/Tooling | Vite 5 |
| Styling | Custom CSS with CSS custom properties, neo-morphic design |
| State | React `useState` / `useEffect` (no external state library) |
| Persistence | Browser `localStorage` via `db.js` wrapper |
| Icons | Lucide React |
| PDF | html2canvas + jsPDF |
| Testing | Vitest + React Testing Library (18 test files, 480+ tests) |
| Linting | ESLint 8 with `no-console` `error` rule |
| Mobile | Capacitor (Android/iOS packaging) |
| Notifications | Browser Notification API + Service Worker + Periodic Background Sync |
| Analytics (optional) | Supabase JS client (graceful degradation) |
| Virtualization | `@tanstack/react-virtual` |
| CI | GitHub Actions (lint → test → build) |

---

## 9. Known Issues & Inconsistencies

1. **Version Mismatch**: `package.json` reports version `2.4.0`, but `src/db.js` has `APP_VERSION = '2.2.0'`. The README also shows `2.2.0`. These should be aligned.
2. **Orphaned Component**: `src/components/AccountList.js` is a simple functional component that is **not imported or used** anywhere in the app. It duplicates some logic already in `AccountManager.jsx`.
3. **Unused Migration File**: `supabase/migrations/001_create_analytics_events.sql` exists but the current codebase does not appear to use raw SQL migrations directly — the Supabase client uses `.from('analytics_events').insert(...)`.
4. **Schema Migration Gap**: The `migrateSchema()` function in `db.js` has explicit blocks for v1→v2, v2→v3, v3→v4, v5→v6, and v6→v7, but **no explicit v4→v5 block**. Version v5 is jumped over (the comment says "v5 — Removed auto-seeding..."). This is likely intentional (v5 changes were applied at load time rather than via migration), but it means subtle behavior differences could exist for data migrated from v4.
5. **Demo Data References**: Even though auto-seeding of demo data was removed in v5/v6, `DEFAULT_ACCOUNTS`, `DEFAULT_TRANSACTIONS`, `DEFAULT_REMINDERS`, and `DEFAULT_SECURITY` constants remain in `db.js` and are referenced by the `clearDemoData()` function and migration logic.
6. **Analytics Consent Delay Logic**: The `analyticsConsent` state initializer in `App.jsx` calls `localStorage` during render, which is acceptable but means the first render cannot be fully server-side rendered (not a current concern since this is a client-only app).
7. **Account Balance Mutation**: The "Edit Balance" feature on system accounts directly writes to `acc.balance` in `localStorage` without going through the db mutation pipeline. This could cause inconsistencies if not handled carefully, though the current UI path seems safe.
8. **Fullscreen Re-entry**: The app auto-re-enters fullscreen if the user exits via system gesture. This is aggressive and may frustrate some users on Android, though it is intentional for the PWA immersive mode.
9. **PropTypes without `prop-types` import in some files**: Some components use `PropTypes` but `prop-types` is not listed in `dependencies` or `devDependencies` in `package.json`. It may be implicitly available or transitively installed, but this is a potential missing dependency.
10. **Screen Virtualization**: `TransactionHistory.jsx` uses `@tanstack/react-virtual` for virtualization, but the component also uses `useMemo` for filtering and sorting the entire transactions array before passing to the virtualizer. For very large datasets (thousands of transactions), the filtering computation happens on every render.

---

## 10. Important Constraints & Conventions

- **No mandatory backend**: The app functions entirely without a server. Supabase integration is opt-in via analytics consent.
- **No console logs in production**: ESLint `no-console` rule is set to `error` for `console.log` and `console.info`; only `warn` and `error` are allowed.
- **No CSS framework**: All styling is custom CSS with CSS custom properties.
- **No routing library**: Navigation is string-based state in `App.jsx`.
- **No external scripts/CDNs in production**: Only Google Fonts are loaded externally. All JS/CSS bundles are served from the app's own origin.
- **Test command**: `npm test` runs Vitest. 18 test files exist covering db, utils, components, PDF generation, notifications, and an integration flow.
- **Build command**: `npm run build` produces Vite production build with code splitting.
