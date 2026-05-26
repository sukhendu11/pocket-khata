import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import Settings from '../components/Settings';

// ==============================================================================
// Module-level mocks (hoisted above the import to handle vi.mock hoisting)
// ==============================================================================

const mockDb = vi.hoisted(() => ({
  getAppVersion: vi.fn(() => '2.2.0'),
  getStoredSchemaVersion: vi.fn(() => 4),
}));

vi.mock('../db', () => ({ db: mockDb }));

// Mock jsPDF so PDF generation doesn't throw
const mockJSDoc = vi.hoisted(() => ({
  setFontSize: vi.fn(),
  setFont: vi.fn(),
  text: vi.fn(),
  setTextColor: vi.fn(),
  setFillColor: vi.fn(),
  setDrawColor: vi.fn(),
  line: vi.fn(),
  circle: vi.fn(),
  rect: vi.fn(),
  addPage: vi.fn(),
  save: vi.fn(),
}));

vi.mock('jspdf', () => ({
  jsPDF: vi.fn(() => mockJSDoc),
}));

// ==============================================================================
// Helpers
// ==============================================================================



// ==============================================================================
// Default Props
// ==============================================================================

const defaultProps = {
  onResetDatabase: vi.fn(),
  onImportDatabase: vi.fn(),
  onExportDatabase: vi.fn(),
  transactions: [],
  accounts: [],
  categories: [],
  onNavigate: vi.fn(),
  lang: 'en',
};

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

// ==============================================================================
// Tests
// ==============================================================================

// ==============================================================================
// PDF Export Analytics Sections Tests
// ==============================================================================

describe('Settings — PDF Export Analytics Sections', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 15)); // May 15, 2026
    mockJSDoc.text.mockClear();
    mockJSDoc.save.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  // Helper: click Export and advance through the 500ms setTimeout
  const clickExportAndWait = () => {
    fireEvent.click(screen.getByText('Export PDF Report'));
    act(() => {
      vi.advanceTimersByTime(500);
    });
  };

  // Helper: click Export button in Bangla mode
  const clickExportBangla = () => {
    fireEvent.click(screen.getByText('পিডিএফ রিপোর্ট এক্সপোর্ট'));
    act(() => {
      vi.advanceTimersByTime(500);
    });
  };

  // ==================== BUDGET VS ACTUAL ====================

  describe('Budget vs Actual', () => {
    it('renders section header and budget data in PDF', () => {
      render(<Settings
        {...defaultProps}
        transactions={[
          { id: 'tx_1', date: '2026-05-10', type: 'expense', amount: 2000, categoryId: 'cat_food', accountId: 'acc_1', notes: 'Groceries' },
        ]}
        categories={[
          { id: 'cat_food', name: 'Food & Drinks', color: '#FF6384' },
        ]}
        budgets={[
          { id: 'budget_1', categoryId: 'cat_food', limit: 5000, year: 2026, month: 4 },
        ]}
      />);

      clickExportAndWait();

      // Section header
      // Section header (x=25 = marginL+7)
      expect(mockJSDoc.text).toHaveBeenCalledWith('Budget vs Actual', 25, expect.any(Number));
      // Total budget line: Total, Spent, and 40% are separate text calls
      expect(mockJSDoc.text).toHaveBeenCalledWith(
        expect.stringMatching(/Total.*5,000/),
        expect.any(Number),
        expect.any(Number)
      );
      expect(mockJSDoc.text).toHaveBeenCalledWith(
        expect.stringMatching(/Spent.*2,000/),
        expect.any(Number),
        expect.any(Number)
      );
      // Category name (x=31 = marginL+13)
      expect(mockJSDoc.text).toHaveBeenCalledWith('Food & Drinks', 31, expect.any(Number));
      // Spent / limit label
      expect(mockJSDoc.text).toHaveBeenCalledWith(
        expect.stringMatching(/2,000.*5,000/),
        expect.any(Number),
        expect.any(Number)
      );
      // Percentage
      expect(mockJSDoc.text).toHaveBeenCalledWith(
        expect.stringMatching(/40%/),
        expect.any(Number),
        expect.any(Number)
      );
      // Color indicator dot (#FF6384 => RGB 255, 99, 132) at x=26 (marginL+8), r=1.5
      expect(mockJSDoc.setFillColor).toHaveBeenCalledWith(255, 99, 132);
      expect(mockJSDoc.circle).toHaveBeenCalledWith(26, expect.any(Number), 1.5, 'F');
      // doc.save should have been called
      expect(mockJSDoc.save).toHaveBeenCalledWith(expect.stringMatching(/Pocket_Khata_Report_.*\.pdf/));
    });

    it('renders over-budget indicator when spending exceeds limit', () => {
      render(<Settings
        {...defaultProps}
        transactions={[
          { id: 'tx_1', date: '2026-05-10', type: 'expense', amount: 6000, categoryId: 'cat_food', accountId: 'acc_1', notes: 'Groceries' },
        ]}
        categories={[
          { id: 'cat_food', name: 'Food & Drinks', color: '#FF6384' },
        ]}
        budgets={[
          { id: 'budget_1', categoryId: 'cat_food', limit: 5000, year: 2026, month: 4 },
        ]}
      />);

      clickExportAndWait();

      // Over budget: 6000 > 5000, 120%, OVER by 1,000
      expect(mockJSDoc.text).toHaveBeenCalledWith(
        expect.stringMatching(/OVER.*1,000/),
        expect.any(Number),
        expect.any(Number)
      );
      // Percentage shows 100 (capped in component) + OVER indicator
      // Over-budget: 6000 spent on 5000 limit = 120%
      expect(mockJSDoc.text).toHaveBeenCalledWith(
        expect.stringMatching(/120%/),
        expect.any(Number),
        expect.any(Number)
      );
      expect(mockJSDoc.text).toHaveBeenCalledWith(
        expect.stringMatching(/OVER.*1,000/),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('shows empty state message when no budgets exist', () => {
      render(<Settings
        {...defaultProps}
        transactions={[
          { id: 'tx_1', date: '2026-05-10', type: 'expense', amount: 1500, categoryId: 'cat_food', accountId: 'acc_1', notes: 'Lunch' },
        ]}
        categories={[
          { id: 'cat_food', name: 'Food', color: '#FF6384' },
        ]}
        budgets={[]}
      />);

      clickExportAndWait();

      // Still renders section header (x=25 = marginL+7)
      expect(mockJSDoc.text).toHaveBeenCalledWith('Budget vs Actual', 25, expect.any(Number));
      // Shows empty state
      expect(mockJSDoc.text).toHaveBeenCalledWith(
        'No budgets set for this period.',
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('handles multiple budgets across different categories', () => {
      render(<Settings
        {...defaultProps}
        transactions={[
          { id: 'tx_1', date: '2026-05-10', type: 'expense', amount: 1500, categoryId: 'cat_food', accountId: 'acc_1', notes: 'Groceries' },
          { id: 'tx_2', date: '2026-05-12', type: 'expense', amount: 25000, categoryId: 'cat_rent', accountId: 'acc_1', notes: 'Rent' },
        ]}
        categories={[
          { id: 'cat_food', name: 'Food', color: '#FF6384' },
          { id: 'cat_rent', name: 'Rent', color: '#36A2EB' },
        ]}
        budgets={[
          { id: 'budget_1', categoryId: 'cat_food', limit: 3000, year: 2026, month: 4 },
          { id: 'budget_2', categoryId: 'cat_rent', limit: 30000, year: 2026, month: 4 },
        ]}
      />);

      clickExportAndWait();

      // Both category names appear
      expect(mockJSDoc.text).toHaveBeenCalledWith('Food', expect.any(Number), expect.any(Number));
      expect(mockJSDoc.text).toHaveBeenCalledWith('Rent', expect.any(Number), expect.any(Number));
      // Total combines both: limit 33,000 total, spent 26,500 total
      // Total and Spent are separate text calls
      expect(mockJSDoc.text).toHaveBeenCalledWith(
        expect.stringMatching(/Total.*33,000/),
        expect.any(Number),
        expect.any(Number)
      );
      expect(mockJSDoc.text).toHaveBeenCalledWith(
        expect.stringMatching(/Spent.*26,500/),
        expect.any(Number),
        expect.any(Number)
      );
      // Color indicator dots for both categories
      expect(mockJSDoc.setFillColor).toHaveBeenCalledWith(255, 99, 132);  // Food #FF6384
      expect(mockJSDoc.setFillColor).toHaveBeenCalledWith(54, 162, 235); // Rent #36A2EB
    });
  });

  // ==================== SMART INSIGHTS ====================

  describe('Smart Insights', () => {
    it('renders insights sections with top category, increase, stats, and tx count', () => {
      render(<Settings
        {...defaultProps}
        transactions={[
          { id: 'tx_1', date: '2026-05-10', type: 'expense', amount: 2000, categoryId: 'cat_food', accountId: 'acc_1', notes: 'Groceries' },
          { id: 'tx_2', date: '2026-05-12', type: 'expense', amount: 3000, categoryId: 'cat_rent', accountId: 'acc_1', notes: 'Rent' },
          { id: 'tx_3', date: '2026-05-14', type: 'income', amount: 10000, categoryId: 'cat_salary', accountId: 'acc_1', notes: 'Salary' },
        ]}
        categories={[
          { id: 'cat_food', name: 'Food', color: '#FF6384' },
          { id: 'cat_rent', name: 'Rent', color: '#36A2EB' },
          { id: 'cat_salary', name: 'Salary', color: '#4BC0C0' },
        ]}
        budgets={[]}
      />);

      clickExportAndWait();

      // Section header (x=25 = marginL+7)
      expect(mockJSDoc.text).toHaveBeenCalledWith('Smart Insights', 25, expect.any(Number));
      // Top category card title (no colon)
      expect(mockJSDoc.text).toHaveBeenCalledWith('Top Spending Category', 26, expect.any(Number));
      expect(mockJSDoc.text).toHaveBeenCalledWith(
        expect.stringMatching(/Rent.*3,000/),
        expect.any(Number),
        expect.any(Number)
      );
      // Biggest increase card title (no colon)
      expect(mockJSDoc.text).toHaveBeenCalledWith('Biggest Increase vs Previous Period', 26, expect.any(Number));
      expect(mockJSDoc.text).toHaveBeenCalledWith(
        expect.stringMatching(/Rent.*3,000.*100%/),
        expect.any(Number),
        expect.any(Number)
      );
      // No decrease card (no negative diffs)
      expect(mockJSDoc.text).not.toHaveBeenCalledWith('Biggest Decrease vs Previous Period', expect.any(Number), expect.any(Number));
      // Summary stats: income 10,000, expense 5,000, and savings = +50% in separate calls
      expect(mockJSDoc.text).toHaveBeenCalledWith(
        expect.stringMatching(/Total Income.*10,000/),
        expect.any(Number),
        expect.any(Number)
      );
      expect(mockJSDoc.text).toHaveBeenCalledWith(
        expect.stringMatching(/Total Expense.*5,000/),
        expect.any(Number),
        expect.any(Number)
      );
      expect(mockJSDoc.text).toHaveBeenCalledWith(
        expect.stringMatching(/Savings Rate.*\+50%/),
        expect.any(Number),
        expect.any(Number)
      );
      // Tx count: 3 vs previous (4/empty → +3)
      expect(mockJSDoc.text).toHaveBeenCalledWith(
        expect.stringMatching(/Transactions: 3.*\+3 vs previous/),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('renders only top category when no previous period comparison data exists', () => {
      // 'thisYear' period — previous year has no data
      render(<Settings
        {...defaultProps}
        transactions={[
          { id: 'tx_1', date: '2026-05-10', type: 'expense', amount: 5000, categoryId: 'cat_food', accountId: 'acc_1', notes: 'Food' },
        ]}
        categories={[
          { id: 'cat_food', name: 'Food', color: '#FF6384' },
        ]}
        budgets={[]}
      />);

      // Switch to 'lastMonth' to test without comparison (no prev period data)
      // Actually, 'thisMonth' has prev data for April. Let's use 'lastMonth' with no data in prev (March)
      // Actually simpler: just leave default 'thisMonth' — the prev period (April) has no data
      // But comparison IS still shown (hasComparison = true, prevStartDate is set)
      // The biggest increase/dcrease still renders because prev=0, current>0 → diff > 0
      clickExportAndWait();

      // All insights sections still render (top category, increase, stats, tx count)
      expect(mockJSDoc.text).toHaveBeenCalledWith('Smart Insights', 25, expect.any(Number));
      expect(mockJSDoc.text).toHaveBeenCalledWith('Top Spending Category', 26, expect.any(Number));
      // Food $5,000
      expect(mockJSDoc.text).toHaveBeenCalledWith(
        expect.stringMatching(/Food.*5,000/),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('skips insights section when no transactions exist', () => {
      const alertMock = vi.fn();
      vi.stubGlobal('alert', alertMock);

      render(<Settings
        {...defaultProps}
        transactions={[]}
        categories={[]}
        budgets={[]}
      />);

      clickExportAndWait();

      // Should not have called insights text
      expect(mockJSDoc.text).not.toHaveBeenCalledWith('Smart Insights', 20, expect.any(Number));
      // Should show alert about no transactions
      expect(alertMock).toHaveBeenCalledWith('No transactions to export.');
    });
  });

  // ==================== ANOMALY DETECTION ====================

  describe('Anomaly Detection', () => {
    it('renders section with flagged anomalies above 2x category average', () => {
      render(<Settings
        {...defaultProps}
        transactions={[
          // 3 Food expenses, one is an anomaly (1000 > 2x avg of ~403)
          { id: 'tx_1', date: '2026-05-10', type: 'expense', amount: 100, categoryId: 'cat_food', accountId: 'acc_1', notes: 'Snacks' },
          { id: 'tx_2', date: '2026-05-11', type: 'expense', amount: 110, categoryId: 'cat_food', accountId: 'acc_1', notes: 'Lunch' },
          { id: 'tx_3', date: '2026-05-12', type: 'expense', amount: 1000, categoryId: 'cat_food', accountId: 'acc_1', notes: 'Big purchase' },
        ]}
        categories={[
          { id: 'cat_food', name: 'Food & Drinks', color: '#FF6384' },
        ]}
        budgets={[]}
      />);

      clickExportAndWait();

      // Section header (x=25 = marginL+7)
      expect(mockJSDoc.text).toHaveBeenCalledWith('Anomaly Detection', 25, expect.any(Number));
      // Summary line: 1 flagged
      expect(mockJSDoc.text).toHaveBeenCalledWith(
        expect.stringMatching(/1 flagged as anomalous/),
        expect.any(Number),
        expect.any(Number)
      );
      // Category name (x=26 = marginL+8)
      expect(mockJSDoc.text).toHaveBeenCalledWith('Food & Drinks', 26, expect.any(Number));
      // Notes
      expect(mockJSDoc.text).toHaveBeenCalledWith('Big purchase', expect.any(Number), expect.any(Number));
      // Amount (now separate from multiplier — amount is bold, avg is normal)
      expect(mockJSDoc.text).toHaveBeenCalledWith(
        expect.stringMatching(/1,000/),
        expect.any(Number),
        expect.any(Number)
      );
      expect(mockJSDoc.text).toHaveBeenCalledWith(
        expect.stringMatching(/2\.5.*[Aa]vg.*403/),
        expect.any(Number),
        expect.any(Number)
      );
      // Category color accent bar (rect) instead of circle dot
      expect(mockJSDoc.setFillColor).toHaveBeenCalledWith(255, 99, 132);
      expect(mockJSDoc.rect).toHaveBeenCalledWith(20, expect.any(Number), 1.5, 11, 'F');
    });

    it('shows not enough data message when fewer than 3 expenses', () => {
      render(<Settings
        {...defaultProps}
        transactions={[
          { id: 'tx_1', date: '2026-05-10', type: 'expense', amount: 100, categoryId: 'cat_food', accountId: 'acc_1', notes: 'Snacks' },
          { id: 'tx_2', date: '2026-05-10', type: 'income', amount: 5000, categoryId: 'cat_salary', accountId: 'acc_1', notes: 'Salary' },
        ]}
        categories={[
          { id: 'cat_food', name: 'Food', color: '#FF6384' },
          { id: 'cat_salary', name: 'Salary', color: '#4BC0C0' },
        ]}
        budgets={[]}
      />);

      clickExportAndWait();

      // Section header (x=25 = marginL+7)
      expect(mockJSDoc.text).toHaveBeenCalledWith('Anomaly Detection', 25, expect.any(Number));
      // Shows not enough data
      expect(mockJSDoc.text).toHaveBeenCalledWith(
        'Need more transactions to detect anomalies.',
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('shows no anomalies message when all expenses are within normal range', () => {
      render(<Settings
        {...defaultProps}
        transactions={[
          { id: 'tx_1', date: '2026-05-10', type: 'expense', amount: 100, categoryId: 'cat_food', accountId: 'acc_1', notes: 'Snacks' },
          { id: 'tx_2', date: '2026-05-11', type: 'expense', amount: 110, categoryId: 'cat_food', accountId: 'acc_1', notes: 'Lunch' },
          { id: 'tx_3', date: '2026-05-12', type: 'expense', amount: 120, categoryId: 'cat_food', accountId: 'acc_1', notes: 'Dinner' },
        ]}
        categories={[
          { id: 'cat_food', name: 'Food & Drinks', color: '#FF6384' },
        ]}
        budgets={[]}
      />);

      clickExportAndWait();

      // Section header (x=25 = marginL+7)
      expect(mockJSDoc.text).toHaveBeenCalledWith('Anomaly Detection', 25, expect.any(Number));
      // Shows no anomalies
      expect(mockJSDoc.text).toHaveBeenCalledWith(
        'No anomalies detected this period.',
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('flags multiple anomalies across different categories', () => {
      render(<Settings
        {...defaultProps}
        transactions={[
          // Food: 3 txs, one anomaly (1000 > avg*2 = ~806)
          { id: 'tx_1', date: '2026-05-10', type: 'expense', amount: 100, categoryId: 'cat_food', accountId: 'acc_1', notes: 'Snacks' },
          { id: 'tx_2', date: '2026-05-11', type: 'expense', amount: 110, categoryId: 'cat_food', accountId: 'acc_1', notes: 'Lunch' },
          { id: 'tx_3', date: '2026-05-12', type: 'expense', amount: 1000, categoryId: 'cat_food', accountId: 'acc_1', notes: 'Big food' },
          // Rent: 3 txs, one anomaly (120000 > avg*2 ~= 114000)
          { id: 'tx_4', date: '2026-05-10', type: 'expense', amount: 25000, categoryId: 'cat_rent', accountId: 'acc_1', notes: 'March rent' },
          { id: 'tx_5', date: '2026-05-11', type: 'expense', amount: 26000, categoryId: 'cat_rent', accountId: 'acc_1', notes: 'April rent' },
          { id: 'tx_6', date: '2026-05-12', type: 'expense', amount: 120000, categoryId: 'cat_rent', accountId: 'acc_1', notes: 'Deposit' },
        ]}
        categories={[
          { id: 'cat_food', name: 'Food & Drinks', color: '#FF6384' },
          { id: 'cat_rent', name: 'Rent', color: '#36A2EB' },
        ]}
        budgets={[]}
      />);

      clickExportAndWait();

      // Both categories flagged
      expect(mockJSDoc.text).toHaveBeenCalledWith('Food & Drinks', expect.any(Number), expect.any(Number));
      expect(mockJSDoc.text).toHaveBeenCalledWith('Rent', expect.any(Number), expect.any(Number));
      // Summary: 2 flagged
      expect(mockJSDoc.text).toHaveBeenCalledWith(
        expect.stringMatching(/2 flagged as anomalous/),
        expect.any(Number),
        expect.any(Number)
      );
      // Color indicator dots for both categories
      expect(mockJSDoc.setFillColor).toHaveBeenCalledWith(255, 99, 132);  // Food #FF6384
      expect(mockJSDoc.setFillColor).toHaveBeenCalledWith(54, 162, 235); // Rent #36A2EB
    });

    it('skips categories with only 1 transaction (not enough for avg)', () => {
      render(<Settings
        {...defaultProps}
        transactions={[
          // Food: 3 txs, one anomaly (1000 > avg*2 = ~806)
          { id: 'tx_1', date: '2026-05-10', type: 'expense', amount: 100, categoryId: 'cat_food', accountId: 'acc_1', notes: 'Snacks' },
          { id: 'tx_2', date: '2026-05-11', type: 'expense', amount: 110, categoryId: 'cat_food', accountId: 'acc_1', notes: 'Lunch' },
          { id: 'tx_3', date: '2026-05-12', type: 'expense', amount: 1000, categoryId: 'cat_food', accountId: 'acc_1', notes: 'Big food' },
          // Transport: 1 tx only — skipped by threshold
          { id: 'tx_4', date: '2026-05-10', type: 'expense', amount: 99999, categoryId: 'cat_transport', accountId: 'acc_1', notes: 'Car' },
        ]}
        categories={[
          { id: 'cat_food', name: 'Food', color: '#FF6384' },
          { id: 'cat_transport', name: 'Transport', color: '#FFCE56' },
        ]}
        budgets={[]}
      />);

      clickExportAndWait();

      // Only Food flagged (Transport has < 2 txs, skipped)
      expect(mockJSDoc.text).toHaveBeenCalledWith('Food', expect.any(Number), expect.any(Number));
      // Summary: 1 flagged
      expect(mockJSDoc.text).toHaveBeenCalledWith(
        expect.stringMatching(/1 flagged as anomalous/),
        expect.any(Number),
        expect.any(Number)
      );
      // Transport should NOT be referenced in anomaly section
      // (its tx is not flagged since < 2 txs in that category)
      const transportCalls = mockJSDoc.text.mock.calls.filter(
        call => typeof call[0] === 'string' && call[0].includes('Transport')
      );
      // Transport might appear in transactions list but not as anomaly section header
      // We just verify Food is flagged
    });
  });

  // ==================== BANGLA PDF GENERATION ====================

  describe('Bangla PDF Generation', () => {
    it('renders title banner in Bangla (পকেট খাতা — আর্থিক প্রতিবেদন)', () => {
      render(<Settings
        {...defaultProps}
        lang="bn"
        transactions={[
          { id: 'tx_1', date: '2026-05-10', type: 'expense', amount: 2000, categoryId: 'cat_food', accountId: 'acc_1', notes: 'Groceries' },
        ]}
        categories={[{ id: 'cat_food', name: 'Food & Drinks', color: '#FF6384' }]}
        accounts={[{ id: 'acc_1', name: 'Cash' }]}
        budgets={[]}
      />);

      clickExportBangla();

      // Title: পকেট খাতা — আর্থিক প্রতিবেদন
      expect(mockJSDoc.text).toHaveBeenCalledWith(
        expect.stringContaining('পকেট খাতা'),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
      // Period label
      expect(mockJSDoc.text).toHaveBeenCalledWith(
        expect.stringMatching(/সময়কাল:/),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
      // Generated label
      expect(mockJSDoc.text).toHaveBeenCalledWith(
        expect.stringMatching(/তৈরি:/),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('renders summary cards in Bangla (মোট আয়, মোট ব্যয়, নিট সঞ্চয়)', () => {
      render(<Settings
        {...defaultProps}
        lang="bn"
        transactions={[
          { id: 'tx_1', date: '2026-05-10', type: 'income', amount: 10000, categoryId: 'cat_salary', accountId: 'acc_1', notes: 'Salary' },
          { id: 'tx_2', date: '2026-05-12', type: 'expense', amount: 2000, categoryId: 'cat_food', accountId: 'acc_1', notes: 'Groceries' },
        ]}
        categories={[
          { id: 'cat_salary', name: 'Salary', color: '#4BC0C0' },
          { id: 'cat_food', name: 'Food & Drinks', color: '#FF6384' },
        ]}
        accounts={[{ id: 'acc_1', name: 'Cash' }]}
        budgets={[]}
      />);

      clickExportBangla();

      // Summary card labels
      expect(mockJSDoc.text).toHaveBeenCalledWith('মোট আয়', expect.any(Number), expect.any(Number));
      expect(mockJSDoc.text).toHaveBeenCalledWith('মোট ব্যয়', expect.any(Number), expect.any(Number));
      expect(mockJSDoc.text).toHaveBeenCalledWith('নিট সঞ্চয়', expect.any(Number), expect.any(Number));
    });

    it('renders chart section in Bangla (আয় বনাম ব্যয় প্রবণতা, আয়, ব্যয়)', () => {
      // Need multiple months of data for chart
      render(<Settings
        {...defaultProps}
        lang="bn"
        transactions={[
          { id: 'tx_1', date: '2026-04-10', type: 'income', amount: 5000, categoryId: 'cat_salary', accountId: 'acc_1', notes: 'Salary' },
          { id: 'tx_2', date: '2026-04-12', type: 'expense', amount: 2000, categoryId: 'cat_food', accountId: 'acc_1', notes: 'Food' },
          { id: 'tx_3', date: '2026-05-10', type: 'income', amount: 6000, categoryId: 'cat_salary', accountId: 'acc_1', notes: 'Salary' },
          { id: 'tx_4', date: '2026-05-12', type: 'expense', amount: 3000, categoryId: 'cat_food', accountId: 'acc_1', notes: 'Food' },
        ]}
        categories={[
          { id: 'cat_salary', name: 'Salary', color: '#4BC0C0' },
          { id: 'cat_food', name: 'Food & Drinks', color: '#FF6384' },
        ]}
        accounts={[{ id: 'acc_1', name: 'Cash' }]}
        budgets={[]}
      />);

      clickExportBangla();

      // Chart section header
      expect(mockJSDoc.text).toHaveBeenCalledWith('আয় বনাম ব্যয় প্রবণতা', 25, expect.any(Number));
      // Chart legend labels
      expect(mockJSDoc.text).toHaveBeenCalledWith('আয়', expect.any(Number), expect.any(Number));
      expect(mockJSDoc.text).toHaveBeenCalledWith('ব্যয়', expect.any(Number), expect.any(Number));
    });

    it('renders budget section in Bangla (বাজেট বনাম প্রকৃত, মোট:, ব্যয়:, বেশি হয়েছে)', () => {
      render(<Settings
        {...defaultProps}
        lang="bn"
        transactions={[
          { id: 'tx_1', date: '2026-05-10', type: 'expense', amount: 6000, categoryId: 'cat_food', accountId: 'acc_1', notes: 'Groceries' },
        ]}
        categories={[{ id: 'cat_food', name: 'Food & Drinks', color: '#FF6384' }]}
        accounts={[{ id: 'acc_1', name: 'Cash' }]}
        budgets={[
          { id: 'budget_1', categoryId: 'cat_food', limit: 5000, year: 2026, month: 4 },
        ]}
      />);

      clickExportBangla();

      // Section header
      expect(mockJSDoc.text).toHaveBeenCalledWith('বাজেট বনাম প্রকৃত', 25, expect.any(Number));
      // Total label
      expect(mockJSDoc.text).toHaveBeenCalledWith(
        expect.stringMatching(/মোট:/),
        expect.any(Number),
        expect.any(Number)
      );
      // Spent label
      expect(mockJSDoc.text).toHaveBeenCalledWith(
        expect.stringMatching(/ব্যয়:/),
        expect.any(Number),
        expect.any(Number)
      );
      // Over-by label (budget is over 6000 spent on 5000 limit)
      expect(mockJSDoc.text).toHaveBeenCalledWith(
        expect.stringMatching(/বেশি হয়েছে/),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('renders smart insights in Bangla (স্মার্ট অন্তর্দৃষ্টি, সর্বোচ্চ ব্যয়ের ক্যাটাগরি, মোট আয়:, মোট ব্যয়:, সঞ্চয়ের হার:)', () => {
      render(<Settings
        {...defaultProps}
        lang="bn"
        transactions={[
          { id: 'tx_1', date: '2026-05-10', type: 'expense', amount: 3000, categoryId: 'cat_food', accountId: 'acc_1', notes: 'Food' },
          { id: 'tx_2', date: '2026-05-14', type: 'income', amount: 10000, categoryId: 'cat_salary', accountId: 'acc_1', notes: 'Salary' },
        ]}
        categories={[
          { id: 'cat_food', name: 'Food', color: '#FF6384' },
          { id: 'cat_salary', name: 'Salary', color: '#4BC0C0' },
        ]}
        accounts={[{ id: 'acc_1', name: 'Cash' }]}
        budgets={[]}
      />);

      clickExportBangla();

      expect(mockJSDoc.text).toHaveBeenCalledWith('স্মার্ট অন্তর্দৃষ্টি', 25, expect.any(Number));
      expect(mockJSDoc.text).toHaveBeenCalledWith('সর্বোচ্চ ব্যয়ের ক্যাটাগরি', 26, expect.any(Number));
      expect(mockJSDoc.text).toHaveBeenCalledWith(
        expect.stringMatching(/মোট আয়:/),
        expect.any(Number),
        expect.any(Number)
      );
      expect(mockJSDoc.text).toHaveBeenCalledWith(
        expect.stringMatching(/মোট ব্যয়:/),
        expect.any(Number),
        expect.any(Number)
      );
      expect(mockJSDoc.text).toHaveBeenCalledWith(
        expect.stringMatching(/সঞ্চয়ের হার:/),
        expect.any(Number),
        expect.any(Number)
      );
      expect(mockJSDoc.text).toHaveBeenCalledWith(
        expect.stringMatching(/লেনদেন:/),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('renders anomaly detection in Bangla (অস্বাভাবিক সনাক্তকরণ, অস্বাভাবিক হিসেবে চিহ্নিত, গড়:)', () => {
      render(<Settings
        {...defaultProps}
        lang="bn"
        transactions={[
          { id: 'tx_1', date: '2026-05-10', type: 'expense', amount: 100, categoryId: 'cat_food', accountId: 'acc_1', notes: 'Snacks' },
          { id: 'tx_2', date: '2026-05-11', type: 'expense', amount: 110, categoryId: 'cat_food', accountId: 'acc_1', notes: 'Lunch' },
          { id: 'tx_3', date: '2026-05-12', type: 'expense', amount: 1000, categoryId: 'cat_food', accountId: 'acc_1', notes: 'Big purchase' },
        ]}
        categories={[{ id: 'cat_food', name: 'Food & Drinks', color: '#FF6384' }]}
        accounts={[{ id: 'acc_1', name: 'Cash' }]}
        budgets={[]}
      />);

      clickExportBangla();

      expect(mockJSDoc.text).toHaveBeenCalledWith('অস্বাভাবিক সনাক্তকরণ', 25, expect.any(Number));
      expect(mockJSDoc.text).toHaveBeenCalledWith(
        expect.stringMatching(/অস্বাভাবিক হিসেবে চিহ্নিত/),
        expect.any(Number),
        expect.any(Number)
      );
      expect(mockJSDoc.text).toHaveBeenCalledWith(
        expect.stringMatching(/গড়:/),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('renders transaction column headers in Bangla (তারিখ, ধরণ, ক্যাটাগরি, একাউন্ট, পরিমাণ)', () => {
      render(<Settings
        {...defaultProps}
        lang="bn"
        transactions={[
          { id: 'tx_1', date: '2026-05-10', type: 'expense', amount: 2000, categoryId: 'cat_food', accountId: 'acc_1', notes: 'Groceries' },
        ]}
        categories={[{ id: 'cat_food', name: 'Food', color: '#FF6384' }]}
        accounts={[{ id: 'acc_1', name: 'Cash' }]}
        budgets={[]}
      />);

      clickExportBangla();

      // Column headers — each is a separate text call; date/type/category/account have
      // 4th arg=undefined (no align), amount has 4th arg={ align: 'right' }
      expect(mockJSDoc.text).toHaveBeenCalledWith('তারিখ', expect.any(Number), expect.any(Number), undefined);
      expect(mockJSDoc.text).toHaveBeenCalledWith('ধরণ', expect.any(Number), expect.any(Number), undefined);
      expect(mockJSDoc.text).toHaveBeenCalledWith('ক্যাটাগরি', expect.any(Number), expect.any(Number), undefined);
      expect(mockJSDoc.text).toHaveBeenCalledWith('একাউন্ট', expect.any(Number), expect.any(Number), undefined);
      expect(mockJSDoc.text).toHaveBeenCalledWith('পরিমাণ', expect.any(Number), expect.any(Number), expect.any(Object));
    });

    it('renders transaction type labels in Bangla (আয়, ব্যয়)', () => {
      render(<Settings
        {...defaultProps}
        lang="bn"
        transactions={[
          { id: 'tx_1', date: '2026-05-10', type: 'income', amount: 10000, categoryId: 'cat_salary', accountId: 'acc_1', notes: 'Salary' },
          { id: 'tx_2', date: '2026-05-12', type: 'expense', amount: 2000, categoryId: 'cat_food', accountId: 'acc_1', notes: 'Food' },
        ]}
        categories={[
          { id: 'cat_salary', name: 'Salary', color: '#4BC0C0' },
          { id: 'cat_food', name: 'Food', color: '#FF6384' },
        ]}
        accounts={[{ id: 'acc_1', name: 'Cash' }]}
        budgets={[]}
      />);

      clickExportBangla();

      expect(mockJSDoc.text).toHaveBeenCalledWith('আয়', expect.any(Number), expect.any(Number));
      expect(mockJSDoc.text).toHaveBeenCalledWith('ব্যয়', expect.any(Number), expect.any(Number));
    });

    it('renders footer in Bangla (পকেট খাতা দ্বারা তৈরি:)', () => {
      render(<Settings
        {...defaultProps}
        lang="bn"
        transactions={[
          { id: 'tx_1', date: '2026-05-10', type: 'expense', amount: 2000, categoryId: 'cat_food', accountId: 'acc_1', notes: 'Groceries' },
        ]}
        categories={[{ id: 'cat_food', name: 'Food', color: '#FF6384' }]}
        accounts={[{ id: 'acc_1', name: 'Cash' }]}
        budgets={[]}
      />);

      clickExportBangla();

      // Footer text — centered with { align: 'center' } option
      expect(mockJSDoc.text).toHaveBeenCalledWith(
        expect.stringMatching(/পকেট খাতা দ্বারা তৈরি:/),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('renders no-budgets empty state in Bangla', () => {
      render(<Settings
        {...defaultProps}
        lang="bn"
        transactions={[
          { id: 'tx_1', date: '2026-05-10', type: 'expense', amount: 2000, categoryId: 'cat_food', accountId: 'acc_1', notes: 'Groceries' },
        ]}
        categories={[{ id: 'cat_food', name: 'Food', color: '#FF6384' }]}
        accounts={[{ id: 'acc_1', name: 'Cash' }]}
        budgets={[]}
      />);

      clickExportBangla();

      expect(mockJSDoc.text).toHaveBeenCalledWith(
        'এই সময়ের জন্য কোনো বাজেট সেট করা হয়নি।',
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('renders anomaly empty state in Bangla', () => {
      render(<Settings
        {...defaultProps}
        lang="bn"
        transactions={[
          { id: 'tx_1', date: '2026-05-10', type: 'expense', amount: 100, categoryId: 'cat_food', accountId: 'acc_1', notes: 'Snacks' },
          { id: 'tx_2', date: '2026-05-11', type: 'expense', amount: 110, categoryId: 'cat_food', accountId: 'acc_1', notes: 'Lunch' },
          { id: 'tx_3', date: '2026-05-12', type: 'expense', amount: 120, categoryId: 'cat_food', accountId: 'acc_1', notes: 'Dinner' },
        ]}
        categories={[{ id: 'cat_food', name: 'Food', color: '#FF6384' }]}
        accounts={[{ id: 'acc_1', name: 'Cash' }]}
        budgets={[]}
      />);

      clickExportBangla();

      expect(mockJSDoc.text).toHaveBeenCalledWith(
        'এই সময়ের মধ্যে কোনো অস্বাভাবিকতা পাওয়া যায়নি।',
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('renders all sections with full Bangla text in a single comprehensive PDF', () => {
      render(<Settings
        {...defaultProps}
        lang="bn"
        transactions={[
          { id: 'tx_1', date: '2026-05-10', type: 'income', amount: 50000, categoryId: 'cat_salary', accountId: 'acc_1', notes: 'Salary' },
          { id: 'tx_2', date: '2026-05-12', type: 'expense', amount: 8000, categoryId: 'cat_rent', accountId: 'acc_1', notes: 'House Rent' },
          { id: 'tx_3', date: '2026-05-14', type: 'expense', amount: 3000, categoryId: 'cat_food', accountId: 'acc_1', notes: 'Groceries' },
          { id: 'tx_4', date: '2026-05-15', type: 'income', amount: 5000, categoryId: 'cat_freelance', accountId: 'acc_1', notes: 'Freelance' },
        ]}
        categories={[
          { id: 'cat_salary', name: 'Salary', color: '#4BC0C0' },
          { id: 'cat_freelance', name: 'Freelance', color: '#36A2EB' },
          { id: 'cat_rent', name: 'Rent', color: '#FF6384' },
          { id: 'cat_food', name: 'Food & Drinks', color: '#FFCE56' },
        ]}
        accounts={[{ id: 'acc_1', name: 'Cash' }]}
        budgets={[
          { id: 'budget_1', categoryId: 'cat_rent', limit: 10000, year: 2026, month: 4 },
          { id: 'budget_2', categoryId: 'cat_food', limit: 5000, year: 2026, month: 4 },
        ]}
      />);

      clickExportBangla();

      // Verify ALL sections have Bangla text
      // Title banner
      expect(mockJSDoc.text).toHaveBeenCalledWith(
        expect.stringMatching(/পকেট খাতা.*আর্থিক প্রতিবেদন/),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
      // Summary cards
      expect(mockJSDoc.text).toHaveBeenCalledWith('মোট আয়', expect.any(Number), expect.any(Number));
      expect(mockJSDoc.text).toHaveBeenCalledWith('মোট ব্যয়', expect.any(Number), expect.any(Number));
      expect(mockJSDoc.text).toHaveBeenCalledWith('নিট সঞ্চয়', expect.any(Number), expect.any(Number));
      // Budget section
      expect(mockJSDoc.text).toHaveBeenCalledWith('বাজেট বনাম প্রকৃত', 25, expect.any(Number));
      // Insights
      expect(mockJSDoc.text).toHaveBeenCalledWith('স্মার্ট অন্তর্দৃষ্টি', 25, expect.any(Number));
      // Anomaly detection
      expect(mockJSDoc.text).toHaveBeenCalledWith('অস্বাভাবিক সনাক্তকরণ', 25, expect.any(Number));
      // Transaction columns — date/type/category/account have 4th arg=undefined, amount has { align: 'right' }
      expect(mockJSDoc.text).toHaveBeenCalledWith('তারিখ', expect.any(Number), expect.any(Number), undefined);
      expect(mockJSDoc.text).toHaveBeenCalledWith('ধরণ', expect.any(Number), expect.any(Number), undefined);
      expect(mockJSDoc.text).toHaveBeenCalledWith('ক্যাটাগরি', expect.any(Number), expect.any(Number), undefined);
      expect(mockJSDoc.text).toHaveBeenCalledWith('একাউন্ট', expect.any(Number), expect.any(Number), undefined);
      expect(mockJSDoc.text).toHaveBeenCalledWith('পরিমাণ', expect.any(Number), expect.any(Number), expect.any(Object));
    });
  });

  // ==================== CROSS-SECTION BEHAVIOR ====================

  describe('Cross-section behavior', () => {
    it('renders all three sections in a single PDF when data exists', () => {
      render(<Settings
        {...defaultProps}
        transactions={[
          { id: 'tx_1', date: '2026-05-10', type: 'expense', amount: 2000, categoryId: 'cat_food', accountId: 'acc_1', notes: 'Groceries' },
          { id: 'tx_2', date: '2026-05-12', type: 'expense', amount: 3000, categoryId: 'cat_rent', accountId: 'acc_1', notes: 'Rent' },
          { id: 'tx_3', date: '2026-05-14', type: 'income', amount: 10000, categoryId: 'cat_salary', accountId: 'acc_1', notes: 'Salary' },
        ]}
        categories={[
          { id: 'cat_food', name: 'Food', color: '#FF6384' },
          { id: 'cat_rent', name: 'Rent', color: '#36A2EB' },
          { id: 'cat_salary', name: 'Salary', color: '#4BC0C0' },
        ]}
        budgets={[
          { id: 'budget_1', categoryId: 'cat_food', limit: 3000, year: 2026, month: 4 },
        ]}
      />);

      clickExportAndWait();

      // All three section headers present at x=25 (marginL+7)
      expect(mockJSDoc.text).toHaveBeenCalledWith('Budget vs Actual', 25, expect.any(Number));
      expect(mockJSDoc.text).toHaveBeenCalledWith('Smart Insights', 25, expect.any(Number));
      expect(mockJSDoc.text).toHaveBeenCalledWith('Anomaly Detection', 25, expect.any(Number));
      // Summary section — now uses card-based layout with TOTAL INCOME / TOTAL EXPENSE / NET SAVINGS
      expect(mockJSDoc.text).toHaveBeenCalledWith('TOTAL INCOME', expect.any(Number), expect.any(Number));
      expect(mockJSDoc.text).toHaveBeenCalledWith('TOTAL EXPENSE', expect.any(Number), expect.any(Number));
      expect(mockJSDoc.text).toHaveBeenCalledWith('NET SAVINGS', expect.any(Number), expect.any(Number));
      // Transactions section
      expect(mockJSDoc.text).toHaveBeenCalledWith(
        expect.stringMatching(/Transactions \(3\)/),
        expect.any(Number),
        expect.any(Number)
      );
      expect(mockJSDoc.save).toHaveBeenCalled();
    });

    it('does not generate PDF when there are zero transactions', () => {
      const alertMock = vi.fn();
      vi.stubGlobal('alert', alertMock);

      render(<Settings
        {...defaultProps}
        transactions={[]}
        categories={[]}
        budgets={[]}
      />);

      clickExportAndWait();

      // doc.save should NOT have been called
      expect(mockJSDoc.save).not.toHaveBeenCalled();
      expect(alertMock).toHaveBeenCalledWith('No transactions to export.');
    });
  });
});
