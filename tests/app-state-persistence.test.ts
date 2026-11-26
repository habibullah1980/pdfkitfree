import assert from 'node:assert/strict';
import crypto from 'crypto';
import { createTestPostgres } from './helpers/pglite-backend';
import { setStateBackendForTests, createPostgresBackend } from '../src/lib/server/app-state-store';
import {
  createUser,
  findUserByEmail,
  verifyPassword,
  getActivityLogs,
  getBillingTransactions,
  changeUserSubscription,
  hashPassword,
  resetSeedingForTests,
} from '../src/lib/server/auth-store';
import { createSessionToken, verifySessionToken } from '../src/lib/server/session';

async function run() {
  console.log('--- APP STATE PERSISTENCE & AUTH HARDENING TESTS ---');
  const { pg, query, backend } = await createTestPostgres();

  // An existing production-style legacy `users` mirror table with one account in it.
  await pg.exec(`CREATE TABLE users (
    id TEXT PRIMARY KEY, name TEXT, email TEXT UNIQUE, phone TEXT, role TEXT,
    password_hash TEXT, salt TEXT, email_verified BOOLEAN, verification_code TEXT,
    verification_expires TIMESTAMPTZ, account_status TEXT, subscription JSONB, usage JSONB, created_at TIMESTAMPTZ)`);
  const legacy = hashPassword('legacy-user-password');
  const legacyAdmin = hashPassword('old-public-password');
  await pg.query(
    `INSERT INTO users VALUES ($1,'Legacy User','legacy@example.test',NULL,'user',$2,$3,true,'',NOW(),'active','{"planId":"pro","status":"active"}','{}',NOW()),
                             ('superadmin-habibullah','Old Admin','habibullah',NULL,'superadmin',$4,$5,true,'',NOW(),'active','{}','{}',NOW())`,
    [crypto.randomUUID(), legacy.hash, legacy.salt, legacyAdmin.hash, legacyAdmin.salt]
  );

  delete process.env.SUPERADMIN_EMAIL;
  delete process.env.SUPERADMIN_PASSWORD;
  setStateBackendForTests(backend);

  // 1. Legacy accounts are imported once, keep their passwords, and never keep admin rights.
  const imported = await findUserByEmail('legacy@example.test');
  assert.ok(imported, 'legacy user imported');
  assert.ok(verifyPassword('legacy-user-password', imported.passwordHash, imported.salt), 'legacy password still works');
  assert.strictEqual(imported.subscription.planId, 'pro', 'legacy plan kept');
  const oldAdmin = await findUserByEmail('habibullah');
  assert.strictEqual(oldAdmin?.role, 'user', 'imported accounts are never superadmin');
  console.log('✓ Legacy users imported with passwords and plans; admin rights not carried over.');

  // 2. No built-in super admin without env vars.
  const stored = await query('SELECT data FROM app_state');
  const users = (stored[0].data as { users: { role: string }[] }).users;
  assert.strictEqual(users.filter((u) => u.role === 'superadmin').length, 0, 'no superadmin without SUPERADMIN_* env');
  console.log('✓ No super admin exists unless SUPERADMIN_EMAIL/PASSWORD are set.');

  // 3. Signing up as the old admin username does not grant admin.
  const sneaky = await createUser('Sneaky', 'habibullah2', 'some-password-123');
  assert.strictEqual(sneaky.role, 'user');
  console.log('✓ New signups are always regular users.');

  // 4. Data survives a "new server instance" (fresh backend object on the same database).
  setStateBackendForTests(createPostgresBackend(query));
  assert.ok(await findUserByEmail('habibullah2'), 'user visible from a fresh backend instance');
  console.log('✓ Accounts persist in Postgres across server instances.');

  // 5. Concurrent signups from parallel requests are all kept (compare-and-swap + retry).
  const N = 15;
  await Promise.all(Array.from({ length: N }, (_, i) => createUser(`User ${i}`, `user${i}@example.test`, 'password-12345')));
  for (let i = 0; i < N; i++) assert.ok(await findUserByEmail(`user${i}@example.test`), `user${i} kept`);
  const regLogs = (await getActivityLogs('auth')).filter((l) => l.action === 'USER_REGISTERED');
  assert.strictEqual(regLogs.length, N + 1, 'every signup activity log entry kept');
  console.log(`✓ ${N} concurrent signups all persisted, with their activity logs.`);

  // 6. Billing transactions recorded during a plan change are no longer overwritten.
  const payer = (await findUserByEmail('user0@example.test'))!;
  await changeUserSubscription(payer.id, 'pro', 'monthly', 'stripe', { transactionRef: 'tx_test_1' });
  const tx = (await getBillingTransactions()).find((t) => t.transactionRef === 'tx_test_1');
  assert.ok(tx, 'billing transaction persisted with the subscription change');
  assert.strictEqual((await findUserByEmail('user0@example.test'))!.subscription.planId, 'pro');
  console.log('✓ Plan change and its billing transaction are saved together.');

  // 7. Super admin is provisioned from env vars (and only from them).
  process.env.SUPERADMIN_EMAIL = 'owner@example.test';
  process.env.SUPERADMIN_PASSWORD = 'a-long-unique-admin-password';
  resetSeedingForTests(); // behave like a newly started server instance
  const owner = await findUserByEmail('owner@example.test');
  assert.strictEqual(owner?.role, 'superadmin');
  assert.ok(verifyPassword('a-long-unique-admin-password', owner!.passwordHash, owner!.salt));
  console.log('✓ Super admin provisioned from SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD.');

  // 8. Sessions: no built-in signing key; forged tokens with the old public key are rejected.
  const prevEnv = process.env.NODE_ENV;
  process.env.AUTH_SECRET = 'x'.repeat(48);
  const good = createSessionToken('u1', 'a@b.c');
  assert.ok(verifySessionToken(good), 'valid token accepted');
  const body = Buffer.from(JSON.stringify({ userId: 'superadmin', email: 'x', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
  const forged = `${body}.${crypto.createHmac('sha256', 'freepdfkit-secure-session-key-2026-xyz').update(body).digest('hex')}`;
  assert.strictEqual(verifySessionToken(forged), null, 'token signed with the old public key rejected');
  delete process.env.AUTH_SECRET;
  (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
  assert.throws(() => createSessionToken('u1', 'a@b.c'), /AUTH_SECRET must be set/);
  (process.env as Record<string, string | undefined>).NODE_ENV = prevEnv;
  console.log('✓ Session signing requires AUTH_SECRET; forged tokens are rejected.');

  console.log('\nALL 8 PERSISTENCE & AUTH HARDENING TESTS PASSED ✅\n');
}

run().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
