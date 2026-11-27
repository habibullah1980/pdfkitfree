import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/server/admin-guard';
import { getFeedbackStore } from '@/lib/server/feedback-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { denied } = await requireSuperAdmin();
  if (denied) return denied;
  const store = getFeedbackStore();
  if (!store) return NextResponse.json({ error: 'The database is not configured.' }, { status: 503 });
  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
  const shot = await store.screenshot(id);
  if (!shot) return NextResponse.json({ error: 'No screenshot.' }, { status: 404 });
  return new NextResponse(new Uint8Array(shot.data), {
    headers: {
      'Content-Type': shot.type,
      'Content-Disposition': `inline; filename="feedback-${id}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    },
  });
}
