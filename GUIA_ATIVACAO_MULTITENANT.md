# 🚀 GUIA DE ATIVAÇÃO - Sistema Multi-Tenant

## 📋 O QUE FOI IMPLEMENTADO

Você implementou um sistema SaaS completo com:
- ✅ **Isolamento de Tenants** (cada empresa vê só seus dados)
- ✅ **Sistema de Assinaturas** (trial, ativo, suspenso, cancelado)
- ✅ **Feature Flags** (controle de funcionalidades por plano)
- ✅ **RBAC** (controle de permissões por usuário)
- ✅ **Impersonation** (suporte pode logar como cliente)
- ✅ **Auditoria** (logs de todas as ações críticas)

**MAS AINDA NÃO ESTÁ ATIVO NO BANCO DE DADOS!**

---

## ⚡ PASSO 1: ATIVAR NO BANCO DE DADOS (15 minutos)

### 1.1 - Aplicar Migration de Contexto de Tenant

1. **Acesse o Supabase Dashboard:**
   - Vá em: https://supabase.com/dashboard
   - Selecione o projeto **Obra 360**

2. **Abra o SQL Editor:**
   - Menu lateral → **SQL Editor**
   - Clique em **+ New query**

3. **Execute a Migration:**
   - Copie TODO o conteúdo do arquivo: `supabase/migrations/012_tenant_context_functions.sql`
   - Cole no editor
   - Clique em **Run** (ou Ctrl+Enter)
   - ✅ Aguarde mensagem de sucesso

**O que isso faz:**
- Cria funções para gerenciar o contexto de tenant
- Permite que o sistema saiba qual empresa está acessando
- Essencial para o isolamento funcionar

---

### 1.2 - Verificar se já tem as Tabelas SaaS

Execute esta query no SQL Editor:

```sql
-- Verificar se as tabelas SaaS existem
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'tenants',
    'subscriptions',
    'plans',
    'features',
    'tenant_feature_overrides',
    'support_session_logs',
    'saas_users',
    'users',
    'roles',
    'role_permissions'
  )
ORDER BY table_name;
```

**Resultado esperado:** Deve listar 10 tabelas

**Se NÃO aparecer as tabelas:**
- Você precisa executar as migrations anteriores primeiro
- Execute: `supabase/migrations/002_saas_foundation.sql`
- Depois execute: `supabase/seeds/001_initial_data.sql`

---

## ⚡ PASSO 2: FAZER DEPLOY DAS EDGE FUNCTIONS (10 minutos)

Você tem 6 Edge Functions prontas que precisam ser deployadas:

### 2.1 - Instalar Supabase CLI (se ainda não tem)

```bash
npm install -g supabase
```

### 2.2 - Fazer Login no Supabase

```bash
supabase login
```

### 2.3 - Linkar com o Projeto

```bash
cd c:\Users\vitor\Downloads\obra360
supabase link --project-ref SEU_PROJECT_REF
```

**Como encontrar o PROJECT_REF:**
- No Supabase Dashboard
- Settings → General
- Copie o "Reference ID"

### 2.4 - Deploy das Functions

```bash
# Deploy todas de uma vez
supabase functions deploy tenant-users
supabase functions deploy tenant-roles
supabase functions deploy me
supabase functions deploy saas-subscriptions
supabase functions deploy saas-feature-overrides
supabase functions deploy saas-impersonate
```

**OU deploy todas de uma vez:**
```bash
supabase functions deploy
```

---

## ⚡ PASSO 3: TESTAR SE ESTÁ FUNCIONANDO (5 minutos)

### 3.1 - Testar a Function `/me`

1. **Pegue a URL da sua Edge Function:**
   - No Supabase Dashboard → Edge Functions
   - Copie a URL da function `me`
   - Exemplo: `https://SEU_PROJECT.supabase.co/functions/v1/me`

2. **Teste com cURL ou Postman:**

```bash
curl -X GET "https://SEU_PROJECT.supabase.co/functions/v1/me" \
  -H "Authorization: Bearer SEU_ANON_KEY"
```

**Resultado esperado:**
- Se não estiver logado: `401 Unauthorized`
- Se estiver logado: Retorna seus dados + tenant + features

---

### 3.2 - Testar Isolamento de Tenant

1. **Crie um projeto de teste:**

```sql
-- No SQL Editor
INSERT INTO projects (
  tenant_id,
  name,
  status
) VALUES (
  (SELECT id FROM tenants LIMIT 1),
  'Projeto Teste',
  'active'
);
```

2. **Tente acessar de outro tenant:**
   - O RLS deve bloquear automaticamente
   - Você só verá projetos do SEU tenant

---

## ⚡ PASSO 4: INTEGRAR NO FRONTEND (Próximo passo)

Agora que o backend está pronto, você precisa:

### 4.1 - Atualizar o AuthContext

O `AuthContext` precisa carregar:
- ✅ User
- ✅ Tenant
- ✅ Subscription
- ✅ Features (resolvidas)
- ✅ Permissions

**Arquivo:** `contexts/AuthContext.tsx`

### 4.2 - Criar Guards no Frontend

Você já tem os guards no backend (`lib/security-guards.ts`), agora precisa criar no frontend:

```typescript
// hooks/useFeatureGuard.ts
export function useFeatureGuard(featureKey: string) {
  const { features } = useAuth();
  return features.includes(featureKey);
}

// hooks/usePermission.ts
export function usePermission(permission: string) {
  const { permissions } = useAuth();
  return permissions.includes(permission);
}
```

### 4.3 - Proteger Rotas

```typescript
// Exemplo de rota protegida
function ProcurementPage() {
  const hasFeature = useFeatureGuard('PROCUREMENT');
  const hasPermission = usePermission('PROCUREMENT:READ');
  
  if (!hasFeature) {
    return <UpgradePrompt feature="Compras" />;
  }
  
  if (!hasPermission) {
    return <AccessDenied />;
  }
  
  return <ProcurementContent />;
}
```

---

## 🧪 CENÁRIOS DE TESTE

### Teste 1: Isolamento de Tenant ✅
**Objetivo:** Verificar que cada empresa vê só seus dados

**Como testar:**
1. Crie 2 contas diferentes (2 empresas)
2. Logue na empresa A
3. Crie um projeto
4. Logue na empresa B
5. Tente ver projetos
6. **Resultado esperado:** Empresa B não vê projetos da empresa A

---

### Teste 2: Subscription Gating ✅
**Objetivo:** Tenant suspenso não acessa o sistema

**Como testar:**
1. Logue como dev admin (`vitorpradotamos@gmail.com`)
2. Suspenda um tenant via API:
   ```bash
   curl -X PUT "https://SEU_PROJECT.supabase.co/functions/v1/saas/subscriptions/TENANT_ID/status" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"status": "suspended", "reason": "Teste"}'
   ```
3. Tente logar como usuário desse tenant
4. **Resultado esperado:** 403 SUBSCRIPTION_SUSPENDED

---

### Teste 3: Feature Gating ✅
**Objetivo:** Feature desabilitada bloqueia acesso

**Como testar:**
1. Desabilite uma feature via API:
   ```bash
   curl -X POST "https://SEU_PROJECT.supabase.co/functions/v1/saas/feature-overrides" \
     -H "Authorization: Bearer SEU_DEV_ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "tenant_id": "UUID_DO_TENANT",
       "feature_key": "CRM",
       "enabled": false,
       "reason": "Teste"
     }'
   ```
2. Logue como usuário desse tenant
3. Tente acessar `/crm`
4. **Resultado esperado:** 403 FEATURE_DISABLED

---

### Teste 4: RBAC ✅
**Objetivo:** Usuário sem permissão não pode fazer ação

**Como testar:**
1. Crie uma role "Viewer" com apenas `USERS:READ`
2. Atribua um usuário a essa role
3. Tente criar um usuário (precisa de `USERS:WRITE`)
4. **Resultado esperado:** 403 PERMISSION_DENIED

---

### Teste 5: Impersonation ✅
**Objetivo:** Dev admin pode logar como cliente

**Como testar:**
1. Logue como dev admin
2. Inicie impersonation:
   ```bash
   curl -X POST "https://SEU_PROJECT.supabase.co/functions/v1/saas/support/impersonate" \
     -H "Authorization: Bearer SEU_DEV_ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "tenant_id": "UUID_DO_TENANT",
       "user_id": "UUID_DO_USER",
       "reason": "Debug de erro X"
     }'
   ```
3. Use o token retornado para acessar dados do cliente
4. Verifique a tabela `support_session_logs`
5. **Resultado esperado:** Sessão criada com 15 min de duração

---

## 📊 CHECKLIST COMPLETO

### Backend (Banco de Dados)
- [ ] Migration `012_tenant_context_functions.sql` executada
- [ ] Tabelas SaaS existem (tenants, subscriptions, etc.)
- [ ] Dados iniciais inseridos (plans, features, roles)
- [ ] RLS habilitado em todas as tabelas

### Backend (Edge Functions)
- [ ] Supabase CLI instalado
- [ ] Projeto linkado
- [ ] 6 Edge Functions deployadas
- [ ] Functions testadas com cURL/Postman

### Frontend
- [ ] AuthContext atualizado com tenant/features/permissions
- [ ] Hooks de guards criados (useFeatureGuard, usePermission)
- [ ] Rotas protegidas implementadas
- [ ] UI condicional por role/feature

### Testes
- [ ] Teste de isolamento de tenant
- [ ] Teste de subscription gating
- [ ] Teste de feature gating
- [ ] Teste de RBAC
- [ ] Teste de impersonation

---

## 🎯 RESUMO - O QUE FAZER AGORA

**PRIORIDADE 1 (Fazer AGORA):**
1. ✅ Executar migration `012_tenant_context_functions.sql` no Supabase Dashboard
2. ✅ Verificar se as tabelas SaaS existem
3. ✅ Fazer deploy das Edge Functions

**PRIORIDADE 2 (Depois):**
4. ⏳ Atualizar o AuthContext no frontend
5. ⏳ Criar hooks de guards
6. ⏳ Proteger rotas

**PRIORIDADE 3 (Por último):**
7. ⏳ Testar todos os cenários
8. ⏳ Criar UI de upgrade para features bloqueadas

---

## 🆘 PROBLEMAS COMUNS

### "Function not found"
**Solução:** Verifique se fez deploy das Edge Functions

### "Permission denied"
**Solução:** Verifique se o RLS está configurado corretamente

### "Tenant not found"
**Solução:** Verifique se o usuário tem `tenant_id` na tabela `users`

### "Feature not available"
**Solução:** Verifique se a feature está no plano ou tem override

---

## 📞 PRÓXIMOS PASSOS

Depois de ativar tudo, você pode:
1. **Criar o painel de Dev Admin** - UI para gerenciar tenants/assinaturas
2. **Criar o painel de Tenant Admin** - UI para gerenciar usuários/roles
3. **Implementar billing** - Integração com Stripe/Mercado Pago
4. **Adicionar analytics** - Dashboard de uso por tenant

---

**🎉 Seu sistema multi-tenant está PRONTO para ser ativado!**

Comece pelo **PASSO 1** e me avise se tiver alguma dúvida! 🚀
