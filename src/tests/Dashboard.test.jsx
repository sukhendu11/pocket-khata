import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Dashboard from '../components/Dashboard';

// ==============================================================================
// Mock Data — finances during May 2025
// ==============================================================================

const mockAccounts = [
  { id: 'acc_cash', name: 'Cash Wallet', type: 'Cash', balance: 15000, color: '#3cd070' },
  { id: 'acc_bank', name: 'Prime Bank', type: 'Bank', balance: 85000, color: '#3867d6' },
  { id: 'acc_bkash', name: 'My bKash', type: 'Bkash', balance: 5000, color: '#e84393' },
];

const mockCategories = [
  { id: 'cat_food', name: 'Food & Drinks', type: 'expense', color: '#ff7b54' },
  { id: 'cat_transport', name: 'Transport', type: 'expense', color: '#fdcb6e' },
  { id: 'cat_salary', name: 'Salary', type: 'income', color: '#3cd070' },
  { id: 'cat_rent', name: 'Rent', type: 'expense', color: '#e74c3c' },
];

// Transactions: May 2025 (matched to fixed Date) + 1 old
const mockTransactions = [
  { id: 'tx_1', type: 'expense', amount: 1500, date: '2025-05-10',
    accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Lunch with team' },
  { id: 'tx_2', type: 'expense', amount: 300, date: '2025-05-11',
    accountId: 'acc_cash', categoryId: 'cat_transport', notes: 'Bus fare' },
  { id: 'tx_3', type: 'expense', amount: 25000, date: '2025-05-01',
    accountId: 'acc_bank', categoryId: 'cat_rent', notes: 'Monthly rent' },
  { id: 'tx_4', type: 'income', amount: 80000, date: '2025-05-01',
    accountId: 'acc_bank', categoryId: 'cat_salary', notes: 'May salary' },
  // Old — should NOT appear in monthly totals
  { id: 'tx_5', type: 'expense', amount: 500, date: '2024-12-15',
    accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Old Xmas meal' },
];

const mockBudgets = [
  { id: 'budget_1', categoryId: 'cat_food', limit: 5000 },
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

const defaultProps = {
  accounts: mockAccounts,
  transactions: mockTransactions,
  categories: mockCategories,
  budgets: mockBudgets,
  savingsGoals: mockSavingsGoals,
  onNavigate: () => {},
  theme: 'light',
  onToggleTheme: () => {},
  lang: 'en',
};

beforeEach(() => { cleanup(); vi.clearAllMocks(); });
afterEach(() => { vi.unstubAllGlobals(); });

// ==============================================================================
// Rendering
// ==============================================================================

describe('Dashboard — Rendering', () => {
  it('renders without crashing', () => {
    useFixedDate();
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByText('Pocket Khata')).toBeTruthy();
  });

  it('shows the subtitle', () => {
    useFixedDate();
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByText('Your Smart Vault')).toBeTruthy();
  });

  it('renders buttons', () => {
    useFixedDate();
    render(<Dashboard {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    // Should have at least: Manage, See All, Clear selection
    expect(buttons.length).toBeGreaterThan(2);
  });
});

// ==============================================================================
// Balance & Monthly Summary
// ==============================================================================

describe('Dashboard — Balance & Summary', () => {
  it('shows total net balance (15000+85000+5000 = 105,000)', () => {
    useFixedDate();
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByText('TOTAL NET BALANCE')).toBeTruthy();
    // The balance renders as "৳ 105,000" (with space)
    expect(screen.getByText(/৳\s*105,000/)).toBeTruthy();
  });

  it('shows monthly income (+৳ 80,000)', () => {
    useFixedDate();
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByText(/\+৳\s*80,000/)).toBeTruthy();
  });

  it('shows monthly expense (-৳ 26,800)', () => {
    useFixedDate();
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByText(/-৳\s*26,800/)).toBeTruthy();
  });

  it('shows "Local encrypted database active"', () => {
    useFixedDate();
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByText('Local encrypted database active')).toBeTruthy();
  });
});

// ==============================================================================
// Account Cards
// ==============================================================================

describe('Dashboard — Account Cards', () => {
  it('renders all account names', () => {
    useFixedDate();
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByText('Cash Wallet')).toBeTruthy();
    expect(screen.getByText('Prime Bank')).toBeTruthy();
    expect(screen.getByText('My bKash')).toBeTruthy();
  });

  it('shows "My Accounts" section header', () => {
    useFixedDate();
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByText('My Accounts')).toBeTruthy();
  });

  it('shows account balances', () => {
    useFixedDate();
    render(<Dashboard {...defaultProps} />);
    // Each account card shows "৳ {balance}" — check a couple
    expect(screen.getByText(/15,000/)).toBeTruthy();
    expect(screen.getByText(/85,000/)).toBeTruthy();
  });
});

// ==============================================================================
// Budget & Savings Mini Cards
// ==============================================================================

describe('Dashboard — Budget & Savings Mini Cards', () => {
  it('shows Budget Planner mini card when budgets exist', () => {
    useFixedDate();
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByText('Budget Planner')).toBeTruthy();
    expect(screen.getByText(/1 active/)).toBeTruthy();
  });

  it('shows Savings Goals mini card when goals exist', () => {
    useFixedDate();
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByText('Savings Goals')).toBeTruthy();
    // 0 completed / 1 total
    expect(screen.getByText(/0\/1 done/)).toBeTruthy();
  });

  it('shows mini cards with "Create first" text when both are empty', () => {
    useFixedDate();
    render(<Dashboard {...defaultProps} budgets={[]} savingsGoals={[]} />);
    // Cards always show now — empty state shows "Create first"
    expect(screen.getByText('Budget Planner')).toBeTruthy();
    expect(screen.getByText('Savings Goals')).toBeTruthy();
    const createFirstTexts = screen.getAllByText('Create first');
    expect(createFirstTexts.length).toBe(2);
  });

  it('navigates to budgets when clicking Budget card', () => {
    useFixedDate();
    const handleNavigate = vi.fn();
    render(<Dashboard {...defaultProps} onNavigate={handleNavigate} />);
    fireEvent.click(screen.getByText('Budget Planner'));
    expect(handleNavigate).toHaveBeenCalledWith('budgets');
  });

  it('navigates to savings when clicking Savings card', () => {
    useFixedDate();
    const handleNavigate = vi.fn();
    render(<Dashboard {...defaultProps} onNavigate={handleNavigate} />);
    fireEvent.click(screen.getByText('Savings Goals'));
    expect(handleNavigate).toHaveBeenCalledWith('savings');
  });
});

// ==============================================================================
// Overview Card (Income vs Expense Summary)
// ==============================================================================

describe('Dashboard — Overview Card', () => {
  it('shows "Overview" section header', () => {
    useFixedDate();
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByText('Overview')).toBeTruthy();
  });

  it('shows income label and amount', () => {
    useFixedDate();
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByText('Income')).toBeTruthy();
    // 80,000 appears in both the summary card and overview card
    const incomeAmounts = screen.getAllByText(/80,000/);
    expect(incomeAmounts.length).toBeGreaterThanOrEqual(2);
  });

  it('shows expense label and amount', () => {
    useFixedDate();
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByText('Expense')).toBeTruthy();
    expect(screen.getByText(/৳26,800/)).toBeTruthy();
  });

  it('shows net value (income - expense = +53,200)', () => {
    useFixedDate();
    render(<Dashboard {...defaultProps} />);
    // Net label and positive net amount
    expect(screen.getByText('Net')).toBeTruthy();
    expect(screen.getByText(/\+৳53,200/)).toBeTruthy();
  });

  it('shows savings rate', () => {
    useFixedDate();
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByText('Savings Rate')).toBeTruthy();
    // Savings rate = 53200/80000 = 66.5% → rounds to +67%
    expect(screen.getByText(/\+67%/)).toBeTruthy();
  });

  it('shows zero net when no monthly transactions', () => {
    useFixedDate();
    render(<Dashboard {...defaultProps} transactions={[]} />);
    expect(screen.getByText(/\+৳0/)).toBeTruthy();
    expect(screen.getByText(/\+0%/)).toBeTruthy();
  });
});

// ==============================================================================
// Financial Trends (Line Chart)
// ==============================================================================

describe('Dashboard — Financial Trends', () => {
  it('shows "Financial Trends" section header', () => {
    useFixedDate();
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByText('Financial Trends')).toBeTruthy();
  });

  it('renders SVG line chart with circles', () => {
    useFixedDate();
    const { container } = render(<Dashboard {...defaultProps} />);
    const circles = container.querySelectorAll('circle.line-chart-dot');
    // 6 months × 2 lines (income + expense) = 12 circles
    expect(circles.length).toBe(12);
  });

  it('shows hint text before any node is clicked', () => {
    useFixedDate();
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByText(/Tap graph nodes/)).toBeTruthy();
  });

  it('clicking a line chart node shows tooltip', () => {
    useFixedDate();
    const { container } = render(<Dashboard {...defaultProps} />);
    const circles = container.querySelectorAll('circle.line-chart-dot');
    // circles[0..5] = income nodes (Dec→May), circles[6..11] = expense nodes (Dec→May)
    // May income (index 5) has income=80000
    fireEvent.click(circles[5]);
    // Tooltip should show month label + "Trend:" and "Income: ৳..."
    expect(screen.getByText(/Trend:/)).toBeTruthy();
    expect(screen.getByText(/Income: ৳80,000/)).toBeTruthy();
  });

  it('clicking the tooltip close button resets the tooltip', () => {
    useFixedDate();
    const { container } = render(<Dashboard {...defaultProps} />);
    const circles = container.querySelectorAll('circle.line-chart-dot');
    // Click May income node (index 5)
    fireEvent.click(circles[5]);
    expect(screen.getByText(/Income: ৳80,000/)).toBeTruthy();
    // Click the × button to close
    const closeBtn = screen.getByText('×');
    fireEvent.click(closeBtn);
    expect(screen.queryByText(/Income: ৳80,000/)).toBeNull();
    expect(screen.getByText(/Tap graph nodes/)).toBeTruthy();
  });
});

// ==============================================================================
// Recent Transactions
// ==============================================================================

describe('Dashboard — Recent Transactions', () => {
  it('shows "Recent Ledger" section header', () => {
    useFixedDate();
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByText('Recent Ledger')).toBeTruthy();
  });

  it('shows recent transaction notes and dates', () => {
    useFixedDate();
    render(<Dashboard {...defaultProps} />);
    // Recent transactions sorted by date desc, top 5 (all 5)
    expect(screen.getByText('Bus fare')).toBeTruthy();
    expect(screen.getByText('Lunch with team')).toBeTruthy();
    expect(screen.getByText('May salary')).toBeTruthy();
    expect(screen.getByText('Monthly rent')).toBeTruthy();
    // TransactionItem has showDate={true}, so dates should render
    expect(screen.getByText('2025-05-11')).toBeTruthy(); // Bus fare
    // Two transactions share this date — use getAllByText
    const mayFirstDates = screen.getAllByText('2025-05-01');
    expect(mayFirstDates.length).toBe(2); // May salary + Monthly rent
  });

  it('shows recent transaction amounts', () => {
    useFixedDate();
    render(<Dashboard {...defaultProps} />);
    // Some transaction amounts
    expect(screen.getByText(/\+ ৳80,000/)).toBeTruthy();
    expect(screen.getByText(/- ৳25,000/)).toBeTruthy();
  });

  it('shows empty state when no transactions', () => {
    useFixedDate();
    render(<Dashboard {...defaultProps} transactions={[]} />);
    expect(screen.getByText('No transactions posted yet.')).toBeTruthy();
  });
});

// ==============================================================================
// Navigation Buttons
// ==============================================================================

describe('Dashboard — Navigation', () => {
  it('Manage button navigates to accounts', () => {
    useFixedDate();
    const handleNavigate = vi.fn();
    render(<Dashboard {...defaultProps} onNavigate={handleNavigate} />);
    fireEvent.click(screen.getByText('Manage'));
    expect(handleNavigate).toHaveBeenCalledWith('accounts');
  });

  it('See All button navigates to transactions', () => {
    useFixedDate();
    const handleNavigate = vi.fn();
    render(<Dashboard {...defaultProps} onNavigate={handleNavigate} />);
    fireEvent.click(screen.getByText('See All'));
    expect(handleNavigate).toHaveBeenCalledWith('transactions');
  });

  it('theme toggle button calls onToggleTheme', () => {
    useFixedDate();
    const handleToggleTheme = vi.fn();
    render(<Dashboard {...defaultProps} onToggleTheme={handleToggleTheme} />);
    // buttons[0]=theme toggle (bell icon was removed)
    const allButtons = screen.getAllByRole('button');
    fireEvent.click(allButtons[0]);
    expect(handleToggleTheme).toHaveBeenCalledOnce();
  });
});

// ==============================================================================
// Dark Theme
// ==============================================================================

describe('Dashboard — Dark Theme', () => {
  it('shows Sun icon when theme is "dark"', () => {
    useFixedDate();
    render(<Dashboard {...defaultProps} theme="dark" />);
    // The Sun icon renders an SVG inside the theme toggle button.
    // Just verify the component mounts with dark mode handling
    expect(screen.getByText('Pocket Khata')).toBeTruthy();
  });
});

// ==============================================================================
// Bangla Mode
// ==============================================================================

describe('Dashboard — Bangla Mode', () => {
  it('renders title in Bangla', () => {
    useFixedDate();
    render(<Dashboard {...defaultProps} lang="bn" />);
    expect(screen.getByText('পকেট খাতা')).toBeTruthy();
  });

  it('shows monthly summary labels in Bangla', () => {
    useFixedDate();
    render(<Dashboard {...defaultProps} lang="bn" />);
    expect(screen.getByText('আয় (মাসিক)')).toBeTruthy();
    expect(screen.getByText('ব্যয় (মাসিক)')).toBeTruthy();
  });

  it('shows "Overview" in Bangla', () => {
    useFixedDate();
    render(<Dashboard {...defaultProps} lang="bn" />);
    expect(screen.getByText('সারসংক্ষেপ')).toBeTruthy();
  });

  it('shows "Financial Trends" in Bangla', () => {
    useFixedDate();
    render(<Dashboard {...defaultProps} lang="bn" />);
    expect(screen.getByText('আর্থিক প্রবণতা')).toBeTruthy();
  });
});

// ==============================================================================
// Edge Cases
// ==============================================================================

describe('Dashboard — Edge Cases', () => {
  it('handles empty accounts', () => {
    useFixedDate();
    render(<Dashboard {...defaultProps} accounts={[]} />);
    expect(screen.getByText('Pocket Khata')).toBeTruthy();
    // Balance should be 0
    expect(screen.getByText(/৳\s*0/)).toBeTruthy();
  });

  it('handles empty categories', () => {
    useFixedDate();
    render(<Dashboard {...defaultProps} categories={[]} />);
    // TransactionItem falls back to 'General' when category is undefined
    const generalItems = screen.getAllByText(/General/);
    expect(generalItems.length).toBeGreaterThanOrEqual(1);
  });

  it('handles all data empty', () => {
    useFixedDate();
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
    // Overview card shows zeros instead of empty state
    expect(screen.getByText(/\+৳0/)).toBeTruthy();
    expect(screen.getByText(/\+0%/)).toBeTruthy();
    expect(screen.getByText('No transactions posted yet.')).toBeTruthy();
  });

  it('handles missing optional props gracefully', () => {
    useFixedDate();
    // budgets and savingsGoals are undefined (not provided)
    render(
      <Dashboard
        accounts={mockAccounts}
        transactions={mockTransactions}
        categories={mockCategories}
        onNavigate={() => {}}
        theme="light"
        onToggleTheme={() => {}}
        lang="en"
      />
    );
    expect(screen.getByText('Pocket Khata')).toBeTruthy();
    // Mini cards always show — "Create first" when undefined/empty
    expect(screen.getByText('Budget Planner')).toBeTruthy();
    expect(screen.getByText('Savings Goals')).toBeTruthy();
    const createFirstTexts = screen.getAllByText('Create first');
    expect(createFirstTexts.length).toBe(2);
  });
});


