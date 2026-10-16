import { Metadata } from 'next';
import VerifyEmailClient from './page-client';

export const metadata: Metadata = {
  title: 'Verify Your Email Address | PDFKitFree',
  description: 'Enter your 6-digit verification code to confirm your email address.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function VerifyEmailPage() {
  return <VerifyEmailClient />;
}
