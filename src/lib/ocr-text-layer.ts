/**
 * Adds an invisible, selectable text layer to a PDF page from OCR results, so a scanned
 * page becomes searchable while it looks exactly the same. Runs in the browser and in Node.
 */
import {
  PDFFont,
  PDFPage,
  TextRenderingMode,
  beginText,
  endText,
  popGraphicsState,
  pushGraphicsState,
  rotateAndSkewTextDegreesAndTranslate,
  setCharacterSqueeze,
  setFontAndSize,
  setTextRenderingMode,
  showText,
  PDFOperator,
} from 'pdf-lib';

/** A recognised word with its box in rendered-image pixels (top-left origin, as displayed). */
export interface OcrWord {
  text: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface PlacedWord {
  text: string;
  x: number;
  y: number;
  size: number;
  squeeze: number; // horizontal scaling, percent
  angle: number; // degrees
}

/**
 * Maps OCR word boxes into PDF user space.
 * @param toPdfPoint converts a rendered-image pixel to PDF user space (pdf.js viewport.convertToPdfPoint)
 * @param scale rendered pixels per PDF point
 * @param rotation the page's /Rotate value (0, 90, 180, 270)
 * @param widthOfTextAtSize font metrics for the font that will be used
 * @param supported characters the font can encode; others are dropped
 */
export function placeWords(
  words: OcrWord[],
  toPdfPoint: (x: number, y: number) => number[],
  scale: number,
  rotation: number,
  widthOfTextAtSize: (text: string, size: number) => number,
  supported: Set<number>
): PlacedWord[] {
  const out: PlacedWord[] = [];
  const angle = ((rotation % 360) + 360) % 360;
  for (const w of words) {
    const text = Array.from(w.text.trim())
      .filter((ch) => supported.has(ch.codePointAt(0) ?? -1))
      .join('');
    if (!text) continue;
    const widthPts = (w.x1 - w.x0) / scale;
    const heightPts = (w.y1 - w.y0) / scale;
    if (widthPts <= 0 || heightPts <= 0) continue;
    const size = Math.max(1, heightPts);
    const natural = widthOfTextAtSize(text, size);
    const squeeze = natural > 0 ? Math.min(1000, Math.max(1, (widthPts / natural) * 100)) : 100;
    const [x, y] = toPdfPoint(w.x0, w.y1); // bottom-left of the word as displayed
    out.push({ text, x, y, size, squeeze, angle });
  }
  return out;
}

/** Writes placed words onto the page as invisible text, isolated from the page's own graphics state. */
export function drawInvisibleText(page: PDFPage, font: PDFFont, words: PlacedWord[]) {
  if (words.length === 0) return;
  const node = page.node;
  const context = page.doc.context;
  node.normalize();
  // Wrap the existing content in q ... Q so any unbalanced state cannot shift our text.
  const start = context.register(context.contentStream([pushGraphicsState()]));
  const end = context.register(context.contentStream([popGraphicsState()]));
  node.wrapContentStreams(start, end);

  const key = node.newFontDictionary(font.name, font.ref);
  const ops: PDFOperator[] = [pushGraphicsState(), beginText(), setTextRenderingMode(TextRenderingMode.Invisible)];
  for (const w of words) {
    ops.push(
      setFontAndSize(key, w.size),
      setCharacterSqueeze(w.squeeze),
      rotateAndSkewTextDegreesAndTranslate(w.angle, 0, 0, w.x, w.y),
      showText(font.encodeText(w.text + ' '))
    );
  }
  ops.push(endText(), popGraphicsState());
  node.addContentStream(context.register(context.contentStream(ops)));
}
