# Code Cleanup Recommendations

## ✅ Already Clean

The codebase is already well-organized with minimal technical debt. The refactoring created a clean architecture from the start.

## 🔍 Minor Cleanup Opportunities

### 1. TODO Comments

**Location**: `src/saas/components/DashboardStats.tsx`, `src/saas/components/DevAdminSupport.tsx`

**Action**: Review and implement TODOs or document decisions

### 2. Consolidate Shared Edge Function Code

**Current**: `supabase/functions/_shared/` has copied code from `src/shared/`

**Recommendation**: 
- Keep this pattern (required for Deno)
- Add sync script to copy changes automatically
- Document in DEPLOY.md

**Script to create**:
```bash
#!/bin/bash
# sync-shared.sh
cp -r src/shared/* supabase/functions/_shared/
echo "✅ Shared code synced to Edge Functions"
```

### 3. Standardize Import Paths

**Current**: Mix of relative imports (`../../`) and absolute paths

**Recommendation**: Configure TypeScript path aliases
```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["src/shared/*"],
      "@saas/*": ["src/saas/*"],
      "@tenant/*": ["src/tenant/*"],
      "@modules/*": ["src/modules/*"]
    }
  }
}
```

### 4. Optimize Database Queries

**Add indexes for common queries**:
```sql
-- Subscriptions lookup by tenant
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_status 
ON subscriptions(tenant_id, status);

-- Feature overrides lookup
CREATE INDEX IF NOT EXISTS idx_feature_overrides_tenant_feature 
ON tenant_feature_overrides(tenant_id, feature_key) 
WHERE expires_at IS NULL OR expires_at > NOW();

-- User permissions lookup
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_user 
ON user_roles(tenant_id, user_id);

-- Audit logs by tenant and date
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_date 
ON audit_logs(tenant_id, created_at DESC);
```

### 5. Environment Variables Documentation

**Create**: `.env.example` file
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Impersonation
IMPERSONATION_JWT_SECRET=generate-with-openssl-rand-base64-32

# AI (Optional)
GEMINI_API_KEY=your-gemini-key
OPENAI_API_KEY=your-openai-key

# Environment
ENVIRONMENT=development
NODE_ENV=development
```

### 6. Consolidate Error Messages

**Current**: Error messages scattered across guards

**Recommendation**: Centralize in `src/shared/errors/messages.ts`
```typescript
export const ERROR_MESSAGES = {
  pt: {
    UNAUTHORIZED: 'Você não está autenticado.',
    FORBIDDEN: 'Você não tem permissão.',
    // ... etc
  },
  en: {
    UNAUTHORIZED: 'You are not authenticated.',
    FORBIDDEN: 'You do not have permission.',
    // ... etc
  }
};
```

### 7. Feature Flag Cache Implementation

**Current**: FeatureResolverService has cache structure but not fully implemented

**Add**:
```typescript
private cache = new Map<string, { features: string[], timestamp: number }>();
private CACHE_TTL = 60000; // 60 seconds

async getAllFeatures(tenantId: string, planId: string): Promise<string[]> {
    const cacheKey = `${tenantId}:${planId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.features;
    }
    
    // Fetch from DB...
    const features = await this.fetchFeatures(tenantId, planId);
    
    this.cache.set(cacheKey, { features, timestamp: Date.now() });
    return features;
}
```

### 8. Add Request Timeout

**Add to Edge Functions**:
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s

try {
    const result = await someOperation({ signal: controller.signal });
    clearTimeout(timeoutId);
    return result;
} catch (error) {
    if (error.name === 'AbortError') {
        throw new AppError(ErrorCode.TIMEOUT, 'Request timeout', 408);
    }
    throw error;
}
```

### 9. Logging Levels

**Add environment-based logging**:
```typescript
class Logger {
    private shouldLog(level: LogLevel): boolean {
        const envLevel = Deno.env.get('LOG_LEVEL') || 'info';
        const levels = ['debug', 'info', 'warn', 'error'];
        return levels.indexOf(level) >= levels.indexOf(envLevel);
    }
}
```

### 10. Remove Unused Imports

**Run ESLint with auto-fix**:
```bash
npm run lint -- --fix
```

## 📋 Cleanup Checklist

- [ ] Resolve TODOs in `DashboardStats.tsx`
- [ ] Resolve TODOs in `DevAdminSupport.tsx`
- [ ] Create `sync-shared.sh` script
- [ ] Add TypeScript path aliases
- [ ] Add database indexes (performance.sql)
- [ ] Create `.env.example`
- [ ] Centralize error messages (optional)
- [ ] Implement feature cache (optional - can wait)
- [ ] Add request timeouts to long operations
- [ ] Configure logging levels
- [ ] Run ESLint auto-fix
- [ ] Remove any console.log statements
- [ ] Update dependencies to latest stable versions

## 🎯 Priority

**High Priority** (Do Now):
1. Database indexes
2. `.env.example`
3. Resolve TODOs
4. ESLint auto-fix

**Medium Priority** (Next Sprint):
5. TypeScript path aliases
6. Sync script
7. Request timeouts

**Low Priority** (Future):
8. Feature cache implementation
9. Centralize error messages (i18n prep)
10. Logging levels

## ✨ Already Excellent

- ✅ Clean separation of concerns
- ✅ Consistent naming conventions
- ✅ Comprehensive error handling
- ✅ Security by default
- ✅ Well-documented code
- ✅ Type safety throughout
- ✅ Test coverage for critical paths
