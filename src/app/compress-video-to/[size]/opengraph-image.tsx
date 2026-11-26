import { ogCard, OG_SIZE } from '@/lib/og-card';
import { VIDEO_SIZE_TARGETS, findTarget } from '@/lib/size-targets';

export const runtime = 'edge';
export const alt = 'Compress a video to a target size';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image({ params }: { params: { size: string } }) {
  const t = findTarget(VIDEO_SIZE_TARGETS, params.size);
  return ogCard(`Compress Video to ${t?.label ?? 'any size'}`, 'Free, no watermark, no sign-up.');
}
