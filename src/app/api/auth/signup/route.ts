import { NextRequest, NextResponse } from 'next/server';
import { createUser, sanitizeUser } from '@/lib/server/auth-store';
import { setSessionCookie } from '@/lib/server/session';
import { emailAdapter } from '@/lib/server/email-adapter';

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Browser';

    const body = await req.json();
    const { name, email, password, phone } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'Please enter a valid full name.' }, { status: 400 });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    const newUser = createUser(name, email, password, phone);
    await setSessionCookie(newUser.id, newUser.email, ip, userAgent);

    // Send verification email via configured provider
    const origin = req.nextUrl.origin || 'http://localhost:3000';
    const verifyLink = `${origin}/verify-email?code=${newUser.verificationCode}`;
    await emailAdapter.sendVerificationEmail(newUser.email, newUser.verificationCode, verifyLink);

    return NextResponse.json({
      success: true,
      user: sanitizeUser(newUser),
      message: 'Account created successfully. A verification code has been dispatched.',
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || 'Failed to sign up.' }, { status: 400 });
  }
}
