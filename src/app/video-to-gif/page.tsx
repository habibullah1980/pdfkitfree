import { Metadata } from 'next';
import { VideoToGifTool } from '@/components/tools/VideoToGifTool';
import { SizeLanding } from '@/components/landing/SizeLanding';
import { SITE_CONFIG } from '@/lib/site-config';
import { otherImageTools } from '@/lib/image-tool-links';

const PATH = '/video-to-gif';
const title = 'Video to GIF Maker: Free, No Watermark | PDFKitFree';
const description =
  'Turn a clip from an MP4, MOV or WebM video into an animated GIF. Choose the start, length, size and smoothness. Free, no watermark, nothing uploaded.';

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  keywords: ['video to gif', 'mp4 to gif', 'gif maker', 'make gif from video', 'convert video to gif no watermark'],
  alternates: { canonical: PATH },
  openGraph: { title, description, url: `${SITE_CONFIG.url}${PATH}`, type: 'website' },
};

export default function VideoToGifPage() {
  return (
    <SizeLanding
      heading="Video to GIF Maker"
      intro="Pick the moment you want, up to 20 seconds, and turn it into a looping GIF for chats, slides, docs or social posts. No watermark."
      path={PATH}
      privacyNote="Your video stays on your device"
      breadcrumbs={[{ label: 'Video to GIF', href: PATH }]}
      steps={[
        ['Add your video', 'MP4, MOV or WebM from your phone or computer.'],
        ['Choose the clip', 'Set where it starts and how long it lasts, plus the size and smoothness.'],
        ['Make and download', 'Preview the GIF on the page, then save it.'],
      ]}
      faqs={[
        {
          q: 'Is there a watermark?',
          a: 'No. The GIF is exactly your clip, with nothing added.',
        },
        {
          q: 'Why is my GIF large?',
          a: 'GIF is an old format that stores every frame as a picture. Use fewer seconds, a smaller width or fewer frames per second for a smaller file.',
        },
        {
          q: 'Is my video uploaded?',
          a: 'No. Frames are read and the GIF is built in your browser on your own device.',
        },
        {
          q: 'Does the GIF have sound?',
          a: 'No. GIFs cannot hold sound. Use our Video to MP3 tool if you need the audio.',
        },
      ]}
      othersTitle="More free tools"
      others={otherImageTools(PATH)}
    >
      <VideoToGifTool />
    </SizeLanding>
  );
}
