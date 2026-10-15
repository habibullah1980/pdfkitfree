import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server/session';
import { getPlansConfig, PlanTier } from '@/lib/server/auth-store';
import { PaymentGateway, PaymentMethodChoice } from '@/lib/server/payment-provider';

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Authentication required to subscribe.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { planId, interval, provider } = body as {
      planId: PlanTier;
      interval: 'monthly' | 'yearly';
      provider?: PaymentMethodChoice;
    };

    if (!planId || !['free', 'pro', 'business'].includes(planId)) {
      return NextResponse.json({ error: 'Invalid plan selected.' }, { status: 400 });
    }

    const plans = getPlansConfig();
    const plan = plans.find((p) => p.id === planId);
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found.' }, { status: 404 });
    }

    const amount = interval === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
    const origin = req.headers.get('origin') || 'http://localhost:3000';

    const checkout = await PaymentGateway.createCheckoutSession({
      userId: session.user.id,
      userEmail: session.user.email,
      planId,
      billingInterval: interval || 'monthly',
      amount,
      preferredProvider: provider || 'stripe',
      successUrl: `${origin}/pricing?status=success&plan=${planId}`,
      cancelUrl: `${origin}/pricing?status=cancelled`,
    });

    const isSandbox =
      (provider === 'paypal' && !PaymentGateway.isPayPalConfigured()) ||
      (provider !== 'paypal' && !PaymentGateway.isStripeConfigured());

    return NextResponse.json({
      success: true,
      checkout,
      plan,
      provider: checkout.provider,
      isSandbox,
      gatewayStatuses: PaymentGateway.getProviderStatuses(),
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || 'Checkout failed.' }, { status: 500 });
  }
}
