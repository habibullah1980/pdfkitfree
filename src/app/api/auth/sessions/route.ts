import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server/session';
import { findUserById, revokeUserSessionById, revokeAllSessionsForUser } from '@/lib/server/auth-store';

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const user = findUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const sessions = user.activeSessions || [
      {
        id: 'curr-1',
        tokenHash: 'current',
        ip: user.lastLoginIp || '127.0.0.1',
        userAgent: 'Current Browser Session',
        createdAt: user.lastLoginAt || new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      },
    ];

    return NextResponse.json({ success: true, sessions });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || 'Failed to list sessions.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('id');
    const all = searchParams.get('all') === 'true';

    if (all) {
      revokeAllSessionsForUser(session.user.id);
      return NextResponse.json({ success: true, message: 'All active sessions have been signed out.' });
    }

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required.' }, { status: 400 });
    }

    revokeUserSessionById(session.user.id, sessionId);
    return NextResponse.json({ success: true, message: 'Session revoked successfully.' });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || 'Failed to revoke session.' }, { status: 500 });
  }
}
