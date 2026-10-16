import { Metadata } from 'next';
import SettingsClient from './page-client';

export const metadata: Metadata = {
  title: 'Account Settings & Security | PDFKitFree',
  description: 'Manage your profile, MFA security, verified phone number, active sessions, and data exports.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AccountSettingsPage() {
  return <SettingsClient />;
}
