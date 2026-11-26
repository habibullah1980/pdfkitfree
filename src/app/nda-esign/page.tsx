import { Metadata } from 'next';
import { SITE_CONFIG } from '@/lib/site-config';
import NdaEsignClient from './page-client';

export const metadata: Metadata = {
  title: { absolute: 'Free NDA Template & eSign - Create a Mutual NDA Online | PDFKitFree' },
  description:
    'Generate one-way or mutual non-disclosure agreements from editable templates and sign them electronically. Free account required.',
  alternates: {
    canonical: '/nda-esign',
  },
  openGraph: {
    title: 'Free NDA Template & eSign - Create a Mutual NDA Online | PDFKitFree',
    description:
      'Create and eSign NDAs online from free templates.',
    url: `${SITE_CONFIG.url}/nda-esign`,
    type: 'website',
  },
};

export default function NdaEsignPage() {
  return <NdaEsignClient />;
}
