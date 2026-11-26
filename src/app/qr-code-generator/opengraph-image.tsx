import { ogCard, OG_SIZE } from '@/lib/og-card';

export const runtime = 'edge';
export const alt = 'Free QR Code Generator';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return ogCard('Free QR Code Generator', 'PNG or SVG. Never expires. No sign-up.');
}
