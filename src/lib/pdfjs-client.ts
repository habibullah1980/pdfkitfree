'use client';

import type { PDFDocumentProxy } from 'pdfjs-dist';

/** Loads pdf.js with the self-hosted worker (same version as the library; no third-party CDN). */
export async function loadPdfjs() {
  const pdfjsLib = await import('pdfjs-dist');
  if (pdfjsLib.GlobalWorkerOptions.workerSrc !== '/pdf.worker.min.js') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  }
  return pdfjsLib;
}

/**
 * Opens a PDF for reading/rendering with pdf.js.
 *
 * pdf.js transfers the bytes it is given to its worker, which detaches the
 * caller's ArrayBuffer. Any later use of that buffer (for example by pdf-lib)
 * then fails with "Cannot perform Construct on a detached ArrayBuffer".
 * This always hands pdf.js its own copy, so the caller's buffer stays usable.
 */
export async function openPdfDocument(bytes: ArrayBuffer | Uint8Array): Promise<PDFDocumentProxy> {
  const pdfjsLib = await loadPdfjs();
  const copy = bytes instanceof Uint8Array ? bytes.slice() : new Uint8Array(bytes.slice(0));
  return pdfjsLib.getDocument({ data: copy }).promise;
}
