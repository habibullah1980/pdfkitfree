import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server/session';
import {
  getPlatformSettingsAdmin,
  updatePlatformSettingsAdmin,
} from '@/lib/server/auth-store';

export async function GET() {
  const session = await getServerSession();
  if (!session || session.user.role !== 'superadmin') {
    return NextResponse.json({ error: 'Unauthorized. Super Admin only.' }, { status: 403 });
  }

  const settings = getPlatformSettingsAdmin();
  return NextResponse.json({ success: true, settings });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session || session.user.role !== 'superadmin') {
    return NextResponse.json({ error: 'Unauthorized. Super Admin only.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const updated = updatePlatformSettingsAdmin(body);
    return NextResponse.json({ success: true, settings: updated });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || 'Failed to update settings.' }, { status: 500 });
  }
}
