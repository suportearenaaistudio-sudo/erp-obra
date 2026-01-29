-- ==========================================
-- MIGRATION 009: Fix Users RLS Policies
-- ==========================================
-- Corrige as políticas RLS para permitir que users leiam seus próprios dados

-- 1. Dropar policies existentes (se houver conflito)
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;

-- 2. Criar policy de SELECT (leitura)
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT
  USING (auth_user_id = auth.uid());

-- 3. Criar policy de UPDATE (atualização)
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- 4. Admin do tenant pode ver todos os users do tenant
DROP POLICY IF EXISTS "Tenant admins can view all users" ON public.users;
CREATE POLICY "Tenant admins can view all users" ON public.users
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM public.users 
      WHERE auth_user_id = auth.uid() 
        AND role_id IN (SELECT id FROM public.roles WHERE is_tenant_admin = true)
    )
  );

-- 5. Garantir que RLS está habilitado
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 6. Verificar policies
DO $$
BEGIN
  RAISE NOTICE 'RLS policies for users table updated successfully';
END $$;
