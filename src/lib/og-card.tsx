import { ImageResponse } from 'next/og';

export const OG_SIZE = { width: 1200, height: 630 };

/** Branded 1200x630 social card used for link previews (WhatsApp, X, Facebook, LinkedIn, Google Discover). */
export function ogCard(title: string, subtitle: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: 'linear-gradient(135deg, #1B1A3A 0%, #2A1F9E 55%, #4B3FE4 100%)',
          color: '#fff',
          fontFamily: 'sans-serif',
          padding: 72,
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', right: -120, top: -120, width: 520, height: 520, borderRadius: 520, background: '#FFC83D' }} />
        <div style={{ position: 'absolute', right: 150, bottom: -90, width: 220, height: 220, borderRadius: 220, background: '#2CC59A' }} />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: 760, height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <svg width="64" height="64" viewBox="0 0 40 40">
              <path d="M9 3h16l11 11v19a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4z" fill="#fff" />
              <path d="M25 3v7a4 4 0 0 0 4 4h7z" fill="#FFC83D" />
              <path d="M13 16v14M24 16l-8 7 8 7" stroke="#4B3FE4" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            <div style={{ display: 'flex', fontSize: 40, fontWeight: 800 }}>
              PDFKit<span style={{ color: '#FFC83D' }}>free</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ fontSize: title.length > 28 ? 64 : 80, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>{title}</div>
            <div style={{ fontSize: 30, color: '#DCDAFF', lineHeight: 1.35 }}>{subtitle}</div>
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            {['Free', 'No sign-up', 'Files stay on your device'].map((t) => (
              <div key={t} style={{ display: 'flex', padding: '10px 22px', borderRadius: 999, background: 'rgba(255,255,255,.14)', fontSize: 24, fontWeight: 700 }}>
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
