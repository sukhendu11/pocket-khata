// src/lib/pdf/reportTemplates.js — Template Layer
// Builds the styled HTML string that will be rendered to canvas via html2canvas
// and then embedded into the PDF.

import { formatNumber } from '../../utils';
import { generateTrendChartSVG, generateCategoryChartSVG } from './chartEngine';

/**
 * Build the complete HTML document for the PDF report.
 * The HTML includes inline CSS that html2canvas will render.
 *
 * @param {object} data - All computed report data
 * @param {object} data.summary - { totalIncome, totalExpense, netSavings }
 * @param {Array} data.accounts - Account details with balances
 * @param {Array} data.transactions - Period transactions
 * @param {Array} data.incomeBreakdown - Category breakdown for income
 * @param {Array} data.expenseBreakdown - Category breakdown for expense
 * @param {Array} data.monthlyTrend - Monthly income/expense data
 * @param {Array} data.budgetVsActual - Budget comparisons
 * @param {object} data.insights - Smart insights
 * @param {string} data.periodLabel - Human-readable period label
 * @param {string} data.generatedDate - Date the report was generated
 * @param {string} lang - 'en' or 'bn'
 * @param {function} t - i18n translate function
 * @param {object} sections - { summary, accounts, transactions, analytics }
 * @returns {string} Complete HTML string
 */
export function buildReportHTML(data, lang, t, sections) {
  const s = data.summary;
  const isLoss = s.netSavings < 0;

  // Generate monthly trend chart (SVG via chart engine)
  const trendChartSVG = generateTrendChartSVG(data.monthlyTrend, 700, 200);

  // Budget vs Actual bars
  const budgetBarsHTML = (data.budgetVsActual || []).map(b => {
    const pct = Math.min(b.percentage, 100);
    return `
      <div class="budget-row">
        <div class="budget-cat">
          <span class="budget-dot" style="background:${b.color}"></span>
          <span>${b.categoryName}</span>
        </div>
        <div class="budget-bar-track">
          <div class="budget-bar-fill ${b.percentage > 100 ? 'over' : b.percentage > 80 ? 'warn' : ''}" style="width:${pct}%"></div>
        </div>
        <div class="budget-numbers">
          <span>${formatNumber(b.spent, lang)}</span>
          <span class="budget-sep">/</span>
          <span>${formatNumber(b.budget, lang)}</span>
        </div>
      </div>
    `;
  }).join('');

  // Income/Expense breakdown donut charts (SVG via chart engine)
  const incomeChartSVG = generateCategoryChartSVG(data.incomeBreakdown, 250);
  const expenseChartSVG = generateCategoryChartSVG(data.expenseBreakdown, 250);

  // Account type → i18n key mapping for Bengali support
  const typeI18nMap = {
    'Cash': 'accounts.cashLedger',
    'Bank': 'accounts.bankAccount',
    'Bkash': 'accounts.bkashWallet',
    'Nagad': 'accounts.nagadWallet',
  };

  // Account details rows
  const accountRowsHTML = data.accounts.map(acc => {
    const sign = acc.periodNetChange >= 0 ? '+' : '';
    const typeLabel = t(typeI18nMap[acc.type] || '', lang) || acc.type;
    return `
      <div class="account-row">
        <div class="account-dot" style="background:${acc.color}"></div>
        <div class="account-name">${escHtml(acc.name)}</div>
        <div class="account-type">${escHtml(typeLabel)}</div>
        <div class="account-balance">${formatNumber(acc.balance, lang)}</div>
        <div class="account-net ${acc.periodNetChange >= 0 ? 'green' : 'red'}">${sign}${formatNumber(acc.periodNetChange, lang)}</div>
      </div>
    `;
  }).join('');

  // Transaction table rows
  const txRowsHTML = data.transactions.slice(0, 50).map(tx => {
    const cat = data.incomeBreakdown.concat(data.expenseBreakdown).find(c => c.categoryId === tx.categoryId);
    const catName = cat ? cat.name : '—';
    const acc = data.accounts.find(a => a.id === tx.accountId);
    const accName = acc ? acc.name : '—';
    const typeClass = tx.type === 'income' ? 'tx-income' : tx.type === 'expense' ? 'tx-expense' : 'tx-transfer';
    const sign = tx.type === 'income' ? '+' : tx.type === 'expense' ? '−' : '→';
    return `
      <tr>
        <td class="tx-date">${tx.date}</td>
        <td class="${typeClass}">${tx.type}</td>
        <td>${escHtml(catName)}</td>
        <td>${escHtml(accName)}</td>
        <td class="tx-amount ${typeClass}">${sign}${formatNumber(tx.amount, lang)}</td>
      </tr>
    `;
  }).join('');

  // Insights
  const ins = data.insights;
  const anomaliesHTML = ins.anomalies.length > 0
    ? ins.anomalies.slice(0, 10).map(a => `
      <div class="anomaly-row">
        <span class="anomaly-cat">${escHtml(a.categoryName)}</span>
        <span class="anomaly-amount">${formatNumber(a.amount, lang)}</span>
        <span class="anomaly-ratio">${a.ratio.toFixed(1)}× ${t('pdf.avg', lang)} ${formatNumber(a.avg, lang)}</span>
      </div>
    `).join('')
    : `<div class="empty-state">${t('pdf.noAnomalies', lang)}</div>`;

  const insHTML = `
    <div class="insight-row">
      <span class="insight-label">${t('pdf.totalIncomeLabel', lang)}</span>
      <span class="insight-value green">${formatNumber(ins.totalIncome, lang)}</span>
      <span class="insight-delta">${t('pdf.vsPrevPeriod', lang)}: ${formatNumber(ins.prevTotalIncome, lang)}</span>
    </div>
    <div class="insight-row">
      <span class="insight-label">${t('pdf.totalExpenseLabel', lang)}</span>
      <span class="insight-value red">${formatNumber(ins.totalExpense, lang)}</span>
      <span class="insight-delta">${t('pdf.vsPrevPeriod', lang)}: ${formatNumber(ins.prevTotalExpense, lang)}</span>
    </div>
    <div class="insight-row">
      <span class="insight-label">${t('pdf.savingsRate', lang)}</span>
      <span class="insight-value ${ins.savingsRate >= 0 ? 'green' : 'red'}">${Math.round(ins.savingsRate)}%</span>
      <span class="insight-delta">${t('pdf.transactions', lang)} ${ins.transactionCount}</span>
    </div>
    ${ins.topCategory ? `
    <div class="insight-row">
      <span class="insight-label">${t('pdf.topCategory', lang)}</span>
      <span class="insight-value">${escHtml(ins.topCategory.name)}</span>
      <span class="insight-delta">${formatNumber(ins.topCategory.amount, lang)}</span>
    </div>` : ''}
    ${ins.biggestIncrease ? `
    <div class="insight-row">
      <span class="insight-label">${t('pdf.biggestIncrease', lang)}</span>
      <span class="insight-value red">${escHtml(ins.biggestIncrease.name)}</span>
      <span class="insight-delta">+${formatNumber(ins.biggestIncrease.diff, lang)}</span>
    </div>` : ''}
    ${ins.biggestDecrease ? `
    <div class="insight-row">
      <span class="insight-label">${t('pdf.biggestDecrease', lang)}</span>
      <span class="insight-value green">${escHtml(ins.biggestDecrease.name)}</span>
      <span class="insight-delta">${formatNumber(ins.biggestDecrease.diff, lang)}</span>
    </div>` : ''}
  `;

  // Section visibility
  const showSummary = sections.summary !== false;
  const showAccounts = sections.accounts !== false && data.accounts.length > 0;
  const showTransactions = sections.transactions !== false && data.transactions.length > 0;
  const showAnalytics = sections.analytics !== false;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Noto Sans Bengali', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Siyam Rupali', sans-serif;
    background: #ffffff;
    color: #1a1a2e;
    padding: 30px 24px;
    line-height: 1.5;
  }
  .page { max-width: 750px; margin: 0 auto; }

  /* Header */
  .header { text-align: center; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 2px solid #e8e8f0; }
  .header h1 { font-size: 22px; font-weight: 800; color: #1a1a2e; letter-spacing: -0.5px; }
  .header .subtitle { font-size: 13px; color: #7f8c8d; font-weight: 600; margin-top: 2px; }
  .header .meta { font-size: 11px; color: #95a5a6; margin-top: 6px; font-weight: 500; }
  .header .meta span { margin: 0 8px; }

  /* Section headers */
  .section-title {
    font-size: 15px; font-weight: 700; color: #1a1a2e;
    margin-top: 24px; margin-bottom: 12px;
    padding-bottom: 6px; border-bottom: 1px solid #eee;
  }

  /* Summary Cards */
  .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 8px; }
  .summary-card {
    padding: 16px 12px; border-radius: 12px; text-align: center;
    background: #f8f9fa; border: 1px solid #eee;
  }
  .summary-card .label { font-size: 9px; font-weight: 700; color: #7f8c8d; letter-spacing: 0.5px; margin-bottom: 4px; }
  .summary-card .value { font-size: 18px; font-weight: 800; letter-spacing: -0.5px; }
  .summary-card.income .value { color: #2ecc71; }
  .summary-card.expense .value { color: #e74c3c; }
  .summary-card.net .value { color: #4a90e2; }



  /* Budget */
  .budget-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .budget-cat { display: flex; align-items: center; gap: 4px; min-width: 100px; font-size: 11px; font-weight: 600; color: #1a1a2e; }
  .budget-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .budget-bar-track { flex: 1; height: 14px; background: #f0f0f5; border-radius: 7px; overflow: hidden; }
  .budget-bar-fill { height: 100%; border-radius: 7px; background: #4a90e2; }
  .budget-bar-fill.warn { background: #f39c12; }
  .budget-bar-fill.over { background: #e74c3c; }
  .budget-numbers { font-size: 11px; font-weight: 600; color: #1a1a2e; min-width: 80px; text-align: right; }
  .budget-sep { color: #95a5a6; margin: 0 2px; }
  .empty-state { font-size: 11px; color: #95a5a6; font-style: italic; padding: 8px 0; }

  /* Category Breakdown — removed, using SVG donut charts */

  /* Accounts */
  .account-row { display: flex; align-items: center; gap: 6px; padding: 6px 0; border-bottom: 1px solid #f5f5f5; font-size: 11px; }
  .account-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .account-name { flex: 1; font-weight: 600; color: #1a1a2e; }
  .account-type { width: 60px; color: #7f8c8d; font-weight: 500; }
  .account-balance { width: 70px; text-align: right; font-weight: 700; color: #1a1a2e; }
  .account-net { width: 70px; text-align: right; font-weight: 700; }
  .account-net.green { color: #2ecc71; }
  .account-net.red { color: #e74c3c; }

  /* Transaction Table */
  .tx-table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 4px; }
  .tx-table th { padding: 6px 4px; text-align: left; font-weight: 700; color: #7f8c8d; font-size: 9px; letter-spacing: 0.5px; border-bottom: 2px solid #eee; }
  .tx-table td { padding: 5px 4px; border-bottom: 1px solid #f5f5f5; color: #1a1a2e; }
  .tx-date { font-weight: 500; color: #7f8c8d; white-space: nowrap; }
  .tx-income { color: #2ecc71; font-weight: 600; }
  .tx-expense { color: #e74c3c; font-weight: 600; }
  .tx-transfer { color: #4a90e2; font-weight: 600; }
  .tx-amount { text-align: right; font-weight: 700; }

  /* Insights */
  .insight-row { display: flex; align-items: center; gap: 8px; padding: 5px 0; border-bottom: 1px solid #f5f5f5; font-size: 11px; }
  .insight-label { min-width: 130px; font-weight: 600; color: #7f8c8d; }
  .insight-value { font-weight: 700; color: #1a1a2e; min-width: 80px; }
  .insight-value.green { color: #2ecc71; }
  .insight-value.red { color: #e74c3c; }
  .insight-delta { color: #95a5a6; font-weight: 500; }

  /* Anomalies */
  .anomaly-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 11px; border-bottom: 1px solid #f5f5f5; }
  .anomaly-cat { min-width: 100px; font-weight: 600; color: #1a1a2e; }
  .anomaly-amount { font-weight: 700; color: #e74c3c; min-width: 60px; text-align: right; }
  .anomaly-ratio { font-weight: 500; color: #7f8c8d; }

  .green { color: #2ecc71; }
  .red { color: #e74c3c; }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <h1>${t('pdf.title', lang)}</h1>
    <div class="subtitle">${t('pdf.subtitle', lang)}</div>
    <div class="meta">
      <span>${t('pdf.period', lang)} ${escHtml(data.periodLabel)}</span>
      <span>${t('pdf.generated', lang)} ${data.generatedDate}</span>
    </div>
  </div>

  ${showSummary ? `
  <!-- Summary Cards -->
  <div class="section-title">${t('reports.sectionSummary', lang)}</div>
  <div class="summary-grid">
    <div class="summary-card income">
      <div class="label">${t('pdf.totalIncome', lang)}</div>
      <div class="value">${formatNumber(s.totalIncome, lang)}</div>
    </div>
    <div class="summary-card expense">
      <div class="label">${t('pdf.totalExpense', lang)}</div>
      <div class="value">${formatNumber(s.totalExpense, lang)}</div>
    </div>
    <div class="summary-card net">
      <div class="label">${isLoss ? t('pdf.netLoss', lang) : t('pdf.netSavings', lang)}</div>
      <div class="value" style="color:${isLoss ? '#e74c3c' : '#2ecc71'}">${isLoss ? '−' : '+'}${formatNumber(Math.abs(s.netSavings), lang)}</div>
    </div>
  </div>
  ` : ''}

  ${showAccounts ? `
  <!-- Account Details -->
  <div class="section-title">${t('reports.sectionAccounts', lang)}</div>
  ${accountRowsHTML}
  ` : ''}

  ${showTransactions && data.transactions.length > 0 ? `
  <!-- Transactions -->
  <div class="section-title">${t('reports.sectionTransactions', lang)}</div>
  <table class="tx-table">
    <thead>
      <tr>
        <th>${t('pdf.date', lang)}</th>
        <th>${t('pdf.type', lang)}</th>
        <th>${t('pdf.category', lang)}</th>
        <th>${t('pdf.account', lang)}</th>
        <th style="text-align:right">${t('pdf.amount', lang)}</th>
      </tr>
    </thead>
    <tbody>${txRowsHTML}</tbody>
  </table>
  ${data.transactions.length > 50 ? `<div style="font-size:10px;color:#95a5a6;margin-top:4px;">Showing 50 of ${data.transactions.length} transactions</div>` : ''}
  ` : ''}

  ${showAnalytics ? `
  ${data.incomeBreakdown.length > 0 ? `
  <!-- Income Breakdown -->
  <div class="section-title">${t('analytics.incomeBreakdown', lang)}</div>
  <div style="margin:8px 0;text-align:center;">${incomeChartSVG}</div>
  ` : ''}

  ${data.expenseBreakdown.length > 0 ? `
  <!-- Expense Breakdown -->
  <div class="section-title">${t('analytics.expenseBreakdown', lang)}</div>
  <div style="margin:8px 0;text-align:center;">${expenseChartSVG}</div>
  ` : ''}

  <!-- Monthly Trend -->
  ${data.monthlyTrend.length > 1 ? `
  <div class="section-title">${t('pdf.incomeExpenseTrend', lang)}</div>
  <div style="margin:8px 0;text-align:center;">${trendChartSVG}</div>
  ` : ''}

  ${data.budgetVsActual && data.budgetVsActual.length > 0 ? `
  <!-- Budget vs Actual -->
  <div class="section-title">${t('pdf.budgetVsActual', lang)}</div>
  ${budgetBarsHTML}
  ` : ''}

  <!-- Insights -->
  <div class="section-title">${t('pdf.smartInsights', lang)}</div>
  ${insHTML}

  <!-- Anomalies -->
  <div class="section-title">${t('pdf.anomalyDetection', lang)}</div>
  ${anomaliesHTML}
  ` : ''}

  <!-- Footer -->
  <div style="text-align:center;font-size:9px;color:#95a5a6;margin-top:32px;padding-top:12px;border-top:1px solid #eee;">
    ${t('pdf.footer', lang)} ${new Date().toLocaleDateString()}
  </div>

</div>
</body>
</html>`;
}

/**
 * Escape HTML special characters to prevent rendering issues.
 */
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
