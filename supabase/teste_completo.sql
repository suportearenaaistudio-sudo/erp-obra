-- =============================================
-- TESTE COMPLETO: Verificar Sistema
-- =============================================

-- 1. Ver se o trigger existe
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 2. Ver usuários do auth
SELECT 
  id,
  email,
  created_at,
  raw_user_meta_data->>'name' as name,
  raw_user_meta_data->>'company_name' as company_name
FROM auth.users
ORDER BY created_at DESC;

-- 3. Ver tenants criados
SELECT 
  id,
  name,
  email,
  slug,
  status,
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

-- 5. Ver subscriptions
SELECT 
  id,
  tenant_id,
  plan_id,
  status,
  trial_end,
  created_at
FROM public.subscriptions
ORDER BY created_at DESC;

-- =============================================
-- ANÁLISE:
-- - Se auth.users tem registros MAS tenants está vazio
--   → O trigger NÃO está rodando
-- 
-- - Se ambos têm registros
--   → O trigger está funcionando, mas RLS está bloqueando
-- =============================================
