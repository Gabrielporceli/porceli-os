-- Agendamento do ALERTA FINANCEIRO DIÁRIO (08:00 BRT = 11:00 UTC)
SELECT cron.unschedule('alerta-financeiro-diario') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'alerta-financeiro-diario');

SELECT cron.schedule(
  'alerta-financeiro-diario',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url:='https://yopedcaueobmilnrcyfe.supabase.co/functions/v1/financial-alert',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvcGVkY2F1ZW9ibWlsbnJjeWZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTQxMjMwMSwiZXhwIjoyMDY2OTg4MzAxfQ.0I-sz_ZUGjNzixd4gRtj6JV5x3mi3VO2RVyoZ-Im4B0"}'::jsonb
  ) as request_id;
  $$
);
