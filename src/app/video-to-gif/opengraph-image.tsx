import { ogCard, OG_SIZE } from '@/lib/og-card';

export const runtime = 'edge';
export const alt = 'Video to GIF Maker';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return ogCard('Video to GIF Maker', 'Pick a clip, get a looping GIF. No watermark.');
}
