-- =============================================
-- MIGRATION 015: RLS Seguro com Dev Admin
-- =============================================
-- Esta migration reabilita o RLS e cria policies
-- corretas para Dev Admins e usuários normais
-- =============================================

-- 1. REABILITAR RLS em todas as tabelas
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_feature_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 2. POLICIES PARA TENANTS
-- =============================================

-- Remover policies antigas
DROP POLICY IF EXISTS "Dev admins can view all tenants" ON public.tenants;
DROP POLICY IF EXISTS "Users can view their own tenant" ON public.tenants;

-- Dev Admins podem ver TODOS os tenants
CREATE POLICY "Dev admins see all tenants" ON public.tenants
  FOR SELECT
  USING (
    auth.jwt() ->> 'email' = ANY(ARRAY[
      'admin@obra360.com',
      'suporte@obra360.com',
      'vitorpradotamos@gmail.com',
      'marcospaulotrindade3@gmail.com'
    ])
  );

-- Usuários normais só veem seu próprio tenant
CREATE POLICY "Users see own tenant" ON public.tenants
  FOR SELECT
  USING (
    id IN (
      SELECT tenant_id 
      FROM public.users 
      WHERE auth_user_id = auth.uid()
    )
  );

-- =============================================
-- 3. POLICIES PARA USERS
-- =============================================

DROP POLICY IF EXISTS "Dev admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Users tenant isolation" ON public.users;

-- Dev Admins podem ver TODOS os usuários
CREATE POLICY "Dev admins see all users" ON public.users
  FOR SELECT
  USING (
    auth.jwt() ->> 'email' = ANY(ARRAY[
      'admin@obra360.com',
      'suporte@obra360.com',
      'vitorpradotamos@gmail.com',
      'marcospaulotrindade3@gmail.com'
    ])
  );

-- Usuários normais só veem usuários do próprio tenant
CREATE POLICY "Users see own tenant users" ON public.users
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM public.users 
      WHERE auth_user_id = auth.uid()
    )
  );

-- Usuários podem atualizar próprio perfil
CREATE POLICY "Users update own profile" ON public.users
  FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- =============================================
-- 4. POLICIES PARA SUBSCRIPTIONS
-- =============================================

DROP POLICY IF EXISTS "Dev admins can view all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Dev admins can update subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view their subscription" ON public.subscriptions;

-- Dev Admins podem ver e editar TODAS as subscriptions
CREATE POLICY "Dev admins see all subscriptions" ON public.subscriptions
  FOR SELECT
  USING (
    auth.jwt() ->> 'email' = ANY(ARRAY[
      'admin@obra360.com',
      'suporte@obra360.com',
      'vitorpradotamos@gmail.com',
      'marcospaulotrindade3@gmail.com'
    ])
  );

CREATE POLICY "Dev admins update subscriptions" ON public.subscriptions
  FOR UPDATE
  USING (
    auth.jwt() ->> 'email' = ANY(ARRAY[
      'admin@obra360.com',
      'suporte@obra360.com',
      'vitorpradotamos@gmail.com',
      'marcospaulotrindade3@gmail.com'
    ])
  )
  WITH CHECK (
    auth.jwt() ->> 'email' = ANY(ARRAY[
      'admin@obra360.com',
      'suporte@obra360.com',
      'vitorpradotamos@gmail.com',
      'marcospaulotrindade3@gmail.com'
    ])
  );

-- Usuários normais só veem subscription do próprio tenant
CREATE POLICY "Users see own subscription" ON public.subscriptions
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM public.users 
      WHERE auth_user_id = auth.uid()
    )
  );

-- =============================================
-- 5. POLICIES PARA PLANS (Todos podem ver)
-- =============================================

DROP POLICY IF EXISTS "Dev admins can view all plans" ON public.plans;

CREATE POLICY "Everyone can view plans" ON public.plans
  FOR SELECT
  USING (true);

-- =============================================
-- 6. POLICIES PARA FEATURES (Todos podem ver)
-- =============================================

DROP POLICY IF EXISTS "Dev admins can view all features" ON public.features;

CREATE POLICY "Everyone can view features" ON public.features
  FOR SELECT
  USING (true);

-- =============================================
-- 7. POLICIES PARA TENANT_FEATURE_OVERRIDES
-- =============================================

DROP POLICY IF EXISTS "Dev admins can view all feature overrides" ON public.tenant_feature_overrides;
DROP POLICY IF EXISTS "Dev admins can insert feature overrides" ON public.tenant_feature_overrides;
DROP POLICY IF EXISTS "Dev admins can update feature overrides" ON public.tenant_feature_overrides;
DROP POLICY IF EXISTS "Dev admins can delete feature overrides" ON public.tenant_feature_overrides;

-- Dev Admins podem gerenciar TODOS os overrides
CREATE POLICY "Dev admins manage all overrides" ON public.tenant_feature_overrides
  FOR ALL
  USING (
    auth.jwt() ->> 'email' = ANY(ARRAY[
      'admin@obra360.com',
      'suporte@obra360.com',
      'vitorpradotamos@gmail.com',
      'marcospaulotrindade3@gmail.com'
    ])
  )
  WITH CHECK (
    auth.jwt() ->> 'email' = ANY(ARRAY[
      'admin@obra360.com',
      'suporte@obra360.com',
      'vitorpradotamos@gmail.com',
      'marcospaulotrindade3@gmail.com'
    ])
  );

-- Usuários normais só veem overrides do próprio tenant
CREATE POLICY "Users see own overrides" ON public.tenant_feature_overrides
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM public.users 
      WHERE auth_user_id = auth.uid()
    )
  );

-- =============================================
-- 8. POLICIES PARA ROLES
-- =============================================

DROP POLICY IF EXISTS "Dev admins can view all roles" ON public.roles;
DROP POLICY IF EXISTS "Users can view tenant roles" ON public.roles;

-- Dev Admins podem ver TODAS as roles
CREATE POLICY "Dev admins see all roles" ON public.roles
  FOR SELECT
  USING (
    auth.jwt() ->> 'email' = ANY(ARRAY[
      'admin@obra360.com',
      'suporte@obra360.com',
      'vitorpradotamos@gmail.com',
      'marcospaulotrindade3@gmail.com'
    ])
  );

-- Usuários normais só veem roles do próprio tenant
CREATE POLICY "Users see own tenant roles" ON public.roles
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM public.users 
      WHERE auth_user_id = auth.uid()
    )
  );

-- =============================================
-- 9. POLICIES PARA ROLE_PERMISSIONS
-- =============================================

DROP POLICY IF EXISTS "Users can view tenant permissions" ON public.role_permissions;

-- Usuários veem permissions do próprio tenant
CREATE POLICY "Users see own permissions" ON public.role_permissions
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM public.users 
      WHERE auth_user_id = auth.uid()
    )
  );

-- =============================================
-- 10. POLICIES PARA PROJECTS
-- =============================================

DROP POLICY IF EXISTS "Dev admins can view all projects" ON public.projects;

-- Dev Admins podem ver TODOS os projetos
CREATE POLICY "Dev admins see all projects" ON public.projects
  FOR SELECT
  USING (
    auth.jwt() ->> 'email' = ANY(ARRAY[
      'admin@obra360.com',
      'suporte@obra360.com',
      'vitorpradotamos@gmail.com',
      'marcospaulotrindade3@gmail.com'
    ])
  );

-- Usuários normais só veem projetos do próprio tenant
CREATE POLICY "Users see own tenant projects" ON public.projects
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM public.users 
      WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id 
      FROM public.users 
      WHERE auth_user_id = auth.uid()
    )
  );

-- =============================================
-- PRONTO! SISTEMA SEGURO!
-- =============================================
-- Agora:
-- ✅ Dev Admins (emails específicos) veem TUDO
-- ✅ Usuários normais só veem dados do próprio tenant
-- ✅ RLS está ATIVO e protegendo os dados
-- ✅ Multi-tenancy funciona corretamente
-- =============================================
