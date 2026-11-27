/**
 * Layout-aware PDF -> Word (.docx) conversion that runs entirely on the user's device.
 *
 *   extract  : pdf.js operator list -> positioned text (font, size, colour), boxes, lines, images
 *   prepare  : scanned pages -> OCR text, vector drawings -> pictures, repeated headers/footers
 *   layout   : reading order, columns, tables, paragraphs, alignment, spacing
 *   write    : one Word section per PDF page with the same size, orientation and margins
 */
import { extractPage, type OpsTable, type PdfjsPage } from './extract';
import { findGrids, layoutRegion, mergeRules, type Block, type LayoutContext } from './layout';
import { writeDocx, type HeaderFooterPart, type WriterPage } from './docx-writer';
import { resolveFont } from './fonts';
import type { Box, ConversionReport, ImageEncoder, OcrEngine, PageImage, PageModel, RegionRenderer, TextSpan } from './types';

export type { ConversionReport, ImageEncoder, OcrEngine, RegionRenderer } from './types';

export interface PdfjsDocumentLike {
  numPages: number;
  getPage(n: number): Promise<PdfjsPage & { rotate: number }>;
}

export interface ConvertOptions {
  OPS: OpsTable;
  encodeImage: ImageEncoder;
  /** Renders a page area to pixels. Needed for logos/charts drawn as vectors and for OCR. */
  renderRegion?: RegionRenderer;
  /** Optional OCR for scanned pages. */
  ocr?: OcrEngine;
  title?: string;
  onProgress?: (stage: 'reading' | 'ocr' | 'layout' | 'writing', done: number, total: number) => void;
}

export interface ConvertResult {
  docx: Uint8Array;
  report: ConversionReport;
}

const area = (b: Box) => Math.max(0, b.x1 - b.x0) * Math.max(0, b.y1 - b.y0);
const overlaps = (a: Box, b: Box, pad = 0) => a.x0 < b.x1 + pad && a.x1 > b.x0 - pad && a.y0 < b.y1 + pad && a.y1 > b.y0 - pad;
const spanBox = (s: TextSpan): Box => ({ x0: s.x0, x1: s.x1, y0: s.baseline - s.size * 0.8, y1: s.baseline + s.size * 0.22 });
const spanCenterIn = (s: TextSpan, b: Box) => {
  const cx = (s.x0 + s.x1) / 2;
  const cy = s.baseline - s.size * 0.3;
  return cx >= b.x0 && cx <= b.x1 && cy >= b.y0 && cy <= b.y1;
};
const isNearWhite = (c: string) => [0, 2, 4].every((i) => parseInt(c.slice(i, i + 2), 16) > 245);

/* ------------------------------------------------------------------ */
/* Scanned pages                                                       */
/* ------------------------------------------------------------------ */

function darkColor(img: { rgba: Uint8ClampedArray; width: number; height: number }, b: Box, scale: number): string {
  const x0 = Math.max(0, Math.floor(b.x0 * scale));
  const x1 = Math.min(img.width, Math.ceil(b.x1 * scale));
  const y0 = Math.max(0, Math.floor(b.y0 * scale));
  const y1 = Math.min(img.height, Math.ceil(b.y1 * scale));
  let r = 0, g = 0, bl = 0, n = 0;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const i = (y * img.width + x) * 4;
      const lum = img.rgba[i] * 0.3 + img.rgba[i + 1] * 0.59 + img.rgba[i + 2] * 0.11;
      if (lum < 110) {
        r += img.rgba[i];
        g += img.rgba[i + 1];
        bl += img.rgba[i + 2];
        n++;
      }
    }
  }
  if (!n) return '000000';
  const [rr, gg, bb] = [r / n, g / n, bl / n];
  // ink that is basically grey/black becomes black
  if (Math.max(rr, gg, bb) - Math.min(rr, gg, bb) < 40) return '000000';
  return [rr, gg, bb].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
}

async function ocrPage(model: PageModel, opts: ConvertOptions, onP: (p: number) => void): Promise<boolean> {
  if (!opts.ocr || !opts.renderRegion) return false;
  const scale = 3;
  const img = await opts.renderRegion(model.index, { x0: 0, y0: 0, x1: model.width, y1: model.height }, scale);
  if (!img) return false;
  const words = await opts.ocr(img, scale, onP);
  const good = words.filter((w) => w.text.trim() && w.confidence >= 35);
  if (!good.length) return false;
  const font = resolveFont('Arial', {});
  const lines = new Map<number, typeof good>();
  for (const w of good) lines.set(w.line, [...(lines.get(w.line) || []), w]);
  const spans: TextSpan[] = [];
  for (const ws of Array.from(lines.values())) {
    const top = Math.min(...ws.map((w) => w.y0));
    const bottoms = ws.map((w) => w.baseline ?? w.y1).sort((a, b) => a - b);
    const baseline = bottoms[Math.floor(bottoms.length / 2)];
    // cap height ~ 0.7 of the font size
    const size = Math.max(5, Math.min(72, (baseline - top) / 0.8));
    for (const w of ws) {
      spans.push({
        text: w.text.trim(),
        x0: w.x0,
        x1: w.x1,
        baseline,
        size,
        font,
        color: darkColor(img, w, scale),
        invisible: false,
        rotated: false,
      });
    }
  }
  // OCR boxes vary with the letters in each line; snap near-equal sizes to the page's common size
  const common = [...spans.map((s) => s.size)].sort((a, b) => a - b)[Math.floor(spans.length / 2)];
  for (const s of spans) if (Math.abs(s.size - common) <= common * 0.3) s.size = common;
  // Serif text (Times-like) is narrower than sans text at the same size
  const chars = spans.reduce((n, s) => n + s.text.length, 0);
  const em = spans.reduce((n, s) => n + (s.x1 - s.x0) / s.size, 0) / Math.max(1, chars);
  if (em < 0.47) {
    const serif = resolveFont('Times New Roman', {});
    for (const s of spans) s.font = serif;
  }
  model.spans = spans;
  model.ocr = true;
  model.images = model.images.filter((im) => area(im) < model.width * model.height * 0.4);
  return true;
}

/* ------------------------------------------------------------------ */
/* Vector drawings -> pictures                                         */
/* ------------------------------------------------------------------ */

/** Runs of text on one baseline with word-sized gaps (a label, a name, a line fragment). */
function textRuns(spans: TextSpan[]): { spans: TextSpan[]; text: string }[] {
  const sorted = [...spans].sort((a, b) => a.baseline - b.baseline || a.x0 - b.x0);
  const runs: { spans: TextSpan[]; text: string }[] = [];
  for (const s of sorted) {
    const run = runs.find((r) => {
      const last = r.spans[r.spans.length - 1];
      return Math.abs(last.baseline - s.baseline) <= Math.min(last.size, s.size) * 0.35 && s.x0 - last.x1 <= Math.max(last.size, s.size) * 1.6 && s.x0 >= last.x0;
    });
    if (run) run.spans.push(s);
    else runs.push({ spans: [s], text: '' });
  }
  for (const r of runs) r.text = r.spans.map((s) => s.text).join('').replace(/\s+/g, ' ').trim();
  return runs;
}

function planGraphics(model: PageModel): Box[] {
  const pageArea = model.width * model.height;
  const gridBoxes = findGrids(mergeRules(model.rules)).map((g) => g.box);
  const holdsContent = (b: Box) =>
    model.spans.some((s) => !s.invisible && spanCenterIn(s, b)) || model.images.some((im) => overlaps(im, b, -2) && area(im) < area(b));

  // Small dots/squares just left of a line of text are list bullets: turn them back into a bullet character
  const bulletFont = resolveFont('Arial', {});
  const isBullet = (g: Box & { fill?: string; color?: string }) => {
    const w = g.x1 - g.x0;
    const h = g.y1 - g.y0;
    if (w > 8 || h > 8 || w < 1 || h < 1 || Math.abs(w - h) > 2.5) return false;
    const cy = (g.y0 + g.y1) / 2;
    const next = model.spans.find((s) => !s.invisible && s.x0 >= g.x1 - 0.5 && s.x0 - g.x1 < 25 && Math.abs(s.baseline - s.size * 0.32 - cy) < s.size * 0.35);
    if (!next) return false;
    model.spans.push({
      text: w > 4.5 ? '■' : '•',
      x0: g.x0 - next.size * 0.12,
      x1: g.x1 + next.size * 0.12,
      baseline: next.baseline,
      size: next.size,
      font: bulletFont,
      color: g.fill || g.color || next.color,
      invisible: false,
      rotated: false,
    });
    return true;
  };
  model.graphics = model.graphics.filter((g) => !isBullet(g));
  model.rects = model.rects.filter((r) => !isBullet(r));

  // Filled curved shapes that contain text are boxes (e.g. rounded banners), not pictures
  const graphics: Box[] = [];
  for (const g of model.graphics) {
    if (g.fill && !isNearWhite(g.fill) && holdsContent(g) && area(g) > 600) {
      model.rects.push({ x0: g.x0, y0: g.y0, x1: g.x1, y1: g.y1, color: g.fill });
    } else graphics.push(g);
  }
  model.graphics = [];

  const decorRects = model.rects.filter(
    (r) => !isNearWhite(r.color) && !holdsContent(r) && !gridBoxes.some((gb) => overlaps(gb, r, -1)) && area(r) < pageArea * 0.5
  );
  const cand: Box[] = [...graphics, ...decorRects];
  if (!cand.length) return [];
  // cluster touching shapes; rules (chart axes, frames) connect shapes that touch them
  const rules = model.rules.map((r) => (r.orient === 'h' ? { x0: r.a, x1: r.b, y0: r.pos - r.width / 2, y1: r.pos + r.width / 2 } : { x0: r.pos - r.width / 2, x1: r.pos + r.width / 2, y0: r.a, y1: r.b }));
  const boxes = [...cand.map((b) => ({ ...b, conn: false })), ...rules.map((b) => ({ ...b, conn: true }))];
  const parent = boxes.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      if (boxes[i].conn && boxes[j].conn) continue;
      if (overlaps(boxes[i], boxes[j], 3)) parent[find(j)] = find(i);
    }
  const groups = new Map<number, typeof boxes>();
  boxes.forEach((b, i) => groups.set(find(i), [...(groups.get(find(i)) || []), b]));
  const labelRuns = textRuns(model.spans.filter((s) => !s.invisible));
  const regions: Box[] = [];
  for (const members of Array.from(groups.values())) {
    const real = members.filter((b) => !b.conn);
    if (!real.length) continue;
    const bb = (list: Box[]) => ({ x0: Math.min(...list.map((b) => b.x0)), y0: Math.min(...list.map((b) => b.y0)), x1: Math.max(...list.map((b) => b.x1)), y1: Math.max(...list.map((b) => b.y1)) });
    const core = bb(real);
    // keep connectors that are not much longer than the drawing itself (not page-wide separators)
    const conns = members.filter((b) => b.conn && b.x1 - b.x0 <= (core.x1 - core.x0) * 1.3 + 40 && b.y1 - b.y0 <= (core.y1 - core.y0) * 1.3 + 40);
    let c = bb([...real, ...conns]);
    if (c.x1 - c.x0 < 3 && c.y1 - c.y0 < 3) continue;
    // pull in short labels sitting on or next to the drawing (chart values, axis names);
    // a label is a whole run of text, never a few letters of a longer word or name
    for (let pass = 0; pass < 2; pass++) {
      for (const run of labelRuns) {
        if (run.text.length > 12) continue;
        if (run.spans.some((s) => overlaps(spanBox(s), c, s.size * 0.6))) {
          for (const s of run.spans) {
            const b = spanBox(s);
            c = { x0: Math.min(c.x0, b.x0), y0: Math.min(c.y0, b.y0), x1: Math.max(c.x1, b.x1), y1: Math.max(c.y1, b.y1) };
          }
        }
      }
    }
    const textInside = model.spans.filter((s) => spanCenterIn(s, c)).reduce((n, s) => n + s.text.length, 0);
    if (area(c) > pageArea * 0.6 || textInside > 160) continue; // a background or text-heavy area: keep text editable
    regions.push({ x0: c.x0 - 2, y0: c.y0 - 3, x1: c.x1 + 2, y1: c.y1 + 2 });
  }
  // merge overlapping regions
  let merged = true;
  while (merged) {
    merged = false;
    for (let i = 0; i < regions.length && !merged; i++)
      for (let j = i + 1; j < regions.length && !merged; j++)
        if (overlaps(regions[i], regions[j], 1)) {
          const a = regions[i];
          const b = regions[j];
          regions[i] = { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) };
          regions.splice(j, 1);
          merged = true;
        }
  }
  return regions;
}

/* ------------------------------------------------------------------ */
/* Headers and footers                                                 */
/* ------------------------------------------------------------------ */

interface HFLine {
  key: string;
  spans: TextSpan[];
  text: string;
}

function bandLines(model: PageModel, band: 'top' | 'bottom'): HFLine[] {
  const limit = model.height * 0.12;
  const spans = model.spans.filter((s) => !s.invisible && (band === 'top' ? s.baseline < limit : s.baseline > model.height - limit));
  const lines: TextSpan[][] = [];
  for (const s of [...spans].sort((a, b) => a.baseline - b.baseline || a.x0 - b.x0)) {
    const l = lines.find((q) => Math.abs(q[0].baseline - s.baseline) < s.size * 0.4);
    if (l) l.push(s);
    else lines.push([s]);
  }
  return lines.map((ls) => {
    ls.sort((a, b) => a.x0 - b.x0);
    const text = ls.map((s) => s.text).join(' ').replace(/\s+/g, ' ').trim();
    const norm = text.toLowerCase().replace(/\d+/g, '#');
    return { key: `${band}|${norm}|${Math.round(ls[0].baseline / 4)}`, spans: ls, text };
  });
}

/* ------------------------------------------------------------------ */
/* Main entry                                                          */
/* ------------------------------------------------------------------ */

export async function convertPdfToDocx(pdf: PdfjsDocumentLike, opts: ConvertOptions): Promise<ConvertResult> {
  const report: ConversionReport = {
    pages: pdf.numPages,
    scannedPages: [],
    ocrPages: [],
    tables: 0,
    images: 0,
    graphics: 0,
    headers: false,
    footers: false,
    pageNumbers: false,
    columnsPages: [],
    warnings: [],
  };
  const progress = opts.onProgress || (() => {});
  const models: PageModel[] = [];

  // 1. read every page
  for (let i = 0; i < pdf.numPages; i++) {
    progress('reading', i, pdf.numPages);
    const page = await pdf.getPage(i + 1);
    let model = await extractPage(page, i, opts.OPS);
    // Sideways text on a rotated page: use the orientation in which the text is upright
    const chars = model.spans.reduce((n, s) => n + s.text.length, 0);
    const rotatedChars = model.spans.filter((s) => s.rotated).reduce((n, s) => n + s.text.length, 0);
    if (chars > 20 && rotatedChars > chars * 0.6) {
      for (const rot of [0, 90, 180, 270]) {
        const alt = await extractPage(page, i, opts.OPS, rot);
        const altRot = alt.spans.filter((s) => s.rotated).reduce((n, s) => n + s.text.length, 0);
        if (altRot < chars * 0.2) {
          model = alt;
          report.warnings.push(`Page ${i + 1} was stored sideways; it was turned so its text reads normally.`);
          break;
        }
      }
    }
    models.push(model);
  }

  // 2. scanned pages and OCR text layers
  for (const m of models) {
    const invisible = m.spans.filter((s) => s.invisible);
    const visibleChars = m.spans.filter((s) => !s.invisible).reduce((n, s) => n + s.text.trim().length, 0);
    const bigImage = m.images.some((im) => area(im) > m.width * m.height * 0.4);
    if (invisible.length && bigImage && visibleChars < 15) {
      // already OCR'd PDF: use its hidden text, drop the scan picture
      for (const s of invisible) {
        s.invisible = false;
        s.color = '000000';
      }
      m.images = m.images.filter((im) => area(im) < m.width * m.height * 0.4);
      report.scannedPages.push(m.index + 1);
      continue;
    }
    if (m.scanned) {
      report.scannedPages.push(m.index + 1);
      progress('ocr', m.index, models.length);
      const ok = await ocrPage(m, opts, () => {});
      if (ok) report.ocrPages.push(m.index + 1);
      else report.warnings.push(`Page ${m.index + 1} is a scanned image; it was kept as a picture because text recognition was not available.`);
    }
    m.spans = m.spans.filter((s) => !s.invisible && s.text.trim());
  }

  // 3. vector drawings -> pictures, full-page backgrounds
  const backgrounds = new Map<number, PageImage[]>();
  for (const m of models) {
    const bgs = m.images.filter((im) => area(im) > m.width * m.height * 0.5 && m.spans.some((s) => overlaps(spanBox(s), im)));
    if (bgs.length) {
      backgrounds.set(m.index, bgs);
      m.images = m.images.filter((im) => !bgs.includes(im));
    }
    const regions = planGraphics(m);
    for (const r of regions) {
      if (!opts.renderRegion) break;
      const img = await opts.renderRegion(m.index, r, 2.5);
      if (!img) continue;
      m.spans = m.spans.filter((s) => !spanCenterIn(s, r));
      m.images = m.images.filter((im) => !(im.x0 >= r.x0 - 1 && im.x1 <= r.x1 + 1 && im.y0 >= r.y0 - 1 && im.y1 <= r.y1 + 1));
      m.rects = m.rects.filter((q) => !(q.x0 >= r.x0 - 1 && q.x1 <= r.x1 + 1 && q.y0 >= r.y0 - 1 && q.y1 <= r.y1 + 1));
      m.rules = m.rules.filter((q) => {
        const b = q.orient === 'h' ? { x0: q.a, x1: q.b, y0: q.pos, y1: q.pos } : { x0: q.pos, x1: q.pos, y0: q.a, y1: q.b };
        return !(b.x0 >= r.x0 - 1 && b.x1 <= r.x1 + 1 && b.y0 >= r.y0 - 1 && b.y1 <= r.y1 + 1);
      });
      const picture = { ...r, rgba: img.rgba, width: img.width, height: img.height, opaque: true };
      // A small text-free shape on the same line as a label (an empty form field, a badge) is
      // pinned to its exact place on the page, so it doesn't push the label onto another line.
      const besideLabel =
        area(r) < m.width * m.height * 0.04 &&
        m.spans.some((s) => {
          const b = spanBox(s);
          const vOv = Math.min(b.y1, r.y1) - Math.max(b.y0, r.y0);
          const hGap = Math.max(b.x0 - r.x1, r.x0 - b.x1);
          return vOv >= Math.min(b.y1 - b.y0, r.y1 - r.y0) * 0.5 && hGap >= 0 && hGap < 40;
        });
      if (besideLabel) backgrounds.set(m.index, [...(backgrounds.get(m.index) || []), picture]);
      else m.images.push(picture);
      report.graphics++;
    }
    if (regions.length && !opts.renderRegion) report.warnings.push(`Some drawings on page ${m.index + 1} could not be converted.`);
  }

  // 4. repeated headers and footers
  const hf: Record<'top' | 'bottom', { keys: Set<string>; sample: { page: number; lines: HFLine[] } | null; varying: boolean; pages: Set<number> }> = {
    top: { keys: new Set(), sample: null, varying: false, pages: new Set() },
    bottom: { keys: new Set(), sample: null, varying: false, pages: new Set() },
  };
  if (models.length >= 2) {
    for (const band of ['top', 'bottom'] as const) {
      const counts = new Map<string, { pages: number; texts: Set<string> }>();
      const perPage = models.map((m) => bandLines(m, band));
      perPage.forEach((ls) =>
        ls.forEach((l) => {
          const c = counts.get(l.key) || { pages: 0, texts: new Set<string>() };
          c.pages++;
          c.texts.add(l.text);
          counts.set(l.key, c);
        })
      );
      const need = Math.max(2, Math.ceil(models.length * 0.5));
      for (const [k, c] of Array.from(counts.entries())) {
        if (c.pages >= need) {
          hf[band].keys.add(k);
          if (c.texts.size > 1) hf[band].varying = true;
        }
      }
      if (hf[band].keys.size) {
        perPage.forEach((ls, pi) => {
          const mine = ls.filter((l) => hf[band].keys.has(l.key));
          if (mine.length && !hf[band].sample) hf[band].sample = { page: pi, lines: mine };
          if (mine.length) hf[band].pages.add(pi);
          const remove = new Set(mine.flatMap((l) => l.spans));
          models[pi].spans = models[pi].spans.filter((s) => !remove.has(s));
        });
      }
    }
  }

  // 5. document-wide text statistics
  const sizeChars = new Map<number, number>();
  const fontChars = new Map<string, number>();
  for (const m of models)
    for (const s of m.spans) {
      const k = Math.round(s.size * 2) / 2;
      sizeChars.set(k, (sizeChars.get(k) || 0) + s.text.length);
      fontChars.set(s.font.family, (fontChars.get(s.font.family) || 0) + s.text.length);
    }
  const bodySize = Array.from(sizeChars.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 11;
  const bodyFont = Array.from(fontChars.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Arial';
  const headingSizes = Array.from(sizeChars.keys())
    .filter((s) => s >= bodySize * 1.15)
    .sort((a, b) => b - a);

  // 6. layout
  const pages: WriterPage[] = [];
  const hfPresence = models.map((_, i) => ({ top: hf.top.pages.has(i), bottom: hf.bottom.pages.has(i) }));
  for (const m of models) {
    progress('layout', m.index, models.length);
    const ctx: LayoutContext = { bodySize, headingSizes, stats: { tables: 0, columns: false } };
    const content = { spans: m.spans, rects: m.rects, rules: m.rules, images: m.images };
    const boxes: Box[] = [
      ...m.spans.map(spanBox),
      ...m.images,
      ...m.rects.filter((r) => !isNearWhite(r.color)),
      ...m.rules.map((r) => (r.orient === 'h' ? { x0: r.a, x1: r.b, y0: r.pos, y1: r.pos } : { x0: r.pos, x1: r.pos, y0: r.a, y1: r.b })),
    ].filter((b) => b.x1 > 0 && b.x0 < m.width && b.y1 > 0 && b.y0 < m.height);
    let container: Box;
    if (boxes.length) {
      container = {
        x0: Math.max(0, Math.min(...boxes.map((b) => b.x0))),
        y0: Math.max(0, Math.min(...boxes.map((b) => b.y0))),
        x1: Math.min(m.width, Math.max(...boxes.map((b) => b.x1))),
        y1: Math.min(m.height, Math.max(...boxes.map((b) => b.y1))),
      };
    } else container = { x0: 72, y0: 72, x1: m.width - 72, y1: m.height - 72 };
    const blocks: Block[] = boxes.length ? layoutRegion(content, container, ctx, true) : [];
    report.tables += ctx.stats.tables;
    if (ctx.stats.columns) report.columnsPages.push(m.index + 1);
    const top = blocks.length ? Math.max(0, Math.min(container.y0, ...blocks.map((b) => b.top))) : container.y0;
    const bottomEdge = blocks.length ? Math.max(...blocks.map((b) => b.bottom)) : container.y1;
    container.y0 = top;
    const footerTop = hf.bottom.sample ? Math.min(...hf.bottom.sample.lines.flatMap((l) => l.spans.map((s) => s.baseline - s.size))) : m.height;
    const minBottom = hf.bottom.keys.size ? m.height - footerTop + 2 : 8;
    const bottom = Math.max(Math.min(minBottom, m.height - bottomEdge), Math.min(m.height - bottomEdge - 24, 72), 0);
    pages.push({
      width: m.width,
      height: m.height,
      margins: { top, left: container.x0, right: Math.max(0, m.width - container.x1 - 3), bottom: Math.max(0, bottom) },
      container,
      blocks,
      backgrounds: backgrounds.get(m.index) || [],
      header: hfPresence[m.index].top,
      footer: hfPresence[m.index].bottom,
    });
    report.images += m.images.length + (backgrounds.get(m.index)?.length || 0);
  }
  report.images -= report.graphics;

  // header / footer parts
  const makeHF = (band: 'top' | 'bottom'): HeaderFooterPart | null => {
    const sample = hf[band].sample;
    if (!sample) return null;
    const page = pages[sample.page];
    const spans = sample.lines.flatMap((l) => l.spans);
    const ctx: LayoutContext = { bodySize, headingSizes: [], stats: { tables: 0, columns: false } };
    const container = { ...page.container, y0: 0, y1: page.height };
    const blocks = layoutRegion({ spans, rects: [], rules: [], images: [] }, container, ctx, true);
    if (!blocks.length) return null;
    const pageNo = String(sample.page + 1);
    const allText = sample.lines.map((l) => l.text).join(' ');
    const isPageNum = hf[band].varying && new RegExp(`(^|\\D)${pageNo}(\\D|$)`).test(allText);
    if (isPageNum) report.pageNumbers = true;
    const distance = band === 'top' ? blocks[0].top : page.height - blocks[blocks.length - 1].bottom;
    return {
      blocks,
      container,
      distance: Math.max(0, distance),
      pageNumberText: isPageNum ? pageNo : undefined,
      totalText: isPageNum && new RegExp(`(^|\\D)${models.length}(\\D|$)`).test(allText.replace(new RegExp(`(^|\\D)${pageNo}(\\D|$)`), '$1$2')) ? String(models.length) : undefined,
    };
  };
  const header = makeHF('top');
  const footer = makeHF('bottom');
  report.headers = !!header;
  report.footers = !!footer;
  if (header) {
    // the body must start below the header
    const hBottom = Math.max(...header.blocks.map((b) => b.bottom));
    pages.forEach((p) => {
      if (p.header && p.margins.top < hBottom + 2) p.margins.top = hBottom + 2;
    });
  }

  // 7. write
  progress('writing', 0, 1);
  const docx = await writeDocx({
    pages,
    header,
    footer,
    bodyFont,
    bodySize,
    title: opts.title || 'Converted document',
    encodeImage: opts.encodeImage,
  });
  progress('writing', 1, 1);
  return { docx, report };
}
