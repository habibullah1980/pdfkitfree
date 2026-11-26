import { ogCard, OG_SIZE } from '@/lib/og-card';

export const runtime = 'edge';
export const alt = 'Resize Image';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return ogCard('Resize Image', 'Pixels, percent or Instagram sizes. In your browser.');
}
