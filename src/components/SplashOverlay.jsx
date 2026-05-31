import { useState, useEffect } from 'react';

/**
 * SplashOverlay — shown on initial app mount, matching the Android native
 * windowBackground exactly, then fades out smoothly to reveal the app content.
 *
 * Timing:
 *   - Mounts: fully opaque, matching the Android windowBackground drawable
 *   - After ~200ms (React has rendered first frame): starts CSS opacity transition
 *   - After ~600ms (fade completes): sets pointer-events: none / removes from flow
 */
export default function SplashOverlay() {
  const [phase, setPhase] = useState('visible'); // 'visible' | 'fading' | 'hidden'

  useEffect(() => {
    // Small delay to ensure React's first paint has settled on screen,
    // then trigger the fade-out
    const fadeTimer = setTimeout(() => setPhase('fading'), 200);

    // After the fade animation completes (400ms), mark as hidden
    const hideTimer = setTimeout(() => setPhase('hidden'), 600);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (phase === 'hidden') return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        backgroundColor: '#E5EAF2',
        opacity: phase === 'fading' ? 0 : 1,
        transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        willChange: 'opacity',
        pointerEvents: phase === 'fading' ? 'none' : 'auto',
      }}
    >
      {/* Logo image */}
      <img
        src="/pocket-khata-logo.png"
        alt=""
        style={{
          width: '96px',
          height: '96px',
          objectFit: 'contain',
          filter: 'drop-shadow(0 4px 12px rgba(56, 103, 214, 0.3))',
        }}
      />

      {/* App name */}
      <span
        style={{
          fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif",
          fontSize: '22px',
          fontWeight: '700',
          color: '#2c3e50',
          letterSpacing: '0.3px',
        }}
      >
        Pocket Khata
      </span>

      {/* Subtle loading dots */}
      <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#3867d6',
              opacity: 0.5,
              animation: `splashDotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Inline keyframes for the dot pulse animation */}
      <style>{`
        @keyframes splashDotPulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.85); }
          40% { opacity: 0.9; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
