import { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, RefreshCw, Upload,
  Bell, Info, Shield, CheckCircle, XCircle, FileText
} from 'lucide-react';
import { generatePDFReport } from '../lib/pdf';
import { saveString } from '../lib/download';
import PropTypes from 'prop-types';
import { t } from '../i18n';
import { trackAction, trackError } from '../lib/analytics';
import { db } from '../db';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
} from '../notifications';
import {
  getConsent,
  resetConsent,
  getQueuedEventCount,
  getLastSyncDisplay,
  isTrackingAllowed,
  flushEvents,
} from '../lib/analytics';
import { isSupabaseConfigured } from '../lib/supabase';

export default function Settings({
  onExportDatabase,
  onImportDatabase,
  onResetDatabase,
  transactions,
  accounts,
  categories,
  budgets,
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

  // Notification State
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    const stored = localStorage.getItem('pocket_khata_notifications_enabled');
    return stored === null ? true : stored === 'true';
  });
  const [reminderAlertsEnabled, setReminderAlertsEnabled] = useState(() => {
    const stored = localStorage.getItem('pocket_khata_reminder_alerts_enabled');
    return stored === null ? true : stored === 'true';
  });

  const notifSupported = isNotificationSupported();
  const notifPermission = getNotificationPermission();

  // Sync Now state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null); // null | 'success' | 'error'

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      await flushEvents();
      setSyncResult('success');
      // Reset feedback after 3 seconds
      setTimeout(() => setSyncResult(null), 3000);
    } catch (e) {
      trackError(e, { handler: 'handleSyncNow' });
      setSyncResult('error');
      setTimeout(() => setSyncResult(null), 3000);
    }
    setIsSyncing(false);
  };

  const handleToggleNotifications = async () => {
    if (!notificationsEnabled && notifPermission !== 'granted') {
      // Turning on — request permission first
      await requestNotificationPermission();
      // Re-check permission after user responds
      if (getNotificationPermission() !== 'granted') {
        // User denied the request — don't toggle on
        return;
      }
    }
    const newVal = !notificationsEnabled;
    setNotificationsEnabled(newVal);
    localStorage.setItem('pocket_khata_notifications_enabled', String(newVal));
    trackAction('toggle_notifications', { enabled: newVal });
  };

  const handleToggleReminderAlerts = () => {
    const newVal = !reminderAlertsEnabled;
    setReminderAlertsEnabled(newVal);
    localStorage.setItem('pocket_khata_reminder_alerts_enabled', String(newVal));
    trackAction('toggle_reminder_alerts', { enabled: newVal });
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

  // Reset Data State
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleResetData = () => {
    setShowResetConfirm(false);
    if (onResetDatabase) {
      onResetDatabase();
      alert(t('settings.resetSuccess', lang));
      if (onNavigate) onNavigate('dashboard');
    }
  };

  // JSON Import via file input
  const fileInputRef = useRef(null);

  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const jsonString = evt.target.result;
      const success = onImportDatabase(jsonString);
      trackAction('import_json', { success });
      if (success) {
        alert(t('settings.importSuccess', lang));
      } else {
        alert(t('settings.importError', lang));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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
          <h2 style={{ ...styles.title, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('settings.title', lang)}</h2>
        </div>
        <div style={{ width: '36px' }} /> {/* alignment placeholder */}
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
            <label style={styles.formLabel}>{t('reports.selectPeriod', lang)}</label>
            <select
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
          <label style={styles.formLabel}>{t('reports.sectionSelect', lang)}</label>
          <div style={styles.sectionToggles}>
            <label style={styles.checkboxLabel}>
              <input type="checkbox" checked={reportSections.summary}
                onChange={(e) => setReportSections(s => ({ ...s, summary: e.target.checked }))} />
              <span style={styles.checkboxText}>{t('reports.sectionSummary', lang)}</span>
            </label>
            <label style={styles.checkboxLabel}>
              <input type="checkbox" checked={reportSections.accounts}
                onChange={(e) => setReportSections(s => ({ ...s, accounts: e.target.checked }))} />
              <span style={styles.checkboxText}>{t('reports.sectionAccounts', lang)}</span>
            </label>
            <label style={styles.checkboxLabel}>
              <input type="checkbox" checked={reportSections.transactions}
                onChange={(e) => setReportSections(s => ({ ...s, transactions: e.target.checked }))} />
              <span style={styles.checkboxText}>{t('reports.sectionTransactions', lang)}</span>
            </label>
            <label style={styles.checkboxLabel}>
              <input type="checkbox" checked={reportSections.analytics}
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

        {/* SECTION 2: Data Portability */}
        <div className="neo-raised" style={styles.card}>
          <div style={styles.cardHeader}>
            <Upload size={16} style={{ color: 'var(--accent-color)' }} />
            <h3 style={styles.cardTitle}>{t('settings.dataPortability', lang)}</h3>
          </div>

          <p style={styles.cardDesc}>
            {t('settings.exportDescJSON', lang)}
          </p>

          <button
            className="neo-btn neo-btn-primary"
            style={styles.exportBtn}
            onClick={handleExportJSON}
          >
            <Upload size={14} />
            {t('settings.exportJSON', lang)}
          </button>

          <div style={{ marginTop: '14px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
            <p style={styles.cardDesc}>
              {t('settings.importDesc', lang)}
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

            <button
              className="neo-btn"
              style={styles.exportBtn}
              onClick={handleImportClick}
            >
              <Upload size={14} />
              {t('settings.importJSON', lang)}
            </button>
          </div>

          {/* Reset Data — divider + button */}
          <div style={{ marginTop: '14px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
            <p style={styles.cardDesc}>
              {t('settings.resetDataDesc', lang)}
            </p>

            {!showResetConfirm ? (
              <button
                className="neo-btn"
                style={styles.resetBtn}
                onClick={() => setShowResetConfirm(true)}
              >
                {t('settings.resetData', lang)}
              </button>
            ) : (
              <div className="neo-pressed-sm" style={styles.resetConfirmPanel}>
                <span style={styles.resetConfirmText}>
                  {t('settings.resetDataConfirm', lang)}
                </span>
                <div style={styles.resetBtnGroup}>
                  <button
                    className="neo-btn"
                    style={styles.resetNoBtn}
                    onClick={() => setShowResetConfirm(false)}
                  >
                    {t('settings.resetCancel', lang)}
                  </button>
                  <button
                    className="neo-btn"
                    style={styles.resetYesBtn}
                    onClick={handleResetData}
                  >
                    {t('settings.resetConfirmAction', lang)}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 3: Notifications */}
        <div className="neo-raised" style={styles.card}>
          <div style={styles.cardHeader}>
            <Bell size={16} style={{ color: 'var(--accent-color)' }} />
            <h3 style={styles.cardTitle}>{t('notif.settingsTitle', lang)}</h3>
          </div>

          <p style={styles.cardDesc}>
            {t('notif.settingsDesc', lang)}
          </p>

          {/* Notification enable toggle */}
          <label style={styles.switchRow}>
            <div style={styles.switchLabelGroup}>
              <span style={styles.switchTitle}>{t('notif.enableToggle', lang)}</span>
              <span style={styles.switchDesc}>{t('notif.enableToggleDesc', lang)}</span>
              {!notifSupported && (
                <span style={{ fontSize: '9px', fontWeight: '600', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {t('notif.permissionUnsupported', lang)}
                </span>
              )}
              {notifSupported && notifPermission !== 'granted' && notificationsEnabled && (
                <span style={{ fontSize: '9px', fontWeight: '600', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {t('notif.noPermission', lang)}
                  <button
                    className="neo-btn"
                    style={{ marginLeft: '6px', fontSize: '9px', padding: '2px 8px', height: '20px', borderRadius: '6px', border: '1px solid var(--accent-color)', color: 'var(--accent-color)' }}
                    onClick={(e) => { e.stopPropagation(); requestNotificationPermission(); }}
                  >
                    {t('notif.grantPermission', lang)}
                  </button>
                </span>
              )}
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

          {/* Reminder alerts toggle */}
          <label style={{ ...styles.switchRow, marginTop: '4px' }}>
            <div style={styles.switchLabelGroup}>
              <span style={styles.switchTitle}>{t('notif.reminderAlerts', lang)}</span>
              <span style={styles.switchDesc}>{t('notif.reminderAlertsDesc', lang)}</span>
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
        </div>

        {/* SECTION 4: Privacy & Analytics */}
        <div className="neo-raised" style={styles.card}>
          <div style={styles.cardHeader}>
            <Shield size={16} style={{ color: 'var(--accent-color)' }} />
            <h3 style={styles.cardTitle}>{t('privacy.title', lang)}</h3>
          </div>

          <p style={styles.cardDesc}>
            {t('privacy.desc', lang)}
          </p>

          {/* Consent status */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-primary)' }}>
              {t('privacy.consentStatus', lang)}
            </span>
            <span style={{
              fontSize: '10px', fontWeight: '700', padding: '2px 10px', borderRadius: '20px',
              backgroundColor: getConsent() === 'granted'
                ? 'color-mix(in srgb, var(--color-income) 15%, transparent)'
                : 'color-mix(in srgb, var(--text-secondary) 15%, transparent)',
              color: getConsent() === 'granted' ? 'var(--color-income)' : 'var(--text-secondary)',
            }}>
              {getConsent() === 'granted' ? t('privacy.statusGranted', lang) : t('privacy.statusDenied', lang)}
            </span>
          </div>

          {/* Events queued count */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {t('privacy.eventsQueued', lang)}
            </span>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-primary)' }}>
              {getQueuedEventCount()}
            </span>
          </div>

          {/* Last sync */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {t('privacy.lastSync', lang)}
            </span>
            <span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-primary)' }}>
              {getLastSyncDisplay() ? new Date(getLastSyncDisplay()).toLocaleString() : t('privacy.never', lang)}
            </span>
          </div>

          {/* Supabase status */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {t('privacy.supabaseStatus', lang)}
            </span>
            <span style={{
              fontSize: '10px', fontWeight: '700', padding: '2px 10px', borderRadius: '20px',
              backgroundColor: isSupabaseConfigured
                ? 'color-mix(in srgb, var(--color-income) 15%, transparent)'
                : 'color-mix(in srgb, var(--color-warning) 15%, transparent)',
              color: isSupabaseConfigured ? 'var(--color-income)' : 'var(--color-warning)',
            }}>
              {isSupabaseConfigured ? t('privacy.configured', lang) : t('privacy.notConfigured', lang)}
            </span>
          </div>

          {/* Sync Now button */}
          {isTrackingAllowed() && (
            <button
              className="neo-btn"
              style={{
                width: '100%',
                height: '36px',
                fontSize: '11px',
                fontWeight: '600',
                justifyContent: 'center',
                marginBottom: '8px',
                gap: '6px',
                border: syncResult === 'success'
                  ? '1px solid var(--color-income)'
                  : syncResult === 'error'
                    ? '1px solid var(--color-expense)'
                    : undefined,
                color: syncResult === 'success'
                  ? 'var(--color-income)'
                  : syncResult === 'error'
                    ? 'var(--color-expense)'
                    : 'var(--text-primary)',
              }}
              onClick={handleSyncNow}
              disabled={isSyncing || !isSupabaseConfigured}
            >
              {isSyncing ? (
                <RefreshCw size={14} className="spin-anim" />
              ) : syncResult === 'success' ? (
                <CheckCircle size={14} />
              ) : syncResult === 'error' ? (
                <XCircle size={14} />
              ) : (
                <Upload size={14} />
              )}
              {isSyncing
                ? t('analytics.events.syncing', lang)
                : syncResult === 'success'
                  ? t('analytics.events.synced', lang)
                  : t('analytics.events.sync', lang)}
            </button>
          )}

          {/* Reset consent button */}
          {isTrackingAllowed() && (
            <div style={{ marginBottom: '4px' }}>
              <button
                className="neo-btn"
                style={{ width: '100%', height: '36px', fontSize: '11px', justifyContent: 'center' }}
                onClick={() => {
                  if (window.confirm(t('privacy.resetDesc', lang))) {
                    resetConsent();
                    window.location.reload();
                  }
                }}
              >
                {t('privacy.resetConsent', lang)}
              </button>
            </div>
          )}
        </div>

        {/* SECTION 5: Info */}
        <div className="neo-raised" style={styles.card}>
          <div style={styles.cardHeader}>
            <Info size={16} style={{ color: 'var(--accent-color)' }} />
            <h3 style={styles.cardTitle}>{t('about.title', lang)}</h3>
          </div>

          <p style={{ ...styles.cardDesc, marginBottom: '4px', fontWeight: '600', color: 'var(--text-primary)' }}>
            {t('settings.version', lang)}
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

      {/* Toast notification — outside scroll container so it stays visible */}
      {toast && (
        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: 0,
          right: 0,
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
            backgroundColor: toast.type === 'error' ? '#e74c3c' : '#2ecc71',
            color: '#fff',
            fontSize: '12px',
            fontWeight: '600',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            pointerEvents: 'auto',
            maxWidth: '90%',
            animation: 'fadeIn 0.2s ease',
          }}>
            {toast.type === 'error' ? <XCircle size={16} /> : <CheckCircle size={16} />}
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
  lang: PropTypes.string,
};

const styles = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    height: '100%',
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

  syncBtnRow: {
    display: 'flex',
    gap: '12px',
  },
  syncBtn: {
    flex: 1,
    height: '38px',
    fontSize: '12px',
  },
  restoreBtn: {
    flex: 1,
    height: '38px',
    fontSize: '12px',
  },
  syncSuccess: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--color-income)',
    marginTop: '10px',
    paddingLeft: '4px',
  },
  syncError: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--color-expense)',
    marginTop: '10px',
    paddingLeft: '4px',
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
  resetBtn: {
    width: '100%',
    height: '38px',
    fontSize: '12px',
    justifyContent: 'center',
    border: '1px solid var(--color-expense)',
    color: 'var(--color-expense)',
  },
  snapshotCard: {
    padding: '10px 12px',
    borderRadius: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '8px',
  },
  snapshotHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  snapshotLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  snapshotTime: {
    fontSize: '9px',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  snapshotStats: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px 10px',
  },
  snapshotStat: {
    fontSize: '9px',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  restoreSnapshotBtn: {
    alignSelf: 'flex-end',
    fontSize: '10px',
    height: '26px',
    padding: '0 10px',
    borderRadius: '8px',
    backgroundColor: 'var(--accent-color)',
    color: '#fff',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer',
  },
  resetConfirmPanel: {
    padding: '12px',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  resetConfirmText: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '12px',
    textAlign: 'center',
    lineHeight: '1.4',
  },
  resetBtnGroup: {
    display: 'flex',
    gap: '10px',
    width: '100%',
  },
  resetYesBtn: {
    flex: 1,
    height: '36px',
    fontSize: '11px',
    fontWeight: '600',
    justifyContent: 'center',
    border: '1px solid var(--color-expense)',
    backgroundColor: 'var(--color-expense)',
    color: '#fff',
  },
  resetNoBtn: {
    flex: 1,
    height: '36px',
    fontSize: '11px',
    fontWeight: '600',
    justifyContent: 'center',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
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
