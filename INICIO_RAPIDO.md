# ⚡ INÍCIO RÁPIDO - 3 Passos Simples

## 🎯 O QUE VOCÊ TEM AGORA

Você implementou um **sistema SaaS multi-tenant completo** com:
- ✅ Isolamento de dados por empresa
- ✅ Sistema de assinaturas (trial, ativo, suspenso)
- ✅ Controle de funcionalidades por plano
- ✅ Permissões granulares por usuário
- ✅ Sistema de suporte com impersonation

**MAS PRECISA ATIVAR NO BANCO DE DADOS!**

---

## 📝 PASSO 1: EXECUTAR MIGRATION NO SUPABASE (5 min)

### 1. Acesse o Supabase Dashboard
👉 https://supabase.com/dashboard

### 2. Selecione o projeto "Obra 360"

### 3. Vá em SQL Editor (menu lateral)

### 4. Clique em "+ New query"

### 5. Copie e cole o conteúdo deste arquivo:
```
supabase/migrations/012_tenant_context_functions.sql
```

### 6. Clique em "Run" (ou Ctrl+Enter)

### 7. Aguarde a mensagem de sucesso ✅

**O que isso faz:**
- Cria funções para gerenciar o contexto de tenant
- Permite que o sistema saiba qual empresa está acessando
- Essencial para o isolamento de dados funcionar

---

## 🚀 PASSO 2: FAZER DEPLOY DAS EDGE FUNCTIONS (5 min)

### Opção A: Usando o Script Automático (RECOMENDADO)

1. Abra o terminal na pasta do projeto
2. Execute:
```bash
deploy-functions.bat
```

### Opção B: Manual

1. Instale o Supabase CLI (se ainda não tem):
```bash
npm install -g supabase
```

2. Faça login:
```bash
supabase login
```

3. Linke com o projeto:
```bash
supabase link --project-ref SEU_PROJECT_REF
```
*Encontre o PROJECT_REF em: Supabase Dashboard → Settings → General → Reference ID*

4. Deploy das functions:
```bash
supabase functions deploy tenant-users
supabase functions deploy tenant-roles
supabase functions deploy me
supabase functions deploy saas-subscriptions
supabase functions deploy saas-feature-overrides
supabase functions deploy saas-impersonate
```

---

## ✅ PASSO 3: VERIFICAR SE FUNCIONOU (2 min)

### 1. Verifique as Edge Functions no Dashboard

- Vá em: **Edge Functions** (menu lateral)
- Você deve ver 6 functions deployadas:
  - ✅ tenant-users
  - ✅ tenant-roles
  - ✅ me
  - ✅ saas-subscriptions
  - ✅ saas-feature-overrides
  - ✅ saas-impersonate

### 2. Teste a function `/me`

Abra o terminal e execute (substitua os valores):

```bash
curl -X GET "https://SEU_PROJECT.supabase.co/functions/v1/me" \
  -H "Authorization: Bearer SEU_ANON_KEY"
```

**Resultado esperado:**
- Se não estiver logado: `401 Unauthorized` ✅
- Se estiver logado: Retorna seus dados + tenant + features ✅

---

## 🎉 PRONTO! SISTEMA ATIVADO!

Agora você tem:
- ✅ Backend multi-tenant funcionando
- ✅ APIs de gerenciamento deployadas
- ✅ Sistema de segurança ativo

---

## 📚 PRÓXIMOS PASSOS

### 1. Integrar no Frontend

Você precisa atualizar o `AuthContext` para carregar:
- User
- Tenant
- Subscription
- Features
- Permissions

**Veja o guia completo em:** `GUIA_ATIVACAO_MULTITENANT.md`

### 2. Criar Guards no Frontend

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

### 3. Proteger Rotas

```typescript
function ProcurementPage() {
  const hasFeature = useFeatureGuard('PROCUREMENT');
  
  if (!hasFeature) {
    return <UpgradePrompt feature="Compras" />;
  }
  
  return <ProcurementContent />;
}
```

---

## 🧪 COMO TESTAR

### Teste 1: Isolamento de Tenant
1. Crie 2 contas (2 empresas diferentes)
2. Crie um projeto na empresa A
3. Logue na empresa B
4. **Resultado:** Empresa B não vê projetos da empresa A ✅

### Teste 2: Feature Gating
1. Desabilite uma feature via API
2. Tente acessar a funcionalidade
3. **Resultado:** Acesso bloqueado com mensagem de upgrade ✅

### Teste 3: Permissões
1. Crie um usuário com role "Viewer" (só leitura)
2. Tente criar um projeto
3. **Resultado:** Acesso negado ✅

---

## 🆘 PROBLEMAS?

### "Function not found"
**Solução:** Verifique se fez deploy das Edge Functions (Passo 2)

### "Permission denied"
**Solução:** Execute a migration do Passo 1

### "Tenant not found"
**Solução:** Verifique se o usuário tem `tenant_id` na tabela `users`

---

## 📞 DÚVIDAS?

Consulte o guia completo: `GUIA_ATIVACAO_MULTITENANT.md`

Ou veja a arquitetura: `supabase/SAAS_ARCHITECTURE.md`

---

**🚀 Boa sorte com o deploy!**
