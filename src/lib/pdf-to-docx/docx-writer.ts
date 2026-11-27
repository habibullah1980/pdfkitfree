/**
 * Writes laid-out blocks into a genuine Office Open XML (.docx) package.
 * Every PDF page becomes its own Word section with the same page size, orientation and margins,
 * so pages break where they broke in the PDF and nothing spills onto blank pages.
 */
import JSZip from 'jszip';
import type { Block, Cell, ImageBlock, Line, ParaBlock, TableBlock } from './layout';
import type { Box, EncodedImage, ImageEncoder, PageImage, TextSpan } from './types';

export interface HeaderFooterPart {
  blocks: Block[];
  container: Box;
  /** Text of the page number / page total as printed on the sample page; becomes a live field. */
  pageNumberText?: string;
  totalText?: string;
  /** Distance from the page edge to the first line (pt). */
  distance: number;
}

export interface WriterPage {
  width: number;
  height: number;
  margins: { top: number; bottom: number; left: number; right: number };
  container: Box;
  blocks: Block[];
  backgrounds: PageImage[];
  header: boolean;
  footer: boolean;
}

export interface WriterInput {
  pages: WriterPage[];
  header: HeaderFooterPart | null;
  footer: HeaderFooterPart | null;
  bodyFont: string;
  bodySize: number;
  title: string;
  encodeImage: ImageEncoder;
  /** Called with 0..1 while images are encoded. */
  onProgress?: (p: number) => void;
}

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const WP = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing';
const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const PIC = 'http://schemas.openxmlformats.org/drawingml/2006/picture';
const REL = 'http://schemas.openxmlformats.org/package/2006/relationships';
const NS = `xmlns:w="${W}" xmlns:r="${R}" xmlns:wp="${WP}" xmlns:a="${A}" xmlns:pic="${PIC}"`;

const tw = (pt: number) => Math.round(pt * 20);
const emu = (pt: number) => Math.max(1, Math.round(pt * 12700));
const halfPt = (pt: number) => Math.max(2, Math.round(pt * 2));
const eighths = (pt: number) => Math.max(2, Math.min(96, Math.round(pt * 8)));

/** Escapes text for XML and removes characters XML 1.0 does not allow (prevents corrupted files). */
export function xmlText(s: string): string {
  return s
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

type SpanX = TextSpan & { highlight?: string };

interface Ctx {
  media: { data: Uint8Array; ext: string; rid: string; name: string }[];
  mediaCache: Map<PageImage, { rid: string; part: string }>;
  rels: { id: string; type: string; target: string; external?: boolean }[];
  part: 'document' | 'header' | 'footer';
  partRels: { id: string; type: string; target: string; external?: boolean }[];
  docPrId: number;
  encode: ImageEncoder;
  fieldPage?: string;
  fieldTotal?: string;
  pageLevel: boolean;
}

/* ------------------------------------------------------------------ */
/* Runs                                                                */
/* ------------------------------------------------------------------ */

function runProps(s: SpanX, raise: number): string {
  const f = xmlText(s.font.family);
  let x = `<w:rFonts w:ascii="${f}" w:hAnsi="${f}" w:cs="${f}" w:eastAsia="${f}"/>`;
  if (s.font.bold) x += '<w:b/><w:bCs/>';
  if (s.font.italic) x += '<w:i/><w:iCs/>';
  if (s.strike) x += '<w:strike/>';
  x += `<w:color w:val="${s.color}"/>`;
  if (Math.abs(raise) >= 0.5) x += `<w:position w:val="${Math.round(raise * 2)}"/>`;
  x += `<w:sz w:val="${halfPt(s.size)}"/><w:szCs w:val="${halfPt(s.size)}"/>`;
  if (s.underline) x += '<w:u w:val="single"/>';
  if (s.highlight) x += `<w:shd w:val="clear" w:color="auto" w:fill="${s.highlight}"/>`;
  if (s.rtl) x += '<w:rtl/>';
  return `<w:rPr>${x}</w:rPr>`;
}

function textRun(s: SpanX, text: string, raise: number, ctx: Ctx): string {
  if (!text) return '';
  const rpr = runProps(s, raise);
  // Page-number fields in headers/footers
  if (ctx.part !== 'document' && (ctx.fieldPage || ctx.fieldTotal)) {
    const parts: string[] = [];
    const alts = [ctx.fieldPage, ctx.fieldTotal].filter(Boolean).sort((a, b) => (b as string).length - (a as string).length);
    const re = new RegExp(`(?<![\\d.,])(${alts.join('|')})(?![\\d.,]*\\d)`, 'g');
    let last = 0;
    let m: RegExpExecArray | null;
    let used = false;
    while ((m = re.exec(text))) {
      if (m.index > last) parts.push(`<w:r>${rpr}<w:t xml:space="preserve">${xmlText(text.slice(last, m.index))}</w:t></w:r>`);
      const instr = m[1] === ctx.fieldPage && !(parts.some((p) => p.includes(' PAGE ')) && m[1] === ctx.fieldTotal) ? 'PAGE' : 'NUMPAGES';
      parts.push(`<w:fldSimple w:instr=" ${instr} "><w:r>${rpr}<w:t>${xmlText(m[1])}</w:t></w:r></w:fldSimple>`);
      last = m.index + m[1].length;
      used = true;
    }
    if (used) {
      if (last < text.length) parts.push(`<w:r>${rpr}<w:t xml:space="preserve">${xmlText(text.slice(last))}</w:t></w:r>`);
      return parts.join('');
    }
  }
  return `<w:r>${rpr}<w:t xml:space="preserve">${xmlText(text)}</w:t></w:r>`;
}

function styleKey(s: SpanX, raise: number) {
  return [s.font.family, s.font.bold, s.font.italic, Math.round(s.size * 2), s.color, s.underline, s.strike, s.highlight, s.link, Math.round(raise * 2)].join('|');
}

function lineRuns(line: Line, ctx: Ctx): string {
  let xml = '';
  line.segs.forEach((seg, si) => {
    if (si > 0) {
      const s = seg.spans[0];
      xml += `<w:r>${runProps(s, 0)}<w:tab/></w:r>`;
    }
    // merge spans with the same style into one run; add spaces for visible gaps
    let curKey = '';
    let curText = '';
    let curSpan: SpanX | null = null;
    let curRaise = 0;
    let prevEnd = -Infinity;
    const out: { span: SpanX; text: string; raise: number }[] = [];
    for (const sp of seg.spans as SpanX[]) {
      const raise = Math.abs(sp.baseline - line.baseline) > sp.size * 0.15 ? line.baseline - sp.baseline : 0;
      const key = styleKey(sp, raise);
      const gap = sp.x0 - prevEnd;
      const needSpace = prevEnd > -Infinity && gap > Math.min(sp.size, curSpan?.size ?? sp.size) * 0.15;
      if (curSpan && key === curKey) {
        if (needSpace && !/\s$/.test(curText) && !/^\s/.test(sp.text)) curText += ' ';
        curText += sp.text;
      } else {
        if (curSpan) {
          if (needSpace && !/\s$/.test(curText) && !/^\s/.test(sp.text)) curText += ' ';
          out.push({ span: curSpan, text: curText, raise: curRaise });
        }
        curSpan = sp;
        curKey = key;
        curText = sp.text;
        curRaise = raise;
      }
      prevEnd = Math.max(prevEnd, sp.x1);
    }
    if (curSpan) out.push({ span: curSpan, text: curText, raise: curRaise });
    for (const o of out) {
      const run = textRun(o.span, o.text, o.raise, ctx);
      if (o.span.link && /^(https?:|mailto:)/i.test(o.span.link)) {
        const id = `rIdL${ctx.partRels.length + 1}`;
        ctx.partRels.push({ id, type: `${R}/hyperlink`, target: o.span.link, external: true });
        xml += `<w:hyperlink r:id="${id}">${run}</w:hyperlink>`;
      } else xml += run;
    }
  });
  return xml;
}

/* ------------------------------------------------------------------ */
/* Paragraphs, images, rules, tables                                   */
/* ------------------------------------------------------------------ */

function spacer(heightPt: number, extra = ''): string {
  const h = Math.max(1, heightPt);
  return `<w:p><w:pPr>${extra}<w:spacing w:before="0" w:after="0" w:line="${tw(h)}" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr></w:pPr></w:p>`;
}

function paraXml(p: ParaBlock, before: number, ctx: Ctx, sectPr = ''): string {
  let ppr = '';
  if (p.heading) ppr += `<w:pStyle w:val="Heading${p.heading}"/>`;
  const tabs = p.tabs.filter((t) => t.pos > 0 && tw(t.pos) <= 31680);
  if (tabs.length) ppr += `<w:tabs>${tabs.map((t) => `<w:tab w:val="${t.type}" w:pos="${tw(t.pos)}"/>`).join('')}</w:tabs>`;
  ppr += `<w:spacing w:before="${tw(Math.max(0, before))}" w:after="0" w:line="${tw(p.lineHeight)}" w:lineRule="exact"/>`;
  const ind = [`w:left="${tw(p.indLeft)}"`, `w:right="${tw(p.indRight)}"`];
  if (p.firstLine > 0.5) ind.push(`w:firstLine="${tw(p.firstLine)}"`);
  else if (p.firstLine < -0.5) ind.push(`w:hanging="${tw(-p.firstLine)}"`);
  ppr += `<w:ind ${ind.join(' ')}/>`;
  if (p.rtl) ppr = ppr.replace('<w:spacing', '<w:bidi/><w:spacing');
  const jc = p.align === 'both' ? 'both' : p.align === 'center' ? 'center' : p.align === 'right' ? (p.rtl ? 'left' : 'right') : p.rtl ? 'right' : 'left';
  ppr += `<w:jc w:val="${jc}"/>`;
  const firstSpan = p.lines[0].segs[0].spans[0];
  ppr += `<w:rPr><w:sz w:val="${halfPt(firstSpan.size)}"/></w:rPr>`;
  ppr += sectPr;
  // Lines of one paragraph flow together; a space joins them (hyphenated words are rejoined)
  let runs = '';
  // Centred / right-aligned text keeps its original line breaks
  const hardBreaks = p.align === 'center' || p.align === 'right';
  p.lines.forEach((l, i) => {
    if (i > 0 && hardBreaks) runs += `<w:r>${runProps(l.segs[0].spans[0], 0)}<w:br/></w:r>`;
    else if (i > 0) {
      const prev = runs;
      const endsHyphen = /-<\/w:t><\/w:r>(<\/w:hyperlink>)?$/.test(prev);
      if (!endsHyphen) runs += `<w:r>${runProps(l.segs[0].spans[0], 0)}<w:t xml:space="preserve"> </w:t></w:r>`;
    }
    runs += lineRuns(l, ctx);
  });
  return `<w:p><w:pPr>${ppr}</w:pPr>${runs}</w:p>`;
}

async function mediaFor(img: PageImage, ctx: Ctx): Promise<string> {
  const cached = ctx.mediaCache.get(img);
  if (cached && cached.part === ctx.part) return cached.rid;
  // Keep about 200 dpi at the displayed size; never upscale
  const wPt = img.x1 - img.x0;
  const hPt = img.y1 - img.y0;
  const maxW = Math.max(1, Math.round((wPt * 200) / 72));
  const maxH = Math.max(1, Math.round((hPt * 200) / 72));
  const scale = Math.min(1, maxW / img.width, maxH / img.height);
  const enc: EncodedImage = await ctx.encode(img.rgba, img.width, img.height, {
    targetWidth: Math.max(1, Math.round(img.width * scale)),
    targetHeight: Math.max(1, Math.round(img.height * scale)),
    opaque: img.opaque,
  });
  const ext = enc.type === 'jpeg' ? 'jpeg' : 'png';
  const name = `image${ctx.media.length + 1}.${ext}`;
  const rid = `rIdM${ctx.media.length + 1}`;
  ctx.media.push({ data: enc.data, ext, rid, name });
  ctx.partRels.push({ id: rid, type: `${R}/image`, target: `media/${name}` });
  ctx.mediaCache.set(img, { rid, part: ctx.part });
  return rid;
}

function pictureXml(rid: string, wPt: number, hPt: number, id: number): string {
  return `<a:graphic><a:graphicData uri="${PIC}"><pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="Picture ${id}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${emu(wPt)}" cy="${emu(hPt)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic>`;
}

async function imageXml(b: ImageBlock, before: number, ctx: Ctx, sectPr = ''): Promise<string> {
  const rid = await mediaFor(b.image, ctx);
  const id = ++ctx.docPrId;
  const drawing = `<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${emu(b.width)}" cy="${emu(b.height)}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${id}" name="Picture ${id}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>${pictureXml(rid, b.width, b.height, id)}</wp:inline></w:drawing>`;
  // Exact line height = picture height keeps the vertical rhythm; tiny paragraph mark font
  return `<w:p><w:pPr><w:spacing w:before="${tw(Math.max(0, before))}" w:after="0" w:line="${tw(b.height + 0.5)}" w:lineRule="exact"/><w:ind w:left="${tw(Math.max(0, b.indLeft))}" w:right="0"/><w:jc w:val="left"/><w:rPr><w:sz w:val="2"/></w:rPr>${sectPr}</w:pPr><w:r><w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr>${drawing}</w:r></w:p>`;
}

/** Full-page or behind-text pictures, anchored to the page. */
async function anchorXml(img: PageImage, ctx: Ctx): Promise<string> {
  const rid = await mediaFor(img, ctx);
  const id = ++ctx.docPrId;
  const w = img.x1 - img.x0;
  const h = img.y1 - img.y0;
  return `<w:r><w:rPr><w:sz w:val="2"/></w:rPr><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="${id}" behindDoc="1" locked="1" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>${emu(img.x0)}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>${emu(img.y0)}</wp:posOffset></wp:positionV><wp:extent cx="${emu(w)}" cy="${emu(h)}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="${id}" name="Background ${id}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>${pictureXml(rid, w, h, id)}</wp:anchor></w:drawing></w:r>`;
}

function hrXml(b: Extract<Block, { kind: 'hr' }>, before: number, sectPr = ''): string {
  const w = eighths(b.rule.width);
  return `<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="${w}" w:space="0" w:color="${b.rule.color}"/></w:pBdr><w:spacing w:before="${tw(Math.max(0, before))}" w:after="0" w:line="20" w:lineRule="exact"/><w:ind w:left="${tw(b.indLeft)}" w:right="${tw(b.indRight)}"/><w:rPr><w:sz w:val="2"/></w:rPr>${sectPr}</w:pPr></w:p>`;
}

function borderXml(tag: string, b: { width: number; color: string } | null) {
  return b ? `<w:${tag} w:val="single" w:sz="${eighths(b.width)}" w:space="0" w:color="${b.color}"/>` : `<w:${tag} w:val="nil"/>`;
}

async function cellXml(cell: Cell, width: number, ctx: Ctx, cellContainerTop: number): Promise<string> {
  let tcPr = `<w:tcW w:w="${tw(width)}" w:type="dxa"/>`;
  if (cell.span > 1) tcPr += `<w:gridSpan w:val="${cell.span}"/>`;
  if (cell.vMerge) tcPr += cell.vMerge === 'restart' ? '<w:vMerge w:val="restart"/>' : '<w:vMerge/>';
  tcPr += `<w:tcBorders>${borderXml('top', cell.borders.top)}${borderXml('left', cell.borders.left)}${borderXml('bottom', cell.borders.bottom)}${borderXml('right', cell.borders.right)}</w:tcBorders>`;
  if (cell.fill) tcPr += `<w:shd w:val="clear" w:color="auto" w:fill="${cell.fill}"/>`;
  tcPr += '<w:tcMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tcMar>';
  if (cell.vAlign !== 'top') tcPr += `<w:vAlign w:val="${cell.vAlign}"/>`;
  let body = '';
  if (cell.vMerge !== 'continue' && cell.blocks.length) {
    body = await blocksXml(cell.blocks, cell.vAlign === 'center' ? cell.blocks[0].top : cellContainerTop, ctx, false);
  }
  // a cell must end with a paragraph
  if (!body || body.endsWith('</w:tbl>')) body += spacer(1);
  return `<w:tc><w:tcPr>${tcPr}</w:tcPr>${body}</w:tc>`;
}

async function tableXml(t: TableBlock, ctx: Ctx): Promise<string> {
  const totalW = t.cols.reduce((a, b) => a + b, 0);
  let tblPr = `<w:tblW w:w="${tw(totalW)}" w:type="dxa"/>`;
  if (Math.abs(t.indLeft) > 0.2) tblPr += `<w:tblInd w:w="${tw(t.indLeft)}" w:type="dxa"/>`;
  tblPr += '<w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders>';
  tblPr += '<w:tblLayout w:type="fixed"/>';
  tblPr += '<w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar>';
  tblPr += '<w:tblLook w:val="0000" w:firstRow="0" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="1" w:noVBand="1"/>';
  const grid = `<w:tblGrid>${t.cols.map((c) => `<w:gridCol w:w="${tw(c)}"/>`).join('')}</w:tblGrid>`;
  let rowsXml = '';
  let rowTop = t.top;
  for (const row of t.rows) {
    let trPr = '';
    if (row.height > 0) trPr = `<w:trPr><w:trHeight w:val="${tw(row.height)}" w:hRule="${row.exact ? 'exact' : 'atLeast'}"/></w:trPr>`;
    let col = 0;
    let cells = '';
    for (const cell of row.cells) {
      const w = t.cols.slice(col, col + cell.span).reduce((a, b) => a + b, 0);
      cells += await cellXml(cell, w, ctx, rowTop);
      col += cell.span;
    }
    rowsXml += `<w:tr>${trPr}${cells}</w:tr>`;
    rowTop += row.height;
  }
  return `<w:tbl><w:tblPr>${tblPr}</w:tblPr>${grid}${rowsXml}</w:tbl>`;
}

/**
 * Writes blocks one after another. Vertical gaps from the PDF become "space before";
 * tables can't carry that, so a thin spacer paragraph of exactly the gap height goes before them.
 */
async function blocksXml(blocks: Block[], containerTop: number, ctx: Ctx, pageLevel: boolean, sectPr = '', backgrounds = ''): Promise<string> {
  let xml = '';
  let prevBottom = containerTop;
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const gap = b.top - prevBottom;
    const isLast = i === blocks.length - 1;
    const sp = isLast && b.kind !== 'table' ? sectPr : '';
    if (b.kind === 'para') xml += paraXml(b, gap, ctx, sp);
    else if (b.kind === 'image') xml += await imageXml(b, gap, ctx, sp);
    else if (b.kind === 'hr') xml += hrXml(b, gap, sp);
    else {
      xml += spacer(Math.max(1, gap));
      xml += await tableXml(b, ctx);
    }
    // anchored backgrounds go into the first paragraph of the page
    if (i === 0 && backgrounds) {
      if (xml.startsWith('<w:p>')) xml = xml.replace(/<\/w:pPr>/, `</w:pPr>${backgrounds}`);
      else xml = `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/></w:rPr></w:pPr>${backgrounds}</w:p>` + xml;
    }
    prevBottom = Math.max(prevBottom, b.bottom);
  }
  if (pageLevel && (blocks.length === 0 || blocks[blocks.length - 1].kind === 'table')) {
    // a section must end on a paragraph; keep it 1pt high so it never creates an extra page
    xml += `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/></w:rPr>${sectPr}</w:pPr>${blocks.length === 0 ? backgrounds : ''}</w:p>`;
  }
  return xml;
}

/* ------------------------------------------------------------------ */
/* Package                                                             */
/* ------------------------------------------------------------------ */

function relsXml(rels: Ctx['rels']) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="${REL}">${rels
    .map((r) => `<Relationship Id="${r.id}" Type="${r.type}" Target="${xmlText(r.target)}"${r.external ? ' TargetMode="External"' : ''}/>`)
    .join('')}</Relationships>`;
}

function sectPrXml(p: WriterPage, refs: { header: string; footer: string; emptyHeader: string; emptyFooter: string } | null, headerDist: number, footerDist: number) {
  let x = '';
  if (refs) {
    x += `<w:headerReference w:type="default" r:id="${p.header ? refs.header : refs.emptyHeader}"/>`;
    x += `<w:footerReference w:type="default" r:id="${p.footer ? refs.footer : refs.emptyFooter}"/>`;
  }
  const orient = p.width > p.height ? ' w:orient="landscape"' : '';
  x += `<w:type w:val="nextPage"/>`;
  x += `<w:pgSz w:w="${tw(p.width)}" w:h="${tw(p.height)}"${orient}/>`;
  const m = p.margins;
  x += `<w:pgMar w:top="${tw(m.top)}" w:right="${tw(m.right)}" w:bottom="${tw(m.bottom)}" w:left="${tw(m.left)}" w:header="${tw(headerDist)}" w:footer="${tw(footerDist)}" w:gutter="0"/>`;
  x += '<w:cols w:space="720"/>';
  return `<w:sectPr>${x}</w:sectPr>`;
}

export async function writeDocx(input: WriterInput): Promise<Uint8Array> {
  const zip = new JSZip();
  const docRels: Ctx['rels'] = [
    { id: 'rIdStyles', type: `${R}/styles`, target: 'styles.xml' },
    { id: 'rIdSettings', type: `${R}/settings`, target: 'settings.xml' },
    { id: 'rIdFonts', type: `${R}/fontTable`, target: 'fontTable.xml' },
  ];
  const media: Ctx['media'] = [];
  const mediaCache: Ctx['mediaCache'] = new Map();
  let docPrId = 0;

  const overrides: string[] = [];
  let refs: { header: string; footer: string; emptyHeader: string; emptyFooter: string } | null = null;
  const hfParts: { name: string; xml: string; rels: Ctx['rels']; type: 'header' | 'footer' }[] = [];

  const makePart = async (type: 'header' | 'footer', part: HeaderFooterPart | null, name: string) => {
    const rels: Ctx['rels'] = [];
    const ctx: Ctx = { media, mediaCache, rels, part: type, partRels: rels, docPrId, encode: input.encodeImage, fieldPage: part?.pageNumberText, fieldTotal: part?.totalText, pageLevel: false };
    let body = part ? await blocksXml(part.blocks, part.blocks.length ? part.blocks[0].top : 0, ctx, false) : '';
    docPrId = ctx.docPrId;
    if (!body || body.endsWith('</w:tbl>')) body += spacer(1);
    const tag = type === 'header' ? 'hdr' : 'ftr';
    hfParts.push({ name, xml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:${tag} ${NS}>${body}</w:${tag}>`, rels, type });
  };

  if (input.header || input.footer) {
    await makePart('header', input.header, 'header1.xml');
    await makePart('footer', input.footer, 'footer1.xml');
    await makePart('header', null, 'header2.xml');
    await makePart('footer', null, 'footer2.xml');
    refs = { header: 'rIdH1', footer: 'rIdF1', emptyHeader: 'rIdH2', emptyFooter: 'rIdF2' };
    docRels.push(
      { id: 'rIdH1', type: `${R}/header`, target: 'header1.xml' },
      { id: 'rIdF1', type: `${R}/footer`, target: 'footer1.xml' },
      { id: 'rIdH2', type: `${R}/header`, target: 'header2.xml' },
      { id: 'rIdF2', type: `${R}/footer`, target: 'footer2.xml' }
    );
  }

  const ctx: Ctx = { media, mediaCache, rels: docRels, part: 'document', partRels: docRels, docPrId, encode: input.encodeImage, pageLevel: true };
  let body = '';
  const headerDist = input.header ? input.header.distance : 18;
  const footerDist = input.footer ? input.footer.distance : 18;
  for (let i = 0; i < input.pages.length; i++) {
    const p = input.pages[i];
    const sect = sectPrXml(p, refs, headerDist, footerDist);
    const isLast = i === input.pages.length - 1;
    let bg = '';
    for (const img of p.backgrounds) bg += await anchorXml(img, ctx);
    // the last section's properties live at the end of <w:body>
    body += await blocksXml(p.blocks, p.container.y0, ctx, true, isLast ? '' : sect, bg);
    if (isLast) body += sect;
    input.onProgress?.((i + 1) / input.pages.length);
  }

  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document ${NS}><w:body>${body}</w:body></w:document>`
  );

  for (const part of hfParts) {
    zip.file(`word/${part.name}`, part.xml);
    if (part.rels.length) zip.file(`word/_rels/${part.name}.rels`, relsXml(part.rels));
    overrides.push(
      `<Override PartName="/word/${part.name}" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.${part.type}+xml"/>`
    );
  }
  for (const m of media) zip.file(`word/media/${m.name}`, m.data);

  const font = xmlText(input.bodyFont);
  zip.file(
    'word/styles.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="${W}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}" w:eastAsia="${font}"/><w:sz w:val="${halfPt(input.bodySize)}"/><w:szCs w:val="${halfPt(input.bodySize)}"/><w:lang w:val="en-US"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:pPr><w:widowControl w:val="0"/><w:autoSpaceDE w:val="0"/><w:autoSpaceDN w:val="0"/></w:pPr></w:style>
${[1, 2, 3]
  .map(
    (n) =>
      `<w:style w:type="paragraph" w:styleId="Heading${n}"><w:name w:val="heading ${n}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:qFormat/><w:pPr><w:keepNext/><w:outlineLvl w:val="${n - 1}"/></w:pPr></w:style>`
  )
  .join('\n')}
<w:style w:type="character" w:default="1" w:styleId="DefaultParagraphFont"><w:name w:val="Default Paragraph Font"/><w:uiPriority w:val="1"/><w:semiHidden/></w:style>
<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:semiHidden/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>
<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr></w:style>
</w:styles>`
  );
  zip.file(
    'word/settings.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="${W}"><w:defaultTabStop w:val="720"/><w:characterSpacingControl w:val="doNotCompress"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`
  );
  const fonts = new Set<string>([input.bodyFont]);
  const collect = (blocks: Block[]) => {
    for (const b of blocks) {
      if (b.kind === 'para') b.lines.forEach((l) => l.segs.forEach((s) => s.spans.forEach((sp) => fonts.add(sp.font.family))));
      if (b.kind === 'table') b.rows.forEach((r) => r.cells.forEach((c) => collect(c.blocks)));
    }
  };
  input.pages.forEach((p) => collect(p.blocks));
  zip.file(
    'word/fontTable.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:fonts xmlns:w="${W}">${Array.from(fonts)
      .map((f) => {
        const serif = /times|georgia|garamond|cambria|serif|book|palatino|merriweather/i.test(f) && !/sans/i.test(f);
        const mono = /courier|mono|consolas|console/i.test(f);
        return `<w:font w:name="${xmlText(f)}"><w:family w:val="${mono ? 'modern' : serif ? 'roman' : 'swiss'}"/><w:pitch w:val="${mono ? 'fixed' : 'variable'}"/></w:font>`;
      })
      .join('')}</w:fonts>`
  );
  zip.file('word/_rels/document.xml.rels', relsXml(docRels));

  const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  zip.file(
    'docProps/core.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xmlText(input.title)}</dc:title><dc:creator>PDFKitFree</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`
  );
  zip.file(
    'docProps/app.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>PDFKitFree</Application><Pages>${input.pages.length}</Pages></Properties>`
  );
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${REL}"><Relationship Id="rId1" Type="${R}/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="${R}/extended-properties" Target="docProps/app.xml"/></Relationships>`
  );
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/><Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>${overrides.join('')}</Types>`
  );
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}

export type { Box };
