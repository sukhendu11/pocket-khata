// src/tests/SplashOverlay.test.jsx — Tests for SplashOverlay component
import { render, screen, cleanup, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import SplashOverlay from '../components/SplashOverlay';

describe('SplashOverlay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  // ===== INITIAL RENDER =====

  it('renders in visible phase on mount', () => {
    render(<SplashOverlay />);
    expect(screen.getByText('Pocket Khata')).toBeTruthy();
    const logo = document.querySelector('img');
    expect(logo).toBeTruthy();
    expect(logo?.getAttribute('src')).toBe('/pocket-khata-logo.png');
    expect(logo?.getAttribute('alt')).toBe('');
  });

  it('shows three loading dots on mount', () => {
    const { container } = render(<SplashOverlay />);
    const dots = container.querySelectorAll('div[style*="border-radius: 50%"]');
    expect(dots.length).toBe(3);
  });

  it('has full-screen overlay with absolute positioning', () => {
    const { container } = render(<SplashOverlay />);
    const overlay = container.firstChild;
    expect(overlay).toBeTruthy();
    expect(overlay.style.position).toBe('absolute');
    expect(overlay.style.inset).toBe('0');
    expect(overlay.style.zIndex).toBe('9999');
  });

  it('has the correct background color matching Android splash', () => {
    const { container } = render(<SplashOverlay />);
    const overlay = container.firstChild;
    // jsdom converts #E5EAF2 to rgb format
    expect(overlay.style.backgroundColor).toBe('rgb(229, 234, 242)');
  });

  // ===== PHASE TRANSITIONS =====

  it('starts fully opaque', () => {
    const { container } = render(<SplashOverlay />);
    const overlay = container.firstChild;
    expect(overlay.style.opacity).toBe('1');
  });

  it('transitions to fading phase after 200ms', () => {
    const { container } = render(<SplashOverlay />);

    act(() => {
      vi.advanceTimersByTime(200);
    });

    // After 200ms, the phase transitions to 'fading' -> opacity becomes 0
    const overlay = container.firstChild;
    expect(overlay.style.opacity).toBe('0');
    expect(overlay.style.pointerEvents).toBe('none');
  });

  it('applies CSS transition for smooth fade-out', () => {
    const { container } = render(<SplashOverlay />);
    const overlay = container.firstChild;
    expect(overlay.style.transition).toContain('opacity 0.4s');
    expect(overlay.style.willChange).toBe('opacity');
  });

  it('hides the overlay after 600ms', () => {
    const { container } = render(<SplashOverlay />);

    act(() => {
      vi.advanceTimersByTime(600);
    });

    // After 600ms, phase='hidden', component returns null
    expect(container.childNodes.length).toBe(0);
  });

  it('transitions through all three phases: visible -> fading -> hidden', () => {
    const { container } = render(<SplashOverlay />);

    // Phase 1: visible (0ms)
    expect(container.firstChild.style.opacity).toBe('1');

    // Phase 2: fading (200ms)
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(container.firstChild.style.opacity).toBe('0');

    // Phase 3: hidden (600ms)
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(container.childNodes.length).toBe(0);
  });

  // ===== TIMING EDGE CASES =====

  it('cleanly removes timers on unmount', () => {
    const { unmount } = render(<SplashOverlay />);
    unmount();
    // Should not throw after unmount — timers are cleaned up
    expect(() => {
      vi.advanceTimersByTime(1000);
    }).not.toThrow();
  });

  it('does not cause React state update on unmounted component', () => {
    const { unmount } = render(<SplashOverlay />);
    unmount();
    // After unmount, the cleanup from useEffect prevents setPhase on unmounted component
    expect(() => {
      vi.advanceTimersByTime(1000);
    }).not.toThrow();
  });

  // ===== VISUAL ELEMENTS =====

  it('renders the app name with correct styling', () => {
    render(<SplashOverlay />);
    const nameEl = screen.getByText('Pocket Khata');
    expect(nameEl.tagName).toBe('SPAN');
    expect(nameEl.style.fontSize).toBe('22px');
    expect(nameEl.style.fontWeight).toBe('700');
    // jsdom converts hex to rgb
    expect(nameEl.style.color).toBe('rgb(44, 62, 80)');
  });

  it('renders the logo image with correct dimensions', () => {
    render(<SplashOverlay />);
    const logo = document.querySelector('img');
    expect(logo?.style.width).toBe('96px');
    expect(logo?.style.height).toBe('96px');
    expect(logo?.style.objectFit).toBe('contain');
  });

  it('has a drop shadow on the logo', () => {
    render(<SplashOverlay />);
    const logo = document.querySelector('img');
    expect(logo?.style.filter).toContain('drop-shadow');
  });

  it('renders loading dots with animation', () => {
    const { container } = render(<SplashOverlay />);
    const dots = container.querySelectorAll('div[style*="animation:"]');
    expect(dots.length).toBe(3);
  });

  it('loading dots have staggered animation delays', () => {
    const { container } = render(<SplashOverlay />);
    const dots = container.querySelectorAll('div[style*="splashDotPulse"]');
    expect(dots.length).toBe(3);
    const delays = Array.from(dots).map(d => d.style.animation);
    expect(delays[0]).not.toBe(delays[1]);
    expect(delays[1]).not.toBe(delays[2]);
  });

  it('includes inline keyframe style for dot animation', () => {
    const { container } = render(<SplashOverlay />);
    const styleTag = container.querySelector('style');
    expect(styleTag).toBeTruthy();
    expect(styleTag?.textContent).toContain('splashDotPulse');
    expect(styleTag?.textContent).toContain('@keyframes');
  });

  it('loading dots have correct size and color', () => {
    const { container } = render(<SplashOverlay />);
    const dots = container.querySelectorAll('div[style*="border-radius: 50%"]');
    dots.forEach(dot => {
      expect(dot.style.width).toBe('8px');
      expect(dot.style.height).toBe('8px');
      // jsdom converts hex to rgb
      expect(dot.style.backgroundColor).toBe('rgb(56, 103, 214)');
    });
  });

  // ===== ACCESSIBILITY =====

  it('logo image has empty alt text (decorative)', () => {
    render(<SplashOverlay />);
    const logo = document.querySelector('img');
    expect(logo?.getAttribute('alt')).toBe('');
  });

  // ===== EDGE CASES =====

  it('has flex layout with centered content', () => {
    const { container } = render(<SplashOverlay />);
    const overlay = container.firstChild;
    expect(overlay.style.display).toBe('flex');
    expect(overlay.style.alignItems).toBe('center');
    expect(overlay.style.justifyContent).toBe('center');
    expect(overlay.style.flexDirection).toBe('column');
  });

  it('has gap between flex items', () => {
    const { container } = render(<SplashOverlay />);
    const overlay = container.firstChild;
    expect(overlay.style.gap).toBe('16px');
  });

  it('renders logo, app name, and dots in correct order', () => {
    const { container } = render(<SplashOverlay />);
    const children = Array.from(container.firstChild?.childNodes || []);
    const visibleChildren = children.filter(
      c => c.nodeType !== Node.COMMENT_NODE && c.tagName !== 'STYLE'
    );
    expect(visibleChildren[0].tagName).toBe('IMG');
    expect(visibleChildren[1].tagName).toBe('SPAN');
    expect(visibleChildren[2].tagName).toBe('DIV');
  });

  it('does not render when phase is hidden', () => {
    const { container } = render(<SplashOverlay />);

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(container.innerHTML).toBe('');
  });
});
