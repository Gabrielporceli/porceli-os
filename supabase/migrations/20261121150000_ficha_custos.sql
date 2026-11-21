-- ─────────────────────────────────────────────────────────────────────────
-- Ficha do cliente: custos de cada venda e custo fixo (21/11/2026).
--
-- A margem bruta era uma pergunta só, e o dono raramente sabe responder. Agora
-- ela é aberta em partes (produto, embalagem, imposto, taxas, entrega,
-- comissão) e o banco calcula: margem_percentual = 100 − soma das partes
-- preenchidas. Sem nenhuma parte, vale a resposta direta, como antes.
--
-- Custo fixo e faturamento do mês entram para a régua do Tracking: sem eles o
-- "equilíbrio" só paga o custo de cada venda, e o mês pode fechar no prejuízo
-- com o anúncio "no verde". margem_apos_fixo = margem − fixo ÷ faturamento.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.client_fichas
  add column if not exists custo_produto_percentual   numeric(5,2) check (custo_produto_percentual   is null or custo_produto_percentual   between 0 and 100),
  add column if not exists custo_embalagem_percentual numeric(5,2) check (custo_embalagem_percentual is null or custo_embalagem_percentual between 0 and 100),
  add column if not exists impostos_percentual        numeric(5,2) check (impostos_percentual        is null or impostos_percentual        between 0 and 100),
  add column if not exists taxas_venda_percentual     numeric(5,2) check (taxas_venda_percentual     is null or taxas_venda_percentual     between 0 and 100),
  add column if not exists custo_entrega_percentual   numeric(5,2) check (custo_entrega_percentual   is null or custo_entrega_percentual   between 0 and 100),
  add column if not exists comissao_percentual        numeric(5,2) check (comissao_percentual        is null or comissao_percentual        between 0 and 100),
  add column if not exists custo_fixo_mensal          numeric(14,2) check (custo_fixo_mensal is null or custo_fixo_mensal >= 0),
  add column if not exists faturamento_mensal         numeric(14,2) check (faturamento_mensal is null or faturamento_mensal >= 0);

-- Margem pelas partes. Nome começa com "ficha_calcula" para rodar ANTES de
-- ficha_marca_metas_pendentes (gatilhos do mesmo momento rodam em ordem alfabética).
create or replace function public.ficha_calcula_margem()
returns trigger
language plpgsql
as $$
declare
  v_partes numeric;
  v_tem boolean;
begin
  v_tem := coalesce(new.custo_produto_percentual, new.custo_embalagem_percentual, new.impostos_percentual,
                    new.taxas_venda_percentual, new.custo_entrega_percentual, new.comissao_percentual) is not null;
  if v_tem then
    v_partes := coalesce(new.custo_produto_percentual, 0) + coalesce(new.custo_embalagem_percentual, 0)
              + coalesce(new.impostos_percentual, 0) + coalesce(new.taxas_venda_percentual, 0)
              + coalesce(new.custo_entrega_percentual, 0) + coalesce(new.comissao_percentual, 0);
    new.margem_percentual := greatest(least(100 - v_partes, 100), 0);
  end if;
  return new;
end;
$$;

drop trigger if exists ficha_calcula_margem on public.client_fichas;
create trigger ficha_calcula_margem
  before insert or update on public.client_fichas
  for each row execute function public.ficha_calcula_margem();

alter table public.client_fichas
  add column if not exists margem_apos_fixo numeric(7,2) generated always as (
    case when faturamento_mensal > 0 and custo_fixo_mensal is not null and margem_percentual is not null
      then round(margem_percentual - custo_fixo_mensal / faturamento_mensal * 100, 2) end
  ) stored;

-- Custo fixo e faturamento também mudam a régua: avisam o agente de Tracking.
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
     or new.custo_fixo_mensal    is distinct from old.custo_fixo_mensal
     or new.faturamento_mensal   is distinct from old.faturamento_mensal
  then
    if new.margem_percentual is not null and new.ticket_mediano is not null then
      new.metas_pendentes_desde := now();
    end if;
  end if;
  return new;
end;
$$;
