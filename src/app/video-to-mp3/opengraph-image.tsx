import { ogCard, OG_SIZE } from '@/lib/og-card';

export const runtime = 'edge';
export const alt = 'Video to MP3 Converter';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return ogCard('Video to MP3 Converter', 'Extract audio from any video. Nothing is uploaded.');
}
