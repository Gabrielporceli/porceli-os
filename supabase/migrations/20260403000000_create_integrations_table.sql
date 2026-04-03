-- Tabela de integrações externas (Google Calendar, Notion, etc.)
create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  provider text not null, -- 'google_calendar' | 'notion'
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  config jsonb default '{}', -- configurações específicas do provider (calendar_id, notion_database_id, etc.)
  is_active boolean default true,
  last_sync_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, provider)
);

-- RLS
alter table public.integrations enable row level security;

create policy "Users can manage own integrations"
  on public.integrations
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Trigger para updated_at
create or replace function public.update_integrations_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger integrations_updated_at
  before update on public.integrations
  for each row execute function public.update_integrations_updated_at();

-- Index para buscas por user_id e provider
create index integrations_user_provider_idx on public.integrations(user_id, provider);
