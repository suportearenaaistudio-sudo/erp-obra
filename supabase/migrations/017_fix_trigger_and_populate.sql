-- =============================================
-- MIGRATION 017: Corrigir Trigger e Popular Dados
-- =============================================
-- Esta migration recria o trigger e popula dados
-- dos usuários que se cadastraram mas não têm tenant
-- =============================================

-- 1. Remover trigger antigo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Recriar função do trigger (versão melhorada)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_tenant_id UUID;
  v_plan_id UUID;
  v_admin_role_id UUID;
  v_trial_end DATE;
  v_company_name TEXT;
BEGIN
  -- Log para debug
  RAISE NOTICE 'Trigger executado para usuário: %', NEW.email;
  
  -- Verificar se já existe registro na tabela users
  IF EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = NEW.id) THEN
    RAISE NOTICE 'Usuário já existe na tabela users, pulando...';
    RETURN NEW;
  END IF;

  -- Pegar company_name dos metadados (ou usar email como fallback)
  v_company_name := COALESCE(
    NEW.raw_user_meta_data->>'company_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  RAISE NOTICE 'Company name: %', v_company_name;

  -- Criar tenant
  INSERT INTO public.tenants (name, slug, email, status)
  VALUES (
    v_company_name,
    lower(regexp_replace(v_company_name, '[^a-zA-Z0-9]+', '-', 'g')),
    NEW.email,
    'active'
  )
  RETURNING id INTO v_tenant_id;

  RAISE NOTICE 'Tenant criado: %', v_tenant_id;

  -- Pegar o plano Starter
  SELECT id INTO v_plan_id
  FROM public.plans
  WHERE name = 'starter'
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'Plano Starter não encontrado!';
  END IF;

  -- Calcular trial_end (14 dias)
  v_trial_end := CURRENT_DATE + INTERVAL '14 days';

  -- Criar subscription
  INSERT INTO public.subscriptions (
    tenant_id,
    plan_id,
    status,
    trial_start,
    trial_end,
    current_period_start,
    current_period_end,
    billing_cycle
  ) VALUES (
    v_tenant_id,
    v_plan_id,
    'trial',
    CURRENT_DATE,
    v_trial_end,
    CURRENT_DATE,
    v_trial_end,
    'monthly'
  );

  RAISE NOTICE 'Subscription criada';

  -- Criar roles padrão
  INSERT INTO public.roles (tenant_id, name, is_tenant_admin, is_default)
  VALUES
    (v_tenant_id, 'Admin', true, true),
    (v_tenant_id, 'Financeiro', false, false),
    (v_tenant_id, 'Gestor de Obras', false, false),
    (v_tenant_id, 'Compras', false, false),
    (v_tenant_id, 'Vendas', false, false);

  -- Pegar o ID do role Admin
  SELECT id INTO v_admin_role_id
  FROM public.roles
  WHERE tenant_id = v_tenant_id AND name = 'Admin'
  LIMIT 1;

  RAISE NOTICE 'Roles criadas, Admin role: %', v_admin_role_id;

  -- Criar permissões para Admin
  INSERT INTO public.role_permissions (tenant_id, role_id, permission_key)
  SELECT
    v_tenant_id,
    v_admin_role_id,
    perm
  FROM unnest(ARRAY[
    'CLIENTS:READ', 'CLIENTS:WRITE',
    'PROJECTS:READ', 'PROJECTS:WRITE',
    'INVENTORY:READ', 'INVENTORY:WRITE',
    'PROCUREMENT:READ', 'PROCUREMENT:WRITE', 'PROCUREMENT:APPROVE',
    'FINANCE:READ', 'FINANCE:WRITE', 'FINANCE:APPROVE',
    'CONTRACTORS:READ', 'CONTRACTORS:WRITE',
    'REPORTS:READ', 'REPORTS:EXPORT',
    'USERS:READ', 'USERS:WRITE',
    'ROLES:READ', 'ROLES:WRITE'
  ]) AS perm;

  -- Criar user profile com role Admin
  INSERT INTO public.users (
    auth_user_id,
    tenant_id,
    email,
    name,
    role_id
  ) VALUES (
    NEW.id,
    v_tenant_id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    v_admin_role_id
  );

  RAISE NOTICE 'User profile criado';
  RAISE NOTICE 'Setup completo para: %', NEW.email;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erro no trigger handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 3. Recriar trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 4. POPULAR DADOS DOS USUÁRIOS EXISTENTES
-- =============================================
-- Para cada usuário em auth.users que NÃO tem
-- registro em public.users, criar tenant e dados

DO $$
DECLARE
  auth_user RECORD;
  v_tenant_id UUID;
  v_plan_id UUID;
  v_admin_role_id UUID;
  v_trial_end DATE;
  v_company_name TEXT;
BEGIN
  -- Pegar plano Starter
  SELECT id INTO v_plan_id FROM public.plans WHERE name = 'starter' LIMIT 1;
  
  -- Para cada usuário do auth que não tem registro
  FOR auth_user IN 
    SELECT * FROM auth.users au
    WHERE NOT EXISTS (
      SELECT 1 FROM public.users u WHERE u.auth_user_id = au.id
    )
  LOOP
    RAISE NOTICE 'Criando dados para usuário existente: %', auth_user.email;
    
    -- Company name
    v_company_name := COALESCE(
      auth_user.raw_user_meta_data->>'company_name',
      auth_user.raw_user_meta_data->>'name',
      split_part(auth_user.email, '@', 1)
    );
    
    -- Criar tenant
    INSERT INTO public.tenants (name, slug, email, status)
    VALUES (
      v_company_name,
      lower(regexp_replace(v_company_name, '[^a-zA-Z0-9]+', '-', 'g')),
      auth_user.email,
      'active'
    )
    RETURNING id INTO v_tenant_id;
    
    -- Trial end
    v_trial_end := CURRENT_DATE + INTERVAL '14 days';
    
    -- Criar subscription
    INSERT INTO public.subscriptions (
      tenant_id, plan_id, status, trial_start, trial_end,
      current_period_start, current_period_end, billing_cycle
    ) VALUES (
      v_tenant_id, v_plan_id, 'trial', CURRENT_DATE, v_trial_end,
      CURRENT_DATE, v_trial_end, 'monthly'
    );
    
    -- Criar roles
    INSERT INTO public.roles (tenant_id, name, is_tenant_admin, is_default)
    VALUES
      (v_tenant_id, 'Admin', true, true),
      (v_tenant_id, 'Financeiro', false, false),
      (v_tenant_id, 'Gestor de Obras', false, false),
      (v_tenant_id, 'Compras', false, false),
      (v_tenant_id, 'Vendas', false, false);
    
    -- Pegar Admin role
    SELECT id INTO v_admin_role_id
    FROM public.roles
    WHERE tenant_id = v_tenant_id AND name = 'Admin'
    LIMIT 1;
    
    -- Criar permissões
    INSERT INTO public.role_permissions (tenant_id, role_id, permission_key)
    SELECT v_tenant_id, v_admin_role_id, perm
    FROM unnest(ARRAY[
      'CLIENTS:READ', 'CLIENTS:WRITE',
      'PROJECTS:READ', 'PROJECTS:WRITE',
      'INVENTORY:READ', 'INVENTORY:WRITE',
      'PROCUREMENT:READ', 'PROCUREMENT:WRITE', 'PROCUREMENT:APPROVE',
      'FINANCE:READ', 'FINANCE:WRITE', 'FINANCE:APPROVE',
      'CONTRACTORS:READ', 'CONTRACTORS:WRITE',
      'REPORTS:READ', 'REPORTS:EXPORT',
      'USERS:READ', 'USERS:WRITE',
      'ROLES:READ', 'ROLES:WRITE'
    ]) AS perm;
    
    -- Criar user profile
    INSERT INTO public.users (
      auth_user_id, tenant_id, email, name, role_id
    ) VALUES (
      auth_user.id,
      v_tenant_id,
      auth_user.email,
      COALESCE(auth_user.raw_user_meta_data->>'name', split_part(auth_user.email, '@', 1)),
      v_admin_role_id
    );
    
    RAISE NOTICE '✅ Dados criados para: %', auth_user.email;
  END LOOP;
  
  RAISE NOTICE '🎉 Migração de usuários existentes concluída!';
END $$;

-- =============================================
-- PRONTO!
-- =============================================
-- Agora:
-- ✅ Trigger recriado e melhorado (com logs)
-- ✅ Dados dos usuários existentes foram criados
-- ✅ Novos usuários terão dados criados automaticamente
-- =============================================
