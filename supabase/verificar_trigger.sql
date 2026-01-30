-- =============================================
-- VERIFICAR TRIGGER E DADOS
-- =============================================

-- 1. Ver se o trigger existe
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 2. Ver usuários no auth.users
SELECT 
  id,
  email,
  created_at,
  raw_user_meta_data->>'name' as name,
  raw_user_meta_data->>'company_name' as company_name,
  raw_user_meta_data
FROM auth.users
ORDER BY created_at DESC;

-- 3. Ver tenants criados
SELECT 
  id,
  name,
  email,
  slug,
  created_at
FROM public.tenants
ORDER BY created_at DESC;

-- 4. Ver users criados
SELECT 
  id,
  tenant_id,
  auth_user_id,
  email,
  name,
  created_at
FROM public.users
ORDER BY created_at DESC;

-- =============================================
-- ANÁLISE:
-- Compare os resultados:
-- - Se auth.users tem 3 registros mas tenants tem 1
--   → O trigger não rodou para os novos usuários
-- =============================================
