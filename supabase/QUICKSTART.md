# 🚀 Guia Rápido - Setup SaaS Multi-tenant

## ✅ Checklist de Execução

### Passo 1: Executar Migration Principal (10 min)

1. Acesse [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto **Obra 360**
3. Vá em **SQL Editor**
4. Clique em **+ New query**
5. Abra o arquivo `supabase/migrations/002_saas_foundation.sql`
6. **Copie TODO o conteúdo**
7. **Cole** no editor SQL
8. Clique em **Run** (ou Ctrl+Enter)
9. Aguarde a mensagem de sucesso

**O que foi criado:**
- ✅ 7 tabelas globais (SaaS)
- ✅ 3 tabelas por tenant (users, roles, permissions)
- ✅ 13 tabelas de negócio (projects, clients, etc.)
- ✅ Todas com `tenant_id`
- ✅ RLS habilitado
- ✅ Indexes otimizados
- ✅ Triggers automáticos

---

### Passo 2: Inserir Dados Iniciais (2 min)

1. No mesmo **SQL Editor**
2. **Nova query**
3. Abra `supabase/seeds/001_initial_data.sql`
4. **Copie e cole**
5. **Run**

**O que foi criado:**
- ✅ 1 Dev Admin (admin@obra360.com)
- ✅ 1 Support (suporte@obra360.com)
- ✅ 12 features no catálogo
- ✅ 3 planos (Starter, Pro, Enterprise)
- ✅ 1 tenant de demonstração ("Construtora Demo")
- ✅ 1 subscription trial (Pro, 14 dias)
- ✅ 5 roles padrão (Admin, Financeiro, Obras, Compras, Vendas)
- ✅ Permissões configuradas
- ✅ 1 feature override de exemplo (AI beta)

---

### Passo 3: Verificar se funcionou (1 min)

1. Vá em **Table Editor** no menu lateral
2. Você deve ver TODAS essas tabelas:

#### Tabelas Globais (SaaS):
- saas_users
- plans
- features
- tenants
- subscriptions
- tenant_feature_overrides
- support_session_logs

#### Tabelas por Tenant:
- users
- roles
- role_permissions

#### Tabelas de Negócio:
- clients
- deals
- projects
- project_phases
- budget_line_items
- materials
- suppliers
- procurement_orders
- procurement_order_items
- contractors
- contracts
- measurements
- financial_records

#### Auditoria:
- audit_logs

---

### Passo 4: Testar Dados (1 min)

**Query de teste:**

```sql
-- Ver planos criados
SELECT * FROM plans;

-- Ver features
SELECT * FROM features ORDER BY category, display_name;

-- Ver tenant demo
SELECT * FROM tenants;

-- Ver subscription do tenant demo
SELECT 
  t.name as empresa,
  p.display_name as plano,
  s.status,
  s.trial_end
FROM subscriptions s
JOIN tenants t ON s.tenant_id = t.id
JOIN plans p ON s.plan_id = p.id;

-- Ver roles do tenant demo
SELECT * FROM roles WHERE tenant_id = (SELECT id FROM tenants LIMIT 1);

-- Ver permissões do Admin
SELECT 
  r.name as role,
  rp.permission_key
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
WHERE r.name = 'Admin'
ORDER BY rp.permission_key;
```

---

## 📊 Dados de Teste Criados

### Dev Admins:
- **admin@obra360.com** (role: dev_admin)
- **suporte@obra360.com** (role: support)

### Tenant Demo:
- **Nome:** Construtora Demo LTDA
- **Slug:** construtora-demo
- **CNPJ:** 12.345.678/0001-90
- **Status:** active

### Subscription:
- **Plano:** Pro (trial)
- **Status:** trial
- **Trial até:** 14 dias a partir de hoje
- **Limites:** 10 users, 50 projetos, 20 GB

### Roles Padrão:
1. **Admin** - Acesso total (tenant admin)
2. **Financeiro** - Apenas finanças
3. **Gestor de Obras** - Projetos + estoque (read)
4. **Compras** - Estoque + pedidos
5. **Vendas** - CRM

---

## 🎯 Próximos Passos no Frontend

### 1. Criar AuthContext com Multi-tenancy

```typescript
// contexts/AuthContext.tsx
interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  subscription: Subscription | null;
  features: string[]; // Features resolvidas
  permissions: string[]; // Permissões do user
  hasFeature: (featureKey: string) => boolean;
  hasPermission: (permission: string) => boolean;
  signUp: (...) => Promise<...>;
  signIn: (...) => Promise<...>;
  signOut: () => Promise<void>;
}
```

### 2. Signup Flow

```javascript
async function signUp(email, password, name, companyName) {
  // 1. Criar tenant
  const tenant = await createTenant({ name: companyName, ... });
  
  // 2. Criar subscription (trial)
  const subscription = await createSubscription({
    tenantId: tenant.id,
    planId: STARTER_PLAN_ID,
    status: 'trial'
  });
  
  // 3. Criar roles padrão
  await createDefaultRoles(tenant.id);
  
  // 4. Criar auth user
  const { user } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        tenant_id: tenant.id
      }
    }
  });
  
  // 5. Trigger automático cria user em public.users
  
  return { tenant, user };
}
```

### 3. Feature Guard (Hook)

```typescript
function useFeatureGuard(featureKey: string) {
  const { features, subscription } = useAuth();
  
  const isEnabled = features.includes(featureKey);
  const plan = subscription?.plan;
  
  return {
    isEnabled,
    reason: !isEnabled ? `Feature disponível no plano ${plan.upgrade_to}` : null,
    upgradeUrl: `/settings/billing?upgrade=${featureKey}`
  };
}

// Uso:
function ProcurementPage() {
  const { isEnabled, reason } = useFeatureGuard('PROCUREMENT');
  
  if (!isEnabled) {
    return <UpgradePrompt feature="Compras" reason={reason} />;
  }
  
  return <ProcurementContent />;
}
```

### 4. Permission Guard (Hook)

```typescript
function usePermission(permission: string) {
  const { permissions } = useAuth();
  return permissions.includes(permission);
}

// Uso:
function ClientsPage() {
  const canWrite = usePermission('CLIENTS:WRITE');
  
  return (
    <>
      <ClientsList />
      {canWrite && <CreateClientButton />}
    </>
  );
}
```

---

## 🛡️ Guards Combinados

```typescript
function useCan(permission: string, featureKey?: string) {
  const { permissions, features } = useAuth();
  
  const hasPermission = permissions.includes(permission);
  const hasFeature = !featureKey || features.includes(featureKey);
  
  return {
    can: hasPermission && hasFeature,
    reason: !hasPermission ? 'Sem permissão' : !hasFeature ? 'Feature não disponível' : null
  };
}

// Uso:
function FinanceApprovePage() {
  const { can, reason } = useCan('FINANCE:APPROVE', 'FINANCE');
  
  if (!can) {
    return <AccessDenied reason={reason} />;
  }
  
  return <ApprovalWorkflow />;
}
```

---

## 📈 Resolução de Features

```typescript
// services/featureResolver.ts
export async function resolveFeatures(tenantId: string): Promise<string[]> {
  // 1. Buscar subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*, plan:plans(*)')
    .eq('tenant_id', tenantId)
    .single();
  
  // 2. Features do plano
  let features = [...subscription.plan.included_features];
  
  // 3. Buscar overrides
  const { data: overrides } = await supabase
    .from('tenant_feature_overrides')
    .select('*')
    .eq('tenant_id', tenantId)
    .or('expires_at.is.null,expires_at.gt.now()'); // Não expirados
  
  // 4. Aplicar overrides
  for (const override of overrides || []) {
    if (override.enabled) {
      features.push(override.feature_key);
    } else {
      features = features.filter(f => f !== override.feature_key);
    }
  }
  
  // 5. Unique
  return [...new Set(features)];
}
```

---

## 🔒 Subscription Guard

```typescript
// middleware/subscriptionGuard.ts
export function useSubscriptionGuard() {
  const { subscription } = useAuth();
  
  const isActive = ['trial', 'active'].includes(subscription?.status);
  const isPastDue = subscription?.status === 'past_due';
  const isSuspended = subscription?.status === 'suspended';
  const isCanceled = subscription?.status === 'canceled';
  
  return {
    canRead: !isCanceled, // Bloqueado total se cancelado
    canWrite: isActive || isPastDue, // Só escreve se ativo ou past_due
    status: subscription?.status,
    message: isSuspended ? 'Assinatura suspensa. Entre em contato.' : 
             isCanceled ? 'Assinatura cancelada.' : null
  };
}
```

---

## ✅ Checklist Final

Após executar migrations e seeds:

- [x] ✅ Tabelas criadas no Supabase
- [x] ✅ RLS habilitado
- [x] ✅ Planos criados
- [x] ✅ Features catalogadas
- [x] ✅ Tenant demo criado
- [x] ✅ Roles e permissões configuradas
- [ ] ⏳ AuthContext implementado no frontend
- [ ] ⏳ Signup flow com multi-tenancy
- [ ] ⏳ Feature guards implementados
- [ ] ⏳ Permission guards implementados
- [ ] ⏳ Subscription guards implementados
- [ ] ⏳ UI condicional por role/feature

---

## 🎉 Pronto!

A fundação SaaS está completamente implementada no banco de dados!

**Próximo passo:** Implementar o frontend (AuthContext, guards, signup flow)

**Quer que eu continue implementando o frontend agora?** 🚀
