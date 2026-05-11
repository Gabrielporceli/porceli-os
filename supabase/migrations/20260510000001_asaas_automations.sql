-- ─────────────────────────────────────────────────────────────────────────────
-- Automações Asaas: tabelas de suporte + cards no painel
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Adiciona colunas na tabela de automações (idempotente)
ALTER TABLE public.automations
  ADD COLUMN IF NOT EXISTS config JSONB,
  ADD COLUMN IF NOT EXISTS trigger_type TEXT DEFAULT 'cron';

-- 2. Tabela de log de notificações (deduplicação + auditoria)
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  asaas_customer_id   TEXT,
  client_name         TEXT,
  type                TEXT        NOT NULL,   -- due_today | due_soon_5d | due_soon_2d | overdue_mild | overdue_urgent | overdue_persistent | new_client | reconciliation
  channel             TEXT        NOT NULL,   -- whatsapp | group | email | system
  asaas_payment_id    TEXT,
  days_overdue        INTEGER,
  sent_at             TIMESTAMPTZ DEFAULT now(),
  status              TEXT        DEFAULT 'sent',  -- sent | failed
  error_message       TEXT,
  metadata            JSONB
);

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read notification_logs"
  ON public.notification_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role can insert notification_logs"
  ON public.notification_logs FOR INSERT TO service_role WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_notif_logs_payment_type_channel
  ON public.notification_logs (asaas_payment_id, type, channel, sent_at DESC)
  WHERE asaas_payment_id IS NOT NULL;

-- 3. Insere os 3 cards de automação Asaas no painel
INSERT INTO public.automations (jobname, display_name, description, icon, category, enabled, schedule, function_name, trigger_type) VALUES
  (
    'asaas-novo-cliente',
    'Cadastra Cliente & Gera Cobranças',
    'Ao cadastrar um cliente, verifica/cria no Asaas, calcula parcelas respeitando dias úteis e feriados nacionais, cria cobrança parcelada em boleto e notifica o grupo.',
    'DollarSign',
    'financeiro',
    true,
    'webhook',
    'asaas-new-client',
    'webhook'
  ),
  (
    'asaas-alertas-pagamento',
    'Lembrete Pagamento',
    'Envia lembretes em D-5, D-2 e D-0. Vencidos: escalada diária (1-10 dias) ou a cada 5 dias (11+ dias). Respeita dias úteis e evita envios duplicados.',
    'Bell',
    'financeiro',
    false,
    '0 11 * * *',
    'asaas-payment-alerts',
    'cron'
  ),
  (
    'asaas-reconciliacao',
    'Dá Baixa no Sistema',
    'Compara pagamentos recebidos no Asaas com entradas pendentes no sistema e atualiza os status automaticamente. Notifica a equipe com o resultado da rodada.',
    'DollarSign',
    'financeiro',
    false,
    '0 8 * * *',
    'asaas-payment-reconciliation',
    'cron'
  )
ON CONFLICT (jobname) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description  = EXCLUDED.description,
  trigger_type = EXCLUDED.trigger_type;
