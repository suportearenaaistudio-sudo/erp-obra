# 🧪 GUIA DE TESTES - Interface Multi-Tenant

## 🎯 **COMO TESTAR AGORA**

Você já está rodando `npm run dev`, então vamos testar!

---

## 📍 **PASSO 1: Acessar a Página de Testes**

1. **Abra o navegador** em: http://localhost:5173
2. **Faça login** (ou crie uma conta se ainda não tiver)
3. **Acesse a página de testes**: http://localhost:5173/#/test-multitenant

**Ou adicione um link no menu:**
- Edite o `Layout.tsx` ou `Sidebar.tsx`
- Adicione um link para `/test-multitenant`

---

## 🧪 **O QUE VOCÊ VAI VER NA PÁGINA DE TESTES**

A página mostra:

### **📊 Informações do Sistema**
- ✅ Dados do usuário (email, nome, role)
- ✅ Dados da empresa (nome, slug, status)
- ✅ Dados da assinatura (plano, status, trial)
- ✅ Features ativas (lista completa)
- ✅ Permissões do usuário (lista completa)

### **🧪 Testes Automáticos**
1. **Feature Gate - CRM**: Mostra se você tem acesso
2. **Feature Gate - PROCUREMENT**: Mostra se você tem acesso
3. **Feature Gate - AI_CHAT**: Mostra se você tem acesso (Enterprise only)
4. **Permission Gate - CLIENTS:WRITE**: Mostra se você pode criar clientes
5. **Permission Gate - FINANCE:APPROVE**: Mostra se você pode aprovar finanças
6. **Write Guard**: Formulário que bloqueia se assinatura suspensa
7. **UI Condicional**: Botões que aparecem/desaparecem

---

## 🎭 **CENÁRIOS DE TESTE**

### **TESTE 1: Verificar Features do Plano** ✅

**O que fazer:**
1. Acesse `/test-multitenant`
2. Veja a seção "Features Ativas"
3. Veja os testes de Feature Gate

**O que esperar:**
- Se você está no plano **Starter**: Só verá PROJECTS, INVENTORY, FINANCE
- Se você está no plano **Pro**: Verá CRM, PROCUREMENT, CONTRACTORS, etc.
- Se você está no plano **Enterprise**: Verá AI_CHAT, AI_RECEIPT

**Como testar upgrade:**
- Features que você NÃO tem mostrarão um **prompt de upgrade** com botão

---

### **TESTE 2: Verificar Permissões** 🔐

**O que fazer:**
1. Veja a seção "Permissões"
2. Veja os testes de Permission Gate

**O que esperar:**
- Se você é **Admin**: Verá TODAS as permissões
- Se você é **Financeiro**: Verá apenas FINANCE:READ, FINANCE:WRITE
- Se você é **Vendas**: Verá apenas CLIENTS:READ, CLIENTS:WRITE

**Como testar:**
1. Crie um usuário com role "Financeiro"
2. Faça login com esse usuário
3. Acesse `/test-multitenant`
4. Veja que só tem permissões de finanças

---

### **TESTE 3: Bloquear Assinatura Suspensa** 🚫

**O que fazer:**
1. Como **Dev Admin**, suspenda seu tenant:
   - Vá no Supabase Dashboard → SQL Editor
   - Execute:
   ```sql
   UPDATE subscriptions 
   SET status = 'suspended' 
   WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'SEU_SLUG');
   ```
2. Recarregue a página `/test-multitenant`

**O que esperar:**
- ✅ Banner vermelho aparece no topo: "Assinatura suspensa"
- ✅ Formulário na seção "Write Guard" fica bloqueado (overlay cinza)
- ✅ Mensagem: "Ação bloqueada - Assinatura inativa"

**Para reverter:**
```sql
UPDATE subscriptions 
SET status = 'active' 
WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'SEU_SLUG');
```

---

### **TESTE 4: Desabilitar Feature** 🎛️

**O que fazer:**
1. Como **Dev Admin**, desabilite uma feature:
   - Vá no Supabase Dashboard → SQL Editor
   - Execute:
   ```sql
   INSERT INTO tenant_feature_overrides (
     tenant_id, 
     feature_key, 
     enabled, 
     reason
   ) VALUES (
     (SELECT id FROM tenants WHERE slug = 'SEU_SLUG'),
     'CRM',
     false,
     'Teste de bloqueio'
   );
   ```
2. Recarregue a página `/test-multitenant`

**O que esperar:**
- ✅ Feature "CRM" NÃO aparece mais na lista de features ativas
- ✅ Teste de Feature Gate - CRM mostra **prompt de upgrade**
- ✅ Mensagem: "Feature não disponível no seu plano"

**Para reverter:**
```sql
DELETE FROM tenant_feature_overrides 
WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'SEU_SLUG')
  AND feature_key = 'CRM';
```

---

### **TESTE 5: Criar Usuário com Role Diferente** 👥

**O que fazer:**
1. Como **Tenant Admin**, crie um novo usuário:
   - Vá em `/admin` (página de Tenant Admin)
   - Crie um usuário com role "Vendas"
2. Faça login com esse novo usuário
3. Acesse `/test-multitenant`

**O que esperar:**
- ✅ Permissões mostram apenas: CLIENTS:READ, CLIENTS:WRITE
- ✅ Testes de Permission Gate para FINANCE:APPROVE mostram **Acesso Negado**
- ✅ Botões condicionais de outras áreas NÃO aparecem

---

## 📱 **TESTAR EM PÁGINAS REAIS**

Depois de ver tudo funcionando na página de testes, aplique nas páginas reais:

### **Exemplo: Proteger página de Compras**

Edite `pages/Procurement.tsx`:

```typescript
import { FeatureGate } from '../components/FeatureGate';

export function Procurement() {
  return (
    <FeatureGate feature="PROCUREMENT">
      {/* Conteúdo original da página */}
    </FeatureGate>
  );
}
```

**Teste:**
1. Acesse `/procurement`
2. Se não tiver a feature → Mostra prompt de upgrade
3. Se tiver a feature → Mostra a página normalmente

---

### **Exemplo: Proteger botão de criar cliente**

Edite `pages/CRM.tsx`:

```typescript
import { IfPermission } from '../components/PermissionGate';

export function CRM() {
  return (
    <div>
      <h1>CRM</h1>
      
      <IfPermission permission="CLIENTS:WRITE">
        <button onClick={handleCreateClient}>
          Novo Cliente
        </button>
      </IfPermission>
      
      {/* Lista de clientes */}
    </div>
  );
}
```

**Teste:**
1. Faça login como Admin → Botão aparece
2. Faça login como usuário sem permissão → Botão NÃO aparece

---

### **Exemplo: Adicionar banner de assinatura**

Edite `components/Layout.tsx`:

```typescript
import { SubscriptionBanner } from './SubscriptionGuards';

export function Layout() {
  return (
    <div>
      <Sidebar />
      <main>
        <SubscriptionBanner />
        {/* Resto do conteúdo */}
      </main>
    </div>
  );
}
```

**Teste:**
1. Suspenda a assinatura → Banner vermelho aparece
2. Deixe assinatura ativa → Banner desaparece
3. Trial acabando → Banner azul com contagem de dias

---

## 🎯 **CHECKLIST DE TESTES**

Marque conforme for testando:

### **Testes Básicos**
- [ ] Acessar `/test-multitenant`
- [ ] Ver informações do usuário
- [ ] Ver features ativas
- [ ] Ver permissões

### **Testes de Feature Gate**
- [ ] Feature disponível mostra conteúdo
- [ ] Feature indisponível mostra prompt de upgrade
- [ ] Desabilitar feature via override funciona

### **Testes de Permission Gate**
- [ ] Permissão concedida mostra conteúdo
- [ ] Permissão negada mostra "Acesso Negado"
- [ ] Tenant Admin tem todas as permissões

### **Testes de Subscription**
- [ ] Assinatura ativa permite escrita
- [ ] Assinatura suspensa bloqueia escrita
- [ ] Banner aparece quando necessário
- [ ] Trial mostra dias restantes

### **Testes de Roles**
- [ ] Admin vê tudo
- [ ] Financeiro vê só finanças
- [ ] Vendas vê só CRM
- [ ] Viewer não vê botões de ação

---

## 🚀 **PRÓXIMOS PASSOS**

Depois de testar tudo:

1. **Aplicar nas páginas reais:**
   - Adicionar `<FeatureGate>` nas rotas
   - Adicionar `<IfPermission>` nos botões
   - Adicionar `<SubscriptionBanner>` no layout

2. **Customizar mensagens:**
   - Ajustar textos de upgrade
   - Personalizar estilos
   - Adicionar links para billing

3. **Criar mais testes:**
   - Testar com múltiplos tenants
   - Testar impersonation
   - Testar limites de uso

---

## 🆘 **PROBLEMAS COMUNS**

### **"Features não aparecem"**
➡️ Verifique se a migration foi executada
➡️ Verifique se o plano tem features incluídas

### **"Permissões não aparecem"**
➡️ Verifique se o usuário tem uma role atribuída
➡️ Verifique se a role tem permissões configuradas

### **"Banner não aparece"**
➡️ Verifique se a assinatura está realmente suspensa
➡️ Verifique se o componente está no layout

---

**Boa sorte com os testes!** 🎉

Qualquer dúvida, consulte: `GUIA_USO_MULTITENANT.md`
