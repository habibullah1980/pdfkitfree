/**
 * Feedback system tests: validation, spam traps, rate limits, screenshot checks, and the
 * Postgres store (run against an in-process Postgres, the same SQL as production/Neon).
 */
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { PGlite } from '@electric-sql/pglite';
import { POST } from '../src/app/api/feedback/route';
import { createFeedbackStore, setFeedbackStoreForTests } from '../src/lib/server/feedback-store';
import { feedbackBurstLimiter } from '../src/lib/server/burst-limit';
import { cleanPagePath, sniffImageType, validateFeedback } from '../src/lib/feedback-validation';

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);

function jsonReq(body: unknown, ip = '10.0.0.1') {
  return new NextRequest('http://localhost:3000/api/feedback', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  });
}

const good = (extra: Record<string, unknown> = {}) => ({
  category: 'bug',
  rating: 4,
  message: 'The merge tool works well but the page order could be easier to change.',
  email: 'User@Example.com',
  pageUrl: 'https://www.pdfkitfree.online/tools/merge-pdf?file=secret#x',
  startedAt: Date.now() - 10_000,
  ...extra,
});

async function main() {
  let passed = 0;
  const test = async (name: string, fn: () => Promise<void> | void) => {
    await fn();
    passed++;
    console.log(`[PASS] ${name}`);
  };

  const pg = new PGlite();
  const store = createFeedbackStore(async (sql, params) => (await pg.query(sql, (params || []) as unknown[])).rows as Record<string, unknown>[]);
  setFeedbackStoreForTests(store);

  await test('validation accepts a good submission and keeps only the page path', () => {
    const r = validateFeedback(good());
    assert.ok(r.ok);
    if (r.ok) {
      assert.equal(r.value.email, 'user@example.com');
      assert.equal(r.value.pagePath, '/tools/merge-pdf');
      assert.equal(r.value.toolSlug, 'merge-pdf');
    }
  });

  await test('validation rejects bad fields with a clear message', () => {
    const bad = [
      [{ category: 'other' }, 'category'],
      [{ rating: 0 }, 'rating'],
      [{ rating: 6 }, 'rating'],
      [{ rating: 3.5 }, 'rating'],
      [{ message: 'short' }, 'message'],
      [{ message: 'x'.repeat(3001) }, 'message'],
      [{ message: 'see http://a.com http://b.com http://c.com http://d.com please' }, 'message'],
      [{ email: 'not-an-email' }, 'email'],
      [{ email: 'a@b.c<script>' }, 'email'],
    ] as const;
    for (const [extra, field] of bad) {
      const r = validateFeedback(good(extra as Record<string, unknown>));
      assert.ok(!r.ok && r.field === field, `${JSON.stringify(extra)} should fail on ${field}`);
    }
  });

  await test('control characters and bidi tricks are stripped', () => {
    const r = validateFeedback(good({ message: '  Hello\u0000 there‮, this is fine\r\n  ' }));
    assert.ok(r.ok && r.value.message === 'Hello there, this is fine');
  });

  await test('page paths: external or odd URLs are reduced to a safe path or dropped', () => {
    assert.deepEqual(cleanPagePath('/compress-pdf-to/100kb'), { pagePath: '/compress-pdf-to/100kb', toolSlug: 'compress-pdf-to/100kb' });
    assert.equal(cleanPagePath('javascript:alert(1)').pagePath, null);
    assert.equal(cleanPagePath(42).pagePath, null);
    assert.equal(cleanPagePath('https://x.com//evil.com/a').pagePath, '/evil.com/a');
  });

  await test('screenshot type is read from the file bytes', () => {
    assert.equal(sniffImageType(PNG), 'image/png');
    assert.equal(sniffImageType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])), 'image/jpeg');
    assert.equal(sniffImageType(new TextEncoder().encode('<svg onload=alert(1)>')), null);
  });

  await test('POST stores valid feedback (201) in Postgres', async () => {
    const res = await POST(jsonReq(good()));
    assert.equal(res.status, 201);
    const list = await store.list({});
    assert.equal(list.total, 1);
    assert.equal(list.rows[0].status, 'new');
    assert.equal(list.rows[0].pagePath, '/tools/merge-pdf');
    assert.equal(list.counts.new, 1);
  });

  await test('honeypot and instant submits are silently ignored', async () => {
    assert.equal((await POST(jsonReq(good({ website: 'http://spam', message: 'Buy cheap things right now at our shop' }), '10.0.0.2'))).status, 201);
    assert.equal((await POST(jsonReq(good({ startedAt: Date.now(), message: 'Too fast to be a human typing this' }), '10.0.0.2'))).status, 201);
    assert.equal((await store.list({})).total, 1);
  });

  await test('duplicate message from the same sender is stored once', async () => {
    assert.equal((await POST(jsonReq(good()))).status, 201);
    assert.equal((await store.list({})).total, 1);
  });

  await test('invalid input returns 400 with the field', async () => {
    const res = await POST(jsonReq(good({ rating: 9 }), '10.0.0.3'));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).field, 'rating');
  });

  await test('multipart upload with a PNG screenshot is stored; a fake image is rejected', async () => {
    const form = new FormData();
    for (const [k, v] of Object.entries(good({ message: 'Screenshot of the broken button on mobile' }))) form.set(k, String(v));
    form.set('screenshot', new Blob([PNG], { type: 'image/png' }), 'shot.png');
    const res = await POST(new NextRequest('http://localhost:3000/api/feedback', { method: 'POST', headers: { 'x-forwarded-for': '10.0.0.4' }, body: form }));
    assert.equal(res.status, 201);
    const row = (await store.list({ search: 'broken button' })).rows[0];
    assert.ok(row.hasScreenshot);
    const shot = await store.screenshot(row.id);
    assert.equal(shot?.type, 'image/png');
    assert.deepEqual(new Uint8Array(shot!.data), PNG);

    const bad = new FormData();
    for (const [k, v] of Object.entries(good({ message: 'This screenshot is not really an image' }))) bad.set(k, String(v));
    bad.set('screenshot', new Blob(['<html>'], { type: 'image/png' }), 'x.png');
    const res2 = await POST(new NextRequest('http://localhost:3000/api/feedback', { method: 'POST', headers: { 'x-forwarded-for': '10.0.0.4' }, body: bad }));
    assert.equal(res2.status, 400);
  });

  await test('rate limit: the 6th submission in 10 minutes gets 429', async () => {
    feedbackBurstLimiter.reset();
    for (let i = 0; i < 5; i++) assert.equal((await POST(jsonReq(good({ message: `Suggestion number ${i} for the tools` }), '10.0.0.9'))).status, 201);
    assert.equal((await POST(jsonReq(good({ message: 'One more suggestion for the site' }), '10.0.0.9'))).status, 429);
  });

  await test('admin updates: status, important flag and note; filters and counts', async () => {
    const first = (await store.list({})).rows.at(-1)!;
    const updated = await store.update(first.id, { status: 'planned', important: true, adminNote: 'Add drag & drop' });
    assert.equal(updated?.status, 'planned');
    assert.equal(updated?.important, true);
    const imp = await store.list({ important: true });
    assert.equal(imp.total, 1);
    assert.equal((await store.list({ status: 'planned' })).total, 1);
    assert.equal((await store.list({ category: 'feature' })).total, 0);
    // important items are listed first
    assert.equal((await store.list({})).rows[0].id, first.id);
    // the database itself refuses an unknown status
    await assert.rejects(() => pg.query(`UPDATE feedback SET status = 'hacked' WHERE id = $1`, [first.id]));
  });

  await test('search treats % and _ literally', async () => {
    assert.equal((await store.list({ search: '%' })).total, 0);
  });

  await test('no database configured: 503 with an email fallback', async () => {
    setFeedbackStoreForTests(null);
    const prev = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    feedbackBurstLimiter.reset();
    const res = await POST(jsonReq(good({ message: 'Database is not there in this test' }), '10.0.0.10'));
    assert.equal(res.status, 503);
    if (prev) process.env.DATABASE_URL = prev;
  });

  console.log(`\n${passed} feedback tests passed.`);
}

main().catch((e) => {
  console.error('[FAIL]', e);
  process.exit(1);
});
