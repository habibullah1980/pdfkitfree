import { Metadata } from 'next';
import { VideoToMp3Tool } from '@/components/tools/VideoToMp3Tool';
import { SizeLanding } from '@/components/landing/SizeLanding';
import { SITE_CONFIG } from '@/lib/site-config';
import { otherImageTools } from '@/lib/image-tool-links';

const PATH = '/video-to-mp3';
const title = 'Video to MP3 Converter: Free, No Upload | PDFKitFree';
const description =
  'Extract the audio from an MP4, MOV or WebM video and save it as MP3. Free, no sign-up, and the video is converted in your browser, never uploaded.';

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  keywords: ['video to mp3', 'mp4 to mp3', 'extract audio from video', 'convert video to audio', 'mov to mp3'],
  alternates: { canonical: PATH },
  openGraph: { title, description, url: `${SITE_CONFIG.url}${PATH}`, type: 'website' },
};

export default function VideoToMp3Page() {
  return (
    <SizeLanding
      heading="Video to MP3 Converter"
      intro="Save the sound from a video as an MP3: a talk, a lesson, a voice note or a song from your own recording. Pick a quality, add the video, and download."
      path={PATH}
      privacyNote="Your video stays on your device"
      breadcrumbs={[{ label: 'Video to MP3', href: PATH }]}
      steps={[
        ['Pick a quality', '192 kbps sounds great for most things. Choose 320 kbps for music.'],
        ['Add your video', 'MP4, MOV or WebM up to 500 MB, from your phone or computer.'],
        ['Listen and download', 'Play the MP3 right on the page, then save it.'],
      ]}
      faqs={[
        {
          q: 'Is my video uploaded?',
          a: 'No. Your browser reads the sound track and makes the MP3 on your own device.',
        },
        {
          q: 'Which videos work?',
          a: 'Most MP4, MOV and WebM files from phones, cameras and screen recorders. If a video uses an unusual audio format your browser cannot read, we tell you instead of making an empty file.',
        },
        {
          q: 'Can I convert a YouTube link?',
          a: 'No. This tool works with video files you already have. Downloading from YouTube is against its terms of service.',
        },
        {
          q: 'Why is there a 500 MB limit?',
          a: 'The whole sound track is held in your device memory while converting. The limit keeps phones and older computers from running out of memory.',
        },
      ]}
      othersTitle="More free tools"
      others={otherImageTools(PATH)}
    >
      <VideoToMp3Tool />
    </SizeLanding>
  );
}
