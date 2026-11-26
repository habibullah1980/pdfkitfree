import { ogCard, OG_SIZE } from '@/lib/og-card';
import { getBlogPostBySlug } from '@/lib/blog-data';

export const runtime = 'edge';
export const alt = 'PDFKitFree guide';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image({ params }: { params: { slug: string } }) {
  const post = getBlogPostBySlug(params.slug);
  return ogCard(post?.title ?? 'PDF guides', 'A free guide from PDFKitFree');
}
