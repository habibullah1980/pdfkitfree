import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server/session';
import { getBillingTransactions } from '@/lib/server/auth-store';

export async function GET() {
  const session = await getServerSession();
  if (!session || session.user.role !== 'superadmin') {
    return NextResponse.json({ error: 'Unauthorized. Super Admin only.' }, { status: 403 });
  }

  const transactions = getBillingTransactions();
  return NextResponse.json({ success: true, transactions });
}
