import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server/session';
import { findUserById, enableUserMfa, disableUserMfa, sanitizeUser } from '@/lib/server/auth-store';
import { MfaService } from '@/lib/server/mfa-service';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const user = findUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const body = await req.json();
    const { token, action = 'enable' } = body;

    if (action === 'disable') {
      disableUserMfa(user.id);
      const updated = findUserById(user.id);
      return NextResponse.json({
        success: true,
        message: 'MFA has been disabled.',
        user: updated ? sanitizeUser(updated) : null,
      });
    }

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Please enter the 6-digit code from your authenticator app.' }, { status: 400 });
    }

    const secret = user.mfa?.secret;
    if (!secret) {
      return NextResponse.json({ error: 'MFA setup has not been initiated. Please start setup first.' }, { status: 400 });
    }

    const isValid = MfaService.verifyToken(secret, token);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid verification code. Please check your authenticator clock.' }, { status: 400 });
    }

    enableUserMfa(user.id);
    const updated = findUserById(user.id);

    return NextResponse.json({
      success: true,
      message: 'Multi-Factor Authentication enabled successfully.',
      user: updated ? sanitizeUser(updated) : null,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || 'MFA verification failed.' }, { status: 500 });
  }
}
