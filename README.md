# Pocket Khata 💰

A neo-morphic personal finance manager built with React + Vite. Track expenses, manage accounts, set budgets, and stay on top of your finances with bill reminders.

## Features

- **Dashboard** — Overview of accounts, recent transactions, and spending summary
- **Transaction Management** — Add, edit, and delete income/expense/transfer entries
- **Account Management** — Manage Bank, Cash, bKash, Nagad, and custom accounts
- **Category Manager** — Custom categories with icon & color picker
- **Analytics** — Visual breakdown of spending with interactive charts (PieChart)
- **Calendar View** — See transactions and reminders on a monthly calendar
- **Bill Reminders** — Set recurring reminders with quick-pay integration
- **Multi-language** — English and বাংলা (Bangla) support via i18n
- **Security** — Optional PIN lock screen to protect your data
- **Data Export** — Export your financial data as needed
- **Cloud Sync** — Sync data across devices (optional)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 |
| Build Tool | Vite 5 |
| Styling | Custom CSS (neo-morphic design) |
| Storage | IndexedDB (via custom `idb` wrapper) |
| Icons | Lucide React |
| Linting | ESLint 8 |
| CI | GitHub Actions |

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
```

## Project Structure

```
src/
├── main.jsx                 # Entry point
├── App.jsx                  # Root component with routing & state
├── index.css                # Global styles (neo-morphic theme)
├── db.js                    # IndexedDB wrapper
├── i18n.js                  # Internationalization (en/bn)
├── utils.js                 # Shared utilities
└── components/
    ├── Dashboard.jsx        # Main dashboard view
    ├── TransactionForm.jsx  # Add/edit transaction form
    ├── TransactionHistory.jsx # Transaction list with filters
    ├── TransactionItem.jsx  # Single transaction row
    ├── AnalyticsView.jsx    # Spending analytics & charts
    ├── PieChart.jsx         # Reusable pie chart component
    ├── CalendarView.jsx     # Monthly calendar view
    ├── Settings.jsx         # App settings & cloud sync
    ├── AccountManager.jsx   # Manage financial accounts
    ├── CategoryManager.jsx  # Manage transaction categories
    ├── ReminderManager.jsx  # Bill reminders
    ├── LockScreen.jsx       # PIN lock screen
    └── ErrorBoundary.jsx    # Error boundary wrapper
```

## CI / CD

Every push and pull request to `main`/`master` triggers a GitHub Actions workflow that:

1. Installs dependencies with `npm ci`
2. Runs ESLint (`--max-warnings 0`)
3. Builds the project with Vite

## License

MIT
