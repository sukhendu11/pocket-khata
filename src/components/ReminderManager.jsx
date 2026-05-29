import { useState, useMemo, useEffect } from 'react';
import { 
  ArrowLeft, Plus, Calendar, BellRing, Bell, BellOff, DollarSign, 
  CheckCircle, AlertCircle, Trash2, X, CreditCard 
} from 'lucide-react';
import PropTypes from 'prop-types';
import { t } from '../i18n';
import { formatNumber } from '../utils';
import { trackAction } from '../lib/analytics';
import { 
  getNotificationPermission, 
  requestNotificationPermission, 
  isNotificationSupported,
  isServiceWorkerActive 
} from '../notifications';

export default function ReminderManager({
  reminders,
  accounts,
  categories,
  onAddReminder,
  onUpdateReminder,
  onPayReminder,
  onDeleteReminder,
  onNavigate,
  lang
}) {
  const [filterTab, setFilterTab] = useState('unpaid'); // 'unpaid', 'paid', 'all'
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaySelectModal, setShowPaySelectModal] = useState(false);
  const [selectedReminderToPay, setSelectedReminderToPay] = useState(null);
  const [editingReminder, setEditingReminder] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [formError, setFormError] = useState('');

  // 1. Notification permission state
  const [notifState, setNotifState] = useState({
    permission: getNotificationPermission(),
    supported: isNotificationSupported(),
    swActive: false,
  });

  useEffect(() => {
    // Check service worker status asynchronously
    isServiceWorkerActive().then((active) => {
      setNotifState((prev) => ({ ...prev, swActive: active }));
    });
  }, []);

  const handleRequestNotificationPermission = async () => {
    const result = await requestNotificationPermission();
    setNotifState((prev) => ({ ...prev, permission: result }));
    trackAction('request_notification_permission', { result });
  };

  // 2. Filtered lists
  const today = new Date().toISOString().split('T')[0];

  const processedReminders = useMemo(() => {
    return reminders.map(rem => {
      const isOverdue = rem.status === 'unpaid' && rem.dueDate < today;
      return {
        ...rem,
        isOverdue,
      };
    }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  }, [reminders, today]);

  const filteredReminders = useMemo(() => {
    if (filterTab === 'unpaid') {
      return processedReminders.filter(r => r.status === 'unpaid');
    }
    if (filterTab === 'paid') {
      return processedReminders.filter(r => r.status === 'paid');
    }
    return processedReminders;
  }, [processedReminders, filterTab]);

  // Hydrate form when editing
  useEffect(() => {
    if (editingReminder) {
      setName(editingReminder.name);
      setAmount(editingReminder.amount.toString());
      setDueDate(editingReminder.dueDate);
      setCategoryId(editingReminder.categoryId);
      setShowAddModal(true);
    }
  }, [editingReminder]);

  // 2. Form submission
  const handleSave = () => {
    setFormError('');

    if (!name.trim()) {
      setFormError(t('reminders.errName', lang));
      return;
    }

    const parsedAmount = Number(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError(t('reminders.errAmount', lang));
      return;
    }

    if (!dueDate) {
      setFormError(t('reminders.errDate', lang));
      return;
    }

    if (!categoryId) {
      setFormError(t('reminders.errCategory', lang));
      return;
    }

    try {
      if (editingReminder) {
        onUpdateReminder({
          ...editingReminder,
          name: name.trim(),
          amount: parsedAmount,
          dueDate,
          categoryId,
        });
      } else {
        onAddReminder({
          name: name.trim(),
          amount: parsedAmount,
          dueDate,
          categoryId,
          status: 'unpaid',
        });
      }

      // Reset and close
      setName('');
      setAmount('');
      setDueDate('');
      setCategoryId('');
      trackAction(editingReminder ? 'edit_reminder' : 'add_reminder', { categoryId, amount: parsedAmount });
      setEditingReminder(null);
      setShowAddModal(false);
    } catch (e) {
      console.error('Failed to save reminder:', e);
      setFormError('An error occurred while saving. Please try again.');
    }
  };

  // 3. Initiate Quick Pay
  const triggerQuickPay = (reminder) => {
    setSelectedReminderToPay(reminder);
    setShowPaySelectModal(true);
  };

  const openNewReminder = () => {
    setEditingReminder(null);
    setName('');
    setAmount('');
    setDueDate('');
    setCategoryId('');
    setFormError('');
    setShowAddModal(true);
  };

  const handleEdit = (rem) => {
    setEditingReminder(rem);
  };

  const executePay = (sourceAccountId) => {
    if (selectedReminderToPay && sourceAccountId) {
      trackAction('pay_reminder', { reminderId: selectedReminderToPay.id, amount: selectedReminderToPay.amount, sourceAccountId });
      onPayReminder(selectedReminderToPay.id, sourceAccountId);
      setShowPaySelectModal(false);
      setSelectedReminderToPay(null);
    }
  };

  const getCategoryColor = (catId) => {
    const cat = categories.find(c => c.id === catId);
    return cat ? cat.color : 'var(--accent-color)';
  };

  return (
    <div style={styles.container}>
      
      {/* Header Bar */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <button className="neo-btn neo-btn-round" style={styles.backBtn} onClick={() => onNavigate('dashboard')}>
            <ArrowLeft size={18} />
          </button>
          <div onClick={() => onNavigate('dashboard')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <img src="/pocket-khata-logo.png" alt="" className="header-logo-sm" />
          </div>
          <h2 style={{ ...styles.title, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('reminders.title', lang)}</h2>
        </div>
        <button className="neo-btn neo-btn-round" style={styles.addBtn} onClick={openNewReminder}>
          <Plus size={18} />
        </button>
      </div>

      {/* Notification Permission Banner */}
      {notifState.supported && notifState.permission !== 'granted' && (
        <div className="neo-raised-sm" style={styles.notifBanner}>
          <div style={styles.notifBannerContent}>
            <Bell size={16} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
            <div style={styles.notifBannerText}>
              <span style={styles.notifBannerTitle}>{t('notif.title', lang)}</span>
              <span style={styles.notifBannerDesc}>{t('notif.desc', lang)}</span>
            </div>
          </div>
          {notifState.permission === 'denied' ? (
            <span style={styles.notifDeniedText}>{t('notif.permissionDenied', lang)}</span>
          ) : (
            <button
              className="neo-btn neo-btn-primary"
              style={styles.notifEnableBtn}
              onClick={handleRequestNotificationPermission}
            >
              <Bell size={12} /> {t('notif.enable', lang)}
            </button>
          )}
        </div>
      )}

      {/* Permission granted banner */}
      {notifState.supported && notifState.permission === 'granted' && (
        <div className="neo-pressed-sm" style={styles.notifBannerGranted}>
          <Bell size={12} style={{ color: 'var(--color-income)' }} />
          <span style={styles.notifGrantedText}>{t('notif.enabled', lang)}</span>
        </div>
      )}

      {/* Unsupported browser warning */}
      {!notifState.supported && (
        <div className="neo-pressed-sm" style={styles.notifBannerDenied}>
          <BellOff size={12} style={{ color: 'var(--color-expense)' }} />
          <span style={styles.notifDeniedText}>{t('notif.permissionUnsupported', lang)}</span>
        </div>
      )}

      {/* Tabs segment controller */}
      <div className="neo-pressed-sm" style={styles.segmentContainer}>          {['unpaid', 'paid', 'all'].map(tab => (
          <button
            key={tab}
            onClick={() => setFilterTab(tab)}
            className="neo-btn"
            style={{
              ...styles.segmentBtn,
              boxShadow: filterTab === tab ? 'var(--neomorphic-raised-sm)' : 'none',
              color: filterTab === tab ? 'var(--accent-color)' : 'var(--text-secondary)',
              fontWeight: filterTab === tab ? '700' : '500',
              border: filterTab === tab ? '1px solid rgba(255,255,255,0.4)' : '1px solid transparent',
            }}
          >
            {tab === 'unpaid' ? t('unpaid', lang).toUpperCase() : tab === 'paid' ? t('paid', lang).toUpperCase() : t('txHistory.allTransactions', lang).toUpperCase()}
          </button>
        ))}
      </div>

      {/* Reminders List */}
      <div style={styles.listContainer}>
        {filteredReminders.length === 0 ? (
          <div className="neo-pressed-sm" style={styles.emptyState}>
            <BellRing size={28} style={{ color: 'var(--text-secondary)', opacity: 0.5, marginBottom: '8px' }} />
            <p>{t('reminders.noReminders', lang)}</p>
          </div>
        ) : (
          filteredReminders.map(rem => (
            <div 
              key={rem.id} 
              className={rem.status === 'paid' ? 'neo-pressed-sm' : 'neo-raised-sm'} 
              style={{
                ...styles.reminderCard,
                boxShadow: rem.isOverdue 
                  ? '0 0 12px rgba(255,94,87,0.25), var(--neomorphic-raised-sm)' 
                  : rem.status === 'paid'
                    ? 'var(--neomorphic-pressed-sm)'
                    : 'var(--neomorphic-raised-sm)',
                borderLeft: `4px solid ${getCategoryColor(rem.categoryId)}`,
                opacity: rem.status === 'paid' ? 0.75 : 1,
                cursor: rem.status === 'unpaid' ? 'pointer' : 'default',
              }}
              onClick={() => rem.status === 'unpaid' && handleEdit(rem)}
            >
              <div style={styles.cardLeft}>
                <div style={styles.cardHeaderInfo}>
                  <h4 style={{ 
                    ...styles.billName, 
                    textDecoration: rem.status === 'paid' ? 'line-through' : 'none' 
                  }}>
                    {rem.name}
                  </h4>
                  {rem.isOverdue && (
                    <span style={styles.overdueBadge}>
                      <AlertCircle size={10} /> {t('overdue', lang)}
                    </span>
                  )}
                </div>

                <div style={styles.metaRow}>
                  <span style={styles.metaItem}>
                    <Calendar size={10} /> {t('reminders.due', lang)} {rem.dueDate}
                  </span>
                  <span style={styles.metaItem}>
                    <DollarSign size={10} /> ৳{formatNumber(rem.amount, lang)}
                  </span>
                </div>
              </div>

              <div style={styles.cardRight}>
                {rem.status === 'unpaid' ? (
                  <div style={styles.actionPanel}>
                    <button 
                      className="neo-btn neo-btn-primary" 
                      style={styles.payBtn}
                      onClick={() => triggerQuickPay(rem)}
                    >
                      <CheckCircle size={12} /> {t('pay', lang)}
                    </button>
                    <button 
                      className="neo-btn" 
                      style={styles.deleteCardBtn}
                      onClick={() => { onDeleteReminder(rem.id); trackAction('delete_reminder', { reminderId: rem.id }); }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ) : (
                  <div style={styles.paidBadge}>
                    <CheckCircle size={14} style={{ color: 'var(--color-income)' }} />
                    <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--color-income)' }}>{t('paid', lang)}</span>
                    <button 
                      className="neo-btn" 
                      style={styles.deleteCardBtnMuted}
                      onClick={() => { onDeleteReminder(rem.id); trackAction('delete_reminder', { reminderId: rem.id }); }}
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Slide-over Modal to Add Reminder */}
      {showAddModal && (
        <>
          <div className="drawer-overlay" onClick={() => setShowAddModal(false)} />
          <div className="bottom-drawer" style={styles.modal}>
            {/* Fixed Header — title + close X button (always visible) */}
            <div className="drawer-header">
              <h3 style={styles.modalTitle}>{editingReminder ? t('reminders.editReminder', lang) : t('reminders.newReminder', lang)}</h3>
              <button className="neo-btn" style={styles.closeModalBtn} onClick={() => setShowAddModal(false)}>
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="drawer-scrollable">

            {formError && (
              <div className="neo-pressed-sm" style={styles.errorBox}>
                <AlertCircle size={14} style={{ color: 'var(--color-expense)' }} />
                <span style={styles.errorText}>{formError}</span>
              </div>
            )}

            <div style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>{t('reminders.billName', lang)}</label>
                <input
                  type="text"
                  placeholder={t('reminders.billNamePlaceholder', lang)}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="neo-input"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>{t('reminders.billAmount', lang)}</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="neo-input"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>{t('reminders.dueDate', lang)}</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="neo-input"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>{t('reminders.category', lang)}</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="neo-input"
                  style={styles.select}
                >
                  <option value="" disabled style={styles.option}>{t('reminders.selectCategory', lang)}</option>
                  {(categories || []).map(cat => (
                    <option key={cat.id} value={cat.id} style={styles.option}>
                      {cat.name} ({t(cat.type === 'income' ? 'income' : 'expense', lang).toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <button className="neo-btn neo-btn-primary" style={styles.saveFormBtn} onClick={handleSave}>
                {editingReminder ? t('reminders.updateReminder', lang) : t('reminders.createReminder', lang)}
              </button>
            </div>
            </div>
          </div>
        </>
      )}

      {/* Slide-over Modal to Select Account for Quick Pay */}
      {showPaySelectModal && selectedReminderToPay && (
        <>
          <div className="drawer-overlay" onClick={() => { setShowPaySelectModal(false); setSelectedReminderToPay(null); }} />
          <div className="bottom-drawer" style={styles.paySelectModal}>
            {/* Fixed Header — title + close X button (always visible) */}
            <div className="drawer-header">
              <h3 style={styles.modalTitle}>{t('reminders.selectPayAccount', lang)}</h3>
              <button className="neo-btn" style={styles.closeModalBtn} onClick={() => { setShowPaySelectModal(false); setSelectedReminderToPay(null); }}>
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="drawer-scrollable">
            
            <p style={styles.payPromptText}>
              {t('reminders.postExpense', lang)} <strong>৳{formatNumber(selectedReminderToPay.amount, lang)}</strong> {t('reminders.expenseFor', lang)} <strong>{selectedReminderToPay.name}</strong> {t('reminders.from', lang)}
            </p>

            <div style={styles.accountsDeck}>
              {(accounts || []).map(acc => (
                <button
                  key={acc.id}
                  className="neo-btn"
                  onClick={() => executePay(acc.id)}
                  style={{
                    ...styles.accountPayBtn,
                    borderLeft: `4px solid ${acc.color || 'var(--accent-color)'}`
                  }}
                >
                  <div style={styles.accPayLeft}>
                    <CreditCard size={14} style={{ color: acc.color }} />
                    <span style={styles.accPayName}>{acc.name}</span>
                  </div>
                  <span style={styles.accPayBal}>৳{formatNumber(acc.balance, lang)}</span>
                </button>
              ))}
            </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
}

ReminderManager.propTypes = {
  reminders: PropTypes.array,
  accounts: PropTypes.array,
  categories: PropTypes.array,
  onAddReminder: PropTypes.func,
  onUpdateReminder: PropTypes.func,
  onPayReminder: PropTypes.func,
  onDeleteReminder: PropTypes.func,
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
    minWidth: 0,
  },
  segmentContainer: {
    display: 'flex',
    padding: '4px',
    borderRadius: '16px',
    marginBottom: '20px',
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
  listContainer: {
    flex: 1,
    overflowY: 'auto',
    paddingRight: '2px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  emptyState: {
    padding: '40px 20px',
    textAlign: 'center',
    fontSize: '13px',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  reminderCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 14px',
    borderRadius: '16px',
  },
  cardLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minWidth: 0,
  },
  cardHeaderInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  billName: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  overdueBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '8px',
    fontWeight: '700',
    color: 'var(--color-expense)',
    backgroundColor: 'rgba(255,94,87,0.12)',
    padding: '2px 5px',
    borderRadius: '4px',
    textTransform: 'uppercase',
  },
  metaRow: {
    display: 'flex',
    gap: '12px',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '10px',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  cardRight: {
    flexShrink: 0,
  },
  actionPanel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  payBtn: {
    fontSize: '10px',
    padding: '6px 12px',
    borderRadius: '8px',
  },
  deleteCardBtn: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    padding: 0,
    border: '1px solid var(--color-expense)',
    color: 'var(--color-expense)',
  },
  deleteCardBtnMuted: {
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    padding: 0,
    border: '1px solid var(--text-secondary)',
    color: 'var(--text-secondary)',
    opacity: 0.5,
    marginTop: '4px',
  },
  paidBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    minWidth: '50px',
  },
  modal: {
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
    color: 'var(--text-primary)',
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
  paySelectModal: {
  },
  // Notification banner styles
  notifBanner: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px',
    borderRadius: '14px',
    marginBottom: '12px',
    backgroundColor: 'var(--bg-color)',
  },
  notifBannerContent: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
  },
  notifBannerText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  notifBannerTitle: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  notifBannerDesc: {
    fontSize: '10px',
    fontWeight: '400',
    color: 'var(--text-secondary)',
    lineHeight: '1.35',
  },
  notifEnableBtn: {
    fontSize: '10px',
    padding: '6px 12px',
    borderRadius: '8px',
    alignSelf: 'flex-start',
  },
  notifBannerGranted: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    borderRadius: '10px',
    marginBottom: '12px',
    backgroundColor: 'var(--bg-color)',
  },
  notifBannerDenied: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    borderRadius: '10px',
    marginBottom: '12px',
    backgroundColor: 'var(--bg-color)',
  },
  notifGrantedText: {
    fontSize: '10px',
    fontWeight: '600',
    color: 'var(--color-income)',
  },
  notifDeniedText: {
    fontSize: '10px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
  },
  payPromptText: {
    fontSize: '12px',
    color: 'var(--text-primary)',
    marginBottom: '16px',
    lineHeight: '1.4',
  },
  accountsDeck: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  accountPayBtn: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 14px',
    borderRadius: '12px',
    textAlign: 'left',
  },
  accPayLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  accPayName: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  accPayBal: {
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
};
