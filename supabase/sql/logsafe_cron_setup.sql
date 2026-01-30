-- =============================================
-- LOGSAFE CRON JOBS - Configuração Automática
-- =============================================
-- 
-- Este script configura os cron jobs do LogSafe
-- Executar via SQL Editor no Supabase Dashboard
--

-- Habilitar extensão pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =============================================
-- JOB 1: Policy Runner (a cada 60 segundos)
-- =============================================

SELECT cron.schedule(
  'logsafe-policy-runner',
  '* * * * *', -- A cada minuto
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/logsafe-policy-runner',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- =============================================
-- JOB 2: Cleanup (a cada 5 minutos)
-- =============================================

SELECT cron.schedule(
  'logsafe-cleanup',
  '*/5 * * * *', -- A cada 5 minutos
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/logsafe-cleanup',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- =============================================
-- VERIFICAÇÃO
-- =============================================

-- Listar jobs criados
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  nodename
FROM cron.job
WHERE jobname LIKE 'logsafe%'
ORDER BY jobname;

-- Ver últimas execuções
SELECT 
  jr.jobid,
  j.jobname,
  jr.start_time,
  jr.end_time,
  jr.status,
  jr.return_message
FROM cron.job_run_details jr
JOIN cron.job j ON j.jobid = jr.jobid
WHERE j.jobname LIKE 'logsafe%'
ORDER BY jr.start_time DESC
LIMIT 10;

-- =============================================
-- COMANDOS ÚTEIS (Comentados)
-- =============================================

-- Desabilitar jobs
-- SELECT cron.unschedule('logsafe-policy-runner');
-- SELECT cron.unschedule('logsafe-cleanup');

-- Alterar frequência do Policy Runner para 30 segundos
-- SELECT cron.alter_job(
--   job_id := (SELECT jobid FROM cron.job WHERE jobname = 'logsafe-policy-runner'),
--   schedule := '*/30 * * * * *'
-- );

-- Pausar job
-- UPDATE cron.job SET active = false WHERE jobname = 'logsafe-policy-runner';

-- Reativar job
-- UPDATE cron.job SET active = true WHERE jobname = 'logsafe-policy-runner';
