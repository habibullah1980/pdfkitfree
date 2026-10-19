import { Metadata } from 'next';
import { SITE_CONFIG } from '@/lib/site-config';
import AiAssistantClient from './page-client';

export const metadata: Metadata = {
  title: { absolute: 'AI PDF Document Assistant & Chat | PDFKitFree' },
  description:
    'Private AI document assistant. Ask questions, extract key terms, summarize lengthy contracts, and compare PDF revisions securely with zero cloud storage.',
  alternates: {
    canonical: '/ai',
  },
  openGraph: {
    title: 'AI PDF Document Assistant & Chat | PDFKitFree',
    description:
      'Summarize contracts, extract clauses, and converse with documents securely in your browser.',
    url: `${SITE_CONFIG.url}/ai`,
    type: 'website',
  },
};

export default function AiAssistantPage() {
  return <AiAssistantClient />;
}
