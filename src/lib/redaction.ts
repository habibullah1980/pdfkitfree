/**
 * Geometry helpers for redaction. Pure functions (no DOM), so they run in tests too.
 *
 * Coordinates are PDF points in a top-left-origin space at scale 1
 * (the same space as a pdf.js viewport created with scale 1 and the page's rotation).
 */

export interface RedactionBox {
  page: number; // 1-based
  x: number;
  y: number;
  width: number;
  height: number;
  source: 'search' | 'manual';
  label?: string;
}

/** Minimal shape of a pdf.js text item that we need. */
export interface TextItemLike {
  str: string;
  transform: number[]; // [a, b, c, d, e, f] in PDF text space
  width: number; // advance width in page units
  height?: number;
}

/** Multiplies two 2D affine matrices (same convention as pdf.js Util.transform). */
export function multiplyTransform(m1: number[], m2: number[]): number[] {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

/** Splits user input ("SSN, 123-45-6789\nAcme") into distinct non-empty search terms. */
export function parseSearchTerms(input: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input.split(/[\n,;]+/)) {
    const term = raw.trim();
    if (term.length === 0) continue;
    const key = term.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(term);
    }
  }
  return out;
}

/**
 * Finds every case-insensitive occurrence of the terms in one page's text items and
 * returns a covering box for each. Boxes are padded generously, because over-covering
 * by a fraction of a character is safe and under-covering leaks data.
 *
 * Only horizontal text is matched precisely; for rotated text the whole item is covered.
 */
export function findTermBoxes(
  items: TextItemLike[],
  terms: string[],
  viewportTransform: number[],
  pageNumber: number
): RedactionBox[] {
  const boxes: RedactionBox[] = [];
  const needles = terms.map((t) => t.toLowerCase()).filter(Boolean);
  if (needles.length === 0) return boxes;

  for (const item of items) {
    if (!item.str) continue;
    const hay = item.str.toLowerCase();
    const tx = multiplyTransform(viewportTransform, item.transform);
    const fontHeight = Math.hypot(tx[2], tx[3]) || Math.abs(item.height || 0) || 10;
    const scaleX = Math.hypot(viewportTransform[0], viewportTransform[1]) || 1;
    const itemWidth = Math.abs(item.width) * scaleX;
    const rotated = Math.abs(tx[1]) > 1e-3 || Math.abs(tx[2]) > 1e-3;

    for (const needle of needles) {
      let from = 0;
      for (;;) {
        const idx = hay.indexOf(needle, from);
        if (idx < 0) break;
        from = idx + needle.length;

        const len = item.str.length || 1;
        const charW = itemWidth / len;
        const padX = Math.max(1.5, charW * 0.35);
        const padY = fontHeight * 0.25;

        let x: number, y: number, w: number, h: number;
        if (rotated) {
          // Cover the whole item's bounding square conservatively.
          const span = Math.max(itemWidth, fontHeight) + fontHeight;
          x = tx[4] - span;
          y = tx[5] - span;
          w = span * 2;
          h = span * 2;
        } else {
          x = tx[4] + charW * idx - padX;
          y = tx[5] - fontHeight - padY; // baseline minus ascent, minus padding
          w = charW * needle.length + padX * 2;
          h = fontHeight * 1.25 + padY * 2; // include descenders
        }
        boxes.push({ page: pageNumber, x, y, width: w, height: h, source: 'search', label: item.str.slice(idx, idx + needle.length) });
      }
    }
  }
  return boxes;
}

/** Normalises a drag rectangle (any direction) into a box with positive size. */
export function boxFromDrag(page: number, x1: number, y1: number, x2: number, y2: number): RedactionBox {
  return {
    page,
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
    source: 'manual',
  };
}
