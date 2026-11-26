'use client';

import React, { useEffect, useRef, useState } from 'react';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { AlertCircle, CheckCircle, Copy, Download, FileText, Loader2, ScanText, Trash2, Upload } from 'lucide-react';
import { openPdfDocument } from '@/lib/pdfjs-client';
import { drawInvisibleText, placeWords, type OcrWord } from '@/lib/ocr-text-layer';

const MAX_FILE_BYTES = 100 * 1024 * 1024;
const MAX_PAGES = 200;
const TARGET_DPI = 300;
const MAX_RENDER_SIDE = 4200; // keeps memory in check on large pages
const MIN_EXISTING_TEXT_CHARS = 25; // pages with this much real text are left as they are

interface OcrResult {
  pdfUrl: string;
  pdfName: string;
  textUrl: string;
  textName: string;
  text: string;
  pagesOcred: number;
  pagesSkipped: number;
  words: number;
  confidence: number | null;
}

type TesseractWorker = Awaited<ReturnType<typeof import('tesseract.js')['createWorker']>>;

async function createOcrWorker(onProgress: (p: number) => void): Promise<TesseractWorker> {
  const { createWorker, OEM } = await import('tesseract.js');
  // Everything is served from this site (see scripts/copy-ocr-assets.mjs): the file never leaves the browser.
  return createWorker('eng', OEM.LSTM_ONLY, {
    workerPath: '/tesseract/worker.min.js',
    corePath: '/tesseract',
    langPath: '/tesseract',
    workerBlobURL: false,
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') onProgress(m.progress);
    },
  });
}

function collectWords(blocks: unknown): { words: OcrWord[]; confidences: number[] } {
  const words: OcrWord[] = [];
  const confidences: number[] = [];
  type B = { paragraphs?: { lines?: { words?: { text: string; confidence: number; bbox: { x0: number; y0: number; x1: number; y1: number } }[] }[] }[] };
  for (const block of (blocks as B[] | null) ?? []) {
    for (const para of block.paragraphs ?? []) {
      for (const line of para.lines ?? []) {
        for (const w of line.words ?? []) {
          if (!w.text.trim() || w.confidence < 30) continue;
          words.push({ text: w.text, ...w.bbox });
          confidences.push(w.confidence);
        }
      }
    }
  }
  return { words, confidences };
}

/**
 * Real OCR in the browser with Tesseract: each scanned page is rendered at ~300 dpi,
 * recognised, and an invisible text layer is added on top of the original page, so the
 * PDF looks the same but its text can be searched, selected and copied.
 */
export function OcrPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OcrResult | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      if (result) {
        URL.revokeObjectURL(result.pdfUrl);
        URL.revokeObjectURL(result.textUrl);
      }
    },
    [result]
  );

  const chooseFile = (f: File | null) => {
    if (!f) return;
    setError(null);
    setResult(null);
    if (!f.type.includes('pdf') && !f.name.toLowerCase().endsWith('.pdf')) {
      setError('Please choose a PDF file.');
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setError('This file is larger than 100 MB. Please split it first.');
      return;
    }
    setFile(f);
  };

  const run = async () => {
    if (!file) return;
    setIsBusy(true);
    setError(null);
    setResult(null);
    let worker: TesseractWorker | null = null;
    let pdf: Awaited<ReturnType<typeof openPdfDocument>> | null = null;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      setStatus('Opening PDF…');
      pdf = await openPdfDocument(bytes);
      if (pdf.numPages > MAX_PAGES) throw new Error(`This PDF has ${pdf.numPages} pages. OCR works on up to ${MAX_PAGES} pages at a time; please split it first.`);

      const out = await PDFDocument.load(bytes, { ignoreEncryption: false, updateMetadata: false });
      const font = await out.embedFont(StandardFonts.Helvetica);
      const supported = new Set(font.getCharacterSet());
      const outPages = out.getPages();

      let currentPage = 0;
      setStatus('Loading the OCR engine (first time only, about 7 MB)…');
      worker = await createOcrWorker((p) => setStatus(`Reading page ${currentPage} of ${pdf!.numPages}… ${Math.round(p * 100)}%`));

      const textParts: string[] = [];
      const confidences: number[] = [];
      let ocred = 0;
      let skipped = 0;
      let wordCount = 0;

      for (let i = 1; i <= pdf.numPages; i++) {
        currentPage = i;
        const page = await pdf.getPage(i);
        const existing = await page.getTextContent();
        const existingText = existing.items.map((it) => ('str' in it ? it.str : '')).join(' ').replace(/\s+/g, ' ').trim();
        if (existingText.length >= MIN_EXISTING_TEXT_CHARS) {
          skipped++;
          textParts.push(`=== Page ${i} (already had text) ===\n${existingText}`);
          page.cleanup();
          continue;
        }

        setStatus(`Reading page ${i} of ${pdf.numPages}…`);
        const base = page.getViewport({ scale: 1 });
        const scale = Math.min(TARGET_DPI / 72, MAX_RENDER_SIDE / Math.max(base.width, base.height));
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas is not available in this browser.');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;

        const { data } = await worker.recognize(canvas, {}, { text: true, blocks: true });
        canvas.width = 0;
        canvas.height = 0;

        const { words, confidences: c } = collectWords(data.blocks);
        confidences.push(...c);
        const placed = placeWords(
          words,
          (x, y) => viewport.convertToPdfPoint(x, y),
          scale,
          page.rotate,
          (t, s) => font.widthOfTextAtSize(t, s),
          supported
        );
        drawInvisibleText(outPages[i - 1], font, placed);
        wordCount += placed.length;
        ocred++;
        textParts.push(`=== Page ${i} ===\n${data.text.trim() || '[No text recognised on this page]'}`);
        page.cleanup();
      }

      if (ocred === 0) {
        throw new Error('Every page in this PDF already has selectable text, so OCR is not needed. Use Extract Text instead.');
      }

      setStatus('Saving searchable PDF…');
      const pdfBytes = await out.save({ useObjectStreams: true });
      const text = textParts.join('\n\n') + '\n';
      const base = file.name.replace(/\.[^/.]+$/, '');
      setResult({
        pdfUrl: URL.createObjectURL(new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })),
        pdfName: `${base}-searchable.pdf`,
        textUrl: URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' })),
        textName: `${base}-ocr.txt`,
        text,
        pagesOcred: ocred,
        pagesSkipped: skipped,
        words: wordCount,
        confidence: confidences.length ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length) : null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(/encrypt/i.test(message) ? 'This PDF is password-protected. Unlock it first, then run OCR.' : message);
    } finally {
      setStatus(null);
      setIsBusy(false);
      await worker?.terminate().catch(() => undefined);
      await pdf?.destroy().catch(() => undefined);
    }
  };

  const copyText = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy to the clipboard. Please download the text file instead.');
    }
  };

  if (!file) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div
          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            chooseFile(e.dataTransfer.files?.[0] ?? null);
          }}
        >
          <div className="mb-4 rounded-full bg-brand-600 p-3 text-white">
            <ScanText className="h-7 w-7" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Choose a scanned PDF</h3>
          <p className="mt-2 max-w-md text-sm text-slate-600">
            Text is recognised in your browser. Your file is not uploaded anywhere. English text, up to {MAX_PAGES} pages.
          </p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            <Upload className="h-4 w-4" /> Select PDF
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
          />
        </div>
        {error && (
          <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{file.name}</p>
          <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
        </div>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => {
            setFile(null);
            setResult(null);
            setError(null);
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" /> Remove file
        </button>
      </div>

      <div className="mt-5 space-y-4">
        {!result && (
          <button
            type="button"
            onClick={run}
            disabled={isBusy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanText className="h-4 w-4" />}
            {isBusy ? 'Recognising text…' : 'Run OCR'}
          </button>
        )}

        {status && (
          <p className="flex items-center gap-2 text-sm text-slate-600" aria-live="polite">
            <Loader2 className="h-4 w-4 animate-spin" /> {status}
          </p>
        )}

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </p>
        )}

        {result && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="flex items-center gap-2 font-semibold text-emerald-800">
              <CheckCircle className="h-5 w-5" /> Searchable PDF ready
            </p>
            <p className="mt-1 text-xs text-emerald-800">
              Recognised {result.words.toLocaleString()} words on {result.pagesOcred} page{result.pagesOcred === 1 ? '' : 's'}
              {result.confidence !== null && <> (average confidence {result.confidence}%)</>}
              {result.pagesSkipped > 0 && <>. {result.pagesSkipped} page{result.pagesSkipped === 1 ? '' : 's'} already had text and were left as they were</>}
              . The pages look the same; the text can now be searched, selected and copied.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <a
                href={result.pdfUrl}
                download={result.pdfName}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <Download className="h-4 w-4" /> Download PDF
              </a>
              <a
                href={result.textUrl}
                download={result.textName}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
              >
                <FileText className="h-4 w-4" /> Download text
              </a>
              <button
                type="button"
                onClick={copyText}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
              >
                <Copy className="h-4 w-4" /> {copied ? 'Copied' : 'Copy text'}
              </button>
            </div>
            <textarea
              readOnly
              value={result.text}
              aria-label="Recognised text"
              className="mt-3 h-64 w-full rounded-lg border border-emerald-200 bg-white p-3 font-mono text-xs text-slate-800"
            />
          </div>
        )}
      </div>
    </div>
  );
}
