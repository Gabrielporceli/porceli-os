-- ============================================================
-- PORCELI OS — Schema limpo para novo projeto Supabase
-- Projeto: dygadnfeoiimmbeqbsvt
-- Gerado em: 2026-05-03
--
-- Como usar:
--   1. Abra o SQL Editor do novo projeto Supabase
--   2. Cole e execute este arquivo inteiro
--   3. Atualize src/integrations/supabase/client.ts com a nova URL e chave
--   4. Rode: npx supabase gen types typescript --project-id dygadnfeoiimmbeqbsvt > src/integrations/supabase/types.ts
-- ============================================================

-- ============================================================
-- LIMPEZA COMPLETA (seguro para re-execução)
-- ============================================================

-- Cron jobs
SELECT cron.unschedule('verificar-contratos-diario') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'verificar-contratos-diario');

-- Trigger de novo usuário
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Tabelas (CASCADE resolve FKs automaticamente)
DROP TABLE IF EXISTS public.notion_tasks          CASCADE;
DROP TABLE IF EXISTS public.notion_config         CASCADE;
DROP TABLE IF EXISTS public.google_calendar_events CASCADE;
DROP TABLE IF EXISTS public.google_calendar_tokens CASCADE;
DROP TABLE IF EXISTS public.automations           CASCADE;
DROP TABLE IF EXISTS public.lead_events           CASCADE;
DROP TABLE IF EXISTS public.leads                 CASCADE;
DROP TABLE IF EXISTS public.tags                  CASCADE;
DROP TABLE IF EXISTS public.plans                 CASCADE;
DROP TABLE IF EXISTS public.stages                CASCADE;
DROP TABLE IF EXISTS public.financial_entries     CASCADE;
DROP TABLE IF EXISTS public.finances              CASCADE;
DROP TABLE IF EXISTS public.contracts             CASCADE;
DROP TABLE IF EXISTS public.clients               CASCADE;

-- Funções
DROP FUNCTION IF EXISTS public.update_client_tags_from_contracts()       CASCADE;
DROP FUNCTION IF EXISTS public.create_contract_for_client()              CASCADE;
DROP FUNCTION IF EXISTS public.sync_client_contract_status()             CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user()                         CASCADE;
DROP FUNCTION IF EXISTS public.create_default_stages_for_user(UUID)      CASCADE;
DROP FUNCTION IF EXISTS public.create_default_plans_for_user(UUID)       CASCADE;
DROP FUNCTION IF EXISTS public.manage_automation_cron(TEXT,TEXT,TEXT,TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column()                CASCADE;

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";        -- automações agendadas
CREATE EXTENSION IF NOT EXISTS "pg_net";          -- http calls nas edge functions

-- ============================================================
-- FUNÇÃO UTILITÁRIA: auto-atualiza updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABELAS PRINCIPAIS
-- (ordem respeitando foreign keys)
-- ============================================================

-- clients
CREATE TABLE public.clients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company       TEXT NOT NULL,
  cnpj          TEXT NOT NULL DEFAULT '',
  responsible   TEXT NOT NULL,
  phone         TEXT NOT NULL DEFAULT '',
  email         TEXT NOT NULL DEFAULT '',
  address       TEXT,
  plan          TEXT,
  group_id      TEXT,
  tags          TEXT[] DEFAULT ARRAY['Ativo'],
  monthly_value DECIMAL(10,2) DEFAULT 0,
  payment_day   INTEGER DEFAULT 1,
  start_date    DATE,
  contract_end  DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- contracts
CREATE TABLE public.contracts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id     UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,
  monthly_value DECIMAL(10,2) NOT NULL,
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  status        TEXT DEFAULT 'active'
                  CHECK (status IN ('active', 'inactive', 'expiring', 'expired', 'cancelled')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- financial_entries (cobranças mensais geradas por contrato)
CREATE TABLE public.financial_entries (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id  UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  reference  TEXT NOT NULL,
  amount     DECIMAL(10,2) NOT NULL,
  due_date   DATE NOT NULL,
  status     TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- finances (despesas e receitas avulsas)
CREATE TABLE public.finances (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id       UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  type            TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category        TEXT NOT NULL DEFAULT '',
  description     TEXT NOT NULL,
  amount          DECIMAL(10,2) NOT NULL,
  date            DATE NOT NULL,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  is_recurring    BOOLEAN DEFAULT false,
  recurrence_type TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- stages (Kanban de leads)
CREATE TABLE public.stages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#6B7280',
  position   SMALLINT NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- plans (planos de serviço oferecidos pelo usuário)
CREATE TABLE public.plans (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  color      TEXT DEFAULT 'bg-purple-600 text-white hover:bg-purple-700',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, name)
);

-- tags
CREATE TABLE public.tags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT 'bg-purple-600',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, name)
);

-- leads (pipeline de prospecção)
CREATE TABLE public.leads (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id             UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  stage                 UUID REFERENCES public.stages(id) ON DELETE SET NULL,
  name                  TEXT NOT NULL,
  company               TEXT,
  email                 TEXT,
  phone                 TEXT,
  value                 DECIMAL(10,2),
  notes                 TEXT,
  tags                  TEXT[] DEFAULT ARRAY[]::TEXT[],
  icp_fit               BOOLEAN,
  meeting_date          TIMESTAMPTZ,
  reuniao_realizada     BOOLEAN DEFAULT false,
  source                TEXT DEFAULT 'Manual',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- lead_events (histórico de movimentação de leads)
CREATE TABLE public.lead_events (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id     UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
  metadata    JSONB,
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- automations (metadados dos cron jobs)
CREATE TABLE public.automations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jobname           TEXT UNIQUE NOT NULL,
  display_name      TEXT NOT NULL,
  description       TEXT,
  icon              TEXT DEFAULT 'Zap',
  category          TEXT DEFAULT 'sistema',
  enabled           BOOLEAN DEFAULT true,
  schedule          TEXT NOT NULL,
  function_name     TEXT NOT NULL,
  last_triggered_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- google_calendar_tokens
CREATE TABLE public.google_calendar_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  access_token  TEXT,
  refresh_token TEXT,
  token_type    TEXT DEFAULT 'Bearer',
  expiry_date   BIGINT,
  scope         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- google_calendar_events (cache local)
CREATE TABLE public.google_calendar_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  google_event_id TEXT NOT NULL,
  title           TEXT,
  description     TEXT,
  start_time      TIMESTAMPTZ,
  end_time        TIMESTAMPTZ,
  all_day         BOOLEAN DEFAULT false,
  location        TEXT,
  html_link       TEXT,
  status          TEXT,
  color_id        TEXT,
  synced_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, google_event_id)
);

-- notion_config
CREATE TABLE public.notion_config (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id     TEXT,
  database_name   TEXT,
  last_synced_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- notion_tasks (cache local)
CREATE TABLE public.notion_tasks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notion_page_id TEXT NOT NULL UNIQUE,
  title          TEXT,
  status         TEXT,
  due_date       TIMESTAMPTZ,
  priority       TEXT,
  url            TEXT,
  properties     JSONB,
  synced_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES (performance — foco nas queries mais frequentes)
-- ============================================================

-- clients
CREATE INDEX idx_clients_user_id        ON public.clients(user_id);
CREATE INDEX idx_clients_tags           ON public.clients USING GIN(tags);

-- contracts
CREATE INDEX idx_contracts_user_id      ON public.contracts(user_id);
CREATE INDEX idx_contracts_client_id    ON public.contracts(client_id);
CREATE INDEX idx_contracts_status       ON public.contracts(status);
CREATE INDEX idx_contracts_end_date     ON public.contracts(end_date);
CREATE INDEX idx_contracts_user_status  ON public.contracts(user_id, status);

-- financial_entries
CREATE INDEX idx_financial_entries_user_id     ON public.financial_entries(user_id);
CREATE INDEX idx_financial_entries_client_id   ON public.financial_entries(client_id);
CREATE INDEX idx_financial_entries_status      ON public.financial_entries(status);
CREATE INDEX idx_financial_entries_due_date    ON public.financial_entries(due_date);
CREATE INDEX idx_financial_entries_user_status ON public.financial_entries(user_id, status);
CREATE INDEX idx_financial_entries_user_due    ON public.financial_entries(user_id, due_date);

-- finances
CREATE INDEX idx_finances_user_id   ON public.finances(user_id);
CREATE INDEX idx_finances_user_type ON public.finances(user_id, type);
CREATE INDEX idx_finances_date      ON public.finances(date);

-- leads
CREATE INDEX idx_leads_user_id    ON public.leads(user_id);
CREATE INDEX idx_leads_stage      ON public.leads(stage);
CREATE INDEX idx_leads_user_stage ON public.leads(user_id, stage);

-- stages
CREATE INDEX idx_stages_user_id ON public.stages(user_id);

-- lead_events
CREATE INDEX idx_lead_events_lead_id ON public.lead_events(lead_id);
CREATE INDEX idx_lead_events_user_id ON public.lead_events(user_id);

-- google_calendar_events
CREATE INDEX idx_google_events_user_id    ON public.google_calendar_events(user_id);
CREATE INDEX idx_google_events_start_time ON public.google_calendar_events(start_time);

-- ============================================================
-- TRIGGERS: updated_at automático
-- ============================================================
CREATE TRIGGER trg_clients_updated_at         BEFORE UPDATE ON public.clients         FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_contracts_updated_at        BEFORE UPDATE ON public.contracts        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_financial_entries_updated_at BEFORE UPDATE ON public.financial_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_finances_updated_at         BEFORE UPDATE ON public.finances         FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_leads_updated_at            BEFORE UPDATE ON public.leads            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_stages_updated_at           BEFORE UPDATE ON public.stages           FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_plans_updated_at            BEFORE UPDATE ON public.plans            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tags_updated_at             BEFORE UPDATE ON public.tags             FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_automations_updated_at      BEFORE UPDATE ON public.automations      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_gcal_tokens_updated_at      BEFORE UPDATE ON public.google_calendar_tokens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.clients                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_entries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finances                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stages                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_events              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automations              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_calendar_tokens   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_calendar_events   ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (cada usuário acessa somente os seus dados)
CREATE POLICY "own_clients"           ON public.clients           FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_contracts"         ON public.contracts         FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_financial_entries" ON public.financial_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_finances"          ON public.finances          FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_stages"            ON public.stages            FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_plans"             ON public.plans             FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_tags"              ON public.tags              FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_leads"             ON public.leads             FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_lead_events"       ON public.lead_events       FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_gcal_tokens"       ON public.google_calendar_tokens FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_gcal_events"       ON public.google_calendar_events FOR ALL USING (auth.uid() = user_id);

-- automations: todos os usuários autenticados podem ler e atualizar
CREATE POLICY "auth_read_automations"   ON public.automations FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_update_automations" ON public.automations FOR UPDATE TO authenticated USING (true);

-- ============================================================
-- FUNÇÕES: setup de novo usuário
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_default_stages_for_user(user_uuid UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.stages (user_id, name, color, position, is_default) VALUES
    (user_uuid, 'Sem Atendimento',  '#6B7280', 0,  true),
    (user_uuid, 'Em Atendimento',   '#3B82F6', 1,  true),
    (user_uuid, 'Reunião Agendada', '#8B5CF6', 2,  true),
    (user_uuid, 'Proposta Enviada', '#F59E0B', 3,  true),
    (user_uuid, 'Follow-up',        '#10B981', 4,  true),
    (user_uuid, 'Cliente',          '#22C55E', 5,  true),
    (user_uuid, 'Mentorado',        '#EC4899', 6,  true),
    (user_uuid, 'Geladeira',        '#64748B', 7,  true),
    (user_uuid, 'Equipe',           '#14B8A6', 8,  true),
    (user_uuid, 'Ignorar',          '#EF4444', 9,  true);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_default_plans_for_user(user_uuid UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.plans (user_id, name, is_default) VALUES
    (user_uuid, 'Vendas',       true),
    (user_uuid, 'Branding',     true),
    (user_uuid, 'Landing Page', true),
    (user_uuid, 'Automação',    true)
  ON CONFLICT (user_id, name) DO NOTHING;
END;
$$;

-- Trigger executado ao cadastrar um novo usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.create_default_stages_for_user(NEW.id);
  PERFORM public.create_default_plans_for_user(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- FUNÇÕES: gestão de contratos e tags
-- ============================================================

-- Cria contrato automaticamente ao cadastrar um cliente com dados de contrato
CREATE OR REPLACE FUNCTION public.create_contract_for_client()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.contract_end IS NOT NULL AND NEW.monthly_value > 0 THEN
    INSERT INTO public.contracts (user_id, client_id, type, monthly_value, start_date, end_date, status)
    VALUES (
      NEW.user_id,
      NEW.id,
      COALESCE(NEW.plan, 'Serviço Geral'),
      NEW.monthly_value,
      COALESCE(NEW.start_date, CURRENT_DATE),
      NEW.contract_end,
      CASE
        WHEN NEW.contract_end < CURRENT_DATE THEN 'inactive'
        WHEN NEW.contract_end <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring'
        ELSE 'active'
      END
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_create_contract_for_client ON public.clients;
CREATE TRIGGER trigger_create_contract_for_client
  AFTER INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.create_contract_for_client();

-- Sincroniza status dos contratos quando as tags do cliente são editadas manualmente
CREATE OR REPLACE FUNCTION public.sync_client_contract_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.contracts
  SET status = CASE
    WHEN 'Ativo'    = ANY(NEW.tags) THEN 'active'
    WHEN 'A vencer' = ANY(NEW.tags) THEN 'expiring'
    WHEN 'Vencido'  = ANY(NEW.tags) OR 'Inativo' = ANY(NEW.tags) THEN 'inactive'
    ELSE 'active'
  END,
  updated_at = NOW()
  WHERE client_id = NEW.id
    AND status NOT IN ('inactive', 'cancelled');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_client_contract_status ON public.clients;
CREATE TRIGGER trigger_sync_client_contract_status
  AFTER UPDATE ON public.clients
  FOR EACH ROW
  WHEN (OLD.tags IS DISTINCT FROM NEW.tags)
  EXECUTE FUNCTION public.sync_client_contract_status();

-- Atualiza tags dos clientes baseado no vencimento dos contratos (rodado via cron diariamente)
CREATE OR REPLACE FUNCTION public.update_client_tags_from_contracts()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  client_record RECORD;
  best_status   TEXT;
  today_date    DATE := CURRENT_DATE;
  in_30_days    DATE := CURRENT_DATE + INTERVAL '30 days';
BEGIN
  FOR client_record IN
    SELECT DISTINCT c.id, c.user_id
    FROM public.clients c
    INNER JOIN public.contracts ct ON ct.client_id = c.id
  LOOP
    SELECT CASE
      WHEN EXISTS (
        SELECT 1 FROM public.contracts WHERE client_id = client_record.id AND end_date > in_30_days AND status != 'inactive'
      ) THEN 'Ativo'
      WHEN EXISTS (
        SELECT 1 FROM public.contracts WHERE client_id = client_record.id AND end_date >= today_date AND end_date <= in_30_days AND status != 'inactive'
      ) THEN 'A vencer'
      WHEN EXISTS (
        SELECT 1 FROM public.contracts WHERE client_id = client_record.id AND end_date < today_date
      ) THEN 'Vencido'
      ELSE 'Inativo'
    END INTO best_status;

    UPDATE public.clients
    SET tags = ARRAY[best_status::TEXT], updated_at = NOW()
    WHERE id = client_record.id
      AND (tags IS NULL OR NOT (tags @> ARRAY[best_status::TEXT] AND array_length(tags, 1) = 1));

    UPDATE public.contracts
    SET status = CASE
      WHEN end_date < today_date THEN 'inactive'
      WHEN end_date <= in_30_days THEN 'expiring'
      ELSE 'active'
    END, updated_at = NOW()
    WHERE client_id = client_record.id AND status != 'inactive' AND end_date IS NOT NULL;
  END LOOP;
END;
$$;

-- ============================================================
-- FUNÇÕES: integração WhatsApp (somente criação de leads)
-- ============================================================

-- Chamada pelo webhook da Evolution API ao receber uma mensagem.
-- Cria um lead automaticamente para mensagens recebidas (não enviadas pelo usuário).
CREATE OR REPLACE FUNCTION public.process_webhook_message(
  p_user_id       UUID,
  p_numero        TEXT,
  p_mensagem      TEXT,
  p_direcao       BOOLEAN,          -- false = recebida, true = enviada pelo usuário
  p_data_hora     TIMESTAMPTZ,
  p_nome_contato  TEXT    DEFAULT NULL,
  p_media_type    TEXT    DEFAULT NULL,
  p_media_url     TEXT    DEFAULT NULL,
  p_media_filename TEXT   DEFAULT NULL,
  p_media_size    BIGINT  DEFAULT NULL,
  p_media_key     TEXT    DEFAULT NULL,
  p_is_group      BOOLEAN DEFAULT false,
  p_contact_photo TEXT    DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  lead_uuid        UUID;
  phone_clean      TEXT;
  contact_name     TEXT;
  default_stage_id UUID;
BEGIN
  -- Ignora grupos e mensagens enviadas pelo próprio usuário
  IF p_is_group OR p_direcao THEN
    RETURN NULL;
  END IF;

  phone_clean  := REGEXP_REPLACE(p_numero, '[^0-9+@]', '', 'g');
  contact_name := COALESCE(p_nome_contato, 'Contato ' || phone_clean);

  -- Busca o stage padrão "Sem Atendimento" do usuário
  SELECT id INTO default_stage_id FROM public.stages
  WHERE user_id = p_user_id AND name = 'Sem Atendimento'
  LIMIT 1;

  -- Verifica se já existe um lead com este número
  SELECT id INTO lead_uuid FROM public.leads
  WHERE user_id = p_user_id AND phone = phone_clean
  LIMIT 1;

  IF lead_uuid IS NULL THEN
    -- Cria novo lead automaticamente
    INSERT INTO public.leads (user_id, name, phone, source, stage, created_at, updated_at)
    VALUES (p_user_id, contact_name, phone_clean, 'WhatsApp', default_stage_id, p_data_hora, p_data_hora)
    RETURNING id INTO lead_uuid;
  ELSE
    -- Atualiza nome se veio um nome novo
    IF p_nome_contato IS NOT NULL THEN
      UPDATE public.leads
      SET name = p_nome_contato, updated_at = p_data_hora
      WHERE id = lead_uuid;
    END IF;
  END IF;

  RETURN lead_uuid;
END;
$$;

-- Wrapper para webhooks que enviam JSON
CREATE OR REPLACE FUNCTION public.webhook_insert_message(webhook_data JSONB)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN public.process_webhook_message(
    (webhook_data->>'userId')::UUID,
    webhook_data->>'numero',
    webhook_data->>'mensagem',
    (webhook_data->>'direcao')::BOOLEAN,
    (webhook_data->>'dataHora')::TIMESTAMPTZ,
    webhook_data->>'nomeContato',
    webhook_data->>'mediaType',
    webhook_data->>'mediaUrl',
    webhook_data->>'mediaFilename',
    (webhook_data->>'mediaSize')::BIGINT,
    webhook_data->>'mediaKey',
    COALESCE((webhook_data->>'isGroup')::BOOLEAN, false),
    webhook_data->>'contactPhoto'
  )::TEXT;
END;
$$;

-- ============================================================
-- FUNÇÕES: gerenciar cron jobs das automações
-- ============================================================

CREATE OR REPLACE FUNCTION public.manage_automation_cron(
  p_action  TEXT,
  p_jobname TEXT,
  p_schedule TEXT DEFAULT NULL,
  p_command  TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, cron, extensions AS $$
BEGIN
  IF p_action = 'unschedule' THEN
    BEGIN PERFORM cron.unschedule(p_jobname); EXCEPTION WHEN OTHERS THEN NULL; END;
  ELSIF p_action = 'schedule' AND p_schedule IS NOT NULL AND p_command IS NOT NULL THEN
    BEGIN PERFORM cron.unschedule(p_jobname); EXCEPTION WHEN OTHERS THEN NULL; END;
    PERFORM cron.schedule(p_jobname, p_schedule, p_command);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.manage_automation_cron TO authenticated;

-- ============================================================
-- CRON JOBS
-- ============================================================

-- Verificação diária de contratos e tags (12h UTC = 09h BRT)
SELECT cron.schedule(
  'verificar-contratos-diario',
  '0 12 * * *',
  $$ SELECT public.update_client_tags_from_contracts(); $$
);

-- ============================================================
-- DADOS INICIAIS: automações
-- ============================================================

INSERT INTO public.automations (jobname, display_name, description, icon, category, enabled, schedule, function_name) VALUES
  ('resumo-diario-whatsapp',   'Resumo Diário de Atividades', 'Envia resumo com eventos do Google Calendar e tarefas do Notion.', 'CalendarDays', 'atividades', true, '0 9 * * *',  'daily-summary'),
  ('vigilante-tarefas-10min',  'Lembrete de Tarefas',         'Alerta 10 minutos antes de tarefas e eventos.',                    'Bell',         'atividades', true, '* * * * *',  'task-reminder'),
  ('alerta-financeiro-diario', 'Alerta Financeiro Diário',    'Relatório de pagamentos em atraso e contratos a vencer.',          'DollarSign',   'financeiro', true, '0 11 * * *', 'financial-alert'),
  ('cleanup-messages-media',   'Limpeza de Mídias Antigas',   'Remove arquivos de mídia enviados há mais de 30 dias.',            'Trash2',       'sistema',    true, '0 2 * * *',  'cleanup-media')
ON CONFLICT (jobname) DO NOTHING;
