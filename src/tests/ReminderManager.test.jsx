import { describe, it, expect } from 'vitest';

describe.skip('ReminderManager — preserved for future use', () => {
  it('placeholder — re-enable by uncommenting the file below', () => {
    expect(true).toBe(true);
  });
});

/*
  🗓️ ReminderManager Tests — Commented out for future use
  ==============================================================================

  This test file was removed alongside the ReminderManager component in commit
  00659e4 but is preserved here as a reference. To re-enable:
    1. Uncomment this entire file
    2. Restore src/components/ReminderManager.jsx (also commented out)
    3. Restore src/notifications.js (also commented out)
    4. Restore the i18n keys (reminders.*, notif.*)
    5. Restore the db methods (getReminders, saveReminders, etc.)
    6. Run tests
==============================================================================
*/

// import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// import { render, screen, fireEvent, cleanup } from '@testing-library/react';
// import ReminderManager from '../components/ReminderManager';

// // ==============================================================================
// // Mock Dependencies
// // ==============================================================================

// vi.mock('../lib/analytics', () => ({
//   trackAction: vi.fn(),
//   trackError: vi.fn(),
// }));

// const mockGetNotificationPermission = vi.fn();
// const mockRequestNotificationPermission = vi.fn();
// const mockIsNotificationSupported = vi.fn();
// const mockIsServiceWorkerActive = vi.fn();
// const mockRegisterServiceWorker = vi.fn();

// vi.mock('../notifications', () => ({
//   getNotificationPermission: (...args) => mockGetNotificationPermission(...args),
//   requestNotificationPermission: (...args) => mockRequestNotificationPermission(...args),
//   isNotificationSupported: (...args) => mockIsNotificationSupported(...args),
//   isServiceWorkerActive: (...args) => mockIsServiceWorkerActive(...args),
//   registerServiceWorker: (...args) => mockRegisterServiceWorker(...args),
// }));

// // ==============================================================================
// // Helpers
// // ==============================================================================

// /** Find the + (Add) button by its Plus icon. Falls back to second button (header). */
// function findAddButton() {
//   const buttons = screen.getAllByRole('button');
//   const plusBtn = buttons.find(btn => btn.querySelector('.lucide-plus'));
//   expect(plusBtn || buttons[1]).toBeTruthy();
//   return plusBtn || buttons[1];
// }

// /** Find all delete (Trash) buttons. */
// function findDeleteButtons() {
//   return screen.getAllByRole('button').filter(b => b.querySelector('.lucide-trash-2'));
// }

// /** Find a specific overlay by class name (asserts at least one exists). */
// function findOverlay() {
//   const overlays = document.querySelectorAll('.drawer-overlay');
//   expect(overlays.length).toBeGreaterThanOrEqual(1);
//   return overlays[0];
// }

// /** Find date inputs. */
// function findDateInput() {
//   const inputs = document.querySelectorAll('input[type="date"]');
//   expect(inputs.length).toBeGreaterThanOrEqual(1);
//   return inputs[0];
// }

// /** Open the add reminder modal and assert it's visible. */
// function openAddModal(expectedTitle) {
//   fireEvent.click(findAddButton());
//   const title = expectedTitle || 'New Bill Reminder';
//   expect(screen.getByText(title)).toBeTruthy();
// }

// /** Fill the add/reminder form with given data. */
// function fillForm({ name, amount, dueDate, categoryId }) {
//   if (name !== undefined) {
//     const nameInput = screen.getByPlaceholderText('E.g., Dhaka Electric Supply, Spotify');
//     fireEvent.change(nameInput, { target: { value: name } });
//   }
//   if (amount !== undefined) {
//     const amountInput = screen.getByPlaceholderText('0.00');
//     fireEvent.change(amountInput, { target: { value: String(amount) } });
//   }
//   if (dueDate !== undefined) {
//     fireEvent.change(findDateInput(), { target: { value: dueDate } });
//   }
//   if (categoryId !== undefined) {
//     const select = screen.getByRole('combobox');
//     fireEvent.change(select, { target: { value: categoryId } });
//   }
// }

// /** Fill all required fields with valid data and submit. */
// function fillAndSubmitValidForm() {
//   fillForm({
//     name: 'Test Bill',
//     amount: '500',
//     dueDate: '2026-07-01',
//     categoryId: 'cat_utilities',
//   });
//   fireEvent.click(screen.getByText('Create Reminder'));
// }

// // ==============================================================================
// // Mock Data
// // ==============================================================================

// const mockCategories = [
//   { id: 'cat_utilities', name: 'Bills & Utilities', type: 'expense', color: '#74b9ff' },
//   { id: 'cat_food', name: 'Food & Dining', type: 'expense', color: '#e17055' },
//   { id: 'cat_salary', name: 'Salary', type: 'income', color: '#2ecc71' },
// ];

// const mockAccounts = [
//   { id: 'acc_cash', name: 'Cash Ledger', type: 'Cash', balance: 15000, color: '#3cd070' },
//   { id: 'acc_bank', name: 'Bank Account', type: 'Bank', balance: 85000, color: '#4a90e2' },
// ];

// const mockOverdueReminder = {
//   id: 'rem_overdue',
//   name: 'Overdue Bill',
//   amount: 2000,
//   dueDate: '2024-01-15',
//   categoryId: 'cat_utilities',
//   status: 'unpaid',
// };

// const mockUnpaidReminders = [
//   {
//     id: 'rem_1',
//     name: 'Electricity Bill',
//     amount: 1850,
//     dueDate: '2026-06-15',
//     categoryId: 'cat_utilities',
//     status: 'unpaid',
//   },
//   {
//     id: 'rem_2',
//     name: 'Internet Subscription',
//     amount: 950,
//     dueDate: '2026-06-20',
//     categoryId: 'cat_utilities',
//     status: 'unpaid',
//   },
// ];

// const mockPaidReminders = [
//   {
//     id: 'rem_paid',
//     name: 'Gym Membership',
//     amount: 1500,
//     dueDate: '2026-05-10',
//     categoryId: 'cat_food',
//     status: 'paid',
//   },
// ];

// const defaultProps = {
//   reminders: [...mockUnpaidReminders, ...mockPaidReminders],
//   accounts: mockAccounts,
//   categories: mockCategories,
//   onAddReminder: vi.fn(),
//   onUpdateReminder: vi.fn(),
//   onPayReminder: vi.fn(),
//   onDeleteReminder: vi.fn(),
//   onNavigate: vi.fn(),
//   lang: 'en',
// };

// // ==============================================================================
// // Test Setup
// // ==============================================================================

// beforeEach(() => {
//   cleanup();
//   vi.clearAllMocks();
//   mockGetNotificationPermission.mockReturnValue('default');
//   mockIsNotificationSupported.mockReturnValue(true);
//   mockIsServiceWorkerActive.mockResolvedValue(false);
//   mockRegisterServiceWorker.mockResolvedValue(null);
//   localStorage.clear();
// });

// afterEach(() => {
//   vi.unstubAllGlobals();
// });

// // ==============================================================================
// // Rendering
// // ==============================================================================

// describe('ReminderManager — Rendering', () => {
//   it('renders without crashing', () => {
//     render(<ReminderManager {...defaultProps} />);
//     expect(screen.getByText('Bill Reminders')).toBeTruthy();
//   });

//   it('shows back button and add button', () => {
//     render(<ReminderManager {...defaultProps} />);
//     const buttons = screen.getAllByRole('button');
//     expect(buttons.length).toBeGreaterThanOrEqual(2);
//   });

//   it('renders all unpaid reminder names', () => {
//     render(<ReminderManager {...defaultProps} />);
//     expect(screen.getByText('Electricity Bill')).toBeTruthy();
//     expect(screen.getByText('Internet Subscription')).toBeTruthy();
//   });

//   it('does not show paid reminders on unpaid tab by default', () => {
//     render(<ReminderManager {...defaultProps} />);
//     expect(screen.getByText('Electricity Bill')).toBeTruthy();
//     expect(screen.queryByText('Gym Membership')).toBeNull();
//   });

//   it('shows reminder amounts', () => {
//     render(<ReminderManager {...defaultProps} />);
//     expect(screen.getByText(/৳1,850/)).toBeTruthy();
//     expect(screen.getByText(/৳950/)).toBeTruthy();
//   });

//   it('shows due dates', () => {
//     render(<ReminderManager {...defaultProps} />);
//     expect(screen.getAllByText(/Due:/).length).toBeGreaterThanOrEqual(1);
//   });
// });

// // ==============================================================================
// // Filter Tabs
// // ==============================================================================

// describe('ReminderManager — Filter Tabs', () => {
//   it('defaults to unpaid tab', () => {
//     render(<ReminderManager {...defaultProps} />);
//     expect(screen.getByText('UNPAID')).toBeTruthy();
//     expect(screen.queryByText('PAID')).toBeTruthy();
//   });

//   it('switching to paid tab shows paid reminders', () => {
//     render(<ReminderManager {...defaultProps} />);
//     fireEvent.click(screen.getByText('PAID'));
//     expect(screen.getByText('Gym Membership')).toBeTruthy();
//     expect(screen.queryByText('Electricity Bill')).toBeNull();
//   });

//   it('switching to all tab shows all reminders', () => {
//     render(<ReminderManager {...defaultProps} />);
//     // ALL tab renders as "ALL TRANSACTIONS" from i18n
//     fireEvent.click(screen.getByRole('button', { name: /all transactions/i }));
//     expect(screen.getByText('Electricity Bill')).toBeTruthy();
//     expect(screen.getByText('Gym Membership')).toBeTruthy();
//   });

//   it('back to unpaid tab from all tab filters correctly', () => {
//     render(<ReminderManager {...defaultProps} />);
//     fireEvent.click(screen.getByRole('button', { name: /all transactions/i }));
//     expect(screen.getByText('Gym Membership')).toBeTruthy();

//     fireEvent.click(screen.getByText('UNPAID'));
//     expect(screen.getByText('Electricity Bill')).toBeTruthy();
//     expect(screen.queryByText('Gym Membership')).toBeNull();
//   });
// });

// // ==============================================================================
// // Empty State
// // ==============================================================================

// describe('ReminderManager — Empty State', () => {
//   it('shows empty state when filtered list is empty', () => {
//     render(<ReminderManager {...defaultProps} reminders={[]} />);
//     expect(screen.getByText('No reminders in this category.')).toBeTruthy();
//   });

//   it('shows BellRing icon in empty state', () => {
//     const { container } = render(<ReminderManager {...defaultProps} reminders={[]} />);
//     expect(screen.getByText('No reminders in this category.')).toBeTruthy();
//     // Verify a BellRing icon is rendered inside the empty state container
//     const bellRing = container.querySelector('.lucide-bell-ring');
//     expect(bellRing).toBeTruthy();
//   });
// });

// // ==============================================================================
// // Overdue Display
// // ==============================================================================

// describe('ReminderManager — Overdue Display', () => {
//   it('shows overdue badge for overdue unpaid reminders', () => {
//     render(<ReminderManager {...defaultProps} reminders={[mockOverdueReminder]} />);
//     expect(screen.getByText('Overdue')).toBeTruthy();
//   });

//   it('does not show overdue badge for reminders that are not overdue', () => {
//     const futureReminders = [
//       { id: 'rem_future', name: 'Future Bill', amount: 500, dueDate: '2099-12-31', categoryId: 'cat_food', status: 'unpaid' },
//     ];
//     render(<ReminderManager {...defaultProps} reminders={futureReminders} />);
//     expect(screen.queryByText('Overdue')).toBeNull();
//   });
// });

// // ==============================================================================
// // Add Reminder Modal
// // ==============================================================================

// describe('ReminderManager — Add Reminder Modal', () => {
//   it('opens the modal when clicking the + button', () => {
//     render(<ReminderManager {...defaultProps} />);
//     openAddModal();
//   });

//   it('shows form fields in the add modal', () => {
//     render(<ReminderManager {...defaultProps} />);
//     openAddModal();

//     expect(screen.getByText('BILL NAME / PAYEE')).toBeTruthy();
//     expect(screen.getByText('BILL AMOUNT (৳)')).toBeTruthy();
//     expect(screen.getByText('DUE DATE')).toBeTruthy();
//     expect(screen.getByText('CATEGORY')).toBeTruthy();
//     expect(screen.getByText('Create Reminder')).toBeTruthy();
//   });

//   it('closes the modal when clicking X button', () => {
//     render(<ReminderManager {...defaultProps} />);
//     openAddModal();

//     // Find the X close button in the modal header (has lucide-x icon)
//     const xButton = screen.getAllByRole('button').find(
//       b => b.querySelector('.lucide-x')
//     );
//     expect(xButton).toBeTruthy();
//     fireEvent.click(xButton);
//     expect(screen.queryByText('New Bill Reminder')).toBeNull();
//   });

//   it('closes the modal when clicking the overlay', () => {
//     render(<ReminderManager {...defaultProps} />);
//     openAddModal();

//     fireEvent.click(findOverlay());
//     expect(screen.queryByText('New Bill Reminder')).toBeNull();
//   });

//   it('shows category options in the select', () => {
//     render(<ReminderManager {...defaultProps} />);
//     openAddModal();

//     // Category options render with type suffix: "Bills & Utilities (EXPENSE)"
//     expect(screen.getByRole('option', { name: /Bills & Utilities/ })).toBeTruthy();
//     expect(screen.getByRole('option', { name: /Food & Dining/ })).toBeTruthy();
//   });
// });

// // ==============================================================================
// // Form Validation
// // ==============================================================================

// describe('ReminderManager — Form Validation', () => {
//   beforeEach(() => {
//     render(<ReminderManager {...defaultProps} />);
//     openAddModal();
//   });

//   it('shows error when saving with empty name', () => {
//     fillForm({ amount: '1000' });
//     fireEvent.click(screen.getByText('Create Reminder'));
//     expect(screen.getByText('Please enter a bill name.')).toBeTruthy();
//   });

//   it('shows error when saving with empty amount', () => {
//     fillForm({ name: 'Test Bill' });
//     fireEvent.click(screen.getByText('Create Reminder'));
//     expect(screen.getByText('Please enter a valid amount.')).toBeTruthy();
//   });

//   it('shows error when saving with zero amount', () => {
//     fillForm({ name: 'Test Bill', amount: '0' });
//     fireEvent.click(screen.getByText('Create Reminder'));
//     expect(screen.getByText('Please enter a valid amount.')).toBeTruthy();
//   });

//   it('shows error when saving with negative amount', () => {
//     fillForm({ name: 'Test Bill', amount: '-500' });
//     fireEvent.click(screen.getByText('Create Reminder'));
//     expect(screen.getByText('Please enter a valid amount.')).toBeTruthy();
//   });

//   it('shows error when saving with invalid amount', () => {
//     fillForm({ name: 'Test Bill', amount: 'not-a-number' });
//     fireEvent.click(screen.getByText('Create Reminder'));
//     expect(screen.getByText('Please enter a valid amount.')).toBeTruthy();
//   });

//   it('shows error when saving with no due date', () => {
//     fillForm({ name: 'Test Bill', amount: '500', categoryId: 'cat_utilities' });
//     fireEvent.click(screen.getByText('Create Reminder'));
//     expect(screen.getByText('Please select a due date.')).toBeTruthy();
//   });

//   it('shows error when saving with no category', () => {
//     fillForm({ name: 'Test Bill', amount: '500', dueDate: '2026-07-01' });
//     fireEvent.click(screen.getByText('Create Reminder'));
//     expect(screen.getByText('Please select a category.')).toBeTruthy();
//   });

//   it('clears previous error when re-saving with valid data', () => {
//     // Trigger empty name error
//     fillForm({ amount: '1000' });
//     fireEvent.click(screen.getByText('Create Reminder'));
//     expect(screen.getByText('Please enter a bill name.')).toBeTruthy();

//     // Fill in name and try again — original error should be cleared
//     fillForm({ name: 'Test Bill' });
//     fireEvent.click(screen.getByText('Create Reminder'));
//     expect(screen.queryByText('Please enter a bill name.')).toBeNull();
//   });
// });

// // ==============================================================================
// // Save Reminder
// // ==============================================================================

// describe('ReminderManager — Save Reminder', () => {
//   it('calls onAddReminder with correct data when form is valid', () => {
//     const handleAdd = vi.fn();
//     render(<ReminderManager {...defaultProps} onAddReminder={handleAdd} />);
//     openAddModal();

//     fillForm({
//       name: 'New Test Bill',
//       amount: '2500',
//       dueDate: '2026-07-15',
//       categoryId: 'cat_food',
//     });
//     fireEvent.click(screen.getByText('Create Reminder'));

//     expect(handleAdd).toHaveBeenCalledTimes(1);
//     expect(handleAdd).toHaveBeenCalledWith({
//       name: 'New Test Bill',
//       amount: 2500,
//       dueDate: '2026-07-15',
//       categoryId: 'cat_food',
//       status: 'unpaid',
//     });
//   });

//   it('closes the modal after successful save', () => {
//     const handleAdd = vi.fn();
//     render(<ReminderManager {...defaultProps} onAddReminder={handleAdd} />);
//     openAddModal();

//     fillAndSubmitValidForm();
//     expect(screen.queryByText('New Bill Reminder')).toBeNull();
//   });
// });

// // ==============================================================================
// // Edit Reminder
// // ==============================================================================

// describe('ReminderManager — Edit Reminder', () => {
//   it('opens the add modal when clicking an unpaid card', () => {
//     render(<ReminderManager {...defaultProps} />);
//     fireEvent.click(screen.getByText('Electricity Bill'));
//     expect(screen.getByText('Edit Reminder')).toBeTruthy();
//   });

//   it('pre-fills the form with existing data when editing', () => {
//     render(<ReminderManager {...defaultProps} />);
//     fireEvent.click(screen.getByText('Electricity Bill'));

//     const nameInput = screen.getByPlaceholderText('E.g., Dhaka Electric Supply, Spotify');
//     expect(nameInput.value).toBe('Electricity Bill');

//     const amountInput = screen.getByPlaceholderText('0.00');
//     expect(amountInput.value).toBe('1850');

//     const select = screen.getByRole('combobox');
//     expect(select.value).toBe('cat_utilities');
//   });

//   it('calls onUpdateReminder with updated data', () => {
//     const handleUpdate = vi.fn();
//     render(<ReminderManager {...defaultProps} onUpdateReminder={handleUpdate} />);
//     fireEvent.click(screen.getByText('Electricity Bill'));

//     fillForm({ name: 'Updated Bill Name', amount: '2000' });
//     fireEvent.click(screen.getByText('Update Reminder'));

//     expect(handleUpdate).toHaveBeenCalledTimes(1);
//     expect(handleUpdate).toHaveBeenCalledWith(
//       expect.objectContaining({
//         id: 'rem_1',
//         name: 'Updated Bill Name',
//         amount: 2000,
//         categoryId: 'cat_utilities',
//       })
//     );
//   });
// });

// // ==============================================================================
// // Pay Reminder
// // ==============================================================================

// describe('ReminderManager — Pay Reminder', () => {
//   it('opens pay account selection modal when clicking Pay button', () => {
//     render(<ReminderManager {...defaultProps} />);
//     fireEvent.click(screen.getAllByText('Pay')[0]);
//     expect(screen.getByText('Select Account for Payment')).toBeTruthy();
//   });

//   it('shows account options in pay modal', () => {
//     render(<ReminderManager {...defaultProps} />);
//     fireEvent.click(screen.getAllByText('Pay')[0]);
//     expect(screen.getByText('Cash Ledger')).toBeTruthy();
//     expect(screen.getByText('Bank Account')).toBeTruthy();
//   });

//   it('shows account balances in pay modal', () => {
//     render(<ReminderManager {...defaultProps} />);
//     fireEvent.click(screen.getAllByText('Pay')[0]);
//     expect(screen.getByText(/৳15,000/)).toBeTruthy();
//     expect(screen.getByText(/৳85,000/)).toBeTruthy();
//   });

//   it('calls onPayReminder when selecting an account', () => {
//     const handlePay = vi.fn();
//     render(<ReminderManager {...defaultProps} onPayReminder={handlePay} />);
//     fireEvent.click(screen.getAllByText('Pay')[0]);
//     fireEvent.click(screen.getByText('Cash Ledger'));
//     expect(handlePay).toHaveBeenCalledWith('rem_1', 'acc_cash');
//   });

//   it('closes pay modal after selecting an account', () => {
//     render(<ReminderManager {...defaultProps} onPayReminder={vi.fn()} />);
//     fireEvent.click(screen.getAllByText('Pay')[0]);
//     expect(screen.getByText('Select Account for Payment')).toBeTruthy();

//     fireEvent.click(screen.getByText('Bank Account'));
//     expect(screen.queryByText('Select Account for Payment')).toBeNull();
//   });

//   it('closes pay modal when clicking X button', () => {
//     render(<ReminderManager {...defaultProps} />);
//     fireEvent.click(screen.getAllByText('Pay')[0]);
//     expect(screen.getByText('Select Account for Payment')).toBeTruthy();

//     const allButtons = screen.getAllByRole('button');
//     fireEvent.click(allButtons[allButtons.length - 1]);
//     expect(screen.queryByText('Select Account for Payment')).toBeNull();
//   });

//   it('closes pay modal when clicking overlay', () => {
//     render(<ReminderManager {...defaultProps} />);
//     fireEvent.click(screen.getAllByText('Pay')[0]);
//     expect(screen.getByText('Select Account for Payment')).toBeTruthy();

//     fireEvent.click(findOverlay());
//     expect(screen.queryByText('Select Account for Payment')).toBeNull();
//   });
// });

// // ==============================================================================
// // Delete Reminder
// // ==============================================================================

// describe('ReminderManager — Delete Reminder', () => {
//   it('calls onDeleteReminder when clicking delete button on unpaid card', () => {
//     const handleDelete = vi.fn();
//     render(<ReminderManager {...defaultProps} onDeleteReminder={handleDelete} />);

//     const deleteButtons = findDeleteButtons();
//     expect(deleteButtons.length).toBeGreaterThanOrEqual(1);
//     fireEvent.click(deleteButtons[0]);
//     expect(handleDelete).toHaveBeenCalledWith('rem_1');
//   });

//   it('calls onDeleteReminder when viewing paid tab and clicking delete', () => {
//     const handleDelete = vi.fn();
//     render(<ReminderManager {...defaultProps} onDeleteReminder={handleDelete} />);
//     fireEvent.click(screen.getByText('PAID'));

//     const deleteButtons = findDeleteButtons();
//     expect(deleteButtons.length).toBeGreaterThanOrEqual(1);
//     fireEvent.click(deleteButtons[0]);
//     expect(handleDelete).toHaveBeenCalledWith('rem_paid');
//   });
// });

// // ==============================================================================
// // Event Propagation (Pay/Delete buttons)
// // ==============================================================================

// describe('ReminderManager — Event Propagation', () => {
//   it('clicking Pay button does not trigger card edit', () => {
//     const handleUpdate = vi.fn();
//     render(<ReminderManager {...defaultProps} onUpdateReminder={handleUpdate} />);
//     fireEvent.click(screen.getAllByText('Pay')[0]);

//     // Pay modal should open, but edit modal should not
//     expect(screen.getByText('Select Account for Payment')).toBeTruthy();
//     expect(screen.queryByText('Edit Reminder')).toBeNull();
//   });

//   it('clicking Delete button on unpaid card does not trigger card edit', () => {
//     const handleUpdate = vi.fn();
//     const handleDelete = vi.fn();
//     render(
//       <ReminderManager
//         {...defaultProps}
//         onUpdateReminder={handleUpdate}
//         onDeleteReminder={handleDelete}
//       />
//     );

//     const deleteButtons = findDeleteButtons();
//     expect(deleteButtons.length).toBeGreaterThanOrEqual(1);
//     fireEvent.click(deleteButtons[0]);
//     expect(handleUpdate).not.toHaveBeenCalled();
//   });
// });

// // ==============================================================================
// // Notification Permission Banner
// // ==============================================================================

// describe('ReminderManager — Notification Banners', () => {
//   it('shows enable notification banner when permission is default', () => {
//     mockGetNotificationPermission.mockReturnValue('default');
//     render(<ReminderManager {...defaultProps} />);
//     expect(screen.getByText('Notifications')).toBeTruthy();

//     // There are 2 "Enable Notifications" matches: banner button + toggle label span
//     const enableTexts = screen.getAllByText('Enable Notifications');
//     expect(enableTexts.length).toBeGreaterThanOrEqual(1);
//     expect(enableTexts[0]).toBeTruthy();
//   });

//   it('shows enable notification banner when permission is denied', () => {
//     mockGetNotificationPermission.mockReturnValue('denied');
//     render(<ReminderManager {...defaultProps} />);
//     expect(screen.getByText('Notifications are disabled. Enable them in your device settings to stay updated.')).toBeTruthy();
//   });

//   it('shows granted banner when permission is granted', () => {
//     mockGetNotificationPermission.mockReturnValue('granted');
//     render(<ReminderManager {...defaultProps} />);
//     expect(screen.getByText('Notifications Enabled')).toBeTruthy();
//   });

//   it('shows unsupported warning when notifications not supported', () => {
//     mockIsNotificationSupported.mockReturnValue(false);
//     render(<ReminderManager {...defaultProps} />);
//     expect(screen.getByText('Notifications are currently unavailable. Please check app settings.')).toBeTruthy();
//   });

//   it('shows Retry button for unsupported banner', () => {
//     mockIsNotificationSupported.mockReturnValue(false);
//     render(<ReminderManager {...defaultProps} />);
//     expect(screen.getByText('Retry')).toBeTruthy();
//   });

//   it('calls requestNotificationPermission when clicking enable button', () => {
//     mockGetNotificationPermission.mockReturnValue('default');
//     mockRequestNotificationPermission.mockResolvedValue('granted');
//     render(<ReminderManager {...defaultProps} />);

//     // There are 2 elements with 'Enable Notifications': banner button + toggle label span
//     const enableTexts = screen.getAllByText('Enable Notifications');
//     // The actual clickable <button> is the first one in the banner
//     const bannerBtn = enableTexts.find(el => el.tagName === 'BUTTON' && el.closest('button'));
//     expect(bannerBtn).toBeTruthy();
//     const btn = bannerBtn.closest('button');
//     fireEvent.click(btn);
//     expect(mockRequestNotificationPermission).toHaveBeenCalled();
//   });

//   it('does not show notification banner when notifications are unsupported and Retry clicked', () => {
//     mockIsNotificationSupported.mockReturnValue(false);
//     render(<ReminderManager {...defaultProps} />);
//     expect(screen.getByText('Retry')).toBeTruthy();
//   });
// });

// // ==============================================================================
// // Notification Toggle Switches
// // ==============================================================================

// describe('ReminderManager — Notification Toggles', () => {
//   it('shows notification toggle switches', () => {
//     mockGetNotificationPermission.mockReturnValue('granted');
//     render(<ReminderManager {...defaultProps} />);
//     const switches = document.querySelectorAll('.toggle-switch');
//     expect(switches.length).toBeGreaterThanOrEqual(1);
//   });

//   it('toggles are enabled by default', () => {
//     render(<ReminderManager {...defaultProps} />);
//     const checkboxes = document.querySelectorAll('.toggle-switch input[type="checkbox"]');
//     expect(checkboxes.length).toBeGreaterThanOrEqual(1);
//     expect(checkboxes[0].checked).toBe(true);
//   });

//   it('clicking notifications toggle saves to localStorage', () => {
//     render(<ReminderManager {...defaultProps} />);
//     const checkboxes = document.querySelectorAll('.toggle-switch input[type="checkbox"]');
//     expect(checkboxes.length).toBeGreaterThanOrEqual(1);
//     fireEvent.click(checkboxes[0]);
//     expect(localStorage.getItem('pocket_khata_notifications_enabled')).toBe('false');
//   });

//   it('reminder alerts toggle is disabled when notifications are off', () => {
//     render(<ReminderManager {...defaultProps} />);
//     const checkboxes = document.querySelectorAll('.toggle-switch input[type=\"checkbox\"]');
//     expect(checkboxes.length).toBeGreaterThanOrEqual(2);
//     // Toggle notifications off
//     fireEvent.click(checkboxes[0]);
//     // Reminder alerts checkbox should be disabled
//     expect(checkboxes[1].disabled).toBe(true);
//   });
// });

// // ==============================================================================
// // Navigation
// // ==============================================================================

// describe('ReminderManager — Navigation', () => {
//   it('back button calls onNavigate("dashboard")', () => {
//     const handleNavigate = vi.fn();
//     render(<ReminderManager {...defaultProps} onNavigate={handleNavigate} />);
//     const buttons = screen.getAllByRole('button');
//     fireEvent.click(buttons[0]);
//     expect(handleNavigate).toHaveBeenCalledWith('dashboard');
//   });

//   it('clicking logo also calls onNavigate("dashboard")', () => {
//     const handleNavigate = vi.fn();
//     render(<ReminderManager {...defaultProps} onNavigate={handleNavigate} />);
//     const logoImg = document.querySelector('.header-logo-sm');
//     expect(logoImg).toBeTruthy();
//     // Logo is wrapped in a clickable div
//     const logoContainer = logoImg.closest('[style*="cursor: pointer"]');
//     expect(logoContainer).toBeTruthy();
//     fireEvent.click(logoContainer);
//     expect(handleNavigate).toHaveBeenCalledWith('dashboard');
//   });
// });

// // ==============================================================================
// // Bangla Mode
// // ==============================================================================

// describe('ReminderManager — Bangla Mode', () => {
//   it('renders title in Bangla', () => {
//     render(<ReminderManager {...defaultProps} lang="bn" />);
//     expect(screen.getByText('বিল রিমাইন্ডার')).toBeTruthy();
//   });

//   it('shows filter tabs in Bangla', () => {
//     render(<ReminderManager {...defaultProps} lang="bn" />);
//     expect(screen.getByText('অপরিশোধিত')).toBeTruthy();
//     expect(screen.getByText('পরিশোধিত')).toBeTruthy();
//     expect(screen.getByText('সকল লেনদেন')).toBeTruthy();
//   });

//   it('shows empty state in Bangla', () => {
//     render(<ReminderManager {...defaultProps} lang="bn" reminders={[]} />);
//     expect(screen.getByText('এই ক্যাটাগরিতে কোনো রিমাইন্ডার নেই।')).toBeTruthy();
//   });

//   it('shows add modal labels in Bangla', () => {
//     render(<ReminderManager {...defaultProps} lang="bn" />);
//     openAddModal('নতুন বিল রিমাইন্ডার');
//     expect(screen.getByText('নতুন বিল রিমাইন্ডার')).toBeTruthy();
//     expect(screen.getByText('রিমাইন্ডার তৈরি করুন')).toBeTruthy();
//     expect(screen.getByText('বিলের নাম / প্রাপক')).toBeTruthy();
//     expect(screen.getByText('বিলের পরিমাণ (৳)')).toBeTruthy();
//     expect(screen.getByText('পরিশোধের তারিখ')).toBeTruthy();
//   });

//   it('shows form error messages in Bangla', () => {
//     render(<ReminderManager {...defaultProps} lang="bn" />);
//     openAddModal('নতুন বিল রিমাইন্ডার');

//     fillForm({ amount: '1000' });
//     fireEvent.click(screen.getByText('রিমাইন্ডার তৈরি করুন'));
//     expect(screen.getByText('অনুগ্রহ করে বিলের নাম লিখুন।')).toBeTruthy();
//   });

//   it('shows edit modal in Bangla', () => {
//     render(<ReminderManager {...defaultProps} lang="bn" />);
//     fireEvent.click(screen.getByText('Electricity Bill'));
//     expect(screen.getByText('রিমাইন্ডার সম্পাদনা করুন')).toBeTruthy();
//     expect(screen.getByText('রিমাইন্ডার হালনাগাদ করুন')).toBeTruthy();
//   });

//   it('shows pay modal in Bangla', () => {
//     render(<ReminderManager {...defaultProps} lang="bn" />);
//     const payButtons = screen.getAllByText('পে করুন');
//     fireEvent.click(payButtons[0]);
//     expect(screen.getByText('পেমেন্টের জন্য একাউন্ট নির্বাচন')).toBeTruthy();
//   });
// });

// // ==============================================================================
// // Edge Cases
// // ==============================================================================

// describe('ReminderManager — Edge Cases', () => {
//   it('handles missing optional props gracefully', () => {
//     render(
//       <ReminderManager
//         reminders={mockUnpaidReminders}
//         accounts={mockAccounts}
//         categories={mockCategories}
//         onNavigate={vi.fn()}
//         lang="en"
//       />
//     );
//     expect(screen.getByText('Bill Reminders')).toBeTruthy();
//     expect(screen.getByText('Electricity Bill')).toBeTruthy();
//   });

//   it('handles empty arrays', () => {
//     render(<ReminderManager {...defaultProps} accounts={[]} categories={[]} />);
//     expect(screen.getByText('Bill Reminders')).toBeTruthy();
//   });

//   it('crashes with undefined reminders (reminders.map cannot read undefined)', () => {
//     expect(() => {
//       render(<ReminderManager {...defaultProps} reminders={undefined} />);
//     }).toThrow();
//   });

//   it('opens pay modal even when accounts is undefined', () => {
//     render(<ReminderManager {...defaultProps} accounts={undefined} />);
//     const payButtons = screen.getAllByText('Pay');
//     fireEvent.click(payButtons[0]);
//     // Modal title renders before the accounts list, so it works
//     expect(screen.getByText('Select Account for Payment')).toBeTruthy();
//   });

//   it('renders without crashing when onAddReminder/onUpdateReminder/onPayReminder/onDeleteReminder are not provided', () => {
//     render(
//       <ReminderManager
//         reminders={mockUnpaidReminders}
//         accounts={mockAccounts}
//         categories={mockCategories}
//         onNavigate={vi.fn()}
//         lang="en"
//       />
//     );
//     expect(screen.getByText('Bill Reminders')).toBeTruthy();
//     expect(screen.getByText('Electricity Bill')).toBeTruthy();
//   });

//   it('remembers notification settings from localStorage', () => {
//     localStorage.setItem('pocket_khata_notifications_enabled', 'false');
//     localStorage.setItem('pocket_khata_reminder_alerts_enabled', 'false');
//     render(<ReminderManager {...defaultProps} />);
//     const checkboxes = document.querySelectorAll('.toggle-switch input[type="checkbox"]');
//     expect(checkboxes.length).toBeGreaterThanOrEqual(2);
//     expect(checkboxes[0].checked).toBe(false);
//     expect(checkboxes[1].checked).toBe(false);
//   });

//   it('handles all empty data gracefully', () => {
//     render(
//       <ReminderManager
//         reminders={[]}
//         accounts={[]}
//         categories={[]}
//         onNavigate={vi.fn()}
//         lang="en"
//       />
//     );
//     expect(screen.getByText('Bill Reminders')).toBeTruthy();
//     expect(screen.getByText('No reminders in this category.')).toBeTruthy();
//   });
// });
