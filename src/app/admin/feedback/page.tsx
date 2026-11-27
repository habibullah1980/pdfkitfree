import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from '@/lib/server/session';
import FeedbackAdminClient from './page-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'User Feedback | Admin | PDFKitFree',
  robots: { index: false, follow: false },
};

/** Checked on the server: only the super admin ever receives this page. */
export default async function FeedbackAdminPage() {
  const session = await getServerSession();
  if (!session) redirect('/login?returnUrl=%2Fadmin%2Ffeedback');
  if (session.user.role !== 'superadmin') notFound();
  return <FeedbackAdminClient />;
}
