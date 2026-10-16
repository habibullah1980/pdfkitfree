import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { POST } from '../src/app/api/contact/route';

async function runContactApiTests() {
  console.log('========================================================');
  console.log('RUNNING CONTACT FORM API & RESEND SDK DISPATCH TESTS');
  console.log('========================================================\n');

  const originalFetch = global.fetch;

  // Intercept fetch to mock Resend SDK API calls
  let interceptedUrl = '';
  let interceptedAuth = '';
  let interceptedBody: any = null;
  let mockStatus = 200;
  let mockResponseData: any = { id: 'resend_sdk_msg_12345' };

  global.fetch = async (url: any, init?: any) => {
    interceptedUrl = String(url);
    interceptedAuth = init?.headers?.Authorization || (init?.headers instanceof Headers ? init.headers.get('Authorization') : '');
    if (init?.body) {
      try {
        interceptedBody = JSON.parse(init.body);
      } catch {
        interceptedBody = init.body;
      }
    }
    return new Response(JSON.stringify(mockResponseData), {
      status: mockStatus,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  // Configure test environment with Resend API key
  process.env.RESEND_API_KEY = 're_test_contact_sdk_key_456';
  process.env.FROM_EMAIL = 'PDFKitFree Support <noreply@pdfkitfree.online>';
  process.env.SUPPORT_RECIPIENT_EMAIL = 'support@pdfkitfree.online';

  // Test 1: Successful submission with valid payload via Resend SDK
  console.log('[Test 1] Valid submission calls Resend SDK, returns HTTP 200 and messageId...');
  mockStatus = 200;
  mockResponseData = { id: 'msg_resend_live_success_999' };

  const validReq = new NextRequest('http://localhost:3000/api/contact', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '192.168.1.101',
    },
    body: JSON.stringify({
      name: 'Alex Mercer',
      email: 'alex@example.com',
      subject: 'Feature Request: Batch Rotation',
      message: 'Hello PDFKitFree team, could you please add a tool to rotate entire folders of PDFs at once?',
    }),
  });

  const res1 = await POST(validReq);
  const data1 = await res1.json();

  assert.strictEqual(res1.status, 200, 'Valid request should return HTTP 200');
  assert.strictEqual(data1.success, true, 'Response should report success: true');
  assert.strictEqual(data1.messageId, 'msg_resend_live_success_999', 'Response should include Resend messageId');
  assert.match(interceptedUrl, /api\.resend\.com\/emails/, 'Must call Resend emails API');
  assert.strictEqual(interceptedAuth, 'Bearer re_test_contact_sdk_key_456', 'Must include Resend Bearer authorization');
  assert.deepStrictEqual(interceptedBody.to, ['support@pdfkitfree.online'], 'Must send to SUPPORT_RECIPIENT_EMAIL');
  assert.strictEqual(interceptedBody.reply_to, 'alex@example.com', 'Must set reply_to to sender email');
  console.log('✓ Valid contact form submission dispatched through Resend SDK successfully.');

  // Test 2: Validation failure on missing or short name
  console.log('\n[Test 2] Invalid name (too short) is rejected with 400...');
  const invalidNameReq = new NextRequest('http://localhost:3000/api/contact', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '192.168.1.102',
    },
    body: JSON.stringify({
      name: 'A',
      email: 'alex@example.com',
      subject: 'Question',
      message: 'Valid message body with sufficient length.',
    }),
  });

  const res2 = await POST(invalidNameReq);
  const data2 = await res2.json();
  assert.strictEqual(res2.status, 400, 'Should reject short name with HTTP 400');
  assert.match(data2.error, /valid name/i, 'Error message should explain name requirement');
  console.log('✓ Short name validation rejected correctly.');

  // Test 3: Validation failure on malformed email
  console.log('\n[Test 3] Malformed email is rejected with 400...');
  const invalidEmailReq = new NextRequest('http://localhost:3000/api/contact', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '192.168.1.103',
    },
    body: JSON.stringify({
      name: 'Alex Mercer',
      email: 'not-an-email',
      subject: 'Question',
      message: 'Valid message body with sufficient length.',
    }),
  });

  const res3 = await POST(invalidEmailReq);
  const data3 = await res3.json();
  assert.strictEqual(res3.status, 400, 'Should reject invalid email with HTTP 400');
  assert.match(data3.error, /valid email/i, 'Error message should explain email requirement');
  console.log('✓ Invalid email rejected correctly.');

  // Test 4: Validation failure on short message
  console.log('\n[Test 4] Short message body is rejected with 400...');
  const invalidMsgReq = new NextRequest('http://localhost:3000/api/contact', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '192.168.1.104',
    },
    body: JSON.stringify({
      name: 'Alex Mercer',
      email: 'alex@example.com',
      subject: 'Question',
      message: 'Short',
    }),
  });

  const res4 = await POST(invalidMsgReq);
  const data4 = await res4.json();
  assert.strictEqual(res4.status, 400, 'Should reject short message with HTTP 400');
  assert.match(data4.error, /at least 10 characters/i);
  console.log('✓ Short message rejected correctly.');

  // Test 5: Bot honeypot protection (silently discarded without sending real email)
  console.log('\n[Test 5] Honeypot spam trap silently discarded...');
  const prevFetchCallCount = interceptedUrl;
  interceptedUrl = '';

  const spamReq = new NextRequest('http://localhost:3000/api/contact', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '192.168.1.105',
    },
    body: JSON.stringify({
      name: 'Spam Bot',
      email: 'spammer@botnet.ru',
      subject: 'Cheap SEO links',
      message: 'Buy backlinks now for 100 dollars guaranteed rankings.',
      honeypot: 'filled_by_automated_scraper',
    }),
  });

  const res5 = await POST(spamReq);
  const data5 = await res5.json();
  assert.strictEqual(res5.status, 200, 'Honeypot returns HTTP 200 to trick bot');
  assert.strictEqual(data5.success, true);
  assert.strictEqual(interceptedUrl, '', 'Honeypot must not invoke Resend SDK');
  console.log('✓ Honeypot trap protects against automated form scrapers without triggering Resend.');

  // Test 6: Rate limiting after multiple requests
  console.log('\n[Test 6] Rate limiting blocks aggressive submissions...');
  const rateLimitIp = '198.51.100.99';
  let lastStatus = 200;

  for (let i = 0; i < 7; i++) {
    const rlReq = new NextRequest('http://localhost:3000/api/contact', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': rateLimitIp,
      },
      body: JSON.stringify({
        name: `Tester ${i}`,
        email: `tester${i}@example.com`,
        subject: 'General Question',
        message: 'This is an automated burst rate limit test sequence.',
      }),
    });

    const res = await POST(rlReq);
    lastStatus = res.status;
  }

  assert.strictEqual(lastStatus, 429, 'Excessive submissions from same IP must trigger HTTP 429 Too Many Requests');
  console.log('✓ Rate limiter successfully triggered HTTP 429 after 5 requests in window.');

  // Test 7: Resend failure returns HTTP 500 and does not report false success
  console.log('\n[Test 7] Resend SDK failure returns HTTP 500...');
  mockStatus = 403;
  mockResponseData = {
    statusCode: 403,
    message: 'Domain not verified in Resend account.',
    name: 'validation_error',
  };

  const failingReq = new NextRequest('http://localhost:3000/api/contact', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '192.168.1.110',
    },
    body: JSON.stringify({
      name: 'Sarah Connor',
      email: 'sarah@example.com',
      subject: 'Urgent Issue',
      message: 'Testing that API returns 500 when Resend returns an error response.',
    }),
  });

  const resFailing = await POST(failingReq);
  const dataFailing = await resFailing.json();

  assert.strictEqual(resFailing.status, 500, 'Must return status 500 when Resend returns error');
  assert.strictEqual(dataFailing.success, undefined, 'Must not claim success');
  assert.match(dataFailing.error, /Failed to dispatch email/i, 'Must return safe error message without secrets');
  console.log('✓ Resend SDK error appropriately rejected with HTTP 500.');

  // Test 8: Missing RESEND_API_KEY returns HTTP 500
  console.log('\n[Test 8] Missing RESEND_API_KEY returns HTTP 500...');
  delete process.env.RESEND_API_KEY;

  const missingKeyReq = new NextRequest('http://localhost:3000/api/contact', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '192.168.1.111',
    },
    body: JSON.stringify({
      name: 'No Key Tester',
      email: 'nokey@example.com',
      subject: 'No Key Configured',
      message: 'Testing handler behavior when RESEND_API_KEY is not defined in environment.',
    }),
  });

  const resMissingKey = await POST(missingKeyReq);
  const dataMissingKey = await resMissingKey.json();

  assert.strictEqual(resMissingKey.status, 500, 'Must return status 500 when RESEND_API_KEY is missing');
  assert.match(dataMissingKey.error, /Email service is not configured/i);
  console.log('✓ Missing RESEND_API_KEY handled safely with HTTP 500.');

  // Restore environment
  global.fetch = originalFetch;

  console.log('\nALL 8 CONTACT FORM RESEND SDK TESTS PASSED! ✅\n');
}

runContactApiTests().catch((err) => {
  console.error('❌ Contact API test failure:', err);
  process.exit(1);
});
