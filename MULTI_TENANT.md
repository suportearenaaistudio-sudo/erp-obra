# Obra360 - Multi-Tenant Implementation Guide

## 🎯 Overview

Obra360 implements **multi-tenancy** using a **single database, shared schema** approach with strict isolation enforced at multiple layers for security and data integrity.

## 🏗️ Architecture Choice

We chose **shared schema** multi-tenancy because:

- ✅ **Cost-effective** - One database for all tenants
- ✅ **Easy maintenance** - One schema to update
- ✅ **Simple backups** - Single backup strategy
- ✅ **Scalable** - Can handle thousands of tenants
- ✅ **Feature parity** - All tenants get same features (controlled by plans)

## 🔒 Isolation Layers

### Layer 1: Row-Level Security (RLS)

All tenant tables have Postgres RLS policies enabled:

```sql
CREATE POLICY "Tenant isolation policy"
    ON works
    FOR ALL
    USING (tenant_id = (
        SELECT tenant_id
        FROM users
        WHERE id = auth.uid()
    ));
```

This is the **first line of defense** - database-level isolation.

### Layer 2: BaseTenantRepository

All repositories extend `BaseTenantRepository` which enforces `tenant_id`:

```typescript
export class BaseTenantRepository {
    protected requireTenantId(tenantId?: string): string {
        if (!tenantId) {
            throw new AppError(
                ErrorCode.TENANT_NOT_FOUND,
                'Tenant ID is required',
                400
            );
        }
        return tenantId;
    }
}
```

Every query MUST include the `tenant_id` filter:

```typescript
const { data } = await this.supabase
    .from('works')
    .select('*')
    .eq('tenant_id', tenantId) // Required!
    .eq('id', id);
```

This is the **second line of defense** - application-level enforcement.

### Layer 3: Request Context

Every request carries a `RequestContext` with `tenantId`:

```typescript
interface RequestContext {
    tenantId?: string;
    userId?: string;
    // ... other fields
}
```

The `SecurityPipeline` validates the tenant context before any business logic runs.

This is the **third line of defense** - request-level validation.

## 📊 Database Schema

### Core Tenant Tables

All tables that contain tenant data MUST have:

1. **tenant_id column** (UUID, NOT NULL)
2. **Foreign key** to `tenants` table
3. **Composite indexes** with `(tenant_id, ...)`
4. **RLS policies** enabled

Example:

```sql
CREATE TABLE works (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    -- other columns...
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Composite index for efficient tenant queries
CREATE INDEX idx_works_tenant_id ON works(tenant_id, created_at DESC);

-- Enable RLS
ALTER TABLE works ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Tenant isolation" ON works
    FOR ALL USING (tenant_id = (
        SELECT tenant_id FROM users WHERE id = auth.uid()
    ));
```

### Tenant Context Resolution

When a user logs in:

1. Supabase Auth validates the JWT token
2. We fetch the user's profile from the `users` table
3. The `tenant_id` is extracted and stored in the `RequestContext`
4. All subsequent queries use this `tenant_id`

```typescript
const { data: user } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('id', authUserId)
    .single();

const context: RequestContext = {
    userType: 'tenant',
    tenantId: user.tenant_id,
    userId: authUserId,
    // ...
};
```

## 🚫 Anti-Patterns (What NOT to do)

### ❌ DON'T: Query without tenant_id

```typescript
// WRONG - No tenant filter
const { data } = await supabase
    .from('works')
    .select('*')
    .eq('id', workId);
```

### ✅ DO: Always include tenant_id

```typescript
// CORRECT
const { data } = await supabase
    .from('works')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', workId);
```

### ❌ DON'T: Trust client-provided tenant_id

```typescript
// WRONG - Client could fake the tenant ID
const tenantId = req.body.tenant_id;
```

### ✅ DO: Use authenticated user's tenant_id

```typescript
// CORRECT - Get from authenticated session
const tenantId = context.tenantId;
```

### ❌ DON'T: Use Service Role for tenant queries

```typescript
// WRONG - Service role bypasses RLS!
const supabase = createClient(url, SERVICE_ROLE_KEY);
```

### ✅ DO: Use user's auth token

```typescript
// CORRECT - User's token enforces RLS
const token = req.headers.get('authorization');
const supabase = createClient(url, ANON_KEY, {
    global: { headers: { authorization: token } }
});
```

## 🧪 Testing Tenant Isolation

### Integration Test Example

```typescript
describe('Tenant Isolation', () => {
    it('should not allow access to other tenant data', async () => {
        const tenant1 = await createTenant('Tenant 1');
        const tenant2 = await createTenant('Tenant 2');
        
        const work1 = await createWork(tenant1.id, 'Work 1');
        
        // Try to access tenant1's work from tenant2's context
        const result = await getWork(tenant2.id, work1.id);
        
        expect(result).toBeNull(); // Should not find it
    });
});
```

## 🔧 Migration Guide

When adding a new tenant table:

1. **Add tenant_id column**:
   ```sql
   ALTER TABLE new_table ADD COLUMN tenant_id UUID NOT NULL;
   ```

2. **Add foreign key**:
   ```sql
   ALTER TABLE new_table
   ADD CONSTRAINT fk_new_table_tenant
   FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
   ```

3. **Create index**:
   ```sql
   CREATE INDEX idx_new_table_tenant
   ON new_table(tenant_id, created_at DESC);
   ```

4. **Enable RLS**:
   ```sql
   ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;
   ```

5. **Create policy**:
   ```sql
   CREATE POLICY "Tenant isolation"
   ON new_table FOR ALL
   USING (tenant_id = (
       SELECT tenant_id FROM users WHERE id = auth.uid()
   ));
   ```

6. **Create repository** extending `BaseTenantRepository`

7. **Test isolation** with integration tests

## 📝 Checklist for New Tenant Tables

- [ ] `tenant_id UUID NOT NULL` column added
- [ ] Foreign key to `tenants` table
- [ ] Composite index `(tenant_id, ...)`
- [ ] RLS enabled
- [ ] RLS policy created
- [ ] Repository extends `BaseTenantRepository`
- [ ] All queries include `.eq('tenant_id', tenantId)`
- [ ] Integration test for isolation

## 🎯 Benefits of This Approach

1. **Defense in Depth** - Multiple layers of protection
2. **Fail-Fast** - Errors early if tenant context missing
3. **Auditable** - Clear tenant in all logs
4. **Testable** - Easy to test isolation
5. **Scalable** - Proven pattern for thousands of tenants

## ⚠️ Important Notes

- **Service Role** should ONLY be used for:
  - SaaS admin operations
  - Background jobs that operate across tenants
  - System migrations
  
- **Never** expose Service Role key to frontend
- **Always** validate tenant context in Edge Functions
- **Log** all tenant context switches (e.g., impersonation)
- **Monitor** for any cross-tenant data access attempts

## 🔗 Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [SECURITY.md](./SECURITY.md) - Security best practices
- [SUPPORT.md](./SUPPORT.md) - Impersonation and support
