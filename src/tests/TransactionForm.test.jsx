import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import TransactionForm from '../components/TransactionForm';

// --- Mock Data ---
const mockAccounts = [
  { id: 'acc_cash', name: 'Cash', type: 'Cash', balance: 10000 },
  { id: 'acc_bank', name: 'Bank', type: 'Bank', balance: 50000 },
];

const mockCategories = [
  { id: 'cat_food', name: 'Food', type: 'expense', color: '#ff7b54' },
  { id: 'cat_salary', name: 'Salary', type: 'income', color: '#3cd070' },
];

const mockTransaction = {
  id: 'tx_test_1',
  type: 'expense',
  amount: 1500,
  date: '2025-05-20',
  accountId: 'acc_cash',
  categoryId: 'cat_food',
  notes: 'Groceries',
};

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ==============================================================================
// REGRESSION: Variable Shadowing Bug
// ==============================================================================
// The critical bug was that `.map(t =>` in the segment toggle rendering used `t`
// as the map parameter, which shadowed the imported `{ t }` i18n function from
// '../i18n'. Inside the callback, `t(t === 'expense' ? 'expense' : ...)` tried to
// call `t` as a function, but `t` was a string (e.g. "expense"), causing:
//   TypeError: t is not a function -> blank screen crash.
//
// This test verifies the fix: the map param is now `txType` and `t()` is called
// correctly as the i18n translation function.
// ==============================================================================

describe('TransactionForm — Regression Tests', () => {
  it('renders without crashing — prevents blank screen bug', () => {
    // This was the exact crash scenario: segment toggle rendering calls t() inside a .map()
    const { container } = render(
      <TransactionForm
        accounts={mockAccounts}
        categories={mockCategories}
        onSave={() => {}}
        onClose={() => {}}
        lang="en"
      />
    );
    expect(container.querySelector('.bottom-drawer')).toBeTruthy();
  });

  it('renders all three segment toggle buttons without crashing', () => {
    render(
      <TransactionForm
        accounts={mockAccounts}
        categories={mockCategories}
        onSave={() => {}}
        onClose={() => {}}
        lang="en"
      />
    );

    // The segment buttons should render with the correct translated labels
    // The t() function maps: 'expense' -> 'EXPENSE', 'income' -> 'INCOME', 'transfer' -> 'TRANSFER'
    expect(screen.getByText('EXPENSE')).toBeTruthy();
    expect(screen.getByText('INCOME')).toBeTruthy();
    expect(screen.getByText('TRANSFER')).toBeTruthy();
  });

  it('renders correctly in Bangla mode — no crash', () => {
    render(
      <TransactionForm
        accounts={mockAccounts}
        categories={mockCategories}
        onSave={() => {}}
        onClose={() => {}}
        lang="bn"
      />
    );

    // Bangla translations for the segment buttons
    expect(screen.getByText('ব্যয়')).toBeTruthy();
    expect(screen.getByText('আয়')).toBeTruthy();
    expect(screen.getByText('ট্রান্সফার')).toBeTruthy();
  });

  it('handles missing accounts gracefully (empty array)', () => {
    // Should render without crashing when accounts array is empty
    const { container } = render(
      <TransactionForm
        accounts={[]}
        categories={mockCategories}
        onSave={() => {}}
        onClose={() => {}}
        lang="en"
      />
    );
    expect(container.querySelector('.bottom-drawer')).toBeTruthy();
  });

  it('handles missing categories gracefully (empty array)', () => {
    // Should render without crashing when categories array is empty
    const { container } = render(
      <TransactionForm
        accounts={mockAccounts}
        categories={[]}
        onSave={() => {}}
        onClose={() => {}}
        lang="en"
      />
    );
    expect(container.querySelector('.bottom-drawer')).toBeTruthy();
  });
});

// ==============================================================================
// Functional Tests
// ==============================================================================

describe('TransactionForm — Functional', () => {
  it('displays "Add Transaction" title in add mode', () => {
    render(
      <TransactionForm
        accounts={mockAccounts}
        categories={mockCategories}
        onSave={() => {}}
        onClose={() => {}}
        lang="en"
      />
    );

    const headings = screen.getAllByText('Add Transaction');
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });

  it('displays "Edit Transaction" title in edit mode', () => {
    render(
      <TransactionForm
        transaction={mockTransaction}
        accounts={mockAccounts}
        categories={mockCategories}
        onSave={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
        lang="en"
      />
    );

    expect(screen.getByText('Edit Transaction')).toBeTruthy();
  });

  it('hydrates form fields when editing an existing transaction', () => {
    render(
      <TransactionForm
        transaction={mockTransaction}
        accounts={mockAccounts}
        categories={mockCategories}
        onSave={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
        lang="en"
      />
    );

    const amountInput = screen.getByDisplayValue('1500');
    expect(amountInput).toBeTruthy();

    const dateInput = screen.getByDisplayValue('2025-05-20');
    expect(dateInput).toBeTruthy();
  });

  it('shows delete button only in edit mode', () => {
    // Add mode — no delete button
    const { unmount } = render(
      <TransactionForm
        accounts={mockAccounts}
        categories={mockCategories}
        onSave={() => {}}
        onClose={() => {}}
        lang="en"
      />
    );
    expect(screen.queryByText('Delete')).toBeNull();
    unmount();

    // Edit mode — delete button should appear
    render(
      <TransactionForm
        transaction={mockTransaction}
        accounts={mockAccounts}
        categories={mockCategories}
        onSave={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
        lang="en"
      />
    );
    expect(screen.getByText('Delete')).toBeTruthy();
  });

  it('calls onClose when clicking the overlay', () => {
    const handleClose = vi.fn();
    const { container } = render(
      <TransactionForm
        accounts={mockAccounts}
        categories={mockCategories}
        onSave={() => {}}
        onClose={handleClose}
        lang="en"
      />
    );

    const overlay = container.querySelector('.drawer-overlay');
    fireEvent.click(overlay);
    expect(handleClose).toHaveBeenCalledOnce();
  });
});

// ==============================================================================
// Validation Tests
// ==============================================================================

describe('TransactionForm — Validation', () => {
  it('shows validation error for empty amount', () => {
    render(
      <TransactionForm
        accounts={mockAccounts}
        categories={mockCategories}
        onSave={() => {}}
        onClose={() => {}}
        lang="en"
      />
    );

    const saveBtns = screen.getAllByText('Add Transaction');
    const saveBtn = saveBtns.find(el => el.tagName === 'BUTTON');
    fireEvent.click(saveBtn);

    expect(screen.getByText('Please enter a valid amount greater than 0.')).toBeTruthy();
  });

  it('shows validation error for zero amount', () => {
    render(
      <TransactionForm
        accounts={mockAccounts}
        categories={mockCategories}
        onSave={() => {}}
        onClose={() => {}}
        lang="en"
      />
    );

    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '0' } });

    const saveBtns = screen.getAllByText('Add Transaction');
    const saveBtn = saveBtns.find(el => el.tagName === 'BUTTON');
    fireEvent.click(saveBtn);

    expect(screen.getByText('Please enter a valid amount greater than 0.')).toBeTruthy();
  });

  it('clears validation error after successful save', () => {
    const handleSave = vi.fn();
    render(
      <TransactionForm
        accounts={mockAccounts}
        categories={mockCategories}
        onSave={handleSave}
        onClose={() => {}}
        lang="en"
      />
    );

    // Submit with empty amount → should show error
    const saveBtns = screen.getAllByText('Add Transaction');
    const saveBtn = saveBtns.find(el => el.tagName === 'BUTTON');
    fireEvent.click(saveBtn);
    expect(screen.getByText('Please enter a valid amount greater than 0.')).toBeTruthy();

    // Now fill in valid data and submit
    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '500' } });

    // Click save again — should succeed and clear the error
    fireEvent.click(saveBtn);
    expect(handleSave).toHaveBeenCalledOnce();
    expect(screen.queryByText('Please enter a valid amount greater than 0.')).toBeNull();
  });

  it('calls onSave with correct payload', () => {
    const handleSave = vi.fn();
    render(
      <TransactionForm
        accounts={mockAccounts}
        categories={mockCategories}
        onSave={handleSave}
        onClose={() => {}}
        lang="en"
      />
    );

    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '2500' } });

    const saveBtns = screen.getAllByText('Add Transaction');
    const saveBtn = saveBtns.find(el => el.tagName === 'BUTTON');
    fireEvent.click(saveBtn);

    expect(handleSave).toHaveBeenCalledOnce();
    const payload = handleSave.mock.calls[0][0];
    expect(payload).toMatchObject({
      type: 'expense',
      amount: 2500,
      accountId: 'acc_cash',
      categoryId: 'cat_food',
    });
    expect(payload.date).toBeDefined();
    expect(payload.id).toBeUndefined(); // No id for new transaction
  });

  it('preserves transaction id in edit mode', () => {
    const handleSave = vi.fn();
    render(
      <TransactionForm
        transaction={mockTransaction}
        accounts={mockAccounts}
        categories={mockCategories}
        onSave={handleSave}
        onDelete={() => {}}
        onClose={() => {}}
        lang="en"
      />
    );

    const saveBtn = screen.getByText('Save Changes');
    fireEvent.click(saveBtn);

    expect(handleSave).toHaveBeenCalledOnce();
    const payload = handleSave.mock.calls[0][0];
    expect(payload.id).toBe('tx_test_1');
    expect(payload.amount).toBe(1500);
  });

  it('calls onDelete when delete button is clicked in edit mode', () => {
    const handleDelete = vi.fn();
    render(
      <TransactionForm
        transaction={mockTransaction}
        accounts={mockAccounts}
        categories={mockCategories}
        onSave={() => {}}
        onDelete={handleDelete}
        onClose={() => {}}
        lang="en"
      />
    );

    const deleteBtn = screen.getByText('Delete');
    fireEvent.click(deleteBtn);
    expect(handleDelete).toHaveBeenCalledOnce();
  });
});
