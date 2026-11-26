import { ogCard, OG_SIZE } from '@/lib/og-card';
import { getSizeTarget } from '@/lib/size-targets';

export const runtime = 'edge';
export const alt = 'Compress a PDF to a target size';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image({ params }: { params: { size: string } }) {
  const t = getSizeTarget(params.size);
  return ogCard(`Compress PDF to ${t?.label ?? 'any size'}`, 'Text stays sharp. Nothing is uploaded.');
}
