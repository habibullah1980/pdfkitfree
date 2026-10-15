import crypto from 'crypto';
import Stripe from 'stripe';
import { PlanTier, changeUserSubscription } from './auth-store';

export type PaymentMethodChoice = 'stripe' | 'paypal';

export interface CheckoutSessionOptions {
  userId: string;
  userEmail: string;
  planId: PlanTier;
  billingInterval: 'monthly' | 'yearly';
  amount: number;
  successUrl: string;
  cancelUrl: string;
  preferredProvider?: PaymentMethodChoice;
}

export interface CheckoutResult {
  provider: 'stripe' | 'paypal' | 'sandbox';
  isLive: boolean;
  checkoutUrl?: string;
  sessionId?: string;
  orderId?: string;
  sandboxToken?: string;
  message?: string;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  provider: 'stripe' | 'paypal' | 'sandbox';
  eventType?: string;
  payload?: {
    userId: string;
    userEmail?: string;
    planId: PlanTier;
    billingInterval: 'monthly' | 'yearly';
    subscriptionId?: string;
    customerId?: string;
    amount: number;
    transactionRef?: string;
    receiptUrl?: string;
    paymentMethod?: string;
    fee?: number;
    provider?: 'mock' | 'stripe' | 'paypal';
  };
  error?: string;
}

const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || 'fpk_webhook_secret_sign_2026_xyz';

// Stripe client lazy initializer
function getStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey, {
    apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
  });
}

// PayPal OAuth & API helper
async function getPayPalAccessToken(): Promise<string | null> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const authUrl =
    process.env.PAYPAL_ENV === 'live'
      ? 'https://api-m.paypal.com/v1/oauth2/token'
      : 'https://api-m.sandbox.paypal.com/v1/oauth2/token';

  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(authUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    console.error('Failed to authenticate with PayPal OAuth:', await res.text());
    return null;
  }

  const json = await res.json();
  return json.access_token || null;
}

export class PaymentGateway {
  static isStripeConfigured(): boolean {
    return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
  }

  static isPayPalConfigured(): boolean {
    return Boolean(
      process.env.PAYPAL_CLIENT_ID &&
      process.env.PAYPAL_CLIENT_SECRET &&
      process.env.PAYPAL_WEBHOOK_ID
    );
  }

  static getProviderStatuses() {
    return {
      stripe: {
        configured: this.isStripeConfigured(),
        hasSecretKey: Boolean(process.env.STRIPE_SECRET_KEY),
        hasWebhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
        mode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_') ? 'live' : 'test',
      },
      paypal: {
        configured: this.isPayPalConfigured(),
        hasClientId: Boolean(process.env.PAYPAL_CLIENT_ID),
        hasClientSecret: Boolean(process.env.PAYPAL_CLIENT_SECRET),
        hasWebhookId: Boolean(process.env.PAYPAL_WEBHOOK_ID),
        mode: process.env.PAYPAL_ENV === 'live' ? 'live' : 'sandbox',
      },
    };
  }

  // Create Checkout Session (Stripe Checkout vs PayPal Order vs Cryptographic Sandbox)
  static async createCheckoutSession(opts: CheckoutSessionOptions): Promise<CheckoutResult> {
    const choice = opts.preferredProvider || 'stripe';

    // 1. Stripe Checkout
    if (choice === 'stripe' && this.isStripeConfigured()) {
      const stripe = getStripeClient();
      if (stripe) {
        try {
          const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer_email: opts.userEmail,
            client_reference_id: opts.userId,
            line_items: [
              {
                price_data: {
                  currency: 'usd',
                  product_data: {
                    name: `pdfkitfree ${opts.planId.toUpperCase()} Plan`,
                    description: `${opts.billingInterval === 'yearly' ? 'Annual' : 'Monthly'} access to pdfkitfree Pro/Business features.`,
                  },
                  unit_amount: Math.round(opts.amount * 100),
                  recurring: {
                    interval: opts.billingInterval === 'yearly' ? 'year' : 'month',
                  },
                },
                quantity: 1,
              },
            ],
            metadata: {
              userId: opts.userId,
              planId: opts.planId,
              billingInterval: opts.billingInterval,
            },
            success_url: `${opts.successUrl}&provider=stripe&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: opts.cancelUrl,
          });

          return {
            provider: 'stripe',
            isLive: true,
            checkoutUrl: session.url || undefined,
            sessionId: session.id,
          };
        } catch (err) {
          console.error('Stripe session creation error:', err);
          throw new Error(`Failed to initialize Stripe Checkout: ${(err as Error).message}`);
        }
      }
    }

    // 2. PayPal Checkout
    if (choice === 'paypal' && this.isPayPalConfigured()) {
      const token = await getPayPalAccessToken();
      if (token) {
        const baseUrl =
          process.env.PAYPAL_ENV === 'live'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';

        const orderRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            intent: 'CAPTURE',
            purchase_units: [
              {
                reference_id: `${opts.userId}__${opts.planId}__${opts.billingInterval}`,
                description: `pdfkitfree ${opts.planId.toUpperCase()} (${opts.billingInterval})`,
                custom_id: JSON.stringify({
                  userId: opts.userId,
                  planId: opts.planId,
                  billingInterval: opts.billingInterval,
                }),
                amount: {
                  currency_code: 'USD',
                  value: opts.amount.toFixed(2),
                },
              },
            ],
            application_context: {
              brand_name: 'pdfkitfree',
              landing_page: 'NO_PREFERENCE',
              user_action: 'PAY_NOW',
              return_url: `${opts.successUrl}&provider=paypal`,
              cancel_url: opts.cancelUrl,
            },
          }),
        });

        if (!orderRes.ok) {
          const errText = await orderRes.text();
          console.error('PayPal Order error:', errText);
          throw new Error('Failed to create PayPal Order.');
        }

        const orderData = (await orderRes.json()) as {
          id: string;
          links?: Array<{ rel: string; href: string }>;
        };
        const approveLink = orderData.links?.find((l) => l.rel === 'approve')?.href;

        return {
          provider: 'paypal',
          isLive: true,
          orderId: orderData.id,
          checkoutUrl: approveLink,
        };
      }
    }

    // 3. Cryptographically Signed Sandbox Session (when live API keys are not supplied)
    // Uses HMAC-SHA256 signature to guarantee server verification before any subscription grant
    const payload = JSON.stringify({
      userId: opts.userId,
      userEmail: opts.userEmail,
      planId: opts.planId,
      billingInterval: opts.billingInterval,
      amount: opts.amount,
      provider: choice,
      nonce: crypto.randomBytes(16).toString('hex'),
      exp: Date.now() + 15 * 60 * 1000, // 15 mins validity
    });

    const signature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    const sandboxToken = `${Buffer.from(payload).toString('base64url')}.${signature}`;

    return {
      provider: 'sandbox',
      isLive: false,
      sessionId: `sess_sandbox_${crypto.randomUUID().slice(0, 10)}`,
      sandboxToken,
      message: `Sandbox / Test Gateway Active for ${choice === 'paypal' ? 'PayPal Checkout' : 'Stripe Card Checkout'}. No live API secrets configured.`,
    };
  }

  // Create Stripe Customer Portal session
  static async createCustomerPortalSession(customerId: string, returnUrl: string): Promise<string | null> {
    const stripe = getStripeClient();
    if (!stripe || !customerId || customerId.startsWith('cus_sandbox')) return null;

    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });
      return session.url;
    } catch (err) {
      console.error('Stripe Customer Portal error:', err);
      return null;
    }
  }

  // Capture PayPal Order upon customer return
  static async capturePayPalOrder(orderId: string): Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
  }> {
    const token = await getPayPalAccessToken();
    if (!token) {
      return { success: false, error: 'PayPal credentials unavailable.' };
    }

    const baseUrl =
      process.env.PAYPAL_ENV === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

    try {
      const res = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const text = await res.text();
        return { success: false, error: `Capture error: ${text}` };
      }

      const data = (await res.json()) as Record<string, unknown>;
      return { success: true, data };
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message };
    }
  }

  // Verify Stripe Webhook
  static verifyStripeWebhook(rawBody: string, signature: string): WebhookVerificationResult {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return { isValid: false, provider: 'stripe', error: 'STRIPE_WEBHOOK_SECRET not configured.' };
    }

    const stripe = getStripeClient();
    if (!stripe) {
      return { isValid: false, provider: 'stripe', error: 'Stripe SDK not initialized.' };
    }

    try {
      const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id || session.metadata?.userId;
        const planId = (session.metadata?.planId as PlanTier) || 'pro';
        const billingInterval = (session.metadata?.billingInterval as 'monthly' | 'yearly') || 'monthly';
        const amount = (session.amount_total || 0) / 100;

        if (!userId) {
          return { isValid: false, provider: 'stripe', error: 'Missing userId metadata in Stripe event' };
        }

        return {
          isValid: true,
          provider: 'stripe',
          eventType: event.type,
          payload: {
            userId,
            userEmail: session.customer_details?.email || undefined,
            planId,
            billingInterval,
            subscriptionId: typeof session.subscription === 'string' ? session.subscription : undefined,
            customerId: typeof session.customer === 'string' ? session.customer : undefined,
            amount,
            transactionRef: session.id,
            paymentMethod: 'Debit/Credit Card (Stripe Checkout)',
          },
        };
      }

      return {
        isValid: true,
        provider: 'stripe',
        eventType: event.type,
      };
    } catch (err) {
      return {
        isValid: false,
        provider: 'stripe',
        error: (err as Error).message || 'Stripe webhook signature validation failed.',
      };
    }
  }

  // Verify PayPal Webhook
  static async verifyPayPalWebhook(
    headers: Headers,
    rawBody: string
  ): Promise<WebhookVerificationResult> {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) {
      return { isValid: false, provider: 'paypal', error: 'PAYPAL_WEBHOOK_ID not configured.' };
    }

    const token = await getPayPalAccessToken();
    if (!token) {
      return { isValid: false, provider: 'paypal', error: 'PayPal authorization failed.' };
    }

    const baseUrl =
      process.env.PAYPAL_ENV === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

    try {
      const parsedBody = JSON.parse(rawBody);

      // Verify signature via PayPal verification endpoint
      const verifyRes = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transmission_id: headers.get('paypal-transmission-id'),
          transmission_time: headers.get('paypal-transmission-time'),
          cert_url: headers.get('paypal-cert-url'),
          auth_algo: headers.get('paypal-auth-algo'),
          transmission_sig: headers.get('paypal-transmission-sig'),
          webhook_id: webhookId,
          webhook_event: parsedBody,
        }),
      });

      if (!verifyRes.ok) {
        return { isValid: false, provider: 'paypal', error: 'PayPal signature validation call failed.' };
      }

      const verifyData = await verifyRes.json();
      if (verifyData.verification_status !== 'SUCCESS') {
        return { isValid: false, provider: 'paypal', error: 'PayPal signature mismatch status.' };
      }

      // Check event type
      const eventType = parsedBody.event_type;
      if (eventType === 'CHECKOUT.ORDER.APPROVED' || eventType === 'PAYMENT.CAPTURE.COMPLETED') {
        const resource = parsedBody.resource;
        const customIdRaw = resource.custom_id || resource.purchase_units?.[0]?.custom_id;
        let meta: Record<string, string> = {};
        try {
          meta = JSON.parse(customIdRaw || '{}');
        } catch {
          // Ignore parse error
        }

        if (meta.userId && meta.planId) {
          const amount = parseFloat(resource.amount?.value || resource.purchase_units?.[0]?.amount?.value || '0');
          return {
            isValid: true,
            provider: 'paypal',
            eventType,
            payload: {
              userId: meta.userId,
              planId: (meta.planId as PlanTier) || 'pro',
              billingInterval: (meta.billingInterval as 'monthly' | 'yearly') || 'monthly',
              subscriptionId: resource.id,
              customerId: resource.payer?.payer_id,
              amount,
              transactionRef: resource.id,
              paymentMethod: 'PayPal Account / Express',
            },
          };
        }
      }

      return {
        isValid: true,
        provider: 'paypal',
        eventType,
      };
    } catch (err: unknown) {
      return {
        isValid: false,
        provider: 'paypal',
        error: (err as Error).message || 'PayPal webhook parsing error.',
      };
    }
  }

  // Verify and process secure webhook / HMAC sandbox token
  static verifyAndProcessEvent(
    tokenOrPayload: string,
    signatureHeader?: string
  ): WebhookVerificationResult {
    try {
      if (tokenOrPayload.includes('.')) {
        const [base64, sig] = tokenOrPayload.split('.');
        const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(base64).digest('hex');
        if (expected !== sig) {
          return { isValid: false, provider: 'sandbox', error: 'Cryptographic signature mismatch.' };
        }

        const data = JSON.parse(Buffer.from(base64, 'base64url').toString('utf-8'));
        if (data.exp < Date.now()) {
          return { isValid: false, provider: 'sandbox', error: 'Checkout session expired.' };
        }

        const chosenProvider = data.provider === 'paypal' ? 'paypal' : 'mock';

        return {
          isValid: true,
          provider: 'sandbox',
          eventType: 'checkout.session.completed',
          payload: {
            userId: data.userId,
            userEmail: data.userEmail,
            planId: data.planId,
            billingInterval: data.billingInterval,
            subscriptionId: `sub_sandbox_${crypto.randomUUID().slice(0, 8)}`,
            customerId: `cus_sandbox_${crypto.randomUUID().slice(0, 8)}`,
            amount: data.amount,
            paymentMethod: data.provider === 'paypal' ? 'PayPal (Sandbox Verified)' : 'Debit/Credit Card (Sandbox Verified)',
            transactionRef: `tx_sandbox_${crypto.randomUUID().slice(0, 10)}`,
            provider: chosenProvider,
          },
        };
      }

      if (signatureHeader) {
        const expected = crypto
          .createHmac('sha256', WEBHOOK_SECRET)
          .update(tokenOrPayload)
          .digest('hex');
        if (expected !== signatureHeader) {
          return { isValid: false, provider: 'sandbox', error: 'Webhook signature verification failed.' };
        }

        const data = JSON.parse(tokenOrPayload);
        return {
          isValid: true,
          provider: 'sandbox',
          eventType: data.type || 'payment.succeeded',
          payload: data.data,
        };
      }

      return { isValid: false, provider: 'sandbox', error: 'Missing security verification parameters.' };
    } catch (err: unknown) {
      return { isValid: false, provider: 'sandbox', error: (err as Error).message || 'Verification exception' };
    }
  }

  // Execute subscription activation upon verified payment event
  static applyVerifiedPayment(payload: {
    userId: string;
    planId: PlanTier;
    billingInterval: 'monthly' | 'yearly';
    subscriptionId?: string;
    customerId?: string;
    transactionRef?: string;
    paymentMethod?: string;
    fee?: number;
    provider?: 'mock' | 'stripe' | 'paypal';
  }) {
    const provider = payload.provider || 'mock';
    return changeUserSubscription(
      payload.userId,
      payload.planId,
      payload.billingInterval,
      provider,
      {
        subscriptionId: payload.subscriptionId,
        customerId: payload.customerId,
        transactionRef: payload.transactionRef,
        paymentMethod: payload.paymentMethod,
        fee: payload.fee,
      }
    );
  }
}
