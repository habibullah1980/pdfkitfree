import { ogCard, OG_SIZE } from '@/lib/og-card';

export const runtime = 'edge';
export const alt = 'HEIC to JPG Converter';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return ogCard('HEIC to JPG Converter', 'Batch convert iPhone photos. Nothing is uploaded.');
}
