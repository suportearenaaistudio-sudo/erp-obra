-- =============================================
-- ADICIONAR DEV ADMINS PRINCIPAIS
-- =============================================
-- Este script adiciona os administradores principais do SaaS
-- Eles terão acesso total ao Dev Admin Dashboard
-- =============================================

-- 1. Inserir Dev Admins na tabela saas_users
-- (Usar ON CONFLICT para evitar duplicatas)

INSERT INTO public.saas_users (id, email, name, role, status)
VALUES
  -- Vitor - Dev Admin Principal
  (
    '10000000-0000-0000-0000-000000000001'::UUID,
    'vitorpradotamos@gmail.com',
    'Vitor Prado Tamos',
    'dev_admin',
    'active'
  ),
  -- Marcos - Dev Admin Principal  
  (
    '10000000-0000-0000-0000-000000000002'::UUID,
    'marcospaulotrindade3@gmail.com',
    'Marcos Paulo Trindade',
    'dev_admin',
    'active'
  )
ON CONFLICT (email) 
DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  updated_at = NOW();

-- 2. Confirmar criação
SELECT 
  email,
  name,
  role,
  status,
  created_at
FROM public.saas_users
WHERE role = 'dev_admin'
ORDER BY created_at;

-- =============================================
-- PRONTO!
-- =============================================
-- Os emails vitorpradotamos@gmail.com e marcospaulotrindade3@gmail.com
-- agora são Dev Admins e terão acesso a:
-- - /dev-admin (painel de administração global)
-- - Ver todos os tenants
-- - Gerenciar planos e features
-- - Ativar/desativar features por tenant
-- - Ver estatísticas globais
-- =============================================
