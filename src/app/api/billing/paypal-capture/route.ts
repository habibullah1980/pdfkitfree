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
    const { orderId, planId, billingInterval } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required.' }, { status: 400 });
    }

    const captureResult = await PaymentGateway.capturePayPalOrder(orderId);
    if (!captureResult.success || !captureResult.data) {
      return NextResponse.json(
        { error: captureResult.error || 'Failed to capture PayPal order.' },
        { status: 400 }
      );
    }

    interface PayPalCaptureResponse {
      payer?: { payer_id?: string };
      purchase_units?: Array<{
        payments?: {
          captures?: Array<{
            id?: string;
            seller_receivable_breakdown?: {
              paypal_fee?: { value?: string };
            };
          }>;
        };
      }>;
    }

    const capture = captureResult.data as unknown as PayPalCaptureResponse;
    const captureUnit = capture.purchase_units?.[0]?.payments?.captures?.[0];
    const fee = parseFloat(captureUnit?.seller_receivable_breakdown?.paypal_fee?.value || '0');

    const updatedSub = PaymentGateway.applyVerifiedPayment({
      userId: session.user.id,
      planId: planId || 'pro',
      billingInterval: billingInterval || 'monthly',
      subscriptionId: orderId,
      customerId: capture.payer?.payer_id,
      transactionRef: captureUnit?.id || orderId,
      paymentMethod: 'PayPal Account',
      fee,
      provider: 'paypal',
    });

    return NextResponse.json({
      success: true,
      subscription: updatedSub,
      message: 'PayPal payment captured and subscription activated.',
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || 'PayPal capture failed.' }, { status: 500 });
  }
}
