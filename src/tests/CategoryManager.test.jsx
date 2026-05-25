import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import CategoryManager from '../components/CategoryManager';

// ==============================================================================
// Mock Data
// ==============================================================================

const mockCategories = [
  { id: 'cat_food', name: 'Food & Dining', type: 'expense', icon: 'Utensils', color: '#ff7b54' },
  { id: 'cat_transport', name: 'Transport', type: 'expense', icon: 'Car', color: '#f1c40f' },
  { id: 'cat_rent', name: 'Rent / Housing', type: 'expense', icon: 'Home', color: '#e74c3c' },
  { id: 'cat_salary', name: 'Salary', type: 'income', icon: 'Briefcase', color: '#3cd070' },
];

const mockTransactions = [
  { id: 'tx_1', type: 'expense', amount: 1500, date: '2025-05-10', categoryId: 'cat_food' },
  { id: 'tx_2', type: 'expense', amount: 300, date: '2025-05-11', categoryId: 'cat_transport' },
  { id: 'tx_3', type: 'expense', amount: 25000, date: '2025-05-01', categoryId: 'cat_rent' },
  { id: 'tx_4', type: 'income', amount: 80000, date: '2025-05-01', categoryId: 'cat_salary' },
];

const defaultProps = {
  categories: mockCategories,
  transactions: mockTransactions,
  onAddCategory: () => {},
  onUpdateCategory: () => {},
  onDeleteCategory: () => {},
  onNavigate: () => {},
  lang: 'en',
};

beforeEach(() => { cleanup(); vi.clearAllMocks(); });
afterEach(() => { vi.unstubAllGlobals(); });

// ==============================================================================
// Helpers
// ==============================================================================

/** Add button is the second button (after back) in the header */
const getAddBtn = () => screen.getAllByRole('button')[1];

/** Back button is the first button in the header */
const getBackBtn = () => screen.getAllByRole('button')[0];

/** Delete buttons start after 4 header/tab buttons (back, add, EXPENSE, INCOME) */
const getDeleteBtns = () => {
  const all = screen.getAllByRole('button');
  return all.slice(4);
};

/** Open the add modal by clicking the + button */
const openModal = () => {
  fireEvent.click(getAddBtn());
};

// ==============================================================================
// Rendering
// ==============================================================================

describe('CategoryManager — Rendering', () => {
  it('renders without crashing', () => {
    render(<CategoryManager {...defaultProps} />);
    expect(screen.getByText('Categories')).toBeTruthy();
  });

  it('renders the header with buttons', () => {
    render(<CategoryManager {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    // Header: back (0), add (1) + tabs: EXPENSE (2), INCOME (3) + 3 delete buttons
    expect(buttons.length).toBeGreaterThanOrEqual(7);
  });

  it('shows EXPENSE and INCOME tab labels', () => {
    render(<CategoryManager {...defaultProps} />);
    expect(screen.getByText('EXPENSE')).toBeTruthy();
    expect(screen.getByText('INCOME')).toBeTruthy();
  });

  it('shows "Tap to edit" hint on category cards', () => {
    render(<CategoryManager {...defaultProps} />);
    const hints = screen.getAllByText('Tap to edit');
    expect(hints.length).toBe(3);
  });
});

// ==============================================================================
// Empty State
// ==============================================================================

describe('CategoryManager — Empty State', () => {
  it('shows empty state when no expense categories exist', () => {
    const onlyIncome = mockCategories.filter(c => c.type === 'income');
    render(<CategoryManager {...defaultProps} categories={onlyIncome} />);
    expect(screen.getByText(/No custom Expense categories found/)).toBeTruthy();
  });

  it('shows empty state when no income categories exist on Income tab', () => {
    const onlyExpense = mockCategories.filter(c => c.type === 'expense');
    render(<CategoryManager {...defaultProps} categories={onlyExpense} />);
    fireEvent.click(screen.getByText('INCOME'));
    expect(screen.getByText(/No custom Income categories found/)).toBeTruthy();
  });
});

// ==============================================================================
// Category Grid
// ==============================================================================

describe('CategoryManager — Category Grid', () => {
  it('renders category names for the active tab (expense)', () => {
    render(<CategoryManager {...defaultProps} />);
    expect(screen.getByText('Food & Dining')).toBeTruthy();
    expect(screen.getByText('Transport')).toBeTruthy();
    expect(screen.getByText('Rent / Housing')).toBeTruthy();
    expect(screen.queryByText('Salary')).toBeNull();
  });

  it('renders SVG icons inside category cards', () => {
    const { container } = render(<CategoryManager {...defaultProps} />);
    const svgs = container.querySelectorAll('svg');
    // Each card has an icon SVG + delete button has a Trash2 SVG
    expect(svgs.length).toBeGreaterThanOrEqual(6); // 3 cards × 2 SVGs each
  });
});

// ==============================================================================
// Tab Switching
// ==============================================================================

describe('CategoryManager — Tab Switching', () => {
  it('switches to Income tab and shows income categories', () => {
    render(<CategoryManager {...defaultProps} />);
    expect(screen.getByText('Food & Dining')).toBeTruthy();
    expect(screen.queryByText('Salary')).toBeNull();

    fireEvent.click(screen.getByText('INCOME'));
    expect(screen.getByText('Salary')).toBeTruthy();
    expect(screen.queryByText('Food & Dining')).toBeNull();
    expect(screen.queryByText('Transport')).toBeNull();
    expect(screen.queryByText('Rent / Housing')).toBeNull();
  });

  it('switches back to Expense tab', () => {
    render(<CategoryManager {...defaultProps} />);
    fireEvent.click(screen.getByText('INCOME'));
    expect(screen.getByText('Salary')).toBeTruthy();

    fireEvent.click(screen.getByText('EXPENSE'));
    expect(screen.getByText('Food & Dining')).toBeTruthy();
    expect(screen.queryByText('Salary')).toBeNull();
  });
});

// ==============================================================================
// Add Modal
// ==============================================================================

describe('CategoryManager — Add Modal', () => {
  it('opens the add modal when clicking the + button', () => {
    const { container } = render(<CategoryManager {...defaultProps} />);
    openModal();

    expect(screen.getByText('New Category')).toBeTruthy();
    expect(screen.getByText('Visual Preview')).toBeTruthy();
    expect(container.querySelector('.bottom-drawer')).toBeTruthy();
    expect(container.querySelector('.drawer-overlay')).toBeTruthy();
  });

  it('shows form fields in the modal', () => {
    render(<CategoryManager {...defaultProps} />);
    openModal();

    expect(screen.getByText('CATEGORY NAME')).toBeTruthy();
    expect(screen.getByText('FLOW TYPE')).toBeTruthy();
    expect(screen.getByText('THEME COLOR')).toBeTruthy();
    expect(screen.getByText('SELECT ICON')).toBeTruthy();
    expect(screen.getByText('Save Category')).toBeTruthy();
  });

  it('shows the name input field with placeholder', () => {
    render(<CategoryManager {...defaultProps} />);
    openModal();

    expect(screen.getByPlaceholderText('E.g., Groceries, Gifts, Travel')).toBeTruthy();
  });

  it('shows the flow type select with expense/income options', () => {
    render(<CategoryManager {...defaultProps} />);
    openModal();

    expect(screen.getByText('Expense (Outflow)')).toBeTruthy();
    expect(screen.getByText('Income (Inflow)')).toBeTruthy();
  });
});

// ==============================================================================
// Form Validation
// ==============================================================================

describe('CategoryManager — Form Validation', () => {
  it('shows error when saving with empty name', () => {
    render(<CategoryManager {...defaultProps} />);
    openModal();

    fireEvent.click(screen.getByText('Save Category'));
    expect(screen.getByText('Please enter a category name.')).toBeTruthy();
  });

  it('clears error after providing a name and saving successfully', () => {
    const handleAdd = vi.fn();
    render(<CategoryManager {...defaultProps} onAddCategory={handleAdd} />);
    openModal();

    const saveBtn = screen.getByText('Save Category');

    // Submit with empty → error
    fireEvent.click(saveBtn);
    expect(screen.getByText('Please enter a category name.')).toBeTruthy();

    // Fill in name
    const nameInput = screen.getByPlaceholderText('E.g., Groceries, Gifts, Travel');
    fireEvent.change(nameInput, { target: { value: 'Groceries' } });

    // Submit again → should succeed
    fireEvent.click(saveBtn);
    expect(handleAdd).toHaveBeenCalledOnce();
    expect(screen.queryByText('Please enter a category name.')).toBeNull();
  });
});

// ==============================================================================
// Save New Category
// ==============================================================================

describe('CategoryManager — Save New Category', () => {
  it('calls onAddCategory with correct payload', () => {
    const handleAdd = vi.fn();
    render(<CategoryManager {...defaultProps} onAddCategory={handleAdd} />);
    openModal();

    const nameInput = screen.getByPlaceholderText('E.g., Groceries, Gifts, Travel');
    fireEvent.change(nameInput, { target: { value: 'Groceries' } });

    fireEvent.click(screen.getByText('Save Category'));

    expect(handleAdd).toHaveBeenCalledOnce();
    const payload = handleAdd.mock.calls[0][0];
    expect(payload).toMatchObject({
      name: 'Groceries',
      type: 'expense',
      icon: 'Utensils',
      color: '#ff7b54',
    });
    expect(payload.id).toBeUndefined();
  });

  it('closes the modal after successful save', () => {
    const handleAdd = vi.fn();
    const { container } = render(<CategoryManager {...defaultProps} onAddCategory={handleAdd} />);
    openModal();

    const nameInput = screen.getByPlaceholderText('E.g., Groceries, Gifts, Travel');
    fireEvent.change(nameInput, { target: { value: 'Groceries' } });

    fireEvent.click(screen.getByText('Save Category'));
    expect(container.querySelector('.bottom-drawer')).toBeNull();
  });
});

// ==============================================================================
// Edit Category
// ==============================================================================

describe('CategoryManager — Edit Category', () => {
  it('opens modal with pre-filled data when clicking a category card', () => {
    render(<CategoryManager {...defaultProps} />);
    fireEvent.click(screen.getByText('Food & Dining'));

    const nameInput = screen.getByDisplayValue('Food & Dining');
    expect(nameInput).toBeTruthy();
  });

  it('calls onUpdateCategory with merged data', () => {
    const handleUpdate = vi.fn();
    render(<CategoryManager {...defaultProps} onUpdateCategory={handleUpdate} />);
    fireEvent.click(screen.getByText('Transport'));

    const nameInput = screen.getByDisplayValue('Transport');
    fireEvent.change(nameInput, { target: { value: 'Public Transport' } });

    fireEvent.click(screen.getByText('Save Category'));

    expect(handleUpdate).toHaveBeenCalledOnce();
    const payload = handleUpdate.mock.calls[0][0];
    expect(payload).toMatchObject({
      id: 'cat_transport',
      name: 'Public Transport',
      type: 'expense',
      icon: 'Car',
      color: '#f1c40f',
    });
  });

  it('closes modal after saving edit', () => {
    const handleUpdate = vi.fn();
    const { container } = render(<CategoryManager {...defaultProps} onUpdateCategory={handleUpdate} />);
    fireEvent.click(screen.getByText('Transport'));

    fireEvent.click(screen.getByText('Save Category'));
    expect(container.querySelector('.bottom-drawer')).toBeNull();
  });
});

// ==============================================================================
// Delete Category
// ==============================================================================

describe('CategoryManager — Delete Category', () => {
  it('calls onDeleteCategory when deleting a category with no transactions', () => {
    const handleDelete = vi.fn();
    // Prepend a category that has no transactions
    const categoriesWithNoTx = [
      { id: 'cat_util', name: 'Utilities', type: 'expense', icon: 'Lightbulb', color: '#0984e3' },
      ...mockCategories.filter(c => c.type === 'expense'), // Food, Transport, Rent
    ];
    render(
      <CategoryManager
        {...defaultProps}
        categories={categoriesWithNoTx}
        onDeleteCategory={handleDelete}
      />
    );

    // First delete button = Utilities (no transactions)
    const deleteBtns = getDeleteBtns();
    fireEvent.click(deleteBtns[0]);

    expect(handleDelete).toHaveBeenCalledOnce();
    expect(handleDelete).toHaveBeenCalledWith('cat_util');
  });

  it('shows window.confirm when deleting a category with transactions', () => {
    const handleDelete = vi.fn();
    vi.stubGlobal('confirm', vi.fn(() => true));

    render(<CategoryManager {...defaultProps} onDeleteCategory={handleDelete} />);

    // First delete button = Food & Drinks (has tx_1)
    const deleteBtns = getDeleteBtns();
    fireEvent.click(deleteBtns[0]);

    expect(window.confirm).toHaveBeenCalledOnce();
    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining('Transactions already exist')
    );
    expect(handleDelete).toHaveBeenCalledOnce();
    expect(handleDelete).toHaveBeenCalledWith('cat_food');
  });

  it('does not delete if window.confirm is cancelled', () => {
    const handleDelete = vi.fn();
    vi.stubGlobal('confirm', vi.fn(() => false));

    render(<CategoryManager {...defaultProps} onDeleteCategory={handleDelete} />);

    const deleteBtns = getDeleteBtns();
    fireEvent.click(deleteBtns[0]);

    expect(window.confirm).toHaveBeenCalledOnce();
    expect(handleDelete).not.toHaveBeenCalled();
  });

  it('does not call window.confirm when category has no transactions', () => {
    const handleDelete = vi.fn();
    vi.stubGlobal('confirm', vi.fn(() => true));

    const categoriesWithNoTx = [
      { id: 'cat_util', name: 'Utilities', type: 'expense', icon: 'Lightbulb', color: '#0984e3' },
      ...mockCategories.filter(c => c.type === 'expense'),
    ];
    render(
      <CategoryManager
        {...defaultProps}
        categories={categoriesWithNoTx}
        onDeleteCategory={handleDelete}
      />
    );

    const deleteBtns = getDeleteBtns();
    fireEvent.click(deleteBtns[0]);

    expect(window.confirm).not.toHaveBeenCalled();
    expect(handleDelete).toHaveBeenCalledOnce();
  });
});

// ==============================================================================
// Navigation
// ==============================================================================

describe('CategoryManager — Navigation', () => {
  it('calls onNavigate with "dashboard" when clicking back button', () => {
    const handleNavigate = vi.fn();
    render(<CategoryManager {...defaultProps} onNavigate={handleNavigate} />);

    fireEvent.click(getBackBtn());
    expect(handleNavigate).toHaveBeenCalledWith('dashboard');
  });
});

// ==============================================================================
// Close Modal
// ==============================================================================

describe('CategoryManager — Close Modal', () => {
  it('closes the modal when clicking the overlay', () => {
    const { container } = render(<CategoryManager {...defaultProps} />);
    openModal();
    expect(container.querySelector('.bottom-drawer')).toBeTruthy();

    const overlay = container.querySelector('.drawer-overlay');
    fireEvent.click(overlay);
    expect(container.querySelector('.bottom-drawer')).toBeNull();
  });

  it('closes the modal when clicking the X button', () => {
    const { container } = render(<CategoryManager {...defaultProps} />);
    openModal();
    expect(container.querySelector('.bottom-drawer')).toBeTruthy();

    // X button is the first button inside .bottom-drawer
    const xBtn = container.querySelector('.bottom-drawer button');
    fireEvent.click(xBtn);
    expect(container.querySelector('.bottom-drawer')).toBeNull();
  });
});

// ==============================================================================
// Type Select Interaction
// ==============================================================================

describe('CategoryManager — Type Select', () => {
  it('allows changing flow type in the modal', () => {
    render(<CategoryManager {...defaultProps} />);
    openModal();

    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThanOrEqual(1);
    const typeSelect = selects[0];

    // Default should be expense
    expect(typeSelect.value).toBe('expense');

    // Change to income
    fireEvent.change(typeSelect, { target: { value: 'income' } });
    expect(typeSelect.value).toBe('income');
  });
});

// ==============================================================================
// Bangla Mode
// ==============================================================================

describe('CategoryManager — Bangla Mode', () => {
  it('renders title in Bangla', () => {
    render(<CategoryManager {...defaultProps} lang="bn" />);
    expect(screen.getByText('ক্যাটাগরি')).toBeTruthy();
  });

  it('shows tab labels translated to Bangla', () => {
    render(<CategoryManager {...defaultProps} lang="bn" />);
    expect(screen.getByText('ব্যয়')).toBeTruthy();
    expect(screen.getByText('আয়')).toBeTruthy();
  });

  it('shows empty state in Bangla', () => {
    const onlyIncome = mockCategories.filter(c => c.type === 'income');
    render(<CategoryManager {...defaultProps} categories={onlyIncome} lang="bn" />);
    expect(screen.getByText(/কোনো কাস্টম.*ব্যয়.*ক্যাটাগরি পাওয়া যায়নি/)).toBeTruthy();
  });

  it('shows form labels in Bangla when modal opens', () => {
    render(<CategoryManager {...defaultProps} lang="bn" />);
    openModal();

    expect(screen.getByText('ক্যাটাগরির নাম')).toBeTruthy();
    expect(screen.getByText('ফ্লো টাইপ')).toBeTruthy();
    expect(screen.getByText('থিম কালার')).toBeTruthy();
    expect(screen.getByText('আইকন নির্বাচন')).toBeTruthy();
  });

  it('shows "Tap to edit" translated to Bangla', () => {
    render(<CategoryManager {...defaultProps} lang="bn" />);
    const hints = screen.getAllByText('সম্পাদনা করতে ট্যাপ করুন');
    expect(hints.length).toBe(3);
  });

  it('shows save button translated in Bangla', () => {
    render(<CategoryManager {...defaultProps} lang="bn" />);
    openModal();

    expect(screen.getByText('ক্যাটাগরি সেভ করুন')).toBeTruthy();
  });

  it('shows error message in Bangla', () => {
    render(<CategoryManager {...defaultProps} lang="bn" />);
    openModal();

    fireEvent.click(screen.getByText('ক্যাটাগরি সেভ করুন'));
    expect(screen.getByText('অনুগ্রহ করে ক্যাটাগরির নাম লিখুন।')).toBeTruthy();
  });
});

// ==============================================================================
// Edge Cases
// ==============================================================================

describe('CategoryManager — Edge Cases', () => {
  it('handles empty categories array', () => {
    render(<CategoryManager {...defaultProps} categories={[]} />);
    expect(screen.getByText(/No custom Expense categories found/)).toBeTruthy();
  });

  it('handles empty transactions array', () => {
    render(<CategoryManager {...defaultProps} transactions={[]} />);
    expect(screen.getByText('Categories')).toBeTruthy();
    expect(screen.getByText('Food & Dining')).toBeTruthy();
  });

  it('handles undefined categories gracefully', () => {
    render(
      <CategoryManager
        transactions={mockTransactions}
        onAddCategory={() => {}}
        onUpdateCategory={() => {}}
        onDeleteCategory={() => {}}
        onNavigate={() => {}}
        lang="en"
      />
    );
    expect(screen.getByText(/No custom Expense categories found/)).toBeTruthy();
  });

  it('handles undefined transactions gracefully', () => {
    render(
      <CategoryManager
        categories={mockCategories}
        onAddCategory={() => {}}
        onUpdateCategory={() => {}}
        onDeleteCategory={() => {}}
        onNavigate={() => {}}
        lang="en"
      />
    );
    expect(screen.getByText('Categories')).toBeTruthy();
    expect(screen.getByText('Food & Dining')).toBeTruthy();
  });

  it('handles missing optional props gracefully', () => {
    render(
      <CategoryManager
        categories={mockCategories}
        transactions={mockTransactions}
        onAddCategory={() => {}}
        onUpdateCategory={() => {}}
        onDeleteCategory={() => {}}
        onNavigate={() => {}}
      />
    );
    expect(screen.getByText('Categories')).toBeTruthy();
  });
});
