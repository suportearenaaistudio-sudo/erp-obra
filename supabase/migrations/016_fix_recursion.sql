-- =============================================
-- MIGRATION 016: Corrigir Recursão Infinita
-- =============================================
-- Esta migration corrige o problema de recursão
-- nas policies usando uma função SECURITY DEFINER
-- =============================================

-- 1. Criar função que retorna tenant_id do usuário atual
-- SECURITY DEFINER = roda com privilégios do dono (bypass RLS)
CREATE OR REPLACE FUNCTION public.get_current_user_tenant_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT tenant_id 
    FROM public.users 
    WHERE auth_user_id = auth.uid()
    LIMIT 1
  );
END;
$$;

-- 2. Remover policies antigas que causam recursão
DROP POLICY IF EXISTS "Users see own tenant" ON public.tenants;
DROP POLICY IF EXISTS "Users see own tenant users" ON public.users;
DROP POLICY IF EXISTS "Users update own profile" ON public.users;
DROP POLICY IF EXISTS "Users see own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users see own overrides" ON public.tenant_feature_overrides;
DROP POLICY IF EXISTS "Users see own tenant roles" ON public.roles;
DROP POLICY IF EXISTS "Users see own permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Users see own tenant projects" ON public.projects;

-- =============================================
-- 3. RECRIAR POLICIES SEM RECURSÃO
-- =============================================

-- TENANTS: Usuários veem próprio tenant
CREATE POLICY "Users see own tenant" ON public.tenants
  FOR SELECT
  USING (id = get_current_user_tenant_id());

-- USERS: Usuários veem usuários do próprio tenant
CREATE POLICY "Users see own tenant users" ON public.users
  FOR SELECT
  USING (tenant_id = get_current_user_tenant_id());

-- USERS: Usuários podem atualizar próprio perfil
CREATE POLICY "Users update own profile" ON public.users
  FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- SUBSCRIPTIONS: Usuários veem subscription do próprio tenant
CREATE POLICY "Users see own subscription" ON public.subscriptions
  FOR SELECT
  USING (tenant_id = get_current_user_tenant_id());

-- TENANT_FEATURE_OVERRIDES: Usuários veem overrides do próprio tenant
CREATE POLICY "Users see own overrides" ON public.tenant_feature_overrides
  FOR SELECT
  USING (tenant_id = get_current_user_tenant_id());

-- ROLES: Usuários veem roles do próprio tenant
CREATE POLICY "Users see own tenant roles" ON public.roles
  FOR SELECT
  USING (tenant_id = get_current_user_tenant_id());

-- ROLE_PERMISSIONS: Usuários veem permissions do próprio tenant
CREATE POLICY "Users see own permissions" ON public.role_permissions
  FOR SELECT
  USING (tenant_id = get_current_user_tenant_id());

-- PROJECTS: Usuários veem e gerenciam projetos do próprio tenant
CREATE POLICY "Users see own tenant projects" ON public.projects
  FOR ALL
  USING (tenant_id = get_current_user_tenant_id())
  WITH CHECK (tenant_id = get_current_user_tenant_id());

-- =============================================
-- PRONTO! RECURSÃO CORRIGIDA!
-- =============================================
-- A função get_current_user_tenant_id() roda com
-- SECURITY DEFINER, então bypassa o RLS e não
-- causa recursão infinita!
-- =============================================
