-- ─────────────────────────────────────────────────────────────────────────
-- MCP do Porceli System (Hermes).
--
-- mcp_audit: toda chamada de ferramenta do Hermes fica registrada — o quê,
-- com quais parâmetros, se deu certo e quanto demorou. Controle total sem
-- registro seria controle total sem como saber o que foi feito.
--
-- mcp_sql: SQL livre (leitura e escrita), só para o service_role, que é com
-- o que a Edge Function `mcp` fala com o banco. statement_timeout de 15 s
-- porque a instância é Nano: uma consulta sem índice varrendo cron_runs
-- derruba o sistema inteiro.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.mcp_audit (
  id          uuid primary key default gen_random_uuid(),
  ferramenta  text not null,
  argumentos  jsonb,
  ok          boolean not null,
  erro        text,
  duracao_ms  integer,
  created_at  timestamptz not null default now()
);
create index if not exists mcp_audit_created_idx on public.mcp_audit (created_at desc);

alter table public.mcp_audit enable row level security;
-- Leitura pelo dono no painel; escrita só pelo service_role (a função mcp).
drop policy if exists "dono le auditoria do mcp" on public.mcp_audit;
create policy "dono le auditoria do mcp" on public.mcp_audit
  for select to authenticated using (true);

create or replace function public.mcp_sql(p_query text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  q text := btrim(p_query, E' \n\t\r;');
  r jsonb;
  n bigint;
begin
  perform set_config('statement_timeout', '15000', true);

  -- Segredos ficam fora: o Vault guarda as chaves de Asaas, Evolution,
  -- GitHub etc. Ler isso pelo MCP entregaria as credenciais ao agente.
  if q ~* '\m(vault|decrypted_secrets)\M' then
    raise exception 'mcp_sql: o Vault (segredos) não é acessível pelo MCP';
  end if;

  -- Leitura: devolve as linhas como JSON.
  if q ~* '^(select|with|table|values)\M'
     and q !~* '\m(insert|update|delete|merge|alter|drop|truncate|create|grant|revoke|comment)\M' then
    execute format('select coalesce(jsonb_agg(t), ''[]''::jsonb) from (%s) t', q) into r;
    return jsonb_build_object('linhas', r);
  end if;

  -- Escrita com RETURNING: devolve o que foi gravado.
  if q ~* '^(insert|update|delete)\M' and q ~* '\mreturning\M' then
    execute format('with x as (%s) select coalesce(jsonb_agg(x), ''[]''::jsonb) from x', q) into r;
    return jsonb_build_object('linhas', r);
  end if;

  -- Qualquer outra coisa (DML sem returning, DDL): executa e conta.
  execute q;
  get diagnostics n = row_count;
  return jsonb_build_object('ok', true, 'linhas_afetadas', n);
end;
$$;

revoke all on function public.mcp_sql(text) from public, anon, authenticated;
grant execute on function public.mcp_sql(text) to service_role;
