'use client';

import { friendlyPdfError } from '@/lib/friendly-errors';
import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import { 
  Upload, 
  File as FileIcon, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  Trash2,
  Sparkles
} from 'lucide-react';
import { compressPdfImages } from '@/lib/pdf-image-compress';

interface OptimizePdfToolProps {
  toolType: 'compress' | 'repair' | 'web';
  /** When set, keep compressing with stronger settings until the file is at most this many bytes. */
  targetBytes?: number;
  /** Human label for the target, e.g. "100 KB". */
  targetLabel?: string;
}

/** Settings tried in order when aiming for a target size, from gentle to strongest. */
const TARGET_LADDER = [
  { maxDimension: 2000, quality: 0.72 },
  { maxDimension: 1600, quality: 0.6 },
  { maxDimension: 1240, quality: 0.5 },
  { maxDimension: 1000, quality: 0.42 },
  { maxDimension: 820, quality: 0.34 },
  { maxDimension: 640, quality: 0.28 },
];

export function OptimizePdfTool({ toolType, targetBytes, targetLabel }: OptimizePdfToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [newSize, setNewSize] = useState<number>(0);
  const [progressText, setProgressText] = useState<string | null>(null);
  const [imageStats, setImageStats] = useState<{ found: number; recompressed: number } | null>(null);
  const [progress, setProgress] = useState<{ stage: 'read' | 'images' | 'save'; done: number; total: number; secondsLeft: number | null } | null>(null);
  const [targetMet, setTargetMet] = useState<boolean | null>(null);
  const [pass, setPass] = useState<{ n: number; of: number } | null>(null);
  const [compressionLevel, setCompressionLevel] = useState<'recommended' | 'extreme' | 'low'>('recommended');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState<string>('optimized.pdf');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Object URL cleanup
  const prevDownloadUrlRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevDownloadUrlRef.current && prevDownloadUrlRef.current !== downloadUrl) {
      URL.revokeObjectURL(prevDownloadUrlRef.current);
    }
    prevDownloadUrlRef.current = downloadUrl;
  }, [downloadUrl]);

  useEffect(() => {
    return () => {
      if (prevDownloadUrlRef.current) {
        URL.revokeObjectURL(prevDownloadUrlRef.current);
      }
    };
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFile = (selectedFile: File | null) => {
    if (!selectedFile) return;
    setErrorMessage(null);
    setDownloadUrl(null);
    setImageStats(null);

    if (!selectedFile.type.includes('pdf') && !selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Please select a valid PDF file.');
      return;
    }

    setFile(selectedFile);
    setOriginalSize(selectedFile.size);
  };

  const handleOptimize = async () => {
    if (!file) return;
    setIsProcessing(true);
    setErrorMessage(null);
    setDownloadUrl(null);
    setTargetMet(null);
    setPass(null);
    setProgress({ stage: 'read', done: 0, total: 0, secondsLeft: null });
    const startedAt = performance.now();

    try {
      const buffer = await file.arrayBuffer();
      const base = file.name.replace(/\.[^/.]+$/, '');
      let finalBytes: Uint8Array;

      if (toolType === 'compress' && targetBytes) {
        // Aim for a size: try stronger settings until the file fits, keep the smallest result.
        let best: Uint8Array = new Uint8Array(buffer);
        if (buffer.byteLength > targetBytes) {
          for (let i = 0; i < TARGET_LADDER.length; i++) {
            setPass({ n: i + 1, of: TARGET_LADDER.length });
            const passStart = performance.now();
            const result = await compressPdfImages(buffer, {
              ...TARGET_LADDER[i],
              onProgress: (done, total) => {
                setProgressText(total > 0 ? `Try ${i + 1}: image ${done} of ${total}` : `Try ${i + 1}`);
                const elapsed = (performance.now() - passStart) / 1000;
                const secondsLeft = done > 0 && total > done ? Math.max(1, Math.round((elapsed / done) * (total - done))) : null;
                setProgress({ stage: total > 0 && done >= total ? 'save' : 'images', done, total, secondsLeft });
              },
            });
            setImageStats({ found: result.imagesFound, recompressed: result.imagesRecompressed });
            if (result.bytes.length < best.length) best = result.bytes;
            // No images means stronger settings cannot help.
            if (best.length <= targetBytes || result.imagesFound === 0) break;
          }
        }
        setTargetMet(best.length <= targetBytes);
        finalBytes = best;
      } else if (toolType === 'compress' && compressionLevel !== 'low') {
        // Downscale and re-encode embedded photos/scans; text and vectors stay untouched.
        const settings = compressionLevel === 'extreme'
          ? { maxDimension: 1240, quality: 0.5 }
          : { maxDimension: 2000, quality: 0.72 };
        const result = await compressPdfImages(buffer, {
          ...settings,
          onProgress: (done, total) => {
            setProgressText(total > 0 ? `Compressing images: ${done} of ${total}` : null);
            const elapsed = (performance.now() - startedAt) / 1000;
            const secondsLeft = done > 0 && total > done ? Math.max(1, Math.round((elapsed / done) * (total - done))) : null;
            setProgress({ stage: total > 0 && done >= total ? 'save' : 'images', done, total, secondsLeft });
          },
        });
        setImageStats({ found: result.imagesFound, recompressed: result.imagesRecompressed });
        finalBytes = result.bytes;
      } else {
        // Lossless / Repair / Web: rebuild the file structure (xref, object streams, unused objects)
        const doc = await PDFDocument.load(buffer, {
          ignoreEncryption: true,
          throwOnInvalidObject: false,
          updateMetadata: toolType === 'repair' ? false : true,
        });
        if (toolType === 'repair' && doc.getPageCount() === 0) {
          throw new Error('No readable pages could be recovered from this file.');
        }
        finalBytes = await doc.save({
          useObjectStreams: true,
          addDefaultPage: false,
        });
      }
      setProgressText(null);
      setProgress(null);
      setPass(null);

      // If output is larger than original file and tool is compress, keep original bytes
      let effectiveBytes = finalBytes;
      let effectiveSize = finalBytes.length;

      if (toolType === 'compress' && effectiveSize >= originalSize) {
        // Never claim compression if file becomes larger
        effectiveBytes = new Uint8Array(buffer);
        effectiveSize = originalSize;
      }

      const blob = new Blob([new Uint8Array(effectiveBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setNewSize(effectiveSize);
      setDownloadUrl(url);

      if (toolType === 'compress') setDownloadName(`${base}-compressed.pdf`);
      else if (toolType === 'repair') setDownloadName(`${base}-repaired.pdf`);
      else setDownloadName(`${base}-web-optimized.pdf`);
    } catch (err: unknown) {
      setErrorMessage(friendlyPdfError(err, 'The PDF could not be optimized.').message);
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  return (
    <div className="w-full">
      {!file ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
          }}
          className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[#CFCBFF] bg-white p-8 sm:p-12 text-center hover:border-brand-600 hover:bg-brand-50 transition"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm border border-brand-100 mb-4">
            <Upload className="h-7 w-7" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">
            {toolType === 'compress' && 'Choose a PDF to compress'}
            {toolType === 'repair' && 'Choose a damaged PDF to repair'}
            {toolType === 'web' && 'Choose a PDF to optimize for web viewing'}
          </h3>
          <p className="mt-2 text-sm text-slate-600 max-w-md">
            Fast, client-side processing without uploading your file to cloud servers.
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition"
            >
              <Upload className="h-4 w-4" />
              <span>Select PDF File</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border-[1.5px] border-[#ECEBF8] bg-white p-6 shadow-lift sm:p-8">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <FileIcon className="h-6 w-6 text-brand-600" />
              <div>
                <h4 className="text-base font-semibold text-slate-900">{file.name}</h4>
                <p className="text-xs text-slate-500">Original Size: {formatFileSize(originalSize)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setDownloadUrl(null);
              }}
              className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          </div>

          {toolType === 'compress' && targetBytes && (
            <div className="mb-6 rounded-2xl border-[1.5px] border-brand-200 bg-brand-50 p-5">
              <p className="text-lg font-extrabold text-ink">Target: under {targetLabel}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                {originalSize <= targetBytes
                  ? `Good news: this file is already under ${targetLabel}.`
                  : `We start gently and use stronger settings only if needed, so the file stays as sharp as possible. Text stays sharp, photos get softer.`}
              </p>
            </div>
          )}

          {toolType === 'compress' && !targetBytes && (
            <div className="mb-6">
              <h3 className="mb-3.5 text-xl font-bold text-ink">How small should it be?</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" role="radiogroup" aria-label="Compression level">
                {[
                  { id: 'low', title: 'Light', bars: 1, desc: 'Removes unused data only. Images are not touched.' },
                  { id: 'recommended', title: 'Balanced', bars: 2, desc: 'Sharp on screen and easy to email.', tag: 'Recommended' },
                  { id: 'extreme', title: 'Smallest', bars: 3, desc: 'For upload limits. Photos look softer, text stays sharp.' },
                ].map((item) => {
                  const on = compressionLevel === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      disabled={isProcessing}
                      onClick={() => setCompressionLevel(item.id as 'recommended' | 'extreme' | 'low')}
                      className={`flex flex-col gap-2.5 rounded-[18px] border-2 p-5 text-left transition disabled:opacity-60 ${
                        on ? 'border-brand-600 bg-brand-50 shadow-glow' : 'border-[#ECEBF8] bg-white hover:border-brand-300'
                      }`}
                    >
                      <span className="flex items-center justify-between">
                        <span className="flex gap-1" aria-hidden="true">
                          {[1, 2, 3].map((n) => (
                            <span key={n} className={`block h-1.5 w-[22px] rounded ${n <= item.bars ? (on ? 'bg-brand-600' : 'bg-brand-300') : 'bg-[#E3E1F5]'}`} />
                          ))}
                        </span>
                        {item.tag && <span className="rounded-full bg-sun px-2.5 py-1 text-xs font-bold text-ink">{item.tag}</span>}
                      </span>
                      <span className="text-lg font-extrabold text-ink">{item.title}</span>
                      <span className="text-sm leading-relaxed text-ink-muted">{item.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {toolType === 'repair' && (
            <div className="mb-6 rounded-lg bg-teal-50 border border-teal-200 p-4 text-xs text-teal-900">
              <p className="font-semibold mb-1">How PDF Repair Works:</p>
              <p>Rebuilds damaged cross-reference tables, repairs corrupted trailers, and recovers uncorrupted page objects into a compliant PDF.</p>
            </div>
          )}

          {toolType === 'web' && (
            <div className="mb-6 rounded-lg bg-brand-50 border border-brand-200 p-4 text-xs text-brand-900">
              <p className="font-semibold mb-1">Fast Web View Optimization:</p>
              <p>Re-serializes page objects into sequential object streams for instantaneous first-page loading across modern web browsers.</p>
            </div>
          )}

          {isProcessing && progress && toolType === 'compress' && (
            <div className="mb-6 rounded-2xl border-[1.5px] border-[#ECEBF8] bg-white p-6">
              {(() => {
                const pct = progress.stage === 'read' ? 3 : progress.stage === 'save' ? 97 : progress.total > 0 ? Math.round(5 + (progress.done / progress.total) * 90) : 5;
                const steps: { key: 'read' | 'images' | 'save'; label: string }[] = [
                  { key: 'read', label: 'Read the PDF' },
                  { key: 'images', label: progress.total > 0 ? `Shrink images (${Math.min(progress.done + 1, progress.total)} of ${progress.total})` : 'Shrink images' },
                  { key: 'save', label: 'Save your new PDF' },
                ];
                const order = ['read', 'images', 'save'];
                const current = order.indexOf(progress.stage);
                return (
                  <>
                    <div className="flex items-baseline justify-between">
                      <p className="font-display text-xl font-bold text-ink">
                        Compressing…{pass && pass.n > 1 && <span className="ml-2 text-base font-semibold text-ink-muted">stronger try {pass.n} of {pass.of}</span>}
                      </p>
                      <p className="font-display text-3xl font-extrabold text-brand-600">{pct}%</p>
                    </div>
                    <div className="mt-4 h-3.5 overflow-hidden rounded-full bg-[#EEEDF8]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Compression progress">
                      <div className="pk-sheen h-full rounded-full bg-gradient-to-r from-teal-500 to-brand-600 transition-[width] duration-500 ease-out" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-2.5 text-sm text-ink-muted" aria-live="polite">
                      {progress.secondsLeft ? `About ${progress.secondsLeft} second${progress.secondsLeft === 1 ? '' : 's'} left` : 'Working on your device, nothing is uploaded'}
                    </p>
                    <ol className="mt-5 flex flex-col gap-3 border-t border-[#EEEDF8] pt-5">
                      {steps.map((st, i) => (
                        <li key={st.key} className={`flex items-center gap-3 text-[15px] font-semibold ${i > current ? 'text-[#8D8BAA]' : 'text-ink'}`}>
                          <span className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full" aria-hidden="true">
                            {i < current ? (
                              <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-teal-500">
                                <CheckCircle className="h-4 w-4 text-white" />
                              </span>
                            ) : i === current ? (
                              <span className="h-[18px] w-[18px] animate-spin rounded-full border-[3px] border-brand-200 border-t-brand-600" />
                            ) : (
                              <span className="h-[22px] w-[22px] rounded-full border-2 border-[#E3E1F5]" />
                            )}
                          </span>
                          {st.label}
                        </li>
                      ))}
                    </ol>
                  </>
                );
              })()}
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleOptimize}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-brand-600 px-7 text-[15px] font-bold text-white shadow-glow transition hover:bg-brand-700 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span aria-live="polite">{progressText || 'Processing document...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>
                    {toolType === 'compress' && 'Compress PDF'}
                    {toolType === 'repair' && 'Repair PDF Now'}
                    {toolType === 'web' && 'Optimize for Web'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="mt-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
          <p>{errorMessage}</p>
        </div>
      )}

      {downloadUrl && toolType === 'compress' && newSize < originalSize && (() => {
        const saved = Math.round(((originalSize - newSize) / originalSize) * 100);
        return (
          <div className="mt-8 rounded-3xl border-[1.5px] border-[#ECEBF8] bg-white p-6 shadow-lift sm:p-8">
            <div className="flex flex-wrap items-center gap-6">
              <div
                className="flex h-[150px] w-[150px] flex-none items-center justify-center rounded-full"
                style={{ background: `conic-gradient(#2CC59A ${saved}%, #EEEDF8 0)` }}
                role="img"
                aria-label={`${saved}% smaller`}
              >
                <div className="flex h-[118px] w-[118px] flex-col items-center justify-center rounded-full bg-white">
                  <span className="font-display text-4xl font-extrabold text-teal-600">{saved}%</span>
                  <span className="text-[13px] font-semibold text-ink-muted">smaller</span>
                </div>
              </div>
              <div className="min-w-[200px] flex-1">
                <h4 className="font-display text-2xl font-extrabold text-ink">Done. You saved {formatFileSize(originalSize - newSize)}</h4>
                {targetBytes && targetMet !== null && (
                  <p className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-bold ${targetMet ? 'bg-teal-50 text-teal-800' : 'bg-amber-50 text-amber-800'}`}>
                    {targetMet ? `Under ${targetLabel}, ready to upload` : `Smallest we could reach is ${formatFileSize(newSize)}, above ${targetLabel}`}
                  </p>
                )}
                <p className="mt-2 leading-relaxed text-ink-soft">
                  Text, links and fonts are unchanged.
                  {imageStats && imageStats.recompressed > 0 && ` ${imageStats.recompressed} image${imageStats.recompressed === 1 ? ' was' : 's were'} made smaller.`}
                </p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-[70px_minmax(0,1fr)_90px] items-center gap-3 text-sm">
              <span className="font-semibold text-ink-muted">Before</span>
              <span className="block h-5 rounded-lg bg-[#E3E1F5]" />
              <span className="text-right font-bold">{formatFileSize(originalSize)}</span>
              <span className="font-semibold text-ink-muted">After</span>
              <span className="block h-5 rounded-lg bg-teal-500" style={{ width: `${Math.max(3, 100 - saved)}%`, animation: 'pk-fill 1.2s cubic-bezier(.3,.7,.2,1) both' }} />
              <span className="text-right font-bold">{formatFileSize(newSize)}</span>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={downloadUrl}
                download={downloadName}
                className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full bg-brand-600 px-6 font-bold text-white shadow-glow transition hover:bg-brand-700"
              >
                <Download className="h-4 w-4" aria-hidden="true" /> Download PDF
              </a>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setDownloadUrl(null);
                }}
                className="inline-flex min-h-[48px] items-center justify-center rounded-full border-[1.5px] border-[#E3E1F5] px-6 font-bold text-ink transition hover:border-brand-600"
              >
                Compress another
              </button>
            </div>
          </div>
        );
      })()}

      {downloadUrl && !(toolType === 'compress' && newSize < originalSize) && (
        <div className="mt-8 rounded-3xl border-[1.5px] border-teal-200 bg-teal-50/60 p-6 text-center sm:p-8">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-teal-600 text-white">
            <CheckCircle className="h-6 w-6" aria-hidden="true" />
          </div>
          <h4 className="text-xl font-bold text-ink">
            {toolType === 'compress' && (targetBytes && originalSize <= targetBytes ? `Already under ${targetLabel}` : 'Nothing more to shrink')}
            {toolType === 'repair' && 'PDF repaired'}
            {toolType === 'web' && 'PDF optimized for the web'}
          </h4>
          {toolType === 'compress' ? (
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
              {targetBytes && originalSize <= targetBytes
                ? `This file is already under ${targetLabel}, so you can use it as it is (${formatFileSize(originalSize)}).`
                : `${imageStats && imageStats.found === 0 ? 'This PDF has no images to compress' : 'This PDF could not be made smaller'}, so your original file (${formatFileSize(originalSize)}) is unchanged.`}
            </p>
          ) : (
            <p className="mt-1 text-sm text-ink-soft">
              Original: {formatFileSize(originalSize)}, new file: {formatFileSize(newSize)}
            </p>
          )}
          <div className="mt-6 flex justify-center">
            <a
              href={downloadUrl}
              download={downloadName}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-brand-600 px-6 font-bold text-white shadow-glow transition hover:bg-brand-700"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download PDF
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
