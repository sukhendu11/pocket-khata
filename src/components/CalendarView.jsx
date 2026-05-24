import { useState, useMemo } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar, Info } from 'lucide-react';
import PropTypes from 'prop-types';
import { t } from '../i18n';
import { formatNumber } from '../utils';
import TransactionItem from './TransactionItem';

export default function CalendarView({
  transactions,
  accounts,
  categories,
  onNavigate,
  onEditTransaction,
  lang
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toISOString().split('T')[0]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = t('calendar.months', lang);

  // 1. Shift Month
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // 2. Compute calendar grid days
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sun, 6 is Sat
    const totalDays = new Date(year, month + 1, 0).getDate(); // last day of month

    const days = [];
    
    // Pad previous month days as empty or neutral
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }

    // Populate current month days
    for (let d = 1; d <= totalDays; d++) {
      const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNum: d,
        dateStr: formattedDate,
      });
    }

    return days;
  }, [year, month]);

  // 3. Map transactions to dates for indicators
  const dateActivity = useMemo(() => {
    const activity = {};
    transactions.forEach(tx => {
      const dateStr = tx.date;
      if (!activity[dateStr]) {
        activity[dateStr] = { income: false, expense: false, count: 0 };
      }
      activity[dateStr].count += 1;
      if (tx.type === 'income') {
        activity[dateStr].income = true;
      } else if (tx.type === 'expense') {
        activity[dateStr].expense = true;
      }
    });
    return activity;
  }, [transactions]);

  // 4. Selected date transactions and summary
  const selectedDateDetails = useMemo(() => {
    const dayTxs = transactions.filter(t => t.date === selectedDateStr);
    
    let income = 0;
    let expense = 0;
    dayTxs.forEach(t => {
      if (t.type === 'income') income += t.amount;
      if (t.type === 'expense') expense += t.amount;
    });

    return {
      transactions: dayTxs,
      income,
      expense,
      net: income - expense,
    };
  }, [transactions, selectedDateStr]);

  const handleDaySelect = (day) => {
    if (day) {
      setSelectedDateStr(day.dateStr);
    }
  };

  const formatSelectedDateHeading = (dateStr) => {
    const d = new Date(dateStr);
    const locale = lang === 'bn' ? 'bn-BD' : 'en-US';
    return d.toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <div style={styles.container}>
      
      {/* Header Bar */}
      <div style={styles.header}>
        <button className="neo-btn neo-btn-round" style={styles.backBtn} onClick={() => onNavigate('dashboard')}>
          <ArrowLeft size={18} />
        </button>
        <h2 style={styles.title}>{t('calendar.title', lang)}</h2>
        <div style={{ width: '36px' }} /> {/* placeholder for alignment */}
      </div>

      {/* Month Navigator Control */}
      <div className="neo-raised-sm" style={styles.monthSelector}>
        <button className="neo-btn neo-btn-round" style={styles.arrowBtn} onClick={handlePrevMonth}>
          <ChevronLeft size={16} />
        </button>
        <span style={styles.monthLabel}>{monthNames[month]} {year}</span>
        <button className="neo-btn neo-btn-round" style={styles.arrowBtn} onClick={handleNextMonth}>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Calendar Grid Container */}
      <div className="neo-raised" style={styles.calendarCard}>
        {/* Days Header */}
        <div style={styles.weekdaysRow}>
          {t('calendar.weekdays', lang).map(d => (
            <span key={d} style={styles.weekday}>{d}</span>
          ))}
        </div>

        {/* Days Grid */}
        <div style={styles.daysGrid}>
          {calendarDays.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} style={styles.emptyDay} />;
            }

            const activity = dateActivity[day.dateStr];
            const isSelected = selectedDateStr === day.dateStr;

            return (
              <div
                key={day.dateStr}
                className={isSelected ? 'neo-pressed-sm' : 'neo-raised-sm'}
                onClick={() => handleDaySelect(day)}
                style={{
                  ...styles.dayCell,
                  boxShadow: isSelected ? 'var(--neomorphic-pressed-sm)' : 'var(--neomorphic-raised-sm)',
                  border: isSelected ? '1px solid var(--accent-color)' : '1px solid transparent',
                  backgroundColor: isSelected ? 'var(--bg-color)' : 'var(--bg-color)',
                }}
              >
                <span style={{ 
                  ...styles.dayNum, 
                  color: isSelected ? 'var(--accent-color)' : 'var(--text-primary)',
                  fontWeight: isSelected ? '800' : '500',
                }}>
                  {day.dayNum}
                </span>
                
                {/* Visual Indicators */}
                <div style={styles.indicatorContainer}>
                  {activity?.income && <span style={{ ...styles.dot, backgroundColor: 'var(--color-income)' }} />}
                  {activity?.expense && <span style={{ ...styles.dot, backgroundColor: 'var(--color-expense)' }} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Details Panel */}
      <div style={styles.detailsContainer}>
        <div className="neo-pressed-sm" style={styles.detailsHeader}>
          <Calendar size={14} style={{ color: 'var(--accent-color)' }} />
          <h4 style={styles.detailsTitle}>{formatSelectedDateHeading(selectedDateStr)}</h4>
        </div>

        {/* Daily Stats Summary */}
        <div style={styles.dailySummaryGrid}>
          <div style={styles.dailySumItem}>
            <span style={styles.dailySumLabel}>{t('calendar.dayIncome', lang)}</span>
            <span style={{ ...styles.dailySumVal, color: 'var(--color-income)' }}>
              +৳{formatNumber(selectedDateDetails.income, lang)}
            </span>
          </div>
          <div style={styles.dailySumItem}>
            <span style={styles.dailySumLabel}>{t('calendar.dayExpense', lang)}</span>
            <span style={{ ...styles.dailySumVal, color: 'var(--color-expense)' }}>
              -৳{formatNumber(selectedDateDetails.expense, lang)}
            </span>
          </div>
          <div style={styles.dailySumItem}>
            <span style={styles.dailySumLabel}>{t('calendar.dayNet', lang)}</span>
            <span style={{ 
              ...styles.dailySumVal, 
              color: selectedDateDetails.net >= 0 ? 'var(--color-income)' : 'var(--color-expense)' 
            }}>
              ৳{formatNumber(selectedDateDetails.net, lang)}
            </span>
          </div>
        </div>

        {/* Daily Transactions List */}
        <div style={styles.dailyList}>
          {selectedDateDetails.transactions.length === 0 ? (
            <div className="neo-pressed-sm" style={styles.emptyDetails}>
              <Info size={12} style={{ marginRight: '6px' }} /> {t('calendar.noRecords', lang)}
            </div>
          ) : (
            selectedDateDetails.transactions.map(tx => {
              const cat = categories.find(c => c.id === tx.categoryId);
              const acc = accounts.find(a => a.id === tx.accountId);
              
              return (
                <TransactionItem
                  key={tx.id}
                  transaction={tx}
                  account={acc}
                  category={cat}
                  onClick={() => onEditTransaction(tx)}
                  showEdit={true}
                  showDate={false}
                  variant="calendar"
                  lang={lang}
                />
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}

CalendarView.propTypes = {
  transactions: PropTypes.array,
  accounts: PropTypes.array,
  categories: PropTypes.array,
  onNavigate: PropTypes.func,
  onEditTransaction: PropTypes.func,
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
  monthSelector: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    marginBottom: '16px',
  },
  arrowBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    padding: 0,
  },
  monthLabel: {
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  calendarCard: {
    padding: '16px 10px',
    marginBottom: '20px',
  },
  weekdaysRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    textAlign: 'center',
    marginBottom: '10px',
  },
  weekday: {
    fontSize: '10px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
  },
  daysGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '8px',
  },
  emptyDay: {
    aspectRatio: '1',
  },
  dayCell: {
    aspectRatio: '1',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 4px 4px 4px',
    cursor: 'pointer',
    borderRadius: '10px',
    position: 'relative',
    transition: 'all 0.15s ease',
  },
  dayNum: {
    fontSize: '11px',
  },
  indicatorContainer: {
    display: 'flex',
    gap: '3px',
    justifyContent: 'center',
    width: '100%',
    height: '4px',
  },
  dot: {
    width: '4px',
    height: '4px',
    borderRadius: '50%',
  },
  detailsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '20px',
  },
  detailsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    borderRadius: '12px',
  },
  detailsTitle: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  dailySummaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
    textAlign: 'center',
  },
  dailySumItem: {
    display: 'flex',
    flexDirection: 'column',
    padding: '8px 4px',
  },
  dailySumLabel: {
    fontSize: '8px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
  },
  dailySumVal: {
    fontSize: '11px',
    fontWeight: '700',
    marginTop: '2px',
  },
  dailyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  emptyDetails: {
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
};
