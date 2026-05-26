import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, AlertTriangle, Target, Lightbulb } from 'lucide-react';
import PropTypes from 'prop-types';
import { t } from '../i18n';
import { formatNumber, formatPercent } from '../utils';
import PieChart from './PieChart';

// ===== DATE BOUNDS HELPER =====
/**
 * Given a timeRange key, returns Date boundaries for the current period
 * and the previous period (for comparison).
 * Returns { currentStart, currentEnd, prevStart, prevEnd } as Date objects.
 * For 'all', currentStart is null (infinite past) and prevStart/prevEnd are null (no comparison).
 */
function getDateBounds(range) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  if (range === 'month') {
    return {
      currentStart: new Date(y, m, 1),
      currentEnd: new Date(y, m + 1, 0, 23, 59, 59, 999),
      prevStart: new Date(y, m - 1, 1),
      prevEnd: new Date(y, m, 0, 23, 59, 59, 999),
    };
  }
  if (range === 'last_month') {
    return {
      currentStart: new Date(y, m - 1, 1),
      currentEnd: new Date(y, m, 0, 23, 59, 59, 999),
      prevStart: new Date(y, m - 2, 1),
      prevEnd: new Date(y, m - 1, 0, 23, 59, 59, 999),
    };
  }
  if (range === '6_months') {
    return {
      currentStart: new Date(y, m - 5, 1),
      currentEnd: new Date(y, m + 1, 0, 23, 59, 59, 999),
      prevStart: new Date(y, m - 11, 1),
      prevEnd: new Date(y, m - 5, 0, 23, 59, 59, 999),
    };
  }
  // 'all'
  return {
    currentStart: null, // from the beginning of time
    currentEnd: new Date(y, m + 1, 0, 23, 59, 59, 999),
    prevStart: null, // no previous period
    prevEnd: null,
  };
}

export default function AnalyticsView({
  transactions,
  categories,
  budgets,
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
    const duration = 600;
    const startTime = performance.now();

    let animFrame;
    const animate = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setAnimationProgress(easedProgress);
      if (progress < 1) {
        animFrame = requestAnimationFrame(animate);
      }
    };

    animFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrame);
  }, [timeRange]);

  // ===== HELPER: filter transactions by time range =====
  const filterTxs = (txs, range) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return txs.filter(tx => {
      const txDate = new Date(tx.date);
      const txYear = txDate.getFullYear();
      const txMonth = txDate.getMonth();

      if (range === 'month') {
        return txYear === currentYear && txMonth === currentMonth;
      }
      if (range === 'last_month') {
        const targetMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const targetYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return txYear === targetYear && txMonth === targetMonth;
      }
      if (range === '6_months') {
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        return txDate >= sixMonthsAgo;
      }
      return true;
    });
  };

  // 1. Filtered Transactions based on Time Range
  const filteredTxs = useMemo(() => filterTxs(transactions, timeRange), [transactions, timeRange]);

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

  // ===== DATE BOUNDS HELPER =====
  const dateBounds = useMemo(() => getDateBounds(timeRange), [timeRange]);

  // Range label map for display
  const rangeLabel = useMemo(() => ({
    month: t('analytics.thisMonth', lang),
    last_month: t('analytics.lastMonth', lang),
    '6_months': t('analytics.sixMonths', lang),
    all: t('analytics.allTime', lang),
  }[timeRange]), [timeRange, lang]);

  // ==================== FEATURE A: Budget vs Actual ====================
  const budgetVsActual = useMemo(() => {
    const { currentStart, currentEnd } = dateBounds;
    const isAllTime = !currentStart;

    // Filter budgets that fall within the selected time range
    let currentBudgets = budgets.filter(b => {
      if (isAllTime) return true; // 'all' range — include all budgets
      const budgetDate = new Date(b.year, b.month, 1);
      return budgetDate >= currentStart && budgetDate <= currentEnd;
    });

    // In All Time mode, aggregate by category — take the latest budget per category
    if (isAllTime) {
      const latestByCat = {};
      currentBudgets.forEach(b => {
        const key = b.categoryId;
        const existing = latestByCat[key];
        if (!existing || b.year > existing.year || (b.year === existing.year && b.month > existing.month)) {
          latestByCat[key] = b;
        }
      });
      currentBudgets = Object.values(latestByCat);
    }

    return currentBudgets.map(b => {
      const cat = categories.find(c => c.id === b.categoryId);
      const spent = transactions
        .filter(tx => {
          if (tx.type !== 'expense') return false;
          if (tx.categoryId !== b.categoryId) return false;
          if (isAllTime) return true; // all transactions for this category
          const d = new Date(tx.date);
          return d >= currentStart && d <= currentEnd;
        })
        .reduce((sum, tx) => sum + tx.amount, 0);
      const percentage = b.limit > 0 ? Math.min((spent / b.limit) * 100, 100) : (spent > 0 ? 100 : 0);
      const displayPct = b.limit === 0 && spent > 0 ? '100%+' : formatPercent(percentage, lang);
      return {
        ...b,
        categoryName: cat?.name || 'Unknown',
        categoryColor: cat?.color || '#bdc3c7',
        spent,
        remaining: b.limit - spent,
        percentage,
        displayPct,
        isOverBudget: spent > b.limit,
      };
    }).sort((a, b) => b.percentage - a.percentage);
  }, [budgets, transactions, categories, dateBounds]);

  const budgetVsActualTotal = useMemo(() => {
    const totalLimit = budgetVsActual.reduce((s, b) => s + b.limit, 0);
    const totalSpent = budgetVsActual.reduce((s, b) => s + b.spent, 0);
    return {
      totalLimit,
      totalSpent,
      totalPct: totalLimit > 0 ? Math.min((totalSpent / totalLimit) * 100, 100) : 0,
    };
  }, [budgetVsActual]);

  // ==================== FEATURE B: Smart Insights ====================
  const insights = useMemo(() => {
    const { currentStart, currentEnd, prevStart, prevEnd } = dateBounds;
    const isAllTime = !currentStart;

    // Helper: check if a tx date falls within a range
    const inRange = (d, start, end) => {
      if (!start) return d <= end; // 'all' — everything up to now
      return d >= start && d <= end;
    };

    // Current period expense by category
    const currentCatSpending = {};
    const prevCatSpending = {};

    transactions.forEach(tx => {
      if (tx.type !== 'expense') return;
      const d = new Date(tx.date);

      if (inRange(d, currentStart, currentEnd)) {
        currentCatSpending[tx.categoryId] = (currentCatSpending[tx.categoryId] || 0) + tx.amount;
      }
      if (prevStart && inRange(d, prevStart, prevEnd)) {
        prevCatSpending[tx.categoryId] = (prevCatSpending[tx.categoryId] || 0) + tx.amount;
      }
    });

    // Build category-level comparison
    const catChanges = [];
    const allCatIds = new Set([...Object.keys(currentCatSpending), ...Object.keys(prevCatSpending)]);
    allCatIds.forEach(catId => {
      const current = currentCatSpending[catId] || 0;
      const prev = prevCatSpending[catId] || 0;
      const diff = current - prev;
      const cat = categories.find(c => c.id === catId);
      catChanges.push({
        categoryId: catId,
        categoryName: cat?.name || 'Unknown',
        categoryColor: cat?.color || '#bdc3c7',
        current,
        prev,
        diff,
        pctChange: prev > 0 ? Math.round((diff / prev) * 100) : (current > 0 ? 100 : 0),
      });
    });

    // Current period totals
    const currentIncome = transactions
      .filter(tx => {
        const d = new Date(tx.date);
        return inRange(d, currentStart, currentEnd) && tx.type === 'income';
      })
      .reduce((sum, tx) => sum + tx.amount, 0);
    const currentExpense = transactions
      .filter(tx => {
        const d = new Date(tx.date);
        return inRange(d, currentStart, currentEnd) && tx.type === 'expense';
      })
      .reduce((sum, tx) => sum + tx.amount, 0);

    const currentTxCount = transactions.filter(tx => {
      const d = new Date(tx.date);
      return inRange(d, currentStart, currentEnd);
    }).length;

    const prevTxCount = transactions.filter(tx => {
      const d = new Date(tx.date);
      return prevStart && inRange(d, prevStart, prevEnd);
    }).length;

    const txCountDiff = currentTxCount - prevTxCount;

    // Top category = highest current spending
    catChanges.sort((a, b) => b.current - a.current);
    const topCategory = catChanges.length > 0 && catChanges[0].current > 0 ? catChanges[0] : null;

    // Biggest increase (only when there's a previous period to compare)
    const biggestIncrease = prevStart && catChanges.filter(c => c.diff > 0).sort((a, b) => b.diff - a.diff)[0] || null;

    // Biggest decrease (only when there's a previous period to compare)
    const biggestDecrease = prevStart && catChanges.filter(c => c.diff < 0).sort((a, b) => a.diff - b.diff)[0] || null;

    return {
      currentIncome,
      currentExpense,
      netSavings: currentIncome - currentExpense,
      savingsRate: currentIncome > 0 ? Math.round(((currentIncome - currentExpense) / currentIncome) * 100) : 0,
      currentTxCount,
      txCountDiff,
      topCategory,
      biggestIncrease,
      biggestDecrease,
      hasData: currentIncome > 0 || currentExpense > 0,
      hasComparison: !!prevStart,
    };
  }, [transactions, categories, dateBounds]);

  // Derived insight flags for rendering
  const hasComparison = insights.hasComparison;

  // ==================== FEATURE C: Anomaly Detection ====================
  const anomalies = useMemo(() => {
    const { currentStart, currentEnd } = dateBounds;

    // Helper: check if a tx date falls within range
    const inRange = (d, start, end) => {
      if (!start) return d <= end; // 'all' — everything up to now
      return d >= start && d <= end;
    };

    // Group expense transactions by category within the selected time range
    const categoryTxGroups = {};

    const rangeExpenses = transactions.filter(tx => {
      if (tx.type !== 'expense') return false;
      const d = new Date(tx.date);
      return inRange(d, currentStart, currentEnd);
    });

    if (rangeExpenses.length < 3) return { flagged: [], hasEnoughData: false };

    rangeExpenses.forEach(tx => {
      if (!categoryTxGroups[tx.categoryId]) categoryTxGroups[tx.categoryId] = [];
      categoryTxGroups[tx.categoryId].push(tx);
    });

    // Calculate average per category and flag anomalies (> 2x the avg)
    const threshold = 2.0;
    const flagged = [];

    Object.entries(categoryTxGroups).forEach(([catId, txs]) => {
      const cat = categories.find(c => c.id === catId);
      if (txs.length < 2) return; // Need at least 2 transactions for a meaningful average

      const total = txs.reduce((sum, tx) => sum + tx.amount, 0);
      const avg = total / txs.length;

      txs.forEach(tx => {
        if (tx.amount > avg * threshold) {
          flagged.push({
            ...tx,
            categoryName: cat?.name || 'Unknown',
            categoryColor: cat?.color || '#bdc3c7',
            average: Math.round(avg),
            multiplier: Math.round((tx.amount / avg) * 10) / 10,
          });
        }
      });
    });

    // Sort flagged by multiplier descending
    flagged.sort((a, b) => b.multiplier - a.multiplier);

    return { flagged, hasEnoughData: true };
  }, [transactions, categories, dateBounds]);

  return (
    <div style={styles.container}>

      {/* 1. Header Toolbar */}
      <div style={styles.header}>
        <button className="neo-btn neo-btn-round" style={styles.backBtn} onClick={() => onNavigate('dashboard')}>
          <ArrowLeft size={18} />
        </button>
        <h2 style={styles.title}>{t('analytics.title', lang)}</h2>
        <div style={{ width: '36px' }} />
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

      {/* 3. Scrollable List of Charts & Features */}
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

        {/* ==================== FEATURE A: Budget vs Actual ==================== */}
        <div className="neo-raised" style={styles.chartCard}>
          <h4 style={styles.chartTitle}>
            <Target size={14} style={{ marginRight: '6px', verticalAlign: 'middle', color: 'var(--accent-color)' }} />
            {t('analytics.budgetVsActual', lang)}
          </h4>
          <span style={{ fontSize: '8px', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
            {rangeLabel}
          </span>
          {budgetVsActual.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={{ fontSize: '12px', fontWeight: '600' }}>{t('analytics.budgetNoBudgets', lang)}</p>
              <p style={{ fontSize: '10px', marginTop: '4px', opacity: 0.7 }}>{t('analytics.budgetCreatePrompt', lang)}</p>
            </div>
          ) : (
            <>
              {/* Total bar */}
              <div className="neo-pressed-sm" style={styles.bvaTotalRow}>
                <div style={styles.bvaTotalInfo}>
                  <span style={styles.bvaTotalLabel}>{t('budget.totalBudget', lang)}</span>
                  <span style={styles.bvaTotalVal}>৳{formatNumber(budgetVsActualTotal.totalLimit, lang)}</span>
                </div>
                <div style={styles.bvaTotalInfo}>
                  <span style={styles.bvaTotalLabel}>{t('budget.spent', lang)}</span>
                  <span style={{ ...styles.bvaTotalVal, color: 'var(--color-expense)' }}>৳{formatNumber(budgetVsActualTotal.totalSpent, lang)}</span>
                </div>
                <div style={styles.bvaTotalInfo}>
                  <span style={styles.bvaTotalLabel}>{t('budget.remaining', lang)}</span>
                  <span style={{
                    ...styles.bvaTotalVal,
                    color: budgetVsActualTotal.totalLimit - budgetVsActualTotal.totalSpent >= 0 ? 'var(--color-income)' : 'var(--color-expense)'
                  }}>
                    ৳{formatNumber(Math.abs(budgetVsActualTotal.totalLimit - budgetVsActualTotal.totalSpent), lang)}
                  </span>
                </div>
              </div>
              <div style={styles.progressTrack}>
                <div style={{
                  ...styles.progressFill,
                  width: `${budgetVsActualTotal.totalPct}%`,
                  backgroundColor: budgetVsActualTotal.totalPct >= 100 ? 'var(--color-expense)' : 'var(--accent-color)',
                }} />
              </div>
              <span style={styles.bvaTotalPct}>{formatPercent(budgetVsActualTotal.totalPct, lang)} {t('budget.ofBudgetUsed', lang)}</span>

              {/* Per-budget items */}
              <div style={styles.bvaList}>
                {budgetVsActual.map(b => {
                const truePct = b.limit > 0 ? Math.round((b.spent / b.limit) * 100) : (b.spent > 0 ? 100 : 0);
                return (
                  <div key={b.id} style={{
                    ...styles.bvaItem,
                    borderLeft: `3px solid ${b.isOverBudget ? 'var(--color-expense)' : 'var(--color-income)'}`,
                    paddingLeft: '10px',
                    backgroundColor: b.isOverBudget ? 'rgba(255,94,87,0.06)' : 'rgba(34,197,94,0.04)',
                    borderRadius: '0 8px 8px 0',
                  }}>
                    <div style={styles.bvaItemHeader}>
                      <div style={styles.bvaItemLeft}>
                        <span style={{ ...styles.bvaDot, backgroundColor: b.categoryColor }} />
                        <span style={styles.bvaCatName}>{b.categoryName}</span>
                      </div>
                      <span style={{
                        ...styles.bvaPct,
                        color: b.isOverBudget ? 'var(--color-expense)' : 'var(--text-secondary)',
                        fontWeight: b.isOverBudget ? '800' : '700',
                      }}>                          {b.isOverBudget ? b.displayPct : formatPercent(b.percentage, lang)}
                          {b.isOverBudget && (
                          <span style={{ fontSize: '7px', marginLeft: '2px', opacity: 0.7 }}>↑</span>
                        )}
                      </span>
                    </div>
                    <div style={styles.progressTrack}>
                      <div style={{
                        ...styles.progressFill,
                        width: `${Math.min(b.percentage, 100)}%`,
                        backgroundColor: b.isOverBudget ? 'var(--color-expense)' : b.percentage >= 80 ? 'var(--color-warning)' : 'var(--color-income)',
                        boxShadow: b.isOverBudget ? '0 0 6px rgba(255,94,87,0.4)' : 'none',
                      }} />
                    </div>
                    <div style={styles.bvaItemBottom}>
                      <span style={styles.bvaSpent}>
                        ৳{formatNumber(b.spent, lang)} / ৳{formatNumber(b.limit, lang)}
                      </span>
                      {b.isOverBudget ? (
                        <span style={styles.bvaOver}>
                          <AlertTriangle size={10} /> +৳{formatNumber(Math.abs(b.remaining), lang)}
                        </span>
                      ) : (
                        <span style={styles.bvaLeft}> ৳{formatNumber(b.remaining, lang)} {t('analytics.budgetRemaining', lang)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
              </div>
            </>
          )}
        </div>

        {/* ==================== FEATURE B: Smart Insights ==================== */}
        <div className="neo-raised" style={styles.chartCard}>
          <h4 style={styles.chartTitle}>
            <Lightbulb size={14} style={{ marginRight: '6px', verticalAlign: 'middle', color: '#f7b731' }} />
            {t('analytics.insights', lang)}
          </h4>
          {!insights.hasData ? (
            <div style={styles.emptyState}>
              <p style={{ fontSize: '12px', fontWeight: '600' }}>{t('analytics.insightsNoData', lang)}</p>
            </div>
          ) : (
            <div style={styles.insightsGrid}>
              {/* Top spending category */}
              {insights.topCategory && (
                <div className="neo-pressed-sm" style={styles.insightCard}>
                  <span style={styles.insightIcon}>
                    <TrendingUp size={14} style={{ color: 'var(--color-expense)' }} />
                  </span>
                  <div style={styles.insightBody}>
                    <span style={styles.insightLabel}>{t('analytics.insightsTopCategory', lang)}</span>
                    <span style={styles.insightValue}>
                      <span style={{ color: insights.topCategory.categoryColor, fontWeight: 700 }}>
                        {insights.topCategory.categoryName}
                      </span>
                      <span style={{ color: 'var(--color-expense)', fontWeight: 700, marginLeft: '4px' }}>
                        ৳{formatNumber(insights.topCategory.current, lang)}
                      </span>
                    </span>
                  </div>
                </div>
              )}

              {/* Biggest increase */}
              {insights.biggestIncrease && hasComparison && (
                <div className="neo-pressed-sm" style={styles.insightCard}>
                  <span style={styles.insightIcon}>
                    <TrendingUp size={14} style={{ color: 'var(--color-expense)' }} />
                  </span>
                  <div style={styles.insightBody}>
                    <span style={styles.insightLabel}>{t('analytics.insightsBiggestIncrease', lang)}</span>
                    <span style={styles.insightValue}>
                      <span style={{ color: insights.biggestIncrease.categoryColor, fontWeight: 700 }}>
                        {insights.biggestIncrease.categoryName}
                      </span>
                      <span style={{ color: 'var(--color-expense)', fontWeight: 700, marginLeft: '4px' }}>
                        +৳{formatNumber(insights.biggestIncrease.diff, lang)} ({insights.biggestIncrease.pctChange > 0 ? '+' : ''}{formatPercent(insights.biggestIncrease.pctChange, lang)})
                      </span>
                    </span>
                  </div>
                </div>
              )}

              {/* Biggest decrease */}
              {insights.biggestDecrease && hasComparison && (
                <div className="neo-pressed-sm" style={styles.insightCard}>
                  <span style={styles.insightIcon}>
                    <TrendingDown size={14} style={{ color: 'var(--color-income)' }} />
                  </span>
                  <div style={styles.insightBody}>
                    <span style={styles.insightLabel}>{t('analytics.insightsBiggestDecrease', lang)}</span>
                    <span style={styles.insightValue}>
                      <span style={{ color: insights.biggestDecrease.categoryColor, fontWeight: 700 }}>
                        {insights.biggestDecrease.categoryName}
                      </span>
                      <span style={{ color: 'var(--color-income)', fontWeight: 700, marginLeft: '4px' }}>
                        -৳{formatNumber(Math.abs(insights.biggestDecrease.diff), lang)} ({formatPercent(insights.biggestDecrease.pctChange, lang)})
                      </span>
                    </span>
                  </div>
                </div>
              )}

              {/* Summary stats row */}
              <div style={styles.insightSummaryRow}>
                <div className="neo-raised-sm" style={styles.insightStat}>
                  <span style={styles.insightStatLabel}>{t('analytics.insightsTotalIncome', lang)}</span>
                  <span style={{ ...styles.insightStatVal, color: 'var(--color-income)' }}>৳{formatNumber(insights.currentIncome, lang)}</span>
                </div>
                <div className="neo-raised-sm" style={styles.insightStat}>
                  <span style={styles.insightStatLabel}>{t('analytics.insightsTotalExpense', lang)}</span>
                  <span style={{ ...styles.insightStatVal, color: 'var(--color-expense)' }}>৳{formatNumber(insights.currentExpense, lang)}</span>
                </div>
                <div className="neo-raised-sm" style={styles.insightStat}>
                  <span style={styles.insightStatLabel}>{t('analytics.insightsSavingsRate', lang)}</span>
                  <span style={{
                    ...styles.insightStatVal,
                    color: insights.savingsRate >= 0 ? 'var(--color-income)' : 'var(--color-expense)',
                  }}>
                    {insights.savingsRate >= 0 ? '+' : ''}{formatPercent(insights.savingsRate, lang)}
                  </span>
                </div>
              </div>

              {/* Tx count vs previous period */}
              <div style={styles.insightTxRow}>
                <span style={styles.insightTxLabel}>
                  {t('analytics.insightsTxCount', lang)} <strong>{formatNumber(insights.currentTxCount, lang)}</strong>
                </span>
                {hasComparison && (
                  <span style={{
                    ...styles.insightTxChange,
                    color: insights.txCountDiff >= 0 ? 'var(--color-income)' : 'var(--color-expense)',
                  }}>
                    {insights.txCountDiff >= 0 ? t('analytics.insightsUp', lang) : t('analytics.insightsDown', lang)}
                    {' '}{t('analytics.insightsVsPrevPeriod', lang)} {insights.txCountDiff > 0 ? '+' : ''}{formatNumber(insights.txCountDiff, lang)}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ==================== FEATURE C: Anomaly Detection ==================== */}
        <div className="neo-raised" style={{ ...styles.chartCard, border: '1px solid rgba(255,94,87,0.15)' }}>
          <h4 style={styles.chartTitle}>
            <AlertTriangle size={14} style={{ marginRight: '6px', verticalAlign: 'middle', color: 'var(--color-expense)' }} />
            {t('analytics.anomalies', lang)}
          </h4>
          {!anomalies.hasEnoughData ? (
            <div style={styles.emptyState}>
              <p style={{ fontSize: '12px', fontWeight: '600' }}>{t('analytics.anomaliesNoTx', lang)}</p>
            </div>
          ) : anomalies.flagged.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-income)' }}>
                ✅ {t('analytics.anomaliesNoData', lang)}
              </p>
            </div>
          ) : (
            <div style={styles.anomalyList}>
              {anomalies.flagged.map((tx, idx) => (
                  <div key={tx.id || idx} className="neo-pressed-sm" style={styles.anomalyItem}>
                    <div style={styles.anomalyTop}>
                      <div style={styles.anomalyLeft}>
                        <span style={{ ...styles.anomalyDot, backgroundColor: tx.categoryColor }} />
                        <div>
                          <span style={styles.anomalyCat}>{tx.categoryName}</span>
                          <span style={styles.anomalyNote}>{tx.notes || tx.date}</span>
                        </div>
                      </div>
                      <span style={styles.anomalyAmount}>৳{formatNumber(tx.amount, lang)}</span>
                    </div>
                    <div style={styles.anomalyBadgeRow}>
                      <span style={styles.anomalyBadge}>
                        <AlertTriangle size={9} /> {tx.multiplier}x {t('analytics.anomaliesThreshold', lang)}
                      </span>
                      <span style={styles.anomalyAvg}>
                        {t('analytics.anomaliesAvg', lang)} ৳{formatNumber(tx.average, lang)}
                      </span>
                    </div>
                  </div>
                ))}
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
  budgets: PropTypes.array,
  onNavigate: PropTypes.func,
  lang: PropTypes.string,
};

AnalyticsView.defaultProps = {
  transactions: [],
  categories: [],
  budgets: [],
  onNavigate: () => {},
  lang: 'en',
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

  // ===== Budget vs Actual Styles =====
  bvaTotalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px',
    borderRadius: '12px',
    marginBottom: '8px',
    gap: '8px',
  },
  bvaTotalInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
  },
  bvaTotalLabel: {
    fontSize: '8px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  bvaTotalVal: {
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginTop: '2px',
  },
  bvaTotalPct: {
    fontSize: '10px',
    color: 'var(--text-secondary)',
    textAlign: 'center',
    marginTop: '6px',
    fontWeight: '600',
  },
  progressTrack: {
    height: '8px',
    borderRadius: '4px',
    backgroundColor: 'var(--bg-color)',
    boxShadow: 'var(--neomorphic-pressed-sm)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 1s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
  bvaList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '14px',
  },
  bvaItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  bvaItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bvaItemLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  bvaDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  bvaCatName: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  bvaPct: {
    fontSize: '10px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
  },
  bvaItemBottom: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bvaSpent: {
    fontSize: '10px',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  bvaOver: {
    fontSize: '9px',
    fontWeight: '700',
    color: 'var(--color-expense)',
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
  },
  bvaLeft: {
    fontSize: '9px',
    fontWeight: '600',
    color: 'var(--color-income)',
  },

  // ===== Smart Insights Styles =====
  insightsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  insightCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: '12px',
  },
  insightIcon: {
    width: '30px',
    height: '30px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--bg-color)',
    boxShadow: 'var(--neomorphic-pressed-sm)',
    flexShrink: 0,
  },
  insightBody: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
  },
  insightLabel: {
    fontSize: '9px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
  },
  insightValue: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  insightSummaryRow: {
    display: 'flex',
    gap: '8px',
    marginTop: '4px',
  },
  insightStat: {
    flex: 1,
    padding: '8px 6px',
    borderRadius: '10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    textAlign: 'center',
  },
  insightStatLabel: {
    fontSize: '7px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.2px',
  },
  insightStatVal: {
    fontSize: '12px',
    fontWeight: '800',
  },
  insightTxRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    borderRadius: '10px',
    backgroundColor: 'var(--bg-color)',
    boxShadow: 'var(--neomorphic-pressed-sm)',
    marginTop: '4px',
  },
  insightTxLabel: {
    fontSize: '10px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
  },
  insightTxChange: {
    fontSize: '10px',
    fontWeight: '700',
  },

  // ===== Anomaly Detection Styles =====
  anomalyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  anomalyItem: {
    padding: '10px 12px',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  anomalyTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  anomalyLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    minWidth: 0,
  },
  anomalyDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  anomalyCat: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    display: 'block',
  },
  anomalyNote: {
    fontSize: '9px',
    color: 'var(--text-secondary)',
    fontWeight: '500',
    display: 'block',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '140px',
  },
  anomalyAmount: {
    fontSize: '13px',
    fontWeight: '800',
    color: 'var(--color-expense)',
    flexShrink: 0,
    marginLeft: '8px',
  },
  anomalyBadgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    paddingLeft: '16px',
  },
  anomalyBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '8px',
    fontWeight: '700',
    color: 'var(--color-expense)',
    backgroundColor: 'rgba(255,94,87,0.12)',
    padding: '2px 5px',
    borderRadius: '4px',
  },
  anomalyAvg: {
    fontSize: '8px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
  },
};
