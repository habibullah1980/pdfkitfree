const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.pdfkitfree.online').replace(/\/+$/, '');
const appDomain = process.env.NEXT_PUBLIC_DOMAIN || appUrl.replace(/^https?:\/\//, '');

export const SITE_CONFIG = {
  name: 'pdfkitfree',
  domain: appDomain,
  url: appUrl,
  description: 'Fast, secure, browser-first PDF utility suite and electronic document workflows. Merge, split, edit, and sign PDFs privately without uploading your documents to third-party servers.',
  ogImage: `${appUrl}/og-image.png`,
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
      { label: 'All PDF Tools', href: '/tools' },
      { label: 'Video Compressor', href: '/video-compressor' },
      { label: 'NDA & eSign', href: '/nda-esign' },
      { label: 'Sign PDF', href: '/sign-pdf' },
      { label: 'NDA Generator', href: '/nda-generator' },
    ],
    company: [
      { label: 'Pricing Plans', href: '/pricing' },
      { label: 'About Us', href: '/about' },
      { label: 'Blog', href: '/blog' },
      { label: 'Contact Support', href: '/contact' },
    ],
    legal: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Security Overview', href: '/about#security' },
    ],
  },
};
