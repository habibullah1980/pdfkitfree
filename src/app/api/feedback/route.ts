import { NextRequest, NextResponse } from 'next/server';
import { FEEDBACK_LIMITS, sniffImageType, validateFeedback } from '@/lib/feedback-validation';
import { getFeedbackStore, hashIp } from '@/lib/server/feedback-store';
import { feedbackBurstLimiter } from '@/lib/server/burst-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Per-instance burst limit (fast, no database); the database limit below works across instances.
const HOURLY_MAX = 10;

function clientIp(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '0.0.0.0';
}

const ok = () => NextResponse.json({ success: true, message: 'Thank you! Your feedback has been received.' }, { status: 201 });
const fail = (status: number, error: string, field?: string) => NextResponse.json({ error, field }, { status });

export async function POST(req: NextRequest) {
  try {
    const type = req.headers.get('content-type') || '';
    const length = Number(req.headers.get('content-length') || 0);
    if (length > FEEDBACK_LIMITS.screenshotMaxBytes + 64 * 1024) return fail(413, 'That upload is too large. Screenshots can be up to 2 MB.');

    let fields: Record<string, unknown> = {};
    let shot: File | null = null;
    if (type.includes('multipart/form-data')) {
      const form = await req.formData();
      fields = Object.fromEntries(Array.from(form.entries()).filter(([, v]) => typeof v === 'string'));
      const f = form.get('screenshot');
      if (f && typeof f !== 'string' && f.size > 0) shot = f;
    } else if (type.includes('application/json')) {
      fields = await req.json();
    } else {
      return fail(415, 'Unsupported request format.');
    }

    const result = validateFeedback(fields as never);
    if (!result.ok) {
      if (result.spam) return ok(); // don't tell bots they were caught
      return fail(400, result.error, result.field);
    }

    let screenshot: { b64: string; type: string; bytes: number } | null = null;
    if (shot) {
      if (shot.size > FEEDBACK_LIMITS.screenshotMaxBytes) return fail(400, 'Screenshots can be up to 2 MB.', 'screenshot');
      const bytes = new Uint8Array(await shot.arrayBuffer());
      const real = sniffImageType(bytes);
      if (!real) return fail(400, 'Screenshots must be PNG, JPG or WebP images.', 'screenshot');
      screenshot = { b64: Buffer.from(bytes).toString('base64'), type: real, bytes: bytes.length };
    }

    const ip = clientIp(req);
    if (!feedbackBurstLimiter.allowed(ip)) return fail(429, 'You have sent a lot of feedback in a short time. Please try again in a few minutes.');

    const store = getFeedbackStore();
    if (!store) {
      console.error('[feedback] DATABASE_URL is not configured; cannot store feedback.');
      return fail(503, 'Feedback is temporarily unavailable. Please email support@pdfkitfree.online instead.');
    }
    const ipHash = hashIp(ip);
    if ((await store.countRecent(ipHash, 60)) >= HOURLY_MAX) {
      return fail(429, 'You have sent a lot of feedback in the last hour. Please try again later.');
    }
    if (await store.isDuplicate(ipHash, result.value.message)) return ok(); // same text twice: keep one

    feedbackBurstLimiter.record(ip);
    await store.insert({
      ...result.value,
      userAgent: (req.headers.get('user-agent') || '').slice(0, 300) || null,
      screenshot,
      ipHash,
    });
    return ok();
  } catch (err) {
    console.error('[feedback] failed to save feedback:', (err as Error).message);
    return fail(500, 'We could not save your feedback right now. Please try again in a moment.');
  }
}
