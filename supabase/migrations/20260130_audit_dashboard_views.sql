-- Audit Dashboard Queries
-- These queries can be used to build monitoring dashboards

-- 1. Security Events Summary (Last 7 Days)
CREATE OR REPLACE VIEW security_events_summary AS
SELECT 
    DATE(created_at) as event_date,
    event_type,
    severity,
    COUNT(*) as event_count,
    COUNT(DISTINCT tenant_id) as affected_tenants
FROM audit_logs
WHERE 
    created_at >= NOW() - INTERVAL '7 days'
    AND (event_type LIKE '%SECURITY%' OR event_type LIKE '%INJECTION%')
GROUP BY DATE(created_at), event_type, severity
ORDER BY event_date DESC, event_count DESC;

-- 2. Impersonation Activity
CREATE OR REPLACE VIEW impersonation_activity AS
SELECT 
    created_at,
    actor_email as admin_email,
    metadata->>'targetTenantId' as target_tenant,
    metadata->>'targetUserId' as target_user,
    metadata->>'reason' as reason,
    event_type,
    EXTRACT(EPOCH FROM (
        LAG(created_at) OVER (PARTITION BY metadata->>'sessionId' ORDER BY created_at DESC) - created_at
    )) / 60 as duration_minutes
FROM audit_logs
WHERE event_type LIKE 'IMPERSONATION_%'
ORDER BY created_at DESC;

-- 3. AI Usage by Plan
CREATE OR REPLACE VIEW ai_usage_by_plan AS
SELECT 
    DATE(am.created_at) as usage_date,
    p.name as plan_name,
    COUNT(*) as message_count,
    COUNT(DISTINCT am.tenant_id) as active_tenants
FROM ai_messages am
JOIN subscriptions s ON s.tenant_id = am.tenant_id
JOIN plans p ON p.id = s.plan_id
WHERE am.created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(am.created_at), p.name
ORDER BY usage_date DESC, plan_name;

-- 4. Rate Limit Violations
CREATE OR REPLACE VIEW rate_limit_violations AS
SELECT 
    DATE(created_at) as violation_date,
    tenant_id,
    COUNT(*) as violation_count,
    array_agg(DISTINCT metadata->>'ipAddress') as ip_addresses
FROM audit_logs
WHERE 
    metadata->>'code' = 'RATE_LIMIT_EXCEEDED'
    AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), tenant_id
HAVING COUNT(*) > 5  -- More than 5 violations per day
ORDER BY violation_date DESC, violation_count DESC;

-- 5. PII Detection Trends
CREATE OR REPLACE VIEW pii_detection_trends AS
SELECT 
    DATE(created_at) as detection_date,
    tenant_id,
    metadata->>'detectedTypes' as pii_types,
    COUNT(*) as detection_count
FROM audit_logs
WHERE event_type = 'AI_SECURITY_PII_DETECTED'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), tenant_id, metadata->>'detectedTypes'
ORDER BY detection_date DESC, detection_count DESC;

-- 6. Failed Login Attempts (if auth logs exist)
CREATE OR REPLACE VIEW failed_login_attempts AS
SELECT 
    DATE(created_at) as attempt_date,
    metadata->>'ipAddress' as ip_address,
    COUNT(*) as attempt_count
FROM audit_logs
WHERE event_type = 'AUTH_FAILED'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), metadata->>'ipAddress'
HAVING COUNT(*) > 3  -- More than 3 failed attempts
ORDER BY attempt_date DESC, attempt_count DESC;

-- 7. Tenant Activity Summary
CREATE OR REPLACE VIEW tenant_activity_summary AS
SELECT 
    t.id as tenant_id,
    t.name as tenant_name,
    COUNT(DISTINCT DATE(al.created_at)) as active_days,
    COUNT(*) FILTER (WHERE al.event_type LIKE '%AI%') as ai_events,
    COUNT(*) FILTER (WHERE al.event_type LIKE '%SECURITY%') as security_events,
    MAX(al.created_at) as last_activity
FROM tenants t
LEFT JOIN audit_logs al ON al.tenant_id = t.id
WHERE al.created_at >= NOW() - INTERVAL '30 days'
GROUP BY t.id, t.name
ORDER BY active_days DESC;

-- 8. Critical Events Alert
CREATE OR REPLACE VIEW critical_events_alert AS
SELECT 
    created_at,
    event_type,
    tenant_id,
    actor_email,
    severity,
    metadata
FROM audit_logs
WHERE 
    severity IN ('high', 'critical')
    AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
