import { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft, Plus, Calendar, Bell, BellRing,
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
  scheduleReminderNotification,
  cancelAllNotifications,
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
  lang,
}) {
  // Safeguard against undefined/null props
  const safeReminders = reminders || [];
  const safeAccounts = accounts || [];
  const safeCategories = categories || [];

  const [filterTab, setFilterTab] = useState('unpaid');
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

  // Notification state — uses @capacitor/local-notifications on Android
  const [permission, setPermission] = useState('default');
  const supported = isNotificationSupported();
  const showNotifSection = supported && permission !== 'unsupported';

  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    const stored = localStorage.getItem('pocket_khata_notifications_enabled');
    return stored === null ? true : stored === 'true';
  });
  const [reminderAlertsEnabled, setReminderAlertsEnabled] = useState(() => {
    const stored = localStorage.getItem('pocket_khata_reminder_alerts_enabled');
    return stored === null ? true : stored === 'true';
  });

  useEffect(() => {
    if (supported) {
      getNotificationPermission().then(setPermission).catch(() => {});
    }
  }, [supported]);

  const handleToggleNotifications = async () => {
    try {
      if (permission !== 'granted') {
        const result = await requestNotificationPermission();
        setPermission(result);
        if (result !== 'granted') return;
      }
      const newVal = !notificationsEnabled;
      setNotificationsEnabled(newVal);
      localStorage.setItem('pocket_khata_notifications_enabled', String(newVal));
      if (newVal && safeReminders.length > 0) {
        // Schedule notifications for all unpaid reminders
        for (const rem of safeReminders) {
          if (rem.status === 'unpaid') {
            await scheduleReminderNotification(rem);
          }
        }
      } else {
        await cancelAllNotifications();
      }
    } catch {
      // Silently fail
    }
  };

  const handleToggleReminderAlerts = () => {
    const newVal = !reminderAlertsEnabled;
    setReminderAlertsEnabled(newVal);
    localStorage.setItem('pocket_khata_reminder_alerts_enabled', String(newVal));
  };

  // Filtered lists
  const today = new Date().toISOString().split('T')[0];

  const processedReminders = useMemo(() => {
    return safeReminders.map(rem => ({
      ...rem,
      isOverdue: rem.status === 'unpaid' && rem.dueDate < today,
    })).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  }, [safeReminders, today]);

  const filteredReminders = useMemo(() => {
    if (filterTab === 'unpaid') return processedReminders.filter(r => r.status === 'unpaid');
    if (filterTab === 'paid') return processedReminders.filter(r => r.status === 'paid');
    return processedReminders;
  }, [processedReminders, filterTab]);

  // Hydrate form when editing
  useEffect(() => {
    if (editingReminder) {
      setName(editingReminder.name || '');
      setAmount(String(editingReminder.amount || ''));
      setDueDate(editingReminder.dueDate || '');
      setCategoryId(editingReminder.categoryId || '');
      setShowAddModal(true);
    }
  }, [editingReminder]);

  const handleSave = () => {
    try {
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

      if (editingReminder && editingReminder.id) {
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

      setName('');
      setAmount('');
      setDueDate('');
      setCategoryId('');
      trackAction(editingReminder ? 'edit_reminder' : 'add_reminder', { categoryId, amount: parsedAmount });
      setEditingReminder(null);
      setShowAddModal(false);
    } catch {
      setEditingReminder(null);
      setShowAddModal(false);
    }
  };

  const triggerQuickPay = (reminder) => {
    setSelectedReminderToPay(reminder);
    setShowPaySelectModal(true);
  };

  const openNewReminder = () => {
    try {
      setEditingReminder(null);
      setName('');
      setAmount('');
      setDueDate('');
      setCategoryId('');
      setFormError('');
      setShowAddModal(true);
    } catch {
      setShowAddModal(false);
    }
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
    const cat = safeCategories.find(c => c.id === catId);
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

      {/* Notification Toggles — clean, no warning banners */}
      {showNotifSection && (
        <div className="neo-raised-sm" style={styles.notifToggleSection}>
          <label style={styles.toggleRow}>
            <div style={styles.toggleLabelGroup}>
              <span style={styles.toggleTitle}>{t('notif.enableToggle', lang)}</span>
              <span style={styles.toggleDesc}>{t('notif.enableToggleDesc', lang)}</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={handleToggleNotifications}
              />
              <span className="toggle-slider" />
            </label>
          </label>
          <label style={{ ...styles.toggleRow, marginTop: '4px' }}>
            <div style={styles.toggleLabelGroup}>
              <span style={styles.toggleTitle}>{t('notif.reminderAlerts', lang)}</span>
              <span style={styles.toggleDesc}>{t('notif.reminderAlertsDesc', lang)}</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={reminderAlertsEnabled}
                onChange={handleToggleReminderAlerts}
                disabled={!notificationsEnabled}
              />
              <span className="toggle-slider" />
            </label>
          </label>
          {/* Permission denied hint */}
          {permission === 'denied' && notificationsEnabled && (
            <div style={styles.notifDeniedHint}>
              <span style={styles.notifDeniedText}>
                {t('notif.permissionDenied', lang)} — {t('notif.permissionDeniedHint', lang)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Tabs segment controller */}
      <div className="neo-pressed-sm" style={styles.segmentContainer}>
        {['unpaid', 'paid', 'all'].map(tab => (
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
                    textDecoration: rem.status === 'paid' ? 'line-through' : 'none',
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
                    ৳{formatNumber(rem.amount, lang)}
                  </span>
                </div>
              </div>
              <div style={styles.cardRight}>
                {rem.status === 'unpaid' ? (
                  <div style={styles.actionPanel}>
                    <button
                      className="neo-btn neo-btn-primary"
                      style={styles.payBtn}
                      onClick={(e) => { e.stopPropagation(); triggerQuickPay(rem); }}
                    >
                      <CheckCircle size={12} /> {t('pay', lang)}
                    </button>
                    <button
                      className="neo-btn"
                      style={styles.deleteCardBtn}
                      onClick={(e) => { e.stopPropagation(); onDeleteReminder(rem.id); trackAction('delete_reminder', { reminderId: rem.id }); }}
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
                      onClick={(e) => { e.stopPropagation(); onDeleteReminder(rem.id); trackAction('delete_reminder', { reminderId: rem.id }); }}
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

      {/* Add/Edit Modal */}
      {showAddModal && (
        <>
          <div className="drawer-overlay" onClick={() => setShowAddModal(false)} />
          <div className="bottom-drawer" style={styles.modal}>
            <div className="drawer-header">
              <h3 style={styles.modalTitle}>{editingReminder ? t('reminders.editReminder', lang) : t('reminders.newReminder', lang)}</h3>
              <button className="neo-btn" style={styles.closeModalBtn} onClick={() => setShowAddModal(false)}>
                <X size={16} />
              </button>
            </div>
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
                    {safeCategories.map(cat => (
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

      {/* Pay Select Modal */}
      {showPaySelectModal && selectedReminderToPay && (
        <>
          <div className="drawer-overlay" onClick={() => { setShowPaySelectModal(false); setSelectedReminderToPay(null); }} />
          <div className="bottom-drawer" style={styles.paySelectModal}>
            <div className="drawer-header">
              <h3 style={styles.modalTitle}>{t('reminders.selectPayAccount', lang)}</h3>
              <button className="neo-btn" style={styles.closeModalBtn} onClick={() => { setShowPaySelectModal(false); setSelectedReminderToPay(null); }}>
                <X size={16} />
              </button>
            </div>
            <div className="drawer-scrollable">
              <p style={styles.payPromptText}>
                {t('reminders.postExpense', lang)} <strong>৳{formatNumber(selectedReminderToPay.amount, lang)}</strong> {t('reminders.expenseFor', lang)} <strong>{selectedReminderToPay.name}</strong> {t('reminders.from', lang)}
              </p>
              <div style={styles.accountsDeck}>
                {safeAccounts.map(acc => (
                  <button
                    key={acc.id}
                    className="neo-btn"
                    onClick={() => executePay(acc.id)}
                    style={{
                      ...styles.accountPayBtn,
                      borderLeft: `4px solid ${acc.color || 'var(--accent-color)'}`,
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
    marginBottom: '12px',
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
  notifToggleSection: {
    padding: '10px 12px',
    borderRadius: '14px',
    marginBottom: '12px',
    backgroundColor: 'var(--bg-color)',
  },
  toggleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    padding: '6px 2px',
  },
  toggleLabelGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    flex: 1,
    minWidth: 0,
    paddingRight: '10px',
  },
  toggleTitle: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    lineHeight: '1.3',
  },
  toggleDesc: {
    fontSize: '9px',
    fontWeight: '400',
    color: 'var(--text-secondary)',
    lineHeight: '1.3',
  },
  notifDeniedHint: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginTop: '6px',
    padding: '4px 0',
  },
  notifDeniedText: {
    fontSize: '9px',
    fontWeight: '500',
    color: 'var(--text-secondary)',
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
  modal: {},
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
  paySelectModal: {},
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
