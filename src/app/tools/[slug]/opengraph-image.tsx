import { ogCard, OG_SIZE } from '@/lib/og-card';
import { getToolBySlug } from '@/lib/tools';

export const runtime = 'edge';
export const alt = 'PDFKitFree tool';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image({ params }: { params: { slug: string } }) {
  const tool = getToolBySlug(params.slug);
  return ogCard(tool ? `${tool.title}, free online` : 'Free PDF tools', tool?.shortDescription.slice(0, 110) ?? 'Runs in your browser.');
}
