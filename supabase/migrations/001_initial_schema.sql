-- Sealionyx Database Schema
-- Version: 1.0.0
-- Description: Initial schema for cryptographic authenticity platform

-- ============================================================================
-- Users Crypto Table
-- Stores user cryptographic data (keys, certificates)
-- ============================================================================

CREATE TABLE IF NOT EXISTS users_crypto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supabase_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    public_key TEXT NOT NULL,
    private_key_encrypted TEXT NOT NULL,
    cert_pem TEXT NOT NULL,
    cert_serial TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_crypto_user_id ON users_crypto(supabase_user_id);
CREATE INDEX IF NOT EXISTS idx_users_crypto_email ON users_crypto(email);
CREATE INDEX IF NOT EXISTS idx_users_crypto_serial ON users_crypto(cert_serial);
CREATE INDEX IF NOT EXISTS idx_users_crypto_status ON users_crypto(status);

-- ============================================================================
-- Documents Table
-- Stores sealed document metadata
-- ============================================================================

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    hash TEXT NOT NULL,
    signature TEXT NOT NULL,
    bundle_path TEXT,
    metadata_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_hash ON documents(hash);
CREATE INDEX IF NOT EXISTS idx_documents_created ON documents(created_at DESC);

-- ============================================================================
-- Audit Logs Table
-- Security audit trail for all cryptographic operations
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    result TEXT NOT NULL CHECK (result IN ('success', 'failure', 'error', 'existing')),
    details_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_result ON audit_logs(result);

-- ============================================================================
-- Auth Challenges Table
-- Stores challenge-response authentication nonces
-- ============================================================================

CREATE TABLE IF NOT EXISTS auth_challenges (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nonce TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for challenge lookups
CREATE INDEX IF NOT EXISTS idx_challenges_user ON auth_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_expires ON auth_challenges(expires_at);

-- Cleanup old challenges (can be run periodically)
-- DELETE FROM auth_challenges WHERE expires_at < NOW() OR used = TRUE;

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users_crypto ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_challenges ENABLE ROW LEVEL SECURITY;

-- Users can read their own crypto data
CREATE POLICY "Users can view own crypto data"
    ON users_crypto FOR SELECT
    USING (auth.uid() = supabase_user_id);

-- Service role can do everything
CREATE POLICY "Service role full access to users_crypto"
    ON users_crypto FOR ALL
    USING (auth.role() = 'service_role');

-- Users can read their own documents
CREATE POLICY "Users can view own documents"
    ON documents FOR SELECT
    USING (auth.uid() = owner_id);

-- Service role can manage documents
CREATE POLICY "Service role full access to documents"
    ON documents FOR ALL
    USING (auth.role() = 'service_role');

-- Users can view their own audit logs
CREATE POLICY "Users can view own audit logs"
    ON audit_logs FOR SELECT
    USING (auth.uid() = actor_id);

-- Service role can manage audit logs
CREATE POLICY "Service role full access to audit_logs"
    ON audit_logs FOR ALL
    USING (auth.role() = 'service_role');

-- Users can access their own challenges
CREATE POLICY "Users can view own challenges"
    ON auth_challenges FOR SELECT
    USING (auth.uid() = user_id);

-- Service role can manage challenges
CREATE POLICY "Service role full access to auth_challenges"
    ON auth_challenges FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- Storage Buckets Configuration
-- Run these in the Supabase dashboard or via API
-- ============================================================================

-- Note: Storage buckets need to be created via the Supabase dashboard or API:
-- 1. sealed-bundles - For signed content bundles
-- 2. encrypted-bundles - For encrypted content bundles  
-- 3. uploads - For general file uploads

-- Example bucket policies (apply in Supabase dashboard):
/*
-- sealed-bundles: Public read, authenticated write
INSERT INTO storage.buckets (id, name, public) VALUES ('sealed-bundles', 'sealed-bundles', true);

-- encrypted-bundles: Private, authenticated access only
INSERT INTO storage.buckets (id, name, public) VALUES ('encrypted-bundles', 'encrypted-bundles', false);

-- uploads: Private, authenticated access only
INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', false);
*/

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to clean up expired challenges
CREATE OR REPLACE FUNCTION cleanup_expired_challenges()
RETURNS void AS $$
BEGIN
    DELETE FROM auth_challenges 
    WHERE expires_at < NOW() OR used = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's certificate status
CREATE OR REPLACE FUNCTION get_user_cert_status(user_uuid UUID)
RETURNS TABLE (
    has_certificate BOOLEAN,
    status TEXT,
    cert_serial TEXT,
    expires_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TRUE as has_certificate,
        uc.status,
        uc.cert_serial,
        uc.created_at + INTERVAL '365 days' as expires_at
    FROM users_crypto uc
    WHERE uc.supabase_user_id = user_uuid
    LIMIT 1;
    
    -- If no certificate found, return default
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
