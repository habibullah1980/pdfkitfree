'use client';

import { PDFDocument, PDFName, PDFNumber, PDFRawStream, PDFRef } from 'pdf-lib';
import { decodeToBitmap, filterNames } from './pdf-image-compress';

export interface ExtractedImage {
  name: string;
  bytes: Uint8Array;
  width: number;
  height: number;
}

export interface ImageExtractResult {
  images: ExtractedImage[];
  /** Images we found but could not convert (unusual colour spaces or encodings). */
  skipped: number;
}

const MIN_SIDE = 16; // ignore tiny decorations, bullets and spacer pixels

async function bitmapToPng(bitmap: ImageBitmap): Promise<Uint8Array> {
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available in this browser.');
  ctx.drawImage(bitmap, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  canvas.width = 0;
  if (!blob) throw new Error('Could not encode image.');
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Pulls the embedded pictures out of a PDF at their original resolution.
 * JPEG and JPEG 2000 images are saved byte-for-byte; other supported images are saved as PNG.
 */
export async function extractPdfImages(
  input: ArrayBuffer | Uint8Array,
  onProgress?: (done: number, total: number) => void
): Promise<ImageExtractResult> {
  const doc = await PDFDocument.load(input, { updateMetadata: false });
  const context = doc.context;

  // Soft masks are images too, but they are transparency data, not pictures.
  const maskRefs = new Set<string>();
  const candidates: [PDFRef, PDFRawStream][] = [];
  for (const [ref, obj] of context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    const sub = obj.dict.lookup(PDFName.of('Subtype'));
    if (!(sub instanceof PDFName) || sub.decodeText() !== 'Image') continue;
    const smask = obj.dict.get(PDFName.of('SMask'));
    if (smask instanceof PDFRef) maskRefs.add(smask.toString());
    const mask = obj.dict.get(PDFName.of('Mask'));
    if (mask instanceof PDFRef) maskRefs.add(mask.toString());
    candidates.push([ref, obj]);
  }

  const images: ExtractedImage[] = [];
  let skipped = 0;
  let n = 0;
  for (let i = 0; i < candidates.length; i++) {
    onProgress?.(i, candidates.length);
    const [ref, stream] = candidates[i];
    if (maskRefs.has(ref.toString())) continue;
    const dict = stream.dict;
    const imageMask = dict.lookup(PDFName.of('ImageMask'));
    if (imageMask && String(imageMask) === 'true') continue;
    const w = dict.lookup(PDFName.of('Width'));
    const h = dict.lookup(PDFName.of('Height'));
    if (!(w instanceof PDFNumber) || !(h instanceof PDFNumber)) continue;
    const width = w.asNumber();
    const height = h.asNumber();
    if (width < MIN_SIDE || height < MIN_SIDE) continue;

    const filters = filterNames(dict);
    try {
      if (filters.length === 1 && (filters[0] === 'DCTDecode' || filters[0] === 'JPXDecode')) {
        n++;
        const ext = filters[0] === 'DCTDecode' ? 'jpg' : 'jp2';
        images.push({ name: `image-${String(n).padStart(3, '0')}.${ext}`, bytes: new Uint8Array(stream.contents), width, height });
        continue;
      }
      const bitmap = await decodeToBitmap(stream, width, height);
      if (!bitmap) {
        skipped++;
        continue;
      }
      const png = await bitmapToPng(bitmap);
      bitmap.close();
      n++;
      images.push({ name: `image-${String(n).padStart(3, '0')}.png`, bytes: png, width, height });
    } catch {
      skipped++;
    }
  }
  onProgress?.(candidates.length, candidates.length);
  return { images, skipped };
}
