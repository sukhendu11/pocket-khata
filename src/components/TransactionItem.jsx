import PropTypes from 'prop-types';
import { ArrowUpRight, ArrowDownLeft, Edit3, TrendingUp } from 'lucide-react';
import { t } from '../i18n';
import { formatNumber } from '../utils';

/**
 * Reusable Transaction Row Component
 *
 * Props:
 *   transaction  – { id, type, amount, date, notes, categoryId, accountId, transferToId }
 *   account      – Account object (with name, color)
 *   category     – Category object (with name, color)
 *   toAccount    – Transfer destination account object
 *   onClick      – () => void (if provided, row becomes clickable)
 *   variant      – 'default' | 'compact' | 'calendar'
 *   showEdit     – Show edit icon (default true)
 *   showDate     – Show date below amount (default false)
 *   style        – Extra styles for the container
 */
export default function TransactionItem({
  transaction,
  account,
  category,
  toAccount,
  onClick,
  variant = 'default',
  showEdit = true,
  showDate = false,
  lang,
  style: extraStyle,
}) {
  const tx = transaction;
  const cat = category;
  const acc = account;
  const toAcc = toAccount;

  const isIncome = tx.type === 'income';
  const isExpense = tx.type === 'expense';
  const isTransfer = tx.type === 'transfer';

  const amountColor = isIncome
    ? 'var(--color-income)'
    : isExpense
      ? 'var(--color-expense)'
      : 'var(--color-transfer)';

  const amountPrefix = isIncome ? '+' : isExpense ? '-' : '⇄';
  const iconColor = cat?.color || 'var(--accent-color)';

  const renderIcon = () => {
    if (variant === 'calendar') {
      return (
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: iconColor,
            flexShrink: 0,
          }}
        />
      );
    }
    return (
      <div
        className="neo-pressed-sm"
        style={{
          width: variant === 'default' ? '32px' : '28px',
          height: variant === 'default' ? '32px' : '28px',
          borderRadius: variant === 'default' ? '10px' : '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: `${iconColor}22`,
          color: iconColor,
          flexShrink: 0,
        }}
      >
        {isTransfer ? (
          <TrendingUp size={variant === 'default' ? 16 : 14} style={{ transform: 'rotate(45deg)' }} />
        ) : isIncome ? (
          <ArrowUpRight size={variant === 'default' ? 16 : 14} />
        ) : (
          <ArrowDownLeft size={variant === 'default' ? 16 : 14} />
        )}
      </div>
    );
  };

  const renderMeta = () => {
    if (isTransfer) {
      return `${acc?.name || t('common.local')} → ${toAcc?.name || t('common.other')}`;
    }
    if (variant === 'calendar') {
      return acc?.name || t('common.localWallet');
    }
    const categoryPart = cat?.name || t('common.general');
    const subcatPart = tx.subcategory ? ` › ${tx.subcategory}` : '';
    return `${acc?.name || t('common.local')} • ${categoryPart}${subcatPart}`;
  };

  const renderNotes = () => {
    if (tx.notes) return tx.notes;
    if (cat?.name) return cat.name;
    if (variant === 'calendar') return t('common.manualEntry');
    if (variant === 'default' && isExpense) return t('common.quickLedger');
    return t('common.manualLedger');
  };

  const containerStyles = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: variant === 'calendar' ? '10px 12px' : variant === 'default' ? '10px 12px' : '10px 14px',
    cursor: onClick ? 'pointer' : 'default',
    ...extraStyle,
  };

  const leftStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: variant === 'calendar' ? '8px' : '10px',
    minWidth: 0,
  };

  const notesStyles = {
    fontSize: variant === 'calendar' ? '12px' : '13px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const metaStyles = {
    fontSize: variant === 'calendar' ? '9px' : '10px',
    color: 'var(--text-secondary)',
    marginTop: variant === 'calendar' ? '1px' : '2px',
    fontWeight: '500',
  };

  return (
    <div
      className={
        variant === 'calendar'
          ? 'neo-raised-sm'
          : variant === 'default'
            ? 'neo-raised-sm'
            : 'neo-raised-sm'
      }
      style={containerStyles}
      onClick={onClick}
    >
      <div style={leftStyles}>
        {renderIcon()}
        <div style={{ minWidth: 0 }}>
          <span style={notesStyles}>{renderNotes()}</span>
          <div style={metaStyles}>{renderMeta()}</div>
        </div>
      </div>

      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        <div>
          <p
            style={{
              fontSize: variant === 'calendar' ? '12px' : '13px',
              fontWeight: '700',
              color: amountColor,
            }}
          >
            {amountPrefix} ৳{formatNumber(tx.amount, lang)}
          </p>
          {showDate && (
            <p
              style={{
                fontSize: '9px',
                color: 'var(--text-secondary)',
                marginTop: '2px',
                fontWeight: '500',
              }}
            >
              {tx.date}
            </p>
          )}
        </div>
        {showEdit && onClick && (
          <Edit3 size={variant === 'calendar' ? 8 : 10} style={{ color: 'var(--text-secondary)', opacity: 0.3 }} />
        )}
      </div>
    </div>
  );
}

TransactionItem.propTypes = {
  transaction: PropTypes.object,
  account: PropTypes.object,
  category: PropTypes.object,
  toAccount: PropTypes.object,
  onClick: PropTypes.func,
  variant: PropTypes.string,
  showEdit: PropTypes.bool,
  showDate: PropTypes.bool,
  lang: PropTypes.string,
  style: PropTypes.object,
};
