# Obra360 - Feature Flags System

## 🎯 Overview

Obra360 uses a **feature flag system** to control access to modules and functionality at the tenant level. This enables:

- 📦 **Modular pricing** - Different plans include different features
- 🧪 **Beta testing** - Enable features for specific tenants
- 🔒 **Access control** - Temporarily enable/disable features
- ⏰ **Time-limited trials** - Grant temporary access to premium features

## 📊 How It Works

### Feature Definition

Features are defined in the `features` table:

```sql
CREATE TABLE features (
    id UUID PRIMARY KEY,
    feature_key TEXT UNIQUE NOT NULL,  -- e.g., 'CRM', 'PROJECTS'
    display_name TEXT NOT NULL,         -- e.g., 'CRM Module'
    description TEXT,
    category TEXT,                      -- e.g., 'module', 'addon', 'beta'
    is_active BOOLEAN DEFAULT true
);
```

### Plan Features

Plans include specific features via `plan_features`:

```sql
CREATE TABLE plan_features (
    id UUID PRIMARY KEY,
    plan_id UUID REFERENCES plans(id),
    feature_key TEXT NOT NULL,
    UNIQUE(plan_id, feature_key)
);
```

Example:
- **Free Plan**: PROJECTS
- **Pro Plan**: PROJECTS, CRM, INVENTORY
- **Enterprise Plan**: PROJECTS, CRM, INVENTORY, FINANCE, AI_CHAT

### Tenant Overrides

Individual tenants can have feature overrides via `tenant_feature_overrides`:

```sql
CREATE TABLE tenant_feature_overrides (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    feature_key TEXT NOT NULL,
    is_enabled BOOLEAN NOT NULL,
    reason TEXT,                        -- Why was this overridden?
    expires_at TIMESTAMPTZ,             -- Optional expiration
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,                    -- SaaS admin who created it
    UNIQUE(tenant_id, feature_key)
);
```

Use cases:
- Enable beta feature for specific tenant
- Give free trial of premium feature
- Temporarily disable problematic feature
- Grant access for demo purposes

## 🔍 Resolution Logic

The `FeatureResolverService` resolves features in this order:

1. **Check for valid override** (not expired)
   - If override exists and not expired → use override value
   - If override expired → ignore it

2. **Check plan features**
   - If feature in plan → enabled
   - If feature not in plan → disabled

### Example Resolution

```typescript
const resolver = new FeatureResolverService(supabase);

// Check if tenant has CRM feature
const hasCRM = await resolver.hasFeature(
    tenantId,
    planId,
    FeatureKeys.CRM
);

// Get all enabled features for tenant
const features = await resolver.getAllFeatures(tenantId, planId);
```

## 🛡️ Protecting Routes with Features

### In Edge Functions

```typescript
import { FeatureGuard } from '../_shared/security/feature.guard';
import { FeatureKeys } from '../_shared/constants/features';

// Apply feature guard
const featureGuard = new FeatureGuard(supabase);
await featureGuard.check(context, FeatureKeys.CRM);

// If feature disabled, throws:
// AppError(FEATURE_DISABLED, 'This feature is not available in your plan', 403)
```

### In Security Pipeline

```typescript
const pipeline = new SecurityPipeline(supabase);

await pipeline.checkTenant(context);
await pipeline.checkSubscription(context);
await pipeline.checkFeature(context, FeatureKeys.CRM);  // ← Feature check
await pipeline.checkPermission(context, 'CUSTOMER_VIEW');
```

## 🎨 Frontend Integration

### Feature-based Routing

```typescript
import { useAuth } from './contexts/AuthContext';
import { FeatureKeys } from './shared/constants/features';

function App() {
    const { hasFeature } = useAuth();

    return (
        <Routes>
            {hasFeature(FeatureKeys.CRM) && (
                <Route path="/crm" element={<CRMPage />} />
            )}
            {hasFeature(FeatureKeys.FINANCE) && (
                <Route path="/finance" element={<FinancePage />} />
            )}
        </Routes>
    );
}
```

### Feature-based Components

```typescript
function Dashboard() {
    const { hasFeature } = useAuth();

    return (
        <div>
            {hasFeature(FeatureKeys.AI_CHAT) && (
                <AIAssistantButton />
            )}
            
            {!hasFeature(FeatureKeys.REPORTS_EXPORT) && (
                <UpgradePrompt feature="Advanced Reports" />
            )}
        </div>
    );
}
```

## 📝 Available Features

### Modules

| Feature Key | Display Name | Description |
|------------|--------------|-------------|
| `CRM` | CRM Module | Customer relationship management |
| `PROJECTS` | Projects | Construction project management |
| `INVENTORY` | Inventory | Materials and stock management |
| `PROCUREMENT` | Procurement | Purchasing and suppliers |
| `FINANCE` | Finance | Financial management |
| `CONTRACTORS` | Contractors | Contractor management |

### Add-ons

| Feature Key | Display Name | Description |
|------------|--------------|-------------|
| `BUDGET_PDF` | PDF Export | Export budgets to PDF |
| `REPORTS_EXPORT` | Advanced Reports | Export detailed reports |
| `AI_CHAT` | AI Assistant | AI-powered chat assistant |
| `AI_RECEIPT` | Receipt Scanner | AI receipt scanning |

### Beta Features

| Feature Key | Display Name | Description |
|------------|--------------|-------------|
| `MOBILE_APP` | Mobile App | Access via mobile app |
| `INTEGRATIONS` | Integrations | Third-party integrations |

## 🔧 Managing Feature Overrides

### SaaS Admin Interface

Feature overrides are managed via the Dev Admin interface:

1. Go to **Tenants** tab
2. Click on a tenant
3. In the **Feature Overrides** section:
   - Toggle features on/off
   - Set expiration date (optional)
   - Add reason for override

### Via Edge Function

```typescript
// Enable CRM for tenant (30-day trial)
await supabase
    .from('tenant_feature_overrides')
    .insert({
        tenant_id: 'tenant-123',
        feature_key: 'CRM',
        is_enabled: true,
        reason: '30-day trial',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        created_by: saasUserId
    });
```

## 🧪 Testing Features

### Unit Test

```typescript
describe('FeatureResolver', () => {
    it('should respect tenant override', async () => {
        const resolver = new FeatureResolverService(mockSupabase);
        
        // CRM not in plan, but override enables it
        const hasCRM = await resolver.hasFeature(
            'tenant-123',
            'free-plan',
            FeatureKeys.CRM
        );
        
        expect(hasCRM).toBe(true);
    });
});
```

### Integration Test

```typescript
describe('Feature-protected route', () => {
    it('should block access when feature disabled', async () => {
        const response = await request(app)
            .get('/tenant/crm/customers')
            .set('Authorization', `Bearer ${token}`);
        
        expect(response.status).toBe(403);
        expect(response.body.code).toBe('FEATURE_DISABLED');
    });
});
```

## ✅ Best Practices

1. **Always check features at the API level** - Frontend checks are just UX, not security
2. **Use meaningful reasons** when creating overrides
3. **Set expiration dates** for trials and beta features
4. **Log override changes** in audit log
5. **Monitor feature usage** to inform product decisions
6. **Keep feature keys consistent** across frontend and backend

## 🚨 Common Pitfalls

### ❌ DON'T: Trust frontend feature checks for security

```typescript
// Frontend
if (hasFeature('FINANCE')) {
    // Show finance menu
}

// ❌ WRONG: API doesn't check feature
app.get('/finance/reports', async (req, res) => {
    // Anyone can access if they know the URL!
});
```

### ✅ DO: Always check on backend

```typescript
// ✅ CORRECT: API enforces feature check
app.get('/finance/reports', async (req, res) => {
    await featureGuard.check(context, FeatureKeys.FINANCE);
    // Now safe to proceed
});
```

## 🔗 Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [SECURITY.md](./SECURITY.md) - Security guards and pipeline
- [MODULES.md](./MODULES.md) - Creating feature-gated modules
