// src/tests/reportTemplates.test.js — Tests for the PDF report HTML template builder

import { describe, it, expect } from 'vitest';
import { buildReportHTML } from '../lib/pdf/reportTemplates';
import { t } from '../i18n';

// ==============================================================================
// Mock Data
// ==============================================================================

const mockData = {
  summary: { totalIncome: 80000, totalExpense: 26800, netSavings: 53200 },
  accounts: [
    { id: 'acc_1', name: 'Cash', type: 'Cash', balance: 10000, color: '#3cd070', periodNetChange: 3200 },
    { id: 'acc_2', name: 'Bank', type: 'Bank', balance: 50000, color: '#4a90e2', periodNetChange: 50000 },
  ],
  transactions: [
    { id: 'tx_1', type: 'income', amount: 80000, date: '2026-05-01', accountId: 'acc_2', categoryId: 'cat_salary' },
    { id: 'tx_2', type: 'expense', amount: 25000, date: '2026-05-01', accountId: 'acc_2', categoryId: 'cat_rent' },
  ],
  incomeBreakdown: [
    { categoryId: 'cat_salary', name: 'Salary', amount: 80000, percentage: 100, color: '#2ecc71' },
  ],
  expenseBreakdown: [
    { categoryId: 'cat_rent', name: 'Rent', amount: 25000, percentage: 93.28, color: '#16a085' },
    { categoryId: 'cat_food', name: 'Food', amount: 1800, percentage: 6.72, color: '#e17055' },
  ],
  monthlyTrend: [
    { label: '2026-04', income: 10000, expense: 2000, year: 2026, month: 3 },
    { label: '2026-05', income: 80000, expense: 26800, year: 2026, month: 4 },
  ],
  budgetVsActual: [
    { categoryId: 'cat_food', categoryName: 'Food', color: '#e17055', budget: 5000, spent: 1800, remaining: 3200, percentage: 36 },
    { categoryId: 'cat_rent', categoryName: 'Rent', color: '#16a085', budget: 30000, spent: 25000, remaining: 5000, percentage: 83.33 },
  ],
  insights: {
    topCategory: { name: 'Rent', amount: 25000 },
    biggestIncrease: { name: 'Rent', diff: 25000 },
    biggestDecrease: { name: 'Food', diff: -500 },
    totalIncome: 80000,
    totalExpense: 26800,
    netSavings: 53200,
    savingsRate: 66.5,
    prevTotalIncome: 10000,
    prevTotalExpense: 2000,
    prevNetSavings: 8000,
    transactionCount: 6,
    anomalies: [
      { categoryName: 'Food', amount: 3000, ratio: 24, avg: 125 },
    ],
  },
  periodLabel: 'This Month',
  generatedDate: '5/15/2026',
};

// ==============================================================================
// Tests
// ==============================================================================

describe('buildReportHTML', () => {
  it('returns a string containing HTML', () => {
    const html = buildReportHTML(mockData, 'en', t, {});
    expect(typeof html).toBe('string');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html>');
    expect(html).toContain('</html>');
  });

  it('includes the title from i18n', () => {
    const html = buildReportHTML(mockData, 'en', t, {});
    expect(html).toContain('Pocket Khata');
    expect(html).toContain('Financial Report');
  });

  it('includes the period label in the header', () => {
    const html = buildReportHTML(mockData, 'en', t, {});
    expect(html).toContain('This Month');
  });

  it('includes summary cards section by default', () => {
    const html = buildReportHTML(mockData, 'en', t, {});
    expect(html).toContain('TOTAL INCOME');
    expect(html).toContain('TOTAL EXPENSE');
    expect(html).toContain('NET SAVINGS');
  });

  it('includes formatted amounts in summary cards', () => {
    const html = buildReportHTML(mockData, 'en', t, {});
    expect(html).toContain('80,000');
    expect(html).toContain('26,800');
    expect(html).toContain('53,200');
  });

  it('uses NET LOSS label when net savings is negative', () => {
    const lossData = {
      ...mockData,
      summary: { totalIncome: 10000, totalExpense: 15000, netSavings: -5000 },
    };
    const html = buildReportHTML(lossData, 'en', t, {});
    expect(html).toContain('NET LOSS');
    expect(html).not.toContain('NET SAVINGS');
  });

  it('includes account details section by default', () => {
    const html = buildReportHTML(mockData, 'en', t, {});
    expect(html).toContain('Account Details');
    expect(html).toContain('Cash');
    expect(html).toContain('Bank');
  });

  it('includes transaction table section by default', () => {
    const html = buildReportHTML(mockData, 'en', t, {});
    expect(html).toContain('Transactions Table');
    // Transaction table renders category/account names, not IDs
    expect(html).toContain('Salary');
    expect(html).toContain('Rent');
    // Check table headers
    expect(html).toContain('Date');
    expect(html).toContain('Type');
    expect(html).toContain('Category');
    expect(html).toContain('Account');
    expect(html).toContain('Amount');
  });

  it('includes analytics sections by default', () => {
    const html = buildReportHTML(mockData, 'en', t, {});
    expect(html).toContain('Income Breakdown');
    expect(html).toContain('Expense Breakdown');
    expect(html).toContain('Income vs Expense Trend');
    expect(html).toContain('Budget vs Actual');
    expect(html).toContain('Smart Insights');
  });

  it('includes SVG chart markup for trend chart', () => {
    const html = buildReportHTML(mockData, 'en', t, {});
    expect(html).toContain('<svg');
    expect(html).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('includes SVG donut chart markup for breakdowns', () => {
    const html = buildReportHTML(mockData, 'en', t, {});
    // The donut chart SVGs contain path elements
    const svgCount = (html.match(/<svg /g) || []).length;
    expect(svgCount).toBeGreaterThanOrEqual(2); // At least trend chart + donut charts
  });

  it('includes anomaly detection section when anomalies exist', () => {
    const html = buildReportHTML(mockData, 'en', t, {});
    expect(html).toContain('Anomaly Detection');
    expect(html).toContain('24.0×');
  });

  it('shows "No anomalies detected" when no anomalies', () => {
    const noAnomalyData = {
      ...mockData,
      insights: { ...mockData.insights, anomalies: [] },
    };
    const html = buildReportHTML(noAnomalyData, 'en', t, {});
    // The anomalies section is always shown, with empty state when no anomalies
    expect(html).toContain('Anomaly Detection');
    expect(html).toContain('No anomalies detected this period.');
  });

  it('includes budget vs actual bars', () => {
    const html = buildReportHTML(mockData, 'en', t, {});
    expect(html).toContain('Food');
    expect(html).toContain('Rent');
    // Budget bar markup
    expect(html).toContain('budget-bar');
  });

  it('includes insights rows', () => {
    const html = buildReportHTML(mockData, 'en', t, {});
    expect(html).toContain('Top Spending Category');
    expect(html).toContain('Biggest Increase vs Previous Period');
    expect(html).toContain('Biggest Decrease vs Previous Period');
    expect(html).toContain('Savings Rate');
  });

  it('hides summary section when sections.summary is false', () => {
    const html = buildReportHTML(mockData, 'en', t, { summary: false });
    expect(html).not.toContain('TOTAL INCOME');
    expect(html).not.toContain('TOTAL EXPENSE');
    expect(html).not.toContain('NET SAVINGS');
    // But other sections should still be present
    expect(html).toContain('Account Details');
  });

  it('hides accounts section when sections.accounts is false', () => {
    const html = buildReportHTML(mockData, 'en', t, { accounts: false });
    expect(html).not.toContain('Account Details');
    // Cash only appears in the accounts section (not in transactions)
    expect(html).not.toContain('Cash');
    // Bank appears in the transaction table (tx_1, tx_2 use acc_2=Bank) even when accounts section is hidden
    // So we should NOT check for Bank being absent
  });

  it('hides transactions section when sections.transactions is false', () => {
    const html = buildReportHTML(mockData, 'en', t, { transactions: false });
    expect(html).not.toContain('Transactions Table');
  });

  it('hides analytics sections when sections.analytics is false', () => {
    const html = buildReportHTML(mockData, 'en', t, { analytics: false });
    expect(html).not.toContain('Income Breakdown');
    expect(html).not.toContain('Expense Breakdown');
    expect(html).not.toContain('Income vs Expense Trend');
    expect(html).not.toContain('Budget vs Actual');
    // But summary and accounts should still be present
    expect(html).toContain('TOTAL INCOME');
    expect(html).toContain('Account Details');
  });

  it('handles empty accounts gracefully', () => {
    const noAccounts = { ...mockData, accounts: [] };
    const html = buildReportHTML(noAccounts, 'en', t, {});
    // Account section should be hidden when there are no accounts
    expect(html).not.toContain('Account Details');
  });

  it('handles empty transactions gracefully', () => {
    const noTx = { ...mockData, transactions: [] };
    const html = buildReportHTML(noTx, 'en', t, {});
    expect(html).not.toContain('Transactions Table');
  });

  it('handles empty data gracefully', () => {
    const emptyData = {
      summary: { totalIncome: 0, totalExpense: 0, netSavings: 0 },
      accounts: [],
      transactions: [],
      incomeBreakdown: [],
      expenseBreakdown: [],
      monthlyTrend: [],
      budgetVsActual: [],
      insights: {
        topCategory: null,
        biggestIncrease: null,
        biggestDecrease: null,
        totalIncome: 0,
        totalExpense: 0,
        netSavings: 0,
        savingsRate: 0,
        prevTotalIncome: 0,
        prevTotalExpense: 0,
        prevNetSavings: 0,
        transactionCount: 0,
        anomalies: [],
      },
      periodLabel: 'This Month',
      generatedDate: '5/15/2026',
    };
    const html = buildReportHTML(emptyData, 'en', t, {});
    // Should still generate valid HTML
    expect(typeof html).toBe('string');
    expect(html).toContain('Pocket Khata');
    expect(html).toContain('Financial Report');
    // Most sections hidden due to empty data
    expect(html).not.toContain('Transactions Table');
    expect(html).not.toContain('Account Details');
  });

  it('escapes HTML in user-provided values', () => {
    const dataWithHtml = {
      ...mockData,
      accounts: [
        { id: 'acc_x', name: '<script>alert("xss")</script>', type: 'Cash', balance: 100, color: '#000', periodNetChange: 0 },
      ],
      transactions: [
        { id: 'tx_x', type: 'expense', amount: 50, date: '2026-05-01', accountId: 'acc_x', categoryId: 'cat_food', notes: '<img onerror="evil()">' },
      ],
      expenseBreakdown: [
        { categoryId: 'cat_food', name: '<b>Food</b>', amount: 50, percentage: 100, color: '#000' },
      ],
    };
    const html = buildReportHTML(dataWithHtml, 'en', t, {});
    // User-provided values should be HTML-escaped
    expect(html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert("xss")</script>');

    // Category names from i18n are NOT escaped (they're trusted strings)
    // But user-provided names like '<b>Food</b>' should be escaped
    // Note: breakout category names come from computeCategoryBreakdown which returns
    // the category name from user data, so it goes through escHtml
    expect(html).toContain('&lt;b&gt;Food&lt;/b&gt;');
  });

  it('includes Bangla font stack in CSS', () => {
    const html = buildReportHTML(mockData, 'en', t, {});
    expect(html).toContain('Noto Sans Bengali');
    expect(html).toContain('Siyam Rupali');
  });

  it('includes footer with generation text', () => {
    const html = buildReportHTML(mockData, 'en', t, {});
    expect(html).toContain('Generated by Pocket Khata on');
  });

  it('limits transaction table to 50 rows', () => {
    const manyTx = Array.from({ length: 100 }, (_, i) => ({
      id: `tx_${i}`,
      type: i % 2 === 0 ? 'income' : 'expense',
      amount: 1000,
      date: '2026-05-01',
      accountId: 'acc_1',
      categoryId: 'cat_food',
    }));
    const dataWithManyTx = {
      ...mockData,
      transactions: manyTx,
    };
    const html = buildReportHTML(dataWithManyTx, 'en', t, {});
    // Should show "Showing 50 of 100" notification
    expect(html).toContain('Showing 50 of 100');
  });

  it('supports Bangla language', () => {
    const html = buildReportHTML(mockData, 'bn', t, {});
    expect(html).toContain('পকেট খাতা');
    expect(html).toContain('আর্থিক প্রতিবেদন');
    expect(html).toContain('মোট আয়');
    expect(html).toContain('মোট ব্যয়');
    expect(html).toContain('নিট সঞ্চয়');
  });

  it('renders trend chart when monthlyTrend has data', () => {
    const dataWithTrend = {
      ...mockData,
      monthlyTrend: [
        { label: '2026-04', income: 10000, expense: 2000, year: 2026, month: 3 },
        { label: '2026-05', income: 80000, expense: 26800, year: 2026, month: 4 },
      ],
    };
    const html = buildReportHTML(dataWithTrend, 'en', t, {});
    expect(html).toContain('Income vs Expense Trend');
    expect(html).toContain('2026-04');
    expect(html).toContain('2026-05');
  });

  it('hides trend chart section when only one month of data', () => {
    const singleMonth = {
      ...mockData,
      monthlyTrend: [
        { label: '2026-05', income: 80000, expense: 26800, year: 2026, month: 4 },
      ],
    };
    const html = buildReportHTML(singleMonth, 'en', t, {});
    expect(html).not.toContain('Income vs Expense Trend');
  });

  it('hides budget section when no budgets exist', () => {
    const noBudgets = {
      ...mockData,
      budgetVsActual: [],
    };
    const html = buildReportHTML(noBudgets, 'en', t, {});
    expect(html).not.toContain('Budget vs Actual');
  });

  it('hides income breakdown chart when no income transactions', () => {
    const noIncome = {
      ...mockData,
      incomeBreakdown: [],
    };
    const html = buildReportHTML(noIncome, 'en', t, {});
    expect(html).not.toContain('Income Breakdown');
  });

  it('hides expense breakdown chart when no expense transactions', () => {
    const noExpense = {
      ...mockData,
      expenseBreakdown: [],
    };
    const html = buildReportHTML(noExpense, 'en', t, {});
    expect(html).not.toContain('Expense Breakdown');
  });

  it('hides income breakdown chart when no income transactions', () => {
    const noIncome = {
      ...mockData,
      incomeBreakdown: [],
    };
    const html = buildReportHTML(noIncome, 'en', t, {});
    expect(html).not.toContain('Income Breakdown');
  });

  it('hides expense breakdown chart when no expense transactions', () => {
    const noExpense = {
      ...mockData,
      expenseBreakdown: [],
    };
    const html = buildReportHTML(noExpense, 'en', t, {});
    expect(html).not.toContain('Expense Breakdown');
  });
});
