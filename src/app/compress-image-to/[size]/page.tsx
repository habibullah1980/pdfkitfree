import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ImageToSizeTool } from '@/components/tools/ImageToSizeTool';
import { SizeLanding } from '@/components/landing/SizeLanding';
import { IMAGE_SIZE_TARGETS, findTarget } from '@/lib/size-targets';
import { SITE_CONFIG } from '@/lib/site-config';

interface Props {
  params: { size: string };
}

export const dynamicParams = false;

export function generateStaticParams() {
  return IMAGE_SIZE_TARGETS.map((t) => ({ size: t.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const t = findTarget(IMAGE_SIZE_TARGETS, params.size);
  if (!t) return { title: 'Not found' };
  const title = `Compress Image to ${t.label} Online Free (JPG, PNG) | PDFKitFree`;
  const description = `Reduce a photo or image to under ${t.label} for ${t.useCase}. Free, instant, and the image never leaves your device.`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/compress-image-to/${t.slug}` },
    openGraph: { title, description, url: `${SITE_CONFIG.url}/compress-image-to/${t.slug}`, type: 'website' },
  };
}

export default function CompressImageToSizePage({ params }: Props) {
  const t = findTarget(IMAGE_SIZE_TARGETS, params.size);
  if (!t) notFound();

  return (
    <SizeLanding
      heading={`Compress Image to ${t.label}`}
      intro={`Need a photo under ${t.label} for ${t.useCase}? Add it below. We find the best quality that fits, and only shrink the dimensions if we have to.`}
      path={`/compress-image-to/${t.slug}`}
      privacyNote="Runs in your browser"
      breadcrumbs={[
        { label: 'Image tools', href: '/compress-image-to/100kb' },
        { label: `To ${t.label}`, href: `/compress-image-to/${t.slug}` },
      ]}
      steps={[
        ['Add your image', 'JPG, PNG and WebP work. Drag it in or tap to pick a photo from your phone.'],
        ['We fit it', `We try the highest quality first and step down only until the image is under ${t.label}.`],
        ['Download', 'Save the JPG. You see its exact size and pixel dimensions first.'],
      ]}
      faqs={[
        {
          q: `Will my photo still look good at ${t.label}?`,
          a: 'We keep the full dimensions and lower quality first, because that is usually invisible. Only if that is not enough do we make the picture smaller in pixels.',
        },
        {
          q: 'Is my image uploaded?',
          a: 'No. Everything happens in your browser on your own device.',
        },
        {
          q: 'What format do I get?',
          a: 'A JPG, which every website and form accepts. Transparent parts of a PNG become white.',
        },
        {
          q: `What if it cannot reach ${t.label}?`,
          a: 'That is rare, but if it happens we show the smallest size we reached instead of pretending it worked.',
        },
      ]}
      others={IMAGE_SIZE_TARGETS.filter((o) => o.slug !== t.slug).map((o) => ({
        href: `/compress-image-to/${o.slug}`,
        label: `Compress image to ${o.label}`,
      }))}
      ownLevel={{ href: '/tools/jpg-to-pdf', label: 'Turn images into a PDF' }}
    >
      <ImageToSizeTool targetBytes={t.bytes} targetLabel={t.label} />
    </SizeLanding>
  );
}
