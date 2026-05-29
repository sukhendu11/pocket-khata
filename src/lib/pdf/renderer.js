// src/lib/pdf/renderer.js — Renderer Layer
// Uses html2canvas directly to capture styled HTML as a canvas,
// then embeds the image into jsPDF via addImage().
// This approach bypasses jsPDF's broken doc.html() pipeline entirely.

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Render a styled HTML string to a PDF document.
 *
 * Strategy:
 * 1. Insert the HTML into a hidden DOM element
 * 2. Capture it with html2canvas (full-page screenshot)
 * 3. Slice the tall canvas into A4-sized pages
 * 4. Add each page to jsPDF via addImage()
 *
 * @param {string} htmlContent - Full HTML document string with inline CSS
 * @param {string} filename - The downloaded PDF filename (without extension)
 * @returns {Promise<void>}
 */
export async function renderHTMLToPDF(htmlContent, filename) {
  // Create a hidden container for rendering
  const container = document.createElement('div');
  container.innerHTML = htmlContent;
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '750px'; // Matches the .page max-width in template
  container.style.backgroundColor = '#ffffff';
  container.style.zIndex = '-9999';
  document.body.appendChild(container);

  try {
    // Let the browser layout the hidden DOM before capturing
    // A small delay ensures fonts and styles are resolved
    await new Promise(r => setTimeout(r, 100));

    // Progressive scale: try 2x for crisp text, fall back to 1.5x, then 1x
    // This prevents OOM crashes on low-memory Android devices
    const scales = [2, 1.5, 1];
    let canvas = null;
    let lastError = null;

    for (const scale of scales) {
      try {
        canvas = await html2canvas(container, {
          scale,
          useCORS: true,
          logging: false,
          width: container.scrollWidth,
          height: container.scrollHeight,
          backgroundColor: '#ffffff',
          onclone: null,
        });
        // Success — break out of fallback loop
        break;
      } catch (e) {
        lastError = e;
        console.warn(`html2canvas failed at ${scale}x scale, trying next...`, e);
      }
    }

    if (!canvas) {
      throw lastError || new Error('html2canvas failed at all scale levels');
    }

    // jsPDF setup — A4 portrait
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10; // mm on each side

    // Calculate the image dimensions in mm
    const imgWidth = pageWidth - 2 * margin; // 190mm for A4
    const totalImgHeight = (canvas.height * imgWidth) / canvas.width;

    // How many pixels of the source canvas fit on one PDF page
    const pageUsableHeight = pageHeight - 2 * margin; // 277mm for A4
    const pixelsPerPage = (pageUsableHeight / totalImgHeight) * canvas.height;

    let srcY = 0;
    let pageIndex = 0;

    while (srcY < canvas.height) {
      const remaining = Math.min(pixelsPerPage, canvas.height - srcY);

      // Create a temporary canvas for this page slice
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = remaining;
      const ctx = pageCanvas.getContext('2d');
      ctx.drawImage(
        canvas,
        0, srcY,                // source x, y
        canvas.width, remaining, // source w, h
        0, 0,                    // dest x, y
        pageCanvas.width, pageCanvas.height  // dest w, h
      );

      const pageImgData = pageCanvas.toDataURL('image/png');
      const pageImgHeight = (remaining * imgWidth) / canvas.width;

      if (pageIndex > 0) doc.addPage();
      doc.addImage(pageImgData, 'PNG', margin, margin, imgWidth, pageImgHeight, undefined, 'FAST');

      srcY += remaining;
      pageIndex++;
    }

    const pdfBlob = doc.output('blob');
    await saveBlobAsFile(pdfBlob, `${filename}.pdf`);
  } catch (err) {
    console.error('PDF generation failed:', err);
    // Preserve the original error message for better user feedback
    // while still providing a user-friendly fallback text
    const message = err.message || 'Failed to generate PDF. Please try again.';
    const error = new Error(message);
    error.originalError = err;
    throw error;
  } finally {
    // Clean up the hidden DOM element
    if (container.parentNode) {
      document.body.removeChild(container);
    }
  }
}

async function saveBlobAsFile(blob, filename) {
  const file = new File([blob], filename, { type: blob.type });

  // Prefer native save file picker where available
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'PDF file', accept: { 'application/pdf': ['.pdf'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err) {
      // User may cancel the file picker; fall back to other methods.
      console.warn('Save file picker cancelled or unavailable:', err);
    }
  }

  // Use native share on eligible mobile PWAs/devices
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'Pocket Khata Report',
        text: 'Exported report from Pocket Khata',
      });
      return;
    } catch (err) {
      console.warn('Native share failed or cancelled:', err);
    }
  }

  // Fallback download via anchor click.
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // For environments where download is not supported (some installed PWAs, Android WebView),
  // open the blob URL in a new tab — this works more reliably on Android Chrome for PDFs
  // than the download attribute approach.
  // Check: Android Chrome + Samsung Internet often lack reliable `download` attr for blobs,
  // so we always open as a secondary fallback.
  const needsTabFallback =
    !('download' in HTMLAnchorElement.prototype) ||
    /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (needsTabFallback) {
    // Small delay to let the click() fire first
    setTimeout(() => {
      try {
        window.open(url, '_blank');
      } catch (e) {
        // Some Android WebViews block window.open — try as last resort
        window.location.href = url;
      }
    }, 200);
  }

  // Keep the blob URL alive longer for Android which may need time to start the download
  const revokeDelay = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 10000 : 2000;
  setTimeout(() => URL.revokeObjectURL(url), revokeDelay);
}
