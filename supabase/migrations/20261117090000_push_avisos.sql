-- ─────────────────────────────────────────────────────────────────────────
-- Avisos importantes no celular (além das aprovações).
--
-- Os scripts da VPS (saldo das contas, campanha acabando, contrato assinado,
-- falha ao executar uma aprovação…) já avisam no Telegram. Pedido do Gabriel
-- (17/11/2026): os importantes também chegam como notificação do app.
--
-- Caminho: o script chama a ferramenta MCP `avisar_no_celular`, que grava aqui;
-- o gatilho chama a função `avisar-aprovacao` com o id do aviso, e ela manda o
-- push pros aparelhos do dono. Mesmo desenho das aprovações: o corpo da
-- chamada só leva o id, o texto é lido do banco.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.avisos_push (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  titulo     text not null,
  corpo      text,
  url        text not null default '/',
  tag        text,
  origem     text,
  created_at timestamptz not null default now()
);

create index if not exists avisos_push_user_idx on public.avisos_push (user_id, created_at desc);

alter table public.avisos_push enable row level security;
drop policy if exists "dono dos avisos" on public.avisos_push;
create policy "dono dos avisos" on public.avisos_push
  for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.avisar_push_aviso()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  segredo text;
begin
  begin
    select valor into segredo from public.push_config where chave = 'gatilho_segredo';
    perform net.http_post(
      url     := 'https://dygadnfeoiimmbeqbsvt.supabase.co/functions/v1/avisar-aprovacao',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-segredo', segredo),
      body    := jsonb_build_object('aviso', new.id),
      timeout_milliseconds := 8000
    );
  exception when others then
    raise warning 'push de aviso nao enviado: %', sqlerrm;
  end;
  return new;
end;
$$;

revoke all on function public.avisar_push_aviso() from public, anon, authenticated;

drop trigger if exists avisar_push_aviso on public.avisos_push;
create trigger avisar_push_aviso
  after insert on public.avisos_push
  for each row execute function public.avisar_push_aviso();
