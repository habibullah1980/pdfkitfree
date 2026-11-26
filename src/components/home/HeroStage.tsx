import React from 'react';

/**
 * Decorative hero illustration: a PDF page on a sunflower circle with live-looking
 * cards for the things the site does. Pure CSS/SVG, hidden from screen readers.
 */
export function HeroStage() {
  return (
    <div className="relative mx-auto h-[440px] w-full max-w-[600px] sm:h-[560px]" aria-hidden="true">
      <div className="absolute right-[-20px] top-[-10px] hidden h-[560px] w-[560px] animate-pk-spin-slow rounded-full border-2 border-dashed border-[#E3E1F5] sm:block" />
      <div className="absolute right-2 top-6 h-[380px] w-[380px] animate-pk-sun rounded-full bg-sun sm:right-5 sm:top-8 sm:h-[480px] sm:w-[480px]" />

      {/* The PDF page */}
      <div className="absolute right-16 top-16 w-[240px] -rotate-3 animate-pk-rise rounded-[18px] bg-white p-6 shadow-[0_40px_80px_-30px_rgba(27,26,58,.45)] sm:right-[120px] sm:top-20 sm:w-[300px]">
        <span className="absolute right-0 top-0 h-[54px] w-[54px] rounded-bl-xl rounded-tr-[18px] bg-[linear-gradient(225deg,#fff_50%,#E9E7FF_50%)]" />
        <span className="mb-3 block h-3.5 w-[55%] rounded-md bg-ink/85" />
        <span className="mb-2.5 block h-2.5 w-[90%] rounded-md bg-[#ECEBF7]" />
        <span className="mb-2.5 block h-2.5 w-[80%] rounded-md bg-[#ECEBF7]" />
        <span className="relative my-4 block h-[100px] overflow-hidden rounded-xl bg-brand-600 sm:h-[120px]">
          <span className="absolute -bottom-12 -left-5 h-[120px] w-[200px] rounded-full bg-teal-500" />
          <span className="absolute right-7 top-5 h-8 w-8 rounded-full bg-sun" />
        </span>
        {[95, 70, 85, 60].map((w) => (
          <span key={w} className="mb-2.5 block h-2.5 rounded-md bg-[#ECEBF7]" style={{ width: `${w}%` }} />
        ))}
      </div>

      {/* Compress card */}
      <div className="pk-card absolute left-0 top-12 flex w-[280px] items-center gap-3 rounded-2xl bg-white p-3.5 shadow-lift sm:left-2.5 sm:top-[60px] sm:w-[300px]" style={{ animationDelay: '.6s, 1.4s' }}>
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-teal-50">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#139A72" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" /></svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex justify-between text-sm font-bold"><span>annual-report.pdf</span><span className="text-teal-600">−73%</span></span>
          <span className="mt-2 block h-2 overflow-hidden rounded-full bg-[#ECEBF7]">
            <span className="block h-full w-[72%] rounded-full bg-gradient-to-r from-teal-500 to-brand-600" style={{ animation: 'pk-fill 2.4s .9s cubic-bezier(.3,.7,.2,1) both' }} />
          </span>
          <span className="mt-1.5 block text-[13px] text-ink-muted">17.9 MB to 4.8 MB, text kept sharp</span>
        </span>
      </div>

      {/* Signature card */}
      <div className="pk-card absolute bottom-6 left-4 flex w-[240px] flex-col items-start gap-1.5 rounded-2xl bg-white p-3.5 shadow-lift sm:bottom-10 sm:left-10 sm:w-[260px]" style={{ animationDelay: '.85s, 2s' }}>
        <svg className="pk-sig" width="200" height="54" viewBox="0 0 200 54" fill="none"><path d="M6 40c14-22 22-30 26-24s-10 26-2 26 18-30 26-30-4 26 6 26 14-22 22-22 2 18 12 18 16-14 26-14 10 8 22 8 22-6 32-10" stroke="#1B1A3A" strokeWidth="2.6" strokeLinecap="round" /></svg>
        <span className="flex items-center gap-2 text-sm font-bold">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
          </span>
          NDA_2026.pdf signed
        </span>
      </div>

      {/* Merge card */}
      <div className="pk-card absolute bottom-20 right-0 hidden w-[230px] items-center gap-3 rounded-2xl bg-white p-3.5 shadow-lift sm:flex" style={{ animationDelay: '1.1s, 2.6s' }}>
        <span className="flex items-end">
          <span className="block h-[34px] w-[26px] rounded-[5px] bg-sun" />
          <span className="-ml-2.5 block h-[34px] w-[26px] rounded-[5px] bg-[#FF8A65]" />
          <span className="-ml-2.5 block h-[34px] w-[26px] rounded-[5px] bg-brand-600" />
        </span>
        <span>
          <span className="block text-sm font-bold">3 files merged</span>
          <span className="block text-[13px] text-ink-muted">Pages in your order</span>
        </span>
      </div>

      {/* OCR chip */}
      <div className="pk-card absolute right-3 top-2 flex items-center gap-2 rounded-2xl bg-white px-3.5 py-2.5 text-sm font-bold shadow-lift sm:right-8 sm:top-5" style={{ animationDelay: '1.3s, 3s' }}>
        <span className="block h-2.5 w-2.5 rounded-full bg-teal-500" />
        OCR found 46 words
      </div>
    </div>
  );
}
