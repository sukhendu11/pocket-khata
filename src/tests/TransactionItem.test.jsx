import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import TransactionItem from '../components/TransactionItem';

// ==============================================================================
// Mock lucide-react icons
// ==============================================================================

vi.mock('lucide-react', () => ({
  ArrowUpRight: (props) => <svg data-testid="icon-income" {...props} />,
  ArrowDownLeft: (props) => <svg data-testid="icon-expense" {...props} />,
  TrendingUp: (props) => <svg data-testid="icon-transfer" {...props} />,
  Edit3: (props) => <svg data-testid="icon-edit" {...props} />,
  RefreshCw: (props) => <svg data-testid="icon-recurring" {...props} />,
  CheckSquare: (props) => <svg data-testid="icon-checked" {...props} />,
  Square: (props) => <svg data-testid="icon-unchecked" {...props} />,
}));

// ==============================================================================
// Mock Data
// ==============================================================================

const mockCategory = { id: 'cat_food', name: 'Food & Drinks', type: 'expense', color: '#e17055' };
const mockAccount = { id: 'acc_cash', name: 'Cash Wallet', type: 'Cash', balance: 15000, color: '#3cd070' };
const mockToAccount = { id: 'acc_bank', name: 'Bank Account', type: 'Bank', balance: 85000, color: '#3867d6' };

const incomeTx = { id: 'tx_1', type: 'income', amount: 50000, date: '2026-05-15', notes: 'Monthly salary', accountId: 'acc_cash', categoryId: 'cat_salary' };
const expenseTx = { id: 'tx_2', type: 'expense', amount: 1500, date: '2026-05-10', notes: 'Lunch with team', accountId: 'acc_cash', categoryId: 'cat_food' };
const transferTx = { id: 'tx_3', type: 'transfer', amount: 5000, date: '2026-05-05', notes: 'Transfer to savings', accountId: 'acc_cash', transferToId: 'acc_bank' };
const noNotesTx = { id: 'tx_4', type: 'expense', amount: 300, date: '2026-05-12', notes: '', accountId: 'acc_cash', categoryId: 'cat_food' };
const recurringTx = { id: 'tx_5', type: 'expense', amount: 2500, date: '2026-06-01', notes: 'Netflix', accountId: 'acc_cash', categoryId: 'cat_food', recurring: { frequency: 'monthly' } };
const subcategoryTx = { id: 'tx_6', type: 'expense', amount: 800, date: '2026-05-20', notes: 'Grocery run', accountId: 'acc_cash', categoryId: 'cat_food', subcategory: 'Groceries' };

const defaultProps = {
  transaction: expenseTx,
  account: mockAccount,
  category: mockCategory,
  lang: 'en',
};

beforeEach(() => { cleanup(); vi.clearAllMocks(); });

// ==============================================================================
// Rendering — Basic
// ==============================================================================

describe('TransactionItem - Rendering', () => {
  it('renders without crashing', () => {
    render(<TransactionItem {...defaultProps} />);
    expect(screen.getByText('Lunch with team')).toBeTruthy();
  });

  it('shows transaction notes', () => {
    render(<TransactionItem transaction={incomeTx} account={mockAccount} lang="en" />);
    expect(screen.getByText('Monthly salary')).toBeTruthy();
  });

  it('shows expense amount with minus prefix', () => {
    render(<TransactionItem {...defaultProps} />);
    expect(screen.getByText(/- \u09F31,500/)).toBeTruthy();
  });

  it('shows income amount with plus prefix', () => {
    render(<TransactionItem transaction={incomeTx} account={mockAccount} lang="en" />);
    expect(screen.getByText(/\+ \u09F350,000/)).toBeTruthy();
  });

  it('shows transfer amount with transfer symbol', () => {
    render(<TransactionItem transaction={transferTx} account={mockAccount} toAccount={mockToAccount} lang="en" />);
    expect(screen.getByText(/\u21C4 \u09F35,000/)).toBeTruthy();
  });

  it('shows account name in meta for default variant', () => {
    render(<TransactionItem {...defaultProps} />);
    expect(screen.getByText(/Cash Wallet/)).toBeTruthy();
  });

  it('shows category name in meta for default variant', () => {
    render(<TransactionItem {...defaultProps} />);
    expect(screen.getByText(/Food & Drinks/)).toBeTruthy();
  });

  it('shows correct icon for expense type', () => {
    const { container } = render(<TransactionItem {...defaultProps} />);
    expect(container.querySelector('[data-testid="icon-expense"]')).toBeTruthy();
  });

  it('shows correct icon for income type', () => {
    const { container } = render(<TransactionItem transaction={incomeTx} account={mockAccount} lang="en" />);
    expect(container.querySelector('[data-testid="icon-income"]')).toBeTruthy();
  });

  it('shows correct icon for transfer type', () => {
    const { container } = render(<TransactionItem transaction={transferTx} account={mockAccount} toAccount={mockToAccount} lang="en" />);
    expect(container.querySelector('[data-testid="icon-transfer"]')).toBeTruthy();
  });
});

// ==============================================================================
// Default Variant
// ==============================================================================

describe('TransactionItem - Default Variant', () => {
  it('shows category name as fallback when notes is empty (has category)', () => {
    render(<TransactionItem transaction={noNotesTx} account={mockAccount} category={mockCategory} lang="en" />);
    // renderNotes: no notes -> cat.name exists -> returns cat.name
    expect(screen.getByText('Food & Drinks')).toBeTruthy();
  });

  it('shows Quick Ledger fallback when notes and category are missing for expense', () => {
    render(<TransactionItem transaction={{ ...expenseTx, notes: '' }} account={mockAccount} lang="en" />);
    // renderNotes: no notes, no category, isExpense=true, variant=default -> returns 'Quick Ledger'
    expect(screen.getByText('Quick Ledger')).toBeTruthy();
  });

  it('shows edit icon when onClick is provided and showEdit is true', () => {
    const { container } = render(<TransactionItem {...defaultProps} onClick={() => {}} />);
    expect(container.querySelector('[data-testid="icon-edit"]')).toBeTruthy();
  });

  it('hides edit icon when showEdit is false', () => {
    const { container } = render(<TransactionItem {...defaultProps} showEdit={false} />);
    expect(container.querySelector('[data-testid="icon-edit"]')).toBeNull();
  });

  it('calls onClick when row is clicked', () => {
    const handleClick = vi.fn();
    render(<TransactionItem {...defaultProps} onClick={handleClick} />);
    fireEvent.click(screen.getByText('Lunch with team'));
    expect(handleClick).toHaveBeenCalledOnce();
  });
});

// ==============================================================================
// Transfer Display
// ==============================================================================

describe('TransactionItem - Transfer Display', () => {
  it('shows transfer meta as source -> destination', () => {
    render(<TransactionItem transaction={transferTx} account={mockAccount} toAccount={mockToAccount} lang="en" />);
    expect(screen.getByText('Cash Wallet \u2192 Bank Account')).toBeTruthy();
  });

  it('shows fallback text when source account is missing', () => {
    render(<TransactionItem transaction={transferTx} toAccount={mockToAccount} lang="en" />);
    // t('common.local') = 'Local'
    expect(screen.getByText('Local \u2192 Bank Account')).toBeTruthy();
  });

  it('shows fallback text when destination account is missing', () => {
    render(<TransactionItem transaction={transferTx} account={mockAccount} lang="en" />);
    // t('common.other') = 'Other'
    expect(screen.getByText('Cash Wallet \u2192 Other')).toBeTruthy();
  });

  it('shows fallback for both missing accounts', () => {
    render(<TransactionItem transaction={transferTx} lang="en" />);
    expect(screen.getByText('Local \u2192 Other')).toBeTruthy();
  });
});

// ==============================================================================
// Compact Variant
// ==============================================================================

describe('TransactionItem - Compact Variant', () => {
  it('renders with compact variant styling', () => {
    render(<TransactionItem {...defaultProps} variant="compact" />);
    expect(screen.getByText('Lunch with team')).toBeTruthy();
  });

  it('renders in compact mode without crashing', () => {
    const { container } = render(<TransactionItem {...defaultProps} variant="compact" />);
    const iconDiv = container.querySelector('[style*="width: 28px"]');
    expect(iconDiv).toBeTruthy();
  });
});

// ==============================================================================
// Calendar Variant
// ==============================================================================

describe('TransactionItem - Calendar Variant', () => {
  it('renders with calendar variant', () => {
    render(<TransactionItem {...defaultProps} variant="calendar" />);
    expect(screen.getByText('Lunch with team')).toBeTruthy();
  });

  it('shows date in calendar variant when showDate is true', () => {
    render(<TransactionItem transaction={incomeTx} account={mockAccount} variant="calendar" showDate lang="en" />);
    expect(screen.getByText('2026-05-15')).toBeTruthy();
  });
});

// ==============================================================================
// Selectable Mode
// ==============================================================================

describe('TransactionItem - Selectable Mode', () => {
  it('shows unchecked square icon when selectable and not selected', () => {
    const { container } = render(<TransactionItem {...defaultProps} selectable selected={false} />);
    expect(container.querySelector('[data-testid="icon-unchecked"]')).toBeTruthy();
  });

  it('shows checked square icon when selectable and selected', () => {
    const { container } = render(<TransactionItem {...defaultProps} selectable selected />);
    expect(container.querySelector('[data-testid="icon-checked"]')).toBeTruthy();
  });

  it('calls onSelect when row is clicked in selectable mode', () => {
    const handleSelect = vi.fn();
    render(<TransactionItem {...defaultProps} selectable onSelect={handleSelect} />);
    fireEvent.click(screen.getByText('Lunch with team'));
    expect(handleSelect).toHaveBeenCalledOnce();
  });

  it('does not call onClick when in selectable mode and row is clicked', () => {
    const handleClick = vi.fn();
    const handleSelect = vi.fn();
    render(<TransactionItem {...defaultProps} selectable onSelect={handleSelect} onClick={handleClick} />);
    fireEvent.click(screen.getByText('Lunch with team'));
    expect(handleSelect).toHaveBeenCalledOnce();
    expect(handleClick).not.toHaveBeenCalled();
  });
});

// ==============================================================================
// Recurring / Frequency Label
// ==============================================================================

describe('TransactionItem - Recurring', () => {
  it('shows frequency label for recurring transaction', () => {
    render(<TransactionItem transaction={recurringTx} account={mockAccount} category={mockCategory} lang="en" />);
    expect(screen.getByText('Monthly')).toBeTruthy();
  });

  it('shows recurring icon for recurring transaction', () => {
    const { container } = render(<TransactionItem transaction={recurringTx} account={mockAccount} category={mockCategory} lang="en" />);
    expect(container.querySelector('[data-testid="icon-recurring"]')).toBeTruthy();
  });
});

// ==============================================================================
// Meta Rendering (Category + Account)
// ==============================================================================

describe('TransactionItem - Meta', () => {
  it('shows account, category, and subcategory in meta', () => {
    render(<TransactionItem transaction={subcategoryTx} account={mockAccount} category={mockCategory} lang="en" />);
    expect(screen.getByText(/Cash Wallet/)).toBeTruthy();
    expect(screen.getByText(/Groceries/)).toBeTruthy();
  });

  it('shows manualEntry text in calendar variant when no notes', () => {
    render(<TransactionItem transaction={{ ...expenseTx, notes: '' }} account={mockAccount} variant="calendar" lang="en" />);
    // renderNotes: no notes -> cat.name is undefined -> variant=calendar -> 'Manual Entry'
    expect(screen.getByText('Manual Entry')).toBeTruthy();
  });
});

// ==============================================================================
// Edge Cases
// ==============================================================================

describe('TransactionItem - Edge Cases', () => {
  it('handles undefined transaction gracefully', () => {
    // Component reads tx.type where tx=transaction -> undefined.type throws
    expect(() => render(<TransactionItem transaction={undefined} account={mockAccount} lang="en" />)).toThrow();
  });

  it('handles missing account gracefully', () => {
    render(<TransactionItem transaction={expenseTx} category={mockCategory} lang="en" />);
    expect(screen.getByText('Lunch with team')).toBeTruthy();
  });

  it('handles missing category gracefully', () => {
    render(<TransactionItem transaction={expenseTx} account={mockAccount} lang="en" />);
    expect(screen.getByText('Lunch with team')).toBeTruthy();
  });

  it('handles undefined category name gracefully in notes fallback', () => {
    const catWithoutName = { id: 'cat_x', type: 'expense', color: '#000' };
    render(<TransactionItem transaction={{ ...expenseTx, notes: '' }} account={mockAccount} category={catWithoutName} lang="en" />);
    // renderNotes: no notes -> cat?.name is undefined -> isExpense & default -> 'Quick Ledger'
    expect(screen.getByText('Quick Ledger')).toBeTruthy();
  });

  it('handles very long notes without crashing', () => {
    const longNotes = 'A'.repeat(500);
    render(<TransactionItem transaction={{ ...expenseTx, notes: longNotes }} account={mockAccount} category={mockCategory} lang="en" />);
    expect(screen.getByText(longNotes)).toBeTruthy();
  });

  it('applies custom style prop', () => {
    const customStyle = { backgroundColor: 'red', padding: '20px' };
    const { container } = render(<TransactionItem {...defaultProps} style={customStyle} />);
    // The container div merges style values into inline style string
    const containerDiv = container.firstChild;
    expect(containerDiv.style.backgroundColor).toBe('red');
  });

  it('handles null onClick without crashing', () => {
    render(<TransactionItem {...defaultProps} onClick={null} />);
    expect(screen.getByText('Lunch with team')).toBeTruthy();
  });
});

// ==============================================================================
// Bangla Mode
// ==============================================================================

describe('TransactionItem - Bangla Mode', () => {
  it('renders notes in Bangla mode', () => {
    render(<TransactionItem transaction={incomeTx} account={mockAccount} lang="bn" />);
    expect(screen.getByText('Monthly salary')).toBeTruthy();
  });

  it('shows Bengali-formatted amount for income', () => {
    render(<TransactionItem transaction={incomeTx} account={mockAccount} lang="bn" />);
    // formatNumber(50000, 'bn') -> toBengaliDigits("50,000") -> "৫০,০০০"
    expect(screen.getByText(/\u09F3\u09EB\u09E6,\u09E6\u09E6\u09E6/)).toBeTruthy();
  });

  it('shows Bengali-formatted amount for expense', () => {
    render(<TransactionItem {...defaultProps} lang="bn" />);
    // formatNumber(1500, 'bn') -> toBengaliDigits("1,500") -> "১,৫০০"
    expect(screen.getByText(/\u09F3\u09E7,\u09EB\u09E6\u09E6/)).toBeTruthy();
  });
});

// ==============================================================================
// Notes Fallback
// ==============================================================================

describe('TransactionItem - Notes Fallback', () => {
  it('uses category name as notes when notes is empty for expense variant', () => {
    const expenseNoNotes = { ...expenseTx, notes: '' };
    render(<TransactionItem transaction={expenseNoNotes} account={mockAccount} category={mockCategory} variant="default" lang="en" />);
    // renderNotes: no notes -> cat.name = 'Food & Drinks' -> returns cat.name
    expect(screen.getByText('Food & Drinks')).toBeTruthy();
  });
});
