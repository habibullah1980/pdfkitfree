import { Metadata } from 'next';
import { SITE_CONFIG } from '@/lib/site-config';
import NdaGeneratorClient from './page-client';

export const metadata: Metadata = {
  title: { absolute: 'Sign an NDA PDF Online Free - Upload & eSign | PDFKitFree' },
  description:
    'Upload your NDA or any agreement as a PDF, draw or type your signature, place it on the page and download the signed copy. Free, right in your browser.',
  alternates: {
    canonical: '/nda-generator',
  },
  openGraph: {
    title: 'Sign an NDA PDF Online Free - Upload & eSign | PDFKitFree',
    description:
      'Create and electronically sign standard mutual non-disclosure agreements in your browser without cloud uploads.',
    url: `${SITE_CONFIG.url}/nda-generator`,
    type: 'website',
  },
};

export default function NdaGeneratorPage() {
  return <NdaGeneratorClient />;
}
