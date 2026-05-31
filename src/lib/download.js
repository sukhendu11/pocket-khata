/**
 * src/lib/download.js — Shared Download Utility
 *
 * Provides reliable file download across standard browsers and Capacitor
 * Android WebViews.
 *
 * Strategy (in order of preference):
 *   1. [Capacitor Native] Filesystem.writeFile() to Documents — saves
 *      directly to the device Documents/Downloads folder.
 *   2. [Desktop] File System Access API — native "Save As" dialog.
 *   3. [Android 12+] Web Share API — share sheet with the file.
 *   4. [Fallback] <a> download with blob URL — works on most browsers.
 */

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

/**
 * Convert a Blob to a raw base64 string (required by the native
 * Filesystem plugin for binary data on Android/iOS).
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // reader.result is a data URL like "data:application/pdf;base64,AAAA..."
      const dataUrl = reader.result;
      const comma = dataUrl.indexOf(',');
      resolve(comma !== -1 ? dataUrl.slice(comma + 1) : dataUrl);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Save a Blob as a file on the device.
 *
 * On Android (Capacitor native) the file is written to the Documents
 * directory, which appears in the user's Downloads/ folder. On iOS it
 * is written to the app's documents folder. Then we try to open the
 * system share sheet so the user can save/share the file.
 *
 * @param {Blob} blob - The blob to save.
 * @param {string} filename - Suggested filename (e.g. 'report.pdf').
 * @returns {Promise<void>}
 */
export async function saveBlob(blob, filename) {
  const isNative = Capacitor.isNativePlatform();

  // ── Method 1: Capacitor Filesystem plugin (Android / iOS) ────────────
  if (isNative) {
    try {
      const base64Data = await blobToBase64(blob);
      const mimeType = blob.type || (filename.endsWith('.pdf') ? 'application/pdf' : 'application/json');

      // Write directly to Documents folder — this is the primary save
      await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Documents,
      });

      // Try Web Share API to let the user share/save the file
      // Works on Chrome-based WebViews (Android 12+)
      try {
        const byteString = atob(base64Data);
        const ab = new Uint8Array(byteString.length);
        for (let i = 0; i < byteString.length; i++) {
          ab[i] = byteString.charCodeAt(i);
        }
        const shareBlob = new Blob([ab], { type: mimeType });
        const shareFile = new File([shareBlob], filename, { type: mimeType });

        if (navigator.canShare && navigator.canShare({ files: [shareFile] })) {
          await navigator.share({ files: [shareFile], title: filename });
        }
      } catch (_webShareErr) {
        // Web Share not supported or user cancelled — file is already saved to Documents
      }

      // File is already saved to Documents — return success
      return;
    } catch (fsErr) {
      console.error('Filesystem save failed, falling back:', fsErr);
      // Fall through to browser methods
    }
  }

  // ── Method 2: File System Access API (desktop Chrome/Edge) ──────────
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: filename.endsWith('.pdf') ? 'PDF file' : 'JSON file',
            accept: filename.endsWith('.pdf')
              ? { 'application/pdf': ['.pdf'] }
              : { 'application/json': ['.json'] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (_err) {
      // User cancelled the picker — fall through
    }
  }

  // ── Method 3: Native share (mobile browsers, some PWAs) ──────────
  const file = new File([blob], filename, { type: blob.type });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch (_err) {
      // User cancelled share sheet — fall through
    }
  }

  // ── Method 4: Blob URL with <a> download ────────────────────────
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Small delay ensures the browser has initiated the download
  await new Promise(r => setTimeout(r, 100));

  // Revoke blob URL after sufficient delay for the download to start
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Save a string as a text file (e.g. JSON export).
 *
 * @param {string} content - The string content to save.
 * @param {string} filename - Suggested filename.
 * @param {string} [mimeType='application/json;charset=utf-8'] - MIME type.
 * @returns {Promise<void>}
 */
export async function saveString(
  content,
  filename,
  mimeType = 'application/json;charset=utf-8',
) {
  const blob = new Blob([content], { type: mimeType });
  await saveBlob(blob, filename);
}
