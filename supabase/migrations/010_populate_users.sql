-- ==========================================
-- MIGRATION 010: Populate Users Table from Auth
-- ==========================================
-- Cria registros na tabela users para usuários que já existem no auth.users

-- 1. Inserir users que existem no auth.users mas não estão na tabela public.users
INSERT INTO public.users (
  id,
  tenant_id,
  auth_user_id,
  email,
  name,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid() as id,
  (SELECT id FROM public.tenants LIMIT 1) as tenant_id, -- Pega o primeiro tenant
  au.id as auth_user_id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) as name, -- Nome do metadata ou email
  au.created_at,
  au.created_at as updated_at
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.auth_user_id = au.id
);

-- 2. Verificar quantos users foram criados
DO $$
DECLARE
  user_count INT;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.users;
  RAISE NOTICE 'Total de users na tabela: %', user_count;
END $$;

-- 3. Ver os users criados
SELECT 
  id, 
  auth_user_id, 
  email, 
  name, 
  tenant_id,
  created_at
FROM public.users
ORDER BY created_at DESC;
