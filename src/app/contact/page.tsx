import { Metadata } from 'next';
import { SITE_CONFIG } from '@/lib/site-config';
import ContactClient from './page-client';

export const metadata: Metadata = {
  title: { absolute: 'Contact Support & Feedback | PDFKitFree' },
  description:
    'Get in touch with the PDFKitFree engineering and customer support team. Submit feature requests, questions, or enterprise inquiries.',
  alternates: {
    canonical: '/contact',
  },
  openGraph: {
    title: 'Contact Support & Feedback | PDFKitFree',
    description:
      'We welcome feedback, questions, and feature suggestions for our private PDF utility platform.',
    url: `${SITE_CONFIG.url}/contact`,
    type: 'website',
  },
};

export default function ContactPage() {
  return <ContactClient />;
}
