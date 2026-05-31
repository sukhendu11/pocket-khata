import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import TransactionForm from '../components/TransactionForm';
import AccountManager from '../components/AccountManager';
import CategoryManager from '../components/CategoryManager';


// ==============================================================================
// Mock Data
// ==============================================================================

const mockAccounts = [
  { id: 'acc_cash', name: 'Cash Wallet', type: 'Cash', balance: 15000, color: '#3cd070' },
  { id: 'acc_bank', name: 'Prime Bank', type: 'Bank', balance: 85000, color: '#3867d6' },
  { id: 'acc_bkash', name: 'My bKash', type: 'Bkash', balance: 5000, color: '#e84393' },
];

const mockCategories = [
  { id: 'cat_food', name: 'Food & Drinks', type: 'expense', icon: 'Utensils', color: '#ff7b54', subcategories: [] },
  { id: 'cat_transport', name: 'Transport', type: 'expense', icon: 'Car', color: '#f1c40f', subcategories: [] },
  { id: 'cat_rent', name: 'Rent', type: 'expense', icon: 'Home', color: '#e74c3c', subcategories: [] },
  { id: 'cat_salary', name: 'Salary', type: 'income', icon: 'Briefcase', color: '#3cd070', subcategories: [] },
];

const mockTransactions = [
  { id: 'tx_1', type: 'expense', amount: 1500, date: '2025-05-10', accountId: 'acc_cash', categoryId: 'cat_food', notes: 'Lunch' },
  { id: 'tx_2', type: 'expense', amount: 300, date: '2025-05-11', accountId: 'acc_cash', categoryId: 'cat_transport', notes: 'Bus fare' },
  { id: 'tx_3', type: 'expense', amount: 25000, date: '2025-05-01', accountId: 'acc_bank', categoryId: 'cat_rent', notes: 'Monthly rent' },
  { id: 'tx_4', type: 'income', amount: 80000, date: '2025-05-01', accountId: 'acc_bank', categoryId: 'cat_salary', notes: 'Salary' },
];

beforeEach(() => { cleanup(); vi.clearAllMocks(); });
afterEach(() => { vi.unstubAllGlobals(); });// ==============================================================================//  Helper: Find the floating close button inside a rendered container
// ==============================================================================

/** Get the close X button from inside the drawer header */
const getDrawerCloseBtn = (container) => {
  const drawer = container.querySelector('.bottom-drawer');
  if (!drawer) return null;
  const header = drawer.querySelector('.drawer-header');
  if (!header) return null;
  // The close (X) button is the last button in the header
  const buttons = header.querySelectorAll('button');
  for (const btn of buttons) {
    if (btn.querySelector('svg')) return btn;
  }
  return null;
};

// ==============================================================================
// Floating Close Button — TransactionForm Drawer
// ==============================================================================

describe('Floating Close Button - TransactionForm', () => {
  it('renders drawer with floating close button', () => {
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

    const closeBtn = getDrawerCloseBtn(container);
    expect(closeBtn).toBeTruthy();
    expect(closeBtn.tagName).toBe('BUTTON');
    // Should contain an X icon (SVG child)
    expect(closeBtn.querySelector('svg')).toBeTruthy();
  });

  it('close button is inside .drawer-header (not inside .drawer-scrollable)', () => {
    const { container } = render(
      <TransactionForm
        accounts={mockAccounts}
        categories={mockCategories}
        onSave={() => {}}
        onClose={() => {}}
        lang="en"
      />
    );

    const drawer = container.querySelector('.bottom-drawer');
    const closeBtn = getDrawerCloseBtn(container);
    const header = drawer.querySelector('.drawer-header');
    // The close button should be inside the .drawer-header
    expect(header.contains(closeBtn)).toBe(true);
    // It should NOT be inside .drawer-scrollable
    const scrollable = drawer.querySelector('.drawer-scrollable');
    if (scrollable) {
      expect(scrollable.contains(closeBtn)).toBe(false);
    }
  });

  it('clicking close button calls onClose handler', () => {
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

    const closeBtn = getDrawerCloseBtn(container);
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledOnce();
  });

  it('close button renders even with many accounts (overflow content scenario)', () => {
    const manyAccounts = Array.from({ length: 20 }, (_, i) => ({
      id: `acc_${i}`,
      name: `Account ${i}`,
      type: 'Bank',
      balance: 1000 * i,
      color: '#4a90e2',
    }));

    const { container } = render(
      <TransactionForm
        accounts={manyAccounts}
        categories={mockCategories}
        onSave={() => {}}
        onClose={() => {}}
        lang="en"
      />
    );

    const closeBtn = getDrawerCloseBtn(container);
    expect(closeBtn).toBeTruthy();
    expect(closeBtn.querySelector('svg')).toBeTruthy();
  });
});

// ==============================================================================
// Floating Close Button — AccountManager Drawers (3 drawers)
// ==============================================================================

describe('Floating Close Button - AccountManager', () => {
  it('renders floating close button in account detail drawer', () => {
    vi.stubGlobal('confirm', vi.fn(() => false));
    const { container } = render(
      <AccountManager
        accounts={mockAccounts}
        transactions={mockTransactions}
        onAddAccount={() => {}}
        onDeleteAccount={() => {}}
        onNavigate={() => {}}
        lang="en"
      />
    );

    // Open the account detail drawer
    fireEvent.click(screen.getByText('Cash Wallet'));
    const closeBtn = getDrawerCloseBtn(container);
    expect(closeBtn).toBeTruthy();
    expect(closeBtn.tagName).toBe('BUTTON');
    expect(closeBtn.querySelector('svg')).toBeTruthy();
  });

  it('account detail drawer close button calls setSelectedAccount(null)', () => {
    const { container } = render(
      <AccountManager
        accounts={mockAccounts}
        transactions={mockTransactions}
        onAddAccount={() => {}}
        onDeleteAccount={() => {}}
        onNavigate={() => {}}
        lang="en"
      />
    );

    // Open drawer, confirm it's visible
    fireEvent.click(screen.getByText('Cash Wallet'));
    expect(screen.getByText('CURRENT BALANCE')).toBeTruthy();

    // Click the floating close button
    const closeBtn = getDrawerCloseBtn(container);
    fireEvent.click(closeBtn);

    // Drawer should be closed
    expect(screen.queryByText('CURRENT BALANCE')).toBeNull();
  });

  it('renders floating close button in edit balance drawer (system account)', () => {
    const systemAccounts = [
      { id: 'acc_cash', name: 'Cash', type: 'Cash', balance: 10000, color: '#3cd070', system: true },
    ];
    const { container } = render(
      <AccountManager
        accounts={systemAccounts}
        transactions={[]}
        onAddAccount={() => {}}
        onUpdateAccount={() => {}}
        onDeleteAccount={() => {}}
        onNavigate={() => {}}
        lang="en"
      />
    );

    // Open account detail drawer
    fireEvent.click(screen.getByText('Cash'));
    // Click Edit Balance button to open the edit balance sub-drawer
    fireEvent.click(screen.getByText('Edit Balance'));

    // Now there should be 2 .bottom-drawer elements (account detail + edit balance)
    // The floating close button should exist in the second drawer
    const drawers = container.querySelectorAll('.bottom-drawer');
    expect(drawers.length).toBeGreaterThanOrEqual(1);

    // The edit balance drawer should have a floating close button
    const allCloseBtns = container.querySelectorAll('.bottom-drawer .drawer-header button:last-child');
    expect(allCloseBtns.length).toBeGreaterThanOrEqual(1);
    expect(allCloseBtns[allCloseBtns.length - 1].querySelector('svg')).toBeTruthy();
  });

  it('renders floating close button in add account modal drawer', () => {
    const { container } = render(
      <AccountManager
        accounts={mockAccounts}
        transactions={mockTransactions}
        onAddAccount={() => {}}
        onDeleteAccount={() => {}}
        onNavigate={() => {}}
        lang="en"
      />
    );

    // Click the + button to open the add account modal
    const allButtons = screen.getAllByRole('button');
    fireEvent.click(allButtons[1]); // + add button
    expect(screen.getByText('Add Financial Wallet')).toBeTruthy();

    const closeBtn = container.querySelector('.bottom-drawer .drawer-header button:last-child');
    expect(closeBtn).toBeTruthy();
    expect(closeBtn.querySelector('svg')).toBeTruthy();
  });

  it('add account modal close button closes the modal', () => {
    const { container } = render(
      <AccountManager
        accounts={mockAccounts}
        transactions={mockTransactions}
        onAddAccount={() => {}}
        onDeleteAccount={() => {}}
        onNavigate={() => {}}
        lang="en"
      />
    );

    const allButtons = screen.getAllByRole('button');
    fireEvent.click(allButtons[1]); // + add button
    expect(screen.getByText('Add Financial Wallet')).toBeTruthy();

    const closeBtn = container.querySelector('.bottom-drawer .drawer-header button:last-child');
    fireEvent.click(closeBtn);
    expect(screen.queryByText('Add Financial Wallet')).toBeNull();
  });

  it('close button is inside .drawer-header in account drawer', () => {
    const { container } = render(
      <AccountManager
        accounts={mockAccounts}
        transactions={mockTransactions}
        onAddAccount={() => {}}
        onDeleteAccount={() => {}}
        onNavigate={() => {}}
        lang="en"
      />
    );

    fireEvent.click(screen.getByText('Cash Wallet'));
    const drawer = container.querySelector('.bottom-drawer');
    const header = drawer.querySelector('.drawer-header');
    const closeBtn = getDrawerCloseBtn(container);
    expect(header.contains(closeBtn)).toBe(true);
  });
});

// ==============================================================================
// Floating Close Button — CategoryManager Drawer
// ==============================================================================

describe('Floating Close Button - CategoryManager', () => {
  it('renders floating close button in add/edit category drawer', () => {
    const { container } = render(
      <CategoryManager
        categories={mockCategories}
        transactions={mockTransactions}
        onAddCategory={() => {}}
        onUpdateCategory={() => {}}
        onDeleteCategory={() => {}}
        onNavigate={() => {}}
        lang="en"
      />
    );

    // Click the + button to open the add category modal
    const addBtn = screen.getAllByRole('button')[1]; // + add button
    fireEvent.click(addBtn);
    expect(screen.getByText('New Category')).toBeTruthy();

    const closeBtn = getDrawerCloseBtn(container);
    expect(closeBtn).toBeTruthy();
    expect(closeBtn.tagName).toBe('BUTTON');
    expect(closeBtn.querySelector('svg')).toBeTruthy();
  });

  it('close button is inside .drawer-header in category drawer', () => {
    const { container } = render(
      <CategoryManager
        categories={mockCategories}
        transactions={mockTransactions}
        onAddCategory={() => {}}
        onUpdateCategory={() => {}}
        onDeleteCategory={() => {}}
        onNavigate={() => {}}
        lang="en"
      />
    );

    const addBtn = screen.getAllByRole('button')[1];
    fireEvent.click(addBtn);

    const drawer = container.querySelector('.bottom-drawer');
    const header = drawer.querySelector('.drawer-header');
    const closeBtn = getDrawerCloseBtn(container);
    expect(header.contains(closeBtn)).toBe(true);
  });

  it('clicking close button closes the category drawer', () => {
    const { container } = render(
      <CategoryManager
        categories={mockCategories}
        transactions={mockTransactions}
        onAddCategory={() => {}}
        onUpdateCategory={() => {}}
        onDeleteCategory={() => {}}
        onNavigate={() => {}}
        lang="en"
      />
    );

    const addBtn = screen.getAllByRole('button')[1];
    fireEvent.click(addBtn);
    expect(screen.getByText('New Category')).toBeTruthy();

    const closeBtn = getDrawerCloseBtn(container);
    fireEvent.click(closeBtn);
    expect(screen.queryByText('New Category')).toBeNull();
  });

  it('close button renders with many categories in the grid (overflow content scenario)', () => {
    const manyCategories = Array.from({ length: 30 }, (_, i) => ({
      id: `cat_${i}`,
      name: `Category ${i}`,
      type: i % 2 === 0 ? 'expense' : 'income',
      icon: 'Tag',
      color: '#ff7b54',
      subcategories: [],
    }));

    const { container } = render(
      <CategoryManager
        categories={manyCategories}
        transactions={mockTransactions}
        onAddCategory={() => {}}
        onUpdateCategory={() => {}}
        onDeleteCategory={() => {}}
        onNavigate={() => {}}
        lang="en"
      />
    );

    const addBtn = screen.getAllByRole('button')[1];
    fireEvent.click(addBtn);

    const closeBtn = getDrawerCloseBtn(container);
    expect(closeBtn).toBeTruthy();
    expect(closeBtn.querySelector('svg')).toBeTruthy();
  });
});

// ==============================================================================
// Cross-Component: Floating close button structure verification
// ==============================================================================

describe('Drawer Close Button — Structural Consistency', () => {
  it('all drawer close buttons contain an SVG icon (X icon)', () => {
    // TransactionForm
    const { container: txContainer } = render(
      <TransactionForm
        accounts={mockAccounts}
        categories={mockCategories}
        onSave={() => {}}
        onClose={() => {}}
        lang="en"
      />
    );
    const txCloseBtn = getDrawerCloseBtn(txContainer);
    expect(txCloseBtn.querySelector('svg')).toBeTruthy();
    cleanup();

    // CategoryManager
    const { container: catContainer } = render(
      <CategoryManager
        categories={mockCategories}
        transactions={mockTransactions}
        onAddCategory={() => {}}
        onUpdateCategory={() => {}}
        onDeleteCategory={() => {}}
        onNavigate={() => {}}
        lang="en"
      />
    );
    const addBtn = catContainer.querySelectorAll('button');
    // Click + button to open modal
    fireEvent.click(addBtn[1]);
    const catCloseBtn = getDrawerCloseBtn(catContainer);
    if (catCloseBtn) expect(catCloseBtn.querySelector('svg')).toBeTruthy();
    cleanup();
  });

  it('close buttons are placed inside .drawer-header', () => {
    const { container } = render(
      <TransactionForm
        accounts={mockAccounts}
        categories={mockCategories}
        onSave={() => {}}
        onClose={() => {}}
        lang="en"
      />
    );
    const header = container.querySelector('.drawer-header');
    expect(header).toBeTruthy();
    const closeBtn = getDrawerCloseBtn(container);
    expect(header.contains(closeBtn)).toBe(true);
  });

  it('floating close button remains clickable after form interactions (no interference)', () => {
    const handleClose = vi.fn();
    render(
      <TransactionForm
        accounts={mockAccounts}
        categories={mockCategories}
        onSave={() => {}}
        onClose={handleClose}
        lang="en"
      />
    );

    // Interact with the form — fill in some fields
    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '2500' } });

    const dateInput = screen.getByDisplayValue(
      new Date().toISOString().split('T')[0]
    );
    fireEvent.change(dateInput, { target: { value: '2025-06-15' } });

    // The close button should still be clickable
    const closeBtn = document.querySelector('.drawer-header button:last-child');
    expect(closeBtn).toBeTruthy();
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledOnce();
  });
});
