import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
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
    expect(screen.getByText('This Month')).toBeTruthy();
    expect(screen.getByText('Last Month')).toBeTruthy();
    expect(screen.getByText('6 Months')).toBeTruthy();
    expect(screen.getByText('All Time')).toBeTruthy();
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
    // The detail view shows the selected amount
    expect(screen.getByText(/৳80,000/)).toBeTruthy();

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
    // Should show detail: amount and name with percentage
    expect(screen.getByText(/৳80,000/)).toBeTruthy();
    expect(screen.getByText(/Total Income/)).toBeTruthy();
  });

  it('clicking the same slice again deselects it', () => {
    useFixedDate();
    useMockRAF();
    render(<AnalyticsView {...defaultProps} />);

    const overviewCard = screen.getByText('Overview').closest('[class*="neo-raised"]');
    const paths = overviewCard.querySelectorAll('path.svg-pie-segment');

    // Select
    fireEvent.click(paths[0]);
    expect(screen.getByText(/Total Income/)).toBeTruthy();

    // Click same slice again to deselect
    fireEvent.click(paths[0]);
    // Should go back to legend view
    expect(screen.getByText(/Income:.*80,000/)).toBeTruthy();
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
    // Legend renders "Salary (100%)" in one span — use regex for percentage
    expect(screen.getByText(/Salary/)).toBeTruthy();
    expect(screen.getByText(/100%/)).toBeTruthy();
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
    expect(screen.getByText(/Rent/)).toBeTruthy();
    expect(screen.getByText(/Food & Drinks/)).toBeTruthy();
    expect(screen.getByText(/94%/)).toBeTruthy();
    expect(screen.getByText(/6%/)).toBeTruthy();
  });

  it('shows expense breakdown with multiple categories for All Time', () => {
    useFixedDate();
    render(<AnalyticsView {...defaultProps} />);
    fireEvent.click(screen.getByText('All Time'));
    // All Time expense: Rent 25k (87%), Food 2k (7%), Transport 2k (7%)
    // Top 3 shown in legend as "Rent (87%)", "Food & Drinks (7%)", "Transport (7%)"
    expect(screen.getByText(/Rent/)).toBeTruthy();
    expect(screen.getByText(/Food & Drinks/)).toBeTruthy();
    expect(screen.getByText(/Transport/)).toBeTruthy();
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
    expect(screen.getByText(/৳25,000/)).toBeTruthy();
    expect(screen.getByText(/Rent.*94%/)).toBeTruthy();
  });

  it('clicking different expense slices switches detail', () => {
    useFixedDate();
    useMockRAF();
    render(<AnalyticsView {...defaultProps} />);

    const expenseCard = screen.getByText('Expense Breakdown').closest('[class*="neo-raised"]');
    const paths = expenseCard.querySelectorAll('path.svg-pie-segment');

    // Click Rent (first)
    fireEvent.click(paths[0]);
    expect(screen.getByText(/Rent.*94%/)).toBeTruthy();

    // Click Food (second) - should switch to Food
    fireEvent.click(paths[1]);
    expect(screen.getByText(/Food & Drinks.*6%/)).toBeTruthy();
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
    expect(screen.getByText('এই মাস')).toBeTruthy();
    expect(screen.getByText('গত মাস')).toBeTruthy();
    expect(screen.getByText('৬ মাস')).toBeTruthy();
    expect(screen.getByText('সব সময়')).toBeTruthy();
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
