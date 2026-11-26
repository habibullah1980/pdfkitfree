import { Metadata } from 'next';
import HomePageClient from './page-client';

export const metadata: Metadata = {
  title: { absolute: 'Free PDF Tools Online: Merge, Compress, Sign & Convert | PDFKitFree' },
  description:
    '38 free PDF tools that run in your browser: merge, compress, split, sign, convert to Word or JPG, OCR and more. No sign-up, no watermark, nothing uploaded.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Free PDF Tools Online: Merge, Compress, Sign & Convert | PDFKitFree',
    description:
      '38 free PDF tools that run in your browser: merge, compress, split, sign, convert to Word or JPG, OCR and more. No sign-up, no watermark, nothing uploaded.',
    url: 'https://www.pdfkitfree.online',
    siteName: 'PDFKitFree',
    type: 'website',
  },
};

export default function HomePage() {
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'PDFKitFree',
    alternateName: ['pdfkitfree', 'PDFKit Free', 'PDF Kit Free'],
    url: 'https://www.pdfkitfree.online',
    description:
      'Free PDF tools that run in your browser: merge, compress, sign, convert and OCR without uploading files.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://www.pdfkitfree.online/?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'PDFKitFree',
    url: 'https://www.pdfkitfree.online',
    logo: 'https://www.pdfkitfree.online/logo.png',
    sameAs: [],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <HomePageClient />
    </>
  );
}
