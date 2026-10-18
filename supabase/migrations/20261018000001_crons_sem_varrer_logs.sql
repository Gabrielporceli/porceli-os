-- Correção de 18/10/2026: o sistema travou na tela de carregamento.
--
-- Causa: cron_close() procurava a resposta de cada execução em
-- net._http_response pelo id — mas essa tabela do pg_net só tem índice em
-- "created" e guarda respostas grandes (179 MB com ~700 linhas, por causa do
-- sync-whatsapp). Cada cron_call (6 por minuto) fazia varredura completa;
-- as chamadas passaram a levar 25s+, se acumularam e esgotaram o banco.
--
-- Agora: só olha respostas dos últimos 15 min (range no índice created) —
-- 30 ms em vez de 25 s. E a faxina das tabelas de log (cron.job_run_details,
-- 206 MB, também sem índice de data) saiu do cron_collect de 1 em 1 minuto e
-- foi para um job diário de madrugada.

CREATE OR REPLACE FUNCTION public.cron_close(p_job text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE r record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron_runs WHERE status = 'running' AND (p_job IS NULL OR job = p_job)) THEN
    RETURN;
  END IF;

  FOR r IN
    WITH abertos AS (
      SELECT id, request_id, started_at FROM cron_runs
      WHERE status = 'running' AND request_id IS NOT NULL AND (p_job IS NULL OR job = p_job)
    ), resp AS (
      SELECT h.id, h.status_code, left(h.content, 600) AS content, h.error_msg, h.timed_out
      FROM net._http_response h
      WHERE h.created > now() - interval '15 minutes'
        AND h.id IN (SELECT request_id FROM abertos)
    )
    SELECT a.id, a.started_at, x.status_code, x.content, x.error_msg, x.timed_out, (x.id IS NOT NULL) AS respondeu
    FROM abertos a LEFT JOIN resp x ON x.id = a.request_id
  LOOP
    IF r.respondeu AND (r.status_code IS NOT NULL OR r.error_msg IS NOT NULL OR r.timed_out) THEN
      IF r.status_code BETWEEN 200 AND 299
         AND coalesce(r.content, '') !~ '"success"\s*:\s*false' THEN
        UPDATE cron_runs SET status = 'ok', http_status = r.status_code,
          detail = left(r.content, 300), finished_at = now() WHERE id = r.id;
      ELSE
        UPDATE cron_runs SET status = 'failed', http_status = r.status_code,
          detail = left(coalesce(r.error_msg, r.content, 'sem resposta'), 500), finished_at = now()
        WHERE id = r.id;
      END IF;
    ELSIF r.started_at < now() - interval '10 minutes' THEN
      UPDATE cron_runs SET status = 'failed', detail = 'a função não respondeu em 10 minutos',
        finished_at = now() WHERE id = r.id;
    END IF;
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.cron_close(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.cron_collect()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE r record;
BEGIN
  PERFORM cron_close(NULL);

  FOR r IN
    SELECT c.* FROM cron_runs c
    WHERE c.status = 'failed' AND c.fn IS NOT NULL AND c.attempt <= c.max_retries
      AND c.finished_at < now() - interval '10 minutes'
      AND c.started_at > now() - interval '6 hours'
      AND NOT EXISTS (SELECT 1 FROM cron_runs n WHERE n.job = c.job AND n.started_at > c.started_at
                      AND n.status <> 'skipped')
  LOOP
    UPDATE cron_runs SET status = 'retried' WHERE id = r.id;
    PERFORM cron_call(r.job, r.fn, r.body, r.max_retries, r.attempt + 1);
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.cron_collect() FROM PUBLIC, anon, authenticated;

-- Faxina 1x por dia (04:00 BRT).
CREATE OR REPLACE FUNCTION public.cron_faxina()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  DELETE FROM cron_runs WHERE started_at < now() - interval '30 days';
  DELETE FROM whatsapp_outbox WHERE status IN ('sent','cancelled') AND created_at < now() - interval '60 days';
  DELETE FROM cron.job_run_details WHERE end_time < now() - interval '7 days';
END $$;
REVOKE ALL ON FUNCTION public.cron_faxina() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('faxina-logs', '0 7 * * *',
  $$SELECT public.cron_run_sql('faxina-logs', 'SELECT public.cron_faxina()');$$);
