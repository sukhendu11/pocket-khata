import { useState, useEffect } from 'react';
import { X, Trash2, Calendar, Info } from 'lucide-react';
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
  lang
}) {
  const [type, setType] = useState('expense'); // 'income', 'expense', 'transfer'
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState('');
  const [transferToId, setTransferToId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState('');

  // Hydrate form if editing
  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmount(transaction.amount.toString());
      setDate(transaction.date);
      setAccountId(transaction.accountId);
      setTransferToId(transaction.transferToId || '');
      setCategoryId(transaction.categoryId || '');
      setNotes(transaction.notes || '');
    } else {
      // Default to first account and first category
      if (accounts.length > 0) setAccountId(accounts[0].id);
      
      const expenseCats = categories.filter(c => c.type === 'expense');
      if (expenseCats.length > 0) setCategoryId(expenseCats[0].id);
    }
  }, [transaction, accounts, categories]);

  // Adjust categories when type changes
  useEffect(() => {
    if (!transaction) {
      const filteredCats = categories.filter(c => c.type === type);
      if (filteredCats.length > 0) {
        setCategoryId(filteredCats[0].id);
      } else {
        setCategoryId('');
      }
    }
  }, [type, categories, transaction]);

  const handleSave = () => {
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
      notes: notes.trim(),
    };

    if (transaction) {
      payload.id = transaction.id;
    }

    onSave(payload);
  };

  const filteredCategories = categories.filter(c => c.type === type);

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="bottom-drawer" style={styles.drawer}>
        
        {/* Header */}
        <div style={styles.header}>
          <h3 style={styles.title}>
            {transaction ? t('txForm.editTitle', lang) : t('txForm.addTitle', lang)}
          </h3>
          <button className="neo-btn neo-btn-round" style={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* 1. Transaction Type Segment Toggle */}
        <div className="neo-pressed-sm" style={styles.segmentContainer}>            {['expense', 'income', 'transfer'].map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className="neo-btn"
              style={{
                ...styles.segmentBtn,
                boxShadow: type === t ? 'var(--neomorphic-raised-sm)' : 'none',
                color: type === t 
                  ? t === 'income' 
                    ? 'var(--color-income)' 
                    : t === 'expense' 
                      ? 'var(--color-expense)' 
                      : 'var(--color-transfer)'
                  : 'var(--text-secondary)',
                fontWeight: type === t ? '700' : '500',
                border: type === t ? '1px solid rgba(255,255,255,0.4)' : '1px solid transparent',
              }}
            >
              {t(t === 'expense' ? 'expense' : t === 'income' ? 'income' : 'transfer', lang).toUpperCase()}
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

          {/* Category Dropdown (Only for Income & Expense) */}
          {type !== 'transfer' && (
            <div style={styles.formGroup}>
              <label style={styles.label}>{t('txForm.category', lang)}</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="neo-input"
                style={styles.select}
              >
                {filteredCategories.length === 0 ? (
                  <option value="" style={styles.option}>{t('txForm.noCategories', lang)}</option>
                ) : (
                  filteredCategories.map(cat => (
                    <option key={cat.id} value={cat.id} style={styles.option}>
                      {cat.name}
                    </option>
                  ))
                )}
              </select>
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
  lang: PropTypes.string,
};

const styles = {
  drawer: {
    paddingBottom: '30px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  closeBtn: {
    width: '36px',
    height: '36px',
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
};
