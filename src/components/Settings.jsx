import { useState, useRef } from 'react';
import { 
  ArrowLeft, CloudLightning, FileSpreadsheet, 
  RotateCcw, RefreshCw, ShieldAlert, CheckCircle,
  Download, Upload, FileText
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import PropTypes from 'prop-types';
import { t } from '../i18n';
import { formatNumber } from '../utils';

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

  // PDF Report State
  const [reportPeriod, setReportPeriod] = useState('thisMonth');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

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

  // PDF Report Generation
  const handleExportPDF = () => {
    if (transactions.length === 0) {
      alert('No transactions to export.');
      return;
    }
    setIsGeneratingPDF(true);

    setTimeout(() => {
      try {
        // Determine date range
        const now = new Date();
        let startDate, endDate;
        
        switch (reportPeriod) {
          case 'thisMonth':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
          case 'lastMonth':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), 0);
            break;
          case 'last3Months':
            startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
          case 'last6Months':
            startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
          case 'thisYear':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31);
            break;
          default:
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }

        const filtered = transactions.filter(tx => {
          const d = new Date(tx.date);
          return d >= startDate && d <= endDate;
        });

        const totalIncome = filtered.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
        const totalExpense = filtered.filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
        const net = totalIncome - totalExpense;

        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const pageW = 210;
        let y = 20;

        // Title
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('Pocket Khata', pageW / 2, y, { align: 'center' });
        y += 8;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.text('Financial Report', pageW / 2, y, { align: 'center' });
        y += 10;

        // Period
        doc.setFontSize(10);
        doc.setTextColor(100);
        const periodLabel = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
          ' - ' + endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        doc.text(`Period: ${periodLabel}`, pageW / 2, y, { align: 'center' });
        doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, pageW / 2, y + 4, { align: 'center' });
        y += 14;

        // Divider
        doc.setDrawColor(200);
        doc.line(20, y, pageW - 20, y);
        y += 8;

        // Summary
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(40);
        doc.text('Summary', 20, y);
        y += 8;

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(34, 197, 94);
        doc.text(`Total Income: ৳${formatNumber(totalIncome, 'en')}`, 25, y);
        y += 7;
        doc.setTextColor(239, 68, 68);
        doc.text(`Total Expense: ৳${formatNumber(totalExpense, 'en')}`, 25, y);
        y += 7;
        doc.setTextColor(net >= 0 ? 34 : 239, net >= 0 ? 197 : 68, net >= 0 ? 94 : 68);
        doc.setFont('helvetica', 'bold');
        doc.text(`Net ${net >= 0 ? 'Savings' : 'Loss'}: ৳${formatNumber(Math.abs(net), 'en')}`, 25, y);
        y += 12;

        // Divider
        doc.setDrawColor(200);
        doc.line(20, y, pageW - 20, y);
        y += 8;

        // Transactions
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(40);
        doc.text(`Transactions (${filtered.length})`, 20, y);
        y += 8;

        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text('Date', 20, y);
        doc.text('Type', 50, y);
        doc.text('Category', 70, y);
        doc.text('Account', 105, y);
        doc.text('Amount', pageW - 25, y, { align: 'right' });
        y += 5;
        doc.setDrawColor(200);
        doc.line(20, y, pageW - 20, y);
        y += 4;

        doc.setFontSize(9);
        doc.setTextColor(60);

        const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
        sorted.forEach((tx) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          const cat = categories.find(c => c.id === tx.categoryId);
          const acc = accounts.find(a => a.id === tx.accountId);
          doc.text(tx.date || '-', 20, y);
          doc.text(tx.type, 50, y);
          doc.text(cat?.name || '-', 70, y);
          doc.text(acc?.name || '-', 105, y);
          doc.text(`৳${formatNumber(tx.amount, 'en')}`, pageW - 25, y, { align: 'right' });
          y += 5;
        });

        doc.save(`Pocket_Khata_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      } catch (e) {
        console.error('PDF generation error:', e);
        alert('Failed to generate PDF. Check console for details.');
      }
      setIsGeneratingPDF(false);
    }, 500);
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

        {/* SECTION 3: PDF Financial Reports */}
        <div className="neo-raised" style={styles.card}>
          <div style={styles.cardHeader}>
            <FileText size={16} style={{ color: 'var(--accent-color)' }} />
            <h3 style={styles.cardTitle}>{t('reports.title', lang)}</h3>
          </div>

          <p style={styles.cardDesc}>
            {t('reports.exportDesc', lang)}
          </p>

          <div style={styles.formGroup}>
            <label style={styles.formLabel}>{t('reports.selectPeriod', lang)}</label>
            <select
              value={reportPeriod}
              onChange={(e) => setReportPeriod(e.target.value)}
              className="neo-input"
              style={styles.formSelect}
            >
              <option value="thisMonth">{t('reports.thisMonth', lang)}</option>
              <option value="lastMonth">{t('reports.lastMonth', lang)}</option>
              <option value="last3Months">{t('reports.last3Months', lang)}</option>
              <option value="last6Months">{t('reports.last6Months', lang)}</option>
              <option value="thisYear">{t('reports.thisYear', lang)}</option>
            </select>
          </div>

          <button 
            className="neo-btn neo-btn-primary" 
            style={styles.pdfBtn}
            onClick={handleExportPDF}
            disabled={isGeneratingPDF}
          >
            {isGeneratingPDF ? (
              <RefreshCw size={14} className="spin-anim" />
            ) : (
              <FileText size={14} />
            )}
            {t('reports.exportPDF', lang)}
          </button>
        </div>

        {/* SECTION 4: Application Reset */}
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
