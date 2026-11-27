'use client';
/**
 * Browser adapters for the PDF -> Word converter: canvas image encoding, page rendering and
 * Tesseract OCR served from this site. Nothing is uploaded anywhere.
 */
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { loadPdfjs } from '@/lib/pdfjs-client';
import { convertPdfToDocx, type ConvertResult } from './index';
import { tesseractBlocksToWords } from './tesseract-words';
import type { EncodedImage, OcrEngine, RegionRenderer } from './types';

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

async function canvasToBytes(c: HTMLCanvasElement, type: 'image/png' | 'image/jpeg'): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode an image.'))), type, 0.88));
  return new Uint8Array(await blob.arrayBuffer());
}

export async function browserEncodeImage(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  opts: { targetWidth: number; targetHeight: number; opaque: boolean }
): Promise<EncodedImage> {
  const src = makeCanvas(width, height);
  src.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(rgba), width, height), 0, 0);
  let out = src;
  if (opts.targetWidth !== width || opts.targetHeight !== height) {
    out = makeCanvas(opts.targetWidth, opts.targetHeight);
    const ctx = out.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, out.width, out.height);
    src.width = src.height = 0;
  }
  // Photos as JPEG (small files); logos, icons and anything transparent as PNG (sharp, keeps transparency)
  const photo = opts.opaque && out.width * out.height > 40000;
  const data = await canvasToBytes(out, photo ? 'image/jpeg' : 'image/png');
  out.width = out.height = 0;
  return { data, type: photo ? 'jpeg' : 'png' };
}

function makeRenderer(pdf: PDFDocumentProxy): RegionRenderer {
  let cached: { key: string; canvas: HTMLCanvasElement } | null = null;
  return async (pageIndex, region, scale) => {
    const key = `${pageIndex}@${scale}`;
    if (!cached || cached.key !== key) {
      if (cached) cached.canvas.width = cached.canvas.height = 0;
      const page = await pdf.getPage(pageIndex + 1);
      const viewport = page.getViewport({ scale });
      const canvas = makeCanvas(viewport.width, viewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      cached = { key, canvas };
    }
    const c = cached.canvas;
    const x = Math.max(0, Math.floor(region.x0 * scale));
    const y = Math.max(0, Math.floor(region.y0 * scale));
    const w = Math.min(c.width - x, Math.ceil((region.x1 - region.x0) * scale));
    const h = Math.min(c.height - y, Math.ceil((region.y1 - region.y0) * scale));
    if (w <= 0 || h <= 0) return null;
    const data = c.getContext('2d')!.getImageData(x, y, w, h);
    return { rgba: data.data, width: w, height: h };
  };
}

type TesseractWorker = Awaited<ReturnType<typeof import('tesseract.js')['createWorker']>>;

function makeOcr(onStatus: (msg: string) => void): { engine: OcrEngine; close: () => Promise<void> } {
  let worker: TesseractWorker | null = null;
  return {
    engine: async (image, scale) => {
      if (!worker) {
        onStatus('Loading text recognition for scanned pages (first time only, about 7 MB)…');
        const { createWorker, OEM } = await import('tesseract.js');
        worker = await createWorker('eng', OEM.LSTM_ONLY, {
          workerPath: '/tesseract/worker.min.js',
          corePath: '/tesseract',
          langPath: '/tesseract',
          workerBlobURL: false,
        });
      }
      const canvas = makeCanvas(image.width, image.height);
      canvas.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(image.rgba), image.width, image.height), 0, 0);
      const { data } = await worker.recognize(canvas, {}, { blocks: true });
      canvas.width = canvas.height = 0;
      return tesseractBlocksToWords(data.blocks, scale);
    },
    close: async () => {
      if (worker) await worker.terminate();
      worker = null;
    },
  };
}

export interface BrowserConvertOptions {
  title: string;
  ocr: boolean;
  onStatus: (message: string, percent: number) => void;
}

/** Converts a PDF (bytes) to a .docx in the browser. */
export async function convertPdfToDocxInBrowser(bytes: ArrayBuffer, opts: BrowserConvertOptions): Promise<ConvertResult> {
  const pdfjsLib = await loadPdfjs();
  // Raw image pixels (not ImageBitmaps) so pictures can be copied into the Word file
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(bytes.slice(0)), isOffscreenCanvasSupported: false }).promise;
  const ocr = opts.ocr ? makeOcr((m) => opts.onStatus(m, 15)) : null;
  try {
    return await convertPdfToDocx(pdf as unknown as Parameters<typeof convertPdfToDocx>[0], {
      OPS: pdfjsLib.OPS as unknown as Record<string, number>,
      encodeImage: browserEncodeImage,
      renderRegion: makeRenderer(pdf),
      ocr: ocr?.engine,
      title: opts.title,
      onProgress: (stage, done, total) => {
        const n = Math.min(done + 1, total);
        if (stage === 'reading') opts.onStatus(`Reading page ${n} of ${total}…`, 5 + (done / total) * 35);
        else if (stage === 'ocr') opts.onStatus(`Recognising text on scanned page ${n}…`, 40 + (done / total) * 25);
        else if (stage === 'layout') opts.onStatus(`Rebuilding layout of page ${n} of ${total}…`, 65 + (done / total) * 20);
        else opts.onStatus('Writing the Word document…', done ? 100 : 90);
      },
    });
  } finally {
    await ocr?.close();
    await pdf.destroy();
  }
}
