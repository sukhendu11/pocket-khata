import { useState, useMemo, useEffect } from 'react';
import { 
  Bell, Sun, Moon, ArrowUpRight, ArrowDownLeft,
  TrendingUp, Wallet, Landmark, CreditCard, ChevronRight, HelpCircle,
} from 'lucide-react';
import PropTypes from 'prop-types';
import { t } from '../i18n';
import { formatNumber, formatPercent } from '../utils';
import PieChart from './PieChart';
import TransactionItem from './TransactionItem';

export default function Dashboard({ 
  accounts, 
  transactions, 
  categories, 
  reminders,
  onNavigate, 
  theme, 
  onToggleTheme,
  lang,
  onSetLang,
}) {
  const [activePieIndex, setActivePieIndex] = useState(null);
  const [activeLinePoint, setActiveLinePoint] = useState(null);

  // 1. Calculations: Total Net Balance
  const netBalance = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + acc.balance, 0);
  }, [accounts]);

  // 2. Calculations: Monthly Income & Expense
  const monthlyTotals = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let income = 0;
    let expense = 0;

    transactions.forEach(tx => {
      const txDate = new Date(tx.date);
      if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
        if (tx.type === 'income') {
          income += tx.amount;
        } else if (tx.type === 'expense') {
          expense += tx.amount;
        }
      }
    });

    return { income, expense };
  }, [transactions]);

  // 3. Calculations: Category Breakdown (Pie Chart Data)
  const categoryBreakdown = useMemo(() => {
    const breakdown = {};
    let totalExpense = 0;

    transactions.forEach(tx => {
      if (tx.type === 'expense') {
        const cat = categories.find(c => c.id === tx.categoryId);
        const catName = cat ? cat.name : 'Uncategorized';
        const catColor = cat ? cat.color : '#bdc3c7';
        
        if (!breakdown[tx.categoryId]) {
          breakdown[tx.categoryId] = {
            id: tx.categoryId,
            name: catName,
            color: catColor,
            amount: 0,
          };
        }
        breakdown[tx.categoryId].amount += tx.amount;
        totalExpense += tx.amount;
      }
    });

    return Object.values(breakdown).map(item => ({
      ...item,
      percentage: totalExpense > 0 ? Math.round((item.amount / totalExpense) * 100) : 0
    }))    .sort((a, b) => b.amount - a.amount);
  }, [transactions, categories]);

  // Safe pie item access — guard against out-of-bounds index
  // NOTE: useEffect resets invalid indices; useMemo only computes value (no side effects!)
  const selectedPieItem = useMemo(() => {
    if (activePieIndex === null) return null;
    if (activePieIndex < 0 || activePieIndex >= categoryBreakdown.length) return null;
    return categoryBreakdown[activePieIndex];
  }, [activePieIndex, categoryBreakdown]);

  // Reset invalid pie index — uses useEffect, NEVER inside useMemo (which causes render-time crashes)
  useEffect(() => {
    if (activePieIndex !== null && (activePieIndex < 0 || activePieIndex >= categoryBreakdown.length)) {
      setActivePieIndex(null);
    }
  }, [activePieIndex, categoryBreakdown.length]);

  // 4. Calculations: Monthly Trend Data (Line Chart Data - last 6 months)
  const monthlyTrends = useMemo(() => {      const monthKeys = ['months.jan','months.feb','months.mar','months.apr','months.may','months.jun','months.jul','months.aug','months.sep','months.oct','months.nov','months.dec'];
      const trendData = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthIdx = d.getMonth();
      const monthLabel = t(monthKeys[monthIdx], lang);
      const year = d.getFullYear();

      let income = 0;
      let expense = 0;

      transactions.forEach(tx => {
        const txDate = new Date(tx.date);
        if (txDate.getMonth() === monthIdx && txDate.getFullYear() === year) {
          if (tx.type === 'income') {
            income += tx.amount;
          } else if (tx.type === 'expense') {
            expense += tx.amount;
          }
        }
      });

      trendData.push({
        label: monthLabel,
        income,
        expense,
      });
    }

    return trendData;
  }, [transactions, lang]);

  // 5. Account branding resolver
  const getAccountIcon = (type) => {
    switch (type) {
      case 'Bank': return <Landmark size={18} />;
      case 'Bkash': 
      case 'Nagad': return <CreditCard size={18} />;
      default: return <Wallet size={18} />;
    }
  };

  // 6. Recent transactions (last 5)
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
  }, [transactions]);

  // 8. Custom SVG Line Chart Coordinates
  const lineChartData = useMemo(() => {
    const width = 310;
    const height = 120;
    const paddingX = 35;
    const paddingY = 15;

    // Find max income/expense for scaling
    const maxVal = Math.max(
      ...monthlyTrends.map(t => Math.max(t.income, t.expense)),
      5000 // default min height
    ) * 1.15; // 15% padding top

    const pointsCount = monthlyTrends.length;
    const stepX = (width - paddingX * 2) / (pointsCount - 1);

    const getX = (idx) => paddingX + idx * stepX;
    const getY = (val) => height - paddingY - (val / maxVal) * (height - paddingY * 2);

    // Calculate lines
    const incomePoints = monthlyTrends.map((t, idx) => ({ x: getX(idx), y: getY(t.income), data: t }));
    const expensePoints = monthlyTrends.map((t, idx) => ({ x: getX(idx), y: getY(t.expense), data: t }));

    // Generate SVG Bézier curve commands
    const generateBezier = (points) => {
      if (points.length === 0) return '';
      let path = `M ${points[0].x} ${points[0].y}`;
      for (let i = 0; i < points.length - 1; i++) {
        const cpX1 = points[i].x + stepX / 2;
        const cpY1 = points[i].y;
        const cpX2 = points[i + 1].x - stepX / 2;
        const cpY2 = points[i + 1].y;
        path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${points[i+1].x} ${points[i+1].y}`;
      }
      return path;
    };

    return {
      width,
      height,
      incomePoints,
      expensePoints,
      incomePath: generateBezier(incomePoints),
      expensePath: generateBezier(expensePoints),
      maxVal,
    };
  }, [monthlyTrends]);

  const hasOverdueReminders = useMemo(() => {
    const today = new Date();
    return reminders.some(rem => rem.status === 'unpaid' && new Date(rem.dueDate) < today);
  }, [reminders]);

  return (
    <div style={styles.scrollContainer}>
      
      {/* 1. Header Toolbar */}
      <div style={styles.header}>
        <div style={styles.userInfo}>
          <h1 style={styles.title}>{t('dashboard.title', lang)}</h1>
          <p style={styles.subtext}>{t('dashboard.subtitle', lang)}</p>
        </div>
        <div style={styles.actions}>
          {/* Language Toggle Pill */}
          <div className="neo-pressed-sm" style={styles.langPill}>
            <button
              onClick={() => onSetLang('en')}
              style={{
                ...styles.langOpt,
                color: lang === 'en' ? 'var(--accent-color)' : 'var(--text-secondary)',
                fontWeight: lang === 'en' ? '700' : '500',
                backgroundColor: lang === 'en' ? 'var(--bg-color)' : 'transparent',
                boxShadow: lang === 'en' ? 'var(--neomorphic-raised-sm)' : 'none',
              }}
            >
              EN
            </button>
            <button
              onClick={() => onSetLang('bn')}
              style={{
                ...styles.langOpt,
                color: lang === 'bn' ? 'var(--accent-color)' : 'var(--text-secondary)',
                fontWeight: lang === 'bn' ? '700' : '500',
                backgroundColor: lang === 'bn' ? 'var(--bg-color)' : 'transparent',
                boxShadow: lang === 'bn' ? 'var(--neomorphic-raised-sm)' : 'none',
              }}
            >
              বাংলা
            </button>
          </div>

          <button 
            className="neo-btn neo-btn-round" 
            style={styles.actionBtn}
            onClick={() => onNavigate('reminders')}
          >
            <Bell size={18} style={{ color: hasOverdueReminders ? 'var(--color-expense)' : 'var(--text-secondary)' }} />
            {hasOverdueReminders && <div style={styles.badgeDot} />}
          </button>
          <button 
            className="neo-btn neo-btn-round" 
            style={styles.actionBtn}
            onClick={onToggleTheme}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </div>

      {/* 2. Aggregate Balance Card */}
      <div className="neo-raised" style={styles.balanceCard}>
        <span style={styles.cardLabel}>{t('dashboard.totalBalance', lang)}</span>
        <h2 style={styles.balanceVal}>৳ {formatNumber(netBalance, lang)}</h2>
        <div style={styles.cardIndicatorContainer}>
          <div style={styles.cardIndicatorDot} />
          <span style={styles.cardIndicatorText}>{t('dashboard.dbActive', lang)}</span>
        </div>
      </div>

      {/* 3. Income vs Expense summary */}
      <div style={styles.summaryGrid}>
        <div className="neo-raised-sm" style={styles.summaryBox}>
          <div className="neo-pressed-sm" style={{ ...styles.sumIconBg, color: 'var(--color-income)' }}>
            <ArrowUpRight size={18} />
          </div>
          <div>
            <span style={styles.summaryLabel}>{t('dashboard.incomeMonth', lang)}</span>
            <p style={{ ...styles.summaryAmount, color: 'var(--color-income)' }}>
              +৳ {formatNumber(monthlyTotals.income, lang)}
            </p>
          </div>
        </div>

        <div className="neo-raised-sm" style={styles.summaryBox}>
          <div className="neo-pressed-sm" style={{ ...styles.sumIconBg, color: 'var(--color-expense)' }}>
            <ArrowDownLeft size={18} />
          </div>
          <div>
            <span style={styles.summaryLabel}>{t('dashboard.expenseMonth', lang)}</span>
            <p style={{ ...styles.summaryAmount, color: 'var(--color-expense)' }}>
              -৳ {formatNumber(monthlyTotals.expense, lang)}
            </p>
          </div>
        </div>
      </div>

      {/* 4. Accounts Quick Scroll (Horizontal Deck) */}
      <div style={styles.sectionHeader}>
        <h3 style={styles.sectionTitle}>{t('dashboard.myAccounts', lang)}</h3>
        <button style={styles.seeAllBtn} onClick={() => onNavigate('accounts')}>
          {t('dashboard.manage', lang)} <ChevronRight size={14} />
        </button>
      </div>

      <div style={styles.accountsScrollDeck} className="hide-scrollbar">
        {accounts.map(acc => (
          <div 
            key={acc.id} 
            className="neo-raised-sm" 
            style={{ 
              ...styles.accountCard, 
              borderLeft: `4px solid ${acc.color || 'var(--accent-color)'}` 
            }}
          >
            <div style={styles.accCardHeader}>
              <span style={{ ...styles.accCardIcon, backgroundColor: `${acc.color}22`, color: acc.color }}>
                {getAccountIcon(acc.type)}
              </span>
              <span style={styles.accCardType}>{acc.type}</span>
            </div>
            <h4 style={styles.accCardName}>{acc.name}</h4>
            <p style={styles.accCardBalance}>৳ {formatNumber(acc.balance, lang)}</p>
          </div>
        ))}
      </div>

      {/* 5. Pie Chart - Expenses Category Breakdown */}
      <div style={styles.sectionHeader}>
        <h3 style={styles.sectionTitle}>{t('dashboard.expenseBreakdown', lang)}</h3>
      </div>

      <div className="neo-raised" style={styles.chartContainer}>
        {categoryBreakdown.length === 0 ? (
          <div style={styles.emptyChart}>
            <TrendingUp size={36} style={{ color: 'var(--text-secondary)', opacity: 0.5 }} />
            <p style={styles.emptyChartText}>{t('dashboard.noExpenses', lang)}</p>
          </div>
        ) : (
          <div style={styles.pieLayout}>
            <PieChart
              data={categoryBreakdown}
              activeIndex={activePieIndex}
              onSliceClick={(idx) => setActivePieIndex(activePieIndex === idx ? null : idx)}
              centerText={selectedPieItem ? `${selectedPieItem.percentage}%` : t('pie.exp', lang)}
              centerSubtext={selectedPieItem ? t('pie.share', lang) : t('pie.totals', lang)}
            />

            {/* Legend info panel */}
            <div style={styles.pieLegend}>
              {selectedPieItem ? (
                <div style={styles.legendHighlight}>
                  <div style={styles.legendDotRow}>
                    <span style={{ ...styles.legendDot, backgroundColor: selectedPieItem.color }} />
                    <span style={styles.legendTitleHighlight}>{selectedPieItem.name}</span>
                  </div>
                  <p style={styles.legendPriceHighlight}>
                    ৳ {formatNumber(selectedPieItem.amount, lang)}
                  </p>
                  <p style={styles.legendDescHighlight}>
                    {formatPercent(selectedPieItem.percentage, lang)} {t('dashboard.ofTotalExpensesFull', lang)}
                  </p>
                  <button 
                    style={styles.legendResetBtn} 
                    onClick={() => setActivePieIndex(null)}
                  >
                    {t('dashboard.clearSelection', lang)}
                  </button>
                </div>
              ) : (
                <div style={styles.legendList}>
                  {categoryBreakdown.slice(0, 3).map((item, idx) => (
                    <div key={item.id} style={styles.legendRow} onClick={() => setActivePieIndex(idx)}>
                      <span style={{ ...styles.legendDot, backgroundColor: item.color }} />
                      <span style={styles.legendName}>{item.name === 'Uncategorized' ? t('common.uncategorized', lang) : item.name}</span>
                      <span style={styles.legendVal}>{formatPercent(item.percentage, lang)}</span>
                    </div>
                  ))}
                  {categoryBreakdown.length > 3 && (
                    <p style={styles.legendMoreLink}>
                      + {categoryBreakdown.length - 3} {t('dashboard.otherCategories', lang)}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 6. Line Chart - Monthly income & expense trends */}
      <div style={styles.sectionHeader}>
        <h3 style={styles.sectionTitle}>{t('dashboard.financialTrends', lang)}</h3>
      </div>

      <div className="neo-raised" style={styles.chartContainer}>
        <div style={styles.lineChartWrapper}>
          <svg 
            width="100%" 
            height={lineChartData.height} 
            viewBox={`0 0 ${lineChartData.width} ${lineChartData.height}`}
            style={styles.lineChartSvg}
          >
            {/* Grid Lines */}
            <line x1="35" y1="15" x2="275" y2="15" stroke="var(--text-secondary)" strokeWidth="0.5" strokeDasharray="3,3" opacity="0.15" />
            <line x1="35" y1="52.5" x2="275" y2="52.5" stroke="var(--text-secondary)" strokeWidth="0.5" strokeDasharray="3,3" opacity="0.15" />
            <line x1="35" y1="90" x2="275" y2="90" stroke="var(--text-secondary)" strokeWidth="0.5" strokeDasharray="3,3" opacity="0.15" />
            <line x1="35" y1="105" x2="275" y2="105" stroke="var(--text-secondary)" strokeWidth="0.5" opacity="0.25" />

            {/* Income Bézier Path */}
            <path
              d={lineChartData.incomePath}
              fill="none"
              stroke="var(--color-income)"
              strokeWidth="3.5"
              strokeLinecap="round"
              style={{ filter: 'drop-shadow(0px 4px 6px rgba(38,222,129,0.25))' }}
            />

            {/* Expense Bézier Path */}
            <path
              d={lineChartData.expensePath}
              fill="none"
              stroke="var(--color-expense)"
              strokeWidth="3.5"
              strokeLinecap="round"
              style={{ filter: 'drop-shadow(0px 4px 6px rgba(255,94,87,0.25))' }}
            />

            {/* Interactive Nodes for Income */}
            {lineChartData.incomePoints.map((pt, idx) => (
              <circle
                key={`inc-${idx}`}
                cx={pt.x}
                cy={pt.y}
                r={activeLinePoint?.type === 'income' && activeLinePoint?.idx === idx ? 6.5 : 4.5}
                fill="#ffffff"
                stroke="var(--color-income)"
                strokeWidth="2.5"
                className="line-chart-dot"
                onClick={() => setActiveLinePoint(activeLinePoint?.type === 'income' && activeLinePoint?.idx === idx ? null : { type: 'income', idx, data: pt.data })}
              />
            ))}

            {/* Interactive Nodes for Expense */}
            {lineChartData.expensePoints.map((pt, idx) => (
              <circle
                key={`exp-${idx}`}
                cx={pt.x}
                cy={pt.y}
                r={activeLinePoint?.type === 'expense' && activeLinePoint?.idx === idx ? 6.5 : 4.5}
                fill="#ffffff"
                stroke="var(--color-expense)"
                strokeWidth="2.5"
                className="line-chart-dot"
                onClick={() => setActiveLinePoint(activeLinePoint?.type === 'expense' && activeLinePoint?.idx === idx ? null : { type: 'expense', idx, data: pt.data })}
              />
            ))}

            {/* X-Axis labels */}
            {monthlyTrends.map((t, idx) => (
              <text
                key={`lbl-${idx}`}
                x={lineChartData.incomePoints[idx].x}
                y="118"
                textAnchor="middle"
                fontSize="8"
                fontWeight="600"
                fill="var(--text-secondary)"
              >
                {t.label}
              </text>
            ))}
          </svg>

          {/* Line Chart Tooltip Info */}
          <div style={styles.lineChartTooltipContainer}>
            {activeLinePoint ? (
              <div style={styles.lineTooltipActive} className="neo-pressed-sm">                  <span style={styles.tooltipMonth}>{activeLinePoint.data.label} {t('dashboard.trendLabel', lang)}</span>
                <span style={{ 
                  color: activeLinePoint.type === 'income' ? 'var(--color-income)' : 'var(--color-expense)',
                  fontWeight: 700 
                }}>
                  {activeLinePoint.type === 'income' ? t('income', lang) : t('expense', lang)}: ৳{activeLinePoint.type === 'income' ? formatNumber(activeLinePoint.data.income, lang) : formatNumber(activeLinePoint.data.expense, lang)}
                </span>
                <button style={styles.tooltipClose} onClick={() => setActiveLinePoint(null)}>×</button>
              </div>
            ) : (
              <div style={styles.lineTooltipHint}>
                <HelpCircle size={12} /> {t('dashboard.tapGraphNodes', lang)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 7. Recent Transactions Ledger */}
      <div style={styles.sectionHeader}>
        <h3 style={styles.sectionTitle}>{t('dashboard.recentLedger', lang)}</h3>
        <button style={styles.seeAllBtn} onClick={() => onNavigate('transactions')}>
          {t('dashboard.seeAll', lang)} <ChevronRight size={14} />
        </button>
      </div>

      <div style={styles.txList}>
        {recentTransactions.length === 0 ? (
          <div className="neo-pressed-sm" style={styles.emptyTxBox}>
            {t('dashboard.noTransactions', lang)}
          </div>
        ) : (
          recentTransactions.map(tx => {
            const cat = categories.find(c => c.id === tx.categoryId);
            const acc = accounts.find(a => a.id === tx.accountId);
            const toAcc = tx.type === 'transfer' ? accounts.find(a => a.id === tx.transferToId) : null;
            
            return (
              <TransactionItem
                key={tx.id}
                transaction={tx}
                account={acc}
                category={cat}
                toAccount={toAcc}
                showDate={true}
                showEdit={false}
                variant="default"
                lang={lang}
              />
            );
          })
        )}
      </div>

      {/* Spacer at bottom */}
      <div style={{ height: '10px' }} />

    </div>
  );
}

Dashboard.propTypes = {
  accounts: PropTypes.array,
  transactions: PropTypes.array,
  categories: PropTypes.array,
  reminders: PropTypes.array,
  onNavigate: PropTypes.func,
  theme: PropTypes.string,
  onToggleTheme: PropTypes.func,
  lang: PropTypes.string,
  onSetLang: PropTypes.func,
};

const styles = {
  scrollContainer: {
    flex: 1,
    overflowY: 'auto',
    paddingRight: '4px',
    position: 'relative',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    marginTop: '6px',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  title: {
    fontSize: '22px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    letterSpacing: '-0.5px',
  },
  subtext: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  actions: {
    display: 'flex',
    gap: '12px',
  },
  actionBtn: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    padding: 0,
    position: 'relative',
  },
  langPill: {
    display: 'flex',
    padding: '3px',
    borderRadius: '12px',
    gap: '3px',
    backgroundColor: 'var(--bg-color)',
    alignItems: 'center',
  },
  langOpt: {
    background: 'none',
    border: 'none',
    fontSize: '10px',
    fontWeight: '600',
    padding: '4px 8px',
    borderRadius: '9px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  badgeDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-expense)',
    position: 'absolute',
    top: '2px',
    right: '2px',
    border: '2px solid var(--bg-color)',
  },
  balanceCard: {
    padding: '24px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '24px',
    textAlign: 'center',
  },
  cardLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    letterSpacing: '1px',
    marginBottom: '6px',
  },
  balanceVal: {
    fontSize: '32px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    letterSpacing: '-1px',
  },
  cardIndicatorContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '10px',
  },
  cardIndicatorDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-income)',
    boxShadow: '0 0 8px var(--color-income)',
  },
  cardIndicatorText: {
    fontSize: '10px',
    color: 'var(--text-secondary)',
    fontWeight: '600',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '14px',
    marginBottom: '22px',
  },
  summaryBox: {
    padding: '12px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  sumIconBg: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--bg-color)',
    flexShrink: 0,
  },
  summaryLabel: {
    fontSize: '10px',
    color: 'var(--text-secondary)',
    fontWeight: '600',
  },
  summaryAmount: {
    fontSize: '13px',
    fontWeight: '700',
    marginTop: '1px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    marginTop: '8px',
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  seeAllBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--accent-color)',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
  },
  accountsScrollDeck: {
    display: 'flex',
    gap: '14px',
    overflowX: 'auto',
    paddingBottom: '12px',
    marginBottom: '20px',
    scrollbarWidth: 'none',
  },
  accountCard: {
    flexShrink: 0,
    width: '155px',
    padding: '14px 12px',
    borderRadius: '16px',
    backgroundColor: 'var(--bg-color)',
    maxWidth: '100%',
    minWidth: 0,
  },
  accCardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '10px',
  },
  accCardIcon: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accCardType: {
    fontSize: '9px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
  },
  accCardName: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100%',
  },
  accCardBalance: {
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginTop: '4px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  chartContainer: {
    padding: '16px',
    marginBottom: '22px',
  },
  emptyChart: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '30px 0',
  },
  emptyChartText: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginTop: '8px',
    fontWeight: '500',
  },
  pieLayout: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
  },
  pieLegend: {
    flex: 1,
    paddingLeft: '10px',
  },
  legendList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  legendRow: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    transition: 'opacity 0.2s',
  },
  legendDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginRight: '6px',
    flexShrink: 0,
  },
  legendName: {
    flex: 1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginRight: '4px',
  },
  legendVal: {
    color: 'var(--text-secondary)',
    fontWeight: '700',
  },
  legendMoreLink: {
    fontSize: '9px',
    color: 'var(--text-secondary)',
    fontWeight: '600',
    fontStyle: 'italic',
    marginTop: '2px',
  },
  legendHighlight: {
    display: 'flex',
    flexDirection: 'column',
  },
  legendDotRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginBottom: '2px',
  },
  legendTitleHighlight: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  legendPriceHighlight: {
    fontSize: '16px',
    fontWeight: '800',
    color: 'var(--color-expense)',
  },
  legendDescHighlight: {
    fontSize: '9px',
    color: 'var(--text-secondary)',
    marginTop: '2px',
  },
  legendResetBtn: {
    marginTop: '8px',
    background: 'none',
    border: 'none',
    color: 'var(--accent-color)',
    fontSize: '10px',
    fontWeight: '700',
    cursor: 'pointer',
    textAlign: 'left',
    padding: 0,
  },
  lineChartWrapper: {
    display: 'flex',
    flexDirection: 'column',
  },
  lineChartSvg: {
    overflow: 'visible',
  },
  lineChartTooltipContainer: {
    height: '32px',
    marginTop: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineTooltipHint: {
    fontSize: '10px',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontWeight: '500',
  },
  lineTooltipActive: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    padding: '4px 10px',
    borderRadius: '8px',
    position: 'relative',
  },
  tooltipMonth: {
    fontWeight: '600',
    color: 'var(--text-secondary)',
  },
  tooltipClose: {
    background: 'none',
    border: 'none',
    color: 'var(--color-expense)',
    fontWeight: '700',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '0 0 0 4px',
  },
  txList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '20px',
  },
  emptyTxBox: {
    padding: '16px',
    textAlign: 'center',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
};

