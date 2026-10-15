import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server/session';
import {
  findUserById,
  sanitizeUser,
  verifyPassword,
  hashPassword,
} from '@/lib/server/auth-store';

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

    return NextResponse.json({ success: true, user: sanitizeUser(user) });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || 'Failed to fetch profile.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
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
    const { name, phone, currentPassword, newPassword } = body;

    // Password change requires verification of current password
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Current password is required to change password.' },
          { status: 400 }
        );
      }
      const isValid = verifyPassword(currentPassword, user.passwordHash, user.salt);
      if (!isValid) {
        return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
      }
      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: 'New password must be at least 8 characters long.' },
          { status: 400 }
        );
      }
      const { hash, salt } = hashPassword(newPassword);
      user.passwordHash = hash;
      user.salt = salt;
    }

    if (name && typeof name === 'string' && name.trim().length >= 2) {
      user.name = name.trim();
    }

    if (phone !== undefined) {
      // If phone changed, mark phone as unverified
      if (user.phone !== phone) {
        user.phone = phone ? phone.trim() : undefined;
        if (user.phoneConfig) {
          user.phoneConfig.verified = false;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Account settings updated successfully.',
      user: sanitizeUser(user),
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || 'Failed to update profile.' }, { status: 500 });
  }
}
