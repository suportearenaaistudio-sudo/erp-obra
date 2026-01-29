-- =============================================
-- MIGRATION 008: Usage Tracking
-- =============================================
-- Adiciona campos de tracking de uso em subscriptions
-- Permite monitorar limites e alertar usuários
-- =============================================

-- 1. Adicionar campos de usage tracking em subscriptions
ALTER TABLE public.subscriptions 
  ADD COLUMN IF NOT EXISTS current_users INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_projects INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_storage_mb INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_usage_check TIMESTAMPTZ;

-- 2. Criar índice para queries de limites
CREATE INDEX IF NOT EXISTS idx_subscriptions_usage ON public.subscriptions(tenant_id, current_users, current_projects);

-- 3. Função para atualizar uso de um tenant
CREATE OR REPLACE FUNCTION public.update_tenant_usage(p_tenant_id UUID)
RETURNS VOID AS $$
DECLARE
  v_user_count INT;
  v_project_count INT;
  v_storage_mb INT;
BEGIN
  -- Contar users ativos (tenta usar status ou active, se existir)
  BEGIN
    SELECT COUNT(*) INTO v_user_count
    FROM public.users
    WHERE tenant_id = p_tenant_id;
  EXCEPTION WHEN undefined_column THEN
    -- Se não tem coluna de status, conta todos
    SELECT COUNT(*) INTO v_user_count
    FROM public.users
    WHERE tenant_id = p_tenant_id;
  END;
  
  -- Contar projetos (se a tabela existir)
  BEGIN
    SELECT COUNT(*) INTO v_project_count
    FROM public.projects
    WHERE tenant_id = p_tenant_id;
  EXCEPTION WHEN undefined_table THEN
    v_project_count := 0;
  END;
  
  -- Calcular storage (placeholder - implementar quando tiver uploads)
  v_storage_mb := 0;
  
  -- Atualizar subscription
  UPDATE public.subscriptions
  SET 
    current_users = v_user_count,
    current_projects = v_project_count,
    current_storage_mb = v_storage_mb,
    last_usage_check = NOW()
  WHERE tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Função para verificar se tenant está próximo dos limites
CREATE OR REPLACE FUNCTION public.check_tenant_limits(p_tenant_id UUID)
RETURNS TABLE (
  limit_type TEXT,
  current_value INT,
  max_value INT,
  percentage INT,
  exceeded BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM (
    SELECT
      'users' AS limit_type,
      s.current_users AS current_value,
      (s.limits_snapshot->>'max_users')::INT AS max_value,
      CASE 
        WHEN (s.limits_snapshot->>'max_users')::INT > 0 
        THEN ROUND((s.current_users::NUMERIC / (s.limits_snapshot->>'max_users')::NUMERIC) * 100)::INT
        ELSE 0
      END AS percentage,
      s.current_users >= (s.limits_snapshot->>'max_users')::INT AS exceeded
    FROM public.subscriptions s
    WHERE s.tenant_id = p_tenant_id
    
    UNION ALL
    
    SELECT
      'projects' AS limit_type,
      s.current_projects AS current_value,
      (s.limits_snapshot->>'max_projects')::INT AS max_value,
      CASE 
        WHEN (s.limits_snapshot->>'max_projects')::INT > 0 
        THEN ROUND((s.current_projects::NUMERIC / (s.limits_snapshot->>'max_projects')::NUMERIC) * 100)::INT
        ELSE 0
      END AS percentage,
      s.current_projects >= (s.limits_snapshot->>'max_projects')::INT AS exceeded
    FROM public.subscriptions s
    WHERE s.tenant_id = p_tenant_id
    
    UNION ALL
    
    SELECT
      'storage' AS limit_type,
      s.current_storage_mb AS current_value,
      ((s.limits_snapshot->>'max_storage_gb')::INT * 1024) AS max_value,
      CASE 
        WHEN (s.limits_snapshot->>'max_storage_gb')::INT > 0 
        THEN ROUND((s.current_storage_mb::NUMERIC / ((s.limits_snapshot->>'max_storage_gb')::NUMERIC * 1024)) * 100)::INT
        ELSE 0
      END AS percentage,
      s.current_storage_mb >= ((s.limits_snapshot->>'max_storage_gb')::INT * 1024) AS exceeded
    FROM public.subscriptions s
    WHERE s.tenant_id = p_tenant_id
  ) sub
  WHERE max_value IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger para atualizar usage automaticamente quando user é criado/deletado
CREATE OR REPLACE FUNCTION public.auto_update_usage_on_user_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar usage do tenant afetado
  IF TG_OP = 'DELETE' THEN
    PERFORM public.update_tenant_usage(OLD.tenant_id);
    RETURN OLD;
  ELSE
    PERFORM public.update_tenant_usage(NEW.tenant_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_update_usage_on_user ON public.users;
CREATE TRIGGER trigger_auto_update_usage_on_user
  AFTER INSERT OR UPDATE OR DELETE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_update_usage_on_user_change();

-- 6. Função para obter tenants com limites próximos
CREATE OR REPLACE FUNCTION public.get_tenants_near_limits(p_threshold_pct INT DEFAULT 80)
RETURNS TABLE (
  tenant_id UUID,
  tenant_name TEXT,
  limit_type TEXT,
  usage_pct INT,
  current_value INT,
  max_value INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id AS tenant_id,
    t.name AS tenant_name,
    limits.limit_type,
    limits.percentage AS usage_pct,
    limits.current_value,
    limits.max_value
  FROM public.tenants t
  JOIN LATERAL public.check_tenant_limits(t.id) limits ON true
  WHERE limits.percentage >= p_threshold_pct
    AND NOT limits.exceeded
  ORDER BY limits.percentage DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Atualizar usage de todos os tenants existentes (executar uma vez)
DO $$
DECLARE
  tenant_record RECORD;
BEGIN
  FOR tenant_record IN SELECT id FROM public.tenants
  LOOP
    PERFORM public.update_tenant_usage(tenant_record.id);
  END LOOP;
END $$;

-- 8. Permissões
GRANT EXECUTE ON FUNCTION public.update_tenant_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_tenant_limits(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenants_near_limits(INT) TO authenticated;

-- =============================================
-- PRONTO!
-- =============================================
-- Campos: current_users, current_projects, current_storage_mb
-- Funções: 
--   - update_tenant_usage (atualizar contadores)
--   - check_tenant_limits (verificar limites)
--   - get_tenants_near_limits (alertas)
-- Triggers: Auto-update ao criar/deletar users
-- =============================================
