import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import PropTypes from 'prop-types';
import { t } from '../i18n';
import { formatNumber, formatPercent } from '../utils';
import PieChart from './PieChart';

export default function AnalyticsView({
  transactions,
  categories,
  onNavigate,
  lang
}) {
  const [timeRange, setTimeRange] = useState('month'); // 'month', 'last_month', '6_months', 'all'
  const [activeChart1, setActiveChart1] = useState(null); // Overview slice index
  const [activeChart2, setActiveChart2] = useState(null); // Income slice index
  const [activeChart3, setActiveChart3] = useState(null); // Expense slice index
  const [animationProgress, setAnimationProgress] = useState(0);

  // Smooth loading animation sweep
  useEffect(() => {
    setAnimationProgress(0);
    const duration = 600; // ms
    const startTime = performance.now();

    let animFrame;
    const animate = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function: cubic-out
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setAnimationProgress(easedProgress);

      if (progress < 1) {
        animFrame = requestAnimationFrame(animate);
      }
    };

    animFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrame);
  }, [timeRange]);

  // 1. Filtered Transactions based on Time Range
  const filteredTxs = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return transactions.filter(tx => {
      const txDate = new Date(tx.date);
      const txYear = txDate.getFullYear();
      const txMonth = txDate.getMonth();

      if (timeRange === 'month') {
        return txYear === currentYear && txMonth === currentMonth;
      }
      if (timeRange === 'last_month') {
        const targetMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const targetYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return txYear === targetYear && txMonth === targetMonth;
      }
      if (timeRange === '6_months') {
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        return txDate >= sixMonthsAgo;
      }
      return true; // 'all'
    });
  }, [transactions, timeRange]);

  // 2. Calculations: Overview Chart (Income vs Expense)
  const overviewData = useMemo(() => {
    let income = 0;
    let expense = 0;

    filteredTxs.forEach(tx => {
      if (tx.type === 'income') income += tx.amount;
      if (tx.type === 'expense') expense += tx.amount;
    });

    const total = income + expense;

    const data = [];
    if (income > 0) {
      data.push({
        id: 'overview_income',
        name: t('analytics.totalIncome', lang),
        amount: income,
        color: 'var(--color-income)',
        gradientId: 'grad-inc-overview',
        colorStart: '#22C55E',
        colorEnd: '#22C55E',
        percentage: total > 0 ? Math.round((income / total) * 100) : 0,
      });
    }
    if (expense > 0) {
      data.push({
        id: 'overview_expense',
        name: t('analytics.totalExpense', lang),
        amount: expense,
        color: 'var(--color-expense)',
        gradientId: 'grad-exp-overview',
        colorStart: '#EF4444',
        colorEnd: '#EF4444',
        percentage: total > 0 ? Math.round((expense / total) * 100) : 0,
      });
    }

    return { data, income, expense, total };
  }, [filteredTxs, lang]);

  // 3. Calculations: Income Categories breakdown
  const incomeBreakdown = useMemo(() => {
    const breakdown = {};
    let totalIncome = 0;

    filteredTxs.forEach(tx => {
      if (tx.type === 'income') {
        const cat = categories.find(c => c.id === tx.categoryId);
        const catName = cat ? cat.name : t('analytics.otherIncome', lang);
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
        totalIncome += tx.amount;
      }
    });

    return Object.values(breakdown).map(item => ({
      ...item,
      percentage: totalIncome > 0 ? Math.round((item.amount / totalIncome) * 100) : 0
    })).sort((a, b) => b.amount - a.amount);
  }, [filteredTxs, categories, lang]);

  // 4. Calculations: Expense Categories breakdown
  const expenseBreakdown = useMemo(() => {
    const breakdown = {};
    let totalExpense = 0;

    filteredTxs.forEach(tx => {
      if (tx.type === 'expense') {
        const cat = categories.find(c => c.id === tx.categoryId);
        const catName = cat ? cat.name : t('analytics.otherExpense', lang);
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
    })).sort((a, b) => b.amount - a.amount);
  }, [filteredTxs, categories, lang]);

  return (
    <div style={styles.container}>
      
      {/* 1. Header Toolbar */}
      <div style={styles.header}>
        <button className="neo-btn neo-btn-round" style={styles.backBtn} onClick={() => onNavigate('dashboard')}>
          <ArrowLeft size={18} />
        </button>
        <h2 style={styles.title}>{t('analytics.title', lang)}</h2>
        <div style={{ width: '36px' }} /> {/* alignment balance */}
      </div>

      {/* 2. Range Selector */}
      <div className="neo-pressed-sm" style={styles.rangeSelector}>
        {[
          { key: 'month', label: t('analytics.thisMonth', lang) },
          { key: 'last_month', label: t('analytics.lastMonth', lang) },
          { key: '6_months', label: t('analytics.sixMonths', lang) },
          { key: 'all', label: t('analytics.allTime', lang) },
        ].map(item => (
          <button
            key={item.key}
            onClick={() => {
              setTimeRange(item.key);
              setActiveChart1(null);
              setActiveChart2(null);
              setActiveChart3(null);
            }}
            className="neo-btn"
            style={{
              ...styles.rangeBtn,
              boxShadow: timeRange === item.key ? 'var(--neomorphic-raised-sm)' : 'none',
              color: timeRange === item.key ? 'var(--accent-color)' : 'var(--text-secondary)',
              fontWeight: timeRange === item.key ? '700' : '500',
              border: timeRange === item.key ? '1px solid rgba(255,255,255,0.4)' : '1px solid transparent',
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* 3. Scrollable List of Charts */}
      <div style={styles.scrollContent}>
        
        {/* ==================== CHART 1: Overview Ratio ==================== */}
        <div className="neo-raised" style={styles.chartCard}>
          <h4 style={styles.chartTitle}>{t('analytics.overview', lang)}</h4>
          {overviewData.total === 0 ? (
            <div style={styles.emptyState}>{t('analytics.noData', lang)}</div>
          ) : (
            <div style={styles.pieRow}>
              <PieChart
                data={overviewData.data}
                activeIndex={activeChart1}
                onSliceClick={(idx) => setActiveChart1(activeChart1 === idx ? null : idx)}
                centerText={t('analytics.ratio', lang)}
                animate={true}
                animationProgress={animationProgress}
                gradients={[
                  { id: 'grad-inc-overview', colorStart: '#22C55E', colorEnd: '#22C55E' },
                  { id: 'grad-exp-overview', colorStart: '#EF4444', colorEnd: '#EF4444' },
                ]}
                showLabels={true}
                labelThreshold={10}
              />

              {/* Chart details */}
              <div style={styles.chartDetails}>
                {activeChart1 !== null && overviewData.data[activeChart1] ? (
                  <div className="neo-pressed-sm" style={styles.detailsBox}>
                    <span style={{ 
                      ...styles.detailsVal, 
                      color: overviewData.data[activeChart1]?.id?.includes('income') ? 'var(--color-income)' : 'var(--color-expense)' 
                    }}>
                      ৳{formatNumber(overviewData.data[activeChart1]?.amount, lang)}
                    </span>
                    <span style={styles.detailsLabel}>
                      {overviewData.data[activeChart1]?.name} ({formatPercent(overviewData.data[activeChart1]?.percentage, lang)})
                    </span>
                  </div>
                ) : (
                  <div style={styles.legendBlock}>
                    <div style={styles.legendRow}>
                      <span style={{ ...styles.legendBullet, backgroundColor: 'var(--color-income)' }} />
                      <span style={styles.legendName}>{t('analytics.incomeLabel', lang)} ৳{formatNumber(overviewData.income, lang)}</span>
                    </div>
                    <div style={styles.legendRow}>
                      <span style={{ ...styles.legendBullet, backgroundColor: 'var(--color-expense)' }} />
                      <span style={styles.legendName}>{t('analytics.expenseLabel', lang)} ৳{formatNumber(overviewData.expense, lang)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ==================== CHART 2: Income Breakdown ==================== */}
        <div className="neo-raised" style={styles.chartCard}>
          <h4 style={styles.chartTitle}>{t('analytics.incomeBreakdown', lang)}</h4>
          {incomeBreakdown.length === 0 ? (
            <div style={styles.emptyState}>{t('analytics.noData', lang)}</div>
          ) : (
            <div style={styles.pieRow}>
              <PieChart
                data={incomeBreakdown}
                activeIndex={activeChart2}
                onSliceClick={(idx) => setActiveChart2(activeChart2 === idx ? null : idx)}
                centerText={t('analytics.sources', lang)}
                animate={true}
                animationProgress={animationProgress}
                showLabels={true}
                labelThreshold={12}
              />

              {/* Chart details */}
              <div style={styles.chartDetails}>
                {activeChart2 !== null && incomeBreakdown[activeChart2] ? (
                  <div className="neo-pressed-sm" style={styles.detailsBox}>
                    <span style={{ ...styles.detailsVal, color: 'var(--color-income)' }}>
                      ৳{formatNumber(incomeBreakdown[activeChart2]?.amount, lang)}
                    </span>
                    <span style={styles.detailsLabel}>
                      {incomeBreakdown[activeChart2]?.name} ({formatPercent(incomeBreakdown[activeChart2]?.percentage, lang)})
                    </span>
                  </div>
                ) : (
                  <div style={styles.legendScrollList} className="hide-scrollbar">
                    {incomeBreakdown.slice(0, 3).map(cat => (
                      <div key={cat.id} style={styles.legendRow}>
                        <span style={{ ...styles.legendBullet, backgroundColor: cat.color }} />
                        <span style={styles.legendName}>{cat.name} ({formatPercent(cat.percentage, lang)})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ==================== CHART 3: Expense Breakdown ==================== */}
        <div className="neo-raised" style={styles.chartCard}>
          <h4 style={styles.chartTitle}>{t('analytics.expenseBreakdown', lang)}</h4>
          {expenseBreakdown.length === 0 ? (
            <div style={styles.emptyState}>{t('analytics.noData', lang)}</div>
          ) : (
            <div style={styles.pieRow}>
              <PieChart
                data={expenseBreakdown}
                activeIndex={activeChart3}
                onSliceClick={(idx) => setActiveChart3(activeChart3 === idx ? null : idx)}
                centerText={t('analytics.costs', lang)}
                animate={true}
                animationProgress={animationProgress}
                showLabels={true}
                labelThreshold={12}
              />

              {/* Chart details */}
              <div style={styles.chartDetails}>
                {activeChart3 !== null && expenseBreakdown[activeChart3] ? (
                  <div className="neo-pressed-sm" style={styles.detailsBox}>
                    <span style={{ ...styles.detailsVal, color: 'var(--color-expense)' }}>
                      ৳{formatNumber(expenseBreakdown[activeChart3]?.amount, lang)}
                    </span>
                    <span style={styles.detailsLabel}>
                      {expenseBreakdown[activeChart3]?.name} ({formatPercent(expenseBreakdown[activeChart3]?.percentage, lang)})
                    </span>
                  </div>
                ) : (
                  <div style={styles.legendScrollList} className="hide-scrollbar">
                    {expenseBreakdown.slice(0, 3).map(cat => (
                      <div key={cat.id} style={styles.legendRow}>
                        <span style={{ ...styles.legendBullet, backgroundColor: cat.color }} />
                        <span style={styles.legendName}>{cat.name} ({formatPercent(cat.percentage, lang)})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer spacing */}
        <div style={{ height: '30px' }} />

      </div>

    </div>
  );
}

AnalyticsView.propTypes = {
  transactions: PropTypes.array,
  categories: PropTypes.array,
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
  title: {
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  rangeSelector: {
    display: 'flex',
    padding: '4px',
    borderRadius: '16px',
    marginBottom: '16px',
    backgroundColor: 'var(--bg-color)',
    gap: '4px',
  },
  rangeBtn: {
    flex: 1,
    padding: '8px 0',
    fontSize: '10px',
    borderRadius: '12px',
    backgroundColor: 'transparent',
    boxShadow: 'none',
  },
  scrollContent: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    paddingRight: '2px',
  },
  chartCard: {
    padding: '16px 14px',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '20px',
  },
  chartTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '12px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: '6px',
  },
  emptyState: {
    padding: '30px 10px',
    fontSize: '11px',
    color: 'var(--text-secondary)',
    textAlign: 'center',
    fontWeight: '500',
  },
  pieRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
  },
  chartDetails: {
    flex: 1,
    paddingLeft: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  detailsBox: {
    width: '100%',
    padding: '12px 10px',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  detailsVal: {
    fontSize: '15px',
    fontWeight: '800',
  },
  detailsLabel: {
    fontSize: '9px',
    color: 'var(--text-secondary)',
    fontWeight: '600',
    marginTop: '3px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100%',
  },
  legendBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    width: '100%',
  },
  legendScrollList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    width: '100%',
    maxHeight: '120px',
    overflowY: 'auto',
  },
  legendRow: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  legendBullet: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginRight: '6px',
    flexShrink: 0,
  },
  legendName: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
};
