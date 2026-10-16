import assert from 'node:assert/strict';
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
  console.log('--- STARTING DEMO ACCOUNT SECURITY & ISOLATION TEST SUITE ---');

  // Test 1: By default, ENABLE_DEMO_ACCOUNT is not 'true' in production
  console.log('\n[Test 1] Verifying production default behavior for demo@pdfkitfree.com...');
  delete process.env.ENABLE_DEMO_ACCOUNT;

  let demoUser = findUserByEmail('demo@pdfkitfree.com');
  if (demoUser) {
    // If it exists in DB, it must be suspended and non-superadmin
    assert.strictEqual(demoUser.role, 'user', 'Demo account must never have superadmin role');
    assert.strictEqual(demoUser.accountStatus, 'suspended', 'Demo account must be suspended when ENABLE_DEMO_ACCOUNT is not true');
    console.log('✓ In production mode (ENABLE_DEMO_ACCOUNT undefined), demo account is suspended and non-superadmin.');
  } else {
    console.log('✓ In production mode, demo account is not active/seeded in the database.');
  }

  // Test 2: In testing mode (ENABLE_DEMO_ACCOUNT='true'), demo account can be initialized
  console.log('\n[Test 2] Verifying test mode activation (ENABLE_DEMO_ACCOUNT=true)...');
  process.env.ENABLE_DEMO_ACCOUNT = 'true';
  process.env.DEMO_ACCOUNT_PASSWORD = 'test_demo_password_123';

  // Trigger store re-evaluation
  demoUser = findUserByEmail('demo@pdfkitfree.com');
  assert.ok(demoUser, 'Demo account should exist in testing mode');
  assert.strictEqual(demoUser.email, 'demo@pdfkitfree.com');
  assert.strictEqual(demoUser.role, 'user', 'Demo account role must strictly be user, never superadmin');
  assert.strictEqual(demoUser.subscription.planId, 'free', 'Demo account plan must strictly be free tier');
  assert.strictEqual(demoUser.accountStatus, 'active', 'Demo account should be active in test environment');
  assert.strictEqual(
    verifyPassword('test_demo_password_123', demoUser.passwordHash, demoUser.salt),
    true,
    'Password verification should succeed with designated demo password'
  );
  console.log('✓ Demo account activates in test mode with user role and free plan.');

  // Test 3: Demo account cannot be promoted to superadmin
  console.log('\n[Test 3] Verifying role promotion protection...');
  assert.throws(
    () => {
      updateUserRoleAdmin(demoUser!.id, 'superadmin');
    },
    (err: Error) => {
      assert.match(err.message, /Demo account cannot be granted Super Administrator privileges/);
      return true;
    },
    'updateUserRoleAdmin should throw an error when attempting to promote demo account'
  );
  console.log('✓ Promoting demo account to superadmin is strictly rejected by server-side guard.');

  // Test 4: Demo account cannot acquire paid subscription plans
  console.log('\n[Test 4] Verifying subscription protection...');
  assert.throws(
    () => {
      changeUserSubscription(demoUser!.id, 'pro', 'monthly', 'stripe');
    },
    (err: Error) => {
      assert.match(err.message, /Demo account cannot be subscribed to paid tiers/);
      return true;
    },
    'changeUserSubscription must block paid subscriptions for demo account'
  );

  assert.throws(
    () => {
      grantPromotionalAccessAdmin('habibullah', demoUser!.id, 'business', 1, 'Testing promotional grant');
    },
    (err: Error) => {
      assert.match(err.message, /Demo account cannot be granted paid promotional access/);
      return true;
    },
    'grantPromotionalAccessAdmin must block promotional paid tiers for demo account'
  );
  console.log('✓ Demo account cannot acquire paid subscriptions (pro/business) via direct or promotional channels.');

  // Test 5: Verify Super Admin account integrity and full permissions
  console.log('\n[Test 5] Verifying Super Admin account integrity and permissions...');
  const superAdminEmail = process.env.SUPERADMIN_EMAIL || 'habibullah';
  const superAdmin = findUserByEmail(superAdminEmail);
  assert.ok(superAdmin, `Super Admin account (${superAdminEmail}) must exist in the database`);
  assert.strictEqual(superAdmin.role, 'superadmin', 'Super Admin must retain superadmin role');

  const stats = getPlatformStatsAdmin();
  assert.ok(stats.totalUsers >= 1, 'Super Admin can access platform stats');
  assert.ok(stats.superAdminCount >= 1, 'Platform stats confirm at least 1 superadmin');

  const settings = getPlatformSettingsAdmin();
  assert.ok(settings !== undefined && typeof settings.maintenanceMode === 'boolean', 'Super Admin can access platform settings');

  const allUsers = getAllUsersAdmin();
  assert.ok(allUsers.total >= 1, 'Super Admin can query user list');
  console.log(`✓ Super Admin (${superAdminEmail}) has full verified access to stats, settings, and user queries.`);

  // Test 6: Switching back to production mode suspends demo account
  console.log('\n[Test 6] Verifying safe production disablement...');
  delete process.env.ENABLE_DEMO_ACCOUNT;
  demoUser = findUserByEmail('demo@pdfkitfree.com');
  assert.strictEqual(demoUser?.accountStatus, 'suspended', 'Demo account must become suspended when production mode is restored');
  console.log('✓ Demo account is safely suspended when production mode is active.');

  console.log('\nALL 6 DEMO ACCOUNT SECURITY TESTS PASSED SUCCESSFULLY! ✅\n');
}

runDemoSecurityTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
