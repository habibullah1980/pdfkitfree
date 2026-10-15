import { NextRequest, NextResponse } from 'next/server';
import { PaymentGateway } from '@/lib/server/payment-provider';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const stripeSignature = req.headers.get('stripe-signature');
    const paypalSig = req.headers.get('paypal-transmission-sig');
    const sandboxSig = req.headers.get('x-payment-signature');

    // 1. Stripe Webhook
    if (stripeSignature) {
      const verification = PaymentGateway.verifyStripeWebhook(rawBody, stripeSignature);
      if (!verification.isValid) {
        return NextResponse.json({ error: verification.error || 'Stripe verification failed' }, { status: 400 });
      }

      if (verification.payload) {
        PaymentGateway.applyVerifiedPayment({
          ...verification.payload,
          provider: 'stripe',
        });
      }

      return NextResponse.json({ received: true, provider: 'stripe', event: verification.eventType });
    }

    // 2. PayPal Webhook
    if (paypalSig) {
      const verification = await PaymentGateway.verifyPayPalWebhook(req.headers, rawBody);
      if (!verification.isValid) {
        return NextResponse.json({ error: verification.error || 'PayPal verification failed' }, { status: 400 });
      }

      if (verification.payload) {
        PaymentGateway.applyVerifiedPayment({
          ...verification.payload,
          provider: 'paypal',
        });
      }

      return NextResponse.json({ received: true, provider: 'paypal', event: verification.eventType });
    }

    // 3. Custom / Sandbox Webhook Signature
    if (sandboxSig) {
      const verification = PaymentGateway.verifyAndProcessEvent(rawBody, sandboxSig);
      if (!verification.isValid || !verification.payload) {
        return NextResponse.json({ error: verification.error || 'Signature error' }, { status: 400 });
      }

      PaymentGateway.applyVerifiedPayment(verification.payload);
      return NextResponse.json({ received: true, provider: 'sandbox', event: verification.eventType });
    }

    return NextResponse.json({ error: 'Missing recognized provider webhook signature header.' }, { status: 400 });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || 'Webhook processing error.' }, { status: 500 });
  }
}
