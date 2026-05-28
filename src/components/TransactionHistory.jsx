import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  ArrowLeft, Search, SlidersHorizontal, X, Eye,
  CheckSquare, Square, Trash2, Tag
} from 'lucide-react';
import PropTypes from 'prop-types';
import { useVirtualizer } from '@tanstack/react-virtual';
import { t } from '../i18n';
import { formatNumber } from '../utils';
import { trackAction } from '../lib/analytics';
import TransactionItem from './TransactionItem';

export default function TransactionHistory({
  transactions,
  accounts,
  categories,
  onNavigate,
  onEditTransaction,
  lang,
  filterType,
  onBatchDelete,
  onBatchCategorize,
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

  // Batch select state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Enter select mode (exit edit mode first)
  const handleToggleSelectMode = () => {
    if (selectMode) {
      setSelectMode(false);
      setSelectedIds(new Set());
      setShowCategoryPicker(false);
      setShowDeleteConfirm(false);
    } else {
      setSelectMode(true);
      trackAction('toggle_select_mode', { enabled: true });
    }
  };

  const toggleSelection = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // isAllSelected and selectAll/clearSelection are defined after filteredTransactions useMemo
  // to avoid temporal dead zone issues. They are referenced only from JSX below.

  // Batch delete
  const handleBatchDeleteConfirm = () => {
    if (onBatchDelete && selectedIds.size > 0) {
      onBatchDelete([...selectedIds]);
      setSelectedIds(new Set());
      setSelectMode(false);
      setShowDeleteConfirm(false);
    }
  };

  // Batch categorize
  const handleBatchCategorize = (categoryId) => {
    if (onBatchCategorize && selectedIds.size > 0) {
      onBatchCategorize([...selectedIds], categoryId);
      setSelectedIds(new Set());
      setSelectMode(false);
      setShowCategoryPicker(false);
    }
  };

  // Track search queries via useEffect (side effects do not belong in useMemo)
  useEffect(() => {
    const q = search.trim();
    if (q.length >= 3) {
      trackAction('search_transactions', { queryLength: q.length });
    }
  }, [search]);

  // 1. Filter transactions
  const filteredTransactions = useMemo(() => {
    const q = search.toLowerCase().trim();
    return transactions.filter(tx => {
      // Search text match — full-text across notes, category, amount, accounts, and type
      let searchMatch = true;
      if (q) {
        const notesMatch = tx.notes?.toLowerCase().includes(q);
        const cat = categories.find(c => c.id === tx.categoryId);
        const catNameMatch = cat?.name?.toLowerCase().includes(q);
        const amountStr = String(tx.amount);
        const amountMatch = amountStr.includes(q) || (q.includes('৳') && amountStr.includes(q.replace('৳', '').trim()));
        const fromAcc = accounts.find(a => a.id === tx.accountId);
        const fromAccMatch = fromAcc?.name?.toLowerCase().includes(q);
        const toAcc = tx.type === 'transfer' ? accounts.find(a => a.id === tx.transferToId) : null;
        const toAccMatch = toAcc?.name?.toLowerCase().includes(q);
        searchMatch = notesMatch || catNameMatch || amountMatch || fromAccMatch || toAccMatch;
      }

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
  }, [transactions, categories, accounts, search, typeFilter, accountFilter, categoryFilter, startDate, endDate]);

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

  // 4. Flatten grouped transactions into a row array for the virtualizer
  // Each date group becomes a header row followed by its transaction rows
  const flatItems = useMemo(() => {
    const items = [];
    for (const dateStr of Object.keys(groupedTransactions)) {
      items.push({ type: 'header', date: dateStr, key: `hdr-${dateStr}` });
      const group = groupedTransactions[dateStr];
      for (const tx of group) {
        const cat = categories.find(c => c.id === tx.categoryId);
        const acc = accounts.find(a => a.id === tx.accountId);
        const toAcc = tx.type === 'transfer' ? accounts.find(a => a.id === tx.transferToId) : null;
        items.push({ type: 'transaction', tx, cat, acc, toAcc, key: tx.id });
      }
    }
    return items;
  }, [groupedTransactions, categories, accounts]);

  const formatDateHeader = (dateStr) => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0];

    if (dateStr === today) return t('today', lang);
    if (dateStr === yesterday) return t('yesterday', lang);

    const d = new Date(dateStr);
    const locale = lang === 'bn' ? 'bn-BD' : 'en-US';
    return d.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  // 5. Virtual scrolling setup
  const parentRef = useRef(null);

  const estimateSize = useCallback((index) => {
    const item = flatItems[index];
    // Header rows are compact; transaction rows have padding + content
    return item?.type === 'header' ? 36 : 58;
  }, [flatItems]);

  const rowVirtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan: 15,
    // Provide a fallback viewport height for environments where
    // getBoundingClientRect() / ResizeObserver aren't available (e.g. jsdom tests).
    // Browser ResizeObserver will override this on first measurement.
    initialRect: { width: 400, height: 600 },
  });

  const clearFilters = () => {
    setTypeFilter('all');
    setAccountFilter('all');
    setCategoryFilter('all');
    setStartDate('');
    setEndDate('');
    setSearch('');
  };

  // Computed after filteredTransactions is available
  const isAllSelected = filteredTransactions.length > 0 && 
    filteredTransactions.every(tx => selectedIds.has(tx.id));

  const selectAll = () => {
    const allIds = new Set(filteredTransactions.map(tx => tx.id));
    setSelectedIds(allIds);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  return (
    <div style={styles.container}>
      
      {/* Header Bar */}
      <div style={styles.header}>
        <button className="neo-btn neo-btn-round" style={styles.backBtn} onClick={() => onNavigate('dashboard')}>
          <ArrowLeft size={18} />
        </button>
        <h2 style={styles.title}>{t('txHistory.title', lang)}</h2>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button 
            className="neo-btn neo-btn-round" 
            style={{ 
              ...styles.filterBtn, 
              boxShadow: selectMode ? 'var(--neomorphic-pressed-sm)' : 'var(--neomorphic-raised-sm)',
              borderColor: selectMode ? 'var(--accent-color)' : 'rgba(255,255,255,0.4)',
            }}
            onClick={handleToggleSelectMode}
            title={t('txHistory.select', lang)}
          >
            {selectMode 
              ? <X size={16} style={{ color: 'var(--accent-color)' }} />
              : <CheckSquare size={16} style={{ color: 'var(--text-primary)' }} />
            }
          </button>
          <button 
            className="neo-btn neo-btn-round" 
            style={{ 
              ...styles.filterBtn, 
              boxShadow: showFilters ? 'var(--neomorphic-pressed-sm)' : 'var(--neomorphic-raised-sm)',
              borderColor: showFilters ? 'var(--accent-color)' : 'rgba(255,255,255,0.4)',
            }}                  onClick={() => { setShowFilters(!showFilters); trackAction('toggle_filters', { shown: !showFilters }); }}
          >
            <SlidersHorizontal size={18} style={{ color: showFilters ? 'var(--accent-color)' : 'var(--text-primary)' }} />
          </button>
        </div>
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

      {/* Select Mode Banner (appears when select mode is active) */}
      {selectMode && (
        <div className="neo-pressed-sm" style={styles.selectBanner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div
              onClick={() => isAllSelected ? clearSelection() : selectAll()}
              style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'var(--accent-color)' }}
            >
              {isAllSelected ? <CheckSquare size={16} /> : <Square size={16} />}
            </div>
            <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-primary)' }}>
              {selectedIds.size > 0
                ? `${selectedIds.size} ${t('txHistory.selected', lang)}`
                : t('txHistory.selectPrompt', lang)
              }
            </span>
          </div>
          <button
            className="neo-btn"
            style={styles.cancelSelectBtn}
            onClick={handleToggleSelectMode}
          >
            {t('txHistory.cancelSelection', lang)}
          </button>
        </div>
      )}

      {/* Virtual-scrolled Transactions list */}
      <div ref={parentRef} style={{ ...styles.listContainer, overflowY: 'auto' }}>
        {flatItems.length === 0 ? (
          <div className="neo-pressed-sm" style={styles.emptyState}>
            <Eye size={28} style={{ color: 'var(--text-secondary)', opacity: 0.5, marginBottom: '8px' }} />
            <p>{t('txHistory.noMatching', lang)}</p>
            <p style={{ fontSize: '11px', marginTop: '4px', opacity: 0.7 }}>{t('txHistory.tryWidening', lang)}</p>
          </div>
        ) : (
          <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
            {rowVirtualizer.getVirtualItems().map(virtualRow => {
              const item = flatItems[virtualRow.index];
              if (item?.type === 'header') {
                return (
                  <div
                    key={item.key}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                      ...styles.dateHeader,
                      display: 'flex',
                      alignItems: 'flex-end',
                      paddingLeft: '4px',
                    }}
                  >
                    {formatDateHeader(item.date)}
                  </div>
                );
              }
              return (
                <div
                  key={item?.key || virtualRow.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <TransactionItem
                    transaction={item.tx}
                    account={item.acc}
                    category={item.cat}
                    toAccount={item.toAcc}
                    onClick={selectMode ? undefined : () => onEditTransaction(item.tx)}
                    showEdit={!selectMode}
                    showDate={false}
                    variant="default"
                    lang={lang}
                    selectable={selectMode}
                    selected={selectedIds.has(item.tx.id)}
                    onSelect={() => toggleSelection(item.tx.id)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Batch Actions Toolbar (appears when items are selected) */}
      {selectMode && selectedIds.size > 0 && (
        <div className="neo-raised-sm" style={styles.batchToolbar}>
          <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
            {selectedIds.size} {t('txHistory.selected', lang)}
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className="neo-btn"
              style={styles.batchCatBtn}
              onClick={() => setShowCategoryPicker(true)}
            >
              <Tag size={14} />
              <span>{t('txHistory.batchCategorize', lang)}</span>
            </button>
            <button
              className="neo-btn"
              style={styles.batchDelBtn}
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 size={14} />
              <span>{t('txHistory.batchDelete', lang)}</span>
            </button>
          </div>
        </div>
      )}

      {/* Category Picker Overlay for Batch Categorize */}
      {showCategoryPicker && (
        <div style={styles.overlay} onClick={() => setShowCategoryPicker(false)}>
          <div
            className="neo-raised-sm"
            style={styles.pickerDialog}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>
              {t('txHistory.batchCategorize', lang)}
            </h3>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
              {selectedIds.size} {t('txHistory.selectedTransactions', lang)}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  className="neo-btn"
                  style={{
                    ...styles.categoryOpt,
                    borderLeft: `3px solid ${cat.color || 'var(--accent-color)'}`,
                  }}
                  onClick={() => handleBatchCategorize(cat.id)}
                >
                  <span style={{ fontSize: '11px', fontWeight: '600' }}>{cat.name}</span>
                  <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>
                    {t(cat.type === 'income' ? 'income' : 'expense', lang)}
                  </span>
                </button>
              ))}
            </div>
            <button
              className="neo-btn"
              style={styles.pickerCancelBtn}
              onClick={() => setShowCategoryPicker(false)}
            >
              {t('cancel', lang)}
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div style={styles.overlay} onClick={() => setShowDeleteConfirm(false)}>
          <div
            className="neo-raised-sm"
            style={styles.confirmDialog}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-expense)', marginBottom: '8px' }}>
              {t('txHistory.deleteConfirmTitle', lang)}
            </h3>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              {selectedIds.size} {t('txHistory.deleteConfirmMsg', lang)}
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                className="neo-btn"
                style={styles.confirmCancelBtn}
                onClick={() => setShowDeleteConfirm(false)}
              >
                {t('cancel', lang)}
              </button>
              <button
                className="neo-btn"
                style={styles.confirmDelBtn}
                onClick={handleBatchDeleteConfirm}
              >
                {t('txHistory.deleteAction', lang)}
              </button>
            </div>
          </div>
        </div>
      )}

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
  onBatchDelete: PropTypes.func,
  onBatchCategorize: PropTypes.func,
};

TransactionHistory.defaultProps = {
  transactions: [],
  accounts: [],
  categories: [],
  onNavigate: () => {},
  onEditTransaction: () => {},
  lang: 'en',
  filterType: 'all',
  onBatchDelete: () => {},
  onBatchCategorize: () => {},
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
  dateHeader: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    marginBottom: '8px',
    paddingLeft: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  // --- Batch select styles ---
  selectBanner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    borderRadius: '12px',
    marginBottom: '8px',
    backgroundColor: 'color-mix(in srgb, var(--accent-color) 8%, transparent)',
  },
  cancelSelectBtn: {
    fontSize: '10px',
    fontWeight: '600',
    padding: '4px 10px',
    borderRadius: '8px',
    color: 'var(--text-secondary)',
    backgroundColor: 'transparent',
    border: '1px solid var(--text-secondary)',
  },
  batchToolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    borderRadius: '14px',
    marginTop: '8px',
    gap: '8px',
  },
  batchCatBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '10px',
    fontWeight: '700',
    padding: '6px 10px',
    borderRadius: '8px',
    color: 'var(--accent-color)',
    backgroundColor: 'color-mix(in srgb, var(--accent-color) 12%, transparent)',
    border: '1px solid var(--accent-color)',
    whiteSpace: 'nowrap',
  },
  batchDelBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '10px',
    fontWeight: '700',
    padding: '6px 10px',
    borderRadius: '8px',
    color: 'var(--color-expense)',
    backgroundColor: 'color-mix(in srgb, var(--color-expense) 12%, transparent)',
    border: '1px solid var(--color-expense)',
    whiteSpace: 'nowrap',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 300,
  },
  pickerDialog: {
    backgroundColor: 'var(--bg-color)',
    borderRadius: '16px',
    padding: '20px',
    width: '280px',
    maxWidth: '90%',
    maxHeight: '80%',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  categoryOpt: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '11px',
    fontWeight: '600',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    textAlign: 'left',
    border: 'none',
  },
  pickerCancelBtn: {
    width: '100%',
    padding: '8px 0',
    fontSize: '11px',
    fontWeight: '600',
    borderRadius: '8px',
    color: 'var(--text-secondary)',
    border: '1px solid var(--text-secondary)',
    marginTop: '8px',
  },
  confirmDialog: {
    backgroundColor: 'var(--bg-color)',
    borderRadius: '16px',
    padding: '20px',
    width: '280px',
    maxWidth: '90%',
  },
  confirmCancelBtn: {
    flex: 1,
    padding: '8px 0',
    fontSize: '11px',
    fontWeight: '600',
    borderRadius: '8px',
    color: 'var(--text-secondary)',
    border: '1px solid var(--text-secondary)',
  },
  confirmDelBtn: {
    flex: 1,
    padding: '8px 0',
    fontSize: '11px',
    fontWeight: '700',
    borderRadius: '8px',
    color: '#fff',
    backgroundColor: 'var(--color-expense)',
    border: 'none',
  },
};
