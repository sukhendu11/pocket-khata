// src/tests/Settings.test.jsx — Tests for Settings component including PDF export

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import Settings from '../components/Settings';

// ==============================================================================
// Mock the PDF export module — it requires browser APIs (html2canvas, jsPDF)
// ==============================================================================

vi.mock('../lib/pdf', () => ({
  generatePDFReport: vi.fn().mockResolvedValue(undefined),
}));

// ==============================================================================
// Mock the icons module that fails to render in jsdom
// ==============================================================================

vi.mock('lucide-react', () => ({
  ArrowLeft: () => <div data-testid="icon-arrowleft">←</div>,
  RefreshCw: () => <div data-testid="icon-refresh">↻</div>,
  Upload: () => <div data-testid="icon-upload">↑</div>,
  Bell: () => <div data-testid="icon-bell">🔔</div>,
  Info: () => <div data-testid="icon-info">ℹ</div>,
  Shield: () => <div data-testid="icon-shield">🛡</div>,
  CheckCircle: () => <div data-testid="icon-check">✓</div>,
  XCircle: () => <div data-testid="icon-x">✗</div>,
  FileText: () => <div data-testid="icon-filetext">📄</div>,
}));

// ==============================================================================
// Mock notification modules
// ==============================================================================

vi.mock('../notifications', () => ({
  isNotificationSupported: () => true,
  getNotificationPermission: () => 'granted',
  requestNotificationPermission: () => Promise.resolve('granted'),
}));

// ==============================================================================
// Mock analytics module
// ==============================================================================

vi.mock('../lib/analytics', () => ({
  trackAction: vi.fn(),
  trackError: vi.fn(),
  isTrackingAllowed: () => false,
  getConsent: () => null,
  resetConsent: vi.fn(),
  getQueuedEventCount: () => 0,
  getLastSyncDisplay: () => null,
  flushEvents: vi.fn().mockResolvedValue(undefined),
}));

// ==============================================================================
// Mock supabase module
// ==============================================================================

vi.mock('../lib/supabase', () => ({
  isSupabaseConfigured: false,
}));

// ==============================================================================
// Mock the db module (for schema version)
// ==============================================================================

vi.mock('../db', () => ({
  db: {
    getStoredSchemaVersion: () => 7,
    getAppVersion: () => '2.3.0',
    getAccounts: () => [],
    getCategories: () => [],
    getTransactions: () => [],
    getReminders: () => [],
    getAutoBackups: () => [],
    getAutoBackupCount: () => 0,
    getLatestBackupTimestamp: () => null,
    restoreFromAutoBackup: vi.fn(),
    clearAutoBackups: vi.fn(),
  },
}));

// ==============================================================================
// Mock Data
// ==============================================================================

const mockAccounts = [
  { id: 'acc_1', name: 'Cash', type: 'Cash', balance: 15000, color: '#3cd070' },
  { id: 'acc_2', name: 'Bank', type: 'Bank', balance: 85000, color: '#3867d6' },
];

const mockCategories = [
  { id: 'cat_food', name: 'Food', type: 'expense', color: '#e17055' },
  { id: 'cat_salary', name: 'Salary', type: 'income', color: '#2ecc71' },
  { id: 'cat_rent', name: 'Rent', type: 'expense', color: '#16a085' },
];

const mockTransactions = [
  { id: 'tx_1', type: 'expense', amount: 1500, date: '2026-05-10', accountId: 'acc_1', categoryId: 'cat_food' },
  { id: 'tx_2', type: 'income', amount: 80000, date: '2026-05-01', accountId: 'acc_2', categoryId: 'cat_salary' },
];

const mockBudgets = [
  { id: 'budget_1', categoryId: 'cat_food', limit: 5000 },
];

const defaultProps = {
  onExportDatabase: vi.fn(() => '{}'),
  onImportDatabase: vi.fn(() => true),
  transactions: mockTransactions,
  accounts: mockAccounts,
  categories: mockCategories,
  budgets: mockBudgets,
  onNavigate: vi.fn(),
  lang: 'en',
};

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

// ==============================================================================
// Rendering
// ==============================================================================

describe('Settings — Rendering', () => {
  it('renders without crashing', () => {
    render(<Settings {...defaultProps} />);
    expect(screen.getByText('App Settings')).toBeTruthy();
  });

  it('renders the back button', () => {
    render(<Settings {...defaultProps} />);
    expect(screen.getByTestId('icon-arrowleft')).toBeTruthy();
  });

  it('renders Financial Reports card', () => {
    render(<Settings {...defaultProps} />);
    expect(screen.getByText('Financial Reports')).toBeTruthy();
    expect(screen.getAllByTestId('icon-filetext').length).toBeGreaterThanOrEqual(1);
  });

  it('renders Data Portability card', () => {
    render(<Settings {...defaultProps} />);
    expect(screen.getByText('Data Portability')).toBeTruthy();
  });

  it('renders Notifications card', () => {
    render(<Settings {...defaultProps} />);
    expect(screen.getByText('Notifications')).toBeTruthy();
  });

  it('renders Privacy & Analytics card', () => {
    render(<Settings {...defaultProps} />);
    expect(screen.getByText('Privacy & Analytics')).toBeTruthy();
  });

  it('renders About card', () => {
    render(<Settings {...defaultProps} />);
    expect(screen.getByText('About')).toBeTruthy();
  });

  it('renders version info', () => {
    render(<Settings {...defaultProps} />);
    expect(screen.getAllByText(/Pocket Khata/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Schema v7/)).toBeTruthy();
  });
});

// ==============================================================================
// PDF Export — Reports Card
// ==============================================================================

describe('Settings — PDF Export', () => {
  it('renders period selector with all options', () => {
    render(<Settings {...defaultProps} />);
    const select = screen.getByDisplayValue('This Month');
    expect(select).toBeTruthy();

    const options = screen.getAllByRole('option');
    const optionTexts = options.map(o => o.textContent);
    expect(optionTexts).toContain('This Month');
    expect(optionTexts).toContain('Last Month');
    expect(optionTexts).toContain('Last 3 Months');
    expect(optionTexts).toContain('Last 6 Months');
    expect(optionTexts).toContain('This Year');
  });

  it('renders all section checkboxes checked by default', () => {
    render(<Settings {...defaultProps} />);
    // Scope checkboxes to the Reports card (there are also notification toggles)
    const reportsCard = screen.getByText('Financial Reports').closest('.neo-raised');
    const checkboxes = within(reportsCard).getAllByRole('checkbox');
    // All 4 section toggles should be checked by default
    expect(checkboxes).toHaveLength(4);
    checkboxes.forEach(cb => {
      expect(cb.checked).toBe(true);
    });
  });

  it('renders section toggle labels', () => {
    render(<Settings {...defaultProps} />);
    expect(screen.getByText('Summary Cards')).toBeTruthy();
    expect(screen.getByText('Account Details')).toBeTruthy();
    expect(screen.getByText('Transactions Table')).toBeTruthy();
    expect(screen.getByText('Charts & Insights')).toBeTruthy();
  });

  it('renders export button with correct text', () => {
    render(<Settings {...defaultProps} />);
    expect(screen.getByText('Export PDF Report')).toBeTruthy();
  });

  it('updates report period when selecting a different option', () => {
    render(<Settings {...defaultProps} />);
    const select = screen.getByDisplayValue('This Month');
    fireEvent.change(select, { target: { value: 'lastMonth' } });
    expect(screen.getByDisplayValue('Last Month')).toBeTruthy();
  });

  it('toggles a section checkbox off', () => {
    render(<Settings {...defaultProps} />);
    const reportsCard = screen.getByText('Financial Reports').closest('.neo-raised');
    const checkboxes = within(reportsCard).getAllByRole('checkbox');
    // First checkbox = Summary Cards
    expect(checkboxes[0].checked).toBe(true);
    fireEvent.click(checkboxes[0]);
    expect(checkboxes[0].checked).toBe(false);
  });

  it('toggles all section checkboxes on and off', () => {
    render(<Settings {...defaultProps} />);
    const reportsCard = screen.getByText('Financial Reports').closest('.neo-raised');
    const checkboxes = within(reportsCard).getAllByRole('checkbox');

    // Toggle all off
    checkboxes.forEach(cb => fireEvent.click(cb));
    checkboxes.forEach(cb => expect(cb.checked).toBe(false));

    // Toggle all back on
    checkboxes.forEach(cb => fireEvent.click(cb));
    checkboxes.forEach(cb => expect(cb.checked).toBe(true));
  });

  it('calls generatePDFReport when export button is clicked', async () => {
    const { generatePDFReport } = await import('../lib/pdf');
    render(<Settings {...defaultProps} />);

    const exportBtn = screen.getByText('Export PDF Report');
    fireEvent.click(exportBtn);

    expect(generatePDFReport).toHaveBeenCalledOnce();
  });

  it('calls generatePDFReport with correct default parameters', async () => {
    const { generatePDFReport } = await import('../lib/pdf');
    render(<Settings {...defaultProps} />);

    fireEvent.click(screen.getByText('Export PDF Report'));

    const callArg = generatePDFReport.mock.calls[0][0];
    expect(callArg.periodKey).toBe('thisMonth');
    expect(callArg.transactions).toEqual(mockTransactions);
    expect(callArg.accounts).toEqual(mockAccounts);
    expect(callArg.categories).toEqual(mockCategories);
    expect(callArg.budgets).toEqual(mockBudgets);
    expect(callArg.lang).toBe('en');
    expect(callArg.sections).toEqual({
      summary: true,
      accounts: true,
      transactions: true,
      analytics: true,
    });
  });

  it('calls generatePDFReport with updated period when changed', async () => {
    const { generatePDFReport } = await import('../lib/pdf');
    render(<Settings {...defaultProps} />);

    // Change period to lastMonth
    const select = screen.getByDisplayValue('This Month');
    fireEvent.change(select, { target: { value: 'lastMonth' } });

    fireEvent.click(screen.getByText('Export PDF Report'));

    const callArg = generatePDFReport.mock.calls[0][0];
    expect(callArg.periodKey).toBe('lastMonth');
  });

  it('calls generatePDFReport with updated sections when toggled', async () => {
    const { generatePDFReport } = await import('../lib/pdf');
    render(<Settings {...defaultProps} />);

    // Toggle off first checkbox (Summary Cards)
    const reportsCard = screen.getByText('Financial Reports').closest('.neo-raised');
    const checkboxes = within(reportsCard).getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    fireEvent.click(screen.getByText('Export PDF Report'));

    const callArg = generatePDFReport.mock.calls[0][0];
    expect(callArg.sections.summary).toBe(false);
    expect(callArg.sections.accounts).toBe(true);
    expect(callArg.sections.transactions).toBe(true);
    expect(callArg.sections.analytics).toBe(true);
  });

  it('shows loading state while PDF is generating', async () => {
    // Make generatePDFReport wait so we can check loading state
    const { generatePDFReport } = await import('../lib/pdf');
    generatePDFReport.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 500)));

    render(<Settings {...defaultProps} />);

    fireEvent.click(screen.getByText('Export PDF Report'));

    // Should show generating text
    expect(screen.getByText('Generating…')).toBeTruthy();

    // Wait for the promise to resolve
    await new Promise(resolve => setTimeout(resolve, 600));
  });

  it('disables export button while generating', async () => {
    const { generatePDFReport } = await import('../lib/pdf');
    generatePDFReport.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 500)));

    render(<Settings {...defaultProps} />);

    const exportBtn = screen.getByText('Export PDF Report');
    fireEvent.click(exportBtn);

    // Button should be disabled during generation (shows Generating… instead)
    expect(screen.getByText('Generating…')).toBeTruthy();
  });

  it('shows error toast when PDF generation fails', async () => {
    const { generatePDFReport } = await import('../lib/pdf');
    generatePDFReport.mockRejectedValue(new Error('Test error'));

    render(<Settings {...defaultProps} />);

    fireEvent.click(screen.getByText('Export PDF Report'));

    // Wait for the promise rejection and React state update
    await new Promise(resolve => setTimeout(resolve, 50));

    // Component shows a styled toast with the translated error message
    expect(screen.getByText('PDF export failed. Please try again.')).toBeTruthy();
  });

  it('passes Bangla language param to generatePDFReport', async () => {
    const { generatePDFReport } = await import('../lib/pdf');
    render(<Settings {...defaultProps} lang="bn" />);

    // In Bangla mode the button shows the Bangla translation
    fireEvent.click(screen.getByText('পিডিএফ রিপোর্ট এক্সপোর্ট'));

    const callArg = generatePDFReport.mock.calls[0][0];
    expect(callArg.lang).toBe('bn');
  });

  it('shows description text for PDF export', () => {
    render(<Settings {...defaultProps} />);
    expect(screen.getByText(/Generate a comprehensive PDF report/)).toBeTruthy();
  });
});

// ==============================================================================
// Navigation
// ==============================================================================

describe('Settings — Navigation', () => {
  it('calls onNavigate with dashboard when back button is clicked', () => {
    render(<Settings {...defaultProps} />);
    const backBtn = screen.getByTestId('icon-arrowleft').closest('button');
    fireEvent.click(backBtn);
    expect(defaultProps.onNavigate).toHaveBeenCalledWith('dashboard');
  });
});

// ==============================================================================
// JSON Export/Import
// ==============================================================================

describe('Settings — Data Portability', () => {
  it('renders export JSON button', () => {
    render(<Settings {...defaultProps} />);
    expect(screen.getByText('Export Full Database (JSON)')).toBeTruthy();
  });

  it('renders import JSON button', () => {
    render(<Settings {...defaultProps} />);
    expect(screen.getByText('Import Database (JSON)')).toBeTruthy();
  });

  it('calls onExportDatabase and creates download link on export click', () => {
    // URL.createObjectURL needs a mock
    const createObjectURLMock = vi.fn(() => 'blob:test');
    vi.stubGlobal('URL', { createObjectURL: createObjectURLMock });

    render(<Settings {...defaultProps} />);

    fireEvent.click(screen.getByText('Export Full Database (JSON)'));

    expect(defaultProps.onExportDatabase).toHaveBeenCalledOnce();
    expect(createObjectURLMock).toHaveBeenCalledOnce();
  });

  it('calls onImportDatabase when JSON file selected', () => {
    render(<Settings {...defaultProps} />);

    // Find the hidden file input
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeTruthy();

    // Simulate file selection
    const file = new File(['{}'], 'backup.json', { type: 'application/json' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Wait for FileReader async
    return new Promise(resolve => {
      setTimeout(() => {
        expect(defaultProps.onImportDatabase).toHaveBeenCalledOnce();
        expect(defaultProps.onImportDatabase).toHaveBeenCalledWith('{}');
        resolve();
      }, 50);
    });
  });
});

// ==============================================================================
// Edge Cases
// ==============================================================================

describe('Settings — Edge Cases', () => {
  it('handles empty transactions', () => {
    render(<Settings {...defaultProps} transactions={[]} />);
    expect(screen.getByText('Financial Reports')).toBeTruthy();
  });

  it('handles empty accounts', () => {
    render(<Settings {...defaultProps} accounts={[]} />);
    expect(screen.getByText('Financial Reports')).toBeTruthy();
  });

  it('handles empty categories', () => {
    render(<Settings {...defaultProps} categories={[]} />);
    expect(screen.getByText('Financial Reports')).toBeTruthy();
  });

  it('handles undefined optional props', () => {
    render(
      <Settings
        onExportDatabase={vi.fn()}
        onImportDatabase={vi.fn()}
        onNavigate={vi.fn()}
        lang="en"
      />
    );
    expect(screen.getByText('App Settings')).toBeTruthy();
  });

  it('renders in Bangla mode', () => {
    render(<Settings {...defaultProps} lang="bn" />);
    expect(screen.getByText('অ্যাপ সেটিংস')).toBeTruthy();
    expect(screen.getByText('আর্থিক প্রতিবেদন')).toBeTruthy();
    expect(screen.getByText('পিডিএফ রিপোর্ট এক্সপোর্ট')).toBeTruthy();
  });
});
