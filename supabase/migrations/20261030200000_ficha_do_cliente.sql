-- ─────────────────────────────────────────────────────────────────────────
-- Ficha do cliente: o que só o dono do negócio sabe responder.
--
-- Nicho, ticket, margem, conversão, oferta, público, restrições, tom de voz.
-- É a fonte que os agentes leem para tratar cada cliente no contexto dele (a
-- mesma régua para uma hamburgueria e um consultório não serve).
--
-- Preenchida pela agência no cadastro do cliente ou pelo próprio dono, por um
-- link único (`link_token`) que a função `ficha-publica` aceita até
-- `link_expira_em`. As perguntas ficam em src/features/clients/fichaCampos.ts.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.client_fichas (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null default auth.uid(),
  client_id             uuid not null unique references public.clients(id) on delete cascade,

  nicho                 text,
  subnicho              text,
  cidade                text,
  raio_atendimento      text,
  tempo_mercado         text,

  ticket_mediano        numeric(12,2),
  margem_percentual     numeric(5,2) check (margem_percentual is null or margem_percentual between 0 and 100),
  conversao_percentual  numeric(5,2) check (conversao_percentual is null or conversao_percentual between 0 and 100),
  meta_mensal           text,
  capacidade_diaria     text,
  -- CPL máximo = ticket mediano × margem × conversão (nota "CPL Máximo").
  cpl_maximo            numeric(12,2) generated always as
                          (round(ticket_mediano * margem_percentual / 100 * conversao_percentual / 100, 2)) stored,

  oferta_principal      text,
  preco_oferta          text,
  promocao_atual        text,
  diferenciais          text,
  por_que_compram       text,

  publico_ideal         text,
  publico_nao_ideal     text,

  horario_atendimento   text,
  quem_atende           text,
  tempo_resposta        text,

  restricoes            text,
  regras_conselho       text,
  assuntos_proibidos    text,

  tom_de_voz            text,
  palavras_usar         text,
  palavras_evitar       text,
  concorrentes          text,
  observacoes           text,

  preenchido_por        text check (preenchido_por in ('agencia', 'cliente')),
  respondido_cliente_em timestamptz,
  link_token            text unique,
  link_expira_em        timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists client_fichas_user_idx on public.client_fichas (user_id);

drop trigger if exists client_fichas_updated_at on public.client_fichas;
create trigger client_fichas_updated_at before update on public.client_fichas
  for each row execute function update_updated_at_column();

alter table public.client_fichas enable row level security;
-- Mesma regra dos clientes: cada um vê e mexe só no que é seu. O formulário
-- público não passa por aqui: usa a função ficha-publica (service role), que
-- só aceita o token válido e só grava as respostas.
drop policy if exists "dono da ficha" on public.client_fichas;
create policy "dono da ficha" on public.client_fichas
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.clients c where c.id = client_id and c.user_id = (select auth.uid()))
  );

-- ─────────────────────────────────────────────────────────────────────────
-- Chaves do MCP com ferramentas permitidas.
--
-- Os agentes de tráfego precisam ler a ficha, e só ela. Antes, toda chave do
-- MCP abria o sistema inteiro (inclusive excluir, SQL e WhatsApp), e a única
-- trava era o filtro do lado do agente. Agora a chave pode levar a lista do
-- que pode chamar, e o MCP recusa o resto no servidor. Lista vazia (null) =
-- acesso completo, como as chaves que já existem.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.mcp_chaves add column if not exists ferramentas text[];

drop function if exists public.mcp_criar_chave(text);
create or replace function public.mcp_criar_chave(p_nome text, p_ferramentas text[] default null)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_chave text := 'pcs_' || encode(gen_random_bytes(24), 'hex');
begin
  if auth.uid() is null then raise exception 'não autenticado'; end if;
  if coalesce(btrim(p_nome), '') = '' then raise exception 'dê um nome à chave'; end if;
  insert into public.mcp_chaves (nome, prefixo, hash, ferramentas)
  values (btrim(p_nome), left(v_chave, 12), encode(digest(v_chave, 'sha256'), 'hex'),
          nullif(p_ferramentas, '{}'::text[]));
  return v_chave;
end;
$$;
revoke all on function public.mcp_criar_chave(text, text[]) from public, anon;
grant execute on function public.mcp_criar_chave(text, text[]) to authenticated;

-- Como mcp_validar_chave, devolvendo também as ferramentas permitidas.
create or replace function public.mcp_validar_chave_v2(p_chave text)
returns table (id uuid, ferramentas text[])
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  return query
    select c.id, c.ferramentas from public.mcp_chaves c
     where c.hash = encode(digest(p_chave, 'sha256'), 'hex') and c.revogada_em is null;
  update public.mcp_chaves set ultimo_uso = now()
   where hash = encode(digest(p_chave, 'sha256'), 'hex') and revogada_em is null
     and (ultimo_uso is null or ultimo_uso < now() - interval '1 minute');
end;
$$;
revoke all on function public.mcp_validar_chave_v2(text) from public, anon, authenticated;
grant execute on function public.mcp_validar_chave_v2(text) to service_role;
