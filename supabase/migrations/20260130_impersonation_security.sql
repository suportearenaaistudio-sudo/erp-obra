-- Migration: Add role column to saas_users and update impersonation security
-- Version: 2026-01-30-impersonation-security

-- Add role column to saas_users if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'saas_users' AND column_name = 'role') THEN
        ALTER TABLE saas_users ADD COLUMN role TEXT DEFAULT 'VIEWER';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'saas_users' AND column_name = 'is_active') THEN
        ALTER TABLE saas_users ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Create role enum constraint
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'saas_users_role_check') THEN
        ALTER TABLE saas_users 
        ADD CONSTRAINT saas_users_role_check 
        CHECK (role IN ('VIEWER', 'SUPPORT', 'DEV_ADMIN', 'SUPER_ADMIN'));
    END IF;
END $$;

-- Update existing admin users (replace with actual admin emails)
UPDATE saas_users 
SET role = 'DEV_ADMIN', is_active = true
WHERE email IN (
    'admin@obra360.com',
    'suporte@obra360.com',
    'vitorpradotamos@gmail.com',
    'marcospaulotrindade3@gmail.com'
);

-- Add token column to support_sessions if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'support_sessions' AND column_name = 'token') THEN
        ALTER TABLE support_sessions ADD COLUMN token TEXT;
    END IF;
END $$;

-- Create index for faster admin lookups
CREATE INDEX IF NOT EXISTS idx_saas_users_email_active 
ON saas_users(email, is_active) 
WHERE is_active = true;

-- Create index for session token lookups
CREATE INDEX IF NOT EXISTS idx_support_sessions_token 
ON support_sessions(token) 
WHERE ended_at IS NULL;

-- Comment
COMMENT ON COLUMN saas_users.role IS 'User role: VIEWER, SUPPORT, DEV_ADMIN, SUPER_ADMIN';
COMMENT ON COLUMN saas_users.is_active IS 'Whether the user account is active';
COMMENT ON COLUMN support_sessions.token IS 'Signed JWT token for impersonation session';
