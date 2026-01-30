-- =============================================
-- SOLUÇÃO DRÁSTICA: DESABILITAR RLS TEMPORARIAMENTE
-- =============================================
-- ATENÇÃO: Use apenas para desenvolvimento/debug!
-- Isso permite identificar se o problema é realmente RLS
-- =============================================

-- 1. DESABILITAR RLS apenas na tabela users
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 2. DESABILITAR RLS na tabela tenants também
ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;

-- =============================================
-- TESTE AGORA!
-- =============================================
-- Após aplicar, recarregue o browser e teste:
-- 1. Menu lateral deve mostrar Finance e Inventory
-- 2. AI Chat deve funcionar
-- 3. Dev Admin deve mostrar dados corretos
--
-- Se funcionar, o problema é 100% nas policies RLS!
-- =============================================

-- COMO REVERTER (após testar):
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
