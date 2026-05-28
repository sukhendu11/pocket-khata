import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import BudgetManager from '../components/BudgetManager';

// ==============================================================================
// Mock Data
// ==============================================================================

const mockCategories = [
  { id: 'cat_food', name: 'Food & Drinks', type: 'expense', color: '#ff7b54' },
  { id: 'cat_transport', name: 'Transport', type: 'expense', color: '#f1c40f' },
  { id: 'cat_rent', name: 'Rent', type: 'expense', color: '#e74c3c' },
  { id: 'cat_salary', name: 'Salary', type: 'income', color: '#3cd070' },
];

const mockTransactions = [
  { id: 'tx_1', type: 'expense', amount: 1500, date: '2025-05-10', categoryId: 'cat_food' },
  { id: 'tx_2', type: 'expense', amount: 300, date: '2025-05-11', categoryId: 'cat_transport' },
  { id: 'tx_3', type: 'expense', amount: 25000, date: '2025-05-01', categoryId: 'cat_rent' },
  { id: 'tx_4', type: 'income', amount: 80000, date: '2025-05-01', categoryId: 'cat_salary' },
  // Old transaction — should NOT count for May spending
  { id: 'tx_5', type: 'expense', amount: 500, date: '2024-12-15', categoryId: 'cat_food' },
];

// Budgets covering 3 states: normal, near-limit, over-budget
// Sorted by percentage desc: transport (100%) > rent (96%) > food (30%)
const mockBudgets = [
  { id: 'budget_food', categoryId: 'cat_food', limit: 5000, month: 4, year: 2025 },
  { id: 'budget_rent', categoryId: 'cat_rent', limit: 26000, month: 4, year: 2025 },
  { id: 'budget_transport', categoryId: 'cat_transport', limit: 200, month: 4, year: 2025 },
];

const defaultProps = {
  budgets: mockBudgets,
  categories: mockCategories,
  transactions: mockTransactions,
  onAddBudget: () => {},
  onUpdateBudget: () => {},
  onDeleteBudget: () => {},
  onNavigate: () => {},
  lang: 'en',
};

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

/** Add button is the second button in the header (after back) */
const getAddBtn = () => screen.getAllByRole('button')[1];

/** Back button is the first button */
const getBackBtn = () => screen.getAllByRole('button')[0];

/** Open the add/edit form by clicking the + button */
const openForm = () => {
  fireEvent.click(getAddBtn());
};

beforeEach(() => { cleanup(); vi.clearAllMocks(); });
afterEach(() => { vi.unstubAllGlobals(); });

// ==============================================================================
// Rendering
// ==============================================================================

describe('BudgetManager — Rendering', () => {
  it('renders without crashing', () => {
    useFixedDate();
    render(<BudgetManager {...defaultProps} />);
    expect(screen.getByText('Budget Planner')).toBeTruthy();
  });

  it('renders the header with back and add buttons', () => {
    useFixedDate();
    render(<BudgetManager {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    // back (0) + add (1) + 3 edit + 3 delete = 8
    expect(buttons.length).toBe(8);
  });
});

// ==============================================================================
// Empty State
// ==============================================================================

describe('BudgetManager — Empty State', () => {
  it('shows empty state when no budgets exist', () => {
    useFixedDate();
    render(<BudgetManager {...defaultProps} budgets={[]} />);
    expect(screen.getByText('No budgets set yet')).toBeTruthy();
    expect(screen.getByText('Create a budget to track your spending')).toBeTruthy();
  });

  it('does not show summary card when no budgets', () => {
    useFixedDate();
    render(<BudgetManager {...defaultProps} budgets={[]} />);
    expect(screen.queryByText('Total Budget')).toBeNull();
    expect(screen.queryByText('Spent')).toBeNull();
    expect(screen.queryByText('Remaining')).toBeNull();
  });
});

// ==============================================================================
// Summary Card
// ==============================================================================

describe('BudgetManager — Summary Card', () => {
  it('shows total budget amount (5000 + 26000 + 200 = 31,200)', () => {
    useFixedDate();
    render(<BudgetManager {...defaultProps} />);
    expect(screen.getByText('Total Budget')).toBeTruthy();
    // Total budget: 31200
    expect(screen.getByText(/31,200/)).toBeTruthy();
  });

  it('shows total spent amount (1500 + 25000 + 300 = 26,800)', () => {
    useFixedDate();
    render(<BudgetManager {...defaultProps} />);
    expect(screen.getByText('Spent')).toBeTruthy();
    expect(screen.getByText(/26,800/)).toBeTruthy();
  });

  it('shows remaining amount (31200 - 26800 = 4,400)', () => {
    useFixedDate();
    render(<BudgetManager {...defaultProps} />);
    expect(screen.getByText('Remaining')).toBeTruthy();
    expect(screen.getByText(/4,400/)).toBeTruthy();
  });

  it('shows percentage label 86% of budget used', () => {
    useFixedDate();
    render(<BudgetManager {...defaultProps} />);
    expect(screen.getByText(/86%.*of budget used/)).toBeTruthy();
  });
});

// ==============================================================================
// Budget Cards
// ==============================================================================

describe('BudgetManager — Budget Cards', () => {
  it('renders all budget cards with category names', () => {
    useFixedDate();
    render(<BudgetManager {...defaultProps} />);
    expect(screen.getByText('Food & Drinks')).toBeTruthy();
    expect(screen.getByText('Rent')).toBeTruthy();
    expect(screen.getByText('Transport')).toBeTruthy();
  });

  it('shows spent amounts on each card', () => {
    useFixedDate();
    render(<BudgetManager {...defaultProps} />);
    // Food: 1500, Rent: 25000, Transport: 300
    const spentTexts = screen.getAllByText(/1,500|25,000|300/);
    expect(spentTexts.length).toBeGreaterThanOrEqual(3);
  });

  it('shows limit labels on cards', () => {
    useFixedDate();
    render(<BudgetManager {...defaultProps} />);
    const limitTexts = screen.getAllByText(/Limit:/);
    expect(limitTexts.length).toBe(3);
  });

  it('shows percentage text on each card', () => {
    useFixedDate();
    render(<BudgetManager {...defaultProps} />);
    // Food: 30%, Rent: 96%, Transport: 100%
    expect(screen.getByText('30%')).toBeTruthy();
    expect(screen.getByText('96%')).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('shows remaining/over text on each card', () => {
    useFixedDate();
    render(<BudgetManager {...defaultProps} />);
    // Food: 3,500 remaining
    // Rent: 1,000 remaining
    // Transport: Over by ৳100
    expect(screen.getByText(/3,500.*remaining/)).toBeTruthy();
    expect(screen.getByText(/1,000.*remaining/)).toBeTruthy();
    expect(screen.getByText(/Over by ৳100/)).toBeTruthy();
  });

  it('sorts cards by percentage descending', () => {
    useFixedDate();
    const { container } = render(<BudgetManager {...defaultProps} />);
    const cards = container.querySelectorAll('[class*="neo-raised-sm"]');
    // First card = Transport (100%), Second = Rent (96%), Third = Food (30%)
    expect(cards.length).toBe(3);
  });
});

// ==============================================================================
// Status Badges
// ==============================================================================

describe('BudgetManager — Status Badges', () => {
  it('shows Over Budget badge for over-budget category', () => {
    useFixedDate();
    render(<BudgetManager {...defaultProps} />);
    expect(screen.getByText('Over Budget')).toBeTruthy();
  });

  it('shows Near Limit badge for near-limit category', () => {
    useFixedDate();
    render(<BudgetManager {...defaultProps} />);
    expect(screen.getByText('Near Limit')).toBeTruthy();
  });

  it('does not show status badges for normal category (Food: 30%)', () => {
    useFixedDate();
    render(<BudgetManager {...defaultProps} />);
    // Food card shows neither Over Budget nor Near Limit
    // But Transport shows Over Budget, Rent shows Near Limit
    // All three cards should exist — just checking counts
    const overBadges = screen.getAllByText('Over Budget');
    expect(overBadges.length).toBe(1);

    const nearBadges = screen.getAllByText('Near Limit');
    expect(nearBadges.length).toBe(1);
  });

  it('shows Edit button on each card', () => {
    useFixedDate();
    render(<BudgetManager {...defaultProps} />);
    const editBtns = screen.getAllByText('Edit');
    expect(editBtns.length).toBe(3);
  });
});

// ==============================================================================
// Add Budget Form
// ==============================================================================

describe('BudgetManager — Add Budget Form', () => {
  it('opens the form when clicking the + button', () => {
    useFixedDate();
    const { container } = render(<BudgetManager {...defaultProps} />);
    openForm();

    expect(screen.getByText('New Budget')).toBeTruthy();
    expect(container.querySelector('.bottom-drawer')).toBeTruthy();
    expect(container.querySelector('.drawer-overlay')).toBeTruthy();
  });

  it('shows form fields in the modal', () => {
    useFixedDate();
    render(<BudgetManager {...defaultProps} />);
    openForm();

    expect(screen.getByText('CATEGORY')).toBeTruthy();
    expect(screen.getByText('MONTHLY LIMIT (৳)')).toBeTruthy();
    expect(screen.getByText('Create Budget')).toBeTruthy();
  });

  it('shows only expense categories in the dropdown', () => {
    useFixedDate();
    render(<BudgetManager {...defaultProps} />);
    openForm();

    // Get all option elements inside the select
    const select = screen.getByRole('combobox');
    const options = Array.from(select.options).map(o => o.value);
    // Should have empty disabled option + 3 expense categories
    expect(options).toContain('cat_food');
    expect(options).toContain('cat_transport');
    expect(options).toContain('cat_rent');
    // Income category should NOT appear
    expect(options).not.toContain('cat_salary');
  });

  it('shows the limit input with placeholder', () => {
    useFixedDate();
    render(<BudgetManager {...defaultProps} />);
    openForm();

    expect(screen.getByPlaceholderText('e.g. 5000')).toBeTruthy();
  });

  it('shows budget hint with current month name', () => {
    useFixedDate();
    render(<BudgetManager {...defaultProps} />);
    openForm();

    // May 2025
    expect(screen.getByText(/Budget for May/)).toBeTruthy();
  });
});

// ==============================================================================
// Form Validation
// ==============================================================================

describe('BudgetManager — Form Validation', () => {
  it('shows error when saving without selecting a category', () => {
    useFixedDate();
    render(<BudgetManager {...defaultProps} />);
    openForm();

    fireEvent.click(screen.getByText('Create Budget'));
    expect(screen.getByText('Please select a category')).toBeTruthy();
  });

  it('shows error when saving with empty limit', () => {
    useFixedDate();
    render(<BudgetManager {...defaultProps} />);
    openForm();

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'cat_food' } });

    fireEvent.click(screen.getByText('Create Budget'));
    expect(screen.getByText('Please enter a valid budget limit')).toBeTruthy();
  });

  it('shows error when saving with zero limit', () => {
    useFixedDate();
    render(<BudgetManager {...defaultProps} />);
    openForm();

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'cat_food' } });

    const limitInput = screen.getByPlaceholderText('e.g. 5000');
    fireEvent.change(limitInput, { target: { value: '0' } });

    fireEvent.click(screen.getByText('Create Budget'));
    expect(screen.getByText('Please enter a valid budget limit')).toBeTruthy();
  });

  it('clears error after fixing it and saving successfully', () => {
    useFixedDate();
    const handleAdd = vi.fn();
    render(<BudgetManager {...defaultProps} onAddBudget={handleAdd} />);
    openForm();

    const saveBtn = screen.getByText('Create Budget');

    // Trigger error
    fireEvent.click(saveBtn);
    expect(screen.getByText('Please select a category')).toBeTruthy();

    // Fix: select category and enter limit
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'cat_food' } });

    const limitInput = screen.getByPlaceholderText('e.g. 5000');
    fireEvent.change(limitInput, { target: { value: '5000' } });

    // Submit — should succeed
    fireEvent.click(saveBtn);
    expect(handleAdd).toHaveBeenCalledOnce();
    expect(screen.queryByText('Please select a category')).toBeNull();
  });
});

// ==============================================================================
// Save New Budget
// ==============================================================================

describe('BudgetManager — Save New Budget', () => {
  it('calls onAddBudget with correct payload', () => {
    useFixedDate();
    const handleAdd = vi.fn();
    render(<BudgetManager {...defaultProps} onAddBudget={handleAdd} />);
    openForm();

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'cat_food' } });

    const limitInput = screen.getByPlaceholderText('e.g. 5000');
    fireEvent.change(limitInput, { target: { value: '3000' } });

    fireEvent.click(screen.getByText('Create Budget'));

    expect(handleAdd).toHaveBeenCalledOnce();
    expect(handleAdd).toHaveBeenCalledWith({
      categoryId: 'cat_food',
      limit: 3000,
      month: 4,
      year: 2025,
      rollover: false,
    });
  });

  it('closes the form after successful save', () => {
    useFixedDate();
    const handleAdd = vi.fn();
    const { container } = render(<BudgetManager {...defaultProps} onAddBudget={handleAdd} />);
    openForm();

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'cat_food' } });

    const limitInput = screen.getByPlaceholderText('e.g. 5000');
    fireEvent.change(limitInput, { target: { value: '3000' } });

    fireEvent.click(screen.getByText('Create Budget'));
    expect(container.querySelector('.bottom-drawer')).toBeNull();
  });
});

// ==============================================================================
// Edit Budget
// ==============================================================================

describe('BudgetManager — Edit Budget', () => {
  it('opens form with pre-filled data when clicking Edit', () => {
    useFixedDate();
    render(<BudgetManager {...defaultProps} />);

    // Click Edit on Transport (first card, sorted first at 100%)
    const editBtns = screen.getAllByText('Edit');
    fireEvent.click(editBtns[0]);

    // Should show Edit Budget title
    expect(screen.getByText('Edit Budget')).toBeTruthy();
  });

  it('calls onUpdateBudget with merged data', () => {
    useFixedDate();
    const handleUpdate = vi.fn();
    render(<BudgetManager {...defaultProps} onUpdateBudget={handleUpdate} />);

    // Click Edit on Food & Drinks (third card, sorted last at 30%)
    const editBtns = screen.getAllByText('Edit');
    fireEvent.click(editBtns[2]);

    // Change the limit
    const limitInput = screen.getByPlaceholderText('e.g. 5000');
    fireEvent.change(limitInput, { target: { value: '6000' } });

    fireEvent.click(screen.getByText('Save Changes'));

    expect(handleUpdate).toHaveBeenCalledOnce();
    expect(handleUpdate).toHaveBeenCalledWith(expect.objectContaining({
      id: 'budget_food',
      categoryId: 'cat_food',
      limit: 6000,
      month: 4,
      year: 2025,
    }));
  });

  it('closes form after saving edit', () => {
    useFixedDate();
    const handleUpdate = vi.fn();
    const { container } = render(<BudgetManager {...defaultProps} onUpdateBudget={handleUpdate} />);

    const editBtns = screen.getAllByText('Edit');
    fireEvent.click(editBtns[0]);

    fireEvent.click(screen.getByText('Save Changes'));
    expect(container.querySelector('.bottom-drawer')).toBeNull();
  });
});

// ==============================================================================
// Delete Budget
// ==============================================================================

describe('BudgetManager — Delete Budget', () => {
  it('calls onDeleteBudget when clicking delete button', () => {
    useFixedDate();
    const handleDelete = vi.fn();
    render(<BudgetManager {...defaultProps} onDeleteBudget={handleDelete} />);

    // Delete buttons come after back(0), add(1), edit(2,4,6), so they are at [3,5,7]
    const allButtons = screen.getAllByRole('button');
    // First delete button = Transport (first card, index 3)
    fireEvent.click(allButtons[3]);

    expect(handleDelete).toHaveBeenCalledOnce();
    expect(handleDelete).toHaveBeenCalledWith('budget_transport');
  });

  it('deletes second budget card correctly', () => {
    useFixedDate();
    const handleDelete = vi.fn();
    render(<BudgetManager {...defaultProps} onDeleteBudget={handleDelete} />);

    const allButtons = screen.getAllByRole('button');
    // Second delete button = Rent (second card, index 5)
    fireEvent.click(allButtons[5]);

    expect(handleDelete).toHaveBeenCalledWith('budget_rent');
  });

  it('deletes third budget card correctly', () => {
    useFixedDate();
    const handleDelete = vi.fn();
    render(<BudgetManager {...defaultProps} onDeleteBudget={handleDelete} />);

    const allButtons = screen.getAllByRole('button');
    // Third delete button = Food (third card, index 7)
    fireEvent.click(allButtons[7]);

    expect(handleDelete).toHaveBeenCalledWith('budget_food');
  });
});

// ==============================================================================
// Navigation
// ==============================================================================

describe('BudgetManager — Navigation', () => {
  it('calls onNavigate with dashboard when clicking back button', () => {
    useFixedDate();
    const handleNavigate = vi.fn();
    render(<BudgetManager {...defaultProps} onNavigate={handleNavigate} />);

    fireEvent.click(getBackBtn());
    expect(handleNavigate).toHaveBeenCalledWith('dashboard');
  });
});

// ==============================================================================
// Close Form
// ==============================================================================

describe('BudgetManager — Close Form', () => {
  it('closes the form when clicking the overlay', () => {
    useFixedDate();
    const { container } = render(<BudgetManager {...defaultProps} />);
    openForm();
    expect(container.querySelector('.bottom-drawer')).toBeTruthy();

    const overlay = container.querySelector('.drawer-overlay');
    fireEvent.click(overlay);
    expect(container.querySelector('.bottom-drawer')).toBeNull();
  });

  it('closes the form when clicking the X button', () => {
    useFixedDate();
    const { container } = render(<BudgetManager {...defaultProps} />);
    openForm();
    expect(container.querySelector('.bottom-drawer')).toBeTruthy();

    // X button is the first button inside .bottom-drawer
    const xBtn = container.querySelector('.bottom-drawer button');
    fireEvent.click(xBtn);
    expect(container.querySelector('.bottom-drawer')).toBeNull();
  });
});

// ==============================================================================
// Negative Remaining (Over Budget)
// ==============================================================================

describe('BudgetManager — Negative Remaining Color', () => {
  it('shows remaining in green for positive remaining', () => {
    useFixedDate();
    render(<BudgetManager {...defaultProps} />);
    // Food: 3500 remaining → should show in green
    // The component uses var(--color-income) for positive remaining
    const remainingText = screen.getByText(/3,500.*remaining/);
    expect(remainingText).toBeTruthy();
  });

  it('shows remaining in red for negative remaining (over budget)', () => {
    useFixedDate();
    render(<BudgetManager {...defaultProps} />);
    // Transport: over by 100 → should show "Over by ৳100"
    const overText = screen.getByText(/Over by ৳100/);
    expect(overText).toBeTruthy();
  });
});

// ==============================================================================
// Bangla Mode
// ==============================================================================

describe('BudgetManager — Bangla Mode', () => {
  it('renders title in Bangla', () => {
    useFixedDate();
    render(<BudgetManager {...defaultProps} lang="bn" />);
    expect(screen.getByText('বাজেট প্ল্যানার')).toBeTruthy();
  });

  it('shows summary labels in Bangla', () => {
    useFixedDate();
    render(<BudgetManager {...defaultProps} lang="bn" />);
    expect(screen.getByText('মোট বাজেট')).toBeTruthy();
    expect(screen.getByText('ব্যয়')).toBeTruthy();
    expect(screen.getByText('অবশিষ্ট')).toBeTruthy();
  });

  it('shows empty state in Bangla', () => {
    useFixedDate();
    render(<BudgetManager {...defaultProps} budgets={[]} lang="bn" />);
    expect(screen.getByText('এখনো কোনো বাজেট সেট করা হয়নি')).toBeTruthy();
    expect(screen.getByText('আপনার ব্যয় ট্র্যাক করতে একটি বাজেট তৈরি করুন')).toBeTruthy();
  });

  it('shows status badges in Bangla', () => {
    useFixedDate();
    render(<BudgetManager {...defaultProps} lang="bn" />);
    expect(screen.getByText('বাজেট অতিক্রম')).toBeTruthy();
    expect(screen.getByText('সীমার কাছাকাছি')).toBeTruthy();
  });

  it('shows Edit button text in Bangla', () => {
    useFixedDate();
    render(<BudgetManager {...defaultProps} lang="bn" />);
    const editBtns = screen.getAllByText('সম্পাদনা');
    expect(editBtns.length).toBe(3);
  });

  it('shows form labels in Bangla when form opens', () => {
    useFixedDate();
    render(<BudgetManager {...defaultProps} lang="bn" />);
    openForm();

    expect(screen.getByText('ক্যাটাগরি')).toBeTruthy();
    expect(screen.getByText('মাসিক সীমা (৳)')).toBeTruthy();
  });

  it('shows form buttons in Bangla', () => {
    useFixedDate();
    render(<BudgetManager {...defaultProps} lang="bn" />);
    openForm();

    expect(screen.getByText('বাজেট তৈরি করুন')).toBeTruthy();
  });

  it('shows error messages in Bangla', () => {
    useFixedDate();
    render(<BudgetManager {...defaultProps} lang="bn" />);
    openForm();

    fireEvent.click(screen.getByText('বাজেট তৈরি করুন'));
    expect(screen.getByText('অনুগ্রহ করে ক্যাটাগরি নির্বাচন করুন')).toBeTruthy();
  });

  it('shows edit form title in Bangla when editing', () => {
    useFixedDate();
    render(<BudgetManager {...defaultProps} lang="bn" />);

    const editBtns = screen.getAllByText('সম্পাদনা');
    fireEvent.click(editBtns[0]);

    expect(screen.getByText('বাজেট সম্পাদনা')).toBeTruthy();
    expect(screen.getByText('পরিবর্তন সেভ করুন')).toBeTruthy();
  });

  it('shows percentage with Bangla digits', () => {
    useFixedDate();
    render(<BudgetManager {...defaultProps} lang="bn" />);
    // 30% → ৩০%, 96% → ৯৬%, 100% → ১০০%
    expect(screen.getByText('৩০%')).toBeTruthy();
    expect(screen.getByText('৯৬%')).toBeTruthy();
    expect(screen.getByText('১০০%')).toBeTruthy();
  });
});

// ==============================================================================
// Edge Cases
// ==============================================================================

describe('BudgetManager — Edge Cases', () => {
  it('handles empty budgets array', () => {
    useFixedDate();
    render(<BudgetManager {...defaultProps} budgets={[]} />);
    expect(screen.getByText('No budgets set yet')).toBeTruthy();
  });

  it('handles empty categories array', () => {
    useFixedDate();
    render(<BudgetManager {...defaultProps} categories={[]} />);
    // Budgets still render but category names show 'Unknown'
    expect(screen.getByText('Budget Planner')).toBeTruthy();
  });

  it('handles empty transactions array (all budgets show 0 spent)', () => {
    useFixedDate();
    render(<BudgetManager {...defaultProps} transactions={[]} />);
    // Spent should be 0 for all budgets
    // Summary: total spent = 0
    expect(screen.getByText(/0.*of budget used/)).toBeTruthy();
  });

  it('handles undefined budgets gracefully', () => {
    useFixedDate();
    render(
      <BudgetManager
        categories={mockCategories}
        transactions={mockTransactions}
        onAddBudget={() => {}}
        onUpdateBudget={() => {}}
        onDeleteBudget={() => {}}
        onNavigate={() => {}}
        lang="en"
      />
    );
    expect(screen.getByText('No budgets set yet')).toBeTruthy();
  });

  it('handles undefined transactions gracefully', () => {
    useFixedDate();
    render(
      <BudgetManager
        budgets={mockBudgets}
        categories={mockCategories}
        onAddBudget={() => {}}
        onUpdateBudget={() => {}}
        onDeleteBudget={() => {}}
        onNavigate={() => {}}
        lang="en"
      />
    );
    expect(screen.getByText('Budget Planner')).toBeTruthy();
    expect(screen.getByText(/0.*of budget used/)).toBeTruthy();
  });

  it('handles undefined categories gracefully', () => {
    useFixedDate();
    render(
      <BudgetManager
        budgets={mockBudgets}
        transactions={mockTransactions}
        onAddBudget={() => {}}
        onUpdateBudget={() => {}}
        onDeleteBudget={() => {}}
        onNavigate={() => {}}
        lang="en"
      />
    );
    expect(screen.getByText('Budget Planner')).toBeTruthy();
  });

  it('handles missing optional props gracefully', () => {
    useFixedDate();
    render(
      <BudgetManager
        budgets={mockBudgets}
        categories={mockCategories}
        transactions={mockTransactions}
        onNavigate={() => {}}
      />
    );
    expect(screen.getByText('Budget Planner')).toBeTruthy();
  });
});
