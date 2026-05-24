import React from 'react';
import PropTypes from 'prop-types';

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
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  static propTypes = {
    children: PropTypes.node,
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
          backgroundColor: '#f0f2f5',
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
            backgroundColor: '#f0f2f5',
            boxShadow: '8px 8px 16px #d1d3d6, -8px -8px 16px #ffffff',
          }}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#EF4444"
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
              color: '#2c3e50',
              marginBottom: '8px',
              fontFamily: 'Outfit, -apple-system, sans-serif',
            }}>Something went wrong</h2>
            <p style={{
              fontSize: '12px',
              color: '#7f8c8d',
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
                backgroundColor: '#f0f2f5',
                border: '2px solid #3867d6',
                color: '#3867d6',
                borderRadius: '12px',
                cursor: 'pointer',
                fontFamily: 'Outfit, -apple-system, sans-serif',
                boxShadow: '4px 4px 8px #d1d3d6, -4px -4px 8px #ffffff',
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
