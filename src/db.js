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
          // ... rest of patchArray function ...
        });
        if (changed) localStorage.setItem(key, JSON.stringify(items));
      } catch (e) {
        console.error('Error patching', key, e);
      }
    };

    // ---- v2 → v3: Add default accounts ----
    if (version < 3) {
      const SEED_ACCOUNTS = {
        accounts: [
          { id: 'acc_cash', name: 'Cash Ledger', balance: 0, type: 'cash' },
          { id: 'acc_bank', name: 'Bank Account', balance: 0, type: 'bank' },
          { id: 'acc_bkash', name: 'Bkash Wallet', balance: 0, type: 'bkash' },
          { id: 'acc_nagad', name: 'Nagad Wallet', balance: 0, type: 'nagad' },
        ],
      };

      const SEED_ACCOUNTS_KEY = 'accounts';
      const raw = localStorage.getItem(SEED_ACCOUNTS_KEY);
      if (raw) return;

      const accounts = SEED_ACCOUNTS.accounts;
      accounts.forEach(account => {
        const existing = getOrSeed(KEYS.ACCOUNTS, []).find(a => a.id === account.id);
        if (!existing) {
          save(KEYS.ACCOUNTS, [...getOrSeed(KEYS.ACCOUNTS, []), account]);
        }
      });
    }

    // ... rest of migrateSchema function ...
  }

  if (version < 4) {
    // ... rest of migrateSchema function ...
  }

  const ts = now;
  localStorage.setItem(SCHEMA_VERSION_KEY, CURRENT_SCHEMA_VERSION);
}
