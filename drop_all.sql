-- ============================================================
-- DROP ALL — Porceli OS
-- Cola no SQL Editor do Supabase e execute para limpar tudo.
-- ============================================================

-- Cron jobs
DO $$ BEGIN
  PERFORM cron.unschedule(jobname) FROM cron.job WHERE jobname IN (
    'verificar-contratos-diario',
    'resumo-diario-whatsapp',
    'vigilante-tarefas-10min',
    'alerta-financeiro-diario',
    'cleanup-messages-media'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Trigger de novo usuário
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Tabelas
DROP TABLE IF EXISTS
  public.notion_tasks,
  public.notion_config,
  public.google_calendar_events,
  public.google_calendar_tokens,
  public.automations,
  public.lead_events,
  public.leads,
  public.tags,
  public.plans,
  public.stages,
  public.financial_entries,
  public.finances,
  public.contracts,
  public.clients
CASCADE;

-- Funções
DROP FUNCTION IF EXISTS public.update_client_tags_from_contracts()                                                               CASCADE;
DROP FUNCTION IF EXISTS public.create_contract_for_client()                                                                      CASCADE;
DROP FUNCTION IF EXISTS public.sync_client_contract_status()                                                                     CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user()                                                                                 CASCADE;
DROP FUNCTION IF EXISTS public.create_default_stages_for_user(UUID)                                                              CASCADE;
DROP FUNCTION IF EXISTS public.create_default_plans_for_user(UUID)                                                               CASCADE;
DROP FUNCTION IF EXISTS public.process_webhook_message(UUID,TEXT,TEXT,BOOLEAN,TIMESTAMPTZ,TEXT,TEXT,TEXT,TEXT,BIGINT,TEXT,BOOLEAN,TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.webhook_insert_message(JSONB)                                                                     CASCADE;
DROP FUNCTION IF EXISTS public.manage_automation_cron(TEXT, TEXT, TEXT, TEXT)                                                    CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column()                                                                        CASCADE;
