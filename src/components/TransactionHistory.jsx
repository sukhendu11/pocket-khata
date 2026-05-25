import { useState, useMemo, useEffect } from 'react';
import { 
  ArrowLeft, Search, SlidersHorizontal, X, Eye
} from 'lucide-react';
import PropTypes from 'prop-types';
import { t } from '../i18n';
import { formatNumber } from '../utils';
import TransactionItem from './TransactionItem';

export default function TransactionHistory({
  transactions,
  accounts,
  categories,
  onNavigate,
  onEditTransaction,
  lang,
  filterType
}) {
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState(filterType || 'all'); // 'all', 'income', 'expense', 'transfer'

  // Sync external filterType prop (always reset typeFilter when prop changes)
  useEffect(() => {
    setTypeFilter(filterType || 'all');
  }, [filterType]);
  const [accountFilter, setAccountFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 1. Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // Search text match
      const notesMatch = tx.notes?.toLowerCase().includes(search.toLowerCase());
      const cat = categories.find(c => c.id === tx.categoryId);
      const catNameMatch = cat?.name?.toLowerCase().includes(search.toLowerCase());
      const searchMatch = !search || notesMatch || catNameMatch;

      // Type match
      const typeMatch = typeFilter === 'all' || tx.type === typeFilter;

      // Account match
      const accountMatch = accountFilter === 'all' || 
        tx.accountId === accountFilter || 
        (tx.type === 'transfer' && tx.transferToId === accountFilter);

      // Category match
      const categoryMatch = categoryFilter === 'all' || tx.categoryId === categoryFilter;

      // Date match
      let dateMatch = true;
      if (startDate) {
        dateMatch = dateMatch && tx.date >= startDate;
      }
      if (endDate) {
        dateMatch = dateMatch && tx.date <= endDate;
      }

      return searchMatch && typeMatch && accountMatch && categoryMatch && dateMatch;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, categories, search, typeFilter, accountFilter, categoryFilter, startDate, endDate]);

  // 2. Calculations: Filtered Aggregate Totals
  const summaryTotals = useMemo(() => {
    let income = 0;
    let expense = 0;
    
    filteredTransactions.forEach(tx => {
      if (tx.type === 'income') {
        income += tx.amount;
      } else if (tx.type === 'expense') {
        expense += tx.amount;
      }
    });

    return { income, expense, net: income - expense };
  }, [filteredTransactions]);

  // 3. Group by date
  const groupedTransactions = useMemo(() => {
    const groups = {};
    filteredTransactions.forEach(tx => {
      const dateStr = tx.date;
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(tx);
    });
    return groups;
  }, [filteredTransactions]);

  const formatDateHeader = (dateStr) => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0];

    if (dateStr === today) return t('today', lang);
    if (dateStr === yesterday) return t('yesterday', lang);

    const d = new Date(dateStr);
    const locale = lang === 'bn' ? 'bn-BD' : 'en-US';
    return d.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const clearFilters = () => {
    setTypeFilter('all');
    setAccountFilter('all');
    setCategoryFilter('all');
    setStartDate('');
    setEndDate('');
    setSearch('');
  };

  return (
    <div style={styles.container}>
      
      {/* Header Bar */}
      <div style={styles.header}>
        <button className="neo-btn neo-btn-round" style={styles.backBtn} onClick={() => onNavigate('dashboard')}>
          <ArrowLeft size={18} />
        </button>
        <h2 style={styles.title}>{t('txHistory.title', lang)}</h2>
        <button 
          className="neo-btn neo-btn-round" 
          style={{ 
            ...styles.filterBtn, 
            boxShadow: showFilters ? 'var(--neomorphic-pressed-sm)' : 'var(--neomorphic-raised-sm)',
            borderColor: showFilters ? 'var(--accent-color)' : 'rgba(255,255,255,0.4)',
          }}
          onClick={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal size={18} style={{ color: showFilters ? 'var(--accent-color)' : 'var(--text-primary)' }} />
        </button>
      </div>

      {/* Segmented control: All | Income | Expense */}
      <div className="neo-pressed-sm" style={styles.segmentContainer}>
        {[
          { value: 'all', label: t('txHistory.allTransactions', lang) },
          { value: 'income', label: t('income', lang) },
          { value: 'expense', label: t('expense', lang) },
        ].map(seg => {
          const isActive = typeFilter === seg.value;
          return (
            <button
              key={seg.value}
              onClick={() => setTypeFilter(seg.value)}
              style={{
                ...styles.segmentBtn,
                boxShadow: isActive ? 'var(--neomorphic-raised-sm)' : 'none',
                backgroundColor: isActive ? 'var(--bg-color)' : 'transparent',
                borderColor: isActive ? 'rgba(255,255,255,0.4)' : 'transparent',
                color: isActive 
                  ? seg.value === 'income' 
                    ? 'var(--color-income)' 
                    : seg.value === 'expense' 
                      ? 'var(--color-expense)' 
                      : 'var(--accent-color)'
                  : 'var(--text-secondary)',
                fontWeight: isActive ? '700' : '500',
              }}
            >
              {seg.label}
            </button>
          );
        })}
      </div>

      {/* Search Input Inset */}
      <div style={styles.searchWrapper}>
        <Search size={16} style={styles.searchIcon} />
        <input
          type="text"
          placeholder={t('txHistory.searchPlaceholder', lang)}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="neo-input"
          style={styles.searchInput}
        />
        {search && (
          <button style={styles.clearSearchBtn} onClick={() => setSearch('')}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Expandable Filter Panel */}
      {showFilters && (
        <div className="neo-pressed-sm" style={styles.filterPanel}>
          <div style={styles.filterGrid}>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>{t('txHistory.type', lang)}</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="neo-input"
                style={styles.filterSelect}
              >
                <option value="all">{t('txHistory.allTransactions', lang)}</option>
                <option value="income">{t('txHistory.incomes', lang)}</option>
                <option value="expense">{t('txHistory.expenses', lang)}</option>
                <option value="transfer">{t('txHistory.transfers', lang)}</option>
              </select>
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>{t('txHistory.accountFilter', lang)}</label>
              <select
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
                className="neo-input"
                style={styles.filterSelect}
              >
                <option value="all">{t('txHistory.allAccounts', lang)}</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>

            {typeFilter !== 'transfer' && (
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>{t('txHistory.categoryFilter', lang)}</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="neo-input"
                  style={styles.filterSelect}
                >
                  <option value="all">{t('txHistory.allCategories', lang)}</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({t(cat.type === 'income' ? 'income' : 'expense', lang).toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>{t('txHistory.startDate', lang)}</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="neo-input"
                style={styles.filterSelect}
              />
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>{t('txHistory.endDate', lang)}</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="neo-input"
                style={styles.filterSelect}
              />
            </div>
          </div>
          
          <button className="neo-btn" style={styles.clearFiltersBtn} onClick={clearFilters}>
            {t('txHistory.resetFilters', lang)}
          </button>
        </div>
      )}

      {/* Aggregate Statistics Header */}
      <div className="neo-raised-sm" style={styles.statsBar}>
        <div style={styles.statCol}>
          <span style={styles.statLabel}>{t('txHistory.filteredIn', lang)}</span>
          <p style={{ ...styles.statVal, color: 'var(--color-income)' }}>
            ৳{formatNumber(summaryTotals.income, lang)}
          </p>
        </div>
        <div style={styles.statDivider} />
        <div style={styles.statCol}>
          <span style={styles.statLabel}>{t('txHistory.filteredOut', lang)}</span>
          <p style={{ ...styles.statVal, color: 'var(--color-expense)' }}>
            ৳{formatNumber(summaryTotals.expense, lang)}
          </p>
        </div>
        <div style={styles.statDivider} />
        <div style={styles.statCol}>
          <span style={styles.statLabel}>{t('txHistory.netChange', lang)}</span>
          <p style={{ 
            ...styles.statVal, 
            color: summaryTotals.net >= 0 ? 'var(--color-income)' : 'var(--color-expense)' 
          }}>
            ৳{formatNumber(summaryTotals.net, lang)}
          </p>
        </div>
      </div>

      {/* Date-grouped Transactions list */}
      <div style={styles.listContainer}>
        {Object.keys(groupedTransactions).length === 0 ? (
          <div className="neo-pressed-sm" style={styles.emptyState}>
            <Eye size={28} style={{ color: 'var(--text-secondary)', opacity: 0.5, marginBottom: '8px' }} />
            <p>{t('txHistory.noMatching', lang)}</p>
            <p style={{ fontSize: '11px', marginTop: '4px', opacity: 0.7 }}>{t('txHistory.tryWidening', lang)}</p>
          </div>
        ) : (
          Object.keys(groupedTransactions).map(dateStr => (
            <div key={dateStr} style={styles.dateGroup}>
              <h4 style={styles.dateHeader}>{formatDateHeader(dateStr)}</h4>
              <div style={styles.groupItems}>
                {groupedTransactions[dateStr].map(tx => {
                  const cat = categories.find(c => c.id === tx.categoryId);
                  const acc = accounts.find(a => a.id === tx.accountId);
                  const toAcc = tx.type === 'transfer' ? accounts.find(a => a.id === tx.transferToId) : null;

                  return (
                    <TransactionItem
                      key={tx.id}
                      transaction={tx}
                      account={acc}
                      category={cat}
                      toAccount={toAcc}
                      onClick={() => onEditTransaction(tx)}
                      showEdit={true}
                      showDate={false}
                      variant="default"
                      lang={lang}
                    />
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}

TransactionHistory.propTypes = {
  transactions: PropTypes.array,
  accounts: PropTypes.array,
  categories: PropTypes.array,
  onNavigate: PropTypes.func,
  onEditTransaction: PropTypes.func,
  lang: PropTypes.string,
  filterType: PropTypes.string,
};

TransactionHistory.defaultProps = {
  transactions: [],
  accounts: [],
  categories: [],
  onNavigate: () => {},
  onEditTransaction: () => {},
  lang: 'en',
  filterType: 'all',
};

const styles = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    height: '100%',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  backBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    padding: 0,
  },
  filterBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    padding: 0,
  },
  title: {
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  segmentContainer: {
    display: 'flex',
    padding: '4px',
    borderRadius: '16px',
    marginBottom: '12px',
    backgroundColor: 'var(--bg-color)',
  },
  segmentBtn: {
    flex: 1,
    padding: '8px 0',
    fontSize: '11px',
    borderRadius: '12px',
    backgroundColor: 'transparent',
    border: '1px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  searchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    marginBottom: '16px',
  },
  searchIcon: {
    position: 'absolute',
    left: '16px',
    color: 'var(--text-secondary)',
    opacity: 0.8,
  },
  searchInput: {
    paddingLeft: '40px',
    paddingRight: '36px',
    height: '42px',
  },
  clearSearchBtn: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  filterPanel: {
    padding: '14px',
    borderRadius: '16px',
    marginBottom: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  filterLabel: {
    fontSize: '8px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    letterSpacing: '0.6px',
  },
  filterSelect: {
    height: '36px',
    padding: '4px 10px',
    fontSize: '12px',
    borderRadius: '10px',
  },
  clearFiltersBtn: {
    width: '100%',
    padding: '8px 0',
    fontSize: '11px',
    fontWeight: '700',
    border: '1px solid var(--color-expense)',
    color: 'var(--color-expense)',
    borderRadius: '10px',
  },
  statsBar: {
    display: 'flex',
    justifyContent: 'space-around',
    padding: '12px',
    marginBottom: '16px',
    textAlign: 'center',
  },
  statCol: {
    flex: 1,
  },
  statLabel: {
    fontSize: '9px',
    color: 'var(--text-secondary)',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statVal: {
    fontSize: '13px',
    fontWeight: '700',
    marginTop: '2px',
  },
  statDivider: {
    width: '1px',
    backgroundColor: 'var(--text-secondary)',
    opacity: 0.15,
  },
  listContainer: {
    flex: 1,
    overflowY: 'auto',
    paddingRight: '2px',
  },
  emptyState: {
    padding: '40px 20px',
    textAlign: 'center',
    fontSize: '13px',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  dateGroup: {
    marginBottom: '20px',
  },
  dateHeader: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    marginBottom: '8px',
    paddingLeft: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  groupItems: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
};