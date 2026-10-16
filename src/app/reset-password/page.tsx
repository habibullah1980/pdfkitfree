import { Metadata } from 'next';
import ResetPasswordClient from './page-client';

export const metadata: Metadata = {
  title: 'Choose a New Password | PDFKitFree',
  description: 'Enter a new password for your PDFKitFree account.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
