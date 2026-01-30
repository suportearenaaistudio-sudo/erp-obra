-- =============================================
-- MIGRATION 013: Dev Admin Permissions
-- =============================================
-- Permite que Dev Admins vejam todos os tenants
-- e todos os dados do sistema
-- =============================================

-- 1. Criar função para verificar se é Dev Admin
CREATE OR REPLACE FUNCTION public.is_dev_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Lista de emails de Dev Admins
  RETURN auth.jwt() ->> 'email' IN (
    'admin@obra360.com',
    'suporte@obra360.com',
    'vitorpradotamos@gmail.com',
    'marcospaulotrindade3@gmail.com'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Atualizar RLS policy de tenants para permitir Dev Admins
DROP POLICY IF EXISTS "Dev admins can view all tenants" ON public.tenants;
CREATE POLICY "Dev admins can view all tenants"
  ON public.tenants
  FOR SELECT
  USING (is_dev_admin());

-- 3. Atualizar RLS policy de users para permitir Dev Admins
DROP POLICY IF EXISTS "Dev admins can view all users" ON public.users;
CREATE POLICY "Dev admins can view all users"
  ON public.users
  FOR SELECT
  USING (is_dev_admin());

-- 4. Atualizar RLS policy de subscriptions para permitir Dev Admins
DROP POLICY IF EXISTS "Dev admins can view all subscriptions" ON public.subscriptions;
CREATE POLICY "Dev admins can view all subscriptions"
  ON public.subscriptions
  FOR SELECT
  USING (is_dev_admin());

-- 5. Permitir Dev Admins modificarem subscriptions
DROP POLICY IF EXISTS "Dev admins can update subscriptions" ON public.subscriptions;
CREATE POLICY "Dev admins can update subscriptions"
  ON public.subscriptions
  FOR UPDATE
  USING (is_dev_admin())
  WITH CHECK (is_dev_admin());

-- 6. Atualizar RLS policy de plans para permitir Dev Admins
DROP POLICY IF EXISTS "Dev admins can view all plans" ON public.plans;
CREATE POLICY "Dev admins can view all plans"
  ON public.plans
  FOR SELECT
  USING (is_dev_admin());

-- 7. Atualizar RLS policy de features para permitir Dev Admins
DROP POLICY IF EXISTS "Dev admins can view all features" ON public.features;
CREATE POLICY "Dev admins can view all features"
  ON public.features
  FOR SELECT
  USING (is_dev_admin());

-- 8. Permitir Dev Admins gerenciarem feature overrides
DROP POLICY IF EXISTS "Dev admins can view all feature overrides" ON public.tenant_feature_overrides;
CREATE POLICY "Dev admins can view all feature overrides"
  ON public.tenant_feature_overrides
  FOR SELECT
  USING (is_dev_admin());

DROP POLICY IF EXISTS "Dev admins can insert feature overrides" ON public.tenant_feature_overrides;
CREATE POLICY "Dev admins can insert feature overrides"
  ON public.tenant_feature_overrides
  FOR INSERT
  WITH CHECK (is_dev_admin());

DROP POLICY IF EXISTS "Dev admins can update feature overrides" ON public.tenant_feature_overrides;
CREATE POLICY "Dev admins can update feature overrides"
  ON public.tenant_feature_overrides
  FOR UPDATE
  USING (is_dev_admin())
  WITH CHECK (is_dev_admin());

DROP POLICY IF EXISTS "Dev admins can delete feature overrides" ON public.tenant_feature_overrides;
CREATE POLICY "Dev admins can delete feature overrides"
  ON public.tenant_feature_overrides
  FOR DELETE
  USING (is_dev_admin());

-- 9. Permitir Dev Admins verem roles
DROP POLICY IF EXISTS "Dev admins can view all roles" ON public.roles;
CREATE POLICY "Dev admins can view all roles"
  ON public.roles
  FOR SELECT
  USING (is_dev_admin());

-- 10. Permitir Dev Admins verem projects (para contagem)
DROP POLICY IF EXISTS "Dev admins can view all projects" ON public.projects;
CREATE POLICY "Dev admins can view all projects"
  ON public.projects
  FOR SELECT
  USING (is_dev_admin());

-- =============================================
-- FIM DA MIGRATION 013
-- =============================================
