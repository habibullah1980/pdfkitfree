/** Browser-side helpers shared by the image tools. Nothing here uploads anything. */

export type DecodedImage = { source: CanvasImageSource; width: number; height: number; close: () => void };

export function isHeicFile(f: File) {
  return /\.(heic|heif)$/i.test(f.name) || /^image\/hei[cf]/i.test(f.type);
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

async function decodeWithImgTag(file: Blob): Promise<DecodedImage> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  try {
    await img.decode();
  } catch {
    URL.revokeObjectURL(url);
    throw new Error('This file could not be opened as an image.');
  }
  return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
}

/**
 * Decodes JPG, PNG, WebP, GIF, AVIF and HEIC/HEIF. HEIC uses the browser's own
 * decoder when it has one (Safari), otherwise a WebAssembly decoder that is
 * only downloaded the first time someone opens a HEIC photo.
 */
export async function decodeImage(file: File): Promise<DecodedImage> {
  if (!isHeicFile(file)) return decodeWithImgTag(file);

  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file);
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch {
      // Not supported natively (Chrome, Firefox, Edge): fall through.
    }
  }
  const { heicTo } = await import('heic-to/next');
  try {
    const bmp = await heicTo({ blob: file, type: 'bitmap' });
    return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
  } catch {
    throw new Error('This HEIC photo could not be read. It may be damaged or use a format we do not support yet.');
  }
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Your browser could not save the image.'))),
      type,
      quality
    )
  );
}

/** Draws an image at a new size. JPG output gets a white background instead of black. */
export function drawToCanvas(img: DecodedImage, w: number, h: number, opaque: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser blocked image editing.');
  if (opaque) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img.source, 0, 0, w, h);
  return canvas;
}

export function baseName(name: string) {
  return name.replace(/\.[^.]+$/, '') || 'image';
}
