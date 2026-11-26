'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Download, Film, Loader2, RotateCcw, TriangleAlert, Upload } from 'lucide-react';
import { baseName, formatBytes } from '@/lib/image-decode';

const MAX_SECONDS = 20;
const WIDTHS = [320, 480, 640] as const;
const FPS = [5, 10, 15] as const;
const field =
  'w-full rounded-xl border-[1.5px] border-[#D9D7F2] bg-white px-3.5 py-2.5 text-ink outline-none transition focus:border-brand-600';

const tick = () => new Promise((r) => setTimeout(r, 0));

function seek(v: HTMLVideoElement, t: number) {
  return new Promise<void>((resolve, reject) => {
    const done = () => {
      clearTimeout(timer);
      v.removeEventListener('seeked', done);
      resolve();
    };
    const timer = setTimeout(() => {
      v.removeEventListener('seeked', done);
      reject(new Error('The video stopped responding while we read its frames.'));
    }, 10000);
    v.addEventListener('seeked', done);
    v.currentTime = t;
  });
}

/** Turns a short part of a video into an animated GIF, entirely in the browser. */
export function VideoToGifTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cancelRef = useRef(false);
  const [file, setFile] = useState<File | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [start, setStart] = useState(0);
  const [length, setLength] = useState(5);
  const [width, setWidth] = useState<(typeof WIDTHS)[number]>(480);
  const [fps, setFps] = useState<(typeof FPS)[number]>(10);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; url: string; w: number; h: number; frames: number } | null>(null);
  const [drag, setDrag] = useState(false);

  useEffect(() => () => {
    if (src) URL.revokeObjectURL(src);
  }, [src]);
  useEffect(() => () => {
    if (result) URL.revokeObjectURL(result.url);
  }, [result]);

  const open = (f: File) => {
    setError(null);
    setResult(null);
    setDuration(0);
    setStart(0);
    setFile(f);
    setSrc(URL.createObjectURL(f));
  };

  const pick = (fl: FileList | null) => {
    const f = fl?.[0];
    if (f) open(f);
  };

  const reset = () => {
    cancelRef.current = true;
    setFile(null);
    setSrc(null);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const clipLen = Math.max(0.5, Math.min(length, MAX_SECONDS, duration ? duration - start : MAX_SECONDS));
  const outW = Math.min(width, dims.w || width);
  const outH = dims.w ? Math.max(2, Math.round((outW * dims.h) / dims.w / 2) * 2) : 0;
  const frameCount = Math.max(1, Math.round(clipLen * fps));

  const make = async () => {
    const v = videoRef.current;
    if (!v || !dims.w) return;
    cancelRef.current = false;
    setBusy(true);
    setError(null);
    setResult(null);
    setProgress(0);
    v.pause();
    try {
      const { GIFEncoder, quantize, applyPalette } = await import('gifenc');
      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Your browser blocked image editing.');
      const gif = GIFEncoder();
      const delay = Math.round(1000 / fps);
      for (let i = 0; i < frameCount; i++) {
        if (cancelRef.current) return;
        const t = Math.min(start + i / fps, Math.max(0, duration - 0.05));
        await seek(v, t);
        ctx.drawImage(v, 0, 0, outW, outH);
        const { data } = ctx.getImageData(0, 0, outW, outH);
        const palette = quantize(data, 256);
        gif.writeFrame(applyPalette(data, palette), outW, outH, { palette, delay, repeat: 0 });
        setProgress(Math.round(((i + 1) / frameCount) * 100));
        await tick();
      }
      gif.finish();
      const blob = new Blob([new Uint8Array(gif.bytes())], { type: 'image/gif' });
      setResult({ blob, url: URL.createObjectURL(blob), w: outW, h: outH, frames: frameCount });
    } catch (e) {
      setError((e as Error).message || 'Something went wrong while making the GIF.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-[28px] border-[1.5px] border-[#ECEBF8] bg-white p-5 shadow-sm sm:p-8">
      <input
        ref={inputRef}
        type="file"
        accept="video/*,.mp4,.mov,.m4v,.webm"
        className="sr-only"
        onChange={(e) => pick(e.target.files)}
        aria-label="Choose a video"
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
            <Film className="h-7 w-7 text-brand-600" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-xl font-bold text-ink">Choose a video</h2>
          <p className="mt-1 text-sm text-ink-muted">MP4, MOV or WebM. You pick up to {MAX_SECONDS} seconds to turn into a GIF.</p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-6 inline-flex min-h-[48px] items-center gap-2 rounded-full bg-brand-600 px-6 font-bold text-white transition hover:bg-brand-700"
          >
            <Upload className="h-5 w-5" aria-hidden="true" /> Select video
          </button>
        </div>
      )}

      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-red-800" role="alert">
          <TriangleAlert className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="font-bold">{error}</p>
            <button type="button" onClick={reset} className="mt-2 text-sm font-bold underline">
              Try another video
            </button>
          </div>
        </div>
      )}

      {file && src && (
        <div className={`grid gap-6 md:grid-cols-2 ${error && !duration ? 'hidden' : ''}`}>
          <div className="min-w-0">
            <video
              ref={videoRef}
              src={src}
              controls
              muted
              playsInline
              preload="auto"
              className="aspect-video w-full rounded-2xl bg-black"
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                if (!v.videoWidth) {
                  setError('This video has no picture we can read.');
                  return;
                }
                setDuration(v.duration);
                setDims({ w: v.videoWidth, h: v.videoHeight });
                setLength(Math.min(5, Math.floor(v.duration * 10) / 10 || 5));
              }}
              onError={() => setError('Your browser cannot play this video. Try an MP4 (H.264) or WebM file.')}
            />
            <p className="mt-2 truncate text-sm text-ink-muted">
              {file.name}
              {duration ? ` · ${duration.toFixed(1)} s · ${dims.w} × ${dims.h}` : ''}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="gif-start" className="mb-1.5 block text-sm font-bold text-ink">Start at (seconds)</label>
                <input
                  id="gif-start"
                  type="number"
                  min={0}
                  step={0.1}
                  max={Math.max(0, duration - 0.5)}
                  className={field}
                  value={start}
                  disabled={busy}
                  onChange={(e) => setStart(Math.max(0, Math.min(Number(e.target.value) || 0, Math.max(0, duration - 0.5))))}
                />
              </div>
              <div>
                <label htmlFor="gif-len" className="mb-1.5 block text-sm font-bold text-ink">Length (seconds)</label>
                <input
                  id="gif-len"
                  type="number"
                  min={0.5}
                  step={0.5}
                  max={MAX_SECONDS}
                  className={field}
                  value={length}
                  disabled={busy}
                  onChange={(e) => setLength(Math.max(0.5, Math.min(Number(e.target.value) || 0.5, MAX_SECONDS)))}
                />
              </div>
            </div>
            <button
              type="button"
              disabled={busy || !duration}
              onClick={() => videoRef.current && setStart(Math.round(videoRef.current.currentTime * 10) / 10)}
              className="self-start text-sm font-bold text-brand-600 underline disabled:opacity-50"
            >
              Start where the video is paused
            </button>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="gif-w" className="mb-1.5 block text-sm font-bold text-ink">Width</label>
                <select id="gif-w" className={field} value={width} disabled={busy} onChange={(e) => setWidth(Number(e.target.value) as typeof width)}>
                  {WIDTHS.map((w) => (
                    <option key={w} value={w}>{w} px</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="gif-fps" className="mb-1.5 block text-sm font-bold text-ink">Smoothness</label>
                <select id="gif-fps" className={field} value={fps} disabled={busy} onChange={(e) => setFps(Number(e.target.value) as typeof fps)}>
                  {FPS.map((f) => (
                    <option key={f} value={f}>{f} frames per second</option>
                  ))}
                </select>
              </div>
            </div>
            {duration > 0 && (
              <p className="text-sm text-ink-muted">
                GIF: {clipLen.toFixed(1)} s from {start.toFixed(1)} s, {outW} × {outH} px, {frameCount} frames. Shorter and smaller GIFs load faster.
              </p>
            )}
            {busy ? (
              <div role="status" aria-live="polite">
                <p className="font-bold text-ink">
                  <Loader2 className="mr-2 inline h-5 w-5 animate-spin text-brand-600" aria-hidden="true" />
                  Making your GIF… {progress}%
                </p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#ECEBF8]">
                  <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.max(4, progress)}%` }} />
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void make()}
                  disabled={!duration}
                  className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-brand-600 px-6 font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Make GIF
                </button>
                <button type="button" onClick={reset} className="inline-flex min-h-[48px] items-center gap-2 rounded-full border-[1.5px] border-[#D9D7F2] px-5 font-bold text-ink transition hover:border-brand-600">
                  <RotateCcw className="h-4 w-4" aria-hidden="true" /> Another video
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {file && result && !busy && (
        <div className="mt-8 flex flex-col items-center gap-4 rounded-2xl bg-slate-50 p-5">
          <p className="flex items-center gap-2 font-bold text-teal-800">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> GIF ready: {result.w} × {result.h} px, {result.frames} frames, {formatBytes(result.blob.size)}
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={result.url} alt="Your animated GIF" className="max-h-80 w-auto rounded-lg" />
          <a
            href={result.url}
            download={`${baseName(file.name)}.gif`}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-brand-600 px-6 font-bold text-white transition hover:bg-brand-700"
          >
            <Download className="h-5 w-5" aria-hidden="true" /> Download GIF
          </a>
        </div>
      )}
    </div>
  );
}
