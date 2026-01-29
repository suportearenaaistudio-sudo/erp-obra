-- =============================================
-- MIGRATION 007: Analytics & Statistics Views
-- =============================================
-- Cria views e funções para estatísticas do SaaS
-- Dev Admins podem ver MRR, growth, churn, etc
-- =============================================

-- 1. View de estatísticas de assinaturas (snapshot atual)
CREATE OR REPLACE VIEW public.subscription_stats AS
SELECT
  COUNT(*) AS total_subscriptions,
  COUNT(*) FILTER (WHERE status = 'active') AS active_count,
  COUNT(*) FILTER (WHERE status = 'trial') AS trial_count,
  COUNT(*) FILTER (WHERE status = 'past_due') AS past_due_count,
  COUNT(*) FILTER (WHERE status = 'canceled') AS canceled_count,
  COUNT(*) FILTER (WHERE status = 'suspended') AS suspended_count,
  
  -- MRR (Monthly Recurring Revenue)
  COALESCE(SUM(
    CASE 
      WHEN status IN ('active', 'past_due') AND plan_id IS NOT NULL
      THEN (SELECT price_monthly FROM public.plans WHERE id = subscriptions.plan_id)
      ELSE 0
    END
  ), 0) AS mrr,
  
  -- Trial metrics
  AVG(
    CASE
      WHEN trial_start IS NOT NULL AND trial_end IS NOT NULL
      THEN EXTRACT(DAY FROM (trial_end::timestamp - trial_start::timestamp))
      ELSE NULL
    END
  ) AS avg_trial_days,
  
  -- Trials expiring soon (próximos 7 dias)
  COUNT(*) FILTER (
    WHERE status = 'trial' 
    AND trial_end IS NOT NULL 
    AND trial_end BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
  ) AS trials_expiring_soon,
  
  -- Conversion rate (trials que viraram active)
  ROUND(
    (COUNT(*) FILTER (WHERE status = 'active' AND trial_end < current_period_start)::NUMERIC / 
    NULLIF(COUNT(*) FILTER (WHERE trial_start IS NOT NULL)::NUMERIC, 0)) * 100,
    2
  ) AS trial_conversion_rate_pct

FROM public.subscriptions;

-- 2. Função para obter crescimento mensal (últimos 6 meses)
CREATE OR REPLACE FUNCTION public.get_monthly_growth()
RETURNS TABLE (
  month DATE,
  new_tenants INT,
  new_subscriptions INT,
  mrr_change NUMERIC,
  active_subscriptions INT
) AS $$
BEGIN
  RETURN QUERY
  WITH monthly_data AS (
    SELECT
      DATE_TRUNC('month', t.created_at)::DATE AS month,
      COUNT(DISTINCT t.id) AS new_tenants,
      COUNT(DISTINCT s.id) AS new_subs,
      COALESCE(SUM(
        CASE 
          WHEN s.status = 'active' 
          THEN (SELECT price_monthly FROM public.plans WHERE id = s.plan_id)
          ELSE 0
        END
      ), 0) AS monthly_mrr
    FROM public.tenants t
    LEFT JOIN public.subscriptions s ON s.tenant_id = t.id
    WHERE t.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '6 months')
    GROUP BY DATE_TRUNC('month', t.created_at)
  )
  SELECT
    md.month,
    md.new_tenants::INT,
    md.new_subs::INT,
    md.monthly_mrr - COALESCE(LAG(md.monthly_mrr) OVER (ORDER BY md.month), 0) AS mrr_change,
    (
      SELECT COUNT(*) FROM public.subscriptions 
      WHERE status = 'active' 
      AND created_at <= md.month + INTERVAL '1 month'
    )::INT AS active_subscriptions
  FROM monthly_data md
  ORDER BY md.month DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Função para obter top tenants por revenue
CREATE OR REPLACE FUNCTION public.get_top_tenants_by_revenue(p_limit INT DEFAULT 10)
RETURNS TABLE (
  tenant_id UUID,
  tenant_name TEXT,
  plan_name TEXT,
  monthly_revenue NUMERIC,
  status TEXT,
  current_users INT,
  current_projects INT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id AS tenant_id,
    t.name AS tenant_name,
    p.name AS plan_name,
    p.price_monthly AS monthly_revenue,
    s.status,
    COALESCE(s.current_users, 0) AS current_users,
    COALESCE(s.current_projects, 0) AS current_projects,
    t.created_at
  FROM public.tenants t
  JOIN public.subscriptions s ON s.tenant_id = t.id
  LEFT JOIN public.plans p ON p.id = s.plan_id
  WHERE s.status IN ('active', 'past_due')
  ORDER BY p.price_monthly DESC NULLS LAST
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. View de distribuição por plano
CREATE OR REPLACE VIEW public.plan_distribution AS
SELECT
  p.name AS plan_name,
  p.price_monthly,
  COUNT(s.id) AS subscription_count,
  COUNT(s.id) FILTER (WHERE s.status = 'active') AS active_count,
  COUNT(s.id) FILTER (WHERE s.status = 'trial') AS trial_count,
  ROUND(
    (COUNT(s.id)::NUMERIC / NULLIF((SELECT COUNT(*) FROM public.subscriptions)::NUMERIC, 0)) * 100,
    2
  ) AS percentage
FROM public.plans p
LEFT JOIN public.subscriptions s ON s.plan_id = p.id
GROUP BY p.id, p.name, p.price_monthly
ORDER BY p.price_monthly DESC;

-- 5. Função para obter estatísticas de suporte
CREATE OR REPLACE FUNCTION public.get_support_stats()
RETURNS TABLE (
  total_tickets INT,
  open_tickets INT,
  in_progress_tickets INT,
  resolved_tickets INT,
  avg_resolution_time_hours NUMERIC,
  tickets_today INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INT AS total_tickets,
    COUNT(*) FILTER (WHERE status = 'open')::INT AS open_tickets,
    COUNT(*) FILTER (WHERE status = 'in_progress')::INT AS in_progress_tickets,
    COUNT(*) FILTER (WHERE status = 'resolved')::INT AS resolved_tickets,
    ROUND(
      AVG(
        CASE 
          WHEN resolved_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600
          ELSE NULL
        END
      ),
      2
    ) AS avg_resolution_time_hours,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::INT AS tickets_today
  FROM public.support_tickets;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Permissões para Dev Admins acessarem as views/funções
-- (Executar via service_role ou criar policy específica)

GRANT SELECT ON public.subscription_stats TO authenticated;
GRANT SELECT ON public.plan_distribution TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_growth() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_tenants_by_revenue(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_support_stats() TO authenticated;

-- =============================================
-- PRONTO!
-- =============================================
-- Views: subscription_stats, plan_distribution
-- Funções: get_monthly_growth, get_top_tenants_by_revenue, get_support_stats
-- =============================================
