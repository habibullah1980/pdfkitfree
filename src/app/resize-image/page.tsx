import { Metadata } from 'next';
import { ResizeImageTool } from '@/components/tools/ResizeImageTool';
import { SizeLanding } from '@/components/landing/SizeLanding';
import { SITE_CONFIG } from '@/lib/site-config';
import { otherImageTools } from '@/lib/image-tool-links';

const PATH = '/resize-image';
const title = 'Resize Image Online Free: Pixels, Percent, Instagram Sizes | PDFKitFree';
const description =
  'Resize a photo to exact pixels, a percentage, or Instagram, YouTube and passport sizes. Works with JPG, PNG, WebP and iPhone HEIC. Free and never uploaded.';

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  keywords: ['resize image', 'image resizer', 'resize photo', 'resize image to 1080x1080', 'change image size in pixels', 'resize image for instagram'],
  alternates: { canonical: PATH },
  openGraph: { title, description, url: `${SITE_CONFIG.url}${PATH}`, type: 'website' },
};

export default function ResizeImagePage() {
  return (
    <SizeLanding
      heading="Resize Image"
      intro="Change a picture's size in pixels or percent, or fit it to a ready-made size for Instagram, YouTube, LinkedIn or a passport photo. Works with iPhone HEIC photos too."
      path={PATH}
      privacyNote="Runs in your browser"
      breadcrumbs={[{ label: 'Resize image', href: PATH }]}
      steps={[
        ['Add your image', 'JPG, PNG, WebP, GIF or HEIC. Drag it in or pick it from your phone.'],
        ['Choose the size', 'Type exact pixels, use a percentage, or pick a social media or photo size.'],
        ['Download', 'Save as JPG, PNG or WebP. You see the new size before you download.'],
      ]}
      faqs={[
        {
          q: 'Will my image be stretched?',
          a: 'Not unless you want it to be. Proportions stay locked by default. Ready-made sizes fill the frame and trim the edges evenly instead of stretching.',
        },
        {
          q: 'How do I make a photo smaller in KB?',
          a: 'Making it smaller in pixels also makes the file smaller. If you need a specific limit such as 50 KB, use our Compress image to 50 KB tool, which finds the best quality that fits.',
        },
        {
          q: 'Can I make an image bigger?',
          a: 'Yes, up to 200% or any pixel size up to 12,000 px. Enlarging cannot add detail that was not there, so very large increases look soft.',
        },
        {
          q: 'Is my image uploaded?',
          a: 'No. Resizing happens in your browser on your own device.',
        },
      ]}
      othersTitle="More free tools"
      others={otherImageTools(PATH)}
    >
      <ResizeImageTool />
    </SizeLanding>
  );
}
