# Obra360 - Migration Guide

## 🎯 Overview

This guide helps you migrate existing code to the new refactored architecture. The refactoring is designed to be **incremental** with **no breaking changes** for end users.

## 📋 Breaking Changes

### ✅ None for End Users

All existing functionality continues to work. Users will see:
- Same login flow
- Same features (unless disabled by plan)
- Same UI components
- Same data

### ⚠️ For Developers

If you've been working on the codebase, here are the changes:

#### 1. Import Paths Changed

**Before:**
```typescript
import { AppError } from './errors';
import { FeatureKeys } from './constants';
```

**After:**
```typescript
import { AppError, ErrorCode } from '../shared/errors/errors';
import { FeatureKeys } from '../shared/constants/features';
```

#### 2. Security Guards Must Be Used

**Before:** Ad-hoc permission checks scattered in code
```typescript
if (user.role === 'admin') {
    // Do something
}
```

**After:** Use security pipeline
```typescript
import { SecurityPipeline } from '../shared/security/pipeline';

const pipeline = new SecurityPipeline(supabase);
await pipeline.checkPermission(context, 'CUSTOMER_CREATE');
```

#### 3. Error Handling Standardized

**Before:** Inconsistent error responses
```typescript
throw new Error('Not found');
return { error: 'Something went wrong' };
```

**After:** Use AppError
```typescript
import { AppError, ErrorCode } from '../shared/errors/errors';

throw new AppError(ErrorCode.NOT_FOUND, 'Customer not found', 404);
```

#### 4. Repositories Must Extend BaseTenantRepository

**Before:** Direct Supabase queries
```typescript
const { data } = await supabase
    .from('works')
    .select('*')
    .eq('id', workId);
```

**After:** Use repository with tenant enforcement
```typescript
import { BaseTenantRepository } from '../infra/db/repositories/base.repository';

class WorkRepository extends BaseTenantRepository {
    async getById(tenantId: string, workId: string) {
        tenantId = this.requireTenantId(tenantId);
        
        const { data } = await this.supabase
            .from('works')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('id', workId)
            .single();
        
        return data;
    }
}
```

## 🔄 Migration Steps

### Step 1: Update Edge Functions

Replace old edge functions with new structure:

```typescript
// Old way
Deno.serve(async (req) => {
    const supabase = createClient(...);
    const { data } = await supabase.from('works').select('*');
    return new Response(JSON.stringify(data));
});

// New way
import { ErrorHandler } from '../_shared/errors/error-handler';
import { SecurityPipeline } from '../_shared/security/pipeline';

Deno.serve(async (req) => {
    return ErrorHandler.handle(req, async () => {
        const supabase = createClient(...);
        const context = await buildContext(req);
        
        const pipeline = new SecurityPipeline(supabase);
        await pipeline.checkTenant(context);
        await pipeline.checkSubscription(context);
        
        const { data } = await supabase
            .from('works')
            .select('*')
            .eq('tenant_id', context.tenantId);
        
        return { data };
    });
});
```

### Step 2: Update Frontend Feature Checks

Replace ad-hoc feature checks with hooks:

```tsx
// Old way
{user.plan === 'pro' && <CRMModule />}

// New way
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { FeatureKeys } from '../shared/constants/features';

function Dashboard() {
    const { hasFeature } = useFeatureFlags();
    
    return (
        <div>
            {hasFeature(FeatureKeys.CRM) && <CRMModule />}
        </div>
    );
}
```

### Step 3: Add Database Indexes

Run the performance optimization SQL:

```bash
psql $DATABASE_URL < supabase/sql/performance_indexes.sql
```

### Step 4: Sync Shared Code

When you update code in `src/shared/`, sync to Edge Functions:

```bash
./scripts/sync-shared.sh
```

Then redeploy Edge Functions:

```bash
supabase functions deploy
```

## ✅ Validation Checklist

After migration, verify:

- [ ] All existing features still work
- [ ] Login/logout works
- [ ] Users can access their data
- [ ] Permissions are enforced
- [ ] Feature flags work
- [ ] No console errors
- [ ] API responses are fast
- [ ] Database queries include `tenant_id`

## 🚨 Common Issues

### Issue: "tenant_id is required" error

**Problem:** Query doesn't include tenant_id

**Solution:** Use repository pattern or add `.eq('tenant_id', context.tenantId)`

### Issue: Feature shows even when disabled

**Problem:** Frontend feature check but no backend guard

**Solution:** Add `FeatureGuard` to the API endpoint

### Issue: Cross-tenant data visible

**Problem:** RLS policy not enforced or service role used incorrectly

**Solution:** 
1. Check RLS is enabled: `ALTER TABLE works ENABLE ROW LEVEL SECURITY;`
2. Use user token, not service role for tenant queries

### Issue: "FEATURE_DISABLED" error

**Problem:** Feature not in plan or override disabled it

**Solution:** Check feature overrides in Dev Admin

## 📞 Support

If you encounter issues during migration:

1. Check `VALIDATION_CHECKLIST.md`
2. Review error logs with `traceId`
3. Check audit logs for security issues
4. Consult architecture docs

## 🔗 Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System overview
- [MULTI_TENANT.md](./MULTI_TENANT.md) - Multi-tenancy guide
- [FEATURES.md](./FEATURES.md) - Feature flags
- [SECURITY.md](./SECURITY.md) - Security guards
- [API.md](./API.md) - API endpoints
