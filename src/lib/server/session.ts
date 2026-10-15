import { cookies } from 'next/headers';
import crypto from 'crypto';
import { findUserById, sanitizeUser } from './auth-store';

const SESSION_COOKIE_NAME = 'fpk_session';
const SESSION_SECRET = process.env.AUTH_SECRET || 'freepdfkit-secure-session-key-2026-xyz';
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

interface SessionPayload {
  userId: string;
  email: string;
  exp: number;
}

function signPayload(payloadStr: string): string {
  const hmac = crypto.createHmac('sha256', SESSION_SECRET);
  hmac.update(payloadStr);
  return hmac.digest('hex');
}

export function createSessionToken(userId: string, email: string): string {
  const payload: SessionPayload = {
    userId,
    email,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  };
  const jsonStr = JSON.stringify(payload);
  const base64 = Buffer.from(jsonStr, 'utf-8').toString('base64url');
  const signature = signPayload(base64);
  return `${base64}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const [base64, signature] = token.split('.');
    if (!base64 || !signature) return null;

    const expectedSig = signPayload(base64);
    if (expectedSig !== signature) return null;

    const jsonStr = Buffer.from(base64, 'base64url').toString('utf-8');
    const payload = JSON.parse(jsonStr) as SessionPayload;

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(userId: string, email: string, ip?: string, userAgent?: string) {
  const token = createSessionToken(userId, email);
  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });

  const { registerUserSession } = await import('./auth-store');
  registerUserSession(userId, token, ip, userAgent);
}

export async function clearSessionCookie() {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const payload = verifySessionToken(token);
    if (payload) {
      const { revokeUserSessionById } = await import('./auth-store');
      revokeUserSessionById(payload.userId, token);
    }
  }

  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
}

export async function getServerSession() {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = verifySessionToken(token);
  if (!payload) return null;

  const user = findUserById(payload.userId);
  if (!user || user.isDeleted || user.accountStatus === 'suspended') return null;

  // Session revocation validation if activeSessions exists
  if (user.activeSessions && user.activeSessions.length > 0) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const hasSession = user.activeSessions.some((s) => s.tokenHash === tokenHash);
    if (!hasSession) {
      return null; // Session was explicitly revoked
    }
  }

  return {
    user: sanitizeUser(user),
  };
}
