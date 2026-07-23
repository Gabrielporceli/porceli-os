-- ============================================================================
-- PAGAMENTO ÚNICO
-- Permite marcar um cliente/contrato para ser cobrado em uma única parcela
-- (valor total, uma data), em vez do parcelamento mensal automático.
-- ============================================================================

alter table public.clients
  add column if not exists single_payment boolean not null default false;

alter table public.contracts
  add column if not exists single_payment boolean not null default false;
