-- =============================================
-- DEBUG: Verificar Tenants e Permissões
-- =============================================

-- 1. Ver todos os tenants (sem RLS)
SELECT 
  id,
  name,
  email,
  slug,
  status,
  created_at
FROM public.tenants
ORDER BY created_at DESC;

-- 2. Ver todos os usuários (sem RLS)
SELECT 
  id,
  tenant_id,
  email,
  name,
  created_at
FROM public.users
ORDER BY created_at DESC;

-- 3. Verificar se a função is_dev_admin() existe
SELECT 
  proname as function_name,
  prosrc as function_code
FROM pg_proc
WHERE proname = 'is_dev_admin';

-- 4. Testar a função is_dev_admin()
SELECT is_dev_admin() as sou_dev_admin;

-- 5. Ver policies da tabela tenants
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'tenants';

-- =============================================
-- INSTRUÇÕES:
-- 1. Execute cada query separadamente
-- 2. Anote os resultados
-- 3. Me envie o que apareceu
-- =============================================
