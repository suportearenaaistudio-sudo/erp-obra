-- =============================================
-- RLS FIX: SECURITY DEFINER (Sem mexer no Auth)
-- =============================================
-- Solução para o erro 42501 (Permission Denied)
-- =============================================

-- 1. Reabilitar RLS (desfazendo o debug)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 2. Função SEGURA para pegar tenant_id
-- O segredo é "SET row_security = off" para forçar bypass
CREATE OR REPLACE FUNCTION public.get_tenant_id_safe()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off -- <--- O TRUQUE MÁGICO
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

-- 3. Função Helper para verificar Dev Admin
CREATE OR REPLACE FUNCTION public.is_dev_admin_safe()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET row_security = off
AS $$
BEGIN
  RETURN (
    SELECT EXISTS (
      SELECT 1 
      FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND email IN ('admin@obra360.com', 'suporte@obra360.com', 'marcospaulotrindade3@gmail.com')
    )
  );
END;
$$;

-- 4. REAPLICAR POLICIES

-- USERS
DROP POLICY IF EXISTS "Users see own tenant users" ON public.users;
CREATE POLICY "Users see own tenant users" ON public.users
  FOR SELECT
  USING (tenant_id = public.get_tenant_id_safe());

-- TENANTS
DROP POLICY IF EXISTS "Users see own tenant" ON public.tenants;
CREATE POLICY "Users see own tenant" ON public.tenants
  FOR SELECT
  USING (id = public.get_tenant_id_safe());

-- SUBSCRIPTIONS
DROP POLICY IF EXISTS "Users see own subscription" ON public.subscriptions;
CREATE POLICY "Users see own subscription" ON public.subscriptions
  FOR SELECT
  USING (tenant_id = public.get_tenant_id_safe());

-- ROLES
DROP POLICY IF EXISTS "Users see own tenant roles" ON public.roles;
CREATE POLICY "Users see own tenant roles" ON public.roles
  FOR SELECT
  USING (tenant_id = public.get_tenant_id_safe());

-- =============================================
-- PRONTO! 
-- Esta versão não requer permissões especiais
-- e usa o bypass nativo do Postgres para evitar recursão.
-- =============================================
