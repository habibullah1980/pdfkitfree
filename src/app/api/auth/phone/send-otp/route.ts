import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server/session';
import { findUserById, setPhoneOtpForUser } from '@/lib/server/auth-store';
import { smsAdapter, SmsProviderAdapter } from '@/lib/server/sms-adapter';

// In-memory rate limiting map: phone -> lastRequestedTimestamp
const rateLimitMap = new Map<string, number>();

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const user = findUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User account not found.' }, { status: 404 });
    }

    const body = await req.json();
    const { phone } = body;

    const validation = SmsProviderAdapter.normalizePhoneNumber(phone || user.phone || '');
    if (!validation.valid || !validation.normalized) {
      return NextResponse.json({ error: validation.error || 'Invalid phone number.' }, { status: 400 });
    }

    const normalizedPhone = validation.normalized;

    // Rate limit: 60 seconds between resends
    const lastSent = rateLimitMap.get(normalizedPhone);
    const now = Date.now();
    if (lastSent && now - lastSent < 60 * 1000) {
      const waitSec = Math.ceil((60000 - (now - lastSent)) / 1000);
      return NextResponse.json(
        { error: `Please wait ${waitSec} seconds before requesting a new OTP.` },
        { status: 429 }
      );
    }

    // Generate random 6-digit code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store hash & expiry in user record
    setPhoneOtpForUser(user.id, normalizedPhone, otpCode);
    rateLimitMap.set(normalizedPhone, now);

    // Dispatch via SMS Adapter
    const smsResult = await smsAdapter.sendOtp(normalizedPhone, otpCode);

    return NextResponse.json({
      success: true,
      message: 'One-time security code dispatched via SMS.',
      provider: smsResult.provider,
      devOtpPreview: smsResult.devOtpPreview, // Displayed in sandbox for quick testing
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || 'Failed to dispatch phone OTP.' }, { status: 500 });
  }
}
