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
  const [budgets, setBudgets] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
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
  const [showSplash, setShowSplash] = useState(true);
  const [splashClosing, setSplashClosing] = useState(false);

  // 4. System States
  const [theme, setTheme] = useState('light');
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  // Lock screen removed (direct entry)

  // 5. Initial Load
  useEffect(() => {

    // Load database
    const loadedAccounts = db.getAccounts();
    const loadedCategories = db.getCategories();
    const loadedTransactions = db.getTransactions();
    const loadedBudgets = db.getBudgets();
    const loadedSavingsGoals = db.getSavingsGoals();
    setAccounts(loadedAccounts);
    setCategories(loadedCategories);
    setTransactions(loadedTransactions);
    setBudgets(loadedBudgets);
    setSavingsGoals(loadedSavingsGoals);

    // Process recurring transactions — auto-creates any that are due
    const result = db.processRecurringTransactions();
    if (result.count > 0) {
      // Refresh data to include newly created transactions and updated balances
      setTransactions(db.getTransactions());
      setAccounts(db.getAccounts());
      // Show a toast notification
      setToast({
        key: 'recurringCreated',
        count: result.count,
      });
    }

    // Set Theme
    const savedTheme = localStorage.getItem('pocket_khata_theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Set language data attribute for Bangla font
    const savedLang = localStorage.getItem('pocket_khata_lang') || 'en';
    document.documentElement.setAttribute('data-lang', savedLang);

    // Request fullscreen for immersive mode (PWA on Android)
    const enterFullscreen = async () => {
      try {
        if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch (e) {
        // Fullscreen API not available or denied — silent fallback for non-Android browsers
      }
    };
    // Wait for mount animation to settle before requesting fullscreen
    const fsTimer = setTimeout(enterFullscreen, 1200);

    // Listen for fullscreen exit events (e.g., system gesture swiped from edge)
    // and automatically re-enter immersive mode
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        // User may have exited via system gesture — re-enter after a short delay
        setTimeout(enterFullscreen, 500);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Cleanup on unmount
    return () => {
      clearTimeout(fsTimer);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    // After the logo has been visible for a bit, start the fade-out
    const splashTimer = setTimeout(() => setSplashClosing(true), 2000);
    return () => clearTimeout(splashTimer);
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

  // 10. Batch operations for TransactionHistory
  const handleBatchDelete = useCallback((ids) => {
    try {
      ids.forEach(id => db.deleteTransaction(id));
      setTransactions(db.getTransactions());
      setAccounts(db.getAccounts());
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
  }, []);



  // 12. Preload TransactionHistory after mount so it's ready for instant navigation
  useEffect(() => {
    preloadTransactionHistory();
  }, []);

  // 12. Close menu when clicking outside
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
      {showSplash && (
        <div
          className={`splash-screen${splashClosing ? ' splash-closing' : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => { if (!splashClosing) setSplashClosing(true); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!splashClosing) setSplashClosing(true); } }}
          onAnimationEnd={(e) => {
            if (e.animationName === 'splashFadeOut') {
              setShowSplash(false);
            }
          }}
        >
          <div className="splash-glow splash-glow-1" />
          <div className="splash-glow splash-glow-2" />
          <div className="splash-glow splash-glow-3" />
          <div className="splash-content">
            <img className="splash-logo" src="/pocket-khata-logo.png" alt="Pocket Khata logo" />
          </div>
        </div>
      )}

      {/* C. App Context Content Container */}
      <div className="app-container" style={{ position: 'relative' }}>
        {/* Toast notification overlay */}
        {toast && (
          <div style={{
            position: 'absolute',
            top: '-20px',
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            zIndex: 200,
            pointerEvents: 'none',
          }}>
            <div style={{
              padding: '10px 18px',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-color)',
              boxShadow: '0 6px 24px rgba(0,0,0,0.15)',
              border: '1px solid var(--accent-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              animation: 'slideDown 0.3s ease-out',
              whiteSpace: 'nowrap',
            }}>
              <CheckCircle size={18} color="var(--color-income)" />
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

          {/* Language Toggle (right) */}
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
