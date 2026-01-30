-- =============================================
-- LOGSAFE GUARDIAN v0.1 - FUNDAÇÃO
-- Security Control Plane para Obra360
-- =============================================
-- 
-- ARQUITETURA:
-- - 5 novas tabelas isoladas (prefixo logsafe_)
-- - Zero conflito com tabelas ERP/CRM existentes
-- - RLS habilitado em todas as tabelas
-- - Índices otimizados para performance
-- - Auditoria completa
--

-- =============================================
-- TABELA 1: EVENTOS DE SEGURANÇA
-- =============================================

CREATE TABLE IF NOT EXISTS public.logsafe_event (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Tenant (null para eventos globais/sistema)
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Ator (quem gerou o evento)
  actor_type VARCHAR(20) NOT NULL CHECK (actor_type IN ('TENANT_USER', 'SAAS_USER', 'ANON', 'SYSTEM')),
  actor_id UUID, -- pode ser users.id ou saas_users.id
  
  -- Contexto da requisição
  ip_hash VARCHAR(64), -- SHA-256 do IP (sem PII)
  user_agent TEXT,
  route TEXT,
  method VARCHAR(10),
  status_code INTEGER,
  error_code VARCHAR(50), -- ErrorCode do sistema
  
  -- Tipo de evento
  event_type VARCHAR(50) NOT NULL,
  
  -- Rastreamento
  trace_id VARCHAR(100),
  
  -- Metadata adicional (sem PII)
  metadata_json JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance (queries de investigação e policy evaluation)
CREATE INDEX idx_logsafe_event_tenant_created ON public.logsafe_event(tenant_id, created_at DESC);
CREATE INDEX idx_logsafe_event_type_created ON public.logsafe_event(event_type, created_at DESC);
CREATE INDEX idx_logsafe_event_actor_created ON public.logsafe_event(actor_id, created_at DESC);
CREATE INDEX idx_logsafe_event_ip_created ON public.logsafe_event(ip_hash, created_at DESC);
CREATE INDEX idx_logsafe_event_trace ON public.logsafe_event(trace_id);

-- =============================================
-- TABELA 2: POLÍTICAS DE SEGURANÇA
-- =============================================

CREATE TABLE IF NOT EXISTS public.logsafe_policy (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Identificação
  name VARCHAR(100) NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT true,
  
  -- Tipo de evento que esta política monitora
  event_type VARCHAR(50) NOT NULL,
  
  -- Severidade do incidente gerado
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  
  -- Janela de tempo e threshold
  window_seconds INTEGER NOT NULL, -- ex: 300 (5 minutos)
  threshold INTEGER NOT NULL, -- ex: 10 (eventos)
  
  -- Como agrupar eventos (IP, ACTOR, TENANT, IP_OR_ACTOR)
  group_by VARCHAR(50) NOT NULL,
  
  -- Ação a aplicar (null = apenas incidente)
  action_type VARCHAR(50), -- LOCK_USER_TEMP, RATE_LIMIT, REQUIRE_REAUTH
  action_params_json JSONB DEFAULT '{}',
  
  -- Cooldown (evitar spam de incidentes)
  cooldown_seconds INTEGER DEFAULT 300, -- 5 minutos padrão
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_logsafe_policy_enabled ON public.logsafe_policy(enabled);

-- =============================================
-- TABELA 3: INCIDENTES DE SEGURANÇA
-- =============================================

CREATE TABLE IF NOT EXISTS public.logsafe_incident (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Tenant afetado (null para incidentes globais)
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Política que gerou o incidente
  policy_id UUID REFERENCES public.logsafe_policy(id) ON DELETE SET NULL,
  
  -- Tipo e severidade
  type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'ACK', 'RESOLVED')),
  
  -- Resumo e evidências
  summary TEXT NOT NULL,
  evidence_event_ids JSONB DEFAULT '[]', -- Array de UUIDs
  
  -- Timestamps
  first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES public.saas_users(id),
  resolution_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_logsafe_incident_tenant_status ON public.logsafe_incident(tenant_id, status);
CREATE INDEX idx_logsafe_incident_severity ON public.logsafe_incident(severity, created_at DESC);
CREATE INDEX idx_logsafe_incident_policy ON public.logsafe_incident(policy_id);

-- =============================================
-- TABELA 4: LOG DE AÇÕES APLICADAS
-- =============================================

CREATE TABLE IF NOT EXISTS public.logsafe_action_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Incidente que gerou a ação (null para ações manuais)
  incident_id UUID REFERENCES public.logsafe_incident(id) ON DELETE SET NULL,
  
  -- Tipo de ação
  action_type VARCHAR(50) NOT NULL, -- LOCK_USER_TEMP, RATE_LIMIT, REQUIRE_REAUTH
  
  -- Alvo da ação
  target_type VARCHAR(50) NOT NULL, -- TENANT_USER, TENANT, IP, ENDPOINT_GROUP
  target_id TEXT NOT NULL, -- UUID ou hash de IP
  
  -- Escopo (para RATE_LIMIT)
  scope VARCHAR(50), -- AUTH, AI, EXPORTS, GLOBAL
  
  -- Parâmetros da ação
  params_json JSONB DEFAULT '{}',
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'APPLIED' CHECK (status IN ('APPLIED', 'FAILED', 'EXPIRED', 'REVERTED')),
  
  -- Quem aplicou
  created_by UUID, -- saas_user.id
  created_by_type VARCHAR(20) NOT NULL CHECK (created_by_type IN ('SYSTEM', 'SAAS_USER')),
  
  -- Timestamps
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_logsafe_action_log_incident ON public.logsafe_action_log(incident_id);
CREATE INDEX idx_logsafe_action_log_target ON public.logsafe_action_log(target_type, target_id, status);
CREATE INDEX idx_logsafe_action_log_expires ON public.logsafe_action_log(expires_at) WHERE status = 'APPLIED';

-- =============================================
-- TABELA 5: ESTADO DE ENFORCEMENT ATIVO
-- =============================================

CREATE TABLE IF NOT EXISTS public.logsafe_enforcement_state (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Referência ao action_log
  action_log_id UUID REFERENCES public.logsafe_action_log(id) ON DELETE CASCADE NOT NULL,
  
  -- Alvo (duplicado para performance de lookup)
  target_type VARCHAR(50) NOT NULL,
  target_id TEXT NOT NULL,
  
  -- Tipo de ação e escopo
  action_type VARCHAR(50) NOT NULL,
  scope VARCHAR(50),
  
  -- Parâmetros (duplicado para performance)
  params_json JSONB DEFAULT '{}',
  
  -- Expiração
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice crítico para lookup rápido no enforcement middleware
CREATE INDEX idx_logsafe_enforcement_target_expires ON public.logsafe_enforcement_state(target_type, target_id, expires_at);
CREATE INDEX idx_logsafe_enforcement_action_log ON public.logsafe_enforcement_state(action_log_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Habilitar RLS em todas as tabelas LogSafe
ALTER TABLE public.logsafe_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logsafe_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logsafe_incident ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logsafe_action_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logsafe_enforcement_state ENABLE ROW LEVEL SECURITY;

-- Função helper: verificar se usuário é SaaS Admin
CREATE OR REPLACE FUNCTION is_saas_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
BEGIN
  user_email := auth.jwt() ->> 'email';
  IF user_email IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM public.saas_users 
    WHERE email = user_email AND active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- POLÍTICA: logsafe_event
-- Dev Admin vê todos, Tenant Admin vê apenas próprio tenant
CREATE POLICY "logsafe_event_saas_admin_all"
ON public.logsafe_event
FOR ALL
TO authenticated
USING (is_saas_admin());

CREATE POLICY "logsafe_event_tenant_admin_own"
ON public.logsafe_event
FOR SELECT
TO authenticated
USING (
  NOT is_saas_admin() 
  AND tenant_id = (
    SELECT tenant_id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1
  )
);

-- POLÍTICA: logsafe_policy
-- Apenas Dev Admin (leitura e escrita)
CREATE POLICY "logsafe_policy_saas_admin_all"
ON public.logsafe_policy
FOR ALL
TO authenticated
USING (is_saas_admin());

-- POLÍTICA: logsafe_incident
-- Dev Admin vê todos, Tenant Admin vê apenas próprio tenant
CREATE POLICY "logsafe_incident_saas_admin_all"
ON public.logsafe_incident
FOR ALL
TO authenticated
USING (is_saas_admin());

CREATE POLICY "logsafe_incident_tenant_admin_own"
ON public.logsafe_incident
FOR SELECT
TO authenticated
USING (
  NOT is_saas_admin()
  AND tenant_id = (
    SELECT tenant_id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1
  )
);

-- POLÍTICA: logsafe_action_log
-- Apenas Dev Admin
CREATE POLICY "logsafe_action_log_saas_admin_all"
ON public.logsafe_action_log
FOR ALL
TO authenticated
USING (is_saas_admin());

-- POLÍTICA: logsafe_enforcement_state
-- Apenas Dev Admin (usuários não veem enforcement ativo)
CREATE POLICY "logsafe_enforcement_saas_admin_all"
ON public.logsafe_enforcement_state
FOR ALL
TO authenticated
USING (is_saas_admin());

-- Service role bypassa RLS (usado pelos jobs)
-- Nenhuma policy adicional necessária

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger para atualizar updated_at
CREATE TRIGGER update_logsafe_policy_updated_at 
BEFORE UPDATE ON public.logsafe_policy
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_logsafe_incident_updated_at 
BEFORE UPDATE ON public.logsafe_incident
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- COMENTÁRIOS (Documentação)
-- =============================================

COMMENT ON TABLE public.logsafe_event IS 'Eventos de segurança coletados em runtime (auth, guards, impersonation)';
COMMENT ON TABLE public.logsafe_policy IS 'Políticas de detecção configuráveis (thresholds, ações)';
COMMENT ON TABLE public.logsafe_incident IS 'Incidentes de segurança criados por políticas';
COMMENT ON TABLE public.logsafe_action_log IS 'Log de todas as ações aplicadas (locks, rate limits)';
COMMENT ON TABLE public.logsafe_enforcement_state IS 'Estado ativo de enforcement (lookup rápido)';

COMMENT ON COLUMN public.logsafe_event.ip_hash IS 'SHA-256 do endereço IP (sem PII)';
COMMENT ON COLUMN public.logsafe_event.metadata_json IS 'Metadata adicional sanitizado (sem senhas, tokens, emails)';
COMMENT ON COLUMN public.logsafe_policy.group_by IS 'Como agrupar eventos: IP, ACTOR, TENANT, IP_OR_ACTOR';
COMMENT ON COLUMN public.logsafe_policy.cooldown_seconds IS 'Previne spam de incidentes para mesma política';

-- =============================================
-- FIM DA MIGRAÇÃO LOGSAFE FOUNDATION
-- =============================================
