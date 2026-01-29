-- ==========================================
-- MIGRATION 011: AI Foundation (Simplified)
-- ==========================================
-- Cria infraestrutura básica para IA: conversas, mensagens, audit

-- ==========================================
-- 1. TABELAS DE IA
-- ==========================================

-- Conversas de IA (System Assistant ou Support Bot)
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assistant_type VARCHAR(50) NOT NULL CHECK (assistant_type IN ('system', 'support')),
  title VARCHAR(255),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_conversations_tenant ON public.ai_conversations(tenant_id);
CREATE INDEX idx_ai_conversations_user ON public.ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_type ON public.ai_conversations(assistant_type);

-- Mensagens de IA
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tool_calls JSONB, -- Array de {name, arguments, result}
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_messages_conversation ON public.ai_messages(conversation_id);
CREATE INDEX idx_ai_messages_created ON public.ai_messages(created_at DESC);

-- Audit Logs de IA (para Dev Admins monitorarem uso)
CREATE TABLE IF NOT EXISTS public.ai_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE SET NULL,
  prompt_tokens INT DEFAULT 0,
  completion_tokens INT DEFAULT 0,
  total_tokens INT DEFAULT 0,
  latency_ms INT DEFAULT 0,
  safety_blocked BOOLEAN DEFAULT FALSE,
  safety_reasons JSONB,
  tool_calls_count INT DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_audit_tenant ON public.ai_audit_logs(tenant_id);
CREATE INDEX idx_ai_audit_user ON public.ai_audit_logs(user_id);
CREATE INDEX idx_ai_audit_created ON public.ai_audit_logs(created_at DESC);

-- Knowledge Base Chunks (para RAG)
CREATE TABLE IF NOT EXISTS public.ai_knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE, -- NULL = knowledge global
  doc_type VARCHAR(50) NOT NULL CHECK (doc_type IN ('faq', 'tutorial', 'policy', 'changelog', 'custom')),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_knowledge_type ON public.ai_knowledge_chunks(doc_type);
CREATE INDEX idx_ai_knowledge_tenant ON public.ai_knowledge_chunks(tenant_id);

-- Embeddings (para RAG)
CREATE TABLE IF NOT EXISTS public.ai_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id UUID NOT NULL REFERENCES public.ai_knowledge_chunks(id) ON DELETE CASCADE,
  embedding TEXT NOT NULL, -- JSON array: [0.123, 0.456, ...]
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_embeddings_chunk ON public.ai_embeddings(chunk_id);

-- ==========================================
-- 2. RLS POLICIES
-- ==========================================

-- Ativar RLS
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_embeddings ENABLE ROW LEVEL SECURITY;

-- ai_conversations: Users veem apenas suas conversas
DROP POLICY IF EXISTS "Users view own conversations" ON public.ai_conversations;
CREATE POLICY "Users view own conversations" ON public.ai_conversations
  FOR SELECT
  USING (
    user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  );

-- Dev Admins veem todas conversas (usando saas_users)
DROP POLICY IF EXISTS "Dev admins view all conversations" ON public.ai_conversations;
CREATE POLICY "Dev admins view all conversations" ON public.ai_conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.saas_users su
      WHERE su.email IN (SELECT email FROM public.users WHERE auth_user_id = auth.uid())
        AND su.role = 'dev_admin'
    )
  );

-- Users podem criar conversas
DROP POLICY IF EXISTS "Users create own conversations" ON public.ai_conversations;
CREATE POLICY "Users create own conversations" ON public.ai_conversations
  FOR INSERT
  WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  );

-- ai_messages: Users veem mensagens de suas conversas
DROP POLICY IF EXISTS "Users view own messages" ON public.ai_messages;
CREATE POLICY "Users view own messages" ON public.ai_messages
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM public.ai_conversations 
      WHERE user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    )
  );

-- Users podem criar mensagens em suas conversas
DROP POLICY IF EXISTS "Users create own messages" ON public.ai_messages;
CREATE POLICY "Users create own messages" ON public.ai_messages
  FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM public.ai_conversations 
      WHERE user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    )
  );

-- ai_audit_logs: Apenas Dev Admins
DROP POLICY IF EXISTS "Only dev admins view audit" ON public.ai_audit_logs;
CREATE POLICY "Only dev admins view audit" ON public.ai_audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.saas_users su
      WHERE su.email IN (SELECT email FROM public.users WHERE auth_user_id = auth.uid())
        AND su.role = 'dev_admin'
    )
  );

-- ai_knowledge_chunks: Todos podem ler
DROP POLICY IF EXISTS "Everyone reads knowledge" ON public.ai_knowledge_chunks;
CREATE POLICY "Everyone reads knowledge" ON public.ai_knowledge_chunks
  FOR SELECT
  USING (true);

-- Apenas Dev Admins podem criar/editar
DROP POLICY IF EXISTS "Only dev admins modify knowledge" ON public.ai_knowledge_chunks;
CREATE POLICY "Only dev admins modify knowledge" ON public.ai_knowledge_chunks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.saas_users su
      WHERE su.email IN (SELECT email FROM public.users WHERE auth_user_id = auth.uid())
        AND su.role = 'dev_admin'
    )
  );

-- ai_embeddings: Todos podem ler
DROP POLICY IF EXISTS "Everyone reads embeddings" ON public.ai_embeddings;
CREATE POLICY "Everyone reads embeddings" ON public.ai_embeddings
  FOR SELECT
  USING (true);

-- ==========================================
-- 3. TRIGGERS
-- ==========================================

-- Atualizar updated_at em conversas quando nova mensagem
CREATE OR REPLACE FUNCTION public.update_ai_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.ai_conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON public.ai_messages;
CREATE TRIGGER trigger_update_conversation_on_message
  AFTER INSERT ON public.ai_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ai_conversation_timestamp();

-- ==========================================
-- 4. VERIFICAÇÃO
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 011 executed successfully!';
  RAISE NOTICE 'Tables created: ai_conversations, ai_messages, ai_audit_logs, ai_knowledge_chunks, ai_embeddings';
  RAISE NOTICE 'RLS policies configured';
  RAISE NOTICE 'Triggers configured';
END $$;
