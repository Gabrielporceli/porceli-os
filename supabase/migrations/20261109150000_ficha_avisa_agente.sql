-- ─────────────────────────────────────────────────────────────────────────
-- Ficha salva avisa o agente de Tracking.
--
-- Quando mudam os números ou o nicho da ficha, o próprio banco marca
-- `metas_pendentes_desde`. O script das aprovações na VPS (deploy/scripts/
-- aprovacoes.py, a cada minuto, sem IA) vê a marca, cria a tarefa no Kanban
-- do especialista-tracking (skill metas-do-cliente) e grava `metas_tarefa_em`.
-- Ficha que muda de novo depois disso volta a ficar pendente.
--
-- Por que gatilho no banco: a ficha é salva pela tela da agência, pelo link
-- público do dono do negócio e (no futuro) por outro caminho. O gatilho pega
-- os três, sem depender de quem salvou lembrar de avisar.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.client_fichas
  add column if not exists metas_pendentes_desde timestamptz,
  add column if not exists metas_tarefa_em       timestamptz;

create or replace function public.ficha_marca_metas_pendentes()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT'
     or new.modelo_negocio       is distinct from old.modelo_negocio
     or new.nicho                is distinct from old.nicho
     or new.subnicho             is distinct from old.subnicho
     or new.ticket_mediano       is distinct from old.ticket_mediano
     or new.margem_percentual    is distinct from old.margem_percentual
     or new.conversao_percentual is distinct from old.conversao_percentual
     or new.compras_por_cliente  is distinct from old.compras_por_cliente
     or new.recompra_percentual  is distinct from old.recompra_percentual
  then
    -- Só marca se há o mínimo para a régua: sem margem e ticket não há conta.
    if new.margem_percentual is not null and new.ticket_mediano is not null then
      new.metas_pendentes_desde := now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists ficha_marca_metas_pendentes on public.client_fichas;
create trigger ficha_marca_metas_pendentes
  before insert or update on public.client_fichas
  for each row execute function public.ficha_marca_metas_pendentes();
