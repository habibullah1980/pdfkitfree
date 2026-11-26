import JSZip from 'jszip';
import { PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName, PDFRef, PDFString } from 'pdf-lib';
import { SRGB_ICC_BASE64 } from '@/lib/srgb-icc';

/* ------------------------------------------------------------------ */
/* PDF text -> table rows (for CSV export)                             */
/* ------------------------------------------------------------------ */

export interface PositionedText {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Groups text runs into rows by their baseline and splits each row into cells where the
 * horizontal gap is wider than about two characters. Good for real tables and still readable for prose.
 */
export function textItemsToRows(items: PositionedText[]): string[][] {
  const runs = items.filter((i) => i.str.trim().length > 0).sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: PositionedText[][] = [];
  for (const run of runs) {
    const tol = Math.max(2, run.height * 0.5);
    const row = rows.find((r) => Math.abs(r[0].y - run.y) <= tol);
    if (row) row.push(run);
    else rows.push([run]);
  }
  return rows.map((row) => {
    row.sort((a, b) => a.x - b.x);
    const cells: string[] = [];
    let current = '';
    let lastEnd = -Infinity;
    for (const run of row) {
      const charW = run.str.length ? run.width / run.str.length : run.height * 0.5;
      const gap = run.x - lastEnd;
      if (current && gap > Math.max(charW * 2.2, 8)) {
        cells.push(current.trim());
        current = '';
      } else if (current && gap > charW * 0.15) {
        current += ' ';
      }
      current += run.str;
      lastEnd = run.x + run.width;
    }
    if (current.trim()) cells.push(current.trim());
    return cells;
  });
}

export function rowsToCsv(rows: string[][]): string {
  const esc = (c: string) => (/[",\n\r]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c);
  return '﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n') + '\r\n';
}

/* ------------------------------------------------------------------ */
/* Images -> real .pptx (one full-bleed picture per slide)             */
/* ------------------------------------------------------------------ */

const EMU_PER_PT = 12700;

/** Builds a minimal, valid PowerPoint file. Slide size follows the first page's aspect ratio. */
export async function buildPptxFromImages(slides: { png: Uint8Array; widthPt: number; heightPt: number }[]): Promise<Blob> {
  const first = slides[0];
  const cx = Math.round(first.widthPt * EMU_PER_PT);
  const cy = Math.round(first.heightPt * EMU_PER_PT);
  const zip = new JSZip();
  const P = 'http://schemas.openxmlformats.org/presentationml/2006/main';
  const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
  const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const REL = 'http://schemas.openxmlformats.org/package/2006/relationships';
  const xml = (s: string) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${s}`;

  zip.file(
    '[Content_Types].xml',
    xml(`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="png" ContentType="image/png"/>
<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
${slides.map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('\n')}
</Types>`)
  );
  zip.file(
    '_rels/.rels',
    xml(`<Relationships xmlns="${REL}">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`)
  );
  zip.file(
    'docProps/core.xml',
    xml(`<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Converted PDF</dc:title><dc:creator>PDFKitFree</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</dcterms:created></cp:coreProperties>`)
  );
  zip.file(
    'docProps/app.xml',
    xml(`<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>PDFKitFree</Application><Slides>${slides.length}</Slides></Properties>`)
  );
  zip.file(
    'ppt/presentation.xml',
    xml(`<p:presentation xmlns:a="${A}" xmlns:r="${R}" xmlns:p="${P}">
<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
<p:sldIdLst>${slides.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 3}"/>`).join('')}</p:sldIdLst>
<p:sldSz cx="${cx}" cy="${cy}"/><p:notesSz cx="${cy}" cy="${cx}"/>
</p:presentation>`)
  );
  zip.file(
    'ppt/_rels/presentation.xml.rels',
    xml(`<Relationships xmlns="${REL}">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
${slides.map((_, i) => `<Relationship Id="rId${i + 3}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`).join('\n')}
</Relationships>`)
  );
  const emptyTree = `<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>`;
  zip.file(
    'ppt/slideMasters/slideMaster1.xml',
    xml(`<p:sldMaster xmlns:a="${A}" xmlns:r="${R}" xmlns:p="${P}">${emptyTree}
<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>`)
  );
  zip.file(
    'ppt/slideMasters/_rels/slideMaster1.xml.rels',
    xml(`<Relationships xmlns="${REL}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>`)
  );
  zip.file(
    'ppt/slideLayouts/slideLayout1.xml',
    xml(`<p:sldLayout xmlns:a="${A}" xmlns:r="${R}" xmlns:p="${P}" type="blank">${emptyTree}<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`)
  );
  zip.file(
    'ppt/slideLayouts/_rels/slideLayout1.xml.rels',
    xml(`<Relationships xmlns="${REL}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`)
  );
  const clr = (n: string, v: string) => `<a:${n}><a:srgbClr val="${v}"/></a:${n}>`;
  const font = `<a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/>`;
  const fill = `<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>`;
  const line = `<a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>`;
  zip.file(
    'ppt/theme/theme1.xml',
    xml(`<a:theme xmlns:a="${A}" name="PDFKitFree"><a:themeElements>
<a:clrScheme name="Office">${clr('dk1', '000000')}${clr('lt1', 'FFFFFF')}${clr('dk2', '44546A')}${clr('lt2', 'E7E6E6')}${clr('accent1', '4B3FE4')}${clr('accent2', 'FFC83D')}${clr('accent3', 'A5A5A5')}${clr('accent4', '5B9BD5')}${clr('accent5', '70AD47')}${clr('accent6', 'ED7D31')}${clr('hlink', '0563C1')}${clr('folHlink', '954F72')}</a:clrScheme>
<a:fontScheme name="Office"><a:majorFont>${font}</a:majorFont><a:minorFont>${font}</a:minorFont></a:fontScheme>
<a:fmtScheme name="Office"><a:fillStyleLst>${fill}${fill}${fill}</a:fillStyleLst><a:lnStyleLst>${line}${line}${line}</a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst>${fill}${fill}${fill}</a:bgFillStyleLst></a:fmtScheme>
</a:themeElements></a:theme>`)
  );

  slides.forEach((s, i) => {
    const n = i + 1;
    zip.file(`ppt/media/image${n}.png`, s.png);
    zip.file(
      `ppt/slides/slide${n}.xml`,
      xml(`<p:sld xmlns:a="${A}" xmlns:r="${R}" xmlns:p="${P}"><p:cSld><p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>
<p:pic><p:nvPicPr><p:cNvPr id="2" name="Page ${n}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>
<p:blipFill><a:blip r:embed="rId2"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>
<p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>
</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`)
    );
    zip.file(
      `ppt/slides/_rels/slide${n}.xml.rels`,
      xml(`<Relationships xmlns="${REL}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${n}.png"/></Relationships>`)
    );
  });

  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
}

/* ------------------------------------------------------------------ */
/* PDF/A-2b preparation                                                */
/* ------------------------------------------------------------------ */

export interface PdfaResult {
  bytes: Uint8Array;
  /** Fonts the original file uses without embedding them. PDF/A requires every font to be embedded. */
  unembeddedFonts: string[];
}

function fontIsEmbedded(doc: PDFDocument, font: PDFDict): boolean {
  const lookupDict = (v: unknown) => (v instanceof PDFRef ? doc.context.lookup(v) : v) as PDFDict | undefined;
  const subtype = font.get(PDFName.of('Subtype'))?.toString();
  if (subtype === '/Type3') return true;
  if (subtype === '/Type0') {
    const desc = font.get(PDFName.of('DescendantFonts'));
    const arr = (desc instanceof PDFRef ? doc.context.lookup(desc) : desc) as PDFArray | undefined;
    const child = arr ? lookupDict(arr.get(0)) : undefined;
    return child ? fontIsEmbedded(doc, child) : false;
  }
  const fd = lookupDict(font.get(PDFName.of('FontDescriptor')));
  if (!fd) return false;
  return ['FontFile', 'FontFile2', 'FontFile3'].some((k) => fd.has(PDFName.of(k)));
}

const xmlEscape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Adds what PDF/A-2b needs at document level: XMP metadata with the PDF/A id, matching Info fields,
 * an sRGB output intent and a file ID. It cannot embed fonts that are missing from the original,
 * so those are reported back instead of claiming compliance.
 */
export async function preparePdfA(input: ArrayBuffer, title: string): Promise<PdfaResult> {
  const doc = await PDFDocument.load(input, { updateMetadata: false });
  const ctx = doc.context;

  const unembedded = new Set<string>();
  for (const [, obj] of ctx.enumerateIndirectObjects()) {
    if (obj instanceof PDFDict && obj.get(PDFName.of('Type'))?.toString() === '/Font') {
      const sub = obj.get(PDFName.of('Subtype'))?.toString();
      if (sub === '/CIDFontType0' || sub === '/CIDFontType2') continue; // checked through their Type0 parent
      if (!fontIsEmbedded(doc, obj)) unembedded.add((obj.get(PDFName.of('BaseFont'))?.toString() || 'unnamed font').replace(/^\//, ''));
    }
  }

  const now = new Date();
  const iso = now.toISOString().replace(/\.\d+Z$/, 'Z');
  const docTitle = doc.getTitle() || title;
  doc.setTitle(docTitle);
  doc.setProducer('PDFKitFree');
  doc.setCreator(doc.getCreator() || 'PDFKitFree');
  doc.setModificationDate(now);
  const created = doc.getCreationDate() || now;
  doc.setCreationDate(created);
  const createdIso = created.toISOString().replace(/\.\d+Z$/, 'Z');

  const xmp = `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xmp="http://ns.adobe.com/xap/1.0/" xmlns:pdf="http://ns.adobe.com/pdf/1.3/" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
   <dc:format>application/pdf</dc:format>
   <dc:title><rdf:Alt><rdf:li xml:lang="x-default">${xmlEscape(docTitle)}</rdf:li></rdf:Alt></dc:title>
   <xmp:CreateDate>${createdIso}</xmp:CreateDate>
   <xmp:ModifyDate>${iso}</xmp:ModifyDate>
   <xmp:MetadataDate>${iso}</xmp:MetadataDate>
   <xmp:CreatorTool>${xmlEscape(doc.getCreator() || 'PDFKitFree')}</xmp:CreatorTool>
   <pdf:Producer>PDFKitFree</pdf:Producer>
   <pdfaid:part>2</pdfaid:part>
   <pdfaid:conformance>B</pdfaid:conformance>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
  const metaStream = ctx.stream(new TextEncoder().encode(xmp), { Type: 'Metadata', Subtype: 'XML' });
  doc.catalog.set(PDFName.of('Metadata'), ctx.register(metaStream));

  const icc = Uint8Array.from(atob(SRGB_ICC_BASE64), (c) => c.charCodeAt(0));
  const iccRef = ctx.register(ctx.stream(icc, { N: 3 }));
  const intent = ctx.obj({
    Type: 'OutputIntent',
    S: 'GTS_PDFA1',
    OutputConditionIdentifier: PDFString.of('sRGB IEC61966-2.1'),
    Info: PDFString.of('sRGB IEC61966-2.1'),
    DestOutputProfile: iccRef,
  });
  doc.catalog.set(PDFName.of('OutputIntents'), ctx.obj([ctx.register(intent)]));

  const id = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
  ctx.trailerInfo.ID = ctx.obj([PDFHexString.of(id), PDFHexString.of(id)]);

  const bytes = await doc.save({ useObjectStreams: false });
  return { bytes, unembeddedFonts: Array.from(unembedded) };
}

/* ------------------------------------------------------------------ */
/* Line diff for Compare PDF                                           */
/* ------------------------------------------------------------------ */

export type DiffOp = { type: 'same' | 'removed' | 'added'; line: string };

/** Longest-common-subsequence diff of two line lists (fine for page-sized inputs). */
export function diffLines(a: string[], b: string[]): DiffOp[] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ type: 'same', line: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: 'removed', line: a[i++] });
    } else {
      ops.push({ type: 'added', line: b[j++] });
    }
  }
  while (i < n) ops.push({ type: 'removed', line: a[i++] });
  while (j < m) ops.push({ type: 'added', line: b[j++] });
  return ops;
}
