import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server/session';
import { getPlatformStatsAdmin } from '@/lib/server/auth-store';

export async function GET() {
  const session = await getServerSession();
  if (!session || session.user.role !== 'superadmin') {
    return NextResponse.json(
      { error: 'Forbidden. Super Administrator privileges required.' },
      { status: 403 }
    );
  }

  const stats = getPlatformStatsAdmin();
  return NextResponse.json({ success: true, stats });
}
