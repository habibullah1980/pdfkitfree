import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { VideoCompressorTool } from '@/components/VideoCompressorTool';
import { SizeLanding } from '@/components/landing/SizeLanding';
import { VIDEO_SIZE_TARGETS, findTarget } from '@/lib/size-targets';
import { SITE_CONFIG } from '@/lib/site-config';

interface Props {
  params: { size: string };
}

export const dynamicParams = false;

export function generateStaticParams() {
  return VIDEO_SIZE_TARGETS.map((t) => ({ size: t.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const t = findTarget(VIDEO_SIZE_TARGETS, params.size);
  if (!t) return { title: 'Not found' };
  const title = `Compress Video to ${t.label} Online Free (MP4, MOV) | PDFKitFree`;
  const description = `Shrink a video to under ${t.label} for ${t.useCase}. Free, no watermark, no sign-up. Most videos are compressed right in your browser.`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/compress-video-to/${t.slug}` },
    openGraph: { title, description, url: `${SITE_CONFIG.url}/compress-video-to/${t.slug}`, type: 'website' },
  };
}

export default function CompressVideoToSizePage({ params }: Props) {
  const t = findTarget(VIDEO_SIZE_TARGETS, params.size);
  if (!t) notFound();

  return (
    <SizeLanding
      heading={`Compress Video to ${t.label}`}
      intro={`Need a video under ${t.label} for ${t.useCase}? Add it below. We work out the bitrate and resolution that fit your clip, compress it, and tell you the real size before you download.`}
      path={`/compress-video-to/${t.slug}`}
      privacyNote="No watermark, no sign-up"
      breadcrumbs={[
        { label: 'Video Compressor', href: '/video-compressor' },
        { label: `To ${t.label}`, href: `/compress-video-to/${t.slug}` },
      ]}
      steps={[
        ['Add your video', 'MP4, MOV, WebM and most phone videos work. Drag it in or tap to choose.'],
        ['Press Compress', `We spread the ${t.label} budget across the whole clip and lower the resolution only if needed.`],
        ['Check and download', `You see the real size. If it is still above ${t.label}, we say so and suggest what to change.`],
      ]}
      faqs={[
        {
          q: `Can any video be compressed to ${t.label}?`,
          a: `Short clips almost always fit. Long videos have to share ${t.label} across every second, so a very long clip may look soft or still come out larger. Trimming it first gives the best quality.`,
        },
        {
          q: 'Is my video uploaded?',
          a: 'Videos your browser can play (most MP4, MOV and WebM files) are compressed on your own device and never uploaded. Unusual formats are sent to our server to convert, then deleted right after.',
        },
        {
          q: 'Is there a watermark or time limit?',
          a: 'No. The compressed video has no watermark and you do not need an account.',
        },
        {
          q: 'Does it work on iPhone and Android?',
          a: 'Yes, in Safari, Chrome, Edge, Firefox and Samsung Internet. Phones take longer than computers on big files.',
        },
      ]}
      others={VIDEO_SIZE_TARGETS.filter((o) => o.slug !== t.slug).map((o) => ({
        href: `/compress-video-to/${o.slug}`,
        label: `Compress video to ${o.label}`,
      }))}
      ownLevel={{ href: '/video-compressor', label: 'Choose your own quality' }}
    >
      <VideoCompressorTool targetBytes={t.bytes} targetLabel={t.label} />
    </SizeLanding>
  );
}
