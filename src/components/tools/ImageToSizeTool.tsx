'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Download, ImageIcon, Loader2, RotateCcw, TriangleAlert, Upload } from 'lucide-react';

interface Props {
  targetBytes: number;
  targetLabel: string;
}

interface Result {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  quality: number;
  met: boolean;
}

const SCALES = [1, 0.85, 0.7, 0.55, 0.42, 0.32, 0.24, 0.18, 0.12];

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Your browser could not encode the image.'))), 'image/jpeg', quality)
  );
}

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    // The decoded pixels stay in the element, so the URL can go.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/**
 * Fits an image under a byte target: highest JPEG quality first (binary search),
 * then smaller dimensions only if even low quality is too big. Runs fully in the browser.
 */
export function ImageToSizeTool({ targetBytes, targetLabel }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [drag, setDrag] = useState(false);

  useEffect(() => () => {
    if (result) URL.revokeObjectURL(result.url);
  }, [result]);

  const run = useCallback(
    async (f: File) => {
      setFile(f);
      setError(null);
      setResult(null);
      setBusy(true);
      try {
        if (!f.type.startsWith('image/')) throw new Error('Please choose an image file (JPG, PNG or WebP).');
        const img = await loadImage(f);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Your browser blocked image editing.');

        let best: Result | null = null;
        for (let i = 0; i < SCALES.length; i++) {
          const s = SCALES[i];
          const w = Math.max(1, Math.round(img.naturalWidth * s));
          const h = Math.max(1, Math.round(img.naturalHeight * s));
          setStep(i === 0 ? 'Finding the best quality…' : `Making it a little smaller (${w}×${h})…`);
          canvas.width = w;
          canvas.height = h;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);

          // Binary search the highest quality that fits.
          let lo = 0.3;
          let hi = 0.95;
          let fit: { blob: Blob; q: number } | null = null;
          const atLow = await toJpeg(canvas, lo);
          if (atLow.size <= targetBytes) {
            fit = { blob: atLow, q: lo };
            for (let k = 0; k < 6; k++) {
              const mid = (lo + hi) / 2;
              const b = await toJpeg(canvas, mid);
              if (b.size <= targetBytes) {
                fit = { blob: b, q: mid };
                lo = mid;
              } else {
                hi = mid;
              }
            }
          }
          if (fit) {
            best = { blob: fit.blob, url: '', width: w, height: h, quality: fit.q, met: true };
            break;
          }
          if (!best || atLow.size < best.blob.size) {
            best = { blob: atLow, url: '', width: w, height: h, quality: lo, met: false };
          }
        }
        if (!best) throw new Error('Could not compress this image.');
        best.url = URL.createObjectURL(best.blob);
        setResult(best);
      } catch (e) {
        setError((e as Error).message || 'Something went wrong while reading the image.');
      } finally {
        setBusy(false);
        setStep('');
      }
    },
    [targetBytes]
  );

  const pick = (files: FileList | null) => {
    const f = files?.[0];
    if (f) void run(f);
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const already = file && file.size <= targetBytes && file.type === 'image/jpeg';
  const outName = file ? `${file.name.replace(/\.[^.]+$/, '')}-${targetLabel.replace(/\s/g, '').toLowerCase()}.jpg` : 'image.jpg';

  return (
    <div className="rounded-[28px] border-[1.5px] border-[#ECEBF8] bg-white p-5 shadow-sm sm:p-8">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif"
        className="sr-only"
        onChange={(e) => pick(e.target.files)}
        aria-label="Choose an image"
      />

      {!file && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            pick(e.dataTransfer.files);
          }}
          className={`flex flex-col items-center rounded-3xl border-2 border-dashed px-6 py-14 text-center transition ${
            drag ? 'border-brand-600 bg-brand-50' : 'border-[#D9D7F2]'
          }`}
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-[#ECEBF8] bg-white shadow-sm">
            <ImageIcon className="h-7 w-7 text-brand-600" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-xl font-bold text-ink">Choose an image to shrink under {targetLabel}</h2>
          <p className="mt-1 text-sm text-ink-muted">JPG, PNG or WebP. It stays on your device.</p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-6 inline-flex min-h-[48px] items-center gap-2 rounded-full bg-brand-600 px-6 font-bold text-white transition hover:bg-brand-700"
          >
            <Upload className="h-5 w-5" aria-hidden="true" /> Select image
          </button>
        </div>
      )}

      {file && busy && (
        <div className="flex flex-col items-center py-14 text-center" role="status" aria-live="polite">
          <Loader2 className="h-9 w-9 animate-spin text-brand-600" aria-hidden="true" />
          <p className="mt-3 font-bold text-ink">{step || 'Working…'}</p>
          <div className="mt-4 h-2 w-64 overflow-hidden rounded-full bg-[#ECEBF8]">
            <div className="pk-loop h-full w-1/3 rounded-full bg-brand-600" />
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-red-800" role="alert">
          <TriangleAlert className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="font-bold">{error}</p>
            <button type="button" onClick={reset} className="mt-2 text-sm font-bold underline">
              Try another image
            </button>
          </div>
        </div>
      )}

      {file && result && !busy && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex items-center justify-center overflow-hidden rounded-2xl bg-slate-50 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={result.url} alt="Compressed preview" className="max-h-80 w-auto rounded-lg object-contain" />
          </div>
          <div className="flex flex-col gap-4">
            <p
              className={`flex items-start gap-2 rounded-2xl px-4 py-3 font-bold ${
                result.met ? 'bg-teal-50 text-teal-900' : 'bg-amber-50 text-amber-900'
              }`}
            >
              {result.met ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
              ) : (
                <TriangleAlert className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
              )}
              {result.met
                ? already
                  ? `Your image was already under ${targetLabel}. Here is a clean copy at the best quality that fits.`
                  : `Under ${targetLabel}, ready to upload.`
                : `The smallest we could reach is ${formatBytes(result.blob.size)}, above ${targetLabel}.`}
            </p>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-ink-muted">Before</dt>
                <dd className="font-bold text-ink">{formatBytes(file.size)}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-ink-muted">After</dt>
                <dd className="font-bold text-ink">{formatBytes(result.blob.size)}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-ink-muted">Dimensions</dt>
                <dd className="font-bold text-ink">
                  {result.width} × {result.height}
                </dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-ink-muted">JPG quality</dt>
                <dd className="font-bold text-ink">{Math.round(result.quality * 100)}%</dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-3">
              <a
                href={result.url}
                download={outName}
                className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-brand-600 px-6 font-bold text-white transition hover:bg-brand-700"
              >
                <Download className="h-5 w-5" aria-hidden="true" /> Download JPG
              </a>
              <button
                type="button"
                onClick={reset}
                className="inline-flex min-h-[48px] items-center gap-2 rounded-full border-[1.5px] border-[#D9D7F2] px-5 font-bold text-ink transition hover:border-brand-600"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" /> Another image
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
