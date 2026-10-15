import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server/session';
import { PaymentGateway } from '@/lib/server/payment-provider';

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Verification token is required.' }, { status: 400 });
    }

    const verification = PaymentGateway.verifyAndProcessEvent(token);
    if (!verification.isValid || !verification.payload) {
      return NextResponse.json(
        { error: verification.error || 'Payment verification failed.' },
        { status: 400 }
      );
    }

    // Verify user matches token user
    if (verification.payload.userId !== session.user.id) {
      return NextResponse.json({ error: 'User mismatch during verification.' }, { status: 403 });
    }

    const updatedSub = PaymentGateway.applyVerifiedPayment(verification.payload);

    return NextResponse.json({
      success: true,
      subscription: updatedSub,
      message: `Successfully upgraded to ${verification.payload.planId.toUpperCase()} plan.`,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || 'Verification failed.' }, { status: 500 });
  }
}
