-- De onde veio o vínculo lançamento ↔ boleto do Asaas, e o código gravado no
-- próprio boleto (externalReference) quando foi o sistema que o criou.
--   criacao     → o sistema criou a cobrança e guardou o id que o Asaas devolveu
--   conciliacao → a conciliação ligou por aproximação (cliente + data + valor)
--   NULL        → vínculo anterior a este controle (origem desconhecida)
-- Na remoção (renegociação), se o lançamento tem código, o boleto precisa ter
-- o MESMO código — 5ª checagem, além de cliente, valor, vencimento e situação.
ALTER TABLE public.financial_entries
  ADD COLUMN IF NOT EXISTS asaas_link_origin text
    CHECK (asaas_link_origin IN ('criacao', 'conciliacao')),
  ADD COLUMN IF NOT EXISTS asaas_external_ref text;
