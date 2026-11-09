-- ─────────────────────────────────────────────────────────────────────────
-- Reserva da tarefa de metas, à prova de repetição.
--
-- O script das aprovações chegou a rodar em duas cópias ao mesmo tempo (cron
-- duplicado na Elly) e a mesma ficha virou duas tarefas e dois pedidos de
-- aprovação. Agora ele reserva ANTES de criar a tarefa: o UPDATE condicional
-- trava a linha, e só uma das cópias recebe `true`.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.reservar_tarefa_de_metas(p_client uuid, p_desfazer boolean default false)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok boolean;
begin
  if p_desfazer then
    -- A tarefa não foi criada: devolve a ficha para a fila.
    update client_fichas set metas_tarefa_em = null where client_id = p_client;
    return true;
  end if;
  update client_fichas
     set metas_tarefa_em = now()
   where client_id = p_client
     and metas_pendentes_desde is not null
     and (metas_tarefa_em is null or metas_tarefa_em < metas_pendentes_desde)
  returning true into v_ok;
  return coalesce(v_ok, false);
end;
$$;

revoke all on function public.reservar_tarefa_de_metas(uuid, boolean) from public, anon, authenticated;
grant execute on function public.reservar_tarefa_de_metas(uuid, boolean) to service_role;
