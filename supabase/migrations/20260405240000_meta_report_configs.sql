-- Tabela de configurações de relatórios Meta Ads por cliente
CREATE TABLE IF NOT EXISTS public.meta_report_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  meta_account_id TEXT NOT NULL,          -- ex: act_1704344637001272
  meta_pixel_id TEXT,                     -- ex: 3651876941777866
  meta_access_token TEXT NOT NULL,        -- token de acesso da Meta API
  whatsapp_recipient TEXT NOT NULL,       -- número ou JID do grupo
  timezone_offset INTEGER DEFAULT -3,    -- -3 (BRT) ou -4 (AMT/Cuiabá)
  enabled BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.meta_report_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage meta_report_configs"
  ON public.meta_report_configs FOR ALL TO authenticated USING (true)
  WITH CHECK (true);
