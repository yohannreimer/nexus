-- ================================================
-- NEXUS AI - Scheduled Reports Cron Job
-- ================================================
-- Configura o pg_cron para executar a Edge Function
-- de relatórios agendados a cada minuto
-- ================================================

-- NOTA: Este SQL deve ser executado no Supabase SQL Editor
-- O pg_cron já vem habilitado no Supabase

-- Habilitar extensão pg_cron (se não estiver habilitada)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Habilitar extensão pg_net para fazer requisições HTTP
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar função que chama a Edge Function
CREATE OR REPLACE FUNCTION call_scheduled_reports()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  service_role_key TEXT;
  supabase_url TEXT;
BEGIN
  -- Obter a URL do Supabase (configurada nas variáveis do projeto)
  supabase_url := 'https://izoezdtljhmnrmxpcttg.supabase.co';
  
  -- Nota: Em produção, use vault para armazenar a service_role_key
  -- Por segurança, a chamada será feita via pg_net
  
  -- Fazer requisição HTTP para a Edge Function
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/scheduled-reports',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  
  RAISE NOTICE 'Scheduled reports function called at %', NOW();
END;
$$;

-- Agendar para rodar a cada minuto
-- Formato cron: minuto hora dia mês dia_semana
SELECT cron.schedule(
  'send-scheduled-reports',  -- nome do job
  '* * * * *',               -- a cada minuto
  $$SELECT call_scheduled_reports()$$
);

-- Para verificar os jobs agendados:
-- SELECT * FROM cron.job;

-- Para ver o histórico de execuções:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;

-- Para remover o job (se necessário):
-- SELECT cron.unschedule('send-scheduled-reports');

-- ================================================
-- ALTERNATIVA: Usar Supabase Edge Function Cron
-- ================================================
-- Se o pg_cron não funcionar, você pode usar o 
-- Supabase Dashboard > Edge Functions > Schedules
-- para agendar a função scheduled-reports
-- ================================================
