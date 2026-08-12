-- Cada financial_entries pode ficar associada ao pagamento real do Asaas que
-- a quitou/gerou. Sem essa coluna, a conciliação diária não tinha como saber
-- "esse pagamento do Asaas já foi usado pra dar baixa em outra entrada" —
-- só evitava reuso DENTRO da mesma execução (via splice no array em memória),
-- não entre execuções em dias diferentes. Isso causou um caso real: duas
-- entradas de R$800 da CP Cann com o mesmo due_date (13/08) e o MESMO
-- pagamento do Asaas (Parcela 6/6, vencimento real 13/08) foi usado pra dar
-- baixa nas duas em dias distintos, enquanto o pagamento real da Parcela 3/6
-- (vencimento real 12/08) nunca foi de fato conciliado com nada.
alter table public.financial_entries
  add column asaas_payment_id text;

-- Índice único parcial (ignora NULL): garante em nível de banco que um mesmo
-- pagamento do Asaas nunca fique associado a duas financial_entries.
create unique index financial_entries_asaas_payment_id_key
  on public.financial_entries (asaas_payment_id)
  where asaas_payment_id is not null;
