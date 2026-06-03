import { useState, useEffect, useCallback, lazy, Suspense, useRef } from 'react';
import { db } from './db';
import { trackScreenView, trackAction, trackError } from './lib/analytics';

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
const Settings = lazy(() => import('./components/Settings'));
const ReminderManager = lazy(() => import('./components/ReminderManager'));

const AccountManager = lazy(() => import('./components/AccountManager'));
const CategoryManager = lazy(() => import('./components/CategoryManager'));
const BudgetManager = lazy(() => import('./components/BudgetManager'));
const SavingsTracker = lazy(() => import('./components/SavingsTracker'));

// ErrorBoundary is kept as a static import since it wraps the entire app
// and must always be available to catch errors
import ErrorBoundary from './components/ErrorBoundary';

import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { t } from './i18n';
import { Menu, CheckCircle } from 'lucide-react';
import {
  scheduleReminderNotification,
  cancelReminderNotification,
  getNotificationPermission,
  createNotificationChannel,
  rescheduleAllReminders,
} from './notifications';

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
    padding: '24px 12px',
    gap: '14px',
  }}>
    {/* Skeleton shimmer cards matching typical screen layout */}
    <div className="shimmer-card" style={{ height: '80px', width: '100%' }} />
    <div className="shimmer-card" style={{ height: '48px', width: '100%' }} />
    <div className="shimmer-card" style={{ height: '60px', width: '100%' }} />
    <div className="shimmer-card" style={{ height: '100px', width: '100%' }} />
    <div className="shimmer-card" style={{ height: '48px', width: '70%' }} />
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
  const [budgets, setBudgets] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [reminders, setReminders] = useState([]);
  // Security (lock screen) removed

  // 3. Toast notification for auto-created recurring transactions etc.
  const [toast, setToast] = useState(null);

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // 4. Language State
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('pocket_khata_lang') || 'en';
  });

  const handleSetLang = (l) => {
    setLang(l);
    localStorage.setItem('pocket_khata_lang', l);
    document.documentElement.setAttribute('data-lang', l);
    trackAction('change_language', { lang: l });
  };

  // 3. Navigation & View States
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [transactionFilter, setTransactionFilter] = useState(null); // 'income', 'expense', or null
  const [isCenterBtnPressed, setIsCenterBtnPressed] = useState(false);
  // 4. System States
  const [theme, setTheme] = useState('light');
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const navRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: '0px', width: '0px' });
  // Lock screen removed (direct entry)

  // Apply theme/language to <html> synchronously BEFORE any render to prevent flash.
  const initialTheme = localStorage.getItem('pocket_khata_theme') || 'light';
  document.documentElement.setAttribute('data-theme', initialTheme);
  const initialLang = localStorage.getItem('pocket_khata_lang') || 'en';
  document.documentElement.setAttribute('data-lang', initialLang);

  // 5. Initial Load — runs ONCE after mount
  // Boot order: version check (main.jsx) → schema migration (db.js import) → hydration → UI
  // No splash gate — app renders Dashboard immediately with empty state, then populates
  // once data is loaded from storage. The db functions internally return safe defaults
  // (empty arrays) if nothing is stored yet, so there's never a crash on first render.
  useEffect(() => {
    const loadedAccounts = db.getAccounts();
    const loadedCategories = db.getCategories();
    const loadedTransactions = db.getTransactions();
    const loadedBudgets = db.getBudgets();
    const loadedSavingsGoals = db.getSavingsGoals();
    const loadedReminders = db.getReminders();

    // Notification permission is NOT auto-requested here.
    // It is only requested when the user explicitly interacts with the
    // notification toggle in Settings → handleToggleNotifications.
    setTheme(localStorage.getItem('pocket_khata_theme') || 'light');

    // Re-schedule notifications for existing reminders (needed after APK rebuild/reinstall
    // which clears all native Android scheduled alarms). Respects opt-out flag.
    const notifOptedOut = localStorage.getItem('pocket_khata_notifications_opted_out') === 'true';
    if (!notifOptedOut && loadedReminders.length > 0) {
      getNotificationPermission().then((perm) => {
        if (perm === 'granted') {
          rescheduleAllReminders(loadedReminders);
        }
      }).catch(() => {});
    }
    setAccounts(loadedAccounts);
    setCategories(loadedCategories);
    setTransactions(loadedTransactions);
    setBudgets(loadedBudgets);
    setSavingsGoals(loadedSavingsGoals);
    setReminders(loadedReminders);

    // Process recurring transactions after base data is loaded
    const result = db.processRecurringTransactions();
    if (result.count > 0) {
      setTransactions(db.getTransactions());
      setAccounts(db.getAccounts());
      setToast({ key: 'recurringCreated', count: result.count });
    }

    // Request fullscreen for immersive mode (PWA on Android) — non-blocking
    const fsTimer = setTimeout(async () => {
      try {
        if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch (_e) {
        // Silent fallback for non-Android browsers
      }
    }, 1200);

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setTimeout(async () => {
          try {
            if (document.documentElement.requestFullscreen) {
              await document.documentElement.requestFullscreen();
            }
          } catch (_e) { /* silent */ }
        }, 500);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      clearTimeout(fsTimer);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // 6. Theme Toggle handler
  const handleToggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('pocket_khata_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    trackAction('toggle_theme', { theme: nextTheme });
  };

  // 7. DB Mutators
  // -- Transactions
  const handleSaveTransaction = (tx) => {
    try {
      const isEdit = !!tx.id;
      if (isEdit) {
        const oldTx = transactions.find(oldTxRef => oldTxRef.id === tx.id);
        db.updateTransaction(tx, oldTx);
      } else {
        db.addTransaction(tx);
      }
      setTransactions(db.getTransactions());
      setAccounts(db.getAccounts());
      setShowTransactionForm(false);
      setEditingTransaction(null);
      setToast({ key: isEdit ? 'toast.transactionEdited' : 'toast.transactionAdded' });
      trackAction(isEdit ? 'edit_transaction' : 'add_transaction', {
        type: tx.type,
        hasRecurring: !!tx.recurring && typeof tx.recurring === 'object',
      });
    } catch (e) {
      trackError(e, { handler: 'handleSaveTransaction', txType: tx?.type });
      console.error('Failed to save transaction:', e);
    }
  };

  const handleDeleteTransaction = () => {
    try {
      if (editingTransaction?.id) {
        const txType = editingTransaction.type;
        db.deleteTransaction(editingTransaction.id);
        setTransactions(db.getTransactions());
        setAccounts(db.getAccounts());
        setShowTransactionForm(false);
        setEditingTransaction(null);
        setToast({ key: 'toast.transactionDeleted' });
        trackAction('delete_transaction', { type: txType });
      }
    } catch (e) {
      trackError(e, { handler: 'handleDeleteTransaction' });
      console.error('Failed to delete transaction:', e);
    }
  };

  const handleEditTransactionClick = (tx) => {
    setEditingTransaction(tx);
    setShowTransactionForm(true);
  };

  // -- Accounts
  const handleAddAccount = (acc) => {
    try {
      db.addAccount(acc);
      setAccounts(db.getAccounts());
    } catch (e) {
      trackError(e, { handler: 'handleAddAccount' });
      console.error('Failed to add account:', e);
    }
  };

  const handleUpdateAccount = (updatedAccount) => {
    try {
      db.updateAccount(updatedAccount);
      setAccounts(db.getAccounts());
    } catch (e) {
      trackError(e, { handler: 'handleUpdateAccount', accountId: updatedAccount?.id });
      console.error('Failed to update account:', e);
    }
  };

  // Balance adjustment — creates a single transaction to represent the balance change.
  // db.addTransaction() automatically adjusts the account balance internally,
  // so we do NOT call db.updateAccount() separately (avoiding double-adjustment).
  const handleBalanceAdjustment = (accountId, newBalance, date) => {
    try {
      const account = accounts.find(a => a.id === accountId);
      if (!account) return;
      const oldBalance = account.balance;
      const diff = newBalance - oldBalance;
      if (diff === 0) return;

      // Find a suitable category for the adjustment
      const incomeCategories = categories.filter(c => c.type === 'income');
      const adjustmentCat = incomeCategories.find(c => c.name === 'Bonus' || c.name.includes('Bonus'))
        || incomeCategories[0];

      // Only create the transaction — db.addTransaction() auto-updates the balance
      db.addTransaction({
        type: diff > 0 ? 'income' : 'expense',
        amount: Math.abs(diff),
        date,
        accountId,
        categoryId: adjustmentCat?.id || '',
        notes: diff > 0
          ? `Balance adjustment: ৳${oldBalance.toLocaleString()} → ৳${newBalance.toLocaleString()}`
          : `Balance reduction: ৳${oldBalance.toLocaleString()} → ৳${newBalance.toLocaleString()}`,
      });

      setAccounts(db.getAccounts());
      setTransactions(db.getTransactions());
      setToast({ key: 'toast.balanceAdjusted', count: 1 });
      trackAction('balance_adjustment', { accountId, oldBalance, newBalance, diff });
    } catch (e) {
      trackError(e, { handler: 'handleBalanceAdjustment', accountId });
      console.error('Failed to adjust balance:', e);
    }
  };

  const handleDeleteAccount = (id) => {
    try {
      db.deleteAccount(id);
      setAccounts(db.getAccounts());
    } catch (e) {
      trackError(e, { handler: 'handleDeleteAccount', accountId: id });
      console.error('Failed to delete account:', e);
    }
  };

  // -- Categories
  const handleAddCategory = (cat) => {
    try {
      db.addCategory(cat);
      setCategories(db.getCategories());
    } catch (e) {
      trackError(e, { handler: 'handleAddCategory' });
      console.error('Failed to add category:', e);
    }
  };

  const handleUpdateCategory = (cat) => {
    try {
      db.updateCategory(cat);
      setCategories(db.getCategories());
    } catch (e) {
      trackError(e, { handler: 'handleUpdateCategory', categoryId: cat?.id });
      console.error('Failed to update category:', e);
    }
  };

  const handleDeleteCategory = (id) => {
    try {
      db.deleteCategory(id);
      setCategories(db.getCategories());
    } catch (e) {
      trackError(e, { handler: 'handleDeleteCategory', categoryId: id });
      console.error('Failed to delete category:', e);
    }
  };

  // -- Backup Restores
  const handleResetDatabase = () => {
    try {
      const freshDb = db.resetDatabase();
      setAccounts(freshDb.accounts);
      setCategories(freshDb.categories);
      setTransactions(freshDb.transactions);
      setBudgets(freshDb.budgets);
      setSavingsGoals(freshDb.savingsGoals);
      setReminders(freshDb.reminders);
    } catch (e) {
      trackError(e, { handler: 'handleResetDatabase' });
      console.error('Failed to reset database:', e);
    }
  };

  const handleImportDatabase = (jsonString) => {
    try {
      const success = db.importDatabaseJSON(jsonString);
      if (success) {
        setAccounts(db.getAccounts());
        setCategories(db.getCategories());
        setTransactions(db.getTransactions());
        setBudgets(db.getBudgets());
        setSavingsGoals(db.getSavingsGoals());
        setReminders(db.getReminders());
      }
      return success;
    } catch (e) {
      trackError(e, { handler: 'handleImportDatabase' });
      console.error('Failed to import database:', e);
      return false;
    }
  };

  const handleExportDatabase = () => {
    try {
      return db.exportDatabaseJSON();
    } catch (e) {
      trackError(e, { handler: 'handleExportDatabase' });
      console.error('Failed to export database:', e);
      return null;
    }
  };

  // 8. Budget handlers
  const handleAddBudget = (budget) => {
    try {
      db.addBudget(budget);
      setBudgets(db.getBudgets());
    } catch (e) {
      trackError(e, { handler: 'handleAddBudget' });
      console.error('Failed to add budget:', e);
    }
  };
  const handleUpdateBudget = (budget) => {
    try {
      db.updateBudget(budget);
      setBudgets(db.getBudgets());
    } catch (e) {
      trackError(e, { handler: 'handleUpdateBudget', budgetId: budget?.id });
      console.error('Failed to update budget:', e);
    }
  };
  const handleDeleteBudget = (id) => {
    try {
      db.deleteBudget(id);
      setBudgets(db.getBudgets());
    } catch (e) {
      trackError(e, { handler: 'handleDeleteBudget', budgetId: id });
      console.error('Failed to delete budget:', e);
    }
  };

  // 9. Savings Goal handlers
  const handleAddSavingsGoal = (goal) => {
    try {
      db.addSavingsGoal(goal);
      setSavingsGoals(db.getSavingsGoals());
    } catch (e) {
      trackError(e, { handler: 'handleAddSavingsGoal' });
      console.error('Failed to add savings goal:', e);
    }
  };
  const handleUpdateSavingsGoal = (goal) => {
    try {
      db.updateSavingsGoal(goal);
      setSavingsGoals(db.getSavingsGoals());
    } catch (e) {
      trackError(e, { handler: 'handleUpdateSavingsGoal', goalId: goal?.id });
      console.error('Failed to update savings goal:', e);
    }
  };
  const handleDeleteSavingsGoal = (id) => {
    try {
      db.deleteSavingsGoal(id);
      setSavingsGoals(db.getSavingsGoals());
    } catch (e) {
      trackError(e, { handler: 'handleDeleteSavingsGoal', goalId: id });
      console.error('Failed to delete savings goal:', e);
    }
  };
  const handleContributeToSavingsGoal = (goalId, amount, sourceAccountId) => {
    try {
      db.contributeToSavingsGoal(goalId, amount, sourceAccountId);
      setSavingsGoals(db.getSavingsGoals());
      setTransactions(db.getTransactions());
      setAccounts(db.getAccounts());
    } catch (e) {
      trackError(e, { handler: 'handleContributeToSavingsGoal', goalId });
      console.error('Failed to contribute to savings goal:', e);
    }
  };

  // -- Reminders --
  // Helper: schedule a notification for a reminder if notifications are enabled.
  // Checks both the OS permission AND the app-level opt-out flag from Settings.
  const maybeScheduleReminder = (reminder) => {
    const optedOut = localStorage.getItem('pocket_khata_notifications_opted_out') === 'true';
    if (optedOut) return;
    getNotificationPermission().then((perm) => {
      if (perm === 'granted') {
        createNotificationChannel(); // ensure channel exists
        scheduleReminderNotification(reminder);
      }
    }).catch(() => {});
  };

  const handleAddReminder = (reminder) => {
    try {
      const saved = db.addReminder(reminder);
      setReminders(db.getReminders());
      maybeScheduleReminder(saved);
    } catch (e) {
      trackError(e, { handler: 'handleAddReminder' });
      console.error('Failed to add reminder:', e);
    }
  };

  const handleUpdateReminder = (reminder) => {
    try {
      db.updateReminder(reminder);
      setReminders(db.getReminders());
      // Cancel old notification, then schedule new one for updated date
      cancelReminderNotification(reminder.id);
      maybeScheduleReminder(reminder);
    } catch (e) {
      trackError(e, { handler: 'handleUpdateReminder', reminderId: reminder?.id });
      console.error('Failed to update reminder:', e);
    }
  };

  const handlePayReminder = (id, sourceAccountId) => {
    try {
      db.payReminder(id, sourceAccountId);
      setReminders(db.getReminders());
      setTransactions(db.getTransactions());
      setAccounts(db.getAccounts());
      // Bill is paid — cancel its notification
      cancelReminderNotification(id);
    } catch (e) {
      trackError(e, { handler: 'handlePayReminder', reminderId: id });
      console.error('Failed to pay reminder:', e);
    }
  };

  const handleDeleteReminder = (id) => {
    try {
      db.deleteReminder(id);
      setReminders(db.getReminders());
      cancelReminderNotification(id);
    } catch (e) {
      trackError(e, { handler: 'handleDeleteReminder', reminderId: id });
      console.error('Failed to delete reminder:', e);
    }
  };

  // 10. Batch operations for TransactionHistory
  const handleBatchDelete = useCallback((ids) => {
    try {
      ids.forEach(id => db.deleteTransaction(id));
      setTransactions(db.getTransactions());
      setAccounts(db.getAccounts());
      setToast({ key: 'toast.batchDeleted', count: ids.length });
      trackAction('batch_delete_transactions', { count: ids.length });
    } catch (e) {
      trackError(e, { handler: 'handleBatchDelete', count: ids.length });
      console.error('Failed to batch delete transactions:', e);
    }
  }, []);

  const handleBatchCategorize = useCallback((ids, categoryId) => {
    try {
      ids.forEach(id => {
        const tx = transactions.find(txItem => txItem.id === id);
        if (tx) {
          db.updateTransaction({ ...tx, categoryId }, tx);
        }
      });
      setTransactions(db.getTransactions());
      setAccounts(db.getAccounts());
      trackAction('batch_categorize_transactions', { count: ids.length });
    } catch (e) {
      trackError(e, { handler: 'handleBatchCategorize', count: ids.length, categoryId });
      console.error('Failed to batch categorize transactions:', e);
    }
  }, [transactions]);

  // 11. Navigation helpers
  const handleAddTransactionClick = useCallback(() => {
    setIsCenterBtnPressed(true);
    setTimeout(() => setIsCenterBtnPressed(false), 300);
    setEditingTransaction(null);
    setShowTransactionForm(true);
    trackAction('open_transaction_form');
  }, []);

  // Measure the active nav button and position the indicator precisely under it
  const updateIndicator = useCallback(() => {
    if (!navRef.current) return;
    const activeBtn = navRef.current.querySelector(`[data-nav="${currentScreen}"]`);
    if (activeBtn) {
      const navRect = navRef.current.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      setIndicatorStyle({
        left: `${btnRect.left - navRect.left + (btnRect.width - 36) / 2}px`,
        width: '36px',
      });
    } else {
      setIndicatorStyle({ left: '0px', width: '0px' });
    }
  }, [currentScreen]);

  // Re-measure on screen change and on resize for responsive alignment
  useEffect(() => {
    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [updateIndicator]);

  // Wrap handleNavigate to push to browser history
  const handleNavigate = useCallback((screen) => {
    if (screen === currentScreen) return;
    window.history.pushState({ screen }, '');
    setTransactionFilter(null);
    setCurrentScreen(screen);
    trackScreenView(screen);
  }, [currentScreen]);

  // Handle back button: registered ONCE — uses refs for current values to avoid stale closures
  useEffect(() => {
    const goBack = () => {
      // If history has a screen state that isn't dashboard, use browser back
      const state = window.history.state;
      if (state && state.screen && state.screen !== 'dashboard') {
        window.history.back();
      } else if (Capacitor.isNativePlatform()) {
        CapacitorApp.exitApp();
      }
    };

    // Browser back/forward navigation — follow history state
    const handlePopState = (e) => {
      if (e.state && e.state.screen) {
        setTransactionFilter(null);
        setCurrentScreen(e.state.screen);
      }
    };
    window.addEventListener('popstate', handlePopState);
    window.history.replaceState({ screen: 'dashboard' }, '');

    // Expose goBack for native onBackPressed (MainActivity.java)
    window.__androidBackCallback = goBack;

    return () => {
      window.removeEventListener('popstate', handlePopState);
      delete window.__androidBackCallback;
    };
  }, []);    // Preload TransactionHistory after mount so it's ready for instant navigation
  useEffect(() => {
    preloadTransactionHistory();
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // 14. Lock screen is removed — app starts directly in the dashboard

  // 15. Render Screen Routing
  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard':
        return (
          <Dashboard
            accounts={accounts}
            transactions={transactions}
            categories={categories}
            budgets={budgets}
            savingsGoals={savingsGoals}
            reminders={reminders}
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
            budgets={budgets}
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
            onBatchDelete={handleBatchDelete}
            onBatchCategorize={handleBatchCategorize}
          />
        );
      case 'calendar':
        return (
          <CalendarView
            transactions={transactions}
            accounts={accounts}
            categories={categories}
            reminders={reminders}
            onNavigate={handleNavigate}
            onEditTransaction={handleEditTransactionClick}
            lang={lang}
          />
        );
      case 'accounts':
        return (
          <AccountManager
            accounts={accounts}
            transactions={transactions}
            onAddAccount={handleAddAccount}
            onUpdateAccount={handleUpdateAccount}
            onDeleteAccount={handleDeleteAccount}
            onCreateBalanceAdjustment={handleBalanceAdjustment}
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
      case 'settings':
        return (
          <Settings
            onResetDatabase={handleResetDatabase}
            onImportDatabase={handleImportDatabase}
            onExportDatabase={handleExportDatabase}
            transactions={transactions}
            accounts={accounts}
            categories={categories}
            budgets={budgets}
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
      {/* C. App Context Content Container */}
      <div className="app-container" style={{ position: 'relative' }}>
        {/* Toast notification overlay — positioned in lower area, above bottom nav */}
        {toast && (
          <div style={{
            position: 'absolute',
            bottom: '70px',
            left: '10px',
            right: '10px',
            display: 'flex',
            justifyContent: 'center',
            zIndex: 200,
            pointerEvents: 'none',
          }}>
            <div style={{
              padding: '10px 18px',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-color)',
              boxShadow: '0 -4px 20px rgba(0,0,0,0.12)',
              border: '1px solid var(--accent-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              animation: 'toastSlideUp 0.3s ease-out',
            }}>
              <CheckCircle size={18} color="var(--color-income)" className="toast-icon" />
              <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>
                {t(toast.key, lang).replace('{count}', toast.count)}
              </span>
            </div>
          </div>
        )}

        {/* Global Header Toolbar — language toggle + menu button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          {/* Menu Button (left) */}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              className="neo-btn neo-btn-round menu-btn-icon"
              style={{ width: '36px', height: '36px', borderRadius: '50%', padding: 0 }}
              onClick={() => setShowMenu(prev => !prev)}
              aria-label="Menu"
            >
              <Menu size={18} />
            </button>
            {showMenu && (
              <div className="menu-dropdown" style={{
                position: 'absolute',
                top: '42px',
                left: 0,
                zIndex: 100,
                minWidth: '160px',
                padding: '6px',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                backgroundColor: 'var(--bg-color)',
              }}>
                <button
                  className="neo-btn"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    justifyContent: 'flex-start',
                    gap: '8px',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    backgroundColor: 'transparent',
                    border: 'none',
                  }}
                  onClick={() => { handleNavigate('settings'); setShowMenu(false); }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                  </svg>
                  Settings
                </button>
              </div>
            )}
          </div>

          {/* Version badge + Language Toggle (right) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '8px',
              fontWeight: '600',
              color: 'var(--text-secondary)',
              opacity: 0.5,
              letterSpacing: '0.3px',
            }}>
              v{db.getAppVersion()}
            </span>
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
              onAddCategory={handleAddCategory}
              onUpdateCategory={handleUpdateCategory}
              onNavigate={handleNavigate}
              lang={lang}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* D. Bottom Navigation Bar */}
      <div ref={navRef} style={{ ...bottomNavStyles.container, position: 'relative' }}>

        {/* Active indicator pill — precisely positioned via DOM measurement */}
        <div
          className="nav-indicator"
          style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
        />

        {/* Analytics */}
        <button
          data-nav="analytics"
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
          data-nav="transactions"
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
          data-nav="categories"
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
          data-nav="calendar"
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
