import { ogCard, OG_SIZE } from '@/lib/og-card';

export const runtime = 'edge';
export const alt = 'HEIC to PNG Converter';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return ogCard('HEIC to PNG Converter', 'Batch convert iPhone photos. Nothing is uploaded.');
}
