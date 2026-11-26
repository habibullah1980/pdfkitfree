import assert from 'node:assert/strict';
import { PDFDocument, StandardFonts, degrees, rgb, pushGraphicsState, translate } from 'pdf-lib';
import { placeWords, drawInvisibleText, OcrWord } from '../src/lib/ocr-text-layer';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');

async function textOf(bytes: Uint8Array, pageNo: number) {
  const doc = await pdfjs.getDocument({ data: bytes.slice(), verbosity: 0 }).promise;
  const page = await doc.getPage(pageNo);
  const vp = page.getViewport({ scale: 1 });
  const tc = await page.getTextContent();
  return { vp, items: tc.items as { str: string; transform: number[] }[] };
}

async function main() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const supported = new Set(font.getCharacterSet());
  const p1 = doc.addPage([600, 800]);
  // Unbalanced graphics state in the original content must not shift the OCR layer.
  p1.drawRectangle({ x: 0, y: 0, width: 10, height: 10, color: rgb(0, 0, 0) });
  p1.pushOperators(pushGraphicsState(), translate(120, 75)); // never popped
  const p2 = doc.addPage([600, 800]);
  p2.setRotation(degrees(90));
  const bytes0 = await doc.save();

  const out = await PDFDocument.load(bytes0);
  const f = await out.embedFont(StandardFonts.Helvetica);
  const scale = 2;
  const words: OcrWord[] = [{ text: 'Invoice', x0: 100, y0: 100, x1: 260, y1: 140 }, { text: 'Total→42', x0: 300, y0: 100, x1: 460, y1: 140 }];

  const outPages = out.getPages();
  for (let i = 0; i < outPages.length; i++) {
    const pg = outPages[i];
    const vp = (await (await pdfjs.getDocument({ data: bytes0.slice(), verbosity: 0 }).promise).getPage(i + 1)).getViewport({ scale });
    const placed = placeWords(words, (x, y) => vp.convertToPdfPoint(x, y), scale, pg.getRotation().angle, (t, s) => f.widthOfTextAtSize(t, s), supported);
    assert.equal(placed.length, 2, 'both words placed');
    assert.equal(placed[1].text, 'Total42', 'unsupported character dropped');
    drawInvisibleText(pg, f, placed);
  }
  const bytes = await out.save();

  for (const pageNo of [1, 2]) {
    const { vp, items } = await textOf(bytes, pageNo);
    const all = items.map((it) => it.str).join(' ');
    assert.match(all, /Invoice/, `page ${pageNo} has Invoice`);
    assert.match(all, /Total42/, `page ${pageNo} has Total42`);
    const inv = items.find((it) => it.str.includes('Invoice'))!;
    // Convert the item origin to displayed coordinates at scale 1 and compare with the OCR box (scale 2).
    const [dx, dy] = vp.convertToViewportPoint(inv.transform[4], inv.transform[5]);
    assert.ok(Math.abs(dx - 50) < 1.5 && Math.abs(dy - 70) < 1.5, `page ${pageNo} origin at word box (${dx.toFixed(1)}, ${dy.toFixed(1)})`);
  }
  console.log('ocr-text-layer: all checks passed');
}
main().catch((e) => { console.error(e); process.exit(1); });
