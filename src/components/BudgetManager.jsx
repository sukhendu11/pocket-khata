import { useState, useMemo } from 'react';
import { ArrowLeft, Plus, X, AlertCircle, Bell, Trash2, Edit3 } from 'lucide-react';
import PropTypes from 'prop-types';
import { t } from '../i18n';
import { formatNumber, formatPercent } from '../utils';

export default function BudgetManager({
  budgets,
  categories,
  transactions,
  onAddBudget,
  onUpdateBudget,
  onDeleteBudget,
  onNavigate,
  lang,
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [categoryId, setCategoryId] = useState('');
  const [limit, setLimit] = useState('');
  const [formError, setFormError] = useState('');

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Compute spending per budget
  const budgetsWithSpending = useMemo(() => {
    return budgets.map(b => {
      const cat = categories.find(c => c.id === b.categoryId);
      const spent = transactions
        .filter(tx => {
          if (tx.type !== 'expense') return false;
          if (tx.categoryId !== b.categoryId) return false;
          const d = new Date(tx.date);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((sum, tx) => sum + tx.amount, 0);
      const percentage = b.limit > 0 ? Math.min((spent / b.limit) * 100, 100) : 0;
      return {
        ...b,
        categoryName: cat?.name || 'Unknown',
        categoryColor: cat?.color || '#bdc3c7',
        spent,
        remaining: b.limit - spent,
        percentage,
        isOverBudget: spent > b.limit,
        isNearLimit: percentage >= 80 && spent <= b.limit,
      };
    }).sort((a, b) => b.percentage - a.percentage);
  }, [budgets, categories, transactions, currentMonth, currentYear]);

  // Total budget stats
  const totalStats = useMemo(() => {
    const totalLimit = budgets.reduce((s, b) => s + b.limit, 0);
    const totalSpent = budgetsWithSpending.reduce((s, b) => s + b.spent, 0);
    return {
      totalLimit,
      totalSpent,
      totalRemaining: totalLimit - totalSpent,
      totalPct: totalLimit > 0 ? Math.min((totalSpent / totalLimit) * 100, 100) : 0,
      budgetCount: budgets.length,
    };
  }, [budgets, budgetsWithSpending]);

  // Only expense categories for budgeting
  const expenseCats = categories.filter(c => c.type === 'expense');

  const openNew = () => {
    setEditing(null);
    setCategoryId('');
    setLimit('');
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (budget) => {
    setEditing(budget);
    setCategoryId(budget.categoryId);
    setLimit(budget.limit.toString());
    setFormError('');
    setShowForm(true);
  };

  const handleSave = () => {
    setFormError('');
    if (!categoryId) {
      setFormError(t('budget.errCategory', lang));
      return;
    }
    const parsedLimit = Number(limit);
    if (!limit || isNaN(parsedLimit) || parsedLimit <= 0) {
      setFormError(t('budget.errLimit', lang));
      return;
    }

    const payload = {
      categoryId,
      limit: parsedLimit,
      month: currentMonth,
      year: currentYear,
    };

    if (editing) {
      onUpdateBudget({ ...editing, ...payload });
    } else {
      onAddBudget(payload);
    }

    setShowForm(false);
    setEditing(null);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button className="neo-btn neo-btn-round" style={styles.backBtn} onClick={() => onNavigate('dashboard')}>
          <ArrowLeft size={18} />
        </button>
        <h2 style={styles.title}>{t('budget.title', lang)}</h2>
        <button className="neo-btn neo-btn-round" style={styles.addBtn} onClick={openNew}>
          <Plus size={18} />
        </button>
      </div>

      {/* Summary Card */}
      {budgets.length > 0 && (
        <div className="neo-raised" style={styles.summaryCard}>
          <div style={styles.summaryRow}>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>{t('budget.totalBudget', lang)}</span>
              <span style={styles.summaryValue}>৳{formatNumber(totalStats.totalLimit, lang)}</span>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>{t('budget.spent', lang)}</span>
              <span style={{ ...styles.summaryValue, color: 'var(--color-expense)' }}>৳{formatNumber(totalStats.totalSpent, lang)}</span>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>{t('budget.remaining', lang)}</span>
              <span style={{
                ...styles.summaryValue,
                color: totalStats.totalRemaining >= 0 ? 'var(--color-income)' : 'var(--color-expense)'
              }}>৳{formatNumber(Math.abs(totalStats.totalRemaining), lang)}</span>
            </div>
          </div>
          {/* Overall Progress Bar */}
          <div style={styles.progressTrack}>
            <div style={{
              ...styles.progressFill,
              width: `${totalStats.totalPct}%`,
              backgroundColor: totalStats.totalPct >= 100 ? 'var(--color-expense)' : 'var(--accent-color)',
            }} />
          </div>
          <span style={styles.summaryPct}>{formatPercent(totalStats.totalPct, lang)} {t('budget.ofBudgetUsed', lang)}</span>
        </div>
      )}

      {/* Budget List */}
      <div style={styles.listContainer}>
        {budgetsWithSpending.length === 0 ? (
          <div className="neo-pressed-sm" style={styles.emptyState}>
            <Bell size={28} style={{ color: 'var(--text-secondary)', opacity: 0.5, marginBottom: '8px' }} />
            <p>{t('budget.noBudgets', lang)}</p>
            <p style={{ fontSize: '11px', marginTop: '4px', opacity: 0.7 }}>{t('budget.noBudgetsDesc', lang)}</p>
          </div>
        ) : (
          budgetsWithSpending.map(b => (
            <div key={b.id} className="neo-raised-sm" style={{
              ...styles.budgetCard,
              borderLeft: `4px solid ${b.categoryColor}`,
            }}>
              <div style={styles.cardTop}>
                <div style={styles.cardLeft}>
                  <span style={styles.catName}>{b.categoryName}</span>
                  <span style={styles.catLimit}>{t('budget.limit', lang)} ৳{formatNumber(b.limit, lang)}</span>
                </div>
                <div style={styles.cardRight}>
                  <span style={{
                    ...styles.spentAmount,
                    color: b.isOverBudget ? 'var(--color-expense)' : 'var(--text-primary)',
                  }}>
                    ৳{formatNumber(b.spent, lang)}
                  </span>
                  <span style={styles.ofLimit}>/ ৳{formatNumber(b.limit, lang)}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div style={styles.progressTrack}>
                <div style={{
                  ...styles.progressFill,
                  width: `${b.percentage}%`,
                  backgroundColor: b.isOverBudget
                    ? 'var(--color-expense)'
                    : b.isNearLimit
                      ? 'var(--color-warning)'
                      : 'var(--color-income)',
                }} />
              </div>

              <div style={styles.cardBottom}>
                <span style={styles.remainingText}>
                  {b.isOverBudget
                    ? `${t('budget.overByAmount', lang)} ৳${formatNumber(Math.abs(b.remaining), lang)}`
                    : `${formatNumber(b.remaining, lang)} ${t('budget.remainingAmount', lang)}`
                  }
                </span>
                <span style={styles.pctText}>{formatPercent(b.percentage, lang)}</span>
              </div>

              {/* Status Badges */}
              <div style={styles.badgeRow}>
                {b.isOverBudget && (
                  <span style={styles.overBadge}>
                    <AlertCircle size={10} /> {t('budget.overBudget', lang)}
                  </span>
                )}
                {b.isNearLimit && !b.isOverBudget && (
                  <span style={styles.nearBadge}>
                    <Bell size={10} /> {t('budget.nearLimit', lang)}
                  </span>
                )}
                <button className="neo-btn" style={styles.editBadgeBtn} onClick={() => openEdit(b)}>
                  <Edit3 size={10} /> {t('budget.edit', lang)}
                </button>
                <button className="neo-btn" style={styles.deleteBadgeBtn} onClick={() => onDeleteBudget(b.id)}>
                  <Trash2 size={10} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Form Drawer */}
      {showForm && (
        <>
          <div className="drawer-overlay" onClick={() => setShowForm(false)} />
          <div className="bottom-drawer" style={styles.formDrawer}>
            <div style={styles.formHeader}>
              <h3 style={styles.formTitle}>{editing ? t('budget.editBudget', lang) : t('budget.newBudget', lang)}</h3>
              <button className="neo-btn neo-btn-round" style={styles.closeFormBtn} onClick={() => setShowForm(false)}>
                <X size={16} />
              </button>
            </div>

            {formError && (
              <div className="neo-pressed-sm" style={styles.errorBox}>
                <AlertCircle size={14} style={{ color: 'var(--color-expense)' }} />
                <span style={styles.errorText}>{formError}</span>
              </div>
            )}

            <div style={styles.formBody}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>{t('budget.category', lang)}</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="neo-input"
                  style={styles.formSelect}
                >
                  <option value="" disabled>{t('budget.selectCategory', lang)}</option>
                  {expenseCats.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>{t('budget.monthlyLimit', lang)}</label>
                <input
                  type="number"
                  placeholder={t('budget.limitPlaceholder', lang)}
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  className="neo-input"
                />
              </div>

              <p style={styles.formHint}>
                {t('budget.budgetFor', lang)} {t('calendar.months', lang)[currentMonth]} {formatNumber(currentYear, lang)}
              </p>

              <button className="neo-btn neo-btn-primary" style={styles.saveBtn} onClick={handleSave}>
                {editing ? t('budget.saveChanges', lang) : t('budget.createBudget', lang)}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

BudgetManager.propTypes = {
  budgets: PropTypes.array,
  categories: PropTypes.array,
  transactions: PropTypes.array,
  onAddBudget: PropTypes.func,
  onUpdateBudget: PropTypes.func,
  onDeleteBudget: PropTypes.func,
  onNavigate: PropTypes.func,
  lang: PropTypes.string,
};

BudgetManager.defaultProps = {
  budgets: [],
  categories: [],
  transactions: [],
  onAddBudget: () => {},
  onUpdateBudget: () => {},
  onDeleteBudget: () => {},
  onNavigate: () => {},
  lang: 'en',
};

const styles = {
  container: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  backBtn: { width: '36px', height: '36px', borderRadius: '50%', padding: 0 },
  addBtn: { width: '36px', height: '36px', borderRadius: '50%', padding: 0 },
  title: { fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' },
  summaryCard: { padding: '16px', marginBottom: '16px', display: 'flex', flexDirection: 'column' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px' },
  summaryItem: { textAlign: 'center', flex: 1 },
  summaryLabel: { fontSize: '9px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase' },
  summaryValue: { fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginTop: '2px' },
  progressTrack: { height: '10px', borderRadius: '5px', backgroundColor: 'var(--bg-color)', boxShadow: 'var(--neomorphic-pressed-sm)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: '5px', transition: 'width 1s cubic-bezier(0.175, 0.885, 0.32, 1.275)' },
  summaryPct: { fontSize: '10px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '6px', fontWeight: '600' },
  listContainer: { flex: 1, overflowY: 'auto', paddingRight: '2px', display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '10px' },
  emptyState: { padding: '40px 20px', textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' },
  budgetCard: { padding: '14px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '8px' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft: { display: 'flex', flexDirection: 'column' },
  catName: { fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' },
  catLimit: { fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '500', marginTop: '2px' },
  cardRight: { textAlign: 'right' },
  spentAmount: { fontSize: '14px', fontWeight: '700' },
  ofLimit: { fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '500' },
  cardBottom: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  remainingText: { fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' },
  pctText: { fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' },
  badgeRow: { display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' },
  overBadge: { display: 'flex', alignItems: 'center', gap: '3px', fontSize: '9px', fontWeight: '700', color: 'var(--color-expense)', backgroundColor: 'rgba(255,94,87,0.12)', padding: '3px 6px', borderRadius: '4px' },
  nearBadge: { display: 'flex', alignItems: 'center', gap: '3px', fontSize: '9px', fontWeight: '700', color: '#f7b731', backgroundColor: 'rgba(247,183,49,0.12)', padding: '3px 6px', borderRadius: '4px' },
  editBadgeBtn: { padding: '3px 8px', fontSize: '9px', borderRadius: '4px', border: '1px solid var(--accent-color)', color: 'var(--accent-color)', height: '22px' },
  deleteBadgeBtn: { width: '22px', height: '22px', borderRadius: '4px', padding: 0, border: '1px solid var(--color-expense)', color: 'var(--color-expense)' },
  formDrawer: { paddingBottom: '30px' },
  formHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  formTitle: { fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' },
  closeFormBtn: { width: '32px', height: '32px', borderRadius: '50%', padding: 0 },
  formBody: { display: 'flex', flexDirection: 'column', gap: '14px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '4px' },
  formLabel: { fontSize: '9px', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.5px' },
  formSelect: { appearance: 'none', cursor: 'pointer', backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%237f8c8d' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center', backgroundSize: '16px', paddingRight: '40px' },
  formHint: { fontSize: '10px', color: 'var(--text-secondary)', fontStyle: 'italic', fontWeight: '500' },
  saveBtn: { height: '42px', marginTop: '6px' },
  errorBox: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '10px', marginBottom: '10px' },
  errorText: { fontSize: '11px', fontWeight: '600', color: 'var(--color-expense)' },
};
