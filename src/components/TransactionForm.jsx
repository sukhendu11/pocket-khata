import { useState, useEffect } from 'react';
import { X, Trash2, Calendar, Info } from 'lucide-react';
import { trackError } from '../lib/analytics';
import PropTypes from 'prop-types';
import { t } from '../i18n';
import { formatNumber } from '../utils';

export default function TransactionForm({
  transaction, // if null, we are in ADD mode; if populated, we are in EDIT mode
  accounts,
  categories,
  onSave,
  onDelete,
  onClose,
  onAddCategory,
  onUpdateCategory,
  onNavigate,
  lang
}) {
  const [type, setType] = useState('expense'); // 'income', 'expense', 'transfer'
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState('');
  const [transferToId, setTransferToId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState('');

  // Recurring transaction schedule state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurFreq, setRecurFreq] = useState('monthly');
  const [recurInterval, setRecurInterval] = useState(1);
  const [recurEndDate, setRecurEndDate] = useState('');

  // Hydrate form if editing
  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmount(transaction.amount.toString());
      setDate(transaction.date);
      setAccountId(transaction.accountId);
      setTransferToId(transaction.transferToId || '');
      setCategoryId(transaction.categoryId || '');
      setSubcategory(transaction.subcategory || '');
      setNotes(transaction.notes || '');
    } else {
      // Default to first account and first category
      if (accounts.length > 0) setAccountId(accounts[0].id);
      
      const expenseCats = categories.filter(c => c.type === 'expense');
      if (expenseCats.length > 0) setCategoryId(expenseCats[0].id);
    }
  }, [transaction, accounts, categories]);

  // Hydrate recurring fields if editing a transaction with a schedule
  useEffect(() => {
    if (transaction && transaction.recurring && typeof transaction.recurring === 'object') {
      setIsRecurring(true);
      setRecurFreq(transaction.recurring.frequency || 'monthly');
      setRecurInterval(transaction.recurring.interval || 1);
      setRecurEndDate(transaction.recurring.endDate || '');
    } else {
      setIsRecurring(false);
      setRecurFreq('monthly');
      setRecurInterval(1);
      setRecurEndDate('');
    }
  }, [transaction]);

  // Adjust categories when type changes
  useEffect(() => {
    if (!transaction) {
      // Auto-disable recurring when switching to transfer
      if (type === 'transfer') {
        setIsRecurring(false);
      }
      const filteredCats = categories.filter(c => c.type === type);
      if (filteredCats.length > 0) {
        setCategoryId(filteredCats[0].id);
        setSubcategory('');
      } else {
        setCategoryId('');
        setSubcategory('');
      }
    }
  }, [type, categories, transaction]);

  const handleSave = () => {
    try {
      setValidationError('');

      const parsedAmount = Number(amount);
      if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
        setValidationError(t('txForm.validAmount', lang));
        return;
      }

      if (!accountId) {
        setValidationError(t('txForm.selectAccountErr', lang));
        return;
      }

      if (type === 'transfer') {
        if (!transferToId) {
          setValidationError(t('txForm.selectDestination', lang));
          return;
        }
        if (accountId === transferToId) {
          setValidationError(t('txForm.differentAccounts', lang));
          return;
        }
      } else {
        if (!categoryId) {
          setValidationError(t('txForm.selectCategory', lang));
          return;
        }
      }

      const payload = {
        type,
        amount: parsedAmount,
        date,
        accountId,
        transferToId: type === 'transfer' ? transferToId : null,
        categoryId: type === 'transfer' ? '' : categoryId,
        subcategory: type === 'transfer' ? '' : subcategory,
        notes: notes.trim(),
      };

      // Set recurring schedule if enabled (only for income/expense, not transfers)
      if (isRecurring && type !== 'transfer') {
        payload.recurring = {
          frequency: recurFreq,
          interval: Math.max(1, parseInt(recurInterval) || 1),
          nextDate: date,
          endDate: recurEndDate || null,
          occurrencesCreated: 0,
        };
      } else {
        payload.recurring = false;
      }

      if (transaction) {
        payload.id = transaction.id;
      }

      onSave(payload);
    } catch (e) {
      trackError(e, { handler: 'TransactionForm.handleSave', transactionType: type });
      console.error('Failed to save transaction from form:', e);
    }
  };

  // Find selected category for subcategory options
  const selectedCategory = categories.find(c => c.id === categoryId);
  const subcategoryOptions = selectedCategory?.subcategories || [];
  const filteredCategories = categories.filter(c => c.type === type);
  
  // Modal-based category/subcategory selector state
  const [showCatModal, setShowCatModal] = useState(false);
  const [showSubcatModal, setShowSubcatModal] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickCatName, setQuickCatName] = useState('');
  const [showSubQuickAdd, setShowSubQuickAdd] = useState(false);
  const [quickSubName, setQuickSubName] = useState('');

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="bottom-drawer" style={styles.drawer}>
        
        {/* Fixed Header — title + close X button (always visible, never scrolls) */}
        <div className="drawer-header">
          <h3 style={styles.title}>
            {transaction ? t('txForm.editTitle', lang) : t('txForm.addTitle', lang)}
          </h3>
          <button className="neo-btn" style={styles.closeBtn} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content — only this section scrolls */}
        <div className="drawer-scrollable">

        {/* 1. Transaction Type Segment Toggle */}
        <div className="neo-pressed-sm" style={styles.segmentContainer}>
        {['expense', 'income', 'transfer'].map(txType => (
          <button
            key={txType}
            onClick={() => setType(txType)}
            className="neo-btn"
            style={{
              ...styles.segmentBtn,
              boxShadow: type === txType ? 'var(--neomorphic-raised-sm)' : 'none',
              color: type === txType 
                ? txType === 'income' 
                  ? 'var(--color-income)' 
                  : txType === 'expense' 
                    ? 'var(--color-expense)' 
                    : 'var(--color-transfer)'
                : 'var(--text-secondary)',
              fontWeight: type === txType ? '700' : '500',
              border: type === txType ? '1px solid rgba(255,255,255,0.4)' : '1px solid transparent',
            }}
          >
            {t(txType === 'expense' ? 'expense' : txType === 'income' ? 'income' : 'transfer', lang).toUpperCase()}
          </button>
        ))}
        </div>

        {/* Form Fields */}
        <div style={styles.form}>
          
          {/* Validation Error Alert */}
          {validationError && (
            <div className="neo-pressed-sm" style={styles.errorBox}>
              <Info size={14} style={{ color: 'var(--color-expense)' }} />
              <span style={styles.errorText}>{validationError}</span>
            </div>
          )}

          {/* Amount Field */}
          <div style={styles.formGroup}>
            <label style={styles.label}>{t('txForm.amount', lang)}</label>
            <div style={styles.amountInputWrapper}>
              <span style={styles.currencySymbol}>৳</span>
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="neo-input"
                style={styles.amountInput}
                autoFocus={!transaction}
              />
            </div>
          </div>

          {/* Date Selector */}
          <div style={styles.formGroup}>
            <label style={styles.label}>{t('txForm.date', lang)}</label>
            <div style={styles.inputWithIcon}>
              <Calendar size={16} style={styles.inputIcon} />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="neo-input"
                style={{ paddingLeft: '40px' }}
              />
            </div>
          </div>

          {/* Account Dropdown(s) */}
          <div style={styles.row}>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>
                {type === 'transfer' ? t('txForm.fromAccount', lang) : t('txForm.account', lang)}
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="neo-input"
                style={styles.select}
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id} style={styles.option}>
                    {acc.name} (৳{formatNumber(acc.balance, lang)})
                  </option>
                ))}
              </select>
            </div>

            {type === 'transfer' && (
              <div style={{ ...styles.formGroup, flex: 1 }}>
                <label style={styles.label}>{t('txForm.toAccount', lang)}</label>
                <select
                  value={transferToId}
                  onChange={(e) => setTransferToId(e.target.value)}
                  className="neo-input"
                  style={styles.select}
                >
                  <option value="" disabled style={styles.option}>{t('txForm.selectAccount', lang)}</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id} style={styles.option}>
                      {acc.name} (৳{formatNumber(acc.balance, lang)})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Category + Subcategory (Only for Income & Expense) */}
          {type !== 'transfer' && (
            <div style={styles.formGroup}>
              <label style={styles.label}>{t('txForm.category', lang)}</label>

              {/* Category Selector Button */}
              <button
                type="button"
                className="neo-btn neo-raised-sm"
                style={styles.catSelectorBtn}
                onClick={() => { setShowCatModal(true); setShowQuickAdd(false); }}
              >
                <span style={{ flex: 1, textAlign: 'left' }}>
                  {selectedCategory ? selectedCategory.name : (t('txForm.selectCategory', lang))}
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>⌵</span>
              </button>

              {/* Subcategory Selector Button (only when category has subcategories) */}
              {selectedCategory && subcategoryOptions.length > 0 && (
                <button
                  type="button"
                  className="neo-btn neo-raised-sm"
                  style={{ ...styles.catSelectorBtn, marginTop: '8px' }}
                  onClick={() => { setShowSubcatModal(true); setShowSubQuickAdd(false); }}
                >
                  <span style={{ flex: 1, textAlign: 'left' }}>
                    {subcategory || '—'}
                  </span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>⌵</span>
                </button>
              )}
              {selectedCategory && subcategoryOptions.length === 0 && (
                <button
                  type="button"
                  className="neo-btn"
                  style={styles.quickAddSubBtn}
                  onClick={() => { setShowSubcatModal(true); setShowSubQuickAdd(false); }}
                >
                  + {t('categories.subcategories', lang)}
                </button>
              )}
            </div>
          )}

          {/* Recurring Toggle (only for income/expense, not transfers) */}
          {type !== 'transfer' && (
            <div style={styles.formGroup}>
              <label style={styles.recurringToggleLabel}>
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  style={styles.recurringCheckbox}
                />
                <span>{t('txForm.recurring', lang)}</span>
              </label>

              {isRecurring && (
                <div style={styles.recurringOptions}>
                  <div style={styles.row}>
                    {/* Frequency */}
                    <div style={{ flex: 1 }}>
                      <label style={styles.label}>{t('txForm.recurFreq', lang)}</label>
                      <select
                        value={recurFreq}
                        onChange={(e) => setRecurFreq(e.target.value)}
                        className="neo-input"
                        style={styles.select}
                      >
                        <option value="daily" style={styles.option}>{t('txForm.freqDaily', lang)}</option>
                        <option value="weekly" style={styles.option}>{t('txForm.freqWeekly', lang)}</option>
                        <option value="monthly" style={styles.option}>{t('txForm.freqMonthly', lang)}</option>
                        <option value="yearly" style={styles.option}>{t('txForm.freqYearly', lang)}</option>
                      </select>
                    </div>
                    {/* Interval */}
                    <div style={{ flex: 1 }}>
                      <label style={styles.label}>{t('txForm.recurInterval', lang)}</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={recurInterval}
                        onChange={(e) => setRecurInterval(e.target.value)}
                        className="neo-input"
                        style={styles.intervalInput}
                      />
                    </div>
                  </div>
                  {/* End Date (optional) */}
                  <div style={styles.formGroup}>
                    <label style={styles.label}>{t('txForm.recurEndDate', lang)}</label>
                    <input
                      type="date"
                      value={recurEndDate}
                      onChange={(e) => setRecurEndDate(e.target.value)}
                      className="neo-input"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes Description */}
          <div style={styles.formGroup}>
            <label style={styles.label}>{t('txForm.notes', lang)}</label>
            <textarea
              placeholder={t('txForm.notesPlaceholder', lang)}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="neo-input"
              rows="3"
              style={styles.textarea}
            />
          </div>

          {/* Action Buttons */}
          <div style={styles.buttonRow}>
            {transaction && (
              <button
                onClick={onDelete}
                className="neo-btn"
                style={styles.deleteBtn}
              >
                <Trash2 size={16} /> {t('delete', lang)}
              </button>
            )}

            <button
              onClick={handleSave}
              className="neo-btn neo-btn-primary"
              style={styles.saveBtn}
            >
              {transaction ? t('txForm.saveChanges', lang) : t('txForm.addTransaction', lang)}
            </button>
          </div>

        </div>

        </div>

        {/* Category Selection Modal */}
        {showCatModal && (
          <>
            <div className="drawer-overlay" onClick={() => { setShowCatModal(false); setShowQuickAdd(false); }} />
            <div className="bottom-drawer" style={styles.modal}>
              <div className="drawer-header">
                <h3 style={styles.modalTitle}>{t('txForm.category', lang)}</h3>
                <button className="neo-btn" style={styles.closeModalBtn} onClick={() => { setShowCatModal(false); setShowQuickAdd(false); }}>
                  <X size={16} />
                </button>
              </div>
              <div className="drawer-scrollable" style={{ position: 'relative', minHeight: '200px' }}>
                {/* Category list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '60px' }}>
                  {filteredCategories.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {t('txForm.noCategories', lang)}
                    </div>
                  ) : (
                    filteredCategories.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        className="neo-btn"
                        style={{
                          ...styles.catListItem,
                          borderLeft: `4px solid ${cat.color || 'var(--accent-color)'}`,
                          boxShadow: cat.id === categoryId ? 'var(--neomorphic-pressed-sm)' : 'var(--neomorphic-raised-sm)',
                        }}
                        onClick={() => { setCategoryId(cat.id); setSubcategory(''); setShowCatModal(false); }}
                      >
                        <span style={styles.catListItemName}>{cat.name}</span>
                        {cat.id === categoryId && (
                          <span style={{ fontSize: '10px', color: 'var(--accent-color)' }}>✓</span>
                        )}
                      </button>
                    ))
                  )}
                </div>

                {/* Quick-add inline form */}
                {showQuickAdd && (
                  <div style={styles.quickAddModalRow}>
                    <input
                      type="text"
                      placeholder={t('categories.categoryNamePlaceholder', lang)}
                      value={quickCatName}
                      onChange={(e) => setQuickCatName(e.target.value)}
                      className="neo-input"
                      style={styles.quickAddInput}
                      autoFocus
                    />
                    <button
                      className="neo-btn neo-btn-primary"
                      style={styles.quickAddSaveBtn}
                      onClick={() => {
                        const name = quickCatName.trim();
                        if (name && onAddCategory) {
                          onAddCategory({ name, type, icon: 'Tag', color: '#ff7b54' });
                          setQuickCatName('');
                          setShowQuickAdd(false);
                        }
                      }}
                    >
                      {t('categories.saveCategory', lang)}
                    </button>
                  </div>
                )}

                {/* Floating FAB-style Add button */}
                {!showQuickAdd && (
                  <button
                    type="button"
                    className="neo-btn neo-btn-primary"
                    style={styles.fabCatAddBtn}
                    onClick={() => { setShowQuickAdd(true); setQuickCatName(''); }}
                  >
                    + {t('categories.newCategory', lang)}
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {/* Subcategory Selection Modal */}
        {showSubcatModal && selectedCategory && (
          <>
            <div className="drawer-overlay" onClick={() => { setShowSubcatModal(false); setShowSubQuickAdd(false); }} />
            <div className="bottom-drawer" style={styles.modal}>
              <div className="drawer-header">
                <h3 style={styles.modalTitle}>{selectedCategory.name} — {t('categories.subcategories', lang)}</h3>
                <button className="neo-btn" style={styles.closeModalBtn} onClick={() => { setShowSubcatModal(false); setShowSubQuickAdd(false); }}>
                  <X size={16} />
                </button>
              </div>
              <div className="drawer-scrollable" style={{ position: 'relative', minHeight: '200px' }}>
                {/* Subcategory list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '60px' }}>
                  <button
                    type="button"
                    className="neo-btn"
                    style={{
                      ...styles.catListItem,
                      boxShadow: !subcategory ? 'var(--neomorphic-pressed-sm)' : 'var(--neomorphic-raised-sm)',
                    }}
                    onClick={() => { setSubcategory(''); setShowSubcatModal(false); }}
                  >
                    <span style={styles.catListItemName}>—</span>
                    {!subcategory && <span style={{ fontSize: '10px', color: 'var(--accent-color)' }}>✓</span>}
                  </button>
                  {subcategoryOptions.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {t('categories.subcategoryPlaceholder', lang)}
                    </div>
                  ) : (
                    subcategoryOptions.map((sub, i) => (
                      <button
                        key={i}
                        type="button"
                        className="neo-btn"
                        style={{
                          ...styles.catListItem,
                          boxShadow: sub === subcategory ? 'var(--neomorphic-pressed-sm)' : 'var(--neomorphic-raised-sm)',
                        }}
                        onClick={() => { setSubcategory(sub); setShowSubcatModal(false); }}
                      >
                        <span style={styles.catListItemName}>{sub}</span>
                        {sub === subcategory && (
                          <span style={{ fontSize: '10px', color: 'var(--accent-color)' }}>✓</span>
                        )}
                      </button>
                    ))
                  )}
                </div>

                {/* Quick-add subcategory inline form */}
                {showSubQuickAdd && (
                  <div style={styles.quickAddModalRow}>
                    <input
                      type="text"
                      placeholder={t('categories.subcategoryPlaceholder', lang)}
                      value={quickSubName}
                      onChange={(e) => setQuickSubName(e.target.value)}
                      className="neo-input"
                      style={styles.quickAddInput}
                      autoFocus
                    />
                    <button
                      className="neo-btn neo-btn-primary"
                      style={styles.quickAddSaveBtn}
                      onClick={() => {
                        const sub = quickSubName.trim();
                        if (sub && onUpdateCategory && selectedCategory) {
                          const updatedSubs = [...(selectedCategory.subcategories || []), sub];
                          onUpdateCategory({ ...selectedCategory, subcategories: updatedSubs });
                          setQuickSubName('');
                          setShowSubQuickAdd(false);
                        }
                      }}
                    >
                      {t('categories.saveCategory', lang)}
                    </button>
                  </div>
                )}

                {/* Floating FAB-style Add subcategory button */}
                {!showSubQuickAdd && (
                  <button
                    type="button"
                    className="neo-btn neo-btn-primary"
                    style={styles.fabCatAddBtn}
                    onClick={() => { setShowSubQuickAdd(true); setQuickSubName(''); }}
                  >
                    + {t('categories.subcategories', lang)}
                  </button>
                )}
              </div>
            </div>
          </>
        )}

      </div>
    </>
  );
}

TransactionForm.propTypes = {
  transaction: PropTypes.object,
  accounts: PropTypes.array,
  categories: PropTypes.array,
  onSave: PropTypes.func,
  onDelete: PropTypes.func,
  onClose: PropTypes.func,
  onAddCategory: PropTypes.func,
  onUpdateCategory: PropTypes.func,
  onNavigate: PropTypes.func,
  lang: PropTypes.string,
};

const styles = {
  drawer: {
  },
  title: {
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  closeBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    padding: 0,
  },
  segmentContainer: {
    display: 'flex',
    padding: '4px',
    borderRadius: '16px',
    marginBottom: '22px',
    backgroundColor: 'var(--bg-color)',
  },
  segmentBtn: {
    flex: 1,
    padding: '8px 0',
    fontSize: '11px',
    borderRadius: '12px',
    backgroundColor: 'transparent',
    boxShadow: 'none',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  row: {
    display: 'flex',
    gap: '14px',
  },
  label: {
    fontSize: '10px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    letterSpacing: '0.8px',
  },
  amountInputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  currencySymbol: {
    position: 'absolute',
    left: '16px',
    fontSize: '20px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  amountInput: {
    paddingLeft: '38px',
    fontSize: '22px',
    fontWeight: '700',
    letterSpacing: '-0.5px',
  },
  inputWithIcon: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '16px',
    color: 'var(--text-secondary)',
  },
  select: {
    appearance: 'none',
    cursor: 'pointer',
    backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%237f8c8d' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 16px center',
    backgroundSize: '16px',
    paddingRight: '40px',
  },
  option: {
    backgroundColor: 'var(--bg-color)',
    color: 'var(--text-primary)',
  },
  textarea: {
    resize: 'none',
    lineHeight: '1.4',
  },
  buttonRow: {
    display: 'flex',
    gap: '14px',
    marginTop: '10px',
  },
  deleteBtn: {
    backgroundColor: 'var(--bg-color)',
    color: 'var(--color-expense)',
    border: '1px solid var(--color-expense)',
    flex: '1',
  },
  saveBtn: {
    flex: '2',
    height: '46px',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    borderRadius: '12px',
    backgroundColor: 'var(--bg-color)',
  },
  errorText: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--color-expense)',
  },
  recurringToggleLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    padding: '8px 0',
  },
  recurringCheckbox: {
    width: '16px',
    height: '16px',
    accentColor: 'var(--accent-color)',
    cursor: 'pointer',
  },
  recurringOptions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '12px',
    marginTop: '4px',
    backgroundColor: 'var(--bg-color)',
    borderRadius: '12px',
    boxShadow: 'var(--neomorphic-pressed-sm)',
  },
  intervalInput: {
    width: '100%',
  },
  catSelectorBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '12px 14px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    backgroundColor: 'var(--bg-color)',
    textAlign: 'left',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  catListItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '12px 14px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    backgroundColor: 'var(--bg-color)',
    textAlign: 'left',
  },
  catListItemName: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  fabCatAddBtn: {
    position: 'sticky',
    bottom: '0',
    width: '100%',
    padding: '12px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '700',
    height: '44px',
    marginTop: '8px',
  },
  quickAddModalRow: {
    display: 'flex',
    gap: '8px',
    position: 'sticky',
    bottom: '0',
    backgroundColor: 'var(--bg-color)',
    padding: '8px 0',
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  quickAddInput: {
    flex: 1,
    height: '34px',
    fontSize: '12px',
  },
  quickAddSaveBtn: {
    padding: '4px 12px',
    fontSize: '10px',
    borderRadius: '8px',
    height: '34px',
    whiteSpace: 'nowrap',
  },
  quickAddSubBtn: {
    background: 'none',
    border: 'none',
    fontSize: '9px',
    fontWeight: '700',
    color: 'var(--color-income)',
    cursor: 'pointer',
    padding: '2px 0',
    textAlign: 'left',
  },
};
