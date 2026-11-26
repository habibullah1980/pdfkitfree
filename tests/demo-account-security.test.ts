import assert from 'node:assert/strict';
import { createTestPostgres } from './helpers/pglite-backend';
import { setStateBackendForTests } from '../src/lib/server/app-state-store';
import {
  findUserByEmail,
  verifyPassword,
  updateUserRoleAdmin,
  changeUserSubscription,
  grantPromotionalAccessAdmin,
  getPlatformStatsAdmin,
  getPlatformSettingsAdmin,
  getAllUsersAdmin,
} from '../src/lib/server/auth-store';

async function runDemoSecurityTests() {
  console.log('--- DEMO ACCOUNT SECURITY & ISOLATION TESTS ---');
  const { backend } = await createTestPostgres();
  setStateBackendForTests(backend);

  process.env.SUPERADMIN_EMAIL = 'owner@example.test';
  process.env.SUPERADMIN_PASSWORD = 'correct-horse-battery-staple';
  process.env.ENABLE_DEMO_ACCOUNT = 'true';
  process.env.DEMO_ACCOUNT_PASSWORD = 'test_demo_password_123';

  // Test 1: demo account is seeded only when enabled and given a password
  let demoUser = await findUserByEmail('demo@pdfkitfree.com');
  assert.ok(demoUser, 'Demo account should exist when ENABLE_DEMO_ACCOUNT=true and DEMO_ACCOUNT_PASSWORD is set');
  assert.strictEqual(demoUser.role, 'user');
  assert.strictEqual(demoUser.subscription.planId, 'free');
  assert.strictEqual(demoUser.accountStatus, 'active');
  assert.ok(verifyPassword('test_demo_password_123', demoUser.passwordHash, demoUser.salt));
  console.log('✓ Demo account seeded with user role, free plan and its own password.');

  // Test 2: demo cannot be promoted
  await assert.rejects(() => updateUserRoleAdmin(demoUser!.id, 'superadmin'), /Demo account cannot be granted Super Administrator privileges/);
  console.log('✓ Promoting demo account to superadmin is rejected.');

  // Test 3: demo cannot get paid plans
  await assert.rejects(() => changeUserSubscription(demoUser!.id, 'pro', 'monthly', 'stripe'), /Demo account cannot be subscribed to paid tiers/);
  await assert.rejects(
    () => grantPromotionalAccessAdmin('owner@example.test', demoUser!.id, 'business', 1, 'Testing promotional grant'),
    /Demo account cannot be granted paid promotional access/
  );
  console.log('✓ Demo account cannot acquire paid plans.');

  // Test 4: super admin comes from env and has admin data access
  const superAdmin = await findUserByEmail('owner@example.test');
  assert.ok(superAdmin);
  assert.strictEqual(superAdmin.role, 'superadmin');
  const stats = await getPlatformStatsAdmin();
  assert.ok(stats.totalUsers >= 2 && stats.superAdminCount === 1);
  const settings = await getPlatformSettingsAdmin();
  assert.strictEqual(typeof settings.maintenanceMode, 'boolean');
  assert.ok((await getAllUsersAdmin()).total >= 2);
  console.log('✓ Super admin provisioned from env vars with access to stats, settings and users.');

  // Test 5: disabling demo mode suspends the account on the next load
  delete process.env.ENABLE_DEMO_ACCOUNT;
  demoUser = await findUserByEmail('demo@pdfkitfree.com');
  assert.strictEqual(demoUser?.accountStatus, 'suspended');
  console.log('✓ Demo account is suspended when ENABLE_DEMO_ACCOUNT is not true.');

  console.log('\nALL 5 DEMO ACCOUNT SECURITY TESTS PASSED ✅\n');
}

runDemoSecurityTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
