import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server/session';
import { findUserById, setUserMfaSecret } from '@/lib/server/auth-store';
import { MfaService } from '@/lib/server/mfa-service';

export async function POST() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const user = findUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const { secret, otpauthUrl, recoveryCodes } = MfaService.generateSecret(user.email);

    // Save pending setup to user (not yet activated until verified)
    setUserMfaSecret(user.id, secret, recoveryCodes);

    return NextResponse.json({
      success: true,
      secret,
      otpauthUrl,
      recoveryCodes,
      message: 'Scan the authenticator barcode or enter the key into your authenticator app.',
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || 'MFA setup initialization failed.' }, { status: 500 });
  }
}
