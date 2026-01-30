# Module Template

This directory serves as a **template** for creating new modules in the Obra360 platform. All new modules should follow this structure to maintain consistency, scalability, and maintainability.

## 📁 Directory Structure

```
_template/
├── domain/              # Business entities and value objects
│   ├── entities/        # Core business entities
│   └── value-objects/   # Value objects (immutable)
├── usecases/            # Business logic / services
├── repositories/        # Repository interfaces (contracts)
├── infra/               # Infrastructure implementations
│   └── db/              # Database implementations of repositories
├── api/                 # API routes and controllers
│   ├── handlers/        # Request handlers
│   └── routes.ts        # Route definitions
├── dto/                 # Data Transfer Objects & validation
└── README.md            # Module-specific documentation
```

## 🎯 Purpose

Each layer has a specific responsibility:

### Domain Layer (`domain/`)
- **Entities**: Core business objects with identity (e.g., `Customer`, `Project`)
- **Value Objects**: Immutable objects defined by their values (e.g., `Email`, `Money`)
- Pure TypeScript, no external dependencies
- Business rules and invariants

### Use Cases (`usecases/`)
- Application business logic
- Orchestrate domain entities and repositories
- Handle transactions and cross-cutting concerns
- Independent of delivery mechanism (HTTP, CLI, etc.)

### Repositories (`repositories/`)
- **Interfaces only** - contracts for data access
- Should NOT contain implementation details
- Enables dependency inversion and testability

### Infrastructure (`infra/`)
- Concrete implementations of repositories
- Database queries, external API calls
- Supabase client usage
- Must respect multi-tenant isolation (use `BaseTenantRepository`)

### API (`api/`)
- HTTP request handlers
- Route definitions
- Request validation (using DTOs)
- Response formatting
- Error handling

### DTOs (`dto/`)
- Zod schemas for validation
- Request/Response types
- Input validation and sanitization

## 🔐 Security by Default

Every module MUST implement:

1. **Tenant Isolation**: All repositories extend `BaseTenantRepository`
2. **Feature Flags**: Routes protected by `FeatureGuard`
3. **RBAC**: Actions protected by `RBACGuard`
4. **Subscription Check**: Routes protected by `SubscriptionGuard`
5. **Input Validation**: All inputs validated with Zod schemas

## 📝 How to Create a New Module

### Step 1: Copy Template
```bash
cp -r src/modules/_template src/modules/your-module-name
```

### Step 2: Define Domain
- Create entities in `domain/entities/`
- Create value objects if needed
- Define business rules

### Step 3: Define Repository Interface
- Create interface in `repositories/`
- Define all data access methods
- Use domain entities as types

### Step 4: Implement Repository
- Create implementation in `infra/db/`
- Extend `BaseTenantRepository`
- Implement interface methods

### Step 5: Create Use Cases
- Implement business logic in `usecases/`
- Inject repositories via constructor
- Handle transactions and validation

### Step 6: Define DTOs
- Create Zod schemas in `dto/`
- Export types for TypeScript

### Step 7: Create API Handlers
- Implement handlers in `api/handlers/`
- Use DTOs for validation
- Call use cases

### Step 8: Define Routes
- Create routes in `api/routes.ts`
- Apply guards (Feature, RBAC, Subscription)
- Wire handlers

### Step 9: Register Module
- Add to `ModuleRegistry` (if implemented)
- Add feature key to `features` table
- Add permissions to `permissions` table

## 🏗️ Example: Works Module

For reference, see the **Works** module which follows this template:
- Entities: `Work`, `WorkPhase`, `WorkTask`
- Repositories: `WorksRepository`, `WorkPhasesRepository`
- Use Cases: `CreateWork`, `UpdateWorkProgress`
- API: `/tenant/works/*`

## ✅ Checklist for New Module

- [ ] Domain entities created
- [ ] Repository interface defined
- [ ] Repository implementation with tenant isolation
- [ ] Use cases implemented
- [ ] DTOs created with Zod validation
- [ ] API handlers implemented
- [ ] Routes defined with guards
- [ ] Feature flag added to database
- [ ] Permissions added to database
- [ ] Module registered in registry
- [ ] README.md created for module
- [ ] Unit tests written
- [ ] Integration tests written

## 🔗 Related Documentation

- [ARCHITECTURE.md](../../ARCHITECTURE.md) - System architecture overview
- [MULTI_TENANT.md](../../MULTI_TENANT.md) - Multi-tenant implementation
- [FEATURES.md](../../FEATURES.md) - Feature flags system
- [SECURITY.md](../../SECURITY.md) - Security guidelines
