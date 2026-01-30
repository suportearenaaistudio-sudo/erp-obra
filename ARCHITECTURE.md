# Obra360 - System Architecture

## 🏗️ Overview

Obra360 is a multi-tenant SaaS platform for construction project management built on a modern, secure, and scalable architecture. The system is designed with **security by default**, strict **tenant isolation**, and **feature flags** for modular functionality.

## 🎯 Core Principles

### 1. Multi-Tenancy

- **Single Database, Shared Schema** approach with tenant isolation enforced at multiple levels
- **Row Level Security (RLS)** policies on all tenant tables
- **BaseTenantRepository** enforces `tenant_id` in all queries
- **Fail-fast** on missing tenant context

### 2. Security by Default

All tenant routes go through a **Security Pipeline**:

```
Auth → TenantContext → Subscription → Feature → RBAC → Handler
```

All SaaS admin routes:

```
SaasAuth → Handler
```

### 3. Feature Flags

- Features are defined in the `features` table
- Plans include specific features via `plan_features`
- Tenants can have **overrides** via `tenant_feature_overrides`
- Overrides can have expiration dates
- `FeatureResolverService` handles the complete resolution logic

### 4. RBAC (Role-Based Access Control)

- Permissions are granular and defined per action
- Users have roles, roles have permissions
- `RBACGuard` enforces permission checks
- Wildcard `*` permission grants admin access

## 📁 Project Structure

```
obra360/
├── src/
│   ├── shared/              # Shared infrastructure
│   │   ├── errors/          # Error handling (ErrorCode, AppError, ErrorHandler)
│   │   ├── logging/         # Logger and traceId
│   │   ├── security/        # Guards (Subscription, Feature, RBAC, Pipeline)
│   │   ├── features/        # FeatureResolverService
│   │   ├── validation/      # Zod validation utilities
│   │   ├── constants/       # Feature keys, Permissions
│   │   └── types/           # RequestContext and shared types
│   │
│   ├── saas/                # SaaS Admin (Dev Admin) layer
│   │   ├── components/      # SaaS UI components
│   │   └── pages/           # SaaS admin pages
│   │
│   ├── tenant/              # Tenant layer (not yet fully implemented)
│   │   └── ...
│   │
│   ├── modules/             # Business modules
│   │   ├── _template/       # Module template (DDD structure)
│   │   ├── crm/             # CRM module (placeholder)
│   │   ├── works/           # Works/Projects module
│   │   ├── inventory/       # Inventory module (placeholder)
│   │   ├── procurement/     # Procurement module (placeholder)
│   │   ├── finance/         # Finance module (placeholder)
│   │   └── ai/              # AI features (placeholder)
│   │
│   └── infra/
│       └── db/
│           └── repositories/ # BaseTenantRepository
│
├── supabase/
│   ├── functions/           # Edge Functions
│   │   ├── _shared/         # Shared code for Edge Functions (copy of src/shared)
│   │   ├── me/              # User context endpoint
│   │   ├── saas-*/          # SaaS admin endpoints
│   │   ├── tenant-*/        # Tenant endpoints
│   │   └── ai-*/            # AI endpoints
│   │
│   ├── migrations/          # Database migrations
│   └── sql/                 # SQL scripts (views, functions, RLS policies)
│
├── pages/                   # React pages
├── components/              # React components
└── tests/                   # Test suite
```

## 🔐 Security Architecture

### Request Flow for Tenant Routes

1. **Authentication** - Supabase Auth validates JWT token
2. **Tenant Context Resolution** - Extract `tenant_id` from user profile
3. **Subscription Check** - Validate subscription status (active, trialing)
4. **Feature Check** - Validate feature is enabled for tenant
5. **Permission Check** - Validate user has required permission
6. **Handler Execution** - Execute business logic

### Security Guards

#### SubscriptionGuard
- Checks tenant subscription status
- Blocks access if `canceled`, `suspended`, or trial expired
- Throws `SUBSCRIPTION_INACTIVE`, `SUBSCRIPTION_CANCELED`, or `SUBSCRIPTION_SUSPENDED`

#### FeatureGuard
- Checks if feature is enabled for tenant
- Resolves plan features + tenant overrides
- Respects expiration dates on overrides
- Throws `FEATURE_DISABLED` if not available

#### RBACGuard
- Checks if user has required permission
- Supports wildcard `*` for admin users
- Throws `PERMISSION_DENIED` if unauthorized

### SaaS Admin Security

- Separate authentication (not yet fully implemented - uses same auth currently)
- Only users in `saas_users` table can access
- No subscription or feature checks
- Full access to manage tenants, plans, features, and support

## 🗄️ Database Schema

### Core Tables

- **tenants** - Tenant information
- **subscriptions** - Tenant subscriptions linked to plans
- **plans** - Available subscription plans
- **features** - Feature catalog
- **plan_features** - Features included in each plan
- **tenant_feature_overrides** - Per-tenant feature overrides
- **users** - All users (tenant users)
- **saas_users** - SaaS admin users
- **user_roles** - User role assignments
- **roles** - Available roles per tenant
- **permissions** - Available permissions
- **role_permissions** - Permissions assigned to roles

### RLS Policies

All tenant tables have RLS enabled with policies that:
- Check `tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())`
- Prevent cross-tenant data access
- Use service role for admin operations

## 🔧 Module Architecture

Each module follows a **Domain-Driven Design (DDD)** structure:

```
module/
├── domain/              # Business entities and value objects
│   ├── entities/
│   └── value-objects/
├── usecases/            # Business logic
├── repositories/        # Data access interfaces
├── infra/               # Infrastructure implementations
│   └── db/
├── api/                 # HTTP handlers and routes
│   ├── handlers/
│   └── routes.ts
└── dto/                 # Validation schemas (Zod)
```

See [MODULES.md](./MODULES.md) for details on creating new modules.

## 🚀 Technology Stack

- **Frontend**: React, TypeScript, TailwindCSS
- **Backend**: Supabase Edge Functions (Deno)
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **Validation**: Zod
- **Testing**: Vitest
- **AI**: OpenAI GPT-4, Anthropic Claude

## 📊 Request Context

Every request includes a `RequestContext`:

```typescript
{
    userType: 'saas' | 'tenant',
    tenantId?: string,
    userId?: string,
    saasUserId?: string,
    planId?: string,
    role?: string,
    permissions?: string[],
    isImpersonation?: boolean,
    traceId: string
}
```

This context flows through the entire request pipeline and is used by all guards and business logic.

## 🔄 Feature Flag Resolution

Priority order:
1. **Expired Override** → Ignore
2. **Valid Override** → Use override value
3. **Plan Features** → Use plan default

This allows SaaS admins to:
- Enable beta features for specific tenants
- Temporarily disable features
- Set trial periods for premium features

## 📝 Error Handling

All errors follow a standard format:

```typescript
{
    code: ErrorCode,
    message: string,
    details?: any,
    traceId: string
}
```

`ErrorHandler` middleware converts all errors (AppError, Supabase, Zod) into this format with user-friendly messages in Portuguese.

## 🔍 Logging & Tracing

- Every request gets a unique `traceId`
- `Logger` class provides structured logging
- Logs include `traceId` for correlation
- Errors are logged with full context
- No sensitive data in logs

## 🧪 Testing Strategy

- **Unit Tests**: Guards, Services, Use Cases
- **Integration Tests**: Tenant isolation, Security pipeline
- **E2E Tests**: Full user flows (manual for now)

See [tests/](../tests/) for the test suite.

## 📖 Related Documentation

- [MODULES.md](./MODULES.md) - How to create new modules
- [FEATURES.md](./FEATURES.md) - Feature flags system
- [MULTI_TENANT.md](./MULTI_TENANT.md) - Multi-tenancy details
- [SECURITY.md](./SECURITY.md) - Security best practices
- [SUPPORT.md](./SUPPORT.md) - Support and impersonation
