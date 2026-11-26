import { ogCard, OG_SIZE } from '@/lib/og-card';

export const runtime = 'edge';
export const alt = 'PDFKitFree: free PDF tools that run in your browser';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return ogCard('Every PDF job, done right in your browser.', '38 free tools: merge, compress, sign, convert and OCR.');
}
