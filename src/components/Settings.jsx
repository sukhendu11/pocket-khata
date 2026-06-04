import { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, Bell, RefreshCw, Upload, Home,
  Info, CheckCircle, XCircle, FileText
} from 'lucide-react';
import { generatePDFReport } from '../lib/pdf';
import { saveString } from '../lib/download';
import PropTypes from 'prop-types';
import { t } from '../i18n';
import { trackAction } from '../lib/analytics';
import { db } from '../db';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  createNotificationChannel,
  sendTestNotification,
  cancelAllNotifications,
  rescheduleAllReminders,
} from '../notifications';

export default function Settings({
  onExportDatabase,
  onImportDatabase,
  onResetDatabase,
  transactions,
  accounts,
  categories,
  budgets,
  reminders,
  onNavigate,
  lang
}) {

  // PDF Report State
  const [reportPeriod, setReportPeriod] = useState('thisMonth');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [reportSections, setReportSections] = useState({
    summary: true,
    accounts: true,
    transactions: true,
    analytics: true,
  });

  // Toast notification state
  const [toast, setToast] = useState(null);

  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleExportPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      await generatePDFReport({
        periodKey: reportPeriod,
        transactions,
        accounts,
        categories,
        budgets,
        lang,
        sections: reportSections,
      });
      const periodLabel = {
        thisMonth: t('reports.thisMonth', lang),
        lastMonth: t('reports.lastMonth', lang),
        last3Months: t('reports.last3Months', lang),
        last6Months: t('reports.last6Months', lang),
        thisYear: t('reports.thisYear', lang),
      }[reportPeriod] || reportPeriod;
      setToast({
        type: 'success',
        message: `${periodLabel} ${t('reports.exportedPDF', lang) || 'PDF saved to Documents'}`,
      });
    } catch (e) {
      console.error('PDF export failed:', e);
      setToast({
        type: 'error',
        message: t('reports.exportFailed', lang) || 'PDF export failed. Please try again.',
      });
    }
    setIsGeneratingPDF(false);
  };

  // JSON Export download
  const handleExportJSON = async () => {
    const jsonStr = onExportDatabase();
    trackAction('export_json', { transactionCount: transactions.length });
    const filename = `Pocket_Khata_Backup_${new Date().toISOString().split('T')[0]}.json`;
    try {
      await saveString(jsonStr, filename);
      setToast({
        type: 'success',
        message: `${t('settings.exportedJSON', lang) || 'Backup saved to Documents'}: ${filename}`,
      });
    } catch (e) {
      console.error('JSON export failed:', e);
      setToast({
        type: 'error',
        message: t('settings.exportFailed', lang) || 'Backup export failed. Please try again.',
      });
    }
  };

  // ── Notification Toggle ──
  // Toggle ON  → request native Android permission, create channel
  // Toggle OFF → cancel all delivered/scheduled notifications, persist opt-out
  //
  // The toggle reflects TWO independent signals:
  //   1. Real Android permission (checkPermissions) — the actual OS state
  //   2. User opt-out (localStorage) — the user explicitly disabled notifications
  // A user can have 'granted' permission but have the toggle OFF (opt-out).
  // Always shown, but on non-native platforms it stores preference for when the
  // user switches to an Android device.
  const notifSupported = isNotificationSupported();
  const [notifPermission, setNotifPermission] = useState('default');
  const [notificationsOptedOut, setNotificationsOptedOut] = useState(() => {
    return localStorage.getItem('pocket_khata_notifications_opted_out') === 'true';
  });

  // The toggle reflects the user's opt-out preference (separate from OS permission)
  const notificationsEnabled = !notificationsOptedOut;
  const notifUnsupported = notifPermission === 'unsupported';
  const notifPermissionBlocked = !notifUnsupported && notifPermission !== 'granted';

  useEffect(() => {
    getNotificationPermission().then((perm) => {
      setNotifPermission(perm);
    }).catch(() => {});
  }, []);

  const handleToggleNotifications = async () => {
    if (notificationsEnabled) {
      // Toggle OFF — cancel all notifications, persist opt-out
      if (notifSupported) {
        try {
          await cancelAllNotifications();
        } catch (e) {
          // Best-effort
        }
      }
      localStorage.setItem('pocket_khata_notifications_opted_out', 'true');
      setNotificationsOptedOut(true);
      setToast({ type: 'success', message: t('notif.disabled', lang) || 'Notifications disabled' });
      return;
    }
    // Toggle ON
    if (notifSupported) {
      // On native: request real system permission
      const result = await requestNotificationPermission();
      setNotifPermission(result);
      if (result === 'granted') {
        await createNotificationChannel();
        localStorage.removeItem('pocket_khata_notifications_opted_out');
        setNotificationsOptedOut(false);
        // Re-schedule all existing unpaid reminders immediately
        rescheduleAllReminders(reminders);
        setToast({ type: 'success', message: t('notif.enabled', lang) || 'Notifications active' });
      } else {
        setToast({ type: 'error', message: t('notif.permissionDenied', lang) || 'Notification permission was denied. Enable it in your device settings.' });
      }
    } else {
      // On browser/web: just store preference (notifications work on Android)
      localStorage.removeItem('pocket_khata_notifications_opted_out');
      setNotificationsOptedOut(false);
      setToast({ type: 'success', message: t('notif.enabled', lang) || 'Preference saved. Notifications will work on your Android device.' });
    }
  };


  // JSON Import — simple file picker, direct import after validation
  const fileInputRef = useRef(null);

  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const jsonString = evt.target.result;
        JSON.parse(jsonString); // validate
        const success = onImportDatabase(jsonString);
        if (success) {
          setToast({ type: 'success', message: t('settings.importSuccess', lang) });
        } else {
          setToast({ type: 'error', message: t('settings.importFailed', lang) });
        }
      } catch {
        setToast({ type: 'error', message: t('settings.importError', lang) });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };


  return (
    <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
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
            <h2 style={{ ...styles.title, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('settings.title', lang)}</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              className="neo-btn neo-btn-round home-btn"
              style={{ width: '36px', height: '36px', borderRadius: '50%', padding: 0 }}
              title={t('common.home', lang)}
              aria-label={t('common.home', lang)}
              onClick={() => { onNavigate('dashboard'); trackAction('home_nav', { source: 'settings' }); }}
            >
              <Home size={18} />
            </button>
          </div>
        </div>

        <div style={styles.content}>

          {/* SECTION 1: Financial Reports */}
          <div className="neo-raised" style={styles.card}>
            <div style={styles.cardHeader}>
              <FileText size={16} style={{ color: 'var(--accent-color)' }} />
              <h3 style={styles.cardTitle}>{t('reports.title', lang)}</h3>
            </div>

            <p style={styles.cardDesc}>
              {t('reports.exportDesc', lang)}
            </p>

            {/* Period Selector */}
            <div style={styles.formGroup}>
              <label htmlFor="report-period" style={styles.formLabel}>{t('reports.selectPeriod', lang)}</label>
              <select
                id="report-period"
                className="neo-pressed-sm"
                style={styles.formSelect}
                value={reportPeriod}
                onChange={(e) => setReportPeriod(e.target.value)}
              >
                <option value="thisMonth">{t('reports.thisMonth', lang)}</option>
                <option value="lastMonth">{t('reports.lastMonth', lang)}</option>
                <option value="last3Months">{t('reports.last3Months', lang)}</option>
                <option value="last6Months">{t('reports.last6Months', lang)}</option>
                <option value="thisYear">{t('reports.thisYear', lang)}</option>
              </select>
            </div>

            {/* Section Toggles */}
            <span id="section-toggles-label" style={styles.formLabel}>{t('reports.sectionSelect', lang)}</span>
            <div style={styles.sectionToggles} role="group" aria-labelledby="section-toggles-label">
              <label style={styles.checkboxLabel}>
                <input type="checkbox" id="section-summary" checked={reportSections.summary}
                  onChange={(e) => setReportSections(s => ({ ...s, summary: e.target.checked }))} />
                <span style={styles.checkboxText}>{t('reports.sectionSummary', lang)}</span>
              </label>
              <label style={styles.checkboxLabel}>
                <input type="checkbox" id="section-accounts" checked={reportSections.accounts}
                  onChange={(e) => setReportSections(s => ({ ...s, accounts: e.target.checked }))} />
                <span style={styles.checkboxText}>{t('reports.sectionAccounts', lang)}</span>
              </label>
              <label style={styles.checkboxLabel}>
                <input type="checkbox" id="section-transactions" checked={reportSections.transactions}
                  onChange={(e) => setReportSections(s => ({ ...s, transactions: e.target.checked }))} />
                <span style={styles.checkboxText}>{t('reports.sectionTransactions', lang)}</span>
              </label>
              <label style={styles.checkboxLabel}>
                <input type="checkbox" id="section-analytics" checked={reportSections.analytics}
                  onChange={(e) => setReportSections(s => ({ ...s, analytics: e.target.checked }))} />
                <span style={styles.checkboxText}>{t('reports.sectionAnalytics', lang)}</span>
              </label>
            </div>

            <button
              className="neo-btn neo-btn-primary"
              style={styles.pdfBtn}
              onClick={handleExportPDF}
              disabled={isGeneratingPDF}
            >
              {isGeneratingPDF ? (
                <><RefreshCw size={14} className="spin-anim" /> {t('settings.generatingPDF', lang)}</>
              ) : (
                <><FileText size={14} /> {t('reports.exportPDF', lang)}</>
              )}
            </button>
          </div>

          {/* SECTION 2: Notifications — always visible, adapts to platform */}
          <div className="neo-raised" style={styles.card}>
            <div style={styles.cardHeader}>
              <Bell size={16} style={{ color: 'var(--accent-color)' }} />
              <h3 style={styles.cardTitle}>{t('notif.title', lang)}</h3>
            </div>

            {/* Status badge — reflects both opt-out preference AND real permission state */}
            <div style={{ marginBottom: '12px' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '9px',
                fontWeight: '700',
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: notifUnsupported
                  ? 'rgba(127,140,141,0.12)'
                  : notifPermissionBlocked
                    ? 'rgba(247,183,49,0.15)'
                    : notificationsEnabled
                      ? 'rgba(34,197,94,0.12)'
                      : 'rgba(239,68,68,0.12)',
                color: notifUnsupported
                  ? 'var(--text-secondary)'
                  : notifPermissionBlocked
                    ? '#f7b731'
                    : notificationsEnabled
                      ? 'var(--color-income)'
                      : 'var(--color-expense)',
              }}>
                {notifUnsupported
                  ? `⚠ ${t('settings.unavailable', lang) || 'Web only — works on Android'}`
                  : notifPermissionBlocked
                    ? `⚠ ${t('notif.permissionDeniedHint', lang) || 'Permission — enable in device settings'}`
                    : notificationsEnabled
                      ? `✓ ${t('notif.enabled', lang)}`
                      : `✗ ${t('notif.disabled', lang)}`
                }
              </span>
            </div>

            <p style={{ ...styles.cardDesc, marginBottom: '12px' }}>
              {notifUnsupported
                ? t('notif.browserDesc', lang)
                : t('notif.notificationDesc', lang)
              }
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-primary)' }}>
                {t('notif.enableToggle', lang)}
              </span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={handleToggleNotifications}
                />
                <span className="toggle-slider" />
              </label>
            </div>

          </div>

          {/* SECTION 3: Data Portability */}
          <div className="neo-raised" style={styles.card}>
            <div style={styles.cardHeader}>
              <Upload size={16} style={{ color: 'var(--accent-color)' }} />
              <h3 style={styles.cardTitle}>{t('settings.dataPortability', lang)}</h3>
            </div>
            <button
              className="neo-btn neo-btn-primary"
              style={{ ...styles.exportBtn, marginBottom: '10px' }}
              onClick={handleExportJSON}
            >
              <Upload size={14} /> {t('settings.exportJSON', lang)}
            </button>
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} style={{ display: 'none' }} />
            <button
              className="neo-btn neo-btn-primary"
              style={{ ...styles.exportBtn, marginBottom: '10px' }}
              onClick={handleImportClick}
            >
              <Upload size={14} style={{ transform: 'rotate(180deg)' }} /> {t('settings.importJSON', lang)}
            </button>

            {/* Reset Data */}
            <button
              className="neo-btn"
              style={{ ...styles.exportBtn, border: '1px solid var(--color-expense)', color: 'var(--color-expense)' }}
              onClick={() => {
                if (window.confirm(t('settings.resetDataConfirm', lang) || 'Are you sure? This will permanently delete all data and cannot be undone.')) {
                  onResetDatabase();
                  setToast({ type: 'success', message: t('settings.resetSuccess', lang) || 'Pocket Khata reset to factory defaults.' });
                }
              }}
            >
              <XCircle size={14} /> {t('settings.resetData', lang)}
            </button>
          </div>

          {/* SECTION 4: Info */}
          <div className="neo-raised" style={styles.card}>
            <div style={styles.cardHeader}>
              <Info size={16} style={{ color: 'var(--accent-color)' }} />
              <h3 style={styles.cardTitle}>{t('about.title', lang)}</h3>
            </div>

            <p style={{ ...styles.cardDesc, marginBottom: '4px', fontWeight: '600', color: 'var(--text-primary)' }}>
              {t('settings.version', lang)} <span style={{ fontWeight: '400', color: 'var(--text-secondary)' }}>v{db.getAppVersion()}</span>
            </p>

            <p style={{ ...styles.cardDesc, marginBottom: '4px' }}>
              {t('settings.dbInfo', lang)} — Schema v{db.getStoredSchemaVersion()}
            </p>

            <p style={styles.cardDesc}>
              {t('about.desc', lang)}
            </p>

            <p style={styles.cardDesc}>
              {t('about.developer', lang)}
            </p>
          </div>

      </div>

    </div>

      {/* Toast notification — positioned in lower area OUTSIDE the scrollable container to avoid overflowY clipping */}
      {toast && (
        <div style={{
          position: 'absolute',
          bottom: '70px',
          left: '10px',
          right: '10px',
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 1000,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-color)',
            border: `1px solid ${toast.type === 'error' ? 'var(--color-expense)' : 'var(--accent-color)'}`,
            color: 'var(--text-primary)',
            fontSize: '12px',
            fontWeight: '600',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.12)',
            pointerEvents: 'auto',
            animation: 'toastSlideUp 0.3s ease-out',
          }}>
            {toast.type === 'error' ? <XCircle size={16} color="var(--color-expense)" /> : <CheckCircle size={16} color="var(--color-income)" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

    </div>
  );
}

Settings.propTypes = {
  onExportDatabase: PropTypes.func,
  onImportDatabase: PropTypes.func,
  onResetDatabase: PropTypes.func,
  transactions: PropTypes.array,
  accounts: PropTypes.array,
  categories: PropTypes.array,
  budgets: PropTypes.array,
  onNavigate: PropTypes.func,
  reminders: PropTypes.array,
  lang: PropTypes.string,
};

const styles = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    minHeight: 0,
    paddingRight: '2px',
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
  title: {
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    minWidth: 0,
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    marginBottom: '30px',
  },
  card: {
    padding: '16px 14px',
    display: 'flex',
    flexDirection: 'column',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  cardTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  cardDesc: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
    marginBottom: '14px',
  },

  exportBtn: {
    width: '100%',
    height: '38px',
    fontSize: '12px',
    justifyContent: 'center',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginBottom: '10px',
  },
  formLabel: {
    fontSize: '9px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    letterSpacing: '0.5px',
    marginBottom: '2px',
  },
  formSelect: {
    appearance: 'none',
    cursor: 'pointer',
    color: 'var(--text-primary)',
    backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%237f8c8d' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 16px center',
    backgroundSize: '16px',
    paddingRight: '40px',
  },
  pdfBtn: {
    width: '100%',
    height: '38px',
    fontSize: '12px',
    justifyContent: 'center',
  },
  sectionToggles: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginBottom: '14px',
    marginTop: '2px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    padding: '4px 2px',
  },
  checkboxText: {
    fontSize: '11px',
    color: 'var(--text-primary)',
    fontWeight: '500',
  },
  footer: {
    textAlign: 'center',
    fontSize: '10px',
    color: 'var(--text-secondary)',
    opacity: 0.6,
    marginTop: '10px',
    fontWeight: '500',
  },
};
