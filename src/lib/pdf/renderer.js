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

    // Capture with html2canvas at 2x for crisp text
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      width: container.scrollWidth,
      height: container.scrollHeight,
      backgroundColor: '#ffffff',
      onclone: null,
    });

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

    doc.save(`${filename}.pdf`);
  } catch (err) {
    console.error('PDF generation failed:', err);
    throw new Error('Failed to generate PDF. Please try again.');
  } finally {
    // Clean up the hidden DOM element
    if (container.parentNode) {
      document.body.removeChild(container);
    }
  }
}
