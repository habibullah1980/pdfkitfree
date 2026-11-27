/**
 * Converts every test PDF with the old and the new PDF-to-Word code, renders the DOCX files with
 * LibreOffice and writes side-by-side comparison images plus a metrics table.
 * Run: npx tsx scripts/eval-pdf-to-docx.ts [outDir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import JSZip from 'jszip';
import { loadPdf, makeNodeOcr, makeNodeRenderer, nodeEncodeImage, pdfjs } from '../tests/helpers/pdf-to-docx-node';
import { convertPdfToDocx } from '../src/lib/pdf-to-docx';

const FIX = path.resolve('tests/fixtures/pdf-to-docx');
const OUT = path.resolve(process.argv[2] || 'tmp-docx-eval');
const only = process.argv[3];
fs.mkdirSync(OUT, { recursive: true });

async function oldConvert(bytes: Uint8Array): Promise<Uint8Array> {
  // The previous implementation: all text of a page joined into one plain paragraph.
  const doc = await loadPdf(bytes);
  const paragraphs: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    const text = tc.items.map((it: { str?: string }) => it.str || '').join(' ').trim();
    paragraphs.push(`--- Page ${i} ---`);
    paragraphs.push(text || '[Image or Scanned Content]');
  }
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs.map((p) => `<w:p><w:r><w:t xml:space="preserve">${esc(p)}</w:t></w:r></w:p>`).join('')}</w:body></w:document>`);
  return zip.generateAsync({ type: 'uint8array' });
}

function words(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9%$.,()\u00c0-\u024f-]+/g, ' ').split(/\s+/).filter(Boolean);
}
/** Share of the original's words found in order in the converted text (LCS / original length). */
function textRecall(orig: string, conv: string) {
  const a = words(orig);
  const b = words(conv);
  if (!a.length) return 1;
  let prev = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    const cur = new Array(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j++) cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    prev = cur;
  }
  return prev[b.length] / a.length;
}

function pdfPages(file: string) {
  const info = execFileSync('pdfinfo', [file]).toString();
  return Number(/Pages:\s+(\d+)/.exec(info)?.[1] || 0);
}

function render(pdf: string, prefix: string) {
  execFileSync('pdftoppm', ['-r', '50', '-png', pdf, prefix]);
}

async function main() {
  const files = fs.readdirSync(FIX).filter((f) => f.endsWith('.pdf') && (!only || f.includes(only))).sort();
  const ocr = makeNodeOcr();
  const rows: Record<string, unknown>[] = [];
  for (const f of files) {
    const name = f.replace(/\.pdf$/, '');
    const bytes = new Uint8Array(fs.readFileSync(path.join(FIX, f)));
    const dir = path.join(OUT, name);
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(path.join(FIX, f), path.join(dir, 'original.pdf'));

    const t0 = Date.now();
    const pdf = await loadPdf(bytes);
    const { docx, report } = await convertPdfToDocx(pdf, {
      OPS: pdfjs.OPS,
      encodeImage: nodeEncodeImage,
      renderRegion: makeNodeRenderer(pdf),
      ocr: ocr.engine,
      title: name,
    });
    const ms = Date.now() - t0;
    fs.writeFileSync(path.join(dir, 'new.docx'), docx);
    fs.writeFileSync(path.join(dir, 'old.docx'), await oldConvert(bytes));
    fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(report, null, 2));

    for (const v of ['old', 'new']) {
      execFileSync('soffice', ['--headless', '--convert-to', 'pdf', '--outdir', dir, path.join(dir, `${v}.docx`)], { stdio: 'ignore' });
    }
    // python-docx must be able to open it
    let pyOk = true;
    try {
      execFileSync('python3', ['-c', `import docx,sys; d=docx.Document(sys.argv[1]); print(len(d.paragraphs), len(d.tables))`, path.join(dir, 'new.docx')]);
    } catch {
      pyOk = false;
    }
    // scanned fixtures have no text layer: compare against the known letter text instead
    const expectedFile = path.join(FIX, `${name}.expected.txt`);
    const origText = fs.existsSync(expectedFile)
      ? fs.readFileSync(expectedFile, 'utf8')
      : execFileSync('pdftotext', ['-layout', path.join(dir, 'original.pdf'), '-']).toString();
    const newText = execFileSync('pdftotext', ['-layout', path.join(dir, 'new.pdf'), '-']).toString();
    const oldText = execFileSync('pdftotext', ['-layout', path.join(dir, 'old.pdf'), '-']).toString();
    const zip = await JSZip.loadAsync(docx);
    const docXml = await zip.file('word/document.xml')!.async('string');
    const media = Object.keys(zip.files).filter((k) => k.startsWith('word/media/') && !k.endsWith('/')).length;
    const tables = (docXml.match(/<w:tbl>/g) || []).length;
    const row = {
      name,
      origPages: pdfPages(path.join(dir, 'original.pdf')),
      oldPages: pdfPages(path.join(dir, 'old.pdf')),
      newPages: pdfPages(path.join(dir, 'new.pdf')),
      oldRecall: +textRecall(origText, oldText).toFixed(3),
      newRecall: +textRecall(origText, newText).toFixed(3),
      tables,
      dataTables: report.tables,
      media,
      pythonDocx: pyOk,
      ms,
      warnings: report.warnings.join(' | '),
    };
    rows.push(row);
    console.log(JSON.stringify(row));

    for (const v of ['original', 'old', 'new']) render(path.join(dir, `${v}.pdf`), path.join(dir, v));
  }
  await ocr.close();
  fs.writeFileSync(path.join(OUT, 'metrics.json'), JSON.stringify(rows, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
