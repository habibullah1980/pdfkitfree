import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server/session';
import { refreshVerificationCode } from '@/lib/server/auth-store';
import { emailAdapter } from '@/lib/server/email-adapter';

const resendThrottleMap = new Map<string, number>();

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: 60s per user
    const lastResend = resendThrottleMap.get(session.user.id);
    const now = Date.now();
    if (lastResend && now - lastResend < 60 * 1000) {
      const waitSec = Math.ceil((60000 - (now - lastResend)) / 1000);
      return NextResponse.json(
        { error: `Please wait ${waitSec} seconds before requesting a new verification email.` },
        { status: 429 }
      );
    }

    const newCode = refreshVerificationCode(session.user.id);
    if (!newCode) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    resendThrottleMap.set(session.user.id, now);

    const origin = req.nextUrl.origin || 'http://localhost:3000';
    const verifyLink = `${origin}/verify-email?code=${newCode}`;
    await emailAdapter.sendVerificationEmail(session.user.email, newCode, verifyLink);

    return NextResponse.json({
      success: true,
      message: 'New verification code has been dispatched.',
      codePreview: newCode, // displayed for test convenience
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || 'Failed to resend code.' }, { status: 500 });
  }
}
