import { useState, useMemo } from 'react';
import { 
  Bell, Sun, Moon, ArrowUpRight, ArrowDownLeft,
  Wallet, Landmark, CreditCard, ChevronRight, HelpCircle,
  PieChart as PieChartIcon, Target,
} from 'lucide-react';
import PropTypes from 'prop-types';
import { t } from '../i18n';
import { formatNumber, formatPercent } from '../utils';
import { trackAction } from '../lib/analytics';
import TransactionItem from './TransactionItem';

export default function Dashboard({ 
  accounts, 
  transactions, 
  categories, 
  reminders,
  budgets,
  savingsGoals,
  onNavigate, 
  theme, 
  onToggleTheme,
  lang,
}) {
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

  // 3. Calculations: Monthly Trend Data (Line Chart Data - last 6 months)
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

  // Account name localization for seed accounts
  const getLocalizedAccName = (acc) => {
    if (lang !== 'bn') return acc.name;
    const nameMap = {
      'Cash': t('accounts.name.cash', lang),
      'Cash Ledger': t('accounts.name.cash', lang),
      'Bank Account': t('accounts.name.bankAccount', lang),
      'bKash Wallet': t('accounts.name.bkashWallet', lang),
      'Nagad Wallet': t('accounts.name.nagadWallet', lang),
    };
    return nameMap[acc.name] || acc.name;
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
      ...monthlyTrends.map(m => Math.max(m.income, m.expense)),
      5000 // default min height
    ) * 1.15; // 15% padding top

    const pointsCount = monthlyTrends.length;
    const stepX = (width - paddingX * 2) / (pointsCount - 1);

    const getX = (idx) => paddingX + idx * stepX;
    const getY = (val) => height - paddingY - (val / maxVal) * (height - paddingY * 2);

    // Calculate lines
    const incomePoints = monthlyTrends.map((m, idx) => ({ x: getX(idx), y: getY(m.income), data: m }));
    const expensePoints = monthlyTrends.map((m, idx) => ({ x: getX(idx), y: getY(m.expense), data: m }));

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
          {/* Theme Toggle */}
          <button 
            className="neo-btn neo-btn-round" 
            style={styles.actionBtn}
            onClick={() => { onNavigate('reminders'); trackAction('view_reminders', { source: 'dashboard_header' }); }}
          >
            <Bell size={18} style={{ color: hasOverdueReminders ? 'var(--color-expense)' : 'var(--text-secondary)' }} />
            {hasOverdueReminders && <div style={styles.badgeDot} />}
          </button>
          <button 
            className="neo-btn neo-btn-round" 
            style={styles.actionBtn}
            onClick={() => { onToggleTheme(); trackAction('toggle_theme', { source: 'dashboard' }); }}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </div>

      {/* 2. Aggregate Balance Card */}
      <div className="neo-raised card-entrance" style={styles.balanceCard}>
        <span style={styles.cardLabel}>{t('dashboard.totalBalance', lang)}</span>
        <h2 style={styles.balanceVal}>৳ {formatNumber(netBalance, lang)}</h2>
        <div style={styles.cardIndicatorContainer}>
          <div className="balance-dot" style={styles.cardIndicatorDot} />
          <span style={styles.cardIndicatorText}>{t('dashboard.dbActive', lang)}</span>
        </div>
      </div>

      {/* 3. Income vs Expense summary */}
      <div style={styles.summaryGrid}>
        <div className="neo-raised-sm card-entrance card-entrance-1 hover-lift" style={styles.summaryBox}>
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

        <div className="neo-raised-sm card-entrance card-entrance-2 hover-lift" style={styles.summaryBox}>
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
        <button style={styles.seeAllBtn}onClick={() => { onNavigate('accounts'); trackAction('view_accounts', { source: 'dashboard_deck' }); }}
          >
          {t('dashboard.manage', lang)} <ChevronRight size={14} />
        </button>
      </div>

      <div style={styles.accountsScrollDeck} className="hide-scrollbar">
        {accounts.map((acc, idx) => (
          <div 
            key={acc.id} 
            className={`neo-raised-sm hover-lift press-scale card-entrance card-entrance-${Math.min(idx + 1, 6)}`} 
            style={{ 
              ...styles.accountCard, 
              borderLeft: `3px solid ${acc.color || 'var(--accent-color)'}` 
            }}onClick={() => { onNavigate('accounts'); trackAction('view_accounts', { source: 'dashboard_card' }); }}
            >
              <span style={{ ...styles.accCardIcon, backgroundColor: `${acc.color}22`, color: acc.color }}>
              {getAccountIcon(acc.type)}
            </span>
            <h4 style={styles.accCardName}>{getLocalizedAccName(acc)}</h4>
            <p style={styles.accCardBalance}>৳ {formatNumber(acc.balance, lang)}</p>
          </div>
        ))}
      </div>

      {/* 4.5 Budget & Savings Mini Cards — Always visible for quick access */}
      <div style={styles.miniCardsRow}>
        <div className="neo-raised-sm hover-lift card-entrance card-entrance-3" style={styles.miniCard} onClick={() => { onNavigate('budgets'); trackAction('view_budgets', { source: 'dashboard_mini' }); }}>
          <div style={styles.miniCardIcon}><PieChartIcon size={14} style={{ color: 'var(--accent-color)' }} /></div>
          <span style={styles.miniCardLabel}>{t('budget.title', lang)}</span>
          <span style={styles.miniCardCount}>
            {budgets?.length > 0
              ? `${formatNumber(budgets.length, lang)} ${t('dashboard.active', lang)}`
              : t('dashboard.createFirst', lang)}
          </span>
        </div>
        <div className="neo-raised-sm hover-lift card-entrance card-entrance-4" style={styles.miniCard} onClick={() => { onNavigate('savings'); trackAction('view_savings', { source: 'dashboard_mini' }); }}>
          <div style={styles.miniCardIcon}><Target size={14} style={{ color: 'var(--color-income)' }} /></div>
          <span style={styles.miniCardLabel}>{t('savings.title', lang)}</span>
          <span style={styles.miniCardCount}>
            {savingsGoals?.length > 0
              ? `${formatNumber(savingsGoals.filter(g => g.currentAmount >= g.targetAmount).length, lang)}/${formatNumber(savingsGoals.length, lang)} ${t('dashboard.done', lang)}`
              : t('dashboard.createFirst', lang)}
          </span>
        </div>
      </div>

      {/* 5. Overview — Income vs Expense Summary Card */}
      <div style={styles.sectionHeader}>
        <h3 style={styles.sectionTitle}>{t('dashboard.overview', lang)}</h3>
      </div>

      <div className="neo-raised card-entrance card-entrance-5" style={styles.chartContainer}>
        {(() => {
          const { income, expense } = monthlyTotals;
          const net = income - expense;
          const maxVal = Math.max(income, expense, 1);
          const incomePct = (income / maxVal) * 100;
          const expensePct = (expense / maxVal) * 100;
          const savingsRate = income > 0 ? ((net / income) * 100) : 0;

          return (
            <div style={styles.overviewBody}>
              {/* Income bar */}
              <div style={styles.overviewRow}>
                <span style={styles.overviewLabel}>{t('income', lang)}</span>
                <div style={styles.overviewBarTrack}>
                  <div style={{ ...styles.overviewBarFill, width: `${Math.max(incomePct, 2)}%`, backgroundColor: 'var(--color-income)' }} />
                </div>
                <span style={styles.overviewAmount}>৳{formatNumber(income, lang)}</span>
              </div>

              {/* Expense bar */}
              <div style={styles.overviewRow}>
                <span style={styles.overviewLabel}>{t('expense', lang)}</span>
                <div style={styles.overviewBarTrack}>
                  <div style={{ ...styles.overviewBarFill, width: `${Math.max(expensePct, 2)}%`, backgroundColor: 'var(--color-expense)' }} />
                </div>
                <span style={styles.overviewAmount}>৳{formatNumber(expense, lang)}</span>
              </div>

              {/* Divider */}
              <div style={styles.overviewDivider} />

              {/* Net result */}
              <div style={styles.overviewNetRow}>
                <span style={styles.overviewNetLabel}>{t('dashboard.net', lang)}</span>
                <span style={{ ...styles.overviewNetAmount, color: net >= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}>
                  {net >= 0 ? '+' : '-'}৳{formatNumber(Math.abs(net), lang)}
                </span>
              </div>

              {/* Savings Rate */}
              <div style={styles.overviewRateRow}>
                <span style={styles.overviewRateLabel}>{t('dashboard.savingsRate', lang)}</span>
                <span style={{
                  ...styles.overviewRateValue,
                  color: savingsRate >= 0 ? 'var(--color-income)' : 'var(--color-expense)',
                }}>
                  {savingsRate >= 0 ? '+' : ''}{formatPercent(Math.round(savingsRate), lang)}
                </span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* 6. Line Chart - Monthly income & expense trends */}
      <div style={styles.sectionHeader}>
        <h3 style={styles.sectionTitle}>{t('dashboard.financialTrends', lang)}</h3>
      </div>

      <div className="neo-raised card-entrance card-entrance-6" style={styles.chartContainer}>
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
            {monthlyTrends.map((m, idx) => (
              <text
                key={`lbl-${idx}`}
                x={lineChartData.incomePoints[idx].x}
                y="118"
                textAnchor="middle"
                fontSize="8"
                fontWeight="600"
                fill="var(--text-secondary)"
              >
                {m.label}
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
        <button style={styles.seeAllBtn} onClick={() => { onNavigate('transactions'); trackAction('view_transactions', { source: 'dashboard_recent' }); }}>
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
  budgets: PropTypes.array,
  savingsGoals: PropTypes.array,
  onNavigate: PropTypes.func,
  theme: PropTypes.string,
  onToggleTheme: PropTypes.func,
  lang: PropTypes.string,
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
    width: '120px',
    padding: '10px',
    borderRadius: '14px',
    backgroundColor: 'var(--bg-color)',
    maxWidth: '100%',
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  accCardIcon: {
    width: '22px',
    height: '22px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
  },
  accCardName: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100%',
    lineHeight: 1.2,
  },
  accCardBalance: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  chartContainer: {
    padding: '16px',
    marginBottom: '22px',
  },

  // Overview card styles
  overviewBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  overviewRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  overviewLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    minWidth: '52px',
    flexShrink: 0,
  },
  overviewBarTrack: {
    flex: 1,
    height: '18px',
    borderRadius: '9px',
    backgroundColor: 'var(--bg-color)',
    overflow: 'hidden',
    boxShadow: 'var(--neomorphic-pressed-sm)',
  },
  overviewBarFill: {
    height: '100%',
    borderRadius: '9px',
    transition: 'width 0.5s ease',
    minWidth: '4px',
  },
  overviewAmount: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    minWidth: '80px',
    textAlign: 'right',
    flexShrink: 0,
  },
  overviewDivider: {
    height: '1px',
    backgroundColor: 'rgba(255,255,255,0.06)',
    margin: '4px 0',
  },
  overviewNetRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overviewNetLabel: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  overviewNetAmount: {
    fontSize: '18px',
    fontWeight: '800',
  },
  overviewRateRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overviewRateLabel: {
    fontSize: '10px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
  },
  overviewRateValue: {
    fontSize: '13px',
    fontWeight: '700',
  },

  lineChartWrapper: {
    display: 'flex',
    flexDirection: 'column',
  },
  lineChartSvg: {
    overflow: 'visible',
  },
  miniCardsRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
    marginTop: '-8px',
  },
  miniCard: {
    flex: 1,
    padding: '12px',
    borderRadius: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  miniCardIcon: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--bg-color)',
    boxShadow: 'var(--neomorphic-pressed-sm)',
    marginBottom: '6px',
  },
  miniCardLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  miniCardCount: {
    fontSize: '9px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
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

