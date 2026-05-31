import { useEffect } from 'react';
import { Keyboard } from '@capacitor/keyboard';

/**
 * Hook that listens for keyboard show/hide events (via @capacitor/keyboard)
 * and sets `--kb-height` CSS variable on `document.documentElement`.
 *
 * When the keyboard opens, `--kb-height` is set to the keyboard height in pixels.
 * When it closes, `--kb-height` is reset to `0px`.
 *
 * CSS can then use `var(--kb-height)` to adjust bottom padding on drawers,
 * ensuring all form content stays above the keyboard.
 */
export function useKeyboard() {
  useEffect(() => {
    let cleanedUp = false;

    const setKbHeight = (height) => {
      if (cleanedUp) return;
      document.documentElement.style.setProperty('--kb-height', `${height}px`);
    };

    const showListener = Keyboard.addListener('keyboardWillShow', (info) => {
      setKbHeight(info.keyboardHeight);
    });

    const hideListener = Keyboard.addListener('keyboardWillHide', () => {
      setKbHeight(0);
    });

    // Fallback: use VisualViewport API on resize (works if keyboard fires resize)
    const onVisualViewportResize = () => {
      if (!window.visualViewport) return;
      const viewportDiff = window.innerHeight - window.visualViewport.height;
      if (viewportDiff > 100) {
        // Keyboard likely open
        setKbHeight(viewportDiff);
      } else {
        setKbHeight(0);
      }
    };

    window.visualViewport?.addEventListener('resize', onVisualViewportResize);

    // Set initial state
    setKbHeight(0);

    return () => {
      cleanedUp = true;
      showListener?.remove();
      hideListener?.remove();
      window.visualViewport?.removeEventListener('resize', onVisualViewportResize);
      document.documentElement.style.removeProperty('--kb-height');
    };
  }, []);
}
