// src/tests/pdf.index.test.js — Unit tests for the PDF report generation facade
//
// Tests the orchestration layer (generatePDFReport) by mocking all
// data computation and rendering dependencies.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- Mock dependencies (must use vi.hoisted to handle hoisting) ----
const { mockRenderHTMLToPDF } = vi.hoisted(() => ({
  mockRenderHTMLToPDF: vi.fn(),
}));
const { mockBuildReportHTML } = vi.hoisted(() => ({
  mockBuildReportHTML: vi.fn(() => '<html>mock-report</html>'),
}));
const { mockGetPeriodRange, mockFilterTransactions, mockComputeSummary,
  mockComputeAccountDetails, mockComputeCategoryBreakdown,
  mockComputeMonthlyTrend, mockComputeBudgetVsActual, mockComputeInsights } = vi.hoisted(() => ({
  mockGetPeriodRange: vi.fn(),
  mockFilterTransactions: vi.fn(),
  mockComputeSummary: vi.fn(),
  mockComputeAccountDetails: vi.fn(),
  mockComputeCategoryBreakdown: vi.fn(),
  mockComputeMonthlyTrend: vi.fn(),
  mockComputeBudgetVsActual: vi.fn(),
  mockComputeInsights: vi.fn(),
}));
const { mockT } = vi.hoisted(() => ({
  mockT: vi.fn((key) => {
    const labels = {
      'reports.thisMonth': 'This Month',
      'reports.lastMonth': 'Last Month',
      'reports.last3Months': 'Last 3 Months',
      'reports.last6Months': 'Last 6 Months',
      'reports.thisYear': 'This Year',
    };
    return labels[key] || key;
  }),
}));

vi.mock('../lib/pdf/renderer', () => ({
  renderHTMLToPDF: mockRenderHTMLToPDF,
}));
vi.mock('../lib/pdf/reportTemplates', () => ({
  buildReportHTML: mockBuildReportHTML,
}));
vi.mock('../lib/pdf/reportData', () => ({
  getPeriodRange: mockGetPeriodRange,
  filterTransactionsByPeriod: mockFilterTransactions,
  computeSummary: mockComputeSummary,
  computeAccountDetails: mockComputeAccountDetails,
  computeCategoryBreakdown: mockComputeCategoryBreakdown,
  computeMonthlyTrend: mockComputeMonthlyTrend,
  computeBudgetVsActual: mockComputeBudgetVsActual,
  computeInsights: mockComputeInsights,
}));
vi.mock('../i18n', () => ({
  t: mockT,
}));

// ---- Module under test ----
import { generatePDFReport } from '../lib/pdf';

// ---- Helpers ----
const sampleAccounts = [
  { id: 'acc_1', name: 'Cash', type: 'Cash', balance: 10000 },
  { id: 'acc_2', name: 'Bank', type: 'Bank', balance: 50000 },
];
const sampleTransactions = [
  { id: 'tx_1', type: 'income', amount: 80000, date: '2026-05-01', accountId: 'acc_2', categoryId: 'cat_salary' },
  { id: 'tx_2', type: 'expense', amount: 25000, date: '2026-05-01', accountId: 'acc_2', categoryId: 'cat_rent' },
];
const sampleCategories = [
  { id: 'cat_food', name: 'Food', type: 'expense', color: '#e17055' },
];
const sampleBudgets = [
  { id: 'budget_1', categoryId: 'cat_food', limit: 5000 },
];

// ==============================================================================
// generatePDFReport
// ==============================================================================

describe('generatePDFReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock returns
    mockGetPeriodRange.mockReturnValue({ startDate: '2026-05-01', endDate: '2026-05-31' });
    mockFilterTransactions.mockImplementation((tx) => tx);
    mockComputeSummary.mockReturnValue({ totalIncome: 80000, totalExpense: 26800, netSavings: 53200 });
    mockComputeAccountDetails.mockReturnValue([]);
    mockComputeCategoryBreakdown.mockReturnValue([]);
    mockComputeMonthlyTrend.mockReturnValue([]);
    mockComputeBudgetVsActual.mockReturnValue([]);
    mockComputeInsights.mockReturnValue({
      topCategory: null,
      biggestIncrease: null,
      biggestDecrease: null,
      totalIncome: 80000,
      totalExpense: 26800,
      netSavings: 53200,
      savingsRate: 66.5,
      prevTotalIncome: 0,
      prevTotalExpense: 0,
      prevNetSavings: 0,
      transactionCount: 2,
      anomalies: [],
    });
    mockRenderHTMLToPDF.mockResolvedValue(undefined);
  });

  // ---------------------------------------------------------------
  // Basic execution & defaults
  // ---------------------------------------------------------------
  it('resolves successfully with minimal data', async () => {
    await expect(generatePDFReport({
      periodKey: 'thisMonth',
      transactions: [],
      accounts: [],
      categories: [],
      budgets: [],
      lang: 'en',
      sections: {},
    })).resolves.toBeUndefined();
  });

  it('calls getPeriodRange with the provided periodKey', async () => {
    await generatePDFReport({ periodKey: 'lastMonth', transactions: [] });
    expect(mockGetPeriodRange).toHaveBeenCalledWith('lastMonth');
  });

  it('defaults periodKey to thisMonth', async () => {
    await generatePDFReport({ transactions: [] });
    expect(mockGetPeriodRange).toHaveBeenCalledWith('thisMonth');
  });

  it('filters transactions using period start/end dates', async () => {
    mockGetPeriodRange.mockReturnValue({ startDate: '2026-05-01', endDate: '2026-05-31' });
    await generatePDFReport({ transactions: sampleTransactions });
    expect(mockFilterTransactions).toHaveBeenCalledWith(sampleTransactions, '2026-05-01', '2026-05-31');
  });

  // ---------------------------------------------------------------
  // Data computation
  // ---------------------------------------------------------------
  it('computes summary from filtered transactions', async () => {
    mockFilterTransactions.mockReturnValue(sampleTransactions);
    await generatePDFReport({ transactions: sampleTransactions });
    expect(mockComputeSummary).toHaveBeenCalledWith(sampleTransactions);
  });

  it('computes account details with accounts and filtered transactions', async () => {
    mockFilterTransactions.mockReturnValue(sampleTransactions);
    await generatePDFReport({ transactions: sampleTransactions, accounts: sampleAccounts });
    expect(mockComputeAccountDetails).toHaveBeenCalledWith(sampleAccounts, sampleTransactions);
  });

  it('computes both income and expense category breakdowns', async () => {
    mockFilterTransactions.mockReturnValue(sampleTransactions);
    await generatePDFReport({ transactions: sampleTransactions, categories: sampleCategories });
    expect(mockComputeCategoryBreakdown).toHaveBeenCalledWith(sampleTransactions, sampleCategories, 'income');
    expect(mockComputeCategoryBreakdown).toHaveBeenCalledWith(sampleTransactions, sampleCategories, 'expense');
  });

  it('computes monthly trend with period dates and filtered transactions', async () => {
    mockGetPeriodRange.mockReturnValue({ startDate: '2026-05-01', endDate: '2026-05-31' });
    mockFilterTransactions.mockReturnValue(sampleTransactions);
    await generatePDFReport({ transactions: sampleTransactions });
    expect(mockComputeMonthlyTrend).toHaveBeenCalledWith('2026-05-01', '2026-05-31', sampleTransactions);
  });

  it('computes budget vs actual with filtered transactions, budgets, and categories', async () => {
    mockFilterTransactions.mockReturnValue(sampleTransactions);
    await generatePDFReport({ transactions: sampleTransactions, budgets: sampleBudgets, categories: sampleCategories });
    expect(mockComputeBudgetVsActual).toHaveBeenCalledWith(sampleTransactions, sampleBudgets, sampleCategories);
  });

  it('computes insights with all transactions, categories, and period dates', async () => {
    mockGetPeriodRange.mockReturnValue({ startDate: '2026-05-01', endDate: '2026-05-31' });
    await generatePDFReport({ transactions: sampleTransactions, categories: sampleCategories });
    expect(mockComputeInsights).toHaveBeenCalledWith(sampleTransactions, sampleCategories, '2026-05-01', '2026-05-31');
  });

  // ---------------------------------------------------------------
  // HTML building
  // ---------------------------------------------------------------
  it('builds report HTML with computed data and i18n', async () => {
    mockFilterTransactions.mockReturnValue(sampleTransactions);
    const summary = { totalIncome: 80000, totalExpense: 26800, netSavings: 53200 };
    mockComputeSummary.mockReturnValue(summary);
    mockComputeAccountDetails.mockReturnValue([{ id: 'acc_1', name: 'Cash', balance: 10000, periodNetChange: 3200 }]);
    mockComputeCategoryBreakdown
      .mockReturnValueOnce([{ categoryId: 'cat_salary', name: 'Salary', amount: 80000, percentage: 100, color: '#2ecc71' }])
      .mockReturnValueOnce([{ categoryId: 'cat_rent', name: 'Rent', amount: 25000, percentage: 100, color: '#16a085' }]);
    mockComputeMonthlyTrend.mockReturnValue([{ label: '2026-05', income: 80000, expense: 26800 }]);
    mockComputeBudgetVsActual.mockReturnValue([{ categoryId: 'cat_food', categoryName: 'Food', budget: 5000, spent: 1800, remaining: 3200, percentage: 36 }]);
    const insights = {
      topCategory: { name: 'Rent', amount: 25000 },
      biggestIncrease: null,
      biggestDecrease: null,
      totalIncome: 80000,
      totalExpense: 26800,
      netSavings: 53200,
      savingsRate: 66.5,
      prevTotalIncome: 0,
      prevTotalExpense: 0,
      prevNetSavings: 0,
      transactionCount: 2,
      anomalies: [],
    };
    mockComputeInsights.mockReturnValue(insights);

    await generatePDFReport({
      periodKey: 'thisMonth',
      transactions: sampleTransactions,
      accounts: sampleAccounts,
      categories: sampleCategories,
      budgets: sampleBudgets,
      lang: 'en',
      sections: { summary: true, accounts: true, transactions: true, analytics: true },
    });

    expect(mockBuildReportHTML).toHaveBeenCalledTimes(1);
    const callArgs = mockBuildReportHTML.mock.calls[0];
    const reportData = callArgs[0];
    const lang = callArgs[1];
    const tFn = callArgs[2];
    const sections = callArgs[3];

    // Verify computed data shape
    expect(reportData.summary).toEqual(summary);
    expect(reportData.accounts).toEqual([{ id: 'acc_1', name: 'Cash', balance: 10000, periodNetChange: 3200 }]);
    expect(reportData.transactions).toEqual(sampleTransactions);
    expect(reportData.incomeBreakdown).toEqual([{ categoryId: 'cat_salary', name: 'Salary', amount: 80000, percentage: 100, color: '#2ecc71' }]);
    expect(reportData.expenseBreakdown).toEqual([{ categoryId: 'cat_rent', name: 'Rent', amount: 25000, percentage: 100, color: '#16a085' }]);
    expect(reportData.monthlyTrend).toEqual([{ label: '2026-05', income: 80000, expense: 26800 }]);
    expect(reportData.budgetVsActual).toEqual([{ categoryId: 'cat_food', categoryName: 'Food', budget: 5000, spent: 1800, remaining: 3200, percentage: 36 }]);
    expect(reportData.insights).toEqual(insights);
    expect(reportData.periodLabel).toBe('This Month');
    expect(reportData.generatedDate).toBeDefined();

    expect(lang).toBe('en');
    expect(typeof tFn).toBe('function');
    expect(sections).toEqual({ summary: true, accounts: true, transactions: true, analytics: true });
  });

  it('passes the i18n t function to buildReportHTML', async () => {
    await generatePDFReport({ lang: 'bn' });
    const tFn = mockBuildReportHTML.mock.calls[0][2];
    expect(tFn('reports.thisMonth', 'bn')).toBe('This Month');
    expect(tFn('reports.lastMonth', 'bn')).toBe('Last Month');
  });

  it('uses periodKey as fallback label when key is not recognized', async () => {
    await generatePDFReport({ periodKey: 'customPeriod' });
    const reportData = mockBuildReportHTML.mock.calls[0][0];
    expect(reportData.periodLabel).toBe('customPeriod');
  });

  it('passes sections to buildReportHTML', async () => {
    await generatePDFReport({ sections: { summary: false, accounts: true } });
    const sections = mockBuildReportHTML.mock.calls[0][3];
    expect(sections).toEqual({ summary: false, accounts: true });
  });

  // ---------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------
  it('renders the built HTML to PDF with correct filename', async () => {
    mockGetPeriodRange.mockReturnValue({ startDate: '2026-05-01', endDate: '2026-05-31' });
    await generatePDFReport({ periodKey: 'thisMonth', transactions: sampleTransactions });
    expect(mockBuildReportHTML).toHaveBeenCalled();
    const html = mockBuildReportHTML.mock.results[0].value;
    expect(mockRenderHTMLToPDF).toHaveBeenCalledWith(
      html,
      'Pocket_Khata_Report_2026-05-01_to_2026-05-31',
    );
  });

  it('includes period dates in the generated filename', async () => {
    mockGetPeriodRange.mockReturnValue({ startDate: '2026-01-01', endDate: '2026-12-31' });
    await generatePDFReport({ periodKey: 'thisYear' });
    expect(mockRenderHTMLToPDF).toHaveBeenCalledWith(
      expect.any(String),
      'Pocket_Khata_Report_2026-01-01_to_2026-12-31',
    );
  });

  // ---------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------
  it('propagates errors from renderHTMLToPDF', async () => {
    mockRenderHTMLToPDF.mockRejectedValue(new Error('Rendering failed'));
    await expect(generatePDFReport({
      transactions: sampleTransactions,
    })).rejects.toThrow('Rendering failed');
  });

  it('propagates errors from data computation', async () => {
    mockComputeSummary.mockImplementation(() => { throw new Error('Data error'); });
    await expect(generatePDFReport({
      transactions: sampleTransactions,
    })).rejects.toThrow('Data error');
  });
});
