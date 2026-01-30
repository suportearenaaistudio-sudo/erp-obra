-- =============================================
-- CORREÇÃO DEFINITIVA DA RECURSÃO RLS
-- =============================================
-- Problema: As policies na tabela 'users' consultam
-- a própria tabela 'users', causando loop infinito
--
-- Solução: Usar cache de tenant_id via função
-- SECURITY DEFINER que bypassa RLS
-- =============================================

-- 1. DROP policies problemáticas
DROP POLICY IF EXISTS "Users see own tenant users" ON public.users;
DROP POLICY IF EXISTS "Users see own tenant" ON public.tenants;
DROP POLICY IF EXISTS "Dev admins see all users" ON public.users;
DROP POLICY IF EXISTS "Dev admins see all tenants" ON public.tenants;

-- 2. Criar função que retorna tenant_id SEM consultar RLS
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER  -- Bypassa RLS!
STABLE  -- Cache durante a query
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

-- 3. Função para check de dev admin
CREATE OR REPLACE FUNCTION public.is_dev_admin_email()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN auth.jwt() ->> 'email' = ANY(ARRAY[
    'admin@obra360.com',
    'suporte@obra360.com',
    'vitorpradotamos@gmail.com',
    'marcospaulotrindade3@gmail.com'
  ]);
END;
$$;

-- 4. RECREATE policies SEM recursão

-- TENANTS: Dev admins veem tudo
CREATE POLICY "Dev admins see all tenants" ON public.tenants
  FOR SELECT
  USING (is_dev_admin_email());

-- TENANTS: Usuários veem seu tenant
CREATE POLICY "Users see own tenant" ON public.tenants
  FOR SELECT
  USING (id = get_user_tenant_id());

-- USERS: Dev admins veem todos
CREATE POLICY "Dev admins see all users" ON public.users
  FOR SELECT
  USING (is_dev_admin_email());

-- USERS: Usuários veem colegas do tenant
CREATE POLICY "Users see own tenant users" ON public.users
  FOR SELECT
  USING (tenant_id = get_user_tenant_id());

-- =============================================
-- PRONTO! RECURSÃO ELIMINADA!
-- =============================================
-- As funções SECURITY DEFINER bypassam RLS,
-- então não há mais loop infinito ao consultar users
-- =============================================
