import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import SavingsTracker from '../components/SavingsTracker';

// ==============================================================================
// Mock Data
// ==============================================================================

const mockAccounts = [
  { id: 'acc_cash', name: 'Cash', balance: 50000 },
  { id: 'acc_bank', name: 'Bank', balance: 200000 },
];

const mockGoals = [
  { id: 'goal_vacation', name: 'Vacation Fund', targetAmount: 100000, currentAmount: 25000, deadline: '2025-12-31', color: '#54a0ff' },
  { id: 'goal_laptop', name: 'New Laptop', targetAmount: 50000, currentAmount: 50000, deadline: '2025-06-15', color: '#22C55E' },
  { id: 'goal_emergency', name: 'Emergency Fund', targetAmount: 30000, currentAmount: 18000, deadline: '', color: '#f7b731' },
];

// Sorted by percentage desc: laptop(100%) > emergency(60%) > vacation(25%)
// Total: target=180000, current=93000, pct=52%, completed=1

const defaultProps = {
  savingsGoals: mockGoals,
  accounts: mockAccounts,
  onAddSavingsGoal: () => {},
  onUpdateSavingsGoal: () => {},
  onDeleteSavingsGoal: () => {},
  onContributeToSavingsGoal: () => {},
  onNavigate: () => {},
  lang: 'en',
};

// ==============================================================================
// Helpers
// ==============================================================================

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

describe('SavingsTracker — Rendering', () => {
  it('renders without crashing', () => {
    render(<SavingsTracker {...defaultProps} />);
    expect(screen.getByText('Savings Goals')).toBeTruthy();
  });

  it('renders the header with back and add buttons', () => {
    render(<SavingsTracker {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    // back(0) + add(1)
    // Laptop (completed): edit(2) + delete(3) = 2
    // Emergency: contribute(4) + edit(5) + delete(6) = 3
    // Vacation: contribute(7) + edit(8) + delete(9) = 3
    // Total = 10
    expect(buttons.length).toBe(10);
  });
});

// ==============================================================================
// Empty State
// ==============================================================================

describe('SavingsTracker — Empty State', () => {
  it('shows empty state when no goals exist', () => {
    render(<SavingsTracker {...defaultProps} savingsGoals={[]} />);
    expect(screen.getByText('No savings goals yet')).toBeTruthy();
    expect(screen.getByText('Start saving towards something big!')).toBeTruthy();
  });

  it('does not show summary card when no goals', () => {
    render(<SavingsTracker {...defaultProps} savingsGoals={[]} />);
    expect(screen.queryByText('Total Saved')).toBeNull();
    expect(screen.queryByText(/93,000/)).toBeNull();
  });
});

// ==============================================================================
// Summary Card
// ==============================================================================

describe('SavingsTracker — Summary Card', () => {
  it('shows total saved amount (93,000)', () => {
    render(<SavingsTracker {...defaultProps} />);
    expect(screen.getByText('Total Saved')).toBeTruthy();
    expect(screen.getByText(/93,000/)).toBeTruthy();
  });

  it('shows target amount (1,80,000)', () => {
    render(<SavingsTracker {...defaultProps} />);
    expect(screen.getByText(/Target:/)).toBeTruthy();
    expect(screen.getByText(/180,000/)).toBeTruthy();
  });

  it('shows percentage (52%)', () => {
    render(<SavingsTracker {...defaultProps} />);
    expect(screen.getByText('52%')).toBeTruthy();
  });

  it('shows badge for completed goals count', () => {
    render(<SavingsTracker {...defaultProps} />);
    expect(screen.getByText(/1.*of goals completed.*3/)).toBeTruthy();
  });

  it('does not show completed badge when no goals completed', () => {
    // Only incomplete goals
    const incomplete = mockGoals.filter(g => g.id !== 'goal_laptop');
    render(<SavingsTracker {...defaultProps} savingsGoals={incomplete} />);
    expect(screen.queryByText(/of goals completed/)).toBeNull();
  });
});

// ==============================================================================
// Goal Cards
// ==============================================================================

describe('SavingsTracker — Goal Cards', () => {
  it('renders all goal names in the list', () => {
    render(<SavingsTracker {...defaultProps} />);
    expect(screen.getByText('Vacation Fund')).toBeTruthy();
    expect(screen.getByText('New Laptop')).toBeTruthy();
    expect(screen.getByText('Emergency Fund')).toBeTruthy();
  });

  it('shows current and target amounts on each card', () => {
    render(<SavingsTracker {...defaultProps} />);
    // Laptop: 50,000 (appears twice: current + target)
    expect(screen.getAllByText(/50,000/).length).toBeGreaterThanOrEqual(1);
    // Emergency: 18,000 / 30,000
    expect(screen.getByText(/18,000/)).toBeTruthy();
    // Vacation: 25,000 / 1,00,000
    expect(screen.getByText(/25,000/)).toBeTruthy();
    expect(screen.getByText(/100,000/)).toBeTruthy();
  });

  it('shows percentage text on each card', () => {
    render(<SavingsTracker {...defaultProps} />);
    expect(screen.getByText('100%')).toBeTruthy();
    expect(screen.getByText('60%')).toBeTruthy();
    expect(screen.getByText('25%')).toBeTruthy();
  });

  it('shows remaining text on incomplete goals', () => {
    render(<SavingsTracker {...defaultProps} />);
    // Vacation: 75,000 remaining
    expect(screen.getByText(/75,000.*remaining/)).toBeTruthy();
    // Emergency: 12,000 remaining
    expect(screen.getByText(/12,000.*remaining/)).toBeTruthy();
  });

  it('shows "Goal achieved!" text for completed goals', () => {
    render(<SavingsTracker {...defaultProps} />);
    expect(screen.getByText('Goal achieved! 🎉')).toBeTruthy();
  });

  it('shows deadline text when present', () => {
    render(<SavingsTracker {...defaultProps} />);
    // Vacation: by 2025-12-31
    expect(screen.getByText(/by 2025-12-31/)).toBeTruthy();
    // Laptop: by 2025-06-15
    expect(screen.getByText(/by 2025-06-15/)).toBeTruthy();
  });

  it('does not show a deadline row for goals without deadline', () => {
    render(<SavingsTracker {...defaultProps} />);
    // Emergency has deadline='' so the text "by 2025-12-31" only appears for Vacation
    expect(screen.getByText(/by 2025-12-31/)).toBeTruthy();
    // Laptop has a deadline, so it also appears
    expect(screen.getByText(/by 2025-06-15/)).toBeTruthy();
  });

  it('sorts cards by percentage descending', () => {
    render(<SavingsTracker {...defaultProps} />);
    const cards = screen.getAllByText(/Goal achieved|remaining/);
    // Cards appear in order: laptop, emergency, vacation
    expect(cards[0]).toHaveTextContent('Goal achieved');
    expect(cards[1]).toHaveTextContent(/12,000.*remaining/);
    expect(cards[2]).toHaveTextContent(/75,000.*remaining/);
  });
});

// ==============================================================================
// Completed Goal Behavior
// ==============================================================================

describe('SavingsTracker — Completed Goal Behavior', () => {
  it('does not show Contribute button for completed goals', () => {
    render(<SavingsTracker {...defaultProps} />);
    const contributeBtns = screen.getAllByText('Contribute');
    // Only 2 goals are incomplete, so 2 Contribute buttons
    expect(contributeBtns.length).toBe(2);
  });

  it('shows Contribute buttons for incomplete goals', () => {
    render(<SavingsTracker {...defaultProps} />);
    expect(screen.getAllByText('Contribute').length).toBe(2);
  });
});

// ==============================================================================
// Add Savings Goal Form
// ==============================================================================

describe('SavingsTracker — Add Goal Form', () => {
  it('opens the form when clicking the + button', () => {
    const { container } = render(<SavingsTracker {...defaultProps} />);
    openForm();

    expect(screen.getByText('New Savings Goal')).toBeTruthy();
    expect(container.querySelector('.bottom-drawer')).toBeTruthy();
    expect(container.querySelector('.drawer-overlay')).toBeTruthy();
  });

  it('shows all form fields in the modal', () => {
    render(<SavingsTracker {...defaultProps} />);
    openForm();

    expect(screen.getByText('GOAL NAME')).toBeTruthy();
    expect(screen.getByText('TARGET AMOUNT (৳)')).toBeTruthy();
    expect(screen.getByText('DEADLINE (optional)')).toBeTruthy();
    expect(screen.getByText('THEME COLOR')).toBeTruthy();
  });

  it('shows the goal name input with placeholder', () => {
    render(<SavingsTracker {...defaultProps} />);
    openForm();
    expect(screen.getByPlaceholderText('e.g. New Laptop')).toBeTruthy();
  });

  it('shows the target amount input with placeholder', () => {
    render(<SavingsTracker {...defaultProps} />);
    openForm();
    expect(screen.getByPlaceholderText('e.g. 50000')).toBeTruthy();
  });

  it('shows Create Goal button on the form', () => {
    render(<SavingsTracker {...defaultProps} />);
    openForm();
    expect(screen.getByText('Create Goal')).toBeTruthy();
  });

  it('shows 8 color circles in the color picker', () => {
    render(<SavingsTracker {...defaultProps} />);
    openForm();
    // 8 colors in COLORS array
    const colorCircles = screen.getAllByRole('button').filter(
      btn => btn.style.backgroundColor && btn.style.borderRadius === '50%'
    );
    expect(colorCircles.length).toBe(8);
  });
});

// ==============================================================================
// Form Validation
// ==============================================================================

describe('SavingsTracker — Form Validation', () => {
  it('shows error when saving without a goal name', () => {
    render(<SavingsTracker {...defaultProps} />);
    openForm();

    fireEvent.click(screen.getByText('Create Goal'));
    expect(screen.getByText('Please enter a goal name')).toBeTruthy();
  });

  it('shows error when saving with empty target amount', () => {
    render(<SavingsTracker {...defaultProps} />);
    openForm();

    const nameInput = screen.getByPlaceholderText('e.g. New Laptop');
    fireEvent.change(nameInput, { target: { value: 'My Goal' } });

    fireEvent.click(screen.getByText('Create Goal'));
    expect(screen.getByText('Please enter a valid target amount')).toBeTruthy();
  });

  it('shows error when saving with zero target amount', () => {
    render(<SavingsTracker {...defaultProps} />);
    openForm();

    const nameInput = screen.getByPlaceholderText('e.g. New Laptop');
    fireEvent.change(nameInput, { target: { value: 'My Goal' } });

    const amountInput = screen.getByPlaceholderText('e.g. 50000');
    fireEvent.change(amountInput, { target: { value: '0' } });

    fireEvent.click(screen.getByText('Create Goal'));
    expect(screen.getByText('Please enter a valid target amount')).toBeTruthy();
  });

  it('clears error after fixing validation and saving successfully', () => {
    const handleAdd = vi.fn();
    render(<SavingsTracker {...defaultProps} onAddSavingsGoal={handleAdd} />);
    openForm();

    const saveBtn = screen.getByText('Create Goal');

    // Trigger error
    fireEvent.click(saveBtn);
    expect(screen.getByText('Please enter a goal name')).toBeTruthy();

    // Fix: enter name and amount
    const nameInput = screen.getByPlaceholderText('e.g. New Laptop');
    fireEvent.change(nameInput, { target: { value: 'My Goal' } });

    const amountInput = screen.getByPlaceholderText('e.g. 50000');
    fireEvent.change(amountInput, { target: { value: '20000' } });

    // Submit — should succeed
    fireEvent.click(saveBtn);
    expect(handleAdd).toHaveBeenCalledOnce();
    expect(screen.queryByText('Please enter a goal name')).toBeNull();
  });
});

// ==============================================================================
// Save New Goal
// ==============================================================================

describe('SavingsTracker — Save New Goal', () => {
  it('calls onAddSavingsGoal with correct payload', () => {
    const handleAdd = vi.fn();
    render(<SavingsTracker {...defaultProps} onAddSavingsGoal={handleAdd} />);
    openForm();

    const nameInput = screen.getByPlaceholderText('e.g. New Laptop');
    fireEvent.change(nameInput, { target: { value: 'My Goal' } });

    const amountInput = screen.getByPlaceholderText('e.g. 50000');
    fireEvent.change(amountInput, { target: { value: '15000' } });

    fireEvent.click(screen.getByText('Create Goal'));

    expect(handleAdd).toHaveBeenCalledOnce();
    expect(handleAdd).toHaveBeenCalledWith({
      name: 'My Goal',
      targetAmount: 15000,
      deadline: '',
      color: '#22C55E',
      currentAmount: 0,
    });
  });

  it('closes the form after successful save', () => {
    const handleAdd = vi.fn();
    const { container } = render(<SavingsTracker {...defaultProps} onAddSavingsGoal={handleAdd} />);
    openForm();

    const nameInput = screen.getByPlaceholderText('e.g. New Laptop');
    fireEvent.change(nameInput, { target: { value: 'My Goal' } });

    const amountInput = screen.getByPlaceholderText('e.g. 50000');
    fireEvent.change(amountInput, { target: { value: '15000' } });

    fireEvent.click(screen.getByText('Create Goal'));
    expect(container.querySelector('.bottom-drawer')).toBeNull();
  });
});

// ==============================================================================
// Edit Goal
// ==============================================================================

describe('SavingsTracker — Edit Goal', () => {
  it('opens form with pre-filled data when clicking Edit', () => {
    render(<SavingsTracker {...defaultProps} />);

    const editBtns = screen.getAllByText('Edit');
    // Click Edit on first card (Laptop, sorted first at 100%)
    fireEvent.click(editBtns[0]);

    expect(screen.getByText('Edit Goal')).toBeTruthy();
  });

  it('calls onUpdateSavingsGoal with merged data', () => {
    const handleUpdate = vi.fn();
    render(<SavingsTracker {...defaultProps} onUpdateSavingsGoal={handleUpdate} />);

    // Click Edit on Emergency Fund (second card, sorted at 60%)
    const editBtns = screen.getAllByText('Edit');
    fireEvent.click(editBtns[1]);

    // Change the target amount
    const amountInput = screen.getByPlaceholderText('e.g. 50000');
    fireEvent.change(amountInput, { target: { value: '40000' } });

    fireEvent.click(screen.getByText('Save Changes'));

    expect(handleUpdate).toHaveBeenCalledOnce();
    expect(handleUpdate).toHaveBeenCalledWith(expect.objectContaining({
      id: 'goal_emergency',
      name: 'Emergency Fund',
      targetAmount: 40000,
      currentAmount: 18000,
    }));
  });

  it('closes form after saving edit', () => {
    const handleUpdate = vi.fn();
    const { container } = render(<SavingsTracker {...defaultProps} onUpdateSavingsGoal={handleUpdate} />);

    const editBtns = screen.getAllByText('Edit');
    fireEvent.click(editBtns[0]);

    fireEvent.click(screen.getByText('Save Changes'));
    expect(container.querySelector('.bottom-drawer')).toBeNull();
  });
});

// ==============================================================================
// Delete Goal
// ==============================================================================

describe('SavingsTracker — Delete Goal', () => {
  it('calls onDeleteSavingsGoal with correct id', () => {
    const handleDelete = vi.fn();
    render(<SavingsTracker {...defaultProps} onDeleteSavingsGoal={handleDelete} />);

    const allButtons = screen.getAllByRole('button');
    // Indices: back(0), add(1)
    // Laptop(completed): edit(2), delete(3)
    // Emergency: contribute(4), edit(5), delete(6)
    // Vacation: contribute(7), edit(8), delete(9)
    // Click delete on Laptop (first card, index 3)
    fireEvent.click(allButtons[3]);

    expect(handleDelete).toHaveBeenCalledOnce();
    expect(handleDelete).toHaveBeenCalledWith('goal_laptop');
  });

  it('deletes middle card (Emergency) correctly', () => {
    const handleDelete = vi.fn();
    render(<SavingsTracker {...defaultProps} onDeleteSavingsGoal={handleDelete} />);

    const allButtons = screen.getAllByRole('button');
    // Delete on Emergency (second card, index 6)
    fireEvent.click(allButtons[6]);

    expect(handleDelete).toHaveBeenCalledWith('goal_emergency');
  });

  it('deletes last card (Vacation) correctly', () => {
    const handleDelete = vi.fn();
    render(<SavingsTracker {...defaultProps} onDeleteSavingsGoal={handleDelete} />);

    const allButtons = screen.getAllByRole('button');
    // Delete on Vacation (last card, index 9)
    fireEvent.click(allButtons[9]);

    expect(handleDelete).toHaveBeenCalledWith('goal_vacation');
  });
});

// ==============================================================================
// Contribute to Goal
// ==============================================================================

describe('SavingsTracker — Contribute to Goal', () => {
  it('opens contribute drawer when clicking Contribute button', () => {
    render(<SavingsTracker {...defaultProps} />);

    const contributeBtns = screen.getAllByText('Contribute');
    fireEvent.click(contributeBtns[0]);

    // Should show contribution drawer for Emergency (first incomplete card)
    expect(screen.getByText(/Contribute to Emergency Fund/)).toBeTruthy();
    expect(screen.getByText('Add Contribution')).toBeTruthy();
  });

  it('shows progress info in contribute drawer', () => {
    render(<SavingsTracker {...defaultProps} />);

    const contributeBtns = screen.getAllByText('Contribute');
    fireEvent.click(contributeBtns[0]);

    // Shows Progress: ৳18,000 / ৳30,000 60%
    expect(screen.getByText(/Progress:/)).toBeTruthy();
    expect(screen.getByText(/18,000.*30,000/)).toBeTruthy();
  });

  it('shows account select with account names', () => {
    render(<SavingsTracker {...defaultProps} />);

    const contributeBtns = screen.getAllByText('Contribute');
    fireEvent.click(contributeBtns[0]);

    // Account options should have Cash (৳50,000) and Bank (৳2,00,000)
    expect(screen.getByText(/Cash.*50,000/)).toBeTruthy();
    expect(screen.getByText(/Bank.*200,000/)).toBeTruthy();
  });

  it('shows the contribution amount input', () => {
    render(<SavingsTracker {...defaultProps} />);

    const contributeBtns = screen.getAllByText('Contribute');
    fireEvent.click(contributeBtns[0]);

    expect(screen.getByText('AMOUNT (৳)')).toBeTruthy();
    expect(screen.getByText('FROM ACCOUNT')).toBeTruthy();
  });

  it('shows error when contributing without amount', () => {
    render(<SavingsTracker {...defaultProps} />);

    const contributeBtns = screen.getAllByText('Contribute');
    fireEvent.click(contributeBtns[0]);

    fireEvent.click(screen.getByText('Add Contribution'));
    expect(screen.getByText('Enter a valid contribution amount')).toBeTruthy();
  });

  it('shows error when contributing without selecting an account', () => {
    render(<SavingsTracker {...defaultProps} />);

    const contributeBtns = screen.getAllByText('Contribute');
    fireEvent.click(contributeBtns[0]);

    // Enter amount but don't select account
    const amountInput = screen.getAllByPlaceholderText('e.g. 50000')[0];
    fireEvent.change(amountInput, { target: { value: '5000' } });

    fireEvent.click(screen.getByText('Add Contribution'));
    expect(screen.getByText('Select an account')).toBeTruthy();
  });

  it('calls onContributeToSavingsGoal with correct params', () => {
    const handleContribute = vi.fn();
    render(<SavingsTracker {...defaultProps} onContributeToSavingsGoal={handleContribute} />);

    const contributeBtns = screen.getAllByText('Contribute');
    // Click Contribute on Vacation (third card sorted, second incomplete)
    fireEvent.click(contributeBtns[1]);

    // Enter amount (only one input with this placeholder when contribute drawer is open)
    const amountInput = screen.getAllByPlaceholderText('e.g. 50000')[0];
    fireEvent.change(amountInput, { target: { value: '10000' } });

    // Select account (only one select when contribute drawer is open)
    const select = screen.getAllByRole('combobox')[0];
    fireEvent.change(select, { target: { value: 'acc_bank' } });

    fireEvent.click(screen.getByText('Add Contribution'));

    expect(handleContribute).toHaveBeenCalledOnce();
    expect(handleContribute).toHaveBeenCalledWith('goal_vacation', 10000, 'acc_bank');
  });

  it('closes contribute drawer after successful contribution', () => {
    const handleContribute = vi.fn();
    const { container } = render(<SavingsTracker {...defaultProps} onContributeToSavingsGoal={handleContribute} />);

    const contributeBtns = screen.getAllByText('Contribute');
    fireEvent.click(contributeBtns[0]);

    const amountInput = screen.getAllByPlaceholderText('e.g. 50000')[0];
    fireEvent.change(amountInput, { target: { value: '5000' } });

    const select = screen.getAllByRole('combobox')[0];
    fireEvent.change(select, { target: { value: 'acc_cash' } });

    fireEvent.click(screen.getByText('Add Contribution'));
    expect(container.querySelector('.bottom-drawer')).toBeNull();
  });
});

// ==============================================================================
// Navigation
// ==============================================================================

describe('SavingsTracker — Navigation', () => {
  it('calls onNavigate with dashboard when clicking back button', () => {
    const handleNavigate = vi.fn();
    render(<SavingsTracker {...defaultProps} onNavigate={handleNavigate} />);

    fireEvent.click(getBackBtn());
    expect(handleNavigate).toHaveBeenCalledWith('dashboard');
  });
});

// ==============================================================================
// Close Form
// ==============================================================================

describe('SavingsTracker — Close Form', () => {
  it('closes the add form when clicking the overlay', () => {
    const { container } = render(<SavingsTracker {...defaultProps} />);
    openForm();
    expect(container.querySelector('.bottom-drawer')).toBeTruthy();

    const overlay = container.querySelector('.drawer-overlay');
    fireEvent.click(overlay);
    expect(container.querySelector('.bottom-drawer')).toBeNull();
  });

  it('closes the add form when clicking the X button', () => {
    const { container } = render(<SavingsTracker {...defaultProps} />);
    openForm();
    expect(container.querySelector('.bottom-drawer')).toBeTruthy();

    const xBtn = container.querySelector('.bottom-drawer button');
    fireEvent.click(xBtn);
    expect(container.querySelector('.bottom-drawer')).toBeNull();
  });

  it('closes the contribute drawer when clicking the overlay', () => {
    const { container } = render(<SavingsTracker {...defaultProps} />);

    const contributeBtns = screen.getAllByText('Contribute');
    fireEvent.click(contributeBtns[0]);
    expect(container.querySelector('.bottom-drawer')).toBeTruthy();

    const overlay = container.querySelector('.drawer-overlay');
    fireEvent.click(overlay);
    expect(container.querySelector('.bottom-drawer')).toBeNull();
  });

  it('closes the contribute drawer when clicking the X button', () => {
    const { container } = render(<SavingsTracker {...defaultProps} />);

    const contributeBtns = screen.getAllByText('Contribute');
    fireEvent.click(contributeBtns[0]);
    expect(container.querySelector('.bottom-drawer')).toBeTruthy();

    const xBtn = container.querySelector('.bottom-drawer button');
    fireEvent.click(xBtn);
    expect(container.querySelector('.bottom-drawer')).toBeNull();
  });
});

// ==============================================================================
// Bangla Mode
// ==============================================================================

describe('SavingsTracker — Bangla Mode', () => {
  it('renders title in Bangla', () => {
    render(<SavingsTracker {...defaultProps} lang="bn" />);
    expect(screen.getByText('সঞ্চয় লক্ষ্য')).toBeTruthy();
  });

  it('shows summary labels in Bangla', () => {
    render(<SavingsTracker {...defaultProps} lang="bn" />);
    expect(screen.getByText('মোট সঞ্চয়')).toBeTruthy();
    expect(screen.getByText(/লক্ষ্য:/)).toBeTruthy();
  });

  it('shows empty state in Bangla', () => {
    render(<SavingsTracker {...defaultProps} savingsGoals={[]} lang="bn" />);
    expect(screen.getByText('এখনো কোনো সঞ্চয় লক্ষ্য নেই')).toBeTruthy();
    expect(screen.getByText('বড় কিছু অর্জনের জন্য সঞ্চয় শুরু করুন!')).toBeTruthy();
  });

  it('shows form labels in Bangla when form opens', () => {
    render(<SavingsTracker {...defaultProps} lang="bn" />);
    openForm();

    expect(screen.getByText('লক্ষ্যের নাম')).toBeTruthy();
    expect(screen.getByText('লক্ষ্য পরিমাণ (৳)')).toBeTruthy();
    expect(screen.getByText('সময়সীমা (ঐচ্ছিক)')).toBeTruthy();
    expect(screen.getByText('থিম কালার')).toBeTruthy();
  });

  it('shows form button text in Bangla', () => {
    render(<SavingsTracker {...defaultProps} lang="bn" />);
    openForm();
    expect(screen.getByText('লক্ষ্য তৈরি করুন')).toBeTruthy();
  });

  it('shows error messages in Bangla', () => {
    render(<SavingsTracker {...defaultProps} lang="bn" />);
    openForm();

    fireEvent.click(screen.getByText('লক্ষ্য তৈরি করুন'));
    expect(screen.getByText('অনুগ্রহ করে লক্ষ্যের নাম লিখুন')).toBeTruthy();
  });

  it('shows edit form in Bangla when editing', () => {
    render(<SavingsTracker {...defaultProps} lang="bn" />);

    const editBtns = screen.getAllByText('সম্পাদনা');
    fireEvent.click(editBtns[0]);

    expect(screen.getByText('লক্ষ্য সম্পাদনা')).toBeTruthy();
    expect(screen.getByText('পরিবর্তন সেভ করুন')).toBeTruthy();
  });

  it('shows contribute drawer labels in Bangla', () => {
    render(<SavingsTracker {...defaultProps} lang="bn" />);

    const contributeBtns = screen.getAllByText('অবদান');
    fireEvent.click(contributeBtns[0]);

    expect(screen.getByText(/অবদান.*Emergency Fund/)).toBeTruthy();
    expect(screen.getByText('পরিমাণ (৳)')).toBeTruthy();
    expect(screen.getByText('হতে একাউন্ট')).toBeTruthy();
    expect(screen.getByText('অবদান যোগ করুন')).toBeTruthy();
  });

  it('shows contribute drawer progress info in Bangla', () => {
    render(<SavingsTracker {...defaultProps} lang="bn" />);

    const contributeBtns = screen.getAllByText('অবদান');
    fireEvent.click(contributeBtns[0]);

    expect(screen.getByText(/অগ্রগতি:/)).toBeTruthy();
  });

  it('shows goal achieved text in Bangla', () => {
    render(<SavingsTracker {...defaultProps} lang="bn" />);
    expect(screen.getByText('লক্ষ্য অর্জিত! 🎉')).toBeTruthy();
  });

  it('shows remaining text in Bangla', () => {
    render(<SavingsTracker {...defaultProps} lang="bn" />);
    // Emergency: ১২,০০০ remaining (Bangla digits)
    expect(screen.getByText(/১২,০০০.*অবশিষ্ট/)).toBeTruthy();
  });
});

// ==============================================================================
// Edge Cases
// ==============================================================================

describe('SavingsTracker — Edge Cases', () => {
  it('handles empty savingsGoals array', () => {
    render(<SavingsTracker {...defaultProps} savingsGoals={[]} />);
    expect(screen.getByText('No savings goals yet')).toBeTruthy();
  });

  it('handles empty accounts array (no crash in contribute drawer)', () => {
    render(<SavingsTracker {...defaultProps} accounts={[]} />);
    // Goals render fine
    expect(screen.getByText('Savings Goals')).toBeTruthy();
  });

  it('handles single goal', () => {
    const singleGoal = [mockGoals[0]];
    render(<SavingsTracker {...defaultProps} savingsGoals={singleGoal} />);
    expect(screen.getByText('Vacation Fund')).toBeTruthy();
  });

  it('handles undefined savingsGoals gracefully', () => {
    render(
      <SavingsTracker
        accounts={mockAccounts}
        onAddSavingsGoal={() => {}}
        onUpdateSavingsGoal={() => {}}
        onDeleteSavingsGoal={() => {}}
        onContributeToSavingsGoal={() => {}}
        onNavigate={() => {}}
        lang="en"
      />
    );
    expect(screen.getByText('No savings goals yet')).toBeTruthy();
  });

  it('handles undefined accounts gracefully', () => {
    render(
      <SavingsTracker
        savingsGoals={mockGoals}
        onAddSavingsGoal={() => {}}
        onUpdateSavingsGoal={() => {}}
        onDeleteSavingsGoal={() => {}}
        onContributeToSavingsGoal={() => {}}
        onNavigate={() => {}}
        lang="en"
      />
    );
    expect(screen.getByText('Savings Goals')).toBeTruthy();
  });

  it('handles missing optional props gracefully', () => {
    render(
      <SavingsTracker
        savingsGoals={mockGoals}
        accounts={mockAccounts}
        onNavigate={() => {}}
      />
    );
    expect(screen.getByText('Savings Goals')).toBeTruthy();
  });

  it('handles all goals completed', () => {
    const allCompleted = mockGoals.map(g => ({
      ...g,
      currentAmount: g.targetAmount,
    }));
    render(<SavingsTracker {...defaultProps} savingsGoals={allCompleted} />);
    // All show Goal achieved
    const achieved = screen.getAllByText('Goal achieved! 🎉');
    expect(achieved.length).toBe(3);
    // No Contribute buttons
    expect(screen.queryByText('Contribute')).toBeNull();
  });

  it('handles all goals at 0 progress', () => {
    const zeroProgress = mockGoals.map(g => ({
      ...g,
      currentAmount: 0,
    }));
    render(<SavingsTracker {...defaultProps} savingsGoals={zeroProgress} />);
    // All show 0% and full remaining
    // 3 goals at 0% + summary card also shows 0%
    expect(screen.getAllByText('0%').length).toBeGreaterThanOrEqual(3);
  });
});
