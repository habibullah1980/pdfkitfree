'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Download, Loader2, Music, RotateCcw, TriangleAlert, Upload } from 'lucide-react';
import { baseName, formatBytes } from '@/lib/image-decode';

const MAX_BYTES = 500 * 1024 * 1024;
const SAMPLE_RATE = 44100;
const BITRATES = [128, 192, 320] as const;

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
}

function toInt16(f: Float32Array) {
  const out = new Int16Array(f.length);
  for (let i = 0; i < f.length; i++) {
    const s = Math.max(-1, Math.min(1, f[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

const tick = () => new Promise((r) => setTimeout(r, 0));

/** Pulls the sound out of a video and saves it as an MP3, entirely in the browser. */
export function VideoToMp3Tool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [kbps, setKbps] = useState<(typeof BITRATES)[number]>(192);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; url: string; seconds: number } | null>(null);
  const [drag, setDrag] = useState(false);

  useEffect(() => () => {
    if (result) URL.revokeObjectURL(result.url);
  }, [result]);

  const convert = async (f: File) => {
    setFile(f);
    setError(null);
    setResult(null);
    if (f.size > MAX_BYTES) {
      setError(`This file is ${formatBytes(f.size)}. The limit is 500 MB so your browser does not run out of memory.`);
      return;
    }
    setBusy(true);
    setProgress(0);
    try {
      setStage('Reading the sound track…');
      const buf = await f.arrayBuffer();
      const Ctx = window.OfflineAudioContext || (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
      if (!Ctx) throw new Error('Your browser cannot process audio. Please try Chrome, Edge, Safari or Firefox.');
      let audio: AudioBuffer;
      try {
        audio = await new Ctx(2, 1, SAMPLE_RATE).decodeAudioData(buf);
      } catch {
        throw new Error('We could not find a sound track your browser can read. The video may have no sound, or use an audio format this browser does not support.');
      }

      setStage('Making the MP3…');
      const { Mp3Encoder } = await import('@breezystack/lamejs');
      const channels = Math.min(2, audio.numberOfChannels);
      const enc = new Mp3Encoder(channels, audio.sampleRate, kbps);
      const left = toInt16(audio.getChannelData(0));
      const right = channels > 1 ? toInt16(audio.getChannelData(1)) : undefined;
      const parts: BlobPart[] = [];
      const block = 1152;
      const perTick = block * 200;
      for (let i = 0; i < left.length; i += block) {
        const l = left.subarray(i, i + block);
        const chunk = right ? enc.encodeBuffer(l, right.subarray(i, i + block)) : enc.encodeBuffer(l);
        if (chunk.length) parts.push(new Uint8Array(chunk));
        if (i % perTick === 0) {
          setProgress(Math.round((i / left.length) * 100));
          await tick();
        }
      }
      const end = enc.flush();
      if (end.length) parts.push(new Uint8Array(end));
      const blob = new Blob(parts, { type: 'audio/mpeg' });
      setProgress(100);
      setResult({ blob, url: URL.createObjectURL(blob), seconds: audio.duration });
    } catch (e) {
      setError((e as Error).message || 'Something went wrong while converting.');
    } finally {
      setBusy(false);
      setStage('');
    }
  };

  const pick = (fl: FileList | null) => {
    const f = fl?.[0];
    if (f) void convert(f);
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="rounded-[28px] border-[1.5px] border-[#ECEBF8] bg-white p-5 shadow-sm sm:p-8">
      <input
        ref={inputRef}
        type="file"
        accept="video/*,audio/*,.mp4,.mov,.m4v,.webm,.mkv,.m4a"
        className="sr-only"
        onChange={(e) => pick(e.target.files)}
        aria-label="Choose a video"
      />

      {!file && (
        <>
          <div className="mb-6">
            <span className="mb-1.5 block text-sm font-bold text-ink">MP3 quality</span>
            <div className="inline-flex rounded-full border-[1.5px] border-[#D9D7F2] p-1" role="radiogroup" aria-label="MP3 quality">
              {BITRATES.map((b) => (
                <button
                  key={b}
                  type="button"
                  role="radio"
                  aria-checked={kbps === b}
                  onClick={() => setKbps(b)}
                  className={`min-h-[40px] rounded-full px-4 text-sm font-bold transition ${kbps === b ? 'bg-brand-600 text-white' : 'text-ink-soft'}`}
                >
                  {b} kbps{b === 192 ? ' (recommended)' : ''}
                </button>
              ))}
            </div>
          </div>
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
              <Music className="h-7 w-7 text-brand-600" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-xl font-bold text-ink">Choose a video</h2>
            <p className="mt-1 text-sm text-ink-muted">MP4, MOV or WebM up to 500 MB. It stays on your device.</p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-6 inline-flex min-h-[48px] items-center gap-2 rounded-full bg-brand-600 px-6 font-bold text-white transition hover:bg-brand-700"
            >
              <Upload className="h-5 w-5" aria-hidden="true" /> Select video
            </button>
          </div>
        </>
      )}

      {file && busy && (
        <div className="flex flex-col items-center py-14 text-center" role="status" aria-live="polite">
          <Loader2 className="h-9 w-9 animate-spin text-brand-600" aria-hidden="true" />
          <p className="mt-3 font-bold text-ink">{stage}</p>
          <div className="mt-4 h-2 w-64 overflow-hidden rounded-full bg-[#ECEBF8]">
            <div className="h-full rounded-full bg-brand-600 transition-[width]" style={{ width: `${Math.max(4, progress)}%` }} />
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-red-800" role="alert">
          <TriangleAlert className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="font-bold">{error}</p>
            <button type="button" onClick={reset} className="mt-2 text-sm font-bold underline">
              Try another video
            </button>
          </div>
        </div>
      )}

      {file && result && !busy && (
        <div className="flex flex-col gap-4">
          <p className="flex items-start gap-2 rounded-2xl bg-teal-50 px-4 py-3 font-bold text-teal-900">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
            Your MP3 is ready: {fmtTime(result.seconds)} long, {formatBytes(result.blob.size)}, {kbps} kbps.
          </p>
          <audio controls src={result.url} className="w-full" aria-label="Listen to the MP3" />
          <div className="flex flex-wrap gap-3">
            <a
              href={result.url}
              download={`${baseName(file.name)}.mp3`}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-brand-600 px-6 font-bold text-white transition hover:bg-brand-700"
            >
              <Download className="h-5 w-5" aria-hidden="true" /> Download MP3
            </a>
            <button
              type="button"
              onClick={reset}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-full border-[1.5px] border-[#D9D7F2] px-5 font-bold text-ink transition hover:border-brand-600"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Another video
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
