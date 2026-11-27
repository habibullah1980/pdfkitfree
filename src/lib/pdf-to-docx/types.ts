/**
 * Shared types for the layout-aware PDF -> DOCX converter.
 * All coordinates are in PDF points with a TOP-LEFT origin (y grows downwards),
 * already corrected for page rotation and crop box offsets.
 */

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface FontInfo {
  /** Family name as shown in Word, e.g. "Arial", "Times New Roman". */
  family: string;
  /** Family name as written in the PDF (subset prefix removed). */
  originalFamily: string;
  bold: boolean;
  italic: boolean;
  serif: boolean;
  mono: boolean;
}

/** One run of glyphs that share font, size, colour and baseline. */
export interface TextSpan {
  text: string;
  x0: number;
  x1: number;
  /** Baseline y. */
  baseline: number;
  /** Font size in points (already multiplied by the text matrix). */
  size: number;
  font: FontInfo;
  /** Hex colour without '#', e.g. "1F2937". */
  color: string;
  /** Invisible text (OCR layers) */
  invisible: boolean;
  /** Text not drawn horizontally (rotated labels). */
  rotated: boolean;
  underline?: boolean;
  strike?: boolean;
  link?: string;
  rtl?: boolean;
}

export interface FilledRect extends Box {
  color: string;
}

/** Horizontal or vertical rule (stroked line or very thin filled rectangle). */
export interface Rule {
  orient: 'h' | 'v';
  /** For 'h': y position; for 'v': x position. */
  pos: number;
  /** Start and end along the rule direction. */
  a: number;
  b: number;
  width: number;
  color: string;
  /** Not drawn: an edge implied by touching shaded cells. */
  virtual?: boolean;
}

export interface PageImage extends Box {
  /** RGBA pixels, row-major, top row first (already corrected for flips). */
  rgba: Uint8ClampedArray;
  width: number;
  height: number;
  /** True when every pixel is fully opaque. */
  opaque: boolean;
}

export interface PageModel {
  index: number;
  width: number;
  height: number;
  spans: TextSpan[];
  rects: FilledRect[];
  rules: Rule[];
  images: PageImage[];
  /** Areas drawn with curves, diagonal lines, gradients or patterns (logos, charts, diagrams). */
  graphics: (Box & { fill?: string })[];
  /** True when the page looks like a scan with no real text. */
  scanned: boolean;
  /** True when the text came from OCR in this converter. */
  ocr: boolean;
}

/** Encoded picture ready for the DOCX package. */
export interface EncodedImage {
  data: Uint8Array;
  type: 'png' | 'jpeg';
}

/** Converts raw RGBA pixels to PNG/JPEG, scaling to the given size. */
export type ImageEncoder = (
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  opts: { targetWidth: number; targetHeight: number; opaque: boolean }
) => Promise<EncodedImage>;

/** Renders part of a page (top-left PDF points) to an image. Used for vector graphics and OCR. */
export type RegionRenderer = (
  pageIndex: number,
  region: Box,
  scale: number
) => Promise<{ rgba: Uint8ClampedArray; width: number; height: number } | null>;

/** A word found by OCR, in PDF points with top-left origin. */
export interface OcrWord extends Box {
  text: string;
  /** Baseline y if the OCR engine reports it. */
  baseline?: number;
  /** Index of the OCR line this word belongs to. */
  line: number;
  confidence: number;
}

export type OcrEngine = (
  image: { rgba: Uint8ClampedArray; width: number; height: number },
  scale: number,
  onProgress?: (p: number) => void
) => Promise<OcrWord[]>;

export interface ConversionReport {
  pages: number;
  scannedPages: number[];
  ocrPages: number[];
  tables: number;
  images: number;
  graphics: number;
  headers: boolean;
  footers: boolean;
  pageNumbers: boolean;
  columnsPages: number[];
  warnings: string[];
}
