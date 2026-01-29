-- =============================================
-- SOLUÇÃO DEFINITIVA: Criar tenant através de Edge Function
-- =============================================
-- Este script cria um TRIGGER que automaticamente cria o tenant
-- quando um novo usuário é criado no auth.users
-- =============================================

-- 1. Função que cria todo o setup do tenant automaticamente
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
BEGIN
  -- Só executa se tiver tenant_id nos metadados (signup novo)
  -- Se não tiver, é um login existente
  IF NEW.raw_user_meta_data->>'tenant_id' IS NOT NULL THEN
    -- Usuário já tem tenant (dados foram criados antes)
    -- Apenas cria o registro do user na tabela users
    INSERT INTO public.users (
      auth_user_id,
      tenant_id,
      email,
      name,
      status
    ) VALUES (
      NEW.id,
      (NEW.raw_user_meta_data->>'tenant_id')::UUID,
      NEW.email,
      NEW.raw_user_meta_data->>'name',
      'active'
    );
    
    RETURN NEW;
  END IF;

  -- Se não tem tenant_id nos metadados, é um signup NOVO
  -- Precisamos criar TUDO

  -- 2. Criar tenant
  INSERT INTO public.tenants (name, slug, email, status)
  VALUES (
    NEW.raw_user_meta_data->>'company_name',
    lower(regexp_replace(NEW.raw_user_meta_data->>'company_name', '[^a-zA-Z0-9]+', '-', 'g')),
    NEW.email,
    'active'
  )
  RETURNING id INTO v_tenant_id;

  -- 3. Pegar o plano Starter
  SELECT id INTO v_plan_id
  FROM public.plans
  WHERE name = 'starter'
  LIMIT 1;

  -- 4. Calcular trial_end (14 dias)
  v_trial_end := CURRENT_DATE + INTERVAL '14 days';

  -- 5. Criar subscription
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

  -- 6. Criar roles padrão
  INSERT INTO public.roles (tenant_id, name, is_tenant_admin, is_default)
  VALUES
    (v_tenant_id, 'Admin', true, true),
    (v_tenant_id, 'Financeiro', false, false),
    (v_tenant_id, 'Gestor de Obras', false, false),
    (v_tenant_id, 'Compras', false, false),
    (v_tenant_id, 'Vendas', false, false);

  -- 6.1 Pegar o ID do role Admin que acabamos de criar
  SELECT id INTO v_admin_role_id
  FROM public.roles
  WHERE tenant_id = v_tenant_id AND name = 'Admin'
  LIMIT 1;

  -- 7. Criar permissões para Admin
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

  -- 8. Criar user profile com role Admin
  INSERT INTO public.users (
    auth_user_id,
    tenant_id,
    email,
    name,
    role_id,
    status
  )
  SELECT
    NEW.id,
    v_tenant_id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    v_admin_role_id,
    'active';

  RETURN NEW;
END;
$$;

-- 2. Remover trigger antigo se existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Criar novo trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- PERMISSÕES SIMPLIFICADAS
-- =============================================
-- Agora não precisamos de policies tão permissivas
-- O trigger roda com SECURITY DEFINER (como admin)

-- Remover policies antigas
DROP POLICY IF EXISTS "Allow authenticated users to create tenant" ON public.tenants;
DROP POLICY IF EXISTS "Allow creating subscription for new tenant" ON public.subscriptions;
DROP POLICY IF EXISTS "Tenant can manage roles" ON public.roles;
DROP POLICY IF EXISTS "Tenant can manage permissions" ON public.role_permissions;

-- Policies READ-ONLY para tenants/subscriptions
CREATE POLICY "Users can view their own tenant" ON public.tenants
  FOR SELECT 
  USING (id IN (SELECT tenant_id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can view their subscription" ON public.subscriptions
  FOR SELECT 
  USING (tenant_id IN (SELECT tenant_id FROM public.users WHERE auth_user_id = auth.uid()));

-- Policy para users (ver próprios dados do tenant)
DROP POLICY IF EXISTS "Users can manage their own data" ON public.users;
CREATE POLICY "Users tenant isolation" ON public.users
  FOR ALL 
  USING (
    auth_user_id = auth.uid() 
    OR tenant_id = get_user_tenant_id()
  );

-- Policies para roles e permissions (apenas SELECT)
CREATE POLICY "Users can view tenant roles" ON public.roles
  FOR SELECT 
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can view tenant permissions" ON public.role_permissions
  FOR SELECT 
  USING (tenant_id = get_user_tenant_id());

-- =============================================
-- PRONTO!
-- =============================================
-- Agora o signup funciona assim:
-- 1. Frontend chama supabase.auth.signUp()
-- 2. Supabase Auth cria user em auth.users
-- 3. TRIGGER detecta e cria TUDO automaticamente
-- 4. Frontend recebe sucesso e pode fazer login!
