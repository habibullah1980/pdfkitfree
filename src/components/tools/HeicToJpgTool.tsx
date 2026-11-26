'use client';

import React, { useEffect, useRef, useState } from 'react';
import JSZip from 'jszip';
import { CheckCircle2, Download, ImageIcon, Loader2, RotateCcw, TriangleAlert, Upload } from 'lucide-react';
import { baseName, canvasToBlob, decodeImage, drawToCanvas, formatBytes, isHeicFile } from '@/lib/image-decode';

type Format = 'jpg' | 'png';

interface Item {
  name: string;
  inSize: number;
  status: 'waiting' | 'working' | 'done' | 'failed';
  out?: Blob;
  url?: string;
  error?: string;
}

const MAX_FILES = 50;

/** Converts iPhone HEIC/HEIF photos to JPG or PNG in the browser. */
export function HeicToJpgTool({ defaultFormat = 'jpg' }: { defaultFormat?: Format }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [format, setFormat] = useState<Format>(defaultFormat);
  const [quality, setQuality] = useState(0.9);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const urlsRef = useRef<string[]>([]);

  useEffect(() => () => urlsRef.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const update = (i: number, patch: Partial<Item>) =>
    setItems((prev) => prev.map((it, k) => (k === i ? { ...it, ...patch } : it)));

  const run = async (list: File[]) => {
    urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    urlsRef.current = [];
    const heic = list.filter(isHeicFile);
    const skipped = list.length - heic.length;
    const files = heic.slice(0, MAX_FILES);
    setNotice(
      [
        skipped ? `${skipped} file${skipped > 1 ? 's were' : ' was'} not HEIC and ${skipped > 1 ? 'were' : 'was'} skipped.` : '',
        heic.length > MAX_FILES ? `Only the first ${MAX_FILES} photos are converted at once.` : '',
      ]
        .filter(Boolean)
        .join(' ') || null
    );
    setItems(files.map((f) => ({ name: f.name, inSize: f.size, status: 'waiting' })));
    if (!files.length) return;
    setBusy(true);
    const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
    for (let i = 0; i < files.length; i++) {
      update(i, { status: 'working' });
      try {
        const img = await decodeImage(files[i]);
        try {
          const canvas = drawToCanvas(img, img.width, img.height, format === 'jpg');
          const out = await canvasToBlob(canvas, mime, format === 'jpg' ? quality : undefined);
          const url = URL.createObjectURL(out);
          urlsRef.current.push(url);
          update(i, { status: 'done', out, url });
          canvas.width = canvas.height = 0;
        } finally {
          img.close();
        }
      } catch (e) {
        update(i, { status: 'failed', error: (e as Error).message });
      }
    }
    setBusy(false);
  };

  const pick = (fl: FileList | null) => {
    if (fl?.length) void run(Array.from(fl));
  };

  const reset = () => {
    setItems([]);
    setNotice(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const ext = format === 'jpg' ? 'jpg' : 'png';
  const done = items.filter((i) => i.status === 'done');
  const finished = items.filter((i) => i.status === 'done' || i.status === 'failed').length;
  const outName = (n: string) => `${baseName(n)}.${ext}`;

  const downloadZip = async () => {
    const zip = new JSZip();
    const used = new Set<string>();
    for (const it of done) {
      let n = outName(it.name);
      for (let k = 2; used.has(n); k++) n = `${baseName(it.name)}-${k}.${ext}`;
      used.add(n);
      zip.file(n, it.out!);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `converted-${ext}.zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="rounded-[28px] border-[1.5px] border-[#ECEBF8] bg-white p-5 shadow-sm sm:p-8">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".heic,.heif,image/heic,image/heif"
        className="sr-only"
        onChange={(e) => pick(e.target.files)}
        aria-label="Choose HEIC photos"
      />

      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div>
          <span className="mb-1.5 block text-sm font-bold text-ink">Convert to</span>
          <div className="inline-flex rounded-full border-[1.5px] border-[#D9D7F2] p-1" role="radiogroup" aria-label="Output format">
            {(['jpg', 'png'] as Format[]).map((f) => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={format === f}
                disabled={busy}
                onClick={() => setFormat(f)}
                className={`min-h-[40px] rounded-full px-5 text-sm font-bold transition ${format === f ? 'bg-brand-600 text-white' : 'text-ink-soft'}`}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        {format === 'jpg' && (
          <div className="min-w-[220px] flex-1">
            <label htmlFor="heic-q" className="mb-1.5 block text-sm font-bold text-ink">
              JPG quality: {Math.round(quality * 100)}%
            </label>
            <input id="heic-q" type="range" min={0.5} max={1} step={0.05} value={quality} disabled={busy} onChange={(e) => setQuality(Number(e.target.value))} className="w-full accent-brand-600" />
          </div>
        )}
      </div>

      {!items.length && (
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
          className={`flex flex-col items-center rounded-3xl border-2 border-dashed px-6 py-14 text-center transition ${drag ? 'border-brand-600 bg-brand-50' : 'border-[#D9D7F2]'}`}
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-[#ECEBF8] bg-white shadow-sm">
            <ImageIcon className="h-7 w-7 text-brand-600" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-xl font-bold text-ink">Choose HEIC photos</h2>
          <p className="mt-1 text-sm text-ink-muted">Up to {MAX_FILES} at once. They stay on your device.</p>
          {notice && <p className="mt-3 text-sm font-semibold text-amber-800">{notice}</p>}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-6 inline-flex min-h-[48px] items-center gap-2 rounded-full bg-brand-600 px-6 font-bold text-white transition hover:bg-brand-700"
          >
            <Upload className="h-5 w-5" aria-hidden="true" /> Select photos
          </button>
        </div>
      )}

      {items.length > 0 && (
        <div>
          <p className="mb-3 font-bold text-ink" role="status" aria-live="polite">
            {busy ? `Converting ${Math.min(finished + 1, items.length)} of ${items.length}…` : `${done.length} of ${items.length} converted`}
          </p>
          {notice && <p className="mb-3 text-sm font-semibold text-amber-800">{notice}</p>}
          <ul className="divide-y divide-slate-100 rounded-2xl border-[1.5px] border-[#ECEBF8]">
            {items.map((it, i) => (
              <li key={`${it.name}-${i}`} className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap">
                {it.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.url} alt="" className="h-12 w-12 flex-none rounded-lg object-cover" />
                ) : (
                  <span className="flex h-12 w-12 flex-none items-center justify-center rounded-lg bg-slate-50">
                    {it.status === 'failed' ? (
                      <TriangleAlert className="h-5 w-5 text-red-600" aria-hidden="true" />
                    ) : it.status === 'working' ? (
                      <Loader2 className="h-5 w-5 animate-spin text-brand-600" aria-hidden="true" />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-ink-muted" aria-hidden="true" />
                    )}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-ink">{it.name}</p>
                  <p className="text-sm text-ink-muted">
                    {it.status === 'done' && it.out
                      ? `${formatBytes(it.inSize)} → ${formatBytes(it.out.size)} ${ext.toUpperCase()}`
                      : it.status === 'failed'
                        ? it.error
                        : it.status === 'working'
                          ? 'Converting…'
                          : 'Waiting'}
                  </p>
                </div>
                {it.status === 'done' && it.url && (
                  <a href={it.url} download={outName(it.name)} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border-[1.5px] border-[#D9D7F2] px-4 text-sm font-bold text-ink hover:border-brand-600">
                    <Download className="h-4 w-4" aria-hidden="true" /> {ext.toUpperCase()}
                  </a>
                )}
              </li>
            ))}
          </ul>
          {!busy && (
            <div className="mt-5 flex flex-wrap gap-3">
              {done.length > 1 && (
                <button type="button" onClick={() => void downloadZip()} className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-brand-600 px-6 font-bold text-white transition hover:bg-brand-700">
                  <Download className="h-5 w-5" aria-hidden="true" /> Download all (.zip)
                </button>
              )}
              {done.length === 1 && done[0].url && (
                <a href={done[0].url} download={outName(done[0].name)} className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-brand-600 px-6 font-bold text-white transition hover:bg-brand-700">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> Download {ext.toUpperCase()}
                </a>
              )}
              <button type="button" onClick={reset} className="inline-flex min-h-[48px] items-center gap-2 rounded-full border-[1.5px] border-[#D9D7F2] px-5 font-bold text-ink transition hover:border-brand-600">
                <RotateCcw className="h-4 w-4" aria-hidden="true" /> Convert more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
