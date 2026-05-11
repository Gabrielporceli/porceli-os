-- ─────────────────────────────────────────────────────────────────────────────
-- Agendamento de Mensagens WhatsApp
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.scheduled_messages (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id      UUID        REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name    TEXT,
  recipient_type TEXT        NOT NULL CHECK (recipient_type IN ('responsible', 'group', 'custom')),
  phone          TEXT        NOT NULL,
  message        TEXT        NOT NULL,
  scheduled_at   TIMESTAMPTZ NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  sent_at        TIMESTAMPTZ,
  error_message  TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own scheduled_messages"
  ON public.scheduled_messages FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_scheduled_messages_pending
  ON public.scheduled_messages (scheduled_at)
  WHERE status = 'pending';

-- Card no painel de automações
INSERT INTO public.automations (jobname, display_name, description, icon, category, enabled, schedule, function_name, trigger_type)
VALUES (
  'send-scheduled-messages',
  'Disparo de Mensagens Agendadas',
  'Verifica a cada minuto se há mensagens agendadas para enviar e as dispara via WhatsApp.',
  'Clock',
  'atividades',
  true,
  '* * * * *',
  'send-scheduled-messages',
  'cron'
)
ON CONFLICT (jobname) DO NOTHING;
