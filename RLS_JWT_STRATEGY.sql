-- =============================================
-- RLS STRATEGY: JWT CLAIMS (A Solução Definitiva)
-- =============================================
-- Problema: Policies recursivas (users consultando users)
-- Solução: Colocar tenant_id no JWT (token)
-- Resultado: Policies super rápidas e ZERO recursão
-- =============================================

-- 1. PRIMEIRO: Reabilitar RLS (desfazendo o debug)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 2. Trigger para manter tenant_id sincronizado no JWT
-- Sempre que um user é criado/atualizado, salva tenant_id no metadata do Auth
CREATE OR REPLACE FUNCTION public.sync_user_tenant_to_jwt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Atualiza o metadata do usuário na tabela auth.users
  UPDATE auth.users
  SET raw_app_meta_data = 
    coalesce(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('tenant_id', NEW.tenant_id)
  WHERE id = NEW.auth_user_id;
  
  RETURN NEW;
END;
$$;

-- Criar trigger na tabela users
DROP TRIGGER IF EXISTS on_user_change_sync_jwt ON public.users;
CREATE TRIGGER on_user_change_sync_jwt
AFTER INSERT OR UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_tenant_to_jwt();

-- 3. Sincronizar usuários JÁ EXISTENTES agora
-- (Executa uma vez para corrigir quem já existe)
DO $$
BEGIN
  UPDATE auth.users au
  SET raw_app_meta_data = 
    coalesce(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('tenant_id', pu.tenant_id)
  FROM public.users pu
  WHERE au.id = pu.auth_user_id;
END$$;

-- 4. Criar função auxiliar para ler do JWT
-- Mais limpo e fácil de usar nas policies
CREATE OR REPLACE FUNCTION auth.jwt_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid;
$$;

-- 5. NOVAS POLICIES (Sem Recursão!)

-- USERS: Vê apenas usuários do mesmo tenant (lido do token)
DROP POLICY IF EXISTS "Users see own tenant users" ON public.users;
CREATE POLICY "Users see own tenant users" ON public.users
  FOR SELECT
  USING (tenant_id = auth.jwt_tenant_id());

-- TENANTS: Vê apenas seu próprio tenant
DROP POLICY IF EXISTS "Users see own tenant" ON public.tenants;
CREATE POLICY "Users see own tenant" ON public.tenants
  FOR SELECT
  USING (id = auth.jwt_tenant_id());

-- SUBSCRIPTIONS: Vê apenas do seu tenant
DROP POLICY IF EXISTS "Users see own subscription" ON public.subscriptions;
CREATE POLICY "Users see own subscription" ON public.subscriptions
  FOR SELECT
  USING (tenant_id = auth.jwt_tenant_id());

-- =============================================
-- PRONTO! 🚀
-- Agora o Supabase não consulta o banco para saber o tenant.
-- Ele lê direto do token do usuário.
--
-- IMPORTANTE: É NECESSÁRIO FAZER LOGOUT E LOGIN
-- PARA O NOVO TOKEN SER GERADO COM O TENANT_ID!
-- =============================================
