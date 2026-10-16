import { NextRequest, NextResponse } from 'next/server';
import {
  findUserByEmail,
  verifyPassword,
  sanitizeUser,
  recordUserLogin,
  getPlatformSettingsAdmin,
} from '@/lib/server/auth-store';
import { setSessionCookie } from '@/lib/server/session';
import { MfaService } from '@/lib/server/mfa-service';

// In-memory rate limiting map for login attempts: ip -> { count, lastAttempt }
const loginAttemptMap = new Map<string, { count: number; lastAttempt: number }>();

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Browser';

    // Brute-force rate limiting: 5 failed attempts per 5 minutes per IP
    const attemptInfo = loginAttemptMap.get(ip);
    const now = Date.now();
    if (attemptInfo && attemptInfo.count >= 5 && now - attemptInfo.lastAttempt < 5 * 60 * 1000) {
      const waitMin = Math.ceil((5 * 60 * 1000 - (now - attemptInfo.lastAttempt)) / 60000);
      return NextResponse.json(
        { error: `Too many failed login attempts. Please wait ${waitMin} minutes before retrying.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { email, password, mfaCode } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const user = findUserByEmail(email);
    if (!user) {
      // Record failed attempt
      const current = loginAttemptMap.get(ip) || { count: 0, lastAttempt: now };
      loginAttemptMap.set(ip, { count: current.count + 1, lastAttempt: now });
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const isValid = verifyPassword(password, user.passwordHash, user.salt);
    if (!isValid) {
      const current = loginAttemptMap.get(ip) || { count: 0, lastAttempt: now };
      loginAttemptMap.set(ip, { count: current.count + 1, lastAttempt: now });
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    // Reset failed counter upon successful password check
    loginAttemptMap.delete(ip);

    // Production Safety: Strictly disable demo account on production website by default
    if (user.email.toLowerCase() === 'demo@pdfkitfree.com' && process.env.ENABLE_DEMO_ACCOUNT !== 'true') {
      return NextResponse.json(
        {
          error: 'The demo account is disabled on the production website. Demo credentials are restricted to authorized testing environments.',
        },
        { status: 403 }
      );
    }

    if (user.accountStatus === 'suspended') {
      return NextResponse.json(
        {
          error: `Your account is temporarily suspended. ${user.suspendedReason ? 'Reason: ' + user.suspendedReason : 'Please contact support.'}`,
        },
        { status: 403 }
      );
    }

    // Check Multi-Factor Authentication requirement
    const platformSettings = getPlatformSettingsAdmin();
    const isSuperAdmin = user.role === 'superadmin';
    const isMfaEnforced = user.mfa?.enabled || (isSuperAdmin && platformSettings.requireMfaForAdmin);

    if (isMfaEnforced) {
      if (!mfaCode) {
        return NextResponse.json({
          requiresMfa: true,
          message: 'Multi-Factor Authentication code required.',
        });
      }

      // Verify TOTP code or recovery code
      let mfaValid = false;
      if (user.mfa?.secret) {
        mfaValid = MfaService.verifyToken(user.mfa.secret, mfaCode);
      }
      if (!mfaValid && user.mfa?.recoveryCodes?.includes(mfaCode.trim().toUpperCase())) {
        mfaValid = true;
      }
      // Super admin temporary bypass for initial bootstrap if no secret set
      if (!mfaValid && isSuperAdmin && !user.mfa?.secret && mfaCode === '123456') {
        mfaValid = true;
      }

      if (!mfaValid) {
        return NextResponse.json(
          { error: 'Invalid 6-digit authenticator code or recovery key.' },
          { status: 401 }
        );
      }
    }

    recordUserLogin(user.id, ip, userAgent);
    await setSessionCookie(user.id, user.email, ip, userAgent);

    return NextResponse.json({
      success: true,
      user: sanitizeUser(user),
      message: 'Logged in successfully.',
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || 'Login failed.' }, { status: 500 });
  }
}
