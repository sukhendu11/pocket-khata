<div align="center">

# Pocket Khata 💰

**পকেট খাতা** — A neo-morphic personal finance manager built with React + Vite + Capacitor

[![Version](https://img.shields.io/badge/version-2.4.1-%236366f1?logo=github)](https://github.com/sukhendu11/pocket-khata/releases)
[![CI](https://img.shields.io/github/actions/workflow/status/sukhendu11/pocket-khata/ci.yml?branch=master&logo=githubactions&label=CI)](https://github.com/sukhendu11/pocket-khata/actions)
[![License](https://img.shields.io/badge/license-MIT-%2322c55e)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-962%2B-passing?logo=vitest&color=%2363b3ed)](https://github.com/sukhendu11/pocket-khata/actions)

Track expenses, manage multiple accounts, set budgets, and stay on top of your finances. **All data stays on your device.**

</div>

---

## 📋 Table of Contents

- [About](#about)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Scripts](#scripts)
- [APK Build](#apk-build)
- [CI / CD](#ci--cd)
- [Data Safety & Privacy](#data-safety--privacy)
- [Data Versioning](#data-versioning)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)
- [License](#license)

---

## ℹ️ About

**Pocket Khata** is a neo-morphic, offline-first personal finance manager built with React 18 + Vite 5. It runs in the browser as a PWA and is packaged as a native Android app via Capacitor.

- **Privacy-First**: Local-first architecture — all data stays in the browser's `localStorage` with zero network transmission.
- **Dual-Language**: Full English and Bangla (বাংলা) localization with 580+ translation keys.
- **Financial Tracking**: Income, expense, and transfer transactions across 17 default categories with subcategories.
- **Planning Tools**: Monthly budget planner with rollover, savings goals with progress tracking, recurring bill reminders.
- **Analytics & Reports**: Interactive SVG pie charts, anomaly detection, smart insights, budget vs actual, calendar view, and client-side PDF/CSV/JSON exports.
- **Native Android**: Packaged via Capacitor with native notifications, keyboard handling, and file downloads.
- **Auto-Backup**: Up to 3 rotating snapshots created before every write operation with 3-second deduplication.
- **Schema Migration**: Versioned data format (v8) with automatic incremental migrations for forward compatibility.

---

## ✨ Features

### 💳 Core Financial Tracking

| Feature | Description |
|---------|-------------|
| **Dashboard** | Net worth, monthly income/expense, account balances, financial trends chart, recent transactions |
| **Transaction Management** | Add/edit/delete income, expense, and transfer entries with category, subcategory, and notes |
| **Account Management** | Manage Cash, Bank, bKash, Nagad, and custom wallet accounts with real-time balance tracking and balance adjustment (auto-creates offset transaction) |
| **Category Manager** | 17 default categories (13 expense + 4 income) with subcategories; create custom categories with icon & color picker |
| **Recurring Transactions** | Daily/weekly/monthly/yearly recurring schedules with auto-creation and account balance updates |

### 📊 Planning & Analytics

| Feature | Description |
|---------|-------------|
| **Budget Planner** | Monthly spending limits per category with visual progress bars, rollover support, and subcategory breakdown |
| **Savings Goals** | Define targets, track progress, and contribute from any account (auto-creates transfer transaction) |
| **Bill Reminders** | Recurring or one-time reminders with due-date tracking, overdue detection, and quick-pay integration |
| **Analytics** | Interactive SVG pie charts, period-based income/expense breakdowns, budget vs actual comparison |
| **Smart Insights** | Automatic top spending category, biggest increase/decrease vs previous period, savings rate, transaction count |
| **Anomaly Detection** | Flags transactions significantly above category average with ratio display |
| **Calendar View** | Monthly calendar plotting all transactions and reminders with daily income/expense/net totals |

### 🔍 Transaction History

| Feature | Description |
|---------|-------------|
| **Search** | Full-text search across notes, amount, category, and account |
| **Filters** | By type (income/expense/transfer), account, category, and date range |
| **Batch Operations** | Multi-select transactions for batch delete or recategorization |
| **Filter Summary** | Displays filtered-in vs filtered-out counts and net change |

### 💾 Backup & Data Portability

| Feature | Description |
|---------|-------------|
| **JSON Export / Import** | Full database export with schema version metadata; import with confirmation dialog and automatic safety backup |
| **Auto-Backups** | Up to 3 rotating snapshots created before every write; 3-second dedup window; restore from Settings |
| **CSV Export** | Export transactions to CSV for spreadsheet analysis |
| **PDF Reports** | Generate downloadable PDF with summary cards, account details, transactions table, charts, and insights for configurable periods |
| **Reset Data** | Full factory reset with confirmation dialog and toast feedback |

### 🔔 Notifications

| Feature | Description |
|---------|-------------|
| **Native Android** | Capacitor Local Notifications with high-importance channel and lock screen visibility |
| **Permission Flow** | Permission requested only on explicit user toggle (no silent startup request) |
| **Opt-Out** | Toggle OFF cancels all notifications and deletes the channel; opt-out persisted locally |
| **Scheduling** | Reminder notifications scheduled on due date at 09:00; immediate delivery for past-due items |

### 🎨 User Experience

| Feature | Description |
|---------|-------------|
| **Dual Language** | Full English and বাংলা (Bangla) with 580+ translation keys, Bangla digit conversion |
| **Dark Mode** | Toggle between light and dark themes with CSS custom properties |
| **Neo-morphic UI** | Premium soft-shadow design with smooth animations, micro-interactions, and hover states |
| **Responsive Layout** | Smartphone-shell viewport (410×840px) with full mobile support; installable as PWA |
| **Scroll Animations** | IntersectionObserver-based entrance animations for cards and counters |
| **Code-Splitting** | Lazy-loaded screens with vendor chunks (react, icons, pdf) for fast initial load (~63 kB) |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 18 |
| **Build Tool** | Vite 5 |
| **Language** | JavaScript (JSX) |
| **Styling** | Custom CSS (neo-morphic design with CSS custom properties) |
| **Storage** | Browser `localStorage` with schema migrations (v8) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **PDF** | [jsPDF](https://github.com/parallax/jsPDF) + [html2canvas](https://html2canvas.hertzen.com/) |
| **Mobile** | Capacitor 8 (Android native packaging, local notifications, filesystem, share, keyboard) |
| **Virtualization** | [@tanstack/react-virtual](https://tanstack.com/virtual) |
| **Linting** | ESLint 8 (with `no-console` rule, React Hooks plugin) |
| **Testing** | [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) (962+ tests) |
| **CI** | GitHub Actions (lint → test → build on push) |
| **Container** | Docker + Nginx (multi-stage build) |
| **Versioning** | Single-source `version.properties` read by both Gradle and Vite |

---

## 📁 Project Structure

```
pocket-khata/
├── index.html                        # Entry HTML with PWA/SEO meta
├── package.json                      # Dependencies & scripts
├── vite.config.js                    # Vite config with code splitting
├── vitest.config.js                  # Test configuration
├── capacitor.config.json             # Capacitor Android settings
├── version.properties                # Single source of truth for version
├── .eslintrc.cjs                     # ESLint rules
├── Dockerfile                        # Production container
├── docker-compose.yml                # Dev/proxy compose
├── nginx.conf                        # Nginx static server config
├── public/
│   ├── manifest.json                 # PWA manifest
│   ├── sw.js                         # Service worker (not actively registered)
│   ├── vite.svg                      # Favicon
│   └── pocket-khata-logo.png         # App icon
├── scripts/
│   ├── build-apk.bat                 # APK build pipeline
│   ├── sync-capacitor.bat            # Fast web asset sync
│   ├── generate-android-icons.cjs    # Icon generation
│   ├── generate-icons.cjs            # Web icon generation
│   ├── generate-splash.cjs           # Splash screen generation
│   ├── upscale-splash-logo.cjs       # Logo upscaling
│   └── get-build-version.cjs         # Build version from git
├── android/                          # Capacitor Android project
│   ├── app/
│   │   └── src/main/java/com/pocketkhata/app/MainActivity.java
│   └── gradle/
└── src/
    ├── main.jsx                      # Entry point
    ├── App.jsx                       # Root component with state & navigation
    ├── index.css                     # Neo-morphic theme (light/dark)
    ├── db.js                         # localStorage wrapper, migrations, auto-backup
    ├── i18n.js                       # Internationalization (580+ keys, EN/BN)
    ├── utils.js                      # Number formatting, Bangla digits
    ├── notifications.js              # Capacitor native notifications
    ├── reconcileBuildVersion.js      # APK upgrade cache-busting
    ├── hooks/
    │   ├── useInView.js              # IntersectionObserver scroll animations
    │   └── useKeyboard.js            # Capacitor keyboard handling
    ├── lib/
    │   ├── download.js               # Multi-strategy file download
    │   ├── analytics.js              # No-op stubs (analytics removed)
    │   ├── supabase.js               # No-op stub (Supabase removed)
    │   └── pdf/
    │       ├── index.js              # PDF export entry point
    │       ├── renderer.js           # PDF rendering logic
    │       ├── reportData.js         # Report data computation
    │       ├── reportTemplates.js    # HTML report templates
    │       └── chartEngine.js        # SVG chart generation
    └── components/
        ├── Dashboard.jsx             # Main dashboard overview
        ├── TransactionForm.jsx       # Add/edit transaction drawer
        ├── TransactionHistory.jsx    # Filterable/searchable transaction list
        ├── TransactionItem.jsx       # Single transaction row
        ├── AnalyticsView.jsx         # Charts, insights, anomaly detection
        ├── PieChart.jsx              # Reusable SVG pie chart
        ├── CalendarView.jsx          # Monthly financial calendar
        ├── Settings.jsx              # Import/export, PDF reports, notifications, reset
        ├── AccountManager.jsx        # Account CRUD with balance adjustment
        ├── CategoryManager.jsx       # Category management with subcategories
        ├── ReminderManager.jsx       # Bill reminders with quick-pay
        ├── BudgetManager.jsx         # Budget planning per category
        ├── SavingsTracker.jsx        # Savings goals & contributions
        └── ErrorBoundary.jsx         # React error boundary
```

---

## 🏗️ Architecture

### State Management

Pocket Khata uses a **single-root state management** pattern in `App.jsx` with React hooks (`useState`, `useEffect`, `useCallback`). No external state libraries are used.

**Central State:**

| State | Type | Description |
|-------|------|-------------|
| `accounts` | Array | Financial accounts (system + user-created) |
| `categories` | Array | Categories with subcategories |
| `transactions` | Array | Income, expense, transfer records |
| `reminders` | Array | Bill reminders with recurrence |
| `budgets` | Array | Monthly budget limits per category |
| `savingsGoals` | Array | Savings targets with progress |
| `lang` | String | Locale (`'en'` or `'bn'`) |
| `theme` | String | UI theme (`'light'` or `'dark'`) |

**Data Flow:**

1. **On mount** — `App.jsx` loads all data from `localStorage` via `db.js`
2. **User interaction** — Child components call parent-provided mutation callbacks
3. **State update** — Handlers update state arrays, triggering re-renders
4. **Persistence** — A `useEffect` calls `db.saveAllData()` on every change with auto-backup

### Persistence Layer (`src/db.js`)

The `db.js` module encapsulates all storage logic with schema versioning (v8):

- **System Accounts** — 4 always-present accounts (Cash Ledger, Bank Account, bKash Wallet, Nagad Wallet)
- **Schema Migrations** — Incremental v1→v8, non-destructive, additive only
- **Auto-Backup** — Rotating buffer of 3 snapshots, 3-second dedup window
- **Recurring Transactions** — Automatic processing of due occurrences with balance updates
- **Export/Import** — Full JSON export with schema metadata; import with safety backup

### Navigation

Navigation uses a `currentScreen` string state with a `renderScreen()` switch. All non-dashboard screens are lazy-loaded with `React.lazy()` and `<Suspense>`.

### Code Splitting (vite.config.js)

| Chunk | Contents |
|-------|----------|
| `vendor-react` | `react`, `react-dom` |
| `vendor-icons` | `lucide-react` |
| `vendor-pdf` | `jspdf`, `html2canvas` |

### Styling

- **CSS Custom Properties** — Defined in `:root` (light) and `[data-theme="dark"]` (dark)
- **Neo-morphic Design** — Soft shadows formula: `8px 8px 16px dark-shadow, -8px -8px 16px light-shadow`
- **Bangla Font** — Auto-applied via `[data-lang="bn"]` selector with Noto Serif Bengali

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+

### Installation

```bash
git clone https://github.com/sukhendu11/pocket-khata.git
cd pocket-khata
npm install
npm run dev
```

The app runs at **http://localhost:5173** 🎉

### Production Build

```bash
npm run build
npm run preview
```

### Quality Checks

```bash
npm run lint        # Zero warnings enforced
npm test            # 962+ tests
```

---

## 📜 Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server (hot reload) |
| `npm run build` | Production build with code splitting |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint (`--max-warnings 0`) |
| `npm test` | Vitest test suite (962+ tests) |
| `npm run test:coverage` | Tests with coverage report |

---

## 📱 APK Build

### Prerequisites

- Android SDK 34+
- Java 17+
- Android device with USB debugging, or emulator

### Build Pipeline

```bash
scripts/build-apk.bat [--sync | --full | --release | --clean]
```

| Mode | Description |
|------|-------------|
| `--sync` | Vite build + cap copy (web assets only) |
| `--full` (default) | Full debug APK: version bump → tests → build → sync → assembleDebug |
| `--release` | Signed release APK with ProGuard |
| `--clean` | Clean rebuild from scratch |

**Manual steps:**

```bash
npx vitest run                          # Must pass before building
npx vite build                          # Build JS bundle
npx cap copy android                    # Sync to Android project
cd android && ./gradlew assembleDebug   # Build debug APK
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`

### Install on Device

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🔄 CI / CD

Every push to `master` triggers a **GitHub Actions** workflow:

1. `npm ci` — Clean install
2. `npm run lint` — ESLint (zero warnings)
3. `npm test` — Full test suite (962+ tests)
4. `npm run build` — Vite production build
5. `scripts/build-apk.bat --sync` — Generate APK artifact

An additional workflow builds and signs a release APK for distribution.

---

## 🔒 Data Safety & Privacy

Pocket Khata is a **local-first, fully client-side** application:

- **All data stored on-device** in browser `localStorage` — no backend, no server, no API
- **Zero network calls** — No `fetch()`, `XMLHttpRequest`, or WebSocket in the codebase
- **No user accounts** — No registration, login, or authentication
- **No telemetry** — Analytics system has been removed; all exports are no-op stubs
- **No cookies** — Not set by the application
- **No service worker** — No offline cache to manage

The only external requests are Google Fonts (Outfit + Noto Serif Bengali) via `<link>` tags in `index.html`.

### Third-Party Dependencies

Production dependencies are minimal: `react`, `react-dom`, `lucide-react`, `jspdf`, `html2canvas`, `@tanstack/react-virtual`, and Capacitor plugins. All run entirely client-side with no network calls.

---

## 📐 Data Versioning

Schema version **8** with automatic incremental migrations:

| Version | Changes |
|---------|---------|
| 1 | Initial release (no version key) |
| 2 | Added `createdAt`/`updatedAt` timestamps, `archived` on categories, `recurring` on transactions |
| 3 | Added `demo` flag to seed data |
| 4 | 17 default categories with `subcategories`, `default` flag; `subcategory` field on transactions |
| 5 | Removed auto-seeding — production starts empty |
| 6 | Removed demo seed data on migration |
| 7 | `recurring` field: boolean → schedule object `{ frequency, interval, nextDate, endDate, occurrencesCreated }` |
| 8 | Expanded default category subcategories |

---

## 🐛 Troubleshooting

### localStorage Quota Exceeded

Browser `localStorage` is limited to ~5–10 MB. Export data via **Settings → Data Portability → Export Full Database (JSON)**, then clear auto-backups or reset.

### Corrupted Data Recovery

1. Check **Settings → Auto-Backups** — restore the newest snapshot
2. Re-import a previously exported JSON file
3. As last resort: **Settings → Reset Data**

### Blank Screen / Error Boundary

Click **Try Again** on the error screen. If persistent, clear browser site data and re-import from backup.

---

## ❓ FAQ

**Q: Can I sync data across devices?**  
No — Pocket Khata is local-first. Export JSON on device A, transfer the file, and import on device B.

**Q: Is my financial data safe?**  
Yes. Zero network calls, no backend, no accounts, no telemetry. Data never leaves your browser.

**Q: Does it work offline?**  
Yes, completely. All features work without internet once the app is loaded.

**Q: How do I back up my data?**  
Three methods: JSON export (manual), auto-backups (automatic, 3 snapshots), CSV export (analysis).

**Q: Can I recover a deleted transaction?**  
Check **Settings → Auto-Backups** and restore the snapshot from before the deletion.

**Q: Is Pocket Khata free?**  
Yes — fully open source under MIT license. No paid plans or premium features.

---

## 📌 Version

Current version: **2.4.1** (schema v8)

---

## 📄 License

MIT © Sukhendu Chakma

---

<div align="center">
  <sub>Built with ❤️ using React, Vite, and Capacitor</sub>
</div>
