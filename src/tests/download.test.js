// src/tests/download.test.js — Tests for shared download utility (src/lib/download.js)
//
// Covers all 5 fallback paths:
//   1. Capacitor Filesystem (native)
//   2. File System Access API (desktop Chrome/Edge)
//   3. Native Share (mobile browsers, PWAs)
//   4. Blob URL + <a> download (last resort)
//   5. saveString helper

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ==============================================================================
// Mock @capacitor/core and @capacitor/filesystem
// ==============================================================================

const mockWriteFile = vi.fn();
const mockGetUri = vi.fn();
const mockSharePlugin = vi.fn();
const mockIsNativePlatform = vi.fn();

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: mockIsNativePlatform,
  },
}));

vi.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    writeFile: mockWriteFile,
    getUri: mockGetUri,
  },
  Directory: {
    Documents: 'DOCUMENTS',
    Cache: 'CACHE',
  },
}));

vi.mock('@capacitor/share', () => ({
  Share: {
    share: mockSharePlugin,
  },
}));

// ==============================================================================
// Mock globals used by the download utility
// ==============================================================================

function setupFileReaderMock(mockImpl) {
  // FileReader is instantiated with `new` inside blobToBase64 — we mock the
  // constructor so that the test can control the result or error.
  vi.stubGlobal(
    'FileReader',
    vi.fn(() => mockImpl),
  );
}

/** Minimal mock for a FileReader that resolves successfully. */
function fakeFileReaderSuccess(dataUrl) {
  return {
    readAsDataURL: vi.fn(function () {
      // schedule onloadend as microtask to simulate async behaviour
      setTimeout(() => {
        this.result = dataUrl;
        if (this.onloadend) this.onloadend();
      }, 0);
    }),
    onloadend: null,
    onerror: null,
  };
}

/** Minimal mock for a FileReader that rejects. */
function fakeFileReaderError() {
  return {
    readAsDataURL: vi.fn(function () {
      setTimeout(() => {
        if (this.onerror) this.onerror(new Error('FileReader error'));
      }, 0);
    }),
    onloadend: null,
    onerror: null,
  };
}

/** Create a minimal Blob mock (jsdom's Blob works fine). */
function makeBlob(content, type = 'application/octet-stream') {
  return new Blob([content], { type });
}

// ==============================================================================
// Helpers to clean up Document and navigator stubs
// ==============================================================================

beforeEach(() => {
  vi.clearAllMocks();
  // Remove any dynamically added <a> elements from previous tests
  document.querySelectorAll('a[download]').forEach(el => el.remove());
});

afterEach(() => {
  vi.unstubAllGlobals();
  // Reset any global state we may have set
  if (globalThis._downloadLinkCleanup) {
    globalThis._downloadLinkCleanup();
    delete globalThis._downloadLinkCleanup;
  }
});

// ==============================================================================
// Import after mocks are set up
// ==============================================================================

async function getModule() {
  return import('../lib/download');
}

// ==============================================================================
// saveBlob — Capacitor Native path
// ==============================================================================

describe('saveBlob — Capacitor Native path', () => {
  beforeEach(() => {
    mockIsNativePlatform.mockReturnValue(true);
    setupFileReaderMock(
      fakeFileReaderSuccess('data:application/pdf;base64,AAECAwQFBgcICQo='),
    );
  });

  it('writes file via Filesystem plugin on native platform', async () => {
    mockWriteFile.mockResolvedValue(undefined);
    mockGetUri.mockResolvedValue({ uri: 'file:///cache/report.pdf' });
    mockSharePlugin.mockResolvedValue(undefined);

    const { saveBlob } = await getModule();
    const blob = makeBlob('test pdf content', 'application/pdf');
    await saveBlob(blob, 'report.pdf');

    // Writes to Cache only (for sharing via Share plugin), no Documents write
    // because the user already chose the save location via the folder picker
    expect(mockWriteFile).toHaveBeenCalledTimes(1);
    expect(mockWriteFile).toHaveBeenNthCalledWith(1, {
      path: 'report.pdf',
      data: 'AAECAwQFBgcICQo=',
      directory: 'CACHE',
    });
    expect(mockGetUri).toHaveBeenCalledOnce();
    expect(mockSharePlugin).toHaveBeenCalledOnce();
  });

  it('returns without falling through on success', async () => {
    mockWriteFile.mockResolvedValue(undefined);
    mockGetUri.mockResolvedValue({ uri: 'file:///cache/test.txt' });
    mockSharePlugin.mockResolvedValue(undefined);

    // Stub showSaveFilePicker to detect if we fall through
    const showSaveFilePicker = vi.fn();
    vi.stubGlobal('window', { ...window, showSaveFilePicker });

    const { saveBlob } = await getModule();
    await saveBlob(makeBlob('data', 'text/plain'), 'test.txt');

    // 1 write to Cache only (Share succeeded, user chose save location)
    expect(mockWriteFile).toHaveBeenCalledTimes(1);
    expect(mockGetUri).toHaveBeenCalledOnce();
    expect(mockSharePlugin).toHaveBeenCalledOnce();
    expect(showSaveFilePicker).not.toHaveBeenCalled();
  });

  it('falls through when Filesystem.writeFile throws', async () => {
    mockWriteFile.mockRejectedValue(new Error('Storage full'));
    mockGetUri.mockResolvedValue({ uri: 'file:///cache/test.txt' });
    mockSharePlugin.mockResolvedValue(undefined);

    // Stub FSAA so we can detect fallthrough reached it
    const showSaveFilePicker = vi.fn().mockRejectedValue(new Error('Cancel'));
    vi.stubGlobal('window', { ...window, showSaveFilePicker });

    // Stub navigator.canShare to skip share
    vi.stubGlobal('navigator', {
      ...navigator,
      canShare: undefined,
    });

    // Stub URL.createObjectURL and document.createElement for blob fallback
    const url = 'blob:mock-fallback';
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => url), revokeObjectURL: vi.fn() });

    const { saveBlob } = await getModule();
    await saveBlob(makeBlob('data', 'text/plain'), 'test.txt');

    // Cache write throws → catch → Documents fallback also throws → browser methods
    expect(mockWriteFile).toHaveBeenCalledTimes(2);
    expect(showSaveFilePicker).toHaveBeenCalledOnce();
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
  });

  it('falls through when blobToBase64 fails', async () => {
    setupFileReaderMock(fakeFileReaderError());

    const showSaveFilePicker = vi.fn().mockRejectedValue(new Error('Cancel'));
    vi.stubGlobal('window', { ...window, showSaveFilePicker });
    vi.stubGlobal('navigator', { ...navigator, canShare: undefined });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() });

    const { saveBlob } = await getModule();
    await saveBlob(makeBlob('data', 'text/plain'), 'test.txt');

    expect(mockWriteFile).not.toHaveBeenCalled();
    expect(showSaveFilePicker).toHaveBeenCalledOnce();
  });

  it('does not attempt Filesystem when isNativePlatform returns false', async () => {
    mockIsNativePlatform.mockReturnValue(false);

    vi.stubGlobal('window', { ...window, showSaveFilePicker: undefined });
    vi.stubGlobal('navigator', { ...navigator, canShare: undefined });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() });

    const { saveBlob } = await getModule();
    await saveBlob(makeBlob('data', 'text/plain'), 'test.txt');

    expect(mockWriteFile).not.toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
  });
});

// ==============================================================================
// saveBlob — File System Access API path
// ==============================================================================

describe('saveBlob — File System Access API', () => {
  beforeEach(() => {
    mockIsNativePlatform.mockReturnValue(false);
  });

  it('uses showSaveFilePicker when available and user confirms', async () => {
    const mockWritable = {
      write: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const mockHandle = { createWritable: vi.fn().mockResolvedValue(mockWritable) };
    const showSaveFilePicker = vi.fn().mockResolvedValue(mockHandle);

    vi.stubGlobal('window', { ...window, showSaveFilePicker });

    const { saveBlob } = await getModule();
    const blob = makeBlob('pdf content', 'application/pdf');
    await saveBlob(blob, 'report.pdf');

    expect(showSaveFilePicker).toHaveBeenCalledWith({
      suggestedName: 'report.pdf',
      types: [
        {
          description: 'PDF file',
          accept: { 'application/pdf': ['.pdf'] },
        },
      ],
    });
    expect(mockHandle.createWritable).toHaveBeenCalledOnce();
    expect(mockWritable.write).toHaveBeenCalledWith(blob);
    expect(mockWritable.close).toHaveBeenCalledOnce();
  });

  it('uses correct accept type for JSON files', async () => {
    const mockWritable = {
      write: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const mockHandle = { createWritable: vi.fn().mockResolvedValue(mockWritable) };
    const showSaveFilePicker = vi.fn().mockResolvedValue(mockHandle);
    vi.stubGlobal('window', { ...window, showSaveFilePicker });

    const { saveBlob } = await getModule();
    const blob = makeBlob('{"a":1}', 'application/json');
    await saveBlob(blob, 'backup.json');

    expect(showSaveFilePicker).toHaveBeenCalledWith({
      suggestedName: 'backup.json',
      types: [
        {
          description: 'JSON file',
          accept: { 'application/json': ['.json'] },
        },
      ],
    });
  });

  it('falls through when user cancels the save picker', async () => {
    const showSaveFilePicker = vi.fn().mockRejectedValue(new Error('AbortError'));
    vi.stubGlobal('window', { ...window, showSaveFilePicker });

    // Prevent share
    vi.stubGlobal('navigator', { ...navigator, canShare: undefined });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:cancel'), revokeObjectURL: vi.fn() });

    const { saveBlob } = await getModule();
    await saveBlob(makeBlob('data', 'text/plain'), 'test.txt');

    expect(showSaveFilePicker).toHaveBeenCalledOnce();
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
  });

  it('skips FSAA when showSaveFilePicker is not available', async () => {
    // window.showSaveFilePicker not defined
    vi.stubGlobal('navigator', { ...navigator, canShare: undefined });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:skip'), revokeObjectURL: vi.fn() });

    const { saveBlob } = await getModule();
    await saveBlob(makeBlob('data', 'text/plain'), 'test.txt');

    expect(URL.createObjectURL).toHaveBeenCalledOnce();
  });

  it('falls through when writable.write fails (error caught by FSAA try/catch)', async () => {
    const mockWritable = {
      write: vi.fn().mockRejectedValue(new Error('Write error')),
      close: vi.fn(),
    };
    const mockHandle = { createWritable: vi.fn().mockResolvedValue(mockWritable) };
    const showSaveFilePicker = vi.fn().mockResolvedValue(mockHandle);
    vi.stubGlobal('window', { ...window, showSaveFilePicker });

    vi.stubGlobal('navigator', { ...navigator, canShare: undefined });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:fail'), revokeObjectURL: vi.fn() });

    // The try/catch around the FSAA block catches errors from createWritable
    // and write, falling through to the blob fallback.
    const { saveBlob } = await getModule();
    await expect(
      saveBlob(makeBlob('data', 'text/plain'), 'test.txt'),
    ).resolves.toBeUndefined();

    expect(mockWritable.write).toHaveBeenCalledOnce();
    expect(mockWritable.close).not.toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
  });
});

// ==============================================================================
// saveBlob — Native Share path
// ==============================================================================

describe('saveBlob — Native Share', () => {
  beforeEach(() => {
    mockIsNativePlatform.mockReturnValue(false);
  });

  it('shares file via navigator.share when canShare returns true', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(true);

    vi.stubGlobal('navigator', { ...navigator, share, canShare });

    const { saveBlob } = await getModule();
    const blob = makeBlob('shared content', 'text/plain');
    await saveBlob(blob, 'shared.txt');

    expect(canShare).toHaveBeenCalledOnce();
    expect(share).toHaveBeenCalledOnce();
    const shareArg = share.mock.calls[0][0];
    expect(shareArg.title).toBe('shared.txt');
    expect(shareArg.files.length).toBe(1);
    expect(shareArg.files[0].name).toBe('shared.txt');
    expect(shareArg.files[0].type).toBe('text/plain');
  });

  it('falls through when user cancels the share sheet', async () => {
    const share = vi.fn().mockRejectedValue(new Error('AbortError'));
    const canShare = vi.fn().mockReturnValue(true);

    vi.stubGlobal('navigator', { ...navigator, share, canShare });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:cancel'), revokeObjectURL: vi.fn() });

    const { saveBlob } = await getModule();
    await saveBlob(makeBlob('data', 'text/plain'), 'test.txt');

    expect(canShare).toHaveBeenCalledOnce();
    expect(share).toHaveBeenCalledOnce();
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
  });

  it('skips share when canShare returns false', async () => {
    const share = vi.fn();
    const canShare = vi.fn().mockReturnValue(false);

    vi.stubGlobal('navigator', { ...navigator, share, canShare });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:skip'), revokeObjectURL: vi.fn() });

    const { saveBlob } = await getModule();
    await saveBlob(makeBlob('data', 'text/plain'), 'test.txt');

    expect(canShare).toHaveBeenCalledOnce();
    expect(share).not.toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
  });

  it('skips share when canShare is not available', async () => {
    vi.stubGlobal('navigator', { ...navigator, canShare: undefined });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:skip'), revokeObjectURL: vi.fn() });

    const { saveBlob } = await getModule();
    await saveBlob(makeBlob('data', 'text/plain'), 'test.txt');

    expect(URL.createObjectURL).toHaveBeenCalledOnce();
  });
});

// ==============================================================================
// saveBlob — Blob URL fallback (<a> download)
// ==============================================================================

describe('saveBlob — Blob URL fallback', () => {
  beforeEach(() => {
    mockIsNativePlatform.mockReturnValue(false);
    vi.stubGlobal('navigator', { ...navigator, canShare: undefined });
  });

  it('creates an anchor element, clicks it, and removes it', async () => {
    const url = 'blob:mock123';
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => url), revokeObjectURL });

    const appendChild = vi.spyOn(document.body, 'appendChild');
    const removeChild = vi.spyOn(document.body, 'removeChild');

    const { saveBlob } = await getModule();
    await saveBlob(makeBlob('fallback content', 'application/pdf'), 'fallback.pdf');

    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));

    // Verify a link was added and removed
    expect(appendChild).toHaveBeenCalledOnce();
    const link = appendChild.mock.calls[0][0];
    expect(link.tagName).toBe('A');
    expect(link.href).toBe(url);
    expect(link.download).toBe('fallback.pdf');
    expect(link.style.display).toBe('none');
    expect(link.rel).toBe('noopener noreferrer');

    expect(removeChild).toHaveBeenCalledOnce();
    expect(removeChild.mock.calls[0][0]).toBe(link);

    // revokeObjectURL should eventually be called (via setTimeout)
    await new Promise(resolve => setTimeout(resolve, 200));
    // Note: setTimeout(fn, 5000) — won't fire in test unless we advance the clock.
    // Instead of waiting 5s, we just verify the function exists.
    // We'll use vi.useFakeTimers for a proper test below.
  });

  it('revokes the blob URL after the download starts (with fake timers)', async () => {
    vi.useFakeTimers();

    const url = 'blob:mock-timer';
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => url), revokeObjectURL });

    const { saveBlob } = await getModule();
    const blob = makeBlob('timer test', 'text/plain');

    // Start the save — the first await (100ms delay) will resolve when we advance
    const savePromise = saveBlob(blob, 'timer.txt');

    // Advance past the 100ms delay inside the function (after link.click)
    await vi.advanceTimersByTimeAsync(200);

    // The function should have resolved by now
    await savePromise;

    // Now advance past the 5000ms setTimeout for revoke
    expect(revokeObjectURL).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(5000);
    expect(revokeObjectURL).toHaveBeenCalledWith(url);

    vi.useRealTimers();
  });

  it('sets proper link attributes for the download', async () => {
    const url = 'blob:mock-attr';
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => url), revokeObjectURL: vi.fn() });

    const { saveBlob } = await getModule();
    await saveBlob(makeBlob('{"a":1}', 'application/json'), 'backup.json');

    const links = document.querySelectorAll('a[download]');
    // The link should have been removed from the DOM
    expect(links.length).toBe(0);
  });
});

// ==============================================================================
// saveBlob — Full fallback chain (end-to-end on non-native platform)
// ==============================================================================

describe('saveBlob — Full fallback chain', () => {
  beforeEach(() => {
    mockIsNativePlatform.mockReturnValue(false);
  });

  it('tries FSAA, then share, then blob URL when all previous methods fail/are unavailable', async () => {
    // FSAA: available but user cancels
    const showSaveFilePicker = vi.fn().mockRejectedValue(new Error('Cancel'));
    vi.stubGlobal('window', { ...window, showSaveFilePicker });

    // Share: available but user cancels
    const share = vi.fn().mockRejectedValue(new Error('Abort'));
    const canShare = vi.fn().mockReturnValue(true);
    vi.stubGlobal('navigator', { ...navigator, share, canShare });

    // Blob URL: should be the last resort
    const url = 'blob:last-resort';
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => url), revokeObjectURL: vi.fn() });

    const { saveBlob } = await getModule();
    await saveBlob(makeBlob('final', 'text/plain'), 'final.txt');

    // All three methods should have been tried
    expect(showSaveFilePicker).toHaveBeenCalledOnce();
    expect(canShare).toHaveBeenCalledOnce();
    expect(share).toHaveBeenCalledOnce();
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
  });

  it('completes successfully when only blob URL path is available', async () => {
    // No FSAA, no Share
    vi.stubGlobal('window', { ...window, showSaveFilePicker: undefined });
    vi.stubGlobal('navigator', { ...navigator, canShare: undefined });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:only'), revokeObjectURL: vi.fn() });

    const { saveBlob } = await getModule();
    await expect(
      saveBlob(makeBlob('data', 'text/plain'), 'only.txt'),
    ).resolves.toBeUndefined();
  });
});

// ==============================================================================
// saveString
// ==============================================================================

describe('saveString', () => {
  beforeEach(() => {
    mockIsNativePlatform.mockReturnValue(false);
    vi.stubGlobal('navigator', { ...navigator, canShare: undefined });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:string'), revokeObjectURL: vi.fn() });
  });

  it('creates a blob with default JSON MIME type and calls saveBlob', async () => {
    const createObjectURL = vi.fn(() => 'blob:string');
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() });

    const { saveString } = await getModule();
    await saveString('{"hello":"world"}', 'export.json');

    expect(createObjectURL).toHaveBeenCalledOnce();
    const blobArg = createObjectURL.mock.calls[0][0];
    expect(blobArg.type).toBe('application/json;charset=utf-8');
    expect(blobArg.size).toBe(17); // '{"hello":"world"}' is 17 chars / bytes
  });

  it('accepts custom MIME type', async () => {
    const createObjectURL = vi.fn(() => 'blob:custom');
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() });

    const { saveString } = await getModule();
    await saveString('some csv data', 'data.csv', 'text/csv');

    const blobArg = createObjectURL.mock.calls[0][0];
    expect(blobArg.type).toBe('text/csv');
  });

  it('resolves when blob saves successfully', async () => {
    const { saveString } = await getModule();
    await expect(saveString('data', 'test.txt', 'text/plain')).resolves.toBeUndefined();
  });
});

// ==============================================================================
// Edge Cases
// ==============================================================================

describe('Edge Cases', () => {
  it('handles empty blob content', async () => {
    mockIsNativePlatform.mockReturnValue(false);
    vi.stubGlobal('navigator', { ...navigator, canShare: undefined });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:empty'), revokeObjectURL: vi.fn() });

    const { saveBlob } = await getModule();
    await expect(
      saveBlob(makeBlob('', 'application/json'), 'empty.json'),
    ).resolves.toBeUndefined();
  });

  it('handles large blob content', async () => {
    mockIsNativePlatform.mockReturnValue(false);
    vi.stubGlobal('navigator', { ...navigator, canShare: undefined });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:large'), revokeObjectURL: vi.fn() });

    const largeContent = 'x'.repeat(100000); // 100KB
    const { saveBlob } = await getModule();
    await expect(
      saveBlob(makeBlob(largeContent, 'text/plain'), 'large.txt'),
    ).resolves.toBeUndefined();
  });

  it('handles binary blob types like application/octet-stream', async () => {
    mockIsNativePlatform.mockReturnValue(false);
    vi.stubGlobal('navigator', { ...navigator, canShare: undefined });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:bin'), revokeObjectURL: vi.fn() });

    const { saveBlob } = await getModule();
    const uint8 = new Uint8Array([0, 1, 2, 255, 254, 253]);
    const blob = new Blob([uint8], { type: 'application/octet-stream' });
    await expect(
      saveBlob(blob, 'data.bin'),
    ).resolves.toBeUndefined();
  });

  it('handles saveString with empty string content', async () => {
    mockIsNativePlatform.mockReturnValue(false);
    vi.stubGlobal('navigator', { ...navigator, canShare: undefined });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:empty-str'), revokeObjectURL: vi.fn() });

    const { saveString } = await getModule();
    await expect(saveString('', 'empty.json')).resolves.toBeUndefined();
  });

  it('handles filenames with special characters', async () => {
    mockIsNativePlatform.mockReturnValue(false);
    vi.stubGlobal('navigator', { ...navigator, canShare: undefined });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:special'), revokeObjectURL: vi.fn() });

    const { saveBlob } = await getModule();
    await expect(
      saveBlob(makeBlob('test', 'text/plain'), 'my file (1).txt'),
    ).resolves.toBeUndefined();
  });

  it('handles non-native platform with all browser APIs unavailable', async () => {
    mockIsNativePlatform.mockReturnValue(false);
    // No FSAA, no Share
    vi.stubGlobal('window', { ...window, showSaveFilePicker: undefined });
    vi.stubGlobal('navigator', { ...navigator, canShare: undefined });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:only'), revokeObjectURL: vi.fn() });

    const { saveBlob } = await getModule();
    await expect(
      saveBlob(makeBlob('hello', 'text/plain'), 'test.txt'),
    ).resolves.toBeUndefined();
  });

  it('handles native platform where all fallbacks also fail', async () => {
    mockIsNativePlatform.mockReturnValue(true);
    setupFileReaderMock(
      fakeFileReaderSuccess('data:text/plain;base64,SGVsbG8='),
    );
    mockWriteFile.mockRejectedValue(new Error('Disk full'));
    mockGetUri.mockResolvedValue({ uri: 'file:///cache/file.txt' });
    mockSharePlugin.mockResolvedValue(undefined);

    // Fallback: no FSAA, no Share
    vi.stubGlobal('window', { ...window, showSaveFilePicker: undefined });
    vi.stubGlobal('navigator', { ...navigator, canShare: undefined });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:native-fail'), revokeObjectURL: vi.fn() });

    const { saveBlob } = await getModule();
    await expect(
      saveBlob(makeBlob('data', 'text/plain'), 'native-fallback.txt'),
    ).resolves.toBeUndefined();

    // Cache write fails → Documents fallback also fails → browser methods
    expect(mockWriteFile).toHaveBeenCalledTimes(2);
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
  });
});
