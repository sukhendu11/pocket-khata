import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, ArrowUpRight, ArrowDownLeft, TrendingUp, Bell, Wallet, Target } from 'lucide-react';
import PropTypes from 'prop-types';
import { formatNumber } from '../utils';

/**
 * Global search overlay that searches across transactions, accounts, categories, reminders, budgets, and savings goals.
 */
export default function GlobalSearch({
  isOpen,
  onClose,
  transactions,
  accounts,
  categories,
  reminders,
  budgets,
  savingsGoals,
  onEditTransaction,
  onNavigate,
  lang,
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
    }
  }, [isOpen]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    const hits = [];

    // Search transactions
    transactions.forEach(tx => {
      const cat = categories.find(c => c.id === tx.categoryId);
      const acc = accounts.find(a => a.id === tx.accountId);
      const notesMatch = tx.notes?.toLowerCase().includes(q);
      const catMatch = cat?.name?.toLowerCase().includes(q);
      const accMatch = acc?.name?.toLowerCase().includes(q);
      if (notesMatch || catMatch || accMatch) {
        hits.push({
          id: `tx-${tx.id}`,
          type: 'transaction',
          label: tx.notes || 'Transaction',
          sublabel: `${cat?.name || 'Uncategorized'} • ${acc?.name || 'Local'}`,
          amount: tx.type === 'income' ? `+৳${formatNumber(tx.amount, lang)}` : tx.type === 'expense' ? `-৳${formatNumber(tx.amount, lang)}` : `⇄৳${formatNumber(tx.amount, lang)}`,
          icon: tx.type === 'income' ? <ArrowUpRight size={14} /> : tx.type === 'expense' ? <ArrowDownLeft size={14} /> : <TrendingUp size={14} />,
          color: tx.type === 'income' ? 'var(--color-income)' : tx.type === 'expense' ? 'var(--color-expense)' : 'var(--color-transfer)',
          onClick: () => { onEditTransaction(tx); onClose(); },
        });
      }
    });

    // Search accounts
    accounts.forEach(acc => {
      if (acc.name.toLowerCase().includes(q) || acc.type.toLowerCase().includes(q)) {
        hits.push({
          id: `acc-${acc.id}`,
          type: 'account',
          label: acc.name,
          sublabel: `${acc.type} • ৳${formatNumber(acc.balance, lang)}`,
          amount: '',
          icon: <Wallet size={14} />,
          color: acc.color,
          onClick: () => { onNavigate('accounts'); onClose(); },
        });
      }
    });

    // Search categories
    categories.forEach(cat => {
      if (cat.name.toLowerCase().includes(q)) {
        hits.push({
          id: `cat-${cat.id}`,
          type: 'category',
          label: cat.name,
          sublabel: `${cat.type === 'income' ? 'Income' : 'Expense'} category`,
          amount: '',
          icon: <Target size={14} />,
          color: cat.color,
          onClick: () => { onNavigate('categories'); onClose(); },
        });
      }
    });

    // Search reminders
    reminders.forEach(rem => {
      if (rem.name.toLowerCase().includes(q)) {
        hits.push({
          id: `rem-${rem.id}`,
          type: 'reminder',
          label: rem.name,
          sublabel: `Due: ${rem.dueDate} • ${rem.status}`,
          amount: `৳${formatNumber(rem.amount, lang)}`,
          icon: <Bell size={14} />,
          color: rem.status === 'unpaid' ? 'var(--color-expense)' : 'var(--color-income)',
          onClick: () => { onNavigate('reminders'); onClose(); },
        });
      }
    });

    // Search budgets
    (budgets || []).forEach(b => {
      const cat = categories.find(c => c.id === b.categoryId);
      if (cat?.name?.toLowerCase().includes(q)) {
        hits.push({
          id: `budget-${b.id}`,
          type: 'budget',
          label: `Budget: ${cat.name}`,
          sublabel: `Limit: ৳${formatNumber(b.limit, lang)}`,
          amount: '',
          icon: <Target size={14} />,
          color: cat.color || 'var(--accent-color)',
          onClick: () => { onNavigate('budgets'); onClose(); },
        });
      }
    });

    // Search savings goals
    (savingsGoals || []).forEach(g => {
      if (g.name.toLowerCase().includes(q)) {
        hits.push({
          id: `goal-${g.id}`,
          type: 'savings',
          label: g.name,
          sublabel: `৳${formatNumber(g.currentAmount, lang)} / ৳${formatNumber(g.targetAmount, lang)}`,
          amount: '',
          icon: <TrendingUp size={14} />,
          color: g.color || 'var(--color-income)',
          onClick: () => { onNavigate('savings'); onClose(); },
        });
      }
    });

    return hits.slice(0, 20);
  }, [query, transactions, accounts, categories, reminders, budgets, savingsGoals, lang, onEditTransaction, onClose, onNavigate]);

  if (!isOpen) return null;

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div style={styles.overlay}>
        {/* Search Bar */}
        <div style={styles.searchBar}>
          <Search size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search transactions, accounts, categories, reminders..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={styles.searchInput}
            autoFocus
          />
          {query && (
            <button style={styles.clearBtn} onClick={() => setQuery('')}>
              <X size={16} />
            </button>
          )}
          <button className="neo-btn neo-btn-round" style={styles.closeBtn} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div style={styles.resultsContainer}>
          {results.length === 0 && query.trim() ? (
            <div style={styles.noResults}>
              <Search size={28} style={{ color: 'var(--text-secondary)', opacity: 0.4 }} />
              <p style={styles.noResultsText}>No results found for &ldquo;{query}&rdquo;</p>
            </div>
          ) : (
            results.map((r) => (
              <div key={r.id} className="neo-raised-sm" style={styles.resultItem} onClick={r.onClick}>
                <div style={{ ...styles.resultIcon, color: r.color, backgroundColor: `${r.color}22` }}>
                  {r.icon}
                </div>
                <div style={styles.resultInfo}>
                  <span style={styles.resultLabel}>{r.label}</span>
                  <span style={styles.resultSub}>{r.sublabel}</span>
                </div>
                {r.amount && <span style={{ ...styles.resultAmount, color: r.color }}>{r.amount}</span>}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

GlobalSearch.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
  transactions: PropTypes.array,
  accounts: PropTypes.array,
  categories: PropTypes.array,
  reminders: PropTypes.array,
  budgets: PropTypes.array,
  savingsGoals: PropTypes.array,
  onEditTransaction: PropTypes.func,
  onNavigate: PropTypes.func,
  lang: PropTypes.string,
};

const styles = {
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'var(--bg-color)',
    zIndex: 98,
    display: 'flex',
    flexDirection: 'column',
    animation: 'fadeIn 0.2s ease',
    padding: '16px 20px',
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '16px',
    marginTop: '8px',
  },
  searchInput: {
    flex: 1,
    background: 'none',
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--text-primary)',
    fontFamily: 'inherit',
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: '4px',
  },
  closeBtn: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    padding: 0,
  },
  resultsContainer: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    paddingRight: '4px',
  },
  noResults: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: '60px',
  },
  noResultsText: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    fontWeight: '500',
    marginTop: '12px',
  },
  resultItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  resultIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  resultInfo: {
    flex: 1,
    minWidth: 0,
  },
  resultLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    display: 'block',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  resultSub: {
    fontSize: '10px',
    color: 'var(--text-secondary)',
    fontWeight: '500',
    display: 'block',
    marginTop: '1px',
  },
  resultAmount: {
    fontSize: '12px',
    fontWeight: '700',
    flexShrink: 0,
  },
};
