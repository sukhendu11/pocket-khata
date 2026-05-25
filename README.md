# Pocket Khata 💰

**পকেট খাতা** — A neo-morphic personal finance manager built with React + Vite. Track expenses, manage multiple accounts, set budgets, and stay on top of your finances with bill reminders. All data stays on your device.

## Features

### Core Financial Tracking
- **Dashboard** — Overview of net worth, monthly income/expense, account balances, recent transactions, and spending trends
- **Transaction Management** — Add, edit, and delete income, expense, and transfer entries with full categorization
- **Account Management** — Manage Bank, Cash, bKash, Nagad, and custom wallet accounts with real-time balance tracking
- **Category Manager** — 17 pre-configured default categories with subcategories; create custom categories with icon & color picker

### Planning & Analytics
- **Budget Planner** — Set monthly spending limits per category, track usage with visual progress bars
- **Savings Goals** — Define savings targets, track progress, and contribute from any account
- **Bill Reminders** — Set recurring or one-time bill reminders with due-date tracking and quick-pay integration
- **Analytics** — Interactive pie charts and period-based breakdowns of income vs. expense
- **Calendar View** — See all transactions and reminders plotted on a monthly calendar

### Backup & Data Portability
- **JSON Export / Import** — Full database export (accounts, categories, transactions, reminders, budgets, savings goals) as a JSON file for safe backup and restore
- **Auto-Backups** — Automatic snapshots created before every write operation; up to 3 recent snapshots retained for quick recovery
- **CSV Export** — Export transactions to CSV for spreadsheet analysis
- **PDF Reports** — Generate downloadable PDF reports of income vs. expense for any period

### User Experience
- **Dual Language** — Full English and বাংলা (Bangla) support via built-in i18n
- **Dark Mode** — Toggle between light and dark themes
- **Neo-morphic UI** — Premium soft-shadow design with smooth animations and micro-interactions
- **Responsive Layout** — Optimized for mobile with a smartphone-shell viewport; installable as a PWA
- **Code-Splitting** — Lazy-loaded screens for fast initial load (~63 kB entry chunk)

## Data Safety & Offline First

Pocket Khata is a **local-first** application:

- **All financial data is stored on-device** using the browser's `localStorage`. No data is sent to any server.
- **No mandatory cloud dependency** — core features work fully offline. No account, login, or internet connection required.
- **Your data stays yours.** There are no telemetry, analytics, or tracking calls.

## Backup System

### Manual Backup (JSON)
- Navigate to **Settings → Data Portability → Export Full Database (JSON)**
- Downloads a complete snapshot of all your data as a `.json` file
- To restore, use **Import Database (JSON)** in Settings and select the previously exported file
- Backups include schema version metadata, ensuring compatibility after app updates

### CSV Export
- Export transactions only (without accounts/categories configuration) to a CSV file for spreadsheet software

### Auto-Backups
- The app automatically creates a snapshot before every save operation
- Up to 3 most recent snapshots are retained
- Access and restore from **Settings → Auto-Backups**
- A 3-second deduplication window prevents redundant backups from the same user action

### PDF Reports
- Generate a PDF summary of income vs. expense for configurable periods (this month, last month, last 3/6 months, this year)

## Data Versioning & Safety

The app uses a **schema versioning system** to handle data structure changes across updates:

- Every stored dataset has an associated schema version (currently **v5**)
- On load, the app checks the stored version and runs **incremental migrations** to bring old data up to date
- Migrations are non-destructive — existing user data is preserved with new fields added as needed
- This ensures **backward compatibility**: data exported from an older version can be imported into a newer version and will be migrated automatically
- The `exportedAt` and `schemaVersion` fields in JSON exports allow the import system to apply correct migrations on restore

This approach means:
- ✅ Future updates can add fields without breaking existing data
- ✅ Users can safely export data, clear the app, and re-import after an update
- ✅ Schema migrations are additive only — no data removal during upgrades

## Mobile / PWA Readiness

- **Responsive UI** — Layout scales from desktop to mobile viewports; the smartphone-shell container simulates a native app experience
- **PWA Manifest** — `manifest.json` with theme color, icons, and `apple-mobile-web-app` meta tags for "Add to Home Screen" on iOS and Android
- **Touch Optimized** — Tap targets sized for finger interaction, smooth animations, no hover dependency for core interactions
- **Viewport Configuration** — `maximum-scale=1.0, user-scalable=no` prevents accidental zoom on form inputs

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 |
| Build Tool | Vite 5 |
| Styling | Custom CSS (neo-morphic design with CSS custom properties) |
| Storage | Browser `localStorage` with schema migrations |
| Icons | Lucide React |
| PDF | jsPDF + html2canvas |
| Linting | ESLint 8 (with `no-console` rule, React plugins) |
| Testing | Vitest + Testing Library (480+ tests) |
| CI | GitHub Actions (lint → test → build on push) |

## Project Structure

```
src/
├── main.jsx                     # Entry point
├── App.jsx                      # Root component with state management & navigation
├── index.css                    # Global neo-morphic theme (light/dark)
├── db.js                        # localStorage wrapper with schema migrations & auto-backup
├── i18n.js                      # Internationalization (English / বাংলা)
├── utils.js                     # Number formatting, Bangla digit conversion
└── components/
    ├── Dashboard.jsx            # Main dashboard overview
    ├── TransactionForm.jsx      # Add/edit transaction drawer
    ├── TransactionHistory.jsx   # Filterable transaction list with search
    ├── TransactionItem.jsx      # Single transaction row component
    ├── AnalyticsView.jsx        # Spending analytics & pie charts
    ├── PieChart.jsx             # Reusable SVG pie chart
    ├── CalendarView.jsx         # Monthly financial calendar
    ├── Settings.jsx             # Import/export, backups, PDF reports, reset
    ├── AccountManager.jsx       # Manage financial accounts
    ├── CategoryManager.jsx      # Manage categories & subcategories
    ├── ReminderManager.jsx      # Bill reminders with pay integration
    ├── BudgetManager.jsx        # Budget planning per category
    ├── SavingsTracker.jsx       # Savings goals & contributions
    └── ErrorBoundary.jsx        # React error boundary wrapper
```

## Getting Started

```bash
# Clone the repository
git clone https://github.com/sukhendu11/pocket-khata.git
cd pocket-khata

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint

# Run tests
npm test
```

## CI / CD

Every push and pull request to `main`/`master` triggers a GitHub Actions workflow that:

1. Installs dependencies with `npm ci`
2. Runs ESLint with `--max-warnings 0`
3. Runs the full test suite
4. Builds the project with Vite

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite development server |
| `npm run build` | Production build with code splitting |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint (zero warnings policy) |
| `npm test` | Run Vitest test suite |

## Version

Current version: **2.2.0** (schema v5)

## License

MIT
