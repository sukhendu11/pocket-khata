import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { db } from './db';

// Dashboard is the default screen — eager import eliminates the initial loading spinner
import Dashboard from './components/Dashboard';

// Lazy-loaded screen components (code-split into separate chunks)
const TransactionForm = lazy(() => import('./components/TransactionForm'));
const TransactionHistory = lazy(() => import('./components/TransactionHistory'));

// Preload TransactionHistory chunk immediately after mount (second most-used screen)
// so it's ready before the user navigates there — eliminating the spinner on first visit
let preloadedTransactionHistory = false;
function preloadTransactionHistory() {
  if (!preloadedTransactionHistory) {
    preloadedTransactionHistory = true;
    import('./components/TransactionHistory');
  }
}
const AnalyticsView = lazy(() => import('./components/AnalyticsView'));
const CalendarView = lazy(() => import('./components/CalendarView'));
const ReminderManager = lazy(() => import('./components/ReminderManager'));
const Settings = lazy(() => import('./components/Settings'));
const AccountManager = lazy(() => import('./components/AccountManager'));
const CategoryManager = lazy(() => import('./components/CategoryManager'));
const BudgetManager = lazy(() => import('./components/BudgetManager'));
const SavingsTracker = lazy(() => import('./components/SavingsTracker'));

// ErrorBoundary is kept as a static import since it wraps the entire app
// and must always be available to catch errors
import ErrorBoundary from './components/ErrorBoundary';

import { t } from './i18n';

const globalLangStyles = {
  pill: {
    display: 'flex',
    padding: '2px',
    borderRadius: '10px',
    gap: '2px',
    backgroundColor: 'var(--bg-color)',
    alignItems: 'center',
  },
  opt: {
    background: 'none',
    border: 'none',
    fontSize: '9px',
    fontWeight: '600',
    padding: '3px 6px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};

// Loading fallback shown while lazy chunks are fetched
const LoadingFallback = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    gap: '12px',
  }}>
    <div className="spinner" style={{
      width: '28px',
      height: '28px',
      border: '3px solid var(--text-secondary)',
      borderTopColor: 'var(--accent-color)',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '500' }}>
      Loading…
    </span>
  </div>
);

const bottomNavStyles = {
  container: {
    height: '60px',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'var(--bg-color)',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 -4px 12px rgba(0,0,0,0.06)',
    padding: '0 4px',
    position: 'relative',
    zIndex: 10,
  },
  btn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1px',
    background: 'none',
    border: 'none',
    fontSize: '9px',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '4px 6px',
    minWidth: '48px',
    transition: 'color 0.2s, transform 0.15s',
    color: 'var(--text-secondary)',
    position: 'relative',
  },
  label: {
    fontSize: '8px',
    fontWeight: '600',
    letterSpacing: '0.2px',
    whiteSpace: 'nowrap',
  },
  centerBtn: {
    width: '54px',
    height: '54px',
    borderRadius: '50%',
    padding: 0,
    marginTop: '-22px',
    boxShadow: '0 4px 20px rgba(56, 103, 214, 0.4)',
    border: '3px solid var(--accent-color)',
    flexShrink: 0,
    backgroundColor: 'var(--bg-color)',
    color: 'var(--accent-color)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    transition: 'all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    outline: 'none',
  },
};

export default function App() {
  // 1. Data States
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  // Security (lock screen) removed

  // 2. Language State
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('pocket_khata_lang') || 'en';
  });

  const handleSetLang = (l) => {
    setLang(l);
    localStorage.setItem('pocket_khata_lang', l);
    // Update html data attribute for Bangla font switching
    document.documentElement.setAttribute('data-lang', l);
  };

  // 3. Navigation & View States
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [transactionFilter, setTransactionFilter] = useState(null); // 'income', 'expense', or null
  const [isCenterBtnPressed, setIsCenterBtnPressed] = useState(false);

  // 4. System States
  const [theme, setTheme] = useState('light');
  const [currentTime, setCurrentTime] = useState('');
  // Lock screen removed (direct entry)

  // 5. Initial Load
  useEffect(() => {

    // Load database
    const loadedAccounts = db.getAccounts();
    const loadedCategories = db.getCategories();
    const loadedTransactions = db.getTransactions();
    const loadedReminders = db.getReminders();
    const loadedBudgets = db.getBudgets();
    const loadedSavingsGoals = db.getSavingsGoals();
    setAccounts(loadedAccounts);
    setCategories(loadedCategories);
    setTransactions(loadedTransactions);
    setReminders(loadedReminders);
    setBudgets(loadedBudgets);
    setSavingsGoals(loadedSavingsGoals);

    // Set Theme
    const savedTheme = localStorage.getItem('pocket_khata_theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Set language data attribute for Bangla font
    const savedLang = localStorage.getItem('pocket_khata_lang') || 'en';
    document.documentElement.setAttribute('data-lang', savedLang);

    // clock task
    const updateTime = () => {
      const d = new Date();
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      setCurrentTime(`${hours}:${minutes} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000 * 60);
    return () => clearInterval(interval);
  }, []);

  // 6. Theme Toggle handler
  const handleToggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('pocket_khata_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  // 7. DB Mutators
  // -- Transactions
  const handleSaveTransaction = (tx) => {
    if (tx.id) {
      const oldTx = transactions.find(oldTxRef => oldTxRef.id === tx.id);
      db.updateTransaction(tx, oldTx);
    } else {
      db.addTransaction(tx);
    }
    setTransactions(db.getTransactions());
    setAccounts(db.getAccounts());
    setShowTransactionForm(false);
    setEditingTransaction(null);
  };

  const handleDeleteTransaction = () => {
    if (editingTransaction?.id) {
      db.deleteTransaction(editingTransaction.id);
      setTransactions(db.getTransactions());
      setAccounts(db.getAccounts());
      setShowTransactionForm(false);
      setEditingTransaction(null);
    }
  };

  const handleEditTransactionClick = (tx) => {
    setEditingTransaction(tx);
    setShowTransactionForm(true);
  };

  // -- Accounts
  const handleAddAccount = (acc) => {
    db.addAccount(acc);
    setAccounts(db.getAccounts());
  };

  const handleDeleteAccount = (id) => {
    db.deleteAccount(id);
    setAccounts(db.getAccounts());
  };

  // -- Categories
  const handleAddCategory = (cat) => {
    db.addCategory(cat);
    setCategories(db.getCategories());
  };

  const handleUpdateCategory = (cat) => {
    db.updateCategory(cat);
    setCategories(db.getCategories());
  };

  const handleDeleteCategory = (id) => {
    db.deleteCategory(id);
    setCategories(db.getCategories());
  };

  // -- Reminders
  const handleAddReminder = (rem) => {
    db.addReminder(rem);
    setReminders(db.getReminders());
  };

  const handleUpdateReminder = (rem) => {
    db.updateReminder(rem);
    setReminders(db.getReminders());
  };

  const handleDeleteReminder = (id) => {
    db.deleteReminder(id);
    setReminders(db.getReminders());
  };

  const handlePayReminder = (id, sourceAccountId) => {
    db.payReminder(id, sourceAccountId);
    setReminders(db.getReminders());
    setTransactions(db.getTransactions());
    setAccounts(db.getAccounts());
  };

  // -- Backup Restores
  const handleResetDatabase = () => {
    const freshDb = db.resetDatabase();
    setAccounts(freshDb.accounts);
    setCategories(freshDb.categories);
    setTransactions(freshDb.transactions);
    setReminders(freshDb.reminders);
  };

  const handleImportDatabase = (jsonString) => {
    const success = db.importDatabaseJSON(jsonString);
    if (success) {
      setAccounts(db.getAccounts());
      setCategories(db.getCategories());
      setTransactions(db.getTransactions());
      setReminders(db.getReminders());
    }
    return success;
  };

  const handleExportDatabase = () => {
    return db.exportDatabaseJSON();
  };

  // 8. Budget handlers
  const handleAddBudget = (budget) => {
    db.addBudget(budget);
    setBudgets(db.getBudgets());
  };
  const handleUpdateBudget = (budget) => {
    db.updateBudget(budget);
    setBudgets(db.getBudgets());
  };
  const handleDeleteBudget = (id) => {
    db.deleteBudget(id);
    setBudgets(db.getBudgets());
  };

  // 9. Savings Goal handlers
  const handleAddSavingsGoal = (goal) => {
    db.addSavingsGoal(goal);
    setSavingsGoals(db.getSavingsGoals());
  };
  const handleUpdateSavingsGoal = (goal) => {
    db.updateSavingsGoal(goal);
    setSavingsGoals(db.getSavingsGoals());
  };
  const handleDeleteSavingsGoal = (id) => {
    db.deleteSavingsGoal(id);
    setSavingsGoals(db.getSavingsGoals());
  };
  const handleContributeToSavingsGoal = (goalId, amount, sourceAccountId) => {
    db.contributeToSavingsGoal(goalId, amount, sourceAccountId);
    setSavingsGoals(db.getSavingsGoals());
    setTransactions(db.getTransactions());
    setAccounts(db.getAccounts());
  };

  // 10. Navigation helpers
  const handleAddTransactionClick = useCallback(() => {
    setIsCenterBtnPressed(true);
    setTimeout(() => setIsCenterBtnPressed(false), 300);
    setEditingTransaction(null);
    setShowTransactionForm(true);
  }, []);

  const handleNavigate = (screen) => {
    setTransactionFilter(null);
    setCurrentScreen(screen);
  };

  // 11. Preload TransactionHistory after mount so it's ready for instant navigation
  useEffect(() => {
    preloadTransactionHistory();
  }, []);

  // 12. Lock screen is removed — app starts directly in the dashboard

  // 13. Render Screen Routing
  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard':
        return (
          <Dashboard
            accounts={accounts}
            transactions={transactions}
            categories={categories}
            reminders={reminders}
            budgets={budgets}
            savingsGoals={savingsGoals}
            onNavigate={handleNavigate}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            lang={lang}
            onSetLang={handleSetLang}
          />
        );
      case 'analytics':
        return (
          <AnalyticsView
            transactions={transactions}
            categories={categories}
            onNavigate={handleNavigate}
            lang={lang}
          />
        );
      case 'transactions':
        return (
          <TransactionHistory
            transactions={transactions}
            accounts={accounts}
            categories={categories}
            onNavigate={handleNavigate}
            onEditTransaction={handleEditTransactionClick}
            lang={lang}
            filterType={transactionFilter}
          />
        );
      case 'calendar':
        return (
          <CalendarView
            transactions={transactions}
            accounts={accounts}
            categories={categories}
            onNavigate={handleNavigate}
            onEditTransaction={handleEditTransactionClick}
            lang={lang}
          />
        );
      case 'reminders':
        return (
          <ReminderManager
            reminders={reminders}
            accounts={accounts}
            categories={categories}
            onAddReminder={handleAddReminder}
            onUpdateReminder={handleUpdateReminder}
            onPayReminder={handlePayReminder}
            onDeleteReminder={handleDeleteReminder}
            onNavigate={handleNavigate}
            lang={lang}
          />
        );
      case 'accounts':
        return (
          <AccountManager
            accounts={accounts}
            transactions={transactions}
            onAddAccount={handleAddAccount}
            onDeleteAccount={handleDeleteAccount}
            onNavigate={handleNavigate}
            lang={lang}
          />
        );
      case 'categories':
        return (
          <CategoryManager
            categories={categories}
            transactions={transactions}
            onAddCategory={handleAddCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
            onNavigate={handleNavigate}
            lang={lang}
          />
        );
      case 'budgets':
        return (
          <BudgetManager
            budgets={budgets}
            categories={categories}
            transactions={transactions}
            onAddBudget={handleAddBudget}
            onUpdateBudget={handleUpdateBudget}
            onDeleteBudget={handleDeleteBudget}
            onNavigate={handleNavigate}
            lang={lang}
          />
        );
      case 'savings':
        return (
          <SavingsTracker
            savingsGoals={savingsGoals}
            accounts={accounts}
            onAddSavingsGoal={handleAddSavingsGoal}
            onUpdateSavingsGoal={handleUpdateSavingsGoal}
            onDeleteSavingsGoal={handleDeleteSavingsGoal}
            onContributeToSavingsGoal={handleContributeToSavingsGoal}
            onNavigate={handleNavigate}
            lang={lang}
          />
        );
      case 'settings':
        return (
          <Settings
            onResetDatabase={handleResetDatabase}
            onImportDatabase={handleImportDatabase}
            onExportDatabase={handleExportDatabase}
            transactions={transactions}
            accounts={accounts}
            categories={categories}
            onNavigate={handleNavigate}
            lang={lang}
          />
        );
      default:
        // Unknown screen — redirect to dashboard
        setTimeout(() => handleNavigate('dashboard'), 0);
        return <Dashboard
            accounts={accounts}
            transactions={transactions}
            categories={categories}
            reminders={reminders}
            budgets={budgets}
            savingsGoals={savingsGoals}
            onNavigate={handleNavigate}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            lang={lang}
            onSetLang={handleSetLang}
          />;
    }
  };

  return (
    <div className="phone-shell">

      {/* A. Android Status Bar (Simulated) */}
      <div className="android-status-bar">
        <span>{currentTime}</span>
        <div className="android-status-icons">
          <svg width="14" height="12" viewBox="0 0 14 12" fill="currentColor">
            <rect x="0" y="9" width="2" height="3" rx="0.5" />
            <rect x="3" y="7" width="2" height="5" rx="0.5" />
            <rect x="6" y="5" width="2" height="7" rx="0.5" />
            <rect x="9" y="3" width="2" height="9" rx="0.5" />
            <rect x="12" y="0" width="2" height="12" rx="0.5" />
          </svg>
          <svg width="14" height="12" viewBox="0 0 14 12" fill="currentColor">
            <path d="M7 11.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm-3.5-4a5 5 0 017 0 .5.5 0 01-.7.7 4 4 0 00-5.6 0 .5.5 0 01-.7-.7zm-2.8-2.8a9 9 0 0112.6 0 .5.5 0 01-.7.7 8 8 0 00-11.2 0 .5.5 0 01-.7-.7z" />
          </svg>
          <svg width="22" height="12" viewBox="0 0 22 12" fill="currentColor">
            <rect x="0" y="1" width="18" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1" />
            <rect x="2" y="3" width="12" height="6" rx="1" />
            <path d="M20 4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* B. App Context Content Container */}
      <div className="app-container" style={{ position: 'relative' }}>
        {/* Global Language Toggle — top-right corner, visible on all pages */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
          <div className="neo-pressed-sm" style={globalLangStyles.pill}>
            <button
              onClick={() => handleSetLang('en')}
              style={{
                ...globalLangStyles.opt,
                color: lang === 'en' ? 'var(--accent-color)' : 'var(--text-secondary)',
                fontWeight: lang === 'en' ? '700' : '500',
                backgroundColor: lang === 'en' ? 'var(--bg-color)' : 'transparent',
                boxShadow: lang === 'en' ? 'var(--neomorphic-raised-sm)' : 'none',
              }}
            >
              EN
            </button>
            <button
              onClick={() => handleSetLang('bn')}
              style={{
                ...globalLangStyles.opt,
                color: lang === 'bn' ? 'var(--accent-color)' : 'var(--text-secondary)',
                fontWeight: lang === 'bn' ? '700' : '500',
                backgroundColor: lang === 'bn' ? 'var(--bg-color)' : 'transparent',
                boxShadow: lang === 'bn' ? 'var(--neomorphic-raised-sm)' : 'none',
              }}
            >
              বাংলা
            </button>
          </div>
        </div>
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback />}>
            {renderScreen()}
          </Suspense>
        </ErrorBoundary>
      </div>

      {/* C. Floating Transaction Add/Edit Form Overlay */}
      {showTransactionForm && (
        <ErrorBoundary>
          <Suspense fallback={null}>
            <TransactionForm
              transaction={editingTransaction}
              accounts={accounts}
              categories={categories}
              onSave={handleSaveTransaction}
              onDelete={handleDeleteTransaction}
              onClose={() => {
                setShowTransactionForm(false);
                setEditingTransaction(null);
              }}
              lang={lang}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* D. Bottom Navigation Bar */}
      <div style={bottomNavStyles.container}>

        {/* Analytics */}
        <button
          style={{
            ...bottomNavStyles.btn,
            color: currentScreen === 'analytics' ? 'var(--accent-color)' : 'var(--text-secondary)',
          }}
          onClick={() => handleNavigate('analytics')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          <span style={bottomNavStyles.label}>{t('analytics.title', lang)}</span>
        </button>

        {/* Income & Expense (unified) */}
        <button
          style={{
            ...bottomNavStyles.btn,
            color: currentScreen === 'transactions' ? 'var(--accent-color)' : 'var(--text-secondary)',
          }}
          onClick={() => handleNavigate('transactions')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span style={bottomNavStyles.label}>{t('nav.incomeExpense', lang)}</span>
        </button>

        {/* Center + Button */}
        <button
          className={`nav-center-btn ${isCenterBtnPressed ? 'clicked' : ''}`}
          style={bottomNavStyles.centerBtn}
          onClick={handleAddTransactionClick}
          onMouseDown={() => setIsCenterBtnPressed(true)}
          onMouseUp={() => setTimeout(() => setIsCenterBtnPressed(false), 200)}
          onMouseLeave={() => setIsCenterBtnPressed(false)}
        >
          <svg
            className="nav-plus-icon"
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {/* Categories */}
        <button
          style={{
            ...bottomNavStyles.btn,
            color: currentScreen === 'categories' ? 'var(--accent-color)' : 'var(--text-secondary)',
          }}
          onClick={() => handleNavigate('categories')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          <span style={bottomNavStyles.label}>{t('nav.categories', lang)}</span>
        </button>

        {/* Calendar */}
        <button
          style={{
            ...bottomNavStyles.btn,
            color: currentScreen === 'calendar' ? 'var(--accent-color)' : 'var(--text-secondary)',
          }}
          onClick={() => handleNavigate('calendar')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span style={bottomNavStyles.label}>{t('calendar.title', lang)}</span>
        </button>
      </div>

    </div>
  );
}
