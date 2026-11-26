'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';

const POINTS = [
  'Compress a 10 MB PDF in seconds',
  'Merge files and sign documents',
  'Shrink a photo under 50 KB for forms',
];

/**
 * Short silent screen recording of the real tools. The video file is only
 * requested once the section scrolls near the screen, and it never autoplays
 * for people who ask their system for reduced motion.
 */
export function DemoVideo() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [load, setLoad] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setLoad(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setLoad(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!load || !v) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) v.play().catch(() => setPlaying(false));
  }, [load]);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      setLoad(true);
      void v.play().catch(() => setPlaying(false));
    } else {
      v.pause();
    }
  };

  return (
    <section aria-labelledby="demo-title" className="bg-white py-16 sm:py-20">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:px-8">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-brand-600">See it in action</p>
          <h2 id="demo-title" className="mt-2 text-3xl font-extrabold text-ink sm:text-[40px] sm:leading-tight">
            Your file, done in a few clicks
          </h2>
          <p className="mt-3 text-lg text-ink-muted">
            A 37 second look at the real tools. No sign-up, and PDF tools run right in your browser.
          </p>
          <ul className="mt-6 space-y-3">
            {POINTS.map((p) => (
              <li key={p} className="flex items-center gap-3 font-semibold text-ink">
                <span className="h-2.5 w-2.5 flex-none rounded-full bg-sun" aria-hidden="true" />
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div ref={wrapRef} className="relative overflow-hidden rounded-3xl border-[1.5px] border-[#ECEBF8] bg-ink shadow-xl">
          <video
            ref={videoRef}
            className="block aspect-video w-full"
            poster="/videos/pdfkitfree-demo-poster.jpg"
            muted
            loop
            playsInline
            preload="none"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            aria-label="Screen recording of PDFKitFree compressing a PDF, merging files, signing a document and shrinking an image"
          >
            {load && <source src="/videos/pdfkitfree-demo.webm" type="video/webm" />}
            {load && <source src="/videos/pdfkitfree-demo.mp4" type="video/mp4" />}
          </video>
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? 'Pause video' : 'Play video'}
            className={`absolute flex items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75 ${
              playing ? 'bottom-3 right-3 h-10 w-10' : 'left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2'
            }`}
          >
            {playing ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="ml-1 h-7 w-7" aria-hidden="true" />}
          </button>
        </div>
      </div>
    </section>
  );
}
