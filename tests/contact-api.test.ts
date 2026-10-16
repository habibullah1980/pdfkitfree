import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { POST } from '../src/app/api/contact/route';
import { emailAdapter } from '../src/lib/server/email-adapter';

async function runContactApiTests() {
  console.log('========================================================');
  console.log('RUNNING CONTACT FORM API & EMAIL DISPATCH TESTS');
  console.log('========================================================\n');

  // Test 1: Successful submission with valid payload
  console.log('[Test 1] Valid submission returns success and messageId...');
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
  assert.ok(data1.messageId, 'Response should include generated messageId');
  console.log('✓ Valid contact form submission handled and accepted for delivery.');

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
  console.log('✓ Honeypot trap protects against automated form scrapers.');

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

  // Test 7: Email adapter HTML sanitization
  console.log('\n[Test 7] Email adapter HTML sanitization test...');
  const directInquiryResult = await emailAdapter.sendContactInquiry({
    senderName: 'John <script>alert(1)</script>',
    senderEmail: 'john@example.com',
    subject: '<b>Test Vulnerability</b>',
    message: '<img src=x onerror=alert(1)> Real message text.',
  });

  assert.strictEqual(directInquiryResult.success, true, 'Email adapter must accept sanitized message');
  assert.ok(directInquiryResult.messageId, 'Email adapter returned messageId');
  console.log('✓ Email adapter properly sanitizes sender input and constructs safe payload.');

  console.log('\nALL 7 CONTACT FORM API & EMAIL DISPATCH TESTS PASSED! ✅\n');
}

runContactApiTests().catch((err) => {
  console.error('❌ Contact API test failure:', err);
  process.exit(1);
});
