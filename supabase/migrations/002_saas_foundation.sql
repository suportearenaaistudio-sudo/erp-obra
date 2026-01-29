-- =============================================
-- OBRA 360 - FUNDAÇÃO SAAS MULTI-TENANT
-- Schema Completo com 2 Camadas de Admin
-- =============================================
-- 
-- ARQUITETURA:
-- 1. Dev Admin (Global) - Nós (desenvolvedores)
-- 2. Tenant Admin (Por empresa) - Dono da construtora
-- 3. Multi-tenancy com isolamento completo
-- 4. Feature Flags por plano + overrides
-- 5. RBAC granular por tenant
-- 6. Subscription control com bloqueios
-- 7. Auditoria completa
-- 

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- CAMADA 1: TABELAS GLOBAIS (SAAS LEVEL)
-- =============================================

-- 1.1 DEV ADMINS (Nós - Desenvolvedores)
CREATE TABLE IF NOT EXISTS public.saas_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'support' CHECK (role IN ('dev_admin', 'support')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.2 PLANOS (Starter, Pro, Enterprise)
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10, 2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(10, 2) NOT NULL DEFAULT 0,
  
  -- Limites
  max_users INTEGER NOT NULL DEFAULT 5,
  max_projects INTEGER NOT NULL DEFAULT 10,
  max_storage_gb INTEGER NOT NULL DEFAULT 5,
  
  -- Features inclusas (JSON array de feature keys)
  included_features JSONB NOT NULL DEFAULT '[]',
  
  -- Status
  active BOOLEAN DEFAULT true,
  is_trial BOOLEAN DEFAULT false,
  trial_days INTEGER DEFAULT 14,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.3 CATÁLOGO DE FEATURES
CREATE TABLE IF NOT EXISTS public.features (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  feature_key VARCHAR(100) NOT NULL UNIQUE, -- Ex: CRM, PROCUREMENT, AI_CHAT
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL, -- MODULE, ADD_ON, BETA
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.4 TENANTS/EMPRESAS (Construtoras)
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Informações da empresa
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE, -- obra360.com/app/slug
  cnpj VARCHAR(18) UNIQUE,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  logo_url VARCHAR(500),
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'canceled')),
  
  -- Metadata
  onboarded BOOLEAN DEFAULT false,
  onboarded_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.5 ASSINATURAS
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES public.plans(id) ON DELETE RESTRICT NOT NULL,
  
  -- Status da assinatura
  status VARCHAR(50) NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'past_due', 'canceled', 'suspended')),
  
  -- Datas
  trial_start DATE,
  trial_end DATE,
  current_period_start DATE NOT NULL,
  current_period_end DATE NOT NULL,
  canceled_at TIMESTAMP WITH TIME ZONE,
  
  -- Billing
  billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  
  -- Snapshot de limites (para não depender do plano mudar)
  limits_snapshot JSONB NOT NULL DEFAULT '{}',
  
  -- Uso atual (atualizado periodicamente)
  current_usage JSONB DEFAULT '{"users": 0, "projects": 0, "storage_gb": 0}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index para buscar subscription ativa de um tenant
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_id ON public.subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- 1.6 FEATURE OVERRIDES (Dev Admin habilita/desabilita features por tenant)
CREATE TABLE IF NOT EXISTS public.tenant_feature_overrides (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  feature_key VARCHAR(100) NOT NULL,
  
  -- Override
  enabled BOOLEAN NOT NULL,
  reason TEXT NOT NULL, -- Ex: "Cliente beta", "Pagou add-on", "Trial estendido"
  
  -- Expiração (opcional)
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Quem fez
  created_by_saas_user_id UUID REFERENCES public.saas_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id, feature_key)
);

-- 1.7 SUPPORT SESSION LOGS (Impersonation com auditoria completa)
CREATE TABLE IF NOT EXISTS public.support_session_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  saas_user_id UUID REFERENCES public.saas_users(id) NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
  impersonated_user_id UUID, -- referência ao user do tenant (criada depois)
  
  -- Motivo e rastreamento
  reason TEXT NOT NULL,
  trace_id VARCHAR(100),
  ip_address INET,
  user_agent TEXT,
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- Max 15 minutos
  
  -- Ações realizadas (pode ser atualizado durante a sessão)
  actions_performed JSONB DEFAULT '[]'
);

-- =============================================
-- CAMADA 2: TABELAS POR TENANT
-- =============================================

-- 2.1 USUÁRIOS (Por tenant - funcionários da construtora)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Auth (integra com auth.users do Supabase)
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Informações
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(500),
  
  -- Role
  role_id UUID, -- referência criada depois
  
  -- Status
  active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id, email)
);

-- Index importante para performance
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON public.users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);

-- 2.2 ROLES (Papéis por tenant - configurável pelo Tenant Admin)
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  
  name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Flags
  is_tenant_admin BOOLEAN DEFAULT false, -- Admin da empresa
  is_default BOOLEAN DEFAULT false, -- Role padrão para novos usuários
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_roles_tenant_id ON public.roles(tenant_id);

-- 2.3 PERMISSIONS (Granular - por recurso e ação)
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE NOT NULL,
  
  -- Permission key (ex: CLIENTS:READ, PROJECTS:WRITE, FINANCE:APPROVE)
  permission_key VARCHAR(100) NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id, role_id, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON public.role_permissions(role_id);

-- Adicionar FK de role_id em users agora que roles existe
ALTER TABLE public.users 
  ADD CONSTRAINT fk_users_role_id 
  FOREIGN KEY (role_id) 
  REFERENCES public.roles(id) 
  ON DELETE SET NULL;

-- Adicionar FK de impersonated_user_id agora que users existe
ALTER TABLE public.support_session_logs 
  ADD CONSTRAINT fk_support_logs_user_id 
  FOREIGN KEY (impersonated_user_id) 
  REFERENCES public.users(id) 
  ON DELETE SET NULL;

-- =============================================
-- CAMADA 3: TABELAS DE NEGÓCIO (Todas com tenant_id)
-- =============================================

-- 3.1 CLIENTES
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  status VARCHAR(50) NOT NULL DEFAULT 'LEAD' CHECK (status IN ('LEAD', 'NEGOTIATION', 'ACTIVE', 'ARCHIVED')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_tenant_id ON public.clients(tenant_id);

-- 3.2 NEGÓCIOS (DEALS)
CREATE TABLE IF NOT EXISTS public.deals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  
  title VARCHAR(255) NOT NULL,
  value DECIMAL(15, 2) NOT NULL DEFAULT 0,
  stage VARCHAR(50) NOT NULL DEFAULT 'QUALIFICATION' CHECK (stage IN ('QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST')),
  probability INTEGER DEFAULT 50 CHECK (probability BETWEEN 0 AND 100),
  expected_close_date DATE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deals_tenant_id ON public.deals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deals_client_id ON public.deals(client_id);

-- 3.3 PROJETOS
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  
  name VARCHAR(255) NOT NULL,
  address TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'PLANNING' CHECK (status IN ('PLANNING', 'ACTIVE', 'PAUSED', 'COMPLETED')),
  start_date DATE,
  budget_total DECIMAL(15, 2) DEFAULT 0,
  spent_total DECIMAL(15, 2) DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_tenant_id ON public.projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id);

-- 3.4 FASES DO PROJETO
CREATE TABLE IF NOT EXISTS public.project_phases (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  start_date DATE,
  end_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_phases_tenant_id ON public.project_phases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_project_phases_project_id ON public.project_phases(project_id);

-- 3.5 ITENS DO ORÇAMENTO
CREATE TABLE IF NOT EXISTS public.budget_line_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  phase_id UUID REFERENCES public.project_phases(id) ON DELETE CASCADE,
  
  description TEXT NOT NULL,
  unit VARCHAR(50) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
  unit_price DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total DECIMAL(15, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  category VARCHAR(50) NOT NULL CHECK (category IN ('MATERIAL', 'LABOR', 'EQUIPMENT', 'OTHER')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budget_items_tenant_id ON public.budget_line_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_phase_id ON public.budget_line_items(phase_id);

-- 3.6 MATERIAIS
CREATE TABLE IF NOT EXISTS public.materials (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  
  sku VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  category VARCHAR(100),
  min_stock DECIMAL(10, 2) DEFAULT 0,
  current_stock DECIMAL(10, 2) DEFAULT 0,
  avg_cost DECIMAL(15, 2) DEFAULT 0,
  reserved DECIMAL(10, 2) DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_materials_tenant_id ON public.materials(tenant_id);

-- 3.7 FORNECEDORES
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  
  name VARCHAR(255) NOT NULL,
  cnpj VARCHAR(18),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_tenant_id ON public.suppliers(tenant_id);

-- 3.8 PEDIDOS DE COMPRA
CREATE TABLE IF NOT EXISTS public.procurement_orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  
  code VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED', 'QUOTING', 'APPROVED', 'ORDERED', 'RECEIVED')),
  total_estimated DECIMAL(15, 2) DEFAULT 0,
  delivery_date DATE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_procurement_orders_tenant_id ON public.procurement_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_procurement_orders_project_id ON public.procurement_orders(project_id);

-- 3.9 ITENS DO PEDIDO
CREATE TABLE IF NOT EXISTS public.procurement_order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.procurement_orders(id) ON DELETE CASCADE,
  material_id UUID REFERENCES public.materials(id) ON DELETE SET NULL,
  
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
  unit_price DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total DECIMAL(15, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_procurement_order_items_tenant_id ON public.procurement_order_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_procurement_order_items_order_id ON public.procurement_order_items(order_id);

-- 3.10 EMPREITEIROS
CREATE TABLE IF NOT EXISTS public.contractors (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  
  name VARCHAR(255) NOT NULL,
  specialty VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  document VARCHAR(50),
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contractors_tenant_id ON public.contractors(tenant_id);

-- 3.11 CONTRATOS
CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  contractor_id UUID REFERENCES public.contractors(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  
  title VARCHAR(255) NOT NULL,
  total_value DECIMAL(15, 2) NOT NULL DEFAULT 0,
  start_date DATE,
  end_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'COMPLETED')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contracts_tenant_id ON public.contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contracts_contractor_id ON public.contracts(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contracts_project_id ON public.contracts(project_id);

-- 3.12 MEDIÇÕES
CREATE TABLE IF NOT EXISTS public.measurements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
  
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  value DECIMAL(15, 2) NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'PAID')),
  approved_date DATE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_measurements_tenant_id ON public.measurements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_measurements_contract_id ON public.measurements(contract_id);

-- 3.13 REGISTROS FINANCEIROS
CREATE TABLE IF NOT EXISTS public.financial_records (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  
  type VARCHAR(10) NOT NULL CHECK (type IN ('AP', 'AR')),
  description TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'OVERDUE')),
  category VARCHAR(100),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_records_tenant_id ON public.financial_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_financial_records_project_id ON public.financial_records(project_id);

-- =============================================
-- CAMADA 4: AUDITORIA
-- =============================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Quem fez (pode ser user ou saas_user)
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  saas_user_id UUID REFERENCES public.saas_users(id) ON DELETE SET NULL,
  
  -- O que foi feito
  action VARCHAR(100) NOT NULL, -- CREATE_USER, UPDATE_ROLE, SUSPEND_TENANT, etc.
  entity_type VARCHAR(100) NOT NULL, -- USER, ROLE, SUBSCRIPTION, etc.
  entity_id UUID,
  
  -- Detalhes
  old_values JSONB,
  new_values JSONB,
  
  -- Contexto
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON public.audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Habilitar RLS em TODAS as tabelas de negócio
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Função helper para pegar tenant_id do usuário atual
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Políticas RLS: usuários só veem dados do próprio tenant
CREATE POLICY "Users can only see their tenant data" ON public.users
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant isolation - roles" ON public.roles
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant isolation - role_permissions" ON public.role_permissions
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant isolation - clients" ON public.clients
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant isolation - deals" ON public.deals
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant isolation - projects" ON public.projects
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant isolation - project_phases" ON public.project_phases
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant isolation - budget_line_items" ON public.budget_line_items
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant isolation - materials" ON public.materials
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant isolation - suppliers" ON public.suppliers
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant isolation - procurement_orders" ON public.procurement_orders
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant isolation - procurement_order_items" ON public.procurement_order_items
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant isolation - contractors" ON public.contractors
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant isolation - contracts" ON public.contracts
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant isolation - measurements" ON public.measurements
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant isolation - financial_records" ON public.financial_records
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant isolation - audit_logs" ON public.audit_logs
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- =============================================
-- TRIGGERS
-- =============================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em tabelas relevantes
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_phases_updated_at BEFORE UPDATE ON public.project_phases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_line_items_updated_at BEFORE UPDATE ON public.budget_line_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON public.materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_procurement_orders_updated_at BEFORE UPDATE ON public.procurement_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contractors_updated_at BEFORE UPDATE ON public.contractors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_measurements_updated_at BEFORE UPDATE ON public.measurements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_records_updated_at BEFORE UPDATE ON public.financial_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para criar perfil automaticamente no signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id UUID;
  v_default_role_id UUID;
BEGIN
  -- Pegar tenant_id do metadata do auth.users
  v_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::UUID;
  
  IF v_tenant_id IS NOT NULL THEN
    -- Pegar role padrão do tenant
    SELECT id INTO v_default_role_id
    FROM public.roles
    WHERE tenant_id = v_tenant_id AND is_default = true
    LIMIT 1;
    
    -- Criar user
    INSERT INTO public.users (
      auth_user_id,
      tenant_id,
      email,
      name,
      role_id
    ) VALUES (
      NEW.id,
      v_tenant_id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
      v_default_role_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- FIM DA MIGRAÇÃO
-- =============================================
