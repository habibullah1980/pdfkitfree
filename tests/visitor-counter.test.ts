import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { GET, POST } from '../src/app/api/visitor-counter/route';
import { getVisitorCount, incrementVisitorCount } from '../src/lib/server/visitor-counter';

async function runVisitorCounterTests() {
  console.log('========================================================');
  console.log('RUNNING VISITOR COUNTER & DEDUPLICATION TESTS');
  console.log('========================================================\n');

  // Test 1: GET returns current visitor count
  console.log('[Test 1] GET /api/visitor-counter returns valid count and success: true...');
  const initialCount = await getVisitorCount();
  assert.ok(typeof initialCount === 'number' && initialCount >= 0, 'Initial count must be a non-negative number');

  const getRes = await GET();
  const getData = await getRes.json();
  assert.strictEqual(getRes.status, 200);
  assert.strictEqual(getData.success, true);
  assert.strictEqual(getData.count, initialCount);
  console.log(`✓ GET returned current visitor count: ${getData.count}`);

  // Test 2: Valid public page POST increments count
  console.log('\n[Test 2] POST /api/visitor-counter for public page increments count...');
  const postReq = new NextRequest('http://localhost:3000/api/visitor-counter', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
      'x-forwarded-for': '203.0.113.10',
    },
    body: JSON.stringify({ pathname: '/tools/merge-pdf' }),
  });

  const postRes = await POST(postReq);
  const postData = await postRes.json();
  assert.strictEqual(postRes.status, 200);
  assert.strictEqual(postData.success, true);
  assert.strictEqual(postData.count, initialCount + 1, 'Visitor count must increment by exactly 1');
  console.log(`✓ Count successfully incremented from ${initialCount} to ${postData.count}`);

  // Test 3: Rate limiting / deduplication within 30s window from same IP does not increment
  console.log('\n[Test 3] Rapid second request from same IP within window returns same count...');
  const dupReq = new NextRequest('http://localhost:3000/api/visitor-counter', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
      'x-forwarded-for': '203.0.113.10',
    },
    body: JSON.stringify({ pathname: '/pricing' }),
  });

  const dupRes = await POST(dupReq);
  const dupData = await dupRes.json();
  assert.strictEqual(dupRes.status, 200);
  assert.strictEqual(dupData.rateLimited, true);
  assert.strictEqual(dupData.count, postData.count, 'Count must NOT increment on duplicate visit in short window');
  console.log(`✓ Rapid re-render or repeat visit deduplicated without incrementing count (${dupData.count})`);

  // Test 4: Private paths (admin, login, signup, settings) are excluded from incrementing
  console.log('\n[Test 4] Private paths (/admin, /login, /settings) do NOT increment count...');
  const privateReq = new NextRequest('http://localhost:3000/api/visitor-counter', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
      'x-forwarded-for': '203.0.113.20',
    },
    body: JSON.stringify({ pathname: '/admin' }),
  });

  const privateRes = await POST(privateReq);
  const privateData = await privateRes.json();
  assert.strictEqual(privateRes.status, 200);
  assert.strictEqual(privateData.skipped, true);
  assert.strictEqual(privateData.count, postData.count, 'Private page must not increment visitor counter');
  console.log('✓ Private paths successfully excluded from incrementing visitor counter');

  // Test 5: Obvious bot User-Agents do NOT increment count
  console.log('\n[Test 5] Known crawler bot User-Agents do NOT increment count...');
  const botReq = new NextRequest('http://localhost:3000/api/visitor-counter', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'x-forwarded-for': '203.0.113.30',
    },
    body: JSON.stringify({ pathname: '/tools' }),
  });

  const botRes = await POST(botReq);
  const botData = await botRes.json();
  assert.strictEqual(botRes.status, 200);
  assert.strictEqual(botData.bot, true);
  assert.strictEqual(botData.count, postData.count, 'Bot crawl must not increment visitor counter');
  console.log('✓ Bot crawler safely discarded without inflating counter');

  console.log('\nALL 5 VISITOR COUNTER TESTS PASSED! ✅\n');
}

runVisitorCounterTests().catch((err) => {
  console.error('❌ Visitor counter test failure:', err);
  process.exit(1);
});
