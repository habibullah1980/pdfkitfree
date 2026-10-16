import { Metadata } from 'next';
import HomePageClient from './page-client';

export const metadata: Metadata = {
  title: 'PDFKitFree - Fast, Secure & Private PDF Tools SaaS',
  description:
    'Free client-side PDF utility suite and electronic signature SaaS. Merge, split, compress, edit, convert, and sign PDF documents privately without cloud uploads.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'PDFKitFree - Fast, Secure & Private PDF Tools SaaS',
    description:
      'Free client-side PDF utility suite and electronic signature SaaS. 100% private in-browser document processing.',
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
      'Fast, private client-side PDF utilities, video compressor, and electronic document signature SaaS.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://www.pdfkitfree.online/tools?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'PDFKitFree',
    url: 'https://www.pdfkitfree.online',
    logo: 'https://www.pdfkitfree.online/og-image.png',
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
