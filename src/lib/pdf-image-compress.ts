'use client';

import {
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFRawStream,
  PDFDict,
  PDFArray,
  PDFRef,
  decodePDFRawStream,
} from 'pdf-lib';

export interface ImageCompressOptions {
  /** Longest side of a re-encoded image, in pixels. */
  maxDimension: number;
  /** JPEG quality, 0..1. */
  quality: number;
  /** Called with (done, total) while images are processed. */
  onProgress?: (done: number, total: number) => void;
}

export interface ImageCompressResult {
  bytes: Uint8Array;
  imagesFound: number;
  imagesRecompressed: number;
}

const MIN_IMAGE_BYTES = 16 * 1024; // smaller images are not worth touching

function nameOf(dict: PDFDict, key: string): string | undefined {
  const v = dict.lookup(PDFName.of(key));
  return v instanceof PDFName ? v.decodeText() : undefined;
}

function filterNames(dict: PDFDict): string[] {
  const f = dict.lookup(PDFName.of('Filter'));
  if (f instanceof PDFName) return [f.decodeText()];
  if (f instanceof PDFArray) return f.asArray().map((x) => (x instanceof PDFName ? x.decodeText() : '?'));
  return [];
}

/** Number of colour components for the colour spaces we can safely re-encode, else null. */
function componentsOf(dict: PDFDict): number | null {
  const cs = dict.lookup(PDFName.of('ColorSpace'));
  if (cs instanceof PDFName) {
    const n = cs.decodeText();
    if (n === 'DeviceRGB') return 3;
    if (n === 'DeviceGray') return 1;
    return null;
  }
  if (cs instanceof PDFArray && cs.size() === 2) {
    const kind = cs.lookup(0);
    const profile = cs.lookup(1);
    if (kind instanceof PDFName && kind.decodeText() === 'ICCBased' && profile instanceof PDFRawStream) {
      const n = profile.dict.lookup(PDFName.of('N'));
      if (n instanceof PDFNumber && (n.asNumber() === 3 || n.asNumber() === 1)) return n.asNumber();
    }
  }
  return null;
}

/** Reverses PNG row filters (PDF Predictor 10-15) for 8-bit samples. Returns null on malformed data. */
export function undoPngPredictor(data: Uint8Array, rowBytes: number, bpp: number, rows: number): Uint8Array | null {
  if (data.length < (rowBytes + 1) * rows) return null;
  const out = new Uint8Array(rowBytes * rows);
  for (let r = 0; r < rows; r++) {
    const type = data[r * (rowBytes + 1)];
    const src = r * (rowBytes + 1) + 1;
    const dst = r * rowBytes;
    const prev = dst - rowBytes;
    for (let i = 0; i < rowBytes; i++) {
      const x = data[src + i];
      const a = i >= bpp ? out[dst + i - bpp] : 0;
      const b = r > 0 ? out[prev + i] : 0;
      const c = r > 0 && i >= bpp ? out[prev + i - bpp] : 0;
      let v: number;
      switch (type) {
        case 0: v = x; break;
        case 1: v = x + a; break;
        case 2: v = x + b; break;
        case 3: v = x + ((a + b) >> 1); break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default: return null;
      }
      out[dst + i] = v & 0xff;
    }
  }
  return out;
}

async function decodeToBitmap(stream: PDFRawStream, width: number, height: number): Promise<ImageBitmap | null> {
  const dict = stream.dict;
  const filters = filterNames(dict);
  const comps = componentsOf(dict);
  if (comps === null) return null; // CMYK, Indexed, Lab, etc.: leave untouched
  if (dict.lookup(PDFName.of('Decode'))) return null; // inverted/remapped samples: leave untouched

  if (filters.length === 1 && filters[0] === 'DCTDecode') {
    return createImageBitmap(new Blob([new Uint8Array(stream.contents)], { type: 'image/jpeg' }));
  }

  if (filters.length === 1 && filters[0] === 'FlateDecode') {
    const bpc = dict.lookup(PDFName.of('BitsPerComponent'));
    if (!(bpc instanceof PDFNumber) || bpc.asNumber() !== 8) return null;
    const parms = dict.lookup(PDFName.of('DecodeParms'));
    let raw = decodePDFRawStream(stream).decode();
    if (parms) {
      if (!(parms instanceof PDFDict)) return null;
      const num = (k: string, d: number) => {
        const v = parms.lookup(PDFName.of(k));
        return v instanceof PDFNumber ? v.asNumber() : d;
      };
      const predictor = num('Predictor', 1);
      if (predictor >= 10) {
        if (num('Colors', 1) !== comps || num('BitsPerComponent', 8) !== 8 || num('Columns', 1) !== width) return null;
        const un = undoPngPredictor(raw, width * comps, comps, height);
        if (!un) return null;
        raw = un;
      } else if (predictor !== 1) {
        return null; // TIFF predictor: leave untouched
      }
    }
    if (raw.length < width * height * comps) return null;
    const rgba = new Uint8ClampedArray(width * height * 4);
    for (let i = 0, j = 0; i < width * height; i++, j += comps) {
      const o = i * 4;
      if (comps === 3) {
        rgba[o] = raw[j];
        rgba[o + 1] = raw[j + 1];
        rgba[o + 2] = raw[j + 2];
      } else {
        rgba[o] = rgba[o + 1] = rgba[o + 2] = raw[j];
      }
      rgba[o + 3] = 255;
    }
    return createImageBitmap(new ImageData(rgba, width, height));
  }
  return null;
}

async function encodeJpeg(bitmap: ImageBitmap, maxDim: number, quality: number) {
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available in this browser.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  canvas.width = 0;
  if (!blob) throw new Error('Could not encode image.');
  return { bytes: new Uint8Array(await blob.arrayBuffer()), width: w, height: h };
}

/**
 * Shrinks a PDF by downscaling and re-encoding its embedded photos/scans as JPEG.
 * Text, vector graphics, fonts and links are left exactly as they are, so the
 * document stays sharp and searchable. Images that would not get smaller, use
 * colour spaces we cannot reproduce exactly, or are masks are left untouched.
 */
export async function compressPdfImages(input: ArrayBuffer | Uint8Array, opts: ImageCompressOptions): Promise<ImageCompressResult> {
  const doc = await PDFDocument.load(input, { updateMetadata: false });
  const context = doc.context;

  const candidates: [PDFRef, PDFRawStream][] = [];
  for (const [ref, obj] of context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    if (nameOf(obj.dict, 'Subtype') !== 'Image') continue;
    candidates.push([ref, obj]);
  }

  let recompressed = 0;
  for (let i = 0; i < candidates.length; i++) {
    opts.onProgress?.(i, candidates.length);
    const [ref, stream] = candidates[i];
    const dict = stream.dict;
    try {
      if (stream.contents.length < MIN_IMAGE_BYTES) continue;
      const imageMask = dict.lookup(PDFName.of('ImageMask'));
      if (imageMask && String(imageMask) === 'true') continue;
      const wObj = dict.lookup(PDFName.of('Width'));
      const hObj = dict.lookup(PDFName.of('Height'));
      if (!(wObj instanceof PDFNumber) || !(hObj instanceof PDFNumber)) continue;
      const width = wObj.asNumber();
      const height = hObj.asNumber();

      const bitmap = await decodeToBitmap(stream, width, height);
      if (!bitmap) continue;
      const jpeg = await encodeJpeg(bitmap, opts.maxDimension, opts.quality);
      bitmap.close();
      if (jpeg.bytes.length >= stream.contents.length * 0.9) continue; // not worth it

      const newDict: Record<string, unknown> = {
        Type: 'XObject',
        Subtype: 'Image',
        Width: jpeg.width,
        Height: jpeg.height,
        ColorSpace: 'DeviceRGB',
        BitsPerComponent: 8,
        Filter: 'DCTDecode',
      };
      const smask = dict.get(PDFName.of('SMask'));
      const newStream = context.stream(jpeg.bytes, newDict as Parameters<typeof context.stream>[1]);
      if (smask) newStream.dict.set(PDFName.of('SMask'), smask); // soft mask scales to the image box
      context.assign(ref, newStream);
      recompressed++;
    } catch {
      // Leave any image we cannot decode exactly as it was.
    }
  }
  opts.onProgress?.(candidates.length, candidates.length);

  const bytes = await doc.save({ useObjectStreams: true });
  return { bytes, imagesFound: candidates.length, imagesRecompressed: recompressed };
}
