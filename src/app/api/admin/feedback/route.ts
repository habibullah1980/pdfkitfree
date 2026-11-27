import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/server/admin-guard';
import { FEEDBACK_CATEGORIES, FEEDBACK_STATUSES, getFeedbackStore, type FeedbackCategory, type FeedbackStatus } from '@/lib/server/feedback-store';
import { cleanText } from '@/lib/feedback-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { denied } = await requireSuperAdmin();
  if (denied) return denied;
  const store = getFeedbackStore();
  if (!store) return NextResponse.json({ error: 'The database is not configured.' }, { status: 503 });
  const sp = new URL(req.url).searchParams;
  const status = sp.get('status') as FeedbackStatus | null;
  const category = sp.get('category') as FeedbackCategory | null;
  const page = Math.max(1, Number(sp.get('page')) || 1);
  const result = await store.list({
    status: status && FEEDBACK_STATUSES.includes(status) ? status : undefined,
    category: category && FEEDBACK_CATEGORIES.includes(category) ? category : undefined,
    important: sp.get('important') === '1',
    search: (sp.get('q') || '').slice(0, 100) || undefined,
    limit: 25,
    offset: (page - 1) * 25,
  });
  return NextResponse.json({ success: true, ...result, page, pageSize: 25 }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(req: NextRequest) {
  const { denied } = await requireSuperAdmin();
  if (denied) return denied;
  const store = getFeedbackStore();
  if (!store) return NextResponse.json({ error: 'The database is not configured.' }, { status: 503 });
  let body: { id?: unknown; status?: unknown; important?: unknown; adminNote?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'Invalid feedback id.' }, { status: 400 });
  const patch: { status?: FeedbackStatus; important?: boolean; adminNote?: string | null } = {};
  if (body.status !== undefined) {
    if (!FEEDBACK_STATUSES.includes(body.status as FeedbackStatus)) return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
    patch.status = body.status as FeedbackStatus;
  }
  if (body.important !== undefined) {
    if (typeof body.important !== 'boolean') return NextResponse.json({ error: 'Invalid value.' }, { status: 400 });
    patch.important = body.important;
  }
  if (body.adminNote !== undefined) {
    const note = body.adminNote === null ? '' : cleanText(String(body.adminNote));
    if (note.length > 2000) return NextResponse.json({ error: 'Notes can be up to 2000 characters.' }, { status: 400 });
    patch.adminNote = note || null;
  }
  const row = await store.update(id, patch);
  if (!row) return NextResponse.json({ error: 'Feedback not found or nothing to change.' }, { status: 404 });
  return NextResponse.json({ success: true, feedback: row });
}
