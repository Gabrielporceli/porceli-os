-- ─────────────────────────────────────────────────────────────────────────
-- SQL do MCP passa a ser SOMENTE LEITURA.
--
-- O Hermes opera o sistema pelas operações (criar_contrato etc.), que repetem
-- o passo a passo da tela. SQL com escrita deixaria ele gravar direto e pular
-- tudo isso (lançamentos, Asaas, aviso ao cliente). A trava fica no banco:
-- transaction_read_only faz qualquer INSERT/UPDATE/DELETE/DDL falhar, por
-- mais que a consulta tente disfarçar.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.mcp_sql(p_query text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  q text := btrim(p_query, E' \n\t\r;');
  r jsonb;
begin
  perform set_config('statement_timeout', '15000', true);
  perform set_config('transaction_read_only', 'on', true);

  if q ~* '\m(vault|decrypted_secrets)\M' then
    raise exception 'mcp_sql: o Vault (segredos) não é acessível pelo MCP';
  end if;
  if q !~* '^(select|with|table|values)\M' then
    raise exception 'mcp_sql: somente leitura (SELECT/WITH). Para alterar dados, use as operações do MCP.';
  end if;

  execute format('select coalesce(jsonb_agg(t), ''[]''::jsonb) from (%s) t', q) into r;
  return jsonb_build_object('linhas', r);
end;
$$;

revoke all on function public.mcp_sql(text) from public, anon, authenticated;
grant execute on function public.mcp_sql(text) to service_role;
