import { useState, useRef } from 'react';
import { 
  ArrowLeft, CloudLightning, FileSpreadsheet, 
  RotateCcw, RefreshCw, ShieldAlert, CheckCircle,
  Download, Upload
} from 'lucide-react';
import PropTypes from 'prop-types';
import { t } from '../i18n';

export default function Settings({
  onResetDatabase,
  onImportDatabase,
  onExportDatabase,
  transactions,
  accounts,
  categories,
  onNavigate,
  lang
}) {
  // Backup Sync States
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [syncError, setSyncError] = useState(false);

  // Reset State
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // 1. Mock Cloud Sync
  const handleCloudSync = () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncSuccess(false);
    setSyncError(false);

    // Simulate Network Latency
    setTimeout(() => {
      try {
        const serialized = onExportDatabase(); // gets full JSON string
        localStorage.setItem('pocket_khata_cloud_backup', serialized);
        setIsSyncing(false);
        setSyncSuccess(true);
        setTimeout(() => setSyncSuccess(false), 2000);
      } catch (e) {
        setIsSyncing(false);
        setSyncError(true);
      }
    }, 2000);
  };

  // 4. Restore from Cloud
  const handleCloudRestore = () => {
    if (isSyncing) return;
    const backup = localStorage.getItem('pocket_khata_cloud_backup');
    if (!backup) {
      alert(t('settings.noBackupFound', lang));
      return;
    }

    setIsSyncing(true);
    setSyncSuccess(false);
    
    setTimeout(() => {
      const success = onImportDatabase(backup);
      setIsSyncing(false);
      if (success) {
        setSyncSuccess(true);
        alert(t('settings.restoreSuccess', lang));
        setTimeout(() => setSyncSuccess(false), 2000);
      } else {
        setSyncError(true);
      }
    }, 1500);
  };

  // 5. JSON Export download
  const handleExportJSON = () => {
    const jsonStr = onExportDatabase();
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Pocket_Khata_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 6. JSON Import via file input
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
      if (success) {
        alert(t('settings.importSuccess', lang));
      } else {
        alert(t('settings.importError', lang));
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset so same file can be re-imported
  };

  // 7. CSV Export download (Pure JS)
  const handleExportCSV = () => {
    if (transactions.length === 0) {
      alert(t('settings.noTransactions', lang));
      return;
    }

    // CSV Headers
    let csvContent = 'Date,Notes,Type,Account,Category,Amount\r\n';

    // Populate lines
    transactions.forEach(tx => {
      const acc = accounts.find(a => a.id === tx.accountId);
      const toAcc = tx.type === 'transfer' ? accounts.find(a => a.id === tx.transferToId) : null;
      const cat = categories.find(c => c.id === tx.categoryId);
      
      const date = tx.date;
      const notes = tx.notes ? `"${tx.notes.replace(/"/g, '""')}"` : 'Quick Entry';
      const type = tx.type.toUpperCase();
      const accountName = tx.type === 'transfer' 
        ? `${acc?.name} to ${toAcc?.name}` 
        : (acc?.name || 'Local');
      const categoryName = tx.type === 'transfer' ? 'Transfer' : (cat?.name || 'Unclassified');
      const amount = tx.amount;

      csvContent += `${date},${notes},${type},${accountName},${categoryName},${amount}\r\n`;
    });

    // Generate blob download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Pocket_Khata_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    onResetDatabase();
    setShowResetConfirm(false);
    alert(t('settings.resetSuccess', lang));
    onNavigate('dashboard');
  };

  return (
    <div style={styles.container}>
      
      {/* Header Bar */}
      <div style={styles.header}>
        <button className="neo-btn neo-btn-round" style={styles.backBtn} onClick={() => onNavigate('dashboard')}>
          <ArrowLeft size={18} />
        </button>
        <h2 style={styles.title}>{t('settings.title', lang)}</h2>
        <div style={{ width: '36px' }} /> {/* alignment placeholder */}
      </div>

      <div style={styles.content}>
        
        {/* SECTION 1: Cloud Sync & Backup */}
        <div className="neo-raised" style={styles.card}>
          <div style={styles.cardHeader}>
            <CloudLightning size={16} style={{ color: 'var(--accent-color)' }} />
            <h3 style={styles.cardTitle}>{t('settings.cloudBackups', lang)}</h3>
          </div>

          <p style={styles.cardDesc}>
            {t('settings.cloudDesc', lang)}
          </p>

          <div style={styles.syncBtnRow}>
            <button 
              className="neo-btn neo-btn-primary" 
              style={styles.syncBtn} 
              onClick={handleCloudSync}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <RefreshCw size={14} className="spin-anim" style={{ animation: 'spin 2s linear infinite' }} />
              ) : (
                <RefreshCw size={14} />
              )}
              {t('settings.backupSync', lang)}
            </button>

            <button 
              className="neo-btn" 
              style={styles.restoreBtn} 
              onClick={handleCloudRestore}
              disabled={isSyncing}
            >
              {t('settings.cloudRestore', lang)}
            </button>
          </div>

          {/* Sync Success States */}
          {syncSuccess && (
            <div style={styles.syncSuccess}>
              <CheckCircle size={14} style={{ color: 'var(--color-income)' }} />
              <span>{t('settings.syncSuccess', lang)}</span>
            </div>
          )}

          {syncError && (
            <div style={styles.syncError}>
              <ShieldAlert size={14} style={{ color: 'var(--color-expense)' }} />
              <span>{t('settings.syncError', lang)}</span>
            </div>
          )}
        </div>

        {/* SECTION 2: Export & Import Data */}
        <div className="neo-raised" style={styles.card}>
          <div style={styles.cardHeader}>
            <FileSpreadsheet size={16} style={{ color: 'var(--accent-color)' }} />
            <h3 style={styles.cardTitle}>{t('settings.dataPortability', lang)}</h3>
          </div>

          <p style={styles.cardDesc}>
            {t('settings.exportDesc', lang)}
          </p>

          <button className="neo-btn" style={styles.exportBtn} onClick={handleExportCSV}>
            <FileSpreadsheet size={14} style={{ color: 'var(--color-income)' }} /> {t('settings.exportCSV', lang)}
          </button>

          <div style={{ height: '10px' }} />

          <p style={styles.cardDesc}>
            {t('settings.exportDescJSON', lang)}
          </p>

          <p style={{ ...styles.cardDesc, marginBottom: '8px' }}>
            {t('settings.importDesc', lang)}
          </p>

          <div style={styles.syncBtnRow}>
            <button className="neo-btn" style={{ ...styles.exportBtn, flex: 1 }} onClick={handleExportJSON}>
              <Download size={14} style={{ color: 'var(--accent-color)' }} /> {t('settings.exportJSON', lang)}
            </button>

            <button className="neo-btn" style={{ ...styles.exportBtn, flex: 1 }} onClick={handleImportClick}>
              <Upload size={14} style={{ color: 'var(--accent-color)' }} /> {t('settings.importJSON', lang)}
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>

        {/* SECTION 3: Application Reset */}
        <div className="neo-raised" style={styles.card}>
          <div style={styles.cardHeader}>
            <RotateCcw size={16} style={{ color: 'var(--color-expense)' }} />
            <h3 style={styles.cardTitle}>{t('settings.appMaintenance', lang)}</h3>
          </div>

          <p style={styles.cardDesc}>
            {t('settings.resetDesc', lang)}
          </p>

          {showResetConfirm ? (
            <div className="neo-pressed-sm" style={styles.resetConfirmPanel}>
              <ShieldAlert size={20} style={{ color: 'var(--color-expense)', marginBottom: '6px' }} />
              <p style={styles.resetConfirmText}>{t('settings.irreversible', lang)}</p>
              <div style={styles.resetBtnGroup}>
                <button className="neo-btn" style={styles.resetYesBtn} onClick={handleReset}>
                  {t('settings.yesFormat', lang)}
                </button>
                <button className="neo-btn" onClick={() => setShowResetConfirm(false)}>
                  {t('cancel', lang)}
                </button>
              </div>
            </div>
          ) : (
            <button className="neo-btn" style={styles.resetBtn} onClick={() => setShowResetConfirm(true)}>
              {t('settings.formatApp', lang)}
            </button>
          )}
        </div>

        {/* Footer info */}
        <div style={styles.footer}>
          <p>{t('settings.version', lang)}</p>
          <p style={{ marginTop: '2px' }}>{t('settings.dbInfo', lang)}</p>
        </div>

      </div>

    </div>
  );
}

Settings.propTypes = {
  onResetDatabase: PropTypes.func,
  onImportDatabase: PropTypes.func,
  onExportDatabase: PropTypes.func,
  transactions: PropTypes.array,
  accounts: PropTypes.array,
  categories: PropTypes.array,
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
  resetBtn: {
    width: '100%',
    height: '38px',
    fontSize: '12px',
    justifyContent: 'center',
    border: '1px solid var(--color-expense)',
    color: 'var(--color-expense)',
  },
  resetConfirmPanel: {
    padding: '12px',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  resetConfirmText: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '10px',
  },
  resetBtnGroup: {
    display: 'flex',
    gap: '10px',
    width: '100%',
  },
  resetYesBtn: {
    flex: 1,
    border: '1px solid var(--color-expense)',
    backgroundColor: 'var(--bg-color)',
    color: 'var(--color-expense)',
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
