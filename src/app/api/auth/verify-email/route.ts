import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server/session';
import { verifyUserEmail, findUserById, sanitizeUser } from '@/lib/server/auth-store';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Please log in to verify your email.' }, { status: 401 });
    }

    const body = await req.json();
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Please provide the 6-digit verification code.' }, { status: 400 });
    }

    const success = verifyUserEmail(session.user.id, code);
    if (!success) {
      return NextResponse.json({ error: 'Invalid or expired verification code.' }, { status: 400 });
    }

    const updatedUser = findUserById(session.user.id);
    return NextResponse.json({
      success: true,
      message: 'Email verified successfully!',
      user: updatedUser ? sanitizeUser(updatedUser) : null,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || 'Verification failed.' }, { status: 500 });
  }
}
