import { PaymentGateway } from '../src/lib/server/payment-provider';
import crypto from 'crypto';

async function runPaymentSecurityTests() {
  console.log('========================================================');
  console.log('RUNNING PAYMENT GATEWAY SECURITY & VERIFICATION TESTS');
  console.log('========================================================\n');

  let passed = 0;
  let total = 0;

  function assert(name: string, condition: boolean, detail?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`[PASS] ${name}`);
    } else {
      console.error(`[FAIL] ${name} ${detail ? `- ${detail}` : ''}`);
    }
  }

  // 1. Valid Signature Test
  const validCheckout = await PaymentGateway.createCheckoutSession({
    userId: 'usr_valid_001',
    userEmail: 'alex@example.com',
    planId: 'pro',
    billingInterval: 'monthly',
    amount: 4.99,
    preferredProvider: 'stripe',
    successUrl: 'http://localhost:3000/pricing?status=success',
    cancelUrl: 'http://localhost:3000/pricing?status=cancelled',
  });

  assert(
    '1. Valid Sandbox Checkout Session returns token',
    typeof validCheckout.sandboxToken === 'string' && validCheckout.sandboxToken.includes('.')
  );

  const verification1 = PaymentGateway.verifyAndProcessEvent(validCheckout.sandboxToken!);
  assert(
    '2. Valid Signature Verification succeeds',
    verification1.isValid === true && verification1.payload?.amount === 4.99 && verification1.payload.planId === 'pro',
    `Result: ${JSON.stringify(verification1)}`
  );

  // 2. Replay Attack Prevention Test
  const replayAttempt = PaymentGateway.verifyAndProcessEvent(validCheckout.sandboxToken!);
  assert(
    '3. Replay attack with same token/nonce is rejected',
    replayAttempt.isValid === false && !!replayAttempt.error?.includes('replay detected'),
    `Error returned: ${replayAttempt.error}`
  );

  // 3. Cryptographic Signature Tampering / Mismatch Test
  const freshCheckout = await PaymentGateway.createCheckoutSession({
    userId: 'usr_valid_002',
    userEmail: 'alex@example.com',
    planId: 'pro',
    billingInterval: 'monthly',
    amount: 4.99,
    preferredProvider: 'stripe',
    successUrl: 'http://localhost:3000/pricing?status=success',
    cancelUrl: 'http://localhost:3000/pricing?status=cancelled',
  });

  const [b64, validSig] = freshCheckout.sandboxToken!.split('.');
  // Invert last character of signature to test tampering
  const tamperedSig = validSig.slice(0, -1) + (validSig.slice(-1) === 'a' ? 'b' : 'a');
  const tamperedToken = `${b64}.${tamperedSig}`;

  const tamperedResult = PaymentGateway.verifyAndProcessEvent(tamperedToken);
  assert(
    '4. Tampered cryptographic signature is strictly rejected',
    tamperedResult.isValid === false && tamperedResult.error === 'Cryptographic signature mismatch.',
    `Error returned: ${tamperedResult.error}`
  );

  // 4. Altered Amount / Price Tampering Test
  const freshCheckout2 = await PaymentGateway.createCheckoutSession({
    userId: 'usr_valid_003',
    userEmail: 'alex@example.com',
    planId: 'pro',
    billingInterval: 'monthly',
    amount: 4.99,
    preferredProvider: 'stripe',
    successUrl: 'http://localhost:3000/pricing?status=success',
    cancelUrl: 'http://localhost:3000/pricing?status=cancelled',
  });

  const [b64_2] = freshCheckout2.sandboxToken!.split('.');
  const payloadObj = JSON.parse(Buffer.from(b64_2, 'base64url').toString('utf-8'));
  // Attacker attempts to change price from $4.99 to $0.01 and re-sign with an invalid or guessed key
  payloadObj.amount = 0.01;
  const tamperedB64 = Buffer.from(JSON.stringify(payloadObj), 'utf-8').toString('base64url');
  // Even if attacker somehow had HMAC key or tried to re-sign:
  const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET || 'fpk_webhook_secret_sign_2026_xyz';
  const forgedSig = crypto.createHmac('sha256', webhookSecret).update(tamperedB64).digest('hex');
  const amountTamperedToken = `${tamperedB64}.${forgedSig}`;

  const amountTamperResult = PaymentGateway.verifyAndProcessEvent(amountTamperedToken);
  assert(
    '5. Price tampering (altered amount vs server plan price) is detected and rejected',
    amountTamperResult.isValid === false && !!amountTamperResult.error?.includes('Price tampering detected'),
    `Error returned: ${amountTamperResult.error}`
  );

  // 5. Expired Session Test
  payloadObj.amount = 4.99; // valid price
  payloadObj.exp = Date.now() - 5000; // expired 5 seconds ago
  payloadObj.nonce = crypto.randomBytes(16).toString('hex');
  const expiredB64 = Buffer.from(JSON.stringify(payloadObj), 'utf-8').toString('base64url');
  const expiredSig = crypto.createHmac('sha256', webhookSecret).update(expiredB64).digest('hex');
  const expiredToken = `${expiredB64}.${expiredSig}`;

  const expiredResult = PaymentGateway.verifyAndProcessEvent(expiredToken);
  assert(
    '6. Expired session token is rejected',
    expiredResult.isValid === false && !!expiredResult.error?.includes('expired'),
    `Error returned: ${expiredResult.error}`
  );

  // 6. Missing Configuration & Status Separation Test
  const statuses = PaymentGateway.getProviderStatuses();
  assert(
    '7. Provider configuration statuses correctly report live/sandbox mode',
    typeof statuses.stripe.configured === 'boolean' && typeof statuses.paypal.configured === 'boolean'
  );

  console.log(`\nResults: ${passed} of ${total} tests passed.`);
  if (passed !== total) {
    process.exit(1);
  }
}

runPaymentSecurityTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
