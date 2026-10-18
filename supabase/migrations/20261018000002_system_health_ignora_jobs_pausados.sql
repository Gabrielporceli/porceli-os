-- Job pausado de propósito (cron.job.active = false) não é falha: não aparece
-- no aviso "Falha nas automações", nem cobra o worker da fila se ele estiver
-- desligado.
CREATE OR REPLACE FUNCTION public.system_health()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'jobs_com_falha', coalesce((
      SELECT jsonb_agg(jsonb_build_object('job', u.job, 'detail', u.detail, 'quando', u.finished_at, 'http', u.http_status) ORDER BY u.finished_at DESC)
      FROM (
        SELECT DISTINCT ON (job) job, status, detail, finished_at, http_status, started_at
        FROM cron_runs WHERE status IN ('ok','failed','retried') AND started_at > now() - interval '26 hours'
        ORDER BY job, started_at DESC
      ) u
      WHERE u.status = 'failed'
        AND EXISTS (SELECT 1 FROM cron.job j WHERE j.jobname = u.job AND j.active)
    ), '[]'::jsonb),
    'mensagens_com_falha', (SELECT count(*) FROM whatsapp_outbox WHERE status = 'failed'),
    'mensagens_na_fila',   (SELECT count(*) FROM whatsapp_outbox WHERE status IN ('pending','sending')),
    'fila_parada_desde',   (SELECT min(created_at) FROM whatsapp_outbox
                            WHERE status = 'pending' AND created_at < now() - interval '30 minutes'),
    'worker_ultima_execucao', CASE WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'whatsapp-outbox' AND active)
      THEN (SELECT max(started_at) FROM cron_runs WHERE job = 'whatsapp-outbox' AND status <> 'skipped') END
  );
$$;
REVOKE ALL ON FUNCTION public.system_health() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.system_health() TO authenticated;
