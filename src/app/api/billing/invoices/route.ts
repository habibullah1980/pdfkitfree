import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server/session';
import { getTransactionsForUser } from '@/lib/server/auth-store';

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  try {
    const invoices = getTransactionsForUser(session.user.id);
    return NextResponse.json({ success: true, invoices });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || 'Failed to fetch invoices.' }, { status: 500 });
  }
}
