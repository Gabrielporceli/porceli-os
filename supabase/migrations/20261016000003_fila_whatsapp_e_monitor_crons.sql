-- ════════════════════════════════════════════════════════════════════════════
-- Fila única de WhatsApp + registro/trava/retentativa dos crons
--
-- Antes: cada função mandava WhatsApp direto pra Evolution (sem intervalo, sem
-- retentativa, "sucesso" mesmo com a instância caída) e o pg_cron só registrava
-- que DISPAROU o net.http_post — uma função respondendo 401/500 por horas
-- aparecia como "succeeded" (aconteceu com o whatsapp-health em 16/10/2026).
--
-- Agora:
--   • whatsapp_outbox  — toda mensagem automática entra aqui; o worker
--                        (função whatsapp-outbox) envia em ritmo controlado,
--                        tenta de novo com espera crescente, segura enquanto o
--                        WhatsApp está desconectado e nunca duplica (dedupe_key).
--   • cron_runs        — cada execução de cron com o resultado HTTP real.
--   • cron_call()      — dispara a função registrando a execução, com trava
--                        (não começa se a anterior ainda está rodando).
--   • cron_collect()   — a cada minuto lê as respostas do pg_net, marca ok/falha
--                        e refaz jobs diários que falharam.
--   • system_health()  — o que o CRM mostra no aviso de falhas.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Segredo usado pelos crons para chamar as funções ────────────────────────
-- Copia a chave que já estava nos comandos dos crons para o Vault (nunca mais
-- fica em texto no cron.job).
DO $$
DECLARE k text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'cron_function_key') THEN
    SELECT (regexp_match(command, 'Bearer ([A-Za-z0-9._-]+)'))[1] INTO k
    FROM cron.job WHERE command ~ 'Bearer ' LIMIT 1;
    IF k IS NULL THEN RAISE EXCEPTION 'chave dos crons não encontrada'; END IF;
    PERFORM vault.create_secret(k, 'cron_function_key', 'Chave usada pelo pg_cron para chamar as Edge Functions');
  END IF;
END $$;

-- ── Fila de WhatsApp ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.whatsapp_outbox (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number          text NOT NULL,
  text            text NOT NULL,
  source          text NOT NULL,                 -- função que enfileirou
  dedupe_key      text UNIQUE,                   -- mesma chave = mesma mensagem (não duplica)
  ref_table       text,                          -- ex.: scheduled_messages (status espelhado)
  ref_id          uuid,
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','sending','sent','failed','cancelled')),
  attempts        int  NOT NULL DEFAULT 0,
  max_attempts    int  NOT NULL DEFAULT 5,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz,                   -- passou disso sem enviar = não serve mais (ex.: lembrete)
  locked_at       timestamptz,
  last_error      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  sent_at         timestamptz
);
CREATE INDEX IF NOT EXISTS whatsapp_outbox_fila_idx ON public.whatsapp_outbox (status, next_attempt_at);
ALTER TABLE public.whatsapp_outbox ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS whatsapp_outbox_select ON public.whatsapp_outbox;
CREATE POLICY whatsapp_outbox_select ON public.whatsapp_outbox FOR SELECT TO authenticated USING (true);

-- Reserva um lote para envio. FOR UPDATE SKIP LOCKED: duas execuções nunca
-- pegam a mesma mensagem. Mensagem presa em 'sending' há 10+ min (worker
-- morreu no meio) volta para a fila.
CREATE OR REPLACE FUNCTION public.outbox_claim(p_limit int)
RETURNS SETOF public.whatsapp_outbox
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- vencidas: não servem mais (lembrete de reunião que já começou etc.)
  UPDATE whatsapp_outbox SET status = 'cancelled', last_error = 'expirou antes do envio'
  WHERE status IN ('pending','sending') AND expires_at IS NOT NULL AND expires_at < now();

  RETURN QUERY
  UPDATE whatsapp_outbox o
  SET status = 'sending', locked_at = now(), attempts = o.attempts + 1
  WHERE o.id IN (
    SELECT id FROM whatsapp_outbox
    WHERE (status = 'pending' AND next_attempt_at <= now())
       OR (status = 'sending' AND locked_at < now() - interval '10 minutes')
    ORDER BY created_at
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  )
  RETURNING o.*;
END $$;

-- Resultado de um envio: espelha nas tabelas de origem.
CREATE OR REPLACE FUNCTION public.outbox_finish(p_id uuid, p_ok boolean, p_error text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o whatsapp_outbox;
BEGIN
  SELECT * INTO o FROM whatsapp_outbox WHERE id = p_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF p_ok THEN
    UPDATE whatsapp_outbox SET status = 'sent', sent_at = now(), locked_at = NULL, last_error = NULL WHERE id = p_id;
  ELSIF o.attempts >= o.max_attempts THEN
    UPDATE whatsapp_outbox SET status = 'failed', locked_at = NULL, last_error = p_error WHERE id = p_id;
  ELSE
    -- espera crescente: 1, 2, 4, 8… min (máx. 1h)
    UPDATE whatsapp_outbox
    SET status = 'pending', locked_at = NULL, last_error = p_error,
        next_attempt_at = now() + least(power(2, o.attempts - 1), 60) * interval '1 minute'
    WHERE id = p_id;
  END IF;

  -- espelhos
  IF o.ref_table = 'scheduled_messages' AND o.ref_id IS NOT NULL THEN
    IF p_ok THEN
      UPDATE scheduled_messages SET status = 'sent', sent_at = now(), error_message = NULL, updated_at = now() WHERE id = o.ref_id;
    ELSIF o.attempts >= o.max_attempts THEN
      UPDATE scheduled_messages SET status = 'failed', error_message = p_error, updated_at = now() WHERE id = o.ref_id;
    END IF;
  END IF;
  IF NOT p_ok AND o.attempts >= o.max_attempts THEN
    UPDATE notification_logs SET status = 'failed', error_message = p_error
    WHERE metadata->>'outbox_id' = p_id::text;
  END IF;
END $$;

-- Mensagem agendada cancelada na tela depois de entrar na fila: não envia.
CREATE OR REPLACE FUNCTION public.outbox_cancel_ref(p_table text, p_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE whatsapp_outbox SET status = 'cancelled', last_error = 'cancelada na origem'
  WHERE ref_table = p_table AND ref_id = p_id AND status = 'pending';
$$;

CREATE OR REPLACE FUNCTION public.tg_scheduled_messages_cancel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    PERFORM outbox_cancel_ref('scheduled_messages', NEW.id);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS scheduled_messages_cancel_outbox ON public.scheduled_messages;
CREATE TRIGGER scheduled_messages_cancel_outbox AFTER UPDATE OF status ON public.scheduled_messages
FOR EACH ROW EXECUTE FUNCTION public.tg_scheduled_messages_cancel();
-- apagar a mensagem agendada também tira da fila
CREATE OR REPLACE FUNCTION public.tg_scheduled_messages_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM outbox_cancel_ref('scheduled_messages', OLD.id);
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS scheduled_messages_delete_outbox ON public.scheduled_messages;
CREATE TRIGGER scheduled_messages_delete_outbox AFTER DELETE ON public.scheduled_messages
FOR EACH ROW EXECUTE FUNCTION public.tg_scheduled_messages_delete();

-- ── Execuções dos crons ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cron_runs (
  id          bigserial PRIMARY KEY,
  job         text NOT NULL,
  fn          text,                    -- Edge Function chamada (NULL = SQL)
  body        jsonb,
  attempt     int  NOT NULL DEFAULT 1,
  max_retries int  NOT NULL DEFAULT 0,
  request_id  bigint,
  status      text NOT NULL DEFAULT 'running'
              CHECK (status IN ('running','ok','failed','skipped','retried')),
  http_status int,
  detail      text,
  started_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE INDEX IF NOT EXISTS cron_runs_job_idx ON public.cron_runs (job, started_at DESC);
CREATE INDEX IF NOT EXISTS cron_runs_running_idx ON public.cron_runs (status) WHERE status = 'running';
ALTER TABLE public.cron_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cron_runs_select ON public.cron_runs;
CREATE POLICY cron_runs_select ON public.cron_runs FOR SELECT TO authenticated USING (true);

-- Dispara uma Edge Function a partir do cron, registrando e travando.
CREATE OR REPLACE FUNCTION public.cron_call(
  p_job text, p_fn text, p_body jsonb DEFAULT '{}'::jsonb,
  p_max_retries int DEFAULT 0, p_attempt int DEFAULT 1
) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  rid bigint;
  run_id bigint;
  k text;
BEGIN
  -- trava: a execução anterior ainda não respondeu
  IF EXISTS (SELECT 1 FROM cron_runs WHERE job = p_job AND status = 'running'
             AND started_at > now() - interval '10 minutes') THEN
    -- registra no máximo um "pulou" por job a cada 10 min (não lota a tabela)
    IF NOT EXISTS (SELECT 1 FROM cron_runs WHERE job = p_job AND status = 'skipped'
                   AND started_at > now() - interval '10 minutes') THEN
      INSERT INTO cron_runs (job, fn, status, detail, finished_at)
      VALUES (p_job, p_fn, 'skipped', 'execução anterior ainda rodando', now());
    END IF;
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO k FROM vault.decrypted_secrets WHERE name = 'cron_function_key';

  SELECT net.http_post(
    url := 'https://dygadnfeoiimmbeqbsvt.supabase.co/functions/v1/' || p_fn,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || k),
    body := coalesce(p_body, '{}'::jsonb),
    timeout_milliseconds := 150000
  ) INTO rid;

  INSERT INTO cron_runs (job, fn, body, attempt, max_retries, request_id)
  VALUES (p_job, p_fn, p_body, p_attempt, p_max_retries, rid)
  RETURNING id INTO run_id;
  RETURN run_id;
END $$;

-- Cron que é só SQL (ex.: status dos contratos): roda e registra.
CREATE OR REPLACE FUNCTION public.cron_run_sql(p_job text, p_sql text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE run_id bigint;
BEGIN
  INSERT INTO cron_runs (job, status) VALUES (p_job, 'running') RETURNING id INTO run_id;
  BEGIN
    EXECUTE p_sql;
    UPDATE cron_runs SET status = 'ok', finished_at = now() WHERE id = run_id;
  EXCEPTION WHEN OTHERS THEN
    UPDATE cron_runs SET status = 'failed', detail = left(SQLERRM, 500), finished_at = now() WHERE id = run_id;
  END;
END $$;

-- Lê as respostas do pg_net e fecha as execuções; refaz diários que falharam.
CREATE OR REPLACE FUNCTION public.cron_collect()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.id, c.started_at, h.status_code, h.content, h.error_msg, h.timed_out,
           (h.id IS NOT NULL) AS respondeu
    FROM cron_runs c
    LEFT JOIN net._http_response h ON h.id = c.request_id
    WHERE c.status = 'running' AND c.request_id IS NOT NULL
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

  -- Retentativa: job que falhou e ainda tem tentativas, depois de 10 min,
  -- desde que não tenha rodado de novo depois.
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

  -- faxina
  DELETE FROM cron_runs WHERE started_at < now() - interval '30 days';
  DELETE FROM whatsapp_outbox WHERE status IN ('sent','cancelled') AND created_at < now() - interval '60 days';
END $$;

-- ── O que o CRM mostra ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.system_health()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    -- jobs cuja ÚLTIMA execução (de verdade, ignorando "pulou") falhou nas últimas 26h
    'jobs_com_falha', coalesce((
      SELECT jsonb_agg(jsonb_build_object('job', u.job, 'detail', u.detail, 'quando', u.finished_at, 'http', u.http_status) ORDER BY u.finished_at DESC)
      FROM (
        SELECT DISTINCT ON (job) job, status, detail, finished_at, http_status, started_at
        FROM cron_runs WHERE status IN ('ok','failed','retried') AND started_at > now() - interval '26 hours'
        ORDER BY job, started_at DESC
      ) u WHERE u.status = 'failed'
    ), '[]'::jsonb),
    'mensagens_com_falha', (SELECT count(*) FROM whatsapp_outbox WHERE status = 'failed'),
    'mensagens_na_fila',   (SELECT count(*) FROM whatsapp_outbox WHERE status IN ('pending','sending')),
    'fila_parada_desde',   (SELECT min(created_at) FROM whatsapp_outbox
                            WHERE status = 'pending' AND created_at < now() - interval '30 minutes'),
    'worker_ultima_execucao', (SELECT max(started_at) FROM cron_runs WHERE job = 'whatsapp-outbox' AND status <> 'skipped')
  );
$$;

-- Botões do aviso
CREATE OR REPLACE FUNCTION public.outbox_retry_failed()
RETURNS int LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH u AS (
    UPDATE whatsapp_outbox SET status = 'pending', attempts = 0, next_attempt_at = now(), last_error = NULL
    WHERE status = 'failed' RETURNING 1
  ) SELECT count(*)::int FROM u;
$$;
CREATE OR REPLACE FUNCTION public.outbox_discard_failed()
RETURNS int LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH u AS (
    UPDATE whatsapp_outbox SET status = 'cancelled', last_error = coalesce(last_error, '') || ' (descartada)'
    WHERE status = 'failed' RETURNING 1
  ) SELECT count(*)::int FROM u;
$$;
CREATE OR REPLACE FUNCTION public.cron_retry(p_job text)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r cron_runs;
BEGIN
  SELECT * INTO r FROM cron_runs WHERE job = p_job AND fn IS NOT NULL ORDER BY started_at DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'job % sem execução registrada', p_job; END IF;
  RETURN cron_call(r.job, r.fn, r.body, 0, 1);
END $$;

-- ── Permissões: SECURITY DEFINER é executável por todos por padrão ──────────
REVOKE ALL ON FUNCTION public.outbox_claim(int)                FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.outbox_finish(uuid, boolean, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.outbox_cancel_ref(text, uuid)    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cron_call(text, text, jsonb, int, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cron_run_sql(text, text)         FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cron_collect()                   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.system_health()                  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.outbox_retry_failed()            FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.outbox_discard_failed()          FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cron_retry(text)                 FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.system_health(), public.outbox_retry_failed(),
  public.outbox_discard_failed(), public.cron_retry(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.outbox_claim(int), public.outbox_finish(uuid, boolean, text)
  TO service_role;

-- ── Ajuste (mesmo dia): fechar a execução anterior ANTES de checar a trava ──
-- O cron-collect roda no mesmo segundo que os outros crons; sem isto a rodada
-- do minuto anterior ainda constava "running" e a atual era pulada à toa (os
-- jobs de 1 min rodavam a cada 2).
CREATE OR REPLACE FUNCTION public.cron_close(p_job text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.id, c.started_at, h.status_code, h.content, h.error_msg, h.timed_out,
           (h.id IS NOT NULL) AS respondeu
    FROM cron_runs c
    LEFT JOIN net._http_response h ON h.id = c.request_id
    WHERE c.status = 'running' AND c.request_id IS NOT NULL
      AND (p_job IS NULL OR c.job = p_job)
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

  DELETE FROM cron_runs WHERE started_at < now() - interval '30 days';
  DELETE FROM whatsapp_outbox WHERE status IN ('sent','cancelled') AND created_at < now() - interval '60 days';
END $$;

CREATE OR REPLACE FUNCTION public.cron_call(
  p_job text, p_fn text, p_body jsonb DEFAULT '{}'::jsonb,
  p_max_retries int DEFAULT 0, p_attempt int DEFAULT 1
) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  rid bigint;
  run_id bigint;
  k text;
BEGIN
  PERFORM cron_close(p_job);  -- fecha a anterior se a resposta já chegou

  IF EXISTS (SELECT 1 FROM cron_runs WHERE job = p_job AND status = 'running'
             AND started_at > now() - interval '10 minutes') THEN
    IF NOT EXISTS (SELECT 1 FROM cron_runs WHERE job = p_job AND status = 'skipped'
                   AND started_at > now() - interval '10 minutes') THEN
      INSERT INTO cron_runs (job, fn, status, detail, finished_at)
      VALUES (p_job, p_fn, 'skipped', 'execução anterior ainda rodando', now());
    END IF;
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO k FROM vault.decrypted_secrets WHERE name = 'cron_function_key';

  SELECT net.http_post(
    url := 'https://dygadnfeoiimmbeqbsvt.supabase.co/functions/v1/' || p_fn,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || k),
    body := coalesce(p_body, '{}'::jsonb),
    timeout_milliseconds := 150000
  ) INTO rid;

  INSERT INTO cron_runs (job, fn, body, attempt, max_retries, request_id)
  VALUES (p_job, p_fn, p_body, p_attempt, p_max_retries, rid)
  RETURNING id INTO run_id;
  RETURN run_id;
END $$;
REVOKE ALL ON FUNCTION public.cron_call(text, text, jsonb, int, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cron_collect() FROM PUBLIC, anon, authenticated;

-- Escrita só pelas funções (service_role / SECURITY DEFINER).
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.whatsapp_outbox, public.cron_runs FROM anon, authenticated;
REVOKE ALL ON public.whatsapp_outbox, public.cron_runs FROM anon;
