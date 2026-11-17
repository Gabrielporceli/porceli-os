-- ─────────────────────────────────────────────────────────────────────────
-- Notificação push quando um agente pede aprovação.
--
-- O app instalado na tela de início do celular (PWA) pede permissão e grava
-- a inscrição do aparelho em `push_inscricoes`. Quando entra um pedido
-- pendente em `agente_aprovacoes`, o gatilho chama a função
-- `avisar-aprovacao`, que manda o push pros aparelhos do dono do pedido.
--
-- Por que gatilho no banco: os pedidos entram pelo MCP dos agentes (service
-- role), não pela tela. O gatilho pega todos, sem depender de cada agente
-- lembrar de avisar.
--
-- O gatilho NUNCA derruba a gravação do pedido: a chamada é assíncrona
-- (pg_net) e qualquer erro vira só um aviso no log.
-- ─────────────────────────────────────────────────────────────────────────

-- Aparelhos inscritos. Só o dono vê e mexe nos seus.
create table if not exists public.push_inscricoes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  aparelho   text,
  created_at timestamptz not null default now()
);

create index if not exists push_inscricoes_user_idx on public.push_inscricoes (user_id);

alter table public.push_inscricoes enable row level security;
drop policy if exists "dono das inscricoes" on public.push_inscricoes;
create policy "dono das inscricoes" on public.push_inscricoes
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Segredos do push: o par de chaves VAPID (gerado pela função na primeira
-- chamada) e o segredo que o gatilho apresenta à função. RLS ligado e SEM
-- política: só a service role e o próprio banco leem.
create table if not exists public.push_config (
  chave text primary key,
  valor text not null
);
alter table public.push_config enable row level security;
revoke all on public.push_config from anon, authenticated;

-- O segredo nasce aqui dentro e não sai: ninguém precisa conhecê-lo.
insert into public.push_config (chave, valor)
values ('gatilho_segredo', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (chave) do nothing;

create or replace function public.avisar_aprovacao_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  segredo text;
begin
  if new.status is distinct from 'pendente' then
    return new;
  end if;
  begin
    select valor into segredo from public.push_config where chave = 'gatilho_segredo';
    perform net.http_post(
      url     := 'https://dygadnfeoiimmbeqbsvt.supabase.co/functions/v1/avisar-aprovacao',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-segredo', segredo),
      body    := jsonb_build_object('id', new.id),
      timeout_milliseconds := 8000
    );
  exception when others then
    raise warning 'push de aprovacao nao enviado: %', sqlerrm;
  end;
  return new;
end;
$$;

revoke all on function public.avisar_aprovacao_push() from public, anon, authenticated;

drop trigger if exists avisar_aprovacao_push on public.agente_aprovacoes;
create trigger avisar_aprovacao_push
  after insert on public.agente_aprovacoes
  for each row execute function public.avisar_aprovacao_push();
