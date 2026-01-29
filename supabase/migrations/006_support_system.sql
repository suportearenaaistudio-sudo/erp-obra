-- =============================================
-- MIGRATION 006: Sistema de Suporte Integrado
-- =============================================
-- Cria tabelas para tickets de suporte e mensagens
-- Usuários podem criar tickets e receber respostas dos Dev Admins
-- =============================================

-- 1. Tabela de tickets de suporte
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('question', 'bug', 'feature_request', 'urgent')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_user', 'resolved', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.saas_users(id)
);

-- 2. Tabela de mensagens do ticket (thread de conversa)
CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'dev_admin')),
  sender_id UUID NOT NULL, -- user_id ou saas_user_id dependendo do sender_type
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  
  -- Metadata adicional
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant ON public.support_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON public.support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON public.support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created ON public.support_messages(created_at DESC);

-- 4. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_support_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_support_ticket_timestamp ON public.support_tickets;
CREATE TRIGGER trigger_update_support_ticket_timestamp
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_support_ticket_timestamp();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- TICKETS: Users podem ver apenas tickets do seu tenant
DROP POLICY IF EXISTS "Users see own tenant tickets" ON public.support_tickets;
CREATE POLICY "Users see own tenant tickets" ON public.support_tickets
  FOR SELECT 
  USING (tenant_id = get_user_tenant_id());

-- TICKETS: Users podem criar tickets
DROP POLICY IF EXISTS "Users can create tickets" ON public.support_tickets;
CREATE POLICY "Users can create tickets" ON public.support_tickets
  FOR INSERT 
  WITH CHECK (
    tenant_id = get_user_tenant_id() AND
    user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  );

-- TICKETS: Users podem atualizar seus próprios tickets (fechar, alterar prioridade)
DROP POLICY IF EXISTS "Users can update own tickets" ON public.support_tickets;
CREATE POLICY "Users can update own tickets" ON public.support_tickets
  FOR UPDATE 
  USING (
    tenant_id = get_user_tenant_id() AND
    user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  );

-- MESSAGES: Users podem ver mensagens dos tickets do seu tenant
DROP POLICY IF EXISTS "Users see messages of own tickets" ON public.support_messages;
CREATE POLICY "Users see messages of own tickets" ON public.support_messages
  FOR SELECT 
  USING (
    ticket_id IN (
      SELECT id FROM public.support_tickets 
      WHERE tenant_id = get_user_tenant_id()
    )
  );

-- MESSAGES: Users podem criar mensagens em seus tickets
DROP POLICY IF EXISTS "Users can create messages" ON public.support_messages;
CREATE POLICY "Users can create messages" ON public.support_messages
  FOR INSERT 
  WITH CHECK (
    sender_type = 'user' AND
    ticket_id IN (
      SELECT id FROM public.support_tickets 
      WHERE tenant_id = get_user_tenant_id()
    )
  );

-- =============================================
-- FUNÇÕES AUXILIARES
-- =============================================

-- Função para obter contagem de tickets não lidos por usuário
CREATE OR REPLACE FUNCTION public.get_unread_ticket_count(p_user_id UUID)
RETURNS INT AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.support_tickets t
  WHERE t.user_id = p_user_id
    AND t.status IN ('open', 'in_progress', 'waiting_user')
    AND EXISTS (
      SELECT 1 FROM public.support_messages m
      WHERE m.ticket_id = t.id
        AND m.sender_type = 'dev_admin'
        AND m.read_at IS NULL
    );
  
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para marcar mensagens como lidas
CREATE OR REPLACE FUNCTION public.mark_ticket_messages_as_read(p_ticket_id UUID, p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.support_messages
  SET read_at = NOW()
  WHERE ticket_id = p_ticket_id
    AND sender_type = 'dev_admin'
    AND read_at IS NULL
    AND ticket_id IN (
      SELECT id FROM public.support_tickets WHERE user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- DADOS INICIAIS (OPCIONAL)
-- =============================================

-- Comentado para não criar dados de exemplo
-- Descomente para testar localmente

/*
-- Criar ticket de exemplo (se houver users)
DO $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_ticket_id UUID;
BEGIN
  -- Pegar primeiro user ativo
  SELECT id, tenant_id INTO v_user_id, v_tenant_id
  FROM public.users
  WHERE status = 'active'
  LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    -- Criar ticket de exemplo
    INSERT INTO public.support_tickets (tenant_id, user_id, subject, category, priority)
    VALUES (v_tenant_id, v_user_id, 'Ticket de exemplo', 'question', 'normal')
    RETURNING id INTO v_ticket_id;
    
    -- Criar mensagem inicial
    INSERT INTO public.support_messages (ticket_id, sender_type, sender_id, message)
    VALUES (v_ticket_id, 'user', v_user_id, 'Esta é uma mensagem de exemplo para testar o sistema de suporte.');
  END IF;
END $$;
*/

-- =============================================
-- PRONTO!
-- =============================================
-- Tabelas: support_tickets, support_messages
-- RLS: Isolamento por tenant
-- Funções: get_unread_ticket_count, mark_ticket_messages_as_read
-- =============================================
