import { useState } from 'react';
import PropTypes from 'prop-types';
import { t } from '../i18n';
import { setConsent } from '../lib/analytics';

/**
 * First-time consent popup for analytics tracking.
 * Shown once on initial app load, then never again (unless consent is reset).
 *
 * The popup clearly explains what data is / isn't collected:
 * - Collects: anonymous screen views, user actions (clicks/navigation),
 *   error counts, device info (screen size, language, timezone)
 * - NEVER collects: personal data, financial data, transaction details,
 *   account balances, passwords, or any personally identifiable info
 */
export default function ConsentPopup({ lang, onConsent }) {
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  const handleAllow = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      setConsent('granted');
      onConsent('granted');
    }, 250);
  };

  const handleDecline = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      setConsent('denied');
      onConsent('denied');
    }, 250);
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        backgroundColor: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        animation: isAnimatingOut ? 'fadeOut 0.25s ease forwards' : 'fadeIn 0.3s ease forwards',
      }}
    >
      <div
        className="neo-raised"
        style={{
          width: '100%',
          maxWidth: '340px',
          padding: '24px 20px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px',
          animation: isAnimatingOut
            ? 'consentScaleOut 0.25s ease forwards'
            : 'consentScaleIn 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        }}
      >
        {/* Shield icon */}
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <polyline points="9 12 11 14 15 10" />
          </svg>
        </div>

        {/* Title */}
        <h3
          style={{
            fontSize: '16px',
            fontWeight: '700',
            color: 'var(--text-primary)',
            textAlign: 'center',
            margin: 0,
          }}
        >
          {t('analytics.consentTitle', lang)}
        </h3>

        {/* Description */}
        <p
          style={{
            fontSize: '11px',
            color: 'var(--text-secondary)',
            lineHeight: '1.6',
            textAlign: 'center',
            margin: 0,
          }}
        >
          {t('analytics.consentDesc', lang)}
        </p>

        {/* Data points list */}
        <div
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: '10px',
            backgroundColor: 'color-mix(in srgb, var(--accent-color) 8%, transparent)',
            fontSize: '10px',
            color: 'var(--text-secondary)',
            lineHeight: '1.7',
          }}
        >
          <div style={{ fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px', fontSize: '10px' }}>
            {t('analytics.consentCollects', lang)}
          </div>
          <div>✓ {t('analytics.consentScreenViews', lang)}</div>
          <div>✓ {t('analytics.consentActions', lang)}</div>
          <div>✓ {t('analytics.consentErrors', lang)}</div>
          <div>✓ {t('analytics.consentDevice', lang)}</div>
          <div style={{ marginTop: '6px', fontWeight: '700', color: 'var(--color-expense)', fontSize: '10px' }}>
            ✗ {t('analytics.consentNever', lang)}
          </div>
          <div>✗ {t('analytics.consentNoPersonal', lang)}</div>
          <div>✗ {t('analytics.consentNoFinancial', lang)}</div>
        </div>

        {/* Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            width: '100%',
            marginTop: '4px',
          }}
        >
          <button
            className="neo-btn"
            onClick={handleDecline}
            style={{
              flex: 1,
              height: '40px',
              fontSize: '13px',
              fontWeight: '600',
              color: 'var(--text-secondary)',
              border: '1px solid var(--text-secondary)',
              borderRadius: '12px',
            }}
          >
            {t('analytics.consentDecline', lang)}
          </button>
          <button
            className="neo-btn neo-btn-primary"
            onClick={handleAllow}
            style={{
              flex: 1,
              height: '40px',
              fontSize: '13px',
              fontWeight: '700',
              borderRadius: '12px',
            }}
          >
            {t('analytics.consentAllow', lang)}
          </button>
        </div>

        {/* Privacy note */}
        <p
          style={{
            fontSize: '8px',
            color: 'var(--text-secondary)',
            opacity: 0.6,
            textAlign: 'center',
            margin: 0,
          }}
        >
          {t('analytics.consentFootnote', lang)}
        </p>
      </div>
    </div>
  );
}

ConsentPopup.propTypes = {
  lang: PropTypes.string,
  onConsent: PropTypes.func,
};
