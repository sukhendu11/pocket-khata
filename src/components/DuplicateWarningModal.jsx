import { useState } from 'react';
import PropTypes from 'prop-types';
import { AlertTriangle, X } from 'lucide-react';

export default function DuplicateWarningModal({ transaction, duplicates, onProceed, onCancel, onViewDuplicate, lang }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const dup = duplicates[selectedIdx] || {};

  if (!duplicates || duplicates.length === 0) return null;

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    modal: {
      backgroundColor: 'var(--bg-color)',
      borderRadius: '16px',
      padding: '20px',
      maxWidth: '90%',
      width: '320px',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
      animation: 'slideUp 0.3s ease-out',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '16px',
    },
    title: {
      fontSize: '16px',
      fontWeight: '700',
      color: 'var(--text-primary)',
      margin: 0,
    },
    desc: {
      fontSize: '12px',
      color: 'var(--text-secondary)',
      marginBottom: '12px',
      lineHeight: '1.4',
    },
    dupInfo: {
      backgroundColor: 'rgba(230, 126, 34, 0.1)',
      border: '1px solid rgba(230, 126, 34, 0.3)',
      borderRadius: '8px',
      padding: '12px',
      marginBottom: '12px',
      fontSize: '11px',
    },
    dupRow: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '6px',
      color: 'var(--text-secondary)',
    },
    dupValue: {
      fontWeight: '600',
      color: 'var(--text-primary)',
    },
    carousel: {
      display: 'flex',
      gap: '4px',
      justifyContent: 'center',
      marginBottom: '12px',
    },
    dot: {
      width: '6px',
      height: '6px',
      borderRadius: '50%',
      backgroundColor: 'var(--text-secondary)',
      cursor: 'pointer',
      opacity: 0.5,
    },
    dotActive: {
      opacity: 1,
      backgroundColor: 'var(--accent-color)',
    },
    buttons: {
      display: 'flex',
      gap: '8px',
      marginTop: '12px',
    },
    btn: {
      flex: 1,
      padding: '10px',
      border: 'none',
      borderRadius: '8px',
      fontSize: '12px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    btnCancel: {
      backgroundColor: 'var(--bg-color)',
      color: 'var(--text-secondary)',
      border: '1px solid rgba(128, 128, 128, 0.2)',
    },
    btnProceed: {
      backgroundColor: 'var(--accent-color)',
      color: 'white',
    },
    closeBtn: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '0',
      marginLeft: 'auto',
      color: 'var(--text-secondary)',
    },
  };

  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <AlertTriangle size={18} style={{ color: '#e67e22' }} />
          <h3 style={styles.title}>Similar Transaction</h3>
          <button style={styles.closeBtn} onClick={onCancel}>
            <X size={16} />
          </button>
        </div>

        <p style={styles.desc}>
          We found {duplicates.length} similar transaction{duplicates.length > 1 ? 's' : ''} in your data. Do you want to proceed?
        </p>

        {/* Duplicate Info Card */}
        <div style={styles.dupInfo}>
          <div style={styles.dupRow}>
            <span>Date:</span>
            <span style={styles.dupValue}>{dup.date}</span>
          </div>
          <div style={styles.dupRow}>
            <span>Amount:</span>
            <span style={styles.dupValue}>৳{dup.amount}</span>
          </div>
          <div style={styles.dupRow}>
            <span>Account:</span>
            <span style={styles.dupValue}>{dup.accountName || '-'}</span>
          </div>
          <div style={styles.dupRow}>
            <span>Category:</span>
            <span style={styles.dupValue}>{dup.categoryName || '-'}</span>
          </div>
        </div>

        {/* Carousel Dots */}
        {duplicates.length > 1 && (
          <div style={styles.carousel}>
            {duplicates.map((_, idx) => (
              <div
                key={idx}
                style={{
                  ...styles.dot,
                  ...(idx === selectedIdx ? styles.dotActive : {}),
                }}
                onClick={() => setSelectedIdx(idx)}
              />
            ))}
          </div>
        )}

        {/* Buttons */}
        <div style={styles.buttons}>
          <button style={{ ...styles.btn, ...styles.btnCancel }} onClick={onCancel}>
            Cancel
          </button>
          <button style={{ ...styles.btn, ...styles.btnProceed }} onClick={onProceed}>
            Proceed Anyway
          </button>
        </div>
      </div>
    </div>
  );
}

DuplicateWarningModal.propTypes = {
  transaction: PropTypes.object,
  duplicates: PropTypes.array,
  onProceed: PropTypes.func,
  onCancel: PropTypes.func,
  onViewDuplicate: PropTypes.func,
  lang: PropTypes.string,
};
