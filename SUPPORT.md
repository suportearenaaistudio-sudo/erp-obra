# Obra360 - Support & Impersonation Guide

## 🎭 Overview

SaaS administrators can **impersonate tenants** to provide support, troubleshoot issues, and help customers. This is done securely with full audit logging and time limits.

## 🔐 Security Measures

### 1. Time-Limited Sessions

- **Maximum duration**: 15 minutes
- **No extension**: Must create new session after expiration
- **Automatic expiry**: Session becomes invalid after time limit

### 2. Comprehensive Logging

Every impersonation session is logged with:
- Who (SaaS admin)
- When (timestamp)
- Which tenant
- Why (reason provided)
- What actions were taken
- From where (IP address, user agent)

### 3. Visual Indicators

When impersonating, the UI shows:
- Banner: "🎭 Impersonating: [Tenant Name]"
- Red warning color
- All actions tagged with impersonation flag

### 4. Audit Trail

All actions during impersonation are logged to:
- `support_session_logs` - Detailed action log
- `audit_logs` - System-wide audit trail with `is_impersonation: true` flag

## 🚀 How to Impersonate

### Via Dev Admin Interface

1. Go to **Support** tab in Dev Admin
2. Find the tenant/ticket
3. Click **"Impersonate"** button
4. Provide reason (required)
5. Session starts - you're now acting as that tenant

### Via Edge Function

```typescript
POST /saas/impersonate

Body:
{
    "tenant_id": "uuid-of-tenant",
    "reason": "Troubleshooting billing issue"
}

Response:
{
    "session_id": "session-uuid",
    "token": "impersonation-jwt-token",
    "expires_at": "2024-01-30T12:45:00Z",
    "tenant": {
        "id": "...",
        "name": "...",
        "status": "..."
    }
}
```

Use the returned `token` in subsequent requests:

```typescript
Authorization: Bearer <impersonation-token>
```

## 📊 Implementation Details

### Creating Impersonation Session

```typescript
// 1. Validate SaaS admin
const saasGuard = new SaasAuthGuard(supabase);
await saasGuard.check(context);

// 2. Create session record
const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

const { data: session } = await supabase
    .from('support_sessions')
    .insert({
        saas_user_id: context.saasUserId,
        tenant_id: tenantId,
        reason,
        expires_at: expiresAt,
        ip_address: req.headers.get('x-forwarded-for'),
        user_agent: req.headers.get('user-agent'),
    })
    .select()
    .single();

// 3. Generate JWT token
const token = await sign(
    {
        sessionId: session.id,
        tenantId,
        saasUserId: context.saasUserId,
        isImpersonation: true,
        exp: Math.floor(expiresAt.getTime() / 1000),
    },
    SECRET_KEY,
    'HS256'
);

// 4. Log to audit
await supabase.from('audit_logs').insert({
    tenant_id: tenantId,
    user_id: context.saasUserId,
    action: 'IMPERSONATE_START',
    entity_type: 'tenant',
    entity_id: tenantId,
    changes: { reason },
    is_impersonation: true,
});
```

### Validating Impersonation

```typescript
// Verify JWT token
const payload = await verify(token, SECRET_KEY, 'HS256');

// Check expiration
if (payload.exp < Date.now() / 1000) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Session expired', 401);
}

// Build context with impersonation flag
const context: RequestContext = {
    userType: 'tenant',
    tenantId: payload.tenantId,
    userId: payload.saasUserId,
    saasUserId: payload.saasUserId,
    isImpersonation: true,
    sessionId: payload.sessionId,
    traceId,
};
```

### Logging Actions

Every action during impersonation is logged:

```typescript
await supabase.from('support_session_logs').insert({
    session_id: context.sessionId,
    action: 'VIEW_WORK',
    entity_type: 'work',
    entity_id: workId,
    details: { workName, status },
    created_at: new Date(),
});
```

## 🗄️ Database Schema

### support_sessions

```sql
CREATE TABLE support_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    saas_user_id UUID NOT NULL REFERENCES saas_users(id),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    reason TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ
);
```

### support_session_logs

```sql
CREATE TABLE support_session_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES support_sessions(id),
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## ✅ Best Practices

### 1. Always Provide Reason

```typescript
// ❌ BAD
reason: "helping customer"

// ✅ GOOD
reason: "Customer reported error when creating budget. Investigating budget creation flow."
```

### 2. Log Meaningful Actions

```typescript
// Log important actions
await logAction('VIEWED_SENSITIVE_DATA', 'invoice', invoiceId);
await logAction('MODIFIED_SETTINGS', 'tenant', tenantId, { before, after });
await logAction('EXPORTED_REPORT', 'report', reportId);

// Don't log trivial actions
// ❌ await logAction('NAVIGATED_TO_PAGE', 'page', '/dashboard');
```

### 3. End Session When Done

```typescript
// Explicitly end session
await supabase
    .from('support_sessions')
    .update({ ended_at: new Date() })
    .eq('id', sessionId);
```

### 4. Review Session Logs

Periodically review impersonation sessions for:
- Unusual patterns
- Long sessions (hitting time limit)
- Excessive data access
- Suspicious actions

## 📋 Audit & Compliance

### View Session History

```sql
-- All impersonation sessions
SELECT 
    s.*,
    sa.name as admin_name,
    t.name as tenant_name,
    COUNT(l.id) as action_count
FROM support_sessions s
JOIN saas_users sa ON sa.id = s.saas_user_id
JOIN tenants t ON t.id = s.tenant_id
LEFT JOIN support_session_logs l ON l.session_id = s.id
GROUP BY s.id, sa.name, t.name
ORDER BY s.created_at DESC;
```

### View Actions for a Session

```sql
SELECT *
FROM support_session_logs
WHERE session_id = 'uuid-here'
ORDER BY created_at;
```

### Compliance Reports

Generate reports showing:
- **Who** accessed **which tenant** and **when**
- **What actions** were performed
- **Why** (reason provided)
- **How long** the session lasted

This satisfies audit requirements for SOC 2, GDPR, etc.

## 🚨 Security Alerts

Set up alerts for:
- Impersonation sessions exceeding 10 minutes
- Multiple failed impersonation attempts
- Sensitive data access (financial records, passwords)
- Unusual patterns (same admin impersonating many tenants)

## ❌ What NOT to Do

1. **Never** share impersonation tokens
2. **Never** impersonate without valid reason
3. **Never** access sensitive data unnecessarily
4. **Never** make changes without customer consent
5. **Never** use impersonation for personal gain

## 🔗 Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [SECURITY.md](./SECURITY.md) - Security configuration
- [MULTI_TENANT.md](./MULTI_TENANT.md) - Multi-tenancy implementation
