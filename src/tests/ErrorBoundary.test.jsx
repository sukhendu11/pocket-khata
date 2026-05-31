// src/tests/ErrorBoundary.test.jsx — Tests for ErrorBoundary component
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import ErrorBoundary from '../components/ErrorBoundary';

// Mock analytics
vi.mock('../lib/analytics', () => ({
  trackError: vi.fn(),
}));

import { trackError } from '../lib/analytics';

// A component that throws on render
function BuggyComponent({ shouldThrow = false, message = 'Test error' }) {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <div>Working fine</div>;
}

// A component that throws in useEffect
function AsyncBuggyComponent({ shouldThrow = false }) {
  const [ok, setOk] = React.useState(false);
  React.useEffect(() => {
    if (shouldThrow) {
      throw new Error('Async render error');
    }
    setOk(true);
  }, [shouldThrow]);
  return <div>{ok ? 'Rendered' : 'Loading...'}</div>;
}

describe('ErrorBoundary', () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress React error logging in test output
    console.error = vi.fn();
  });

  afterEach(() => {
    cleanup();
    console.error = originalConsoleError;
  });

  // ===== RENDERING =====

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Hello World</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Hello World')).toBeTruthy();
  });

  it('renders multiple children when there is no error', () => {
    render(
      <ErrorBoundary>
        <span>First</span>
        <span>Second</span>
      </ErrorBoundary>
    );
    expect(screen.getByText('First')).toBeTruthy();
    expect(screen.getByText('Second')).toBeTruthy();
  });

  it('renders nested ErrorBoundary correctly', () => {
    render(
      <ErrorBoundary>
        <ErrorBoundary>
          <div>Nested content</div>
        </ErrorBoundary>
      </ErrorBoundary>
    );
    expect(screen.getByText('Nested content')).toBeTruthy();
  });

  // ===== ERROR CATCHING =====

  it('catches a render error and shows fallback UI', () => {
    render(
      <ErrorBoundary componentName="TestComponent">
        <BuggyComponent shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText(/The app encountered an unexpected error/)).toBeTruthy();
    expect(screen.getByText('Try Again')).toBeTruthy();
  });

  it('shows the error icon (alert circle SVG) when an error occurs', () => {
    const { container } = render(
      <ErrorBoundary>
        <BuggyComponent shouldThrow />
      </ErrorBoundary>
    );
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    const circles = svg?.querySelectorAll('circle');
    expect(circles?.length).toBeGreaterThanOrEqual(1);
  });

  it('does not show fallback when there is no error', () => {
    render(
      <ErrorBoundary>
        <BuggyComponent />
      </ErrorBoundary>
    );
    expect(screen.queryByText('Something went wrong')).toBeNull();
    expect(screen.queryByText('Try Again')).toBeNull();
  });

  // ===== RETRY MECHANISM =====

  it('allows retry after an error', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <BuggyComponent shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeTruthy();

    rerender(
      <ErrorBoundary>
        <BuggyComponent />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('Try Again'));
    expect(screen.getByText('Working fine')).toBeTruthy();
    expect(screen.queryByText('Something went wrong')).toBeNull();
  });

  it('resets error state on retry', () => {
    const { container, rerender } = render(
      <ErrorBoundary>
        <BuggyComponent shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeTruthy();

    rerender(
      <ErrorBoundary>
        <BuggyComponent />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('Try Again'));
    expect(screen.queryByText('Something went wrong')).toBeNull();
    expect(container.textContent).toContain('Working fine');
  });

  it('recovers from error and can catch a new error on retry', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <BuggyComponent shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeTruthy();

    rerender(
      <ErrorBoundary>
        <div>Recovered</div>
      </ErrorBoundary>
    );
    fireEvent.click(screen.getByText('Try Again'));
    expect(screen.getByText('Recovered')).toBeTruthy();

    rerender(
      <ErrorBoundary>
        <BuggyComponent shouldThrow message="Second error" />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeTruthy();
  });

  // ===== ERROR TRACKING =====

  it('calls trackError when catching an error', () => {
    render(
      <ErrorBoundary componentName="TestWidget">
        <BuggyComponent shouldThrow />
      </ErrorBoundary>
    );
    expect(trackError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ component: 'TestWidget' })
    );
  });

  it('calls trackError with "ErrorBoundary" as default component name', () => {
    render(
      <ErrorBoundary>
        <BuggyComponent shouldThrow />
      </ErrorBoundary>
    );
    expect(trackError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ component: 'ErrorBoundary' })
    );
  });

  it('calls trackError with the actual error object', () => {
    render(
      <ErrorBoundary>
        <BuggyComponent shouldThrow message="Specific error message" />
      </ErrorBoundary>
    );
    expect(trackError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Specific error message' }),
      expect.any(Object)
    );
  });

  it('logs the error to console.error', () => {
    render(
      <ErrorBoundary>
        <BuggyComponent shouldThrow />
      </ErrorBoundary>
    );
    expect(console.error).toHaveBeenCalled();
  });

  // ===== THROW IN USEFFECT =====

  it('catches errors thrown in useEffect', () => {
    render(
      <ErrorBoundary>
        <AsyncBuggyComponent shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeTruthy();
  });

  // ===== DIFFERENT ERROR MESSAGES =====

  it('handles empty error message', () => {
    render(
      <ErrorBoundary>
        <BuggyComponent shouldThrow message="" />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText('Try Again')).toBeTruthy();
  });

  // ===== FALLBACK UI STYLING =====

  it('fallback UI has the correct structure', () => {
    const { container } = render(
      <ErrorBoundary>
        <BuggyComponent shouldThrow />
      </ErrorBoundary>
    );
    const outerDiv = container.querySelector('div');
    expect(outerDiv).toBeTruthy();
    expect(outerDiv?.style.display).toBe('flex');
  });

  it('fallback UI does not crash when componentName is not provided', () => {
    render(
      <ErrorBoundary>
        <BuggyComponent shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeTruthy();
  });

  // ===== EDGE CASES =====

  it('handles null children', () => {
    render(
      <ErrorBoundary>
        {null}
      </ErrorBoundary>
    );
    expect(screen.queryByText('Something went wrong')).toBeNull();
  });

  it('handles undefined children', () => {
    render(
      <ErrorBoundary>
        {undefined}
      </ErrorBoundary>
    );
    expect(screen.queryByText('Something went wrong')).toBeNull();
  });

  it('handles array of children with mixed content', () => {
    render(
      <ErrorBoundary>
        {[
          <div key="a">Item A</div>,
          null,
          <span key="b">Item B</span>,
          undefined,
        ]}
      </ErrorBoundary>
    );
    expect(screen.getByText('Item A')).toBeTruthy();
    expect(screen.getByText('Item B')).toBeTruthy();
  });

  it('handles nested error in child ErrorBoundary', () => {
    render(
      <ErrorBoundary>
        <div>
          <span>Before buggy component</span>
          <BuggyComponent shouldThrow />
        </div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeTruthy();
  });

  it('renders Try Again button with correct styling', () => {
    const { container } = render(
      <ErrorBoundary>
        <BuggyComponent shouldThrow />
      </ErrorBoundary>
    );
    const button = screen.getByText('Try Again');
    expect(button.tagName).toBe('BUTTON');
    expect(button.style.cursor).toBe('pointer');
    expect(button.style.border).toContain('var(--accent-color)');
  });

  it('does not modify children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">Original content</div>
      </ErrorBoundary>
    );
    const child = screen.getByTestId('child');
    expect(child.textContent).toBe('Original content');
    expect(child.tagName).toBe('DIV');
  });
});
