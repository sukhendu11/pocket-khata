import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import AnalyticsView from '../components/AnalyticsView';

// ==============================================================================
// Mock Data — May 15, 2025
// ==============================================================================

const mockCategories = [
  { id: 'cat_salary', name: 'Salary', type: 'income', color: '#3cd070' },
  { id: 'cat_freelance', name: 'Freelance', type: 'income', color: '#fdcb6e' },
  { id: 'cat_food', name: 'Food & Drinks', type: 'expense', color: '#ff7b54' },
  { id: 'cat_rent', name: 'Rent', type: 'expense', color: '#e74c3c' },
  { id: 'cat_transport', name: 'Transport', type: 'expense', color: '#8e44ad' },
];

const mockTransactions = [
  // May 2025 — current month (with mock date = May 15, 2025)
  { id: 'tx_1', type: 'expense', amount: 1500, date: '2025-05-10',
    accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Lunch' },
  { id: 'tx_2', type: 'expense', amount: 25000, date: '2025-05-01',
    accountId: 'acc_bank', categoryId: 'cat_rent', notes: 'Monthly rent' },
  { id: 'tx_3', type: 'income', amount: 80000, date: '2025-05-01',
    accountId: 'acc_bank', categoryId: 'cat_salary', notes: 'May salary' },

  // April 2025 — last month
  { id: 'tx_4', type: 'expense', amount: 2000, date: '2025-04-15',
    accountId: 'acc_cash', categoryId: 'cat_transport', notes: 'Bus pass' },
  { id: 'tx_5', type: 'income', amount: 5000, date: '2025-04-10',
    accountId: 'acc_cash', categoryId: 'cat_freelance', notes: 'Freelance gig' },

  // Dec 2024 — old (included in 6 months / all time)
  { id: 'tx_6', type: 'expense', amount: 500, date: '2024-12-15',
    accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Xmas snack' },
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

/**
 * Make requestAnimationFrame fire synchronously with a timestamp far enough
 * in the future so the component's 600ms animation completes in one frame.
 */
function useMockRAF() {
  vi.stubGlobal('requestAnimationFrame', (cb) => {
    cb(performance.now() + 1000);
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
}

const defaultProps = {
  transactions: mockTransactions,
  categories: mockCategories,
  onNavigate: () => {},
  lang: 'en',
};

beforeEach(() => { cleanup(); vi.clearAllMocks(); });
afterEach(() => { vi.unstubAllGlobals(); });

// ==============================================================================
// Rendering
// ==============================================================================

describe('AnalyticsView — Rendering', () => {
  it('renders without crashing', () => {
    render(<AnalyticsView {...defaultProps} />);
    expect(screen.getByText('Analytics')).toBeTruthy();
  });

  it('shows the back button', () => {
    render(<AnalyticsView {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(4); // back + 4 range buttons
  });

  it('shows all 4 range selector buttons', () => {
    render(<AnalyticsView {...defaultProps} />);
    // Text also appears in Budget vs Actual range label span — use getAllByText
    const thisMonthEls = screen.getAllByText('This Month');
    expect(thisMonthEls.length).toBe(2); // button + range label span
    expect(screen.getByText('Last Month')).toBeTruthy();
    expect(screen.getByText('6 Months')).toBeTruthy();
    expect(screen.getAllByText('All Time').length).toBe(1); // only the button (not default)
  });

  it('shows all 3 chart section headers', () => {
    render(<AnalyticsView {...defaultProps} />);
    expect(screen.getByText('Overview')).toBeTruthy();
    expect(screen.getByText('Income Breakdown')).toBeTruthy();
    expect(screen.getByText('Expense Breakdown')).toBeTruthy();
  });
});

// ==============================================================================
// Time Range Selector
// ==============================================================================

describe('AnalyticsView — Time Range Selector', () => {
  it('defaults to This Month', () => {
    useFixedDate();
    render(<AnalyticsView {...defaultProps} />);
    // This Month should show income label with correct May amount
    expect(screen.getByText(/Income:.*80,000/)).toBeTruthy();
  });

  it('switches to Last Month and shows April data', () => {
    useFixedDate();
    render(<AnalyticsView {...defaultProps} />);
    fireEvent.click(screen.getByText('Last Month'));
    // Last month (April): income=5000, expense=2000
    expect(screen.getByText(/Income:.*5,000/)).toBeTruthy();
    expect(screen.getByText(/Expense:.*2,000/)).toBeTruthy();
  });

  it('switches to 6 Months and shows combined data', () => {
    useFixedDate();
    render(<AnalyticsView {...defaultProps} />);
    fireEvent.click(screen.getByText('6 Months'));
    // 6 months (Dec-May): income=85000, expense=29000 (1500+25000+2000+500)
    expect(screen.getByText(/Income:.*85,000/)).toBeTruthy();
    expect(screen.getByText(/Expense:.*29,000/)).toBeTruthy();
  });

  it('switches to All Time and shows all data', () => {
    useFixedDate();
    render(<AnalyticsView {...defaultProps} />);
    fireEvent.click(screen.getByText('All Time'));
    // All time: income=85000, expense=29000 (1500+25000+2000+500)
    expect(screen.getByText(/Income:.*85,000/)).toBeTruthy();
    expect(screen.getByText(/Expense:.*29,000/)).toBeTruthy();
  });

  it('switching range resets active chart selections', () => {
    useFixedDate();
    useMockRAF();
    render(<AnalyticsView {...defaultProps} />);

    // Get the Overview SVG segments
    const overviewCard = screen.getByText('Overview').closest('[class*="neo-raised"]');
    const paths = overviewCard.querySelectorAll('path.svg-pie-segment');

    // Click the first path (income slice) to select it
    fireEvent.click(paths[0]);
    // The detail view shows the selected amount — scope to Overview card
    const amounts = within(overviewCard).getAllByText(/৳80,000/);
    expect(amounts.length).toBeGreaterThanOrEqual(1);

    // Switch to Last Month - should reset selection back to legend view
    fireEvent.click(screen.getByText('Last Month'));
    // Legend view should show, not detail view
    expect(screen.getByText(/Income:.*5,000/)).toBeTruthy();
  });
});

// ==============================================================================
// Overview Chart
// ==============================================================================

describe('AnalyticsView — Overview Chart', () => {
  it('shows income and expense legend for This Month', () => {
    useFixedDate();
    render(<AnalyticsView {...defaultProps} />);
    // This Month: income=80,000, expense=26,500
    expect(screen.getByText(/Income:.*80,000/)).toBeTruthy();
    expect(screen.getByText(/Expense:.*26,500/)).toBeTruthy();
  });

  it('shows overview legend for All Time', () => {
    useFixedDate();
    render(<AnalyticsView {...defaultProps} />);
    fireEvent.click(screen.getByText('All Time'));
    // All Time: income=85,000, expense=29,000 (1500+25000+2000+500)
    expect(screen.getByText(/Income:.*85,000/)).toBeTruthy();
    expect(screen.getByText(/Expense:.*29,000/)).toBeTruthy();
  });

  it('shows empty state when no transactions exist', () => {
    render(<AnalyticsView {...defaultProps} transactions={[]} />);
    // All 3 charts show empty state — use getAllByText
    const emptyMessages = screen.getAllByText('No data available for this period.');
    expect(emptyMessages.length).toBeGreaterThanOrEqual(1);
  });

  it('clicking an overview slice shows detail view', () => {
    useFixedDate();
    useMockRAF();
    render(<AnalyticsView {...defaultProps} />);

    // Get the Overview chart's SVG segments
    const overviewCard = screen.getByText('Overview').closest('[class*="neo-raised"]');
    const paths = overviewCard.querySelectorAll('path.svg-pie-segment');

    // Click income slice (first path in Overview = Total Income)
    fireEvent.click(paths[0]);
    // Should show detail: amount and name with percentage — scope to Overview card
    const amounts = within(overviewCard).getAllByText(/৳80,000/);
    expect(amounts.length).toBeGreaterThanOrEqual(1);
    expect(within(overviewCard).getByText(/Total Income/)).toBeTruthy();
  });

  it('clicking the same slice again deselects it', () => {
    useFixedDate();
    useMockRAF();
    render(<AnalyticsView {...defaultProps} />);

    const overviewCard = screen.getByText('Overview').closest('[class*="neo-raised"]');
    const paths = overviewCard.querySelectorAll('path.svg-pie-segment');

    // Select
    fireEvent.click(paths[0]);
    expect(within(overviewCard).getByText(/Total Income/)).toBeTruthy();

    // Click same slice again to deselect
    fireEvent.click(paths[0]);
    // Should go back to legend view
    expect(within(overviewCard).getByText(/Income:.*80,000/)).toBeTruthy();
  });
});

// ==============================================================================
// Income Breakdown
// ==============================================================================

describe('AnalyticsView — Income Breakdown', () => {
  it('shows top income categories for This Month', () => {
    useFixedDate();
    render(<AnalyticsView {...defaultProps} />);
    // This Month income: Salary 80k (100%)
    // Legend renders "Salary (100%)" in one span — scope to income card
    const incomeCard = screen.getByText('Income Breakdown').closest('[class*="neo-raised"]');
    expect(within(incomeCard).getByText(/Salary/)).toBeTruthy();
    expect(within(incomeCard).getByText(/100%/)).toBeTruthy();
  });

  it('shows income breakdown for All Time with 2 categories', () => {
    useFixedDate();
    render(<AnalyticsView {...defaultProps} />);
    fireEvent.click(screen.getByText('All Time'));
    // All Time income: Salary 80k (94%), Freelance 5k (6%)
    // Legend renders "Salary (94%)" and "Freelance (6%)" in one span each
    // Note: /6%/ would also match "86%" from Expense — use getAllByText
    expect(screen.getByText(/Salary/)).toBeTruthy();
    expect(screen.getByText(/Freelance/)).toBeTruthy();
    expect(screen.getByText(/94%/)).toBeTruthy();
    const sixPctElements = screen.getAllByText(/6%/);
    expect(sixPctElements.length).toBeGreaterThanOrEqual(1);
  });

  it('clicking income slice shows detail with amount and name', () => {
    useFixedDate();
    useMockRAF();
    render(<AnalyticsView {...defaultProps} />);

    // Income chart has 1 slice (Salary) — scope to income card
    const incomeCard = screen.getByText('Income Breakdown').closest('[class*="neo-raised"]');
    const paths = incomeCard.querySelectorAll('path.svg-pie-segment');

    // Click the Salary slice
    fireEvent.click(paths[0]);
    const amounts = screen.getAllByText(/৳80,000/);
    expect(amounts.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Salary.*100%/)).toBeTruthy();
  });
});

// ==============================================================================
// Expense Breakdown
// ==============================================================================

describe('AnalyticsView — Expense Breakdown', () => {
  it('shows top expense categories for This Month', () => {
    useFixedDate();
    render(<AnalyticsView {...defaultProps} />);
    // This Month expense: Rent 25k (94%), Food 1.5k (6%)
    // Legend renders "Rent (94%)" and "Food & Drinks (6%)" in one span each
    // Scope to expense card to avoid collisions with Insights section
    const expenseCard = screen.getByText('Expense Breakdown').closest('[class*="neo-raised"]');
    expect(within(expenseCard).getByText(/Rent/)).toBeTruthy();
    expect(within(expenseCard).getByText(/Food & Drinks/)).toBeTruthy();
    expect(within(expenseCard).getByText(/94%/)).toBeTruthy();
    expect(within(expenseCard).getByText(/6%/)).toBeTruthy();
  });

  it('shows expense breakdown with multiple categories for All Time', () => {
    useFixedDate();
    render(<AnalyticsView {...defaultProps} />);
    fireEvent.click(screen.getByText('All Time'));
    // All Time expense: Rent 25k (87%), Food 2k (7%), Transport 2k (7%)
    // Top 3 shown in legend as "Rent (87%)", "Food & Drinks (7%)", "Transport (7%)"
    // Scope to expense card to avoid collisions
    const expenseCard = screen.getByText('Expense Breakdown').closest('[class*="neo-raised"]');
    expect(within(expenseCard).getByText(/Rent/)).toBeTruthy();
    expect(within(expenseCard).getByText(/Food & Drinks/)).toBeTruthy();
    expect(within(expenseCard).getByText(/Transport/)).toBeTruthy();
  });

  it('clicking expense slice shows detail with amount and name', () => {
    useFixedDate();
    useMockRAF();
    render(<AnalyticsView {...defaultProps} />);

    // Expense chart has 2 slices: Rent, Food
    const expenseCard = screen.getByText('Expense Breakdown').closest('[class*="neo-raised"]');
    const paths = expenseCard.querySelectorAll('path.svg-pie-segment');

    // Click Rent slice (first expense path)
    fireEvent.click(paths[0]);
    expect(within(expenseCard).getByText(/৳25,000/)).toBeTruthy();
    expect(within(expenseCard).getByText(/Rent.*94%/)).toBeTruthy();
  });

  it('clicking different expense slices switches detail', () => {
    useFixedDate();
    useMockRAF();
    render(<AnalyticsView {...defaultProps} />);

    const expenseCard = screen.getByText('Expense Breakdown').closest('[class*="neo-raised"]');
    const paths = expenseCard.querySelectorAll('path.svg-pie-segment');

    // Click Rent (first)
    fireEvent.click(paths[0]);
    expect(within(expenseCard).getByText(/Rent.*94%/)).toBeTruthy();

    // Click Food (second) - should switch to Food
    fireEvent.click(paths[1]);
    expect(within(expenseCard).getByText(/Food & Drinks.*6%/)).toBeTruthy();
  });
});

// ==============================================================================
// Navigation
// ==============================================================================

describe('AnalyticsView — Navigation', () => {
  it('back button calls onNavigate("dashboard")', () => {
    const handleNavigate = vi.fn();
    render(<AnalyticsView {...defaultProps} onNavigate={handleNavigate} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]); // Back button
    expect(handleNavigate).toHaveBeenCalledWith('dashboard');
  });
});

// ==============================================================================
// Bangla Mode
// ==============================================================================

describe('AnalyticsView — Bangla Mode', () => {
  it('renders title in Bangla', () => {
    render(<AnalyticsView {...defaultProps} lang="bn" />);
    expect(screen.getByText('বিশ্লেষণ')).toBeTruthy();
  });

  it('shows range labels in Bangla', () => {
    render(<AnalyticsView {...defaultProps} lang="bn" />);
    // Text also appears in Budget vs Actual range label span — use getAllByText
    const thisMonthEls = screen.getAllByText('এই মাস');
    expect(thisMonthEls.length).toBe(2); // button + range label span
    expect(screen.getByText('গত মাস')).toBeTruthy();
    expect(screen.getByText('৬ মাস')).toBeTruthy();
    expect(screen.getAllByText('সব সময়').length).toBe(1); // only the button (not default)
  });

  it('shows chart section headers in Bangla', () => {
    render(<AnalyticsView {...defaultProps} lang="bn" />);
    expect(screen.getByText('সামগ্রিক')).toBeTruthy();
    expect(screen.getByText('আয় বিশ্লেষণ')).toBeTruthy();
    expect(screen.getByText('ব্যয় বিশ্লেষণ')).toBeTruthy();
  });

  it('shows overview legend labels in Bangla', () => {
    useFixedDate();
    render(<AnalyticsView {...defaultProps} lang="bn" />);
    expect(screen.getByText(/আয়:.*৮০,০০০/)).toBeTruthy();
    expect(screen.getByText(/ব্যয়:.*২৬,৫০০/)).toBeTruthy();
  });

  it('shows empty state in Bangla', () => {
    render(<AnalyticsView {...defaultProps} lang="bn" transactions={[]} />);
    const emptyMessages = screen.getAllByText('এই সময়ের জন্য কোনো ডাটা পাওয়া যায়নি।');
    expect(emptyMessages.length).toBeGreaterThanOrEqual(1);
  });
});

// ==============================================================================
// Edge Cases
// ==============================================================================

describe('AnalyticsView — Edge Cases', () => {
  it('handles empty transactions', () => {
    render(<AnalyticsView {...defaultProps} transactions={[]} />);
    expect(screen.getByText('Analytics')).toBeTruthy();
    // All 3 charts should show empty state
    const emptyMessages = screen.getAllByText('No data available for this period.');
    expect(emptyMessages.length).toBe(3); // One per chart
  });

  it('handles empty categories', () => {
    useFixedDate();
    render(<AnalyticsView {...defaultProps} categories={[]} />);
    // Categories are missing — income/expense names fall back to "Other Income"/"Other Expense"
    const otherIncome = screen.getAllByText(/Other Income/);
    expect(otherIncome.length).toBeGreaterThanOrEqual(1);
    const otherExpense = screen.getAllByText(/Other Expense/);
    expect(otherExpense.length).toBeGreaterThanOrEqual(1);
  });

  it('handles undefined transactions gracefully', () => {
    render(<AnalyticsView {...defaultProps} transactions={undefined} />);
    expect(screen.getByText('Analytics')).toBeTruthy();
  });

  it('handles undefined categories gracefully', () => {
    useFixedDate();
    render(<AnalyticsView {...defaultProps} categories={undefined} />);
    // Should not crash — categories.find should be guarded
    expect(screen.getByText('Analytics')).toBeTruthy();
    expect(screen.getByText(/Income:.*80,000/)).toBeTruthy();
  });

  it('handles all data empty', () => {
    render(
      <AnalyticsView
        transactions={[]}
        categories={[]}
        onNavigate={() => {}}
        lang="en"
      />
    );
    expect(screen.getByText('Analytics')).toBeTruthy();
    const emptyMessages = screen.getAllByText('No data available for this period.');
    expect(emptyMessages.length).toBe(3);
  });

  it('handles missing optional props gracefully', () => {
    render(<AnalyticsView transactions={mockTransactions} onNavigate={() => {}} lang="en" />);
    expect(screen.getByText('Analytics')).toBeTruthy();
  });

  it('handles income-only transactions', () => {
    useFixedDate();
    const incomeOnly = mockTransactions.filter(tx => tx.type === 'income');
    render(<AnalyticsView {...defaultProps} transactions={incomeOnly} />);
    // Default "This Month" (May): only tx_3 = 80,000
    expect(screen.getByText(/Income:.*80,000/)).toBeTruthy();
    // Expense label still shown with 0 value (component always shows both legend rows)
    expect(screen.getByText(/Expense:.*0/)).toBeTruthy();
  });

  it('handles expense-only transactions', () => {
    useFixedDate();
    const expenseOnly = mockTransactions.filter(tx => tx.type === 'expense');
    render(<AnalyticsView {...defaultProps} transactions={expenseOnly} />);
    // Default "This Month" (May): only tx_1 (1500) + tx_2 (25000) = 26,500
    expect(screen.getByText(/Expense:.*26,500/)).toBeTruthy();
    // Income label still shown with 0 value (component always shows both legend rows)
    expect(screen.getByText(/Income:.*0/)).toBeTruthy();
  });
});

// ==============================================================================
// Budget vs Actual
// ==============================================================================

describe('AnalyticsView — Budget vs Actual', () => {
  it('shows empty state when no budgets exist', () => {
    render(<AnalyticsView {...defaultProps} budgets={[]} />);
    expect(screen.getByText('No budgets set for this period.')).toBeTruthy();
  });

  it('shows create prompt when no budgets exist', () => {
    render(<AnalyticsView {...defaultProps} budgets={[]} />);
    expect(screen.getByText(/Set budgets in Budget Planner/)).toBeTruthy();
  });

  it('shows budget items when budgets exist', () => {
    useFixedDate();
    const budgets = [
      { id: 'budget_1', categoryId: 'cat_food', limit: 5000, month: 4, year: 2025 },
      { id: 'budget_2', categoryId: 'cat_rent', limit: 30000, month: 4, year: 2025 },
    ];
    render(<AnalyticsView {...defaultProps} budgets={budgets} />);
    // Budget section should render category names
    const budgetCard = screen.getByText('Budget vs Actual').closest('[class*="neo-raised"]');
    expect(within(budgetCard).getByText('Food & Drinks')).toBeTruthy();
    expect(within(budgetCard).getByText('Rent')).toBeTruthy();
  });

  it('correctly calculates spent percentage', () => {
    useFixedDate();
    const budgets = [
      { id: 'budget_1', categoryId: 'cat_food', limit: 2000, month: 4, year: 2025 },
    ];
    render(<AnalyticsView {...defaultProps} budgets={budgets} />);
    // Food spent = 1500 out of 2000 = 75%
    expect(screen.getByText('75%')).toBeTruthy();
  });

  it('shows over-budget indicator when spending exceeds limit', () => {
    useFixedDate();
    const budgets = [
      { id: 'budget_1', categoryId: 'cat_food', limit: 1000, month: 4, year: 2025 },
    ];
    render(<AnalyticsView {...defaultProps} budgets={budgets} />);
    // Food spent = 1500, limit = 1000, over by 500
    const budgetCard = screen.getByText('Budget vs Actual').closest('[class*="neo-raised"]');
    expect(within(budgetCard).getByText(/\+৳500/)).toBeTruthy();
  });

  it('shows remaining amount when under budget', () => {
    useFixedDate();
    const budgets = [
      { id: 'budget_1', categoryId: 'cat_food', limit: 3000, month: 4, year: 2025 },
    ];
    render(<AnalyticsView {...defaultProps} budgets={budgets} />);
    // Food spent = 1500, limit = 3000, remaining = 1500
    const budgetCard = screen.getByText('Budget vs Actual').closest('[class*="neo-raised"]');
    expect(within(budgetCard).getByText(/Left/)).toBeTruthy();
  });

  it('shows total budget summary labels', () => {
    useFixedDate();
    const budgets = [
      { id: 'budget_1', categoryId: 'cat_food', limit: 5000, month: 4, year: 2025 },
    ];
    render(<AnalyticsView {...defaultProps} budgets={budgets} />);
    const budgetCard = screen.getByText('Budget vs Actual').closest('[class*="neo-raised"]');
    expect(within(budgetCard).getByText('Total Budget')).toBeTruthy();
    expect(within(budgetCard).getByText('Spent')).toBeTruthy();
    expect(within(budgetCard).getByText('Remaining')).toBeTruthy();
  });

  it('shows "of budget used" percentage text', () => {
    useFixedDate();
    const budgets = [
      { id: 'budget_1', categoryId: 'cat_food', limit: 5000, month: 4, year: 2025 },
    ];
    render(<AnalyticsView {...defaultProps} budgets={budgets} />);
    expect(screen.getByText(/of budget used/)).toBeTruthy();
  });

  it('shows spent over limit amount and spent/limit values', () => {
    useFixedDate();
    const budgets = [
      { id: 'budget_1', categoryId: 'cat_food', limit: 5000, month: 4, year: 2025 },
    ];
    render(<AnalyticsView {...defaultProps} budgets={budgets} />);
    // Shows "৳1,500 / ৳5,000"
    const budgetCard = screen.getByText('Budget vs Actual').closest('[class*="neo-raised"]');
    expect(within(budgetCard).getByText(/1,500.*5,000/)).toBeTruthy();
  });

  it('ignores budgets from other months', () => {
    useFixedDate();
    const budgets = [
      { id: 'budget_old', categoryId: 'cat_food', limit: 5000, month: 3, year: 2025 }, // April, not May
    ];
    render(<AnalyticsView {...defaultProps} budgets={budgets} />);
    // April budget should be ignored — no budget items shown
    expect(screen.getByText('No budgets set for this period.')).toBeTruthy();
  });

  it('handles Bangla mode', () => {
    useFixedDate();
    const budgets = [
      { id: 'budget_1', categoryId: 'cat_food', limit: 5000, month: 4, year: 2025 },
    ];
    render(<AnalyticsView {...defaultProps} budgets={budgets} lang="bn" />);
    expect(screen.getByText('বাজেট বনাম বাস্তব')).toBeTruthy();
  });
});

// ==============================================================================
// Budget vs Actual — Edge Cases
// ==============================================================================

describe('AnalyticsView — Budget vs Actual Edge Cases', () => {
  it('shows multiple budgets for the same category in the same month', () => {
    useFixedDate();
    const budgets = [
      { id: 'b_food_1', categoryId: 'cat_food', limit: 2000, month: 4, year: 2025 },
      { id: 'b_food_2', categoryId: 'cat_food', limit: 3000, month: 4, year: 2025 },
    ];
    render(<AnalyticsView {...defaultProps} budgets={budgets} />);
    const budgetCard = screen.getByText('Budget vs Actual').closest('[class*="neo-raised"]');
    // Both budgets share the same category name but have different limits
    const items = within(budgetCard).getAllByText('Food & Drinks');
    expect(items.length).toBe(2);
    // Total should sum both limits: 2000+3000=5000
    expect(within(budgetCard).getByText(/5,000/)).toBeTruthy();
  });

  it('aggregates budgets by category in All Time mode, taking the latest', () => {
    useFixedDate();
    const budgets = [
      { id: 'b_food_apr', categoryId: 'cat_food', limit: 1000, month: 3, year: 2025 }, // April
      { id: 'b_food_may', categoryId: 'cat_food', limit: 3000, month: 4, year: 2025 }, // May
    ];
    render(<AnalyticsView {...defaultProps} budgets={budgets} />);
    fireEvent.click(screen.getByText('All Time'));
    const budgetCard = screen.getByText('Budget vs Actual').closest('[class*="neo-raised"]');
    // Only 1 Food budget should appear (the May one with limit 3000) — not April's
    const foodItems = within(budgetCard).getAllByText('Food & Drinks');
    expect(foodItems.length).toBe(1);
    // All-time food spending: tx_1 (1500 May) + tx_6 (500 Dec) = 2000
    // 2000/3000 ≈ 66.67% → formatPercent rounds to 67%
    // Appears twice: total bar + budget item percentage
    const pctEls = within(budgetCard).getAllByText('67%');
    expect(pctEls.length).toBeGreaterThanOrEqual(1);
  });

  it('handles zero budget limit with no spending', () => {
    useFixedDate();
    // Transport has no May transactions in mock data → spent = 0
    const budgets = [
      { id: 'b_transport', categoryId: 'cat_transport', limit: 0, month: 4, year: 2025 },
    ];
    render(<AnalyticsView {...defaultProps} budgets={budgets} />);
    const budgetCard = screen.getByText('Budget vs Actual').closest('[class*="neo-raised"]');
    // limit=0, spent=0 → isOverBudget=false → shows remaining
    expect(within(budgetCard).getByText(/Left/)).toBeTruthy();
    // percentage = 0 (guarded), shows "0%" — appears twice (total bar + budget item)
    const pctEls = within(budgetCard).getAllByText('0%');
    expect(pctEls.length).toBeGreaterThanOrEqual(1);
  });

  it('handles zero budget limit with spending — shows 100%+ and over-budget', () => {
    useFixedDate();
    // Food has 1500 May expense, limit = 0
    const budgets = [
      { id: 'b_food', categoryId: 'cat_food', limit: 0, month: 4, year: 2025 },
    ];
    render(<AnalyticsView {...defaultProps} budgets={budgets} />);
    const budgetCard = screen.getByText('Budget vs Actual').closest('[class*="neo-raised"]');
    // isOverBudget = 1500 > 0 = true
    // displayPct = '100%+' (zero-limit with spending)
    expect(within(budgetCard).getByText('100%+')).toBeTruthy();
    // Total bar still shows '0% of budget used' since totalLimit is 0
    expect(within(budgetCard).getByText(/0%.*of budget used/)).toBeTruthy();
    // Over by +1,500
    expect(within(budgetCard).getByText(/\+৳1,500/)).toBeTruthy();
  });

  it('calculates exact percentage correctly (250/1000 = 25%)', () => {
    useFixedDate();
    const customTx = [
      { id: 'ctx_1', type: 'expense', amount: 100, date: '2025-05-10',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Lunch' },
      { id: 'ctx_2', type: 'expense', amount: 150, date: '2025-05-15',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Dinner' },
    ];
    const budgets = [
      { id: 'b_food', categoryId: 'cat_food', limit: 1000, month: 4, year: 2025 },
    ];
    render(<AnalyticsView {...defaultProps} transactions={customTx} budgets={budgets} />);
    // 250/1000 = 25% exactly — appears twice (total bar + budget item)
    const pctEls = screen.getAllByText('25%');
    expect(pctEls.length).toBeGreaterThanOrEqual(1);
  });

  it('rounds fractional percentage up correctly (2/3 ≈ 67%)', () => {
    useFixedDate();
    const customTx = [
      { id: 'ctx_1', type: 'expense', amount: 2, date: '2025-05-10',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Item' },
    ];
    const budgets = [
      { id: 'b_food', categoryId: 'cat_food', limit: 3, month: 4, year: 2025 },
    ];
    render(<AnalyticsView {...defaultProps} transactions={customTx} budgets={budgets} />);
    // 2/3 ≈ 66.67 → formatPercent rounds up to 67% — appears twice (total bar + budget item)
    const pctEls = screen.getAllByText('67%');
    expect(pctEls.length).toBeGreaterThanOrEqual(1);
  });

  it('rounds fractional percentage down correctly (1/3 ≈ 33%)', () => {
    useFixedDate();
    const customTx = [
      { id: 'ctx_1', type: 'expense', amount: 1, date: '2025-05-10',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Item' },
    ];
    const budgets = [
      { id: 'b_food', categoryId: 'cat_food', limit: 3, month: 4, year: 2025 },
    ];
    render(<AnalyticsView {...defaultProps} transactions={customTx} budgets={budgets} />);
    // 1/3 ≈ 33.33 → formatPercent rounds down to 33% — appears twice (total bar + budget item)
    const pctEls = screen.getAllByText('33%');
    expect(pctEls.length).toBeGreaterThanOrEqual(1);
  });

  it('rounds tiny percentages to 0% (1/10000 = 0.01%)', () => {
    useFixedDate();
    const customTx = [
      { id: 'ctx_1', type: 'expense', amount: 1, date: '2025-05-10',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Penny' },
    ];
    const budgets = [
      { id: 'b_food', categoryId: 'cat_food', limit: 10000, month: 4, year: 2025 },
    ];
    render(<AnalyticsView {...defaultProps} transactions={customTx} budgets={budgets} />);
    // 1/10000 = 0.01% → formatPercent rounds to 0% — appears twice (total bar + budget item)
    const pctEls = screen.getAllByText('0%');
    expect(pctEls.length).toBeGreaterThanOrEqual(1);
  });

  it('shows exact budget hit (spent equals limit) as not over budget', () => {
    useFixedDate();
    const customTx = [
      { id: 'ctx_eq', type: 'expense', amount: 2000, date: '2025-05-10',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Big lunch' },
    ];
    const budgets = [
      { id: 'b_food', categoryId: 'cat_food', limit: 2000, month: 4, year: 2025 },
    ];
    render(<AnalyticsView {...defaultProps} transactions={customTx} budgets={budgets} />);
    const budgetCard = screen.getByText('Budget vs Actual').closest('[class*="neo-raised"]');
    // spent === limit → isOverBudget = false → shows remaining
    expect(within(budgetCard).getByText(/Left/)).toBeTruthy();
    // percentage = 100% exactly — appears twice (total bar + budget item)
    const pctEls = within(budgetCard).getAllByText('100%');
    expect(pctEls.length).toBeGreaterThanOrEqual(1);
  });
});

// ==============================================================================
// Smart Insights
// ==============================================================================

describe('AnalyticsView — Smart Insights', () => {
  it('shows empty state when no transactions exist', () => {
    render(<AnalyticsView {...defaultProps} transactions={[]} />);
    expect(screen.getByText('Add some transactions to see insights.')).toBeTruthy();
  });

  it('shows top spending category', () => {
    useFixedDate();
    render(<AnalyticsView {...defaultProps} />);
    // May: Rent = 25,000 (highest), Food = 1,500
    // "Rent" appears in both Expense Breakdown legend and Insights — use getAllByText
    const rentElements = screen.getAllByText('Rent');
    expect(rentElements.length).toBeGreaterThanOrEqual(2); // Expense legend + Insights
    // ৳25,000 appears in Insights (top category + biggest increase) — use getAllByText
    const amountElements = screen.getAllByText(/৳25,000/);
    expect(amountElements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows biggest increase vs last month', () => {
    useFixedDate();
    render(<AnalyticsView {...defaultProps} />);
    // Rent: 0 → 25,000 (+25,000) is the biggest increase
    const insightsCard = screen.getByText('Smart Insights').closest('[class*="neo-raised"]');
    expect(within(insightsCard).getByText(/\+৳25,000/)).toBeTruthy();
  });

  it('shows biggest decrease vs last month', () => {
    useFixedDate();
    render(<AnalyticsView {...defaultProps} />);
    // Transport: 2,000 → 0 (-2,000) is the biggest decrease
    const insightsCard = screen.getByText('Smart Insights').closest('[class*="neo-raised"]');
    expect(within(insightsCard).getByText(/-৳2,000/)).toBeTruthy();
  });

  it('shows summary stats labels', () => {
    useFixedDate();
    render(<AnalyticsView {...defaultProps} />);
    const insightsCard = screen.getByText('Smart Insights').closest('[class*="neo-raised"]');
    // All three summary stat labels should be present
    expect(within(insightsCard).getByText('Total Income:')).toBeTruthy();
    expect(within(insightsCard).getByText('Total Expense:')).toBeTruthy();
    expect(within(insightsCard).getByText('Savings Rate:')).toBeTruthy();
  });

  it('shows summary stat values (income, expense, savings rate)', () => {
    useFixedDate();
    render(<AnalyticsView {...defaultProps} />);
    // Income = 80,000, Expense = 26,500, Savings Rate = +67%
    // Use getAllByText since "80,000" also appears in Overview legend
    const incomeAmounts = screen.getAllByText(/80,000/);
    expect(incomeAmounts.length).toBeGreaterThanOrEqual(1);
    const expenseAmounts = screen.getAllByText(/26,500/);
    expect(expenseAmounts.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/\+67%/)).toBeTruthy();
  });

  it('shows transaction count vs last month', () => {
    useFixedDate();
    render(<AnalyticsView {...defaultProps} />);
    // May: 3 txns, April: 2, diff: +1
    expect(screen.getByText(/Transactions this period:/)).toBeTruthy();
    // "3" appears in tx count and potentially elsewhere — use getAllByText
    const threeElements = screen.getAllByText(/\b3\b/);
    expect(threeElements.length).toBeGreaterThanOrEqual(1);
    // Note: /\+1/ also matches "+100%" from biggest increase, so use getAllByText
    const plusOneElements = screen.getAllByText(/\+1/);
    expect(plusOneElements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows top category insight label', () => {
    useFixedDate();
    render(<AnalyticsView {...defaultProps} />);
    const insightsCard = screen.getByText('Smart Insights').closest('[class*="neo-raised"]');
    expect(within(insightsCard).getByText('Top spending category this period:')).toBeTruthy();
  });

  it('shows biggest increase label', () => {
    useFixedDate();
    render(<AnalyticsView {...defaultProps} />);
    const insightsCard = screen.getByText('Smart Insights').closest('[class*="neo-raised"]');
    expect(within(insightsCard).getByText(/Biggest spending increase/)).toBeTruthy();
  });

  it('shows biggest decrease label', () => {
    useFixedDate();
    render(<AnalyticsView {...defaultProps} />);
    const insightsCard = screen.getByText('Smart Insights').closest('[class*="neo-raised"]');
    expect(within(insightsCard).getByText(/Biggest spending decrease/)).toBeTruthy();
  });

  it('shows vs previous period label in tx count row', () => {
    useFixedDate();
    render(<AnalyticsView {...defaultProps} />);
    // "vs previous period" appears only in Insights tx count row
    const vsElements = screen.getAllByText(/vs previous period/);
    expect(vsElements.length).toBeGreaterThanOrEqual(1);
  });

  it('handles Bangla mode', () => {
    useFixedDate();
    render(<AnalyticsView {...defaultProps} lang="bn" />);
    expect(screen.getByText('স্মার্ট অন্তর্দৃষ্টি')).toBeTruthy();
  });

  it('handles Bangla mode with Bangla digits in summary stats', () => {
    useFixedDate();
    render(<AnalyticsView {...defaultProps} lang="bn" />);
    // Total Income label in Bangla
    // These labels are unique to Insights section
    expect(screen.getByText('মোট আয়:')).toBeTruthy();
    expect(screen.getByText('মোট ব্যয়:')).toBeTruthy();
  });
});

// ==============================================================================
// Smart Insights — Edge Cases
// ==============================================================================

describe('AnalyticsView — Smart Insights Edge Cases', () => {
  it('handles all categories with equal spending — still shows top category and increase', () => {
    useFixedDate();
    // Two expense categories with equal spending (500 each), one income (1,000)
    const equalTx = [
      { id: 'eq_1', type: 'expense', amount: 500, date: '2025-05-01',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Food' },
      { id: 'eq_2', type: 'expense', amount: 500, date: '2025-05-02',
        accountId: 'acc_cash', categoryId: 'cat_rent', notes: 'Rent' },
      { id: 'eq_3', type: 'income', amount: 1000, date: '2025-05-01',
        accountId: 'acc_bank', categoryId: 'cat_salary', notes: 'Salary' },
    ];
    render(<AnalyticsView {...defaultProps} transactions={equalTx} />);
    const insightsCard = screen.getByText('Smart Insights').closest('[class*="neo-raised"]');

    // Top category shows (both tied at 500, so either renders)
    expect(within(insightsCard).getByText('Top spending category this period:')).toBeTruthy();
    // ৳500 appears in both top category (current=500) and increase (diff=500)
    const amount500Els = within(insightsCard).getAllByText(/৳500/);
    expect(amount500Els.length).toBeGreaterThanOrEqual(1);

    // Biggest increase: both have diff=500 from 0 previous → "+৳500"
    expect(within(insightsCard).getByText(/\+৳500/)).toBeTruthy();
    expect(within(insightsCard).getByText(/100%/)).toBeTruthy();

    // No biggest decrease (no diff < 0)
    expect(within(insightsCard).queryByText(/Biggest spending decrease/)).toBeNull();

    // Summary stats: income=1,000, expense=1,000, savings rate=0%
    expect(within(insightsCard).getByText('Total Income:')).toBeTruthy();
    expect(within(insightsCard).getByText('Total Expense:')).toBeTruthy();
    expect(within(insightsCard).getByText('Savings Rate:')).toBeTruthy();
    const thousandEls = within(insightsCard).getAllByText(/৳1,000/);
    expect(thousandEls.length).toBeGreaterThanOrEqual(1);
    expect(within(insightsCard).getByText(/\+0%/)).toBeTruthy();

    // Tx count: 3, diff vs prev = +3
    expect(within(insightsCard).getByText(/Transactions this period:/)).toBeTruthy();
    const threeEls = within(insightsCard).getAllByText(/3/);
    expect(threeEls.length).toBeGreaterThanOrEqual(1);
    expect(within(insightsCard).getByText(/\+3/)).toBeTruthy();
  });

  it('handles no previous period data', () => {
    useFixedDate();
    // May transactions only — April (previous period) is empty
    const noPrevTx = [
      { id: 'np_1', type: 'expense', amount: 3000, date: '2025-05-01',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Groceries' },
      { id: 'np_2', type: 'expense', amount: 2000, date: '2025-05-05',
        accountId: 'acc_cash', categoryId: 'cat_transport', notes: 'Car repair' },
      { id: 'np_3', type: 'income', amount: 10000, date: '2025-05-01',
        accountId: 'acc_bank', categoryId: 'cat_salary', notes: 'Salary' },
    ];
    render(<AnalyticsView {...defaultProps} transactions={noPrevTx} />);
    const insightsCard = screen.getByText('Smart Insights').closest('[class*="neo-raised"]');

    // Top category: Food (3,000) > Transport (2,000)
    const foodEls = within(insightsCard).getAllByText(/Food & Drinks/);
    expect(foodEls.length).toBeGreaterThanOrEqual(1);
    // ৳3,000 appears in both top category (current=3000) and increase (diff=3000)
    const amount3kEls = within(insightsCard).getAllByText(/৳3,000/);
    expect(amount3kEls.length).toBeGreaterThanOrEqual(1);

    // Biggest increase: Food (3,000 from 0) → "+৳3,000" and "+100%"
    expect(within(insightsCard).getByText(/\+৳3,000/)).toBeTruthy();
    const hundredPctEls = within(insightsCard).getAllByText(/100%/);
    expect(hundredPctEls.length).toBeGreaterThanOrEqual(1);

    // No biggest decrease
    expect(within(insightsCard).queryByText(/Biggest spending decrease/)).toBeNull();

    // Summary: income=10,000, expense=5,000, savings rate=50%
    expect(within(insightsCard).getByText(/৳10,000/)).toBeTruthy();
    expect(within(insightsCard).getByText(/৳5,000/)).toBeTruthy();
    expect(within(insightsCard).getByText(/\+50%/)).toBeTruthy();

    // Tx count: 3, +3 vs previous period
    const threeEls = within(insightsCard).getAllByText(/3/);
    expect(threeEls.length).toBeGreaterThanOrEqual(1);
    // "vs previous period" appears in inner span AND parent div — use getAllByText
    const vsEls = within(insightsCard).getAllByText(/vs previous period/);
    expect(vsEls.length).toBeGreaterThanOrEqual(1);
    expect(within(insightsCard).getByText(/\+3/)).toBeTruthy();
  });

  it('handles a single expense transaction', () => {
    useFixedDate();
    const singleTx = [
      { id: 'st_1', type: 'expense', amount: 2500, date: '2025-05-01',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Single lunch' },
    ];
    render(<AnalyticsView {...defaultProps} transactions={singleTx} />);
    const insightsCard = screen.getByText('Smart Insights').closest('[class*="neo-raised"]');

    // Top category: Food & Drinks with 2,500
    const foodEls = within(insightsCard).getAllByText(/Food & Drinks/);
    expect(foodEls.length).toBeGreaterThanOrEqual(1);
    // ৳2,500 appears in both top category (current=2500) and increase (diff=2500)
    const amount25Els = within(insightsCard).getAllByText(/৳2,500/);
    expect(amount25Els.length).toBeGreaterThanOrEqual(1);

    // Biggest increase: diff=2500 from 0, +100%
    expect(within(insightsCard).getByText(/\+৳2,500/)).toBeTruthy();
    expect(within(insightsCard).getByText(/100%/)).toBeTruthy();

    // No biggest decrease
    expect(within(insightsCard).queryByText(/Biggest spending decrease/)).toBeNull();

    // Summary: income=0, expense=2,500, savings rate=0%
    expect(within(insightsCard).getByText(/৳0/)).toBeTruthy();
    expect(within(insightsCard).getByText(/\+0%/)).toBeTruthy();

    // Tx count: 1, +1 vs previous period
    const oneEls = within(insightsCard).getAllByText(/1/);
    expect(oneEls.length).toBeGreaterThanOrEqual(1);
    // \+1 appears in tx change "+1" AND overlaps with "+100%" (savings rate)
    const plusOneEls = within(insightsCard).getAllByText(/\+1/);
    expect(plusOneEls.length).toBeGreaterThanOrEqual(1);
  });

  it('handles single income-only transaction', () => {
    useFixedDate();
    const singleIncomeTx = [
      { id: 'si_1', type: 'income', amount: 50000, date: '2025-05-01',
        accountId: 'acc_bank', categoryId: 'cat_salary', notes: 'Salary' },
    ];
    render(<AnalyticsView {...defaultProps} transactions={singleIncomeTx} />);
    const insightsCard = screen.getByText('Smart Insights').closest('[class*="neo-raised"]');

    // No top category (no expense transactions)
    expect(within(insightsCard).queryByText(/Top spending category/)).toBeNull();

    // No biggest increase or decrease (no expense categories)
    expect(within(insightsCard).queryByText(/Biggest spending/)).toBeNull();

    // Summary: income=50,000, expense=0, savings rate=+100%
    expect(within(insightsCard).getByText('Total Income:')).toBeTruthy();
    expect(within(insightsCard).getByText('Total Expense:')).toBeTruthy();
    expect(within(insightsCard).getByText('Savings Rate:')).toBeTruthy();
    expect(within(insightsCard).getByText(/৳50,000/)).toBeTruthy();
    expect(within(insightsCard).getByText(/\+100%/)).toBeTruthy();

    // Tx count: 1, +1 vs previous period
    const oneEls = within(insightsCard).getAllByText(/1/);
    expect(oneEls.length).toBeGreaterThanOrEqual(1);
    // \+1 matches both "+1" (tx change) and "+100%" (savings rate) — use getAllByText
    const plusOneEls = within(insightsCard).getAllByText(/\+1/);
    expect(plusOneEls.length).toBeGreaterThanOrEqual(1);
  });

  // ===== All Income / All Expense =====

  it('handles all income with multiple categories and no expenses', () => {
    useFixedDate();
    const allIncomeTx = [
      { id: 'ai_1', type: 'income', amount: 50000, date: '2025-05-01',
        accountId: 'acc_bank', categoryId: 'cat_salary', notes: 'Salary' },
      { id: 'ai_2', type: 'income', amount: 30000, date: '2025-05-05',
        accountId: 'acc_bank', categoryId: 'cat_freelance', notes: 'Freelance' },
      { id: 'ai_3', type: 'income', amount: 20000, date: '2025-05-10',
        accountId: 'acc_cash', categoryId: 'cat_freelance', notes: 'Bonus' },
    ];
    render(<AnalyticsView {...defaultProps} transactions={allIncomeTx} />);
    const insightsCard = screen.getByText('Smart Insights').closest('[class*="neo-raised"]');

    // No top category (no expenses)
    expect(within(insightsCard).queryByText(/Top spending category/)).toBeNull();

    // No biggest increase or decrease (no expense categories)
    expect(within(insightsCard).queryByText(/Biggest spending/)).toBeNull();

    // Summary: income=100,000, expense=0, savings=+100%
    expect(within(insightsCard).getByText(/৳100,000/)).toBeTruthy();
    expect(within(insightsCard).getByText(/\+100%/)).toBeTruthy();

    // Tx count: 3, +3 vs previous period
    expect(within(insightsCard).getByText(/Transactions this period:/)).toBeTruthy();
    const threeEls = within(insightsCard).getAllByText(/3/);
    expect(threeEls.length).toBeGreaterThanOrEqual(1);
    expect(within(insightsCard).getByText(/\+3/)).toBeTruthy();
  });

  it('handles all expense with multiple categories and no income', () => {
    useFixedDate();
    const allExpenseTx = [
      { id: 'ae_1', type: 'expense', amount: 1500, date: '2025-05-01',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Groceries' },
      { id: 'ae_2', type: 'expense', amount: 25000, date: '2025-05-05',
        accountId: 'acc_bank', categoryId: 'cat_rent', notes: 'Rent' },
      { id: 'ae_3', type: 'expense', amount: 300, date: '2025-05-10',
        accountId: 'acc_cash', categoryId: 'cat_transport', notes: 'Bus pass' },
    ];
    render(<AnalyticsView {...defaultProps} transactions={allExpenseTx} />);
    const insightsCard = screen.getByText('Smart Insights').closest('[class*="neo-raised"]');

    // Top category: Rent (25,000)
    expect(within(insightsCard).getByText('Top spending category this period:')).toBeTruthy();
    // Rent appears in top category + biggest increase within insightsCard
    const rentEls = within(insightsCard).getAllByText('Rent');
    expect(rentEls.length).toBeGreaterThanOrEqual(1);
    // 25,000 appears in top category current + biggest increase diff
    const amountEls = within(insightsCard).getAllByText(/৳25,000/);
    expect(amountEls.length).toBeGreaterThanOrEqual(1);

    // Biggest increase: Rent (25,000 from 0, +100%)
    expect(within(insightsCard).getByText(/Biggest spending increase/)).toBeTruthy();
    const pctEls = within(insightsCard).getAllByText(/100%/);
    expect(pctEls.length).toBeGreaterThanOrEqual(1);

    // No biggest decrease (all diff > 0 from zero previous)
    expect(within(insightsCard).queryByText(/Biggest spending decrease/)).toBeNull();

    // Summary: income=0, expense=26,800, savings=+0%
    // "৳0" appears in Total Income stat — use getAllByText
    const zeroEls = within(insightsCard).getAllByText(/৳0/);
    expect(zeroEls.length).toBeGreaterThanOrEqual(1);
    // expense=26,800 — appears in both Total Expense stat and top category current
    const expenseEls = within(insightsCard).getAllByText(/26,800/);
    expect(expenseEls.length).toBeGreaterThanOrEqual(1);
    expect(within(insightsCard).getByText(/\+0%/)).toBeTruthy();

    // Tx count: 3, +3
    expect(within(insightsCard).getByText(/Transactions this period:/)).toBeTruthy();
    const threeEls2 = within(insightsCard).getAllByText(/3/);
    expect(threeEls2.length).toBeGreaterThanOrEqual(1);
    expect(within(insightsCard).getByText(/\+3/)).toBeTruthy();
  });

  // ===== Savings Rate Rounding =====

  it('calculates exact savings rate (25%) when income=4000, expense=3000', () => {
    useFixedDate();
    const tx = [
      { id: 'se_1', type: 'expense', amount: 3000, date: '2025-05-01',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Food' },
      { id: 'si_1', type: 'income', amount: 4000, date: '2025-05-01',
        accountId: 'acc_bank', categoryId: 'cat_salary', notes: 'Salary' },
    ];
    render(<AnalyticsView {...defaultProps} transactions={tx} />);
    const insightsCard = screen.getByText('Smart Insights').closest('[class*="neo-raised"]');
    // savingsRate = Math.round((4000-3000)/4000*100) = 25
    expect(within(insightsCard).getByText(/\+25%/)).toBeTruthy();
  });

  it('rounds savings rate down to 33% when income=3000, expense=2000', () => {
    useFixedDate();
    const tx = [
      { id: 'rd_1', type: 'expense', amount: 2000, date: '2025-05-01',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Food' },
      { id: 'ri_1', type: 'income', amount: 3000, date: '2025-05-01',
        accountId: 'acc_bank', categoryId: 'cat_salary', notes: 'Salary' },
    ];
    render(<AnalyticsView {...defaultProps} transactions={tx} />);
    const insightsCard = screen.getByText('Smart Insights').closest('[class*="neo-raised"]');
    // (3000-2000)/3000 = 33.33 → Math.round(33.33) = 33
    expect(within(insightsCard).getByText(/\+33%/)).toBeTruthy();
  });

  it('rounds savings rate up to 67% when income=3000, expense=1000', () => {
    useFixedDate();
    const tx = [
      { id: 'ru_1', type: 'expense', amount: 1000, date: '2025-05-01',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Food' },
      { id: 'rui_1', type: 'income', amount: 3000, date: '2025-05-01',
        accountId: 'acc_bank', categoryId: 'cat_salary', notes: 'Salary' },
    ];
    render(<AnalyticsView {...defaultProps} transactions={tx} />);
    const insightsCard = screen.getByText('Smart Insights').closest('[class*="neo-raised"]');
    // (3000-1000)/3000 = 66.67 → Math.round(66.67) = 67
    expect(within(insightsCard).getByText(/\+67%/)).toBeTruthy();
  });

  // Negative savings rate

  it('shows negative savings rate (-60%) when expense exceeds income', () => {
    useFixedDate();
    const tx = [
      { id: 'ne_1', type: 'expense', amount: 8000, date: '2025-05-01',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Shopping' },
      { id: 'ni_1', type: 'income', amount: 5000, date: '2025-05-01',
        accountId: 'acc_bank', categoryId: 'cat_salary', notes: 'Salary' },
    ];
    render(<AnalyticsView {...defaultProps} transactions={tx} />);
    const insightsCard = screen.getByText('Smart Insights').closest('[class*="neo-raised"]');
    // (5000-8000)/5000 = -60% → Math.round(-60) = -60
    // Renders without + prefix: "-60%"
    expect(within(insightsCard).getByText(/-60%/)).toBeTruthy();
  });

  // Very large boundary values

  it('handles very large income and expense amounts (10M vs 4M) with correct formatting', () => {
    useFixedDate();
    const tx = [
      { id: 'la_1', type: 'expense', amount: 4000000, date: '2025-05-01',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Big purchase' },
      { id: 'la_2', type: 'income', amount: 10000000, date: '2025-05-01',
        accountId: 'acc_bank', categoryId: 'cat_salary', notes: 'Big salary' },
    ];
    render(<AnalyticsView {...defaultProps} transactions={tx} />);
    const insightsCard = screen.getByText('Smart Insights').closest('[class*="neo-raised"]');

    // (10000000-4000000)/10000000 = 60%
    expect(within(insightsCard).getByText(/\+60%/)).toBeTruthy();

    // 10,000,000 appears once (Total Income stat)
    expect(within(insightsCard).getByText(/৳10,000,000/)).toBeTruthy();
    // 4,000,000 appears twice (top category current + Total Expense stat)
    const expenseAmtEls = within(insightsCard).getAllByText(/৳4,000,000/);
    expect(expenseAmtEls.length).toBeGreaterThanOrEqual(1);

    // Top category and biggest increase both show Food & Drinks
    const foodEls = within(insightsCard).getAllByText('Food & Drinks');
    expect(foodEls.length).toBeGreaterThanOrEqual(1);
  });
});

// ==============================================================================
// Anomaly Detection
// ==============================================================================

describe('AnalyticsView — Anomaly Detection', () => {
  it('shows "not enough data" when fewer than 3 expenses in current month', () => {
    useFixedDate();
    const lowTx = [
      { id: 'low_1', type: 'expense', amount: 100, date: '2025-05-01',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Snack' },
      { id: 'low_2', type: 'expense', amount: 150, date: '2025-05-05',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Coffee' },
    ];
    render(<AnalyticsView {...defaultProps} transactions={lowTx} />);
    expect(screen.getByText('Need more transactions to detect anomalies.')).toBeTruthy();
  });

  it('shows "no anomalies" when all expenses are within normal range', () => {
    useFixedDate();
    const normalTx = [
      { id: 'norm_1', type: 'expense', amount: 100, date: '2025-05-01',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Snack' },
      { id: 'norm_2', type: 'expense', amount: 150, date: '2025-05-05',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Coffee' },
      { id: 'norm_3', type: 'expense', amount: 180, date: '2025-05-10',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Lunch' },
      // Need a 4th so avg = (100+150+180)/3 = 143.33, none above 286.67
      { id: 'norm_4', type: 'expense', amount: 200, date: '2025-05-12',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Dinner' },
    ];
    render(<AnalyticsView {...defaultProps} transactions={normalTx} />);
    expect(screen.getByText(/No anomalies detected this period/)).toBeTruthy();
  });

  it('flags anomalies when a transaction exceeds 2x category average', () => {
    useFixedDate();
    const anomalyTx = [
      // 3+ expenses in Food: 100, 150, 1000 → avg = 416.67, 1000 > 833.33 → anomaly!
      { id: 'anom_1', type: 'expense', amount: 100, date: '2025-05-01',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Snack' },
      { id: 'anom_2', type: 'expense', amount: 150, date: '2025-05-05',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Coffee' },
      { id: 'anom_3', type: 'expense', amount: 1000, date: '2025-05-10',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Fancy dinner' },
      // Also include a non-anomaly expense in another category
      { id: 'anom_4', type: 'expense', amount: 25000, date: '2025-05-01',
        accountId: 'acc_bank', categoryId: 'cat_rent', notes: 'Monthly rent' },
      // Income so the component doesn't crash
      { id: 'anom_5', type: 'income', amount: 80000, date: '2025-05-01',
        accountId: 'acc_bank', categoryId: 'cat_salary', notes: 'May salary' },
    ];
    render(<AnalyticsView {...defaultProps} transactions={anomalyTx} />);
    // The flagged item should show the category name and amount
    const anomalyCard = screen.getByText('Anomaly Detection').closest('[class*="neo-raised"]');
    expect(within(anomalyCard).getByText('Food & Drinks')).toBeTruthy();
    expect(within(anomalyCard).getByText(/৳1,000/)).toBeTruthy();
  });

  it('shows badge with multiplier and average for flagged transactions', () => {
    useFixedDate();
    const anomalyTx = [
      { id: 'anom_1', type: 'expense', amount: 100, date: '2025-05-01',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Snack' },
      { id: 'anom_2', type: 'expense', amount: 150, date: '2025-05-05',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Coffee' },
      { id: 'anom_3', type: 'expense', amount: 1000, date: '2025-05-10',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Fancy dinner' },
    ];
    render(<AnalyticsView {...defaultProps} transactions={anomalyTx} />);
    const anomalyCard = screen.getByText('Anomaly Detection').closest('[class*="neo-raised"]');
    // Should show the threshold badge with multiplier and average
    expect(within(anomalyCard).getByText(/× category avg/)).toBeTruthy();
    expect(within(anomalyCard).getByText(/Avg:/)).toBeTruthy();
  });

  it('only flags transactions from current month, ignores past months', () => {
    useFixedDate();
    const mixedTx = [
      // 3 current month expenses: avg ~150, none above 300
      { id: 'mix_1', type: 'expense', amount: 100, date: '2025-05-01',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Snack' },
      { id: 'mix_2', type: 'expense', amount: 150, date: '2025-05-05',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Coffee' },
      { id: 'mix_3', type: 'expense', amount: 200, date: '2025-05-10',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Lunch' },
      // Past month huge transaction — should NOT affect current month avg
      { id: 'mix_4', type: 'expense', amount: 50000, date: '2025-04-01',
        accountId: 'acc_bank', categoryId: 'cat_rent', notes: 'Old rent' },
    ];
    render(<AnalyticsView {...defaultProps} transactions={mixedTx} />);
    // Should show no anomalies (all current month expenses are within normal range)
    expect(screen.getByText(/No anomalies detected this period/)).toBeTruthy();
  });

  it('does not flag categories with fewer than 2 transactions', () => {
    useFixedDate();
    const sparseTx = [
      // 2 Food expenses: avg = (100+1000)/2 = 550, 1000 > 1100? No. So no anomaly.
      { id: 'sparse_1', type: 'expense', amount: 100, date: '2025-05-01',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Snack' },
      { id: 'sparse_2', type: 'expense', amount: 1000, date: '2025-05-10',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Splurge' },
      // Rent has only 1 transaction (need ≥2 for avg) — should not flag
      { id: 'sparse_3', type: 'expense', amount: 25000, date: '2025-05-01',
        accountId: 'acc_bank', categoryId: 'cat_rent', notes: 'Monthly rent' },
    ];
    render(<AnalyticsView {...defaultProps} transactions={sparseTx} />);
    // 3 expenses total → has enough data. But Food avg check: 1000 > 1100? No.
    // Rent: only 1 tx (< 2), skipped. So no anomalies.
    expect(screen.getByText(/No anomalies detected this period/)).toBeTruthy();
  });

  it('handles Bangla mode for anomaly section', () => {
    useFixedDate();
    render(<AnalyticsView {...defaultProps} lang="bn" transactions={[]} />);
    expect(screen.getByText('অস্বাভাবিক সনাক্তকরণ')).toBeTruthy();
  });

  it('shows Bangla "not enough data" message', () => {
    useFixedDate();
    const lowTx = [
      { id: 'low_bn_1', type: 'expense', amount: 100, date: '2025-05-01',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Snack' },
      { id: 'low_bn_2', type: 'expense', amount: 150, date: '2025-05-05',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Coffee' },
    ];
    render(<AnalyticsView {...defaultProps} transactions={lowTx} lang="bn" />);
    expect(screen.getByText('অস্বাভাবিকতা সনাক্ত করতে আরও লেনদেন প্রয়োজন।')).toBeTruthy();
  });

  it('shows flagged anomaly details with notes in the list', () => {
    useFixedDate();
    const anomalyTx = [
      { id: 'anom_1', type: 'expense', amount: 100, date: '2025-05-01',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Snack' },
      { id: 'anom_2', type: 'expense', amount: 150, date: '2025-05-05',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Coffee' },
      { id: 'anom_3', type: 'expense', amount: 1000, date: '2025-05-10',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Fancy dinner' },
    ];
    render(<AnalyticsView {...defaultProps} transactions={anomalyTx} />);
    // The flagged transaction note should appear (e.g., 'Fancy dinner')
    const anomalyCard = screen.getByText('Anomaly Detection').closest('[class*="neo-raised"]');
    expect(within(anomalyCard).getByText('Fancy dinner')).toBeTruthy();
  });
});

// ==============================================================================
// Anomaly Detection — Edge Cases
// ==============================================================================

describe('AnalyticsView — Anomaly Detection Edge Cases', () => {
  it('flags anomalies from multiple categories simultaneously', () => {
    useFixedDate();
    // Food: avg = (100+150+1000)/3 = 416.67, 2×avg = 833.33, 1000 > 833.33 → flag
    // Rent: need 3rd > 2×avg. With 25000+26000+120000: avg = 57000, 2×avg = 114000, 120000 > 114000 → flag
    const multiCatTx = [
      { id: 'mc_1', type: 'expense', amount: 100, date: '2025-05-01',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Snack' },
      { id: 'mc_2', type: 'expense', amount: 150, date: '2025-05-05',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Coffee' },
      { id: 'mc_3', type: 'expense', amount: 1000, date: '2025-05-10',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Fancy dinner' },
      { id: 'mc_4', type: 'expense', amount: 25000, date: '2025-05-01',
        accountId: 'acc_bank', categoryId: 'cat_rent', notes: 'April rent' },
      { id: 'mc_5', type: 'expense', amount: 26000, date: '2025-05-05',
        accountId: 'acc_bank', categoryId: 'cat_rent', notes: 'May rent' },
      { id: 'mc_6', type: 'expense', amount: 120000, date: '2025-05-10',
        accountId: 'acc_bank', categoryId: 'cat_rent', notes: 'Security deposit' },
    ];
    render(<AnalyticsView {...defaultProps} transactions={multiCatTx} />);
    const anomalyCard = screen.getByText('Anomaly Detection').closest('[class*="neo-raised"]');
    expect(within(anomalyCard).getByText('Food & Drinks')).toBeTruthy();
    expect(within(anomalyCard).getByText('Rent')).toBeTruthy();
  });

  it('flags multiple anomalies in the same category', () => {
    useFixedDate();
    // avg = (1+2+3+4+5+1000+2000)/7 = 430.71, 2×avg = 861.43
    // 1000 > 861.43 → YES, 2000 > 861.43 → YES → 2 flags
    const multiSameTx = [
      { id: 'ms_1', type: 'expense', amount: 1, date: '2025-05-01',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Candy' },
      { id: 'ms_2', type: 'expense', amount: 2, date: '2025-05-02',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Gum' },
      { id: 'ms_3', type: 'expense', amount: 3, date: '2025-05-03',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Water' },
      { id: 'ms_4', type: 'expense', amount: 4, date: '2025-05-04',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Chips' },
      { id: 'ms_5', type: 'expense', amount: 5, date: '2025-05-05',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Soda' },
      { id: 'ms_6', type: 'expense', amount: 1000, date: '2025-05-10',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Party supplies' },
      { id: 'ms_7', type: 'expense', amount: 2000, date: '2025-05-15',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Catering' },
    ];
    render(<AnalyticsView {...defaultProps} transactions={multiSameTx} />);
    const anomalyCard = screen.getByText('Anomaly Detection').closest('[class*="neo-raised"]');
    expect(within(anomalyCard).getByText('Party supplies')).toBeTruthy();
    expect(within(anomalyCard).getByText('Catering')).toBeTruthy();
  });

  it('does NOT flag transactions at exactly 2x the average', () => {
    useFixedDate();
    // avg = (100+200+300)/3 = 200, 2×avg = 400
    // 400 > 400 is FALSE (threshold is strict >, not >=)
    const boundaryTx = [
      { id: 'b_1', type: 'expense', amount: 100, date: '2025-05-01',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Cheap' },
      { id: 'b_2', type: 'expense', amount: 200, date: '2025-05-05',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Normal' },
      { id: 'b_3', type: 'expense', amount: 300, date: '2025-05-10',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Average' },
      { id: 'b_4', type: 'expense', amount: 400, date: '2025-05-15',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Boundary' },
    ];
    render(<AnalyticsView {...defaultProps} transactions={boundaryTx} />);
    expect(screen.getByText(/No anomalies detected this period/)).toBeTruthy();
  });

  it('shows not enough data when all transactions are income', () => {
    useFixedDate();
    const incomeOnlyTx = [
      { id: 'inc_1', type: 'income', amount: 50000, date: '2025-05-01',
        accountId: 'acc_bank', categoryId: 'cat_salary', notes: 'Salary' },
      { id: 'inc_2', type: 'income', amount: 10000, date: '2025-05-05',
        accountId: 'acc_cash', categoryId: 'cat_freelance', notes: 'Freelance' },
      { id: 'inc_3', type: 'income', amount: 2000, date: '2025-05-10',
        accountId: 'acc_cash', categoryId: 'cat_freelance', notes: 'Bonus' },
    ];
    render(<AnalyticsView {...defaultProps} transactions={incomeOnlyTx} />);
    expect(screen.getByText('Need more transactions to detect anomalies.')).toBeTruthy();
  });

  it('handles zero-amount transactions without crashing', () => {
    useFixedDate();
    // avg = (0+100+150+200)/4 = 112.5, 2×avg = 225, none > 225 → no anomalies
    const zeroTx = [
      { id: 'z_1', type: 'expense', amount: 0, date: '2025-05-01',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Free sample' },
      { id: 'z_2', type: 'expense', amount: 100, date: '2025-05-05',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Snack' },
      { id: 'z_3', type: 'expense', amount: 150, date: '2025-05-10',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Coffee' },
      { id: 'z_4', type: 'expense', amount: 200, date: '2025-05-15',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Lunch' },
    ];
    render(<AnalyticsView {...defaultProps} transactions={zeroTx} />);
    expect(screen.getByText(/No anomalies detected this period/)).toBeTruthy();
  });

  it('handles very large anomaly multipliers (10x+)', () => {
    useFixedDate();
    // 20 small txs (10..29) + 1 huge (10000) → avg ≈ (390+10000)/21 ≈ 494.76
    // 2×avg ≈ 989.52, 10000 > 989.52 → YES, multiplier ≈ 10000/494.76 ≈ 20.2×
    const lotsOfSmall = [];
    for (let i = 0; i < 20; i++) {
      lotsOfSmall.push({
        id: `ls_${i}`, type: 'expense', amount: 10 + i, date: '2025-05-01',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Small item',
      });
    }
    lotsOfSmall.push({
      id: 'la_big', type: 'expense', amount: 10000, date: '2025-05-15',
      accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Huge purchase',
    });
    render(<AnalyticsView {...defaultProps} transactions={lotsOfSmall} />);
    const anomalyCard = screen.getByText('Anomaly Detection').closest('[class*="neo-raised"]');
    expect(within(anomalyCard).getByText('Huge purchase')).toBeTruthy();
    expect(within(anomalyCard).getByText(/× category avg/)).toBeTruthy();
  });

  it('shows not enough data when there are no current-month expenses', () => {
    useFixedDate();
    const oldTx = [
      { id: 'old_1', type: 'expense', amount: 100, date: '2025-04-01',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Old snack' },
      { id: 'old_2', type: 'expense', amount: 200, date: '2025-04-05',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Old coffee' },
      { id: 'old_3', type: 'expense', amount: 300, date: '2025-04-10',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Old lunch' },
    ];
    render(<AnalyticsView {...defaultProps} transactions={oldTx} />);
    expect(screen.getByText('Need more transactions to detect anomalies.')).toBeTruthy();
  });

  it('does not flag anomalies when all expenses have the same amount', () => {
    useFixedDate();
    // avg = 100, 2×avg = 200, none > 200 → no anomalies
    const sameTx = [
      { id: 'eq_1', type: 'expense', amount: 100, date: '2025-05-01',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Item 1' },
      { id: 'eq_2', type: 'expense', amount: 100, date: '2025-05-05',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Item 2' },
      { id: 'eq_3', type: 'expense', amount: 100, date: '2025-05-10',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Item 3' },
      { id: 'eq_4', type: 'expense', amount: 100, date: '2025-05-15',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Item 4' },
    ];
    render(<AnalyticsView {...defaultProps} transactions={sameTx} />);
    expect(screen.getByText(/No anomalies detected this period/)).toBeTruthy();
  });

  it('shows not enough data with mix of income and fewer than 3 expenses', () => {
    useFixedDate();
    const mixedTx = [
      { id: 'mix_1', type: 'income', amount: 80000, date: '2025-05-01',
        accountId: 'acc_bank', categoryId: 'cat_salary', notes: 'Salary' },
      { id: 'mix_2', type: 'expense', amount: 100, date: '2025-05-05',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Snack' },
      { id: 'mix_3', type: 'expense', amount: 150, date: '2025-05-10',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Coffee' },
    ];
    render(<AnalyticsView {...defaultProps} transactions={mixedTx} />);
    // Only 2 expenses (< 3), should show not enough data
    expect(screen.getByText('Need more transactions to detect anomalies.')).toBeTruthy();
  });

  it('respects time range: detects anomalies in Last Month when switched', () => {
    useFixedDate();
    // April 2025 data with an anomaly: Transport avg ~433, 1000 > 867 → flag
    const lastMonthTx = [
      { id: 'lm_1', type: 'expense', amount: 100, date: '2025-04-01',
        accountId: 'acc_cash', categoryId: 'cat_transport', notes: 'Bus' },
      { id: 'lm_2', type: 'expense', amount: 200, date: '2025-04-05',
        accountId: 'acc_cash', categoryId: 'cat_transport', notes: 'Train' },
      { id: 'lm_3', type: 'expense', amount: 1000, date: '2025-04-10',
        accountId: 'acc_cash', categoryId: 'cat_transport', notes: 'Flight booking' },
    ];
    render(<AnalyticsView {...defaultProps} transactions={lastMonthTx} />);
    // Default 'month' range (May) — no expenses → not enough data
    expect(screen.getByText('Need more transactions to detect anomalies.')).toBeTruthy();

    // Switch to Last Month (April) — anomaly should appear
    fireEvent.click(screen.getByText('Last Month'));
    const anomalyCard = screen.getByText('Anomaly Detection').closest('[class*="neo-raised"]');
    expect(within(anomalyCard).getByText('Transport')).toBeTruthy();
    expect(within(anomalyCard).getByText('Flight booking')).toBeTruthy();
  });

  it('respects time range: detects anomalies in All Time across all data', () => {
    useFixedDate();
    // Expenses across multiple months — only anomalies in some
    const allTimeTx = [
      // Dec 2024: normal
      { id: 'at_1', type: 'expense', amount: 50, date: '2024-12-01',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Snack' },
      { id: 'at_2', type: 'expense', amount: 60, date: '2024-12-05',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Coffee' },
      // April 2025: normal
      { id: 'at_3', type: 'expense', amount: 100, date: '2025-04-01',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Lunch' },
      // May 2025: anomaly (avg across all 4 = (50+60+100+5000)/4 = 1302.5, 2×=2605, 5000 > 2605 → flag)
      { id: 'at_4', type: 'expense', amount: 5000, date: '2025-05-10',
        accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Huge feast' },
    ];
    render(<AnalyticsView {...defaultProps} transactions={allTimeTx} />);
    // Default 'month' (May) — only 1 expense → not enough data
    expect(screen.getByText('Need more transactions to detect anomalies.')).toBeTruthy();

    // Switch to All Time — all 4 expenses → anomaly flagged
    fireEvent.click(screen.getByText('All Time'));
    const anomalyCard = screen.getByText('Anomaly Detection').closest('[class*="neo-raised"]');
    expect(within(anomalyCard).getByText('Huge feast')).toBeTruthy();
  });

  it('shows no anomalies when switching to 6 Months with only normal data', () => {
    useFixedDate();
    // mockTransactions has 3 expenses in Dec-May range: Food(1500+500=2000), Rent(25000), Transport(2000)
    // avg per category: Food (2tx = avg 1000, 2x=2000, none > 2000), Rent (1tx skipped), Transport (1tx skipped)
    render(<AnalyticsView {...defaultProps} />);
    fireEvent.click(screen.getByText('6 Months'));
    expect(screen.getByText(/No anomalies detected this period/)).toBeTruthy();
  });
});
