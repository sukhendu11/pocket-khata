/**
 * src/lib/download.js — Shared Download Utility
 *
 * Provides reliable file download across standard browsers and Capacitor
 * Android WebViews.
 *
 * Strategy (in order of preference):
 *   1. [Android / iOS] Native Capacitor Share plugin — opens system share
 *      sheet with "Save to Files" option that opens the SAF folder picker.
 *   2. [Android / iOS] Capacitor Filesystem.writeFile() to Documents —
 *      direct save if the share sheet is cancelled or unavailable.
 *   3. [Desktop] File System Access API — native "Save As" dialog.
 *   4. [Fallback] <a> download with blob URL — works on most browsers.
 */

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

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
 * On Android (Capacitor native), we first save the blob to Cache and
 * then open the native Share plugin, which shows the system share
 * sheet with a "Save to Files" option — this lets the user pick the
 * target folder via Android's SAF picker. If the share sheet is
 * cancelled, we fall back to writing directly to Documents.
 *
 * @param {Blob} blob - The blob to save.
 * @param {string} filename - Suggested filename (e.g. 'report.pdf').
 * @returns {Promise<void>}
 */
export async function saveBlob(blob, filename) {
  const isNative = Capacitor.isNativePlatform();
  const mimeType = blob.type || (filename.endsWith('.pdf') ? 'application/pdf' : 'application/json');

  // ── Method 1: Native Share plugin (Android / iOS) — shows folder picker ─
  // Uses the native Capacitor Share plugin to open the system share sheet.
  // On Android this includes a "Save to Files" option that opens the SAF
  // (Storage Access Framework) folder picker, letting the user choose
  // exactly where to save the file. The Web Share API (navigator.share)
  // doesn't work reliably in Capacitor WebViews, so we use the native
  // plugin instead.
  if (isNative) {
    try {
      // 1. Save blob to Cache first (we need a file on disk to share)
      const base64Data = await blobToBase64(blob);
      await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache,
      });

      // 2. Get the file URI for the native Share plugin
      const fileUri = await Filesystem.getUri({
        path: filename,
        directory: Directory.Cache,
      });

      // 3. Open native share sheet — includes "Save to Files" → SAF folder picker
      await Share.share({
        files: [fileUri.uri],
        title: filename,
      });

      // 4. Share completed — user already chose a save location via the
      //    folder picker ("Save to Files"), so no need to write to Documents.
      //    Clean up by deleting the temp file from Cache.
      try {
        await Filesystem.deleteFile({
          path: filename,
          directory: Directory.Cache,
        });
      } catch (_) { /* best effort */ }
      return;
    } catch (_shareErr) {
      // Share cancelled or failed — fall through to direct Documents save
    }

    // ── Method 2: Capacitor Filesystem plugin (Android / iOS) ────────────
    // Falls back to saving directly to Documents if the user cancelled the
    // share sheet or the Share plugin is unavailable.
    try {
      const base64Data = await blobToBase64(blob);
      await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Documents,
      });
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
