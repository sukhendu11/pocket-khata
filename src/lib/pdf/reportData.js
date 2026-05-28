// src/lib/pdf/reportData.js — Data Computation Layer
// Transforms raw app data (transactions, accounts, categories, budgets)
// into the metrics needed for the PDF report.

/**
 * @typedef {Object} ReportPeriod
 * @property {string} startDate - YYYY-MM-DD
 * @property {string} endDate - YYYY-MM-DD
 * @property {string} label - Human-readable period label
 */

/**
 * Compute a date range for a given period key.
 * @param {'thisMonth'|'lastMonth'|'last3Months'|'last6Months'|'thisYear'} periodKey
 * @returns {ReportPeriod}
 */
export function getPeriodRange(periodKey) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  switch (periodKey) {
    case 'thisMonth': {
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0);
      return { startDate: toDateStr(start), endDate: toDateStr(end), label: periodKey };
    }
    case 'lastMonth': {
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0);
      return { startDate: toDateStr(start), endDate: toDateStr(end), label: periodKey };
    }
    case 'last3Months': {
      const start = new Date(y, m - 3, 1);
      const end = new Date(y, m + 1, 0);
      return { startDate: toDateStr(start), endDate: toDateStr(end), label: periodKey };
    }
    case 'last6Months': {
      const start = new Date(y, m - 6, 1);
      const end = new Date(y, m + 1, 0);
      return { startDate: toDateStr(start), endDate: toDateStr(end), label: periodKey };
    }
    case 'thisYear': {
      const start = new Date(y, 0, 1);
      const end = new Date(y, 11, 31);
      return { startDate: toDateStr(start), endDate: toDateStr(end), label: periodKey };
    }
    default: {
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0);
      return { startDate: toDateStr(start), endDate: toDateStr(end), label: 'thisMonth' };
    }
  }
}

function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Filter transactions within a date range (inclusive).
 */
export function filterTransactionsByPeriod(transactions, startDate, endDate) {
  return transactions.filter(tx => {
    const d = tx.date;
    return d >= startDate && d <= endDate;
  });
}

/**
 * Compute report summary metrics from transactions.
 */
export function computeSummary(transactions) {
  let totalIncome = 0;
  let totalExpense = 0;

  transactions.forEach(tx => {
    if (tx.type === 'income') totalIncome += tx.amount;
    else if (tx.type === 'expense') totalExpense += tx.amount;
  });

  return {
    totalIncome,
    totalExpense,
    netSavings: totalIncome - totalExpense,
  };
}

/**
 * Build account details with balances within period.
 * Returns accounts with their net change during the period.
 */
export function computeAccountDetails(accounts, periodTransactions) {
  return accounts.map(acc => {
    let netChange = 0;
    periodTransactions.forEach(tx => {
      if (tx.type === 'income' && tx.accountId === acc.id) netChange += tx.amount;
      else if (tx.type === 'expense' && tx.accountId === acc.id) netChange -= tx.amount;
      else if (tx.type === 'transfer') {
        if (tx.accountId === acc.id) netChange -= tx.amount;
        if (tx.transferToId === acc.id) netChange += tx.amount;
      }
    });
    return {
      id: acc.id,
      name: acc.name,
      type: acc.type,
      color: acc.color || '#4a90e2',
      balance: acc.balance,
      periodNetChange: netChange,
    };
  });
}

/**
 * Compute category breakdown from transactions.
 * Returns sorted array of { categoryId, categoryName, amount, percentage, color }.
 */
export function computeCategoryBreakdown(transactions, categories, type) {
  const filtered = transactions.filter(tx => tx.type === type);
  const total = filtered.reduce((s, tx) => s + tx.amount, 0);

  const catMap = {};
  categories.forEach(c => { catMap[c.id] = c; });

  const breakdown = {};
  filtered.forEach(tx => {
    const cat = catMap[tx.categoryId] || { name: 'Unknown', color: '#636e72' };
    if (!breakdown[tx.categoryId]) {
      breakdown[tx.categoryId] = { categoryId: tx.categoryId, name: cat.name, amount: 0, color: cat.color };
    }
    breakdown[tx.categoryId].amount += tx.amount;
  });

  return Object.values(breakdown)
    .map(item => ({
      ...item,
      percentage: total > 0 ? (item.amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Compute monthly income/expense trend data for charting.
 * Returns array of { month, income, expense } for the last N months.
 */
export function computeMonthlyTrend(startDate, endDate, transactions) {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');

  // Build month buckets
  const months = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end) {
    months.push({
      year: cursor.getFullYear(),
      month: cursor.getMonth(),
      label: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months.map(m => {
    let income = 0;
    let expense = 0;
    transactions.forEach(tx => {
      const d = new Date(tx.date + 'T00:00:00');
      if (d.getMonth() === m.month && d.getFullYear() === m.year) {
        if (tx.type === 'income') income += tx.amount;
        else if (tx.type === 'expense') expense += tx.amount;
      }
    });
    return { ...m, income, expense };
  });
}

/**
 * Compute Budget vs Actual comparisons for the last full month.
 */
export function computeBudgetVsActual(transactions, budgets, categories) {
  const catMap = {};
  categories.forEach(c => { catMap[c.id] = c; });

  return budgets.map(b => {
    const spent = transactions
      .filter(tx => tx.type === 'expense' && tx.categoryId === b.categoryId)
      .reduce((s, tx) => s + tx.amount, 0);
    const cat = catMap[b.categoryId] || { name: 'Unknown', color: '#636e72' };
    return {
      categoryId: b.categoryId,
      categoryName: cat.name,
      color: cat.color,
      budget: b.limit,
      spent,
      remaining: b.limit - spent,
      percentage: b.limit > 0 ? (spent / b.limit) * 100 : 0,
    };
  });
}

/**
 * Compute smart insights from transactions.
 * Uses startDate/endDate to scope the current period,
 * and computes a same-length previous period automatically.
 */
export function computeInsights(transactions, categories, startDate, endDate) {
  const catMap = {};
  categories.forEach(c => { catMap[c.id] = c; });

  // Scope current period transactions
  const currentTransactions = filterTransactionsByPeriod(transactions, startDate, endDate);

  // Category breakdown (current period only)
  const expenseBreakdown = {};
  currentTransactions
    .filter(tx => tx.type === 'expense')
    .forEach(tx => {
      if (!expenseBreakdown[tx.categoryId]) expenseBreakdown[tx.categoryId] = 0;
      expenseBreakdown[tx.categoryId] += tx.amount;
    });

  // Top spending category
  let topCategory = null;
  let topAmount = 0;
  Object.entries(expenseBreakdown).forEach(([catId, amount]) => {
    if (amount > topAmount) {
      topAmount = amount;
      topCategory = catMap[catId] || { name: 'Unknown' };
    }
  });

  // Previous period for comparison (same length before startDate)
  const periodLen = new Date(endDate + 'T00:00:00').getTime() - new Date(startDate + 'T00:00:00').getTime();
  const prevEnd = new Date(startDate + 'T00:00:00').getTime() - 86400000; // day before start
  const prevStart = new Date(prevEnd - periodLen);
  const prevStartStr = toDateStr(new Date(prevStart));
  const prevEndStr = toDateStr(new Date(prevEnd));

  const prevTransactions = transactions.filter(tx => {
    const d = tx.date;
    return d >= prevStartStr && d <= prevEndStr;
  });

  // Compare expense by category (current vs previous)
  const catChanges = {};
  currentTransactions.filter(tx => tx.type === 'expense').forEach(tx => {
    if (!catChanges[tx.categoryId]) catChanges[tx.categoryId] = { current: 0, previous: 0 };
    catChanges[tx.categoryId].current += tx.amount;
  });
  prevTransactions.filter(tx => tx.type === 'expense').forEach(tx => {
    if (!catChanges[tx.categoryId]) catChanges[tx.categoryId] = { current: 0, previous: 0 };
    catChanges[tx.categoryId].previous += tx.amount;
  });

  let biggestIncrease = null;
  let biggestDecrease = null;
  let maxIncrease = 0;
  let maxDecrease = 0;

  Object.entries(catChanges).forEach(([catId, { current, previous }]) => {
    const cat = catMap[catId] || { name: 'Unknown' };
    const diff = current - previous;
    if (diff > maxIncrease) {
      maxIncrease = diff;
      biggestIncrease = { name: cat.name, diff };
    }
    if (diff < maxDecrease) {
      maxDecrease = diff;
      biggestDecrease = { name: cat.name, diff };
    }
  });

  // Total income/expense (current period only)
  const summary = computeSummary(currentTransactions);
  const prevSummary = computeSummary(prevTransactions);
  const savingsRate = summary.totalIncome > 0
    ? (summary.netSavings / summary.totalIncome) * 100
    : 0;

  // Anomalies: transactions > 2x category average (scoped to current period)
  const anomalies = detectAnomalies(currentTransactions, categories);

  return {
    topCategory: topCategory ? { name: topCategory.name, amount: topAmount } : null,
    biggestIncrease,
    biggestDecrease,
    totalIncome: summary.totalIncome,
    totalExpense: summary.totalExpense,
    netSavings: summary.netSavings,
    savingsRate,
    prevTotalIncome: prevSummary.totalIncome,
    prevTotalExpense: prevSummary.totalExpense,
    prevNetSavings: prevSummary.netSavings,
    transactionCount: currentTransactions.length,
    anomalies,
  };
}

/**
 * Detect anomalous transactions (> 2x category average).
 */
function detectAnomalies(transactions, categories) {
  const catMap = {};
  categories.forEach(c => { catMap[c.id] = c; });

  // Compute average per category
  const catTotals = {};
  const catCounts = {};
  transactions.filter(tx => tx.type === 'expense').forEach(tx => {
    if (!catTotals[tx.categoryId]) { catTotals[tx.categoryId] = 0; catCounts[tx.categoryId] = 0; }
    catTotals[tx.categoryId] += tx.amount;
    catCounts[tx.categoryId]++;
  });

  const catAvgs = {};
  Object.keys(catTotals).forEach(catId => {
    catAvgs[catId] = catCounts[catId] > 0 ? catTotals[catId] / catCounts[catId] : 0;
  });

  // Find anomalies
  const anomalies = [];
  transactions.filter(tx => tx.type === 'expense').forEach(tx => {
    const avg = catAvgs[tx.categoryId] || 0;
    if (avg > 0 && tx.amount > avg * 2) {
      anomalies.push({
        ...tx,
        categoryName: (catMap[tx.categoryId] || { name: 'Unknown' }).name,
        avg,
        ratio: tx.amount / avg,
      });
    }
  });

  return anomalies.sort((a, b) => b.ratio - a.ratio);
}
