import React from 'react';
import PropTypes from 'prop-types';
import { trackError } from '../lib/analytics';

/**
 * ErrorBoundary — catches render errors and shows a safe fallback UI
 * instead of crashing to a blank/black screen.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    // Track the error via analytics (consent-gated internally)
    trackError(error, { component: this.props.componentName || 'ErrorBoundary' });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  static propTypes = {
    children: PropTypes.node,
    componentName: PropTypes.string,
  };

  render() {
    if (this.state.hasError) {
      // Render safe fallback UI
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '40px 20px',
          backgroundColor: 'var(--bg-color)',
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '32px 24px',
            textAlign: 'center',
            maxWidth: '300px',
            width: '100%',
            borderRadius: '20px',
            backgroundColor: 'var(--bg-color)',
            boxShadow: 'var(--neomorphic-raised)',
          }}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-expense)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginBottom: '16px' }}
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '700',
              color: 'var(--text-primary)',
              marginBottom: '8px',
              fontFamily: 'Outfit, -apple-system, sans-serif',
            }}>Something went wrong</h2>
            <p style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              fontWeight: '500',
              lineHeight: '1.4',
              marginBottom: '20px',
              fontFamily: 'Outfit, -apple-system, sans-serif',
            }}>
              The app encountered an unexpected error. Please try again.
            </p>
            <button
              onClick={this.handleRetry}
              style={{
                padding: '10px 24px',
                fontSize: '13px',
                fontWeight: '700',
                backgroundColor: 'var(--bg-color)',
                border: '2px solid var(--accent-color)',
                color: 'var(--accent-color)',
                borderRadius: '12px',
                cursor: 'pointer',
                fontFamily: 'Outfit, -apple-system, sans-serif',
                boxShadow: 'var(--neomorphic-raised-sm)',
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
