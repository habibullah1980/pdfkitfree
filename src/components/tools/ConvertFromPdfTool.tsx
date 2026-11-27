'use client';

import React, { useState, useRef, useEffect } from 'react';
import JSZip from 'jszip';
import { Upload, File as FileIcon, Download, Trash2, FileText, RotateCcw, Info, ScanText } from 'lucide-react';
import { openPdfDocument } from '@/lib/pdfjs-client';
import { buildPptxFromImages, preparePdfA, rowsToCsv, textItemsToRows } from '@/lib/pdf-export-formats';
import { friendlyPdfError, type FriendlyError } from '@/lib/friendly-errors';
import type { ConversionReport } from '@/lib/pdf-to-docx/types';
import { ToolError, ToolProgress, SuccessHeading, formatBytes } from '@/components/ui/ToolFeedback';

interface ConvertFromPdfToolProps {
  targetFormat: 'image' | 'word' | 'excel' | 'powerpoint' | 'pdfa';
  imageFormat?: 'jpg' | 'png';
}

const MAX_FILE_BYTES = 100 * 1024 * 1024;

function wordSummary(r: ConversionReport): string[] {
  const out: string[] = [];
  out.push(`${r.pages} page${r.pages === 1 ? '' : 's'} rebuilt with the same page size, margins, fonts and colours.`);
  const kept: string[] = [];
  if (r.tables) kept.push(`${r.tables} table${r.tables === 1 ? '' : 's'}`);
  if (r.images) kept.push(`${r.images} image${r.images === 1 ? '' : 's'}`);
  if (r.graphics) kept.push(`${r.graphics} chart${r.graphics === 1 ? '' : 's'}/drawing${r.graphics === 1 ? '' : 's'} (as pictures)`);
  if (r.headers || r.footers) kept.push(r.pageNumbers ? 'headers/footers with live page numbers' : 'headers and footers');
  if (r.columnsPages.length) kept.push('multi-column layout');
  if (kept.length) out.push(`Kept: ${kept.join(', ')}.`);
  if (r.ocrPages.length)
    out.push(`Page${r.ocrPages.length === 1 ? '' : 's'} ${r.ocrPages.join(', ')} ${r.ocrPages.length === 1 ? 'was a scan' : 'were scans'}: the text was recognised with OCR. Please proofread it.`);
  out.push(...r.warnings);
  return out;
}

export function ConvertFromPdfTool({ targetFormat, imageFormat = 'jpg' }: ConvertFromPdfToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [thumb, setThumb] = useState<string | null>(null);
  const [extractedPreview, setExtractedPreview] = useState<string | null>(null);
  const [resultNote, setResultNote] = useState<string | null>(null);
  const [summary, setSummary] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ label: string; percent: number } | null>(null);
  const [error, setError] = useState<FriendlyError | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState<string>('converted-output.zip');
  const [downloadSize, setDownloadSize] = useState<number>(0);
  const [useOcr, setUseOcr] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  // Object URL cleanup
  const prevDownloadUrlRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevDownloadUrlRef.current && prevDownloadUrlRef.current !== downloadUrl) {
      URL.revokeObjectURL(prevDownloadUrlRef.current);
    }
    prevDownloadUrlRef.current = downloadUrl;
    if (downloadUrl) successRef.current?.querySelector<HTMLElement>('#tool-success-heading')?.focus();
  }, [downloadUrl]);

  useEffect(() => {
    return () => {
      if (prevDownloadUrlRef.current) URL.revokeObjectURL(prevDownloadUrlRef.current);
    };
  }, []);

  const reset = () => {
    setFile(null);
    setThumb(null);
    setDownloadUrl(null);
    setExtractedPreview(null);
    setResultNote(null);
    setSummary([]);
    setError(null);
    setProgress(null);
  };

  const handleFile = async (selectedFile: File | null) => {
    if (!selectedFile) return;
    reset();
    if (!selectedFile.type.includes('pdf') && !selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setError({ message: 'That file is not a PDF. Please choose a file that ends in .pdf.' });
      return;
    }
    if (selectedFile.size > MAX_FILE_BYTES) {
      setError({ message: 'This PDF is larger than 100 MB. Please split it into smaller parts first.', action: { label: 'Split PDF', href: '/tools/split-pdf' } });
      return;
    }
    try {
      const buffer = await selectedFile.arrayBuffer();
      const doc = await openPdfDocument(buffer);
      setFile(selectedFile);
      setNumPages(doc.numPages);
      // Small preview of the first page
      try {
        const page = await doc.getPage(1);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: 160 / base.width });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: ctx, viewport }).promise;
          setThumb(canvas.toDataURL('image/png'));
        }
      } catch {
        /* the preview is optional */
      }
      await doc.destroy();
    } catch (err) {
      setError(friendlyPdfError(err, 'We could not open this PDF.'));
    }
  };

  const finish = (blob: Blob, name: string) => {
    setDownloadSize(blob.size);
    setDownloadUrl(URL.createObjectURL(blob));
    setDownloadName(name);
  };

  const handleConvert = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);
    setSummary([]);
    setProgress({ label: 'Opening your PDF…', percent: 2 });

    try {
      const buffer = await file.arrayBuffer();
      const base = file.name.replace(/\.[^/.]+$/, '');

      if (targetFormat === 'word') {
        const { convertPdfToDocxInBrowser } = await import('@/lib/pdf-to-docx/browser');
        const { docx, report } = await convertPdfToDocxInBrowser(buffer, {
          title: base,
          ocr: useOcr,
          onStatus: (label, percent) => setProgress({ label, percent }),
        });
        setSummary(wordSummary(report));
        finish(new Blob([new Uint8Array(docx)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), `${base}.docx`);
        return;
      }

      const doc = await openPdfDocument(buffer);
      const step = (i: number, verb: string) => setProgress({ label: `${verb} page ${i} of ${doc.numPages}…`, percent: 5 + (i / doc.numPages) * 85 });

      if (targetFormat === 'image') {
        const zip = new JSZip();
        const isPng = imageFormat === 'png';
        const mimeType = isPng ? 'image/png' : 'image/jpeg';
        const ext = isPng ? 'png' : 'jpg';

        for (let i = 1; i <= doc.numPages; i++) {
          step(i, 'Rendering');
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            if (!isPng) {
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            await page.render({ canvasContext: ctx, viewport }).promise;
            const dataUrl = canvas.toDataURL(mimeType, isPng ? undefined : 0.92);
            const base64Data = dataUrl.replace(new RegExp(`^data:${mimeType};base64,`), '');
            zip.file(`${base}-page-${i}.${ext}`, base64Data, { base64: true });
          }
        }
        setProgress({ label: 'Packing your images…', percent: 95 });
        finish(await zip.generateAsync({ type: 'blob' }), `${base}-${ext}-images.zip`);
      } else if (targetFormat === 'excel') {
        // Rebuild rows and columns from text positions, page by page, then write CSV (UTF-8 with BOM for Excel).
        const allRows: string[][] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          step(i, 'Reading');
          const page = await doc.getPage(i);
          const textContent = await page.getTextContent();
          const items = textContent.items
            .map((item: unknown) => item as { str?: string; transform?: number[]; width?: number; height?: number })
            .filter((it) => typeof it.str === 'string' && Array.isArray(it.transform))
            .map((it) => ({ str: it.str as string, x: it.transform![4], y: it.transform![5], width: it.width || 0, height: it.height || 10 }));
          if (doc.numPages > 1) allRows.push([`Page ${i}`]);
          allRows.push(...textItemsToRows(items));
        }
        const csvText = rowsToCsv(allRows);
        setExtractedPreview(csvText.slice(0, 1000));
        finish(new Blob([csvText], { type: 'text/csv;charset=utf-8' }), `${base}-data.csv`);
      } else if (targetFormat === 'powerpoint') {
        // Render each page to an image and place it on its own slide in a real .pptx file.
        const slides: { png: Uint8Array; widthPt: number; heightPt: number }[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          step(i, 'Rendering');
          const page = await doc.getPage(i);
          const base1 = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Your browser blocked page rendering.');
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: ctx, viewport }).promise;
          const pngBlob = await new Promise<Blob>((resolve, reject) =>
            canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not render a page.'))), 'image/png')
          );
          slides.push({ png: new Uint8Array(await pngBlob.arrayBuffer()), widthPt: base1.width, heightPt: base1.height });
        }
        setProgress({ label: 'Building your slides…', percent: 95 });
        finish(await buildPptxFromImages(slides), `${base}.pptx`);
      } else if (targetFormat === 'pdfa') {
        // Add PDF/A-2b metadata, colour profile and file ID; report fonts that are not embedded.
        setProgress({ label: 'Adding archival information…', percent: 50 });
        const { bytes, unembeddedFonts } = await preparePdfA(buffer, base);
        setResultNote(
          unembeddedFonts.length === 0
            ? 'PDF/A-2b metadata, sRGB colour profile and file ID added. All fonts are embedded.'
            : `PDF/A-2b metadata and colour profile added, but ${unembeddedFonts.length} font${unembeddedFonts.length === 1 ? ' is' : 's are'} not embedded in your original (${unembeddedFonts.slice(0, 3).join(', ')}${unembeddedFonts.length > 3 ? '…' : ''}). Strict PDF/A checkers will flag this. Re-export from the original app with "embed fonts" on for full compliance.`
        );
        finish(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }), `${base}-archival-pdfa.pdf`);
      }
      await doc.destroy();
    } catch (err: unknown) {
      setError(friendlyPdfError(err, 'The conversion did not finish.'));
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  const titleText =
    targetFormat === 'image'
      ? imageFormat === 'png'
        ? 'Convert PDF to PNG images'
        : 'Convert PDF to JPG images'
      : targetFormat === 'word'
        ? 'Convert PDF to an editable Word document (.docx)'
        : targetFormat === 'excel'
          ? 'Convert PDF tables to Excel / CSV'
          : targetFormat === 'powerpoint'
            ? 'Convert PDF pages to a PowerPoint (.pptx) deck'
            : 'Prepare a PDF/A-2b archival copy';

  const buttonText =
    targetFormat === 'image'
      ? imageFormat === 'png'
        ? 'Export as PNG'
        : 'Export as JPG'
      : targetFormat === 'word'
        ? 'Convert to Word (.docx)'
        : targetFormat === 'excel'
          ? 'Convert to Excel (.csv)'
          : targetFormat === 'powerpoint'
            ? 'Convert to PowerPoint (.pptx)'
            : 'Convert to PDF/A';

  return (
    <div className="w-full">
      {!file ? (
        <div
          role="button"
          tabIndex={0}
          aria-label={`${titleText}. Choose a PDF file or drop it here.`}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center transition focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200 sm:p-12 ${
            dragOver ? 'border-brand-600 bg-brand-50' : 'border-[#CFCBFF] bg-white hover:border-brand-600 hover:bg-brand-50'
          }`}
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-brand-100 bg-white text-brand-600 shadow-sm">
            <Upload className="h-7 w-7" aria-hidden="true" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">{dragOver ? 'Drop your PDF here' : titleText}</h3>
          <p className="mt-2 max-w-md text-sm text-slate-600">
            Drag and drop a PDF, or tap to choose one. Up to 100 MB. Processed on your device, never uploaded.
          </p>
          <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700">
            <Upload className="h-4 w-4" aria-hidden="true" />
            Select PDF file
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => {
              handleFile(e.target.files?.[0] || null);
              e.target.value = '';
            }}
          />
        </div>
      ) : (
        <div className="rounded-3xl border-[1.5px] border-[#ECEBF8] bg-white p-5 shadow-lift sm:p-8">
          <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex min-w-0 items-center gap-4">
              {thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb} alt="First page preview" className="h-24 w-auto flex-none rounded-md border border-slate-200 shadow-sm" />
              ) : (
                <FileIcon className="h-6 w-6 flex-none text-brand-600" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <h4 className="truncate text-base font-semibold text-slate-900">{file.name}</h4>
                <p className="text-xs text-slate-500">
                  {numPages} page{numPages === 1 ? '' : 's'} &bull; {formatBytes(file.size)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={reset}
              disabled={isProcessing}
              className="flex flex-none items-center gap-1 rounded-full px-2 py-1 text-xs text-slate-500 hover:text-red-600 disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove
            </button>
          </div>

          {targetFormat === 'word' && !downloadUrl && (
            <div className="mb-5 space-y-3">
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-3 text-sm">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-600" checked={useOcr} onChange={(e) => setUseOcr(e.target.checked)} disabled={isProcessing} />
                <span>
                  <span className="flex items-center gap-1.5 font-semibold text-slate-900">
                    <ScanText className="h-4 w-4 text-brand-600" aria-hidden="true" /> Recognise text on scanned pages (OCR)
                  </span>
                  <span className="text-slate-600">Turns pages that are photos of paper into editable text. Runs on your device; first use downloads about 7 MB.</span>
                </span>
              </label>
              <p className="flex items-start gap-2 text-xs text-slate-500">
                <Info className="mt-0.5 h-3.5 w-3.5 flex-none" aria-hidden="true" />
                Layout, fonts, tables and images are rebuilt as closely as possible. Very complex pages may need small touch-ups in Word.
              </p>
            </div>
          )}

          {extractedPreview && (
            <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-700">Content preview</p>
              <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded border border-slate-200 bg-white p-3 font-mono text-xs text-slate-600">{extractedPreview}</pre>
            </div>
          )}

          {!downloadUrl && (
            <div className="flex justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConvert}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow transition hover:bg-brand-700 disabled:opacity-50 sm:w-auto"
              >
                <FileText className="h-4 w-4" aria-hidden="true" />
                {isProcessing ? 'Converting…' : buttonText}
              </button>
            </div>
          )}
          {progress && <ToolProgress percent={progress.percent} label={progress.label} />}
        </div>
      )}

      {error && <ToolError error={error} />}

      {downloadUrl && (
        <div ref={successRef} className="mt-8 rounded-2xl border border-teal-200 bg-teal-50/60 p-6 sm:p-8">
          <SuccessHeading title="Your file is ready" subtitle={`${downloadName} · ${formatBytes(downloadSize)}`} />
          {resultNote && <p className="mx-auto mt-3 max-w-xl text-center text-sm text-slate-700">{resultNote}</p>}
          {summary.length > 0 && (
            <ul className="mx-auto mt-4 max-w-xl list-disc space-y-1 pl-5 text-left text-sm text-slate-700">
              {summary.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          )}
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={downloadUrl}
              download={downloadName}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow transition hover:bg-brand-700 sm:w-auto"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download {downloadName.split('.').pop()?.toUpperCase()}
            </a>
            <button
              type="button"
              onClick={reset}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Convert another file
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
