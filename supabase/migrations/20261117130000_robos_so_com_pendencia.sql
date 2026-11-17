-- ─────────────────────────────────────────────────────────────────────────
-- Robôs de minuto em minuto só chamam a função quando há algo a fazer.
--
-- send-scheduled-messages e whatsapp-outbox rodavam 1.440 vezes por dia mesmo
-- com a fila vazia, e cada rodada gerava ~4 linhas de log (17/11/2026: o
-- Supabase marcou 2,18 GB de 1 GB de logs). Agora o próprio pg_cron confere a
-- fila antes de chamar a função: sem pendência, nada sai do banco.
--
-- O aviso "fila do WhatsApp parada" (system_health → worker_ultima_execucao)
-- passa a valer só com mensagem esperando: fila vazia não precisa de worker.
-- ─────────────────────────────────────────────────────────────────────────
select cron.alter_job(
  (select jobid from cron.job where jobname = 'send-scheduled-messages'),
  command := $c$SELECT public.cron_call('send-scheduled-messages', 'send-scheduled-messages', '{}'::jsonb, 0)
    WHERE EXISTS (SELECT 1 FROM public.scheduled_messages WHERE status = 'pending' AND scheduled_at <= now());$c$
);

select cron.alter_job(
  (select jobid from cron.job where jobname = 'whatsapp-outbox'),
  command := $c$SELECT public.cron_call('whatsapp-outbox', 'whatsapp-outbox', '{}'::jsonb, 0)
    WHERE EXISTS (SELECT 1 FROM public.whatsapp_outbox
                  WHERE (status = 'pending' AND next_attempt_at <= now())
                     OR (status = 'sending' AND locked_at < now() - interval '10 minutes')
                     OR (status IN ('pending', 'sending') AND expires_at IS NOT NULL AND expires_at < now()));$c$
);

CREATE OR REPLACE FUNCTION public.system_health()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    -- última execução real falhou nas últimas 26h — e o job continua ATIVO
    -- (job pausado de propósito não é falha)
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
    -- só cobra o worker se ele estiver ligado E houver mensagem esperando há mais de 5 min (o cron só o chama
    -- com pendência; mensagem que acabou de entrar sai no minuto seguinte)
    'worker_ultima_execucao', CASE WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'whatsapp-outbox' AND active)
                                    AND EXISTS (SELECT 1 FROM whatsapp_outbox WHERE status IN ('pending','sending')
                                                AND created_at < now() - interval '5 minutes')
      THEN (SELECT max(started_at) FROM cron_runs WHERE job = 'whatsapp-outbox' AND status <> 'skipped') END
  );
$function$;
