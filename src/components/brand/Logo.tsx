import React from 'react';

type Tone = 'color' | 'light';

/** The PDFKitFree mark: a page with a folded corner and a K for "Kit". */
export function LogoMark({ size = 40, tone = 'color', className }: { size?: number; tone?: Tone; className?: string }) {
  const page = tone === 'light' ? '#FFFFFF' : '#4B3FE4';
  const k = tone === 'light' ? '#4B3FE4' : '#FFFFFF';
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className={className}>
      <path d="M9 3h16l11 11v19a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4z" fill={page} />
      <path d="M25 3v7a4 4 0 0 0 4 4h7z" fill="#FFC83D" />
      <path
        d="M13 16v14M24 16l-8 7 8 7"
        stroke={k}
        strokeWidth={size <= 20 ? 4 : 3.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function Logo({ size = 40, tone = 'color', className = '' }: { size?: number; tone?: Tone; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} tone={tone} />
      <span
        className={`font-display font-extrabold tracking-[-0.03em] ${tone === 'light' ? 'text-white' : 'text-ink'}`}
        style={{ fontSize: Math.round(size * 0.6) }}
      >
        PDFKit<span className={tone === 'light' ? 'text-sun' : 'text-brand-600'}>free</span>
      </span>
    </span>
  );
}
