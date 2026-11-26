'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, ImageIcon, Link2, Link2Off, Loader2, RotateCcw, TriangleAlert, Upload } from 'lucide-react';
import { baseName, canvasToBlob, decodeImage, drawToCanvas, formatBytes, type DecodedImage } from '@/lib/image-decode';

type Mode = 'pixels' | 'percent' | 'preset';
type OutFormat = 'same' | 'jpg' | 'png' | 'webp';

export interface ResizePreset {
  id: string;
  label: string;
  w: number;
  h: number;
}

export const RESIZE_PRESETS: ResizePreset[] = [
  { id: 'ig-square', label: 'Instagram post 1080 × 1080', w: 1080, h: 1080 },
  { id: 'ig-portrait', label: 'Instagram portrait 1080 × 1350', w: 1080, h: 1350 },
  { id: 'story', label: 'Story / Reel 1080 × 1920', w: 1080, h: 1920 },
  { id: 'yt-thumb', label: 'YouTube thumbnail 1280 × 720', w: 1280, h: 720 },
  { id: 'fb-cover', label: 'Facebook cover 1640 × 624', w: 1640, h: 624 },
  { id: 'x-header', label: 'X (Twitter) header 1500 × 500', w: 1500, h: 500 },
  { id: 'li-banner', label: 'LinkedIn banner 1584 × 396', w: 1584, h: 396 },
  { id: 'passport', label: 'Passport / visa photo 600 × 600', w: 600, h: 600 },
  { id: 'hd', label: 'Full HD 1920 × 1080', w: 1920, h: 1080 },
];

const MAX_SIDE = 12000;
const field =
  'w-full rounded-xl border-[1.5px] border-[#D9D7F2] bg-white px-3.5 py-2.5 text-ink outline-none transition focus:border-brand-600';

interface Output {
  blob: Blob;
  url: string;
  w: number;
  h: number;
  type: string;
}

/**
 * Resizes an image to exact pixels, a percentage, or a social-media preset.
 * Presets crop to fill the frame from the centre so nothing is stretched.
 */
export function ResizeImageTool({ initialPreset }: { initialPreset?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [img, setImg] = useState<DecodedImage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [mode, setMode] = useState<Mode>(initialPreset ? 'preset' : 'pixels');
  const [w, setW] = useState('');
  const [h, setH] = useState('');
  const [lock, setLock] = useState(true);
  const [pct, setPct] = useState(50);
  const [presetId, setPresetId] = useState(initialPreset ?? RESIZE_PRESETS[0].id);
  const [fmt, setFmt] = useState<OutFormat>('same');
  const [quality, setQuality] = useState(0.9);
  const [out, setOut] = useState<Output | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => () => img?.close(), [img]);
  useEffect(() => () => {
    if (out) URL.revokeObjectURL(out.url);
  }, [out]);

  const open = async (f: File) => {
    setError(null);
    setOut(null);
    setFile(f);
    setLoading(true);
    try {
      const d = await decodeImage(f);
      setImg(d);
      setW(String(d.width));
      setH(String(d.height));
    } catch (e) {
      setError((e as Error).message);
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  const pick = (fl: FileList | null) => {
    const f = fl?.[0];
    if (f) void open(f);
  };

  const reset = () => {
    setFile(null);
    setImg(null);
    setOut(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const ratio = img ? img.width / img.height : 1;
  const onW = (v: string) => {
    setW(v);
    const n = parseInt(v, 10);
    if (lock && n > 0) setH(String(Math.max(1, Math.round(n / ratio))));
  };
  const onH = (v: string) => {
    setH(v);
    const n = parseInt(v, 10);
    if (lock && n > 0) setW(String(Math.max(1, Math.round(n * ratio))));
  };

  const preset = RESIZE_PRESETS.find((p) => p.id === presetId) ?? RESIZE_PRESETS[0];
  const target = useMemo(() => {
    if (!img) return null;
    if (mode === 'percent') return { w: Math.max(1, Math.round((img.width * pct) / 100)), h: Math.max(1, Math.round((img.height * pct) / 100)) };
    if (mode === 'preset') return { w: preset.w, h: preset.h };
    const tw = parseInt(w, 10);
    const th = parseInt(h, 10);
    if (!(tw > 0 && th > 0)) return null;
    return { w: tw, h: th };
  }, [img, mode, pct, preset, w, h]);
  const tooBig = !!target && (target.w > MAX_SIDE || target.h > MAX_SIDE);

  const outType = (): { mime: string; ext: string } => {
    const f = fmt === 'same' ? (file?.type === 'image/png' ? 'png' : file?.type === 'image/webp' ? 'webp' : 'jpg') : fmt;
    return f === 'png' ? { mime: 'image/png', ext: 'png' } : f === 'webp' ? { mime: 'image/webp', ext: 'webp' } : { mime: 'image/jpeg', ext: 'jpg' };
  };

  const resize = async () => {
    if (!img || !target || tooBig) return;
    setWorking(true);
    setError(null);
    try {
      const { mime } = outType();
      const opaque = mime === 'image/jpeg';
      let canvas: HTMLCanvasElement;
      if (mode === 'preset') {
        // Cover: scale to fill, then crop the centre.
        const s = Math.max(target.w / img.width, target.h / img.height);
        const sw = target.w / s;
        const sh = target.h / s;
        canvas = document.createElement('canvas');
        canvas.width = target.w;
        canvas.height = target.h;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Your browser blocked image editing.');
        if (opaque) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, target.w, target.h);
        }
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img.source, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, target.w, target.h);
      } else {
        canvas = drawToCanvas(img, target.w, target.h, opaque);
      }
      const blob = await canvasToBlob(canvas, mime, mime === 'image/png' ? undefined : quality);
      // Some browsers silently fall back to PNG when they cannot write WebP.
      setOut({ blob, url: URL.createObjectURL(blob), w: target.w, h: target.h, type: blob.type });
      canvas.width = canvas.height = 0;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(false);
    }
  };

  const extFor = (type: string) => (type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg');
  const tabs: { id: Mode; label: string }[] = [
    { id: 'pixels', label: 'By pixels' },
    { id: 'percent', label: 'By percent' },
    { id: 'preset', label: 'Social & photo sizes' },
  ];

  return (
    <div className="rounded-[28px] border-[1.5px] border-[#ECEBF8] bg-white p-5 shadow-sm sm:p-8">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/bmp,.heic,.heif,image/heic,image/heif"
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
          className={`flex flex-col items-center rounded-3xl border-2 border-dashed px-6 py-14 text-center transition ${drag ? 'border-brand-600 bg-brand-50' : 'border-[#D9D7F2]'}`}
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-[#ECEBF8] bg-white shadow-sm">
            <ImageIcon className="h-7 w-7 text-brand-600" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-xl font-bold text-ink">Choose an image to resize</h2>
          <p className="mt-1 text-sm text-ink-muted">JPG, PNG, WebP or iPhone HEIC. It stays on your device.</p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-6 inline-flex min-h-[48px] items-center gap-2 rounded-full bg-brand-600 px-6 font-bold text-white transition hover:bg-brand-700"
          >
            <Upload className="h-5 w-5" aria-hidden="true" /> Select image
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-red-800" role="alert">
          <TriangleAlert className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
          <p className="font-bold">{error}</p>
        </div>
      )}

      {file && loading && (
        <div className="flex flex-col items-center py-14" role="status">
          <Loader2 className="h-9 w-9 animate-spin text-brand-600" aria-hidden="true" />
          <p className="mt-3 font-bold text-ink">Opening your image…</p>
        </div>
      )}

      {file && img && !loading && (
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <p className="truncate font-bold text-ink">{file.name}</p>
            <p className="text-sm text-ink-muted">
              {img.width} × {img.height} px · {formatBytes(file.size)}
            </p>

            <div role="tablist" aria-label="How to resize" className="mt-5 flex flex-wrap gap-2">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={mode === t.id}
                  onClick={() => {
                    setMode(t.id);
                    setOut(null);
                  }}
                  className={`min-h-[40px] rounded-full px-4 text-sm font-bold transition ${mode === t.id ? 'bg-brand-600 text-white' : 'border-[1.5px] border-[#D9D7F2] text-ink-soft hover:border-brand-600'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="mt-5">
              {mode === 'pixels' && (
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label htmlFor="rs-w" className="mb-1.5 block text-sm font-bold text-ink">Width (px)</label>
                    <input id="rs-w" inputMode="numeric" className={field} value={w} onChange={(e) => onW(e.target.value.replace(/\D/g, ''))} />
                  </div>
                  <button
                    type="button"
                    onClick={() => setLock((l) => !l)}
                    aria-pressed={lock}
                    aria-label={lock ? 'Keep proportions: on' : 'Keep proportions: off'}
                    title="Keep proportions"
                    className={`mb-0.5 flex h-11 w-11 flex-none items-center justify-center rounded-xl border-[1.5px] ${lock ? 'border-brand-600 text-brand-600' : 'border-[#D9D7F2] text-ink-muted'}`}
                  >
                    {lock ? <Link2 className="h-5 w-5" aria-hidden="true" /> : <Link2Off className="h-5 w-5" aria-hidden="true" />}
                  </button>
                  <div className="flex-1">
                    <label htmlFor="rs-h" className="mb-1.5 block text-sm font-bold text-ink">Height (px)</label>
                    <input id="rs-h" inputMode="numeric" className={field} value={h} onChange={(e) => onH(e.target.value.replace(/\D/g, ''))} />
                  </div>
                </div>
              )}
              {mode === 'percent' && (
                <div>
                  <label htmlFor="rs-pct" className="mb-1.5 block text-sm font-bold text-ink">Scale: {pct}%</label>
                  <input id="rs-pct" type="range" min={5} max={200} step={5} value={pct} onChange={(e) => setPct(Number(e.target.value))} className="w-full accent-brand-600" />
                </div>
              )}
              {mode === 'preset' && (
                <div>
                  <label htmlFor="rs-preset" className="mb-1.5 block text-sm font-bold text-ink">Size</label>
                  <select id="rs-preset" className={field} value={presetId} onChange={(e) => setPresetId(e.target.value)}>
                    {RESIZE_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                  <p className="mt-2 text-sm text-ink-muted">The picture fills the frame and the edges are trimmed evenly, so nothing gets stretched.</p>
                </div>
              )}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="rs-fmt" className="mb-1.5 block text-sm font-bold text-ink">Save as</label>
                <select id="rs-fmt" className={field} value={fmt} onChange={(e) => setFmt(e.target.value as OutFormat)}>
                  <option value="same">Same type as original</option>
                  <option value="jpg">JPG</option>
                  <option value="png">PNG</option>
                  <option value="webp">WebP</option>
                </select>
              </div>
              {outType().mime !== 'image/png' && (
                <div>
                  <label htmlFor="rs-q" className="mb-1.5 block text-sm font-bold text-ink">Quality: {Math.round(quality * 100)}%</label>
                  <input id="rs-q" type="range" min={0.5} max={1} step={0.05} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="mt-3 w-full accent-brand-600" />
                </div>
              )}
            </div>

            {target && (
              <p className={`mt-5 text-sm font-semibold ${tooBig ? 'text-red-700' : 'text-ink-soft'}`}>
                {tooBig ? `That is too large. The longest side can be up to ${MAX_SIDE.toLocaleString()} px.` : `New size: ${target.w} × ${target.h} px`}
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void resize()}
                disabled={!target || tooBig || working}
                className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-brand-600 px-6 font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {working && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />} Resize image
              </button>
              <button type="button" onClick={reset} className="inline-flex min-h-[48px] items-center gap-2 rounded-full border-[1.5px] border-[#D9D7F2] px-5 font-bold text-ink transition hover:border-brand-600">
                <RotateCcw className="h-4 w-4" aria-hidden="true" /> Another image
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-slate-50 p-4">
            {out ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={out.url} alt="Resized preview" className="max-h-72 w-auto rounded-lg object-contain" />
                <p className="text-center font-bold text-ink" role="status">
                  {out.w} × {out.h} px · {formatBytes(out.blob.size)} {extFor(out.type).toUpperCase()}
                </p>
                <a
                  href={out.url}
                  download={`${baseName(file.name)}-${out.w}x${out.h}.${extFor(out.type)}`}
                  className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-brand-600 px-6 font-bold text-white transition hover:bg-brand-700"
                >
                  <Download className="h-5 w-5" aria-hidden="true" /> Download
                </a>
              </>
            ) : (
              <p className="px-6 text-center text-sm text-ink-muted">Pick a size and press Resize. Your result shows here.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
