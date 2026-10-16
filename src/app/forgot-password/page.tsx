import { Metadata } from 'next';
import ForgotPasswordClient from './page-client';

export const metadata: Metadata = {
  title: 'Reset Password | PDFKitFree',
  description: 'Reset your PDFKitFree account password securely.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />;
}
