# 🚀 PLANO DE IMPLEMENTAÇÃO: Finalização SaaS (Sem Pagamentos)

Este plano cobre as etapas necessárias para transformar o sistema multi-tenant em um produto colaborativo e seguro, permitindo gestão de equipes e controle de acesso real.

---

## 📅 FASE 1: Blindagem de Rotas (Segurança Frontend)
**Objetivo:** Garantir que usuários não acessem módulos que seu plano não permite, ou áreas administrativas sem permissão.

### 1.1 Mapeamento e Proteção de Rotas (`App.tsx`)
- [x] Envolver rotas do Módulo Financeiro com `<FeatureGate feature="FINANCE">`
- [x] Envolver rotas do CRM com `<FeatureGate feature="CRM">`
- [x] Envolver rotas de Suprimentos com `<FeatureGate feature="PROCUREMENT">`
- [x] Envolver rotas de Estoque com `<FeatureGate feature="INVENTORY">`
- [x] Proteger rota `/admin` apenas para funcões com permissão `TENANT_SETTINGS:WRITE`.

### 1.2 Melhoria da UX de Bloqueio
- [x] Garantir que o componente `FeatureGate` mostre um "Upsell" (Sugestão de Upgrade) bonito quando bloqueado.
- [x] Ocultar itens do Menu Lateral (`Sidebar`) dinamicamente se o usuário não tiver a Feature.

---

## 📅 FASE 2: Painel do Cliente (Tenant Settings)
**Objetivo:** Permitir que o dono da empresa gerencie sua própria conta sem depender do Dev Admin.

### 2.1 Página de Configurações da Empresa
- [x] Criar página `pages/admin/CompanySettings.tsx`. (Implementado como parte do reformulado `TenantAdmin.tsx`)
- [ ] Aba **Geral**: Editar Nome da Empresa, Logo, Telefone. (Ficou para refino, mas a base está lá)
- [ ] Aba **Assinatura**:
    - Visualizar Plano Atual.
    - Barra de progresso de uso (ex: 2/5 Usuários, 10/50 Projetos).
    - Data de expiração do Trial.

### 2.2 Edição de Perfil do Usuário
- [ ] Criar/Melhorar `pages/Profile.tsx`.
- [ ] Permitir alterar Nome e Senha.

---

## 📅 FASE 3: Sistema de Convites (Team Management)
**Objetivo:** Permitir que uma empresa tenha múltiplos usuários.

### 3.1 Backend (Banco de Dados)
- [x] Criar tabela `invites`:
    - `id` (uuid)
    - `tenant_id` (fk)
    - `email` (string)
    - `role_id` (fk) - Qual cargo o convidado terá.
    - `token` (uuid) - Código único do link.
    - `expires_at` (timestamp).
    - `status` (pending, accepted).
- [x] Criar RLS para `invites` (Apenas Admins do tenant podem ver/criar).

### 3.2 Frontend (Enviar Convite)
- [x] Criar Aba **Membros** em `CompanySettings.tsx` (No `TenantAdmin.tsx`).
- [x] Listar usuários atuais da empresa.
- [x] Botão "Convidar Membro":
    - Modal pede E-mail e Cargo (Admin, Gestor, Vendas, etc).
    - Gera um link de convite (ex: `app.obra360.com/join?token=xyz`).

### 3.3 Frontend (Aceitar Convite)
- [x] Criar página pública `pages/JoinTeam.tsx`.
- [x] Validar token na URL.
- [x] Se usuário não existe: Redirecionar para Cadastro (Preenchendo dados automáticos e vinculando ao tenant).
- [x] Se usuário já existe: Apenas vincular ao tenant (nota: complexidade extra se ele já tiver outro tenant, por enquanto assumimos 1 user = 1 tenant).

### 3.4 Backend (Processar Aceite)
- [x] Ajustar Trigger de Signup ou criar função `accept_invite` para garantir que o usuário entre no `tenant_id` do convite e não crie um novo tenant do zero.

---

## 📅 FASE 4: Refinamentos Finais (Sprints Finais)
**Objetivo:** Polimento e remoção de arestas.

### 4.1 Onboarding
- [x] Criar componente `WelcomeModal` que aparece no primeiro login.
    - Boas vindas.
    - Tour rápido (ex: "Aqui estão seus projetos", "Aqui você convida seu time").
- [x] Banner de "Trial Expirando" no topo do Dashboard (`components/TrialBanner.tsx`).

### 4.2 Notificações Básicas (Email/Sistema)
- [x] Emails transacionais via Supabase Auth (já nativo).
- [ ] (Opcional) Sistema de notificação in-app (Sino no header) para quando um convite for aceito. (Deixado para V2 para não bloquear lançamento).

---

# ✅ Definição de Pronto (Done Definition)
1. Usuário cria conta e entra no Trial automaticamente.
2. Usuário tenta acessar Financeiro -> Bloqueado (se o plano não permitir).
3. Usuário convida Sócio -> Sócio recebe link, cadastra e cai na mesma conta da empresa.
4. Usuário vê aviso de "Faltam 3 dias para acabar o teste".
5. Admin do sistema (Dev) consegue ver todas as empresas e bloquear se necessário.
