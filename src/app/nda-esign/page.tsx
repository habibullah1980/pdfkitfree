import { Metadata } from 'next';
import { SITE_CONFIG } from '@/lib/site-config';
import NdaEsignClient from './page-client';

export const metadata: Metadata = {
  title: 'NDA & eSign Workspace - Legally Binding Electronic Signatures',
  description:
    'Secure, legally binding electronic signatures and mutual non-disclosure agreement workflow. Sign, request, and verify contracts privately in your browser.',
  alternates: {
    canonical: '/nda-esign',
  },
  openGraph: {
    title: 'NDA & eSign SaaS Workspace | PDFKitFree',
    description:
      'Manage legal agreements and electronic signatures with zero third-party cloud data risks.',
    url: `${SITE_CONFIG.url}/nda-esign`,
    type: 'website',
  },
};

export default function NdaEsignPage() {
  return <NdaEsignClient />;
}
