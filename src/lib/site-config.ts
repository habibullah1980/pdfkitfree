const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.pdfkitfree.online').replace(/\/+$/, '');
const appDomain = process.env.NEXT_PUBLIC_DOMAIN || appUrl.replace(/^https?:\/\//, '');

export const SITE_CONFIG = {
  name: 'pdfkitfree',
  domain: appDomain,
  url: appUrl,
  description: '38 free PDF tools that run in your browser: merge, compress, split, sign, convert to Word or JPG, OCR and more. No sign-up, no watermark, nothing uploaded.',
  ogImage: `${appUrl}/opengraph-image`,
  creator: '@pdfkitfree',
  navLinks: [
    { label: 'PDF Tools', href: '/tools' },
    { label: 'AI Assistant', href: '/ai' },
    { label: 'Video Compressor', href: '/video-compressor' },
    { label: 'NDA & eSign', href: '/nda-esign' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Blog', href: '/blog' },
  ],
  footerLinks: {
    tools: [
      { label: 'Merge PDF', href: '/tools/merge-pdf' },
      { label: 'Sign PDF', href: '/tools/sign-pdf' },
      { label: 'All PDF Tools', href: '/tools' },
      { label: 'Video Compressor', href: '/video-compressor' },
      { label: 'NDA & eSign', href: '/nda-esign' },
      { label: 'NDA Generator', href: '/nda-generator' },
    ],
    company: [
      { label: 'Pricing Plans', href: '/pricing' },
      { label: 'About Us', href: '/about' },
      { label: 'Blog', href: '/blog' },
      { label: 'Contact Support', href: '/contact' },
    ],
    popular: [
      { label: 'Compress PDF to 100 KB', href: '/compress-pdf-to/100kb' },
      { label: 'Compress PDF to 200 KB', href: '/compress-pdf-to/200kb' },
      { label: 'Compress PDF to 500 KB', href: '/compress-pdf-to/500kb' },
      { label: 'Compress PDF to 1 MB', href: '/compress-pdf-to/1mb' },
      { label: 'Make a scanned PDF searchable', href: '/tools/ocr-pdf' },
      { label: 'Redact a PDF', href: '/tools/redact-pdf' },
    ],
    legal: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Security Overview', href: '/about#security' },
    ],
  },
};
