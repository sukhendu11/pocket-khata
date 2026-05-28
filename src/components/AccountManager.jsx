import { useState, useMemo } from 'react';
import { 
  ArrowLeft, Plus, Landmark, CreditCard, Wallet, 
  Trash2, X, AlertCircle, Info, Pencil 
} from 'lucide-react';
import PropTypes from 'prop-types';
import { t } from '../i18n';
import { formatNumber } from '../utils';
import { trackAction } from '../lib/analytics';

export default function AccountManager({
  accounts = [],
  transactions = [],
  onAddAccount = () => {},
  onUpdateAccount = () => {},
  onDeleteAccount = () => {},
  onNavigate = () => {},
  lang = 'en',
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState('Bank'); // 'Bank', 'Cash', 'Bkash', 'Nagad'
  const [balance, setBalance] = useState('');
  const [color, setColor] = useState('#4a90e2');
  const [formError, setFormError] = useState('');
  // Edit balance state (for system accounts)
  const [showEditBalance, setShowEditBalance] = useState(false);
  const [editBalanceValue, setEditBalanceValue] = useState('');
  const [editBalanceError, setEditBalanceError] = useState('');

  const colors = ['#4a90e2', '#3cd070', '#ff5a79', '#ff8a00', '#8e44ad', '#00c9db', '#ff7b54', '#718096'];

  // 1. Account Icons Resolver
  const getAccountIcon = (accountType) => {
    switch (accountType) {
      case 'Bank': return <Landmark size={20} />;
      case 'Bkash': 
      case 'Nagad': return <CreditCard size={20} />;
      default: return <Wallet size={20} />;
    }
  };

  // Account type → i18n key mapping for Bengali support
  const typeI18nMap = {
    'Cash': 'accounts.cashLedger',
    'Bank': 'accounts.bankAccount',
    'Bkash': 'accounts.bkashWallet',
    'Nagad': 'accounts.nagadWallet',
  };

  const getLocalizedType = (accType) => t(typeI18nMap[accType] || '', lang) || accType;

  // Localize seed account names for Bengali
  const getLocalizedAccName = (acc) => {
    if (lang !== 'bn') return acc.name;
    const nameMap = {
      'Cash': t('accounts.name.cash', lang),
      'Cash Ledger': t('accounts.name.cash', lang),
      'Bank Account': t('accounts.name.bankAccount', lang),
      'bKash Wallet': t('accounts.name.bkashWallet', lang),
      'Nagad Wallet': t('accounts.name.nagadWallet', lang),
    };
    return nameMap[acc.name] || acc.name;
  };

  // 2. Filter transactions by selected account
  const accountTransactions = useMemo(() => {
    if (!selectedAccount) return [];
    return transactions.filter(tx => 
      tx.accountId === selectedAccount.id || 
      (tx.type === 'transfer' && tx.transferToId === selectedAccount.id)
    ).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, selectedAccount]);

  // 3. Save new account
  const handleSave = () => {
    setFormError('');

    if (!name.trim()) {
      setFormError(t('accounts.errName', lang));
      return;
    }

    const parsedBalance = Number(balance);
    if (!balance || isNaN(parsedBalance)) {
      setFormError(t('accounts.errBalance', lang));
      return;
    }

    onAddAccount({
      name: name.trim(),
      type,
      balance: parsedBalance,
      color,
    });

    // Reset
    setName('');
    setType('Bank');
    setBalance('');
    setColor('#4a90e2');
    setShowAddModal(false);
  };

  // 4. Delete selected account
  const handleDelete = (id) => {
    const hasTxs = transactions.some(tx => tx.accountId === id || tx.transferToId === id);
    if (hasTxs) {
      const confirmDelete = window.confirm(
        t('accounts.deleteWarning', lang)
      );
      if (!confirmDelete) return;
    }

    const deletedType = accounts.find(a => a.id === id)?.type;
    trackAction('delete_account', { accountType: deletedType });
    onDeleteAccount(id);
    setSelectedAccount(null);
  };

  return (
    <div style={styles.container}>
      
      {/* Header Bar */}
      <div style={styles.header}>
        <button className="neo-btn neo-btn-round" style={styles.backBtn} onClick={() => onNavigate('dashboard')}>
          <ArrowLeft size={18} />
        </button>
        <h2 style={styles.title}>{t('accounts.title', lang)}</h2>
        <button className="neo-btn neo-btn-round" style={styles.addBtn} onClick={() => setShowAddModal(true)}>
          <Plus size={18} />
        </button>
      </div>

      {/* Accounts List Deck */}
      <div style={styles.listContainer}>
        {accounts.map(acc => (
          <div 
            key={acc.id} 
            className="neo-raised-sm" 
            style={{ 
              ...styles.accountItem, 
              borderLeft: `5px solid ${acc.color || 'var(--accent-color)'}` 
            }}
            onClick={() => { setSelectedAccount(acc); trackAction('view_account_details', { accountType: acc.type }); }}
          >
            <div style={styles.itemLeft}>
              <span style={{ ...styles.iconBg, backgroundColor: `${acc.color}22`, color: acc.color }} className="neo-pressed-sm">
                {getAccountIcon(acc.type)}
              </span>
              <div>
                <h4 style={styles.accName}>{getLocalizedAccName(acc)}</h4>
                <span style={styles.accType}>{getLocalizedType(acc.type)}</span>
              </div>
            </div>
            <div style={styles.itemRight}>
              <p style={styles.accBalance}>৳{formatNumber(acc.balance, lang)}</p>
              <span style={styles.tapPrompt}>{t('accounts.tapForDetails', lang)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Account Details Slide-up Drawer */}
      {selectedAccount && (
        <>
          <div className="drawer-overlay" onClick={() => setSelectedAccount(null)} />
          <div className="bottom-drawer" style={styles.drawer}>
            <div style={styles.drawerHeader}>
              <div style={styles.drawerHeaderTitle}>
                <span style={{ ...styles.iconBg, backgroundColor: `${selectedAccount.color}22`, color: selectedAccount.color }}>
                  {getAccountIcon(selectedAccount.type)}
                </span>
                <div>
                  <h3 style={styles.drawerTitle}>{getLocalizedAccName(selectedAccount)}</h3>
                  <span style={styles.drawerSubtitle}>{getLocalizedType(selectedAccount.type)} {t('accounts.accountType', lang)}</span>
                </div>
              </div>
              <button className="neo-btn neo-btn-round" style={styles.closeBtn} onClick={() => setSelectedAccount(null)}>
                <X size={16} />
              </button>
            </div>

            {/* Large Balance Display */}
            <div className="neo-pressed-sm" style={styles.drawerBalanceCard}>
              <span style={styles.balCardLabel}>{t('accounts.currentBalance', lang)}</span>
              <h2 style={styles.balCardValue}>৳{formatNumber(selectedAccount.balance, lang)}</h2>
            </div>

            {/* Action Buttons */}
            {selectedAccount.system ? (
              /* System accounts — Edit Balance button instead of Delete */
              <button 
                className="neo-btn" 
                style={styles.editBalanceBtn}
                onClick={() => {
                  setEditBalanceValue(String(selectedAccount.balance));
                  setEditBalanceError('');
                  setShowEditBalance(true);
                }}
              >
                <Pencil size={14} /> {t('accounts.editBalance', lang)}
              </button>
            ) : (
              /* User accounts — Delete button */
              <button 
                className="neo-btn" 
                style={styles.deleteAccBtn}
                onClick={() => handleDelete(selectedAccount.id)}
              >
                <Trash2 size={14} /> {t('accounts.deleteAccount', lang)}
              </button>
            )}

            {/* Account Specific Transactions ledger */}
            <h4 style={styles.ledgerHeader}>{t('accounts.subLedger', lang)}</h4>
            <div style={styles.drawerTxList}>
              {accountTransactions.length === 0 ? (
                <div className="neo-pressed-sm" style={styles.emptyLedger}>
                  <Info size={12} style={{ marginRight: '6px' }} /> {t('accounts.noTransactions', lang)}
                </div>
              ) : (
                accountTransactions.map(tx => (
                  <div key={tx.id} style={styles.ledgerItem}>
                    <div>
                      <span style={styles.ledgerNotes}>{tx.notes || t('accounts.ledgerPosting', lang)}</span>
                      <span style={styles.ledgerDate}>{tx.date}</span>
                    </div>
                    <span style={{ 
                      ...styles.ledgerAmount,
                      color: tx.type === 'income' 
                        ? 'var(--color-income)' 
                        : tx.type === 'expense' 
                          ? 'var(--color-expense)' 
                          : 'var(--color-transfer)'
                    }}>
                      {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '⇄'} ৳{formatNumber(tx.amount, lang)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Edit Balance Drawer (for system accounts) */}
      {showEditBalance && selectedAccount && (
        <>
          <div className="drawer-overlay" onClick={() => setShowEditBalance(false)} />
          <div className="bottom-drawer" style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>{t('accounts.editBalance', lang)}</h3>
              <button className="neo-btn neo-btn-round" style={styles.closeModalBtn} onClick={() => setShowEditBalance(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="neo-pressed-sm" style={{
              padding: '12px',
              borderRadius: '14px',
              textAlign: 'center',
              marginBottom: '16px',
            }}>
              <span style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.8px', display: 'block' }}>
                {t('accounts.currentBalance', lang)}
              </span>
              <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>
                ৳{formatNumber(selectedAccount.balance, lang)}
              </h2>
            </div>

            {editBalanceError && (
              <div className="neo-pressed-sm" style={styles.errorBox}>
                <AlertCircle size={14} style={{ color: 'var(--color-expense)' }} />
                <span style={styles.errorText}>{editBalanceError}</span>
              </div>
            )}

            <div style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>{t('accounts.walletName', lang)}</label>
                <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
                  {getLocalizedAccName(selectedAccount)}
                </p>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>{t('accounts.startingBalance', lang)}</label>
                <input
                  type="number"
                  placeholder={t('accounts.balancePlaceholder', lang)}
                  value={editBalanceValue}
                  onChange={(e) => setEditBalanceValue(e.target.value)}
                  className="neo-input"
                />
              </div>

              <button
                className="neo-btn neo-btn-primary"
                style={{ height: '42px', marginTop: '10px' }}
                onClick={() => {
                  const newBalance = Number(editBalanceValue);
                  if (isNaN(newBalance)) {
                    setEditBalanceError(t('accounts.errBalance', lang));
                    return;
                  }
                  setEditBalanceError('');
                  onUpdateAccount({ ...selectedAccount, balance: newBalance });
                  setShowEditBalance(false);
                }}
              >
                {t('accounts.saveBalance', lang)}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Add Account Modal */}
      {showAddModal && (
        <>
          <div className="drawer-overlay" onClick={() => setShowAddModal(false)} />
          <div className="bottom-drawer" style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>{t('accounts.addTitle', lang)}</h3>
              <button className="neo-btn neo-btn-round" style={styles.closeModalBtn} onClick={() => setShowAddModal(false)}>
                <X size={16} />
              </button>
            </div>

            {formError && (
              <div className="neo-pressed-sm" style={styles.errorBox}>
                <AlertCircle size={14} style={{ color: 'var(--color-expense)' }} />
                <span style={styles.errorText}>{formError}</span>
              </div>
            )}

            <div style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>{t('accounts.walletName', lang)}</label>
                <input
                  type="text"
                  placeholder={t('accounts.walletNamePlaceholder', lang)}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="neo-input"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>{t('accounts.startingBalance', lang)}</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  className="neo-input"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>{t('accounts.walletType', lang)}</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="neo-input"
                  style={styles.select}
                >
                  <option value="Bank">{t('accounts.bankAccount', lang)}</option>
                  <option value="Cash">{t('accounts.cashLedger', lang)}</option>
                  <option value="Bkash">{t('accounts.bkashWallet', lang)}</option>
                  <option value="Nagad">{t('accounts.nagadWallet', lang)}</option>
                </select>
              </div>

              {/* Color Selector */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>{t('accounts.brandColor', lang)}</label>
                <div style={styles.colorPalette}>
                  {colors.map(c => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={color === c ? 'neo-pressed-sm' : 'neo-raised-sm'}
                      style={{
                        ...styles.colorCircle,
                        backgroundColor: c,
                        border: color === c ? '2px solid var(--text-primary)' : '1px solid transparent',
                      }}
                    />
                  ))}
                </div>
              </div>

              <button className="neo-btn neo-btn-primary" style={styles.saveFormBtn} onClick={handleSave}>
                {t('accounts.createWallet', lang)}
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
}

AccountManager.propTypes = {
  accounts: PropTypes.array,
  transactions: PropTypes.array,
  onAddAccount: PropTypes.func,
  onUpdateAccount: PropTypes.func,
  onDeleteAccount: PropTypes.func,
  onNavigate: PropTypes.func,
  lang: PropTypes.string,
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
  addBtn: {
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
  listContainer: {
    flex: 1,
    overflowY: 'auto',
    paddingRight: '2px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    paddingBottom: '20px',
  },
  accountItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    cursor: 'pointer',
    borderRadius: '18px',
  },
  itemLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    minWidth: 0,
  },
  iconBg: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  accName: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  accType: {
    fontSize: '10px',
    color: 'var(--text-secondary)',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  itemRight: {
    textAlign: 'right',
    flexShrink: 0,
  },
  accBalance: {
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  tapPrompt: {
    fontSize: '8px',
    color: 'var(--text-secondary)',
    opacity: 0.6,
    fontWeight: '600',
  },
  drawer: {
    paddingBottom: '30px',
  },
  drawerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  drawerHeaderTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  drawerTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  drawerSubtitle: {
    fontSize: '10px',
    color: 'var(--text-secondary)',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  closeBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    padding: 0,
  },
  drawerBalanceCard: {
    padding: '16px',
    borderRadius: '16px',
    textAlign: 'center',
    marginBottom: '16px',
  },
  balCardLabel: {
    fontSize: '9px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    letterSpacing: '0.8px',
  },
  balCardValue: {
    fontSize: '26px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    marginTop: '4px',
  },
  deleteAccBtn: {
    width: '100%',
    height: '38px',
    border: '1px solid var(--color-expense)',
    color: 'var(--color-expense)',
    fontSize: '11px',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  editBalanceBtn: {
    width: '100%',
    height: '38px',
    border: '1px solid var(--accent-color)',
    color: 'var(--accent-color)',
    fontSize: '11px',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  ledgerHeader: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '10px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: '6px',
  },
  drawerTxList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxHeight: '220px',
    overflowY: 'auto',
  },
  emptyLedger: {
    padding: '12px',
    fontSize: '11px',
    color: 'var(--text-secondary)',
    textAlign: 'center',
    borderRadius: '10px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ledgerItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 10px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  ledgerNotes: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    display: 'block',
  },
  ledgerDate: {
    fontSize: '8px',
    color: 'var(--text-secondary)',
    display: 'block',
    marginTop: '1px',
  },
  ledgerAmount: {
    fontSize: '11px',
    fontWeight: '700',
  },
  modal: {
    paddingBottom: '30px',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  modalTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  closeModalBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    padding: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  formLabel: {
    fontSize: '9px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    letterSpacing: '0.5px',
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
  colorPalette: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    marginTop: '4px',
  },
  colorCircle: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    cursor: 'pointer',
    padding: 0,
  },
  saveFormBtn: {
    height: '42px',
    marginTop: '10px',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    borderRadius: '10px',
    backgroundColor: 'var(--bg-color)',
    marginBottom: '10px',
  },
  errorText: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--color-expense)',
  },
};
