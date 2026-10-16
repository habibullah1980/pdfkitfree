import { Metadata } from 'next';
import { SITE_CONFIG } from '@/lib/site-config';
import NdaGeneratorClient from './page-client';

export const metadata: Metadata = {
  title: 'Free Mutual NDA Generator & Online eSign Tool | PDFKitFree',
  description:
    'Generate customized mutual Non-Disclosure Agreements (NDAs) online and sign them electronically. 100% private in-browser legal agreement creation.',
  alternates: {
    canonical: '/nda-generator',
  },
  openGraph: {
    title: 'Free Mutual NDA Generator - Draft & Sign NDAs | PDFKitFree',
    description:
      'Create and electronically sign standard mutual non-disclosure agreements in your browser without cloud uploads.',
    url: `${SITE_CONFIG.url}/nda-generator`,
    type: 'website',
  },
};

export default function NdaGeneratorPage() {
  return <NdaGeneratorClient />;
}
