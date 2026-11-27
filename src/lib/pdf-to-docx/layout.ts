/**
 * Turns a page model into Word-ready blocks: paragraphs (with alignment, indents, tab stops and
 * exact line pitch), tables rebuilt from ruling lines, shaded boxes, side-by-side columns,
 * images and horizontal rules — in reading order.
 */
import type { Box, FilledRect, PageImage, Rule, TextSpan } from './types';

/* ------------------------------------------------------------------ */
/* Block types (consumed by the DOCX writer)                           */
/* ------------------------------------------------------------------ */

export interface Seg {
  spans: TextSpan[];
  x0: number;
  x1: number;
  baseline: number;
  size: number;
}

export interface Line {
  segs: Seg[];
  baseline: number;
  size: number;
  x0: number;
  x1: number;
}

export interface TabStop {
  pos: number; // pt from container left
  type: 'left' | 'right' | 'center';
}

export interface ParaBlock {
  kind: 'para';
  lines: Line[];
  top: number;
  bottom: number;
  align: 'left' | 'center' | 'right' | 'both';
  indLeft: number;
  indRight: number;
  firstLine: number;
  lineHeight: number;
  tabs: TabStop[];
  heading: number; // 0 = body text
  rtl: boolean;
}

export interface ImageBlock {
  kind: 'image';
  x0: number;
  image: PageImage;
  top: number;
  bottom: number;
  indLeft: number;
  width: number;
  height: number;
}

export interface Border {
  width: number;
  color: string;
}

export interface Cell {
  span: number;
  vMerge?: 'restart' | 'continue';
  fill?: string;
  borders: { top: Border | null; left: Border | null; bottom: Border | null; right: Border | null };
  blocks: Block[];
  top: number;
  vAlign: 'top' | 'center' | 'bottom';
}

export interface Row {
  height: number;
  exact: boolean;
  cells: Cell[];
}

export interface TableBlock {
  kind: 'table';
  x0: number;
  role: 'data' | 'box' | 'layout';
  top: number;
  bottom: number;
  indLeft: number;
  cols: number[];
  rows: Row[];
}

export interface RuleBlock {
  kind: 'hr';
  x0: number;
  x1: number;
  top: number;
  bottom: number;
  indLeft: number;
  indRight: number;
  rule: Rule;
}

export type Block = ParaBlock | ImageBlock | TableBlock | RuleBlock;

export interface LayoutContext {
  bodySize: number;
  headingSizes: number[];
  stats: { tables: number; columns: boolean };
}

export interface RegionContent {
  spans: TextSpan[];
  rects: FilledRect[];
  rules: Rule[];
  images: PageImage[];
}

/* ------------------------------------------------------------------ */
/* Geometry helpers                                                    */
/* ------------------------------------------------------------------ */

const DESC = 0.22; // descent as a share of font size
const spanTop = (s: { baseline: number; size: number }) => s.baseline - s.size * 0.8;
const spanBottom = (s: { baseline: number; size: number }) => s.baseline + s.size * DESC;
const centerIn = (x: number, y: number, b: Box, pad = 0) => x >= b.x0 - pad && x <= b.x1 + pad && y >= b.y0 - pad && y <= b.y1 + pad;
const spanCenter = (s: TextSpan): [number, number] => [(s.x0 + s.x1) / 2, s.baseline - s.size * 0.3];
const boxArea = (b: Box) => Math.max(0, b.x1 - b.x0) * Math.max(0, b.y1 - b.y0);
const contains = (outer: Box, inner: Box, pad = 1) =>
  inner.x0 >= outer.x0 - pad && inner.x1 <= outer.x1 + pad && inner.y0 >= outer.y0 - pad && inner.y1 <= outer.y1 + pad;

function isNearWhite(c: string) {
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return r > 247 && g > 247 && b > 247;
}

function median(xs: number[]) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/* ------------------------------------------------------------------ */
/* Rules: merge, underline detection, ruled-table grids                */
/* ------------------------------------------------------------------ */

export function mergeRules(rules: Rule[]): Rule[] {
  const out: Rule[] = [];
  for (const orient of ['h', 'v'] as const) {
    const list = rules.filter((r) => r.orient === orient).sort((a, b) => a.pos - b.pos || a.a - b.a);
    const merged: Rule[] = [];
    for (const r of list) {
      const m = merged.find(
        (q) => q.color === r.color && Math.abs(q.width - r.width) < 0.6 && Math.abs(q.pos - r.pos) <= Math.max(1, (q.width + r.width) / 2) && r.a <= q.b + 1.5 && r.b >= q.a - 1.5
      );
      if (m) {
        m.a = Math.min(m.a, r.a);
        m.b = Math.max(m.b, r.b);
        m.width = Math.max(m.width, r.width);
      } else merged.push({ ...r });
    }
    out.push(...merged);
  }
  return out;
}

/** Marks underlined / struck-through spans and returns the rules that are left. */
export function applyTextDecorations(spans: TextSpan[], rules: Rule[]): Rule[] {
  const left: Rule[] = [];
  for (const r of rules) {
    let used = false;
    if (r.orient === 'h' && r.width <= 2) {
      const hits = spans.filter((s) => {
        const overlap = Math.min(s.x1, r.b) - Math.max(s.x0, r.a);
        return overlap > (s.x1 - s.x0) * 0.6 && r.b - r.a < (s.x1 - s.x0) + s.size * 30;
      });
      const under = hits.filter((s) => r.pos >= s.baseline - 0.5 && r.pos <= s.baseline + s.size * 0.35);
      const strike = hits.filter((s) => r.pos > s.baseline - s.size * 0.45 && r.pos < s.baseline - s.size * 0.15);
      if (under.length) {
        const coverage = under.reduce((a, s) => a + (s.x1 - s.x0), 0);
        if (coverage >= (r.b - r.a) * 0.6) {
          under.forEach((s) => (s.underline = true));
          used = true;
        }
      } else if (strike.length) {
        strike.forEach((s) => (s.strike = true));
        used = true;
      }
    }
    if (!used) left.push(r);
  }
  return left;
}

interface Grid {
  box: Box;
  xs: number[];
  ys: number[];
  rules: Rule[];
}

function clusterValues(vals: number[], tol: number): number[] {
  const s = [...vals].sort((a, b) => a - b);
  const out: number[][] = [];
  for (const v of s) {
    const last = out[out.length - 1];
    if (last && v - last[last.length - 1] <= tol) last.push(v);
    else out.push([v]);
  }
  return out.map((g) => g.reduce((a, b) => a + b, 0) / g.length);
}

/** Finds grids of crossing horizontal and vertical rules (ruled tables and framed boxes). */
export function findGrids(rules: Rule[]): Grid[] {
  const hs = rules.filter((r) => r.orient === 'h');
  const vs = rules.filter((r) => r.orient === 'v');
  const all = [...hs, ...vs];
  const parent = all.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const tol = 2.5;
  for (let i = 0; i < hs.length; i++) {
    for (let j = 0; j < vs.length; j++) {
      const h = hs[i];
      const v = vs[j];
      if (v.pos >= h.a - tol && v.pos <= h.b + tol && h.pos >= v.a - tol && h.pos <= v.b + tol) {
        parent[find(i)] = find(hs.length + j);
      }
    }
  }
  const groups = new Map<number, Rule[]>();
  all.forEach((r, i) => {
    const k = find(i);
    groups.set(k, [...(groups.get(k) || []), r]);
  });
  const grids: Grid[] = [];
  for (const g of Array.from(groups.values())) {
    const gh = g.filter((r) => r.orient === 'h');
    const gv = g.filter((r) => r.orient === 'v');
    if (gh.length < 2 || gv.length < 2) continue;
    const xs = clusterValues(gv.map((r) => r.pos), 3);
    const ys = clusterValues(gh.map((r) => r.pos), 3);
    if (xs.length < 2 || ys.length < 2) continue;
    const box = { x0: xs[0], y0: ys[0], x1: xs[xs.length - 1], y1: ys[ys.length - 1] };
    if (box.x1 - box.x0 < 10 || box.y1 - box.y0 < 6) continue;
    grids.push({ box, xs, ys, rules: g });
  }
  return grids;
}

function hasEdge(rules: Rule[], orient: 'h' | 'v', pos: number, a: number, b: number): Rule | null {
  const mid = (a + b) / 2;
  const len = b - a;
  for (const r of rules) {
    if (r.orient !== orient || Math.abs(r.pos - pos) > 3) continue;
    // must cover most of the edge
    const cover = Math.min(r.b, b) - Math.max(r.a, a);
    if (cover >= len * 0.6 || (r.a <= mid && r.b >= mid && cover > len * 0.4)) return r;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Text: segments, lines and paragraphs                                */
/* ------------------------------------------------------------------ */

function spansToSegments(spans: TextSpan[]): Seg[] {
  const sorted = [...spans].sort((a, b) => a.baseline - b.baseline || a.x0 - b.x0);
  // group into rough lines by baseline (allowing super/subscripts)
  const rows: TextSpan[][] = [];
  for (const s of sorted) {
    const row = rows.find((r) => {
      const main = r.reduce((m, q) => (q.size > m.size ? q : m), r[0]);
      const tol = Math.min(s.size, main.size) * 0.35;
      if (Math.abs(main.baseline - s.baseline) <= tol) return true;
      // small raised/lowered text overlapping the line box
      const ov = Math.min(spanBottom(main), spanBottom(s)) - Math.max(spanTop(main), spanTop(s));
      return s.size < main.size * 0.85 && ov > s.size * 0.5 && r.some((q) => Math.abs(q.x1 - s.x0) < main.size || Math.abs(s.x1 - q.x0) < main.size);
    });
    if (row) row.push(s);
    else rows.push([s]);
  }
  const segs: Seg[] = [];
  for (const row of rows) {
    row.sort((a, b) => a.x0 - b.x0);
    let cur: Seg | null = null;
    for (const s of row) {
      const gapLimit = Math.max(cur ? cur.size : s.size, s.size) * 1.6;
      if (cur && s.x0 - cur.x1 <= gapLimit) {
        cur.spans.push(s);
        cur.x1 = Math.max(cur.x1, s.x1);
        if (s.size > cur.size) {
          cur.size = s.size;
          cur.baseline = s.baseline;
        }
      } else {
        cur = { spans: [s], x0: s.x0, x1: s.x1, baseline: s.baseline, size: s.size };
        segs.push(cur);
      }
    }
  }
  return segs;
}

function segsToLines(segs: Seg[]): Line[] {
  const sorted = [...segs].sort((a, b) => a.baseline - b.baseline || a.x0 - b.x0);
  const lines: Line[] = [];
  for (const s of sorted) {
    const l = lines.find((q) => Math.abs(q.baseline - s.baseline) <= Math.min(q.size, s.size) * 0.35);
    if (l) {
      l.segs.push(s);
      l.x0 = Math.min(l.x0, s.x0);
      l.x1 = Math.max(l.x1, s.x1);
      if (s.size > l.size) {
        l.size = s.size;
        l.baseline = s.baseline;
      }
    } else lines.push({ segs: [s], baseline: s.baseline, size: s.size, x0: s.x0, x1: s.x1 });
  }
  for (const l of lines) l.segs.sort((a, b) => a.x0 - b.x0);
  return lines.sort((a, b) => a.baseline - b.baseline);
}

const lineText = (l: Line) => l.segs.map((s) => s.spans.map((p) => p.text).join(' ')).join(' ');
const allBold = (l: Line) => l.segs.every((s) => s.spans.every((p) => p.font.bold));
const BULLET = /^\s*([•●▪■◦○‣∙·\-–—*]|\(?\d{1,3}[.)]|\(?[a-zA-Z][.)])\s/;
const NUMERIC = /^[\s$€£¥₹(+\-–−]*[\d][\d.,\s]*%?\)?\s*$/;

function firstWordWidth(l: Line) {
  const sp = l.segs[0].spans[0];
  const word = sp.text.trim().split(/\s+/)[0] || '';
  const len = sp.text.length || 1;
  return ((sp.x1 - sp.x0) * word.length) / len;
}

/** Where text continues on wrapped lines of a bulleted paragraph. */
function hangingX(l: Line): number | null {
  if (!BULLET.test(lineText(l))) return null;
  const spans = l.segs[0].spans;
  if (spans.length > 1) return spans[1].x0;
  const sp = spans[0];
  const m = sp.text.match(BULLET);
  if (!m) return null;
  return sp.x0 + ((sp.x1 - sp.x0) * m[0].length) / sp.text.length;
}

function buildParagraphs(lines: Line[], container: Box, ctx: LayoutContext, pageLevel: boolean): ParaBlock[] {
  const paras: Line[][] = [];
  let cur: Line[] = [];
  const width = container.x1 - container.x0;
  for (const l of lines) {
    const prev = cur[cur.length - 1];
    let merge = false;
    if (prev && l.segs.length === 1 && prev.segs.length === 1) {
      const pitch = l.baseline - prev.baseline;
      const sizeOk = Math.abs(l.size - prev.size) <= prev.size * 0.15;
      const pitchOk = pitch >= prev.size * 0.85 && pitch <= prev.size * 1.75;
      const prevPitch = cur.length >= 2 ? prev.baseline - cur[cur.length - 2].baseline : null;
      const consistent = prevPitch == null || Math.abs(pitch - prevPitch) <= prevPitch * 0.2;
      const boldBreak = allBold(prev) !== allBold(l);
      const bulletStart = BULLET.test(lineText(l));
      // left edge rules
      const first = cur[0];
      const contLeft = cur.length >= 2 ? cur[1].x0 : null;
      const hang = hangingX(first);
      const centered = Math.abs((l.x0 + l.x1) / 2 - (prev.x0 + prev.x1) / 2) < 3 && l.x0 > container.x0 + 6 && prev.x0 > container.x0 + 6;
      let leftOk = false;
      if (contLeft != null) leftOk = Math.abs(l.x0 - contLeft) <= 2.5;
      else
        leftOk =
          Math.abs(l.x0 - first.x0) <= 2.5 ||
          (hang != null && Math.abs(l.x0 - hang) <= 3) ||
          (l.x0 < first.x0 && first.x0 - l.x0 <= prev.size * 4 && hang == null);
      if (cur.length >= 2 && centered && Math.abs(cur[1].x0 - cur[0].x0) > 2) leftOk = true;
      // previous line must be "full": the next word would not have fitted after it
      const right = Math.max(container.x1, ...cur.map((q) => q.x1));
      const full = prev.x1 + prev.size * 0.3 + firstWordWidth(l) > right - 1 || centered;
      // short lines (addresses, lists, contact details) keep their own line
      const left = Math.min(container.x0 + (pageLevel ? 0 : 0), first.x0);
      const wideEnough = prev.x1 - Math.min(prev.x0, l.x0) >= (right - left) * 0.6 || centered;
      merge = sizeOk && pitchOk && consistent && !boldBreak && !bulletStart && (leftOk || centered) && full && wideEnough;
    }
    if (merge) cur.push(l);
    else {
      if (cur.length) paras.push(cur);
      cur = [l];
    }
  }
  if (cur.length) paras.push(cur);

  return paras.map((pl) => makePara(pl, container, ctx, pageLevel, width));
}

function makePara(pl: Line[], container: Box, ctx: LayoutContext, pageLevel: boolean, width: number): ParaBlock {
  const first = pl[0];
  const last = pl[pl.length - 1];
  const size = Math.max(...pl.map((l) => l.size));
  let lineHeight: number;
  if (pl.length > 1) lineHeight = (last.baseline - first.baseline) / (pl.length - 1);
  else lineHeight = size * 1.17;
  lineHeight = Math.max(lineHeight, size * 0.95);
  const top = first.baseline - (lineHeight - first.size * DESC);
  const bottom = last.baseline + last.size * DESC;
  const rtl = pl.some((l) => l.segs.some((s) => s.spans.some((p) => p.rtl)));

  let align: ParaBlock['align'] = 'left';
  let indLeft = 0;
  let indRight = 0;
  let firstLine = 0;
  const tabs: TabStop[] = [];
  const cx = (container.x0 + container.x1) / 2;

  if (first.segs.length > 1) {
    // tabbed line (columns of a borderless table, label + value rows, header with left/right parts)
    indLeft = first.segs[0].x0 - container.x0;
    for (const s of first.segs.slice(1)) {
      const text = s.spans.map((p) => p.text).join(' ');
      const atRight = Math.abs(s.x1 - container.x1) < 2.5;
      if (NUMERIC.test(text) || atRight) tabs.push({ pos: s.x1 - container.x0, type: 'right' });
      else tabs.push({ pos: s.x0 - container.x0, type: 'left' });
    }
    // let the line run a little past the container so a slightly wider font never wraps it
    const lastX1 = first.segs[first.segs.length - 1].x1;
    indRight = Math.min(0, container.x1 - lastX1) - (pageLevel ? Math.min(18, Math.max(0, container.x0)) : 0);
  } else {
    const centeredAll = pl.every((l) => Math.abs((l.x0 + l.x1) / 2 - cx) < Math.max(3, width * 0.01)) && first.x0 > container.x0 + 8;
    const rightAll = pl.every((l) => Math.abs(l.x1 - container.x1) < 2) && Math.min(...pl.map((l) => l.x0)) > container.x0 + 8;
    const body = pl.slice(0, -1);
    const justified =
      body.length >= 1 &&
      body.every((l) => Math.abs(l.x1 - body[0].x1) < 2) &&
      (body.length >= 2 || Math.abs(body[0].x1 - container.x1) < 3) &&
      last.x1 < body[0].x1 - 2;
    if (centeredAll && !(justified && body.length >= 2)) align = 'center';
    else if (rightAll && pl.length >= 1 && !justified) {
      align = 'right';
    } else if (justified) align = 'both';
    if (align === 'left' || align === 'both') {
      const rest = pl.length > 1 ? Math.min(...pl.slice(1).map((l) => l.x0)) : first.x0;
      indLeft = rest - container.x0;
      firstLine = first.x0 - rest;
      if (align === 'both') indRight = Math.max(0, container.x1 - Math.max(...body.map((l) => l.x1)));
      else if (pl.length === 1 && pageLevel) indRight = -Math.min(18, Math.max(0, container.x0));
    } else if (align === 'center') {
      const off = cx - (Math.min(...pl.map((l) => l.x0)) + Math.max(...pl.map((l) => l.x1))) / 2;
      if (off > 0) indRight = off * 2;
      else indLeft = -off * 2;
    } else if (align === 'right') {
      indRight = Math.max(0, container.x1 - Math.max(...pl.map((l) => l.x1)));
    }
  }

  // headings: large or bold-and-larger short text
  let heading = 0;
  const text = pl.map(lineText).join(' ');
  if (pl.length <= 3 && text.length <= 160 && first.segs.length === 1) {
    const bold = pl.every(allBold);
    if (size >= ctx.bodySize * 1.45 || (bold && size >= ctx.bodySize * 1.15)) {
      const idx = ctx.headingSizes.findIndex((h) => Math.abs(h - size) < 0.6);
      heading = idx >= 0 ? Math.min(3, idx + 1) : 3;
    }
  }

  return { kind: 'para', lines: pl, top, bottom, align, indLeft, indRight, firstLine, lineHeight, tabs, heading, rtl };
}

/* ------------------------------------------------------------------ */
/* Region layout (recursive)                                           */
/* ------------------------------------------------------------------ */

type Item =
  | { type: 'seg'; seg: Seg; box: Box }
  | { type: 'block'; block: Block; box: Box };

function segBox(s: Seg): Box {
  return { x0: s.x0, x1: s.x1, y0: s.baseline - s.size * 0.8, y1: s.baseline + s.size * DESC };
}

function splitContent(content: RegionContent, area: Box): RegionContent {
  const inside = (b: Box) => centerIn((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, area);
  return {
    spans: content.spans.filter((s) => {
      const [x, y] = spanCenter(s);
      return centerIn(x, y, area);
    }),
    rects: content.rects.filter((r) => contains(area, r, 1.5)),
    rules: content.rules.filter((r) => (r.orient === 'h' ? inside({ x0: r.a, x1: r.b, y0: r.pos, y1: r.pos }) : inside({ x0: r.pos, x1: r.pos, y0: r.a, y1: r.b }))),
    images: content.images.filter((im) => inside(im)),
  };
}

function without(content: RegionContent, area: Box): RegionContent {
  const inside = splitContent(content, area);
  return {
    spans: content.spans.filter((s) => !inside.spans.includes(s)),
    rects: content.rects.filter((r) => !inside.rects.includes(r)),
    rules: content.rules.filter((r) => !inside.rules.includes(r)),
    images: content.images.filter((i) => !inside.images.includes(i)),
  };
}

function buildTable(grid: Grid, content: RegionContent, ctx: LayoutContext): TableBlock {
  const { xs, ys, rules } = grid;
  const nr = ys.length - 1;
  const nc = xs.length - 1;
  // which grid cells are joined (no rule between them)
  const id: number[][] = Array.from({ length: nr }, (_, r) => Array.from({ length: nc }, (_, c) => r * nc + c));
  const par = Array.from({ length: nr * nc }, (_, i) => i);
  const find = (i: number): number => (par[i] === i ? i : (par[i] = find(par[i])));
  for (let r = 0; r < nr; r++) {
    for (let c = 0; c < nc; c++) {
      if (c + 1 < nc && !hasEdge(rules, 'v', xs[c + 1], ys[r], ys[r + 1])) par[find(id[r][c + 1])] = find(id[r][c]);
      if (r + 1 < nr && !hasEdge(rules, 'h', ys[r + 1], xs[c], xs[c + 1])) par[find(id[r + 1][c])] = find(id[r][c]);
    }
  }
  // merged regions must be rectangles; otherwise keep cells separate
  const regions = new Map<number, { r0: number; r1: number; c0: number; c1: number; n: number }>();
  for (let r = 0; r < nr; r++)
    for (let c = 0; c < nc; c++) {
      const k = find(id[r][c]);
      const g = regions.get(k) || { r0: r, r1: r, c0: c, c1: c, n: 0 };
      g.r0 = Math.min(g.r0, r);
      g.r1 = Math.max(g.r1, r);
      g.c0 = Math.min(g.c0, c);
      g.c1 = Math.max(g.c1, c);
      g.n++;
      regions.set(k, g);
    }
  const owner: ({ r0: number; r1: number; c0: number; c1: number } | null)[][] = Array.from({ length: nr }, () => Array(nc).fill(null));
  for (const g of Array.from(regions.values())) {
    const rect = (g.r1 - g.r0 + 1) * (g.c1 - g.c0 + 1) === g.n;
    if (rect) {
      for (let r = g.r0; r <= g.r1; r++) for (let c = g.c0; c <= g.c1; c++) owner[r][c] = g;
    }
  }
  for (let r = 0; r < nr; r++) for (let c = 0; c < nc; c++) if (!owner[r][c]) owner[r][c] = { r0: r, r1: r, c0: c, c1: c };

  const border = (rule: Rule | null): Border | null => (rule ? { width: rule.width, color: rule.color } : null);
  const rows: Row[] = [];
  for (let r = 0; r < nr; r++) {
    const cells: Cell[] = [];
    let c = 0;
    while (c < nc) {
      const g = owner[r][c]!;
      const span = g.c1 - g.c0 + 1;
      const cellBox = { x0: xs[g.c0], x1: xs[g.c1 + 1], y0: ys[g.r0], y1: ys[g.r1 + 1] };
      const borders = {
        top: border(hasEdge(rules, 'h', ys[r], xs[g.c0], xs[g.c1 + 1])),
        bottom: border(hasEdge(rules, 'h', ys[r + 1], xs[g.c0], xs[g.c1 + 1])),
        left: border(hasEdge(rules, 'v', xs[g.c0], ys[r], ys[r + 1])),
        right: border(hasEdge(rules, 'v', xs[g.c1 + 1], ys[r], ys[r + 1])),
      };
      if (g.r0 !== r) {
        cells.push({ span, vMerge: 'continue', borders, blocks: [], top: cellBox.y0, vAlign: 'top' });
      } else {
        const inner = splitContent(content, cellBox);
        inner.rules = inner.rules.filter((q) => !rules.includes(q));
        // shading: the last filled rectangle covering most of the cell
        const fillRect = [...content.rects].reverse().find((f) => {
          const ix = Math.min(f.x1, cellBox.x1) - Math.max(f.x0, cellBox.x0);
          const iy = Math.min(f.y1, cellBox.y1) - Math.max(f.y0, cellBox.y0);
          return ix > 0 && iy > 0 && ix * iy >= boxArea(cellBox) * 0.6;
        });
        inner.rects = inner.rects.filter((f) => f !== fillRect && boxArea(f) < boxArea(cellBox) * 0.6);
        const blocks = layoutRegion(inner, cellBox, ctx, false);
        let vAlign: Cell['vAlign'] = 'top';
        if (blocks.length) {
          const topGap = blocks[0].top - cellBox.y0;
          const bottomGap = cellBox.y1 - blocks[blocks.length - 1].bottom;
          if (Math.abs(topGap - bottomGap) < 2.5 && topGap > 1) vAlign = 'center';
        }
        cells.push({
          span,
          vMerge: g.r1 > g.r0 ? 'restart' : undefined,
          fill: fillRect && !isNearWhite(fillRect.color) ? fillRect.color : undefined,
          borders,
          blocks,
          top: cellBox.y0,
          vAlign,
        });
      }
      c += span;
    }
    rows.push({ height: ys[r + 1] - ys[r], exact: false, cells });
  }
  ctx.stats.tables++;
  return {
    kind: 'table',
    role: nr * nc === 1 ? 'box' : 'data',
    x0: grid.box.x0,
    top: grid.box.y0,
    bottom: grid.box.y1,
    indLeft: 0,
    cols: xs.slice(1).map((x, i) => x - xs[i]),
    rows,
  };
}

function boxTable(rect: Box, fill: string | undefined, content: RegionContent, ctx: LayoutContext): TableBlock {
  const blocks = layoutRegion(content, rect, ctx, false);
  return {
    kind: 'table',
    role: 'box',
    x0: rect.x0,
    top: rect.y0,
    bottom: rect.y1,
    indLeft: 0,
    cols: [rect.x1 - rect.x0],
    rows: [
      {
        height: rect.y1 - rect.y0,
        exact: false,
        cells: [{ span: 1, fill, borders: { top: null, left: null, bottom: null, right: null }, blocks, top: rect.y0, vAlign: 'top' }],
      },
    ],
  };
}

/** Lays out everything inside `container` and returns blocks in reading order. */
export function layoutRegion(content: RegionContent, container: Box, ctx: LayoutContext, pageLevel: boolean): Block[] {
  let rest: RegionContent = { ...content, rules: mergeRules(content.rules) };
  const items: Item[] = [];

  // 1. ruled tables / framed boxes (largest first so nested ones are handled inside)
  const grids = findGrids(rest.rules).sort((a, b) => boxArea(b.box) - boxArea(a.box));
  const taken: Box[] = [];
  for (const g of grids) {
    if (taken.some((t) => contains(t, g.box, 2))) continue;
    if (contains(g.box, container, 2)) continue; // the frame of the region we are already inside
    // A grid that holds no text and no image is decoration; leave its rules alone.
    const inner = splitContent(rest, g.box);
    if (!inner.spans.length && !inner.images.length) continue;
    const t = buildTable(g, { ...inner, rules: g.rules.concat(inner.rules.filter((r) => !g.rules.includes(r))) }, ctx);
    // indent relative to the container
    t.indLeft = g.box.x0 - container.x0;
    items.push({ type: 'block', block: t, box: g.box });
    taken.push(g.box);
    rest = without(rest, g.box);
    rest.rules = rest.rules.filter((r) => !g.rules.includes(r));
  }

  // 2. text highlights: a filled rectangle hugging a single line of text
  rest.rects = rest.rects.filter((r) => {
    if (isNearWhite(r.color)) return false;
    const inside = rest.spans.filter((s) => {
      const [x, y] = spanCenter(s);
      return centerIn(x, y, r);
    });
    if (!inside.length) return true;
    const maxSize = Math.max(...inside.map((s) => s.size));
    const oneLine = inside.every((s) => Math.abs(s.baseline - inside[0].baseline) < maxSize * 0.4);
    if (oneLine && r.y1 - r.y0 < maxSize * 2.2 && r.x1 - r.x0 < (Math.max(...inside.map((s) => s.x1)) - Math.min(...inside.map((s) => s.x0))) + maxSize * 3) {
      inside.forEach((s) => ((s as TextSpan & { highlight?: string }).highlight = r.color));
      return false;
    }
    return true;
  });

  // 3. shaded boxes that contain text or pictures
  const boxes = [...rest.rects].sort((a, b) => boxArea(b) - boxArea(a));
  for (const r of boxes) {
    if (!rest.rects.includes(r)) continue;
    if (contains(container, r, 1) && boxArea(r) >= boxArea(container) * 0.97) continue; // the container's own background
    const inner = splitContent(rest, r);
    if (!inner.spans.length && !inner.images.length) continue;
    inner.rects = inner.rects.filter((q) => q !== r);
    const t = boxTable(r, r.color, inner, ctx);
    t.indLeft = r.x0 - container.x0;
    items.push({ type: 'block', block: t, box: r });
    rest = without(rest, r);
    rest.rects = rest.rects.filter((q) => q !== r);
  }

  // 4. images
  for (const im of rest.images) {
    items.push({
      type: 'block',
      block: { kind: 'image', image: im, x0: im.x0, top: im.y0, bottom: im.y1, indLeft: im.x0 - container.x0, width: im.x1 - im.x0, height: im.y1 - im.y0 },
      box: im,
    });
  }

  // 5. horizontal rules that are not part of a table
  for (const r of rest.rules) {
    if (r.orient !== 'h' || r.b - r.a < 6) continue;
    const box = { x0: r.a, x1: r.b, y0: r.pos - r.width / 2 - 1, y1: r.pos + r.width / 2 };
    items.push({
      type: 'block',
      block: { kind: 'hr', x0: r.a, x1: r.b, top: box.y0, bottom: box.y1, indLeft: r.a - container.x0, indRight: container.x1 - r.b, rule: r },
      box,
    });
  }

  // 6. text segments
  for (const seg of spansToSegments(rest.spans)) items.push({ type: 'seg', seg, box: segBox(seg) });

  return arrange(items, container, ctx, pageLevel);
}

/* ------------------------------------------------------------------ */
/* Reading order: recursive XY-cut                                     */
/* ------------------------------------------------------------------ */

function gaps(items: Item[], axis: 'x' | 'y', minGap: number): { at: number; size: number }[] {
  const iv = items.map((i) => (axis === 'x' ? [i.box.x0, i.box.x1] : [i.box.y0, i.box.y1])).sort((a, b) => a[0] - b[0]);
  const out: { at: number; size: number }[] = [];
  let end = iv.length ? iv[0][1] : 0;
  for (let k = 1; k < iv.length; k++) {
    if (iv[k][0] - end >= minGap) out.push({ at: (end + iv[k][0]) / 2, size: iv[k][0] - end });
    end = Math.max(end, iv[k][1]);
  }
  return out;
}

function lineCount(items: Item[]) {
  const segs = items.filter((i) => i.type === 'seg').map((i) => (i as { seg: Seg }).seg);
  return segsToLines(segs).length;
}

function verticalSplit(items: Item[], bounds: Box): number[] | null {
  const width = bounds.x1 - bounds.x0;
  const sizes = items.filter((i) => i.type === 'seg').map((i) => (i as { seg: Seg }).seg.size);
  const minGap = Math.max(7, median(sizes) * 0.7);
  const cand = gaps(items, 'x', minGap);
  if (!cand.length) return null;
  const cuts: number[] = [];
  let prev = bounds.x0;
  const cutsAll = cand.map((c) => c.at).concat([Infinity]);
  for (const at of cutsAll) {
    const side = items.filter((i) => i.box.x0 >= prev - 0.5 && i.box.x1 <= (at === Infinity ? Infinity : at));
    const sideW = Math.max(...side.map((i) => i.box.x1)) - Math.min(...side.map((i) => i.box.x0));
    const hasBlock = side.some((i) => i.type === 'block');
    const ok = side.length > 0 && (lineCount(side) >= 2 || hasBlock) && (sideW >= width * 0.12 || hasBlock);
    if (!ok) {
      // merge this side with the next one by skipping the cut
      continue;
    }
    if (at !== Infinity) cuts.push(at);
    prev = at;
  }
  // The last side must be valid too: drop trailing cuts that leave a thin remainder
  while (cuts.length) {
    const last = cuts[cuts.length - 1];
    const side = items.filter((i) => i.box.x0 >= last);
    const sideW = Math.max(...side.map((i) => i.box.x1)) - Math.min(...side.map((i) => i.box.x0));
    const hasBlock = side.some((i) => i.type === 'block');
    if (side.length && (lineCount(side) >= 2 || hasBlock) && (sideW >= width * 0.12 || hasBlock)) break;
    cuts.pop();
  }
  return cuts.length ? cuts : null;
}

function bboxOf(items: Item[]): Box {
  return {
    x0: Math.min(...items.map((i) => i.box.x0)),
    y0: Math.min(...items.map((i) => i.box.y0)),
    x1: Math.max(...items.map((i) => i.box.x1)),
    y1: Math.max(...items.map((i) => i.box.y1)),
  };
}

function splitAt(items: Item[], axis: 'x' | 'y', cuts: number[]): Item[][] {
  const groups: Item[][] = cuts.map(() => []).concat([[]]);
  for (const it of items) {
    const c = axis === 'x' ? (it.box.x0 + it.box.x1) / 2 : (it.box.y0 + it.box.y1) / 2;
    let k = 0;
    while (k < cuts.length && c > cuts[k]) k++;
    groups[k].push(it);
  }
  return groups.filter((g) => g.length);
}

function arrange(items: Item[], container: Box, ctx: LayoutContext, pageLevel: boolean): Block[] {
  if (!items.length) return [];
  const bounds = { ...bboxOf(items), x0: Math.min(container.x0, bboxOf(items).x0), x1: Math.max(container.x1, bboxOf(items).x1) };

  // Try side-by-side columns first
  const vcuts = verticalSplit(items, bounds);
  if (vcuts) {
    const groups = splitAt(items, 'x', vcuts);
    if (groups.length > 1) return [columnsTable(groups, vcuts, container, ctx)];
  }

  // Then split at large horizontal gaps, and recurse into each strip
  const sizes = items.filter((i) => i.type === 'seg').map((i) => (i as { seg: Seg }).seg.size);
  const bigGap = Math.max(6, median(sizes) * 1.0);
  const big = gaps(items, 'y', bigGap).map((g) => g.at);
  if (big.length) {
    const strips = splitAt(items, 'y', big);
    if (strips.length > 1) return strips.flatMap((s) => arrange(s, container, ctx, pageLevel));
  }

  // Small gaps: only split off strips that themselves form columns; keep the rest together
  const small = gaps(items, 'y', 0.5).map((g) => g.at);
  if (small.length) {
    const strips = splitAt(items, 'y', small);
    if (strips.length > 1 && strips.some((s) => verticalSplit(s, { ...bounds }))) {
      const out: Block[] = [];
      let pending: Item[] = [];
      for (const s of strips) {
        if (verticalSplit(s, bounds)) {
          if (pending.length) out.push(...leaf(pending, container, ctx, pageLevel));
          pending = [];
          out.push(...arrange(s, container, ctx, pageLevel));
        } else pending.push(...s);
      }
      if (pending.length) out.push(...leaf(pending, container, ctx, pageLevel));
      return out;
    }
  }
  return leaf(items, container, ctx, pageLevel);
}

function columnsTable(groups: Item[][], cuts: number[], container: Box, ctx: LayoutContext): TableBlock {
  ctx.stats.columns = true;
  const all = groups.flat();
  const top = Math.min(...all.map((i) => i.box.y0));
  const bottom = Math.max(...all.map((i) => i.box.y1));
  const edges = [container.x0, ...cuts, container.x1];
  // If the content runs past the container (rare), widen the edges
  edges[0] = Math.min(edges[0], Math.min(...all.map((i) => i.box.x0)));
  edges[edges.length - 1] = Math.max(edges[edges.length - 1], Math.max(...all.map((i) => i.box.x1)));
  let boxBottom = 0;
  const cells: Cell[] = groups.map((g, k) => {
    const cellBox = { x0: edges[k], x1: edges[k + 1], y0: top, y1: bottom };
    let blocks = arrange(g, cellBox, ctx, false);
    let fill: string | undefined;
    // a column that is just one shaded box: shade the column instead of nesting a table
    if (blocks.length === 1 && blocks[0].kind === 'table' && blocks[0].role === 'box') {
      const box = blocks[0];
      const cell = box.rows[0].cells[0];
      if (Math.abs(box.cols[0] - (cellBox.x1 - cellBox.x0)) < 20) {
        fill = cell.fill;
        blocks = cell.blocks;
        if (fill) boxBottom = Math.max(boxBottom, box.bottom);
      }
    }
    return { span: 1, fill, borders: { top: null, left: null, bottom: null, right: null }, blocks, top, vAlign: 'top' as const };
  });
  return {
    kind: 'table',
    role: 'layout',
    x0: edges[0],
    top,
    bottom,
    indLeft: edges[0] - container.x0,
    cols: edges.slice(1).map((x, i) => x - edges[i]),
    // a shaded column keeps its full height (e.g. a CV sidebar); a little less so it never forces a new page
    rows: [{ height: boxBottom > top ? Math.max(0, boxBottom - top - 4) : 0, exact: false, cells }],
  };
}

function leaf(items: Item[], container: Box, ctx: LayoutContext, pageLevel: boolean): Block[] {
  const segs = items.filter((i) => i.type === 'seg').map((i) => (i as { seg: Seg }).seg);
  const blocks = items.filter((i) => i.type === 'block').map((i) => (i as { block: Block }).block);
  const lines = segsToLines(segs);
  // Split the text into runs between blocks so paragraphs never swallow a table/image
  const out: Block[] = [];
  const sortedBlocks = [...blocks].sort((a, b) => a.top - b.top);
  let li = 0;
  for (const b of sortedBlocks) {
    // indents are relative to the container the block finally lands in
    if (b.kind === 'image' || b.kind === 'table') b.indLeft = b.x0 - container.x0;
    else if (b.kind === 'hr') {
      b.indLeft = b.x0 - container.x0;
      b.indRight = container.x1 - b.x1;
    }
    const before: Line[] = [];
    while (li < lines.length && lines[li].baseline < b.top + (b.bottom - b.top) / 2) before.push(lines[li++]);
    out.push(...buildParagraphs(before, container, ctx, pageLevel));
    out.push(b);
  }
  out.push(...buildParagraphs(lines.slice(li), container, ctx, pageLevel));
  return out;
}
