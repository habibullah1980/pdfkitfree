import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server/session';
import { getActivityLogs } from '@/lib/server/auth-store';

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session || session.user.role !== 'superadmin') {
    return NextResponse.json({ error: 'Unauthorized. Super Admin only.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || undefined;
  const search = searchParams.get('search') || undefined;

  const logs = getActivityLogs(category, search);
  return NextResponse.json({ success: true, logs });
}
