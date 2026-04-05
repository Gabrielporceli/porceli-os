-- ATIVAÇÃO DAS AUTOMAÇÕES DE WHATSAPP (Via Migração)
-- 1. Garante extensões
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Limpa agendamentos antigos para evitar duplicidade
SELECT cron.unschedule('resumo-diario-whatsapp');
SELECT cron.unschedule('vigilante-tarefas-10min');

-- 3. Agendamento do RESUMO DIÁRIO (06:00 BRT = 09:00 UTC)
SELECT cron.schedule(
  'resumo-diario-whatsapp',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url:='https://yopedcaueobmilnrcyfe.supabase.co/functions/v1/daily-summary',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvcGVkY2F1ZW9ibWlsbnJjeWZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTQxMjMwMSwiZXhwIjoyMDY2OTg4MzAxfQ.0I-sz_ZUGjNzixd4gRtj6JV5x3mi3VO2RVyoZ-Im4B0"}'::jsonb
  ) as request_id;
  $$
);

-- 4. Agendamento do LEMBRETE 10 MIN (Vigilante)
SELECT cron.schedule(
  'vigilante-tarefas-10min',
  '* * * * *',
  $$
  SELECT net.http_post(
    url:='https://yopedcaueobmilnrcyfe.supabase.co/functions/v1/task-reminder',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvcGVkY2F1ZW9ibWlsbnJjeWZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTQxMjMwMSwiZXhwIjoyMDY2OTg4MzAxfQ.0I-sz_ZUGjNzixd4gRtj6JV5x3mi3VO2RVyoZ-Im4B0"}'::jsonb
  ) as request_id;
  $$
);
