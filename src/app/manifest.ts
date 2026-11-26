import type { MetadataRoute } from 'next';

/** Makes the site installable on phones and desktops ("Add to Home Screen"), which brings people back. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PDFKitFree: free PDF tools',
    short_name: 'PDFKitFree',
    description: 'Merge, compress, sign, convert and OCR PDFs in your browser. Nothing is uploaded.',
    start_url: '/?source=pwa',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#4B3FE4',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
