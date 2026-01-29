-- =============================================
-- SEED DATA - OBRA 360 SAAS
-- Dados iniciais para testes
-- =============================================

-- =============================================
-- 1. CRIAR DEV ADMIN (Você - Desenvolvedor)
-- =============================================

INSERT INTO public.saas_users (id, email, name, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@obra360.com', 'Dev Admin', 'dev_admin'),
  ('00000000-0000-0000-0000-000000000002', 'suporte@obra360.com', 'Suporte Obra360', 'support');

-- =============================================
-- 2. CRIAR CATÁLOGO DE FEATURES
-- =============================================

INSERT INTO public.features (feature_key, display_name, description, category) VALUES
  -- Módulos principais
  ('CRM', 'CRM & Vendas', 'Gestão de clientes e pipeline de vendas', 'MODULE'),
  ('PROJECTS', 'Gestão de Projetos', 'Gerenciar obras e cronogramas', 'MODULE'),
  ('INVENTORY', 'Estoque', 'Controle de materiais e estoque', 'MODULE'),
  ('PROCUREMENT', 'Compras', 'Pedidos de compra e fornecedores', 'MODULE'),
  ('FINANCE', 'Financeiro', 'Contas a pagar e receber', 'MODULE'),
  ('CONTRACTORS', 'Empreiteiros', 'Gestão de empreiteiros e contratos', 'MODULE'),
  
  -- Add-ons premium
  ('BUDGET_PDF', 'Exportar Orçamento PDF', 'Exportar orçamentos em PDF profissional', 'ADD_ON'),
  ('REPORTS_EXPORT', 'Exportação de Relatórios', 'Exportar relatórios para Excel/PDF', 'ADD_ON'),
  ('AI_CHAT', 'Assistente IA - Chat', 'Chatbot inteligente para perguntas', 'ADD_ON'),
  ('AI_RECEIPT', 'IA - Leitura de Notas', 'Extrair dados de notas fiscais com IA', 'ADD_ON'),
  
  -- Features beta
  ('MOBILE_APP', 'App Mobile', 'Acesso via aplicativo móvel', 'BETA'),
  ('INTEGRATIONS', 'Integrações', 'Conectar com outros sistemas', 'BETA');

-- =============================================
-- 3. CRIAR PLANOS
-- =============================================

-- PLANO: Starter (Trial / Pequenas construtoras)
INSERT INTO public.plans (
  id,
  name,
  display_name,
  description,
  price_monthly,
  price_yearly,
  max_users,
  max_projects,
  max_storage_gb,
  included_features,
  is_trial,
  trial_days
) VALUES (
  '10000000-0000-0000-0000-000000000001',
  'starter',
  'Starter',
  'Perfeito para pequenas construtoras começarem',
  0.00,
  0.00,
  3,
  5,
  2,
  '["PROJECTS", "INVENTORY", "FINANCE"]'::jsonb,
  true,
  14
);

-- PLANO: Pro (Construtoras médias)
INSERT INTO public.plans (
  id,
  name,
  display_name,
  description,
  price_monthly,
  price_yearly,
  max_users,
  max_projects,
  max_storage_gb,
  included_features
) VALUES (
  '10000000-0000-0000-0000-000000000002',
  'pro',
  'Pro',
  'Ideal para construtoras em crescimento',
  297.00,
  2970.00, -- 10 meses (2 de desconto)
  10,
  50,
  20,
  '["CRM", "PROJECTS", "INVENTORY", "PROCUREMENT", "FINANCE", "CONTRACTORS", "BUDGET_PDF", "REPORTS_EXPORT"]'::jsonb
);

-- PLANO: Enterprise (Grandes construtoras)
INSERT INTO public.plans (
  id,
  name,
  display_name,
  description,
  price_monthly,
  price_yearly,
  max_users,
  max_projects,
  max_storage_gb,
  included_features
) VALUES (
  '10000000-0000-0000-0000-000000000003',
  'enterprise',
  'Enterprise',
  'Solução completa para grandes construtoras',
  997.00,
  9970.00, -- 10 meses
  9999, -- Ilimitado
  9999, -- Ilimitado
  100,
  '["CRM", "PROJECTS", "INVENTORY", "PROCUREMENT", "FINANCE", "CONTRACTORS", "BUDGET_PDF", "REPORTS_EXPORT", "AI_CHAT", "AI_RECEIPT", "INTEGRATIONS"]'::jsonb
);

-- =============================================
-- 4. CRIAR TENANT DE DEMONSTRAÇÃO
-- =============================================

INSERT INTO public.tenants (
  id,
  name,
  slug,
  cnpj,
  email,
  phone,
  status,
  onboarded
) VALUES (
  '20000000-0000-0000-0000-000000000001',
  'Construtora Demo LTDA',
  'construtora-demo',
  '12.345.678/0001-90',
  'contato@construtorademo.com.br',
  '(11) 98765-4321',
  'active',
  true
);

-- =============================================
-- 5. CRIAR ASSINATURA DO TENANT DEMO (Trial Pro)
-- =============================================

INSERT INTO public.subscriptions (
  tenant_id,
  plan_id,
  status,
  trial_start,
  trial_end,
  current_period_start,
  current_period_end,
  billing_cycle,
  limits_snapshot,
  current_usage
) VALUES (
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002', -- Plano Pro
  'trial',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '14 days',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '14 days',
  'monthly',
  '{"max_users": 10, "max_projects": 50, "max_storage_gb": 20}'::jsonb,
  '{"users": 1, "projects": 0, "storage_gb": 0}'::jsonb
);

-- =============================================
-- 6. CRIAR ROLES PADRÃO PARA O TENANT DEMO
-- =============================================

-- Role: Tenant Admin (Admin da empresa)
INSERT INTO public.roles (
  id,
  tenant_id,
  name,
  description,
  is_tenant_admin,
  is_default
) VALUES (
  '30000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'Admin',
  'Administrador da empresa - acesso total',
  true,
  true -- Role padrão para o primeiro usuário
);

-- Role: Financeiro
INSERT INTO public.roles (
  id,
  tenant_id,
  name,
  description,
  is_tenant_admin,
  is_default
) VALUES (
  '30000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000001',
  'Financeiro',
  'Acesso apenas ao módulo financeiro',
  false,
  false
);

-- Role: Obras
INSERT INTO public.roles (
  id,
  tenant_id,
  name,
  description,
  is_tenant_admin,
  is_default
) VALUES (
  '30000000-0000-0000-0000-000000000003',
  '20000000-0000-0000-0000-000000000001',
  'Gestor de Obras',
  'Gerencia projetos e fases',
  false,
  false
);

-- Role: Compras
INSERT INTO public.roles (
  id,
  tenant_id,
  name,
  description,
  is_tenant_admin,
  is_default
) VALUES (
  '30000000-0000-0000-0000-000000000004',
  '20000000-0000-0000-0000-000000000001',
  'Compras',
  'Gestão de estoque e pedidos',
  false,
  false
);

-- Role: Vendas/CRM
INSERT INTO public.roles (
  id,
  tenant_id,
  name,
  description,
  is_tenant_admin,
  is_default
) VALUES (
  '30000000-0000-0000-0000-000000000005',
  '20000000-0000-0000-0000-000000000001',
  'Vendas',
  'Acesso ao CRM e pipeline',
  false,
  false
);

-- =============================================
-- 7. CRIAR PERMISSÕES PARA ROLES
-- =============================================

-- Admin: Todas as permissões
INSERT INTO public.role_permissions (tenant_id, role_id, permission_key) VALUES
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'CLIENTS:READ'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'CLIENTS:WRITE'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'PROJECTS:READ'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'PROJECTS:WRITE'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'INVENTORY:READ'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'INVENTORY:WRITE'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'PROCUREMENT:READ'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'PROCUREMENT:WRITE'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'PROCUREMENT:APPROVE'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'FINANCE:READ'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'FINANCE:WRITE'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'FINANCE:APPROVE'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'CONTRACTORS:READ'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'CONTRACTORS:WRITE'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'REPORTS:READ'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'REPORTS:EXPORT'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'USERS:READ'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'USERS:WRITE'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'ROLES:READ'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'ROLES:WRITE');

-- Financeiro: Apenas finance
INSERT INTO public.role_permissions (tenant_id, role_id, permission_key) VALUES
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'FINANCE:READ'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'FINANCE:WRITE'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'REPORTS:READ');

-- Obras: Projects + inventory (read)
INSERT INTO public.role_permissions (tenant_id, role_id, permission_key) VALUES
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'PROJECTS:READ'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'PROJECTS:WRITE'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'INVENTORY:READ'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'CONTRACTORS:READ');

-- Compras: Inventory + procurement
INSERT INTO public.role_permissions (tenant_id, role_id, permission_key) VALUES
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 'INVENTORY:READ'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 'INVENTORY:WRITE'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 'PROCUREMENT:READ'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 'PROCUREMENT:WRITE');

-- Vendas: CRM
INSERT INTO public.role_permissions (tenant_id, role_id, permission_key) VALUES
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', 'CLIENTS:READ'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', 'CLIENTS:WRITE');

-- =============================================
-- 8. EXEMPLO DE FEATURE OVERRIDE
-- Ativar IA Beta para o tenant demo
-- =============================================

INSERT INTO public.tenant_feature_overrides (
  tenant_id,
  feature_key,
  enabled,
  reason,
  created_by_saas_user_id
) VALUES (
  '20000000-0000-0000-0000-000000000001',
  'AI_CHAT',
  true,
  'Cliente beta - teste de IA',
  '00000000-0000-0000-0000-000000000001'
);

-- =============================================
-- FIM DO SEED
-- =============================================
