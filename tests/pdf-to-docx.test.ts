/**
 * PDF -> Word regression tests on the 10 fixture documents in tests/fixtures/pdf-to-docx.
 * Checks that each .docx is a valid package with well-formed XML, one section per PDF page with the
 * right size/orientation, every word in reading order, real tables/images/headers where expected,
 * and none of the old converter's artefacts. Visual comparisons: scripts/eval-pdf-to-docx.ts.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import JSZip from 'jszip';
import { loadPdf, makeNodeOcr, makeNodeRenderer, nodeEncodeImage, pdfjs } from './helpers/pdf-to-docx-node';
import { convertPdfToDocx } from '../src/lib/pdf-to-docx';
import { xmlText } from '../src/lib/pdf-to-docx/docx-writer';
import { parseFontName, resolveFont } from '../src/lib/pdf-to-docx/fonts';

const FIX = path.resolve('tests/fixtures/pdf-to-docx');

/** Minimal XML well-formedness check: balanced tags, valid entities, no control characters. */
function assertWellFormed(xml: string, part: string) {
  assert.ok(!/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(xml), `${part}: control characters`);
  assert.ok(!/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-f]+;)/i.test(xml), `${part}: bad entity`);
  const stack: string[] = [];
  const re = /<(\/?)([A-Za-z_][\w:.-]*)([^>]*?)(\/?)>/g;
  let m: RegExpExecArray | null;
  const body = xml.replace(/<\?xml[^>]*\?>/, '');
  while ((m = re.exec(body))) {
    const [, close, name, , self] = m;
    if (self) continue;
    if (close) {
      const open = stack.pop();
      assert.equal(open, name, `${part}: </${name}> closes <${open}>`);
    } else stack.push(name);
  }
  assert.equal(stack.length, 0, `${part}: unclosed <${stack.join('>, <')}>`);
}

const words = (s: string) => s.toLowerCase().replace(/[.,;:]+(?=\s|$)/g, ' ').replace(/[^a-z0-9%$.,()-]+/g, ' ').split(/\s+/).filter(Boolean);
function recall(expected: string, actual: string) {
  const a = words(expected);
  const b = words(actual);
  let prev = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    const cur = new Array(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j++) cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    prev = cur;
  }
  return a.length ? prev[b.length] / a.length : 1;
}

function bagRecall(expected: string, actual: string) {
  const have = new Set(words(actual));
  const a = words(expected);
  return a.length ? a.filter((w) => have.has(w)).length / a.length : 1;
}

async function pdfText(bytes: Uint8Array, file: string) {
  const pdf = await loadPdf(bytes);
  // Poppler's pdftotext joins letter-spaced text properly; pdf.js text items are the fallback
  let poppler = '';
  try {
    poppler = execFileSync('pdftotext', [file, '-']).toString();
  } catch {
    /* not installed */
  }
  let out = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const tc = await (await pdf.getPage(i)).getTextContent();
    out += tc.items.map((it: { str?: string }) => it.str || '').join(' ') + '\n';
  }
  return { text: out, alt: poppler, pages: pdf.numPages };
}

function docText(xml: string) {
  return xml
    .replace(/<w:tab\/>/g, ' ')
    .replace(/<w:br\/>/g, ' ')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}

interface Expect {
  minTables?: number;
  minImages?: number;
  header?: boolean;
  pageNumbers?: boolean;
  ocr?: boolean;
  landscapePages?: number[];
  minRecall?: number;
  bold?: string;
  colour?: string;
}

const EXPECT: Record<string, Expect> = {
  '01-business-report': { bold: '$4.2 million', colour: '059669', minRecall: 0.99 },
  '02-multi-column': { minRecall: 0.95 },
  '03-invoice': { minTables: 1, minImages: 1, minRecall: 0.98, colour: '4B3FE4' },
  '04-resume': { minImages: 1, minRecall: 0.95 },
  '05-logos': { minImages: 4, minRecall: 0.85 },
  '06-headers-footers': { header: true, pageNumbers: true, minRecall: 0.98 },
  '07-scanned': { ocr: true, minRecall: 0.95 },
  '08-mixed-image-text': { minImages: 2, minRecall: 0.98 },
  '09-financial-statement': { bold: 'Gross profit', minRecall: 0.99 },
  '10-page-sizes': { minTables: 1, landscapePages: [2, 4], minRecall: 0.98 },
};

async function main() {
  let passed = 0;
  const test = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
      passed++;
      console.log(`[PASS] ${name}`);
    } catch (e) {
      console.error(`[FAIL] ${name}: ${(e as Error).message}`);
      throw e;
    }
  };

  await test('font names map to Word fonts with style hints', async () => {
    assert.deepEqual(parseFontName('ABCDEF+Calibri-BoldItalic'), { family: 'Calibri', bold: true, italic: true });
    assert.equal(resolveFont('BAAAAA+LiberationSans', {}).family, 'Arial');
    assert.equal(resolveFont('TimesNewRomanPS-BoldMT', {}).family, 'Times New Roman');
    assert.equal(resolveFont('TimesNewRomanPS-BoldMT', {}).bold, true);
    assert.equal(resolveFont('XYZFont', { serif: true }).family, 'Times New Roman');
    assert.equal(resolveFont('Roboto-Regular', {}).family, 'Roboto');
  });

  await test('XML text escaping removes characters that would corrupt the file', async () => {
    assert.equal(xmlText('a<b>&"c"\u0001￿'), 'a&lt;b&gt;&amp;&quot;c&quot;');
    assert.equal(xmlText('x\uD800y'), 'xy');
  });

  const ocr = makeNodeOcr();
  for (const [name, exp] of Object.entries(EXPECT)) {
    await test(`${name}: valid DOCX that keeps layout and content`, async () => {
      const bytes = new Uint8Array(fs.readFileSync(path.join(FIX, `${name}.pdf`)));
      const pdf = await loadPdf(bytes);
      const { docx, report } = await convertPdfToDocx(pdf, {
        OPS: pdfjs.OPS,
        encodeImage: nodeEncodeImage,
        renderRegion: makeNodeRenderer(pdf),
        ocr: ocr.engine,
        title: name,
      });
      const zip = await JSZip.loadAsync(docx);
      for (const part of ['[Content_Types].xml', '_rels/.rels', 'word/document.xml', 'word/styles.xml', 'word/_rels/document.xml.rels']) {
        assert.ok(zip.file(part), `missing ${part}`);
      }
      for (const f of Object.keys(zip.files).filter((k) => /\.(xml|rels)$/.test(k))) {
        assertWellFormed(await zip.file(f)!.async('string'), f);
      }
      const xml = await zip.file('word/document.xml')!.async('string');
      const rels = await zip.file('word/_rels/document.xml.rels')!.async('string');
      // every relationship target exists
      for (const m of Array.from(rels.matchAll(/Target="([^"]+)"(?! TargetMode)/g))) assert.ok(zip.file(`word/${m[1]}`), `missing target ${m[1]}`);
      for (const m of Array.from(xml.matchAll(/r:(?:embed|id)="([^"]+)"/g))) assert.ok(rels.includes(`Id="${m[1]}"`), `unknown relationship ${m[1]}`);

      const { text, alt, pages } = await pdfText(bytes, path.join(FIX, `${name}.pdf`));
      // one section per PDF page, with the PDF page size
      const sects = Array.from(xml.matchAll(/<w:pgSz w:w="(\d+)" w:h="(\d+)"( w:orient="landscape")?\/>/g));
      assert.equal(sects.length, pages, 'section count');
      const pdfPages = await Promise.all(Array.from({ length: pages }, (_, i) => pdf.getPage(i + 1)));
      sects.forEach((m, i) => {
        const vp = pdfPages[i].getViewport({ scale: 1 });
        const rotatedBack = report.warnings.some((w) => w.startsWith(`Page ${i + 1} was stored sideways`));
        const [w, h] = rotatedBack ? [vp.height, vp.width] : [vp.width, vp.height];
        assert.ok(Math.abs(Number(m[1]) - w * 20) <= 2 && Math.abs(Number(m[2]) - h * 20) <= 2, `page ${i + 1} size`);
      });
      for (const p of exp.landscapePages || []) assert.ok(sects[p - 1][3], `page ${p} should be landscape`);

      const expected = fs.existsSync(path.join(FIX, `${name}.expected.txt`)) ? fs.readFileSync(path.join(FIX, `${name}.expected.txt`), 'utf8') : text;
      let all = docText(xml);
      for (const f of Object.keys(zip.files).filter((k) => /word\/(header|footer)\d+\.xml$/.test(k))) all += docText(await zip.file(f)!.async('string'));
      // headers/footers repeat on every PDF page but live once in Word, so compare them as a set of words
      const score = (ref: string) => (report.headers || report.footers ? bagRecall(ref, all) : recall(ref, all));
      const r = expected !== text ? score(expected) : Math.max(score(text), alt ? score(alt) : 0);
      assert.ok(r >= (exp.minRecall ?? 0.98), `text recall ${r.toFixed(3)}`);
      assert.ok(!xml.includes('--- Page'), 'old page markers');

      const tables = (xml.match(/<w:tbl>/g) || []).length;
      const media = Object.keys(zip.files).filter((k) => k.startsWith('word/media/') && !k.endsWith('/')).length;
      if (exp.minTables) assert.ok(report.tables >= exp.minTables && tables >= exp.minTables, `tables ${report.tables}`);
      if (exp.minImages) assert.ok(media >= exp.minImages, `images ${media}`);
      if (exp.header) assert.ok(report.headers && report.footers, 'header/footer');
      if (exp.pageNumbers) {
        const footer = await zip.file('word/footer1.xml')!.async('string');
        assert.ok(footer.includes(' PAGE ') && footer.includes(' NUMPAGES '), 'page number fields');
        // header/footer text must not be repeated in the body
        assert.ok(!xml.includes('Operations Handbook'), 'header text left in body');
      }
      if (exp.ocr) assert.deepEqual(report.ocrPages, [1]);
      if (exp.bold) {
        const i = xml.indexOf(exp.bold);
        const run = xml.slice(xml.lastIndexOf('<w:r>', i), i);
        assert.ok(run.includes('<w:b/>'), `${exp.bold} should be bold`);
      }
      if (exp.colour) assert.ok(xml.includes(`w:val="${exp.colour}"`) || xml.includes(`w:fill="${exp.colour}"`), `colour ${exp.colour}`);
      // no empty trailing pages: the document ends with the last section
      assert.ok(xml.trimEnd().endsWith('</w:sectPr></w:body></w:document>'), 'body ends with section properties');
    });
  }
  await ocr.close();
  console.log(`\n${passed} PDF-to-Word tests passed.`);
}

main().catch(() => process.exit(1));
