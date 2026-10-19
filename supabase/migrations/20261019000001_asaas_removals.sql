-- Registro de toda cobrança removida no Asaas pelo sistema (renegociação).
-- A remoção no Asaas é reversível (POST /payments/{id}/restore); aqui fica o
-- que foi removido, por quem e por quê, para poder conferir e restaurar.
CREATE TABLE IF NOT EXISTS public.asaas_removals (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id         uuid,
  client_id        uuid,
  asaas_payment_id text NOT NULL,
  value            numeric,
  due_date         date,
  description      text,
  motivo           text,
  removed_by       uuid,
  removed_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS asaas_removals_client_idx ON public.asaas_removals (client_id, removed_at DESC);
ALTER TABLE public.asaas_removals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS asaas_removals_select ON public.asaas_removals;
CREATE POLICY asaas_removals_select ON public.asaas_removals FOR SELECT TO authenticated USING (true);
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.asaas_removals FROM anon, authenticated;
REVOKE ALL ON public.asaas_removals FROM anon;
