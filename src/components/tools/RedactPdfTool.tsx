'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import {
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  EyeOff,
  Loader2,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { openPdfDocument } from '@/lib/pdfjs-client';
import { boxFromDrag, findTermBoxes, parseSearchTerms, type RedactionBox, type TextItemLike } from '@/lib/redaction';

const OUTPUT_SCALE = 2; // 144 dpi raster for the redacted output
const MAX_FILE_BYTES = 100 * 1024 * 1024;

/**
 * Redaction that really removes content: every page of the output is a flattened
 * image with black boxes burned into the pixels, so no text, vectors or hidden
 * layers survive. The output is re-opened and checked for remaining text.
 */
export function RedactPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [termsInput, setTermsInput] = useState('');
  const [boxes, setBoxes] = useState<RedactionBox[]>([]);
  const [searchSummary, setSearchSummary] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; name: string; size: number; verified: boolean } | null>(null);
  const [drag, setDrag] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [view, setView] = useState<{ scale: number; width: number; height: number }>({ scale: 1, width: 0, height: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Release the PDF and the download URL when replaced or unmounted.
  useEffect(() => () => void pdf?.destroy(), [pdf]);
  useEffect(() => () => {
    if (result) URL.revokeObjectURL(result.url);
  }, [result]);

  const reset = () => {
    setFile(null);
    setPdf(null);
    setPageCount(0);
    setCurrentPage(1);
    setBoxes([]);
    setSearchSummary(null);
    setResult(null);
    setError(null);
    setStatus(null);
  };

  const handleFile = async (selected: File | null) => {
    if (!selected) return;
    reset();
    if (!selected.name.toLowerCase().endsWith('.pdf') && selected.type !== 'application/pdf') {
      setError('Please choose a PDF file.');
      return;
    }
    if (selected.size > MAX_FILE_BYTES) {
      setError('This file is larger than 100 MB. Please split it first.');
      return;
    }
    try {
      const doc = await openPdfDocument(await selected.arrayBuffer());
      setFile(selected);
      setPdf(doc);
      setPageCount(doc.numPages);
    } catch {
      setError('This PDF could not be opened. It may be damaged or password-protected (unlock it first).');
    }
  };

  // Render the current page to fit the available width.
  const renderPage = useCallback(async () => {
    if (!pdf || !canvasRef.current || !wrapRef.current) return;
    const page = await pdf.getPage(currentPage);
    const base = page.getViewport({ scale: 1 });
    const maxWidth = Math.min(wrapRef.current.clientWidth || 600, 900);
    const scale = maxWidth / base.width;
    const viewport = page.getViewport({ scale });
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    await page.render({ canvasContext: ctx, viewport }).promise;
    setView({ scale, width: viewport.width, height: viewport.height });
  }, [pdf, currentPage]);

  useEffect(() => {
    renderPage().catch(() => setError('This page could not be displayed.'));
  }, [renderPage]);

  const runSearch = async () => {
    if (!pdf) return;
    const terms = parseSearchTerms(termsInput);
    if (terms.length === 0) {
      setError('Type at least one word or phrase to find.');
      return;
    }
    setError(null);
    setIsBusy(true);
    try {
      const found: RedactionBox[] = [];
      for (let p = 1; p <= pdf.numPages; p++) {
        setStatus(`Searching page ${p} of ${pdf.numPages}…`);
        const page = await pdf.getPage(p);
        const viewport = page.getViewport({ scale: 1 });
        const content = await page.getTextContent();
        found.push(...findTermBoxes(content.items as TextItemLike[], terms, viewport.transform, p));
      }
      setBoxes((prev) => [...prev.filter((b) => b.source === 'manual'), ...found]);
      const pages = new Set(found.map((b) => b.page)).size;
      setSearchSummary(
        found.length === 0
          ? 'No matches found in the text layer. If this is a scanned document, draw boxes by hand.'
          : `Found ${found.length} match${found.length === 1 ? '' : 'es'} on ${pages} page${pages === 1 ? '' : 's'}.`
      );
    } catch {
      setError('Searching this PDF failed.');
    } finally {
      setStatus(null);
      setIsBusy(false);
    }
  };

  // Drawing boxes by hand (mouse, pen or touch).
  const toPagePoint = (e: React.PointerEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return { x: (e.clientX - rect.left) / view.scale, y: (e.clientY - rect.top) / view.scale };
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if (isBusy || result) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const p = toPagePoint(e);
    setDrag({ x1: p.x, y1: p.y, x2: p.x, y2: p.y });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const p = toPagePoint(e);
    setDrag({ ...drag, x2: p.x, y2: p.y });
  };
  const onPointerUp = () => {
    if (!drag) return;
    const box = boxFromDrag(currentPage, drag.x1, drag.y1, drag.x2, drag.y2);
    setDrag(null);
    if (box.width >= 3 && box.height >= 3) setBoxes((prev) => [...prev, box]);
  };

  const applyRedactions = async () => {
    if (!pdf || !file) return;
    if (boxes.length === 0) {
      setError('Mark at least one area to redact, by searching or by drawing on the page.');
      return;
    }
    setError(null);
    setIsBusy(true);
    try {
      const out = await PDFDocument.create();
      for (let p = 1; p <= pdf.numPages; p++) {
        setStatus(`Burning redactions into page ${p} of ${pdf.numPages}…`);
        const page = await pdf.getPage(p);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: OUTPUT_SCALE });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas is not available in this browser.');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;
        ctx.fillStyle = '#000000';
        for (const b of boxes.filter((bx) => bx.page === p)) {
          ctx.fillRect(b.x * OUTPUT_SCALE, b.y * OUTPUT_SCALE, b.width * OUTPUT_SCALE, b.height * OUTPUT_SCALE);
        }
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
        canvas.width = 0; // free the bitmap memory right away
        if (!blob) throw new Error('Could not encode the redacted page.');
        const img = await out.embedJpg(new Uint8Array(await blob.arrayBuffer()));
        const outPage = out.addPage([base.width, base.height]);
        outPage.drawImage(img, { x: 0, y: 0, width: base.width, height: base.height });
      }
      out.setProducer('PDFKitFree Redact');
      out.setTitle('Redacted document');
      const bytes = await out.save();

      // Verify: the output must contain no extractable text at all.
      setStatus('Verifying the redacted file…');
      const check = await openPdfDocument(bytes);
      let leftover = 0;
      for (let p = 1; p <= check.numPages; p++) {
        const tc = await (await check.getPage(p)).getTextContent();
        leftover += tc.items.filter((i) => 'str' in i && i.str.trim().length > 0).length;
      }
      await check.destroy();

      const outBlob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
      setResult({
        url: URL.createObjectURL(outBlob),
        name: `${file.name.replace(/\.[^/.]+$/, '')}-redacted.pdf`,
        size: outBlob.size,
        verified: leftover === 0,
      });
    } catch (err) {
      setError((err as Error).message || 'Redaction failed.');
    } finally {
      setStatus(null);
      setIsBusy(false);
    }
  };

  const pageBoxes = boxes.filter((b) => b.page === currentPage);

  if (!file) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div
          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void handleFile(e.dataTransfer.files?.[0] || null);
          }}
        >
          <div className="mb-4 rounded-full bg-slate-900 p-3 text-white">
            <EyeOff className="h-7 w-7" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Choose a PDF to redact</h3>
          <p className="mt-2 max-w-md text-sm text-slate-600">
            Find words or draw boxes over anything sensitive. Everything stays in your browser.
          </p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            <Upload className="h-4 w-4" />
            Select PDF file
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => void handleFile(e.target.files?.[0] || null)}
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
          <p className="text-xs text-slate-500">
            {pageCount} page{pageCount === 1 ? '' : 's'} • {boxes.length} area{boxes.length === 1 ? '' : 's'} marked
          </p>
        </div>
        <button type="button" onClick={reset} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
          <Trash2 className="h-4 w-4" /> Remove file
        </button>
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div ref={wrapRef} className="min-w-0">
          <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
            <button
              type="button"
              aria-label="Previous page"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="rounded-md p-1.5 hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span>
              Page {currentPage} of {pageCount}
            </span>
            <button
              type="button"
              aria-label="Next page"
              disabled={currentPage >= pageCount}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="rounded-md p-1.5 hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <div
            className="relative mx-auto touch-none select-none overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
            style={{ width: view.width || undefined, height: view.height || undefined, cursor: result ? 'default' : 'crosshair' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => setDrag(null)}
          >
            <canvas ref={canvasRef} className="block" />
            {pageBoxes.map((b, i) => (
              <div
                key={`${b.x}-${b.y}-${i}`}
                className="group absolute bg-black/85 ring-1 ring-red-500"
                style={{ left: b.x * view.scale, top: b.y * view.scale, width: b.width * view.scale, height: b.height * view.scale }}
              >
                {!result && (
                  <button
                    type="button"
                    aria-label="Remove this redaction"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => setBoxes((prev) => prev.filter((x) => x !== b))}
                    className="absolute -right-2 -top-2 hidden rounded-full bg-white p-0.5 text-slate-700 shadow group-hover:block"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
            {drag && (
              <div
                className="absolute border-2 border-red-500 bg-black/40"
                style={{
                  left: Math.min(drag.x1, drag.x2) * view.scale,
                  top: Math.min(drag.y1, drag.y2) * view.scale,
                  width: Math.abs(drag.x2 - drag.x1) * view.scale,
                  height: Math.abs(drag.y2 - drag.y1) * view.scale,
                }}
              />
            )}
          </div>
          <p className="mt-2 text-center text-xs text-slate-500">Drag on the page to cover an area. Hover a box to remove it.</p>
        </div>

        <div className="space-y-5">
          <div>
            <label htmlFor="redact-terms" className="block text-sm font-semibold text-slate-900">
              Find and redact text
            </label>
            <p className="mt-1 text-xs text-slate-500">One word or phrase per line, or separated by commas. Not case-sensitive.</p>
            <textarea
              id="redact-terms"
              rows={4}
              value={termsInput}
              onChange={(e) => setTermsInput(e.target.value)}
              placeholder={'John Smith\n123-45-6789'}
              disabled={isBusy || !!result}
              className="mt-2 w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <button
              type="button"
              onClick={() => void runSearch()}
              disabled={isBusy || !!result}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Search className="h-4 w-4" /> Find matches
            </button>
            {searchSummary && <p className="mt-2 text-xs text-slate-600">{searchSummary}</p>}
          </div>

          <div className="rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
            The redacted PDF is rebuilt from page images, so text in it can no longer be selected or searched. Check every page before you share it.
          </div>

          {!result ? (
            <button
              type="button"
              onClick={() => void applyRedactions()}
              disabled={isBusy || boxes.length === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <EyeOff className="h-4 w-4" />}
              Apply {boxes.length} redaction{boxes.length === 1 ? '' : 's'}
            </button>
          ) : (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="flex items-center gap-2 font-semibold text-emerald-800">
                <CheckCircle className="h-5 w-5" /> Redacted PDF ready
              </p>
              <p className="mt-1 text-xs text-emerald-800">
                {result.verified
                  ? 'Checked: the output contains no selectable text.'
                  : 'Warning: some text was still detected in the output. Do not share it.'}{' '}
                {(result.size / 1024 / 1024).toFixed(2)} MB.
              </p>
              <a
                href={result.url}
                download={result.name}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <Download className="h-4 w-4" /> Download redacted PDF
              </a>
            </div>
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
        </div>
      </div>
    </div>
  );
}
