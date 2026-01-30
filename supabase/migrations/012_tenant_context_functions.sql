-- =============================================
-- MIGRATION 012: Tenant Context Functions
-- =============================================
-- Funções para gerenciar contexto de tenant via session variables
-- Usado pelo DB wrapper para garantir isolamento
-- =============================================

-- 1. Função para definir tenant_id na sessão
CREATE OR REPLACE FUNCTION public.set_tenant_context(p_tenant_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Define variável de sessão que pode ser usada em RLS policies
  PERFORM set_config('app.tenant_id', p_tenant_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Função para limpar tenant_id da sessão
CREATE OR REPLACE FUNCTION public.clear_tenant_context()
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.tenant_id', '', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Função para obter tenant_id da sessão
CREATE OR REPLACE FUNCTION public.get_session_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('app.tenant_id', true), '')::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Permissões
GRANT EXECUTE ON FUNCTION public.set_tenant_context(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_tenant_context() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_session_tenant_id() TO authenticated;

-- =============================================
-- PRONTO!
-- =============================================
-- Funções criadas:
--   - set_tenant_context(tenant_id)
--   - clear_tenant_context()
--   - get_session_tenant_id()
-- =============================================
