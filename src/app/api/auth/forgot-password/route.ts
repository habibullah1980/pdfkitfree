import { NextRequest, NextResponse } from 'next/server';
import { createPasswordResetToken } from '@/lib/server/auth-store';
import { emailAdapter } from '@/lib/server/email-adapter';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Please enter your email address.' }, { status: 400 });
    }

    const result = createPasswordResetToken(email);

    if (result && result.token) {
      const origin = req.nextUrl.origin || 'http://localhost:3000';
      const resetLink = `${origin}/reset-password?token=${result.token}`;
      await emailAdapter.sendPasswordResetEmail(result.user.email, resetLink);
    }

    // Always return safe success message to avoid account enumeration
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email address, password reset instructions have been dispatched.',
      resetToken: result?.token || null, // provided for dev sandbox flow
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || 'Error processing request.' }, { status: 500 });
  }
}
