import { NextRequest, NextResponse } from 'next/server';
import { resetUserPassword } from '@/lib/server/auth-store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, newPassword } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Valid reset token is required.' }, { status: 400 });
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters.' }, { status: 400 });
    }

    const success = resetUserPassword(token, newPassword);
    if (!success) {
      return NextResponse.json({ error: 'Password reset token is invalid or has expired.' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Password has been successfully updated. You may now log in.',
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || 'Failed to reset password.' }, { status: 500 });
  }
}
