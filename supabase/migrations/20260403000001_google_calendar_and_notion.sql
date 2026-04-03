-- Google Calendar OAuth tokens (por usuário)
CREATE TABLE IF NOT EXISTS public.google_calendar_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  access_token text,
  refresh_token text,
  token_type text DEFAULT 'Bearer',
  expiry_date bigint,
  scope text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários gerenciam seus próprios tokens"
  ON public.google_calendar_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Google Calendar eventos (cache local)
CREATE TABLE IF NOT EXISTS public.google_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  google_event_id text NOT NULL,
  title text,
  description text,
  start_time timestamptz,
  end_time timestamptz,
  all_day boolean DEFAULT false,
  location text,
  html_link text,
  status text,
  color_id text,
  synced_at timestamptz DEFAULT now(),
  UNIQUE(user_id, google_event_id)
);

ALTER TABLE public.google_calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem seus próprios eventos"
  ON public.google_calendar_events
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Configuração do Notion (global do app)
CREATE TABLE IF NOT EXISTS public.notion_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id text,
  database_name text,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tarefas/páginas do Notion (cache local)
CREATE TABLE IF NOT EXISTS public.notion_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notion_page_id text NOT NULL UNIQUE,
  title text,
  status text,
  due_date timestamptz,
  priority text,
  url text,
  properties jsonb,
  synced_at timestamptz DEFAULT now()
);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_google_calendar_tokens_updated_at
  BEFORE UPDATE ON public.google_calendar_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notion_config_updated_at
  BEFORE UPDATE ON public.notion_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
