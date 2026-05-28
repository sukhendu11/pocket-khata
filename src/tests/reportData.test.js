// src/tests/reportData.test.js — Unit tests for the PDF report data computation layer

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getPeriodRange,
  filterTransactionsByPeriod,
  computeSummary,
  computeAccountDetails,
  computeCategoryBreakdown,
  computeMonthlyTrend,
  computeBudgetVsActual,
  computeInsights,
} from '../lib/pdf/reportData';

// ==============================================================================
// Helpers
// ==============================================================================

/** Mock `new Date()` to return May 15, 2026 for period calculations. */
function useFixedDate(year = 2026, month = 4, day = 15) {
  const RealDate = globalThis.Date;
  const fixedTs = new RealDate(year, month, day).getTime();

  class MockDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) super(fixedTs);
      else super(...args);
    }
  }
  MockDate.now = () => fixedTs;
  MockDate.UTC = RealDate.UTC;
  MockDate.parse = RealDate.parse;

  vi.stubGlobal('Date', MockDate);
}

const sampleAccounts = [
  { id: 'acc_1', name: 'Cash', type: 'Cash', balance: 10000, color: '#3cd070' },
  { id: 'acc_2', name: 'Bank', type: 'Bank', balance: 50000, color: '#4a90e2' },
];

const sampleCategories = [
  { id: 'cat_food', name: 'Food', type: 'expense', color: '#e17055' },
  { id: 'cat_salary', name: 'Salary', type: 'income', color: '#2ecc71' },
  { id: 'cat_rent', name: 'Rent', type: 'expense', color: '#16a085' },
  { id: 'cat_transport', name: 'Transport', type: 'expense', color: '#0984e3' },
];

const sampleTransactions = [
  { id: 'tx_1', type: 'income', amount: 80000, date: '2026-05-01', accountId: 'acc_2', categoryId: 'cat_salary' },
  { id: 'tx_2', type: 'expense', amount: 25000, date: '2026-05-01', accountId: 'acc_2', categoryId: 'cat_rent' },
  { id: 'tx_3', type: 'expense', amount: 1500, date: '2026-05-10', accountId: 'acc_1', categoryId: 'cat_food' },
  { id: 'tx_4', type: 'expense', amount: 300, date: '2026-05-11', accountId: 'acc_1', categoryId: 'cat_transport' },
  { id: 'tx_5', type: 'income', amount: 10000, date: '2026-04-15', accountId: 'acc_1', categoryId: 'cat_salary' },
  { id: 'tx_6', type: 'expense', amount: 2000, date: '2026-04-20', accountId: 'acc_1', categoryId: 'cat_food' },
  { id: 'tx_7', type: 'transfer', amount: 5000, date: '2026-05-05', accountId: 'acc_2', transferToId: 'acc_1', categoryId: '' },
];

const sampleBudgets = [
  { id: 'budget_1', categoryId: 'cat_food', limit: 5000 },
  { id: 'budget_2', categoryId: 'cat_rent', limit: 30000 },
];

// ==============================================================================
// getPeriodRange
// ==============================================================================

describe('getPeriodRange', () => {
  beforeEach(() => {
    useFixedDate(2026, 4, 15); // May 15, 2026
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns correct range for thisMonth (May 2026)', () => {
    const result = getPeriodRange('thisMonth');
    expect(result.startDate).toBe('2026-05-01');
    expect(result.endDate).toBe('2026-05-31');
    expect(result.label).toBe('thisMonth');
  });

  it('returns correct range for lastMonth (April 2026)', () => {
    const result = getPeriodRange('lastMonth');
    expect(result.startDate).toBe('2026-04-01');
    expect(result.endDate).toBe('2026-04-30');
    expect(result.label).toBe('lastMonth');
  });

  it('returns correct range for last3Months (Feb–May 2026)', () => {
    const result = getPeriodRange('last3Months');
    expect(result.startDate).toBe('2026-02-01');
    expect(result.endDate).toBe('2026-05-31');
    expect(result.label).toBe('last3Months');
  });

  it('returns correct range for last6Months (Nov 2025–May 2026)', () => {
    const result = getPeriodRange('last6Months');
    expect(result.startDate).toBe('2025-11-01');
    expect(result.endDate).toBe('2026-05-31');
    expect(result.label).toBe('last6Months');
  });

  it('returns correct range for thisYear (2026)', () => {
    const result = getPeriodRange('thisYear');
    expect(result.startDate).toBe('2026-01-01');
    expect(result.endDate).toBe('2026-12-31');
    expect(result.label).toBe('thisYear');
  });

  it('defaults to thisMonth for unknown key', () => {
    const result = getPeriodRange('unknown');
    expect(result.startDate).toBe('2026-05-01');
    expect(result.endDate).toBe('2026-05-31');
    expect(result.label).toBe('thisMonth');
  });

  it('handles December correctly for January date', () => {
    useFixedDate(2026, 0, 15); // January 15, 2026
    const lastMonth = getPeriodRange('lastMonth');
    expect(lastMonth.startDate).toBe('2025-12-01');
    expect(lastMonth.endDate).toBe('2025-12-31');

    const last3Months = getPeriodRange('last3Months');
    expect(last3Months.startDate).toBe('2025-10-01');
    expect(last3Months.endDate).toBe('2026-01-31');
  });
});

// ==============================================================================
// filterTransactionsByPeriod
// ==============================================================================

describe('filterTransactionsByPeriod', () => {
  it('filters transactions within date range (inclusive)', () => {
    const result = filterTransactionsByPeriod(sampleTransactions, '2026-05-01', '2026-05-15');
    expect(result).toHaveLength(5);
    expect(result.map(t => t.id)).toEqual(['tx_1', 'tx_2', 'tx_3', 'tx_4', 'tx_7']);
  });

  it('returns empty array for non-overlapping range', () => {
    const result = filterTransactionsByPeriod(sampleTransactions, '2027-01-01', '2027-01-31');
    expect(result).toHaveLength(0);
  });

  it('returns all transactions for wide range', () => {
    const result = filterTransactionsByPeriod(sampleTransactions, '2020-01-01', '2030-12-31');
    expect(result).toHaveLength(sampleTransactions.length);
  });

  it('handles empty transactions array', () => {
    const result = filterTransactionsByPeriod([], '2026-05-01', '2026-05-31');
    expect(result).toHaveLength(0);
  });
});

// ==============================================================================
// computeSummary
// ==============================================================================

describe('computeSummary', () => {
  it('computes total income, expense, and net savings', () => {
    const result = computeSummary(sampleTransactions);
    expect(result.totalIncome).toBe(90000); // 80000 + 10000
    expect(result.totalExpense).toBe(28800); // 25000 + 1500 + 300 + 2000
    expect(result.netSavings).toBe(61200); // 90000 - 28800
  });

  it('returns zeros for empty transactions', () => {
    const result = computeSummary([]);
    expect(result.totalIncome).toBe(0);
    expect(result.totalExpense).toBe(0);
    expect(result.netSavings).toBe(0);
  });

  it('handles only income transactions', () => {
    const incomeOnly = sampleTransactions.filter(t => t.type === 'income');
    const result = computeSummary(incomeOnly);
    expect(result.totalIncome).toBe(90000);
    expect(result.totalExpense).toBe(0);
    expect(result.netSavings).toBe(90000);
  });

  it('handles only expense transactions', () => {
    const expenseOnly = sampleTransactions.filter(t => t.type === 'expense');
    const result = computeSummary(expenseOnly);
    expect(result.totalIncome).toBe(0);
    expect(result.totalExpense).toBe(28800);
    expect(result.netSavings).toBe(-28800);
  });

  it('ignores transfers in summary', () => {
    const transfers = sampleTransactions.filter(t => t.type === 'transfer');
    const result = computeSummary(transfers);
    expect(result.totalIncome).toBe(0);
    expect(result.totalExpense).toBe(0);
    expect(result.netSavings).toBe(0);
  });
});

// ==============================================================================
// computeAccountDetails
// ==============================================================================

describe('computeAccountDetails', () => {
  it('computes period net change for each account', () => {
    const periodTx = filterTransactionsByPeriod(sampleTransactions, '2026-05-01', '2026-05-31');
    const result = computeAccountDetails(sampleAccounts, periodTx);

    const cash = result.find(a => a.id === 'acc_1');
    expect(cash.name).toBe('Cash');
    expect(cash.balance).toBe(10000);
    // Expenses: 1500 + 300 = 1800, Transfer in: 5000, Income: 0 → net: -1800 + 5000 = +3200
    expect(cash.periodNetChange).toBe(3200);
    expect(cash.color).toBe('#3cd070');

    const bank = result.find(a => a.id === 'acc_2');
    expect(bank.name).toBe('Bank');
    expect(bank.balance).toBe(50000);
    // Income: 80000, Expense: 25000, Transfer out: 5000 → net: 80000 - 25000 - 5000 = +50000
    expect(bank.periodNetChange).toBe(50000);
  });

  it('handles empty period transactions', () => {
    const result = computeAccountDetails(sampleAccounts, []);
    result.forEach(acc => {
      expect(acc.periodNetChange).toBe(0);
    });
  });

  it('handles empty accounts', () => {
    const result = computeAccountDetails([], sampleTransactions);
    expect(result).toHaveLength(0);
  });
});

// ==============================================================================
// computeCategoryBreakdown
// ==============================================================================

describe('computeCategoryBreakdown', () => {
  it('computes income breakdown correctly', () => {
    const periodTx = filterTransactionsByPeriod(sampleTransactions, '2026-05-01', '2026-05-31');
    const result = computeCategoryBreakdown(periodTx, sampleCategories, 'income');
    expect(result).toHaveLength(1);
    expect(result[0].categoryId).toBe('cat_salary');
    expect(result[0].amount).toBe(80000);
    expect(result[0].percentage).toBe(100); // Only one income category
    expect(result[0].name).toBe('Salary');
  });

  it('computes expense breakdown correctly', () => {
    const periodTx = filterTransactionsByPeriod(sampleTransactions, '2026-05-01', '2026-05-31');
    const result = computeCategoryBreakdown(periodTx, sampleCategories, 'expense');
    expect(result).toHaveLength(3);
    // Sorted by amount descending: Rent (25000) > Food (1500) > Transport (300)
    expect(result[0].categoryId).toBe('cat_rent');
    expect(result[0].amount).toBe(25000);
    expect(result[0].percentage).toBeCloseTo(93.28, 1);
    expect(result[1].categoryId).toBe('cat_food');
    expect(result[1].amount).toBe(1500);
    expect(result[1].percentage).toBeCloseTo(5.60, 1);
    expect(result[2].categoryId).toBe('cat_transport');
    expect(result[2].amount).toBe(300);
    expect(result[2].percentage).toBeCloseTo(1.12, 1);
  });

  it('returns empty array when no transactions match type', () => {
    const result = computeCategoryBreakdown([], sampleCategories, 'expense');
    expect(result).toHaveLength(0);
  });

  it('handles unknown category gracefully', () => {
    const unknownTx = [{ id: 'tx_u', type: 'expense', amount: 100, date: '2026-05-01', accountId: 'acc_1', categoryId: 'cat_unknown' }];
    const result = computeCategoryBreakdown(unknownTx, sampleCategories, 'expense');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Unknown');
    expect(result[0].color).toBe('#636e72');
  });

  it('returns 0 percentage when total is 0', () => {
    const emptyTx = [{ id: 'tx_z', type: 'expense', amount: 0, date: '2026-05-01', accountId: 'acc_1', categoryId: 'cat_food' }];
    const result = computeCategoryBreakdown(emptyTx, sampleCategories, 'expense');
    expect(result[0].percentage).toBe(0);
  });
});

// ==============================================================================
// computeMonthlyTrend
// ==============================================================================

describe('computeMonthlyTrend', () => {
  it('computes monthly income/expense for the period', () => {
    const result = computeMonthlyTrend('2026-04-01', '2026-05-31', sampleTransactions);
    expect(result).toHaveLength(2);

    // April 2026
    expect(result[0].label).toBe('2026-04');
    expect(result[0].income).toBe(10000);
    expect(result[0].expense).toBe(2000);

    // May 2026
    expect(result[1].label).toBe('2026-05');
    expect(result[1].income).toBe(80000);
    expect(result[1].expense).toBe(26800); // 25000 + 1500 + 300
  });

  it('handles single-month range', () => {
    const result = computeMonthlyTrend('2026-05-01', '2026-05-31', sampleTransactions);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('2026-05');
  });

  it('handles empty transactions', () => {
    const result = computeMonthlyTrend('2026-05-01', '2026-05-31', []);
    expect(result).toHaveLength(1);
    expect(result[0].income).toBe(0);
    expect(result[0].expense).toBe(0);
  });
});

// ==============================================================================
// computeBudgetVsActual
// ==============================================================================

describe('computeBudgetVsActual', () => {
  it('computes budget vs actual for each budget', () => {
    const periodTx = filterTransactionsByPeriod(sampleTransactions, '2026-05-01', '2026-05-31');
    const result = computeBudgetVsActual(periodTx, sampleBudgets, sampleCategories);

    expect(result).toHaveLength(2);

    // Food: budget 5000, spent 1500 → 30%
    const food = result.find(b => b.categoryId === 'cat_food');
    expect(food.spent).toBe(1500);
    expect(food.budget).toBe(5000);
    expect(food.remaining).toBe(3500);
    expect(food.percentage).toBe(30);
    expect(food.categoryName).toBe('Food');

    // Rent: budget 30000, spent 25000 → 83.33%
    const rent = result.find(b => b.categoryId === 'cat_rent');
    expect(rent.spent).toBe(25000);
    expect(rent.budget).toBe(30000);
    expect(rent.remaining).toBe(5000);
    expect(rent.percentage).toBeCloseTo(83.33, 1);
  });

  it('handles empty budgets', () => {
    const result = computeBudgetVsActual(sampleTransactions, [], sampleCategories);
    expect(result).toHaveLength(0);
  });

  it('handles 0 budget limit (no division by zero)', () => {
    const zeroBudget = [{ id: 'b_zero', categoryId: 'cat_food', limit: 0 }];
    const result = computeBudgetVsActual(sampleTransactions, zeroBudget, sampleCategories);
    expect(result[0].percentage).toBe(0);
  });

  it('handles over-budget scenarios (>100%)', () => {
    const lowBudget = [{ id: 'b_low', categoryId: 'cat_food', limit: 500 }];
    const periodTx = filterTransactionsByPeriod(sampleTransactions, '2026-05-01', '2026-05-31');
    const result = computeBudgetVsActual(periodTx, lowBudget, sampleCategories);
    expect(result[0].percentage).toBe(300); // 1500/500 = 300%
    expect(result[0].remaining).toBe(-1000);
  });
});

// ==============================================================================
// computeInsights
// ==============================================================================

describe('computeInsights', () => {
  it('computes insights correctly', () => {
    useFixedDate(2026, 4, 15);
    // Pass ALL transactions — computeInsights internally filters by startDate/endDate
    const result = computeInsights(sampleTransactions, sampleCategories, '2026-05-01', '2026-05-31');

    // Total income/expense for period
    expect(result.totalIncome).toBe(80000);
    expect(result.totalExpense).toBe(26800);
    expect(result.netSavings).toBe(53200);
    expect(result.transactionCount).toBe(5);

    // Top spending category: Rent (25000)
    expect(result.topCategory.name).toBe('Rent');
    expect(result.topCategory.amount).toBe(25000);

    // Savings rate: 53200/80000 = 66.5%
    expect(result.savingsRate).toBeCloseTo(66.5, 1);

    // Previous period (same length before May 1 = April 2026)
    // April had income 10000, expense 2000
    expect(result.prevTotalIncome).toBe(10000);
    expect(result.prevTotalExpense).toBe(2000);
    expect(result.prevNetSavings).toBe(8000);

    // Biggest increase: Food went from 2000 (April) to 1500 (May) → -500, not an increase
    // Rent: 0 (April) → 25000 (May) = +25000 increase
    expect(result.biggestIncrease.name).toBe('Rent');
    expect(result.biggestIncrease.diff).toBe(25000);

    // Biggest decrease: Food went from 2000 to 1500 → -500 decrease
    // Transport: 0 to 300 → +300 (not a decrease)
    expect(result.biggestDecrease.name).toBe('Food');
    expect(result.biggestDecrease.diff).toBe(-500);
  });

  it('handles empty transactions', () => {
    useFixedDate(2026, 4, 15);
    const result = computeInsights([], sampleCategories, '2026-05-01', '2026-05-31');

    expect(result.totalIncome).toBe(0);
    expect(result.totalExpense).toBe(0);
    expect(result.transactionCount).toBe(0);
    expect(result.topCategory).toBeNull();
    expect(result.biggestIncrease).toBeNull();
    expect(result.biggestDecrease).toBeNull();
    expect(result.anomalies).toEqual([]);
  });

  it('returns 0 savings rate when no income', () => {
    useFixedDate(2026, 4, 15);
    const expenseOnly = sampleTransactions.filter(t => t.type !== 'income');
    const result = computeInsights(expenseOnly, sampleCategories, '2026-05-01', '2026-05-31');
    expect(result.savingsRate).toBe(0);
  });

  it('detects anomalies (transactions > 2x category avg)', () => {
    useFixedDate(2026, 4, 15);
    // Create transactions where one is much larger than others in same category
    const txWithAnomaly = [
      { id: 'tx_n1', type: 'expense', amount: 100, date: '2026-05-01', accountId: 'acc_1', categoryId: 'cat_food' },
      { id: 'tx_n2', type: 'expense', amount: 150, date: '2026-05-02', accountId: 'acc_1', categoryId: 'cat_food' },
      { id: 'tx_n3', type: 'expense', amount: 3000, date: '2026-05-03', accountId: 'acc_1', categoryId: 'cat_food' }, // Anomaly! Avg=125, this is 24x
    ];
    const result = computeInsights(txWithAnomaly, sampleCategories, '2026-05-01', '2026-05-31');
    expect(result.anomalies).toHaveLength(1);
    expect(result.anomalies[0].categoryName).toBe('Food');
    expect(result.anomalies[0].amount).toBe(3000);
    expect(result.anomalies[0].ratio).toBeGreaterThan(2);
  });
});
