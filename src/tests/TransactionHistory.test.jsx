import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import TransactionHistory from '../components/TransactionHistory';

// ==============================================================================
// Mock Data — May 15, 2025
// ==============================================================================

const mockAccounts = [
  { id: 'acc_cash', name: 'Cash Wallet', type: 'Cash', balance: 15000, color: '#3cd070' },
  { id: 'acc_bank', name: 'Prime Bank', type: 'Bank', balance: 85000, color: '#3867d6' },
];

const mockCategories = [
  { id: 'cat_food', name: 'Food & Drinks', type: 'expense', color: '#ff7b54' },
  { id: 'cat_rent', name: 'Rent', type: 'expense', color: '#e74c3c' },
  { id: 'cat_salary', name: 'Salary', type: 'income', color: '#3cd070' },
  { id: 'cat_transport', name: 'Transport', type: 'expense', color: '#fdcb6e' },
  { id: 'cat_freelance', name: 'Freelance', type: 'income', color: '#9b59b6' },
];

const mockTransactions = [
  // May 2025 — sorted by date desc in component
  { id: 'tx_bus', type: 'expense', amount: 2000, date: '2025-05-20',
    accountId: 'acc_cash', categoryId: 'cat_transport', notes: 'Bus pass' },
  { id: 'tx_lunch', type: 'expense', amount: 1500, date: '2025-05-10',
    accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Lunch with team' },
  { id: 'tx_salary', type: 'income', amount: 80000, date: '2025-05-01',
    accountId: 'acc_bank', categoryId: 'cat_salary', notes: 'May salary' },
  { id: 'tx_rent', type: 'expense', amount: 25000, date: '2025-05-01',
    accountId: 'acc_bank', categoryId: 'cat_rent', notes: 'Monthly rent' },
  // April 2025
  { id: 'tx_freelance', type: 'income', amount: 5000, date: '2025-04-15',
    accountId: 'acc_cash', categoryId: 'cat_freelance', notes: 'Freelance gig' },
  { id: 'tx_old_food', type: 'expense', amount: 500, date: '2025-04-10',
    accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Old snack' },
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

/** Open the filter panel and return container + helper to get filter elements. */
function openFilterPanel(props = {}) {
  const utils = render(<TransactionHistory {...defaultProps} {...props} />);
  const buttons = screen.getAllByRole('button');
  fireEvent.click(buttons[1]); // filter toggle button
  return utils;
}

const defaultProps = {
  transactions: mockTransactions,
  accounts: mockAccounts,
  categories: mockCategories,
  onNavigate: () => {},
  onEditTransaction: () => {},
  lang: 'en',
};

beforeEach(() => { cleanup(); vi.clearAllMocks(); });
afterEach(() => { vi.unstubAllGlobals(); });

// ==============================================================================
// Rendering
// ==============================================================================

describe('TransactionHistory — Rendering', () => {
  it('renders without crashing', () => {
    render(<TransactionHistory {...defaultProps} />);
    expect(screen.getByText('Ledger Ledger')).toBeTruthy();
  });

  it('shows the back button', () => {
    render(<TransactionHistory {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2); // back + filter
  });

  it('shows all 3 segment control buttons', () => {
    render(<TransactionHistory {...defaultProps} />);
    expect(screen.getByText('All Transactions')).toBeTruthy();
    expect(screen.getByText('Income')).toBeTruthy();
    expect(screen.getByText('Expense')).toBeTruthy();
  });

  it('shows the search input with placeholder', () => {
    render(<TransactionHistory {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText('Search by note, description...');
    expect(searchInput).toBeTruthy();
  });
});

// ==============================================================================
// Type Filter (Segmented Control)
// ==============================================================================

describe('TransactionHistory — Type Filter', () => {
  it('defaults to All Transactions', () => {
    render(<TransactionHistory {...defaultProps} />);
    expect(screen.getByText('Bus pass')).toBeTruthy();
    expect(screen.getByText('May salary')).toBeTruthy();
  });

  it('clicking Income filters to income-only transactions', () => {
    render(<TransactionHistory {...defaultProps} />);
    fireEvent.click(screen.getByText('Income'));
    expect(screen.getByText('May salary')).toBeTruthy();
    expect(screen.getByText('Freelance gig')).toBeTruthy();
    expect(screen.queryByText('Bus pass')).toBeNull();
    expect(screen.queryByText('Monthly rent')).toBeNull();
  });

  it('clicking Expense filters to expense-only transactions', () => {
    render(<TransactionHistory {...defaultProps} />);
    fireEvent.click(screen.getByText('Expense'));
    expect(screen.getByText('Bus pass')).toBeTruthy();
    expect(screen.getByText('Monthly rent')).toBeTruthy();
    expect(screen.queryByText('May salary')).toBeNull();
    expect(screen.queryByText('Freelance gig')).toBeNull();
  });

  it('filterType prop initialises the segment correctly', () => {
    render(<TransactionHistory {...defaultProps} filterType="income" />);
    expect(screen.getByText('May salary')).toBeTruthy();
    expect(screen.queryByText('Bus pass')).toBeNull();
  });

  it('changing filterType prop updates the segment', () => {
    const { rerender } = render(
      <TransactionHistory {...defaultProps} filterType="income" />
    );
    expect(screen.getByText('May salary')).toBeTruthy();

    rerender(
      <TransactionHistory {...defaultProps} filterType="expense" />
    );
    expect(screen.getByText('Bus pass')).toBeTruthy();
    expect(screen.queryByText('May salary')).toBeNull();
  });
});

// ==============================================================================
// Search
// ==============================================================================

describe('TransactionHistory — Search', () => {
  it('filters transactions by search text matching notes', () => {
    render(<TransactionHistory {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText('Search by note, description...');
    fireEvent.change(searchInput, { target: { value: 'salary' } });
    expect(screen.getByText('May salary')).toBeTruthy();
    expect(screen.queryByText('Bus pass')).toBeNull();
    expect(screen.queryByText('Monthly rent')).toBeNull();
  });

  it('filters transactions by search text matching category name', () => {
    render(<TransactionHistory {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText('Search by note, description...');
    fireEvent.change(searchInput, { target: { value: 'Transport' } });
    expect(screen.getByText('Bus pass')).toBeTruthy();
    expect(screen.queryByText('May salary')).toBeNull();
  });

  it('clears search with the X button', () => {
    const { container } = render(<TransactionHistory {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText('Search by note, description...');
    fireEvent.change(searchInput, { target: { value: 'salary' } });
    expect(screen.queryByText('Bus pass')).toBeNull();

    // Find the X clear button (positioned at right: 12px inside the search wrapper)
    const xButton = container.querySelector('[style*="right: 12px"]');
    expect(xButton).toBeTruthy();
    fireEvent.click(xButton);

    // All transactions restored
    expect(screen.getByText('Bus pass')).toBeTruthy();
    expect(screen.getByText('May salary')).toBeTruthy();
    expect(searchInput).toHaveValue('');
  });
});

// ==============================================================================
// Filter Panel
// ==============================================================================

describe('TransactionHistory — Filter Panel', () => {
  it('toggles filter panel open with the filter button', () => {
    render(<TransactionHistory {...defaultProps} />);
    expect(screen.queryByText(/Reset Filters/i)).toBeNull();

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]); // filter toggle button
    expect(screen.getByText(/Reset Filters/i)).toBeTruthy();
  });

  it('shows filter labels when panel is open', () => {
    render(<TransactionHistory {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]);

    expect(screen.getByText('TYPE')).toBeTruthy();
    expect(screen.getByText('ACCOUNT')).toBeTruthy();
    expect(screen.getByText('CATEGORY')).toBeTruthy();
    expect(screen.getByText('START DATE')).toBeTruthy();
    expect(screen.getByText('END DATE')).toBeTruthy();
  });

  it('account filter shows account names as options', () => {
    const { container } = openFilterPanel();

    // Selects are rendered in DOM order: [type, account, category]
    const selects = container.querySelectorAll('select');
    expect(selects.length).toBeGreaterThanOrEqual(2);
    // Account select options include account names
    expect(screen.getByText('Cash Wallet')).toBeTruthy();
    expect(screen.getByText('Prime Bank')).toBeTruthy();
    expect(screen.getByText('All Accounts')).toBeTruthy();
  });

  it('filters by account', () => {
    const { container } = openFilterPanel();

    const selects = container.querySelectorAll('select');
    const accountSelect = selects[1]; // second select = account
    fireEvent.change(accountSelect, { target: { value: 'acc_bank' } });

    expect(screen.getByText('May salary')).toBeTruthy();
    expect(screen.getByText('Monthly rent')).toBeTruthy();
    expect(screen.queryByText('Bus pass')).toBeNull();
    expect(screen.queryByText('Freelance gig')).toBeNull();
  });

  it('filters by category', () => {
    const { container } = openFilterPanel();

    const selects = container.querySelectorAll('select');
    const categorySelect = selects[2]; // third select = category
    fireEvent.change(categorySelect, { target: { value: 'cat_food' } });

    expect(screen.getByText('Lunch with team')).toBeTruthy();
    expect(screen.getByText('Old snack')).toBeTruthy();
    expect(screen.queryByText('May salary')).toBeNull();
    expect(screen.queryByText('Bus pass')).toBeNull();
  });

  it('filters by date range', () => {
    const { container } = openFilterPanel();

    const dateInputs = container.querySelectorAll('input[type="date"]');
    expect(dateInputs.length).toBe(2);
    fireEvent.change(dateInputs[0], { target: { value: '2025-05-01' } }); // start
    fireEvent.change(dateInputs[1], { target: { value: '2025-05-10' } }); // end

    expect(screen.getByText('Lunch with team')).toBeTruthy();
    expect(screen.getByText('May salary')).toBeTruthy();
    expect(screen.getByText('Monthly rent')).toBeTruthy();
    expect(screen.queryByText('Bus pass')).toBeNull();
    expect(screen.queryByText('Freelance gig')).toBeNull();
    expect(screen.queryByText('Old snack')).toBeNull();
  });

  it('reset filters button clears all filters', () => {
    render(<TransactionHistory {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]); // open filter panel

    // Apply search
    const searchInput = screen.getByPlaceholderText('Search by note, description...');
    fireEvent.change(searchInput, { target: { value: 'salary' } });

    // Click Reset Filters
    const resetBtn = screen.getByText(/Reset Filters/i);
    fireEvent.click(resetBtn);

    expect(screen.getByText('Bus pass')).toBeTruthy();
    expect(screen.getByText('May salary')).toBeTruthy();
    expect(screen.getByText('Monthly rent')).toBeTruthy();
    expect(searchInput).toHaveValue('');
  });
});

// ==============================================================================
// Stats Bar
// ==============================================================================

describe('TransactionHistory — Stats Bar', () => {
  it('shows Filtered In, Filtered Out, and Net Change headers', () => {
    useFixedDate();
    render(<TransactionHistory {...defaultProps} />);
    expect(screen.getByText('Filtered In')).toBeTruthy();
    expect(screen.getByText('Filtered Out')).toBeTruthy();
    expect(screen.getByText('Net Change')).toBeTruthy();
  });

  it('shows correct totals for all transactions', () => {
    useFixedDate();
    render(<TransactionHistory {...defaultProps} />);
    // All: income=85000, expense=29000, net=56000
    expect(screen.getByText(/৳85,000/)).toBeTruthy(); // Filtered In
    expect(screen.getByText(/৳29,000/)).toBeTruthy(); // Filtered Out
    expect(screen.getByText(/৳56,000/)).toBeTruthy(); // Net Change
  });

  it('updates totals when type filter is applied', () => {
    useFixedDate();
    render(<TransactionHistory {...defaultProps} />);
    fireEvent.click(screen.getByText('Income'));
    // Income only: income=85000, expense=0, net=85000
    // Both Filtered In and Net Change show 85,000 — use getAllByText
    const eightyFiveKMatches = screen.getAllByText(/৳85,000/);
    expect(eightyFiveKMatches.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/৳0/)).toBeTruthy(); // Filtered Out = 0
  });

  it('shows negative net for expense-only filter', () => {
    useFixedDate();
    render(<TransactionHistory {...defaultProps} />);
    fireEvent.click(screen.getByText('Expense'));
    // Expense only: income=0, expense=29000, net=-29000
    // formatNumber(-29000, 'en') = "-29,000", component renders "৳-29,000"
    expect(screen.getByText(/৳-29,000/)).toBeTruthy(); // Net Change
  });
});

// ==============================================================================
// Date-Grouped Transactions
// ==============================================================================

describe('TransactionHistory — Date Grouping', () => {
  it('groups transactions by date and shows date headers', () => {
    useFixedDate();
    render(<TransactionHistory {...defaultProps} />);
    expect(screen.getByText(/May 20/)).toBeTruthy();
    expect(screen.getByText(/May 10/)).toBeTruthy();
    // Two transactions on May 1 — date header appears once per group
    expect(screen.getAllByText(/May 1/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Apr 15/)).toBeTruthy();
    expect(screen.getByText(/Apr 10/)).toBeTruthy();
  });

  it('shows all 6 transaction items', () => {
    render(<TransactionHistory {...defaultProps} />);
    expect(screen.getByText('Bus pass')).toBeTruthy();
    expect(screen.getByText('Lunch with team')).toBeTruthy();
    expect(screen.getByText('May salary')).toBeTruthy();
    expect(screen.getByText('Monthly rent')).toBeTruthy();
    expect(screen.getByText('Freelance gig')).toBeTruthy();
    expect(screen.getByText('Old snack')).toBeTruthy();
  });
});

// ==============================================================================
// Empty State
// ==============================================================================

describe('TransactionHistory — Empty State', () => {
  it('shows empty state when no transactions match', () => {
    render(<TransactionHistory {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText('Search by note, description...');
    fireEvent.change(searchInput, { target: { value: 'zzz_nonexistent' } });
    expect(screen.getByText('No matching transactions found.')).toBeTruthy();
    expect(screen.getByText(/Try widening search/)).toBeTruthy();
  });

  it('shows empty state when transactions array is empty', () => {
    render(<TransactionHistory {...defaultProps} transactions={[]} />);
    expect(screen.getByText('No matching transactions found.')).toBeTruthy();
  });

  it('does not show empty state when transactions exist', () => {
    render(<TransactionHistory {...defaultProps} />);
    expect(screen.queryByText('No matching transactions found.')).toBeNull();
  });
});

// ==============================================================================
// Navigation & Callbacks
// ==============================================================================

describe('TransactionHistory — Navigation', () => {
  it('back button calls onNavigate("dashboard")', () => {
    const handleNavigate = vi.fn();
    render(<TransactionHistory {...defaultProps} onNavigate={handleNavigate} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]); // Back button (first button)
    expect(handleNavigate).toHaveBeenCalledWith('dashboard');
  });

  it('clicking a transaction calls onEditTransaction with the transaction', () => {
    const handleEdit = vi.fn();
    render(<TransactionHistory {...defaultProps} onEditTransaction={handleEdit} />);
    const txItem = screen.getByText('Bus pass').closest('[style*="cursor: pointer"]');
    fireEvent.click(txItem);
    expect(handleEdit).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'tx_bus', notes: 'Bus pass' })
    );
  });

  it('calls onEditTransaction for a grouped transaction', () => {
    const handleEdit = vi.fn();
    render(<TransactionHistory {...defaultProps} onEditTransaction={handleEdit} />);
    const txItem = screen.getByText('May salary').closest('[style*="cursor: pointer"]');
    fireEvent.click(txItem);
    expect(handleEdit).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'tx_salary', notes: 'May salary' })
    );
  });
});

// ==============================================================================
// Filter Panel — Advanced Filter Combinations
// ==============================================================================

describe('TransactionHistory — Advanced Filters', () => {
  it('changing type in filter panel filters transactions', () => {
    const { container } = openFilterPanel();

    const selects = container.querySelectorAll('select');
    fireEvent.change(selects[0], { target: { value: 'expense' } }); // type select

    expect(screen.getByText('Bus pass')).toBeTruthy();
    expect(screen.getByText('Monthly rent')).toBeTruthy();
    expect(screen.queryByText('May salary')).toBeNull();
  });

  it('combines type and account filters', () => {
    const { container } = openFilterPanel();

    const selects = container.querySelectorAll('select');
    fireEvent.change(selects[0], { target: { value: 'income' } });   // type
    fireEvent.change(selects[1], { target: { value: 'acc_cash' } }); // account

    expect(screen.getByText('Freelance gig')).toBeTruthy();
    expect(screen.queryByText('May salary')).toBeNull();
    expect(screen.queryByText('Bus pass')).toBeNull();
  });
});

// ==============================================================================
// Bangla Mode
// ==============================================================================

describe('TransactionHistory — Bangla Mode', () => {
  it('renders title in Bangla', () => {
    render(<TransactionHistory {...defaultProps} lang="bn" />);
    expect(screen.getByText('লেজার খাতা')).toBeTruthy();
  });

  it('shows segment labels in Bangla', () => {
    render(<TransactionHistory {...defaultProps} lang="bn" />);
    expect(screen.getByText('সকল লেনদেন')).toBeTruthy();
    expect(screen.getByText('আয়')).toBeTruthy();
    expect(screen.getByText('ব্যয়')).toBeTruthy();
  });

  it('shows stats bar labels in Bangla', () => {
    render(<TransactionHistory {...defaultProps} lang="bn" />);
    expect(screen.getByText('ফিল্টার্ড ইন')).toBeTruthy();
    expect(screen.getByText('ফিল্টার্ড আউট')).toBeTruthy();
    expect(screen.getByText('নেট পরিবর্তন')).toBeTruthy();
  });

  it('shows empty state in Bangla', () => {
    render(<TransactionHistory {...defaultProps} lang="bn" transactions={[]} />);
    expect(screen.getByText('কোনো মিল খুঁজে পাওয়া যায়নি।')).toBeTruthy();
  });

  it('shows filter panel labels in Bangla', () => {
    openFilterPanel({ lang: 'bn' });
    expect(screen.getByText('ধরণ')).toBeTruthy();
    expect(screen.getByText('একাউন্ট')).toBeTruthy();
    expect(screen.getByText('ক্যাটাগরি')).toBeTruthy();
  });
});

// ==============================================================================
// Edge Cases
// ==============================================================================

describe('TransactionHistory — Edge Cases', () => {
  it('handles empty transactions', () => {
    render(<TransactionHistory {...defaultProps} transactions={[]} />);
    expect(screen.getByText('Ledger Ledger')).toBeTruthy();
    expect(screen.getByText('No matching transactions found.')).toBeTruthy();
  });

  it('handles empty accounts gracefully', () => {
    render(<TransactionHistory {...defaultProps} accounts={[]} />);
    expect(screen.getByText('Ledger Ledger')).toBeTruthy();
    expect(screen.getByText('Bus pass')).toBeTruthy();
  });

  it('handles empty categories gracefully', () => {
    render(<TransactionHistory {...defaultProps} categories={[]} />);
    expect(screen.getByText('Ledger Ledger')).toBeTruthy();
    expect(screen.getByText('Bus pass')).toBeTruthy();
  });

  it('handles undefined transactions gracefully', () => {
    render(<TransactionHistory {...defaultProps} transactions={undefined} />);
    expect(screen.getByText('Ledger Ledger')).toBeTruthy();
  });

  it('handles undefined accounts and categories gracefully', () => {
    render(<TransactionHistory {...defaultProps} accounts={undefined} categories={undefined} />);
    expect(screen.getByText('Ledger Ledger')).toBeTruthy();
  });

  it('handles missing optional props gracefully', () => {
    render(<TransactionHistory transactions={mockTransactions} onNavigate={() => {}} />);
    expect(screen.getByText('Ledger Ledger')).toBeTruthy();
  });

  it('handles all data empty', () => {
    render(
      <TransactionHistory
        transactions={[]}
        accounts={[]}
        categories={[]}
        onNavigate={() => {}}
        onEditTransaction={() => {}}
        lang="en"
      />
    );
    expect(screen.getByText('No matching transactions found.')).toBeTruthy();
  });

  it('handles filter panel with empty accounts and categories', () => {
    const { container } = openFilterPanel({ accounts: [], categories: [] });

    expect(screen.getByText('TYPE')).toBeTruthy();
    expect(screen.getByText('ACCOUNT')).toBeTruthy();
    expect(screen.getByText('All Accounts')).toBeTruthy();

    // Category select still renders with just "All Categories" option
    const selects = container.querySelectorAll('select');
    expect(selects.length).toBe(3); // type + account + category
  });
});
