import { ogCard, OG_SIZE } from '@/lib/og-card';
import { IMAGE_SIZE_TARGETS, findTarget } from '@/lib/size-targets';

export const runtime = 'edge';
export const alt = 'Compress an image to a target size';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image({ params }: { params: { size: string } }) {
  const t = findTarget(IMAGE_SIZE_TARGETS, params.size);
  return ogCard(`Compress Image to ${t?.label ?? 'any size'}`, 'Best quality that fits. Nothing is uploaded.');
}
