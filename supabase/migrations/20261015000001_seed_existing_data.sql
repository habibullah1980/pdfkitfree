-- ==============================================================================
-- Safe Migration: Seed Existing Local Data into Supabase PostgreSQL
-- Preserves all existing users, superadmins, subscriptions, and signing records
-- Idempotent: ON CONFLICT DO UPDATE / DO NOTHING
-- ==============================================================================

INSERT INTO public.profiles (
  id, email, name, role, email_verified, account_status, subscription, usage, created_at
) VALUES (
  gen_random_uuid(), 'habibullah', 'Super Admin Habibullah', 'superadmin', TRUE, 'active', '{"planId":"business","status":"active","billingInterval":"yearly","startDate":"2026-10-13T22:19:41.190Z","renewalDate":"2027-10-13T22:19:41.190Z","cancelAtPeriodEnd":false,"canceledAt":null,"paymentProvider":"mock","subscriptionId":"sub_admin_lifetime","customerId":"cus_admin_root"}'::jsonb, '{"pdfProcessedCount":42,"videoProcessedCount":8,"aiCreditsUsed":5,"storageBytesUsed":12450000,"lastUsageReset":"2026-10-13T22:19:41.190Z"}'::jsonb, '2026-10-13T22:19:41.190Z'
) ON CONFLICT (email) DO UPDATE SET
  role = EXCLUDED.role,
  subscription = EXCLUDED.subscription,
  email_verified = EXCLUDED.email_verified;

INSERT INTO public.profiles (
  id, email, name, role, email_verified, account_status, subscription, usage, created_at
) VALUES (
  gen_random_uuid(), 'alex.mercer@example.com', 'Alex Mercer', 'user', TRUE, 'active', '{"planId":"free","status":"active","billingInterval":"monthly","startDate":"2026-10-13T18:51:46.673Z","renewalDate":"2026-11-12T22:19:41.190Z","cancelAtPeriodEnd":false,"canceledAt":null,"paymentProvider":"mock","subscriptionId":null,"customerId":null}'::jsonb, '{"pdfProcessedCount":0,"videoProcessedCount":0,"aiCreditsUsed":0,"storageBytesUsed":0,"lastUsageReset":"2026-10-13T22:19:41.190Z"}'::jsonb, '2026-10-13T18:51:46.673Z'
) ON CONFLICT (email) DO UPDATE SET
  role = EXCLUDED.role,
  subscription = EXCLUDED.subscription,
  email_verified = EXCLUDED.email_verified;

INSERT INTO public.profiles (
  id, email, name, role, email_verified, account_status, subscription, usage, created_at
) VALUES (
  gen_random_uuid(), 'qa_test_1792006995785@example.com', 'QA User', 'user', FALSE, 'active', '{"planId":"free","status":"active","billingInterval":"monthly","startDate":"2026-10-14T19:43:16.842Z","renewalDate":"2026-11-13T19:43:16.842Z","cancelAtPeriodEnd":false,"canceledAt":null,"paymentProvider":"mock","subscriptionId":null,"customerId":null}'::jsonb, '{"pdfProcessedCount":0,"videoProcessedCount":0,"aiCreditsUsed":0,"storageBytesUsed":0,"lastUsageReset":"2026-10-14T19:43:16.842Z"}'::jsonb, '2026-10-14T19:43:16.842Z'
) ON CONFLICT (email) DO UPDATE SET
  role = EXCLUDED.role,
  subscription = EXCLUDED.subscription,
  email_verified = EXCLUDED.email_verified;

INSERT INTO public.profiles (
  id, email, name, role, email_verified, account_status, subscription, usage, created_at
) VALUES (
  gen_random_uuid(), 'qa_test_1792007027460@example.com', 'QA User 2', 'user', FALSE, 'active', '{"planId":"free","status":"active","billingInterval":"monthly","startDate":"2026-10-14T19:43:48.477Z","renewalDate":"2026-11-13T19:43:48.477Z","cancelAtPeriodEnd":false,"canceledAt":null,"paymentProvider":"mock","subscriptionId":null,"customerId":null}'::jsonb, '{"pdfProcessedCount":0,"videoProcessedCount":0,"aiCreditsUsed":1,"storageBytesUsed":0,"lastUsageReset":"2026-10-14T19:43:48.477Z"}'::jsonb, '2026-10-14T19:43:48.477Z'
) ON CONFLICT (email) DO UPDATE SET
  role = EXCLUDED.role,
  subscription = EXCLUDED.subscription,
  email_verified = EXCLUDED.email_verified;

INSERT INTO public.profiles (
  id, email, name, role, email_verified, account_status, subscription, usage, created_at
) VALUES (
  gen_random_uuid(), 'qa_test_param_1792007055433@example.com', 'QA User 3', 'user', FALSE, 'active', '{"planId":"free","status":"active","billingInterval":"monthly","startDate":"2026-10-14T19:44:16.394Z","renewalDate":"2026-11-13T19:44:16.394Z","cancelAtPeriodEnd":false,"canceledAt":null,"paymentProvider":"mock","subscriptionId":null,"customerId":null}'::jsonb, '{"pdfProcessedCount":1,"videoProcessedCount":0,"aiCreditsUsed":0,"storageBytesUsed":0,"lastUsageReset":"2026-10-14T19:44:16.394Z"}'::jsonb, '2026-10-14T19:44:16.394Z'
) ON CONFLICT (email) DO UPDATE SET
  role = EXCLUDED.role,
  subscription = EXCLUDED.subscription,
  email_verified = EXCLUDED.email_verified;

INSERT INTO public.profiles (
  id, email, name, role, email_verified, account_status, subscription, usage, created_at
) VALUES (
  gen_random_uuid(), 'user_a_1792007074378@test.com', 'User A', 'user', FALSE, 'active', '{"planId":"free","status":"active","billingInterval":"monthly","startDate":"2026-10-14T19:44:35.337Z","renewalDate":"2026-11-13T19:44:35.337Z","cancelAtPeriodEnd":false,"canceledAt":null,"paymentProvider":"mock","subscriptionId":null,"customerId":null}'::jsonb, '{"pdfProcessedCount":1,"videoProcessedCount":0,"aiCreditsUsed":0,"storageBytesUsed":0,"lastUsageReset":"2026-10-14T19:44:35.337Z"}'::jsonb, '2026-10-14T19:44:35.337Z'
) ON CONFLICT (email) DO UPDATE SET
  role = EXCLUDED.role,
  subscription = EXCLUDED.subscription,
  email_verified = EXCLUDED.email_verified;

INSERT INTO public.profiles (
  id, email, name, role, email_verified, account_status, subscription, usage, created_at
) VALUES (
  gen_random_uuid(), 'user_b_1792007077768@test.com', 'User B', 'user', FALSE, 'active', '{"planId":"free","status":"active","billingInterval":"monthly","startDate":"2026-10-14T19:44:38.053Z","renewalDate":"2026-11-13T19:44:38.053Z","cancelAtPeriodEnd":false,"canceledAt":null,"paymentProvider":"mock","subscriptionId":null,"customerId":null}'::jsonb, '{"pdfProcessedCount":0,"videoProcessedCount":0,"aiCreditsUsed":0,"storageBytesUsed":0,"lastUsageReset":"2026-10-14T19:44:38.053Z"}'::jsonb, '2026-10-14T19:44:38.053Z'
) ON CONFLICT (email) DO UPDATE SET
  role = EXCLUDED.role,
  subscription = EXCLUDED.subscription,
  email_verified = EXCLUDED.email_verified;

