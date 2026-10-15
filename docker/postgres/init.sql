-- Schema definition for pdfkitfree PostgreSQL production migration --
-- This script creates all tables, relational indexes, constraints, and initial superadmin seed

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(32) NOT NULL DEFAULT 'user', -- 'user' | 'superadmin'
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    verification_code VARCHAR(64),
    verification_expires TIMESTAMPTZ,
    reset_token VARCHAR(255),
    reset_token_expires TIMESTAMPTZ,
    account_status VARCHAR(32) NOT NULL DEFAULT 'active', -- 'active' | 'suspended' | 'soft_deleted'
    suspended_reason TEXT,
    last_login_at TIMESTAMPTZ,
    last_login_ip VARCHAR(64),
    approx_location JSONB,
    mfa JSONB,
    phone_config JSONB,
    subscription JSONB NOT NULL DEFAULT '{"planId": "free", "status": "active", "billingInterval": "monthly", "paymentProvider": "mock"}'::jsonb,
    usage JSONB NOT NULL DEFAULT '{"pdfProcessedCount": 0, "videoProcessedCount": 0, "aiCreditsUsed": 0, "storageBytesUsed": 0}'::jsonb,
    custom_quotas JSONB,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);

-- 2. User Active Sessions Table (Revocation & Concurrency Control)
CREATE TABLE IF NOT EXISTS user_sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(128) NOT NULL,
    user_agent VARCHAR(255),
    ip VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON user_sessions(token_hash);

-- 3. Signing Requests Table (Private NDA / Electronic Signatures)
CREATE TABLE IF NOT EXISTS signing_requests (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    document_type VARCHAR(32) NOT NULL DEFAULT 'uploaded', -- 'generated' | 'uploaded'
    status VARCHAR(32) NOT NULL DEFAULT 'signed', -- 'draft' | 'pending' | 'signed'
    disclosing_party VARCHAR(255),
    receiving_party VARCHAR(255),
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT DEFAULT 0,
    page_count INTEGER DEFAULT 1,
    signed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_signing_requests_user ON signing_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_signing_requests_status ON signing_requests(status);

-- 4. Billing Transactions Table (Stripe & PayPal Ledger)
CREATE TABLE IF NOT EXISTS billing_transactions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_email VARCHAR(255) NOT NULL,
    plan_id VARCHAR(32) NOT NULL, -- 'free' | 'pro' | 'business'
    amount NUMERIC(10, 2) NOT NULL,
    fee NUMERIC(10, 2) DEFAULT 0,
    net NUMERIC(10, 2) DEFAULT 0,
    currency VARCHAR(8) NOT NULL DEFAULT 'USD',
    billing_interval VARCHAR(16) NOT NULL, -- 'monthly' | 'yearly'
    status VARCHAR(32) NOT NULL, -- 'paid' | 'pending' | 'failed' | 'refunded' | 'chargeback'
    payment_method VARCHAR(64) NOT NULL,
    provider VARCHAR(32) NOT NULL, -- 'stripe' | 'paypal' | 'sandbox'
    transaction_ref VARCHAR(255) NOT NULL UNIQUE,
    receipt_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_billing_tx_user ON billing_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_tx_status ON billing_transactions(status);
CREATE INDEX IF NOT EXISTS idx_billing_tx_provider ON billing_transactions(provider);

-- 5. AI Conversations Table
CREATE TABLE IF NOT EXISTS ai_conversations (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    file_name VARCHAR(255),
    document_summary TEXT,
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id);

-- 6. Activity & Audit Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    category VARCHAR(32) NOT NULL, -- 'auth' | 'billing' | 'tool' | 'security' | 'admin'
    action VARCHAR(64) NOT NULL,
    details TEXT,
    ip VARCHAR(64),
    approx_location VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_cat ON activity_logs(category);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);

-- 7. Platform Settings Table (Single-row configuration)
CREATE TABLE IF NOT EXISTS platform_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    maintenance_mode BOOLEAN DEFAULT FALSE,
    allow_public_signups BOOLEAN DEFAULT TRUE,
    max_video_upload_mb INTEGER DEFAULT 800,
    enforce_nda_auth BOOLEAN DEFAULT TRUE,
    site_banner TEXT DEFAULT '',
    require_mfa_for_admin BOOLEAN DEFAULT FALSE,
    telemetry_enabled BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO platform_settings (id, maintenance_mode, allow_public_signups, max_video_upload_mb, enforce_nda_auth)
VALUES (1, FALSE, TRUE, 800, TRUE)
ON CONFLICT (id) DO NOTHING;
