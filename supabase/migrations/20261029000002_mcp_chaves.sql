-- ─────────────────────────────────────────────────────────────────────────
-- Chaves do MCP, gerenciadas pela tela (Central de Agentes → MCP → Conexão).
--
-- Antes havia uma chave só, num segredo da Edge Function: trocar ou revogar
-- dependia de alguém com acesso ao Supabase. Agora o dono gera, nomeia e
-- revoga pela tela, e cada chamada fica ligada à chave que a fez.
--
-- Só o HASH (SHA-256) é guardado: a chave aparece uma vez, na criação, e
-- nem quem lê o banco consegue recuperá-la.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.mcp_chaves (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  prefixo     text not null,
  hash        text not null unique,
  created_at  timestamptz not null default now(),
  ultimo_uso  timestamptz,
  revogada_em timestamptz
);

alter table public.mcp_chaves enable row level security;
drop policy if exists "dono le chaves do mcp" on public.mcp_chaves;
create policy "dono le chaves do mcp" on public.mcp_chaves
  for select to authenticated using (true);

alter table public.mcp_audit add column if not exists chave_id uuid references public.mcp_chaves(id) on delete set null;

-- Gera a chave, guarda o hash, devolve o texto UMA vez.
create or replace function public.mcp_criar_chave(p_nome text)
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
  insert into public.mcp_chaves (nome, prefixo, hash)
  values (btrim(p_nome), left(v_chave, 12), encode(digest(v_chave, 'sha256'), 'hex'));
  return v_chave;
end;
$$;

create or replace function public.mcp_revogar_chave(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'não autenticado'; end if;
  update public.mcp_chaves set revogada_em = now() where id = p_id and revogada_em is null;
end;
$$;

-- Usada pela Edge Function `mcp`: devolve o id da chave válida (ou null) e
-- marca o último uso — no máximo uma escrita por minuto por chave, para não
-- gravar a cada chamada numa instância pequena.
create or replace function public.mcp_validar_chave(p_chave text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
begin
  select id into v_id from public.mcp_chaves
   where hash = encode(digest(p_chave, 'sha256'), 'hex') and revogada_em is null;
  if v_id is not null then
    update public.mcp_chaves set ultimo_uso = now()
     where id = v_id and (ultimo_uso is null or ultimo_uso < now() - interval '1 minute');
  end if;
  return v_id;
end;
$$;

revoke all on function public.mcp_criar_chave(text) from public, anon;
revoke all on function public.mcp_revogar_chave(uuid) from public, anon;
revoke all on function public.mcp_validar_chave(text) from public, anon, authenticated;
grant execute on function public.mcp_criar_chave(text) to authenticated;
grant execute on function public.mcp_revogar_chave(uuid) to authenticated;
grant execute on function public.mcp_validar_chave(text) to service_role;
