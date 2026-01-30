# Obra360 - API Documentation

## 🎯 Overview

This document provides comprehensive API documentation for both SaaS Admin and Tenant endpoints.

## 🔐 Authentication

All endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## 📋 SaaS Admin Endpoints (`/saas/*`)

### Authentication
- **POST** `/saas/impersonate` - Create impersonation session

### Tenants
- **GET** `/saas/tenants` - List all tenants
- **GET** `/saas/tenants/:id` - Get tenant details
- **POST** `/saas/tenants` - Create new tenant
- **PUT** `/saas/tenants/:id` - Update tenant
- **DELETE** `/saas/tenants/:id` - Delete tenant (soft delete)

### Subscriptions
- **GET** `/saas/subscriptions` - List all subscriptions
- **GET** `/saas/subscriptions/:id` - Get subscription details
- **PUT** `/saas/subscriptions/:id/status` - Update subscription status
- **PUT** `/saas/subscriptions/:id/plan` - Change subscription plan
- **PUT** `/saas/subscriptions/:id/extend-trial` - Extend trial period

### Feature Overrides
- **GET** `/saas/feature-overrides` - List all feature overrides
- **GET** `/saas/feature-overrides?tenant_id=:id` - Get overrides for tenant
- **POST** `/saas/feature-overrides` - Create/update feature override
- **DELETE** `/saas/feature-overrides/:id` - Delete feature override

### Plans
- **GET** `/saas/plans` - List all plans
- **GET** `/saas/plans/:id` - Get plan details
- **POST** `/saas/plans` - Create new plan
- **PUT** `/saas/plans/:id` - Update plan
- **DELETE** `/saas/plans/:id` - Delete plan

### Features
- **GET** `/saas/features` - List all features
- **GET** `/saas/features/:id` - Get feature details
- **POST** `/saas/features` - Create new feature
- **PUT** `/saas/features/:id` - Update feature
- **DELETE** `/saas/features/:id` - Delete feature

### Audit Logs (Planned)
- **GET** `/saas/audit-logs` - List audit logs with filters

## 👥 Tenant Endpoints (`/tenant/*`)

### User Context
- **GET** `/me` - Get current user context, features, and permissions

### Users
- **GET** `/tenant/users` - List users in tenant
- **GET** `/tenant/users/:id` - Get user details
- **POST** `/tenant/users` - Create new user (invite)
- **PUT** `/tenant/users/:id` - Update user
- **DELETE** `/tenant/users/:id` - Delete user

### Roles
- **GET** `/tenant/roles` - List roles in tenant
- **GET** `/tenant/roles/:id` - Get role details
- **POST** `/tenant/roles` - Create new role
- **PUT** `/tenant/roles/:id` - Update role
- **DELETE** `/tenant/roles/:id` - Delete role
- **GET** `/tenant/roles/:id/permissions` - Get role permissions
- **POST** `/tenant/roles/:id/permissions` - Update role permissions

### Works/Projects (Planned)
- **GET** `/tenant/works` - List works
- **POST** `/tenant/works` - Create work
- **PUT** `/tenant/works/:id` - Update work
- **DELETE** `/tenant/works/:id` - Delete work

## 📝 Request/Response Examples

### POST /saas/impersonate

**Request:**
```json
{
  "tenant_id": "uuid",
  "reason": "Troubleshooting billing issue"
}
```

**Response:**
```json
{
  "session_id": "uuid",
  "token": "jwt-token",
  "expires_at": "2024-01-30T12:45:00Z",
  "tenant": {
    "id": "uuid",
    "name": "Acme Corp",
    "status": "active"
  }
}
```

### PUT /saas/subscriptions/:id/status

**Request:**
```json
{
  "status": "active",
  "reason": "Payment received"
}
```

**Response:**
```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "plan_id": "uuid",
  "status": "active",
  "updated_at": "2024-01-30T12:00:00Z"
}
```

### POST /saas/feature-overrides

**Request:**
```json
{
  "tenant_id": "uuid",
  "feature_key": "CRM",
  "enabled": true,
  "reason": "30-day trial",
  "expires_at": "2024-02-30T23:59:59Z"
}
```

**Response:**
```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "feature_key": "CRM",
  "is_enabled": true,
  "reason": "30-day trial",
  "expires_at": "2024-02-30T23:59:59Z",
  "created_at": "2024-01-30T12:00:00Z",
  "created_by": "uuid"
}
```

### GET /me

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "tenant_id": "uuid"
  },
  "tenant": {
    "id": "uuid",
    "name": "Acme Corp",
    "status": "active"
  },
  "subscription": {
    "status": "active",
    "plan_id": "uuid",
    "trial_ends_at": null
  },
  "features": ["PROJECTS", "CRM", "INVENTORY"],
  "permissions": ["WORK_VIEW", "WORK_CREATE", "CUSTOMER_VIEW"],
  "role": "admin"
}
```

## ❌ Error Responses

All errors follow this format:

```json
{
  "code": "ERROR_CODE",
  "message": "User-friendly error message",
  "details": {},
  "traceId": "trace-id"
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Not authenticated |
| `FORBIDDEN` | 403 | Not authorized |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `SUBSCRIPTION_INACTIVE` | 403 | Subscription not active |
| `SUBSCRIPTION_CANCELED` | 403 | Subscription canceled |
| `SUBSCRIPTION_SUSPENDED` | 403 | Subscription suspended |
| `FEATURE_DISABLED` | 403 | Feature not available |
| `PERMISSION_DENIED` | 403 | Missing required permission |
| `TENANT_NOT_FOUND` | 404 | Tenant not found |
| `INTERNAL_ERROR` | 500 | Server error |

## 🔒 Security

### Guards Pipeline

Tenant endpoints go through this security pipeline:

1. **Authentication** - Validate JWT token
2. **Tenant Context** - Resolve tenant from user
3. **Subscription Guard** - Check subscription status
4. **Feature Guard** - Check feature is enabled
5. **RBAC Guard** - Check user has permission
6. **Handler** - Execute business logic

SaaS endpoints only require:

1. **SaaS Authentication** - Validate user is in `saas_users` table
2. **Handler** - Execute business logic

### Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `/saas/impersonate` | 10 per minute |
| Login endpoints | 5 per 15 minutes |
| Standard endpoints | 100 per minute |

## 📊 Pagination

List endpoints support pagination:

**Query Parameters:**
- `limit` - Number of items per page (default: 10, max: 100)
- `offset` - Number of items to skip

**Response:**
```json
{
  "data": [...],
  "total": 150,
  "limit": 10,
  "offset": 0
}
```

## 🔍 Filtering

List endpoints support filtering:

**Query Parameters:**
- `status` - Filter by status
- `search` - Search in name/email
- `created_after` - Filter by creation date
- `created_before` - Filter by creation date

## 📝 Additional Resources

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [SECURITY.md](./SECURITY.md) - Security details
- [FEATURES.md](./FEATURES.md) - Feature flags
- [SUPPORT.md](./SUPPORT.md) - Impersonation guide
