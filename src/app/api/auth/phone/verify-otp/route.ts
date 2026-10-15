import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server/session';
import { verifyPhoneOtpForUser, findUserById, sanitizeUser } from '@/lib/server/auth-store';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = await req.json();
    const { code } = body;

    if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code.trim())) {
      return NextResponse.json({ error: 'Please enter a valid 6-digit confirmation code.' }, { status: 400 });
    }

    const success = verifyPhoneOtpForUser(session.user.id, code.trim());
    if (!success) {
      return NextResponse.json({ error: 'Invalid or incorrect verification code.' }, { status: 400 });
    }

    const updated = findUserById(session.user.id);

    return NextResponse.json({
      success: true,
      message: 'Phone number verified successfully.',
      user: updated ? sanitizeUser(updated) : null,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || 'Verification failed.' }, { status: 400 });
  }
}
