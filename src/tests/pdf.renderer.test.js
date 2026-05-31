// src/tests/pdf.renderer.test.js — Unit tests for the PDF renderer layer
//
// Tests renderHTMLToPDF by mocking html2canvas, jsPDF, and saveBlob.
// Verifies DOM setup, scale fallback, canvas slicing, and cleanup.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---- Mock dependencies (vi.hoisted for hoisting safety) ----
const { mockJsPDFFn, mockAddPage, mockAddImage, mockOutput } = vi.hoisted(() => {
  const addPage = vi.fn();
  const addImage = vi.fn();
  const output = vi.fn(() => new Blob(['fake-pdf'], { type: 'application/pdf' }));
  return {
    mockJsPDFFn: vi.fn(() => ({
      internal: {
        pageSize: {
          getWidth: () => 210,
          getHeight: () => 297,
        },
      },
      addPage,
      addImage,
      output,
    })),
    mockAddPage: addPage,
    mockAddImage: addImage,
    mockOutput: output,
  };
});
vi.mock('jspdf', () => ({
  jsPDF: mockJsPDFFn,
}));

const { mockHtml2canvas } = vi.hoisted(() => ({
  mockHtml2canvas: vi.fn(),
}));
vi.mock('html2canvas', () => ({
  default: mockHtml2canvas,
}));

const { mockSaveBlob } = vi.hoisted(() => ({
  mockSaveBlob: vi.fn(),
}));
vi.mock('../lib/download', () => ({
  saveBlob: mockSaveBlob,
}));

// ---- Module under test ----
import { renderHTMLToPDF } from '../lib/pdf/renderer';

// ==============================================================================
// Helpers
// ==============================================================================

/**
 * Create a mock canvas of the given dimensions.
 * In jsdom, getContext('2d') returns null, so we mock it globally.
 */
function createMockCanvas(width = 750, height = 1000) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * Count hidden containers that were appended and not removed.
 */
function countHiddenContainers() {
  const divs = document.body.querySelectorAll('div');
  let count = 0;
  divs.forEach(div => {
    if (div.style.position === 'fixed' && div.style.left === '-9999px') {
      count++;
    }
  });
  return count;
}

// ==============================================================================
// Tests
// ==============================================================================

describe('renderHTMLToPDF', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // jsdom does not implement canvas rendering, so getContext('2d') and
    // toDataURL are stubs. Mock them so the slicing logic in renderer.js works.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    );

    // Default mock: html2canvas succeeds at 2x
    const mockCanvas = createMockCanvas(750, 1400);
    mockHtml2canvas.mockResolvedValue(mockCanvas);
    mockSaveBlob.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Clean up any leftover hidden containers
    const remnants = document.querySelectorAll('div[style*="position: fixed"][style*="-9999px"]');
    remnants.forEach(el => {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
  });

  // ---------------------------------------------------------------
  // DOM setup (verified via html2canvas element reference, since
  // the container is removed in the finally block)
  // ---------------------------------------------------------------
  it('creates a hidden DOM container with the HTML content', async () => {
    await renderHTMLToPDF('<p>Hello</p>', 'test');
    const containerEl = mockHtml2canvas.mock.calls[0][0];
    expect(containerEl).toBeInstanceOf(HTMLElement);
    expect(containerEl.innerHTML).toContain('<p>Hello</p>');
    expect(containerEl.style.position).toBe('fixed');
    expect(containerEl.style.width).toBe('750px');
    expect(containerEl.style.backgroundColor).toBe('rgb(255, 255, 255)'); // jsdom normalizes hex to rgb
  });

  it('removes the hidden container after completion (finally block)', async () => {
    expect(countHiddenContainers()).toBe(0);
    await renderHTMLToPDF('<p>Test</p>', 'test');
    expect(countHiddenContainers()).toBe(0);
  });

  it('removes the hidden container even when html2canvas fails', async () => {
    mockHtml2canvas.mockRejectedValue(new Error('Canvas error'));
    await expect(renderHTMLToPDF('<p>Test</p>', 'test')).rejects.toThrow();
    expect(countHiddenContainers()).toBe(0);
  });

  it('removes the hidden container even when saveBlob fails', async () => {
    mockSaveBlob.mockRejectedValue(new Error('Save error'));
    await expect(renderHTMLToPDF('<p>Test</p>', 'test')).rejects.toThrow('Save error');
    expect(countHiddenContainers()).toBe(0);
  });

  // ---------------------------------------------------------------
  // html2canvas scale fallback
  // ---------------------------------------------------------------
  it('calls html2canvas with scale 2x first', async () => {
    const mockCanvas = createMockCanvas(750, 100);
    mockHtml2canvas.mockResolvedValue(mockCanvas);
    await renderHTMLToPDF('<p>Test</p>', 'test');
    expect(mockHtml2canvas).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ scale: 2 }),
    );
  });

  it('falls back to 1.5x when 2x fails', async () => {
    const mockCanvas = createMockCanvas(750, 100);
    mockHtml2canvas
      .mockRejectedValueOnce(new Error('2x failed'))
      .mockResolvedValueOnce(mockCanvas);
    await renderHTMLToPDF('<p>Test</p>', 'test');
    expect(mockHtml2canvas).toHaveBeenCalledTimes(2);
    expect(mockHtml2canvas.mock.calls[0][1]).toEqual(expect.objectContaining({ scale: 2 }));
    expect(mockHtml2canvas.mock.calls[1][1]).toEqual(expect.objectContaining({ scale: 1.5 }));
  });

  it('falls back to 1x when 2x and 1.5x fail', async () => {
    const mockCanvas = createMockCanvas(750, 100);
    mockHtml2canvas
      .mockRejectedValueOnce(new Error('2x failed'))
      .mockRejectedValueOnce(new Error('1.5x failed'))
      .mockResolvedValueOnce(mockCanvas);
    await renderHTMLToPDF('<p>Test</p>', 'test');
    expect(mockHtml2canvas).toHaveBeenCalledTimes(3);
    expect(mockHtml2canvas.mock.calls[2][1]).toEqual(expect.objectContaining({ scale: 1 }));
  });

  it('throws when all scale levels fail', async () => {
    mockHtml2canvas.mockRejectedValue(new Error('All scales failed'));
    await expect(renderHTMLToPDF('<p>Test</p>', 'test')).rejects.toThrow();
    expect(mockHtml2canvas).toHaveBeenCalledTimes(3);
  });

  it('passes correct html2canvas options', async () => {
    const mockCanvas = createMockCanvas(750, 100);
    mockHtml2canvas.mockResolvedValue(mockCanvas);
    await renderHTMLToPDF('<p>Test</p>', 'test');
    const options = mockHtml2canvas.mock.calls[0][1];
    expect(options.useCORS).toBe(true);
    expect(options.logging).toBe(false);
    expect(options.backgroundColor).toBe('#ffffff');
    expect(options.width).toBeDefined();
    expect(options.height).toBeDefined();
  });

  // ---------------------------------------------------------------
  // jsPDF usage
  // ---------------------------------------------------------------
  it('creates a jsPDF instance with A4 portrait options', async () => {
    const mockCanvas = createMockCanvas(750, 100);
    mockHtml2canvas.mockResolvedValue(mockCanvas);
    await renderHTMLToPDF('<p>Test</p>', 'test');
    expect(mockJsPDFFn).toHaveBeenCalledWith('p', 'mm', 'a4');
  });

  it('adds a single page for content that fits one page', async () => {
    const mockCanvas = createMockCanvas(750, 500);
    mockHtml2canvas.mockResolvedValue(mockCanvas);
    await renderHTMLToPDF('<p>Short</p>', 'test');
    expect(mockAddPage).not.toHaveBeenCalled();
    expect(mockAddImage).toHaveBeenCalledTimes(1);
    expect(mockOutput).toHaveBeenCalledWith('blob');
  });

  it('adds multiple pages for tall content', async () => {
    const mockCanvas = createMockCanvas(750, 5000);
    mockHtml2canvas.mockResolvedValue(mockCanvas);
    await renderHTMLToPDF('<p>Tall</p>', 'test');
    expect(mockAddPage).toHaveBeenCalled();
    expect(mockAddImage.mock.calls.length).toBeGreaterThan(1);
    expect(mockOutput).toHaveBeenCalledWith('blob');
  });

  it('calls addImage with PNG format and FAST compression', async () => {
    const mockCanvas = createMockCanvas(750, 100);
    mockHtml2canvas.mockResolvedValue(mockCanvas);
    await renderHTMLToPDF('<p>Test</p>', 'test');
    // The canvas produces a data URL (mocked); addImage receives it as 1st arg
    const callArgs = mockAddImage.mock.calls[0];
    expect(callArgs[0]).toEqual(expect.stringContaining('data:image/png;base64,'));
    expect(callArgs[1]).toBe('PNG');
    expect(callArgs[2]).toEqual(expect.any(Number));
    expect(callArgs[3]).toEqual(expect.any(Number));
    expect(callArgs[4]).toEqual(expect.any(Number));
    expect(callArgs[5]).toEqual(expect.any(Number));
    expect(callArgs[6]).toBeUndefined();
    expect(callArgs[7]).toBe('FAST');
  });

  it('outputs the document as a blob', async () => {
    const mockCanvas = createMockCanvas(750, 100);
    mockHtml2canvas.mockResolvedValue(mockCanvas);
    await renderHTMLToPDF('<p>Test</p>', 'test');
    expect(mockOutput).toHaveBeenCalledWith('blob');
  });

  // ---------------------------------------------------------------
  // saveBlob
  // ---------------------------------------------------------------
  it('saves the PDF blob with the correct filename', async () => {
    const mockCanvas = createMockCanvas(750, 100);
    mockHtml2canvas.mockResolvedValue(mockCanvas);
    await renderHTMLToPDF('<p>Test</p>', 'my_report');
    expect(mockSaveBlob).toHaveBeenCalledWith(
      expect.any(Blob),
      'my_report.pdf',
    );
  });

  it('appends .pdf extension to filename', async () => {
    const mockCanvas = createMockCanvas(750, 100);
    mockHtml2canvas.mockResolvedValue(mockCanvas);
    await renderHTMLToPDF('<p>Test</p>', 'report_2026_05');
    expect(mockSaveBlob).toHaveBeenCalledWith(
      expect.any(Blob),
      'report_2026_05.pdf',
    );
  });

  // ---------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------
  it('preserves the original error message when throwing', async () => {
    mockHtml2canvas.mockRejectedValue(new Error('html2canvas crashed'));
    await expect(renderHTMLToPDF('<p>Test</p>', 'test')).rejects.toThrow('html2canvas crashed');
  });

  it('provides fallback message when error has no message', async () => {
    mockHtml2canvas.mockRejectedValue(new Error());
    await expect(renderHTMLToPDF('<p>Test</p>', 'test')).rejects.toThrow('Failed to generate PDF. Please try again.');
  });

  it('attaches originalError to the thrown error', async () => {
    const original = new Error('Original error');
    mockHtml2canvas.mockRejectedValue(original);
    try {
      await renderHTMLToPDF('<p>Test</p>', 'test');
    } catch (e) {
      expect(e.originalError).toBe(original);
    }
  });

  it('handles saveBlob rejection', async () => {
    const mockCanvas = createMockCanvas(750, 100);
    mockHtml2canvas.mockResolvedValue(mockCanvas);
    mockSaveBlob.mockRejectedValue(new Error('Disk full'));
    await expect(renderHTMLToPDF('<p>Test</p>', 'test')).rejects.toThrow('Disk full');
  });

  // ---------------------------------------------------------------
  // Canvas slicing logic
  // ---------------------------------------------------------------
  it('slices the canvas at correct pixel boundaries for multi-page documents', async () => {
    const canvasHeight = 2300;
    const mockCanvas = createMockCanvas(750, canvasHeight);
    mockHtml2canvas.mockResolvedValue(mockCanvas);

    await renderHTMLToPDF('<p>Multi-page</p>', 'test');

    expect(mockAddImage.mock.calls.length).toBeGreaterThanOrEqual(2);

    // Each call's x/y should be the margin (10)
    mockAddImage.mock.calls.forEach(call => {
      expect(call[2]).toBe(10);
      expect(call[3]).toBe(10);
    });
  });

  // ---------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------
  it('handles very short content (single page)', async () => {
    const mockCanvas = createMockCanvas(750, 50);
    mockHtml2canvas.mockResolvedValue(mockCanvas);
    await expect(renderHTMLToPDF('<p>Tiny</p>', 'test')).resolves.toBeUndefined();
    expect(mockAddImage).toHaveBeenCalledTimes(1);
  });

  it('handles almost-empty HTML string', async () => {
    const mockCanvas = createMockCanvas(750, 10);
    mockHtml2canvas.mockResolvedValue(mockCanvas);
    await expect(renderHTMLToPDF('', 'test')).resolves.toBeUndefined();
  });
});
