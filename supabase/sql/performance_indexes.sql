-- Performance Optimization Indexes
-- Run this after refactoring to optimize query performance
-- This script safely checks for table existence before creating indexes

DO $$
BEGIN

    -- 1. Subscriptions lookup
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscriptions') THEN
        CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_status 
        ON subscriptions(tenant_id, status) 
        WHERE status IN ('active', 'trialing');
        
        RAISE NOTICE 'Index created: idx_subscriptions_tenant_status';
    END IF;

    -- 2. Feature overrides lookup
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tenant_feature_overrides') THEN
        CREATE INDEX IF NOT EXISTS idx_feature_overrides_active 
        ON tenant_feature_overrides(tenant_id, feature_key, enabled);
        
        RAISE NOTICE 'Index created: idx_feature_overrides_active';
    END IF;

    -- 3. User roles lookup for RBAC
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_roles') THEN
        CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_user 
        ON user_roles(tenant_id, user_id);
        
        RAISE NOTICE 'Index created: idx_user_roles_tenant_user';
    END IF;

    -- 4. Role permissions lookup
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'role_permissions') THEN
        CREATE INDEX IF NOT EXISTS idx_role_permissions_role 
        ON role_permissions(role_id, permission_key);
        
        RAISE NOTICE 'Index created: idx_role_permissions_role';
    END IF;

    -- 5. Audit logs by tenant/date
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_logs') THEN
        CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_date 
        ON audit_logs(tenant_id, created_at DESC);
        
        CREATE INDEX IF NOT EXISTS idx_audit_logs_action 
        ON audit_logs(action);
        
        RAISE NOTICE 'Indexes created for audit_logs';
    END IF;

    -- 6. Support sessions lookup
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'support_sessions') THEN
        CREATE INDEX IF NOT EXISTS idx_support_sessions_tenant_active 
        ON support_sessions(tenant_id, expires_at) 
        WHERE ended_at IS NULL;
        
        RAISE NOTICE 'Index created: idx_support_sessions_tenant_active';
    END IF;

    -- 7. Works/Projects lookup
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'works') THEN
        CREATE INDEX IF NOT EXISTS idx_works_tenant_status 
        ON works(tenant_id, status);
        
        RAISE NOTICE 'Index created: idx_works_tenant_status';
    END IF;
    
    -- 8. Users lookup
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        CREATE INDEX IF NOT EXISTS idx_users_tenant_email 
        ON users(tenant_id, email);
        
        RAISE NOTICE 'Index created: idx_users_tenant_email';
    END IF;
    
    -- 9. Plan features lookup
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'plan_features') THEN
        CREATE INDEX IF NOT EXISTS idx_plan_features_lookup 
        ON plan_features(plan_id, feature_key);
        
        RAISE NOTICE 'Index created: idx_plan_features_lookup';
    END IF;

END $$;

-- Analyze tables to update statistics (only if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'subscriptions') THEN
        ANALYZE subscriptions;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'tenant_feature_overrides') THEN
        ANALYZE tenant_feature_overrides;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'user_roles') THEN
        ANALYZE user_roles;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'audit_logs') THEN
        ANALYZE audit_logs;
    END IF;
END $$;
