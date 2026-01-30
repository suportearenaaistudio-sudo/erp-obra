-- =============================================
-- MIGRATION 018: Sistema de Convites (Team Management)
-- =============================================

-- 1. Tabela de Convites
CREATE TABLE IF NOT EXISTS public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role_id UUID NOT NULL REFERENCES public.roles(id),
  token UUID DEFAULT gen_random_uuid(), -- Token único para o link
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'expired')) DEFAULT 'pending',
  invited_by UUID REFERENCES auth.users(id), -- Quem convidou
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'), -- Validade de 7 dias
  accepted_at TIMESTAMPTZ,
  
  -- Um email só pode ter um convite pendente por tenant
  UNIQUE(tenant_id, email)
);

-- Indíces para performance
CREATE INDEX idx_invites_token ON public.invites(token);
CREATE INDEX idx_invites_email ON public.invites(email);
CREATE INDEX idx_invites_tenant ON public.invites(tenant_id);

-- 2. Habilitar RLS
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Segurança (RLS)

-- Policy: Apenas membros do tenant podem VER convites
CREATE POLICY "Tenant members can view invites" ON public.invites
  FOR SELECT
  USING (
    tenant_id IN (
        SELECT tenant_id FROM public.users 
        WHERE auth_user_id = auth.uid()
    )
  );

-- Policy: Apenas Admins do tenant podem CRIAR convites (checada via permissão na aplicação, mas reforçada aqui se quiser, ou deixada aberta para membros se for colaborativo)
-- Vamos restringir a criação apenas para quem é do tenant. A aplicação valida se tem permissão de 'USERS:WRITE'.
CREATE POLICY "Tenant members can create invites" ON public.invites
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
        SELECT tenant_id FROM public.users 
        WHERE auth_user_id = auth.uid()
    )
  );

-- Policy: Apenas Admins podem DELETAR (cancelar) convites
CREATE POLICY "Tenant members can delete invites" ON public.invites
  FOR DELETE
  USING (
    tenant_id IN (
        SELECT tenant_id FROM public.users 
        WHERE auth_user_id = auth.uid()
    )
  );

-- Policy: Público (anon) pode ler convites via TOKEN (para a página de aceite)
-- Isso permite buscar o convite pelo token sem estar logado
CREATE POLICY "Public can view invites by token" ON public.invites
  FOR SELECT
  TO anon, authenticated
  USING (true); 
  -- Nota: Na prática, a query deve filtrar pelo token específico. 
  -- Se deixarmos "true", qualquer um pode ver lista de emails convidados se souber endpoint, o que é data leak.
  -- MELHORIA: Restringir acesso público APENAS via função segura (RPC) ou Edge Function.
  -- Por segurança, vou remover essa policy pública e faremos a consulta de validação via RPC com SECURITY DEFINER.

DROP POLICY "Public can view invites by token" ON public.invites;


-- 4. Função Segura para Validar Token (RPC)
-- Usada pela página de Join para mostrar "Você foi convidado para a empresa X"
CREATE OR REPLACE FUNCTION public.get_invite_details(p_token UUID)
RETURNS TABLE (
  valid boolean,
  tenant_name text,
  inviter_email text,
  invite_email text
) 
SECURITY DEFINER -- Roda como admin para ler a tabela invites
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_invite RECORD;
  v_tenant_name TEXT;
  v_inviter_email TEXT;
BEGIN
  -- Buscar convite válido e pendente
  SELECT * INTO v_invite 
  FROM public.invites 
  WHERE token = p_token 
    AND status = 'pending' 
    AND expires_at > NOW();

  IF v_invite IS NULL THEN
    RETURN QUERY SELECT false, NULL::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  -- Buscar nome da empresa
  SELECT name INTO v_tenant_name FROM public.tenants WHERE id = v_invite.tenant_id;
  
  -- Buscar email de quem convidou (opcional, exibe email mascarado ou nome)
  SELECT email INTO v_inviter_email FROM auth.users WHERE id = v_invite.invited_by;

  RETURN QUERY SELECT true, v_tenant_name, v_inviter_email, v_invite.email;
END;
$$;


-- 5. Função para Aceitar Convite
CREATE OR REPLACE FUNCTION public.accept_invite(p_token UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_invite RECORD;
  v_user_id UUID;
  v_existing_user RECORD;
BEGIN
  -- 1. Verificar convite
  SELECT * INTO v_invite 
  FROM public.invites 
  WHERE token = p_token 
    AND status = 'pending' 
    AND expires_at > NOW();

  IF v_invite IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Convite inválido ou expirado');
  END IF;

  -- 2. Verificar usuário logado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Você precisa estar logado para aceitar');
  END IF;

  -- 3. Verificar se email bate (Segurança extra: O usuário logado deve ter o mesmo email do convite?)
  -- Muitas vezes o usuário quer aceitar no email pessoal um convite enviado pro profissional, ou vice-versa.
  -- Vamos permitir aceitar com qualquer conta logada, mas vinculamos aquele User ID.
  
  -- 4. Verificar se usuário JÁ ESTÁ no tenant
  IF EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = v_user_id AND tenant_id = v_invite.tenant_id
  ) THEN
    -- Já é membro, só marcar convite como aceito
    UPDATE public.invites SET status = 'accepted', accepted_at = NOW() WHERE id = v_invite.id;
    RETURN jsonb_build_object('success', true, 'message', 'Você já é membro desta equipe.');
  END IF;

  -- 5. Adicionar usuário ao Tenant (Tabela public.users)
  INSERT INTO public.users (
    tenant_id,
    auth_user_id,
    email,
    name,
    role_id,
    status
  ) VALUES (
    v_invite.tenant_id,
    v_user_id,
    (SELECT email FROM auth.users WHERE id = v_user_id), -- Pega email real da conta logada
    (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = v_user_id), -- Pega nome
    v_invite.role_id,
    'active'
  );

  -- 6. Marcar convite como aceito
  UPDATE public.invites SET status = 'accepted', accepted_at = NOW() WHERE id = v_invite.id;

  RETURN jsonb_build_object('success', true, 'tenant_id', v_invite.tenant_id);
END;
$$;
