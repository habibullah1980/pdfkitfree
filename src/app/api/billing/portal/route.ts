import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server/session';
import { PaymentGateway } from '@/lib/server/payment-provider';

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  try {
    const origin = req.headers.get('origin') || 'http://localhost:3000';
    const customerId = session.user.subscription?.customerId;

    if (!customerId) {
      return NextResponse.json(
        { error: 'No active Stripe customer ID associated with this account.' },
        { status: 400 }
      );
    }

    const portalUrl = await PaymentGateway.createCustomerPortalSession(
      customerId,
      `${origin}/settings?tab=billing`
    );

    if (!portalUrl) {
      return NextResponse.json(
        {
          error:
            'Stripe Customer Portal is only available for live Stripe subscriptions with configured API keys.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, url: portalUrl });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || 'Portal session failed.' }, { status: 500 });
  }
}
