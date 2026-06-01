// ==============================================================================
// APK Upgrade Integration Test
// ==============================================================================
// Simulates the full upgrade flow when a user installs a new APK over an
// existing one without uninstalling:
//
//   1. localStorage has OLD data from a previous app version (schema v7 + old
//      BUILD_VERSION + user accounts/transactions/categories/etc.)
//   2. The new app boots → reconcileBuildVersion() detects the version mismatch
//   3. Clears Cache API caches and unregisters stale service workers
//   4. Reloads with ?v=NEW_BUILD_VERSION (cache-busting URL)
//   5. After "reload", the app boots fresh → db module loads → migrateSchema()
//      upgrades old data from schema v7 → v8
//   6. All user data remains intact after the upgrade
//
// This verifies the ENTIRE upgrade chain end-to-end.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { reconcileBuildVersion } from '../reconcileBuildVersion.js';

const BUILD_VERSION_KEY = 'pocket_khata_build_version';
const SCHEMA_VERSION_KEY = 'pocket_khata_schema_version';

// ─── Simulated old user data (schema v7) ──────────────────────────────
// This represents real user data that would exist on device before an upgrade.

const OLD_SCHEMA_VERSION = '7';

const OLD_BUILD_VERSION = 'build-2026-05-15-oldhash';

const NEW_BUILD_VERSION = 'build-2026-06-01-newhash';

const OLD_ACCOUNTS = [
  {
    id: 'acc_user_cash', name: 'My Cash', type: 'Cash', balance: 25000,
    color: '#3cd070', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-05-14T00:00:00.000Z',
  },
  {
    id: 'acc_user_bank', name: 'DBBL Account', type: 'Bank', balance: 120000,
    color: '#4a90e2', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-05-14T00:00:00.000Z',
  },
];

const OLD_CATEGORIES = [
  // Default categories at v7 with LIMITED subcategories (pre-expansion)
  {
    id: 'cat_food', name: 'Food & Dining', type: 'expense', icon: 'Utensils', color: '#e17055',
    subcategories: ['Groceries', 'Restaurants', 'Fast Food', 'Café'],
    default: true, archived: false, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'cat_transport', name: 'Transport', type: 'expense', icon: 'Car', color: '#0984e3',
    subcategories: ['Fuel', 'Bus Fare', 'Ride Share'],
    default: true, archived: false, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'cat_utilities', name: 'Bills & Utilities', type: 'expense', icon: 'Lightbulb', color: '#74b9ff',
    subcategories: ['Electricity', 'Water', 'Gas', 'Internet'],
    default: true, archived: false, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'cat_medical', name: 'Health & Medical', type: 'expense', icon: 'HeartPulse', color: '#e74c3c',
    subcategories: ['Doctor Visit', 'Medicine', 'Hospital'],
    default: true, archived: false, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  },
  // Custom user-created category — must survive migration unchanged
  {
    id: 'cat_user_side_hustle', name: 'Side Hustle', type: 'income', icon: 'Briefcase', color: '#8e44ad',
    subcategories: ['Tutoring', 'Photography'],
    default: false, archived: false, createdAt: '2026-02-15T00:00:00.000Z', updatedAt: '2026-05-10T00:00:00.000Z',
  },
];

const OLD_TRANSACTIONS = [
  {
    id: 'tx_user_1', type: 'expense', amount: 3500,
    date: '2026-05-10', accountId: 'acc_user_cash', categoryId: 'cat_food',
    subcategory: 'Groceries', notes: 'Weekly groceries',
    recurring: false, createdAt: '2026-05-10T00:00:00.000Z', updatedAt: '2026-05-10T00:00:00.000Z',
  },
  {
    id: 'tx_user_2', type: 'income', amount: 75000,
    date: '2026-05-01', accountId: 'acc_user_bank', categoryId: 'cat_salary',
    subcategory: '', notes: 'May salary',
    recurring: false, createdAt: '2026-05-01T00:00:00.000Z', updatedAt: '2026-05-01T00:00:00.000Z',
  },
  // Transaction using the custom category — verifies custom categories referenced by data survive
  {
    id: 'tx_user_3', type: 'income', amount: 5000,
    date: '2026-05-05', accountId: 'acc_user_cash', categoryId: 'cat_user_side_hustle',
    subcategory: 'Tutoring', notes: 'Math tutoring',
    recurring: false, createdAt: '2026-05-05T00:00:00.000Z', updatedAt: '2026-05-05T00:00:00.000Z',
  },
];

const OLD_BUDGETS = [
  {
    id: 'budget_user_1', categoryId: 'cat_food', limit: 15000, month: 4, year: 2026,
    createdAt: '2026-04-01T00:00:00.000Z', updatedAt: '2026-04-01T00:00:00.000Z',
  },
];

const OLD_SAVINGS_GOALS = [
  {
    id: 'goal_user_1', name: 'New Laptop', targetAmount: 80000, currentAmount: 35000,
    color: '#6c5ce7', createdAt: '2026-03-01T00:00:00.000Z', updatedAt: '2026-05-10T00:00:00.000Z',
  },
];

const OLD_REMINDERS = [
  {
    id: 'rem_user_1', name: 'Electricity Bill', amount: 2500,
    dueDate: '2026-05-25', categoryId: 'cat_utilities', status: 'unpaid',
    createdAt: '2026-05-01T00:00:00.000Z', updatedAt: '2026-05-01T00:00:00.000Z',
  },
  {
    id: 'rem_user_2', name: 'Rent Payment', amount: 15000,
    dueDate: '2026-06-01', categoryId: 'cat_utilities', status: 'paid',
    createdAt: '2026-04-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z',
  },
];

// ==============================================================================
// Helpers
// ==============================================================================

/**
 * Seed localStorage with old data that simulates a device running schema v7.
 */
function seedOldData() {
  localStorage.setItem(SCHEMA_VERSION_KEY, OLD_SCHEMA_VERSION);
  localStorage.setItem(BUILD_VERSION_KEY, OLD_BUILD_VERSION);
  localStorage.setItem('pocket_khata_accounts', JSON.stringify(OLD_ACCOUNTS));
  localStorage.setItem('pocket_khata_categories', JSON.stringify(OLD_CATEGORIES));
  localStorage.setItem('pocket_khata_transactions', JSON.stringify(OLD_TRANSACTIONS));
  localStorage.setItem('pocket_khata_budgets', JSON.stringify(OLD_BUDGETS));
  localStorage.setItem('pocket_khata_savings_goals', JSON.stringify(OLD_SAVINGS_GOALS));
  localStorage.setItem('pocket_khata_reminders', JSON.stringify(OLD_REMINDERS));
}

/**
 * Parse a stored JSON array from localStorage.
 */
function getParsed(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

// ==============================================================================
// Tests
// ==============================================================================

describe('APK Upgrade — Integration', () => {
  let originalLocation;

  beforeEach(() => {
    localStorage.clear();
    originalLocation = window.location;

    // Mock window.location with writable href
    delete window.location;
    window.location = {
      href: 'http://localhost/index.html',
      pathname: '/index.html',
      origin: 'http://localhost',
    };

    // Mock Cache API
    window.caches = {
      keys: vi.fn().mockResolvedValue(['old-cache-v1', 'old-sw-cache']),
      delete: vi.fn().mockResolvedValue(true),
    };

    // Mock service worker
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        getRegistrations: vi.fn().mockResolvedValue([
          { unregister: vi.fn().mockResolvedValue(true) },
        ]),
      },
      configurable: true,
      writable: true,
    });

    // Reset Vite's module registry so each test gets a fresh db module
    vi.resetModules();
  });

  afterEach(() => {
    window.location = originalLocation;
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  // ── Step 1: Seed old data, then run version reconciliation ──────────

  it('full upgrade flow: detects version mismatch, clears caches, stores new version, triggers reload', async () => {
    seedOldData();

    // ── Act: simulate app boot — detect upgrade ──
    const result = reconcileBuildVersion(NEW_BUILD_VERSION);

    // ── Assert: version reconciliation ──
    expect(result).toBe('reload');

    // New build version is stored (BEFORE reload to prevent infinite loop)
    expect(localStorage.getItem(BUILD_VERSION_KEY)).toBe(NEW_BUILD_VERSION);

    // Old schema version is preserved (migration hasn't run yet — it runs on db access)
    expect(localStorage.getItem(SCHEMA_VERSION_KEY)).toBe(OLD_SCHEMA_VERSION);

    // Reload URL has cache-busting ?v= param
    expect(window.location.href).toBe('/index.html?v=' + NEW_BUILD_VERSION);

    // Flush microtask queue for the .then() callbacks
    await new Promise(resolve => setTimeout(resolve, 0));

    // Cache API was cleared
    expect(window.caches.keys).toHaveBeenCalledOnce();
    expect(window.caches.delete).toHaveBeenCalledWith('old-cache-v1');
    expect(window.caches.delete).toHaveBeenCalledWith('old-sw-cache');

    // Service workers were unregistered
    expect(navigator.serviceWorker.getRegistrations).toHaveBeenCalledOnce();
  });

  // ── Step 2: After reload, data still exists ────────────────────────

  it('preserves all user data in localStorage after version reconciliation', () => {
    seedOldData();
    reconcileBuildVersion(NEW_BUILD_VERSION);

    // All old data must still be in localStorage (version reconciliation
    // does NOT touch app data — only clears Cache API + SWs)
    expect(getParsed('pocket_khata_accounts')).toEqual(OLD_ACCOUNTS);
    expect(getParsed('pocket_khata_categories')).toEqual(OLD_CATEGORIES);
    expect(getParsed('pocket_khata_transactions')).toEqual(OLD_TRANSACTIONS);
    expect(getParsed('pocket_khata_budgets')).toEqual(OLD_BUDGETS);
    expect(getParsed('pocket_khata_savings_goals')).toEqual(OLD_SAVINGS_GOALS);
    expect(getParsed('pocket_khata_reminders')).toEqual(OLD_REMINDERS);

    // Build version was updated but schema version remains unchanged
    expect(localStorage.getItem(BUILD_VERSION_KEY)).toBe(NEW_BUILD_VERSION);
    expect(localStorage.getItem(SCHEMA_VERSION_KEY)).toBe(OLD_SCHEMA_VERSION);
  });

  // ── Step 3: Post-reload, schema migration upgrades data ────────────

  it('migrates schema from v7 to v8 after reload when db loads', async () => {
    seedOldData();
    reconcileBuildVersion(NEW_BUILD_VERSION);

    // Simulate page reload: vi.resetModules() clears Vite's module registry
    // so the next import() returns a fresh module instance. This causes
    // db.js to re-execute, running migrateSchema() on the old data.
    vi.resetModules();
    const { db: freshDb } = await import('../db.js');

    // ── Assert: schema upgraded to v8 ──
    expect(freshDb.getStoredSchemaVersion()).toBe(8);

    // ── Assert: user accounts intact ──
    const accounts = freshDb.getAccounts();
    const userAccounts = accounts.filter(a => !a.system);
    expect(userAccounts).toHaveLength(2);
    expect(userAccounts.find(a => a.id === 'acc_user_cash').balance).toBe(25000);
    expect(userAccounts.find(a => a.id === 'acc_user_bank').balance).toBe(120000);

    // ── Assert: user transactions intact ──
    const transactions = freshDb.getTransactions();
    expect(transactions).toHaveLength(3);
    expect(transactions.find(t => t.id === 'tx_user_1').notes).toBe('Weekly groceries');
    expect(transactions.find(t => t.id === 'tx_user_3').subcategory).toBe('Tutoring');

    // ── Assert: default categories expanded with v8 subcategories ──
    const categories = freshDb.getCategories();
    const foodCat = categories.find(c => c.id === 'cat_food');
    expect(foodCat.subcategories).toContain('Groceries');         // Was in v7
    expect(foodCat.subcategories).toContain('Restaurants');       // Was in v7
    expect(foodCat.subcategories).toContain('Cafe & Coffee');     // NEW in v8
    expect(foodCat.subcategories).toContain('Food Delivery');     // NEW in v8
    expect(foodCat.subcategories).toContain('Snacks & Beverages');// NEW in v8
    expect(foodCat.subcategories).toContain('Street Food');       // NEW in v8
    expect(foodCat.subcategories).toContain('Office Lunch');      // NEW in v8
    expect(foodCat.subcategories).toContain('Meal Prep');         // NEW in v8
    expect(foodCat.subcategories).toHaveLength(8);                // Full v8 list

    const transportCat = categories.find(c => c.id === 'cat_transport');
    expect(transportCat.subcategories).toContain('Fuel');         // Was in v7
    expect(transportCat.subcategories).toContain('Bus/Train Fare');   // Renamed from 'Bus Fare' in v8
    expect(transportCat.subcategories).toContain('Ride Share (Uber/Pathao)'); // NEW in v8
    expect(transportCat.subcategories).toContain('CNG/Rickshaw');     // NEW in v8
    expect(transportCat.subcategories).toContain('Car Maintenance');  // NEW in v8
    expect(transportCat.subcategories).toContain('Parking & Toll');   // NEW in v8
    expect(transportCat.subcategories).toContain('Vehicle Insurance');// NEW in v8
    expect(transportCat.subcategories).toContain('Bicycle');          // NEW in v8
    expect(transportCat.subcategories).toHaveLength(8);

    const medicalCat = categories.find(c => c.id === 'cat_medical');
    expect(medicalCat.subcategories).toContain('Doctor Visit');   // Was in v7
    expect(medicalCat.subcategories).toContain('Mental Health');  // NEW in v8
    expect(medicalCat.subcategories).toContain('Lab Tests');      // NEW in v8

    // ── Assert: custom category completely untouched ──
    const customCat = categories.find(c => c.id === 'cat_user_side_hustle');
    expect(customCat).toBeDefined();
    expect(customCat.name).toBe('Side Hustle');
    expect(customCat.type).toBe('income');
    expect(customCat.subcategories).toEqual(['Tutoring', 'Photography']);
    expect(customCat.default).toBe(false);
    expect(customCat.color).toBe('#8e44ad');

    // ── Assert: budgets intact ──
    const budgets = freshDb.getBudgets();
    expect(budgets).toHaveLength(1);
    expect(budgets[0].limit).toBe(15000);

    // ── Assert: savings goals intact ──
    const goals = freshDb.getSavingsGoals();
    expect(goals).toHaveLength(1);
    expect(goals[0].currentAmount).toBe(35000);

    // ── Assert: reminders intact ──
    const reminders = freshDb.getReminders();
    expect(reminders).toHaveLength(2);
    expect(reminders.find(r => r.id === 'rem_user_1').status).toBe('unpaid');
    expect(reminders.find(r => r.id === 'rem_user_2').status).toBe('paid');
  });

  // ── Step 4: Idempotency — re-running migration doesn't change data ──

  it('is idempotent — re-running getCategories after migration does not mutate data', async () => {
    seedOldData();
    reconcileBuildVersion(NEW_BUILD_VERSION);

    // Fresh db import to simulate post-reload boot
    vi.resetModules();
    const { db: freshDb } = await import('../db.js');

    // First call triggers migration
    const categories1 = freshDb.getCategories();

    // Second call — should not mutate anything
    const categories2 = freshDb.getCategories();

    expect(categories1).toEqual(categories2);
    expect(freshDb.getStoredSchemaVersion()).toBe(8);
  });

  // ── Step 5: Fresh install (no old data) — no upgrade scenario ─────

  it('fresh install: sets schema v8 directly when no old data exists', async () => {
    // No seed — clean localStorage
    reconcileBuildVersion(NEW_BUILD_VERSION);

    // Fresh install: first_boot
    expect(localStorage.getItem(BUILD_VERSION_KEY)).toBe(NEW_BUILD_VERSION);

    // Fresh db import — migrateSchema() runs on a clean slate
    vi.resetModules();
    const { db: freshDb } = await import('../db.js');

    // Schema should be at current version
    expect(freshDb.getStoredSchemaVersion()).toBe(8);

    // Default categories should have full v8 subcategories
    const categories = freshDb.getCategories();
    const foodCat = categories.find(c => c.id === 'cat_food');
    expect(foodCat.subcategories).toContain('Cafe & Coffee');
    expect(foodCat.subcategories).toContain('Food Delivery');
    expect(foodCat.subcategories.length).toBeGreaterThanOrEqual(8);
  });

  // ── Step 6: Version reconciliation returns correct statuses ───────

  it('returns correct status for each upgrade stage', () => {
    localStorage.clear();

    // First boot
    expect(reconcileBuildVersion(NEW_BUILD_VERSION)).toBe('first_boot');

    // Same version — no change
    expect(reconcileBuildVersion(NEW_BUILD_VERSION)).toBe('no_change');

    // Upgrade detected
    localStorage.setItem(BUILD_VERSION_KEY, 'build-2026-05-01-very-old');
    expect(reconcileBuildVersion('build-2026-06-15-even-newer')).toBe('reload');
  });

  // ── Step 7: SW cache-bypass verification ──────────────────────────

  it('generates ?v= URL that matches the SW cache-bypass guard (includes("?v=") check)', () => {
    seedOldData();

    reconcileBuildVersion(NEW_BUILD_VERSION);

    const generatedUrl = window.location.href;

    // ── SW guard check (mirrors public/sw.js line):
    //    if (event.request.url.includes('?v=')) {
    //        event.respondWith(fetch(event.request));
    //        return;
    //    }
    expect(generatedUrl.includes('?v=')).toBe(true);

    // ── Verify the FULL URL format — pathname + '?v=' + buildVersion
    // This ensures the SW sees a clean URL that won't match any old
    // cached entries (which lack the ?v= param).
    expect(generatedUrl).toBe('/index.html?v=' + NEW_BUILD_VERSION);

    // ── Confirm the SW's cache-first fallthrough:
    // After bypassing, the SW calls fetch(event.request). Since the
    // URL contains a unique ?v= param, it would never match a cached
    // entry even if the bypass guard weren't there — guaranteeing fresh
    // assets from the new APK.
    //
    // Simulate the SW's cache-match logic on this URL:
    //   caches.match(new Request(generatedUrl))
    // No cache entries exist for ?v= URLs because the old SW only cached
    // the clean-URL assets during install (lines in sw.js):
    //   - BASE_URL
    //   - BASE_URL + 'index.html'
    //   - BASE_URL + 'manifest.json'
    //   - ... (no ?v= param on any of these)
    // So caches.match() returns undefined, confirming fallthrough.
    // There must be exactly ONE '?' in the URL (the query separator).
    expect(generatedUrl.split('?')).toHaveLength(2);
  });

  it('simulates SW fetch handler: ?v= URL bypasses old cache entries and fetches fresh', () => {
    seedOldData();

    reconcileBuildVersion(NEW_BUILD_VERSION);

    const generatedUrl = window.location.href;

    // ── Simulate the SW's cache state after the old install ──────────
    // The old SW cached these URLs during install (see public/sw.js):
    const oldCachedUrls = [
      'http://localhost/',
      'http://localhost/index.html',
      'http://localhost/manifest.json',
      'http://localhost/vite.svg',
      'http://localhost/pwa-icon-192.svg',
      'http://localhost/pwa-icon-512.svg',
    ];

    // None of the old cache entries contain '?v=', so they can never
    // match the new generated URL. This proves the fallthrough path.
    const matchesOldCache = oldCachedUrls.some(url => generatedUrl === url);
    expect(matchesOldCache).toBe(false);

    // ── Verify the SW's cache-bypass guard would activate ────────────
    // The SW checks: event.request.url.includes('?v=')
    expect(generatedUrl.includes('?v=')).toBe(true);

    // Combined: the guard activates AND no old cache entry matches
    // → SW calls fetch(event.request) → fresh assets loaded from new APK
    expect(localStorage.getItem(BUILD_VERSION_KEY)).toBe(NEW_BUILD_VERSION);
  });
});
