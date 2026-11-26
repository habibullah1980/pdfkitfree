import { Metadata } from 'next';
import { QrCodeTool } from '@/components/tools/QrCodeTool';
import { SizeLanding } from '@/components/landing/SizeLanding';
import { SITE_CONFIG } from '@/lib/site-config';
import { otherImageTools } from '@/lib/image-tool-links';

const PATH = '/qr-code-generator';
const title = 'Free QR Code Generator: No Sign-up, Never Expires | PDFKitFree';
const description =
  'Make a QR code for a website, Wi-Fi, text, email or phone number. Download PNG or SVG. Free, no sign-up, codes never expire and scans are not tracked.';

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  keywords: ['qr code generator', 'free qr code', 'wifi qr code', 'qr code for link', 'qr code no expiry', 'svg qr code'],
  alternates: { canonical: PATH },
  openGraph: { title, description, url: `${SITE_CONFIG.url}${PATH}`, type: 'website' },
};

export default function QrCodePage() {
  return (
    <SizeLanding
      heading="Free QR Code Generator"
      intro="Turn a link, Wi-Fi login, text, email or phone number into a QR code. Download it as a PNG for screens or an SVG for print. No account, and the code works forever."
      path={PATH}
      privacyNote="Made in your browser"
      breadcrumbs={[{ label: 'QR code generator', href: PATH }]}
      steps={[
        ['Choose what it opens', 'A website, Wi-Fi network, plain text, an email or a phone number.'],
        ['Type the details', 'The code updates as you type. Change colours and size if you like.'],
        ['Download', 'PNG up to 4096 px, or SVG that stays sharp at any print size.'],
      ]}
      faqs={[
        {
          q: 'Do these QR codes expire?',
          a: 'No. These are static codes: the link or text is stored inside the pattern itself, so there is no server in between that could stop working or ask you to pay later.',
        },
        {
          q: 'Can I change the link after printing?',
          a: 'No. Because the code is static, the content is fixed. If you need to change the destination later, make the code point to a page you control and update that page instead.',
        },
        {
          q: 'Is my Wi-Fi password sent anywhere?',
          a: 'No. The code is drawn by your browser on your device. Nothing you type is uploaded or saved by us.',
        },
        {
          q: 'Do you track who scans my code?',
          a: 'No. A static code opens the content directly, so there are no scan counts and no tracking.',
        },
        {
          q: 'Which format should I download?',
          a: 'PNG is best for websites, slides and messages. SVG is best for printing on flyers, menus, stickers and banners because it never gets blurry.',
        },
        {
          q: 'Why will my coloured code not scan?',
          a: 'Scanners need strong contrast. Keep the code dark and the background light. The tool warns you when the colours may be hard to read.',
        },
      ]}
      othersTitle="More free tools"
      others={otherImageTools(PATH)}
    >
      <QrCodeTool />
    </SizeLanding>
  );
}
