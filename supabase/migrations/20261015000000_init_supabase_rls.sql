-- ==============================================================================
-- Supabase PostgreSQL Migration: Schema, Indexes & Row-Level Security (RLS)
-- Safe & Idempotent (IF NOT EXISTS / ON CONFLICT DO NOTHING)
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Profiles / Users Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'user', -- 'user' | 'superadmin'
    email_verified BOOLEAN DEFAULT FALSE,
    account_status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'suspended' | 'soft_deleted'
    subscription JSONB NOT NULL DEFAULT '{"planId": "free", "status": "active", "billingInterval": "monthly", "paymentProvider": "mock"}'::jsonb,
    usage JSONB NOT NULL DEFAULT '{"pdfProcessedCount": 0, "videoProcessedCount": 0, "aiCreditsUsed": 0, "storageBytesUsed": 0}'::jsonb,
    custom_quotas JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 3. Signing Requests Table (Private NDA Agreements & Signatures)
CREATE TABLE IF NOT EXISTS public.signing_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    document_type TEXT NOT NULL DEFAULT 'uploaded', -- 'generated' | 'uploaded'
    status TEXT NOT NULL DEFAULT 'signed', -- 'draft' | 'pending' | 'signed'
    disclosing_party TEXT,
    receiving_party TEXT,
    file_name TEXT NOT NULL,
    file_path TEXT, -- Reference to private storage bucket object
    file_size BIGINT DEFAULT 0,
    page_count INTEGER DEFAULT 1,
    signed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_signing_requests_user ON public.signing_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_signing_requests_status ON public.signing_requests(status);

-- 4. Billing Transactions Table (Stripe & PayPal Records)
CREATE TABLE IF NOT EXISTS public.billing_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    plan_id TEXT NOT NULL, -- 'free' | 'pro' | 'business'
    amount NUMERIC(10, 2) NOT NULL,
    fee NUMERIC(10, 2) DEFAULT 0,
    net NUMERIC(10, 2) DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'USD',
    billing_interval TEXT NOT NULL, -- 'monthly' | 'yearly'
    status TEXT NOT NULL, -- 'paid' | 'pending' | 'failed' | 'refunded' | 'chargeback'
    payment_method TEXT NOT NULL,
    provider TEXT NOT NULL, -- 'stripe' | 'paypal' | 'sandbox'
    transaction_ref TEXT NOT NULL UNIQUE,
    receipt_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_billing_tx_user ON public.billing_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_tx_status ON public.billing_transactions(status);

-- 5. AI Document Conversations Table
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_name TEXT,
    document_summary TEXT,
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON public.ai_conversations(user_id);

-- 6. Audit & Activity Logs Table
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_email TEXT,
    category TEXT NOT NULL, -- 'auth' | 'billing' | 'tool' | 'security' | 'admin'
    action TEXT NOT NULL,
    details TEXT,
    ip TEXT,
    approx_location TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_cat ON public.activity_logs(category);

-- ==============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- Strict Isolation: Users can ONLY access their own records.
-- Superadmins can view and manage data as needed.
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- --- Profiles Policies ---
CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own non-critical profile fields"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- --- Signing Requests (Private NDA) Policies ---
CREATE POLICY "Users can read own signing requests"
    ON public.signing_requests FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own signing requests"
    ON public.signing_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own signing requests"
    ON public.signing_requests FOR DELETE
    USING (auth.uid() = user_id);

-- --- Billing Transactions Policies ---
CREATE POLICY "Users can read own billing history"
    ON public.billing_transactions FOR SELECT
    USING (auth.uid() = user_id);

-- --- AI Conversations Policies ---
CREATE POLICY "Users can view own AI conversations"
    ON public.ai_conversations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own AI conversations"
    ON public.ai_conversations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own AI conversations"
    ON public.ai_conversations FOR DELETE
    USING (auth.uid() = user_id);

-- --- Activity Logs Policies ---
CREATE POLICY "Users can view own activity logs"
    ON public.activity_logs FOR SELECT
    USING (auth.uid() = user_id);

-- ==============================================================================
-- STORAGE CONFIGURATION (Private Bucket for PDF / NDA Documents)
-- ==============================================================================
-- In Supabase Storage:
-- 1. Create a bucket named "private-documents" with public = false.
-- 2. Storage RLS Policy:
--    Allow authenticated users to read and upload only to their own directory:
--    Path pattern: private-documents/{user_id}/*

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'private-documents',
    'private-documents',
    FALSE,
    52428800, -- 50 MB max limit
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Select own document
CREATE POLICY "User can view own storage files"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'private-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage RLS: Upload own document
CREATE POLICY "User can upload own storage files"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'private-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage RLS: Delete own document
CREATE POLICY "User can delete own storage files"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'private-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
