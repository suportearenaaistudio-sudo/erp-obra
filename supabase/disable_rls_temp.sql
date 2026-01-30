-- =============================================
-- SOLUÇÃO TEMPORÁRIA: Desabilitar RLS
-- =============================================
-- ATENÇÃO: Isso é apenas para DEBUG!
-- NÃO use em produção!
-- =============================================

-- Desabilitar RLS nas tabelas principais
ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.features DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_feature_overrides DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;

-- =============================================
-- DEPOIS DE TESTAR, REABILITE:
-- =============================================
-- ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.tenant_feature_overrides ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
