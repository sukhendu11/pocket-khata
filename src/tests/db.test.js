import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';

beforeEach(() => {
  localStorage.clear();
});

describe('db accounts', () => {
  it('returns default accounts on first call', () => {
    const accounts = db.getAccounts();
    expect(accounts).toHaveLength(4);
    expect(accounts[0].name).toBe('Cash');
  });

  it('adds a new account', () => {
    const account = db.addAccount({ name: 'Test', type: 'Cash', balance: 1000 });
    expect(account.id).toBeDefined();
    expect(account.name).toBe('Test');
    expect(account.balance).toBe(1000);

    const accounts = db.getAccounts();
    expect(accounts).toHaveLength(5);
  });

  it('deletes an account', () => {
    const accounts = db.getAccounts();
    const id = accounts[0].id;
    db.deleteAccount(id);
    expect(db.getAccounts()).toHaveLength(3);
  });
});

describe('db budgets', () => {
  it('starts with empty budgets', () => {
    expect(db.getBudgets()).toEqual([]);
  });

  it('adds a budget', () => {
    const budget = db.addBudget({ categoryId: 'cat_food', limit: 5000, month: 4, year: 2026 });
    expect(budget.id).toBeDefined();
    expect(budget.limit).toBe(5000);

    const budgets = db.getBudgets();
    expect(budgets).toHaveLength(1);
  });

  it('updates a budget', () => {
    const budget = db.addBudget({ categoryId: 'cat_food', limit: 5000, month: 4, year: 2026 });
    db.updateBudget({ ...budget, limit: 6000 });
    const budgets = db.getBudgets();
    expect(budgets).toHaveLength(1);
    expect(budgets[0].limit).toBe(6000);
  });

  it('deletes a budget', () => {
    db.addBudget({ categoryId: 'cat_food', limit: 5000, month: 4, year: 2026 });
    const budgets = db.getBudgets();
    db.deleteBudget(budgets[0].id);
    expect(db.getBudgets()).toHaveLength(0);
  });

  it('calculates spending for a category in a given month', () => {
    // Seed data includes a default cat_food expense of 450 which may fall in current month
    // Use a unique month to avoid seed data overlap (e.g., month 0 = January with transactions from a past year)
    db.addTransaction({
      type: 'expense', amount: 1000, date: '2025-01-10',
      accountId: 'acc_cash', categoryId: 'cat_food', notes: 'test',
    });
    db.addTransaction({
      type: 'expense', amount: 500, date: '2025-01-15',
      accountId: 'acc_cash', categoryId: 'cat_food', notes: 'test',
    });

    // January 2025 spending should be 1500
    const spending = db.getBudgetSpending('cat_food', 0, 2025);
    expect(spending).toBe(1500);
  });
});

describe('db savings goals', () => {
  it('starts with empty goals', () => {
    expect(db.getSavingsGoals()).toEqual([]);
  });

  it('adds a savings goal', () => {
    const goal = db.addSavingsGoal({ name: 'New Laptop', targetAmount: 50000, currentAmount: 0 });
    expect(goal.id).toBeDefined();
    expect(goal.name).toBe('New Laptop');
    expect(goal.targetAmount).toBe(50000);

    const goals = db.getSavingsGoals();
    expect(goals).toHaveLength(1);
  });

  it('updates a savings goal', () => {
    const goal = db.addSavingsGoal({ name: 'New Laptop', targetAmount: 50000 });
    db.updateSavingsGoal({ ...goal, targetAmount: 55000 });
    expect(db.getSavingsGoals()[0].targetAmount).toBe(55000);
  });

  it('deletes a savings goal', () => {
    db.addSavingsGoal({ name: 'New Laptop', targetAmount: 50000 });
    const goals = db.getSavingsGoals();
    db.deleteSavingsGoal(goals[0].id);
    expect(db.getSavingsGoals()).toHaveLength(0);
  });

  it('contributes to a savings goal, updates amount and creates transaction', () => {
    const goal = db.addSavingsGoal({ name: 'New Laptop', targetAmount: 50000, currentAmount: 0 });
    const acc = db.getAccounts()[0];

    const tx = db.contributeToSavingsGoal(goal.id, 5000, acc.id);

    // Goal amount should be updated
    const goals = db.getSavingsGoals();
    expect(goals[0].currentAmount).toBe(5000);

    // A transaction should have been created
    expect(tx).toBeDefined();
    expect(tx.amount).toBe(5000);
    expect(tx.notes).toContain('New Laptop');
  });
});

describe('db export/import', () => {
  it('exports and imports budgets and savings goals correctly', () => {
    db.addBudget({ categoryId: 'cat_food', limit: 5000, month: 4, year: 2026 });
    db.addSavingsGoal({ name: 'Vacation', targetAmount: 100000, currentAmount: 0 });

    const jsonStr = db.exportDatabaseJSON();
    const data = JSON.parse(jsonStr);
    expect(data.budgets).toHaveLength(1);
    expect(data.savingsGoals).toHaveLength(1);
    expect(data.accounts).toHaveLength(4);

    // Reset and re-import
    localStorage.clear();
    const success = db.importDatabaseJSON(jsonStr);
    expect(success).toBe(true);
    expect(db.getBudgets()).toHaveLength(1);
    expect(db.getSavingsGoals()).toHaveLength(1);
  });

  it('handles invalid JSON gracefully', () => {
    const result = db.importDatabaseJSON('not valid json');
    expect(result).toBe(false);
  });
});
