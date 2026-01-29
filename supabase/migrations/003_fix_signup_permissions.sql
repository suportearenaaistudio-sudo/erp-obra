-- =============================================
-- SCRIPT RÁPIDO: Corrigir Erro "permission denied for table users"
-- =============================================
-- Execute este script NO SUPABASE SQL EDITOR
-- Ele corrige as permissões para permitir signup
-- =============================================

-- 1. Remover policies antigas que estão bloqueando
DROP POLICY IF EXISTS "Users can only see their tenant data" ON public.users;
DROP POLICY IF EXISTS "Tenant isolation - roles" ON public.roles;
DROP POLICY IF EXISTS "Tenant isolation - role_permissions" ON public.role_permissions;

-- 2. Habilitar RLS nas tabelas (se ainda não estiver)
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. TENANTS - Permitir criar durante signup
DROP POLICY IF EXISTS "Allow authenticated users to create tenant" ON public.tenants;
CREATE POLICY "Allow authenticated users to create tenant" ON public.tenants
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can view their own tenant" ON public.tenants;
CREATE POLICY "Users can view their own tenant" ON public.tenants
  FOR SELECT 
  USING (id IN (SELECT tenant_id FROM public.users WHERE auth_user_id = auth.uid()));

-- 4. SUBSCRIPTIONS - Permitir criar durante signup
DROP POLICY IF EXISTS "Allow creating subscription for new tenant" ON public.subscriptions;
CREATE POLICY "Allow creating subscription for new tenant" ON public.subscriptions
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can view their subscription" ON public.subscriptions;
CREATE POLICY "Users can view their subscription" ON public.subscriptions
  FOR SELECT 
  USING (tenant_id IN (SELECT tenant_id FROM public.users WHERE auth_user_id = auth.uid()));

-- 5. USERS - Policy CORRIGIDA (resolve o erro!)
DROP POLICY IF EXISTS "Users can manage their own data" ON public.users;
CREATE POLICY "Users can manage their own data" ON public.users
  FOR ALL 
  USING (
    -- Permite ver: próprio user OU users do mesmo tenant OU durante signup (tenant_id NULL)
    auth_user_id = auth.uid() 
    OR tenant_id = get_user_tenant_id()
    OR get_user_tenant_id() IS NULL
  )
  WITH CHECK (
    -- Permite criar/editar: apenas próprio user OU users do mesmo tenant
    auth_user_id = auth.uid()
    OR (tenant_id = get_user_tenant_id() AND get_user_tenant_id() IS NOT NULL)
  );

-- 6. ROLES - Permitir criar roles padrão durante signup
DROP POLICY IF EXISTS "Tenant can manage roles" ON public.roles;
CREATE POLICY "Tenant can manage roles" ON public.roles
  FOR ALL 
  USING (
    tenant_id = get_user_tenant_id() 
    OR get_user_tenant_id() IS NULL
  )
  WITH CHECK (
    auth.role() = 'authenticated'  -- Qualquer autenticado pode criar (durante signup)
  );

-- 7. ROLE_PERMISSIONS - Permitir criar permissions durante signup
DROP POLICY IF EXISTS "Tenant can manage permissions" ON public.role_permissions;
CREATE POLICY "Tenant can manage permissions" ON public.role_permissions
  FOR ALL 
  USING (
    tenant_id = get_user_tenant_id()
    OR get_user_tenant_id() IS NULL
  )
  WITH CHECK (
    auth.role() = 'authenticated'
  );

-- =============================================
-- PRONTO! Agora teste o signup novamente
-- =============================================
