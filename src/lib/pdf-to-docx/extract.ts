/**
 * Reads one PDF page through pdf.js and returns a layout model:
 * positioned text runs with real font/size/colour, filled boxes, ruling lines, images and
 * the areas covered by vector drawings. Works in the browser and in Node (no DOM needed).
 *
 * We walk pdf.js's operator list ourselves (instead of getTextContent) because only the
 * operator list carries colours, render modes and the drawings that make up tables.
 */
import { resolveFont } from './fonts';
import type { Box, FilledRect, FontInfo, PageImage, PageModel, Rule, TextSpan } from './types';

type Matrix = [number, number, number, number, number, number];

/* Minimal structural types for the parts of pdf.js we use (keeps this file free of DOM types). */
interface PdfjsGlyph {
  unicode?: string;
  width?: number;
  isSpace?: boolean;
}
interface PdfjsFont {
  name?: string;
  loadedName?: string;
  bold?: boolean;
  black?: boolean;
  italic?: boolean;
  isSerifFont?: boolean;
  isMonospace?: boolean;
  fallbackName?: string;
  fontMatrix?: number[];
  vertical?: boolean;
  isType3Font?: boolean;
}
interface PdfjsObjs {
  get(id: string, cb?: (o: unknown) => void): unknown;
  has?(id: string): boolean;
}
export interface PdfjsPage {
  view: number[];
  rotate: number;
  getViewport(opts: { scale: number; rotation?: number }): { width: number; height: number; transform: number[] };
  getOperatorList(): Promise<{ fnArray: number[]; argsArray: unknown[][] }>;
  getAnnotations(): Promise<{ subtype?: string; url?: string; rect?: number[] }[]>;
  objs: PdfjsObjs;
  commonObjs: PdfjsObjs;
}
export type OpsTable = Record<string, number>;

const mul = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];
const apply = (m: Matrix, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

const hex = (r: number, g: number, b: number) =>
  [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();

function isWhite(c: string) {
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return r > 245 && g > 245 && b > 245;
}

interface GState {
  ctm: Matrix;
  fill: string;
  stroke: string;
  lineWidth: number;
  fontId: string;
  fontSize: number;
  charSpacing: number;
  wordSpacing: number;
  hScale: number;
  leading: number;
  rise: number;
  renderMode: number;
  fillAlpha: number;
  clip: Box | null;
}

async function getObj(objs: PdfjsObjs, id: string): Promise<unknown> {
  return new Promise((resolve) => {
    try {
      const v = objs.get(id, (o: unknown) => resolve(o));
      if (v != null) resolve(v);
    } catch {
      resolve(null);
    }
  });
}

/** Converts pdf.js decoded image data into RGBA. */
function toRgba(img: { width: number; height: number; kind?: number; data?: Uint8ClampedArray | Uint8Array }): Uint8ClampedArray | null {
  const { width, height, kind, data } = img;
  if (!data || !width || !height) return null;
  const n = width * height;
  const out = new Uint8ClampedArray(n * 4);
  if (kind === 3) {
    out.set(data.subarray(0, n * 4));
  } else if (kind === 2) {
    for (let i = 0, j = 0; i < n; i++, j += 3) {
      out[i * 4] = data[j];
      out[i * 4 + 1] = data[j + 1];
      out[i * 4 + 2] = data[j + 2];
      out[i * 4 + 3] = 255;
    }
  } else if (kind === 1) {
    const rowBytes = (width + 7) >> 3;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const bit = (data[y * rowBytes + (x >> 3)] >> (7 - (x & 7))) & 1;
        const v = bit ? 255 : 0;
        const i = (y * width + x) * 4;
        out[i] = out[i + 1] = out[i + 2] = v;
        out[i + 3] = 255;
      }
    }
  } else {
    return null;
  }
  return out;
}

/** 1-bit stencil mask painted in the current fill colour. */
function maskToRgba(img: { width: number; height: number; data?: Uint8ClampedArray | Uint8Array }, color: string): Uint8ClampedArray | null {
  const { width, height, data } = img;
  if (!data || !width || !height) return null;
  const r = parseInt(color.slice(0, 2), 16);
  const g = parseInt(color.slice(2, 4), 16);
  const b = parseInt(color.slice(4, 6), 16);
  const rowBytes = (width + 7) >> 3;
  const out = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const bit = (data[y * rowBytes + (x >> 3)] >> (7 - (x & 7))) & 1;
      const i = (y * width + x) * 4;
      out[i] = r;
      out[i + 1] = g;
      out[i + 2] = b;
      out[i + 3] = bit ? 0 : 255; // image masks paint where the bit is 0
    }
  }
  return out;
}

/**
 * Re-orders pixels so the image reads the way it is shown on the page.
 * `m` maps the image unit square to top-left page space; pdf.js stores row 0 as the top of the image (v = 1).
 */
function orientPixels(rgba: Uint8ClampedArray, w: number, h: number, m: Matrix): { rgba: Uint8ClampedArray; width: number; height: number } {
  const [a, b, c, d] = m;
  const rotated = Math.abs(b) > Math.abs(a);
  if (!rotated && a > 0 && d < 0) return { rgba, width: w, height: h };
  const ow = rotated ? h : w;
  const oh = rotated ? w : h;
  const out = new Uint8ClampedArray(ow * oh * 4);
  const minX = Math.min(0, a) + Math.min(0, c);
  const minY = Math.min(0, b) + Math.min(0, d);
  const spanX = Math.abs(a) + Math.abs(c) || 1;
  const spanY = Math.abs(b) + Math.abs(d) || 1;
  for (let y = 0; y < h; y++) {
    const v = 1 - (y + 0.5) / h;
    for (let x = 0; x < w; x++) {
      const u = (x + 0.5) / w;
      const px = a * u + c * v;
      const py = b * u + d * v;
      const ox = Math.min(ow - 1, Math.floor(((px - minX) / spanX) * ow));
      const oy = Math.min(oh - 1, Math.floor(((py - minY) / spanY) * oh));
      const si = (y * w + x) * 4;
      const di = (oy * ow + ox) * 4;
      out[di] = rgba[si];
      out[di + 1] = rgba[si + 1];
      out[di + 2] = rgba[si + 2];
      out[di + 3] = rgba[si + 3];
    }
  }
  return { rgba: out, width: ow, height: oh };
}

const SPACE_LIKE = /^[\s ]+$/;
const LIGATURES: Record<string, string> = { 'ﬀ': 'ff', 'ﬁ': 'fi', 'ﬂ': 'fl', 'ﬃ': 'ffi', 'ﬄ': 'ffl', 'ﬅ': 'st', 'ﬆ': 'st' };

export async function extractPage(page: PdfjsPage, index: number, OPS: OpsTable, rotation?: number): Promise<PageModel> {
  const viewport = page.getViewport(rotation == null ? { scale: 1 } : { scale: 1, rotation });
  const V = viewport.transform as Matrix;
  const opList = await page.getOperatorList();
  const { fnArray, argsArray } = opList;

  const spans: TextSpan[] = [];
  const rects: FilledRect[] = [];
  const rules: Rule[] = [];
  const images: PageImage[] = [];
  const graphics: (Box & { fill?: string })[] = [];
  const pageArea = viewport.width * viewport.height;

  const fontCache = new Map<string, { info: FontInfo; font: PdfjsFont }>();
  const fontFor = async (id: string) => {
    let f = fontCache.get(id);
    if (!f) {
      const font = ((await getObj(page.commonObjs, id)) || {}) as PdfjsFont;
      const info = resolveFont(font.name || font.fallbackName || 'Arial', {
        bold: font.bold,
        black: font.black,
        italic: font.italic,
        serif: font.isSerifFont,
        mono: font.isMonospace,
      });
      f = { info, font };
      fontCache.set(id, f);
    }
    return f;
  };

  let gs: GState = {
    ctm: [1, 0, 0, 1, 0, 0],
    fill: '000000',
    stroke: '000000',
    lineWidth: 1,
    fontId: '',
    fontSize: 0,
    charSpacing: 0,
    wordSpacing: 0,
    hScale: 1,
    leading: 0,
    rise: 0,
    renderMode: 0,
    fillAlpha: 1,
    clip: null,
  };
  const stack: GState[] = [];
  let tm: Matrix = [1, 0, 0, 1, 0, 0];
  let tlm: Matrix = [1, 0, 0, 1, 0, 0];
  let pendingPath: { ops: number[]; coords: number[] } | null = null;
  // Text currently being collected into a span
  let cur: { span: TextSpan; endX: number } | null = null;

  const flush = () => {
    if (cur && cur.span.text.replace(SPACE_LIKE, '').length > 0) {
      cur.span.text = cur.span.text.replace(/\s+$/, (m) => (m.length ? ' ' : ''));
      spans.push(cur.span);
    }
    cur = null;
  };


  const showText = async (glyphs: (PdfjsGlyph | number)[]) => {
    if (!gs.fontId) return;
    const { info, font } = await fontFor(gs.fontId);
    const fontMatrix = (font.fontMatrix as Matrix | undefined) || [0.001, 0, 0, 0.001, 0, 0];
    const size = gs.fontSize;
    const widthScale = size * fontMatrix[0];
    const full = mul(V, mul(gs.ctm, tm));
    // Effective size and orientation on the page
    const sx = Math.hypot(full[0], full[1]);
    const sy = Math.hypot(full[2], full[3]);
    const effSize = Math.abs(size) * sy;
    const rotated = Math.abs(full[1]) > 0.01 * sx || Math.abs(full[2]) > 0.01 * sy || full[0] < 0;
    const invisible = gs.renderMode === 3 || gs.renderMode === 7 || gs.fillAlpha === 0;
    const color = gs.renderMode === 1 || gs.renderMode === 5 ? gs.stroke : gs.fill;
    let x = 0;
    for (const g of glyphs) {
      if (typeof g === 'number') {
        x -= (g * size) / 1000;
        continue;
      }
      const isSpace = !!g.isSpace;
      const spacing = (isSpace ? gs.wordSpacing : 0) + gs.charSpacing;
      const adv = (g.width || 0) * widthScale + spacing;
      let ch = g.unicode ?? '';
      if (LIGATURES[ch]) ch = LIGATURES[ch];
      const [px, py] = apply(full, x, gs.rise);
      const [ex] = apply(full, x + (g.width || 0) * widthScale, gs.rise);
      const glyphStart = Math.min(px, ex);
      const glyphEnd = Math.max(px, ex);
      const baseline = py;
      if (ch && !SPACE_LIKE.test(ch)) {
        const span = cur?.span;
        const sameStyle =
          span &&
          span.font === info &&
          Math.abs(span.size - effSize) < 0.1 &&
          span.color === color &&
          span.invisible === invisible &&
          span.rotated === rotated;
        const sameLine = span && Math.abs(span.baseline - baseline) < Math.max(0.5, effSize * 0.15);
        const gap = cur ? glyphStart - cur.endX : 0;
        const charW = Math.max(effSize * 0.1, glyphEnd - glyphStart);
        const continues = rotated ? !!(sameStyle && span) : !!(sameStyle && sameLine && gap > -charW * 1.5 && gap < effSize * 1.2);
        if (!continues) {
          flush();
          cur = {
            span: { text: '', x0: glyphStart, x1: glyphEnd, baseline, size: effSize, font: info, color, invisible, rotated },
            endX: glyphStart,
          };
        }
        const c = cur as unknown as { span: TextSpan; endX: number };
        if (!rotated && c.span.text && gap > effSize * 0.18 && !/\s$/.test(c.span.text)) c.span.text += ' ';
        c.span.text += ch;
        c.span.x1 = Math.max(c.span.x1, glyphEnd);
        c.endX = Math.max(c.endX, glyphEnd);
      } else if (cur && ch) {
        if (!/\s$/.test(cur.span.text)) cur.span.text += ' ';
        cur.endX = Math.max(cur.endX, glyphEnd);
      }
      x += adv * gs.hScale;
    }
    tm = mul(tm, [1, 0, 0, 1, x, 0]);
  };

  const emitPath = (paint: { fill: boolean; stroke: boolean }) => {
    const p = pendingPath;
    pendingPath = null;
    if (!p) return;
    const m = mul(V, gs.ctm);
    const lw = Math.max(0.1, gs.lineWidth * Math.hypot(m[0], m[1]));
    let i = 0;
    let complex = false;
    let start: [number, number] | null = null;
    let last: [number, number] | null = null;
    const segs: [number, number, number, number][] = [];
    const bbox = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    const grow = (x: number, y: number) => {
      bbox.x0 = Math.min(bbox.x0, x);
      bbox.y0 = Math.min(bbox.y0, y);
      bbox.x1 = Math.max(bbox.x1, x);
      bbox.y1 = Math.max(bbox.y1, y);
    };
    const rectsHere: Box[] = [];
    for (const op of p.ops) {
      if (op === OPS.rectangle) {
        const [x, y, w, h] = p.coords.slice(i, i + 4);
        i += 4;
        const c1 = apply(m, x, y);
        const c2 = apply(m, x + w, y + h);
        const c3 = apply(m, x + w, y);
        const axis = Math.abs(c3[1] - c1[1]) < 0.01 || Math.abs(c3[0] - c1[0]) < 0.01;
        if (!axis) complex = true;
        const r = { x0: Math.min(c1[0], c2[0]), y0: Math.min(c1[1], c2[1]), x1: Math.max(c1[0], c2[0]), y1: Math.max(c1[1], c2[1]) };
        rectsHere.push(r);
        grow(r.x0, r.y0);
        grow(r.x1, r.y1);
      } else if (op === OPS.moveTo) {
        const pt = apply(m, p.coords[i], p.coords[i + 1]);
        i += 2;
        start = last = pt;
        grow(pt[0], pt[1]);
      } else if (op === OPS.lineTo) {
        const pt = apply(m, p.coords[i], p.coords[i + 1]);
        i += 2;
        if (last) segs.push([last[0], last[1], pt[0], pt[1]]);
        last = pt;
        grow(pt[0], pt[1]);
      } else if (op === OPS.curveTo) {
        for (let k = 0; k < 3; k++) {
          const pt = apply(m, p.coords[i + k * 2], p.coords[i + k * 2 + 1]);
          grow(pt[0], pt[1]);
          last = pt;
        }
        i += 6;
        complex = true;
      } else if (op === OPS.curveTo2 || op === OPS.curveTo3) {
        for (let k = 0; k < 2; k++) {
          const pt = apply(m, p.coords[i + k * 2], p.coords[i + k * 2 + 1]);
          grow(pt[0], pt[1]);
          last = pt;
        }
        i += 4;
        complex = true;
      } else if (op === OPS.closePath) {
        if (start && last && (start[0] !== last[0] || start[1] !== last[1])) segs.push([last[0], last[1], start[0], start[1]]);
        last = start;
      }
    }
    if (!Number.isFinite(bbox.x0)) return;
    // Axis-aligned closed 4-segment polygons are rectangles too
    const axisSegs = segs.filter(([x0, y0, x1, y1]) => Math.abs(x0 - x1) < 0.5 || Math.abs(y0 - y1) < 0.5);
    if (axisSegs.length !== segs.length) complex = true;
    if (!complex && segs.length >= 3 && segs.length <= 5 && rectsHere.length === 0 && paint.fill) {
      rectsHere.push({ ...bbox });
      segs.length = 0;
    }
    const area = (bbox.x1 - bbox.x0) * (bbox.y1 - bbox.y0);
    if (complex) {
      // Ignore huge background shapes; keep logo/chart sized drawings
      if (area < pageArea * 0.9 && !(paint.fill && !paint.stroke && isWhite(gs.fill))) graphics.push({ ...bbox, fill: paint.fill && !paint.stroke ? gs.fill : undefined });
      return;
    }
    if (paint.fill) {
      for (const r of rectsHere) {
        const w = r.x1 - r.x0;
        const h = r.y1 - r.y0;
        if (w <= 0.01 && h <= 0.01) continue;
        if (h <= 2.5 && w > 2) rules.push({ orient: 'h', pos: (r.y0 + r.y1) / 2, a: r.x0, b: r.x1, width: Math.max(0.25, h), color: gs.fill });
        else if (w <= 2.5 && h > 2) rules.push({ orient: 'v', pos: (r.x0 + r.x1) / 2, a: r.y0, b: r.y1, width: Math.max(0.25, w), color: gs.fill });
        else if (w * h < pageArea * 0.92 && gs.fillAlpha > 0.05) rects.push({ ...r, color: gs.fill });
      }
    }
    if (paint.stroke) {
      for (const r of rectsHere) {
        segs.push([r.x0, r.y0, r.x1, r.y0], [r.x1, r.y0, r.x1, r.y1], [r.x0, r.y1, r.x1, r.y1], [r.x0, r.y0, r.x0, r.y1]);
      }
      for (const [x0, y0, x1, y1] of segs) {
        if (Math.abs(y0 - y1) < 0.5 && Math.abs(x1 - x0) > 1) {
          rules.push({ orient: 'h', pos: (y0 + y1) / 2, a: Math.min(x0, x1), b: Math.max(x0, x1), width: lw, color: gs.stroke });
        } else if (Math.abs(x0 - x1) < 0.5 && Math.abs(y1 - y0) > 1) {
          rules.push({ orient: 'v', pos: (x0 + x1) / 2, a: Math.min(y0, y1), b: Math.max(y0, y1), width: lw, color: gs.stroke });
        }
      }
    }
  };

  const placeImage = (rgba: Uint8ClampedArray | null, w: number, h: number) => {
    if (!rgba) return;
    const m = mul(V, gs.ctm);
    const pts = [apply(m, 0, 0), apply(m, 1, 0), apply(m, 0, 1), apply(m, 1, 1)];
    const box = {
      x0: Math.min(...pts.map((p) => p[0])),
      y0: Math.min(...pts.map((p) => p[1])),
      x1: Math.max(...pts.map((p) => p[0])),
      y1: Math.max(...pts.map((p) => p[1])),
    };
    if (box.x1 - box.x0 < 2 || box.y1 - box.y0 < 2) return;
    let oriented = orientPixels(rgba, w, h, m);
    // Pictures shown through a smaller clipping area (cropped photos, rounded avatars): keep the visible part
    const clip = gs.clip;
    if (clip) {
      const cx0 = Math.max(box.x0, clip.x0);
      const cy0 = Math.max(box.y0, clip.y0);
      const cx1 = Math.min(box.x1, clip.x1);
      const cy1 = Math.min(box.y1, clip.y1);
      if (cx1 - cx0 < 1 || cy1 - cy0 < 1) return;
      const bw = box.x1 - box.x0;
      const bh = box.y1 - box.y0;
      if ((cx1 - cx0) * (cy1 - cy0) < bw * bh * 0.97) {
        const px0 = Math.floor(((cx0 - box.x0) / bw) * oriented.width);
        const py0 = Math.floor(((cy0 - box.y0) / bh) * oriented.height);
        const pw = Math.max(1, Math.round(((cx1 - cx0) / bw) * oriented.width));
        const ph = Math.max(1, Math.round(((cy1 - cy0) / bh) * oriented.height));
        const out = new Uint8ClampedArray(pw * ph * 4);
        for (let y = 0; y < ph; y++) {
          const sy = Math.min(oriented.height - 1, py0 + y);
          const start = (sy * oriented.width + px0) * 4;
          out.set(oriented.rgba.subarray(start, start + Math.min(pw, oriented.width - px0) * 4), y * pw * 4);
        }
        oriented = { rgba: out, width: pw, height: ph };
        box.x0 = cx0;
        box.y0 = cy0;
        box.x1 = cx1;
        box.y1 = cy1;
      }
    }
    let opaque = true;
    for (let k = 3; k < oriented.rgba.length; k += 4) {
      if (oriented.rgba[k] < 250) {
        opaque = false;
        break;
      }
    }
    images.push({ ...box, rgba: oriented.rgba, width: oriented.width, height: oriented.height, opaque });
  };

  for (let k = 0; k < fnArray.length; k++) {
    const fn = fnArray[k];
    const args = (argsArray[k] || []) as unknown[];
    switch (fn) {
      case OPS.save:
        stack.push({ ...gs, ctm: [...gs.ctm] as Matrix });
        break;
      case OPS.restore:
        if (stack.length) gs = stack.pop() as GState;
        break;
      case OPS.transform:
        gs.ctm = mul(gs.ctm, args as unknown as Matrix);
        break;
      case OPS.paintFormXObjectBegin: {
        stack.push({ ...gs, ctm: [...gs.ctm] as Matrix });
        const fm = args[0] as number[] | null;
        if (fm && fm.length === 6) gs.ctm = mul(gs.ctm, fm as Matrix);
        break;
      }
      case OPS.paintFormXObjectEnd:
        if (stack.length) gs = stack.pop() as GState;
        break;
      case OPS.setGState: {
        for (const [key, val] of args[0] as [string, unknown][]) {
          if (key === 'LW') gs.lineWidth = val as number;
          else if (key === 'ca') gs.fillAlpha = val as number;
          else if (key === 'Font') {
            const [id, size] = val as [string, number];
            gs.fontId = id;
            gs.fontSize = size;
          }
        }
        break;
      }
      case OPS.setLineWidth:
        gs.lineWidth = args[0] as number;
        break;
      case OPS.setFillRGBColor:
        gs.fill = hex(args[0] as number, args[1] as number, args[2] as number);
        break;
      case OPS.setStrokeRGBColor:
        gs.stroke = hex(args[0] as number, args[1] as number, args[2] as number);
        break;
      case OPS.beginText:
        tm = [1, 0, 0, 1, 0, 0];
        tlm = [1, 0, 0, 1, 0, 0];
        break;
      case OPS.endText:
        break;
      case OPS.setFont:
        gs.fontId = args[0] as string;
        gs.fontSize = args[1] as number;
        break;
      case OPS.setCharSpacing:
        gs.charSpacing = args[0] as number;
        break;
      case OPS.setWordSpacing:
        gs.wordSpacing = args[0] as number;
        break;
      case OPS.setHScale:
        gs.hScale = (args[0] as number) / 100;
        break;
      case OPS.setLeading:
        gs.leading = args[0] as number;
        break;
      case OPS.setTextRise:
        gs.rise = args[0] as number;
        break;
      case OPS.setTextRenderingMode:
        gs.renderMode = args[0] as number;
        break;
      case OPS.moveText:
        tlm = mul(tlm, [1, 0, 0, 1, args[0] as number, args[1] as number]);
        tm = [...tlm] as Matrix;
        break;
      case OPS.setLeadingMoveText:
        gs.leading = -(args[1] as number);
        tlm = mul(tlm, [1, 0, 0, 1, args[0] as number, args[1] as number]);
        tm = [...tlm] as Matrix;
        break;
      case OPS.setTextMatrix:
        tlm = [...(args as unknown as Matrix)] as Matrix;
        tm = [...tlm] as Matrix;
        break;
      case OPS.nextLine:
        tlm = mul(tlm, [1, 0, 0, 1, 0, -gs.leading]);
        tm = [...tlm] as Matrix;
        break;
      case OPS.showText:
      case OPS.showSpacedText:
        await showText(args[0] as (PdfjsGlyph | number)[]);
        break;
      case OPS.constructPath: {
        const [ops, coords] = args as [number[], number[]];
        if (!pendingPath) pendingPath = { ops: [], coords: [] };
        pendingPath.ops.push(...ops);
        pendingPath.coords.push(...coords);
        break;
      }
      case OPS.fill:
      case OPS.eoFill:
        emitPath({ fill: true, stroke: false });
        break;
      case OPS.stroke:
      case OPS.closeStroke:
        emitPath({ fill: false, stroke: true });
        break;
      case OPS.fillStroke:
      case OPS.eoFillStroke:
      case OPS.closeFillStroke:
      case OPS.closeEOFillStroke:
        emitPath({ fill: true, stroke: true });
        break;
      case OPS.clip:
      case OPS.eoClip: {
        if (pendingPath) {
          const m = mul(V, gs.ctm);
          const xs: number[] = [];
          const ys: number[] = [];
          for (let c = 0; c + 1 < pendingPath.coords.length; c += 2) {
            const [px, py] = apply(m, pendingPath.coords[c], pendingPath.coords[c + 1]);
            xs.push(px);
            ys.push(py);
          }
          // rectangles store x,y,w,h; include the far corner too
          if (pendingPath.ops.includes(OPS.rectangle)) {
            for (let c = 0; c + 3 < pendingPath.coords.length; c += 4) {
              const [px, py] = apply(m, pendingPath.coords[c] + pendingPath.coords[c + 2], pendingPath.coords[c + 1] + pendingPath.coords[c + 3]);
              xs.push(px);
              ys.push(py);
            }
          }
          if (xs.length) gs.clip = { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
        }
        break;
      }
      case OPS.endPath:
        pendingPath = null;
        break;
      case OPS.shadingFill: {
        // Gradient fill: the visible area is the current clip.
        const b = gs.clip;
        if (b && (b.x1 - b.x0) * (b.y1 - b.y0) < pageArea * 0.9 && b.x1 - b.x0 > 2) graphics.push({ ...b });
        break;
      }
      case OPS.paintImageXObject:
      case OPS.paintJpegXObject: {
        const id = args[0] as string;
        const objs = id.startsWith('g_') ? page.commonObjs : page.objs;
        const img = (await getObj(objs, id)) as { width: number; height: number; kind?: number; data?: Uint8ClampedArray } | null;
        if (img) placeImage(toRgba(img), img.width, img.height);
        break;
      }
      case OPS.paintInlineImageXObject: {
        const img = args[0] as { width: number; height: number; kind?: number; data?: Uint8ClampedArray };
        if (img) placeImage(toRgba(img), img.width, img.height);
        break;
      }
      case OPS.paintImageMaskXObject: {
        const img = args[0] as { width: number; height: number; data?: Uint8ClampedArray };
        if (img) placeImage(maskToRgba(img, gs.fill), img.width, img.height);
        break;
      }
      default:
        break;
    }
  }
  flush();

  // Links from annotations
  try {
    const annots = await page.getAnnotations();
    for (const a of annots) {
      if (a.subtype !== 'Link' || !a.url || !a.rect) continue;
      const [x0, y0] = apply(V, a.rect[0], a.rect[1]);
      const [x1, y1] = apply(V, a.rect[2], a.rect[3]);
      const box = { x0: Math.min(x0, x1), y0: Math.min(y0, y1), x1: Math.max(x0, x1), y1: Math.max(y0, y1) };
      for (const s of spans) {
        const cx = (s.x0 + s.x1) / 2;
        const cy = s.baseline - s.size * 0.3;
        if (cx >= box.x0 - 1 && cx <= box.x1 + 1 && cy >= box.y0 - 2 && cy <= box.y1 + 2) s.link = a.url;
      }
    }
  } catch {
    /* annotations are optional */
  }

  for (const s of spans) {
    if (/[֐-ࣿ]/.test(s.text)) s.rtl = true;
  }

  const visibleChars = spans.filter((s) => !s.invisible).reduce((n, s) => n + s.text.trim().length, 0);
  const imageCover = images.reduce((a, im) => a + (im.x1 - im.x0) * (im.y1 - im.y0), 0);
  const scanned = visibleChars < 15 && imageCover > pageArea * 0.4;

  return {
    index,
    width: viewport.width,
    height: viewport.height,
    spans,
    rects,
    rules,
    images,
    graphics,
    scanned,
    ocr: false,
  };
}
