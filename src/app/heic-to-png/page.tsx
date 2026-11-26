import { Metadata } from 'next';
import { HeicToJpgTool } from '@/components/tools/HeicToJpgTool';
import { SizeLanding } from '@/components/landing/SizeLanding';
import { SITE_CONFIG } from '@/lib/site-config';
import { otherImageTools } from '@/lib/image-tool-links';

const PATH = '/heic-to-png';
const title = 'HEIC to PNG Converter: Free, Batch, No Upload | PDFKitFree';
const description =
  'Convert iPhone HEIC photos to PNG for free. Convert up to 50 at once and download a zip. Photos are converted in your browser and never uploaded.';

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  keywords: ['heic to png', 'convert heic to png', 'iphone photo to png', 'heic converter', 'heif to png'],
  alternates: { canonical: PATH },
  openGraph: { title, description, url: `${SITE_CONFIG.url}${PATH}`, type: 'website' },
};

export default function HeicToPNGPage() {
  return (
    <SizeLanding
      heading="HEIC to PNG Converter"
      intro="iPhones save photos as HEIC, which many websites, Windows apps and forms do not accept. Convert them to PNG here, one photo or a whole batch, without uploading anything."
      path={PATH}
      privacyNote="Photos stay on your device"
      breadcrumbs={[{ label: 'HEIC to PNG', href: PATH }]}
      steps={[
        ['Add HEIC photos', 'Pick up to 50 photos from your phone or computer, or drag them in.'],
        ['We convert them', 'Each photo is decoded and saved as PNG right in your browser.'],
        ['Download', 'Save each photo, or download them all together as one zip file.'],
      ]}
      faqs={[
        {
          q: 'What is a HEIC file?',
          a: 'HEIC (or HEIF) is the photo format iPhones and iPads use by default. It saves space, but many websites and Windows programs cannot open it, so converting to PNG makes the photo work everywhere.',
        },
        {
          q: 'Are my photos uploaded?',
          a: 'No. Conversion happens in your browser. The first HEIC photo may take a few seconds while the converter loads, then the rest are quicker.',
        },
        {
          q: 'Will I lose quality?',
          a: 'PNG is lossless, so no detail is lost. PNG files are larger than JPG, so choose JPG if file size matters.',
        },
        {
          q: 'Is the location and camera data kept?',
          a: 'No. The converted file contains only the picture, without GPS location or camera details. That is safer for sharing online.',
        },
        {
          q: 'Can I convert to JPG instead?',
          a: 'Yes. Use the switch above the drop area to choose JPG.',
        },
      ]}
      othersTitle="More free tools"
      others={otherImageTools(PATH)}
    >
      <HeicToJpgTool defaultFormat="png" />
    </SizeLanding>
  );
}
