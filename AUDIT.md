# Audit & Monitoring Guide

## Overview

The Obra360 platform includes comprehensive audit logging and monitoring for all security-critical events.

## Audit Log Events

All security events are logged to the `audit_logs` table with the following structure:

```typescript
interface AuditLog {
    id: string;
    created_at: string;
    event_type: string;
    tenant_id?: string;
    actor_id?: string;
    actor_email?: string;
    target_user_id?: string;
    severity: 'low' | 'medium' | 'high';
    metadata: Record<string, any>;
}
```

## Event Types

### Security Events
- `AI_SECURITY_PII_DETECTED` - PII detected in AI message
- `AI_SECURITY_INJECTION_ATTEMPT` - Prompt injection attempt
- `AI_SECURITY_QUOTA_EXCEEDED` - AI quota exceeded

### Authentication Events
- `IMPERSONATION_START` - Admin started impersonation
- `IMPERSONATION_END` - Impersonation ended
- `IMPERSONATION_EXPIRED` - Impersonation token expired

### Rate Limiting
- `RATE_LIMIT_EXCEEDED` - Rate limit hit

## Querying Audit Logs

### Using Audit Helpers

```typescript
import { queryAuditLogs, getAuditSummary, getSecurityEvents } from '@/lib/audit-helpers';

// Get audit summary for last 30 days
const summary = await getAuditSummary(supabase, tenantId, 30);
console.log(summary.eventsByType);
console.log(summary.eventsBySeverity);

// Get high-priority security events
const securityEvents = await getSecurityEvents(supabase, tenantId);

// Query with custom filters
const logs = await queryAuditLogs(supabase, {
    tenantId: 'tenant-uuid',
    eventType: 'AI_SECURITY',
    severity: 'high',
    startDate: '2026-01-01T00:00:00Z',
    limit: 100,
});
```

### Direct SQL Query

```sql
-- Security events in last 7 days
SELECT 
    created_at,
    event_type,
    severity,
    actor_email,
    metadata
FROM audit_logs
WHERE 
    event_type LIKE '%SECURITY%'
    AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 100;

-- Impersonation history
SELECT 
    created_at,
    event_type,
    actor_email,
    target_user_id,
    metadata->>'reason' as reason
FROM audit_logs
WHERE event_type LIKE 'IMPERSONATION_%'
ORDER BY created_at DESC;

-- AI security events by type
SELECT 
    event_type,
    COUNT(*) as count,
    COUNT(DISTINCT tenant_id) as affected_tenants
FROM audit_logs
WHERE event_type LIKE 'AI_SECURITY_%'
GROUP BY event_type
ORDER BY count DESC;
```

## Monitoring Alerts

### Critical Events to Monitor

1. **High-Severity Security Events**
   - Alert if > 5 PII detections per hour
   - Alert if any injection attempts with high confidence

2. **Impersonation**
   - Alert on all impersonation starts
   - Alert if impersonation lasts > 30 minutes

3. **Rate Limiting**
   - Alert if same user/IP hits rate limit > 10 times/hour

4. **Quota Exceeded**
   - Monitor quota usage trends by plan

## Export Audit Logs

```typescript
import { queryAuditLogs, exportAuditLogsToCSV } from '@/lib/audit-helpers';

// Query logs
const logs = await queryAuditLogs(supabase, {
    tenantId: 'tenant-uuid',
    startDate: '2026-01-01T00:00:00Z',
    endDate: '2026-01-31T23:59:59Z',
});

// Export to CSV
const csv = exportAuditLogsToCSV(logs);

// Download or send to compliance system
const blob = new Blob([csv], { type: 'text/csv' });
const url = URL.createObjectURL(blob);
// ... trigger download
```

## Retention Policy

- **Security Events**: Retain for 12 months
- **Impersonation Logs**: Retain for 24 months (compliance)
- **AI Events**: Retain for 6 months
- **General Events**: Retain for 3 months

Configure retention in Supabase:

```sql
-- Delete old logs (run monthly)
DELETE FROM audit_logs
WHERE created_at < NOW() - INTERVAL '3 months'
AND event_type NOT IN ('IMPERSONATION_START', 'IMPERSONATION_END', 'AI_SECURITY_INJECTION_ATTEMPT');

-- Keep security-critical events longer
DELETE FROM audit_logs
WHERE created_at < NOW() - INTERVAL '12 months'
AND event_type IN ('IMPERSONATION_START', 'IMPERSONATION_END');
```

## Integration with Monitoring Services

### Sentry (Recommended)

```typescript
import * as Sentry from '@sentry/browser';

// In logger.ts, send critical events to Sentry
if (level === LogLevel.CRITICAL || category === EventCategory.SECURITY) {
    Sentry.captureMessage(message, {
        level: 'error',
        tags: {
            category,
            tenantId: context?.tenantId,
        },
        extra: context,
    });
}
```

### DataDog

```typescript
// Send structured logs to DataDog
if (import.meta.env.PROD) {
    window.DD_LOGS?.logger.log(message, {
        level,
        category,
        ...context,
    });
}
```

## Performance Considerations

- Audit logs are written asynchronously (fire-and-forget)
- No blocking on audit log failures
- Indexed on: `tenant_id`, `created_at`, `event_type`, `severity`
- Partitioned by month for large tables

## Compliance

Audit logs support compliance with:
- **LGPD** (Brazilian data protection)
- **SOC 2** (Security & availability)
- **ISO 27001** (Information security)

Key requirements met:
- ✅ Immutable audit trail
- ✅ User activity tracking
- ✅ Admin action logging
- ✅ Data access monitoring
- ✅ Long-term retention
