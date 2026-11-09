-- ─────────────────────────────────────────────────────────────────────────
-- Ficha do cliente: lucro atual, recompra (LTV) e onde vende.
--
-- margem_percentual passa a ser a margem BRUTA (antes do marketing): só a
-- pergunta mudou (src/features/clients/fichaCampos.ts). O lucro atual da
-- operação é outra pergunta, porque não serve para o CPL máximo nem para o
-- ROAS de equilíbrio.
--
-- LTV = ticket mediano × quantas vezes um cliente compra, calculado como o
-- cpl_maximo. taxa_recompra (texto, só loja online) sai da ficha; a coluna
-- fica para não perder resposta antiga.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.client_fichas
  add column if not exists canais_venda           text,
  add column if not exists lucro_atual_percentual numeric(5,2)
    check (lucro_atual_percentual is null or lucro_atual_percentual between -100 and 100),
  add column if not exists recompra_percentual    numeric(5,2)
    check (recompra_percentual is null or recompra_percentual between 0 and 100),
  add column if not exists compras_por_cliente    numeric(8,2)
    check (compras_por_cliente is null or compras_por_cliente >= 0),
  add column if not exists intervalo_recompra     text;

alter table public.client_fichas
  add column if not exists ltv numeric(12,2) generated always as
    (round(ticket_mediano * compras_por_cliente, 2)) stored;
