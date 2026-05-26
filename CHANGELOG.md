# Changelog

All notable changes to **Pocket Khata** are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versioning mirrors the app's [`APP_VERSION`](src/db.js) and [`CURRENT_SCHEMA_VERSION`](src/db.js).

---

## [2.2.0] — 2026-05-26

### 🎯 Production Hardening

- **Removed auto-seeding** — No more demo accounts, transactions, or reminders on first load (schema v5). App starts with a clean, empty state.
- **Added auto-backup system** — Up to 3 automatic snapshots created before every write, with a 3-second deduplication window.
- **Added CSV export** — Export transactions to CSV for spreadsheet analysis.
- **Added PDF reporting** — Generate downloadable PDF reports of income vs. expense for configurable periods (this month, last month, last 3/6 months, this year).
- **Added JSON import/export** — Full database export with schema version metadata for safe restore and migration.

### 🔧 Changed

- Increased default categories to 17 (13 expense + 4 income) with `subcategories`, `default` flag, and renamed categories (e.g., "Utilities" → "Bills & Utilities).
- All transaction entities now carry `subcategory` field.
- ESLint config: added `no-console` rule (allowing `warn`/`error`).
- CI pipeline extended: lint → test → build on every push.
- Vite config: code-split into `vendor-react`, `vendor-icons`, `vendor-pdf` chunks.

### 🐛 Fixed

- All lint errors resolved — unused variables, missing PropTypes, incorrect `textTransform`, missing dependency arrays in hooks.
- Syntax error in production build configuration.

### 🧪 Testing

- Added full test suite with Vitest + Testing Library (480+ tests across 12 test files).
- Tests cover: `db.js`, utils, `Dashboard`, `TransactionForm`, `TransactionHistory`, `AccountManager`, `CategoryManager`, `AnalyticsView`, `CalendarView`, `BudgetManager`, `SavingsTracker`, `Settings`.

---

## [2.1.0] — 2026-05-25

### ✨ Added

- **Global Search** (integrated into `TransactionHistory.jsx`) — Full-text search across all transactions.
- **Budget Planner** (`BudgetManager.jsx`) — Monthly spending limits per category with visual progress bars.
- **Savings Tracker** (`SavingsTracker.jsx`) — Set savings targets, track progress, and contribute from any account.
- **PDF Reports** — Generate income vs. expense PDF summaries.
- **UI Animations** — Smooth transitions and micro-interactions across components.
- **i18n Support** — Full English and বাংলা (Bangla) support via `i18n.js` (61+ translation keys).
- **Dark Mode** — Toggle between light and dark themes using CSS custom properties.
- **Responsive "Phone Shell"** — Max-width 420px container for mobile-optimized layout.
- **CSS Custom Properties** — Theming system with neo-morphic design tokens.
- **Schema Migration v3** — Added `demo` flag to seed-data items for "Clear Demo Data" feature.
- **Schema Migration v4** — 17 default categories with `subcategories` array and `default` flag; `subcategory` field on transactions.

### 🧪 Testing Infrastructure

- Vitest + React Testing Library setup with jsdom environment.
- Test files for: `db.test.js` (148+ lines), `utils.test.js`, and component tests.
- GitHub Actions workflow expanded to run tests before build.

### 🔧 Changed

- ESLint rules: `--max-warnings 0` enforcement.
- Project structure reorganized — tests moved to `src/tests/`.
- `index.css` overhauled with full dark/light theme support.

### 🗑️ Removed

- Lock screen / sign-in option removed from the app.

---

## [1.0.0] — 2026-05-25

Initial release of Pocket Khata — a neo-morphic personal finance manager.

### ✨ Features

- **Dashboard** — Overview of accounts, recent transactions, and spending summary.
- **Transaction Management** — Add, edit, delete income/expense/transfer entries.
- **Account Management** — Manage Bank, Cash, bKash, Nagad accounts with real-time balance tracking.
- **Category Manager** — Custom categories with icon & color picker; 10 default categories.
- **Analytics View** — Visual breakdown of spending with interactive SVG pie charts.
- **Calendar View** — Monthly calendar showing transactions and reminders.
- **Bill Reminders** — Set recurring reminders with quick-pay integration.
- **Transaction History** — Filterable, searchable transaction list.
- **Settings** — Language toggle (English/Bangla), theme switch, and data management.

### 🛠️ Technical Foundation

- React 18 + Vite 5 build tooling.
- `localStorage`-based persistence with `db.js` wrapper.
- Schema migration system (v1 → v2) for forward-compatible data upgrades.
- Lucide React icon library.
- ESLint 8 + React Hooks plugin for code quality.
- GitHub Actions CI with `npm ci` → `npm run lint` → `npm run build`.

### 🗄️ Schema v1 (Initial)

- Core data entities: Accounts, Categories, Transactions, Reminders, Security settings.
- Seed data with 4 demo accounts, 10 default categories, 5 demo transactions, and 3 demo reminders.

### 🗄️ Schema v2

- Added `createdAt`/`updatedAt` timestamps to all data entities.
- Added `archived` field to categories.
- Added `recurring` field to transactions.

---

## Version Reference

| Release | App Version | Schema Version | Date |
| :------ | :---------- | :------------- | :--- |
| v2.2.0  | 2.2.0       | 5              | 2026-05-26 |
| v2.1.0  | 2.1.0       | 4              | 2026-05-25 |
| v1.0.0  | 1.0.0       | 2              | 2026-05-25 |

> **Note:** v1.0.0 launched with schema v2 (schema v1 was the prototype-only format before version tracking existed). Schema versions 3–5 were introduced during the v2.1.0 → v2.2.0 development cycle.

---

## Migration Guide

All schema migrations are **automatic and non-destructive**. When updating Pocket Khata:

1. Open the app after update.
2. The `migrateSchema()` function in `src/db.js` runs automatically on load.
3. Each data key is migrated independently — failure on one key doesn't affect others.
4. Data exported from any prior version can be re-imported; schema migrations run on restore.

For manual data safety steps, see [Troubleshooting → Corrupted Data Recovery](README.md#-corrupted-data-recovery).

---

## Commit History

| Hash | Date | Description |
| :--- | :--- | :--- |
| `e9f2c37` | 2026-05-25 | Initial commit |
| `36faec6` | 2026-05-25 | Add .gitattributes and GitHub Actions CI |
| `57042b7` | 2026-05-25 | Update README with full project docs |
| `adbc855` | 2026-05-25 | Fix all lint errors |
| `f774073` | 2026-05-25 | Add budget planner, savings goals, search, PDF reports, animations, tests |
| `6efe3bb` | 2026-05-25 | Remove lock screen |
| `d45c806` | 2026-05-26 | Production cleanup, remove auto-seed, update version |
| `7cd3a56` | 2026-05-26 | Add coverage/, .env, chat_history.md to .gitignore |
| `815e5c3` | 2026-05-26 | Latest checkpoint |

---

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to contribute to Pocket Khata.
