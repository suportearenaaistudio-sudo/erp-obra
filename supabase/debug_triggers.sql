-- =============================================
-- DEBUG: Verificar Triggers de Signup
-- =============================================

-- 1. Ver todos os triggers
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY trigger_name;

-- 2. Ver função de handle_new_user
SELECT 
  proname as function_name,
  prosrc as function_code
FROM pg_proc
WHERE proname LIKE '%handle_new_user%';

-- 3. Ver se existem dados nas tabelas
SELECT 'tenants' as tabela, COUNT(*) as total FROM public.tenants
UNION ALL
SELECT 'users' as tabela, COUNT(*) as total FROM public.users
UNION ALL
SELECT 'subscriptions' as tabela, COUNT(*) as total FROM public.subscriptions;

-- 4. Ver usuários do auth (para comparar)
SELECT 
  id,
  email,
  created_at,
  raw_user_meta_data
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;
