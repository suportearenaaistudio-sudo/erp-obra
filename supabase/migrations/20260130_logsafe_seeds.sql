-- =============================================
-- LOGSAFE GUARDIAN v0.1 - SEEDS
-- Políticas Iniciais de Segurança
-- =============================================

-- Limpar políticas existentes (se houver)
DELETE FROM public.logsafe_policy;

-- =============================================
-- POLÍTICA 1: LOGIN_FAIL_SPIKE
-- =============================================
-- Detecta múltiplas falhas de login em curto período
-- Ação: Bloqueia usuário temporariamente

INSERT INTO public.logsafe_policy (
  name,
  enabled,
  event_type,
  severity,
  window_seconds,
  threshold,
  group_by,
  action_type,
  action_params_json,
  cooldown_seconds
) VALUES (
  'LOGIN_FAIL_SPIKE',
  true,
  'LOGIN_FAILED',
  'MEDIUM',
  300, -- 5 minutos
  10, -- 10 falhas
  'IP_OR_ACTOR', -- Por IP OU por usuário
  'LOCK_USER_TEMP',
  '{"duration_minutes": 10}', -- Bloqueia por 10 minutos
  300 -- 5 minutos de cooldown
);

-- =============================================
-- POLÍTICA 2: ACCESS_DENIED_SPIKE
-- =============================================
-- Detecta muitas tentativas de acesso negado (401/403)
-- Ação: Apenas incidente (sem bloqueio automático)

INSERT INTO public.logsafe_policy (
  name,
  enabled,
  event_type,
  severity,
  window_seconds,
  threshold,
  group_by,
  action_type,
  action_params_json,
  cooldown_seconds
) VALUES (
  'ACCESS_DENIED_SPIKE',
  true,
  'AUTH_DENIED',
  'MEDIUM',
  600, -- 10 minutos
  50, -- 50 negações
  'ACTOR', -- Por usuário
  NULL, -- Sem ação automática
  '{}',
  600 -- 10 minutos de cooldown
);

-- =============================================
-- POLÍTICA 3: CROSS_TENANT_ATTEMPT
-- =============================================
-- Detecta QUALQUER tentativa de acessar dados de outro tenant
-- Ação: Incidente HIGH + força reautenticação

INSERT INTO public.logsafe_policy (
  name,
  enabled,
  event_type,
  severity,
  window_seconds,
  threshold,
  group_by,
  action_type,
  action_params_json,
  cooldown_seconds
) VALUES (
  'CROSS_TENANT_ATTEMPT',
  true,
  'CROSS_TENANT_ATTEMPT',
  'HIGH',
  3600, -- 1 hora
  1, -- Qualquer tentativa (threshold = 1)
  'ACTOR', -- Por usuário
  'REQUIRE_REAUTH',
  '{}', -- Invalida tokens
  3600 -- 1 hora de cooldown
);

-- =============================================
-- POLÍTICA 4: EXPORT_ABUSE
-- =============================================
-- Detecta exportação excessiva de dados
-- Ação: Rate limit em exportações

INSERT INTO public.logsafe_policy (
  name,
  enabled,
  event_type,
  severity,
  window_seconds,
  threshold,
  group_by,
  action_type,
  action_params_json,
  cooldown_seconds
) VALUES (
  'EXPORT_ABUSE',
  true,
  'EXPORT_REQUESTED',
  'LOW',
  3600, -- 1 hora
  20, -- 20 exports
  'TENANT', -- Por tenant
  'RATE_LIMIT',
  '{
    "scope": "EXPORTS",
    "max_per_hour": 5,
    "duration_hours": 2
  }',
  3600 -- 1 hora de cooldown
);

-- =============================================
-- POLÍTICA 5: IMPERSONATION_ABUSE
-- =============================================
-- Detecta impersonation excessivo por Dev Admin
-- Ação: Apenas incidente HIGH (investigação manual)

INSERT INTO public.logsafe_policy (
  name,
  enabled,
  event_type,
  severity,
  window_seconds,
  threshold,
  group_by,
  action_type,
  action_params_json,
  cooldown_seconds
) VALUES (
  'IMPERSONATION_ABUSE',
  true,
  'IMPERSONATION_STARTED',
  'HIGH',
  86400, -- 24 horas
  10, -- 10 impersonations/dia
  'ACTOR', -- Por SaaS user
  NULL, -- Sem ação automática (investigação manual)
  '{}',
  86400 -- 24 horas de cooldown
);

-- =============================================
-- POLÍTICA 6: AI_ABUSE
-- =============================================
-- Detecta uso excessivo de IA
-- Ação: Rate limit em requisições de IA

INSERT INTO public.logsafe_policy (
  name,
  enabled,
  event_type,
  severity,
  window_seconds,
  threshold,
  group_by,
  action_type,
  action_params_json,
  cooldown_seconds
) VALUES (
  'AI_ABUSE',
  true,
  'AI_REQUEST',
  'MEDIUM',
  3600, -- 1 hora
  100, -- 100 requisições
  'TENANT', -- Por tenant
  'RATE_LIMIT',
  '{
    "scope": "AI",
    "max_per_minute": 10,
    "duration_hours": 1
  }',
  1800 -- 30 minutos de cooldown
);

-- =============================================
-- VERIFICAÇÃO
-- =============================================

-- Deve retornar 6 políticas
SELECT COUNT(*) as total_policies FROM public.logsafe_policy;

-- Listar políticas criadas
SELECT 
  name,
  event_type,
  severity,
  threshold,
  window_seconds,
  action_type,
  enabled
FROM public.logsafe_policy
ORDER BY severity DESC, name;

-- =============================================
-- FIM DOS SEEDS
-- =============================================
