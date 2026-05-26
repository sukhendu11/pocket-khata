# Contributing to Pocket Khata 🎯

Thank you for your interest in contributing to **Pocket Khata**! This document outlines the development workflow, code standards, and guidelines to help you get started.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style & Linting](#code-style--linting)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Commit Messages](#commit-messages)
- [Reporting Issues](#reporting-issues)

---

## Getting Started

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+

### Setup

```bash
# Clone your fork
git clone https://github.com/your-username/pocket-khata.git
cd pocket-khata

# Install dependencies
npm install

# Start development server
npm run dev
```

The app runs at `http://localhost:5173` by default.

---

## Development Workflow

1. **Fork the repository** and create a feature branch from `master`.
2. **Make your changes** — keep commits focused and atomic.
3. **Run the linter** — `npm run lint` (must pass with zero warnings).
4. **Run the tests** — `npm test` (all tests must pass).
5. **Build the project** — `npm run build` (must complete without errors).
6. **Open a pull request** against the `master` branch.

### Branch Naming

Use descriptive, hyphen-separated names:

| Pattern | Example |
|---------|---------|
| `feat/<description>` | `feat/dark-mode-toggle` |
| `fix/<description>` | `fix/negative-balance-display` |
| `refactor/<description>` | `refactor/db-migration-pipeline` |
| `docs/<description>` | `docs/api-usage-guide` |

---

## Code Style & Linting

This project uses **ESLint 8** with the following configuration:

- **Presets:** `eslint:recommended`, `plugin:react/recommended`, `plugin:react/jsx-runtime`, `plugin:react-hooks/recommended`
- **Parser:** `latest` ECMAScript features with `module` source type
- **React version:** `18.2`

### Key Rules

- **`no-console`** — `console.log` and `console.info` are **errors**. Use `console.warn` or `console.error` for diagnostic output. Remove all debugging `console.log` calls before committing.
- **`no-shadow`** — Variable shadowing (redeclaring a variable name in an inner scope) is an error. Exceptions: `name` and `screen` are allowed.
- **`react-refresh/only-export-components`** — Component files should only export React components (warn-level rule).

### Run the Linter

```bash
npm run lint
```

The CI pipeline enforces `--max-warnings 0`. Any warning or error will fail the build.

---

## Testing

Tests are written with **Vitest** + **React Testing Library** and run in a **jsdom** environment.

### Test Configuration (`vitest.config.js`)

```js
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: './src/tests/setup.js',
  css: true,
}
```

### Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (for development)
npx vitest
```

### Test File Convention

- Test files live in `src/tests/` alongside a `setup.js` file that configures common test utilities.
- Name test files after the component or module they test: `ComponentName.test.jsx`.

### Coverage

Coverage is available via `@vitest/coverage-v8`. To generate a coverage report:

```bash
npx vitest --coverage
```

### Writing Tests

- Use **React Testing Library** patterns: render components, query by role/text, and fire events.
- Mock `localStorage` as needed — the app's `db.js` module reads from and writes to `localStorage`.
- Focus on behavior, not implementation details. Prefer testing user-facing interactions over internal state.

---

## Project Structure

```
src/
├── main.jsx                     # Entry point
├── App.jsx                      # Root component (state management & navigation)
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

See the [README](./README.md#project-structure) for a more detailed breakdown.

---

## Pull Request Guidelines

1. **Keep PRs focused** — One feature/fix per PR. Large changes should be broken into smaller, reviewable increments.
2. **Write a clear description** — Explain what the change does, why it's needed, and how it was tested.
3. **Link related issues** — Use GitHub keywords (`Closes #123`, `Fixes #456`) to auto-close issues on merge.
4. **Ensure CI passes** — All checks (lint, test, build) must be green before review.
5. **Update documentation** — If your change affects the API, data format, or user-facing behavior, update the README or relevant docs accordingly.
6. **No `console.log`** — Remove all debugging console output before submitting. Use `console.warn`/`console.error` if runtime diagnostic output is necessary.

### PR Checklist

Before submitting, verify:

- [ ] Code compiles without errors (`npm run build`)
- [ ] Linter passes with zero warnings (`npm run lint`)
- [ ] All tests pass (`npm test`)
- [ ] New tests are added for new features or bug fixes
- [ ] Documentation is updated if behavior changed
- [ ] No `console.log` statements remain in source files

---

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. This helps with changelog generation and semantic versioning.

```
<type>(<scope>): <short summary>

[optional body]
[optional footer(s)]
```

### Types

| Type       | Usage                                      |
|------------|--------------------------------------------|
| `feat`     | A new feature                              |
| `fix`      | A bug fix                                  |
| `refactor` | Code change that neither fixes nor adds    |
| `test`     | Adding or updating tests                   |
| `docs`     | Documentation changes                      |
| `style`    | Formatting, whitespace (no logic change)   |
| `chore`    | Build, deps, CI, tooling                   |

### Examples

```
feat(i18n): add Bangla translations for budget screen
fix(db): handle null account balance on import
refactor(settings): extract CSV export to dedicated function
test(dashboard): add rendering test for empty state
docs(readme): clarify auto-backup retention policy
```

---

## Reporting Issues

When opening an issue, please include:

- **Description** — What happened vs. what was expected
- **Steps to reproduce** — Minimal, reproducible sequence of actions
- **Environment** — Browser, OS, and app version (see Settings → About or `package.json`)
- **Screenshots** — If applicable, add screenshots or a screen recording
- **Data context** — If relevant, mention whether the issue occurs with existing data or on a fresh install

---

## Code of Conduct

By participating in this project, you agree to maintain a welcoming, inclusive, and harassment-free environment for everyone. Be respectful, constructive, and collaborative.

---

Thank you for helping make Pocket Khata better! 💰
