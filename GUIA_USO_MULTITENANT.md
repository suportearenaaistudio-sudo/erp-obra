# 🎯 Guia de Uso - Sistema Multi-Tenant

## 📚 **O QUE FOI CRIADO**

Você agora tem um sistema completo de proteção multi-tenant com:

### **✅ Hooks Criados:**
1. `useFeatureGuard` - Verifica features do plano
2. `usePermissionGuard` - Verifica permissões RBAC
3. `useSubscriptionGuard` - Verifica status da assinatura

### **✅ Componentes Criados:**
1. `<FeatureGate>` - Protege UI por feature
2. `<PermissionGate>` - Protege UI por permissão
3. `<SubscriptionBanner>` - Mostra alertas de assinatura
4. `<WriteGuard>` - Bloqueia ações de escrita

---

## 🚀 **COMO USAR**

### **1. Proteger Rota Inteira por Feature**

```typescript
// pages/ProcurementPage.tsx
import { FeatureGate } from '../components/FeatureGate';

export default function ProcurementPage() {
  return (
    <FeatureGate feature="PROCUREMENT">
      <div>
        <h1>Compras</h1>
        {/* Conteúdo da página */}
      </div>
    </FeatureGate>
  );
}
```

**Resultado:**
- Se o plano incluir `PROCUREMENT` → Mostra a página
- Se não incluir → Mostra prompt de upgrade

---

### **2. Proteger Botão por Permissão**

```typescript
// components/ClientsList.tsx
import { IfPermission } from '../components/PermissionGate';

export default function ClientsList() {
  return (
    <div>
      <h2>Clientes</h2>
      
      {/* Botão só aparece se tiver permissão */}
      <IfPermission permission="CLIENTS:WRITE">
        <button onClick={handleCreateClient}>
          Novo Cliente
        </button>
      </IfPermission>
      
      {/* Lista sempre visível (CLIENTS:READ) */}
      <ClientsTable />
    </div>
  );
}
```

---

### **3. Mostrar Banner de Assinatura**

```typescript
// App.tsx ou Layout.tsx
import { SubscriptionBanner } from '../components/SubscriptionGuards';

export default function App() {
  return (
    <div>
      {/* Banner aparece automaticamente quando necessário */}
      <SubscriptionBanner />
      
      <Routes>
        {/* Suas rotas */}
      </Routes>
    </div>
  );
}
```

**Banner aparece quando:**
- ⚠️ Trial acabando
- ⚠️ Pagamento atrasado
- 🔴 Assinatura suspensa
- 🔴 Assinatura cancelada

---

### **4. Bloquear Ações de Escrita**

```typescript
// components/ProjectForm.tsx
import { WriteGuard } from '../components/SubscriptionGuards';

export default function ProjectForm() {
  return (
    <WriteGuard>
      <form onSubmit={handleSubmit}>
        <input name="name" />
        <button type="submit">Salvar</button>
      </form>
    </WriteGuard>
  );
}
```

**Resultado:**
- Se assinatura ativa → Formulário funciona normalmente
- Se suspensa/cancelada → Formulário fica bloqueado com overlay

---

### **5. Verificar Feature com Hook**

```typescript
// components/ExportButton.tsx
import { useFeatureGuard } from '../hooks/useFeatureGuard';

export default function ExportButton() {
  const { isEnabled, upgradeUrl } = useFeatureGuard('REPORTS_EXPORT');
  
  if (!isEnabled) {
    return (
      <a href={upgradeUrl} className="btn-upgrade">
        Fazer Upgrade para Exportar
      </a>
    );
  }
  
  return (
    <button onClick={handleExport}>
      Exportar PDF
    </button>
  );
}
```

---

### **6. Verificar Permissão com Hook**

```typescript
// components/UserActions.tsx
import { usePermissionGuard } from '../hooks/usePermissionGuard';

export default function UserActions({ user }) {
  const { isAllowed: canEdit } = usePermissionGuard('USERS:WRITE');
  const { isAllowed: canDelete } = usePermissionGuard('USERS:DELETE');
  
  return (
    <div>
      {canEdit && <button onClick={() => handleEdit(user)}>Editar</button>}
      {canDelete && <button onClick={() => handleDelete(user)}>Excluir</button>}
    </div>
  );
}
```

---

### **7. Verificar Status da Assinatura**

```typescript
// components/Dashboard.tsx
import { useSubscriptionGuard } from '../hooks/useSubscriptionGuard';

export default function Dashboard() {
  const { 
    canWrite, 
    canExport, 
    isTrial, 
    planName 
  } = useSubscriptionGuard();
  
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Plano: {planName}</p>
      {isTrial && <p>Você está em trial!</p>}
      
      {canWrite ? (
        <button>Criar Projeto</button>
      ) : (
        <p>Assinatura inativa - Atualize seu pagamento</p>
      )}
    </div>
  );
}
```

---

### **8. Combinar Feature + Permissão**

```typescript
// components/FinanceApproval.tsx
import { useCan } from '../hooks/usePermissionGuard';

export default function FinanceApproval() {
  const { can, reason } = useCan('FINANCE:APPROVE', 'FINANCE');
  
  if (!can) {
    return <div>Acesso negado: {reason}</div>;
  }
  
  return (
    <div>
      <h2>Aprovar Lançamentos</h2>
      {/* Conteúdo */}
    </div>
  );
}
```

---

## 📋 **FEATURES DISPONÍVEIS**

Use estas chaves nas verificações:

| Feature Key | Nome | Incluído em |
|-------------|------|-------------|
| `CRM` | CRM & Vendas | Pro, Enterprise |
| `PROJECTS` | Gestão de Projetos | Todos |
| `INVENTORY` | Estoque | Starter, Pro, Enterprise |
| `PROCUREMENT` | Compras | Pro, Enterprise |
| `FINANCE` | Financeiro | Todos |
| `CONTRACTORS` | Empreiteiros | Pro, Enterprise |
| `BUDGET_PDF` | Export PDF | Pro, Enterprise |
| `REPORTS_EXPORT` | Export Excel | Pro, Enterprise |
| `AI_CHAT` | Assistente IA | Enterprise |
| `AI_RECEIPT` | IA Notas Fiscais | Enterprise |

---

## 🔐 **PERMISSÕES DISPONÍVEIS**

Use estas chaves nas verificações:

| Permissão | Descrição |
|-----------|-----------|
| `CLIENTS:READ` | Ver clientes |
| `CLIENTS:WRITE` | Criar/editar clientes |
| `PROJECTS:READ` | Ver projetos |
| `PROJECTS:WRITE` | Criar/editar projetos |
| `INVENTORY:READ` | Ver estoque |
| `INVENTORY:WRITE` | Gerenciar estoque |
| `PROCUREMENT:READ` | Ver compras |
| `PROCUREMENT:WRITE` | Criar pedidos |
| `PROCUREMENT:APPROVE` | Aprovar pedidos |
| `FINANCE:READ` | Ver finanças |
| `FINANCE:WRITE` | Lançar movimentos |
| `FINANCE:APPROVE` | Aprovar lançamentos |
| `CONTRACTORS:READ` | Ver empreiteiros |
| `CONTRACTORS:WRITE` | Gerenciar empreiteiros |
| `REPORTS:READ` | Ver relatórios |
| `REPORTS:EXPORT` | Exportar relatórios |
| `USERS:READ` | Ver usuários |
| `USERS:WRITE` | Gerenciar usuários |
| `ROLES:READ` | Ver roles |
| `ROLES:WRITE` | Gerenciar roles |

---

## 🎯 **EXEMPLO COMPLETO: Página de Compras**

```typescript
// pages/ProcurementPage.tsx
import { FeatureGate } from '../components/FeatureGate';
import { IfPermission } from '../components/PermissionGate';
import { WriteGuard } from '../components/SubscriptionGuards';
import { usePermissionGuard } from '../hooks/usePermissionGuard';

export default function ProcurementPage() {
  const { isAllowed: canApprove } = usePermissionGuard('PROCUREMENT:APPROVE');
  
  return (
    {/* 1. Verifica se feature PROCUREMENT está ativa */}
    <FeatureGate feature="PROCUREMENT">
      <div>
        <h1>Compras</h1>
        
        {/* 2. Botão só aparece se tiver permissão de escrita */}
        <IfPermission permission="PROCUREMENT:WRITE">
          {/* 3. Bloqueia se assinatura estiver suspensa */}
          <WriteGuard>
            <button onClick={handleCreateOrder}>
              Novo Pedido
            </button>
          </WriteGuard>
        </IfPermission>
        
        {/* 4. Lista sempre visível (READ) */}
        <OrdersList />
        
        {/* 5. Botão de aprovar só para quem tem permissão */}
        {canApprove && (
          <button onClick={handleApproveAll}>
            Aprovar Selecionados
          </button>
        )}
      </div>
    </FeatureGate>
  );
}
```

---

## ✅ **CHECKLIST DE IMPLEMENTAÇÃO**

### **Para cada página/rota:**
- [ ] Envolver com `<FeatureGate>` se for módulo pago
- [ ] Adicionar `<SubscriptionBanner>` no layout
- [ ] Proteger botões de ação com `<IfPermission>`
- [ ] Envolver formulários com `<WriteGuard>`

### **Para cada ação:**
- [ ] Verificar permissão antes de executar
- [ ] Verificar feature se for módulo pago
- [ ] Verificar `canWrite` se for ação de escrita

---

## 🎉 **PRONTO!**

Agora você tem um sistema completo de proteção multi-tenant!

**Próximos passos:**
1. Aplicar `<FeatureGate>` nas rotas principais
2. Adicionar `<SubscriptionBanner>` no layout
3. Proteger botões com `<IfPermission>`
4. Testar com diferentes planos e roles

**Quer que eu te ajude a aplicar em alguma página específica?** 🚀
