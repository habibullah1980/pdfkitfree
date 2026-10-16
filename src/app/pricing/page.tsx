import { Metadata } from 'next';
import { SITE_CONFIG } from '@/lib/site-config';
import PricingClient from './page-client';

export const metadata: Metadata = {
  title: 'Pricing Plans - Free & Pro PDF Tools | PDFKitFree',
  description:
    'Transparent pricing for individuals and teams. Use core PDF tools 100% free with client-side privacy, or upgrade to Pro for batch processing and AI document chat.',
  alternates: {
    canonical: '/pricing',
  },
  openGraph: {
    title: 'Pricing Plans - Free & Pro PDF SaaS | PDFKitFree',
    description:
      'Compare Free, Pro, and Business plans for fast, private PDF tools and electronic signatures.',
    url: `${SITE_CONFIG.url}/pricing`,
    type: 'website',
  },
};

export default function PricingPage() {
  return <PricingClient />;
}
