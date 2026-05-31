// Local database management for Pocket Khata using localStorage

import { trackError } from './lib/analytics';

const KEYS = {
  ACCOUNTS: 'pocket_khata_accounts',
  CATEGORIES: 'pocket_khata_categories',
  TRANSACTIONS: 'pocket_khata_transactions',
  REMINDERS: 'pocket_khata_reminders',
  SECURITY: 'pocket_khata_security',
  BUDGETS: 'pocket_khata_budgets',
  SAVINGS_GOALS: 'pocket_khata_savings_goals',
};

// ========== SCHEMA VERSIONING ==========
const SCHEMA_VERSION_KEY = 'pocket_khata_schema_version';

// ========== AUTO-BACKUP ==========
const AUTO_BACKUP_KEY = 'pocket_khata_auto_backups';
const MAX_AUTO_BACKUPS = 3;
const MIN_BACKUP_INTERVAL_MS = 3000; // Deduplicate rapid writes from same action

let _lastBackupTime = 0;
let _isCreatingBackup = false;

/**
 * Current schema version.
 * Increment this whenever the structure of stored data changes.
 *
 * Version history:
 *   1 — Initial release (no version key existed)
 *   2 — Added createdAt/updatedAt timestamps to all entities;
 *       added `archived` to categories, `recurring` to transactions
 *   3 — Added `demo` flag to seed-data items for "Clear Demo Data" feature
 *   4 — Added comprehensive default categories (17 total) with `default` flag
 *       and `subcategories` array; added `subcategory` field to transactions
 *   5 — Removed auto-seeding of demo accounts, transactions, and reminders.
 *       Production starts with empty state. Demo data arrays remain in source
 *       for optional manual/tests use only.
 *   6 — Removed demo seed data on migration. Schema v6 production starts clean.
 *   7 — Added recurring transaction schedule object support.
 *       `recurring` field changes from boolean to `false | { frequency, interval, nextDate, endDate, occurrencesCreated }`.
 */
const CURRENT_SCHEMA_VERSION = 7;

/**
 * Semantic version string shown in the UI.
 * Increment this for human-readable version releases.
 */
const APP_VERSION = '2.4.0';

const SEED_TIMESTAMP = new Date().toISOString();

// ========== SEED DATA ==========

// ========== SYSTEM ACCOUNTS ==========
// These 4 accounts are ALWAYS available and cannot be deleted.
// They start with 0 balance (no demo transactions).
// Names are English by default; localized at display time via i18n.
const SYSTEM_ACCOUNTS = [
  { id: 'acc_system_cash', name: 'Cash Ledger', type: 'Cash', balance: 0, color: '#3cd070', createdAt: SEED_TIMESTAMP, updatedAt: SEED_TIMESTAMP, system: true },
  { id: 'acc_system_bank', name: 'Bank Account', type: 'Bank', balance: 0, color: '#4a90e2', createdAt: SEED_TIMESTAMP, updatedAt: SEED_TIMESTAMP, system: true },
  { id: 'acc_system_bkash', name: 'bKash Wallet', type: 'Bkash', balance: 0, color: '#ff5a79', createdAt: SEED_TIMESTAMP, updatedAt: SEED_TIMESTAMP, system: true },
  { id: 'acc_system_nagad', name: 'Nagad Wallet', type: 'Nagad', balance: 0, color: '#ff8a00', createdAt: SEED_TIMESTAMP, updatedAt: SEED_TIMESTAMP, system: true },
];

// Legacy DEFAULT_ACCOUNTS kept for migration compatibility (will be deprecated)
const DEFAULT_ACCOUNTS = [
  { id: 'acc_cash', name: 'Cash', type: 'Cash', balance: 12500, color: '#3cd070', createdAt: SEED_TIMESTAMP, updatedAt: SEED_TIMESTAMP, demo: true },
  { id: 'acc_bank', name: 'Bank Account', type: 'Bank', balance: 45000, color: '#4a90e2', createdAt: SEED_TIMESTAMP, updatedAt: SEED_TIMESTAMP, demo: true },
  { id: 'acc_bkash', name: 'bKash Wallet', type: 'Bkash', balance: 8200, color: '#ff5a79', createdAt: SEED_TIMESTAMP, updatedAt: SEED_TIMESTAMP, demo: true },
  { id: 'acc_nagad', name: 'Nagad Wallet', type: 'Nagad', balance: 4300, color: '#ff8a00', createdAt: SEED_TIMESTAMP, updatedAt: SEED_TIMESTAMP, demo: true },
];

const DEFAULT_CATEGORIES = [
  // ---- Income (4) ----
  { id: 'cat_salary', name: 'Salary', type: 'income', icon: 'Briefcase', color: '#2ecc71', subcategories: ['Monthly Salary', 'Overtime', 'Commission', 'Bonus'], default: true, archived: false, createdAt: SEED_TIMESTAMP, updatedAt: SEED_TIMESTAMP },
  { id: 'cat_business', name: 'Business', type: 'income', icon: 'Briefcase', color: '#00c9db', subcategories: ['Sales', 'Service', 'Consulting'], default: true, archived: false, createdAt: SEED_TIMESTAMP, updatedAt: SEED_TIMESTAMP },
  { id: 'cat_freelance', name: 'Freelance', type: 'income', icon: 'Globe', color: '#8e44ad', subcategories: ['Web Dev', 'Design', 'Writing', 'Other'], default: true, archived: false, createdAt: SEED_TIMESTAMP, updatedAt: SEED_TIMESTAMP },
  { id: 'cat_bonus', name: 'Bonus', type: 'income', icon: 'Gift', color: '#f1c40f', subcategories: ['Performance Bonus', 'Festival Bonus', 'Annual Bonus'], default: true, archived: false, createdAt: SEED_TIMESTAMP, updatedAt: SEED_TIMESTAMP },

  // ---- Expense (13) ----
  { id: 'cat_food', name: 'Food & Dining', type: 'expense', icon: 'Utensils', color: '#e17055', subcategories: ['Groceries', 'Restaurants', 'Cafe', 'Food Delivery'], default: true, archived: false, createdAt: SEED_TIMESTAMP, updatedAt: SEED_TIMESTAMP },
  { id: 'cat_transport', name: 'Transport', type: 'expense', icon: 'Car', color: '#0984e3', subcategories: ['Fuel', 'Public Transport', 'Ride Share', 'Maintenance'], default: true, archived: false, createdAt: SEED_TIMESTAMP, updatedAt: SEED_TIMESTAMP },
  { id: 'cat_utilities', name: 'Bills & Utilities', type: 'expense', icon: 'Lightbulb', color: '#74b9ff', subcategories: ['Electricity', 'Water', 'Gas', 'Internet', 'Phone'], default: true, archived: false, createdAt: SEED_TIMESTAMP, updatedAt: SEED_TIMESTAMP },
  { id: 'cat_rent', name: 'Rent / Housing', type: 'expense', icon: 'Home', color: '#16a085', subcategories: ['Rent', 'Maintenance', 'Furniture', 'Insurance'], default: true, archived: false, createdAt: SEED_TIMESTAMP, updatedAt: SEED_TIMESTAMP },
  { id: 'cat_shopping', name: 'Shopping', type: 'expense', icon: 'ShoppingBag', color: '#e84393', subcategories: ['Clothing', 'Electronics', 'Home Decor', 'Personal Care'], default: true, archived: false, createdAt: SEED_TIMESTAMP, updatedAt: SEED_TIMESTAMP },
  { id: 'cat_medical', name: 'Health & Medical', type: 'expense', icon: 'HeartPulse', color: '#e74c3c', subcategories: ['Doctor', 'Medicine', 'Gym', 'Insurance'], default: true, archived: false, createdAt: SEED_TIMESTAMP, updatedAt: SEED_TIMESTAMP },
  { id: 'cat_education', name: 'Education', type: 'expense', icon: 'GraduationCap', color: '#a29bfe', subcategories: ['Tuition', 'Books', 'Courses', 'Stationery'], default: true, archived: false, createdAt: SEED_TIMESTAMP, updatedAt: SEED_TIMESTAMP },
  { id: 'cat_entertainment', name: 'Entertainment', type: 'expense', icon: 'Tv', color: '#fd79a8', subcategories: ['Movies', 'Music', 'Games', 'Events'], default: true, archived: false, createdAt: SEED_TIMESTAMP, updatedAt: SEED_TIMESTAMP },
  { id: 'cat_travel', name: 'Travel', type: 'expense', icon: 'Plane', color: '#00b894', subcategories: ['Flight', 'Hotel', 'Local Travel', 'Food'], default: true, archived: false, createdAt: SEED_TIMESTAMP, updatedAt: SEED_TIMESTAMP },
  { id: 'cat_savings', name: 'Savings / Investment', type: 'expense', icon: 'TrendingUp', color: '#6c5ce7', subcategories: ['Savings Account', 'Stocks', 'Mutual Funds', 'Retirement'], default: true, archived: false, createdAt: SEED_TIMESTAMP, updatedAt: SEED_TIMESTAMP },
  { id: 'cat_debt', name: 'Debt / Loan', type: 'expense', icon: 'CreditCard', color: '#d63031', subcategories: ['Credit Card', 'Personal Loan', 'Student Loan', 'Mortgage'], default: true, archived: false, createdAt: SEED_TIMESTAMP, updatedAt: SEED_TIMESTAMP },
  { id: 'cat_family', name: 'Family / Personal', type: 'expense', icon: 'Heart', color: '#fd79a8', subcategories: ['Family', 'Gifts', 'Donation', 'Personal'], default: true, archived: false, createdAt: SEED_TIMESTAMP, updatedAt: SEED_TIMESTAMP },
  { id: 'cat_misc', name: 'Miscellaneous', type: 'expense', icon: 'Sparkles', color: '#636e72', subcategories: ['Other', 'Emergency', 'Misc'], default: true, archived: false, createdAt: SEED_TIMESTAMP, updatedAt: SEED_TIMESTAMP },
];

const DEFAULT_TRANSACTIONS = [
  {
    id: 'tx_1', type: 'income', amount: 55000,
    date: new Date(new Date().setDate(new Date().getDate() - 10)).toISOString().split('T')[0],
    accountId: 'acc_bank', categoryId: 'cat_salary', notes: 'Monthly Company Salary',
    recurring: false, createdAt: SEED_TIMESTAMP, updatedAt: SEED_TIMESTAMP, demo: true,
  },
  {
    id: 'tx_2', type: 'expense', amount: 15000,
    date: new Date(new Date().setDate(new Date().getDate() - 8)).toISOString().split('T')[0],
    accountId: 'acc_bank', categoryId: 'cat_rent', notes: 'Apartment Rent',
    recurring: false, createdAt: SEED_TIMESTAMP, updatedAt: SEED_TIMESTAMP, demo: true,
  },
  {
    id: 'tx_3', type: 'expense', amount: 450,
    date: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString().split('T')[0],
    accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Lunch at Restaurant',
    recurring: false, createdAt: SEED_TIMESTAMP, updatedAt: SEED_TIMESTAMP, demo: true,
  },
  {
    id: 'tx_4', type: 'transfer', amount: 5000,
    date: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString().split('T')[0],
    accountId: 'acc_bank', transferToId: 'acc_bkash', categoryId: '', notes: 'Added money to bKash',
    recurring: false, createdAt: SEED_TIMESTAMP, updatedAt: SEED_TIMESTAMP, demo: true,
  },
  {
    id: 'tx_5', type: 'expense', amount: 1200,
    date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0],
    accountId: 'acc_bkash', categoryId: 'cat_shopping', notes: 'T-shirt online purchase',
    recurring: false, createdAt: SEED_TIMESTAMP, updatedAt: SEED_TIMESTAMP, demo: true,
  },
];

const DEFAULT_REMINDERS = [
  {
    id: 'rem_1', name: 'Electricity Bill', amount: 1850,
    dueDate: new Date(new Date().setDate(new Date().getDate() + 4)).toISOString().split('T')[0],
    categoryId: 'cat_utilities', status: 'unpaid',
    createdAt: SEED_TIMESTAMP, updatedAt: SEED_TIMESTAMP, demo: true,
  },
  {
    id: 'rem_2', name: 'Internet Subscription', amount: 950,
    dueDate: new Date(new Date().setDate(new Date().getDate() + 9)).toISOString().split('T')[0],
    categoryId: 'cat_utilities', status: 'unpaid',
    createdAt: SEED_TIMESTAMP, updatedAt: SEED_TIMESTAMP, demo: true,
  },
  {
    id: 'rem_3', name: 'Gym Membership', amount: 1500,
    dueDate: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString().split('T')[0],
    categoryId: 'cat_entertainment', status: 'paid',
    createdAt: SEED_TIMESTAMP, updatedAt: SEED_TIMESTAMP, demo: true,
  },
];

const DEFAULT_SECURITY = {
  isPINEnabled: false,
  pin: '1234',
  isBiometricEnabled: false,
  createdAt: SEED_TIMESTAMP,
  updatedAt: SEED_TIMESTAMP,
};

const DEFAULT_BUDGETS = [];

const DEFAULT_SAVINGS_GOALS = [];

// ========== SCHEMA MIGRATION ==========

/**
 * Run all pending schema migrations to bring localStorage data up to date.
 * Safe to call multiple times — checks version before applying.
 */
function migrateSchema() {
  const version = parseInt(localStorage.getItem(SCHEMA_VERSION_KEY)) || 0;

  if (version >= CURRENT_SCHEMA_VERSION) return;

  const now = new Date().toISOString();

  // ---- v1 → v2: Add timestamps, archived, recurring ----
  if (version < 2) {
    // Helper: patch an array of items with missing v2 fields
    const patchArray = (key, defaults) => {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      try {
        let changed = false;
        const items = JSON.parse(raw);
        if (!Array.isArray(items)) return;
        items.forEach(item => {
          if (!item.createdAt) { item.createdAt = now; changed = true; }
          if (!item.updatedAt) { item.updatedAt = now; changed = true; }
          // Apply entity-specific defaults
          if (defaults) {
            Object.keys(defaults).forEach(field => {
              if (item[field] === undefined) { item[field] = defaults[field]; changed = true; }
            });
          }
        });
        if (changed) localStorage.setItem(key, JSON.stringify(items));
      } catch (e) {
        trackError(e, { key, operation: 'migration_patch_array', version: 'v1_v2' });
        console.warn(`Schema migration: could not parse key "${key}", skipping.`, e);
      }
    };

    // Patch each data array
    patchArray(KEYS.ACCOUNTS);
    patchArray(KEYS.CATEGORIES, { archived: false });
    patchArray(KEYS.TRANSACTIONS, { recurring: false });
    patchArray(KEYS.REMINDERS);
    patchArray(KEYS.BUDGETS);
    patchArray(KEYS.SAVINGS_GOALS);

    // Patch security settings (object, not array)
    try {
      const secRaw = localStorage.getItem(KEYS.SECURITY);
      if (secRaw) {
        const sec = JSON.parse(secRaw);
        let changed = false;
        if (!sec.createdAt) { sec.createdAt = now; changed = true; }
        if (!sec.updatedAt) { sec.updatedAt = now; changed = true; }
        if (changed) localStorage.setItem(KEYS.SECURITY, JSON.stringify(sec));
      }
    } catch (e) {
      trackError(e, { operation: 'migration_security_settings', version: 'v1_v2' });
      console.warn('Schema migration: could not parse security settings, skipping.', e);
    }
  }

  // ---- v2 → v3: Tag seed data items with `demo: true` ----
  if (version < 3) {
    const SEED_IDS = {
      accounts: ['acc_cash', 'acc_bank', 'acc_bkash', 'acc_nagad'],
      categories: ['cat_salary', 'cat_freelance', 'cat_investments', 'cat_food', 'cat_shopping', 'cat_rent', 'cat_utilities', 'cat_transport', 'cat_entertainment', 'cat_medical'],
      transactions: ['tx_1', 'tx_2', 'tx_3', 'tx_4', 'tx_5'],
      reminders: ['rem_1', 'rem_2', 'rem_3'],
    };

    const SEED_NAMES = {
      accounts: ['Cash', 'Bank Account', 'bKash Wallet', 'Nagad Wallet'],
      categories: ['Salary', 'Freelance', 'Investments', 'Food & Dining', 'Shopping', 'Rent & Housing', 'Utilities', 'Transport', 'Entertainment', 'Medical & Health'],
      reminders: ['Electricity Bill', 'Internet Subscription', 'Gym Membership'],
    };

    const tagSeedItems = (key, idList, nameList) => {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      try {
        let changed = false;
        const items = JSON.parse(raw);
        if (!Array.isArray(items)) return;
        items.forEach(item => {
          if (item.demo) return; // already tagged
          const idx = idList.indexOf(item.id);
          if (idx === -1) return; // ID not in seed list
          // If nameList is provided, also match by name to avoid tagging renamed items
          if (nameList && nameList[idx] !== item.name) return;
          item.demo = true;
          changed = true;
        });
        if (changed) localStorage.setItem(key, JSON.stringify(items));
      } catch (e) {
        trackError(e, { key, operation: 'migration_v3_tag_seed', version: 'v2_v3' });
        console.warn(`Schema migration v3: could not parse key "${key}", skipping.`, e);
      }
    };

    tagSeedItems(KEYS.ACCOUNTS, SEED_IDS.accounts, SEED_NAMES.accounts);
    tagSeedItems(KEYS.CATEGORIES, SEED_IDS.categories, SEED_NAMES.categories);
    // Transactions/reminders without names: match by ID only
    tagSeedItems(KEYS.TRANSACTIONS, SEED_IDS.transactions);
    tagSeedItems(KEYS.REMINDERS, SEED_IDS.reminders, SEED_NAMES.reminders);
  }

  // ---- v3 → v4: Add default categories, subcategories, default flag ----
  if (version < 4) {
    // 1. Patch transactions — add `subcategory` field
    try {
      const txRaw = localStorage.getItem(KEYS.TRANSACTIONS);
      if (txRaw) {
        let changed = false;
        const txs = JSON.parse(txRaw);
        if (Array.isArray(txs)) {
          txs.forEach(tx => {
            if (tx.subcategory === undefined) { tx.subcategory = ''; changed = true; }
          });
          if (changed) localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(txs));
        }
      }
    } catch (e) {
      trackError(e, { operation: 'migration_v4_transactions', version: 'v3_v4' });
      console.warn('Schema migration v4: could not parse transactions, skipping.', e);
    }

    // 2. Patch categories — add `subcategories`, `default` fields;
    //    update names for renamed defaults (e.g. Utilities → Bills & Utilities)
    try {
      const catRaw = localStorage.getItem(KEYS.CATEGORIES);
      if (catRaw) {
        let changed = false;
        const categories = JSON.parse(catRaw);
        if (Array.isArray(categories)) {
          // Build a lookup of default categories by ID
          const defaultsById = {};
          DEFAULT_CATEGORIES.forEach(dc => { defaultsById[dc.id] = dc; });

          categories.forEach(cat => {
            if (cat.subcategories === undefined) { cat.subcategories = []; changed = true; }
            if (cat.default === undefined) {
              cat.default = !!defaultsById[cat.id];
              changed = true;
            }
            // If this is a known default, sync its name/subcategories from the master list
            if (defaultsById[cat.id]) {
              const src = defaultsById[cat.id];
              if (cat.name !== src.name) { cat.name = src.name; changed = true; }
              if (JSON.stringify(cat.subcategories) !== JSON.stringify(src.subcategories)) {
                cat.subcategories = [...src.subcategories];
                changed = true;
              }
              if (cat.icon !== src.icon) { cat.icon = src.icon; changed = true; }
              if (cat.color !== src.color) { cat.color = src.color; changed = true; }
            }
          });

          // Add any default categories that don't exist yet
          const existingIds = new Set(categories.map(c => c.id));
          DEFAULT_CATEGORIES.forEach(dc => {
            if (!existingIds.has(dc.id)) {
              categories.push({
                ...dc,
                createdAt: now,
                updatedAt: now,
              });
              changed = true;
            }
          });

          if (changed) localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
        }
      }
    } catch (e) {
      trackError(e, { operation: 'migration_v4_categories', version: 'v3_v4' });
      console.warn('Schema migration v4: could not parse categories, skipping.', e);
    }
  }

  // ---- v6 → v7: Convert legacy `recurring: true` (boolean) to schedule object format ----
  if (version < 7) {
    // Any transaction with `recurring: true` (legacy boolean) gets converted to a monthly schedule
    // starting from its date. This ensures backward compatibility if any old data has this value.
    try {
      const txRaw = localStorage.getItem(KEYS.TRANSACTIONS);
      if (txRaw) {
        let changed = false;
        const txs = JSON.parse(txRaw);
        if (Array.isArray(txs)) {
          txs.forEach(tx => {
            if (tx.recurring === true) {
              // Convert legacy boolean to schedule object
              tx.recurring = {
                frequency: 'monthly',
                interval: 1,
                nextDate: tx.date || new Date().toISOString().split('T')[0],
                endDate: null,
                occurrencesCreated: 0,
              };
              changed = true;
            } else if (tx.recurring === undefined || tx.recurring === null) {
              tx.recurring = false;
              changed = true;
            }
          });
          if (changed) localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(txs));
        }
      }
    } catch (e) {
      trackError(e, { operation: 'migration_v7_recurring', version: 'v6_v7' });
      console.warn('Schema migration v7: could not parse transactions, skipping.', e);
    }
  }

  // ---- v5 → v6: Remove demo seed data from existing stores ----
  if (version < 6) {
    const removeDemoItems = (key) => {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      try {
        const items = JSON.parse(raw);
        if (!Array.isArray(items)) return;
        const filtered = items.filter(item => !item.demo);
        if (filtered.length !== items.length) {
          localStorage.setItem(key, JSON.stringify(filtered));
        }
      } catch (e) {
        trackError(e, { key, operation: 'migration_v6_remove_demo', version: 'v5_v6' });
        console.warn(`Schema migration v6: could not parse key "${key}", skipping.`, e);
      }
    };

    removeDemoItems(KEYS.ACCOUNTS);
    removeDemoItems(KEYS.TRANSACTIONS);
    removeDemoItems(KEYS.REMINDERS);

    // Remove demo categories (keep defaults and user-created)
    try {
      const catRaw = localStorage.getItem(KEYS.CATEGORIES);
      if (catRaw) {
        const cats = JSON.parse(catRaw);
        if (Array.isArray(cats)) {
          const filtered = cats.filter(c => !c.demo || c.default);
          if (filtered.length !== cats.length) {
            localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(filtered));
          }
        }
      }
    } catch (e) {
      trackError(e, { operation: 'migration_v6_categories', version: 'v5_v6' });
      console.warn('Schema migration v6: could not parse categories, skipping.', e);
    }

    // Recalculate account balances from remaining transactions
    try {
      const accRaw = localStorage.getItem(KEYS.ACCOUNTS);
      const txRaw = localStorage.getItem(KEYS.TRANSACTIONS);
      if (accRaw && txRaw) {
        const accounts = JSON.parse(accRaw);
        const transactions = JSON.parse(txRaw);
        if (Array.isArray(accounts) && Array.isArray(transactions)) {
          let changed = false;
          accounts.forEach(acc => {
            let balance = 0;
            transactions.forEach(tx => {
              if (tx.type === 'income' && tx.accountId === acc.id) balance += tx.amount;
              else if (tx.type === 'expense' && tx.accountId === acc.id) balance -= tx.amount;
              else if (tx.type === 'transfer') {
                if (tx.accountId === acc.id) balance -= tx.amount;
                if (tx.transferToId === acc.id) balance += tx.amount;
              }
            });
            if (acc.balance !== balance) {
              acc.balance = balance;
              acc.updatedAt = new Date().toISOString();
              changed = true;
            }
          });
          if (changed) localStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(accounts));
        }
      }
    } catch (e) {
      trackError(e, { operation: 'migration_v6_balances', version: 'v5_v6' });
      console.warn('Schema migration v6: could not recalculate balances, skipping.', e);
    }
  }

  // Persist the updated version
  localStorage.setItem(SCHEMA_VERSION_KEY, String(CURRENT_SCHEMA_VERSION));
}

// Run migrations immediately on module load
migrateSchema();

// ========== HELPERS ==========

/** Get the current schema version number stored in localStorage (0 if none). */
function getStoredSchemaVersion() {
  return parseInt(localStorage.getItem(SCHEMA_VERSION_KEY)) || 0;
}

function getOrSeed(key, defaultValue) {
  // Ensure schema is up to date before reading — this also sets the
  // schema version key on fresh installs and after localStorage.clear().
  migrateSchema();

  const data = localStorage.getItem(key);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      trackError(e, { key, operation: 'get_or_seed_parse' });
      console.error(`Error parsing key ${key}, reseeding...`, e);
    }
  }
  localStorage.setItem(key, JSON.stringify(defaultValue));
  return JSON.parse(JSON.stringify(defaultValue)); // Deep copy
}

function save(key, data) {
  createAutoBackup();
  localStorage.setItem(key, JSON.stringify(data));
}

// ========== AUTO-BACKUP HELPERS ==========

/**
 * Read all current data keys and return a snapshot object.
 */
function readAllData() {
  return {
    accounts: getOrSeed(KEYS.ACCOUNTS, []),
    categories: getOrSeed(KEYS.CATEGORIES, DEFAULT_CATEGORIES),
    transactions: getOrSeed(KEYS.TRANSACTIONS, []),
    reminders: getOrSeed(KEYS.REMINDERS, []),
    security: getOrSeed(KEYS.SECURITY, DEFAULT_SECURITY),
    budgets: getOrSeed(KEYS.BUDGETS, DEFAULT_BUDGETS),
    savingsGoals: getOrSeed(KEYS.SAVINGS_GOALS, DEFAULT_SAVINGS_GOALS),
  };
}

/**
 * Create an auto-backup snapshot of all data before a write operation.
 * Deduplicates rapid writes (within 3 seconds) so a single user action
 * (e.g. addTransaction which saves both transactions AND accounts) only
 * creates one backup.
 */
function createAutoBackup() {
  const now = Date.now();
  if (now - _lastBackupTime < MIN_BACKUP_INTERVAL_MS) return;
  if (_isCreatingBackup) return;
  _isCreatingBackup = true;
  try {
    const snapshot = {
      timestamp: new Date().toISOString(),
      ...readAllData(),
    };

    let backups = [];
    const raw = localStorage.getItem(AUTO_BACKUP_KEY);
    if (raw) {
      try { backups = JSON.parse(raw); } catch (e) { trackError(e, { operation: 'auto_backup_parse' }); backups = []; }
    }

    backups.unshift(snapshot);
    if (backups.length > MAX_AUTO_BACKUPS) backups.length = MAX_AUTO_BACKUPS;

    localStorage.setItem(AUTO_BACKUP_KEY, JSON.stringify(backups));
    _lastBackupTime = now;
  } finally {
    _isCreatingBackup = false;
  }
}

/**
 * Get all stored auto-backups (newest first).
 */
function getAutoBackups() {
  const raw = localStorage.getItem(AUTO_BACKUP_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    trackError(e, { operation: 'get_auto_backups_parse' });
    return [];
  }
}

/**
 * Restore all data from a specific auto-backup.
 * @param {number} index - Index into the auto-backups array (0 = newest).
 * @returns {boolean} Whether the restore succeeded.
 */
function restoreFromAutoBackup(index) {
  const backups = getAutoBackups();
  if (index < 0 || index >= backups.length) return false;

  const snapshot = backups[index];
  if (!snapshot || !snapshot.accounts) return false;

  try {
    if (snapshot.accounts) save(KEYS.ACCOUNTS, snapshot.accounts);
    if (snapshot.categories) save(KEYS.CATEGORIES, snapshot.categories);
    if (snapshot.transactions) save(KEYS.TRANSACTIONS, snapshot.transactions);
    if (snapshot.reminders) save(KEYS.REMINDERS, snapshot.reminders);
    if (snapshot.security) save(KEYS.SECURITY, snapshot.security);
    if (snapshot.budgets) save(KEYS.BUDGETS, snapshot.budgets);
    if (snapshot.savingsGoals) save(KEYS.SAVINGS_GOALS, snapshot.savingsGoals);
    return true;
  } catch (e) {
    trackError(e, { operation: 'restore_auto_backup' });
    console.error('Error restoring from auto-backup:', e);
    return false;
  }
}

function clearAutoBackups() {
  localStorage.removeItem(AUTO_BACKUP_KEY);
}

function resetAutoBackupDedup() {
  _lastBackupTime = 0;
  _isCreatingBackup = false;
}

function getAutoBackupCount() {
  return getAutoBackups().length;
}

function getLatestBackupTimestamp() {
  const backups = getAutoBackups();
  if (backups.length === 0) return null;
  return backups[0].timestamp;
}

function getSchemaVersion() {
  return CURRENT_SCHEMA_VERSION;
}

function getAppVersion() {
  return APP_VERSION;
}

function getBudgetSpending(categoryId, month, year) {
  const transactions = getOrSeed(KEYS.TRANSACTIONS, []);
  return transactions
    .filter(tx => {
      if (tx.type !== 'expense') return false;
      if (tx.demo) return false;
      const d = new Date(tx.date);
      return d.getMonth() === month && d.getFullYear() === year && tx.categoryId === categoryId;
    })
    .reduce((sum, tx) => sum + tx.amount, 0);
}

// ========== DEMO DATA CLEARING ==========

/**
 * Calculate the balance of an account based on all non-demo transactions.
 * This is used after clearing demo data to ensure account balances are correct.
 */
function recalculateBalance(accountId, transactions) {
  let balance = 0;
  transactions.forEach(tx => {
    if (tx.type === 'income' && tx.accountId === accountId) {
      balance += tx.amount;
    } else if (tx.type === 'expense' && tx.accountId === accountId) {
      balance -= tx.amount;
    } else if (tx.type === 'transfer') {
      if (tx.accountId === accountId) balance -= tx.amount;
      if (tx.transferToId === accountId) balance += tx.amount;
    }
  });
  return balance;
}

/**
 * Remove all seed/demo data items (tagged with `demo: true`) from every store
 * and recalculate account balances based on remaining real transactions.
 * Demo categories used by real transactions are kept (the transaction wins).
 */
function clearDemoData() {
  const accounts = getOrSeed(KEYS.ACCOUNTS, DEFAULT_ACCOUNTS);
  const categories = getOrSeed(KEYS.CATEGORIES, DEFAULT_CATEGORIES);
  const transactions = getOrSeed(KEYS.TRANSACTIONS, DEFAULT_TRANSACTIONS);
  const reminders = getOrSeed(KEYS.REMINDERS, DEFAULT_REMINDERS);
  const budgets = getOrSeed(KEYS.BUDGETS, DEFAULT_BUDGETS);
  const savingsGoals = getOrSeed(KEYS.SAVINGS_GOALS, DEFAULT_SAVINGS_GOALS);

  // Filter out demo items (keep system default categories)
  const realTransactions = transactions.filter(tx => !tx.demo);
  const realCategories = categories.filter(c => !c.demo && !c.default);

  // But keep demo/user categories that are still referenced by real transactions
  const referencedCategoryIds = new Set(realTransactions.map(tx => tx.categoryId).filter(Boolean));
  const keptCategories = [
    // Keep all system-default categories
    ...categories.filter(c => c.default),
    // Keep user-created (non-demo, non-default) categories
    ...realCategories,
    // Keep demo categories referenced by real transactions
    ...categories.filter(c => c.demo && !c.default && referencedCategoryIds.has(c.id)),
  ];

  // Recalculate account balances from remaining transactions only
  const realAccounts = accounts.filter(a => !a.demo).map(acc => ({
    ...acc,
    balance: recalculateBalance(acc.id, realTransactions),
    updatedAt: new Date().toISOString(),
  }));

  const realReminders = reminders.filter(r => !r.demo);

  // Save everything back
  save(KEYS.ACCOUNTS, realAccounts);
  save(KEYS.CATEGORIES, keptCategories);
  save(KEYS.TRANSACTIONS, realTransactions);
  save(KEYS.REMINDERS, realReminders);
  // budgets and savingsGoals have no demo items, just save as-is
  save(KEYS.BUDGETS, budgets);
  save(KEYS.SAVINGS_GOALS, savingsGoals);

  return {
    accounts: realAccounts,
    categories: keptCategories,
    transactions: realTransactions,
    reminders: realReminders,
  };
}

/**
 * Calculate the next occurrence date for a recurring schedule.
 * @param {string} fromDate - Current nextDate in YYYY-MM-DD format
 * @param {object} schedule - { frequency, interval }
 * @returns {string} Next occurrence date as YYYY-MM-DD
 */
function calculateNextDate(fromDate, schedule) {
  const date = new Date(fromDate + 'T00:00:00');
  const interval = schedule.interval || 1;

  switch (schedule.frequency) {
    case 'daily':
      date.setDate(date.getDate() + interval);
      break;
    case 'weekly':
      date.setDate(date.getDate() + interval * 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + interval);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + interval);
      break;
    default:
      // Default to monthly if unknown
      date.setMonth(date.getMonth() + 1);
      break;
  }

  return date.toISOString().split('T')[0];
}

/**
 * Process all recurring transactions and auto-create any that are due.
 * Checks every transaction with an active recurring schedule and creates
 * a new transaction clone if `nextDate <= today`.
 *
 * @returns {{ count: number, createdTransactions: Array }} Summary of what was created.
 */
function processRecurringTransactions() {
  const transactions = getOrSeed(KEYS.TRANSACTIONS, []);
  const accounts = getOrSeed(KEYS.ACCOUNTS, []);
  const today = new Date().toISOString().split('T')[0];

  const createdTransactions = [];
  let accountsChanged = false;
  let transactionsChanged = false;

  const updatedTransactions = transactions.map(sourceTx => {
    // Skip non-recurring transactions
    if (!sourceTx.recurring || typeof sourceTx.recurring !== 'object') {
      return sourceTx;
    }

    const schedule = sourceTx.recurring;

    // Skip if no nextDate set
    if (!schedule.nextDate) return sourceTx;

    // Check if the schedule should be terminated
    if (schedule.endDate && schedule.endDate < today) {
      transactionsChanged = true;
      return { ...sourceTx, recurring: false };
    }

    // If nextDate hasn't arrived yet, keep as-is
    if (schedule.nextDate > today) return sourceTx;

    // ——— This transaction is due for auto-creation! ———

    const ts = new Date().toISOString();

    // Create the clone transaction
    const newTx = {
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: sourceTx.type,
      amount: sourceTx.amount,
      date: schedule.nextDate, // Use the scheduled nextDate as the transaction date
      accountId: sourceTx.accountId,
      transferToId: sourceTx.transferToId || null,
      categoryId: sourceTx.categoryId || '',
      subcategory: sourceTx.subcategory || '',
      notes: sourceTx.notes || '',
      recurring: false, // The created transaction is not itself recurring
      createdAt: ts,
      updatedAt: ts,
    };

    // Update account balances for the new transaction
    if (sourceTx.type === 'income') {
      const acc = accounts.find(a => a.id === sourceTx.accountId);
      if (acc) { acc.balance += sourceTx.amount; acc.updatedAt = ts; accountsChanged = true; }
    } else if (sourceTx.type === 'expense') {
      const acc = accounts.find(a => a.id === sourceTx.accountId);
      if (acc) { acc.balance -= sourceTx.amount; acc.updatedAt = ts; accountsChanged = true; }
    } else if (sourceTx.type === 'transfer') {
      const fromAcc = accounts.find(a => a.id === sourceTx.accountId);
      const toAcc = accounts.find(a => a.id === sourceTx.transferToId);
      if (fromAcc) { fromAcc.balance -= sourceTx.amount; fromAcc.updatedAt = ts; accountsChanged = true; }
      if (toAcc) { toAcc.balance += sourceTx.amount; toAcc.updatedAt = ts; accountsChanged = true; }
    }

    // Add the clone to the transactions array
    createdTransactions.push(newTx);

    // Calculate the next occurrence
    const updatedSchedule = { ...schedule };
    updatedSchedule.occurrencesCreated = (updatedSchedule.occurrencesCreated || 0) + 1;
    updatedSchedule.nextDate = calculateNextDate(updatedSchedule.nextDate, updatedSchedule);

    transactionsChanged = true;

    return { ...sourceTx, recurring: updatedSchedule };
  });

  // Append newly created transactions to the mapped (updated) array
  if (createdTransactions.length > 0) {
    updatedTransactions.push(...createdTransactions);
  }

  // Save everything back
  if (transactionsChanged || createdTransactions.length > 0) {
    // Use save() to create auto-backup once for all changes
    save(KEYS.TRANSACTIONS, updatedTransactions);
  }
  if (accountsChanged) {
    save(KEYS.ACCOUNTS, accounts);
  }

  return {
    count: createdTransactions.length,
    createdTransactions,
  };
}

function nowISO() {
  return new Date().toISOString();
}

// ========== DATABASE API ==========

export const db = {
  // Schema info
  getStoredSchemaVersion() {
    return getStoredSchemaVersion();
  },
  getSchemaVersion() {
    return getSchemaVersion();
  },
  getAppVersion() {
    return getAppVersion();
  },

  // ---- Accounts ----
  /**
   * Get all accounts, automatically merging system accounts.
   * System accounts (Cash Ledger, Bank Account, bKash Wallet, Nagad Wallet)
   * are ALWAYS present in the returned array.
   */
  getAccounts() {
    const userAccounts = getOrSeed(KEYS.ACCOUNTS, []);
    // Merge system accounts — add any that don't already exist (check by ID)
    const existingIds = new Set(userAccounts.map(a => a.id));
    const merged = [...userAccounts];
    let changed = false;
    SYSTEM_ACCOUNTS.forEach(sysAcc => {
      if (!existingIds.has(sysAcc.id)) {
        merged.push({ ...sysAcc, createdAt: nowISO(), updatedAt: nowISO() });
        changed = true;
      }
    });
    if (changed) {
      localStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(merged));
    }
    return merged;
  },
  /** Get user-created accounts only (excluding system accounts) */
  getUserAccounts() {
    const all = this.getAccounts();
    return all.filter(a => !a.system);
  },
  saveAccounts(accounts) {
    save(KEYS.ACCOUNTS, accounts);
  },
  addAccount(account) {
    const accounts = this.getAccounts();
    const ts = nowISO();
    const newAccount = {
      ...account,
      id: `acc_${Date.now()}`,
      balance: Number(account.balance) || 0,
      createdAt: ts,
      updatedAt: ts,
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
        updatedAt: nowISO(),
      };
      this.saveAccounts(accounts);
    }
  },
  deleteAccount(id) {
    const accounts = this.getAccounts();
    // Prevent deletion of system accounts
    const acc = accounts.find(a => a.id === id);
    if (acc && acc.system) return;
    this.saveAccounts(accounts.filter(a => a.id !== id));
  },

  // ---- Categories ----
  getCategories() {
    return getOrSeed(KEYS.CATEGORIES, DEFAULT_CATEGORIES);
  },
  saveCategories(categories) {
    save(KEYS.CATEGORIES, categories);
  },
  addCategory(category) {
    const categories = this.getCategories();
    const ts = nowISO();
    const newCategory = {
      ...category,
      id: `cat_${Date.now()}`,
      subcategories: category.subcategories || [],
      default: false,
      archived: category.archived !== undefined ? category.archived : false,
      createdAt: ts,
      updatedAt: ts,
    };
    categories.push(newCategory);
    this.saveCategories(categories);
    return newCategory;
  },
  updateCategory(updatedCategory) {
    const categories = this.getCategories();
    const idx = categories.findIndex(c => c.id === updatedCategory.id);
    if (idx !== -1) {
      categories[idx] = {
        ...updatedCategory,
        updatedAt: nowISO(),
      };
      this.saveCategories(categories);
    }
  },
  deleteCategory(id) {
    const categories = this.getCategories();
    this.saveCategories(categories.filter(c => c.id !== id));
  },

  // ---- Transactions ----
  getTransactions() {
    return getOrSeed(KEYS.TRANSACTIONS, []);
  },
  saveTransactions(transactions) {
    save(KEYS.TRANSACTIONS, transactions);
  },
  addTransaction(tx) {
    const transactions = this.getTransactions();
    const ts = nowISO();
    const newTx = {
      ...tx,
      id: `tx_${Date.now()}`,
      amount: Number(tx.amount),
      recurring: tx.recurring !== undefined ? tx.recurring : false,
      subcategory: tx.subcategory || '',
      createdAt: ts,
      updatedAt: ts,
    };
    transactions.push(newTx);
    this.saveTransactions(transactions);

    // Update Account Balances
    const accounts = this.getAccounts();
    if (tx.type === 'income') {
      const acc = accounts.find(a => a.id === tx.accountId);
      if (acc) { acc.balance += newTx.amount; acc.updatedAt = ts; }
    } else if (tx.type === 'expense') {
      const acc = accounts.find(a => a.id === tx.accountId);
      if (acc) { acc.balance -= newTx.amount; acc.updatedAt = ts; }
    } else if (tx.type === 'transfer') {
      const fromAcc = accounts.find(a => a.id === tx.accountId);
      const toAcc = accounts.find(a => a.id === tx.transferToId);
      if (fromAcc) { fromAcc.balance -= newTx.amount; fromAcc.updatedAt = ts; }
      if (toAcc) { toAcc.balance += newTx.amount; toAcc.updatedAt = ts; }
    }
    this.saveAccounts(accounts);
    return newTx;
  },
  updateTransaction(updatedTx, oldTx) {
    const transactions = this.getTransactions();
    const idx = transactions.findIndex(t => t.id === updatedTx.id);
    if (idx !== -1) {
      const ts = nowISO();
      transactions[idx] = {
        ...updatedTx,
        amount: Number(updatedTx.amount),
        updatedAt: ts,
      };
      this.saveTransactions(transactions);

      // Revert old transaction balances
      const accounts = this.getAccounts();
      if (oldTx.type === 'income') {
        const acc = accounts.find(a => a.id === oldTx.accountId);
        if (acc) { acc.balance -= oldTx.amount; acc.updatedAt = ts; }
      } else if (oldTx.type === 'expense') {
        const acc = accounts.find(a => a.id === oldTx.accountId);
        if (acc) { acc.balance += oldTx.amount; acc.updatedAt = ts; }
      } else if (oldTx.type === 'transfer') {
        const fromAcc = accounts.find(a => a.id === oldTx.accountId);
        const toAcc = accounts.find(a => a.id === oldTx.transferToId);
        if (fromAcc) { fromAcc.balance += oldTx.amount; fromAcc.updatedAt = ts; }
        if (toAcc) { toAcc.balance -= oldTx.amount; toAcc.updatedAt = ts; }
      }
      // Apply new transaction balances
      if (updatedTx.type === 'income') {
        const acc = accounts.find(a => a.id === updatedTx.accountId);
        if (acc) { acc.balance += updatedTx.amount; acc.updatedAt = ts; }
      } else if (updatedTx.type === 'expense') {
        const acc = accounts.find(a => a.id === updatedTx.accountId);
        if (acc) { acc.balance -= updatedTx.amount; acc.updatedAt = ts; }
      } else if (updatedTx.type === 'transfer') {
        const fromAcc = accounts.find(a => a.id === updatedTx.accountId);
        const toAcc = accounts.find(a => a.id === updatedTx.transferToId);
        if (fromAcc) { fromAcc.balance -= updatedTx.amount; fromAcc.updatedAt = ts; }
        if (toAcc) { toAcc.balance += updatedTx.amount; toAcc.updatedAt = ts; }
      }
      this.saveAccounts(accounts);
    }
  },
  deleteTransaction(id) {
    const transactions = this.getTransactions();
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    this.saveTransactions(transactions.filter(t => t.id !== id));

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

  // ---- Reminders ----
  getReminders() {
    return getOrSeed(KEYS.REMINDERS, []);
  },
  saveReminders(reminders) {
    save(KEYS.REMINDERS, reminders);
  },
  addReminder(reminder) {
    const reminders = this.getReminders();
    const ts = nowISO();
    const newReminder = {
      ...reminder,
      id: `rem_${Date.now()}`,
      amount: Number(reminder.amount),
      status: reminder.status || 'unpaid',
      createdAt: ts,
      updatedAt: ts,
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
        updatedAt: nowISO(),
      };
      this.saveReminders(reminders);
    }
  },
  deleteReminder(id) {
    const reminders = this.getReminders();
    this.saveReminders(reminders.filter(r => r.id !== id));
  },
  payReminder(id, sourceAccountId) {
    const reminders = this.getReminders();
    const remIdx = reminders.findIndex(r => r.id === id);
    if (remIdx === -1) return null;

    const reminder = reminders[remIdx];
    reminder.status = 'paid';
    reminder.updatedAt = nowISO();
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

  // ---- Budgets ----
  getBudgets() {
    return getOrSeed(KEYS.BUDGETS, DEFAULT_BUDGETS);
  },
  saveBudgets(budgets) {
    save(KEYS.BUDGETS, budgets);
  },
  addBudget(budget) {
    const budgets = this.getBudgets();
    const ts = nowISO();
    const newBudget = {
      ...budget,
      id: `budget_${Date.now()}`,
      limit: Number(budget.limit),
      createdAt: ts,
      updatedAt: ts,
    };
    budgets.push(newBudget);
    this.saveBudgets(budgets);
    return newBudget;
  },
  updateBudget(updatedBudget) {
    const budgets = this.getBudgets();
    const idx = budgets.findIndex(b => b.id === updatedBudget.id);
    if (idx !== -1) {
      budgets[idx] = {
        ...updatedBudget,
        limit: Number(updatedBudget.limit),
        updatedAt: nowISO(),
      };
      this.saveBudgets(budgets);
    }
  },
  deleteBudget(id) {
    const budgets = this.getBudgets();
    this.saveBudgets(budgets.filter(b => b.id !== id));
  },

  // ---- Savings Goals ----
  getSavingsGoals() {
    return getOrSeed(KEYS.SAVINGS_GOALS, DEFAULT_SAVINGS_GOALS);
  },
  saveSavingsGoals(goals) {
    save(KEYS.SAVINGS_GOALS, goals);
  },
  addSavingsGoal(goal) {
    const goals = this.getSavingsGoals();
    const ts = nowISO();
    const newGoal = {
      ...goal,
      id: `goal_${Date.now()}`,
      targetAmount: Number(goal.targetAmount),
      currentAmount: Number(goal.currentAmount || 0),
      createdAt: ts,
      updatedAt: ts,
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
        updatedAt: nowISO(),
      };
      this.saveSavingsGoals(goals);
    }
  },
  deleteSavingsGoal(id) {
    const goals = this.getSavingsGoals();
    this.saveSavingsGoals(goals.filter(g => g.id !== id));
  },
  contributeToSavingsGoal(goalId, amount, sourceAccountId) {
    const goals = this.getSavingsGoals();
    const goalIdx = goals.findIndex(g => g.id === goalId);
    if (goalIdx === -1) return null;

    const contributedAmount = Number(amount);
    if (contributedAmount <= 0) return null;

    // Update goal amount and timestamp
    goals[goalIdx].currentAmount += contributedAmount;
    goals[goalIdx].updatedAt = nowISO();
    this.saveSavingsGoals(goals);

    // Create a transaction (transfer from account to a virtual savings account)
    const newTx = {
      type: 'transfer',
      amount: contributedAmount,
      date: new Date().toISOString().split('T')[0],
      accountId: sourceAccountId,
      transferToId: `goal_${goalId}`,
      categoryId: '',
      notes: `Savings contribution: ${goals[goalIdx].name}`,
    };
    return this.addTransaction(newTx);
  },

  // ---- Security ----
  getSecuritySettings() {
    return getOrSeed(KEYS.SECURITY, DEFAULT_SECURITY);
  },
  saveSecuritySettings(settings) {
    save(KEYS.SECURITY, settings);
  },

  // ---- Auto-Backups ----
  getAutoBackups() {
    return getAutoBackups();
  },
  restoreFromAutoBackup(index) {
    return restoreFromAutoBackup(index);
  },
  clearAutoBackups() {
    clearAutoBackups();
  },
  getAutoBackupCount() {
    return getAutoBackupCount();
  },
  getLatestBackupTimestamp() {
    return getLatestBackupTimestamp();
  },
  resetAutoBackupDedup() {
    resetAutoBackupDedup();
  },
  getBudgetSpending(categoryId, month, year) {
    return getBudgetSpending(categoryId, month, year);
  },

  // ---- Recurring Transactions ----
  processRecurringTransactions() {
    return processRecurringTransactions();
  },

  // ---- Demo Data ----
  clearDemoData() {
    return clearDemoData();
  },

  // ---- Database Reset & Backups ----
  resetDatabase() {
    localStorage.removeItem(KEYS.ACCOUNTS);
    localStorage.removeItem(KEYS.CATEGORIES);
    localStorage.removeItem(KEYS.TRANSACTIONS);
    localStorage.removeItem(KEYS.REMINDERS);
    localStorage.removeItem(KEYS.SECURITY);
    localStorage.removeItem(KEYS.BUDGETS);
    localStorage.removeItem(KEYS.SAVINGS_GOALS);
    localStorage.removeItem(SCHEMA_VERSION_KEY);
    clearAutoBackups();
    // Re-run migration after reset to set version
    migrateSchema();
    return {
      accounts: this.getAccounts(),
      categories: this.getCategories(),
      transactions: this.getTransactions(),
      reminders: this.getReminders(),
      security: this.getSecuritySettings(),
      budgets: this.getBudgets(),
      savingsGoals: this.getSavingsGoals(),
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
      schemaVersion: CURRENT_SCHEMA_VERSION,
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
      // Reset version so migration runs on the freshly imported data
      // (save() → createAutoBackup() may have set the version key already)
      localStorage.removeItem(SCHEMA_VERSION_KEY);
      migrateSchema();
      return true;
    } catch (e) {
      trackError(e, { operation: 'import_database_json' });
      console.error('Error importing JSON database:', e);
      return false;
    }
  },
};
