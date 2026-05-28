// src/lib/pdf/index.js — Public Facade
// Single entry point for all PDF export functionality.

import { renderHTMLToPDF } from './renderer';
import { buildReportHTML } from './reportTemplates';
import {
  getPeriodRange,
  filterTransactionsByPeriod,
  computeSummary,
  computeAccountDetails,
  computeCategoryBreakdown,
  computeMonthlyTrend,
  computeBudgetVsActual,
  computeInsights,
} from './reportData';
import { t } from '../../i18n';

/**
 * Generate and download a PDF financial report.
 *
 * @param {object} options
 * @param {string} options.periodKey - 'thisMonth'|'lastMonth'|'last3Months'|'last6Months'|'thisYear'
 * @param {Array} options.transactions - All transactions
 * @param {Array} options.accounts - All accounts
 * @param {Array} options.categories - All categories
 * @param {Array} options.budgets - All budgets
 * @param {string} options.lang - 'en' or 'bn'
 * @param {object} options.sections - { summary, accounts, transactions, analytics }
 * @returns {Promise<void>}
 */
export async function generatePDFReport({
  periodKey = 'thisMonth',
  transactions = [],
  accounts = [],
  categories = [],
  budgets = [],
  lang = 'en',
  sections = {},
}) {
  // 1. Compute period range
  const period = getPeriodRange(periodKey);

  // 2. Filter transactions by period
  const periodTransactions = filterTransactionsByPeriod(transactions, period.startDate, period.endDate);

  // 3. Compute all report data
  const summary = computeSummary(periodTransactions);
  const accountDetails = computeAccountDetails(accounts, periodTransactions);
  const incomeBreakdown = computeCategoryBreakdown(periodTransactions, categories, 'income');
  const expenseBreakdown = computeCategoryBreakdown(periodTransactions, categories, 'expense');
  const monthlyTrend = computeMonthlyTrend(period.startDate, period.endDate, periodTransactions);
  const budgetVsActual = computeBudgetVsActual(periodTransactions, budgets, categories);
  const insights = computeInsights(transactions, categories, period.startDate, period.endDate);

  // 4. Build period label
  const periodLabels = {
    thisMonth: t('reports.thisMonth', lang),
    lastMonth: t('reports.lastMonth', lang),
    last3Months: t('reports.last3Months', lang),
    last6Months: t('reports.last6Months', lang),
    thisYear: t('reports.thisYear', lang),
  };
  const periodLabel = periodLabels[periodKey] || periodKey;

  const reportData = {
    summary,
    accounts: accountDetails,
    transactions: periodTransactions,
    incomeBreakdown,
    expenseBreakdown,
    monthlyTrend,
    budgetVsActual,
    insights,
    periodLabel,
    generatedDate: new Date().toLocaleDateString(),
  };

  // 5. Build HTML template
  const html = buildReportHTML(reportData, lang, t, sections);

  // 6. Render HTML to PDF via html2canvas + jsPDF
  const filename = `Pocket_Khata_Report_${period.startDate}_to_${period.endDate}`;
  await renderHTMLToPDF(html, filename);
}
