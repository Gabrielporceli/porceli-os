-- ─────────────────────────────────────────────────────────────────────────
-- Ficha do cliente por modelo de negócio.
--
-- A agência atende de hamburgueria a infoproduto e imobiliária. A primeira
-- pergunta da ficha passa a ser o modelo de negócio, e cada modelo tem seu
-- bloco de perguntas (src/features/clients/fichaCampos.ts):
--   local · servico · ecommerce · infoproduto · alto_valor · b2b
-- ─────────────────────────────────────────────────────────────────────────
alter table public.client_fichas
  add column if not exists modelo_negocio text
    check (modelo_negocio is null or modelo_negocio in ('local', 'servico', 'ecommerce', 'infoproduto', 'alto_valor', 'b2b')),
  -- Serviço com agendamento
  add column if not exists servico_carro_chefe text,
  add column if not exists capacidade_agenda   text,
  add column if not exists comparecimento      text,
  add column if not exists etapas_fechamento   text,
  -- Loja online / dropshipping
  add column if not exists plataforma_loja     text,
  add column if not exists produto_carro_chefe text,
  add column if not exists prazo_entrega       text,
  add column if not exists politica_frete      text,
  add column if not exists taxa_recompra       text,
  -- Infoproduto
  add column if not exists plataforma_venda    text,
  add column if not exists formato_produto     text,
  add column if not exists funil_venda         text,
  add column if not exists ofertas_adicionais  text,
  add column if not exists garantia            text,
  add column if not exists afiliados           text,
  -- Venda de alto valor e B2B
  add column if not exists tipo_produto        text,
  add column if not exists faixa_preco         text,
  add column if not exists ciclo_venda         text,
  add column if not exists equipe_vendas       text,
  add column if not exists decisor             text;

notify pgrst, 'reload schema';
