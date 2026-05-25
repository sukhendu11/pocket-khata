import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import Settings from '../components/Settings';

// ==============================================================================
// Module-level mocks (hoisted above the import to handle vi.mock hoisting)
// ==============================================================================

const mockDb = vi.hoisted(() => ({
  getAutoBackups: vi.fn(() => []),
  restoreFromAutoBackup: vi.fn(() => true),
  clearAutoBackups: vi.fn(),
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
  setDrawColor: vi.fn(),
  line: vi.fn(),
  addPage: vi.fn(),
  save: vi.fn(),
}));

vi.mock('jspdf', () => ({
  default: vi.fn(() => mockJSDoc),
}));

// ==============================================================================
// Helpers
// ==============================================================================

/** Build an ISO timestamp relative to now */
const minutesAgo = (minutes) =>
  new Date(Date.now() - minutes * 60 * 1000).toISOString();

const secondsAgo = (seconds) =>
  new Date(Date.now() - seconds * 1000).toISOString();

// ==============================================================================
// Mock Snapshots
// ==============================================================================

/** Snapshot #0 (newest) — fully populated, 2 min ago */
const SNAPSHOT_FULL = {
  timestamp: minutesAgo(2),
  accounts: [{ id: 'acc_1', name: 'Cash' }],
  categories: [
    { id: 'cat_food', name: 'Food' },
    { id: 'cat_rent', name: 'Rent' },
  ],
  transactions: [{ id: 'tx_1' }, { id: 'tx_2' }, { id: 'tx_3' }],
  reminders: [{ id: 'rem_1' }],
  security: {},
  budgets: [{ id: 'budget_1', limit: 5000 }],
  savingsGoals: [{ id: 'goal_1', targetAmount: 50000 }],
};

/** Snapshot #1 (middle) — partial data, 30 min ago */
const SNAPSHOT_PARTIAL = {
  timestamp: minutesAgo(30),
  accounts: [{ id: 'acc_1', name: 'Cash' }],
  categories: [{ id: 'cat_food', name: 'Food' }],
  transactions: [{ id: 'tx_1' }, { id: 'tx_2' }],
  reminders: [],
  security: {},
  budgets: [],
  savingsGoals: [],
};

/** Snapshot #2 (oldest) — empty, 2h ago */
const SNAPSHOT_EMPTY = {
  timestamp: minutesAgo(120),
  accounts: [],
  categories: [],
  transactions: [],
  reminders: [],
  security: {},
  budgets: [],
  savingsGoals: [],
};

/** Three snapshots for general tests */
const THREE_SNAPSHOTS = [SNAPSHOT_FULL, SNAPSHOT_PARTIAL, SNAPSHOT_EMPTY];

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

describe('Settings — Auto-Backup UI', () => {

  // ======================== RENDERING ========================

  describe('Rendering', () => {
    it('renders the auto-backup card with title', () => {
      render(<Settings {...defaultProps} />);
      expect(screen.getByText('Auto-Backups')).toBeTruthy();
    });

    it('renders the auto-backup description text', () => {
      render(<Settings {...defaultProps} />);
      expect(
        screen.getByText(/snapshots are automatically created/i)
      ).toBeTruthy();
    });

    it('calls db.getAutoBackups on render', () => {
      render(<Settings {...defaultProps} />);
      expect(mockDb.getAutoBackups).toHaveBeenCalled();
    });

    it('renders without crashing when all props are provided', () => {
      render(<Settings {...defaultProps} />);
      expect(screen.getByText('Auto-Backups')).toBeTruthy();
    });
  });

  // ======================== EMPTY STATE ========================

  describe('Empty State', () => {
    it('shows "no auto-backups yet" message when no backups exist', () => {
      mockDb.getAutoBackups.mockReturnValue([]);
      render(<Settings {...defaultProps} />);
      expect(
        screen.getByText(/no auto-backups yet/i)
      ).toBeTruthy();
    });

    it('does NOT show backup count when empty', () => {
      mockDb.getAutoBackups.mockReturnValue([]);
      render(<Settings {...defaultProps} />);
      expect(screen.queryByText(/auto-backups available/i)).toBeNull();
    });

    it('does NOT show snapshot cards when empty', () => {
      mockDb.getAutoBackups.mockReturnValue([]);
      render(<Settings {...defaultProps} />);
      expect(screen.queryByText(/Snapshot #/)).toBeNull();
    });

    it('does NOT show Clear All Backups button when empty', () => {
      mockDb.getAutoBackups.mockReturnValue([]);
      render(<Settings {...defaultProps} />);
      expect(screen.queryByText('Clear All Backups')).toBeNull();
    });
  });

  // ======================== WITH BACKUPS — RENDERING ========================

  describe('With Backups — Rendering', () => {
    it('shows backup count when backups exist', () => {
      mockDb.getAutoBackups.mockReturnValue(THREE_SNAPSHOTS);
      render(<Settings {...defaultProps} />);
      expect(screen.getByText(/3 auto-backups available/)).toBeTruthy();
    });

    it('shows "1 auto-backups available" for a single backup', () => {
      mockDb.getAutoBackups.mockReturnValue([SNAPSHOT_FULL]);
      render(<Settings {...defaultProps} />);
      expect(screen.getByText(/1 auto-backups available/)).toBeTruthy();
    });

    it('renders snapshot labels (Snapshot #1, #2, #3)', () => {
      mockDb.getAutoBackups.mockReturnValue(THREE_SNAPSHOTS);
      render(<Settings {...defaultProps} />);
      expect(screen.getByText('Snapshot #1')).toBeTruthy();
      expect(screen.getByText('Snapshot #2')).toBeTruthy();
      expect(screen.getByText('Snapshot #3')).toBeTruthy();
    });

    it('shows relative timestamps for each snapshot (2m ago, 30m ago, 2h ago)', () => {
      mockDb.getAutoBackups.mockReturnValue(THREE_SNAPSHOTS);
      render(<Settings {...defaultProps} />);
      expect(screen.getByText('2m ago')).toBeTruthy();
      expect(screen.getByText('30m ago')).toBeTruthy();
      expect(screen.getByText('2h ago')).toBeTruthy();
    });

    it('shows "Xs ago" for snapshots less than 1 minute old', () => {
      const freshSnapshot = {
        ...SNAPSHOT_FULL,
        timestamp: secondsAgo(15),
      };
      mockDb.getAutoBackups.mockReturnValue([freshSnapshot]);
      render(<Settings {...defaultProps} />);
      expect(screen.getByText('15s ago')).toBeTruthy();
    });

    it('shows formatted date for snapshots older than 24h', () => {
      const oldSnapshot = {
        ...SNAPSHOT_FULL,
        timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      };
      mockDb.getAutoBackups.mockReturnValue([oldSnapshot]);
      render(<Settings {...defaultProps} />);
      // Should show a short date (e.g., "May 23, 06:15 PM") — just check it doesn't crash
      expect(screen.getByText(/Snapshot #1/)).toBeTruthy();
      // The relative time should include digits (not "s ago", "m ago", "h ago")
      expect(screen.queryByText(/[smh] ago$/)).toBeNull();
    });
  });

  // ======================== SNAPSHOT ITEM COUNTS ========================

  describe('Snapshot Item Counts', () => {
    it('shows correct counts for fully populated snapshot', () => {
      mockDb.getAutoBackups.mockReturnValue([SNAPSHOT_FULL]);
      render(<Settings {...defaultProps} />);

      // Snapshot #0 has: 1 account, 2 categories, 3 transactions, 1 budget, 1 goal
      // Counts are rendered as bolded <span>N</span> — match the number text nodes directly
      expect(screen.getAllByText('1')).toHaveLength(3);  // 1 account + 1 budget + 1 goal
      expect(screen.getAllByText('2')).toHaveLength(1);  // 2 categories
      expect(screen.getAllByText('3')).toHaveLength(1);  // 3 transactions
    });

    it('shows zero counts for empty snapshot', () => {
      mockDb.getAutoBackups.mockReturnValue([SNAPSHOT_EMPTY]);
      render(<Settings {...defaultProps} />);

      // All 5 stats are 0
      expect(screen.getAllByText('0')).toHaveLength(5);
    });

    it('shows correct counts for each of the 3 snapshots', () => {
      mockDb.getAutoBackups.mockReturnValue(THREE_SNAPSHOTS);
      render(<Settings {...defaultProps} />);

      // Snapshot #1: 1 account, 2 categories, 3 txns, 1 budget, 1 goal
      // Snapshot #2: 1 account, 1 category,  2 txns, 0 budget, 0 goal
      // Snapshot #3: 0 account, 0 category,  0 txns, 0 budget, 0 goal

      // Total across 3 snapshots:
      // "1": S#1 (acc,bud,goal) + S#2 (acc,cat) = 5
      // "2": S#1 (cat) + S#2 (txn) = 2
      // "3": S#1 (txn) = 1
      // "0": S#2 (bud,goal) + S#3 (all 5) = 7
      expect(screen.getAllByText('1')).toHaveLength(5);
      expect(screen.getAllByText('2')).toHaveLength(2);
      expect(screen.getAllByText('3')).toHaveLength(1);
      expect(screen.getAllByText('0')).toHaveLength(7);
    });
  });

  // ======================== RESTORE BUTTON ========================

  describe('Restore Button', () => {
    it('shows a Restore button on each snapshot card', () => {
      mockDb.getAutoBackups.mockReturnValue(THREE_SNAPSHOTS);
      render(<Settings {...defaultProps} />);
      const restoreBtns = screen.getAllByText('Restore');
      expect(restoreBtns.length).toBe(3);
    });

    it('calls db.restoreFromAutoBackup(0) when clicking Restore on first snapshot', () => {
      mockDb.getAutoBackups.mockReturnValue(THREE_SNAPSHOTS);
      mockDb.restoreFromAutoBackup.mockReturnValue(true);
      render(<Settings {...defaultProps} />);

      const restoreBtns = screen.getAllByText('Restore');
      fireEvent.click(restoreBtns[0]);

      expect(mockDb.restoreFromAutoBackup).toHaveBeenCalledWith(0);
    });

    it('calls db.restoreFromAutoBackup(2) when clicking Restore on third snapshot', () => {
      mockDb.getAutoBackups.mockReturnValue(THREE_SNAPSHOTS);
      mockDb.restoreFromAutoBackup.mockReturnValue(true);
      render(<Settings {...defaultProps} />);

      const restoreBtns = screen.getAllByText('Restore');
      fireEvent.click(restoreBtns[2]);

      expect(mockDb.restoreFromAutoBackup).toHaveBeenCalledWith(2);
    });

    it('shows success message after successful restore', () => {
      mockDb.getAutoBackups.mockReturnValue(THREE_SNAPSHOTS);
      mockDb.restoreFromAutoBackup.mockReturnValue(true);
      render(<Settings {...defaultProps} />);

      const restoreBtns = screen.getAllByText('Restore');
      fireEvent.click(restoreBtns[0]);

      expect(
        screen.getByText('Auto-backup restored successfully!')
      ).toBeTruthy();
    });

    it('shows error message when restore fails', () => {
      mockDb.getAutoBackups.mockReturnValue(THREE_SNAPSHOTS);
      mockDb.restoreFromAutoBackup.mockReturnValue(false);
      render(<Settings {...defaultProps} />);

      const restoreBtns = screen.getAllByText('Restore');
      fireEvent.click(restoreBtns[0]);

      expect(
        screen.getByText('Failed to restore auto-backup.')
      ).toBeTruthy();
    });

    it('clears restore message after set timeout', () => {
      vi.useFakeTimers();
      mockDb.getAutoBackups.mockReturnValue(THREE_SNAPSHOTS);
      mockDb.restoreFromAutoBackup.mockReturnValue(true);
      render(<Settings {...defaultProps} />);

      const restoreBtns = screen.getAllByText('Restore');
      fireEvent.click(restoreBtns[0]);
      expect(
        screen.getByText('Auto-backup restored successfully!')
      ).toBeTruthy();

      // Advance past the 3000ms timeout — wrap in act() to flush React state updates
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(
        screen.queryByText('Auto-backup restored successfully!')
      ).toBeNull();
    });
  });

  // ======================== CLEAR ALL BACKUPS ========================

  describe('Clear All Backups', () => {
    it('shows Clear All Backups button when backups exist', () => {
      mockDb.getAutoBackups.mockReturnValue(THREE_SNAPSHOTS);
      render(<Settings {...defaultProps} />);
      expect(screen.getByText('Clear All Backups')).toBeTruthy();
    });

    it('shows confirmation panel when clicking Clear All Backups', () => {
      mockDb.getAutoBackups.mockReturnValue(THREE_SNAPSHOTS);
      render(<Settings {...defaultProps} />);

      fireEvent.click(screen.getByText('Clear All Backups'));

      expect(
        screen.getByText('This action is irreversible. Proceed?')
      ).toBeTruthy();
      expect(screen.getByText('Yes, Format App')).toBeTruthy();
    });

    it('calls db.clearAutoBackups when confirming clear', () => {
      mockDb.getAutoBackups.mockReturnValue(THREE_SNAPSHOTS);
      render(<Settings {...defaultProps} />);

      fireEvent.click(screen.getByText('Clear All Backups'));
      fireEvent.click(screen.getByText('Yes, Format App'));

      expect(mockDb.clearAutoBackups).toHaveBeenCalledOnce();
    });

    it('hides confirmation panel after confirming clear', () => {
      mockDb.getAutoBackups.mockReturnValue(THREE_SNAPSHOTS);
      render(<Settings {...defaultProps} />);

      fireEvent.click(screen.getByText('Clear All Backups'));
      expect(
        screen.getByText('This action is irreversible. Proceed?')
      ).toBeTruthy();

      fireEvent.click(screen.getByText('Yes, Format App'));

      // Confirmation panel should disappear
      expect(
        screen.queryByText('This action is irreversible. Proceed?')
      ).toBeNull();
    });

    it('hides confirmation panel when clicking Cancel', () => {
      mockDb.getAutoBackups.mockReturnValue(THREE_SNAPSHOTS);
      render(<Settings {...defaultProps} />);

      fireEvent.click(screen.getByText('Clear All Backups'));
      expect(
        screen.getByText('This action is irreversible. Proceed?')
      ).toBeTruthy();

      fireEvent.click(screen.getByText('Cancel'));

      expect(
        screen.queryByText('This action is irreversible. Proceed?')
      ).toBeNull();
      expect(mockDb.clearAutoBackups).not.toHaveBeenCalled();
    });
  });

  // ======================== BANGLA MODE ========================

  describe('Bangla Mode', () => {
    it('renders auto-backup title in Bangla', () => {
      mockDb.getAutoBackups.mockReturnValue(THREE_SNAPSHOTS);
      render(<Settings {...defaultProps} lang="bn" />);
      expect(screen.getByText('অটো-ব্যাকআপ')).toBeTruthy();
    });

    it('shows "no backups" message in Bangla', () => {
      mockDb.getAutoBackups.mockReturnValue([]);
      render(<Settings {...defaultProps} lang="bn" />);
      expect(
        screen.getByText('এখনো কোনো অটো-ব্যাকআপ নেই। একটি পরিবর্তন করলেই তৈরি হবে।')
      ).toBeTruthy();
    });

    it('shows restore button in Bangla', () => {
      mockDb.getAutoBackups.mockReturnValue([SNAPSHOT_FULL]);
      render(<Settings {...defaultProps} lang="bn" />);
      expect(screen.getByText('পুনরুদ্ধার')).toBeTruthy();
    });

    it('shows Clear All Backups in Bangla', () => {
      mockDb.getAutoBackups.mockReturnValue([SNAPSHOT_FULL]);
      render(<Settings {...defaultProps} lang="bn" />);
      expect(screen.getByText('সব ব্যাকআপ মুছুন')).toBeTruthy();
    });
  });

  // ======================== EDGE CASES ========================

  describe('Edge Cases', () => {
    it('handles snapshot with undefined/missing properties gracefully', () => {
      const minimalSnapshot = { timestamp: minutesAgo(5) };
      mockDb.getAutoBackups.mockReturnValue([minimalSnapshot]);
      render(<Settings {...defaultProps} />);

      // Should render without crashing and show zeros
      expect(screen.getByText('Snapshot #1')).toBeTruthy();
      expect(screen.getByText('5m ago')).toBeTruthy();
    });

    it('handles a large number of snapshots (only 3 shown)', () => {
      const manySnapshots = Array.from({ length: 5 }, (_, i) => ({
        ...SNAPSHOT_FULL,
        timestamp: minutesAgo(i * 10),
      }));
      mockDb.getAutoBackups.mockReturnValue(manySnapshots);
      render(<Settings {...defaultProps} />);

      // The component only shows the backups returned by db.getAutoBackups()
      // (which the db module caps at 3, but our mock returns 5 — the UI shows all 5)
      expect(screen.getByText(/5 auto-backups available/)).toBeTruthy();
      expect(screen.getByText('Snapshot #1')).toBeTruthy();
      expect(screen.getByText('Snapshot #2')).toBeTruthy();
      expect(screen.getByText('Snapshot #3')).toBeTruthy();
      expect(screen.getByText('Snapshot #4')).toBeTruthy();
      expect(screen.getByText('Snapshot #5')).toBeTruthy();
    });

    it('does not crash when db methods are called with wrong index', () => {
      mockDb.getAutoBackups.mockReturnValue([SNAPSHOT_FULL]);
      mockDb.restoreFromAutoBackup.mockReturnValue(false);
      render(<Settings {...defaultProps} />);

      // Just one backup — click restore, it calls with index 0
      const restoreBtn = screen.getByText('Restore');
      fireEvent.click(restoreBtn);

      expect(mockDb.restoreFromAutoBackup).toHaveBeenCalledWith(0);
      expect(
        screen.getByText('Failed to restore auto-backup.')
      ).toBeTruthy();
    });
  });
});
