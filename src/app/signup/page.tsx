import { Metadata } from 'next';
import SignupClient from './page-client';

export const metadata: Metadata = {
  title: 'Create Your Free Account | PDFKitFree',
  description: 'Sign up for a free PDFKitFree account to track NDA signing workflows and access advanced document features.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SignupPage() {
  return <SignupClient />;
}
