-- =============================================
-- DIAGNÓSTICO E CORREÇÃO DE DADOS (MULTI-TENANT)
-- =============================================

-- 1. Verificar se existem Planos Básicos
-- Se não existirem, cria os planos padrão
INSERT INTO public.plans (name, display_name, description, price_monthly, included_features)
VALUES 
('starter', 'Starter', 'Plano inicial', 0, '{"CRM","PROJECTS","FINANCE","INVENTORY","PROCUREMENT","CONTRACTORS","AI_CHAT"}'),
('pro', 'Pro', 'Plano profissional', 9900, '{"CRM","PROJECTS","FINANCE","INVENTORY","PROCUREMENT","CONTRACTORS","AI_CHAT","REPORTS_EXPORT"}'),
('enterprise', 'Enterprise', 'Plano empresarial', 29900, '{"CRM","PROJECTS","FINANCE","INVENTORY","PROCUREMENT","CONTRACTORS","AI_CHAT","REPORTS_EXPORT","BUDGET_PDF"}')
ON CONFLICT (name) DO NOTHING;

-- 2. Garantir que TODO Tenant tenha uma Subscription
-- Se um tenant não tem assinatura, o sistema acha que ele não tem features e bloqueia tudo.
DO $$
DECLARE
    r RECORD;
    plan_id UUID;
BEGIN
    -- Pega o ID do plano starter
    SELECT id INTO plan_id FROM public.plans WHERE name = 'starter' LIMIT 1;
    
    FOR r IN SELECT id FROM public.tenants WHERE id NOT IN (SELECT tenant_id FROM public.subscriptions)
    LOOP
        INSERT INTO public.subscriptions (tenant_id, plan_id, status, current_period_start, current_period_end)
        VALUES (r.id, plan_id, 'active', NOW(), NOW() + INTERVAL '1 year');
    END LOOP;
END$$;

-- 3. Garantir que usuários sem Tenant sejam vinculados a um novo Tenant
-- Isso evita erro de "Tenant Context Required"
DO $$
DECLARE
    r RECORD;
    new_tenant_id UUID;
BEGIN
    FOR r IN SELECT id, email FROM auth.users WHERE id NOT IN (SELECT auth_user_id FROM public.users)
    LOOP
        -- Cria tenant pessoal
        INSERT INTO public.tenants (name, slug)
        VALUES ('Tenant de ' || r.email, 'tenant-' || substr(md5(random()::text), 1, 8))
        RETURNING id INTO new_tenant_id;
        
        -- Cria profile user
        INSERT INTO public.users (auth_user_id, tenant_id, email, name, role)
        VALUES (r.id, new_tenant_id, r.email, 'User ' || r.email, 'owner');
        
        -- Cria subscription para esse novo tenant
        INSERT INTO public.subscriptions (tenant_id, plan_id, status, current_period_start, current_period_end)
        SELECT new_tenant_id, id, 'active', NOW(), NOW() + INTERVAL '1 year'
        FROM public.plans WHERE name = 'starter';
    END LOOP;
END$$;


-- 4. CORREÇÃO ESPECÍFICA PARA DEV ADMIN
-- Garante que seu email tenha permissão total na tabela saas_users
-- Adicione seu email abaixo se ele não estiver na lista!
INSERT INTO public.saas_users (email, name, role, is_active)
VALUES 
('marcoszane@example.com', 'Marcos Zane', 'SUPER_ADMIN', true), -- Substitua pelo seu email real de login se diferente
('admin@obra360.com', 'Admin', 'SUPER_ADMIN', true),
('suporte@obra360.com', 'Suporte', 'SUPPORT', true)
ON CONFLICT (email) DO UPDATE 
SET role = 'SUPER_ADMIN', is_active = true;

-- 5. Atualizar metadados JWT para todos os usuários (Reforce)
-- Garante que o tenant_id esteja no token
UPDATE auth.users au
SET raw_app_meta_data = 
  coalesce(raw_app_meta_data, '{}'::jsonb) || 
  jsonb_build_object('tenant_id', pu.tenant_id)
FROM public.users pu
WHERE au.id = pu.auth_user_id;

-- =============================================
-- FIM DO DIAGNÓSTICO
-- =============================================
