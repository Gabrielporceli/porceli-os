-- Adiciona a data real de pagamento aos lançamentos financeiros.
--
-- Até aqui, a única forma de saber "quando foi pago" era updated_at, que
-- reflete quando a automação de conciliação (asaas-payment-reconciliation)
-- RODOU e escreveu no banco — não quando o cliente de fato pagou. Como essa
-- automação roda uma vez por dia, dois pagamentos feitos pelo cliente no
-- mesmo dia podiam aparecer com "datas de pagamento" diferentes no sistema,
-- se um deles só ficou com status RECEIVED no Asaas depois do horário do
-- cron daquele dia (só sendo processado na rodada seguinte).
--
-- paid_date guarda a data real informada pelo Asaas (paymentDate/
-- confirmedDate) — ou a data em que a baixa manual foi feita pelo usuário,
-- quando não vier do Asaas.
ALTER TABLE public.financial_entries
  ADD COLUMN paid_date DATE;
