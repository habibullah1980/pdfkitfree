import type { OcrWord } from './types';

type TBox = { x0: number; y0: number; x1: number; y1: number };
type TBlock = {
  paragraphs?: {
    lines?: { baseline?: TBox; bbox?: TBox; words?: { text: string; confidence: number; bbox: TBox }[] }[];
  }[];
};

/** Flattens Tesseract.js block output into words in PDF points (top-left origin). */
export function tesseractBlocksToWords(blocks: unknown, scale: number): OcrWord[] {
  const out: OcrWord[] = [];
  let lineNo = 0;
  for (const block of (blocks as TBlock[] | null) ?? []) {
    for (const para of block.paragraphs ?? []) {
      for (const line of para.lines ?? []) {
        lineNo++;
        const bl = line.baseline;
        for (const w of line.words ?? []) {
          if (!w.text.trim()) continue;
          let baseline: number | undefined;
          if (bl && bl.x1 !== bl.x0) {
            const cx = (w.bbox.x0 + w.bbox.x1) / 2;
            baseline = bl.y0 + ((bl.y1 - bl.y0) * (cx - bl.x0)) / (bl.x1 - bl.x0);
          }
          out.push({
            text: w.text,
            x0: w.bbox.x0 / scale,
            y0: w.bbox.y0 / scale,
            x1: w.bbox.x1 / scale,
            y1: w.bbox.y1 / scale,
            baseline: baseline != null ? baseline / scale : undefined,
            line: lineNo,
            confidence: w.confidence,
          });
        }
      }
    }
  }
  return out;
}
