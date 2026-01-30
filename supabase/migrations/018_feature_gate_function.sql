-- =============================================
-- MIGRATION 018: Feature Guard Function
-- =============================================
-- Função para verificar se um tenant tem uma feature ativa
-- Usada por RLS policies e outros procedures
-- =============================================

CREATE OR REPLACE FUNCTION public.tenant_has_feature(p_tenant_id UUID, p_feature_key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_plan_features TEXT[];
    v_override_enabled BOOLEAN;
    v_override_expires TIMESTAMPTZ;
BEGIN
    -- 1. Verificar Override (tem precedência)
    SELECT enabled, expires_at
    INTO v_override_enabled, v_override_expires
    FROM public.tenant_feature_overrides
    WHERE tenant_id = p_tenant_id AND feature_key = p_feature_key;

    -- Se existe override...
    IF v_override_enabled IS NOT NULL THEN
        -- Se não expirou (ou não tem data), retorna o valor do override
        IF v_override_expires IS NULL OR v_override_expires > NOW() THEN
            RETURN v_override_enabled;
        END IF;
    END IF;

    -- 2. Verificar Plano
    SELECT p.included_features
    INTO v_plan_features
    FROM public.subscriptions s
    JOIN public.plans p ON s.plan_id = p.id
    WHERE s.tenant_id = p_tenant_id
    LIMIT 1;

    -- Se não achou plano, false
    IF v_plan_features IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Verifica se a feature está no array
    RETURN p_feature_key = ANY(v_plan_features);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permissões
GRANT EXECUTE ON FUNCTION public.tenant_has_feature(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_has_feature(UUID, TEXT) TO service_role;
