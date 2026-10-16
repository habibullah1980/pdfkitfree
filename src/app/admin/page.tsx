import { Metadata } from 'next';
import AdminClient from './page-client';

export const metadata: Metadata = {
  title: 'Super Admin Security Portal | PDFKitFree',
  description: 'Internal platform administration and audit control dashboard.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return <AdminClient />;
}
