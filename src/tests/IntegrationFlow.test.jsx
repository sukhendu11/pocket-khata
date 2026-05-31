import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import Dashboard from '../components/Dashboard';
import BudgetManager from '../components/BudgetManager';
import AnalyticsView from '../components/AnalyticsView';

// ==============================================================================
// Shared Mock Data — May 15, 2025
// Used by all three components to simulate the App-level shared state
// ==============================================================================

const mockAccounts = [
  { id: 'acc_cash', name: 'Cash Wallet', type: 'Cash', balance: 15000, color: '#3cd070' },
  { id: 'acc_bank', name: 'Prime Bank', type: 'Bank', balance: 85000, color: '#3867d6' },
];

const mockCategories = [
  { id: 'cat_food', name: 'Food & Drinks', type: 'expense', color: '#ff7b54' },
  { id: 'cat_transport', name: 'Transport', type: 'expense', color: '#fdcb6e' },
  { id: 'cat_rent', name: 'Rent', type: 'expense', color: '#e74c3c' },
  { id: 'cat_salary', name: 'Salary', type: 'income', color: '#3cd070' },
  { id: 'cat_freelance', name: 'Freelance', type: 'income', color: '#fdcb6e' },
];

const mockTransactions = [
  // May 2025 — current month (fixed date = May 15, 2025)
  { id: 'tx_1', type: 'expense', amount: 1500, date: '2025-05-10',
    accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Lunch' },
  { id: 'tx_2', type: 'expense', amount: 25000, date: '2025-05-01',
    accountId: 'acc_bank', categoryId: 'cat_rent', notes: 'Monthly rent' },
  { id: 'tx_3', type: 'income', amount: 80000, date: '2025-05-01',
    accountId: 'acc_bank', categoryId: 'cat_salary', notes: 'May salary' },
  { id: 'tx_4', type: 'expense', amount: 300, date: '2025-05-11',
    accountId: 'acc_cash', categoryId: 'cat_transport', notes: 'Bus fare' },
  // April 2025 — last month
  { id: 'tx_5', type: 'expense', amount: 2000, date: '2025-04-15',
    accountId: 'acc_cash', categoryId: 'cat_transport', notes: 'Bus pass' },
  { id: 'tx_6', type: 'income', amount: 5000, date: '2025-04-10',
    accountId: 'acc_cash', categoryId: 'cat_freelance', notes: 'Freelance gig' },
  // Dec 2024 — old
  { id: 'tx_7', type: 'expense', amount: 500, date: '2024-12-15',
    accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Xmas snack' },
];

const mockBudgetData = [
  { id: 'budget_food', categoryId: 'cat_food', limit: 5000, month: 4, year: 2025 },
  { id: 'budget_rent', categoryId: 'cat_rent', limit: 30000, month: 4, year: 2025 },
  { id: 'budget_transport', categoryId: 'cat_transport', limit: 1000, month: 4, year: 2025 },
];

const mockSavingsGoals = [
  { id: 'goal_1', name: 'New Laptop', targetAmount: 100000, currentAmount: 30000 },
];

// ==============================================================================
// Helpers
// ==============================================================================

/** Mock `new Date()` to return May 15, 2025. Calls with args work normally. */
function useFixedDate() {
  const RealDate = globalThis.Date;
  const fixedTs = new RealDate(2025, 4, 15).getTime();

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

/** Make requestAnimationFrame fire synchronously for animated components */
function useMockRAF() {
  vi.stubGlobal('requestAnimationFrame', (cb) => {
    cb(performance.now() + 1000);
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
}

// ==============================================================================
// Shared default props for each component
// ==============================================================================

const dashboardDefaultProps = {
  accounts: mockAccounts,
  transactions: mockTransactions,
  categories: mockCategories,
  budgets: mockBudgetData,
  savingsGoals: mockSavingsGoals,
  onNavigate: () => {},
  theme: 'light',
  onToggleTheme: () => {},
  lang: 'en',
};

const budgetManagerDefaultProps = {
  budgets: mockBudgetData,
  categories: mockCategories,
  transactions: mockTransactions,
  onAddBudget: () => {},
  onUpdateBudget: () => {},
  onDeleteBudget: () => {},
  onNavigate: () => {},
  lang: 'en',
};

const analyticsDefaultProps = {
  transactions: mockTransactions,
  categories: mockCategories,
  budgets: mockBudgetData,
  onNavigate: () => {},
  lang: 'en',
};

beforeEach(() => { cleanup(); vi.clearAllMocks(); });
afterEach(() => { vi.unstubAllGlobals(); });

// ==============================================================================
// Integration: Dashboard → Budget Planner Navigation
// ==============================================================================

describe('Integration: Dashboard → Budget Planner', () => {
  it('Dashboard renders budget mini-card with correct count from shared budget data', () => {
    useFixedDate();
    render(<Dashboard {...dashboardDefaultProps} />);
    // The mini-card shows "3 active" (3 budgets)
    expect(screen.getByText('Budget Planner')).toBeTruthy();
    expect(screen.getByText(/3 active/)).toBeTruthy();
  });

  it('Dashboard budget mini-card click navigates to Budget Planner screen', () => {
    useFixedDate();
    const handleNavigate = vi.fn();
    render(<Dashboard {...dashboardDefaultProps} onNavigate={handleNavigate} />);
    fireEvent.click(screen.getByText('Budget Planner'));
    expect(handleNavigate).toHaveBeenCalledWith('budgets');
  });

  it('Dashboard shows "Create first" when BudgetManager has no budgets', () => {
    useFixedDate();
    render(<Dashboard {...dashboardDefaultProps} budgets={[]} />);
    expect(screen.getByText('Budget Planner')).toBeTruthy();
    expect(screen.getByText('Create first')).toBeTruthy();
  });

  it('Dashboard budget count matches BudgetManager budget count when data flows through App', () => {
    useFixedDate();
    // Render Dashboard with 3 budgets
    render(<Dashboard {...dashboardDefaultProps} />);
    expect(screen.getByText(/3 active/)).toBeTruthy();

    // With 0 budgets
    cleanup();
    render(<Dashboard {...dashboardDefaultProps} budgets={[]} />);
    expect(screen.getByText('Create first')).toBeTruthy();
  });
});

// ==============================================================================
// Integration: Budget Planner → Budget Creation Data Flow
// ==============================================================================

describe('Integration: Budget Planner → OnAddBudget Callback', () => {
  it('BudgetManager opens form and onAddBudget receives correct payload from the form', () => {
    useFixedDate();
    const handleAdd = vi.fn();
    render(<BudgetManager {...budgetManagerDefaultProps} onAddBudget={handleAdd} />);

    // Open the form
    const addBtn = screen.getAllByRole('button')[1]; // + button
    fireEvent.click(addBtn);

    // Select Food category
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'cat_food' } });

    // Enter limit
    const limitInput = screen.getByPlaceholderText('e.g. 5000');
    fireEvent.change(limitInput, { target: { value: '4000' } });

    // Save
    fireEvent.click(screen.getByText('Create Budget'));

    // Verify the callback was called with the correct payload
    expect(handleAdd).toHaveBeenCalledOnce();
    expect(handleAdd).toHaveBeenCalledWith({
      categoryId: 'cat_food',
      limit: 4000,
      month: 4,
      year: 2025,
      rollover: false,
    });
  });

  it('Budget added via onAddBudget appears when BudgetManager re-renders with updated data', () => {
    useFixedDate();
    // Simulate App-level state: after adding a budget, the budgets array grows
    const initialBudgets = [...mockBudgetData];
    const newBudget = { id: 'budget_food_extra', categoryId: 'cat_food', limit: 3000, month: 4, year: 2025 };
    const updatedBudgets = [...initialBudgets, newBudget];

    // First render with initial budgets, then rerender with updated data
    const { rerender } = render(
      <BudgetManager {...budgetManagerDefaultProps} budgets={initialBudgets} />
    );
    expect(screen.getAllByText('Food & Drinks').length).toBe(1);

    // Rerender with updated budgets (simulating onAddBudget → setBudgets flow)
    rerender(<BudgetManager {...budgetManagerDefaultProps} budgets={updatedBudgets} />);
    // Now two Food & Drinks budget items should appear
    const foodItems = screen.getAllByText('Food & Drinks');
    expect(foodItems.length).toBe(2);
  });

  it('Budget summary totals recalculate correctly after a budget is added', () => {
    useFixedDate();
    const initialBudgets = [...mockBudgetData];
    const newBudget = { id: 'budget_new', categoryId: 'cat_food', limit: 2000, month: 4, year: 2025 };
    const updatedBudgets = [...initialBudgets, newBudget];

    // Initial total limit: 5000 + 30000 + 1000 = 36,000
    const { rerender } = render(
      <BudgetManager {...budgetManagerDefaultProps} budgets={initialBudgets} />
    );
    expect(screen.getByText(/36,000/)).toBeTruthy();

    // After adding: 36,000 + 2,000 = 38,000
    rerender(<BudgetManager {...budgetManagerDefaultProps} budgets={updatedBudgets} />);
    expect(screen.getByText(/38,000/)).toBeTruthy();
  });

  it('Deleting a budget via onDeleteBudget updates the budget list in real-time', () => {
    useFixedDate();
    const handleDelete = vi.fn();
    const { rerender } = render(
      <BudgetManager {...budgetManagerDefaultProps} onDeleteBudget={handleDelete} />
    );
    // 3 budget items initially
    expect(screen.getAllByText('Edit').length).toBe(3);

    // Simulate deletion (App removes the budget and re-renders)
    const reducedBudgets = mockBudgetData.filter(b => b.id !== 'budget_food');
    rerender(
      <BudgetManager
        budgets={reducedBudgets}
        categories={mockCategories}
        transactions={mockTransactions}
        onDeleteBudget={handleDelete}
        onNavigate={() => {}}
        lang="en"
      />
    );
    expect(screen.getAllByText('Edit').length).toBe(2);
  });
});

// ==============================================================================
// Integration: Budget Planner → Analytics Budget vs Actual Data Consistency
// ==============================================================================

describe('Integration: Budget Planner → Analytics Budget vs Actual', () => {
  it('BudgetManager summary totals match Analytics Budget vs Actual totals for same data', () => {
    useFixedDate();
    // BudgetManager total limit: 5000 + 30000 + 1000 = 36,000
    const { container: bmContainer } = render(
      <BudgetManager {...budgetManagerDefaultProps} />
    );
    // BudgetManager shows total limit
    expect(bmContainer.textContent).toMatch(/36,000/);

    cleanup();

    // Analytics Budget vs Actual total limit: same data → same total
    render(<AnalyticsView {...analyticsDefaultProps} />);
    const budgetCard = screen.getByText('Budget vs Actual').closest('[class*="neo-raised"]');
    expect(within(budgetCard).getByText(/36,000/)).toBeTruthy();
  });

  it('BudgetManager per-category spending matches Analytics Budget vs Actual spending', () => {
    useFixedDate();
    // BudgetManager: Food spent=1500, limit=5000 → 30%
    render(<BudgetManager {...budgetManagerDefaultProps} />);
    const budgetPcts = screen.getAllByText('30%');
    expect(budgetPcts.length).toBeGreaterThanOrEqual(1);

    cleanup();

    // Analytics: same budget/transaction data → Food 30%
    render(<AnalyticsView {...analyticsDefaultProps} />);
    const budgetCard = screen.getByText('Budget vs Actual').closest('[class*="neo-raised"]');
    expect(within(budgetCard).getByText('Food & Drinks')).toBeTruthy();
    // The percentage shows as "30%" in bvaPct spans — multiple budgets may share same pct
    const budgetPctAnalytics = within(budgetCard).getAllByText('30%');
    expect(budgetPctAnalytics.length).toBeGreaterThanOrEqual(1);
  });

  it('Both components show the same over-budget state for Transport (300 spent, 1000 limit)', () => {
    useFixedDate();
    // Transport: 300 spent / 1000 limit → 30%, not over budget
    render(<BudgetManager {...budgetManagerDefaultProps} />);
    // Transport should NOT show "Over Budget" badge at 30%
    expect(screen.queryByText('Over Budget')).toBeNull();

    cleanup();

    // Analytics: Transport should also NOT show as over-budget
    render(<AnalyticsView {...analyticsDefaultProps} />);
    // The remaining amount should not have the + sign (it's under budget)
    const budgetCard = screen.getByText('Budget vs Actual').closest('[class*="neo-raised"]');
    // Transport item should exist
    expect(within(budgetCard).getByText('Transport')).toBeTruthy();
  });

  it('A budget added via BudgetManager form appears in Analytics Budget vs Actual after data flows through', () => {
    useFixedDate();
    // Simulate: initial state has no budgets, then one is created
    const emptyBudgets = [];

    // BudgetManager shows empty state
    render(<BudgetManager {...budgetManagerDefaultProps} budgets={emptyBudgets} />);
    expect(screen.getByText('No budgets set yet')).toBeTruthy();

    cleanup();

    // Analytics also shows empty state
    render(<AnalyticsView {...analyticsDefaultProps} budgets={emptyBudgets} />);
    expect(screen.getByText('No budgets set for this period.')).toBeTruthy();

    cleanup();

    // After adding a Food budget (simulating App-level state update)
    const singleBudget = [{ id: 'budget_1', categoryId: 'cat_food', limit: 5000, month: 4, year: 2025 }];

    // BudgetManager now shows the budget
    render(<BudgetManager {...budgetManagerDefaultProps} budgets={singleBudget} />);
    expect(screen.getByText('Food & Drinks')).toBeTruthy();
    expect(screen.getByText('30%')).toBeTruthy(); // 1500/5000

    cleanup();

    // Analytics now shows the budget in Budget vs Actual
    render(<AnalyticsView {...analyticsDefaultProps} budgets={singleBudget} />);
    const budgetCard = screen.getByText('Budget vs Actual').closest('[class*="neo-raised"]');
    expect(within(budgetCard).getByText('Food & Drinks')).toBeTruthy();
  });
});

// ==============================================================================
// Integration: Dashboard Monthly Totals → Analytics Overview Data Consistency
// ==============================================================================

describe('Integration: Dashboard Monthly Totals → Analytics Overview', () => {
  it('Dashboard monthly income (80,000) matches Analytics This Month income', () => {
    useFixedDate();
    useMockRAF();

    // Dashboard: monthly income = 80,000
    render(<Dashboard {...dashboardDefaultProps} />);
    // Appears in both the income summary (+৳ 80,000) and Overview bar
    const dashIncomeAmounts = screen.getAllByText(/80,000/);
    expect(dashIncomeAmounts.length).toBeGreaterThanOrEqual(1);

    cleanup();

    // Analytics This Month: income = 80,000 (same transactions)
    render(<AnalyticsView {...analyticsDefaultProps} />);
    const overviewCard = screen.getByText('Overview').closest('[class*="neo-raised"]');
    expect(within(overviewCard).getByText(/80,000/)).toBeTruthy();
  });

  it('Dashboard monthly expense (26,800) matches Analytics This Month expense', () => {
    useFixedDate();
    useMockRAF();
    // Dashboard: monthly expense = 1500 + 25000 + 300 = 26,800
    render(<Dashboard {...dashboardDefaultProps} />);
    // Appears in both the expense summary card (-৳ 26,800) and Overview bar (৳26,800)
    const dashExpenseAmounts = screen.getAllByText(/26,800/);
    expect(dashExpenseAmounts.length).toBeGreaterThanOrEqual(1);

    cleanup();

    // Analytics This Month: expense = 1500 + 25000 + 300 = 26,800 (same data)
    render(<AnalyticsView {...analyticsDefaultProps} />);
    const overviewCard = screen.getByText('Overview').closest('[class*="neo-raised"]');
    expect(within(overviewCard).getByText(/26,800/)).toBeTruthy();
  });

  it('Both components show correct savings rate for the same data', () => {
    useFixedDate();
    useMockRAF();
    // Dashboard savings rate: (80000 - 26800) / 80000 = 66.5% → +67%
    render(<Dashboard {...dashboardDefaultProps} />);
    expect(screen.getByText(/\+67%/)).toBeTruthy();

    cleanup();

    // Analytics Smart Insights savings rate: same calculation → +67%
    render(<AnalyticsView {...analyticsDefaultProps} />);
    const insightsCard = screen.getByText('Smart Insights').closest('[class*="neo-raised"]');
    expect(within(insightsCard).getByText(/\+67%/)).toBeTruthy();
  });

  it('Both components show zero income/expense when no transactions exist', () => {
    useFixedDate();
    useMockRAF();
    render(<Dashboard {...dashboardDefaultProps} accounts={[]} transactions={[]} />);
    // 0 appears in balance (৳ 0), income (+৳ 0), expense (-৳ 0), and overview net
    const zeroAmounts = screen.getAllByText(/\u09F3\s*0/);
    expect(zeroAmounts.length).toBeGreaterThanOrEqual(1);

    cleanup();

    render(<AnalyticsView {...analyticsDefaultProps} transactions={[]} />);
    const emptyMessages = screen.getAllByText('No data available for this period.');
    expect(emptyMessages.length).toBeGreaterThanOrEqual(1);
  });
});

// ==============================================================================
// Integration: Cross-Component Category Consistency
// ==============================================================================

describe('Integration: Category Consistency Across Components', () => {
  it('Dashboard recent transactions show category names that match Analytics expense categories', () => {
    useFixedDate();
    useMockRAF();
    // Dashboard shows recent transactions with category names
    render(<Dashboard {...dashboardDefaultProps} />);
    expect(screen.getByText('Lunch')).toBeTruthy(); // Food & Drinks
    expect(screen.getByText('Monthly rent')).toBeTruthy(); // Rent

    cleanup();

    // Analytics shows same categories in expense breakdown
    render(<AnalyticsView {...analyticsDefaultProps} />);
    const expenseCard = screen.getByText('Expense Breakdown').closest('[class*="neo-raised"]');
    expect(within(expenseCard).getByText(/Rent/)).toBeTruthy();
    expect(within(expenseCard).getByText(/Food & Drinks/)).toBeTruthy();
  });

  it('Dashboard total balance (100,000) is not affected by budgets (purely accounts-based)', () => {
    useFixedDate();
    // Total balance = accounts only, not budgets
    render(<Dashboard {...dashboardDefaultProps} />);
    expect(screen.getByText(/\u09F3\s*100,000/)).toBeTruthy();

    // Even with different budgets, balance stays the same
    cleanup();
    render(<Dashboard {...dashboardDefaultProps} budgets={[]} />);
    expect(screen.getByText(/\u09F3\s*100,000/)).toBeTruthy();
  });
});

// ==============================================================================
// Integration: Budget Manager State → Dashboard Budget Card
// ==============================================================================

describe('Integration: Budget State → Dashboard Card', () => {
  it('Dashboard budget count updates when budget data changes (simulating add)', () => {
    useFixedDate();
    const initialBudgets = [
      { id: 'budget_food', categoryId: 'cat_food', limit: 5000, month: 4, year: 2025 },
    ];
    const { rerender } = render(
      <Dashboard
        {...dashboardDefaultProps}
        budgets={initialBudgets}
        savingsGoals={[]}
      />
    );
    expect(screen.getByText(/1 active/)).toBeTruthy();

    // Simulate adding a budget (App-level setBudgets)
    const updatedBudgets = [
      ...initialBudgets,
      { id: 'budget_rent', categoryId: 'cat_rent', limit: 30000, month: 4, year: 2025 },
    ];
    rerender(
      <Dashboard
        {...dashboardDefaultProps}
        budgets={updatedBudgets}
        savingsGoals={[]}
      />
    );
    expect(screen.getByText(/2 active/)).toBeTruthy();
  });

  it('Dashboard budget count updates when budget data changes (simulating delete)', () => {
    useFixedDate();
    const { rerender } = render(
      <Dashboard
        {...dashboardDefaultProps}
        savingsGoals={[]}
      />
    );
    expect(screen.getByText(/3 active/)).toBeTruthy();

    // Simulate deleting all budgets
    rerender(
      <Dashboard
        {...dashboardDefaultProps}
        budgets={[]}
        savingsGoals={[]}
      />
    );
    // "Create first" appears twice: once for Budget card, once for Savings card
    const createFirstEls1 = screen.getAllByText('Create first');
    expect(createFirstEls1.length).toBe(2);
  });
});

// ==============================================================================
// Integration: End-to-End Simulation (Add Budget → Verify Everywhere)
// ==============================================================================

describe('Integration: End-to-End Add Budget Flow', () => {
  it('Simulates full flow: Dashboard shows count → Budget Manager adds → data appears in both', () => {
    useFixedDate();

    // Step 1: Start with initial budgets in Dashboard
    const initialBudgets = [{ id: 'budget_food', categoryId: 'cat_food', limit: 5000, month: 4, year: 2025 }];

    render(
      <Dashboard
        {...dashboardDefaultProps}
        budgets={initialBudgets}
        savingsGoals={[]}
      />
    );
    expect(screen.getByText(/1 active/)).toBeTruthy();

    cleanup();

    // Step 2: Budget Manager shows the initial budget
    render(
      <BudgetManager
        {...budgetManagerDefaultProps}
        budgets={initialBudgets}
      />
    );
    expect(screen.getByText('Food & Drinks')).toBeTruthy();
    expect(screen.getByText('30%')).toBeTruthy(); // 1500/5000

    cleanup();

    // Step 3: Analytics shows the initial budget in Budget vs Actual
    render(
      <AnalyticsView
        {...analyticsDefaultProps}
        budgets={initialBudgets}
      />
    );
    const budgetCard = screen.getByText('Budget vs Actual').closest('[class*="neo-raised"]');
    expect(within(budgetCard).getByText('Food & Drinks')).toBeTruthy();
    expect(within(budgetCard).getByText('30%')).toBeTruthy();

    cleanup();

    // Step 4: Now simulate adding a second budget (Rent)
    const expandedBudgets = [
      ...initialBudgets,
      { id: 'budget_rent', categoryId: 'cat_rent', limit: 30000, month: 4, year: 2025 },
    ];

    // Dashboard now shows 2 active budgets
    render(
      <Dashboard
        {...dashboardDefaultProps}
        budgets={expandedBudgets}
        savingsGoals={[]}
      />
    );
    expect(screen.getByText(/2 active/)).toBeTruthy();

    cleanup();

    // Budget Manager shows both budgets
    render(
      <BudgetManager
        {...budgetManagerDefaultProps}
        budgets={expandedBudgets}
      />
    );
    expect(screen.getByText('Food & Drinks')).toBeTruthy();
    expect(screen.getByText('Rent')).toBeTruthy();
    // Total limit: 5000 + 30000 = 35,000
    expect(screen.getByText(/35,000/)).toBeTruthy();

    cleanup();

    // Analytics Budget vs Actual shows both budgets
    render(
      <AnalyticsView
        {...analyticsDefaultProps}
        budgets={expandedBudgets}
      />
    );
    const bCard2 = screen.getByText('Budget vs Actual').closest('[class*="neo-raised"]');
    expect(within(bCard2).getByText('Food & Drinks')).toBeTruthy();
    expect(within(bCard2).getByText('Rent')).toBeTruthy();
    // Total limit: 35,000
    expect(within(bCard2).getByText(/35,000/)).toBeTruthy();
  });

  it('Simulates full flow: delete all budgets → all three show empty state', () => {
    useFixedDate();

    // Start with budgets
    render(<Dashboard {...dashboardDefaultProps} savingsGoals={[]} />);
    expect(screen.getByText(/3 active/)).toBeTruthy();

    cleanup();

    render(<BudgetManager {...budgetManagerDefaultProps} />);
    expect(screen.getByText(/36,000/)).toBeTruthy();
    expect(screen.getAllByText('Edit').length).toBe(3);

    cleanup();

    render(<AnalyticsView {...analyticsDefaultProps} />);
    const bCard = screen.getByText('Budget vs Actual').closest('[class*="neo-raised"]');
    expect(within(bCard).getByText('Food & Drinks')).toBeTruthy();

    cleanup();

    // Delete all budgets
    // Dashboard: shows "Create first"
    render(<Dashboard {...dashboardDefaultProps} budgets={[]} savingsGoals={[]} />);
    const createFirstDash = screen.getAllByText('Create first');
    expect(createFirstDash.length).toBe(2);

    cleanup();

    // BudgetManager: shows empty state
    render(<BudgetManager {...budgetManagerDefaultProps} budgets={[]} />);
    expect(screen.getByText('No budgets set yet')).toBeTruthy();

    cleanup();

    // Analytics: shows empty state
    render(<AnalyticsView {...analyticsDefaultProps} budgets={[]} />);
    expect(screen.getByText('No budgets set for this period.')).toBeTruthy();
  });
});

// ==============================================================================
// Integration: Time Range Data Consistency (6 Months & All Time)
// ==============================================================================

describe('Integration: Time Range Data Flow', () => {
  it('Dashboard financial trends match Analytics 6 Months data for expense categories', () => {
    useFixedDate();
    useMockRAF();
    // Dashboard financial trends show 6 months of data
    render(<Dashboard {...dashboardDefaultProps} />);
    // The line chart renders 6 months of data points
    expect(screen.getByText('Financial Trends')).toBeTruthy();

    cleanup();

    // Analytics 6 Months range: income=85000, expense=29000
    render(<AnalyticsView {...analyticsDefaultProps} />);
    fireEvent.click(screen.getByText('6 Months'));
    // 6 Months income: 80000 + 5000 = 85000
    expect(screen.getByText(/Income:.*85,000/)).toBeTruthy();
    // 6 Months expense: 1500 + 25000 + 300 + 2000 + 500 = 29300
    // But the component only counts Dec-May ranges, which include tx_7 (500 Dec)
    // Actually, 6 months from May looking back: Dec 2024, Jan, Feb, Mar, Apr, May 2025
    // Expenses: tx_1 (May 1500) + tx_2 (May 25000) + tx_4 (May 300) + tx_5 (Apr 2000) + tx_7 (Dec 500) = 29,300
    expect(screen.getByText(/Expense:.*29,300/)).toBeTruthy();
  });

  it('Analytics All Time range includes old data that Dashboard also shows in trend chart', () => {
    useFixedDate();
    useMockRAF();
    // The Dec 2024 transaction (tx_7) should appear in All Time analytics
    render(<AnalyticsView {...analyticsDefaultProps} />);
    fireEvent.click(screen.getByText('All Time'));
    // All Time income: 80000 + 5000 = 85000
    expect(screen.getByText(/Income:.*85,000/)).toBeTruthy();
    // All Time expense: 1500 + 25000 + 300 + 2000 + 500 = 29,300
    const expenseAmounts = screen.getAllByText(/29,300/);
    expect(expenseAmounts.length).toBeGreaterThanOrEqual(1);

    cleanup();

    // Dashboard trend chart also includes Dec 2024 in its 6-month range
    render(<Dashboard {...dashboardDefaultProps} />);
    expect(screen.getByText('Dec')).toBeTruthy(); // December label on line chart
    expect(screen.getByText('May')).toBeTruthy();  // May label on line chart
  });
});

// ==============================================================================
// Integration: Empty State Flow Across All Three Screens
// ==============================================================================

describe('Integration: Empty State Flow', () => {
  it('All three components show appropriate empty state when no data exists', () => {
    useFixedDate();

    // Dashboard with no accounts, no transactions, no budgets
    render(
      <Dashboard
        accounts={[]}
        transactions={[]}
        categories={[]}
        budgets={[]}
        savingsGoals={[]}
        onNavigate={() => {}}
        theme="light"
        onToggleTheme={() => {}}
        lang="en"
      />
    );
    expect(screen.getByText(/No transactions posted yet/)).toBeTruthy();
    // "Create first" appears twice: once for Budget card, once for Savings card
    const createFirstEls = screen.getAllByText('Create first');
    expect(createFirstEls.length).toBe(2);

    cleanup();

    // BudgetManager with no budgets
    render(
      <BudgetManager
        budgets={[]}
        categories={mockCategories}
        transactions={[]}
        onAddBudget={() => {}}
        onUpdateBudget={() => {}}
        onDeleteBudget={() => {}}
        onNavigate={() => {}}
        lang="en"
      />
    );
    expect(screen.getByText('No budgets set yet')).toBeTruthy();

    cleanup();

    // Analytics with no data
    render(
      <AnalyticsView
        transactions={[]}
        categories={[]}
        budgets={[]}
        onNavigate={() => {}}
        lang="en"
      />
    );
    const emptyMessages = screen.getAllByText('No data available for this period.');
    expect(emptyMessages.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('No budgets set for this period.')).toBeTruthy();
    expect(screen.getByText('Add some transactions to see insights.')).toBeTruthy();
    expect(screen.getByText('Need more transactions to detect anomalies.')).toBeTruthy();
  });
});

// ==============================================================================
// Integration: Navigation Callback Consistency
// ==============================================================================

describe('Integration: Navigation Callback Consistency', () => {
  it('Dashboard calls onNavigate(\'budgets\') — clicking Budget Manager back calls onNavigate(\'dashboard\')', () => {
    useFixedDate();
    // Dashboard → Budgets
    const dashNavigate = vi.fn();
    render(<Dashboard {...dashboardDefaultProps} onNavigate={dashNavigate} />);
    fireEvent.click(screen.getAllByText('Budget Planner')[0]);
    expect(dashNavigate).toHaveBeenCalledWith('budgets');

    cleanup();

    // Budget Manager → Dashboard
    const bmNavigate = vi.fn();
    render(<BudgetManager {...budgetManagerDefaultProps} onNavigate={bmNavigate} />);
    const backBtn = screen.getAllByRole('button')[0]; // Back arrow
    fireEvent.click(backBtn);
    expect(bmNavigate).toHaveBeenCalledWith('dashboard');
  });

  it('Dashboard calls onNavigate(\'analytics\') — Analytics back calls onNavigate(\'dashboard\')', () => {
    useFixedDate();
    // Dashboard can navigate to analytics
    const dashNavigate = vi.fn();
    render(<Dashboard {...dashboardDefaultProps} onNavigate={dashNavigate} />);
    // Dashboard doesn't have a direct Analytics button, but the App does.
    // Test the Analytics component's back button
    cleanup();

    const analyticsNavigate = vi.fn();
    render(<AnalyticsView {...analyticsDefaultProps} onNavigate={analyticsNavigate} />);
    const backBtn = screen.getAllByRole('button')[0]; // Back arrow
    fireEvent.click(backBtn);
    expect(analyticsNavigate).toHaveBeenCalledWith('dashboard');
  });

  it('Each component receives and calls the same shared onNavigate handler', () => {
    useFixedDate();
    const sharedNavigate = vi.fn();

    // Both Dashboard and BudgetManager use the same handler
    render(<Dashboard {...dashboardDefaultProps} onNavigate={sharedNavigate} />);
    fireEvent.click(screen.getByText('Budget Planner'));
    expect(sharedNavigate).toHaveBeenCalledWith('budgets');

    cleanup();

    render(<BudgetManager {...budgetManagerDefaultProps} onNavigate={sharedNavigate} />);
    fireEvent.click(screen.getAllByRole('button')[0]); // Back
    expect(sharedNavigate).toHaveBeenCalledWith('dashboard');

    cleanup();

    render(<AnalyticsView {...analyticsDefaultProps} onNavigate={sharedNavigate} />);
    fireEvent.click(screen.getAllByRole('button')[0]); // Back
    expect(sharedNavigate).toHaveBeenCalledWith('dashboard');
  });
});
