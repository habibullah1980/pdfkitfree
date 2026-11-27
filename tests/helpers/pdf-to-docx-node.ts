/**
 * Node adapters for the PDF -> DOCX converter (the browser uses <canvas> for the same jobs):
 * pdf.js loading, PNG encoding, page rendering with @napi-rs/canvas and Tesseract OCR.
 */
import zlib from 'node:zlib';
import path from 'node:path';
import { createRequire } from 'node:module';
import * as napi from '@napi-rs/canvas';
import type { EncodedImage, OcrEngine, RegionRenderer } from '../../src/lib/pdf-to-docx/types';
import { tesseractBlocksToWords } from '../../src/lib/pdf-to-docx/tesseract-words';

const g = globalThis as Record<string, unknown>;
g.DOMMatrix ??= napi.DOMMatrix;
g.Path2D ??= napi.Path2D;
g.ImageData ??= napi.ImageData;

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-var-requires
export const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');

class NapiCanvasFactory {
  create(width: number, height: number) {
    const canvas = napi.createCanvas(Math.max(1, Math.ceil(width)), Math.max(1, Math.ceil(height)));
    return { canvas, context: canvas.getContext('2d') };
  }
  reset(cc: { canvas: napi.Canvas }, width: number, height: number) {
    cc.canvas.width = Math.ceil(width);
    cc.canvas.height = Math.ceil(height);
  }
  destroy(cc: { canvas: napi.Canvas | null }) {
    if (cc.canvas) {
      cc.canvas.width = 0;
      cc.canvas.height = 0;
    }
    cc.canvas = null;
  }
}

export async function loadPdf(bytes: Uint8Array) {
  const pdfDir = path.dirname(require.resolve('pdfjs-dist/package.json'));
  return pdfjs.getDocument({
    data: bytes.slice(),
    isOffscreenCanvasSupported: false,
    disableFontFace: true,
    useSystemFonts: false,
    standardFontDataUrl: path.join(pdfDir, 'standard_fonts') + '/',
    canvasFactory: new NapiCanvasFactory(),
    verbosity: 0,
  }).promise;
}

function crc32(buf: Uint8Array) {
  let c: number;
  const table = (crc32 as unknown as { t?: number[] }).t || ((crc32 as unknown as { t?: number[] }).t = Array.from({ length: 256 }, (_, n) => {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  }));
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export function encodePng(rgba: Uint8ClampedArray, w: number, h: number): Uint8Array {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

export async function nodeEncodeImage(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  opts: { targetWidth: number; targetHeight: number; opaque: boolean }
): Promise<EncodedImage> {
  const src = napi.createCanvas(width, height);
  src.getContext('2d').putImageData(new napi.ImageData(new Uint8ClampedArray(rgba), width, height) as unknown as globalThis.ImageData, 0, 0);
  const dst = napi.createCanvas(opts.targetWidth, opts.targetHeight);
  dst.getContext('2d').drawImage(src, 0, 0, opts.targetWidth, opts.targetHeight);
  if (opts.opaque && opts.targetWidth * opts.targetHeight > 40000) {
    return { data: new Uint8Array(await dst.encode('jpeg', 88)), type: 'jpeg' };
  }
  return { data: new Uint8Array(await dst.encode('png')), type: 'png' };
}

/** Renders page regions with pdf.js onto @napi-rs/canvas, caching one render per page and scale. */
export function makeNodeRenderer(pdf: { getPage(n: number): Promise<any> }): RegionRenderer {
  const cache = new Map<string, napi.Canvas>();
  return async (pageIndex, region, scale) => {
    const key = `${pageIndex}@${scale}`;
    let canvas = cache.get(key);
    if (!canvas) {
      const page = await pdf.getPage(pageIndex + 1);
      const viewport = page.getViewport({ scale });
      canvas = napi.createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      cache.clear();
      cache.set(key, canvas);
    }
    const x = Math.max(0, Math.floor(region.x0 * scale));
    const y = Math.max(0, Math.floor(region.y0 * scale));
    const w = Math.min(canvas.width - x, Math.ceil((region.x1 - region.x0) * scale));
    const h = Math.min(canvas.height - y, Math.ceil((region.y1 - region.y0) * scale));
    if (w <= 0 || h <= 0) return null;
    const data = canvas.getContext('2d').getImageData(x, y, w, h);
    return { rgba: new Uint8ClampedArray(data.data), width: w, height: h };
  };
}

export function makeNodeOcr(): { engine: OcrEngine; close: () => Promise<void> } {
  let worker: any = null;
  return {
    engine: async (image, scale) => {
      if (!worker) {
        const { createWorker, OEM } = require('tesseract.js');
        const langDir = path.join(path.dirname(require.resolve('@tesseract.js-data/eng/package.json')), '4.0.0_best_int');
        worker = await createWorker('eng', OEM.LSTM_ONLY, { langPath: langDir, gzip: true, cachePath: path.join(process.cwd(), 'node_modules/.cache/tesseract') });
      }
      const png = encodePng(image.rgba, image.width, image.height);
      const { data } = await worker.recognize(Buffer.from(png), {}, { blocks: true });
      return tesseractBlocksToWords(data.blocks, scale);
    },
    close: async () => {
      if (worker) await worker.terminate();
    },
  };
}
