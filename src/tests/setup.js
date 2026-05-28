import '@testing-library/jest-dom';

// @tanstack/react-virtual relies on getBoundingClientRect to determine
// the scroll container's viewport height. jsdom always returns 0 for
// all element dimensions, causing the virtualizer to render zero items.
// This mock provides a sensible default viewport so virtualized
// components render correctly in tests.
const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;

Element.prototype.getBoundingClientRect = function () {
  // Use stored dimensions if available (set by tests or ResizeObserver)
  if (this._mockRect) {
    return this._mockRect;
  }
  // Heuristic: scrollable containers usually have reasonable dimensions
  const overflowY = this.style?.overflowY;
  const overflow = this.style?.overflow;
  if (overflowY === 'auto' || overflowY === 'scroll' || overflow === 'auto') {
    return { width: 400, height: 600, top: 0, left: 0, right: 400, bottom: 600, x: 0, y: 0 };
  }
  return originalGetBoundingClientRect.call(this);
};

// Polyfill ResizeObserver for virtualization libraries
class ResizeObserverMock {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = ResizeObserverMock;
}
