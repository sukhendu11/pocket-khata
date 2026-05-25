import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import CalendarView from '../components/CalendarView';

// ==============================================================================
// Mock Data — transactions for May 2025
// ==============================================================================

const mockAccounts = [
  { id: 'acc_cash', name: 'Cash', type: 'Cash', balance: 10000 },
  { id: 'acc_bank', name: 'Bank', type: 'Bank', balance: 50000 },
];

const mockCategories = [
  { id: 'cat_food', name: 'Food', type: 'expense', color: '#ff7b54' },
  { id: 'cat_salary', name: 'Salary', type: 'income', color: '#3cd070' },
  { id: 'cat_rent', name: 'Rent', type: 'expense', color: '#e74c3c' },
];

const mockTransactions = [
  { id: 'tx_1', type: 'expense', amount: 500, date: '2025-05-15',
    accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Lunch' },
  { id: 'tx_2', type: 'expense', amount: 1200, date: '2025-05-15',
    accountId: 'acc_bank', categoryId: 'cat_rent', notes: 'Monthly rent' },
  { id: 'tx_3', type: 'income', amount: 50000, date: '2025-05-16',
    accountId: 'acc_bank', categoryId: 'cat_salary', notes: 'May salary' },
  { id: 'tx_4', type: 'income', amount: 2000, date: '2025-05-20',
    accountId: 'acc_cash', categoryId: 'cat_salary', notes: 'Freelance' },
];

// ==============================================================================
// Helpers
// ==============================================================================

/**
 * Mock the global Date constructor so `new Date()` (no args) returns a fixed date.
 * Calls with arguments (e.g. `new Date('2025-05-15')`) work normally.
 */
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
  categories: mockCategories,
  transactions: mockTransactions,
  onNavigate: () => {},
  onEditTransaction: () => {},
  lang: 'en',
};

beforeEach(() => { cleanup(); vi.clearAllMocks(); });
afterEach(() => { vi.unstubAllGlobals(); });

// ==============================================================================
// Rendering
// ==============================================================================

describe('CalendarView — Rendering', () => {
  it('renders without crashing', () => {
    render(<CalendarView {...defaultProps} />);
    expect(screen.getByText('Financial Calendar')).toBeTruthy();
  });

  it('displays May 2,025 in the month selector', () => {
    useFixedDate();
    render(<CalendarView {...defaultProps} />);
    expect(screen.getByText(/May.*2,025/)).toBeTruthy();
  });

  it('renders 7 weekday headers', () => {
    render(<CalendarView {...defaultProps} />);
    for (const day of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']) {
      expect(screen.getByText(day)).toBeTruthy();
    }
  });

  it('back button calls onNavigate("dashboard")', () => {
    const handleNavigate = vi.fn();
    render(<CalendarView {...defaultProps} onNavigate={handleNavigate} />);
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(handleNavigate).toHaveBeenCalledWith('dashboard');
  });
});

// ==============================================================================
// Month Navigation
// ==============================================================================

describe('CalendarView — Month Navigation', () => {
  it('goes to previous month (May → April)', () => {
    useFixedDate();
    render(<CalendarView {...defaultProps} />);
    const buttons = screen.getAllByRole('button'); // [back, prev, next]
    fireEvent.click(buttons[1]);
    expect(screen.getByText(/April.*2,025/)).toBeTruthy();
  });

  it('goes to next month (May → June)', () => {
    useFixedDate();
    render(<CalendarView {...defaultProps} />);
    const buttons = screen.getAllByRole('button'); // [back, prev, next]
    fireEvent.click(buttons[2]);
    expect(screen.getByText(/June.*2,025/)).toBeTruthy();
  });

  it('navigates across year boundary (Dec → Jan)', () => {
    useFixedDate();
    render(<CalendarView {...defaultProps} />);
    const navBtns = screen.getAllByRole('button'); // [back, prev, next]
    // Click next 7 times: May → Jun → Jul → Aug → Sep → Oct → Nov → Dec
    for (let i = 0; i < 7; i++) fireEvent.click(navBtns[2]);
    expect(screen.getByText(/December.*2,025/)).toBeTruthy();
    fireEvent.click(navBtns[2]);
    expect(screen.getByText(/January.*2,026/)).toBeTruthy();
  });

  it('navigates backwards across year boundary (Jan → Dec)', () => {
    useFixedDate();
    render(<CalendarView {...defaultProps} />);
    const navBtns = screen.getAllByRole('button'); // [back, prev, next]
    // Click prev 4 times: May → Apr → Mar → Feb → Jan
    for (let i = 0; i < 4; i++) fireEvent.click(navBtns[1]);
    expect(screen.getByText(/January.*2,025/)).toBeTruthy();
    fireEvent.click(navBtns[1]);
    expect(screen.getByText(/December.*2,024/)).toBeTruthy();
  });
});

// ==============================================================================
// Day Selection
// ==============================================================================

describe('CalendarView — Day Selection', () => {
  it('selects today (May 15) by default', () => {
    useFixedDate();
    render(<CalendarView {...defaultProps} />);
    // selectedDateStr = '2025-05-15' → heading shows "May 15, 2025"
    expect(screen.getByText(/May 15.*2025/)).toBeTruthy();
  });

  it('highlights the selected day cell', () => {
    useFixedDate();
    const { container } = render(<CalendarView {...defaultProps} />);
    // Selected day cells have both "cursor: pointer" (day cells) AND "accent-color" (selected border)
    const dayCells = container.querySelectorAll('[style*="cursor: pointer"]');
    const selectedCells = Array.from(dayCells).filter(
      el => el.getAttribute('style').includes('accent-color')
    );
    expect(selectedCells.length).toBe(1);
  });

  it('clicking day 20 updates the heading', () => {
    useFixedDate();
    render(<CalendarView {...defaultProps} />);
    fireEvent.click(screen.getByText('20'));
    expect(screen.getByText(/May 20.*2025/)).toBeTruthy();
  });

  it('shows summary labels', () => {
    useFixedDate();
    render(<CalendarView {...defaultProps} />);
    expect(screen.getByText('Day Income')).toBeTruthy();
    expect(screen.getByText('Day Expense')).toBeTruthy();
    expect(screen.getByText('Day Net')).toBeTruthy();
    // May 15: expense = 500+1200 = 1700 → "-৳1,700"
    expect(screen.getByText(/-৳1,700/)).toBeTruthy();
  });

  it('shows correct income after clicking day 16', () => {
    useFixedDate();
    render(<CalendarView {...defaultProps} />);
    fireEvent.click(screen.getByText('16'));
    expect(screen.getByText(/May 16.*2025/)).toBeTruthy();
    expect(screen.getByText(/\+৳50,000/)).toBeTruthy();
    expect(screen.getByText(/-৳0/)).toBeTruthy();
  });

  it('shows correct net after clicking day 16', () => {
    useFixedDate();
    render(<CalendarView {...defaultProps} />);
    fireEvent.click(screen.getByText('16'));
    // Net span = "৳50,000" (no prefix). Income span = "+৳50,000" (has + prefix).
    // Exact match only matches the net span.
    expect(screen.getByText('৳50,000')).toBeTruthy();
  });

  it('shows transaction items for May 15', () => {
    useFixedDate();
    render(<CalendarView {...defaultProps} />);
    expect(screen.getByText('Lunch')).toBeTruthy();
    expect(screen.getByText('Monthly rent')).toBeTruthy();
  });

  it('shows "no records" for a day without transactions', () => {
    useFixedDate();
    render(<CalendarView {...defaultProps} />);
    fireEvent.click(screen.getByText('10'));
    expect(screen.getByText('No financial records logged on this day.')).toBeTruthy();
  });

  it('calls onEditTransaction when clicking a transaction', () => {
    useFixedDate();
    const handleEdit = vi.fn();
    render(<CalendarView {...defaultProps} onEditTransaction={handleEdit} />);
    // Click the Lunch transaction item's clickable wrapper
    const txWrapper = screen.getByText('Lunch').closest('[style*="cursor: pointer"]');
    fireEvent.click(txWrapper);
    expect(handleEdit).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'tx_1', notes: 'Lunch' })
    );
  });
});

// ==============================================================================
// Bangla Mode
// ==============================================================================

describe('CalendarView — Bangla Mode', () => {
  it('renders with Bangla title', () => {
    useFixedDate();
    render(<CalendarView {...defaultProps} lang="bn" />);
    expect(screen.getByText('আর্থিক ক্যালেন্ডার')).toBeTruthy();
    expect(screen.getByText(/মে.*২,০২৫/)).toBeTruthy();
  });

  it('shows Bangla weekday headers', () => {
    useFixedDate();
    render(<CalendarView {...defaultProps} lang="bn" />);
    expect(screen.getByText('রবি')).toBeTruthy();
    expect(screen.getByText('সোম')).toBeTruthy();
    expect(screen.getByText('শনি')).toBeTruthy();
  });

  it('shows Bangla daily summary labels', () => {
    useFixedDate();
    render(<CalendarView {...defaultProps} lang="bn" />);
    expect(screen.getByText('দৈনিক আয়')).toBeTruthy();
    expect(screen.getByText('দৈনিক ব্যয়')).toBeTruthy();
    expect(screen.getByText('দৈনিক নেট')).toBeTruthy();
  });

  it('shows Bangla "no records" message', () => {
    useFixedDate();
    render(<CalendarView {...defaultProps} lang="bn" />);
    fireEvent.click(screen.getByText('10'));
    expect(screen.getByText('এই দিনে কোনো আর্থিক রেকর্ড নেই।')).toBeTruthy();
  });
});

// ==============================================================================
// Edge Cases
// ==============================================================================

describe('CalendarView — Edge Cases', () => {
  it('handles empty transactions', () => {
    useFixedDate();
    render(<CalendarView {...defaultProps} transactions={[]} />);
    expect(screen.getByText('Financial Calendar')).toBeTruthy();
    expect(screen.getByText('No financial records logged on this day.')).toBeTruthy();
  });

  it('handles empty accounts', () => {
    useFixedDate();
    render(<CalendarView {...defaultProps} accounts={[]} />);
    expect(screen.getByText('Financial Calendar')).toBeTruthy();
  });

  it('handles empty categories', () => {
    useFixedDate();
    render(<CalendarView {...defaultProps} categories={[]} />);
    expect(screen.getByText('Financial Calendar')).toBeTruthy();
  });

  it('handles orphan transactions (missing account/category)', () => {
    useFixedDate();
    const orphan = [{
      id: 'tx_orphan', type: 'expense', amount: 999, date: '2025-05-15',
      accountId: 'ghost', categoryId: 'ghost', notes: 'Orphan',
    }];
    render(<CalendarView {...defaultProps} transactions={orphan} />);
    expect(screen.getByText('Orphan')).toBeTruthy();
  });

  it('renders day 1 and day 31 of May', () => {
    useFixedDate();
    render(<CalendarView {...defaultProps} />);
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('31')).toBeTruthy();
  });
});
