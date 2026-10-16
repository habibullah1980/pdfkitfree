import { Metadata } from 'next';
import LoginClient from './page-client';

export const metadata: Metadata = {
  title: 'Sign In to Your Account | PDFKitFree',
  description: 'Log in to your PDFKitFree account to manage active signing requests and custom document quotas.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginPage() {
  return <LoginClient />;
}
