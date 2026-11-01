-- Aprovações dos agentes (Hermes).
--
-- Quando um agente precisa do "ok" do Gabriel (enviar contrato, subir campanha,
-- aplicar negativas…), ele registra o pedido aqui pelo MCP (`pedir_aprovacao`),
-- com o que deve acontecer se for aprovado (`acao`: agente, modelo, skill e
-- instruções). O Gabriel decide na Central de Agentes (botão Aprovações) ou
-- responde no Telegram. Um script na VPS, sem IA, lê as decisões, cria a tarefa
-- no Kanban do agente com a decisão e avisa o resultado no Telegram.

create table if not exists public.agente_aprovacoes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  agente        text not null,
  titulo        text not null,
  resumo        text,
  cliente       text,
  acao          jsonb not null default '{}'::jsonb,
  status        text not null default 'pendente'
                check (status in ('pendente', 'aprovado', 'ajuste', 'recusado', 'resolvido_fora', 'cancelado')),
  comentario    text,
  decidido_em   timestamptz,
  processado_em timestamptz,
  kanban_task   text,
  relatado_em   timestamptz,
  resultado     text,
  created_at    timestamptz not null default now()
);

create index if not exists agente_aprovacoes_pendentes_idx
  on public.agente_aprovacoes (user_id, status, created_at desc);

alter table public.agente_aprovacoes enable row level security;
-- Só o dono vê e decide. Os agentes gravam pelo MCP (service role).
drop policy if exists "dono das aprovacoes" on public.agente_aprovacoes;
create policy "dono das aprovacoes" on public.agente_aprovacoes
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
