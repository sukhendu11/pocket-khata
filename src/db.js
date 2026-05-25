// Local database management for Pocket Khata using localStorage

const KEYS = {
  ACCOUNTS: 'pocket_khata_accounts',
  CATEGORIES: 'pocket_khata_categories',
  TRANSACTIONS: 'pocket_khata_transactions',
  REMINDERS: 'pocket_khata_reminders',
  SECURITY: 'pocket_khata_security',
  BUDGETS: 'pocket_khata_budgets',
  SAVINGS_GOALS: 'pocket_khata_savings_goals',
};

// Seed Data
const DEFAULT_ACCOUNTS = [
  { id: 'acc_cash', name: 'Cash', type: 'Cash', balance: 12500, color: '#3cd070' },
  { id: 'acc_bank', name: 'Bank Account', type: 'Bank', balance: 45000, color: '#4a90e2' },
  { id: 'acc_bkash', name: 'bKash Wallet', type: 'Bkash', balance: 8200, color: '#ff5a79' },
  { id: 'acc_nagad', name: 'Nagad Wallet', type: 'Nagad', balance: 4300, color: '#ff8a00' },
];

const DEFAULT_CATEGORIES = [
  { id: 'cat_salary', name: 'Salary', type: 'income', icon: 'Briefcase', color: '#3cd070' },
  { id: 'cat_freelance', name: 'Freelance', type: 'income', icon: 'Globe', color: '#00c9db' },
  { id: 'cat_investments', name: 'Investments', type: 'income', icon: 'TrendingUp', color: '#8e44ad' },
  { id: 'cat_food', name: 'Food & Dining', type: 'expense', icon: 'Utensils', color: '#ff7b54' },
  { id: 'cat_shopping', name: 'Shopping', type: 'expense', icon: 'ShoppingBag', color: '#e84393' },
  { id: 'cat_rent', name: 'Rent & Housing', type: 'expense', icon: 'Home', color: '#16a085' },
  { id: 'cat_utilities', name: 'Utilities', type: 'expense', icon: 'Lightbulb', color: '#f1c40f' },
  { id: 'cat_transport', name: 'Transport', type: 'expense', icon: 'Car', color: '#0984e3' },
  { id: 'cat_entertainment', name: 'Entertainment', type: 'expense', icon: 'Tv', color: '#a29bfe' },
  { id: 'cat_medical', name: 'Medical & Health', type: 'expense', icon: 'HeartPulse', color: '#e74c3c' },
];

const DEFAULT_TRANSACTIONS = [
  {
    id: 'tx_1',
    type: 'income',
    amount: 55000,
    date: new Date(new Date().setDate(new Date().getDate() - 10)).toISOString().split('T')[0],
    accountId: 'acc_bank',
    categoryId: 'cat_salary',
    notes: 'Monthly Company Salary',
  },
  {
    id: 'tx_2',
    type: 'expense',
    amount: 15000,
    date: new Date(new Date().setDate(new Date().getDate() - 8)).toISOString().split('T')[0],
    accountId: 'acc_bank',
    categoryId: 'cat_rent',
    notes: 'Apartment Rent',
  },
  {
    id: 'tx_3',
    type: 'expense',
    amount: 450,
    date: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString().split('T')[0],
    accountId: 'acc_cash',
    categoryId: 'cat_food',
    notes: 'Lunch at Restaurant',
  },
  {
    id: 'tx_4',
    type: 'transfer',
    amount: 5000,
    date: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString().split('T')[0],
    accountId: 'acc_bank', // From
    transferToId: 'acc_bkash', // To
    categoryId: '',
    notes: 'Added money to bKash',
  },
  {
    id: 'tx_5',
    type: 'expense',
    amount: 1200,
    date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0],
    accountId: 'acc_bkash',
    categoryId: 'cat_shopping',
    notes: 'T-shirt online purchase',
  },
];

const DEFAULT_REMINDERS = [
  {
    id: 'rem_1',
    name: 'Electricity Bill',
    amount: 1850,
    dueDate: new Date(new Date().setDate(new Date().getDate() + 4)).toISOString().split('T')[0],
    categoryId: 'cat_utilities',
    status: 'unpaid',
  },
  {
    id: 'rem_2',
    name: 'Internet Subscription',
    amount: 950,
    dueDate: new Date(new Date().setDate(new Date().getDate() + 9)).toISOString().split('T')[0],
    categoryId: 'cat_utilities',
    status: 'unpaid',
  },
  {
    id: 'rem_3',
    name: 'Gym Membership',
    amount: 1500,
    dueDate: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString().split('T')[0],
    categoryId: 'cat_entertainment',
    status: 'paid',
  },
];

const DEFAULT_SECURITY = {
  isPINEnabled: false,
  pin: '1234',
  isBiometricEnabled: false,
};

const DEFAULT_BUDGETS = [];

const DEFAULT_SAVINGS_GOALS = [];

// Helper: load from localStorage or seed
function getOrSeed(key, defaultValue) {
  const data = localStorage.getItem(key);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error(`Error parsing key ${key}, reseeding...`, e);
    }
  }
  localStorage.setItem(key, JSON.stringify(defaultValue));
  return JSON.parse(JSON.stringify(defaultValue)); // Return a deep copy to prevent mutation of the original
}

function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// DATABASE API
export const db = {
  // Accounts
  getAccounts() {
    return getOrSeed(KEYS.ACCOUNTS, DEFAULT_ACCOUNTS);
  },
  saveAccounts(accounts) {
    save(KEYS.ACCOUNTS, accounts);
  },
  addAccount(account) {
    const accounts = this.getAccounts();
    const newAccount = {
      ...account,
      id: `acc_${Date.now()}`,
      balance: Number(account.balance) || 0,
    };
    accounts.push(newAccount);
    this.saveAccounts(accounts);
    return newAccount;
  },
  updateAccount(updatedAccount) {
    const accounts = this.getAccounts();
    const idx = accounts.findIndex(a => a.id === updatedAccount.id);
    if (idx !== -1) {
      accounts[idx] = {
        ...updatedAccount,
        balance: Number(updatedAccount.balance) || 0,
      };
      this.saveAccounts(accounts);
    }
  },
  deleteAccount(id) {
    const accounts = this.getAccounts();
    const filtered = accounts.filter(a => a.id !== id);
    this.saveAccounts(filtered);
    
    // Clean up corresponding transactions if needed, or leave them orphan?
    // In normal systems, we delete transactions or prevent deletion. Let's keep transactions but note orphan.
  },

  // Categories
  getCategories() {
    return getOrSeed(KEYS.CATEGORIES, DEFAULT_CATEGORIES);
  },
  saveCategories(categories) {
    save(KEYS.CATEGORIES, categories);
  },
  addCategory(category) {
    const categories = this.getCategories();
    const newCategory = {
      ...category,
      id: `cat_${Date.now()}`,
    };
    categories.push(newCategory);
    this.saveCategories(categories);
    return newCategory;
  },
  updateCategory(updatedCategory) {
    const categories = this.getCategories();
    const idx = categories.findIndex(c => c.id === updatedCategory.id);
    if (idx !== -1) {
      categories[idx] = updatedCategory;
      this.saveCategories(categories);
    }
  },
  deleteCategory(id) {
    const categories = this.getCategories();
    const filtered = categories.filter(c => c.id !== id);
    this.saveCategories(filtered);
  },

  // Transactions
  getTransactions() {
    return getOrSeed(KEYS.TRANSACTIONS, DEFAULT_TRANSACTIONS);
  },
  saveTransactions(transactions) {
    save(KEYS.TRANSACTIONS, transactions);
  },
  addTransaction(tx) {
    const transactions = this.getTransactions();
    const newTx = {
      ...tx,
      id: `tx_${Date.now()}`,
      amount: Number(tx.amount),
    };
    transactions.push(newTx);
    this.saveTransactions(transactions);

    // Update Account Balances
    const accounts = this.getAccounts();
    if (tx.type === 'income') {
      const acc = accounts.find(a => a.id === tx.accountId);
      if (acc) acc.balance += newTx.amount;
    } else if (tx.type === 'expense') {
      const acc = accounts.find(a => a.id === tx.accountId);
      if (acc) acc.balance -= newTx.amount;
    } else if (tx.type === 'transfer') {
      const fromAcc = accounts.find(a => a.id === tx.accountId);
      const toAcc = accounts.find(a => a.id === tx.transferToId);
      if (fromAcc) fromAcc.balance -= newTx.amount;
      if (toAcc) toAcc.balance += newTx.amount;
    }
    this.saveAccounts(accounts);
    return newTx;
  },
  updateTransaction(updatedTx, oldTx) {
    const transactions = this.getTransactions();
    const idx = transactions.findIndex(t => t.id === updatedTx.id);
    if (idx !== -1) {
      transactions[idx] = {
        ...updatedTx,
        amount: Number(updatedTx.amount),
      };
      this.saveTransactions(transactions);

      // Revert old transaction balances
      const accounts = this.getAccounts();
      if (oldTx.type === 'income') {
        const acc = accounts.find(a => a.id === oldTx.accountId);
        if (acc) acc.balance -= oldTx.amount;
      } else if (oldTx.type === 'expense') {
        const acc = accounts.find(a => a.id === oldTx.accountId);
        if (acc) acc.balance += oldTx.amount;
      } else if (oldTx.type === 'transfer') {
        const fromAcc = accounts.find(a => a.id === oldTx.accountId);
        const toAcc = accounts.find(a => a.id === oldTx.transferToId);
        if (fromAcc) fromAcc.balance += oldTx.amount;
        if (toAcc) toAcc.balance -= oldTx.amount;
      }

      // Apply new transaction balances
      if (updatedTx.type === 'income') {
        const acc = accounts.find(a => a.id === updatedTx.accountId);
        if (acc) acc.balance += updatedTx.amount;
      } else if (updatedTx.type === 'expense') {
        const acc = accounts.find(a => a.id === updatedTx.accountId);
        if (acc) acc.balance -= updatedTx.amount;
      } else if (updatedTx.type === 'transfer') {
        const fromAcc = accounts.find(a => a.id === updatedTx.accountId);
        const toAcc = accounts.find(a => a.id === updatedTx.transferToId);
        if (fromAcc) fromAcc.balance -= updatedTx.amount;
        if (toAcc) toAcc.balance += updatedTx.amount;
      }
      this.saveAccounts(accounts);
    }
  },
  deleteTransaction(id) {
    const transactions = this.getTransactions();
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    const filtered = transactions.filter(t => t.id !== id);
    this.saveTransactions(filtered);

    // Revert balance impact
    const accounts = this.getAccounts();
    if (tx.type === 'income') {
      const acc = accounts.find(a => a.id === tx.accountId);
      if (acc) acc.balance -= tx.amount;
    } else if (tx.type === 'expense') {
      const acc = accounts.find(a => a.id === tx.accountId);
      if (acc) acc.balance += tx.amount;
    } else if (tx.type === 'transfer') {
      const fromAcc = accounts.find(a => a.id === tx.accountId);
      const toAcc = accounts.find(a => a.id === tx.transferToId);
      if (fromAcc) fromAcc.balance += tx.amount;
      if (toAcc) toAcc.balance -= tx.amount;
    }
    this.saveAccounts(accounts);
  },

  // Reminders
  getReminders() {
    return getOrSeed(KEYS.REMINDERS, DEFAULT_REMINDERS);
  },
  saveReminders(reminders) {
    save(KEYS.REMINDERS, reminders);
  },
  addReminder(reminder) {
    const reminders = this.getReminders();
    const newReminder = {
      ...reminder,
      id: `rem_${Date.now()}`,
      amount: Number(reminder.amount),
      status: reminder.status || 'unpaid',
    };
    reminders.push(newReminder);
    this.saveReminders(reminders);
    return newReminder;
  },
  updateReminder(updatedReminder) {
    const reminders = this.getReminders();
    const idx = reminders.findIndex(r => r.id === updatedReminder.id);
    if (idx !== -1) {
      reminders[idx] = {
        ...updatedReminder,
        amount: Number(updatedReminder.amount),
      };
      this.saveReminders(reminders);
    }
  },
  deleteReminder(id) {
    const reminders = this.getReminders();
    const filtered = reminders.filter(r => r.id !== id);
    this.saveReminders(filtered);
  },
  payReminder(id, sourceAccountId) {
    const reminders = this.getReminders();
    const remIdx = reminders.findIndex(r => r.id === id);
    if (remIdx === -1) return null;

    const reminder = reminders[remIdx];
    reminder.status = 'paid';
    this.saveReminders(reminders);

    // Create a transaction matching this paid reminder
    const newTx = {
      type: 'expense',
      amount: reminder.amount,
      date: new Date().toISOString().split('T')[0],
      accountId: sourceAccountId,
      categoryId: reminder.categoryId,
      notes: `Bill Payment: ${reminder.name}`,
    };
    return this.addTransaction(newTx);
  },

  // ========== BUDGETS ==========
  getBudgets() {
    return getOrSeed(KEYS.BUDGETS, DEFAULT_BUDGETS);
  },
  saveBudgets(budgets) {
    save(KEYS.BUDGETS, budgets);
  },
  addBudget(budget) {
    const budgets = this.getBudgets();
    const newBudget = {
      ...budget,
      id: `budget_${Date.now()}`,
      limit: Number(budget.limit),
    };
    budgets.push(newBudget);
    this.saveBudgets(budgets);
    return newBudget;
  },
  updateBudget(updatedBudget) {
    const budgets = this.getBudgets();
    const idx = budgets.findIndex(b => b.id === updatedBudget.id);
    if (idx !== -1) {
      budgets[idx] = { ...updatedBudget, limit: Number(updatedBudget.limit) };
      this.saveBudgets(budgets);
    }
  },
  deleteBudget(id) {
    const budgets = this.getBudgets();
    this.saveBudgets(budgets.filter(b => b.id !== id));
  },
  /** Calculate spending for a category in a given month/year */
  getBudgetSpending(categoryId, month, year) {
    const transactions = this.getTransactions();
    return transactions
      .filter(tx => {
        if (tx.type !== 'expense') return false;
        if (tx.categoryId !== categoryId) return false;
        const d = new Date(tx.date);
        return d.getMonth() === month && d.getFullYear() === year;
      })
      .reduce((sum, tx) => sum + tx.amount, 0);
  },

  // ========== SAVINGS GOALS ==========
  getSavingsGoals() {
    return getOrSeed(KEYS.SAVINGS_GOALS, DEFAULT_SAVINGS_GOALS);
  },
  saveSavingsGoals(goals) {
    save(KEYS.SAVINGS_GOALS, goals);
  },
  addSavingsGoal(goal) {
    const goals = this.getSavingsGoals();
    const newGoal = {
      ...goal,
      id: `goal_${Date.now()}`,
      targetAmount: Number(goal.targetAmount),
      currentAmount: Number(goal.currentAmount || 0),
    };
    goals.push(newGoal);
    this.saveSavingsGoals(goals);
    return newGoal;
  },
  updateSavingsGoal(updatedGoal) {
    const goals = this.getSavingsGoals();
    const idx = goals.findIndex(g => g.id === updatedGoal.id);
    if (idx !== -1) {
      goals[idx] = {
        ...updatedGoal,
        targetAmount: Number(updatedGoal.targetAmount),
        currentAmount: Number(updatedGoal.currentAmount),
      };
      this.saveSavingsGoals(goals);
    }
  },
  deleteSavingsGoal(id) {
    const goals = this.getSavingsGoals();
    this.saveSavingsGoals(goals.filter(g => g.id !== id));
  },
  /** Contribute to a savings goal: deduct from account, create transfer transaction, increase goal amount */
  contributeToSavingsGoal(goalId, amount, sourceAccountId) {
    const goals = this.getSavingsGoals();
    const goalIdx = goals.findIndex(g => g.id === goalId);
    if (goalIdx === -1) return null;

    const contributedAmount = Number(amount);
    if (contributedAmount <= 0) return null;

    // Update goal amount
    goals[goalIdx].currentAmount += contributedAmount;
    this.saveSavingsGoals(goals);

    // Create a transaction (transfer from account to a virtual savings account)
    const newTx = {
      type: 'transfer',
      amount: contributedAmount,
      date: new Date().toISOString().split('T')[0],
      accountId: sourceAccountId,
      transferToId: `goal_${goalId}`, // Virtual savings target
      categoryId: '',
      notes: `Savings contribution: ${goals[goalIdx].name}`,
    };
    return this.addTransaction(newTx);
  },

  // ========== SECURITY ==========
  getSecuritySettings() {
    return getOrSeed(KEYS.SECURITY, DEFAULT_SECURITY);
  },
  saveSecuritySettings(settings) {
    save(KEYS.SECURITY, settings);
  },

  // ========== DATABASE RESET & BACKUPS ==========
  resetDatabase() {
    localStorage.removeItem(KEYS.ACCOUNTS);
    localStorage.removeItem(KEYS.CATEGORIES);
    localStorage.removeItem(KEYS.TRANSACTIONS);
    localStorage.removeItem(KEYS.REMINDERS);
    localStorage.removeItem(KEYS.SECURITY);
    localStorage.removeItem(KEYS.BUDGETS);
    localStorage.removeItem(KEYS.SAVINGS_GOALS);
    return {
      accounts: this.getAccounts(),
      categories: this.getCategories(),
      transactions: this.getTransactions(),
      reminders: this.getReminders(),
      security: this.getSecuritySettings(),
    };
  },
  exportDatabaseJSON() {
    const data = {
      accounts: this.getAccounts(),
      categories: this.getCategories(),
      transactions: this.getTransactions(),
      reminders: this.getReminders(),
      security: this.getSecuritySettings(),
      budgets: this.getBudgets(),
      savingsGoals: this.getSavingsGoals(),
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  },
  importDatabaseJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.accounts) save(KEYS.ACCOUNTS, data.accounts);
      if (data.categories) save(KEYS.CATEGORIES, data.categories);
      if (data.transactions) save(KEYS.TRANSACTIONS, data.transactions);
      if (data.reminders) save(KEYS.REMINDERS, data.reminders);
      if (data.security) save(KEYS.SECURITY, data.security);
      if (data.budgets) save(KEYS.BUDGETS, data.budgets);
      if (data.savingsGoals) save(KEYS.SAVINGS_GOALS, data.savingsGoals);
      return true;
    } catch (e) {
      console.error('Error importing JSON database:', e);
      return false;
    }
  },
};
