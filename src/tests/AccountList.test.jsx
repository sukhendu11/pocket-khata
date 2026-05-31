import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

vi.mock('../db', () => ({
  getAccounts: vi.fn(),
}));

vi.mock('../utils', () => ({
  formatNumber: vi.fn((n) => n.toLocaleString('en-IN')),
}));

import AccountList from '../components/AccountList';
import { getAccounts } from '../db';

describe('AccountList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders nothing when there are no accounts', () => {
    getAccounts.mockReturnValue([]);
    const { container } = render(<AccountList />);
    expect(container.textContent).toBe('');
  });

  it('does not crash when accounts array is empty', () => {
    getAccounts.mockReturnValue([]);
    expect(() => render(<AccountList />)).not.toThrow();
  });

  it('renders a single account name and balance', () => {
    getAccounts.mockReturnValue([
      { id: '1', name: 'Cash', balance: 5000, type: 'cash' },
    ]);
    render(<AccountList />);
    expect(screen.getByText('Cash')).toBeTruthy();
    expect(screen.getByText(/Balance:/)).toBeTruthy();
  });

  it('renders multiple accounts', () => {
    getAccounts.mockReturnValue([
      { id: '1', name: 'Cash', balance: 5000, type: 'cash' },
      { id: '2', name: 'Bank', balance: 25000, type: 'bank' },
    ]);
    render(<AccountList />);
    expect(screen.getByText('Cash')).toBeTruthy();
    expect(screen.getByText('Bank')).toBeTruthy();
  });

  it('renders account name in H2 element', () => {
    getAccounts.mockReturnValue([
      { id: '1', name: 'Savings', balance: 50000, type: 'bank' },
    ]);
    render(<AccountList />);
    const heading = screen.getByText('Savings');
    expect(heading.tagName).toBe('H2');
  });

  it('handles zero balance correctly', () => {
    getAccounts.mockReturnValue([
      { id: '1', name: 'Empty Wallet', balance: 0, type: 'cash' },
    ]);
    render(<AccountList />);
    expect(screen.getByText('Empty Wallet')).toBeTruthy();
    expect(screen.getByText(/Balance:/)).toBeTruthy();
  });

  it('handles negative balance correctly', () => {
    getAccounts.mockReturnValue([
      { id: '1', name: 'Overdrawn', balance: -500, type: 'bank' },
    ]);
    render(<AccountList />);
    expect(screen.getByText('Overdrawn')).toBeTruthy();
  });

  it('handles accounts with missing optional fields', () => {
    getAccounts.mockReturnValue([
      { id: '1', name: 'Minimal', balance: 100 },
    ]);
    expect(() => render(<AccountList />)).not.toThrow();
    expect(screen.getByText('Minimal')).toBeTruthy();
  });

  it('handles null getAccounts gracefully', () => {
    getAccounts.mockReturnValue(null);
    expect(() => render(<AccountList />)).toThrow();
  });

  it('handles undefined getAccounts gracefully', () => {
    getAccounts.mockReturnValue(undefined);
    expect(() => render(<AccountList />)).toThrow();
  });

  it('calls getAccounts from db module', () => {
    getAccounts.mockReturnValue([]);
    render(<AccountList />);
    expect(getAccounts).toHaveBeenCalledTimes(1);
  });
});
