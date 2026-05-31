// src/tests/useKeyboard.test.js — Unit tests for the useKeyboard hook
//
// Tests @capacitor/keyboard integration, VisualViewport fallback,
// CSS variable management, and cleanup on unmount.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ---- Mock @capacitor/keyboard (vi.hoisted for hoisting safety) ----
const {
  mockRemoveShow,
  mockRemoveHide,
  mockAddListener,
} = vi.hoisted(() => {
  const removeShow = vi.fn();
  const removeHide = vi.fn();
  const addListener = vi.fn((eventName) => {
    if (eventName === 'keyboardWillShow') {
      return { remove: removeShow };
    }
    if (eventName === 'keyboardWillHide') {
      return { remove: removeHide };
    }
    return { remove: vi.fn() };
  });
  return {
    mockRemoveShow: removeShow,
    mockRemoveHide: removeHide,
    mockAddListener: addListener,
  };
});

vi.mock('@capacitor/keyboard', () => ({
  Keyboard: {
    addListener: mockAddListener,
  },
}));

// ---- Module under test ----
import { useKeyboard } from '../hooks/useKeyboard';
import { Keyboard } from '@capacitor/keyboard';

// ==============================================================================
// Helpers
// ==============================================================================

/**
 * Set a property on window without breaking jsdom's instanceof checks.
 * Unlike vi.stubGlobal('window', ...), this preserves the real jsdom Window
 * prototype so that instanceof, document, and other internals keep working.
 */
function setWindowProperty(key, value) {
  const original = Object.getOwnPropertyDescriptor(window, key);
  Object.defineProperty(window, key, {
    value,
    writable: true,
    configurable: true,
  });
  return original;
}

// ==============================================================================
// Tests
// ==============================================================================

describe('useKeyboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-apply the implementation since vi.clearAllMocks may reset it
    mockAddListener.mockImplementation((eventName) => {
      if (eventName === 'keyboardWillShow') {
        return { remove: mockRemoveShow };
      }
      if (eventName === 'keyboardWillHide') {
        return { remove: mockRemoveHide };
      }
      return { remove: vi.fn() };
    });
    document.documentElement.style.removeProperty('--kb-height');
  });

  afterEach(() => {
    document.documentElement.style.removeProperty('--kb-height');
    vi.unstubAllGlobals();
  });

  // ---------------------------------------------------------------
  // Listener registration on mount
  // ---------------------------------------------------------------
  it('registers keyboardWillShow listener on mount', () => {
    renderHook(() => useKeyboard());
    expect(Keyboard.addListener).toHaveBeenCalledWith('keyboardWillShow', expect.any(Function));
  });

  it('registers keyboardWillHide listener on mount', () => {
    renderHook(() => useKeyboard());
    expect(Keyboard.addListener).toHaveBeenCalledWith('keyboardWillHide', expect.any(Function));
  });

  it('does not register any other event listeners', () => {
    renderHook(() => useKeyboard());
    expect(Keyboard.addListener).toHaveBeenCalledTimes(2);
  });

  // ---------------------------------------------------------------
  // CSS variable updates
  // ---------------------------------------------------------------
  it('sets --kb-height to 0 on initial mount', () => {
    renderHook(() => useKeyboard());
    expect(document.documentElement.style.getPropertyValue('--kb-height')).toBe('0px');
  });

  it('sets --kb-height to keyboard height when keyboard shows', () => {
    let showCallback;
    Keyboard.addListener.mockImplementation((eventName, cb) => {
      if (eventName === 'keyboardWillShow') showCallback = cb;
      return { remove: vi.fn() };
    });

    renderHook(() => useKeyboard());
    act(() => {
      showCallback({ keyboardHeight: 320 });
    });

    expect(document.documentElement.style.getPropertyValue('--kb-height')).toBe('320px');
  });

  it('sets --kb-height to 0 when keyboard hides', () => {
    let hideCallback;
    Keyboard.addListener.mockImplementation((eventName, cb) => {
      if (eventName === 'keyboardWillHide') hideCallback = cb;
      return { remove: vi.fn() };
    });

    renderHook(() => useKeyboard());
    act(() => {
      hideCallback();
    });

    expect(document.documentElement.style.getPropertyValue('--kb-height')).toBe('0px');
  });

  // ---------------------------------------------------------------
  // VisualViewport fallback
  // ---------------------------------------------------------------
  it('adds a resize listener on visualViewport', () => {
    const addEventListenerSpy = vi.fn();
    vi.stubGlobal('visualViewport', { addEventListener: addEventListenerSpy, removeEventListener: vi.fn() });

    renderHook(() => useKeyboard());

    expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('sets --kb-height to viewport diff when > 100px via VisualViewport', () => {
    let resizeCallback;
    const addEventListenerSpy = vi.fn((_, cb) => { resizeCallback = cb; });

    // Keep the real window but override specific properties
    vi.stubGlobal('visualViewport', { addEventListener: addEventListenerSpy, removeEventListener: vi.fn(), height: 580 });
    setWindowProperty('innerHeight', 800);

    renderHook(() => useKeyboard());
    act(() => { resizeCallback(); });

    expect(document.documentElement.style.getPropertyValue('--kb-height')).toBe('220px');

    // Clean up innerHeight override
    delete window.innerHeight;
  });

  it('does not set kb-height when viewport diff is 100px or less', () => {
    let resizeCallback;
    const addEventListenerSpy = vi.fn((_, cb) => { resizeCallback = cb; });

    vi.stubGlobal('visualViewport', { addEventListener: addEventListenerSpy, removeEventListener: vi.fn(), height: 750 });
    setWindowProperty('innerHeight', 800);

    renderHook(() => useKeyboard());
    act(() => { resizeCallback(); });

    expect(document.documentElement.style.getPropertyValue('--kb-height')).toBe('0px');

    delete window.innerHeight;
  });

  // ---------------------------------------------------------------
  // Cleanup on unmount
  // ---------------------------------------------------------------
  it('removes keyboardWillShow listener on unmount', () => {
    const { unmount } = renderHook(() => useKeyboard());
    unmount();
    expect(mockRemoveShow).toHaveBeenCalledTimes(1);
  });

  it('removes keyboardWillHide listener on unmount', () => {
    const { unmount } = renderHook(() => useKeyboard());
    unmount();
    expect(mockRemoveHide).toHaveBeenCalledTimes(1);
  });

  it('removes visualViewport resize listener on unmount', () => {
    const removeEventListenerSpy = vi.fn();
    vi.stubGlobal('visualViewport', {
      addEventListener: vi.fn(),
      removeEventListener: removeEventListenerSpy,
    });

    const { unmount } = renderHook(() => useKeyboard());
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('removes --kb-height CSS variable on unmount', () => {
    const removePropertySpy = vi.spyOn(document.documentElement.style, 'removeProperty');
    const { unmount } = renderHook(() => useKeyboard());
    unmount();
    expect(removePropertySpy).toHaveBeenCalledWith('--kb-height');
    removePropertySpy.mockRestore();
  });

  it('does not update CSS variable after unmount (cleanedUp flag)', () => {
    let showCallback;
    Keyboard.addListener.mockImplementation((eventName, cb) => {
      if (eventName === 'keyboardWillShow') showCallback = cb;
      return { remove: vi.fn() };
    });

    const { unmount } = renderHook(() => useKeyboard());
    unmount();

    // Try to fire the callback after unmount
    act(() => {
      showCallback({ keyboardHeight: 400 });
    });

    // The cleanedUp flag should prevent the update
    expect(document.documentElement.style.getPropertyValue('--kb-height')).toBe('');
  });

  it('ignores VisualViewport resize after unmount', () => {
    let resizeCallback;
    const addEventListenerSpy = vi.fn((_, cb) => { resizeCallback = cb; });

    vi.stubGlobal('visualViewport', {
      addEventListener: addEventListenerSpy,
      removeEventListener: vi.fn(),
      height: 500,
    });
    setWindowProperty('innerHeight', 800);

    const { unmount } = renderHook(() => useKeyboard());
    unmount();

    act(() => { resizeCallback(); });

    // Should not set since cleanedUp is true
    expect(document.documentElement.style.getPropertyValue('--kb-height')).toBe('');

    delete window.innerHeight;
  });
});
