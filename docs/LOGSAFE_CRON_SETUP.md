# LogSafe Guardian - Configuração de Jobs Cron

Este documento explica como configurar os jobs automáticos do LogSafe no Supabase.

## 📋 Jobs Disponíveis

### 1. Policy Runner
- **Função**: `logsafe-policy-runner`
- **Frequência**: A cada 60 segundos
- **O que faz**: Avalia todas as políticas ativas e cria incidentes quando thresholds são excedidos

### 2. Cleanup
- **Função**: `logsafe-cleanup`
- **Frequência**: A cada 5 minutos
- **O que faz**: Remove enforcements expirados

---

## 🚀 Configuração via Supabase CLI

### Passo 1: Deploy das Edge Functions

```bash
# Deploy policy runner
npx supabase functions deploy logsafe-policy-runner

# Deploy cleanup
npx supabase functions deploy logsafe-cleanup
```

### Passo 2: Configurar Cron Jobs

O Supabase suporta cron jobs via extensão `pg_cron`. Vamos configurar via SQL:

```sql
-- Habilitar extensão pg_cron (se ainda não estiver)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Agendar Policy Runner (a cada 60 segundos)
SELECT cron.schedule(
  'logsafe-policy-runner',
  '* * * * *', -- A cada minuto
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/logsafe-policy-runner',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Agendar Cleanup (a cada 5 minutos)
SELECT cron.schedule(
  'logsafe-cleanup',
  '*/5 * * * *', -- A cada 5 minutos
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/logsafe-cleanup',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
```

**⚠️ IMPORTANTE**: Substitua:
- `YOUR_PROJECT_REF` pelo ref do seu projeto Supabase
- `YOUR_ANON_KEY` pela sua anon key

---

## 🔧 Configuração via Supabase Dashboard

### Opção Alternativa: Usar Database Webhooks

1. Acesse o **Supabase Dashboard**
2. Vá em **Database** → **Extensions**
3. Habilite `pg_cron`
4. Vá em **SQL Editor**
5. Execute os comandos SQL acima

---

## ✅ Verificar Jobs Agendados

```sql
-- Listar todos os cron jobs
SELECT * FROM cron.job;

-- Ver histórico de execuções
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;

-- Desabilitar um job (se necessário)
SELECT cron.unschedule('logsafe-policy-runner');
SELECT cron.unschedule('logsafe-cleanup');
```

---

## 🧪 Testar Manualmente

Antes de configurar cron, teste as funções manualmente:

```bash
# Testar Policy Runner
curl -X POST 'http://localhost:54321/functions/v1/logsafe-policy-runner' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json'

# Testar Cleanup
curl -X POST 'http://localhost:54321/functions/v1/logsafe-cleanup' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json'
```

---

## 📊 Monitoramento

### Logs das Edge Functions

No Supabase Dashboard:
1. Vá em **Edge Functions**
2. Selecione a função
3. Veja **Logs** para ver execuções

### Métricas de Performance

Monitore:
- **Policy Runner**: Quantas políticas são triggered por execução
- **Cleanup**: Quantos enforcements são removidos
- **Tempo de execução**: Deve ser < 5s para ambos

---

## 🐛 Troubleshooting

### Job não está executando

```sql
-- Verificar se pg_cron está habilitado
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Verificar configuração do job
SELECT * FROM cron.job WHERE jobname LIKE 'logsafe%';
```

### Job falha na execução

1. Verifique logs no Dashboard
2. Teste manualmente via curl
3. Verifique permissões (service role key)

---

## 🔄 Atualizar Frequência

```sql
-- Alterar frequência do Policy Runner para 30 segundos
SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'logsafe-policy-runner'),
  schedule := '*/30 * * * * *' -- A cada 30 segundos
);
```

---

## 📝 Próximos Passos

Após configurar os jobs:
1. ✅ Monitorar logs por 24h
2. ✅ Ajustar thresholds das políticas conforme necessário
3. ✅ Calibrar frequência dos jobs (se necessário)
4. ✅ Implementar alertas para falhas de jobs
