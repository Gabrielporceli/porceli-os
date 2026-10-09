-- Estado da conexão do WhatsApp (instância Evolution), mantido pela função
-- whatsapp-health. O CRM lê esta tabela pra mostrar o banner de queda.
create table if not exists public.whatsapp_status (
  instance   text primary key,
  state      text not null default 'open' check (state in ('open', 'down')),
  fail_count int  not null default 0,
  since      timestamptz not null default now(),
  checked_at timestamptz not null default now(),
  detail     text
);

alter table public.whatsapp_status enable row level security;

create policy "whatsapp_status: leitura autenticada"
  on public.whatsapp_status for select
  to authenticated
  using (true);

insert into public.whatsapp_status (instance) values ('agencia03')
on conflict (instance) do nothing;

-- A cada 2 minutos. A função não exige JWT: só consulta a Evolution e grava o estado.
select cron.schedule(
  'whatsapp-health-check',
  '*/2 * * * *',
  $$select net.http_post(
      url := 'https://dygadnfeoiimmbeqbsvt.supabase.co/functions/v1/whatsapp-health',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb,
      timeout_milliseconds := 20000
    )$$
);
